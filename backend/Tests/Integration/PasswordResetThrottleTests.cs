using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSql15IntegrationGroup.Name)]
public sealed class PasswordResetThrottleTests(PostgreSql15ContainerFixture database)
{
    private const int UserId = 782_001;
    private const string Email = "reset-throttle@example.invalid";
    private const string ActiveToken = "existing-valid-recovery-code";
    private const string InvalidToken = "incorrect-recovery-code";
    private const string NewPassword = "Synthetic replacement password! 2026";
    private const string CurrentPassword = "Synthetic current password! 2026";
    private static readonly DateTimeOffset InitialTime = new(2026, 10, 13, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task SixthInvalidCodeAcrossAliasesIsLimitedWithoutChangingAccountOrToken()
    {
        var clock = new ControlledTimeProvider(InitialTime);
        await using var factory = CreateFactory(clock);
        await factory.RecreateDatabaseAsync();
        await SeedUserAsync(factory, clock.GetUtcNow());
        using var client = factory.CreateClient();

        for (var index = 0; index < 5; index++)
        {
            using var response = await SubmitResetAsync(client, index % 2 == 0, index % 2 == 0 ? Email : Email.ToUpperInvariant());
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        using var limited = await SubmitResetAsync(client, legacyAlias: true, email: Email);
        var body = await limited.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
        Assert.NotNull(limited.Headers.RetryAfter);
        Assert.True(limited.Headers.CacheControl?.NoStore);
        Assert.Equal("application/problem+json", limited.Content.Headers.ContentType?.MediaType);
        Assert.DoesNotContain(Email, body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(InvalidToken, body, StringComparison.Ordinal);

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await context.Usuarios.AsNoTracking().SingleAsync(value => value.Id == UserId);
        Assert.Equal(
            Microsoft.AspNetCore.Identity.PasswordVerificationResult.Success,
            new Microsoft.AspNetCore.Identity.PasswordHasher<Usuario>()
                .VerifyHashedPassword(user, user.SenhaHash, CurrentPassword));
        Assert.Equal(7, user.VersaoSessao);
        Assert.Equal(HashToken(ActiveToken), user.TokenRedefinicaoHash);
        Assert.Equal(InitialTime.AddMinutes(14).UtcDateTime, user.TokenExpiracao);

        var buckets = await context.AuthenticationThrottleBuckets.AsNoTracking().ToListAsync();
        Assert.Equal(5, Assert.Single(buckets, bucket => bucket.Scope == AuthenticationProtectionCapacity.RecoveryCodeRecipient).Count);
        Assert.Equal(5, Assert.Single(buckets, bucket => bucket.Scope == AuthenticationProtectionCapacity.RecoveryCodeIp).Count);
        Assert.DoesNotContain(buckets, bucket => bucket.Scope == AuthenticationProtectionCapacity.LoginAccount);
        Assert.DoesNotContain(buckets, bucket => bucket.Scope == AuthenticationProtectionCapacity.LoginIp);

        using var login = await client.PostAsJsonAsync("/api/Auth/login", new
        {
            email = Email,
            password = CurrentPassword
        });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
    }

    [Fact]
    public async Task ThirtyFirstLegacyTokenOnlyFailureIsLimitedByIp()
    {
        var clock = new ControlledTimeProvider(InitialTime);
        await using var factory = CreateFactory(clock);
        await factory.RecreateDatabaseAsync();
        await SeedUserAsync(factory, clock.GetUtcNow());
        using var client = factory.CreateClient();

        for (var index = 0; index < 30; index++)
        {
            using var response = await SubmitLegacyResetAsync(
                client,
                email: null,
                token: $"unknown-code-{index}",
                newPassword: NewPassword,
                confirmation: NewPassword);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        using var limited = await SubmitLegacyResetAsync(
            client,
            email: null,
            token: "thirty-first-unknown-code",
            newPassword: NewPassword,
            confirmation: NewPassword);

        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
        Assert.NotNull(limited.Headers.RetryAfter);
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var buckets = await context.AuthenticationThrottleBuckets.AsNoTracking().ToListAsync();
        Assert.Equal(30, Assert.Single(buckets, bucket => bucket.Scope == AuthenticationProtectionCapacity.RecoveryCodeIp).Count);
        Assert.DoesNotContain(buckets, bucket => bucket.Scope == AuthenticationProtectionCapacity.RecoveryCodeRecipient);
        Assert.DoesNotContain(buckets, bucket => bucket.Scope == AuthenticationProtectionCapacity.LoginAccount);
        Assert.DoesNotContain(buckets, bucket => bucket.Scope == AuthenticationProtectionCapacity.LoginIp);
    }

    [Fact]
    public async Task LegacyAliasWithoutEmailStillUsesResolvedRecipientQuota()
    {
        var clock = new ControlledTimeProvider(InitialTime);
        await using var factory = CreateFactory(clock);
        await factory.RecreateDatabaseAsync();
        await SeedUserAsync(factory, clock.GetUtcNow());
        using var client = factory.CreateClient();

        for (var index = 0; index < 5; index++)
        {
            using var response = await SubmitLegacyResetAsync(
                client,
                email: null,
                token: ActiveToken,
                newPassword: NewPassword,
                confirmation: "different confirmation");
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        using var limited = await SubmitLegacyResetAsync(
            client,
            email: null,
            token: ActiveToken,
            newPassword: NewPassword,
            confirmation: NewPassword);

        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await context.Usuarios.AsNoTracking().SingleAsync(value => value.Id == UserId);
        Assert.Equal(HashToken(ActiveToken), user.TokenRedefinicaoHash);
        Assert.Equal("Synthetic recovery test account", user.NomeCompleto);
        Assert.Equal(7, user.VersaoSessao);
        var buckets = await context.AuthenticationThrottleBuckets.AsNoTracking().ToListAsync();
        Assert.Equal(5, Assert.Single(buckets, bucket => bucket.Scope == AuthenticationProtectionCapacity.RecoveryCodeRecipient).Count);
        Assert.Equal(5, Assert.Single(buckets, bucket => bucket.Scope == AuthenticationProtectionCapacity.RecoveryCodeIp).Count);
    }

    private IntegrationWebApplicationFactory CreateFactory(ControlledTimeProvider clock)
    {
        var keys = SyntheticAuthenticationProtectionKeys.Create("password-reset-throttle");
        var options = new AuthenticationProtectionOptions
        {
            Login = new LoginThrottleOptions
            {
                AccountFailures = 5,
                IpFailures = 30,
                WindowSeconds = 900
            },
            RecoveryCode = new RecoveryCodeThrottleOptions
            {
                RecipientFailures = 5,
                IpFailures = 30,
                WindowSeconds = 900
            },
            KeyHashSecretFile = "/synthetic/authentication-key-hash.secret",
            RecoveryEncryptionKeysFile = "synthetic-test-key-ring"
        };

        return new IntegrationWebApplicationFactory(database, new()
        {
            TimeProvider = clock,
            ConfigureServices = services =>
            {
                services.RemoveAll<IOptions<AuthenticationProtectionOptions>>();
                services.AddSingleton<IOptions<AuthenticationProtectionOptions>>(Options.Create(options));
                services.RemoveAll<IAuthenticationThrottleClock>();
                services.AddSingleton<IAuthenticationThrottleClock>(
                    _ => new TimeProviderAuthenticationThrottleClock(clock));
                services.RemoveAll<ThrottleKeyFactory>();
                services.AddSingleton(_ => new ThrottleKeyFactory(keys.ThrottleHmacKey, "IntegrationTesting"));
                services.RemoveAll<ISecretFileReader>();
                services.AddSingleton<ISecretFileReader>(new SyntheticSecretFileReader());
                services.RemoveAll<IRecoveryEncryptionKeyProvider>();
                services.AddSingleton<IRecoveryEncryptionKeyProvider>(
                    new TestRecoveryEncryptionKeyProvider(keys.RecoveryEncryptionKey));
            }
        });
    }

    private static async Task SeedUserAsync(IntegrationWebApplicationFactory factory, DateTimeOffset now)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = new Usuario
        {
            Id = UserId,
            NomeCompleto = "Synthetic recovery test account",
            Email = Email,
            SenhaHash = string.Empty,
            NivelUsuario = NivelUsuario.Comum,
            TipoUsuario = TipoUsuario.Comum,
            Status = StatusUsuario.Habilitado,
            ExigeTrocaSenha = false,
            VersaoSessao = 7,
            TokenRedefinicaoHash = HashToken(ActiveToken),
            TokenExpiracao = now.AddMinutes(14).UtcDateTime
        };
        user.SenhaHash = new Microsoft.AspNetCore.Identity.PasswordHasher<Usuario>()
            .HashPassword(user, CurrentPassword);
        context.Usuarios.Add(user);
        await context.SaveChangesAsync();
    }

    private static Task<HttpResponseMessage> SubmitResetAsync(HttpClient client, bool legacyAlias, string? email) =>
        legacyAlias
            ? SubmitLegacyResetAsync(client, email, InvalidToken, NewPassword, NewPassword)
            : client.PostAsJsonAsync("/api/Email/reset-password", new
            {
                email,
                code = InvalidToken,
                newPassword = NewPassword,
                confirmation = NewPassword
            });

    private static Task<HttpResponseMessage> SubmitLegacyResetAsync(
        HttpClient client,
        string? email,
        string token,
        string newPassword,
        string? confirmation) =>
        client.PostAsJsonAsync("/api/Email/redefinir-senha", new
        {
            email,
            token,
            novaSenha = newPassword,
            confirmacao = confirmation
        });

    private static string HashToken(string token) =>
        Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    private sealed class TestRecoveryEncryptionKeyProvider(byte[] key) : IRecoveryEncryptionKeyProvider
    {
        private readonly byte[] _key = key.ToArray();

        public string ActiveKeyId => "test-recovery-key";

        public byte[] CopyKey(string keyId)
        {
            if (!string.Equals(keyId, ActiveKeyId, StringComparison.Ordinal))
            {
                throw new CryptographicException("The recovery encryption key is unavailable.");
            }

            return _key.ToArray();
        }
    }

    private sealed class SyntheticSecretFileReader : ISecretFileReader
    {
        private static readonly byte[] Secret = Enumerable.Range(0, 32)
            .Select(value => (byte)value)
            .ToArray();

        public byte[] ReadAllBytes(string path) => Secret.ToArray();
    }
}
