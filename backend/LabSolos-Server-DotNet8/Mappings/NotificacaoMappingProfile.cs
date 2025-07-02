using AutoMapper;
using LabSolos_Server_DotNet8.DTOs.Notificacoes;
using LabSolos_Server_DotNet8.Models;

namespace LabSolos_Server_DotNet8.Mappings
{
    public class NotificacaoMappingProfile : Profile
    {
        public NotificacaoMappingProfile()
        {
            CreateMap<Notificacao, NotificacaoDTO>()
                .ForMember(dest => dest.TipoTexto, opt => opt.MapFrom(src => src.Tipo.ToString()));

            CreateMap<CreateNotificacaoDTO, Notificacao>()
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.Usuario, opt => opt.Ignore())
                .ForMember(dest => dest.Lida, opt => opt.MapFrom(src => false))
                .ForMember(dest => dest.DataCriacao, opt => opt.MapFrom(src => DateTime.UtcNow))
                .ForMember(dest => dest.DataLeitura, opt => opt.Ignore());
        }
    }
}
