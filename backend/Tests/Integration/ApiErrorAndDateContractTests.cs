using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.DTOs.Auditoria;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Middlewares;
using LabSolos_Server_DotNet8.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class ApiErrorAndDateContractTests(PostgreSqlContainerFixture database)
{
    [Theory]
    [InlineData("/api/contract-test/conflict", 409, "synthetic_domain_conflict")]
    [InlineData("/api/contract-test/invalid", 400, "validation_failed")]
    [InlineData("/api/contract-test/absent", 404, "resource_not_found")]
    [InlineData("/api/route-that-does-not-exist", 404, "resource_not_found")]
    public async Task ErrorsExposeStableCategoriesAndServerCorrelation(string path, int status, string code)
    {
        await using var factory = CreateFactory();
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Correlation-ID", "untrusted-client-value");

        using var response = await client.GetAsync(path);

        Assert.Equal(status, (int)response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(code, body.GetProperty("code").GetString());
        Assert.Equal(status, body.GetProperty("status").GetInt32());
        var correlation = body.GetProperty("correlationId").GetString();
        Assert.False(string.IsNullOrWhiteSpace(correlation));
        Assert.NotEqual("untrusted-client-value", correlation);
        Assert.Equal(correlation, Assert.Single(response.Headers.GetValues("X-Correlation-ID")));
        Assert.DoesNotContain("synthetic-sensitive-value", body.ToString());
    }

    [Fact]
    public async Task InvalidJsonDoesNotEchoInputOrParserDiagnostics()
    {
        await using var factory = CreateFactory();
        using var client = factory.CreateClient();
        using var content = new StringContent(
            "{\"value\": \"synthetic-sensitive-value\", broken}", Encoding.UTF8, "application/json");

        using var response = await client.PostAsync("/api/contract-test/body", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var text = await response.Content.ReadAsStringAsync();
        var body = JsonDocument.Parse(text).RootElement;
        Assert.Equal("validation_failed", body.GetProperty("code").GetString());
        Assert.Contains("errors", text);
        Assert.Contains("Verifique", body.GetProperty("title").GetString());
        Assert.DoesNotContain("synthetic-sensitive-value", text);
        Assert.DoesNotContain("JsonReader", text);
    }

    [Fact]
    public async Task ExistingTypedProblemsPreserveApprovedGuidanceAndDomainMetadata()
    {
        await using var factory = CreateFactory();
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/api/contract-test/known-problem");

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("registration_responsible_invalid", body.GetProperty("code").GetString());
        Assert.Equal("Verifique o e-mail do responsável informado.", body.GetProperty("detail").GetString());
        Assert.Equal("2026-11-16", body.GetProperty("evaluatedDate").GetString());
    }

    [Fact]
    public async Task DiagnosticRecordCorrelatesPublicStatusAndCategoryWithoutInput()
    {
        var context = new DefaultHttpContext();
        context.Request.Path = "/api/synthetic";
        context.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes("synthetic-secret-input"));
        context.Response.Body = new MemoryStream();
        var entries = new List<string>();
        var logger = new ApiContractTestLogger(entries);
        var middleware = new ApiErrorContractMiddleware(
            httpContext =>
            {
                httpContext.Response.StatusCode = 404;
                return Task.CompletedTask;
            }, logger);

        await middleware.InvokeAsync(context);

        var entry = Assert.Single(entries);
        Assert.Contains(context.TraceIdentifier, entry);
        Assert.Contains("404", entry);
        Assert.Contains("resource_not_found", entry);
        Assert.DoesNotContain("synthetic-secret-input", entry);
    }

    [Fact]
    public async Task ReversedIntervalIsRejectedAtTheModelBoundary()
    {
        await using var factory = CreateFactory();
        using var client = factory.CreateClient();

        using var response = await client.GetAsync(
            "/api/contract-test/dates?dataInicio=2026-11-17&dataFim=2026-11-16");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("errors").TryGetProperty("dataFim", out _), body.ToString());
    }

    [Theory]
    [InlineData("2026-11-16", "2026-11-16T03:00:00Z")]
    [InlineData("2026-11-16T01:00:00-02:00", "2026-11-16T03:00:00Z")]
    [InlineData("2026-11-16T03:00:00Z", "2026-11-16T03:00:00Z")]
    public async Task QueryDatesUseInstitutionalDaysAndExplicitOffsetInstants(string input, string expected)
    {
        await using var factory = CreateFactory();
        using var client = factory.CreateClient();

        using var response = await client.GetAsync(
            "/api/contract-test/dates?dataInicio=" + Uri.EscapeDataString(input));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(DateTimeOffset.Parse(expected, CultureInfo.InvariantCulture).UtcDateTime,
            body.GetProperty("dataInicio").GetDateTime());
        Assert.Equal(DateTimeKind.Utc, body.GetProperty("dataInicio").GetDateTime().Kind);
    }

    [Theory]
    [InlineData("2026-02-31")]
    [InlineData("2026-11-16T03:00:00")]
    [InlineData("16/11/2026")]
    public async Task InvalidOrAmbiguousDateHasAFieldError(string input)
    {
        await using var factory = CreateFactory();
        using var client = factory.CreateClient();

        using var response = await client.GetAsync(
            "/api/contract-test/dates?dataInicio=" + Uri.EscapeDataString(input));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("validation_failed", body.GetProperty("code").GetString());
        Assert.True(body.GetProperty("errors").TryGetProperty("dataInicio", out _), body.ToString());
    }

    [Fact]
    public async Task AuditQueriesIncludeStartAndExcludeEnd()
    {
        await using var factory = CreateFactory();
        await factory.RecreateDatabaseAsync();
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var start = new DateTime(2026, 11, 16, 3, 0, 0, DateTimeKind.Utc);
        context.LogsAuditoria.AddRange(
            CreateLog(start.AddTicks(-1), "before"),
            CreateLog(start, "start"),
            CreateLog(start.AddHours(1).AddTicks(-10), "inside"),
            CreateLog(start.AddHours(1), "end"));
        await context.SaveChangesAsync();
        var repository = new LogAuditoriaRepository(context);

        var logs = await repository.ObterLogsFiltradosAsync(new FiltroAuditoriaDTO
        {
            DataInicio = start, DataFim = start.AddHours(1)
        });

        Assert.Collection(logs,
            log => Assert.Equal("inside", log.Acao),
            log => Assert.Equal("start", log.Acao));
        Assert.Equal(2, await repository.ObterTotalLogsFiltradosAsync(new FiltroAuditoriaDTO
        {
            DataInicio = start, DataFim = start.AddHours(1)
        }));
        var stats = await repository.ObterLogsPorDiaAsync(start, start.AddHours(1));
        Assert.Equal(2, Assert.Single(stats).Value);
    }

    private IntegrationWebApplicationFactory CreateFactory() => new(database, new IntegrationApplicationOptions
    {
        ConfigureServices = services =>
            services.AddControllers().AddApplicationPart(typeof(ApiContractProbeController).Assembly)
    });

    private static LogAuditoria CreateLog(DateTime time, string action) => new()
    {
        DataHora = time,
        Acao = action,
        Recurso = "synthetic",
        EnderecoIP = string.Empty,
        TipoAcao = TipoAcaoAuditoria.Outro,
        NivelRisco = NivelRiscoAuditoria.Baixo,
        CodigoEvento = CodigoEventoAuditoria.LegadoNaoClassificado,
        OrigemConfiavel = OrigemConfiavelAuditoria.SemAtorValido,
        Resultado = ResultadoOperacaoAuditoria.Indeterminado,
        CategoriaRegistro = CategoriaRegistroAuditoria.DiagnosticoOperacional,
        CorrelationId = $"test-{action}",
        ExpiraEmUtc = new DateTimeOffset(time, TimeSpan.Zero).AddDays(30)
    };
}

