using LabSolos_Server_DotNet8.DTOs.Produtos;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Mvc;

namespace LabSolos_Server_DotNet8.Controllers
{
    [ApiController]
    //[Authorize]
    [Route("api/[controller]")]
    public class ProdutosController(IProdutoService produtoService, IUtilitiesService utilsService, ILogger<ProdutosController> logger) : ControllerBase
    {
        private readonly IProdutoService _produtoService = produtoService;
        private readonly IUtilitiesService _utilsService = utilsService;

        private readonly ILogger<ProdutosController> _logger = logger;

        [HttpGet("tipo/{tipoProduto}")]
        public async Task<IActionResult> GetProdutoByTipo(int tipoProduto)
        {
            _logger.LogInformation(
                "Iniciando operação para obter produtos do tipo {Tipo}.",
                (TipoProduto)tipoProduto
            );

            // Validação do tipo com o enum
            if (!Enum.IsDefined(typeof(TipoProduto), tipoProduto))
            {
                _logger.LogWarning("Tipo de produto inválido: {Tipo}", tipoProduto);
                return BadRequest("Tipo de produto inválido. Use um valor de TipoProduto válido.");
            }

            var tipoEnum = (TipoProduto)tipoProduto;

            var produtos = await _produtoService.GetProdutosByTipoAsync(tipoEnum);
            return Ok(produtos);
        }

        [HttpGet()]
        public async Task<ActionResult<Produto>> GetAll()
        {
            var produtos = await _produtoService.GetAllAsync();
            return Ok(produtos);
        }

        [HttpGet("emAlerta")]
        public async Task<ActionResult<Produto>> GetProdutosEmAlerta()
        {
            var produtos = await _produtoService.GetProdutosEmAlerta();
            return Ok(produtos);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Produto>> GetById(int id)
        {
            var produto = await _produtoService.GetByIdAsync(id);
            if (produto == null)
            {
                return NotFound();
            }
            return Ok(produto);
        }

        [HttpPost]
        public async Task<ActionResult> Add(AddProdutoDTO produtoDTO)
        {
            // Validar os dados do usuário através do serviço
            var resultadoValidacao = _produtoService.ValidarEstruturaLote(produtoDTO);
            if (!resultadoValidacao.Validado)
            {
                return BadRequest(new { Message = resultadoValidacao.Mensagem });
            }
            var produto = _produtoService.ObterEstruturaProdutoPeloTipo(produtoDTO);
            produto.UltimaModificacao = DateTime.Now;

            await _produtoService.AddAsync(produto);
            return CreatedAtAction(nameof(GetById), new { id = produto.Id }, produto);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult> Update(int id, Produto produto)
        {
            if (id != produto.Id)
            {
                return BadRequest("O ID do produto não corresponde.");
            }

            await _produtoService.UpdateAsync(produto);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(int id)
        {
            await _produtoService.DeleteAsync(id);
            return NoContent();
        }
    }
}
