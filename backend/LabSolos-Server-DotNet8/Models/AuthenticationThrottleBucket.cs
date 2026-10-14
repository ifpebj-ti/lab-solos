namespace LabSolos_Server_DotNet8.Models;

public sealed class AuthenticationThrottleBucket
{
    public required string Scope { get; set; }

    public required byte[] KeyHash { get; set; }

    public DateTimeOffset WindowStartedAt { get; set; }

    public DateTimeOffset WindowEndsAt { get; set; }

    public int Count { get; set; }

    public DateTimeOffset? NextAllowedAt { get; set; }

    public DateTimeOffset? NextEmissionAt { get; set; }
}
