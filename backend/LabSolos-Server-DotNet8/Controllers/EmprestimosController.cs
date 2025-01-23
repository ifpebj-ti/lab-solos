using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using LabSolos_Server_DotNet8.Dtos.Emprestimos;
using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Mvc;

namespace LabSolos_Server_DotNet8.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EmprestimosController(ILogger<UsuariosController> logger, IEmprestimoService emprestimoService) : ControllerBase
    {
        private readonly IEmprestimoService _emprestimoService = emprestimoService;
        private readonly ILogger<UsuariosController> _logger = logger;

        [HttpGet("{userId}")]
        public async Task<IActionResult> GetEmprestimosUsuario(int userId)
        {
            var usuarios = await _emprestimoService.GetEmprestimosUsuario(userId);
            return Ok(usuarios);
        }

        [HttpGet("solicitados/{userId}")]
        public async Task<IActionResult> GetEmprestimosSolicitadosUsuario(int userId)
        {
            var usuarios = await _emprestimoService.GetEmprestimosSolicitadosUsuario(userId);
            return Ok(usuarios);
        }

        [HttpGet("aprovados/{userId}")]
        public async Task<IActionResult> GetEmprestimosAprovadosUsuario(int userId)
        {
            var usuarios = await _emprestimoService.GetEmprestimosAprovadosUsuario(userId);
            return Ok(usuarios);
        }

        [HttpPost]
        public async Task<IActionResult> AddEmprestimo([FromBody] AddEmprestimoDTO emprestimoDto)
        {
            if (emprestimoDto == null || emprestimoDto.ProdutosIds == null || emprestimoDto.ProdutosIds.Count == 0)
            {
                return BadRequest("Dados inválidos. Certifique-se de fornecer os produtos e informações do empréstimo.");
            }

            var novoEmprestimo = await _emprestimoService.AddEmprestimo(emprestimoDto);
            return CreatedAtAction(nameof(GetEmprestimosUsuario), new { userId = novoEmprestimo.SolicitanteId }, novoEmprestimo);
        }
    }
}