# T028 — documentação consolidada (GREEN/REFACTOR)

Data: 2026-10-13. Revisão no worktree isolado T028.

## Conteúdo atualizado

- O manual explica os limites padrão, `429`/`Retry-After`, espera sem reenvio automático, efeito de IP compartilhado/NAT, escopo da normalização de email, troca do próprio email com senha atual e resposta neutra da recuperação. A matriz de perfis descreve acesso por papel e vínculo.
- A versão/data editorial foi atualizada para `2026-10-13.1`/`2026-10-13`. O campo `produtoValidado` conserva a referência existente; esta tarefa não publicou nem criou um snapshot de produto.
- README e changelog apontam a configuração fail-closed e o runbook, mantendo a mudança sob “Não publicado”.
- O README de migrações documenta o preflight de duplicatas exatas, a nova migração e o efeito destrutivo de `Down`, sem mescla ou exclusão automática.
- O README OCI registra formato/permissões das chaves, setup inicial, rotação coordenada, defaults atuais, NAT, saturação, SMTP, CORS/CSP e alcance do rollback automático. O runbook reúne a sequência de upgrade, verificação, reversão e validação pós-publicação futura.
- As evidências anteriores foram citadas como testes locais com dados sintéticos. A duração de 13,9 s de T026 é identificada como tempo da execução Playwright, não latência de API nem SLO.

## Caminhos deste escopo

- `README.md`, `CHANGELOG.md`
- `docs/manual/README.md`, `docs/manual/acesso-e-conta.md`, `docs/manual/administrador.md`, `docs/manual/manual.json`, `docs/manual/manutencao.md`, `docs/manual/mentor.md`, `docs/manual/mentorado.md`, `docs/manual/perfis-e-permissoes.md`, `docs/manual/solucao-de-problemas.md`
- `backend/LabSolos-Server-DotNet8/Data/Migrations/README.md`, `infra/oci/README.md`
- `.codex/docs/specs/protecao-acesso-autenticacao/operacao.md`

Não foram alterados `tasks.md`, implementação, publicação, checks remotos nem configuração de branch.
