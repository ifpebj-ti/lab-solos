using AutoMapper;
using LabSolos_Server_DotNet8.DTOs.Produtos;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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
        public async Task<IActionResult> ObterProdutosPeloTipo(int tipoProduto)
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

            var produtos = await _uow.ProdutoRepository.ObterTodosAsync(p => p.Tipo == (TipoProduto)tipoProduto, query => query.Include(c => c.Lote));

            // Mapeamento baseado no tipo do produto
            return (TipoProduto)tipoProduto switch
            {
                TipoProduto.Quimico => Ok(_mapper.Map<IEnumerable<QuimicoDTO>>(produtos)),
                TipoProduto.Vidraria => Ok(_mapper.Map<IEnumerable<VidrariaDTO>>(produtos)),
                _ => Ok(_mapper.Map<IEnumerable<ProdutoDTO>>(produtos)),
            };
        }

        [HttpGet()]
        public async Task<ActionResult<Produto>> ObterTodos()
        {
            var produtos = await _uow.ProdutoRepository.ObterTodosAsync(p => true, query => query.Include(c => c.Lote));
            return Ok(_mapper.Map<IEnumerable<ProdutoDTO>>(produtos));
        }

        [HttpGet("emAlerta")]
        public async Task<ActionResult<Produto>> ObterProdutosEmAlerta()
        {
            var produtos = await _uow.ProdutoRepository.ObterTodosAsync(p => p.Quantidade <= p.QuantidadeMinima || p.DataValidade <= DateTime.UtcNow.AddDays(10), query => query.Include(c => c.Lote));
            return Ok(_mapper.Map<IEnumerable<ProdutoDTO>>(produtos));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Produto>> ObterPeloId(int id)
        {
            var produto = await _uow.ProdutoRepository.ObterAsync(p => p.Id == id, query => query.Include(c => c.Lote));
            if (produto == null)
            {
                return NotFound();
            }

            // Mapeamento baseado no tipo do produto
            return produto.Tipo switch
            {
                TipoProduto.Quimico => Ok(_mapper.Map<QuimicoDTO>(produto)),
                TipoProduto.Vidraria => Ok(_mapper.Map<VidrariaDTO>(produto)),
                _ => Ok(_mapper.Map<ProdutoDTO>(produto)),
            };
        }

        [HttpPost]
        public async Task<ActionResult> Adicionar(AddProdutoDTO addProdutoDTO)
        {
            // Validar os dados do usuário através do serviço
            var resultadoValidacao = _produtoService.ValidarEstruturaProduto(addProdutoDTO);
            if (!resultadoValidacao.Validado)
            {
                return BadRequest(new { Message = resultadoValidacao.Mensagem });
            }

            TipoProduto tipoProduto;

            try
            {
                tipoProduto = _utilsService.ValidarEnum<TipoProduto>(addProdutoDTO.Tipo, "Tipo", TipoProduto.Outro);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { Message = ex.Message });
            }

            Produto produto = tipoProduto switch
            {
                TipoProduto.Quimico => _mapper.Map<Quimico>(addProdutoDTO),
                TipoProduto.Vidraria => _mapper.Map<Vidraria>(addProdutoDTO),
                _ => _mapper.Map<Produto>(addProdutoDTO)
            };

            _uow.ProdutoRepository.Criar(produto);
            await _uow.CommitAsync();

            return CreatedAtAction(nameof(ObterPeloId), new { id = produto.Id }, produto);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult> Atualizar(int id, UpdateProdutoDTO produtoDto)
        {
            if (id != produtoDto.Id)
            {
                return BadRequest("O ID do produto não corresponde.");
            }

            // Buscar o produto existente do banco
            var produtoExistente = await _uow.ProdutoRepository.ObterAsync(p => p.Id == id, query => query.Include(c => c.Lote));
            if (produtoExistente == null)
            {
                return NotFound("Produto não encontrado.");
            }

            var produto = _mapper.Map<Produto>(produtoDto);

            // Manter o mesmo ID da entidade existente (por segurança, caso o mapper não mantenha)
            produto.Id = id;

            _uow.ProdutoRepository.Atualizar(produto);
            await _uow.CommitAsync();

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> Remover(int id)
        {
            var produto = await _uow.ProdutoRepository.ObterAsync(p => p.Id == id, query => query.Include(c => c.Lote));

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
