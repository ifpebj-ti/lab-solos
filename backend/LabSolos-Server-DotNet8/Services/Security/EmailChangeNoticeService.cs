using System.Data.Common;
using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace LabSolos_Server_DotNet8.Services.Security;

/// <summary>Delivers each encrypted email-change notice independently.</summary>
public sealed class EmailChangeNoticeService(
    AppDbContext context,
    RecoveryPayloadProtector payloadProtector,
    IEmailService emailService,
    TimeProvider timeProvider,
    ILogger<EmailChangeNoticeService> logger)
{
    private const int BatchSize = 10;
    private const int MaximumAttempts = 3;
    private static readonly TimeSpan LeaseDuration = TimeSpan.FromMinutes(1);
    private static readonly TimeSpan SendTimeout = TimeSpan.FromSeconds(15);
    private static readonly TimeSpan FirstRetryDelay = TimeSpan.FromSeconds(30);
    private static readonly TimeSpan SecondRetryDelay = TimeSpan.FromSeconds(120);
    private static readonly UTF8Encoding StrictUtf8 = new(false, true);

    private readonly AppDbContext _context = context ?? throw new ArgumentNullException(nameof(context));
    private readonly RecoveryPayloadProtector _payloadProtector = payloadProtector ?? throw new ArgumentNullException(nameof(payloadProtector));
    private readonly IEmailService _emailService = emailService ?? throw new ArgumentNullException(nameof(emailService));
    private readonly TimeProvider _timeProvider = timeProvider ?? throw new ArgumentNullException(nameof(timeProvider));
    private readonly ILogger<EmailChangeNoticeService> _logger = logger ?? throw new ArgumentNullException(nameof(logger));

    public async Task<int> ProcessPendingAsync(CancellationToken cancellationToken = default)
    {
        var now = _timeProvider.GetUtcNow();
        var batch = await ReserveBatchAsync(now, cancellationToken);
        foreach (var job in batch.Jobs)
        {
            try
            {
                await ProcessAsync(job, cancellationToken);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception)
            {
                _logger.LogError(
                    new EventId(1906, "EmailChangeNoticeJobProcessingFailure"),
                    "Email-change notice processing failed for recipient job {JobId}; the lease will be reclaimed without recording recipient data.",
                    job.Id);
            }
        }

        if (batch.ExpiredCount > 0)
        {
            _logger.LogError(
                new EventId(1901, "EmailChangeNoticeDeadlineExpired"),
                "Email-change notice delivery reached its deadline for {Count} recipient job(s); sanitized terminal state is available to authorized support.",
                batch.ExpiredCount);
        }

        if (batch.PurgedCount > 0)
        {
            _logger.LogInformation(
                new EventId(1902, "EmailChangeNoticeRetentionPurged"),
                "Purged {Count} expired email-change notice record(s) after the approved retention period.",
                batch.PurgedCount);
        }

        return batch.Jobs.Count;
    }

    private async Task<ReservedBatch> ReserveBatchAsync(
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        var connection = _context.Database.GetDbConnection();
        var dbTransaction = transaction.GetDbTransaction();
        var expiredCount = 0;
        var purgedCount = 0;

        await using (var purge = CreateCommand(connection, dbTransaction, """
            DELETE FROM "EmailChangeNoticeJobs"
            WHERE "RetainUntil" <= @now
            """))
        {
            AddParameter(purge, "now", now);
            purgedCount = await purge.ExecuteNonQueryAsync(cancellationToken);
        }

        await using (var expire = CreateCommand(connection, dbTransaction, """
            UPDATE "EmailChangeNoticeJobs"
            SET "Status" = 'Failed',
                "LastFailureCode" = 'delivery_deadline_expired',
                "PayloadCiphertext" = decode('', 'hex'),
                "LeaseId" = NULL,
                "LeaseUntil" = NULL
            WHERE "Status" IN ('Pending', 'Processing')
              AND "DeadlineAt" <= @now;
            """))
        {
            AddParameter(expire, "now", now);
            expiredCount = await expire.ExecuteNonQueryAsync(cancellationToken);
        }

        var jobs = new List<ReservedNoticeJob>(BatchSize);
        await using (var reserve = CreateCommand(connection, dbTransaction, """
            WITH candidates AS (
                SELECT "Id"
                FROM "EmailChangeNoticeJobs"
                WHERE (
                    "Status" = 'Pending'
                    AND "NextAttemptAt" <= @now
                    AND "DeadlineAt" > @now
                ) OR (
                    "Status" = 'Processing'
                    AND "LeaseUntil" <= @now
                    AND "DeadlineAt" > @now
                )
                ORDER BY "NextAttemptAt", "CreatedAt", "Id"
                LIMIT @batchSize
                FOR UPDATE SKIP LOCKED
            )
            UPDATE "EmailChangeNoticeJobs" AS jobs
            SET "Status" = 'Processing',
                "LeaseId" = gen_random_uuid(),
                "LeaseUntil" = @leaseUntil
            FROM candidates
            WHERE jobs."Id" = candidates."Id"
            RETURNING
                jobs."Id",
                jobs."OperationId",
                jobs."UserId",
                jobs."Recipient",
                jobs."PayloadCiphertext",
                jobs."PayloadNonce",
                jobs."PayloadTag",
                jobs."EncryptionKeyId",
                jobs."CreatedAt",
                jobs."DeadlineAt",
                jobs."Attempts",
                jobs."LeaseId";
            """))
        {
            AddParameter(reserve, "now", now);
            AddParameter(reserve, "batchSize", BatchSize);
            AddParameter(reserve, "leaseUntil", now.Add(LeaseDuration));
            await using var reader = await reserve.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                jobs.Add(new ReservedNoticeJob(
                    reader.GetGuid(0),
                    reader.GetGuid(1),
                    reader.IsDBNull(2) ? null : reader.GetInt32(2),
                    Enum.Parse<EmailChangeNoticeRecipient>(reader.GetString(3), ignoreCase: false),
                    reader.GetFieldValue<byte[]>(4),
                    reader.GetFieldValue<byte[]>(5),
                    reader.GetFieldValue<byte[]>(6),
                    reader.GetString(7),
                    reader.GetFieldValue<DateTimeOffset>(8),
                    reader.GetFieldValue<DateTimeOffset>(9),
                    reader.GetInt32(10),
                    reader.GetGuid(11)));
            }
        }

        await transaction.CommitAsync(cancellationToken);
        return new ReservedBatch(jobs, expiredCount, purgedCount);
    }

    private async Task ProcessAsync(ReservedNoticeJob job, CancellationToken cancellationToken)
    {
        if (job.Attempts >= MaximumAttempts)
        {
            await TryMarkFailedAsync(job, "delivery_attempts_exhausted", cancellationToken);
            LogTerminalFailure(job.Id);
            return;
        }

        string address;
        byte[] plaintext;
        try
        {
            plaintext = _payloadProtector.Unprotect(
                job.Id,
                RecoveryPayloadPurpose.EmailChangeNotice,
                new ProtectedRecoveryPayload(
                    job.EncryptionKeyId,
                    job.PayloadCiphertext,
                    job.PayloadNonce,
                    job.PayloadTag));
            try
            {
                address = StrictUtf8.GetString(plaintext);
            }
            finally
            {
                CryptographicOperations.ZeroMemory(plaintext);
            }
        }
        catch (Exception exception) when (exception is CryptographicException or DecoderFallbackException)
        {
            await TryMarkFailedAsync(job, "notice_payload_unavailable", cancellationToken);
            LogTerminalFailure(job.Id);
            return;
        }

        if (!IsValidEmail(address))
        {
            await TryMarkFailedAsync(job, "notice_recipient_invalid", cancellationToken);
            LogTerminalFailure(job.Id);
            return;
        }

        var now = _timeProvider.GetUtcNow();
        if (now >= job.DeadlineAt)
        {
            await TryMarkFailedAsync(job, "delivery_deadline_expired", cancellationToken);
            LogTerminalFailure(job.Id);
            return;
        }

        if (!await HasSendLeaseAsync(job, now, cancellationToken))
        {
            return;
        }

        using var sendTimeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        sendTimeout.CancelAfter(SendTimeout);
        try
        {
            await _emailService.EnviarEmailAsync(
                address,
                CreateSubject(job.Recipient),
                CreateBody(job.Recipient),
                sendTimeout.Token);
            await TryMarkDeliveredAsync(job, _timeProvider.GetUtcNow(), cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception)
        {
            await RecordDeliveryFailureAsync(job, _timeProvider.GetUtcNow(), cancellationToken);
        }
    }

    private async Task RecordDeliveryFailureAsync(
        ReservedNoticeJob job,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var attempts = job.Attempts + 1;
        var retryDelay = attempts switch
        {
            1 => FirstRetryDelay,
            2 => SecondRetryDelay,
            _ => TimeSpan.Zero
        };
        var nextAttemptAt = now.Add(retryDelay);
        var terminal = attempts >= MaximumAttempts || nextAttemptAt >= job.DeadlineAt;
        if (terminal)
        {
            var updated = await UpdateReservationAsync(
                job,
                """
                UPDATE "EmailChangeNoticeJobs"
                SET "Status" = 'Failed',
                    "Attempts" = @attempts,
                    "LastFailureCode" = 'delivery_failed',
                    "PayloadCiphertext" = decode('', 'hex'),
                    "LeaseId" = NULL,
                    "LeaseUntil" = NULL
                WHERE "Id" = @id
                  AND "Status" = 'Processing'
                  AND "LeaseId" = @leaseId
                  AND "LeaseUntil" > @now;
                """,
                attempts,
                now,
                cancellationToken);
            if (updated)
            {
                LogTerminalFailure(job.Id);
            }

            return;
        }

        var rescheduled = await UpdateReservationAsync(
            job,
            """
            UPDATE "EmailChangeNoticeJobs"
            SET "Status" = 'Pending',
                "Attempts" = @attempts,
                "LastFailureCode" = 'delivery_failed',
                "NextAttemptAt" = @nextAttemptAt,
                "LeaseId" = NULL,
                "LeaseUntil" = NULL
            WHERE "Id" = @id
              AND "Status" = 'Processing'
              AND "LeaseId" = @leaseId
              AND "LeaseUntil" > @now;
            """,
            attempts,
            now,
            cancellationToken,
            nextAttemptAt);
        if (rescheduled)
        {
            _logger.LogWarning(
                new EventId(1903, "EmailChangeNoticeRetryScheduled"),
                "Email-change notice delivery failed for recipient job {JobId}; an independent retry was scheduled.",
                job.Id);
        }
    }

    private async Task<bool> UpdateReservationAsync(
        ReservedNoticeJob job,
        string commandText,
        int attempts,
        DateTimeOffset now,
        CancellationToken cancellationToken,
        DateTimeOffset? nextAttemptAt = null)
    {
        var connection = _context.Database.GetDbConnection();
        var closeConnection = connection.State != System.Data.ConnectionState.Open;
        if (closeConnection)
        {
            await _context.Database.OpenConnectionAsync(cancellationToken);
        }

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = commandText;
            AddParameter(command, "attempts", attempts);
            AddParameter(command, "now", now);
            AddParameter(command, "id", job.Id);
            AddParameter(command, "leaseId", job.LeaseId);
            if (nextAttemptAt is { } next)
            {
                AddParameter(command, "nextAttemptAt", next);
            }

            return await command.ExecuteNonQueryAsync(cancellationToken) == 1;
        }
        finally
        {
            if (closeConnection)
            {
                await _context.Database.CloseConnectionAsync();
            }
        }
    }

    private async Task TryMarkDeliveredAsync(
        ReservedNoticeJob job,
        DateTimeOffset deliveredAt,
        CancellationToken cancellationToken)
    {
        var connection = _context.Database.GetDbConnection();
        var closeConnection = connection.State != System.Data.ConnectionState.Open;
        if (closeConnection)
        {
            await _context.Database.OpenConnectionAsync(cancellationToken);
        }

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = """
            UPDATE "EmailChangeNoticeJobs"
            SET "Status" = 'Delivered',
                "Attempts" = @attempts,
                "DeliveredAt" = @deliveredAt,
                "LastFailureCode" = NULL,
                "PayloadCiphertext" = decode('', 'hex'),
                "LeaseId" = NULL,
                "LeaseUntil" = NULL
            WHERE "Id" = @id
              AND "Status" = 'Processing'
              AND "LeaseId" = @leaseId
              AND "LeaseUntil" > @deliveredAt;
            """;
            AddParameter(command, "attempts", job.Attempts + 1);
            AddParameter(command, "deliveredAt", deliveredAt);
            AddParameter(command, "id", job.Id);
            AddParameter(command, "leaseId", job.LeaseId);
            await command.ExecuteNonQueryAsync(cancellationToken);
        }
        finally
        {
            if (closeConnection)
            {
                await _context.Database.CloseConnectionAsync();
            }
        }
    }

    private async Task TryMarkFailedAsync(
        ReservedNoticeJob job,
        string failureCode,
        CancellationToken cancellationToken)
    {
        var connection = _context.Database.GetDbConnection();
        var closeConnection = connection.State != System.Data.ConnectionState.Open;
        if (closeConnection)
        {
            await _context.Database.OpenConnectionAsync(cancellationToken);
        }

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = """
            UPDATE "EmailChangeNoticeJobs"
            SET "Status" = 'Failed',
                "LastFailureCode" = @failureCode,
                "PayloadCiphertext" = decode('', 'hex'),
                "LeaseId" = NULL,
                "LeaseUntil" = NULL
            WHERE "Id" = @id
              AND "Status" = 'Processing'
              AND "LeaseId" = @leaseId;
            """;
            AddParameter(command, "failureCode", failureCode);
            AddParameter(command, "id", job.Id);
            AddParameter(command, "leaseId", job.LeaseId);
            await command.ExecuteNonQueryAsync(cancellationToken);
        }
        finally
        {
            if (closeConnection)
            {
                await _context.Database.CloseConnectionAsync();
            }
        }
    }

    private async Task<bool> HasSendLeaseAsync(
        ReservedNoticeJob job,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var connection = _context.Database.GetDbConnection();
        var closeConnection = connection.State != System.Data.ConnectionState.Open;
        if (closeConnection)
        {
            await _context.Database.OpenConnectionAsync(cancellationToken);
        }

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = """
            SELECT EXISTS (
                SELECT 1
                FROM "EmailChangeNoticeJobs"
                WHERE "Id" = @id
                  AND "Status" = 'Processing'
                  AND "LeaseId" = @leaseId
                  AND "LeaseUntil" > @minimumLeaseUntil
                  AND "DeadlineAt" > @now
            );
            """;
            AddParameter(command, "id", job.Id);
            AddParameter(command, "leaseId", job.LeaseId);
            AddParameter(command, "minimumLeaseUntil", now.Add(SendTimeout));
            AddParameter(command, "now", now);
            var result = await command.ExecuteScalarAsync(cancellationToken);
            return Convert.ToBoolean(result, System.Globalization.CultureInfo.InvariantCulture);
        }
        finally
        {
            if (closeConnection)
            {
                await _context.Database.CloseConnectionAsync();
            }
        }
    }

    private static DbCommand CreateCommand(
        DbConnection connection,
        DbTransaction transaction,
        string commandText)
    {
        var command = connection.CreateCommand();
        command.Transaction = transaction;
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

    private static string CreateSubject(EmailChangeNoticeRecipient recipient) => recipient switch
    {
        EmailChangeNoticeRecipient.PreviousAddress => "Aviso de alteração de e-mail — LabOn",
        EmailChangeNoticeRecipient.NewAddress => "Confirmação de alteração de e-mail — LabOn",
        _ => "Aviso de segurança da conta — LabOn"
    };

    private static string CreateBody(EmailChangeNoticeRecipient recipient) => recipient switch
    {
        EmailChangeNoticeRecipient.PreviousAddress => "<p>O endereço de e-mail associado à sua conta LabOn foi alterado.</p><p>Se você não reconhece essa alteração, entre em contato com a equipe do laboratório.</p>",
        EmailChangeNoticeRecipient.NewAddress => "<p>Este endereço foi associado a uma conta LabOn.</p><p>Se você não reconhece essa alteração, entre em contato com a equipe do laboratório.</p>",
        _ => "<p>Foi registrada uma alteração de e-mail em uma conta LabOn.</p>"
    };

    private static bool IsValidEmail(string? email) =>
        !string.IsNullOrWhiteSpace(email)
        && email.Length <= 254
        && !email.Any(char.IsControl)
        && MailAddress.TryCreate(email, out var address)
        && string.Equals(address.Address, email, StringComparison.OrdinalIgnoreCase);

    private void LogTerminalFailure(Guid jobId) => _logger.LogError(
        new EventId(1904, "EmailChangeNoticeTerminalFailure"),
        "Email-change notice delivery entered a terminal state for recipient job {JobId}; sanitized evidence is available to authorized support.",
        jobId);

    private sealed record ReservedBatch(
        IReadOnlyList<ReservedNoticeJob> Jobs,
        int ExpiredCount,
        int PurgedCount);

    private sealed record ReservedNoticeJob(
        Guid Id,
        Guid OperationId,
        int? UserId,
        EmailChangeNoticeRecipient Recipient,
        byte[] PayloadCiphertext,
        byte[] PayloadNonce,
        byte[] PayloadTag,
        string EncryptionKeyId,
        DateTimeOffset CreatedAt,
        DateTimeOffset DeadlineAt,
        int Attempts,
        Guid LeaseId);

}
