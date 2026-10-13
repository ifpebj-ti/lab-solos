using System.Text;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.Extensions.Options;

namespace Tests.Security;

public sealed class AuthenticationProtectionOptionsTests
{
    private static readonly string HashSecretPath = Path.Combine(Path.GetTempPath(), "authentication-key-hash");
    private static readonly string EncryptionKeysPath = Path.Combine(Path.GetTempPath(), "recovery-keys.json");

    [Fact]
    public void DefaultsMatchApprovedInitialLimits()
    {
        var options = new AuthenticationProtectionOptions();

        Assert.Equal(5, options.Login.AccountFailures);
        Assert.Equal(30, options.Login.IpFailures);
        Assert.Equal(900, options.Login.WindowSeconds);
        Assert.Equal(3, options.RecoveryRequest.RecipientRequests);
        Assert.Equal(20, options.RecoveryRequest.IpRequests);
        Assert.Equal(3600, options.RecoveryRequest.WindowSeconds);
        Assert.Equal(60, options.RecoveryRequest.CooldownSeconds);
        Assert.Equal(5, options.RecoveryCode.RecipientFailures);
        Assert.Equal(30, options.RecoveryCode.IpFailures);
        Assert.Equal(900, options.RecoveryCode.WindowSeconds);
        Assert.Equal(10_000, options.MaxBucketsPerScope);
        Assert.Equal(5_000, options.MaxActiveRecoveryJobs);
        Assert.Equal(30, options.CleanupIntervalSeconds);
        Assert.Equal(100, options.CleanupBatchSize);
        Assert.Equal(2, options.LockTimeoutSeconds);
        Assert.Equal(5, options.OperationTimeoutSeconds);
        Assert.Equal(3, options.Delivery.MaxAttempts);
        Assert.Equal(60, options.Delivery.LeaseSeconds);
        Assert.Equal(15, options.Delivery.SendTimeoutSeconds);
        Assert.Equal(900, options.Delivery.RequestMaxAgeSeconds);
        Assert.Equal(1, options.Delivery.PollSeconds);
        Assert.Equal(1, options.ForwardedHeaders.ForwardLimit);
    }

    [Fact]
    public void ValidateAcceptsValidConfigurationAndSecretFiles()
    {
        var options = ValidOptions();
        options.Cors.DevelopmentOrigins = ["http://localhost:5173", "https://app.example.invalid"];

        var result = Validate(options, ValidFiles());

        Assert.True(result.Succeeded, string.Join(" ", result.Failures ?? Array.Empty<string>()));
    }

    [Fact]
    public void ValidateRejectsLimitsOutsideDocumentedBounds()
    {
        var options = ValidOptions();
        options.Login.AccountFailures = 0;
        options.MaxBucketsPerScope = 100_001;
        options.Delivery.MaxAttempts = 4;

        var result = Validate(options, ValidFiles());

        Assert.False(result.Succeeded);
        var failures = result.Failures ?? Array.Empty<string>();
        Assert.Contains(failures, message => message.Contains("Login", StringComparison.Ordinal));
        Assert.Contains(failures, message => message.Contains("MaxBucketsPerScope", StringComparison.Ordinal));
        Assert.Contains(failures, message => message.Contains("Delivery", StringComparison.Ordinal));
    }

    [Fact]
    public void ValidateRejectsInvalidSecretFilesWithoutEchoingSecrets()
    {
        const string privateValue = "secret-value-that-must-not-appear-in-errors";
        var files = ValidFiles();
        files.Set(HashSecretPath, Encoding.UTF8.GetBytes(privateValue));
        files.Set(EncryptionKeysPath, Encoding.UTF8.GetBytes("{\"activeKeyId\":\"missing\",\"keys\":{\"old\":\"not-base64\"}}"));

        var result = Validate(ValidOptions(), files);

        Assert.False(result.Succeeded);
        var publicErrors = string.Join(" ", result.Failures ?? Array.Empty<string>());
        Assert.DoesNotContain(privateValue, publicErrors, StringComparison.Ordinal);
        Assert.DoesNotContain("not-base64", publicErrors, StringComparison.Ordinal);
        Assert.Contains(result.Failures ?? Array.Empty<string>(), message => message.Contains("RecoveryEncryptionKeysFile", StringComparison.Ordinal));
    }

    [Fact]
    public void ValidateRejectsHashSecretsShorterThanThirtyTwoBytes()
    {
        var files = ValidFiles();
        files.Set(HashSecretPath, new byte[31]);

        var result = Validate(ValidOptions(), files);

        Assert.False(result.Succeeded);
        Assert.Contains(result.Failures ?? Array.Empty<string>(), message => message.Contains("KeyHashSecretFile", StringComparison.Ordinal));
    }

    [Fact]
    public void ValidateRejectsNonAbsoluteSecretPathsAndUntrustedProxyConfiguration()
    {
        var options = ValidOptions();
        options.KeyHashSecretFile = "relative-key-file";
        options.ForwardedHeaders.KnownProxies = ["0.0.0.0/0"];

        var result = Validate(options, ValidFiles());

        Assert.False(result.Succeeded);
        var failures = result.Failures ?? Array.Empty<string>();
        Assert.Contains(failures, message => message.Contains("KeyHashSecretFile", StringComparison.Ordinal));
        Assert.Contains(failures, message => message.Contains("KnownProxies", StringComparison.Ordinal));
    }

    [Fact]
    public void ValidateRejectsWildcardNullAndNonOriginCorsEntries()
    {
        var options = ValidOptions();
        options.Cors.DevelopmentOrigins = ["*", "null", "https://client.example.invalid/path"];

        var result = Validate(options, ValidFiles());

        Assert.False(result.Succeeded);
        Assert.Contains(result.Failures ?? Array.Empty<string>(), message => message.Contains("DevelopmentOrigins", StringComparison.Ordinal));
    }

    private static AuthenticationProtectionOptions ValidOptions() => new()
    {
        KeyHashSecretFile = HashSecretPath,
        RecoveryEncryptionKeysFile = EncryptionKeysPath,
        ForwardedHeaders = { KnownProxies = ["127.0.0.1"] }
    };

    private static AuthenticationProtectionOptionsValidator Validator(ISecretFileReader files) => new(files);

    private static ValidateOptionsResult Validate(AuthenticationProtectionOptions options, ISecretFileReader files) =>
        Validator(files).Validate(Options.DefaultName, options);

    private static FakeSecretFileReader ValidFiles()
    {
        var files = new FakeSecretFileReader();
        files.Set(HashSecretPath, Enumerable.Range(0, 32).Select(value => (byte)value).ToArray());
        files.Set(
            EncryptionKeysPath,
            Encoding.UTF8.GetBytes("{\"activeKeyId\":\"key-1\",\"keys\":{\"key-1\":\"" + Convert.ToBase64String(new byte[32]) + "\"}}"));
        return files;
    }

    private sealed class FakeSecretFileReader : ISecretFileReader
    {
        private readonly Dictionary<string, byte[]> _files = new(StringComparer.Ordinal);

        public byte[] ReadAllBytes(string path) =>
            _files.TryGetValue(path, out var value)
                ? value.ToArray()
                : throw new FileNotFoundException();

        public void Set(string path, byte[] value) => _files[path] = value.ToArray();
    }
}
