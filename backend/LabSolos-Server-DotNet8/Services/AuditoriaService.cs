using AutoMapper;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.DTOs.Auditoria;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Repositories;

namespace LabSolos_Server_DotNet8.Services
{
    public class AuditoriaService : IAuditoriaService
    {
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;

        public AuditoriaService(IUnitOfWork uow, IMapper mapper)
        {
            _uow = uow;
            _mapper = mapper;
        }

        public async Task RegistrarLogAsync(CreateLogAuditoriaDTO logDto, int? usuarioId = null, string? enderecoIP = null, string? userAgent = null)
        {
            try
            {
                var log = new LogAuditoria
                {
                    DataHora = DateTime.UtcNow,
                    Acao = logDto.Acao,
                    Recurso = logDto.Recurso,
                    Detalhes = logDto.Detalhes,
                    EnderecoIP = enderecoIP ?? "127.0.0.1",
                    UserAgent = userAgent,
                    TipoAcao = logDto.TipoAcao,
                    NivelRisco = logDto.NivelRisco,
                    UsuarioId = usuarioId,
                    DadosRequisicao = logDto.DadosRequisicao,
                    DadosResposta = logDto.DadosResposta,
                    TempoSessao = logDto.TempoSessao,
                    TentativasAcesso = logDto.TentativasAcesso,
                    Origem = logDto.Origem ?? "Web"
                };

                // Verificar automaticamente se é suspeito
                log.Suspeita = await DetectarAtividadeSuspeitaAsync(log);

                _uow.LogAuditoriaRepository.Criar(log);
                await _uow.CommitAsync();
            }
            catch (Exception ex)
            {
                // Log de erro interno - não deve falhar a operação principal
                Console.WriteLine($"Erro ao registrar log de auditoria: {ex.Message}");
            }
        }

        public async Task<IEnumerable<LogAuditoriaDTO>> ObterLogsFiltradosAsync(FiltroAuditoriaDTO filtro)
        {
            var logs = await _uow.LogAuditoriaRepository.ObterLogsFiltradosAsync(filtro);
            return _mapper.Map<IEnumerable<LogAuditoriaDTO>>(logs);
        }

        public async Task<RelatorioAuditoriaDTO> GerarRelatorioAsync(DateTime dataInicio, DateTime dataFim)
        {
            var relatorio = new RelatorioAuditoriaDTO();

            // Estatísticas básicas
            var filtroTotal = new FiltroAuditoriaDTO { DataInicio = dataInicio, DataFim = dataFim, TamanhoPagina = int.MaxValue };
            relatorio.TotalLogs = await _uow.LogAuditoriaRepository.ObterTotalLogsFiltradosAsync(filtroTotal);

            var filtroSuspeitos = new FiltroAuditoriaDTO { DataInicio = dataInicio, DataFim = dataFim, ApenasSuspeitas = true, TamanhoPagina = int.MaxValue };
            relatorio.LogsSuspeitos = await _uow.LogAuditoriaRepository.ObterTotalLogsFiltradosAsync(filtroSuspeitos);

            var filtroCriticos = new FiltroAuditoriaDTO { DataInicio = dataInicio, DataFim = dataFim, NivelRisco = NivelRiscoAuditoria.Critico, TamanhoPagina = int.MaxValue };
            relatorio.LogsCriticos = await _uow.LogAuditoriaRepository.ObterTotalLogsFiltradosAsync(filtroCriticos);

            // Estatísticas detalhadas
            relatorio.LogsPorTipo = await _uow.LogAuditoriaRepository.ObterEstatisticasPorTipoAsync(dataInicio, dataFim);
            relatorio.LogsPorUsuario = await _uow.LogAuditoriaRepository.ObterEstatisticasPorUsuarioAsync(dataInicio, dataFim);
            relatorio.LogsPorIP = await _uow.LogAuditoriaRepository.ObterEstatisticasPorIPAsync(dataInicio, dataFim);
            relatorio.LogsPorDia = await _uow.LogAuditoriaRepository.ObterLogsPorDiaAsync(dataInicio, dataFim);

            // Dados suspeitos
            var logsSuspeitos = await _uow.LogAuditoriaRepository.ObterLogsSuspeitosAsync(10);
            relatorio.UltimosLogsSuspeitos = _mapper.Map<List<LogAuditoriaDTO>>(logsSuspeitos);
            relatorio.IPsSuspeitos = await _uow.LogAuditoriaRepository.ObterIPsSuspeitosAsync();
            relatorio.UsuariosComMaisAcessos = await _uow.LogAuditoriaRepository.ObterUsuariosComMaisAcessosAsync();

            return relatorio;
        }

