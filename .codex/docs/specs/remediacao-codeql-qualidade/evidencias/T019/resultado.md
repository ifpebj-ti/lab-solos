# Evidência T019 — LogAuditoriaRepository

Data: 2026-09-20
Issue: #237
Project: #41
Status do item no Project: `In Progress`
Finding IDs: `CQ-0036` a `CQ-0045`
Regra: `cs/dereferenced-value-may-be-null`
Categoria/severidade: Reliability / Warning

## Escopo executado

Os dez acessos nullable de `LogAuditoriaRepository` foram corrigidos sem alterar o contrato funcional:

- `UsuarioId`, `TipoAcao`, `DataInicio`, `DataFim` e `NivelRisco` nulos continuam omitindo seus filtros;
- valores preenchidos são capturados como valores não nulos antes das expressões LINQ;
- `ObterLogsFiltradosAsync` e `ObterTotalLogsFiltradosAsync` compartilham a mesma composição de filtros;
- paginação, ordenação e filtros existentes de suspeita, IP e recurso foram preservados.

## RED / caracterização

Antes da criação do teste focal, o comando abaixo confirmou que o arquivo de testes da tarefa ainda não existia no projeto compilado:

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~LogAuditoriaRepositoryTests --no-restore
Resultado: exit 0; nenhum teste correspondeu ao filtro.
```

Após adicionar os dois testes de contrato, a linha de base com a produção original passou em 2/2. O finding é estático e não se manifesta como falha de comportamento no provedor EF InMemory; portanto, o RED comportamental clássico foi tratado como caracterização, sem fabricar uma falha artificial.

## GREEN

Produção passou a usar pattern matching nullable (`is { } valor`) para os cinco filtros opcionais, eliminando as desreferenciações `.Value`. Os testes adicionados cobrem:

1. todos os cinco filtros nulos, verificando que os três registros permanecem elegíveis e que a totalização retorna `3`;
2. os cinco filtros preenchidos simultaneamente, verificando que apenas o registro esperado permanece e que a totalização retorna `1`.

Comando:

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~LogAuditoriaRepositoryTests --no-restore
Resultado: Aprovado: 2, Falha: 0, Ignorado: 0.
```

## REFACTOR

A composição de filtros foi extraída para `AplicarFiltros`, usada tanto pela consulta paginada quanto pela consulta de totalização. O teste focal foi repetido após a refatoração:

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~LogAuditoriaRepositoryTests --no-restore
Resultado: Aprovado: 2, Falha: 0, Ignorado: 0.
```

## Validações

```text
dotnet build backend/backend.sln --no-restore
Resultado: compilação com êxito; 0 avisos; 0 erros.

git diff --check
Resultado: exit 0; somente avisos preexistentes de conversão LF/CRLF.
```

A regressão completa foi iniciada com `dotnet test backend/Tests/Tests.csproj --no-restore`, mas ficou sem saída após iniciar o VSTest. A inspeção `docker ps` mostrou nenhum container ativo; a execução foi interrompida para não manter um teste de integração aguardando infraestrutura. Isso não afetou o teste focal nem o build.

Não foi executado Code Quality remoto, push, commit, merge ou alteração de ruleset, conforme solicitado. A confirmação final dos dez findings depende da análise CodeQL em um SHA publicado.

## Arquivos alterados

- `backend/LabSolos-Server-DotNet8/Repositories/LogAuditoriaRepository.cs`
- `backend/Tests/Repositories/LogAuditoriaRepositoryTests.cs`
- `.codex/docs/specs/remediacao-codeql-qualidade/evidencias/T019/resultado.md`

Não foram alterados `tasks.md`, a evidência de T018, workflows, inventário ou arquivos fora do escopo da T019.
