using System.Security.Cryptography;
using System.Text;

namespace E2ESeed;

public sealed record ScenarioIdentity(
    string Scenario,
    string Token,
    int AdministratorId,
    int MentorId,
    int BorrowerId,
    int ProductId)
{
    public static ScenarioIdentity FromScenario(string scenario)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(scenario);
        var digest = SHA256.HashData(Encoding.UTF8.GetBytes(scenario));
        var token = Convert.ToHexString(digest)[..12].ToLowerInvariant();
        var block = 10_000 + (BitConverter.ToUInt32(digest, 0) % 80_000) * 10;

        return new ScenarioIdentity(
            scenario,
            token,
            checked((int)block + 1),
            checked((int)block + 2),
            checked((int)block + 3),
            checked((int)block + 4));
    }
}
