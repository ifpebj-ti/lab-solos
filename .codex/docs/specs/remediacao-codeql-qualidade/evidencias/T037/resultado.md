# T037 — Simplificar nested if em ProdutosController

## Escopo executado

- `backend/LabSolos-Server-DotNet8/Controllers/ProdutosController.cs`
- `backend/Tests/Controllers/ProdutosControllerTests.cs`
- `backend/Tests/Repositories/ProdutoRepositoryTests.cs` (validado; sem alteração)
- `evidencias/T037/resultado.md`

Issue sincronizada antes do RED: #237, repositório `ifpebj-ti/lab-solos`, assignee `nathannmvr`, Project 41, status `In Progress`.

## RED

Os três ramos foram caracterizados antes da alteração por testes focais para as validações de `Status`, `DataFabricacao` e `DataValidade`. Como a tarefa trata Maintainability sem mudança funcional, a caracterização passou no código original; o RED foi o CodeQL ainda reproduzindo os findings `CQ-0014`, `CQ-0015` e `CQ-0016` (`cs/nested-if-statements`) nas três condições aninhadas.

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~ProdutosControllerTests --nologo
Resultado: 7 aprovados, 0 falhas, 7 total.

dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~ProdutoRepositoryTests --nologo
Resultado: 4 aprovados, 0 falhas, 4 total.
```

## GREEN

As três validações foram combinadas em condições compostas equivalentes, preservando a ordem de curto-circuito, as mensagens `400`, a autorização e o fluxo de persistência. Nenhum ramo válido passou a retornar resposta diferente.

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~ProdutosControllerTests --nologo --no-restore --logger "console;verbosity=minimal"
Resultado: 7 aprovados, 0 falhas, 7 total.

dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~ProdutoRepositoryTests --nologo --no-restore --logger "console;verbosity=minimal"
Resultado: 4 aprovados, 0 falhas, 4 total.
```

## REFACTOR

O formato das condições foi mantido legível em múltiplas linhas. O helper novo dos testes usa `CultureInfo.InvariantCulture` para não introduzir avisos de localidade. A inspeção estrutural confirmou que os três pontos de validação não possuem mais `if` aninhado.

## Validação adicional

```text
dotnet build backend/backend.sln --no-restore -c Release --nologo --disable-build-servers -v:q
Resultado: exit 0, 0 erros e 203 avisos de analisadores preexistentes.

dotnet test backend/Tests/Tests.csproj --no-build --no-restore -c Release --nologo --disable-build-servers --logger "console;verbosity=minimal"
Resultado: 268 aprovados, 0 falhas, 268 total.

git diff --check -- backend/LabSolos-Server-DotNet8/Controllers/ProdutosController.cs backend/Tests/Controllers/ProdutosControllerTests.cs backend/Tests/Repositories/ProdutoRepositoryTests.cs .codex/docs/specs/remediacao-codeql-qualidade/evidencias/T037
Resultado: exit 0. Permanecem apenas avisos informativos de normalização LF/CRLF.
```

## Limitações e bloqueios

- Não foi executado CodeQL remoto no SHA corrigido porque a solicitação proibiu commit, push, merge e PR; a confirmação de encerramento dos três findings permanece pendente de publicação em uma PR para `develop` e posterior promoção para `main`.
- Os 203 avisos do build são preexistentes e permanecem fora do escopo de T037; não houve aviso novo no helper após a troca para cultura invariável.
- `tasks.md` não foi editado, conforme solicitado.
