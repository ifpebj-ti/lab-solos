using LabSolos_Server_DotNet8.DTOs.Notificacoes;
using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace LabSolos_Server_DotNet8.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class NotificacoesController : ControllerBase
    {
        private readonly INotificacaoService _notificacaoService;
        private readonly ILogger<NotificacoesController> _logger;

        public NotificacoesController(INotificacaoService notificacaoService, ILogger<NotificacoesController> logger)
        {
            _notificacaoService = notificacaoService;
            _logger = logger;
        }

        [HttpGet("minhas")]
        [Authorize] // Qualquer usuário autenticado pode ver suas próprias notificações
        public async Task<IActionResult> ObterMinhasNotificacoes([FromQuery] bool apenasNaoLidas = false)
        {
            try
            {
                var usuarioId = GetCurrentUserId();
                if (usuarioId == null)
                    return Unauthorized("Usuário não encontrado");

                var nivelUsuario = GetCurrentUserLevel();
                var notificacoes = await _notificacaoService.ObterNotificacoesFiltradas(usuarioId.Value, nivelUsuario, apenasNaoLidas);

                return Ok(notificacoes);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao obter notificações do usuário");
                return StatusCode(500, "Erro interno do servidor");
            }
        }

        [HttpGet("count-nao-lidas")]
        [Authorize] // Qualquer usuário autenticado pode contar suas notificações não lidas
        public async Task<IActionResult> ContarNaoLidas()
        {
            try
            {
                var usuarioId = GetCurrentUserId();
                if (usuarioId == null)
                    return Unauthorized("Usuário não encontrado");

                var nivelUsuario = GetCurrentUserLevel();
                var count = await _notificacaoService.ContarNaoLidasFiltradas(usuarioId.Value, nivelUsuario);
                return Ok(new { count });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao contar notificações não lidas");
                return StatusCode(500, "Erro interno do servidor");
            }
        }

        [HttpPost]
        [Authorize("ApenasAdministradores")] // Apenas administradores podem criar notificações
        public async Task<IActionResult> CriarNotificacao([FromBody] CreateNotificacaoDTO createDto)
        {
            try
            {
                var notificacao = await _notificacaoService.CriarNotificacaoAsync(createDto);
                return CreatedAtAction(nameof(ObterMinhasNotificacoes), new { id = notificacao.Id }, notificacao);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao criar notificação");
                return StatusCode(500, "Erro interno do servidor");
            }
        }

        [HttpPatch("{id}/marcar-lida")]
        [Authorize] // Qualquer usuário autenticado pode marcar suas próprias notificações como lidas
        public async Task<IActionResult> MarcarComoLida(int id)
        {
            try
            {
                var usuarioId = GetCurrentUserId();
                if (usuarioId == null)
                    return Unauthorized("Usuário não encontrado");

                var sucesso = await _notificacaoService.MarcarComoLidaComVerificacaoAsync(id, usuarioId.Value);
                if (!sucesso)
                    return Forbid("Você não tem permissão para marcar esta notificação como lida");

                return Ok(new { message = "Notificação marcada como lida" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao marcar notificação como lida: {NotificacaoId}", id);
                return StatusCode(500, "Erro interno do servidor");
            }
        }

        [HttpPatch("marcar-lidas")]
        [Authorize] // Qualquer usuário autenticado pode marcar suas próprias notificações como lidas
        public async Task<IActionResult> MarcarVariasComoLidas([FromBody] MarcarLidaDTO marcarLidaDto)
        {
            try
            {
                if (marcarLidaDto.NotificacaoIds == null || marcarLidaDto.NotificacaoIds.Length == 0)
                    return BadRequest("IDs das notificações são obrigatórios");

                var usuarioId = GetCurrentUserId();
                if (usuarioId == null)
                    return Unauthorized("Usuário não encontrado");

                var marcadasCount = await _notificacaoService.MarcarVariasComoLidaComVerificacaoAsync(marcarLidaDto.NotificacaoIds, usuarioId.Value);
                return Ok(new { message = $"{marcadasCount} notificações marcadas como lidas" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao marcar notificações como lidas");
                return StatusCode(500, "Erro interno do servidor");
            }
        }

        [HttpPost("gerar-automaticas")]
        [Authorize("ApenasAdministradores")] // Apenas administradores podem gerar notificações automáticas
        public async Task<IActionResult> GerarNotificacoesAutomaticas()
        {
            try
            {
                await _notificacaoService.GerarNotificacoesAutomaticasAsync();
                return Ok(new { message = "Notificações automáticas geradas com sucesso" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao gerar notificações automáticas");
                return StatusCode(500, "Erro interno do servidor");
            }
        }

        private int? GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(userIdClaim, out var userId) ? userId : null;
        }

        private string GetCurrentUserLevel()
        {
            // Verificar pelo role se é administrador
            if (User.IsInRole("Administrador"))
                return "Administrador";

            // Buscar por claims específicos do nível
            var nivelClaim = User.FindFirst("NivelUsuario")?.Value ??
                            User.FindFirst("TipoUsuario")?.Value ??
                            User.FindFirst(ClaimTypes.Role)?.Value;

            return nivelClaim ?? "Usuario";
        }
    }
}
