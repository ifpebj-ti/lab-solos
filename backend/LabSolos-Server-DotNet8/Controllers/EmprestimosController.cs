using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using LabSolos_Server_DotNet8.Dtos.Emprestimos;
using LabSolos_Server_DotNet8.DTOs.Emprestimos;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Mvc;

namespace LabSolos_Server_DotNet8.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EmprestimosController(ILogger<UsuariosController> logger, IUsuarioService usuarioService, IEmprestimoService emprestimoService) : ControllerBase
    {
        private readonly IEmprestimoService _emprestimoService = emprestimoService;
        private readonly IUsuarioService _usuarioService = usuarioService;

        private readonly ILogger<UsuariosController> _logger = logger;

        [HttpGet("usuario/{userId}")]
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

        [HttpGet("{emprestimoId}")]
        public async Task<IActionResult> GetEmprestimobyId(int emprestimoId)
        {
            var emprestimo = await _emprestimoService.GetByIdAsync(emprestimoId);
            
            if (emprestimo == null)
            {
                return NotFound("Empréstimo não encontrado.");
            }

            return Ok(emprestimo);
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



        [HttpPut("aprovar/{emprestimoId}")]
        public async Task<IActionResult> AprovarEmprestimo(int emprestimoId, [FromBody] AprovarEmprestimoDTO aprovarDto)
        {
            // Buscar o empréstimo pelo ID
            var emprestimo = await _emprestimoService.GetByIdAsync(emprestimoId);
            if (emprestimo == null)
            {
                return NotFound("Empréstimo não encontrado.");
            }

            // Verificar se o empréstimo já foi aprovado ou rejeitado
            if (emprestimo.Status != StatusEmprestimo.Pendente)
            {
                return BadRequest("Este empréstimo já foi processado (aprovado ou rejeitado).");
            }

            // Buscar o solicitante do empréstimo
            var solicitante = await _usuarioService.GetByIdAsync(emprestimo.SolicitanteId);
            if (solicitante == null)
            {
                return NotFound("Solicitante do empréstimo não encontrado.");
            }

            // Verificar se o solicitante é um dependente do responsável indicado (AprovadorId)
            if (solicitante.ResponsavelId != aprovarDto.AprovadorId)
            {
                return Unauthorized("Você não tem permissão para aprovar este empréstimo, pois o solicitante não é um dependente do responsável indicado.");
            }

            // Atualizar o status do empréstimo para aprovado
            emprestimo.Status = StatusEmprestimo.Aprovado;
            emprestimo.DataAprovacao = DateTime.UtcNow;
            emprestimo.AprovadorId = aprovarDto.AprovadorId;

            // Salvar as mudanças no banco de dados
            await _emprestimoService.UpdateAsync(emprestimo);

            // Retornar resposta de sucesso
            return Ok(new { Message = "Empréstimo aprovado com sucesso.", Emprestimo = emprestimo });
        }

    }
}