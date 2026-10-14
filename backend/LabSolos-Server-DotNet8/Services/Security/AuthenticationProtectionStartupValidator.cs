using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Npgsql;
using NpgsqlTypes;

namespace LabSolos_Server_DotNet8.Services.Security;

public sealed class AuthenticationProtectionStartupValidator : IHostedService, IAsyncDisposable
{
    private const string PolicyApplicationPrefix = "LabSolosAuthPolicy:";
    private const string PolicyScopePrefix = "policy:";
    private const long PolicyMarkerLock = 4_832_719_551_026_913;
    private const int PolicyFingerprintLength = 48;
    private const int ApplicationFingerprintLength = 40;

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IOptions<AuthenticationProtectionOptions> _options;
    private readonly IHostEnvironment _environment;
    private readonly ISecretFileReader _secretFileReader;
    private NpgsqlConnection? _policyConnection;

    public AuthenticationProtectionStartupValidator(
        IServiceScopeFactory scopeFactory,
        IOptions<AuthenticationProtectionOptions> options,
        IHostEnvironment environment,
        ISecretFileReader secretFileReader)
    {
        _scopeFactory = scopeFactory ?? throw new ArgumentNullException(nameof(scopeFactory));
        _options = options ?? throw new ArgumentNullException(nameof(options));
        _environment = environment ?? throw new ArgumentNullException(nameof(environment));
        _secretFileReader = secretFileReader ?? throw new ArgumentNullException(nameof(secretFileReader));
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        if (_policyConnection is not null)
        {
            return;
        }

        var options = _options.Value;
        await using var scope = _scopeFactory.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var encryptionKeys = scope.ServiceProvider.GetRequiredService<IRecoveryEncryptionKeyProvider>();
        var policyHash = CreatePolicyHash(options, encryptionKeys);
        var appName = PolicyApplicationPrefix + policyHash[..ApplicationFingerprintLength];
        var markerScope = PolicyScopePrefix + policyHash[..PolicyFingerprintLength];
        var connectionString = context.Database.GetConnectionString();

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException("Authentication protection startup could not connect to its shared database.");
        }

