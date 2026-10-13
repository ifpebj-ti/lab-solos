namespace LabSolos_Server_DotNet8.Models;

public sealed class AuthenticationProtectionCapacity
{
    public const string LoginAccount = "login:account";
    public const string LoginIp = "login:ip";
    public const string RecoveryRequestRecipient = "recovery-request:recipient";
    public const string RecoveryRequestIp = "recovery-request:ip";
    public const string RecoveryCodeRecipient = "recovery-code:recipient";
    public const string RecoveryCodeIp = "recovery-code:ip";
    public const string RecoveryJobs = "recovery-jobs";

    public required string Scope { get; set; }

    public int Allocated { get; set; }
}
