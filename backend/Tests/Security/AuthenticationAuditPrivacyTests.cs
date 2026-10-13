using System.Diagnostics.Metrics;
using System.Net;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Filters;
using LabSolos_Server_DotNet8.Middlewares;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Tests.Security;

[Collection("CredentialTelemetryGlobalMeter")]
public sealed class AuthenticationAuditPrivacyTests
{
    [Theory]
    [InlineData("POST", "/api/Auth/login?email=CANARY_EMAIL%40example.org", "authentication.login")]
    [InlineData("POST", "/api/Email/request-password-reset?address=CANARY_EMAIL%40example.org", "authentication.recovery")]
    [InlineData("POST", "/api/Auth/change-password/123", "authentication.password_change")]
    [InlineData("GET", "/api/usuarios/123?include=CANARY_PERSON_ID", "users.read")]
    [InlineData("PATCH", "/api/usuarios/123?include=CANARY_PERSON_ID", "users.write")]
    [InlineData("GET", "/api/emprestimos/456?requester=CANARY_PERSON_ID", "loans.read")]
    public async Task SensitiveRoutesPersistOnlyAggregatedSanitizedAudit(
        string method,
        string pathAndQuery,
        string expectedPurpose)
    {
        await using var database = CreateDatabase();
        var telemetry = CreateAuditService(database);
        using var services = CreateServices(telemetry);
        var middleware = CreateMiddleware(services, context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        });
        var context = CreateSensitiveContext(method, pathAndQuery);

        await middleware.InvokeAsync(context);

        var log = await database.LogsAuditoria.SingleAsync();
        var storedValues = JsonSerializer.Serialize(log);

