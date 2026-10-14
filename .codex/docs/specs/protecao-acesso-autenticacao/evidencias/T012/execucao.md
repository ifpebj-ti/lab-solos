# T012 — Execução e evidências

Data: 2026-10-13
Issue: #436
Escopo: PATCH de perfil, autorização, confirmação transitória de senha atual e cancelamento de recuperação após troca de e-mail.

## RED

Antes da implementação, o filtro dos novos testes executou dois cenários HTTP contra PostgreSQL:

- `MentorCannotPatchAnotherProfileAndGetsTheSameNotFoundResponseAsAMissingProfile`: esperado 404 para mentorado sem vínculo, mas a API respondeu 200 e aplicou a alteração.
- `OwnerCannotChangeEmailWithoutCurrentPasswordAndTheDatabaseRemainsUnchanged`: esperado 400 com `current_password_invalid`, mas a API respondeu 200 e persistiu o e-mail sem confirmação.

Resultado: 2 falhas comportamentais/2 testes; nenhuma falha de compilação.

## GREEN e REFACTOR

Foi criado `UserProfileUpdateService` para validar e aplicar o documento sob uma transação PostgreSQL e bloqueio `FOR UPDATE` do usuário. O serviço exige titular ou Administrador para mutações, valida os caminhos e tipos de operação JSON Patch antes de aplicá-los, limita o documento a 10 operações e rejeita operações mistas não autorizadas sem salvar alterações.

`SenhaAtual` existe somente no DTO transitório. A troca própria de e-mail verifica a senha sob o bloqueio, inclusive para Administrador, responde 400 para confirmação ausente/incorreta e 409 para e-mail duplicado. O mapa da resposta continua sendo `UsuarioDTOPatchResponse`. A mudança limpa o token de recuperação e cancela, na mesma transação, trabalhos ativos vinculados pelo ID ou pela chave exata de entrega do e-mail anterior. O payload é apagado e a capacidade da fila é decrementada; `VersaoSessao` não é alterada.

Para cancelar também trabalhos ainda sem `UserId`, o serviço usa `ThrottleKeyFactory.CreateRecoveryDeliveryKey` com o endereço anterior. Quando essa dependência não está registrada, a troca de e-mail falha fechada com 503 e mantém o banco intacto. A integração de produção deve registrar a fábrica com a chave compartilhada configurada pela tarefa operacional T022; a factory de teste usa somente uma chave sintética.

## Validação

- `dotnet restore backend/backend.sln --locked-mode` — sucesso. A primeira tentativa de teste sem restore não encontrou `Microsoft.EntityFrameworkCore.Analyzers` 8.0.10 (`NETSDK1064`); após a restauração travada, o baseline executou normalmente.
- Baseline: `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~UserResourceAuthorizationTests|FullyQualifiedName~UsuarioDataContractTests" --no-restore --nologo --logger "console;verbosity=minimal"` — 31/31 aprovados.
- RED: `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~UserProfileMutationTests" --no-restore --nologo --logger "console;verbosity=minimal"` — 2 falhas comportamentais/2, conforme descrito acima.
- Filtro final da tarefa: `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~UserProfileMutationTests|FullyQualifiedName~UserResourceAuthorizationTests|FullyQualifiedName~UsuarioDataContractTests" --no-restore --nologo --logger "console;verbosity=minimal"` — 48/48 aprovados em PostgreSQL.
- `dotnet build backend/backend.sln --no-restore -c Release -t:Rebuild --nologo --disable-build-servers` — 0 erros e 176 avisos gerais do repositório. Restaram três CA1848 em chamadas de log preexistentes do `UsuariosController`; nenhum aviso foi emitido pelo novo serviço, DTO, mapeamento, registro DI ou testes T012.
- `git diff --check` — sem erros de whitespace. Git emitiu apenas os avisos de normalização LF/CRLF de arquivos T013 preexistentes no worktree.

Os cenários de integração cobrem perfil próprio, mutação cruzada, status em documento misto, gestão por Administrador, senha ausente/incorreta/correta, Administrador no próprio perfil, duplicação de e-mail sem mutação parcial, resposta sem senha, acesso de recuperação pelo novo endereço, limite e allowlist de operações JSON Patch, limite de 10 operações, duplicação de `senhaAtual`, cancelamento tanto de trabalho com `UserId` quanto de trabalho pendente com `UserId = null`, limpeza do payload, capacidade e versão da sessão.
