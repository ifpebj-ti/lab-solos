using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using LabSolos_Server_DotNet8.Data.Context;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class CriticalLoanCreationTests(PostgreSqlContainerFixture database)
{
    [Fact]
    public async Task EnabledUserCreatesLoanWithSessionIdentityAndPersistedProducts()
    {
        var seeded = await SeedScenarioAsync("loan-creation-success");
        await using var factory = seeded.Factory;
        var scenario = seeded.Scenario;

        using var client = factory.CreateClient();
        var token = await LoginAndGetTokenAsync(
            client,
            scenario.BorrowerEmail,
            scenario.BorrowerPassword);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var loansBefore = await CountLoansAsync(factory);
        using var createResponse = await client.PostAsJsonAsync(
            "/api/Emprestimos",
            new
            {
                solicitanteId = scenario.AdministratorId,
                diasParaDevolucao = 14,
                produtos = new[]
                {
                    new
                    {
                        produtoId = scenario.ProductId,
                        quantidade = 3
                    }
                }
            });

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await ReadJsonAsync(createResponse);
        var loanId = created.GetProperty("id").GetInt32();
        Assert.True(loanId > 0);
        AssertLoanPayload(created, loanId, scenario.BorrowerId, scenario.ProductId, 3);

        using var queryClient = factory.CreateClient();
        queryClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);
        using var queryResponse = await queryClient.GetAsync($"/api/Emprestimos/{loanId}");

        Assert.Equal(HttpStatusCode.OK, queryResponse.StatusCode);
        var persisted = await ReadJsonAsync(queryResponse);
        AssertLoanPayload(persisted, loanId, scenario.BorrowerId, scenario.ProductId, 3);
        Assert.Equal(loansBefore + 1, await CountLoansAsync(factory));
    }

    [Fact]
    public async Task AnonymousUserIsRejectedWithoutCreatingLoan()
    {
        var seeded = await SeedScenarioAsync("loan-creation-anonymous");
        await using var factory = seeded.Factory;

        var loansBefore = await CountLoansAsync(factory);
        using var client = factory.CreateClient();
        using var response = await client.PostAsJsonAsync(
            "/api/Emprestimos",
            CreateLoanRequest(seeded.Scenario.ProductId));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal(loansBefore, await CountLoansAsync(factory));
    }

    [Fact]
    public async Task AdministratorSessionKeepsLegacyUnauthorizedResponseWithoutCreatingLoan()
    {
        var seeded = await SeedScenarioAsync("loan-creation-administrator");
        await using var factory = seeded.Factory;
        var scenario = seeded.Scenario;

        using var client = factory.CreateClient();
        var token = await LoginAndGetTokenAsync(
            client,
            scenario.AdministratorEmail,
            scenario.AdministratorPassword);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var loansBefore = await CountLoansAsync(factory);
        using var response = await client.PostAsJsonAsync(
            "/api/Emprestimos",
            CreateLoanRequest(scenario.ProductId));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal(loansBefore, await CountLoansAsync(factory));
    }

    private async Task<(IntegrationWebApplicationFactory Factory, CriticalScenarioData Scenario)> SeedScenarioAsync(
        string scenarioKey)
    {
        var scenario = CriticalScenarioData.Create(scenarioKey);
        var clock = new ControlledTimeProvider(ScenarioNow);
        var factory = new IntegrationWebApplicationFactory(
            database,
            new IntegrationApplicationOptions
            {
                EnvironmentName = "IntegrationTesting",
                TimeProvider = clock
            });
        await factory.RecreateDatabaseAsync();

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var passwordHasher = scope.ServiceProvider
            .GetRequiredService<IPasswordHasher<LabSolos_Server_DotNet8.Models.Usuario>>();
        await scenario.PersistAsync(context, passwordHasher, clock);

        return (factory, scenario);
    }

    private static object CreateLoanRequest(int productId) => new
    {
        diasParaDevolucao = 14,
        produtos = new[]
        {
            new
            {
                produtoId = productId,
                quantidade = 3
            }
        }
    };

    private static async Task<string> LoginAndGetTokenAsync(
        HttpClient client,
        string email,
        string password)
    {
        using var response = await client.PostAsJsonAsync(
            "/api/Auth/login",
            new { email, password });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await ReadJsonAsync(response);
        return payload.GetProperty("token").GetString()!;
    }

    private static async Task<int> CountLoansAsync(IntegrationWebApplicationFactory factory)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await context.Emprestimos.CountAsync();
    }

    private static void AssertLoanPayload(
        JsonElement payload,
        int expectedLoanId,
        int expectedBorrowerId,
        int expectedProductId,
        int expectedQuantity)
    {
        Assert.Equal(expectedLoanId, payload.GetProperty("id").GetInt32());
        Assert.Equal("Pendente", payload.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.String, payload.GetProperty("dataRealizacao").ValueKind);
        Assert.Equal(JsonValueKind.String, payload.GetProperty("dataPrevistaDevolucao").ValueKind);
        Assert.Equal(JsonValueKind.Null, payload.GetProperty("dataDevolucao").ValueKind);
        Assert.Equal(
            expectedBorrowerId,
            payload.GetProperty("solicitante").GetProperty("id").GetInt32());

        var product = Assert.Single(payload.GetProperty("produtos").EnumerateArray());
        Assert.Equal(
            expectedProductId,
            product.GetProperty("produto").GetProperty("id").GetInt32());
        Assert.Equal(expectedQuantity, product.GetProperty("quantidade").GetInt32());
    }

    private static async Task<JsonElement> ReadJsonAsync(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.Clone();
    }

    private static readonly DateTimeOffset ScenarioNow =
        new(2026, 9, 14, 12, 0, 0, TimeSpan.Zero);
}
