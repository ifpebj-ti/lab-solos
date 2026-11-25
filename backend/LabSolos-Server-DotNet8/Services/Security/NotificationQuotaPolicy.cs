using LabSolos_Server_DotNet8.Models;

namespace LabSolos_Server_DotNet8.Services.Security;

public sealed class NotificationQuotaExceededException(int retryAfterSeconds)
    : InvalidOperationException("O limite de emissões de notificações foi atingido.")
{
    public int RetryAfterSeconds { get; } = Math.Max(1, retryAfterSeconds);
}

public sealed class NotificationQuotaUnavailableException()
    : InvalidOperationException("A admissão de notificações está temporariamente indisponível.");

/// <summary>
/// Reserves a PostgreSQL throttle transaction. The caller completes the attempt only
/// after adding the notification and its required audit event to the shared DbContext.
/// </summary>
public sealed class NotificationQuotaPolicy(
    PostgresAuthenticationThrottle throttle,
    ThrottleKeyFactory keyFactory)
{
    public const int ManualLimit = 30;
    public const int AutomaticLimit = 60;
    public static readonly TimeSpan Window = TimeSpan.FromHours(1);

    private readonly PostgresAuthenticationThrottle _throttle =
        throttle ?? throw new ArgumentNullException(nameof(throttle));
    private readonly ThrottleKeyFactory _keyFactory =
        keyFactory ?? throw new ArgumentNullException(nameof(keyFactory));

    public Task<AuthenticationThrottleAttempt> BeginManualAsync(
        int administratorId,
        CancellationToken cancellationToken = default) =>
        BeginAsync(CreateManualRule(administratorId, _keyFactory), cancellationToken);

    public Task<AuthenticationThrottleAttempt> BeginAutomaticAsync(
        string serviceIdentity,
        CancellationToken cancellationToken = default) =>
        BeginAsync(CreateAutomaticRule(serviceIdentity, _keyFactory), cancellationToken);

    public static AuthenticationThrottleRule CreateManualRule(
        int administratorId,
        ThrottleKeyFactory keyFactory)
    {
        ArgumentNullException.ThrowIfNull(keyFactory);
        return new AuthenticationThrottleRule(
            AuthenticationProtectionCapacity.NotificationManualAdministrator,
            keyFactory.CreateAccountQuotaKey(ThrottlePurpose.NotificationManual, administratorId),
            ManualLimit,
            Window,
            CountOnAccepted: true);
    }

    public static AuthenticationThrottleRule CreateAutomaticRule(
        string serviceIdentity,
        ThrottleKeyFactory keyFactory)
    {
        ArgumentNullException.ThrowIfNull(keyFactory);
        return new AuthenticationThrottleRule(
            AuthenticationProtectionCapacity.NotificationAutomaticService,
            keyFactory.CreateServiceQuotaKey(ThrottlePurpose.NotificationAutomatic, serviceIdentity),
            AutomaticLimit,
            Window,
            CountOnAccepted: true);
    }

    private async Task<AuthenticationThrottleAttempt> BeginAsync(
        AuthenticationThrottleRule rule,
        CancellationToken cancellationToken)
    {
        var result = await _throttle.TryBeginAsync([rule], cancellationToken);
        if (result.State == AuthenticationThrottleState.Allowed && result.Attempt is not null)
        {
            return result.Attempt;
        }

        if (result.State is AuthenticationThrottleState.RateLimited or AuthenticationThrottleState.CapacityExceeded)
        {
            throw new NotificationQuotaExceededException(result.RetryAfterSeconds);
        }

        throw new NotificationQuotaUnavailableException();
    }
}
