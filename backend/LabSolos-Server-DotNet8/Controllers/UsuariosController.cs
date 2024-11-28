using LabSolos_Server_DotNet8.DTOs.Usuarios;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Mvc;

namespace LabSolos_Server_DotNet8.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsuariosController(IUsuarioService usuarioService, ILogger<UsuariosController> logger) : ControllerBase
    {
        private readonly IUsuarioService _usuarioService = usuarioService;
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

            try
            {
                var usuarios = await _usuarioService.GetUsuariosByTipoAsync(tipoEnum);
                return Ok(usuarios);
            }
            catch (NotImplementedException ex)
            {
                _logger.LogWarning("Erro na obtenção de usuarios: {Message}", ex.Message);
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var usuario = await _usuarioService.GetByIdAsync(id);
            if (usuario == null) return NotFound();
            return Ok(usuario);
        }

        [HttpPost]
        public async Task<IActionResult> Add([FromBody] AddUsuarioDTO usuarioDto)
        {
            // Criação do objeto usuário
            Usuario usuario = usuarioDto switch
            {
                AddAcademicoDTO academicoDto => new Academico
                {
                    NomeCompleto = academicoDto.NomeCompleto,
                    Email = academicoDto.Email,
                    SenhaHash = academicoDto.Senha,
                    Telefone = academicoDto.Telefone,
                    NivelUsuario = (NivelUsuario) academicoDto.NivelUsuario,
                    TipoUsuario = TipoUsuario.Academico,
                    Status = StatusUsuario.Pendente,
                    DataIngresso = DateTime.Now,
                    EmprestimosSolicitados = [], // Inicia listas vazias
                    EmprestimosAprovados = [],
                    // Atribuição dos campos específicos do acadêmico
                    Instituicao = academicoDto.Instituicao,
                    Curso = academicoDto.Curso,
                },
                AddAdministradorDTO administradorDTO => new Administrador
                {
                    NomeCompleto = administradorDTO.NomeCompleto,
                    Email = administradorDTO.Email,
                    SenhaHash = administradorDTO.Senha,
                    Telefone = administradorDTO.Telefone,
                    NivelUsuario = (NivelUsuario) administradorDTO.NivelUsuario,
                    TipoUsuario = TipoUsuario.Administrador, // Para usuários comuns
                    Status = StatusUsuario.Pendente,
                    DataIngresso = DateTime.Now
                },
                _ => new Usuario
                {
                    NomeCompleto = usuarioDto.NomeCompleto,
                    Email = usuarioDto.Email,
                    SenhaHash = usuarioDto.Senha,
                    Telefone = usuarioDto.Telefone,
                    NivelUsuario = (NivelUsuario) usuarioDto.NivelUsuario,
                    TipoUsuario = TipoUsuario.Administrador, // Para usuários comuns
                    Status = StatusUsuario.Pendente,
                    DataIngresso = DateTime.Now
                }
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
