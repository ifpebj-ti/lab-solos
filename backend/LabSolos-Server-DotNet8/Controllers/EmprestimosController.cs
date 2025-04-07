using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using AutoMapper;
using LabSolos_Server_DotNet8.DTOs.Emprestimos;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LabSolos_Server_DotNet8.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EmprestimosController : ControllerBase
    {
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;

        public EmprestimosController(IUnitOfWork uow, IMapper mapper)
        {
            _uow = uow;
            _mapper = mapper;
        }

        [HttpGet("usuario/{userId}")]
        [Authorize]
        public async Task<IActionResult> ObterEmprestimosUsuario(int userId)
        {
            var usuario = await _uow.UsuarioRepository.ObterAsync(u => u.Id == userId);
            if (usuario == null)
            {
                return NotFound("Usuário não encontrado.");
            }

            var emprestimos = await _uow.EmprestimoRepository.ObterTodosAsync(e => e.SolicitanteId == usuario.Id || e.AprovadorId == usuario.Id);
            if (!emprestimos.Any())
            {
                return NotFound("Nenhum empréstimo encontrado para este usuário.");
            }

            return Ok(_mapper.Map<IEnumerable<EmprestimoDTO>>(emprestimos));
        }

        [HttpGet("solicitados/{userId}")]
        [Authorize]
        public async Task<IActionResult> ObterEmprestimosSolicitadosUsuario(int userId)
        {
            var usuario = await _uow.UsuarioRepository.ObterAsync(u => u.Id == userId);
            if (usuario == null)
            {
                return NotFound("Usuário não encontrado.");
            }

            var emprestimos = await _uow.EmprestimoRepository.ObterTodosAsync(e => e.SolicitanteId == usuario.Id);
            if (!emprestimos.Any())
            {
                return NotFound("Nenhum empréstimo solicitado encontrado para este usuário.");
            }

            return Ok(_mapper.Map<IEnumerable<EmprestimoDTO>>(emprestimos));
        }

        [HttpGet("aprovados/{userId}")]
        [Authorize]
        public async Task<IActionResult> ObterEmprestimosAprovadosUsuario(int userId)
        {
            var usuario = await _uow.UsuarioRepository.ObterAsync(u => u.Id == userId);
            if (usuario == null)
            {
                return NotFound("Usuário não encontrado.");
            }

            var emprestimos = await _uow.EmprestimoRepository.ObterTodosAsync(e => e.AprovadorId == usuario.Id);
            if (!emprestimos.Any())
            {
                return NotFound("Nenhum empréstimo aprovado encontrado para este usuário.");
            }

            return Ok(_mapper.Map<IEnumerable<EmprestimoDTO>>(emprestimos));
        }

        [HttpGet("{emprestimoId}")]
        [Authorize]
        public async Task<IActionResult> ObterEmprestimobyId(int emprestimoId)
        {
            var emprestimo = await _uow.EmprestimoRepository.ObterAsync(e => e.Id == emprestimoId);

            if (emprestimo == null)
            {
                return NotFound("Empréstimo não encontrado.");
            }

            return Ok(_mapper.Map<EmprestimoDTO>(emprestimo));

        }

        [HttpGet]
        [Authorize]
        public async Task<IActionResult> ObterTodosEmprestimosAsync()
        {
            var emprestimos = await _uow.EmprestimoRepository.ObterTodosAsync(e => true);

            if (!emprestimos.Any())
            {
                return NotFound("Nenhum empréstimo encontrado");
            }

            return Ok(emprestimos);
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> Adicionar([FromBody] AddEmprestimoDTO emprestimoDto)
        {
            if (emprestimoDto == null || emprestimoDto.Produtos == null || emprestimoDto.Produtos.Count == 0)
            {
                return BadRequest("Dados inválidos. Certifique-se de fornecer os produtos e informações do empréstimo.");
            }

            var emprestimo = _mapper.Map<Emprestimo>(emprestimoDto);

            var novoEmprestimo = _uow.EmprestimoRepository.Criar(emprestimo);
            await _uow.CommitAsync();

            return CreatedAtAction(nameof(ObterEmprestimosUsuario), new { userId = novoEmprestimo.SolicitanteId }, novoEmprestimo);

        }

        [HttpPatch("aprovar/{emprestimoId}")]
        [Authorize("ApenasResponsaveis")]
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

            var userId = int.Parse(userIdClaim.Value);

            // Buscar o empréstimo pelo ID
            var emprestimo = await _uow.EmprestimoRepository.ObterAsync(e => e.Id == emprestimoId);
            if (emprestimo == null)
            {
                return NotFound("Empréstimo não encontrado.");
            }

            // Buscar o solicitante do empréstimo
            var solicitante = await _uow.UsuarioRepository.ObterAsync(u => u.Id == emprestimo.SolicitanteId);
            if (solicitante == null)
            {
                return NotFound("Solicitante do empréstimo não encontrado.");
            }

            if (solicitante.ResponsavelId != userId)
            {
                return Unauthorized("Você não tem permissão para reprovar este empréstimo.");
            }

            // Verificar se o empréstimo já foi aprovado ou rejeitado
            if (emprestimo.Status != StatusEmprestimo.Pendente)
            {
                return BadRequest("Este empréstimo já foi processado (aprovado ou rejeitado).");
            }

            // Reduzir a quantidade dos produtos
            foreach (var item in emprestimo.Produtos)
            {
                var produto = await _uow.ProdutoRepository.ObterAsync(p => p.Id == item.ProdutoId);
                if (produto == null)
                {
                    return NotFound($"Produto com ID {item.ProdutoId} não encontrado.");
                }

                if (produto.Quantidade < item.Quantidade)
                {
                    return BadRequest($"O produto {produto.NomeProduto} não tem estoque suficiente para este empréstimo.");
                }

                produto.Quantidade -= item.Quantidade;

                if (!(produto.DataValidade < DateTime.UtcNow.Date))
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

                _uow.ProdutoRepository.Atualizar(produto);
                await _uow.CommitAsync();
            }

            // Atualizar o status do empréstimo para aprovado
            emprestimo.Status = StatusEmprestimo.Aprovado;
            emprestimo.DataAprovacao = DateTime.UtcNow;
            emprestimo.AprovadorId = userId;

            // Salvar as mudanças no banco de dados
            _uow.EmprestimoRepository.Atualizar(emprestimo);
            await _uow.CommitAsync();

            var emprestimoDTO = _mapper.Map<EmprestimoDTO>(emprestimo);

            // Retornar resposta de sucesso
            return Ok(new { Message = "Empréstimo aprovado com sucesso.", Emprestimo = emprestimoDTO });
        }

        [HttpPatch("reprovar/{emprestimoId}")]
        [Authorize("ApenasResponsaveis")]
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
            var emprestimo = await _uow.EmprestimoRepository.ObterAsync(e => e.Id == emprestimoId);
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
            var solicitante = await _uow.UsuarioRepository.ObterAsync(u => u.Id == emprestimo.SolicitanteId);
            if (solicitante == null)
            {
                return NotFound("Solicitante do empréstimo não encontrado.");
            }

            if (solicitante.ResponsavelId != userId)
            {
                return Unauthorized("Você não tem permissão para reprovar este empréstimo.");
            }

            // Atualizar o status do empréstimo para aprovado
            emprestimo.Status = StatusEmprestimo.Rejeitado;

            // Salvar as mudanças no banco de dados
            _uow.EmprestimoRepository.Atualizar(emprestimo);
            await _uow.CommitAsync();

            var emprestimoDTO = _mapper.Map<EmprestimoDTO>(emprestimo);

            // Retornar resposta de sucesso
            return Ok(new { Message = "Empréstimo reprovado com sucesso.", Emprestimo = emprestimoDTO });
        }
    }
}