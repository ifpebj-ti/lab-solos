using AutoMapper;
using LabSolos_Server_DotNet8.DTOs.Produtos;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Mvc;

namespace LabSolos_Server_DotNet8.Controllers
{
    [ApiController]
    //[Authorize]
    [Route("api/[controller]")]
    public class ProdutosController : ControllerBase
    {
        private readonly IProdutoService _produtoService;
        private readonly IUtilitiesService _utilsService;
        private readonly ILogger<ProdutosController> _logger;
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;

        public ProdutosController(
            IProdutoService produtoService,
            IUtilitiesService utilsService,
            ILogger<ProdutosController> logger,
            IUnitOfWork uow,
            IMapper mapper)
        {
            _produtoService = produtoService;
            _utilsService = utilsService;
            _logger = logger;
            _uow = uow;
            _mapper = mapper;
        }

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

            var produtos = await _uow.ProdutoRepository.ObterTodosAsync(p => p.Tipo == (TipoProduto)tipoProduto);
            return Ok(_mapper.Map<IEnumerable<ProdutoDTO>>(produtos));
        }

        [HttpGet()]
        public async Task<ActionResult<Produto>> GetAll()
        {
            var produtos = await _uow.ProdutoRepository.ObterTodosAsync(p => true);
            return Ok(_mapper.Map<IEnumerable<ProdutoDTO>>(produtos));
        }

        [HttpGet("emAlerta")]
        public async Task<ActionResult<Produto>> GetProdutosEmAlerta()
        {
            var produtos = await _uow.ProdutoRepository.ObterTodosAsync(p => p.Quantidade <= p.QuantidadeMinima || p.DataValidade <= DateTime.Now.AddDays(10));
            return Ok(_mapper.Map<IEnumerable<ProdutoDTO>>(produtos));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Produto>> GetById(int id)
        {
            var produto = await _uow.ProdutoRepository.ObterTodosAsync(p => p.Id == id);
            if (produto == null)
            {
                return NotFound();
            }
            return Ok(_mapper.Map<ProdutoDTO>(produto));
        }

        [HttpPost]
        public async Task<ActionResult> Add(AddProdutoDTO addProdutoDTO)
        {
            // Validar os dados do usuário através do serviço
            var resultadoValidacao = _produtoService.ValidarEstruturaProduto(addProdutoDTO);
            if (!resultadoValidacao.Validado)
            {
                return BadRequest(new { Message = resultadoValidacao.Mensagem });
            }
            var produto = _mapper.Map<Produto>(addProdutoDTO);

            _uow.ProdutoRepository.Criar(produto);
            await _uow.CommitAsync();

            return CreatedAtAction(nameof(GetById), new { id = produto.Id }, produto);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult> Update(int id, ProdutoDTO produtoDto)
        {
            if (id != produtoDto.Id)
            {
                return BadRequest("O ID do produto não corresponde.");
            }

            var produto = _mapper.Map<Produto>(produtoDto);

            _uow.ProdutoRepository.Atualizar(produto);
            await _uow.CommitAsync();

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(int id)
        {
            var produto = await _uow.ProdutoRepository.ObterAsync(p => p.Id == id);

            if (produto == null)
            {
                return NotFound();
            }

            _uow.ProdutoRepository.Remover(produto);
            await _uow.CommitAsync();
            
            return NoContent();
        }
    }
}
