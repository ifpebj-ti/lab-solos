using System.Data.Common;

namespace LabSolos_Server_DotNet8.Services.Security;

public interface IAuthenticationThrottleClock
{
    Task<DateTimeOffset> GetUtcNowAsync(
        DbConnection connection,
        DbTransaction transaction,
        CancellationToken cancellationToken = default);
}

public sealed class PostgreSqlAuthenticationThrottleClock : IAuthenticationThrottleClock
{
    public async Task<DateTimeOffset> GetUtcNowAsync(
        DbConnection connection,
        DbTransaction transaction,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(connection);
        ArgumentNullException.ThrowIfNull(transaction);

        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = "SELECT clock_timestamp();";
        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result switch
        {
            DateTimeOffset timestamp => timestamp.ToUniversalTime(),
            DateTime timestamp => new DateTimeOffset(DateTime.SpecifyKind(timestamp, DateTimeKind.Utc)),
            _ => throw new InvalidOperationException("The PostgreSQL throttle clock returned an invalid value.")
        };
    }
}

public sealed class TimeProviderAuthenticationThrottleClock(TimeProvider timeProvider) : IAuthenticationThrottleClock
{
    public Task<DateTimeOffset> GetUtcNowAsync(
        DbConnection connection,
        DbTransaction transaction,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(connection);
        ArgumentNullException.ThrowIfNull(transaction);
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult(timeProvider.GetUtcNow().ToUniversalTime());
    }
}
