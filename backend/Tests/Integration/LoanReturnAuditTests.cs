using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.DTOs.Auditoria;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class LoanReturnAuditTests(PostgreSqlContainerFixture database)
{
    private static readonly DateTimeOffset ScenarioNow =
        new(2026, 11, 19, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task AdministratorReturnRestoresDisabledProductAndRecordsMovementAndMandatoryAudit()
    {
        var (factory, scenario) = await CreateScenarioAsync();
        await using (factory)
        {
            var loan = await AddApprovedLoanAsync(
                factory,
                scenario.MenteeOneId,
                scenario.MentorTwoId,
                desativado: true,
                productStatus: StatusProduto.Danificado);
            using var administrator = CreateClient(
                factory,
                scenario.AdministratorId,
                NivelUsuario.Administrador);

            using var response = await SendReturnAsync(administrator, loan.Id);

            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
            await using var verificationScope = factory.Services.CreateAsyncScope();
            var context = verificationScope.ServiceProvider.GetRequiredService<AppDbContext>();
            var savedLoan = await context.Emprestimos.AsNoTracking().SingleAsync(item => item.Id == loan.Id);
            var savedProduct = await context.Produtos.AsNoTracking().SingleAsync(item => item.Id == loan.ProductId);
            Assert.Equal(ScenarioNow.UtcDateTime, savedLoan.DataDevolucao);
            Assert.Equal(ScenarioNow.UtcDateTime.AddDays(5), savedLoan.DataPrevistaDevolucao);
            Assert.Equal(10, savedProduct.Quantidade);
            Assert.True(savedProduct.Desativado);
            Assert.Equal(StatusProduto.Danificado, savedProduct.Status);

            var movement = await context.MovimentacoesEstoque.AsNoTracking().SingleAsync(item =>
                item.EmprestimoId == loan.Id && item.Tipo == TipoMovimentacaoEstoque.DevolucaoEmprestimo);
            Assert.Equal(2, movement.Quantidade);
            Assert.Equal(scenario.AdministratorId, movement.AtorId);
            Assert.Equal(loan.LotId, movement.LoteId);
            Assert.Equal(ScenarioNow.UtcDateTime, movement.Instante);

            var audit = await context.LogsAuditoria.AsNoTracking().SingleAsync(item =>
                item.CodigoEvento == CodigoEventoAuditoria.DevolucaoEmprestimo &&
                item.CategoriaRegistro == CategoriaRegistroAuditoria.TrilhaObrigatoria);
            Assert.Equal(scenario.AdministratorId, audit.UsuarioId);
            Assert.Equal($"emprestimo:{loan.Id}", audit.Recurso);
            Assert.Equal(ScenarioNow.UtcDateTime, audit.DataHora);
            Assert.Equal(OrigemConfiavelAuditoria.UsuarioAutenticado, audit.OrigemConfiavel);
            Assert.Equal(ResultadoOperacaoAuditoria.Sucesso, audit.Resultado);
        }
    }

    [Fact]
    public async Task MentorAuthorizationUsesCurrentResponsibilityAndHidesOutOfScopeLoan()
    {
        var (factory, scenario) = await CreateScenarioAsync();
        await using (factory)
        {
            var loan = await AddApprovedLoanAsync(factory, scenario.MenteeOneId, scenario.MentorTwoId);
            using var previousMentor = CreateClient(factory, scenario.MentorOneId, NivelUsuario.Mentor);
            using var currentMentor = CreateClient(factory, scenario.MentorTwoId, NivelUsuario.Mentor);

            await TransferResponsibilityAsync(factory, scenario.MenteeOneId, scenario.MentorTwoId);
            using var deniedResponse = await SendReturnAsync(previousMentor, loan.Id);
            using var missingResponse = await SendReturnAsync(previousMentor, loan.Id + 1000);

            Assert.Equal(HttpStatusCode.NotFound, deniedResponse.StatusCode);
            Assert.Equal(
                await ApiProblemContractAssertions.ReadAsync(
                    deniedResponse, HttpStatusCode.NotFound, "resource_not_found"),
                await ApiProblemContractAssertions.ReadAsync(
                    missingResponse, HttpStatusCode.NotFound, "resource_not_found"));
            Assert.Equal(HttpStatusCode.NoContent,
                (await SendReturnAsync(currentMentor, loan.Id)).StatusCode);

            await using var verificationScope = factory.Services.CreateAsyncScope();
            var context = verificationScope.ServiceProvider.GetRequiredService<AppDbContext>();
            var savedLoan = await context.Emprestimos.AsNoTracking().SingleAsync(item => item.Id == loan.Id);
            Assert.Equal(ScenarioNow.UtcDateTime, savedLoan.DataDevolucao);
            Assert.Equal(10, await context.Produtos.Where(item => item.Id == loan.ProductId)
                .Select(item => item.Quantidade).SingleAsync());
            Assert.Equal(1, await context.MovimentacoesEstoque.CountAsync(item =>
                item.EmprestimoId == loan.Id && item.Tipo == TipoMovimentacaoEstoque.DevolucaoEmprestimo));
            Assert.Equal(1, await context.LogsAuditoria.CountAsync(item =>
                item.CodigoEvento == CodigoEventoAuditoria.DevolucaoEmprestimo &&
                item.CategoriaRegistro == CategoriaRegistroAuditoria.TrilhaObrigatoria));
        }
    }

    [Fact]
    public async Task MentorCanReturnTheirOwnApprovedLoan()
    {
        var (factory, scenario) = await CreateScenarioAsync();
        await using (factory)
        {
            var loan = await AddApprovedLoanAsync(factory, scenario.MentorOneId, scenario.MentorTwoId);
            using var mentor = CreateClient(factory, scenario.MentorOneId, NivelUsuario.Mentor);

            using var response = await SendReturnAsync(mentor, loan.Id);

            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
            await using var verificationScope = factory.Services.CreateAsyncScope();
            var context = verificationScope.ServiceProvider.GetRequiredService<AppDbContext>();
            var audit = await context.LogsAuditoria.AsNoTracking().SingleAsync(item =>
                item.CodigoEvento == CodigoEventoAuditoria.DevolucaoEmprestimo &&
                item.CategoriaRegistro == CategoriaRegistroAuditoria.TrilhaObrigatoria);
            Assert.Equal(scenario.MentorOneId, audit.UsuarioId);
            Assert.Equal($"emprestimo:{loan.Id}", audit.Recurso);
        }
    }

    [Fact]
    public async Task PendingLoanReturnUsesDomainConflictAndPreservesEffects()
    {
        var (factory, scenario) = await CreateScenarioAsync();
        await using (factory)
        {
            var loan = await AddApprovedLoanAsync(factory, scenario.MenteeOneId, scenario.MentorTwoId);
            await MakeLoanPendingAsync(factory, loan.Id, loan.ProductId);
            using var administrator = CreateClient(
                factory,
                scenario.AdministratorId,
                NivelUsuario.Administrador);

            using var response = await SendReturnAsync(administrator, loan.Id);

            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            using var problem = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            Assert.Equal("loan_not_approved_for_return", problem.RootElement.GetProperty("code").GetString());
            await using var verificationScope = factory.Services.CreateAsyncScope();
            var context = verificationScope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.Equal(StatusEmprestimo.Pendente, await context.Emprestimos.Where(item => item.Id == loan.Id)
                .Select(item => item.Status).SingleAsync());
            Assert.Null(await context.Emprestimos.Where(item => item.Id == loan.Id)
                .Select(item => item.DataDevolucao).SingleAsync());
            Assert.Equal(10, await context.Produtos.Where(item => item.Id == loan.ProductId)
                .Select(item => item.Quantidade).SingleAsync());
            Assert.Equal(0, await context.MovimentacoesEstoque.CountAsync(item =>
                item.EmprestimoId == loan.Id && item.Tipo == TipoMovimentacaoEstoque.DevolucaoEmprestimo));
            Assert.Equal(0, await context.LogsAuditoria.CountAsync(item =>
                item.CodigoEvento == CodigoEventoAuditoria.DevolucaoEmprestimo &&
                item.CategoriaRegistro == CategoriaRegistroAuditoria.TrilhaObrigatoria));
        }
    }

    [Fact]
    public async Task ConcurrentReturnsRestoreStockAndWriteAuditOnlyOnce()
    {
        var (factory, scenario) = await CreateScenarioAsync();
        await using (factory)
        {
            var loan = await AddApprovedLoanAsync(factory, scenario.MenteeOneId, scenario.MentorTwoId);
            using var administrator = CreateClient(
                factory,
                scenario.AdministratorId,
                NivelUsuario.Administrador);
            using var mentor = CreateClient(factory, scenario.MentorOneId, NivelUsuario.Mentor);

            var responses = await Task.WhenAll(
                SendReturnAsync(administrator, loan.Id),
                SendReturnAsync(mentor, loan.Id));
            using var first = responses[0];
            using var second = responses[1];

            Assert.Single(responses, response => response.StatusCode == HttpStatusCode.NoContent);
            var conflict = Assert.Single(responses, response => response.StatusCode == HttpStatusCode.Conflict);
            using var problem = JsonDocument.Parse(await conflict.Content.ReadAsStringAsync());
            Assert.Equal("loan_return_already_recorded", problem.RootElement.GetProperty("code").GetString());

            await using var verificationScope = factory.Services.CreateAsyncScope();
            var context = verificationScope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.Equal(10, await context.Produtos.Where(item => item.Id == loan.ProductId)
                .Select(item => item.Quantidade).SingleAsync());
            Assert.Equal(1, await context.MovimentacoesEstoque.CountAsync(item =>
                item.EmprestimoId == loan.Id && item.Tipo == TipoMovimentacaoEstoque.DevolucaoEmprestimo));
            Assert.Equal(1, await context.LogsAuditoria.CountAsync(item =>
                item.CodigoEvento == CodigoEventoAuditoria.DevolucaoEmprestimo &&
                item.CategoriaRegistro == CategoriaRegistroAuditoria.TrilhaObrigatoria));
        }
    }

    [Fact]
    public async Task ReturnWithStockOutsideSupportedRangePreservesLoanStockMovementsAndAudit()
    {
        var (factory, scenario) = await CreateScenarioAsync();
        await using (factory)
        {
            var loan = await AddApprovedLoanAsync(factory, scenario.MenteeOneId, scenario.MentorTwoId);
            await SetProductQuantityAsync(factory, loan.ProductId, float.MaxValue);
            using var administrator = CreateClient(
                factory,
                scenario.AdministratorId,
                NivelUsuario.Administrador);

            using var response = await SendReturnAsync(administrator, loan.Id);

            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            using var problem = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            Assert.Equal("loan_stock_out_of_range", problem.RootElement.GetProperty("code").GetString());
            await using var verificationScope = factory.Services.CreateAsyncScope();
            var context = verificationScope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.Null(await context.Emprestimos.Where(item => item.Id == loan.Id)
                .Select(item => item.DataDevolucao).SingleAsync());
            Assert.Equal(float.MaxValue, await context.Produtos.Where(item => item.Id == loan.ProductId)
                .Select(item => item.Quantidade).SingleAsync());
            Assert.Equal(0, await context.MovimentacoesEstoque.CountAsync(item =>
                item.EmprestimoId == loan.Id && item.Tipo == TipoMovimentacaoEstoque.DevolucaoEmprestimo));
            Assert.Equal(0, await context.LogsAuditoria.CountAsync(item =>
                item.CodigoEvento == CodigoEventoAuditoria.DevolucaoEmprestimo &&
                item.CategoriaRegistro == CategoriaRegistroAuditoria.TrilhaObrigatoria));
        }
    }

    [Fact]
    public async Task FailureToPersistMandatoryAuditRollsBackReturnAndStockRestoration()
    {
        var (factory, scenario) = await CreateScenarioAsync();
        await using (factory)
        {
            var loan = await AddApprovedLoanAsync(factory, scenario.MenteeOneId, scenario.MentorTwoId);
            await using (var operationScope = factory.Services.CreateAsyncScope())
            {
                var context = operationScope.ServiceProvider.GetRequiredService<AppDbContext>();
                var unitOfWork = operationScope.ServiceProvider.GetRequiredService<IUnitOfWork>();
                var realAuditService = operationScope.ServiceProvider.GetRequiredService<IAuditoriaService>();
                var auditService = new Mock<IAuditoriaService>(MockBehavior.Strict);
                auditService
                    .Setup(service => service.RegistrarEventoObrigatorioAsync(It.IsAny<CreateLogAuditoriaDTO>()))
                    .Returns(async (CreateLogAuditoriaDTO auditEvent) =>
                    {
                        await realAuditService.RegistrarEventoObrigatorioAsync(auditEvent);
                        context.ChangeTracker.Entries<LogAuditoria>().Single().Entity.ReferenciaAtor = "invalid";
                    });
                var service = new LoanReturnService(
                    unitOfWork,
                    context,
                    auditService.Object,
                    factory.Services.GetRequiredService<TimeProvider>(),
                    factory.Services.GetRequiredService<ProductCivilDay>());

                await Assert.ThrowsAsync<DbUpdateException>(() => service.ReturnAsync(
                    loan.Id,
                    scenario.AdministratorId,
                    "t005-controlled-audit-failure"));
            }

            await using var verificationScope = factory.Services.CreateAsyncScope();
            var verificationContext = verificationScope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.Null(await verificationContext.Emprestimos.Where(item => item.Id == loan.Id)
                .Select(item => item.DataDevolucao).SingleAsync());
            Assert.Equal(8, await verificationContext.Produtos.Where(item => item.Id == loan.ProductId)
                .Select(item => item.Quantidade).SingleAsync());
            Assert.Equal(0, await verificationContext.MovimentacoesEstoque.CountAsync(item =>
                item.EmprestimoId == loan.Id && item.Tipo == TipoMovimentacaoEstoque.DevolucaoEmprestimo));
            Assert.Equal(0, await verificationContext.LogsAuditoria.CountAsync(item =>
                item.CodigoEvento == CodigoEventoAuditoria.DevolucaoEmprestimo &&
                item.CategoriaRegistro == CategoriaRegistroAuditoria.TrilhaObrigatoria));
        }
    }

    private async Task<(IntegrationWebApplicationFactory Factory, AuthenticationProtectionScenarioData Scenario)>
        CreateScenarioAsync()
    {
        var scenario = AuthenticationProtectionScenarioData.Create($"loan-return-audit-{Guid.NewGuid():N}");
        var clock = new ControlledTimeProvider(ScenarioNow);
        var factory = new IntegrationWebApplicationFactory(
            database,
            new IntegrationApplicationOptions { TimeProvider = clock });
        await factory.RecreateDatabaseAsync();

        await using var scope = factory.Services.CreateAsyncScope();
        await scenario.PersistAsync(
            scope.ServiceProvider.GetRequiredService<AppDbContext>(),
            scope.ServiceProvider.GetRequiredService<Microsoft.AspNetCore.Identity.IPasswordHasher<Usuario>>());
        return (factory, scenario);
    }

    private static async Task<(int Id, int ProductId, int LotId)> AddApprovedLoanAsync(
        IntegrationWebApplicationFactory factory,
        int requesterId,
        int approverId,
        bool desativado = false,
        StatusProduto productStatus = StatusProduto.Disponivel)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var lot = new Lote
        {
            CodigoLote = $"T005-{Guid.NewGuid():N}",
            Fornecedor = "Fornecedor sintético",
            DataEntrada = ScenarioNow.UtcDateTime.AddDays(-30),
            Produtos = []
        };
        var product = new Produto
        {
            NomeProduto = "Produto sintético de devolução",
            Tipo = TipoProduto.Outro,
            Quantidade = 8,
            QuantidadeMinima = 1,
            UnidadeMedida = UnidadeMedida.Unidade,
            Status = productStatus,
            Desativado = desativado,
            UltimaModificacao = ScenarioNow.UtcDateTime.AddDays(-2),
            Lote = lot
        };
        lot.Produtos.Add(product);
        var loan = new Emprestimo
        {
            DataRealizacao = ScenarioNow.UtcDateTime.AddDays(-5),
            DataPrevistaDevolucao = ScenarioNow.UtcDateTime.AddDays(5),
            DataAprovacao = ScenarioNow.UtcDateTime.AddDays(-4),
            Status = StatusEmprestimo.Aprovado,
            SolicitanteId = requesterId,
            AprovadorId = approverId,
            Produtos =
            [
                new ProdutoEmprestado
                {
                    Produto = product,
                    Quantidade = 2
                }
            ]
        };
        context.Emprestimos.Add(loan);
        await context.SaveChangesAsync();
        context.MovimentacoesEstoque.Add(new MovimentacaoEstoque
        {
            EmprestimoId = loan.Id,
            ProdutoId = product.Id,
            Quantidade = 2,
            Instante = loan.DataAprovacao.Value,
            AtorId = approverId,
            LoteId = product.LoteId,
            Tipo = TipoMovimentacaoEstoque.SaidaEmprestimo
        });
        await context.SaveChangesAsync();
        return (loan.Id, product.Id, lot.Id);
    }

    private static async Task TransferResponsibilityAsync(
        IntegrationWebApplicationFactory factory,
        int menteeId,
        int mentorId)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var mentee = await context.Usuarios.SingleAsync(item => item.Id == menteeId);
        mentee.ResponsavelId = mentorId;
        await context.SaveChangesAsync();
    }

    private static async Task SetProductQuantityAsync(
        IntegrationWebApplicationFactory factory,
        int productId,
        float quantity)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var product = await context.Produtos.SingleAsync(item => item.Id == productId);
        product.Quantidade = quantity;
        await context.SaveChangesAsync();
    }

    private static async Task MakeLoanPendingAsync(
        IntegrationWebApplicationFactory factory,
        int loanId,
        int productId)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var loan = await context.Emprestimos.SingleAsync(item => item.Id == loanId);
        loan.Status = StatusEmprestimo.Pendente;
        loan.AprovadorId = null;
        loan.DataAprovacao = null;
        var product = await context.Produtos.SingleAsync(item => item.Id == productId);
        product.Quantidade = 10;
        context.MovimentacoesEstoque.RemoveRange(context.MovimentacoesEstoque.Where(item =>
            item.EmprestimoId == loanId && item.Tipo == TipoMovimentacaoEstoque.SaidaEmprestimo));
        await context.SaveChangesAsync();
    }

    private static HttpClient CreateClient(
        IntegrationWebApplicationFactory factory,
        int userId,
        NivelUsuario role)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            JwtSessionVersionTests.CreateToken(userId, "0", "false", role));
        return client;
    }

    private static Task<HttpResponseMessage> SendReturnAsync(HttpClient client, int loanId)
    {
        using var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/Emprestimos/devolver/{loanId}");
        return client.SendAsync(request);
    }
}
