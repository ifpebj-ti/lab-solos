using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.DTOs;
using LabSolos_Server_DotNet8.DTOs.Usuarios;

namespace LabSolos_Server_DotNet8.Services
{
    public class UsuarioService(IUsuarioRepository usuarioRepository, ILogger<UsuarioService> logger) : IUsuarioService
    {
        private readonly IUsuarioRepository _usuarioRepository = usuarioRepository;
        private readonly ILogger<UsuarioService> _logger = logger;

        public readonly string[] NiveisAcademico = ["Mentor", "Mentorado"];

        public async Task<Usuario?> ValidarUsuarioAsync(string email, string password)
        {
            return await _usuarioRepository.ValidarUsuarioAsync(email, password);
        }
    
        public async Task<IEnumerable<object>> GetUsuariosByTipoAsync(TipoUsuario tipoUsuario)
        {
            _logger.LogInformation("Iniciando operação para obter usuários do tipo {TipoUsuario}.", tipoUsuario);
            var usuarios = await _usuarioRepository.GetAllAsync();

            switch (tipoUsuario)
            {
                case TipoUsuario.Administrador:
                    var administradores = usuarios
                        .OfType<Administrador>()
                        .Select(a => new AdministradorDTO
                        {
                            Id = a.Id,
                            NomeCompleto = a.NomeCompleto,
                            Email = a.Email,
                            Telefone = a.Telefone,
                            DataIngresso = a.DataIngresso,
                            Status = a.Status.ToString()
                        }).ToList<object>();

                    _logger.LogInformation("{Count} administradores obtidos.", administradores.Count);
                    return administradores;

                case TipoUsuario.Academico:
                    var academicos = usuarios
                        .OfType<Academico>()
                        .Select(m => new AcademicoDTO
                        {
                            Id = m.Id,
                            NomeCompleto = m.NomeCompleto,
                            NivelUsuario = m.NivelUsuario.ToString(),
                            Email = m.Email,
                            Telefone = m.Telefone,
                            Instituicao = m.Instituicao,
                            Curso = m.Curso,
                            Status = m.Status.ToString()
                        }).ToList<object>();

                    _logger.LogInformation("{Count} academicos obtidos.", academicos.Count);
                    return academicos;

                default:
                    _logger.LogWarning("Tipo de usuário especificado ({TipoUsuario}) ainda não tem implementação.", tipoUsuario);
                    throw new NotImplementedException("Tipo de usuário não implementado.");
            }
        }


        public async Task<IEnumerable<Usuario>> GetAllAsync()
        {
            return await _usuarioRepository.GetAllAsync();
        }

        public async Task<Usuario?> GetByIdAsync(int id)
        {
            return await _usuarioRepository.GetByIdAsync(id);
        }

        public async Task AddAsync(Usuario usuario)
        {
            await _usuarioRepository.AddAsync(usuario);
        }

        public async Task UpdateAsync(Usuario usuario)
        {
            await _usuarioRepository.UpdateAsync(usuario);
        }

        public async Task DeleteAsync(int id)
        {
            await _usuarioRepository.DeleteAsync(id);
        }

        public async Task<ResultadoValidacaoDTO> ValidarEstrutura(AddUsuarioDTO usuarioDto)
        {
            // Verificar se o nivel e tipo são consistentes
            if (NiveisAcademico.Contains(usuarioDto.NivelUsuario) && usuarioDto.TipoUsuario != "Academico")
            {
                return new ResultadoValidacaoDTO
                {
                    Validado = false, 
                    Mensagem = $"Se o nível de usuário for '{usuarioDto.NivelUsuario}', o tipo de usuário deve ser 'Academico'."
                };
            }

            // Verificar se os campos obrigatórios para o tipo 'Academico' estão preenchidos
            if (usuarioDto.TipoUsuario == "Academico" && (!NiveisAcademico.Contains(usuarioDto.NivelUsuario) || string.IsNullOrEmpty(usuarioDto.Instituicao) || string.IsNullOrEmpty(usuarioDto.Curso) || string.IsNullOrEmpty(usuarioDto.Cidade)))
            {
                return new ResultadoValidacaoDTO
                {
                    Validado = false, 
                    Mensagem = $"Para o tipo 'Academico', os campos 'Instituicao', 'Cidade' e 'Curso' são obrigatórios, e os níveis permitidos são: {string.Join(", ", NiveisAcademico)}."
                };
            }

            // Se todas as validações passarem
            return new ResultadoValidacaoDTO
            {
                Validado = true, 
                Mensagem = string.Empty
            };
        }
    }
}
