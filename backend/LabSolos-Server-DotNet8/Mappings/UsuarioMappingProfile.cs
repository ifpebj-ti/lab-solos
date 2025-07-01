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
                .ForMember(dest => dest.Curso, opt => opt.MapFrom(src => src.Curso));
            CreateMap<Administrador, AdministradorDTO>()
                .IncludeBase<Usuario, UsuarioDTO>();

            // Mapeamento de AddUsuarioDTO para Usuarios
            CreateMap<AddUsuarioDTO, Usuario>();
            CreateMap<AddUsuarioDTO, Administrador>()
                .IncludeBase<AddUsuarioDTO, Usuario>();
            CreateMap<AddUsuarioDTO, Academico>()
                .IncludeBase<AddUsuarioDTO, Usuario>()
                .ForMember(dest => dest.Instituicao, opt => opt.MapFrom(src => src.Instituicao))
                .ForMember(dest => dest.Cidade, opt => opt.MapFrom(src => src.Cidade))
                .ForMember(dest => dest.Curso, opt => opt.MapFrom(src => src.Curso));

            CreateMap<UsuarioDTOPatchRequest, Usuario>()
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src =>
                    src.Status != null ? Enum.Parse<StatusUsuario>(src.Status) : (StatusUsuario?)null))
                .ReverseMap()
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status.ToString()));
            CreateMap<UsuarioDTOPatchRequest, Administrador>()
                .IncludeBase<UsuarioDTOPatchRequest, Usuario>();
            CreateMap<UsuarioDTOPatchRequest, Academico>()
                .IncludeBase<UsuarioDTOPatchRequest, Usuario>();

            CreateMap<Usuario, UsuarioDTOPatchResponse>();
            CreateMap<Administrador, UsuarioDTOPatchResponse>()
                .IncludeBase<Usuario, UsuarioDTOPatchResponse>();
            CreateMap<Academico, UsuarioDTOPatchResponse>()
                .IncludeBase<Usuario, UsuarioDTOPatchResponse>();

            // Mapeamento de Usuarios para ResponsavelDTO
            CreateMap<Usuario, ResponsavelDTO>();
            CreateMap<Academico, ResponsavelDTO>()
                .IncludeBase<Usuario, ResponsavelDTO>()
                .ForMember(dest => dest.Instituicao, opt => opt.MapFrom(src => src.Instituicao))
                .ForMember(dest => dest.Cidade, opt => opt.MapFrom(src => src.Cidade))
                .ForMember(dest => dest.Curso, opt => opt.MapFrom(src => src.Curso));

            // Mapeamento de Usuarios para DependenteDTO
            CreateMap<Usuario, DependenteDTO>();
            CreateMap<Academico, DependenteDTO>()
                .IncludeBase<Usuario, DependenteDTO>()
                .ForMember(dest => dest.Instituicao, opt => opt.MapFrom(src => src.Instituicao))
                .ForMember(dest => dest.Cidade, opt => opt.MapFrom(src => src.Cidade))
                .ForMember(dest => dest.Curso, opt => opt.MapFrom(src => src.Curso));
        }
    }
}
