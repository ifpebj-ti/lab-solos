namespace LabSolos_Server_DotNet8.DTOs.Usuarios;

public sealed class UsuarioValidationResult
{
    public bool Validado { get; init; }
    public string Mensagem { get; init; } = string.Empty;
    public IReadOnlyDictionary<string, string[]> Errors { get; init; } =
        new Dictionary<string, string[]>();

    public static UsuarioValidationResult Valid() => new() { Validado = true };

    public static UsuarioValidationResult Invalid(string message) => new()
    {
        Validado = false,
        Mensagem = message
    };

    public static UsuarioValidationResult Invalid(
        IReadOnlyDictionary<string, string[]> errors) => new()
    {
        Validado = false,
        Errors = errors
    };
}
