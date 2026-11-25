using LabSolos_Server_DotNet8.Enums;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace LabSolos_Server_DotNet8.DTOs.Auditoria
{
    public class FiltroAuditoriaDTO : IValidatableObject
    {
        public DateTime? DataInicio { get; set; }
        public DateTime? DataFim { get; set; }
        public int? UsuarioId { get; set; }
        public TipoAcaoAuditoria? TipoAcao { get; set; }
        public NivelRiscoAuditoria? NivelRisco { get; set; }
        public bool? ApenasSuspeitas { get; set; }
        public string? EnderecoIP { get; set; }
        public string? Recurso { get; set; }
        [BindNever]
        public int Pagina { get; set; } = 1;
        [BindNever]
        public int TamanhoPagina { get; set; } = 25;

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            if (DataInicio is { } inicio && DataFim is { } fim && inicio >= fim)
                yield return new ValidationResult(
                    "O fim do intervalo deve ser posterior ao início.", ["dataFim"]);

            if (UsuarioId is <= 0)
                yield return new ValidationResult("O identificador do usuário deve ser positivo.", ["usuarioId"]);

            if (EnderecoIP is { Length: > 45 })
                yield return new ValidationResult("O filtro de origem excede o tamanho máximo.", ["enderecoIP"]);

            if (Recurso is { Length: > 100 })
                yield return new ValidationResult("O filtro de recurso excede o tamanho máximo.", ["recurso"]);
        }
    }
}
