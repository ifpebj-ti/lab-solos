using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using Microsoft.Extensions.DependencyInjection;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class ProductAlertAccessTests(PostgreSqlContainerFixture database)
{
    private const string AlertPath = "/api/Produtos/emAlerta";
    private const string ProductName = "Produto sintético de acesso a alertas";

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task AdministratorReceivesAlertCollectionIncludingEmptyResult(bool includeProduct)
    {
        await using var factory = await CreateFactoryAsync(NivelUsuario.Administrador, includeProduct);
        using var client = CreateAuthenticatedClient(factory, NivelUsuario.Administrador);

        using var response = await client.GetAsync(AlertPath);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(JsonValueKind.Array, payload.ValueKind);
        if (includeProduct)
        {
            var product = Assert.Single(payload.EnumerateArray());
            Assert.Equal(10, product.GetProperty("id").GetInt32());
            Assert.Equal(ProductName, product.GetProperty("nomeProduto").GetString());
        }
        else
        {
            Assert.Empty(payload.EnumerateArray());
        }
    }

    [Fact]
    public async Task MissingSessionIsUnauthorizedWithoutReturningAdministrativeData()
    {
        await using var factory = await CreateFactoryAsync(NivelUsuario.Administrador);
        using var client = factory.CreateClient();

        using var response = await client.GetAsync(AlertPath);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var body = await ApiProblemContractAssertions.ReadAsync(
            response, HttpStatusCode.Unauthorized, "authentication_required");
        Assert.DoesNotContain(ProductName, body, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(NivelUsuario.Mentor)]
    [InlineData(NivelUsuario.Mentorado)]
    public async Task NonAdministrativeProfilesAreForbiddenWithoutReturningAdministrativeData(NivelUsuario role)
    {
        await using var factory = await CreateFactoryAsync(role);
        using var client = CreateAuthenticatedClient(factory, role);

        using var response = await client.GetAsync(AlertPath);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var body = await ApiProblemContractAssertions.ReadAsync(
            response, HttpStatusCode.Forbidden, "access_denied");
        Assert.DoesNotContain(ProductName, body, StringComparison.Ordinal);
    }

    private async Task<IntegrationWebApplicationFactory> CreateFactoryAsync(
        NivelUsuario role,
        bool includeProduct = true)
    {
        var factory = new IntegrationWebApplicationFactory(database);
        await factory.RecreateDatabaseAsync();
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        context.Usuarios.Add(JwtSessionVersionTests.CreateUser(userLevel: role));
        if (includeProduct)
        {
            context.Produtos.Add(new Produto
            {
                Id = 10,
                NomeProduto = ProductName,
                Tipo = TipoProduto.Outro,
                Quantidade = 1,
                QuantidadeMinima = 5,
                UnidadeMedida = UnidadeMedida.Unidade,
                Status = StatusProduto.Disponivel,
                UltimaModificacao = new DateTime(2026, 11, 1, 0, 0, 0, DateTimeKind.Utc)
            });
        }
        await context.SaveChangesAsync();
        return factory;
    }

    private static HttpClient CreateAuthenticatedClient(
        IntegrationWebApplicationFactory factory,
        NivelUsuario role)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer", JwtSessionVersionTests.CreateToken(42, "3", "false", role));
        return client;
    }
}
