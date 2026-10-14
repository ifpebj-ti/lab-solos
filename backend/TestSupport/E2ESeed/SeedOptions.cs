using System.Text.RegularExpressions;
using Npgsql;

namespace E2ESeed;

public sealed record SeedCredentials(
    string AdminEmail,
    string AdminPassword,
    string MentorEmail,
    string MentorPassword,
    string BorrowerEmail,
    string BorrowerPassword,
    string SecondMentorEmail,
    string SecondMentorPassword,
    string SecondBorrowerEmail,
    string SecondBorrowerPassword);

public sealed partial record SeedOptions(
    string Scenario,
    string EnvironmentName,
    string ConnectionString,
    SeedCredentials Credentials,
    bool IsHelp = false)
{
    public const string EnvironmentVariable = "E2E_SEED_ENVIRONMENT";
    public const string ConnectionVariable = "E2E_SEED_CONNECTION_STRING";
    public const string AdminEmailVariable = "E2E_SEED_ADMIN_EMAIL";
    public const string AdminPasswordVariable = "E2E_SEED_ADMIN_PASSWORD";
    public const string MentorEmailVariable = "E2E_SEED_MENTOR_EMAIL";
    public const string MentorPasswordVariable = "E2E_SEED_MENTOR_PASSWORD";
    public const string BorrowerEmailVariable = "E2E_SEED_BORROWER_EMAIL";
    public const string BorrowerPasswordVariable = "E2E_SEED_BORROWER_PASSWORD";
    public const string SecondMentorEmailVariable = "E2E_SEED_SECOND_MENTOR_EMAIL";
    public const string SecondMentorPasswordVariable = "E2E_SEED_SECOND_MENTOR_PASSWORD";
    public const string SecondBorrowerEmailVariable = "E2E_SEED_SECOND_BORROWER_EMAIL";
    public const string SecondBorrowerPasswordVariable = "E2E_SEED_SECOND_BORROWER_PASSWORD";

    public static SeedOptions Parse(
        IReadOnlyList<string> args,
        IReadOnlyDictionary<string, string?> environment)
    {
        ArgumentNullException.ThrowIfNull(args);
        ArgumentNullException.ThrowIfNull(environment);

        if (args.Count == 1 && string.Equals(args[0], "--help", StringComparison.Ordinal))
        {
            return new SeedOptions(string.Empty, string.Empty, string.Empty,
                new SeedCredentials(string.Empty, string.Empty, string.Empty, string.Empty, string.Empty, string.Empty,
                    string.Empty, string.Empty, string.Empty, string.Empty),
                true);
        }

        if (args.Count != 2 || !string.Equals(args[0], "--scenario", StringComparison.Ordinal))
        {
            throw new ArgumentException("Uso: --scenario <identificador>.");
        }

        var scenario = args[1].Trim();
        if (!ScenarioPattern().IsMatch(scenario))
        {
            throw new ArgumentException("O identificador de cenário deve ser alfanumérico e ter até 64 caracteres.");
        }

        var environmentName = Required(environment, EnvironmentVariable);
        if (!string.Equals(environmentName, "E2E", StringComparison.Ordinal))
        {
            throw new InvalidOperationException("O utilitário só aceita E2E_SEED_ENVIRONMENT=E2E.");
        }

        var connectionString = Required(environment, ConnectionVariable);
        ValidateConnection(connectionString);

        var secondMentorEmail = Optional(environment, SecondMentorEmailVariable);
        var secondMentorPassword = Optional(environment, SecondMentorPasswordVariable);
        var secondBorrowerEmail = Optional(environment, SecondBorrowerEmailVariable);
        var secondBorrowerPassword = Optional(environment, SecondBorrowerPasswordVariable);
        var secondScenarioCredentials = new[]
        {
            secondMentorEmail,
            secondMentorPassword,
            secondBorrowerEmail,
            secondBorrowerPassword
        };
        if (secondScenarioCredentials.Any(value => value is not null) &&
            secondScenarioCredentials.Any(string.IsNullOrWhiteSpace))
        {
            throw new InvalidOperationException("As credenciais do segundo vínculo E2E devem ser fornecidas em conjunto.");
        }

        return new SeedOptions(
            scenario,
            environmentName,
            connectionString,
            new SeedCredentials(
                Required(environment, AdminEmailVariable),
                Required(environment, AdminPasswordVariable),
                Required(environment, MentorEmailVariable),
                Required(environment, MentorPasswordVariable),
                Required(environment, BorrowerEmailVariable),
                Required(environment, BorrowerPasswordVariable),
                secondMentorEmail ?? $"synthetic-second-mentor-{scenario}@example.invalid",
                secondMentorPassword ?? $"synthetic-second-mentor-{scenario}-password",
                secondBorrowerEmail ?? $"synthetic-second-borrower-{scenario}@example.invalid",
                secondBorrowerPassword ?? $"synthetic-second-borrower-{scenario}-password"));
    }

    public static void ValidateConnection(string connectionString)
    {
        try
        {
            var parsed = new NpgsqlConnectionStringBuilder(connectionString);
            if (!string.Equals(parsed.Host, "db", StringComparison.OrdinalIgnoreCase) ||
                !string.Equals(parsed.Database, "lab_solos_e2e", StringComparison.Ordinal) ||
                !string.Equals(parsed.Username, "lab_solos_e2e", StringComparison.Ordinal) ||
                string.IsNullOrWhiteSpace(parsed.Password))
            {
                throw new InvalidOperationException("A conexão não pertence ao banco sintético do Compose.");
            }
        }
        catch (ArgumentException exception)
        {
            throw new InvalidOperationException("A conexão sintética é inválida.", exception);
        }
    }

    [GeneratedRegex("^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$", RegexOptions.CultureInvariant)]
    private static partial Regex ScenarioPattern();

    private static string Required(
        IReadOnlyDictionary<string, string?> environment,
        string name)
    {
        if (!environment.TryGetValue(name, out var value) || string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException($"Variável obrigatória ausente: {name}.");
        }

        return value.Trim();
    }

    private static string? Optional(
        IReadOnlyDictionary<string, string?> environment,
        string name) =>
        environment.TryGetValue(name, out var value) && !string.IsNullOrWhiteSpace(value)
            ? value.Trim()
            : null;
}
