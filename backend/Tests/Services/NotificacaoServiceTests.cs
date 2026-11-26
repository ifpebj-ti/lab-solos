using System.Linq.Expressions;
using AutoMapper;
using LabSolos_Server_DotNet8.DTOs.Auditoria;
using LabSolos_Server_DotNet8.DTOs.Notificacoes;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.Extensions.Logging;
using Moq;

namespace Tests.Services;

public sealed class NotificacaoServiceTests
{
    private static readonly DateTimeOffset FixedInstant = new(2026, 11, 24, 9, 30, 0, TimeSpan.Zero);

    [Fact]
    public async Task VerificarEmprestimosVencidosAsyncCriaUmaNotificacaoDeGrupoParaAdministradoresHabilitados()
    {
        var fixture = CreateFixture(new FixedTimeProvider(FixedInstant));
        var administrators = new[]
        {
            CreateUser(42, "Primeiro administrador"),
            CreateUser(17, "Segundo administrador"),
            CreateUser(88, "Terceiro administrador")
        };
        var loan = CreateOverdueLoan();
        var createdNotifications = new List<Notificacao>();

        fixture.LoanRepository
            .Setup(repository => repository.ObterTodosAsync(
                It.IsAny<Expression<Func<Emprestimo, bool>>>(),
                It.IsAny<Func<IQueryable<Emprestimo>, IQueryable<Emprestimo>>?>()))
            .ReturnsAsync(new[] { loan });
        fixture.NotificationRepository
            .Setup(repository => repository.ObterTodosAsync(
                It.IsAny<Expression<Func<Notificacao, bool>>>(),
                It.IsAny<Func<IQueryable<Notificacao>, IQueryable<Notificacao>>?>()))
            .ReturnsAsync(Array.Empty<Notificacao>());
        fixture.UserRepository
            .Setup(repository => repository.ObterTodosAsync(
                It.IsAny<Expression<Func<Usuario, bool>>>(),
                It.IsAny<Func<IQueryable<Usuario>, IQueryable<Usuario>>?>()))
            .ReturnsAsync(administrators);
        fixture.NotificationRepository
            .Setup(repository => repository.Criar(It.IsAny<Notificacao>()))
            .Callback<Notificacao>(createdNotifications.Add)
            .Returns((Notificacao notification) => notification);
        fixture.NotificationRepository
            .Setup(repository => repository.ObterDestinatariosHabilitadosAsync(
                It.IsAny<int?>(),
                It.IsAny<NivelUsuario?>()))
            .ReturnsAsync((int? userId, NivelUsuario? targetLevel) => userId.HasValue
                ? [userId.Value]
                : targetLevel == NivelUsuario.Administrador
                    ? administrators.Select(user => user.Id).ToArray()
                    : []);

        await fixture.Service.VerificarEmprestimosVencidosAsync();

        var notification = Assert.Single(createdNotifications);
        Assert.Equal(TipoNotificacao.Sistema, notification.Tipo);
        Assert.Null(notification.UsuarioId);
        Assert.Equal(loan.Id, notification.ReferenciaId);
        Assert.Equal("EmprestimoVencido", notification.TipoReferencia);
        Assert.Equal($"/admin/history/loan/{loan.Id}", notification.LinkAcao);
        Assert.Contains(loan.Solicitante.NomeCompleto, notification.Mensagem);
        Assert.Contains("Reagente A, Reagente B", notification.Mensagem);
        Assert.Equal(administrators.Select(user => user.Id).Order(),
            notification.Destinatarios.Select(read => read.UsuarioId).Order());
        fixture.UnitOfWork.Verify(unitOfWork => unitOfWork.CommitAsync(), Times.Once);
    }

