using System.Data.Common;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace LabSolos_Server_DotNet8.Repositories;

public enum RecoveryJobEnqueueStatus
{
    Enqueued,
    Coalesced,
    QueueFull
}

public sealed record RecoveryJobEnqueueResult(RecoveryJobEnqueueStatus Status, Guid? JobId);

public sealed record ReservedRecoveryJob(
    Guid Id,
    Guid LeaseId,
    byte[] DeliveryKeyHash,
    byte[] RecipientKeyHash,
    ProtectedRecoveryPayload Payload,
    DateTimeOffset CreatedAt,
    DateTimeOffset ExpiresAt,
    DateTimeOffset NextAttemptAt,
    DateTimeOffset LeaseUntil,
    int Attempts,
    int? UserId,
    long? SessionVersion)
{
    public RecoveryPayloadPurpose PayloadPurpose => SessionVersion.HasValue
        ? RecoveryPayloadPurpose.Delivery
        : RecoveryPayloadPurpose.Request;
}

/// <summary>
/// Persists recovery work using PostgreSQL row locks. Operations join an EF transaction already
/// active on the supplied context, so admission can commit its quota and queue change together.
/// </summary>
public sealed class PasswordRecoveryJobRepository
{
    private const int MaximumActiveJobs = 5_000;
    private const string CapacityScope = AuthenticationProtectionCapacity.RecoveryJobs;
    private readonly AppDbContext _context;
    private readonly RecoveryPayloadProtector _protector;
    private readonly TimeProvider _timeProvider;

