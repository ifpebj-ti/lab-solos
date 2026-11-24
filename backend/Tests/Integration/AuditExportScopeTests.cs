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
public sealed class AuditExportScopeTests(PostgreSqlContainerFixture database)
{
    private static readonly DateTimeOffset ScenarioNow =
        new(2026, 11, 23, 15, 0, 0, TimeSpan.Zero);
    private static readonly int[] FirstAuditPageIds = [13, 12];
    private static readonly int[] SecondAuditPageIds = [11];
    private static readonly string[] AuditProjectionProperties =
    [
        "acao", "categoriaDeteccao", "codigoEvento", "codigoRegraDeteccao", "dataHoraUtc",
        "historicoClassificacao", "id", "origem", "quantidadeObservadaDeteccao", "recurso",
        "resultado", "revisaoClassificacao", "suspeita", "versaoRegraDeteccao"
    ];

    [Fact]
    public async Task AuditQueryUsesMinimalStablePagesAndRechecksAuthorizationForEveryPage()
    {
        await using var factory = await CreateFactoryAsync(
            Log(11, ScenarioNow.AddMinutes(-1), resource: "recurso-sintetico"),
            Log(12, ScenarioNow.AddMinutes(-1), resource: "recurso-sintetico"),
            Log(13, ScenarioNow, resource: "recurso-sintetico"));
        using var administrator = AuthenticatedClient(factory, NivelUsuario.Administrador);

        using var firstResponse = await administrator.GetAsync(
            "/api/Auditoria/logs?Recurso=recurso-sintetico&pagina=1&tamanhoPagina=2");
        using var firstDocument = JsonDocument.Parse(await firstResponse.Content.ReadAsStringAsync());
        var firstPage = firstDocument.RootElement;

        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);
        Assert.Equal(FirstAuditPageIds, ReadIds(firstPage));
        Assert.Equal(3, firstPage.GetProperty("totalItens").GetInt32());
        Assert.Equal(2, firstPage.GetProperty("totalPaginas").GetInt32());
        Assert.Equal(2, firstPage.GetProperty("tamanhoPagina").GetInt32());
        var item = firstPage.GetProperty("itens")[0];
        Assert.Equal(
            AuditProjectionProperties,
            item.EnumerateObject().Select(property => property.Name).Order(StringComparer.Ordinal).ToArray());
        Assert.Equal("AtividadeNormal", item.GetProperty("categoriaDeteccao").GetString());
        Assert.Equal(JsonValueKind.Null, item.GetProperty("codigoRegraDeteccao").ValueKind);
        var serialized = firstPage.GetRawText();
        Assert.DoesNotContain("192.0.2.44", serialized, StringComparison.Ordinal);
        Assert.DoesNotContain("AUDIT-DETAIL-CANARY", serialized, StringComparison.Ordinal);
        Assert.DoesNotContain("AUDIT-REQUEST-CANARY", serialized, StringComparison.Ordinal);
        Assert.DoesNotContain("integration@example.test", serialized, StringComparison.Ordinal);

        using var secondResponse = await administrator.GetAsync(
            "/api/Auditoria/logs?Recurso=recurso-sintetico&pagina=2&tamanhoPagina=2");
        using var secondDocument = JsonDocument.Parse(await secondResponse.Content.ReadAsStringAsync());
        Assert.Equal(SecondAuditPageIds, ReadIds(secondDocument.RootElement));

