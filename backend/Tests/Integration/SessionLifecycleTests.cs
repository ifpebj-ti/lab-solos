using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class SessionLifecycleTests(PostgreSqlContainerFixture database)
{
    private const string Email = "session-lifecycle@example.test";
    private const string Password = "Synthetic session password! 2026";
    private const string CookieName = "lab_solos_session";

    [Fact]
    public async Task LoginIssuesOpaqueSessionAndLogoutRevokesItIdempotently()
    {
        var clock = new ControlledTimeProvider(new DateTimeOffset(2026, 11, 19, 12, 0, 0, TimeSpan.Zero));
        await using var factory = new IntegrationWebApplicationFactory(database, new()
        {
            TimeProvider = clock,
            Configuration = new Dictionary<string, string?>
            {
                ["Jwt:ExpiresInMinutes"] = "600"
            }
        });
        await factory.RecreateDatabaseAsync();
        await SeedUserAsync(factory);

        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });
        var login = await client.PostAsJsonAsync("/api/Auth/login", new { email = Email, password = Password });

        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var setCookie = Assert.Single(login.Headers.GetValues("Set-Cookie"));
        Assert.StartsWith($"{CookieName}=", setCookie, StringComparison.Ordinal);
        var cookie = setCookie.Split(';', 2)[0];
        var opaqueValue = cookie[(CookieName.Length + 1)..];
        Assert.False(string.IsNullOrWhiteSpace(opaqueValue));
        Assert.DoesNotContain(".", opaqueValue, StringComparison.Ordinal);

        string csrfToken;
        using (var state = await SendWithCookieAsync(client, HttpMethod.Get, "/api/Auth/session", cookie))
        {
            Assert.Equal(HttpStatusCode.OK, state.StatusCode);
            using var profile = JsonDocument.Parse(await state.Content.ReadAsStringAsync());
            Assert.Equal(42, profile.RootElement.GetProperty("userId").GetInt32());
            Assert.Equal("Comum", profile.RootElement.GetProperty("role").GetString());
            csrfToken = profile.RootElement.GetProperty("csrfToken").GetString()!;
        }

        using (var logout = await SendWithCookieAsync(client, HttpMethod.Post, "/api/Auth/logout", cookie, csrfToken))
        {
            Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);
        }

        using (var afterLogout = await SendWithCookieAsync(client, HttpMethod.Get, "/api/Auth/session", cookie))
        {
            Assert.Equal(HttpStatusCode.Unauthorized, afterLogout.StatusCode);
        }

        using var repeatedLogout = await SendWithCookieAsync(client, HttpMethod.Post, "/api/Auth/logout", cookie);
        Assert.Equal(HttpStatusCode.NoContent, repeatedLogout.StatusCode);
    }

    [Fact]
    public async Task SessionExpiresAtTheIdleBoundaryAndCannotBeRenewed()
    {
        var scenario = await CreateLoggedInAsync();
        await using var factory = scenario.Factory;
        using var client = scenario.Client;
        scenario.Clock.Advance(TimeSpan.FromMinutes(60));

        using (var state = await SendWithCookieAsync(client, HttpMethod.Get, "/api/Auth/session", scenario.Cookie))
        {
            Assert.Equal(HttpStatusCode.Unauthorized, state.StatusCode);
        }

        using var renewal = await SendWithCookieAsync(client, HttpMethod.Post, "/api/Auth/renew", scenario.Cookie, scenario.CsrfToken);
        Assert.Equal(HttpStatusCode.Unauthorized, renewal.StatusCode);
    }

    [Fact]
    public async Task RenewalBeforeIdleExpiryRotatesTheOpaqueIdentifierAndPreservesAbsoluteExpiry()
    {
        var scenario = await CreateLoggedInAsync();
        await using var factory = scenario.Factory;
        using var client = scenario.Client;
        scenario.Clock.Advance(TimeSpan.FromMinutes(59));

        using var renewal = await SendWithCookieAsync(client, HttpMethod.Post, "/api/Auth/renew", scenario.Cookie, scenario.CsrfToken);

        Assert.Equal(HttpStatusCode.NoContent, renewal.StatusCode);
        var replacementHeader = Assert.Single(renewal.Headers.GetValues("Set-Cookie"));
        var replacementCookie = replacementHeader.Split(';', 2)[0];
        var renewedCsrfToken = await ReadCsrfTokenAsync(client, replacementCookie);
        Assert.NotEqual(scenario.Cookie, replacementCookie);

        using (var oldSession = await SendWithCookieAsync(client, HttpMethod.Get, "/api/Auth/session", scenario.Cookie))
        {
            Assert.Equal(HttpStatusCode.Unauthorized, oldSession.StatusCode);
        }

        using (var renewedSession = await SendWithCookieAsync(
                   client, HttpMethod.Get, "/api/Auth/session", replacementCookie))
        {
            Assert.Equal(HttpStatusCode.OK, renewedSession.StatusCode);
        }

        for (var activeWindow = 0; activeWindow < 7; activeWindow++)
        {
            scenario.Clock.Advance(TimeSpan.FromMinutes(59));
            using var active = await SendWithCookieAsync(
                client, HttpMethod.Get, "/api/Auth/session", replacementCookie);
            Assert.Equal(HttpStatusCode.OK, active.StatusCode);
        }

        scenario.Clock.Advance(TimeSpan.FromMinutes(8));
        using var absoluteExpiry = await SendWithCookieAsync(
            client, HttpMethod.Post, "/api/Auth/renew", replacementCookie, renewedCsrfToken);
        Assert.Equal(HttpStatusCode.Unauthorized, absoluteExpiry.StatusCode);
    }

    [Fact]
    public async Task SessionReadsCurrentRoleAndRejectsDisabledOrVersionChangedAccounts()
    {
        var scenario = await CreateLoggedInAsync();
        await using var factory = scenario.Factory;
        using var client = scenario.Client;

        await UpdateUserAsync(factory, user => user.NivelUsuario = LabSolos_Server_DotNet8.Enums.NivelUsuario.Mentor);
        using (var updatedRole = await SendWithCookieAsync(client, HttpMethod.Get, "/api/Auth/session", scenario.Cookie))
        {
            Assert.Equal(HttpStatusCode.OK, updatedRole.StatusCode);
            using var profile = JsonDocument.Parse(await updatedRole.Content.ReadAsStringAsync());
            Assert.Equal("Mentor", profile.RootElement.GetProperty("role").GetString());
        }

        await UpdateUserAsync(factory, user => user.VersaoSessao++);
        using (var changedVersion = await SendWithCookieAsync(client, HttpMethod.Get, "/api/Auth/session", scenario.Cookie))
        {
            Assert.Equal(HttpStatusCode.Unauthorized, changedVersion.StatusCode);
        }

        // A newly issued session for the same account also stops working when its access is disabled.
        var enabledAgain = await CreateLoggedInAsync(factory, scenario.Clock);
        await UpdateUserAsync(factory, user => user.Status = LabSolos_Server_DotNet8.Enums.StatusUsuario.Desabilitado);
        using var disabled = await SendWithCookieAsync(
            enabledAgain.Client, HttpMethod.Get, "/api/Auth/session", enabledAgain.Cookie);
        Assert.Equal(HttpStatusCode.Unauthorized, disabled.StatusCode);
        enabledAgain.Client.Dispose();
    }

    [Fact]
    public async Task SessionStoreFailureReturnsTransientUnavailableInsteadOfConfirmingLogout()
    {
        var scenario = await CreateLoggedInAsync();
        await using var factory = scenario.Factory;
        using var client = scenario.Client;
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await context.Database.ExecuteSqlRawAsync("DROP TABLE \"SessoesAutenticacao\" CASCADE");
        }

        using (var state = await SendWithCookieAsync(client, HttpMethod.Get, "/api/Auth/session", scenario.Cookie))
        {
            Assert.Equal(HttpStatusCode.ServiceUnavailable, state.StatusCode);
        }

        using var logout = await SendWithCookieAsync(client, HttpMethod.Post, "/api/Auth/logout", scenario.Cookie, scenario.CsrfToken);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, logout.StatusCode);
    }

    private static async Task SeedUserAsync(IntegrationWebApplicationFactory factory)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = JwtSessionVersionTests.CreateUser();
        user.Email = Email;
        user.SenhaHash = new PasswordHasher<Usuario>().HashPassword(user, Password);
        context.Usuarios.Add(user);
        await context.SaveChangesAsync();
    }

    private async Task<(IntegrationWebApplicationFactory Factory, HttpClient Client, ControlledTimeProvider Clock, string Cookie, string CsrfToken)>
        CreateLoggedInAsync()
    {
        var clock = new ControlledTimeProvider(new DateTimeOffset(2026, 11, 19, 12, 0, 0, TimeSpan.Zero));
        var factory = new IntegrationWebApplicationFactory(database, new()
        {
            TimeProvider = clock,
            Configuration = new Dictionary<string, string?>
            {
                ["Jwt:ExpiresInMinutes"] = "600"
            }
        });
        await factory.RecreateDatabaseAsync();
        await SeedUserAsync(factory);
        return await CreateLoggedInAsync(factory, clock);
    }

    private static async Task<(IntegrationWebApplicationFactory Factory, HttpClient Client, ControlledTimeProvider Clock, string Cookie, string CsrfToken)>
        CreateLoggedInAsync(IntegrationWebApplicationFactory factory, ControlledTimeProvider clock)
    {
        var client = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });
        var login = await client.PostAsJsonAsync("/api/Auth/login", new { email = Email, password = Password });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var setCookie = Assert.Single(login.Headers.GetValues("Set-Cookie"));
        var cookie = setCookie.Split(';', 2)[0];
        login.Dispose();
        var csrfToken = await ReadCsrfTokenAsync(client, cookie);
        return (factory, client, clock, cookie, csrfToken);
    }

    private static async Task UpdateUserAsync(IntegrationWebApplicationFactory factory, Action<Usuario> update)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await context.Usuarios.SingleAsync(candidate => candidate.Id == 42);
        update(user);
        await context.SaveChangesAsync();
    }

    private static async Task<HttpResponseMessage> SendWithCookieAsync(
        HttpClient client,
        HttpMethod method,
        string path,
        string cookie,
        string? csrfToken = null)
    {
        using var request = new HttpRequestMessage(method, path);
        request.Headers.Add("Cookie", cookie);
        if (method != HttpMethod.Get)
        {
            request.Headers.Add("Origin", "http://localhost");
            if (csrfToken is not null)
                request.Headers.Add("X-CSRF-Token", csrfToken);
        }
        return await client.SendAsync(request);
    }

    private static async Task<string> ReadCsrfTokenAsync(HttpClient client, string cookie)
    {
        using var session = await SendWithCookieAsync(client, HttpMethod.Get, "/api/Auth/session", cookie);
        Assert.Equal(HttpStatusCode.OK, session.StatusCode);
        using var payload = JsonDocument.Parse(await session.Content.ReadAsStringAsync());
        return payload.RootElement.GetProperty("csrfToken").GetString()!;
    }
}
