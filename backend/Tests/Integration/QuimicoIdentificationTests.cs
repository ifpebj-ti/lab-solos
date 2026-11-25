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
public sealed class QuimicoIdentificationTests(PostgreSqlContainerFixture database)
{
    private const string NomeQuimico = "Químico sintético T007";
    private const string Marca = "Marca sintética T007";

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("Indefinido")]
    [InlineData("Não existe")]
    [InlineData("999")]
    [InlineData("Acido, Base")]
    public async Task GrupoInvalidoRetornaErroNoCampoSemCriarProduto(string? grupo)
    {
        await using var factory = new IntegrationWebApplicationFactory(database);
        using var client = await AutenticarAdministradorAsync(factory);

        using var response = await client.PostAsJsonAsync("/api/Produtos", CriarQuimico(grupo));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
        var erro = Assert.Single(payload.GetProperty("errors").EnumerateObject());
        Assert.Equal("grupo", erro.Name);
        Assert.False(string.IsNullOrWhiteSpace(Assert.Single(erro.Value.EnumerateArray()).GetString()));

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.False(await context.Produtos.AnyAsync(produto => produto.NomeProduto == NomeQuimico));
    }

    [Fact]
    public async Task GrupoEDataInvalidosRetornamErrosDosDoisCampos()
    {
        await using var factory = new IntegrationWebApplicationFactory(database);
        using var client = await AutenticarAdministradorAsync(factory);

        using var response = await client.PostAsJsonAsync(
            "/api/Produtos", CriarQuimico(nameof(Grupo.Indefinido), "2028-02-31"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
        var erros = payload.GetProperty("errors");
        Assert.Equal(2, erros.EnumerateObject().Count());
        Assert.Contains("inválida", Assert.Single(erros.GetProperty("dataValidade").EnumerateArray()).GetString()!);
        Assert.False(string.IsNullOrWhiteSpace(Assert.Single(erros.GetProperty("grupo").EnumerateArray()).GetString()));
    }

    [Fact]
    public async Task MarcaEGrupoEnviadosSaoRecuperadosPorLocation()
    {
        await using var factory = new IntegrationWebApplicationFactory(database);
        using var client = await AutenticarAdministradorAsync(factory);

        using var criacao = await client.PostAsJsonAsync(
            "/api/Produtos", CriarQuimico(nameof(Grupo.Oxido)));

        Assert.Equal(HttpStatusCode.Created, criacao.StatusCode);
        Assert.NotNull(criacao.Headers.Location);
        using var consulta = await client.GetAsync(criacao.Headers.Location);
        Assert.Equal(HttpStatusCode.OK, consulta.StatusCode);
        var produto = await consulta.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(Marca, produto.GetProperty("fornecedor").GetString());
        Assert.Equal(nameof(Grupo.Oxido), produto.GetProperty("grupo").GetString());
        Assert.True(string.IsNullOrEmpty(produto.GetProperty("catmat").GetString()));
    }

    [Fact]
    public async Task PesoMolecularValidoEhPersistidoEConsultavel()
    {
        await using var factory = new IntegrationWebApplicationFactory(database);
        using var client = await AutenticarAdministradorAsync(factory);

        using var criacao = await client.PostAsJsonAsync(
            "/api/Produtos", CriarQuimico(nameof(Grupo.Oxido), pesoMolecular: 123.456m));

        Assert.Equal(HttpStatusCode.Created, criacao.StatusCode);
        Assert.NotNull(criacao.Headers.Location);
        using var consulta = await client.GetAsync(criacao.Headers.Location);
        Assert.Equal(HttpStatusCode.OK, consulta.StatusCode);
        var produto = await consulta.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(123.456, produto.GetProperty("pesoMolecular").GetDouble(), precision: 3);

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var salvo = await context.Produtos.OfType<Quimico>().SingleAsync();
        Assert.Equal(123.456f, salvo.PesoMolecular);
    }

    [Theory]
    [InlineData("0.001")]
    [InlineData("10000")]
    public async Task LimitesInclusivosDePesoMolecularSaoAceitos(string pesoMolecular)
    {
        await using var factory = new IntegrationWebApplicationFactory(database);
        using var client = await AutenticarAdministradorAsync(factory);
        var valor = decimal.Parse(pesoMolecular, System.Globalization.CultureInfo.InvariantCulture);

        using var criacao = await client.PostAsJsonAsync(
            "/api/Produtos", CriarQuimico(nameof(Grupo.Oxido), pesoMolecular: valor));

        Assert.Equal(HttpStatusCode.Created, criacao.StatusCode);
    }

    [Theory]
    [InlineData("0")]
    [InlineData("0.0009")]
    [InlineData("10000.001")]
    [InlineData("18.1234")]
    [InlineData("18.1200")]
    [InlineData("-1")]
    public async Task PesoMolecularForaDaFaixaOuPrecisaoRetornaErroDeCampoSemCriarProduto(string pesoMolecular)
    {
        await using var factory = new IntegrationWebApplicationFactory(database);
        using var client = await AutenticarAdministradorAsync(factory);
        var valor = decimal.Parse(pesoMolecular, System.Globalization.CultureInfo.InvariantCulture);

        using var response = await client.PostAsJsonAsync(
            "/api/Produtos", CriarQuimico(nameof(Grupo.Oxido), pesoMolecular: valor));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Contains("pesoMolecular", payload.GetProperty("errors").EnumerateObject()
            .Select(erro => erro.Name));
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Empty(await context.Produtos.ToListAsync());
    }

    [Fact]
    public async Task QuimicoLegadoMantemIdentificacaoNoDetalheENaListagemPorTipo()
    {
        await using var factory = new IntegrationWebApplicationFactory(database);
        using var client = await AutenticarAdministradorAsync(factory);
        var legado = new Quimico
        {
            NomeProduto = "Químico histórico T007",
            Tipo = TipoProduto.Quimico,
            Grupo = Grupo.Indefinido,
            Catmat = "CATMAT-HISTORICO-T007",
            Fornecedor = "Marca histórica T007",
            Cor = Cor.Incolor,
            Odor = Odor.Inodoro,
            Quantidade = 10,
            QuantidadeMinima = 1,
            Status = StatusProduto.Disponivel,
            UltimaModificacao = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc)
        };

        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            context.Produtos.Add(legado);
            await context.SaveChangesAsync();
        }

        var detalhe = await client.GetFromJsonAsync<JsonElement>($"/api/Produtos/{legado.Id}");
        var listagem = await client.GetFromJsonAsync<JsonElement>($"/api/Produtos/tipo/{(int)TipoProduto.Quimico}");
        foreach (var produto in new[]
        {
            detalhe,
            Assert.Single(listagem.GetProperty("itens").EnumerateArray())
        })
        {
            Assert.Equal(legado.Fornecedor, produto.GetProperty("fornecedor").GetString());
            Assert.Equal(legado.Catmat, produto.GetProperty("catmat").GetString());
            Assert.Equal(nameof(Grupo.Indefinido), produto.GetProperty("grupo").GetString());
            Assert.Equal(JsonValueKind.Null, produto.GetProperty("pesoMolecular").ValueKind);
        }
    }

    [Fact]
    public async Task PesoMolecularHistoricoZeroPermaneceZeroNaConsulta()
    {
        await using var factory = new IntegrationWebApplicationFactory(database);
        using var client = await AutenticarAdministradorAsync(factory);
        var legado = new Quimico
        {
            NomeProduto = "Químico histórico com peso zero T008",
            Tipo = TipoProduto.Quimico,
            Grupo = Grupo.Indefinido,
            Cor = Cor.Incolor,
            Odor = Odor.Inodoro,
            Quantidade = 10,
            QuantidadeMinima = 1,
            Status = StatusProduto.Disponivel,
            PesoMolecular = 0f,
            UltimaModificacao = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc)
        };

        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            context.Produtos.Add(legado);
            await context.SaveChangesAsync();
        }

        var produto = await client.GetFromJsonAsync<JsonElement>($"/api/Produtos/{legado.Id}");
        Assert.Equal(0f, produto.GetProperty("pesoMolecular").GetSingle());
    }

    private static object CriarQuimico(
        string? grupo,
        string dataValidade = "2028-02-29",
        decimal? pesoMolecular = null) => new
    {
        nomeProduto = NomeQuimico,
        fornecedor = Marca,
        tipo = nameof(TipoProduto.Quimico),
        quantidade = 10,
        quantidadeMinima = 1,
        unidadeMedida = nameof(UnidadeMedida.Grama),
        formulaQuimica = "H2O",
        dataValidade,
        pesoMolecular,
        grupo
    };

    private static async Task<HttpClient> AutenticarAdministradorAsync(IntegrationWebApplicationFactory factory)
    {
        await factory.RecreateDatabaseAsync();
        const string senha = "Cadastro-T007-Admin-Synthetic!";
        var administrador = new Administrador
        {
            NomeCompleto = "Administrador sintético",
            Email = "cadastro-t007-admin@integration.test",
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
