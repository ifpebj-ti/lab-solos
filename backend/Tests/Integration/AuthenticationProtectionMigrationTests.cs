using System.Globalization;
using LabSolos_Server_DotNet8.Data.Context;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSql15IntegrationGroup.Name)]
public sealed class AuthenticationProtectionMigrationTests(PostgreSql15ContainerFixture database)
{
    private const string LastExistingMigration = "20260915155830_SeparateLoanReturnDates";

    [Fact]
    public async Task EmptyDatabaseMigratesToProtectionSchemaAndSeedsCapacityOnce()
    {
        await database.RecreateEmptyDatabaseAsync();
        await using var context = CreateContext();

        await context.Database.MigrateAsync();
        await context.Database.MigrateAsync();

        Assert.Equal(5, await CountAppliedMigrationsAsync());
        Assert.True(await TableExistsAsync("AuthenticationThrottleBuckets"));
        Assert.True(await TableExistsAsync("AuthenticationProtectionCapacity"));
        Assert.True(await TableExistsAsync("PasswordRecoveryJobs"));
        Assert.True(await IndexExistsAsync("IX_Usuarios_Email"));
        Assert.Equal(
            [
                "login:account",
                "login:ip",
                "recovery-code:ip",
                "recovery-code:recipient",
                "recovery-jobs",
                "recovery-request:ip",
                "recovery-request:recipient"
            ],
            await ReadCapacityScopesAsync());
        Assert.All(await ReadCapacityAllocationsAsync(), allocation => Assert.Equal(0, allocation.Allocated));

        var bucketColumns = await ReadColumnsAsync("AuthenticationThrottleBuckets");
        Assert.Contains("Scope", bucketColumns);
        Assert.Contains("KeyHash", bucketColumns);
        Assert.Contains("WindowStartedAt", bucketColumns);
        Assert.Contains("WindowEndsAt", bucketColumns);
        Assert.Contains("Count", bucketColumns);
        Assert.Contains("NextAllowedAt", bucketColumns);
        Assert.Contains("NextEmissionAt", bucketColumns);
        Assert.True(await IndexExistsAsync("IX_AuthenticationThrottleBuckets_Cleanup"));

        var jobColumns = await ReadColumnsAsync("PasswordRecoveryJobs");
        Assert.Contains("Id", jobColumns);
        Assert.Contains("DeliveryKeyHash", jobColumns);
        Assert.Contains("RecipientKeyHash", jobColumns);
        Assert.Contains("PayloadCiphertext", jobColumns);
        Assert.Contains("PayloadNonce", jobColumns);
        Assert.Contains("PayloadTag", jobColumns);
        Assert.Contains("EncryptionKeyId", jobColumns);
        Assert.Contains("CreatedAt", jobColumns);
        Assert.Contains("ExpiresAt", jobColumns);
        Assert.Contains("NextAttemptAt", jobColumns);
        Assert.Contains("Status", jobColumns);
        Assert.Contains("Attempts", jobColumns);
        Assert.Contains("LeaseId", jobColumns);
        Assert.Contains("LeaseUntil", jobColumns);
        Assert.Contains("UserId", jobColumns);
        Assert.Contains("SessionVersion", jobColumns);
        Assert.True(await IndexExistsAsync("IX_PasswordRecoveryJobs_Selection"));
        Assert.True(await IndexExistsAsync("UX_PasswordRecoveryJobs_ActiveDeliveryKey"));
    }

    [Fact]
    public async Task ExistingDatabaseIsUpgradedWithoutMergingOrChangingEmailValues()
    {
        await database.RecreateEmptyDatabaseAsync();
        await using var context = CreateContext();
        await context.GetService<IMigrator>().MigrateAsync(LastExistingMigration);

        await InsertUserAsync("Legacy Owner", "migration-owner@example.invalid");
        await InsertUserAsync("Case Variant A", "case-variant@example.invalid");
        await InsertUserAsync("Case Variant B", "CASE-VARIANT@example.invalid");

        await context.Database.MigrateAsync();

        Assert.Equal(5, await CountAppliedMigrationsAsync());
        Assert.Equal(
            [
                "CASE-VARIANT@example.invalid",
                "case-variant@example.invalid",
                "migration-owner@example.invalid"
            ],
            await ReadEmailsAsync());
        Assert.True(await IndexExistsAsync("IX_Usuarios_Email"));
    }

