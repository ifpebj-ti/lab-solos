using LabSolos_Server_DotNet8.DTOs.Auditoria;
using LabSolos_Server_DotNet8.Extensions;
using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
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
        private static readonly Action<ILogger, string, Exception?> LogAuditOperationFailure =
            LoggerMessage.Define<string>(
                LogLevel.Error,
                new EventId(1001, nameof(LogAuditOperationFailure)),
                "Falha operacional na operacao de auditoria: {Operacao}.");

        public AuditoriaController(
            IAuditoriaService auditoriaService,
            ILogger<AuditoriaController> logger)
        {
            _auditoriaService = auditoriaService;
            _logger = logger;
        }

        [HttpPost("registrar")]
        public async Task<IActionResult> RegistrarLog([FromBody] CreateLogAuditoriaDTO logDto)
        {
            try
            {
                var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
                int? userId = null;
                if (userIdClaim != null)
                {
                    if (!int.TryParse(userIdClaim.Value, out var parsedUserId))
                        return BadRequest(new { message = "Erro ao registrar log." });

                    userId = parsedUserId;
                }

                var enderecoIP = HttpContext.GetClientIpAddress();
                var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();

                await _auditoriaService.RegistrarLogAsync(logDto, userId, enderecoIP, userAgent);

                return Ok(new { message = "Log registrado com sucesso" });
            }
            catch (DbUpdateException ex)
            {
                return AuditOperationFailure("registrar log", "Erro ao registrar log.", ex);
            }
            catch (InvalidOperationException ex)
            {
                return AuditOperationFailure("registrar log", "Erro ao registrar log.", ex);
            }
        }

        [HttpGet("logs")]
        public async Task<IActionResult> ObterLogs([FromQuery] FiltroAuditoriaDTO filtro)
        {
            try
            {
                var logs = await _auditoriaService.ObterLogsFiltradosAsync(filtro);
                return Ok(logs);
            }
            catch (InvalidOperationException ex)
            {
                return AuditOperationFailure("obter logs", "Erro ao obter logs.", ex);
            }
        }

        [HttpGet("relatorio")]
        public async Task<IActionResult> GerarRelatorio([FromQuery] DateTime? dataInicio, [FromQuery] DateTime? dataFim)
        {
            try
            {
                var inicio = dataInicio ?? DateTime.UtcNow.AddDays(-30);
                var fim = dataFim ?? DateTime.UtcNow;

                var relatorio = await _auditoriaService.GerarRelatorioAsync(inicio, fim);
                return Ok(relatorio);
            }
            catch (InvalidOperationException ex)
            {
                return AuditOperationFailure("gerar relatório", "Erro ao gerar relatório.", ex);
            }
        }

        [HttpPatch("marcar-suspeito/{logId}")]
        public async Task<IActionResult> MarcarComoSuspeito(int logId, [FromBody] string motivo)
        {
            try
            {
                await _auditoriaService.MarcarComoSuspeitoAsync(logId, motivo);
                return Ok(new { message = "Log marcado como suspeito" });
            }
            catch (DbUpdateException ex)
            {
                return AuditOperationFailure("marcar log como suspeito", "Erro ao marcar log.", ex);
            }
        }

        [HttpPatch("marcar-nao-suspeito/{logId}")]
        public async Task<IActionResult> MarcarComoNaoSuspeito(int logId)
        {
            try
            {
                await _auditoriaService.MarcarComoNaoSuspeitoAsync(logId);
                return Ok(new { message = "Log marcado como não suspeito" });
            }
            catch (DbUpdateException ex)
            {
                return AuditOperationFailure("marcar log como nao suspeito", "Erro ao marcar log.", ex);
            }
        }

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
    }
}
