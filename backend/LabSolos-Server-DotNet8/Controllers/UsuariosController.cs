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

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            await _usuarioService.DeleteAsync(id);
            return NoContent();
        }
    }
}
