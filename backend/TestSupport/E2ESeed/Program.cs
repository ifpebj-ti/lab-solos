using E2ESeed;

var environment = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
{
    [SeedOptions.EnvironmentVariable] = Environment.GetEnvironmentVariable(SeedOptions.EnvironmentVariable),
    [SeedOptions.ConnectionVariable] = Environment.GetEnvironmentVariable(SeedOptions.ConnectionVariable),
    [SeedOptions.AdminEmailVariable] = Environment.GetEnvironmentVariable(SeedOptions.AdminEmailVariable),
    [SeedOptions.AdminPasswordVariable] = Environment.GetEnvironmentVariable(SeedOptions.AdminPasswordVariable),
    [SeedOptions.MentorEmailVariable] = Environment.GetEnvironmentVariable(SeedOptions.MentorEmailVariable),
    [SeedOptions.MentorPasswordVariable] = Environment.GetEnvironmentVariable(SeedOptions.MentorPasswordVariable),
    [SeedOptions.BorrowerEmailVariable] = Environment.GetEnvironmentVariable(SeedOptions.BorrowerEmailVariable),
    [SeedOptions.BorrowerPasswordVariable] = Environment.GetEnvironmentVariable(SeedOptions.BorrowerPasswordVariable),
    [SeedOptions.SecondMentorEmailVariable] = Environment.GetEnvironmentVariable(SeedOptions.SecondMentorEmailVariable),
    [SeedOptions.SecondMentorPasswordVariable] = Environment.GetEnvironmentVariable(SeedOptions.SecondMentorPasswordVariable),
    [SeedOptions.SecondBorrowerEmailVariable] = Environment.GetEnvironmentVariable(SeedOptions.SecondBorrowerEmailVariable),
    [SeedOptions.SecondBorrowerPasswordVariable] = Environment.GetEnvironmentVariable(SeedOptions.SecondBorrowerPasswordVariable)
};

try
{
    return await E2eSeedRunner.RunAsync(args, environment);
}
catch (Exception exception)
{
    Console.Error.WriteLine($"e2e_seed_failed: {exception.GetType().Name}");
    return 2;
}
