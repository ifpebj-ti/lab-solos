using System.Globalization;
using LabSolos_Server_DotNet8.DTOs;
using LabSolos_Server_DotNet8.DTOs.Lotes;
using LabSolos_Server_DotNet8.Enums;

namespace LabSolos_Server_DotNet8.Services;

public interface ILoteService
{
    ResultadoValidacaoDTO ValidarEstruturaLote(AddLoteDTO loteDto);
}

public class LoteService(ILogger<LoteService> logger) : ILoteService
{
    public ResultadoValidacaoDTO ValidarEstruturaLote(AddLoteDTO loteDto)
    {
        var errors = new Dictionary<string, string[]>();
        ValidateCommon(loteDto, errors);
        ValidateDates(loteDto, errors);
        if (Enum.TryParse<TipoProduto>(loteDto.Tipo, true, out var type))
        {
            if (type == TipoProduto.Quimico) ValidateChemical(loteDto, errors);
            if (type == TipoProduto.Vidraria) ValidateGlassware(loteDto, errors);
        }
        logger.LogDebug("Validação de lote concluída com {FieldCount} campos inválidos", errors.Count);
        return new ResultadoValidacaoDTO
        {
            Validado = errors.Count == 0,
            Mensagem = errors.Count == 0 ? string.Empty : "Revise os campos indicados para cadastrar o lote.",
            ErrosPorCampo = errors.Count == 0 ? null : errors
        };
    }

    private static void ValidateCommon(AddLoteDTO dto, Dictionary<string, string[]> errors)
    {
        if (string.IsNullOrWhiteSpace(dto.CodigoLote)) Invalid(errors, "codigoLote");
        if (dto.ProdutoIds is not { Length: > 0 } || dto.ProdutoIds.Any(id => id <= 0) ||
            dto.ProdutoIds.Distinct().Count() != dto.ProdutoIds.Length) Invalid(errors, "produtoIds");
        if (dto.QuantidadeLote < 0) Invalid(errors, "quantidadeLote");
        if (!NonNegative(dto.Quantidade)) Invalid(errors, "quantidade");
        if (!NonNegative(dto.QuantidadeMinima)) Invalid(errors, "quantidadeMinima");
        Option<TipoProduto>(dto.Tipo, "tipo", errors);
    }

    private static void ValidateDates(AddLoteDTO dto, Dictionary<string, string[]> errors)
    {
        OptionalDate(dto.DataFabricacao, "dataFabricacao", errors);
        OptionalDate(dto.DataValidade, "dataValidade", errors);
        OptionalDate(dto.DataEntrada, "dataEntrada", errors);
        if (TryDate(dto.DataFabricacao, out var manufacture) && TryDate(dto.DataValidade, out var expiry)
            && manufacture > expiry) Invalid(errors, "dataValidade");
    }

    private static void ValidateChemical(AddLoteDTO dto, Dictionary<string, string[]> errors)
    {
        if (!TryDate(dto.DataValidade, out _)) Invalid(errors, "dataValidade");
        if (string.IsNullOrWhiteSpace(dto.FormulaQuimica)) Invalid(errors, "formulaQuimica");
        Option<UnidadeMedida>(dto.UnidadeMedida, "unidadeMedida", errors);
        Option<EstadoFisico>(dto.EstadoFisico, "estadoFisico", errors);
        Option<Cor>(dto.Cor, "cor", errors);
        Option<Odor>(dto.Odor, "odor", errors);
        Option<Grupo>(dto.Grupo, "grupo", errors);
        PositiveOptional(dto.PesoMolecular, "pesoMolecular", errors);
        PositiveOptional(dto.Densidade, "densidade", errors);
    }

    private static void ValidateGlassware(AddLoteDTO dto, Dictionary<string, string[]> errors)
    {
        if (!dto.Capacidade.HasValue || !float.IsFinite(dto.Capacidade.Value) || dto.Capacidade <= 0)
            Invalid(errors, "capacidade");
        Option<MaterialVidraria>(dto.Material, "material", errors);
        Option<FormatoVidraria>(dto.Formato, "formato", errors);
    }

    private static void PositiveOptional(float? value, string field, Dictionary<string, string[]> errors)
    {
        if (value.HasValue && (!float.IsFinite(value.Value) || value <= 0)) Invalid(errors, field);
    }

    private static void OptionalDate(string? value, string field, Dictionary<string, string[]> errors)
    {
        if (!string.IsNullOrWhiteSpace(value) && !TryDate(value, out _)) Invalid(errors, field);
    }

    private static void Option<T>(string? value, string field, Dictionary<string, string[]> errors)
        where T : struct, Enum
    {
        if (!ValidOption<T>(value)) Invalid(errors, field);
    }

    private static void Invalid(Dictionary<string, string[]> errors, string field) =>
        errors[field] = ["Informe um valor válido para este campo."];

    private static bool NonNegative(float value) => float.IsFinite(value) && value >= 0;

    private static bool ValidOption<T>(string? value) where T : struct, Enum =>
        !string.IsNullOrWhiteSpace(value) && !value.Contains(',') &&
        !char.IsDigit(value.TrimStart()[0]) && Enum.TryParse<T>(value, true, out var parsed) &&
        Enum.IsDefined(parsed) && parsed.ToString() is not ("Indefinido" or "NaoAplicavel");

    private static bool TryDate(string? value, out DateOnly date) => DateOnly.TryParseExact(
        value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out date);
}
