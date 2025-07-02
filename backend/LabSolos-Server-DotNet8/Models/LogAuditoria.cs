using System;
using System.ComponentModel.DataAnnotations;
using LabSolos_Server_DotNet8.Enums;

namespace LabSolos_Server_DotNet8.Models
{
    public class LogAuditoria
    {
        public int Id { get; set; }

        [Required]
        public DateTime DataHora { get; set; }

        [Required]
        [StringLength(50)]
        public string Acao { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string Recurso { get; set; } = string.Empty;

        [StringLength(500)]
        public string? Detalhes { get; set; }

        [Required]
        [StringLength(45)]
        public string EnderecoIP { get; set; } = string.Empty;

        [StringLength(500)]
        public string? UserAgent { get; set; }

        [Required]
        public TipoAcaoAuditoria TipoAcao { get; set; }

        [Required]
        public NivelRiscoAuditoria NivelRisco { get; set; }

        public bool Suspeita { get; set; } = false;

        [StringLength(1000)]
        public string? MotivoSuspeita { get; set; }

        // Relacionamento com usuário (pode ser null para ações anônimas)
        public int? UsuarioId { get; set; }
        public Usuario? Usuario { get; set; }

        // Dados serializados da requisição/resposta para análise detalhada
        [StringLength(2000)]
        public string? DadosRequisicao { get; set; }

        [StringLength(1000)]
        public string? DadosResposta { get; set; }

        // Campos para análise de comportamento
        public TimeSpan? TempoSessao { get; set; }
        public int? TentativasAcesso { get; set; }

        [StringLength(100)]
        public string? Origem { get; set; } // Web, Mobile, API, etc.
    }
}
