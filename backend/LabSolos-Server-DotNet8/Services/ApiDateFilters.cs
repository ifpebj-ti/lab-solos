using System.Globalization;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace LabSolos_Server_DotNet8.Services;

public static partial class ApiDateFilters
{
    private static readonly Regex IsoDateTimePattern = new(
        @"\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?(?:Z|[+-]\d{2}:\d{2})\z",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

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

        if (!IsoDateTimePattern.IsMatch(value)
            || !DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var instant))
            return false;

        utc = instant.UtcDateTime;
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
