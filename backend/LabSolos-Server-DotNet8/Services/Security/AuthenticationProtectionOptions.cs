using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace LabSolos_Server_DotNet8.Services.Security;

public sealed class AuthenticationProtectionOptions
{
    public const string SectionName = "AuthenticationProtection";

    public LoginThrottleOptions Login { get; set; } = new();
    public RecoveryRequestThrottleOptions RecoveryRequest { get; set; } = new();
    public RecoveryCodeThrottleOptions RecoveryCode { get; set; } = new();
    public int MaxBucketsPerScope { get; set; } = 10_000;
    public int MaxActiveRecoveryJobs { get; set; } = 5_000;
    public int CleanupIntervalSeconds { get; set; } = 30;
    public int CleanupBatchSize { get; set; } = 100;
    public int LockTimeoutSeconds { get; set; } = 2;
    public int OperationTimeoutSeconds { get; set; } = 5;
    public DeliveryOptions Delivery { get; set; } = new();
    public string KeyHashSecretFile { get; set; } = string.Empty;
    public string RecoveryEncryptionKeysFile { get; set; } = string.Empty;
    public ForwardedHeadersProtectionOptions ForwardedHeaders { get; set; } = new();
    public DevelopmentCorsOptions Cors { get; set; } = new();
}

public sealed class LoginThrottleOptions
{
    public int AccountFailures { get; set; } = 5;
    public int IpFailures { get; set; } = 30;
    public int WindowSeconds { get; set; } = 900;
}

public sealed class RecoveryRequestThrottleOptions
{
    public int RecipientRequests { get; set; } = 3;
    public int IpRequests { get; set; } = 20;
    public int WindowSeconds { get; set; } = 3600;
    public int CooldownSeconds { get; set; } = 60;
}

public sealed class RecoveryCodeThrottleOptions
{
    public int RecipientFailures { get; set; } = 5;
    public int IpFailures { get; set; } = 30;
    public int WindowSeconds { get; set; } = 900;
}

public sealed class DeliveryOptions
{
    public int MaxAttempts { get; set; } = 3;
    public int LeaseSeconds { get; set; } = 60;
    public int SendTimeoutSeconds { get; set; } = 15;
    public int RequestMaxAgeSeconds { get; set; } = 900;
    public int PollSeconds { get; set; } = 1;
}

public sealed class ForwardedHeadersProtectionOptions
{
    public List<string> KnownProxies { get; set; } = [];
    public int ForwardLimit { get; set; } = 1;
}

public sealed class DevelopmentCorsOptions
{
    public List<string> DevelopmentOrigins { get; set; } = [];
}

public interface ISecretFileReader
{
    byte[] ReadAllBytes(string path);
}

public sealed class FileSecretFileReader : ISecretFileReader
{
    public byte[] ReadAllBytes(string path) => File.ReadAllBytes(path);
}

public sealed class AuthenticationProtectionOptionsValidator : IValidateOptions<AuthenticationProtectionOptions>
{
    private const int MaximumWindowSeconds = 86_400;
    private const int MaximumBucketsPerScope = 100_000;
    private const int MaximumActiveRecoveryJobs = 10_000;
    private const int MaximumRecoveryRequestAgeSeconds = 900;
    private const int RequiredKeyLengthBytes = 32;

    private readonly ISecretFileReader _secretFileReader;

    public AuthenticationProtectionOptionsValidator(ISecretFileReader secretFileReader)
    {
        _secretFileReader = secretFileReader ?? throw new ArgumentNullException(nameof(secretFileReader));
    }

    public ValidateOptionsResult Validate(string? name, AuthenticationProtectionOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);

        var failures = new List<string>();
        ValidateLimits(options, failures);
        ValidateProxies(options.ForwardedHeaders, failures);
        ValidateCorsOrigins(options.Cors, failures);

        var hashSecretPathValid = ValidateAbsolutePath(
            options.KeyHashSecretFile,
            "KeyHashSecretFile",
            failures);
        var recoveryKeysPathValid = ValidateAbsolutePath(
            options.RecoveryEncryptionKeysFile,
            "RecoveryEncryptionKeysFile",
            failures);

        if (hashSecretPathValid)
        {
            ValidateHashSecret(options.KeyHashSecretFile, failures);
        }

        if (recoveryKeysPathValid)
        {
            ValidateRecoveryKeys(options.RecoveryEncryptionKeysFile, failures);
        }

