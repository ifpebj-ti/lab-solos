using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.DTOs.Auditoria;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Logging.Abstractions;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class AuditDetectionRuleTests(PostgreSqlContainerFixture database)
{
    private const string LastMigrationBeforeDetection = "20261123221425_EmailAddressReservation";
    private static readonly DateTimeOffset ScenarioNow =
        new(2026, 11, 23, 15, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task AccountThresholdIncludesWindowStartWinsPrecedenceAndSurvivesHumanReview()
    {
        await RecreateAndMigrateAsync();
        await using var context = CreateContext();
        var scenario = await SeedScenarioAsync(context);
        var source = "203.0.113.77";

        context.LogsAuditoria.AddRange(
            Enumerable.Range(0, 4).Select(index => CreateFailure(
                index switch
                {
                    0 => ScenarioNow.AddMinutes(-15),
                    3 => ScenarioNow,
                    _ => ScenarioNow.AddMinutes(-10d + index * 2d)
                },
                scenario.AdministratorId,
                source,
                $"boundary-account-{index}")));
        context.LogsAuditoria.AddRange(
            Enumerable.Range(0, 29).Select(index => CreateFailure(
                ScenarioNow.AddMinutes(-14 + index % 12),
                null,
                source,
                $"boundary-origin-{index}")));
        await context.SaveChangesAsync();

        var service = CreateService(context);
        await service.RegistrarLogAsync(
            AuthenticatedFailure(scenario.AdministratorId, "rule-account-precedence"),
            usuarioId: scenario.AdministratorId,
            enderecoIP: source);

        var detected = await context.LogsAuditoria.SingleAsync(log => log.CorrelationId == "rule-account-precedence");
        Assert.True(detected.Suspeita);
        Assert.Equal(AuditDetectionCategory.AtividadeSuspeita, detected.CategoriaDeteccao);
        Assert.Equal(AuditDetectionRuleCatalog.FalhasPorContaCodigo, detected.CodigoRegraDeteccao);
        Assert.Equal(AuditDetectionRuleCatalog.CurrentVersion, detected.VersaoRegraDeteccao);
        Assert.Equal(5, detected.QuantidadeObservadaDeteccao);

        var repository = new LogAuditoriaRepository(context);
        await repository.ReclassificarAsync(
            detected.Id,
            scenario.AdministratorId,
            revisaoEsperada: 0,
            suspeitaResultante: false,
            justificativa: "Revisão humana sintética.",
            criadaEmUtc: ScenarioNow.AddMinutes(1));

        context.ChangeTracker.Clear();
        var reviewed = await context.LogsAuditoria
            .Include(log => log.RevisoesClassificacao)
            .SingleAsync(log => log.Id == detected.Id);
        var projection = AuditQueryPolicy.Project(reviewed);

        Assert.False(projection.Suspeita);
        Assert.Equal(1, projection.RevisaoClassificacao);
        Assert.Single(projection.HistoricoClassificacao);
        Assert.Equal(AuditDetectionCategory.AtividadeSuspeita.ToString(), projection.CategoriaDeteccao);
        Assert.Equal(AuditDetectionRuleCatalog.FalhasPorContaCodigo, projection.CodigoRegraDeteccao);
        Assert.Equal(AuditDetectionRuleCatalog.CurrentVersion, projection.VersaoRegraDeteccao);
        Assert.Equal(5, projection.QuantidadeObservadaDeteccao);
    }

    [Fact]
    public async Task OriginThresholdStoresAppliedVersionForExplicitlyMissingActor()
    {
        await RecreateAndMigrateAsync();
        await using var context = CreateContext();
        await SeedScenarioAsync(context);
        const string source = "203.0.113.78";
        context.LogsAuditoria.AddRange(Enumerable.Range(0, 29).Select(index => CreateFailure(
            ScenarioNow.AddMinutes(-14 + index % 12),
            null,
            source,
            $"rule-origin-{index}")));
        await context.SaveChangesAsync();

        var service = CreateService(context);
        await service.RegistrarLogAsync(
            MissingActorFailure("rule-origin-threshold"),
            enderecoIP: source);

        context.ChangeTracker.Clear();
        var detected = await context.LogsAuditoria.SingleAsync(log => log.CorrelationId == "rule-origin-threshold");
        Assert.True(detected.Suspeita);
        Assert.Equal(AuditDetectionCategory.AtividadeSuspeita, detected.CategoriaDeteccao);
        Assert.Equal(AuditDetectionRuleCatalog.FalhasPorOrigemCodigo, detected.CodigoRegraDeteccao);
        Assert.Equal(AuditDetectionRuleCatalog.CurrentVersion, detected.VersaoRegraDeteccao);
        Assert.Equal(30, detected.QuantidadeObservadaDeteccao);

        var projection = AuditQueryPolicy.Project(detected);
        Assert.Equal(AuditDetectionRuleCatalog.FalhasPorOrigemCodigo, projection.CodigoRegraDeteccao);
        Assert.Equal(AuditDetectionRuleCatalog.CurrentVersion, projection.VersaoRegraDeteccao);
    }

    [Fact]
    public async Task FailureJustOutsideWindowDoesNotContributeToOriginThreshold()
    {
        await RecreateAndMigrateAsync();
        await using var context = CreateContext();
        await SeedScenarioAsync(context);
        const string source = "203.0.113.7";
        context.LogsAuditoria.AddRange(
            CreateFailure(ScenarioNow.AddMinutes(-15).AddMilliseconds(-1), null, source, "outside-window"),
            CreateFailure(ScenarioNow.AddMinutes(-14), null, source, "inside-window-1"),
            CreateFailure(ScenarioNow.AddMinutes(-7), null, source, "inside-window-2"),
            CreateFailure(ScenarioNow.AddMinutes(-1), null, source, "inside-window-3"));
        context.LogsAuditoria.AddRange(Enumerable.Range(0, 29).Select(index => CreateFailure(
            ScenarioNow.AddMinutes(-14 + index % 12),
            null,
            "203.0.113.70",
            $"near-source-{index}")));
        await context.SaveChangesAsync();

        var service = CreateService(context);
        await service.RegistrarLogAsync(
            MissingActorFailure("rule-origin-below-threshold"),
            enderecoIP: source);

        context.ChangeTracker.Clear();
        var observed = await context.LogsAuditoria.SingleAsync(log => log.CorrelationId == "rule-origin-below-threshold");
        Assert.False(observed.Suspeita);
        Assert.Equal(AuditDetectionCategory.SemAtorValido, observed.CategoriaDeteccao);
        Assert.Null(observed.CodigoRegraDeteccao);
        Assert.Null(observed.VersaoRegraDeteccao);
        Assert.Null(observed.QuantidadeObservadaDeteccao);
    }

    [Fact]
    public async Task MigrationBackfillsObservedCategoriesWithoutInventingRuleReferences()
    {
        await database.RecreateEmptyDatabaseAsync();
        await using var context = CreateContext();
        await context.GetService<Microsoft.EntityFrameworkCore.Migrations.IMigrator>()
            .MigrateAsync(LastMigrationBeforeDetection);

        await InsertLegacyFailureAsync(context, true, OrigemConfiavelAuditoria.SemAtorValido, "legacy-suspected");
        await InsertLegacyFailureAsync(context, false, OrigemConfiavelAuditoria.SemAtorValido, "legacy-no-actor");
        await InsertLegacyFailureAsync(context, false, OrigemConfiavelAuditoria.ProcessoAutorizado, "legacy-normal");
        await context.Database.MigrateAsync();

        context.ChangeTracker.Clear();
        var migrated = await context.LogsAuditoria.OrderBy(log => log.CorrelationId).ToListAsync();
        Assert.Equal(AuditDetectionCategory.SemAtorValido, migrated[0].CategoriaDeteccao);
        Assert.Equal(AuditDetectionCategory.AtividadeNormal, migrated[1].CategoriaDeteccao);
        Assert.Equal(AuditDetectionCategory.AtividadeSuspeita, migrated[2].CategoriaDeteccao);
        Assert.All(migrated, log =>
        {
            Assert.Null(log.CodigoRegraDeteccao);
            Assert.Null(log.VersaoRegraDeteccao);
            Assert.Null(log.QuantidadeObservadaDeteccao);
        });
    }

    private async Task RecreateAndMigrateAsync()
    {
        await database.RecreateEmptyDatabaseAsync();
        await using var context = CreateContext();
        await context.Database.MigrateAsync();
    }

    private AppDbContext CreateContext() => new(
        new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(database.ConnectionString)
            .Options);

    private static async Task<AuthenticationProtectionScenarioData> SeedScenarioAsync(AppDbContext context)
    {
        var scenario = AuthenticationProtectionScenarioData.Create($"audit-detection-{Guid.NewGuid():N}");
        await scenario.PersistAsync(context, new PasswordHasher<Usuario>());
        return scenario;
    }

    private static AuditoriaService CreateService(AppDbContext context) => new(
        new UnitOfWork(context),
        Moq.Mock.Of<AutoMapper.IMapper>(),
        NullLogger<AuditoriaService>.Instance,
        new AdjustableTimeProvider(ScenarioNow),
        context);

    private static LogAuditoria CreateFailure(
        DateTimeOffset at,
        int? userId,
        string source,
        string correlationId) => new()
    {
        DataHora = at.UtcDateTime,
        Acao = "falha_operacao",
        Recurso = "operacao",
        EnderecoIP = source,
        TipoAcao = TipoAcaoAuditoria.LoginFalhado,
        NivelRisco = NivelRiscoAuditoria.Medio,
        UsuarioId = userId,
        CodigoEvento = CodigoEventoAuditoria.FalhaOperacao,
        OrigemConfiavel = userId is > 0
            ? OrigemConfiavelAuditoria.UsuarioAutenticado
            : OrigemConfiavelAuditoria.SemAtorValido,
        ReferenciaAtor = userId is > 0 ? $"usuario:{userId}" : null,
        Resultado = ResultadoOperacaoAuditoria.Negado,
        CategoriaRegistro = CategoriaRegistroAuditoria.DiagnosticoOperacional,
        CorrelationId = correlationId,
        ExpiraEmUtc = ScenarioNow.AddDays(30),
        CategoriaDeteccao = userId is > 0
            ? AuditDetectionCategory.AtividadeNormal
            : AuditDetectionCategory.SemAtorValido
    };

    private static CreateLogAuditoriaDTO AuthenticatedFailure(int userId, string correlationId) => new()
    {
        CodigoEvento = CodigoEventoAuditoria.FalhaOperacao,
        OrigemConfiavel = OrigemConfiavelAuditoria.UsuarioAutenticado,
        UsuarioId = userId,
        Resultado = ResultadoOperacaoAuditoria.Negado,
        CorrelationId = correlationId,
        TipoAcaoDiagnostica = TipoAcaoAuditoria.LoginFalhado
    };

    private static CreateLogAuditoriaDTO MissingActorFailure(string correlationId) => new()
    {
        CodigoEvento = CodigoEventoAuditoria.TentativaSemIdentidadeValida,
        OrigemConfiavel = OrigemConfiavelAuditoria.SemAtorValido,
        Resultado = ResultadoOperacaoAuditoria.Negado,
        CorrelationId = correlationId,
        TipoAcaoDiagnostica = TipoAcaoAuditoria.LoginFalhado
    };

    private static Task<int> InsertLegacyFailureAsync(
        AppDbContext context,
        bool suspected,
        OrigemConfiavelAuditoria origin,
        string correlationId)
    {
        var observedAt = ScenarioNow.AddDays(-1).UtcDateTime;
        var actorReference = origin == OrigemConfiavelAuditoria.ProcessoAutorizado
            ? "processo:synthetic-worker"
            : null;
        var originName = origin.ToString();
        return context.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO "LogsAuditoria"
                ("DataHora", "Acao", "Recurso", "EnderecoIP", "TipoAcao", "NivelRisco", "Suspeita",
                 "CodigoEvento", "OrigemConfiavel", "ReferenciaAtor", "Resultado", "CategoriaRegistro",
                 "CorrelationId", "ExpiraEmUtc")
            VALUES
                ({observedAt}, 'falha_legada', 'operacao', '', 0, 0, {suspected},
                 'LegadoNaoClassificado', {originName}, {actorReference}, 'Indeterminado',
                 'DiagnosticoOperacional', {correlationId}, {new DateTimeOffset(observedAt.AddDays(30))})
            """);
    }

    private sealed class AdjustableTimeProvider(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }
}
