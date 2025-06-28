using AutoMapper;
using LabSolos_Server_DotNet8.DTOs.Emprestimos;
using LabSolos_Server_DotNet8.DTOs.Produtos;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;

namespace Core.DTOs.Mappings
{
    public class ProdutoMappingProfile : Profile
    {
        public ProdutoMappingProfile()
        {
            // Mapeamento para ProdutoDTO
            CreateMap<Produto, ProdutoDTO>()
                .ForMember(dest => dest.Lote, opt => opt.MapFrom(src => src.Lote))
                .ReverseMap();

            // Mapeamento específico para Quimico -> QuimicoDTO
            CreateMap<Quimico, QuimicoDTO>()
                .IncludeBase<Produto, ProdutoDTO>()
                .ForMember(dest => dest.EstadoFisico, opt => opt.MapFrom(src => src.EstadoFisico))
                .ForMember(dest => dest.Cor, opt => opt.MapFrom(src => src.Cor))
                .ForMember(dest => dest.Odor, opt => opt.MapFrom(src => src.Odor))
                .ForMember(dest => dest.Densidade, opt => opt.MapFrom(src => src.Densidade))
                .ForMember(dest => dest.PesoMolecular, opt => opt.MapFrom(src => src.PesoMolecular))
                .ForMember(dest => dest.GrauPureza, opt => opt.MapFrom(src => src.GrauPureza))
                .ForMember(dest => dest.FormulaQuimica, opt => opt.MapFrom(src => src.FormulaQuimica))
                .ForMember(dest => dest.Grupo, opt => opt.MapFrom(src => src.Grupo));

            // Mapeamento específico para Vidraria -> VidrariaDTO
            CreateMap<Vidraria, VidrariaDTO>()
                .IncludeBase<Produto, ProdutoDTO>()
                .ForMember(dest => dest.Material, opt => opt.MapFrom(src => src.Material))
                .ForMember(dest => dest.Formato, opt => opt.MapFrom(src => src.Formato))
                .ForMember(dest => dest.Altura, opt => opt.MapFrom(src => src.Altura))
                .ForMember(dest => dest.Capacidade, opt => opt.MapFrom(src => src.Capacidade))
                .ForMember(dest => dest.Graduada, opt => opt.MapFrom(src => src.Graduada));

            // Mapeamento de AddProdutoDTO para Produto
            CreateMap<AddProdutoDTO, Produto>()
                .ForMember(dest => dest.DataFabricacao, opt => opt.MapFrom(src =>
                    DateTime.SpecifyKind(DateTime.Parse(src.DataFabricacao), DateTimeKind.Utc)))
                .ForMember(dest => dest.DataValidade, opt => opt.MapFrom(src =>
                    DateTime.SpecifyKind(DateTime.Parse(src.DataValidade), DateTimeKind.Utc)));

            // Mapeamento de AddProdutoDTO para Quimico
            CreateMap<AddProdutoDTO, Quimico>()
                .IncludeBase<AddProdutoDTO, Produto>()
                .ForMember(dest => dest.EstadoFisico, opt => opt.MapFrom(src => src.EstadoFisico))
                .ForMember(dest => dest.Cor, opt => opt.MapFrom(src => src.Cor))
                .ForMember(dest => dest.Odor, opt => opt.MapFrom(src => src.Odor))
                .ForMember(dest => dest.Densidade, opt => opt.MapFrom(src => src.Densidade))
                .ForMember(dest => dest.PesoMolecular, opt => opt.MapFrom(src => src.PesoMolecular))
                .ForMember(dest => dest.GrauPureza, opt => opt.MapFrom(src => src.GrauPureza))
                .ForMember(dest => dest.FormulaQuimica, opt => opt.MapFrom(src => src.FormulaQuimica))
                .ForMember(dest => dest.Grupo, opt => opt.MapFrom(src => src.Grupo));

            // Mapeamento de AddProdutoDTO para Vidraria
            CreateMap<AddProdutoDTO, Vidraria>()
                .IncludeBase<AddProdutoDTO, Produto>()
                .ForMember(dest => dest.Material, opt => opt.MapFrom(src => src.Material))
                .ForMember(dest => dest.Formato, opt => opt.MapFrom(src => src.Formato))
                .ForMember(dest => dest.Altura, opt => opt.MapFrom(src => src.Altura))
                .ForMember(dest => dest.Capacidade, opt => opt.MapFrom(src => src.Capacidade))
                .ForMember(dest => dest.Graduada, opt => opt.MapFrom(src => src.Graduada));

            // Mapeamento de UpdateProdutoDTO para Produto
            CreateMap<UpdateProdutoDTO, Produto>()
                .ForMember(dest => dest.DataFabricacao, opt => opt.MapFrom(src =>
                    src.DataFabricacao != null ? DateTime.SpecifyKind(DateTime.Parse(src.DataFabricacao), DateTimeKind.Utc) : (DateTime?)null))
                .ForMember(dest => dest.DataValidade, opt => opt.MapFrom(src =>
                    src.DataValidade != null ? DateTime.SpecifyKind(DateTime.Parse(src.DataValidade), DateTimeKind.Utc) : (DateTime?)null));
        }
    }
}