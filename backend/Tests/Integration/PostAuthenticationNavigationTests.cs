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
public sealed class PostAuthenticationNavigationTests(PostgreSqlContainerFixture database)
{
    [Fact]
    public async Task GlobalLoans_AreRestrictedToAdministrators_AndEmptyListIsSuccessful()
    {
        await using var factory = await CreateFactoryAsync(
            CreateUser(42, NivelUsuario.Administrador),
            CreateUser(43, NivelUsuario.Mentor),
            CreateUser(44, NivelUsuario.Mentorado));

        using var administratorResponse = await GetAsync(
            factory,
            JwtSessionVersionTests.CreateToken(42, "3", "false", NivelUsuario.Administrador),
            "/api/Emprestimos");
        Assert.Equal(HttpStatusCode.OK, administratorResponse.StatusCode);
        await AssertEmptyArrayAsync(administratorResponse);

        Assert.Equal(
            HttpStatusCode.Forbidden,
            (await GetAsync(factory, JwtSessionVersionTests.CreateToken(43, "3", "false", NivelUsuario.Mentor), "/api/Emprestimos")).StatusCode);
        Assert.Equal(
            HttpStatusCode.Forbidden,
            (await GetAsync(factory, JwtSessionVersionTests.CreateToken(44, "3", "false", NivelUsuario.Mentorado), "/api/Emprestimos")).StatusCode);
        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (await GetAsync(factory, token: null, "/api/Emprestimos")).StatusCode);
    }

    [Fact]
    public async Task UserLoans_ExistingUserWithoutLoansReturnsEmpty_AndMissingUserRemainsNotFound()
    {
        await using var factory = await CreateFactoryAsync(CreateUser(42, NivelUsuario.Administrador));
        var token = JwtSessionVersionTests.CreateToken(42, "3", "false", NivelUsuario.Administrador);

        using var emptyResponse = await GetAsync(factory, token, "/api/Emprestimos/usuario/42");
        Assert.Equal(HttpStatusCode.OK, emptyResponse.StatusCode);
        await AssertEmptyArrayAsync(emptyResponse);

        using var missingResponse = await GetAsync(factory, token, "/api/Emprestimos/usuario/999");
        Assert.Equal(HttpStatusCode.NotFound, missingResponse.StatusCode);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task DependentLoans_ExistingResponsibleWithoutLoansReturnsEmpty_AndMissingUserRemainsNotFound(
        bool hasDependent)
    {
        var responsible = CreateUser(42, NivelUsuario.Mentor);
        var users = hasDependent
            ? new[] { responsible, CreateUser(43, NivelUsuario.Mentorado, responsible.Id) }
            : new[] { responsible };
        await using var factory = await CreateFactoryAsync(users);
        var token = JwtSessionVersionTests.CreateToken(42, "3", "false", NivelUsuario.Mentor);

        using var emptyResponse = await GetAsync(factory, token, "/api/Usuarios/42/dependentes/emprestimos");
        Assert.Equal(HttpStatusCode.OK, emptyResponse.StatusCode);
        await AssertEmptyArrayAsync(emptyResponse);

        using var missingResponse = await GetAsync(factory, token, "/api/Usuarios/999/dependentes/emprestimos");
        Assert.Equal(HttpStatusCode.NotFound, missingResponse.StatusCode);
    }

    [Fact]
    public async Task LoanDetails_AdministratorCanReadNullableProductRelations()
    {
        var administrator = CreateUser(42, NivelUsuario.Administrador);
        var requester = CreateUser(43, NivelUsuario.Mentorado);
        var product = new Produto
        {
            Id = 10,
            NomeProduto = "Produto sem lote",
            Tipo = TipoProduto.Outro,
            Quantidade = 10,
            QuantidadeMinima = 1,
            Status = StatusProduto.Disponivel,
            UltimaModificacao = new DateTime(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc)
        };
        var loan = new Emprestimo
        {
            Id = 77,
            DataRealizacao = new DateTime(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc),
            Status = StatusEmprestimo.Pendente,
            SolicitanteId = requester.Id,
            Solicitante = requester,
            Produtos =
            [
                new ProdutoEmprestado
                {
                    EmprestimoId = 77,
                    ProdutoId = product.Id,
                    Produto = product,
                    Quantidade = 2
                }
            ]
        };
        await using var factory = await CreateFactoryAsync(administrator, requester, product, loan);
        var token = JwtSessionVersionTests.CreateToken(42, "3", "false", NivelUsuario.Administrador);

        using var response = await GetAsync(factory, token, "/api/Emprestimos/77");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await ParseJsonAsync(response);
        Assert.Equal(77, payload.GetProperty("id").GetInt32());
        Assert.Equal(JsonValueKind.Null, payload.GetProperty("aprovador").ValueKind);
        Assert.Equal(JsonValueKind.Null, payload.GetProperty("produtos")[0].GetProperty("produto").GetProperty("lote").ValueKind);

        using var missingResponse = await GetAsync(factory, token, "/api/Emprestimos/999");
        Assert.Equal(HttpStatusCode.NotFound, missingResponse.StatusCode);
    }

    private async Task<IntegrationWebApplicationFactory> CreateFactoryAsync(params object[] entities)
    {
        var factory = new IntegrationWebApplicationFactory(database);
        await factory.RecreateDatabaseAsync();

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        foreach (var entity in entities)
        {
            context.Add(entity);
        }

        await context.SaveChangesAsync();
        return factory;
    }

    private static async Task<HttpResponseMessage> GetAsync(
        IntegrationWebApplicationFactory factory,
        string? token,
        string path)
    {
        using var client = factory.CreateClient();
        if (token is not null)
        {
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }

        return await client.GetAsync(path);
    }

    private static async Task<JsonElement> ParseJsonAsync(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.Clone();

    private static async Task AssertEmptyArrayAsync(HttpResponseMessage response)
    {
        var payload = await ParseJsonAsync(response);
        Assert.Equal(JsonValueKind.Array, payload.ValueKind);
        Assert.Empty(payload.EnumerateArray());
    }

    private static Usuario CreateUser(int id, NivelUsuario level, int? responsibleId = null) => new()
    {
        Id = id,
        NomeCompleto = $"Usuário de integração {id}",
        Email = $"integration-{id}@example.test",
        SenhaHash = "unused-hash",
        NivelUsuario = level,
        TipoUsuario = TipoUsuario.Comum,
        Status = StatusUsuario.Habilitado,
        ResponsavelId = responsibleId,
        ExigeTrocaSenha = false,
        VersaoSessao = 3
    };
}
