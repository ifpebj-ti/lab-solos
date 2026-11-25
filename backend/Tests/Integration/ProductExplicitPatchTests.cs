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
public sealed class ProductExplicitPatchTests(PostgreSqlContainerFixture database)
{
    [Fact]
    public async Task RenamePreservesOmittedDatesStockAndSubtype()
    {
        await using var factory = new IntegrationWebApplicationFactory(database);
        var scenario = await CreateScenarioAsync(factory);
        using var client = scenario.Client;
        var before = await ReadProductAsync(factory, scenario.ProductId);

        using var response = await PatchAsync(client, scenario.ProductId,
            new { op = "replace", path = "/nomeProduto", value = "Nome atualizado" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var saved = await ReadProductAsync(factory, scenario.ProductId);
        Assert.Equal("Nome atualizado", saved.NomeProduto);
        Assert.Equal(before.DataFabricacao, saved.DataFabricacao);
        Assert.Equal(before.DataValidade, saved.DataValidade);
        Assert.Equal(before.Status, saved.Status);
        Assert.Equal(before.Quantidade, saved.Quantidade);
        Assert.Equal(before.QuantidadeMinima, saved.QuantidadeMinima);
        Assert.Equal(before.UnidadeMedida, saved.UnidadeMedida);
        Assert.Equal(before.LoteId, saved.LoteId);
        Assert.Equal(before.FormulaQuimica, saved.FormulaQuimica);
        Assert.Equal(before.PesoMolecular, saved.PesoMolecular);
        Assert.Equal(before.Catmat, saved.Catmat);
        Assert.Equal(before.Fornecedor, saved.Fornecedor);
    }

    [Theory]
    [InlineData("remove")]
    [InlineData("replace")]
    public async Task ClearsOnlyExplicitOptionalValues(string operation)
    {
        await using var factory = new IntegrationWebApplicationFactory(database);
        var scenario = await CreateScenarioAsync(factory);
        using var client = scenario.Client;
        string? clearedValue = null;

        using var response = await PatchAsync(client, scenario.ProductId,
            new { op = operation, path = "/fornecedor", value = clearedValue },
            new { op = operation, path = "/dataFabricacao", value = clearedValue },
            new { op = operation, path = "/dataValidade", value = clearedValue });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var saved = await ReadProductAsync(factory, scenario.ProductId);
        Assert.Null(saved.Fornecedor);
        Assert.Null(saved.DataFabricacao);
        Assert.Null(saved.DataValidade);
        Assert.Equal(10, saved.Quantidade);
        Assert.Equal(StatusProduto.EmUso, saved.Status);
    }

    [Theory]
    [InlineData("replace", "/catmat", "novo-catmat")]
    [InlineData("remove", "/quantidade", null)]
    [InlineData("add", "/nomeProduto", "outro nome")]
    [InlineData("replace", "/status", "999")]
    [InlineData("replace", "/status", null)]
    [InlineData("replace", "/loteId", "999")]
    public async Task InvalidOperationRejectsEntireDocument(string operation, string path, string? value)
    {
        await using var factory = new IntegrationWebApplicationFactory(database);
        var scenario = await CreateScenarioAsync(factory);
        using var client = scenario.Client;
        var before = await ReadProductAsync(factory, scenario.ProductId);

        using var response = await PatchAsync(client, scenario.ProductId,
            new { op = "replace", path = "/nomeProduto", value = "Mudança não efetivada" },
            new { op = operation, path, value });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(payload.GetProperty("errors").EnumerateObject().Any());
        var saved = await ReadProductAsync(factory, scenario.ProductId);
        Assert.Equal(before.NomeProduto, saved.NomeProduto);
        Assert.Equal(before.Status, saved.Status);
        Assert.Equal(before.Quantidade, saved.Quantidade);
        Assert.Equal(before.Catmat, saved.Catmat);
        Assert.Equal(before.LoteId, saved.LoteId);
        Assert.Equal(before.UltimaModificacao, saved.UltimaModificacao);
    }

    [Theory]
    [InlineData("2026-02-31")]
    [InlineData("2026-01-01T00:00:00Z")]
    [InlineData("")]
    [InlineData("2030-01-01")]
    public async Task InvalidOrInvertedCivilDatePreservesProduct(string value)
    {
        await using var factory = new IntegrationWebApplicationFactory(database);
        var scenario = await CreateScenarioAsync(factory);
        using var client = scenario.Client;
        var before = await ReadProductAsync(factory, scenario.ProductId);

        using var response = await PatchAsync(client, scenario.ProductId,
            new { op = "replace", path = "/dataFabricacao", value });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var saved = await ReadProductAsync(factory, scenario.ProductId);
        Assert.Equal(before.DataFabricacao, saved.DataFabricacao);
        Assert.Equal(before.DataValidade, saved.DataValidade);
        Assert.Equal(before.UltimaModificacao, saved.UltimaModificacao);
    }

    [Theory]
    [InlineData("-1")]
    [InlineData("NaN")]
    [InlineData("Infinity")]
    public async Task InvalidStockIsRejectedBeforePersistence(string value)
    {
        await using var factory = new IntegrationWebApplicationFactory(database);
        var scenario = await CreateScenarioAsync(factory);
        using var client = scenario.Client;

        using var response = await PatchAsync(client, scenario.ProductId,
            new { op = "replace", path = "/quantidade", value });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(10, (await ReadProductAsync(factory, scenario.ProductId)).Quantidade);
    }

    [Fact]
    public async Task EmptyPatchPreservesModificationTimestamp()
    {
        await using var factory = new IntegrationWebApplicationFactory(database);
        var scenario = await CreateScenarioAsync(factory);
        using var client = scenario.Client;
        var before = await ReadProductAsync(factory, scenario.ProductId);

        using var response = await PatchAsync(client, scenario.ProductId);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(before.UltimaModificacao, (await ReadProductAsync(factory, scenario.ProductId)).UltimaModificacao);
    }

    [Fact]
    public async Task PutWithOnlyExplicitNamePreservesOmittedProperties()
    {
        await using var factory = new IntegrationWebApplicationFactory(database);
        var scenario = await CreateScenarioAsync(factory);
        using var client = scenario.Client;
        var before = await ReadProductAsync(factory, scenario.ProductId);

        using var response = await client.PutAsJsonAsync($"/api/Produtos/{scenario.ProductId}",
            new { id = scenario.ProductId, nomeProduto = "Nome via PUT" });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var saved = await ReadProductAsync(factory, scenario.ProductId);
        Assert.Equal("Nome via PUT", saved.NomeProduto);
        Assert.Equal(before.Quantidade, saved.Quantidade);
        Assert.Equal(before.DataValidade, saved.DataValidade);
        Assert.Equal(before.Status, saved.Status);
        Assert.Equal(before.LoteId, saved.LoteId);
        Assert.Equal(before.UnidadeMedida, saved.UnidadeMedida);
        Assert.Equal(before.FormulaQuimica, saved.FormulaQuimica);
    }

    [Fact]
    public async Task PatchWaitsForStockWriterAndPreservesCommittedStock()
    {
        await using var factory = new IntegrationWebApplicationFactory(database);
        var scenario = await CreateScenarioAsync(factory);
        using var client = scenario.Client;
        await using var writerScope = factory.Services.CreateAsyncScope();
        var writer = writerScope.ServiceProvider.GetRequiredService<AppDbContext>();
        await using var transaction = await writer.Database.BeginTransactionAsync();
        await writer.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE \"Produtos\" SET \"Quantidade\" = 7 WHERE \"Id\" = {scenario.ProductId}");

        var request = PatchAsync(client, scenario.ProductId,
            new { op = "replace", path = "/nomeProduto", value = "Nome após concorrência" });
        await Task.Delay(200);
        Assert.False(request.IsCompleted);
        await transaction.CommitAsync();
        using var response = await request;

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var saved = await ReadProductAsync(factory, scenario.ProductId);
        Assert.Equal(7, saved.Quantidade);
        Assert.Equal("Nome após concorrência", saved.NomeProduto);
    }

    private static async Task<HttpResponseMessage> PatchAsync(HttpClient client, int productId, params object[] operations)
    {
        using var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/Produtos/{productId}")
        {
            Content = JsonContent.Create(operations)
        };
        return await client.SendAsync(request);
    }

    private static async Task<Quimico> ReadProductAsync(IntegrationWebApplicationFactory factory, int productId)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().Quimicos
            .AsNoTracking().SingleAsync(product => product.Id == productId);
    }

