using AutoMapper;
using Core.DTOs.Mappings;
using LabSolos_Server_DotNet8.DTOs.Emprestimos;
using LabSolos_Server_DotNet8.DTOs.Produtos;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using Microsoft.Extensions.Logging.Abstractions;
using System.Globalization;
using System.Text.Json;

namespace Tests.Mappings;

public class ProductDateMappingTests
{
    private static readonly JsonSerializerOptions WebJsonSerializerOptions =
        new(JsonSerializerDefaults.Web);

    [Fact]
    public void AddProdutoComDatasValidasMapeiaDatasUtc()
    {
        var dto = CriarDto(dataFabricacao: "2026-09-14", dataValidade: "2027-09-14");

        var produto = CriarMapper().Map<Produto>(dto);

        Assert.Equal(new DateTime(2026, 9, 14, 0, 0, 0, DateTimeKind.Utc), produto.DataFabricacao);
        Assert.Equal(new DateTime(2027, 9, 14, 0, 0, 0, DateTimeKind.Utc), produto.DataValidade);
    }

    [Fact]
    public void AddQuimicoComDiaBissextoMapeiaMeiaNoiteUtc()
    {
        var dto = CriarDto(dataFabricacao: "2024-02-29", dataValidade: "2028-02-29");
        dto.Tipo = nameof(TipoProduto.Quimico);

        var produto = CriarMapper().Map<Quimico>(dto);

        Assert.Equal(new DateTime(2024, 2, 29), produto.DataFabricacao);
        Assert.Equal(DateTimeKind.Utc, produto.DataFabricacao?.Kind);
        Assert.Equal(new DateTime(2028, 2, 29), produto.DataValidade);
        Assert.Equal(DateTimeKind.Utc, produto.DataValidade?.Kind);
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

    [Theory]
    [InlineData("pt-BR")]
    [InlineData("en-US")]
    public void ProjetaDatasDeProdutoComoIsoSemDependerDaCultura(string nomeCultura)
    {
        var culturaAnterior = CultureInfo.CurrentCulture;
        CultureInfo.CurrentCulture = CultureInfo.GetCultureInfo(nomeCultura);

        try
        {
            var mapper = CriarMapperComAcompanhamento();
            var dataCivil = new DateTime(2026, 11, 13, 18, 45, 30, DateTimeKind.Unspecified);
            var produto = CriarProduto(dataCivil, dataCivil);
            var quimico = CriarQuimico(dataCivil, dataCivil);
            var vidraria = CriarVidraria(dataCivil, dataCivil);

            var produtoDto = mapper.Map<ProdutoDTO>(produto);
            var alertaDto = mapper.Map<ProdutoAlertaDTO>(produto);
            var quimicoDto = mapper.Map<QuimicoDTO>(quimico);
            var vidrariaDto = mapper.Map<VidrariaDTO>(vidraria);
            var acompanhamentoDto = mapper.Map<ProdutoAcompanhamentoDTO>(produto);

            Assert.Equal("2026-11-13", produtoDto.DataFabricacao);
            Assert.Equal("2026-11-13", produtoDto.DataValidade);
            Assert.Equal("2026-11-13", alertaDto.DataFabricacao);
            Assert.Equal("2026-11-13", alertaDto.DataValidade);
            Assert.Equal("2026-11-13", quimicoDto.DataFabricacao);
            Assert.Equal("2026-11-13", quimicoDto.DataValidade);
            Assert.Equal("2026-11-13", vidrariaDto.DataFabricacao);
            Assert.Equal("2026-11-13", vidrariaDto.DataValidade);
            Assert.Equal("2026-11-13", acompanhamentoDto.DataFabricacao);
            Assert.Equal("2026-11-13", acompanhamentoDto.DataValidade);

            AssertJsonDateContract(produtoDto);
            AssertJsonDateContract(alertaDto);
            AssertJsonDateContract(quimicoDto);
            AssertJsonDateContract(vidrariaDto);
            AssertJsonDateContract(acompanhamentoDto);
        }
        finally
        {
            CultureInfo.CurrentCulture = culturaAnterior;
        }
    }

    [Fact]
    public void ProjetaDatasNulasESentinelComoNulasSemAlterarOProduto()
    {
        var mapper = CriarMapperComAcompanhamento();
        var produto = CriarProduto(DateTime.MinValue, null);
        var originalFabricacao = produto.DataFabricacao;

        var produtoDto = mapper.Map<ProdutoDTO>(produto);
        var alertaDto = mapper.Map<ProdutoAlertaDTO>(produto);
        var acompanhamentoDto = mapper.Map<ProdutoAcompanhamentoDTO>(produto);
        var quimicoDto = mapper.Map<QuimicoDTO>(CriarQuimico(DateTime.MinValue, null));
        var vidrariaDto = mapper.Map<VidrariaDTO>(CriarVidraria(DateTime.MinValue, null));

        Assert.Null(produtoDto.DataFabricacao);
        Assert.Null(produtoDto.DataValidade);
        Assert.Null(alertaDto.DataFabricacao);
        Assert.Null(alertaDto.DataValidade);
        Assert.Null(quimicoDto.DataFabricacao);
        Assert.Null(quimicoDto.DataValidade);
        Assert.Null(vidrariaDto.DataFabricacao);
        Assert.Null(vidrariaDto.DataValidade);
        Assert.Null(acompanhamentoDto.DataFabricacao);
        Assert.Null(acompanhamentoDto.DataValidade);
        Assert.Equal(originalFabricacao, produto.DataFabricacao);
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

    private static Produto CriarProduto(DateTime? dataFabricacao, DateTime? dataValidade)
    {
        return new Produto
        {
            NomeProduto = "Produto de teste",
            Tipo = TipoProduto.Outro,
            Quantidade = 10,
            QuantidadeMinima = 2,
            Status = StatusProduto.Disponivel,
            DataFabricacao = dataFabricacao,
            DataValidade = dataValidade
        };
    }

    private static Quimico CriarQuimico(DateTime? dataFabricacao, DateTime? dataValidade)
    {
        return new Quimico
        {
            NomeProduto = "Químico de teste",
            Tipo = TipoProduto.Quimico,
            Quantidade = 10,
            QuantidadeMinima = 2,
            Status = StatusProduto.Disponivel,
            Cor = (Cor)0,
            Odor = (Odor)0,
            Grupo = (Grupo)0,
            DataFabricacao = dataFabricacao,
            DataValidade = dataValidade
        };
    }

    private static Vidraria CriarVidraria(DateTime? dataFabricacao, DateTime? dataValidade)
    {
        return new Vidraria
        {
            NomeProduto = "Vidraria de teste",
            Tipo = TipoProduto.Vidraria,
            Quantidade = 10,
            QuantidadeMinima = 2,
            Status = StatusProduto.Disponivel,
            Material = (MaterialVidraria)0,
            Formato = (FormatoVidraria)0,
            Altura = (AlturaVidraria)0,
            DataFabricacao = dataFabricacao,
            DataValidade = dataValidade
        };
    }

    private static void AssertJsonDateContract<T>(T dto)
    {
        using var json = JsonDocument.Parse(JsonSerializer.Serialize(dto, WebJsonSerializerOptions));
        var dataFabricacao = json.RootElement.GetProperty("dataFabricacao").GetString();
        var dataValidade = json.RootElement.GetProperty("dataValidade").GetString();

        Assert.Equal("2026-11-13", dataFabricacao);
        Assert.Equal("2026-11-13", dataValidade);
        Assert.DoesNotContain("00:00:00", json.RootElement.GetProperty("dataValidade").GetRawText());
    }

    private static IMapper CriarMapper()
    {
        var configuration = new MapperConfiguration(
            config => config.AddProfile<ProdutoMappingProfile>(),
            NullLoggerFactory.Instance);

        return configuration.CreateMapper();
    }

    private static IMapper CriarMapperComAcompanhamento()
    {
        var configuration = new MapperConfiguration(
            config =>
            {
                config.AddProfile<ProdutoMappingProfile>();
                config.AddProfile<EmprestimoMappingProfile>();
            },
            NullLoggerFactory.Instance);

        return configuration.CreateMapper();
    }
}
