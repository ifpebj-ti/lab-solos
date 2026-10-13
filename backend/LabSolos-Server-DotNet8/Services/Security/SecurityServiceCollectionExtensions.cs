using System.Security.Cryptography;
using System.Text;
using LabSolos_Server_DotNet8.BackgroundServices;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace LabSolos_Server_DotNet8.Services.Security;

public static class SecurityServiceCollectionExtensions
{
    private const string BlocklistResourceSuffix = ".Resources.Security.common-passwords.txt";

    public static IServiceCollection AddPasswordSecurity(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        var assembly = typeof(PasswordPolicy).Assembly;
        var resourceName = assembly.GetManifestResourceNames()
            .SingleOrDefault(name => name.EndsWith(BlocklistResourceSuffix, StringComparison.Ordinal));
        var blocklist = PasswordBlocklist.Load(
            resourceName is null ? null : assembly.GetManifestResourceStream(resourceName));
        var policy = new PasswordPolicy(blocklist);

        services.AddSingleton<IPasswordPolicy>(policy);
        services.AddSingleton<IPasswordHasher<Usuario>, PasswordHasher<Usuario>>();
        services.AddSingleton<ISecretFileReader, FileSecretFileReader>();
        services.AddSingleton<IValidateOptions<AuthenticationProtectionOptions>>(provider =>
        {
            var hostEnvironment = provider.GetRequiredService<IHostEnvironment>();
            return hostEnvironment.IsEnvironment("IntegrationTesting")
                ? new IntegrationTestingAuthenticationProtectionOptionsValidator()
                : new AuthenticationProtectionOptionsValidator(
                    provider.GetRequiredService<ISecretFileReader>());
        });
        services.AddOptions<AuthenticationProtectionOptions>()
            .BindConfiguration(AuthenticationProtectionOptions.SectionName).ValidateOnStart();
        services.AddSingleton<IAuthenticationThrottleClock, PostgreSqlAuthenticationThrottleClock>();
        services.AddScoped<PostgresAuthenticationThrottle>();
        services.TryAddSingleton<ThrottleKeyFactory>(CreateThrottleKeyFactory);
        services.TryAddSingleton<IRecoveryEncryptionKeyProvider>(CreateRecoveryEncryptionKeyProvider);
        services.TryAddSingleton<RecoveryPayloadProtector>();
        services.TryAddScoped<PasswordRecoveryJobRepository>();
        services.TryAddScoped<IPasswordRecoveryRequestService, PasswordRecoveryRequestService>();
        services.AddHostedService<AuthenticationProtectionStartupValidator>();
        services.AddHostedService<PasswordRecoveryDeliveryWorker>();
        services.AddHostedService<AuthenticationThrottleCleanupWorker>();
        services.AddSingleton<AuthenticationProtectionTelemetry>();
        services.AddSingleton<UserResourceAccessService>();
        services.AddScoped<UserProfileUpdateService>();
        services.AddSingleton<CredentialTelemetry>();
        services.AddScoped<CredentialService>();
        services.AddScoped<ICredentialService>(provider => provider.GetRequiredService<CredentialService>());
        services.AddScoped<IPasswordResetService>(provider => provider.GetRequiredService<CredentialService>());
        services.AddAuthorization(options =>
            options.AddPolicy(
                CredentialAuthorizationPolicies.ChangeOwnPassword,
                authorization => authorization.RequireAuthenticatedUser()));
        return services;
    }

    private static ThrottleKeyFactory CreateThrottleKeyFactory(IServiceProvider provider)
    {
        var options = provider.GetRequiredService<IOptions<AuthenticationProtectionOptions>>().Value;
        var environment = provider.GetRequiredService<IHostEnvironment>();
        var useSyntheticKey = environment.IsEnvironment("IntegrationTesting")
            && string.IsNullOrWhiteSpace(options.KeyHashSecretFile);
        var secret = useSyntheticKey
            ? SHA256.HashData(Encoding.UTF8.GetBytes(
                "LabSolos IntegrationTesting only synthetic throttle key; never deploy"))
            : provider.GetRequiredService<ISecretFileReader>().ReadAllBytes(options.KeyHashSecretFile);
        try
        {
            return new ThrottleKeyFactory(secret, environment.EnvironmentName, useSyntheticKey);
        }
        finally
        {
            CryptographicOperations.ZeroMemory(secret);
        }
    }

    private static IRecoveryEncryptionKeyProvider CreateRecoveryEncryptionKeyProvider(IServiceProvider provider)
    {
        var options = provider.GetRequiredService<IOptions<AuthenticationProtectionOptions>>().Value;
        var environment = provider.GetRequiredService<IHostEnvironment>();
        if (environment.IsEnvironment("IntegrationTesting")
            && string.IsNullOrWhiteSpace(options.RecoveryEncryptionKeysFile))
        {
            var key = SHA256.HashData(Encoding.UTF8.GetBytes(
                "LabSolos IntegrationTesting only synthetic recovery key; never deploy"));
            return new IntegrationTestingRecoveryEncryptionKeyProvider(key);
        }

        return RecoveryEncryptionKeyRing.Load(
            options.RecoveryEncryptionKeysFile,
            provider.GetRequiredService<ISecretFileReader>());
    }
}

internal sealed class IntegrationTestingRecoveryEncryptionKeyProvider : IRecoveryEncryptionKeyProvider, IDisposable
{
    private const string KeyId = "integration-only";
    private readonly byte[] _key;
    private bool _disposed;

    public IntegrationTestingRecoveryEncryptionKeyProvider(byte[] key)
    {
        ArgumentNullException.ThrowIfNull(key);
        if (key.Length != 32)
        {
            throw new ArgumentException("The synthetic recovery key must contain 32 bytes.", nameof(key));
        }

        _key = key.ToArray();
    }

    public string ActiveKeyId => KeyId;

    public byte[] CopyKey(string keyId)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        if (!string.Equals(keyId, KeyId, StringComparison.Ordinal))
        {
            throw new CryptographicException("The recovery encryption key is unavailable.");
        }

        return _key.ToArray();
    }

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        CryptographicOperations.ZeroMemory(_key);
        _disposed = true;
    }
}

internal sealed class IntegrationTestingAuthenticationProtectionOptionsValidator
    : IValidateOptions<AuthenticationProtectionOptions>
{
    private const int MaximumLoginWindowSeconds = 86_400;

    public ValidateOptionsResult Validate(string? name, AuthenticationProtectionOptions options)
    {
        if (options.Login is null
            || options.Login.AccountFailures <= 0
            || options.Login.IpFailures <= 0
            || options.Login.WindowSeconds <= 0
            || options.Login.WindowSeconds > MaximumLoginWindowSeconds)
        {
            return ValidateOptionsResult.Fail("Login throttle limits are invalid.");
        }

        return ValidateOptionsResult.Success;
    }
}

public static class CredentialAuthorizationPolicies
{
    public const string ChangeOwnPassword = "PodeAlterarPropriaSenha";
}
