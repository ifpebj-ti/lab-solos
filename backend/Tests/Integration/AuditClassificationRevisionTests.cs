using System.Net;
using System.Globalization;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class AuditClassificationRevisionTests(PostgreSqlContainerFixture database)
{
    private static readonly DateTimeOffset ScenarioNow =
        new(2026, 11, 23, 15, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task AdministratorReclassificationPreservesEventAndRecordsRevision()
    {
        var (factory, scenario, logId) = await CreateScenarioAsync();
        await using (factory)
        {
            using var administrator = CreateAdministrator(factory, scenario.AdministratorId);

            using var response = await MarkAsSuspiciousAsync(
                administrator,
                logId,
                expectedRevision: 0,
                justification: "Revisão manual com evidência sintética.");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            using var logsResponse = await administrator.GetAsync(
                $"/api/Auditoria/logs?Recurso=recurso-sintetico&UsuarioId={scenario.AdministratorId}");
            Assert.Equal(HttpStatusCode.OK, logsResponse.StatusCode);
            using (var logsDocument = JsonDocument.Parse(await logsResponse.Content.ReadAsStringAsync()))
            {
                var listedLog = Assert.Single(logsDocument.RootElement.GetProperty("itens").EnumerateArray().ToArray());
                Assert.Equal(1, listedLog.GetProperty("revisaoClassificacao").GetInt32());
                var listedRevision = Assert.Single(
                    listedLog.GetProperty("historicoClassificacao").EnumerateArray().ToArray());
                Assert.Equal("RevisaoManual", listedRevision.GetProperty("origem").GetString());
                Assert.Equal(scenario.AdministratorId, listedRevision.GetProperty("autorUsuarioId").GetInt32());
                Assert.Equal("Revisão manual com evidência sintética.", listedRevision.GetProperty("justificativa").GetString());
            }

            await using var connection = new NpgsqlConnection(database.ConnectionString);
            await connection.OpenAsync();
            await using var command = connection.CreateCommand();
            command.CommandText = """
                SELECT log."Suspeita", log."RevisaoClassificacao", log."MotivoSuspeita",
                       log."Acao", log."Recurso", revision."NumeroRevisao",
                       revision."SuspeitaAnterior", revision."SuspeitaResultante",
                       revision."Justificativa", revision."AutorUsuarioId",
                       revision."CriadaEmUtc", revision."Origem"
                FROM "LogsAuditoria" AS log
                JOIN "AuditClassificationRevisions" AS revision ON revision."LogAuditoriaId" = log."Id"
                WHERE log."Id" = @logId
                """;
            command.Parameters.AddWithValue("logId", logId);
            await using var reader = await command.ExecuteReaderAsync();

            Assert.True(await reader.ReadAsync());
            Assert.True(reader.GetBoolean(0));
            Assert.Equal(1, reader.GetInt32(1));
            Assert.Equal("Revisão manual com evidência sintética.", reader.GetString(2));
            Assert.Equal("evento-original", reader.GetString(3));
            Assert.Equal("recurso-sintetico", reader.GetString(4));
            Assert.Equal(1, reader.GetInt32(5));
            Assert.False(reader.GetBoolean(6));
            Assert.True(reader.GetBoolean(7));
            Assert.Equal("Revisão manual com evidência sintética.", reader.GetString(8));
            Assert.Equal(scenario.AdministratorId, reader.GetInt32(9));
            Assert.Equal(ScenarioNow, reader.GetFieldValue<DateTimeOffset>(10));
            Assert.Equal("RevisaoManual", reader.GetString(11));
            Assert.False(await reader.ReadAsync());
        }
    }

    [Fact]
    public async Task StaleReclassificationConflictsWithoutAppendingHistory()
    {
        var (factory, scenario, logId) = await CreateScenarioAsync();
        await using (factory)
        {
            using var administrator = CreateAdministrator(factory, scenario.AdministratorId);
            using var first = await MarkAsSuspiciousAsync(administrator, logId, 0, "Primeira revisão.");
            using var stale = await MarkAsSuspiciousAsync(administrator, logId, 0, "Revisão obsoleta.");

            Assert.Equal(HttpStatusCode.OK, first.StatusCode);
            Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
            Assert.Equal(1, await CountRevisionsAsync(logId));
        }
    }

    [Fact]
    public async Task ConcurrentReclassificationsWriteOnlyOneRevision()
    {
        var (factory, scenario, logId) = await CreateScenarioAsync();
        await using (factory)
        {
            using var administrator = CreateAdministrator(factory, scenario.AdministratorId);

            var responses = await Task.WhenAll(
                MarkAsSuspiciousAsync(administrator, logId, 0, "Revisão concorrente A."),
                MarkAsSuspiciousAsync(administrator, logId, 0, "Revisão concorrente B."));
            using var first = responses[0];
            using var second = responses[1];

            Assert.Single(responses, response => response.StatusCode == HttpStatusCode.OK);
            Assert.Single(responses, response => response.StatusCode == HttpStatusCode.Conflict);
            Assert.Equal(1, await CountRevisionsAsync(logId));
        }
    }

    [Fact]
    public async Task ClassificationHistoryMigrationMarksObservedLegacyValueWithoutInventingAuthor()
    {
        await database.RecreateEmptyDatabaseAsync();
        await using var context = CreateContext();
        await context.GetService<Microsoft.EntityFrameworkCore.Migrations.IMigrator>()
            .MigrateAsync("20261123203026_NotificationMutation");

        var observedAt = new DateTime(2026, 10, 1, 12, 0, 0, DateTimeKind.Utc);
        await InsertLegacyLogAsync(context, observedAt, suspected: true, correlationId: "legacy-suspected");
        await InsertLegacyLogAsync(context, observedAt.AddMinutes(1), suspected: false, correlationId: "legacy-normal");

        await context.Database.MigrateAsync();

        await using var connection = new NpgsqlConnection(database.ConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT "SuspeitaAnterior", "SuspeitaResultante", "AutorUsuarioId", "Origem", "NumeroRevisao"
            FROM "AuditClassificationRevisions"
            ORDER BY "LogAuditoriaId"
            """;
        await using var reader = await command.ExecuteReaderAsync();

        Assert.True(await reader.ReadAsync());
        Assert.True(reader.GetBoolean(0));
        Assert.True(reader.GetBoolean(1));
        Assert.True(reader.IsDBNull(2));
        Assert.Equal("LegadoObservado", reader.GetString(3));
        Assert.Equal(0, reader.GetInt32(4));
        Assert.True(await reader.ReadAsync());
        Assert.False(reader.GetBoolean(0));
        Assert.False(reader.GetBoolean(1));
        Assert.True(reader.IsDBNull(2));
        Assert.Equal("LegadoObservado", reader.GetString(3));
        Assert.Equal(0, reader.GetInt32(4));
        Assert.False(await reader.ReadAsync());
    }

    [Fact]
    public async Task ReclassificationRequiresNonBlankJustification()
    {
        var (factory, scenario, logId) = await CreateScenarioAsync();
        await using (factory)
        {
            using var administrator = CreateAdministrator(factory, scenario.AdministratorId);
            using var response = await MarkAsSuspiciousAsync(administrator, logId, 0, "   ");

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.Equal(0, await CountRevisionsAsync(logId));
        }
    }

    [Fact]
    public async Task NonAdministratorCannotReclassifyAuditEvents()
    {
        var (factory, scenario, logId) = await CreateScenarioAsync();
        await using (factory)
        {
            using var mentor = CreateClient(factory, scenario.MentorOneId, NivelUsuario.Mentor);
            using var response = await MarkAsSuspiciousAsync(mentor, logId, 0, "Justificativa sintética.");

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            Assert.Equal(0, await CountRevisionsAsync(logId));
        }
    }

    private async Task<(IntegrationWebApplicationFactory Factory, AuthenticationProtectionScenarioData Scenario, int LogId)>
        CreateScenarioAsync()
    {
        var scenario = AuthenticationProtectionScenarioData.Create($"audit-classification-{Guid.NewGuid():N}");
        var factory = new IntegrationWebApplicationFactory(
            database,
            new IntegrationApplicationOptions { TimeProvider = new AdjustableTimeProvider(ScenarioNow) });
        await factory.RecreateDatabaseAsync();

        int logId;
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var services = scope.ServiceProvider;
            var context = services.GetRequiredService<AppDbContext>();
            await scenario.PersistAsync(context, services.GetRequiredService<IPasswordHasher<Usuario>>());
            var log = new LogAuditoria
            {
                DataHora = ScenarioNow.UtcDateTime.AddMinutes(-1),
                Acao = "evento-original",
                Recurso = "recurso-sintetico",
                EnderecoIP = "",
                TipoAcao = TipoAcaoAuditoria.AcessoAdministrativo,
                NivelRisco = NivelRiscoAuditoria.Baixo,
                Suspeita = false,
                UsuarioId = scenario.AdministratorId,
                CodigoEvento = CodigoEventoAuditoria.EmissaoNotificacao,
                OrigemConfiavel = OrigemConfiavelAuditoria.UsuarioAutenticado,
                ReferenciaAtor = $"usuario:{scenario.AdministratorId}",
                Resultado = ResultadoOperacaoAuditoria.Sucesso,
                CategoriaRegistro = CategoriaRegistroAuditoria.TrilhaObrigatoria,
                CorrelationId = $"classification-{Guid.NewGuid():N}",
                ExpiraEmUtc = ScenarioNow.AddDays(365)
            };
            context.LogsAuditoria.Add(log);
            await context.SaveChangesAsync();
            logId = log.Id;
        }

        return (factory, scenario, logId);
    }

    private AppDbContext CreateContext() => new(
        new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(database.ConnectionString)
            .Options);

    private async Task<int> CountRevisionsAsync(int logId)
    {
        await using var connection = new NpgsqlConnection(database.ConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM \"AuditClassificationRevisions\" WHERE \"LogAuditoriaId\" = @logId";
        command.Parameters.AddWithValue("logId", logId);
        return Convert.ToInt32(await command.ExecuteScalarAsync(), CultureInfo.InvariantCulture);
    }

    private static async Task InsertLegacyLogAsync(
        AppDbContext context,
        DateTime observedAt,
        bool suspected,
        string correlationId)
    {
        await context.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO "LogsAuditoria"
                ("DataHora", "Acao", "Recurso", "EnderecoIP", "TipoAcao", "NivelRisco", "Suspeita",
                 "CodigoEvento", "OrigemConfiavel", "Resultado", "CategoriaRegistro", "CorrelationId", "ExpiraEmUtc")
            VALUES
                ({observedAt}, 'legacy action', 'legacy resource', '', 0, 0, {suspected},
                 'LegadoNaoClassificado', 'SemAtorValido', 'Indeterminado', 'DiagnosticoOperacional', {correlationId},
                 {new DateTimeOffset(observedAt.AddDays(30))})
            """);
    }

    private static HttpClient CreateAdministrator(IntegrationWebApplicationFactory factory, int userId)
        => CreateClient(factory, userId, NivelUsuario.Administrador);

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

    private static async Task<HttpResponseMessage> MarkAsSuspiciousAsync(
        HttpClient client,
        int logId,
        int expectedRevision,
        string justification)
    {
        using var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/Auditoria/marcar-suspeito/{logId}")
        {
            Content = JsonContent.Create(new
            {
                revisaoEsperada = expectedRevision,
                justificativa = justification
            })
        };
        return await client.SendAsync(request);
    }

    private sealed class AdjustableTimeProvider(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }
}
