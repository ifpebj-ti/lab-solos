using System.Data.Common;
using LabSolos_Server_DotNet8.DTOs.Auth;
using LabSolos_Server_DotNet8.Models;

namespace LabSolos_Server_DotNet8.Services.Security;

public static class PasswordChangeRateLimitPolicy
{
    public const int FailureLimit = 5;
    public static readonly TimeSpan Window = TimeSpan.FromMinutes(15);

    public static AuthenticationThrottleRule CreateRule(int accountId, ThrottleKeyFactory keyFactory)
    {
        ArgumentNullException.ThrowIfNull(keyFactory);

        return new AuthenticationThrottleRule(
            AuthenticationProtectionCapacity.PasswordChange,
            keyFactory.CreateAccountQuotaKey(ThrottlePurpose.PasswordChange, accountId),
            FailureLimit,
            Window);
    }
}

public interface IPasswordChangeRateLimitService
{
    Task<CredentialChangeResult> ChangePasswordAsync(
        int accountId,
        ChangePasswordDTO request,
        CancellationToken cancellationToken = default);
}

public sealed class PasswordChangeRateLimitService(
    ICredentialService credentialService,
    PostgresAuthenticationThrottle throttle,
    ThrottleKeyFactory keyFactory,
    AuthenticationProtectionTelemetry telemetry) : IPasswordChangeRateLimitService
{
    private readonly ICredentialService _credentialService =
        credentialService ?? throw new ArgumentNullException(nameof(credentialService));
    private readonly PostgresAuthenticationThrottle _throttle =
        throttle ?? throw new ArgumentNullException(nameof(throttle));
    private readonly ThrottleKeyFactory _keyFactory =
        keyFactory ?? throw new ArgumentNullException(nameof(keyFactory));
    private readonly AuthenticationProtectionTelemetry _telemetry =
        telemetry ?? throw new ArgumentNullException(nameof(telemetry));

    public async Task<CredentialChangeResult> ChangePasswordAsync(
        int accountId,
        ChangePasswordDTO request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        var admission = await _throttle.TryBeginAsync(
            [PasswordChangeRateLimitPolicy.CreateRule(accountId, _keyFactory)],
            cancellationToken);
        switch (admission.State)
        {
            case AuthenticationThrottleState.RateLimited:
                _telemetry.RecordAuthenticationThrottled(
                    AuthenticationProtectionOperation.PasswordChange,
                    AuthenticationProtectionReason.RateLimited);
                return CredentialChangeResult.RateLimited(admission.RetryAfterSeconds);
            case AuthenticationThrottleState.CapacityExceeded:
                _telemetry.RecordAuthenticationThrottled(
                    AuthenticationProtectionOperation.PasswordChange,
                    AuthenticationProtectionReason.CapacityExhausted);
                return CredentialChangeResult.RateLimited(admission.RetryAfterSeconds);
            case AuthenticationThrottleState.Unavailable:
                _telemetry.RecordFailure(
                    AuthenticationProtectionOperation.PasswordChange,
                    AuthenticationProtectionReason.DependencyUnavailable);
                return CredentialChangeResult.Unavailable();
            case AuthenticationThrottleState.Allowed when admission.Attempt is not null:
                break;
            default:
                _telemetry.RecordFailure(
                    AuthenticationProtectionOperation.PasswordChange,
                    AuthenticationProtectionReason.Unexpected);
                return CredentialChangeResult.Unavailable();
        }

        await using var attempt = admission.Attempt!;
        try
        {
            var result = await _credentialService.ChangePasswordAsync(
                accountId,
                request.CurrentPassword,
                request.NewPassword,
                request.Confirmation,
                cancellationToken);

            var outcome = IsInvalidCurrentPassword(result)
                ? AuthenticationThrottleOutcome.Failure
                : AuthenticationThrottleOutcome.Accepted;
            await attempt.CompleteAsync(
                outcome,
                outcome == AuthenticationThrottleOutcome.Failure
                    ? CancellationToken.None
                    : cancellationToken);
            return result;
        }
        catch (Exception exception) when (IsInfrastructureFailure(exception, cancellationToken))
        {
            _telemetry.RecordFailure(
                AuthenticationProtectionOperation.PasswordChange,
                AuthenticationProtectionReason.DependencyUnavailable);
            return CredentialChangeResult.Unavailable();
        }
    }

    private static bool IsInvalidCurrentPassword(CredentialChangeResult result) =>
        result.Status == CredentialChangeStatus.ValidationFailed
        && result.Code == CredentialErrorCodes.CurrentPasswordInvalid;

    private static bool IsInfrastructureFailure(Exception exception, CancellationToken callerToken)
    {
        if (callerToken.IsCancellationRequested && exception is OperationCanceledException)
        {
            return false;
        }

        for (Exception? current = exception; current is not null; current = current.InnerException)
        {
            if (current is DbException
                or IOException
                or UnauthorizedAccessException
                or TimeoutException
                or System.Security.Cryptography.CryptographicException
                || (current is OperationCanceledException && !callerToken.IsCancellationRequested))
            {
                return true;
            }
        }

        return false;
    }
}
