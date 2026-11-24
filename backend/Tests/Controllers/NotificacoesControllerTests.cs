using System.Security.Claims;
using System.Globalization;
using LabSolos_Server_DotNet8.Controllers;
using LabSolos_Server_DotNet8.DTOs.Notificacoes;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Services;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Tests.Controllers;

public sealed class NotificacoesControllerTests
{
    [Fact]
    public async Task ObterMinhasNotificacoesRetornaListaFiltrada()
    {
        var expected = new[] { new NotificacaoDTO { Id = 11, Titulo = "Aviso" } };
        var service = new Mock<INotificacaoService>();
        service
            .Setup(item => item.ObterNotificacoesUsuarioAsync(7, true))
            .ReturnsAsync(expected);
        var controller = CreateController(service);

        var result = await controller.ObterMinhasNotificacoes(true);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Same(expected, ok.Value);
    }

    [Fact]
    public async Task ObterMinhasNotificacoesSemUsuarioRetornaUnauthorized()
    {
        var service = new Mock<INotificacaoService>();
        var controller = CreateController(service, userId: null);

        var result = await controller.ObterMinhasNotificacoes();

        var unauthorized = Assert.IsType<UnauthorizedObjectResult>(result);
        Assert.Equal(StatusCodes.Status401Unauthorized, unauthorized.StatusCode);
        service.Verify(
            item => item.ObterNotificacoesUsuarioAsync(
                It.IsAny<int>(),
                It.IsAny<bool>()),
            Times.Never);
    }

    [Fact]
    public async Task ObterNotificacaoPertencenteRetornaDetalhes()
    {
        var expected = new NotificacaoDTO { Id = 11, Titulo = "Aviso" };
        var service = new Mock<INotificacaoService>();
        service.Setup(item => item.ObterNotificacaoDestinatarioAsync(11, 7)).ReturnsAsync(expected);
        var controller = CreateController(service);

        var result = await controller.ObterNotificacao(11);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Same(expected, ok.Value);
    }

