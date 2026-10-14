using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.BackgroundServices;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSql15IntegrationGroup.Name)]
public sealed class AuthenticationProtectionHarnessTests(PostgreSql15ContainerFixture database)
{
    [Fact]
    public async Task FactoryRecreatesDatabaseThroughMigrations()
    {
        var clock = CreateClock();
        await using var factory = CreateFactory(database, clock);
        _ = factory.Services.GetRequiredService<TimeProvider>();

        await factory.RecreateDatabaseAsync();

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        Assert.True(context.Database.IsNpgsql());
        Assert.NotEmpty(await context.Database.GetAppliedMigrationsAsync());
    }

    [Fact]
    public async Task TwoFactoriesShareDatabaseClockAndSimulatedEmailWithSelectedWorkers()
    {
        var clock = CreateClock();
        var simulatedEmail = new SimulatedEmailService();
        var options = new IntegrationApplicationOptions
        {
            TimeProvider = clock,
            EmailService = simulatedEmail,
            BackgroundServicesToRun = new HashSet<Type> { typeof(ControllableTestWorker) },
            ConfigureServices = services =>
            {
                services.AddSingleton<IHostedService, ControllableTestWorker>();
            }
        };

        var startsBeforeFactories = ControllableTestWorker.TotalStartCount;
        await using var firstFactory = new IntegrationWebApplicationFactory(database, options);
        await using var secondFactory = new IntegrationWebApplicationFactory(database, options);
        await firstFactory.RecreateDatabaseAsync();

        var scenario = AuthenticationProtectionScenarioData.Create("shared-factories");
        await PersistScenarioAsync(firstFactory, scenario);

        Assert.Same(clock, firstFactory.Services.GetRequiredService<TimeProvider>());
        Assert.Same(clock, secondFactory.Services.GetRequiredService<TimeProvider>());
        Assert.Same(simulatedEmail, firstFactory.Services.GetRequiredService<IEmailService>());
        Assert.Same(simulatedEmail, secondFactory.Services.GetRequiredService<IEmailService>());

        simulatedEmail.EnviarEmail("synthetic@integration.test", "synthetic subject", "synthetic body");
        Assert.Equal(1, simulatedEmail.SentCount);

        Assert.Equal(startsBeforeFactories + 2, ControllableTestWorker.TotalStartCount);
        var hostedServices = firstFactory.Services.GetServices<IHostedService>().ToList();
        Assert.Contains(hostedServices, service => service is ControllableTestWorker);
        Assert.DoesNotContain(hostedServices, service => service is EmprestimosVencidosBackgroundService);

        await using var scope = secondFactory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(5, await context.Usuarios.CountAsync());
    }

    [Fact]
    public async Task ResettingSharedDatabaseMigratesAndIsolatesSyntheticScenarios()
    {
        var firstClock = CreateClock();
        var secondClock = CreateClock();
        await using var firstFactory = CreateFactory(database, firstClock);
        await using var secondFactory = CreateFactory(database, secondClock);

        var firstScenario = AuthenticationProtectionScenarioData.Create("scenario-first");
        await firstFactory.RecreateDatabaseAsync();
        await PersistScenarioAsync(firstFactory, firstScenario);

        var secondScenario = AuthenticationProtectionScenarioData.Create("scenario-second");
        await secondFactory.RecreateDatabaseAsync();
        await PersistScenarioAsync(secondFactory, secondScenario);

        var firstKeys = SyntheticAuthenticationProtectionKeys.Create(firstScenario.ScenarioKey);
        var secondKeys = SyntheticAuthenticationProtectionKeys.Create(secondScenario.ScenarioKey);
        Assert.Equal(32, firstKeys.ThrottleHmacKey.Length);
        Assert.Equal(32, firstKeys.RecoveryEncryptionKey.Length);
        Assert.False(firstKeys.ThrottleHmacKey.SequenceEqual(secondKeys.ThrottleHmacKey));
        Assert.False(firstKeys.RecoveryEncryptionKey.SequenceEqual(secondKeys.RecoveryEncryptionKey));

        await using var scope = firstFactory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var persistedUsers = await context.Usuarios.AsNoTracking().ToListAsync();
        Assert.Equal(5, persistedUsers.Count);
        Assert.DoesNotContain(persistedUsers, user => user.Email == firstScenario.AdministratorEmail);
        Assert.Contains(persistedUsers, user => user.Email == secondScenario.AdministratorEmail);
        Assert.Equal(2, persistedUsers.Count(user => user.NivelUsuario == NivelUsuario.Mentor));
        Assert.Equal(2, persistedUsers.Count(user => user.NivelUsuario == NivelUsuario.Mentorado));

        var firstMentee = await context.Academicos.AsNoTracking()
            .SingleAsync(user => user.Id == secondScenario.MenteeOneId);
        var secondMentee = await context.Academicos.AsNoTracking()
            .SingleAsync(user => user.Id == secondScenario.MenteeTwoId);
        Assert.Equal(secondScenario.MentorOneId, firstMentee.ResponsavelId);
        Assert.Equal(secondScenario.MentorTwoId, secondMentee.ResponsavelId);
    }

    private static ControlledTimeProvider CreateClock() =>
        new(new DateTimeOffset(2026, 10, 13, 12, 0, 0, TimeSpan.Zero));

    private static IntegrationWebApplicationFactory CreateFactory(
        IPostgreSqlDatabaseFixture database,
        ControlledTimeProvider clock) =>
        new(database, new IntegrationApplicationOptions { TimeProvider = clock });

    private static async Task PersistScenarioAsync(
        IntegrationWebApplicationFactory factory,
        AuthenticationProtectionScenarioData scenario)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<Usuario>>();
        await scenario.PersistAsync(context, hasher);
    }

    private sealed class ControllableTestWorker : IHostedService
    {
        private static int _totalStartCount;

        public static int TotalStartCount => Volatile.Read(ref _totalStartCount);

        public Task StartAsync(CancellationToken cancellationToken)
        {
            Interlocked.Increment(ref _totalStartCount);
            return Task.CompletedTask;
        }

        public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }
}
