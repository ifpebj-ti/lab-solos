using System.Net.Mail;
using System.Reflection;
using System.Text.Json;
using LabSolos_Server_DotNet8.Controllers;
using LabSolos_Server_DotNet8.DTOs.Email;
using LabSolos_Server_DotNet8.Services;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Tests.Controllers;

public sealed class EmailControllerTests
{
    [Fact]
    public void GenericSendingIsAdministrativeWhileRecoveryAliasesAreExplicitlyPublic()
    {
        var sendPolicy = typeof(EmailController)
            .GetMethod(nameof(EmailController.EnviarEmail))!
            .GetCustomAttribute<AuthorizeAttribute>();

        Assert.Equal("ApenasAdministradores", sendPolicy?.Policy);

        var publicRecoveryActions = new[]
        {
            nameof(EmailController.RequestPasswordReset),
            nameof(EmailController.SolicitarRedefinicao),
            nameof(EmailController.ResetPassword),
            nameof(EmailController.RedefinirSenha)
        };

        var recoveryMethods = publicRecoveryActions
            .Select(action => typeof(EmailController).GetMethod(action))
            .ToArray();
        Assert.All(recoveryMethods, method =>
        {
            Assert.NotNull(method);
            Assert.NotNull(method!.GetCustomAttribute<AllowAnonymousAttribute>());
        });
    }

