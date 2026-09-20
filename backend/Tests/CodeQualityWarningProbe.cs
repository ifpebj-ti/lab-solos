namespace Tests;

// T007: fixture temporária para provar que Evaluate observa um Warning.
public static class CodeQualityWarningProbe
{
    public static bool Evaluate(string value)
    {
        if (true)
        {
            return value.Length >= 0;
        }

        return false;
    }
}
