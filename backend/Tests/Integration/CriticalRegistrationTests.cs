using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Controllers;
using LabSolos_Server_DotNet8.DTOs.Usuarios;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using LabSolos_Server_DotNet8.Services.Security;
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class CriticalRegistrationTests(PostgreSqlContainerFixture database)
{
    [Fact]
    public async Task ValidRegistrationReturnsPublicDtoAndPersistsPendingUser()
    {
        await using var factory = await CreateFactoryAsync();

        using var client = factory.CreateClient();
        using var response = await client.PostAsJsonAsync("/api/Usuarios", ValidRegistration());

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        using var payload = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var dto = payload.RootElement;
        Assert.Equal(RegistrationName, dto.GetProperty("nomeCompleto").GetString());
        Assert.Equal(RegistrationEmail, dto.GetProperty("email").GetString());
        Assert.Equal("Pendente", dto.GetProperty("status").GetString());
        Assert.Equal("Comum", dto.GetProperty("tipoUsuario").GetString());
        Assert.DoesNotContain("senha", dto.EnumerateObject().Select(property => property.Name), StringComparer.OrdinalIgnoreCase);
        Assert.DoesNotContain("hash", dto.EnumerateObject().Select(property => property.Name), StringComparer.OrdinalIgnoreCase);

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var persisted = await context.Usuarios.AsNoTracking().SingleAsync(user => user.Email == RegistrationEmail);

        Assert.Equal(StatusUsuario.Pendente, persisted.Status);
        Assert.Equal(TipoUsuario.Comum, persisted.TipoUsuario);
        Assert.Equal(NivelUsuario.Comum, persisted.NivelUsuario);
        Assert.NotEqual(RegistrationPassword, persisted.SenhaHash);
        Assert.Equal(RegistrationName, persisted.NomeCompleto);
    }

    [Fact]
    public async Task InvalidRegistrationDataReturnsValidationProblemWithoutPersistingUser()
    {
        await using var factory = await CreateFactoryAsync();

        using var client = factory.CreateClient();
        using var response = await client.PostAsJsonAsync("/api/Usuarios", new
        {
            nomeCompleto = "Cadastro inválido",
            email = "critical-registration-invalid@example.test",
            senha = RegistrationPassword,
            nivelUsuario = "Mentor",
            tipoUsuario = "Academico",
            instituicao = "IFPE",
            cidade = "Indefinido",
            curso = "C"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("cidade", body, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("curso", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Indefinido", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("senha", body, StringComparison.OrdinalIgnoreCase);

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(0, await context.Usuarios.CountAsync());
    }

    [Fact]
    public async Task InvalidPasswordReturnsValidationProblemWithoutPersistingUser()
    {
        await using var factory = await CreateFactoryAsync();

        using var client = factory.CreateClient();
        using var response = await client.PostAsJsonAsync("/api/Usuarios", new
        {
            nomeCompleto = "Senha inválida",
            email = "critical-registration-password@example.test",
            senha = "12345678901234",
            nivelUsuario = "Comum",
            tipoUsuario = "Comum"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("password_too_short", body, StringComparison.Ordinal);
        Assert.DoesNotContain("12345678901234", body, StringComparison.Ordinal);

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(0, await context.Usuarios.CountAsync());
    }

    [Fact]
    public async Task PublicAdministratorRegistrationReturnsControlledForbiddenWithoutPersistence()
    {
        await using var factory = await CreateFactoryAsync();

        using var client = factory.CreateClient();
        using var response = await client.PostAsJsonAsync("/api/Usuarios", new
        {
            nomeCompleto = "Administrador público indevido",
            email = "critical-registration-admin@example.test",
            senha = RegistrationPassword,
            nivelUsuario = "Administrador",
            tipoUsuario = "Administrador"
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(0, await context.Usuarios.CountAsync());
        Assert.Equal(0, await context.Notificacoes.CountAsync());
    }

    private async Task<IntegrationWebApplicationFactory> CreateFactoryAsync()
    {
        var factory = new IntegrationWebApplicationFactory(database);
        await factory.RecreateDatabaseAsync();
        return factory;
    }

    private static object ValidRegistration() => new
    {
        nomeCompleto = RegistrationName,
        email = RegistrationEmail,
        senha = RegistrationPassword,
        nivelUsuario = "Comum",
        tipoUsuario = "Comum"
    };

    private const string RegistrationName = "Cadastro HTTP crítico";
    private const string RegistrationEmail = "critical-registration@example.test";
    private const string RegistrationPassword = "critical-registration-password-2026";
}

public sealed class UsuariosControllerRegistrationFailureTests
{
    [Fact]
    public async Task AdicionarUnexpectedNotificationFailureIsNotConvertedToCreated()
    {
        var failure = new InvalidOperationException("notification provider secret");
        var fixture = CreateFixture(failure);

        var thrown = await Assert.ThrowsAsync<InvalidOperationException>(
            () => fixture.Controller.Adicionar(fixture.Request));

        Assert.Same(failure, thrown);
    }

    [Fact]
    public async Task AdicionarNotificationPersistenceFailurePreservesCreatedResponse()
    {
        var fixture = CreateFixture(new DbUpdateException("notification persistence failure"));

        var result = await fixture.Controller.Adicionar(fixture.Request);

        Assert.IsType<CreatedAtActionResult>(result);
    }

    private static Fixture CreateFixture(Exception notificationFailure)
    {
        var request = new AddUsuarioDTO
        {
            NomeCompleto = "Cadastro com falha de notificação",
            Email = "notification-failure@example.test",
            Senha = "critical-registration-password-2026",
            NivelUsuario = NivelUsuario.Comum.ToString(),
            TipoUsuario = TipoUsuario.Comum.ToString()
        };
        var user = new Usuario
        {
            NomeCompleto = request.NomeCompleto,
            Email = request.Email,
            SenhaHash = "generated-hash",
            NivelUsuario = NivelUsuario.Comum,
            TipoUsuario = TipoUsuario.Comum
        };

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

        var utilities = new Mock<IUtilitiesService>();
        utilities.Setup(instance => instance.ValidarEnum(
                request.TipoUsuario,
                "TipoUsuario",
                TipoUsuario.Comum))
            .Returns(TipoUsuario.Comum);

        var usuarioService = new Mock<IUsuarioService>();
        usuarioService.Setup(instance => instance.ValidarEstrutura(request))
            .Returns(UsuarioValidationResult.Valid());
        usuarioService.Setup(instance => instance.PrepararSenhaCadastro(user, request.Senha))
            .Returns(PasswordPolicyResult.Valid);

        var notifications = new Mock<INotificacaoService>();
        notifications.Setup(instance => instance.CriarNotificacaoNovaSolicitacaoUsuario(It.IsAny<int>()))
            .ThrowsAsync(notificationFailure);

        return new Fixture(
            request,
            new UsuariosController(
                NullLogger<UsuariosController>.Instance,
                utilities.Object,
                unitOfWork.Object,
                mapper.Object,
                usuarioService.Object,
                notifications.Object));
    }

    private sealed record Fixture(AddUsuarioDTO Request, UsuariosController Controller);
}
