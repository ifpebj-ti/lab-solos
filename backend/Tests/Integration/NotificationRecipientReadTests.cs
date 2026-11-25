using AutoMapper;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.DTOs.Notificacoes;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Mappings;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Logging.Abstractions;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class NotificationRecipientReadTests(PostgreSqlContainerFixture database)
{
    private const string LastMigrationBeforeRecipientRead = "20261119061500_OperationAdmissionCapacity";

    [Fact]
    public async Task AdministratorGroupIsFrozenAndReadingIsPrivateToTheRecipient()
    {
        await RecreateAndMigrateAsync();
        await using var context = CreateContext();
        context.Usuarios.AddRange(
            CreateUser(42, NivelUsuario.Administrador, TipoUsuario.Administrador),
            CreateUser(43, NivelUsuario.Administrador, TipoUsuario.Administrador),
            CreateUser(44, NivelUsuario.Administrador, TipoUsuario.Administrador, StatusUsuario.Desabilitado),
            CreateUser(45, NivelUsuario.Mentor, TipoUsuario.Comum));
        await context.SaveChangesAsync();

        var service = CreateService(context, new ControlledTimeProvider(
            new DateTimeOffset(2026, 11, 23, 12, 0, 0, TimeSpan.Zero)));
        var notification = await service.CriarNotificacaoAsync(new CreateNotificacaoDTO
        {
            Titulo = "Aviso administrativo sintético",
            Mensagem = "Somente contas administrativas habilitadas.",
            Tipo = TipoNotificacao.EstoqueBaixo,
            EhGlobal = true,
            NivelUsuarioDestino = NivelUsuario.Administrador
        }) ?? throw new InvalidOperationException("Uma audiência administrativa habilitada deveria receber a notificação.");
        context.Usuarios.Add(CreateUser(46, NivelUsuario.Administrador, TipoUsuario.Administrador));
        await context.SaveChangesAsync();

        Assert.Equal(notification.Id, Assert.Single(await service.ObterNotificacoesUsuarioAsync(42)).Id);
        Assert.Equal(notification.Id, Assert.Single(await service.ObterNotificacoesUsuarioAsync(43)).Id);
        Assert.Empty(await service.ObterNotificacoesUsuarioAsync(44));
        Assert.Empty(await service.ObterNotificacoesUsuarioAsync(45));
        Assert.Empty(await service.ObterNotificacoesUsuarioAsync(46));
        Assert.NotNull(await service.ObterNotificacaoDestinatarioAsync(notification.Id, 42));
        Assert.Null(await service.ObterNotificacaoDestinatarioAsync(notification.Id, 45));
        Assert.Equal(1, await service.ContarNaoLidasUsuarioAsync(42));
        Assert.Equal(1, await service.ContarNaoLidasUsuarioAsync(43));

        Assert.True(await service.MarcarComoLidaComVerificacaoAsync(notification.Id, 42));

        Assert.Empty(await service.ObterNotificacoesUsuarioAsync(42, apenasNaoLidas: true));
        Assert.Equal(0, await service.ContarNaoLidasUsuarioAsync(42));
        var readForFirst = await service.ObterNotificacaoDestinatarioAsync(notification.Id, 42);
        Assert.NotNull(readForFirst);
        Assert.True(readForFirst.Lida);
        Assert.Equal(new DateTime(2026, 11, 23, 12, 0, 0, DateTimeKind.Utc), readForFirst.DataLeitura);
        Assert.Single(await service.ObterNotificacoesUsuarioAsync(43, apenasNaoLidas: true));
        Assert.Equal(1, await service.ContarNaoLidasUsuarioAsync(43));
    }

    [Fact]
    public async Task MixedBatchIsRejectedWithoutUpdatingAnyRecipient()
    {
        await RecreateAndMigrateAsync();
        await using var context = CreateContext();
        context.Usuarios.AddRange(
            CreateUser(42, NivelUsuario.Comum, TipoUsuario.Comum),
            CreateUser(43, NivelUsuario.Comum, TipoUsuario.Comum));
        await context.SaveChangesAsync();
        var service = CreateService(context, TimeProvider.System);
        var own = await service.CriarNotificacaoAsync(CreatePersonalNotification(42, "Aviso próprio"))
            ?? throw new InvalidOperationException("O destinatário habilitado deveria receber a notificação.");
        var foreign = await service.CriarNotificacaoAsync(CreatePersonalNotification(43, "Aviso de outra conta"))
            ?? throw new InvalidOperationException("O destinatário habilitado deveria receber a notificação.");

        Assert.False(await service.MarcarComoLidaComVerificacaoAsync(foreign.Id, 42));
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => service.MarcarVariasComoLidaComVerificacaoAsync([own.Id, foreign.Id], 42));

        Assert.Equal(1, await service.ContarNaoLidasUsuarioAsync(42));
        Assert.Equal(1, await service.ContarNaoLidasUsuarioAsync(43));
        Assert.Single(await service.ObterNotificacoesUsuarioAsync(42, apenasNaoLidas: true));
        Assert.Single(await service.ObterNotificacoesUsuarioAsync(43, apenasNaoLidas: true));
    }

    [Fact]
    public async Task ConcurrentAndRepeatedReadsConvergeWithoutChangingTheFirstReadTime()
    {
        await RecreateAndMigrateAsync();
        await using (var seedContext = CreateContext())
        {
            seedContext.Usuarios.Add(CreateUser(42, NivelUsuario.Comum, TipoUsuario.Comum));
            await seedContext.SaveChangesAsync();
            var notification = await CreateService(seedContext, TimeProvider.System)
                .CriarNotificacaoAsync(CreatePersonalNotification(42, "Aviso individual"));
            if (notification is null)
            {
                throw new InvalidOperationException("O destinatário habilitado deveria receber a notificação.");
            }
        }

        var firstTime = new DateTimeOffset(2026, 11, 23, 12, 0, 0, TimeSpan.Zero);
        var secondTime = firstTime.AddMinutes(5);
        bool firstRead;
        bool concurrentRead;
        using (var firstContext = CreateContext())
        using (var concurrentContext = CreateContext())
        {
            var firstService = CreateService(firstContext, new ControlledTimeProvider(firstTime));
            var concurrentService = CreateService(concurrentContext, new ControlledTimeProvider(firstTime));
            var notification = Assert.Single(await firstService.ObterNotificacoesUsuarioAsync(42));

            var results = await Task.WhenAll(
                firstService.MarcarComoLidaComVerificacaoAsync(notification.Id, 42),
                concurrentService.MarcarComoLidaComVerificacaoAsync(notification.Id, 42));
            firstRead = results[0];
            concurrentRead = results[1];
        }

        Assert.True(firstRead);
        Assert.True(concurrentRead);
        await using (var laterContext = CreateContext())
        {
            var laterService = CreateService(laterContext, new ControlledTimeProvider(secondTime));
            var notification = Assert.Single(await laterService.ObterNotificacoesUsuarioAsync(42));
            Assert.True(notification.Lida);
            Assert.Equal(firstTime.UtcDateTime, notification.DataLeitura);
            Assert.Equal(0, await laterService.ContarNaoLidasUsuarioAsync(42));
            Assert.True(await laterService.MarcarComoLidaComVerificacaoAsync(notification.Id, 42));
            var reread = Assert.Single(await laterService.ObterNotificacoesUsuarioAsync(42));
            Assert.Equal(firstTime.UtcDateTime, reread.DataLeitura);
        }
    }

    [Fact]
    public async Task MigrationBackfillsOnlyIndividualEvidenceAndPreservesUnknownCollectiveRows()
    {
        await database.RecreateEmptyDatabaseAsync();
        await using (var legacyContext = CreateContext())
        {
            await legacyContext.GetService<IMigrator>()
                .MigrateAsync(LastMigrationBeforeRecipientRead);
            legacyContext.Usuarios.Add(CreateUser(42, NivelUsuario.Comum, TipoUsuario.Comum));
            await legacyContext.SaveChangesAsync();

            var createdAt = new DateTime(2026, 10, 1, 12, 0, 0, DateTimeKind.Utc);
            var readAt = createdAt.AddHours(2);
            await legacyContext.Database.ExecuteSqlInterpolatedAsync($"""
                INSERT INTO "Notificacoes"
                    ("Id", "Titulo", "Mensagem", "Tipo", "UsuarioId", "Lida", "DataCriacao", "DataLeitura")
                VALUES
                    (801, 'Aviso individual legado', 'Conteúdo preservado', {(int)TipoNotificacao.Sistema}, 42, true, {createdAt}, {readAt}),
                    (802, 'Aviso coletivo legado', 'Audiência incerta', {(int)TipoNotificacao.Sistema}, NULL, true, {createdAt}, {readAt})
                """);
            await legacyContext.Database.MigrateAsync();
        }

        await using var context = CreateContext();
        var service = CreateService(context, TimeProvider.System);
        var notifications = (await service.ObterNotificacoesUsuarioAsync(42)).ToArray();
        var personal = Assert.Single(notifications);
        Assert.Equal(801, personal.Id);
        Assert.True(personal.Lida);
        Assert.Equal(new DateTime(2026, 10, 1, 14, 0, 0, DateTimeKind.Utc), personal.DataLeitura);

        await context.Database.OpenConnectionAsync();
        await using var command = context.Database.GetDbConnection().CreateCommand();
        command.CommandText = "SELECT \"AudienciaLegadaIndeterminada\", \"Lida\" FROM \"Notificacoes\" WHERE \"Id\" = 802";
        await using var reader = await command.ExecuteReaderAsync();
        Assert.True(await reader.ReadAsync());
        Assert.True(reader.GetBoolean(0));
        Assert.True(reader.GetBoolean(1));
        Assert.False(await reader.ReadAsync());
    }

    private async Task RecreateAndMigrateAsync()
    {
        await database.RecreateEmptyDatabaseAsync();
        await using var context = CreateContext();
        await context.Database.MigrateAsync();
    }

    private AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(database.ConnectionString)
            .Options;
        return new AppDbContext(options);
    }

    private static NotificacaoService CreateService(AppDbContext context, TimeProvider timeProvider)
    {
        var configuration = new MapperConfiguration(
            options => options.AddProfile<NotificacaoMappingProfile>(),
            NullLoggerFactory.Instance);
        return new NotificacaoService(
            new UnitOfWork(context),
            configuration.CreateMapper(),
            NullLogger<NotificacaoService>.Instance,
            timeProvider);
    }

    private static Usuario CreateUser(
        int id,
        NivelUsuario level,
        TipoUsuario type,
        StatusUsuario status = StatusUsuario.Habilitado)
    {
        var name = $"Conta sintética {id}";
        var email = $"recipient-{id}@example.test";
        var user = type switch
        {
            TipoUsuario.Administrador => new Administrador
            {
                NomeCompleto = name,
                Email = email,
                SenhaHash = "synthetic-hash"
            },
            TipoUsuario.Academico => new Academico
            {
                NomeCompleto = name,
                Email = email,
                SenhaHash = "synthetic-hash",
                Instituicao = "Instituição sintética"
            },
            _ => new Usuario
            {
                NomeCompleto = name,
                Email = email,
                SenhaHash = "synthetic-hash"
            }
        };
        user.Id = id;
        user.NivelUsuario = level;
        user.TipoUsuario = type;
        user.Status = status;
        return user;
    }

    private static CreateNotificacaoDTO CreatePersonalNotification(int userId, string title) => new()
    {
        Titulo = title,
        Mensagem = "Conteúdo sintético individual.",
        Tipo = TipoNotificacao.Sistema,
        UsuarioId = userId
    };
}
