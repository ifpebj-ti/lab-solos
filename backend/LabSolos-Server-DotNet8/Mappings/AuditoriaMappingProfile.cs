using AutoMapper;
using LabSolos_Server_DotNet8.DTOs.Auditoria;
using LabSolos_Server_DotNet8.Models;

namespace LabSolos_Server_DotNet8.Mappings;

public class AuditoriaMappingProfile : Profile
{
    public AuditoriaMappingProfile()
    {
        CreateMap<AuditClassificationRevision, AuditClassificationRevisionDTO>()
            .ForMember(destination => destination.Origem, options => options.MapFrom(source => source.Origem.ToString()));

        CreateMap<LogAuditoria, LogAuditoriaDTO>()
            .ForMember(destination => destination.Detalhes, options => options.Ignore())
            .ForMember(destination => destination.EnderecoIP, options => options.Ignore())
            .ForMember(destination => destination.UserAgent, options => options.Ignore())
            .ForMember(destination => destination.NomeUsuario, options => options.Ignore())
            .ForMember(destination => destination.EmailUsuario, options => options.Ignore())
            .ForMember(destination => destination.DadosRequisicao, options => options.Ignore())
            .ForMember(destination => destination.DadosResposta, options => options.MapFrom(source => source.Resultado.ToString()))
            .ForMember(destination => destination.TempoSessao, options => options.Ignore())
            .ForMember(destination => destination.TentativasAcesso, options => options.Ignore())
            .ForMember(destination => destination.MotivoSuspeita, options => options.Ignore())
            .ForMember(destination => destination.RevisaoClassificacao, options => options.MapFrom(source => source.RevisaoClassificacao))
            .ForMember(destination => destination.HistoricoClassificacao, options => options.MapFrom(source => source.RevisoesClassificacao))
            .ForMember(destination => destination.UsuarioId, options => options.MapFrom(source => source.UsuarioId))
            .ForMember(destination => destination.Origem, options => options.MapFrom(source =>
                source.OrigemConfiavel == OrigemConfiavelAuditoria.ProcessoAutorizado
                    ? $"{source.OrigemConfiavel}:{source.ReferenciaAtor}"
                    : source.OrigemConfiavel.ToString()));
    }
}
