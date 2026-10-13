using System.Data.Common;
using System.Net.Mail;
using System.Security.Cryptography;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Options;

namespace LabSolos_Server_DotNet8.BackgroundServices;

public sealed class PasswordRecoveryDeliveryWorker(
    IServiceScopeFactory scopeFactory,
    IOptions<AuthenticationProtectionOptions> options,
    TimeProvider timeProvider,
    ILogger<PasswordRecoveryDeliveryWorker> logger) : BackgroundService
{
    private static readonly JsonSerializerOptions PayloadJsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly Action<ILogger, Exception?> LogProcessingFailure =
        LoggerMessage.Define(
            LogLevel.Warning,
            new EventId(1801, nameof(LogProcessingFailure)),
            "Recovery delivery processing failed; the lease will be reclaimed after expiry.");
    private static readonly Action<ILogger, Exception?> LogDeliveryFailure =
        LoggerMessage.Define(
            LogLevel.Warning,
            new EventId(1802, nameof(LogDeliveryFailure)),
            "Recovery email delivery failed; a bounded retry was scheduled.");
    private static readonly Action<ILogger, Exception?> LogPermanentDeliveryFailure =
        LoggerMessage.Define(
            LogLevel.Warning,
            new EventId(1803, nameof(LogPermanentDeliveryFailure)),
            "Recovery email delivery failed due to permanent configuration or address validation.");

    private readonly IServiceScopeFactory _scopeFactory = scopeFactory ?? throw new ArgumentNullException(nameof(scopeFactory));
    private readonly AuthenticationProtectionOptions _options = (options ?? throw new ArgumentNullException(nameof(options))).Value;
    private readonly TimeProvider _timeProvider = timeProvider ?? throw new ArgumentNullException(nameof(timeProvider));
    private readonly ILogger<PasswordRecoveryDeliveryWorker> _logger = logger ?? throw new ArgumentNullException(nameof(logger));

    public async Task<int> ProcessPendingAsync(CancellationToken cancellationToken = default)
    {
        IReadOnlyList<ReservedRecoveryJob> batch;
        await using (var scope = _scopeFactory.CreateAsyncScope())
        {
            var jobs = scope.ServiceProvider.GetRequiredService<PasswordRecoveryJobRepository>();
            batch = await jobs.ReserveBatchAsync(
                batchSize: 10,
                leaseDuration: TimeSpan.FromSeconds(_options.Delivery.LeaseSeconds),
                cancellationToken);
        }

        var processing = batch.Select(job => ProcessReservationAsync(job, cancellationToken));
        await Task.WhenAll(processing);
        return batch.Count;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessPendingAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception)
            {
                LogProcessingFailure(_logger, null);
            }

            await Task.Delay(TimeSpan.FromSeconds(_options.Delivery.PollSeconds), stoppingToken);
        }
    }

    private async Task ProcessReservationAsync(
        ReservedRecoveryJob job,
        CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var services = scope.ServiceProvider;
        var context = services.GetRequiredService<AppDbContext>();
        var repository = services.GetRequiredService<PasswordRecoveryJobRepository>();
        var protector = services.GetRequiredService<RecoveryPayloadProtector>();
        var credentialService = services.GetRequiredService<ICredentialService>();

        try
        {
            var plaintext = protector.Unprotect(job.Id, job.PayloadPurpose, job.Payload);
            try
            {
                if (job.PayloadPurpose == RecoveryPayloadPurpose.Request)
                {
                    var request = JsonSerializer.Deserialize<PasswordRecoveryRequestPayload>(plaintext, PayloadJsonOptions);
                    if (request is null || !IsValidEmail(request.Email))
                    {
                        await repository.TryCompleteAsync(job.Id, job.LeaseId, cancellationToken);
                        return;
                    }

                    await ProcessRequestAsync(
                        job,
                        request.Email,
                        context,
                        repository,
                        services,
                        cancellationToken);
                    return;
                }

                var delivery = JsonSerializer.Deserialize<PasswordRecoveryDeliveryPayload>(plaintext, PayloadJsonOptions);
                if (delivery is null || !IsValidEmail(delivery.Email) || string.IsNullOrWhiteSpace(delivery.Token))
                {
                    await repository.TryCompleteAsync(job.Id, job.LeaseId, cancellationToken);
                    return;
                }

                await DeliverAsync(
                    job,
                    delivery,
                    credentialService,
                    repository,
                    context,
                    services.GetRequiredService<IEmailService>(),
                    cancellationToken);
            }
            finally
            {
                CryptographicOperations.ZeroMemory(plaintext);
            }
        }
        catch (CryptographicException)
        {
            await repository.TryCompleteAsync(job.Id, job.LeaseId, cancellationToken);
        }
        catch (JsonException)
        {
            await repository.TryCompleteAsync(job.Id, job.LeaseId, cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception)
        {
            LogProcessingFailure(_logger, null);
        }
    }

    private async Task ProcessRequestAsync(
        ReservedRecoveryJob job,
        string email,
        AppDbContext context,
        PasswordRecoveryJobRepository repository,
        IServiceProvider services,
        CancellationToken cancellationToken)
    {
        var now = _timeProvider.GetUtcNow();
        var maximumAge = TimeSpan.FromSeconds(_options.Delivery.RequestMaxAgeSeconds);
        if (now - job.CreatedAt > maximumAge || now >= job.ExpiresAt)
        {
            await repository.TryCompleteAsync(job.Id, job.LeaseId, cancellationToken);
            return;
        }

        var emissionRetryAfter = await TryReserveEmissionAsync(
            context,
            job.RecipientKeyHash,
            _options.RecoveryRequest.CooldownSeconds,
            cancellationToken);
        if (emissionRetryAfter is null || emissionRetryAfter > 0)
        {
            var delaySeconds = emissionRetryAfter is null
                ? 30
                : emissionRetryAfter.Value + 1;
            await RescheduleWithoutAttemptAsync(
                context,
                job,
                now.AddSeconds(delaySeconds),
                cancellationToken);
            return;
        }

        var eligibleUser = await context.Usuarios
            .AsNoTracking()
            .Where(user => user.Email == email && user.Status == Enums.StatusUsuario.Habilitado)
            .Select(user => new { user.Id })
            .SingleOrDefaultAsync(cancellationToken);
        if (eligibleUser is null)
        {
            await repository.TryCompleteAsync(job.Id, job.LeaseId, cancellationToken);
            return;
        }

        await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);
        var issued = await services.GetRequiredService<ICredentialService>()
            .IssuePasswordResetForDeliveryAsync(eligibleUser.Id, email, cancellationToken);
        if (issued is null)
        {
            await repository.TryCompleteAsync(job.Id, job.LeaseId, cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return;
        }

        var delivery = new PasswordRecoveryDeliveryPayload(
            issued.Email,
            issued.RecipientName,
            issued.Token);
        var deliveryPlaintext = JsonSerializer.SerializeToUtf8Bytes(delivery, PayloadJsonOptions);
        try
        {
            var replaced = await repository.TryReplacePayloadAsync(
                job.Id,
                job.LeaseId,
                deliveryPlaintext,
                RecoveryPayloadPurpose.Delivery,
                issued.UserId,
                issued.SessionVersion,
                issued.ExpiresAt,
                cancellationToken);
            if (!replaced)
            {
                await transaction.RollbackAsync(CancellationToken.None);
                return;
            }

            await transaction.CommitAsync(cancellationToken);
        }
        finally
        {
            CryptographicOperations.ZeroMemory(deliveryPlaintext);
        }

        var refreshedJob = job with
        {
            UserId = issued.UserId,
            SessionVersion = issued.SessionVersion,
            ExpiresAt = issued.ExpiresAt
        };
        await DeliverAsync(
            refreshedJob,
            delivery,
            services.GetRequiredService<ICredentialService>(),
            repository,
            context,
            services.GetRequiredService<IEmailService>(),
            cancellationToken);
    }

    private async Task DeliverAsync(
        ReservedRecoveryJob job,
        PasswordRecoveryDeliveryPayload delivery,
        ICredentialService credentialService,
        PasswordRecoveryJobRepository repository,
        AppDbContext context,
        IEmailService emailService,
        CancellationToken cancellationToken)
    {
        if (job.UserId is not { } userId
            || job.SessionVersion is not { } sessionVersion
            || !await credentialService.IsPasswordResetCurrentAsync(
                userId,
                delivery.Email,
                sessionVersion,
                delivery.Token,
                cancellationToken))
        {
            await repository.TryCompleteAsync(job.Id, job.LeaseId, cancellationToken);
            return;
        }

        if (!await HasSendLeaseAsync(context, job, cancellationToken))
        {
            return;
        }

        using var sendTimeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        sendTimeout.CancelAfter(TimeSpan.FromSeconds(_options.Delivery.SendTimeoutSeconds));
        try
        {
            await emailService.EnviarEmailAsync(
                delivery.Email,
                "Redefinição de senha LabOn",
                CreateEmailBody(delivery),
                sendTimeout.Token);
            await repository.TryCompleteAsync(job.Id, job.LeaseId, cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception) when (IsPermanentDeliveryFailure(exception))
        {
            LogPermanentDeliveryFailure(_logger, null);
            await repository.TryScheduleRetryAsync(
                job.Id,
                job.LeaseId,
                job.Attempts + 1,
                job.ExpiresAt,
                cancellationToken);
        }
        catch (Exception)
        {
            LogDeliveryFailure(_logger, null);
            var attempts = job.Attempts + 1;
            var retryDelay = attempts == 1 ? TimeSpan.FromSeconds(30) : TimeSpan.FromSeconds(120);
            var nextAttemptAt = attempts >= _options.Delivery.MaxAttempts
                ? job.ExpiresAt
                : _timeProvider.GetUtcNow().Add(retryDelay);
            await repository.TryScheduleRetryAsync(
                job.Id,
                job.LeaseId,
                attempts,
                nextAttemptAt,
                cancellationToken);
        }
    }

    private static async Task<bool> RescheduleWithoutAttemptAsync(
        AppDbContext context,
        ReservedRecoveryJob job,
        DateTimeOffset nextAttemptAt,
        CancellationToken cancellationToken)
    {
        await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);
        var connection = context.Database.GetDbConnection();
        await using var command = connection.CreateCommand();
        command.Transaction = transaction.GetDbTransaction();
        command.CommandText = """
            UPDATE "PasswordRecoveryJobs"
            SET "Status" = 'Pending',
                "NextAttemptAt" = @nextAttemptAt,
                "LeaseId" = NULL,
                "LeaseUntil" = NULL
            WHERE "Id" = @jobId
              AND "Status" = 'Processing'
              AND "LeaseId" = @leaseId
              AND "LeaseUntil" > clock_timestamp()
              AND "ExpiresAt" > clock_timestamp();
            """;
        AddParameter(command, "nextAttemptAt", nextAttemptAt.UtcDateTime);
        AddParameter(command, "jobId", job.Id);
        AddParameter(command, "leaseId", job.LeaseId);
        var rescheduled = await command.ExecuteNonQueryAsync(cancellationToken) == 1;
        if (rescheduled)
        {
            await transaction.CommitAsync(cancellationToken);
        }
        else
        {
            await transaction.RollbackAsync(CancellationToken.None);
        }

        return rescheduled;
    }

    private static async Task<int?> TryReserveEmissionAsync(
        AppDbContext context,
        byte[] recipientKeyHash,
        int cooldownSeconds,
        CancellationToken cancellationToken)
    {
        await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);
        var connection = context.Database.GetDbConnection();
        await using (var command = connection.CreateCommand())
        {
            command.Transaction = transaction.GetDbTransaction();
            command.CommandText = """
                SELECT "NextEmissionAt", clock_timestamp()
                FROM "AuthenticationThrottleBuckets"
                WHERE "Scope" = @scope AND "KeyHash" = @keyHash
                FOR UPDATE;
                """;
            AddParameter(command, "scope", AuthenticationProtectionCapacity.RecoveryRequestRecipient);
            AddParameter(command, "keyHash", recipientKeyHash);
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                await reader.DisposeAsync();
                await transaction.RollbackAsync(CancellationToken.None);
                return null;
            }

            var nextEmissionAt = reader.IsDBNull(0)
                ? (DateTimeOffset?)null
                : reader.GetFieldValue<DateTimeOffset>(0);
            var databaseNow = reader.GetFieldValue<DateTimeOffset>(1);
            await reader.DisposeAsync();

            if (nextEmissionAt is { } next && next > databaseNow)
            {
                var retryAfter = (int)Math.Ceiling((next - databaseNow).TotalSeconds);
                await transaction.CommitAsync(cancellationToken);
                return Math.Max(1, retryAfter);
            }
        }

        await using (var update = connection.CreateCommand())
        {
            update.Transaction = transaction.GetDbTransaction();
            update.CommandText = """
                UPDATE "AuthenticationThrottleBuckets"
                SET "NextEmissionAt" = clock_timestamp() + (@cooldownSeconds * interval '1 second')
                WHERE "Scope" = @scope AND "KeyHash" = @keyHash;
                """;
            AddParameter(update, "cooldownSeconds", cooldownSeconds);
            AddParameter(update, "scope", AuthenticationProtectionCapacity.RecoveryRequestRecipient);
            AddParameter(update, "keyHash", recipientKeyHash);
            if (await update.ExecuteNonQueryAsync(cancellationToken) != 1)
            {
                await transaction.RollbackAsync(CancellationToken.None);
                return null;
            }
        }

        await transaction.CommitAsync(cancellationToken);
        return 0;
    }

    private async Task<bool> HasSendLeaseAsync(
        AppDbContext context,
        ReservedRecoveryJob job,
        CancellationToken cancellationToken)
    {
        var connection = context.Database.GetDbConnection();
        await context.Database.OpenConnectionAsync(cancellationToken);
        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = """
                SELECT EXISTS (
                    SELECT 1
                    FROM "PasswordRecoveryJobs"
                    WHERE "Id" = @jobId
                      AND "Status" = 'Processing'
                      AND "LeaseId" = @leaseId
                      AND "LeaseUntil" > clock_timestamp() + (@sendTimeoutSeconds * interval '1 second')
                      AND "ExpiresAt" > clock_timestamp()
                );
                """;
            AddParameter(command, "jobId", job.Id);
            AddParameter(command, "leaseId", job.LeaseId);
            AddParameter(command, "sendTimeoutSeconds", _options.Delivery.SendTimeoutSeconds);
            var result = await command.ExecuteScalarAsync(cancellationToken);
            return Convert.ToBoolean(result, System.Globalization.CultureInfo.InvariantCulture);
        }
        finally
        {
            await context.Database.CloseConnectionAsync();
        }
    }

    private static void AddParameter(DbCommand command, string name, object value)
    {
        var parameter = command.CreateParameter();
        parameter.ParameterName = name;
        parameter.Value = value;
        command.Parameters.Add(parameter);
    }

    private static string CreateEmailBody(PasswordRecoveryDeliveryPayload delivery)
    {
        var name = HtmlEncoder.Default.Encode(delivery.RecipientName);
        var token = HtmlEncoder.Default.Encode(delivery.Token);
        return $"<p>Olá, {name}.</p><p>Use este código para redefinir sua senha: <strong>{token}</strong></p><p>O código expira em 15 minutos e pode ser usado uma única vez.</p>";
    }

    private static bool IsValidEmail(string? email) =>
        !string.IsNullOrWhiteSpace(email)
        && email.Length <= 254
        && !email.Any(char.IsControl)
        && MailAddress.TryCreate(email, out var address)
        && string.Equals(address.Address, email, StringComparison.Ordinal);

    private static bool IsPermanentDeliveryFailure(Exception exception) =>
        exception is InvalidOperationException or FormatException or ArgumentException;
}

public sealed record PasswordRecoveryDeliveryPayload(
    [property: JsonPropertyName("email")] string Email,
    [property: JsonPropertyName("name")] string RecipientName,
    [property: JsonPropertyName("token")] string Token);
