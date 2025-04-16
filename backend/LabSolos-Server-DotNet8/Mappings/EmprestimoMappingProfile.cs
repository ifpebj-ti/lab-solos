using AutoMapper;
using LabSolos_Server_DotNet8.DTOs.Emprestimos;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;

namespace Core.DTOs.Mappings
{
    public class EmprestimoMappingProfile : Profile
    {
        public EmprestimoMappingProfile()
        {
            CreateMap<Emprestimo, EmprestimoDTO>()
                .ForMember(dest => dest.Produtos, opt => opt.MapFrom(src => src.Produtos)) 
                .ReverseMap();

            CreateMap<AddEmprestimoDTO, Emprestimo>()
            .ForMember(dest => dest.DataRealizacao, opt => opt.MapFrom(_ => DateTime.UtcNow))
            .ForMember(dest => dest.Status, opt => opt.MapFrom(_ => StatusEmprestimo.Pendente))
            .ForMember(dest => dest.Produtos, opt => opt.MapFrom(src =>
                src.Produtos.Select(p => new ProdutoEmprestado
                {
                    ProdutoId = p.ProdutoId,
                    Quantidade = p.Quantidade
                }).ToList()
            ));

            CreateMap<ProdutoEmprestadoDTO, ProdutoEmprestado>()
                .ReverseMap();

        }
    }
}