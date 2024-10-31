using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Mvc;

namespace LabSolos_Server_DotNet8.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController(JwtService jwtService, IUserService userService) : ControllerBase
    {
        private readonly JwtService _jwtService = jwtService;
        private readonly IUserService _userService = userService;

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var user = await _userService.ValidateUserAsync(request.Email, request.Password);

            if (user == null)
                return Unauthorized("Credenciais inválidas.");

            var token = _jwtService.GenerateToken(user.Id.ToString(), user.Email);
            return Ok(new { Token = token });
        }
    }
}

public class LoginRequest
{
    public string Email { get; set; }
    public string Password { get; set; }
}