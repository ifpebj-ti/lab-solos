namespace LabSolos_Server_DotNet8.DTOs.Auditoria;

public sealed record AuditLogProjectionDTO(
    int Id,
    string CodigoEvento,
    string Acao,
    string Recurso,
    DateTimeOffset DataHoraUtc,
    string Origem,
    string Resultado,
    bool Suspeita,
    string CategoriaDeteccao,
    string? CodigoRegraDeteccao,
    int? VersaoRegraDeteccao,
    int? QuantidadeObservadaDeteccao,
    int RevisaoClassificacao,
    IReadOnlyList<AuditClassificationRevisionDTO> HistoricoClassificacao);

public sealed record AuditExportReadResult(
    long TotalItens,
    IReadOnlyList<AuditLogProjectionDTO> Itens)
{
    public bool ExcedeLimite(int limite) => TotalItens > limite;
}
