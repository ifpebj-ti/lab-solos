using System.Text;

namespace LabSolos_Server_DotNet8.Services.Security;

public interface IPasswordPolicy
{
    PasswordPolicyResult Validate(string? password);
}

public sealed class PasswordPolicy : IPasswordPolicy
{
    public const int MinimumLength = 15;
    public const int MaximumLength = 128;

    private readonly HashSet<string> _blockedPasswords;

    public PasswordPolicy(IEnumerable<string> blockedPasswords)
    {
        ArgumentNullException.ThrowIfNull(blockedPasswords);

        _blockedPasswords = blockedPasswords
            .Where(entry => !string.IsNullOrEmpty(entry))
            .Select(NormalizeForComparison)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

    public PasswordPolicyResult Validate(string? password)
    {
        if (string.IsNullOrEmpty(password))
        {
            return PasswordPolicyResult.Invalid("password_required");
        }

        var length = password.EnumerateRunes().Count();
        if (length < MinimumLength)
        {
            return PasswordPolicyResult.Invalid("password_too_short");
        }

        if (length > MaximumLength)
        {
            return PasswordPolicyResult.Invalid("password_too_long");
        }

        if (_blockedPasswords.Contains(NormalizeForComparison(password)))
        {
            return PasswordPolicyResult.Invalid("password_common");
        }

        return PasswordPolicyResult.Valid;
    }

    private static string NormalizeForComparison(string value) =>
        value.Normalize(NormalizationForm.FormKC);
}

public static class PasswordBlocklist
{
    public static IReadOnlyCollection<string> Load(Stream? blocklistStream)
    {
        if (blocklistStream is null)
        {
            throw BlocklistUnavailable();
        }

        try
        {
            using var reader = new StreamReader(
                blocklistStream,
                Encoding.UTF8,
                detectEncodingFromByteOrderMarks: true,
                leaveOpen: false);

            var entries = new List<string>();
            while (reader.ReadLine() is { } line)
            {
                if (line.Length > 0 && !line.StartsWith('#'))
                {
                    entries.Add(line);
                }
            }

            if (entries.Count == 0)
            {
                throw BlocklistUnavailable();
            }

            return entries;
        }
        catch (InvalidOperationException)
        {
            throw;
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            throw BlocklistUnavailable();
        }
    }

    private static InvalidOperationException BlocklistUnavailable() =>
        new("password_blocklist_unavailable: não foi possível carregar a lista local de senhas comuns.");
}
