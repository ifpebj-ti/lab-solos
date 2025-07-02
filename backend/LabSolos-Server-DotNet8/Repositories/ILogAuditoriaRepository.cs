using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.DTOs.Auditoria;
using LabSolos_Server_DotNet8.Enums;

namespace LabSolos_Server_DotNet8.Repositories
{
    public interface ILogAuditoriaRepository : IRepository<LogAuditoria>
    {
        Task<IEnumerable<LogAuditoria>> ObterLogsFiltradosAsync(FiltroAuditoriaDTO filtro);
        Task<int> ObterTotalLogsFiltradosAsync(FiltroAuditoriaDTO filtro);
        Task<IEnumerable<LogAuditoria>> ObterLogsSuspeitosAsync(int limite = 50);
        Task<Dictionary<string, int>> ObterEstatisticasPorTipoAsync(DateTime dataInicio, DateTime dataFim);
        Task<Dictionary<string, int>> ObterEstatisticasPorUsuarioAsync(DateTime dataInicio, DateTime dataFim);
        Task<Dictionary<string, int>> ObterEstatisticasPorIPAsync(DateTime dataInicio, DateTime dataFim);
        Task<List<string>> ObterIPsSuspeitosAsync();
        Task<List<string>> ObterUsuariosComMaisAcessosAsync(int limite = 10);
        Task<Dictionary<DateTime, int>> ObterLogsPorDiaAsync(DateTime dataInicio, DateTime dataFim);
        Task MarcarComoSuspeitoAsync(int logId, string motivo);
        Task MarcarComoNaoSuspeitoAsync(int logId);
        Task<bool> VerificarAtividadeSuspeitaAsync(int usuarioId, string enderecoIP);
    }
}