        using var mentor = AuthenticatedClient(factory, NivelUsuario.Mentor);
        using var denied = await mentor.GetAsync(
            "/api/Auditoria/logs?Recurso=recurso-sintetico&pagina=2&tamanhoPagina=2");
        Assert.Equal(HttpStatusCode.Forbidden, denied.StatusCode);
        using var deniedReport = await mentor.GetAsync("/api/Auditoria/relatorio");
        using var deniedExport = await mentor.GetAsync("/api/Auditoria/exportar");
        Assert.Equal(HttpStatusCode.Forbidden, deniedReport.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, deniedExport.StatusCode);
    }

    [Theory]
    [InlineData("pagina=0")]
    [InlineData("pagina=abc")]
    [InlineData("tamanhoPagina=0")]
    [InlineData("tamanhoPagina=101")]
    [InlineData("pagina=2147483647&tamanhoPagina=100")]
    public async Task InvalidAuditPageParametersReturnPaginationInvalid(string query)
    {
        await using var factory = await CreateFactoryAsync();
        using var administrator = AuthenticatedClient(factory, NivelUsuario.Administrador);

        using var response = await administrator.GetAsync($"/api/Auditoria/logs?{query}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("pagination_invalid", document.RootElement.GetProperty("code").GetString());
    }

    [Fact]
    public async Task AuditReportAppliesFiltersAndOmitsPersonalAndRawContextFields()
    {
        await using var factory = await CreateFactoryAsync(
            Log(21, ScenarioNow.AddHours(-2), resource: "incluído", suspected: true),
            Log(22, ScenarioNow.AddMinutes(-30), resource: "incluído", risk: NivelRiscoAuditoria.Critico),
            Log(23, ScenarioNow.AddMinutes(-10), resource: "fora-do-recurso"));
        using var administrator = AuthenticatedClient(factory, NivelUsuario.Administrador);

        using var response = await administrator.GetAsync(
            "/api/Auditoria/relatorio?dataInicio=2026-11-23T13:00:00Z&dataFim=2026-11-23T15:00:00Z&Recurso=incluído");
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var report = document.RootElement;

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(2, report.GetProperty("totalLogs").GetInt32());
        Assert.Equal(1, report.GetProperty("logsSuspeitos").GetInt32());
        Assert.Equal(1, report.GetProperty("logsCriticos").GetInt32());
        Assert.Single(report.GetProperty("ultimosLogsSuspeitos").EnumerateArray());
        Assert.False(report.TryGetProperty("logsPorIP", out _));
        Assert.False(report.TryGetProperty("logsPorUsuario", out _));
        Assert.False(report.TryGetProperty("ipsSuspeitos", out _));
        Assert.False(report.TryGetProperty("usuariosComMaisAcessos", out _));
        Assert.DoesNotContain("192.0.2.44", report.GetRawText(), StringComparison.Ordinal);
        Assert.DoesNotContain("integration@example.test", report.GetRawText(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task EmptyAuditExportReturnsOnlyHeaderAndNonEmptyExportHasApprovedFields()
    {
        await using var factory = await CreateFactoryAsync(
            Log(31, ScenarioNow, resource: "recurso," + " com aspas \"duplas\""),
            Log(32, ScenarioNow, resource: "=SUM(1,1)"),
            LogWithDetectionRule(33, ScenarioNow, "recurso-regra-sintetica"));
        using var administrator = AuthenticatedClient(factory, NivelUsuario.Administrador);

        using var response = await administrator.GetAsync("/api/Auditoria/exportar?Recurso=sem-resultados");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);
        var emptyCsv = await response.Content.ReadAsStringAsync();
        Assert.Single(emptyCsv.Split("\r\n", StringSplitOptions.RemoveEmptyEntries));
        Assert.Contains("codigoEvento", emptyCsv, StringComparison.Ordinal);
        Assert.Contains("codigoRegraDeteccao", emptyCsv, StringComparison.Ordinal);
        Assert.Contains("revisaoClassificacao", emptyCsv, StringComparison.Ordinal);

        using var populatedResponse = await administrator.GetAsync("/api/Auditoria/exportar?Recurso=recurso");
        Assert.Equal(HttpStatusCode.OK, populatedResponse.StatusCode);
        var populatedCsv = await populatedResponse.Content.ReadAsStringAsync();
        Assert.Contains("recurso, com aspas \"\"duplas\"\"", populatedCsv, StringComparison.Ordinal);
        Assert.Contains("falhas-login-conta-15min", populatedCsv, StringComparison.Ordinal);
        Assert.Contains(",1,5,0", populatedCsv, StringComparison.Ordinal);
        Assert.DoesNotContain("192.0.2.44", populatedCsv, StringComparison.Ordinal);
        Assert.DoesNotContain("AUDIT-DETAIL-CANARY", populatedCsv, StringComparison.Ordinal);
        Assert.DoesNotContain("AUDIT-REQUEST-CANARY", populatedCsv, StringComparison.Ordinal);
        Assert.DoesNotContain("integration@example.test", populatedCsv, StringComparison.Ordinal);

        using var formulaResponse = await administrator.GetAsync("/api/Auditoria/exportar?Recurso=SUM");
        var formulaCsv = await formulaResponse.Content.ReadAsStringAsync();
        Assert.Contains("'=SUM(1,1)", formulaCsv, StringComparison.Ordinal);
    }

    [Fact]
    public async Task AuditExportRejectsRecorteAboveFiveThousandWithoutReturningPartialCsv()
    {
        await using var factory = await CreateFactoryAsync();
        await InsertSyntheticLogsAsync(factory, 5001);
        using var administrator = AuthenticatedClient(factory, NivelUsuario.Administrador);

        using var response = await administrator.GetAsync("/api/Auditoria/exportar");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("audit_export_limit_exceeded", document.RootElement.GetProperty("code").GetString());
        Assert.Contains("filtros", document.RootElement.GetProperty("detail").GetString(), StringComparison.OrdinalIgnoreCase);
        Assert.NotEqual("text/csv", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task AuditQueryAndReportShareSixtyPerMinutePerAdministrator()
    {
        await using var factory = await CreateFactoryAsync();
        using var administrator = AuthenticatedClient(factory, NivelUsuario.Administrador);

        for (var request = 0; request < 59; request++)
        {
            using var response = await administrator.GetAsync("/api/Auditoria/logs");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        using var admittedReport = await administrator.GetAsync("/api/Auditoria/relatorio");
        Assert.Equal(HttpStatusCode.OK, admittedReport.StatusCode);
        using var limitedQuery = await administrator.GetAsync("/api/Auditoria/logs");

        Assert.Equal(HttpStatusCode.TooManyRequests, limitedQuery.StatusCode);
        Assert.True(limitedQuery.Headers.RetryAfter?.Delta > TimeSpan.Zero);
        using var problem = JsonDocument.Parse(await limitedQuery.Content.ReadAsStringAsync());
        Assert.Equal("admission_rate_limited", problem.RootElement.GetProperty("code").GetString());
    }

    [Fact]
    public async Task AuditExportAllowsFiveAndRejectsTheSixthPerAdministratorPerHour()
    {
        await using var factory = await CreateFactoryAsync();
        using var administrator = AuthenticatedClient(factory, NivelUsuario.Administrador);

        for (var request = 0; request < 5; request++)
        {
            using var admitted = await administrator.GetAsync("/api/Auditoria/exportar");
            Assert.Equal(HttpStatusCode.OK, admitted.StatusCode);
        }

        using var limited = await administrator.GetAsync("/api/Auditoria/exportar");

        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
        using var problem = JsonDocument.Parse(await limited.Content.ReadAsStringAsync());
        Assert.Equal("admission_rate_limited", problem.RootElement.GetProperty("code").GetString());
    }

    [Fact]
    public async Task AuditQueryReportAndExportFailClosedWhenSharedLimiterIsUnavailable()
    {
        await using var factory = await CreateFactoryAsync();
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await context.Database.ExecuteSqlRawAsync("""
                DELETE FROM "AuthenticationProtectionCapacity"
                WHERE "Scope" IN ('audit:query:administrator', 'audit:export:administrator')
                """);
        }

        using var administrator = AuthenticatedClient(factory, NivelUsuario.Administrador);
        foreach (var path in new[] { "/api/Auditoria/logs", "/api/Auditoria/relatorio", "/api/Auditoria/exportar" })
        {
            using var response = await administrator.GetAsync(path);
            Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
            using var problem = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            Assert.Equal("service_unavailable", problem.RootElement.GetProperty("code").GetString());
        }
    }

    private async Task<IntegrationWebApplicationFactory> CreateFactoryAsync(params LogAuditoria[] logs)
    {
        var factory = new IntegrationWebApplicationFactory(database);
        await factory.RecreateDatabaseAsync();
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        context.Usuarios.Add(JwtSessionVersionTests.CreateUser(userLevel: NivelUsuario.Administrador));
        context.LogsAuditoria.AddRange(logs);
        await context.SaveChangesAsync();
        return factory;
    }

    private static LogAuditoria Log(
        int id,
        DateTimeOffset createdAt,
        string resource,
        bool suspected = false,
        NivelRiscoAuditoria risk = NivelRiscoAuditoria.Baixo) => new()
    {
        Id = id,
        DataHora = createdAt.UtcDateTime,
        Acao = "ação sintética",
        Recurso = resource,
        Detalhes = "AUDIT-DETAIL-CANARY",
        EnderecoIP = "192.0.2.44",
        UserAgent = "AUDIT-USER-AGENT-CANARY",
        TipoAcao = TipoAcaoAuditoria.AcessoAdministrativo,
        NivelRisco = risk,
        Suspeita = suspected,
        MotivoSuspeita = suspected ? "regra sintética" : null,
        UsuarioId = 42,
        DadosRequisicao = "AUDIT-REQUEST-CANARY",
        DadosResposta = "AUDIT-RESPONSE-CANARY",
        CodigoEvento = CodigoEventoAuditoria.EmissaoNotificacao,
        OrigemConfiavel = OrigemConfiavelAuditoria.UsuarioAutenticado,
        ReferenciaAtor = "usuario:42",
        Resultado = ResultadoOperacaoAuditoria.Sucesso,
        CategoriaRegistro = CategoriaRegistroAuditoria.TrilhaObrigatoria,
        CorrelationId = $"audit-export-{id}",
        ExpiraEmUtc = ScenarioNow.AddDays(365)
    };

    private static LogAuditoria LogWithDetectionRule(int id, DateTimeOffset createdAt, string resource)
    {
        var log = Log(id, createdAt, resource, suspected: true);
        log.CategoriaDeteccao = AuditDetectionCategory.AtividadeSuspeita;
        log.CodigoRegraDeteccao = "falhas-login-conta-15min";
        log.VersaoRegraDeteccao = 1;
        log.QuantidadeObservadaDeteccao = 5;
        return log;
    }

    private static async Task InsertSyntheticLogsAsync(IntegrationWebApplicationFactory factory, int count)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO "LogsAuditoria"
                ("DataHora", "Acao", "Recurso", "Detalhes", "EnderecoIP", "UserAgent", "TipoAcao", "NivelRisco",
                 "Suspeita", "CodigoEvento", "OrigemConfiavel", "ReferenciaAtor", "Resultado", "CategoriaRegistro",
                 "CorrelationId", "ExpiraEmUtc")
            SELECT TIMESTAMPTZ '2026-11-23 15:00:00+00' - make_interval(secs => n),
                   'ação sintética', 'recurso-' || n, 'AUDIT-DETAIL-CANARY', '192.0.2.44', 'AUDIT-USER-AGENT-CANARY',
                   0, 0, FALSE, 'EmissaoNotificacao', 'SemAtorValido', NULL, 'Sucesso', 'TrilhaObrigatoria',
                   'audit-export-' || n, TIMESTAMPTZ '2027-11-23 15:00:00+00'
            FROM generate_series(1, {count}) AS n
            """);
    }

    private static HttpClient AuthenticatedClient(IntegrationWebApplicationFactory factory, NivelUsuario role)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer", JwtSessionVersionTests.CreateToken(42, "3", "false", role));
        return client;
    }

    private static int[] ReadIds(JsonElement page) => page.GetProperty("itens")
        .EnumerateArray()
        .Select(log => log.GetProperty("id").GetInt32())
        .ToArray();
}
