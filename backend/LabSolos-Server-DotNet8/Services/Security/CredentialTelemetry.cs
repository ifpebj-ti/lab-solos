using System.Diagnostics.Metrics;

namespace LabSolos_Server_DotNet8.Services.Security;

public sealed class CredentialTelemetry(ILogger<CredentialTelemetry> logger)
{
    private static readonly Meter Meter = new("LabSolos.Credentials", "1.0.0");
    private static readonly Counter<long> PasswordChanges =
        Meter.CreateCounter<long>("credential_password_change_total");

    private readonly ILogger<CredentialTelemetry> _logger = logger;

    public void RecordSuccess(int userId, bool wasRequiredChange)
    {
        var operation = wasRequiredChange ? "required" : "self";
        PasswordChanges.Add(1,
            new KeyValuePair<string, object?>("result", "success"),
            new KeyValuePair<string, object?>("operation", operation));
        _logger.LogInformation(
            "Credential password change completed for user {UserId}; operation {Operation}",
            userId,
            operation);
    }

    public void RecordFailure(int userId, string reason)
    {
        var safeReason = SanitizeReason(reason);
        PasswordChanges.Add(1,
            new KeyValuePair<string, object?>("result", "failure"),
            new KeyValuePair<string, object?>("reason", safeReason));
        _logger.LogInformation(
            "Credential password change rejected for user {UserId}; reason {Reason}",
            userId,
            safeReason);
    }

    public void RecordConcurrencyConflict(int userId)
    {
        PasswordChanges.Add(1,
            new KeyValuePair<string, object?>("result", "conflict"),
            new KeyValuePair<string, object?>("reason", CredentialErrorCodes.ConcurrencyConflict));
        _logger.LogWarning(
            "Credential password change concurrency conflict for user {UserId}",
            userId);
    }

    private static string SanitizeReason(string reason) => reason switch
    {
        CredentialErrorCodes.ConfirmationMismatch => reason,
        CredentialErrorCodes.CurrentPasswordInvalid => reason,
        "password_required" => reason,
        "password_too_short" => reason,
        "password_too_long" => reason,
        "password_common" => reason,
        _ => "password_invalid"
    };
}
