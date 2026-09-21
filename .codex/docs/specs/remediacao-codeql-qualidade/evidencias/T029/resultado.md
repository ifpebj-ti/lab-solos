# T029 — Restringir catch do ProdutosController

## Escopo executado

- `backend/LabSolos-Server-DotNet8/Controllers/ProdutosController.cs`
- `backend/Tests/Controllers/ProdutosControllerTests.cs` (criado; não existia)
- `backend/Tests/Repositories/ProdutoRepositoryTests.cs` (validado; sem alteração)
- `evidencias/T029/resultado.md`

Issue sincronizada antes do RED: #237, assignee `nathannmvr`, Project 41, status `In Progress`.

## RED

Foi criado o teste focal do fluxo `ObterHistoricoSaidaProduto`, cobrindo produto inexistente, consulta válida, falha operacional e falha inesperada.

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~ProdutosControllerTests --nologo --no-restore --logger "console;verbosity=minimal"
Resultado: 3 aprovados, 1 falha, 4 total.
Falha esperada: HistoricoFalhaInesperadaNaoEEngolida não recebeu a ArgumentException porque o catch (Exception) a mascarava.
```

A linha de base existente do repositório de produtos permaneceu verde:

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~ProdutoRepositoryTests --nologo --no-restore --logger "console;verbosity=minimal"
Resultado: 4 aprovados, 0 falhas, 4 total.
```

## GREEN

O `ProdutosController` passou a capturar somente `InvalidOperationException`, tratada como falha operacional esperada do fluxo de consulta. A resposta continua sendo HTTP 500 sem expor detalhes internos.

Falhas inesperadas, como `ArgumentException`, deixam de ser capturadas e propagam-se para o tratamento superior. O log da falha operacional usa `LoggerMessage.Define` com `ProdutoId` estruturado e a exceção como causa.

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~ProdutosControllerTests --nologo --no-restore --logger "console;verbosity=minimal"
Resultado: 4 aprovados, 0 falhas, 4 total.
```

## REFACTOR

O retorno da falha operacional foi centralizado em `HistoryReadFailureResponse`, com mensagem constante, código `StatusCodes.Status500InternalServerError` e logging estruturado explícito.

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~ProdutosControllerTests --nologo --no-restore --logger "console;verbosity=minimal"
Resultado: 4 aprovados, 0 falhas, 4 total.

dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~ProdutoRepositoryTests --nologo --no-build --no-restore --logger "console;verbosity=minimal"
Resultado: 4 aprovados, 0 falhas, 4 total.
```

## Validação adicional

```text
dotnet build backend/backend.sln --no-restore -c Release --nologo --disable-build-servers -v:q
Resultado: exit 0, 0 erros e 216 avisos de analisadores preexistentes.

git diff --check
Resultado: exit 0. O Git reportou somente avisos preexistentes de normalização LF/CRLF.
```

Verificação estrutural: `ProdutosController.cs` não possui mais `catch (Exception)`; os catches remanescentes são `ArgumentException` em outro fluxo e `InvalidOperationException` no histórico.

## Limitações

- Conforme solicitado, não houve commit, push, branch, Pull Request, merge nem edição de `tasks.md`.
- Sem um SHA remoto corrigido, não foi possível executar o Code Quality no GitHub nem comprovar a remoção do finding CQ-0020 no painel remoto. Localmente, o catch genérico do fluxo foi removido e os testes cobrem os três resultados distintos e a propagação de falhas inesperadas.
- Os avisos gerais do build permanecem fora do escopo; o novo helper não introduziu o CA1859 após o refactor.
