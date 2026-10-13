using AutoMapper;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using LabSolos_Server_DotNet8.DTOs.Emprestimos;
using LabSolos_Server_DotNet8.DTOs.Usuarios;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using LabSolos_Server_DotNet8.Services.Security;
using System.Linq.Expressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.JsonPatch;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LabSolos_Server_DotNet8.Controllers
{
    [ApiController]
    //[Authorize]
    [Route("api/[controller]")]
    public class UsuariosController : ControllerBase
    {
        private readonly ILogger<UsuariosController> _logger;
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;
        private readonly IUsuarioService _usuarioService;
        private readonly IUtilitiesService _utilsService;
        private readonly INotificacaoService _notificacaoService;
        private readonly UserResourceAccessService _userResourceAccess;
        private readonly UserProfileUpdateService? _profileUpdateService;
        private readonly TimeProvider _timeProvider;
        private const string DependentDecisionUnauthorizedMessage =
            "Você não tem permissão para processar este usuário dependente.";
        private static readonly Action<ILogger, int, Exception?> LogNotificationPersistenceFailure =
            LoggerMessage.Define<int>(
                LogLevel.Error,
                new EventId(1001, nameof(LogNotificationPersistenceFailure)),
                "Falha de persistência ao criar notificação para o usuário {UsuarioId}");

        public UsuariosController(
            ILogger<UsuariosController> logger,
            IUtilitiesService utilsService,
            IUnitOfWork uow,
            IMapper mapper,
            IUsuarioService usuarioService,
            INotificacaoService notificacaoService,
            TimeProvider? timeProvider = null,
            UserResourceAccessService? userResourceAccess = null,
            UserProfileUpdateService? profileUpdateService = null)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _utilsService = utilsService ?? throw new ArgumentNullException(nameof(utilsService));
            _uow = uow ?? throw new ArgumentNullException(nameof(uow));
            _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
            _usuarioService = usuarioService ?? throw new ArgumentNullException(nameof(usuarioService));
            _notificacaoService = notificacaoService ?? throw new ArgumentNullException(nameof(notificacaoService));
            _timeProvider = timeProvider ?? TimeProvider.System;
            _userResourceAccess = userResourceAccess ?? new UserResourceAccessService();
            _profileUpdateService = profileUpdateService;
        }

        [HttpGet]
        [Authorize("ApenasAdministradores")]
        public async Task<IActionResult> ObterTodos()
        {
            var usuarios = await _uow.UsuarioRepository.ObterTodosAsync(u => true, query => query.Include(u => u.Responsavel));
            return Ok(_mapper.Map<IEnumerable<UsuarioDTO>>(usuarios));
        }

        [HttpGet("tipo/{tipoUsuario}")]
        [Authorize(Policy = "ApenasAdministradores")]
        public async Task<IActionResult> ObterUsuariosPeloTipo(int tipoUsuario)
        {
            _logger.LogInformation("Iniciando operação para obter usuários do tipo {Tipo}.", (TipoUsuario)tipoUsuario);

            // Validação do tipo com o enum
            if (!Enum.IsDefined(typeof(TipoUsuario), tipoUsuario))
            {
                _logger.LogWarning("Tipo de usuário inválido: {Tipo}", tipoUsuario);
                return BadRequest("Tipo de usuário inválido. Use um valor de TipoUsuario válido.");
            }

            var tipoEnum = (TipoUsuario)tipoUsuario;

            var usuarios = await _uow.UsuarioRepository.ObterTodosAsync(u => u.TipoUsuario == tipoEnum, query => query.Include(u => u.Responsavel));

            // Mapeamento baseado no tipo do usuário
            return tipoEnum switch
            {
                TipoUsuario.Administrador => Ok(_mapper.Map<IEnumerable<AdministradorDTO>>(usuarios)),
                TipoUsuario.Academico => Ok(_mapper.Map<IEnumerable<AcademicoDTO>>(usuarios)),
                _ => Ok(_mapper.Map<IEnumerable<UsuarioDTO>>(usuarios))
            };
        }

        [HttpGet("{id}")]
        [Authorize]
        public async Task<IActionResult> ObterPeloId(int id)
        {
            var accessibleProfile = AndAlso(
                _userResourceAccess.ForProfiles(User),
                usuario => usuario.Id == id);
            var usuario = await _uow.UsuarioRepository.ObterAsync(
                accessibleProfile,
                query => query.Include(u => u.Responsavel));
            if (usuario is null)
            {
                return ResourceNotFound();
            }

            var isLinkedMentee = User.IsInRole(NivelUsuario.Mentor.ToString()) &&
                _userResourceAccess.ForLinkedMentees(User).Compile()(usuario);
            if (isLinkedMentee)
            {
                return Ok(_mapper.Map<UsuarioAcompanhamentoDTO>(usuario));
            }

            // Mapeamento baseado no tipo do usuário
            return usuario.TipoUsuario switch
            {
                TipoUsuario.Administrador => Ok(_mapper.Map<AdministradorDTO>(usuario)),
                TipoUsuario.Academico => Ok(_mapper.Map<AcademicoDTO>(usuario)),
                _ => Ok(_mapper.Map<UsuarioDTO>(usuario))
            };
        }

        [HttpGet("{usuarioId}/dependentes/emprestimos")]
        [Authorize("ApenasResponsaveis")]
        public async Task<IActionResult> ObterEmprestimosDosDependentes(int usuarioId)
        {
            var responsavel = await ObterResponsavelAutorizadoAsync(usuarioId);
            if (responsavel is null)
            {
                return ResourceNotFound();
            }

            var dependentes = await ObterDependentesAutorizadosAsync(responsavel.Id);
            var idsDependentes = dependentes.Select(dependente => dependente.Id).ToArray();
            if (idsDependentes.Length == 0)
            {
                return Ok(Array.Empty<EmprestimoDTO>());
            }

            var authorizedLoans = AndAlso(
                _userResourceAccess.ForLoans(User),
                emprestimo => idsDependentes.Contains(emprestimo.SolicitanteId));
            var emprestimos = await _uow.EmprestimoRepository.ObterTodosAsync(
                authorizedLoans,
                query => query
                    .Include(e => e.Produtos)
                    .ThenInclude(p => p.Produto)
                    .ThenInclude(p => p.Lote)
                    .Include(e => e.Solicitante)
                    .Include(e => e.Aprovador));

            return Ok(_mapper.Map<IEnumerable<EmprestimoDTO>>(emprestimos));
        }

        [HttpGet("{usuarioId}/dependentes")]
        [Authorize("ApenasResponsaveis")]
        public async Task<IActionResult> ObterDependentes(int usuarioId)
        {
            var responsavel = await ObterResponsavelAutorizadoAsync(usuarioId);
            if (responsavel is null)
            {
                return ResourceNotFound();
            }

            var dependentes = await ObterDependentesAutorizadosAsync(responsavel.Id);
            return Ok(_mapper.Map<IEnumerable<UsuarioAcompanhamentoDTO>>(dependentes));
        }

        [HttpGet("{usuarioId}/dependentes/aprovacao")]
        [Authorize("ApenasResponsaveis")]
        public async Task<IActionResult> ObterDependentesParaAprovacao(int usuarioId)
        {
            var responsavel = await ObterResponsavelAutorizadoAsync(usuarioId);
            if (responsavel is null)
            {
                return ResourceNotFound();
            }

            var pendingMentees = AndAlso(
                _userResourceAccess.ForLinkedMentees(User),
                dependente => dependente.ResponsavelId == responsavel.Id &&
                    dependente.Status == StatusUsuario.Pendente);
            var dependentesPendentes = await _uow.UsuarioRepository.ObterTodosAsync(pendingMentees);
            return Ok(_mapper.Map<IEnumerable<UsuarioAcompanhamentoDTO>>(dependentesPendentes));
        }

        [HttpGet("aprovacao")]
        [Authorize("ApenasAdministradores")]
        public async Task<IActionResult> ObterUsuariosParaAprovacao()
        {
            var usuarios = await _uow.UsuarioRepository.ObterTodosAsync(u => u.Status == StatusUsuario.Pendente);
            var usuariosDto = _mapper.Map<IEnumerable<UsuarioDTO>>(usuarios);

            return Ok(usuariosDto);
        }

        [HttpPost]
        public async Task<IActionResult> Adicionar(AddUsuarioDTO addUsuarioDTO)
        {
            try
            {
                // Bloquear tentativa de adicionar Administrador
                if (addUsuarioDTO.TipoUsuario == TipoUsuario.Administrador.ToString())
                {
                    return StatusCode(
                        StatusCodes.Status403Forbidden,
                        "Você não tem permissão para adicionar um usuário do tipo Administrador. Apenas administradores podem realizar essa ação.");
                }

                int? responsavelId = null;

                // Verificar se um responsável foi informado (aplicável para Mentorados que precisam de um Mentor responsável)
                if (addUsuarioDTO.ResponsavelEmail is not null)
                {
                    var responsavel = await _uow.UsuarioRepository.ObterAsync(u => u.Email == addUsuarioDTO.ResponsavelEmail);

                    if (responsavel == null)
                        return NotFound("O email do responsável informado não pertence a nenhum usuário válido");

                    // Validar se o responsável tem nível adequado para ser responsável
                    if (responsavel.NivelUsuario != NivelUsuario.Mentor && responsavel.NivelUsuario != NivelUsuario.Administrador)
                        return BadRequest("O usuário informado como responsável deve ser um Mentor ou Administrador");

                    responsavelId = responsavel.Id;
                }

                // Validar os dados do usuário através do serviço
                var resultadoValidacao = _usuarioService.ValidarEstrutura(addUsuarioDTO);
                if (!resultadoValidacao.Validado)
                {
                    if (resultadoValidacao.Errors.Count > 0)
                    {
                        _logger.LogInformation(
                            "Cadastro de usuário rejeitado; campos inválidos: {Fields}",
                            string.Join(",", resultadoValidacao.Errors.Keys));
                        return RegistrationValidationProblem(resultadoValidacao.Errors);
                    }

                    return BadRequest(new { Message = resultadoValidacao.Mensagem });
                }

                TipoUsuario tipoUsuario;

                try
                {
                    tipoUsuario = _utilsService.ValidarEnum<TipoUsuario>(addUsuarioDTO.TipoUsuario, "TipoUsuario", TipoUsuario.Comum);
                }
                catch (ArgumentException ex)
                {
                    return BadRequest(new { Message = ex.Message });
                }

                Usuario usuario = tipoUsuario switch
                {
                    TipoUsuario.Academico => _mapper.Map<Academico>(addUsuarioDTO),
                    _ => _mapper.Map<Usuario>(addUsuarioDTO)
                };

                var passwordResult = _usuarioService.PrepararSenhaCadastro(usuario, addUsuarioDTO.Senha);
                if (!passwordResult.IsValid)
                {
                    return PasswordValidationProblem(passwordResult.Code ?? "password_invalid");
                }

                usuario.DataIngresso = DateOnly.FromDateTime(_timeProvider.GetUtcNow().UtcDateTime);
                usuario.ResponsavelId = responsavelId;
                usuario.Status = StatusUsuario.Pendente;

                _uow.UsuarioRepository.Criar(usuario);
                await _uow.CommitAsync();

                // Criar notificação para administradores sobre nova solicitação de usuário
                try
                {
                    await _notificacaoService.CriarNotificacaoNovaSolicitacaoUsuario(usuario.Id);
                }
                catch (DbUpdateException ex)
                {
                    // A notificação é secundária ao cadastro; registre a falha esperada
                    // sem expor detalhes de persistência nem falhar o processo principal.
                    LogNotificationPersistenceFailure(_logger, usuario.Id, ex);
                }

                return CreatedAtAction(nameof(ObterPeloId), new { id = usuario.Id }, _mapper.Map<UsuarioDTO>(usuario));
            }
            catch (ArgumentException e)
            {
                return BadRequest(e.Message);
            }
        }

        private static ObjectResult PasswordValidationProblem(string code)
        {
            var message = code switch
            {
                "password_required" => "A senha é obrigatória.",
                "password_too_short" => $"A senha deve ter pelo menos {PasswordPolicy.MinimumLength} caracteres.",
                "password_too_long" => $"A senha deve ter no máximo {PasswordPolicy.MaximumLength} caracteres.",
                "password_common" => "A senha é muito comum.",
                _ => "A senha é inválida."
            };
            var details = new ValidationProblemDetails(new Dictionary<string, string[]>
            {
                ["senha"] = [code, message]
            })
            {
                Type = "https://httpstatuses.com/400",
                Title = "Não foi possível cadastrar o usuário.",
                Status = StatusCodes.Status400BadRequest
            };

            return new ObjectResult(details)
            {
                StatusCode = StatusCodes.Status400BadRequest,
                ContentTypes = { "application/problem+json" }
            };
        }

        private static ObjectResult RegistrationValidationProblem(
            IReadOnlyDictionary<string, string[]> errors)
        {
            var details = new ValidationProblemDetails(
                errors.ToDictionary(entry => entry.Key, entry => entry.Value))
            {
                Type = "https://tools.ietf.org/html/rfc9110#section-15.5.1",
                Title = "Dados de cadastro inválidos.",
                Status = StatusCodes.Status400BadRequest
            };

            return new ObjectResult(details)
            {
                StatusCode = StatusCodes.Status400BadRequest,
                ContentTypes = { "application/problem+json" }
            };
        }

        [HttpPatch("{usuarioId}")]
        [Authorize]
        public async Task<ActionResult<UsuarioDTOPatchResponse>> AtualizarParcialmente(int usuarioId, JsonPatchDocument<UsuarioDTOPatchRequest> patchUsuarioDto)
        {
            if (patchUsuarioDto is null)
                return BadRequest();

            var updateService = _profileUpdateService ??
                throw new InvalidOperationException("The profile update service is not configured.");
            var update = await updateService.UpdateAsync(
                usuarioId,
                User,
                patchUsuarioDto,
                HttpContext.RequestAborted);

            return update.Status switch
            {
                UserProfileUpdateStatus.Updated => Ok(_mapper.Map<UsuarioDTOPatchResponse>(update.UpdatedUser)),
                UserProfileUpdateStatus.NotFound => ResourceNotFound(),
                UserProfileUpdateStatus.Forbidden => StatusCode(StatusCodes.Status403Forbidden),
                UserProfileUpdateStatus.Invalid => ProfileUpdateValidationProblem(update.Errors!),
                UserProfileUpdateStatus.Conflict => ProfileUpdateConflictProblem(),
                UserProfileUpdateStatus.Unavailable => ProfileUpdateUnavailableProblem(),
                _ => StatusCode(StatusCodes.Status500InternalServerError)
            };
        }

        private static ObjectResult ProfileUpdateValidationProblem(
            IReadOnlyDictionary<string, string[]> errors)
        {
            var details = new ValidationProblemDetails(errors.ToDictionary(
                entry => entry.Key,
                entry => entry.Value))
            {
                Type = "https://tools.ietf.org/html/rfc9110#section-15.5.1",
                Title = "Não foi possível atualizar o perfil.",
                Status = StatusCodes.Status400BadRequest
            };

            return new ObjectResult(details)
            {
                StatusCode = StatusCodes.Status400BadRequest,
                ContentTypes = { "application/problem+json" }
            };
        }

        private static ObjectResult ProfileUpdateConflictProblem()
        {
            var details = new ProblemDetails
            {
                Type = "about:blank",
                Title = "Não foi possível atualizar o perfil.",
                Status = StatusCodes.Status409Conflict
            };
            details.Extensions["code"] = "profile_update_conflict";

            return new ObjectResult(details)
            {
                StatusCode = StatusCodes.Status409Conflict,
                ContentTypes = { "application/problem+json" }
            };
        }

        private static ObjectResult ProfileUpdateUnavailableProblem() => new(new ProblemDetails
        {
            Type = "about:blank",
            Title = "A alteração de e-mail está temporariamente indisponível.",
            Status = StatusCodes.Status503ServiceUnavailable
        })
        {
            StatusCode = StatusCodes.Status503ServiceUnavailable,
            ContentTypes = { "application/problem+json" }
        };

        [HttpPatch("dependentes/{dependenteId}/aprovar")]
        [Authorize(Policy = "ApenasResponsaveis")]
        public async Task<IActionResult> AprovarUsuario(int dependenteId, [FromBody] AprovarDTO aprovadorDto)
        {
            // Buscar o usuário dependente pelo ID
            var dependente = await _uow.UsuarioRepository.ObterAsync(u => u.Id == dependenteId);
            if (dependente == null)
            {
                return NotFound("Usuário dependente não encontrado.");
            }

            var authorizationError = ValidateDependentDecision(dependente, aprovadorDto);
            if (authorizationError is not null)
            {
                return authorizationError;
            }

            // Verificar se o usuário já foi aprovado
            if (dependente.Status != StatusUsuario.Pendente)
            {
                return BadRequest("Este usuário já foi processado (aprovado ou rejeitado).");
            }

            // Atualizar o status do usuário para aprovado
            dependente.Status = StatusUsuario.Habilitado;

            // Salvar a mudança no banco de dados
            _uow.UsuarioRepository.Atualizar(dependente);
            await _uow.CommitAsync();

            return Ok(new { Message = "Usuário aprovado com sucesso.", Usuario = _mapper.Map<DependenteDTO>(dependente) });
        }

        [HttpPatch("{usuarioId}/aprovar")]
        [Authorize(Policy = "ApenasAdministradores")]
        public async Task<IActionResult> AdminAprovarUsuario(int usuarioId)
        {
            // Buscar o usuário dependente pelo ID
            var dependente = await _uow.UsuarioRepository.ObterAsync(u => u.Id == usuarioId);
            if (dependente == null)
            {
                return NotFound("Usuário dependente não encontrado.");
            }

            // Verificar se o usuário já foi aprovado
            if (dependente.Status != StatusUsuario.Pendente)
            {
                return BadRequest("Este usuário já foi processado (aprovado ou rejeitado).");
            }

            // Atualizar o status do usuário para aprovado
            dependente.Status = StatusUsuario.Habilitado;

            // Salvar a mudança no banco de dados
            _uow.UsuarioRepository.Atualizar(dependente);
            await _uow.CommitAsync();

            return Ok(new { Message = "Usuário aprovado com sucesso.", Usuario = _mapper.Map<DependenteDTO>(dependente) });
        }

        [HttpPatch("dependentes/{dependenteId}/rejeitar")]
        [Authorize(Policy = "ApenasResponsaveis")]
        public async Task<IActionResult> RejeitarUsuario(int dependenteId, [FromBody] AprovarDTO aprovadorDto)
        {
            // Buscar o usuário dependente pelo ID
            var dependente = await _uow.UsuarioRepository.ObterAsync(u => u.Id == dependenteId);
            if (dependente == null)
            {
                return NotFound("Usuário dependente não encontrado.");
            }

            var authorizationError = ValidateDependentDecision(dependente, aprovadorDto);
            if (authorizationError is not null)
            {
                return authorizationError;
            }

            // Verificar se o usuário já foi aprovado
            if (dependente.Status != StatusUsuario.Pendente)
            {
                return BadRequest("Este usuário já foi processado (aprovado ou rejeitado).");
            }

            // Atualizar o status do usuário para rejeitado
            dependente.Status = StatusUsuario.Desabilitado;

            // Salvar a mudança no banco de dados
            _uow.UsuarioRepository.Atualizar(dependente);
            await _uow.CommitAsync();

            return Ok(new { Message = "Usuário rejeitado com sucesso.", Usuario = _mapper.Map<DependenteDTO>(dependente) });
        }

        [HttpPatch("{usuarioId}/rejeitar")]
        [Authorize(Policy = "ApenasAdministradores")]
        public async Task<IActionResult> AdminRejeitarUsuario(int usuarioId, [FromBody] AprovarDTO aprovadorDto)
        {
            // Buscar o usuário dependente pelo ID
            var dependente = await _uow.UsuarioRepository.ObterAsync(u => u.Id == usuarioId);
            if (dependente == null)
            {
                return NotFound("Usuário dependente não encontrado.");
            }

            // Verificar se o usuário já foi aprovado
            if (dependente.Status != StatusUsuario.Pendente)
            {
                return BadRequest("Este usuário já foi processado (aprovado ou rejeitado).");
            }

            // Atualizar o status do usuário para rejeitado
            dependente.Status = StatusUsuario.Desabilitado;

            // Salvar a mudança no banco de dados
            _uow.UsuarioRepository.Atualizar(dependente);
            await _uow.CommitAsync();

            return Ok(new { Message = "Usuário rejeitado com sucesso.", Usuario = _mapper.Map<DependenteDTO>(dependente) });
        }

        private UnauthorizedObjectResult? ValidateDependentDecision(Usuario dependente, AprovarDTO aprovadorDto)
        {
            var authenticatedUserId = GetAuthenticatedUserId();
            if (authenticatedUserId is null || aprovadorDto.AprovadorId != authenticatedUserId.Value)
            {
                return Unauthorized(DependentDecisionUnauthorizedMessage);
            }

            if (User.IsInRole(NivelUsuario.Administrador.ToString()))
            {
                return null;
            }

            return dependente.ResponsavelId == authenticatedUserId.Value
                ? null
                : Unauthorized(DependentDecisionUnauthorizedMessage);
        }

        private int? GetAuthenticatedUserId()
        {
            var subject = User.FindFirstValue(ClaimTypes.NameIdentifier) ??
                User.FindFirstValue(JwtRegisteredClaimNames.Sub);

            return int.TryParse(subject, out var userId) ? userId : null;
        }

        private async Task<Usuario?> ObterResponsavelAutorizadoAsync(int usuarioId)
        {
            var authorizedResponsible = AndAlso(
                _userResourceAccess.ForProfiles(User),
                usuario => usuario.Id == usuarioId &&
                    (usuario.NivelUsuario == NivelUsuario.Mentor ||
                     usuario.NivelUsuario == NivelUsuario.Administrador));

            return await _uow.UsuarioRepository.ObterAsync(authorizedResponsible);
        }

        private Task<IEnumerable<Usuario>> ObterDependentesAutorizadosAsync(int responsavelId)
        {
            var authorizedMentees = AndAlso(
                _userResourceAccess.ForLinkedMentees(User),
                dependente => dependente.ResponsavelId == responsavelId);

            return _uow.UsuarioRepository.ObterTodosAsync(authorizedMentees);
        }

        private static NotFoundObjectResult ResourceNotFound() => new(new ProblemDetails
        {
            Type = "about:blank",
            Title = "Recurso não encontrado.",
            Status = StatusCodes.Status404NotFound
        });

        private static Expression<Func<T, bool>> AndAlso<T>(
            Expression<Func<T, bool>> first,
            Expression<Func<T, bool>> second)
        {
            var parameter = Expression.Parameter(typeof(T), "resource");
            var firstBody = new ParameterReplacementVisitor(first.Parameters[0], parameter).Visit(first.Body)!;
            var secondBody = new ParameterReplacementVisitor(second.Parameters[0], parameter).Visit(second.Body)!;
            return Expression.Lambda<Func<T, bool>>(Expression.AndAlso(firstBody, secondBody), parameter);
        }

        private sealed class ParameterReplacementVisitor(
            ParameterExpression source,
            ParameterExpression replacement) : ExpressionVisitor
        {
            protected override Expression VisitParameter(ParameterExpression node) =>
                node == source ? replacement : base.VisitParameter(node);
        }

        [HttpDelete("{id}")]
        [Authorize(Policy = "ApenasAdministradores")]
        public async Task<IActionResult> Delete(int id)
        {
            var usuario = await _uow.UsuarioRepository.ObterAsync(u => u.Id == id);

            if (usuario == null) return NotFound();

            _uow.UsuarioRepository.Remover(usuario);
            await _uow.CommitAsync();
            return NoContent();
        }
    }
}
