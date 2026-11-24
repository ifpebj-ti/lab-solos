using System.ComponentModel.DataAnnotations;

namespace LabSolos_Server_DotNet8.Models;

public enum AuditClassificationRevisionOrigin
{
    LegadoObservado,
    RevisaoManual
}

public sealed class AuditClassificationRevision
{
    public int Id { get; set; }

    public int LogAuditoriaId { get; set; }

    public LogAuditoria LogAuditoria { get; set; } = null!;

    public int NumeroRevisao { get; set; }

    public bool SuspeitaAnterior { get; set; }

    public bool SuspeitaResultante { get; set; }

    [Required]
    [StringLength(1000)]
    public string Justificativa { get; set; } = string.Empty;

    public DateTimeOffset CriadaEmUtc { get; set; }

    public int? AutorUsuarioId { get; set; }

    public AuditClassificationRevisionOrigin Origem { get; set; }
}
