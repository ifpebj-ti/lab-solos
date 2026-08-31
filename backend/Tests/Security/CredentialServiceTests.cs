using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Tests.Security;

public class CredentialServiceTests
{
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

    private static CredentialService CreateService(
        AppDbContext context,
        IPasswordPolicy policy,
        IPasswordHasher<Usuario> hasher) =>
        new(context, policy, hasher, new CredentialTelemetry(NullLogger<CredentialTelemetry>.Instance));

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
