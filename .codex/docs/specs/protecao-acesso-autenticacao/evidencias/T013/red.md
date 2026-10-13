# T013 — RED

Data: 2026-10-13. Docker Desktop 29.8.0 ativo; os testes HTTP usam a fixture PostgreSQL 15.

Antes da implementação, o filtro direcionado retornou 5 falhas e 3 aprovações:

```text
dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~BrowserSecurityHeadersTests|FullyQualifiedName~HttpContextExtensionsTests|FullyQualifiedName~RequiredPasswordChangeAuthorizationTests" --nologo --logger "console;verbosity=quiet"
```

As duas falhas de `HttpContextExtensionsTests` mostraram que o helper aceitava `X-Forwarded-For` e `CF-Connecting-IP` definidos pelo próprio solicitante em vez de usar `RemoteIpAddress`. As duas verificações CORS de Development receberam `Access-Control-Allow-Origin: *` apesar da allowlist configurada; o cenário Production também recebeu autorização CORS. A regressão existente de troca obrigatória de senha passou.

A primeira execução dos testes HTTP parou durante o seeding porque a factory de teste não fornecia configuração sintética de Administrador. Essa falha de preparação não foi contada como RED; os valores sintéticos foram adicionados à fixture e o filtro acima então demonstrou as falhas de comportamento.
