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

namespace Tests.Controllers;

public class UsuarioRegistrationValidationTests
{
    [Fact]
    public async Task Adicionar_InvalidAcademicFields_ReturnsFieldValidationProblemWithoutEchoingValues()
    {
        const string rejectedCity = " Indefinido ";
        const string rejectedCourse = " C ";
        var fixture = CreateController(rejectedCity, rejectedCourse);

        var result = await fixture.Controller.Adicionar(fixture.Request);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(400, objectResult.StatusCode);
        Assert.Contains("application/problem+json", objectResult.ContentTypes);
        var details = Assert.IsType<ValidationProblemDetails>(objectResult.Value);
        Assert.Equal("Dados de cadastro inválidos.", details.Title);
        Assert.Equal(["Informe uma cidade válida."], details.Errors["cidade"]);
        Assert.Equal(["O curso deve ter entre 2 e 100 caracteres."], details.Errors["curso"]);
        var serialized = JsonSerializer.Serialize(details);
        Assert.DoesNotContain(rejectedCity, serialized);
        Assert.DoesNotContain(rejectedCourse, serialized);
        var logMessage = Assert.Single(fixture.Logger.Messages);
        Assert.Contains("cidade", logMessage);
        Assert.Contains("curso", logMessage);
        Assert.DoesNotContain(rejectedCity, logMessage);
        Assert.DoesNotContain(rejectedCourse, logMessage);
        fixture.Repository.Verify(repository => repository.Criar(It.IsAny<Usuario>()), Times.Never);
        fixture.UnitOfWork.Verify(unit => unit.CommitAsync(), Times.Never);
    }

    [Fact]
    public async Task Adicionar_ValidAcademicFields_AreNormalizedBeforeMappingAndPersistence()
    {
        var fixture = CreateController(" Belo Jardim ", " ES ");

        var result = await fixture.Controller.Adicionar(fixture.Request);

        Assert.IsType<CreatedAtActionResult>(result);
        Assert.Equal("Belo Jardim", fixture.MappedCity);
        Assert.Equal("ES", fixture.MappedCourse);
        Assert.Equal("Belo Jardim", fixture.User.Cidade);
        Assert.Equal("ES", fixture.User.Curso);
        fixture.Repository.Verify(repository => repository.Criar(fixture.User), Times.Once);
        fixture.UnitOfWork.Verify(unit => unit.CommitAsync(), Times.Once);
    }

    private static Fixture CreateController(string? city, string? course)
    {
        var request = new AddUsuarioDTO
        {
            NomeCompleto = "Pessoa de teste",
            Email = "pessoa@example.test",
            Senha = "safe registration password",
            NivelUsuario = NivelUsuario.Mentor.ToString(),
            TipoUsuario = TipoUsuario.Academico.ToString(),
            Instituicao = "IFPE",
            Cidade = city,
            Curso = course
        };
        var fixture = new Fixture(request);

        fixture.Mapper.Setup(instance => instance.Map<Academico>(request))
            .Returns(() =>
            {
                fixture.MappedCity = request.Cidade;
                fixture.MappedCourse = request.Curso;
                fixture.User.Cidade = request.Cidade;
                fixture.User.Curso = request.Curso;
                return fixture.User;
            });
        fixture.Mapper.Setup(instance => instance.Map<UsuarioDTO>(fixture.User))
            .Returns(new UsuarioDTO
            {
                NomeCompleto = fixture.User.NomeCompleto,
                Email = fixture.User.Email
            });
        fixture.Repository.Setup(instance => instance.Criar(It.IsAny<Usuario>()))
            .Returns((Usuario candidate) => candidate);
        fixture.UnitOfWork.SetupGet(instance => instance.UsuarioRepository)
            .Returns(fixture.Repository.Object);
        fixture.UnitOfWork.Setup(instance => instance.CommitAsync()).Returns(Task.CompletedTask);

        var hasher = new Mock<IPasswordHasher<Usuario>>();
        hasher.Setup(instance => instance.HashPassword(fixture.User, request.Senha))
            .Returns("generated-hash");
        var userService = new UsuarioService(
            NullLogger<UsuarioService>.Instance,
            new PasswordPolicy([]),
            hasher.Object);
        fixture.Utilities.Setup(instance => instance.ValidarEnum(
                request.TipoUsuario,
                "TipoUsuario",
                TipoUsuario.Comum))
            .Returns(TipoUsuario.Academico);
        fixture.Notifications.Setup(instance => instance.CriarNotificacaoNovaSolicitacaoUsuario(It.IsAny<int>()))
            .Returns(Task.CompletedTask);

        fixture.Controller = new UsuariosController(
            fixture.Logger,
            fixture.Utilities.Object,
            fixture.UnitOfWork.Object,
            fixture.Mapper.Object,
            userService,
            fixture.Notifications.Object);

        return fixture;
    }

    private sealed class Fixture(AddUsuarioDTO request)
    {
        public AddUsuarioDTO Request { get; } = request;
        public Academico User { get; } = new()
        {
            NomeCompleto = request.NomeCompleto,
            Email = request.Email,
            SenhaHash = string.Empty,
            NivelUsuario = NivelUsuario.Mentor,
            TipoUsuario = TipoUsuario.Academico,
            Instituicao = request.Instituicao!,
            Cidade = request.Cidade,
            Curso = request.Curso
        };
        public Mock<IMapper> Mapper { get; } = new();
        public Mock<IRepository<Usuario>> Repository { get; } = new();
        public Mock<IUnitOfWork> UnitOfWork { get; } = new();
        public Mock<IUtilitiesService> Utilities { get; } = new();
        public Mock<INotificacaoService> Notifications { get; } = new();
        public RecordingLogger<UsuariosController> Logger { get; } = new();
        public UsuariosController Controller { get; set; } = null!;
        public string? MappedCity { get; set; }
        public string? MappedCourse { get; set; }
    }

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
