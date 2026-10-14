using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using System.Data.Common;
using System.Net;
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

    Task<PasswordResetDeliveryIssue?> IssuePasswordResetForDeliveryAsync(
        int userId,
        string expectedEmail,
        CancellationToken cancellationToken = default);

    Task<bool> IsPasswordResetCurrentAsync(
        int userId,
        string expectedEmail,
        long sessionVersion,
        string token,
        CancellationToken cancellationToken = default);

    Task<CredentialChangeResult> ResetPasswordAsync(
        string? email,
        string? token,
        string? newPassword,
        string? confirmation,
        bool allowLegacyTokenOnly = false,
        CancellationToken cancellationToken = default);
}

public interface IPasswordResetService
{
    Task<CredentialChangeResult> ResetPasswordAsync(
        string? email,
        string? token,
        string? newPassword,
        string? confirmation,
        bool allowLegacyTokenOnly,
        IPAddress? sourceIpAddress,
        CancellationToken cancellationToken = default);
}

public enum CredentialChangeStatus
{
    Success,
    ValidationFailed,
    Conflict,
    RateLimited,
    Unavailable
}

public sealed record CredentialChangeResult(
    CredentialChangeStatus Status,
    string? Code,
    int RetryAfterSeconds = 0)
{
    public static CredentialChangeResult Success() =>
        new(CredentialChangeStatus.Success, null);

    public static CredentialChangeResult ValidationFailed(string code) =>
        new(CredentialChangeStatus.ValidationFailed, code);

    public static CredentialChangeResult Conflict() =>
        new(CredentialChangeStatus.Conflict, CredentialErrorCodes.ConcurrencyConflict);

    public static CredentialChangeResult RateLimited(int retryAfterSeconds) =>
        new(CredentialChangeStatus.RateLimited, null, Math.Max(1, retryAfterSeconds));

    public static CredentialChangeResult Unavailable() =>
        new(CredentialChangeStatus.Unavailable, null);
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

public sealed record PasswordResetDeliveryIssue(
    int UserId,
    string Email,
    string RecipientName,
    string Token,
    long SessionVersion,
    DateTimeOffset ExpiresAt);

public sealed class CredentialService(
    AppDbContext context,
    IPasswordPolicy passwordPolicy,
    IPasswordHasher<Usuario> passwordHasher,
    CredentialTelemetry telemetry,
    TimeProvider? timeProvider = null,
    IServiceProvider? serviceProvider = null) : ICredentialService, IPasswordResetService
{
    private const int PasswordResetTokenByteLength = 32;
    private static readonly TimeSpan PasswordResetLifetime = TimeSpan.FromMinutes(15);
    private readonly AppDbContext _context = context;
    private readonly IPasswordPolicy _passwordPolicy = passwordPolicy;
    private readonly IPasswordHasher<Usuario> _passwordHasher = passwordHasher;
    private readonly CredentialTelemetry _telemetry = telemetry;
    private readonly TimeProvider _timeProvider = timeProvider ?? TimeProvider.System;
    private readonly IServiceProvider? _serviceProvider = serviceProvider;

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
            if (_serviceProvider?.GetService<PasswordRecoveryJobRepository>() is { } recoveryJobs)
            {
                await recoveryJobs.CancelForUserAsync(userId, cancellationToken);
            }

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

    /// <summary>
    /// Creates a code inside the caller's transaction. The caller must hold the user row lock and
    /// persist the corresponding encrypted queue payload before committing that transaction.
    /// </summary>
    public async Task<PasswordResetDeliveryIssue?> IssuePasswordResetForDeliveryAsync(
        int userId,
        string expectedEmail,
        CancellationToken cancellationToken = default)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(userId);
        ArgumentException.ThrowIfNullOrWhiteSpace(expectedEmail);
        if (_context.Database.CurrentTransaction is null)
        {
            throw new InvalidOperationException("Recovery delivery issuance requires an external transaction.");
        }

        await LockUserRowAsync(userId, cancellationToken);
        var user = await _context.Usuarios.SingleOrDefaultAsync(
            candidate => candidate.Id == userId,
            cancellationToken);
        if (user is null
            || user.Status != StatusUsuario.Habilitado
            || !string.Equals(user.Email, expectedEmail, StringComparison.Ordinal))
        {
            return null;
        }

        var token = CreatePasswordResetToken();
        var expiresAt = _timeProvider.GetUtcNow().Add(PasswordResetLifetime);
        user.TokenRedefinicaoHash = HashPasswordResetToken(token);
        user.TokenExpiracao = expiresAt.UtcDateTime;
        await _context.SaveChangesAsync(cancellationToken);

        return new PasswordResetDeliveryIssue(
            user.Id,
            user.Email,
            FirstName(user.NomeCompleto),
            token,
            user.VersaoSessao,
            expiresAt);
    }

    public async Task<bool> IsPasswordResetCurrentAsync(
        int userId,
        string expectedEmail,
        long sessionVersion,
        string token,
        CancellationToken cancellationToken = default)
    {
        var user = await _context.Usuarios
            .AsNoTracking()
            .Where(candidate => candidate.Id == userId
                && candidate.Status == StatusUsuario.Habilitado
                && candidate.Email == expectedEmail
                && candidate.VersaoSessao == sessionVersion)
            .Select(candidate => new { candidate.TokenRedefinicaoHash, candidate.TokenExpiracao })
            .SingleOrDefaultAsync(cancellationToken);

        return user is not null
            && user.TokenExpiracao is { } expiration
            && expiration.ToUniversalTime() > _timeProvider.GetUtcNow().UtcDateTime
            && PasswordResetTokensMatch(token, user.TokenRedefinicaoHash);
    }

    public Task<CredentialChangeResult> ResetPasswordAsync(
        string? email,
        string? token,
        string? newPassword,
        string? confirmation,
        bool allowLegacyTokenOnly = false,
        CancellationToken cancellationToken = default) =>
        ResetPasswordAsync(
            email,
            token,
            newPassword,
            confirmation,
            allowLegacyTokenOnly,
            sourceIpAddress: null,
            cancellationToken);

    public async Task<CredentialChangeResult> ResetPasswordAsync(
        string? email,
        string? token,
        string? newPassword,
        string? confirmation,
        bool allowLegacyTokenOnly,
        IPAddress? sourceIpAddress,
        CancellationToken cancellationToken = default)
    {
        if (_serviceProvider is null)
        {
            if (!string.Equals(
                    _context.Database.ProviderName,
                    "Microsoft.EntityFrameworkCore.InMemory",
                    StringComparison.Ordinal))
            {
                return CredentialChangeResult.Unavailable();
            }

            return await ResetPasswordWithoutThrottleAsync(
                email,
                token,
                newPassword,
                confirmation,
                allowLegacyTokenOnly,
                cancellationToken);
        }

        var throttle = _serviceProvider.GetService<PostgresAuthenticationThrottle>();
        var keyFactory = _serviceProvider.GetService<ThrottleKeyFactory>();
        var protectionOptions = _serviceProvider.GetService<IOptions<AuthenticationProtectionOptions>>()?.Value;
        if (throttle is null || keyFactory is null || protectionOptions?.RecoveryCode is null)
        {
            return CredentialChangeResult.Unavailable();
        }

        if (allowLegacyTokenOnly && string.IsNullOrWhiteSpace(email))
        {
            return await ResetLegacyTokenOnlyAsync(
                token,
                newPassword,
                confirmation,
                sourceIpAddress,
                throttle,
                keyFactory,
                protectionOptions,
                cancellationToken);
        }

        var admission = await throttle.TryBeginAsync(
            CreateRecoveryCodeRules(email, sourceIpAddress, keyFactory, protectionOptions.RecoveryCode),
            cancellationToken);
        if (admission.State != AuthenticationThrottleState.Allowed || admission.Attempt is null)
        {
            return MapThrottleResult(admission);
        }

        return await ResetPasswordWithAttemptAsync(
            admission.Attempt,
            email,
            token,
            newPassword,
            confirmation,
            allowLegacyTokenOnly,
            cancellationToken);
    }

    private async Task<CredentialChangeResult> ResetPasswordWithoutThrottleAsync(
        string? email,
        string? token,
        string? newPassword,
        string? confirmation,
        bool allowLegacyTokenOnly,
        CancellationToken cancellationToken)
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
            if (_serviceProvider?.GetService<PasswordRecoveryJobRepository>() is { } recoveryJobs)
            {
                await recoveryJobs.CancelForUserAsync(user.Id, cancellationToken);
            }

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

    private async Task<CredentialChangeResult> ResetLegacyTokenOnlyAsync(
        string? token,
        string? newPassword,
        string? confirmation,
        IPAddress? sourceIpAddress,
        PostgresAuthenticationThrottle throttle,
        ThrottleKeyFactory keyFactory,
        AuthenticationProtectionOptions protectionOptions,
        CancellationToken cancellationToken)
    {
        // The preliminary phase locks only the IP bucket. Release it before reacquiring both
        // buckets in the throttle's stable scope/hash order to avoid an inverted lock order.
        var preliminary = await throttle.TryBeginAsync(
            CreateRecoveryCodeRules(null, sourceIpAddress, keyFactory, protectionOptions.RecoveryCode),
            cancellationToken);
        if (preliminary.State != AuthenticationThrottleState.Allowed || preliminary.Attempt is null)
        {
            return MapThrottleResult(preliminary);
        }

        string? resolvedEmail;
        try
        {
            var tokenHash = HashPasswordResetToken(token ?? string.Empty);
            resolvedEmail = await _context.Usuarios
                .AsNoTracking()
                .Where(candidate => candidate.TokenRedefinicaoHash == tokenHash)
                .Select(candidate => candidate.Email)
                .SingleOrDefaultAsync(cancellationToken);
        }
        catch (Exception exception) when (IsInfrastructureFailure(exception, cancellationToken))
        {
            await preliminary.Attempt.DisposeAsync();
            return CredentialChangeResult.Unavailable();
        }
        catch
        {
            await preliminary.Attempt.DisposeAsync();
            throw;
        }

        if (!CanUseQuotaIdentifier(resolvedEmail))
        {
            return await ResetPasswordWithAttemptAsync(
                preliminary.Attempt,
                null,
                token,
                newPassword,
                confirmation,
                allowLegacyTokenOnly: true,
                cancellationToken);
        }

        await preliminary.Attempt.DisposeAsync();
        var revalidatedAdmission = await throttle.TryBeginAsync(
            CreateRecoveryCodeRules(resolvedEmail, sourceIpAddress, keyFactory, protectionOptions.RecoveryCode),
            cancellationToken);
        if (revalidatedAdmission.State != AuthenticationThrottleState.Allowed
            || revalidatedAdmission.Attempt is null)
        {
            return MapThrottleResult(revalidatedAdmission);
        }

        // The operation below resolves the token again while both quota rows are locked. The
        // preliminary lookup is used only to discover its recipient key, never to authorize reset.
        return await ResetPasswordWithAttemptAsync(
            revalidatedAdmission.Attempt,
            null,
            token,
            newPassword,
            confirmation,
            allowLegacyTokenOnly: true,
            cancellationToken);
    }

    private async Task<CredentialChangeResult> ResetPasswordWithAttemptAsync(
        AuthenticationThrottleAttempt attempt,
        string? email,
        string? token,
        string? newPassword,
        string? confirmation,
        bool allowLegacyTokenOnly,
        CancellationToken cancellationToken)
    {
        var completed = false;
        try
        {
            var user = await FindResetUserAsync(email, token, allowLegacyTokenOnly, cancellationToken);
            if (user is null || !HasValidResetToken(user, token))
            {
                await attempt.CompleteAsync(AuthenticationThrottleOutcome.Failure, CancellationToken.None);
                completed = true;
                return Failure(user?.Id ?? 0, CredentialErrorCodes.PasswordResetInvalid);
            }

            if (!string.Equals(newPassword, confirmation, StringComparison.Ordinal))
            {
                await attempt.CompleteAsync(AuthenticationThrottleOutcome.Failure, CancellationToken.None);
                completed = true;
                return Failure(user.Id, CredentialErrorCodes.ConfirmationMismatch);
            }

            var policyResult = _passwordPolicy.Validate(newPassword);
            if (!policyResult.IsValid)
            {
                var code = policyResult.Code ?? "password_invalid";
                await attempt.CompleteAsync(AuthenticationThrottleOutcome.Failure, CancellationToken.None);
                completed = true;
                return Failure(user.Id, code);
            }

            user.SenhaHash = _passwordHasher.HashPassword(user, newPassword!);
            user.ExigeTrocaSenha = false;
            user.TokenRedefinicaoHash = null;
            user.TokenExpiracao = null;
            user.VersaoSessao = checked(user.VersaoSessao + 1);

            await _context.SaveChangesAsync(cancellationToken);
            if (_serviceProvider?.GetService<PasswordRecoveryJobRepository>() is { } recoveryJobs)
            {
                await recoveryJobs.CancelForUserAsync(user.Id, cancellationToken);
            }

            await attempt.CompleteAsync(AuthenticationThrottleOutcome.Accepted, cancellationToken);
            completed = true;
            _telemetry.RecordSuccess(user.Id, false);
            return CredentialChangeResult.Success();
        }
        catch (DbUpdateConcurrencyException)
        {
            await attempt.DisposeAsync();
            _context.ChangeTracker.Clear();
            _telemetry.RecordConcurrencyConflict(0);
            return CredentialChangeResult.Conflict();
        }
        catch (Exception exception) when (IsInfrastructureFailure(exception, cancellationToken))
        {
            await attempt.DisposeAsync();
            _context.ChangeTracker.Clear();
            return CredentialChangeResult.Unavailable();
        }
        finally
        {
            if (!completed)
            {
                await attempt.DisposeAsync();
            }
        }
    }

    private static List<AuthenticationThrottleRule> CreateRecoveryCodeRules(
        string? email,
        IPAddress? sourceIpAddress,
        ThrottleKeyFactory keyFactory,
        RecoveryCodeThrottleOptions options)
    {
        var rules = new List<AuthenticationThrottleRule>(capacity: 2)
        {
            new(
                AuthenticationProtectionCapacity.RecoveryCodeIp,
                keyFactory.CreateIpQuotaKey(ThrottlePurpose.RecoveryCode, sourceIpAddress),
                options.IpFailures,
                TimeSpan.FromSeconds(options.WindowSeconds))
        };

        if (CanUseQuotaIdentifier(email))
        {
            rules.Add(new AuthenticationThrottleRule(
                AuthenticationProtectionCapacity.RecoveryCodeRecipient,
                keyFactory.CreateRecipientQuotaKey(ThrottlePurpose.RecoveryCode, email!),
                options.RecipientFailures,
                TimeSpan.FromSeconds(options.WindowSeconds)));
        }

        rules.Sort(static (left, right) =>
        {
            var scopeOrder = string.Compare(left.Scope, right.Scope, StringComparison.Ordinal);
            return scopeOrder != 0
                ? scopeOrder
                : left.KeyHash.AsSpan().SequenceCompareTo(right.KeyHash);
        });
        return rules;
    }

    private static bool CanUseQuotaIdentifier(string? email) =>
        !string.IsNullOrWhiteSpace(email)
        && email.Length <= 254
        && !email.Any(char.IsControl);

    private static CredentialChangeResult MapThrottleResult(AuthenticationThrottleResult result) =>
        result.State switch
        {
            AuthenticationThrottleState.RateLimited or AuthenticationThrottleState.CapacityExceeded =>
                CredentialChangeResult.RateLimited(result.RetryAfterSeconds),
            AuthenticationThrottleState.Unavailable => CredentialChangeResult.Unavailable(),
            _ => CredentialChangeResult.Unavailable()
        };

    private static bool IsInfrastructureFailure(Exception exception, CancellationToken callerToken)
    {
        if (callerToken.IsCancellationRequested && exception is OperationCanceledException)
        {
            return false;
        }

        for (Exception? current = exception; current is not null; current = current.InnerException)
        {
            if (current is DbException or TimeoutException
                || (current is OperationCanceledException && !callerToken.IsCancellationRequested))
            {
                return true;
            }
        }

        return false;
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

    private async Task LockUserRowAsync(int userId, CancellationToken cancellationToken)
    {
        var transaction = _context.Database.CurrentTransaction
            ?? throw new InvalidOperationException("Recovery delivery issuance requires an external transaction.");
        var connection = _context.Database.GetDbConnection();
        await using var command = connection.CreateCommand();
        command.Transaction = transaction.GetDbTransaction();
        command.CommandText = "SELECT \"Id\" FROM \"Usuarios\" WHERE \"Id\" = @userId FOR UPDATE;";
        var parameter = command.CreateParameter();
        parameter.ParameterName = "userId";
        parameter.Value = userId;
        command.Parameters.Add(parameter);
        await command.ExecuteScalarAsync(cancellationToken);
    }

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
