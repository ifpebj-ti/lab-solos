using System.Globalization;

namespace Core.DTOs.Mappings;

/// <summary>
/// Formats product dates as civil dates for read projections.
/// </summary>
public static class ProductCivilDateFormatter
{
    public static string? FormatForRead(DateTime? value)
    {
        if (!value.HasValue || value.Value == DateTime.MinValue)
        {
            return null;
        }

        return value.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
    }
}