    [Fact]
    public async Task CriarNotificacaoAsyncPersistsEligibleRecipientAndBuildsStableIdempotencyKey()
    {
        var fixture = CreateFixture(new FixedTimeProvider(FixedInstant));
        var createdNotifications = new List<Notificacao>();
        fixture.NotificationRepository
            .Setup(repository => repository.ObterDestinatariosHabilitadosAsync(43, null))
            .ReturnsAsync([43]);
        fixture.NotificationRepository
            .Setup(repository => repository.Criar(It.IsAny<Notificacao>()))
            .Callback<Notificacao>(createdNotifications.Add)
            .Returns((Notificacao notification) => notification);
        var request = new CreateNotificacaoDTO
        {
            Titulo = "Aviso", Mensagem = "Mensagem", Tipo = TipoNotificacao.Sistema,
            UsuarioId = 43, LinkAcao = "/notifications/42", ReferenciaId = 42,
            TipoReferencia = " Produto "
        };
        string? idempotencyKey = null;
        fixture.NotificationRepository
            .Setup(repository => repository.ObterPorChaveIdempotenciaAsync(It.IsAny<string>()))
            .Callback<string>(key => idempotencyKey = key)
            .ReturnsAsync((Notificacao?)null);

        var result = await fixture.Service.CriarNotificacaoAsync(request);

        Assert.NotNull(result);
        var notification = Assert.Single(createdNotifications);
        Assert.Equal("Aviso", notification.Titulo);
        Assert.Equal("Mensagem", notification.Mensagem);
        Assert.Equal(TipoNotificacao.Sistema, notification.Tipo);
        Assert.Equal(43, notification.UsuarioId);
        Assert.Equal(FixedInstant.UtcDateTime, notification.DataCriacao);
        Assert.False(notification.Lida);
        Assert.Null(notification.DataLeitura);
        Assert.False(notification.AudienciaLegadaIndeterminada);
        Assert.Null(notification.ExcluidaEmUtc);
        Assert.Equal("/notifications/42", notification.LinkAcao);
        Assert.Equal(43, Assert.Single(notification.Destinatarios.Select(read => read.UsuarioId)));
        Assert.StartsWith("v1:", idempotencyKey);
        Assert.Equal(idempotencyKey, idempotencyKey!.ToLowerInvariant());
        Assert.Equal(67, idempotencyKey.Length);
        fixture.NotificationRepository.Verify(repository =>
            repository.BloquearChaveIdempotenciaAsync(It.IsAny<string>()), Times.Never);
        fixture.UnitOfWork.Verify(unitOfWork => unitOfWork.CommitAsync(), Times.Once);
    }

    [Fact]
    public async Task AutomaticNotificationWithoutEligibleRecipientsIsSkippedWithoutPersistence()
    {
        var fixture = CreateFixture(new FixedTimeProvider(FixedInstant));
        fixture.NotificationRepository
            .Setup(repository => repository.ObterDestinatariosHabilitadosAsync(null, null))
            .ReturnsAsync([]);

        var result = await fixture.Service.CriarNotificacaoAsync(new CreateNotificacaoDTO
        {
            Titulo = "Aviso", Mensagem = "Mensagem", Tipo = TipoNotificacao.Sistema
        });

        Assert.Null(result);
        fixture.NotificationRepository.Verify(repository => repository.Criar(It.IsAny<Notificacao>()), Times.Never);
        fixture.UnitOfWork.Verify(unitOfWork => unitOfWork.CommitAsync(), Times.Never);
    }

