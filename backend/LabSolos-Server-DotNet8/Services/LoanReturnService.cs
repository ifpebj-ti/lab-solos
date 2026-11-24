using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.DTOs.Auditoria;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace LabSolos_Server_DotNet8.Services;

public interface ILoanReturnService
{
    Task<LoanReturnResult> ReturnAsync(
        int loanId,
        int actorId,
        string? correlationId = null,
        CancellationToken cancellationToken = default);
}

public sealed record LoanReturnResult(bool Succeeded, bool LoanNotFound, string? ConflictCode)
{
    public static LoanReturnResult Success() => new(true, false, null);

    public static LoanReturnResult NotFound() => new(false, true, null);

    public static LoanReturnResult Conflict(string code) => new(false, false, code);
}

public sealed class LoanReturnService(
    IUnitOfWork unitOfWork,
    AppDbContext context,
    IAuditoriaService auditService,
    TimeProvider timeProvider,
    ProductCivilDay productCivilDay) : ILoanReturnService
{
    public async Task<LoanReturnResult> ReturnAsync(
        int loanId,
        int actorId,
        string? correlationId = null,
        CancellationToken cancellationToken = default)
    {
        await using var transaction = await unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var productIds = await context.ProdutosEmprestados
                .AsNoTracking()
                .Where(item => item.EmprestimoId == loanId)
                .OrderBy(item => item.ProdutoId)
                .Select(item => item.ProdutoId)
                .ToArrayAsync(cancellationToken);

            // Keep the same product-before-loan lock order as approval and other stock writers.
            await unitOfWork.LockProductsForMutationAsync(productIds, cancellationToken);
            await context.Emprestimos
                .FromSqlInterpolated($"SELECT * FROM \"Emprestimos\" WHERE \"Id\" = {loanId} FOR UPDATE")
                .LoadAsync(cancellationToken);

            var loan = await context.Emprestimos
                .Include(item => item.Produtos)
                    .ThenInclude(item => item.Produto)
                .FirstOrDefaultAsync(item => item.Id == loanId, cancellationToken);
            if (loan is null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return LoanReturnResult.NotFound();
            }

            await LockUsersAsync([actorId, loan.SolicitanteId], cancellationToken);
            var users = await context.Usuarios
                .AsNoTracking()
                .Where(item => item.Id == actorId || item.Id == loan.SolicitanteId)
                .ToDictionaryAsync(item => item.Id, cancellationToken);
            users.TryGetValue(actorId, out var actor);
            users.TryGetValue(loan.SolicitanteId, out var borrower);

            // Recheck the current profile, status and mentor relationship while the rows are locked.
            if (actor is null || actor.Status != StatusUsuario.Habilitado ||
                actor.NivelUsuario is not (NivelUsuario.Administrador or NivelUsuario.Mentor))
            {
                await transaction.RollbackAsync(cancellationToken);
                return LoanReturnResult.NotFound();
            }

            var isAuthorizedMentor = actor.NivelUsuario == NivelUsuario.Mentor &&
                (loan.SolicitanteId == actorId ||
                 (borrower?.NivelUsuario == NivelUsuario.Mentorado &&
                  borrower.ResponsavelId == actorId));
            if (actor.NivelUsuario != NivelUsuario.Administrador && !isAuthorizedMentor)
            {
                // Keep the response identical to a missing loan until the actor is in its current scope.
                await transaction.RollbackAsync(cancellationToken);
                return LoanReturnResult.NotFound();
            }

            if (loan.DataDevolucao is not null || await HasReturnMovementAsync(loanId, cancellationToken))
            {
                await transaction.RollbackAsync(cancellationToken);
                return LoanReturnResult.Conflict("loan_return_already_recorded");
            }

            if (loan.Status is not (StatusEmprestimo.Aprovado or StatusEmprestimo.EmAndamento))
            {
                await transaction.RollbackAsync(cancellationToken);
                return LoanReturnResult.Conflict("loan_not_approved_for_return");
            }

            if (loan.Produtos.Count == 0 || loan.Produtos.Any(item => item.Produto is null))
            {
                await transaction.RollbackAsync(cancellationToken);
                return LoanReturnResult.Conflict("loan_not_approved_for_return");
            }

            var hasLegacyApprovalEvidence = loan.AprovadorId is not null && loan.DataAprovacao is not null;
            foreach (var item in loan.Produtos)
            {
                var hasRecordedOutflow = await context.MovimentacoesEstoque
                    .AnyAsync(movement =>
                        movement.EmprestimoId == loanId &&
                        movement.ProdutoId == item.ProdutoId &&
                        movement.Tipo == TipoMovimentacaoEstoque.SaidaEmprestimo,
                        cancellationToken);
                if (!hasRecordedOutflow && !hasLegacyApprovalEvidence)
                {
                    await transaction.RollbackAsync(cancellationToken);
                    return LoanReturnResult.Conflict("loan_not_approved_for_return");
                }
            }

            var changes = new List<(Produto Product, ProdutoEmprestado Item, float Restored)>();
            foreach (var item in loan.Produtos.OrderBy(item => item.ProdutoId))
            {
                var violation = LoanDomainRules.ValidateCredit(
                    item.Produto.Quantidade,
                    item.Quantidade,
                    out var restored);
                if (violation is not null)
                {
                    await transaction.RollbackAsync(cancellationToken);
                    return LoanReturnResult.Conflict(
                        violation.Code == "loan_stock_out_of_range"
                            ? "loan_stock_out_of_range"
                            : "loan_concurrent_conflict");
                }

                changes.Add((item.Produto, item, restored));
            }

            var now = timeProvider.GetUtcNow().UtcDateTime;
            var today = productCivilDay.GetToday();
            foreach (var (product, item, restored) in changes)
            {
                product.Quantidade = restored;
                product.UltimaModificacao = now;
                if (!product.Desativado)
                {
                    product.Status = product.DataValidade is { } expiration &&
                        ProductCivilDay.FromStoredDate(expiration) < today
                            ? StatusProduto.Vencido
                            : restored > 0
                                ? StatusProduto.Disponivel
                                : StatusProduto.Esgotado;
                }

                context.MovimentacoesEstoque.Add(new MovimentacaoEstoque
                {
                    EmprestimoId = loan.Id,
                    ProdutoId = product.Id,
                    Quantidade = item.Quantidade,
                    Instante = now,
                    AtorId = actorId,
                    LoteId = product.LoteId,
                    Tipo = TipoMovimentacaoEstoque.DevolucaoEmprestimo
                });
            }

            loan.DataDevolucao = now;
            await auditService.RegistrarEventoObrigatorioAsync(new CreateLogAuditoriaDTO
            {
                CodigoEvento = CodigoEventoAuditoria.DevolucaoEmprestimo,
                OrigemConfiavel = OrigemConfiavelAuditoria.UsuarioAutenticado,
                UsuarioId = actorId,
                ReferenciaRecurso = loan.Id.ToString(System.Globalization.CultureInfo.InvariantCulture),
                CorrelationId = correlationId,
                Resultado = ResultadoOperacaoAuditoria.Sucesso
            });

            await unitOfWork.CommitAsync();
            await transaction.CommitAsync(cancellationToken);
            return LoanReturnResult.Success();
        }
        catch (Exception error) when (IsUniqueReturnViolation(error))
        {
            await transaction.RollbackAsync(CancellationToken.None);
            return LoanReturnResult.Conflict("loan_return_already_recorded");
        }
        catch (Exception error) when (IsConcurrencyConflict(error))
        {
            await transaction.RollbackAsync(CancellationToken.None);
            return LoanReturnResult.Conflict("loan_concurrent_conflict");
        }
        catch
        {
            await transaction.RollbackAsync(CancellationToken.None);
            throw;
        }
    }

    private async Task LockUsersAsync(int[] userIds, CancellationToken cancellationToken)
    {
        var orderedIds = userIds.Distinct().Order().ToArray();
        await context.Usuarios
            .FromSqlInterpolated($"SELECT * FROM \"Usuarios\" WHERE \"Id\" = ANY ({orderedIds}) ORDER BY \"Id\" FOR UPDATE")
            .LoadAsync(cancellationToken);
    }

    private Task<bool> HasReturnMovementAsync(int loanId, CancellationToken cancellationToken) =>
        context.MovimentacoesEstoque.AnyAsync(movement =>
            movement.EmprestimoId == loanId &&
            movement.Tipo == TipoMovimentacaoEstoque.DevolucaoEmprestimo,
            cancellationToken);

    private static bool IsUniqueReturnViolation(Exception error)
    {
        var postgresError = FindPostgresException(error);
        return postgresError?.SqlState == PostgresErrorCodes.UniqueViolation &&
            postgresError.ConstraintName is
                "UX_MovimentacoesEstoque_Emprestimo_Produto_Tipo" or
                "UX_LogsAuditoria_DevolucaoEmprestimo_Recurso";
    }

    private static bool IsConcurrencyConflict(Exception error)
    {
        var postgresError = FindPostgresException(error);
        return postgresError?.SqlState is
            PostgresErrorCodes.SerializationFailure or PostgresErrorCodes.DeadlockDetected ||
            error is DbUpdateConcurrencyException;
    }

    private static PostgresException? FindPostgresException(Exception error)
    {
        for (var current = error; current is not null; current = current.InnerException!)
        {
            if (current is PostgresException postgresError)
            {
                return postgresError;
            }
        }

        return null;
    }
}
