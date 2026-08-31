using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.DTOs;
using LabSolos_Server_DotNet8.DTOs.Usuarios;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.AspNetCore.Identity;

namespace LabSolos_Server_DotNet8.Services
{
    public interface IUsuarioService
    {
        ResultadoValidacaoDTO ValidarEstrutura(AddUsuarioDTO usuarioDto);
        PasswordPolicyResult PrepararSenhaCadastro(Usuario usuario, string? senha);
    }
    
    public class UsuarioService(
        ILogger<UsuarioService> logger,
        IPasswordPolicy passwordPolicy,
        IPasswordHasher<Usuario> passwordHasher) : IUsuarioService
    {
        private readonly ILogger<UsuarioService> _logger = logger;
        private readonly IPasswordPolicy _passwordPolicy = passwordPolicy;
        private readonly IPasswordHasher<Usuario> _passwordHasher = passwordHasher;

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

        public PasswordPolicyResult PrepararSenhaCadastro(Usuario usuario, string? senha)
        {
            ArgumentNullException.ThrowIfNull(usuario);

            var policyResult = _passwordPolicy.Validate(senha);
            if (!policyResult.IsValid)
            {
                _logger.LogInformation(
                    "Cadastro de usuário rejeitado pela política de senha; motivo {Reason}",
                    policyResult.Code ?? "password_invalid");
                return policyResult;
            }

            usuario.SenhaHash = _passwordHasher.HashPassword(usuario, senha!);
            usuario.ExigeTrocaSenha = false;
            return PasswordPolicyResult.Valid;
        }
    }
}
