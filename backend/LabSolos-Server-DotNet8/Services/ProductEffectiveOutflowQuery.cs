using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using Microsoft.EntityFrameworkCore;

namespace LabSolos_Server_DotNet8.Services;

public enum ProductOutflowEvidence
{
    DurableMovement,
    LegacyApprovalTimestamp
}

public enum ProductOutflowGapReason
{
    ApprovalTimestampMissing
}

public sealed record ProductEffectiveOutflow(
    int EmprestimoId,
    int ProdutoId,
    int Quantidade,
    DateTime Instante,
    int? LoteId,
    string? CodigoLote,
    bool Devolvido,
    ProductOutflowEvidence Evidencia);

public sealed record ProductOutflowEvidenceGap(
    int EmprestimoId,
    int ProdutoId,
    ProductOutflowGapReason Motivo);

public sealed record ProductEffectiveOutflowResult(
    IReadOnlyList<ProductEffectiveOutflow> Outflows,
    IReadOnlyList<ProductOutflowEvidenceGap> Gaps);

public sealed class ProductEffectiveOutflowQuery(AppDbContext context)
{
    public async Task<ProductEffectiveOutflowResult> QueryForProductAsync(
        int productId,
        CancellationToken cancellationToken = default)
    {
        var outflows = await context.MovimentacoesEstoque
            .AsNoTracking()
            .Where(movement =>
                movement.ProdutoId == productId &&
                movement.Tipo == TipoMovimentacaoEstoque.SaidaEmprestimo)
            .OrderBy(movement => movement.Instante)
            .ThenBy(movement => movement.EmprestimoId)
            .Select(movement => new ProductEffectiveOutflow(
                movement.EmprestimoId,
                movement.ProdutoId,
                movement.Quantidade,
                movement.Instante,
                movement.LoteId,
                movement.Lote == null ? null : movement.Lote.CodigoLote,
                context.MovimentacoesEstoque.Any(returnMovement =>
                    returnMovement.EmprestimoId == movement.EmprestimoId &&
                    returnMovement.ProdutoId == movement.ProdutoId &&
                    returnMovement.Tipo == TipoMovimentacaoEstoque.DevolucaoEmprestimo),
                ProductOutflowEvidence.DurableMovement))
            .ToListAsync(cancellationToken);

        var loansWithoutMovement = await context.ProdutosEmprestados
            .AsNoTracking()
            .Where(item =>
                item.ProdutoId == productId &&
                !context.MovimentacoesEstoque.Any(movement =>
                    movement.EmprestimoId == item.EmprestimoId &&
                    movement.ProdutoId == item.ProdutoId &&
                    movement.Tipo == TipoMovimentacaoEstoque.SaidaEmprestimo) &&
                (item.Emprestimo.Status == StatusEmprestimo.Aprovado ||
                 item.Emprestimo.Status == StatusEmprestimo.EmAndamento))
            .OrderBy(item => item.EmprestimoId)
            .Select(item => new
            {
                item.EmprestimoId,
                item.ProdutoId,
                item.Quantidade,
                item.Emprestimo.DataAprovacao,
                HasReturnMovement = context.MovimentacoesEstoque.Any(returnMovement =>
                    returnMovement.EmprestimoId == item.EmprestimoId &&
                    returnMovement.ProdutoId == item.ProdutoId &&
                    returnMovement.Tipo == TipoMovimentacaoEstoque.DevolucaoEmprestimo)
            })
            .ToListAsync(cancellationToken);

        var gaps = new List<ProductOutflowEvidenceGap>();
        foreach (var loan in loansWithoutMovement)
        {
            if (loan.DataAprovacao is { } approvalInstant)
            {
                outflows.Add(new ProductEffectiveOutflow(
                    loan.EmprestimoId,
                    loan.ProdutoId,
                    loan.Quantidade,
                    approvalInstant,
                    null,
                    null,
                    loan.HasReturnMovement,
                    ProductOutflowEvidence.LegacyApprovalTimestamp));
            }
            else
            {
                gaps.Add(new ProductOutflowEvidenceGap(
                    loan.EmprestimoId,
                    loan.ProdutoId,
                    ProductOutflowGapReason.ApprovalTimestampMissing));
            }
        }

        return new ProductEffectiveOutflowResult(
            outflows.OrderBy(outflow => outflow.Instante)
                .ThenBy(outflow => outflow.EmprestimoId)
                .ToArray(),
            gaps);
    }
}
