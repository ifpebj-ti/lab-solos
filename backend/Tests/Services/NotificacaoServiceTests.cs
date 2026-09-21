using System.Linq.Expressions;
using AutoMapper;
using LabSolos_Server_DotNet8.DTOs.Notificacoes;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using Microsoft.Extensions.Logging;
using Moq;

namespace Tests.Services;

public sealed class NotificacaoServiceTests
{
    [Fact]
    public async Task VerificarEmprestimosVencidosAsyncCriaUmaNotificacaoPorAdministradorNaOrdemOriginal()
    {
        var fixture = CreateFixture();
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

        await fixture.Service.VerificarEmprestimosVencidosAsync();

        Assert.Equal(administrators.Length, createdNotifications.Count);
        Assert.Collection(
            createdNotifications,
            notification => Assert.Equal(administrators[0].Id, notification.UsuarioId),
            notification => Assert.Equal(administrators[1].Id, notification.UsuarioId),
            notification => Assert.Equal(administrators[2].Id, notification.UsuarioId));
        Assert.All(createdNotifications, notification =>
        {
            Assert.Equal(TipoNotificacao.Sistema, notification.Tipo);
            Assert.Equal(loan.Id, notification.ReferenciaId);
            Assert.Equal("EmprestimoVencido", notification.TipoReferencia);
            Assert.Equal($"/admin/history/loan/{loan.Id}", notification.LinkAcao);
            Assert.Contains(loan.Solicitante.NomeCompleto, notification.Mensagem);
            Assert.Contains("Reagente A, Reagente B", notification.Mensagem);
        });
        fixture.UnitOfWork.Verify(unitOfWork => unitOfWork.CommitAsync(), Times.Exactly(administrators.Length));
    }

    private static TestFixture CreateFixture()
    {
        var unitOfWork = new Mock<IUnitOfWork>();
        var loanRepository = new Mock<IRepository<Emprestimo>>();
        var notificationRepository = new Mock<INotificacaoRepository>();
        var userRepository = new Mock<IRepository<Usuario>>();
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
        unitOfWork.Setup(current => current.CommitAsync()).Returns(Task.CompletedTask);

        return new TestFixture(
            new NotificacaoService(unitOfWork.Object, mapper.Object, logger.Object, TimeProvider.System),
            unitOfWork,
            loanRepository,
            notificationRepository,
            userRepository);
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
            DataRealizacao = DateTime.UtcNow.AddDays(-10),
            DataPrevistaDevolucao = DateTime.UtcNow.AddDays(-3),
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
            Status = StatusUsuario.Habilitado
        };
    }

    private sealed record TestFixture(
        NotificacaoService Service,
        Mock<IUnitOfWork> UnitOfWork,
        Mock<IRepository<Emprestimo>> LoanRepository,
        Mock<INotificacaoRepository> NotificationRepository,
        Mock<IRepository<Usuario>> UserRepository);
}
