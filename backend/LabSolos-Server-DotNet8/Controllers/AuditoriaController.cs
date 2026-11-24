using LabSolos_Server_DotNet8.DTOs.Auditoria;
using LabSolos_Server_DotNet8.Extensions;
using LabSolos_Server_DotNet8.Services;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Globalization;
using System.Security.Claims;

namespace LabSolos_Server_DotNet8.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize("ApenasAdministradores")]
    public class AuditoriaController : ControllerBase
    {
        private readonly ILogger<AuditoriaController> _logger;
        private readonly IAuditoriaService _auditoriaService;
        private readonly IAuditQueryPolicy _auditQueryPolicy;
        private static readonly Action<ILogger, string, Exception?> LogAuditOperationFailure =
            LoggerMessage.Define<string>(
                LogLevel.Error,
                new EventId(1001, nameof(LogAuditOperationFailure)),
                "Falha operacional na operacao de auditoria: {Operacao}.");

        public AuditoriaController(
            IAuditoriaService auditoriaService,
            IAuditQueryPolicy auditQueryPolicy,
            ILogger<AuditoriaController> logger)
        {
            _auditoriaService = auditoriaService;
            _auditQueryPolicy = auditQueryPolicy;
            _logger = logger;
        }

        [HttpPost("registrar")]
        public IActionResult RegistrarLog() => StatusCode(
            StatusCodes.Status410Gone,
            new { message = "Eventos de auditoria são derivados pelo servidor." });

        [HttpGet("logs")]
        public async Task<IActionResult> ObterLogs(
            [FromQuery] FiltroAuditoriaDTO filtro,
            [FromQuery(Name = "pagina")] string? paginaInformada,
            [FromQuery(Name = "tamanhoPagina")] string? tamanhoPaginaInformado)
        {
            if (!_auditQueryPolicy.TryCreatePagination(
                    paginaInformada,
                    tamanhoPaginaInformado,
                    out var parametros,
                    out var parametroInvalido))
            {
                return BadRequest(new ProblemDetails
                {
                    Title = "Os parâmetros de paginação são inválidos.",
                    Status = StatusCodes.Status400BadRequest,
                    Extensions = { ["code"] = "pagination_invalid", ["parameter"] = parametroInvalido }
                });
            }

            if (!TryGetAdministratorId(out var administratorId))
                return Forbid();

            var admission = await _auditQueryPolicy.AdmitQueryAsync(administratorId, HttpContext.RequestAborted);
            var admissionFailure = AdmissionFailure(admission);
            if (admissionFailure is not null)
                return admissionFailure;

            try
            {
                return Ok(await _auditQueryPolicy.ConsultarAsync(
                    filtro,
                    parametros,
                    HttpContext.RequestAborted));
            }
            catch (InvalidOperationException ex)
            {
                return AuditOperationFailure("obter logs", "Erro ao obter logs.", ex);
            }
        }

        [HttpGet("relatorio")]
        public async Task<IActionResult> GerarRelatorio([FromQuery] FiltroAuditoriaDTO filtro)
        {
            if (!TryGetAdministratorId(out var administratorId))
                return Forbid();

            if (filtro.DataInicio is null && filtro.DataFim is null)
            {
                filtro.DataInicio = DateTime.UtcNow.AddDays(-30);
                filtro.DataFim = DateTime.UtcNow;
            }

            var admission = await _auditQueryPolicy.AdmitQueryAsync(administratorId, HttpContext.RequestAborted);
            var admissionFailure = AdmissionFailure(admission);
            if (admissionFailure is not null)
                return admissionFailure;

            try
            {
                var relatorio = await _auditQueryPolicy.GerarRelatorioAsync(filtro, HttpContext.RequestAborted);
                return Ok(relatorio);
            }
            catch (InvalidOperationException ex)
            {
                return AuditOperationFailure("gerar relatório", "Erro ao gerar relatório.", ex);
            }
        }

        [HttpGet("exportar")]
        public async Task<IActionResult> Exportar([FromQuery] FiltroAuditoriaDTO filtro)
        {
            if (!TryGetAdministratorId(out var administratorId))
                return Forbid();

            var admission = await _auditQueryPolicy.AdmitExportAsync(administratorId, HttpContext.RequestAborted);
            var admissionFailure = AdmissionFailure(admission);
            if (admissionFailure is not null)
                return admissionFailure;

            try
            {
                var exportacao = await _auditQueryPolicy.PrepararExportacaoAsync(filtro, HttpContext.RequestAborted);
                if (exportacao.ExcedeLimite(AuditQueryPolicy.MaximumExportRecords))
                {
                    var problem = new ProblemDetails
                    {
                        Title = "O recorte excede o limite de exportação.",
                        Detail = "Aplique filtros para exportar até 5.000 registros por solicitação.",
                        Status = StatusCodes.Status400BadRequest
                    };
                    problem.Extensions["code"] = "audit_export_limit_exceeded";
                    return BadRequest(problem);
                }

                Response.Headers.CacheControl = "no-store";
                var csv = _auditQueryPolicy.SerializarCsv(exportacao.Itens);
                return File(
                    System.Text.Encoding.UTF8.GetBytes(csv),
                    "text/csv; charset=utf-8",
                    "auditoria.csv");
            }
            catch (InvalidOperationException ex)
            {
                return AuditOperationFailure("exportar logs", "Erro ao exportar logs.", ex);
            }
        }

        [HttpPatch("marcar-suspeito/{logId}")]
        public Task<IActionResult> MarcarComoSuspeito(
            int logId,
            [FromBody] ReclassificarAuditoriaDTO solicitacao) =>
            ReclassificarAsync(logId, solicitacao, suspeitaResultante: true);

        [HttpPatch("marcar-nao-suspeito/{logId}")]
        public Task<IActionResult> MarcarComoNaoSuspeito(
            int logId,
            [FromBody] ReclassificarAuditoriaDTO solicitacao) =>
            ReclassificarAsync(logId, solicitacao, suspeitaResultante: false);

        [HttpGet("verificar-atividade-suspeita")]
        public async Task<IActionResult> VerificarAtividadeSuspeita([FromQuery] int usuarioId)
        {
            try
            {
                var enderecoIP = HttpContext.GetClientIpAddress();
                var suspeita = await _auditoriaService.VerificarAtividadeSuspeitaAsync(usuarioId, enderecoIP);

                return Ok(new { suspeita });
            }
            catch (InvalidOperationException ex)
            {
                return AuditOperationFailure("verificar atividade suspeita", "Erro ao verificar atividade.", ex);
            }
        }

        [HttpPost("processar-deteccao")]
        public async Task<IActionResult> ProcessarDeteccaoAutomatica()
        {
            try
            {
                await _auditoriaService.ProcessarDeteccaoAutomaticaAsync();
                return Ok(new { message = "Detecção automática processada" });
            }
            catch (InvalidOperationException ex)
            {
                return AuditOperationFailure("processar detecção", "Erro ao processar detecção.", ex);
            }
        }

        private BadRequestObjectResult AuditOperationFailure(
            string operation,
            string message,
            Exception exception)
        {
            LogAuditOperationFailure(_logger, operation, exception);
            return BadRequest(new { message });
        }

        private IActionResult? AdmissionFailure(OperationAdmissionResult result) => result.Status switch
        {
            OperationAdmissionStatus.Allowed => null,
            OperationAdmissionStatus.RateLimited => OperationAdmissionResponses.RateLimited(
                Response,
                result.RetryAfterSeconds),
            OperationAdmissionStatus.Unavailable => OperationAdmissionResponses.Unavailable(Response),
            _ => OperationAdmissionResponses.Unavailable(Response)
        };

        private bool TryGetAdministratorId(out int administratorId)
        {
            var identifier = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(
                    identifier,
                    NumberStyles.None,
                    CultureInfo.InvariantCulture,
                    out administratorId)
                && administratorId > 0;
        }

        private async Task<IActionResult> ReclassificarAsync(
            int logId,
            ReclassificarAuditoriaDTO solicitacao,
            bool suspeitaResultante)
        {
            var identificadorAtor = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(
                    identificadorAtor,
                    NumberStyles.None,
                    CultureInfo.InvariantCulture,
                    out var autorUsuarioId) || autorUsuarioId <= 0)
                return Forbid();

            try
            {
                var revisao = await _auditoriaService.ReclassificarClassificacaoAsync(
                    logId,
                    autorUsuarioId,
                    solicitacao.RevisaoEsperada,
                    suspeitaResultante,
                    solicitacao.Justificativa);
                if (revisao is null)
                    return NotFound();

                return Ok(new
                {
                    message = "Classificação atualizada",
                    revisaoClassificacao = revisao.NumeroRevisao
                });
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new
                {
                    code = "audit_classification_conflict",
                    message = "A classificação foi atualizada por outro administrador. Recarregue o evento."
                });
            }
            catch (ArgumentException)
            {
                return BadRequest(new
                {
                    code = "audit_classification_justification_invalid",
                    message = "Informe uma justificativa válida com até 1.000 caracteres."
                });
            }
            catch (DbUpdateException exception)
            {
                return AuditOperationFailure("reclassificar evento de auditoria", "Erro ao atualizar classificação.", exception);
            }
        }
    }
}
