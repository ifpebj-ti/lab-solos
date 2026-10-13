using System.Diagnostics.Metrics;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.Extensions.Logging;

namespace Tests.Security;

public sealed class AuthenticationProtectionTelemetryTests
{
    private static readonly HashSet<string> AllowedTagNames = new(StringComparer.Ordinal)
    {
        "operation",
        "result",
        "reason"
    };

    private static readonly HashSet<string> AllowedTagValues = new(StringComparer.Ordinal)
    {
        "login",
        "recovery_request",
        "password_change",
        "user_read",
        "user_write",
        "loan_read",
        "success",
        "denied",
        "throttled",
        "failure",
        "accepted",
        "delivered",
        "rejected",
        "unauthenticated",
        "forbidden",
        "not_found",
        "rate_limited",
        "capacity_exhausted",
        "dependency_unavailable",
        "invalid_configuration",
        "delivery_failed",
        "unexpected",
        "unknown"
    };

    [Fact]
    public void EmitsOnlyTheDocumentedMetricsAndBoundedTags()
    {
        var logger = new CapturingLogger<AuthenticationProtectionTelemetry>();
        var telemetry = new AuthenticationProtectionTelemetry(logger);
        var measurements = new List<MeasurementRecord>();
        var instruments = new HashSet<string>(StringComparer.Ordinal);
        using var listener = new MeterListener();
        listener.InstrumentPublished = (instrument, meterListener) =>
        {
            if (instrument.Meter.Name == "LabSolos.AuthenticationProtection")
            {
                instruments.Add(instrument.Name);
                meterListener.EnableMeasurementEvents(instrument);
            }
        };
        listener.SetMeasurementEventCallback<long>((instrument, value, tags, _) =>
            measurements.Add(MeasurementRecord.From(instrument.Name, value, tags)));
        listener.SetMeasurementEventCallback<double>((instrument, value, tags, _) =>
            measurements.Add(MeasurementRecord.From(instrument.Name, value, tags)));
        listener.Start();

        telemetry.RecordAccessDenied(AuthenticationProtectionOperation.LoanRead, AuthenticationProtectionReason.Forbidden);
        telemetry.RecordAuthenticationThrottled(AuthenticationProtectionOperation.Login, AuthenticationProtectionReason.RateLimited);
        telemetry.RecordRecoveryDelivery(AuthenticationProtectionResult.Failure, AuthenticationProtectionReason.DeliveryFailed);
        telemetry.AddRecoveryJob();
        telemetry.RemoveRecoveryJob();
        telemetry.AddThrottleCapacityUsage(2);
        telemetry.RemoveThrottleCapacityUsage(2);
        telemetry.RecordFailure(AuthenticationProtectionOperation.RecoveryRequest, AuthenticationProtectionReason.DependencyUnavailable);
        telemetry.RecordAuthenticationAdmission(
            TimeSpan.FromMilliseconds(12.5),
            AuthenticationProtectionOperation.Login,
            AuthenticationProtectionResult.Denied);
        telemetry.RecordRecoveryDeliveryDuration(
            TimeSpan.FromMilliseconds(84),
            AuthenticationProtectionResult.Delivered);

        Assert.Equal(
        [
            "access_denied_total",
            "authentication_admission_duration",
            "authentication_protection_failure_total",
            "authentication_throttled_total",
            "recovery_delivery_duration",
            "recovery_delivery_total",
            "recovery_jobs_active",
            "throttle_capacity_used"
        ],
            instruments.Order(StringComparer.Ordinal));
        Assert.Equal(10, measurements.Count);
        Assert.All(measurements, measurement =>
        {
            Assert.All(measurement.Tags, tag =>
            {
                var separator = tag.IndexOf('=');
                Assert.True(separator > 0);
                Assert.Contains(tag[..separator], AllowedTagNames);
                var value = tag[(separator + 1)..];
                Assert.Contains(value, AllowedTagValues);
                Assert.DoesNotContain('@', value);
                Assert.DoesNotContain("203.0.113.", value, StringComparison.Ordinal);
                Assert.False(Guid.TryParse(value, out _));
                Assert.DoesNotContain("CANARY", value, StringComparison.OrdinalIgnoreCase);
            });
        });
        Assert.Contains(measurements, measurement =>
            measurement.Name == "access_denied_total" &&
            measurement.Tags.SequenceEqual(["operation=loan_read", "reason=forbidden"]));
        Assert.Contains(measurements, measurement =>
            measurement.Name == "authentication_throttled_total" &&
            measurement.Tags.SequenceEqual(["operation=login", "reason=rate_limited"]));
        Assert.Contains(measurements, measurement =>
            measurement.Name == "recovery_delivery_total" &&
            measurement.Tags.SequenceEqual(["reason=delivery_failed", "result=failure"]));
        Assert.Contains(measurements, measurement =>
            measurement.Name == "authentication_protection_failure_total" &&
            measurement.Tags.SequenceEqual(["operation=recovery_request", "reason=dependency_unavailable"]));
        Assert.Collection(
            measurements.Where(measurement => measurement.Name == "recovery_jobs_active"),
            measurement => Assert.Equal(1, measurement.Value),
            measurement => Assert.Equal(-1, measurement.Value));
        Assert.Collection(
            measurements.Where(measurement => measurement.Name == "throttle_capacity_used"),
            measurement => Assert.Equal(2, measurement.Value),
            measurement => Assert.Equal(-2, measurement.Value));
        Assert.Contains(measurements, measurement =>
            measurement.Name == "authentication_admission_duration" &&
            measurement.Value == 12.5 &&
            measurement.Tags.SequenceEqual(["operation=login", "result=denied"]));
        Assert.Contains(measurements, measurement =>
            measurement.Name == "recovery_delivery_duration" &&
            measurement.Value == 84 &&
            measurement.Tags.SequenceEqual(["result=delivered"]));
        Assert.Equal(4, logger.Messages.Count);
        Assert.DoesNotContain("CANARY", string.Join(Environment.NewLine, logger.Messages), StringComparison.OrdinalIgnoreCase);
        Assert.All(logger.Exceptions, Assert.Null);
    }

