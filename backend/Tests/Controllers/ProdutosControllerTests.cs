using System.Linq.Expressions;
using System.Globalization;
using LabSolos_Server_DotNet8.Controllers;
using LabSolos_Server_DotNet8.DTOs.Produtos;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using AutoMapper;
using Microsoft.AspNetCore.JsonPatch;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
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

    [Fact]
    public async Task PatchStatusInvalidoRetornaBadRequest()
    {
        var controller = CreatePatchController();
        var patch = new JsonPatchDocument<ProdutoDTOPatchRequest>();
        patch.Replace(request => request.Status, "StatusInvalido");

        var result = await controller.AtualizarParcialmente(17, patch);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal("Status inválido. Valores válidos: Disponivel, EmUso, Danificado, Emprestado, Esgotado, Vencido, Perdido, Solicitado, Indefinido", badRequest.Value);
    }

    [Fact]
    public async Task PatchDataFabricacaoInvalidaRetornaBadRequest()
    {
        var controller = CreatePatchController();
        var patch = new JsonPatchDocument<ProdutoDTOPatchRequest>();
        patch.Replace(request => request.DataFabricacao, "DataInvalida");

        var result = await controller.AtualizarParcialmente(17, patch);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal("Data de fabricação inválida. Use o formato YYYY-MM-DD.", badRequest.Value);
    }

    [Fact]
    public async Task PatchDataValidadeInvalidaRetornaBadRequest()
    {
        var controller = CreatePatchController();
        var patch = new JsonPatchDocument<ProdutoDTOPatchRequest>();
        patch.Replace(request => request.DataValidade, "DataInvalida");

        var result = await controller.AtualizarParcialmente(17, patch);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal("Data de validade inválida. Use o formato YYYY-MM-DD.", badRequest.Value);
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

    private static ProdutosController CreatePatchController()
    {
        var produto = new Produto
        {
            Id = 17,
            NomeProduto = "Produto de teste",
            Quantidade = 10,
            QuantidadeMinima = 1,
            Status = StatusProduto.Disponivel,
            DataFabricacao = new DateTime(2026, 1, 1),
            DataValidade = new DateTime(2027, 1, 1)
        };
        var repository = new Mock<IRepository<Produto>>();
        repository
            .Setup(item => item.ObterAsync(
                It.IsAny<Expression<Func<Produto, bool>>>(),
                It.IsAny<Func<IQueryable<Produto>, IQueryable<Produto>>?>()))
            .ReturnsAsync(produto);

        var unitOfWork = new Mock<IUnitOfWork>();
        unitOfWork.SetupGet(item => item.ProdutoRepository).Returns(repository.Object);
        unitOfWork.Setup(item => item.CommitAsync()).Returns(Task.CompletedTask);

        var mapper = new Mock<IMapper>();
        mapper
            .Setup(item => item.Map<ProdutoDTOPatchRequest>(It.IsAny<Produto>()))
            .Returns((Produto source) => new ProdutoDTOPatchRequest
            {
                Status = source.Status.ToString(),
                DataFabricacao = source.DataFabricacao?.ToString(CultureInfo.InvariantCulture),
                DataValidade = source.DataValidade?.ToString(CultureInfo.InvariantCulture)
            });
        mapper
            .Setup(item => item.Map(It.IsAny<ProdutoDTOPatchRequest>(), It.IsAny<Produto>()))
            .Returns((ProdutoDTOPatchRequest _, Produto destination) => destination);
        mapper
            .Setup(item => item.Map<ProdutoDTOPatchResponse>(It.IsAny<Produto>()))
            .Returns(new ProdutoDTOPatchResponse
            {
                Id = produto.Id,
                NomeProduto = produto.NomeProduto,
                Status = produto.Status.ToString(),
                DataFabricacao = produto.DataFabricacao?.ToString(CultureInfo.InvariantCulture) ?? string.Empty,
                DataValidade = produto.DataValidade?.ToString(CultureInfo.InvariantCulture) ?? string.Empty
            });

        var controller = new ProdutosController(
            Mock.Of<IProdutoService>(),
            Mock.Of<IUtilitiesService>(),
            NullLogger<ProdutosController>.Instance,
            unitOfWork.Object,
            mapper.Object)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    RequestServices = new ServiceCollection()
                        .AddMvcCore()
                        .AddDataAnnotations()
                        .Services
                        .BuildServiceProvider()
                }
            }
        };

        return controller;
    }
}
