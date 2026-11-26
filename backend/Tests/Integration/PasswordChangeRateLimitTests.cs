using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using LabSolos_Server_DotNet8.Controllers;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Moq;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSql15IntegrationGroup.Name)]
public sealed class PasswordChangeRateLimitTests(PostgreSql15ContainerFixture database)
{
    private const string BrowserOrigin = "http://localhost";
    private const string Email = "password-change-throttle@example.test";
    private const string OtherEmail = "password-change-throttle-other@example.test";
    private const string Password = "Synthetic current password! 2026";
    private const string NewPassword = "Synthetic replacement password! 2026";
    private static readonly DateTimeOffset InitialTime =
        new(2026, 11, 19, 12, 0, 0, TimeSpan.Zero);

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task SixthInvalidCurrentPasswordAttemptIsLimitedForTheAuthenticatedAccount(
        bool requiresPasswordChange)
    {
        var scenario = await CreateScenarioAsync(requiresPasswordChange);
        await using var factory = scenario.Factory;
        using var client = scenario.Client;

        for (var attempt = 0; attempt < 5; attempt++)
        {
            using var response = await ChangePasswordAsync(client, scenario.Cookie, "incorrect current password");
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        using var limited = await ChangePasswordAsync(client, scenario.Cookie, Password);

        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
        Assert.Equal(900, limited.Headers.RetryAfter?.Delta?.TotalSeconds);
        Assert.True(limited.Headers.CacheControl?.NoStore);
        Assert.Equal("application/problem+json", limited.Content.Headers.ContentType?.MediaType);
        using (var problem = System.Text.Json.JsonDocument.Parse(await limited.Content.ReadAsStringAsync()))
        {
            Assert.Equal("authentication_rate_limited", problem.RootElement.GetProperty("code").GetString());
            Assert.Equal(900, problem.RootElement.GetProperty("retryAfterSeconds").GetInt32());
        }

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var persisted = await context.Usuarios.AsNoTracking().SingleAsync(user => user.Id == 42);
        var keyFactory = scope.ServiceProvider.GetRequiredService<ThrottleKeyFactory>();
        var accountKey = keyFactory.CreateAccountQuotaKey(ThrottlePurpose.PasswordChange, 42);
        try
        {
            var bucket = await context.AuthenticationThrottleBuckets.AsNoTracking().SingleAsync(candidate =>
                candidate.Scope == AuthenticationProtectionCapacity.PasswordChange
                && candidate.KeyHash.SequenceEqual(accountKey));
            Assert.Equal(5, bucket.Count);
            Assert.Equal(InitialTime.AddMinutes(15), bucket.WindowEndsAt);
        }
        finally
        {
            System.Security.Cryptography.CryptographicOperations.ZeroMemory(accountKey);
        }

        Assert.Equal(
            PasswordVerificationResult.Success,
            new PasswordHasher<Usuario>().VerifyHashedPassword(persisted, persisted.SenhaHash, Password));
        Assert.Equal(requiresPasswordChange, persisted.ExigeTrocaSenha);
        Assert.Equal(1, persisted.VersaoSessao);
    }

    [Fact]
    public async Task WindowExpiresAfterFifteenMinutesAndSuccessfulChangeRevokesTheOldSession()
    {
        var scenario = await CreateScenarioAsync(requiresPasswordChange: false);
        await using var factory = scenario.Factory;
        using var client = scenario.Client;

        for (var attempt = 0; attempt < 5; attempt++)
        {
            using var response = await ChangePasswordAsync(client, scenario.Cookie, "incorrect current password");
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        scenario.Clock.Advance(TimeSpan.FromMinutes(15));
        using (var changed = await ChangePasswordAsync(client, scenario.Cookie, Password))
        {
            Assert.Equal(HttpStatusCode.NoContent, changed.StatusCode);
        }

        using (var expiredSession = await SendWithCookieAsync(client, HttpMethod.Get, "/api/Auth/session", scenario.Cookie))
        {
            Assert.Equal(HttpStatusCode.Unauthorized, expiredSession.StatusCode);
        }

        using var newLogin = await client.PostAsJsonAsync(
            "/api/Auth/login",
            new { email = Email, password = NewPassword });
        Assert.Equal(HttpStatusCode.OK, newLogin.StatusCode);
    }

    [Fact]
    public async Task FailureBudgetIsIsolatedByAuthenticatedAccount()
    {
        var scenario = await CreateScenarioAsync(requiresPasswordChange: false, seedSecondAccount: true);
        await using var factory = scenario.Factory;
        using var client = scenario.Client;

        for (var attempt = 0; attempt < 5; attempt++)
        {
            using var response = await ChangePasswordAsync(client, scenario.Cookie, "incorrect current password");
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        var otherCookie = await SignInAsync(client, OtherEmail, Password);
        using var otherAccountChange = await ChangePasswordAsync(client, otherCookie, Password);

        Assert.Equal(HttpStatusCode.NoContent, otherAccountChange.StatusCode);
    }

    [Fact]
    public async Task MissingSharedCapacityReturnsServiceUnavailableBeforeChangingPassword()
    {
        var scenario = await CreateScenarioAsync(requiresPasswordChange: false);
        await using var factory = scenario.Factory;
        using var client = scenario.Client;

        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await context.Database.ExecuteSqlRawAsync(
                "DELETE FROM \"AuthenticationProtectionCapacity\" WHERE \"Scope\" = 'password-change:account'");
        }

        using var unavailable = await ChangePasswordAsync(client, scenario.Cookie, "incorrect current password");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, unavailable.StatusCode);
        await using var verificationScope = factory.Services.CreateAsyncScope();
        var verificationContext = verificationScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await verificationContext.Usuarios.AsNoTracking().SingleAsync(candidate => candidate.Id == 42);
        Assert.Equal(
            PasswordVerificationResult.Success,
            new PasswordHasher<Usuario>().VerifyHashedPassword(user, user.SenhaHash, Password));
        Assert.Equal(1, user.VersaoSessao);
    }

    [Fact]
    public async Task AccountCapacityExhaustionReturnsRetryableRateLimitWithoutMutation()
    {
        var scenario = await CreateScenarioAsync(
            requiresPasswordChange: false,
            maxBucketsPerScope: 1);
        await using var factory = scenario.Factory;
        using var client = scenario.Client;

        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var capacity = await context.Set<AuthenticationProtectionCapacity>()
                .SingleAsync(item => item.Scope == AuthenticationProtectionCapacity.PasswordChange);
            capacity.Allocated = 1;

            var keyFactory = scope.ServiceProvider.GetRequiredService<ThrottleKeyFactory>();
            var accountKey = keyFactory.CreateAccountQuotaKey(ThrottlePurpose.PasswordChange, accountId: 99);
            try
            {
                context.Set<AuthenticationThrottleBucket>().Add(new AuthenticationThrottleBucket
                {
                    Scope = AuthenticationProtectionCapacity.PasswordChange,
                    KeyHash = accountKey.ToArray(),
                    WindowStartedAt = InitialTime,
                    WindowEndsAt = InitialTime.AddMinutes(15),
                    Count = 0
                });
                await context.SaveChangesAsync();
            }
            finally
            {
                System.Security.Cryptography.CryptographicOperations.ZeroMemory(accountKey);
            }
        }

        using var exhausted = await ChangePasswordAsync(client, scenario.Cookie, Password);

        Assert.Equal(HttpStatusCode.TooManyRequests, exhausted.StatusCode);
        Assert.Equal(30, exhausted.Headers.RetryAfter?.Delta?.TotalSeconds);
        using (var problem = System.Text.Json.JsonDocument.Parse(await exhausted.Content.ReadAsStringAsync()))
        {
            Assert.Equal("authentication_rate_limited", problem.RootElement.GetProperty("code").GetString());
            Assert.Equal(30, problem.RootElement.GetProperty("retryAfterSeconds").GetInt32());
        }

        await using var verificationScope = factory.Services.CreateAsyncScope();
        var verificationContext = verificationScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await verificationContext.Usuarios.AsNoTracking().SingleAsync(candidate => candidate.Id == 42);
        Assert.Equal(
            PasswordVerificationResult.Success,
            new PasswordHasher<Usuario>().VerifyHashedPassword(user, user.SenhaHash, Password));
        Assert.Equal(1, user.VersaoSessao);
    }

