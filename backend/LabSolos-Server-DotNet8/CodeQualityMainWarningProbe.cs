namespace LabSolos_Server_DotNet8;

public static class CodeQualityMainWarningProbe
{
    [Obsolete("Probe")]
    public static void ObsoleteMethod() { }

    public static void Trigger() { ObsoleteMethod(); }
}
