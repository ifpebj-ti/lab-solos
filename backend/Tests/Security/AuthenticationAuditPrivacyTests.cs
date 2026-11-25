using System.Diagnostics.Metrics;
using System.Net;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
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
    [InlineData("POST", "/api/Auth/login?email=CANARY_EMAIL%40example.org")]
    [InlineData("POST", "/api/Email/request-password-reset?address=CANARY_EMAIL%40example.org")]
    [InlineData("POST", "/api/Auth/change-password/123")]
    [InlineData("GET", "/api/usuarios/123?include=CANARY_PERSON_ID")]
    [InlineData("PATCH", "/api/usuarios/123?include=CANARY_PERSON_ID")]
    [InlineData("GET", "/api/emprestimos/456?requester=CANARY_PERSON_ID")]
    public async Task DeniedSensitiveRoutesPersistOnlyServerDefinedAuditMetadata(
        string method,
        string pathAndQuery)
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
        var storedValues = SerializeAuditContent(log);

        Assert.Equal(CodigoEventoAuditoria.FalhaOperacao, log.CodigoEvento);
        Assert.Equal("falha_operacao", log.Acao);
        Assert.Equal("operacao", log.Recurso);
        Assert.Equal(OrigemConfiavelAuditoria.UsuarioAutenticado, log.OrigemConfiavel);
        Assert.Equal("usuario:987654", log.ReferenciaAtor);
        Assert.Equal(ResultadoOperacaoAuditoria.Negado, log.Resultado);
        Assert.Equal(CategoriaRegistroAuditoria.DiagnosticoOperacional, log.CategoriaRegistro);
        Assert.Equal(TipoAcaoAuditoria.TentativaAcessoNaoAutorizado, log.TipoAcao);
        Assert.False(string.IsNullOrWhiteSpace(log.CorrelationId));
        Assert.InRange(log.ExpiraEmUtc, DateTimeOffset.UtcNow.AddDays(29), DateTimeOffset.UtcNow.AddDays(31));
        Assert.Null(log.Detalhes);
        Assert.Null(log.DadosResposta);
        Assert.Null(log.DadosRequisicao);
        Assert.Equal(987654, log.UsuarioId);
        Assert.Null(log.UserAgent);
        Assert.DoesNotContain("123", storedValues);
        Assert.DoesNotContain("456", storedValues);
        Assert.DoesNotContain("CANARY", storedValues);
        Assert.DoesNotContain("CANARY_USER_AGENT", storedValues);
        Assert.DoesNotContain("CANARY_PASSWORD", storedValues);
        Assert.DoesNotContain("CANARY_JWT", storedValues);
    }

    [Fact]
    public void GeneratedAuditMetadataMayContainRequestDigitsWithoutPersistingSensitiveContent()
    {
        var log = new LogAuditoria
        {
            Id = 123,
            DataHora = new DateTime(2026, 10, 13, 23, 10, 6, DateTimeKind.Utc).AddTicks(4561230),
            ExpiraEmUtc = new DateTimeOffset(2026, 10, 13, 23, 10, 6, TimeSpan.Zero).AddTicks(1234560),
            Acao = "loans.read GET",
            Recurso = "loans.read",
            Detalhes = "Status: 403; Resultado: negado",
            DadosResposta = "403",
            Origem = "CANARY_CONTENT"
        };

        var completeLog = JsonSerializer.Serialize(log);
        Assert.Contains("123", completeLog);
        Assert.Contains("456", completeLog);

        var content = SerializeAuditContent(log);
        Assert.Contains("CANARY_CONTENT", content);
        Assert.DoesNotContain("123", content);
        Assert.DoesNotContain("456", content);
    }

    [Fact]
    public async Task SuccessfulRequestDoesNotCreateOperationalAuditRecords()
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

        Assert.Empty(await database.LogsAuditoria.ToListAsync());
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

    private static string SerializeAuditContent(LogAuditoria log)
    {
        // Only generated identifiers and timestamps are excluded; every other
        // property, including navigation properties and future fields, remains covered.
        var serialized = JsonSerializer.SerializeToElement(log);
        var content = serialized.EnumerateObject()
            .Where(property => property.Name is not nameof(LogAuditoria.Id)
                and not nameof(LogAuditoria.DataHora)
                and not nameof(LogAuditoria.ExpiraEmUtc))
            .ToDictionary(property => property.Name, property => property.Value);
        return JsonSerializer.Serialize(content);
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
