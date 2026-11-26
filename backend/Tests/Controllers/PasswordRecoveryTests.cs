using System.Reflection;
using System.Text.Json;
using LabSolos_Server_DotNet8.Controllers;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.DTOs.Email;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;

namespace Tests.Controllers;

public class PasswordRecoveryTests
{
    [Fact]
    public void SecurePasswordRecovery_ExposesNewPublicEndpointsAndRemovesJwtPasswordHashing()
    {
        var request = typeof(EmailController).GetMethod(
            "RequestPasswordReset",
            BindingFlags.Public | BindingFlags.Instance);
        var reset = typeof(EmailController).GetMethod(
            "ResetPassword",
            BindingFlags.Public | BindingFlags.Instance);

        Assert.NotNull(request);
        Assert.NotNull(reset);
        Assert.Contains(
            request!.GetCustomAttributes().OfType<Microsoft.AspNetCore.Mvc.HttpPostAttribute>(),
            attribute => attribute.Template == "request-password-reset");
        Assert.Contains(
            reset!.GetCustomAttributes().OfType<Microsoft.AspNetCore.Mvc.HttpPostAttribute>(),
            attribute => attribute.Template == "reset-password");
        Assert.Null(typeof(JwtService).GetMethod(
            "HashPassword",
            BindingFlags.Public | BindingFlags.Static));
    }

