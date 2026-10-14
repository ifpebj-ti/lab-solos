# T019 - Validacao

## RED

Baseline anterior as mudancas: 25/25 aprovados no filtro de credenciais, tokens, recuperacao e sessao.

`PasswordResetThrottleTests.SixthInvalidCodeAcrossAliasesIsLimitedWithoutChangingAccountOrToken` reproduziu o defeito em PostgreSQL 15: depois de cinco falhas alternando os dois aliases, a sexta retornava 400 em vez de 429. O primeiro erro de configuracao da chave sintetica foi corrigido no fixture e nao foi contado como RED; a reproducao comportamental seguinte falhou pelo motivo esperado.

## GREEN e regressao

Comando exigido por T019:

```powershell
dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~PasswordResetThrottleTests|FullyQualifiedName~CredentialServiceTests|FullyQualifiedName~RecoveryTokenTests|FullyQualifiedName~PasswordRecoveryTests|FullyQualifiedName~JwtSessionVersionTests" --nologo
```

Resultado: 28 aprovados, 0 falhas.

Validacao complementar do mock/controller cujo construtor mudou para o contrato IP-aware:

```powershell
dotnet test backend/Tests/Tests.csproj -c Release --no-build --filter "FullyQualifiedName~EmailControllerTests" --nologo -v:q
```

Resultado: 5 aprovados, 0 falhas.

Build da aplicacao:

```powershell
dotnet build backend/LabSolos-Server-DotNet8/LabSolos-Server-DotNet8.csproj -c Release --nologo -v:q
```

Resultado: build concluido, 0 avisos e 0 erros.

`git diff --check` e a verificacao focada nos arquivos de T019 terminaram sem erros. O comando geral exibiu apenas avisos de conversao LF/CRLF de arquivos sem relacao com T019. O build do filtro de testes emitiu avisos de analise existentes em outros arquivos do repositorio; nenhum apontou para os arquivos de producao alterados nesta tarefa.

## Compatibilidade e integracao

- `ICredentialService.ResetPasswordAsync` mantem sua assinatura; o fake da T018 nao precisou ser alterado.
- `EmailControllerTests.cs` recebeu somente a atualizacao de mocks exigida pela nova dependencia do controller. Esse caminho auxiliar nao constava da lista original de posse e deve ser registrado como ajuste minimo de integracao.
- DTOs de reset e `RecoveryTokenTests.cs` nao precisaram de alteracao; os contratos existentes foram cobertos pela regressao focada.
- #438 permaneceu aberta e `In Progress`; nenhuma publicacao, commit ou deploy foi feito.


## Validacao integrada no checkout principal

- Filtro obrigatorio T019: 28 aprovados, 0 falhas, apos integrar e ajustar a ordem de `IPAddress?` e `CancellationToken`.
- Filtro complementar `FullyQualifiedName~EmailControllerTests`: 5 aprovados, 0 falhas.
- Suite completa do backend em Release: 425 aprovados, 0 falhas.
- Rebuild da solucao `backend/backend.sln` em Release: 0 erros e 174 avisos gerais. Nenhum aviso de producao foi emitido nos arquivos T019 apos corrigir a ordem dos parametros e tornar concreto o tipo de retorno privado.
- `git diff --check`: sem erros de whitespace; Git emitiu somente avisos LF/CRLF de arquivos preexistentes nao relacionados.
