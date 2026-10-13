# T017 — Admissão neutra e compartilhada da recuperação

Execução no worktree isolado T017 em 2026-10-13. Issue #438 permaneceu aberta e em `In Progress`.

## RED

- O primeiro comando de teste não chegou a executar os casos porque faltava `Microsoft.EntityFrameworkCore.Analyzers 8.0.10` no cache local. `dotnet restore backend/backend.sln --locked-mode --nologo` completou a preparação pelo lockfile; essa falha de ambiente não foi contabilizada como RED.
- O teste de integração `RepeatedAliasesWithinCooldownCoalesceWithoutSendingDuringRequest`, contra PostgreSQL 15 e o controller anterior, falhou como esperado: o contrato exigia zero envios síncronos no HTTP, mas as duas rotas produziram dois envios SMTP. Isso reproduziu o trabalho duplicado que T017 corrige.

## GREEN e REFACTOR

- Ambos aliases delegam ao mesmo serviço de admissão. A solicitação HTTP não consulta a conta nem chama SMTP; devolve o mesmo `202 Accepted` neutro e cabeçalhos `no-store` mesmo quando a admissão é limitada ou falha operacionalmente.
- A admissão aplica cooldown de 60 segundos e cotas públicas de 3 por destinatário e 20 por IP. Destinatários inexistentes/inativos passam pelo mesmo caminho e consomem a cota de IP. Cotas, cooldown e enfileiramento/coalescência compartilham a transação; `QueueFull` retorna sem completar a admissão, então o descarte da tentativa reverte cotas e cooldown.
- O payload enfileirado contém somente o e-mail, protegido pelo repositório antes da persistência. Os arrays temporários de chaves/payload são limpos após a operação.
- O filtro final, incluindo cenários de aliases, cooldown, contagem de cotas, renovação sem janela deslizante, recipients inexistente/inativo e fila cheia com rollback, passou: `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~PasswordRecoveryAbuseTests|FullyQualifiedName~PasswordRecoveryTests|FullyQualifiedName~EmailControllerTests" --no-restore --nologo --disable-build-servers` — 15 passaram, 0 falharam, 0 ignorados.
- Build completo forçado: `dotnet build backend/backend.sln -c Release --no-restore --nologo --disable-build-servers --no-incremental` — sucesso, 0 erros e 174 avisos gerais do analisador; nenhum aviso nos arquivos novos de serviço/integração, no controller ou no registro compartilhado de DI. Os avisos em `PasswordRecoveryTests.cs` são CA1707/CA1869 já existentes nessa suíte.
- `git diff --check` — sem erros de whitespace.

## Arquivos de T017

- `backend/LabSolos-Server-DotNet8/Controllers/EmailController.cs`
- `backend/LabSolos-Server-DotNet8/Services/Security/PasswordRecoveryRequestService.cs`
- `backend/LabSolos-Server-DotNet8/Services/Security/SecurityServiceCollectionExtensions.cs` (preservadas as integrações de tarefas anteriores)
- `backend/Tests/Controllers/EmailControllerTests.cs`
- `backend/Tests/Controllers/PasswordRecoveryTests.cs`
- `backend/Tests/Integration/PasswordRecoveryAbuseTests.cs`
- `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T017/execucao.md`

Os DTOs `PasswordResetRequestDTO` e `EmailDTO` já expunham o campo necessário e não precisaram de alteração. O contrato do payload de e-mail foi mantido para a tarefa T018.

## Integração no checkout principal

- Filtro T017: 15 passaram, 0 falharam.
- Regressão cruzada T012/T017: `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~UserProfileMutationTests.EmailChangeFailsClosedWhenTheExactDeliveryKeyIsNotConfigured|FullyQualifiedName~UserProfileMutationTests.OwnerEmailChangeRequiresCorrectPasswordAndCancelsRecoveryWithoutRevokingSession|FullyQualifiedName~PasswordRecoveryAbuseTests|FullyQualifiedName~PasswordRecoveryTests|FullyQualifiedName~EmailControllerTests"` — 17 passaram, 0 falharam.
- Regressão backend completa: `dotnet test backend/Tests/Tests.csproj -c Release` — **409 passaram, 0 falharam, 0 ignorados**.
- Reconstrução Release não incremental: sucesso, 0 erros e 174 avisos gerais; nenhum aviso nos arquivos de produção T017 nem nos ajustes de integração.
- A primeira regressão integrada revelou que a chave HMAC sintética padrão de `IntegrationTesting` fazia o PATCH de e-mail retornar `200`, embora T012 exija `503` sem chave de entrega exata. A integração agora marca a chave sintética explicitamente e o serviço de perfil falha fechada nesse caso; fixtures que injetam chave de teste própria continuam funcionando.
- `git diff --check` — sem erros de whitespace.

Arquivos alterados na revisão de integração: `backend/LabSolos-Server-DotNet8/Services/Security/ThrottleKeyFactory.cs` e `backend/LabSolos-Server-DotNet8/Services/Security/UserProfileUpdateService.cs`, além do registro em `SecurityServiceCollectionExtensions.cs`.