    [Fact]
    public async Task ObterNotificacaoForaDoEscopoRetornaNotFoundSemDetalhes()
    {
        var service = new Mock<INotificacaoService>();
        service.Setup(item => item.ObterNotificacaoDestinatarioAsync(11, 7)).ReturnsAsync(default(NotificacaoDTO));
        var controller = CreateController(service);

        var result = await controller.ObterNotificacao(11);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task ObterNotificacaoSemIdentidadeRetornaUnauthorizedSemConsultarServico()
    {
        var service = new Mock<INotificacaoService>();
        var controller = CreateController(service, userId: null);

        var result = await controller.ObterNotificacao(11);

        Assert.IsType<UnauthorizedObjectResult>(result);
        service.Verify(item => item.ObterNotificacaoDestinatarioAsync(It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task ObterMinhasNotificacoesFalhaOperacionalRetornaErroInterno()
    {
        var service = new Mock<INotificacaoService>();
        service
            .Setup(item => item.ObterNotificacoesUsuarioAsync(7, false))
            .ThrowsAsync(new InvalidOperationException("Falha de consulta."));
        var controller = CreateController(service);

        var result = await controller.ObterMinhasNotificacoes();

        AssertInternalServerError(result);
    }

    [Fact]
    public async Task ObterMinhasNotificacoesFalhaInesperadaPropaga()
    {
        var expected = new ArgumentException("Identificador inválido.");
        var service = new Mock<INotificacaoService>();
        service
            .Setup(item => item.ObterNotificacoesUsuarioAsync(7, false))
            .ThrowsAsync(expected);
        var controller = CreateController(service);

        var actual = await Assert.ThrowsAsync<ArgumentException>(
            () => controller.ObterMinhasNotificacoes());

        Assert.Same(expected, actual);
    }

    [Fact]
    public async Task ContarNaoLidasRetornaContagem()
    {
        var service = new Mock<INotificacaoService>();
        service
            .Setup(item => item.ContarNaoLidasUsuarioAsync(7))
            .ReturnsAsync(3);
        var controller = CreateController(service);

        var result = await controller.ContarNaoLidas();

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(3, ok.Value!.GetType().GetProperty("count")!.GetValue(ok.Value));
    }

    [Fact]
    public async Task ContarNaoLidasFalhaOperacionalRetornaErroInterno()
    {
        var service = new Mock<INotificacaoService>();
        service
            .Setup(item => item.ContarNaoLidasUsuarioAsync(7))
            .ThrowsAsync(new InvalidOperationException("Falha de contagem."));
        var controller = CreateController(service);

        var result = await controller.ContarNaoLidas();

        AssertInternalServerError(result);
    }

    [Fact]
    public async Task ContarNaoLidasFalhaInesperadaPropaga()
    {
        var expected = new ArgumentException("Filtro inválido.");
        var service = new Mock<INotificacaoService>();
        service
            .Setup(item => item.ContarNaoLidasUsuarioAsync(7))
            .ThrowsAsync(expected);
        var controller = CreateController(service);

        var actual = await Assert.ThrowsAsync<ArgumentException>(
            () => controller.ContarNaoLidas());

        Assert.Same(expected, actual);
    }

    [Fact]
    public async Task CriarNotificacaoRetornaCreated()
    {
        var request = new CreateNotificacaoDTO { Titulo = "Aviso" };
        var expected = new NotificacaoDTO { Id = 12, Titulo = request.Titulo };
        var service = new Mock<INotificacaoService>();
        service
            .Setup(item => item.CriarNotificacaoManualAsync(request, 7))
            .ReturnsAsync(expected);
        var controller = CreateController(service);

        var result = await controller.CriarNotificacao(request);

        var created = Assert.IsType<CreatedAtActionResult>(result);
        Assert.Equal(nameof(NotificacoesController.ObterMinhasNotificacoes), created.ActionName);
        Assert.Same(expected, created.Value);
        service.Verify(item => item.CriarNotificacaoManualAsync(request, 7), Times.Once);
        service.Verify(item => item.CriarNotificacaoAsync(It.IsAny<CreateNotificacaoDTO>()), Times.Never);
    }

    [Fact]
    public async Task CriarNotificacaoSemIdentidadeRetornaUnauthorizedSemEmitir()
    {
        var service = new Mock<INotificacaoService>();
        var controller = CreateController(service, userId: null);

        var result = await controller.CriarNotificacao(new CreateNotificacaoDTO());

        Assert.IsType<UnauthorizedObjectResult>(result);
        service.Verify(item => item.CriarNotificacaoManualAsync(
            It.IsAny<CreateNotificacaoDTO>(), It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task CriarNotificacaoAcimaDaCotaRetorna429ComRetryAfter()
    {
        var service = new Mock<INotificacaoService>();
        service.Setup(item => item.CriarNotificacaoManualAsync(It.IsAny<CreateNotificacaoDTO>(), 7))
            .ThrowsAsync(new NotificationQuotaExceededException(71));
        var controller = CreateController(service);

        var result = await controller.CriarNotificacao(new CreateNotificacaoDTO());

        var limited = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status429TooManyRequests, limited.StatusCode);
        Assert.Equal("71", controller.Response.Headers.RetryAfter);
        Assert.True(controller.Response.Headers.CacheControl == "no-store");
    }

    [Fact]
    public async Task CriarNotificacaoComCotaIndisponivelRetorna503()
    {
        var service = new Mock<INotificacaoService>();
        service.Setup(item => item.CriarNotificacaoManualAsync(It.IsAny<CreateNotificacaoDTO>(), 7))
            .ThrowsAsync(new NotificationQuotaUnavailableException());
        var controller = CreateController(service);

        var result = await controller.CriarNotificacao(new CreateNotificacaoDTO());

        var unavailable = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, unavailable.StatusCode);
        Assert.True(controller.Response.Headers.CacheControl == "no-store");
    }

    [Fact]
    public void ExcluirNotificacaoExpõeDeleteProtegidoPorAdministrador()
    {
        var action = typeof(NotificacoesController).GetMethod("ExcluirNotificacao");

        Assert.NotNull(action);
        Assert.Contains(action!.GetCustomAttributes(typeof(HttpDeleteAttribute), inherit: true), attribute =>
            Assert.IsType<HttpDeleteAttribute>(attribute).Template == "{id:int}");
        Assert.Contains(action.GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true), attribute =>
            Assert.IsType<AuthorizeAttribute>(attribute).Policy == "ApenasAdministradores");
    }

    [Fact]
    public async Task CriarNotificacaoFalhaDePersistenciaRetornaErroInterno()
    {
        var request = new CreateNotificacaoDTO { Titulo = "Aviso" };
        var service = new Mock<INotificacaoService>();
        service
            .Setup(item => item.CriarNotificacaoManualAsync(request, 7))
            .ThrowsAsync(new DbUpdateException("Falha de persistência."));
        var controller = CreateController(service);

        var result = await controller.CriarNotificacao(request);

        AssertInternalServerError(result);
    }

    [Fact]
    public async Task CriarNotificacaoFalhaInesperadaPropaga()
    {
        var expected = new ArgumentException("Dados inválidos.");
        var request = new CreateNotificacaoDTO { Titulo = "Aviso" };
        var service = new Mock<INotificacaoService>();
        service
            .Setup(item => item.CriarNotificacaoManualAsync(request, 7))
            .ThrowsAsync(expected);
        var controller = CreateController(service);

        var actual = await Assert.ThrowsAsync<ArgumentException>(
            () => controller.CriarNotificacao(request));

        Assert.Same(expected, actual);
    }

    [Fact]
    public async Task ExcluirNotificacaoRetornaNoContentEUsaAdministradorAutenticado()
    {
        var service = new Mock<INotificacaoService>();
        service.Setup(item => item.ExcluirNotificacaoAsync(12, 7)).ReturnsAsync(true);
        var controller = CreateController(service);

        var result = await controller.ExcluirNotificacao(12);

        Assert.IsType<NoContentResult>(result);
        service.Verify(item => item.ExcluirNotificacaoAsync(12, 7), Times.Once);
    }

    [Fact]
    public async Task ExcluirNotificacaoInexistenteRetornaNotFound()
    {
        var service = new Mock<INotificacaoService>();
        service.Setup(item => item.ExcluirNotificacaoAsync(12, 7)).ReturnsAsync(false);
        var controller = CreateController(service);

        var result = await controller.ExcluirNotificacao(12);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task MarcarComoLidaRetornaOkQuandoPermitido()
    {
        var service = new Mock<INotificacaoService>();
        service
            .Setup(item => item.MarcarComoLidaComVerificacaoAsync(11, 7))
            .ReturnsAsync(true);
        var controller = CreateController(service);

        var result = await controller.MarcarComoLida(11);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(
            "Notificação marcada como lida",
            ok.Value!.GetType().GetProperty("message")!.GetValue(ok.Value));
    }

    [Fact]
    public async Task MarcarComoLidaRetornaForbidQuandoNaoPermitido()
    {
        var service = new Mock<INotificacaoService>();
        service
            .Setup(item => item.MarcarComoLidaComVerificacaoAsync(11, 7))
            .ReturnsAsync(false);
        var controller = CreateController(service);

        var result = await controller.MarcarComoLida(11);

        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task MarcarComoLidaFalhaDePersistenciaRetornaErroInterno()
    {
        var service = new Mock<INotificacaoService>();
        service
            .Setup(item => item.MarcarComoLidaComVerificacaoAsync(11, 7))
            .ThrowsAsync(new DbUpdateException("Falha de persistência."));
        var controller = CreateController(service);

        var result = await controller.MarcarComoLida(11);

        AssertInternalServerError(result);
    }

    [Fact]
    public async Task MarcarComoLidaFalhaInesperadaPropaga()
    {
        var expected = new ArgumentException("Identificador inválido.");
        var service = new Mock<INotificacaoService>();
        service
            .Setup(item => item.MarcarComoLidaComVerificacaoAsync(11, 7))
            .ThrowsAsync(expected);
        var controller = CreateController(service);

        var actual = await Assert.ThrowsAsync<ArgumentException>(
            () => controller.MarcarComoLida(11));

        Assert.Same(expected, actual);
    }

    [Fact]
    public async Task MarcarVariasComoLidasSemIdsRetornaBadRequest()
    {
        var service = new Mock<INotificacaoService>();
        var controller = CreateController(service);

        var result = await controller.MarcarVariasComoLidas(new MarcarLidaDTO());

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, badRequest.StatusCode);
        service.Verify(
            item => item.MarcarVariasComoLidaComVerificacaoAsync(
                It.IsAny<int[]>(),
                It.IsAny<int>()),
            Times.Never);
    }

    [Fact]
    public async Task MarcarVariasComoLidasRetornaQuantidadeMarcada()
    {
        var ids = new[] { 11, 12 };
        var service = new Mock<INotificacaoService>();
        service
            .Setup(item => item.MarcarVariasComoLidaComVerificacaoAsync(ids, 7))
            .ReturnsAsync(2);
        var controller = CreateController(service);

        var result = await controller.MarcarVariasComoLidas(new MarcarLidaDTO { NotificacaoIds = ids });

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(
            "2 notificações marcadas como lidas",
            ok.Value!.GetType().GetProperty("message")!.GetValue(ok.Value));
    }

    [Theory]
    [InlineData(null)]
    [InlineData(0)]
    [InlineData(2)]
    public async Task MarcarVariasComoLidasSemUsuarioRetornaUnauthorizedAntesDeValidarIds(int? notificationCount)
    {
        var ids = notificationCount is { } count ? Enumerable.Range(11, count).ToArray() : null;
        var service = new Mock<INotificacaoService>();
        var controller = CreateController(service, userId: null);

        var result = await controller.MarcarVariasComoLidas(new MarcarLidaDTO { NotificacaoIds = ids! });

        Assert.IsType<UnauthorizedObjectResult>(result);
        service.Verify(item => item.MarcarVariasComoLidaComVerificacaoAsync(
            It.IsAny<int[]>(), It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task MarcarVariasComoLidasForaDoEscopoRecusaLoteInteiro()
    {
        var ids = new[] { 11, 12 };
        var service = new Mock<INotificacaoService>();
        service
            .Setup(item => item.MarcarVariasComoLidaComVerificacaoAsync(ids, 7))
            .ThrowsAsync(new UnauthorizedAccessException("A solicitação não pode ser concluída."));
        var controller = CreateController(service);

        var result = await controller.MarcarVariasComoLidas(new MarcarLidaDTO { NotificacaoIds = ids });

        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task MarcarVariasComoLidasFalhaDePersistenciaRetornaErroInterno()
    {
        var ids = new[] { 11, 12 };
        var service = new Mock<INotificacaoService>();
        service
            .Setup(item => item.MarcarVariasComoLidaComVerificacaoAsync(ids, 7))
            .ThrowsAsync(new DbUpdateException("Falha de persistência."));
        var controller = CreateController(service);

        var result = await controller.MarcarVariasComoLidas(new MarcarLidaDTO { NotificacaoIds = ids });

        AssertInternalServerError(result);
    }

    [Fact]
    public async Task MarcarVariasComoLidasFalhaInesperadaPropaga()
    {
        var expected = new ArgumentException("Identificadores inválidos.");
        var ids = new[] { 11, 12 };
        var service = new Mock<INotificacaoService>();
        service
            .Setup(item => item.MarcarVariasComoLidaComVerificacaoAsync(ids, 7))
            .ThrowsAsync(expected);
        var controller = CreateController(service);

        var actual = await Assert.ThrowsAsync<ArgumentException>(
            () => controller.MarcarVariasComoLidas(new MarcarLidaDTO { NotificacaoIds = ids }));

        Assert.Same(expected, actual);
    }

    [Fact]
    public async Task GerarNotificacoesAutomaticasRetornaOk()
    {
        var service = new Mock<INotificacaoService>();
        var controller = CreateController(service);

        var result = await controller.GerarNotificacoesAutomaticas();

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(
            "Notificações automáticas geradas com sucesso",
            ok.Value!.GetType().GetProperty("message")!.GetValue(ok.Value));
        service.Verify(item => item.GerarNotificacoesAutomaticasAsync(), Times.Once);
    }

    [Fact]
    public async Task GerarNotificacoesAutomaticasFalhaDePersistenciaRetornaErroInterno()
    {
        var service = new Mock<INotificacaoService>();
        service
            .Setup(item => item.GerarNotificacoesAutomaticasAsync())
            .ThrowsAsync(new DbUpdateException("Falha de persistência."));
        var controller = CreateController(service);

        var result = await controller.GerarNotificacoesAutomaticas();

        AssertInternalServerError(result);
    }

    [Fact]
    public async Task GerarNotificacoesAutomaticasComCotaExcedidaRetorna429()
    {
        var service = new Mock<INotificacaoService>();
        service.Setup(item => item.GerarNotificacoesAutomaticasAsync())
            .ThrowsAsync(new NotificationQuotaExceededException(30));
        var controller = CreateController(service);

        var result = await controller.GerarNotificacoesAutomaticas();

        Assert.Equal(StatusCodes.Status429TooManyRequests, Assert.IsType<ObjectResult>(result).StatusCode);
        Assert.Equal("30", controller.Response.Headers.RetryAfter);
    }

    [Fact]
    public async Task GerarNotificacoesAutomaticasComCotaIndisponivelRetorna503()
    {
        var service = new Mock<INotificacaoService>();
        service.Setup(item => item.GerarNotificacoesAutomaticasAsync())
            .ThrowsAsync(new NotificationQuotaUnavailableException());
        var controller = CreateController(service);

        var result = await controller.GerarNotificacoesAutomaticas();

        Assert.Equal(StatusCodes.Status503ServiceUnavailable, Assert.IsType<ObjectResult>(result).StatusCode);
    }

    [Fact]
    public async Task VerificarEmprestimosVencidosComCotaIndisponivelRetorna503()
    {
        var service = new Mock<INotificacaoService>();
        service.Setup(item => item.VerificarEmprestimosVencidosAsync())
            .ThrowsAsync(new NotificationQuotaUnavailableException());
        var controller = CreateController(service);

        var result = await controller.VerificarEmprestimosVencidos();

        Assert.Equal(StatusCodes.Status503ServiceUnavailable, Assert.IsType<ObjectResult>(result).StatusCode);
    }

    [Fact]
    public async Task VerificarEmprestimosVencidosComCotaExcedidaRetorna429()
    {
        var service = new Mock<INotificacaoService>();
        service.Setup(item => item.VerificarEmprestimosVencidosAsync())
            .ThrowsAsync(new NotificationQuotaExceededException(45));
        var controller = CreateController(service);

        var result = await controller.VerificarEmprestimosVencidos();

        Assert.Equal(StatusCodes.Status429TooManyRequests, Assert.IsType<ObjectResult>(result).StatusCode);
        Assert.Equal("45", controller.Response.Headers.RetryAfter);
    }

    [Fact]
    public async Task GerarNotificacoesAutomaticasFalhaInesperadaPropaga()
    {
        var expected = new ArgumentException("Parâmetro inválido.");
        var service = new Mock<INotificacaoService>();
        service
            .Setup(item => item.GerarNotificacoesAutomaticasAsync())
            .ThrowsAsync(expected);
        var controller = CreateController(service);

        var actual = await Assert.ThrowsAsync<ArgumentException>(
            () => controller.GerarNotificacoesAutomaticas());

        Assert.Same(expected, actual);
    }

    [Fact]
    public async Task VerificarEmprestimosVencidosRetornaOk()
    {
        var service = new Mock<INotificacaoService>();
        var controller = CreateController(service);

        var result = await controller.VerificarEmprestimosVencidos();

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(
            "Verificação de empréstimos vencidos executada com sucesso",
            ok.Value!.GetType().GetProperty("message")!.GetValue(ok.Value));
        service.Verify(item => item.VerificarEmprestimosVencidosAsync(), Times.Once);
    }

    [Fact]
    public async Task VerificarEmprestimosVencidosFalhaDePersistenciaRetornaErroInterno()
    {
        var service = new Mock<INotificacaoService>();
        service
            .Setup(item => item.VerificarEmprestimosVencidosAsync())
            .ThrowsAsync(new DbUpdateException("Falha de persistência."));
        var controller = CreateController(service);

        var result = await controller.VerificarEmprestimosVencidos();

        AssertInternalServerError(result);
    }

    [Fact]
    public async Task VerificarEmprestimosVencidosFalhaInesperadaPropaga()
    {
        var expected = new ArgumentException("Parâmetro inválido.");
        var service = new Mock<INotificacaoService>();
        service
            .Setup(item => item.VerificarEmprestimosVencidosAsync())
            .ThrowsAsync(expected);
        var controller = CreateController(service);

        var actual = await Assert.ThrowsAsync<ArgumentException>(
            () => controller.VerificarEmprestimosVencidos());

        Assert.Same(expected, actual);
    }

    private static void AssertInternalServerError(IActionResult result)
    {
        var error = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status500InternalServerError, error.StatusCode);
        Assert.Equal("Erro interno do servidor", error.Value);
    }

    private static NotificacoesController CreateController(
        Mock<INotificacaoService> service,
        int? userId = 7)
    {
        var claims = new List<Claim>();
        if (userId.HasValue)
        {
            claims.Add(new Claim(
                ClaimTypes.NameIdentifier,
                userId.Value.ToString(CultureInfo.InvariantCulture)));
        }

        var controller = new NotificacoesController(
            service.Object,
            NullLogger<NotificacoesController>.Instance)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"))
                }
            }
        };

        return controller;
    }
}
