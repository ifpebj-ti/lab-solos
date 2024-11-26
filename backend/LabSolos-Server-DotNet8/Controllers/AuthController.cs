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
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var usuario = await _usuarioService.ValidarUsuarioAsync(request.Email, request.Password);

            if (usuario == null){
                return Unauthorized("Credenciais inválidas.");
            }

            var token = _jwtService.GenerateToken(usuario.Id.ToString(), usuario.Email);
            return Ok(new { Token = token });
        }
    }
}

public class LoginRequest
{
    public string Email { get; set; }
    public string Password { get; set; }
}