using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class VidrariaCreationTests(PostgreSqlContainerFixture database)
{
    private static readonly JsonSerializerOptions OpcoesDeCadastro = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    [Theory]
    [InlineData(null, AlturaVidraria.Indefinido)]
    [InlineData("", AlturaVidraria.Indefinido)]
    [InlineData(nameof(AlturaVidraria.Baixa), AlturaVidraria.Baixa)]
    public async Task CadastroPersisteAlturaECategoriaRecuperadasPorLocation(
        string? altura, AlturaVidraria alturaEsperada)
    {
        await using var factory = new IntegrationWebApplicationFactory(database);
        using var client = await AutenticarAdministradorAsync(factory);
        const FormatoVidraria formato = FormatoVidraria.Funil;
        var cadastro = new
        {
            nomeProduto = "Vidraria sintética T005",
            tipo = nameof(TipoProduto.Vidraria),
            quantidade = 5,
            quantidadeMinima = 1,
            unidadeMedida = nameof(UnidadeMedida.Unidade),
            material = nameof(MaterialVidraria.VidroBorossilicato),
            formato = formato.ToString(),
            capacidade = 100,
            altura
        };

        using var criacao = await client.PostAsJsonAsync("/api/Produtos", cadastro, OpcoesDeCadastro);

        Assert.Equal(HttpStatusCode.Created, criacao.StatusCode);
        Assert.NotNull(criacao.Headers.Location);
        var consulta = await client.GetFromJsonAsync<JsonElement>(criacao.Headers.Location);
        Assert.Equal(cadastro.nomeProduto, consulta.GetProperty("nomeProduto").GetString());
        VerificarCategoriaEAltura(consulta, formato, alturaEsperada);

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var gravada = await context.Produtos.OfType<Vidraria>().SingleAsync();
        Assert.Equal(alturaEsperada, gravada.Altura);
        Assert.Equal(formato, gravada.Formato);
    }

    [Fact]
    public async Task VidrariaLegadaConservaCategoriaEAlturaNoDetalheENaListagemPorTipo()
    {
        await using var factory = new IntegrationWebApplicationFactory(database);
        using var client = await AutenticarAdministradorAsync(factory);
        var legado = new Vidraria
        {
            NomeProduto = "Vidraria histórica T005",
            Tipo = TipoProduto.Vidraria,
            Material = MaterialVidraria.VidroBorossilicato,
            Formato = FormatoVidraria.Conica,
            Altura = AlturaVidraria.Intermediaria,
            Quantidade = 5,
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
        var listagem = await client.GetFromJsonAsync<JsonElement>($"/api/Produtos/tipo/{(int)TipoProduto.Vidraria}");

        VerificarCategoriaEAltura(detalhe, legado.Formato, legado.Altura);
        VerificarCategoriaEAltura(
            Assert.Single(listagem.GetProperty("itens").EnumerateArray()),
            legado.Formato,
            legado.Altura);
    }

    private static void VerificarCategoriaEAltura(JsonElement produto, FormatoVidraria formato, AlturaVidraria altura)
    {
        Assert.Equal(formato.ToString(), produto.GetProperty("formato").GetString());
        Assert.Equal(altura.ToString(), produto.GetProperty("altura").GetString());
    }

    private static async Task<HttpClient> AutenticarAdministradorAsync(IntegrationWebApplicationFactory factory)
    {
        await factory.RecreateDatabaseAsync();
        const string senha = "Cadastro-T005-Admin-Synthetic!";
        var administrador = new Administrador
        {
            NomeCompleto = "Administrador sintético",
            Email = "cadastro-t005-admin@integration.test",
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
