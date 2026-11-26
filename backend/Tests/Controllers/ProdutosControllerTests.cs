using System.Linq.Expressions;
using System.Globalization;
using System.Security.Claims;
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
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.EntityFrameworkCore.Storage;
using Moq;
using Tests.Infrastructure;
using Xunit;

namespace Tests.Controllers;

public sealed class ProdutosControllerTests
{
    [Theory]
    [InlineData("2026-02-31", "2028-02-29", "dataFabricacao", "Quimico")]
    [InlineData("2024-02-29", "2026-02-31", "dataValidade", "Quimico")]
    [InlineData("2024-02-29", "2026-02-29", "dataValidade", "quimico")]
    [InlineData("2024-02-29T00:00:00Z", "2028-02-29", "dataFabricacao", "0")]
    [InlineData("2024-2-9", "2028-02-29", "dataFabricacao", "Quimico")]
    [InlineData("2024-02-29", " ", "dataValidade", "Quimico")]
    public async Task CriacaoDeQuimicoComDataInvalidaIdentificaCampoAntesDeMapear(
        string dataFabricacao,
        string dataValidade,
        string campoInvalido,
        string tipo)
    {
        var unitOfWork = new Mock<IUnitOfWork>(MockBehavior.Strict);
        var mapper = new Mock<IMapper>(MockBehavior.Strict);
        var controller = new ProdutosController(
            new ProdutoService(NullLogger<ProdutoService>.Instance, CriarDiaCivil()),
            new UtilitiesService(),
            NullLogger<ProdutosController>.Instance,
            unitOfWork.Object,
            mapper.Object,
            Mock.Of<IProdutoRepository>());

        var result = await controller.Adicionar(new AddProdutoDTO
        {
            NomeProduto = "Químico de teste",
            Tipo = tipo,
            Quantidade = 10,
            QuantidadeMinima = 1,
            UnidadeMedida = nameof(UnidadeMedida.Grama),
            FormulaQuimica = "H2O",
            Grupo = nameof(Grupo.Outros),
            DataFabricacao = dataFabricacao,
            DataValidade = dataValidade
        });

        var badRequest = Assert.IsType<ObjectResult>(result, exactMatch: false);
        Assert.Equal(StatusCodes.Status400BadRequest, badRequest.StatusCode);
        var payload = Assert.IsType<ValidationProblemDetails>(badRequest.Value);
        var erro = Assert.Single(payload.Errors);
        Assert.Equal(campoInvalido, erro.Key);
        Assert.Contains("inválida", Assert.Single(erro.Value));
        mapper.VerifyNoOtherCalls();
        unitOfWork.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData(null, "Grama", "H2O")]
    [InlineData("2027-01-01", null, "H2O")]
    [InlineData("2027-01-01", "Grama", null)]
    public void ValidacaoDeQuimicoExigeDataValidadeUnidadeEMolecula(
        string? dataValidade,
        string? unidadeMedida,
        string? formulaQuimica)
    {
        var service = new ProdutoService(NullLogger<ProdutoService>.Instance, CriarDiaCivil());

        var result = service.ValidarEstruturaProduto(new AddProdutoDTO
        {
            NomeProduto = "Químico sintético",
            Tipo = nameof(TipoProduto.Quimico),
            Quantidade = 2,
            QuantidadeMinima = 1,
            Grupo = nameof(Grupo.Outros),
            DataValidade = dataValidade,
            UnidadeMedida = unidadeMedida,
            FormulaQuimica = formulaQuimica
        });

        Assert.False(result.Validado);
        Assert.Equal(
            "Para o tipo 'Quimico', os campos 'DataValidade', 'UnidadeMedida' e 'FormulaQuimica' são obrigatórios",
            result.Mensagem);
        Assert.Null(result.ErrosPorCampo);
    }

