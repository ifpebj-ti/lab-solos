namespace LabSolos_Server_DotNet8.DTOs.Email;

public sealed class PasswordResetDTO
{
    public string? Email { get; set; }
    public string? Code { get; set; }
    public string? NewPassword { get; set; }
    public string? Confirmation { get; set; }
}
