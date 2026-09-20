using LabSolos_Server_DotNet8.Data.Context;
using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class LoanReturnMigrationTests(PostgreSqlContainerFixture database)
{
    [Fact]
    public async Task CleanDatabaseAppliesAndRollsBackDateSeparationMigration()
    {
        await database.RecreateEmptyDatabaseAsync();
        await using var context = CreateContext();
        var migrations = context.Database.GetMigrations().ToArray();
        var target = migrations.Single(migration =>
            migration.EndsWith("_SeparateLoanReturnDates", StringComparison.Ordinal));
        var previous = migrations[^2];
        var migrator = context.GetService<IMigrator>();

        await migrator.MigrateAsync(target);

        Assert.Equal(("timestamp with time zone", "YES"), await ReadColumnAsync("DataPrevistaDevolucao"));
        Assert.Equal(4, await CountAppliedMigrationsAsync());

        await migrator.MigrateAsync(previous);

        Assert.Null(await TryReadColumnAsync("DataPrevistaDevolucao"));
        Assert.Equal(3, await CountAppliedMigrationsAsync());
    }

    [Fact]
    public async Task LegacyDeadlinesMoveToScheduledColumnAndRollbackRestoresLegacyValue()
    {
        await database.RecreateEmptyDatabaseAsync();
        await using var context = CreateContext();
        var migrations = context.Database.GetMigrations().ToArray();
        var previous = migrations[^2];
        var migrator = context.GetService<IMigrator>();

        await migrator.MigrateAsync(previous);
        await InsertLegacyLoanAsync();
        await migrator.MigrateAsync();

        var separated = await ReadLoanDatesAsync();
        Assert.Equal(new DateTime(2026, 10, 1, 12, 0, 0, DateTimeKind.Utc), separated.Scheduled);
        Assert.Null(separated.Effective);

        await migrator.MigrateAsync(previous);

        var rolledBack = await ReadLegacyReturnDateAsync();
        Assert.Equal(new DateTime(2026, 10, 1, 12, 0, 0, DateTimeKind.Utc), rolledBack);
    }

    private AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(database.ConnectionString)
            .Options;
        return new AppDbContext(options);
    }

    private async Task InsertLegacyLoanAsync()
    {
        await using var connection = new NpgsqlConnection(database.ConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO "Usuarios"
                ("Id", "NomeCompleto", "Email", "SenhaHash", "NivelUsuario", "TipoUsuario", "Status",
                 "DataIngresso", "ResponsavelId", "TokenRedefinicaoHash", "TokenExpiracao", "ExigeTrocaSenha", "VersaoSessao")
            VALUES
                (9001, 'Usuário legado', 'loan-return-legacy@example.invalid', 'synthetic-hash', 2, 2, 1,
                 NULL, NULL, NULL, NULL, FALSE, 0);

            INSERT INTO "Emprestimos"
                ("Id", "DataRealizacao", "DataDevolucao", "DataAprovacao", "Status", "SolicitanteId", "AprovadorId")
            VALUES
                (9002, TIMESTAMPTZ '2026-09-01 12:00:00+00', TIMESTAMPTZ '2026-10-01 12:00:00+00',
                 NULL, 0, 9001, NULL);
            """;
        await command.ExecuteNonQueryAsync();
    }

    private async Task<(string DataType, string Nullable)> ReadColumnAsync(string columnName)
    {
        var result = await TryReadColumnAsync(columnName);
        return result ?? throw new InvalidOperationException($"Column '{columnName}' was not found.");
    }

    private async Task<(string DataType, string Nullable)?> TryReadColumnAsync(string columnName)
    {
        await using var connection = new NpgsqlConnection(database.ConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'Emprestimos'
              AND column_name = $1;
            """;
        command.Parameters.AddWithValue(columnName);
        await using var reader = await command.ExecuteReaderAsync();
        return await reader.ReadAsync()
            ? (reader.GetString(0), reader.GetString(1))
            : null;
    }

    private async Task<(DateTime Scheduled, DateTime? Effective)> ReadLoanDatesAsync()
    {
        await using var connection = new NpgsqlConnection(database.ConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT "DataPrevistaDevolucao", "DataDevolucao"
            FROM "Emprestimos"
            WHERE "Id" = 9002;
            """;
        await using var reader = await command.ExecuteReaderAsync();
        Assert.True(await reader.ReadAsync());
        return (reader.GetFieldValue<DateTime>(0), reader.IsDBNull(1) ? null : reader.GetFieldValue<DateTime>(1));
    }

    private async Task<DateTime> ReadLegacyReturnDateAsync()
    {
        await using var connection = new NpgsqlConnection(database.ConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT \"DataDevolucao\" FROM \"Emprestimos\" WHERE \"Id\" = 9002;";
        return (DateTime)(await command.ExecuteScalarAsync())!;
    }

    private async Task<int> CountAppliedMigrationsAsync()
    {
        await using var connection = new NpgsqlConnection(database.ConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM \"__EFMigrationsHistory\";";
        return Convert.ToInt32(
            await command.ExecuteScalarAsync(),
            CultureInfo.InvariantCulture);
    }
}
