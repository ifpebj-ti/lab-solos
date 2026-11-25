using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace LabSolos_Server_DotNet8.Services;

public interface ILoanDecisionService
{
    Task<LoanDecisionResult> DecideAsync(
        int loanId,
        int actorId,
        bool approve,
        CancellationToken cancellationToken = default);
}

public sealed record LoanDecisionResult(bool Succeeded, bool LoanNotFound, string? ConflictCode)
{
    public static LoanDecisionResult Success() => new(true, false, null);

    public static LoanDecisionResult NotFound() => new(false, true, null);

    public static LoanDecisionResult Conflict(string code) => new(false, false, code);
}

public sealed class LoanDecisionService(
    IUnitOfWork unitOfWork,
    IEmprestimoRepository loanRepository,
    IProdutoRepository productRepository,
    AppDbContext context,
    ProductCivilDay productCivilDay,
    TimeProvider timeProvider) : ILoanDecisionService
{
    public async Task<LoanDecisionResult> DecideAsync(
        int loanId,
        int actorId,
        bool approve,
        CancellationToken cancellationToken = default)
    {
        await using var transaction = await unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            if (approve)
            {
                // All loan writers lock products in ascending order before locking the loan row.
                var productIds = await loanRepository.GetProductIdsForDecisionAsync(loanId, cancellationToken);
                await productRepository.LockForLoanDecisionAsync(productIds, cancellationToken);
            }

            await loanRepository.LockForDecisionAsync(loanId, cancellationToken);
            var loan = await loanRepository.GetForDecisionAsync(loanId, cancellationToken);
            if (loan is null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return LoanDecisionResult.NotFound();
            }

            if (loan.Status != StatusEmprestimo.Pendente)
            {
                var approvalWasRecorded = loan.Status is StatusEmprestimo.Aprovado or StatusEmprestimo.EmAndamento;
                var sameDecision = approve == approvalWasRecorded;
                await transaction.RollbackAsync(cancellationToken);
                return LoanDecisionResult.Conflict(
                    sameDecision
                        ? "loan_decision_already_recorded"
                        : "loan_opposite_decision_recorded");
            }

            var now = timeProvider.GetUtcNow().UtcDateTime;
            if (approve)
            {
                var changes = new List<(Produto Product, ProdutoEmprestado Item, float Remaining)>();
                foreach (var item in loan.Produtos.OrderBy(item => item.ProdutoId))
                {
                    var product = item.Produto;
                    if (product.Desativado)
                    {
                        await transaction.RollbackAsync(cancellationToken);
                        return LoanDecisionResult.Conflict("loan_product_deactivated");
                    }

                    var violation = LoanDomainRules.ValidateDebit(product.Quantidade, item.Quantidade, out var remaining);
                    if (violation is not null)
                    {
                        await transaction.RollbackAsync(cancellationToken);
                        return LoanDecisionResult.Conflict(
                            violation.Code == "loan_insufficient_stock"
                                ? "loan_insufficient_stock"
                                : "loan_concurrent_conflict");
                    }

                    changes.Add((product, item, remaining));
                }

                var today = productCivilDay.GetToday();
                foreach (var (product, item, remaining) in changes)
                {
                    product.Quantidade = remaining;
                    product.Status = product.DataValidade is { } expiration &&
                        ProductCivilDay.FromStoredDate(expiration) < today
                            ? StatusProduto.Vencido
                            : remaining > 0
                                ? StatusProduto.Disponivel
                                : StatusProduto.Esgotado;
                    product.UltimaModificacao = now;
                    context.MovimentacoesEstoque.Add(new MovimentacaoEstoque
                    {
                        EmprestimoId = loan.Id,
                        ProdutoId = product.Id,
                        Quantidade = item.Quantidade,
                        Instante = now,
                        AtorId = actorId,
                        LoteId = product.LoteId,
                        Tipo = TipoMovimentacaoEstoque.SaidaEmprestimo
                    });
                }

                loan.Status = StatusEmprestimo.Aprovado;
                loan.DataAprovacao = now;
            }
            else
            {
                loan.Status = StatusEmprestimo.Rejeitado;
            }

            loan.AprovadorId = actorId;
            await unitOfWork.CommitAsync();
            await transaction.CommitAsync(cancellationToken);
            return LoanDecisionResult.Success();
        }
        catch (Exception error) when (IsConcurrencyConflict(error))
        {
            await transaction.RollbackAsync(cancellationToken);
            return LoanDecisionResult.Conflict("loan_concurrent_conflict");
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    private static bool IsConcurrencyConflict(Exception error) => error switch
    {
        PostgresException { SqlState: PostgresErrorCodes.SerializationFailure or PostgresErrorCodes.DeadlockDetected or PostgresErrorCodes.UniqueViolation } => true,
        DbUpdateConcurrencyException => true,
        DbUpdateException { InnerException: PostgresException { SqlState: PostgresErrorCodes.SerializationFailure or PostgresErrorCodes.DeadlockDetected or PostgresErrorCodes.UniqueViolation } } => true,
        _ => false
    };
}
