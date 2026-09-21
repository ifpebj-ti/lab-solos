using LabSolos_Server_DotNet8.DTOs.Auditoria;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;

namespace Tests.Services;

public sealed class AuditoriaServiceTests
{
    [Fact]
    public async Task RegistrarLogAsyncCriaRegistroValidoEConfirmaPersistencia()
    {
        var fixture = CreateFixture();
        LogAuditoria? createdLog = null;
        fixture.LogRepository
            .Setup(repository => repository.Criar(It.IsAny<LogAuditoria>()))
            .Callback<LogAuditoria>(log => createdLog = log)
            .Returns((LogAuditoria log) => log);

        await fixture.Service.RegistrarLogAsync(CreateLogDto(), usuarioId: 7, enderecoIP: "192.0.2.10", userAgent: "test-agent");

        Assert.NotNull(createdLog);
        Assert.Equal("login", createdLog!.Acao);
        Assert.Equal("usuarios", createdLog.Recurso);
        Assert.Equal(7, createdLog.UsuarioId);
        Assert.Equal("192.0.2.10", createdLog.EnderecoIP);
        Assert.Equal("test-agent", createdLog.UserAgent);
        Assert.Equal("Web", createdLog.Origem);
        Assert.False(createdLog.Suspeita);
        fixture.UnitOfWork.Verify(unitOfWork => unitOfWork.CommitAsync(), Times.Once);
    }

    [Fact]
    public async Task RegistrarLogAsyncMarcaLoginFalhoComoSuspeitoQuandoHaTentativasRecentes()
    {
        var fixture = CreateFixture();
        LogAuditoria? createdLog = null;
        fixture.LogRepository
            .Setup(repository => repository.ObterTotalLogsFiltradosAsync(It.Is<FiltroAuditoriaDTO>(filter =>
                filter.TipoAcao == TipoAcaoAuditoria.LoginFalhado &&
                filter.EnderecoIP == "192.0.2.10")))
            .ReturnsAsync(6);
        fixture.LogRepository
            .Setup(repository => repository.Criar(It.IsAny<LogAuditoria>()))
            .Callback<LogAuditoria>(log => createdLog = log)
            .Returns((LogAuditoria log) => log);

        await fixture.Service.RegistrarLogAsync(
            CreateLogDto(TipoAcaoAuditoria.LoginFalhado),
            enderecoIP: "192.0.2.10");

        Assert.NotNull(createdLog);
        Assert.True(createdLog!.Suspeita);
        Assert.Equal("Múltiplas tentativas de login falhado (6) do IP 192.0.2.10", createdLog.MotivoSuspeita);
    }

    [Fact]
    public async Task RegistrarLogAsyncMantemLoginFalhoNaoSuspeitoSemTentativasRecentes()
    {
        var fixture = CreateFixture();
        LogAuditoria? createdLog = null;
        fixture.LogRepository
            .Setup(repository => repository.ObterTotalLogsFiltradosAsync(It.Is<FiltroAuditoriaDTO>(filter =>
                filter.TipoAcao == TipoAcaoAuditoria.LoginFalhado &&
                filter.EnderecoIP == "192.0.2.10")))
            .ReturnsAsync(0);
        fixture.LogRepository
            .Setup(repository => repository.Criar(It.IsAny<LogAuditoria>()))
            .Callback<LogAuditoria>(log => createdLog = log)
            .Returns((LogAuditoria log) => log);

        await fixture.Service.RegistrarLogAsync(
            CreateLogDto(TipoAcaoAuditoria.LoginFalhado),
            enderecoIP: "192.0.2.10");

        Assert.NotNull(createdLog);
        Assert.False(createdLog!.Suspeita);
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
                It.Is<It.IsAnyType>((_, _) => true),
                It.Is<DbUpdateException>(exception => ReferenceEquals(exception, persistenceFailure)),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task RegistrarLogAsyncPropagaFalhaInesperada()
    {
        var fixture = CreateFixture();
        var unexpectedFailure = new InvalidOperationException("Falha inesperada.");
        fixture.UnitOfWork
            .Setup(unitOfWork => unitOfWork.CommitAsync())
            .ThrowsAsync(unexpectedFailure);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => fixture.Service.RegistrarLogAsync(CreateLogDto()));

        Assert.Same(unexpectedFailure, exception);
    }

    private static CreateLogAuditoriaDTO CreateLogDto(
        TipoAcaoAuditoria tipoAcao = TipoAcaoAuditoria.Login,
        NivelRiscoAuditoria nivelRisco = NivelRiscoAuditoria.Baixo)
    {
        return new CreateLogAuditoriaDTO
        {
            Acao = "login",
            Recurso = "usuarios",
            TipoAcao = tipoAcao,
            NivelRisco = nivelRisco
        };
    }

    private static TestFixture CreateFixture()
    {
        var unitOfWork = new Mock<IUnitOfWork>();
        var logRepository = new Mock<ILogAuditoriaRepository>();
        var mapper = new Mock<AutoMapper.IMapper>();
        var logger = new Mock<ILogger<AuditoriaService>>();
        logger.Setup(instance => instance.IsEnabled(It.IsAny<LogLevel>())).Returns(true);

        unitOfWork.SetupGet(current => current.LogAuditoriaRepository).Returns(logRepository.Object);
        unitOfWork.Setup(current => current.CommitAsync()).Returns(Task.CompletedTask);

        return new TestFixture(
            new AuditoriaService(unitOfWork.Object, mapper.Object, logger.Object),
            unitOfWork,
            logRepository,
            logger);
    }

    private sealed record TestFixture(
        AuditoriaService Service,
        Mock<IUnitOfWork> UnitOfWork,
        Mock<ILogAuditoriaRepository> LogRepository,
        Mock<ILogger<AuditoriaService>> Logger);
}
