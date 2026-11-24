using AutoMapper;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.DTOs.Auditoria;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Net;

namespace LabSolos_Server_DotNet8.Services
{
    public class AuditoriaService : IAuditoriaService
    {
        private static readonly Action<ILogger, string, string, Exception?> LogAuditPersistenceFailure =
            LoggerMessage.Define<string, string>(
                LogLevel.Warning,
                new EventId(1001, nameof(LogAuditPersistenceFailure)),
                "Falha ao persistir diagnóstico de auditoria. CorrelationId {CorrelationId}; erro {ErrorType}.");

        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;
        private readonly ILogger<AuditoriaService> _logger;
        private readonly TimeProvider _timeProvider;
        private readonly AppDbContext? _database;
        private readonly AuditDetectionService _auditDetection = new();

        public AuditoriaService(
            IUnitOfWork uow,
            IMapper mapper,
            ILogger<AuditoriaService> logger,
            TimeProvider? timeProvider = null,
            AppDbContext? database = null)
        {
            _uow = uow;
            _mapper = mapper;
            _logger = logger;
            _timeProvider = timeProvider ?? TimeProvider.System;
            _database = database;
        }

        public Task RegistrarEventoObrigatorioAsync(CreateLogAuditoriaDTO evento)
        {
            var log = CriarRegistro(evento, CategoriaRegistroAuditoria.TrilhaObrigatoria);
            _uow.LogAuditoriaRepository.Criar(log);
            return Task.CompletedTask;
        }

        public async Task RegistrarDiagnosticoAsync(CreateLogAuditoriaDTO evento)
        {
            await RegistrarDiagnosticoInternoAsync(evento, null);
        }

        public Task RegistrarLogAsync(
            CreateLogAuditoriaDTO evento,
            int? usuarioId = null,
            string? enderecoIP = null,
            string? userAgent = null)
        {
            ArgumentNullException.ThrowIfNull(evento);
            _ = userAgent;

            var origem = evento.OrigemConfiavel == OrigemConfiavelAuditoria.ProcessoAutorizado
                ? OrigemConfiavelAuditoria.ProcessoAutorizado
                : usuarioId is > 0
                    ? OrigemConfiavelAuditoria.UsuarioAutenticado
                    : OrigemConfiavelAuditoria.SemAtorValido;
            var trustedEvent = evento with
            {
                OrigemConfiavel = origem,
                UsuarioId = origem == OrigemConfiavelAuditoria.UsuarioAutenticado ? usuarioId : null,
                IdentidadeProcesso = origem == OrigemConfiavelAuditoria.ProcessoAutorizado
                    ? evento.IdentidadeProcesso
                    : null
            };

            return RegistrarDiagnosticoInternoAsync(trustedEvent, enderecoIP);
        }

        private async Task RegistrarDiagnosticoInternoAsync(CreateLogAuditoriaDTO evento, string? enderecoIP)
        {
            var log = CriarRegistro(evento, CategoriaRegistroAuditoria.DiagnosticoOperacional, enderecoIP);
            try
            {
                var deteccao = await AvaliarDeteccaoAsync(log);
                log.CategoriaDeteccao = deteccao.Categoria;
                log.CodigoRegraDeteccao = deteccao.CodigoRegra;
                log.VersaoRegraDeteccao = deteccao.VersaoRegra;
                log.QuantidadeObservadaDeteccao = deteccao.QuantidadeObservada;
                log.Suspeita = deteccao.Categoria == AuditDetectionCategory.AtividadeSuspeita;
                _uow.LogAuditoriaRepository.Criar(log);
                await _uow.CommitAsync();
            }
            catch (Exception exception)
            {
                LogAuditPersistenceFailure(
                    _logger,
                    log.CorrelationId,
                    exception.GetType().Name,
                    null);
            }
        }

        public async Task<int> ExpurgarEventosExpiradosAsync(DateTimeOffset? instanteAtual = null)
        {
            var agora = instanteAtual ?? _timeProvider.GetUtcNow();
            if (_database is not null && _database.Database.IsRelational())
            {
                return await _database.LogsAuditoria
                    .Where(log => log.ExpiraEmUtc <= agora)
                    .ExecuteDeleteAsync();
            }

            var expirados = (await _uow.LogAuditoriaRepository.ObterTodosAsync(
                log => log.ExpiraEmUtc <= agora)).ToArray();

            foreach (var log in expirados)
                _uow.LogAuditoriaRepository.Remover(log);

            if (expirados.Length > 0)
                await _uow.CommitAsync();

            return expirados.Length;
        }

