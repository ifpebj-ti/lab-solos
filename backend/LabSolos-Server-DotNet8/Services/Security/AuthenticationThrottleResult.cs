namespace LabSolos_Server_DotNet8.Services.Security;

public enum AuthenticationThrottleState
{
    Allowed,
    RateLimited,
    CapacityExceeded,
    Unavailable
}

public enum AuthenticationThrottleOutcome
{
    Failure,
    Accepted
}

public sealed record AuthenticationThrottleRule(
    string Scope,
    byte[] KeyHash,
    int Limit,
    TimeSpan Window,
    bool CountOnAccepted = false,
    TimeSpan? AcceptedCooldown = null);

public sealed record AuthenticationThrottleResult(
    AuthenticationThrottleState State,
    int RetryAfterSeconds = 0,
    AuthenticationThrottleAttempt? Attempt = null);

public sealed class AuthenticationThrottleAttempt : IAsyncDisposable
{
    private readonly Func<AuthenticationThrottleOutcome, CancellationToken, Task> _complete;
    private readonly Func<ValueTask> _rollback;
    private readonly Action<string, byte[], DateTimeOffset?> _setNextEmission;
    private int _state;

    internal AuthenticationThrottleAttempt(
        Func<AuthenticationThrottleOutcome, CancellationToken, Task> complete,
        Func<ValueTask> rollback,
        Action<string, byte[], DateTimeOffset?> setNextEmission)
    {
        _complete = complete;
        _rollback = rollback;
        _setNextEmission = setNextEmission;
    }

    public void SetNextEmissionAt(string scope, byte[] keyHash, DateTimeOffset? nextEmissionAt)
    {
        if (Volatile.Read(ref _state) != 0)
        {
            throw new InvalidOperationException("The throttle attempt is no longer active.");
        }

        _setNextEmission(scope, keyHash, nextEmissionAt?.ToUniversalTime());
    }

    public async Task CompleteAsync(
        AuthenticationThrottleOutcome outcome,
        CancellationToken cancellationToken = default)
    {
        if (Interlocked.CompareExchange(ref _state, 1, 0) != 0)
        {
            throw new InvalidOperationException("The throttle attempt is no longer active.");
        }

        try
        {
            await _complete(outcome, cancellationToken);
        }
        catch
        {
            await _rollback();
            throw;
        }
        finally
        {
            Volatile.Write(ref _state, 2);
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (Interlocked.CompareExchange(ref _state, 1, 0) != 0)
        {
            return;
        }

        try
        {
            await _rollback();
        }
        finally
        {
            Volatile.Write(ref _state, 2);
        }
    }
}
