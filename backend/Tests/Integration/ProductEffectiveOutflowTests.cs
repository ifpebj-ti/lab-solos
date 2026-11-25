using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class ProductEffectiveOutflowTests(PostgreSqlContainerFixture database)
{
    [Fact]
    public async Task DurableOutflowRemainsVisibleOnceAfterReturnAndUsesTheCapturedLot()
    {
        var seeded = await SeedScenarioAsync("effective-outflow-returned-with-lot");
        await using var factory = seeded.Factory;
        var scenario = seeded.Scenario;
        var capturedLotId = await AddLotAsync(factory, "LOTE-HISTORICO-CAPTURADO");
        var currentLotId = await AddLotAsync(factory, "LOTE-CORRENTE-ALTERADO");
        await RecordReturnedOutflowAsync(factory, scenario, capturedLotId, currentLotId);

        var result = await QueryAsync(factory, scenario.ProductId);

        var outflow = Assert.Single(result.Outflows);
        Assert.Equal(scenario.LoanId, outflow.EmprestimoId);
        Assert.Equal(scenario.ProductId, outflow.ProdutoId);
        Assert.Equal(CriticalScenarioData.LoanQuantity, outflow.Quantidade);
        Assert.Equal(ApprovalInstant, outflow.Instante);
        Assert.Equal(capturedLotId, outflow.LoteId);
        Assert.Equal("LOTE-HISTORICO-CAPTURADO", outflow.CodigoLote);
        Assert.True(outflow.Devolvido);
        Assert.Equal(ProductOutflowEvidence.DurableMovement, outflow.Evidencia);
        Assert.Empty(result.Gaps);
    }

    [Fact]
    public async Task PendingAndRejectedLoansWithoutOutflowAreOmitted()
    {
        var seeded = await SeedScenarioAsync("effective-outflow-no-unapproved-output");
        await using var factory = seeded.Factory;
        await AddLoanAsync(factory, seeded.Scenario, seeded.Scenario.LoanId + 1, StatusEmprestimo.Rejeitado);

        var result = await QueryAsync(factory, seeded.Scenario.ProductId);

        Assert.Empty(result.Outflows);
        Assert.Empty(result.Gaps);
    }

    [Fact]
    public async Task LegacyApprovedLoanWithoutApprovalTimestampIsReportedAsEvidenceGap()
    {
        var seeded = await SeedScenarioAsync("effective-outflow-ambiguous-legacy");
        await using var factory = seeded.Factory;
        await SetLegacyApprovalAsync(factory, seeded.Scenario.LoanId, approvalInstant: null);

        var result = await QueryAsync(factory, seeded.Scenario.ProductId);

        Assert.Empty(result.Outflows);
        var gap = Assert.Single(result.Gaps);
        Assert.Equal(seeded.Scenario.LoanId, gap.EmprestimoId);
        Assert.Equal(seeded.Scenario.ProductId, gap.ProdutoId);
        Assert.Equal(ProductOutflowGapReason.ApprovalTimestampMissing, gap.Motivo);
    }

    [Fact]
    public async Task LegacyApprovalTimestampIsAcceptedWithoutInferringCurrentLot()
    {
        var seeded = await SeedScenarioAsync("effective-outflow-legacy-approval-evidence");
        await using var factory = seeded.Factory;
        await AddLotAsync(factory, "LOTE-ATUAL-NAO-HISTORICO");
        await SetLegacyApprovalAsync(factory, seeded.Scenario.LoanId, ApprovalInstant);

        var result = await QueryAsync(factory, seeded.Scenario.ProductId);

        var outflow = Assert.Single(result.Outflows);
        Assert.Equal(ApprovalInstant, outflow.Instante);
        Assert.Null(outflow.LoteId);
        Assert.Null(outflow.CodigoLote);
        Assert.False(outflow.Devolvido);
        Assert.Equal(ProductOutflowEvidence.LegacyApprovalTimestamp, outflow.Evidencia);
        Assert.Empty(result.Gaps);
    }

    private async Task<(IntegrationWebApplicationFactory Factory, CriticalScenarioData Scenario)> SeedScenarioAsync(
        string scenarioKey)
    {
        var scenario = CriticalScenarioData.Create(scenarioKey);
        var factory = new IntegrationWebApplicationFactory(database);
        await factory.RecreateDatabaseAsync();

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<Usuario>>();
        await scenario.PersistAsync(context, hasher, TimeProvider.System);
        return (factory, scenario);
    }

    private static async Task<int> AddLotAsync(IntegrationWebApplicationFactory factory, string lotCode)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var lot = new Lote { CodigoLote = lotCode };
        context.Lotes.Add(lot);
        await context.SaveChangesAsync();
        return lot.Id;
    }

    private static async Task AddLoanAsync(
        IntegrationWebApplicationFactory factory,
        CriticalScenarioData scenario,
        int loanId,
        StatusEmprestimo status)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        context.Emprestimos.Add(new Emprestimo
        {
            Id = loanId,
            DataRealizacao = ApprovalInstant.AddDays(-1),
            DataPrevistaDevolucao = ApprovalInstant.AddDays(7),
            Status = status,
            SolicitanteId = scenario.BorrowerId,
            Produtos =
            [
                new ProdutoEmprestado
                {
                    ProdutoId = scenario.ProductId,
                    Quantidade = CriticalScenarioData.LoanQuantity
                }
            ]
        });
        await context.SaveChangesAsync();
    }

    private static async Task RecordReturnedOutflowAsync(
        IntegrationWebApplicationFactory factory,
        CriticalScenarioData scenario,
        int capturedLotId,
        int currentLotId)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var loan = await context.Emprestimos.SingleAsync(item => item.Id == scenario.LoanId);
        var product = await context.Produtos.SingleAsync(item => item.Id == scenario.ProductId);
        loan.Status = StatusEmprestimo.EmAndamento;
        loan.DataAprovacao = ApprovalInstant;
        loan.DataDevolucao = ReturnInstant;
        loan.AprovadorId = scenario.AdministratorId;
        product.LoteId = currentLotId;
        context.MovimentacoesEstoque.AddRange(
            new MovimentacaoEstoque
            {
                EmprestimoId = scenario.LoanId,
                ProdutoId = scenario.ProductId,
                Quantidade = CriticalScenarioData.LoanQuantity,
                Instante = ApprovalInstant,
                AtorId = scenario.AdministratorId,
                LoteId = capturedLotId,
                Tipo = TipoMovimentacaoEstoque.SaidaEmprestimo
            },
            new MovimentacaoEstoque
            {
                EmprestimoId = scenario.LoanId,
                ProdutoId = scenario.ProductId,
                Quantidade = CriticalScenarioData.LoanQuantity,
                Instante = ReturnInstant,
                AtorId = scenario.AdministratorId,
                LoteId = currentLotId,
                Tipo = TipoMovimentacaoEstoque.DevolucaoEmprestimo
            });
        await context.SaveChangesAsync();
    }

    private static async Task SetLegacyApprovalAsync(
        IntegrationWebApplicationFactory factory,
        int loanId,
        DateTime? approvalInstant)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var loan = await context.Emprestimos.SingleAsync(item => item.Id == loanId);
        loan.Status = StatusEmprestimo.Aprovado;
        loan.DataAprovacao = approvalInstant;
        await context.SaveChangesAsync();
    }

    private static async Task<ProductEffectiveOutflowResult> QueryAsync(
        IntegrationWebApplicationFactory factory,
        int productId)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await new ProductEffectiveOutflowQuery(context).QueryForProductAsync(productId);
    }

    private static readonly DateTime ApprovalInstant =
        new(2026, 11, 10, 12, 0, 0, DateTimeKind.Utc);

    private static readonly DateTime ReturnInstant =
        new(2026, 11, 12, 13, 0, 0, DateTimeKind.Utc);
}
