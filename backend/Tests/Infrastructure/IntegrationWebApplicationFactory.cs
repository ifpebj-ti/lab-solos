using LabSolos_Server_DotNet8.BackgroundServices;
using LabSolos_Server_DotNet8.Data.Context;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;

namespace Tests.Infrastructure;

public sealed class IntegrationWebApplicationFactory(
    PostgreSqlContainerFixture database,
    IntegrationApplicationOptions? options = null) : WebApplicationFactory<Program>
{
    private const string SyntheticJwtKey =
        "synthetic-integration-jwt-key-with-at-least-thirty-two-bytes";

    private readonly IntegrationApplicationOptions _options = options ?? new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(_options.EnvironmentName);
        var settings = new Dictionary<string, string?>
        {
            ["ConnectionStrings:PostgresConnection"] = database.ConnectionString,
            ["Jwt:Key"] = SyntheticJwtKey,
            ["Jwt:Issuer"] = "labsolos-integration-tests",
            ["Jwt:Audience"] = "labsolos-integration-tests"
        };

        foreach (var pair in _options.Configuration)
        {
            settings[pair.Key] = pair.Value;
        }

        foreach (var pair in settings)
        {
            builder.UseSetting(pair.Key, pair.Value);
        }

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<AppDbContext>();
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.AddDbContext<AppDbContext>(dbOptions =>
                dbOptions.UseNpgsql(database.ConnectionString));

            services.RemoveAll<TimeProvider>();
            services.AddSingleton(_options.TimeProvider);

            var backgroundWorker = services.FirstOrDefault(descriptor =>
                descriptor.ServiceType == typeof(IHostedService) &&
                descriptor.ImplementationType == typeof(EmprestimosVencidosBackgroundService));
            if (backgroundWorker is not null)
            {
                services.Remove(backgroundWorker);
            }
        });
    }

    public async Task RecreateDatabaseAsync(CancellationToken cancellationToken = default)
    {
        await database.RecreateEmptyDatabaseAsync();

        await using var scope = Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.EnsureCreatedAsync(cancellationToken);
    }
}
