using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;
using Tests.Infrastructure;

namespace Tests.Data;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class CredentialLifecycleMigrationTests(PostgreSqlContainerFixture database)
{
    [Fact]
    public void Model_and_migration_history_describe_the_credential_lifecycle()
    {
        using var context = CreateContext();
        var usuario = context.Model.FindEntityType(typeof(Usuario));

        Assert.NotNull(usuario);
        Assert.Equal(false, usuario.FindProperty("ExigeTrocaSenha")?.GetDefaultValue());

        var sessionVersion = usuario.FindProperty("VersaoSessao");
        Assert.Equal(0L, sessionVersion?.GetDefaultValue());
        Assert.True(sessionVersion?.IsConcurrencyToken);

        Assert.NotNull(usuario.FindProperty("TokenRedefinicaoHash"));
        Assert.Null(usuario.FindProperty("TokenRedefinicao"));

        var migrations = context.Database.GetMigrations().ToArray();
        Assert.Collection(
            migrations,
            migration => Assert.EndsWith("_InitialSchemaBaseline", migration),
            migration => Assert.EndsWith("_CredentialLifecycle", migration),
            migration => Assert.EndsWith("_UserDataContracts", migration));
    }

    [Fact]
    public async Task New_database_reaches_the_complete_schema_through_migrate()
    {
        await database.RecreateEmptyDatabaseAsync();
        await using var context = CreateContext();

        await context.Database.MigrateAsync();
        await context.Database.MigrateAsync();

        var columns = await ReadCredentialColumnsAsync();
        Assert.Equal("false", columns["ExigeTrocaSenha"].DefaultValue);
        Assert.Equal("boolean", columns["ExigeTrocaSenha"].DataType);
        Assert.Equal("0", columns["VersaoSessao"].DefaultValue);
        Assert.Equal("bigint", columns["VersaoSessao"].DataType);
        Assert.True(columns.ContainsKey("TokenRedefinicaoHash"));
        Assert.False(columns.ContainsKey("TokenRedefinicao"));
        Assert.Equal(3, await CountAppliedMigrationsAsync());
    }

    [Fact]
    public async Task Baselined_legacy_schema_is_upgraded_without_losing_users_and_invalidates_tokens()
    {
        await database.RecreateEmptyDatabaseAsync();
        await using var context = CreateContext();
        var migrator = context.GetService<IMigrator>();

        var baseline = context.Database.GetMigrations()
            .Single(migration => migration.EndsWith("_InitialSchemaBaseline", StringComparison.Ordinal));
        await migrator.MigrateAsync(baseline);
        await MarkExistingSchemaAsBaselinedAsync();

        await using (var connection = new NpgsqlConnection(database.ConnectionString))
        {
            await connection.OpenAsync();
            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO "Usuarios"
                    ("NomeCompleto", "Email", "SenhaHash", "NivelUsuario", "TipoUsuario", "Status", "TokenRedefinicao", "TokenExpiracao")
                VALUES
                    ('Usuário legado', 'legacy@example.org', 'legacy-password-hash', 0, 2, 0, 'legacy-reset-token', NOW() + INTERVAL '1 hour');
                """;
            await command.ExecuteNonQueryAsync();
        }

        await migrator.MigrateAsync();

        await using var verification = new NpgsqlConnection(database.ConnectionString);
        await verification.OpenAsync();
        await using var verifyCommand = verification.CreateCommand();
        verifyCommand.CommandText = """
            SELECT "NomeCompleto", "ExigeTrocaSenha", "VersaoSessao", "TokenRedefinicaoHash", "TokenExpiracao"
            FROM "Usuarios"
            WHERE "Email" = 'legacy@example.org';
            """;
        await using var reader = await verifyCommand.ExecuteReaderAsync();

        Assert.True(await reader.ReadAsync());
        Assert.Equal("Usuário legado", reader.GetString(0));
        Assert.False(reader.GetBoolean(1));
        Assert.Equal(0L, reader.GetInt64(2));
        Assert.True(reader.IsDBNull(3));
        Assert.True(reader.IsDBNull(4));
    }

    private AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(database.ConnectionString)
            .Options;

        return new AppDbContext(options);
    }

    private async Task<Dictionary<string, (string? DefaultValue, string DataType)>> ReadCredentialColumnsAsync()
    {
        await using var connection = new NpgsqlConnection(database.ConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT column_name, column_default, data_type
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'Usuarios'
              AND column_name IN ('ExigeTrocaSenha', 'VersaoSessao', 'TokenRedefinicaoHash', 'TokenRedefinicao');
            """;
        await using var reader = await command.ExecuteReaderAsync();
        var result = new Dictionary<string, (string?, string)>(StringComparer.Ordinal);
        while (await reader.ReadAsync())
        {
            result.Add(
                reader.GetString(0),
                (reader.IsDBNull(1) ? null : reader.GetString(1), reader.GetString(2)));
        }

        return result;
    }

    private async Task<int> CountAppliedMigrationsAsync()
    {
        await using var connection = new NpgsqlConnection(database.ConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM \"__EFMigrationsHistory\";";
        return Convert.ToInt32(await command.ExecuteScalarAsync());
    }

    private async Task MarkExistingSchemaAsBaselinedAsync()
    {
        const string resourceName =
            "LabSolos_Server_DotNet8.Data.Migrations.MarkInitialSchemaBaseline.sql";
        var assembly = typeof(AppDbContext).Assembly;
        await using var scriptStream = assembly.GetManifestResourceStream(resourceName);
        Assert.NotNull(scriptStream);
        using var reader = new StreamReader(scriptStream);
        var script = await reader.ReadToEndAsync();

        await using var connection = new NpgsqlConnection(database.ConnectionString);
        await connection.OpenAsync();
        await using (var removeHistory = connection.CreateCommand())
        {
            removeHistory.CommandText = "DELETE FROM \"__EFMigrationsHistory\";";
            await removeHistory.ExecuteNonQueryAsync();
        }

        await using var markBaseline = connection.CreateCommand();
        markBaseline.CommandText = script;
        await markBaseline.ExecuteNonQueryAsync();
    }
}
