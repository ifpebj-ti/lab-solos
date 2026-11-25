namespace LabSolos_Server_DotNet8.Models;

public sealed class SessaoAutenticacao
{
    public Guid Id { get; set; }

    public string IdentificadorHash { get; set; } = string.Empty;

    public string? JwtIdHash { get; set; }

    public int UsuarioId { get; set; }

    public long VersaoSessao { get; set; }

    public DateTimeOffset CriadaEmUtc { get; set; }

    public DateTimeOffset UltimaAtividadeEmUtc { get; set; }

    public DateTimeOffset ExpiraEmUtc { get; set; }

    public DateTimeOffset? RevogadaEmUtc { get; set; }

    public long Revisao { get; set; }

    public Usuario Usuario { get; set; } = null!;
}
