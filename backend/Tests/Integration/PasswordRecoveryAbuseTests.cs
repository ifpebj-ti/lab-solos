using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSql15IntegrationGroup.Name)]
public sealed class PasswordRecoveryAbuseTests(PostgreSql15ContainerFixture database)
{
    private const int UserId = 781_001;
    private const string Email = "recovery-abuse@example.invalid";
    private const string Password = "Synthetic recovery account password! 2026";
    private static readonly DateTimeOffset InitialTime = DateTimeOffset.UtcNow.AddDays(1);

    [Fact]
    public async Task RepeatedAliasesWithinCooldownCoalesceWithoutSendingDuringRequest()
    {
        var emailService = new SimulatedEmailService();
        var clock = new ControlledTimeProvider(InitialTime);
        await using var factory = CreateFactory(clock, emailService);
        await factory.RecreateDatabaseAsync();
        await SeedEnabledUserAsync(factory);

        using var client = factory.CreateClient();
        var first = await RequestAsync(client, "/api/Email/request-password-reset", Email);
        var blockedAlias = await RequestAsync(client, "/api/Email/solicitar-redefinicao", Email.ToUpperInvariant());
        Assert.Equal(first, blockedAlias);

        clock.Advance(TimeSpan.FromSeconds(60));
        var coalescedAlias = await RequestAsync(client, "/api/Email/solicitar-redefinicao", Email);
        Assert.Equal(first, coalescedAlias);
        Assert.Equal(0, emailService.SentCount);

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(1, await context.PasswordRecoveryJobs.CountAsync(
            job => job.Status == PasswordRecoveryJobStatus.Pending));
        var recipientBucket = await context.AuthenticationThrottleBuckets.AsNoTracking()
            .SingleAsync(bucket => bucket.Scope == AuthenticationProtectionCapacity.RecoveryRequestRecipient);
        var ipBucket = await context.AuthenticationThrottleBuckets.AsNoTracking()
            .SingleAsync(bucket => bucket.Scope == AuthenticationProtectionCapacity.RecoveryRequestIp);
        Assert.Equal(2, recipientBucket.Count);
        Assert.Equal(2, ipBucket.Count);
        var user = await context.Usuarios.AsNoTracking().SingleAsync(value => value.Id == UserId);
        Assert.Null(user.TokenRedefinicaoHash);
        Assert.Null(user.TokenExpiracao);
        var job = await context.PasswordRecoveryJobs.AsNoTracking().SingleAsync();
        Assert.DoesNotContain(Email, Encoding.UTF8.GetString(job.PayloadCiphertext), StringComparison.OrdinalIgnoreCase);
        var plaintext = new RecoveryPayloadProtector(
                new TestRecoveryEncryptionKeyProvider(
                    SyntheticAuthenticationProtectionKeys.Create("password-recovery-abuse").RecoveryEncryptionKey))
            .Unprotect(job.Id, RecoveryPayloadPurpose.Request, new ProtectedRecoveryPayload(
                job.EncryptionKeyId,
                job.PayloadCiphertext,
                job.PayloadNonce,
                job.PayloadTag));
        try
        {
            var payload = JsonSerializer.Deserialize<PasswordRecoveryRequestPayload>(plaintext);
            Assert.Equal(Email, payload?.Email);
        }
        finally
        {
            CryptographicOperations.ZeroMemory(plaintext);
        }
    }

    [Fact]
    public async Task RecipientQuotaCountsOnlyAdmissionsAndRenewsWithoutSlidingOnDenials()
    {
        var clock = new ControlledTimeProvider(InitialTime);
        var emailService = new SimulatedEmailService();
        await using var factory = CreateFactory(clock, emailService, recipientRequests: 3);
        await factory.RecreateDatabaseAsync();
        using var client = factory.CreateClient();

        var first = await RequestAsync(client, "/api/Email/request-password-reset", "quota@example.invalid");
        clock.Advance(TimeSpan.FromSeconds(60));
        Assert.Equal(first, await RequestAsync(client, "/api/Email/solicitar-redefinicao", "quota@example.invalid"));
        clock.Advance(TimeSpan.FromSeconds(60));
        Assert.Equal(first, await RequestAsync(client, "/api/Email/request-password-reset", "quota@example.invalid"));
        clock.Advance(TimeSpan.FromSeconds(60));
        Assert.Equal(first, await RequestAsync(client, "/api/Email/solicitar-redefinicao", "quota@example.invalid"));

        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var recipientBucket = await context.AuthenticationThrottleBuckets.AsNoTracking()
                .SingleAsync(bucket => bucket.Scope == AuthenticationProtectionCapacity.RecoveryRequestRecipient);
            var ipBucketBeforeRenewal = await context.AuthenticationThrottleBuckets.AsNoTracking()
                .SingleAsync(bucket => bucket.Scope == AuthenticationProtectionCapacity.RecoveryRequestIp);
            Assert.Equal(3, recipientBucket.Count);
            Assert.Equal(3, ipBucketBeforeRenewal.Count);
            AssertTimestampMatches(InitialTime.AddHours(1), recipientBucket.WindowEndsAt);
        }

