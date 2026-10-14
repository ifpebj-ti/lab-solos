using System.Buffers.Binary;
using System.Net;
using System.Security.Cryptography;
using System.Text;

namespace LabSolos_Server_DotNet8.Services.Security;

public enum ThrottlePurpose
{
    Login,
    RecoveryRequest,
    RecoveryCode
}

public sealed class ThrottleKeyFactory : IDisposable
{
    private const int MinimumSecretBytes = 32;
    private const int MaximumIdentifierLength = 254;
    private readonly byte[] _secret;
    private readonly string _environmentName;
    public bool IsSynthetic { get; }
    private bool _disposed;

    public ThrottleKeyFactory(
        ReadOnlySpan<byte> secret,
        string environmentName,
        bool isSynthetic = false)
    {
        if (secret.Length < MinimumSecretBytes)
        {
            throw new ArgumentException("A key hashing secret must contain at least 32 bytes.", nameof(secret));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(environmentName);
        var normalizedEnvironmentName = environmentName.Trim();
        if (normalizedEnvironmentName.Length > 128 || normalizedEnvironmentName.Any(char.IsControl))
        {
            throw new ArgumentException("The environment name is invalid.", nameof(environmentName));
        }

        _secret = secret.ToArray();
        _environmentName = normalizedEnvironmentName.ToLowerInvariant();
        IsSynthetic = isSynthetic;
    }

    public byte[] CreateRecipientQuotaKey(ThrottlePurpose purpose, string email)
    {
        ThrowIfDisposed();
        ValidateIdentifier(email, nameof(email));
        var normalizedEmail = email.Trim().ToLowerInvariant();
        return CreateKey(GetPurposeName(purpose), "recipient", normalizedEmail);
    }

    public byte[] CreateIpQuotaKey(ThrottlePurpose purpose, IPAddress? ipAddress)
    {
        ThrowIfDisposed();
        return CreateKey(GetPurposeName(purpose), "ip", CanonicalizeIp(ipAddress));
    }

    public byte[] CreateRecoveryDeliveryKey(string exactEmail)
    {
        ThrowIfDisposed();
        ValidateIdentifier(exactEmail, nameof(exactEmail));
        return CreateKey("recovery-delivery", "recipient-exact", exactEmail);
    }

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        CryptographicOperations.ZeroMemory(_secret);
        _disposed = true;
    }

    private void ThrowIfDisposed() =>
        ObjectDisposedException.ThrowIf(_disposed, this);

    private byte[] CreateKey(string purpose, string dimension, string identifier)
    {
        var message = EncodeDomain(_environmentName, purpose, dimension, identifier);
        try
        {
            return HMACSHA256.HashData(_secret, message);
        }
        finally
        {
            CryptographicOperations.ZeroMemory(message);
        }
    }

    private static string GetPurposeName(ThrottlePurpose purpose) => purpose switch
    {
        ThrottlePurpose.Login => "login",
        ThrottlePurpose.RecoveryRequest => "recovery-request",
        ThrottlePurpose.RecoveryCode => "recovery-code",
        _ => throw new ArgumentOutOfRangeException(nameof(purpose))
    };

    private static string CanonicalizeIp(IPAddress? ipAddress)
    {
        if (ipAddress is null)
        {
            return "unknown";
        }

        var canonicalAddress = ipAddress.IsIPv4MappedToIPv6
            ? ipAddress.MapToIPv4()
            : ipAddress;
        return canonicalAddress.ToString();
    }

    private static void ValidateIdentifier(string? identifier, string parameterName)
    {
        if (string.IsNullOrWhiteSpace(identifier)
            || identifier.Length > MaximumIdentifierLength
            || identifier.Any(char.IsControl))
        {
            throw new ArgumentException("The quota identifier is invalid.", parameterName);
        }
    }

    private static byte[] EncodeDomain(params string[] values)
    {
        var encodedValues = values.Select(Encoding.UTF8.GetBytes).ToArray();
        var totalLength = encodedValues.Sum(value => sizeof(int) + value.Length);
        var message = new byte[totalLength];
        var offset = 0;

        try
        {
            foreach (var value in encodedValues)
            {
                BinaryPrimitives.WriteInt32BigEndian(message.AsSpan(offset, sizeof(int)), value.Length);
                offset += sizeof(int);
                value.CopyTo(message, offset);
                offset += value.Length;
            }

            return message;
        }
        finally
        {
            foreach (var value in encodedValues)
            {
                CryptographicOperations.ZeroMemory(value);
            }
        }
    }
}
