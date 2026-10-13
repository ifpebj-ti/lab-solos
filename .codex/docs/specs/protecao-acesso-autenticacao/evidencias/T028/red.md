# T028 — Caracterização documental (RED)

Data: 2026-10-13. Worktree isolado: `lab-solos-orchestrator-20261013/T028`.

## Verificação anterior à edição

- `python .github/scripts/check_manual.py --source docs/manual` — aprovado antes das mudanças. O verificador atesta manifesto, jornadas, links e imagens; não atesta a cobertura dos novos limites e procedimentos operacionais.
- `python -m unittest discover -s .github/scripts/tests -p "test_manual_content.py" -v` — 44 testes executados, 43 aprovados e 1 ignorado por a criação de symlink exigir privilégio indisponível no Windows.
- `docs/manual/manual.json` e as sete páginas listadas ainda indicavam versão `2026-09-23.1` e data `2026-09-23`.
- Não existia `.codex/docs/specs/protecao-acesso-autenticacao/operacao.md`.
- A leitura de `README.md`, `CHANGELOG.md`, do README de migrações e do README OCI não encontrava procedimentos para as duas novas chaves operacionais, rotação coordenada, saturação das cotas/fila, nova migração `AuthenticationProtection` ou limites do rollback de imagens.

## Lacunas constatadas

O manual já orientava os fluxos de login, troca/recuperação de senha e perfis, mas não explicava o feedback de `429`/`Retry-After`, a espera sem nova submissão automática, o efeito de IP compartilhado por NAT ou a confirmação por senha atual ao trocar o próprio email. O conteúdo existente não podia ser usado como runbook de produção porque faltavam os novos requisitos de chave, migração e reversão compatível.

Esta caracterização é documental. Não alterou comportamento para fabricar uma falha; os comandos de validação inicial demonstraram que a estrutura documental antiga era sintaticamente válida, enquanto as lacunas acima foram verificadas por presença/ausência e comparação com a configuração e as evidências locais.
