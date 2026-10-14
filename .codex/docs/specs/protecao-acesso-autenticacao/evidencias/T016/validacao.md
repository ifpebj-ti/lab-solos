# T016 — validação

Execuções no worktree isolado T016 em 2026-10-13:

- Filtro focado: `dotnet test backend/Tests/Tests.csproj -c Release --no-restore --filter "FullyQualifiedName~LoginThrottleTests|FullyQualifiedName~AuthLoginContractTests|FullyQualifiedName~AuthChangePasswordTests|FullyQualifiedName~CriticalAuthenticationTests" --nologo --verbosity quiet` — 29 passaram, 0 falharam, 0 ignorados.
- Build: `dotnet build backend/backend.sln -c Release --no-restore --nologo --disable-build-servers --verbosity quiet` — sucesso, 0 avisos, 0 erros.
- Regressão final: `dotnet test backend/backend.sln --no-build --no-restore -c Release --nologo --disable-build-servers --verbosity quiet` — 405 passaram, 0 falharam, 0 ignorados (52 s).
- `git diff --check` — sem erros de whitespace. Git avisou apenas que normalizará LF para CRLF nos arquivos de linha final Windows.

O PostgreSQL 15 foi iniciado pelos testes de integração. Nenhum bloqueio externo ou falha permaneceu. Uma execução intermediária do filtro detectou três expectativas antigas de aspas no corpo 401 e ausência de configuração sintética no ambiente de teste; esses pontos foram corrigidos. A resposta textual observada é `Credenciais inválidas.` sem aspas no corpo. A validação final acima passou depois das correções.

Integração no checkout principal em 2026-10-13:

- Filtro T016: 29 passaram, 0 falharam.
- Regressão backend completa: `dotnet test backend/Tests/Tests.csproj -c Release` — 405 passaram, 0 falharam, 0 ignorados (55 s).
- Reconstrução Release: `dotnet build backend/backend.sln -c Release --no-incremental -v:q` — sucesso, 0 erros e 174 avisos gerais preexistentes; nenhum aviso em `AuthController.cs` após ajustes de analisador.
- `git diff --check` — sem erros de whitespace.
