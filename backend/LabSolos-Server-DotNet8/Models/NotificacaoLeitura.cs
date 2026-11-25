namespace LabSolos_Server_DotNet8.Models
{
    public class NotificacaoLeitura
    {
        public int NotificacaoId { get; set; }
        public virtual Notificacao Notificacao { get; set; } = null!;
        public int UsuarioId { get; set; }
        public bool Lida { get; set; }
        public DateTime? DataLeitura { get; set; }
    }
}
