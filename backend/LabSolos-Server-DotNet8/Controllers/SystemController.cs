
using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LabSolos_Server_DotNet8.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SystemController(ISystemService systemService, ILogger<SystemController> logger) : ControllerBase
    {
        private readonly ISystemService _systemService = systemService;
        private readonly ILogger<SystemController> _logger = logger;

        [HttpGet("quantities")]
        public async Task<IActionResult> ObterQuantidadesDoSistema()
        {
            var result = await _systemService.ObterQuantidadesDoSistema();
            return Ok(result);
        }

        [HttpGet("health")]
        public IActionResult VerificarSaudeDoSistema()
        {
            return Ok(new { status = "healthy 1.0" });
        }
    }
}