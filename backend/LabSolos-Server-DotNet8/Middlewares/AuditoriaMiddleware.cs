using LabSolos_Server_DotNet8.DTOs.Auditoria;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Extensions;
using LabSolos_Server_DotNet8.Services;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace LabSolos_Server_DotNet8.Middlewares
{
    public class AuditoriaMiddleware
    {
        private const string DadosRequisicaoIndisponiveis = "Erro ao capturar dados da requisição";
        private static readonly string[] SensitiveValueMarkers =
        [
            "password", "senha", "token", "jwt", "cookie", "secret", "credential",
            "authorization", "apikey", "code", "codigo", "verification", "otp", "csrf", "signature"
        ];

        private readonly RequestDelegate _next;
        private readonly IServiceScopeFactory _serviceScopeFactory;
        private readonly Func<Stream, TextReader> _requestBodyReaderFactory;

        public AuditoriaMiddleware(
            RequestDelegate next,
            IServiceScopeFactory serviceScopeFactory,
            Func<Stream, TextReader>? requestBodyReaderFactory = null)
        {
            _next = next;
            _serviceScopeFactory = serviceScopeFactory;
            _requestBodyReaderFactory = requestBodyReaderFactory ?? (body => new StreamReader(
                body,
                Encoding.UTF8,
                detectEncodingFromByteOrderMarks: true,
                bufferSize: 1024,
                leaveOpen: true));
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var inicioRequisicao = DateTime.UtcNow;
            var finalidadeSegura = ClassificarFinalidadeProtegida(context.Request);

            // Rotas com dados pessoais ou credenciais nunca são inspecionadas para auditoria.
            var dadosRequisicao = finalidadeSegura is null
                ? await CapturarDadosRequisicaoAsync(context)
                : null;

            // Executar a próxima etapa do pipeline
            await _next(context);

            // Registrar log de auditoria após a resposta
            await RegistrarLogAuditoriaAsync(context, dadosRequisicao, inicioRequisicao, finalidadeSegura);
        }

        private async Task<string> CapturarDadosRequisicaoAsync(HttpContext context)
        {
            try
            {
                var request = context.Request;
                var dados = new
                {
                    Method = request.Method,
                    Path = request.Path.Value,
                    QueryString = SanitizarQueryString(request.Query),
                    Headers = request.Headers.Where(h => !NomeIndicaDadoSensivel(h.Key))
                        .ToDictionary(h => h.Key, h => h.Value.ToString()),
                    ContentType = request.ContentType,
                    ContentLength = request.ContentLength
                };

                // Capturar body apenas para POST/PUT/PATCH e se não for muito grande
                if (request.ContentLength.HasValue && request.ContentLength.Value > 0 &&
                    request.ContentLength.Value < 10000 && // Limite de 10KB
                    (request.Method == "POST" || request.Method == "PUT" || request.Method == "PATCH"))
                {
                    request.EnableBuffering();
                    using var reader = _requestBodyReaderFactory(request.Body);
                    var body = await reader.ReadToEndAsync();
                    request.Body.Position = 0;

                    // Redigir campos de credencial em qualquer profundidade antes de persistir o corpo.
                    var bodyNode = JsonNode.Parse(body);
                    if (bodyNode is not null)
                    {
                        if (bodyNode is JsonValue valorRaiz && valorRaiz.TryGetValue<string>(out _))
                            bodyNode = JsonValue.Create("***");
                        else
                            SanitizarCorpo(bodyNode);

                        return JsonSerializer.Serialize(new
                        {
                            dados.Method,
                            dados.Path,
                            dados.QueryString,
                            dados.Headers,
                            dados.ContentType,
                            dados.ContentLength,
                            Body = bodyNode
                        });
                    }

                    return JsonSerializer.Serialize(new
                    {
                        dados.Method,
                        dados.Path,
                        dados.QueryString,
                        dados.Headers,
                        dados.ContentType,
                        dados.ContentLength,
                        Body = "***"
                    });
                }

                return JsonSerializer.Serialize(dados);
            }
            catch (IOException)
            {
                return DadosRequisicaoIndisponiveis;
            }
            catch (JsonException)
            {
                return DadosRequisicaoIndisponiveis;
            }
        }

        private async Task RegistrarLogAuditoriaAsync(
            HttpContext context,
            string? dadosRequisicao,
            DateTime inicioRequisicao,
            FinalidadeAuditoriaProtegida? finalidadeSegura)
        {
            try
            {
                using var scope = _serviceScopeFactory.CreateScope();
                var auditoriaService = scope.ServiceProvider.GetRequiredService<IAuditoriaService>();

                var request = context.Request;
                var response = context.Response;

                // Determinar o tipo de ação
                var tipoAcao = finalidadeSegura is { } finalidade
                    ? DeterminarTipoAcaoProtegida(finalidade, response.StatusCode, request.Method)
                    : DeterminarTipoAcao(request);
                var nivelRisco = DeterminarNivelRisco(request, response);

                var rotaProtegida = finalidadeSegura is not null;
                var userIdClaim = rotaProtegida
                    ? null
                    : context.User?.Claims?.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
                int? userId = userIdClaim is not null &&
                    int.TryParse(userIdClaim.Value, NumberStyles.None, CultureInfo.InvariantCulture, out var parsedUserId)
                    ? parsedUserId
                    : null;

                var logDto = new CreateLogAuditoriaDTO
                {
                    Acao = finalidadeSegura is not null
                        ? $"{finalidadeSegura.Nome} {NormalizarMetodo(request.Method)}"
                        : $"{request.Method} {request.Path}",
                    Recurso = finalidadeSegura?.Nome ?? ObterRecurso(request.Path),
                    Detalhes = finalidadeSegura is not null
                        ? $"Status: {response.StatusCode}; Resultado: {ObterResultadoSeguro(response.StatusCode)}"
                        : $"Status: {response.StatusCode}, Duração: {(DateTime.UtcNow - inicioRequisicao).TotalMilliseconds}ms",
                    TipoAcao = tipoAcao,
                    NivelRisco = nivelRisco,
                    DadosRequisicao = dadosRequisicao,
                    DadosResposta = response.StatusCode.ToString(CultureInfo.InvariantCulture),
                    TempoSessao = rotaProtegida ? null : DateTime.UtcNow - inicioRequisicao,
                    Origem = "Web"
                };

                var enderecoIP = rotaProtegida ? string.Empty : context.GetClientIpAddress();
                var userAgent = rotaProtegida ? null : context.Request.Headers.UserAgent.ToString();

                await auditoriaService.RegistrarLogAsync(logDto, userId, enderecoIP, userAgent);
            }
            catch (DbUpdateException ex)
            {
                // Log de erro mas não deve falhar a aplicação
                Console.WriteLine($"Erro no middleware de auditoria: {ex.Message}");
            }
        }

        private static FinalidadeAuditoriaProtegida? ClassificarFinalidadeProtegida(HttpRequest request)
        {
            var segmentos = (request.Path.Value ?? string.Empty)
                .Split('/', StringSplitOptions.RemoveEmptyEntries);
            if (segmentos.Length < 2 || !string.Equals(segmentos[0], "api", StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }

            var controller = segmentos[1];
            var endpoint = segmentos.Length > 2 ? segmentos[2] : string.Empty;
            if (string.Equals(controller, "auth", StringComparison.OrdinalIgnoreCase))
            {
                if (string.Equals(endpoint, "login", StringComparison.OrdinalIgnoreCase))
                    return new FinalidadeAuditoriaProtegida("authentication.login", TipoAcaoAuditoria.Login);
                if (string.Equals(endpoint, "change-password", StringComparison.OrdinalIgnoreCase))
                    return new FinalidadeAuditoriaProtegida("authentication.password_change", TipoAcaoAuditoria.AlteracaoSenha);
            }

            if (string.Equals(controller, "email", StringComparison.OrdinalIgnoreCase))
                return new FinalidadeAuditoriaProtegida("authentication.recovery", TipoAcaoAuditoria.ResetSenha);

            if (string.Equals(controller, "usuarios", StringComparison.OrdinalIgnoreCase))
            {
                return HttpMethods.IsGet(request.Method)
                    ? new FinalidadeAuditoriaProtegida("users.read", TipoAcaoAuditoria.Outro)
                    : new FinalidadeAuditoriaProtegida("users.write", TipoAcaoAuditoria.AlteracaoUsuario);
            }

            if (string.Equals(controller, "emprestimos", StringComparison.OrdinalIgnoreCase) &&
                HttpMethods.IsGet(request.Method))
            {
                return new FinalidadeAuditoriaProtegida("loans.read", TipoAcaoAuditoria.Outro);
            }

            return null;
        }

        private static TipoAcaoAuditoria DeterminarTipoAcaoProtegida(
            FinalidadeAuditoriaProtegida finalidade,
            int statusCode,
            string method)
        {
            if (finalidade.Tipo == TipoAcaoAuditoria.Login && statusCode == StatusCodes.Status401Unauthorized)
                return TipoAcaoAuditoria.LoginFalhado;

            if (finalidade.Nome == "users.write")
            {
                if (HttpMethods.IsPost(method)) return TipoAcaoAuditoria.CriacaoUsuario;
                if (HttpMethods.IsDelete(method)) return TipoAcaoAuditoria.ExclusaoUsuario;
            }

            return finalidade.Tipo;
        }

        private static string NormalizarMetodo(string method) => method.ToUpperInvariant() switch
        {
            "GET" => "GET",
            "POST" => "POST",
            "PUT" => "PUT",
            "PATCH" => "PATCH",
            "DELETE" => "DELETE",
            "OPTIONS" => "OPTIONS",
            "HEAD" => "HEAD",
            _ => "OTHER"
        };

        private static string ObterResultadoSeguro(int statusCode) => statusCode switch
        {
            >= 200 and < 300 => "sucesso",
            StatusCodes.Status401Unauthorized or StatusCodes.Status403Forbidden => "negado",
            StatusCodes.Status400BadRequest or StatusCodes.Status422UnprocessableEntity => "validacao",
            StatusCodes.Status409Conflict => "conflito",
            StatusCodes.Status429TooManyRequests => "limitado",
            >= 500 => "falha_interna",
            _ => "outro"
        };

        private static string? SanitizarQueryString(IQueryCollection query)
        {
            var itens = query.SelectMany(par => par.Value.Select(valor =>
                $"{Uri.EscapeDataString(par.Key)}={Uri.EscapeDataString(NomeIndicaDadoSensivel(par.Key) ? "***" : valor ?? string.Empty)}"));
            var querySanitizada = string.Join("&", itens);
            return querySanitizada.Length == 0 ? null : $"?{querySanitizada}";
        }

        private static bool NomeIndicaDadoSensivel(string name)
        {
            var normalizado = new string(name
                .Where(char.IsLetterOrDigit)
                .Select(char.ToLowerInvariant)
                .ToArray());
            return SensitiveValueMarkers.Any(normalizado.Contains);
        }

        private static void SanitizarCorpo(JsonNode node)
        {
            switch (node)
            {
                case JsonObject objeto:
                    foreach (var propriedade in objeto.ToArray())
                    {
                        if (NomeIndicaDadoSensivel(propriedade.Key))
                            objeto[propriedade.Key] = "***";
                        else if (propriedade.Value is not null)
                            SanitizarCorpo(propriedade.Value);
                    }
                    break;
                case JsonArray array:
                    foreach (var item in array)
                    {
                        if (item is not null)
                            SanitizarCorpo(item);
                    }
                    break;
            }
        }

        private sealed record FinalidadeAuditoriaProtegida(string Nome, TipoAcaoAuditoria Tipo);

        private static TipoAcaoAuditoria DeterminarTipoAcao(HttpRequest request)
        {
            var path = request.Path.Value?.ToLowerInvariant() ?? "";
            var method = request.Method.ToUpperInvariant();

            // Autenticação
            if (path.Contains("/auth/login"))
                return TipoAcaoAuditoria.Login;
            if (path.Contains("/auth/logout"))
                return TipoAcaoAuditoria.Logout;
            if (path.Contains("/auth/reset"))
                return TipoAcaoAuditoria.ResetSenha;

            // Usuários
            if (path.Contains("/usuarios"))
            {
                return method switch
                {
                    "POST" => TipoAcaoAuditoria.CriacaoUsuario,
                    "PUT" or "PATCH" => TipoAcaoAuditoria.AlteracaoUsuario,
                    "DELETE" => TipoAcaoAuditoria.ExclusaoUsuario,
                    _ => TipoAcaoAuditoria.Outro
                };
            }

            // Produtos
            if (path.Contains("/produtos"))
            {
                return method switch
                {
                    "POST" => TipoAcaoAuditoria.CriacaoProduto,
                    "PUT" or "PATCH" => TipoAcaoAuditoria.AlteracaoProduto,
                    "DELETE" => TipoAcaoAuditoria.ExclusaoProduto,
                    _ => TipoAcaoAuditoria.Outro
                };
            }

            // Empréstimos
            if (path.Contains("/emprestimos"))
            {
                if (path.Contains("/aprovar"))
                    return TipoAcaoAuditoria.AprovacaoEmprestimo;
                if (path.Contains("/reprovar"))
                    return TipoAcaoAuditoria.RejeicaoEmprestimo;
                if (path.Contains("/devolver"))
                    return TipoAcaoAuditoria.DevolucaoEmprestimo;
                if (method == "POST")
                    return TipoAcaoAuditoria.CriacaoEmprestimo;
            }

            // Administrativo
            if (path.Contains("/admin") || path.Contains("/auditoria"))
                return TipoAcaoAuditoria.AcessoAdministrativo;

            return TipoAcaoAuditoria.Outro;
        }

        private static NivelRiscoAuditoria DeterminarNivelRisco(HttpRequest request, HttpResponse response)
        {
            var path = request.Path.Value?.ToLowerInvariant() ?? "";
            var method = request.Method.ToUpperInvariant();

            // Crítico
            if (path.Contains("/auditoria") ||
                path.Contains("/admin/settings") ||
                method == "DELETE" ||
                response.StatusCode == 401 || response.StatusCode == 403)
                return NivelRiscoAuditoria.Critico;

            // Alto
            if (path.Contains("/admin") ||
                path.Contains("/aprovar") ||
                path.Contains("/reprovar") ||
                (method == "POST" && path.Contains("/usuarios")))
                return NivelRiscoAuditoria.Alto;

            // Médio
            if (method == "POST" || method == "PUT" || method == "PATCH")
                return NivelRiscoAuditoria.Medio;

            // Baixo
            return NivelRiscoAuditoria.Baixo;
        }

        private static string ObterRecurso(PathString path)
        {
            var pathValue = path.Value ?? "";
            var segments = pathValue.Split('/', StringSplitOptions.RemoveEmptyEntries);

            if (segments.Length >= 2)
                return segments[1]; // Retorna o primeiro segmento após /api/

            return "Desconhecido";
        }
    }
}
