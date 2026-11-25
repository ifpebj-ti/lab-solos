using System.Buffers.Binary;
using System.Security.Cryptography;
using System.Text;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace LabSolos_Server_DotNet8.Services.Security;

/// <summary>Applies normalized address uniqueness, former-address grace and durable notice contracts.</summary>
public sealed class EmailAddressReservationService(
    AppDbContext context,
    ThrottleKeyFactory keyFactory,
    RecoveryPayloadProtector payloadProtector,
    TimeProvider timeProvider)
{
    public const int GracePeriodDays = 7;
    public const int NoticeDeliveryHours = 24;
    public const int NoticeRetentionDays = 30;
    public const int MaximumNoticeAttempts = 3;

    private readonly AppDbContext _context = context ?? throw new ArgumentNullException(nameof(context));
    private readonly ThrottleKeyFactory _keyFactory = keyFactory ?? throw new ArgumentNullException(nameof(keyFactory));
    private readonly RecoveryPayloadProtector _payloadProtector = payloadProtector ?? throw new ArgumentNullException(nameof(payloadProtector));
    private readonly TimeProvider _timeProvider = timeProvider ?? throw new ArgumentNullException(nameof(timeProvider));

    public DateTimeOffset GetUtcNow() => _timeProvider.GetUtcNow();

    public static string Normalize(string address)
    {
        ArgumentNullException.ThrowIfNull(address);
        return address.Trim().ToLowerInvariant();
    }

    public async Task<bool> IsUnavailableToAsync(
        string address,
        int? accountId,
        CancellationToken cancellationToken = default)
    {
        var normalized = Normalize(address);
        var normalizedPattern = EscapeLikePattern(normalized);
        var existingAddresses = _context.Usuarios.Where(
            user => EF.Functions.ILike(user.Email.Trim(), normalizedPattern, "\\"));
        if (accountId is int existingAccountId)
            existingAddresses = existingAddresses.Where(user => user.Id != existingAccountId);
        if (await existingAddresses.AnyAsync(cancellationToken))
        {
            return true;
        }

        var hash = _keyFactory.CreateEmailAddressKey(normalized);
        try
        {
            var now = _timeProvider.GetUtcNow();
            var activeReservations = _context.EmailAddressReservations.Where(
                reservation => reservation.NormalizedAddressHash == hash && reservation.ExpiresAt > now);
            if (accountId is int reservationAccountId)
                activeReservations = activeReservations.Where(
                    reservation => reservation.OwnerUserId != reservationAccountId);
            return await activeReservations.AnyAsync(cancellationToken);
        }
        finally
        {
            CryptographicOperations.ZeroMemory(hash);
        }
    }

    private static string EscapeLikePattern(string value) => value
        .Replace("\\", "\\\\", StringComparison.Ordinal)
        .Replace("%", "\\%", StringComparison.Ordinal)
        .Replace("_", "\\_", StringComparison.Ordinal);

    /// <summary>
    /// Serializes assignment and reservation checks for a normalized address across
    /// profile changes and public registration. Call only inside the operation transaction.
    /// </summary>
    public async Task LockAddressAsync(string address, CancellationToken cancellationToken = default)
    {
        var hash = _keyFactory.CreateEmailAddressKey(Normalize(address));
        try
        {
            var transaction = _context.Database.CurrentTransaction
                ?? throw new InvalidOperationException("Email address admission requires an active transaction.");
            var lockKey = BinaryPrimitives.ReadInt64BigEndian(hash);
            await using var command = transaction.GetDbTransaction().Connection!.CreateCommand();
            command.Transaction = transaction.GetDbTransaction();
            command.CommandText = "SELECT pg_advisory_xact_lock(@lockKey);";
            var parameter = command.CreateParameter();
            parameter.ParameterName = "lockKey";
            parameter.Value = lockKey;
            command.Parameters.Add(parameter);
            await command.ExecuteScalarAsync(cancellationToken);
        }
        finally
        {
            CryptographicOperations.ZeroMemory(hash);
        }
    }

    public async Task ReleaseReservationForOwnerAsync(
        string address,
        int accountId,
        CancellationToken cancellationToken = default)
    {
        var hash = _keyFactory.CreateEmailAddressKey(Normalize(address));
        try
        {
            await _context.EmailAddressReservations
                .Where(reservation => reservation.NormalizedAddressHash == hash &&
                    reservation.OwnerUserId == accountId)
                .ExecuteDeleteAsync(cancellationToken);
        }
        finally
        {
            CryptographicOperations.ZeroMemory(hash);
        }
    }

    public async Task ReserveFormerAddressAsync(
        string previousAddress,
        int ownerId,
        DateTimeOffset now,
        CancellationToken cancellationToken = default)
    {
        var hash = _keyFactory.CreateEmailAddressKey(Normalize(previousAddress));
        try
        {
            var reservation = await _context.EmailAddressReservations
                .SingleOrDefaultAsync(entry => entry.NormalizedAddressHash == hash, cancellationToken);
            if (reservation is null)
            {
                _context.EmailAddressReservations.Add(new EmailAddressReservation
                {
                    NormalizedAddressHash = hash.ToArray(),
                    OwnerUserId = ownerId,
                    ReservedAt = now,
                    ExpiresAt = now.AddDays(GracePeriodDays)
                });
                return;
            }

            if (reservation.ExpiresAt > now && reservation.OwnerUserId != ownerId)
            {
                throw new InvalidOperationException("The former email address is reserved by another account.");
            }

            reservation.OwnerUserId = ownerId;
            reservation.ReservedAt = now;
            reservation.ExpiresAt = now.AddDays(GracePeriodDays);
        }
        finally
        {
            CryptographicOperations.ZeroMemory(hash);
        }
    }

    public void AddNoticeJobs(
        Guid operationId,
        int ownerId,
        string previousAddress,
        string newAddress,
        DateTimeOffset now)
    {
        AddNoticeJob(operationId, ownerId, EmailChangeNoticeRecipient.PreviousAddress, previousAddress, now);
        AddNoticeJob(operationId, ownerId, EmailChangeNoticeRecipient.NewAddress, newAddress, now);
    }

    private void AddNoticeJob(
        Guid operationId,
        int ownerId,
        EmailChangeNoticeRecipient recipient,
        string address,
        DateTimeOffset now)
    {
        var id = Guid.NewGuid();
        var normalized = Normalize(address);
        var recipientHash = _keyFactory.CreateEmailAddressKey(normalized);
        var plaintext = Encoding.UTF8.GetBytes(normalized);
        try
        {
            var payload = _payloadProtector.Protect(id, RecoveryPayloadPurpose.EmailChangeNotice, plaintext);
            _context.EmailChangeNoticeJobs.Add(new EmailChangeNoticeJob
            {
                Id = id,
                OperationId = operationId,
                UserId = ownerId,
                Recipient = recipient,
                RecipientKeyHash = recipientHash.ToArray(),
                PayloadCiphertext = payload.Ciphertext,
                PayloadNonce = payload.Nonce,
                PayloadTag = payload.Tag,
                EncryptionKeyId = payload.EncryptionKeyId,
                CreatedAt = now,
                DeadlineAt = now.AddHours(NoticeDeliveryHours),
                RetainUntil = now.AddDays(NoticeRetentionDays),
                NextAttemptAt = now,
                Status = EmailChangeNoticeStatus.Pending,
                Attempts = 0
            });
        }
        finally
        {
            CryptographicOperations.ZeroMemory(recipientHash);
            CryptographicOperations.ZeroMemory(plaintext);
        }
    }
}
