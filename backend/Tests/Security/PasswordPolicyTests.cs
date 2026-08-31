using System.Text.Json;
using LabSolos_Server_DotNet8.Services.Security;

namespace Tests.Security;

public sealed class PasswordPolicyTests
{
    private static readonly string[] BlockedPasswords = ["correct horse battery staple"];

    [Theory]
    [InlineData(null, "password_required")]
    [InlineData("", "password_required")]
    [InlineData("aaaaaaaaaaaaaa", "password_too_short")]
    [InlineData("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "password_too_long")]
    [InlineData("correct horse battery staple", "password_common")]
    public void Validate_rejects_invalid_passwords_with_stable_codes(string? password, string expectedCode)
    {
        var policy = new PasswordPolicy(BlockedPasswords);

        var result = policy.Validate(password);

        Assert.False(result.IsValid);
        Assert.Equal(expectedCode, result.Code);
    }

    [Theory]
    [MemberData(nameof(ValidPasswords))]
    public void Validate_accepts_boundaries_unicode_and_passwords_without_composition_rules(string password)
    {
        var policy = new PasswordPolicy(BlockedPasswords);

        var result = policy.Validate(password);

        Assert.True(result.IsValid);
        Assert.Null(result.Code);
    }

    [Theory]
    [InlineData("CORRECT HORSE BATTERY STAPLE")]
    [InlineData("ｃorrect horse battery staple")]
    public void Validate_compares_blocklist_using_form_kc_and_ordinal_ignore_case(string password)
    {
        var policy = new PasswordPolicy(BlockedPasswords);

        var result = policy.Validate(password);

        Assert.False(result.IsValid);
        Assert.Equal("password_common", result.Code);
    }

    [Fact]
    public void Result_never_exposes_the_password()
    {
        const string secret = "a-unique-secret-value";
        var policy = new PasswordPolicy([secret]);

        var serializedResult = JsonSerializer.Serialize(policy.Validate(secret));

        Assert.DoesNotContain(secret, serializedResult, StringComparison.Ordinal);
    }

    public static TheoryData<string> ValidPasswords => new()
    {
        new string('a', 15),
        new string('a', 128),
        string.Concat(Enumerable.Repeat("🧪", 15)),
        new string(' ', 15),
        "only lowercase words are valid",
    };
}
