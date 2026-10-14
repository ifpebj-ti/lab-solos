# T010 — Ambiente de validação

- Data: 2026-10-13.
- Ambiente: Windows, .NET SDK 8.0.419, projeto alvo `net8.0`.
- Integração: PostgreSQL 15 em Testcontainers (`postgres:15-alpine`, digest fixado pelo fixture); Docker Desktop 29.8.0.
- Chaves e payloads: exclusivamente sintéticos; os testes usam AES-256-GCM por `RecoveryPayloadProtector`.
- Worktree isolado: `lab-solos-orchestrator-20261013/T010`.

O primeiro `dotnet test ... --no-restore` não iniciou por `NETSDK1064` (`Microsoft.EntityFrameworkCore.Analyzers 8.0.10` ausente no cache NuGet). `dotnet restore backend/Tests/Tests.csproj --nologo` completou; os resultados RED/GREEN abaixo são das execuções subsequentes.
