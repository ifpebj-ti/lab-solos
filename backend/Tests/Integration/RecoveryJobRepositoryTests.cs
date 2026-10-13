using System.Security.Cryptography;
using System.Text;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSql15IntegrationGroup.Name)]
public sealed class RecoveryJobRepositoryTests(PostgreSql15ContainerFixture database)
{
    private static readonly byte[] EncryptionKey = Enumerable.Range(0, 32).Select(value => (byte)value).ToArray();

    [Fact]
    public async Task ExistingSchemaPersistsEncryptedRecoveryJobPayload()
    {
        await database.RecreateEmptyDatabaseAsync();
        await using var context = CreateContext();
        await context.Database.MigrateAsync();

        var payload = new PasswordRecoveryJob
        {
            Id = Guid.NewGuid(),
            DeliveryKeyHash = new byte[32],
            RecipientKeyHash = Enumerable.Repeat((byte)1, 32).ToArray(),
            PayloadCiphertext = [4, 5, 6],
            PayloadNonce = new byte[12],
            PayloadTag = new byte[16],
            EncryptionKeyId = "synthetic-key-v1",
            CreatedAt = DateTimeOffset.UtcNow,
            ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(15),
            NextAttemptAt = DateTimeOffset.UtcNow,
            Status = PasswordRecoveryJobStatus.Pending
        };

        context.PasswordRecoveryJobs.Add(payload);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var persisted = await context.PasswordRecoveryJobs.SingleAsync();
        Assert.Equal(payload.PayloadCiphertext, persisted.PayloadCiphertext);
        Assert.Equal(payload.PayloadNonce, persisted.PayloadNonce);
        Assert.Equal(payload.PayloadTag, persisted.PayloadTag);
        Assert.Equal(payload.EncryptionKeyId, persisted.EncryptionKeyId);
    }

    [Fact]
    public async Task ConcurrentReservationsCoalesceTheSameDeliveryKey()
    {
        await database.RecreateEmptyDatabaseAsync();
        await using (var migrationContext = CreateContext())
        {
            await migrationContext.Database.MigrateAsync();
        }

        await using var firstContext = CreateContext();
        await using var secondContext = CreateContext();
        var firstRepository = CreateRepository(firstContext);
        var secondRepository = CreateRepository(secondContext);
        var deliveryKey = Hash("same-exact-email@example.invalid");
        var recipientKey = Hash("normalized-email@example.invalid");
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(15);

        var results = await Task.WhenAll(
            firstRepository.EnqueueOrCoalesceAsync(deliveryKey, recipientKey, Encoding.UTF8.GetBytes("request-one"), expiresAt),
            secondRepository.EnqueueOrCoalesceAsync(deliveryKey, recipientKey, Encoding.UTF8.GetBytes("request-two"), expiresAt));

        Assert.Single(results, result => result.Status == RecoveryJobEnqueueStatus.Enqueued);
        Assert.Single(results, result => result.Status == RecoveryJobEnqueueStatus.Coalesced);
        Assert.Equal(results[0].JobId, results[1].JobId);
        Assert.Equal(1, await CountActiveJobsAsync());
        Assert.Equal(1, await ReadAllocatedCapacityAsync());
        var persisted = await ReadJobAsync(results[0].JobId!.Value);
        Assert.True(Encoding.UTF8.GetString(Unprotect(persisted, RecoveryPayloadPurpose.Request)) is "request-one" or "request-two");
    }

    [Fact]
    public async Task ConcurrentWorkersCannotReserveOneJobAtTheSameTime()
    {
        await InitializeDatabaseAsync();
        await using var enqueueContext = CreateContext();
        var repository = CreateRepository(enqueueContext);
        await EnqueueAsync(repository, "exclusive-reservation@example.invalid", "work-payload");

        await using var firstContext = CreateContext();
        await using var secondContext = CreateContext();
        var results = await Task.WhenAll(
            CreateRepository(firstContext).ReserveBatchAsync(batchSize: 1),
            CreateRepository(secondContext).ReserveBatchAsync(batchSize: 1));

        Assert.Equal(1, results.Sum(batch => batch.Count));
        Assert.Single(results.SelectMany(batch => batch).Select(job => job.Id).Distinct());
    }

