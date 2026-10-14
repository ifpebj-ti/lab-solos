# T004 — RED

Comando focado antes da implementação criptográfica:

```powershell
dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~RecoveryPayloadProtectorTests.ProtectsPayloadWithActiveKeyAndAuthenticatesRecoveryContext" --nologo --verbosity normal
```

Resultado: 1 teste executado, 1 falha comportamental em `Assert.NotEqual`: a implementação mínima sem cifra devolvia os mesmos bytes enviados como plaintext. O teste compilou e executou; não foi uma falha de restore ou ambiente. A saída foi sanitizada e nenhum valor de payload foi copiado para esta evidência.
