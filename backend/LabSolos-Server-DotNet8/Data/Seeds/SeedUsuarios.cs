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

            var admin1 = new Administrador
            {
                NomeCompleto = "Ricardo Almeida",
                Email = "ricardo.almeida@labs.com",
                SenhaHash = passwordHasher.HashPassword(null!, "SenhaAdmin123"),
                Telefone = "21987654321",
                DataIngresso = DateTime.UtcNow.AddYears(-3),
                NivelUsuario = NivelUsuario.Administrador,
                TipoUsuario = TipoUsuario.Administrador,
                Status = StatusUsuario.Habilitado
            };

            var admin2 = new Administrador
            {
                NomeCompleto = "Fernanda Costa",
                Email = "fernanda.costa@labs.com",
                SenhaHash = passwordHasher.HashPassword(null!, "SenhaAdmin456"),
                Telefone = "31976543210",
                DataIngresso = DateTime.UtcNow.AddYears(-2),
                NivelUsuario = NivelUsuario.Administrador,
                TipoUsuario = TipoUsuario.Administrador,
                Status = StatusUsuario.Habilitado
            };

            context.Administradores.AddRange(admin1, admin2);
            context.SaveChanges();

            var mentor1 = new Academico
            {
                NomeCompleto = "Dr. João Mendes",
                Email = "joao.mendes@universidade.com",
                SenhaHash = passwordHasher.HashPassword(null!, "SenhaMentor123"),
                Telefone = "41999887766",
                DataIngresso = DateTime.UtcNow.AddYears(-5),
                NivelUsuario = NivelUsuario.Mentor,
                TipoUsuario = TipoUsuario.Academico,
                Status = StatusUsuario.Habilitado,
                Instituicao = "Universidade Federal de Minas Gerais",
                Cidade = "Belo Horizonte",
                Curso = "Engenharia Agronômica",
                ResponsavelId = admin1.Id
            };

            var mentor2 = new Academico
            {
                NomeCompleto = "Dra. Camila Ribeiro",
                Email = "camila.ribeiro@universidade.com",
                SenhaHash = passwordHasher.HashPassword(null!, "SenhaMentor456"),
                Telefone = "51988776655",
                DataIngresso = DateTime.UtcNow.AddYears(-4),
                NivelUsuario = NivelUsuario.Mentor,
                TipoUsuario = TipoUsuario.Academico,
                Status = StatusUsuario.Habilitado,
                Instituicao = "Universidade de São Paulo",
                Cidade = "São Paulo",
                Curso = "Ciência do Solo",
                ResponsavelId = admin2.Id
            };

            context.Academicos.AddRange(mentor1, mentor2);
            context.SaveChanges();

            var aluno1 = new Academico
            {
                NomeCompleto = "Carlos Eduardo",
                Email = "carlos.eduardo@estudante.com",
                SenhaHash = passwordHasher.HashPassword(null!, "SenhaAluno123"),
                Telefone = "61977665544",
                DataIngresso = DateTime.UtcNow.AddMonths(-6),
                NivelUsuario = NivelUsuario.Mentorado,
                TipoUsuario = TipoUsuario.Academico,
                Status = StatusUsuario.Habilitado,
                Instituicao = "Universidade Federal de Minas Gerais",
                Cidade = "Belo Horizonte",
                Curso = "Engenharia Agronômica",
                ResponsavelId = mentor1.Id
            };

            var aluno2 = new Academico
            {
                NomeCompleto = "Mariana Oliveira",
                Email = "mariana.oliveira@estudante.com",
                SenhaHash = passwordHasher.HashPassword(null!, "SenhaAluno456"),
                Telefone = "71966554433",
                DataIngresso = DateTime.UtcNow.AddMonths(-4),
                NivelUsuario = NivelUsuario.Mentorado,
                TipoUsuario = TipoUsuario.Academico,
                Status = StatusUsuario.Habilitado,
                Instituicao = "Universidade de São Paulo",
                Cidade = "São Paulo",
                Curso = "Ciência do Solo",
                ResponsavelId = mentor2.Id
            };

            var aluno3 = new Academico
            {
                NomeCompleto = "Lucas Ferreira",
                Email = "lucas.ferreira@estudante.com",
                SenhaHash = passwordHasher.HashPassword(null!, "SenhaAluno789"),
                Telefone = "81955443322",
                DataIngresso = DateTime.UtcNow.AddMonths(-3),
                NivelUsuario = NivelUsuario.Mentorado,
                TipoUsuario = TipoUsuario.Academico,
                Status = StatusUsuario.Habilitado,
                Instituicao = "Universidade Federal do Rio Grande do Sul",
                Cidade = "Porto Alegre",
                Curso = "Biotecnologia",
                ResponsavelId = mentor1.Id
            };

            context.Academicos.AddRange(aluno1, aluno2, aluno3);
            context.SaveChanges();
        }
    }
}
