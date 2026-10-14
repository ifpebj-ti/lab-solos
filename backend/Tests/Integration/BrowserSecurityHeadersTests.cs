using System.Net;
using System.Text.Json;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSql15IntegrationGroup.Name)]
public sealed class BrowserSecurityHeadersTests(PostgreSql15ContainerFixture database)
{
    private const string AllowedOrigin = "http://localhost:5173";
    private const string OtherOrigin = "https://attacker.example";
    private static readonly string HashSecretPath = Path.Combine(
        Path.GetTempPath(),
        "lab-solos-synthetic-secrets",
        "browser-throttle-key");
    private static readonly string RecoveryKeysPath = Path.Combine(
        Path.GetTempPath(),
        "lab-solos-synthetic-secrets",
        "browser-recovery-keys.json");

    [Fact]
    public async Task DevelopmentPreflightAllowsOnlyConfiguredMethodsAndHeaders()
    {
        await using var factory = CreateDevelopmentFactory();
        await factory.RecreateDatabaseAsync();
        using var client = factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Options, "/api/Usuarios");
        request.Headers.Add("Origin", AllowedOrigin);
        request.Headers.Add("Access-Control-Request-Method", "PATCH");
        request.Headers.Add("Access-Control-Request-Headers", "authorization,content-type");

