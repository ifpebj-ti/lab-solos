using AutoMapper;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.DTOs.Auditoria;

namespace LabSolos_Server_DotNet8.Mappings
{
    public class AuditoriaMappingProfile : Profile
    {
        public AuditoriaMappingProfile()
        {
            CreateMap<LogAuditoria, LogAuditoriaDTO>()
                .ForMember(dest => dest.NomeUsuario, opt => opt.MapFrom(src => src.Usuario != null ? src.Usuario.NomeCompleto : null))
                .ForMember(dest => dest.EmailUsuario, opt => opt.MapFrom(src => src.Usuario != null ? src.Usuario.Email : null));

            CreateMap<CreateLogAuditoriaDTO, LogAuditoria>()
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.DataHora, opt => opt.Ignore())
                .ForMember(dest => dest.EnderecoIP, opt => opt.Ignore())
                .ForMember(dest => dest.UserAgent, opt => opt.Ignore())
                .ForMember(dest => dest.UsuarioId, opt => opt.Ignore())
                .ForMember(dest => dest.Usuario, opt => opt.Ignore())
                .ForMember(dest => dest.Suspeita, opt => opt.Ignore())
                .ForMember(dest => dest.MotivoSuspeita, opt => opt.Ignore());
        }
    }
}
