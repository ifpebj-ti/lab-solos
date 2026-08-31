using System.Net;
using LabSolos_Server_DotNet8.Data.Context;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Tests.Infrastructure;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class PostgreSqlApplicationSmokeTests(PostgreSqlContainerFixture database)
{
    [Fact]
    public async Task Application_uses_disposable_postgresql_and_answers_health_check()
    {
        var clock = new ControlledTimeProvider(new DateTimeOffset(2026, 8, 30, 12, 0, 0, TimeSpan.Zero));
        await using var factory = new IntegrationWebApplicationFactory(database, new()
        {
            EnvironmentName = "IntegrationTesting",
            TimeProvider = clock,
            Configuration = new Dictionary<string, string?>
            {
                ["IntegrationProbe"] = "configured"
            }
        });

        await factory.RecreateDatabaseAsync();
        using var client = factory.CreateClient();
        using var response = await client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("IntegrationTesting", factory.Services.GetRequiredService<IHostEnvironment>().EnvironmentName);
        Assert.Equal("configured", factory.Services.GetRequiredService<IConfiguration>()["IntegrationProbe"]);
        Assert.Same(clock, factory.Services.GetRequiredService<TimeProvider>());

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.True(context.Database.IsNpgsql());
        Assert.True(await context.Database.CanConnectAsync());
    }

    [Fact]
    public async Task Fixture_recreates_an_empty_database_between_cases()
    {
        await using (var factory = new IntegrationWebApplicationFactory(database))
        {
            await factory.RecreateDatabaseAsync();
            Assert.True(await database.CountPublicTablesAsync() > 0);
        }

        await database.RecreateEmptyDatabaseAsync();

        Assert.Equal(0, await database.CountPublicTablesAsync());
    }
}
