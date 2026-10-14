# T028 — validação documental

Data: 2026-10-13. Execução no worktree isolado T028.

## Comandos exigidos

| Comando | Resultado |
| --- | --- |
| `python .github/scripts/check_manual.py --source docs/manual` | Exit 0 — `Manual aprovado: manifesto e páginas coerentes.` |
| `python -m unittest discover -s .github/scripts/tests -p "test_manual_content.py" -v` | Exit 0 — 44 testes executados, 43 aprovados e 1 ignorado. O caso ignorado depende de privilégio do Windows para criar symlink (`WinError 1314`); a limitação foi informada pelo próprio teste. |

## Checks documentais complementares

- Verificação local de links Markdown em README, CHANGELOG, README de migrações, README OCI e runbook: 5 arquivos examinados; todos os caminhos relativos existentes.
- `git diff --check` dos caminhos T028: sem erros de whitespace. O Git avisou que poderá normalizar os finais de linha de `docs/manual/manual.json` para CRLF na próxima escrita; a validação do manifesto passou.

## Limites da evidência

Os comandos validam o contrato do manual e os caminhos documentais locais. Não houve publicação, teste contra domínio público, execução SMTP em produção, benchmark de endpoint, medição de carga/throughput, confirmação de SLO ou teste em host OCI. A validação pós-publicação fica para T030 e depende de publicação autorizada e contas sintéticas fornecidas pelo responsável.
