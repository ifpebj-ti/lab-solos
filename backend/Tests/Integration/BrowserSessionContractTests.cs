using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using LabSolos_Server_DotNet8.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class BrowserSessionContractTests(PostgreSqlContainerFixture database)
{
    private const string Email = "browser-session@example.test";
    private const string Password = "Synthetic browser session password! 2026";
    private const string CookieName = "lab_solos_session";
    private const string AllowedOrigin = "https://localhost";

    [Fact]
    public async Task LoginUsesAnOpaqueHttpOnlyCookieAndSessionReturnsOnlyMinimalContext()
    {
        var scenario = await CreateLoggedInAsync();
        await using var factory = scenario.Factory;
        using var client = scenario.Client;

        var cookieHeader = Assert.Single(scenario.Login.Headers.GetValues("Set-Cookie"));
        Assert.StartsWith($"{CookieName}=", cookieHeader, StringComparison.Ordinal);
        Assert.Contains("httponly", cookieHeader, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("secure", cookieHeader, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=lax", cookieHeader, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("path=/", cookieHeader, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("domain=", cookieHeader, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("token", scenario.LoginPayload.RootElement.EnumerateObject()
            .Select(property => property.Name), StringComparer.OrdinalIgnoreCase);

        using var session = await SendWithCookieAsync(
            client,
            HttpMethod.Get,
            "/api/Auth/session",
            scenario.Cookie);
        Assert.Equal(HttpStatusCode.OK, session.StatusCode);
        using var payload = JsonDocument.Parse(await session.Content.ReadAsStringAsync());
        Assert.Equal(42, payload.RootElement.GetProperty("userId").GetInt32());
        Assert.Equal("Comum", payload.RootElement.GetProperty("role").GetString());
        Assert.True(payload.RootElement.TryGetProperty("csrfToken", out var csrfToken));
        Assert.False(string.IsNullOrWhiteSpace(csrfToken.GetString()));
        Assert.DoesNotContain("email", payload.RootElement.EnumerateObject()
            .Select(property => property.Name), StringComparer.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CookieMutationsRequireTheSessionBoundCsrfTokenAndAnAllowedOrigin()
    {
        var scenario = await CreateLoggedInAsync();
        await using var factory = scenario.Factory;
        using var client = scenario.Client;
        var csrfToken = await ReadCsrfTokenAsync(client, scenario.Cookie);

        using (var missingOrigin = await SendWithCookieAsync(
                   client,
                   HttpMethod.Post,
                   "/api/Auth/logout",
                   scenario.Cookie,
                   csrfToken: csrfToken))
        {
            Assert.Equal(HttpStatusCode.Forbidden, missingOrigin.StatusCode);
        }

        using (var foreignOrigin = await SendWithCookieAsync(
                   client,
                   HttpMethod.Post,
                   "/api/Auth/logout",
                   scenario.Cookie,
                   origin: "https://attacker.example",
                   csrfToken: csrfToken))
        {
            Assert.Equal(HttpStatusCode.Forbidden, foreignOrigin.StatusCode);
        }

        using (var missingToken = await SendWithCookieAsync(
                   client,
                   HttpMethod.Post,
                   "/api/Auth/logout",
                   scenario.Cookie,
                   origin: AllowedOrigin))
        {
            Assert.Equal(HttpStatusCode.Forbidden, missingToken.StatusCode);
        }

        using (var invalidToken = await SendWithCookieAsync(
                   client,
                   HttpMethod.Post,
                   "/api/Auth/logout",
                   scenario.Cookie,
                   origin: AllowedOrigin,
                   csrfToken: "invalid-csrf-proof"))
        {
            Assert.Equal(HttpStatusCode.Forbidden, invalidToken.StatusCode);
        }

        using (var logout = await SendWithCookieAsync(
                   client,
                   HttpMethod.Post,
                   "/api/Auth/logout",
                   scenario.Cookie,
                   origin: AllowedOrigin,
                   csrfToken: csrfToken))
        {
            Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);
        }

        using var expired = await SendWithCookieAsync(
            client,
            HttpMethod.Get,
            "/api/Auth/session",
            scenario.Cookie);
        Assert.Equal(HttpStatusCode.Unauthorized, expired.StatusCode);
    }

    private async Task<(IntegrationWebApplicationFactory Factory, HttpClient Client, HttpResponseMessage Login,
        JsonDocument LoginPayload, string Cookie)> CreateLoggedInAsync()
    {
        var factory = new IntegrationWebApplicationFactory(database);
        await factory.RecreateDatabaseAsync();
        await SeedUserAsync(factory);

        var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri(AllowedOrigin),
            HandleCookies = false
        });
        using var loginRequest = new HttpRequestMessage(HttpMethod.Post, "/api/Auth/login")
        {
            Content = JsonContent.Create(new { email = Email, password = Password })
        };
        loginRequest.Headers.Add("Origin", AllowedOrigin);
        var login = await client.SendAsync(loginRequest);
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var cookie = Assert.Single(login.Headers.GetValues("Set-Cookie")).Split(';', 2)[0];
        var loginPayload = JsonDocument.Parse(await login.Content.ReadAsStringAsync());
        return (factory, client, login, loginPayload, cookie);
    }

    private static async Task SeedUserAsync(IntegrationWebApplicationFactory factory)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<LabSolos_Server_DotNet8.Data.Context.AppDbContext>();
        var user = JwtSessionVersionTests.CreateUser();
        user.Email = Email;
        user.SenhaHash = new PasswordHasher<Usuario>().HashPassword(user, Password);
        context.Usuarios.Add(user);
        await context.SaveChangesAsync();
    }

    private static async Task<string> ReadCsrfTokenAsync(HttpClient client, string cookie)
    {
        using var session = await SendWithCookieAsync(client, HttpMethod.Get, "/api/Auth/session", cookie);
        Assert.Equal(HttpStatusCode.OK, session.StatusCode);
        using var payload = JsonDocument.Parse(await session.Content.ReadAsStringAsync());
        return payload.RootElement.GetProperty("csrfToken").GetString()!;
    }

    private static async Task<HttpResponseMessage> SendWithCookieAsync(
        HttpClient client,
        HttpMethod method,
        string path,
        string cookie,
        string? origin = null,
        string? csrfToken = null)
    {
        using var request = new HttpRequestMessage(method, path);
        request.Headers.Add("Cookie", cookie);
        if (origin is not null)
            request.Headers.Add("Origin", origin);
        if (csrfToken is not null)
            request.Headers.Add("X-CSRF-Token", csrfToken);
        return await client.SendAsync(request);
    }
}
