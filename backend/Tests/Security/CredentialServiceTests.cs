using System.Security.Cryptography;
using System.Text;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Tests.Security;

[Collection("CredentialTelemetryGlobalMeter")]
public class CredentialServiceTests
{
    private static readonly DateTimeOffset FixedInstant = new(2026, 11, 26, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task ChangePasswordAsync_ValidRequest_UpdatesCredentialAndRevokesSessions()
    {
        var databaseName = Guid.NewGuid().ToString();
        await using var context = CreateContext(databaseName);
        var user = CreateUser();
        context.Usuarios.Add(user);
        await context.SaveChangesAsync();
        var hasher = CreateHasher(PasswordVerificationResult.Success, "new-hash");
        var sut = CreateService(context, ValidPolicy(), hasher.Object);

        var result = await sut.ChangePasswordAsync(
            user.Id,
            "current-password",
            "valid-new-password",
            "valid-new-password");

        Assert.Equal(CredentialChangeStatus.Success, result.Status);
        Assert.Null(result.Code);
        Assert.Equal("new-hash", user.SenhaHash);
        Assert.False(user.ExigeTrocaSenha);
        Assert.Equal(8, user.VersaoSessao);
        Assert.Null(user.TokenRedefinicaoHash);
        Assert.Null(user.TokenExpiracao);
        hasher.Verify(h => h.HashPassword(user, "valid-new-password"), Times.Once);
    }

    [Fact]
    public async Task SucceedsWithoutOptionalRecoveryRepository()
    {
        await using var context = CreateContext(Guid.NewGuid().ToString());
        var user = CreateUser();
        context.Usuarios.Add(user);
        await context.SaveChangesAsync();
        var hasher = CreateHasher(PasswordVerificationResult.Success, "new-hash");
        using var serviceProvider = new ServiceCollection().BuildServiceProvider();
        var sut = new CredentialService(
            context,
            ValidPolicy(),
            hasher.Object,
            new CredentialTelemetry(NullLogger<CredentialTelemetry>.Instance),
            serviceProvider: serviceProvider);

        var result = await sut.ChangePasswordAsync(
            user.Id,
            "current-password",
            "valid-new-password",
            "valid-new-password");

        Assert.Equal(CredentialChangeStatus.Success, result.Status);
        Assert.Equal("new-hash", user.SenhaHash);
        Assert.Equal(8, user.VersaoSessao);
    }

    [Theory]
    [InlineData(PasswordVerificationResult.Success)]
    [InlineData(PasswordVerificationResult.SuccessRehashNeeded)]
    public async Task ChangePasswordAsync_AcceptsEverySuccessfulIdentityVerification(
        PasswordVerificationResult verificationResult)
    {
        await using var context = CreateContext(Guid.NewGuid().ToString());
        var user = CreateUser();
        context.Usuarios.Add(user);
        await context.SaveChangesAsync();
        var hasher = CreateHasher(verificationResult, "replacement-hash");
        var sut = CreateService(context, ValidPolicy(), hasher.Object);

        var result = await sut.ChangePasswordAsync(
            user.Id,
            "current-password",
            "valid-new-password",
            "valid-new-password");

        Assert.Equal(CredentialChangeStatus.Success, result.Status);
    }

    [Fact]
    public async Task ChangePasswordAsync_WrongCurrentPassword_ReturnsStableCodeWithoutMutation()
    {
        await using var context = CreateContext(Guid.NewGuid().ToString());
        var user = CreateUser();
        context.Usuarios.Add(user);
        await context.SaveChangesAsync();
        var hasher = CreateHasher(PasswordVerificationResult.Failed, "unused-hash");
        var sut = CreateService(context, ValidPolicy(), hasher.Object);

        var result = await sut.ChangePasswordAsync(
            user.Id,
            "wrong-current-password",
            "valid-new-password",
            "valid-new-password");

        Assert.Equal(CredentialChangeStatus.ValidationFailed, result.Status);
        Assert.Equal("current_password_invalid", result.Code);
        AssertUnchanged(user);
        hasher.Verify(h => h.HashPassword(It.IsAny<Usuario>(), It.IsAny<string>()), Times.Never);
    }

    [Theory]
    [InlineData(true, "")]
    [InlineData(false, "current-password")]
    public async Task ReturnsStableCodeWithoutMutationForMissingUserOrCurrentPassword(
        bool userExists,
        string? currentPassword)
    {
        await using var context = CreateContext(Guid.NewGuid().ToString());
        var user = CreateUser();
        if (userExists)
        {
            context.Usuarios.Add(user);
            await context.SaveChangesAsync();
        }

        var hasher = CreateHasher(PasswordVerificationResult.Success, "unused-hash");
        var sut = CreateService(context, ValidPolicy(), hasher.Object);

        var result = await sut.ChangePasswordAsync(
            userExists ? user.Id : user.Id + 1,
            currentPassword,
            "valid-new-password",
            "valid-new-password");

        Assert.Equal(CredentialChangeStatus.ValidationFailed, result.Status);
        Assert.Equal("current_password_invalid", result.Code);
        if (userExists)
        {
            AssertUnchanged(user);
        }
        hasher.Verify(h => h.VerifyHashedPassword(
            It.IsAny<Usuario>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
        hasher.Verify(h => h.HashPassword(It.IsAny<Usuario>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task ChangePasswordAsync_ConfirmationMismatch_ReturnsStableCodeBeforePasswordChecks()
    {
        await using var context = CreateContext(Guid.NewGuid().ToString());
        var user = CreateUser();
        context.Usuarios.Add(user);
        await context.SaveChangesAsync();
        var hasher = CreateHasher(PasswordVerificationResult.Success, "unused-hash");
        var policy = new Mock<IPasswordPolicy>(MockBehavior.Strict);
        var sut = CreateService(context, policy.Object, hasher.Object);

        var result = await sut.ChangePasswordAsync(
            user.Id,
            "current-password",
            "valid-new-password",
            "different-confirmation");

        Assert.Equal(CredentialChangeStatus.ValidationFailed, result.Status);
        Assert.Equal("password_confirmation_mismatch", result.Code);
        AssertUnchanged(user);
        hasher.Verify(
            h => h.VerifyHashedPassword(It.IsAny<Usuario>(), It.IsAny<string>(), It.IsAny<string>()),
            Times.Never);
    }

    [Fact]
    public async Task ChangePasswordAsync_PolicyRejection_ReturnsPolicyCodeWithoutMutation()
    {
        await using var context = CreateContext(Guid.NewGuid().ToString());
        var user = CreateUser();
        context.Usuarios.Add(user);
        await context.SaveChangesAsync();
        var policy = new Mock<IPasswordPolicy>();
        policy.Setup(p => p.Validate("blocked-password"))
            .Returns(PasswordPolicyResult.Invalid("password_common"));
        var hasher = CreateHasher(PasswordVerificationResult.Success, "unused-hash");
        var sut = CreateService(context, policy.Object, hasher.Object);

        var result = await sut.ChangePasswordAsync(
            user.Id,
            "current-password",
            "blocked-password",
            "blocked-password");

        Assert.Equal(CredentialChangeStatus.ValidationFailed, result.Status);
        Assert.Equal("password_common", result.Code);
        AssertUnchanged(user);
        hasher.Verify(h => h.HashPassword(It.IsAny<Usuario>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task UsesGenericFallbackForPolicyRejectionWithoutCode()
    {
        await using var context = CreateContext(Guid.NewGuid().ToString());
        var user = CreateUser();
        context.Usuarios.Add(user);
        await context.SaveChangesAsync();
        var policy = new Mock<IPasswordPolicy>();
        policy.Setup(p => p.Validate("blocked-password"))
            .Returns(new PasswordPolicyResult(false, null));
        var hasher = CreateHasher(PasswordVerificationResult.Success, "unused-hash");
        var sut = CreateService(context, policy.Object, hasher.Object);

        var result = await sut.ChangePasswordAsync(
            user.Id,
            "current-password",
            "blocked-password",
            "blocked-password");

        Assert.Equal(CredentialChangeStatus.ValidationFailed, result.Status);
        Assert.Equal("password_invalid", result.Code);
        AssertUnchanged(user);
        hasher.Verify(h => h.HashPassword(It.IsAny<Usuario>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task ChangePasswordAsync_ConcurrencyFailure_ReturnsConflictAndPersistsNothing()
    {
        var databaseName = Guid.NewGuid().ToString();
        await using var context = CreateConcurrencyContext(databaseName);
        var user = CreateUser();
        context.Usuarios.Add(user);
        await context.SaveChangesAsync();
        context.ThrowOnSave = true;
        var hasher = CreateHasher(PasswordVerificationResult.Success, "new-hash");
        var sut = CreateService(context, ValidPolicy(), hasher.Object);

        var result = await sut.ChangePasswordAsync(
            user.Id,
            "current-password",
            "valid-new-password",
            "valid-new-password");

        Assert.Equal(CredentialChangeStatus.Conflict, result.Status);
        Assert.Equal("credential_concurrency_conflict", result.Code);

        await using var verificationContext = CreateContext(databaseName);
        var persisted = await verificationContext.Usuarios.SingleAsync(u => u.Id == user.Id);
        AssertUnchanged(persisted);
    }

    [Fact]
    public void CredentialTelemetry_UsesClosedReasonVocabularyWithoutLoggingProvidedValue()
    {
        var logger = new CapturingLogger<CredentialTelemetry>();
        var telemetry = new CredentialTelemetry(logger);

        telemetry.RecordFailure(42, "raw-password-or-token-value");

        var message = Assert.Single(logger.Messages);
        Assert.Contains("password_invalid", message);
        Assert.DoesNotContain("raw-password-or-token-value", message);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData(" \t")]
    public async Task PasswordResetRequestRejectsBlankEmail(string? email)
    {
        await using var context = CreateContext(Guid.NewGuid().ToString());
        var sut = CreateService(context, ValidPolicy(), CreateHasher(PasswordVerificationResult.Success, "new-hash").Object);

        var result = await sut.RequestPasswordResetAsync(email);

        Assert.Null(result.RecipientEmail);
        Assert.Null(result.RecipientName);
        Assert.Null(result.Token);
    }

    [Theory]
    [InlineData(false, StatusUsuario.Habilitado)]
    [InlineData(true, StatusUsuario.Desabilitado)]
    public async Task PasswordResetRequestRejectsUnknownOrDisabledAccount(
        bool persistUser,
        StatusUsuario status)
    {
        await using var context = CreateContext(Guid.NewGuid().ToString());
        var user = CreateUser();
        user.Status = status;
        if (persistUser)
        {
            context.Usuarios.Add(user);
            await context.SaveChangesAsync();
        }

        var sut = CreateService(context, ValidPolicy(), CreateHasher(PasswordVerificationResult.Success, "new-hash").Object);

        var result = await sut.RequestPasswordResetAsync(user.Email);

        Assert.Null(result.RecipientEmail);
        Assert.Null(result.RecipientName);
        Assert.Null(result.Token);
        if (persistUser)
        {
            AssertUnchanged(user);
        }
    }

    [Fact]
    public async Task CurrentPasswordResetAcceptsMatchingLiveToken()
    {
        await using var context = CreateContext(Guid.NewGuid().ToString());
        const string token = "current-reset-token";
        var user = CreateUser();
        user.TokenRedefinicaoHash = HashResetToken(token);
        user.TokenExpiracao = FixedInstant.AddMinutes(1).UtcDateTime;
        context.Usuarios.Add(user);
        await context.SaveChangesAsync();
        var sut = CreateService(
            context,
            ValidPolicy(),
            CreateHasher(PasswordVerificationResult.Success, "new-hash").Object,
            new FixedTimeProvider(FixedInstant));

        var isCurrent = await sut.IsPasswordResetCurrentAsync(
            user.Id,
            user.Email,
            user.VersaoSessao,
            token);

        Assert.True(isCurrent);
    }

    [Theory]
    [InlineData("other@example.org", 7, StatusUsuario.Habilitado)]
    [InlineData("credential@example.org", 6, StatusUsuario.Habilitado)]
    [InlineData("credential@example.org", 7, StatusUsuario.Desabilitado)]
    [InlineData("credential@example.org", 7, StatusUsuario.Bloqueado)]
    public async Task CurrentPasswordResetRejectsChangedAccountIdentity(
        string expectedEmail,
        long sessionVersion,
        StatusUsuario status)
    {
        await using var context = CreateContext(Guid.NewGuid().ToString());
        const string token = "current-reset-token";
        var user = CreateUser();
        user.Status = status;
        user.TokenRedefinicaoHash = HashResetToken(token);
        user.TokenExpiracao = FixedInstant.AddMinutes(1).UtcDateTime;
        context.Usuarios.Add(user);
        await context.SaveChangesAsync();
        var sut = CreateService(
            context,
            ValidPolicy(),
            CreateHasher(PasswordVerificationResult.Success, "new-hash").Object,
            new FixedTimeProvider(FixedInstant));

        var isCurrent = await sut.IsPasswordResetCurrentAsync(
            user.Id,
            expectedEmail,
            sessionVersion,
            token);

        Assert.False(isCurrent);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task CurrentPasswordResetRejectsMissingOrExpiredExpiration(int? secondsUntilExpiration)
    {
        await using var context = CreateContext(Guid.NewGuid().ToString());
        const string token = "current-reset-token";
        var user = CreateUser();
        user.TokenRedefinicaoHash = HashResetToken(token);
        user.TokenExpiracao = secondsUntilExpiration is { } seconds
            ? FixedInstant.AddSeconds(seconds).UtcDateTime
            : null;
        context.Usuarios.Add(user);
        await context.SaveChangesAsync();
        var sut = CreateService(
            context,
            ValidPolicy(),
            CreateHasher(PasswordVerificationResult.Success, "new-hash").Object,
            new FixedTimeProvider(FixedInstant));

        var isCurrent = await sut.IsPasswordResetCurrentAsync(
            user.Id,
            user.Email,
            user.VersaoSessao,
            token);

        Assert.False(isCurrent);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("not-base64")]
    [InlineData("valid-other")]
    public async Task CurrentPasswordResetRejectsMalformedOrDifferentStoredHash(string? storedHash)
    {
        await using var context = CreateContext(Guid.NewGuid().ToString());
        const string token = "current-reset-token";
        var user = CreateUser();
        user.TokenRedefinicaoHash = storedHash == "valid-other"
            ? HashResetToken("different-reset-token")
            : storedHash;
        user.TokenExpiracao = FixedInstant.AddMinutes(1).UtcDateTime;
        context.Usuarios.Add(user);
        await context.SaveChangesAsync();
        var sut = CreateService(
            context,
            ValidPolicy(),
            CreateHasher(PasswordVerificationResult.Success, "new-hash").Object,
            new FixedTimeProvider(FixedInstant));

        var isCurrent = await sut.IsPasswordResetCurrentAsync(
            user.Id,
            user.Email,
            user.VersaoSessao,
            token);

        Assert.False(isCurrent);
    }

    [Fact]
    public async Task PasswordResetRejectsConfirmationMismatchWithoutChangingCredential()
    {
        await using var context = CreateContext(Guid.NewGuid().ToString());
        const string token = "valid-reset-token";
        var user = CreateUser();
        user.TokenRedefinicaoHash = HashResetToken(token);
        user.TokenExpiracao = FixedInstant.AddMinutes(1).UtcDateTime;
        context.Usuarios.Add(user);
        await context.SaveChangesAsync();
        var policy = new Mock<IPasswordPolicy>(MockBehavior.Strict);
        var hasher = CreateHasher(PasswordVerificationResult.Success, "unused-hash");
        var sut = CreateService(context, policy.Object, hasher.Object, new FixedTimeProvider(FixedInstant));

        var result = await sut.ResetPasswordAsync(
            user.Email,
            token,
            "new-password",
            "different-confirmation");

        Assert.Equal(CredentialChangeStatus.ValidationFailed, result.Status);
        Assert.Equal(CredentialErrorCodes.ConfirmationMismatch, result.Code);
        AssertResetUnchanged(user, token);
        policy.Verify(candidate => candidate.Validate(It.IsAny<string>()), Times.Never);
        hasher.Verify(candidate => candidate.HashPassword(It.IsAny<Usuario>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task PasswordResetUsesFallbackForPolicyRejectionWithoutCode()
    {
        await using var context = CreateContext(Guid.NewGuid().ToString());
        const string token = "valid-reset-token";
        var user = CreateUser();
        user.TokenRedefinicaoHash = HashResetToken(token);
        user.TokenExpiracao = FixedInstant.AddMinutes(1).UtcDateTime;
        context.Usuarios.Add(user);
        await context.SaveChangesAsync();
        var policy = new Mock<IPasswordPolicy>();
        policy.Setup(candidate => candidate.Validate("blocked-password"))
            .Returns(new PasswordPolicyResult(false, null));
        var hasher = CreateHasher(PasswordVerificationResult.Success, "unused-hash");
        var sut = CreateService(context, policy.Object, hasher.Object, new FixedTimeProvider(FixedInstant));

        var result = await sut.ResetPasswordAsync(
            user.Email,
            token,
            "blocked-password",
            "blocked-password");

        Assert.Equal(CredentialChangeStatus.ValidationFailed, result.Status);
        Assert.Equal("password_invalid", result.Code);
        AssertResetUnchanged(user, token);
        hasher.Verify(candidate => candidate.HashPassword(It.IsAny<Usuario>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task DeliveryResetRequiresAnExternalTransaction()
    {
        await using var context = CreateContext(Guid.NewGuid().ToString());
        var sut = CreateService(context, ValidPolicy(), CreateHasher(PasswordVerificationResult.Success, "new-hash").Object);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.IssuePasswordResetForDeliveryAsync(1, "credential@example.org"));

        Assert.Contains("external transaction", exception.Message);
    }

    private static CredentialService CreateService(
        AppDbContext context,
        IPasswordPolicy policy,
        IPasswordHasher<Usuario> hasher,
        TimeProvider? timeProvider = null) =>
        new(context, policy, hasher, new CredentialTelemetry(NullLogger<CredentialTelemetry>.Instance), timeProvider);

    private static string HashResetToken(string token) =>
        Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    private static Mock<IPasswordHasher<Usuario>> CreateHasher(
        PasswordVerificationResult verificationResult,
        string newHash)
    {
        var hasher = new Mock<IPasswordHasher<Usuario>>();
        hasher.Setup(h => h.VerifyHashedPassword(
                It.IsAny<Usuario>(),
                "old-hash",
                It.IsAny<string>()))
            .Returns(verificationResult);
        hasher.Setup(h => h.HashPassword(It.IsAny<Usuario>(), It.IsAny<string>()))
            .Returns(newHash);
        return hasher;
    }

    private static IPasswordPolicy ValidPolicy()
    {
        var policy = new Mock<IPasswordPolicy>();
        policy.Setup(p => p.Validate(It.IsAny<string>())).Returns(PasswordPolicyResult.Valid);
        return policy.Object;
    }

    private static AppDbContext CreateContext(string databaseName) =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName)
            .Options);

    private static ConcurrencyAppDbContext CreateConcurrencyContext(string databaseName) =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName)
            .Options);

    private static Usuario CreateUser() => new()
    {
        NomeCompleto = "Credential test user",
        Email = "credential@example.org",
        SenhaHash = "old-hash",
        NivelUsuario = NivelUsuario.Administrador,
        TipoUsuario = TipoUsuario.Administrador,
        Status = StatusUsuario.Habilitado,
        ExigeTrocaSenha = true,
        VersaoSessao = 7,
        TokenRedefinicaoHash = "reset-token-hash",
        TokenExpiracao = DateTime.UtcNow.AddMinutes(10)
    };

    private static void AssertUnchanged(Usuario user)
    {
        Assert.Equal("old-hash", user.SenhaHash);
        Assert.True(user.ExigeTrocaSenha);
        Assert.Equal(7, user.VersaoSessao);
        Assert.Equal("reset-token-hash", user.TokenRedefinicaoHash);
        Assert.NotNull(user.TokenExpiracao);
    }

    private static void AssertResetUnchanged(Usuario user, string token)
    {
        Assert.Equal("old-hash", user.SenhaHash);
        Assert.True(user.ExigeTrocaSenha);
        Assert.Equal(7, user.VersaoSessao);
        Assert.Equal(HashResetToken(token), user.TokenRedefinicaoHash);
        Assert.Equal(FixedInstant.AddMinutes(1).UtcDateTime, user.TokenExpiracao);
    }

    private sealed class ConcurrencyAppDbContext(DbContextOptions<AppDbContext> options)
        : AppDbContext(options)
    {
        public bool ThrowOnSave { get; set; }

        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            if (ThrowOnSave)
            {
                throw new DbUpdateConcurrencyException("Synthetic concurrency conflict.");
            }

            return base.SaveChangesAsync(cancellationToken);
        }
    }

    private sealed class FixedTimeProvider(DateTimeOffset instant) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => instant;
    }

    private sealed class CapturingLogger<T> : ILogger<T>
    {
        public List<string> Messages { get; } = [];

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter) =>
            Messages.Add(formatter(state, exception));
    }
}
