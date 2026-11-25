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
        UsuarioValidationResult ValidarEstrutura(AddUsuarioDTO usuarioDto);
        PasswordPolicyResult PrepararSenhaCadastro(Usuario usuario, string? senha);
        bool PodeDecidir(Usuario ator, Usuario solicitacao);
        IEnumerable<Usuario> FiltrarSolicitacoesElegiveis(Usuario ator, IEnumerable<Usuario> solicitacoes);
    }
    
    public class UsuarioService(
        ILogger<UsuarioService> logger,
        IPasswordPolicy passwordPolicy,
        IPasswordHasher<Usuario> passwordHasher) : IUsuarioService
    {
        private static readonly Action<ILogger, string, Exception?> LogPasswordPolicyRejected =
            LoggerMessage.Define<string>(
                LogLevel.Information,
                new EventId(1001, nameof(LogPasswordPolicyRejected)),
                "Cadastro de usuário rejeitado pela política de senha; motivo {Reason}");

        private readonly ILogger<UsuarioService> _logger = logger;
        private readonly IPasswordPolicy _passwordPolicy = passwordPolicy;
        private readonly IPasswordHasher<Usuario> _passwordHasher = passwordHasher;

        private const string InvalidCityMessage = "Informe uma cidade válida.";
        private const string InvalidCourseMessage = "O curso deve ter entre 2 e 100 caracteres.";

        private static readonly string[] NiveisAcademico = ["Mentor", "Mentorado"];


        public UsuarioValidationResult ValidarEstrutura(AddUsuarioDTO usuarioDto)
        {
            if (!string.IsNullOrWhiteSpace(usuarioDto.Email))
                usuarioDto.Email = EmailAddressReservationService.Normalize(usuarioDto.Email);

            if (!PoliticaContas.TryGetPublicRole(usuarioDto, out _))
            {
                return UsuarioValidationResult.Invalid(
                    "Selecione Mentor ou Mentorado para o cadastro acadêmico.");
            }

            // Preservar as validações estruturais acadêmicas existentes.
            if (!NiveisAcademico.Contains(usuarioDto.NivelUsuario) || string.IsNullOrEmpty(usuarioDto.Instituicao))
            {
                return UsuarioValidationResult.Invalid(
                    $"Para o tipo 'Academico', os campos 'Instituicao', 'Cidade' e 'Curso' são obrigatórios, e os níveis permitidos são: {string.Join(", ", NiveisAcademico)}.");
            }

            usuarioDto.Cidade = usuarioDto.Cidade?.Trim();
            usuarioDto.Curso = usuarioDto.Curso?.Trim();

            var errors = new Dictionary<string, string[]>();
            if (string.IsNullOrEmpty(usuarioDto.Cidade) ||
                string.Equals(usuarioDto.Cidade, "Indefinido", StringComparison.OrdinalIgnoreCase))
            {
                errors["cidade"] = [InvalidCityMessage];
            }

            if (usuarioDto.Curso is null || usuarioDto.Curso.Length is < 2 or > 100)
            {
                errors["curso"] = [InvalidCourseMessage];
            }

            return errors.Count == 0
                ? UsuarioValidationResult.Valid()
                : UsuarioValidationResult.Invalid(errors);
        }

        public PasswordPolicyResult PrepararSenhaCadastro(Usuario usuario, string? senha)
        {
            ArgumentNullException.ThrowIfNull(usuario);

            var policyResult = _passwordPolicy.Validate(senha);
            if (!policyResult.IsValid)
            {
                LogPasswordPolicyRejected(
                    _logger,
                    policyResult.Code ?? "password_invalid",
                    null);
                return policyResult;
            }

            usuario.SenhaHash = _passwordHasher.HashPassword(usuario, senha!);
            usuario.ExigeTrocaSenha = false;
            return PasswordPolicyResult.Valid;
        }

        public bool PodeDecidir(Usuario ator, Usuario solicitacao)
        {
            ArgumentNullException.ThrowIfNull(ator);
            ArgumentNullException.ThrowIfNull(solicitacao);

            return PoliticaContas.CanDecide(ator, solicitacao) &&
                (solicitacao.NivelUsuario != NivelUsuario.Mentorado ||
                 PoliticaContas.IsEligibleResponsible(solicitacao.Responsavel));
        }

        public IEnumerable<Usuario> FiltrarSolicitacoesElegiveis(
            Usuario ator,
            IEnumerable<Usuario> solicitacoes)
        {
            ArgumentNullException.ThrowIfNull(solicitacoes);
            return solicitacoes.Where(solicitacao => PodeDecidir(ator, solicitacao));
        }
    }
}
