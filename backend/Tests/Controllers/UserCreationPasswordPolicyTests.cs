using System.Text.Json;
using AutoMapper;
using LabSolos_Server_DotNet8.Controllers;
using LabSolos_Server_DotNet8.DTOs.Usuarios;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Tests.Infrastructure;

namespace Tests.Controllers;

public class UserCreationPasswordPolicyTests
{
    public static TheoryData<string, bool, string?> PasswordMatrix => new()
    {
        { new string('a', 14), false, "password_too_short" },
        { new string('a', 15), true, null },
        { new string('á', 128), true, null },
        { new string('a', 129), false, "password_too_long" },
        { "correct horse battery staple", false, "password_common" }
    };

    [Fact]
    public void UserCreationResponseDto_DoesNotExposePasswordOrHash()
    {
        var propertyNames = typeof(UsuarioDTO).GetProperties()
            .Select(property => property.Name)
            .ToArray();

        Assert.DoesNotContain(propertyNames, name =>
            name.Contains("senha", StringComparison.OrdinalIgnoreCase) ||
            name.Contains("password", StringComparison.OrdinalIgnoreCase) ||
            name.Contains("hash", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void PrepararSenhaCadastro_DoesNotWriteRejectedPasswordToLogs()
    {
        const string password = "secret value blocked only for this test";
        var logger = new RecordingLogger<UsuarioService>();
        var service = new UsuarioService(
            logger,
            new PasswordPolicy([password]),
            Mock.Of<IPasswordHasher<Usuario>>());

        var result = service.PrepararSenhaCadastro(CreateUser(), password);

        Assert.False(result.IsValid);
        Assert.Equal("password_common", result.Code);
        var message = Assert.Single(logger.Messages);
        Assert.Contains("password_common", message);
        Assert.DoesNotContain(password, message);
    }

    [Theory]
    [MemberData(nameof(PasswordMatrix))]
    public void PrepararSenhaCadastro_UsesSharedPolicyAndHashesOnlyAcceptedPasswords(
        string password,
        bool expectedValid,
        string? expectedCode)
    {
        var hasher = new Mock<IPasswordHasher<Usuario>>();
        hasher.Setup(instance => instance.HashPassword(It.IsAny<Usuario>(), It.IsAny<string>()))
            .Returns("generated-hash");
        var service = new UsuarioService(
            NullLogger<UsuarioService>.Instance,
            new PasswordPolicy(["correct horse battery staple"]),
            hasher.Object);
        var user = CreateUser();

        var result = service.PrepararSenhaCadastro(user, password);

        Assert.Equal(expectedValid, result.IsValid);
        Assert.Equal(expectedCode, result.Code);
        if (expectedValid)
        {
            Assert.Equal("generated-hash", user.SenhaHash);
            Assert.False(user.ExigeTrocaSenha);
            hasher.Verify(instance => instance.HashPassword(user, password), Times.Once);
        }
        else
        {
            Assert.Empty(user.SenhaHash);
            hasher.Verify(instance => instance.HashPassword(It.IsAny<Usuario>(), It.IsAny<string>()), Times.Never);
        }
    }

    [Fact]
    public async Task Adicionar_RejectsPasswordBelowSharedMinimumWithoutPersistingOrEchoingSecret()
    {
        const string password = "12345678901234";
        var fixture = CreateController(password);

        var result = await fixture.Controller.Adicionar(fixture.Request);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(400, objectResult.StatusCode);
        var details = Assert.IsType<ValidationProblemDetails>(objectResult.Value);
        Assert.Contains("password_too_short", details.Errors["senha"]);
        Assert.DoesNotContain(password, JsonSerializer.Serialize(details));
        fixture.Repository.Verify(repository => repository.Criar(It.IsAny<Usuario>()), Times.Never);
        fixture.UnitOfWork.Verify(unit => unit.CommitAsync(), Times.Never);
    }

    [Fact]
    public async Task Adicionar_AcceptedPasswordPreservesCreatedFlowAndOmitsCredentialsFromResponse()
    {
        const string password = "safe registration password";
        var clock = new ControlledTimeProvider(
            new DateTimeOffset(2026, 8, 31, 23, 30, 0, TimeSpan.FromHours(-3)));
        var fixture = CreateController(password, clock);

        var result = await fixture.Controller.Adicionar(fixture.Request);

        var created = Assert.IsType<CreatedAtActionResult>(result);
        Assert.Equal(nameof(UsuariosController.ObterPeloId), created.ActionName);
        Assert.Equal(201, created.StatusCode);
        Assert.False(fixture.User.ExigeTrocaSenha);
        Assert.NotEqual(password, fixture.User.SenhaHash);
        Assert.Equal(new DateOnly(2026, 9, 1), fixture.User.DataIngresso);
        var serialized = JsonSerializer.Serialize(created.Value);
        Assert.DoesNotContain(password, serialized);
        Assert.DoesNotContain("senha", serialized, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("hash", serialized, StringComparison.OrdinalIgnoreCase);
        fixture.Repository.Verify(repository => repository.Criar(fixture.User), Times.Once);
        fixture.UnitOfWork.Verify(unit => unit.CommitAsync(), Times.Once);
    }

    private static Fixture CreateController(string password, TimeProvider? timeProvider = null)
    {
        var request = new AddUsuarioDTO
        {
            NomeCompleto = "Pessoa de teste",
            Email = "pessoa@example.test",
            Senha = password,
            NivelUsuario = NivelUsuario.Comum.ToString(),
            TipoUsuario = TipoUsuario.Comum.ToString()
        };
        var user = CreateUser();

        var mapper = new Mock<IMapper>();
        mapper.Setup(instance => instance.Map<Usuario>(request)).Returns(user);
        mapper.Setup(instance => instance.Map<UsuarioDTO>(user)).Returns(new UsuarioDTO
        {
            NomeCompleto = user.NomeCompleto,
            Email = user.Email
        });

        var repository = new Mock<IRepository<Usuario>>();
        repository.Setup(instance => instance.Criar(It.IsAny<Usuario>()))
            .Returns((Usuario candidate) => candidate);
        var unitOfWork = new Mock<IUnitOfWork>();
        unitOfWork.SetupGet(instance => instance.UsuarioRepository).Returns(repository.Object);
        unitOfWork.Setup(instance => instance.CommitAsync()).Returns(Task.CompletedTask);

        var hasher = new Mock<IPasswordHasher<Usuario>>();
        hasher.Setup(instance => instance.HashPassword(user, password)).Returns("generated-hash");
        var userService = new UsuarioService(
            NullLogger<UsuarioService>.Instance,
            new PasswordPolicy(["correct horse battery staple"]),
            hasher.Object);
        var utilities = new Mock<IUtilitiesService>();
        utilities.Setup(instance => instance.ValidarEnum(
                request.TipoUsuario,
                "TipoUsuario",
                TipoUsuario.Comum))
            .Returns(TipoUsuario.Comum);
        var notifications = new Mock<INotificacaoService>();
        notifications.Setup(instance => instance.CriarNotificacaoNovaSolicitacaoUsuario(It.IsAny<int>()))
            .Returns(Task.CompletedTask);

        var controller = new UsuariosController(
            NullLogger<UsuariosController>.Instance,
            utilities.Object,
            unitOfWork.Object,
            mapper.Object,
            userService,
            notifications.Object,
            timeProvider);

        return new Fixture(controller, request, user, repository, unitOfWork);
    }

    private static Usuario CreateUser() => new()
    {
        NomeCompleto = "Pessoa de teste",
        Email = "pessoa@example.test",
        SenhaHash = string.Empty,
        NivelUsuario = NivelUsuario.Comum,
        TipoUsuario = TipoUsuario.Comum,
        ExigeTrocaSenha = false
    };

    private sealed record Fixture(
        UsuariosController Controller,
        AddUsuarioDTO Request,
        Usuario User,
        Mock<IRepository<Usuario>> Repository,
        Mock<IUnitOfWork> UnitOfWork);

    private sealed class RecordingLogger<T> : ILogger<T>
    {
        public List<string> Messages { get; } = [];

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter) =>
            Messages.Add(formatter(state, exception));
    }
}
