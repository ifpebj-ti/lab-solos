using System.Security.Cryptography;
using System.Text;
using LabSolos_Server_DotNet8.Services.Security;

namespace Tests.Security;

public sealed class RecoveryPayloadProtectorTests
{
    private static readonly byte[] CurrentKey = Enumerable.Range(1, 32).Select(value => (byte)value).ToArray();
    private static readonly byte[] PreviousKey = Enumerable.Range(33, 32).Select(value => (byte)value).ToArray();
    private const string CurrentKeyId = "recovery-2026-02";
    private const string PreviousKeyId = "recovery-2026-01";
    private static readonly string SecretFilePath = Path.Combine(Path.GetTempPath(), "secrets", "recovery-keys.json");

    [Fact]
    public void ProtectsPayloadWithActiveKeyAndAuthenticatesRecoveryContext()
    {
        using var keyRing = KeyRing(CurrentKeyId, (CurrentKeyId, CurrentKey));
        var protector = new RecoveryPayloadProtector(keyRing);
        var workId = Guid.Parse("a6b3b55c-1eba-4ef8-bfa1-8fa17541d22d");
        var plaintext = Encoding.UTF8.GetBytes("synthetic@example.test|123456");

        var protectedPayload = protector.Protect(workId, RecoveryPayloadPurpose.Delivery, plaintext);

        Assert.Equal(CurrentKeyId, protectedPayload.EncryptionKeyId);
        Assert.Equal(12, protectedPayload.Nonce.Length);
        Assert.Equal(16, protectedPayload.Tag.Length);
        Assert.NotEqual(plaintext, protectedPayload.Ciphertext);
        Assert.DoesNotContain(Encoding.UTF8.GetString(plaintext), Encoding.UTF8.GetString(protectedPayload.Ciphertext));
        Assert.Equal(plaintext, protector.Unprotect(workId, RecoveryPayloadPurpose.Delivery, protectedPayload));
    }

    [Fact]
    public void UsesANewNonceForEveryProtection()
    {
        using var keyRing = KeyRing(CurrentKeyId, (CurrentKeyId, CurrentKey));
        var protector = new RecoveryPayloadProtector(keyRing);
        var plaintext = Encoding.UTF8.GetBytes("synthetic payload");
        var workId = Guid.NewGuid();

        var first = protector.Protect(workId, RecoveryPayloadPurpose.Request, plaintext);
        var second = protector.Protect(workId, RecoveryPayloadPurpose.Request, plaintext);

        Assert.NotEqual(first.Nonce, second.Nonce);
        Assert.NotEqual(first.Ciphertext, second.Ciphertext);
    }

