# T008 — GREEN, refactor e validação

Data: 2026-10-13.

## Implementação

- Aplicado `UserResourceAccessService` como filtro EF antes da projeção de perfil, responsável, dependentes e empréstimos.
- Mentor vinculado recebe `UsuarioAcompanhamentoDTO`, limitado aos dez campos aprovados. Titular e Administrador mantêm seus DTOs atuais, incluindo o resumo do responsável no perfil próprio.
- GET individual e responsável sem acesso usam o mesmo `ProblemDetails` público de 404. Listas autorizadas vazias, inclusive aprovações, retornam 200/`[]`; listagem por tipo exige Administrador.
- Serviço de acesso registrado no contêiner de segurança. A aprovação/rejeição não foi alterada.
- O refactor concentrou a composição de expressões EF, a validação de responsável e a resposta uniforme em helpers privados. Os contratos verificam os campos exatos e o mapeamento do novo DTO.

## Comandos

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~UserResourceAuthorizationTests|FullyQualifiedName~UsuarioDataContractTests|FullyQualifiedName~RequiredPasswordChangeAuthorizationTests|FullyQualifiedName~CriticalUserApprovalTests" --nologo --verbosity quiet` — 45/45.
- `dotnet test backend/Tests/Tests.csproj -c Release --no-build --no-restore --nologo --verbosity quiet` — 310/310, sem falhas ou skips.
- `dotnet build backend/backend.sln -c Release --nologo --disable-build-servers` — sucesso, 0 avisos e 0 erros.
- `git diff --check` — sucesso.

Os testes exercitam dois Mentores, dois Mentorandos e Administrador; comparam corpos de 404 cruzado/inexistente; verificam a lista de empréstimos contra uma linha pertencente à outra dupla; e preservam a troca obrigatória de senha e decisões de aprovação/rejeição.

## CI e limites

`.github/workflows/container-ci.yml` inicia em `pull_request` para `opened`, `synchronize`, `reopened`, `edited` e `ready_for_review`, e executa `dotnet test backend/Tests/Tests.csproj` antes do merge. Não foi identificada lacuna de validação pré-merge para esta mudança.

Nenhum novo aviso foi emitido para os arquivos de T008 nos testes finais. Os avisos de análise já existentes em métodos antigos de `UsuarioDataContractTests` permanecem fora do escopo. A issue #436 continua aberta e `In Progress`.

## Validação consolidada da onda 2

A suíte backend integrada na branch principal passou 337/337, sem falhas ou skips, após a correção T006 das caracterizações antigas de migração. O rebuild forçado de `backend/Tests/Tests.csproj` teve 0 erros e 181 avisos de análise no conjunto; não há warnings introduzidos pelos caminhos T008. Três avisos CA1848 em chamadas de log preexistentes e inalteradas no controller, além de avisos legados CA1707/CA1305 em UserDataMigrationTests, permanecem registrados. `git diff --check` passou.
