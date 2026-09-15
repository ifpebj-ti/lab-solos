using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class CriticalAuthenticationTests(PostgreSqlContainerFixture database)
{
    [Fact]
    public async Task LoginWithInvalidPasswordReturnsGenericUnauthorizedWithoutSession()
    {
        await using var factory = new IntegrationWebApplicationFactory(database);
        await factory.RecreateDatabaseAsync();
        await SeedUserAsync(factory, StatusUsuario.Habilitado);

        using var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/Auth/login", new
        {
            email = UserEmail,
            password = "wrong-password"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("Credenciais inválidas.", await response.Content.ReadAsStringAsync());
    }

    [Theory]
    [InlineData(StatusUsuario.Habilitado, true)]
    [InlineData(StatusUsuario.Pendente, false)]
    [InlineData(StatusUsuario.Desabilitado, false)]
    public async Task LoginOnlyEnabledAccountReceivesSession(
        StatusUsuario status,
        bool expectedSuccess)
    {
        await using var factory = new IntegrationWebApplicationFactory(database);
        await factory.RecreateDatabaseAsync();
        await SeedUserAsync(factory, status);

        using var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/Auth/login", new
        {
            email = UserEmail,
            password = ValidPassword
        });

        Assert.Equal(
            expectedSuccess ? HttpStatusCode.OK : HttpStatusCode.Unauthorized,
            response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        if (expectedSuccess)
        {
            Assert.Contains("\"token\"", body, StringComparison.OrdinalIgnoreCase);
        }
        else
        {
            Assert.Equal("Credenciais inválidas.", body);
            Assert.DoesNotContain("token", body, StringComparison.OrdinalIgnoreCase);
        }
    }

    [Fact]
    public async Task ChangePasswordWithWrongCurrentPasswordDoesNotMutateCredentialOrSession()
    {
        await using var factory = new IntegrationWebApplicationFactory(database);
        await factory.RecreateDatabaseAsync();
        await SeedUserAsync(factory, StatusUsuario.Habilitado);
        var original = await ReadUserAsync(factory, UserId);

        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue(
                "Bearer",
                JwtSessionVersionTests.CreateToken(UserId, "0", "false"));

        var change = await client.PostAsJsonAsync("/api/Auth/change-password", new
        {
            currentPassword = "wrong-current-password",
            newPassword = NewPassword,
            confirmation = NewPassword
        });

        Assert.Equal(HttpStatusCode.BadRequest, change.StatusCode);
        Assert.Contains(
            "current_password_invalid",
            await change.Content.ReadAsStringAsync(),
            StringComparison.Ordinal);

        var unchanged = await ReadUserAsync(factory, UserId);
        Assert.Equal(original.SenhaHash, unchanged.SenhaHash);
        Assert.Equal(original.VersaoSessao, unchanged.VersaoSessao);
        Assert.Equal(HttpStatusCode.OK, (await LoginAsync(client, ValidPassword)).StatusCode);
    }

    [Fact]
    public async Task ChangePasswordSuccessPersistsNewCredentialAndRevokesOldSession()
    {
        await using var factory = new IntegrationWebApplicationFactory(database);
        await factory.RecreateDatabaseAsync();
        await SeedUserAsync(factory, StatusUsuario.Habilitado);

        using var client = factory.CreateClient();
        var oldToken = JwtSessionVersionTests.CreateToken(UserId, "0", "false");
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", oldToken);

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/Produtos")).StatusCode);

        var change = await client.PostAsJsonAsync("/api/Auth/change-password", new
        {
            currentPassword = ValidPassword,
            newPassword = NewPassword,
            confirmation = NewPassword
        });

        Assert.Equal(HttpStatusCode.NoContent, change.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/Produtos")).StatusCode);

        var oldLogin = await LoginAsync(client, ValidPassword);
        Assert.Equal(HttpStatusCode.Unauthorized, oldLogin.StatusCode);

        var newLogin = await LoginAsync(client, NewPassword);
        Assert.Equal(HttpStatusCode.OK, newLogin.StatusCode);
        var persisted = await ReadUserAsync(factory, UserId);
        Assert.False(persisted.ExigeTrocaSenha);
        Assert.Equal(1, persisted.VersaoSessao);
        Assert.Null(persisted.TokenRedefinicaoHash);
        Assert.Null(persisted.TokenExpiracao);
    }

    [Fact]
    public async Task RequestPasswordResetUnknownAndUnavailableAccountsHaveSameNeutralResponse()
    {
        await using var factory = new IntegrationWebApplicationFactory(database);
        await factory.RecreateDatabaseAsync();
        await SeedUserAsync(factory, StatusUsuario.Desabilitado);

        using var client = factory.CreateClient();
        var unknown = await client.PostAsJsonAsync("/api/Email/request-password-reset", new
        {
            email = "unknown@example.test"
        });
        var unavailable = await client.PostAsJsonAsync("/api/Email/request-password-reset", new
        {
            email = "critical-auth@example.test"
        });

        Assert.Equal(HttpStatusCode.Accepted, unknown.StatusCode);
        Assert.Equal(HttpStatusCode.Accepted, unavailable.StatusCode);
        var unknownBody = await unknown.Content.ReadAsStringAsync();
        var unavailableBody = await unavailable.Content.ReadAsStringAsync();
        Assert.Equal(unknownBody, unavailableBody);
        Assert.DoesNotContain("unknown@example.test", unknownBody, StringComparison.Ordinal);
        Assert.DoesNotContain("critical-auth@example.test", unknownBody, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ResetPasswordExpiredTokenDoesNotMutateAndConsumedTokenCannotBeReused()
    {
        var now = new DateTimeOffset(2026, 9, 14, 12, 0, 0, TimeSpan.Zero);
        await using var factory = new IntegrationWebApplicationFactory(database, new()
        {
            TimeProvider = new ControlledTimeProvider(now)
        });
        await factory.RecreateDatabaseAsync();
        await SeedResetUsersAsync(factory, now.UtcDateTime);

        using var client = factory.CreateClient();
        var expired = await ResetAsync(client, ExpiredEmail, ExpiredToken);
        Assert.Equal(HttpStatusCode.BadRequest, expired.StatusCode);
        Assert.Contains(
            "password_reset_invalid",
            await expired.Content.ReadAsStringAsync(),
            StringComparison.Ordinal);

        var expiredUser = await ReadUserAsync(factory, ExpiredUserId);
        Assert.Equal(0, expiredUser.VersaoSessao);
        Assert.Equal(
            PasswordVerificationResult.Success,
            new PasswordHasher<Usuario>().VerifyHashedPassword(
                expiredUser,
                expiredUser.SenhaHash,
                OldPassword));
        Assert.Equal(ExpiredHash, expiredUser.TokenRedefinicaoHash);

        var consumed = await ResetAsync(client, ConsumedEmail, ConsumedToken);
        Assert.Equal(HttpStatusCode.NoContent, consumed.StatusCode);

        var reused = await ResetAsync(client, ConsumedEmail, ConsumedToken);
        Assert.Equal(HttpStatusCode.BadRequest, reused.StatusCode);
        Assert.Contains(
            "password_reset_invalid",
            await reused.Content.ReadAsStringAsync(),
            StringComparison.Ordinal);

        var oldLogin = await LoginAsync(client, OldPassword, ConsumedEmail);
        Assert.Equal(HttpStatusCode.Unauthorized, oldLogin.StatusCode);
        var newLogin = await LoginAsync(client, NewPassword, ConsumedEmail);
        Assert.Equal(HttpStatusCode.OK, newLogin.StatusCode);

        var consumedUser = await ReadUserAsync(factory, ConsumedUserId);
        Assert.Equal(1, consumedUser.VersaoSessao);
        Assert.Equal(
            PasswordVerificationResult.Success,
            new PasswordHasher<Usuario>().VerifyHashedPassword(
                consumedUser,
                consumedUser.SenhaHash,
                NewPassword));
        Assert.Null(consumedUser.TokenRedefinicaoHash);
        Assert.Null(consumedUser.TokenExpiracao);
    }

    private static async Task SeedUserAsync(
        IntegrationWebApplicationFactory factory,
        StatusUsuario status)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = CreateUser(
            UserId,
            UserEmail,
            ValidPassword,
            status,
            new PasswordHasher<Usuario>());
        context.Usuarios.Add(user);
        await context.SaveChangesAsync();
    }

    private static async Task SeedResetUsersAsync(
        IntegrationWebApplicationFactory factory,
        DateTime now)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var hasher = new PasswordHasher<Usuario>();

        var expired = CreateUser(
            ExpiredUserId,
            ExpiredEmail,
            OldPassword,
            StatusUsuario.Habilitado,
            hasher);
        expired.TokenRedefinicaoHash = ExpiredHash;
        expired.TokenExpiracao = now.AddMinutes(-1);

        var consumed = CreateUser(
            ConsumedUserId,
            ConsumedEmail,
            OldPassword,
            StatusUsuario.Habilitado,
            hasher);
        consumed.TokenRedefinicaoHash = ConsumedHash;
        consumed.TokenExpiracao = now.AddMinutes(15);

        context.Usuarios.AddRange(expired, consumed);
        await context.SaveChangesAsync();
    }

    private static Usuario CreateUser(
        int id,
        string email,
        string password,
        StatusUsuario status,
        PasswordHasher<Usuario> hasher)
    {
        var user = new Usuario
        {
            Id = id,
            NomeCompleto = "Usuário de recuperação crítica",
            Email = email,
            SenhaHash = string.Empty,
            NivelUsuario = NivelUsuario.Comum,
            TipoUsuario = TipoUsuario.Comum,
            Status = status,
            ExigeTrocaSenha = false,
            VersaoSessao = 0
        };
        user.SenhaHash = hasher.HashPassword(user, password);
        return user;
    }

    private static async Task<Usuario> ReadUserAsync(
        IntegrationWebApplicationFactory factory,
        int id)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await context.Usuarios.AsNoTracking().SingleAsync(user => user.Id == id);
    }

    private static Task<HttpResponseMessage> LoginAsync(
        HttpClient client,
        string password,
        string email = UserEmail) => client.PostAsJsonAsync("/api/Auth/login", new
        {
            email,
            password
        });

    private static Task<HttpResponseMessage> ResetAsync(
        HttpClient client,
        string email,
        string token) => client.PostAsJsonAsync("/api/Email/reset-password", new
        {
            email,
            code = token,
            newPassword = NewPassword,
            confirmation = NewPassword
        });

    private static string HashToken(string token) => Convert.ToBase64String(
        SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    private const int UserId = 4201;
    private const int ExpiredUserId = 4301;
    private const int ConsumedUserId = 4302;
    private const string UserEmail = "critical-auth@example.test";
    private const string ExpiredEmail = "expired@example.test";
    private const string ConsumedEmail = "consumed@example.test";
    private const string ValidPassword = "critical-auth-valid-password-2026";
    private const string NewPassword = "critical-auth-new-password-2026";
    private const string OldPassword = "critical-auth-old-password-2026";
    private const string ExpiredToken = "expired-critical-reset-token";
    private const string ConsumedToken = "consumed-critical-reset-token";
    private static readonly string ExpiredHash = HashToken(ExpiredToken);
    private static readonly string ConsumedHash = HashToken(ConsumedToken);
}
