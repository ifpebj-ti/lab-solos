using AutoMapper;
using LabSolos_Server_DotNet8.DTOs.Usuarios;
using LabSolos_Server_DotNet8.Models;

namespace Core.DTOs.Mappings
{
    public class AdministradorMappingProfile : Profile
    {
        public AdministradorMappingProfile()
        {
            CreateMap<Administrador, AdministradorDTO>().ReverseMap();
        }
    }
}