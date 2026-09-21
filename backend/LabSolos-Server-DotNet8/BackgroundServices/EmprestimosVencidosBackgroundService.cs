using LabSolos_Server_DotNet8.Services;
using Microsoft.EntityFrameworkCore;

namespace LabSolos_Server_DotNet8.BackgroundServices
{
    public class EmprestimosVencidosBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<EmprestimosVencidosBackgroundService> _logger;
        private readonly TimeSpan _periodo = TimeSpan.FromHours(24); // Verifica uma vez por dia
        private static readonly Action<ILogger, Exception?> LogServiceStarted =
            LoggerMessage.Define(
                LogLevel.Information,
                new EventId(1000, nameof(LogServiceStarted)),
                "Serviço de verificação de empréstimos vencidos iniciado");
        private static readonly Action<ILogger, Exception?> LogCheckStarted =
            LoggerMessage.Define(
                LogLevel.Information,
                new EventId(1001, nameof(LogCheckStarted)),
                "Executando verificação de empréstimos vencidos");
        private static readonly Action<ILogger, Exception?> LogCheckCompleted =
            LoggerMessage.Define(
                LogLevel.Information,
                new EventId(1002, nameof(LogCheckCompleted)),
                "Verificação de empréstimos vencidos concluída");
        private static readonly Action<ILogger, Exception?> LogRecoverableFailure =
            LoggerMessage.Define(
                LogLevel.Warning,
                new EventId(1003, nameof(LogRecoverableFailure)),
                "Falha recuperável ao verificar empréstimos vencidos; a próxima execução tentará novamente");
        private static readonly Action<ILogger, Exception?> LogUnexpectedFailure =
            LoggerMessage.Define(
                LogLevel.Error,
                new EventId(1004, nameof(LogUnexpectedFailure)),
                "Falha inesperada ao verificar empréstimos vencidos; o serviço será interrompido");

        public EmprestimosVencidosBackgroundService(
            IServiceProvider serviceProvider,
            ILogger<EmprestimosVencidosBackgroundService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            LogServiceStarted(_logger, null);

            while (!stoppingToken.IsCancellationRequested)
            {
                await ExecuteIterationWithUnexpectedFailureLoggingAsync(stoppingToken);
                await Task.Delay(_periodo, stoppingToken);
            }
        }

        private Task ExecuteIterationWithUnexpectedFailureLoggingAsync(CancellationToken stoppingToken)
        {
            var iteration = ExecuteIterationAsync(stoppingToken);
            _ = iteration.ContinueWith(
                completedTask => LogUnexpectedFailureIfNeeded(completedTask, stoppingToken),
                CancellationToken.None,
                TaskContinuationOptions.OnlyOnFaulted | TaskContinuationOptions.ExecuteSynchronously,
                TaskScheduler.Default);

            return iteration;
        }

        private async Task ExecuteIterationAsync(CancellationToken stoppingToken)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var notificacaoService = scope.ServiceProvider.GetRequiredService<INotificacaoService>();

                LogCheckStarted(_logger, null);
                await notificacaoService.VerificarEmprestimosVencidosAsync();
                LogCheckCompleted(_logger, null);
            }
            catch (DbUpdateException ex)
            {
                LogRecoverableFailure(_logger, ex);
            }
            catch (TimeoutException ex)
            {
                LogRecoverableFailure(_logger, ex);
            }
            catch (OperationCanceledException ex) when (!stoppingToken.IsCancellationRequested)
            {
                LogRecoverableFailure(_logger, ex);
            }
        }

        private void LogUnexpectedFailureIfNeeded(Task completedTask, CancellationToken stoppingToken)
        {
            var exception = completedTask.Exception?.GetBaseException();
            if (exception is null ||
                (exception is OperationCanceledException && stoppingToken.IsCancellationRequested))
            {
                return;
            }

            LogUnexpectedFailure(_logger, exception);
        }
    }
}