        var builder = new NpgsqlConnectionStringBuilder(connectionString)
        {
            ApplicationName = appName,
            Pooling = false
        };
        var connection = new NpgsqlConnection(builder.ConnectionString);
        try
        {
            await connection.OpenAsync(cancellationToken);
            await EnsureNoDivergentInstanceAsync(connection, appName, cancellationToken);
            await EnsureExistingRecoveryKeysAreAvailableAsync(connection, encryptionKeys, cancellationToken);
            await PersistPolicyMarkerAsync(connection, markerScope, cancellationToken);
            _policyConnection = connection;
        }
        catch
        {
            await connection.DisposeAsync();
            throw;
        }
    }

    public async Task StopAsync(CancellationToken cancellationToken)
    {
        var connection = Interlocked.Exchange(ref _policyConnection, null);
        if (connection is null)
        {
            return;
        }

        await connection.CloseAsync();
        await connection.DisposeAsync();
    }

    public async ValueTask DisposeAsync()
    {
        var connection = Interlocked.Exchange(ref _policyConnection, null);
        if (connection is not null)
        {
            await connection.DisposeAsync();
        }
    }

    private string CreatePolicyHash(
        AuthenticationProtectionOptions options,
        IRecoveryEncryptionKeyProvider encryptionKeys)
    {
        var throttleKeyFingerprint = ComputeSecretFingerprint(
            options.KeyHashSecretFile,
            "LabSolos IntegrationTesting only synthetic throttle key; never deploy");
        var encryptionKeyFingerprint = ComputeRecoverySecretFingerprint(
            options.RecoveryEncryptionKeysFile,
            encryptionKeys);

        var canonicalPolicy = JsonSerializer.SerializeToUtf8Bytes(new
        {
            Environment = _environment.EnvironmentName,
            Login = new
            {
                AccountFailures = options.Login?.AccountFailures,
                IpFailures = options.Login?.IpFailures,
                WindowSeconds = options.Login?.WindowSeconds
            },
            RecoveryRequest = new
            {
                RecipientRequests = options.RecoveryRequest?.RecipientRequests,
                IpRequests = options.RecoveryRequest?.IpRequests,
                WindowSeconds = options.RecoveryRequest?.WindowSeconds,
                CooldownSeconds = options.RecoveryRequest?.CooldownSeconds
            },
            RecoveryCode = new
            {
                RecipientFailures = options.RecoveryCode?.RecipientFailures,
                IpFailures = options.RecoveryCode?.IpFailures,
                WindowSeconds = options.RecoveryCode?.WindowSeconds
            },
            MaxBucketsPerScope = options.MaxBucketsPerScope,
            MaxActiveRecoveryJobs = options.MaxActiveRecoveryJobs,
            CleanupIntervalSeconds = options.CleanupIntervalSeconds,
            CleanupBatchSize = options.CleanupBatchSize,
            LockTimeoutSeconds = options.LockTimeoutSeconds,
            OperationTimeoutSeconds = options.OperationTimeoutSeconds,
            Delivery = new
            {
                MaxAttempts = options.Delivery?.MaxAttempts,
                LeaseSeconds = options.Delivery?.LeaseSeconds,
                SendTimeoutSeconds = options.Delivery?.SendTimeoutSeconds,
                RequestMaxAgeSeconds = options.Delivery?.RequestMaxAgeSeconds,
                PollSeconds = options.Delivery?.PollSeconds
            },
            ThrottleKey = throttleKeyFingerprint,
            RecoveryKeys = encryptionKeyFingerprint,
            ForwardLimit = options.ForwardedHeaders?.ForwardLimit,
            KnownProxies = (options.ForwardedHeaders?.KnownProxies ?? [])
                .Order(StringComparer.OrdinalIgnoreCase)
                .ToArray(),
            DevelopmentOrigins = (options.Cors?.DevelopmentOrigins ?? [])
                .Order(StringComparer.Ordinal)
                .ToArray()
        });

        try
        {
            return Convert.ToHexString(SHA256.HashData(canonicalPolicy)).ToLowerInvariant();
        }
        finally
        {
            CryptographicOperations.ZeroMemory(canonicalPolicy);
        }
    }

    private string ComputeSecretFingerprint(string path, string integrationSecret)
    {
        if (string.IsNullOrWhiteSpace(path) && _environment.IsEnvironment("IntegrationTesting"))
        {
            var input = Encoding.UTF8.GetBytes(integrationSecret);
            var syntheticKey = SHA256.HashData(input);
            try
            {
                return HashAndClear(syntheticKey);
            }
            finally
            {
                CryptographicOperations.ZeroMemory(input);
                CryptographicOperations.ZeroMemory(syntheticKey);
            }
        }

        return ReadAndFingerprint(path);
    }

    private string ComputeRecoverySecretFingerprint(
        string path,
        IRecoveryEncryptionKeyProvider encryptionKeys)
    {
        if (string.IsNullOrWhiteSpace(path) && _environment.IsEnvironment("IntegrationTesting"))
        {
            var syntheticKey = encryptionKeys.CopyKey(encryptionKeys.ActiveKeyId);
            try
            {
                return HashAndClear(syntheticKey);
            }
            finally
            {
                CryptographicOperations.ZeroMemory(syntheticKey);
            }
        }

        return ReadAndFingerprint(path);
    }

    private string ReadAndFingerprint(string path)
    {
        byte[]? secret = null;
        try
        {
            secret = _secretFileReader.ReadAllBytes(path);
            return HashAndClear(secret);
        }
        catch (Exception exception) when (
            exception is IOException
                or UnauthorizedAccessException
                or ArgumentException
                or NotSupportedException
                or System.Security.SecurityException)
        {
            throw new InvalidOperationException(
                "Authentication protection secret files became unavailable during startup.");
        }
        finally
        {
            if (secret is not null)
            {
                CryptographicOperations.ZeroMemory(secret);
            }
        }
    }

    private static string HashAndClear(byte[] secret)
    {
        var hash = SHA256.HashData(secret);
        try
        {
            return Convert.ToHexString(hash).ToLowerInvariant();
        }
        finally
        {
            CryptographicOperations.ZeroMemory(hash);
        }
    }

    private static async Task EnsureNoDivergentInstanceAsync(
        NpgsqlConnection connection,
        string appName,
        CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand(
            """
            SELECT EXISTS (
                SELECT 1
                FROM pg_stat_activity
                WHERE datid = (SELECT oid FROM pg_database WHERE datname = current_database())
                  AND application_name LIKE @prefix || '%'
                  AND application_name <> @applicationName
            );
            """,
            connection);
        command.Parameters.AddWithValue("prefix", NpgsqlDbType.Text, PolicyApplicationPrefix);
        command.Parameters.AddWithValue("applicationName", NpgsqlDbType.Text, appName);

        if (Convert.ToBoolean(await command.ExecuteScalarAsync(cancellationToken), System.Globalization.CultureInfo.InvariantCulture))
        {
            throw new InvalidOperationException(
                "Authentication protection policy differs from an active application instance.");
        }
    }

    private static async Task EnsureExistingRecoveryKeysAreAvailableAsync(
        NpgsqlConnection connection,
        IRecoveryEncryptionKeyProvider encryptionKeys,
        CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand(
            """
            SELECT DISTINCT "EncryptionKeyId"
            FROM "PasswordRecoveryJobs"
            WHERE "Status" IN ('Pending', 'Processing')
              AND "ExpiresAt" > clock_timestamp();
            """,
            connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var keyId = reader.GetString(0);
            byte[]? key = null;
            try
            {
                key = encryptionKeys.CopyKey(keyId);
            }
            catch (CryptographicException)
            {
                throw new InvalidOperationException(
                    "Authentication protection recovery job encryption key is not available.");
            }
            finally
            {
                if (key is not null)
                {
                    CryptographicOperations.ZeroMemory(key);
                }
            }
        }
    }

    private static async Task PersistPolicyMarkerAsync(
        NpgsqlConnection connection,
        string markerScope,
        CancellationToken cancellationToken)
    {
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        await using (var lockCommand = new NpgsqlCommand(
            "SELECT pg_advisory_xact_lock(@lockKey);",
            connection,
            transaction))
        {
            lockCommand.Parameters.AddWithValue("lockKey", NpgsqlDbType.Bigint, PolicyMarkerLock);
            _ = await lockCommand.ExecuteScalarAsync(cancellationToken);
        }

        await using (var removeStale = new NpgsqlCommand(
            """
            DELETE FROM "AuthenticationProtectionCapacity"
            WHERE "Scope" LIKE @prefix || '%'
              AND "Scope" <> @markerScope;
            """,
            connection,
            transaction))
        {
            removeStale.Parameters.AddWithValue("prefix", NpgsqlDbType.Text, PolicyScopePrefix);
            removeStale.Parameters.AddWithValue("markerScope", NpgsqlDbType.Text, markerScope);
            _ = await removeStale.ExecuteNonQueryAsync(cancellationToken);
        }

        await using (var insert = new NpgsqlCommand(
            """
            INSERT INTO "AuthenticationProtectionCapacity" ("Scope", "Allocated")
            VALUES (@markerScope, 0)
            ON CONFLICT ("Scope") DO UPDATE SET "Allocated" = 0;
            """,
            connection,
            transaction))
        {
            insert.Parameters.AddWithValue("markerScope", NpgsqlDbType.Text, markerScope);
            _ = await insert.ExecuteNonQueryAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);
    }
}

public sealed class AuthenticationProtectionReadinessHealthCheck(
    IServiceScopeFactory scopeFactory) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            return await database.Database.CanConnectAsync(cancellationToken)
                ? HealthCheckResult.Healthy("ready")
                : HealthCheckResult.Unhealthy("dependency_unavailable");
        }
        catch (Exception)
        {
            return HealthCheckResult.Unhealthy("dependency_unavailable");
        }
    }
}
