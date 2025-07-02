using LabSolos_Server_DotNet8.Services;
using LabSolos_Server_DotNet8.DTOs.Auditoria;
using LabSolos_Server_DotNet8.Enums;
using System.Security.Claims;
using System.Text;
using System.Text.Json;

namespace LabSolos_Server_DotNet8.Middlewares
{
    public class AuditoriaMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly IServiceScopeFactory _serviceScopeFactory;

        public AuditoriaMiddleware(RequestDelegate next, IServiceScopeFactory serviceScopeFactory)
        {
            _next = next;
            _serviceScopeFactory = serviceScopeFactory;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var inicioRequisicao = DateTime.UtcNow;

            // Capturar dados da requisição
            var dadosRequisicao = await CapturarDadosRequisicaoAsync(context);

            // Executar a próxima etapa do pipeline
            await _next(context);

            // Registrar log de auditoria após a resposta
            _ = Task.Run(async () => await RegistrarLogAuditoriaAsync(context, dadosRequisicao, inicioRequisicao));
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
                    QueryString = request.QueryString.Value,
                    Headers = request.Headers.Where(h => !h.Key.ToLower().Contains("authorization"))
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
                    var body = await new StreamReader(request.Body).ReadToEndAsync();
                    request.Body.Position = 0;

                    // Remover dados sensíveis como senhas
                    var bodyObj = JsonSerializer.Deserialize<Dictionary<string, object>>(body);
                    if (bodyObj != null)
                    {
                        foreach (var key in bodyObj.Keys.ToList())
                        {
                            if (key.ToLower().Contains("password") || key.ToLower().Contains("senha"))
                            {
                                bodyObj[key] = "***";
                            }
                        }

                        return JsonSerializer.Serialize(new
                        {
                            dados.Method,
                            dados.Path,
                            dados.QueryString,
                            dados.Headers,
                            dados.ContentType,
                            dados.ContentLength,
                            Body = bodyObj
                        });
                    }
                }

                return JsonSerializer.Serialize(dados);
            }
            catch
            {
                return "Erro ao capturar dados da requisição";
            }
        }

        private async Task RegistrarLogAuditoriaAsync(HttpContext context, string dadosRequisicao, DateTime inicioRequisicao)
        {
            try
            {
                using var scope = _serviceScopeFactory.CreateScope();
                var auditoriaService = scope.ServiceProvider.GetRequiredService<IAuditoriaService>();

                var request = context.Request;
                var response = context.Response;

                // Determinar o tipo de ação
                var tipoAcao = DeterminarTipoAcao(request);
                var nivelRisco = DeterminarNivelRisco(request, response);

                // Obter dados do usuário
                var userIdClaim = context.User?.Claims?.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
                var userId = userIdClaim != null ? int.Parse(userIdClaim.Value) : (int?)null;

                var logDto = new CreateLogAuditoriaDTO
                {
                    Acao = $"{request.Method} {request.Path}",
                    Recurso = ObterRecurso(request.Path),
                    Detalhes = $"Status: {response.StatusCode}, Duração: {(DateTime.UtcNow - inicioRequisicao).TotalMilliseconds}ms",
                    TipoAcao = tipoAcao,
                    NivelRisco = nivelRisco,
                    DadosRequisicao = dadosRequisicao,
                    DadosResposta = response.StatusCode.ToString(),
                    TempoSessao = DateTime.UtcNow - inicioRequisicao,
                    Origem = "Web"
                };

                var enderecoIP = context.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
                var userAgent = context.Request.Headers["User-Agent"].ToString();

                await auditoriaService.RegistrarLogAsync(logDto, userId, enderecoIP, userAgent);
            }
            catch (Exception ex)
            {
                // Log de erro mas não deve falhar a aplicação
                Console.WriteLine($"Erro no middleware de auditoria: {ex.Message}");
            }
        }

        private static TipoAcaoAuditoria DeterminarTipoAcao(HttpRequest request)
        {
            var path = request.Path.Value?.ToLower() ?? "";
            var method = request.Method.ToUpper();

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
            var path = request.Path.Value?.ToLower() ?? "";
            var method = request.Method.ToUpper();

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
