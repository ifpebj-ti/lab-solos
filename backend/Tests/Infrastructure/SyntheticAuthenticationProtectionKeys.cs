using System.Security.Cryptography;
using System.Text;

namespace Tests.Infrastructure;

public sealed record SyntheticAuthenticationProtectionKeys(
    byte[] ThrottleHmacKey,
    byte[] RecoveryEncryptionKey)
{
    private static readonly byte[] TestOnlyDerivationKey =
        Encoding.UTF8.GetBytes("T001 synthetic key derivation; test-only; never deploy");

    public static SyntheticAuthenticationProtectionKeys Create(string scenarioKey)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(scenarioKey);

        var normalized = scenarioKey.Trim();
        return new(
            Derive("throttle", normalized),
            Derive("recovery", normalized));
    }

    private static byte[] Derive(string purpose, string scenarioKey) =>
        HMACSHA256.HashData(TestOnlyDerivationKey, Encoding.UTF8.GetBytes($"{purpose}|{scenarioKey}"));
}
