using System.Collections.Generic;
using System.Threading.Tasks;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Mvc;

namespace LabSolos_Server_DotNet8.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProdutoController : ControllerBase
    {
        private readonly IProdutoService _produtoService;

        public ProdutoController(IProdutoService produtoService)
        {
            _produtoService = produtoService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Produto>>> GetAll()
        {
            try
            {
                var produtos = await _produtoService.GetAllAsync();
                return Ok(produtos);
            }
            catch (Exception)
            {
                // Log da exceção (ex) pode ser adicionado aqui
                return StatusCode(500, "Erro ao obter os produtos.");
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Produto>> GetById(int id)
        {
            try
            {
                var produto = await _produtoService.GetByIdAsync(id);
                if (produto == null)
                {
                    return NotFound();
                }
                return Ok(produto);
            }
            catch (Exception)
            {
                // Log da exceção (ex) pode ser adicionado aqui
                return StatusCode(500, "Erro ao obter o produto.");
            }
        }

        [HttpPost]
        public async Task<ActionResult> Add(Produto produto)
        {
            try
            {
                await _produtoService.AddAsync(produto);
                return CreatedAtAction(nameof(GetById), new { id = produto.Id }, produto);
            }
            catch (Exception)
            {
                // Log da exceção (ex) pode ser adicionado aqui
                return StatusCode(500, "Erro ao adicionar o produto.");
            }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult> Update(int id, Produto produto)
        {
            if (id != produto.Id)
            {
                return BadRequest("O ID do produto não corresponde.");
            }

            try
            {
                await _produtoService.UpdateAsync(produto);
                return NoContent();
            }
            catch (Exception)
            {
                // Log da exceção (ex) pode ser adicionado aqui
                return StatusCode(500, "Erro ao atualizar o produto.");
            }
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(int id)
        {
            try
            {
                await _produtoService.DeleteAsync(id);
                return NoContent();
            }
            catch (Exception)
            {
                // Log da exceção (ex) pode ser adicionado aqui
                return StatusCode(500, "Erro ao deletar o produto.");
            }
        }
    }
}
