using Microsoft.Extensions.DependencyInjection;
using LabSolos_Server_DotNet8.Models;
using Microsoft.AspNetCore.Identity;

namespace LabSolos_Server_DotNet8.Services.Security;

public static class SecurityServiceCollectionExtensions
{
    private const string BlocklistResourceSuffix = ".Resources.Security.common-passwords.txt";

    public static IServiceCollection AddPasswordSecurity(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        var assembly = typeof(PasswordPolicy).Assembly;
        var resourceName = assembly.GetManifestResourceNames()
            .SingleOrDefault(name => name.EndsWith(BlocklistResourceSuffix, StringComparison.Ordinal));
        var blocklist = PasswordBlocklist.Load(
            resourceName is null ? null : assembly.GetManifestResourceStream(resourceName));
        var policy = new PasswordPolicy(blocklist);

        services.AddSingleton<IPasswordPolicy>(policy);
        services.AddSingleton<IPasswordHasher<Usuario>, PasswordHasher<Usuario>>();
        services.AddSingleton<CredentialTelemetry>();
        services.AddScoped<ICredentialService, CredentialService>();
        services.AddAuthorization(options =>
            options.AddPolicy(
                CredentialAuthorizationPolicies.ChangeOwnPassword,
                authorization => authorization.RequireAuthenticatedUser()));
        return services;
    }
}

public static class CredentialAuthorizationPolicies
{
    public const string ChangeOwnPassword = "PodeAlterarPropriaSenha";
}
