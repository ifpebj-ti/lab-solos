using LabSolos_Server_DotNet8.Controllers;
using LabSolos_Server_DotNet8.DTOs.Auditoria;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using LabSolos_Server_DotNet8.Services;
using Moq;
using System.Security.Claims;

namespace Tests.Controllers;

public sealed class AuditoriaControllerTests
{
    [Fact]
    public async Task RegistrarLogRetornaOkQuandoServicoConclui()
    {
        var request = CreateLogRequest();
        var service = new Mock<IAuditoriaService>();
        service
            .Setup(item => item.RegistrarLogAsync(
                request,
                7,
                It.IsAny<string?>(),
                It.IsAny<string?>()))
            .Returns(Task.CompletedTask);
        var controller = CreateController(service);

        var result = await controller.RegistrarLog(request);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(StatusCodes.Status200OK, ok.StatusCode);
        service.Verify(item => item.RegistrarLogAsync(
            request,
            7,
            It.IsAny<string?>(),
            It.IsAny<string?>()), Times.Once);
    }

    [Fact]
    public async Task RegistrarLogFalhaOperacionalRetornaBadRequestSemDetalhes()
    {
        var request = CreateLogRequest();
        var service = new Mock<IAuditoriaService>();
        service
            .Setup(item => item.RegistrarLogAsync(
                request,
                7,
                It.IsAny<string?>(),
                It.IsAny<string?>()))
            .ThrowsAsync(new DbUpdateException("detalhe de persistencia"));
        var controller = CreateController(service);

        var result = await controller.RegistrarLog(request);

        AssertBadRequestWithoutDetails(result, "detalhe de persistencia");
    }

    [Fact]
    public async Task RegistrarLogFalhaInesperadaPropaga()
    {
        var request = CreateLogRequest();
        var expected = new ArgumentException("falha inesperada");
        var service = new Mock<IAuditoriaService>();
        service
            .Setup(item => item.RegistrarLogAsync(
                request,
                7,
                It.IsAny<string?>(),
                It.IsAny<string?>()))
            .ThrowsAsync(expected);
        var controller = CreateController(service);

        var actual = await Assert.ThrowsAsync<ArgumentException>(
            () => controller.RegistrarLog(request));

        Assert.Same(expected, actual);
    }

    [Fact]
    public async Task ObterLogsRetornaListaDoServico()
    {
        var filter = new FiltroAuditoriaDTO { Pagina = 2 };
        var expected = Array.Empty<LogAuditoriaDTO>();
        var service = new Mock<IAuditoriaService>();
        service
            .Setup(item => item.ObterLogsFiltradosAsync(filter))
            .ReturnsAsync(expected);
        var controller = CreateController(service);

        var result = await controller.ObterLogs(filter);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Same(expected, ok.Value);
    }

    [Fact]
    public async Task ObterLogsFalhaOperacionalRetornaBadRequestSemDetalhes()
    {
        var filter = new FiltroAuditoriaDTO();
        var service = new Mock<IAuditoriaService>();
        service
            .Setup(item => item.ObterLogsFiltradosAsync(filter))
            .ThrowsAsync(new InvalidOperationException("detalhe de consulta"));
        var controller = CreateController(service);

        var result = await controller.ObterLogs(filter);

        AssertBadRequestWithoutDetails(result, "detalhe de consulta");
    }

    [Fact]
    public async Task ObterLogsFalhaInesperadaPropaga()
    {
        var filter = new FiltroAuditoriaDTO();
        var expected = new ArgumentException("filtro inesperado");
        var service = new Mock<IAuditoriaService>();
        service
            .Setup(item => item.ObterLogsFiltradosAsync(filter))
            .ThrowsAsync(expected);
        var controller = CreateController(service);

        var actual = await Assert.ThrowsAsync<ArgumentException>(
            () => controller.ObterLogs(filter));

        Assert.Same(expected, actual);
    }