    [Theory]
    [InlineData(null, false)]
    [InlineData(250, true)]
    public void ValidacaoDeVidrariaExigeCapacidade(int? capacidade, bool expectedValid)
    {
        var service = new ProdutoService(NullLogger<ProdutoService>.Instance, CriarDiaCivil());

        var result = service.ValidarEstruturaProduto(new AddProdutoDTO
        {
            NomeProduto = "Vidraria sintética",
            Tipo = nameof(TipoProduto.Vidraria),
            Quantidade = 1,
            QuantidadeMinima = 1,
            Capacidade = capacidade
        });

        Assert.Equal(expectedValid, result.Validado);
        if (expectedValid)
        {
            Assert.Equal(string.Empty, result.Mensagem);
        }
        else
        {
            Assert.Equal("Para o tipo 'Vidraria', o campo 'Capacidade' é obrigatório", result.Mensagem);
        }
    }

    [Theory]
    [InlineData("Indefinido")]
    [InlineData("Outros,Acido")]
    [InlineData("NaoExiste")]
    public void ValidacaoDeQuimicoRejeitaGrupoIndefinidoCompostoOuDesconhecido(string grupo)
    {
        var service = new ProdutoService(NullLogger<ProdutoService>.Instance, CriarDiaCivil());

        var result = service.ValidarEstruturaProduto(new AddProdutoDTO
        {
            NomeProduto = "Químico sintético",
            Tipo = nameof(TipoProduto.Quimico),
            Quantidade = 2,
            QuantidadeMinima = 1,
            Grupo = grupo,
            DataValidade = "2027-01-01",
            UnidadeMedida = nameof(UnidadeMedida.Grama),
            FormulaQuimica = "H2O"
        });

        Assert.False(result.Validado);
        var errors = result.ErrosPorCampo!;
        Assert.Equal("grupo", Assert.Single(errors).Key);
        Assert.Contains("grupo válido", Assert.Single(errors["grupo"]));
    }

    [Theory]
    [InlineData("/quantidademinima", "quantidadeMinima")]
    [InlineData("/localizacaoproduto", "localizacaoProduto")]
    [InlineData("/catmat", "catmat")]
    public void CampoDeErroMapeiaNomeDeContratoEConservaFallback(string path, string expected)
    {
        Assert.Equal(expected, ProdutoService.CampoDeErro(path));
    }

    [Fact]
    public void ValidacaoDePatchRejeitaQuantidadeMinimaLocalizacaoEDatasInvertidas()
    {
        var candidate = new ProdutoDTOPatchRequest
        {
            QuantidadeMinima = -1,
            LocalizacaoProduto = null,
            DataFabricacao = "2027-02-01",
            DataValidade = "2027-01-01"
        };
        var paths = new HashSet<string>(StringComparer.Ordinal)
        {
            "/quantidademinima",
            "/localizacaoproduto",
            "/datafabricacao",
            "/datavalidade"
        };

        var errors = ProdutoService.ValidarAlteracoesExplicitas(candidate, paths);

        Assert.Contains("quantidadeMinima", errors.Keys);
        Assert.Contains("localizacaoProduto", errors.Keys);
        Assert.Contains("dataFabricacao", errors.Keys);
        Assert.Contains("A fabricação deve ocorrer até a validade.", errors["dataFabricacao"]);
    }

    [Fact]
    public void AplicarPatchAtualizaCamposDeEstoqueEnderecoStatusEDataCivil()
    {
        var product = new Produto
        {
            NomeProduto = "Produto antigo",
            Quantidade = 1,
            QuantidadeMinima = 1,
            Status = StatusProduto.Disponivel,
            Fornecedor = "Marca antiga",
            LocalizacaoProduto = "Armário A"
        };
        var candidate = new ProdutoDTOPatchRequest
        {
            NomeProduto = "Produto novo",
            Quantidade = 4,
            QuantidadeMinima = 2,
            Fornecedor = null,
            LocalizacaoProduto = "Armário B",
            DataFabricacao = "2026-01-02",
            DataValidade = null,
            Status = nameof(StatusProduto.EmUso)
        };
        var paths = new HashSet<string>(StringComparer.Ordinal)
        {
            "/nomeproduto", "/quantidade", "/quantidademinima", "/fornecedor",
            "/localizacaoproduto", "/datafabricacao", "/datavalidade", "/status"
        };

        ProdutoService.AplicarAlteracoesExplicitas(product, candidate, paths);

        Assert.Equal("Produto novo", product.NomeProduto);
        Assert.Equal(4, product.Quantidade);
        Assert.Equal(2, product.QuantidadeMinima);
        Assert.Null(product.Fornecedor);
        Assert.Equal("Armário B", product.LocalizacaoProduto);
        Assert.Equal(new DateTime(2026, 1, 2, 0, 0, 0, DateTimeKind.Utc), product.DataFabricacao);
        Assert.Null(product.DataValidade);
        Assert.Equal(StatusProduto.EmUso, product.Status);
    }

