# Evidência T018 — recuperação em segundo plano

## RED

- O teste inicial de registro do worker falhou porque nenhum `PasswordRecoveryDeliveryWorker` estava registrado. O primeiro `--no-restore` não conseguiu restaurar `Microsoft.EntityFrameworkCore.Analyzers 8.0.10`; `dotnet restore backend/Tests/Tests.csproj --locked-mode --nologo` corrigiu apenas a preparação do ambiente. Depois do restore, a falha comportamental RED foi reproduzida.
- `PasswordChangeCancelsPendingDeliveryAndScrubsItsPayload` falhou com `Expected: Cancelled / Actual: Pending`: a troca de senha invalidava a versão da sessão, mas não cancelava imediatamente o job nem limpava seu payload.
- `ExpiredLeaseBetweenCredentialValidationAndSmtpPreventsStaleWorkerSend` falhou porque o SMTP ainda era chamado depois de a fixture expirar a reserva entre a consulta do token e o envio.

## GREEN e refactor

- Worker registrado com reserva de até 10 itens, lease de 60 s e um escopo por job. A elegibilidade e as atualizações de credencial são persistidas antes do SMTP; nenhuma transação de banco fica aberta durante o envio.
- `NextEmissionAt` é a referência de espaçamento de emissões por destinatário (60 s, incluindo emissão virtual para conta inelegível). `NextAllowedAt` continua sendo o cooldown de admissão da solicitação; o worker não o consulta nem consome cota.
- O token é persistido como hash na conta e mantido no payload cifrado da fila durante retries. Erros transitórios têm timeout SMTP de 15 s e até três tentativas, com intervalos de 30 s e 120 s; a terceira falha terminal limpa o payload. Falha permanente também termina como `Failed` e limpa o payload pela rotina terminal de retry.
- Troca e redefinição de senha cancelam, na mesma transação, jobs pendentes/em processamento e apagam seus payloads. A alteração de contato já usa o cancelamento integrado em T012.
- Imediatamente antes do SMTP, o worker confirma no PostgreSQL que ainda detém a lease e que ela permanece válida por todo o timeout configurado. Sem essa margem, o worker antigo não envia; a reserva expirada pode ser reclamada por outro worker.
- Exceções SMTP não são anexadas aos logs; eventos registram apenas a classe genérica do resultado.
- Ainda não há garantia de exatamente uma entrega: se o servidor SMTP aceitar a mensagem e o processo cair antes da finalização, pode haver reenvio do mesmo código cifrado, limitado a três tentativas.

## Validação

Comando direcionado exigido por T018:

```text
dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~RecoveryDeliveryWorkerTests|FullyQualifiedName~EmailServiceTests|FullyQualifiedName~RecoveryTokenTests|FullyQualifiedName~CredentialServiceTests" --no-restore --nologo --verbosity quiet
```

Resultado final: **26 aprovados, 0 falhas, 0 ignorados**. Cobertura inclui reserva única/concorrência, lease expirada antes do SMTP, retries com o mesmo código e intervalos 30/120 s, terceira falha e falha permanente com scrub, conta inativa, espera máxima de 15 min, espaçamento de emissão, cancelamento por mudança de senha e envio assíncrono.

```text
dotnet build backend/Tests/Tests.csproj -c Release --no-restore --nologo --verbosity quiet
```

Resultado: **Build succeeded; 0 warnings; 0 errors**. `git diff --check` não apontou erros de whitespace. O Git emitiu avisos de conversão LF/CRLF para arquivos existentes do worktree. Em uma compilação incremental anterior, o analisador reportou CA1707 em nomes de testes preexistentes de `CredentialServiceTests.cs`; nenhuma advertência foi emitida nos arquivos de worker/credenciais/e-mail desta tarefa.

O executor deixou `tasks.md` intacto e manteve a issue #438 aberta e `In Progress`; o orquestrador registrou o status após validar a integração.

## Validação integrada no checkout principal

- A primeira regressão integrada executou 421/422 testes: `LoginThrottleTests.MissingProductionThrottleSecretFailsClosedWithoutCheckingPassword` recebeu 500 em vez de 503. A causa era a resolução antecipada de `PasswordRecoveryJobRepository` ao instanciar `CredentialService` para qualquer rota do `AuthController`; sem configuração da chave de recuperação, o erro ocorria antes da ação de login.
- A dependência passou a ser resolvida sob demanda somente durante troca/redefinição de senha. O teste de regressão e o filtro T018 passaram juntos, **27/27**; a suíte backend completa passou, **422/422**.
- `dotnet build backend/backend.sln --no-restore -c Release --nologo --disable-build-servers -t:Rebuild` passou com **0 erros e 174 avisos gerais**; nenhum aviso foi emitido nos arquivos T018. `git diff --check` foi executado após a integração.
- A correção mantém o fail-closed no login com segredo de throttle ausente, sem exigir que as chaves da fila de recuperação sejam carregadas em rotas de autenticação não relacionadas.
