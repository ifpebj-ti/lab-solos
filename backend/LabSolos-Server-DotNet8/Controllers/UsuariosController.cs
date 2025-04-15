using AutoMapper;
using LabSolos_Server_DotNet8.DTOs.Emprestimos;
using LabSolos_Server_DotNet8.DTOs.Usuarios;
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
    //[Authorize]
    [Route("api/[controller]")]
    public class UsuariosController : ControllerBase
    {
        private readonly ILogger<UsuariosController> _logger;
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;
        private readonly IUsuarioService _usuarioService;
        private readonly IUtilitiesService _utilsService;

        public UsuariosController(
            ILogger<UsuariosController> logger,
            IUtilitiesService utilsService,
            IUnitOfWork uow,
            IMapper mapper,
            IUsuarioService usuarioService)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _utilsService = utilsService ?? throw new ArgumentNullException(nameof(utilsService));
            _uow = uow ?? throw new ArgumentNullException(nameof(uow));
            _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
            _usuarioService = usuarioService ?? throw new ArgumentNullException(nameof(usuarioService));
        }

        [HttpGet]
        [Authorize("ApenasAdministradoreses")]
        public async Task<IActionResult> ObterTodos()
        {
            var usuarios = await _uow.UsuarioRepository.ObterTodosAsync(u => true, query => query.Include(u => u.Responsavel));
            return Ok(_mapper.Map<IEnumerable<UsuarioDTO>>(usuarios));
        }

        [HttpGet("tipo/{tipoUsuario}")]
        [Authorize]
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
            var usuario = await _uow.UsuarioRepository.ObterAsync(u => u.Id == id, query => query.Include(u => u.Responsavel));
            if (usuario == null) return NotFound();

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
            // Buscar o usuário principal para garantir que ele exista
            var usuario = await _uow.UsuarioRepository.ObterAsync(u => u.Id == usuarioId, query => query.Include(u => u.Dependentes));
            if (usuario == null)
            {
                return NotFound("Usuário não encontrado.");
            }

            if (usuario.Dependentes == null || usuario.Dependentes.Count == 0)
            {
                return NotFound("Este usuário não possui dependentes.");
            }

            // Obter todos os empréstimos dos dependentes
            var emprestimosDependentesDTO = new List<EmprestimoDTO>();

            foreach (var dependente in usuario.Dependentes)
            {
                var emprestimos = await _uow.EmprestimoRepository.ObterTodosAsync(
                    e => e.SolicitanteId == dependente.Id,
                    query => query.Include(e => e.Produtos)
                                  .ThenInclude(ep => ep.Produto)
                                  .ThenInclude(p => p.Lote));

                var emprestimosDTO = _mapper.Map<IEnumerable<EmprestimoDTO>>(emprestimos);
                emprestimosDependentesDTO.AddRange(emprestimosDTO);
            }

            if (emprestimosDependentesDTO.Count == 0)
            {
                return NotFound("Nenhum empréstimo encontrado para os dependentes.");
            }

            return Ok(emprestimosDependentesDTO);
        }

        [HttpGet("{usuarioId}/dependentes")]
        [Authorize("ApenasResponsaveis")]
        public async Task<IActionResult> ObterDependentes(int usuarioId)
        {
            // Buscar o usuário principal para garantir que ele exista
            var usuario = await _uow.UsuarioRepository.ObterAsync(u => u.Id == usuarioId, query => query.Include(u => u.Dependentes));
            if (usuario == null)
            {
                return NotFound("Usuário não encontrado.");
            }

            // Buscar os dependentes desse usuário
            var dependentes = usuario.Dependentes;
            if (dependentes == null || dependentes.Count == 0)
            {
                return NotFound("Este usuário não possui dependentes.");
            }

            var dependentesDto = _mapper.Map<IEnumerable<DependenteDTO>>(dependentes);

            return Ok(dependentesDto);
        }

        [HttpGet("{usuarioId}/dependentes/aprovacao")]
        [Authorize("ApenasResponsaveis")]
        public async Task<IActionResult> ObterDependentesParaAprovacao(int usuarioId)
        {
            // Buscar o usuário principal para garantir que ele existe
            var usuario = await _uow.UsuarioRepository.ObterAsync(u => u.Id == usuarioId, query => query.Include(u => u.Dependentes));
            if (usuario == null)
            {
                return NotFound("Usuário não encontrado.");
            }

            // Buscar os dependentes desse usuário que ainda estão pendentes de aprovação
            var dependentesPendentes = usuario.Dependentes?
                .Where(dependente => dependente.Status == StatusUsuario.Pendente)
                .ToList();

            if (dependentesPendentes is null || dependentesPendentes.Count == 0)
            {
                return NotFound("Nenhum dependente aguarda aprovação.");
            }

            // Mapear para DTO
            var dependentesDto = _mapper.Map<IEnumerable<DependenteDTO>>(dependentesPendentes);

            return Ok(dependentesDto);
        }

        [HttpGet("aprovacao")]
        [Authorize("ApenasAdministradoreses")]
        public async Task<IActionResult> ObterUsuariosParaAprovacao()
        {
            // Buscar o usuário principal para garantir que ele existe
            var usuarios = await _uow.UsuarioRepository.ObterTodosAsync(u => u.Status == StatusUsuario.Pendente);
            if (!usuarios.Any())
            {
                return NotFound("Nenhum usuário encontrado");
            }

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
                    return Forbid("Você não tem permissão para adicionar um usuário do tipo Administrador. Apenas administradores podem realizar essa ação.");
                }

                int? responsavelId = null;

                if (addUsuarioDTO.NivelUsuario == NivelUsuario.Mentor.ToString() && addUsuarioDTO.ResponsavelEmail is not null)
                {
                    var responsavel = await _uow.UsuarioRepository.ObterAsync(u => u.Email == addUsuarioDTO.ResponsavelEmail);

                    if (responsavel == null)
                        return NotFound("O email do responsável informado não pertence a nenhum usuário válido");

                    responsavelId = responsavel.Id;
                }

                // Validar os dados do usuário através do serviço
                var resultadoValidacao = _usuarioService.ValidarEstrutura(addUsuarioDTO);
                if (!resultadoValidacao.Validado)
                {
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

                usuario.DefinirSenha(addUsuarioDTO.Senha);
                usuario.DataIngresso = DateTime.UtcNow;
                usuario.ResponsavelId = responsavelId;
                usuario.Status = StatusUsuario.Pendente;

                _uow.UsuarioRepository.Criar(usuario);
                await _uow.CommitAsync();

                return CreatedAtAction(nameof(ObterPeloId), new { id = usuario.Id }, _mapper.Map<UsuarioDTO>(usuario));
            }
            catch (ArgumentException e)
            {
                return BadRequest(e.Message);
            }
        }

        [HttpPatch("{usuarioId}")]
        [Authorize]
        public async Task<ActionResult<UsuarioDTOPatchResponse>> AtualizarParcialmente(int usuarioId, JsonPatchDocument<UsuarioDTOPatchRequest> patchUsuarioDto)
        {
            if (patchUsuarioDto is null)
                return BadRequest();

            //obtem o usuario pelo Id
            var usuario = await _uow.UsuarioRepository.ObterAsync(f => f.Id == usuarioId);

            //se não econtrou retorna
            if (usuario is null)
                return NotFound("Usuario não existe");

            //mapeia usuario para usuarioDTOPatchRequest
            var usuarioPatchRequest = _mapper.Map<UsuarioDTOPatchRequest>(usuario);

            //aplica as alterações definidas no documento JSON Patch ao objeto usuarioDTOPatchRequest
            patchUsuarioDto.ApplyTo(usuarioPatchRequest, ModelState);

            if (!ModelState.IsValid || !TryValidateModel(usuarioPatchRequest))
                return BadRequest(ModelState);

            _mapper.Map(usuarioPatchRequest, usuario);

            _uow.UsuarioRepository.Atualizar(usuario);
            await _uow.CommitAsync();

            //retorna usuarioDTOPatchResponse
            return Ok(_mapper.Map<UsuarioDTOPatchResponse>(usuario));
        }

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

            // Verificar se o solicitante é um dependente do responsável indicado (AprovadorId)
            if (dependente.ResponsavelId != aprovadorDto.AprovadorId)
            {
                return Unauthorized("Você não tem permissão para aprovar este empréstimo, pois o solicitante não é um dependente do responsável indicado.");
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
        [Authorize(Policy = "ApenasAdministradoreses")]
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

            // Verificar se o solicitante é um dependente do responsável indicado (AprovadorId)
            if (dependente.ResponsavelId != aprovadorDto.AprovadorId)
            {
                return Unauthorized("Você não tem permissão para aprovar este empréstimo, pois o solicitante não é um dependente do responsável indicado.");
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
        [Authorize(Policy = "ApenasAdministradoreses")]
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

            return Ok(new { Message = "Usuário rejeitado com sucesso.", Usuario = dependente });
        }

        [HttpDelete("{id}")]
        [Authorize(Policy = "ApenasAdministradoreses")]
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
