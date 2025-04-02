using AutoMapper;
using LabSolos_Server_DotNet8.Dtos.Emprestimos;
using LabSolos_Server_DotNet8.DTOs.Emprestimos;
using LabSolos_Server_DotNet8.Models;

namespace Core.DTOs.Mappings
{
    public class EmprestimoMappingProfile : Profile
    {
        public EmprestimoMappingProfile()
        {
            CreateMap<Emprestimo, EmprestimoDTO>().ReverseMap();

            CreateMap<AddEmprestimoDTO, Emprestimo>();

        }
    }
}