        public async Task<IEnumerable<LogAuditoriaDTO>> ObterLogsFiltradosAsync(FiltroAuditoriaDTO filtro)
        {
            var logs = await _uow.LogAuditoriaRepository.ObterLogsFiltradosAsync(filtro);
            return _mapper.Map<IEnumerable<LogAuditoriaDTO>>(logs);
        }

        public async Task<RelatorioAuditoriaDTO> GerarRelatorioAsync(DateTime dataInicio, DateTime dataFim)
        {
            return await _uow.LogAuditoriaRepository.GerarRelatorioFiltradoAsync(
                new FiltroAuditoriaDTO { DataInicio = dataInicio, DataFim = dataFim },
                CancellationToken.None);
        }

        public async Task<AuditClassificationRevision?> ReclassificarClassificacaoAsync(
            int logId,
            int autorUsuarioId,
            int revisaoEsperada,
            bool suspeitaResultante,
            string justificativa)
        {
            if (logId <= 0)
                throw new ArgumentOutOfRangeException(nameof(logId));
            if (autorUsuarioId <= 0)
                throw new ArgumentOutOfRangeException(nameof(autorUsuarioId));
            if (revisaoEsperada < 0)
                throw new ArgumentOutOfRangeException(nameof(revisaoEsperada));
            if (string.IsNullOrWhiteSpace(justificativa))
                throw new ArgumentException("A justificativa é obrigatória.", nameof(justificativa));

            var justificativaNormalizada = justificativa.Trim();
            if (justificativaNormalizada.Length > 1000)
                throw new ArgumentException("A justificativa excede o limite permitido.", nameof(justificativa));

            return await _uow.LogAuditoriaRepository.ReclassificarAsync(
                logId,
                autorUsuarioId,
                revisaoEsperada,
                suspeitaResultante,
                justificativaNormalizada,
                _timeProvider.GetUtcNow());
        }

        public async Task<bool> VerificarAtividadeSuspeitaAsync(int usuarioId, string enderecoIP)
        {
            var now = _timeProvider.GetUtcNow();
            var normalizedIp = NormalizarEnderecoIp(enderecoIP);
            var accountRule = _auditDetection.ObterRegra(AuditDetectionAxis.Conta);
            var originRule = _auditDetection.ObterRegra(AuditDetectionAxis.Origem);
            var end = LimiteSuperiorInclusivoComoExclusivo(now);
            var accountFailures = usuarioId > 0
                ? await _uow.LogAuditoriaRepository.ContarFalhasLoginPorContaAsync(
                    usuarioId,
                    (now - accountRule.Janela).UtcDateTime,
                    end)
                : 0;
            var originFailures = normalizedIp.Length > 0
                ? await _uow.LogAuditoriaRepository.ContarFalhasLoginPorOrigemAsync(
                    normalizedIp,
                    (now - originRule.Janela).UtcDateTime,
                    end)
                : 0;
            var probe = new LogAuditoria
            {
                TipoAcao = TipoAcaoAuditoria.LoginFalhado,
                UsuarioId = usuarioId > 0 ? usuarioId : null,
                EnderecoIP = normalizedIp,
                OrigemConfiavel = usuarioId > 0
                    ? OrigemConfiavelAuditoria.UsuarioAutenticado
                    : OrigemConfiavelAuditoria.SemAtorValido
            };

            return _auditDetection.Avaliar(probe, accountFailures, originFailures, now).Categoria ==
                AuditDetectionCategory.AtividadeSuspeita;
        }

        public Task ProcessarDeteccaoAutomaticaAsync()
        {
            // Diagnósticos são classificados com o catálogo versionado quando registrados.
            return Task.CompletedTask;
        }

