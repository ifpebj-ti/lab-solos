using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
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
    public class EmprestimosController(ILogger<EmprestimosController> logger, IUsuarioService usuarioService, IEmprestimoService emprestimoService, IProdutoService produtoService) : ControllerBase
    {
        private readonly IEmprestimoService _emprestimoService = emprestimoService;
        private readonly IUsuarioService _usuarioService = usuarioService;
        private readonly IProdutoService _produtoService = produtoService;


        private readonly ILogger<EmprestimosController> _logger = logger;

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

        [HttpGet]
        public async Task<IActionResult> GetTodosEmprestimosAsync()
        {
            var emprestimos = await _emprestimoService.GetTodosEmprestimosAsync();

            if (!emprestimos.Any())
            {
                return NotFound("Nenhum empréstimo encontrado");
            }

            return Ok(emprestimos);
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
        public async Task<IActionResult> AprovarEmprestimo(int emprestimoId)
        {
            // Obter usuário autenticado
            var user = HttpContext.User;

            if (user == null)
            {
                return Unauthorized("Usuário não autenticado.");
            }
            
            // Obter o ID do usuário autenticado
            var userIdClaim = user.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
            {
                return Unauthorized("Token inválido. ID do usuário não encontrado.");
            }

            // Verificar se o usuário tem o papel de admin
            var nivelClaim = user.Claims.FirstOrDefault(c => c.Type == "nivel");
            if (nivelClaim == null || nivelClaim.Value != "Administrador")
            {
                return Unauthorized("Apenas administradores podem aprovar empréstimos.");
            }

            var userId = int.Parse(userIdClaim.Value);


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

                if (!(produto.DataValidade < DateTime.Today))
                {
                    if (produto.Quantidade > 0)
                    {
                        produto.Status = StatusProduto.Disponivel;
                    }
                    else
                    {
                        produto.Status = StatusProduto.Esgotado;

                    }
                }
                else
                {
                    produto.Status = StatusProduto.Vencido;
                }
                
                await _produtoService.UpdateAsync(produto);
            }

            // Atualizar o status do empréstimo para aprovado
            emprestimo.Status = StatusEmprestimo.Aprovado;
            emprestimo.DataAprovacao = DateTime.UtcNow;
            emprestimo.AprovadorId = userId;

            // Salvar as mudanças no banco de dados
            await _emprestimoService.UpdateAsync(emprestimo);

            // Retornar resposta de sucesso
            return Ok(new { Message = "Empréstimo aprovado com sucesso.", Emprestimo = emprestimo });
        }

        [HttpPatch("reprovar/{emprestimoId}")]
        public async Task<IActionResult> ReprovarEmprestimo(int emprestimoId)
        {
            // Obter usuário autenticado
            var user = HttpContext.User;

            if (user == null)
            {
                return Unauthorized("Usuário não autenticado.");
            }

            // Obter o ID do usuário autenticado
            var userIdClaim = user.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
            {
                return Unauthorized("Token inválido. ID do usuário não encontrado.");
            }

            var userId = int.Parse(userIdClaim.Value);

            // Verificar se o usuário tem o papel de admin
            var nivelClaim = user.Claims.FirstOrDefault(c => c.Type == "nivel");
            if (nivelClaim == null || nivelClaim.Value != "Administrador")
            {
                return Unauthorized("Apenas administradores podem aprovar empréstimos.");
            }

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

            // Atualizar o status do empréstimo para aprovado
            emprestimo.Status = StatusEmprestimo.Rejeitado;

            // Salvar as mudanças no banco de dados
            await _emprestimoService.UpdateAsync(emprestimo);

            // Retornar resposta de sucesso
            return Ok(new { Message = "Empréstimo reprovado com sucesso.", Emprestimo = emprestimo });
        }
    }
}