        return failures.Count == 0
            ? ValidateOptionsResult.Success
            : ValidateOptionsResult.Fail(failures);
    }

    private static void ValidateLimits(
        AuthenticationProtectionOptions options,
        List<string> failures)
    {
        if (options.Login is null)
        {
            failures.Add("Login options must be configured.");
        }
        else
        {
            ValidatePositive(options.Login.AccountFailures, "Login.AccountFailures", failures);
            ValidatePositive(options.Login.IpFailures, "Login.IpFailures", failures);
            ValidateWindow(options.Login.WindowSeconds, "Login.WindowSeconds", failures);
        }

        if (options.RecoveryRequest is null)
        {
            failures.Add("RecoveryRequest options must be configured.");
        }
        else
        {
            ValidatePositive(options.RecoveryRequest.RecipientRequests, "RecoveryRequest.RecipientRequests", failures);
            ValidatePositive(options.RecoveryRequest.IpRequests, "RecoveryRequest.IpRequests", failures);
            ValidateWindow(options.RecoveryRequest.WindowSeconds, "RecoveryRequest.WindowSeconds", failures);
            ValidatePositive(options.RecoveryRequest.CooldownSeconds, "RecoveryRequest.CooldownSeconds", failures);
            if (options.RecoveryRequest.CooldownSeconds > options.RecoveryRequest.WindowSeconds)
            {
                failures.Add("RecoveryRequest.CooldownSeconds must not exceed RecoveryRequest.WindowSeconds.");
            }
        }

        if (options.RecoveryCode is null)
        {
            failures.Add("RecoveryCode options must be configured.");
        }
        else
        {
            ValidatePositive(options.RecoveryCode.RecipientFailures, "RecoveryCode.RecipientFailures", failures);
            ValidatePositive(options.RecoveryCode.IpFailures, "RecoveryCode.IpFailures", failures);
            ValidateWindow(options.RecoveryCode.WindowSeconds, "RecoveryCode.WindowSeconds", failures);
        }

        ValidateBoundedPositive(options.MaxBucketsPerScope, MaximumBucketsPerScope, "MaxBucketsPerScope", failures);
        ValidateBoundedPositive(options.MaxActiveRecoveryJobs, MaximumActiveRecoveryJobs, "MaxActiveRecoveryJobs", failures);
        ValidatePositive(options.CleanupIntervalSeconds, "CleanupIntervalSeconds", failures);
        ValidatePositive(options.CleanupBatchSize, "CleanupBatchSize", failures);
        ValidatePositive(options.LockTimeoutSeconds, "LockTimeoutSeconds", failures);
        ValidatePositive(options.OperationTimeoutSeconds, "OperationTimeoutSeconds", failures);
        if (options.LockTimeoutSeconds >= options.OperationTimeoutSeconds)
        {
            failures.Add("LockTimeoutSeconds must be less than OperationTimeoutSeconds.");
        }

        if (options.Delivery is null)
        {
            failures.Add("Delivery options must be configured.");
        }
        else
        {
            ValidateBoundedPositive(options.Delivery.MaxAttempts, 3, "Delivery.MaxAttempts", failures);
            ValidatePositive(options.Delivery.LeaseSeconds, "Delivery.LeaseSeconds", failures);
            ValidatePositive(options.Delivery.SendTimeoutSeconds, "Delivery.SendTimeoutSeconds", failures);
            ValidateBoundedPositive(
                options.Delivery.RequestMaxAgeSeconds,
                MaximumRecoveryRequestAgeSeconds,
                "Delivery.RequestMaxAgeSeconds",
                failures);
            ValidatePositive(options.Delivery.PollSeconds, "Delivery.PollSeconds", failures);
            if (options.Delivery.LeaseSeconds <= options.Delivery.SendTimeoutSeconds)
            {
                failures.Add("Delivery.LeaseSeconds must exceed Delivery.SendTimeoutSeconds.");
            }
        }
    }

    private static void ValidatePositive(int value, string name, List<string> failures)
    {
        if (value <= 0)
        {
            failures.Add($"{name} must be positive.");
        }
    }

    private static void ValidateWindow(int value, string name, List<string> failures) =>
        ValidateBoundedPositive(value, MaximumWindowSeconds, name, failures);

    private static void ValidateBoundedPositive(
        int value,
        int maximum,
        string name,
        List<string> failures)
    {
        if (value < 1 || value > maximum)
        {
            failures.Add(string.Create(
                CultureInfo.InvariantCulture,
                $"{name} must be between 1 and {maximum}."));
        }
    }

    private static void ValidateProxies(
        ForwardedHeadersProtectionOptions? options,
        List<string> failures)
    {
        if (options is null || options.KnownProxies is null || options.KnownProxies.Count == 0)
        {
            failures.Add("ForwardedHeaders.KnownProxies must contain at least one exact proxy IP address.");
            return;
        }

        if (options.ForwardLimit != 1)
        {
            failures.Add("ForwardedHeaders.ForwardLimit must be 1.");
        }

        foreach (var proxy in options.KnownProxies)
        {
            if (!IsExactProxyAddress(proxy))
            {
                failures.Add("ForwardedHeaders.KnownProxies entries must be exact IP addresses.");
                break;
            }
        }
    }

    private static bool IsExactProxyAddress(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)
            || !IPAddress.TryParse(value, out var address)
            || address.Equals(IPAddress.Any)
            || address.Equals(IPAddress.IPv6Any))
        {
            return false;
        }

        return string.Equals(value, address.ToString(), StringComparison.OrdinalIgnoreCase);
    }

    private static void ValidateCorsOrigins(
        DevelopmentCorsOptions? options,
        List<string> failures)
    {
        if (options?.DevelopmentOrigins is null)
        {
            failures.Add("Cors.DevelopmentOrigins must be a list of exact origins.");
            return;
        }

        foreach (var origin in options.DevelopmentOrigins)
        {
            if (!IsExactOrigin(origin))
            {
                failures.Add("Cors.DevelopmentOrigins entries must be exact HTTP or HTTPS origins without paths or credentials.");
                break;
            }
        }
    }

    private static bool IsExactOrigin(string? origin)
    {
        if (string.IsNullOrWhiteSpace(origin)
            || origin == "null"
            || origin.Contains('*')
            || !Uri.TryCreate(origin, UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
            || string.IsNullOrEmpty(uri.Host)
            || uri.UserInfo.Length != 0
            || uri.Query.Length != 0
            || uri.Fragment.Length != 0
            || uri.AbsolutePath != "/")
        {
            return false;
        }

        return string.Equals(
            origin,
            uri.GetLeftPart(UriPartial.Authority),
            StringComparison.OrdinalIgnoreCase);
    }

    private static bool ValidateAbsolutePath(
        string? path,
        string name,
        List<string> failures)
    {
        if (string.IsNullOrWhiteSpace(path) || !Path.IsPathFullyQualified(path))
        {
            failures.Add($"{name} must be an absolute secret file path.");
            return false;
        }

        return true;
    }

    private void ValidateHashSecret(string path, List<string> failures)
    {
        byte[]? contents = null;
        try
        {
            contents = _secretFileReader.ReadAllBytes(path);
            if (contents.Length < RequiredKeyLengthBytes)
            {
                failures.Add("KeyHashSecretFile must contain at least 32 bytes.");
            }
        }
        catch (Exception exception) when (IsSecretReadException(exception))
        {
            failures.Add("KeyHashSecretFile could not be read or is invalid.");
        }
        finally
        {
            if (contents is not null)
            {
                CryptographicOperations.ZeroMemory(contents);
            }
        }
    }

    private void ValidateRecoveryKeys(string path, List<string> failures)
    {
        byte[]? contents = null;
        try
        {
            contents = _secretFileReader.ReadAllBytes(path);
            if (contents.Length > 65_536)
            {
                failures.Add("RecoveryEncryptionKeysFile exceeds the supported size.");
                return;
            }

            using var document = JsonDocument.Parse(contents);
            var root = document.RootElement;
            if (root.ValueKind != JsonValueKind.Object
                || !root.TryGetProperty("activeKeyId", out var activeKeyIdElement)
                || activeKeyIdElement.ValueKind != JsonValueKind.String
                || string.IsNullOrWhiteSpace(activeKeyIdElement.GetString())
                || !root.TryGetProperty("keys", out var keysElement)
                || keysElement.ValueKind != JsonValueKind.Object)
            {
                failures.Add("RecoveryEncryptionKeysFile must contain an activeKeyId and a keys object.");
                return;
            }

            var activeKeyId = activeKeyIdElement.GetString();
            var activeKeyFound = false;
            var keyCount = 0;
            foreach (var property in keysElement.EnumerateObject())
            {
                keyCount++;
                if (string.IsNullOrWhiteSpace(property.Name)
                    || property.Name.Length > 128
                    || property.Name.Any(char.IsControl)
                    || property.Value.ValueKind != JsonValueKind.String
                    || !IsValidEncryptionKey(property.Value.GetString()))
                {
                    failures.Add("RecoveryEncryptionKeysFile contains an invalid encryption key.");
                    return;
                }

                activeKeyFound |= string.Equals(property.Name, activeKeyId, StringComparison.Ordinal);
            }

            if (keyCount == 0 || !activeKeyFound)
            {
                failures.Add("RecoveryEncryptionKeysFile activeKeyId must name a configured key.");
            }
        }
        catch (Exception exception) when (IsSecretReadException(exception) || exception is JsonException)
        {
            failures.Add("RecoveryEncryptionKeysFile could not be read or is invalid.");
        }
        finally
        {
            if (contents is not null)
            {
                CryptographicOperations.ZeroMemory(contents);
            }
        }
    }

    private static bool IsValidEncryptionKey(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        try
        {
            var decoded = Convert.FromBase64String(value);
            try
            {
                return decoded.Length == RequiredKeyLengthBytes;
            }
            finally
            {
                CryptographicOperations.ZeroMemory(decoded);
            }
        }
        catch (FormatException)
        {
            return false;
        }
    }

    private static bool IsSecretReadException(Exception exception) =>
        exception is IOException
            or UnauthorizedAccessException
            or ArgumentException
            or NotSupportedException
            or System.Security.SecurityException;
}
