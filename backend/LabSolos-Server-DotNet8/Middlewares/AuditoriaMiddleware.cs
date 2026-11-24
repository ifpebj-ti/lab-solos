using System.Diagnostics;
using System.Globalization;
using System.Security.Claims;
using LabSolos_Server_DotNet8.DTOs.Auditoria;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Extensions;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.Extensions.Logging;

namespace LabSolos_Server_DotNet8.Middlewares;

public sealed class AuditoriaMiddleware
{
    private static readonly TimeSpan RetentionSweepInterval = TimeSpan.FromDays(1);
    private static readonly Action<ILogger, string, string, Exception?> LogSecondaryAuditFailure =
        LoggerMessage.Define<string, string>(
            LogLevel.Warning,
            new EventId(1002, nameof(LogSecondaryAuditFailure)),
            "Falha secundária em auditoria. CorrelationId {CorrelationId}; erro {ErrorType}.");

    private static long _lastRetentionSweepUtcTicks;
    private static int _retentionSweepRunning;

    private readonly RequestDelegate _next;
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly ILogger<AuditoriaMiddleware> _logger;

    public AuditoriaMiddleware(
        RequestDelegate next,
        IServiceScopeFactory serviceScopeFactory,
        ILogger<AuditoriaMiddleware>? logger = null)
    {
        _next = next;
        _serviceScopeFactory = serviceScopeFactory;
        _logger = logger ?? Microsoft.Extensions.Logging.Abstractions.NullLogger<AuditoriaMiddleware>.Instance;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch
        {
            await RegistrarDiagnosticoSeNecessarioAsync(context, falhaNoPipeline: true);
            await ExpurgarEventosExpiradosSeNecessarioAsync();
            throw;
        }

        await RegistrarDiagnosticoSeNecessarioAsync(context, falhaNoPipeline: false);
        await ExpurgarEventosExpiradosSeNecessarioAsync();
    }

    private async Task RegistrarDiagnosticoSeNecessarioAsync(HttpContext context, bool falhaNoPipeline)
    {
        var statusCode = context.Response.StatusCode;
        var falha = falhaNoPipeline || statusCode >= StatusCodes.Status500InternalServerError;
        var negado = !falhaNoPipeline &&
            statusCode is StatusCodes.Status401Unauthorized or StatusCodes.Status403Forbidden;
        if (!falha && !negado)
            return;

        var correlationId = ObterCorrelationId(context);
        try
        {
            using var scope = _serviceScopeFactory.CreateScope();
            var service = scope.ServiceProvider.GetRequiredService<IAuditoriaService>();
            var userId = ObterUsuarioAutenticado(context);
            var eventoSemIdentidade = negado && userId is null;

            await service.RegistrarLogAsync(new CreateLogAuditoriaDTO
            {
                CodigoEvento = eventoSemIdentidade
                    ? CodigoEventoAuditoria.TentativaSemIdentidadeValida
                    : CodigoEventoAuditoria.FalhaOperacao,
                OrigemConfiavel = eventoSemIdentidade
                    ? OrigemConfiavelAuditoria.SemAtorValido
                    : userId.HasValue
                        ? OrigemConfiavelAuditoria.UsuarioAutenticado
                        : OrigemConfiavelAuditoria.SemAtorValido,
                Resultado = falha ? ResultadoOperacaoAuditoria.Falha : ResultadoOperacaoAuditoria.Negado,
                ReferenciaRecurso = ObterReferenciaRecurso(context),
                CorrelationId = correlationId,
                TipoAcaoDiagnostica = falhaNoPipeline ? null : ObterTipoAcaoDiagnostica(context, statusCode)
            }, userId, context.GetClientIpAddress());
        }
        catch (Exception exception)
        {
            LogSecondaryAuditFailure(_logger, correlationId, exception.GetType().Name, null);
        }
    }

    private async Task ExpurgarEventosExpiradosSeNecessarioAsync()
    {
        var now = DateTimeOffset.UtcNow;
        var nowTicks = now.UtcTicks;
        var lastSweepTicks = Interlocked.Read(ref _lastRetentionSweepUtcTicks);
        if (nowTicks - lastSweepTicks < RetentionSweepInterval.Ticks ||
            Interlocked.CompareExchange(ref _retentionSweepRunning, 1, 0) != 0)
        {
            return;
        }

        try
        {
            lastSweepTicks = Interlocked.Read(ref _lastRetentionSweepUtcTicks);
            if (nowTicks - lastSweepTicks < RetentionSweepInterval.Ticks)
                return;

            using var scope = _serviceScopeFactory.CreateScope();
            var service = scope.ServiceProvider.GetRequiredService<IAuditoriaService>();
            await service.ExpurgarEventosExpiradosAsync(now);
            Interlocked.Exchange(ref _lastRetentionSweepUtcTicks, nowTicks);
        }
        catch (Exception exception)
        {
            LogSecondaryAuditFailure(
                _logger,
                "retention-sweep",
                exception.GetType().Name,
                null);
        }
        finally
        {
            Interlocked.Exchange(ref _retentionSweepRunning, 0);
        }
    }

    private static int? ObterUsuarioAutenticado(HttpContext context)
    {
        if (context.User.Identity?.IsAuthenticated != true)
            return null;

        var claim = context.User.Claims.FirstOrDefault(candidate => candidate.Type == ClaimTypes.NameIdentifier);
        return claim is not null &&
            int.TryParse(claim.Value, NumberStyles.None, CultureInfo.InvariantCulture, out var userId) &&
            userId > 0
                ? userId
                : null;
    }

    private static string ObterCorrelationId(HttpContext context)
    {
        var traceId = Activity.Current?.TraceId.ToString();
        if (!string.IsNullOrWhiteSpace(traceId))
            return traceId;

        var requestId = context.TraceIdentifier;
        return AuditoriaEventCatalog.ReferenciaSegura(requestId)
            ? requestId
            : Guid.NewGuid().ToString("N");
    }

    private static string? ObterReferenciaRecurso(HttpContext context)
    {
        var controller = context.GetEndpoint()?.Metadata.GetMetadata<ControllerActionDescriptor>()?.ControllerName;
        return AuditoriaEventCatalog.ReferenciaSegura(controller) ? controller : null;
    }

    private static TipoAcaoAuditoria? ObterTipoAcaoDiagnostica(HttpContext context, int statusCode)
    {
        if (statusCode == StatusCodes.Status401Unauthorized &&
            string.Equals(context.Request.Path.Value, "/api/auth/login", StringComparison.OrdinalIgnoreCase))
        {
            return TipoAcaoAuditoria.LoginFalhado;
        }

        return statusCode is StatusCodes.Status401Unauthorized or StatusCodes.Status403Forbidden
            ? TipoAcaoAuditoria.TentativaAcessoNaoAutorizado
            : null;
    }
}