    [Fact]
    public async Task ExpiredLeaseCanBeRetakenWithTheSameEncryptedPayloadAndOldWorkerCannotComplete()
    {
        await InitializeDatabaseAsync();
        await using var context = CreateContext();
        var repository = CreateRepository(context);
        var plaintext = Encoding.UTF8.GetBytes("stable-recovery-code");
        var enqueued = await EnqueueAsync(repository, "resume@example.invalid", plaintext);
        var firstLease = Assert.Single(await repository.ReserveBatchAsync(batchSize: 1));

        await SetLeaseExpiredAsync(firstLease.Id);
        var resumed = Assert.Single(await repository.ReserveBatchAsync(batchSize: 1));

        Assert.Equal(enqueued.JobId, resumed.Id);
        Assert.NotEqual(firstLease.LeaseId, resumed.LeaseId);
        Assert.Equal(plaintext, Unprotect(resumed));
        Assert.False(await repository.TryCompleteAsync(firstLease.Id, firstLease.LeaseId));
        Assert.True(await repository.TryCompleteAsync(resumed.Id, resumed.LeaseId));
        Assert.Equal(0, await ReadAllocatedCapacityAsync());

        var terminal = await ReadJobAsync(resumed.Id);
        Assert.Equal(PasswordRecoveryJobStatus.Completed, terminal.Status);
        Assert.Empty(terminal.PayloadCiphertext);
    }

    [Fact]
    public async Task DifferentExactDeliveryKeysRemainSeparateWithSharedRecipientQuotaKey()
    {
        await InitializeDatabaseAsync();
        await using var context = CreateContext();
        var repository = CreateRepository(context);
        var recipientKey = Hash("normalized@example.invalid");

        var first = await repository.EnqueueOrCoalesceAsync(
            Hash("person@example.invalid"), recipientKey, Encoding.UTF8.GetBytes("first"), DateTimeOffset.UtcNow.AddMinutes(15));
        var second = await repository.EnqueueOrCoalesceAsync(
            Hash("PERSON@example.invalid"), recipientKey, Encoding.UTF8.GetBytes("second"), DateTimeOffset.UtcNow.AddMinutes(15));

        Assert.Equal(RecoveryJobEnqueueStatus.Enqueued, first.Status);
        Assert.Equal(RecoveryJobEnqueueStatus.Enqueued, second.Status);
        Assert.NotEqual(first.JobId, second.JobId);
        Assert.Equal(2, await CountActiveJobsAsync());
        Assert.Equal(2, await ReadAllocatedCapacityAsync());
    }

    [Fact]
    public async Task QueueAtCapacityCoalescesExistingKeyAndRejectsGrowth()
    {
        await InitializeDatabaseAsync();
        var repeatedDeliveryHash = await FillQueueToCapacityAsync();
        await using var context = CreateContext();
        var repository = CreateRepository(context);

        var coalesced = await repository.EnqueueOrCoalesceAsync(
            repeatedDeliveryHash,
            new byte[32],
            Encoding.UTF8.GetBytes("must-not-replace"),
            DateTimeOffset.UtcNow.AddMinutes(15));
        var rejected = await repository.EnqueueOrCoalesceAsync(
            Hash("new-full-queue-key@example.invalid"),
            new byte[32],
            Encoding.UTF8.GetBytes("queue-full"),
            DateTimeOffset.UtcNow.AddMinutes(15));

        Assert.Equal(RecoveryJobEnqueueStatus.Coalesced, coalesced.Status);
        Assert.Equal(RecoveryJobEnqueueStatus.QueueFull, rejected.Status);
        Assert.Equal(5_000, await CountActiveJobsAsync());
        Assert.Equal(5_000, await ReadAllocatedCapacityAsync());
    }

