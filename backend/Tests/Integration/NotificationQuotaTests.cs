using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class NotificationQuotaTests(PostgreSqlContainerFixture database)
{
    private static readonly byte[] HmacSecret = Enumerable.Range(50, 32).Select(value => (byte)value).ToArray();
    private static readonly DateTimeOffset InitialTime = new(2026, 11, 23, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task ManualQuotaAllowsThirtyAcceptedOperationsAndDoesNotCountRolledBackAttempts()
    {
        await ResetAndMigrateAsync();
        var clock = new ControlledTimeProvider(InitialTime);
        using var keyFactory = new ThrottleKeyFactory(HmacSecret, "IntegrationTesting");
        await using var context = CreateContext();
        var policy = CreatePolicy(context, clock, keyFactory);

        await using (await policy.BeginManualAsync(42))
        {
            // Disposing without completion represents a refused or failed operation.
        }

        for (var index = 0; index < NotificationQuotaPolicy.ManualLimit; index++)
        {
            await using var attempt = await policy.BeginManualAsync(42);
            await attempt.CompleteAsync(AuthenticationThrottleOutcome.Accepted);
        }

        var rule = NotificationQuotaPolicy.CreateManualRule(42, keyFactory);
        Assert.Equal(30, await ReadCountAsync(context, rule));
        var limited = await Assert.ThrowsAsync<NotificationQuotaExceededException>(
            () => policy.BeginManualAsync(42));
        Assert.True(limited.RetryAfterSeconds > 0);
        Assert.Equal(30, await ReadCountAsync(context, rule));
    }

    [Fact]
    public async Task AutomaticQuotaIsSharedByStableServiceIdentityAndSeparatesOtherServices()
    {
        await ResetAndMigrateAsync();
        var clock = new ControlledTimeProvider(InitialTime);
        using var keyFactory = new ThrottleKeyFactory(HmacSecret, "IntegrationTesting");
        await using var context = CreateContext();
        var policy = CreatePolicy(context, clock, keyFactory);

        for (var index = 0; index < NotificationQuotaPolicy.AutomaticLimit; index++)
        {
            await using var attempt = await policy.BeginAutomaticAsync("lab-solos-notification-service");
            await attempt.CompleteAsync(AuthenticationThrottleOutcome.Accepted);
        }

        var rule = NotificationQuotaPolicy.CreateAutomaticRule("lab-solos-notification-service", keyFactory);
        Assert.Equal(60, await ReadCountAsync(context, rule));
        await Assert.ThrowsAsync<NotificationQuotaExceededException>(
            () => policy.BeginAutomaticAsync("lab-solos-notification-service"));

        await using (var otherServiceAttempt = await policy.BeginAutomaticAsync("lab-solos.cleanup-service"))
        {
            await otherServiceAttempt.CompleteAsync(AuthenticationThrottleOutcome.Accepted);
        }

        var otherRule = NotificationQuotaPolicy.CreateAutomaticRule("lab-solos.cleanup-service", keyFactory);
        Assert.Equal(1, await ReadCountAsync(context, otherRule));
    }

    [Fact]
    public async Task MissingNotificationQuotaCapacityFailsClosed()
    {
        await ResetAndMigrateAsync();
        await using (var removalContext = CreateContext())
        {
            await removalContext.Database.ExecuteSqlRawAsync(
                "DELETE FROM \"AuthenticationProtectionCapacity\" WHERE \"Scope\" = 'notification:manual:administrator'");
        }

        using var keyFactory = new ThrottleKeyFactory(HmacSecret, "IntegrationTesting");
        await using var context = CreateContext();
        var policy = CreatePolicy(context, new ControlledTimeProvider(InitialTime), keyFactory);

        await Assert.ThrowsAsync<NotificationQuotaUnavailableException>(
            () => policy.BeginManualAsync(42));
    }

    [Fact]
    public async Task MigrationSeedsBothNotificationQuotaCapacities()
    {
        await ResetAndMigrateAsync();
        await using var context = CreateContext();

        var capacities = await context.AuthenticationProtectionCapacities.AsNoTracking()
            .Where(capacity => capacity.Scope == AuthenticationProtectionCapacity.NotificationManualAdministrator
                || capacity.Scope == AuthenticationProtectionCapacity.NotificationAutomaticService)
            .OrderBy(capacity => capacity.Scope)
            .ToArrayAsync();

        Assert.Collection(
            capacities,
            item =>
            {
                Assert.Equal(AuthenticationProtectionCapacity.NotificationAutomaticService, item.Scope);
                Assert.Equal(0, item.Allocated);
            },
            item =>
            {
                Assert.Equal(AuthenticationProtectionCapacity.NotificationManualAdministrator, item.Scope);
                Assert.Equal(0, item.Allocated);
            });
    }

    private async Task ResetAndMigrateAsync()
    {
        await database.RecreateEmptyDatabaseAsync();
        await using var context = CreateContext();
        await context.Database.MigrateAsync();
    }

    private AppDbContext CreateContext() => new(
        new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(database.ConnectionString).Options);

    private static NotificationQuotaPolicy CreatePolicy(
        AppDbContext context,
        TimeProvider clock,
        ThrottleKeyFactory keyFactory)
    {
        var options = new AuthenticationProtectionOptions
        {
            MaxBucketsPerScope = 100,
            LockTimeoutSeconds = 2,
            OperationTimeoutSeconds = 5,
            CleanupBatchSize = 100
        };
        var throttle = new PostgresAuthenticationThrottle(
            context,
            Options.Create(options),
            new TimeProviderAuthenticationThrottleClock(clock));
        return new NotificationQuotaPolicy(throttle, keyFactory);
    }

    private static Task<int> ReadCountAsync(AppDbContext context, AuthenticationThrottleRule rule) =>
        context.AuthenticationThrottleBuckets.AsNoTracking()
            .Where(bucket => bucket.Scope == rule.Scope && bucket.KeyHash.SequenceEqual(rule.KeyHash))
            .Select(bucket => bucket.Count)
            .SingleAsync();
}
