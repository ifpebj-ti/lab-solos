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
public sealed class LoteInventoryLinkTests(PostgreSqlContainerFixture database)
{
    private static readonly int[] BothProductIds = [10, 11];

    [Fact]
    public async Task NewLotIsRecoveredByLocationIdCodeAndInventoryWithoutChangingStock()
    {
        await using var factory = await CreateScenarioAsync();
        using var client = CreateAdministratorClient(factory);

        using var created = await client.PostAsJsonAsync("/api/Lote/AddLote",
            Payload(" Lote-A ", BothProductIds));

        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        Assert.NotNull(created.Headers.Location);
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var lot = await context.Lotes.AsNoTracking().SingleAsync();
        Assert.Equal("Lote-A", lot.CodigoLote);
        foreach (var path in new[]
        {
            created.Headers.Location.ToString(),
            $"/api/Lote/GetById/{lot.Id}",
            "/api/Lote/GetByCodigo/lote-a"
        })
        {
            using var response = await client.GetAsync(path);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var body = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal("Lote-A", body.GetProperty("codigoLote").GetString());
            Assert.Equal(BothProductIds, body.GetProperty("produtos").EnumerateArray()
                .Select(product => product.GetProperty("id").GetInt32()).Order());
        }
        using var inventory = await client.GetAsync("/api/Produtos");
        Assert.Equal(HttpStatusCode.OK, inventory.StatusCode);
        var products = await inventory.Content.ReadFromJsonAsync<JsonElement>();
        Assert.All(
            products.GetProperty("itens").EnumerateArray(),
            product => Assert.Equal(
                "Lote-A",
                product.GetProperty("lote").GetProperty("codigoLote").GetString()));
        await AssertInventoryAsync(factory, 7, 13, expectedLinked: 2);
    }

    [Theory]
    [InlineData("codigoLote", "   ")]
    [InlineData("dataFabricacao", "2026-02-31")]
    [InlineData("tipo", "999")]
    public async Task InvalidInputHasAFieldErrorAndLeavesNoLotOrLink(string field, string value)
    {
        await using var factory = await CreateScenarioAsync();
        using var client = CreateAdministratorClient(factory);
        var payload = Payload("invalid-lot", [10]);
        payload[field] = value;

        using var response = await client.PostAsJsonAsync("/api/Lote/AddLote", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("errors").TryGetProperty(field, out _));
        await AssertInventoryAsync(factory, 7, 13, expectedLinked: 0);
        await using var scope = factory.Services.CreateAsyncScope();
        Assert.Empty(await scope.ServiceProvider.GetRequiredService<AppDbContext>().Lotes.ToListAsync());
    }

