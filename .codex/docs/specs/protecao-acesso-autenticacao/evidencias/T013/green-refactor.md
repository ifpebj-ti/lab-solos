# T013 — GREEN, refactor e validação

Data: 2026-10-13.

## Implementação

- `DevelopmentClients` é registrado e aplicado somente em Development. A política aceita origens HTTP/HTTPS exatas da configuração, rejeita `null`, wildcard, caminhos e credenciais; limita métodos a `GET`, `POST`, `PATCH`, `PUT`, `DELETE`, cabeçalhos a `Authorization`/`Content-Type` e expõe `Retry-After`. A seleção dinâmica retorna `Vary: Origin`; não habilita credenciais. Outros ambientes não registram CORS.
- `ForwardedHeadersOptions` usa somente `X-Forwarded-For` e `X-Forwarded-Proto`, `ForwardLimit = 1`, limpa redes/proxies implícitos e cadastra exclusivamente IPs exatos configurados. Valores inválidos falham fechados. O middleware continua antes do roteamento, autenticação, auditoria e controles.
- `GetClientIpAddress` lê somente `HttpContext.Connection.RemoteIpAddress`, já resolvido pelo middleware; headers de proxy arbitrários não são interpretados pelo helper.
- Os testes exercitam preflight permitido e métodos/cabeçalhos fora da allowlist, resposta efetiva com `Vary` e `Retry-After`, origens permitida/arbitrária/`null`/ausente, autenticação sem sessão, ausência de CORS em Production, opções de proxy, limite de um salto e XFF forjado por remetente não confiável.

## Comandos

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~TrustedProxyTests|FullyQualifiedName~BrowserSecurityHeadersTests|FullyQualifiedName~HttpContextExtensionsTests|FullyQualifiedName~RequiredPasswordChangeAuthorizationTests" --nologo --logger "console;verbosity=quiet"` — 18/18.
- `dotnet build backend/backend.sln -c Release --nologo --disable-build-servers` — sucesso, 0 erros. O build final incremental reportou 0 avisos; um build completo anterior no checkout reportou 181 avisos de análise do conjunto, sem avisos nos arquivos de T013.
- `git diff --check` — sucesso.

`.github/workflows/container-ci.yml` roda `backend-quality` em PR para `develop` (opened/synchronize/reopened/edited/ready_for_review) e `merge_group`; seu filtro de integração inclui as novas classes `TrustedProxyTests` e `BrowserSecurityHeadersTests`.

## Limites e configuração

Sem `AuthenticationProtection:ForwardedHeaders:KnownProxies`, nenhum remetente é confiável para encaminhamento; sem `AuthenticationProtection:Cors:DevelopmentOrigins`, nenhuma origem externa é autorizada. Ambos os defaults são fechados. T022 deve fornecer os endereços estáveis do Caddy e as origens de desenvolvimento aprovadas na configuração operacional. A cadeia efetiva do Caddy ainda será comprovada em T026; este teste verifica a configuração/middleware ASP.NET e não substitui o teste do proxy real. #440 continua `In Progress`.
