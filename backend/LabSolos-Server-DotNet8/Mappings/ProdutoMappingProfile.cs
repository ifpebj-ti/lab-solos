using AutoMapper;
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
                .ForMember(dest => dest.TipoProduto, opt => opt.MapFrom(src => src.Tipo))
                .ReverseMap()
                .ForMember(dest => dest.Tipo, opt => opt.MapFrom(src => src.TipoProduto));

            // Mapeamento específico para Quimico -> QuimicoDTO
            CreateMap<Quimico, QuimicoDTO>()
                .ForMember(dest => dest.Lote, opt => opt.MapFrom(src => src.Lote))
                .ForMember(dest => dest.EstadoFisico, opt => opt.MapFrom(src => src.EstadoFisico))
                .ForMember(dest => dest.Cor, opt => opt.MapFrom(src => src.Cor))
                .ForMember(dest => dest.Odor, opt => opt.MapFrom(src => src.Odor))
                .ForMember(dest => dest.Densidade, opt => opt.MapFrom(src => src.Densidade))
                .ForMember(dest => dest.PesoMolecular, opt => opt.MapFrom(src => src.PesoMolecular))
                .ForMember(dest => dest.GrauPureza, opt => opt.MapFrom(src => src.GrauPureza))
                .ForMember(dest => dest.FormulaQuimica, opt => opt.MapFrom(src => src.FormulaQuimica))
                .ForMember(dest => dest.Grupo, opt => opt.MapFrom(src => src.Grupo))
                .ForMember(dest => dest.TipoProduto, opt => opt.MapFrom(src => src.Tipo));

            // Mapeamento específico para Vidraria -> VidrariaDTO
            CreateMap<Vidraria, VidrariaDTO>()
                .ForMember(dest => dest.Lote, opt => opt.MapFrom(src => src.Lote))
                .ForMember(dest => dest.Material, opt => opt.MapFrom(src => src.Material))
                .ForMember(dest => dest.Formato, opt => opt.MapFrom(src => src.Formato))
                .ForMember(dest => dest.Altura, opt => opt.MapFrom(src => src.Altura))
                .ForMember(dest => dest.Capacidade, opt => opt.MapFrom(src => src.Capacidade))
                .ForMember(dest => dest.Graduada, opt => opt.MapFrom(src => src.Graduada))
                .ForMember(dest => dest.TipoProduto, opt => opt.MapFrom(src => src.Tipo));

            // Mapeamento de AddProdutoDTO para Produto
            CreateMap<AddProdutoDTO, Produto>();

            // Mapeamento de AddProdutoDTO para Quimico
            CreateMap<AddProdutoDTO, Quimico>()
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
                .ForMember(dest => dest.Material, opt => opt.MapFrom(src => src.Material))
                .ForMember(dest => dest.Formato, opt => opt.MapFrom(src => src.Formato))
                .ForMember(dest => dest.Altura, opt => opt.MapFrom(src => src.Altura))
                .ForMember(dest => dest.Capacidade, opt => opt.MapFrom(src => src.Capacidade))
                .ForMember(dest => dest.Graduada, opt => opt.MapFrom(src => src.Graduada));
        }
    }
}