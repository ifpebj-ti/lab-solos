# T010 — RED

Antes de implementar o repositório, a caracterização `ExistingSchemaPersistsEncryptedRecoveryJobPayload` gravou e leu no PostgreSQL 15 um `PasswordRecoveryJob` com ciphertext, nonce e tag sintéticos. Ela passou, confirmando o comportamento de persistência já existente.

O teste `RecoveryRepositoryProvidesReservationBehavior` procurou o tipo `PasswordRecoveryJobRepository` por reflexão e falhou em runtime com `Assert.NotNull() Failure: Value is null`. Não houve erro de compilação; a falha demonstrou a ausência do componente necessário para as reservas concorrentes.

Comando:

```powershell
dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~RecoveryJobRepositoryTests" --no-restore --nologo --verbosity minimal
```

Resultado: 2 testes, 1 passou (caracterização) e 1 falhou (comportamento ainda ausente). O teste de reflexão foi então substituído por cenários de integração PostgreSQL concretos para cada contrato T010.
