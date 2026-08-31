using LabSolos_Server_DotNet8.DTOs.Auth;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace LabSolos_Server_DotNet8.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly JwtService _jwtService;
        private readonly IUnitOfWork _uow;
        private readonly ICredentialService _credentialService;

        public AuthController(
            JwtService jwtService,
            IUnitOfWork uow,
            ICredentialService credentialService)
        {
            _jwtService = jwtService;
            _uow = uow;
            _credentialService = credentialService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDTO requestDto)
        {
            if (requestDto == null)
            {
                return BadRequest("Requisição inválida.");
            }

            var usuario = await _uow.UsuarioRepository.ObterAsync(u => u.Email == requestDto.Email);

            if (usuario == null || !usuario.VerificarSenha(requestDto.Password))
            {
                return Unauthorized("Credenciais inválidas.");
            }

            if (usuario.Status != StatusUsuario.Habilitado)
            {
                return Unauthorized("Credenciais inválidas.");
            }

            var token = _jwtService.GenerateToken(usuario);
            return Ok(new
            {
                token,
                requiresPasswordChange = usuario.ExigeTrocaSenha
            });
        }

        [HttpPost("change-password")]
        [Authorize(Policy = CredentialAuthorizationPolicies.ChangeOwnPassword)]
        public async Task<IActionResult> ChangePassword(
            [FromBody] ChangePasswordDTO? requestDto,
            CancellationToken cancellationToken)
        {
            var subject = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ??
                User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(subject, out var userId))
            {
                return Unauthorized();
            }

            requestDto ??= new ChangePasswordDTO();
            var result = await _credentialService.ChangePasswordAsync(
                userId,
                requestDto.CurrentPassword,
                requestDto.NewPassword,
                requestDto.Confirmation,
                cancellationToken);

            return result.Status switch
            {
                CredentialChangeStatus.Success => NoContent(),
                CredentialChangeStatus.Conflict => ConflictProblem(),
                _ => ValidationProblem(result.Code ?? "password_invalid")
            };
        }

        private static ObjectResult ValidationProblem(string code)
        {
            var field = code switch
            {
                CredentialErrorCodes.CurrentPasswordInvalid => "currentPassword",
                CredentialErrorCodes.ConfirmationMismatch => "confirmation",
                _ => "newPassword"
            };
            var message = code switch
            {
                CredentialErrorCodes.CurrentPasswordInvalid => "A senha atual informada é inválida.",
                CredentialErrorCodes.ConfirmationMismatch => "A confirmação da nova senha não confere.",
                "password_required" => "A nova senha é obrigatória.",
                "password_too_short" => "A nova senha deve ter pelo menos 15 caracteres.",
                "password_too_long" => "A nova senha deve ter no máximo 128 caracteres.",
                "password_common" => "A nova senha é muito comum.",
                _ => "A nova senha é inválida."
            };
            var details = new ValidationProblemDetails(new Dictionary<string, string[]>
            {
                [field] = [code, message]
            })
            {
                Type = "https://httpstatuses.com/400",
                Title = "Não foi possível alterar a senha.",
                Status = StatusCodes.Status400BadRequest
            };

            return new ObjectResult(details)
            {
                StatusCode = StatusCodes.Status400BadRequest,
                ContentTypes = { "application/problem+json" }
            };
        }

        private static ObjectResult ConflictProblem()
        {
            var details = new ProblemDetails
            {
                Type = "https://httpstatuses.com/409",
                Title = "A credencial foi alterada por outra solicitação.",
                Status = StatusCodes.Status409Conflict
            };
            details.Extensions["code"] = CredentialErrorCodes.ConcurrencyConflict;

            return new ObjectResult(details)
            {
                StatusCode = StatusCodes.Status409Conflict,
                ContentTypes = { "application/problem+json" }
            };
        }
    }
}
