using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Enums;

namespace LabSolos_Server_DotNet8.DTOs.Auditoria;

/// <summary>
/// Server-created event context. This type is not an HTTP request contract: callers
/// supply only trusted identifiers and the catalog derives action, resource type,
/// purpose, risk and retention.
/// </summary>
public sealed record CreateLogAuditoriaDTO
{
    public CodigoEventoAuditoria CodigoEvento { get; init; }
    public OrigemConfiavelAuditoria OrigemConfiavel { get; init; }
    public ResultadoOperacaoAuditoria Resultado { get; init; }
    public int? UsuarioId { get; init; }
    public string? IdentidadeProcesso { get; init; }
    public string? ReferenciaRecurso { get; init; }
    public string? CorrelationId { get; init; }
    public TipoAcaoAuditoria? TipoAcaoDiagnostica { get; init; }
}
