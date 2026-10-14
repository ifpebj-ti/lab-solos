using System.Net;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class AuthenticationProtectionStartupTests(PostgreSqlContainerFixture database)
{
    private const string SyntheticEmail = "startup-admin@example.test";
    private const string SyntheticPassword = "synthetic-startup-admin-password-2026";
    private static readonly string HashSecretPath = Path.Combine(
        Path.GetTempPath(),
        "lab-solos-synthetic-secrets",
        "startup-throttle-key");
    private static readonly string RecoveryKeysPath = Path.Combine(
        Path.GetTempPath(),
        "lab-solos-synthetic-secrets",
        "startup-recovery-keys.json");

    [Fact]
    public async Task ProductionStartupRejectsMissingSecretFilesWithoutRevealingTheirPaths()
    {
        await database.RecreateEmptyDatabaseAsync();
        await using var factory = CreateFactory(
            new Dictionary<string, string?>
            {
                ["AuthenticationProtection:KeyHashSecretFile"] = HashSecretPath,
                ["AuthenticationProtection:RecoveryEncryptionKeysFile"] = RecoveryKeysPath
            },
            new MissingSecretFileReader());

        var exception = await Assert.ThrowsAnyAsync<Exception>(() => RequestHealthAsync(factory));
        var messages = AllMessages(exception);

        Assert.Contains("KeyHashSecretFile", messages, StringComparison.Ordinal);
        Assert.DoesNotContain(HashSecretPath, messages, StringComparison.Ordinal);
        Assert.DoesNotContain(RecoveryKeysPath, messages, StringComparison.Ordinal);
        Assert.DoesNotContain(SyntheticPassword, messages, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ProductionStartupRejectsAnActiveJobWhoseEncryptionKeyIsMissing()
    {
        await database.RecreateEmptyDatabaseAsync();
        await using (var context = CreateDbContext())
        {
            await context.Database.MigrateAsync();
            var now = DateTimeOffset.UtcNow;
            context.PasswordRecoveryJobs.Add(new PasswordRecoveryJob
            {
                Id = Guid.NewGuid(),
                DeliveryKeyHash = new byte[32],
                RecipientKeyHash = Enumerable.Repeat((byte)1, 32).ToArray(),
                PayloadCiphertext = [1, 2, 3],
                PayloadNonce = new byte[12],
                PayloadTag = new byte[16],
                EncryptionKeyId = "retired-key-id",
                CreatedAt = now,
                ExpiresAt = now.AddMinutes(15),
                NextAttemptAt = now,
                Status = PasswordRecoveryJobStatus.Pending,
                Attempts = 0
            });
            await context.SaveChangesAsync();
            var capacity = await context.AuthenticationProtectionCapacities.SingleAsync(
                item => item.Scope == AuthenticationProtectionCapacity.RecoveryJobs);
            capacity.Allocated = 1;
            await context.SaveChangesAsync();
        }

        await using var factory = CreateFactory(
            ProductionConfiguration(),
            new SyntheticSecretFileReader());

        var exception = await Assert.ThrowsAnyAsync<Exception>(() => RequestHealthAsync(factory));

        Assert.Contains("recovery job encryption key", AllMessages(exception), StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(SyntheticPassword, AllMessages(exception), StringComparison.Ordinal);
    }

    [Fact]
    public async Task RunningInstancesWithDifferentPoliciesCannotBothServeRequests()
    {
        await database.RecreateEmptyDatabaseAsync();
        await using var firstFactory = CreateFactory(
            ProductionConfiguration(),
            new SyntheticSecretFileReader());
        using var firstClient = firstFactory.CreateClient();
        Assert.Equal(HttpStatusCode.OK, (await firstClient.GetAsync("/health")).StatusCode);

        var divergentConfiguration = ProductionConfiguration();
        divergentConfiguration["AuthenticationProtection:Login:AccountFailures"] = "6";
        await using var secondFactory = CreateFactory(
            divergentConfiguration,
            new SyntheticSecretFileReader());

        var exception = await Assert.ThrowsAnyAsync<Exception>(() => RequestHealthAsync(secondFactory));

        Assert.Contains("policy", AllMessages(exception), StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(SyntheticPassword, AllMessages(exception), StringComparison.Ordinal);
    }

    private IntegrationWebApplicationFactory CreateFactory(
        IReadOnlyDictionary<string, string?> configuration,
        ISecretFileReader files) =>
        new(database, new()
        {
            EnvironmentName = "Production",
            Configuration = WithSeed(configuration),
            BackgroundServicesToRun = new HashSet<Type>
            {
                typeof(AuthenticationProtectionStartupValidator)
            },
            ConfigureServices = services =>
            {
                services.RemoveAll<ISecretFileReader>();
                services.AddSingleton(files);
            }
        });

    private static Dictionary<string, string?> ProductionConfiguration() => new(StringComparer.Ordinal)
    {
        ["AuthenticationProtection:KeyHashSecretFile"] = HashSecretPath,
        ["AuthenticationProtection:RecoveryEncryptionKeysFile"] = RecoveryKeysPath,
        ["AuthenticationProtection:ForwardedHeaders:KnownProxies:0"] = "10.20.0.5",
        ["Seed:AdminEmail"] = SyntheticEmail,
        ["Seed:AdminPassword"] = SyntheticPassword
    };

    private static Dictionary<string, string?> WithSeed(IReadOnlyDictionary<string, string?> configuration)
    {
        var values = configuration.ToDictionary(pair => pair.Key, pair => pair.Value, StringComparer.Ordinal);
        values["Seed:AdminEmail"] = SyntheticEmail;
        values["Seed:AdminPassword"] = SyntheticPassword;        return values;
    }

    private AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(database.ConnectionString)
            .Options;
        return new AppDbContext(options);
    }

    private static async Task RequestHealthAsync(IntegrationWebApplicationFactory factory)
    {
        using var client = factory.CreateClient();
        using var response = await client.GetAsync("/health");
    }

    private static string AllMessages(Exception exception)
    {
        var messages = new List<string>();
        for (Exception? current = exception; current is not null; current = current.InnerException)
        {
            messages.Add(current.Message);
        }

        return string.Join(Environment.NewLine, messages);
    }

    private sealed class MissingSecretFileReader : ISecretFileReader
    {
        public byte[] ReadAllBytes(string path) => throw new FileNotFoundException("Synthetic secret file is unavailable.");
    }
    private sealed class SyntheticSecretFileReader : ISecretFileReader
    {
        private readonly byte[] _hashKey = Enumerable.Range(1, 32).Select(value => (byte)value).ToArray();
        private readonly byte[] _recoveryKeys = System.Text.Encoding.UTF8.GetBytes(
            "{\"activeKeyId\":\"active-key-id\",\"keys\":{\"active-key-id\":\"" +
            Convert.ToBase64String(Enumerable.Repeat((byte)2, 32).ToArray()) + "\"}}");

        public byte[] ReadAllBytes(string path)
        {
            if (path == HashSecretPath)
            {
                return _hashKey.ToArray();
            }

            if (path == RecoveryKeysPath)
            {
                return _recoveryKeys.ToArray();
            }

            throw new FileNotFoundException("Synthetic secret file is unavailable.");
        }
    }
}
