using System.Globalization;
using LabSolos_Server_DotNet8.Services;
using Microsoft.Extensions.Configuration;

namespace Tests.Services;

public sealed class ProductCivilDayTests
{
    [Theory]
    [InlineData("2026-11-17T02:59:59Z", 2026, 11, 16)]
    [InlineData("2026-11-17T03:00:00Z", 2026, 11, 17)]
    [InlineData("2027-01-01T02:59:59Z", 2026, 12, 31)]
    [InlineData("2027-01-01T03:00:00Z", 2027, 1, 1)]
    public void DefaultZoneChangesTheCivilDayAtInstitutionalMidnight(
        string instant, int year, int month, int day)
    {
        var reference = CreateReference(new FixedClock(DateTimeOffset.Parse(instant, CultureInfo.InvariantCulture)));

        Assert.Equal(new DateOnly(year, month, day), reference.GetToday());
    }

    [Fact]
    public void ConfiguredZoneIsUsedInsteadOfTheMachineZone()
    {
        var reference = CreateReference(
            new FixedClock(DateTimeOffset.Parse("2026-11-16T18:30:00Z", CultureInfo.InvariantCulture)), "Asia/Tokyo");

        Assert.Equal(new DateOnly(2026, 11, 17), reference.GetToday());
    }

    [Fact]
    public void SameClockAndConfigurationProduceTheSameDayForBothConsumers()
    {
        var clock = new FixedClock(DateTimeOffset.Parse("2026-11-17T02:59:59Z", CultureInfo.InvariantCulture));
        var registration = CreateReference(clock);
        var alerts = CreateReference(clock);

        Assert.Equal(registration.GetToday(), alerts.GetToday());
        clock.UtcNow = DateTimeOffset.Parse("2026-11-17T03:00:00Z", CultureInfo.InvariantCulture);
        Assert.Equal(new DateOnly(2026, 11, 17), registration.GetToday());
        Assert.Equal(registration.GetToday(), alerts.GetToday());
    }

    [Theory]
    [InlineData(DateTimeKind.Utc)]
    [InlineData(DateTimeKind.Unspecified)]
    [InlineData(DateTimeKind.Local)]
    public void StoredCivilDateKeepsItsCalendarDay(DateTimeKind kind)
    {
        var storedDate = new DateTime(2026, 11, 16, 0, 0, 0, kind);

        Assert.Equal(new DateOnly(2026, 11, 16), ProductCivilDay.FromStoredDate(storedDate));
    }

    [Theory]
    [InlineData("Not/A_Time_Zone")]
    [InlineData("")]
    [InlineData(" ")]
    public void InvalidConfiguredZoneIsReportedInsteadOfUsingAnotherZone(string zone)
    {
        Assert.Throws<InvalidOperationException>(() => CreateReference(
            new FixedClock(DateTimeOffset.Parse("2026-11-17T02:30:00Z", CultureInfo.InvariantCulture)), zone));
    }

    [Theory]
    [InlineData("2026-11-17", "2026-11-17T03:00:00Z")]
    [InlineData("2026-11-17T03:00:00Z", "2026-11-17T03:00:00Z")]
    [InlineData("2026-11-17T05:00:00+02:00", "2026-11-17T03:00:00Z")]
    [InlineData("2026-11-17T00:00:00-03:00", "2026-11-17T03:00:00Z")]
    [InlineData("2026-11-17T03:00:00.1Z", "2026-11-17T03:00:00.1Z")]
    [InlineData("2026-11-17T03:00:00.1234567-03:00", "2026-11-17T06:00:00.1234567Z")]
    public void ApiDateFilterParsesCivilDaysAndIsoInstants(
        string value,
        string expectedUtc)
    {
        var parsed = ApiDateFilters.TryParse(
            value,
            TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo"),
            out var utc);

        Assert.True(parsed);
        Assert.Equal(DateTimeOffset.Parse(expectedUtc, CultureInfo.InvariantCulture).UtcDateTime, utc);
        Assert.Equal(DateTimeKind.Utc, utc.Kind);
    }

    [Theory]
    [InlineData("")]
    [InlineData("2026-11-17T03:00:00")]
    [InlineData("16/11/2026")]
    [InlineData("x026-11-17T03:00:00Z")]
    [InlineData("2026-1x-17T03:00:00Z")]
    [InlineData("2026-11-x7T03:00:00Z")]
    [InlineData("2026-11-17x03:00:00Z")]
    [InlineData("2026-11-17t03:00:00Z")]
    [InlineData("2026-11-17T0x:00:00Z")]
    [InlineData("2026-11-17T03x00:00Z")]
    [InlineData("2026-11-17T03:0x:00Z")]
    [InlineData("2026-11-17T03:00x00Z")]
    [InlineData("2026-11-17T03:00:0xZ")]
    [InlineData("2026-11-17T03:00:00.Z")]
    [InlineData("2026-11-17T03:00:00.12345678Z")]
    [InlineData("2026-11-17T03:00:00+03:0x")]
    [InlineData("2026-11-17T03:00:00+03x00")]
    [InlineData("2026-11-17T03:00:00Zextra")]
    public void ApiDateFilterRejectsMalformedOrAmbiguousSyntax(string value)
    {
        Assert.False(ApiDateFilters.TryParse(value, TimeZoneInfo.Utc, out _));
    }

    [Fact]
    public void ApiDateFilterRejectsCivilMidnightInAClockGapOrOverlap()
    {
        var zone = CreateTransitionZone();

        Assert.False(ApiDateFilters.TryParse("2026-03-01", zone, out _));
        Assert.False(ApiDateFilters.TryParse("2026-10-01", zone, out _));
    }

    private static ProductCivilDay CreateReference(TimeProvider clock, string? zone = null)
    {
        var settings = new Dictionary<string, string?>();
        if (zone is not null)
        {
            settings["Products:TimeZone"] = zone;
        }

        return new ProductCivilDay(
            clock, new ConfigurationBuilder().AddInMemoryCollection(settings).Build());
    }

    private static TimeZoneInfo CreateTransitionZone()
    {
        var start = TimeZoneInfo.TransitionTime.CreateFixedDateRule(
            new DateTime(1, 1, 1, 0, 0, 0), month: 3, day: 1);
        var end = TimeZoneInfo.TransitionTime.CreateFixedDateRule(
            new DateTime(1, 1, 1, 1, 0, 0), month: 10, day: 1);
        var rule = TimeZoneInfo.AdjustmentRule.CreateAdjustmentRule(
            new DateTime(2026, 1, 1),
            new DateTime(2026, 12, 31),
            TimeSpan.FromHours(1),
            start,
            end);

        return TimeZoneInfo.CreateCustomTimeZone(
            "Synthetic/SaoPauloWithDst",
            TimeSpan.FromHours(-3),
            "Synthetic time zone",
            "Synthetic standard time",
            "Synthetic daylight time",
            [rule]);
    }

    private sealed class FixedClock(DateTimeOffset utcNow) : TimeProvider
    {
        public DateTimeOffset UtcNow { get; set; } = utcNow;

        public override DateTimeOffset GetUtcNow() => UtcNow;
    }
}