    [Fact]
    public async Task GerarRelatorioRetornaRelatorioDoServico()
    {
        var start = new DateTime(2026, 9, 1);
        var end = new DateTime(2026, 9, 20);
        var expected = new RelatorioAuditoriaDTO();
        var service = new Mock<IAuditoriaService>();
        service
            .Setup(item => item.GerarRelatorioAsync(start, end))
            .ReturnsAsync(expected);
        var controller = CreateController(service);

        var result = await controller.GerarRelatorio(start, end);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Same(expected, ok.Value);
    }

    [Fact]
    public async Task GerarRelatorioFalhaOperacionalRetornaBadRequestSemDetalhes()
    {
        var start = new DateTime(2026, 9, 1);
        var end = new DateTime(2026, 9, 20);
        var service = new Mock<IAuditoriaService>();
        service
            .Setup(item => item.GerarRelatorioAsync(start, end))
            .ThrowsAsync(new InvalidOperationException("detalhe de relatorio"));
        var controller = CreateController(service);

        var result = await controller.GerarRelatorio(start, end);

        AssertBadRequestWithoutDetails(result, "detalhe de relatorio");
    }

    [Fact]
    public async Task GerarRelatorioFalhaInesperadaPropaga()
    {
        var start = new DateTime(2026, 9, 1);
        var end = new DateTime(2026, 9, 20);
        var expected = new ArgumentException("periodo inesperado");
        var service = new Mock<IAuditoriaService>();
        service
            .Setup(item => item.GerarRelatorioAsync(start, end))
            .ThrowsAsync(expected);
        var controller = CreateController(service);

        var actual = await Assert.ThrowsAsync<ArgumentException>(
            () => controller.GerarRelatorio(start, end));

        Assert.Same(expected, actual);
    }

