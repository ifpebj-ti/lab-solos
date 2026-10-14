using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSql15IntegrationGroup.Name)]
public sealed class LoginThrottleTests(PostgreSql15ContainerFixture database)
{
    private const string Email = "login-throttle@example.invalid";
    private const string Password = "Synthetic login password! 2026";
    private static readonly DateTimeOffset InitialTime =
        new(2026, 10, 13, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task SixthInvalidAttemptIsLimitedBeforePasswordVerification()
    {
        var testContext = await CreateScenarioAsync();
        await using var factory = testContext.Factory;
        using var client = factory.CreateClient();

        for (var attempt = 0; attempt < 5; attempt++)
        {
            using var response = await LoginAsync(client, Email, "incorrect password");
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        using var limited = await LoginAsync(client, Email, Password);

        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
        Assert.Equal("900", limited.Headers.RetryAfter?.Delta?.TotalSeconds.ToString(
            System.Globalization.CultureInfo.InvariantCulture));
        Assert.Equal(5, testContext.PasswordHasher.VerificationCount);
        Assert.True(limited.Headers.CacheControl?.NoStore);
        Assert.Equal("application/problem+json", limited.Content.Headers.ContentType?.MediaType);
        using var problem = JsonDocument.Parse(await limited.Content.ReadAsStringAsync());
        Assert.Equal("authentication_rate_limited", problem.RootElement.GetProperty("code").GetString());
        Assert.Equal(900, problem.RootElement.GetProperty("retryAfterSeconds").GetInt32());
    }

    [Fact]
    public async Task MissingAccountConsumesItsIdentifierQuotaAndKeepsGenericUnauthorizedResponse()
    {
        var testContext = await CreateScenarioAsync();
        await using var factory = testContext.Factory;
        using var client = factory.CreateClient();

        for (var attempt = 0; attempt < 5; attempt++)
        {
            using var response = await LoginAsync(client, "unknown-login@example.invalid", "incorrect password");
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            Assert.Equal("Credenciais inválidas.", await response.Content.ReadAsStringAsync());
        }

        using var limited = await LoginAsync(client, "unknown-login@example.invalid", Password);

        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
        Assert.Equal(0, testContext.PasswordHasher.VerificationCount);
    }

    [Fact]
    public async Task AccountIdentifierQuotaNormalizesCaseAndWhitespaceWithoutChangingExactLookup()
    {
        var testContext = await CreateScenarioAsync();
        await using var factory = testContext.Factory;
        using var client = factory.CreateClient();
        var aliases = new[]
        {
            " LOGIN-THROTTLE@example.invalid",
            "login-throttle@EXAMPLE.invalid",
            " login-throttle@example.invalid ",
            "LOGIN-THROTTLE@example.invalid"
        };

        foreach (var alias in aliases)
        {
            using var response = await LoginAsync(client, alias, Password);
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        using (var wrongPassword = await LoginAsync(client, Email, "incorrect password"))
        {
            Assert.Equal(HttpStatusCode.Unauthorized, wrongPassword.StatusCode);
        }

        using var limited = await LoginAsync(client, Email, Password);

        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
        Assert.Equal(1, testContext.PasswordHasher.VerificationCount);
    }

    [Fact]
    public async Task ThirtyFirstFailureFromOneIpIsLimitedBeforePasswordVerification()
    {
        var testContext = await CreateScenarioAsync();
        await using var factory = testContext.Factory;
        using var client = factory.CreateClient();

        for (var attempt = 0; attempt < 30; attempt++)
        {
            using var response = await LoginAsync(
                client,
                $"unknown-{attempt}@example.invalid",
                "incorrect password");
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        using var limited = await LoginAsync(client, Email, Password);

        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
        Assert.Equal(0, testContext.PasswordHasher.VerificationCount);
    }

    [Fact]
    public async Task SuccessfulLoginDoesNotClearTheIpFailureBudget()
    {
        var testContext = await CreateScenarioAsync();
        await using var factory = testContext.Factory;
        using var client = factory.CreateClient();

        for (var attempt = 0; attempt < 29; attempt++)
        {
            using var response = await LoginAsync(
                client,
                $"unknown-before-success-{attempt}@example.invalid",
                "incorrect password");
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        using (var success = await LoginAsync(client, Email, Password))
        {
            Assert.Equal(HttpStatusCode.OK, success.StatusCode);
        }

        using (var thirtiethFailure = await LoginAsync(
                   client,
                   "unknown-after-success@example.invalid",
                   "incorrect password"))
        {
            Assert.Equal(HttpStatusCode.Unauthorized, thirtiethFailure.StatusCode);
        }

        using var limited = await LoginAsync(client, Email, Password);

        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
        Assert.Equal(1, testContext.PasswordHasher.VerificationCount);
    }

    [Fact]
    public async Task ExpiredAccountWindowRenewsOnTheNextAttempt()
    {
        var testContext = await CreateScenarioAsync();
        await using var factory = testContext.Factory;
        using var client = factory.CreateClient();

        for (var attempt = 0; attempt < 5; attempt++)
        {
            using var response = await LoginAsync(client, Email, "incorrect password");
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        testContext.Clock.Advance(TimeSpan.FromMinutes(15));
        using var renewed = await LoginAsync(client, Email, "incorrect password");

        Assert.Equal(HttpStatusCode.Unauthorized, renewed.StatusCode);
        Assert.Equal(6, testContext.PasswordHasher.VerificationCount);
    }

    [Fact]
    public async Task CancellationAfterAdmissionDoesNotEraseTheStartedFailureAttempt()
    {
        using var requestCancellation = new CancellationTokenSource();
        var testContext = await CreateScenarioAsync(
            accountFailures: 1,
            passwordVerificationCallback: requestCancellation.Cancel);
        await using var factory = testContext.Factory;
        using var client = factory.CreateClient();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            client.PostAsJsonAsync(
                "/api/Auth/login",
                new { email = Email, password = "incorrect password" },
                requestCancellation.Token));

        using var retry = await LoginAsync(client, Email, Password);

        Assert.Equal(HttpStatusCode.TooManyRequests, retry.StatusCode);
        Assert.Equal(1, testContext.PasswordHasher.VerificationCount);
    }

    [Fact]
    public async Task MissingProductionThrottleSecretFailsAtStartupBeforeCheckingPassword()
    {
        var verificationCount = 0;
        var exception = await Assert.ThrowsAsync<OptionsValidationException>(() => CreateScenarioAsync(
            environmentName: "Staging",
            omitThrottleSecret: true,
            passwordVerificationCallback: () => Interlocked.Increment(ref verificationCount)));
        var messages = string.Join(Environment.NewLine, exception.Failures);

        Assert.Contains("KeyHashSecretFile", messages, StringComparison.Ordinal);
        Assert.DoesNotContain(Email, messages, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(Password, messages, StringComparison.Ordinal);
        Assert.Equal(0, verificationCount);
    }

    [Fact]
    public async Task RegisteredThrottleServiceAdmitsAConfiguredLoginRule()
    {
        var testContext = await CreateScenarioAsync();
        await using var factory = testContext.Factory;
        await using var scope = factory.Services.CreateAsyncScope();
        var throttle = scope.ServiceProvider.GetRequiredService<PostgresAuthenticationThrottle>();
        var result = await throttle.TryBeginAsync(
        [
            new AuthenticationThrottleRule(
                AuthenticationProtectionCapacity.LoginAccount,
                Enumerable.Repeat((byte)1, 32).ToArray(),
                5,
                TimeSpan.FromMinutes(15))
        ]);

        Assert.Equal(AuthenticationThrottleState.Allowed, result.State);
        Assert.NotNull(result.Attempt);
        await using (result.Attempt!)
        {
            await result.Attempt!.CompleteAsync(AuthenticationThrottleOutcome.Failure);
        }
    }

    private async Task<LoginScenario> CreateScenarioAsync(
        int accountFailures = 5,
        int ipFailures = 30,
        string environmentName = "IntegrationTesting",
        bool omitThrottleSecret = false,
        Action? passwordVerificationCallback = null)
    {
        var clock = new ControlledTimeProvider(InitialTime);
        var passwordHasher = new CountingPasswordHasher(passwordVerificationCallback);
        var options = new AuthenticationProtectionOptions
        {
            Login = new LoginThrottleOptions
            {
                AccountFailures = accountFailures,
                IpFailures = ipFailures,
                WindowSeconds = 900
            },
            KeyHashSecretFile = "/synthetic/authentication-key-hash.secret"
        };
        var factory = new IntegrationWebApplicationFactory(
            database,
            new IntegrationApplicationOptions
            {
                EnvironmentName = environmentName,
                TimeProvider = clock,
                ConfigureServices = services =>
                {
                    services.RemoveAll<IOptions<AuthenticationProtectionOptions>>();
                    services.AddSingleton<IOptions<AuthenticationProtectionOptions>>(
                        Options.Create(omitThrottleSecret
                            ? new AuthenticationProtectionOptions()
                            : options));
                    services.RemoveAll<ISecretFileReader>();
                    services.AddSingleton<ISecretFileReader>(new SyntheticSecretFileReader());
                    services.RemoveAll<IAuthenticationThrottleClock>();
                    services.AddSingleton<IAuthenticationThrottleClock>(
                        new TimeProviderAuthenticationThrottleClock(clock));
                    services.RemoveAll<IPasswordHasher<Usuario>>();
                    services.AddSingleton<IPasswordHasher<Usuario>>(passwordHasher);
                }
            });

        try
        {
            await factory.RecreateDatabaseAsync();
        }
        catch
        {
            await factory.DisposeAsync();
            throw;
        }
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = new Usuario
        {
            NomeCompleto = "Conta sintética para login",
            Email = Email,
            SenhaHash = string.Empty,
            NivelUsuario = NivelUsuario.Comum,
            TipoUsuario = TipoUsuario.Comum,
            Status = StatusUsuario.Habilitado
        };
        user.SenhaHash = passwordHasher.HashPassword(user, Password);
        context.Usuarios.Add(user);
        await context.SaveChangesAsync();

        return new LoginScenario(factory, passwordHasher, clock);
    }

    private static Task<HttpResponseMessage> LoginAsync(HttpClient client, string email, string password) =>
        client.PostAsJsonAsync("/api/Auth/login", new { email, password });

    private sealed record LoginScenario(
        IntegrationWebApplicationFactory Factory,
        CountingPasswordHasher PasswordHasher,
        ControlledTimeProvider Clock);

    private sealed class CountingPasswordHasher : IPasswordHasher<Usuario>
    {
        private readonly PasswordHasher<Usuario> _inner = new();
        private readonly Action? _onVerification;
        private int _verificationCount;

        public CountingPasswordHasher(Action? onVerification = null) => _onVerification = onVerification;

        public int VerificationCount => Volatile.Read(ref _verificationCount);

        public string HashPassword(Usuario user, string password) =>
            _inner.HashPassword(user, password);

        public PasswordVerificationResult VerifyHashedPassword(
            Usuario user,
            string hashedPassword,
            string providedPassword)
        {
            Interlocked.Increment(ref _verificationCount);
            _onVerification?.Invoke();
            return _inner.VerifyHashedPassword(user, hashedPassword, providedPassword);
        }
    }

    private sealed class SyntheticSecretFileReader : ISecretFileReader
    {
        private static readonly byte[] Secret = Enumerable.Range(0, 32).Select(value => (byte)value).ToArray();

        public byte[] ReadAllBytes(string path) => Secret.ToArray();
    }
}
