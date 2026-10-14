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
        private readonly ICredentialService _credentialService;
        private readonly IPasswordHasher<Usuario> _passwordHasher;
        private readonly IOptions<AuthenticationProtectionOptions> _protectionOptions;
        private readonly ISecretFileReader _secretFileReader;
        private readonly IHostEnvironment _hostEnvironment;
        private readonly AuthenticationProtectionTelemetry _telemetry;

        public AuthController(
            JwtService jwtService,
            IUnitOfWork uow,
            ICredentialService credentialService,
            IPasswordHasher<Usuario> passwordHasher,
            IOptions<AuthenticationProtectionOptions> protectionOptions,
            ISecretFileReader secretFileReader,
            IHostEnvironment hostEnvironment,
            AuthenticationProtectionTelemetry telemetry)
        {
            _jwtService = jwtService ?? throw new ArgumentNullException(nameof(jwtService));
            _uow = uow ?? throw new ArgumentNullException(nameof(uow));
            _credentialService = credentialService ?? throw new ArgumentNullException(nameof(credentialService));
            _passwordHasher = passwordHasher ?? throw new ArgumentNullException(nameof(passwordHasher));
            _protectionOptions = protectionOptions ?? throw new ArgumentNullException(nameof(protectionOptions));
            _secretFileReader = secretFileReader ?? throw new ArgumentNullException(nameof(secretFileReader));
            _hostEnvironment = hostEnvironment ?? throw new ArgumentNullException(nameof(hostEnvironment));
            _telemetry = telemetry ?? throw new ArgumentNullException(nameof(telemetry));
        }

        [HttpPost("login")]
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
                    return Ok(new
                    {
                        token,
                        requiresPasswordChange = user.ExigeTrocaSenha
                    });
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
            var result = await _credentialService.ChangePasswordAsync(
                userId,
                requestDto.CurrentPassword,
                requestDto.NewPassword,
                requestDto.Confirmation,
                cancellationToken);

            return result.Status switch
            {
                CredentialChangeStatus.Success => NoContent(),
                CredentialChangeStatus.Conflict => ConflictProblem(),
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
