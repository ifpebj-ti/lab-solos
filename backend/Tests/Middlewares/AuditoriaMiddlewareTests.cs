using System.Text;
using System.Text.Json;
using LabSolos_Server_DotNet8.DTOs.Auditoria;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Middlewares;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Tests.Middlewares;

public sealed class AuditoriaMiddlewareTests
{
    [Fact]
    public async Task InvokeAsyncPreservesRequestBodyForPipelineWithoutSavingIt()
    {
        const string requestBody = "{\"nome\":\"Alice\",\"senha\":\"CANARY_PASSWORD\"}";
        var bodySeenByPipeline = string.Empty;
        var loggedData = CreateLoggedDataSource();
        using var services = loggedData.Services;
        var middleware = CreateMiddleware(
            services,
            async context =>
            {
                using var reader = new StreamReader(context.Request.Body, Encoding.UTF8, leaveOpen: true);
                bodySeenByPipeline = await reader.ReadToEndAsync();
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            });
        var context = CreatePostContext(new MemoryStream(Encoding.UTF8.GetBytes(requestBody)), "/api/produtos");

        await middleware.InvokeAsync(context);
        var log = await loggedData.AuditLog.Task.WaitAsync(TimeSpan.FromSeconds(2));

        Assert.Equal(requestBody, bodySeenByPipeline);
        Assert.DoesNotContain("CANARY_PASSWORD", JsonSerializer.Serialize(log), StringComparison.Ordinal);
        Assert.Equal(CodigoEventoAuditoria.FalhaOperacao, log.CodigoEvento);
    }

    [Fact]
    public async Task InvokeAsyncDoesNotCaptureBodyFieldsOrResponsePayload()
    {
        const string requestBody = "{\"primeiro\":\"CANARY_BODY\",\"senha\":\"CANARY_PASSWORD\"}";
        var loggedData = CreateLoggedDataSource();
        using var services = loggedData.Services;
        var middleware = CreateMiddleware(services, context =>
        {
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            return Task.CompletedTask;
        });

        await middleware.InvokeAsync(CreatePostContext(
            new MemoryStream(Encoding.UTF8.GetBytes(requestBody)), "/api/produtos"));

        var log = await loggedData.AuditLog.Task.WaitAsync(TimeSpan.FromSeconds(2));
        var serialized = JsonSerializer.Serialize(log);
        Assert.DoesNotContain("CANARY_BODY", serialized, StringComparison.Ordinal);
        Assert.DoesNotContain("CANARY_PASSWORD", serialized, StringComparison.Ordinal);
        Assert.DoesNotContain("DadosRequisicao", serialized, StringComparison.Ordinal);
        Assert.DoesNotContain("DadosResposta", serialized, StringComparison.Ordinal);
    }

    [Fact]
    public async Task InvokeAsyncDoesNotReadRequestBodyBeforePipeline()
    {
        var loggedData = CreateLoggedDataSource();
        using var services = loggedData.Services;
        var middleware = CreateMiddleware(services, context =>
        {
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            return Task.CompletedTask;
        });
        var body = new ReadTrackingStream(Encoding.UTF8.GetBytes("synthetic"));

        await middleware.InvokeAsync(CreatePostContext(body, "/api/produtos"));
        _ = await loggedData.AuditLog.Task.WaitAsync(TimeSpan.FromSeconds(2));

        Assert.Equal(0, body.ReadAttempts);
    }

    [Fact]
    public async Task InvokeAsyncRecordsPipelineExceptionAndRethrowsItUnchanged()
    {
        var loggedData = CreateLoggedDataSource();
        using var services = loggedData.Services;
        var expected = new InvalidOperationException("synthetic operation failure");
        var middleware = CreateMiddleware(services, _ => throw expected);
        var context = new DefaultHttpContext();

        var actual = await Assert.ThrowsAsync<InvalidOperationException>(
            () => middleware.InvokeAsync(context));
        var auditEvent = await loggedData.AuditLog.Task.WaitAsync(TimeSpan.FromSeconds(2));

        Assert.Same(expected, actual);
        Assert.Equal(200, context.Response.StatusCode);
        Assert.Equal(CodigoEventoAuditoria.FalhaOperacao, auditEvent.CodigoEvento);
        Assert.Equal(ResultadoOperacaoAuditoria.Falha, auditEvent.Resultado);
    }