    private static async Task<Scenario> CreateScenarioAsync(IntegrationWebApplicationFactory factory)
    {
        await factory.RecreateDatabaseAsync();
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var administrator = new Administrador
        {
            NomeCompleto = "Administrador sintético patch",
            Email = "patch-admin@integration.test",
            SenhaHash = "synthetic-not-a-password",
            TipoUsuario = TipoUsuario.Administrador,
            NivelUsuario = NivelUsuario.Administrador,
            Status = StatusUsuario.Habilitado
        };
        var product = new Quimico
        {
            NomeProduto = "Químico sintético patch",
            Catmat = "CATMAT-HISTORICO",
            Fornecedor = "Marca histórica",
            Tipo = TipoProduto.Quimico,
            Quantidade = 10,
            QuantidadeMinima = 2,
            UnidadeMedida = UnidadeMedida.Grama,
            Status = StatusProduto.EmUso,
            FormulaQuimica = "H2O",
            PesoMolecular = 18.015f,
            Cor = Cor.Incolor,
            Odor = Odor.Inodoro,
            Grupo = Grupo.Indefinido,
            DataFabricacao = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            DataValidade = new DateTime(2028, 2, 29, 0, 0, 0, DateTimeKind.Utc),
            UltimaModificacao = new DateTime(2026, 1, 2, 12, 0, 0, DateTimeKind.Utc),
            Lote = new Lote { CodigoLote = "FIC-PATCH-LOTE" }
        };
        context.Usuarios.Add(administrator);
        context.Quimicos.Add(product);
        await context.SaveChangesAsync();
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer",
            JwtSessionVersionTests.CreateToken(administrator.Id, "0", "false", NivelUsuario.Administrador));
        return new Scenario(client, product.Id);
    }

    private sealed record Scenario(HttpClient Client, int ProductId);
}
