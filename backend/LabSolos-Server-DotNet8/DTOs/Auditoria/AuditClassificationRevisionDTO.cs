namespace LabSolos_Server_DotNet8.DTOs.Auditoria;

public sealed class AuditClassificationRevisionDTO
{
    public int NumeroRevisao { get; set; }

    public bool SuspeitaAnterior { get; set; }

    public bool SuspeitaResultante { get; set; }

    public string Justificativa { get; set; } = string.Empty;

    public DateTimeOffset CriadaEmUtc { get; set; }

    public int? AutorUsuarioId { get; set; }

    public string Origem { get; set; } = string.Empty;
}
