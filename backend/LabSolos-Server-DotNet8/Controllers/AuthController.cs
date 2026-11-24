using System.Data.Common;
using System.Diagnostics;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using LabSolos_Server_DotNet8.DTOs.Auth;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace LabSolos_Server_DotNet8.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly JwtService _jwtService;
        private readonly IUnitOfWork _uow;
        private readonly IPasswordChangeRateLimitService _passwordChangeRateLimitService;
        private readonly IPasswordHasher<Usuario> _passwordHasher;
        private readonly IOptions<AuthenticationProtectionOptions> _protectionOptions;
        private readonly ISecretFileReader _secretFileReader;
        private readonly IHostEnvironment _hostEnvironment;
        private readonly AuthenticationProtectionTelemetry _telemetry;
        private readonly ISessaoService? _sessaoService;

        public AuthController(
            JwtService jwtService,
            IUnitOfWork uow,
            IPasswordChangeRateLimitService passwordChangeRateLimitService,
            IPasswordHasher<Usuario> passwordHasher,
            IOptions<AuthenticationProtectionOptions> protectionOptions,
            ISecretFileReader secretFileReader,
            IHostEnvironment hostEnvironment,
            AuthenticationProtectionTelemetry telemetry,
            ISessaoService? sessaoService = null)
        {
            _jwtService = jwtService ?? throw new ArgumentNullException(nameof(jwtService));
            _uow = uow ?? throw new ArgumentNullException(nameof(uow));
            _passwordChangeRateLimitService = passwordChangeRateLimitService ??
                throw new ArgumentNullException(nameof(passwordChangeRateLimitService));
            _passwordHasher = passwordHasher ?? throw new ArgumentNullException(nameof(passwordHasher));
            _protectionOptions = protectionOptions ?? throw new ArgumentNullException(nameof(protectionOptions));
            _secretFileReader = secretFileReader ?? throw new ArgumentNullException(nameof(secretFileReader));
            _hostEnvironment = hostEnvironment ?? throw new ArgumentNullException(nameof(hostEnvironment));
            _telemetry = telemetry ?? throw new ArgumentNullException(nameof(telemetry));
            _sessaoService = sessaoService;
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login(
            [FromBody] LoginDTO? requestDto,
            CancellationToken cancellationToken)
        {
            AuthenticationProtectionResponses.ApplyNoStore(Response);
            if (requestDto is null)
            {
                return BadRequest("Requisição inválida.");
            }

            AuthenticationThrottleAttempt? attempt = null;
            var attemptCompleted = false;
            try
            {
                var options = _protectionOptions.Value;
                var secret = ReadThrottleSecret(options.KeyHashSecretFile);
                try
                {
                    using var keyFactory = new ThrottleKeyFactory(secret, _hostEnvironment.EnvironmentName);
                    var rules = CreateLoginRules(requestDto.Email, options.Login, keyFactory);
                    var throttle = HttpContext.RequestServices.GetRequiredService<PostgresAuthenticationThrottle>();
                    var admissionStarted = Stopwatch.GetTimestamp();
                    var admission = await throttle.TryBeginAsync(rules, cancellationToken);
                    var admissionDuration = Stopwatch.GetElapsedTime(admissionStarted);

                    switch (admission.State)
                    {
                        case AuthenticationThrottleState.RateLimited:
                            _telemetry.RecordAuthenticationAdmission(
                                admissionDuration,
                                AuthenticationProtectionOperation.Login,
                                AuthenticationProtectionResult.Throttled);
                            _telemetry.RecordAuthenticationThrottled(
                                AuthenticationProtectionOperation.Login,
                                AuthenticationProtectionReason.RateLimited);
                            return AuthenticationProtectionResponses.RateLimited(Response, admission.RetryAfterSeconds);

                        case AuthenticationThrottleState.CapacityExceeded:
                            _telemetry.RecordAuthenticationAdmission(
                                admissionDuration,
                                AuthenticationProtectionOperation.Login,
                                AuthenticationProtectionResult.Throttled);
                            _telemetry.RecordAuthenticationThrottled(
                                AuthenticationProtectionOperation.Login,
                                AuthenticationProtectionReason.CapacityExhausted);
                            return AuthenticationProtectionResponses.RateLimited(Response, admission.RetryAfterSeconds);

                        case AuthenticationThrottleState.Unavailable:
                            _telemetry.RecordAuthenticationAdmission(
                                admissionDuration,
                                AuthenticationProtectionOperation.Login,
                                AuthenticationProtectionResult.Failure);
                            _telemetry.RecordFailure(
                                AuthenticationProtectionOperation.Login,
                                AuthenticationProtectionReason.DependencyUnavailable);
                            return AuthenticationProtectionResponses.Unavailable(Response);

                        case AuthenticationThrottleState.Allowed when admission.Attempt is not null:
                            attempt = admission.Attempt;
                            break;

                        default:
                            _telemetry.RecordFailure(
                                AuthenticationProtectionOperation.Login,
                                AuthenticationProtectionReason.Unexpected);
                            return AuthenticationProtectionResponses.Unavailable(Response);
                    }

                    var user = CanUseAccountIdentifier(requestDto.Email)
                        ? await _uow.UsuarioRepository.ObterAsync(candidate => candidate.Email == requestDto.Email)
                        : null;
                    var passwordValid = user is not null
                        && !string.IsNullOrEmpty(requestDto.Password)
                        && _passwordHasher.VerifyHashedPassword(
                            user,
                            user.SenhaHash,
                            requestDto.Password) == PasswordVerificationResult.Success;
                    var authenticationSucceeded = !cancellationToken.IsCancellationRequested
                        && user is not null
                        && passwordValid
                        && user.Status == StatusUsuario.Habilitado;

                    await attempt.CompleteAsync(
                        authenticationSucceeded
                            ? AuthenticationThrottleOutcome.Accepted
                            : AuthenticationThrottleOutcome.Failure,
                        CancellationToken.None);
                    attemptCompleted = true;

                    cancellationToken.ThrowIfCancellationRequested();

                    if (user is null || !authenticationSucceeded)
                    {
                        _telemetry.RecordAuthenticationAdmission(
                            admissionDuration,
                            AuthenticationProtectionOperation.Login,
                            AuthenticationProtectionResult.Denied);
                        return Unauthorized("Credenciais inválidas.");
                    }

                    _telemetry.RecordAuthenticationAdmission(
                        admissionDuration,
                        AuthenticationProtectionOperation.Login,
                        AuthenticationProtectionResult.Success);
                    var token = _jwtService.GenerateToken(user);
                    var jwtId = new JwtSecurityTokenHandler().ReadJwtToken(token).Id;
                    var session = await RequiredSessionService().CriarAsync(
                        user.Id,
                        user.VersaoSessao,
                        jwtId,
                        cancellationToken);
                    SessaoCookie.Gravar(
                        Response,
                        Request,
                        _hostEnvironment,
                        session.Identificador,
                        SessaoCookie.LimiteCookie(session));
                    return Request.Headers.ContainsKey("Origin")
                        ? Ok(new { requiresPasswordChange = user.ExigeTrocaSenha })
                        : Ok(new { token, requiresPasswordChange = user.ExigeTrocaSenha });
                }
                finally
                {
                    CryptographicOperations.ZeroMemory(secret);
                }
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                if (attempt is not null && !attemptCompleted)
                {
                    await attempt.CompleteAsync(AuthenticationThrottleOutcome.Failure, CancellationToken.None);
                    attemptCompleted = true;
                }

                throw;
            }
            catch (Exception exception) when (IsProtectionFailure(exception))
            {
                _telemetry.RecordFailure(
                    AuthenticationProtectionOperation.Login,
                    IsConfigurationFailure(exception)
                        ? AuthenticationProtectionReason.InvalidConfiguration
                        : AuthenticationProtectionReason.DependencyUnavailable);
                return AuthenticationProtectionResponses.Unavailable(Response);
            }
            finally
            {
                if (attempt is not null && !attemptCompleted)
                {
                    await attempt.DisposeAsync();
                }
            }
        }

        [HttpGet("session")]
        [Authorize]
        public IActionResult Session(CancellationToken cancellationToken)
        {
            _ = cancellationToken;
            AuthenticationProtectionResponses.ApplyNoStore(Response);
            var subject = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ??
                User.FindFirstValue(ClaimTypes.NameIdentifier);
            var sessionCookie = Request.Cookies.TryGetValue(
                SessaoAutenticacaoDefaults.CookieName,
                out var cookieValue)
                ? cookieValue
                : null;
            if (!int.TryParse(subject, out var userId) || string.IsNullOrWhiteSpace(sessionCookie))
            {
                return Unauthorized();
            }

            return Ok(new
            {
                userId,
                role = User.FindFirstValue(ClaimTypes.Role),
                requiresPasswordChange = User.FindFirstValue(JwtClaimNames.PasswordChangeRequired) == "true",
                csrfToken = SessaoCsrfProof.Create(sessionCookie)
            });
        }

        [HttpPost("logout")]
        [AllowAnonymous]
        public async Task<IActionResult> Logout(CancellationToken cancellationToken)
        {
            AuthenticationProtectionResponses.ApplyNoStore(Response);
            var rawCookie = Request.Cookies.TryGetValue(SessaoAutenticacaoDefaults.CookieName, out var value)
                ? value
                : null;
            var sessionId = User.FindFirstValue(SessaoAutenticacaoDefaults.SessionIdClaim);
            var jwtId = User.FindFirstValue(JwtRegisteredClaimNames.Jti);
            try
            {
                await RequiredSessionService().RevogarAsync(
                    Guid.TryParseExact(sessionId, "N", out var parsedSessionId) ? parsedSessionId : null,
                    rawCookie,
                    jwtId,
                    cancellationToken);
                SessaoCookie.Remover(Response, Request, _hostEnvironment);
                return NoContent();
            }
            catch (Exception exception) when (IsProtectionFailure(exception))
            {
                return AuthenticationProtectionResponses.Unavailable(Response);
            }
        }

        [HttpPost("renew")]
        [Authorize]
        public async Task<IActionResult> Renew(CancellationToken cancellationToken)
        {
            AuthenticationProtectionResponses.ApplyNoStore(Response);
            if (!Guid.TryParseExact(User.FindFirstValue(SessaoAutenticacaoDefaults.SessionIdClaim), "N", out var sessionId))
            {
                return Unauthorized();
            }

            var subject = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ??
                User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(subject, out var userId))
            {
                return Unauthorized();
            }

            try
            {
                var user = await _uow.UsuarioRepository.ObterAsync(candidate => candidate.Id == userId);
                if (user is null)
                {
                    return Unauthorized();
                }

                var token = _jwtService.GenerateToken(user);
                var jwtId = new JwtSecurityTokenHandler().ReadJwtToken(token).Id;
                var renewed = await RequiredSessionService().RenovarAsync(sessionId, jwtId, cancellationToken);
                if (renewed is null)
                {
                    return Unauthorized();
                }

                SessaoCookie.Gravar(
                    Response,
                    Request,
                    _hostEnvironment,
                    renewed.Identificador,
                    SessaoCookie.LimiteCookie(renewed));
                return NoContent();
            }
            catch (Exception exception) when (IsProtectionFailure(exception))
            {
                return AuthenticationProtectionResponses.Unavailable(Response);
            }
        }

        [HttpPost("change-password")]
        [Authorize(Policy = CredentialAuthorizationPolicies.ChangeOwnPassword)]
        public async Task<IActionResult> ChangePassword(
            [FromBody] ChangePasswordDTO? requestDto,
            CancellationToken cancellationToken)
        {
            AuthenticationProtectionResponses.ApplyNoStore(Response);
            var subject = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ??
                User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(subject, out var userId))
            {
                return Unauthorized();
            }

            requestDto ??= new ChangePasswordDTO();
            var result = await _passwordChangeRateLimitService.ChangePasswordAsync(
                userId,
                requestDto,
                cancellationToken);

            return result.Status switch
            {
                CredentialChangeStatus.Success => NoContent(),
                CredentialChangeStatus.Conflict => ConflictProblem(),
                CredentialChangeStatus.RateLimited => AuthenticationProtectionResponses.RateLimited(
                    Response,
                    result.RetryAfterSeconds),
                CredentialChangeStatus.Unavailable => AuthenticationProtectionResponses.Unavailable(Response),
                _ => ValidationProblem(result.Code ?? "password_invalid")
            };
        }

        private List<AuthenticationThrottleRule> CreateLoginRules(
            string? email,
            LoginThrottleOptions options,
            ThrottleKeyFactory keyFactory)
        {
            var window = TimeSpan.FromSeconds(options.WindowSeconds);
            var rules = new List<AuthenticationThrottleRule>(capacity: 2)
            {
                new(
                    AuthenticationProtectionCapacity.LoginIp,
                    keyFactory.CreateIpQuotaKey(ThrottlePurpose.Login, HttpContext.Connection.RemoteIpAddress),
                    options.IpFailures,
                    window)
            };

            if (CanUseAccountIdentifier(email))
            {
                rules.Add(new AuthenticationThrottleRule(
                    AuthenticationProtectionCapacity.LoginAccount,
                    keyFactory.CreateRecipientQuotaKey(ThrottlePurpose.Login, email!),
                    options.AccountFailures,
                    window));
            }

            return rules;
        }

        private byte[] ReadThrottleSecret(string? secretPath)
        {
            if (!string.IsNullOrWhiteSpace(secretPath))
            {
                return _secretFileReader.ReadAllBytes(secretPath);
            }

            if (!string.Equals(
                    _hostEnvironment.EnvironmentName,
                    "IntegrationTesting",
                    StringComparison.Ordinal))
            {
                throw new ArgumentException("Authentication protection secret is not configured.");
            }

            return SHA256.HashData(Encoding.UTF8.GetBytes(
                "LabSolos IntegrationTesting only synthetic throttle key; never deploy"));
        }

        private static bool CanUseAccountIdentifier(string? email) =>
            !string.IsNullOrWhiteSpace(email)
            && email.Length <= 254
            && email.Trim().Length > 0
            && !email.Any(char.IsControl);

        private ISessaoService RequiredSessionService() =>
            _sessaoService ?? throw new InvalidOperationException("Session service is not configured.");

        private static bool IsProtectionFailure(Exception exception)
        {
            for (Exception? current = exception; current is not null; current = current.InnerException)
            {
                if (current is OptionsValidationException
                    or DbException
                    or IOException
                    or UnauthorizedAccessException
                    or ArgumentException
                    or CryptographicException
                    or InvalidOperationException
                    or TimeoutException)
                {
                    return true;
                }
            }

            return false;
        }

        private static bool IsConfigurationFailure(Exception exception)
        {
            for (Exception? current = exception; current is not null; current = current.InnerException)
            {
                if (current is OptionsValidationException
                    or IOException
                    or UnauthorizedAccessException
                    or ArgumentException)
                {
                    return true;
                }
            }

            return false;
        }

        private static ObjectResult ValidationProblem(string code)
        {
            var field = code switch
            {
                CredentialErrorCodes.CurrentPasswordInvalid => "currentPassword",
                CredentialErrorCodes.ConfirmationMismatch => "confirmation",
                _ => "newPassword"
            };
            var message = code switch
            {
                CredentialErrorCodes.CurrentPasswordInvalid => "A senha atual informada é inválida.",
                CredentialErrorCodes.ConfirmationMismatch => "A confirmação da nova senha não confere.",
                "password_required" => "A nova senha é obrigatória.",
                "password_too_short" => "A nova senha deve ter pelo menos 15 caracteres.",
                "password_too_long" => "A nova senha deve ter no máximo 128 caracteres.",
                "password_common" => "A nova senha é muito comum.",
                _ => "A nova senha é inválida."
            };
            var details = new ValidationProblemDetails(new Dictionary<string, string[]>
            {
                [field] = [code, message]
            })
            {
                Type = "https://httpstatuses.com/400",
                Title = "Não foi possível alterar a senha.",
                Status = StatusCodes.Status400BadRequest
            };

            return new ObjectResult(details)
            {
                StatusCode = StatusCodes.Status400BadRequest,
                ContentTypes = { "application/problem+json" }
            };
        }

        private static ObjectResult ConflictProblem()
        {
            var details = new ProblemDetails
            {
                Type = "https://httpstatuses.com/409",
                Title = "A credencial foi alterada por outra solicitação.",
                Status = StatusCodes.Status409Conflict
            };
            details.Extensions["code"] = CredentialErrorCodes.ConcurrencyConflict;

            return new ObjectResult(details)
            {
                StatusCode = StatusCodes.Status409Conflict,
                ContentTypes = { "application/problem+json" }
            };
        }
    }
}

public static class SessaoCsrfProof
{
    private static readonly byte[] Context = Encoding.UTF8.GetBytes("lab-solos-browser-csrf-v1");

    public static string Create(string opaqueSessionId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(opaqueSessionId);

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(opaqueSessionId));
        var digest = hmac.ComputeHash(Context);
        return Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlEncode(digest);
    }

    public static bool Matches(string opaqueSessionId, string? submittedProof)
    {
        if (string.IsNullOrWhiteSpace(opaqueSessionId) || string.IsNullOrWhiteSpace(submittedProof))
            return false;

        var expected = Encoding.UTF8.GetBytes(Create(opaqueSessionId));
        var submitted = Encoding.UTF8.GetBytes(submittedProof);
        return expected.Length == submitted.Length &&
            CryptographicOperations.FixedTimeEquals(expected, submitted);
    }
}
