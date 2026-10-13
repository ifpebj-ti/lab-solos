using System.Diagnostics.Metrics;
using Microsoft.Extensions.Logging;

namespace LabSolos_Server_DotNet8.Services.Security;

public sealed class CredentialTelemetry(ILogger<CredentialTelemetry> logger)
{
    private static readonly Meter Meter = new("LabSolos.Credentials", "1.0.0");
    private static readonly Counter<long> PasswordChanges =
        Meter.CreateCounter<long>("credential_password_change_total");
    private static readonly Action<ILogger, string, Exception?> LogPasswordChangeSuccess =
        LoggerMessage.Define<string>(
            LogLevel.Information,
            new EventId(0, nameof(LogPasswordChangeSuccess)),
            "Credential password change completed; operation {Operation}");
    private static readonly Action<ILogger, string, Exception?> LogPasswordChangeFailure =
        LoggerMessage.Define<string>(
            LogLevel.Information,
            new EventId(0, nameof(LogPasswordChangeFailure)),
            "Credential password change rejected; reason {Reason}");
    private static readonly Action<ILogger, Exception?> LogPasswordChangeConflict =
        LoggerMessage.Define(
            LogLevel.Warning,
            new EventId(0, nameof(LogPasswordChangeConflict)),
            "Credential password change concurrency conflict");

    private readonly ILogger<CredentialTelemetry> _logger = logger;

    public void RecordSuccess(int userId, bool wasRequiredChange)
    {
        var operation = wasRequiredChange ? "required" : "self";
        PasswordChanges.Add(1,
            new KeyValuePair<string, object?>("result", "success"),
            new KeyValuePair<string, object?>("operation", operation));
        LogPasswordChangeSuccess(_logger, operation, null);
    }

    public void RecordFailure(int userId, string reason)
    {
        var safeReason = SanitizeReason(reason);
        PasswordChanges.Add(1,
            new KeyValuePair<string, object?>("result", "failure"),
            new KeyValuePair<string, object?>("reason", safeReason));
        LogPasswordChangeFailure(_logger, safeReason, null);
    }

    public void RecordConcurrencyConflict(int userId)
    {
        PasswordChanges.Add(1,
            new KeyValuePair<string, object?>("result", "conflict"),
            new KeyValuePair<string, object?>("reason", CredentialErrorCodes.ConcurrencyConflict));
        LogPasswordChangeConflict(_logger, null);
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
