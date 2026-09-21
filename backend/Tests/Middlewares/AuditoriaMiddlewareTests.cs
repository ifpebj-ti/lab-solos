using System.Text;
using LabSolos_Server_DotNet8.DTOs.Auditoria;
using LabSolos_Server_DotNet8.Middlewares;
using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Tests.Middlewares;

public sealed class AuditoriaMiddlewareTests
{
    [Fact]
    public async Task InvokeAsyncPreservesBodyForPipelineAndSanitizesAuditLog()
    {
        const string requestBody = "{\"nome\":\"Alice\",\"senha\":\"nao registrar\"}";
        var bodySeenByPipeline = string.Empty;
        TrackingStreamReader? bodyReader = null;
        var loggedData = CreateLoggedDataSource();
        var auditLog = loggedData.AuditLog;
        using var services = loggedData.Services;
        var middleware = CreateMiddleware(
            services,
            async context =>
            {
                using var reader = new StreamReader(
                    context.Request.Body,
                    Encoding.UTF8,
                    detectEncodingFromByteOrderMarks: true,
                    bufferSize: 1024,
                    leaveOpen: true);
                bodySeenByPipeline = await reader.ReadToEndAsync();
            },
            body => bodyReader = new TrackingStreamReader(body));
        var context = CreatePostContext(new MemoryStream(Encoding.UTF8.GetBytes(requestBody)));

        await middleware.InvokeAsync(context);
        var log = await auditLog.Task.WaitAsync(TimeSpan.FromSeconds(2));

        Assert.Equal(requestBody, bodySeenByPipeline);
        Assert.Contains("\"senha\":\"***\"", log.DadosRequisicao);
        Assert.DoesNotContain("nao registrar", log.DadosRequisicao);
        Assert.NotNull(bodyReader);
        Assert.True(bodyReader!.IsDisposed);
    }

    [Fact]
    public async Task InvokeAsyncPreservesBodyForPipelineWhenAuditCaptureThrows()
    {
        const string requestBody = "{\"nome\":\"Alice\"}";
        var bodySeenByPipeline = string.Empty;
        TrackingStreamReader? bodyReader = null;
        var loggedData = CreateLoggedDataSource();
        var auditLog = loggedData.AuditLog;
        using var services = loggedData.Services;
        var middleware = CreateMiddleware(
            services,
            async context =>
            {
                using var reader = new StreamReader(
                    context.Request.Body,
                    Encoding.UTF8,
                    detectEncodingFromByteOrderMarks: true,
                    bufferSize: 1024,
                    leaveOpen: true);
                bodySeenByPipeline = await reader.ReadToEndAsync();
            },
            body => bodyReader = new TrackingStreamReader(body));
        var context = CreatePostContext(
            new ThrowOnceOnReadStream(Encoding.UTF8.GetBytes(requestBody)));

        await middleware.InvokeAsync(context);
        var log = await auditLog.Task.WaitAsync(TimeSpan.FromSeconds(2));

        Assert.Equal(requestBody, bodySeenByPipeline);
        Assert.Equal("Erro ao capturar dados da requisição", log.DadosRequisicao);
        Assert.NotNull(bodyReader);
        Assert.True(bodyReader!.IsDisposed);
    }

    [Fact]
    public async Task InvokeAsyncPropagatesUnexpectedCaptureFailure()
    {
        var loggedData = CreateLoggedDataSource();
        using var services = loggedData.Services;
        var middleware = CreateMiddleware(
            services,
            _ => Task.CompletedTask,
            _ => throw new InvalidOperationException("falha inesperada de captura"));
        var context = CreatePostContext(
            new MemoryStream(Encoding.UTF8.GetBytes("{\"nome\":\"Alice\"}")));

        await Assert.ThrowsAsync<InvalidOperationException>(() => middleware.InvokeAsync(context));
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
        using var services = CreateServices(service.Object);
        var middleware = CreateMiddleware(
            services,
            context =>
            {
                context.Response.StatusCode = StatusCodes.Status204NoContent;
                return Task.CompletedTask;
            });
        var context = new DefaultHttpContext();

        await middleware.InvokeAsync(context);

        Assert.Equal(StatusCodes.Status204NoContent, context.Response.StatusCode);
    }

    [Fact]
    public async Task InvokeAsyncPropagatesUnexpectedAuditPersistenceFailure()
    {
        var service = new Mock<IAuditoriaService>();
        service
            .Setup(instance => instance.RegistrarLogAsync(
                It.IsAny<CreateLogAuditoriaDTO>(),
                It.IsAny<int?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>()))
            .ThrowsAsync(new InvalidOperationException("falha inesperada de persistência"));
        using var services = CreateServices(service.Object);
        var middleware = CreateMiddleware(services, _ => Task.CompletedTask);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => middleware.InvokeAsync(new DefaultHttpContext()));
    }

    private static AuditoriaMiddleware CreateMiddleware(
        ServiceProvider services,
        RequestDelegate next,
        Func<Stream, TextReader>? bodyReaderFactory = null)
    {
        return new AuditoriaMiddleware(
            next,
            services.GetRequiredService<IServiceScopeFactory>(),
            bodyReaderFactory);
    }

    private static DefaultHttpContext CreatePostContext(Stream body)
    {
        var context = new DefaultHttpContext();
        context.Request.Method = HttpMethods.Post;
        context.Request.Path = "/api/usuarios";
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

        var services = CreateServices(service.Object);
        return (services, auditLog);
    }

    private static ServiceProvider CreateServices(IAuditoriaService service)
    {
        return new ServiceCollection()
            .AddSingleton(service)
            .BuildServiceProvider();
    }

    private sealed class ThrowOnceOnReadStream(byte[] content) : MemoryStream(content)
    {
        private bool _shouldThrow = true;

        public override int Read(Span<byte> buffer)
        {
            ThrowIfRequired();
            return base.Read(buffer);
        }

        public override ValueTask<int> ReadAsync(
            Memory<byte> buffer,
            CancellationToken cancellationToken = default)
        {
            ThrowIfRequired();
            return base.ReadAsync(buffer, cancellationToken);
        }

        public override Task<int> ReadAsync(
            byte[] buffer,
            int offset,
            int count,
            CancellationToken cancellationToken)
        {
            ThrowIfRequired();
            return base.ReadAsync(buffer, offset, count, cancellationToken);
        }

        private void ThrowIfRequired()
        {
            if (_shouldThrow)
            {
                _shouldThrow = false;
                throw new IOException("Falha sintética de leitura do corpo");
            }
        }
    }

    private sealed class TrackingStreamReader(Stream stream) : StreamReader(
        stream,
        Encoding.UTF8,
        detectEncodingFromByteOrderMarks: true,
        bufferSize: 1024,
        leaveOpen: true)
    {
        public bool IsDisposed { get; private set; }

        protected override void Dispose(bool disposing)
        {
            IsDisposed = true;
            base.Dispose(disposing);
        }
    }
}
