namespace LabSolos_Server_DotNet8.DTOs.Usuarios;

/// <summary>
/// Projeção usada pelas filas de aprovação, que precisam distinguir o tipo de conta.
/// </summary>
public sealed class UsuarioAprovacaoDTO
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

    public string TipoUsuario { get; set; } = string.Empty;

    public string NivelUsuario { get; set; } = string.Empty;
}
