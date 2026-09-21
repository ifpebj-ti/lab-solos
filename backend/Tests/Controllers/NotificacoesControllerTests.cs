using System.Security.Claims;
using System.Globalization;
using LabSolos_Server_DotNet8.Controllers;
using LabSolos_Server_DotNet8.DTOs.Notificacoes;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Services;
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
            .Setup(item => item.ObterNotificacoesFiltradas(7, "Usuario", true))
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
            item => item.ObterNotificacoesFiltradas(
                It.IsAny<int>(),
                It.IsAny<string>(),
                It.IsAny<bool>()),
            Times.Never);
    }

    [Fact]
    public async Task ObterMinhasNotificacoesFalhaOperacionalRetornaErroInterno()
    {
        var service = new Mock<INotificacaoService>();
        service
            .Setup(item => item.ObterNotificacoesFiltradas(7, "Usuario", false))
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
            .Setup(item => item.ObterNotificacoesFiltradas(7, "Usuario", false))
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
            .Setup(item => item.ContarNaoLidasFiltradas(7, "Usuario"))
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
            .Setup(item => item.ContarNaoLidasFiltradas(7, "Usuario"))
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
            .Setup(item => item.ContarNaoLidasFiltradas(7, "Usuario"))
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
            .Setup(item => item.CriarNotificacaoAsync(request))
            .ReturnsAsync(expected);
        var controller = CreateController(service);

        var result = await controller.CriarNotificacao(request);

        var created = Assert.IsType<CreatedAtActionResult>(result);
        Assert.Equal(nameof(NotificacoesController.ObterMinhasNotificacoes), created.ActionName);
        Assert.Same(expected, created.Value);
    }

    [Fact]
    public async Task CriarNotificacaoFalhaDePersistenciaRetornaErroInterno()
    {
        var request = new CreateNotificacaoDTO { Titulo = "Aviso" };
        var service = new Mock<INotificacaoService>();
        service
            .Setup(item => item.CriarNotificacaoAsync(request))
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
            .Setup(item => item.CriarNotificacaoAsync(request))
            .ThrowsAsync(expected);
        var controller = CreateController(service);

        var actual = await Assert.ThrowsAsync<ArgumentException>(
            () => controller.CriarNotificacao(request));

        Assert.Same(expected, actual);
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
        int? userId = 7,
        string userLevel = "Usuario")
    {
        var claims = new List<Claim>();
        if (userId.HasValue)
        {
            claims.Add(new Claim(
                ClaimTypes.NameIdentifier,
                userId.Value.ToString(CultureInfo.InvariantCulture)));
            claims.Add(new Claim("NivelUsuario", userLevel));
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