        Assert.Equal($"{expectedPurpose} {method}", log.Acao);
        Assert.Equal(expectedPurpose, log.Recurso);
        Assert.Equal("Status: 403; Resultado: negado", log.Detalhes);
        Assert.Equal("403", log.DadosResposta);
        Assert.Null(log.DadosRequisicao);
        Assert.Null(log.UsuarioId);
        Assert.Equal(string.Empty, log.EnderecoIP);
        Assert.Null(log.UserAgent);
        Assert.DoesNotContain("123", storedValues);
        Assert.DoesNotContain("456", storedValues);
        Assert.DoesNotContain("CANARY", storedValues);
        Assert.DoesNotContain("203.0.113.77", storedValues);
        Assert.DoesNotContain("198.51.100.42", storedValues);
    }

    [Fact]
    public async Task UnrelatedRouteRedactsSecretsFromHeadersQueryAndNestedBody()
    {
        await using var database = CreateDatabase();
        var telemetry = CreateAuditService(database);
        using var services = CreateServices(telemetry);
        var middleware = CreateMiddleware(services, _ => Task.CompletedTask);
        var body = """
            {"nome":"produto sintetico","senha":"CANARY_PASSWORD","detalhes":{"token":"CANARY_JWT","codigo":"CANARY_CODE","cookie":"CANARY_COOKIE"}}
            """;
        var context = new DefaultHttpContext();
        context.Request.Method = HttpMethods.Post;
        context.Request.Path = "/api/produtos";
        context.Request.QueryString = new QueryString("?pagina=2&token=CANARY_QUERY_TOKEN");
        context.Request.ContentType = "application/json";
        context.Request.ContentLength = Encoding.UTF8.GetByteCount(body);
        context.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(body));
        context.Request.Headers.Cookie = "session=CANARY_COOKIE";
        context.Request.Headers.Authorization = "Bearer CANARY_JWT";
        context.Request.Headers["X-Api-Key"] = "CANARY_API_KEY";
        context.Request.Headers["X-Recovery-Code"] = "CANARY_CODE";
        context.Request.Headers.Accept = "application/json";

        await middleware.InvokeAsync(context);

        var log = await database.LogsAuditoria.SingleAsync();
        var requestLog = log.DadosRequisicao!;

        Assert.Contains("produto sintetico", requestLog);
        Assert.Contains("pagina", requestLog);
        Assert.DoesNotContain("CANARY_PASSWORD", requestLog);
        Assert.DoesNotContain("CANARY_JWT", requestLog);
        Assert.DoesNotContain("CANARY_CODE", requestLog);
        Assert.DoesNotContain("CANARY_COOKIE", requestLog);
        Assert.DoesNotContain("CANARY_QUERY_TOKEN", requestLog);
        Assert.DoesNotContain("CANARY_API_KEY", requestLog);
        Assert.DoesNotContain("X-Recovery-Code", requestLog);
    }

    [Fact]
    public void ApiLoggingFilterDoesNotWriteExceptionMessageOrObject()
    {
        const string canary = "CANARY_EXCEPTION_JWT";
        var logger = new CapturingLogger<ApiLoggingFilter>();
        var filter = new ApiLoggingFilter(logger);
        var httpContext = new DefaultHttpContext();
        var actionContext = new ActionContext(httpContext, new RouteData(), new ActionDescriptor());
        var executed = new ActionExecutedContext(actionContext, [], new object())
        {
            Exception = new InvalidOperationException($"Falha com token {canary}")
        };

        filter.OnActionExecuted(executed);

        Assert.DoesNotContain(canary, string.Join(Environment.NewLine, logger.Messages));
        Assert.DoesNotContain(canary, string.Join(Environment.NewLine, logger.StructuredValues));
        Assert.All(logger.Exceptions, Assert.Null);
    }

    [Fact]
    public void CredentialTelemetryKeepsAggregateMeasurementsWithoutUserIdentifiers()
    {
        var measurements = new List<(string Name, long Value, string[] Tags)>();
        using var listener = new MeterListener();
        listener.InstrumentPublished = (instrument, meterListener) =>
        {
            if (instrument.Meter.Name == "LabSolos.Credentials")
            {
                meterListener.EnableMeasurementEvents(instrument);
            }
        };
        listener.SetMeasurementEventCallback<long>((instrument, value, tags, _) =>
        {
            var renderedTags = new string[tags.Length];
            for (var index = 0; index < tags.Length; index++)
            {
                renderedTags[index] = $"{tags[index].Key}={tags[index].Value}";
            }

            measurements.Add((instrument.Name, value, renderedTags));
        });
        listener.Start();

        var logger = new CapturingLogger<CredentialTelemetry>();
        var telemetry = new CredentialTelemetry(logger);
        telemetry.RecordSuccess(73421, wasRequiredChange: false);
        telemetry.RecordFailure(73421, "CANARY_PASSWORD_OR_TOKEN");
        telemetry.RecordConcurrencyConflict(73421);

        Assert.Equal(3, measurements.Count);
        Assert.All(measurements, measurement =>
        {
            Assert.Equal("credential_password_change_total", measurement.Name);
            Assert.DoesNotContain(measurement.Tags, tag => tag.Contains("73421", StringComparison.Ordinal));
        });
        Assert.DoesNotContain("73421", string.Join(Environment.NewLine, logger.Messages));
        Assert.DoesNotContain("73421", string.Join(Environment.NewLine, logger.StructuredValues));
        Assert.DoesNotContain("CANARY_PASSWORD_OR_TOKEN", string.Join(Environment.NewLine, logger.Messages));
        Assert.Contains("password_invalid", string.Join(Environment.NewLine, logger.Messages));
    }

    private static AppDbContext CreateDatabase() => new(
        new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options);

    private static AuditoriaService CreateAuditService(AppDbContext database) => new(
        new UnitOfWork(database),
        Mock.Of<AutoMapper.IMapper>(),
        NullLogger<AuditoriaService>.Instance);

    private static ServiceProvider CreateServices(IAuditoriaService service) => new ServiceCollection()
        .AddSingleton(service)
        .BuildServiceProvider();

    private static AuditoriaMiddleware CreateMiddleware(ServiceProvider services, RequestDelegate next) => new(
        next,
        services.GetRequiredService<IServiceScopeFactory>());

    private static DefaultHttpContext CreateSensitiveContext(string method, string pathAndQuery)
    {
        var body = """
            {"email":"CANARY_EMAIL@example.org","password":"CANARY_PASSWORD","code":"CANARY_CODE","token":"CANARY_JWT","nested":{"cookie":"CANARY_COOKIE"}}
            """;
        var separator = pathAndQuery.IndexOf('?');
        var context = new DefaultHttpContext();
        context.Request.Method = method;
        context.Request.Path = separator < 0 ? pathAndQuery : pathAndQuery[..separator];
        context.Request.QueryString = separator < 0 ? QueryString.Empty : new QueryString(pathAndQuery[separator..]);
        context.Request.ContentType = "application/json";
        context.Request.ContentLength = Encoding.UTF8.GetByteCount(body);
        context.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(body));
        context.Request.Headers.Cookie = "session=CANARY_COOKIE";
        context.Request.Headers.Authorization = "Bearer CANARY_JWT";
        context.Request.Headers["X-Forwarded-For"] = "203.0.113.77";
        context.Request.Headers.UserAgent = "CANARY_USER_AGENT";
        context.Connection.RemoteIpAddress = IPAddress.Parse("198.51.100.42");
        context.User = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, "987654")
        ], "test"));
        return context;
    }

    private sealed class CapturingLogger<T> : ILogger<T>
    {
        public List<string> Messages { get; } = [];
        public List<string> StructuredValues { get; } = [];
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
            if (state is IEnumerable<KeyValuePair<string, object?>> values)
            {
                StructuredValues.AddRange(values.Select(value => $"{value.Key}={value.Value}"));
            }

            Exceptions.Add(exception);
        }
    }
}
