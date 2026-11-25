using LabSolos_Server_DotNet8.Controllers;
using LabSolos_Server_DotNet8.DTOs.Auditoria;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.DTOs.Paginacao;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using LabSolos_Server_DotNet8.Services;
using LabSolos_Server_DotNet8.Services.Security;
using Moq;
using System.Security.Claims;

namespace Tests.Controllers;

public sealed class AuditoriaControllerTests
{
    [Fact]
    public void RegistrarLogRetornaGoneSemAceitarEventoDoCliente()
    {
        var service = new Mock<IAuditoriaService>();
        var controller = CreateController(service);

        var result = controller.RegistrarLog();

        var gone = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status410Gone, gone.StatusCode);
        service.VerifyNoOtherCalls();
    }

    [Fact]
    public void RegistrarLogNaoRetornaConteudoDeAuditoria()
    {
        var service = new Mock<IAuditoriaService>();
        var controller = CreateController(service);

        var result = controller.RegistrarLog();

        var gone = Assert.IsType<ObjectResult>(result);
        Assert.DoesNotContain("CANARY", gone.Value?.ToString(), StringComparison.Ordinal);
        service.VerifyNoOtherCalls();
    }

    [Fact]
    public void RegistrarLogNaoChamaServico()
    {
        var service = new Mock<IAuditoriaService>();
        var controller = CreateController(service);

        var result = controller.RegistrarLog();

        Assert.Equal(StatusCodes.Status410Gone, Assert.IsType<ObjectResult>(result).StatusCode);
        service.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task ObterLogsRetornaListaDoServico()
    {
        var filter = new FiltroAuditoriaDTO { Pagina = 2 };
        var expected = new ResultadoPaginado<AuditLogProjectionDTO>(Array.Empty<AuditLogProjectionDTO>(), 1, 25, 0, 0);
        var service = new Mock<IAuditoriaService>();
        var policy = CreatePolicy();
        policy.Setup(item => item.ConsultarAsync(filter, It.IsAny<ParametrosPaginacao>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);
        var controller = CreateController(service, policy);

        var result = await controller.ObterLogs(filter, null, null);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Same(expected, ok.Value);
    }

    [Fact]
    public async Task ObterLogsFalhaOperacionalRetornaBadRequestSemDetalhes()
    {
        var filter = new FiltroAuditoriaDTO();
        var service = new Mock<IAuditoriaService>();
        var policy = CreatePolicy();
        policy
            .Setup(item => item.ConsultarAsync(filter, It.IsAny<ParametrosPaginacao>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("detalhe de consulta"));
        var controller = CreateController(service, policy);

        var result = await controller.ObterLogs(filter, null, null);

        AssertBadRequestWithoutDetails(result, "detalhe de consulta");
    }

    [Fact]
    public async Task ObterLogsFalhaInesperadaPropaga()
    {
        var filter = new FiltroAuditoriaDTO();
        var expected = new ArgumentException("filtro inesperado");
        var service = new Mock<IAuditoriaService>();
        var policy = CreatePolicy();
        policy
            .Setup(item => item.ConsultarAsync(filter, It.IsAny<ParametrosPaginacao>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(expected);
        var controller = CreateController(service, policy);

        var actual = await Assert.ThrowsAsync<ArgumentException>(
            () => controller.ObterLogs(filter, null, null));

        Assert.Same(expected, actual);
    }

    [Fact]
    public async Task GerarRelatorioRetornaRelatorioDoServico()
    {
        var start = new DateTime(2026, 9, 1);
        var end = new DateTime(2026, 9, 20);
        var expected = new RelatorioAuditoriaDTO();
        var service = new Mock<IAuditoriaService>();
        var filter = new FiltroAuditoriaDTO { DataInicio = start, DataFim = end };
        var policy = CreatePolicy();
        policy.Setup(item => item.GerarRelatorioAsync(filter, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);
        var controller = CreateController(service, policy);

        var result = await controller.GerarRelatorio(filter);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Same(expected, ok.Value);
    }

    [Fact]
    public async Task GerarRelatorioFalhaOperacionalRetornaBadRequestSemDetalhes()
    {
        var start = new DateTime(2026, 9, 1);
        var end = new DateTime(2026, 9, 20);
        var service = new Mock<IAuditoriaService>();
        var filter = new FiltroAuditoriaDTO { DataInicio = start, DataFim = end };
        var policy = CreatePolicy();
        policy
            .Setup(item => item.GerarRelatorioAsync(filter, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("detalhe de relatorio"));
        var controller = CreateController(service, policy);

        var result = await controller.GerarRelatorio(filter);

        AssertBadRequestWithoutDetails(result, "detalhe de relatorio");
    }

    [Fact]
    public async Task GerarRelatorioFalhaInesperadaPropaga()
    {
        var start = new DateTime(2026, 9, 1);
        var end = new DateTime(2026, 9, 20);
        var expected = new ArgumentException("periodo inesperado");
        var service = new Mock<IAuditoriaService>();
        var filter = new FiltroAuditoriaDTO { DataInicio = start, DataFim = end };
        var policy = CreatePolicy();
        policy
            .Setup(item => item.GerarRelatorioAsync(filter, It.IsAny<CancellationToken>()))
            .ThrowsAsync(expected);
        var controller = CreateController(service, policy);

        var actual = await Assert.ThrowsAsync<ArgumentException>(
            () => controller.GerarRelatorio(filter));

        Assert.Same(expected, actual);
    }

    [Fact]
    public async Task MarcarComoSuspeitoRetornaOk()
    {
        var service = new Mock<IAuditoriaService>();
        service
            .Setup(item => item.ReclassificarClassificacaoAsync(11, 7, 0, true, "motivo"))
            .ReturnsAsync(new AuditClassificationRevision { NumeroRevisao = 1 });
        var controller = CreateController(service);

        var result = await controller.MarcarComoSuspeito(
            11,
            new ReclassificarAuditoriaDTO { RevisaoEsperada = 0, Justificativa = "motivo" });

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task MarcarComoSuspeitoFalhaOperacionalRetornaBadRequestSemDetalhes()
    {
        var service = new Mock<IAuditoriaService>();
        service
            .Setup(item => item.ReclassificarClassificacaoAsync(11, 7, 0, true, "motivo"))
            .ThrowsAsync(new DbUpdateException("detalhe de persistencia suspeito"));
        var controller = CreateController(service);

        var result = await controller.MarcarComoSuspeito(
            11,
            new ReclassificarAuditoriaDTO { RevisaoEsperada = 0, Justificativa = "motivo" });

        AssertBadRequestWithoutDetails(result, "detalhe de persistencia suspeito");
    }

    [Fact]
    public async Task MarcarComoSuspeitoFalhaInesperadaPropaga()
    {
        var expected = new ArgumentException("log inesperado");
        var service = new Mock<IAuditoriaService>();
        service
            .Setup(item => item.ReclassificarClassificacaoAsync(11, 7, 0, true, "motivo"))
            .ThrowsAsync(expected);
        var controller = CreateController(service);

        var actual = await controller.MarcarComoSuspeito(
            11,
            new ReclassificarAuditoriaDTO { RevisaoEsperada = 0, Justificativa = "motivo" });

        AssertBadRequestWithoutDetails(actual, "log inesperado");
    }

    [Fact]
    public async Task MarcarComoNaoSuspeitoRetornaOk()
    {
        var service = new Mock<IAuditoriaService>();
        service
            .Setup(item => item.ReclassificarClassificacaoAsync(11, 7, 0, false, "motivo"))
            .ReturnsAsync(new AuditClassificationRevision { NumeroRevisao = 1 });
        var controller = CreateController(service);

        var result = await controller.MarcarComoNaoSuspeito(
            11,
            new ReclassificarAuditoriaDTO { RevisaoEsperada = 0, Justificativa = "motivo" });

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task MarcarComoNaoSuspeitoFalhaOperacionalRetornaBadRequestSemDetalhes()
    {
        var service = new Mock<IAuditoriaService>();
        service
            .Setup(item => item.ReclassificarClassificacaoAsync(11, 7, 0, false, "motivo"))
            .ThrowsAsync(new DbUpdateException("detalhe de persistencia nao suspeito"));
        var controller = CreateController(service);

        var result = await controller.MarcarComoNaoSuspeito(
            11,
            new ReclassificarAuditoriaDTO { RevisaoEsperada = 0, Justificativa = "motivo" });

        AssertBadRequestWithoutDetails(result, "detalhe de persistencia nao suspeito");
    }

    [Fact]
    public async Task MarcarComoNaoSuspeitoFalhaInesperadaPropaga()
    {
        var expected = new ArgumentException("log inesperado");
        var service = new Mock<IAuditoriaService>();
        service
            .Setup(item => item.ReclassificarClassificacaoAsync(11, 7, 0, false, "motivo"))
            .ThrowsAsync(expected);
        var controller = CreateController(service);

        var actual = await controller.MarcarComoNaoSuspeito(
            11,
            new ReclassificarAuditoriaDTO { RevisaoEsperada = 0, Justificativa = "motivo" });

        AssertBadRequestWithoutDetails(actual, "log inesperado");
    }

    [Fact]
    public async Task ReclassificacaoDesatualizadaRetornaConflito()
    {
        var service = new Mock<IAuditoriaService>();
        service
            .Setup(item => item.ReclassificarClassificacaoAsync(11, 7, 0, true, "motivo"))
            .ThrowsAsync(new DbUpdateConcurrencyException("conflito interno"));
        var controller = CreateController(service);

        var result = await controller.MarcarComoSuspeito(
            11,
            new ReclassificarAuditoriaDTO { RevisaoEsperada = 0, Justificativa = "motivo" });

        var conflict = Assert.IsType<ConflictObjectResult>(result);
        Assert.DoesNotContain("conflito interno", conflict.Value?.ToString(), StringComparison.Ordinal);
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

    private static void AssertBadRequestWithoutDetails(IActionResult result, string detail)
    {
        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, badRequest.StatusCode);
        Assert.DoesNotContain(detail, badRequest.Value?.ToString(), StringComparison.Ordinal);
    }

    private static Mock<IAuditQueryPolicy> CreatePolicy()
    {
        var policy = new Mock<IAuditQueryPolicy>();
        policy.Setup(item => item.TryCreatePagination(
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                out It.Ref<ParametrosPaginacao>.IsAny,
                out It.Ref<string>.IsAny))
            .Returns((string? page, string? pageSize, out ParametrosPaginacao pagination, out string invalid) =>
                ParametrosPaginacao.TentarCriar(page, pageSize, out pagination, out invalid));
        policy.Setup(item => item.AdmitQueryAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(OperationAdmissionResult.Allowed());
        policy.Setup(item => item.AdmitExportAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(OperationAdmissionResult.Allowed());
        return policy;
    }

    private static AuditoriaController CreateController(
        Mock<IAuditoriaService> service,
        Mock<IAuditQueryPolicy>? policy = null)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "7")
        };

        return new AuditoriaController(service.Object, (policy ?? CreatePolicy()).Object, NullLogger<AuditoriaController>.Instance)
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
