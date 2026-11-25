using System;
using System.ComponentModel.DataAnnotations;
using LabSolos_Server_DotNet8.Enums;

namespace LabSolos_Server_DotNet8.Models
{
    public enum CodigoEventoAuditoria
    {
        DecisaoConta,
        ConcessaoConta,
        TrocaEmail,
        BaixaEmprestimo,
        DevolucaoEmprestimo,
        EmissaoNotificacao,
        ExclusaoNotificacao,
        FalhaOperacao,
        TentativaSemIdentidadeValida,
        LegadoNaoClassificado
    }

    public enum OrigemConfiavelAuditoria
    {
        UsuarioAutenticado,
        ProcessoAutorizado,
        SemAtorValido
    }

    public enum ResultadoOperacaoAuditoria
    {
        Sucesso,
        Falha,
        Negado,
        Indeterminado
    }

    public enum CategoriaRegistroAuditoria
    {
        TrilhaObrigatoria,
        DiagnosticoOperacional
    }

    public enum AuditDetectionCategory
    {
        AtividadeNormal,
        AtividadeSuspeita,
        SemAtorValido
    }

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

        public bool Suspeita { get; set; }

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

        [Required]
        public CodigoEventoAuditoria CodigoEvento { get; set; }

        [Required]
        public OrigemConfiavelAuditoria OrigemConfiavel { get; set; }

        [StringLength(128)]
        public string? ReferenciaAtor { get; set; }

        [Required]
        public ResultadoOperacaoAuditoria Resultado { get; set; }

        [Required]
        public CategoriaRegistroAuditoria CategoriaRegistro { get; set; }

        [Required]
        [StringLength(64)]
        public string CorrelationId { get; set; } = string.Empty;

        [Required]
        public DateTimeOffset ExpiraEmUtc { get; set; }

        public int RevisaoClassificacao { get; set; }

        public AuditDetectionCategory CategoriaDeteccao { get; set; } = AuditDetectionCategory.AtividadeNormal;

        [StringLength(64)]
        public string? CodigoRegraDeteccao { get; set; }

        public int? VersaoRegraDeteccao { get; set; }

        public int? QuantidadeObservadaDeteccao { get; set; }

        public ICollection<AuditClassificationRevision> RevisoesClassificacao { get; set; } = new List<AuditClassificationRevision>();
    }
}
