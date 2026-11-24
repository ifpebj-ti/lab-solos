namespace LabSolos_Server_DotNet8.DTOs.Auditoria
{
    public class RelatorioAuditoriaDTO
    {
        public int TotalLogs { get; set; }
        public int LogsSuspeitos { get; set; }
        public int LogsCriticos { get; set; }
        public Dictionary<string, int> LogsPorTipo { get; set; } = new();
        public Dictionary<DateTime, int> LogsPorDia { get; set; } = new();
        public List<AuditLogProjectionDTO> UltimosLogsSuspeitos { get; set; } = new();
    }
}
