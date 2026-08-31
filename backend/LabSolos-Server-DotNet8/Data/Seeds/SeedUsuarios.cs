using System.Net.Mail;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.AspNetCore.Identity;

namespace LabSolos_Server_DotNet8.Data.Seeds;

public static class SeedUsuarios
{
    public static void Seed(
        AppDbContext context,
        IConfiguration configuration,
        IPasswordPolicy passwordPolicy)
    {
        var adminEmail = configuration["Seed:AdminEmail"];
        if (string.IsNullOrWhiteSpace(adminEmail))
        {
            throw InvalidSeed("Seed:AdminEmail não foi configurada.");
        }

        if (!MailAddress.TryCreate(adminEmail, out var parsedEmail) ||
            !string.Equals(parsedEmail.Address, adminEmail, StringComparison.OrdinalIgnoreCase))
        {
            throw InvalidSeed("Seed:AdminEmail possui formato inválido.");
        }

        var adminPassword = configuration["Seed:AdminPassword"];
        if (string.IsNullOrEmpty(adminPassword))
        {
            throw InvalidSeed("Seed:AdminPassword não foi configurada.");
        }

        var passwordResult = passwordPolicy.Validate(adminPassword);
        if (!passwordResult.IsValid)
        {
            throw InvalidSeed($"Seed:AdminPassword rejeitada ({passwordResult.Code}).");
        }

        var admin = new Administrador
        {
            NomeCompleto = "Administrador inicial",
            Email = adminEmail,
            SenhaHash = string.Empty,
            Telefone = string.Empty,
            DataIngresso = DateOnly.FromDateTime(DateTime.UtcNow),
            NivelUsuario = NivelUsuario.Administrador,
            TipoUsuario = TipoUsuario.Administrador,
            Status = StatusUsuario.Habilitado,
            ExigeTrocaSenha = true,
            VersaoSessao = 0
        };

        admin.SenhaHash = new PasswordHasher<Usuario>().HashPassword(admin, adminPassword);
        context.Administradores.Add(admin);
        context.SaveChanges();
    }

    private static InvalidOperationException InvalidSeed(string reason) =>
        new($"credential_seed_invalid: {reason}");
}
