using AutoMapper;
using Core.DTOs.Mappings;
using LabSolos_Server_DotNet8.DTOs.Produtos;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using Microsoft.Extensions.Logging.Abstractions;

namespace Tests.Mappings;

public class ProductDateMappingTests
{
    [Fact]
    public void AddProdutoComDatasValidasMapeiaDatasUtc()
    {
        var dto = CriarDto(dataFabricacao: "2026-09-14", dataValidade: "2027-09-14");

        var produto = CriarMapper().Map<Produto>(dto);

        Assert.Equal(new DateTime(2026, 9, 14, 0, 0, 0, DateTimeKind.Utc), produto.DataFabricacao);
        Assert.Equal(new DateTime(2027, 9, 14, 0, 0, 0, DateTimeKind.Utc), produto.DataValidade);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void AddProdutoSemDataDeFabricacaoMapeiaDataComoNula(string? dataFabricacao)
    {
        var dto = CriarDto(dataFabricacao, dataValidade: "2027-09-14");

        var produto = CriarMapper().Map<Produto>(dto);

        Assert.Null(produto.DataFabricacao);
        Assert.Equal(new DateTime(2027, 9, 14, 0, 0, 0, DateTimeKind.Utc), produto.DataValidade);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void AddProdutoSemDataDeValidadeMapeiaDataComoNula(string? dataValidade)
    {
        var dto = CriarDto(dataFabricacao: "2026-09-14", dataValidade);

        var produto = CriarMapper().Map<Produto>(dto);

        Assert.Equal(new DateTime(2026, 9, 14, 0, 0, 0, DateTimeKind.Utc), produto.DataFabricacao);
        Assert.Null(produto.DataValidade);
    }

    [Theory]
    [InlineData("not-a-date", "2027-09-14")]
    [InlineData("2026-09-14", "not-a-date")]
    [InlineData(" ", "2027-09-14")]
    public void AddProdutoComDataMalformadaLancaFormatException(string dataFabricacao, string dataValidade)
    {
        var dto = CriarDto(dataFabricacao, dataValidade);

        var exception = Assert.Throws<AutoMapperMappingException>(() => CriarMapper().Map<Produto>(dto));

        Assert.IsType<FormatException>(exception.InnerException);
    }

    private static AddProdutoDTO CriarDto(string? dataFabricacao, string? dataValidade)
    {
        return new AddProdutoDTO
        {
            NomeProduto = "Produto de teste",
            Tipo = TipoProduto.Outro.ToString(),
            Quantidade = 10,
            QuantidadeMinima = 2,
            DataFabricacao = dataFabricacao,
            DataValidade = dataValidade
        };
    }

    private static IMapper CriarMapper()
    {
        var configuration = new MapperConfiguration(
            config => config.AddProfile<ProdutoMappingProfile>(),
            NullLoggerFactory.Instance);

        return configuration.CreateMapper();
    }
}