    [Fact]
    public async Task UserCancellationScrubsPayloadAndInvalidatesCurrentLease()
    {
        await InitializeDatabaseAsync();
        await using var context = CreateContext();
        var repository = CreateRepository(context);
        var enqueued = await EnqueueAsync(repository, "cancel@example.invalid", "original-request");
        var lease = Assert.Single(await repository.ReserveBatchAsync(batchSize: 1));
        var userId = await InsertUserAsync("delivery-recipient@example.invalid");
        Assert.True(await repository.TryReplacePayloadAsync(
            lease.Id,
            lease.LeaseId,
            Encoding.UTF8.GetBytes("delivery-code-payload"),
            RecoveryPayloadPurpose.Delivery,
            userId,
            sessionVersion: 7,
            expiresAt: DateTimeOffset.UtcNow.AddMinutes(15)));

        Assert.Equal(1, await repository.CancelForUserAsync(userId));
        Assert.False(await repository.TryCompleteAsync(lease.Id, lease.LeaseId));
        Assert.Equal(0, await ReadAllocatedCapacityAsync());
        var cancelled = await ReadJobAsync(enqueued.JobId!.Value);
        Assert.Equal(PasswordRecoveryJobStatus.Cancelled, cancelled.Status);
        Assert.Empty(cancelled.PayloadCiphertext);
    }

    [Fact]
    public async Task RepositoryJoinsAnAdmissionTransaction()
    {
        await InitializeDatabaseAsync();
        await using var context = CreateContext();
        var repository = CreateRepository(context);
        await using (var transaction = await context.Database.BeginTransactionAsync())
        {
            var result = await EnqueueAsync(repository, "rollback@example.invalid", "transactional-request");
            Assert.Equal(RecoveryJobEnqueueStatus.Enqueued, result.Status);
            await transaction.RollbackAsync();
        }

        Assert.Equal(0, await CountActiveJobsAsync());
        Assert.Equal(0, await ReadAllocatedCapacityAsync());
    }

    [Fact]
    public async Task ExpiredJobsAreCancelledScrubbedAndRemovedFromCapacity()
    {
        await InitializeDatabaseAsync();
        await using var context = CreateContext();
        var repository = CreateRepository(context);
        var result = await EnqueueAsync(repository, "expired@example.invalid", "expired-payload");

        await using (var connection = new NpgsqlConnection(database.ConnectionString))
        {
            await connection.OpenAsync();
            await using var command = connection.CreateCommand();
            command.CommandText = "UPDATE \"PasswordRecoveryJobs\" SET \"CreatedAt\" = clock_timestamp() - interval '16 minutes', \"ExpiresAt\" = clock_timestamp() - interval '1 second' WHERE \"Id\" = @id;";
            command.Parameters.AddWithValue("id", result.JobId!.Value);
            await command.ExecuteNonQueryAsync();
        }

        Assert.Equal(1, await repository.CleanupExpiredAsync());
        Assert.Equal(0, await ReadAllocatedCapacityAsync());
        var expired = await ReadJobAsync(result.JobId!.Value);
        Assert.Equal(PasswordRecoveryJobStatus.Cancelled, expired.Status);
        Assert.Empty(expired.PayloadCiphertext);
    }

