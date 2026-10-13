#pragma warning disable CA1707 // Keep the namespace aligned with the existing application assembly name.
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace LabSolos_Server_DotNet8.BackgroundServices;

public sealed class AuthenticationThrottleCleanupWorker(
    IServiceScopeFactory scopeFactory,
    IOptions<AuthenticationProtectionOptions> options) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(options.Value.CleanupIntervalSeconds));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var throttle = scope.ServiceProvider.GetRequiredService<PostgresAuthenticationThrottle>();
            await throttle.CleanupExpiredAsync(stoppingToken);
        }
    }
}