    [Fact]
    public async Task CredentialStoreInfrastructureFailureReturnsUnavailableAndPreservesCredential()
    {
        var credentialService = new Mock<ICredentialService>(MockBehavior.Strict);
        credentialService
            .Setup(service => service.ChangePasswordAsync(
                42,
                Password,
                NewPassword,
                NewPassword,
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException(
                "synthetic wrapper",
                new TimeoutException("synthetic credential store timeout")));

        var scenario = await CreateScenarioAsync(
            requiresPasswordChange: false,
            credentialService: credentialService.Object);
        await using var factory = scenario.Factory;
        using var client = scenario.Client;

        using var unavailable = await ChangePasswordAsync(client, scenario.Cookie, Password);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, unavailable.StatusCode);
        var responseBody = await unavailable.Content.ReadAsStringAsync();
        Assert.DoesNotContain("synthetic", responseBody, StringComparison.OrdinalIgnoreCase);

        await using var verificationScope = factory.Services.CreateAsyncScope();
        var verificationContext = verificationScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await verificationContext.Usuarios.AsNoTracking().SingleAsync(candidate => candidate.Id == 42);
        Assert.Equal(
            PasswordVerificationResult.Success,
            new PasswordHasher<Usuario>().VerifyHashedPassword(user, user.SenhaHash, Password));
        Assert.Equal(1, user.VersaoSessao);
        credentialService.Verify(service => service.ChangePasswordAsync(
            42,
            Password,
            NewPassword,
            NewPassword,
            It.IsAny<CancellationToken>()), Times.Once);
    }

