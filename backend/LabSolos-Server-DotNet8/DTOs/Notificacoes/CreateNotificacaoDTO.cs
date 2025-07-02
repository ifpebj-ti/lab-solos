using LabSolos_Server_DotNet8.Enums;

namespace LabSolos_Server_DotNet8.DTOs.Notificacoes
{
    public class CreateNotificacaoDTO
    {
        public string Titulo { get; set; } = string.Empty;
        public string Mensagem { get; set; } = string.Empty;
        public TipoNotificacao Tipo { get; set; }
        public int? UsuarioId { get; set; } // null = notificação global
        public bool EhGlobal { get; set; } = false;
        public NivelUsuario? NivelUsuarioDestino { get; set; }
        public string? LinkAcao { get; set; }
        public int? ReferenciaId { get; set; }
        public string? TipoReferencia { get; set; }
    }
}
