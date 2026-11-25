using System.Linq.Expressions;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Json;
using AutoMapper;
using LabSolos_Server_DotNet8.Controllers;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.DTOs.Emprestimos;
using LabSolos_Server_DotNet8.Enums;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.DependencyInjection;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using Moq;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class CriticalLoanCreationTests(PostgreSqlContainerFixture database)
{
    [Fact]
    public async Task EnabledUserCreatesLoanWithSessionIdentityAndPersistedProducts()
    {
        var seeded = await SeedScenarioAsync("loan-creation-success");
        await using var factory = seeded.Factory;
        var scenario = seeded.Scenario;

        using var client = factory.CreateClient();
        var token = await LoginAndGetTokenAsync(
            client,
            scenario.BorrowerEmail,
            scenario.BorrowerPassword);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var stateBefore = await ReadLoanStateAsync(factory, scenario.ProductId);
        using var createResponse = await client.PostAsJsonAsync(
            "/api/Emprestimos",
            new
            {
                solicitanteId = scenario.AdministratorId,
                diasParaDevolucao = 5,
                produtos = new[] { CreateProductItem(scenario.ProductId) }
            });

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await ReadJsonAsync(createResponse);
        var loanId = created.GetProperty("id").GetInt32();
        Assert.True(loanId > 0);
        AssertLoanPayload(created, loanId, scenario.BorrowerId, scenario.ProductId, 3);

        using var queryClient = factory.CreateClient();
        queryClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);
        using var queryResponse = await queryClient.GetAsync($"/api/Emprestimos/{loanId}");

        Assert.Equal(HttpStatusCode.OK, queryResponse.StatusCode);
        var persisted = await ReadJsonAsync(queryResponse);
        AssertLoanPayload(persisted, loanId, scenario.BorrowerId, scenario.ProductId, 3);
        var stateAfter = await ReadLoanStateAsync(factory, scenario.ProductId);
        Assert.Equal(stateBefore.Loans + 1, stateAfter.Loans);
        Assert.Equal(stateBefore.LoanItems + 1, stateAfter.LoanItems);
        Assert.Equal(stateBefore.Stock, stateAfter.Stock);
    }

    [Fact]
    public Task EmptyProductSelectionReturnsValidationErrorAndPreservesLoanState() =>
        AssertInvalidItemsAsync(
            "loan-creation-empty-selection",
            _ => Array.Empty<object>(),
            "produtos");

    [Fact]
    public Task MissingProductIdentifierReturnsValidationErrorAndPreservesLoanState() =>
        AssertInvalidItemsAsync(
            "loan-creation-item-without-id",
            _ => new[] { new { quantidade = 3 } },
            "produtos[0].produtoId");

    [Fact]
    public Task UnknownProductReturnsValidationErrorAndPreservesLoanState() =>
        AssertInvalidItemsAsync(
            "loan-creation-unknown-product",
            scenario => new[]
            {
                CreateProductItem(scenario.ProductId),
                CreateProductItem(scenario.ProductId + 1)
            },
            "produtos[1].produtoId");

    [Fact]
    public Task RepeatedProductReturnsValidationErrorAndPreservesLoanState() =>
        AssertInvalidItemsAsync(
            "loan-creation-repeated-product",
            scenario => new[]
            {
                CreateProductItem(scenario.ProductId),
                CreateProductItem(scenario.ProductId)
            },
            "produtos[1].produtoId");

    [Fact]
    public Task NullProductItemReturnsValidationErrorAndPreservesLoanState() =>
        AssertInvalidItemsAsync(
            "loan-creation-null-product-item",
            _ => new object?[] { null },
            "produtos[0]");

    [Theory]
    [InlineData(-1)]
    [InlineData(0)]
    [InlineData(11)]
    public Task InvalidQuantityReturnsFieldErrorWithoutCreatingLoan(int quantity) =>
        AssertInvalidItemsAsync(
            $"loan-invalid-quantity-{quantity}",
            scenario => new[] { new { produtoId = scenario.ProductId, quantidade = quantity } },
            "produtos[0].quantidade");

    [Theory]
    [InlineData(-1)]
    [InlineData(0)]
    [InlineData(7)]
    [InlineData(int.MaxValue)]
    public async Task NewLoanRequiresExactlyFiveDays(int days)
    {
        var seeded = await SeedScenarioAsync($"loan-invalid-days-{days}");
        await using var factory = seeded.Factory;
        using var client = factory.CreateClient();
        var token = await LoginAndGetTokenAsync(
            client, seeded.Scenario.BorrowerEmail, seeded.Scenario.BorrowerPassword);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var stateBefore = await ReadLoanStateAsync(factory, seeded.Scenario.ProductId);

        using var response = await client.PostAsJsonAsync("/api/Emprestimos", new
        {
            diasParaDevolucao = days,
            produtos = new[] { CreateProductItem(seeded.Scenario.ProductId) }
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await ReadJsonAsync(response);
        Assert.Single(problem.GetProperty("errors").GetProperty("diasParaDevolucao").EnumerateArray());
        Assert.Equal("loan_return_period_invalid", problem.GetProperty("code").GetString());
        Assert.Equal(stateBefore, await ReadLoanStateAsync(factory, seeded.Scenario.ProductId));
    }

    [Fact]
    public async Task QuantityAtAvailableStockIsAcceptedWithoutDebit()
    {
        var seeded = await SeedScenarioAsync("loan-stock-boundary");
        await using var factory = seeded.Factory;
        using var client = factory.CreateClient();
        var token = await LoginAndGetTokenAsync(
            client, seeded.Scenario.BorrowerEmail, seeded.Scenario.BorrowerPassword);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var stateBefore = await ReadLoanStateAsync(factory, seeded.Scenario.ProductId);

        using var response = await client.PostAsJsonAsync("/api/Emprestimos", new
        {
            diasParaDevolucao = 5,
            produtos = new[] { new { produtoId = seeded.Scenario.ProductId, quantidade = 10 } }
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var payload = await ReadJsonAsync(response);
        Assert.Equal(ScenarioNow.UtcDateTime, payload.GetProperty("dataRealizacao").GetDateTime());
        Assert.Equal(ScenarioNow.UtcDateTime.AddDays(5),
            payload.GetProperty("dataPrevistaDevolucao").GetDateTime());
        Assert.Equal(JsonValueKind.Null, payload.GetProperty("dataDevolucao").ValueKind);
        Assert.Equal(stateBefore.Stock, (await ReadLoanStateAsync(factory, seeded.Scenario.ProductId)).Stock);
    }

    [Theory]
    [InlineData(-1f)]
    [InlineData(float.NaN)]
    [InlineData(float.PositiveInfinity)]
    [InlineData(float.MaxValue)]
    public async Task InvalidStoredBalanceCannotCreateLoan(float stock)
    {
        var seeded = await SeedScenarioAsync($"loan-invalid-stock-{BitConverter.SingleToInt32Bits(stock)}");
        await using var factory = seeded.Factory;
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var product = await context.Produtos.SingleAsync(p => p.Id == seeded.Scenario.ProductId);
            product.Quantidade = stock;
            await context.SaveChangesAsync();
        }
        using var client = factory.CreateClient();
        var token = await LoginAndGetTokenAsync(
            client, seeded.Scenario.BorrowerEmail, seeded.Scenario.BorrowerPassword);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var before = await ReadLoanStateAsync(factory, seeded.Scenario.ProductId);

        using var response = await client.PostAsJsonAsync(
            "/api/Emprestimos", CreateLoanRequest(seeded.Scenario.ProductId));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await ReadJsonAsync(response);
        Assert.Single(problem.GetProperty("errors").GetProperty("produtos[0].quantidade").EnumerateArray());
        Assert.Equal(before, await ReadLoanStateAsync(factory, seeded.Scenario.ProductId));
    }

    [Fact]
    public async Task ApprovalOfLegacyPendingLoanPreservesItsOriginalDeadline()
    {
        var seeded = await SeedScenarioAsync("loan-legacy-deadline");
        await using var factory = seeded.Factory;
        using var client = factory.CreateClient();
        var token = await LoginAndGetTokenAsync(
            client, seeded.Scenario.AdministratorEmail, seeded.Scenario.AdministratorPassword);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var originalDeadline = ScenarioNow.UtcDateTime.AddDays(7);

        using var response = await client.PatchAsync(
            $"/api/Emprestimos/aprovar/{seeded.Scenario.LoanId}", null);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var loan = await context.Emprestimos.AsNoTracking().SingleAsync(l => l.Id == seeded.Scenario.LoanId);
        Assert.Equal(originalDeadline, loan.DataPrevistaDevolucao);
        Assert.Null(loan.DataDevolucao);
    }

    [Fact]
    public async Task AnonymousUserIsRejectedWithoutCreatingLoan()
    {
        var seeded = await SeedScenarioAsync("loan-creation-anonymous");
        await using var factory = seeded.Factory;

        var loansBefore = await CountLoansAsync(factory);
        using var client = factory.CreateClient();
        using var response = await client.PostAsJsonAsync(
            "/api/Emprestimos",
            CreateLoanRequest(seeded.Scenario.ProductId));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal(loansBefore, await CountLoansAsync(factory));
    }

    [Fact]
    public async Task AdministratorSessionKeepsLegacyUnauthorizedResponseWithoutCreatingLoan()
    {
        var seeded = await SeedScenarioAsync("loan-creation-administrator");
        await using var factory = seeded.Factory;
        var scenario = seeded.Scenario;

        using var client = factory.CreateClient();
        var token = await LoginAndGetTokenAsync(
            client,
            scenario.AdministratorEmail,
            scenario.AdministratorPassword);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var loansBefore = await CountLoansAsync(factory);
        using var response = await client.PostAsJsonAsync(
            "/api/Emprestimos",
            CreateLoanRequest(scenario.ProductId));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal(loansBefore, await CountLoansAsync(factory));
    }

    private async Task AssertInvalidItemsAsync(
        string scenarioKey,
        Func<CriticalScenarioData, object> items,
        string field)
    {
        var seeded = await SeedScenarioAsync(scenarioKey);
        await using var factory = seeded.Factory;
        var scenario = seeded.Scenario;
        using var client = factory.CreateClient();
        var token = await LoginAndGetTokenAsync(
            client,
            scenario.BorrowerEmail,
            scenario.BorrowerPassword);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var stateBefore = await ReadLoanStateAsync(factory, scenario.ProductId);
        using var response = await client.PostAsJsonAsync(
            "/api/Emprestimos",
            new { diasParaDevolucao = 5, produtos = items(scenario) });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await ReadJsonAsync(response);
        Assert.Single(problem.GetProperty("errors").GetProperty(field).EnumerateArray());
        Assert.Equal(stateBefore, await ReadLoanStateAsync(factory, scenario.ProductId));
    }

    private async Task<(IntegrationWebApplicationFactory Factory, CriticalScenarioData Scenario)> SeedScenarioAsync(
        string scenarioKey)
    {
        var scenario = CriticalScenarioData.Create(scenarioKey);
        var clock = new ControlledTimeProvider(ScenarioNow);
        var factory = new IntegrationWebApplicationFactory(
            database,
            new IntegrationApplicationOptions
            {
                EnvironmentName = "IntegrationTesting",
                TimeProvider = clock
            });
        await factory.RecreateDatabaseAsync();

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var passwordHasher = scope.ServiceProvider
            .GetRequiredService<IPasswordHasher<LabSolos_Server_DotNet8.Models.Usuario>>();
        await scenario.PersistAsync(context, passwordHasher, clock);

        return (factory, scenario);
    }

    private static object CreateLoanRequest(int productId) => new
    {
        diasParaDevolucao = 5,
        produtos = new[] { CreateProductItem(productId) }
    };

    private static object CreateProductItem(int productId) =>
        new { produtoId = productId, quantidade = 3 };

    private static async Task<string> LoginAndGetTokenAsync(
        HttpClient client,
        string email,
        string password)
    {
        using var response = await client.PostAsJsonAsync(
            "/api/Auth/login",
            new { email, password });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await ReadJsonAsync(response);
        return payload.GetProperty("token").GetString()!;
    }

    private static async Task<int> CountLoansAsync(IntegrationWebApplicationFactory factory)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await context.Emprestimos.CountAsync();
    }

    private static async Task<(int Loans, int LoanItems, float Stock)> ReadLoanStateAsync(
        IntegrationWebApplicationFactory factory,
        int productId)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return (
            await context.Emprestimos.CountAsync(),
            await context.ProdutosEmprestados.CountAsync(),
            await context.Produtos
                .Where(product => product.Id == productId)
                .Select(product => product.Quantidade)
                .SingleAsync());
    }

    private static void AssertLoanPayload(
        JsonElement payload,
        int expectedLoanId,
        int expectedBorrowerId,
        int expectedProductId,
        int expectedQuantity)
    {
        Assert.Equal(expectedLoanId, payload.GetProperty("id").GetInt32());
        Assert.Equal("Pendente", payload.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.String, payload.GetProperty("dataRealizacao").ValueKind);
        Assert.Equal(JsonValueKind.String, payload.GetProperty("dataPrevistaDevolucao").ValueKind);
        Assert.Equal(JsonValueKind.Null, payload.GetProperty("dataDevolucao").ValueKind);
        Assert.Equal(
            expectedBorrowerId,
            payload.GetProperty("solicitante").GetProperty("id").GetInt32());

        var product = Assert.Single(payload.GetProperty("produtos").EnumerateArray());
        Assert.Equal(
            expectedProductId,
            product.GetProperty("produto").GetProperty("id").GetInt32());
        Assert.Equal(expectedQuantity, product.GetProperty("quantidade").GetInt32());
    }

    private static async Task<JsonElement> ReadJsonAsync(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.Clone();
    }

    private static readonly DateTimeOffset ScenarioNow =
        new(2026, 9, 14, 12, 0, 0, TimeSpan.Zero);
}

