using System;

namespace LabSolos_Server_DotNet8;

public static class CodeQualityMainWarningProbe
{
    public static void Trigger(string? value)
    {
        if (value != null || value.Length > 0)
            Console.WriteLine(value);
    }
}
