using System.Net;
using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using LabSolos_Server_DotNet8.BackgroundServices;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSql15IntegrationGroup.Name)]
public sealed partial class RecoveryDeliveryWorkerTests(PostgreSql15ContainerFixture database)
{
    private const int UserId = 782_001;
    private const string Email = "recovery-worker@example.invalid";
    private const string Password = "Synthetic recovery account password! 2026";

    [Fact]
    public async Task ApplicationRegistersBackgroundRecoveryDeliveryWorker()
    {
        var clock = NewClock();
        await using var factory = CreateFactory(clock, new CapturingEmailService(), runWorker: true);
        await factory.RecreateDatabaseAsync();

        Assert.Contains(
            factory.Services.GetServices<IHostedService>(),
            service => service is PasswordRecoveryDeliveryWorker);
    }

    [Fact]
    public async Task EligibleRequestCreatesAndSendsOneStableCodeThenScrubsCompletedPayload()
    {
        var clock = NewClock();
        var emailService = new CapturingEmailService();
        await using var factory = CreateFactory(clock, emailService);
        await factory.RecreateDatabaseAsync();
        await SeedUserAsync(factory, UserId, Email, StatusUsuario.Habilitado);
        await AdmitAsync(factory, Email);

        Assert.Equal(1, await CreateWorker(factory, clock).ProcessPendingAsync());

        var body = Assert.Single(emailService.Messages).Body;
        var token = ExtractToken(body);
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await context.Usuarios.AsNoTracking().SingleAsync(value => value.Id == UserId);
        var job = await context.PasswordRecoveryJobs.AsNoTracking().SingleAsync();

        Assert.Equal(
            Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(token))),
            user.TokenRedefinicaoHash);
        Assert.InRange(
            Math.Abs((user.TokenExpiracao!.Value - clock.GetUtcNow().AddMinutes(15).UtcDateTime).TotalMilliseconds),
            0,
            1);
        Assert.Equal(PasswordRecoveryJobStatus.Completed, job.Status);
        Assert.Empty(job.PayloadCiphertext);
        Assert.Single(emailService.Messages);
        Assert.Equal(0, await CreateWorker(factory, clock).ProcessPendingAsync());
        Assert.Single(emailService.Messages);
    }

    [Fact]
    public async Task FailedDeliveryRetriesTheSameCodeAfterThirtySeconds()
    {
        var clock = NewClock();
        var emailService = new CapturingEmailService(failuresBeforeSuccess: 1);
        await using var factory = CreateFactory(clock, emailService);
        await factory.RecreateDatabaseAsync();
        await SeedUserAsync(factory, UserId, Email, StatusUsuario.Habilitado);
        await AdmitAsync(factory, Email);
        var worker = CreateWorker(factory, clock);

        Assert.Equal(1, await worker.ProcessPendingAsync());
        var firstToken = ExtractToken(Assert.Single(emailService.Messages).Body);

        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var job = await context.PasswordRecoveryJobs.AsNoTracking().SingleAsync();
            Assert.Equal(PasswordRecoveryJobStatus.Pending, job.Status);
            Assert.Equal(1, job.Attempts);
            Assert.InRange(
                Math.Abs((job.NextAttemptAt - clock.GetUtcNow().AddSeconds(30)).TotalMilliseconds),
                0,
                1);
            await context.Database.ExecuteSqlRawAsync(
                "UPDATE \"PasswordRecoveryJobs\" SET \"NextAttemptAt\" = clock_timestamp() - interval '1 second';");
        }

        clock.Advance(TimeSpan.FromSeconds(31));
        Assert.Equal(1, await worker.ProcessPendingAsync());

        Assert.Equal(2, emailService.Messages.Count);
        Assert.Equal(firstToken, ExtractToken(emailService.Messages[1].Body));
        await using var verification = factory.Services.CreateAsyncScope();
        var verifiedContext = verification.ServiceProvider.GetRequiredService<AppDbContext>();
        var completed = await verifiedContext.PasswordRecoveryJobs.AsNoTracking().SingleAsync();
        Assert.Equal(PasswordRecoveryJobStatus.Completed, completed.Status);
        Assert.Empty(completed.PayloadCiphertext);
    }

    [Fact]
    public async Task ActiveLeasePreventsAnotherWorkerFromSendingTheSameJob()
    {
        var clock = NewClock();
        var started = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var release = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var emailService = new CapturingEmailService(send: async (_, _, _, cancellationToken) =>
        {
            started.TrySetResult();
            await release.Task.WaitAsync(cancellationToken);
        });
        await using var factory = CreateFactory(clock, emailService);
        await factory.RecreateDatabaseAsync();
        await SeedUserAsync(factory, UserId, Email, StatusUsuario.Habilitado);
        await AdmitAsync(factory, Email);
        var firstWorker = CreateWorker(factory, clock);
        var secondWorker = CreateWorker(factory, clock);

        var first = firstWorker.ProcessPendingAsync();
        await started.Task.WaitAsync(TimeSpan.FromSeconds(10));
        Assert.Equal(0, await secondWorker.ProcessPendingAsync());
        release.TrySetResult();
        Assert.Equal(1, await first);

        Assert.Single(emailService.Messages);
    }

    [Fact]
    public async Task InactiveAccountConsumesVirtualEmissionWithoutSendingOrCreatingCode()
    {
        var clock = NewClock();
        var emailService = new CapturingEmailService();
        await using var factory = CreateFactory(clock, emailService);
        await factory.RecreateDatabaseAsync();
        await SeedUserAsync(factory, UserId, Email, StatusUsuario.Desabilitado);
        await AdmitAsync(factory, Email);

        Assert.Equal(1, await CreateWorker(factory, clock).ProcessPendingAsync());

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await context.Usuarios.AsNoTracking().SingleAsync(value => value.Id == UserId);
        var job = await context.PasswordRecoveryJobs.AsNoTracking().SingleAsync();
        var bucket = await context.AuthenticationThrottleBuckets.AsNoTracking().SingleAsync(
            value => value.Scope == AuthenticationProtectionCapacity.RecoveryRequestRecipient);

        Assert.Empty(emailService.Messages);
        Assert.Null(user.TokenRedefinicaoHash);
        Assert.Equal(PasswordRecoveryJobStatus.Completed, job.Status);
        Assert.NotNull(bucket.NextEmissionAt);
    }

    [Fact]
    public async Task DeliverySpacingDefersTheNextEligibleWorkWithoutConsumingSmtpAttempt()
    {
        var clock = NewClock();
        var emailService = new CapturingEmailService();
        await using var factory = CreateFactory(clock, emailService);
        await factory.RecreateDatabaseAsync();
        await SeedUserAsync(factory, UserId, Email, StatusUsuario.Habilitado);
        await SeedUserAsync(factory, UserId + 1, Email.ToUpperInvariant(), StatusUsuario.Habilitado);
        await AdmitAsync(factory, Email);
        await EnqueueCaseVariantAsync(factory, clock, Email.ToUpperInvariant());
        var worker = CreateWorker(factory, clock);

        Assert.Equal(2, await worker.ProcessPendingAsync());
        Assert.Single(emailService.Messages);

        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var pending = await context.PasswordRecoveryJobs.AsNoTracking()
                .SingleAsync(job => job.Status == PasswordRecoveryJobStatus.Pending);
            Assert.Equal(0, pending.Attempts);
            Assert.True(pending.NextAttemptAt > clock.GetUtcNow());
            var recipientBucket = await context.AuthenticationThrottleBuckets.AsNoTracking()
                .SingleAsync(bucket => bucket.Scope == AuthenticationProtectionCapacity.RecoveryRequestRecipient);
            Assert.NotNull(recipientBucket.NextEmissionAt);
            Assert.Equal(0, pending.Attempts);
        }

        Assert.Equal(0, await worker.ProcessPendingAsync());
        Assert.Single(emailService.Messages);
    }

    [Fact]
    public async Task RequestWaitingOverFifteenMinutesIsDiscardedWithoutIssuingCode()
    {
        var clock = NewClock();
        var emailService = new CapturingEmailService();
        await using var factory = CreateFactory(clock, emailService);
        await factory.RecreateDatabaseAsync();
        await SeedUserAsync(factory, UserId, Email, StatusUsuario.Habilitado);
        await AdmitAsync(factory, Email);
        clock.Advance(TimeSpan.FromMinutes(16));

        Assert.Equal(1, await CreateWorker(factory, clock).ProcessPendingAsync());

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await context.Usuarios.AsNoTracking().SingleAsync(value => value.Id == UserId);
        var job = await context.PasswordRecoveryJobs.AsNoTracking().SingleAsync();
        Assert.Empty(emailService.Messages);
        Assert.Null(user.TokenRedefinicaoHash);
        Assert.Equal(PasswordRecoveryJobStatus.Completed, job.Status);
    }

    [Fact]
    public async Task RetryIsCancelledWhenSessionVersionChangesAfterFirstFailedSend()
    {
        var clock = NewClock();
        var emailService = new CapturingEmailService(failuresBeforeSuccess: 1);
        await using var factory = CreateFactory(clock, emailService);
        await factory.RecreateDatabaseAsync();
        await SeedUserAsync(factory, UserId, Email, StatusUsuario.Habilitado);
        await AdmitAsync(factory, Email);
        var worker = CreateWorker(factory, clock);

        Assert.Equal(1, await worker.ProcessPendingAsync());
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await context.Database.ExecuteSqlInterpolatedAsync(
                $"UPDATE \"Usuarios\" SET \"VersaoSessao\" = 1 WHERE \"Id\" = {UserId};");
            await context.Database.ExecuteSqlRawAsync(
                "UPDATE \"PasswordRecoveryJobs\" SET \"NextAttemptAt\" = clock_timestamp() - interval '1 second';");
        }

        Assert.Equal(1, await worker.ProcessPendingAsync());

        Assert.Single(emailService.Messages);
        await using var verification = factory.Services.CreateAsyncScope();
        var verifiedContext = verification.ServiceProvider.GetRequiredService<AppDbContext>();
        var job = await verifiedContext.PasswordRecoveryJobs.AsNoTracking().SingleAsync();
        Assert.Equal(PasswordRecoveryJobStatus.Completed, job.Status);
        Assert.Empty(job.PayloadCiphertext);
    }

    [Fact]
    public async Task PasswordChangeCancelsPendingDeliveryAndScrubsItsPayload()
    {
        var clock = NewClock();
        var emailService = new CapturingEmailService(failuresBeforeSuccess: 1);
        await using var factory = CreateFactory(clock, emailService);
        await factory.RecreateDatabaseAsync();
        await SeedUserAsync(factory, UserId, Email, StatusUsuario.Habilitado);
        await AdmitAsync(factory, Email);
        var worker = CreateWorker(factory, clock);

        Assert.Equal(1, await worker.ProcessPendingAsync());
        Assert.Single(emailService.Messages);
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var credentialService = scope.ServiceProvider.GetRequiredService<ICredentialService>();
            var changed = await credentialService.ChangePasswordAsync(
                UserId,
                Password,
                "Synthetic changed password! 2026",
                "Synthetic changed password! 2026");
            Assert.Equal(CredentialChangeStatus.Success, changed.Status);
        }

        await using var verification = factory.Services.CreateAsyncScope();
        var context = verification.ServiceProvider.GetRequiredService<AppDbContext>();
        var job = await context.PasswordRecoveryJobs.AsNoTracking().SingleAsync();
        Assert.Equal(PasswordRecoveryJobStatus.Cancelled, job.Status);
        Assert.Empty(job.PayloadCiphertext);
        Assert.Equal(0, await worker.ProcessPendingAsync());
        Assert.Single(emailService.Messages);
    }

    [Fact]
    public async Task PermanentSmtpFailureTerminatesAndScrubsDeliveryWithoutRetry()
    {
        var clock = NewClock();
        var emailService = new CapturingEmailService(
            failuresBeforeSuccess: 1,
            failure: new FormatException("Synthetic permanent SMTP configuration failure."));
        await using var factory = CreateFactory(clock, emailService);
        await factory.RecreateDatabaseAsync();
        await SeedUserAsync(factory, UserId, Email, StatusUsuario.Habilitado);
        await AdmitAsync(factory, Email);

        Assert.Equal(1, await CreateWorker(factory, clock).ProcessPendingAsync());

        await using var verification = factory.Services.CreateAsyncScope();
        var context = verification.ServiceProvider.GetRequiredService<AppDbContext>();
        var job = await context.PasswordRecoveryJobs.AsNoTracking().SingleAsync();
        Assert.Equal(PasswordRecoveryJobStatus.Failed, job.Status);
        Assert.Equal(1, job.Attempts);
        Assert.Empty(job.PayloadCiphertext);
        Assert.Single(emailService.Messages);
    }

    [Fact]
    public async Task ThreeSmtpFailuresUseThirtyAndOneHundredTwentySecondRetriesThenScrub()
    {
        var clock = NewClock();
        var emailService = new CapturingEmailService(failuresBeforeSuccess: 3);
        await using var factory = CreateFactory(clock, emailService);
        await factory.RecreateDatabaseAsync();
        await SeedUserAsync(factory, UserId, Email, StatusUsuario.Habilitado);
        await AdmitAsync(factory, Email);
        var worker = CreateWorker(factory, clock);

        Assert.Equal(1, await worker.ProcessPendingAsync());
        var firstToken = ExtractToken(emailService.Messages[0].Body);
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var job = await context.PasswordRecoveryJobs.AsNoTracking().SingleAsync();
            Assert.Equal(1, job.Attempts);
            Assert.InRange(
                Math.Abs((job.NextAttemptAt - clock.GetUtcNow().AddSeconds(30)).TotalMilliseconds),
                0,
                1);
            await context.Database.ExecuteSqlRawAsync(
                "UPDATE \"PasswordRecoveryJobs\" SET \"NextAttemptAt\" = clock_timestamp() - interval '1 second';");
        }

        Assert.Equal(1, await worker.ProcessPendingAsync());
        Assert.Equal(firstToken, ExtractToken(emailService.Messages[1].Body));
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var job = await context.PasswordRecoveryJobs.AsNoTracking().SingleAsync();
            Assert.Equal(2, job.Attempts);
            Assert.InRange(
                Math.Abs((job.NextAttemptAt - clock.GetUtcNow().AddSeconds(120)).TotalMilliseconds),
                0,
                1);
            await context.Database.ExecuteSqlRawAsync(
                "UPDATE \"PasswordRecoveryJobs\" SET \"NextAttemptAt\" = clock_timestamp() - interval '1 second';");
        }

        Assert.Equal(1, await worker.ProcessPendingAsync());

        Assert.Equal(3, emailService.Messages.Count);
        Assert.All(emailService.Messages, message => Assert.Equal(firstToken, ExtractToken(message.Body)));
        await using var verification = factory.Services.CreateAsyncScope();
        var verifiedContext = verification.ServiceProvider.GetRequiredService<AppDbContext>();
        var completed = await verifiedContext.PasswordRecoveryJobs.AsNoTracking().SingleAsync();
        Assert.Equal(PasswordRecoveryJobStatus.Failed, completed.Status);
        Assert.Equal(3, completed.Attempts);
        Assert.Empty(completed.PayloadCiphertext);
    }

    [Fact]
    public async Task ExpiredLeaseBetweenCredentialValidationAndSmtpPreventsStaleWorkerSend()
    {
        var clock = NewClock();
        var emailService = new CapturingEmailService();
        await using var factory = CreateFactory(clock, emailService, expireLeaseBeforeValidation: true);
        await factory.RecreateDatabaseAsync();
        await SeedUserAsync(factory, UserId, Email, StatusUsuario.Habilitado);
        await AdmitAsync(factory, Email);

        Assert.Equal(1, await CreateWorker(factory, clock).ProcessPendingAsync());

        Assert.Empty(emailService.Messages);
        await using var verification = factory.Services.CreateAsyncScope();
        var context = verification.ServiceProvider.GetRequiredService<AppDbContext>();
        var job = await context.PasswordRecoveryJobs.AsNoTracking().SingleAsync();
        Assert.Equal(PasswordRecoveryJobStatus.Processing, job.Status);
        Assert.True(job.LeaseUntil < clock.GetUtcNow());
        Assert.NotEmpty(job.PayloadCiphertext);
    }

    private IntegrationWebApplicationFactory CreateFactory(
        ControlledTimeProvider clock,
        CapturingEmailService emailService,
        bool runWorker = false,
        bool expireLeaseBeforeValidation = false)
    {
        var keys = SyntheticAuthenticationProtectionKeys.Create("recovery-delivery-worker");
        var protectionOptions = new AuthenticationProtectionOptions
        {
            RecoveryRequest = new RecoveryRequestThrottleOptions
            {
                RecipientRequests = 3,
                IpRequests = 20,
                WindowSeconds = 3600,
                CooldownSeconds = 60
            },
            Delivery = new DeliveryOptions
            {
                MaxAttempts = 3,
                LeaseSeconds = 60,
                SendTimeoutSeconds = 15,
                RequestMaxAgeSeconds = 900,
                PollSeconds = 1
            },
            KeyHashSecretFile = "synthetic-test-key",
            RecoveryEncryptionKeysFile = "synthetic-test-key-ring"
        };
        IReadOnlySet<Type> backgroundServices = runWorker
            ? new HashSet<Type> { typeof(PasswordRecoveryDeliveryWorker) }
            : new HashSet<Type>();

        return new IntegrationWebApplicationFactory(database, new()
        {
            TimeProvider = clock,
            EmailService = emailService,
            BackgroundServicesToRun = backgroundServices,
            ConfigureServices = services =>
            {
                services.RemoveAll<IOptions<AuthenticationProtectionOptions>>();
                services.AddSingleton<IOptions<AuthenticationProtectionOptions>>(Options.Create(protectionOptions));
                services.RemoveAll<IAuthenticationThrottleClock>();
                services.AddSingleton<IAuthenticationThrottleClock>(
                    _ => new TimeProviderAuthenticationThrottleClock(clock));
                services.RemoveAll<ThrottleKeyFactory>();
                services.AddSingleton(_ => new ThrottleKeyFactory(keys.ThrottleHmacKey, "IntegrationTesting"));
                services.RemoveAll<IRecoveryEncryptionKeyProvider>();
                services.AddSingleton<IRecoveryEncryptionKeyProvider>(
                    new TestRecoveryEncryptionKeyProvider(keys.RecoveryEncryptionKey));
                if (expireLeaseBeforeValidation)
                {
                    services.RemoveAll<ICredentialService>();
                    services.AddScoped<CredentialService>();
                    services.AddScoped<ICredentialService>(provider => new LeaseExpiringCredentialService(
                        provider.GetRequiredService<CredentialService>(),
                        provider.GetRequiredService<AppDbContext>()));
                }
            }
        });
    }

    private static PasswordRecoveryDeliveryWorker CreateWorker(
        IntegrationWebApplicationFactory factory,
        ControlledTimeProvider clock) => new(
        factory.Services.GetRequiredService<IServiceScopeFactory>(),
        factory.Services.GetRequiredService<IOptions<AuthenticationProtectionOptions>>(),
        clock,
        factory.Services.GetRequiredService<ILogger<PasswordRecoveryDeliveryWorker>>());

    private static async Task AdmitAsync(IntegrationWebApplicationFactory factory, string email)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var requestService = scope.ServiceProvider.GetRequiredService<IPasswordRecoveryRequestService>();
        await requestService.AdmitAsync(email, IPAddress.Parse("203.0.113.42"));
    }

    private static async Task EnqueueCaseVariantAsync(
        IntegrationWebApplicationFactory factory,
        ControlledTimeProvider clock,
        string email)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var services = scope.ServiceProvider;
        var keys = services.GetRequiredService<ThrottleKeyFactory>();
        var jobs = services.GetRequiredService<PasswordRecoveryJobRepository>();
        var recipientKey = keys.CreateRecipientQuotaKey(ThrottlePurpose.RecoveryRequest, email);
        var deliveryKey = keys.CreateRecoveryDeliveryKey(email);
        var payload = System.Text.Json.JsonSerializer.SerializeToUtf8Bytes(new PasswordRecoveryRequestPayload(email));
        try
        {
            var result = await jobs.EnqueueOrCoalesceAsync(
                deliveryKey,
                recipientKey,
                payload,
                clock.GetUtcNow().AddMinutes(15));
            Assert.Equal(RecoveryJobEnqueueStatus.Enqueued, result.Status);
        }
        finally
        {
            CryptographicOperations.ZeroMemory(recipientKey);
            CryptographicOperations.ZeroMemory(deliveryKey);
            CryptographicOperations.ZeroMemory(payload);
        }
    }

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

    private static ControlledTimeProvider NewClock() => new(DateTimeOffset.UtcNow);

    [GeneratedRegex("<strong>(?<token>[^<]+)</strong>", RegexOptions.CultureInvariant)]
    private static partial Regex RecoveryCodeRegex();

    private static string ExtractToken(string body)
    {
        var match = RecoveryCodeRegex().Match(body);
        Assert.True(match.Success, "The recovery code should be present in the synthetic email body.");
        return match.Groups["token"].Value;
    }

    private sealed class CapturingEmailService : IEmailService
    {
        private readonly Func<string, string, string, CancellationToken, Task>? _send;
        private readonly Exception _failure;
        private int _failuresRemaining;
        private readonly List<(string To, string Subject, string Body)> _messages = [];
        private readonly object _gate = new();

        public CapturingEmailService(
            int failuresBeforeSuccess = 0,
            Func<string, string, string, CancellationToken, Task>? send = null,
            Exception? failure = null)
        {
            _failuresRemaining = failuresBeforeSuccess;
            _send = send;
            _failure = failure ?? new SmtpException("Synthetic SMTP failure.");
        }

        public IReadOnlyList<(string To, string Subject, string Body)> Messages
        {
            get
            {
                lock (_gate)
                {
                    return _messages.ToArray();
                }
            }
        }

        public void EnviarEmail(string para, string assunto, string corpo) =>
            throw new InvalidOperationException("The recovery worker must use asynchronous email delivery.");

        public async Task EnviarEmailAsync(
            string para,
            string assunto,
            string corpo,
            CancellationToken cancellationToken = default)
        {
            lock (_gate)
            {
                _messages.Add((para, assunto, corpo));
            }

            if (_send is not null)
            {
                await _send(para, assunto, corpo, cancellationToken);
            }

            if (Interlocked.Decrement(ref _failuresRemaining) >= 0)
            {
                throw _failure;
            }
        }
    }

    private sealed class LeaseExpiringCredentialService(
        ICredentialService inner,
        AppDbContext context) : ICredentialService
    {
        public Task<CredentialChangeResult> ChangePasswordAsync(
            int userId,
            string? currentPassword,
            string? newPassword,
            string? confirmation,
            CancellationToken cancellationToken = default) =>
            inner.ChangePasswordAsync(userId, currentPassword, newPassword, confirmation, cancellationToken);

        public Task<PasswordResetRequestResult> RequestPasswordResetAsync(
            string? email,
            CancellationToken cancellationToken = default) =>
            inner.RequestPasswordResetAsync(email, cancellationToken);

        public Task<PasswordResetDeliveryIssue?> IssuePasswordResetForDeliveryAsync(
            int userId,
            string expectedEmail,
            CancellationToken cancellationToken = default) =>
            inner.IssuePasswordResetForDeliveryAsync(userId, expectedEmail, cancellationToken);

        public async Task<bool> IsPasswordResetCurrentAsync(
            int userId,
            string expectedEmail,
            long sessionVersion,
            string token,
            CancellationToken cancellationToken = default)
        {
            await context.Database.ExecuteSqlInterpolatedAsync(
                $"UPDATE \"PasswordRecoveryJobs\" SET \"LeaseUntil\" = clock_timestamp() - interval '1 day' WHERE \"UserId\" = {userId} AND \"Status\" = 'Processing';",
                cancellationToken);
            return await inner.IsPasswordResetCurrentAsync(
                userId,
                expectedEmail,
                sessionVersion,
                token,
                cancellationToken);
        }

        public Task<CredentialChangeResult> ResetPasswordAsync(
            string? email,
            string? token,
            string? newPassword,
            string? confirmation,
            bool allowLegacyTokenOnly = false,
            CancellationToken cancellationToken = default) =>
            inner.ResetPasswordAsync(email, token, newPassword, confirmation, allowLegacyTokenOnly, cancellationToken);
    }

    private sealed class TestRecoveryEncryptionKeyProvider(byte[] key) : IRecoveryEncryptionKeyProvider
    {
        private readonly byte[] _key = key.ToArray();

        public string ActiveKeyId => "recovery-delivery-test";

        public byte[] CopyKey(string keyId) =>
            string.Equals(keyId, ActiveKeyId, StringComparison.Ordinal)
                ? _key.ToArray()
                : throw new CryptographicException("Unknown synthetic key.");
    }
}