public sealed class EmprestimosControllerNotificationFailureTests
{
    private const int ProductId = 11;

    [Fact]
    public async Task AdicionarPropagatesUnexpectedNotificationFailure()
    {
        var notificationFailure = new InvalidOperationException("notification failure");
        var notificationService = new Mock<INotificacaoService>();
        notificationService
            .Setup(service => service.CriarNotificacaoNovoEmprestimo(It.IsAny<int>()))
            .ThrowsAsync(notificationFailure);

        var controller = CreateController(notificationService);

        var thrown = await Assert.ThrowsAsync<InvalidOperationException>(
            () => controller.Adicionar(CreateLoanRequest()));

        Assert.Same(notificationFailure, thrown);
    }

    [Fact]
    public async Task AdicionarKeepsCreatedResponseWhenNotificationPersistenceFails()
    {
        var notificationService = new Mock<INotificacaoService>();
        notificationService
            .Setup(service => service.CriarNotificacaoNovoEmprestimo(It.IsAny<int>()))
            .ThrowsAsync(new DbUpdateException("notification persistence failure"));

        var result = await CreateController(notificationService)
            .Adicionar(CreateLoanRequest());

        Assert.IsType<CreatedAtActionResult>(result);
    }

    private static AddEmprestimoDTO CreateLoanRequest() => new()
    {
        DiasParaDevolucao = 5,
        Produtos = [new ProdutoQuantidadeDTO { ProdutoId = ProductId, Quantidade = 3 }]
    };

