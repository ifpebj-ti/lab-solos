namespace LabSolos_Server_DotNet8.Middlewares;

public sealed class ApiResponseHeadersMiddleware(RequestDelegate next)
{
    private const string ContentSecurityPolicy =
        "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
    private const string PermissionsPolicy = "camera=(), geolocation=(), microphone=()";

    public async Task InvokeAsync(HttpContext context)
    {
        if (!context.Request.Path.StartsWithSegments("/api"))
        {
            await next(context);
            return;
        }

        context.Response.OnStarting(() =>
        {
            var headers = context.Response.Headers;
            headers.CacheControl = "no-store";
            headers.ContentSecurityPolicy = ContentSecurityPolicy;
            headers["Permissions-Policy"] = PermissionsPolicy;
            headers.XContentTypeOptions = "nosniff";
            headers.Vary = MergeVary(headers.Vary, "Origin");
            return Task.CompletedTask;
        });

        await next(context);
    }

    private static string MergeVary(string? current, string required)
    {
        var values = (current ?? string.Empty)
            .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .Append(required)
            .Distinct(StringComparer.OrdinalIgnoreCase);
        return string.Join(", ", values);
    }
}
