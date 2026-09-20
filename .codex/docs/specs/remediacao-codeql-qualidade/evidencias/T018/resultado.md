# T018 — Resultado

Data: 2026-09-20

## Escopo

Correção dos acessos potencialmente nulos nos testes de migração, sem alteração de código de produção e sem supressão de análise nullable.

Findings tratados:

| ID local | Finding remoto | Regra | Arquivo | Localização de baseline |
|---|---:|---|---|---:|
| CQ-0001 | 66 | `cs/dereferenced-value-may-be-null` | `backend/Tests/Integration/LoanReturnMigrationTests.cs` | linha 93 |
| CQ-0002 | 65 | `cs/dereferenced-value-may-be-null` | `backend/Tests/Data/UserDataMigrationTests.cs` | linha 21 |

## RED

O Code Quality gerenciado confirmou os dois findings como `open`:

```text
gh api repos/ifpebj-ti/lab-solos/code-quality/findings/65
gh api repos/ifpebj-ti/lab-solos/code-quality/findings/66
```

Resultado relevante: ambos reportaram a regra `cs/dereferenced-value-may-be-null`, severidade `warning`, estado `open`, nos caminhos e linhas acima. O compilador C# local não reproduz esse diagnóstico específico; `backend/Tests/Tests.csproj` tem `<Nullable>enable</Nullable>`, mas `dotnet build` não emitiu `CS8602`. O CodeQL CLI não está instalado localmente.

Os testes focais de baseline foram executados antes da alteração:

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~LoanReturnMigrationTests --no-restore
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~UserDataMigrationTests --no-restore
```

Ambos chegaram ao fixture, mas falharam antes de executar os corpos dos testes porque o Docker local não está disponível (`Failed to connect to Docker endpoint at 'npipe://./pipe/docker_engine'`). Esse é um bloqueio de infraestrutura preexistente, não o RED nullable.

## GREEN

Foram adicionadas guardas explícitas nos dois pontos:

- `ReadColumnAsync` lança `InvalidOperationException` quando a coluna não é encontrada e retorna o valor somente pelo ramo não nulo de `?? throw`.
- `Model_and_history_describe_civil_admission_date` lança `InvalidOperationException` quando `Usuario.DataIngresso` não está no modelo antes de acessar `property.ClrType`.

Assim, uma ausência estrutural continua falhando o teste; nenhum `null` é convertido em valor padrão, ignorado ou suprimido.

Validações após a alteração:

```text
dotnet build backend/Tests/Tests.csproj --no-restore -v:minimal
=> êxito; 0 erros; 84 avisos de análise preexistentes.

dotnet build backend/backend.sln --no-restore -v:minimal
=> êxito; 0 avisos; 0 erros.

dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~LoanReturnMigrationTests --no-restore --no-build
=> bloqueado pelo Docker indisponível; 2 falhas de fixture, 0 aprovados.

dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~UserDataMigrationTests --no-restore --no-build
=> bloqueado pelo Docker indisponível; 3 falhas de fixture, 0 aprovados.
```

Após iniciar o Docker Desktop localmente, a revalidação focal foi executada sem alterar o código adicionalmente:

```text
dotnet test backend/Tests/Tests.csproj --no-restore --filter "FullyQualifiedName~LoanReturnMigrationTests|FullyQualifiedName~UserDataMigrationTests"
=> Aprovado: 5; Com falha: 0; Ignorado: 0; Total: 5.
```

## REFACTOR

A revisão final manteve as guardas locais e explícitas, sem introduzir abstração compartilhada para dois tipos de nullable diferentes e sem alterar a intenção das asserções. A checagem de whitespace passou:

```text
git diff --check -- backend/Tests/Integration/LoanReturnMigrationTests.cs backend/Tests/Data/UserDataMigrationTests.cs
=> exit 0 (somente avisos informativos de conversão LF/CRLF do Git).
```

## Estado Code Quality

Não foi feito commit, push, merge, criação de PR ou alteração de ruleset, conforme o escopo da execução. Portanto, ainda não existe análise Code Quality em um SHA contendo esta correção. A última consulta remota continua mostrando os findings #65 e #66 como `open`; a resolução no Code Quality permanece pendente de uma execução remota posterior, fora desta tarefa.

## Arquivos alterados

- `backend/Tests/Integration/LoanReturnMigrationTests.cs`
- `backend/Tests/Data/UserDataMigrationTests.cs`
- `.codex/docs/specs/remediacao-codeql-qualidade/evidencias/T018/resultado.md`

`tasks.md`, workflows, inventário, produção e evidências de outras tarefas não foram alterados.

## Bloqueio remanescente e infraestrutura

Após as execuções focais, foi confirmada a indisponibilidade do daemon local:

```text
docker version --format '{{.Server.Version}}'
=> exit 1; failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine

Get-Service -Name com.docker.service
=> Status: Stopped; StartType: Manual

Start-Service -Name com.docker.service
=> falhou: Não é possível abrir o serviço com.docker.service no computador '.'.
```

O Docker Desktop foi iniciado localmente após a captura inicial e o daemon ficou disponível (`docker info` respondeu com versão `29.7.2`). Os cinco testes focais alcançaram os corpos e passaram. O bloqueio remanescente é exclusivamente operacional: ainda não existe SHA publicado com esta correção para executar CodeQL e confirmar a baixa dos findings #65 e #66. Não foram feitas tentativas de instalar, alterar permissões, editar infraestrutura ou ampliar o escopo.
