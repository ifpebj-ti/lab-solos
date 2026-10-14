using System.Diagnostics;
using System.Net;
using System.Net.Mail;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using Microsoft.Extensions.Options;

namespace LabSolos_Server_DotNet8.Services.Security;

public interface IPasswordRecoveryRequestService
{
    Task AdmitAsync(
        string? email,
        IPAddress? remoteIpAddress,
        CancellationToken cancellationToken = default);
}

public sealed record PasswordRecoveryRequestPayload(
    [property: JsonPropertyName("email")] string Email);

public sealed class PasswordRecoveryRequestService : IPasswordRecoveryRequestService
{
    private const int MaximumEmailLength = 254;
    private static readonly JsonSerializerOptions PayloadSerializerOptions = new(JsonSerializerDefaults.Web);

    private readonly PostgresAuthenticationThrottle _throttle;
    private readonly PasswordRecoveryJobRepository _jobs;
    private readonly ThrottleKeyFactory _keyFactory;
    private readonly IOptions<AuthenticationProtectionOptions> _options;
    private readonly TimeProvider _timeProvider;
    private readonly AuthenticationProtectionTelemetry _telemetry;

    public PasswordRecoveryRequestService(
        PostgresAuthenticationThrottle throttle,
        PasswordRecoveryJobRepository jobs,
        ThrottleKeyFactory keyFactory,
        IOptions<AuthenticationProtectionOptions> options,
        TimeProvider timeProvider,
        AuthenticationProtectionTelemetry telemetry)
    {
        _throttle = throttle ?? throw new ArgumentNullException(nameof(throttle));
        _jobs = jobs ?? throw new ArgumentNullException(nameof(jobs));
        _keyFactory = keyFactory ?? throw new ArgumentNullException(nameof(keyFactory));
        _options = options ?? throw new ArgumentNullException(nameof(options));
        _timeProvider = timeProvider ?? throw new ArgumentNullException(nameof(timeProvider));
        _telemetry = telemetry ?? throw new ArgumentNullException(nameof(telemetry));
    }

    public async Task AdmitAsync(
        string? email,
        IPAddress? remoteIpAddress,
        CancellationToken cancellationToken = default)
    {
        var startedAt = Stopwatch.GetTimestamp();
        var telemetryResult = AuthenticationProtectionResult.Rejected;
        byte[]? recipientKey = null;
        byte[]? ipKey = null;
        byte[]? deliveryKey = null;
        byte[]? requestPayload = null;
        try
        {
            if (!IsValidEmail(email))
            {
                return;
            }

            cancellationToken.ThrowIfCancellationRequested();
            var options = _options.Value;
            var requestOptions = options.RecoveryRequest;
            var window = TimeSpan.FromSeconds(requestOptions.WindowSeconds);
            recipientKey = _keyFactory.CreateRecipientQuotaKey(ThrottlePurpose.RecoveryRequest, email!);
            ipKey = _keyFactory.CreateIpQuotaKey(ThrottlePurpose.RecoveryRequest, remoteIpAddress);
            var rules = new[]
            {
                new AuthenticationThrottleRule(
                    AuthenticationProtectionCapacity.RecoveryRequestRecipient,
                    recipientKey,
                    requestOptions.RecipientRequests,
                    window,
                    CountOnAccepted: true,
                    AcceptedCooldown: TimeSpan.FromSeconds(requestOptions.CooldownSeconds)),
                new AuthenticationThrottleRule(
                    AuthenticationProtectionCapacity.RecoveryRequestIp,
                    ipKey,
                    requestOptions.IpRequests,
                    window,
                    CountOnAccepted: true)
            };

            var admission = await _throttle.TryBeginAsync(rules, cancellationToken);
            if (admission.State != AuthenticationThrottleState.Allowed || admission.Attempt is null)
            {
                RecordRejectedAdmission(admission.State);
                telemetryResult = admission.State == AuthenticationThrottleState.RateLimited
                    ? AuthenticationProtectionResult.Throttled
                    : AuthenticationProtectionResult.Rejected;
                return;
            }

            await using var attempt = admission.Attempt;
            deliveryKey = _keyFactory.CreateRecoveryDeliveryKey(email!);
            requestPayload = JsonSerializer.SerializeToUtf8Bytes(
                new PasswordRecoveryRequestPayload(email!),
                PayloadSerializerOptions);
            var expiresAt = _timeProvider.GetUtcNow()
                .AddSeconds(options.Delivery.RequestMaxAgeSeconds);
            var enqueue = await _jobs.EnqueueOrCoalesceAsync(
                deliveryKey,
                recipientKey,
                requestPayload,
                expiresAt,
                cancellationToken);
            if (enqueue.Status == RecoveryJobEnqueueStatus.QueueFull)
            {
                _telemetry.RecordFailure(
                    AuthenticationProtectionOperation.RecoveryRequest,
                    AuthenticationProtectionReason.CapacityExhausted);
                return;
            }

            await attempt.CompleteAsync(AuthenticationThrottleOutcome.Accepted, cancellationToken);
            telemetryResult = AuthenticationProtectionResult.Accepted;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            telemetryResult = AuthenticationProtectionResult.Failure;
            throw;
        }
        catch (Exception)
        {
            _telemetry.RecordFailure(
                AuthenticationProtectionOperation.RecoveryRequest,
                AuthenticationProtectionReason.Unexpected);
        }
        finally
        {
            ZeroIfPresent(requestPayload);
            ZeroIfPresent(deliveryKey);
            ZeroIfPresent(recipientKey);
            ZeroIfPresent(ipKey);
            _telemetry.RecordAuthenticationAdmission(
                Stopwatch.GetElapsedTime(startedAt),
                AuthenticationProtectionOperation.RecoveryRequest,
                telemetryResult);
        }
    }

    private static void ZeroIfPresent(byte[]? value)
    {
        if (value is not null)
        {
            CryptographicOperations.ZeroMemory(value);
        }
    }

    private void RecordRejectedAdmission(AuthenticationThrottleState state)
    {
        if (state == AuthenticationThrottleState.RateLimited)
        {
            _telemetry.RecordAuthenticationThrottled(
                AuthenticationProtectionOperation.RecoveryRequest,
                AuthenticationProtectionReason.RateLimited);
        }
        else if (state == AuthenticationThrottleState.CapacityExceeded)
        {
            _telemetry.RecordAuthenticationThrottled(
                AuthenticationProtectionOperation.RecoveryRequest,
                AuthenticationProtectionReason.CapacityExhausted);
        }
        else
        {
            _telemetry.RecordFailure(
                AuthenticationProtectionOperation.RecoveryRequest,
                AuthenticationProtectionReason.DependencyUnavailable);
        }
    }

    private static bool IsValidEmail(string? email) =>
        !string.IsNullOrWhiteSpace(email)
        && email.Length <= MaximumEmailLength
        && !email.Any(char.IsControl)
        && MailAddress.TryCreate(email, out var address)
        && string.Equals(address.Address, email, StringComparison.Ordinal);
}
