using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using LabSolos_Server_DotNet8.BackgroundServices;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Tests.Infrastructure;
using Xunit.Abstractions;

namespace Tests.Integration;

[Collection(PostgreSql15IntegrationGroup.Name)]
public sealed class AuthenticationProtectionCrossFlowTests(
    PostgreSql15ContainerFixture database,
    ITestOutputHelper output)
{
    private const string ReplacementPassword = "Synthetic replacement credential! 2026";
    private static readonly byte[] ThrottleKey = SHA256.HashData(
        Encoding.UTF8.GetBytes("T029 synthetic operational-key sentinel for isolated tests"));

    [Fact]
    public async Task EmailChangeCancelsOldRecoveryAndNewEmailCompletesTheCredentialCycle()
    {
        var clock = new ControlledTimeProvider(DateTimeOffset.UtcNow);
        var emailService = new CapturingEmailService();
        using var commandCounter = new DatabaseCommandCounter();
        await using var factory = CreateFactory(clock, emailService);
        await factory.RecreateDatabaseAsync();
        var scenario = await SeedScenarioAsync(factory, "contact-recovery-token");
        using var publicClient = factory.CreateClient();

        commandCounter.Reset();
        var admissionTimer = Stopwatch.StartNew();
        using (var admission = await RequestRecoveryAsync(publicClient, scenario.MenteeOneEmail))
        {
            admissionTimer.Stop();
            Assert.Equal(HttpStatusCode.Accepted, admission.StatusCode);
            Assert.True(admission.Headers.CacheControl?.NoStore);
        }
        var admissionDatabaseCommands = commandCounter.Count;

        const string newEmail = "updated-recovery-recipient@example.invalid";
        using var owner = CreateOwnerClient(factory, scenario);
        using (var update = await PatchOwnEmailAsync(owner, scenario.MenteeOneId, newEmail, scenario.MenteeOnePassword))
        {
            Assert.Equal(HttpStatusCode.OK, update.StatusCode);
            var body = await update.Content.ReadAsStringAsync();
            Assert.DoesNotContain(scenario.MenteeOnePassword, body, StringComparison.Ordinal);
            Assert.DoesNotContain("senhaAtual", body, StringComparison.OrdinalIgnoreCase);
        }

        var worker = CreateWorker(factory, clock);
        var cancelledWorkerTimer = Stopwatch.StartNew();
        Assert.Equal(0, await worker.ProcessPendingAsync());
        cancelledWorkerTimer.Stop();
        Assert.Empty(emailService.Messages);

        using (var oldEmailLogin = await LoginAsync(publicClient, scenario.MenteeOneEmail, scenario.MenteeOnePassword))
        {
            Assert.Equal(HttpStatusCode.Unauthorized, oldEmailLogin.StatusCode);
        }
        using (var newEmailLogin = await LoginAsync(publicClient, newEmail, scenario.MenteeOnePassword))
        {
            Assert.Equal(HttpStatusCode.OK, newEmailLogin.StatusCode);
        }
        using (var stillCurrentSession = await owner.GetAsync($"/api/Usuarios/{scenario.MenteeOneId}"))
        {
            Assert.Equal(HttpStatusCode.OK, stillCurrentSession.StatusCode);
        }

        using (var newAddressRequest = await RequestRecoveryAsync(publicClient, newEmail))
        {
            Assert.Equal(HttpStatusCode.Accepted, newAddressRequest.StatusCode);
        }
        await MakeRecoveryRequestEligibleForWorkerAsync(factory);

        commandCounter.Reset();
        var deliveryTimer = Stopwatch.StartNew();
        Assert.Equal(1, await worker.ProcessPendingAsync());
        deliveryTimer.Stop();
        var deliveryDatabaseCommands = commandCounter.Count;

        var deliveredMessage = Assert.Single(emailService.Messages);
        Assert.Equal(newEmail, deliveredMessage.To);
        var code = ExtractCode(deliveredMessage.Body);
        using (var reset = await publicClient.PostAsJsonAsync("/api/Email/reset-password", new
        {
            email = newEmail,
            code,
            newPassword = ReplacementPassword,
            confirmation = ReplacementPassword
        }))
        {
            Assert.Equal(HttpStatusCode.NoContent, reset.StatusCode);
        }

        using (var oldSession = await owner.GetAsync($"/api/Usuarios/{scenario.MenteeOneId}"))
        {
            Assert.Equal(HttpStatusCode.Unauthorized, oldSession.StatusCode);
        }
        using (var reusedCode = await publicClient.PostAsJsonAsync("/api/Email/reset-password", new
        {
            email = newEmail,
            code,
            newPassword = ReplacementPassword,
            confirmation = ReplacementPassword
        }))
        {
            Assert.Equal(HttpStatusCode.BadRequest, reusedCode.StatusCode);
        }
        using (var oldPassword = await LoginAsync(publicClient, newEmail, scenario.MenteeOnePassword))
        {
            Assert.Equal(HttpStatusCode.Unauthorized, oldPassword.StatusCode);
        }
        using (var newPassword = await LoginAsync(publicClient, newEmail, ReplacementPassword))
        {
            Assert.Equal(HttpStatusCode.OK, newPassword.StatusCode);
        }

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await context.Usuarios.AsNoTracking().SingleAsync(candidate => candidate.Id == scenario.MenteeOneId);
        var jobs = await context.PasswordRecoveryJobs.AsNoTracking().OrderBy(job => job.CreatedAt).ToListAsync();
        Assert.Equal(newEmail, user.Email);
        Assert.Null(user.TokenRedefinicaoHash);
        Assert.Contains(jobs, job => job.Status == PasswordRecoveryJobStatus.Cancelled);
        Assert.Contains(jobs, job => job.Status == PasswordRecoveryJobStatus.Completed);
        Assert.All(jobs, job => Assert.Empty(job.PayloadCiphertext));

        output.WriteLine(
            "T029_METRIC flow=email-change recovery_admission_http_ms={0} admission_sql_commands={1} " +
            "cancelled_worker_ms={2} delivery_worker_ms={3} delivery_sql_commands={4} " +
            "simulated_delivery_count={5}",
            admissionTimer.Elapsed.TotalMilliseconds.ToString("F2", System.Globalization.CultureInfo.InvariantCulture),
            admissionDatabaseCommands,
            cancelledWorkerTimer.Elapsed.TotalMilliseconds.ToString("F2", System.Globalization.CultureInfo.InvariantCulture),
            deliveryTimer.Elapsed.TotalMilliseconds.ToString("F2", System.Globalization.CultureInfo.InvariantCulture),
            deliveryDatabaseCommands,
            emailService.Messages.Count);
    }

    [Fact]
    public async Task RecoveryExhaustionDoesNotBlockLoginAndConcurrentCleanupPreservesTheExpiredWindow()
    {
        var clock = new ControlledTimeProvider(DateTimeOffset.UtcNow);
        var emailService = new CapturingEmailService();
        var protectionOptions = new AuthenticationProtectionOptions
        {
            Login = new LoginThrottleOptions
            {
                AccountFailures = 2,
                IpFailures = 100,
                WindowSeconds = 60
            },
            RecoveryRequest = new RecoveryRequestThrottleOptions
            {
                RecipientRequests = 1,
                IpRequests = 10,
                WindowSeconds = 60,
                CooldownSeconds = 60
            },
            RecoveryCode = new RecoveryCodeThrottleOptions
            {
                RecipientFailures = 5,
                IpFailures = 30,
                WindowSeconds = 60
            }
        };
        await using var factory = CreateFactory(clock, emailService, protectionOptions);
        await factory.RecreateDatabaseAsync();
        var scenario = await SeedScenarioAsync(factory, "recovery-login-cleanup");
        using var client = factory.CreateClient();

        using (var admitted = await RequestRecoveryAsync(client, scenario.MenteeOneEmail))
        {
            Assert.Equal(HttpStatusCode.Accepted, admitted.StatusCode);
        }
        using (var exhausted = await RequestRecoveryAsync(client, scenario.MenteeOneEmail))
        {
            Assert.Equal(HttpStatusCode.Accepted, exhausted.StatusCode);
            Assert.True(exhausted.Headers.CacheControl?.NoStore);
        }

        for (var attempt = 0; attempt < 2; attempt++)
        {
            using var invalid = await LoginAsync(client, scenario.MenteeOneEmail, "Incorrect synthetic password! 2026");
            Assert.Equal(HttpStatusCode.Unauthorized, invalid.StatusCode);
        }
        using (var limited = await LoginAsync(client, scenario.MenteeOneEmail, scenario.MenteeOnePassword))
        {
            Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
        }

        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.Equal(1, await context.PasswordRecoveryJobs.CountAsync(
                job => job.Status == PasswordRecoveryJobStatus.Pending));
            var recipientBucket = await context.AuthenticationThrottleBuckets.AsNoTracking()
                .SingleAsync(bucket => bucket.Scope == AuthenticationProtectionCapacity.RecoveryRequestRecipient);
            var accountBucket = await context.AuthenticationThrottleBuckets.AsNoTracking()
                .SingleAsync(bucket => bucket.Scope == AuthenticationProtectionCapacity.LoginAccount);
            Assert.Equal(1, recipientBucket.Count);
            Assert.Equal(2, accountBucket.Count);
        }

        clock.Advance(TimeSpan.FromSeconds(60));
        var cleanupTask = Task.Run(async () =>
        {
            await using var scope = factory.Services.CreateAsyncScope();
            return await scope.ServiceProvider.GetRequiredService<PostgresAuthenticationThrottle>()
                .CleanupExpiredAsync();
        });
        var loginTimer = Stopwatch.StartNew();
        var loginTask = LoginAsync(client, scenario.MenteeOneEmail, scenario.MenteeOnePassword);
        await Task.WhenAll(cleanupTask, loginTask);
        loginTimer.Stop();
        using var renewedLogin = await loginTask;
        Assert.Equal(HttpStatusCode.OK, renewedLogin.StatusCode);

        await using var verification = factory.Services.CreateAsyncScope();
        var verifiedContext = verification.ServiceProvider.GetRequiredService<AppDbContext>();
        var capacities = await verifiedContext.AuthenticationProtectionCapacities.AsNoTracking().ToListAsync();
        foreach (var capacity in capacities.Where(entry => entry.Scope != AuthenticationProtectionCapacity.RecoveryJobs))
        {
            var bucketCount = await verifiedContext.AuthenticationThrottleBuckets.CountAsync(
                bucket => bucket.Scope == capacity.Scope);
            Assert.Equal(bucketCount, capacity.Allocated);
        }
        Assert.Equal(1, await verifiedContext.AuthenticationProtectionCapacities.AsNoTracking()
            .Where(entry => entry.Scope == AuthenticationProtectionCapacity.RecoveryJobs)
            .Select(entry => entry.Allocated)
            .SingleAsync());

        output.WriteLine(
            "T029_METRIC flow=recovery-login-cleanup limited_recovery_requests=1 " +
            "recovery_queue_active=1 login_account_failures_before_renewal=2 " +
            "concurrent_cleanup_removed={0} renewed_login_http_ms={1}",
            await cleanupTask,
            loginTimer.Elapsed.TotalMilliseconds.ToString("F2", System.Globalization.CultureInfo.InvariantCulture));
    }

    private IntegrationWebApplicationFactory CreateFactory(
        ControlledTimeProvider clock,
        IEmailService emailService,
        AuthenticationProtectionOptions? options = null)
    {
        var configuredOptions = options ?? new AuthenticationProtectionOptions();
        return new IntegrationWebApplicationFactory(database, new()
        {
            TimeProvider = clock,
            EmailService = emailService,
            ConfigureServices = services =>
            {
                services.RemoveAll<IOptions<AuthenticationProtectionOptions>>();
                services.AddSingleton<IOptions<AuthenticationProtectionOptions>>(Options.Create(configuredOptions));
                services.RemoveAll<IAuthenticationThrottleClock>();
                services.AddSingleton<IAuthenticationThrottleClock>(
                    _ => new TimeProviderAuthenticationThrottleClock(clock));
                services.RemoveAll<ThrottleKeyFactory>();
                services.AddSingleton(_ => new ThrottleKeyFactory(ThrottleKey, "IntegrationTesting"));
            }
        });
    }

    private static async Task<AuthenticationProtectionScenarioData> SeedScenarioAsync(
        IntegrationWebApplicationFactory factory,
        string key)
    {
        var scenario = AuthenticationProtectionScenarioData.Create($"T029-{key}-{Guid.NewGuid():N}");
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<Usuario>>();
        await scenario.PersistAsync(context, passwordHasher);
        return scenario;
    }

    private static HttpClient CreateOwnerClient(
        IntegrationWebApplicationFactory factory,
        AuthenticationProtectionScenarioData scenario)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue(
            "Bearer",
            JwtSessionVersionTests.CreateToken(
                scenario.MenteeOneId,
                "0",
                "false",
                NivelUsuario.Mentorado));
        return client;
    }

    private static Task<HttpResponseMessage> RequestRecoveryAsync(HttpClient client, string email) =>
        client.PostAsJsonAsync("/api/Email/request-password-reset", new { email });

    private static Task<HttpResponseMessage> LoginAsync(HttpClient client, string email, string password) =>
        client.PostAsJsonAsync("/api/Auth/login", new { email, password });

    private static async Task<HttpResponseMessage> PatchOwnEmailAsync(
        HttpClient client,
        int userId,
        string email,
        string password)
    {
        var patch = System.Text.Json.JsonSerializer.Serialize(new object[]
        {
            new { op = "replace", path = "/email", value = email },
            new { op = "replace", path = "/senhaAtual", value = password }
        });
        using var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/Usuarios/{userId}")
        {
            Content = new StringContent(patch, Encoding.UTF8, "application/json-patch+json")
        };
        return await client.SendAsync(request);
    }

    private static async Task MakeRecoveryRequestEligibleForWorkerAsync(IntegrationWebApplicationFactory factory)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.ExecuteSqlRawAsync("""
            UPDATE "AuthenticationThrottleBuckets"
            SET "NextEmissionAt" = clock_timestamp() - interval '1 second'
            WHERE "Scope" = 'recovery-request-recipient';
            """);
        await context.Database.ExecuteSqlRawAsync("""
            UPDATE "PasswordRecoveryJobs"
            SET "NextAttemptAt" = clock_timestamp() - interval '1 second'
            WHERE "Status" = 'Pending';
            """);
    }

    private static PasswordRecoveryDeliveryWorker CreateWorker(
        IntegrationWebApplicationFactory factory,
        ControlledTimeProvider clock) => new(
        factory.Services.GetRequiredService<IServiceScopeFactory>(),
        factory.Services.GetRequiredService<IOptions<AuthenticationProtectionOptions>>(),
        clock,
        factory.Services.GetRequiredService<ILogger<PasswordRecoveryDeliveryWorker>>());

    private static string ExtractCode(string body)
    {
        var match = Regex.Match(body, "<strong>(?<code>[^<]+)</strong>", RegexOptions.CultureInvariant);
        Assert.True(match.Success, "A recovery code must be present in the synthetic delivery.");
        return match.Groups["code"].Value;
    }

    private sealed class DatabaseCommandCounter : IDisposable
    {
        private int _count;
        private readonly ActivityListener _listener;

        public DatabaseCommandCounter()
        {
            _listener = new ActivityListener
            {
                ShouldListenTo = static source => source.Name == "Npgsql",
                Sample = static (ref ActivityCreationOptions<ActivityContext> _) => ActivitySamplingResult.AllData,
                ActivityStopped = _ => Interlocked.Increment(ref _count)
            };
            ActivitySource.AddActivityListener(_listener);
        }

        public int Count => Volatile.Read(ref _count);

        public void Reset() => Interlocked.Exchange(ref _count, 0);

        public void Dispose() => _listener.Dispose();
    }

    private sealed class CapturingEmailService : IEmailService
    {
        private readonly List<(string To, string Body)> _messages = [];

        public IReadOnlyList<(string To, string Body)> Messages => _messages.ToArray();

        public void EnviarEmail(string para, string assunto, string corpo) =>
            throw new InvalidOperationException("Recovery delivery must use the asynchronous transport.");

        public Task EnviarEmailAsync(
            string para,
            string assunto,
            string corpo,
            CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            _messages.Add((para, corpo));
            return Task.CompletedTask;
        }
    }
}
