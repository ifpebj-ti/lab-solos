using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.DTOs;
using LabSolos_Server_DotNet8.DTOs.Usuarios;

namespace LabSolos_Server_DotNet8.Services
{
    public interface IUsuarioService
    {
        ResultadoValidacaoDTO ValidarEstrutura(AddUsuarioDTO usuarioDto);
    }
    
    public class UsuarioService(ILogger<UsuarioService> logger) : IUsuarioService
    {
        private readonly ILogger<UsuarioService> _logger = logger;

        public readonly string[] NiveisAcademico = ["Mentor", "Mentorado"];


        public ResultadoValidacaoDTO ValidarEstrutura(AddUsuarioDTO usuarioDto)
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
