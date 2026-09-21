# T027 — Restringir catches do AuditoriaMiddleware

## Escopo executado

- `backend/LabSolos-Server-DotNet8/Middlewares/AuditoriaMiddleware.cs`
- `backend/Tests/Middlewares/AuditoriaMiddlewareTests.cs`
- `evidencias/T027/resultado.md`

Issue sincronizada: #237 (`nathannmvr`, Project 41, status `In Progress`).

## RED

Linha de base antes dos novos testes:

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~AuditoriaMiddlewareTests --nologo --no-restore --logger "console;verbosity=minimal"
Resultado: 2 aprovados, 0 falhas.
```

Foram adicionados testes para os contratos que não estavam cobertos:

- `InvokeAsyncPropagatesUnexpectedCaptureFailure`;
- `InvokeAsyncKeepsPipelineResponseWhenAuditPersistenceFailsExpectedly`;
- `InvokeAsyncPropagatesUnexpectedAuditPersistenceFailure`.

Execução RED:

```text
Resultado: 3 aprovados, 2 falhas, 5 total.
Falhas esperadas: captura e persistência inesperadas eram engolidas pelo catch genérico; a persistência era executada em tarefa descartada.
```

## GREEN

Implementação mínima:

- `InvokeAsync` aguarda o registro da auditoria, tornando falhas inesperadas observáveis e propagáveis;
- a captura trata somente `IOException` e `JsonException`, mantendo o fallback sanitizado;
- o registro trata somente `DbUpdateException`, preservando a resposta do pipeline para falhas esperadas;
- o fallback de captura foi centralizado em constante para evitar duplicação.

Execução GREEN:

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~AuditoriaMiddlewareTests --nologo --no-restore --logger "console;verbosity=minimal"
Resultado: 5 aprovados, 0 falhas.
```

## REFACTOR

Após centralizar o texto de fallback, a suíte focal foi repetida:

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~AuditoriaMiddlewareTests --nologo --no-restore --logger "console;verbosity=minimal"
Resultado: 5 aprovados, 0 falhas.

git diff --check
Resultado: aprovado, código de saída 0.
```

## Validação adicional

```text
dotnet build backend/backend.sln --no-restore -c Release --nologo --disable-build-servers
Resultado: 0 erros, 216 avisos já presentes na esteira de análise estática.
```

A suíte prevista para integração também foi executada:

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~Integration --nologo --no-restore --logger "console;verbosity=minimal"
Resultado: 4 aprovados, 62 falhas, 66 total.
```

As 62 falhas ocorreram na inicialização do `PostgreSqlContainerFixture`, todas por Docker/Testcontainers indisponível. `docker info` também falhou porque o endpoint `npipe://./pipe/dockerDesktopLinuxEngine` não estava disponível; os testes relataram `npipe://./pipe/docker_engine`.

A suíte completa foi repetida sem rebuild:

```text
dotnet test backend/Tests/Tests.csproj --no-build --no-restore --nologo --logger "console;verbosity=quiet"
Resultado: 129 aprovados, 72 falhas, 201 total.
```

As falhas adicionais também ficaram nos grupos que dependem da fixture PostgreSQL/Testcontainers; não houve falha no filtro focal da T027.

## Limitações e integração remota

- Não foi feito commit, push, branch ou Pull Request, conforme solicitado; portanto não existe SHA corrigido para executar Code Quality/CodeQL remoto e os dois findings `CQ-0017`/`CQ-0019` ainda precisam ser confirmados na análise remota da integração.
- A validação local comprova os contratos de falha esperada, propagação de falhas inesperadas, preservação da resposta e descarte do `StreamReader` já coberto por T021.
- Os avisos gerais do build não foram tratados por estarem fora do escopo da T027.
