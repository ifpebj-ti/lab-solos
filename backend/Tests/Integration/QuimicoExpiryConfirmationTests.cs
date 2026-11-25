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
public sealed class QuimicoExpiryConfirmationTests(PostgreSqlContainerFixture database)
{
    private static readonly DateTimeOffset TodayAtNoonUtc =
        new(2026, 11, 17, 15, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task ValidadePassadaSemConfirmacaoRetorna409EDataAvaliadaSemGravar()
    {
        var (factory, client, _) = await CreateAuthenticatedClientAsync(TodayAtNoonUtc);
        await using (factory)
        using (client)
        using (var response = await client.PostAsJsonAsync(
            "/api/Produtos", CriarQuimico("Vencido sem confirmação", "2026-11-16")))
        {
            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
            Assert.True(response.Headers.TryGetValues("X-Correlation-ID", out var correlationValues));

            using var payload = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var problem = payload.RootElement;
            Assert.Equal("product_expiration_confirmation_required",
                problem.GetProperty("code").GetString());
            Assert.Equal("2026-11-16", problem.GetProperty("dataValidade").GetString());
            Assert.Equal("2026-11-17", problem.GetProperty("diaCivil").GetString());
            Assert.Equal(correlationValues!.Single(), problem.GetProperty("correlationId").GetString());

            await using var scope = factory.Services.CreateAsyncScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.False(await context.Produtos.AnyAsync(product =>
                product.NomeProduto == "Vencido sem confirmação"));
        }
    }

    [Fact]
    public async Task ConfirmacaoDaMesmaDataCivilPermiteCriarUmaVez()
    {
        var (factory, client, _) = await CreateAuthenticatedClientAsync(TodayAtNoonUtc);
        await using (factory)
        using (client)
        {
            var product = CriarQuimico("Vencido confirmado", "2026-11-16");
            using var firstAttempt = await client.PostAsJsonAsync("/api/Produtos", product);
            Assert.Equal(HttpStatusCode.Conflict, firstAttempt.StatusCode);

            using var confirmedAttempt = await client.PostAsJsonAsync(
                "/api/Produtos", CriarQuimico(
                    "Vencido confirmado", "2026-11-16", dataValidadeConfirmada: "2026-11-16"));

            Assert.Equal(HttpStatusCode.Created, confirmedAttempt.StatusCode);
            Assert.NotNull(confirmedAttempt.Headers.Location);

            await using var scope = factory.Services.CreateAsyncScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var savedProduct = await context.Produtos.SingleAsync(product =>
                product.NomeProduto == "Vencido confirmado");
            Assert.Equal(new DateOnly(2026, 11, 16),
                DateOnly.FromDateTime(savedProduct.DataValidade!.Value));
        }
    }

    [Fact]
    public async Task ConfirmacaoParaOutraDataCivilNaoAutorizaNemGrava()
    {
        var (factory, client, _) = await CreateAuthenticatedClientAsync(TodayAtNoonUtc);
        await using (factory)
        using (client)
        {
            using var response = await client.PostAsJsonAsync(
                "/api/Produtos", CriarQuimico(
                    "Confirmação desatualizada", "2026-11-16", dataValidadeConfirmada: "2026-11-15"));

            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            using var payload = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            Assert.Equal("product_expiration_confirmation_required",
                payload.RootElement.GetProperty("code").GetString());
            Assert.Equal("2026-11-16", payload.RootElement.GetProperty("dataValidade").GetString());

            await using var scope = factory.Services.CreateAsyncScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.False(await context.Produtos.AnyAsync(product =>
                product.NomeProduto == "Confirmação desatualizada"));
        }
    }

    [Fact]
    public async Task ConfirmacaoForaDoFormatoISOApontaParaOCampoSemGravar()
    {
        var (factory, client, _) = await CreateAuthenticatedClientAsync(TodayAtNoonUtc);
        await using (factory)
        using (client)
        using (var response = await client.PostAsJsonAsync(
            "/api/Produtos", CriarQuimico(
                "Confirmação em formato localizado",
                "2026-11-16",
                dataValidadeConfirmada: "16/11/2026")))
        {
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            using var payload = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var erro = payload.RootElement.GetProperty("errors").GetProperty("dataValidadeConfirmada");
            Assert.Equal("Verifique o valor informado.",
                Assert.Single(erro.EnumerateArray()).GetString());

            await using var scope = factory.Services.CreateAsyncScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.False(await context.Produtos.AnyAsync(product =>
                product.NomeProduto == "Confirmação em formato localizado"));
        }
    }

    [Theory]
    [InlineData("2026-11-17")]
    [InlineData("2026-11-18")]
    public async Task ValidadeHojeOuFuturaNaoExigeConfirmacao(string validityDate)
    {
        var (factory, client, _) = await CreateAuthenticatedClientAsync(TodayAtNoonUtc);
        await using (factory)
        using (client)
        using (var response = await client.PostAsJsonAsync(
            "/api/Produtos", CriarQuimico($"Válido {validityDate}", validityDate)))
        {
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        }
    }

    [Fact]
    public async Task NovoReenvioReavaliaValidadeQuandoMudaODiaInstitucional()
    {
        var clock = new ControlledTimeProvider(
            new DateTimeOffset(2026, 11, 17, 2, 59, 0, TimeSpan.Zero)); // 23:59 em São Paulo no dia 16.
        var (factory, client, _) = await CreateAuthenticatedClientAsync(clock);
        await using (factory)
        using (client)
        {
            using var sameDay = await client.PostAsJsonAsync(
                "/api/Produtos", CriarQuimico("Ainda válido no dia 16", "2026-11-16"));
            Assert.Equal(HttpStatusCode.Created, sameDay.StatusCode);

            clock.Advance(TimeSpan.FromMinutes(2));
            using var nextDay = await client.PostAsJsonAsync(
                "/api/Produtos", CriarQuimico("Vencido após virada", "2026-11-16"));

            Assert.Equal(HttpStatusCode.Conflict, nextDay.StatusCode);
            using var payload = JsonDocument.Parse(await nextDay.Content.ReadAsStringAsync());
            Assert.Equal("2026-11-17", payload.RootElement.GetProperty("diaCivil").GetString());

            await using var scope = factory.Services.CreateAsyncScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.Equal(1, await context.Produtos.CountAsync(product =>
                product.NomeProduto == "Ainda válido no dia 16"));
            Assert.False(await context.Produtos.AnyAsync(product =>
                product.NomeProduto == "Vencido após virada"));
        }
    }

    private async Task<(IntegrationWebApplicationFactory Factory, HttpClient Client, ControlledTimeProvider Clock)>
        CreateAuthenticatedClientAsync(DateTimeOffset utcNow)
    {
        var clock = new ControlledTimeProvider(utcNow);
        return await CreateAuthenticatedClientAsync(clock);
    }

    private async Task<(IntegrationWebApplicationFactory Factory, HttpClient Client, ControlledTimeProvider Clock)>
        CreateAuthenticatedClientAsync(ControlledTimeProvider clock)
    {
        var factory = new IntegrationWebApplicationFactory(database, new IntegrationApplicationOptions
        {
            TimeProvider = clock
        });
        await factory.RecreateDatabaseAsync();

        const string password = "Product-Expiry-Admin-Synthetic!";
        var administrator = new Administrador
        {
            NomeCompleto = "Administrador sintético de validade",
            Email = "product-expiry-admin@integration.test",
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
            var hasher = services.GetRequiredService<IPasswordHasher<Usuario>>();
            administrator.SenhaHash = hasher.HashPassword(administrator, password);
            context.Administradores.Add(administrator);
            await context.SaveChangesAsync();
        }

        var client = factory.CreateClient();
        using var login = await client.PostAsJsonAsync(
            "/api/Auth/login", new { email = administrator.Email, password });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var loginPayload = await login.Content.ReadFromJsonAsync<JsonElement>();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", loginPayload.GetProperty("token").GetString());
        return (factory, client, clock);
    }

    private static object CriarQuimico(
        string nomeProduto,
        string dataValidade,
        string? dataValidadeConfirmada = null) => new
    {
        nomeProduto,
        tipo = nameof(TipoProduto.Quimico),
        quantidade = 10,
        quantidadeMinima = 1,
        unidadeMedida = nameof(UnidadeMedida.Grama),
        estadoFisico = nameof(EstadoFisico.Liquido),
        cor = nameof(Cor.Incolor),
        odor = nameof(Odor.Inodoro),
        grupo = nameof(Grupo.Outros),
        formulaQuimica = "H2O",
        dataFabricacao = "2026-01-01",
        dataValidade,
        dataValidadeConfirmada
    };
}
