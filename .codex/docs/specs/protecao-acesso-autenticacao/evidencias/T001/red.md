# T001 — RED

Teste adicionado antes da alteração da factory: `FactoryRecreatesDatabaseThroughMigrations` verifica que o reset da base deixa migrações registradas no histórico do EF Core.

Comando:

```powershell
dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~AuthenticationProtectionHarnessTests"
```

Resultado esperado e observado antes da correção:

```text
Failed: 1, Passed: 0, Total: 1
Assert.NotEmpty() Failure: Collection was empty
```

O teste inicializou a `WebApplicationFactory` antes de recriar o banco, isolando `RecreateDatabaseAsync` da migração automática de inicialização. A causa foi o uso de `EnsureCreatedAsync`, que criava o schema sem preencher `__EFMigrationsHistory`. A falha foi comportamental para a infraestrutura, não uma falha de Docker, compilação ou arquivo ausente.
