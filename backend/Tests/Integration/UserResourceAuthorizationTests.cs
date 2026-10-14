using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class UserResourceAuthorizationTests(PostgreSqlContainerFixture database)
{
    private static readonly string[] MinimalProfileFields =
    [
        "id",
        "nomeCompleto",
        "email",
        "telefone",
        "dataIngresso",
        "instituicao",
        "cidade",
        "curso",
        "status",
        "nivelUsuario"
    ];

    [Fact]
    public async Task MentorReadsLinkedMenteeProjectionAndCrossMentorProfileMatchesMissingResource()
    {
        var (factory, scenario) = await CreateScenarioAsync();
        await using (factory)
        {
            using var mentor = CreateClient(factory, scenario.MentorOneId, NivelUsuario.Mentor);
            using var linkedResponse = await mentor.GetAsync($"/api/Usuarios/{scenario.MenteeOneId}");
            using var linkedPayload = await ReadJsonAsync(linkedResponse);

            Assert.Equal(HttpStatusCode.OK, linkedResponse.StatusCode);
            Assert.Equal(scenario.MenteeOneId, linkedPayload.RootElement.GetProperty("id").GetInt32());

            using var crossResponse = await mentor.GetAsync($"/api/Usuarios/{scenario.MenteeTwoId}");
            using var missingResponse = await mentor.GetAsync("/api/Usuarios/999999");
            var crossBody = await crossResponse.Content.ReadAsStringAsync();
            var missingBody = await missingResponse.Content.ReadAsStringAsync();

            Assert.Equal(HttpStatusCode.NotFound, crossResponse.StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, missingResponse.StatusCode);
            Assert.Equal(missingBody, crossBody);
            using var notFoundPayload = JsonDocument.Parse(crossBody);
            Assert.Equal("Recurso não encontrado.", notFoundPayload.RootElement.GetProperty("title").GetString());
            Assert.Equal(
                MinimalProfileFields.Order(StringComparer.Ordinal),
                linkedPayload.RootElement.EnumerateObject()
                    .Select(property => property.Name)
                    .Order(StringComparer.Ordinal));

            using var mentee = CreateClient(factory, scenario.MenteeOneId, NivelUsuario.Mentorado);
            using var crossMenteeResponse = await mentee.GetAsync($"/api/Usuarios/{scenario.MenteeTwoId}");
            using var missingMenteeResponse = await mentee.GetAsync("/api/Usuarios/999999");
            Assert.Equal(HttpStatusCode.NotFound, crossMenteeResponse.StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, missingMenteeResponse.StatusCode);
            Assert.Equal(
                await missingMenteeResponse.Content.ReadAsStringAsync(),
                await crossMenteeResponse.Content.ReadAsStringAsync());
        }
    }

    [Fact]
    public async Task OwnerAndAdministratorKeepFullProfileContractAndOwnerKeepsResponsibleSummary()
    {
        var (factory, scenario) = await CreateScenarioAsync();
        await using (factory)
        {
            using var mentee = CreateClient(factory, scenario.MenteeOneId, NivelUsuario.Mentorado);
            using var ownerResponse = await mentee.GetAsync($"/api/Usuarios/{scenario.MenteeOneId}");
            using var ownerPayload = await ReadJsonAsync(ownerResponse);

            Assert.Equal(HttpStatusCode.OK, ownerResponse.StatusCode);
            Assert.Equal(scenario.MenteeOneId, ownerPayload.RootElement.GetProperty("id").GetInt32());
            Assert.True(ownerPayload.RootElement.TryGetProperty("responsavel", out var responsible));
            Assert.Equal(scenario.MentorOneId, responsible.GetProperty("id").GetInt32());
            Assert.True(ownerPayload.RootElement.TryGetProperty("tipoUsuario", out _));

            using var administrator = CreateClient(factory, scenario.AdministratorId, NivelUsuario.Administrador);
            using var adminResponse = await administrator.GetAsync($"/api/Usuarios/{scenario.MenteeTwoId}");
            using var adminPayload = await ReadJsonAsync(adminResponse);

            Assert.Equal(HttpStatusCode.OK, adminResponse.StatusCode);
            Assert.Equal(scenario.MenteeTwoId, adminPayload.RootElement.GetProperty("id").GetInt32());
            Assert.True(adminPayload.RootElement.TryGetProperty("tipoUsuario", out _));
        }
    }

    [Fact]
    public async Task AnonymousProfileAndResponsibleRequestsReturnUnauthorized()
    {
        var (factory, scenario) = await CreateScenarioAsync();
        await using (factory)
        {
            using var anonymous = factory.CreateClient();

            using var profileResponse = await anonymous.GetAsync($"/api/Usuarios/{scenario.MenteeOneId}");
            using var dependentsResponse = await anonymous.GetAsync($"/api/Usuarios/{scenario.MentorOneId}/dependentes");

            Assert.Equal(HttpStatusCode.Unauthorized, profileResponse.StatusCode);
            Assert.Equal(HttpStatusCode.Unauthorized, dependentsResponse.StatusCode);
        }
    }

    [Fact]
    public async Task ManagementTypeListingIsAdminOnly()
    {
        var (factory, scenario) = await CreateScenarioAsync();
        await using (factory)
        {
            using var mentor = CreateClient(factory, scenario.MentorOneId, NivelUsuario.Mentor);
            using var mentee = CreateClient(factory, scenario.MenteeOneId, NivelUsuario.Mentorado);
            using var administrator = CreateClient(factory, scenario.AdministratorId, NivelUsuario.Administrador);

            using var mentorResponse = await mentor.GetAsync($"/api/Usuarios/tipo/{(int)TipoUsuario.Academico}");
            using var menteeResponse = await mentee.GetAsync($"/api/Usuarios/tipo/{(int)TipoUsuario.Academico}");
            using var adminResponse = await administrator.GetAsync($"/api/Usuarios/tipo/{(int)TipoUsuario.Academico}");

            Assert.Equal(HttpStatusCode.Forbidden, mentorResponse.StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, menteeResponse.StatusCode);
            Assert.Equal(HttpStatusCode.OK, adminResponse.StatusCode);
        }
    }

    [Fact]
    public async Task ResponsibleGetsOnlyOwnDependentsAndPendingApprovalsAsMinimalProfiles()
    {
        var (factory, scenario) = await CreateScenarioAsync();
        await using (factory)
        {
            await SetStatusAsync(factory, scenario.MenteeOneId, StatusUsuario.Pendente);
            await AddLoanAsync(factory, scenario.MenteeTwoId, scenario.MentorTwoId);

            using var mentor = CreateClient(factory, scenario.MentorOneId, NivelUsuario.Mentor);
            using var dependentsResponse = await mentor.GetAsync($"/api/Usuarios/{scenario.MentorOneId}/dependentes");
            using var dependentsPayload = await ReadJsonAsync(dependentsResponse);
            using var pendingResponse = await mentor.GetAsync($"/api/Usuarios/{scenario.MentorOneId}/dependentes/aprovacao");
            using var pendingPayload = await ReadJsonAsync(pendingResponse);

            Assert.Equal(HttpStatusCode.OK, dependentsResponse.StatusCode);
            Assert.Equal(HttpStatusCode.OK, pendingResponse.StatusCode);
            Assert.Equal(scenario.MenteeOneId, Assert.Single(dependentsPayload.RootElement.EnumerateArray())
                .GetProperty("id").GetInt32());
            Assert.Equal(scenario.MenteeOneId, Assert.Single(pendingPayload.RootElement.EnumerateArray())
                .GetProperty("id").GetInt32());
            Assert.Equal(
                MinimalProfileFields.Order(StringComparer.Ordinal),
                dependentsPayload.RootElement[0].EnumerateObject()
                    .Select(property => property.Name)
                    .Order(StringComparer.Ordinal));

            using var loansResponse = await mentor.GetAsync(
                $"/api/Usuarios/{scenario.MentorOneId}/dependentes/emprestimos");
            await AssertEmptyListAsync(loansResponse);

            using var administrator = CreateClient(factory, scenario.AdministratorId, NivelUsuario.Administrador);
            using var adminLoansResponse = await administrator.GetAsync(
                $"/api/Usuarios/{scenario.MentorTwoId}/dependentes/emprestimos");
            using var adminLoansPayload = await ReadJsonAsync(adminLoansResponse);
            Assert.Equal(HttpStatusCode.OK, adminLoansResponse.StatusCode);
            Assert.Equal(
                scenario.MenteeTwoId,
                Assert.Single(adminLoansPayload.RootElement.EnumerateArray())
                    .GetProperty("solicitante")
                    .GetProperty("id")
                    .GetInt32());

            using var crossResponse = await mentor.GetAsync($"/api/Usuarios/{scenario.MentorTwoId}/dependentes");
            using var crossLoansResponse = await mentor.GetAsync(
                $"/api/Usuarios/{scenario.MentorTwoId}/dependentes/emprestimos");
            using var missingResponse = await mentor.GetAsync("/api/Usuarios/999999/dependentes");
            Assert.Equal(HttpStatusCode.NotFound, crossResponse.StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, crossLoansResponse.StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, missingResponse.StatusCode);
            Assert.Equal(
                await missingResponse.Content.ReadAsStringAsync(),
                await crossResponse.Content.ReadAsStringAsync());
        }
    }

    [Fact]
    public async Task AuthorizedEmptyListsReturnSuccessAndAdministratorCanSelectResponsible()
    {
        var (factory, scenario) = await CreateScenarioAsync();
        await using (factory)
        {
            using var administrator = CreateClient(factory, scenario.AdministratorId, NivelUsuario.Administrador);
            using var emptyDependents = await administrator.GetAsync($"/api/Usuarios/{scenario.AdministratorId}/dependentes");
            using var emptyPending = await administrator.GetAsync($"/api/Usuarios/{scenario.AdministratorId}/dependentes/aprovacao");
            using var emptyLoans = await administrator.GetAsync($"/api/Usuarios/{scenario.AdministratorId}/dependentes/emprestimos");
            using var emptyGlobalPending = await administrator.GetAsync("/api/Usuarios/aprovacao");
            using var adminDependents = await administrator.GetAsync($"/api/Usuarios/{scenario.MentorTwoId}/dependentes");
            using var adminPayload = await ReadJsonAsync(adminDependents);

            await AssertEmptyListAsync(emptyDependents);
            await AssertEmptyListAsync(emptyPending);
            await AssertEmptyListAsync(emptyLoans);
            await AssertEmptyListAsync(emptyGlobalPending);
            Assert.Equal(HttpStatusCode.OK, adminDependents.StatusCode);
            Assert.Equal(scenario.MenteeTwoId, Assert.Single(adminPayload.RootElement.EnumerateArray())
                .GetProperty("id").GetInt32());
        }
    }

    private async Task<(IntegrationWebApplicationFactory Factory, AuthenticationProtectionScenarioData Scenario)> CreateScenarioAsync()
    {
        var factory = new IntegrationWebApplicationFactory(database);
        await factory.RecreateDatabaseAsync();

        var scenario = AuthenticationProtectionScenarioData.Create($"T008-{Guid.NewGuid():N}");
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<
            Microsoft.AspNetCore.Identity.IPasswordHasher<Usuario>>();
        await scenario.PersistAsync(context, passwordHasher);
        return (factory, scenario);
    }

    private static HttpClient CreateClient(
        IntegrationWebApplicationFactory factory,
        int userId,
        NivelUsuario role)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            JwtSessionVersionTests.CreateToken(userId, "0", "false", role));
        return client;
    }

    private static async Task SetStatusAsync(
        IntegrationWebApplicationFactory factory,
        int userId,
        StatusUsuario status)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await context.Usuarios.SingleAsync(candidate => candidate.Id == userId);
        user.Status = status;
        await context.SaveChangesAsync();
    }

    private static async Task AddLoanAsync(
        IntegrationWebApplicationFactory factory,
        int borrowerId,
        int approverId)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        context.Emprestimos.Add(new Emprestimo
        {
            DataRealizacao = new DateTime(2026, 10, 13, 12, 0, 0, DateTimeKind.Utc),
            Status = StatusEmprestimo.Pendente,
            SolicitanteId = borrowerId,
            AprovadorId = approverId
        });
        await context.SaveChangesAsync();
    }

    private static async Task<JsonDocument> ReadJsonAsync(HttpResponseMessage response)
    {
        var content = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(content);
    }

    private static async Task AssertEmptyListAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var payload = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(JsonValueKind.Array, payload.RootElement.ValueKind);
        Assert.Empty(payload.RootElement.EnumerateArray());
    }
}
