using LabSolos_Server_DotNet8.Services;
using Microsoft.Extensions.DependencyInjection;

namespace Tests.Infrastructure;

public sealed record IntegrationApplicationOptions
{
    public string EnvironmentName { get; init; } = "IntegrationTesting";

    public IReadOnlyDictionary<string, string?> Configuration { get; init; } =
        new Dictionary<string, string?>();

    public TimeProvider TimeProvider { get; init; } = TimeProvider.System;

    public IEmailService? EmailService { get; init; }

    public IReadOnlySet<Type> BackgroundServicesToRun { get; init; } = new HashSet<Type>();

    public Action<IServiceCollection>? ConfigureServices { get; init; }
}
