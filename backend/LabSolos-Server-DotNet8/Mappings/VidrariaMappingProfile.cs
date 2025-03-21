using AutoMapper;
using LabSolos_Server_DotNet8.DTOs.Produtos;
using LabSolos_Server_DotNet8.DTOs.Usuarios;
using LabSolos_Server_DotNet8.Models;

namespace Core.DTOs.Mappings
{
    public class VidrariaMappingProfile : Profile
    {
        public VidrariaMappingProfile()
        {
            CreateMap<Vidraria, VidrariaDTO>().ReverseMap();
        }
    }
}