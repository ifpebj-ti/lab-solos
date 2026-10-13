# T006 GREEN / REFACTOR evidence, 2026-10-13

## GREEN

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~AuthenticationProtectionMigrationTests|FullyQualifiedName~CredentialLifecycleMigrationTests" --nologo --verbosity quiet` — 8 passed, 0 failed, 0 skipped. The PG15 tests prove empty and existing databases migrate through all five migrations, exact duplicate addresses abort with a sanitized diagnostic and preserve both rows, case-distinct addresses remain distinct, capacity rows seed once, key/count/capacity constraints reject invalid values, and active delivery hashes are unique only while a job is active.
- `dotnet tool restore` — succeeded; restored dotnet-ef 9.0.19.
- `dotnet ef migrations script --idempotent --project backend/LabSolos-Server-DotNet8/LabSolos-Server-DotNet8.csproj --startup-project backend/LabSolos-Server-DotNet8/LabSolos-Server-DotNet8.csproj --context AppDbContext --output .tmp/authentication-protection.sql` — succeeded; generated 20,359 bytes. Reviewed the script: duplicate check runs before schema/index creation inside the migration guard; it only reports a duplicate-group count, and the exact-email unique index plus new tables, constraints, seven capacity seeds, and active-job partial unique index are present.
- `dotnet ef migrations has-pending-model-changes --project backend/LabSolos-Server-DotNet8/LabSolos-Server-DotNet8.csproj --startup-project backend/LabSolos-Server-DotNet8/LabSolos-Server-DotNet8.csproj --context AppDbContext` — succeeded; snapshot matches the EF model.
- `dotnet build backend/backend.sln -c Release --nologo --disable-build-servers` — succeeded, 0 warnings and 0 errors.
- `git diff --check` — succeeded.

## REFACTOR / review

- Added one additive migration, `AuthenticationProtection`; prior migration source files were not rewritten.
- Centralized seven capacity-space names on `AuthenticationProtectionCapacity` so later quota consumers can share the seeded keys.
- Confirmed duplicate rejection does not include the address, rows remain intact, the migration history stays at four on failure, and no new protection table or email index remains after the aborted transaction.
- The migration was applied only to disposable Testcontainers PostgreSQL databases; no production database was targeted.

The initial test compilation surfaced existing repository analyzer warnings in unrelated files. The final required incremental solution build reported no warnings from this task.

## Integração na branch principal

O filtro integrado PostgreSQL 15 para migração e ciclo de credenciais passou 8/8. A recompilação da solução de testes encontrou avisos CA1707 nos nomes dos cinco testes novos; os métodos passaram a usar PascalCase. Após a correção, uma recompilação forçada de `backend/Tests/Tests.csproj` não emitiu avisos nos caminhos de T006. O filtro conjunto de T006 e T007 passou 23/23, sem avisos de compilação nas fontes dessas tarefas.
## Addendo de integração das caracterizações, 2026-10-13

O filtro RED das classes `UserDataMigrationTests` e `LoanReturnMigrationTests` executou 5 testes: 4 falharam conforme esperado por contagem/histórico antigo e seleção incorreta do predecessor, e 1 cenário de preservação passou.

`UserDataMigrationTests` agora inclui `_AuthenticationProtection` no histórico esperado e aguarda cinco entradas no banco totalmente migrado. `LoanReturnMigrationTests` identifica `_SeparateLoanReturnDates` e seleciona o predecessor pelo índice dessa migração, sem depender da última entrada do histórico.

Após os ajustes, o filtro passou 5/5 e a regressão das quatro classes de migração/ciclo passou 13/13. Build Release: 0 avisos/0 erros; `git diff --check`: sucesso.
## Validação consolidada da onda 2

Após integrar T004, T006, T007 e T008, a suíte backend completa passou 337/337, sem falhas ou skips. A recompilação forçada de `backend/Tests/Tests.csproj` teve 0 erros e 181 avisos de análise no conjunto; os avisos vistos em `UsuariosController.cs` e `UserDataMigrationTests.cs` estão em chamadas/métodos preexistentes, sem alteração de comportamento ou novas fontes de warning nesta onda. `git diff --check` passou.
