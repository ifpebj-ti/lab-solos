using LabSolos_Server_DotNet8.Enums;

namespace LabSolos_Server_DotNet8.Models
{
    public class Notificacao
    {
        public int Id { get; set; }
        public string Titulo { get; set; } = string.Empty;
        public string Mensagem { get; set; } = string.Empty;
        public TipoNotificacao Tipo { get; set; }
        public int? UsuarioId { get; set; } // null = notificação global
        public virtual Usuario? Usuario { get; set; }
        public bool Lida { get; set; } = false;
        public DateTime DataCriacao { get; set; } = DateTime.UtcNow;
        public DateTime? DataLeitura { get; set; }
        public string? LinkAcao { get; set; } // URL para onde a notificação deve redirecionar
        public int? ReferenciaId { get; set; } // ID do objeto relacionado (produto, emprestimo, etc)
        public string? TipoReferencia { get; set; } // "Produto", "Emprestimo", "Usuario", etc
    }
}
