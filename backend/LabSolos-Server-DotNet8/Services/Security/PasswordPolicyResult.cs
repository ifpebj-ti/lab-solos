namespace LabSolos_Server_DotNet8.Services.Security;

public sealed record PasswordPolicyResult(bool IsValid, string? Code)
{
    public static PasswordPolicyResult Valid { get; } = new(true, null);

    public static PasswordPolicyResult Invalid(string code) => new(false, code);
}
