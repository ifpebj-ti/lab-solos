namespace LabSolos.Tests;

public static class CodeQualityWarningProbe
{
    public static int GetLength(string value)
    {
        return value.Length < 0 ? 1 : value.Length;
    }
}
