using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.DTOs.Notificacoes;
using LabSolos_Server_DotNet8.Services.Security;

namespace Tests.Services;

public sealed class NotificationQuotaPolicyTests
{
    private static readonly byte[] HmacSecret = Enumerable.Range(1, 32).Select(value => (byte)value).ToArray();

    [Fact]
    public void ManualQuotaIsThirtyAcceptedEmissionsPerAdministratorPerHour()
    {
        using var keyFactory = new ThrottleKeyFactory(HmacSecret, "IntegrationTesting");

        var firstAdministrator = NotificationQuotaPolicy.CreateManualRule(42, keyFactory);
        var secondAdministrator = NotificationQuotaPolicy.CreateManualRule(43, keyFactory);

        Assert.Equal(AuthenticationProtectionCapacity.NotificationManualAdministrator, firstAdministrator.Scope);
        Assert.Equal(30, firstAdministrator.Limit);
        Assert.Equal(TimeSpan.FromHours(1), firstAdministrator.Window);
        Assert.True(firstAdministrator.CountOnAccepted);
        Assert.Equal(32, firstAdministrator.KeyHash.Length);
        Assert.NotEqual(firstAdministrator.KeyHash, secondAdministrator.KeyHash);
    }

    [Fact]
    public void AutomaticQuotaIsSixtyAcceptedEmissionsPerStableServicePerHour()
    {
        using var keyFactory = new ThrottleKeyFactory(HmacSecret, "IntegrationTesting");

        var firstIdentity = NotificationQuotaPolicy.CreateAutomaticRule("lab-solos-notification-service", keyFactory);
        var sameIdentity = NotificationQuotaPolicy.CreateAutomaticRule("lab-solos-notification-service", keyFactory);
        var otherIdentity = NotificationQuotaPolicy.CreateAutomaticRule("lab-solos.cleanup-service", keyFactory);

        Assert.Equal(AuthenticationProtectionCapacity.NotificationAutomaticService, firstIdentity.Scope);
        Assert.Equal(60, firstIdentity.Limit);
        Assert.Equal(TimeSpan.FromHours(1), firstIdentity.Window);
        Assert.True(firstIdentity.CountOnAccepted);
        Assert.Equal(firstIdentity.KeyHash, sameIdentity.KeyHash);
        Assert.NotEqual(firstIdentity.KeyHash, otherIdentity.KeyHash);
        Assert.DoesNotContain("lab-solos-notification-service", Convert.ToHexString(firstIdentity.KeyHash), StringComparison.Ordinal);
    }

    [Fact]
    public void ManualAndAutomaticQuotasUseSeparateScopesAndHmacDomains()
    {
        using var keyFactory = new ThrottleKeyFactory(HmacSecret, "IntegrationTesting");

        var manual = NotificationQuotaPolicy.CreateManualRule(42, keyFactory);
        var automatic = NotificationQuotaPolicy.CreateAutomaticRule("42", keyFactory);

        Assert.NotEqual(manual.Scope, automatic.Scope);
        Assert.NotEqual(manual.KeyHash, automatic.KeyHash);
    }

    [Fact]
    public void AutomaticQuotaRequiresAnInternalServiceIdentity()
    {
        using var keyFactory = new ThrottleKeyFactory(HmacSecret, "IntegrationTesting");

        Assert.Throws<ArgumentException>(() =>
            NotificationQuotaPolicy.CreateAutomaticRule(" \r\n ", keyFactory));
        Assert.Throws<ArgumentOutOfRangeException>(() =>
            keyFactory.CreateServiceQuotaKey(ThrottlePurpose.NotificationManual, "internal-service"));
    }

    [Fact]
    public void PublicCreationDtoCannotChooseTheTrustedProcessIdentity()
    {
        Assert.Null(typeof(CreateNotificacaoDTO).GetProperty("IdentidadeProcesso"));
        Assert.Null(typeof(CreateNotificacaoDTO).GetProperty("OrigemConfiavel"));
    }
}
