using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace LabSolos_Server_DotNet8.Services.Security;

public enum RecoveryPayloadPurpose
{
    Request,
    Delivery
}

public sealed record ProtectedRecoveryPayload(
    string EncryptionKeyId,
    byte[] Ciphertext,
    byte[] Nonce,
    byte[] Tag);

public interface IRecoveryEncryptionKeyProvider
{
    string ActiveKeyId { get; }

    byte[] CopyKey(string keyId);
}

public sealed class RecoveryEncryptionKeyRing : IRecoveryEncryptionKeyProvider, IDisposable
{
    private const int RequiredKeyLengthBytes = 32;
    private const int MaximumFileSizeBytes = 65_536;
    private readonly Dictionary<string, byte[]> _keys;
    private readonly object _gate = new();
    private bool _disposed;

    private RecoveryEncryptionKeyRing(string activeKeyId, Dictionary<string, byte[]> keys)
    {
        ActiveKeyId = activeKeyId;
        _keys = keys;
    }

    public string ActiveKeyId { get; }

    public static RecoveryEncryptionKeyRing Load(string path, ISecretFileReader secretFileReader)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(path);
        ArgumentNullException.ThrowIfNull(secretFileReader);
        if (!Path.IsPathFullyQualified(path))
        {
            throw new CryptographicException("The recovery encryption key file is invalid.");
        }

        var contents = secretFileReader.ReadAllBytes(path);
        if (contents is null)
        {
            throw new CryptographicException("The recovery encryption key file is invalid.");
        }

        var keys = new Dictionary<string, byte[]>(StringComparer.Ordinal);
        try
        {
            if (contents.Length == 0 || contents.Length > MaximumFileSizeBytes)
            {
                throw new CryptographicException("The recovery encryption key file is invalid.");
            }

            using var document = JsonDocument.Parse(contents);
            var root = document.RootElement;
            if (root.ValueKind != JsonValueKind.Object
                || !root.TryGetProperty("activeKeyId", out var activeKeyElement)
                || activeKeyElement.ValueKind != JsonValueKind.String
                || !root.TryGetProperty("keys", out var keysElement)
                || keysElement.ValueKind != JsonValueKind.Object)
            {
                throw new CryptographicException("The recovery encryption key file is invalid.");
            }

            if (activeKeyElement.GetString() is not { } activeKeyId || !IsValidKeyId(activeKeyId))
            {
                throw new CryptographicException("The recovery encryption key file is invalid.");
            }

            foreach (var property in keysElement.EnumerateObject())
            {
                if (!IsValidKeyId(property.Name)
                    || property.Value.ValueKind != JsonValueKind.String
                    || keys.ContainsKey(property.Name))
                {
                    throw new CryptographicException("The recovery encryption key file is invalid.");
                }

                keys.Add(property.Name, DecodeKey(property.Value));
            }

            if (keys.Count == 0 || !keys.ContainsKey(activeKeyId))
            {
                throw new CryptographicException("The recovery encryption key file is invalid.");
            }

            return new RecoveryEncryptionKeyRing(activeKeyId, keys);
        }
        catch (JsonException)
        {
            ClearKeys(keys);
            throw new CryptographicException("The recovery encryption key file is invalid.");
        }
        catch
        {
            ClearKeys(keys);
            throw;
        }
        finally
        {
            CryptographicOperations.ZeroMemory(contents);
        }
    }

    public byte[] CopyKey(string keyId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(keyId);
        lock (_gate)
        {
            ObjectDisposedException.ThrowIf(_disposed, this);
            if (!_keys.TryGetValue(keyId, out var key))
            {
                throw new CryptographicException("The recovery encryption key is unavailable.");
            }

            return key.ToArray();
        }
    }

    public void Dispose()
    {
        lock (_gate)
        {
            if (_disposed)
            {
                return;
            }

            ClearKeys(_keys);
            _disposed = true;
        }
    }

    private static byte[] DecodeKey(JsonElement value)
    {
        byte[]? decoded = null;
        var keepDecodedKey = false;
        try
        {
            decoded = value.GetBytesFromBase64();
            if (decoded.Length != RequiredKeyLengthBytes)
            {
                throw new CryptographicException("The recovery encryption key file is invalid.");
            }

            keepDecodedKey = true;
            return decoded;
        }
        catch (FormatException)
        {
            throw new CryptographicException("The recovery encryption key file is invalid.");
        }
        finally
        {
            if (!keepDecodedKey && decoded is not null)
            {
                CryptographicOperations.ZeroMemory(decoded);
            }
        }
    }

    private static bool IsValidKeyId(string? keyId) =>
        !string.IsNullOrWhiteSpace(keyId)
        && keyId.Length <= 128
        && !keyId.Any(char.IsControl);

    private static void ClearKeys(Dictionary<string, byte[]> keys)
    {
        foreach (var key in keys.Values)
        {
            CryptographicOperations.ZeroMemory(key);
        }

        keys.Clear();
    }
}

