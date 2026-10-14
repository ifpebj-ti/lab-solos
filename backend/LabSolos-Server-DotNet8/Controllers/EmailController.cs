using System.Net.Mail;
using LabSolos_Server_DotNet8.DTOs.Email;
using LabSolos_Server_DotNet8.Services;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.AspNetCore.Mvc;

namespace LabSolos_Server_DotNet8.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EmailController(
    IEmailService emailService,
    IPasswordResetService passwordResetService,
    IPasswordRecoveryRequestService passwordRecoveryRequestService,
    ILogger<EmailController> logger) : ControllerBase
{
    private const string NeutralRequestMessage =
        "Se a conta estiver apta, enviaremos as instruÃ§Ãµes.";

    private readonly IEmailService _emailService = emailService;
    private readonly IPasswordResetService _passwordResetService = passwordResetService;
    private readonly IPasswordRecoveryRequestService _passwordRecoveryRequestService = passwordRecoveryRequestService;
    private readonly ILogger<EmailController> _logger = logger;
    private static readonly Action<ILogger, Exception?> LogEmailDeliveryFailure =
        LoggerMessage.Define(
            LogLevel.Warning,
            new EventId(1001, nameof(LogEmailDeliveryFailure)),
            "Falha esperada na entrega de e-mail.");

    [HttpPost("enviar")]
    public IActionResult EnviarEmail([FromQuery] string para)
    {
        try
        {
            _emailService.EnviarEmail(
                para: para,
                assunto: "Teste de E-mail",
                corpo: "Este Ã© um e-mail de teste enviado pelo sistema.");

            return Ok("E-mail enviado com sucesso!");
        }
        catch (SmtpException ex)
        {
            return EmailDeliveryFailureResponse(ex);
        }
        catch (InvalidOperationException ex)
        {
            return EmailDeliveryFailureResponse(ex);
        }
        catch (FormatException ex)
        {
            return EmailDeliveryFailureResponse(ex);
        }
    }

    [HttpPost("request-password-reset")]
    public Task<IActionResult> RequestPasswordReset(
        [FromBody] PasswordResetRequestDTO? request,
        CancellationToken cancellationToken) =>
        RequestPasswordResetCore(request?.Email, cancellationToken);

    [HttpPost("solicitar-redefinicao")]
    public Task<IActionResult> SolicitarRedefinicao(
        [FromBody] EmailDTO? request,
        CancellationToken cancellationToken) =>
        RequestPasswordResetCore(request?.Email, cancellationToken);

    [HttpPost("reset-password")]
    public Task<IActionResult> ResetPassword(
        [FromBody] PasswordResetDTO? request,
        CancellationToken cancellationToken) =>
        ResetPasswordCore(
            request?.Email,
            request?.Code,
            request?.NewPassword,
            request?.Confirmation,
            false,
            cancellationToken);

    [HttpPost("redefinir-senha")]
    public Task<IActionResult> RedefinirSenha(
        [FromBody] RedefinirSenhaDTO? request,
        CancellationToken cancellationToken) =>
        ResetPasswordCore(
            request?.Email,
            request?.Token,
            request?.NovaSenha,
            request?.Confirmacao ?? request?.NovaSenha,
            true,
            cancellationToken);

    private async Task<IActionResult> RequestPasswordResetCore(
        string? email,
        CancellationToken cancellationToken)
    {
        AuthenticationProtectionResponses.ApplyNoStore(Response);
        await _passwordRecoveryRequestService.AdmitAsync(
            email,
            HttpContext.Connection.RemoteIpAddress,
            cancellationToken);

        return Accepted(new { message = NeutralRequestMessage });
    }

    private async Task<IActionResult> ResetPasswordCore(
        string? email,
        string? token,
        string? newPassword,
        string? confirmation,
        bool allowLegacyTokenOnly,
        CancellationToken cancellationToken)
    {
        AuthenticationProtectionResponses.ApplyNoStore(Response);
        var result = await _passwordResetService.ResetPasswordAsync(
            email,
            token,
            newPassword,
            confirmation,
            allowLegacyTokenOnly,
            HttpContext.Connection.RemoteIpAddress,
            cancellationToken);

        return result.Status switch
        {
            CredentialChangeStatus.Success => NoContent(),
            CredentialChangeStatus.Conflict => ConflictProblem(),
            CredentialChangeStatus.RateLimited => AuthenticationProtectionResponses.RateLimited(
                Response,
                result.RetryAfterSeconds),
            CredentialChangeStatus.Unavailable => AuthenticationProtectionResponses.Unavailable(Response),
            _ => ValidationProblem(result.Code ?? CredentialErrorCodes.PasswordResetInvalid)
        };
    }

    private static ObjectResult ValidationProblem(string code)
    {
        var field = code switch
        {
            CredentialErrorCodes.ConfirmationMismatch => "confirmation",
            CredentialErrorCodes.PasswordResetInvalid => "code",
            _ => "newPassword"
        };
        var message = code switch
        {
            CredentialErrorCodes.ConfirmationMismatch => "A confirmaÃ§Ã£o da nova senha nÃ£o confere.",
            CredentialErrorCodes.PasswordResetInvalid => "O cÃ³digo de redefiniÃ§Ã£o Ã© invÃ¡lido ou expirou.",
            "password_required" => "A nova senha Ã© obrigatÃ³ria.",
            "password_too_short" => "A nova senha deve ter pelo menos 15 caracteres.",
            "password_too_long" => "A nova senha deve ter no mÃ¡ximo 128 caracteres.",
            "password_common" => "A nova senha Ã© muito comum.",
            _ => "A nova senha Ã© invÃ¡lida."
        };
        var details = new ValidationProblemDetails(new Dictionary<string, string[]>
        {
            [field] = [code, message]
        })
        {
            Type = "https://httpstatuses.com/400",
            Title = "NÃ£o foi possÃ­vel redefinir a senha.",
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
            Title = "A credencial foi alterada por outra solicitaÃ§Ã£o.",
            Status = StatusCodes.Status409Conflict
        };
        details.Extensions["code"] = CredentialErrorCodes.ConcurrencyConflict;

        return new ObjectResult(details)
        {
            StatusCode = StatusCodes.Status409Conflict,
            ContentTypes = { "application/problem+json" }
        };
    }

    private StatusCodeResult EmailDeliveryFailureResponse(Exception exception)
    {
        LogEmailDeliveryFailure(_logger, exception);
        return StatusCode(StatusCodes.Status500InternalServerError);
    }
}
