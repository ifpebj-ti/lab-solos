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
public sealed class LoanDecisionPersistenceTests(PostgreSqlContainerFixture database)
{
    [Fact]
    public async Task ApprovalWritesOneDurableMovementWithActorInstantAndLot()
    {
        var seeded = await SeedScenarioAsync("loan-decision-persistence");
        await using var factory = seeded.Factory;
        var scenario = seeded.Scenario;
        var lotId = await AttachLotAsync(factory, scenario.ProductId);
        using var client = await CreateAuthenticatedClientAsync(
            factory,
            scenario.AdministratorEmail,
            scenario.AdministratorPassword);

        using var response = await SendDecisionAsync(client, "aprovar", scenario.LoanId);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var movement = await ReadMovementAsync(database.ConnectionString, scenario.LoanId, scenario.ProductId);
        Assert.Equal(CriticalScenarioData.LoanQuantity, movement.Quantity);
        Assert.Equal(scenario.AdministratorId, movement.ActorId);
        Assert.Equal(lotId, movement.LotId);
        Assert.Equal(ScenarioNow.UtcDateTime, movement.OccurredAt);
        Assert.Equal("SaidaEmprestimo", movement.Type);

        using var replay = await SendDecisionAsync(client, "aprovar", scenario.LoanId);

        Assert.Equal(HttpStatusCode.Conflict, replay.StatusCode);
        using var conflict = JsonDocument.Parse(await replay.Content.ReadAsStringAsync());
        Assert.Equal("loan_decision_already_recorded", conflict.RootElement.GetProperty("code").GetString());
        Assert.Equal(1, await CountMovementsAsync(database.ConnectionString, scenario.LoanId));
        Assert.Equal(8, await ReadProductQuantityAsync(factory, scenario.ProductId));
    }

    [Fact]
    public async Task RejectionPersistsDecisionWithoutCreatingStockMovement()
    {
        var seeded = await SeedScenarioAsync("loan-rejection-persistence");
        await using var factory = seeded.Factory;
        var scenario = seeded.Scenario;
        using var client = await CreateAuthenticatedClientAsync(
            factory,
            scenario.AdministratorEmail,
            scenario.AdministratorPassword);

        using var response = await SendDecisionAsync(client, "reprovar", scenario.LoanId);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(0, await CountMovementsAsync(database.ConnectionString, scenario.LoanId));
        var persisted = await ReadLoanStateAsync(factory, scenario.LoanId);
        Assert.Equal(StatusEmprestimo.Rejeitado, persisted.Status);
        Assert.Equal(scenario.AdministratorId, persisted.ApproverId);
        Assert.Equal(10, await ReadProductQuantityAsync(factory, scenario.ProductId));
    }

    [Fact]
    public async Task ConcurrentApprovalsForSharedStockSerializeAndRevalidateBalance()
    {
        var seeded = await SeedScenarioAsync("loan-decision-shared-stock-race");
        await using var factory = seeded.Factory;
        var scenario = seeded.Scenario;
        var secondLoanId = scenario.LoanId + 1;
        await AddCompetingLoanAsync(factory, scenario, secondLoanId);
        await AddStockUpdateDelayAsync(database.ConnectionString);
        using var client = await CreateAuthenticatedClientAsync(
            factory,
            scenario.AdministratorEmail,
            scenario.AdministratorPassword);

        var decisions = await Task.WhenAll(
            SendDecisionAsync(client, "aprovar", scenario.LoanId),
            SendDecisionAsync(client, "aprovar", secondLoanId));
        using var first = decisions[0];
        using var second = decisions[1];

        Assert.Equal(1, decisions.Count(response => response.StatusCode == HttpStatusCode.NoContent));
        var conflict = Assert.Single(decisions, response => response.StatusCode == HttpStatusCode.Conflict);
        await AssertProblemCodeAsync(conflict, "loan_insufficient_stock");
        Assert.Equal(2, await ReadProductQuantityAsync(factory, scenario.ProductId));
        var firstLoanState = await ReadLoanStateAsync(factory, scenario.LoanId);
        var secondLoanState = await ReadLoanStateAsync(factory, secondLoanId);
        Assert.Equal(1, new[] { firstLoanState, secondLoanState }
            .Count(state => state.Status == StatusEmprestimo.Aprovado));
        Assert.Equal(1, new[] { firstLoanState, secondLoanState }
            .Count(state => state.Status == StatusEmprestimo.Pendente));
        Assert.Equal(1,
            (await CountMovementsAsync(database.ConnectionString, scenario.LoanId)) +
            (await CountMovementsAsync(database.ConnectionString, secondLoanId)));
    }

