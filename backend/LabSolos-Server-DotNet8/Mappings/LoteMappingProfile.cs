using AutoMapper;
using LabSolos_Server_DotNet8.DTOs.Lotes;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services;

namespace Core.DTOs.Mappings
{
    public class LoteMappingProfile : Profile
    {
        public LoteMappingProfile()
        {
            CreateMap<Lote, LoteDTO>()
            .ReverseMap()
            .ForMember(dest => dest.DataFabricacao, opt => opt.MapFrom(src =>
                src.DataFabricacao != null
                    ? DateTime.SpecifyKind(DateTime.Parse(src.DataFabricacao), DateTimeKind.Utc)
                    : (DateTime?)null))
            .ForMember(dest => dest.DataValidade, opt => opt.MapFrom(src =>
                src.DataValidade != null
                    ? DateTime.SpecifyKind(DateTime.Parse(src.DataValidade), DateTimeKind.Utc)
                    : (DateTime?)null));

            CreateMap<AddLoteDTO, Lote>();
        }
    }
}
