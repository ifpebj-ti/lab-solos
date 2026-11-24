using LabSolos_Server_DotNet8.DTOs.Notificacoes;
using LabSolos_Server_DotNet8.Services;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace LabSolos_Server_DotNet8.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class NotificacoesController : ControllerBase
    {
        private const string InternalServerErrorMessage = "Erro interno do servidor";
        private readonly INotificacaoService _notificacaoService;
        private readonly ILogger<NotificacoesController> _logger;
        private static readonly Action<ILogger, string, Exception?> LogNotificationOperationFailure =
            LoggerMessage.Define<string>(
                LogLevel.Error,
                new EventId(1001, nameof(LogNotificationOperationFailure)),
                "Falha operacional na operação de notificações: {Operacao}.");

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

                var notificacoes = await _notificacaoService.ObterNotificacoesUsuarioAsync(usuarioId.Value, apenasNaoLidas);

                return Ok(notificacoes);
            }
            catch (InvalidOperationException ex)
            {
                return InternalServerErrorResponse("obter notificações do usuário", ex);
            }
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> ObterNotificacao(int id)
        {
            try
            {
                var usuarioId = GetCurrentUserId();
                if (usuarioId == null)
                    return Unauthorized("Usuário não encontrado");

                var notificacao = await _notificacaoService.ObterNotificacaoDestinatarioAsync(id, usuarioId.Value);
                return notificacao is null ? NotFound() : Ok(notificacao);
            }
            catch (InvalidOperationException ex)
            {
                return InternalServerErrorResponse("obter notificação do usuário", ex);
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

                var count = await _notificacaoService.ContarNaoLidasUsuarioAsync(usuarioId.Value);
                return Ok(new { count });
            }
            catch (InvalidOperationException ex)
            {
                return InternalServerErrorResponse("contar notificações não lidas", ex);
            }
        }

        [HttpPost]
        [Authorize("ApenasAdministradores")] // Apenas administradores podem criar notificações
        public async Task<IActionResult> CriarNotificacao([FromBody] CreateNotificacaoDTO createDto)
        {
            try
            {
                var usuarioId = GetCurrentUserId();
                if (usuarioId is null)
                    return Unauthorized("Usuário não encontrado");

                var notificacao = await _notificacaoService.CriarNotificacaoManualAsync(createDto, usuarioId.Value);
                return CreatedAtAction(nameof(ObterMinhasNotificacoes), new { id = notificacao.Id }, notificacao);
            }
            catch (NotificationQuotaExceededException ex)
            {
                return OperationAdmissionResponses.RateLimited(Response, ex.RetryAfterSeconds);
            }
            catch (NotificationQuotaUnavailableException)
            {
                return OperationAdmissionResponses.Unavailable(Response);
            }
            catch (NotificationRecipientNotEligibleException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (DbUpdateException ex)
            {
                return InternalServerErrorResponse("criar notificação", ex);
            }
        }

        [HttpDelete("{id:int}")]
        [Authorize("ApenasAdministradores")]
        public async Task<IActionResult> ExcluirNotificacao(int id)
        {
            try
            {
                var administradorId = GetCurrentUserId();
                if (administradorId is null)
                    return Unauthorized("Usuário não encontrado");

                var excluida = await _notificacaoService.ExcluirNotificacaoAsync(id, administradorId.Value);
                return excluida ? NoContent() : NotFound();
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (DbUpdateException ex)
            {
                return InternalServerErrorResponse("excluir notificação", ex);
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
                    return Forbid();

                return Ok(new { message = "Notificação marcada como lida" });
            }
            catch (DbUpdateException ex)
            {
                return InternalServerErrorResponse($"marcar notificação {id} como lida", ex);
            }
        }

        [HttpPatch("marcar-lidas")]
        [Authorize] // Qualquer usuário autenticado pode marcar suas próprias notificações como lidas
        public async Task<IActionResult> MarcarVariasComoLidas([FromBody] MarcarLidaDTO marcarLidaDto)
        {
            try
            {
                var usuarioId = GetCurrentUserId();
                if (usuarioId == null)
                    return Unauthorized("Usuário não encontrado");

                if (marcarLidaDto.NotificacaoIds == null || marcarLidaDto.NotificacaoIds.Length == 0)
                    return BadRequest("IDs das notificações são obrigatórios");

                var marcadasCount = await _notificacaoService.MarcarVariasComoLidaComVerificacaoAsync(marcarLidaDto.NotificacaoIds, usuarioId.Value);
                return Ok(new { message = $"{marcadasCount} notificações marcadas como lidas" });
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (DbUpdateException ex)
            {
                return InternalServerErrorResponse("marcar notificações como lidas", ex);
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
            catch (NotificationQuotaExceededException ex)
            {
                return OperationAdmissionResponses.RateLimited(Response, ex.RetryAfterSeconds);
            }
            catch (NotificationQuotaUnavailableException)
            {
                return OperationAdmissionResponses.Unavailable(Response);
            }
            catch (DbUpdateException ex)
            {
                return InternalServerErrorResponse("gerar notificações automáticas", ex);
            }
        }

        [HttpPost("verificar-emprestimos-vencidos")]
        [Authorize(Roles = "Administrador")] // Apenas administradores podem executar esta ação
        public async Task<IActionResult> VerificarEmprestimosVencidos()
        {
            try
            {
                await _notificacaoService.VerificarEmprestimosVencidosAsync();
                return Ok(new { message = "Verificação de empréstimos vencidos executada com sucesso" });
            }
            catch (NotificationQuotaExceededException ex)
            {
                return OperationAdmissionResponses.RateLimited(Response, ex.RetryAfterSeconds);
            }
            catch (NotificationQuotaUnavailableException)
            {
                return OperationAdmissionResponses.Unavailable(Response);
            }
            catch (DbUpdateException ex)
            {
                return InternalServerErrorResponse("verificar empréstimos vencidos", ex);
            }
        }

        private ObjectResult InternalServerErrorResponse(string operation, Exception exception)
        {
            LogNotificationOperationFailure(_logger, operation, exception);
            return StatusCode(StatusCodes.Status500InternalServerError, InternalServerErrorMessage);
        }

        private int? GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(userIdClaim, out var userId) ? userId : null;
        }

    }
}
