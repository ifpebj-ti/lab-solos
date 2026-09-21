using LabSolos_Server_DotNet8.BackgroundServices;
using LabSolos_Server_DotNet8.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;

namespace Tests.Services;

public sealed class EmprestimosVencidosBackgroundServiceTests
{
    [Fact]
    public async Task RecoverableFailureIsLoggedAndCancellationStillStopsTheLoop()
    {
        using var cancellation = new CancellationTokenSource();
        var notificationService = new Mock<INotificacaoService>();
        notificationService
            .Setup(service => service.VerificarEmprestimosVencidosAsync())
            .Callback(() => cancellation.Cancel())
            .ThrowsAsync(new TimeoutException("temporary database timeout"));
        using var provider = CreateProvider(notificationService.Object);
        var logger = new RecordingLogger<EmprestimosVencidosBackgroundService>();
        var service = new TestableEmprestimosVencidosBackgroundService(provider, logger);

        await Assert.ThrowsAnyAsync<OperationCanceledException>(
            () => service.RunAsync(cancellation.Token));

        var entry = Assert.Single(logger.Entries, item => item.Level == LogLevel.Warning);
        Assert.IsType<TimeoutException>(entry.Exception);
        Assert.DoesNotContain(logger.Entries, item => item.Level == LogLevel.Error);
    }

    [Fact]
    public async Task UnexpectedFailureIsLoggedAndEscapesInsteadOfStartingASilentLoop()
    {
        var notificationService = new Mock<INotificacaoService>();
        notificationService
            .Setup(service => service.VerificarEmprestimosVencidosAsync())
            .ThrowsAsync(new ArgumentException("invalid notification state"));
        using var provider = CreateProvider(notificationService.Object);
        var logger = new RecordingLogger<EmprestimosVencidosBackgroundService>();
        var service = new TestableEmprestimosVencidosBackgroundService(provider, logger);

        var exception = await Assert.ThrowsAsync<ArgumentException>(
            () => service.RunAsync(CancellationToken.None));

        Assert.Equal("invalid notification state", exception.Message);
        var entry = Assert.Single(logger.Entries, item => item.Level == LogLevel.Error);
        Assert.Same(exception, entry.Exception);
        notificationService.Verify(item => item.VerificarEmprestimosVencidosAsync(), Times.Once);
    }

    [Fact]
    public async Task CancellationBeforeExecutionDoesNotResolveOrProcessNotifications()
    {
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        var notificationService = new Mock<INotificacaoService>();
        using var provider = CreateProvider(notificationService.Object);
        var logger = new RecordingLogger<EmprestimosVencidosBackgroundService>();
        var service = new TestableEmprestimosVencidosBackgroundService(provider, logger);

        await service.RunAsync(cancellation.Token);

        notificationService.Verify(item => item.VerificarEmprestimosVencidosAsync(), Times.Never);
        Assert.DoesNotContain(logger.Entries, item => item.Level == LogLevel.Error);
    }

    [Fact]
    public async Task SuccessfulProcessingIsPreservedBeforeTheScheduledDelay()
    {
        using var cancellation = new CancellationTokenSource();
        var notificationService = new Mock<INotificacaoService>();
        notificationService
            .Setup(service => service.VerificarEmprestimosVencidosAsync())
            .Callback(() => cancellation.Cancel())
            .Returns(Task.CompletedTask);
        using var provider = CreateProvider(notificationService.Object);
        var logger = new RecordingLogger<EmprestimosVencidosBackgroundService>();
        var service = new TestableEmprestimosVencidosBackgroundService(provider, logger);

        await Assert.ThrowsAnyAsync<OperationCanceledException>(
            () => service.RunAsync(cancellation.Token));

        notificationService.Verify(item => item.VerificarEmprestimosVencidosAsync(), Times.Once);
        Assert.Contains(logger.Entries, item => item.Level == LogLevel.Information);
    }

    private static ServiceProvider CreateProvider(INotificacaoService notificationService)
    {
        return new ServiceCollection()
            .AddScoped(_ => notificationService)
            .BuildServiceProvider();
    }

    private sealed class TestableEmprestimosVencidosBackgroundService(
        IServiceProvider serviceProvider,
        ILogger<EmprestimosVencidosBackgroundService> logger)
        : EmprestimosVencidosBackgroundService(serviceProvider, logger)
    {
        public Task RunAsync(CancellationToken stoppingToken) => ExecuteAsync(stoppingToken);
    }

    private sealed class RecordingLogger<T> : ILogger<T>
    {
        public List<LogEntry> Entries { get; } = [];

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => NullScope.Instance;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            Entries.Add(new LogEntry(logLevel, exception, formatter(state, exception)));
        }

        public sealed record LogEntry(LogLevel Level, Exception? Exception, string Message);

        private sealed class NullScope : IDisposable
        {
            public static NullScope Instance { get; } = new();

            public void Dispose()
            {
            }
        }
    }
}
