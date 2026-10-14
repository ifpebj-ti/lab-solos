using System.Globalization;
using Microsoft.AspNetCore.Mvc;

namespace LabSolos_Server_DotNet8.Services.Security;

public static class AuthenticationProtectionResponses
{
    public static void ApplyNoStore(HttpResponse response)
    {
        ArgumentNullException.ThrowIfNull(response);
        response.Headers.CacheControl = "no-store";
        response.Headers.Pragma = "no-cache";
    }

    public static ObjectResult RateLimited(HttpResponse response, int retryAfterSeconds)
    {
        ArgumentNullException.ThrowIfNull(response);
        var retryAfter = Math.Max(1, retryAfterSeconds);
        ApplyNoStore(response);
        response.Headers.RetryAfter = retryAfter.ToString(CultureInfo.InvariantCulture);

        var details = new ProblemDetails
        {
            Type = "https://httpstatuses.com/429",
            Title = "Aguarde antes de tentar novamente.",
            Status = StatusCodes.Status429TooManyRequests
        };
        details.Extensions["code"] = "authentication_rate_limited";
        details.Extensions["retryAfterSeconds"] = retryAfter;

        return new ObjectResult(details)
        {
            StatusCode = StatusCodes.Status429TooManyRequests,
            ContentTypes = { "application/problem+json" }
        };
    }

    public static ObjectResult Unavailable(HttpResponse response)
    {
        ArgumentNullException.ThrowIfNull(response);
        ApplyNoStore(response);

        var details = new ProblemDetails
        {
            Type = "https://httpstatuses.com/503",
            Title = "Autenticação temporariamente indisponível.",
            Status = StatusCodes.Status503ServiceUnavailable
        };
        details.Extensions["code"] = "authentication_protection_unavailable";

        return new ObjectResult(details)
        {
            StatusCode = StatusCodes.Status503ServiceUnavailable,
            ContentTypes = { "application/problem+json" }
        };
    }
}
