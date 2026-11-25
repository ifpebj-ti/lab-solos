using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using Microsoft.EntityFrameworkCore;

namespace LabSolos_Server_DotNet8.Services;

public interface IProductLifecycleService
{
    Task<ProductLifecycleResult> DeleteAsync(int productId, CancellationToken cancellationToken = default);

    Task<ProductLifecycleResult> DeactivateAsync(int productId, CancellationToken cancellationToken = default);

    Task<ProductLifecycleResult> ReactivateAsync(int productId, CancellationToken cancellationToken = default);
}

public sealed record ProductLifecycleResult(bool Succeeded, bool ProductNotFound, string? ConflictCode)
{
    public static ProductLifecycleResult Success() => new(true, false, null);

    public static ProductLifecycleResult NotFound() => new(false, true, null);

    public static ProductLifecycleResult Conflict(string code) => new(false, false, code);
}

public sealed class ProductLifecycleService(
    AppDbContext context,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IProductLifecycleService
{
    private readonly AppDbContext _context = context;
    private readonly IUnitOfWork _unitOfWork = unitOfWork;
    private readonly TimeProvider _timeProvider = timeProvider;

    public async Task<ProductLifecycleResult> DeleteAsync(
        int productId,
        CancellationToken cancellationToken = default)
    {
        await using var transaction = await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            await _unitOfWork.LockProductsForMutationAsync([productId], cancellationToken);
            var product = await _context.Produtos.SingleOrDefaultAsync(
                item => item.Id == productId,
                cancellationToken);
            if (product is null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return ProductLifecycleResult.NotFound();
            }

            var hasLoanReference = await _context.ProdutosEmprestados
                .AnyAsync(item => item.ProdutoId == productId, cancellationToken);
            var hasMovement = await _context.MovimentacoesEstoque
                .AnyAsync(item => item.ProdutoId == productId, cancellationToken);
            if (hasLoanReference || hasMovement || product.LoteId is not null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return ProductLifecycleResult.Conflict("product_has_dependencies");
            }

            _context.Produtos.Remove(product);
            await _unitOfWork.CommitAsync();
            await transaction.CommitAsync(cancellationToken);
            return ProductLifecycleResult.Success();
        }
        catch
        {
            await transaction.RollbackAsync(CancellationToken.None);
            throw;
        }
    }

    public Task<ProductLifecycleResult> DeactivateAsync(
        int productId,
        CancellationToken cancellationToken = default) => ChangeActivationAsync(
            productId,
            deactivate: true,
            cancellationToken);

    public Task<ProductLifecycleResult> ReactivateAsync(
        int productId,
        CancellationToken cancellationToken = default) => ChangeActivationAsync(
            productId,
            deactivate: false,
            cancellationToken);

    private async Task<ProductLifecycleResult> ChangeActivationAsync(
        int productId,
        bool deactivate,
        CancellationToken cancellationToken)
    {
        await using var transaction = await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            await _unitOfWork.LockProductsForMutationAsync([productId], cancellationToken);
            var product = await _context.Produtos.SingleOrDefaultAsync(
                item => item.Id == productId,
                cancellationToken);
            if (product is null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return ProductLifecycleResult.NotFound();
            }

            if (product.Desativado == deactivate)
            {
                await transaction.RollbackAsync(cancellationToken);
                return ProductLifecycleResult.Conflict(
                    deactivate ? "product_already_deactivated" : "product_already_active");
            }

            product.Desativado = deactivate;
            product.UltimaModificacao = _timeProvider.GetUtcNow().UtcDateTime;
            await _unitOfWork.CommitAsync();
            await transaction.CommitAsync(cancellationToken);
            return ProductLifecycleResult.Success();
        }
        catch
        {
            await transaction.RollbackAsync(CancellationToken.None);
            throw;
        }
    }
}
