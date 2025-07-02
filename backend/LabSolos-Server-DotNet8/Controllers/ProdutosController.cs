using AutoMapper;
using LabSolos_Server_DotNet8.DTOs.Produtos;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.JsonPatch;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LabSolos_Server_DotNet8.Controllers
{
    [ApiController]
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
        [Authorize]
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
        [Authorize]
        public async Task<ActionResult<Produto>> ObterTodos()
        {
            var produtos = await _uow.ProdutoRepository.ObterTodosAsync(p => true, query => query.Include(p => p.Lote));
            return Ok(_mapper.Map<IEnumerable<ProdutoDTO>>(produtos));
        }

        [HttpGet("emAlerta")]
        [Authorize("ApenasAdministradores")]
        public async Task<ActionResult<Produto>> ObterProdutosEmAlerta()
        {
            var produtos = await _uow.ProdutoRepository.ObterTodosAsync(p => p.Quantidade <= p.QuantidadeMinima || p.DataValidade <= DateTime.UtcNow.AddDays(10), query => query.Include(c => c.Lote));
            return Ok(_mapper.Map<IEnumerable<ProdutoDTO>>(produtos));
        }

        [HttpGet("{id}")]
        [Authorize]
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
        [Authorize("ApenasAdministradores")]
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
        [Authorize("ApenasAdministradores")]
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
        [Authorize("ApenasAdministradores")]
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

        [HttpGet("{id}/historico-saida")]
        [Authorize]
        public async Task<IActionResult> ObterHistoricoSaidaProduto(int id)
        {
            _logger.LogInformation("Iniciando operação para obter histórico de saída do produto {ProdutoId}.", id);

            try
            {
                var historico = await _produtoService.ObterHistoricoSaidaProdutoAsync(id);

                if (historico == null)
                {
                    _logger.LogWarning("Produto com ID {ProdutoId} não encontrado", id);
                    return NotFound($"Produto com ID {id} não encontrado.");
                }

                _logger.LogInformation(
                    "Histórico de saída do produto {ProdutoId} obtido com sucesso. Total de empréstimos: {TotalEmprestimos}",
                    id, historico.TotalEmprestimos);

                return Ok(historico);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro inesperado ao obter histórico de saída do produto {ProdutoId}", id);
                return StatusCode(500, "Erro interno do servidor. Tente novamente mais tarde.");
            }
        }

        [HttpPatch("{id}")]
        [Authorize("ApenasAdministradores")]
        public async Task<ActionResult<ProdutoDTOPatchResponse>> AtualizarParcialmente(int id, JsonPatchDocument<ProdutoDTOPatchRequest> patchProdutoDto)
        {
            _logger.LogInformation("Iniciando operação para atualizar parcialmente produto {ProdutoId}.", id);

            if (patchProdutoDto is null)
            {
                _logger.LogWarning("Documento de patch nulo fornecido para produto {ProdutoId}", id);
                return BadRequest("Documento de patch não pode ser nulo.");
            }

            // Obter o produto pelo ID
            var produto = await _uow.ProdutoRepository.ObterAsync(p => p.Id == id);

            if (produto == null)
            {
                _logger.LogWarning("Produto com ID {ProdutoId} não encontrado para atualização", id);
                return NotFound("Produto não encontrado.");
            }

            // Mapear produto para ProdutoDTOPatchRequest
            var produtoPatchRequest = _mapper.Map<ProdutoDTOPatchRequest>(produto);

            // Aplicar as alterações definidas no documento JSON Patch
            patchProdutoDto.ApplyTo(produtoPatchRequest, ModelState);

            if (!ModelState.IsValid || !TryValidateModel(produtoPatchRequest))
            {
                _logger.LogWarning("Modelo inválido para atualização do produto {ProdutoId}: {Errors}",
                    id, string.Join(", ", ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage))));
                return BadRequest(ModelState);
            }

            // Validar status se estiver sendo alterado
            var isStatusPatch = patchProdutoDto.Operations.Any(op =>
                op.path.Equals("/status", StringComparison.OrdinalIgnoreCase));

            if (isStatusPatch && !string.IsNullOrEmpty(produtoPatchRequest.Status))
            {
                if (!Enum.TryParse<StatusProduto>(produtoPatchRequest.Status, out _))
                {
                    _logger.LogWarning("Status inválido fornecido para produto {ProdutoId}: {Status}", id, produtoPatchRequest.Status);
                    return BadRequest($"Status inválido. Valores válidos: {string.Join(", ", Enum.GetNames<StatusProduto>())}");
                }
            }

            // Validar datas se estiverem sendo alteradas
            var isDataFabricacaoPatch = patchProdutoDto.Operations.Any(op =>
                op.path.Equals("/dataFabricacao", StringComparison.OrdinalIgnoreCase));
            var isDataValidadePatch = patchProdutoDto.Operations.Any(op =>
                op.path.Equals("/dataValidade", StringComparison.OrdinalIgnoreCase));

            if (isDataFabricacaoPatch && !string.IsNullOrEmpty(produtoPatchRequest.DataFabricacao))
            {
                if (!DateTime.TryParse(produtoPatchRequest.DataFabricacao, out _))
                {
                    return BadRequest("Data de fabricação inválida. Use o formato YYYY-MM-DD.");
                }
            }

            if (isDataValidadePatch && !string.IsNullOrEmpty(produtoPatchRequest.DataValidade))
            {
                if (!DateTime.TryParse(produtoPatchRequest.DataValidade, out _))
                {
                    return BadRequest("Data de validade inválida. Use o formato YYYY-MM-DD.");
                }
            }

            // Mapear as alterações de volta para o produto
            _mapper.Map(produtoPatchRequest, produto);

            // Atualizar timestamp de modificação
            produto.UltimaModificacao = DateTime.UtcNow;

            _uow.ProdutoRepository.Atualizar(produto);
            await _uow.CommitAsync();

            _logger.LogInformation("Produto {ProdutoId} atualizado parcialmente com sucesso.", id);

            // Retornar o produto atualizado
            return Ok(_mapper.Map<ProdutoDTOPatchResponse>(produto));
        }
    }
}
