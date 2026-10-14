using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;

namespace Tests.Infrastructure;

public sealed class IntegrationWebApplicationFactory(
    IPostgreSqlDatabaseFixture database,
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
            ["Jwt:Audience"] = "labsolos-integration-tests",
            ["Jwt:ExpiresInMinutes"] = "60"
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
            _options.ConfigureServices?.Invoke(services);

            services.RemoveAll<AppDbContext>();
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.AddDbContext<AppDbContext>(dbOptions =>
                dbOptions.UseNpgsql(database.ConnectionString));

            services.RemoveAll<TimeProvider>();
            services.AddSingleton(_options.TimeProvider);

            var backgroundServices = services
                .Where(descriptor => descriptor.ServiceType == typeof(IHostedService))
                .ToArray();
            foreach (var backgroundService in backgroundServices)
            {
                var implementationType = backgroundService.ImplementationType ??
                    backgroundService.ImplementationInstance?.GetType();
                if (implementationType is null || !_options.BackgroundServicesToRun.Contains(implementationType))
                {
                    services.Remove(backgroundService);
                }
            }

            if (_options.EmailService is not null)
            {
                services.RemoveAll<IEmailService>();
                services.AddSingleton(_options.EmailService);
            }
        });
    }

    public async Task RecreateDatabaseAsync(CancellationToken cancellationToken = default)
    {
        await database.RecreateEmptyDatabaseAsync();

        await using var scope = Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.MigrateAsync(cancellationToken);
    }
}
