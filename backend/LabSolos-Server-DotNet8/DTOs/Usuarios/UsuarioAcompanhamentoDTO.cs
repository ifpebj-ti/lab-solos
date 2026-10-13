namespace LabSolos_Server_DotNet8.DTOs.Usuarios;

public sealed class UsuarioAcompanhamentoDTO
{
    public int Id { get; set; }

    public required string NomeCompleto { get; set; }

    public required string Email { get; set; }

    public string? Telefone { get; set; }

    public DateOnly? DataIngresso { get; set; }

    public string? Instituicao { get; set; }

    public string? Cidade { get; set; }

    public string? Curso { get; set; }

    public string Status { get; set; } = string.Empty;

    public string NivelUsuario { get; set; } = string.Empty;
}
