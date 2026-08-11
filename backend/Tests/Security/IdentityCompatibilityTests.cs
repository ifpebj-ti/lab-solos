using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using Microsoft.AspNetCore.Identity;

namespace Tests.Security;

public class IdentityCompatibilityTests
{
    [Fact]
    public void DefinirSenha_DeveGerarHashCompativelComIdentityDoFramework()
    {
        var usuario = CriarUsuario();

        usuario.DefinirSenha("Senha-segura-123!");

        Assert.NotEqual("Senha-segura-123!", usuario.SenhaHash);
        Assert.Equal(
            PasswordVerificationResult.Success,
            new PasswordHasher<Usuario>().VerifyHashedPassword(
                usuario,
                usuario.SenhaHash,
                "Senha-segura-123!"));
    }

    [Fact]
    public void VerificarSenha_DeveAceitarSenhaCorretaERejeitarSenhaIncorreta()
    {
        var usuario = CriarUsuario();
        usuario.DefinirSenha("Senha-segura-123!");

        Assert.True(usuario.VerificarSenha("Senha-segura-123!"));
        Assert.False(usuario.VerificarSenha("senha-incorreta"));
    }

    private static Usuario CriarUsuario() => new()
    {
        NomeCompleto = "Usuário de teste",
        Email = "usuario@example.com",
        SenhaHash = string.Empty,
        NivelUsuario = NivelUsuario.Administrador,
        TipoUsuario = TipoUsuario.Administrador,
        Status = StatusUsuario.Habilitado
    };
}