    [Fact]
    public async Task MarcarComoSuspeitoRetornaOk()
    {
        var service = new Mock<IAuditoriaService>();
        service
            .Setup(item => item.MarcarComoSuspeitoAsync(11, "motivo"))
            .Returns(Task.CompletedTask);
        var controller = CreateController(service);

        var result = await controller.MarcarComoSuspeito(11, "motivo");

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task MarcarComoSuspeitoFalhaOperacionalRetornaBadRequestSemDetalhes()
    {
        var service = new Mock<IAuditoriaService>();
        service
            .Setup(item => item.MarcarComoSuspeitoAsync(11, "motivo"))
            .ThrowsAsync(new DbUpdateException("detalhe de persistencia suspeito"));
        var controller = CreateController(service);

        var result = await controller.MarcarComoSuspeito(11, "motivo");

        AssertBadRequestWithoutDetails(result, "detalhe de persistencia suspeito");
    }

    [Fact]
    public async Task MarcarComoSuspeitoFalhaInesperadaPropaga()
    {
        var expected = new ArgumentException("log inesperado");
        var service = new Mock<IAuditoriaService>();
        service
            .Setup(item => item.MarcarComoSuspeitoAsync(11, "motivo"))
            .ThrowsAsync(expected);
        var controller = CreateController(service);

        var actual = await Assert.ThrowsAsync<ArgumentException>(
            () => controller.MarcarComoSuspeito(11, "motivo"));

        Assert.Same(expected, actual);
    }

    [Fact]
    public async Task MarcarComoNaoSuspeitoRetornaOk()
    {
        var service = new Mock<IAuditoriaService>();
        service
            .Setup(item => item.MarcarComoNaoSuspeitoAsync(11))
            .Returns(Task.CompletedTask);
        var controller = CreateController(service);

        var result = await controller.MarcarComoNaoSuspeito(11);

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task MarcarComoNaoSuspeitoFalhaOperacionalRetornaBadRequestSemDetalhes()
    {
        var service = new Mock<IAuditoriaService>();
        service
            .Setup(item => item.MarcarComoNaoSuspeitoAsync(11))
            .ThrowsAsync(new DbUpdateException("detalhe de persistencia nao suspeito"));
        var controller = CreateController(service);

        var result = await controller.MarcarComoNaoSuspeito(11);

        AssertBadRequestWithoutDetails(result, "detalhe de persistencia nao suspeito");
    }

    [Fact]
    public async Task MarcarComoNaoSuspeitoFalhaInesperadaPropaga()
    {
        var expected = new ArgumentException("log inesperado");
        var service = new Mock<IAuditoriaService>();
        service
            .Setup(item => item.MarcarComoNaoSuspeitoAsync(11))
            .ThrowsAsync(expected);
        var controller = CreateController(service);

        var actual = await Assert.ThrowsAsync<ArgumentException>(
            () => controller.MarcarComoNaoSuspeito(11));

        Assert.Same(expected, actual);
    }

    [Fact]
    public async Task VerificarAtividadeSuspeitaRetornaResultado()
    {
        var service = new Mock<IAuditoriaService>();
        service
            .Setup(item => item.VerificarAtividadeSuspeitaAsync(7, "127.0.0.1"))
            .ReturnsAsync(true);
        var controller = CreateController(service);

        var result = await controller.VerificarAtividadeSuspeita(7);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(true, ok.Value!.GetType().GetProperty("suspeita")!.GetValue(ok.Value));
    }

    [Fact]
    public async Task VerificarAtividadeSuspeitaFalhaOperacionalRetornaBadRequestSemDetalhes()
    {
        var service = new Mock<IAuditoriaService>();
        service
            .Setup(item => item.VerificarAtividadeSuspeitaAsync(7, "127.0.0.1"))
            .ThrowsAsync(new InvalidOperationException("detalhe de atividade"));
        var controller = CreateController(service);

        var result = await controller.VerificarAtividadeSuspeita(7);

        AssertBadRequestWithoutDetails(result, "detalhe de atividade");
    }

    [Fact]
    public async Task VerificarAtividadeSuspeitaFalhaInesperadaPropaga()
    {
        var expected = new ArgumentException("usuario inesperado");
        var service = new Mock<IAuditoriaService>();
        service
            .Setup(item => item.VerificarAtividadeSuspeitaAsync(7, "127.0.0.1"))
            .ThrowsAsync(expected);
        var controller = CreateController(service);

        var actual = await Assert.ThrowsAsync<ArgumentException>(
            () => controller.VerificarAtividadeSuspeita(7));

        Assert.Same(expected, actual);
    }

    [Fact]
    public async Task ProcessarDeteccaoRetornaOk()
    {
        var service = new Mock<IAuditoriaService>();
        service
            .Setup(item => item.ProcessarDeteccaoAutomaticaAsync())
            .Returns(Task.CompletedTask);
        var controller = CreateController(service);

        var result = await controller.ProcessarDeteccaoAutomatica();

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task ProcessarDeteccaoFalhaOperacionalRetornaBadRequestSemDetalhes()
    {
        var service = new Mock<IAuditoriaService>();
        service
            .Setup(item => item.ProcessarDeteccaoAutomaticaAsync())
            .ThrowsAsync(new InvalidOperationException("detalhe de deteccao"));
        var controller = CreateController(service);

        var result = await controller.ProcessarDeteccaoAutomatica();

        AssertBadRequestWithoutDetails(result, "detalhe de deteccao");
    }

    [Fact]
    public async Task ProcessarDeteccaoFalhaInesperadaPropaga()
    {
        var expected = new ArgumentException("deteccao inesperada");
        var service = new Mock<IAuditoriaService>();
        service
            .Setup(item => item.ProcessarDeteccaoAutomaticaAsync())
            .ThrowsAsync(expected);
        var controller = CreateController(service);

        var actual = await Assert.ThrowsAsync<ArgumentException>(
            () => controller.ProcessarDeteccaoAutomatica());

        Assert.Same(expected, actual);
    }

    private static CreateLogAuditoriaDTO CreateLogRequest() => new()
    {
        Acao = "consulta",
        Recurso = "auditoria"
    };

    private static void AssertBadRequestWithoutDetails(IActionResult result, string detail)
    {
        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, badRequest.StatusCode);
        Assert.DoesNotContain(detail, badRequest.Value?.ToString(), StringComparison.Ordinal);
    }

    private static AuditoriaController CreateController(Mock<IAuditoriaService> service)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "7")
        };

        return new AuditoriaController(service.Object, NullLogger<AuditoriaController>.Instance)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"))
                }
            }
        };
    }
}