        public async Task MarcarComoSuspeitoAsync(int logId, string motivo)
        {
            await _uow.LogAuditoriaRepository.MarcarComoSuspeitoAsync(logId, motivo);
        }

        public async Task MarcarComoNaoSuspeitoAsync(int logId)
        {
            await _uow.LogAuditoriaRepository.MarcarComoNaoSuspeitoAsync(logId);
        }

        public async Task<bool> VerificarAtividadeSuspeitaAsync(int usuarioId, string enderecoIP)
        {
            return await _uow.LogAuditoriaRepository.VerificarAtividadeSuspeitaAsync(usuarioId, enderecoIP);
        }

        public async Task ProcessarDeteccaoAutomaticaAsync()
        {
            // Implementar lógica de detecção automática de atividades suspeitas
            // Pode ser executado via background service

            // Exemplo: marcar IPs com muitas tentativas de login falhado
            var ipsSuspeitos = await _uow.LogAuditoriaRepository.ObterIPsSuspeitosAsync();

            // Lógica adicional de detecção pode ser implementada aqui
            // Como análise de padrões, horários incomuns, etc.
        }

        private async Task<bool> DetectarAtividadeSuspeitaAsync(LogAuditoria log)
        {
            // Regras automáticas de detecção de atividade suspeita

            // 1. Múltiplas tentativas de login falhado
            if (log.TipoAcao == TipoAcaoAuditoria.LoginFalhado)
            {
                var ultimaHora = DateTime.UtcNow.AddHours(-1);
                var tentativasRecentes = await _uow.LogAuditoriaRepository.ObterTotalLogsFiltradosAsync(
                    new FiltroAuditoriaDTO
                    {
                        DataInicio = ultimaHora,
                        EnderecoIP = log.EnderecoIP,
                        TipoAcao = TipoAcaoAuditoria.LoginFalhado,
                        TamanhoPagina = int.MaxValue
                    });

                if (tentativasRecentes > 5)
                {
                    log.MotivoSuspeita = $"Múltiplas tentativas de login falhado ({tentativasRecentes}) do IP {log.EnderecoIP}";
                    return true;
                }
            }

            // 2. Acesso em horário incomum (entre 23h e 6h)
            var hora = log.DataHora.Hour;
            if (hora >= 23 || hora <= 6)
            {
                if (log.TipoAcao == TipoAcaoAuditoria.AcessoAdministrativo ||
                    log.NivelRisco == NivelRiscoAuditoria.Alto)
                {
                    log.MotivoSuspeita = "Acesso administrativo em horário incomum";
                    return true;
                }
            }

            // 3. Atividade excessiva
            if (log.UsuarioId.HasValue)
            {
                var atividade = await VerificarAtividadeSuspeitaAsync(log.UsuarioId.Value, log.EnderecoIP);
                if (atividade)
                {
                    log.MotivoSuspeita = "Atividade excessiva detectada";
                    return true;
                }
            }

            // 4. Ações críticas
            if (log.NivelRisco == NivelRiscoAuditoria.Critico)
            {
                log.MotivoSuspeita = "Ação de nível crítico";
                return true;
            }

            return false;
        }
    }
}