    [Fact]
    public async Task ExactDuplicateEmailsAbortMigrationWithSanitizedDiagnosticAndPreserveRows()
    {
        const string duplicateCanary = "duplicate-canary@example.invalid";
        await database.RecreateEmptyDatabaseAsync();
        await using var context = CreateContext();
        await context.GetService<IMigrator>().MigrateAsync(LastExistingMigration);
        await InsertUserAsync("Duplicate One", duplicateCanary);
        await InsertUserAsync("Duplicate Two", duplicateCanary);

        var exception = await Assert.ThrowsAnyAsync<Exception>(() => context.Database.MigrateAsync());
        var postgresException = FindPostgresException(exception);

        Assert.NotNull(postgresException);
        Assert.Contains("duplicate", postgresException.MessageText, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(duplicateCanary, exception.ToString(), StringComparison.OrdinalIgnoreCase);
        Assert.Equal(2, await CountUsersByEmailAsync(duplicateCanary));
        Assert.Equal(4, await CountAppliedMigrationsAsync());
        Assert.False(await TableExistsAsync("AuthenticationThrottleBuckets"));
        Assert.False(await IndexExistsAsync("IX_Usuarios_Email"));
    }

    [Fact]
    public async Task ActiveDeliveryKeyIsUniqueButCanBeReusedAfterCompletion()
    {
        await database.RecreateEmptyDatabaseAsync();
        await using var context = CreateContext();
        await context.Database.MigrateAsync();

        var deliveryKey = new byte[32];
        var recipientKey = Enumerable.Repeat((byte)1, 32).ToArray();
        await InsertJobAsync(Guid.NewGuid(), deliveryKey, recipientKey, "Pending");

        var conflict = await Assert.ThrowsAsync<PostgresException>(
            () => InsertJobAsync(Guid.NewGuid(), deliveryKey, recipientKey, "Processing"));
        Assert.Equal(PostgresErrorCodes.UniqueViolation, conflict.SqlState);

        await using (var connection = new NpgsqlConnection(database.ConnectionString))
        {
            await connection.OpenAsync();
            await using var command = connection.CreateCommand();
            command.CommandText = "UPDATE \"PasswordRecoveryJobs\" SET \"Status\" = 'Completed';";
            await command.ExecuteNonQueryAsync();
        }

        await InsertJobAsync(Guid.NewGuid(), deliveryKey, recipientKey, "Pending");
        Assert.Equal(1, await CountActiveJobsByDeliveryKeyAsync(deliveryKey));
    }

    [Fact]
    public async Task BucketKeyAndCapacityConstraintsRejectInvalidAllocations()
    {
        await database.RecreateEmptyDatabaseAsync();
        await using var context = CreateContext();
        await context.Database.MigrateAsync();

        var invalidHash = await Assert.ThrowsAsync<PostgresException>(
            () => InsertBucketAsync(new byte[31], count: 0));
        Assert.Equal(PostgresErrorCodes.CheckViolation, invalidHash.SqlState);

        var negativeCount = await Assert.ThrowsAsync<PostgresException>(
            () => InsertBucketAsync(new byte[32], count: -1));
        Assert.Equal(PostgresErrorCodes.CheckViolation, negativeCount.SqlState);

        await InsertBucketAsync(new byte[32], count: 0);
        var duplicateBucket = await Assert.ThrowsAsync<PostgresException>(
            () => InsertBucketAsync(new byte[32], count: 0));
        Assert.Equal(PostgresErrorCodes.UniqueViolation, duplicateBucket.SqlState);

        await using var connection = new NpgsqlConnection(database.ConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "UPDATE \"AuthenticationProtectionCapacity\" SET \"Allocated\" = -1 WHERE \"Scope\" = 'login:account';";
        var negativeCapacity = await Assert.ThrowsAsync<PostgresException>(() => command.ExecuteNonQueryAsync());
        Assert.Equal(PostgresErrorCodes.CheckViolation, negativeCapacity.SqlState);
    }

    private AppDbContext CreateContext() => new(
        new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(database.ConnectionString)
            .Options);

    private async Task<int> CountAppliedMigrationsAsync()
    {
        await using var connection = new NpgsqlConnection(database.ConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM \"__EFMigrationsHistory\";";
        return Convert.ToInt32(await command.ExecuteScalarAsync(), CultureInfo.InvariantCulture);
    }

    private async Task<bool> TableExistsAsync(string table)
    {
        await using var connection = new NpgsqlConnection(database.ConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT to_regclass(format('%I.%I', 'public', @table)) IS NOT NULL;";
        command.Parameters.AddWithValue("table", table);
        return (bool)(await command.ExecuteScalarAsync())!;
    }

    private async Task<bool> IndexExistsAsync(string index)
    {
        await using var connection = new NpgsqlConnection(database.ConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT to_regclass(format('%I.%I', 'public', @index)) IS NOT NULL;";
        command.Parameters.AddWithValue("index", index);
        return (bool)(await command.ExecuteScalarAsync())!;
    }

    private async Task<string[]> ReadCapacityScopesAsync()
    {
        await using var connection = new NpgsqlConnection(database.ConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT \"Scope\" FROM \"AuthenticationProtectionCapacity\" ORDER BY \"Scope\";";
        await using var reader = await command.ExecuteReaderAsync();
        var scopes = new List<string>();
        while (await reader.ReadAsync())
        {
            scopes.Add(reader.GetString(0));
        }

        return [.. scopes];
    }

    private async Task<(string Scope, int Allocated)[]> ReadCapacityAllocationsAsync()
    {
        await using var connection = new NpgsqlConnection(database.ConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT \"Scope\", \"Allocated\" FROM \"AuthenticationProtectionCapacity\" ORDER BY \"Scope\";";
        await using var reader = await command.ExecuteReaderAsync();
        var allocations = new List<(string Scope, int Allocated)>();
        while (await reader.ReadAsync())
        {
            allocations.Add((reader.GetString(0), reader.GetInt32(1)));
        }

        return [.. allocations];
    }

    private async Task InsertBucketAsync(byte[] keyHash, int count)
    {
        await using var connection = new NpgsqlConnection(database.ConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO "AuthenticationThrottleBuckets"
                ("Scope", "KeyHash", "WindowStartedAt", "WindowEndsAt", "Count")
            VALUES ('login:account', @keyHash, now(), now() + interval '15 minutes', @count);
            """;
        command.Parameters.AddWithValue("keyHash", keyHash);
        command.Parameters.AddWithValue("count", count);
        await command.ExecuteNonQueryAsync();
    }

    private async Task<string[]> ReadColumnsAsync(string table)
    {
        await using var connection = new NpgsqlConnection(database.ConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = @table
            ORDER BY ordinal_position;
            """;
        command.Parameters.AddWithValue("table", table);
        await using var reader = await command.ExecuteReaderAsync();
        var columns = new List<string>();
        while (await reader.ReadAsync())
        {
            columns.Add(reader.GetString(0));
        }

        return [.. columns];
    }

    private async Task<string[]> ReadEmailsAsync()
    {
        await using var connection = new NpgsqlConnection(database.ConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT \"Email\" FROM \"Usuarios\" ORDER BY \"Email\";";
        await using var reader = await command.ExecuteReaderAsync();
        var emails = new List<string>();
        while (await reader.ReadAsync())
        {
            emails.Add(reader.GetString(0));
        }

        return [.. emails];
    }

    private async Task<int> CountUsersByEmailAsync(string email)
    {
        await using var connection = new NpgsqlConnection(database.ConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM \"Usuarios\" WHERE \"Email\" = @email;";
        command.Parameters.AddWithValue("email", email);
        return Convert.ToInt32(await command.ExecuteScalarAsync(), CultureInfo.InvariantCulture);
    }

    private async Task InsertUserAsync(string name, string email)
    {
        await using var connection = new NpgsqlConnection(database.ConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO "Usuarios"
                ("NomeCompleto", "Email", "SenhaHash", "NivelUsuario", "TipoUsuario", "Status")
            VALUES (@name, @email, 'synthetic-password-hash', 0, 2, 0);
            """;
        command.Parameters.AddWithValue("name", name);
        command.Parameters.AddWithValue("email", email);
        await command.ExecuteNonQueryAsync();
    }

    private async Task InsertJobAsync(Guid id, byte[] deliveryKey, byte[] recipientKey, string status)
    {
        await using var connection = new NpgsqlConnection(database.ConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO "PasswordRecoveryJobs"
                ("Id", "DeliveryKeyHash", "RecipientKeyHash", "PayloadCiphertext", "PayloadNonce", "PayloadTag",
                 "EncryptionKeyId", "CreatedAt", "ExpiresAt", "NextAttemptAt", "Status", "Attempts")
            VALUES
                (@id, @deliveryKey, @recipientKey, @ciphertext, @nonce, @tag, 'synthetic-key', now(),
                 now() + interval '15 minutes', now(), @status, 0);
            """;
        command.Parameters.AddWithValue("id", id);
        command.Parameters.AddWithValue("deliveryKey", deliveryKey);
        command.Parameters.AddWithValue("recipientKey", recipientKey);
        command.Parameters.AddWithValue("ciphertext", new byte[] { 1, 2, 3 });
        command.Parameters.AddWithValue("nonce", new byte[12]);
        command.Parameters.AddWithValue("tag", new byte[16]);
        command.Parameters.AddWithValue("status", status);
        await command.ExecuteNonQueryAsync();
    }

    private async Task<int> CountActiveJobsByDeliveryKeyAsync(byte[] deliveryKey)
    {
        await using var connection = new NpgsqlConnection(database.ConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT COUNT(*) FROM "PasswordRecoveryJobs"
            WHERE "DeliveryKeyHash" = @deliveryKey AND "Status" IN ('Pending', 'Processing');
            """;
        command.Parameters.AddWithValue("deliveryKey", deliveryKey);
        return Convert.ToInt32(await command.ExecuteScalarAsync(), CultureInfo.InvariantCulture);
    }

    private static PostgresException? FindPostgresException(Exception exception)
    {
        for (Exception? current = exception; current is not null; current = current.InnerException)
        {
            if (current is PostgresException postgresException)
            {
                return postgresException;
            }
        }

        return null;
    }
}