    private static EmprestimosController CreateController(
        Mock<INotificacaoService> notificationService)
    {
        var loanRepository = new Mock<IRepository<Emprestimo>>();
        var productRepository = new Mock<IRepository<Produto>>();
        var unitOfWork = new Mock<IUnitOfWork>();
        var mapper = new Mock<IMapper>();
        var transaction = new Mock<IDbContextTransaction>();
        transaction
            .Setup(current => current.CommitAsync(It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        transaction
            .Setup(current => current.RollbackAsync(It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        var createdLoan = new Emprestimo
        {
            Id = 42,
            DataRealizacao = DateTime.UtcNow,
            Status = StatusEmprestimo.Pendente,
            SolicitanteId = 7
        };
        var requestedProduct = new Produto
        {
            Id = ProductId,
            NomeProduto = "Produto sintético",
            Quantidade = 10,
            QuantidadeMinima = 2,
            Status = StatusProduto.Disponivel
        };

        mapper
            .Setup(current => current.Map<Emprestimo>(It.IsAny<AddEmprestimoDTO>()))
            .Returns(createdLoan);
        mapper
            .Setup(current => current.Map<EmprestimoDTO>(It.IsAny<Emprestimo>()))
            .Returns(new EmprestimoDTO());
        loanRepository
            .Setup(repository => repository.Criar(It.IsAny<Emprestimo>()))
            .Returns(createdLoan);
        loanRepository
            .Setup(repository => repository.ObterAsync(
                It.IsAny<Expression<Func<Emprestimo, bool>>>(),
                It.IsAny<Func<IQueryable<Emprestimo>, IQueryable<Emprestimo>>?>()))
            .ReturnsAsync(createdLoan);
        productRepository
            .Setup(repository => repository.ObterTodosAsync(
                It.IsAny<Expression<Func<Produto, bool>>>(),
                It.IsAny<Func<IQueryable<Produto>, IQueryable<Produto>>?>()))
            .ReturnsAsync([requestedProduct]);
        unitOfWork.SetupGet(current => current.EmprestimoRepository).Returns(loanRepository.Object);
        unitOfWork.SetupGet(current => current.ProdutoRepository).Returns(productRepository.Object);
        unitOfWork
            .Setup(current => current.BeginTransactionAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(transaction.Object);
        unitOfWork
            .Setup(current => current.LockProductsForMutationAsync(
                It.IsAny<IEnumerable<int>>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        unitOfWork.Setup(current => current.CommitAsync()).Returns(Task.CompletedTask);

        var controller = new EmprestimosController(
            unitOfWork.Object,
            mapper.Object,
            notificationService.Object,
            TimeProvider.System);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                    new[] { new Claim(ClaimTypes.NameIdentifier, "7") },
                    "test"))
            }
        };

        return controller;
    }
}
