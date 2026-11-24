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
public sealed class ProductAlertProjectionTests(PostgreSqlContainerFixture database)
{
    private const string AdministrativeCatalogPath = "/api/Produtos/catalogo-administrativo";
    private const string LegacyAlertPath = "/api/Produtos/emAlerta";
    private static readonly int[] ExpectedLegacyAlertIds = [10, 11, 12, 15, 16];
    private static readonly DateTimeOffset BeforeSaoPauloMidnight =
        new(2026, 11, 18, 2, 59, 0, TimeSpan.Zero);

    [Fact]
    public async Task AdministrativeCatalogProjectsActiveProductsAndIndependentAlertReasons()
    {
        var clock = new ControlledTimeProvider(BeforeSaoPauloMidnight);
        await using var factory = await CreateFactoryAsync(clock, SeedAlertBoundaryProductsAsync);
        using var client = CreateAuthenticatedClient(factory, NivelUsuario.Administrador);

        using var administrativeResponse = await client.GetAsync(AdministrativeCatalogPath);

        Assert.Equal(HttpStatusCode.OK, administrativeResponse.StatusCode);
        using var administrativeDocument = JsonDocument.Parse(
            await administrativeResponse.Content.ReadAsStringAsync());
        var administrativeProducts = administrativeDocument.RootElement
            .GetProperty("itens")
            .EnumerateArray()
            .ToDictionary(product => product.GetProperty("id").GetInt32());

        Assert.Equal(9, administrativeProducts.Count);
        Assert.DoesNotContain(17, administrativeProducts.Keys);
        AssertMotives(administrativeProducts[10], "validade");
        AssertMotives(administrativeProducts[11], "validade");
        AssertMotives(administrativeProducts[12], "validade");
        AssertMotives(administrativeProducts[13]);
        AssertMotives(administrativeProducts[14]);
        AssertMotives(administrativeProducts[15], "estoque_abaixo_minimo");
        AssertMotives(administrativeProducts[16], "estoque_abaixo_minimo", "validade");
        AssertMotives(administrativeProducts[18]);
        Assert.Equal(250, administrativeProducts[18].GetProperty("capacidadeMl").GetSingle());
        Assert.Equal(JsonValueKind.Null, administrativeProducts[19].GetProperty("capacidadeMl").ValueKind);
        Assert.Equal(JsonValueKind.Null, administrativeProducts[10].GetProperty("capacidadeMl").ValueKind);

        using var legacyAlertResponse = await client.GetAsync(LegacyAlertPath);

        Assert.Equal(HttpStatusCode.OK, legacyAlertResponse.StatusCode);
        using var legacyAlertDocument = JsonDocument.Parse(await legacyAlertResponse.Content.ReadAsStringAsync());
        var legacyAlertProducts = legacyAlertDocument.RootElement.EnumerateArray().ToArray();
        Assert.Equal(ExpectedLegacyAlertIds,
            legacyAlertProducts.Select(product => product.GetProperty("id").GetInt32()).Order().ToArray());
        Assert.All(legacyAlertProducts, product =>
        {
            Assert.False(product.TryGetProperty("motivosAlerta", out _));
            Assert.False(product.TryGetProperty("capacidadeMl", out _));
        });

        using var generalCatalogResponse = await client.GetAsync("/api/Produtos");

        Assert.Equal(HttpStatusCode.OK, generalCatalogResponse.StatusCode);
        using var generalCatalogDocument = JsonDocument.Parse(
            await generalCatalogResponse.Content.ReadAsStringAsync());
        var generalGlassware = generalCatalogDocument.RootElement.GetProperty("itens").EnumerateArray()
            .Single(product => product.GetProperty("id").GetInt32() == 18);
        Assert.False(generalGlassware.TryGetProperty("motivosAlerta", out _));
        Assert.False(generalGlassware.TryGetProperty("capacidadeMl", out _));
    }

    [Fact]
    public async Task ValidityWindowUsesInstitutionalCivilDayAcrossMidnight()
    {
        var clock = new ControlledTimeProvider(BeforeSaoPauloMidnight);
        await using var factory = await CreateFactoryAsync(clock, context =>
        {
            context.Produtos.Add(CreateProduct(
                30,
                "Vence no décimo dia após a virada",
                new DateTime(2026, 11, 28, 0, 0, 0, DateTimeKind.Utc),
                quantity: 3,
                minimum: 3));
            return Task.CompletedTask;
        });
        using var client = CreateAuthenticatedClient(factory, NivelUsuario.Administrador);

        using var beforeMidnight = await client.GetAsync(AdministrativeCatalogPath);
        Assert.Equal(HttpStatusCode.OK, beforeMidnight.StatusCode);
        AssertMotives(await FindProductAsync(beforeMidnight, 30));

        clock.SetUtcNow(new DateTimeOffset(2026, 11, 18, 3, 0, 0, TimeSpan.Zero));
        using var afterMidnight = await client.GetAsync(AdministrativeCatalogPath);

        Assert.Equal(HttpStatusCode.OK, afterMidnight.StatusCode);
        AssertMotives(await FindProductAsync(afterMidnight, 30), "validade");
    }

