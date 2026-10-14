namespace Tests.Infrastructure;

public sealed class PostgreSql15ContainerFixture : PostgreSqlContainerFixtureBase
{
    public PostgreSql15ContainerFixture()
        : base("postgres:15-alpine@sha256:fe0737ba566a2c5b2a28f34433c0a423261900ec17b9bf7ad115e1aae7e57f1b")
    {
    }
}

[CollectionDefinition(Name)]
public sealed class PostgreSql15IntegrationGroup : ICollectionFixture<PostgreSql15ContainerFixture>
{
    public const string Name = "PostgreSQL 15 integration";
}
