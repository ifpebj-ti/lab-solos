using AutoMapper;
using LabSolos_Server_DotNet8.DTOs.Usuarios;
using LabSolos_Server_DotNet8.Models;

namespace Core.DTOs.Mappings
{
    public class AcademicoMappingProfile : Profile
    {
        public AcademicoMappingProfile()
        {
            CreateMap<Academico, AcademicoDTO>().ReverseMap();
        }
    }
}