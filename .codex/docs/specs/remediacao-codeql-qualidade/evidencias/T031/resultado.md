# T031 — Restringir catches do AuditoriaController

## Escopo

Tratados os findings CQ-0028 a CQ-0034 (`cs/catch-of-all-exceptions`) em
`AuditoriaController`, cobrindo registro, consulta, relatório, marcação,
verificação de atividade e detecção automática.

## Linha de base

Antes da criação dos testes focais, o comando abaixo não encontrou testes para
T031:

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~AuditoriaControllerTests --nologo --no-restore --logger "console;verbosity=minimal"
Resultado: nenhum teste correspondeu ao filtro.
```

## RED

Foram adicionados 21 testes focais: sete fluxos de sucesso, sete falhas
operacionais e sete falhas inesperadas que devem ser propagadas.

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~AuditoriaControllerTests --nologo --no-restore --logger "console;verbosity=minimal"
Resultado: 14 falhas, 7 aprovados, 21 total.
```

O RED foi válido: os sete testes de `ArgumentException` falharam porque os
`catch (Exception)` mascaravam a exceção, e os sete testes operacionais
falharam porque as respostas expunham `Exception.Message`.

## GREEN

Os catches foram restringidos a exceções operacionais esperadas:

- `DbUpdateException` para registro e marcação de auditoria;
- `InvalidOperationException` para consultas, relatório, verificação e
  detecção;
- falhas inesperadas continuam propagando;
- respostas permanecem `400 Bad Request`, sem detalhes internos;
- exceções esperadas são registradas com `LoggerMessage` estruturado.

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~AuditoriaControllerTests --nologo --no-restore --logger "console;verbosity=minimal"
Resultado: 0 falhas, 21 aprovados, 21 total.
```

## REFACTOR

O tratamento comum foi extraído para `AuditOperationFailure`, preservando os
contratos de resposta e centralizando a observabilidade.

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~AuditoriaControllerTests --nologo --no-restore --logger "console;verbosity=minimal"
Resultado: 0 falhas, 21 aprovados, 21 total.
```

## Validações adicionais

```text
dotnet build backend/backend.sln --no-restore -c Release --nologo --disable-build-servers
Resultado: exit 0, 0 erros, 414 avisos preexistentes da solução.

git diff --check -- backend/LabSolos-Server-DotNet8/Controllers/AuditoriaController.cs backend/Tests/Controllers/AuditoriaControllerTests.cs .codex/docs/specs/remediacao-codeql-qualidade/evidencias/T031
Resultado: aprovado; somente aviso informativo de normalização LF/CRLF.

rg -n 'catch \(Exception\)' backend/LabSolos-Server-DotNet8/Controllers/AuditoriaController.cs
Resultado: 0 ocorrências.
```

## Limitações

Não foram executados testes de integração/E2E ou Code Quality remoto nesta
execução local. A tarefa exige o teste focal e a coordenação central fará a
validação remota após revisar o resultado. Não houve bloqueio de dependência
para os testes focais; os avisos do build são preexistentes e estão fora do
escopo T031.
