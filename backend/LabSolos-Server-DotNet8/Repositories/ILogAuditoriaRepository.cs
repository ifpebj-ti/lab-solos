using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.DTOs.Auditoria;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.DTOs.Paginacao;

namespace LabSolos_Server_DotNet8.Repositories
{
    public interface ILogAuditoriaRepository : IRepository<LogAuditoria>
    {
        Task<IEnumerable<LogAuditoria>> ObterLogsFiltradosAsync(FiltroAuditoriaDTO filtro);
        Task<int> ObterTotalLogsFiltradosAsync(FiltroAuditoriaDTO filtro);
        Task<int> ContarFalhasLoginPorContaAsync(int usuarioId, DateTime inicioInclusivo, DateTime fimExclusivo);
        Task<int> ContarFalhasLoginPorOrigemAsync(string enderecoIp, DateTime inicioInclusivo, DateTime fimExclusivo);
        Task<ResultadoPaginado<LogAuditoria>> ObterPaginaFiltradaAsync(
            FiltroAuditoriaDTO filtro,
            ParametrosPaginacao parametros,
            CancellationToken cancellationToken);
        Task<RelatorioAuditoriaDTO> GerarRelatorioFiltradoAsync(
            FiltroAuditoriaDTO filtro,
            CancellationToken cancellationToken);
        Task<(long TotalItens, IReadOnlyList<LogAuditoria> Itens)> ObterRecorteExportacaoAsync(
            FiltroAuditoriaDTO filtro,
            int limite,
            CancellationToken cancellationToken);
        Task<IEnumerable<LogAuditoria>> ObterLogsSuspeitosAsync(int limite = 50);
        Task<Dictionary<string, int>> ObterEstatisticasPorTipoAsync(DateTime dataInicio, DateTime dataFim);
        Task<Dictionary<string, int>> ObterEstatisticasPorUsuarioAsync(DateTime dataInicio, DateTime dataFim);
        Task<Dictionary<string, int>> ObterEstatisticasPorIPAsync(DateTime dataInicio, DateTime dataFim);
        Task<List<string>> ObterUsuariosComMaisAcessosAsync(int limite = 10);
        Task<Dictionary<DateTime, int>> ObterLogsPorDiaAsync(DateTime dataInicio, DateTime dataFim);
        Task<AuditClassificationRevision?> ReclassificarAsync(
            int logId,
            int autorUsuarioId,
            int revisaoEsperada,
            bool suspeitaResultante,
            string justificativa,
            DateTimeOffset criadaEmUtc);
    }
}
