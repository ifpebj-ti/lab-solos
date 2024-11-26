using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using Microsoft.AspNetCore.Identity;

namespace LabSolos_Server_DotNet8.Data.Seeds
{
    public static class SeedUsuarios
    {
        public static void Seed(AppDbContext context)
        {
            var passwordHasher = new PasswordHasher<Usuario>();

            var admin = new Usuario
            {
                Id = 1,
                NomeCompleto = "Administrador Exemplo",
                Email = "admin@exemplo.com",
                SenhaHash = passwordHasher.HashPassword(null!, "SenhaAdmin123"),
                Telefone = "123456789",
                DataIngresso = DateTime.UtcNow,
                TipoUsuario = TipoUsuario.Administrador,
                Status = StatusUsuario.Habilitado
            };
            var mentor = new Academico
            {
                Id = 2,
                NomeCompleto = "Professor Exemplo",
                Email = "mentor@exemplo.com",
                SenhaHash = passwordHasher.HashPassword(null!, "SenhaMentor123"),
                Telefone = "987654321",
                DataIngresso = DateTime.UtcNow,
                TipoUsuario = TipoUsuario.Mentor,
                Status = StatusUsuario.Habilitado,
                Instituição = "Universidade Exemplo",
                Cidade = "Cidade Exemplo",
                Curso = "Curso Exemplo"
            };
            var aluno = new Academico
            {
                Id = 3,
                NomeCompleto = "Aluno Exemplo",
                Email = "aluno@exemplo.com",
                SenhaHash = passwordHasher.HashPassword(null!, "SenhaAluno123"),
                Telefone = "5566778899",
                DataIngresso = DateTime.UtcNow,
                TipoUsuario = TipoUsuario.Mentee,
                Status = StatusUsuario.Habilitado,
                Instituição = "Universidade Exemplo",
                Cidade = "Cidade Exemplo",
                Curso = "Curso Exemplo"
            };

            Console.WriteLine(admin.ToString());

            context.Usuarios.Add(admin);
            context.Academicos.AddRange(aluno, mentor);
        }
    }
}
