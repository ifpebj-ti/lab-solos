using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Enums;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;

namespace LabSolos_Server_DotNet8.Data.Seeds
{
    public static partial class DbSeeder
    {
        public static void SeedProduction(AppDbContext context, IConfiguration configuration)
        {
            var passwordHasher = new PasswordHasher<Usuario>();

            // Verificar se o banco está completamente vazio
            if (IsDatabaseEmpty(context))
            {
                var adminName = configuration["ProductionAdmin:Name"]
                    ?? throw new InvalidOperationException("Nome do administrador inicial não configurado.");
                var adminEmail = configuration["ProductionAdmin:Email"]
                    ?? throw new InvalidOperationException("Email do administrador inicial não configurado.");
                var adminPassword = configuration["ProductionAdmin:Password"]
                    ?? throw new InvalidOperationException("Senha do administrador inicial não configurada.");

                if (adminPassword.Length < 12)
                {
                    throw new InvalidOperationException("A senha do administrador inicial deve ter ao menos 12 caracteres.");
                }

                // Adicionar o usuário administrador
                context.Usuarios.Add(new Usuario
                {
                    NomeCompleto = adminName,
                    Email = adminEmail,
                    SenhaHash = passwordHasher.HashPassword(null!, adminPassword),
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
