using System.IdentityModel.Tokens.Jwt;
using System.Text.Json;
using LabSolos_Server_DotNet8.Controllers;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Moq;

namespace Tests.Controllers;

public sealed class AuthLoginContractTests
{
    [Theory]
    [InlineData(StatusUsuario.Pendente)]
    [InlineData(StatusUsuario.Bloqueado)]
    [InlineData(StatusUsuario.Desabilitado)]
    public async Task Login_UnavailableAccount_UsesSameGenericUnauthorizedResponse(StatusUsuario status)
    {
        var user = CreateUser(status, requiresPasswordChange: false);
        var controller = CreateController(user);

        var result = await controller.Login(new() { Email = user.Email, Password = ValidPassword });

        var unauthorized = Assert.IsType<UnauthorizedObjectResult>(result);
        Assert.Equal("Credenciais inválidas.", unauthorized.Value);
    }

    [Fact]
    public async Task Login_ValidAccount_ReturnsFlagAndVersionedClaims()
    {
        var user = CreateUser(StatusUsuario.Habilitado, requiresPasswordChange: true);
        user.VersaoSessao = 17;
        var controller = CreateController(user);

        var result = await controller.Login(new() { Email = user.Email, Password = ValidPassword });

        var ok = Assert.IsType<OkObjectResult>(result);
        using var document = JsonDocument.Parse(JsonSerializer.Serialize(ok.Value));
        Assert.True(document.RootElement.GetProperty("requiresPasswordChange").GetBoolean());
        var token = document.RootElement.GetProperty("token").GetString();
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        Assert.Equal("17", jwt.Claims.Single(c => c.Type == "session_version").Value);
        Assert.Equal("true", jwt.Claims.Single(c => c.Type == "password_change_required").Value);
    }

    private static AuthController CreateController(Usuario user)
    {
        var repository = new Mock<IRepository<Usuario>>();
        repository.Setup(r => r.ObterAsync(
                It.IsAny<System.Linq.Expressions.Expression<Func<Usuario, bool>>>(),
                It.IsAny<Func<IQueryable<Usuario>, IQueryable<Usuario>>?>()))
            .ReturnsAsync(user);
        var uow = new Mock<IUnitOfWork>();
        uow.SetupGet(unit => unit.UsuarioRepository).Returns(repository.Object);

        return new AuthController(CreateJwtService(), uow.Object, Mock.Of<ICredentialService>());
    }

    private static JwtService CreateJwtService() => new(new ConfigurationBuilder()
        .AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "synthetic-controller-test-key-with-thirty-two-bytes",
            ["Jwt:Issuer"] = "controller-tests",
            ["Jwt:Audience"] = "controller-tests",
            ["Jwt:ExpiresInMinutes"] = "5"
        })
        .Build());

    private static Usuario CreateUser(StatusUsuario status, bool requiresPasswordChange)
    {
        var user = new Usuario
        {
            Id = 42,
            NomeCompleto = "Usuário de teste",
            Email = "user@example.test",
            SenhaHash = string.Empty,
            NivelUsuario = NivelUsuario.Comum,
            TipoUsuario = TipoUsuario.Comum,
            Status = status,
            ExigeTrocaSenha = requiresPasswordChange
        };
        user.DefinirSenha(ValidPassword);
        return user;
    }

    private const string ValidPassword = "valid current password 2026";
}