    [Fact]
    public async Task MovementWriteFailureRollsBackEveryItemAndTheLoanDecision()
    {
        var seeded = await SeedScenarioAsync("loan-decision-movement-rollback");
        await using var factory = seeded.Factory;
        var scenario = seeded.Scenario;
        var secondProductId = scenario.ProductId + 1;
        await AddSecondProductToLoanAsync(factory, scenario, secondProductId);
        await AddMovementInsertFailureAsync(database.ConnectionString);
        using var client = await CreateAuthenticatedClientAsync(
            factory,
            scenario.AdministratorEmail,
            scenario.AdministratorPassword);

        using var response = await SendDecisionAsync(client, "aprovar", scenario.LoanId);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal(StatusEmprestimo.Pendente, (await ReadLoanStateAsync(factory, scenario.LoanId)).Status);
        Assert.Equal(10, await ReadProductQuantityAsync(factory, scenario.ProductId));
        Assert.Equal(10, await ReadProductQuantityAsync(factory, secondProductId));
        Assert.Equal(0, await CountMovementsAsync(database.ConnectionString, scenario.LoanId));
    }

    [Fact]
    public async Task MigrationRollbackKeepsDurableMovementHistoryReadable()
    {
        var seeded = await SeedScenarioAsync("loan-decision-migration-rollback");
        await using var factory = seeded.Factory;
        var scenario = seeded.Scenario;
        await AttachLotAsync(factory, scenario.ProductId);
        using var client = await CreateAuthenticatedClientAsync(
            factory,
            scenario.AdministratorEmail,
            scenario.AdministratorPassword);
        using var response = await SendDecisionAsync(client, "aprovar", scenario.LoanId);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var migrator = context.Database.GetService<IMigrator>();
        var migrationFailure = await Assert.ThrowsAsync<InvalidOperationException>(
            () => migrator.MigrateAsync("20261013153155_AuthenticationProtection"));

        var rollbackFailure = Assert.IsType<PostgresException>(migrationFailure.InnerException);
        Assert.Equal("55000", rollbackFailure.SqlState);
        Assert.Equal(1, await CountMovementsAsync(database.ConnectionString, scenario.LoanId));
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
        var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<Usuario>>();
        await scenario.PersistAsync(context, passwordHasher, clock);
        return (factory, scenario);
    }

