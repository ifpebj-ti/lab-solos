using System.Data.Common;
using System.Net;
using LabSolos_Server_DotNet8.Models;

namespace LabSolos_Server_DotNet8.Services.Security;

public enum OperationAdmissionStatus
{
    Allowed,
    RateLimited,
    Unavailable
}

public sealed record OperationAdmissionResult(
    OperationAdmissionStatus Status,
    int RetryAfterSeconds = 0)
{
    public static OperationAdmissionResult Allowed() => new(OperationAdmissionStatus.Allowed);

    public static OperationAdmissionResult RateLimited(int retryAfterSeconds) =>
        new(OperationAdmissionStatus.RateLimited, Math.Max(1, retryAfterSeconds));

    public static OperationAdmissionResult Unavailable() => new(OperationAdmissionStatus.Unavailable);
}

public sealed class OperationAdmissionPolicy(
    PostgresAuthenticationThrottle throttle,
    ThrottleKeyFactory keyFactory,
    ILogger<OperationAdmissionPolicy> logger)
{
    public const int RegistrationLimit = 10;
    public const int LoanCreationLimit = 30;
    public const int MaximumLoanItems = 100;
    public const int AuditQueryLimit = 60;
    public const int AuditExportLimit = 5;
    public const int MaximumRequestBodyBytes = 1_048_576;
    public static readonly TimeSpan OperationWindow = TimeSpan.FromHours(1);
    public static readonly TimeSpan AuditQueryWindow = TimeSpan.FromMinutes(1);
    public static readonly TimeSpan AuditExportWindow = TimeSpan.FromHours(1);

    public static bool IsLimitedJsonWrite(HttpRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (!HttpMethods.IsPost(request.Method))
        {
            return false;
        }

        var path = request.Path.Value;
        if (!string.Equals(path, "/api/Usuarios", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(path, "/api/Emprestimos", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var mediaType = request.ContentType?.Split(';', 2)[0].Trim();
        return string.Equals(mediaType, "application/json", StringComparison.OrdinalIgnoreCase)
            || (mediaType?.EndsWith("+json", StringComparison.OrdinalIgnoreCase) ?? false);
    }

    private readonly PostgresAuthenticationThrottle _throttle =
        throttle ?? throw new ArgumentNullException(nameof(throttle));
    private readonly ThrottleKeyFactory _keyFactory =
        keyFactory ?? throw new ArgumentNullException(nameof(keyFactory));
    private readonly ILogger<OperationAdmissionPolicy> _logger =
        logger ?? throw new ArgumentNullException(nameof(logger));

    public Task<OperationAdmissionResult> AdmitPublicRegistrationAsync(
        IPAddress? sourceAddress,
        CancellationToken cancellationToken = default) =>
        ConsumeAsync(
            new AuthenticationThrottleRule(
                AuthenticationProtectionCapacity.PublicRegistrationIp,
                _keyFactory.CreateIpQuotaKey(ThrottlePurpose.PublicRegistration, sourceAddress),
                RegistrationLimit,
                OperationWindow,
                CountOnAccepted: true),
            "public_registration",
            cancellationToken);

    public Task<OperationAdmissionResult> AdmitLoanCreationAsync(
        int accountId,
        CancellationToken cancellationToken = default) =>
        ConsumeAsync(
            new AuthenticationThrottleRule(
                AuthenticationProtectionCapacity.LoanCreationAccount,
                _keyFactory.CreateAccountQuotaKey(ThrottlePurpose.LoanCreation, accountId),
                LoanCreationLimit,
                OperationWindow,
                CountOnAccepted: true),
            "loan_creation",
            cancellationToken);

    public Task<OperationAdmissionResult> AdmitAuditQueryAsync(
        int administratorId,
        CancellationToken cancellationToken = default) =>
        ConsumeAsync(
            new AuthenticationThrottleRule(
                AuthenticationProtectionCapacity.AuditQueryAdministrator,
                _keyFactory.CreateAccountQuotaKey(ThrottlePurpose.AuditQuery, administratorId),
                AuditQueryLimit,
                AuditQueryWindow,
                CountOnAccepted: true),
            "audit_query",
            cancellationToken);

    public Task<OperationAdmissionResult> AdmitAuditExportAsync(
        int administratorId,
        CancellationToken cancellationToken = default) =>
        ConsumeAsync(
            new AuthenticationThrottleRule(
                AuthenticationProtectionCapacity.AuditExportAdministrator,
                _keyFactory.CreateAccountQuotaKey(ThrottlePurpose.AuditExport, administratorId),
                AuditExportLimit,
                AuditExportWindow,
                CountOnAccepted: true),
            "audit_export",
            cancellationToken);

    private async Task<OperationAdmissionResult> ConsumeAsync(
        AuthenticationThrottleRule rule,
        string operation,
        CancellationToken cancellationToken)
    {
        var admission = await _throttle.TryBeginAsync([rule], cancellationToken);
        switch (admission.State)
        {
            case AuthenticationThrottleState.RateLimited:
            case AuthenticationThrottleState.CapacityExceeded:
                _logger.LogInformation(
                    "Operation admission denied {Operation} {Result}",
                    operation,
                    "rate_limited");
                return OperationAdmissionResult.RateLimited(admission.RetryAfterSeconds);
            case AuthenticationThrottleState.Unavailable:
                _logger.LogWarning(
                    "Operation admission failed {Operation} {Result}",
                    operation,
                    "limiter_unavailable");
                return OperationAdmissionResult.Unavailable();
            case AuthenticationThrottleState.Allowed when admission.Attempt is not null:
                break;
            default:
                _logger.LogError(
                    "Operation admission returned an invalid state for {Operation}",
                    operation);
                return OperationAdmissionResult.Unavailable();
        }

        await using var attempt = admission.Attempt!;
        try
        {
            await attempt.CompleteAsync(AuthenticationThrottleOutcome.Accepted, cancellationToken);
            return OperationAdmissionResult.Allowed();
        }
        catch (Exception exception) when (IsInfrastructureFailure(exception, cancellationToken))
        {
            _logger.LogWarning(
                "Operation admission failed {Operation} {Result}",
                operation,
                "limiter_unavailable");
            return OperationAdmissionResult.Unavailable();
        }
    }

    private static bool IsInfrastructureFailure(Exception exception, CancellationToken callerToken)
    {
        if (callerToken.IsCancellationRequested && exception is OperationCanceledException)
        {
            return false;
        }

        for (Exception? current = exception; current is not null; current = current.InnerException)
        {
            if (current is DbException
                or TimeoutException
                || (current is OperationCanceledException && !callerToken.IsCancellationRequested))
            {
                return true;
            }
        }

        return false;
    }
}

public static class OperationAdmissionResponses
{
    public static Microsoft.AspNetCore.Mvc.ObjectResult RateLimited(
        HttpResponse response,
        int retryAfterSeconds)
    {
        ArgumentNullException.ThrowIfNull(response);
        var retryAfter = Math.Max(1, retryAfterSeconds);
        AuthenticationProtectionResponses.ApplyNoStore(response);
        response.Headers.RetryAfter = retryAfter.ToString(System.Globalization.CultureInfo.InvariantCulture);

        var problem = new Microsoft.AspNetCore.Mvc.ProblemDetails
        {
            Type = "https://httpstatuses.com/429",
            Title = "Aguarde antes de tentar novamente.",
            Status = StatusCodes.Status429TooManyRequests
        };
        problem.Extensions["code"] = "admission_rate_limited";
        problem.Extensions["retryAfterSeconds"] = retryAfter;
        return new Microsoft.AspNetCore.Mvc.ObjectResult(problem)
        {
            StatusCode = StatusCodes.Status429TooManyRequests,
            ContentTypes = { "application/problem+json" }
        };
    }

    public static Microsoft.AspNetCore.Mvc.ObjectResult Unavailable(HttpResponse response)
    {
        ArgumentNullException.ThrowIfNull(response);
        AuthenticationProtectionResponses.ApplyNoStore(response);
        var problem = new Microsoft.AspNetCore.Mvc.ProblemDetails
        {
            Type = "https://httpstatuses.com/503",
            Title = "A admissão da operação está temporariamente indisponível.",
            Status = StatusCodes.Status503ServiceUnavailable
        };
        problem.Extensions["code"] = "admission_limiter_unavailable";
        return new Microsoft.AspNetCore.Mvc.ObjectResult(problem)
        {
            StatusCode = StatusCodes.Status503ServiceUnavailable,
            ContentTypes = { "application/problem+json" }
        };
    }
}
