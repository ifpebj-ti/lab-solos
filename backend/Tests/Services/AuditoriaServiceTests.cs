using AutoMapper;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.DTOs.Auditoria;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Mappings;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Tests.Services;

public sealed class AuditoriaServiceTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 19, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void ModelAndServiceExposeProvenanceRetentionAndTransactionContracts()
    {
        var modelProperties = typeof(LogAuditoria).GetProperties()
            .Select(property => property.Name)
            .ToHashSet(StringComparer.Ordinal);
        var serviceMethods = typeof(IAuditoriaService).GetMethods()
            .Select(method => method.Name)
            .ToHashSet(StringComparer.Ordinal);

        Assert.Contains("CodigoEvento", modelProperties);
        Assert.Contains("OrigemConfiavel", modelProperties);
        Assert.Contains("ReferenciaAtor", modelProperties);
        Assert.Contains("Resultado", modelProperties);
        Assert.Contains("CategoriaRegistro", modelProperties);
        Assert.Contains("CorrelationId", modelProperties);
        Assert.Contains("ExpiraEmUtc", modelProperties);
        Assert.Contains("RegistrarEventoObrigatorioAsync", serviceMethods);
        Assert.Contains("RegistrarDiagnosticoAsync", serviceMethods);
        Assert.Contains("ExpurgarEventosExpiradosAsync", serviceMethods);
    }

    [Fact]
    public void ProjectionKeepsOnlyActorOriginAndOutcomeFromSensitiveLegacyFields()
    {
        var mapperConfiguration = new MapperConfiguration(
            configuration => configuration.AddProfile<AuditoriaMappingProfile>(),
            NullLoggerFactory.Instance);
        var source = new LogAuditoria
        {
            Acao = "falha_operacao",
            Recurso = "operacao:Usuarios",
            Detalhes = "CANARY_DETAIL",
            EnderecoIP = "203.0.113.8",
            UserAgent = "CANARY_AGENT",
            UsuarioId = 17,
            OrigemConfiavel = OrigemConfiavelAuditoria.UsuarioAutenticado,
            ReferenciaAtor = "usuario:17",
            Resultado = ResultadoOperacaoAuditoria.Negado,
            CategoriaRegistro = CategoriaRegistroAuditoria.DiagnosticoOperacional,
            CodigoEvento = CodigoEventoAuditoria.FalhaOperacao,
            CorrelationId = "trace-projection",
            ExpiraEmUtc = Now.AddDays(30),
            DadosRequisicao = "CANARY_PASSWORD",
            DadosResposta = "CANARY_TOKEN",
            TempoSessao = TimeSpan.FromMinutes(1),
            TentativasAcesso = 3,
            MotivoSuspeita = "CANARY_REASON"
        };

        var projection = mapperConfiguration.CreateMapper().Map<LogAuditoriaDTO>(source);

        Assert.Equal("UsuarioAutenticado", projection.Origem);
        Assert.Equal(17, projection.UsuarioId);
        Assert.Equal("Negado", projection.DadosResposta);
        Assert.Equal(string.Empty, projection.EnderecoIP);
        Assert.Null(projection.UserAgent);
        Assert.Null(projection.Detalhes);
        Assert.Null(projection.DadosRequisicao);
        Assert.Null(projection.TempoSessao);
        Assert.Null(projection.TentativasAcesso);
        Assert.Null(projection.MotivoSuspeita);
        Assert.Null(projection.NomeUsuario);
        Assert.Null(projection.EmailUsuario);
        Assert.DoesNotContain("CANARY", System.Text.Json.JsonSerializer.Serialize(projection), StringComparison.Ordinal);
    }

    [Fact]
    public async Task RegistrarLogAsyncCriaRegistroValidoEConfirmaPersistencia()
    {
        var fixture = CreateFixture();
        LogAuditoria? createdLog = null;
        fixture.LogRepository
            .Setup(repository => repository.Criar(It.IsAny<LogAuditoria>()))
            .Callback<LogAuditoria>(log => createdLog = log)
            .Returns((LogAuditoria log) => log);

        await fixture.Service.RegistrarLogAsync(
            CreateLogDto(), usuarioId: 7, enderecoIP: "192.0.2.10", userAgent: "synthetic-agent");

        Assert.NotNull(createdLog);
        Assert.Equal("falha_operacao", createdLog!.Acao);
        Assert.Equal("operacao", createdLog.Recurso);
        Assert.Equal(7, createdLog.UsuarioId);
        Assert.Equal("usuario:7", createdLog.ReferenciaAtor);
        Assert.Equal("192.0.2.10", createdLog.EnderecoIP);
        Assert.Null(createdLog.UserAgent);
        Assert.Equal("UsuarioAutenticado", createdLog.Origem);
        Assert.False(createdLog.Suspeita);
        fixture.UnitOfWork.Verify(unitOfWork => unitOfWork.CommitAsync(), Times.Once);
    }

    [Fact]
    public async Task RegistrarLogAsyncUsesAccountRuleAtTheFifthFailureInTheFifteenMinuteWindow()
    {
        var fixture = CreateFixture();
        LogAuditoria? createdLog = null;
        fixture.LogRepository
            .Setup(repository => repository.ContarFalhasLoginPorContaAsync(
                7,
                Now.AddMinutes(-15).UtcDateTime,
                It.Is<DateTime>(end => end > Now.UtcDateTime)))
            .ReturnsAsync(4);
        fixture.LogRepository
            .Setup(repository => repository.ContarFalhasLoginPorOrigemAsync(
                "192.0.2.10",
                Now.AddMinutes(-15).UtcDateTime,
                It.Is<DateTime>(end => end > Now.UtcDateTime)))
            .ReturnsAsync(29);
        fixture.LogRepository
            .Setup(repository => repository.Criar(It.IsAny<LogAuditoria>()))
            .Callback<LogAuditoria>(log => createdLog = log)
            .Returns((LogAuditoria log) => log);

        await fixture.Service.RegistrarLogAsync(
            CreateAuthenticatedLoginFailure(), usuarioId: 7, enderecoIP: "192.0.2.10");

        Assert.NotNull(createdLog);
        Assert.True(createdLog!.Suspeita);
        Assert.Equal(AuditDetectionCategory.AtividadeSuspeita, createdLog.CategoriaDeteccao);
        Assert.Equal(AuditDetectionRuleCatalog.FalhasPorContaCodigo, createdLog.CodigoRegraDeteccao);
        Assert.Equal(AuditDetectionRuleCatalog.CurrentVersion, createdLog.VersaoRegraDeteccao);
        Assert.Equal(5, createdLog.QuantidadeObservadaDeteccao);
        Assert.Null(createdLog.MotivoSuspeita);
    }

    [Fact]
    public async Task RegistrarLogAsyncUsesOriginRuleAtThirtyFailuresWhenNoAccountIsKnown()
    {
        var fixture = CreateFixture();
        LogAuditoria? createdLog = null;
        fixture.LogRepository
            .Setup(repository => repository.ContarFalhasLoginPorOrigemAsync(
                "192.0.2.10",
                Now.AddMinutes(-15).UtcDateTime,
                It.Is<DateTime>(end => end > Now.UtcDateTime)))
            .ReturnsAsync(29);
        fixture.LogRepository
            .Setup(repository => repository.Criar(It.IsAny<LogAuditoria>()))
            .Callback<LogAuditoria>(log => createdLog = log)
            .Returns((LogAuditoria log) => log);

        await fixture.Service.RegistrarLogAsync(
            CreateLogDto(TipoAcaoAuditoria.LoginFalhado), enderecoIP: "192.0.2.10");

        Assert.NotNull(createdLog);
        Assert.True(createdLog!.Suspeita);
        Assert.Equal(AuditDetectionCategory.AtividadeSuspeita, createdLog.CategoriaDeteccao);
        Assert.Equal(AuditDetectionRuleCatalog.FalhasPorOrigemCodigo, createdLog.CodigoRegraDeteccao);
        Assert.Equal(AuditDetectionRuleCatalog.CurrentVersion, createdLog.VersaoRegraDeteccao);
        Assert.Equal(30, createdLog.QuantidadeObservadaDeteccao);
        Assert.Null(createdLog.MotivoSuspeita);
    }

    [Fact]
    public async Task RegistrarLogAsyncMantemContratoQuandoPersistenciaFalha()
    {
        var fixture = CreateFixture();
        var persistenceFailure = new DbUpdateException("Falha de persistência esperada.");
        fixture.UnitOfWork
            .Setup(unitOfWork => unitOfWork.CommitAsync())
            .ThrowsAsync(persistenceFailure);

        var exception = await Record.ExceptionAsync(() => fixture.Service.RegistrarLogAsync(CreateLogDto()));

        Assert.Null(exception);
        fixture.LogRepository.Verify(repository => repository.Criar(It.IsAny<LogAuditoria>()), Times.Once);
        fixture.UnitOfWork.Verify(unitOfWork => unitOfWork.CommitAsync(), Times.Once);
        fixture.Logger.Verify(
            logger => logger.Log(
                LogLevel.Warning,
                It.Is<EventId>(eventId => eventId.Id == 1001),
                It.Is<It.IsAnyType>((state, _) =>
                    state?.ToString()?.Contains("trace-diagnostic", StringComparison.Ordinal) == true),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task RegistrarLogAsyncPreservaOperacaoEmFalhaInesperadaDeDiagnostico()
    {
        var fixture = CreateFixture();
        var unexpectedFailure = new InvalidOperationException("Falha inesperada.");
        fixture.UnitOfWork
            .Setup(unitOfWork => unitOfWork.CommitAsync())
            .ThrowsAsync(unexpectedFailure);

        var exception = await Record.ExceptionAsync(() => fixture.Service.RegistrarLogAsync(CreateLogDto()));

        Assert.Null(exception);
        fixture.Logger.Verify(
            logger => logger.Log(
                LogLevel.Warning,
                It.Is<EventId>(eventId => eventId.Id == 1001),
                It.Is<It.IsAnyType>((state, _) =>
                    state?.ToString()?.Contains(nameof(InvalidOperationException), StringComparison.Ordinal) == true),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task EventoObrigatorioUsaCatalogoMantemOrigemEAdiaCommitDoDominio()
    {
        var fixture = CreateFixture();
        LogAuditoria? createdLog = null;
        fixture.LogRepository
            .Setup(repository => repository.Criar(It.IsAny<LogAuditoria>()))
            .Callback<LogAuditoria>(log => createdLog = log)
            .Returns((LogAuditoria log) => log);

        await fixture.Service.RegistrarEventoObrigatorioAsync(new CreateLogAuditoriaDTO
        {
            CodigoEvento = CodigoEventoAuditoria.EmissaoNotificacao,
            OrigemConfiavel = OrigemConfiavelAuditoria.ProcessoAutorizado,
            IdentidadeProcesso = "notifications-worker",
            ReferenciaRecurso = "notification-17",
            Resultado = ResultadoOperacaoAuditoria.Sucesso,
            CorrelationId = "trace-17"
        });

        Assert.NotNull(createdLog);
        Assert.Equal("emissao_notificacao", createdLog!.Acao);
        Assert.Equal("notificacao:notification-17", createdLog.Recurso);
        Assert.Equal(CodigoEventoAuditoria.EmissaoNotificacao, createdLog.CodigoEvento);
        Assert.Equal(OrigemConfiavelAuditoria.ProcessoAutorizado, createdLog.OrigemConfiavel);
        Assert.Equal("processo:notifications-worker", createdLog.ReferenciaAtor);
        Assert.Equal(ResultadoOperacaoAuditoria.Sucesso, createdLog.Resultado);
        Assert.Equal(CategoriaRegistroAuditoria.TrilhaObrigatoria, createdLog.CategoriaRegistro);
        Assert.Equal("trace-17", createdLog.CorrelationId);
        Assert.Equal(Now.AddDays(365), createdLog.ExpiraEmUtc);
        Assert.Null(createdLog.UsuarioId);
        Assert.Null(createdLog.Detalhes);
        Assert.Null(createdLog.DadosRequisicao);
        Assert.Null(createdLog.DadosResposta);
        Assert.Null(createdLog.UserAgent);
        Assert.Equal(string.Empty, createdLog.EnderecoIP);
        fixture.UnitOfWork.Verify(unitOfWork => unitOfWork.CommitAsync(), Times.Never);
    }

    [Fact]
    public async Task EventoObrigatorioNaoAceitaOrigemSemAtorNemReferencia()
    {
        var fixture = CreateFixture();
        var evento = new CreateLogAuditoriaDTO
        {
            CodigoEvento = CodigoEventoAuditoria.TrocaEmail,
            OrigemConfiavel = OrigemConfiavelAuditoria.SemAtorValido,
            Resultado = ResultadoOperacaoAuditoria.Sucesso
        };

        await Assert.ThrowsAsync<ArgumentException>(
            () => fixture.Service.RegistrarEventoObrigatorioAsync(evento));

        fixture.LogRepository.Verify(repository => repository.Criar(It.IsAny<LogAuditoria>()), Times.Never);
        fixture.UnitOfWork.Verify(unitOfWork => unitOfWork.CommitAsync(), Times.Never);
    }

    [Fact]
    public async Task RegistrarLogAsyncOmiteCorposDeRequisicaoEResposta()
    {
        var fixture = CreateFixture();
        LogAuditoria? createdLog = null;
        fixture.LogRepository
            .Setup(repository => repository.Criar(It.IsAny<LogAuditoria>()))
            .Callback<LogAuditoria>(log => createdLog = log)
            .Returns((LogAuditoria log) => log);

        await fixture.Service.RegistrarLogAsync(CreateDiagnostic(), enderecoIP: "192.0.2.10");

        Assert.NotNull(createdLog);
        Assert.Null(createdLog!.DadosRequisicao);
        Assert.Null(createdLog.DadosResposta);
        Assert.Null(createdLog.Detalhes);
        Assert.Null(createdLog.UserAgent);
        Assert.Equal("192.0.2.10", createdLog.EnderecoIP);
        Assert.Equal(CategoriaRegistroAuditoria.DiagnosticoOperacional, createdLog.CategoriaRegistro);
    }

    [Fact]
    public async Task RegistrarLogAsyncKeepsMissingActorCategoryBelowSuspicionThreshold()
    {
        var fixture = CreateFixture();
        LogAuditoria? createdLog = null;
        fixture.LogRepository
            .Setup(repository => repository.ContarFalhasLoginPorOrigemAsync(
                "192.0.2.10",
                Now.AddMinutes(-15).UtcDateTime,
                It.IsAny<DateTime>()))
            .ReturnsAsync(0);
        fixture.LogRepository
            .Setup(repository => repository.Criar(It.IsAny<LogAuditoria>()))
            .Callback<LogAuditoria>(log => createdLog = log)
            .Returns((LogAuditoria log) => log);

        await fixture.Service.RegistrarLogAsync(
            CreateDiagnostic(TipoAcaoAuditoria.LoginFalhado),
            enderecoIP: "192.0.2.10");

        Assert.NotNull(createdLog);
        Assert.False(createdLog!.Suspeita);
        Assert.Equal(AuditDetectionCategory.SemAtorValido, createdLog.CategoriaDeteccao);
        Assert.Null(createdLog.CodigoRegraDeteccao);
        Assert.Equal(TipoAcaoAuditoria.LoginFalhado, createdLog.TipoAcao);
        Assert.Equal(OrigemConfiavelAuditoria.SemAtorValido, createdLog.OrigemConfiavel);
    }

    [Fact]
    public async Task VerificarAtividadeSuspeitaAsyncUsesTheControlledAccountWindowAndCatalog()
    {
        var fixture = CreateFixture();
        fixture.LogRepository
            .Setup(repository => repository.ContarFalhasLoginPorContaAsync(
                7,
                Now.AddMinutes(-15).UtcDateTime,
                It.Is<DateTime>(end => end > Now.UtcDateTime)))
            .ReturnsAsync(5);
        fixture.LogRepository
            .Setup(repository => repository.ContarFalhasLoginPorOrigemAsync(
                "192.0.2.10",
                Now.AddMinutes(-15).UtcDateTime,
                It.Is<DateTime>(end => end > Now.UtcDateTime)))
            .ReturnsAsync(0);

        var isSuspicious = await fixture.Service.VerificarAtividadeSuspeitaAsync(7, "192.0.2.10");

        Assert.True(isSuspicious);
        fixture.LogRepository.Verify(repository => repository.ContarFalhasLoginPorContaAsync(
            7,
            Now.AddMinutes(-15).UtcDateTime,
            It.IsAny<DateTime>()), Times.Once);
        fixture.LogRepository.Verify(repository => repository.ContarFalhasLoginPorOrigemAsync(
            "192.0.2.10",
            Now.AddMinutes(-15).UtcDateTime,
            It.IsAny<DateTime>()), Times.Once);
    }

    [Fact]
    public async Task FalhaDeGravacaoDoDiagnosticoPreservaOperacaoESinalizaCorrelacaoSemExcecaoBruta()
    {
        var fixture = CreateFixture();
        var persistenceFailure = new DbUpdateException("database failure with CANARY_SECRET");
        fixture.UnitOfWork
            .Setup(unitOfWork => unitOfWork.CommitAsync())
            .ThrowsAsync(persistenceFailure);

        var exception = await Record.ExceptionAsync(() =>
            fixture.Service.RegistrarDiagnosticoAsync(CreateDiagnostic(correlationId: "trace-failure")));

        Assert.Null(exception);
        fixture.Logger.Verify(
            logger => logger.Log(
                LogLevel.Warning,
                It.Is<EventId>(eventId => eventId.Id == 1001),
                It.Is<It.IsAnyType>((state, _) =>
                    state?.ToString()?.Contains("trace-failure", StringComparison.Ordinal) == true &&
                    state?.ToString()?.Contains("CANARY_SECRET", StringComparison.Ordinal) != true),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task ExpurgoRetemRegistrosAteOVencimentoDeCadaCategoria()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options;
        await using var context = new AppDbContext(options);
        var expiredDiagnostic = CreatePersistedLog(
            CodigoEventoAuditoria.FalhaOperacao,
            CategoriaRegistroAuditoria.DiagnosticoOperacional,
            Now);
        var expiredRequired = CreatePersistedLog(
            CodigoEventoAuditoria.EmissaoNotificacao,
            CategoriaRegistroAuditoria.TrilhaObrigatoria,
            Now);
        var active = CreatePersistedLog(
            CodigoEventoAuditoria.EmissaoNotificacao,
            CategoriaRegistroAuditoria.TrilhaObrigatoria,
            Now.AddTicks(1));
        context.LogsAuditoria.AddRange(expiredDiagnostic, expiredRequired, active);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var service = new AuditoriaService(
            new UnitOfWork(context),
            Mock.Of<AutoMapper.IMapper>(),
            Mock.Of<ILogger<AuditoriaService>>(),
            new FixedTimeProvider(Now));

        var removed = await service.ExpurgarEventosExpiradosAsync();

        Assert.Equal(2, removed);
        Assert.Equal([active.Id], await context.LogsAuditoria.Select(log => log.Id).ToArrayAsync());
    }

    private static CreateLogAuditoriaDTO CreateDiagnostic(
        TipoAcaoAuditoria? tipoAcao = null,
        string correlationId = "trace-diagnostic") => new()
    {
        CodigoEvento = tipoAcao == TipoAcaoAuditoria.LoginFalhado
            ? CodigoEventoAuditoria.TentativaSemIdentidadeValida
            : CodigoEventoAuditoria.FalhaOperacao,
        OrigemConfiavel = OrigemConfiavelAuditoria.SemAtorValido,
        Resultado = ResultadoOperacaoAuditoria.Falha,
        CorrelationId = correlationId,
        TipoAcaoDiagnostica = tipoAcao
    };

    private static CreateLogAuditoriaDTO CreateAuthenticatedLoginFailure() => new()
    {
        CodigoEvento = CodigoEventoAuditoria.FalhaOperacao,
        OrigemConfiavel = OrigemConfiavelAuditoria.UsuarioAutenticado,
        UsuarioId = 7,
        Resultado = ResultadoOperacaoAuditoria.Negado,
        CorrelationId = "trace-account-login-failure",
        TipoAcaoDiagnostica = TipoAcaoAuditoria.LoginFalhado
    };

    private static CreateLogAuditoriaDTO CreateLogDto(
        TipoAcaoAuditoria tipoAcao = TipoAcaoAuditoria.Login,
        NivelRiscoAuditoria nivelRisco = NivelRiscoAuditoria.Baixo) => new()
    {
        CodigoEvento = tipoAcao == TipoAcaoAuditoria.LoginFalhado
            ? CodigoEventoAuditoria.TentativaSemIdentidadeValida
            : CodigoEventoAuditoria.FalhaOperacao,
        OrigemConfiavel = OrigemConfiavelAuditoria.SemAtorValido,
        Resultado = tipoAcao == TipoAcaoAuditoria.LoginFalhado
            ? ResultadoOperacaoAuditoria.Negado
            : ResultadoOperacaoAuditoria.Falha,
        CorrelationId = "trace-diagnostic",
        TipoAcaoDiagnostica = tipoAcao
    };

    private static LogAuditoria CreatePersistedLog(
        CodigoEventoAuditoria code,
        CategoriaRegistroAuditoria category,
        DateTimeOffset expiresAt) => new()
    {
        DataHora = expiresAt.AddDays(-1).UtcDateTime,
        Acao = "synthetic",
        Recurso = "synthetic",
        EnderecoIP = string.Empty,
        CodigoEvento = code,
        OrigemConfiavel = OrigemConfiavelAuditoria.SemAtorValido,
        Resultado = ResultadoOperacaoAuditoria.Sucesso,
        CategoriaRegistro = category,
        CorrelationId = Guid.NewGuid().ToString("N"),
        ExpiraEmUtc = expiresAt
    };

    private static TestFixture CreateFixture()
    {
        var unitOfWork = new Mock<IUnitOfWork>();
        var logRepository = new Mock<ILogAuditoriaRepository>();
        var logger = new Mock<ILogger<AuditoriaService>>();
        logger.Setup(instance => instance.IsEnabled(It.IsAny<LogLevel>())).Returns(true);
        unitOfWork.SetupGet(current => current.LogAuditoriaRepository).Returns(logRepository.Object);
        unitOfWork.Setup(current => current.CommitAsync()).Returns(Task.CompletedTask);

        return new TestFixture(
            new AuditoriaService(
                unitOfWork.Object,
                Mock.Of<AutoMapper.IMapper>(),
                logger.Object,
                new FixedTimeProvider(Now)),
            unitOfWork,
            logRepository,
            logger);
    }

    private sealed record TestFixture(
        AuditoriaService Service,
        Mock<IUnitOfWork> UnitOfWork,
        Mock<ILogAuditoriaRepository> LogRepository,
        Mock<ILogger<AuditoriaService>> Logger);

    private sealed class FixedTimeProvider(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }
}
