# Evidências da T011

Worktree isolado: `C:\Users\Nathan\AppData\Local\Temp\lab-solos-orchestrator-20261013\T011`.

## Baseline

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~CriticalLoanCreationTests|FullyQualifiedName~CriticalLoanDecisionTests" --nologo --verbosity minimal` — 11/11 passaram antes das alterações.
- Inspeção SQL inicial mostrou que os endpoints materializavam entidades `Usuario` com colunas de credencial/sessão ao carregar solicitante e aprovador.

## RED

- Executei `LoanResourceAuthorizationTests` e `LoanPrivacyContractTests` após escrever os testes e antes da implementação. Resultado: 4 testes, 3 falhas esperadas e 1 caracterização aprovada.
- As falhas expuseram: leitura entre mentorados de Mentores diferentes retornava 200; lista autorizada vazia em `/solicitados` retornava 404; DTO de acompanhamento projetado ainda não existia.
- Uma falha inicial de compilação do teste por `using` ausente foi corrigida antes de contar o RED; ela não foi considerada evidência de comportamento.

## GREEN e refactor

- `dotnet test backend/Tests/Tests.csproj -c Release --no-restore --filter "FullyQualifiedName~LoanResourceAuthorizationTests|FullyQualifiedName~LoanPrivacyContractTests|FullyQualifiedName~CriticalLoanCreationTests|FullyQualifiedName~CriticalLoanDecisionTests" --nologo --verbosity quiet` — 15/15 passaram, 0 falhas, exit code 0.
- Os cenários finais validam negação uniforme para IDs de empréstimos e de `/aprovados` inacessíveis; proprietário, Mentor vinculado, aprovador e administrador autorizados; consulta administrativa de empréstimos aprovados por outro Mentor; listas vazias como `200 []`; GET geral de administrador; e ausência de canários/nomes de campos de credencial na projeção serializada.
- `dotnet build backend/backend.sln -c Release --no-restore --nologo --disable-build-servers` — build succeeded, 0 avisos e 0 erros.
- `git diff --check` — sem erros de whitespace.
- Consulta dos logs SQL do teste PostgreSQL confirmou que os `SELECT` projetados de empréstimo selecionam apenas campos do empréstimo, produto e perfis resumidos; não selecionam `SenhaHash`, `TokenRedefinicaoHash`, `TokenExpiracao` ou `VersaoSessao`. Leituras de sessão pelo middleware e SQL de preparação do fixture são separados desses `SELECT` projetados.

## Limites

- Não alterei `tasks.md`, estado do GitHub Project, nem arquivos fora dos caminhos da T011 e desta pasta de evidências. Não copiei para a árvore principal, não fiz commit ou push.
- A linha de base do projeto já contém avisos de análise em testes; o build final do worktree não emitiu avisos.
