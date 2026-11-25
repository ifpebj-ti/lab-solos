using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class ProductCreationDateTests(PostgreSqlContainerFixture database)
{
    [Theory]
    [InlineData("2026-02-31", "2028-02-29", "dataFabricacao")]
    [InlineData("2024-02-29", "2026-02-31", "dataValidade")]
    public async Task DataImpossivelRetornaErroNoCampoSemCriarProduto(
        string dataFabricacao,
        string dataValidade,
        string campoInvalido)
    {
        await using var factory = new IntegrationWebApplicationFactory(database);
        using var client = await AutenticarAdministradorAsync(factory);

        using var response = await client.PostAsJsonAsync(
            "/api/Produtos", CriarQuimico(dataFabricacao, dataValidade));

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.False(await context.Produtos.AnyAsync(produto => produto.NomeProduto == NomeQuimico));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
        var erro = Assert.Single(payload.GetProperty("errors").EnumerateObject());
        Assert.Equal(campoInvalido, erro.Name);
        Assert.Contains("inválida", Assert.Single(erro.Value.EnumerateArray()).GetString()!);
    }

    [Fact]
    public async Task DatasBissextasSaoRecuperadasComoOsMesmosDiasPorLocation()
    {
        await using var factory = new IntegrationWebApplicationFactory(database);
        using var client = await AutenticarAdministradorAsync(factory);

        using var criacao = await client.PostAsJsonAsync(
            "/api/Produtos", CriarQuimico("2024-02-29", "2028-02-29"));

        Assert.Equal(HttpStatusCode.Created, criacao.StatusCode);
        Assert.NotNull(criacao.Headers.Location);
        using var consulta = await client.GetAsync(criacao.Headers.Location);
        Assert.Equal(HttpStatusCode.OK, consulta.StatusCode);
        var produto = await consulta.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(NomeQuimico, produto.GetProperty("nomeProduto").GetString());
        Assert.Equal(new DateTime(2024, 2, 29),
            DateTime.Parse(produto.GetProperty("dataFabricacao").GetString()!, CultureInfo.CurrentCulture));
        Assert.Equal(new DateTime(2028, 2, 29),
            DateTime.Parse(produto.GetProperty("dataValidade").GetString()!, CultureInfo.CurrentCulture));
    }

    [Fact]
    public async Task QuimicoAindaPodeSerCriadoSemDataDeFabricacao()
    {
        await using var factory = new IntegrationWebApplicationFactory(database);
        using var client = await AutenticarAdministradorAsync(factory);

        using var criacao = await client.PostAsJsonAsync(
            "/api/Produtos", CriarQuimico(null, "2028-02-29"));

        Assert.Equal(HttpStatusCode.Created, criacao.StatusCode);
        var produto = await criacao.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(JsonValueKind.Null, produto.GetProperty("dataFabricacao").ValueKind);
    }

    private const string NomeQuimico = "Químico sintético para teste de datas";

    private static object CriarQuimico(string? dataFabricacao, string dataValidade) => new
    {
        nomeProduto = NomeQuimico,
        tipo = nameof(TipoProduto.Quimico),
        quantidade = 10,
        quantidadeMinima = 1,
        unidadeMedida = nameof(UnidadeMedida.Grama),
        estadoFisico = nameof(EstadoFisico.Liquido),
        cor = nameof(Cor.Incolor),
        odor = nameof(Odor.Inodoro),
        grupo = nameof(Grupo.Outros),
        formulaQuimica = "H2O",
        dataFabricacao,
        dataValidade
    };

    private static async Task<HttpClient> AutenticarAdministradorAsync(IntegrationWebApplicationFactory factory)
    {
        await factory.RecreateDatabaseAsync();
        const string senha = "Cadastro-T003-Admin-Synthetic!";
        var administrador = new Administrador
        {
            NomeCompleto = "Administrador sintético",
            Email = "cadastro-t003-admin@integration.test",
            SenhaHash = string.Empty,
            NivelUsuario = NivelUsuario.Administrador,
            TipoUsuario = TipoUsuario.Administrador,
            Status = StatusUsuario.Habilitado,
            ExigeTrocaSenha = false
        };

        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var services = scope.ServiceProvider;
            var context = services.GetRequiredService<AppDbContext>();
            var passwordHasher = services.GetRequiredService<IPasswordHasher<Usuario>>();
            administrador.SenhaHash = passwordHasher.HashPassword(administrador, senha);
            context.Administradores.Add(administrador);
            await context.SaveChangesAsync();
        }

        var client = factory.CreateClient();
        using var login = await client.PostAsJsonAsync(
            "/api/Auth/login", new { email = administrador.Email, password = senha });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var payload = await login.Content.ReadFromJsonAsync<JsonElement>();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", payload.GetProperty("token").GetString());
        return client;
    }
}
