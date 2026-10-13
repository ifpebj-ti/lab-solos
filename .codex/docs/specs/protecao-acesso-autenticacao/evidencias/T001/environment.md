# T001 — ambiente e linha de base

- Repositório: `ifpebj-ti/lab-solos`.
- Issue #437 foi atribuída a `nathannmvr`; item 41 do Project `LabOn — Desenvolvimento e Qualidade` foi confirmado como `In Progress` antes do RED.
- `docker info --format '{{.ServerVersion}}'`: `29.8.0` após o reinício do Docker Desktop.
- Linha de base antes das alterações, comando definido em T001:
  `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~AuthenticationProtectionHarnessTests|FullyQualifiedName~PostgreSqlApplicationSmokeTests|FullyQualifiedName~CriticalScenarioIsolationTests"`
- Resultado da linha de base: 4 testes passaram; a fixture existente usava PostgreSQL 16. Os testes direcionados não demonstravam ainda a fixture PG15 nem o reset via histórico de migrações.
- A compilação da linha de base emitiu avisos de analisadores já existentes em fontes de produção e testes; nenhum teste falhou.
