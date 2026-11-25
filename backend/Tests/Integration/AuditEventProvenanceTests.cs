using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.DTOs.Auditoria;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Logging.Abstractions;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class AuditEventProvenanceTests(PostgreSqlContainerFixture database)
{
    private const string LastMigrationBeforeProvenance = "20261117164000_CurrentLotInventoryLink";

    [Fact]
    public async Task MigrationBackfillsLegacyEventsWithExplicitProvenanceAndMinimizedPayloads()
    {
        await database.RecreateEmptyDatabaseAsync();
        await using var context = CreateContext();
        await context.GetService<Microsoft.EntityFrameworkCore.Migrations.IMigrator>()
            .MigrateAsync(LastMigrationBeforeProvenance);

        var legacyInstant = new DateTime(2026, 10, 1, 12, 0, 0, DateTimeKind.Utc);
        await context.Database.ExecuteSqlInterpolatedAsync($$"""
            INSERT INTO "LogsAuditoria"
                ("DataHora", "Acao", "Recurso", "EnderecoIP", "TipoAcao", "NivelRisco", "Suspeita",
                 "DadosRequisicao", "DadosResposta", "UserAgent", "TempoSessao", "TentativasAcesso")
            VALUES
                ({{legacyInstant}}, 'legacy action', 'legacy resource', '203.0.113.7', 0, 0, false,
                 '{"password":"CANARY_PASSWORD"}', '{"token":"CANARY_TOKEN"}', 'CANARY_AGENT', INTERVAL '4 minutes', 3)
            """);

        await context.Database.MigrateAsync();

        var log = await context.LogsAuditoria.SingleAsync();
        Assert.Equal(CodigoEventoAuditoria.LegadoNaoClassificado, log.CodigoEvento);
        Assert.Equal(OrigemConfiavelAuditoria.SemAtorValido, log.OrigemConfiavel);
        Assert.Null(log.ReferenciaAtor);
        Assert.Equal(ResultadoOperacaoAuditoria.Indeterminado, log.Resultado);
        Assert.Equal(CategoriaRegistroAuditoria.DiagnosticoOperacional, log.CategoriaRegistro);
        Assert.Equal("legacy-1", log.CorrelationId);
        Assert.Equal(new DateTimeOffset(legacyInstant.AddDays(30)), log.ExpiraEmUtc);
        Assert.Null(log.DadosRequisicao);
        Assert.Null(log.DadosResposta);
        Assert.Null(log.UserAgent);
        Assert.Null(log.TempoSessao);
        Assert.Null(log.TentativasAcesso);
        Assert.Equal("203.0.113.7", log.EnderecoIP);
        Assert.Equal(1, await context.LogsAuditoria.CountAsync());
    }

    [Fact]
    public async Task MandatoryAuditEventAndDomainEffectCommitInTheSameTransaction()
    {
        await RecreateAndMigrateAsync();
        await using var context = CreateContext();
        var unitOfWork = new UnitOfWork(context);
        var service = CreateService(
            unitOfWork,
            new AdjustableTimeProvider(new DateTimeOffset(2026, 11, 19, 12, 0, 0, TimeSpan.Zero)),
            context);
        await using var transaction = await unitOfWork.BeginTransactionAsync();

        await service.RegistrarEventoObrigatorioAsync(new CreateLogAuditoriaDTO
        {
            CodigoEvento = CodigoEventoAuditoria.EmissaoNotificacao,
            OrigemConfiavel = OrigemConfiavelAuditoria.ProcessoAutorizado,
            IdentidadeProcesso = "notification-worker",
            ReferenciaRecurso = "notification-21",
            Resultado = ResultadoOperacaoAuditoria.Sucesso,
            CorrelationId = "trace-notification-21"
        });
        context.Notificacoes.Add(new Notificacao
        {
            Titulo = "synthetic notification",
            Mensagem = "synthetic message",
            Tipo = TipoNotificacao.Sistema
        });

        Assert.Equal(0, await context.LogsAuditoria.CountAsync());
        Assert.Equal(0, await context.Notificacoes.CountAsync());
        await unitOfWork.CommitAsync();
        await transaction.CommitAsync();

        Assert.Equal(1, await context.LogsAuditoria.CountAsync());
        Assert.Equal(1, await context.Notificacoes.CountAsync());
    }

    [Fact]
    public async Task MandatoryAuditWriteFailureRollsBackTheDomainEffect()
    {
        await RecreateAndMigrateAsync();
        await using (var context = CreateContext())
        {
            var unitOfWork = new UnitOfWork(context);
            var service = CreateService(unitOfWork, TimeProvider.System, context);
            await using var transaction = await unitOfWork.BeginTransactionAsync();

            await service.RegistrarEventoObrigatorioAsync(new CreateLogAuditoriaDTO
            {
                CodigoEvento = CodigoEventoAuditoria.EmissaoNotificacao,
                OrigemConfiavel = OrigemConfiavelAuditoria.ProcessoAutorizado,
                IdentidadeProcesso = "notification-worker",
                Resultado = ResultadoOperacaoAuditoria.Sucesso,
                CorrelationId = "trace-rollback"
            });
            context.ChangeTracker.Entries<LogAuditoria>().Single().Entity.ReferenciaAtor = "invalid-origin-reference";
            context.Notificacoes.Add(new Notificacao
            {
                Titulo = "synthetic notification",
                Mensagem = "synthetic message",
                Tipo = TipoNotificacao.Sistema
            });

            await Assert.ThrowsAsync<DbUpdateException>(() => unitOfWork.CommitAsync());
            await transaction.RollbackAsync();
        }

        await using var verificationContext = CreateContext();
        Assert.Equal(0, await verificationContext.LogsAuditoria.CountAsync());
        Assert.Equal(0, await verificationContext.Notificacoes.CountAsync());
    }

    [Fact]
    public async Task RetentionPurgesDiagnosticsAtThirtyDaysAndMandatoryEventsAtOneYear()
    {
        await RecreateAndMigrateAsync();
        await using var context = CreateContext();
        var clock = new AdjustableTimeProvider(new DateTimeOffset(2026, 11, 19, 12, 0, 0, TimeSpan.Zero));
        var unitOfWork = new UnitOfWork(context);
        var service = CreateService(unitOfWork, clock, context);

        await service.RegistrarEventoObrigatorioAsync(new CreateLogAuditoriaDTO
        {
            CodigoEvento = CodigoEventoAuditoria.EmissaoNotificacao,
            OrigemConfiavel = OrigemConfiavelAuditoria.ProcessoAutorizado,
            IdentidadeProcesso = "notification-worker",
            Resultado = ResultadoOperacaoAuditoria.Sucesso,
            CorrelationId = "trace-required-expiry"
        });
        await service.RegistrarDiagnosticoAsync(new CreateLogAuditoriaDTO
        {
            CodigoEvento = CodigoEventoAuditoria.FalhaOperacao,
            OrigemConfiavel = OrigemConfiavelAuditoria.SemAtorValido,
            Resultado = ResultadoOperacaoAuditoria.Falha,
            CorrelationId = "trace-diagnostic-expiry"
        });

        clock.Advance(TimeSpan.FromDays(30) - TimeSpan.FromTicks(1));
        Assert.Equal(0, await service.ExpurgarEventosExpiradosAsync());
        clock.Advance(TimeSpan.FromTicks(1));
        Assert.Equal(1, await service.ExpurgarEventosExpiradosAsync());
        Assert.Equal(CategoriaRegistroAuditoria.TrilhaObrigatoria,
            (await context.LogsAuditoria.SingleAsync()).CategoriaRegistro);

        clock.Advance(TimeSpan.FromDays(335));
        Assert.Equal(1, await service.ExpurgarEventosExpiradosAsync());
        Assert.Equal(0, await context.LogsAuditoria.CountAsync());
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

    private static AuditoriaService CreateService(
        IUnitOfWork unitOfWork,
        TimeProvider timeProvider,
        AppDbContext context) => new(
        unitOfWork,
        Moq.Mock.Of<AutoMapper.IMapper>(),
        NullLogger<AuditoriaService>.Instance,
        timeProvider,
        context);

    private sealed class AdjustableTimeProvider(DateTimeOffset now) : TimeProvider
    {
        private DateTimeOffset _now = now;

        public override DateTimeOffset GetUtcNow() => _now;

        public void Advance(TimeSpan value) => _now += value;
    }
}