    [Theory]
    [InlineData("ciphertext")]
    [InlineData("nonce")]
    [InlineData("tag")]
    public void RejectsCiphertextNonceAndTagTampering(string field)
    {
        using var keyRing = KeyRing(CurrentKeyId, (CurrentKeyId, CurrentKey));
        var protector = new RecoveryPayloadProtector(keyRing);
        var workId = Guid.NewGuid();
        var plaintext = Encoding.UTF8.GetBytes("synthetic@example.test|908172");
        var protectedPayload = protector.Protect(workId, RecoveryPayloadPurpose.Delivery, plaintext);
        var tampered = Tamper(protectedPayload, field);

        var error = Assert.Throws<CryptographicException>(
            () => protector.Unprotect(workId, RecoveryPayloadPurpose.Delivery, tampered));

        Assert.DoesNotContain(Encoding.UTF8.GetString(plaintext), error.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void RejectsAChangedJobIdOrPurpose()
    {
        using var keyRing = KeyRing(CurrentKeyId, (CurrentKeyId, CurrentKey));
        var protector = new RecoveryPayloadProtector(keyRing);
        var workId = Guid.NewGuid();
        var payload = protector.Protect(workId, RecoveryPayloadPurpose.Delivery, Encoding.UTF8.GetBytes("synthetic"));

        Assert.Throws<CryptographicException>(
            () => protector.Unprotect(Guid.NewGuid(), RecoveryPayloadPurpose.Delivery, payload));
        Assert.Throws<CryptographicException>(
            () => protector.Unprotect(workId, RecoveryPayloadPurpose.Request, payload));
    }

    [Fact]
    public void RejectsAnUnknownEncryptionKeyIdWithoutReturningPlaintext()
    {
        using var keyRing = KeyRing(CurrentKeyId, (CurrentKeyId, CurrentKey));
        var protector = new RecoveryPayloadProtector(keyRing);
        var workId = Guid.NewGuid();
        var plaintext = Encoding.UTF8.GetBytes("synthetic@example.test|246810");
        var payload = protector.Protect(workId, RecoveryPayloadPurpose.Delivery, plaintext);
        var tampered = payload with { EncryptionKeyId = "missing-key" };

        var error = Assert.Throws<CryptographicException>(
            () => protector.Unprotect(workId, RecoveryPayloadPurpose.Delivery, tampered));

        Assert.DoesNotContain(Encoding.UTF8.GetString(plaintext), error.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void RejectsTamperedKeyIdEvenWhenBothIdsReferToTheSameKeyMaterial()
    {
        const string aliasKeyId = "same-material-alias";
        using var keyRing = KeyRing(
            CurrentKeyId,
            (CurrentKeyId, CurrentKey),
            (aliasKeyId, CurrentKey));
        var protector = new RecoveryPayloadProtector(keyRing);
        var workId = Guid.NewGuid();
        var payload = protector.Protect(workId, RecoveryPayloadPurpose.Delivery, Encoding.UTF8.GetBytes("synthetic"));

        Assert.Throws<CryptographicException>(
            () => protector.Unprotect(
                workId,
                RecoveryPayloadPurpose.Delivery,
                payload with { EncryptionKeyId = aliasKeyId }));
    }

    [Fact]
    public void ReadsPayloadEncryptedWithAKeyRetainedAfterRotation()
    {
        var workId = Guid.NewGuid();
        var plaintext = Encoding.UTF8.GetBytes("synthetic payload");
        ProtectedRecoveryPayload payload;
        using (var oldKeyRing = KeyRing(PreviousKeyId, (PreviousKeyId, PreviousKey)))
        {
            var oldProtector = new RecoveryPayloadProtector(oldKeyRing);
            payload = oldProtector.Protect(workId, RecoveryPayloadPurpose.Delivery, plaintext);
        }

        using var rotatedKeyRing = KeyRing(
            CurrentKeyId,
            (CurrentKeyId, CurrentKey),
            (PreviousKeyId, PreviousKey));
        var rotatedProtector = new RecoveryPayloadProtector(rotatedKeyRing);

        Assert.Equal(PreviousKeyId, payload.EncryptionKeyId);
        Assert.Equal(plaintext, rotatedProtector.Unprotect(workId, RecoveryPayloadPurpose.Delivery, payload));
    }

    [Fact]
    public void FailsClosedWhenThePayloadKeyIsMissingAfterRotation()
    {
        var workId = Guid.NewGuid();
        ProtectedRecoveryPayload payload;
        using (var oldKeyRing = KeyRing(PreviousKeyId, (PreviousKeyId, PreviousKey)))
        {
            var oldProtector = new RecoveryPayloadProtector(oldKeyRing);
            payload = oldProtector.Protect(workId, RecoveryPayloadPurpose.Delivery, Encoding.UTF8.GetBytes("synthetic"));
        }

        using var currentKeyRing = KeyRing(CurrentKeyId, (CurrentKeyId, CurrentKey));
        var currentProtector = new RecoveryPayloadProtector(currentKeyRing);

        Assert.Throws<CryptographicException>(
            () => currentProtector.Unprotect(workId, RecoveryPayloadPurpose.Delivery, payload));
    }

    [Fact]
    public void LoadsTheVersionedKeyMapFromTheConfiguredSecretFileReader()
    {
        var document = KeyFile(CurrentKeyId, (CurrentKeyId, CurrentKey), (PreviousKeyId, PreviousKey));
        using var keyRing = RecoveryEncryptionKeyRing.Load(SecretFilePath, new FixedSecretFileReader(document));
        var protector = new RecoveryPayloadProtector(keyRing);

        var payload = protector.Protect(Guid.NewGuid(), RecoveryPayloadPurpose.Request, Encoding.UTF8.GetBytes("synthetic@example.test"));

        Assert.Equal(CurrentKeyId, payload.EncryptionKeyId);
    }

    [Fact]
    public void RejectsAKeyFileWhoseActiveIdIsNotPresentInTheMap()
    {
        var document = KeyFile("missing-active", (CurrentKeyId, CurrentKey));

        var error = Assert.Throws<CryptographicException>(
            () => RecoveryEncryptionKeyRing.Load(SecretFilePath, new FixedSecretFileReader(document)));

        Assert.DoesNotContain("missing-active", error.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void RejectsMalformedOrWrongSizedEncryptionKeysWithoutExposingKeyMaterial()
    {
        var invalidKeys = new[]
        {
            "not-base64",
            Convert.ToBase64String(new byte[31])
        };

        foreach (var invalidKey in invalidKeys)
        {
            var document = Encoding.UTF8.GetBytes(
                $"{{\"activeKeyId\":\"active\",\"keys\":{{\"active\":\"{invalidKey}\"}}}}");

            var error = Assert.Throws<CryptographicException>(
                () => RecoveryEncryptionKeyRing.Load(
                    SecretFilePath,
                    new FixedSecretFileReader(document)));

            Assert.DoesNotContain(invalidKey, error.Message, StringComparison.Ordinal);
        }
    }

    private static ProtectedRecoveryPayload Tamper(ProtectedRecoveryPayload payload, string field) =>
        field switch
        {
            "ciphertext" => payload with { Ciphertext = Flip(payload.Ciphertext) },
            "nonce" => payload with { Nonce = Flip(payload.Nonce) },
            "tag" => payload with { Tag = Flip(payload.Tag) },
            _ => throw new ArgumentOutOfRangeException(nameof(field))
        };

    private static byte[] Flip(byte[] source)
    {
        var copy = source.ToArray();
        copy[0] ^= 0x01;
        return copy;
    }

    private static RecoveryEncryptionKeyRing KeyRing(string activeKeyId, params (string Id, byte[] Key)[] keys) =>
        RecoveryEncryptionKeyRing.Load(
            SecretFilePath,
            new FixedSecretFileReader(KeyFile(activeKeyId, keys)));

    private static byte[] KeyFile(string activeKeyId, params (string Id, byte[] Key)[] keys)
    {
        var entries = string.Join(",", keys.Select(entry => $"\"{entry.Id}\":\"{Convert.ToBase64String(entry.Key)}\""));
        return Encoding.UTF8.GetBytes($"{{\"activeKeyId\":\"{activeKeyId}\",\"keys\":{{{entries}}}}}");
    }

    private sealed class FixedSecretFileReader(byte[] contents) : ISecretFileReader
    {
        public byte[] ReadAllBytes(string path) => contents.ToArray();
    }
}