public sealed class RecoveryPayloadProtector
{
    private const int KeyLengthBytes = 32;
    private const int NonceLengthBytes = 12;
    private const int TagLengthBytes = 16;
    private const string FormatVersion = "v1";
    private readonly IRecoveryEncryptionKeyProvider _keyProvider;

    public RecoveryPayloadProtector(IRecoveryEncryptionKeyProvider keyProvider)
    {
        _keyProvider = keyProvider ?? throw new ArgumentNullException(nameof(keyProvider));
    }

    public ProtectedRecoveryPayload Protect(
        Guid workId,
        RecoveryPayloadPurpose purpose,
        ReadOnlySpan<byte> plaintext)
    {
        ValidateContext(workId, purpose);
        var keyId = _keyProvider.ActiveKeyId;
        if (string.IsNullOrWhiteSpace(keyId) || keyId.Length > 128 || keyId.Any(char.IsControl))
        {
            throw new CryptographicException("The recovery encryption key is unavailable.");
        }

        var key = _keyProvider.CopyKey(keyId);
        try
        {
            ValidateKey(key);
            var nonce = RandomNumberGenerator.GetBytes(NonceLengthBytes);
            var ciphertext = new byte[plaintext.Length];
            var tag = new byte[TagLengthBytes];
            var associatedData = CreateAssociatedData(workId, purpose, keyId);
            try
            {
                using var aes = new AesGcm(key, TagLengthBytes);
                aes.Encrypt(nonce, plaintext, ciphertext, tag, associatedData);
                return new ProtectedRecoveryPayload(keyId, ciphertext, nonce, tag);
            }
            catch (CryptographicException)
            {
                CryptographicOperations.ZeroMemory(ciphertext);
                CryptographicOperations.ZeroMemory(nonce);
                CryptographicOperations.ZeroMemory(tag);
                throw new CryptographicException("The recovery payload could not be protected.");
            }
            finally
            {
                CryptographicOperations.ZeroMemory(associatedData);
            }
        }
        finally
        {
            CryptographicOperations.ZeroMemory(key);
        }
    }

    public byte[] Unprotect(
        Guid workId,
        RecoveryPayloadPurpose purpose,
        ProtectedRecoveryPayload payload)
    {
        ArgumentNullException.ThrowIfNull(payload);
        ValidateContext(workId, purpose);
        if (!IsValidPayloadKeyId(payload.EncryptionKeyId)
            || payload.Nonce is null
            || payload.Nonce.Length != NonceLengthBytes
            || payload.Tag is null
            || payload.Tag.Length != TagLengthBytes
            || payload.Ciphertext is null)
        {
            throw new CryptographicException("The recovery payload is invalid or could not be authenticated.");
        }

        var key = _keyProvider.CopyKey(payload.EncryptionKeyId);
        try
        {
            ValidateKey(key);
            var plaintext = new byte[payload.Ciphertext.Length];
            var associatedData = CreateAssociatedData(workId, purpose, payload.EncryptionKeyId);
            try
            {
                using var aes = new AesGcm(key, TagLengthBytes);
                aes.Decrypt(payload.Nonce, payload.Ciphertext, payload.Tag, plaintext, associatedData);
                return plaintext;
            }
            catch (CryptographicException)
            {
                CryptographicOperations.ZeroMemory(plaintext);
                throw new CryptographicException("The recovery payload is invalid or could not be authenticated.");
            }
            finally
            {
                CryptographicOperations.ZeroMemory(associatedData);
            }
        }
        finally
        {
            CryptographicOperations.ZeroMemory(key);
        }
    }

    private static void ValidateContext(Guid workId, RecoveryPayloadPurpose purpose)
    {
        if (workId == Guid.Empty || purpose is not (RecoveryPayloadPurpose.Request or RecoveryPayloadPurpose.Delivery))
        {
            throw new CryptographicException("The recovery payload context is invalid.");
        }
    }

    private static bool IsValidPayloadKeyId(string? keyId) =>
        !string.IsNullOrWhiteSpace(keyId)
        && keyId.Length <= 128
        && !keyId.Any(char.IsControl);

    private static void ValidateKey(byte[]? key)
    {
        if (key is null || key.Length != KeyLengthBytes)
        {
            if (key is not null)
            {
                CryptographicOperations.ZeroMemory(key);
            }

            throw new CryptographicException("The recovery encryption key is invalid.");
        }
    }

    private static byte[] CreateAssociatedData(
        Guid workId,
        RecoveryPayloadPurpose purpose,
        string keyId)
    {
        var purposeName = purpose switch
        {
            RecoveryPayloadPurpose.Request => "request",
            RecoveryPayloadPurpose.Delivery => "delivery",
            _ => throw new CryptographicException("The recovery payload context is invalid.")
        };
        return Encoding.UTF8.GetBytes($"{FormatVersion}|{workId:N}|{purposeName}|{keyId}");
    }
}