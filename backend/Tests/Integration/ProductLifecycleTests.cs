using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class ProductLifecycleTests(PostgreSqlContainerFixture database)
{
    [Fact]
    public async Task DeleteWithPendingLoanReferenceReturnsConflictAndPreservesBothRecords()
    {
        var (factory, scenario) = await SeedScenarioAsync("product-delete-pending-loan");
        await using var ownedFactory = factory;
        using var admin = await CreateAuthenticatedClientAsync(
            factory, scenario.AdministratorEmail, scenario.AdministratorPassword);

        using var response = await admin.DeleteAsync($"/api/Produtos/{scenario.ProductId}");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("product_has_dependencies", await ReadCodeAsync(response));
        var state = await ReadStateAsync(factory, scenario.ProductId, scenario.LoanId);
        Assert.True(state.ProductExists);
        Assert.Equal(1, state.LoanItems);
        Assert.Equal(StatusEmprestimo.Pendente, state.LoanStatus);
    }

    [Fact]
    public async Task DeactivationRemovesProductFromActiveCatalogAndReactivationRestoresIt()
    {
        var (factory, scenario) = await SeedScenarioAsync("product-deactivate-reactivate");
        await using var ownedFactory = factory;
        await SetProductQuantityAsync(factory, scenario.ProductId, 1);
        using var admin = await CreateAuthenticatedClientAsync(
            factory, scenario.AdministratorEmail, scenario.AdministratorPassword);

        Assert.True(await ProductAppearsInAlertListAsync(admin, scenario.ProductId));

        using var deactivate = await admin.PostAsync(
            $"/api/Produtos/{scenario.ProductId}/desativar", content: null);

        Assert.Equal(HttpStatusCode.NoContent, deactivate.StatusCode);
        Assert.False(await ProductAppearsInCatalogAsync(admin, scenario.ProductId));
        Assert.False(await ProductAppearsInTypeListAsync(admin, scenario.ProductId));
        Assert.False(await ProductAppearsInAlertListAsync(admin, scenario.ProductId));

        using var reactivate = await admin.PostAsync(
            $"/api/Produtos/{scenario.ProductId}/reativar", content: null);

        Assert.Equal(HttpStatusCode.NoContent, reactivate.StatusCode);
        Assert.True(await ProductAppearsInCatalogAsync(admin, scenario.ProductId));
        var state = await ReadStateAsync(factory, scenario.ProductId, scenario.LoanId);
        Assert.True(state.ProductExists);
        Assert.Equal(1, state.LoanItems);
    }

    [Fact]
    public async Task DeactivatedProductCannotBeRequestedOrApprovedButPendingLoanCanBeRejected()
    {
        var (factory, scenario) = await SeedScenarioAsync("product-disabled-loan-eligibility");
        await using var ownedFactory = factory;
        using var admin = await CreateAuthenticatedClientAsync(
            factory, scenario.AdministratorEmail, scenario.AdministratorPassword);
        using var borrower = await CreateAuthenticatedClientAsync(
            factory, scenario.BorrowerEmail, scenario.BorrowerPassword);

        using var deactivate = await admin.PostAsync(
            $"/api/Produtos/{scenario.ProductId}/desativar", content: null);
        Assert.Equal(HttpStatusCode.NoContent, deactivate.StatusCode);

        using var create = await borrower.PostAsJsonAsync("/api/Emprestimos", CreateLoanRequest(scenario.ProductId));
        Assert.Equal(HttpStatusCode.Conflict, create.StatusCode);
        Assert.Equal("loan_product_deactivated", await ReadCodeAsync(create));

        using var approve = await admin.PatchAsync(
            $"/api/Emprestimos/aprovar/{scenario.LoanId}", content: null);
        Assert.Equal(HttpStatusCode.Conflict, approve.StatusCode);
        Assert.Equal("loan_product_deactivated", await ReadCodeAsync(approve));

        using var reject = await admin.PatchAsync(
            $"/api/Emprestimos/reprovar/{scenario.LoanId}", content: null);
        Assert.Equal(HttpStatusCode.NoContent, reject.StatusCode);

        var state = await ReadStateAsync(factory, scenario.ProductId, scenario.LoanId);
        Assert.Equal(10, state.Stock);
        Assert.Equal(0, state.Movements);
        Assert.Equal(StatusEmprestimo.Rejeitado, state.LoanStatus);
        Assert.Equal(1, state.LoanItems);
    }

    [Fact]
    public async Task DeactivatedProductKeepsApprovedOutflowAndCanStillBeReturned()
    {
        var (factory, scenario) = await SeedScenarioAsync("product-disabled-return");
        await using var ownedFactory = factory;
        using var admin = await CreateAuthenticatedClientAsync(
            factory, scenario.AdministratorEmail, scenario.AdministratorPassword);

        using var approve = await admin.PatchAsync(
            $"/api/Emprestimos/aprovar/{scenario.LoanId}", content: null);
        Assert.True(
            approve.StatusCode == HttpStatusCode.NoContent,
            await approve.Content.ReadAsStringAsync());

        using var deactivate = await admin.PostAsync(
            $"/api/Produtos/{scenario.ProductId}/desativar", content: null);
        Assert.Equal(HttpStatusCode.NoContent, deactivate.StatusCode);
        Assert.False(await ProductAppearsInCatalogAsync(admin, scenario.ProductId));

        using var returnResponse = await admin.PatchAsync(
            $"/api/Emprestimos/devolver/{scenario.LoanId}", content: null);

        Assert.Equal(HttpStatusCode.NoContent, returnResponse.StatusCode);
        Assert.False(await ProductAppearsInCatalogAsync(admin, scenario.ProductId));
        var state = await ReadStateAsync(factory, scenario.ProductId, scenario.LoanId);
        Assert.True(state.ProductExists);
        Assert.Equal(10, state.Stock);
        Assert.Equal(1, state.LoanItems);
        Assert.Equal(2, state.Movements);
        Assert.Equal(StatusEmprestimo.Aprovado, state.LoanStatus);
    }

    [Fact]
    public async Task DeleteWithCurrentLotReferenceReturnsConflictAndKeepsTheAssociation()
    {
        var (factory, scenario) = await SeedScenarioAsync("product-delete-lot-reference");
        await using var ownedFactory = factory;
        await RemoveSeedLoanAsync(factory, scenario.LoanId);
        var lotId = await AttachLotAsync(factory, scenario.ProductId);
        using var admin = await CreateAuthenticatedClientAsync(
            factory, scenario.AdministratorEmail, scenario.AdministratorPassword);

        using var response = await admin.DeleteAsync($"/api/Produtos/{scenario.ProductId}");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("product_has_dependencies", await ReadCodeAsync(response));
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var product = await context.Produtos.AsNoTracking().SingleAsync(p => p.Id == scenario.ProductId);
        Assert.Equal(lotId, product.LoteId);
        Assert.True(await context.Lotes.AnyAsync(lot => lot.Id == lotId));
    }

    [Fact]
    public async Task DeleteWithMovementHistoryReturnsConflictAndPreservesTheMovement()
    {
        var (factory, scenario) = await SeedScenarioAsync("product-delete-movement-reference");
        await using var ownedFactory = factory;
        using var admin = await CreateAuthenticatedClientAsync(
            factory, scenario.AdministratorEmail, scenario.AdministratorPassword);
        using var approve = await admin.PatchAsync(
            $"/api/Emprestimos/aprovar/{scenario.LoanId}", content: null);
        Assert.Equal(HttpStatusCode.NoContent, approve.StatusCode);

        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var link = await context.ProdutosEmprestados.SingleAsync(
                item => item.ProdutoId == scenario.ProductId && item.EmprestimoId == scenario.LoanId);
            context.ProdutosEmprestados.Remove(link);
            await context.SaveChangesAsync();
        }

        using var response = await admin.DeleteAsync($"/api/Produtos/{scenario.ProductId}");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("product_has_dependencies", await ReadCodeAsync(response));
        var state = await ReadStateAsync(factory, scenario.ProductId, scenario.LoanId);
        Assert.True(state.ProductExists);
        Assert.Equal(1, state.Movements);
    }

    [Fact]
    public async Task DeleteWithoutLoanMovementOrLotReferencesRemovesOnlyTheProduct()
    {
        var (factory, scenario) = await SeedScenarioAsync("product-delete-unreferenced");
        await using var ownedFactory = factory;
        await RemoveSeedLoanAsync(factory, scenario.LoanId);
        using var admin = await CreateAuthenticatedClientAsync(
            factory, scenario.AdministratorEmail, scenario.AdministratorPassword);

        using var response = await admin.DeleteAsync($"/api/Produtos/{scenario.ProductId}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var state = await ReadStateAsync(factory, scenario.ProductId, scenario.LoanId);
        Assert.False(state.ProductExists);
        Assert.Equal(0, state.LoanItems);
        Assert.Equal(0, state.Movements);
    }

    [Fact]
    public async Task MigrationRollbackCannotDiscardDeactivatedProductState()
    {
        var (factory, scenario) = await SeedScenarioAsync("product-lifecycle-rollback-state");
        await using var ownedFactory = factory;
        using var admin = await CreateAuthenticatedClientAsync(
            factory, scenario.AdministratorEmail, scenario.AdministratorPassword);
        using var deactivate = await admin.PostAsync(
            $"/api/Produtos/{scenario.ProductId}/desativar", content: null);
        Assert.Equal(HttpStatusCode.NoContent, deactivate.StatusCode);

        var rollbackFailure = await AssertMigrationRollbackBlockedAsync(factory);
        Assert.Equal("55000", rollbackFailure.SqlState);

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var product = await context.Produtos.AsNoTracking().SingleAsync(item => item.Id == scenario.ProductId);
        Assert.True(product.Desativado);
        Assert.Equal(1, await context.ProdutosEmprestados.CountAsync(item => item.ProdutoId == scenario.ProductId));
    }

    [Fact]
    public async Task MigrationRollbackCannotRestoreCascadeWhileLoanLinksExist()
    {
        var (factory, scenario) = await SeedScenarioAsync("product-lifecycle-rollback-loan-links");
        await using var ownedFactory = factory;

        var rollbackFailure = await AssertMigrationRollbackBlockedAsync(factory);
        Assert.Equal("55000", rollbackFailure.SqlState);

        var state = await ReadStateAsync(factory, scenario.ProductId, scenario.LoanId);
        Assert.True(state.ProductExists);
        Assert.Equal(1, state.LoanItems);
    }

    [Fact]
    public async Task ConcurrentLoanCreationAndProductDeletionCannotLeaveDanglingOrErasedLoanLink()
    {
        var (factory, scenario) = await SeedScenarioAsync("product-delete-loan-race");
        await using var ownedFactory = factory;
        await RemoveSeedLoanAsync(factory, scenario.LoanId);
        await AddDelayedLoanItemTriggerAsync(factory);

        using var admin = await CreateAuthenticatedClientAsync(
            factory, scenario.AdministratorEmail, scenario.AdministratorPassword);
        using var borrower = await CreateAuthenticatedClientAsync(
            factory, scenario.BorrowerEmail, scenario.BorrowerPassword);

        var createTask = borrower.PostAsJsonAsync(
            "/api/Emprestimos", CreateLoanRequest(scenario.ProductId));
        await Task.Delay(TimeSpan.FromMilliseconds(100));
        var deleteTask = admin.DeleteAsync($"/api/Produtos/{scenario.ProductId}");
        using var create = await createTask;
        using var delete = await deleteTask;

        if (create.StatusCode == HttpStatusCode.Created)
        {
            Assert.Equal(HttpStatusCode.Conflict, delete.StatusCode);
            var created = await ReadJsonAsync(create);
            var state = await ReadStateAsync(
                factory, scenario.ProductId, created.GetProperty("id").GetInt32());
            Assert.True(state.ProductExists);
            Assert.Equal(1, state.LoanItems);
        }
        else
        {
            Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
            Assert.Equal(HttpStatusCode.BadRequest, create.StatusCode);
            var state = await ReadStateAsync(factory, scenario.ProductId, null);
            Assert.False(state.ProductExists);
            Assert.Equal(0, state.LoanItems);
        }
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
        using var login = await client.PostAsJsonAsync("/api/Auth/login", new { email, password });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        using var document = JsonDocument.Parse(await login.Content.ReadAsStringAsync());
        var token = document.RootElement.GetProperty("token").GetString();
        Assert.False(string.IsNullOrWhiteSpace(token));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private static object CreateLoanRequest(int productId) => new
    {
        diasParaDevolucao = 5,
        produtos = new[] { new { produtoId = productId, quantidade = 2 } }
    };

    private static async Task<bool> ProductAppearsInCatalogAsync(HttpClient client, int productId)
    {
        using var response = await client.GetAsync("/api/Produtos");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.GetProperty("itens").EnumerateArray()
            .Any(product => product.GetProperty("id").GetInt32() == productId);
    }

    private static async Task<bool> ProductAppearsInTypeListAsync(HttpClient client, int productId)
    {
        using var response = await client.GetAsync("/api/Produtos/tipo/2");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.GetProperty("itens").EnumerateArray()
            .Any(product => product.GetProperty("id").GetInt32() == productId);
    }

    private static async Task<bool> ProductAppearsInAlertListAsync(HttpClient client, int productId)
    {
        using var response = await client.GetAsync("/api/Produtos/emAlerta");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.EnumerateArray()
            .Any(product => product.GetProperty("id").GetInt32() == productId);
    }

    private static async Task<string?> ReadCodeAsync(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.TryGetProperty("code", out var code) ? code.GetString() : null;
    }

    private static async Task<JsonElement> ReadJsonAsync(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.Clone();
    }

    private static async Task RemoveSeedLoanAsync(IntegrationWebApplicationFactory factory, int loanId)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var loan = await context.Emprestimos.SingleAsync(item => item.Id == loanId);
        context.Emprestimos.Remove(loan);
        await context.SaveChangesAsync();
    }

    private static async Task SetProductQuantityAsync(
        IntegrationWebApplicationFactory factory,
        int productId,
        float quantity)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var product = await context.Produtos.SingleAsync(item => item.Id == productId);
        product.Quantidade = quantity;
        await context.SaveChangesAsync();
    }

    private static async Task<int> AttachLotAsync(IntegrationWebApplicationFactory factory, int productId)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var lot = new Lote { CodigoLote = "PRODUCT-LIFECYCLE-LOT" };
        context.Lotes.Add(lot);
        await context.SaveChangesAsync();
        var product = await context.Produtos.SingleAsync(item => item.Id == productId);
        product.LoteId = lot.Id;
        await context.SaveChangesAsync();
        return lot.Id;
    }

    private static async Task AddDelayedLoanItemTriggerAsync(IntegrationWebApplicationFactory factory)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.ExecuteSqlRawAsync(
            """CREATE FUNCTION "T004_DelayProductLoanItem"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_sleep(0.7); RETURN NEW; END; $$; CREATE TRIGGER "TR_T004_DelayProductLoanItem" BEFORE INSERT ON "ProdutosEmprestados" FOR EACH ROW EXECUTE FUNCTION "T004_DelayProductLoanItem"();""");
    }

    private static async Task<PostgresException> AssertMigrationRollbackBlockedAsync(
        IntegrationWebApplicationFactory factory)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var migrator = context.Database.GetService<IMigrator>();
        var failure = await Assert.ThrowsAsync<InvalidOperationException>(
            () => migrator.MigrateAsync("20261117050856_LoanStockMovements"));
        return Assert.IsType<PostgresException>(failure.InnerException);
    }

    private static async Task<ProductLoanState> ReadStateAsync(
        IntegrationWebApplicationFactory factory,
        int productId,
        int? loanId)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var product = await context.Produtos.AsNoTracking()
            .Where(item => item.Id == productId)
            .Select(item => new { item.Quantidade })
            .SingleOrDefaultAsync();
        var loan = loanId is null
            ? null
            : await context.Emprestimos.AsNoTracking()
                .Where(item => item.Id == loanId)
                .Select(item => new { item.Status })
                .SingleOrDefaultAsync();
        return new ProductLoanState(
            product is not null,
            product?.Quantidade ?? 0,
            await context.ProdutosEmprestados.CountAsync(item => item.ProdutoId == productId),
            await context.MovimentacoesEstoque.CountAsync(item => item.ProdutoId == productId),
            loan?.Status);
    }

    private sealed record ProductLoanState(
        bool ProductExists,
        float Stock,
        int LoanItems,
        int Movements,
        StatusEmprestimo? LoanStatus);
}
