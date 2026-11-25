using System.Data.Common;
using System.IO;
using System.Net.Mail;
using System.Security.Cryptography;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.EntityFrameworkCore;

namespace LabSolos_Server_DotNet8.BackgroundServices;

public sealed class EmailChangeNoticeBackgroundService(
    IServiceScopeFactory scopeFactory,
    ILogger<EmailChangeNoticeBackgroundService> logger) : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(15);
    private static readonly Action<ILogger, Exception?> LogProcessingFailure =
        LoggerMessage.Define(
            LogLevel.Error,
            new EventId(1905, "EmailChangeNoticeProcessingFailure"),
            "Email-change notice processing failed; leased jobs remain recoverable and no recipient data was logged.");
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
            catch (Exception exception) when (
                exception is DbException or DbUpdateException or IOException or SmtpException
                    or TimeoutException or InvalidOperationException or ArgumentException or FormatException
                    or CryptographicException or OperationCanceledException)
            {
                LogProcessingFailure(_logger, null);
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
