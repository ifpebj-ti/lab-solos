using LabSolos_Server_DotNet8.Services;

namespace LabSolos_Server_DotNet8.BackgroundServices
{
    public class EmprestimosVencidosBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<EmprestimosVencidosBackgroundService> _logger;
        private readonly TimeSpan _periodo = TimeSpan.FromHours(24); // Verifica uma vez por dia

        public EmprestimosVencidosBackgroundService(
            IServiceProvider serviceProvider,
            ILogger<EmprestimosVencidosBackgroundService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Serviço de verificação de empréstimos vencidos iniciado");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _serviceProvider.CreateScope();
                    var notificacaoService = scope.ServiceProvider.GetRequiredService<INotificacaoService>();

                    _logger.LogInformation("Executando verificação de empréstimos vencidos");
                    await notificacaoService.VerificarEmprestimosVencidosAsync();
                    _logger.LogInformation("Verificação de empréstimos vencidos concluída");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Erro ao executar verificação de empréstimos vencidos");
                }

                await Task.Delay(_periodo, stoppingToken);
            }
        }
    }
}
