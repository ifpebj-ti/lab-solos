using E2ESeed;

namespace Tests.Infrastructure;

public sealed class E2ESeedSafetyTests
{
    private static readonly string[] ScenarioArguments = ["--scenario", "scenario-a"];
    private static readonly string[] HelpArguments = ["--help"];

    [Fact]
    public void ParserAcceptsOnlyTheSyntheticE2eContract()
    {
        var options = SeedOptions.Parse(
            ScenarioArguments,
            Environment("E2E"));

        Assert.Equal("scenario-a", options.Scenario);
        Assert.Equal("E2E", options.EnvironmentName);
        Assert.Equal("db", new Npgsql.NpgsqlConnectionStringBuilder(options.ConnectionString).Host);
    }

    [Fact]
    public void ParserRejectsNonE2eEnvironment()
    {
        var exception = Assert.Throws<InvalidOperationException>(() =>
            SeedOptions.Parse(ScenarioArguments, Environment("Development")));

        Assert.Contains("E2E_SEED_ENVIRONMENT", exception.Message);
    }

    [Fact]
    public void ParserRejectsConnectionOutsideTheComposeDatabase()
    {
        var values = Environment("E2E");
        values[SeedOptions.ConnectionVariable] =
            "Host=localhost;Database=lab_solos_e2e;Username=lab_solos_e2e;Password=synthetic";

        Assert.Throws<InvalidOperationException>(() =>
            SeedOptions.Parse(ScenarioArguments, values));
    }

    [Fact]
    public void ParserDoesNotAcceptCredentialsAsArguments()
    {
        const string secret = "not-allowed-in-arguments";
        var exception = Assert.Throws<ArgumentException>(() =>
            SeedOptions.Parse(["--scenario", "scenario-a", secret], Environment("E2E")));

        Assert.DoesNotContain(secret, exception.Message);
    }

    [Fact]
    public void HelpIsAvailableWithoutDatabaseCredentials()
    {
        var options = SeedOptions.Parse(HelpArguments, new Dictionary<string, string?>());

        Assert.True(options.IsHelp);
    }

    private static Dictionary<string, string?> Environment(string environmentName) => new()
    {
        [SeedOptions.EnvironmentVariable] = environmentName,
        [SeedOptions.ConnectionVariable] = "Host=db;Database=lab_solos_e2e;Username=lab_solos_e2e;Password=synthetic-password",
        [SeedOptions.AdminEmailVariable] = "admin@example.invalid",
        [SeedOptions.AdminPasswordVariable] = "synthetic-admin-password",
        [SeedOptions.MentorEmailVariable] = "mentor@example.invalid",
        [SeedOptions.MentorPasswordVariable] = "synthetic-mentor-password",
        [SeedOptions.BorrowerEmailVariable] = "borrower@example.invalid",
        [SeedOptions.BorrowerPasswordVariable] = "synthetic-borrower-password"
    };
}
