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
    private sealed record RestoredLoanProduct(Produto Product, ProdutoEmprestado Item, float Quantity);

    public async Task<LoanReturnResult> ReturnAsync(
        int loanId,
        int actorId,
        string? correlationId = null,
        CancellationToken cancellationToken = default)
    {
        await using var transaction = await unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var loan = await LoadAndLockLoanAsync(loanId, cancellationToken);
            if (loan is null)
                return await RollbackAsync(transaction, LoanReturnResult.NotFound(), cancellationToken);

            var accessFailure = await ValidateActorAsync(loan, actorId, cancellationToken);
            if (accessFailure is not null)
                return await RollbackAsync(transaction, accessFailure, cancellationToken);

            var eligibilityFailure = await ValidateReturnEligibilityAsync(loan, loanId, cancellationToken);
            if (eligibilityFailure is not null)
                return await RollbackAsync(transaction, eligibilityFailure, cancellationToken);

            var changes = CreateValidatedChanges(loan, out var stockConflictCode);
            if (stockConflictCode is not null)
                return await RollbackAsync(
                    transaction, LoanReturnResult.Conflict(stockConflictCode), cancellationToken);

            var now = timeProvider.GetUtcNow().UtcDateTime;
            var today = productCivilDay.GetToday();
            ApplyReturnChanges(loan, changes!, actorId, now, today);

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

    private async Task<Emprestimo?> LoadAndLockLoanAsync(int loanId, CancellationToken cancellationToken)
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

        return await context.Emprestimos
            .Include(item => item.Produtos)
                .ThenInclude(item => item.Produto)
            .FirstOrDefaultAsync(item => item.Id == loanId, cancellationToken);
    }

    private async Task<LoanReturnResult?> ValidateActorAsync(
        Emprestimo loan,
        int actorId,
        CancellationToken cancellationToken)
    {
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
            return LoanReturnResult.NotFound();

        var isAuthorizedMentor = actor.NivelUsuario == NivelUsuario.Mentor &&
            (loan.SolicitanteId == actorId ||
             (borrower?.NivelUsuario == NivelUsuario.Mentorado && borrower.ResponsavelId == actorId));
        return actor.NivelUsuario == NivelUsuario.Administrador || isAuthorizedMentor
            ? null
            : LoanReturnResult.NotFound();
    }

    private async Task<LoanReturnResult?> ValidateReturnEligibilityAsync(
        Emprestimo loan,
        int loanId,
        CancellationToken cancellationToken)
    {
        if (loan.DataDevolucao is not null || await HasReturnMovementAsync(loanId, cancellationToken))
            return LoanReturnResult.Conflict("loan_return_already_recorded");

        if (loan.Status is not (StatusEmprestimo.Aprovado or StatusEmprestimo.EmAndamento) ||
            loan.Produtos.Count == 0 || loan.Produtos.Any(item => item.Produto is null))
            return LoanReturnResult.Conflict("loan_not_approved_for_return");

        var hasLegacyApprovalEvidence = loan.AprovadorId is not null && loan.DataAprovacao is not null;
        foreach (var item in loan.Produtos)
        {
            if (hasLegacyApprovalEvidence)
                continue;

            var hasRecordedOutflow = await context.MovimentacoesEstoque
                .AnyAsync(movement =>
                    movement.EmprestimoId == loanId &&
                    movement.ProdutoId == item.ProdutoId &&
                    movement.Tipo == TipoMovimentacaoEstoque.SaidaEmprestimo,
                    cancellationToken);
            if (!hasRecordedOutflow)
                return LoanReturnResult.Conflict("loan_not_approved_for_return");
        }

        return null;
    }

    private static List<RestoredLoanProduct>? CreateValidatedChanges(
        Emprestimo loan,
        out string? conflictCode)
    {
        conflictCode = null;
        var changes = new List<RestoredLoanProduct>();
        foreach (var item in loan.Produtos.OrderBy(item => item.ProdutoId))
        {
            var violation = LoanDomainRules.ValidateCredit(
                item.Produto.Quantidade,
                item.Quantidade,
                out var restored);
            if (violation is not null)
            {
                conflictCode = violation.Code == "loan_stock_out_of_range"
                    ? "loan_stock_out_of_range"
                    : "loan_concurrent_conflict";
                return null;
            }

            changes.Add(new RestoredLoanProduct(item.Produto, item, restored));
        }

        return changes;
    }

    private void ApplyReturnChanges(
        Emprestimo loan,
        IEnumerable<RestoredLoanProduct> changes,
        int actorId,
        DateTime now,
        DateOnly today)
    {
        foreach (var change in changes)
        {
            var product = change.Product;
            product.Quantidade = change.Quantity;
            product.UltimaModificacao = now;
            if (!product.Desativado)
            {
                product.Status = product.DataValidade is { } expiration &&
                    ProductCivilDay.FromStoredDate(expiration) < today
                        ? StatusProduto.Vencido
                        : change.Quantity > 0
                            ? StatusProduto.Disponivel
                            : StatusProduto.Esgotado;
            }

            context.MovimentacoesEstoque.Add(new MovimentacaoEstoque
            {
                EmprestimoId = loan.Id,
                ProdutoId = product.Id,
                Quantidade = change.Item.Quantidade,
                Instante = now,
                AtorId = actorId,
                LoteId = product.LoteId,
                Tipo = TipoMovimentacaoEstoque.DevolucaoEmprestimo
            });
        }
    }

    private static async Task<LoanReturnResult> RollbackAsync(
        Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction transaction,
        LoanReturnResult result,
        CancellationToken cancellationToken)
    {
        await transaction.RollbackAsync(cancellationToken);
        return result;
    }

    private async Task LockUsersAsync(int[] userIds, CancellationToken cancellationToken)
    {
        var orderedIds = userIds.Distinct().Order().ToArray();
        await context.Usuarios
            .FromSqlRaw("SELECT * FROM \"Usuarios\" WHERE \"Id\" = ANY (@orderedIds) ORDER BY \"Id\" FOR UPDATE",
                new Npgsql.NpgsqlParameter("orderedIds", NpgsqlTypes.NpgsqlDbType.Array | NpgsqlTypes.NpgsqlDbType.Integer)
                {
                    Value = orderedIds
                })
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
