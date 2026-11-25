using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.DTOs.Auditoria;
using LabSolos_Server_DotNet8.Enums;

namespace LabSolos_Server_DotNet8.Services
{
    public interface IAuditoriaService
    {
        /// <summary>
        /// Adds a mandatory event to the scoped unit of work without saving it.
        /// The caller must commit it together with the domain effect.
        /// </summary>
        Task RegistrarEventoObrigatorioAsync(CreateLogAuditoriaDTO evento);
        /// <summary>Persists a secondary diagnostic without changing the primary operation result.</summary>
        Task RegistrarDiagnosticoAsync(CreateLogAuditoriaDTO evento);
        /// <summary>Compatibility adapter for existing server-side diagnostic producers.</summary>
        Task RegistrarLogAsync(
            CreateLogAuditoriaDTO evento,
            int? usuarioId = null,
            string? enderecoIP = null,
            string? userAgent = null);
        Task<int> ExpurgarEventosExpiradosAsync(DateTimeOffset? instanteAtual = null);
        Task<IEnumerable<LogAuditoriaDTO>> ObterLogsFiltradosAsync(FiltroAuditoriaDTO filtro);
        Task<RelatorioAuditoriaDTO> GerarRelatorioAsync(DateTime dataInicio, DateTime dataFim);
        Task<AuditClassificationRevision?> ReclassificarClassificacaoAsync(
            int logId,
            int autorUsuarioId,
            int revisaoEsperada,
            bool suspeitaResultante,
            string justificativa);
        Task<bool> VerificarAtividadeSuspeitaAsync(int usuarioId, string enderecoIP);
        Task ProcessarDeteccaoAutomaticaAsync();
    }
}