    [Fact]
    public async Task EnqueueReclaimsAnExpiredMatchingKeyOutsideItsCleanupBatch()
    {
        await InitializeDatabaseAsync();
        var targetKey = Hash("expired-outside-cleanup@example.invalid");
        await using (var connection = new NpgsqlConnection(database.ConnectionString))
        {
            await connection.OpenAsync();
            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO "PasswordRecoveryJobs"
                    ("Id", "DeliveryKeyHash", "RecipientKeyHash", "PayloadCiphertext", "PayloadNonce", "PayloadTag",
                     "EncryptionKeyId", "CreatedAt", "ExpiresAt", "NextAttemptAt", "Status", "Attempts")
                SELECT lpad(to_hex(slot), 32, '0')::uuid,
                       CASE WHEN slot = 101 THEN @targetKey
                            ELSE decode(lpad(to_hex(slot), 64, '0'), 'hex') END,
                       decode(repeat('00', 32), 'hex'), decode('010203', 'hex'),
                       decode(repeat('00', 12), 'hex'), decode(repeat('00', 16), 'hex'), 'synthetic-key',
                       clock_timestamp() - interval '20 minutes',
                       clock_timestamp() - ((102 - slot) * interval '1 second'),
                       clock_timestamp() - interval '15 minutes', 'Pending', 0
                FROM generate_series(1, 101) AS slot;
                UPDATE "AuthenticationProtectionCapacity"
                SET "Allocated" = 101 WHERE "Scope" = 'recovery-jobs';
                """;
            command.Parameters.AddWithValue("targetKey", targetKey);
            await command.ExecuteNonQueryAsync();
        }

        await using var context = CreateContext();
        var result = await CreateRepository(context).EnqueueOrCoalesceAsync(
            targetKey,
            Hash("expired-outside-cleanup@example.invalid"),
            Encoding.UTF8.GetBytes("fresh-request"),
            DateTimeOffset.UtcNow.AddMinutes(15));

        Assert.Equal(RecoveryJobEnqueueStatus.Enqueued, result.Status);
        Assert.Equal(1, await CountActiveJobsAsync());
        Assert.Equal(1, await ReadAllocatedCapacityAsync());
        var expiredTarget = await context.PasswordRecoveryJobs
            .SingleAsync(job => job.Id != result.JobId && job.DeliveryKeyHash == targetKey);
        Assert.Equal(PasswordRecoveryJobStatus.Cancelled, expiredTarget.Status);
        Assert.Empty(expiredTarget.PayloadCiphertext);
    }

    [Fact]
    public async Task RetryRetainsTheProtectedCodeForTheNextReservation()
    {
        await InitializeDatabaseAsync();
        await using var context = CreateContext();
        var repository = CreateRepository(context);
        var plaintext = Encoding.UTF8.GetBytes("stable-code-across-retry");
        var result = await EnqueueAsync(repository, "retry@example.invalid", plaintext);
        var first = Assert.Single(await repository.ReserveBatchAsync(batchSize: 1));
        var nextAttempt = DateTimeOffset.UtcNow.AddSeconds(-1);

        Assert.True(await repository.TryScheduleRetryAsync(first.Id, first.LeaseId, attempts: 1, nextAttempt));
        Assert.False(await repository.TryCompleteAsync(first.Id, first.LeaseId));
        var second = Assert.Single(await repository.ReserveBatchAsync(batchSize: 1));

        Assert.Equal(result.JobId, second.Id);
        Assert.Equal(1, second.Attempts);
        Assert.Equal(plaintext, Unprotect(second));
    }

    private AppDbContext CreateContext() => new(
        new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(database.ConnectionString)
            .Options);

    private async Task InitializeDatabaseAsync()
    {
        await database.RecreateEmptyDatabaseAsync();
        await using var context = CreateContext();
        await context.Database.MigrateAsync();
    }

    private static PasswordRecoveryJobRepository CreateRepository(AppDbContext context) =>
        new(context, new RecoveryPayloadProtector(new TestRecoveryKeyProvider()), TimeProvider.System);

    private static Task<RecoveryJobEnqueueResult> EnqueueAsync(
        PasswordRecoveryJobRepository repository,
        string email,
        string payload) => EnqueueAsync(repository, email, Encoding.UTF8.GetBytes(payload));

    private static Task<RecoveryJobEnqueueResult> EnqueueAsync(
        PasswordRecoveryJobRepository repository,
        string email,
        byte[] payload) =>
        repository.EnqueueOrCoalesceAsync(
            Hash(email),
            Hash(email.Trim().ToLowerInvariant()),
            payload,
            DateTimeOffset.UtcNow.AddMinutes(15));

    private static byte[] Hash(string value) => SHA256.HashData(Encoding.UTF8.GetBytes(value));

    private static byte[] Unprotect(ReservedRecoveryJob job) =>
        new RecoveryPayloadProtector(new TestRecoveryKeyProvider()).Unprotect(job.Id, job.PayloadPurpose, job.Payload);

    private static byte[] Unprotect(PasswordRecoveryJob job, RecoveryPayloadPurpose purpose) =>
        new RecoveryPayloadProtector(new TestRecoveryKeyProvider()).Unprotect(
            job.Id,
            purpose,
            new ProtectedRecoveryPayload(
                job.EncryptionKeyId,
                job.PayloadCiphertext,
                job.PayloadNonce,
                job.PayloadTag));

    private async Task SetLeaseExpiredAsync(Guid jobId)
    {
        await using var connection = new NpgsqlConnection(database.ConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "UPDATE \"PasswordRecoveryJobs\" SET \"LeaseUntil\" = clock_timestamp() - interval '1 second' WHERE \"Id\" = @id;";
        command.Parameters.AddWithValue("id", jobId);
        await command.ExecuteNonQueryAsync();
    }

    private async Task<int> CountActiveJobsAsync()
    {
        await using var connection = new NpgsqlConnection(database.ConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM \"PasswordRecoveryJobs\" WHERE \"Status\" IN ('Pending', 'Processing');";
        return Convert.ToInt32(await command.ExecuteScalarAsync(), System.Globalization.CultureInfo.InvariantCulture);
    }

    private async Task<int> ReadAllocatedCapacityAsync()
    {
        await using var connection = new NpgsqlConnection(database.ConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT \"Allocated\" FROM \"AuthenticationProtectionCapacity\" WHERE \"Scope\" = 'recovery-jobs';";
        return Convert.ToInt32(await command.ExecuteScalarAsync(), System.Globalization.CultureInfo.InvariantCulture);
    }

    private async Task<int> InsertUserAsync(string email)
    {
        await using var connection = new NpgsqlConnection(database.ConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO "Usuarios" ("NomeCompleto", "Email", "SenhaHash", "NivelUsuario", "TipoUsuario", "Status")
            VALUES ('Synthetic recovery recipient', @email, 'synthetic-password-hash', 0, 2, 0)
            RETURNING "Id";
            """;
        command.Parameters.AddWithValue("email", email);
        return Convert.ToInt32(await command.ExecuteScalarAsync(), System.Globalization.CultureInfo.InvariantCulture);
    }

    private async Task<byte[]> FillQueueToCapacityAsync()
    {
        var repeatedKey = Hash("full-queue-duplicate@example.invalid");
        await using var connection = new NpgsqlConnection(database.ConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO "PasswordRecoveryJobs"
                ("Id", "DeliveryKeyHash", "RecipientKeyHash", "PayloadCiphertext", "PayloadNonce", "PayloadTag",
                 "EncryptionKeyId", "CreatedAt", "ExpiresAt", "NextAttemptAt", "Status", "Attempts")
            SELECT lpad(to_hex(index), 32, '0')::uuid,
                   CASE WHEN index = 1 THEN @repeatedKey
                        ELSE decode(md5(index::text) || md5('delivery-' || index::text), 'hex') END,
                   decode(repeat('00', 32), 'hex'),
                   decode('010203', 'hex'), decode(repeat('00', 12), 'hex'), decode(repeat('00', 16), 'hex'),
                   'synthetic-key', clock_timestamp(), clock_timestamp() + interval '15 minutes',
                   clock_timestamp(), 'Pending', 0
            FROM generate_series(1, 5000) AS index;
            UPDATE "AuthenticationProtectionCapacity"
            SET "Allocated" = 5000 WHERE "Scope" = 'recovery-jobs';
            """;
        command.Parameters.AddWithValue("repeatedKey", repeatedKey);
        await command.ExecuteNonQueryAsync();
        return repeatedKey;
    }

    private async Task<PasswordRecoveryJob> ReadJobAsync(Guid id)
    {
        await using var context = CreateContext();
        return await context.PasswordRecoveryJobs.SingleAsync(job => job.Id == id);
    }

    private sealed class TestRecoveryKeyProvider : IRecoveryEncryptionKeyProvider
    {
        public string ActiveKeyId => "t010-test-key";

        public byte[] CopyKey(string keyId) =>
            string.Equals(keyId, ActiveKeyId, StringComparison.Ordinal)
                ? (byte[])EncryptionKey.Clone()
                : throw new CryptographicException("The synthetic key is unavailable.");
    }
}
