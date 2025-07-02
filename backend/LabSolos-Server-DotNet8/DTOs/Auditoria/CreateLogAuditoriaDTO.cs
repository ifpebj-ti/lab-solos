using LabSolos_Server_DotNet8.Enums;

namespace LabSolos_Server_DotNet8.DTOs.Auditoria
{
    public class CreateLogAuditoriaDTO
    {
        public string Acao { get; set; } = string.Empty;
        public string Recurso { get; set; } = string.Empty;
        public string? Detalhes { get; set; }
        public TipoAcaoAuditoria TipoAcao { get; set; }
        public NivelRiscoAuditoria NivelRisco { get; set; }
        public string? DadosRequisicao { get; set; }
        public string? DadosResposta { get; set; }
        public TimeSpan? TempoSessao { get; set; }
        public int? TentativasAcesso { get; set; }
        public string? Origem { get; set; }
    }
}
