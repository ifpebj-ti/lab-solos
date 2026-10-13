using System.Data;
using System.Data.Common;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Options;
using Npgsql;
using NpgsqlTypes;

namespace LabSolos_Server_DotNet8.Services.Security;

public sealed class PostgresAuthenticationThrottle
{
    private const int AllocationRetryLimit = 3;
    private const int CapacityRetryAfterSeconds = 30;
    private static readonly string[] ThrottleScopes =
    [
        AuthenticationProtectionCapacity.LoginAccount,
        AuthenticationProtectionCapacity.LoginIp,
        AuthenticationProtectionCapacity.RecoveryRequestRecipient,
        AuthenticationProtectionCapacity.RecoveryRequestIp,
        AuthenticationProtectionCapacity.RecoveryCodeRecipient,
        AuthenticationProtectionCapacity.RecoveryCodeIp
    ];

    private readonly AppDbContext _context;
    private readonly AuthenticationProtectionOptions _options;
    private readonly IAuthenticationThrottleClock _clock;

    public PostgresAuthenticationThrottle(
        AppDbContext context,
        IOptions<AuthenticationProtectionOptions> options,
        IAuthenticationThrottleClock clock)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
        _options = (options ?? throw new ArgumentNullException(nameof(options))).Value;
        _clock = clock ?? throw new ArgumentNullException(nameof(clock));
    }

    public async Task<AuthenticationThrottleResult> TryBeginAsync(
        IReadOnlyCollection<AuthenticationThrottleRule> rules,
        CancellationToken cancellationToken = default)
    {
        var orderedRules = ValidateAndOrderRules(rules);
        if (_context.Database.CurrentTransaction is not null)
        {
            throw new InvalidOperationException("A throttle transaction cannot be nested in another transaction.");
        }

        using var operationTimeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        operationTimeout.CancelAfter(TimeSpan.FromSeconds(_options.OperationTimeoutSeconds));

        try
        {
            for (var retry = 0; retry < AllocationRetryLimit; retry++)
            {
                var allocationResult = await EnsureBucketsAllocatedAsync(orderedRules, operationTimeout.Token);
                if (allocationResult is not null)
                {
                    return allocationResult;
                }

                var beginResult = await BeginAttemptTransactionAsync(orderedRules, operationTimeout.Token);
                if (beginResult.Result is not null)
                {
                    return beginResult.Result;
                }

                if (!beginResult.MissingBucket)
                {
                    return Unavailable();
                }
            }

            return Unavailable();
        }
        catch (Exception exception) when (IsInfrastructureFailure(exception, cancellationToken))
        {
            return Unavailable();
        }
    }

    public async Task<int> CleanupExpiredAsync(CancellationToken cancellationToken = default)
    {
        if (_context.Database.CurrentTransaction is not null)
        {
            throw new InvalidOperationException("Throttle cleanup cannot be nested in another transaction.");
        }

        using var operationTimeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        operationTimeout.CancelAfter(TimeSpan.FromSeconds(_options.OperationTimeoutSeconds));

        try
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(
                IsolationLevel.ReadCommitted,
                operationTimeout.Token);
            var connection = GetConnection();
            var dbTransaction = (NpgsqlTransaction)transaction.GetDbTransaction();
            await SetTransactionTimeoutsAsync(connection, dbTransaction, operationTimeout.Token);

            var capacities = await LockCapacityRowsAsync(
                connection,
                dbTransaction,
                ThrottleScopes,
                operationTimeout.Token);
            if (capacities.Count != ThrottleScopes.Length)
            {
                await transaction.RollbackAsync(CancellationToken.None);
                return 0;
            }

            var now = await _clock.GetUtcNowAsync(connection, dbTransaction, operationTimeout.Token);
            var removed = 0;
            foreach (var scope in ThrottleScopes.Order(StringComparer.Ordinal))
            {
                removed += await RemoveExpiredBucketsAsync(
                    connection,
                    dbTransaction,
                    scope,
                    now,
                    _options.CleanupBatchSize,
                    capacities[scope],
                    operationTimeout.Token);
            }

            await transaction.CommitAsync(operationTimeout.Token);
            return removed;
        }
        catch (Exception exception) when (IsInfrastructureFailure(exception, cancellationToken))
        {
            return 0;
        }
    }

    private async Task<AuthenticationThrottleResult?> EnsureBucketsAllocatedAsync(
        IReadOnlyList<AuthenticationThrottleRule> rules,
        CancellationToken cancellationToken)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync(
            IsolationLevel.ReadCommitted,
            cancellationToken);
        var connection = GetConnection();
        var dbTransaction = (NpgsqlTransaction)transaction.GetDbTransaction();
        await SetTransactionTimeoutsAsync(connection, dbTransaction, cancellationToken);

        var missingBeforeLock = new List<AuthenticationThrottleRule>();
        foreach (var rule in rules)
        {
            if (!await BucketExistsAsync(connection, dbTransaction, rule, cancellationToken))
            {
                missingBeforeLock.Add(rule);
            }
        }

        if (missingBeforeLock.Count == 0)
        {
            await transaction.CommitAsync(cancellationToken);
            return null;
        }

        var scopesToLock = missingBeforeLock
            .Select(rule => rule.Scope)
            .Distinct(StringComparer.Ordinal)
            .Order(StringComparer.Ordinal)
            .ToArray();
        var capacities = await LockCapacityRowsAsync(
            connection,
            dbTransaction,
            scopesToLock,
            cancellationToken);
        if (capacities.Count != scopesToLock.Length)
        {
            await transaction.RollbackAsync(CancellationToken.None);
            return Unavailable();
        }

        var now = await _clock.GetUtcNowAsync(connection, dbTransaction, cancellationToken);
        foreach (var scope in scopesToLock)
        {
            var missingForScope = new List<AuthenticationThrottleRule>();
            foreach (var rule in rules.Where(rule => string.Equals(rule.Scope, scope, StringComparison.Ordinal)))
            {
                if (!await BucketExistsAsync(connection, dbTransaction, rule, cancellationToken))
                {
                    missingForScope.Add(rule);
                }
            }

            if (missingForScope.Count == 0)
            {
                continue;
            }

            var allocation = capacities[scope];
            var additional = allocation + missingForScope.Count - _options.MaxBucketsPerScope;
            if (additional > 0)
            {
                var removed = await RemoveExpiredBucketsAsync(
                    connection,
                    dbTransaction,
                    scope,
                    now,
                    Math.Min(_options.CleanupBatchSize, additional),
                    allocation,
                    cancellationToken);
                allocation -= removed;
                capacities[scope] = allocation;
            }

            missingForScope.Clear();
            foreach (var rule in rules.Where(rule => string.Equals(rule.Scope, scope, StringComparison.Ordinal)))
            {
                if (!await BucketExistsAsync(connection, dbTransaction, rule, cancellationToken))
                {
                    missingForScope.Add(rule);
                }
            }

            if (allocation + missingForScope.Count > _options.MaxBucketsPerScope)
            {
                await transaction.CommitAsync(cancellationToken);
                return new AuthenticationThrottleResult(
                    AuthenticationThrottleState.CapacityExceeded,
                    CapacityRetryAfterSeconds);
            }

            var inserted = 0;
            foreach (var rule in missingForScope)
            {
                inserted += await InsertPlaceholderAsync(connection, dbTransaction, rule, now, cancellationToken);
            }

            if (inserted > 0)
            {
                await IncrementCapacityAsync(
                    connection,
                    dbTransaction,
                    scope,
                    inserted,
                    cancellationToken);
                capacities[scope] += inserted;
            }
        }

        await transaction.CommitAsync(cancellationToken);
        return null;
    }

    private async Task<BeginAttemptResult> BeginAttemptTransactionAsync(
        IReadOnlyList<AuthenticationThrottleRule> rules,
        CancellationToken cancellationToken)
    {
        var transaction = await _context.Database.BeginTransactionAsync(
            IsolationLevel.ReadCommitted,
            cancellationToken);
        var retainTransaction = false;
        try
        {
            var connection = GetConnection();
            var dbTransaction = (NpgsqlTransaction)transaction.GetDbTransaction();
            await SetTransactionTimeoutsAsync(connection, dbTransaction, cancellationToken);

            var buckets = new List<BucketState>(rules.Count);
            foreach (var rule in rules)
            {
                var bucket = await LockBucketAsync(connection, dbTransaction, rule, cancellationToken);
                if (bucket is null)
                {
                    await transaction.RollbackAsync(CancellationToken.None);
                    return new BeginAttemptResult(null, MissingBucket: true);
                }

                buckets.Add(bucket);
            }

            var now = await _clock.GetUtcNowAsync(connection, dbTransaction, cancellationToken);
            var blockingUntil = GetBlockingDeadline(buckets, now);
            if (blockingUntil is not null)
            {
                await transaction.RollbackAsync(CancellationToken.None);
                return new BeginAttemptResult(
                    new AuthenticationThrottleResult(
                        AuthenticationThrottleState.RateLimited,
                        GetRetryAfterSeconds(blockingUntil.Value, now)),
                    MissingBucket: false);
            }

            var stagedEmissionDeadlines = new Dictionary<BucketIdentity, DateTimeOffset?>();
            var attempt = new AuthenticationThrottleAttempt(
                (outcome, token) => CompleteAttemptAsync(
                    transaction,
                    connection,
                    dbTransaction,
                    buckets,
                    stagedEmissionDeadlines,
                    outcome,
                    token),
                () => RollbackAndDisposeAsync(transaction),
                (scope, keyHash, deadline) => StageNextEmissionDeadline(
                    buckets,
                    stagedEmissionDeadlines,
                    scope,
                    keyHash,
                    deadline));
            retainTransaction = true;
            return new BeginAttemptResult(
                new AuthenticationThrottleResult(AuthenticationThrottleState.Allowed, Attempt: attempt),
                MissingBucket: false);
        }
        finally
        {
            if (!retainTransaction)
            {
                await transaction.DisposeAsync();
            }
        }
    }

    private async Task CompleteAttemptAsync(
        IDbContextTransaction transaction,
        NpgsqlConnection connection,
        NpgsqlTransaction dbTransaction,
        IReadOnlyList<BucketState> buckets,
        IReadOnlyDictionary<BucketIdentity, DateTimeOffset?> stagedEmissionDeadlines,
        AuthenticationThrottleOutcome outcome,
        CancellationToken cancellationToken)
    {
        using var operationTimeout = outcome == AuthenticationThrottleOutcome.Failure
            ? new CancellationTokenSource(TimeSpan.FromSeconds(_options.OperationTimeoutSeconds))
            : CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        if (outcome != AuthenticationThrottleOutcome.Failure)
        {
            operationTimeout.CancelAfter(TimeSpan.FromSeconds(_options.OperationTimeoutSeconds));
        }

        var effectiveToken = operationTimeout.Token;
        try
        {
            await _context.SaveChangesAsync(effectiveToken);
            var now = await _clock.GetUtcNowAsync(connection, dbTransaction, effectiveToken);
            foreach (var bucket in buckets)
            {
                var increment = outcome == AuthenticationThrottleOutcome.Failure
                    || (outcome == AuthenticationThrottleOutcome.Accepted && bucket.Rule.CountOnAccepted);
                var count = bucket.WindowEndsAt > now ? bucket.Count : 0;
                var startedAt = bucket.WindowStartedAt;
                var endsAt = bucket.WindowEndsAt;

                if (increment)
                {
                    if (count == 0)
                    {
                        startedAt = now;
                        endsAt = now.Add(bucket.Rule.Window);
                    }

                    count++;
                }

                var nextAllowedAt = IsAfter(bucket.NextAllowedAt, now) ? bucket.NextAllowedAt : null;
                if (outcome == AuthenticationThrottleOutcome.Accepted
                    && bucket.Rule.AcceptedCooldown is { } cooldown)
                {
                    nextAllowedAt = now.Add(cooldown);
                }

                var nextEmissionAt = IsAfter(bucket.NextEmissionAt, now) ? bucket.NextEmissionAt : null;
                if (stagedEmissionDeadlines.TryGetValue(bucket.Identity, out var stagedDeadline))
                {
                    nextEmissionAt = stagedDeadline;
                }

                await UpdateBucketAsync(
                    connection,
                    dbTransaction,
                    bucket.Identity,
                    startedAt,
                    endsAt,
                    count,
                    nextAllowedAt,
                    nextEmissionAt,
                    effectiveToken);
            }

            await transaction.CommitAsync(effectiveToken);
        }
        finally
        {
            await transaction.DisposeAsync();
        }
    }

    private static async Task<int> RemoveExpiredBucketsAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction transaction,
        string scope,
        DateTimeOffset now,
        int batchSize,
        int currentAllocation,
        CancellationToken cancellationToken)
    {
        if (batchSize <= 0 || currentAllocation <= 0)
        {
            return 0;
        }

        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            WITH candidates AS (
                SELECT ctid
                FROM "AuthenticationThrottleBuckets"
                WHERE "Scope" = @scope
                  AND (
                    ("Count" = 0 AND "NextAllowedAt" IS NULL AND "NextEmissionAt" IS NULL)
                    OR (
                        "WindowEndsAt" <= @now
                        AND ("NextAllowedAt" IS NULL OR "NextAllowedAt" <= @now)
                        AND ("NextEmissionAt" IS NULL OR "NextEmissionAt" <= @now)
                    )
                  )
                ORDER BY "WindowEndsAt", "KeyHash"
                LIMIT @batch_size
                FOR UPDATE SKIP LOCKED
            )
            DELETE FROM "AuthenticationThrottleBuckets" AS bucket
            USING candidates
            WHERE bucket.ctid = candidates.ctid;
            """;
        AddText(command, "scope", scope);
        AddTimestamp(command, "now", now);
        AddInt(command, "batch_size", Math.Min(batchSize, currentAllocation));
        var removed = await command.ExecuteNonQueryAsync(cancellationToken);
        if (removed == 0)
        {
            return 0;
        }

        await using var update = connection.CreateCommand();
        update.Transaction = transaction;
        update.CommandText = """
            UPDATE "AuthenticationProtectionCapacity"
            SET "Allocated" = "Allocated" - @removed
            WHERE "Scope" = @scope AND "Allocated" >= @removed;
            """;
        AddText(update, "scope", scope);
        AddInt(update, "removed", removed);
        if (await update.ExecuteNonQueryAsync(cancellationToken) != 1)
        {
            throw new InvalidOperationException("Throttle capacity accounting is inconsistent.");
        }

        return removed;
    }

    private static async Task<Dictionary<string, int>> LockCapacityRowsAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction transaction,
        IReadOnlyCollection<string> scopes,
        CancellationToken cancellationToken)
    {
        var orderedScopes = scopes.Distinct(StringComparer.Ordinal).Order(StringComparer.Ordinal).ToArray();
        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            SELECT "Scope", "Allocated"
            FROM "AuthenticationProtectionCapacity"
            WHERE "Scope" = ANY(@scopes)
            ORDER BY "Scope"
            FOR UPDATE;
            """;
        command.Parameters.Add("scopes", NpgsqlDbType.Array | NpgsqlDbType.Text).Value = orderedScopes;
        var capacities = new Dictionary<string, int>(StringComparer.Ordinal);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            capacities.Add(reader.GetString(0), reader.GetInt32(1));
        }

        return capacities;
    }

    private static async Task<bool> BucketExistsAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction transaction,
        AuthenticationThrottleRule rule,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            SELECT EXISTS (
                SELECT 1 FROM "AuthenticationThrottleBuckets"
                WHERE "Scope" = @scope AND "KeyHash" = @key_hash
            );
            """;
        AddText(command, "scope", rule.Scope);
        AddHash(command, "key_hash", rule.KeyHash);
        return (bool)(await command.ExecuteScalarAsync(cancellationToken) ?? false);
    }

    private static async Task<int> InsertPlaceholderAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction transaction,
        AuthenticationThrottleRule rule,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            INSERT INTO "AuthenticationThrottleBuckets"
                ("Scope", "KeyHash", "WindowStartedAt", "WindowEndsAt", "Count", "NextAllowedAt", "NextEmissionAt")
            VALUES (@scope, @key_hash, @started_at, @ends_at, 0, NULL, NULL)
            ON CONFLICT ("Scope", "KeyHash") DO NOTHING;
            """;
        AddText(command, "scope", rule.Scope);
        AddHash(command, "key_hash", rule.KeyHash);
        AddTimestamp(command, "started_at", now);
        AddTimestamp(command, "ends_at", now.Add(rule.Window));
        return await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private async Task IncrementCapacityAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction transaction,
        string scope,
        int increment,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            UPDATE "AuthenticationProtectionCapacity"
            SET "Allocated" = "Allocated" + @increment
            WHERE "Scope" = @scope
              AND "Allocated" <= @maximum - @increment;
            """;
        AddText(command, "scope", scope);
        AddInt(command, "increment", increment);
        AddInt(command, "maximum", _options.MaxBucketsPerScope);
        if (await command.ExecuteNonQueryAsync(cancellationToken) != 1)
        {
            throw new InvalidOperationException("Throttle capacity is full or inconsistent.");
        }
    }

    private static async Task<BucketState?> LockBucketAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction transaction,
        AuthenticationThrottleRule rule,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            SELECT "WindowStartedAt", "WindowEndsAt", "Count", "NextAllowedAt", "NextEmissionAt"
            FROM "AuthenticationThrottleBuckets"
            WHERE "Scope" = @scope AND "KeyHash" = @key_hash
            FOR UPDATE;
            """;
        AddText(command, "scope", rule.Scope);
        AddHash(command, "key_hash", rule.KeyHash);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return new BucketState(
            rule,
            new BucketIdentity(rule.Scope, rule.KeyHash),
            reader.GetFieldValue<DateTimeOffset>(0),
            reader.GetFieldValue<DateTimeOffset>(1),
            reader.GetInt32(2),
            reader.IsDBNull(3) ? null : reader.GetFieldValue<DateTimeOffset>(3),
            reader.IsDBNull(4) ? null : reader.GetFieldValue<DateTimeOffset>(4));
    }

    private static DateTimeOffset? GetBlockingDeadline(
        IReadOnlyCollection<BucketState> buckets,
        DateTimeOffset now)
    {
        DateTimeOffset? blockingUntil = null;
        foreach (var bucket in buckets)
        {
            if (bucket.WindowEndsAt > now && bucket.Count >= bucket.Rule.Limit)
            {
                blockingUntil = Max(blockingUntil, bucket.WindowEndsAt);
            }

            if (IsAfter(bucket.NextAllowedAt, now))
            {
                blockingUntil = Max(blockingUntil, bucket.NextAllowedAt);
            }

            if (IsAfter(bucket.NextEmissionAt, now))
            {
                blockingUntil = Max(blockingUntil, bucket.NextEmissionAt);
            }
        }

        return blockingUntil;
    }

    private static async Task UpdateBucketAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction transaction,
        BucketIdentity identity,
        DateTimeOffset startedAt,
        DateTimeOffset endsAt,
        int count,
        DateTimeOffset? nextAllowedAt,
        DateTimeOffset? nextEmissionAt,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            UPDATE "AuthenticationThrottleBuckets"
            SET "WindowStartedAt" = @started_at,
                "WindowEndsAt" = @ends_at,
                "Count" = @count,
                "NextAllowedAt" = @next_allowed_at,
                "NextEmissionAt" = @next_emission_at
            WHERE "Scope" = @scope AND "KeyHash" = @key_hash;
            """;
        AddTimestamp(command, "started_at", startedAt);
        AddTimestamp(command, "ends_at", endsAt);
        AddInt(command, "count", count);
        AddNullableTimestamp(command, "next_allowed_at", nextAllowedAt);
        AddNullableTimestamp(command, "next_emission_at", nextEmissionAt);
        AddText(command, "scope", identity.Scope);
        AddHash(command, "key_hash", identity.KeyHash);
        if (await command.ExecuteNonQueryAsync(cancellationToken) != 1)
        {
            throw new InvalidOperationException("A locked throttle bucket disappeared.");
        }
    }

    private static void StageNextEmissionDeadline(
        IReadOnlyCollection<BucketState> buckets,
        IDictionary<BucketIdentity, DateTimeOffset?> stagedDeadlines,
        string scope,
        byte[] keyHash,
        DateTimeOffset? deadline)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(scope);
        ArgumentNullException.ThrowIfNull(keyHash);
        var bucket = buckets.SingleOrDefault(candidate =>
            string.Equals(candidate.Identity.Scope, scope, StringComparison.Ordinal)
            && candidate.Identity.KeyHash.AsSpan().SequenceEqual(keyHash));
        if (bucket is null)
        {
            throw new ArgumentException("The emission deadline must belong to a locked throttle bucket.", nameof(keyHash));
        }

        stagedDeadlines[bucket.Identity] = deadline;
    }

    private async Task SetTransactionTimeoutsAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction transaction,
        CancellationToken cancellationToken)
    {
        await SetTransactionTimeoutAsync(
            connection,
            transaction,
            "lock_timeout",
            _options.LockTimeoutSeconds,
            cancellationToken);
        await SetTransactionTimeoutAsync(
            connection,
            transaction,
            "statement_timeout",
            _options.OperationTimeoutSeconds,
            cancellationToken);
    }

    private static async Task SetTransactionTimeoutAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction transaction,
        string setting,
        int? seconds,
        CancellationToken cancellationToken)
    {
        if (seconds is null)
        {
            return;
        }

        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = "SELECT set_config(@setting, @value, true);";
        AddText(command, "setting", setting);
        AddText(command, "value", string.Create(
            System.Globalization.CultureInfo.InvariantCulture,
            $"{seconds.Value * 1000}ms"));
        await command.ExecuteScalarAsync(cancellationToken);
    }

    private NpgsqlConnection GetConnection() => _context.Database.GetDbConnection() as NpgsqlConnection
        ?? throw new InvalidOperationException("PostgreSQL is required for authentication throttling.");

    private static List<AuthenticationThrottleRule> ValidateAndOrderRules(
        IReadOnlyCollection<AuthenticationThrottleRule> rules)
    {
        ArgumentNullException.ThrowIfNull(rules);
        if (rules.Count == 0 || rules.Count > 6)
        {
            throw new ArgumentException("One to six throttle dimensions are required.", nameof(rules));
        }

        var copied = rules.Select(rule =>
        {
            ArgumentNullException.ThrowIfNull(rule);
            if (!ThrottleScopes.Contains(rule.Scope, StringComparer.Ordinal)
                || rule.KeyHash is null
                || rule.KeyHash.Length != 32
                || rule.Limit <= 0
                || rule.Window <= TimeSpan.Zero
                || (rule.AcceptedCooldown is { } cooldown && cooldown <= TimeSpan.Zero)
                || (rule.AcceptedCooldown is not null && !rule.CountOnAccepted))
            {
                throw new ArgumentException("A throttle dimension is invalid.", nameof(rules));
            }

            return rule with { KeyHash = rule.KeyHash.ToArray() };
        }).ToList();
        copied.Sort(CompareRules);
        for (var index = 1; index < copied.Count; index++)
        {
            if (CompareRules(copied[index - 1], copied[index]) == 0)
            {
                throw new ArgumentException("Throttle dimensions must have unique scope and key pairs.", nameof(rules));
            }
        }

        return copied;
    }

    private static int CompareRules(AuthenticationThrottleRule left, AuthenticationThrottleRule right)
    {
        var scopeOrder = string.Compare(left.Scope, right.Scope, StringComparison.Ordinal);
        return scopeOrder != 0
            ? scopeOrder
            : left.KeyHash.AsSpan().SequenceCompareTo(right.KeyHash);
    }

    private static int GetRetryAfterSeconds(DateTimeOffset deadline, DateTimeOffset now)
    {
        var seconds = Math.Ceiling((deadline - now).TotalSeconds);
        return seconds < 1 ? 1 : (int)Math.Min(seconds, int.MaxValue);
    }

    private static DateTimeOffset? Max(DateTimeOffset? left, DateTimeOffset? right) =>
        left is null || (right is not null && right > left) ? right : left;

    private static bool IsAfter(DateTimeOffset? value, DateTimeOffset now) => value is not null && value > now;

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

    private static AuthenticationThrottleResult Unavailable() =>
        new(AuthenticationThrottleState.Unavailable);

    private static async ValueTask RollbackAndDisposeAsync(IDbContextTransaction transaction)
    {
        try
        {
            await transaction.RollbackAsync(CancellationToken.None);
        }
        catch (Exception exception) when (exception is InvalidOperationException or DbException)
        {
            // The transaction may already have been rolled back by PostgreSQL.
        }

        await transaction.DisposeAsync();
    }

    private static void AddText(NpgsqlCommand command, string name, string value) =>
        command.Parameters.Add(name, NpgsqlDbType.Text).Value = value;

    private static void AddHash(NpgsqlCommand command, string name, byte[] value) =>
        command.Parameters.Add(name, NpgsqlDbType.Bytea).Value = value;

    private static void AddInt(NpgsqlCommand command, string name, int value) =>
        command.Parameters.Add(name, NpgsqlDbType.Integer).Value = value;

    private static void AddTimestamp(NpgsqlCommand command, string name, DateTimeOffset value) =>
        command.Parameters.Add(name, NpgsqlDbType.TimestampTz).Value = value.ToUniversalTime();

    private static void AddNullableTimestamp(NpgsqlCommand command, string name, DateTimeOffset? value)
    {
        var parameter = command.Parameters.Add(name, NpgsqlDbType.TimestampTz);
        parameter.Value = value is null ? DBNull.Value : value.Value.ToUniversalTime();
    }

    private sealed record BeginAttemptResult(AuthenticationThrottleResult? Result, bool MissingBucket);

    private sealed record BucketIdentity(string Scope, byte[] KeyHash);

    private sealed record BucketState(
        AuthenticationThrottleRule Rule,
        BucketIdentity Identity,
        DateTimeOffset WindowStartedAt,
        DateTimeOffset WindowEndsAt,
        int Count,
        DateTimeOffset? NextAllowedAt,
        DateTimeOffset? NextEmissionAt);
}
