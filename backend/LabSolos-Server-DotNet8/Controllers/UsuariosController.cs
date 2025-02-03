using LabSolos_Server_DotNet8.DTOs.Emprestimos;
using LabSolos_Server_DotNet8.DTOs.Usuarios;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LabSolos_Server_DotNet8.Controllers
{
    [ApiController]
    //[Authorize]
    [Route("api/[controller]")]
    public class UsuariosController(IUsuarioService usuarioService, IEmprestimoService emprestimoService, ILogger<UsuariosController> logger) : ControllerBase
    {
        private readonly IUsuarioService _usuarioService = usuarioService;
        private readonly IEmprestimoService _emprestimoService = emprestimoService;

        private readonly ILogger<UsuariosController> _logger = logger;


        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var usuarios = await _usuarioService.GetAllAsync();
            return Ok(usuarios);
        }

        [HttpGet("tipo/{tipoUsuario}")]
        public async Task<IActionResult> GetByTipo(int tipoUsuario)
        {
            _logger.LogInformation("Iniciando operação para obter usuarios do tipo {Tipo}.", (TipoUsuario)tipoUsuario);

            // Validação do tipo com o enum
            if (!Enum.IsDefined(typeof(TipoUsuario), tipoUsuario))
            {
                _logger.LogWarning("Tipo de usuario inválido: {Tipo}", tipoUsuario);
                return BadRequest("Tipo de usuario inválido. Use um valor de TipoUsuario válido.");
            }

            var tipoEnum = (TipoUsuario)tipoUsuario;


            var usuarios = await _usuarioService.GetUsuariosByTipoAsync(tipoEnum);
            return Ok(usuarios);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var usuario = await _usuarioService.GetByIdAsync(id);
            if (usuario == null) return NotFound();
            return Ok(usuario);
        }

        [HttpGet("{usuarioId}/dependentes/emprestimos")]
        public async Task<IActionResult> GetEmprestimosDosDependentes(int usuarioId)
        {
            // Buscar o usuário principal para garantir que ele exista
            var usuario = await _usuarioService.GetByIdAsync(usuarioId);
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

            // Obter todos os empréstimos dos dependentes
            var emprestimosDependentes = new List<Emprestimo>();

            foreach (var dependente in dependentes)
            {
                var emprestimos = await _emprestimoService.GetEmprestimosSolicitadosUsuario(dependente.Id);
                emprestimosDependentes.AddRange(emprestimos);
            }

            if (emprestimosDependentes.Count == 0)
            {
                return NotFound("Nenhum empréstimo encontrado para os dependentes.");
            }

            return Ok(emprestimosDependentes);
        }

        [HttpGet("{usuarioId}/dependentes")]
        public async Task<IActionResult> GetDependentes(int usuarioId)
        {
            // Buscar o usuário principal para garantir que ele exista
            var usuario = await _usuarioService.GetByIdAsync(usuarioId);
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
            var dependentesDto = dependentes.Select(dependente => new DependenteDTO
            {
                Id = dependente.Id,
                Email = dependente.Email,
                NomeCompleto = dependente.NomeCompleto,
                NivelUsuario = dependente.NivelUsuario.ToString(),
                Cidade = (dependente as Academico)?.Cidade ?? null,
                Curso = (dependente as Academico)?.Curso ?? null,
                Instituicao = (dependente as Academico)?.Instituicao ?? null,
                Telefone = dependente.Telefone,
                Status = dependente.Status.ToString(),
                DataIngresso = dependente.DataIngresso,
            });

            return Ok(dependentesDto);
        }

        [HttpGet("{usuarioId}/dependentes/aprovacao")]
        public async Task<IActionResult> GetDependentesParaAprovacao(int usuarioId)
        {
            // Buscar o usuário principal para garantir que ele existe
            var usuario = await _usuarioService.GetByIdAsync(usuarioId);
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
            var dependentesDto = dependentesPendentes.Select(dependente => new DependenteDTO
            {
                Id = dependente.Id,
                Email = dependente.Email,
                NomeCompleto = dependente.NomeCompleto,
                NivelUsuario = dependente.NivelUsuario.ToString(),
                Cidade = (dependente as Academico)?.Cidade ?? null,
                Curso = (dependente as Academico)?.Curso ?? null,
                Instituicao = (dependente as Academico)?.Instituicao ?? null,
                Telefone = dependente.Telefone,
                Status = dependente.Status.ToString(),
                DataIngresso = dependente.DataIngresso,
            });

            return Ok(dependentesDto);
        }

        [HttpPost]
        public async Task<IActionResult> Add(AddUsuarioDTO usuarioDto)
        {

            var responsavel = await _usuarioService.GetByEmailAsync(usuarioDto.ResponsavelEmail);

            if (responsavel == null) return NotFound("O email do responsável informado não pertence a nenhum usuário válido");

            var niveisAcademico = new[] { "Mentor", "Mentorado" };

            // Validar os dados do usuário através do serviço
            var resultadoValidacao = _usuarioService.ValidarEstrutura(usuarioDto);
            if (!resultadoValidacao.Validado)
            {
                return BadRequest(new { Message = resultadoValidacao.Mensagem });
            }

            // Criar o objeto de acordo com o tipo
            Usuario usuario = usuarioDto.NivelUsuario switch
            {
                "Mentor" => new Academico
                {
                    NomeCompleto = usuarioDto.NomeCompleto,
                    Email = usuarioDto.Email,
                    SenhaHash = usuarioDto.Senha,
                    ResponsavelId = responsavel.Id,
                    Telefone = usuarioDto.Telefone,
                    NivelUsuario = NivelUsuario.Mentor,
                    TipoUsuario = TipoUsuario.Academico,
                    Status = StatusUsuario.Pendente,
                    DataIngresso = DateTime.Now,
                    Instituicao = usuarioDto.Instituicao!,
                    Cidade = usuarioDto.Cidade,
                    Curso = usuarioDto.Curso!
                },
                "Mentorado" => new Academico
                {
                    NomeCompleto = usuarioDto.NomeCompleto,
                    Email = usuarioDto.Email,
                    SenhaHash = usuarioDto.Senha,
                    ResponsavelId = responsavel.Id,
                    Telefone = usuarioDto.Telefone,
                    NivelUsuario = NivelUsuario.Mentorado,
                    TipoUsuario = TipoUsuario.Academico,
                    Status = StatusUsuario.Pendente,
                    DataIngresso = DateTime.Now,
                    Instituicao = usuarioDto.Instituicao!,
                    Cidade = usuarioDto.Cidade,
                    Curso = usuarioDto.Curso!
                },
                "Comum" => new Usuario
                {
                    NomeCompleto = usuarioDto.NomeCompleto,
                    Email = usuarioDto.Email,
                    SenhaHash = usuarioDto.Senha,
                    ResponsavelId = responsavel.Id,
                    Telefone = usuarioDto.Telefone,
                    NivelUsuario = NivelUsuario.Comum,
                    TipoUsuario = TipoUsuario.Comum,
                    Status = StatusUsuario.Pendente,
                    DataIngresso = DateTime.Now
                },
                _ => throw new InvalidOperationException("O nivel fornecido não é suportado.")
            };

            await _usuarioService.AddAsync(usuario);

            return CreatedAtAction(nameof(GetById), new { id = usuario.Id }, usuario);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] Usuario usuario)
        {
            if (id != usuario.Id) return BadRequest("ID do usuário não corresponde.");
            await _usuarioService.UpdateAsync(usuario);
            return NoContent();
        }

        [HttpPatch("dependentes/{dependenteId}/aprovar")]
        public async Task<IActionResult> AprovarUsuario(int dependenteId, [FromBody] AprovarDTO aprovadorDto)
        {
            // Buscar o usuário dependente pelo ID
            var dependente = await _usuarioService.GetByIdAsync(dependenteId);
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
            await _usuarioService.UpdateAsync(dependente);

            return Ok(new { Message = "Usuário aprovado com sucesso.", Usuario = dependente });
        }


        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            await _usuarioService.DeleteAsync(id);
            return NoContent();
        }
    }
}
