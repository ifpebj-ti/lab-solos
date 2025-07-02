using LabSolos_Server_DotNet8.Enums;

namespace LabSolos_Server_DotNet8.DTOs.Auditoria
{
    public class FiltroAuditoriaDTO
    {
        public DateTime? DataInicio { get; set; }
        public DateTime? DataFim { get; set; }
        public int? UsuarioId { get; set; }
        public TipoAcaoAuditoria? TipoAcao { get; set; }
        public NivelRiscoAuditoria? NivelRisco { get; set; }
        public bool? ApenasSuspeitas { get; set; }
        public string? EnderecoIP { get; set; }
        public string? Recurso { get; set; }
        public int Pagina { get; set; } = 1;
        public int TamanhoPagina { get; set; } = 50;
    }
}
