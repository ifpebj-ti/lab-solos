using LabSolos_Server_DotNet8.Enums;
using Microsoft.AspNetCore.Identity;

namespace LabSolos_Server_DotNet8.Models
{
    public class Usuario
    {
        public int Id { get; set; }
        public required string NomeCompleto { get; set; }
        public required string Email { get; set; }
        public required string SenhaHash { get;  set; }
        public string? Telefone { get; set; }
        public DateTime? DataIngresso { get; set; }
        public NivelUsuario NivelUsuario { get; set; }
        public TipoUsuario TipoUsuario { get; set; }
        public StatusUsuario Status { get; set; }

        public List<Emprestimo>? EmprestimosSolicitados { get; set; }
        public List<Emprestimo>? EmprestimosAprovados { get; set; }

        public int? ResponsavelId { get; set; }
        public Usuario? Responsavel { get; set; }
        public List<Usuario>? Dependentes { get; set; }

        public string? TokenRedefinicao { get; set; }
        public DateTime? TokenExpiracao { get; set; }

        // Método para definir o hash da senha
        public void DefinirSenha(string senha)
        {
            var passwordHasher = new PasswordHasher<Usuario>();
            SenhaHash = passwordHasher.HashPassword(this, senha); // Aplica o hash à senha
        }

        // Método para verificar se a senha fornecida está correta
        public bool VerificarSenha(string senha)
        {
            var passwordHasher = new PasswordHasher<Usuario>();
            var resultado = passwordHasher.VerifyHashedPassword(this, SenhaHash, senha);
            return resultado == PasswordVerificationResult.Success;
        }
    }
}