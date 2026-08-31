using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;
using Tests.Infrastructure;

namespace Tests.Data;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class UserDataMigrationTests(PostgreSqlContainerFixture database)
{
    [Fact]
    public void Model_and_history_describe_civil_admission_date()
    {
        using var context = CreateContext();
        var property = context.Model.FindEntityType(typeof(Usuario))?.FindProperty(nameof(Usuario.DataIngresso));

        Assert.NotNull(property);
        Assert.Equal(typeof(DateOnly?), property.ClrType);
        Assert.Equal("date", property.GetColumnType());
        Assert.Collection(
            context.Database.GetMigrations(),
            migration => Assert.EndsWith("_InitialSchemaBaseline", migration),
            migration => Assert.EndsWith("_CredentialLifecycle", migration),
            migration => Assert.EndsWith("_UserDataContracts", migration));
    }

    [Fact]
    public async Task New_database_reaches_nullable_date_idempotently()
    {
        await database.RecreateEmptyDatabaseAsync();
        await using var context = CreateContext();

        await context.Database.MigrateAsync();
        await context.Database.MigrateAsync();

        Assert.Equal(("date", "YES"), await ReadAdmissionColumnAsync());
        Assert.Equal(3, await CountAppliedMigrationsAsync());
    }

    [Fact]
    public async Task Upgrade_uses_utc_date_and_preserves_null_and_legacy_city()
    {
        await database.RecreateEmptyDatabaseAsync();
        await using var context = CreateContext();
        var migrator = context.GetService<IMigrator>();
        var credentialMigration = context.Database.GetMigrations()
            .Single(migration => migration.EndsWith("_CredentialLifecycle", StringComparison.Ordinal));
        await migrator.MigrateAsync(credentialMigration);

        await using (var connection = new NpgsqlConnection(database.ConnectionString))
        {
            await connection.OpenAsync();
            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO "Usuarios"
                    ("NomeCompleto", "Email", "SenhaHash", "NivelUsuario", "TipoUsuario", "Status", "DataIngresso", "Cidade", "Curso", "Instituicao")
                VALUES
                    ('Com data', 'dated@example.test', 'hash', 1, 1, 1, TIMESTAMPTZ '2026-08-31 23:30:00-02', 'Indefinido', 'ES', 'IFPE'),
                    ('Sem data', 'null@example.test', 'hash', 1, 1, 1, NULL, NULL, NULL, 'IFPE');
                """;
            await command.ExecuteNonQueryAsync();
        }

        await migrator.MigrateAsync();

        await using var verification = new NpgsqlConnection(database.ConnectionString);
        await verification.OpenAsync();
        await using var verifyCommand = verification.CreateCommand();
        verifyCommand.CommandText = """
            SELECT "Email", "DataIngresso", "Cidade"
            FROM "Usuarios"
            ORDER BY "Email";
            """;
        await using var reader = await verifyCommand.ExecuteReaderAsync();

        Assert.True(await reader.ReadAsync());
        Assert.Equal("dated@example.test", reader.GetString(0));
        Assert.Equal(new DateOnly(2026, 9, 1), reader.GetFieldValue<DateOnly>(1));
        Assert.Equal("Indefinido", reader.GetString(2));
        Assert.True(await reader.ReadAsync());
        Assert.Equal("null@example.test", reader.GetString(0));
        Assert.True(reader.IsDBNull(1));
        Assert.True(reader.IsDBNull(2));
    }

    private AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(database.ConnectionString)
            .Options;
        return new AppDbContext(options);
    }

    private async Task<(string DataType, string Nullable)> ReadAdmissionColumnAsync()
    {
        await using var connection = new NpgsqlConnection(database.ConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'Usuarios' AND column_name = 'DataIngresso';
            """;
        await using var reader = await command.ExecuteReaderAsync();
        Assert.True(await reader.ReadAsync());
        return (reader.GetString(0), reader.GetString(1));
    }

    private async Task<int> CountAppliedMigrationsAsync()
    {
        await using var connection = new NpgsqlConnection(database.ConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM \"__EFMigrationsHistory\";";
        return Convert.ToInt32(await command.ExecuteScalarAsync());
    }
}
