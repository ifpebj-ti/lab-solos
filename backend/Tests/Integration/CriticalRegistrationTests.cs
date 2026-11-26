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
using Npgsql;
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
        Assert.Equal("Academico", dto.GetProperty("tipoUsuario").GetString());
        Assert.DoesNotContain("senha", dto.EnumerateObject().Select(property => property.Name), StringComparer.OrdinalIgnoreCase);
        Assert.DoesNotContain("hash", dto.EnumerateObject().Select(property => property.Name), StringComparer.OrdinalIgnoreCase);

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var persisted = await context.Usuarios.AsNoTracking().SingleAsync(user => user.Email == RegistrationEmail);

        Assert.Equal(StatusUsuario.Pendente, persisted.Status);
        Assert.Equal(TipoUsuario.Academico, persisted.TipoUsuario);
        Assert.Equal(NivelUsuario.Mentor, persisted.NivelUsuario);
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
            nivelUsuario = "Mentor",
            tipoUsuario = "Academico",
            instituicao = "IFPE",
            cidade = "Belo Jardim",
            curso = "ES"
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

    [Theory]
    [InlineData(null)]
    [InlineData("missing@example.test")]
    [InlineData("disabled@example.test")]
    [InlineData("mentee@example.test")]
    public async Task InvalidResponsibleUsesSamePublicFailure(string? responsible)
    {
        await using var factory = await CreateFactoryAsync();
        await SeedResponsibleAsync(factory, "disabled@example.test", NivelUsuario.Mentor, StatusUsuario.Desabilitado);
        await SeedResponsibleAsync(factory, "mentee@example.test", NivelUsuario.Mentorado, StatusUsuario.Habilitado);
        using var client = factory.CreateClient();

        using var response = await client.PostAsJsonAsync("/api/Usuarios", AcademicRegistration("Mentorado", responsible));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        using var payload = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("registration_responsible_invalid", payload.RootElement.GetProperty("code").GetString());
        Assert.Equal("Verifique o e-mail do responsável informado.", payload.RootElement.GetProperty("detail").GetString());
        await using var scope = factory.Services.CreateAsyncScope();
        Assert.Equal(2, await scope.ServiceProvider.GetRequiredService<AppDbContext>().Usuarios.CountAsync());
    }

    [Theory]
    [InlineData(NivelUsuario.Mentor)]
    [InlineData(NivelUsuario.Administrador)]
    public async Task MenteeLinksToEnabledResponsible(NivelUsuario role)
    {
        await using var factory = await CreateFactoryAsync();
        var responsibleId = await SeedResponsibleAsync(factory, "responsible@example.test", role, StatusUsuario.Habilitado);
        using var client = factory.CreateClient();
        using var response = await client.PostAsJsonAsync("/api/Usuarios", AcademicRegistration("Mentorado", "responsible@example.test"));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        await using var scope = factory.Services.CreateAsyncScope();
        var saved = await scope.ServiceProvider.GetRequiredService<AppDbContext>().Usuarios.SingleAsync(user => user.Email == RegistrationEmail);
        Assert.Equal(responsibleId, saved.ResponsavelId);
        Assert.Equal(NivelUsuario.Mentorado, saved.NivelUsuario);
        Assert.Equal(StatusUsuario.Pendente, saved.Status);
    }

    [Fact]
    public async Task MentorIgnoresResponsibleFromOlderForm()
    {
        await using var factory = await CreateFactoryAsync();
        using var client = factory.CreateClient();
        using var response = await client.PostAsJsonAsync("/api/Usuarios", AcademicRegistration("Mentor", "unknown@example.test"));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        await using var scope = factory.Services.CreateAsyncScope();
        var saved = await scope.ServiceProvider.GetRequiredService<AppDbContext>().Usuarios.SingleAsync();
        Assert.Null(saved.ResponsavelId);
        Assert.Equal(TipoUsuario.Academico, saved.TipoUsuario);
        Assert.Equal(NivelUsuario.Mentor, saved.NivelUsuario);
    }

    [Theory]
    [InlineData("Comum", "Comum")]
    [InlineData("Administrador", "Academico")]
    [InlineData("0", "0")]
    [InlineData("Mentor", "2")]
    public async Task RejectsUnsupportedPublicAccountWithoutPersistence(string role, string type)
    {
        await using var factory = await CreateFactoryAsync();
        using var client = factory.CreateClient();
        using var response = await client.PostAsJsonAsync("/api/Usuarios", new
        {
            nomeCompleto = RegistrationName, email = RegistrationEmail, senha = RegistrationPassword,
            nivelUsuario = role, tipoUsuario = type, instituicao = "IFPE", cidade = "Belo Jardim", curso = "ES"
        });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await using var scope = factory.Services.CreateAsyncScope();
        Assert.Empty(await scope.ServiceProvider.GetRequiredService<AppDbContext>().Usuarios.ToListAsync());
    }

    [Fact]
    public async Task DuplicateEmailReturnsNeutralConflict()
    {
        await using var factory = await CreateFactoryAsync();
        using var client = factory.CreateClient();
        using var first = await client.PostAsJsonAsync("/api/Usuarios", ValidRegistration());
        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        using var response = await client.PostAsJsonAsync("/api/Usuarios", ValidRegistration());
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        using var payload = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("registration_conflict", payload.RootElement.GetProperty("code").GetString());
        Assert.Equal("Não foi possível concluir o cadastro com os dados informados.", payload.RootElement.GetProperty("detail").GetString());
        await using var scope = factory.Services.CreateAsyncScope();
        Assert.Single(await scope.ServiceProvider.GetRequiredService<AppDbContext>().Usuarios.ToListAsync());
    }

    [Fact]
    public async Task ConcurrentDuplicateRegistrationCreatesOneAccountAndReturnsPublicConflict()
    {
        await using var factory = await CreateFactoryAsync();
        using var firstClient = factory.CreateClient();
        using var secondClient = factory.CreateClient();
        var responses = await Task.WhenAll(
            firstClient.PostAsJsonAsync("/api/Usuarios", ValidRegistration()),
            secondClient.PostAsJsonAsync("/api/Usuarios", ValidRegistration()));
        using var firstResponse = responses[0];
        using var secondResponse = responses[1];
        Assert.Single(responses, response => response.StatusCode == HttpStatusCode.Created);
        var conflict = Assert.Single(responses, response => response.StatusCode == HttpStatusCode.Conflict);
        using var payload = JsonDocument.Parse(await conflict.Content.ReadAsStringAsync());
        Assert.Equal("registration_conflict", payload.RootElement.GetProperty("code").GetString());
        await using var scope = factory.Services.CreateAsyncScope();
        Assert.Single(await scope.ServiceProvider.GetRequiredService<AppDbContext>().Usuarios.ToListAsync());
    }

    [Fact]
    public async Task DatabaseUniqueViolationReturnsNeutralConflictWithoutPersistingOrNotifying()
    {
        await using var factory = await CreateFactoryAsync();
        await using (var connection = new NpgsqlConnection(database.ConnectionString))
        {
            await connection.OpenAsync();
            await using var createTrigger = connection.CreateCommand();
            createTrigger.CommandText = """
                CREATE FUNCTION reject_t030_registration_email() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN
                    IF NEW."Email" = 'critical-registration@example.test' THEN
                        RAISE EXCEPTION 'synthetic registration email uniqueness conflict'
                            USING ERRCODE = '23505', CONSTRAINT = 'IX_Usuarios_Email';
                    END IF;
                    RETURN NEW;
                END;
                $$;
                CREATE TRIGGER reject_t030_registration_email
                BEFORE INSERT ON "Usuarios"
                FOR EACH ROW EXECUTE FUNCTION reject_t030_registration_email();
                """;
            await createTrigger.ExecuteNonQueryAsync();
        }

        try
        {
            using var client = factory.CreateClient();
            using var response = await client.PostAsJsonAsync("/api/Usuarios", ValidRegistration());

            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
            var responseBody = await response.Content.ReadAsStringAsync();
            using var payload = JsonDocument.Parse(responseBody);
            Assert.Equal("registration_conflict", payload.RootElement.GetProperty("code").GetString());
            Assert.Equal(
                "Não foi possível concluir o cadastro com os dados informados.",
                payload.RootElement.GetProperty("detail").GetString());
            Assert.DoesNotContain(RegistrationEmail, responseBody, StringComparison.Ordinal);

            await using var scope = factory.Services.CreateAsyncScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.Empty(await context.Usuarios.ToListAsync());
            Assert.Empty(await context.Notificacoes.ToListAsync());
        }
        finally
        {
            await using var connection = new NpgsqlConnection(database.ConnectionString);
            await connection.OpenAsync();
            await using var removeTrigger = connection.CreateCommand();
            removeTrigger.CommandText = """
                DROP TRIGGER IF EXISTS reject_t030_registration_email ON "Usuarios";
                DROP FUNCTION IF EXISTS reject_t030_registration_email();
                """;
            await removeTrigger.ExecuteNonQueryAsync();
        }
    }

    private static object AcademicRegistration(string role, string? responsible) => new
    {
        nomeCompleto = RegistrationName, email = RegistrationEmail, senha = RegistrationPassword,
        nivelUsuario = role, tipoUsuario = "Academico", instituicao = "IFPE", cidade = "Belo Jardim", curso = "ES",
        responsavelEmail = responsible
    };

    private static async Task<int> SeedResponsibleAsync(IntegrationWebApplicationFactory factory, string email, NivelUsuario role, StatusUsuario status)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = new Usuario
        {
            NomeCompleto = "Responsável sintético", Email = email, SenhaHash = "synthetic",
            NivelUsuario = role, TipoUsuario = TipoUsuario.Comum, Status = status
        };
        context.Usuarios.Add(user);
        await context.SaveChangesAsync();
        return user.Id;
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
        nivelUsuario = "Mentor",
        tipoUsuario = "Academico",
        instituicao = "IFPE",
        cidade = "Belo Jardim",
        curso = "ES"
    };

    private const string RegistrationName = "Cadastro HTTP crítico";
    private const string RegistrationEmail = "critical-registration@example.test";
    private const string RegistrationPassword = "critical-registration-password-2026";
}