        using var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(AllowedOrigin, Header(response, "Access-Control-Allow-Origin"));
        Assert.Contains("PATCH", Header(response, "Access-Control-Allow-Methods"));
        Assert.Contains("authorization", Header(response, "Access-Control-Allow-Headers"), StringComparison.OrdinalIgnoreCase);
        Assert.Contains("content-type", Header(response, "Access-Control-Allow-Headers"), StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Origin", response.Headers.Vary);
        Assert.False(response.Headers.Contains("Access-Control-Allow-Credentials"));

        using var rejectedPreflight = new HttpRequestMessage(HttpMethod.Options, "/api/Usuarios");
        rejectedPreflight.Headers.Add("Origin", AllowedOrigin);
        rejectedPreflight.Headers.Add("Access-Control-Request-Method", "TRACE");
        rejectedPreflight.Headers.Add("Access-Control-Request-Headers", "x-admin");
        using var rejectedResponse = await client.SendAsync(rejectedPreflight);

        Assert.Equal(HttpStatusCode.NoContent, rejectedResponse.StatusCode);
        Assert.DoesNotContain("TRACE", OptionalHeader(rejectedResponse, "Access-Control-Allow-Methods"), StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("x-admin", OptionalHeader(rejectedResponse, "Access-Control-Allow-Headers"), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task DevelopmentResponsesVaryByOriginExposeRetryAfterAndKeepAuthenticationRequired()
    {
        await using var factory = CreateDevelopmentFactory();
        await factory.RecreateDatabaseAsync();
        using var client = factory.CreateClient();

        using var allowedRequest = new HttpRequestMessage(HttpMethod.Get, "/api/Usuarios");
        allowedRequest.Headers.Add("Origin", AllowedOrigin);
        using var allowedResponse = await client.SendAsync(allowedRequest);

        Assert.Equal(HttpStatusCode.Unauthorized, allowedResponse.StatusCode);
        Assert.Equal(AllowedOrigin, Header(allowedResponse, "Access-Control-Allow-Origin"));
        Assert.Contains("Retry-After", Header(allowedResponse, "Access-Control-Expose-Headers"));
        Assert.Contains("Origin", allowedResponse.Headers.Vary);
        Assert.False(allowedResponse.Headers.Contains("Access-Control-Allow-Credentials"));

        using var rejectedOriginRequest = new HttpRequestMessage(HttpMethod.Get, "/api/Usuarios");
        rejectedOriginRequest.Headers.Add("Origin", OtherOrigin);
        using var rejectedOriginResponse = await client.SendAsync(rejectedOriginRequest);
        Assert.Equal(HttpStatusCode.Unauthorized, rejectedOriginResponse.StatusCode);
        Assert.False(rejectedOriginResponse.Headers.Contains("Access-Control-Allow-Origin"));

        using var nullOriginRequest = new HttpRequestMessage(HttpMethod.Get, "/api/Usuarios");
        nullOriginRequest.Headers.Add("Origin", "null");
        using var nullOriginResponse = await client.SendAsync(nullOriginRequest);
        Assert.Equal(HttpStatusCode.Unauthorized, nullOriginResponse.StatusCode);
        Assert.False(nullOriginResponse.Headers.Contains("Access-Control-Allow-Origin"));

        using var requestWithoutOrigin = new HttpRequestMessage(HttpMethod.Get, "/api/Usuarios");
        using var responseWithoutOrigin = await client.SendAsync(requestWithoutOrigin);
        Assert.Equal(HttpStatusCode.Unauthorized, responseWithoutOrigin.StatusCode);
        Assert.False(responseWithoutOrigin.Headers.Contains("Access-Control-Allow-Origin"));
    }

    [Fact]
    public async Task ProductionDoesNotGrantCorsEvenWhenDevelopmentOriginsAreConfigured()
    {
        await using var factory = new IntegrationWebApplicationFactory(database, new IntegrationApplicationOptions
        {
            EnvironmentName = "Production",
            Configuration = DevelopmentCorsConfiguration(),
            ConfigureServices = ConfigureSyntheticSecrets
        });
        await factory.RecreateDatabaseAsync();
        using var client = factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, "/health");
        request.Headers.Add("Origin", AllowedOrigin);

        using var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }

    [Theory]
    [InlineData("null")]
    [InlineData("*")]
    [InlineData("http://localhost:5173/path")]
    [InlineData("http://user@localhost:5173")]
    public void DevelopmentRejectsNonExactCorsOriginConfiguration(string origin)
    {
        using var factory = new IntegrationWebApplicationFactory(database, new IntegrationApplicationOptions
        {
            EnvironmentName = "Development",
            Configuration = WithCorsOrigin(origin),
            ConfigureServices = ConfigureSyntheticSecrets
        });

        Assert.Throws<InvalidOperationException>(() => factory.CreateClient());
    }

    private IntegrationWebApplicationFactory CreateDevelopmentFactory() =>
        new(database, new IntegrationApplicationOptions
        {
            EnvironmentName = "Development",
            Configuration = DevelopmentCorsConfiguration(),
            ConfigureServices = ConfigureSyntheticSecrets
        });

    private static Dictionary<string, string?> DevelopmentCorsConfiguration() =>
        new Dictionary<string, string?>
        {
            ["AuthenticationProtection:Cors:DevelopmentOrigins:0"] = AllowedOrigin,
            ["AuthenticationProtection:KeyHashSecretFile"] = HashSecretPath,
            ["AuthenticationProtection:RecoveryEncryptionKeysFile"] = RecoveryKeysPath,
            ["AuthenticationProtection:ForwardedHeaders:KnownProxies:0"] = "10.20.0.5",
            ["Seed:AdminEmail"] = "t013-admin@integration.test",
            ["Seed:AdminPassword"] = "T013-Admin-Synthetic-2026!"
        };

    private static Dictionary<string, string?> WithCorsOrigin(string origin)
    {
        var configuration = DevelopmentCorsConfiguration();
        configuration["AuthenticationProtection:Cors:DevelopmentOrigins:0"] = origin;
        return configuration;
    }

    private static void ConfigureSyntheticSecrets(IServiceCollection services)
    {
        services.RemoveAll<ISecretFileReader>();
        services.AddSingleton<ISecretFileReader, SyntheticSecretFileReader>();
    }

    private sealed class SyntheticSecretFileReader : ISecretFileReader
    {
        private readonly byte[] _hashKey = Enumerable.Range(1, 32).Select(value => (byte)value).ToArray();
        private readonly byte[] _recoveryKeys = JsonSerializer.SerializeToUtf8Bytes(new
        {
            activeKeyId = "browser-key",
            keys = new Dictionary<string, string>
            {
                ["browser-key"] = Convert.ToBase64String(Enumerable.Repeat((byte)4, 32).ToArray())
            }
        });

        public byte[] ReadAllBytes(string path)
        {
            if (string.Equals(path, HashSecretPath, StringComparison.Ordinal))
            {
                return _hashKey.ToArray();
            }

            if (string.Equals(path, RecoveryKeysPath, StringComparison.Ordinal))
            {
                return _recoveryKeys.ToArray();
            }

            throw new FileNotFoundException("Synthetic secret file is unavailable.");
        }
    }

    private static string Header(HttpResponseMessage response, string name)
    {
        Assert.True(response.Headers.TryGetValues(name, out var values), $"Expected response header {name}.");
        return string.Join(",", values!);
    }

    private static string OptionalHeader(HttpResponseMessage response, string name) =>
        response.Headers.TryGetValues(name, out var values)
            ? string.Join(",", values)
            : string.Empty;
}
