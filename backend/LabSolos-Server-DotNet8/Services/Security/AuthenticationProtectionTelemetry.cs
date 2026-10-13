using System.Diagnostics.Metrics;
using Microsoft.Extensions.Logging;

namespace LabSolos_Server_DotNet8.Services.Security;

public enum AuthenticationProtectionOperation
{
    Login,
    RecoveryRequest,
    PasswordChange,
    UserRead,
    UserWrite,
    LoanRead
}

public enum AuthenticationProtectionResult
{
    Success,
    Denied,
    Throttled,
    Failure,
    Accepted,
    Delivered,
    Rejected
}

public enum AuthenticationProtectionReason
{
    Unauthenticated,
    Forbidden,
    NotFound,
    RateLimited,
    CapacityExhausted,
    DependencyUnavailable,
    InvalidConfiguration,
    DeliveryFailed,
    Unexpected
}

public sealed class AuthenticationProtectionTelemetry(ILogger<AuthenticationProtectionTelemetry> logger)
{
    public const string MeterName = "LabSolos.AuthenticationProtection";

    private static readonly Meter Meter = new(MeterName, "1.0.0");
    private static readonly Counter<long> AccessDenied = Meter.CreateCounter<long>("access_denied_total");
    private static readonly Counter<long> AuthenticationThrottled = Meter.CreateCounter<long>("authentication_throttled_total");
    private static readonly Counter<long> RecoveryDelivery = Meter.CreateCounter<long>("recovery_delivery_total");
    private static readonly UpDownCounter<long> RecoveryJobsActive = Meter.CreateUpDownCounter<long>("recovery_jobs_active", "jobs");
    private static readonly UpDownCounter<long> ThrottleCapacityUsed = Meter.CreateUpDownCounter<long>("throttle_capacity_used", "buckets");
    private static readonly Counter<long> ProtectionFailures = Meter.CreateCounter<long>("authentication_protection_failure_total");
    private static readonly Histogram<double> AdmissionDuration = Meter.CreateHistogram<double>("authentication_admission_duration", "ms");
    private static readonly Histogram<double> DeliveryDuration = Meter.CreateHistogram<double>("recovery_delivery_duration", "ms");
    private static readonly Action<ILogger, string, string, string, Exception?> LogProtectionEvent =
        LoggerMessage.Define<string, string, string>(
            LogLevel.Information,
            new EventId(0, nameof(LogProtectionEvent)),
            "Authentication protection event {Operation} {Result} {Reason}");

    private readonly ILogger<AuthenticationProtectionTelemetry> _logger = logger;

    public void RecordAccessDenied(AuthenticationProtectionOperation operation, AuthenticationProtectionReason reason)
    {
        var operationTag = ToTag(operation);
        var reasonTag = ToTag(reason);
        AccessDenied.Add(1,
            new KeyValuePair<string, object?>("operation", operationTag),
            new KeyValuePair<string, object?>("reason", reasonTag));
        LogEvent(operationTag, "denied", reasonTag);
    }

    public void RecordAuthenticationThrottled(AuthenticationProtectionOperation operation, AuthenticationProtectionReason reason)
    {
        var operationTag = ToTag(operation);
        var reasonTag = ToTag(reason);
        AuthenticationThrottled.Add(1,
            new KeyValuePair<string, object?>("operation", operationTag),
            new KeyValuePair<string, object?>("reason", reasonTag));
        LogEvent(operationTag, "throttled", reasonTag);
    }

    public void RecordRecoveryDelivery(AuthenticationProtectionResult result, AuthenticationProtectionReason reason)
    {
        var resultTag = ToTag(result);
        var reasonTag = ToTag(reason);
        RecoveryDelivery.Add(1,
            new KeyValuePair<string, object?>("result", resultTag),
            new KeyValuePair<string, object?>("reason", reasonTag));
        LogEvent("recovery_delivery", resultTag, reasonTag);
    }

    public void AddRecoveryJob() => RecoveryJobsActive.Add(1);

    public void RemoveRecoveryJob() => RecoveryJobsActive.Add(-1);

    public void AddThrottleCapacityUsage(long count)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(count);
        ThrottleCapacityUsed.Add(count);
    }

    public void RemoveThrottleCapacityUsage(long count)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(count);
        ThrottleCapacityUsed.Add(-count);
    }

    public void RecordFailure(AuthenticationProtectionOperation operation, AuthenticationProtectionReason reason)
    {
        var operationTag = ToTag(operation);
        var reasonTag = ToTag(reason);
        ProtectionFailures.Add(1,
            new KeyValuePair<string, object?>("operation", operationTag),
            new KeyValuePair<string, object?>("reason", reasonTag));
        LogEvent(operationTag, "failure", reasonTag);
    }

    public void RecordAuthenticationAdmission(
        TimeSpan duration,
        AuthenticationProtectionOperation operation,
        AuthenticationProtectionResult result)
    {
        ValidateDuration(duration);
        AdmissionDuration.Record(duration.TotalMilliseconds,
            new KeyValuePair<string, object?>("operation", ToTag(operation)),
            new KeyValuePair<string, object?>("result", ToTag(result)));
    }

    public void RecordRecoveryDeliveryDuration(TimeSpan duration, AuthenticationProtectionResult result)
    {
        ValidateDuration(duration);
        DeliveryDuration.Record(duration.TotalMilliseconds,
            new KeyValuePair<string, object?>("result", ToTag(result)));
    }

    private void LogEvent(string operation, string result, string reason) =>
        LogProtectionEvent(_logger, operation, result, reason, null);

    private static void ValidateDuration(TimeSpan duration)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(duration, TimeSpan.Zero);
    }

    private static string ToTag(AuthenticationProtectionOperation operation) => operation switch
    {
        AuthenticationProtectionOperation.Login => "login",
        AuthenticationProtectionOperation.RecoveryRequest => "recovery_request",
        AuthenticationProtectionOperation.PasswordChange => "password_change",
        AuthenticationProtectionOperation.UserRead => "user_read",
        AuthenticationProtectionOperation.UserWrite => "user_write",
        AuthenticationProtectionOperation.LoanRead => "loan_read",
        _ => "unknown"
    };

    private static string ToTag(AuthenticationProtectionResult result) => result switch
    {
        AuthenticationProtectionResult.Success => "success",
        AuthenticationProtectionResult.Denied => "denied",
        AuthenticationProtectionResult.Throttled => "throttled",
        AuthenticationProtectionResult.Failure => "failure",
        AuthenticationProtectionResult.Accepted => "accepted",
        AuthenticationProtectionResult.Delivered => "delivered",
        AuthenticationProtectionResult.Rejected => "rejected",
        _ => "unknown"
    };

    private static string ToTag(AuthenticationProtectionReason reason) => reason switch
    {
        AuthenticationProtectionReason.Unauthenticated => "unauthenticated",
        AuthenticationProtectionReason.Forbidden => "forbidden",
        AuthenticationProtectionReason.NotFound => "not_found",
        AuthenticationProtectionReason.RateLimited => "rate_limited",
        AuthenticationProtectionReason.CapacityExhausted => "capacity_exhausted",
        AuthenticationProtectionReason.DependencyUnavailable => "dependency_unavailable",
        AuthenticationProtectionReason.InvalidConfiguration => "invalid_configuration",
        AuthenticationProtectionReason.DeliveryFailed => "delivery_failed",
        AuthenticationProtectionReason.Unexpected => "unexpected",
        _ => "unknown"
    };
}