    [Fact]
    public void MapsUnknownEnumValuesToOneSafeTagValue()
    {
        var telemetry = new AuthenticationProtectionTelemetry(
            new CapturingLogger<AuthenticationProtectionTelemetry>());
        var measurements = new List<MeasurementRecord>();
        using var listener = CreateListener(measurements);

        telemetry.RecordFailure(
            (AuthenticationProtectionOperation)int.MaxValue,
            (AuthenticationProtectionReason)int.MaxValue);

        var measurement = Assert.Single(measurements);
        Assert.Equal("authentication_protection_failure_total", measurement.Name);
        Assert.Equal(["operation=unknown", "reason=unknown"], measurement.Tags);
    }

    [Fact]
    public void RejectsInvalidDurationAndCapacityChanges()
    {
        var telemetry = new AuthenticationProtectionTelemetry(
            new CapturingLogger<AuthenticationProtectionTelemetry>());

        Assert.Throws<ArgumentOutOfRangeException>(() => telemetry.RecordAuthenticationAdmission(
            TimeSpan.FromMilliseconds(-1),
            AuthenticationProtectionOperation.Login,
            AuthenticationProtectionResult.Denied));
        Assert.Throws<ArgumentOutOfRangeException>(() => telemetry.AddThrottleCapacityUsage(0));
        Assert.Throws<ArgumentOutOfRangeException>(() => telemetry.RemoveThrottleCapacityUsage(-1));
    }

    private static MeterListener CreateListener(List<MeasurementRecord> measurements)
    {
        var listener = new MeterListener();
        listener.InstrumentPublished = (instrument, meterListener) =>
        {
            if (instrument.Meter.Name == "LabSolos.AuthenticationProtection")
            {
                meterListener.EnableMeasurementEvents(instrument);
            }
        };
        listener.SetMeasurementEventCallback<long>((instrument, value, tags, _) =>
            measurements.Add(MeasurementRecord.From(instrument.Name, value, tags)));
        listener.SetMeasurementEventCallback<double>((instrument, value, tags, _) =>
            measurements.Add(MeasurementRecord.From(instrument.Name, value, tags)));
        listener.Start();
        return listener;
    }

    private sealed record MeasurementRecord(string Name, double Value, string[] Tags)
    {
        public static MeasurementRecord From<T>(string name, T value, ReadOnlySpan<KeyValuePair<string, object?>> tags)
            where T : IConvertible => new(
                name,
                value.ToDouble(System.Globalization.CultureInfo.InvariantCulture),
                tags.ToArray()
                    .Select(tag => $"{tag.Key}={tag.Value}")
                    .Order(StringComparer.Ordinal)
                    .ToArray());
    }

    private sealed class CapturingLogger<T> : ILogger<T>
    {
        public List<string> Messages { get; } = [];
        public List<Exception?> Exceptions { get; } = [];

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            Messages.Add(formatter(state, exception));
            Exceptions.Add(exception);
        }
    }
}
