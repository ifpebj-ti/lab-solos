namespace LabSolos_Server_DotNet8.DTOs.Auditoria
{
    public class RelatorioAuditoriaDTO
    {
        public int TotalLogs { get; set; }
        public int LogsSuspeitos { get; set; }
        public int LogsCriticos { get; set; }
        public Dictionary<string, int> LogsPorTipo { get; set; } = new();
        public Dictionary<string, int> LogsPorUsuario { get; set; } = new();
        public Dictionary<string, int> LogsPorIP { get; set; } = new();
        public Dictionary<DateTime, int> LogsPorDia { get; set; } = new();
        public List<LogAuditoriaDTO> UltimosLogsSuspeitos { get; set; } = new();
        public List<string> IPsSuspeitos { get; set; } = new();
        public List<string> UsuariosComMaisAcessos { get; set; } = new();
    }
}
