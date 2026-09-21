using LabSolos_Server_DotNet8.Controllers;
using LabSolos_Server_DotNet8.DTOs.Produtos;
using LabSolos_Server_DotNet8.Services;
using AutoMapper;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace Tests.Controllers;

public sealed class ProdutosControllerTests
{
    [Fact]
    public async Task HistoricoProdutoInexistenteRetornaNotFound()
    {
        var produtoService = new Mock<IProdutoService>();
        produtoService
            .Setup(service => service.ObterHistoricoSaidaProdutoAsync(17))
            .ReturnsAsync((HistoricoSaidaProdutoResponseDTO?)null);
        var controller = CreateController(produtoService);

        var result = await controller.ObterHistoricoSaidaProduto(17);

        var notFound = Assert.IsType<NotFoundObjectResult>(result);
        Assert.Equal(StatusCodes.Status404NotFound, notFound.StatusCode);
        Assert.Equal("Produto com ID 17 não encontrado.", notFound.Value);
    }

    [Fact]
    public async Task HistoricoProdutoExistenteRetornaConsultaValida()
    {
        var response = new HistoricoSaidaProdutoResponseDTO
        {
            ProdutoId = 17,
            NomeProduto = "Ácido de teste",
            TotalEmprestimos = 2,
            TotalQuantidadeEmprestada = 3
        };
        var produtoService = new Mock<IProdutoService>();
        produtoService
            .Setup(service => service.ObterHistoricoSaidaProdutoAsync(17))
            .ReturnsAsync(response);
        var controller = CreateController(produtoService);

        var result = await controller.ObterHistoricoSaidaProduto(17);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(StatusCodes.Status200OK, ok.StatusCode);
        Assert.Same(response, ok.Value);
    }

    [Fact]
    public async Task HistoricoFalhaOperacionalRetornaErroInterno()
    {
        var produtoService = new Mock<IProdutoService>();
        produtoService
            .Setup(service => service.ObterHistoricoSaidaProdutoAsync(17))
            .ThrowsAsync(new InvalidOperationException("Falha temporária na consulta."));
        var controller = CreateController(produtoService);

        var result = await controller.ObterHistoricoSaidaProduto(17);

        var error = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status500InternalServerError, error.StatusCode);
        Assert.Equal("Erro interno do servidor. Tente novamente mais tarde.", error.Value);
    }

    [Fact]
    public async Task HistoricoFalhaInesperadaNaoEEngolida()
    {
        var produtoService = new Mock<IProdutoService>();
        produtoService
            .Setup(service => service.ObterHistoricoSaidaProdutoAsync(17))
            .ThrowsAsync(new ArgumentException("Identificador inválido."));
        var controller = CreateController(produtoService);

        await Assert.ThrowsAsync<ArgumentException>(
            () => controller.ObterHistoricoSaidaProduto(17));
    }

    private static ProdutosController CreateController(Mock<IProdutoService> produtoService)
    {
        return new ProdutosController(
            produtoService.Object,
            Mock.Of<IUtilitiesService>(),
            NullLogger<ProdutosController>.Instance,
            Mock.Of<LabSolos_Server_DotNet8.Repositories.IUnitOfWork>(),
            Mock.Of<IMapper>());
    }
}
