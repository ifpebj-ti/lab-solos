using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Globalization;
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
public sealed class ProductHistoryScopeTests(PostgreSqlContainerFixture database)
{
    [Fact]
    public async Task AdministratorSeesAllEffectiveOutflowsWithMinimizedFieldsAndMatchingTotals()
    {
        var seeded = await SeedHistoryScenarioAsync("product-history-admin-scope", includeOutflows: true);
        await using var factory = seeded.Factory;
        using var administrator = await CreateAuthenticatedClientAsync(
            factory,
            seeded.Scenario.AdministratorEmail,
            seeded.Scenario.AdministratorPassword);

        using var response = await administrator.GetAsync(HistoryPath(seeded.Scenario.ProductId));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(body);
        var root = document.RootElement;
        AssertScopedTotals(root, expectedLoans: 3, expectedQuantity: 9);
        AssertLoanIds(root, seeded.LinkedLoanId, seeded.MentorLoanId, seeded.ForeignMenteeLoanId);
        AssertRequesterName(root, seeded.LinkedLoanId, BorrowerName(seeded.Scenario));
        AssertRequesterName(root, seeded.MentorLoanId, MentorName(seeded.Scenario));
        AssertRequesterName(root, seeded.ForeignMenteeLoanId, seeded.PeerMenteeName);
        AssertNoPrivateFields(root);
        Assert.DoesNotContain("@integration.test", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task MentorAndMenteeReceiveOnlyCurrentLinkedRowsAndTotalsFromTheSameScope()
    {
        var seeded = await SeedHistoryScenarioAsync("product-history-live-link-scope", includeOutflows: true);
        await using var factory = seeded.Factory;
        using var mentor = await CreateAuthenticatedClientAsync(
            factory,
            seeded.Scenario.ResponsibleEmail,
            seeded.Scenario.ResponsiblePassword);
        using var peerMentor = await CreateAuthenticatedClientAsync(
            factory,
            seeded.PeerMentorEmail,
            seeded.PeerMentorPassword);
        using var mentee = await CreateAuthenticatedClientAsync(
            factory,
            seeded.Scenario.BorrowerEmail,
            seeded.Scenario.BorrowerPassword);

        using (var beforeTransfer = await mentor.GetAsync(HistoryPath(seeded.Scenario.ProductId)))
        {
            Assert.Equal(HttpStatusCode.OK, beforeTransfer.StatusCode);
            using var document = JsonDocument.Parse(await beforeTransfer.Content.ReadAsStringAsync());
            var root = document.RootElement;
            AssertScopedTotals(root, expectedLoans: 2, expectedQuantity: 5);
            AssertLoanIds(root, seeded.LinkedLoanId, seeded.MentorLoanId);
            AssertRequesterName(root, seeded.LinkedLoanId, BorrowerName(seeded.Scenario));
            AssertRequesterName(root, seeded.MentorLoanId, expectedName: null);
            AssertNoPrivateFields(root);
        }

        await TransferMenteeAsync(factory, seeded.Scenario.BorrowerId, seeded.PeerMentorId);

        using (var afterTransfer = await mentor.GetAsync(HistoryPath(seeded.Scenario.ProductId)))
        {
            Assert.Equal(HttpStatusCode.OK, afterTransfer.StatusCode);
            using var document = JsonDocument.Parse(await afterTransfer.Content.ReadAsStringAsync());
            var root = document.RootElement;
            AssertScopedTotals(root, expectedLoans: 1, expectedQuantity: 2);
            AssertLoanIds(root, seeded.MentorLoanId);
            AssertRequesterName(root, seeded.MentorLoanId, expectedName: null);
            AssertNoPrivateFields(root);
        }

        using (var afterTransfer = await peerMentor.GetAsync(HistoryPath(seeded.Scenario.ProductId)))
        {
            Assert.Equal(HttpStatusCode.OK, afterTransfer.StatusCode);
            using var document = JsonDocument.Parse(await afterTransfer.Content.ReadAsStringAsync());
            var root = document.RootElement;
            AssertScopedTotals(root, expectedLoans: 2, expectedQuantity: 7);
            AssertLoanIds(root, seeded.LinkedLoanId, seeded.ForeignMenteeLoanId);
            AssertRequesterName(root, seeded.LinkedLoanId, BorrowerName(seeded.Scenario));
            AssertRequesterName(root, seeded.ForeignMenteeLoanId, seeded.PeerMenteeName);
            AssertNoPrivateFields(root);
        }

        using (var menteeResponse = await mentee.GetAsync(HistoryPath(seeded.Scenario.ProductId)))
        {
            Assert.Equal(HttpStatusCode.OK, menteeResponse.StatusCode);
            using var document = JsonDocument.Parse(await menteeResponse.Content.ReadAsStringAsync());
            var root = document.RootElement;
            AssertScopedTotals(root, expectedLoans: 1, expectedQuantity: 3);
            AssertLoanIds(root, seeded.LinkedLoanId);
            AssertRequesterName(root, seeded.LinkedLoanId, expectedName: null);
            AssertNoPrivateFields(root);
        }
    }

    [Fact]
    public async Task ActorOutsideProductScopeGetsNotFoundWithoutHistoryDetails()
    {
        var seeded = await SeedHistoryScenarioAsync("product-history-not-found-scope", includeOutflows: true);
        await using var factory = seeded.Factory;
        using var unrelatedMentor = await CreateAuthenticatedClientAsync(
            factory,
            seeded.UnrelatedMentorEmail,
            seeded.UnrelatedMentorPassword);

        using var response = await unrelatedMentor.GetAsync(HistoryPath(seeded.Scenario.ProductId));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain(BorrowerName(seeded.Scenario), body, StringComparison.Ordinal);
        Assert.DoesNotContain("@integration.test", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(
            seeded.Scenario.ProductId.ToString(CultureInfo.InvariantCulture),
            body,
            StringComparison.Ordinal);
        Assert.DoesNotContain("historico", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task AuthorizedProductWithoutEffectiveOutflowsReturnsEmptyHistoryAndZeroTotals()
    {
        var seeded = await SeedHistoryScenarioAsync("product-history-empty-scope", includeOutflows: false);
        await using var factory = seeded.Factory;
        using var administrator = await CreateAuthenticatedClientAsync(
            factory,
            seeded.Scenario.AdministratorEmail,
            seeded.Scenario.AdministratorPassword);

        using var response = await administrator.GetAsync(HistoryPath(seeded.Scenario.ProductId));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = document.RootElement;
        AssertScopedTotals(root, expectedLoans: 0, expectedQuantity: 0);
        Assert.Empty(root.GetProperty("historico").EnumerateArray());
        AssertNoPrivateFields(root);
    }

    private async Task<HistoryScenario> SeedHistoryScenarioAsync(string scenarioKey, bool includeOutflows)
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

        var peerMentorId = scenario.ResponsibleId + 10;
        var peerMenteeId = scenario.ResponsibleId + 20;
        var unrelatedMentorId = scenario.ResponsibleId + 30;
        var linkedLoanId = scenario.LoanId;
        var mentorLoanId = scenario.LoanId + 1;
        var foreignMenteeLoanId = scenario.LoanId + 2;

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<Usuario>>();
        await scenario.PersistAsync(context, passwordHasher, clock);

        var peerMentorEmail = $"peer-mentor-{scenario.ScenarioToken}@integration.test";
        var peerMentorPassword = $"T007-PeerMentor-{scenario.ScenarioToken}-Secure!";
        var peerMenteeEmail = $"peer-mentee-{scenario.ScenarioToken}@integration.test";
        var peerMenteePassword = $"T007-PeerMentee-{scenario.ScenarioToken}-Secure!";
        var unrelatedMentorEmail = $"unrelated-mentor-{scenario.ScenarioToken}@integration.test";
        var unrelatedMentorPassword = $"T007-Unrelated-{scenario.ScenarioToken}-Secure!";
        var peerMentorName = $"Mentor par {scenario.ScenarioToken}";
        var peerMenteeName = $"Mentorado par {scenario.ScenarioToken}";

        context.Academicos.AddRange(
            CreateAcademicAccount(
                peerMentorId,
                peerMentorName,
                peerMentorEmail,
                peerMentorPassword,
                NivelUsuario.Mentor,
                responsavelId: null,
                passwordHasher),
            CreateAcademicAccount(
                peerMenteeId,
                peerMenteeName,
                peerMenteeEmail,
                peerMenteePassword,
                NivelUsuario.Mentorado,
                peerMentorId,
                passwordHasher),
            CreateAcademicAccount(
                unrelatedMentorId,
                $"Mentor sem vínculo {scenario.ScenarioToken}",
                unrelatedMentorEmail,
                unrelatedMentorPassword,
                NivelUsuario.Mentor,
                responsavelId: null,
                passwordHasher));

        var rejectedLoanId = scenario.LoanId + 3;
        if (includeOutflows)
        {
            var capturedLot = new Lote { CodigoLote = $"LOTE-HISTORICO-{scenario.ScenarioToken}" };
            var currentLot = new Lote { CodigoLote = $"LOTE-CORRENTE-{scenario.ScenarioToken}" };
            context.Lotes.AddRange(capturedLot, currentLot);

            var linkedLoan = await context.Emprestimos.SingleAsync(loan => loan.Id == linkedLoanId);
            var linkedItem = await context.ProdutosEmprestados.SingleAsync(item => item.EmprestimoId == linkedLoanId);
            linkedItem.Quantidade = 3;
            linkedLoan.Status = StatusEmprestimo.Aprovado;
            linkedLoan.AprovadorId = scenario.AdministratorId;
            linkedLoan.DataAprovacao = ScenarioNow.UtcDateTime.AddHours(-3);
            var product = await context.Produtos.SingleAsync(item => item.Id == scenario.ProductId);
            product.Lote = currentLot;

            context.Emprestimos.AddRange(
                CreateEffectiveLoan(
                    mentorLoanId,
                    scenario.ResponsibleId,
                    scenario.ProductId,
                    scenario.AdministratorId,
                    quantity: 2,
                    ScenarioNow.UtcDateTime.AddHours(-2)),
                CreateEffectiveLoan(
                    foreignMenteeLoanId,
                    peerMenteeId,
                    scenario.ProductId,
                    scenario.AdministratorId,
                    quantity: 4,
                    ScenarioNow.UtcDateTime.AddHours(-1)));

            context.MovimentacoesEstoque.AddRange(
                CreateOutflowMovement(
                    linkedLoanId,
                    scenario.ProductId,
                    scenario.AdministratorId,
                    quantity: 3,
                    ScenarioNow.UtcDateTime.AddHours(-3),
                    capturedLot),
                CreateOutflowMovement(
                    mentorLoanId,
                    scenario.ProductId,
                    scenario.AdministratorId,
                    quantity: 2,
                    ScenarioNow.UtcDateTime.AddHours(-2),
                    lot: null),
                CreateOutflowMovement(
                    foreignMenteeLoanId,
                    scenario.ProductId,
                    scenario.AdministratorId,
                    quantity: 4,
                    ScenarioNow.UtcDateTime.AddHours(-1),
                    lot: null));

            await AddNoMovementLoanAsync(
                context,
                rejectedLoanId,
                scenario.BorrowerId,
                scenario.ProductId,
                StatusEmprestimo.Rejeitado);
            await AddNoMovementLoanAsync(
                context,
                scenario.LoanId + 4,
                scenario.BorrowerId,
                scenario.ProductId,
                StatusEmprestimo.Pendente);
        }
        else
        {
            await AddNoMovementLoanAsync(
                context,
                rejectedLoanId,
                scenario.BorrowerId,
                scenario.ProductId,
                StatusEmprestimo.Rejeitado);
        }

        await context.SaveChangesAsync();
        return new HistoryScenario(
            factory,
            scenario,
            peerMentorId,
            peerMentorEmail,
            peerMentorPassword,
            peerMenteeName,
            unrelatedMentorEmail,
            unrelatedMentorPassword,
            linkedLoanId,
            mentorLoanId,
            foreignMenteeLoanId);
    }

    private static Academico CreateAcademicAccount(
        int id,
        string name,
        string email,
        string password,
        NivelUsuario role,
        int? responsavelId,
        IPasswordHasher<Usuario> passwordHasher)
    {
        var account = new Academico
        {
            Id = id,
            NomeCompleto = name,
            Email = email,
            SenhaHash = string.Empty,
            NivelUsuario = role,
            TipoUsuario = TipoUsuario.Academico,
            Status = StatusUsuario.Habilitado,
            ExigeTrocaSenha = false,
            VersaoSessao = 0,
            Instituicao = "Instituição sintética T007",
            Cidade = "Recife",
            Curso = "Química",
            ResponsavelId = responsavelId
        };
        account.SenhaHash = passwordHasher.HashPassword(account, password);
        return account;
    }

    private static Emprestimo CreateEffectiveLoan(
        int loanId,
        int requesterId,
        int productId,
        int approverId,
        int quantity,
        DateTime occurredAt) =>
        new()
        {
            Id = loanId,
            DataRealizacao = occurredAt.AddDays(-1),
            DataPrevistaDevolucao = occurredAt.AddDays(7),
            DataAprovacao = occurredAt,
            AprovadorId = approverId,
            Status = StatusEmprestimo.Aprovado,
            SolicitanteId = requesterId,
            Produtos =
            [
                new ProdutoEmprestado
                {
                    EmprestimoId = loanId,
                    ProdutoId = productId,
                    Quantidade = quantity
                }
            ]
        };

    private static MovimentacaoEstoque CreateOutflowMovement(
        int loanId,
        int productId,
        int actorId,
        int quantity,
        DateTime occurredAt,
        Lote? lot) =>
        new()
        {
            EmprestimoId = loanId,
            ProdutoId = productId,
            AtorId = actorId,
            Quantidade = quantity,
            Instante = occurredAt,
            Lote = lot,
            Tipo = TipoMovimentacaoEstoque.SaidaEmprestimo
        };

    private static Task AddNoMovementLoanAsync(
        AppDbContext context,
        int loanId,
        int requesterId,
        int productId,
        StatusEmprestimo status)
    {
        context.Emprestimos.Add(new Emprestimo
        {
            Id = loanId,
            DataRealizacao = ScenarioNow.UtcDateTime.AddDays(-1),
            DataPrevistaDevolucao = ScenarioNow.UtcDateTime.AddDays(7),
            Status = status,
            SolicitanteId = requesterId,
            Produtos =
            [
                new ProdutoEmprestado
                {
                    EmprestimoId = loanId,
                    ProdutoId = productId,
                    Quantidade = 1
                }
            ]
        });
        return Task.CompletedTask;
    }

    private static async Task TransferMenteeAsync(
        IntegrationWebApplicationFactory factory,
        int menteeId,
        int newResponsibleId)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var mentee = await context.Usuarios.SingleAsync(user => user.Id == menteeId);
        mentee.ResponsavelId = newResponsibleId;
        await context.SaveChangesAsync();
    }

    private static async Task<HttpClient> CreateAuthenticatedClientAsync(
        IntegrationWebApplicationFactory factory,
        string email,
        string password)
    {
        var client = factory.CreateClient();
        using var response = await client.PostAsJsonAsync("/api/Auth/login", new { email, password });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var token = document.RootElement.GetProperty("token").GetString();
        Assert.False(string.IsNullOrWhiteSpace(token));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private static string HistoryPath(int productId) => $"/api/Produtos/{productId}/historico-saida";

    private static string BorrowerName(CriticalScenarioData scenario) =>
        $"Mentorado {scenario.ScenarioToken}";

    private static string MentorName(CriticalScenarioData scenario) =>
        $"Mentor {scenario.ScenarioToken}";

    private static void AssertScopedTotals(JsonElement root, int expectedLoans, float expectedQuantity)
    {
        Assert.Equal(expectedLoans, root.GetProperty("totalEmprestimos").GetInt32());
        Assert.Equal(expectedQuantity, root.GetProperty("totalQuantidadeEmprestada").GetSingle());
    }

    private static void AssertLoanIds(JsonElement root, params int[] expectedLoanIds)
    {
        var actualLoanIds = root.GetProperty("historico")
            .EnumerateArray()
            .Select(item => item.GetProperty("emprestimoId").GetInt32())
            .OrderBy(id => id)
            .ToArray();
        Assert.Equal(expectedLoanIds.OrderBy(id => id), actualLoanIds);
    }

    private static void AssertRequesterName(JsonElement root, int loanId, string? expectedName)
    {
        var line = root.GetProperty("historico")
            .EnumerateArray()
            .Single(item => item.GetProperty("emprestimoId").GetInt32() == loanId);

        if (expectedName is null)
        {
            Assert.True(
                !line.TryGetProperty("solicitanteNome", out var requesterName) ||
                requesterName.ValueKind == JsonValueKind.Null,
                "O nome do solicitante deve ficar ausente fora dos recortes autorizados.");
            return;
        }

        Assert.Equal(expectedName, line.GetProperty("solicitanteNome").GetString());
    }

    private static void AssertNoPrivateFields(JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.Object)
        {
            foreach (var property in element.EnumerateObject())
            {
                var name = property.Name;
                Assert.False(name.Contains("email", StringComparison.OrdinalIgnoreCase));
                Assert.False(name.Contains("identificador", StringComparison.OrdinalIgnoreCase));
                Assert.False(name.Contains("estoque", StringComparison.OrdinalIgnoreCase));
                Assert.False(name.Contains("saldo", StringComparison.OrdinalIgnoreCase));
                AssertNoPrivateFields(property.Value);
            }
        }
        else if (element.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in element.EnumerateArray())
            {
                AssertNoPrivateFields(item);
            }
        }
        else if (element.ValueKind == JsonValueKind.String)
        {
            Assert.DoesNotContain("@integration.test", element.GetString(), StringComparison.OrdinalIgnoreCase);
        }
    }

    private sealed record HistoryScenario(
        IntegrationWebApplicationFactory Factory,
        CriticalScenarioData Scenario,
        int PeerMentorId,
        string PeerMentorEmail,
        string PeerMentorPassword,
        string PeerMenteeName,
        string UnrelatedMentorEmail,
        string UnrelatedMentorPassword,
        int LinkedLoanId,
        int MentorLoanId,
        int ForeignMenteeLoanId);

    private static readonly DateTimeOffset ScenarioNow =
        new(2026, 11, 17, 12, 0, 0, TimeSpan.Zero);
}
