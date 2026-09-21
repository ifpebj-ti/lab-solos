using System.Net.Mail;
using LabSolos_Server_DotNet8.Controllers;
using LabSolos_Server_DotNet8.DTOs.Email;
using LabSolos_Server_DotNet8.Services;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Tests.Controllers;

public sealed class EmailControllerTests
{
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
    public async Task RequestPasswordResetSmtpFailureRemainsNeutral()
    {
        var email = CreateEmailServiceFailure<SmtpException>();
        var controller = CreateController(email.Object, CreateEligibleCredentials().Object);

        var result = await controller.RequestPasswordReset(
            new PasswordResetRequestDTO { Email = "eligible@example.org" },
            CancellationToken.None);

        Assert.IsType<AcceptedResult>(result);
    }

    [Fact]
    public async Task RequestPasswordResetUnexpectedFailureIsNotMasked()
    {
        var expected = new ArgumentException("Falha inesperada");
        var email = CreateEmailServiceFailure(expected);
        var controller = CreateController(email.Object, CreateEligibleCredentials().Object);

        var actual = await Assert.ThrowsAsync<ArgumentException>(() =>
            controller.RequestPasswordReset(
                new PasswordResetRequestDTO { Email = "eligible@example.org" },
                CancellationToken.None));

        Assert.Same(expected, actual);
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

    private static Mock<ICredentialService> CreateEligibleCredentials()
    {
        var credentials = new Mock<ICredentialService>();
        credentials.Setup(service => service.RequestPasswordResetAsync(
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(PasswordResetRequestResult.Eligible(
                "eligible@example.org",
                "Eligible",
                "synthetic-reset-token"));
        return credentials;
    }

    private static EmailController CreateController(
        IEmailService emailService,
        ICredentialService? credentialService = null) =>
        new(
            emailService,
            credentialService ?? Mock.Of<ICredentialService>(),
            NullLogger<EmailController>.Instance);
}
