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
            CreateUser(200, NivelUsuario.Mentorado, StatusUsuario.Pendente, responsibleId: 100));

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
            CreateUser(302, NivelUsuario.Mentorado, StatusUsuario.Pendente, responsibleId: 301));

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