    private static async Task<int> AttachLotAsync(IntegrationWebApplicationFactory factory, int productId)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var lot = new Lote { CodigoLote = "LOTE-T004-SINTETICO" };
        context.Lotes.Add(lot);
        await context.SaveChangesAsync();
        var product = await context.Produtos.SingleAsync(item => item.Id == productId);
        product.LoteId = lot.Id;
        await context.SaveChangesAsync();
        return lot.Id;
    }

    private static async Task AddCompetingLoanAsync(
        IntegrationWebApplicationFactory factory,
        CriticalScenarioData scenario,
        int secondLoanId)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var firstItem = await context.ProdutosEmprestados.SingleAsync(item =>
            item.EmprestimoId == scenario.LoanId && item.ProdutoId == scenario.ProductId);
        firstItem.Quantidade = 8;
        var now = ScenarioNow.UtcDateTime;
        context.Emprestimos.Add(new Emprestimo
        {
            Id = secondLoanId,
            DataRealizacao = now,
            DataPrevistaDevolucao = now.AddDays(5),
            Status = StatusEmprestimo.Pendente,
            SolicitanteId = scenario.BorrowerId,
            Produtos =
            [
                new ProdutoEmprestado
                {
                    ProdutoId = scenario.ProductId,
                    Quantidade = 8
                }
            ]
        });
        await context.SaveChangesAsync();
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
            Catmat = $"CATMAT-T004-{scenario.ScenarioToken}",
            Fornecedor = "Fornecedor sintético T004",
            Tipo = TipoProduto.Outro,
            Quantidade = 10,
            QuantidadeMinima = 1,
            UnidadeMedida = UnidadeMedida.Unidade,
            Status = StatusProduto.Disponivel,
            UltimaModificacao = ScenarioNow.UtcDateTime
        });
        context.ProdutosEmprestados.Add(new ProdutoEmprestado
        {
            EmprestimoId = scenario.LoanId,
            ProdutoId = secondProductId,
            Quantidade = CriticalScenarioData.LoanQuantity
        });
        await context.SaveChangesAsync();
    }

    private static async Task AddStockUpdateDelayAsync(string connectionString)
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            """CREATE FUNCTION "T004_DelayStockUpdate"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."Quantidade" IS DISTINCT FROM OLD."Quantidade" THEN PERFORM pg_sleep(0.7); END IF; RETURN NEW; END; $$; CREATE TRIGGER "TR_T004_DelayStockUpdate" BEFORE UPDATE OF "Quantidade" ON "Produtos" FOR EACH ROW EXECUTE FUNCTION "T004_DelayStockUpdate"();""",
            connection);
        await command.ExecuteNonQueryAsync();
    }

    private static async Task AddMovementInsertFailureAsync(string connectionString)
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            """CREATE FUNCTION "T004_FailMovementInsert"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic T004 movement write failure'; END; $$; CREATE TRIGGER "TR_T004_FailMovementInsert" BEFORE INSERT ON "MovimentacoesEstoque" FOR EACH ROW EXECUTE FUNCTION "T004_FailMovementInsert"();""",
            connection);
        await command.ExecuteNonQueryAsync();
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

    private static Task<HttpResponseMessage> SendDecisionAsync(HttpClient client, string action, int loanId) =>
        client.PatchAsync($"/api/Emprestimos/{action}/{loanId}", content: null);

    private static async Task AssertProblemCodeAsync(HttpResponseMessage response, string expectedCode)
    {
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(expectedCode, document.RootElement.GetProperty("code").GetString());
        Assert.False(string.IsNullOrWhiteSpace(
            document.RootElement.GetProperty("correlationId").GetString()));
        Assert.True(response.Headers.TryGetValues("X-Correlation-ID", out var correlationIds));
        Assert.False(string.IsNullOrWhiteSpace(correlationIds!.Single()));
    }

    private static async Task<MovementRow> ReadMovementAsync(
        string connectionString,
        int loanId,
        int productId)
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            """SELECT "Quantidade", "Instante", "AtorId", "LoteId", "Tipo" FROM "MovimentacoesEstoque" WHERE "EmprestimoId" = @loanId AND "ProdutoId" = @productId""",
            connection);
        command.Parameters.AddWithValue("loanId", loanId);
        command.Parameters.AddWithValue("productId", productId);
        await using var reader = await command.ExecuteReaderAsync();
        Assert.True(await reader.ReadAsync(), "A aprovação deve registrar o movimento durável.");
        var row = new MovementRow(
            reader.GetInt32(0),
            reader.GetDateTime(1),
            reader.GetInt32(2),
            reader.GetInt32(3),
            reader.GetString(4));
        Assert.False(await reader.ReadAsync(), "A aprovação não pode duplicar o movimento.");
        return row;
    }

    private static async Task<int> CountMovementsAsync(string connectionString, int loanId)
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            "SELECT COUNT(*) FROM \"MovimentacoesEstoque\" WHERE \"EmprestimoId\" = @loanId",
            connection);
        command.Parameters.AddWithValue("loanId", loanId);
        return Convert.ToInt32(
            await command.ExecuteScalarAsync(),
            System.Globalization.CultureInfo.InvariantCulture);
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
            .Select(loan => new LoanState(loan.Status, loan.AprovadorId))
            .SingleAsync();
    }

    private static async Task<float> ReadProductQuantityAsync(
        IntegrationWebApplicationFactory factory,
        int productId)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await context.Produtos.AsNoTracking()
            .Where(product => product.Id == productId)
            .Select(product => product.Quantidade)
            .SingleAsync();
    }

    private sealed record MovementRow(int Quantity, DateTime OccurredAt, int ActorId, int LotId, string Type);
    private sealed record LoanState(StatusEmprestimo Status, int? ApproverId);

    private static readonly DateTimeOffset ScenarioNow =
        new(2026, 9, 14, 12, 0, 0, TimeSpan.Zero);
}
