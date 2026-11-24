using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using Microsoft.Extensions.DependencyInjection;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class ApiPaginationContractTests(PostgreSqlContainerFixture database)
{
    private const string ProductsPath = "/api/Produtos";
    private const string AdminCatalogPath = "/api/Produtos/catalogo-administrativo";

    [Fact]
    public async Task ProductPagesUseStableNameAndIdOrderAndKeepTotalsAfterEnd()
    {
        await using var factory = await CreateFactoryAsync(NivelUsuario.Administrador, context =>
        {
            context.Produtos.AddRange(
                Product(10, "Zeta", TipoProduto.Outro),
                Product(8, "Alpha", TipoProduto.Outro),
                Product(3, "Alpha", TipoProduto.Outro),
                Product(5, "Beta", TipoProduto.Outro),
                Product(1, "Aardvark oculto", TipoProduto.Outro, deactivated: true),
                QuimicoProduct(12, "Química"));
        });
        using var client = AuthenticatedClient(factory, NivelUsuario.Administrador);

        using var firstResponse = await client.GetAsync($"{ProductsPath}?pagina=1&tamanhoPagina=2");
        var firstPage = await ReadPageAsync(firstResponse);
        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);
        Assert.Equal(new[] { 3, 8 }, ReadIds(firstPage));
        Assert.Equal(5, firstPage.GetProperty("totalItens").GetInt32());
        Assert.Equal(3, firstPage.GetProperty("totalPaginas").GetInt32());

        using var secondResponse = await client.GetAsync($"{ProductsPath}?pagina=2&tamanhoPagina=2");
        var secondPage = await ReadPageAsync(secondResponse);
        Assert.Equal(new[] { 5, 12 }, ReadIds(secondPage));
        Assert.Equal(5, secondPage.GetProperty("totalItens").GetInt32());

        using var thirdResponse = await client.GetAsync($"{ProductsPath}?pagina=3&tamanhoPagina=2");
        var thirdPage = await ReadPageAsync(thirdResponse);
        Assert.Equal(new[] { 10 }, ReadIds(thirdPage));

        using var beyondEndResponse = await client.GetAsync($"{ProductsPath}?pagina=4&tamanhoPagina=2");
        var beyondEndPage = await ReadPageAsync(beyondEndResponse);
        Assert.Empty(ReadIds(beyondEndPage));
        Assert.Equal(5, beyondEndPage.GetProperty("totalItens").GetInt32());
        Assert.Equal(3, beyondEndPage.GetProperty("totalPaginas").GetInt32());
    }

    [Theory]
    [InlineData("pagina=0")]
    [InlineData("pagina=abc")]
    [InlineData("tamanhoPagina=0")]
    [InlineData("tamanhoPagina=101")]
    [InlineData("pagina=2147483647&tamanhoPagina=100")]
    public async Task InvalidPageParametersReturnPaginationInvalid(string query)
    {
        await using var factory = await CreateFactoryAsync(NivelUsuario.Administrador);
        using var client = AuthenticatedClient(factory, NivelUsuario.Administrador);

        using var response = await client.GetAsync($"{ProductsPath}?{query}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("pagination_invalid", body.RootElement.GetProperty("code").GetString());
    }

    [Fact]
    public async Task MaximumPageSizeIsAcceptedAndEmptyFilterUsesZeroPages()
    {
        await using var factory = await CreateFactoryAsync(NivelUsuario.Administrador, context =>
            context.Produtos.Add(QuimicoProduct(1, "Somente item")));
        using var client = AuthenticatedClient(factory, NivelUsuario.Administrador);

        using var maximumResponse = await client.GetAsync($"{ProductsPath}?tamanhoPagina=100");
        var maximumPage = await ReadPageAsync(maximumResponse);
        Assert.Equal(HttpStatusCode.OK, maximumResponse.StatusCode);
        Assert.Equal(100, maximumPage.GetProperty("tamanhoPagina").GetInt32());
        Assert.Equal(1, maximumPage.GetProperty("totalPaginas").GetInt32());

        using var emptyResponse = await client.GetAsync($"{ProductsPath}/tipo/{(int)TipoProduto.Outro}");
        var emptyPage = await ReadPageAsync(emptyResponse);
        Assert.Equal(HttpStatusCode.OK, emptyResponse.StatusCode);
        Assert.Empty(ReadIds(emptyPage));
        Assert.Equal(0, emptyPage.GetProperty("totalItens").GetInt32());
        Assert.Equal(0, emptyPage.GetProperty("totalPaginas").GetInt32());
    }

    [Fact]
    public async Task ProductTypeFilterIsReappliedToEachPage()
    {
        await using var factory = await CreateFactoryAsync(NivelUsuario.Administrador, context =>
        {
            context.Produtos.AddRange(
                QuimicoProduct(10, "Zeta químico"),
                Product(9, "Beta outro", TipoProduto.Outro),
                QuimicoProduct(8, "Alpha químico"),
                Product(7, "Alpha outro", TipoProduto.Outro));
        });
        using var client = AuthenticatedClient(factory, NivelUsuario.Administrador);
        var chemicalType = (int)TipoProduto.Quimico;

        using var firstResponse = await client.GetAsync($"{ProductsPath}/tipo/{chemicalType}?pagina=1&tamanhoPagina=1");
        var firstPage = await ReadPageAsync(firstResponse);
        using var secondResponse = await client.GetAsync($"{ProductsPath}/tipo/{chemicalType}?pagina=2&tamanhoPagina=1");
        var secondPage = await ReadPageAsync(secondResponse);

        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);
        Assert.Equal(new[] { 8 }, ReadIds(firstPage));
        Assert.Equal(new[] { 10 }, ReadIds(secondPage));
        Assert.Equal(2, secondPage.GetProperty("totalItens").GetInt32());
    }

    [Fact]
    public async Task AdministrativeCatalogUsesTheSameEnvelopeAndRechecksRoleForEveryPage()
    {
        await using var factory = await CreateFactoryAsync(NivelUsuario.Administrador, context =>
        {
            context.Produtos.AddRange(
                Product(3, "Beta", TipoProduto.Outro),
                Product(1, "Alpha", TipoProduto.Outro),
                Product(2, "Alpha", TipoProduto.Outro));
        });
        using var administrator = AuthenticatedClient(factory, NivelUsuario.Administrador);

        using var response = await administrator.GetAsync($"{AdminCatalogPath}?pagina=1&tamanhoPagina=2");
        var page = await ReadPageAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(new[] { 1, 2 }, ReadIds(page));
        Assert.Equal(3, page.GetProperty("totalItens").GetInt32());

        using var mentor = AuthenticatedClient(factory, NivelUsuario.Mentor);
        using var denied = await mentor.GetAsync($"{AdminCatalogPath}?pagina=2&tamanhoPagina=2");
        Assert.Equal(HttpStatusCode.Forbidden, denied.StatusCode);
    }

    private async Task<IntegrationWebApplicationFactory> CreateFactoryAsync(
        NivelUsuario role,
        Action<AppDbContext>? seed = null)
    {
        var factory = new IntegrationWebApplicationFactory(database);
        await factory.RecreateDatabaseAsync();
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        context.Usuarios.Add(JwtSessionVersionTests.CreateUser(userLevel: role));
        seed?.Invoke(context);
        await context.SaveChangesAsync();
        return factory;
    }

    private static Produto Product(int id, string name, TipoProduto type, bool deactivated = false) => new()
    {
        Id = id,
        NomeProduto = name,
        Tipo = type,
        Quantidade = 4,
        QuantidadeMinima = 1,
        UnidadeMedida = UnidadeMedida.Unidade,
        Status = StatusProduto.Disponivel,
        Desativado = deactivated,
        UltimaModificacao = new DateTime(2026, 11, 1, 0, 0, 0, DateTimeKind.Utc)
    };

    private static Quimico QuimicoProduct(int id, string name) => new()
    {
        Id = id,
        NomeProduto = name,
        Quantidade = 4,
        QuantidadeMinima = 1,
        UnidadeMedida = UnidadeMedida.Grama,
        Status = StatusProduto.Disponivel,
        UltimaModificacao = new DateTime(2026, 11, 1, 0, 0, 0, DateTimeKind.Utc),
        Cor = Cor.Incolor,
        Odor = Odor.Inodoro,
        FormulaQuimica = "H2O",
        Grupo = Grupo.Outros
    };

    private static HttpClient AuthenticatedClient(IntegrationWebApplicationFactory factory, NivelUsuario role)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer", JwtSessionVersionTests.CreateToken(42, "3", "false", role));
        return client;
    }

    private static async Task<JsonElement> ReadPageAsync(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.Clone();
    }

    private static int[] ReadIds(JsonElement page) => page.GetProperty("itens")
        .EnumerateArray()
        .Select(product => product.GetProperty("id").GetInt32())
        .ToArray();
}
