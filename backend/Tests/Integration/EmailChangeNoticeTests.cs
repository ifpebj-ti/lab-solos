using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using LabSolos_Server_DotNet8.BackgroundServices;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class EmailChangeNoticeTests(PostgreSqlContainerFixture database)
{
    private static readonly byte[] KeyHashSecret = SHA256.HashData(
        Encoding.UTF8.GetBytes("T011 synthetic email notice key for isolated tests"));

    [Fact]
    public async Task CompletedEmailChangeDeliversOneSanitizedNoticeToEachAddressAndDoesNotRepeat()
    {
        var clock = NewClock();
        var emailService = new CapturingEmailService();
        await using var factory = await CreateFactoryAsync(clock, emailService);
        var scenario = await SeedScenarioAsync(factory);
        var oldAddress = scenario.MenteeOneEmail;
        var newAddress = $"new-{scenario.ScenarioToken}@integration.test";

        using var owner = CreateClient(factory, scenario.MenteeOneId, NivelUsuario.Mentorado);
        using var changed = await ChangeEmailAsync(owner, scenario.MenteeOneId, newAddress, scenario.MenteeOnePassword);
        Assert.Equal(System.Net.HttpStatusCode.OK, changed.StatusCode);

        Assert.Equal(2, await ProcessPendingAsync(factory));

        Assert.Equal(
            new[] { oldAddress, newAddress }.OrderBy(value => value, StringComparer.Ordinal),
            emailService.Messages.Select(message => message.To).OrderBy(value => value, StringComparer.Ordinal));
        Assert.All(emailService.Messages, message =>
        {
            Assert.Contains("LabOn", message.Subject, StringComparison.Ordinal);
            Assert.DoesNotContain(scenario.MenteeOnePassword, message.Body, StringComparison.Ordinal);
            Assert.DoesNotContain("senhaAtual", message.Body, StringComparison.OrdinalIgnoreCase);
        });

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var jobs = await context.EmailChangeNoticeJobs.AsNoTracking()
            .Where(job => job.UserId == scenario.MenteeOneId)
            .OrderBy(job => job.Recipient)
            .ToListAsync();
        Assert.Equal(2, jobs.Count);
        Assert.All(jobs, job =>
        {
            Assert.Equal(EmailChangeNoticeStatus.Delivered, job.Status);
            Assert.Equal(1, job.Attempts);
            Assert.NotNull(job.DeliveredAt);
            Assert.Empty(job.PayloadCiphertext);
            Assert.Null(job.LastFailureCode);
        });

        var audit = await context.LogsAuditoria.AsNoTracking().SingleAsync(log =>
            log.CodigoEvento == CodigoEventoAuditoria.TrocaEmail &&
            log.UsuarioId == scenario.MenteeOneId);
        Assert.Equal($"conta:usuario:{scenario.MenteeOneId}", audit.Recurso);
        Assert.DoesNotContain(oldAddress, audit.Detalhes ?? string.Empty, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(newAddress, audit.Detalhes ?? string.Empty, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(scenario.MenteeOnePassword, audit.Detalhes ?? string.Empty, StringComparison.Ordinal);
        Assert.DoesNotContain(oldAddress, audit.DadosRequisicao ?? string.Empty, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(newAddress, audit.DadosRequisicao ?? string.Empty, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(oldAddress, audit.DadosResposta ?? string.Empty, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(newAddress, audit.DadosResposta ?? string.Empty, StringComparison.OrdinalIgnoreCase);
        Assert.All(jobs, job => Assert.Equal(job.OperationId.ToString("N"), audit.CorrelationId));

        Assert.Equal(0, await ProcessPendingAsync(factory));
        Assert.Equal(2, emailService.Messages.Count);
    }

    [Fact]
    public async Task PartialFailureRetriesOnlyTheFailedRecipientAndKeepsFailureDetailsSanitized()
    {
        var clock = NewClock();
        var newAddress = "new-recipient@example.invalid";
        var emailService = new CapturingEmailService(failOnceFor: newAddress);
        await using var factory = await CreateFactoryAsync(clock, emailService);
        var scenario = await SeedScenarioAsync(factory);
        var oldAddress = scenario.MenteeOneEmail;
        using var owner = CreateClient(factory, scenario.MenteeOneId, NivelUsuario.Mentorado);
        using var changed = await ChangeEmailAsync(owner, scenario.MenteeOneId, newAddress, scenario.MenteeOnePassword);
        Assert.Equal(System.Net.HttpStatusCode.OK, changed.StatusCode);

        Assert.Equal(2, await ProcessPendingAsync(factory));

        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var jobs = await context.EmailChangeNoticeJobs.AsNoTracking()
                .Where(job => job.UserId == scenario.MenteeOneId)
                .ToListAsync();
            Assert.Equal(EmailChangeNoticeStatus.Delivered, Assert.Single(jobs, job => job.Recipient == EmailChangeNoticeRecipient.PreviousAddress).Status);
            var failed = Assert.Single(jobs, job => job.Recipient == EmailChangeNoticeRecipient.NewAddress);
            Assert.Equal(EmailChangeNoticeStatus.Pending, failed.Status);
            Assert.Equal(1, failed.Attempts);
            Assert.Equal("delivery_failed", failed.LastFailureCode);
            Assert.True(failed.NextAttemptAt > clock.GetUtcNow());
            Assert.DoesNotContain("Synthetic SMTP failure", failed.LastFailureCode, StringComparison.OrdinalIgnoreCase);
        }

        clock.Advance(TimeSpan.FromSeconds(31));
        Assert.Equal(1, await ProcessPendingAsync(factory));
        Assert.Equal(1, emailService.Messages.Count(message => message.To == oldAddress));
        Assert.Equal(2, emailService.Messages.Count(message => message.To == newAddress));

        await using var verifyScope = factory.Services.CreateAsyncScope();
        var verified = verifyScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var completedJobs = await verified.EmailChangeNoticeJobs.AsNoTracking().ToListAsync();
        Assert.All(completedJobs, job =>
        {
            Assert.Equal(EmailChangeNoticeStatus.Delivered, job.Status);
            Assert.Empty(job.PayloadCiphertext);
            Assert.Null(job.LastFailureCode);
        });
        Assert.Equal(1, Assert.Single(completedJobs, job => job.Recipient == EmailChangeNoticeRecipient.PreviousAddress).Attempts);
        Assert.Equal(2, Assert.Single(completedJobs, job => job.Recipient == EmailChangeNoticeRecipient.NewAddress).Attempts);
    }

    [Fact]
    public async Task ThirdDeliveryFailureIsTerminalAndAvailableAsSanitizedOperationalState()
    {
        var clock = NewClock();
        var emailService = new CapturingEmailService(alwaysFailFor: "old-terminal@example.invalid");
        await using var factory = await CreateFactoryAsync(clock, emailService);
        var scenario = await SeedScenarioAsync(factory);
        using var owner = CreateClient(factory, scenario.MenteeOneId, NivelUsuario.Mentorado);
        using var changed = await ChangeEmailAsync(
            owner,
            scenario.MenteeOneId,
            "old-terminal@example.invalid",
            scenario.MenteeOnePassword);
        Assert.Equal(System.Net.HttpStatusCode.OK, changed.StatusCode);

        Assert.Equal(2, await ProcessPendingAsync(factory));
        clock.Advance(TimeSpan.FromSeconds(31));
        Assert.Equal(1, await ProcessPendingAsync(factory));
        clock.Advance(TimeSpan.FromSeconds(121));
        Assert.Equal(1, await ProcessPendingAsync(factory));

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var failed = await context.EmailChangeNoticeJobs.AsNoTracking().SingleAsync(job =>
            job.Recipient == EmailChangeNoticeRecipient.NewAddress);
        Assert.Equal(EmailChangeNoticeStatus.Failed, failed.Status);
        Assert.Equal(3, failed.Attempts);
        Assert.Equal("delivery_failed", failed.LastFailureCode);
        Assert.Empty(failed.PayloadCiphertext);
        Assert.Equal(1, await context.EmailChangeNoticeJobs.AsNoTracking()
            .CountAsync(job => job.Status == EmailChangeNoticeStatus.Delivered));
        Assert.Equal(4, emailService.Messages.Count);
        Assert.Equal(0, await ProcessPendingAsync(factory));
        Assert.Equal(4, emailService.Messages.Count);
    }

    [Fact]
    public async Task ExpiredNoticeIsFailedAndExpiredRetentionIsPurgedWithoutDelivery()
    {
        var clock = NewClock();
        var emailService = new CapturingEmailService();
        await using var factory = await CreateFactoryAsync(clock, emailService);
        var scenario = await SeedScenarioAsync(factory);
        using var owner = CreateClient(factory, scenario.MenteeOneId, NivelUsuario.Mentorado);
        using var changed = await ChangeEmailAsync(
            owner,
            scenario.MenteeOneId,
            $"new-{scenario.ScenarioToken}@integration.test",
            scenario.MenteeOnePassword);
        Assert.Equal(System.Net.HttpStatusCode.OK, changed.StatusCode);

        var now = clock.GetUtcNow();
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var jobs = await context.EmailChangeNoticeJobs
                .Where(job => job.UserId == scenario.MenteeOneId)
                .ToListAsync();
            var expired = Assert.Single(jobs, job => job.Recipient == EmailChangeNoticeRecipient.NewAddress);
            expired.CreatedAt = now.AddDays(-2);
            expired.DeadlineAt = now.AddSeconds(-1);
            expired.RetainUntil = now.AddDays(30);

            var retained = Assert.Single(jobs, job => job.Recipient == EmailChangeNoticeRecipient.PreviousAddress);
            retained.CreatedAt = now.AddDays(-2);
            retained.DeadlineAt = now.AddDays(1);
            retained.RetainUntil = now.AddSeconds(-1);
            await context.SaveChangesAsync();
        }

        Assert.Equal(0, await ProcessPendingAsync(factory));
        Assert.Empty(emailService.Messages);

        await using var verifyScope = factory.Services.CreateAsyncScope();
        var verified = verifyScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var failed = await verified.EmailChangeNoticeJobs.AsNoTracking().SingleAsync();
        Assert.Equal(EmailChangeNoticeRecipient.NewAddress, failed.Recipient);
        Assert.Equal(EmailChangeNoticeStatus.Failed, failed.Status);
        Assert.Equal("delivery_deadline_expired", failed.LastFailureCode);
        Assert.Empty(failed.PayloadCiphertext);
        Assert.Null(failed.LeaseId);
        Assert.Null(failed.LeaseUntil);
    }

    [Theory]
    [InlineData(NoticePayloadFault.Unauthenticated, "notice_payload_unavailable")]
    [InlineData(NoticePayloadFault.InvalidUtf8, "notice_payload_unavailable")]
    [InlineData(NoticePayloadFault.InvalidRecipient, "notice_recipient_invalid")]
    public async Task UnsafeStoredPayloadIsFailedWithoutExposingRecipientOrSendingNotice(
        NoticePayloadFault payloadFault,
        string expectedFailureCode)
    {
        var clock = NewClock();
        var emailService = new CapturingEmailService();
        await using var factory = await CreateFactoryAsync(clock, emailService);
        var scenario = await SeedScenarioAsync(factory);
        var newAddress = $"new-{scenario.ScenarioToken}@integration.test";
        using var owner = CreateClient(factory, scenario.MenteeOneId, NivelUsuario.Mentorado);
        using var changed = await ChangeEmailAsync(
            owner,
            scenario.MenteeOneId,
            newAddress,
            scenario.MenteeOnePassword);
        Assert.Equal(System.Net.HttpStatusCode.OK, changed.StatusCode);

        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var services = scope.ServiceProvider;
            var context = services.GetRequiredService<AppDbContext>();
            var job = await context.EmailChangeNoticeJobs.SingleAsync(candidate =>
                candidate.UserId == scenario.MenteeOneId &&
                candidate.Recipient == EmailChangeNoticeRecipient.NewAddress);

            if (payloadFault == NoticePayloadFault.Unauthenticated)
            {
                job.PayloadTag = job.PayloadTag.ToArray();
                job.PayloadTag[0] ^= 0xFF;
            }
            else
            {
                var plaintext = payloadFault == NoticePayloadFault.InvalidUtf8
                    ? new byte[] { 0xFF }
                    : Encoding.UTF8.GetBytes("invalid recipient");
                var payload = services.GetRequiredService<RecoveryPayloadProtector>().Protect(
                    job.Id,
                    RecoveryPayloadPurpose.EmailChangeNotice,
                    plaintext);
                job.EncryptionKeyId = payload.EncryptionKeyId;
                job.PayloadCiphertext = payload.Ciphertext;
                job.PayloadNonce = payload.Nonce;
                job.PayloadTag = payload.Tag;
            }

            await context.SaveChangesAsync();
        }

        Assert.Equal(2, await ProcessPendingAsync(factory));
        Assert.Equal(new[] { scenario.MenteeOneEmail }, emailService.Messages.Select(message => message.To));

        await using var verifyScope = factory.Services.CreateAsyncScope();
        var verified = verifyScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var jobs = await verified.EmailChangeNoticeJobs.AsNoTracking()
            .Where(job => job.UserId == scenario.MenteeOneId)
            .ToListAsync();
        var failed = Assert.Single(jobs, job => job.Recipient == EmailChangeNoticeRecipient.NewAddress);
        Assert.Equal(EmailChangeNoticeStatus.Failed, failed.Status);
        Assert.Equal(expectedFailureCode, failed.LastFailureCode);
        Assert.Equal(0, failed.Attempts);
        Assert.Empty(failed.PayloadCiphertext);
        Assert.Null(failed.LeaseId);
        Assert.Null(failed.LeaseUntil);
        Assert.Equal(EmailChangeNoticeStatus.Delivered,
            Assert.Single(jobs, job => job.Recipient == EmailChangeNoticeRecipient.PreviousAddress).Status);
        Assert.DoesNotContain(emailService.Messages, message => message.To == newAddress);
    }

    [Fact]
    public async Task CallerCancellationPropagatesAndReclaimsReservedJobsAfterLeaseExpiry()
    {
        using var cancellation = new CancellationTokenSource();
        var clock = NewClock();
        var cancelFirstSend = true;
        var emailService = new CapturingEmailService(sendOverride: _ =>
        {
            if (cancelFirstSend)
            {
                cancelFirstSend = false;
                cancellation.Cancel();
                return Task.FromCanceled(cancellation.Token);
            }

            return Task.CompletedTask;
        });
        await using var factory = await CreateFactoryAsync(clock, emailService);
        var scenario = await SeedScenarioAsync(factory);
        var newAddress = $"new-{scenario.ScenarioToken}@integration.test";
        using var owner = CreateClient(factory, scenario.MenteeOneId, NivelUsuario.Mentorado);
        using var changed = await ChangeEmailAsync(
            owner,
            scenario.MenteeOneId,
            newAddress,
            scenario.MenteeOnePassword);
        Assert.Equal(System.Net.HttpStatusCode.OK, changed.StatusCode);

        await Assert.ThrowsAnyAsync<OperationCanceledException>(async () =>
            await ProcessPendingAsync(factory, cancellation.Token));

        Assert.Empty(emailService.Messages);
        await using var verifyScope = factory.Services.CreateAsyncScope();
        var verified = verifyScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var jobs = await verified.EmailChangeNoticeJobs.AsNoTracking()
            .Where(job => job.UserId == scenario.MenteeOneId)
            .ToListAsync();
        Assert.Equal(2, jobs.Count);
        Assert.All(jobs, job =>
        {
            Assert.Equal(EmailChangeNoticeStatus.Processing, job.Status);
            Assert.Equal(0, job.Attempts);
            Assert.NotEmpty(job.PayloadCiphertext);
            Assert.NotNull(job.LeaseId);
            Assert.NotNull(job.LeaseUntil);
        });

        clock.Advance(TimeSpan.FromMinutes(1).Add(TimeSpan.FromSeconds(1)));
        Assert.Equal(2, await ProcessPendingAsync(factory));
        Assert.Equal(
            new[] { scenario.MenteeOneEmail, newAddress }.OrderBy(value => value, StringComparer.Ordinal),
            emailService.Messages.Select(message => message.To).OrderBy(value => value, StringComparer.Ordinal));

        var completedJobs = await verified.EmailChangeNoticeJobs.AsNoTracking()
            .Where(job => job.UserId == scenario.MenteeOneId)
            .ToListAsync();
        Assert.All(completedJobs, job =>
        {
            Assert.Equal(EmailChangeNoticeStatus.Delivered, job.Status);
            Assert.Equal(1, job.Attempts);
            Assert.Empty(job.PayloadCiphertext);
            Assert.Null(job.LeaseId);
            Assert.Null(job.LeaseUntil);
        });
    }

    [Fact]
    public async Task ApplicationRegistersEmailChangeNoticeBackgroundService()
    {
        var clock = NewClock();
        var factory = new IntegrationWebApplicationFactory(database, new IntegrationApplicationOptions
        {
            TimeProvider = clock,
            BackgroundServicesToRun = new HashSet<Type> { typeof(EmailChangeNoticeBackgroundService) },
            ConfigureServices = ConfigureSecurityServices
        });
        await using (factory)
        {
            await factory.RecreateDatabaseAsync();
            Assert.Contains(
                factory.Services.GetServices<IHostedService>(),
                service => service is EmailChangeNoticeBackgroundService);
        }
    }

    private async Task<IntegrationWebApplicationFactory> CreateFactoryAsync(
        ControlledTimeProvider clock,
        CapturingEmailService emailService)
    {
        var factory = new IntegrationWebApplicationFactory(database, new IntegrationApplicationOptions
        {
            TimeProvider = clock,
            EmailService = emailService,
            ConfigureServices = ConfigureSecurityServices
        });
        await factory.RecreateDatabaseAsync();
        return factory;
    }

    private static void ConfigureSecurityServices(IServiceCollection services)
    {
        services.RemoveAll<ThrottleKeyFactory>();
        services.AddSingleton(_ => new ThrottleKeyFactory(KeyHashSecret, "IntegrationTesting"));
    }

    private static async Task<AuthenticationProtectionScenarioData> SeedScenarioAsync(
        IntegrationWebApplicationFactory factory)
    {
        var scenario = AuthenticationProtectionScenarioData.Create($"T011-{Guid.NewGuid():N}");
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<Microsoft.AspNetCore.Identity.IPasswordHasher<Usuario>>();
        await scenario.PersistAsync(context, hasher);
        return scenario;
    }

    private static async Task<int> ProcessPendingAsync(
        IntegrationWebApplicationFactory factory,
        CancellationToken cancellationToken = default)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        return await scope.ServiceProvider.GetRequiredService<EmailChangeNoticeService>()
            .ProcessPendingAsync(cancellationToken);
    }

    private static HttpClient CreateClient(
        IntegrationWebApplicationFactory factory,
        int userId,
        NivelUsuario role)
    {
        var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            JwtSessionVersionTests.CreateToken(userId, "0", "false", role));
        return client;
    }

    private static async Task<HttpResponseMessage> ChangeEmailAsync(
        HttpClient client,
        int userId,
        string email,
        string password)
    {
        var payload = System.Text.Json.JsonSerializer.Serialize(new object[]
        {
            new { op = "replace", path = "/email", value = email },
            new { op = "replace", path = "/senhaAtual", value = password }
        });
        using var request = new HttpRequestMessage(HttpMethod.Patch, $"https://localhost/api/Usuarios/{userId}")
        {
            Content = new StringContent(payload, Encoding.UTF8, "application/json-patch+json")
        };
        return await client.SendAsync(request);
    }

    private static ControlledTimeProvider NewClock() => new(DateTimeOffset.UtcNow.AddMinutes(1));

    public enum NoticePayloadFault
    {
        Unauthenticated,
        InvalidUtf8,
        InvalidRecipient
    }

    private sealed class CapturingEmailService(
        string? failOnceFor = null,
        string? alwaysFailFor = null,
        Func<CancellationToken, Task>? sendOverride = null) : IEmailService
    {
        private readonly object _gate = new();
        private readonly List<(string To, string Subject, string Body)> _messages = [];
        private bool _failedOnce;

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
            EnviarEmailAsync(para, assunto, corpo).GetAwaiter().GetResult();

        public async Task EnviarEmailAsync(
            string para,
            string assunto,
            string corpo,
            CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (sendOverride is not null)
            {
                await sendOverride(cancellationToken);
            }

            lock (_gate)
            {
                _messages.Add((para, assunto, corpo));
                if (string.Equals(para, alwaysFailFor, StringComparison.OrdinalIgnoreCase)
                    || (!_failedOnce && string.Equals(para, failOnceFor, StringComparison.OrdinalIgnoreCase)))
                {
                    _failedOnce = true;
                    throw new System.Net.Mail.SmtpException("Synthetic SMTP failure with private payload.");
                }
            }

        }
    }
}
