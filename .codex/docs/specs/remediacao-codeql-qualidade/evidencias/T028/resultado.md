# T028 — Restringir catch do AuditoriaService

## Escopo executado

- `backend/LabSolos-Server-DotNet8/Services/AuditoriaService.cs`
- `backend/Tests/Services/AuditoriaServiceTests.cs`
- `evidencias/T028/resultado.md`

Issue sincronizada: #237 (`nathannmvr`, Project 41, status `In Progress`).

## RED

Não havia teste focal existente em `backend/Tests/Services/AuditoriaServiceTests.cs`.
Foram adicionados testes para:

- preservar os campos e o commit de um registro válido;
- manter a operação principal quando `DbUpdateException` ocorre na persistência;
- propagar `InvalidOperationException`, sem mascarar falha inesperada.

Execução RED:

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~AuditoriaServiceTests --nologo --no-restore --logger "console;verbosity=minimal"
Resultado: 2 aprovados, 1 falha, 3 total.
Falha esperada: RegistrarLogAsyncPropagaFalhaInesperada não recebeu a InvalidOperationException porque o catch (Exception) existente a engolia.
```

## GREEN

Implementação mínima:

- restringiu o catch de `RegistrarLogAsync` a `DbUpdateException`;
- preservou a criação e o commit dos registros válidos;
- passou a registrar a falha de persistência esperada com `ILogger` e `LoggerMessage.Define`;
- deixou exceções inesperadas propagarem ao tratamento superior.

Execução GREEN:

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~AuditoriaServiceTests --nologo --no-restore --logger "console;verbosity=minimal"
Resultado: 3 aprovados, 0 falhas, 3 total.
```

## REFACTOR

O fixture passou a usar `ILogger<AuditoriaService>` mockado e a verificar o evento estruturado de nível `Warning` para a falha esperada. A suíte foi repetida:

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~AuditoriaServiceTests --nologo --no-restore --logger "console;verbosity=minimal"
Resultado: 3 aprovados, 0 falhas, 3 total.
```

## Validação adicional

```text
dotnet build backend/backend.sln --no-restore -c Release --nologo --disable-build-servers
Resultado: 0 erros e 216 avisos de análise estática já presentes na esteira.

git diff --check
Resultado: aprovado, código de saída 0.
```

## Limitações e integração remota

- O Code Quality no SHA corrigido não foi executado: a instrução da tarefa proíbe branch, commit, push e Pull Request; essa verificação depende da esteira remota após publicação.
- Não foi executada a suíte completa nem testes de integração, pois a T028 possui cobertura unitária focal suficiente e não altera o contrato de infraestrutura.
- Os avisos gerais do build permanecem fora do escopo desta tarefa; nenhum aviso foi introduzido em `AuditoriaService.cs` ou no teste focal.
