using AutoMapper;
using LabSolos_Server_DotNet8.DTOs.Produtos;
using LabSolos_Server_DotNet8.DTOs.Usuarios;
using LabSolos_Server_DotNet8.Models;

namespace Core.DTOs.Mappings
{
    public class QuimicoMappingProfile : Profile
    {
        public QuimicoMappingProfile()
        {
            CreateMap<Quimico, QuimicoDTO>().ReverseMap();
        }
    }
}