        clock.SetUtcNow(InitialTime.AddHours(1));
        Assert.Equal(first, await RequestAsync(client, "/api/Email/request-password-reset", "quota@example.invalid"));

        await using var verification = factory.Services.CreateAsyncScope();
        var verifiedContext = verification.ServiceProvider.GetRequiredService<AppDbContext>();
        var renewedBucket = await verifiedContext.AuthenticationThrottleBuckets.AsNoTracking()
            .SingleAsync(bucket => bucket.Scope == AuthenticationProtectionCapacity.RecoveryRequestRecipient);
        var ipBucket = await verifiedContext.AuthenticationThrottleBuckets.AsNoTracking()
            .SingleAsync(bucket => bucket.Scope == AuthenticationProtectionCapacity.RecoveryRequestIp);
        Assert.Equal(1, renewedBucket.Count);
        AssertTimestampMatches(InitialTime.AddHours(1), renewedBucket.WindowStartedAt);
        Assert.Equal(1, ipBucket.Count);
        Assert.Equal(1, await verifiedContext.PasswordRecoveryJobs.CountAsync(
            job => job.Status == PasswordRecoveryJobStatus.Pending));
        Assert.Equal(0, emailService.SentCount);
    }

    [Fact]
    public async Task EnabledInactiveAndUnknownRecipientsShareNeutralIpQuota()
    {
        var clock = new ControlledTimeProvider(InitialTime);
        var emailService = new SimulatedEmailService();
        await using var factory = CreateFactory(clock, emailService, ipRequests: 20);
        await factory.RecreateDatabaseAsync();
        await SeedUserAsync(factory, UserId, Email, StatusUsuario.Habilitado);
        await SeedUserAsync(factory, UserId + 1, "inactive@example.invalid", StatusUsuario.Desabilitado);
        using var client = factory.CreateClient();

        var responses = new List<string>();
        responses.Add(await RequestAsync(client, "/api/Email/request-password-reset", Email));
        responses.Add(await RequestAsync(client, "/api/Email/solicitar-redefinicao", "inactive@example.invalid"));
        responses.Add(await RequestAsync(client, "/api/Email/request-password-reset", "unknown@example.invalid"));
        for (var index = 0; index < 17; index++)
        {
            responses.Add(await RequestAsync(
                client,
                index % 2 == 0 ? "/api/Email/request-password-reset" : "/api/Email/solicitar-redefinicao",
                $"unknown-{index}@example.invalid"));
        }

        Assert.All(responses, response => Assert.Equal(responses[0], response));
        Assert.Equal(responses[0], await RequestAsync(client, "/api/Email/solicitar-redefinicao", "last@example.invalid"));

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var ipBucket = await context.AuthenticationThrottleBuckets.AsNoTracking()
            .SingleAsync(bucket => bucket.Scope == AuthenticationProtectionCapacity.RecoveryRequestIp);
        var enabledUser = await context.Usuarios.AsNoTracking().SingleAsync(user => user.Id == UserId);
        Assert.Equal(20, ipBucket.Count);
        Assert.Null(enabledUser.TokenRedefinicaoHash);
        Assert.Null(enabledUser.TokenExpiracao);
        Assert.Equal(20, await context.PasswordRecoveryJobs.CountAsync(
            job => job.Status == PasswordRecoveryJobStatus.Pending));
        Assert.Equal(0, emailService.SentCount);
    }

    [Fact]
    public async Task FullQueueRollsBackPublicQuotaAndCooldownWhileKeepingNeutralResponse()
    {
        var clock = new ControlledTimeProvider(InitialTime);
        var emailService = new SimulatedEmailService();
        await using var factory = CreateFactory(clock, emailService);
        await factory.RecreateDatabaseAsync();
        await FillQueueAsync(factory, clock.GetUtcNow());
        using var client = factory.CreateClient();

        _ = await RequestAsync(client, "/api/Email/request-password-reset", Email);

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var recipientBucket = await context.AuthenticationThrottleBuckets.AsNoTracking()
            .SingleAsync(bucket => bucket.Scope == AuthenticationProtectionCapacity.RecoveryRequestRecipient);
        var ipBucket = await context.AuthenticationThrottleBuckets.AsNoTracking()
            .SingleAsync(bucket => bucket.Scope == AuthenticationProtectionCapacity.RecoveryRequestIp);
        Assert.Equal(0, recipientBucket.Count);
        Assert.Null(recipientBucket.NextAllowedAt);
        Assert.Equal(0, ipBucket.Count);
        Assert.Equal(5_000, await context.PasswordRecoveryJobs.CountAsync(
            job => job.Status == PasswordRecoveryJobStatus.Pending));
        Assert.Equal(0, emailService.SentCount);
    }

    private static async Task SeedEnabledUserAsync(IntegrationWebApplicationFactory factory)
        => await SeedUserAsync(factory, UserId, Email, StatusUsuario.Habilitado);

    private static async Task SeedUserAsync(
        IntegrationWebApplicationFactory factory,
        int id,
        string email,
        StatusUsuario status)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = new Usuario
        {
            Id = id,
            NomeCompleto = "Synthetic recovery recipient",
            Email = email,
            SenhaHash = string.Empty,
            NivelUsuario = NivelUsuario.Comum,
            TipoUsuario = TipoUsuario.Comum,
            Status = status,
            ExigeTrocaSenha = false,
            VersaoSessao = 0
        };
        user.SenhaHash = new PasswordHasher<Usuario>().HashPassword(user, Password);
        context.Usuarios.Add(user);
        await context.SaveChangesAsync();
    }

    private static async Task FillQueueAsync(
        IntegrationWebApplicationFactory factory,
        DateTimeOffset now)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var recipientKey = SHA256.HashData(Encoding.UTF8.GetBytes("synthetic-full-queue-recipient"));
        var jobs = Enumerable.Range(0, 5_000).Select(index => new PasswordRecoveryJob
        {
            Id = Guid.NewGuid(),
            DeliveryKeyHash = SHA256.HashData(BitConverter.GetBytes(index)),
            RecipientKeyHash = recipientKey,
            PayloadCiphertext = [1],
            PayloadNonce = new byte[12],
            PayloadTag = new byte[16],
            EncryptionKeyId = "synthetic-test-key",
            CreatedAt = now,
            ExpiresAt = now.AddMinutes(15),
            NextAttemptAt = now,
            Status = PasswordRecoveryJobStatus.Pending,
            Attempts = 0
        }).ToArray();
        context.PasswordRecoveryJobs.AddRange(jobs);
        var capacity = await context.AuthenticationProtectionCapacities.SingleAsync(
            value => value.Scope == AuthenticationProtectionCapacity.RecoveryJobs);
        capacity.Allocated = jobs.Length;
        await context.SaveChangesAsync();
    }

    private IntegrationWebApplicationFactory CreateFactory(
        ControlledTimeProvider clock,
        SimulatedEmailService emailService,
        int recipientRequests = 3,
        int ipRequests = 20)
    {
        var keys = SyntheticAuthenticationProtectionKeys.Create("password-recovery-abuse");
        var options = new AuthenticationProtectionOptions
        {
            RecoveryRequest = new RecoveryRequestThrottleOptions
            {
                RecipientRequests = recipientRequests,
                IpRequests = ipRequests,
                WindowSeconds = 3600,
                CooldownSeconds = 60
            },
            KeyHashSecretFile = "synthetic-test-key",
            RecoveryEncryptionKeysFile = "synthetic-test-key-ring"
        };

        return new IntegrationWebApplicationFactory(database, new()
        {
            TimeProvider = clock,
            EmailService = emailService,
            ConfigureServices = services =>
            {
                services.RemoveAll<IOptions<AuthenticationProtectionOptions>>();
                services.AddSingleton<IOptions<AuthenticationProtectionOptions>>(Options.Create(options));
                services.RemoveAll<IAuthenticationThrottleClock>();
                services.AddSingleton<IAuthenticationThrottleClock>(
                    _ => new TimeProviderAuthenticationThrottleClock(clock));
                services.RemoveAll<ThrottleKeyFactory>();
                services.AddSingleton(_ => new ThrottleKeyFactory(keys.ThrottleHmacKey, "IntegrationTesting"));
                services.RemoveAll<IRecoveryEncryptionKeyProvider>();
                services.AddSingleton<IRecoveryEncryptionKeyProvider>(
                    new TestRecoveryEncryptionKeyProvider(keys.RecoveryEncryptionKey));
            }
        });
    }

    private static async Task<string> RequestAsync(HttpClient client, string route, string email)
    {
        using var response = await client.PostAsJsonAsync(route, new { email });
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Assert.True(response.Headers.CacheControl?.NoStore);
        return await response.Content.ReadAsStringAsync();
    }

    private static void AssertTimestampMatches(DateTimeOffset expected, DateTimeOffset actual) =>
        Assert.InRange(actual, expected.AddTicks(-10), expected.AddTicks(10));

    private sealed class TestRecoveryEncryptionKeyProvider(byte[] key) : IRecoveryEncryptionKeyProvider
    {
        private readonly byte[] _key = key.ToArray();

        public string ActiveKeyId => "test-recovery-key";

        public byte[] CopyKey(string keyId)
        {
            if (!string.Equals(keyId, ActiveKeyId, StringComparison.Ordinal))
            {
                throw new CryptographicException("The synthetic key is unavailable.");
            }

            return _key.ToArray();
        }
    }
}
