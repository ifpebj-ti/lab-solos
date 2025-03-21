
using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LabSolos_Server_DotNet8.Controllers
{
    [ApiController]
    //[Authorize]
    [Route("api/[controller]")]
    public class SystemController(ISystemService systemService, ILogger<SystemController> logger) : ControllerBase
    {
        private readonly ISystemService _systemService = systemService;
        private readonly ILogger<SystemController> _logger = logger;

        [HttpGet("quantities")]
        public async Task<IActionResult> GetSystemQuantities()
        {
            var result = await _systemService.GetSystemQuantitiesAsync();
            return Ok(result);
        }
    }
}