internal sealed class ApiContractTestLogger(List<string> entries) : ILogger<ApiErrorContractMiddleware>
{
    public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
    public bool IsEnabled(LogLevel logLevel) => true;
    public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception,
        Func<TState, Exception?, string> formatter) => entries.Add(formatter(state, exception));
}

internal static class ApiProblemContractAssertions
{
    public static async Task<string> ReadAsync(HttpResponseMessage response, HttpStatusCode status, string code)
    {
        Assert.Equal(status, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var body = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(body);
        var problem = document.RootElement;
        Assert.Equal((int)status, problem.GetProperty("status").GetInt32());
        Assert.Equal(code, problem.GetProperty("code").GetString());
        Assert.False(string.IsNullOrWhiteSpace(problem.GetProperty("title").GetString()));
        var correlation = problem.GetProperty("correlationId").GetString();
        Assert.False(string.IsNullOrWhiteSpace(correlation));
        Assert.Equal(correlation, Assert.Single(response.Headers.GetValues("X-Correlation-ID")));
        var fields = JsonSerializer.Deserialize<SortedDictionary<string, JsonElement>>(body)!;
        fields.Remove("correlationId");
        return JsonSerializer.Serialize(fields);
    }
}

[ApiController]
[AllowAnonymous]
[Route("api/contract-test")]
public sealed class ApiContractProbeController : ControllerBase
{
    [HttpGet("conflict")]
    public IActionResult DomainConflict() => Conflict(new
    {
        code = "synthetic_domain_conflict", message = "synthetic-sensitive-value"
    });

    [HttpGet("invalid")]
    public IActionResult Invalid() => BadRequest("synthetic-sensitive-value");

    [HttpGet("absent")]
    public IActionResult Absent() => NotFound("synthetic-sensitive-value");

    [HttpGet("dates")]
    public IActionResult Dates([FromQuery] FiltroAuditoriaDTO filter) => Ok(filter);

    [HttpGet("known-problem")]
    public IActionResult KnownProblem()
    {
        var problem = new ProblemDetails
        {
            Status = 400,
            Title = "Dados de cadastro inválidos.",
            Detail = "Verifique o e-mail do responsável informado."
        };
        problem.Extensions["code"] = "registration_responsible_invalid";
        problem.Extensions["evaluatedDate"] = "2026-11-16";
        return BadRequest(problem);
    }

    [HttpPost("body")]
    public IActionResult Body([FromBody] ApiContractProbeBody body) => Ok(body);
}

public sealed record ApiContractProbeBody([Required] string Value);
