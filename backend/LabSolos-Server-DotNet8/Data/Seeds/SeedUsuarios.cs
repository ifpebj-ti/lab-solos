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

            var admin = new Administrador
            {
                Id = 1,
                NomeCompleto = "Administrador Exemplo",
                Email = "admin@exemplo.com",
                SenhaHash = passwordHasher.HashPassword(null!, "SenhaAdmin123"),
                Telefone = "123456789",
                DataIngresso = DateTime.UtcNow,
                NivelUsuario = NivelUsuario.Administrador,
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
                NivelUsuario = NivelUsuario.Mentor,
                TipoUsuario = TipoUsuario.Academico,
                Status = StatusUsuario.Habilitado,
                Instituicao = "Universidade Exemplo",
                Cidade = "Cidade Exemplo",
                Curso = "Curso Exemplo",
                ResponsavelId = admin.Id

            };
            var aluno = new Academico
            {
                Id = 3,
                NomeCompleto = "Aluno Exemplo",
                Email = "aluno@exemplo.com",
                SenhaHash = passwordHasher.HashPassword(null!, "SenhaAluno123"),
                Telefone = "5566778899",
                DataIngresso = DateTime.UtcNow,
                NivelUsuario = NivelUsuario.Mentorado,
                TipoUsuario = TipoUsuario.Academico,
                Status = StatusUsuario.Habilitado,
                Instituicao = "Universidade Exemplo",
                Cidade = "Cidade Exemplo",
                Curso = "Curso Exemplo",
                ResponsavelId = mentor.Id
            };

            Console.WriteLine(admin.ToString());

            context.Administradores.Add(admin);
            context.Academicos.AddRange(aluno, mentor);
        }
    }
}
