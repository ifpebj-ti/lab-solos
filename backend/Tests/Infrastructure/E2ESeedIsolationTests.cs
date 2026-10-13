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
        var firstIds = new[]
        {
            first.AdministratorId, first.MentorId, first.BorrowerId,
            first.SecondMentorId, first.SecondBorrowerId, first.ProductId
        };
        Assert.Equal(firstIds.Length, firstIds.Distinct().Count());
        Assert.DoesNotContain(
            new[]
            {
                second.AdministratorId, second.MentorId, second.BorrowerId,
                second.SecondMentorId, second.SecondBorrowerId, second.ProductId
            },
            firstIds.Contains);
    }

    [Fact]
    public void ScenarioIdentityRejectsBlankValues()
    {
        Assert.Throws<ArgumentException>(() => ScenarioIdentity.FromScenario(" "));
    }
}
