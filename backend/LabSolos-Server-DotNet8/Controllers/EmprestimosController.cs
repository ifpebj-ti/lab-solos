using System;
using System.Collections.Generic;
using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using AutoMapper;
using AutoMapper.QueryableExtensions;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.DTOs.Emprestimos;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LabSolos_Server_DotNet8.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EmprestimosController : ControllerBase
    {
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;
        private readonly INotificacaoService _notificacaoService;
        private readonly TimeProvider _timeProvider;
        private readonly AppDbContext? _dbContext;
        private readonly UserResourceAccessService _userResourceAccess;
        private readonly OperationAdmissionPolicy? _operationAdmissionPolicy;

        public EmprestimosController(
            IUnitOfWork uow,
            IMapper mapper,
            INotificacaoService notificacaoService,
            TimeProvider timeProvider,
            AppDbContext? dbContext = null,
            UserResourceAccessService? userResourceAccess = null,
            OperationAdmissionPolicy? operationAdmissionPolicy = null)
        {
            _uow = uow;
            _mapper = mapper;
            _notificacaoService = notificacaoService;
            _timeProvider = timeProvider;
            _dbContext = dbContext;
            _userResourceAccess = userResourceAccess ?? new UserResourceAccessService();
            _operationAdmissionPolicy = operationAdmissionPolicy;
        }

        [HttpGet("usuario/{userId}")]
        [Authorize]
        public async Task<IActionResult> ObterEmprestimosUsuario(int userId)
        {
            if (!await UsuarioVisivelAsync(userId))
            {
                return ResourceNotFound();
            }

            var emprestimos = await ProjectLoans(DbContext.Emprestimos
                    .AsNoTracking()
                    .Where(_userResourceAccess.ForLoans(User))
                    .Where(emprestimo => emprestimo.SolicitanteId == userId || emprestimo.AprovadorId == userId))
                .ToListAsync();
            return Ok(emprestimos);
        }

        [HttpGet("solicitados/{userId}")]
        [Authorize]
        public async Task<IActionResult> ObterEmprestimosSolicitadosUsuario(int userId)
        {
            if (!await UsuarioVisivelAsync(userId))
            {
                return ResourceNotFound();
            }

            var emprestimos = await ProjectLoans(DbContext.Emprestimos
                    .AsNoTracking()
                    .Where(_userResourceAccess.ForLoans(User))
                    .Where(emprestimo => emprestimo.SolicitanteId == userId))
                .ToListAsync();
            return Ok(emprestimos);
        }

        [HttpGet("aprovados/{userId}")]
        [Authorize]
        public async Task<IActionResult> ObterEmprestimosAprovadosUsuario(int userId)
        {
            if (!PodeConsultarAprovados(userId))
            {
                return ResourceNotFound();
            }

            var usuarioExiste = await DbContext.Usuarios
                .AsNoTracking()
                .AnyAsync(usuario => usuario.Id == userId);
            if (!usuarioExiste)
            {
                return ResourceNotFound();
            }

            var emprestimos = await ProjectLoans(DbContext.Emprestimos
                    .AsNoTracking()
                    .Where(_userResourceAccess.ForLoans(User))
                    .Where(emprestimo => emprestimo.AprovadorId == userId))
                .ToListAsync();
            return Ok(emprestimos);
        }

        [HttpGet("{emprestimoId}")]
        [Authorize]
        public async Task<IActionResult> ObterEmprestimoPeloId(int emprestimoId)
        {
            var emprestimo = await ProjectLoans(DbContext.Emprestimos
                    .AsNoTracking()
                    .Where(_userResourceAccess.ForLoans(User))
                    .Where(candidate => candidate.Id == emprestimoId))
                .FirstOrDefaultAsync();

            return emprestimo is null
                ? ResourceNotFound()
                : Ok(emprestimo);
        }

        [HttpGet]
        [Authorize("ApenasAdministradores")]
        public async Task<IActionResult> ObterTodosEmprestimosAsync()
        {
            var emprestimos = await ProjectLoans(DbContext.Emprestimos.AsNoTracking()).ToListAsync();
            return Ok(emprestimos);
        }

        private AppDbContext DbContext =>
            _dbContext ?? throw new InvalidOperationException("Loan read queries require the application database context.");

        private IQueryable<EmprestimoAcompanhamentoDTO> ProjectLoans(IQueryable<Emprestimo> loans) =>
            loans.ProjectTo<EmprestimoAcompanhamentoDTO>(_mapper.ConfigurationProvider);

        private Task<bool> UsuarioVisivelAsync(int userId) => DbContext.Usuarios
            .AsNoTracking()
            .Where(_userResourceAccess.ForProfiles(User))
            .AnyAsync(usuario => usuario.Id == userId);

        private bool PodeConsultarAprovados(int userId)
        {
            if (User.IsInRole(NivelUsuario.Administrador.ToString()))
            {
                return true;
            }

            var subjectValues = User.Claims
                .Where(claim => claim.Type is ClaimTypes.NameIdentifier or JwtRegisteredClaimNames.Sub)
                .Select(claim => claim.Value)
                .Distinct(StringComparer.Ordinal)
                .ToArray();
            return subjectValues.Length == 1 &&
                int.TryParse(subjectValues[0], NumberStyles.None, CultureInfo.InvariantCulture, out var subjectId) &&
                subjectId == userId;
        }

        private static NotFoundObjectResult ResourceNotFound() => new(new ProblemDetails
        {
            Type = "about:blank",
            Title = "Recurso não encontrado.",
            Status = StatusCodes.Status404NotFound
        });

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> Adicionar([FromBody] AddEmprestimoDTO emprestimoDto)
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

            var userId = int.Parse(userIdClaim.Value, CultureInfo.InvariantCulture);

            // Verificar se o usuário tem o papel de administrador
            var nivelClaim = user.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role);
            if (nivelClaim != null && nivelClaim.Value == NivelUsuario.Administrador.ToString())
            {
                return Unauthorized("Administradores não podem criar empréstimos.");
            }

            var erroEstrutura = ValidarEstruturaDosProdutos(emprestimoDto.Produtos);
            if (erroEstrutura is not null)
            {
                return erroEstrutura;
            }

            var dataSolicitacao = _timeProvider.GetUtcNow();
            var erroPrazo = LoanDomainRules.GetExpectedReturnDate(
                dataSolicitacao, emprestimoDto.DiasParaDevolucao, out var dataPrevista);
            if (erroPrazo is not null)
            {
                return ProblemaDeDominio("diasParaDevolucao", erroPrazo);
            }

            if (_operationAdmissionPolicy is not null)
            {
                var admission = await _operationAdmissionPolicy.AdmitLoanCreationAsync(
                    userId,
                    HttpContext.RequestAborted);
                if (admission.Status == OperationAdmissionStatus.RateLimited)
                    return OperationAdmissionResponses.RateLimited(Response, admission.RetryAfterSeconds);
                if (admission.Status == OperationAdmissionStatus.Unavailable)
                    return OperationAdmissionResponses.Unavailable(Response);
            }

            Emprestimo novoEmprestimo;
            await using (var transaction = await _uow.BeginTransactionAsync(HttpContext.RequestAborted))
            {
                try
                {
                    var productIds = emprestimoDto.Produtos.Select(item => item.ProdutoId).ToArray();
                    await _uow.LockProductsForMutationAsync(productIds, HttpContext.RequestAborted);
                    var erroDisponibilidade = await ValidarDisponibilidadeDosProdutosAsync(emprestimoDto.Produtos);
                    if (erroDisponibilidade is not null)
                    {
                        await transaction.RollbackAsync(HttpContext.RequestAborted);
                        return erroDisponibilidade;
                    }

                    var emprestimo = _mapper.Map<Emprestimo>(emprestimoDto);
                    emprestimo.SolicitanteId = userId;
                    emprestimo.DataRealizacao = dataSolicitacao.UtcDateTime;
                    emprestimo.DataPrevistaDevolucao = dataPrevista;
                    emprestimo.DataDevolucao = null;

                    novoEmprestimo = _uow.EmprestimoRepository.Criar(emprestimo);
                    await _uow.CommitAsync();
                    await transaction.CommitAsync(HttpContext.RequestAborted);
                }
                catch
                {
                    await transaction.RollbackAsync(CancellationToken.None);
                    throw;
                }
            }

            // Criar notificação para administradores sobre novo empréstimo
            try
            {
                await _notificacaoService.CriarNotificacaoNovoEmprestimo(novoEmprestimo.Id);
            }
            catch (DbUpdateException ex)
            {
                // Log do erro mas não falha o processo principal
                // TODO: Adicionar logging apropriado
                Console.WriteLine($"Erro ao criar notificação de empréstimo: {ex.Message}");
            }

            var emprestimoCriado = await _uow.EmprestimoRepository.ObterAsync(e => e.Id == novoEmprestimo.Id,
                query => query
                .Include(e => e.Produtos)
                .ThenInclude(p => p.Produto)
                .ThenInclude(p => p.Lote)
                .Include(e => e.Solicitante)
                .Include(e => e.Aprovador)
            );

            var emprestimoResponseDto = _mapper.Map<EmprestimoDTO>(emprestimoCriado);

            return CreatedAtAction(nameof(ObterEmprestimosUsuario), new { userId = novoEmprestimo.SolicitanteId }, emprestimoResponseDto);
        }

        private IActionResult? ValidarEstruturaDosProdutos(List<ProdutoQuantidadeDTO> produtos)
        {
            if (produtos is not { Count: > 0 })
            {
                return ProblemaNosProdutos("produtos", "Informe pelo menos um produto.");
            }

            if (produtos.Count > OperationAdmissionPolicy.MaximumLoanItems)
            {
                return ValidationProblem(new ValidationProblemDetails(new Dictionary<string, string[]>
                {
                    ["produtos"] = [$"Informe no máximo {OperationAdmissionPolicy.MaximumLoanItems} itens por solicitação."]
                })
                {
                    Title = "A solicitação excede o limite de itens.",
                    Status = StatusCodes.Status400BadRequest,
                    Extensions = { ["code"] = "loan_item_limit_exceeded" }
                });
            }

            var produtoIds = new HashSet<int>();
            for (var indice = 0; indice < produtos.Count; indice++)
            {
                var item = produtos[indice];
                if (item is null)
                {
                    return ProblemaNosProdutos($"produtos[{indice}]", "Informe os dados do produto.");
                }

                if (item.ProdutoId <= 0)
                {
                    return ProblemaNosProdutos($"produtos[{indice}].produtoId", "Informe um identificador de produto válido.");
                }

                if (!produtoIds.Add(item.ProdutoId))
                {
                    return ProblemaNosProdutos($"produtos[{indice}].produtoId", "Cada produto deve aparecer uma única vez.");
                }
            }

            return null;
        }

        private async Task<IActionResult?> ValidarDisponibilidadeDosProdutosAsync(
            List<ProdutoQuantidadeDTO> produtos)
        {
            var productIds = produtos.Select(item => item.ProdutoId).ToHashSet();
            var produtosExistentes = await _uow.ProdutoRepository.ObterTodosAsync(
                produto => productIds.Contains(produto.Id));
            var produtosPorId = produtosExistentes.ToDictionary(produto => produto.Id);
            for (var indice = 0; indice < produtos.Count; indice++)
            {
                var item = produtos[indice];
                if (!produtosPorId.TryGetValue(item.ProdutoId, out var produto))
                {
                    return ProblemaNosProdutos($"produtos[{indice}].produtoId", "Produto não encontrado.");
                }

                if (produto.Desativado)
                {
                    return Conflict(new ProblemDetails
                    {
                        Type = "about:blank",
                        Title = "O empréstimo contém um produto desativado.",
                        Status = StatusCodes.Status409Conflict,
                        Extensions = { ["code"] = "loan_product_deactivated" }
                    });
                }

                var erroQuantidade = LoanDomainRules.ValidateDebit(produto.Quantidade, item.Quantidade, out _);
                if (erroQuantidade is not null)
                {
                    return ProblemaDeDominio($"produtos[{indice}].quantidade", erroQuantidade);
                }
            }

            return null;
        }

        private ActionResult ProblemaDeDominio(string campo, LoanRuleViolation erro) =>
            ValidationProblem(new ValidationProblemDetails(new Dictionary<string, string[]>
            {
                [campo] = [erro.Message]
            })
            {
                Title = "Dados do empréstimo inválidos.",
                Status = StatusCodes.Status400BadRequest,
                Extensions = { ["code"] = erro.Code }
            });

        private ActionResult ProblemaNosProdutos(string campo, string mensagem) =>
            ValidationProblem(new ValidationProblemDetails(new Dictionary<string, string[]>
            {
                [campo] = [mensagem]
            })
            {
                Title = "Itens do empréstimo inválidos.",
                Status = StatusCodes.Status400BadRequest
            });

        [HttpPatch("aprovar/{emprestimoId}")]
        [Authorize("ApenasAdministradores")]
        public Task<IActionResult> AprovarEmprestimo(
            int emprestimoId,
            [FromServices] ILoanDecisionService decisionService) =>
            DecidirEmprestimoAsync(emprestimoId, approve: true, decisionService);

        [HttpPatch("reprovar/{emprestimoId}")]
        [Authorize("ApenasAdministradores")]
        public Task<IActionResult> ReprovarEmprestimo(
            int emprestimoId,
            [FromServices] ILoanDecisionService decisionService) =>
            DecidirEmprestimoAsync(emprestimoId, approve: false, decisionService);

        private async Task<IActionResult> DecidirEmprestimoAsync(
            int emprestimoId,
            bool approve,
            ILoanDecisionService decisionService)
        {
            var user = HttpContext.User;
            if (user?.Identity?.IsAuthenticated != true)
            {
                return Unauthorized("Usuário não autenticado.");
            }

            var userIdClaim = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdClaim, NumberStyles.None, CultureInfo.InvariantCulture, out var userId))
            {
                return Unauthorized("Token inválido. ID do usuário não encontrado.");
            }

            if (!user.IsInRole(NivelUsuario.Administrador.ToString()))
            {
                return Unauthorized("Apenas administradores podem decidir empréstimos.");
            }

            var result = await decisionService.DecideAsync(
                emprestimoId,
                userId,
                approve,
                HttpContext.RequestAborted);
            if (result.Succeeded)
            {
                return NoContent();
            }

            if (result.LoanNotFound)
            {
                return NotFound("Empréstimo não encontrado.");
            }

            return Conflict(new ProblemDetails
            {
                Type = "about:blank",
                Title = "O empréstimo não pôde ser decidido.",
                Status = StatusCodes.Status409Conflict,
                Extensions = { ["code"] = result.ConflictCode }
            });
        }

        [HttpPatch("devolver/{emprestimoId}")]
        [Authorize]
        public async Task<IActionResult> DevolverEmprestimo(
            int emprestimoId,
            [FromServices] IAuditoriaService? auditService = null,
            [FromServices] ProductCivilDay? productCivilDay = null)
        {
            var userIdClaim = HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdClaim, NumberStyles.None, CultureInfo.InvariantCulture, out var userId) || userId <= 0)
            {
                return Unauthorized("Token inválido. ID do usuário não encontrado.");
            }

            var service = new LoanReturnService(
                _uow,
                DbContext,
                auditService ?? throw new InvalidOperationException("The mandatory audit service is required for loan returns."),
                _timeProvider,
                productCivilDay ?? throw new InvalidOperationException("The product civil-day service is required for loan returns."));
            var result = await service.ReturnAsync(
                emprestimoId,
                userId,
                HttpContext.TraceIdentifier,
                HttpContext.RequestAborted);
            if (result.Succeeded)
            {
                return NoContent();
            }

            if (result.LoanNotFound)
            {
                return ResourceNotFound();
            }

            return Conflict(new ProblemDetails
            {
                Type = "about:blank",
                Title = "O empréstimo não pôde ser devolvido.",
                Status = StatusCodes.Status409Conflict,
                Extensions = { ["code"] = result.ConflictCode }
            });
        }
    }
}
