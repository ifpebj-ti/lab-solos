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
    public class EmprestimosController(ILogger<UsuariosController> logger, IUsuarioService usuarioService, IEmprestimoService emprestimoService, IProdutoService produtoService) : ControllerBase
    {
        private readonly IEmprestimoService _emprestimoService = emprestimoService;
        private readonly IUsuarioService _usuarioService = usuarioService;
        private readonly IProdutoService _produtoService = produtoService;


        private readonly ILogger<UsuariosController> _logger = logger;

        [HttpGet("usuario/{userId}")]
        public async Task<IActionResult> GetEmprestimosUsuario(int userId)
        {
            var emprestimos = await _emprestimoService.GetEmprestimosUsuario(userId);
            return Ok(emprestimos);
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
            try
            {
                if (emprestimoDto == null || emprestimoDto.Produtos == null || emprestimoDto.Produtos.Count == 0)
                {
                    return BadRequest("Dados inválidos. Certifique-se de fornecer os produtos e informações do empréstimo.");
                }

                var novoEmprestimo = await _emprestimoService.AddEmprestimo(emprestimoDto);
                return CreatedAtAction(nameof(GetEmprestimosUsuario), new { userId = novoEmprestimo.SolicitanteId }, novoEmprestimo);
            }
            catch (ArgumentException e)
            {

                return BadRequest(e.Message);
            }
            catch (InvalidOperationException e)
            {

                return BadRequest(e.Message);
            }
        }

        [HttpPatch("aprovar/{emprestimoId}")]
        public async Task<IActionResult> AprovarEmprestimo(int emprestimoId, [FromBody] AprovarDTO aprovadorDto)
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
            if (solicitante.ResponsavelId != aprovadorDto.AprovadorId)
            {
                return Unauthorized("Você não tem permissão para aprovar este empréstimo, pois o solicitante não é um dependente do responsável indicado.");
            }

            // Reduzir a quantidade dos produtos
            foreach (var item in emprestimo.EmprestimoProdutos)
            {
                var produto = await _produtoService.GetByIdAsync(item.ProdutoId);
                if (produto == null)
                {
                    return NotFound($"Produto com ID {item.ProdutoId} não encontrado.");
                }

                if (produto.Quantidade < item.Quantidade)
                {
                    return BadRequest($"O produto {produto.NomeProduto} não tem estoque suficiente para este empréstimo.");
                }

                produto.Quantidade -= item.Quantidade;
                await _produtoService.UpdateAsync(produto);
            }

            // Atualizar o status do empréstimo para aprovado
            emprestimo.Status = StatusEmprestimo.Aprovado;
            emprestimo.DataAprovacao = DateTime.UtcNow;
            emprestimo.AprovadorId = aprovadorDto.AprovadorId;

            // Salvar as mudanças no banco de dados
            await _emprestimoService.UpdateAsync(emprestimo);

            // Retornar resposta de sucesso
            return Ok(new { Message = "Empréstimo aprovado com sucesso.", Emprestimo = emprestimo });
        }

    }
}