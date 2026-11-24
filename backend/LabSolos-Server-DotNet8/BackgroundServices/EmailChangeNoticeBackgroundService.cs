using LabSolos_Server_DotNet8.Services.Security;

namespace LabSolos_Server_DotNet8.BackgroundServices;

public sealed class EmailChangeNoticeBackgroundService(
    IServiceScopeFactory scopeFactory,
    ILogger<EmailChangeNoticeBackgroundService> logger) : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(15);
    private readonly IServiceScopeFactory _scopeFactory = scopeFactory ?? throw new ArgumentNullException(nameof(scopeFactory));
    private readonly ILogger<EmailChangeNoticeBackgroundService> _logger = logger ?? throw new ArgumentNullException(nameof(logger));

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = _scopeFactory.CreateAsyncScope();
                await scope.ServiceProvider
                    .GetRequiredService<EmailChangeNoticeService>()
                    .ProcessPendingAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception)
            {
                _logger.LogError(
                    new EventId(1905, "EmailChangeNoticeProcessingFailure"),
                    "Email-change notice processing failed; leased jobs remain recoverable and no recipient data was logged.");
            }

            try
            {
                await Task.Delay(PollInterval, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }
    }
}
