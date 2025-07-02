using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.DTOs.Auditoria;
using LabSolos_Server_DotNet8.Enums;

namespace LabSolos_Server_DotNet8.Services
{
    public interface IAuditoriaService
    {
        Task RegistrarLogAsync(CreateLogAuditoriaDTO logDto, int? usuarioId = null, string? enderecoIP = null, string? userAgent = null);
        Task<IEnumerable<LogAuditoriaDTO>> ObterLogsFiltradosAsync(FiltroAuditoriaDTO filtro);
        Task<RelatorioAuditoriaDTO> GerarRelatorioAsync(DateTime dataInicio, DateTime dataFim);
        Task MarcarComoSuspeitoAsync(int logId, string motivo);
        Task MarcarComoNaoSuspeitoAsync(int logId);
        Task<bool> VerificarAtividadeSuspeitaAsync(int usuarioId, string enderecoIP);
        Task ProcessarDeteccaoAutomaticaAsync();
    }
}
