using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Enums;
using Microsoft.AspNetCore.Identity;

namespace LabSolos_Server_DotNet8.Data.Seeds
{
    public static partial class DbSeeder
    {
        public static void SeedProduction(AppDbContext context)
        {
            var passwordHasher = new PasswordHasher<Usuario>();

            // Verificar se o banco está completamente vazio
            if (IsDatabaseEmpty(context))
            {
                // Adicionar o usuário administrador
                context.Usuarios.Add(new Usuario
                {
                    Id = 1,
                    NomeCompleto = "Rosemberg de Vasconcelos Bezerra",
                    Email = "lab.solos@belojardim.ifpe.edu.br",
                    SenhaHash = passwordHasher.HashPassword(null!, "SenhaLab123"),
                    Telefone = "",
                    DataIngresso = DateTime.UtcNow,
                    NivelUsuario = NivelUsuario.Administrador,
                    TipoUsuario = TipoUsuario.Administrador,
                    Status = StatusUsuario.Habilitado
                });

                context.SaveChanges();
            }
        }       
    }
}