    [Fact]
    public async Task AutomaticNotificationWithExistingIdempotencyKeyReturnsThePriorNotification()
    {
        var fixture = CreateFixture();
        var existing = new Notificacao { Id = 91, Titulo = "Existing" };
        fixture.NotificationRepository
            .Setup(repository => repository.ObterDestinatariosHabilitadosAsync(43, null))
            .ReturnsAsync([43]);
        fixture.NotificationRepository
            .Setup(repository => repository.ObterPorChaveIdempotenciaAsync(It.IsAny<string>()))
            .ReturnsAsync(existing);
        var request = new CreateNotificacaoDTO
        {
            Titulo = "Aviso", Mensagem = "Mensagem", Tipo = TipoNotificacao.Sistema,
            UsuarioId = 43, ReferenciaId = 91, TipoReferencia = "Produto"
        };

        var result = await fixture.Service.CriarNotificacaoAsync(request);

        Assert.NotNull(result);
        fixture.NotificationRepository.Verify(repository => repository.Criar(It.IsAny<Notificacao>()), Times.Never);
        fixture.NotificationRepository.Verify(repository => repository.ObterDestinatariosHabilitadosAsync(
            It.IsAny<int?>(), It.IsAny<NivelUsuario?>()), Times.Never);
        fixture.UnitOfWork.Verify(unitOfWork => unitOfWork.CommitAsync(), Times.Never);
    }

    [Fact]
    public async Task AutomaticEmissionRejectsAnAdministrativeTypeDirectedToAnIndividual()
    {
        var fixture = CreateFixture();

        await Assert.ThrowsAsync<NotificationRecipientNotEligibleException>(() =>
            fixture.Service.CriarNotificacaoAsync(new CreateNotificacaoDTO
            {
                Titulo = "Estoque baixo", Mensagem = "Mensagem", Tipo = TipoNotificacao.EstoqueBaixo,
                UsuarioId = 43
            }));

        fixture.NotificationRepository.Verify(repository => repository.ObterDestinatariosHabilitadosAsync(
            It.IsAny<int?>(), It.IsAny<NivelUsuario?>()), Times.Never);
    }

    [Fact]
    public async Task ManualEmissionRequiresAnEnabledAdministrator()
    {
        var fixture = CreateFixture();
        fixture.UserRepository
            .Setup(repository => repository.ObterAsync(It.IsAny<Expression<Func<Usuario, bool>>>(), null))
            .ReturnsAsync(CreateUser(42, "Usuário comum", TipoUsuario.Comum, NivelUsuario.Comum));

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            fixture.Service.CriarNotificacaoManualAsync(new CreateNotificacaoDTO
            {
                Titulo = "Aviso", Mensagem = "Mensagem", Tipo = TipoNotificacao.Sistema, UsuarioId = 43
            }, 42));

