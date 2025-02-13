using LabSolos_Server_DotNet8.DTOs.Auth;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Mvc;

namespace LabSolos_Server_DotNet8.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController(JwtService jwtService, IUsuarioService usuarioService) : ControllerBase
    {
        private readonly JwtService _jwtService = jwtService;
        private readonly IUsuarioService _usuarioService = usuarioService;

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDTO request)
        {
            var usuario = await _usuarioService.ValidarUsuarioAsync(request.Email, request.Password);

            if (usuario == null){
                return Unauthorized("Credenciais inválidas.");
            }

            if (usuario.Status != StatusUsuario.Habilitado)
            {
                return Unauthorized("Usuário não habilitado. Contate seu responsável");
            }

            var token = _jwtService.GenerateToken(usuario.Id.ToString(), usuario.Email, usuario.NivelUsuario.ToString());
            return Ok(new { Token = token });
        }
    }
}