    [Fact]
    public async Task AdministrativeCatalogRequiresAnAdministrativeSession()
    {
        await using (var anonymousFactory = await CreateFactoryAsync(
            TimeProvider.System,
            _ => Task.CompletedTask,
            NivelUsuario.Administrador))
        {
            using var anonymousClient = anonymousFactory.CreateClient();
            using var anonymousResponse = await anonymousClient.GetAsync(AdministrativeCatalogPath);
            Assert.Equal(HttpStatusCode.Unauthorized, anonymousResponse.StatusCode);
        }

        foreach (var role in new[] { NivelUsuario.Mentor, NivelUsuario.Mentorado, NivelUsuario.Comum })
        {
            await using var factory = await CreateFactoryAsync(
                TimeProvider.System,
                _ => Task.CompletedTask,
                role);
            using var client = CreateAuthenticatedClient(factory, role);
            using var generalCatalogResponse = await client.GetAsync("/api/Produtos");
            Assert.Equal(HttpStatusCode.OK, generalCatalogResponse.StatusCode);
            using var legacyAlertResponse = await client.GetAsync(LegacyAlertPath);
            Assert.Equal(HttpStatusCode.Forbidden, legacyAlertResponse.StatusCode);
            using var response = await client.GetAsync(AdministrativeCatalogPath);
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }
    }

    private async Task<IntegrationWebApplicationFactory> CreateFactoryAsync(
        TimeProvider clock,
        Func<AppDbContext, Task> seed,
        NivelUsuario userRole = NivelUsuario.Administrador)
    {
        var factory = new IntegrationWebApplicationFactory(
            database,
            new IntegrationApplicationOptions { TimeProvider = clock });
        await factory.RecreateDatabaseAsync();
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        context.Usuarios.Add(JwtSessionVersionTests.CreateUser(userLevel: userRole));
        await seed(context);
        await context.SaveChangesAsync();
        return factory;
    }

    private static Task SeedAlertBoundaryProductsAsync(AppDbContext context)
    {
        context.Produtos.AddRange(
            CreateProduct(10, "Vencido", UtcDate(2026, 11, 16), 3, 3),
            CreateProduct(11, "Vence hoje", UtcDate(2026, 11, 17), 3, 3),
            CreateProduct(12, "Vence no décimo dia", UtcDate(2026, 11, 27), 3, 3),
            CreateProduct(13, "Vence no décimo primeiro dia", UtcDate(2026, 11, 28), 3, 3),
            CreateProduct(14, "Sem validade", null, 3, 3),
            CreateProduct(15, "Somente estoque baixo", null, 2, 3),
            CreateProduct(16, "Dois motivos", UtcDate(2026, 11, 20), 2, 3),
            CreateProduct(17, "Desativado", UtcDate(2026, 11, 16), 2, 3, deactivated: true),
            CreateGlassware(18),
            CreateGlassware(19, capacity: null));
        return Task.CompletedTask;
    }

    private static Produto CreateProduct(
        int id,
        string name,
        DateTime? expiration,
        float quantity,
        float minimum,
        bool deactivated = false) => new()
    {
        Id = id,
        NomeProduto = name,
        Tipo = TipoProduto.Outro,
        Quantidade = quantity,
        QuantidadeMinima = minimum,
        UnidadeMedida = UnidadeMedida.Unidade,
        DataValidade = expiration,
        Status = StatusProduto.Disponivel,
        Desativado = deactivated,
        UltimaModificacao = UtcDate(2026, 11, 1)
    };

    private static Vidraria CreateGlassware(int id, float? capacity = 250) => new()
    {
        Id = id,
        NomeProduto = "Béquer",
        Tipo = TipoProduto.Vidraria,
        Quantidade = 4,
        QuantidadeMinima = 4,
        UnidadeMedida = UnidadeMedida.Unidade,
        Status = StatusProduto.Disponivel,
        UltimaModificacao = UtcDate(2026, 11, 1),
        Material = MaterialVidraria.VidroBorossilicato,
        Formato = FormatoVidraria.Cilindrica,
        Altura = AlturaVidraria.Indefinido,
        Capacidade = capacity
    };

    private static DateTime UtcDate(int year, int month, int day) =>
        new(year, month, day, 0, 0, 0, DateTimeKind.Utc);

    private static HttpClient CreateAuthenticatedClient(
        IntegrationWebApplicationFactory factory,
        NivelUsuario role)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer", JwtSessionVersionTests.CreateToken(42, "3", "false", role));
        return client;
    }

    private static async Task<JsonElement> FindProductAsync(HttpResponseMessage response, int productId)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.GetProperty("itens").EnumerateArray()
            .Single(product => product.GetProperty("id").GetInt32() == productId)
            .Clone();
    }

    private static void AssertMotives(JsonElement product, params string[] expected)
    {
        var actual = product.GetProperty("motivosAlerta").EnumerateArray()
            .Select(motive => motive.GetString())
            .ToArray();
        Assert.Equal(expected, actual);
    }
}
