using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class LoanResourceAuthorizationTests(PostgreSqlContainerFixture database)
{
    [Fact]
    public async Task MentorCannotReadUnlinkedMenteeLoansAndDeniedIdsMatchMissingResources()
    {
        var (factory, scenario) = await CreateScenarioAsync();
        await using (factory)
        {
            var loanId = await AddLoanAsync(factory, scenario.MenteeTwoId, scenario.MentorTwoId);
            using var mentor = CreateClient(factory, scenario.MentorOneId, NivelUsuario.Mentor);

            using var loansByUser = await mentor.GetAsync($"/api/Emprestimos/usuario/{scenario.MenteeTwoId}");
            using var missingLoansByUser = await mentor.GetAsync("/api/Emprestimos/usuario/999999");
            using var requestedLoans = await mentor.GetAsync($"/api/Emprestimos/solicitados/{scenario.MenteeTwoId}");
            using var missingRequestedLoans = await mentor.GetAsync("/api/Emprestimos/solicitados/999999");
            using var approvedLoans = await mentor.GetAsync($"/api/Emprestimos/aprovados/{scenario.MenteeTwoId}");
            using var missingApprovedLoans = await mentor.GetAsync("/api/Emprestimos/aprovados/999999");
            using var loan = await mentor.GetAsync($"/api/Emprestimos/{loanId}");
            using var missingLoan = await mentor.GetAsync($"/api/Emprestimos/{loanId + 1}");

            await AssertUniformNotFoundAsync(loansByUser, missingLoansByUser);
            await AssertUniformNotFoundAsync(requestedLoans, missingRequestedLoans);
            await AssertUniformNotFoundAsync(approvedLoans, missingApprovedLoans);
            await AssertUniformNotFoundAsync(loan, missingLoan);
        }
    }

    [Fact]
    public async Task OwnersLinkedMentorsAndAdministratorsReadOnlyAuthorizedLoans()
    {
        var (factory, scenario) = await CreateScenarioAsync();
        await using (factory)
        {
            var linkedLoanId = await AddLoanAsync(
                factory,
                scenario.MenteeOneId,
                scenario.MentorTwoId,
                includeProduct: true);
            var otherLoanId = await AddLoanAsync(factory, scenario.MenteeTwoId, approverId: null);
            await SetCredentialCanariesAsync(factory, scenario.MenteeOneId, scenario.MentorOneId);

            using var mentor = CreateClient(factory, scenario.MentorOneId, NivelUsuario.Mentor);
            using var mentee = CreateClient(factory, scenario.MenteeOneId, NivelUsuario.Mentorado);
            using var otherMentee = CreateClient(factory, scenario.MenteeTwoId, NivelUsuario.Mentorado);
            using var administrator = CreateClient(factory, scenario.AdministratorId, NivelUsuario.Administrador);
            using var approver = CreateClient(factory, scenario.MentorTwoId, NivelUsuario.Mentor);

            using var mentorLoans = await mentor.GetAsync($"/api/Emprestimos/usuario/{scenario.MenteeOneId}");
            using var mentorRequested = await mentor.GetAsync($"/api/Emprestimos/solicitados/{scenario.MenteeOneId}");
            using var mentorDetail = await mentor.GetAsync($"/api/Emprestimos/{linkedLoanId}");
            using var mentorApprovedOwn = await mentor.GetAsync($"/api/Emprestimos/aprovados/{scenario.MentorOneId}");
            using var mentorApprovedLinkedMentee = await mentor.GetAsync(
                $"/api/Emprestimos/aprovados/{scenario.MenteeOneId}");
            using var missingMentorApproved = await mentor.GetAsync("/api/Emprestimos/aprovados/999999");
            using var approverDetail = await approver.GetAsync($"/api/Emprestimos/{linkedLoanId}");
            using var approverApprovedOwn = await approver.GetAsync(
                $"/api/Emprestimos/aprovados/{scenario.MentorTwoId}");
            using var menteeLoans = await mentee.GetAsync($"/api/Emprestimos/usuario/{scenario.MenteeOneId}");
            using var menteeRequested = await mentee.GetAsync($"/api/Emprestimos/solicitados/{scenario.MenteeOneId}");
            using var menteeApprovedEmpty = await mentee.GetAsync($"/api/Emprestimos/aprovados/{scenario.MenteeOneId}");
            using var menteeDetail = await mentee.GetAsync($"/api/Emprestimos/{linkedLoanId}");
            using var unrelatedDetail = await otherMentee.GetAsync($"/api/Emprestimos/{linkedLoanId}");
            using var adminLoans = await administrator.GetAsync($"/api/Emprestimos/usuario/{scenario.MenteeTwoId}");
            using var adminAllLoans = await administrator.GetAsync("/api/Emprestimos");
            using var adminApprovedLoans = await administrator.GetAsync(
                $"/api/Emprestimos/aprovados/{scenario.MentorTwoId}");
            using var adminDetail = await administrator.GetAsync($"/api/Emprestimos/{otherLoanId}");
            using var adminEmptyRequested = await administrator.GetAsync(
                $"/api/Emprestimos/solicitados/{scenario.AdministratorId}");
            using var adminEmptyApproved = await administrator.GetAsync(
                $"/api/Emprestimos/aprovados/{scenario.AdministratorId}");

            await AssertLoanListContainsOnlyAsync(mentorLoans, linkedLoanId);
            await AssertLoanListContainsOnlyAsync(mentorRequested, linkedLoanId);
            await AssertLoanDetailsContainAsync(linkedLoanId, mentorDetail);
            await AssertEmptyListAsync(mentorApprovedOwn);
            await AssertUniformNotFoundAsync(mentorApprovedLinkedMentee, missingMentorApproved);
            await AssertLoanDetailsContainAsync(linkedLoanId, approverDetail);
            await AssertLoanListContainsOnlyAsync(approverApprovedOwn, linkedLoanId);
            await AssertLoanListContainsOnlyAsync(menteeLoans, linkedLoanId);
            await AssertLoanListContainsOnlyAsync(menteeRequested, linkedLoanId);
            await AssertEmptyListAsync(menteeApprovedEmpty);
            await AssertLoanDetailsContainAsync(linkedLoanId, menteeDetail);
            await AssertProjectionContainsNoPrivateDataAsync(
                mentorDetail,
                linkedLoanId,
                scenario.MentorOneId);
            Assert.Equal(HttpStatusCode.NotFound, unrelatedDetail.StatusCode);
            await AssertLoanListContainsOnlyAsync(adminLoans, otherLoanId);
            await AssertLoanListContainsIdsWithoutPrivateDataAsync(
                adminAllLoans,
                [linkedLoanId, otherLoanId]);
            await AssertLoanListContainsOnlyAsync(adminApprovedLoans, linkedLoanId);
            await AssertLoanDetailsContainAsync(otherLoanId, adminDetail);
            await AssertEmptyListAsync(adminEmptyRequested);
            await AssertEmptyListAsync(adminEmptyApproved);
        }
    }

    private async Task<(IntegrationWebApplicationFactory Factory, AuthenticationProtectionScenarioData Scenario)>
        CreateScenarioAsync()
    {
        var factory = new IntegrationWebApplicationFactory(database);
        await factory.RecreateDatabaseAsync();

        var scenario = AuthenticationProtectionScenarioData.Create($"T011-{Guid.NewGuid():N}");
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<
            Microsoft.AspNetCore.Identity.IPasswordHasher<Usuario>>();
        await scenario.PersistAsync(context, passwordHasher);
        return (factory, scenario);
    }

    private static async Task<int> AddLoanAsync(
        IntegrationWebApplicationFactory factory,
        int requesterId,
        int? approverId,
        bool includeProduct = false)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var loan = new Emprestimo
        {
            DataRealizacao = new DateTime(2026, 10, 13, 12, 0, 0, DateTimeKind.Utc),
            DataPrevistaDevolucao = new DateTime(2026, 10, 20, 12, 0, 0, DateTimeKind.Utc),
            DataAprovacao = approverId.HasValue
                ? new DateTime(2026, 10, 13, 12, 30, 0, DateTimeKind.Utc)
                : null,
            Status = approverId.HasValue ? StatusEmprestimo.Aprovado : StatusEmprestimo.Pendente,
            SolicitanteId = requesterId,
            AprovadorId = approverId
        };
        if (includeProduct)
        {
            var lot = new Lote
            {
                CodigoLote = $"T011-LOT-{Guid.NewGuid():N}",
                Fornecedor = "Fornecedor sintético",
                DataEntrada = new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc),
                Produtos = []
            };
            var product = new Produto
            {
                Catmat = "T011-CATMAT",
                NomeProduto = "Produto sintético",
                Tipo = TipoProduto.Outro,
                Fornecedor = "Fornecedor sintético",
                UnidadeMedida = UnidadeMedida.Unidade,
                Quantidade = 10,
                QuantidadeMinima = 1,
                LocalizacaoProduto = "Armário sintético",
                Status = StatusProduto.Disponivel,
                UltimaModificacao = new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc),
                Lote = lot
            };
            lot.Produtos.Add(product);
            loan.Produtos.Add(new ProdutoEmprestado
            {
                Produto = product,
                Quantidade = 2
            });
        }
        context.Emprestimos.Add(loan);
        await context.SaveChangesAsync();
        return loan.Id;
    }

    private static async Task SetCredentialCanariesAsync(
        IntegrationWebApplicationFactory factory,
        int menteeId,
        int mentorId)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var mentee = await context.Usuarios.SingleAsync(usuario => usuario.Id == menteeId);
        var mentor = await context.Usuarios.SingleAsync(usuario => usuario.Id == mentorId);
        mentee.SenhaHash = "T011-SENSITIVE-PASSWORD-HASH-CANARY";
        mentee.TokenRedefinicaoHash = "T011-SENSITIVE-RECOVERY-HASH-CANARY";
        mentee.TokenExpiracao = new DateTime(2026, 10, 14, 12, 0, 0, DateTimeKind.Utc);
        mentor.SenhaHash = "T011-SENSITIVE-MENTOR-HASH-CANARY";
        mentor.TokenRedefinicaoHash = "T011-SENSITIVE-MENTOR-RECOVERY-CANARY";
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

    private static async Task AssertUniformNotFoundAsync(
        HttpResponseMessage inaccessible,
        HttpResponseMessage missing)
    {
        Assert.Equal(HttpStatusCode.NotFound, inaccessible.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
        Assert.Equal(
            await inaccessible.Content.ReadAsStringAsync(),
            await missing.Content.ReadAsStringAsync());
    }

    private static async Task AssertEmptyListAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var payload = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(JsonValueKind.Array, payload.RootElement.ValueKind);
        Assert.Empty(payload.RootElement.EnumerateArray());
    }

    private static async Task AssertLoanListContainsOnlyAsync(HttpResponseMessage response, int expectedLoanId)
    {
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var payload = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(expectedLoanId, Assert.Single(payload.RootElement.EnumerateArray())
            .GetProperty("id").GetInt32());
    }

    private static async Task AssertLoanListContainsIdsWithoutPrivateDataAsync(
        HttpResponseMessage response,
        int[] expectedLoanIds)
    {
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var content = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("T011-SENSITIVE-", content, StringComparison.Ordinal);
        Assert.DoesNotContain("senhaHash", content, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("tokenRedefinicao", content, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("tokenExpiracao", content, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("versaoSessao", content, StringComparison.OrdinalIgnoreCase);

        using var payload = JsonDocument.Parse(content);
        Assert.Equal(
            expectedLoanIds.Order(),
            payload.RootElement.EnumerateArray()
                .Select(loan => loan.GetProperty("id").GetInt32())
                .Order());
    }

    private static async Task AssertLoanDetailsContainAsync(int expectedLoanId, HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var payload = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(expectedLoanId, payload.RootElement.GetProperty("id").GetInt32());
    }

    private static async Task AssertProjectionContainsNoPrivateDataAsync(
        HttpResponseMessage response,
        int expectedLoanId,
        int expectedResponsibleId)
    {
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var content = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("T011-SENSITIVE-", content, StringComparison.Ordinal);
        Assert.DoesNotContain("senhaHash", content, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("tokenRedefinicao", content, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("tokenExpiracao", content, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("versaoSessao", content, StringComparison.OrdinalIgnoreCase);

        using var payload = JsonDocument.Parse(content);
        var root = payload.RootElement;
        Assert.Equal(expectedLoanId, root.GetProperty("id").GetInt32());
        var borrower = root.GetProperty("solicitante");
        Assert.Equal(
            ["dataIngresso", "email", "id", "nivelUsuario", "nomeCompleto", "responsavel", "status", "telefone", "tipoUsuario"],
            borrower.EnumerateObject().Select(property => property.Name).Order(StringComparer.Ordinal));
        Assert.Equal(
            expectedResponsibleId,
            borrower.GetProperty("responsavel").GetProperty("id").GetInt32());

        var product = Assert.Single(root.GetProperty("produtos").EnumerateArray())
            .GetProperty("produto");
        Assert.Equal("Produto sintético", product.GetProperty("nomeProduto").GetString());
        var lot = product.GetProperty("lote");
        Assert.Equal(JsonValueKind.Array, lot.GetProperty("produtos").ValueKind);
        Assert.Empty(lot.GetProperty("produtos").EnumerateArray());
    }
}
