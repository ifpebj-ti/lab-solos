using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class CriticalLoanDecisionTests(PostgreSqlContainerFixture database)
{
    [Fact]
    public async Task AdministratorApprovalDecreasesStockOnceAndPersistsDecision()
    {
        var seeded = await SeedScenarioAsync("loan-decision-approval");
        await using var factory = seeded.Factory;
        var scenario = seeded.Scenario;

        using var client = await CreateAuthenticatedClientAsync(
            factory,
            scenario.AdministratorEmail,
            scenario.AdministratorPassword);

        using var response = await SendDecisionAsync(client, "aprovar", scenario.LoanId);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        await AssertPersistedDecisionAsync(
            factory,
            scenario,
            StatusEmprestimo.Aprovado,
            expectedQuantity: 8,
            expectedProductStatus: StatusProduto.Disponivel,
            expectDecisionTimestamp: true);

        using var replay = await SendDecisionAsync(client, "aprovar", scenario.LoanId);

        Assert.Equal(HttpStatusCode.BadRequest, replay.StatusCode);

        await AssertPersistedDecisionAsync(
            factory,
            scenario,
            StatusEmprestimo.Aprovado,
            expectedQuantity: 8,
            expectedProductStatus: StatusProduto.Disponivel,
            expectDecisionTimestamp: true);
    }

    [Fact]
    public async Task AdministratorApprovalMarksExpiredProductWithoutChangingDecisionContract()
    {
        var seeded = await SeedScenarioAsync("loan-decision-expired-product");
        await using var factory = seeded.Factory;
        var scenario = seeded.Scenario;
        await SetProductExpirationAsync(factory, scenario.ProductId, ScenarioNow.AddDays(-1).UtcDateTime);

        using var client = await CreateAuthenticatedClientAsync(
            factory,
            scenario.AdministratorEmail,
            scenario.AdministratorPassword);

        using var response = await SendDecisionAsync(client, "aprovar", scenario.LoanId);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        await AssertPersistedDecisionAsync(
            factory,
            scenario,
            StatusEmprestimo.Aprovado,
            expectedQuantity: 8,
            expectedProductStatus: StatusProduto.Vencido,
            expectDecisionTimestamp: true);
    }

    [Fact]
    public async Task AdministratorRejectionKeepsStockAndPersistsDecision()
    {
        var seeded = await SeedScenarioAsync("loan-decision-rejection");
        await using var factory = seeded.Factory;
        var scenario = seeded.Scenario;

        using var client = await CreateAuthenticatedClientAsync(
            factory,
            scenario.AdministratorEmail,
            scenario.AdministratorPassword);

        using var response = await SendDecisionAsync(client, "reprovar", scenario.LoanId);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        await AssertPersistedDecisionAsync(
            factory,
            scenario,
            StatusEmprestimo.Rejeitado,
            expectedQuantity: 10,
            expectedProductStatus: StatusProduto.Disponivel,
            expectDecisionTimestamp: false);

        using var replay = await SendDecisionAsync(client, "reprovar", scenario.LoanId);

        Assert.Equal(HttpStatusCode.BadRequest, replay.StatusCode);

        await AssertPersistedDecisionAsync(
            factory,
            scenario,
            StatusEmprestimo.Rejeitado,
            expectedQuantity: 10,
            expectedProductStatus: StatusProduto.Disponivel,
            expectDecisionTimestamp: false);
    }

    [Theory]
    [InlineData("aprovar")]
    [InlineData("reprovar")]
    public async Task NonAdministratorProfileCannotDecideLoan(string action)
    {
        var seeded = await SeedScenarioAsync($"loan-decision-prohibited-{action}");
        await using var factory = seeded.Factory;
        var scenario = seeded.Scenario;

        using var client = await CreateAuthenticatedClientAsync(
            factory,
            scenario.BorrowerEmail,
            scenario.BorrowerPassword);

        using var response = await SendDecisionAsync(client, action, scenario.LoanId);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

        await AssertPendingLoanUnchangedAsync(factory, scenario);
    }

    [Theory]
    [InlineData("aprovar")]
    [InlineData("reprovar")]
    public async Task MissingLoanIdIsRejectedWithoutChangingPersistedLoan(string action)
    {
        var seeded = await SeedScenarioAsync($"loan-decision-missing-{action}");
        await using var factory = seeded.Factory;
        var scenario = seeded.Scenario;

        using var client = await CreateAuthenticatedClientAsync(
            factory,
            scenario.AdministratorEmail,
            scenario.AdministratorPassword);

        using var response = await SendDecisionAsync(client, action, scenario.LoanId + 99);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        await AssertPendingLoanUnchangedAsync(factory, scenario);
    }

    [Fact]
    public async Task InsufficientStockDoesNotPersistPartialReductionAcrossProducts()
    {
        var seeded = await SeedScenarioAsync("loan-decision-insufficient-stock");
        await using var factory = seeded.Factory;
        var scenario = seeded.Scenario;
        var secondProductId = scenario.ProductId + 1;
        await AddSecondProductToLoanAsync(factory, scenario, secondProductId);

        using var client = await CreateAuthenticatedClientAsync(
            factory,
            scenario.AdministratorEmail,
            scenario.AdministratorPassword);

        using var response = await SendDecisionAsync(client, "aprovar", scenario.LoanId);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var persisted = await ReadLoanStateAsync(factory, scenario.LoanId);
        Assert.Equal(StatusEmprestimo.Pendente, persisted.Status);
        Assert.Null(persisted.ApproverId);
        Assert.Equal(10, await ReadProductQuantityAsync(factory, scenario.ProductId));
        Assert.Equal(1, await ReadProductQuantityAsync(factory, secondProductId));
    }

    private static async Task AssertPersistedDecisionAsync(
        IntegrationWebApplicationFactory factory,
        CriticalScenarioData scenario,
        StatusEmprestimo expectedStatus,
        float expectedQuantity,
        StatusProduto expectedProductStatus,
        bool expectDecisionTimestamp)
    {
        var persisted = await ReadLoanStateAsync(factory, scenario.LoanId);
        Assert.Equal(expectedStatus, persisted.Status);
        Assert.Equal(scenario.AdministratorId, persisted.ApproverId);

        if (expectDecisionTimestamp)
        {
            Assert.NotNull(persisted.DecisionAt);
        }
        else
        {
            Assert.Null(persisted.DecisionAt);
        }

        Assert.Equal(expectedQuantity, await ReadProductQuantityAsync(factory, scenario.ProductId));
        Assert.Equal(expectedProductStatus, await ReadProductStatusAsync(factory, scenario.ProductId));
    }

    private static async Task AssertPendingLoanUnchangedAsync(
        IntegrationWebApplicationFactory factory,
        CriticalScenarioData scenario)
    {
        var persisted = await ReadLoanStateAsync(factory, scenario.LoanId);
        Assert.Equal(StatusEmprestimo.Pendente, persisted.Status);
        Assert.Null(persisted.ApproverId);
        Assert.Equal(10, await ReadProductQuantityAsync(factory, scenario.ProductId));
        Assert.Equal(StatusProduto.Disponivel, await ReadProductStatusAsync(factory, scenario.ProductId));
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
            .GetRequiredService<IPasswordHasher<Usuario>>();
        await scenario.PersistAsync(context, passwordHasher, clock);

        return (factory, scenario);
    }

    private static async Task AddSecondProductToLoanAsync(
        IntegrationWebApplicationFactory factory,
        CriticalScenarioData scenario,
        int secondProductId)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        context.Produtos.Add(new Produto
        {
            Id = secondProductId,
            NomeProduto = $"Produto secundário {scenario.ScenarioToken}",
            Catmat = $"CATMAT-SECOND-{scenario.ScenarioToken}",
            Fornecedor = "Fornecedor sintético T015",
            Tipo = TipoProduto.Outro,
            Quantidade = 1,
            QuantidadeMinima = 1,
            UnidadeMedida = UnidadeMedida.Unidade,
            Status = StatusProduto.Disponivel,
            UltimaModificacao = ScenarioNow.UtcDateTime
        });
        context.ProdutosEmprestados.Add(new ProdutoEmprestado
        {
            EmprestimoId = scenario.LoanId,
            ProdutoId = secondProductId,
            Quantidade = 2
        });
        await context.SaveChangesAsync();
    }

    private static async Task SetProductExpirationAsync(
        IntegrationWebApplicationFactory factory,
        int productId,
        DateTime expiration)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var product = await context.Produtos.SingleAsync(candidate => candidate.Id == productId);
        product.DataValidade = expiration;
        await context.SaveChangesAsync();
    }

    private static async Task<HttpClient> CreateAuthenticatedClientAsync(
        IntegrationWebApplicationFactory factory,
        string email,
        string password)
    {
        var client = factory.CreateClient();
        using var response = await client.PostAsJsonAsync(
            "/api/Auth/login",
            new { email, password });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var token = document.RootElement.GetProperty("token").GetString();
        Assert.False(string.IsNullOrWhiteSpace(token));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private static async Task<HttpResponseMessage> SendDecisionAsync(
        HttpClient client,
        string action,
        int loanId)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Patch,
            $"/api/Emprestimos/{action}/{loanId}");
        return await client.SendAsync(request);
    }

    private static async Task<LoanState> ReadLoanStateAsync(
        IntegrationWebApplicationFactory factory,
        int loanId)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await context.Emprestimos
            .AsNoTracking()
            .Where(loan => loan.Id == loanId)
            .Select(loan => new LoanState(loan.Status, loan.AprovadorId, loan.DataAprovacao))
            .SingleAsync();
    }

    private static async Task<float> ReadProductQuantityAsync(
        IntegrationWebApplicationFactory factory,
        int productId)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await context.Produtos
            .AsNoTracking()
            .Where(product => product.Id == productId)
            .Select(product => product.Quantidade)
            .SingleAsync();
    }

    private static async Task<StatusProduto> ReadProductStatusAsync(
        IntegrationWebApplicationFactory factory,
        int productId)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await context.Produtos
            .AsNoTracking()
            .Where(product => product.Id == productId)
            .Select(product => product.Status)
            .SingleAsync();
    }

    private sealed record LoanState(
        StatusEmprestimo Status,
        int? ApproverId,
        DateTime? DecisionAt);

    private static readonly DateTimeOffset ScenarioNow =
        new(2026, 9, 14, 12, 0, 0, TimeSpan.Zero);
}
