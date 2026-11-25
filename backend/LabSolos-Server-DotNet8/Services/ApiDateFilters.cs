using System.Globalization;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace LabSolos_Server_DotNet8.Services;

public static partial class ApiDateFilters
{
    public static bool TryParse(string value, TimeZoneInfo timeZone, out DateTime utc)
    {
        utc = default;
        if (DateOnly.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var civil))
        {
            var midnight = civil.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified);
            if (timeZone.IsInvalidTime(midnight) || timeZone.IsAmbiguousTime(midnight))
                return false;
            utc = TimeZoneInfo.ConvertTimeToUtc(midnight, timeZone);
            return true;
        }

        if (!HasIsoDateTimeSyntax(value.AsSpan())
            || !DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var instant))
            return false;

        utc = instant.UtcDateTime;
        return true;
    }

    private static bool HasIsoDateTimeSyntax(ReadOnlySpan<char> value)
    {
        if (value.Length < 20
            || !HasDigits(value, 0, 4)
            || value[4] != '-'
            || !HasDigits(value, 5, 2)
            || value[7] != '-'
            || !HasDigits(value, 8, 2)
            || value[10] != 'T'
            || !HasDigits(value, 11, 2)
            || value[13] != ':'
            || !HasDigits(value, 14, 2)
            || value[16] != ':'
            || !HasDigits(value, 17, 2))
        {
            return false;
        }

        var zoneStart = 19;
        if (value[zoneStart] == '.')
        {
            var fractionStart = ++zoneStart;
            while (zoneStart < value.Length && char.IsDigit(value[zoneStart]))
            {
                zoneStart++;
            }

            var fractionLength = zoneStart - fractionStart;
            if (fractionLength is < 1 or > 7)
            {
                return false;
            }
        }

        if (zoneStart == value.Length - 1 && value[zoneStart] == 'Z')
        {
            return true;
        }

        return zoneStart + 6 == value.Length
            && value[zoneStart] is '+' or '-'
            && HasDigits(value, zoneStart + 1, 2)
            && value[zoneStart + 3] == ':'
            && HasDigits(value, zoneStart + 4, 2);
    }

    private static bool HasDigits(ReadOnlySpan<char> value, int start, int count)
    {
        for (var index = start; index < start + count; index++)
        {
            if (!char.IsDigit(value[index]))
            {
                return false;
            }
        }

        return true;
    }
}

public sealed class ApiDateFilterBinderProvider : IModelBinderProvider
{
    public IModelBinder? GetBinder(ModelBinderProviderContext context)
    {
        ArgumentNullException.ThrowIfNull(context);
        var type = context.Metadata.ModelType;
        return (type == typeof(DateTime) || type == typeof(DateTime?))
            && context.BindingInfo.BindingSource?.CanAcceptDataFrom(BindingSource.Query) != false
                ? new ApiDateFilterBinder()
                : null;
    }
}

internal sealed class ApiDateFilterBinder : IModelBinder
{
    public Task BindModelAsync(ModelBindingContext bindingContext)
    {
        var values = bindingContext.ValueProvider.GetValue(bindingContext.ModelName);
        if (values == ValueProviderResult.None)
            return Task.CompletedTask;

        bindingContext.ModelState.SetModelValue(bindingContext.ModelName, values);
        if (values.Length != 1 || string.IsNullOrEmpty(values.FirstValue))
        {
            bindingContext.ModelState.TryAddModelError(bindingContext.ModelName, "Informe uma data válida.");
            return Task.CompletedTask;
        }

        var configuration = bindingContext.HttpContext.RequestServices.GetRequiredService<IConfiguration>();
        var zone = TimeZoneInfo.FindSystemTimeZoneById(
            configuration["Products:TimeZone"] ?? "America/Sao_Paulo");
        if (ApiDateFilters.TryParse(values.FirstValue, zone, out var utc))
            bindingContext.Result = ModelBindingResult.Success(utc);
        else
            bindingContext.ModelState.TryAddModelError(bindingContext.ModelName,
                "Use uma data yyyy-MM-dd ou um instante ISO 8601 com fuso.");

        return Task.CompletedTask;
    }
}
