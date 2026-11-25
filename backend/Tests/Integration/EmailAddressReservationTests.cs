using System.Security.Cryptography;
using System.Text;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.Extensions.DependencyInjection;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class EmailAddressReservationTests(PostgreSqlContainerFixture database)
{
    private static readonly byte[] KeyHashSecret = SHA256.HashData(
        Encoding.UTF8.GetBytes("T010 synthetic reservation key for isolated tests"));

    [Theory]
    [InlineData(" Person@Example.Invalid ", "person@example.invalid")]
    [InlineData("UPPER.CASE@EXAMPLE.INVALID", "upper.case@example.invalid")]
    public void NormalizeUsesTrimmedInvariantLowercase(string address, string expected)
    {
        Assert.Equal(expected, EmailAddressReservationService.Normalize(address));
    }

    [Fact]
    public async Task ReservationBelongsToItsOwnerUntilTheExactSevenDayBoundary()
    {
        var clock = new ControlledTimeProvider(new DateTimeOffset(2026, 11, 1, 12, 0, 0, TimeSpan.Zero));
        var factory = new IntegrationWebApplicationFactory(database, new IntegrationApplicationOptions
        {
            TimeProvider = clock,
            ConfigureServices = services => services.AddSingleton<ThrottleKeyFactory>(
                _ => new ThrottleKeyFactory(KeyHashSecret, "IntegrationTesting"))
        });
        await using (factory)
        {
            await factory.RecreateDatabaseAsync();
            var scenario = AuthenticationProtectionScenarioData.Create($"T010-{Guid.NewGuid():N}");
            await using (var seedScope = factory.Services.CreateAsyncScope())
            {
                var seedContext = seedScope.ServiceProvider.GetRequiredService<AppDbContext>();
                var hasher = seedScope.ServiceProvider.GetRequiredService<Microsoft.AspNetCore.Identity.IPasswordHasher<
                    LabSolos_Server_DotNet8.Models.Usuario>>();
                await scenario.PersistAsync(seedContext, hasher);
            }

            await using var scope = factory.Services.CreateAsyncScope();
            var service = scope.ServiceProvider.GetRequiredService<EmailAddressReservationService>();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await service.ReserveFormerAddressAsync(
                "former-address@example.invalid", scenario.MenteeOneId, clock.GetUtcNow());
            await context.SaveChangesAsync();

            Assert.False(await service.IsUnavailableToAsync("FORMER-ADDRESS@example.invalid", scenario.MenteeOneId));
            Assert.True(await service.IsUnavailableToAsync("former-address@example.invalid", scenario.MenteeTwoId));
            Assert.True(await service.IsUnavailableToAsync("former-address@example.invalid", accountId: null));

            clock.Advance(TimeSpan.FromDays(7) - TimeSpan.FromTicks(1));
            Assert.True(await service.IsUnavailableToAsync("former-address@example.invalid", scenario.MenteeTwoId));

            clock.Advance(TimeSpan.FromTicks(1));
            Assert.False(await service.IsUnavailableToAsync("FORMER-ADDRESS@example.invalid", scenario.MenteeTwoId));
        }
    }
}
