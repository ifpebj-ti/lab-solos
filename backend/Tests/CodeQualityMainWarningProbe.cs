using System;
using System.Collections.Generic;

namespace LabSolos.Tests;

public static class CodeQualityMainWarningProbe
{
    public static void Emit(IEnumerable<int> values)
    {
        foreach (var value in values)
        {
            var mapped = value * 2;
            Console.WriteLine(mapped);
        }
    }
}