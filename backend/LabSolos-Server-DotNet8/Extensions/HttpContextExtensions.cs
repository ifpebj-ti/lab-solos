namespace LabSolos_Server_DotNet8.Extensions
{
    public static class HttpContextExtensions
    {
        public static string GetClientIpAddress(this HttpContext context)
        {
            // Verifica os headers de proxy mais comuns (em ordem de prioridade)
            var headers = new[]
            {
                "X-Forwarded-For",      // Nginx, Apache, AWS ELB
                "X-Real-IP",            // Nginx
                "CF-Connecting-IP",     // Cloudflare
                "True-Client-IP",       // Akamai, Cloudflare Enterprise
                "X-Client-IP"           // Outros proxies
            };

            foreach (var header in headers)
            {
                var value = context.Request.Headers[header].FirstOrDefault();

                if (!string.IsNullOrEmpty(value))
                {
                    // X-Forwarded-For pode conter múltiplos IPs separados por vírgula
                    // O primeiro é o IP real do cliente
                    var ip = value.Split(',')[0].Trim();

                    if (!string.IsNullOrEmpty(ip) && ip != "unknown")
                    {
                        return ip;
                    }
                }
            }

            // Fallback para o RemoteIpAddress se não houver headers
            return context.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
        }
    }
}