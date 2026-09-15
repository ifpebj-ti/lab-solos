using E2ESeed;

namespace Tests.Infrastructure;

public sealed class E2ESeedIsolationTests
{
    [Fact]
    public void ScenarioIdentityIsStableAndDisjoint()
    {
        var first = ScenarioIdentity.FromScenario("registration-a");
        var repeated = ScenarioIdentity.FromScenario("registration-a");
        var second = ScenarioIdentity.FromScenario("registration-b");

        Assert.Equal(first, repeated);
        Assert.NotEqual(first.Token, second.Token);
        Assert.DoesNotContain(
            new[] { second.AdministratorId, second.MentorId, second.BorrowerId, second.ProductId },
            value => value == first.AdministratorId || value == first.MentorId || value == first.BorrowerId || value == first.ProductId);
    }

    [Fact]
    public void ScenarioIdentityRejectsBlankValues()
    {
        Assert.Throws<ArgumentException>(() => ScenarioIdentity.FromScenario(" "));
    }
}
