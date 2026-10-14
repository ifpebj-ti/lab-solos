using Npgsql;
using Testcontainers.PostgreSql;

namespace Tests.Infrastructure;

public interface IPostgreSqlDatabaseFixture
{
    string ConnectionString { get; }

    Task RecreateEmptyDatabaseAsync();

    Task<int> CountPublicTablesAsync();
}

public abstract class PostgreSqlContainerFixtureBase(string image) : IAsyncLifetime, IPostgreSqlDatabaseFixture
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder(image)
        .WithDatabase("labsolos_tests")
        .WithUsername("labsolos_test")
        .WithPassword("synthetic-postgres-password")
        .Build();

    public string ConnectionString => _container.GetConnectionString();

    public Task InitializeAsync() => _container.StartAsync();

    public async Task RecreateEmptyDatabaseAsync()
    {
        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandText = "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;";
        await command.ExecuteNonQueryAsync();
    }

    public async Task<int> CountPublicTablesAsync()
    {
        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';";
        return Convert.ToInt32(await command.ExecuteScalarAsync());
    }

    public Task DisposeAsync() => _container.DisposeAsync().AsTask();
}

public sealed class PostgreSqlContainerFixture : PostgreSqlContainerFixtureBase
{
    public PostgreSqlContainerFixture()
        : base("postgres:16-alpine@sha256:cf78e76683b9ca8c5733cbbdce6c9262b45b6767934dd0a95e671f9a0fc20685")
    {
    }
}

[CollectionDefinition(Name)]
public sealed class PostgreSqlIntegrationCollection : ICollectionFixture<PostgreSqlContainerFixture>
{
    public const string Name = "PostgreSQL integration";
}
