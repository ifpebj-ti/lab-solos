namespace LabSolos_Server_DotNet8.Services;

public sealed class ProductCivilDay
{
    private readonly TimeProvider _timeProvider;
    private readonly TimeZoneInfo _timeZone;

    public ProductCivilDay(TimeProvider timeProvider, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(timeProvider);
        ArgumentNullException.ThrowIfNull(configuration);

        _timeProvider = timeProvider;
        var zoneId = configuration["Products:TimeZone"] ?? "America/Sao_Paulo";
        if (string.IsNullOrWhiteSpace(zoneId))
        {
            throw new InvalidOperationException("Products:TimeZone must identify a valid time zone.");
        }

        try
        {
            _timeZone = TimeZoneInfo.FindSystemTimeZoneById(zoneId);
        }
        catch (Exception error) when (error is TimeZoneNotFoundException or InvalidTimeZoneException)
        {
            throw new InvalidOperationException(
                "Products:TimeZone must identify a valid time zone.", error);
        }
    }

    public DateOnly GetToday() =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(_timeProvider.GetUtcNow(), _timeZone).DateTime);

    // Product dates at UTC midnight encode a calendar day, not an event instant.
    public static DateOnly FromStoredDate(DateTime storedDate) => DateOnly.FromDateTime(storedDate);
}
