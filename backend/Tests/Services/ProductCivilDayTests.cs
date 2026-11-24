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

    private sealed class FixedClock(DateTimeOffset utcNow) : TimeProvider
    {
        public DateTimeOffset UtcNow { get; set; } = utcNow;

        public override DateTimeOffset GetUtcNow() => UtcNow;
    }
}
