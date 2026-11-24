using System.Text.Json;
using LabSolos_Server_DotNet8.DTOs.Lotes;
using LabSolos_Server_DotNet8.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace Tests.Services;

public sealed class LoteValidationTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly LoteService _service = new(NullLogger<LoteService>.Instance);

    [Theory]
    [InlineData("Outro")]
    [InlineData("Quimico")]
    [InlineData("Vidraria")]
    public void ValidExistingInventoryReferenceAndFieldsAreAccepted(string type)
    {
        var dto = CreateDto(type);

        var result = _service.ValidarEstruturaLote(dto);

        Assert.True(result.Validado, result.Mensagem);
    }

    [Theory]
    [InlineData("codigoLote", "")]
    [InlineData("codigoLote", "   ")]
    [InlineData("tipo", "Inventado")]
    [InlineData("tipo", "999")]
    [InlineData("dataFabricacao", "2026-02-31")]
    [InlineData("dataValidade", "16/11/2026")]
    [InlineData("dataEntrada", "2026-11-31")]
    public void InvalidCommonFieldsIdentifyTheField(string field, string value)
    {
        var dto = CreateDto("Outro", values => values[field] = value);

        var result = _service.ValidarEstruturaLote(dto);

        Assert.False(result.Validado);
        Assert.NotNull(result.ErrosPorCampo);
        Assert.Contains(field, result.ErrosPorCampo.Keys);
    }

    [Fact]
    public void ManufacturingDateAfterExpiryIdentifiesTheInvalidRange()
    {
        var dto = CreateDto("Outro", values =>
        {
            values["dataFabricacao"] = "2026-11-17";
            values["dataValidade"] = "2026-11-16";
        });

        var result = _service.ValidarEstruturaLote(dto);

        Assert.False(result.Validado);
        Assert.NotNull(result.ErrosPorCampo);
        Assert.Contains("dataValidade", result.ErrosPorCampo.Keys);
    }

    [Theory]
    [InlineData("missing")]
    [InlineData("empty")]
    [InlineData("zero")]
    [InlineData("duplicate")]
    public void InvalidInventoryIdentifiersAreRejected(string scenario)
    {
        var dto = CreateDto("Outro", values =>
        {
            values["produtoIds"] = scenario switch
            {
                "missing" => null,
                "empty" => Array.Empty<int>(),
                "zero" => new[] { 0 },
                _ => new[] { 10, 10 }
            };
        });

        var result = _service.ValidarEstruturaLote(dto);

        Assert.False(result.Validado);
        Assert.NotNull(result.ErrosPorCampo);
        Assert.Contains("produtoIds", result.ErrosPorCampo.Keys);
    }

    [Theory]
    [InlineData("quantidadeLote")]
    [InlineData("quantidade")]
    [InlineData("quantidadeMinima")]
    public void NegativeNumericFieldsAreRejected(string field)
    {
        var dto = CreateDto("Outro", values => values[field] = -1);

        var result = _service.ValidarEstruturaLote(dto);

        Assert.False(result.Validado);
        Assert.NotNull(result.ErrosPorCampo);
        Assert.Contains(field, result.ErrosPorCampo.Keys);
    }

    [Theory]
    [InlineData(float.NaN)]
    [InlineData(float.PositiveInfinity)]
    [InlineData(float.NegativeInfinity)]
    public void NonFiniteQuantitiesAreRejected(float value)
    {
        var dto = CreateDto("Outro");
        dto.Quantidade = value;

        var result = _service.ValidarEstruturaLote(dto);

        Assert.False(result.Validado);
        Assert.NotNull(result.ErrosPorCampo);
        Assert.Contains("quantidade", result.ErrosPorCampo.Keys);
    }

    [Theory]
    [InlineData("Quimico", "unidadeMedida", "Indefinido")]
    [InlineData("Quimico", "estadoFisico", "999")]
    [InlineData("Quimico", "cor", "Inventada")]
    [InlineData("Quimico", "odor", "Inventado")]
    [InlineData("Quimico", "grupo", "Indefinido")]
    [InlineData("Vidraria", "material", "Inventado")]
    [InlineData("Vidraria", "formato", "999")]
    public void InvalidOptionsForEachTypeIdentifyTheField(string type, string field, string value)
    {
        var dto = CreateDto(type, values => values[field] = value);

        var result = _service.ValidarEstruturaLote(dto);

        Assert.False(result.Validado);
        Assert.NotNull(result.ErrosPorCampo);
        Assert.Contains(field, result.ErrosPorCampo.Keys);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(float.NaN)]
    public void GlasswareCapacityMustBeFiniteAndPositive(float value)
    {
        var dto = CreateDto("Vidraria");
        dto.Capacidade = value;

        var result = _service.ValidarEstruturaLote(dto);

        Assert.False(result.Validado);
        Assert.NotNull(result.ErrosPorCampo);
        Assert.Contains("capacidade", result.ErrosPorCampo.Keys);
    }

    private static AddLoteDTO CreateDto(string type, Action<Dictionary<string, object?>>? change = null)
    {
        var values = new Dictionary<string, object?>
        {
            ["codigoLote"] = " Lote-Sintetico ",
            ["produtoIds"] = new[] { 10 },
            ["quantidadeLote"] = 1,
            ["nomeProduto"] = "Produto sintético existente",
            ["tipo"] = type,
            ["quantidade"] = 10,
            ["quantidadeMinima"] = 1,
            ["localizacaoProduto"] = "Prateleira sintética",
            ["dataFabricacao"] = "2026-01-01",
            ["dataValidade"] = "2027-01-01",
            ["unidadeMedida"] = type == "Quimico" ? "Grama" : "Unidade",
            ["estadoFisico"] = "Solido",
            ["cor"] = "Incolor",
            ["odor"] = "Inodoro",
            ["grupo"] = "Outros",
            ["formulaQuimica"] = "H2O",
            ["material"] = "VidroBorossilicato",
            ["formato"] = "Cilindrica",
            ["capacidade"] = 250
        };
        change?.Invoke(values);
        return JsonSerializer.Deserialize<AddLoteDTO>(JsonSerializer.Serialize(values), JsonOptions)!;
    }
}