    [Fact]
    public async Task InvokeAsyncKeepsPipelineResponseWhenAuditPersistenceFailsExpectedly()
    {
        var service = new Mock<IAuditoriaService>();
        service
            .Setup(instance => instance.RegistrarLogAsync(
                It.IsAny<CreateLogAuditoriaDTO>(),
                It.IsAny<int?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>()))
            .ThrowsAsync(new DbUpdateException("falha esperada de persistência"));
        service.Setup(instance => instance.ExpurgarEventosExpiradosAsync(It.IsAny<DateTimeOffset?>()))
            .ReturnsAsync(0);
        using var services = CreateServices(service.Object);
        var middleware = CreateMiddleware(services, context =>
        {
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            return Task.CompletedTask;
        });
        var context = new DefaultHttpContext();

        await middleware.InvokeAsync(context);

        Assert.Equal(StatusCodes.Status500InternalServerError, context.Response.StatusCode);
    }

    [Fact]
    public async Task InvokeAsyncKeepsPipelineResponseWhenUnexpectedAuditFailureOccurs()
    {
        var service = new Mock<IAuditoriaService>();
        service
            .Setup(instance => instance.RegistrarLogAsync(
                It.IsAny<CreateLogAuditoriaDTO>(),
                It.IsAny<int?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>()))
            .ThrowsAsync(new InvalidOperationException("falha inesperada de persistência"));
        service.Setup(instance => instance.ExpurgarEventosExpiradosAsync(It.IsAny<DateTimeOffset?>()))
            .ReturnsAsync(0);
        using var services = CreateServices(service.Object);
        var middleware = CreateMiddleware(services, context =>
        {
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            return Task.CompletedTask;
        });
        var context = new DefaultHttpContext();

        await middleware.InvokeAsync(context);

        Assert.Equal(StatusCodes.Status500InternalServerError, context.Response.StatusCode);
    }

    private static AuditoriaMiddleware CreateMiddleware(ServiceProvider services, RequestDelegate next) => new(
        next,
        services.GetRequiredService<IServiceScopeFactory>());

    private static DefaultHttpContext CreatePostContext(Stream body, string path = "/api/usuarios")
    {
        var context = new DefaultHttpContext();
        context.Request.Method = HttpMethods.Post;
        context.Request.Path = path;
        context.Request.ContentType = "application/json";
        context.Request.ContentLength = body.Length;
        context.Request.Body = body;
        return context;
    }

    private static (ServiceProvider Services, TaskCompletionSource<CreateLogAuditoriaDTO> AuditLog)
        CreateLoggedDataSource()
    {
        var auditLog = new TaskCompletionSource<CreateLogAuditoriaDTO>(
            TaskCreationOptions.RunContinuationsAsynchronously);
        var service = new Mock<IAuditoriaService>();
        service
            .Setup(instance => instance.RegistrarLogAsync(
                It.IsAny<CreateLogAuditoriaDTO>(),
                It.IsAny<int?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>()))
            .Callback<CreateLogAuditoriaDTO, int?, string?, string?>(
                (log, _, _, _) => auditLog.TrySetResult(log))
            .Returns(Task.CompletedTask);
        service.Setup(instance => instance.ExpurgarEventosExpiradosAsync(It.IsAny<DateTimeOffset?>()))
            .ReturnsAsync(0);

        var services = CreateServices(service.Object);
        return (services, auditLog);
    }

    private static ServiceProvider CreateServices(IAuditoriaService service) => new ServiceCollection()
        .AddSingleton(service)
        .BuildServiceProvider();

    private sealed class ReadTrackingStream(byte[] content) : MemoryStream(content)
    {
        public int ReadAttempts { get; private set; }

        public override ValueTask<int> ReadAsync(
            Memory<byte> buffer,
            CancellationToken cancellationToken = default)
        {
            ReadAttempts++;
            return base.ReadAsync(buffer, cancellationToken);
        }

        public override int Read(Span<byte> buffer)
        {
            ReadAttempts++;
            return base.Read(buffer);
        }
    }
}
