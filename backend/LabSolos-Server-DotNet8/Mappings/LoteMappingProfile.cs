using System.Globalization;
using AutoMapper;
using LabSolos_Server_DotNet8.DTOs.Lotes;
using LabSolos_Server_DotNet8.Models;

namespace Core.DTOs.Mappings;

public class LoteMappingProfile : Profile
{
    public LoteMappingProfile()
    {
        // Nested product lots carry metadata; only the lot endpoint expands its products.
        CreateMap<Lote, LoteDTO>()
            .ForMember(dto => dto.Produtos, options => options.Ignore())
            .ForMember(dto => dto.DataFabricacao, options => options.MapFrom(lot => Format(lot.DataFabricacao)))
            .ForMember(dto => dto.DataValidade, options => options.MapFrom(lot => Format(lot.DataValidade)))
            .ForMember(dto => dto.DataEntrada, options => options.MapFrom(lot => Format(lot.DataEntrada)));
        CreateMap<LoteDTO, Lote>(MemberList.None)
            .ForMember(lot => lot.Produtos, options => options.Ignore())
            .ForMember(lot => lot.DataFabricacao, options => options.MapFrom(dto => Parse(dto.DataFabricacao)))
            .ForMember(lot => lot.DataValidade, options => options.MapFrom(dto => Parse(dto.DataValidade)))
            .ForMember(lot => lot.DataEntrada, options => options.MapFrom(dto => Parse(dto.DataEntrada)));
        CreateMap<AddLoteDTO, Lote>(MemberList.None)
            .ForMember(lot => lot.CodigoLote, options => options.MapFrom(dto => dto.CodigoLote!.Trim()))
            .ForMember(lot => lot.Produtos, options => options.Ignore())
            .ForMember(lot => lot.DataFabricacao, options => options.MapFrom(dto => Parse(dto.DataFabricacao)))
            .ForMember(lot => lot.DataValidade, options => options.MapFrom(dto => Parse(dto.DataValidade)))
            .ForMember(lot => lot.DataEntrada, options => options.MapFrom(dto => Parse(dto.DataEntrada)));
    }

    private static string? Format(DateTime? value) => value?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
    private static DateTime? Parse(string? value) => string.IsNullOrWhiteSpace(value) ? null :
        DateTime.SpecifyKind(DateOnly.ParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture)
            .ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
}