    [Fact]
    public async Task TipoDeProdutoForaDoEnumRetornaBadRequestAntesDaConsulta()
    {
        var repository = new Mock<IProdutoRepository>(MockBehavior.Strict);
        var controller = CreateProductController(repository.Object);

        var result = await controller.ObterProdutosPeloTipo(99, null, null);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, badRequest.StatusCode);
        repository.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task TipoDeProdutoComPaginacaoInvalidaNaoConsultaRepositorio()
    {
        var repository = new Mock<IProdutoRepository>(MockBehavior.Strict);
        var controller = CreateProductController(repository.Object);

        var result = await controller.ObterProdutosPeloTipo(
            (int)TipoProduto.Quimico, pagina: "0", tamanhoPagina: "25");

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("pagination_invalid", Assert.IsType<ProblemDetails>(badRequest.Value).Extensions["code"]);
        repository.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task ConsultaPorIdMapeiaTipoOutroComDtoGenerico()
    {
        var product = new Produto
        {
            Id = 17,
            NomeProduto = "Item genérico",
            Tipo = TipoProduto.Outro,
            Quantidade = 1,
            QuantidadeMinima = 0,
            Status = StatusProduto.Disponivel
        };
        var expected = new ProdutoDTO { Id = product.Id, NomeProduto = product.NomeProduto };
        var productRepository = new Mock<IRepository<Produto>>();
        productRepository
            .Setup(repository => repository.ObterAsync(
                It.IsAny<Expression<Func<Produto, bool>>>(),
                It.IsAny<Func<IQueryable<Produto>, IQueryable<Produto>>?>()))
            .ReturnsAsync(product);
        var unitOfWork = new Mock<IUnitOfWork>();
        unitOfWork.SetupGet(repository => repository.ProdutoRepository).Returns(productRepository.Object);
        var mapper = new Mock<IMapper>();
        mapper.Setup(item => item.Map<ProdutoDTO>(product)).Returns(expected);
        var controller = new ProdutosController(
            Mock.Of<IProdutoService>(),
            Mock.Of<IUtilitiesService>(),
            NullLogger<ProdutosController>.Instance,
            unitOfWork.Object,
            mapper.Object,
            Mock.Of<IProdutoRepository>())
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };

        var result = await controller.ObterPeloId(product.Id);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Same(expected, ok.Value);
        mapper.Verify(item => item.Map<ProdutoDTO>(product), Times.Once);
    }

    [Fact]
    public async Task ConsultaPorIdInexistenteRetornaNotFound()
    {
        var productRepository = new Mock<IRepository<Produto>>();
        productRepository
            .Setup(repository => repository.ObterAsync(
                It.IsAny<Expression<Func<Produto, bool>>>(),
                It.IsAny<Func<IQueryable<Produto>, IQueryable<Produto>>?>()))
            .ReturnsAsync((Produto?)null);
        var unitOfWork = new Mock<IUnitOfWork>();
        unitOfWork.SetupGet(repository => repository.ProdutoRepository).Returns(productRepository.Object);
        var controller = new ProdutosController(
            Mock.Of<IProdutoService>(),
            Mock.Of<IUtilitiesService>(),
            NullLogger<ProdutosController>.Instance,
            unitOfWork.Object,
            Mock.Of<IMapper>(),
            Mock.Of<IProdutoRepository>())
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };

        var result = await controller.ObterPeloId(404);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task HistoricoProdutoInexistenteRetornaNotFound()
    {
        var produtoService = new Mock<IProdutoService>();
        produtoService
            .Setup(service => service.ObterHistoricoSaidaProdutoAsync(
                17,
                It.IsAny<ClaimsPrincipal>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(default(HistoricoSaidaProdutoResponseDTO));
        var controller = CreateController(produtoService);

        var result = await controller.ObterHistoricoSaidaProduto(17);

        var notFound = Assert.IsType<NotFoundResult>(result);
        Assert.Equal(StatusCodes.Status404NotFound, notFound.StatusCode);
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
            .Setup(service => service.ObterHistoricoSaidaProdutoAsync(
                17,
                It.IsAny<ClaimsPrincipal>(),
                It.IsAny<CancellationToken>()))
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
            .Setup(service => service.ObterHistoricoSaidaProdutoAsync(
                17,
                It.IsAny<ClaimsPrincipal>(),
                It.IsAny<CancellationToken>()))
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
            .Setup(service => service.ObterHistoricoSaidaProdutoAsync(
                17,
                It.IsAny<ClaimsPrincipal>(),
                It.IsAny<CancellationToken>()))
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
        var details = Assert.IsType<ValidationProblemDetails>(badRequest.Value);
        Assert.Equal("product_patch_invalid", details.Extensions["code"]);
        Assert.Single(details.Errors["status"]);
    }

    [Fact]
    public async Task PatchDataFabricacaoInvalidaRetornaBadRequest()
    {
        var controller = CreatePatchController();
        var patch = new JsonPatchDocument<ProdutoDTOPatchRequest>();
        patch.Replace(request => request.DataFabricacao, "DataInvalida");

        var result = await controller.AtualizarParcialmente(17, patch);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        var details = Assert.IsType<ValidationProblemDetails>(badRequest.Value);
        Assert.Equal("product_patch_invalid", details.Extensions["code"]);
        Assert.Single(details.Errors["dataFabricacao"]);
    }

    [Fact]
    public async Task PatchDataValidadeInvalidaRetornaBadRequest()
    {
        var controller = CreatePatchController();
        var patch = new JsonPatchDocument<ProdutoDTOPatchRequest>();
        patch.Replace(request => request.DataValidade, "DataInvalida");

        var result = await controller.AtualizarParcialmente(17, patch);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        var details = Assert.IsType<ValidationProblemDetails>(badRequest.Value);
        Assert.Equal("product_patch_invalid", details.Extensions["code"]);
        Assert.Single(details.Errors["dataValidade"]);
    }

    private static ProdutosController CreateController(Mock<IProdutoService> produtoService)
    {
        var controller = new ProdutosController(
            produtoService.Object,
            Mock.Of<IUtilitiesService>(),
            NullLogger<ProdutosController>.Instance,
            Mock.Of<LabSolos_Server_DotNet8.Repositories.IUnitOfWork>(),
            Mock.Of<IMapper>(),
            Mock.Of<IProdutoRepository>());
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
        return controller;
    }

    private static ProdutosController CreateProductController(IProdutoRepository repository)
    {
        var controller = new ProdutosController(
            Mock.Of<IProdutoService>(),
            Mock.Of<IUtilitiesService>(),
            NullLogger<ProdutosController>.Instance,
            Mock.Of<IUnitOfWork>(),
            Mock.Of<IMapper>(),
            repository);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
        return controller;
    }

    private static ProductCivilDay CriarDiaCivil() => new(
        new ControlledTimeProvider(new DateTimeOffset(2026, 11, 17, 15, 0, 0, TimeSpan.Zero)),
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Products:TimeZone"] = "America/Sao_Paulo"
            })
            .Build());

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
        var transaction = new Mock<IDbContextTransaction>();
        transaction.Setup(item => item.CommitAsync(It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        unitOfWork.Setup(item => item.BeginTransactionAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(transaction.Object);
        var productRepository = new Mock<IProdutoRepository>();
        productRepository.Setup(item => item.LockForLoanDecisionAsync(
            It.IsAny<IEnumerable<int>>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        productRepository.Setup(item => item.GetByIdAsync(17)).ReturnsAsync(produto);

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
            mapper.Object,
            productRepository.Object)
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
