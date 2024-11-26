using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Mvc;

namespace LabSolos_Server_DotNet8.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsuariosController(IUsuarioService usuarioService, ILogger<UsuariosController> logger) : ControllerBase
    {
        private readonly IUsuarioService _usuarioService = usuarioService;
        private readonly ILogger<UsuariosController> _logger = logger;

    }
}
