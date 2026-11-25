using AutoMapper;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.DTOs.Auditoria;
using LabSolos_Server_DotNet8.DTOs.Notificacoes;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Mappings;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class NotificationMutationAuditTests(PostgreSqlContainerFixture database)
{
    private static readonly byte[] HmacSecret = Enumerable.Range(80, 32).Select(value => (byte)value).ToArray();
    private static readonly DateTimeOffset InitialTime = new(2026, 11, 23, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task ManualAndAutomaticEmissionsAreAuditedOnceAndLogicalDeletePreservesAudience()
    {
        await ResetAndSeedAsync();
        var timeProvider = new ControlledTimeProvider(InitialTime);
        await using var services = CreateServices(timeProvider);

        var manual = await services.Service.CriarNotificacaoManualAsync(
            CreatePersonalNotification(43, "Aviso manual"),
            administradorId: 42);
        await using var concurrentService = CreateServices(timeProvider);
        await Task.WhenAll(
            services.Service.CriarNotificacaoEstoqueBaixoAsync(901, "Reagente", 2, 5),
            concurrentService.Service.CriarNotificacaoEstoqueBaixoAsync(901, "Reagente", 2, 5));

        var beforeDelete = await ReadStateAsync();
        var manualEvent = Assert.Single(beforeDelete.Audits, item =>
            item.CodigoEvento == CodigoEventoAuditoria.EmissaoNotificacao && item.UsuarioId == 42);
        Assert.Equal(OrigemConfiavelAuditoria.UsuarioAutenticado, manualEvent.OrigemConfiavel);
        Assert.Equal("usuario:42", manualEvent.ReferenciaAtor);
        Assert.Equal($"notificacao:{manual.Id}", manualEvent.Recurso);
        var automaticEvent = Assert.Single(beforeDelete.Audits, item =>
            item.CodigoEvento == CodigoEventoAuditoria.EmissaoNotificacao
            && item.OrigemConfiavel == OrigemConfiavelAuditoria.ProcessoAutorizado);
        Assert.Null(automaticEvent.UsuarioId);
        Assert.Equal("processo:lab-solos-notification-service", automaticEvent.ReferenciaAtor);
        Assert.Equal(2, beforeDelete.Notifications.Length);
        Assert.Equal(1, beforeDelete.ManualQuotaCount);
        Assert.Equal(1, beforeDelete.AutomaticQuotaCount);

        Assert.True(await services.Service.ExcluirNotificacaoAsync(manual.Id, 42));
        Assert.True(await services.Service.ExcluirNotificacaoAsync(manual.Id, 42));

        var afterDelete = await ReadStateAsync();
        Assert.Equal(2, afterDelete.Notifications.Length);
        Assert.NotNull(afterDelete.Notifications.Single(item => item.Id == manual.Id).ExcluidaEmUtc);
        Assert.Contains(afterDelete.Reads, read => read.NotificacaoId == manual.Id && read.UsuarioId == 43);
        Assert.DoesNotContain(afterDelete.VisibleForRecipient, item => item.Id == manual.Id);
        Assert.Equal(0, afterDelete.UnreadForRecipient);
        Assert.Single(afterDelete.Audits, item => item.CodigoEvento == CodigoEventoAuditoria.ExclusaoNotificacao);
        Assert.Equal(3, afterDelete.Audits.Length);
    }

    [Fact]
    public async Task FailedMandatoryAuditRollsBackNotificationAndAcceptedQuotaCount()
    {
        await ResetAndSeedAsync();
        var timeProvider = new ControlledTimeProvider(InitialTime);
        using var keyFactory = new ThrottleKeyFactory(HmacSecret, "IntegrationTesting");
        await using var context = CreateContext();
        var unitOfWork = new UnitOfWork(context);
        var mapper = CreateMapper();
        var audit = new Mock<IAuditoriaService>();
        audit.Setup(service => service.RegistrarEventoObrigatorioAsync(It.IsAny<CreateLogAuditoriaDTO>()))
            .ThrowsAsync(new InvalidOperationException("Trilha obrigatória indisponível."));
        var service = new NotificacaoService(
            unitOfWork,
            mapper,
            NullLogger<NotificacaoService>.Instance,
            timeProvider,
            audit.Object,
            CreateQuotaPolicy(context, timeProvider, keyFactory));

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CriarNotificacaoManualAsync(CreatePersonalNotification(43, "Não persistir"), 42));

        var persisted = await ReadStateAsync();
        Assert.Empty(persisted.Notifications);
        Assert.Empty(persisted.Audits);
        Assert.Equal(0, persisted.ManualQuotaCount);
    }

    [Fact]
    public async Task FailedDeletionAuditPreservesNotificationAndRecipientReadState()
    {
        await ResetAndSeedAsync();
        var timeProvider = new ControlledTimeProvider(InitialTime);
        int notificationId;
        await using (var creator = CreateServices(timeProvider))
        {
            var notification = await creator.Service.CriarNotificacaoManualAsync(
                CreatePersonalNotification(43, "Preservar em falha de exclusão"),
                administradorId: 42);
            notificationId = notification.Id;
        }

        using var keyFactory = new ThrottleKeyFactory(HmacSecret, "IntegrationTesting");
        await using var context = CreateContext();
        var audit = new Mock<IAuditoriaService>();
        audit.Setup(service => service.RegistrarEventoObrigatorioAsync(It.IsAny<CreateLogAuditoriaDTO>()))
            .ThrowsAsync(new InvalidOperationException("Trilha obrigatória indisponível."));
        var service = new NotificacaoService(
            new UnitOfWork(context),
            CreateMapper(),
            NullLogger<NotificacaoService>.Instance,
            timeProvider,
            audit.Object,
            CreateQuotaPolicy(context, timeProvider, keyFactory));

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ExcluirNotificacaoAsync(notificationId, 42));

        var persisted = await ReadStateAsync();
        Assert.Null(Assert.Single(persisted.Notifications).ExcluidaEmUtc);
        Assert.Contains(persisted.Reads, read => read.NotificacaoId == notificationId && read.UsuarioId == 43);
        Assert.DoesNotContain(persisted.Audits, item => item.CodigoEvento == CodigoEventoAuditoria.ExclusaoNotificacao);
        Assert.Contains(persisted.VisibleForRecipient, item => item.Id == notificationId);
        Assert.Equal(1, persisted.UnreadForRecipient);
    }

    [Fact]
    public async Task AutomaticEmissionWithoutEligibleAudienceHasNoEffectAuditOrQuotaCharge()
    {
        await database.RecreateEmptyDatabaseAsync();
        await using (var seedContext = CreateContext())
        {
            await seedContext.Database.MigrateAsync();
            seedContext.Usuarios.Add(CreateUser(43, "recipient@example.test", NivelUsuario.Comum, TipoUsuario.Comum));
            await seedContext.SaveChangesAsync();
        }

        await using var services = CreateServices(new ControlledTimeProvider(InitialTime));
        var result = await services.Service.CriarNotificacaoAsync(new CreateNotificacaoDTO
        {
            Titulo = "Sem destinatário",
            Mensagem = "Não há contas administrativas habilitadas.",
            Tipo = TipoNotificacao.EstoqueBaixo,
            EhGlobal = true,
            NivelUsuarioDestino = NivelUsuario.Administrador,
            ReferenciaId = 902,
            TipoReferencia = "Produto"
        });

        Assert.Null(result);
        var persisted = await ReadStateAsync();
        Assert.Empty(persisted.Notifications);
        Assert.Empty(persisted.Audits);
        Assert.Equal(0, persisted.AutomaticQuotaCount);
    }

    private async Task ResetAndSeedAsync()
    {
        await database.RecreateEmptyDatabaseAsync();
        await using var context = CreateContext();
        await context.Database.MigrateAsync();
        context.Usuarios.AddRange(
            CreateUser(42, "admin@example.test", NivelUsuario.Administrador, TipoUsuario.Administrador),
            CreateUser(43, "recipient@example.test", NivelUsuario.Comum, TipoUsuario.Comum));
        await context.SaveChangesAsync();
    }

    private CreatedServices CreateServices(TimeProvider timeProvider)
    {
        var context = CreateContext();
        var keyFactory = new ThrottleKeyFactory(HmacSecret, "IntegrationTesting");
        var unitOfWork = new UnitOfWork(context);
        var mapper = CreateMapper();
        var audit = new AuditoriaService(
            unitOfWork,
            mapper,
            NullLogger<AuditoriaService>.Instance,
            timeProvider,
            context);
        var quota = CreateQuotaPolicy(context, timeProvider, keyFactory);
        return new CreatedServices(
            context,
            keyFactory,
            new NotificacaoService(
                unitOfWork,
                mapper,
                NullLogger<NotificacaoService>.Instance,
                timeProvider,
                audit,
                quota));
    }

    private async Task<PersistedState> ReadStateAsync()
    {
        await using var context = CreateContext();
        using var keyFactory = new ThrottleKeyFactory(HmacSecret, "IntegrationTesting");
        var manualRule = NotificationQuotaPolicy.CreateManualRule(42, keyFactory);
        var automaticRule = NotificationQuotaPolicy.CreateAutomaticRule(
            "lab-solos-notification-service",
            keyFactory);
        var notifications = await context.Notificacoes.AsNoTracking().OrderBy(item => item.Id).ToArrayAsync();
        var audits = await context.LogsAuditoria.AsNoTracking().OrderBy(item => item.Id).ToArrayAsync();
        var reads = await context.NotificacoesLeituras.AsNoTracking().ToArrayAsync();
        var visible = await context.NotificacoesLeituras.AsNoTracking()
            .Where(read => read.UsuarioId == 43 && read.Notificacao.ExcluidaEmUtc == null)
            .Select(read => read.Notificacao)
            .ToArrayAsync();
        var unread = await context.NotificacoesLeituras.CountAsync(read =>
            read.UsuarioId == 43 && !read.Lida && read.Notificacao.ExcluidaEmUtc == null);
        var manualCount = await ReadCountAsync(context, manualRule);
        var automaticCount = await ReadCountAsync(context, automaticRule);
        return new PersistedState(notifications, audits, reads, visible, unread, manualCount, automaticCount);
    }

    private AppDbContext CreateContext() => new(
        new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(database.ConnectionString).Options);

    private static IMapper CreateMapper()
    {
        var configuration = new MapperConfiguration(options =>
        {
            options.AddProfile<NotificacaoMappingProfile>();
            options.AddProfile<AuditoriaMappingProfile>();
        }, NullLoggerFactory.Instance);
        return configuration.CreateMapper();
    }

    private static NotificationQuotaPolicy CreateQuotaPolicy(
        AppDbContext context,
        TimeProvider timeProvider,
        ThrottleKeyFactory keyFactory) => new(
        new PostgresAuthenticationThrottle(
            context,
            Options.Create(new AuthenticationProtectionOptions
            {
                MaxBucketsPerScope = 100,
                LockTimeoutSeconds = 2,
                OperationTimeoutSeconds = 5,
                CleanupBatchSize = 100
            }),
            new TimeProviderAuthenticationThrottleClock(timeProvider)),
        keyFactory);

    private static CreateNotificacaoDTO CreatePersonalNotification(int recipientId, string title) => new()
    {
        Titulo = title,
        Mensagem = "Conteúdo de teste de integração.",
        Tipo = TipoNotificacao.Sistema,
        UsuarioId = recipientId
    };

    private static Usuario CreateUser(int id, string email, NivelUsuario level, TipoUsuario type)
    {
        var fullName = $"Conta sintética {id}";
        Usuario user = type == TipoUsuario.Administrador
            ? new Administrador { NomeCompleto = fullName, Email = email, SenhaHash = "synthetic-hash" }
            : new Usuario { NomeCompleto = fullName, Email = email, SenhaHash = "synthetic-hash" };
        user.Id = id;
        user.NivelUsuario = level;
        user.TipoUsuario = type;
        user.Status = StatusUsuario.Habilitado;
        user.VersaoSessao = 3;
        return user;
    }

    private static Task<int> ReadCountAsync(AppDbContext context, AuthenticationThrottleRule rule) =>
        context.AuthenticationThrottleBuckets.AsNoTracking()
            .Where(bucket => bucket.Scope == rule.Scope && bucket.KeyHash.SequenceEqual(rule.KeyHash))
            .Select(bucket => bucket.Count)
            .SingleOrDefaultAsync();

    private sealed record PersistedState(
        Notificacao[] Notifications,
        LogAuditoria[] Audits,
        NotificacaoLeitura[] Reads,
        Notificacao[] VisibleForRecipient,
        int UnreadForRecipient,
        int ManualQuotaCount,
        int AutomaticQuotaCount);

    private sealed class CreatedServices(
        AppDbContext context,
        ThrottleKeyFactory keyFactory,
        NotificacaoService service) : IAsyncDisposable
    {
        public NotificacaoService Service { get; } = service;

        public async ValueTask DisposeAsync()
        {
            keyFactory.Dispose();
            await context.DisposeAsync();
        }
    }
}
