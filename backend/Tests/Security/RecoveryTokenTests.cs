using System.Security.Cryptography;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Tests.Security;

public class RecoveryTokenTests
{
    [Fact]
    public async Task RequestPasswordResetAsync_GeneratesAndPersistsOnlyASha256Hash()
    {
        await using var context = CreateContext();
        var user = CreateUser();
        context.Usuarios.Add(user);
        await context.SaveChangesAsync();
        var sut = CreateService(context);
        var before = DateTime.UtcNow;

        var result = await sut.RequestPasswordResetAsync(
            "recovery@example.org",
            CancellationToken.None);

        var token = Assert.IsType<string>(result.Token);
        Assert.True(token.Length >= 22);
        Assert.DoesNotContain('+', token);
        Assert.DoesNotContain('/', token);
        Assert.DoesNotContain('=', token);
        Assert.NotNull(user.TokenRedefinicaoHash);
        Assert.NotEqual(token, user.TokenRedefinicaoHash);
        Assert.Equal(
            Convert.ToBase64String(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(token))),
            user.TokenRedefinicaoHash);
        Assert.NotNull(user.TokenExpiracao);
        Assert.Equal(DateTimeKind.Utc, user.TokenExpiracao!.Value.Kind);
        Assert.True(user.TokenExpiracao > before);
    }

    [Fact]
    public async Task ResetPasswordAsync_RequiresTheMatchingEmailAndRevokesAllSessions()
    {
        await using var context = CreateContext();
        var user = CreateUser();
        context.Usuarios.Add(user);
        await context.SaveChangesAsync();
        var hasher = new Mock<IPasswordHasher<Usuario>>();
        hasher.Setup(hasher => hasher.HashPassword(user, "valid-new-password"))
            .Returns("new-hash");
        var sut = CreateService(context, hasher.Object);
        var request = await sut.RequestPasswordResetAsync(
            "recovery@example.org",
            CancellationToken.None);
        var token = Assert.IsType<string>(request.Token);

        var mismatched = await sut.ResetPasswordAsync(
            "other@example.org",
            token,
            "valid-new-password",
            "valid-new-password",
            cancellationToken: CancellationToken.None);

        Assert.Equal("password_reset_invalid", mismatched.Code);
        Assert.Equal("old-hash", user.SenhaHash);
        Assert.Equal(7, user.VersaoSessao);

        var reset = await sut.ResetPasswordAsync(
            "recovery@example.org",
            token,
            "valid-new-password",
            "valid-new-password",
            cancellationToken: CancellationToken.None);

        Assert.Equal(CredentialChangeStatus.Success, reset.Status);
        Assert.Equal("new-hash", user.SenhaHash);
        Assert.False(user.ExigeTrocaSenha);
        Assert.Equal(8, user.VersaoSessao);
        Assert.Null(user.TokenRedefinicaoHash);
        Assert.Null(user.TokenExpiracao);
    }

    [Fact]
    public async Task ResetPasswordAsync_ExpiredOrConsumedToken_ReturnsTheSameGenericFailure()
    {
        await using var context = CreateContext();
        var user = CreateUser();
        context.Usuarios.Add(user);
        await context.SaveChangesAsync();
        var hasher = new Mock<IPasswordHasher<Usuario>>();
        hasher.Setup(candidate => candidate.HashPassword(user, It.IsAny<string>()))
            .Returns("new-hash");
        var sut = CreateService(context, hasher.Object);
        var request = await sut.RequestPasswordResetAsync("recovery@example.org");
        var token = Assert.IsType<string>(request.Token);

        user.TokenExpiracao = DateTime.UtcNow.AddMinutes(-1);
        var expired = await sut.ResetPasswordAsync(
            "recovery@example.org",
            token,
            "valid-new-password",
            "valid-new-password");

        Assert.Equal(CredentialErrorCodes.PasswordResetInvalid, expired.Code);
        Assert.Equal("old-hash", user.SenhaHash);

        user.TokenExpiracao = DateTime.UtcNow.AddMinutes(10);
        var consumed = await sut.ResetPasswordAsync(
            "recovery@example.org",
            token,
            "valid-new-password",
            "valid-new-password");
        var reused = await sut.ResetPasswordAsync(
            "recovery@example.org",
            token,
            "valid-new-password",
            "valid-new-password");

        Assert.Equal(CredentialChangeStatus.Success, consumed.Status);
        Assert.Equal(CredentialErrorCodes.PasswordResetInvalid, reused.Code);
    }

    private static CredentialService CreateService(
        AppDbContext context,
        IPasswordHasher<Usuario>? hasher = null)
    {
        var policy = new Mock<IPasswordPolicy>();
        policy.Setup(candidate => candidate.Validate(It.IsAny<string>()))
            .Returns(PasswordPolicyResult.Valid);
        return new CredentialService(
            context,
            policy.Object,
            hasher ?? new PasswordHasher<Usuario>(),
            new CredentialTelemetry(NullLogger<CredentialTelemetry>.Instance));
    }

    private static AppDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static Usuario CreateUser() => new()
    {
        NomeCompleto = "Recovery test user",
        Email = "recovery@example.org",
        SenhaHash = "old-hash",
        NivelUsuario = NivelUsuario.Administrador,
        TipoUsuario = TipoUsuario.Administrador,
        Status = StatusUsuario.Habilitado,
        ExigeTrocaSenha = true,
        VersaoSessao = 7
    };
}
