namespace Tests.Infrastructure;

public sealed class ControlledTimeProvider(DateTimeOffset utcNow) : TimeProvider
{
    private long _utcTicks = utcNow.ToUniversalTime().Ticks;

    public override DateTimeOffset GetUtcNow() => new(Interlocked.Read(ref _utcTicks), TimeSpan.Zero);

    public void Advance(TimeSpan duration) => Interlocked.Add(ref _utcTicks, duration.Ticks);

    public void SetUtcNow(DateTimeOffset utcNow) =>
        Interlocked.Exchange(ref _utcTicks, utcNow.ToUniversalTime().Ticks);
}
