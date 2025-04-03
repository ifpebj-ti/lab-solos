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
            CreateMap<Lote, LoteDTO>().ReverseMap();
        }
    }
}
