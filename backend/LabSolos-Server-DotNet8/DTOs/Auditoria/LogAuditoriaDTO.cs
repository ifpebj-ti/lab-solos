using LabSolos_Server_DotNet8.Enums;

namespace LabSolos_Server_DotNet8.DTOs.Auditoria
{
    public class LogAuditoriaDTO
    {
        public int Id { get; set; }
        public DateTime DataHora { get; set; }
        public string Acao { get; set; } = string.Empty;
        public string Recurso { get; set; } = string.Empty;
        public string? Detalhes { get; set; }
        public string EnderecoIP { get; set; } = string.Empty;
        public string? UserAgent { get; set; }
        public TipoAcaoAuditoria TipoAcao { get; set; }
        public NivelRiscoAuditoria NivelRisco { get; set; }
        public bool Suspeita { get; set; }
        public string? MotivoSuspeita { get; set; }
        public int? UsuarioId { get; set; }
        public string? NomeUsuario { get; set; }
        public string? EmailUsuario { get; set; }
        public string? DadosRequisicao { get; set; }
        public string? DadosResposta { get; set; }
        public TimeSpan? TempoSessao { get; set; }
        public int? TentativasAcesso { get; set; }
        public string? Origem { get; set; }
    }
}
