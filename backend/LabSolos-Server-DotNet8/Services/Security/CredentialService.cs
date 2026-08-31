using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using System.Security.Cryptography;
using System.Text;

namespace LabSolos_Server_DotNet8.Services.Security;

public interface ICredentialService
{
    Task<CredentialChangeResult> ChangePasswordAsync(
        int userId,
        string? currentPassword,
        string? newPassword,
        string? confirmation,
        CancellationToken cancellationToken = default);

    Task<PasswordResetRequestResult> RequestPasswordResetAsync(
        string? email,
        CancellationToken cancellationToken = default);

    Task<CredentialChangeResult> ResetPasswordAsync(
        string? email,
        string? token,
        string? newPassword,
        string? confirmation,
        bool allowLegacyTokenOnly = false,
        CancellationToken cancellationToken = default);
}

public enum CredentialChangeStatus
{
    Success,
    ValidationFailed,
    Conflict
}

public sealed record CredentialChangeResult(CredentialChangeStatus Status, string? Code)
{
    public static CredentialChangeResult Success() =>
        new(CredentialChangeStatus.Success, null);

    public static CredentialChangeResult ValidationFailed(string code) =>
        new(CredentialChangeStatus.ValidationFailed, code);

    public static CredentialChangeResult Conflict() =>
        new(CredentialChangeStatus.Conflict, CredentialErrorCodes.ConcurrencyConflict);
}

public static class CredentialErrorCodes
{
    public const string ConfirmationMismatch = "password_confirmation_mismatch";
    public const string CurrentPasswordInvalid = "current_password_invalid";
    public const string PasswordResetInvalid = "password_reset_invalid";
    public const string ConcurrencyConflict = "credential_concurrency_conflict";
}

public sealed record PasswordResetRequestResult(
    string? RecipientEmail,
    string? RecipientName,
    string? Token)
{
    public static PasswordResetRequestResult Ineligible() => new(null, null, null);

    public static PasswordResetRequestResult Eligible(
        string recipientEmail,
        string recipientName,
        string token) => new(recipientEmail, recipientName, token);
}

