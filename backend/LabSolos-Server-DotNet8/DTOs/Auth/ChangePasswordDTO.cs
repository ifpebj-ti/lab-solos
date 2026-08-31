namespace LabSolos_Server_DotNet8.DTOs.Auth;

public sealed class ChangePasswordDTO
{
    public string? CurrentPassword { get; set; }
    public string? NewPassword { get; set; }
    public string? Confirmation { get; set; }
}
