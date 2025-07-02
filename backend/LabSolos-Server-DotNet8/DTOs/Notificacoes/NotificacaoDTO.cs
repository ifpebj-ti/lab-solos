using LabSolos_Server_DotNet8.Enums;

namespace LabSolos_Server_DotNet8.DTOs.Notificacoes
{
    public class NotificacaoDTO
    {
        public int Id { get; set; }
        public string Titulo { get; set; } = string.Empty;
        public string Mensagem { get; set; } = string.Empty;
        public TipoNotificacao Tipo { get; set; }
        public string TipoTexto { get; set; } = string.Empty; // Versão em texto do enum
        public bool Lida { get; set; }
        public DateTime DataCriacao { get; set; }
        public DateTime? DataLeitura { get; set; }
        public string? LinkAcao { get; set; }
        public int? ReferenciaId { get; set; }
        public string? TipoReferencia { get; set; }
    }
}
