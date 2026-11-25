namespace LabSolos_Server_DotNet8.Models;

public sealed class AuthenticationProtectionCapacity
{
    public const string LoginAccount = "login:account";
    public const string LoginIp = "login:ip";
    public const string RecoveryRequestRecipient = "recovery-request:recipient";
    public const string RecoveryRequestIp = "recovery-request:ip";
    public const string RecoveryCodeRecipient = "recovery-code:recipient";
    public const string RecoveryCodeIp = "recovery-code:ip";
    public const string PasswordChange = "password-change:account";
    public const string PublicRegistrationIp = "public-registration:ip";
    public const string LoanCreationAccount = "loan-creation:account";
    public const string NotificationManualAdministrator = "notification:manual:administrator";
    public const string NotificationAutomaticService = "notification:automatic:service";
    public const string AuditQueryAdministrator = "audit:query:administrator";
    public const string AuditExportAdministrator = "audit:export:administrator";
    public const string RecoveryJobs = "recovery-jobs";

    public required string Scope { get; set; }

    public int Allocated { get; set; }
}
