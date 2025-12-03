using LabSolos_Server_DotNet8.DTOs.Auditoria;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Extensions;
using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace LabSolos_Server_DotNet8.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize("ApenasAdministradores")]
    public class AuditoriaController : ControllerBase
    {
        private readonly IAuditoriaService _auditoriaService;

        public AuditoriaController(IAuditoriaService auditoriaService)
        {
            _auditoriaService = auditoriaService;
        }

        [HttpPost("registrar")]
        public async Task<IActionResult> RegistrarLog([FromBody] CreateLogAuditoriaDTO logDto)
        {
            try
            {
                var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
                var userId = userIdClaim != null ? int.Parse(userIdClaim.Value) : (int?)null;

                var enderecoIP = HttpContext.GetClientIpAddress();
                var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();

                await _auditoriaService.RegistrarLogAsync(logDto, userId, enderecoIP, userAgent);

                return Ok(new { message = "Log registrado com sucesso" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Erro ao registrar log: {ex.Message}" });
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
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Erro ao obter logs: {ex.Message}" });
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
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Erro ao gerar relatório: {ex.Message}" });
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
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Erro ao marcar log: {ex.Message}" });
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
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Erro ao marcar log: {ex.Message}" });
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
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Erro ao verificar atividade: {ex.Message}" });
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
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Erro ao processar detecção: {ex.Message}" });
            }
        }
    }
}
