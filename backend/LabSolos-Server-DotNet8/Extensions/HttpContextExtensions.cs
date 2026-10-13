namespace LabSolos_Server_DotNet8.Extensions
{
    public static class HttpContextExtensions
    {
        public static string GetClientIpAddress(this HttpContext context)
        {
            ArgumentNullException.ThrowIfNull(context);

            return context.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
        }
    }
}
