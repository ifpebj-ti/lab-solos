using LabSolos_Server_DotNet8.DTOs.Auth;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Mvc;

namespace LabSolos_Server_DotNet8.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly JwtService _jwtService;
        private readonly IUnitOfWork _uow;

        public AuthController(JwtService jwtService, IUnitOfWork uow)
        {
            _jwtService = jwtService;
            _uow = uow;
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
                return Unauthorized("Usuário não habilitado. Contate seu responsável.");
            }

            var token = _jwtService.GenerateToken(usuario.Id.ToString(), usuario.Email, usuario.NivelUsuario.ToString());
            return Ok(new { Token = token });
        }
    }
}