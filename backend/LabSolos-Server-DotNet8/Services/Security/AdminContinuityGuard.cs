using System.Data;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace LabSolos_Server_DotNet8.Services.Security;

/// <summary>
/// Account writers acquire this transaction before reading or locking a target, check the
/// proposed role/state/existence, persist, and commit while still holding the same lock.
/// Administrative grants must use this boundary too; no new grant endpoint is defined here.
/// </summary>
public sealed class AdminContinuityGuard(AppDbContext context)
{
    public const string ConflictCode = "admin_continuity_required";
    // Database-wide coordination, independent of the target account and application process.
    private const long CoordinationKey = 0x4c41424f4e41444d;
    private Guid? _lockedTransactionId;

    public async Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default)
    {
        if (!context.Database.IsNpgsql())
            throw new InvalidOperationException("Administrative continuity requires PostgreSQL transactional storage.");

        var transaction = await context.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, cancellationToken);
        try
        {
            await context.Database.ExecuteSqlInterpolatedAsync(
                $"SELECT pg_advisory_xact_lock({CoordinationKey})", cancellationToken);
            _lockedTransactionId = transaction.TransactionId;
            return transaction;
        }
        catch
        {
            await transaction.DisposeAsync();
            throw;
        }
    }

    public async Task<bool> CanApplyAsync(
        int userId,
        NivelUsuario resultingRole,
        StatusUsuario resultingStatus,
        bool delete = false,
        CancellationToken cancellationToken = default)
    {
        if (context.Database.CurrentTransaction is not { } transaction ||
            transaction.TransactionId != _lockedTransactionId)
            throw new InvalidOperationException("Acquire the continuity transaction before checking an account mutation.");

        // Read the persisted matrix after coordination; tracked snapshots cannot authorize a withdrawal.
        var current = await context.Usuarios.AsNoTracking().SingleOrDefaultAsync(
            user => user.Id == userId, cancellationToken);
        if (current is null || !PoliticaContas.IsEnabledAdministrator(current)) return true;

        var resulting = new Usuario
        {
            NomeCompleto = string.Empty, Email = string.Empty, SenhaHash = string.Empty,
            NivelUsuario = resultingRole, Status = resultingStatus
        };
        if (!delete && PoliticaContas.IsEnabledAdministrator(resulting)) return true;

        return await context.Usuarios.AsNoTracking().AnyAsync(user =>
            user.Id != userId && user.NivelUsuario == NivelUsuario.Administrador &&
            user.Status == StatusUsuario.Habilitado, cancellationToken);
    }
}