public sealed class CredentialService(
    AppDbContext context,
    IPasswordPolicy passwordPolicy,
    IPasswordHasher<Usuario> passwordHasher,
    CredentialTelemetry telemetry,
    TimeProvider? timeProvider = null) : ICredentialService
{
    private const int PasswordResetTokenByteLength = 32;
    private static readonly TimeSpan PasswordResetLifetime = TimeSpan.FromMinutes(15);
    private readonly AppDbContext _context = context;
    private readonly IPasswordPolicy _passwordPolicy = passwordPolicy;
    private readonly IPasswordHasher<Usuario> _passwordHasher = passwordHasher;
    private readonly CredentialTelemetry _telemetry = telemetry;
    private readonly TimeProvider _timeProvider = timeProvider ?? TimeProvider.System;

    public async Task<CredentialChangeResult> ChangePasswordAsync(
        int userId,
        string? currentPassword,
        string? newPassword,
        string? confirmation,
        CancellationToken cancellationToken = default)
    {
        if (!string.Equals(newPassword, confirmation, StringComparison.Ordinal))
        {
            return Failure(userId, CredentialErrorCodes.ConfirmationMismatch);
        }

        IDbContextTransaction? transaction = null;
        try
        {
            if (_context.Database.IsRelational())
            {
                transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
            }

            var user = await _context.Usuarios.SingleOrDefaultAsync(
                candidate => candidate.Id == userId,
                cancellationToken);
            if (user is null || string.IsNullOrEmpty(currentPassword))
            {
                return await RollbackFailureAsync(
                    transaction,
                    userId,
                    CredentialErrorCodes.CurrentPasswordInvalid,
                    cancellationToken);
            }

            var verification = _passwordHasher.VerifyHashedPassword(
                user,
                user.SenhaHash,
                currentPassword);
            if (verification is not PasswordVerificationResult.Success and
                not PasswordVerificationResult.SuccessRehashNeeded)
            {
                return await RollbackFailureAsync(
                    transaction,
                    userId,
                    CredentialErrorCodes.CurrentPasswordInvalid,
                    cancellationToken);
            }

            var policyResult = _passwordPolicy.Validate(newPassword);
            if (!policyResult.IsValid)
            {
                return await RollbackFailureAsync(
                    transaction,
                    userId,
                    policyResult.Code ?? "password_invalid",
                    cancellationToken);
            }

            var wasRequiredChange = user.ExigeTrocaSenha;
            user.SenhaHash = _passwordHasher.HashPassword(user, newPassword!);
            user.ExigeTrocaSenha = false;
            user.TokenRedefinicaoHash = null;
            user.TokenExpiracao = null;
            user.VersaoSessao = checked(user.VersaoSessao + 1);

            await _context.SaveChangesAsync(cancellationToken);
            if (transaction is not null)
            {
                await transaction.CommitAsync(cancellationToken);
            }

            _telemetry.RecordSuccess(userId, wasRequiredChange);
            return CredentialChangeResult.Success();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (transaction is not null)
            {
                await transaction.RollbackAsync(cancellationToken);
            }

            _context.ChangeTracker.Clear();
            _telemetry.RecordConcurrencyConflict(userId);
            return CredentialChangeResult.Conflict();
        }
        finally
        {
            if (transaction is not null)
            {
                await transaction.DisposeAsync();
            }
        }
    }

    public async Task<PasswordResetRequestResult> RequestPasswordResetAsync(
        string? email,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return PasswordResetRequestResult.Ineligible();
        }

        var user = await _context.Usuarios.SingleOrDefaultAsync(
            candidate => candidate.Email == email && candidate.Status == StatusUsuario.Habilitado,
            cancellationToken);
        if (user is null)
        {
            return PasswordResetRequestResult.Ineligible();
        }

        var token = CreatePasswordResetToken();
        user.TokenRedefinicaoHash = HashPasswordResetToken(token);
        user.TokenExpiracao = _timeProvider.GetUtcNow().UtcDateTime.Add(PasswordResetLifetime);

        await _context.SaveChangesAsync(cancellationToken);

        return PasswordResetRequestResult.Eligible(
            user.Email,
            FirstName(user.NomeCompleto),
            token);
    }

    public async Task<CredentialChangeResult> ResetPasswordAsync(
        string? email,
        string? token,
        string? newPassword,
        string? confirmation,
        bool allowLegacyTokenOnly = false,
        CancellationToken cancellationToken = default)
    {
        IDbContextTransaction? transaction = null;
        try
        {
            if (_context.Database.IsRelational())
            {
                transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
            }

            var user = await FindResetUserAsync(
                email,
                token,
                allowLegacyTokenOnly,
                cancellationToken);
            if (user is null || !HasValidResetToken(user, token))
            {
                return await RollbackFailureAsync(
                    transaction,
                    user?.Id ?? 0,
                    CredentialErrorCodes.PasswordResetInvalid,
                    cancellationToken);
            }

            if (!string.Equals(newPassword, confirmation, StringComparison.Ordinal))
            {
                return await RollbackFailureAsync(
                    transaction,
                    user.Id,
                    CredentialErrorCodes.ConfirmationMismatch,
                    cancellationToken);
            }

            var policyResult = _passwordPolicy.Validate(newPassword);
            if (!policyResult.IsValid)
            {
                return await RollbackFailureAsync(
                    transaction,
                    user.Id,
                    policyResult.Code ?? "password_invalid",
                    cancellationToken);
            }

            user.SenhaHash = _passwordHasher.HashPassword(user, newPassword!);
            user.ExigeTrocaSenha = false;
            user.TokenRedefinicaoHash = null;
            user.TokenExpiracao = null;
            user.VersaoSessao = checked(user.VersaoSessao + 1);

            await _context.SaveChangesAsync(cancellationToken);
            if (transaction is not null)
            {
                await transaction.CommitAsync(cancellationToken);
            }

            _telemetry.RecordSuccess(user.Id, false);
            return CredentialChangeResult.Success();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (transaction is not null)
            {
                await transaction.RollbackAsync(cancellationToken);
            }

            _context.ChangeTracker.Clear();
            _telemetry.RecordConcurrencyConflict(0);
            return CredentialChangeResult.Conflict();
        }
        finally
        {
            if (transaction is not null)
            {
                await transaction.DisposeAsync();
            }
        }
    }

    private async Task<Usuario?> FindResetUserAsync(
        string? email,
        string? token,
        bool allowLegacyTokenOnly,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(email))
        {
            return await _context.Usuarios.SingleOrDefaultAsync(
                candidate => candidate.Email == email && candidate.Status == StatusUsuario.Habilitado,
                cancellationToken);
        }

        if (!allowLegacyTokenOnly || string.IsNullOrEmpty(token))
        {
            return null;
        }

        var tokenHash = HashPasswordResetToken(token);
        return await _context.Usuarios.SingleOrDefaultAsync(
            candidate => candidate.TokenRedefinicaoHash == tokenHash &&
                candidate.Status == StatusUsuario.Habilitado,
            cancellationToken);
    }

    private bool HasValidResetToken(Usuario user, string? token)
    {
        var currentTime = _timeProvider.GetUtcNow().UtcDateTime;
        var tokenMatches = PasswordResetTokensMatch(token, user.TokenRedefinicaoHash);
        var isUnexpired = user.TokenExpiracao is { } expiration &&
            expiration.ToUniversalTime() > currentTime;

        return tokenMatches & isUnexpired;
    }

    private static string CreatePasswordResetToken()
    {
        var tokenBytes = RandomNumberGenerator.GetBytes(PasswordResetTokenByteLength);
        return Convert.ToBase64String(tokenBytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    private static string HashPasswordResetToken(string token) =>
        Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    private static bool PasswordResetTokensMatch(string? token, string? persistedHash)
    {
        var suppliedHash = SHA256.HashData(Encoding.UTF8.GetBytes(token ?? string.Empty));
        var storedHash = new byte[suppliedHash.Length];
        var isWellFormedHash = !string.IsNullOrWhiteSpace(persistedHash) &&
            Convert.TryFromBase64String(persistedHash, storedHash, out var bytesWritten) &&
            bytesWritten == storedHash.Length;
        var hashesMatch = CryptographicOperations.FixedTimeEquals(suppliedHash, storedHash);

        return isWellFormedHash & hashesMatch;
    }

    private static string FirstName(string fullName) =>
        fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? "UsuÃ¡rio";

    private CredentialChangeResult Failure(int userId, string code)
    {
        _telemetry.RecordFailure(userId, code);
        return CredentialChangeResult.ValidationFailed(code);
    }

    private async Task<CredentialChangeResult> RollbackFailureAsync(
        IDbContextTransaction? transaction,
        int userId,
        string code,
        CancellationToken cancellationToken)
    {
        if (transaction is not null)
        {
            await transaction.RollbackAsync(cancellationToken);
        }

        return Failure(userId, code);
    }
}