    [Fact]
    public async Task RequestPasswordReset_AlwaysReturnsTheSameAcceptedResponseWithoutSecrets()
    {
        const string token = "sensitive-reset-token";
        var credentials = new Mock<IPasswordResetService>();
        var admissions = new Mock<IPasswordRecoveryRequestService>();
        var email = new Mock<IEmailService>();
        var controller = CreateController(email.Object, credentials.Object, admissions.Object);

        var eligible = await controller.RequestPasswordReset(
            new PasswordResetRequestDTO { Email = "eligible@example.org" },
            CancellationToken.None);
        var missing = await controller.RequestPasswordReset(
            new PasswordResetRequestDTO { Email = "missing@example.org" },
            CancellationToken.None);

        var eligibleResult = Assert.IsType<AcceptedResult>(eligible);
        var missingResult = Assert.IsType<AcceptedResult>(missing);
        var eligibleResponse = JsonSerializer.Serialize(eligibleResult.Value);
        var missingResponse = JsonSerializer.Serialize(missingResult.Value);
        Assert.Equal(missingResponse, eligibleResponse);
        Assert.DoesNotContain(token, eligibleResponse);
        Assert.DoesNotContain("eligible@example.org", eligibleResponse);
        admissions.Verify(service => service.AdmitAsync(
            "eligible@example.org",
            It.IsAny<System.Net.IPAddress?>(),
            It.IsAny<CancellationToken>()), Times.Once);
        admissions.Verify(service => service.AdmitAsync(
            "missing@example.org",
            It.IsAny<System.Net.IPAddress?>(),
            It.IsAny<CancellationToken>()), Times.Once);
        email.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task RequestPasswordReset_SmtpFailureRemainsExternallyNeutral()
    {
        var credentials = new Mock<IPasswordResetService>();
        var email = new Mock<IEmailService>();
        email.Setup(service => service.EnviarEmail(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>()))
            .Throws<InvalidOperationException>();
        var admissions = new Mock<IPasswordRecoveryRequestService>();
        var controller = CreateController(email.Object, credentials.Object, admissions.Object);

        var result = await controller.RequestPasswordReset(
            new PasswordResetRequestDTO { Email = "eligible@example.org" },
            CancellationToken.None);

        Assert.IsType<AcceptedResult>(result);
        email.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task ResetPassword_InvalidTokenReturnsGenericProblemWithoutEchoingCredentials()
    {
        const string token = "sensitive-reset-token";
        const string password = "sensitive-new-password";
        var credentials = new Mock<IPasswordResetService>();
        credentials.Setup(service => service.ResetPasswordAsync(
                "eligible@example.org",
                token,
                password,
                password,
                false,
                It.IsAny<System.Net.IPAddress?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(CredentialChangeResult.ValidationFailed(
                CredentialErrorCodes.PasswordResetInvalid));
        var controller = CreateController(Mock.Of<IEmailService>(), credentials.Object);

        var result = await controller.ResetPassword(
            new PasswordResetDTO
            {
                Email = "eligible@example.org",
                Code = token,
                NewPassword = password,
                Confirmation = password
            },
            CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, objectResult.StatusCode);
        var details = Assert.IsType<ValidationProblemDetails>(objectResult.Value);
        Assert.Contains(CredentialErrorCodes.PasswordResetInvalid, details.Errors["code"]);
        var response = JsonSerializer.Serialize(objectResult.Value);
        Assert.DoesNotContain(token, response);
        Assert.DoesNotContain(password, response);
    }

    [Fact]
    public async Task ResetPassword_BindsCodeInTheNewContractAndLegacyAliasDelegatesToTheSameService()
    {
        const string code = "reset-code";
        const string password = "valid-new-password";
        const string body = """
            {
              "email": "eligible@example.org",
              "code": "reset-code",
              "newPassword": "valid-new-password",
              "confirmation": "valid-new-password"
            }
            """;
        var request = JsonSerializer.Deserialize<PasswordResetDTO>(
            body,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        var codeProperty = typeof(PasswordResetDTO).GetProperty("Code");

        Assert.NotNull(request);
        Assert.NotNull(codeProperty);
        var boundCode = Assert.IsType<string>(codeProperty!.GetValue(request));
        Assert.Equal(code, boundCode);

        var credentials = new Mock<IPasswordResetService>();
        credentials.Setup(service => service.ResetPasswordAsync(
                "eligible@example.org",
                code,
                password,
                password,
                false,
                It.IsAny<System.Net.IPAddress?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(CredentialChangeResult.Success());
        credentials.Setup(service => service.ResetPasswordAsync(
                null,
                code,
                password,
                password,
                true,
                It.IsAny<System.Net.IPAddress?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(CredentialChangeResult.Success());
        var controller = CreateController(Mock.Of<IEmailService>(), credentials.Object);

        var reset = await controller.ResetPassword(request!, CancellationToken.None);
        var legacy = await controller.RedefinirSenha(
            new RedefinirSenhaDTO
            {
                Token = code,
                NovaSenha = password,
                Confirmacao = password
            },
            CancellationToken.None);

        Assert.IsType<NoContentResult>(reset);
        Assert.IsType<NoContentResult>(legacy);
        credentials.VerifyAll();
    }

    [Fact]
    public void PasswordResetDto_ContainsOnlyThePublicResetContract()
    {
        var properties = typeof(PasswordResetDTO).GetProperties()
            .Select(property => property.Name)
            .ToArray();

        Assert.Equal(
            ["Email", "Code", "NewPassword", "Confirmation"],
            properties);
    }

    [Fact]
    public async Task RejectsInvalidEmailVariantsBeforeThrottleAdmission()
    {
        await using var context = CreateInMemoryContext();
        var service = CreateRequestService(context);
        string?[] invalidEmails =
        [
            null,
            "",
            "not-an-email",
            new string('x', 255) + "@example.invalid",
            "control\0@example.invalid",
            "Recovery User <recovery@example.invalid>"
        ];

        foreach (var email in invalidEmails)
        {
            await service.AdmitAsync(email, null);
        }
    }

    [Fact]
    public async Task PropagatesCancellationBeforeAdmission()
    {
        await using var context = CreateInMemoryContext();
        var service = CreateRequestService(context);
        using var cancellation = new CancellationTokenSource();
        await cancellation.CancelAsync();

        var error = await Assert.ThrowsAnyAsync<OperationCanceledException>(
            () => service.AdmitAsync("eligible@example.invalid", null, cancellation.Token));

        Assert.Equal(cancellation.Token, error.CancellationToken);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(11)]
    public void RepositoryRejectsReservationBatchesOutsideTheSupportedRange(int batchSize)
    {
        using var context = CreateInMemoryContext();
        var repository = CreateRepository(context);

        Assert.Throws<ArgumentOutOfRangeException>(
            () => { _ = repository.ReserveBatchAsync(batchSize); });
    }

    [Fact]
    public void RepositoryRejectsLeaseDurationsOutsideTheSupportedRange()
    {
        using var context = CreateInMemoryContext();
        var repository = CreateRepository(context);

        Assert.Throws<ArgumentOutOfRangeException>(
            () => { _ = repository.ReserveBatchAsync(leaseDuration: TimeSpan.FromMilliseconds(999)); });
        Assert.Throws<ArgumentOutOfRangeException>(
            () => { _ = repository.ReserveBatchAsync(leaseDuration: TimeSpan.FromMinutes(10).Add(TimeSpan.FromTicks(1))); });
    }

    [Theory]
    [InlineData(0)]
    [InlineData(4)]
    public void RepositoryRejectsRetryAttemptsOutsideTheSupportedRange(int attempts)
    {
        using var context = CreateInMemoryContext();
        var repository = CreateRepository(context);

        Assert.Throws<ArgumentOutOfRangeException>(
            () => { _ = repository.TryScheduleRetryAsync(Guid.NewGuid(), Guid.NewGuid(), attempts, DateTimeOffset.UtcNow); });
    }

    [Fact]
    public void RepositoryRejectsInvalidCleanupBatchAndUserIdentifiers()
    {
        using var context = CreateInMemoryContext();
        var repository = CreateRepository(context);

        Assert.Throws<ArgumentOutOfRangeException>(() => { _ = repository.CleanupExpiredAsync(0); });
        Assert.Throws<ArgumentOutOfRangeException>(() => { _ = repository.CleanupExpiredAsync(501); });
        Assert.Throws<ArgumentOutOfRangeException>(() => { _ = repository.CancelForUserAsync(0); });
    }

    [Fact]
    public void RepositoryRejectsInvalidPayloadContextAndExpirationBeforePersistence()
    {
        using var context = CreateInMemoryContext();
        var repository = CreateRepository(context);
        var jobId = Guid.NewGuid();
        var leaseId = Guid.NewGuid();
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(5);

        Assert.Throws<ArgumentException>(() => { _ = repository.TryReplacePayloadAsync(
            Guid.Empty, leaseId, Array.Empty<byte>(), RecoveryPayloadPurpose.Request, null, null, expiresAt); });
        Assert.Throws<ArgumentException>(() => { _ = repository.TryReplacePayloadAsync(
            jobId, Guid.Empty, Array.Empty<byte>(), RecoveryPayloadPurpose.Request, null, null, expiresAt); });
        Assert.Throws<ArgumentException>(() => { _ = repository.TryReplacePayloadAsync(
            jobId, leaseId, Array.Empty<byte>(), RecoveryPayloadPurpose.Delivery, null, 0, expiresAt); });
        Assert.Throws<ArgumentException>(() => { _ = repository.TryReplacePayloadAsync(
            jobId, leaseId, Array.Empty<byte>(), (RecoveryPayloadPurpose)int.MaxValue, null, null, expiresAt); });
        Assert.Throws<ArgumentOutOfRangeException>(() => { _ = repository.TryReplacePayloadAsync(
            jobId, leaseId, Array.Empty<byte>(), RecoveryPayloadPurpose.Request, null, null, DateTimeOffset.MinValue); });
    }

    private static EmailController CreateController(
        IEmailService emailService,
        IPasswordResetService passwordResetService,
        IPasswordRecoveryRequestService? admissions = null)
    {
        var controller = new EmailController(
            emailService,
            passwordResetService,
            admissions ?? Mock.Of<IPasswordRecoveryRequestService>(),
            NullLogger<EmailController>.Instance);
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
        return controller;
    }

    private static AppDbContext CreateInMemoryContext() => new(
        new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static PasswordRecoveryRequestService CreateRequestService(AppDbContext context)
    {
        var options = Options.Create(new AuthenticationProtectionOptions());
        var telemetry = new AuthenticationProtectionTelemetry(
            NullLogger<AuthenticationProtectionTelemetry>.Instance);
        var keyFactory = new ThrottleKeyFactory(Enumerable.Range(1, 32).Select(value => (byte)value).ToArray(), "Tests");
        var protector = new RecoveryPayloadProtector(new TestPasswordRecoveryKeyProvider(
            Enumerable.Range(1, 32).Select(value => (byte)value).ToArray()));
        var throttle = new PostgresAuthenticationThrottle(
            context,
            options,
            new TimeProviderAuthenticationThrottleClock(TimeProvider.System));
        var repository = new PasswordRecoveryJobRepository(context, protector);

        return new PasswordRecoveryRequestService(
            throttle,
            repository,
            keyFactory,
            options,
            TimeProvider.System,
            telemetry);
    }

    private static PasswordRecoveryJobRepository CreateRepository(AppDbContext context) =>
        new(
            context,
            new RecoveryPayloadProtector(new TestPasswordRecoveryKeyProvider(
                Enumerable.Range(1, 32).Select(value => (byte)value).ToArray())));

    private sealed class TestPasswordRecoveryKeyProvider(byte[] key) : IRecoveryEncryptionKeyProvider
    {
        private readonly byte[] _key = key.ToArray();

        public string ActiveKeyId => "password-recovery-tests";

        public byte[] CopyKey(string keyId) => _key.ToArray();
    }
}
