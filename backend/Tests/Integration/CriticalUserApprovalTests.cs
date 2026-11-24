using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class CriticalUserApprovalTests(PostgreSqlContainerFixture database)
{
    private static readonly string[] AcademicRoles = ["Mentor", "Mentorado"];

    [Theory]
    [InlineData("aprovar")]
    [InlineData("rejeitar")]
    public async Task ResponsibleACannotProcessDependentWhenBodyNamesResponsibleB(string action)
    {
        await using var factory = await CreateFactoryAsync(
            CreateUser(100, NivelUsuario.Mentor),
            CreateUser(101, NivelUsuario.Mentor),
            CreateUser(200, NivelUsuario.Mentorado, StatusUsuario.Pendente, responsibleId: 101));

        using var client = CreateClient(factory, 100, NivelUsuario.Mentor);
        using var response = await SendDecisionAsync(client, action, 200, 101);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal(StatusUsuario.Pendente, await ReadStatusAsync(factory, 200));
    }

    [Theory]
    [InlineData("aprovar", StatusUsuario.Habilitado)]
    [InlineData("rejeitar", StatusUsuario.Desabilitado)]
    public async Task AuthenticatedResponsibleCanProcessOwnDependentAndResponseOmitsSecrets(
        string action,
        StatusUsuario expectedStatus)
    {
        await using var factory = await CreateFactoryAsync(
            CreateUser(100, NivelUsuario.Mentor),
            CreateAcademicUser(200, NivelUsuario.Mentorado, StatusUsuario.Pendente, responsibleId: 100));

        using var client = CreateClient(factory, 100, NivelUsuario.Mentor);
        using var response = await SendDecisionAsync(client, action, 200, 100);

        await AssertPublicDecisionResponseAsync(response, 200, expectedStatus);

        Assert.Equal(expectedStatus, await ReadStatusAsync(factory, 200));
        Assert.Equal(StatusUsuario.Habilitado, await ReadStatusAsync(factory, 100));
    }

    [Theory]
    [InlineData("aprovar", StatusUsuario.Habilitado)]
    [InlineData("rejeitar", StatusUsuario.Desabilitado)]
    public async Task AdministratorCanProcessDependentWithOwnIdentity(
        string action,
        StatusUsuario expectedStatus)
    {
        await using var factory = await CreateFactoryAsync(
            CreateUser(300, NivelUsuario.Administrador),
            CreateUser(301, NivelUsuario.Mentor),
            CreateAcademicUser(302, NivelUsuario.Mentorado, StatusUsuario.Pendente, responsibleId: 301));

        using var client = CreateClient(factory, 300, NivelUsuario.Administrador);
        using var response = await SendDecisionAsync(client, action, 302, 300);

        await AssertPublicDecisionResponseAsync(response, 302, expectedStatus);
        Assert.Equal(expectedStatus, await ReadStatusAsync(factory, 302));
    }

    [Theory]
    [InlineData("aprovar")]
    [InlineData("rejeitar")]
    public async Task AnonymousCannotProcessDependent(string action)
    {
        await using var factory = await CreateFactoryAsync(
            CreateUser(100, NivelUsuario.Mentor),
            CreateUser(200, NivelUsuario.Mentorado, StatusUsuario.Pendente, responsibleId: 100));

        using var client = factory.CreateClient();
        using var response = await SendDecisionAsync(client, action, 200, 100);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal(StatusUsuario.Pendente, await ReadStatusAsync(factory, 200));
    }

    [Theory]
    [InlineData("aprovar")]
    [InlineData("rejeitar")]
    public async Task ProhibitedProfileCannotProcessDependent(string action)
    {
        await using var factory = await CreateFactoryAsync(
            CreateUser(100, NivelUsuario.Mentorado),
            CreateUser(101, NivelUsuario.Mentor),
            CreateUser(200, NivelUsuario.Mentorado, StatusUsuario.Pendente, responsibleId: 101));

        using var client = CreateClient(factory, 100, NivelUsuario.Mentorado);
        using var response = await SendDecisionAsync(client, action, 200, 100);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal(StatusUsuario.Pendente, await ReadStatusAsync(factory, 200));
    }

    [Fact]
    public async Task MissingDependentReturnsNotFoundWithoutChangingExistingUsers()
    {
        await using var factory = await CreateFactoryAsync(CreateUser(100, NivelUsuario.Mentor));

        using var client = CreateClient(factory, 100, NivelUsuario.Mentor);
        using var response = await SendDecisionAsync(client, "aprovar", 999, 100);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(StatusUsuario.Habilitado, await ReadStatusAsync(factory, 100));
    }

    [Theory]
    [InlineData("aprovar", StatusUsuario.Habilitado)]
    [InlineData("rejeitar", StatusUsuario.Desabilitado)]
    public async Task AlreadyProcessedDependentReturnsBadRequestWithoutMutation(
        string action,
        StatusUsuario currentStatus)
    {
        await using var factory = await CreateFactoryAsync(
            CreateUser(100, NivelUsuario.Mentor),
            CreateUser(200, NivelUsuario.Mentorado, currentStatus, responsibleId: 100));

        using var client = CreateClient(factory, 100, NivelUsuario.Mentor);
        using var response = await SendDecisionAsync(client, action, 200, 100);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(currentStatus, await ReadStatusAsync(factory, 200));
    }

    [Fact]
    public async Task AdministratorQueueReturnsOnlyEligibleRequestsWithEffectiveAccountData()
    {
        await using var factory = await CreateFactoryAsync(
            CreateUser(300, NivelUsuario.Administrador),
            CreateAcademicUser(301, NivelUsuario.Mentor),
            CreateAcademicUser(302, NivelUsuario.Mentor, StatusUsuario.Pendente),
            CreateAcademicUser(303, NivelUsuario.Mentorado, StatusUsuario.Pendente, responsibleId: 301),
            CreateAcademicUser(304, NivelUsuario.Mentorado, StatusUsuario.Pendente),
            CreateAcademicUser(305, NivelUsuario.Mentorado, StatusUsuario.Pendente, responsibleId: 401),
            CreateAcademicUser(306, NivelUsuario.Administrador, StatusUsuario.Pendente),
            CreateUser(401, NivelUsuario.Mentor, StatusUsuario.Desabilitado));

        using var client = CreateClient(factory, 300, NivelUsuario.Administrador);
        using var response = await client.GetAsync("/api/Usuarios/aprovacao");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var payload = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var requests = payload.RootElement.EnumerateArray().ToArray();
        Assert.Equal([302, 303], requests.Select(user => user.GetProperty("id").GetInt32()).Order());
        Assert.All(requests, user =>
        {
            Assert.Equal("Academico", user.GetProperty("tipoUsuario").GetString());
            Assert.Contains(
                user.GetProperty("nivelUsuario").GetString(),
                AcademicRoles);
            Assert.DoesNotContain(
                user.EnumerateObject().Select(property => property.Name),
                property => SensitiveResponseFields.Contains(property, StringComparer.OrdinalIgnoreCase));
        });
    }

    [Fact]
    public async Task MentorQueueReturnsEmptyWhenNoLinkedRequestIsEligible()
    {
        await using var factory = await CreateFactoryAsync(
            CreateUser(100, NivelUsuario.Mentor),
            CreateAcademicUser(200, NivelUsuario.Mentorado, StatusUsuario.Pendente, responsibleId: 101),
            CreateUser(101, NivelUsuario.Mentor));

        using var client = CreateClient(factory, 100, NivelUsuario.Mentor);
        using var response = await client.GetAsync("/api/Usuarios/100/dependentes/aprovacao");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty((await response.Content.ReadFromJsonAsync<JsonElement[]>()) ?? []);
    }

    [Fact]
    public async Task MentorQueueReturnsOnlyItsLinkedEligibleRequestsWithAccountType()
    {
        await using var factory = await CreateFactoryAsync(
            CreateUser(100, NivelUsuario.Mentor),
            CreateUser(101, NivelUsuario.Mentor),
            CreateAcademicUser(200, NivelUsuario.Mentorado, StatusUsuario.Pendente, responsibleId: 100),
            CreateAcademicUser(201, NivelUsuario.Mentorado, StatusUsuario.Pendente, responsibleId: 101));

        using var client = CreateClient(factory, 100, NivelUsuario.Mentor);
        using var response = await client.GetAsync("/api/Usuarios/100/dependentes/aprovacao");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var payload = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var request = Assert.Single(payload.RootElement.EnumerateArray());
        Assert.Equal(200, request.GetProperty("id").GetInt32());
        Assert.Equal("Academico", request.GetProperty("tipoUsuario").GetString());
        Assert.Equal("Mentorado", request.GetProperty("nivelUsuario").GetString());
    }

    [Fact]
    public async Task ConcurrentStaleDecisionsCommitOnlyTheFirstEligibleTransitionAndAudit()
    {
        await using var factory = await CreateFactoryAsync(
            CreateUser(100, NivelUsuario.Mentor),
            CreateUser(101, NivelUsuario.Administrador),
            CreateAcademicUser(200, NivelUsuario.Mentorado, StatusUsuario.Pendente, responsibleId: 100));

        using var mentor = CreateClient(factory, 100, NivelUsuario.Mentor);
        using var administrator = CreateClient(factory, 101, NivelUsuario.Administrador);
        var decisions = await Task.WhenAll(
            SendDecisionAsync(mentor, "aprovar", 200, 100),
            SendDecisionAsync(administrator, "rejeitar", 200, 101));

        Assert.Single(decisions, response => response.StatusCode == HttpStatusCode.OK);
        Assert.Single(decisions, response => response.StatusCode == HttpStatusCode.BadRequest);
        var resultingStatus = await ReadStatusAsync(factory, 200);
        Assert.Contains(resultingStatus, new[] { StatusUsuario.Habilitado, StatusUsuario.Desabilitado });

        var audit = Assert.Single(await ReadAuditsAsync(factory));
        Assert.Equal(CodigoEventoAuditoria.DecisaoConta, audit.CodigoEvento);
        Assert.Equal(ResultadoOperacaoAuditoria.Sucesso, audit.Resultado);
        Assert.Equal(CategoriaRegistroAuditoria.TrilhaObrigatoria, audit.CategoriaRegistro);
        Assert.Equal($"conta:usuario:200:{resultingStatus}", audit.Recurso);
    }

    [Fact]
    public async Task DifferentEnabledAdministratorCanGrantAuditedAdministratorRole()
    {
        await using var factory = await CreateFactoryAsync(
            CreateUser(300, NivelUsuario.Administrador),
            CreateAcademicUser(301, NivelUsuario.Mentor));

        using var client = CreateClient(factory, 300, NivelUsuario.Administrador);
        using var response = await client.PatchAsync("/api/Usuarios/301/conceder-administrador", content: null);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(NivelUsuario.Administrador, await ReadRoleAsync(factory, 301));

        var audit = Assert.Single(await ReadAuditsAsync(factory));
        Assert.Equal(CodigoEventoAuditoria.ConcessaoConta, audit.CodigoEvento);
        Assert.Equal(300, audit.UsuarioId);
        Assert.Equal("usuario:300", audit.ReferenciaAtor);
        Assert.Equal("conta:usuario:301:Administrador", audit.Recurso);
        Assert.Equal(ResultadoOperacaoAuditoria.Sucesso, audit.Resultado);
        Assert.Equal(CategoriaRegistroAuditoria.TrilhaObrigatoria, audit.CategoriaRegistro);
        Assert.True(audit.ExpiraEmUtc.UtcDateTime > audit.DataHora.ToUniversalTime());
    }

    [Fact]
    public async Task NonAdministratorCannotGrantRoleAndLeavesNoAudit()
    {
        await using var factory = await CreateFactoryAsync(
            CreateUser(100, NivelUsuario.Mentor),
            CreateAcademicUser(200, NivelUsuario.Mentorado));

        using var client = CreateClient(factory, 100, NivelUsuario.Mentor);
        using var response = await client.PatchAsync("/api/Usuarios/200/conceder-administrador", content: null);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal(NivelUsuario.Mentorado, await ReadRoleAsync(factory, 200));
        Assert.DoesNotContain(
            await ReadAuditsAsync(factory),
            audit => audit.CodigoEvento == CodigoEventoAuditoria.ConcessaoConta);
    }

    [Fact]
    public async Task AdministratorCannotGrantSelfOrARequestThatIsNotEnabled()
    {
        await using var factory = await CreateFactoryAsync(
            CreateUser(300, NivelUsuario.Administrador),
            CreateAcademicUser(301, NivelUsuario.Mentor, StatusUsuario.Pendente));

        using var client = CreateClient(factory, 300, NivelUsuario.Administrador);
        using var selfGrant = await client.PatchAsync("/api/Usuarios/300/conceder-administrador", content: null);
        using var pendingGrant = await client.PatchAsync("/api/Usuarios/301/conceder-administrador", content: null);

        Assert.Equal(HttpStatusCode.Conflict, selfGrant.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, pendingGrant.StatusCode);
        Assert.Equal(NivelUsuario.Administrador, await ReadRoleAsync(factory, 300));
        Assert.Equal(NivelUsuario.Mentor, await ReadRoleAsync(factory, 301));
        Assert.DoesNotContain(
            await ReadAuditsAsync(factory),
            audit => audit.CodigoEvento == CodigoEventoAuditoria.ConcessaoConta);
    }

    private async Task<IntegrationWebApplicationFactory> CreateFactoryAsync(params Usuario[] users)
    {
        var factory = new IntegrationWebApplicationFactory(database);
        await factory.RecreateDatabaseAsync();

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        context.Usuarios.AddRange(users);
        await context.SaveChangesAsync();
        return factory;
    }

    private static HttpClient CreateClient(
        IntegrationWebApplicationFactory factory,
        int userId,
        NivelUsuario level)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            JwtSessionVersionTests.CreateToken(userId, "3", "false", level));
        return client;
    }

    private static Task<HttpResponseMessage> SendDecisionAsync(
        HttpClient client,
        string action,
        int dependentId,
        int approverId) => client.PatchAsJsonAsync(
            $"/api/Usuarios/dependentes/{dependentId}/{action}",
            new { aprovadorId = approverId });

    private static async Task AssertPublicDecisionResponseAsync(
        HttpResponseMessage response,
        int expectedUserId,
        StatusUsuario expectedStatus)
    {
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var payload = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var user = payload.RootElement.GetProperty("usuario");
        Assert.Equal(expectedUserId, user.GetProperty("id").GetInt32());
        Assert.Equal(expectedStatus.ToString(), user.GetProperty("status").GetString());
        Assert.DoesNotContain(
            user.EnumerateObject().Select(property => property.Name),
            property => SensitiveResponseFields.Contains(property, StringComparer.OrdinalIgnoreCase));
    }

    private static async Task<StatusUsuario> ReadStatusAsync(
        IntegrationWebApplicationFactory factory,
        int userId)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await context.Usuarios
            .AsNoTracking()
            .Where(user => user.Id == userId)
            .Select(user => user.Status)
            .SingleAsync();
    }

    private static async Task<NivelUsuario> ReadRoleAsync(
        IntegrationWebApplicationFactory factory,
        int userId)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await context.Usuarios
            .AsNoTracking()
            .Where(user => user.Id == userId)
            .Select(user => user.NivelUsuario)
            .SingleAsync();
    }

    private static async Task<List<LogAuditoria>> ReadAuditsAsync(
        IntegrationWebApplicationFactory factory)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await context.LogsAuditoria.AsNoTracking().OrderBy(log => log.Id).ToListAsync();
    }

    private static Usuario CreateUser(
        int id,
        NivelUsuario level,
        StatusUsuario status = StatusUsuario.Habilitado,
        int? responsibleId = null) => new()
    {
        Id = id,
        NomeCompleto = $"Usuário de aprovação {id}",
        Email = $"approval-{id}@example.test",
        SenhaHash = "synthetic-hash",
        NivelUsuario = level,
        TipoUsuario = TipoUsuario.Comum,
        Status = status,
        ResponsavelId = responsibleId,
        ExigeTrocaSenha = false,
        VersaoSessao = 3
    };

    private static Academico CreateAcademicUser(
        int id,
        NivelUsuario level,
        StatusUsuario status = StatusUsuario.Habilitado,
        int? responsibleId = null) => new()
    {
        Id = id,
        NomeCompleto = $"Usuário acadêmico de aprovação {id}",
        Email = $"academic-approval-{id}@example.test",
        SenhaHash = "synthetic-hash",
        NivelUsuario = level,
        TipoUsuario = TipoUsuario.Academico,
        Status = status,
        ResponsavelId = responsibleId,
        ExigeTrocaSenha = false,
        VersaoSessao = 3,
        Instituicao = "IFPE",
        Cidade = "Belo Jardim",
        Curso = "ES"
    };

    private static readonly string[] SensitiveResponseFields =
    [
        "senha",
        "senhaHash",
        "tokenRedefinicao",
        "tokenRedefinicaoHash",
        "tokenExpiracao",
        "responsavelId",
        "versaoSessao"
    ];
}