    [Fact]
    public async Task MissingProductRejectsTheWholeBatch()
    {
        await using var factory = await CreateScenarioAsync();
        using var client = CreateAdministratorClient(factory);

        using var response = await client.PostAsJsonAsync("/api/Lote/AddLote",
            Payload("missing-product", [10, 999999]));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("errors").TryGetProperty("produtoIds", out _));
        await AssertInventoryAsync(factory, 7, 13, expectedLinked: 0);
        await using var scope = factory.Services.CreateAsyncScope();
        Assert.Empty(await scope.ServiceProvider.GetRequiredService<AppDbContext>().Lotes.ToListAsync());
    }

    [Fact]
    public async Task ExistingCurrentLotPreventsOverwritingTheLinkForAnEntireBatch()
    {
        await using var factory = await CreateScenarioAsync();
        int previousLotId;
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var previous = new Lote { CodigoLote = "previous-lot" };
            context.Lotes.Add(previous);
            var product = await context.Produtos.SingleAsync(item => item.Id == 11);
            product.Lote = previous;
            await context.SaveChangesAsync();
            previousLotId = previous.Id;
        }
        using var client = CreateAdministratorClient(factory);

        using var response = await client.PostAsJsonAsync("/api/Lote/AddLote",
            Payload("replacement-lot", [10, 11]));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        await AssertInventoryAsync(factory, 7, 13, expectedLinked: 1);
        await using var checkScope = factory.Services.CreateAsyncScope();
        var checkContext = checkScope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(previousLotId, (await checkContext.Produtos.SingleAsync(item => item.Id == 11)).LoteId);
        Assert.Equal(previousLotId, Assert.Single(await checkContext.Lotes.ToListAsync()).Id);
    }

    [Fact]
    public async Task ConcurrentEquivalentCodesCreateOneLotAndOneAssociation()
    {
        await using var factory = await CreateScenarioAsync();
        using var first = CreateAdministratorClient(factory);
        using var second = CreateAdministratorClient(factory);

        var responses = await Task.WhenAll(
            first.PostAsJsonAsync("/api/Lote/AddLote", Payload(" Concurrent-Lot ", [10])),
            second.PostAsJsonAsync("/api/Lote/AddLote", Payload("concurrent-lot", [11])));
        try
        {
            Assert.Equal(1, responses.Count(response => response.StatusCode == HttpStatusCode.Created));
            Assert.Equal(1, responses.Count(response => response.StatusCode == HttpStatusCode.Conflict));
            await using var scope = factory.Services.CreateAsyncScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.Single(await context.Lotes.ToListAsync());
            await AssertInventoryAsync(factory, 7, 13, expectedLinked: 1);
        }
        finally
        {
            foreach (var response in responses)
                response.Dispose();
        }
    }

    [Fact]
    public async Task DatabaseRejectsEquivalentCodesFromOtherWriters()
    {
        await using var factory = await CreateScenarioAsync();
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        context.Lotes.AddRange(
            new Lote { CodigoLote = " Duplicate-Code " },
            new Lote { CodigoLote = "duplicate-code" });

        await Assert.ThrowsAsync<DbUpdateException>(() => context.SaveChangesAsync());
    }

    private async Task<IntegrationWebApplicationFactory> CreateScenarioAsync()
    {
        var factory = new IntegrationWebApplicationFactory(database);
        await factory.RecreateDatabaseAsync();
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        context.Usuarios.Add(JwtSessionVersionTests.CreateUser(userLevel: NivelUsuario.Administrador));
        context.Produtos.AddRange(Product(10, 7), Product(11, 13));
        await context.SaveChangesAsync();
        return factory;
    }

    private static Produto Product(int id, float quantity) => new()
    {
        Id = id, NomeProduto = $"Produto sintético de lote {id}", Tipo = TipoProduto.Outro,
        Quantidade = quantity, QuantidadeMinima = 1, UnidadeMedida = UnidadeMedida.Unidade,
        Status = StatusProduto.Disponivel,
        UltimaModificacao = new DateTime(2026, 11, 17, 12, 0, 0, DateTimeKind.Utc)
    };

    private static Dictionary<string, object?> Payload(string code, int[] productIds) => new()
    {
        ["codigoLote"] = code, ["produtoIds"] = productIds, ["quantidadeLote"] = 1,
        ["nomeProduto"] = "Entrada descritiva do lote",
        ["tipo"] = "Outro", ["quantidade"] = 1000, ["quantidadeMinima"] = 500,
        ["localizacaoProduto"] = "Local sintético", ["dataFabricacao"] = "2026-01-01",
        ["dataValidade"] = "2027-01-01"
    };

    private static HttpClient CreateAdministratorClient(IntegrationWebApplicationFactory factory)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer",
            JwtSessionVersionTests.CreateToken(42, "3", "false", NivelUsuario.Administrador));
        return client;
    }

    private static async Task AssertInventoryAsync(
        IntegrationWebApplicationFactory factory, float first, float second, int expectedLinked)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var products = await context.Produtos.AsNoTracking().OrderBy(product => product.Id).ToListAsync();
        Assert.Equal(2, products.Count);
        Assert.Equal(first, products[0].Quantidade);
        Assert.Equal(second, products[1].Quantidade);
        Assert.All(products, product => Assert.Equal(1, product.QuantidadeMinima));
        Assert.Equal(expectedLinked, products.Count(product => product.LoteId.HasValue));
    }
}
