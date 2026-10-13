# T019 — RED

## Linha de base

`dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~CredentialServiceTests|FullyQualifiedName~RecoveryTokenTests|FullyQualifiedName~PasswordRecoveryTests|FullyQualifiedName~JwtSessionVersionTests" --nologo`

Resultado anterior à mudança: 25 testes aprovados.

## Falha de comportamento reproduzida

Teste: `PasswordResetThrottleTests.SixthInvalidCodeAcrossAliasesIsLimitedWithoutChangingAccountOrToken`.

Comando:

```powershell
dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~PasswordResetThrottleTests.SixthInvalidCodeAcrossAliasesIsLimitedWithoutChangingAccountOrToken" --nologo
```

Após cinco tentativas inválidas alternando os dois aliases, a sexta tentativa retornou 400; o esperado é 429 antes da validação do código. Isso comprova a ausência da cota compartilhada no fluxo atual.

Uma primeira execução retornou 500 porque a nova fixture não havia registrado a chave de cifragem sintética exigida pela admissão já existente. A fixture passou a registrar a chave de teste e a execução seguinte falhou pelo comportamento acima; a falha de configuração não foi considerada RED.
