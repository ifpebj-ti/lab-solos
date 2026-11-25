using System.Net;
using System.Net.Http.Headers;
using System.IdentityModel.Tokens.Jwt;
using System.Text.Json;
using LabSolos_Server_DotNet8.Data.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.Metadata;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using LabSolos_Server_DotNet8.Services;
using LabSolos_Server_DotNet8.Services.Security;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class AuthorizationRouteMatrixTests(PostgreSqlContainerFixture database)
{
    [Fact]
    public async Task UnannotatedSystemQuantitiesRequiresAuthenticationByFallbackPolicy()
    {
        await using var factory = new IntegrationWebApplicationFactory(database);
        await factory.RecreateDatabaseAsync();

        using var client = factory.CreateClient();
        using var response = await client.GetAsync("/api/System/quantities");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task FallbackPolicyUsesTheRestrictedSessionDefault()
    {
        await using var factory = new IntegrationWebApplicationFactory(database);
        await factory.RecreateDatabaseAsync();

        var options = factory.Services.GetRequiredService<IOptions<AuthorizationOptions>>().Value;

        Assert.NotNull(options.FallbackPolicy);
        Assert.Equal(
            options.DefaultPolicy.Requirements.Select(requirement => requirement.GetType()),
            options.FallbackPolicy.Requirements.Select(requirement => requirement.GetType()));
        Assert.Null(options.GetPolicy("ApenasDependentes"));
    }

    [Fact]
    public async Task PublicAndInternalHealthExceptionsAreExplicitInEndpointMetadata()
    {
        await using var factory = new IntegrationWebApplicationFactory(database);
        await factory.RecreateDatabaseAsync();

        var approvedAnonymousRoutes = new (string Route, string Method)[]
        {
            ("/api/Auth/login", "POST"),
            ("/api/Usuarios", "POST"),
            ("/api/Email/request-password-reset", "POST"),
            ("/api/Email/solicitar-redefinicao", "POST"),
            ("/api/Email/reset-password", "POST"),
            ("/api/Email/redefinir-senha", "POST"),
            ("/api/System/health", "GET")
        };

        foreach (var (route, method) in approvedAnonymousRoutes)
        {
            var endpoint = GetEndpoint(factory, route, method);
            Assert.NotNull(endpoint.Metadata.GetMetadata<IAllowAnonymous>());
        }
    }

    [Fact]
    public async Task GenericEmailEndpointRequiresAdministratorPolicy()
    {
        await using var factory = new IntegrationWebApplicationFactory(database);
        await factory.RecreateDatabaseAsync();

        var endpoint = GetEndpoint(factory, "/api/Email/enviar", "POST");
        var authorization = endpoint.Metadata.GetOrderedMetadata<IAuthorizeData>();

        Assert.Contains(authorization, metadata => metadata.Policy == "ApenasAdministradores");
    }

    [Fact]
    public async Task AnonymousContainerHealthProbeRemainsAvailable()
    {
        await using var factory = new IntegrationWebApplicationFactory(database);
        await factory.RecreateDatabaseAsync();

        using var client = factory.CreateClient();
        using var response = await client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task ProductionSwaggerSurfaceIsNotPublished()
    {
        await using var factory = new IntegrationWebApplicationFactory(database, new()
        {
            EnvironmentName = "Production",
            Configuration = new Dictionary<string, string?>
            {
                ["AuthenticationProtection:KeyHashSecretFile"] = SyntheticHashSecretPath,
                ["AuthenticationProtection:RecoveryEncryptionKeysFile"] = SyntheticRecoveryKeysPath,
                ["AuthenticationProtection:ForwardedHeaders:KnownProxies:0"] = "10.20.0.5",
                ["Seed:AdminEmail"] = "t006-swagger-admin@example.test",
                ["Seed:AdminPassword"] = "synthetic-t006-admin-password-2026!"
            },
            ConfigureServices = services =>
            {
                services.RemoveAll<ISecretFileReader>();
                services.AddSingleton<ISecretFileReader, SyntheticSecretFileReader>();
            }
        });
        await factory.RecreateDatabaseAsync();

        string productionToken;
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var administrator = await context.Usuarios.SingleAsync();
            administrator.ExigeTrocaSenha = false;
            await context.SaveChangesAsync();

            productionToken = scope.ServiceProvider.GetRequiredService<JwtService>()
                .GenerateToken(administrator);
            var jwtId = new JwtSecurityTokenHandler().ReadJwtToken(productionToken).Id;
            await scope.ServiceProvider.GetRequiredService<ISessaoService>().CriarAsync(
                administrator.Id,
                administrator.VersaoSessao,
                jwtId,
                CancellationToken.None);
        }

        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer", productionToken);
        using var response = await client.GetAsync("/swagger/v1/swagger.json");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private static RouteEndpoint GetEndpoint(
        IntegrationWebApplicationFactory factory,
        string route,
        string method)
    {
        var endpoints = factory.Services.GetServices<EndpointDataSource>()
            .SelectMany(source => source.Endpoints)
            .OfType<RouteEndpoint>();

        var matches = endpoints.Where(endpoint =>
            string.Equals(endpoint.RoutePattern.RawText?.TrimStart('/'), route.TrimStart('/'), StringComparison.OrdinalIgnoreCase)
            && endpoint.Metadata.GetMetadata<HttpMethodMetadata>()?.HttpMethods.Contains(method) == true).ToArray();
        Assert.True(matches.Length == 1, $"Expected one {method} {route} endpoint, found {matches.Length}.");
        return Assert.Single(matches);
    }

    private static readonly string SyntheticHashSecretPath = Path.Join(
        Path.GetTempPath(), "lab-solos-t006-swagger", "hash-key");
    private static readonly string SyntheticRecoveryKeysPath = Path.Join(
        Path.GetTempPath(), "lab-solos-t006-swagger", "recovery-keys.json");

    private sealed class SyntheticSecretFileReader : ISecretFileReader
    {
        private readonly byte[] hashKey = Enumerable.Range(1, 32).Select(value => (byte)value).ToArray();
        private readonly byte[] recoveryKeys = JsonSerializer.SerializeToUtf8Bytes(new
        {
            activeKeyId = "t006-key",
            keys = new Dictionary<string, string>
            {
                ["t006-key"] = Convert.ToBase64String(Enumerable.Repeat((byte)3, 32).ToArray())
            }
        });

        public byte[] ReadAllBytes(string path)
        {
            if (string.Equals(path, SyntheticHashSecretPath, StringComparison.Ordinal))
                return hashKey.ToArray();
            if (string.Equals(path, SyntheticRecoveryKeysPath, StringComparison.Ordinal))
                return recoveryKeys.ToArray();
            throw new FileNotFoundException("Synthetic secret file is unavailable.");
        }
    }
}
