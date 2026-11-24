using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace LabSolos_Server_DotNet8.Middlewares;

public sealed class ApiErrorContractMiddleware(RequestDelegate next, ILogger<ApiErrorContractMiddleware> logger)
{
    private static readonly Action<ILogger, string, int, string, Exception?> LogResult =
        LoggerMessage.Define<string, int, string>(LogLevel.Information,
            new EventId(1100, "ApiErrorResult"),
            "API result correlation {CorrelationId} status {Status} category {Code}");

    public async Task InvokeAsync(HttpContext context)
    {
        if (!context.Request.Path.StartsWithSegments("/api"))
        {
            await next(context);
            return;
        }

        context.TraceIdentifier = Guid.NewGuid().ToString("N");
        context.Response.OnStarting(() =>
        {
            context.Response.Headers["X-Correlation-ID"] = context.TraceIdentifier;
            return Task.CompletedTask;
        });
        await next(context);
        if (context.Response.StatusCode >= 400)
        {
            if (!context.Response.HasStarted && context.Response.ContentType is null)
            {
                var problem = ApiErrorContractFilter.CreateProblem(
                    context.Response.StatusCode, context.TraceIdentifier);
                context.Items["ApiErrorCode"] = problem.Extensions["code"];
                await context.Response.WriteAsJsonAsync(problem, options: (JsonSerializerOptions?)null,
                    contentType: "application/problem+json", cancellationToken: context.RequestAborted);
            }
            LogResult(logger, context.TraceIdentifier, context.Response.StatusCode,
                context.Items["ApiErrorCode"]?.ToString() ?? "operation_failed", null);
        }
    }
}

public sealed class ApiErrorContractFilter : IAsyncAlwaysRunResultFilter
{
    private static readonly JsonSerializerOptions PublicJsonOptions = new(JsonSerializerDefaults.Web);

    public async Task OnResultExecutionAsync(ResultExecutingContext context, ResultExecutionDelegate next)
    {
        if (context.HttpContext.Request.Path.StartsWithSegments("/api"))
        {
            var result = context.Result;
            var status = result switch
            {
                ObjectResult objectResult => objectResult.StatusCode
                    ?? (objectResult.Value as ProblemDetails)?.Status
                    ?? context.HttpContext.Response.StatusCode,
                StatusCodeResult statusResult => statusResult.StatusCode,
                _ => context.HttpContext.Response.StatusCode
            };
            if (status >= 400)
            {
                var problem = CreateProblem(status, context.HttpContext.TraceIdentifier);
                if (result is ObjectResult { Value: ProblemDetails known } && status < 500)
                {
                    known.Status = status;
                    known.Extensions.TryAdd("code", problem.Extensions["code"]);
                    known.Extensions["correlationId"] = context.HttpContext.TraceIdentifier;
                    problem = known;
                }
                else if (result is ObjectResult { Value: not null } original && status < 500)
                {
                    var fields = JsonSerializer.SerializeToElement(original.Value, PublicJsonOptions);
                    CopyPublicField(fields, problem, "code");
                    CopyPublicField(fields, problem, "errors");
                    // Existing domain contracts can carry safe, explicitly named metadata.
                    CopyPublicField(fields, problem, "retryAfter");
                    CopyPublicField(fields, problem, "field");
                }
                context.Result = new ObjectResult(problem) { StatusCode = status };
                context.HttpContext.Items["ApiErrorCode"] = problem.Extensions["code"];
                ((ObjectResult)context.Result).ContentTypes.Add("application/problem+json");
            }
        }
        await next();
    }

    public static ProblemDetails CreateProblem(int status, string correlationId)
    {
        var (code, title) = status switch
        {
            400 => ("validation_failed", "Verifique os dados informados."),
            401 => ("authentication_required", "Entre na sua conta para continuar."),
            403 => ("access_denied", "Você não tem permissão para realizar esta operação."),
            404 => ("resource_not_found", "O recurso solicitado está indisponível."),
            409 => ("operation_conflict", "A operação conflitou com o estado atual. Atualize os dados."),
            413 => ("request_body_too_large", "A solicitação excede o tamanho permitido."),
            429 => ("admission_rate_limited", "Aguarde antes de tentar novamente."),
            503 => ("service_unavailable", "O serviço está temporariamente indisponível."),
            _ => ("operation_failed", "Não foi possível concluir a operação.")
        };
        var problem = new ProblemDetails { Status = status, Title = title };
        problem.Extensions["code"] = code;
        problem.Extensions["correlationId"] = correlationId;
        return problem;
    }

    private static void CopyPublicField(JsonElement original, ProblemDetails problem, string name)
    {
        if (original.ValueKind == JsonValueKind.Object && original.TryGetProperty(name, out var value))
        {
            if (name == "errors" && value.ValueKind == JsonValueKind.Object)
                problem.Extensions[name] = value.Deserialize<Dictionary<string, string[]>>();
            else if (value.ValueKind == JsonValueKind.String)
                problem.Extensions[name] = value.GetString();
            else if (value.ValueKind == JsonValueKind.Number)
                problem.Extensions[name] = value.GetDecimal();
        }
    }
}