    [Fact]
    public void EnviarEmailSuccessReturnsOk()
    {
        var email = new Mock<IEmailService>();
        var controller = CreateController(email.Object);

        var result = controller.EnviarEmail("destino@example.org");

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal("E-mail enviado com sucesso!", ok.Value);
        email.Verify(service => service.EnviarEmail(
            "destino@example.org",
            It.IsAny<string>(),
            It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public void EnviarEmailSmtpFailureReturnsInternalServerError()
    {
        var email = CreateEmailServiceFailure<SmtpException>();
        var controller = CreateController(email.Object);

        var result = controller.EnviarEmail("destino@example.org");

        var status = Assert.IsType<StatusCodeResult>(result);
        Assert.Equal(StatusCodes.Status500InternalServerError, status.StatusCode);
    }

    [Fact]
    public void EnviarEmailInvalidOperationFailureReturnsInternalServerError()
    {
        var email = CreateEmailServiceFailure<InvalidOperationException>();
        var controller = CreateController(email.Object);

        var result = controller.EnviarEmail("destino@example.org");

        var status = Assert.IsType<StatusCodeResult>(result);
        Assert.Equal(StatusCodes.Status500InternalServerError, status.StatusCode);
    }

    [Fact]
    public void EnviarEmailFormatFailureReturnsInternalServerError()
    {
        var email = CreateEmailServiceFailure<FormatException>();
        var controller = CreateController(email.Object);

        var result = controller.EnviarEmail("destino@example.org");

        var status = Assert.IsType<StatusCodeResult>(result);
        Assert.Equal(StatusCodes.Status500InternalServerError, status.StatusCode);
    }

    [Fact]
    public void EnviarEmailUnexpectedFailureIsNotMasked()
    {
        var expected = new ArgumentException("Falha inesperada");
        var email = CreateEmailServiceFailure(expected);
        var controller = CreateController(email.Object);

        var actual = Assert.Throws<ArgumentException>(
            () => controller.EnviarEmail("destino@example.org"));

        Assert.Same(expected, actual);
    }

    [Fact]
    public async Task RequestPasswordResetDoesNotSendSmtpInTheHttpRequest()
    {
        var email = CreateEmailServiceFailure<SmtpException>();
        var reset = new Mock<IPasswordResetService>();
        var admissions = new Mock<IPasswordRecoveryRequestService>();
        var controller = CreateController(email.Object, reset.Object, admissions.Object);

        var result = await controller.RequestPasswordReset(
            new PasswordResetRequestDTO { Email = "eligible@example.org" },
            CancellationToken.None);

        Assert.IsType<AcceptedResult>(result);
        email.VerifyNoOtherCalls();
        reset.VerifyNoOtherCalls();
        admissions.Verify(service => service.AdmitAsync(
            "eligible@example.org",
            It.IsAny<System.Net.IPAddress?>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RequestPasswordResetUnexpectedFailureIsNotMasked()
    {
        var expected = new ArgumentException("Falha inesperada");
        var email = CreateEmailServiceFailure(expected);
        var reset = new Mock<IPasswordResetService>();
        var admissions = new Mock<IPasswordRecoveryRequestService>();
        admissions.Setup(service => service.AdmitAsync(
                It.IsAny<string?>(),
                It.IsAny<System.Net.IPAddress?>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(expected);
        var controller = CreateController(email.Object, reset.Object, admissions.Object);

        var actual = await Assert.ThrowsAsync<ArgumentException>(() =>
            controller.RequestPasswordReset(
                new PasswordResetRequestDTO { Email = "eligible@example.org" },
                CancellationToken.None));

        Assert.Same(expected, actual);
        reset.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task RequestPasswordResetAliasesAcceptNullBodiesAndReturnNeutralNoStoreResponses()
    {
        var admissions = new Mock<IPasswordRecoveryRequestService>(MockBehavior.Strict);
        admissions.Setup(service => service.AdmitAsync(null, null, CancellationToken.None))
            .Returns(Task.CompletedTask);
        var controller = CreateController(Mock.Of<IEmailService>(), admissions: admissions.Object);

        var currentRoute = Assert.IsType<AcceptedResult>(
            await controller.RequestPasswordReset(null, CancellationToken.None));
        Assert.Equal(StatusCodes.Status202Accepted, currentRoute.StatusCode);
        var currentMessage = JsonDocument.Parse(JsonSerializer.Serialize(currentRoute.Value))
            .RootElement.GetProperty("message").GetString();
        Assert.False(string.IsNullOrWhiteSpace(currentMessage));
        AssertNoStore(controller.Response);

        var legacyRoute = Assert.IsType<AcceptedResult>(
            await controller.SolicitarRedefinicao(null, CancellationToken.None));
        Assert.Equal(StatusCodes.Status202Accepted, legacyRoute.StatusCode);
        var legacyMessage = JsonDocument.Parse(JsonSerializer.Serialize(legacyRoute.Value))
            .RootElement.GetProperty("message").GetString();
        Assert.Equal(currentMessage, legacyMessage);
        AssertNoStore(controller.Response);
        admissions.Verify(service => service.AdmitAsync(null, null, CancellationToken.None), Times.Exactly(2));
    }

    [Fact]
    public async Task ResetPasswordSuccessReturnsNoContentAndDisablesCaching()
    {
        var reset = CreatePasswordResetService(CredentialChangeResult.Success());
        var controller = CreateController(Mock.Of<IEmailService>(), reset.Object);

        var result = await controller.ResetPassword(new PasswordResetDTO
        {
            Email = "conta@example.org",
            Code = "reset-token",
            NewPassword = "new-password",
            Confirmation = "new-password"
        }, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        AssertNoStore(controller.Response);
        reset.Verify(service => service.ResetPasswordAsync(
            "conta@example.org",
            "reset-token",
            "new-password",
            "new-password",
            false,
            It.IsAny<System.Net.IPAddress?>(),
            CancellationToken.None), Times.Once);
    }

    [Fact]
    public async Task ResetPasswordConflictReturnsProblemDetailsAndDisablesCaching()
    {
        var reset = CreatePasswordResetService(CredentialChangeResult.Conflict());
        var controller = CreateController(Mock.Of<IEmailService>(), reset.Object);

        var result = await controller.ResetPassword(new PasswordResetDTO(), CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status409Conflict, objectResult.StatusCode);
        Assert.Contains("application/problem+json", objectResult.ContentTypes);
        var details = Assert.IsType<ProblemDetails>(objectResult.Value);
        Assert.Equal("https://httpstatuses.com/409", details.Type);
        Assert.Equal(StatusCodes.Status409Conflict, details.Status);
        Assert.False(string.IsNullOrWhiteSpace(details.Title));
        Assert.Equal(CredentialErrorCodes.ConcurrencyConflict, details.Extensions["code"]);
        AssertNoStore(controller.Response);
    }

    [Fact]
    public async Task ResetPasswordRateLimitedReturnsRetryAfterAndDisablesCaching()
    {
        var reset = CreatePasswordResetService(CredentialChangeResult.RateLimited(17));
        var controller = CreateController(Mock.Of<IEmailService>(), reset.Object);

        var result = await controller.ResetPassword(new PasswordResetDTO(), CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status429TooManyRequests, objectResult.StatusCode);
        Assert.Contains("application/problem+json", objectResult.ContentTypes);
        var details = Assert.IsType<ProblemDetails>(objectResult.Value);
        Assert.Equal("https://httpstatuses.com/429", details.Type);
        Assert.Equal("authentication_rate_limited", details.Extensions["code"]);
        Assert.Equal(17, details.Extensions["retryAfterSeconds"]);
        Assert.Equal("17", controller.Response.Headers.RetryAfter);
        AssertNoStore(controller.Response);
    }

    [Fact]
    public async Task ResetPasswordUnavailableReturnsTransientServiceUnavailable()
    {
        var reset = CreatePasswordResetService(CredentialChangeResult.Unavailable());
        var controller = CreateController(Mock.Of<IEmailService>(), reset.Object);

        var result = await controller.ResetPassword(new PasswordResetDTO(), CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, objectResult.StatusCode);
        Assert.Contains("application/problem+json", objectResult.ContentTypes);
        var details = Assert.IsType<ProblemDetails>(objectResult.Value);
        Assert.Equal("https://httpstatuses.com/503", details.Type);
        Assert.Equal("authentication_protection_unavailable", details.Extensions["code"]);
        AssertNoStore(controller.Response);
    }

    [Theory]
    [InlineData(CredentialErrorCodes.ConfirmationMismatch, "confirmation")]
    [InlineData(CredentialErrorCodes.PasswordResetInvalid, "code")]
    [InlineData("password_required", "newPassword")]
    [InlineData("password_too_short", "newPassword")]
    [InlineData("password_too_long", "newPassword")]
    [InlineData("password_common", "newPassword")]
    public async Task ResetPasswordValidationFailureReturnsFieldSpecificProblemDetails(
        string code,
        string expectedField)
    {
        var reset = CreatePasswordResetService(CredentialChangeResult.ValidationFailed(code));
        var controller = CreateController(Mock.Of<IEmailService>(), reset.Object);

        var result = await controller.ResetPassword(new PasswordResetDTO(), CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, objectResult.StatusCode);
        Assert.Contains("application/problem+json", objectResult.ContentTypes);
        var details = Assert.IsType<ValidationProblemDetails>(objectResult.Value);
        Assert.Equal("https://httpstatuses.com/400", details.Type);
        Assert.Equal(StatusCodes.Status400BadRequest, details.Status);
        Assert.Equal(2, details.Errors[expectedField].Length);
        Assert.Equal(code, details.Errors[expectedField][0]);
        Assert.False(string.IsNullOrWhiteSpace(details.Errors[expectedField][1]));
        AssertNoStore(controller.Response);
    }

    [Fact]
    public async Task ResetPasswordValidationFailureWithoutCodeUsesGenericInvalidCodeResponse()
    {
        var reset = CreatePasswordResetService(
            new CredentialChangeResult(CredentialChangeStatus.ValidationFailed, null));
        var controller = CreateController(Mock.Of<IEmailService>(), reset.Object);

        var result = await controller.ResetPassword(null, CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(result);
        var details = Assert.IsType<ValidationProblemDetails>(objectResult.Value);
        Assert.Contains(CredentialErrorCodes.PasswordResetInvalid, details.Errors["code"]);
        AssertNoStore(controller.Response);
        reset.Verify(service => service.ResetPasswordAsync(
            null,
            null,
            null,
            null,
            false,
            It.IsAny<System.Net.IPAddress?>(),
            CancellationToken.None), Times.Once);
    }

    [Fact]
    public async Task RedefinirSenhaDefaultsConfirmationToNewPasswordAndAllowsLegacyToken()
    {
        var reset = CreatePasswordResetService(
            CredentialChangeResult.ValidationFailed(CredentialErrorCodes.PasswordResetInvalid));
        var controller = CreateController(Mock.Of<IEmailService>(), reset.Object);

        var result = await controller.RedefinirSenha(new RedefinirSenhaDTO
        {
            Email = "conta@example.org",
            Token = "legacy-token",
            NovaSenha = "new-password"
        }, CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, objectResult.StatusCode);
        var details = Assert.IsType<ValidationProblemDetails>(objectResult.Value);
        Assert.Contains(CredentialErrorCodes.PasswordResetInvalid, details.Errors["code"]);
        AssertNoStore(controller.Response);
        reset.Verify(service => service.ResetPasswordAsync(
            "conta@example.org",
            "legacy-token",
            "new-password",
            "new-password",
            true,
            It.IsAny<System.Net.IPAddress?>(),
            CancellationToken.None), Times.Once);
    }

    private static Mock<IEmailService> CreateEmailServiceFailure<TException>()
        where TException : Exception, new() =>
        CreateEmailServiceFailure(new TException());

    private static Mock<IEmailService> CreateEmailServiceFailure(Exception exception)
    {
        var email = new Mock<IEmailService>();
        email.Setup(service => service.EnviarEmail(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>()))
            .Throws(exception);
        return email;
    }

    private static Mock<IPasswordResetService> CreatePasswordResetService(CredentialChangeResult result)
    {
        var reset = new Mock<IPasswordResetService>(MockBehavior.Strict);
        reset.Setup(service => service.ResetPasswordAsync(
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<bool>(),
                It.IsAny<System.Net.IPAddress?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(result);
        return reset;
    }

    private static void AssertNoStore(HttpResponse response)
    {
        Assert.Equal("no-store", response.Headers.CacheControl);
        Assert.Equal("no-cache", response.Headers.Pragma);
    }

    private static EmailController CreateController(
        IEmailService emailService,
        IPasswordResetService? passwordResetService = null,
        IPasswordRecoveryRequestService? admissions = null)
    {
        var controller = new EmailController(
            emailService,
            passwordResetService ?? Mock.Of<IPasswordResetService>(),
            admissions ?? Mock.Of<IPasswordRecoveryRequestService>(),
            NullLogger<EmailController>.Instance);
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
        return controller;
    }
}