    public PasswordRecoveryJobRepository(
        AppDbContext context,
        RecoveryPayloadProtector protector,
        TimeProvider? timeProvider = null)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
        _protector = protector ?? throw new ArgumentNullException(nameof(protector));
        _timeProvider = timeProvider ?? TimeProvider.System;
    }

    public Task<RecoveryJobEnqueueResult> EnqueueOrCoalesceAsync(
        ReadOnlyMemory<byte> deliveryKeyHash,
        ReadOnlyMemory<byte> recipientKeyHash,
        ReadOnlyMemory<byte> requestPayload,
        DateTimeOffset expiresAt,
        CancellationToken cancellationToken = default) =>
        ExecuteInTransactionAsync(
            (transaction, token) => EnqueueOrCoalesceCoreAsync(
                transaction,
                deliveryKeyHash,
                recipientKeyHash,
                requestPayload,
                expiresAt,
                token),
            cancellationToken);

    public Task<IReadOnlyList<ReservedRecoveryJob>> ReserveBatchAsync(
        int batchSize = 10,
        TimeSpan? leaseDuration = null,
        CancellationToken cancellationToken = default)
    {
        if (batchSize is < 1 or > 10)
        {
            throw new ArgumentOutOfRangeException(nameof(batchSize), "A recovery batch must contain 1 to 10 jobs.");
        }

        var duration = leaseDuration ?? TimeSpan.FromSeconds(60);
        if (duration < TimeSpan.FromSeconds(1) || duration > TimeSpan.FromMinutes(10))
        {
            throw new ArgumentOutOfRangeException(nameof(leaseDuration), "The recovery lease duration is invalid.");
        }

        return ExecuteInTransactionAsync(
            (transaction, token) => ReserveBatchCoreAsync(transaction, batchSize, duration, token),
            cancellationToken);
    }

    public Task<bool> TryReplacePayloadAsync(
        Guid jobId,
        Guid leaseId,
        ReadOnlyMemory<byte> payloadPlaintext,
        RecoveryPayloadPurpose purpose,
        int? userId,
        long? sessionVersion,
        DateTimeOffset expiresAt,
        CancellationToken cancellationToken = default)
    {
        ValidatePayloadContext(jobId, leaseId, purpose, userId, sessionVersion, expiresAt);
        var protectedPayload = _protector.Protect(jobId, purpose, payloadPlaintext.Span);
        return ExecuteInTransactionAsync(
            (transaction, token) => ReplacePayloadCoreAsync(
                transaction,
                jobId,
                leaseId,
                protectedPayload,
                userId,
                sessionVersion,
                expiresAt,
                token),
            cancellationToken);
    }

    public Task<bool> TryCompleteAsync(
        Guid jobId,
        Guid leaseId,
        CancellationToken cancellationToken = default) =>
        ExecuteInTransactionAsync(
            async (transaction, token) =>
            {
                await LockCapacityAsync(transaction, token);
                var changed = await CompleteCoreAsync(transaction, jobId, leaseId, token);
                if (changed)
                {
                    await DecrementCapacityAsync(transaction, 1, token);
                }

                return changed;
            },
            cancellationToken);

    public Task<bool> TryScheduleRetryAsync(
        Guid jobId,
        Guid leaseId,
        int attempts,
        DateTimeOffset nextAttemptAt,
        CancellationToken cancellationToken = default)
    {
        if (attempts is < 1 or > 3)
        {
            throw new ArgumentOutOfRangeException(nameof(attempts), "Recovery delivery attempts must be between 1 and 3.");
        }

        return ExecuteInTransactionAsync(
            async (transaction, token) =>
            {
                await LockCapacityAsync(transaction, token);
                var terminal = await ScheduleRetryCoreAsync(
                    transaction,
                    jobId,
                    leaseId,
                    attempts,
                    nextAttemptAt,
                    token);
                if (terminal.HasValue && terminal.Value)
                {
                    await DecrementCapacityAsync(transaction, 1, token);
                }

                return terminal.HasValue;
            },
            cancellationToken);
    }

    public Task<int> CancelForUserAsync(int userId, CancellationToken cancellationToken = default)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(userId);

        return ExecuteInTransactionAsync(
            async (transaction, token) =>
            {
                await LockCapacityAsync(transaction, token);
                var cancelled = await CancelForUserCoreAsync(transaction, userId, token);
                if (cancelled > 0)
                {
                    await DecrementCapacityAsync(transaction, cancelled, token);
                }

                return cancelled;
            },
            cancellationToken);
    }

    public Task<int> CleanupExpiredAsync(int batchSize = 100, CancellationToken cancellationToken = default)
    {
        if (batchSize is < 1 or > 500)
        {
            throw new ArgumentOutOfRangeException(nameof(batchSize), "The recovery cleanup batch size is invalid.");
        }

        return ExecuteInTransactionAsync(
            async (transaction, token) =>
            {
                await LockCapacityAsync(transaction, token);
                var cleaned = await CleanupExpiredCoreAsync(transaction, batchSize, token);
                if (cleaned > 0)
                {
                    await DecrementCapacityAsync(transaction, cleaned, token);
                }

                return cleaned;
            },
            cancellationToken);
    }

    private async Task<RecoveryJobEnqueueResult> EnqueueOrCoalesceCoreAsync(
        IDbContextTransaction transaction,
        ReadOnlyMemory<byte> deliveryKeyHash,
        ReadOnlyMemory<byte> recipientKeyHash,
        ReadOnlyMemory<byte> requestPayload,
        DateTimeOffset expiresAt,
        CancellationToken cancellationToken)
    {
        ValidateHash(deliveryKeyHash, nameof(deliveryKeyHash));
        ValidateHash(recipientKeyHash, nameof(recipientKeyHash));
        if (requestPayload.IsEmpty)
        {
            throw new ArgumentException("A recovery request payload is required.", nameof(requestPayload));
        }

        var createdAt = _timeProvider.GetUtcNow();
        if (expiresAt <= createdAt)
        {
            throw new ArgumentOutOfRangeException(nameof(expiresAt), "A recovery job must expire in the future.");
        }

        var allocated = await LockCapacityAsync(transaction, cancellationToken);
        var cleaned = await CleanupExpiredCoreAsync(transaction, batchSize: 100, cancellationToken);
        if (cleaned > 0)
        {
            await DecrementCapacityAsync(transaction, cleaned, cancellationToken);
        }

        allocated -= cleaned;

        var existingId = await FindActiveJobIdAsync(transaction, deliveryKeyHash, cancellationToken);
        if (existingId.HasValue)
        {
            return new(RecoveryJobEnqueueStatus.Coalesced, existingId);
        }

        var reclaimed = await CancelExpiredDeliveryKeyCoreAsync(
            transaction,
            deliveryKeyHash,
            cancellationToken);
        if (reclaimed > 0)
        {
            await DecrementCapacityAsync(transaction, reclaimed, cancellationToken);
            allocated -= reclaimed;
        }

        if (allocated >= MaximumActiveJobs)
        {
            return new(RecoveryJobEnqueueStatus.QueueFull, null);
        }

        var jobId = Guid.NewGuid();
        var protectedPayload = _protector.Protect(jobId, RecoveryPayloadPurpose.Request, requestPayload.Span);
        var inserted = await InsertJobAsync(
            transaction,
            jobId,
            deliveryKeyHash,
            recipientKeyHash,
            protectedPayload,
            createdAt,
            expiresAt,
            cancellationToken);
        if (!inserted)
        {
            var conflictedId = await FindActiveJobIdAsync(transaction, deliveryKeyHash, cancellationToken);
            return conflictedId.HasValue
                ? new(RecoveryJobEnqueueStatus.Coalesced, conflictedId)
                : throw new InvalidOperationException("The recovery request could not be admitted.");
        }

        await IncrementCapacityAsync(transaction, cancellationToken);
        return new(RecoveryJobEnqueueStatus.Enqueued, jobId);
    }

    private static async Task<IReadOnlyList<ReservedRecoveryJob>> ReserveBatchCoreAsync(
        IDbContextTransaction transaction,
        int batchSize,
        TimeSpan leaseDuration,
        CancellationToken cancellationToken)
    {
        var jobIds = new List<Guid>(batchSize);
        await using (var command = CreateCommand(transaction, """
            SELECT "Id"
            FROM "PasswordRecoveryJobs"
            WHERE ("Status" = 'Pending' OR ("Status" = 'Processing' AND "LeaseUntil" <= clock_timestamp()))
              AND "ExpiresAt" > clock_timestamp()
              AND "NextAttemptAt" <= clock_timestamp()
            ORDER BY "NextAttemptAt", "CreatedAt", "Id"
            LIMIT @batchSize
            FOR UPDATE SKIP LOCKED;
            """))
        {
            AddParameter(command, "batchSize", batchSize);
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                jobIds.Add(reader.GetGuid(0));
            }
        }

        var reservations = new List<ReservedRecoveryJob>(jobIds.Count);
        foreach (var jobId in jobIds)
        {
            var leaseId = Guid.NewGuid();
            await using var command = CreateCommand(transaction, """
                UPDATE "PasswordRecoveryJobs"
                SET "Status" = 'Processing',
                    "LeaseId" = @leaseId,
                    "LeaseUntil" = clock_timestamp() + (@leaseSeconds * interval '1 second')
                WHERE "Id" = @jobId
                RETURNING "Id", "DeliveryKeyHash", "RecipientKeyHash", "PayloadCiphertext", "PayloadNonce",
                          "PayloadTag", "EncryptionKeyId", "CreatedAt", "ExpiresAt", "NextAttemptAt",
                          "LeaseUntil", "Attempts", "UserId", "SessionVersion";
                """);
            AddParameter(command, "leaseId", leaseId);
            AddParameter(command, "leaseSeconds", checked((int)Math.Ceiling(leaseDuration.TotalSeconds)));
            AddParameter(command, "jobId", jobId);
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (await reader.ReadAsync(cancellationToken))
            {
                reservations.Add(new ReservedRecoveryJob(
                    reader.GetGuid(0),
                    leaseId,
                    reader.GetFieldValue<byte[]>(1),
                    reader.GetFieldValue<byte[]>(2),
                    new ProtectedRecoveryPayload(
                        reader.GetString(6),
                        reader.GetFieldValue<byte[]>(3),
                        reader.GetFieldValue<byte[]>(4),
                        reader.GetFieldValue<byte[]>(5)),
                    reader.GetFieldValue<DateTimeOffset>(7),
                    reader.GetFieldValue<DateTimeOffset>(8),
                    reader.GetFieldValue<DateTimeOffset>(9),
                    reader.GetFieldValue<DateTimeOffset>(10),
                    reader.GetInt32(11),
                    reader.IsDBNull(12) ? null : reader.GetInt32(12),
                    reader.IsDBNull(13) ? null : reader.GetInt64(13)));
            }
        }

        return reservations;
    }

    private static async Task<bool> ReplacePayloadCoreAsync(
        IDbContextTransaction transaction,
        Guid jobId,
        Guid leaseId,
        ProtectedRecoveryPayload payload,
        int? userId,
        long? sessionVersion,
        DateTimeOffset expiresAt,
        CancellationToken cancellationToken)
    {
        await using var command = CreateCommand(transaction, """
            UPDATE "PasswordRecoveryJobs"
            SET "PayloadCiphertext" = @ciphertext,
                "PayloadNonce" = @nonce,
                "PayloadTag" = @tag,
                "EncryptionKeyId" = @keyId,
                "UserId" = @userId,
                "SessionVersion" = @sessionVersion,
                "ExpiresAt" = @expiresAt
            WHERE "Id" = @jobId
              AND "Status" = 'Processing'
              AND "LeaseId" = @leaseId
              AND "LeaseUntil" > clock_timestamp()
              AND "ExpiresAt" > clock_timestamp()
              AND @expiresAt > clock_timestamp()
              AND @expiresAt > "CreatedAt";
            """);
        AddParameter(command, "ciphertext", payload.Ciphertext);
        AddParameter(command, "nonce", payload.Nonce);
        AddParameter(command, "tag", payload.Tag);
        AddParameter(command, "keyId", payload.EncryptionKeyId);
        AddParameter(command, "userId", userId);
        AddParameter(command, "sessionVersion", sessionVersion);
        AddParameter(command, "expiresAt", expiresAt.ToUniversalTime());
        AddParameter(command, "jobId", jobId);
        AddParameter(command, "leaseId", leaseId);
        return await command.ExecuteNonQueryAsync(cancellationToken) == 1;
    }

    private static async Task<bool> CompleteCoreAsync(
        IDbContextTransaction transaction,
        Guid jobId,
        Guid leaseId,
        CancellationToken cancellationToken)
    {
        await using var command = CreateCommand(transaction, """
            UPDATE "PasswordRecoveryJobs"
            SET "Status" = 'Completed',
                "LeaseId" = NULL,
                "LeaseUntil" = NULL,
                "PayloadCiphertext" = @emptyCiphertext,
                "PayloadNonce" = @emptyNonce,
                "PayloadTag" = @emptyTag,
                "EncryptionKeyId" = ''
            WHERE "Id" = @jobId
              AND "Status" = 'Processing'
              AND "LeaseId" = @leaseId
              AND "LeaseUntil" > clock_timestamp()
              AND "ExpiresAt" > clock_timestamp();
            """);
        AddScrubParameters(command);
        AddParameter(command, "jobId", jobId);
        AddParameter(command, "leaseId", leaseId);
        return await command.ExecuteNonQueryAsync(cancellationToken) == 1;
    }

    private static async Task<bool?> ScheduleRetryCoreAsync(
        IDbContextTransaction transaction,
        Guid jobId,
        Guid leaseId,
        int attempts,
        DateTimeOffset nextAttemptAt,
        CancellationToken cancellationToken)
    {
        await using var command = CreateCommand(transaction, """
            UPDATE "PasswordRecoveryJobs"
            SET "Attempts" = @attempts,
                "NextAttemptAt" = @nextAttemptAt,
                "Status" = CASE
                    WHEN @attempts >= 3 OR @nextAttemptAt >= "ExpiresAt" THEN 'Failed'
                    ELSE 'Pending'
                END,
                "LeaseId" = NULL,
                "LeaseUntil" = NULL,
                "PayloadCiphertext" = CASE
                    WHEN @attempts >= 3 OR @nextAttemptAt >= "ExpiresAt" THEN @emptyCiphertext
                    ELSE "PayloadCiphertext"
                END,
                "PayloadNonce" = CASE
                    WHEN @attempts >= 3 OR @nextAttemptAt >= "ExpiresAt" THEN @emptyNonce
                    ELSE "PayloadNonce"
                END,
                "PayloadTag" = CASE
                    WHEN @attempts >= 3 OR @nextAttemptAt >= "ExpiresAt" THEN @emptyTag
                    ELSE "PayloadTag"
                END,
                "EncryptionKeyId" = CASE
                    WHEN @attempts >= 3 OR @nextAttemptAt >= "ExpiresAt" THEN ''
                    ELSE "EncryptionKeyId"
                END
            WHERE "Id" = @jobId
              AND "Status" = 'Processing'
              AND "LeaseId" = @leaseId
              AND "LeaseUntil" > clock_timestamp()
              AND "ExpiresAt" > clock_timestamp()
              AND @attempts = "Attempts" + 1
            RETURNING "Status" = 'Failed';
            """);
        AddParameter(command, "attempts", attempts);
        AddParameter(command, "nextAttemptAt", nextAttemptAt.ToUniversalTime());
        AddScrubParameters(command);
        AddParameter(command, "jobId", jobId);
        AddParameter(command, "leaseId", leaseId);
        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is null or DBNull ? null : Convert.ToBoolean(result, System.Globalization.CultureInfo.InvariantCulture);
    }

    private static async Task<int> CancelForUserCoreAsync(
        IDbContextTransaction transaction,
        int userId,
        CancellationToken cancellationToken)
    {
        await using var command = CreateCommand(transaction, """
            WITH cancelled AS (
                UPDATE "PasswordRecoveryJobs"
                SET "Status" = 'Cancelled',
                    "LeaseId" = NULL,
                    "LeaseUntil" = NULL,
                    "PayloadCiphertext" = @emptyCiphertext,
                    "PayloadNonce" = @emptyNonce,
                    "PayloadTag" = @emptyTag,
                    "EncryptionKeyId" = ''
                WHERE "UserId" = @userId AND "Status" IN ('Pending', 'Processing')
                RETURNING 1
            )
            SELECT COUNT(*) FROM cancelled;
            """);
        AddScrubParameters(command);
        AddParameter(command, "userId", userId);
        return Convert.ToInt32(await command.ExecuteScalarAsync(cancellationToken), System.Globalization.CultureInfo.InvariantCulture);
    }

    private static async Task<int> CleanupExpiredCoreAsync(
        IDbContextTransaction transaction,
        int batchSize,
        CancellationToken cancellationToken)
    {
        await using var command = CreateCommand(transaction, """
            WITH expired AS (
                SELECT "Id"
                FROM "PasswordRecoveryJobs"
                WHERE "Status" IN ('Pending', 'Processing') AND "ExpiresAt" <= clock_timestamp()
                ORDER BY "ExpiresAt", "Id"
                LIMIT @batchSize
                FOR UPDATE SKIP LOCKED
            ),
            cleaned AS (
                UPDATE "PasswordRecoveryJobs" AS job
                SET "Status" = 'Cancelled',
                    "LeaseId" = NULL,
                    "LeaseUntil" = NULL,
                    "PayloadCiphertext" = @emptyCiphertext,
                    "PayloadNonce" = @emptyNonce,
                    "PayloadTag" = @emptyTag,
                    "EncryptionKeyId" = ''
                FROM expired
                WHERE job."Id" = expired."Id"
                RETURNING 1
            )
            SELECT COUNT(*) FROM cleaned;
            """);
        AddParameter(command, "batchSize", batchSize);
        AddScrubParameters(command);
        return Convert.ToInt32(await command.ExecuteScalarAsync(cancellationToken), System.Globalization.CultureInfo.InvariantCulture);
    }

    private static async Task<int> CancelExpiredDeliveryKeyCoreAsync(
        IDbContextTransaction transaction,
        ReadOnlyMemory<byte> deliveryKeyHash,
        CancellationToken cancellationToken)
    {
        await using var command = CreateCommand(transaction, """
            UPDATE "PasswordRecoveryJobs"
            SET "Status" = 'Cancelled',
                "LeaseId" = NULL,
                "LeaseUntil" = NULL,
                "PayloadCiphertext" = @emptyCiphertext,
                "PayloadNonce" = @emptyNonce,
                "PayloadTag" = @emptyTag,
                "EncryptionKeyId" = ''
            WHERE "DeliveryKeyHash" = @deliveryKeyHash
              AND "Status" IN ('Pending', 'Processing')
              AND "ExpiresAt" <= clock_timestamp();
            """);
        AddScrubParameters(command);
        AddParameter(command, "deliveryKeyHash", deliveryKeyHash.ToArray());
        return await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task<Guid?> FindActiveJobIdAsync(
        IDbContextTransaction transaction,
        ReadOnlyMemory<byte> deliveryKeyHash,
        CancellationToken cancellationToken)
    {
        await using var command = CreateCommand(transaction, """
            SELECT "Id"
            FROM "PasswordRecoveryJobs"
            WHERE "DeliveryKeyHash" = @deliveryKeyHash
              AND "Status" IN ('Pending', 'Processing')
              AND "ExpiresAt" > clock_timestamp()
            ORDER BY "CreatedAt", "Id"
            LIMIT 1;
            """);
        AddParameter(command, "deliveryKeyHash", deliveryKeyHash.ToArray());
        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is null or DBNull ? null : (Guid)result;
    }

    private static async Task<bool> InsertJobAsync(
        IDbContextTransaction transaction,
        Guid jobId,
        ReadOnlyMemory<byte> deliveryKeyHash,
        ReadOnlyMemory<byte> recipientKeyHash,
        ProtectedRecoveryPayload payload,
        DateTimeOffset createdAt,
        DateTimeOffset expiresAt,
        CancellationToken cancellationToken)
    {
        await using var command = CreateCommand(transaction, """
            INSERT INTO "PasswordRecoveryJobs"
                ("Id", "DeliveryKeyHash", "RecipientKeyHash", "PayloadCiphertext", "PayloadNonce", "PayloadTag",
                 "EncryptionKeyId", "CreatedAt", "ExpiresAt", "NextAttemptAt", "Status", "Attempts")
            VALUES
                (@id, @deliveryKeyHash, @recipientKeyHash, @ciphertext, @nonce, @tag, @keyId,
                 @createdAt, @expiresAt, @createdAt, 'Pending', 0)
            ON CONFLICT ("DeliveryKeyHash") WHERE "Status" IN ('Pending', 'Processing') DO NOTHING;
            """);
        AddParameter(command, "id", jobId);
        AddParameter(command, "deliveryKeyHash", deliveryKeyHash.ToArray());
        AddParameter(command, "recipientKeyHash", recipientKeyHash.ToArray());
        AddParameter(command, "ciphertext", payload.Ciphertext);
        AddParameter(command, "nonce", payload.Nonce);
        AddParameter(command, "tag", payload.Tag);
        AddParameter(command, "keyId", payload.EncryptionKeyId);
        AddParameter(command, "createdAt", createdAt.ToUniversalTime());
        AddParameter(command, "expiresAt", expiresAt.ToUniversalTime());
        return await command.ExecuteNonQueryAsync(cancellationToken) == 1;
    }

    private static async Task<int> LockCapacityAsync(
        IDbContextTransaction transaction,
        CancellationToken cancellationToken)
    {
        await using var command = CreateCommand(transaction, """
            SELECT "Allocated"
            FROM "AuthenticationProtectionCapacity"
            WHERE "Scope" = @scope
            FOR UPDATE;
            """);
        AddParameter(command, "scope", CapacityScope);
        var result = await command.ExecuteScalarAsync(cancellationToken);
        if (result is null or DBNull)
        {
            throw new InvalidOperationException("The recovery queue capacity is not initialized.");
        }

        var allocated = Convert.ToInt32(result, System.Globalization.CultureInfo.InvariantCulture);
        if (allocated < 0 || allocated > MaximumActiveJobs)
        {
            throw new InvalidOperationException("The recovery queue capacity is inconsistent.");
        }

        return allocated;
    }

    private static async Task IncrementCapacityAsync(
        IDbContextTransaction transaction,
        CancellationToken cancellationToken)
    {
        await using var command = CreateCommand(transaction, """
            UPDATE "AuthenticationProtectionCapacity"
            SET "Allocated" = "Allocated" + 1
            WHERE "Scope" = @scope AND "Allocated" < @maximum;
            """);
        AddParameter(command, "scope", CapacityScope);
        AddParameter(command, "maximum", MaximumActiveJobs);
        if (await command.ExecuteNonQueryAsync(cancellationToken) != 1)
        {
            throw new InvalidOperationException("The recovery queue capacity changed during admission.");
        }
    }

    private static async Task DecrementCapacityAsync(
        IDbContextTransaction transaction,
        int amount,
        CancellationToken cancellationToken)
    {
        await using var command = CreateCommand(transaction, """
            UPDATE "AuthenticationProtectionCapacity"
            SET "Allocated" = "Allocated" - @amount
            WHERE "Scope" = @scope AND "Allocated" >= @amount;
            """);
        AddParameter(command, "scope", CapacityScope);
        AddParameter(command, "amount", amount);
        if (await command.ExecuteNonQueryAsync(cancellationToken) != 1)
        {
            throw new InvalidOperationException("The recovery queue capacity is inconsistent.");
        }
    }

    private async Task<T> ExecuteInTransactionAsync<T>(
        Func<IDbContextTransaction, CancellationToken, Task<T>> operation,
        CancellationToken cancellationToken)
    {
        var current = _context.Database.CurrentTransaction;
        if (current is not null)
        {
            return await operation(current, cancellationToken);
        }

        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var result = await operation(transaction, cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return result;
        }
        catch
        {
            await transaction.RollbackAsync(CancellationToken.None);
            throw;
        }
    }

    private static DbCommand CreateCommand(IDbContextTransaction transaction, string commandText)
    {
        var command = transaction.GetDbTransaction().Connection!.CreateCommand();
        command.Transaction = transaction.GetDbTransaction();
        command.CommandText = commandText;
        return command;
    }

    private static void AddParameter(DbCommand command, string name, object? value)
    {
        var parameter = command.CreateParameter();
        parameter.ParameterName = name;
        parameter.Value = value ?? DBNull.Value;
        command.Parameters.Add(parameter);
    }

    private static void AddScrubParameters(DbCommand command)
    {
        AddParameter(command, "emptyCiphertext", Array.Empty<byte>());
        AddParameter(command, "emptyNonce", new byte[12]);
        AddParameter(command, "emptyTag", new byte[16]);
    }

    private static void ValidateHash(ReadOnlyMemory<byte> hash, string parameterName)
    {
        if (hash.Length != 32)
        {
            throw new ArgumentException("Recovery queue hashes must contain 32 bytes.", parameterName);
        }
    }

    private void ValidatePayloadContext(
        Guid jobId,
        Guid leaseId,
        RecoveryPayloadPurpose purpose,
        int? userId,
        long? sessionVersion,
        DateTimeOffset expiresAt)
    {
        if (jobId == Guid.Empty || leaseId == Guid.Empty)
        {
            throw new ArgumentException("A recovery job and lease identifier are required.");
        }

        if (purpose == RecoveryPayloadPurpose.Request && (userId.HasValue || sessionVersion.HasValue)
            || purpose == RecoveryPayloadPurpose.Delivery && (!userId.HasValue || userId <= 0 || !sessionVersion.HasValue || sessionVersion < 0)
            || purpose is not (RecoveryPayloadPurpose.Request or RecoveryPayloadPurpose.Delivery))
        {
            throw new ArgumentException("The recovery payload context is invalid.");
        }

        if (expiresAt <= _timeProvider.GetUtcNow())
        {
            throw new ArgumentOutOfRangeException(nameof(expiresAt), "A recovery job must expire in the future.");
        }
    }
}