    private async Task<Scenario> CreateScenarioAsync(
        bool requiresPasswordChange,
        bool seedSecondAccount = false,
        int? maxBucketsPerScope = null,
        ICredentialService? credentialService = null)
    {
        var clock = new ControlledTimeProvider(InitialTime);
        var factory = new IntegrationWebApplicationFactory(database, new()
        {
            TimeProvider = clock,
            Configuration = maxBucketsPerScope is int capacity
                ? new Dictionary<string, string?>
                {
                    ["AuthenticationProtection:MaxBucketsPerScope"] =
                        capacity.ToString(CultureInfo.InvariantCulture)
                }
                : new Dictionary<string, string?>(),
            ConfigureServices = services =>
            {
                services.RemoveAll<IAuthenticationThrottleClock>();
                services.AddSingleton<IAuthenticationThrottleClock>(new TimeProviderAuthenticationThrottleClock(clock));
                if (credentialService is not null)
                {
                    services.RemoveAll<ICredentialService>();
                    services.AddSingleton(credentialService);
                }
            }
        });
        await factory.RecreateDatabaseAsync();
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = CreateUser(42, Email, requiresPasswordChange);
            context.Usuarios.Add(user);
            if (seedSecondAccount)
            {
                context.Usuarios.Add(CreateUser(43, OtherEmail, requiresPasswordChange: false));
            }

            await context.SaveChangesAsync();
        }

        var client = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });
        using var login = await client.PostAsJsonAsync("/api/Auth/login", new { email = Email, password = Password });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var cookie = Assert.Single(login.Headers.GetValues("Set-Cookie")).Split(';', 2)[0];
        return new Scenario(factory, client, cookie, clock);
    }

    private static async Task<HttpResponseMessage> ChangePasswordAsync(
        HttpClient client,
        string cookie,
        string currentPassword)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/Auth/change-password")
        {
            Content = JsonContent.Create(new
            {
                currentPassword,
                newPassword = NewPassword,
                confirmation = NewPassword
            })
        };
        request.Headers.Add("Cookie", cookie);
        request.Headers.Add("Origin", BrowserOrigin);
        request.Headers.Add(
            "X-CSRF-Token",
            SessaoCsrfProof.Create(cookie.Split('=', 2)[1]));
        return await client.SendAsync(request);
    }

    private static async Task<string> SignInAsync(HttpClient client, string email, string password)
    {
        using var login = await client.PostAsJsonAsync("/api/Auth/login", new { email, password });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        return Assert.Single(login.Headers.GetValues("Set-Cookie")).Split(';', 2)[0];
    }

    private static async Task<HttpResponseMessage> SendWithCookieAsync(
        HttpClient client,
        HttpMethod method,
        string path,
        string cookie)
    {
        using var request = new HttpRequestMessage(method, path);
        request.Headers.Add("Cookie", cookie);
        return await client.SendAsync(request);
    }

    private static Usuario CreateUser(int id, string email, bool requiresPasswordChange)
    {
        var user = new Usuario
        {
            Id = id,
            NomeCompleto = "Conta sintética para troca de senha",
            Email = email,
            NivelUsuario = NivelUsuario.Comum,
            TipoUsuario = TipoUsuario.Comum,
            Status = StatusUsuario.Habilitado,
            ExigeTrocaSenha = requiresPasswordChange,
            SenhaHash = string.Empty,
            VersaoSessao = 1
        };
        user.SenhaHash = new PasswordHasher<Usuario>().HashPassword(user, Password);
        return user;
    }

    private sealed record Scenario(
        IntegrationWebApplicationFactory Factory,
        HttpClient Client,
        string Cookie,
        ControlledTimeProvider Clock);
}
