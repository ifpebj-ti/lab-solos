using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class ApiPublicationMatrixTests(PostgreSqlContainerFixture database)
{
    [Fact]
    public async Task ProductIndicatorsAreMinimalAndAvailableToEveryAuthenticatedProfile()
    {
        var (factory, scenario) = await SeedScenarioAsync("api-publication-product-indicators");
        await using var ownedFactory = factory;

        using (var anonymousClient = factory.CreateClient())
        using (var anonymousResponse = await anonymousClient.GetAsync("/api/System/quantities"))
        {
            Assert.Equal(HttpStatusCode.Unauthorized, anonymousResponse.StatusCode);
        }

        var profiles = new[]
        {
            (scenario.AdministratorEmail, scenario.AdministratorPassword),
            (scenario.ResponsibleEmail, scenario.ResponsiblePassword),
            (scenario.BorrowerEmail, scenario.BorrowerPassword)
        };

        foreach (var (email, password) in profiles)
        {
            using var client = await CreateAuthenticatedClientAsync(factory, email, password);
            using var response = await client.GetAsync("/api/System/quantities");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var root = document.RootElement;
            Assert.Equal(1, root.EnumerateObject().Count());

            var products = root.GetProperty("produtos");
            Assert.Equal(2, products.EnumerateObject().Count());
            Assert.Equal(1, products.GetProperty("Outro").GetInt32());
            Assert.Equal(1, products.GetProperty("Total").GetInt32());
        }
    }

    [Fact]
    public async Task VersionedDeploymentHealthSeparatesStateAndVersion()
    {
        await using var factory = new IntegrationWebApplicationFactory(database);
        await factory.RecreateDatabaseAsync();
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/api/System/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = document.RootElement;
        Assert.Equal(2, root.EnumerateObject().Count());
        Assert.Equal("healthy", root.GetProperty("status").GetString());
        Assert.False(string.IsNullOrWhiteSpace(root.GetProperty("version").GetString()));
    }

    private async Task<(IntegrationWebApplicationFactory Factory, CriticalScenarioData Scenario)> SeedScenarioAsync(
        string scenarioKey)
    {
        var scenario = CriticalScenarioData.Create(scenarioKey);
        var factory = new IntegrationWebApplicationFactory(database);
        await factory.RecreateDatabaseAsync();

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<Usuario>>();
        await scenario.PersistAsync(context, passwordHasher, TimeProvider.System);
        return (factory, scenario);
    }

    private static async Task<HttpClient> CreateAuthenticatedClientAsync(
        IntegrationWebApplicationFactory factory,
        string email,
        string password)
    {
        var client = factory.CreateClient();
        using var response = await client.PostAsJsonAsync("/api/Auth/login", new { email, password });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var token = document.RootElement.GetProperty("token").GetString();
        Assert.False(string.IsNullOrWhiteSpace(token));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }
}
