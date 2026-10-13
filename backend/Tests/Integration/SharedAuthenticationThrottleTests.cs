using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Options;
using Npgsql;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSql15IntegrationGroup.Name)]
public sealed class SharedAuthenticationThrottleTests(PostgreSql15ContainerFixture database)
{
    private static readonly DateTimeOffset InitialTime =
        new(2026, 10, 13, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task ConcurrentAttemptsAcrossInstancesNeverExceedTheSharedQuota()
    {
        await ResetDatabaseAsync();
        var clock = new ControlledTimeProvider(InitialTime);
        var rules = LoginRules(accountLimit: 5, ipLimit: 50, accountKey: Key(1), ipKey: Key(2));

        var attempts = await Task.WhenAll(Enumerable.Range(0, 32).Select(async index =>
        {
            await using var context = CreateContext();
            var service = CreateService(context, clock);
            var result = await service.TryBeginAsync(rules);
            if (result.Attempt is not null)
            {
                await using var attempt = result.Attempt;
                await attempt.CompleteAsync(AuthenticationThrottleOutcome.Failure);
            }

            return result.State;
        }));

        Assert.Equal(5, attempts.Count(state => state == AuthenticationThrottleState.Allowed));
        Assert.Equal(27, attempts.Count(state => state == AuthenticationThrottleState.RateLimited));
        await using var verification = CreateContext();
        Assert.Equal(5, await ReadCountAsync(verification, "login:account", Key(1)));
        Assert.Equal(5, await ReadCountAsync(verification, "login:ip", Key(2)));
    }

    [Fact]
    public async Task SuccessfulLoginDoesNotClearAnIpQuotaSharedWithOtherAccounts()
    {
        await ResetDatabaseAsync();
        var clock = new ControlledTimeProvider(InitialTime);

        await ExecuteAsync(LoginRules(10, 2, Key(1), Key(90)), clock, AuthenticationThrottleOutcome.Failure);
        await ExecuteAsync(LoginRules(10, 2, Key(2), Key(90)), clock, AuthenticationThrottleOutcome.Accepted);
        await ExecuteAsync(LoginRules(10, 2, Key(3), Key(90)), clock, AuthenticationThrottleOutcome.Failure);

        await using var blocked = await BeginAsync(LoginRules(10, 2, Key(4), Key(90)), clock);

        Assert.Equal(AuthenticationThrottleState.RateLimited, blocked.Result.State);
        Assert.Null(blocked.Result.Attempt);
        await using var verification = CreateContext();
        Assert.Equal(2, await ReadCountAsync(verification, "login:ip", Key(90)));
    }

    [Fact]
    public async Task DeniedAttemptsDoNotExtendAWindowAndTheQuotaRenewsAtItsExactEnd()
    {
        await ResetDatabaseAsync();
        var clock = new ControlledTimeProvider(InitialTime);
        var rule = Rule("recovery-code:recipient", Key(10), limit: 1, window: TimeSpan.FromSeconds(60));

        await ExecuteAsync([rule], clock, AuthenticationThrottleOutcome.Failure);
        clock.Advance(TimeSpan.FromSeconds(10));
        await using var blocked = await BeginAsync([rule], clock);

        Assert.Equal(AuthenticationThrottleState.RateLimited, blocked.Result.State);
        Assert.Equal(50, blocked.Result.RetryAfterSeconds);
        clock.Advance(TimeSpan.FromSeconds(50));

        await using var renewed = await BeginAsync([rule], clock);
        Assert.Equal(AuthenticationThrottleState.Allowed, renewed.Result.State);
        Assert.NotNull(renewed.Result.Attempt);
        await using (renewed.Result.Attempt!)
        {
            await renewed.Result.Attempt!.CompleteAsync(AuthenticationThrottleOutcome.Failure);
        }
    }

    [Fact]
    public async Task AdmissionCooldownIsSharedAndRepeatedDenialsDoNotMoveItsDeadline()
    {
        await ResetDatabaseAsync();
        var clock = new ControlledTimeProvider(InitialTime);
        var rule = Rule(
            "recovery-request:recipient",
            Key(20),
            limit: 3,
            window: TimeSpan.FromHours(1),
            countAccepted: true,
            acceptedCooldown: TimeSpan.FromSeconds(60));

        await ExecuteAsync([rule], clock, AuthenticationThrottleOutcome.Accepted);
        clock.Advance(TimeSpan.FromSeconds(20));
        await using var firstDenial = await BeginAsync([rule], clock);
        clock.Advance(TimeSpan.FromSeconds(10));
        await using var repeatedDenial = await BeginAsync([rule], clock);

        Assert.Equal(AuthenticationThrottleState.RateLimited, firstDenial.Result.State);
        Assert.Equal(40, firstDenial.Result.RetryAfterSeconds);
        Assert.Equal(AuthenticationThrottleState.RateLimited, repeatedDenial.Result.State);
        Assert.Equal(30, repeatedDenial.Result.RetryAfterSeconds);
        clock.Advance(TimeSpan.FromSeconds(30));

        await using var admitted = await BeginAsync([rule], clock);
        Assert.Equal(AuthenticationThrottleState.Allowed, admitted.Result.State);
        Assert.NotNull(admitted.Result.Attempt);
        await using (admitted.Result.Attempt!)
        {
            await admitted.Result.Attempt!.CompleteAsync(AuthenticationThrottleOutcome.Accepted);
        }
    }

    [Fact]
    public async Task NextEmissionDeadlineBlocksRequestsUntilThePersistedTime()
    {
        await ResetDatabaseAsync();
        var clock = new ControlledTimeProvider(InitialTime);
        var key = Key(21);
        var rule = Rule("recovery-request:recipient", key, 3, TimeSpan.FromHours(1), countAccepted: true);
        await using (var admitted = await BeginAsync([rule], clock))
        {
            Assert.Equal(AuthenticationThrottleState.Allowed, admitted.Result.State);
            await using var attempt = admitted.Result.Attempt!;
            attempt.SetNextEmissionAt(rule.Scope, key, InitialTime.AddSeconds(60));
            await attempt.CompleteAsync(AuthenticationThrottleOutcome.Accepted);
        }

        clock.Advance(TimeSpan.FromSeconds(59));
        await using (var blocked = await BeginAsync([rule], clock))
        {
            Assert.Equal(AuthenticationThrottleState.RateLimited, blocked.Result.State);
            Assert.Equal(1, blocked.Result.RetryAfterSeconds);
        }

        clock.Advance(TimeSpan.FromSeconds(1));
        await using var eligible = await BeginAsync([rule], clock);
        Assert.Equal(AuthenticationThrottleState.Allowed, eligible.Result.State);
        await using var nextAttempt = eligible.Result.Attempt!;
        await nextAttempt.CompleteAsync(AuthenticationThrottleOutcome.Accepted);
    }

    [Fact]
    public async Task CapacityIsExactAndFullCapacityFailsClosedWithoutAllocatingAnotherKey()
    {
        await ResetDatabaseAsync();
        var clock = new ControlledTimeProvider(InitialTime);
        var options = CreateOptions(maxBucketsPerScope: 1);

        await ExecuteAsync([Rule("login:account", Key(31), 5, TimeSpan.FromMinutes(15))], clock,
            AuthenticationThrottleOutcome.Failure, options);
        await using var exhausted = await BeginAsync(
            [Rule("login:account", Key(32), 5, TimeSpan.FromMinutes(15))],
            clock,
            options);

        Assert.Equal(AuthenticationThrottleState.CapacityExceeded, exhausted.Result.State);
        Assert.Equal(30, exhausted.Result.RetryAfterSeconds);
        Assert.Null(exhausted.Result.Attempt);
        await using var verification = CreateContext();
        Assert.Equal(1, await verification.AuthenticationThrottleBuckets.CountAsync());
        Assert.Equal(1, await ReadCapacityAsync(verification, "login:account"));
    }

    [Fact]
    public async Task ExpiredBucketsCanBeReallocatedWithoutDriftingTheCapacityCounter()
    {
        await ResetDatabaseAsync();
        var clock = new ControlledTimeProvider(InitialTime);
        var options = CreateOptions(maxBucketsPerScope: 1);
        var window = TimeSpan.FromSeconds(60);

        await ExecuteAsync([Rule("login:account", Key(41), 5, window)], clock,
            AuthenticationThrottleOutcome.Failure, options);
        clock.Advance(window);
        await ExecuteAsync([Rule("login:account", Key(42), 5, window)], clock,
            AuthenticationThrottleOutcome.Failure, options);

        await using var verification = CreateContext();
        Assert.Equal(1, await verification.AuthenticationThrottleBuckets.CountAsync());
        Assert.Equal(1, await ReadCapacityAsync(verification, "login:account"));
        Assert.Equal(1, await ReadCountAsync(verification, "login:account", Key(42)));
    }

    [Fact]
    public async Task CleanupRacingWithAllocationPreservesOneExactCapacitySlot()
    {
        await ResetDatabaseAsync();
        var clock = new ControlledTimeProvider(InitialTime);
        var options = CreateOptions(maxBucketsPerScope: 1);
        var window = TimeSpan.FromSeconds(60);
        await ExecuteAsync([Rule("login:account", Key(51), 5, window)], clock,
            AuthenticationThrottleOutcome.Failure, options);
        clock.Advance(window);

        var cleanupTask = Task.Run(async () =>
        {
            await using var context = CreateContext();
            return await CreateService(context, clock, options).CleanupExpiredAsync();
        });
        var allocationTask = Task.Run(async () =>
        {
            await using var context = CreateContext();
            var result = await CreateService(context, clock, options).TryBeginAsync(
                [Rule("login:account", Key(52), 5, window)]);
            if (result.Attempt is not null)
            {
                await using var attempt = result.Attempt;
                await attempt.CompleteAsync(AuthenticationThrottleOutcome.Failure);
            }

            return result.State;
        });

        await Task.WhenAll((Task)cleanupTask, allocationTask);
        var cleanupCount = await cleanupTask;
        var allocationState = await allocationTask;

        Assert.InRange(cleanupCount, 0, 1);
        Assert.Equal(AuthenticationThrottleState.Allowed, allocationState);
        await using var verification = CreateContext();
        Assert.Equal(1, await verification.AuthenticationThrottleBuckets.CountAsync());
        Assert.Equal(1, await ReadCapacityAsync(verification, "login:account"));
        Assert.Equal(1, await ReadCountAsync(verification, "login:account", Key(52)));
    }

    [Fact]
    public async Task CleanupDeletesOnlyExpiredBucketsAndHonorsItsBatchLimit()
    {
        await ResetDatabaseAsync();
        var clock = new ControlledTimeProvider(InitialTime);
        var options = CreateOptions(maxBucketsPerScope: 10, cleanupBatchSize: 1);
        await ExecuteAsync(
            [Rule("login:account", Key(55), 5, TimeSpan.FromSeconds(30))],
            clock,
            AuthenticationThrottleOutcome.Failure,
            options);
        await ExecuteAsync(
            [Rule("login:account", Key(56), 5, TimeSpan.FromSeconds(40))],
            clock,
            AuthenticationThrottleOutcome.Failure,
            options);
        await ExecuteAsync(
            [Rule("login:account", Key(57), 5, TimeSpan.FromSeconds(120))],
            clock,
            AuthenticationThrottleOutcome.Failure,
            options);
        clock.Advance(TimeSpan.FromSeconds(40));

        await using var context = CreateContext();
        var service = CreateService(context, clock, options);
        Assert.Equal(1, await service.CleanupExpiredAsync());
        Assert.Equal(1, await service.CleanupExpiredAsync());

        Assert.Equal(1, await context.AuthenticationThrottleBuckets.CountAsync());
        Assert.Equal(1, await ReadCapacityAsync(context, "login:account"));
        Assert.Equal(1, await ReadCountAsync(context, "login:account", Key(57)));
    }

    [Fact]
    public async Task LockTimeoutAndDatabaseFailureReturnUnavailableWithoutAnAttemptLease()
    {
        await ResetDatabaseAsync();
        var clock = new ControlledTimeProvider(InitialTime);
        var options = CreateOptions(lockTimeoutSeconds: 1, operationTimeoutSeconds: 3);
        var rule = Rule("login:account", Key(61), 5, TimeSpan.FromMinutes(15));
        await ExecuteAsync([rule], clock, AuthenticationThrottleOutcome.Failure, options);

        await using var lockHolder = CreateContext();
        await using var heldTransaction = await lockHolder.Database.BeginTransactionAsync();
        await using (var command = lockHolder.Database.GetDbConnection().CreateCommand())
        {
            command.Transaction = heldTransaction.GetDbTransaction();
            command.CommandText = "SELECT 1 FROM \"AuthenticationThrottleBuckets\" WHERE \"Scope\" = 'login:account' FOR UPDATE;";
            await command.ExecuteScalarAsync();
        }

        await using var timedOut = await BeginAsync([rule], clock, options);
        await heldTransaction.RollbackAsync();

        Assert.Equal(AuthenticationThrottleState.Unavailable, timedOut.Result.State);
        Assert.Null(timedOut.Result.Attempt);

        var unavailableConnection = new NpgsqlConnectionStringBuilder(database.ConnectionString)
        {
            Host = "127.0.0.1",
            Port = 1,
            Timeout = 1,
            CommandTimeout = 1
        };
        await using var unavailableContext = new AppDbContext(
            new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(unavailableConnection.ConnectionString).Options);
        var unavailable = await CreateService(unavailableContext, clock, options).TryBeginAsync([rule]);

        Assert.Equal(AuthenticationThrottleState.Unavailable, unavailable.State);
        Assert.Null(unavailable.Attempt);
    }

    [Fact]
    public void MissingThrottleServiceContractIsDetectedAsTheInitialRed()
    {
        var serviceType = typeof(AppDbContext).Assembly.GetType(
            "LabSolos_Server_DotNet8.Services.Security.PostgresAuthenticationThrottle");

        Assert.NotNull(serviceType);
    }

    private async Task ResetDatabaseAsync()
    {
        await database.RecreateEmptyDatabaseAsync();
        await using var context = CreateContext();
        await context.Database.MigrateAsync();
    }

    private AppDbContext CreateContext() => new(
        new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(database.ConnectionString).Options);

    private static AuthenticationProtectionOptions CreateOptions(
        int maxBucketsPerScope = 10,
        int lockTimeoutSeconds = 2,
        int operationTimeoutSeconds = 5,
        int cleanupBatchSize = 100) => new()
        {
            MaxBucketsPerScope = maxBucketsPerScope,
            LockTimeoutSeconds = lockTimeoutSeconds,
            OperationTimeoutSeconds = operationTimeoutSeconds,
            CleanupBatchSize = cleanupBatchSize
        };

    private static PostgresAuthenticationThrottle CreateService(
        AppDbContext context,
        TimeProvider clock,
        AuthenticationProtectionOptions? options = null) => new(
            context,
            Options.Create(options ?? CreateOptions()),
            new TimeProviderAuthenticationThrottleClock(clock));

    private async Task<ThrottleStart> BeginAsync(
        IReadOnlyCollection<AuthenticationThrottleRule> rules,
        TimeProvider clock,
        AuthenticationProtectionOptions? options = null)
    {
        var context = CreateContext();
        var result = await CreateService(context, clock, options).TryBeginAsync(rules);
        return new ThrottleStart(context, result);
    }

    private async Task ExecuteAsync(
        IReadOnlyCollection<AuthenticationThrottleRule> rules,
        TimeProvider clock,
        AuthenticationThrottleOutcome outcome,
        AuthenticationProtectionOptions? options = null)
    {
        await using var result = await BeginAsync(rules, clock, options);
        Assert.Equal(AuthenticationThrottleState.Allowed, result.Result.State);
        Assert.NotNull(result.Result.Attempt);
        await using var attempt = result.Result.Attempt;
        await attempt.CompleteAsync(outcome);
    }

    private static IReadOnlyCollection<AuthenticationThrottleRule> LoginRules(
        int accountLimit,
        int ipLimit,
        byte[] accountKey,
        byte[] ipKey) =>
    [
        Rule("login:account", accountKey, accountLimit, TimeSpan.FromMinutes(15)),
        Rule("login:ip", ipKey, ipLimit, TimeSpan.FromMinutes(15))
    ];

    private static AuthenticationThrottleRule Rule(
        string scope,
        byte[] key,
        int limit,
        TimeSpan window,
        bool countAccepted = false,
        TimeSpan? acceptedCooldown = null) => new(
            scope,
            key,
            limit,
            window,
            countAccepted,
            acceptedCooldown);

    private static byte[] Key(byte value) => Enumerable.Repeat(value, 32).ToArray();

    private static async Task<int> ReadCountAsync(AppDbContext context, string scope, byte[] keyHash) =>
        await context.AuthenticationThrottleBuckets
            .Where(bucket => bucket.Scope == scope && bucket.KeyHash == keyHash)
            .Select(bucket => bucket.Count)
            .SingleAsync();

    private static Task<int> ReadCapacityAsync(AppDbContext context, string scope) =>
        context.AuthenticationProtectionCapacities
            .Where(capacity => capacity.Scope == scope)
            .Select(capacity => capacity.Allocated)
            .SingleAsync();

    private sealed class ThrottleStart(AppDbContext context, AuthenticationThrottleResult result) : IAsyncDisposable
    {
        public AuthenticationThrottleResult Result { get; } = result;

        public ValueTask DisposeAsync() => context.DisposeAsync();
    }
}
