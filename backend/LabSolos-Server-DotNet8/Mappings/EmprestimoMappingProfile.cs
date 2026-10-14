using AutoMapper;
using System.Globalization;
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
                .ForMember(dest => dest.DataPrevistaDevolucao,
                    opt => opt.MapFrom(src => src.DataPrevistaDevolucao))
                .ForMember(dest => dest.DataDevolucao,
                    opt => opt.MapFrom(src => src.DataDevolucao))
                .ForMember(dest => dest.Produtos, opt => opt.MapFrom(src => src.Produtos)) 
                .ReverseMap();

            CreateMap<Emprestimo, EmprestimoAcompanhamentoDTO>(MemberList.None)
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status.ToString()));

            CreateMap<Usuario, EmprestimoUsuarioAcompanhamentoDTO>(MemberList.None)
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status.ToString()))
                .ForMember(dest => dest.NivelUsuario, opt => opt.MapFrom(src => src.NivelUsuario.ToString()))
                .ForMember(dest => dest.TipoUsuario, opt => opt.MapFrom(src => src.TipoUsuario.ToString()));

            CreateMap<Usuario, EmprestimoResponsavelAcompanhamentoDTO>(MemberList.None)
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status.ToString()))
                .ForMember(dest => dest.NivelUsuario, opt => opt.MapFrom(src => src.NivelUsuario.ToString()))
                .ForMember(dest => dest.Cidade, opt => opt.MapFrom(_ => (string?)null))
                .ForMember(dest => dest.Curso, opt => opt.MapFrom(_ => (string?)null))
                .ForMember(dest => dest.Instituicao, opt => opt.MapFrom(_ => (string?)null));

            CreateMap<ProdutoEmprestado, ProdutoEmprestadoAcompanhamentoDTO>(MemberList.None);
            CreateMap<Produto, ProdutoAcompanhamentoDTO>(MemberList.None)
                .ForMember(dest => dest.Catmat, opt => opt.MapFrom(src => src.Catmat ?? string.Empty))
                .ForMember(dest => dest.TipoProduto, opt => opt.MapFrom(src => src.Tipo.ToString()))
                .ForMember(dest => dest.UnidadeMedida, opt => opt.MapFrom(src => src.UnidadeMedida.ToString()))
                .ForMember(dest => dest.DataFabricacao, opt => opt.MapFrom(src =>
                    src.DataFabricacao.HasValue ? src.DataFabricacao.Value.ToString(CultureInfo.InvariantCulture) : null))
                .ForMember(dest => dest.DataValidade, opt => opt.MapFrom(src =>
                    src.DataValidade.HasValue ? src.DataValidade.Value.ToString(CultureInfo.InvariantCulture) : null))
                .ForMember(dest => dest.UltimaModificacao, opt => opt.MapFrom(src =>
                    src.UltimaModificacao.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture)))
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status.ToString()));

            CreateMap<Lote, LoteAcompanhamentoDTO>(MemberList.None)
                .ForMember(dest => dest.DataFabricacao, opt => opt.MapFrom(src =>
                    src.DataFabricacao.HasValue ? src.DataFabricacao.Value.ToString(CultureInfo.InvariantCulture) : null))
                .ForMember(dest => dest.DataValidade, opt => opt.MapFrom(src =>
                    src.DataValidade.HasValue ? src.DataValidade.Value.ToString(CultureInfo.InvariantCulture) : null))
                .ForMember(dest => dest.DataEntrada, opt => opt.MapFrom(src =>
                    src.DataEntrada.HasValue ? src.DataEntrada.Value.ToString(CultureInfo.InvariantCulture) : null))
                .ForMember(dest => dest.Produtos, opt => opt.Ignore());

            CreateMap<AddEmprestimoDTO, Emprestimo>(MemberList.None)
            .ForMember(dest => dest.DataRealizacao, opt => opt.MapFrom(_ => DateTime.UtcNow))
            .ForMember(dest => dest.Status, opt => opt.MapFrom(_ => StatusEmprestimo.Pendente))
            .ForMember(dest => dest.Produtos, opt => opt.MapFrom(src =>
                src.Produtos.Select(p => new ProdutoEmprestado
                {
                    ProdutoId = p.ProdutoId,
                    Quantidade = p.Quantidade
                }).ToList()
            ));

            CreateMap<ProdutoEmprestadoDTO, ProdutoEmprestado>(MemberList.None)
                .ReverseMap();

        }
    }
}
