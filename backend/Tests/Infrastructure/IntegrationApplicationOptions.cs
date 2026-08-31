namespace Tests.Infrastructure;

public sealed record IntegrationApplicationOptions
{
    public string EnvironmentName { get; init; } = "IntegrationTesting";

    public IReadOnlyDictionary<string, string?> Configuration { get; init; } =
        new Dictionary<string, string?>();

    public TimeProvider TimeProvider { get; init; } = TimeProvider.System;
}
