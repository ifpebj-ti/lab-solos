using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.Extensions.DependencyInjection;

namespace Tests.Security;

public sealed class PasswordBlocklistTests
{
    [Fact]
    public void Load_fails_with_a_sanitized_error_when_resource_is_missing()
    {
        var exception = Assert.Throws<InvalidOperationException>(() => PasswordBlocklist.Load(null));

        Assert.Equal(
            "password_blocklist_unavailable: não foi possível carregar a lista local de senhas comuns.",
            exception.Message);
    }

    [Fact]
    public void Load_fails_when_resource_has_no_entries()
    {
        using var stream = new MemoryStream("# metadata only\n"u8.ToArray());

        var exception = Assert.Throws<InvalidOperationException>(() => PasswordBlocklist.Load(stream));

        Assert.Contains("password_blocklist_unavailable", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void AddPasswordSecurity_registers_the_single_password_policy()
    {
        var services = new ServiceCollection();

        services.AddPasswordSecurity();

        using var provider = services.BuildServiceProvider();
        var first = provider.GetRequiredService<IPasswordPolicy>();
        var second = provider.GetRequiredService<IPasswordPolicy>();

        Assert.Same(first, second);
        Assert.Equal("password_common", first.Validate("correct horse battery staple").Code);
    }
}