        fixture.NotificationRepository.Verify(repository => repository.Criar(It.IsAny<Notificacao>()), Times.Never);
        fixture.UnitOfWork.Verify(unitOfWork => unitOfWork.CommitAsync(), Times.Never);
    }

    [Fact]
    public async Task ManualEmissionRejectsAnIneligibleAudienceWithoutPersisting()
    {
        var fixture = CreateFixture();
        fixture.UserRepository
            .Setup(repository => repository.ObterAsync(It.IsAny<Expression<Func<Usuario, bool>>>(), null))
            .ReturnsAsync(CreateUser(42, "Administrador"));
        fixture.NotificationRepository
            .Setup(repository => repository.ObterDestinatariosHabilitadosAsync(null, null))
            .ReturnsAsync([]);

        await Assert.ThrowsAsync<NotificationRecipientNotEligibleException>(() =>
            fixture.Service.CriarNotificacaoManualAsync(new CreateNotificacaoDTO
            {
                Titulo = "Aviso", Mensagem = "Mensagem", Tipo = TipoNotificacao.Sistema
            }, 42));

        fixture.NotificationRepository.Verify(repository => repository.Criar(It.IsAny<Notificacao>()), Times.Never);
        fixture.UnitOfWork.Verify(unitOfWork => unitOfWork.CommitAsync(), Times.Never);
    }

    [Fact]
    public async Task ExcluirNotificacaoRequiresMandatoryAuditAndEnabledAdministrator()
    {
        var noAudit = CreateFixture();
        noAudit.UserRepository
            .Setup(repository => repository.ObterAsync(It.IsAny<Expression<Func<Usuario, bool>>>(), null))
            .ReturnsAsync(CreateUser(42, "Administrador"));
        await Assert.ThrowsAsync<InvalidOperationException>(() => noAudit.Service.ExcluirNotificacaoAsync(91, 42));

        var unavailableAdministrator = CreateFixture(auditoriaService: new Mock<IAuditoriaService>().Object);
        unavailableAdministrator.UserRepository
            .Setup(repository => repository.ObterAsync(It.IsAny<Expression<Func<Usuario, bool>>>(), null))
            .ReturnsAsync((Usuario?)null);
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            unavailableAdministrator.Service.ExcluirNotificacaoAsync(91, 42));

        noAudit.NotificationRepository.Verify(repository =>
            repository.ObterPorIdIncluindoExcluidasAsync(It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task ExcluirNotificacaoReturnsFalseWhenTheNotificationDoesNotExist()
    {
        var audit = new Mock<IAuditoriaService>();
        var fixture = CreateFixture(auditoriaService: audit.Object);
        fixture.UserRepository
            .Setup(repository => repository.ObterAsync(It.IsAny<Expression<Func<Usuario, bool>>>(), null))
            .ReturnsAsync(CreateUser(42, "Administrador"));
        fixture.NotificationRepository
            .Setup(repository => repository.ObterPorIdIncluindoExcluidasAsync(91))
            .ReturnsAsync((Notificacao?)null);

        var result = await fixture.Service.ExcluirNotificacaoAsync(91, 42);

        Assert.False(result);
        audit.Verify(service => service.RegistrarEventoObrigatorioAsync(It.IsAny<CreateLogAuditoriaDTO>()), Times.Never);
        fixture.UnitOfWork.Verify(unitOfWork => unitOfWork.CommitAsync(), Times.Never);
    }

    [Fact]
    public async Task ExcluirNotificacaoIsIdempotentForAlreadyDeletedAndConcurrentDeletion()
    {
        var audit = new Mock<IAuditoriaService>();
        var fixture = CreateFixture(auditoriaService: audit.Object);
        fixture.UserRepository
            .Setup(repository => repository.ObterAsync(It.IsAny<Expression<Func<Usuario, bool>>>(), null))
            .ReturnsAsync(CreateUser(42, "Administrador"));
        fixture.NotificationRepository
            .SetupSequence(repository => repository.ObterPorIdIncluindoExcluidasAsync(It.IsAny<int>()))
            .ReturnsAsync(new Notificacao { Id = 91, ExcluidaEmUtc = FixedInstant.UtcDateTime })
            .ReturnsAsync(new Notificacao { Id = 92 });
        fixture.NotificationRepository
            .Setup(repository => repository.ExcluirLogicamenteAsync(92, It.IsAny<DateTime>()))
            .ReturnsAsync(false);

        Assert.True(await fixture.Service.ExcluirNotificacaoAsync(91, 42));
        Assert.True(await fixture.Service.ExcluirNotificacaoAsync(92, 42));

        audit.Verify(service => service.RegistrarEventoObrigatorioAsync(It.IsAny<CreateLogAuditoriaDTO>()), Times.Never);
        fixture.UnitOfWork.Verify(unitOfWork => unitOfWork.CommitAsync(), Times.Never);
    }

    [Fact]
    public async Task ExcluirNotificacaoAuditsAndCommitsTheLogicalDeletionOnce()
    {
        var audit = new Mock<IAuditoriaService>();
        CreateLogAuditoriaDTO? eventData = null;
        audit.Setup(service => service.RegistrarEventoObrigatorioAsync(It.IsAny<CreateLogAuditoriaDTO>()))
            .Callback<CreateLogAuditoriaDTO>(value => eventData = value)
            .Returns(Task.CompletedTask);
        var fixture = CreateFixture(new FixedTimeProvider(FixedInstant), audit.Object);
        fixture.UserRepository
            .Setup(repository => repository.ObterAsync(It.IsAny<Expression<Func<Usuario, bool>>>(), null))
            .ReturnsAsync(CreateUser(42, "Administrador"));
        fixture.NotificationRepository
            .Setup(repository => repository.ObterPorIdIncluindoExcluidasAsync(91))
            .ReturnsAsync(new Notificacao { Id = 91 });
        fixture.NotificationRepository
            .Setup(repository => repository.ExcluirLogicamenteAsync(91, FixedInstant.UtcDateTime))
            .ReturnsAsync(true);

        var result = await fixture.Service.ExcluirNotificacaoAsync(91, 42);

        Assert.True(result);
        Assert.Equal(CodigoEventoAuditoria.ExclusaoNotificacao, eventData?.CodigoEvento);
        Assert.Equal(OrigemConfiavelAuditoria.UsuarioAutenticado, eventData?.OrigemConfiavel);
        Assert.Equal(42, eventData?.UsuarioId);
        Assert.Equal("91", eventData?.ReferenciaRecurso);
        fixture.UnitOfWork.Verify(unitOfWork => unitOfWork.CommitAsync(), Times.Once);
    }

    [Fact]
    public async Task MarcarComoLidaCommitsOnlyWhenTheRecipientOwnsTheNotification()
    {
        var fixture = CreateFixture(new FixedTimeProvider(FixedInstant));
        fixture.NotificationRepository
            .SetupSequence(repository => repository.MarcarComoLidaAsync(91, 43, It.IsAny<DateTime>()))
            .ReturnsAsync(false)
            .ReturnsAsync(true);

        Assert.False(await fixture.Service.MarcarComoLidaComVerificacaoAsync(91, 43));
        fixture.UnitOfWork.Verify(unitOfWork => unitOfWork.CommitAsync(), Times.Never);

        Assert.True(await fixture.Service.MarcarComoLidaComVerificacaoAsync(91, 43));
        fixture.NotificationRepository.Verify(repository =>
            repository.MarcarComoLidaAsync(91, 43, FixedInstant.UtcDateTime), Times.Exactly(2));
        fixture.UnitOfWork.Verify(unitOfWork => unitOfWork.CommitAsync(), Times.Once);
    }

    [Fact]
    public async Task MarkingSeveralNotificationsCommitsTheRepositoryCountIncludingZero()
    {
        var fixture = CreateFixture(new FixedTimeProvider(FixedInstant));
        var ids = new[] { 91, 92 };
        fixture.NotificationRepository
            .Setup(repository => repository.MarcarVariasComoLidaAsync(ids, 43, FixedInstant.UtcDateTime))
            .ReturnsAsync(0);

        var result = await fixture.Service.MarcarVariasComoLidaComVerificacaoAsync(ids, 43);

        Assert.Equal(0, result);
        fixture.UnitOfWork.Verify(unitOfWork => unitOfWork.CommitAsync(), Times.Once);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task AccessCheckReflectsWhetherTheRecipientRelationExists(bool exists)
    {
        var fixture = CreateFixture();
        fixture.NotificationRepository
            .Setup(repository => repository.ObterParaDestinatarioAsync(91, 43))
            .ReturnsAsync(exists ? new NotificacaoLeitura() : null);

        var result = await fixture.Service.UsuarioPodeAcessarNotificacaoAsync(91, 43);

        Assert.Equal(exists, result);
    }

    [Fact]
    public async Task AutomaticGenerationWithNoProductsCompletesWithoutPersistence()
    {
        var fixture = CreateFixture();
        fixture.ProductRepository
            .Setup(repository => repository.ObterTodosAsync(It.IsAny<Expression<Func<Produto, bool>>>(), null))
            .ReturnsAsync(Array.Empty<Produto>());

        await fixture.Service.GerarNotificacoesAutomaticasAsync();

        fixture.NotificationRepository.Verify(repository => repository.Criar(It.IsAny<Notificacao>()), Times.Never);
        fixture.UnitOfWork.Verify(unitOfWork => unitOfWork.CommitAsync(), Times.Never);
    }

    [Fact]
    public async Task AutomaticGenerationEmitsLowStockAndUpcomingExpiryForConfiguredRecipients()
    {
        var fixture = CreateFixture(new FixedTimeProvider(FixedInstant));
        var lowStock = new Produto
        {
            Id = 101, NomeProduto = "Reagente baixo", Quantidade = 1, QuantidadeMinima = 2,
            Status = StatusProduto.Disponivel
        };
        var expiring = new Produto
        {
            Id = 102, NomeProduto = "Reagente próximo", Quantidade = 8, QuantidadeMinima = 2,
            DataValidade = FixedInstant.UtcDateTime.AddDays(3), Status = StatusProduto.Disponivel
        };
        var created = new List<Notificacao>();
        fixture.ProductRepository
            .SetupSequence(repository => repository.ObterTodosAsync(
                It.IsAny<Expression<Func<Produto, bool>>>(), null))
            .ReturnsAsync([lowStock])
            .ReturnsAsync([expiring]);
        fixture.NotificationRepository
            .Setup(repository => repository.ObterPorTipoAsync(It.IsAny<TipoNotificacao>(), false))
            .ReturnsAsync(Array.Empty<Notificacao>());
        fixture.NotificationRepository
            .Setup(repository => repository.ObterDestinatariosHabilitadosAsync(null, NivelUsuario.Administrador))
            .ReturnsAsync([42]);
        fixture.NotificationRepository
            .Setup(repository => repository.Criar(It.IsAny<Notificacao>()))
            .Callback<Notificacao>(created.Add)
            .Returns((Notificacao notification) => notification);

        await fixture.Service.GerarNotificacoesAutomaticasAsync();

        Assert.Collection(
            created,
            notification =>
            {
                Assert.Equal(TipoNotificacao.EstoqueBaixo, notification.Tipo);
                Assert.Contains("Reagente baixo", notification.Mensagem);
                Assert.Equal(101, notification.ReferenciaId);
            },
            notification =>
            {
                Assert.Equal(TipoNotificacao.ProdutoProximoVencimento, notification.Tipo);
                Assert.Contains("Reagente próximo", notification.Mensagem);
                Assert.Equal(102, notification.ReferenciaId);
            });
        fixture.UnitOfWork.Verify(unitOfWork => unitOfWork.CommitAsync(), Times.Exactly(2));
    }

    [Fact]
    public async Task ExpirationNotificationUsesTheExpiredOrUpcomingTypeAndMessage()
    {
        var fixture = CreateFixture(new FixedTimeProvider(FixedInstant));
        var created = new List<Notificacao>();
        fixture.NotificationRepository
            .Setup(repository => repository.ObterDestinatariosHabilitadosAsync(null, NivelUsuario.Administrador))
            .ReturnsAsync([42]);
        fixture.NotificationRepository
            .Setup(repository => repository.Criar(It.IsAny<Notificacao>()))
            .Callback<Notificacao>(created.Add)
            .Returns((Notificacao notification) => notification);

        await fixture.Service.CriarNotificacaoProdutoVencidoAsync(
            101, "Reagente vencido", FixedInstant.UtcDateTime.AddDays(-2));
        await fixture.Service.CriarNotificacaoProdutoVencidoAsync(
            102, "Reagente próximo", FixedInstant.UtcDateTime.AddDays(5));

        Assert.Collection(
            created,
            expired =>
            {
                Assert.Equal(TipoNotificacao.ProdutoVencido, expired.Tipo);
                Assert.Equal("Produto Vencido", expired.Titulo);
                Assert.Contains("venceu em", expired.Mensagem);
            },
            upcoming =>
            {
                Assert.Equal(TipoNotificacao.ProdutoProximoVencimento, upcoming.Tipo);
                Assert.Equal("Produto Próximo ao Vencimento", upcoming.Titulo);
                Assert.Contains("vence em", upcoming.Mensagem);
            });
    }

    [Fact]
    public async Task MissingLoanAndUserDoNotCreateAutomaticNotifications()
    {
        var fixture = CreateFixture(new FixedTimeProvider(FixedInstant));
        fixture.LoanRepository
            .Setup(repository => repository.ObterAsync(
                It.IsAny<Expression<Func<Emprestimo, bool>>>(),
                It.IsAny<Func<IQueryable<Emprestimo>, IQueryable<Emprestimo>>?>()))
            .ReturnsAsync((Emprestimo?)null);
        fixture.UserRepository
            .Setup(repository => repository.ObterAsync(
                It.IsAny<Expression<Func<Usuario, bool>>>(), null))
            .ReturnsAsync((Usuario?)null);

        await fixture.Service.CriarNotificacaoNovoEmprestimo(700);
        await fixture.Service.CriarNotificacaoNovaSolicitacaoUsuario(43);

        fixture.NotificationRepository.Verify(repository => repository.Criar(It.IsAny<Notificacao>()), Times.Never);
        fixture.UnitOfWork.Verify(unitOfWork => unitOfWork.CommitAsync(), Times.Never);
    }

    [Fact]
    public async Task VerificarEmprestimosVencidosWithNoLoansCompletesWithoutNotifications()
    {
        var fixture = CreateFixture(new FixedTimeProvider(FixedInstant));
        fixture.LoanRepository
            .Setup(repository => repository.ObterTodosAsync(
                It.IsAny<Expression<Func<Emprestimo, bool>>>(),
                It.IsAny<Func<IQueryable<Emprestimo>, IQueryable<Emprestimo>>?>()))
            .ReturnsAsync(Array.Empty<Emprestimo>());

        await fixture.Service.VerificarEmprestimosVencidosAsync();

        fixture.NotificationRepository.Verify(repository => repository.Criar(It.IsAny<Notificacao>()), Times.Never);
        fixture.UnitOfWork.Verify(unitOfWork => unitOfWork.CommitAsync(), Times.Never);
    }

    [Fact]
    public async Task VerificarEmprestimosVencidosSkipsLoansAlreadyRecentlyNotified()
    {
        var fixture = CreateFixture(new FixedTimeProvider(FixedInstant));
        var loan = CreateOverdueLoan();
        fixture.LoanRepository
            .Setup(repository => repository.ObterTodosAsync(
                It.IsAny<Expression<Func<Emprestimo, bool>>>(),
                It.IsAny<Func<IQueryable<Emprestimo>, IQueryable<Emprestimo>>?>()))
            .ReturnsAsync([loan]);
        fixture.NotificationRepository
            .Setup(repository => repository.ObterTodosAsync(
                It.IsAny<Expression<Func<Notificacao, bool>>>(),
                It.IsAny<Func<IQueryable<Notificacao>, IQueryable<Notificacao>>?>()))
            .ReturnsAsync([new Notificacao
            {
                Id = 1,
                TipoReferencia = "EmprestimoVencido",
                ReferenciaId = loan.Id,
                DataCriacao = FixedInstant.UtcDateTime
            }]);

        await fixture.Service.VerificarEmprestimosVencidosAsync();

        fixture.NotificationRepository.Verify(repository => repository.Criar(It.IsAny<Notificacao>()), Times.Never);
        fixture.UnitOfWork.Verify(unitOfWork => unitOfWork.CommitAsync(), Times.Never);
    }

    private static TestFixture CreateFixture(
        TimeProvider? timeProvider = null,
        IAuditoriaService? auditoriaService = null)
    {
        var unitOfWork = new Mock<IUnitOfWork>();
        var loanRepository = new Mock<IRepository<Emprestimo>>();
        var notificationRepository = new Mock<INotificacaoRepository>();
        var userRepository = new Mock<IRepository<Usuario>>();
        var productRepository = new Mock<IRepository<Produto>>();
        var mapper = new Mock<IMapper>();
        var logger = new Mock<ILogger<NotificacaoService>>();

        mapper
            .Setup(instance => instance.Map<Notificacao>(It.IsAny<CreateNotificacaoDTO>()))
            .Returns((CreateNotificacaoDTO dto) => new Notificacao
            {
                Titulo = dto.Titulo,
                Mensagem = dto.Mensagem,
                Tipo = dto.Tipo,
                UsuarioId = dto.UsuarioId,
                LinkAcao = dto.LinkAcao,
                ReferenciaId = dto.ReferenciaId,
                TipoReferencia = dto.TipoReferencia
            });
        mapper
            .Setup(instance => instance.Map<NotificacaoDTO>(It.IsAny<Notificacao>()))
            .Returns(new NotificacaoDTO());
        unitOfWork.SetupGet(current => current.EmprestimoRepository).Returns(loanRepository.Object);
        unitOfWork.SetupGet(current => current.NotificacaoRepository).Returns(notificationRepository.Object);
        unitOfWork.SetupGet(current => current.UsuarioRepository).Returns(userRepository.Object);
        unitOfWork.SetupGet(current => current.ProdutoRepository).Returns(productRepository.Object);
        unitOfWork.Setup(current => current.CommitAsync()).Returns(Task.CompletedTask);

        return new TestFixture(
            new NotificacaoService(
                unitOfWork.Object,
                mapper.Object,
                logger.Object,
                timeProvider ?? TimeProvider.System,
                auditoriaService),
            unitOfWork,
            loanRepository,
            notificationRepository,
            userRepository,
            productRepository);
    }

    private static Emprestimo CreateOverdueLoan()
    {
        var solicitante = CreateUser(5, "Solicitante do empréstimo");
        var firstProduct = new Produto
        {
            Id = 101,
            NomeProduto = "Reagente A",
            Quantidade = 10,
            QuantidadeMinima = 2,
            Status = StatusProduto.Disponivel
        };
        var secondProduct = new Produto
        {
            Id = 102,
            NomeProduto = "Reagente B",
            Quantidade = 8,
            QuantidadeMinima = 2,
            Status = StatusProduto.Disponivel
        };

        return new Emprestimo
        {
            Id = 700,
            DataRealizacao = FixedInstant.UtcDateTime.AddDays(-10),
            DataPrevistaDevolucao = FixedInstant.UtcDateTime.AddDays(-3),
            Status = StatusEmprestimo.Aprovado,
            SolicitanteId = solicitante.Id,
            Solicitante = solicitante,
            Produtos =
            [
                new ProdutoEmprestado { ProdutoId = firstProduct.Id, Produto = firstProduct },
                new ProdutoEmprestado { ProdutoId = secondProduct.Id, Produto = secondProduct }
            ]
        };
    }

    private static Usuario CreateUser(int id, string name)
    {
        return new Usuario
        {
            Id = id,
            NomeCompleto = name,
            Email = $"user{id}@example.test",
            SenhaHash = "hash",
            TipoUsuario = TipoUsuario.Administrador,
            Status = StatusUsuario.Habilitado,
            NivelUsuario = NivelUsuario.Administrador
        };
    }

    private static Usuario CreateUser(
        int id,
        string name,
        TipoUsuario type,
        NivelUsuario level) => new()
    {
        Id = id,
        NomeCompleto = name,
        Email = $"user{id}@example.test",
        SenhaHash = "hash",
        TipoUsuario = type,
        Status = StatusUsuario.Habilitado,
        NivelUsuario = level
    };

    private sealed class FixedTimeProvider(DateTimeOffset instant) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => instant;
    }

    private sealed record TestFixture(
        NotificacaoService Service,
        Mock<IUnitOfWork> UnitOfWork,
        Mock<IRepository<Emprestimo>> LoanRepository,
        Mock<INotificacaoRepository> NotificationRepository,
        Mock<IRepository<Usuario>> UserRepository,
        Mock<IRepository<Produto>> ProductRepository);
}
