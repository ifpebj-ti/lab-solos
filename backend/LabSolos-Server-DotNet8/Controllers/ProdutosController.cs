using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Mvc;

namespace LabSolos_Server_DotNet8.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProdutoController(IProdutoService produtoService, ILogger<ProdutoController> logger) : ControllerBase
    {
        private readonly IProdutoService _produtoService = produtoService;
        private readonly ILogger<ProdutoController> _logger = logger;


        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int tipoProduto)
        {
            _logger.LogInformation("Iniciando operação para obter produtos do tipo {Tipo}.", (TipoProduto)tipoProduto);

            // Validação do tipo com o enum
            if (!Enum.IsDefined(typeof(TipoProduto), tipoProduto))
            {
                _logger.LogWarning("Tipo de produto inválido: {Tipo}", tipoProduto);
                return BadRequest("Tipo de produto inválido. Use um valor de TipoProduto válido.");
            }

            var tipoEnum = (TipoProduto)tipoProduto;

            try
            {
                var produtos = await _produtoService.GetProdutosByTipoAsync(tipoEnum);
                return Ok(produtos);
            }
            catch (NotImplementedException ex)
            {
                _logger.LogWarning("Erro na obtenção de produtos: {Message}", ex.Message);
                return BadRequest(ex.Message);
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
