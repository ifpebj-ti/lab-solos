using System.Net;
using LabSolos_Server_DotNet8.Services.Security;

namespace Tests.Security;

public sealed class ThrottleKeyFactoryTests
{
    private static readonly byte[] Secret = Enumerable.Range(1, 32).Select(value => (byte)value).ToArray();

    [Fact]
    public void RecipientQuotaKeysIgnoreOuterWhitespaceAndCase()
    {
        var factory = new ThrottleKeyFactory(Secret, "Production");

        var first = factory.CreateRecipientQuotaKey(ThrottlePurpose.Login, "  User.Name+tag@Example.COM ");
        var equivalent = factory.CreateRecipientQuotaKey(ThrottlePurpose.Login, "user.name+tag@example.com");

        Assert.Equal(first, equivalent);
    }

    [Fact]
    public void RecipientQuotaNormalizationPreservesDotsAndPlusTags()
    {
        var factory = new ThrottleKeyFactory(Secret, "Production");

        var dottedAndTagged = factory.CreateRecipientQuotaKey(ThrottlePurpose.RecoveryRequest, "first.last+lab@example.com");
        var withoutDotAndTag = factory.CreateRecipientQuotaKey(ThrottlePurpose.RecoveryRequest, "firstlast@example.com");

        Assert.NotEqual(dottedAndTagged, withoutDotAndTag);
    }

    [Fact]
    public void ExactDeliveryKeyIsDistinctFromTheNormalizedQuotaKey()
    {
        var factory = new ThrottleKeyFactory(Secret, "Production");

        var quotaKey = factory.CreateRecipientQuotaKey(ThrottlePurpose.RecoveryRequest, " User@Example.com ");
        var exactDeliveryKey = factory.CreateRecoveryDeliveryKey(" User@Example.com ");

        Assert.NotEqual(quotaKey, exactDeliveryKey);
        Assert.NotEqual(
            factory.CreateRecoveryDeliveryKey("User@Example.com"),
            exactDeliveryKey);
    }

    [Fact]
    public void IpKeyCanonicalizesIpv4MappedIpv6()
    {
        var factory = new ThrottleKeyFactory(Secret, "Production");

        var ipv4 = factory.CreateIpQuotaKey(ThrottlePurpose.Login, IPAddress.Parse("192.0.2.18"));
        var mappedIpv4 = factory.CreateIpQuotaKey(ThrottlePurpose.Login, IPAddress.Parse("::ffff:192.0.2.18"));

        Assert.Equal(ipv4, mappedIpv4);
    }

    [Fact]
    public void MissingIpUsesOneConservativeKeyPerPurpose()
    {
        var factory = new ThrottleKeyFactory(Secret, "Production");

        var firstMissing = factory.CreateIpQuotaKey(ThrottlePurpose.Login, null);
        var secondMissing = factory.CreateIpQuotaKey(ThrottlePurpose.Login, null);
        var knownIp = factory.CreateIpQuotaKey(ThrottlePurpose.Login, IPAddress.Parse("192.0.2.19"));

        Assert.Equal(firstMissing, secondMissing);
        Assert.NotEqual(firstMissing, knownIp);
    }

    [Fact]
    public void EnvironmentAndPurposeArePartOfTheHmacDomain()
    {
        var production = new ThrottleKeyFactory(Secret, "Production");
        var development = new ThrottleKeyFactory(Secret, "Development");
        var email = "user@example.com";

        Assert.NotEqual(
            production.CreateRecipientQuotaKey(ThrottlePurpose.Login, email),
            development.CreateRecipientQuotaKey(ThrottlePurpose.Login, email));
        Assert.NotEqual(
            production.CreateRecipientQuotaKey(ThrottlePurpose.Login, email),
            production.CreateRecipientQuotaKey(ThrottlePurpose.RecoveryCode, email));
    }

    [Fact]
    public void RecipientAndIpDimensionsProduceDifferentKeys()
    {
        var factory = new ThrottleKeyFactory(Secret, "Production");

        var recipientKey = factory.CreateRecipientQuotaKey(ThrottlePurpose.Login, "192.0.2.18");
        var ipKey = factory.CreateIpQuotaKey(ThrottlePurpose.Login, IPAddress.Parse("192.0.2.18"));

        Assert.NotEqual(recipientKey, ipKey);
    }

    [Fact]
    public void RecipientIdentifiersLongerThanThePublicLimitAreRejected()
    {
        var factory = new ThrottleKeyFactory(Secret, "Production");

        var error = Assert.Throws<ArgumentException>(() => factory.CreateRecipientQuotaKey(
            ThrottlePurpose.Login,
            new string('a', 255)));

        Assert.DoesNotContain(new string('a', 255), error.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void DisposedFactoryRejectsFurtherKeyCreation()
    {
        var factory = new ThrottleKeyFactory(Secret, "Production");
        factory.Dispose();

        Assert.Throws<ObjectDisposedException>(() => factory.CreateIpQuotaKey(ThrottlePurpose.Login, null));
    }

    [Fact]
    public void ConstructorRejectsAShortHashSecret()
    {
        var error = Assert.Throws<ArgumentException>(() => new ThrottleKeyFactory(new byte[31], "Production"));

        Assert.DoesNotContain(Convert.ToBase64String(new byte[31]), error.Message, StringComparison.Ordinal);
    }
}