public sealed class UsuariosControllerRegistrationFailureTests
{
    [Fact]
    public async Task AdicionarValidationFailureWithoutFieldErrorsReturnsTheGeneralMessage()
    {
        var fixture = CreateFixture(new InvalidOperationException("notification provider secret"));
        fixture.UsuarioService.Setup(service => service.ValidarEstrutura(fixture.Request))
            .Returns(UsuarioValidationResult.Invalid("Falha geral de validação."));

        var result = await fixture.Controller.Adicionar(fixture.Request);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        using var payload = JsonDocument.Parse(JsonSerializer.Serialize(badRequest.Value));
        Assert.Equal("Falha geral de validação.", payload.RootElement.GetProperty("Message").GetString());
        fixture.Repository.Verify(repository => repository.Criar(It.IsAny<Usuario>()), Times.Never);
        fixture.UnitOfWork.Verify(unit => unit.CommitAsync(), Times.Never);
    }

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
            NivelUsuario = NivelUsuario.Mentor.ToString(),
            TipoUsuario = TipoUsuario.Academico.ToString(),
            Instituicao = "IFPE",
            Cidade = "Belo Jardim",
            Curso = "ES"
        };
        var user = new Academico
        {
            NomeCompleto = request.NomeCompleto,
            Email = request.Email,
            SenhaHash = "generated-hash",
            NivelUsuario = NivelUsuario.Mentor,
            TipoUsuario = TipoUsuario.Academico,
            Instituicao = "IFPE",
            Cidade = "Belo Jardim",
            Curso = "ES"
        };

        var mapper = new Mock<IMapper>();
        mapper.Setup(instance => instance.Map<Academico>(request)).Returns(user);
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
            usuarioService,
            repository,
            unitOfWork,
            new UsuariosController(
                NullLogger<UsuariosController>.Instance,
                utilities.Object,
                unitOfWork.Object,
                mapper.Object,
                usuarioService.Object,
                notifications.Object));
    }

    private sealed record Fixture(
        AddUsuarioDTO Request,
        Mock<IUsuarioService> UsuarioService,
        Mock<IRepository<Usuario>> Repository,
        Mock<IUnitOfWork> UnitOfWork,
        UsuariosController Controller);
}
