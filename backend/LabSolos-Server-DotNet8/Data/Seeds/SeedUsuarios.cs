using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using Microsoft.AspNetCore.Identity;

namespace LabSolos_Server_DotNet8.Data.Seeds
{
    public static class SeedUsuarios
    {
        public static void Seed(AppDbContext context, IConfiguration configuration)
        {
            var adminPassword = configuration["Seed:AdminPassword"];

            if (string.IsNullOrEmpty(adminPassword))
            {
                throw new Exception("A senha do administrador (Seed:AdminPassword) não foi configurada.");
            }

            var passwordHasher = new PasswordHasher<Usuario>();

            var admin1 = new Administrador
            {
                NomeCompleto = "Ricardo Almeida",
                Email = "ricardo.almeida@labs.com",
                SenhaHash = passwordHasher.HashPassword(null!, adminPassword),
                Telefone = "21987654321",
                DataIngresso = DateTime.UtcNow.AddYears(-3),
                NivelUsuario = NivelUsuario.Administrador,
                TipoUsuario = TipoUsuario.Administrador,
                Status = StatusUsuario.Habilitado
            };
            context.Administradores.Add(admin1);
            context.SaveChanges();
        }
    }
}
