using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class OperationAdmissionContractTests(PostgreSqlContainerFixture database)
{
    private const int MaximumRequestBytes = 1_048_576;
    private const string RegistrationPassword = "Synthetic registration password! 2026";
    private static readonly DateTimeOffset InitialTime =
        new(2026, 11, 19, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task PublicRegistrationAllowsTenPerAddressAndRejectsTheEleventhWithoutCreatingAnAccount()
    {
        var setup = await CreateFactoryAsync("registration-limit");
        await using var factory = setup.Factory;
        using var client = factory.CreateClient();

        for (var index = 1; index <= 10; index++)
        {
            using var allowed = await RegisterAsync(client, index, name: "Cadastro sintético");
            Assert.Equal(HttpStatusCode.Created, allowed.StatusCode);
        }

        using var limited = await RegisterAsync(client, 11, name: "Cadastro excedente");

        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
        Assert.Equal(3600, limited.Headers.RetryAfter?.Delta?.TotalSeconds);
        Assert.True(limited.Headers.CacheControl?.NoStore);
        var problem = await limited.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("admission_rate_limited", problem.GetProperty("code").GetString());
        Assert.Equal(3600, problem.GetProperty("retryAfterSeconds").GetInt32());

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(10, await context.Usuarios.CountAsync());
        var bucket = await context.AuthenticationThrottleBuckets.SingleAsync(candidate =>
            candidate.Scope == "public-registration:ip");
        Assert.Equal(10, bucket.Count);

        setup.Clock.Advance(TimeSpan.FromHours(1));
        using var nextWindow = await RegisterAsync(client, 12, name: "Cadastro na próxima janela");
        Assert.Equal(HttpStatusCode.Created, nextWindow.StatusCode);
    }

    [Fact]
    public async Task LoanCreationAllowsThirtyPerEnabledAccountAndRejectsTheThirtyFirstWithoutPersisting()
    {
        var setup = await CreateLoanFactoryAsync("loan-limit");
        await using var factory = setup.Factory;
        using var client = setup.Client;

        for (var index = 0; index < 30; index++)
        {
            using var allowed = await CreateLoanAsync(client, [setup.Scenario.ProductId]);
            Assert.True(allowed.StatusCode == HttpStatusCode.Created,
                $"Loan attempt {index + 1} returned {(int)allowed.StatusCode}: {await allowed.Content.ReadAsStringAsync()}");
        }

        using var limited = await CreateLoanAsync(client, [setup.Scenario.ProductId]);

        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
        Assert.Equal(3600, limited.Headers.RetryAfter?.Delta?.TotalSeconds);
        var problem = await limited.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("admission_rate_limited", problem.GetProperty("code").GetString());

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(31, await context.Emprestimos.CountAsync()); // 1 synthetic baseline loan + 30 accepted.
        var bucket = await context.AuthenticationThrottleBuckets.SingleAsync(candidate =>
            candidate.Scope == "loan-creation:account");
        Assert.Equal(30, bucket.Count);

        setup.Clock.Advance(TimeSpan.FromHours(1));
        await LoginLoanAccountAsync(client, setup.Scenario);
        using var nextWindow = await CreateLoanAsync(client, [setup.Scenario.ProductId]);
        Assert.Equal(HttpStatusCode.Created, nextWindow.StatusCode);
    }

    [Fact]
    public async Task LoanItemLimitAcceptsOneHundredAndRejectsOneHundredAndOneBeforeQuotaOrPersistence()
    {
        var setup = await CreateLoanFactoryAsync("loan-item-limit");
        await using var factory = setup.Factory;
        using var client = setup.Client;

        var productIds = await AddProductsAsync(factory, setup.Clock, 101);
        using var atLimit = await CreateLoanAsync(client, productIds.Take(100).ToArray());
        Assert.Equal(HttpStatusCode.Created, atLimit.StatusCode);

        using var overLimit = await CreateLoanAsync(client, productIds);
        Assert.Equal(HttpStatusCode.BadRequest, overLimit.StatusCode);
        var problem = await overLimit.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("loan_item_limit_exceeded", problem.GetProperty("code").GetString());

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(2, await context.Emprestimos.CountAsync()); // Baseline + request at the limit.
        var bucket = await context.AuthenticationThrottleBuckets.SingleAsync(candidate =>
            candidate.Scope == "loan-creation:account");
        Assert.Equal(1, bucket.Count);
    }

    [Theory]
    [InlineData(255, HttpStatusCode.Created)]
    [InlineData(256, HttpStatusCode.BadRequest)]
    public async Task PublicRegistrationEnforcesTheShortTextLimit(int nameLength, HttpStatusCode expectedStatus)
    {
        var setup = await CreateFactoryAsync($"registration-name-{nameLength}");
        await using var factory = setup.Factory;
        using var client = factory.CreateClient();

        var registration = Registration(1, new string('N', nameLength));
        using var response = await client.PostAsJsonAsync("/api/Usuarios", registration);

        Assert.Equal(expectedStatus, response.StatusCode);
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(expectedStatus == HttpStatusCode.Created ? 1 : 0, await context.Usuarios.CountAsync());
        Assert.Equal(expectedStatus == HttpStatusCode.Created ? 1 : 0,
            await context.AuthenticationThrottleBuckets
                .Where(candidate => candidate.Scope == "public-registration:ip")
                .Select(candidate => candidate.Count)
                .SingleOrDefaultAsync());
    }

    [Fact]
    public async Task JsonBodyAtOneMibIsAcceptedAndBodyOverOneMibReturns413WithoutPersistence()
    {
        var setup = await CreateFactoryAsync("registration-body-limit");
        await using var factory = setup.Factory;
        using var client = factory.CreateClient();

        var atLimit = RegistrationJsonAtSize(1, MaximumRequestBytes);
        Assert.Equal(MaximumRequestBytes, Encoding.UTF8.GetByteCount(atLimit));
        using (var allowed = await PostJsonAsync(client, atLimit))
        {
            Assert.Equal(HttpStatusCode.Created, allowed.StatusCode);
        }

        var overLimit = RegistrationJsonAtSize(2, MaximumRequestBytes + 1);
        Assert.Equal(MaximumRequestBytes + 1, Encoding.UTF8.GetByteCount(overLimit));
        using var rejected = await PostJsonAsync(client, overLimit);

        Assert.Equal((HttpStatusCode)413, rejected.StatusCode);
        var problem = await rejected.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("request_body_too_large", problem.GetProperty("code").GetString());

        await using var scope = factory.Services.CreateAsyncScope();
        Assert.Equal(1, await scope.ServiceProvider.GetRequiredService<AppDbContext>().Usuarios.CountAsync());
    }

    [Fact]
    public async Task MissingSharedAdmissionCapacityReturns503BeforeCreatingAnAccount()
    {
        var setup = await CreateFactoryAsync("registration-capacity-missing");
        await using var factory = setup.Factory;
        using var client = factory.CreateClient();
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await context.Database.ExecuteSqlRawAsync(
                "DELETE FROM \"AuthenticationProtectionCapacity\" WHERE \"Scope\" = 'public-registration:ip'");
        }

        using var unavailable = await RegisterAsync(client, 1, name: "Cadastro indisponível");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, unavailable.StatusCode);
        var problem = await unavailable.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("service_unavailable", problem.GetProperty("code").GetString());
        await using var verificationScope = factory.Services.CreateAsyncScope();
        Assert.Empty(await verificationScope.ServiceProvider.GetRequiredService<AppDbContext>().Usuarios.ToListAsync());
    }

    private async Task<FactoryScenario> CreateFactoryAsync(string key)
    {
        var clock = new ControlledTimeProvider(InitialTime);
        var factory = new IntegrationWebApplicationFactory(database, new IntegrationApplicationOptions
        {
            TimeProvider = clock,
            ConfigureServices = services =>
            {
                services.RemoveAll<IAuthenticationThrottleClock>();
                services.AddSingleton<IAuthenticationThrottleClock>(new TimeProviderAuthenticationThrottleClock(clock));
            }
        });
        await factory.RecreateDatabaseAsync();
        return new FactoryScenario(factory, clock);
    }

    private async Task<LoanScenario> CreateLoanFactoryAsync(string key)
    {
        var setup = await CreateFactoryAsync(key);
        var scenario = CriticalScenarioData.Create(key);
        await using (var scope = setup.Factory.Services.CreateAsyncScope())
        {
            var services = scope.ServiceProvider;
            var context = services.GetRequiredService<AppDbContext>();
            var hasher = services.GetRequiredService<IPasswordHasher<Usuario>>();
            await scenario.PersistAsync(context, hasher, setup.Clock);
        }

        var client = setup.Factory.CreateClient();
        await LoginLoanAccountAsync(client, scenario);
        return new LoanScenario(setup.Factory, setup.Clock, scenario, client);
    }

    private static async Task LoginLoanAccountAsync(HttpClient client, CriticalScenarioData scenario)
    {
        using var login = await client.PostAsJsonAsync("/api/Auth/login", new
        {
            email = scenario.BorrowerEmail,
            password = scenario.BorrowerPassword
        });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var body = await login.Content.ReadFromJsonAsync<JsonElement>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer", body.GetProperty("token").GetString());
    }

    private static object Registration(int number, string name) => new
    {
        nomeCompleto = name,
        email = $"operation-admission-{number}@example.test",
        senha = RegistrationPassword,
        nivelUsuario = "Mentor",
        tipoUsuario = "Academico",
        instituicao = "IFPE",
        cidade = "Recife",
        curso = "Química"
    };

    private static Task<HttpResponseMessage> RegisterAsync(HttpClient client, int number, string name) =>
        client.PostAsJsonAsync("/api/Usuarios", Registration(number, name));

    private static Task<HttpResponseMessage> CreateLoanAsync(HttpClient client, int[] productIds) =>
        client.PostAsJsonAsync("/api/Emprestimos", new
        {
            diasParaDevolucao = 5,
            produtos = productIds.Select(productId => new { produtoId = productId, quantidade = 1 })
        });

    private static async Task<int[]> AddProductsAsync(
        IntegrationWebApplicationFactory factory,
        ControlledTimeProvider clock,
        int count)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var products = Enumerable.Range(0, count)
            .Select(index => new Produto
            {
                NomeProduto = $"Produto limite {index}",
                Catmat = $"ITEM-LIMIT-{Guid.NewGuid():N}",
                Tipo = TipoProduto.Outro,
                Quantidade = 10,
                QuantidadeMinima = 1,
                UnidadeMedida = UnidadeMedida.Unidade,
                Status = StatusProduto.Disponivel,
                UltimaModificacao = clock.GetUtcNow().UtcDateTime
            })
            .ToArray();
        context.Produtos.AddRange(products);
        await context.SaveChangesAsync();
        return products.Select(product => product.Id).ToArray();
    }

    private static Task<HttpResponseMessage> PostJsonAsync(HttpClient client, string json) =>
        client.PostAsync("/api/Usuarios", new StringContent(json, Encoding.UTF8, "application/json"));

    private static string RegistrationJsonAtSize(int number, int byteCount)
    {
        var registration = JsonSerializer.Serialize(Registration(number, "Cadastro de tamanho máximo"));
        var withoutClosingBrace = registration[..^1];
        var prefix = withoutClosingBrace + ",\"padding\":\"";
        const string suffix = "\"}";
        var paddingLength = byteCount - Encoding.UTF8.GetByteCount(prefix) - Encoding.UTF8.GetByteCount(suffix);
        if (paddingLength < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(byteCount));
        }

        return prefix + new string('x', paddingLength) + suffix;
    }

    private sealed record FactoryScenario(
        IntegrationWebApplicationFactory Factory,
        ControlledTimeProvider Clock);

    private sealed record LoanScenario(
        IntegrationWebApplicationFactory Factory,
        ControlledTimeProvider Clock,
        CriticalScenarioData Scenario,
        HttpClient Client);
}
