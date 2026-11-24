using AutoMapper;
using LabSolos_Server_DotNet8.DTOs.Auditoria;
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
using Npgsql;

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
        private readonly INotificacaoService _notificacaoService;
        private readonly UserResourceAccessService _userResourceAccess;
        private readonly UserProfileUpdateService? _profileUpdateService;
        private readonly AdminContinuityGuard? _adminContinuityGuard;
        private readonly IAuditoriaService? _auditoriaService;
        private readonly OperationAdmissionPolicy? _operationAdmissionPolicy;
        private readonly EmailAddressReservationService? _emailAddressReservations;
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
            UserProfileUpdateService? profileUpdateService = null,
            AdminContinuityGuard? adminContinuityGuard = null,
            IAuditoriaService? auditoriaService = null,
            OperationAdmissionPolicy? operationAdmissionPolicy = null,
            EmailAddressReservationService? emailAddressReservations = null)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            ArgumentNullException.ThrowIfNull(utilsService);
            _uow = uow ?? throw new ArgumentNullException(nameof(uow));
            _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
            _usuarioService = usuarioService ?? throw new ArgumentNullException(nameof(usuarioService));
            _notificacaoService = notificacaoService ?? throw new ArgumentNullException(nameof(notificacaoService));
            _timeProvider = timeProvider ?? TimeProvider.System;
            _userResourceAccess = userResourceAccess ?? new UserResourceAccessService();
            _profileUpdateService = profileUpdateService;
            _adminContinuityGuard = adminContinuityGuard;
            _auditoriaService = auditoriaService;
            _operationAdmissionPolicy = operationAdmissionPolicy;
            _emailAddressReservations = emailAddressReservations;
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
            var actorId = GetAuthenticatedUserId();
            if (actorId is null)
                return Forbid();

            var actor = await _uow.UsuarioRepository.ObterAsync(user => user.Id == actorId.Value);
            if (actor is not { Status: StatusUsuario.Habilitado } ||
                actor.NivelUsuario is not (NivelUsuario.Mentor or NivelUsuario.Administrador))
                return Forbid();

            var responsavel = await ObterResponsavelAutorizadoAsync(usuarioId);
            if (responsavel is null)
                return ResourceNotFound();

            if (actor.NivelUsuario == NivelUsuario.Mentor && actor.Id != responsavel.Id)
                return Forbid();

            var pendingMentees = await _uow.UsuarioRepository.ObterTodosAsync(
                user => user.Status == StatusUsuario.Pendente &&
                    user.NivelUsuario == NivelUsuario.Mentorado &&
                    user.ResponsavelId == responsavel.Id,
                query => query.Include(user => user.Responsavel));
            var eligibleRequests = _usuarioService.FiltrarSolicitacoesElegiveis(actor, pendingMentees);
            return Ok(_mapper.Map<IEnumerable<UsuarioAprovacaoDTO>>(eligibleRequests));
        }

        [HttpGet("aprovacao")]
        [Authorize("ApenasAdministradores")]
        public async Task<IActionResult> ObterUsuariosParaAprovacao()
        {
            var actorId = GetAuthenticatedUserId();
            if (actorId is null)
                return Forbid();

            var actor = await _uow.UsuarioRepository.ObterAsync(user => user.Id == actorId.Value);
            if (actor is null || !PoliticaContas.IsEnabledAdministrator(actor))
                return Forbid();

            var pendingRequests = await _uow.UsuarioRepository.ObterTodosAsync(
                user => user.Status == StatusUsuario.Pendente,
                query => query.Include(user => user.Responsavel));
            var eligibleRequests = _usuarioService.FiltrarSolicitacoesElegiveis(actor, pendingRequests);

            return Ok(_mapper.Map<IEnumerable<UsuarioAprovacaoDTO>>(eligibleRequests));
        }

        [HttpPost]
        [AllowAnonymous]
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

                if (!PoliticaContas.TryGetPublicRole(addUsuarioDTO, out var publicRole))
                    return RegistrationProblem(400, "registration_account_invalid", "Selecione Mentor ou Mentorado para o cadastro acadêmico.");

                if (_operationAdmissionPolicy is not null)
                {
                    var admission = await _operationAdmissionPolicy.AdmitPublicRegistrationAsync(
                        HttpContext.Connection.RemoteIpAddress,
                        HttpContext.RequestAborted);
                    if (admission.Status == OperationAdmissionStatus.RateLimited)
                        return OperationAdmissionResponses.RateLimited(Response, admission.RetryAfterSeconds);
                    if (admission.Status == OperationAdmissionStatus.Unavailable)
                        return OperationAdmissionResponses.Unavailable(Response);
                }

                int? responsavelId = null;
                if (publicRole == NivelUsuario.Mentorado)
                {
                    var email = addUsuarioDTO.ResponsavelEmail?.Trim();
                    var responsavel = string.IsNullOrEmpty(email)
                        ? null
                        : await _uow.UsuarioRepository.ObterAsync(u => u.Email == email);
                    if (!PoliticaContas.IsEligibleResponsible(responsavel))
                        return RegistrationProblem(400, "registration_responsible_invalid", "Verifique o e-mail do responsável informado.");

                    responsavelId = responsavel!.Id;
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

                await using var registrationTransaction = _emailAddressReservations is null
                    ? null
                    : await _uow.BeginTransactionAsync(HttpContext.RequestAborted);
                if (_emailAddressReservations is not null)
                    await _emailAddressReservations.LockAddressAsync(addUsuarioDTO.Email, HttpContext.RequestAborted);

                if (await _uow.UsuarioRepository.ObterAsync(u => u.Email.Trim().ToLower() == addUsuarioDTO.Email) is not null ||
                    (_emailAddressReservations is not null &&
                     await _emailAddressReservations.IsUnavailableToAsync(
                         addUsuarioDTO.Email, null, HttpContext.RequestAborted)))
                    return RegistrationConflict();

                Usuario usuario = _mapper.Map<Academico>(addUsuarioDTO);
                PoliticaContas.ApplyRegistration(usuario, publicRole, responsavelId);

                var passwordResult = _usuarioService.PrepararSenhaCadastro(usuario, addUsuarioDTO.Senha);
                if (!passwordResult.IsValid)
                {
                    return PasswordValidationProblem(passwordResult.Code ?? "password_invalid");
                }

                usuario.DataIngresso = DateOnly.FromDateTime(_timeProvider.GetUtcNow().UtcDateTime);

                _uow.UsuarioRepository.Criar(usuario);
                await _uow.CommitAsync();
                if (registrationTransaction is not null)
                    await registrationTransaction.CommitAsync(HttpContext.RequestAborted);

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
            catch (DbUpdateException exception) when (exception.InnerException is PostgresException
                { SqlState: PostgresErrorCodes.UniqueViolation, ConstraintName: "IX_Usuarios_Email" })
            {
                return RegistrationConflict();
            }
            catch (ArgumentException e)
            {
                return BadRequest(e.Message);
            }
        }

        private static ObjectResult RegistrationConflict() => RegistrationProblem(
            409, "registration_conflict", "Não foi possível concluir o cadastro com os dados informados.");

        private static ObjectResult RegistrationProblem(int status, string code, string message)
        {
            var details = new ProblemDetails
            {
                Status = status,
                Title = "Não foi possível cadastrar o usuário.",
                Detail = message
            };
            details.Extensions["code"] = code;
            return new ObjectResult(details)
            {
                StatusCode = status,
                ContentTypes = { "application/problem+json" }
            };
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
                UserProfileUpdateStatus.ContinuityRequired => AdminContinuityProblem(),
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

        private AdminContinuityGuard ContinuityGuard => _adminContinuityGuard ??
            throw new InvalidOperationException("The administrative continuity guard is not configured.");

        private static ObjectResult AdminContinuityProblem()
        {
            var details = new ProblemDetails
            {
                Status = StatusCodes.Status409Conflict,
                Title = "É necessário manter ao menos um administrador habilitado."
            };
            details.Extensions["code"] = AdminContinuityGuard.ConflictCode;
            return new ObjectResult(details)
            {
                StatusCode = StatusCodes.Status409Conflict,
                ContentTypes = { "application/problem+json" }
            };
        }

        [HttpPatch("dependentes/{dependenteId}/aprovar")]
        [Authorize(Policy = "ApenasResponsaveis")]
        public Task<IActionResult> AprovarUsuario(int dependenteId, [FromBody] AprovarDTO aprovadorDto) =>
            ProcessarSolicitacaoAsync(
                dependenteId,
                aprovadorDto.AprovadorId,
                StatusUsuario.Habilitado,
                "Usuário aprovado com sucesso.");

        [HttpPatch("{usuarioId}/aprovar")]
        [Authorize(Policy = "ApenasAdministradores")]
        public Task<IActionResult> AdminAprovarUsuario(int usuarioId) =>
            ProcessarSolicitacaoAsync(
                usuarioId,
                expectedActorId: null,
                StatusUsuario.Habilitado,
                "Usuário aprovado com sucesso.");

        [HttpPatch("dependentes/{dependenteId}/rejeitar")]
        [Authorize(Policy = "ApenasResponsaveis")]
        public Task<IActionResult> RejeitarUsuario(int dependenteId, [FromBody] AprovarDTO aprovadorDto) =>
            ProcessarSolicitacaoAsync(
                dependenteId,
                aprovadorDto.AprovadorId,
                StatusUsuario.Desabilitado,
                "Usuário rejeitado com sucesso.");

        [HttpPatch("{usuarioId}/rejeitar")]
        [Authorize(Policy = "ApenasAdministradores")]
        public Task<IActionResult> AdminRejeitarUsuario(int usuarioId, [FromBody] AprovarDTO aprovadorDto) =>
            ProcessarSolicitacaoAsync(
                usuarioId,
                aprovadorDto.AprovadorId,
                StatusUsuario.Desabilitado,
                "Usuário rejeitado com sucesso.");

        [HttpPatch("{usuarioId}/conceder-administrador")]
        [Authorize(Policy = "ApenasAdministradores")]
        public async Task<IActionResult> ConcederPapelAdministrador(int usuarioId)
        {
            var actorId = GetAuthenticatedUserId();
            if (actorId is null)
                return Forbid();

            await using var transaction = await ContinuityGuard.BeginTransactionAsync(HttpContext.RequestAborted);
            var actor = await _uow.UsuarioRepository.ObterAsync(user => user.Id == actorId.Value);
            if (actor is null || !PoliticaContas.IsEnabledAdministrator(actor))
                return Forbid();

            var target = await _uow.UsuarioRepository.ObterAsync(user => user.Id == usuarioId);
            if (target is null)
                return ResourceNotFound();

            if (target.Id == actor.Id ||
                target.Status != StatusUsuario.Habilitado ||
                target.NivelUsuario == NivelUsuario.Administrador)
            {
                return AccountGrantConflict();
            }

            if (!await ContinuityGuard.CanApplyAsync(
                    target.Id,
                    NivelUsuario.Administrador,
                    target.Status,
                    cancellationToken: HttpContext.RequestAborted))
            {
                return AdminContinuityProblem();
            }

            target.NivelUsuario = NivelUsuario.Administrador;
            _uow.UsuarioRepository.Atualizar(target);
            await RegistrarAuditoriaObrigatoriaAsync(
                CodigoEventoAuditoria.ConcessaoConta,
                actor.Id,
                $"usuario:{target.Id}:Administrador");
            await _uow.CommitAsync();
            await transaction.CommitAsync(HttpContext.RequestAborted);

            return NoContent();
        }

        private async Task<IActionResult> ProcessarSolicitacaoAsync(
            int solicitacaoId,
            int? expectedActorId,
            StatusUsuario resultingStatus,
            string message)
        {
            var actorId = GetAuthenticatedUserId();
            if (actorId is null || expectedActorId is not null && expectedActorId != actorId.Value)
                return Unauthorized(DependentDecisionUnauthorizedMessage);

            await using var transaction = await ContinuityGuard.BeginTransactionAsync(HttpContext.RequestAborted);
            var actor = await _uow.UsuarioRepository.ObterAsync(user => user.Id == actorId.Value);
            if (actor is null || actor.Status != StatusUsuario.Habilitado ||
                actor.NivelUsuario is not (NivelUsuario.Administrador or NivelUsuario.Mentor))
            {
                return Forbid();
            }

            var solicitacao = await _uow.UsuarioRepository.ObterAsync(
                user => user.Id == solicitacaoId,
                query => query.Include(user => user.Responsavel));
            if (solicitacao is null)
                return ResourceNotFound();

            if (solicitacao.Status != StatusUsuario.Pendente)
                return BadRequest("Este usuário já foi processado (aprovado ou rejeitado).");

            if (!_usuarioService.PodeDecidir(actor, solicitacao))
            {
                return actor.NivelUsuario == NivelUsuario.Mentor
                    ? Unauthorized(DependentDecisionUnauthorizedMessage)
                    : BadRequest("Este usuário não está elegível para decisão.");
            }

            if (!await ContinuityGuard.CanApplyAsync(
                    solicitacao.Id,
                    solicitacao.NivelUsuario,
                    resultingStatus,
                    cancellationToken: HttpContext.RequestAborted))
            {
                return AdminContinuityProblem();
            }

            solicitacao.Status = resultingStatus;
            _uow.UsuarioRepository.Atualizar(solicitacao);
            await RegistrarAuditoriaObrigatoriaAsync(
                CodigoEventoAuditoria.DecisaoConta,
                actor.Id,
                $"usuario:{solicitacao.Id}:{resultingStatus}");
            await _uow.CommitAsync();
            await transaction.CommitAsync(HttpContext.RequestAborted);

            return Ok(new { Message = message, Usuario = _mapper.Map<DependenteDTO>(solicitacao) });
        }

        private Task RegistrarAuditoriaObrigatoriaAsync(
            CodigoEventoAuditoria code,
            int actorId,
            string resourceReference)
        {
            var auditService = _auditoriaService ??
                throw new InvalidOperationException("The mandatory account audit service is not configured.");

            return auditService.RegistrarEventoObrigatorioAsync(new CreateLogAuditoriaDTO
            {
                CodigoEvento = code,
                OrigemConfiavel = OrigemConfiavelAuditoria.UsuarioAutenticado,
                Resultado = ResultadoOperacaoAuditoria.Sucesso,
                UsuarioId = actorId,
                ReferenciaRecurso = resourceReference
            });
        }

        private static ConflictObjectResult AccountGrantConflict() => new(new ProblemDetails
        {
            Status = StatusCodes.Status409Conflict,
            Title = "A concessão administrativa não pode ser aplicada a esta conta."
        })
        {
            StatusCode = StatusCodes.Status409Conflict,
            ContentTypes = { "application/problem+json" }
        };

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
            await using var transaction = await ContinuityGuard.BeginTransactionAsync(HttpContext.RequestAborted);
            var usuario = await _uow.UsuarioRepository.ObterAsync(u => u.Id == id);

            if (usuario == null) return NotFound();

            if (!await ContinuityGuard.CanApplyAsync(id, usuario.NivelUsuario, usuario.Status,
                    delete: true, cancellationToken: HttpContext.RequestAborted))
                return AdminContinuityProblem();

            _uow.UsuarioRepository.Remover(usuario);
            await _uow.CommitAsync();
            await transaction.CommitAsync(HttpContext.RequestAborted);
            return NoContent();
        }
    }
}
