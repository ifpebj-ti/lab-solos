using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class LoanReturnCharacterizationTests(PostgreSqlContainerFixture database)
{
    [Fact]
    public async Task ApprovedLoanCanBeReturnedOnceAndRepeatedReturnHasNoEffect()
    {
        var seeded = await SeedScenarioAsync("loan-return-characterization-red");
        await using var factory = seeded.Factory;
        var scenario = seeded.Scenario;

        using var borrowerClient = await CreateAuthenticatedClientAsync(
            factory,
            scenario.BorrowerEmail,
            scenario.BorrowerPassword);
        using var createResponse = await borrowerClient.PostAsJsonAsync(
            "/api/Emprestimos",
            new
            {
                diasParaDevolucao = 5,
                produtos = new[]
                {
                    new
                    {
                        produtoId = scenario.ProductId,
                        quantidade = 2
                    }
                }
            });
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        using var createdDocument = JsonDocument.Parse(
            await createResponse.Content.ReadAsStringAsync());
        var loanId = createdDocument.RootElement.GetProperty("id").GetInt32();
        Assert.Equal(
            ScenarioNow.UtcDateTime.AddDays(5),
            createdDocument.RootElement.GetProperty("dataPrevistaDevolucao").GetDateTime());
        Assert.Equal(
            JsonValueKind.Null,
            createdDocument.RootElement.GetProperty("dataDevolucao").ValueKind);

        using var client = await CreateAuthenticatedClientAsync(
            factory,
            scenario.AdministratorEmail,
            scenario.AdministratorPassword);

        var beforeApproval = await ReadLoanStateAsync(factory, loanId);
        Assert.Equal(StatusEmprestimo.Pendente, beforeApproval.Status);
        Assert.Equal(ScenarioNow.UtcDateTime.AddDays(5), beforeApproval.ScheduledReturnDate);
        Assert.Null(beforeApproval.EffectiveReturnDate);

        using var approvalResponse = await SendPatchAsync(
            client,
            $"/api/Emprestimos/aprovar/{loanId}");
        Assert.Equal(HttpStatusCode.NoContent, approvalResponse.StatusCode);

        var afterApproval = await ReadLoanStateAsync(factory, loanId);
        Assert.Equal(StatusEmprestimo.Aprovado, afterApproval.Status);
        Assert.Equal(ScenarioNow.UtcDateTime.AddDays(5), afterApproval.ScheduledReturnDate);
        Assert.Null(afterApproval.EffectiveReturnDate);
        Assert.Equal(8, afterApproval.ProductQuantity);

        using var firstReturnResponse = await SendPatchAsync(
            client,
            $"/api/Emprestimos/devolver/{loanId}");

        Assert.Equal(HttpStatusCode.NoContent, firstReturnResponse.StatusCode);

        var afterFirstReturn = await ReadLoanStateAsync(factory, loanId);
        Assert.Equal(StatusEmprestimo.Aprovado, afterFirstReturn.Status);
        Assert.Equal(ScenarioNow.UtcDateTime.AddDays(5), afterFirstReturn.ScheduledReturnDate);
        Assert.Equal(ScenarioNow.UtcDateTime, afterFirstReturn.EffectiveReturnDate);
        Assert.Equal(10, afterFirstReturn.ProductQuantity);

        using var historyResponse = await client.GetAsync(
            $"/api/Produtos/{scenario.ProductId}/historico-saida");
        Assert.Equal(HttpStatusCode.OK, historyResponse.StatusCode);
        using var historyDocument = JsonDocument.Parse(
            await historyResponse.Content.ReadAsStringAsync());
        var historyEntry = Assert.Single(
            historyDocument.RootElement
                .GetProperty("historico")
                .EnumerateArray(),
            item => item.GetProperty("emprestimoId").GetInt32() == loanId);
        Assert.Equal(
            ScenarioNow.UtcDateTime,
            historyEntry.GetProperty("dataSaida").GetDateTime());
        Assert.Equal(2, historyEntry.GetProperty("quantidadeEmprestada").GetInt32());

        using var detailResponse = await client.GetAsync($"/api/Emprestimos/{loanId}");
        Assert.Equal(HttpStatusCode.OK, detailResponse.StatusCode);
        using var detailDocument = JsonDocument.Parse(await detailResponse.Content.ReadAsStringAsync());
        Assert.Equal(
            ScenarioNow.UtcDateTime.AddDays(5),
            detailDocument.RootElement.GetProperty("dataPrevistaDevolucao").GetDateTime());
        Assert.Equal(
            ScenarioNow.UtcDateTime,
            detailDocument.RootElement.GetProperty("dataDevolucao").GetDateTime());

        using var secondReturnResponse = await SendPatchAsync(
            client,
            $"/api/Emprestimos/devolver/{loanId}");

        Assert.Equal(HttpStatusCode.Conflict, secondReturnResponse.StatusCode);
        using var returnProblemDocument = JsonDocument.Parse(
            await secondReturnResponse.Content.ReadAsStringAsync());
        var returnProblem = returnProblemDocument.RootElement;
        Assert.Equal(409, returnProblem.GetProperty("status").GetInt32());
        Assert.Equal("loan_return_already_recorded", returnProblem.GetProperty("code").GetString());
        Assert.False(string.IsNullOrWhiteSpace(
            returnProblem.GetProperty("correlationId").GetString()));

        var afterSecondReturn = await ReadLoanStateAsync(factory, loanId);
        Assert.Equal(afterFirstReturn.ScheduledReturnDate, afterSecondReturn.ScheduledReturnDate);
        Assert.Equal(afterFirstReturn.EffectiveReturnDate, afterSecondReturn.EffectiveReturnDate);
        Assert.Equal(afterFirstReturn.ProductQuantity, afterSecondReturn.ProductQuantity);
    }

    [Fact]
    public async Task ApprovedLegacyLoanWithoutOutflowEvidenceCannotBeReturned()
    {
        var seeded = await SeedScenarioAsync("loan-return-without-approval-evidence");
        await using var factory = seeded.Factory;
        var scenario = seeded.Scenario;

        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var loan = await context.Emprestimos.SingleAsync(item => item.Id == scenario.LoanId);
            loan.Status = StatusEmprestimo.Aprovado;
            loan.AprovadorId = null;
            loan.DataAprovacao = null;
            await context.SaveChangesAsync();
        }

        using var client = await CreateAuthenticatedClientAsync(
            factory,
            scenario.AdministratorEmail,
            scenario.AdministratorPassword);
        using var response = await SendPatchAsync(
            client,
            $"/api/Emprestimos/devolver/{scenario.LoanId}");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        using var problem = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("loan_not_approved_for_return", problem.RootElement.GetProperty("code").GetString());
        var state = await ReadLoanStateAsync(factory, scenario.LoanId);
        Assert.Null(state.EffectiveReturnDate);
        Assert.Equal(10, state.ProductQuantity);
    }

    [Fact]
    public async Task MentorCanReturnMenteeLoanAndExpiredStockRemainsExpired()
    {
        var seeded = await SeedScenarioAsync("mentor-returns-expired-product");
        await using var factory = seeded.Factory;
        var scenario = seeded.Scenario;

        using (var administrator = await CreateAuthenticatedClientAsync(
            factory,
            scenario.AdministratorEmail,
            scenario.AdministratorPassword))
        using (var approval = await SendPatchAsync(
            administrator,
            $"/api/Emprestimos/aprovar/{scenario.LoanId}"))
        {
            Assert.Equal(HttpStatusCode.NoContent, approval.StatusCode);
        }

        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var product = await context.Produtos.SingleAsync(item => item.Id == scenario.ProductId);
            product.DataValidade = ScenarioNow.UtcDateTime.Date.AddDays(-1);
            await context.SaveChangesAsync();
        }

        using var mentor = await CreateAuthenticatedClientAsync(
            factory,
            scenario.ResponsibleEmail,
            scenario.ResponsiblePassword);
        using var response = await SendPatchAsync(
            mentor,
            $"/api/Emprestimos/devolver/{scenario.LoanId}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var state = await ReadLoanStateAsync(factory, scenario.LoanId);
        Assert.Equal(10, state.ProductQuantity);
        await using var finalScope = factory.Services.CreateAsyncScope();
        var finalContext = finalScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var returnedProduct = await finalContext.Produtos
            .AsNoTracking()
            .SingleAsync(item => item.Id == scenario.ProductId);
        Assert.Equal(StatusProduto.Vencido, returnedProduct.Status);
    }

    [Fact]
    public async Task OverdueNotificationsUseScheduledDeadlineAndIgnoreReturnedLoans()
    {
        var seeded = await SeedScenarioAsync("loan-return-notification");
        await using var factory = seeded.Factory;
        var scenario = seeded.Scenario;

        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var loan = await context.Emprestimos.SingleAsync(item => item.Id == scenario.LoanId);
            loan.Status = StatusEmprestimo.Aprovado;
            loan.DataAprovacao = ScenarioNow.UtcDateTime;
            loan.DataPrevistaDevolucao = ScenarioNow.UtcDateTime.AddDays(-1);
            loan.DataDevolucao = null;
            await context.SaveChangesAsync();
        }

        using var client = await CreateAuthenticatedClientAsync(
            factory,
            scenario.AdministratorEmail,
            scenario.AdministratorPassword);
        using var triggerResponse = await client.PostAsync(
            "/api/Notificacoes/verificar-emprestimos-vencidos",
            content: null);

        Assert.Equal(HttpStatusCode.OK, triggerResponse.StatusCode);

        await using var verificationScope = factory.Services.CreateAsyncScope();
        var verificationContext = verificationScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var notification = await verificationContext.Notificacoes
            .AsNoTracking()
            .SingleAsync(item =>
                item.TipoReferencia == "EmprestimoVencido" &&
                item.ReferenciaId == scenario.LoanId);
        Assert.Contains("1 dias", notification.Titulo);

        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var loan = await context.Emprestimos.SingleAsync(item => item.Id == scenario.LoanId);
            loan.DataDevolucao = ScenarioNow.UtcDateTime;
            await context.SaveChangesAsync();
        }

        using var secondTriggerResponse = await client.PostAsync(
            "/api/Notificacoes/verificar-emprestimos-vencidos",
            content: null);
        Assert.Equal(HttpStatusCode.OK, secondTriggerResponse.StatusCode);

        await using var finalScope = factory.Services.CreateAsyncScope();
        var finalContext = finalScope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(
            1,
            await finalContext.Notificacoes.CountAsync(item =>
                item.TipoReferencia == "EmprestimoVencido" &&
                item.ReferenciaId == scenario.LoanId));
    }

    [Fact]
    public async Task AutomaticNotificationsEndpointPreservesSuccessContract()
    {
        var seeded = await SeedScenarioAsync("automatic-notification-contract");
        await using var factory = seeded.Factory;
        var scenario = seeded.Scenario;

        using var client = await CreateAuthenticatedClientAsync(
            factory,
            scenario.AdministratorEmail,
            scenario.AdministratorPassword);

        using var response = await client.PostAsync(
            "/api/Notificacoes/gerar-automaticas",
            content: null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(
            "Notificações automáticas geradas com sucesso",
            document.RootElement.GetProperty("message").GetString());
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
        await scenario.PersistAsync(
            context,
            scope.ServiceProvider.GetRequiredService<IPasswordHasher<Usuario>>(),
            clock);

        return (factory, scenario);
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
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private static async Task<HttpResponseMessage> SendPatchAsync(
        HttpClient client,
        string path)
    {
        using var request = new HttpRequestMessage(HttpMethod.Patch, path);
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
            .Select(loan => new LoanState(
                loan.Status,
                loan.DataPrevistaDevolucao,
                loan.DataDevolucao,
                loan.Produtos.Sum(item => item.Produto!.Quantidade)))
            .SingleAsync();
    }

    private sealed record LoanState(
        StatusEmprestimo Status,
        DateTime? ScheduledReturnDate,
        DateTime? EffectiveReturnDate,
        float ProductQuantity);

    private static readonly DateTimeOffset ScenarioNow =
        new(2026, 9, 14, 12, 0, 0, TimeSpan.Zero);
}
