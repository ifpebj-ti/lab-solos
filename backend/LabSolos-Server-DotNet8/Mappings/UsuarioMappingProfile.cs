using AutoMapper;
using LabSolos_Server_DotNet8.DTOs.Usuarios;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;

namespace Core.DTOs.Mappings
{
    public class UsuarioMappingProfile : Profile
    {
        public UsuarioMappingProfile()
        {
            // Mapeamento das bases de tipos de Usuario
            CreateMap<Usuario, UsuarioDTO>()
                .ReverseMap();
            CreateMap<Academico, AcademicoDTO>()
                .IncludeBase<Usuario, UsuarioDTO>()
                .ForMember(dest => dest.Instituicao, opt => opt.MapFrom(src => src.Instituicao))
                .ForMember(dest => dest.Cidade, opt => opt.MapFrom(src => src.Cidade))
                .ForMember(dest => dest.Curso, opt => opt.MapFrom(src => src.Curso))
                .ReverseMap();
            CreateMap<Administrador, AdministradorDTO>()
                .IncludeBase<Usuario, UsuarioDTO>()
                .ReverseMap();

            // Mapeamento de AddUsuarioDTO para Usuarios
            CreateMap<AddUsuarioDTO, Usuario>(MemberList.None);
            CreateMap<AddUsuarioDTO, Administrador>(MemberList.None)
                .IncludeBase<AddUsuarioDTO, Usuario>();
            CreateMap<AddUsuarioDTO, Academico>(MemberList.None)
                .IncludeBase<AddUsuarioDTO, Usuario>()
                .ForMember(dest => dest.Instituicao, opt => opt.MapFrom(src => src.Instituicao))
                .ForMember(dest => dest.Cidade, opt => opt.MapFrom(src => src.Cidade))
                .ForMember(dest => dest.Curso, opt => opt.MapFrom(src => src.Curso));

            CreateMap<UsuarioDTOPatchRequest, Usuario>(MemberList.None)
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src =>
                    src.Status != null ? Enum.Parse<StatusUsuario>(src.Status) : (StatusUsuario?)null))
                .ReverseMap()
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status.ToString()));
            CreateMap<UsuarioDTOPatchRequest, Administrador>(MemberList.None)
                .IncludeBase<UsuarioDTOPatchRequest, Usuario>();
            CreateMap<UsuarioDTOPatchRequest, Academico>(MemberList.None)
                .IncludeBase<UsuarioDTOPatchRequest, Usuario>();

            CreateMap<Usuario, UsuarioDTOPatchResponse>(MemberList.None);
            CreateMap<Administrador, UsuarioDTOPatchResponse>(MemberList.None)
                .IncludeBase<Usuario, UsuarioDTOPatchResponse>();
            CreateMap<Academico, UsuarioDTOPatchResponse>(MemberList.None)
                .IncludeBase<Usuario, UsuarioDTOPatchResponse>();

            // Mapeamento de Usuarios para ResponsavelDTO
            CreateMap<Usuario, ResponsavelDTO>(MemberList.None);
            CreateMap<Academico, ResponsavelDTO>()
                .IncludeBase<Usuario, ResponsavelDTO>()
                .ForMember(dest => dest.Instituicao, opt => opt.MapFrom(src => src.Instituicao))
                .ForMember(dest => dest.Cidade, opt => opt.MapFrom(src => src.Cidade))
                .ForMember(dest => dest.Curso, opt => opt.MapFrom(src => src.Curso));

            // Mapeamento de Usuarios para DependenteDTO
            CreateMap<Usuario, DependenteDTO>(MemberList.None);
            CreateMap<Academico, DependenteDTO>()
                .IncludeBase<Usuario, DependenteDTO>()
                .ForMember(dest => dest.Instituicao, opt => opt.MapFrom(src => src.Instituicao))
                .ForMember(dest => dest.Cidade, opt => opt.MapFrom(src => src.Cidade))
                .ForMember(dest => dest.Curso, opt => opt.MapFrom(src => src.Curso));
        }
    }
}
