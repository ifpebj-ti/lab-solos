using System.ComponentModel.DataAnnotations;

namespace LabSolos_Server_DotNet8.DTOs.Auditoria;

public sealed class ReclassificarAuditoriaDTO
{
    [Range(0, int.MaxValue)]
    public int RevisaoEsperada { get; init; }

    [Required]
    [StringLength(1000)]
    public string Justificativa { get; init; } = string.Empty;
}
