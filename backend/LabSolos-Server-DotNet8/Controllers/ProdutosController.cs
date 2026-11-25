using AutoMapper;
using System.Globalization;
using LabSolos_Server_DotNet8.DTOs.Produtos;
using LabSolos_Server_DotNet8.DTOs.Paginacao;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.JsonPatch;
using Microsoft.AspNetCore.JsonPatch.Operations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json.Linq;

namespace LabSolos_Server_DotNet8.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProdutosController : ControllerBase
    {
        private const string HistoryReadFailureMessage =
            "Erro interno do servidor. Tente novamente mais tarde.";
        private readonly IProdutoService _produtoService;
        private readonly IUtilitiesService _utilsService;
        private readonly ILogger<ProdutosController> _logger;
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;
        private readonly IProdutoRepository _productRepository;
        private static readonly Action<ILogger, int, Exception?> LogHistoryReadFailure =
            LoggerMessage.Define<int>(
                LogLevel.Error,
                new EventId(1001, nameof(LogHistoryReadFailure)),
                "Falha operacional ao obter histórico de saída do produto {ProdutoId}.");
        private static readonly Action<ILogger, Exception?> LogHistoryNotFound =
            LoggerMessage.Define(
                LogLevel.Warning,
                new EventId(1002, nameof(LogHistoryNotFound)),
                "Histórico não encontrado para o recurso solicitado.");
        private static readonly Action<ILogger, int, Exception?> LogHistoryReadSucceeded =
            LoggerMessage.Define<int>(
                LogLevel.Information,
                new EventId(1003, nameof(LogHistoryReadSucceeded)),
                "Histórico de saída autorizado obtido com sucesso para o produto {ProdutoId}.");
        private static readonly Action<ILogger, TipoProduto, Exception?> LogProductsByTypeStarted =
            LoggerMessage.Define<TipoProduto>(
                LogLevel.Information,
                new EventId(1004, nameof(LogProductsByTypeStarted)),
                "Iniciando operação para obter produtos do tipo {Tipo}.");
        private static readonly Action<ILogger, int, Exception?> LogInvalidProductType =
            LoggerMessage.Define<int>(
                LogLevel.Warning,
                new EventId(1005, nameof(LogInvalidProductType)),
                "Tipo de produto inválido: {Tipo}");
        private static readonly Action<ILogger, int, Exception?> LogHistoryReadStarted =
            LoggerMessage.Define<int>(
                LogLevel.Information,
                new EventId(1006, nameof(LogHistoryReadStarted)),
                "Iniciando operação para obter histórico de saída do produto {ProdutoId}.");

        public ProdutosController(
            IProdutoService produtoService,
            IUtilitiesService utilsService,
            ILogger<ProdutosController> logger,
            IUnitOfWork uow,
            IMapper mapper,
            IProdutoRepository productRepository)
        {
            _produtoService = produtoService;
            _utilsService = utilsService;
            _logger = logger;
            _uow = uow;
            _mapper = mapper;
            _productRepository = productRepository;
        }

        [HttpGet("tipo/{tipoProduto}")]
        [Authorize]
        public async Task<IActionResult> ObterProdutosPeloTipo(
            int tipoProduto,
            [FromQuery] string? pagina,
            [FromQuery] string? tamanhoPagina)
        {
            LogProductsByTypeStarted(_logger, (TipoProduto)tipoProduto, null);

            // Validação do tipo com o enum
            if (!Enum.IsDefined(typeof(TipoProduto), tipoProduto))
            {
                LogInvalidProductType(_logger, tipoProduto, null);
                return BadRequest("Tipo de produto inválido. Use um valor de TipoProduto válido.");
            }

            if (!ParametrosPaginacao.TentarCriar(pagina, tamanhoPagina, out var parametros, out var campoInvalido))
            {
                return PaginationInvalid(campoInvalido);
            }

            var produtos = await _productRepository.GetPaginadoAsync(
                p => p.Tipo == (TipoProduto)tipoProduto && !p.Desativado,
                parametros,
                HttpContext.RequestAborted);

            // Mapeamento baseado no tipo do produto
            return Ok(produtos.Projetar<object>(produto => (TipoProduto)tipoProduto switch
            {
                TipoProduto.Quimico => _mapper.Map<QuimicoDTO>(produto),
                TipoProduto.Vidraria => _mapper.Map<VidrariaDTO>(produto),
                _ => _mapper.Map<ProdutoDTO>(produto),
            }));
        }

        [HttpGet()]
        [Authorize]
        public async Task<ActionResult<ResultadoPaginado<ProdutoDTO>>> ObterTodos(
            [FromQuery] string? pagina,
            [FromQuery] string? tamanhoPagina)
        {
            if (!ParametrosPaginacao.TentarCriar(pagina, tamanhoPagina, out var parametros, out var campoInvalido))
            {
                return PaginationInvalid(campoInvalido);
            }

            var produtos = await _productRepository.GetPaginadoAsync(
                product => !product.Desativado,
                parametros,
                HttpContext.RequestAborted);
            return Ok(produtos.Projetar<ProdutoDTO>(produto => _mapper.Map<ProdutoDTO>(produto)));
        }

        [HttpGet("catalogo-administrativo")]
        [Authorize("ApenasAdministradores")]
        public async Task<ActionResult<ResultadoPaginado<ProdutoAlertaDTO>>> ObterCatalogoAdministrativo(
            [FromServices] ProductCivilDay civilDay,
            [FromQuery] string? pagina,
            [FromQuery] string? tamanhoPagina)
        {
            if (!ParametrosPaginacao.TentarCriar(pagina, tamanhoPagina, out var parametros, out var campoInvalido))
            {
                return PaginationInvalid(campoInvalido);
            }

            var hojeCivil = civilDay.GetToday();
            var produtos = await _productRepository.GetPaginadoAsync(
                product => !product.Desativado,
                parametros,
                HttpContext.RequestAborted);
            return Ok(produtos.Projetar(produto => ProjetarAlerta(produto, hojeCivil)));
        }

        [HttpGet("emAlerta")]
        [Authorize("ApenasAdministradores")]
        public async Task<ActionResult<Produto>> ObterProdutosEmAlerta(
            [FromServices] ProductCivilDay civilDay)
        {
            var produtos = await _productRepository.GetProdutosEmAlertaAsync(
                civilDay.GetToday(), HttpContext.RequestAborted);
            return Ok(_mapper.Map<IEnumerable<ProdutoDTO>>(produtos));
        }

        private ProdutoAlertaDTO ProjetarAlerta(Produto produto, DateOnly hojeCivil)
        {
            var projection = _mapper.Map<ProdutoAlertaDTO>(produto);
            projection.CapacidadeMl = (produto as Vidraria)?.Capacidade;
            projection.MotivosAlerta = _produtoService.CalcularMotivosAlerta(produto, hojeCivil);
            return projection;
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
                if (resultadoValidacao.ErrosPorCampo is { } errosPorCampo)
                {
                    return ValidationProblem(new ValidationProblemDetails(errosPorCampo)
                    {
                        Title = resultadoValidacao.Mensagem,
                        Status = StatusCodes.Status400BadRequest
                    });
                }

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

            var confirmacaoValidade = _produtoService.AvaliarConfirmacaoValidade(addProdutoDTO);
            if (confirmacaoValidade is not null)
            {
                var problema = new ProblemDetails
                {
                    Status = StatusCodes.Status409Conflict,
                    Title = "Confirme o cadastro do químico vencido.",
                    Detail = "Confirme a data de validade informada para continuar com o cadastro."
                };
                problema.Extensions["code"] = "product_expiration_confirmation_required";
                problema.Extensions["dataValidade"] = confirmacaoValidade.DataValidade
                    .ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
                problema.Extensions["diaCivil"] = confirmacaoValidade.DiaCivil
                    .ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
                return Conflict(problema);
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
        public async Task<ActionResult> Atualizar(int id, JObject produtoDto)
        {
            if (produtoDto.TryGetValue("id", StringComparison.OrdinalIgnoreCase, out var suppliedId)
                && (suppliedId.Type != JTokenType.Integer
                    || !int.TryParse(suppliedId.ToString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var bodyId)
                    || bodyId != id))
                return PatchValidation("id", "product_patch_invalid", "O ID do produto não corresponde.");

            var patch = new JsonPatchDocument<ProdutoDTOPatchRequest>();
            JToken? legacyCatmat = null;
            foreach (var property in produtoDto.Properties().Where(property =>
                !property.Name.Equals("id", StringComparison.OrdinalIgnoreCase)))
            {
                if (property.Name.Equals("catmat", StringComparison.OrdinalIgnoreCase))
                {
                    legacyCatmat = property.Value;
                    continue;
                }

                patch.Operations.Add(new Operation<ProdutoDTOPatchRequest>(
                    "replace", "/" + property.Name, null, property.Value));
            }

            var result = await ApplyExplicitPatchAsync(id, patch, legacyCatmat);
            return result.Result is OkObjectResult ? NoContent() : result.Result!;
        }
        [HttpDelete("{id}")]
        [Authorize("ApenasAdministradores")]
        public async Task<ActionResult> Remover(
            int id,
            [FromServices] IProductLifecycleService lifecycleService)
        {
            var result = await lifecycleService.DeleteAsync(id, HttpContext.RequestAborted);
            return LifecycleResponse(result);
        }

        [HttpPost("{id}/desativar")]
        [Authorize("ApenasAdministradores")]
        public async Task<ActionResult> Desativar(
            int id,
            [FromServices] IProductLifecycleService lifecycleService)
        {
            var result = await lifecycleService.DeactivateAsync(id, HttpContext.RequestAborted);
            return LifecycleResponse(result);
        }

        [HttpPost("{id}/reativar")]
        [Authorize("ApenasAdministradores")]
        public async Task<ActionResult> Reativar(
            int id,
            [FromServices] IProductLifecycleService lifecycleService)
        {
            var result = await lifecycleService.ReactivateAsync(id, HttpContext.RequestAborted);
            return LifecycleResponse(result);
        }

        private ActionResult LifecycleResponse(ProductLifecycleResult result)
        {
            if (result.Succeeded)
            {
                return NoContent();
            }

            if (result.ProductNotFound)
            {
                return NotFound();
            }

            return Conflict(new ProblemDetails
            {
                Type = "about:blank",
                Title = "A operação de ciclo de vida do produto não pôde ser concluída.",
                Status = StatusCodes.Status409Conflict,
                Extensions = { ["code"] = result.ConflictCode }
            });
        }

        [HttpGet("{id}/historico-saida")]
        [Authorize]
        public async Task<IActionResult> ObterHistoricoSaidaProduto(int id)
        {
            LogHistoryReadStarted(_logger, id, null);

            try
            {
                var historico = await _produtoService.ObterHistoricoSaidaProdutoAsync(
                    id,
                    User,
                    HttpContext.RequestAborted);

                if (historico == null)
                {
                    LogHistoryNotFound(_logger, null);
                    return NotFound();
                }

                LogHistoryReadSucceeded(_logger, id, null);

                return Ok(historico);
            }
            catch (InvalidOperationException ex)
            {
                return HistoryReadFailureResponse(id, ex);
            }
        }

        private ObjectResult HistoryReadFailureResponse(int productId, InvalidOperationException exception)
        {
            LogHistoryReadFailure(_logger, productId, exception);
            return StatusCode(StatusCodes.Status500InternalServerError, HistoryReadFailureMessage);
        }

        [HttpPatch("{id}")]
        [Authorize("ApenasAdministradores")]
        public Task<ActionResult<ProdutoDTOPatchResponse>> AtualizarParcialmente(
            int id, JsonPatchDocument<ProdutoDTOPatchRequest> patchProdutoDto) =>
            ApplyExplicitPatchAsync(id, patchProdutoDto);

        private async Task<ActionResult<ProdutoDTOPatchResponse>> ApplyExplicitPatchAsync(
            int id, JsonPatchDocument<ProdutoDTOPatchRequest>? patch, JToken? legacyCatmat = null)
        {
            if (patch is null)
                return PatchValidation("operations", "product_patch_invalid", "Informe um documento de alterações.");

            var paths = new HashSet<string>(StringComparer.Ordinal);
            foreach (var operation in patch.Operations)
            {
                if (operation is null)
                    return PatchValidation("operations", "product_patch_operation_invalid", "Informe uma operação válida.");
                var path = operation.path?.ToLowerInvariant() ?? string.Empty;
                if (!ProdutoService.CampoEditavel(path))
                    return PatchValidation(ProdutoService.CampoDeErro(path), "product_patch_field_forbidden",
                        "Este campo não pode ser alterado por esta operação.");
                if (operation.op is not ("replace" or "remove") || operation.from is not null
                    || operation.op == "remove" && !ProdutoService.CampoRemovivel(path))
                    return PatchValidation(ProdutoService.CampoDeErro(path), "product_patch_operation_invalid",
                        "Operação não permitida para este campo.");
                paths.Add(path);
            }

            var cancellationToken = HttpContext.RequestAborted;
            await using var transaction = await _uow.BeginTransactionAsync(cancellationToken);
            await _productRepository.LockForLoanDecisionAsync([id], cancellationToken);
            var product = await _productRepository.GetByIdAsync(id);
            if (product is null)
                return NotFound("Produto não encontrado.");

            if (legacyCatmat is not null
                && !JToken.DeepEquals(legacyCatmat, product.Catmat is null
                    ? JValue.CreateNull()
                    : new JValue(product.Catmat)))
                return PatchValidation("catmat", "product_patch_field_forbidden",
                    "O CATMAT histórico deve ser preservado.");

            var candidate = _mapper.Map<ProdutoDTOPatchRequest>(product);
            var errors = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase);
            patch.ApplyTo(candidate, error =>
                errors[ProdutoService.CampoDeErro(error.Operation.path.ToLowerInvariant())] =
                    ["Informe um valor compatível com este campo."]);
            if (errors.Count == 0)
                errors = ProdutoService.ValidarAlteracoesExplicitas(candidate, paths);
            if (errors.Count > 0)
                return BadRequest(new ValidationProblemDetails(errors)
                {
                    Title = "Há alterações inválidas no produto.",
                    Status = StatusCodes.Status400BadRequest,
                    Extensions = { ["code"] = "product_patch_invalid" }
                });

            if (paths.Count > 0)
            {
                ProdutoService.AplicarAlteracoesExplicitas(product, candidate, paths);
                product.UltimaModificacao = DateTime.UtcNow;
                await _uow.CommitAsync();
            }
            await transaction.CommitAsync(cancellationToken);
            return Ok(_mapper.Map<ProdutoDTOPatchResponse>(product));
        }

        private static BadRequestObjectResult PatchValidation(string field, string code, string message) =>
            new(new ValidationProblemDetails(new Dictionary<string, string[]>
            {
                [field] = [message]
            })
            {
                Title = "Há alterações inválidas no produto.",
                Status = StatusCodes.Status400BadRequest,
                Extensions = { ["code"] = code }
            })
            {
                ContentTypes = { "application/problem+json" }
            };

        private BadRequestObjectResult PaginationInvalid(string parameter)
        {
            var problem = new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Os parâmetros da paginação são inválidos.",
                Detail = "Informe uma página positiva e um tamanho de 1 a 100 sem ultrapassar o deslocamento aceito."
            };
            problem.Extensions["code"] = "pagination_invalid";
            problem.Extensions["errors"] = new Dictionary<string, string[]>
            {
                [parameter] = ["Verifique o valor informado."]
            };
            return BadRequest(problem);
        }
    }
}