        private LogAuditoria CriarRegistro(
            CreateLogAuditoriaDTO evento,
            CategoriaRegistroAuditoria categoriaEsperada,
            string? enderecoIP = null)
        {
            ArgumentNullException.ThrowIfNull(evento);

            var definicao = AuditoriaEventCatalog.Obter(evento.CodigoEvento);
            if (definicao.SomenteLegado || definicao.Categoria != categoriaEsperada)
                throw new ArgumentException("O evento não pertence à finalidade solicitada.", nameof(evento));
            if (!definicao.OrigensPermitidas.Contains(evento.OrigemConfiavel))
                throw new ArgumentException("A origem não é permitida para o evento.", nameof(evento));
            if (!AuditoriaEventCatalog.ReferenciaSegura(evento.ReferenciaRecurso))
                throw new ArgumentException("A referência do recurso contém formato inválido.", nameof(evento));

            var referenciaAtor = evento.OrigemConfiavel switch
            {
                OrigemConfiavelAuditoria.UsuarioAutenticado when evento.UsuarioId is > 0 &&
                    evento.IdentidadeProcesso is null => $"usuario:{evento.UsuarioId.Value}",
                OrigemConfiavelAuditoria.ProcessoAutorizado when evento.UsuarioId is null &&
                    AuditoriaEventCatalog.ReferenciaSegura(evento.IdentidadeProcesso) &&
                    !string.IsNullOrWhiteSpace(evento.IdentidadeProcesso) => $"processo:{evento.IdentidadeProcesso}",
                OrigemConfiavelAuditoria.SemAtorValido when evento.UsuarioId is null &&
                    evento.IdentidadeProcesso is null => null,
                _ => throw new ArgumentException("A referência do ator não corresponde à origem declarada.", nameof(evento))
            };

            var instante = _timeProvider.GetUtcNow();
            var correlationId = string.IsNullOrWhiteSpace(evento.CorrelationId)
                ? Guid.NewGuid().ToString("N")
                : evento.CorrelationId;
            if (!AuditoriaEventCatalog.ReferenciaSegura(correlationId))
                throw new ArgumentException("O identificador de correlação contém formato inválido.", nameof(evento));

            return new LogAuditoria
            {
                DataHora = instante.UtcDateTime,
                CodigoEvento = evento.CodigoEvento,
                Acao = definicao.Acao,
                Recurso = evento.ReferenciaRecurso is null
                    ? definicao.Recurso
                    : $"{definicao.Recurso}:{evento.ReferenciaRecurso}",
                EnderecoIP = NormalizarEnderecoIp(enderecoIP),
                TipoAcao = evento.TipoAcaoDiagnostica ?? definicao.TipoAcao,
                NivelRisco = definicao.NivelRisco,
                UsuarioId = evento.UsuarioId,
                OrigemConfiavel = evento.OrigemConfiavel,
                ReferenciaAtor = referenciaAtor,
                Resultado = evento.Resultado,
                CategoriaRegistro = definicao.Categoria,
                CorrelationId = correlationId,
                ExpiraEmUtc = instante + definicao.Retencao,
                Origem = evento.OrigemConfiavel.ToString()
            };
        }

        private async Task<AuditDetectionResult> AvaliarDeteccaoAsync(LogAuditoria log)
        {
            var now = _timeProvider.GetUtcNow();
            if (log.TipoAcao != TipoAcaoAuditoria.LoginFalhado)
                return _auditDetection.Avaliar(log, 0, 0, now);

            var (accountFailures, originFailures) = await ContarFalhasLoginAsync(
                log.UsuarioId,
                log.EnderecoIP,
                now);

            return _auditDetection.Avaliar(
                log,
                accountFailures + (log.UsuarioId is > 0 ? 1 : 0),
                originFailures + (!string.IsNullOrEmpty(log.EnderecoIP) ? 1 : 0),
                now);
        }

        private async Task<(int Account, int Origin)> ContarFalhasLoginAsync(
            int? usuarioId,
            string enderecoIP,
            DateTimeOffset now)
        {
            var accountRule = _auditDetection.ObterRegra(AuditDetectionAxis.Conta);
            var originRule = _auditDetection.ObterRegra(AuditDetectionAxis.Origem);
            var end = LimiteSuperiorInclusivoComoExclusivo(now);
            var accountFailures = usuarioId is > 0
                ? await _uow.LogAuditoriaRepository.ContarFalhasLoginPorContaAsync(
                    usuarioId.Value,
                    (now - accountRule.Janela).UtcDateTime,
                    end)
                : 0;
            var originFailures = !string.IsNullOrEmpty(enderecoIP)
                ? await _uow.LogAuditoriaRepository.ContarFalhasLoginPorOrigemAsync(
                    enderecoIP,
                    (now - originRule.Janela).UtcDateTime,
                    end)
                : 0;

            return (accountFailures, originFailures);
        }

        private static DateTime LimiteSuperiorInclusivoComoExclusivo(DateTimeOffset now) =>
            now.AddTicks(10).UtcDateTime;

        private static string NormalizarEnderecoIp(string? enderecoIP)
        {
            if (string.IsNullOrWhiteSpace(enderecoIP) || !IPAddress.TryParse(enderecoIP, out var parsed))
                return string.Empty;

            var normalized = parsed.ToString();
            return normalized.Length <= 45 ? normalized : string.Empty;
        }
    }
}
