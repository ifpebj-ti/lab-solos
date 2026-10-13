# T006 evidence, 2026-10-13

Issue #438 in `ifpebj-ti/lab-solos` was already open and assigned to `nathannmvr`; Project #41 was already `In Progress`. This state was confirmed without external mutation.

Docker Desktop server 29.8.0 is active. The isolated T006 worktree is `C:\Users\Nathan\AppData\Local\Temp\lab-solos-orchestrator-20261013\T006`; initial migration-owned paths had no edits.

## Baseline

`dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~CredentialLifecycleMigrationTests" --nologo --verbosity quiet` passed 3/3 against PostgreSQL 16 before T006 tests were added. Existing repository analyzer warnings were emitted during compilation.

## RED

Added PostgreSQL 15 tests before production/model changes and updated the four-migration characterization to expect five migrations. The first compile attempt surfaced a C# collection-expression type error in the new test helper; fixed that test-only compile issue before accepting RED.

`dotnet test backend/Tests/Tests.csproj -c Release --no-build --no-restore --filter "FullyQualifiedName~AuthenticationProtectionMigrationTests|FullyQualifiedName~CredentialLifecycleMigrationTests" --nologo --verbosity normal` executed 7 tests: 1 passed (legacy credential-upgrade characterization), 6 failed for expected missing behavior:

- migration history/schema remained at four migrations;
- exact duplicate email rows did not abort migration;
- active recovery-job table/index was absent.

Docker/Testcontainers successfully started PostgreSQL 15 and 16. This was a behavioral RED, not a setup or compile failure.
