# Aceite da fundação de qualidade

## Estado histórico em 2026-09-15

| Critério | Estado | Evidência |
|---|---|---|
| CA-001 — suítes não vazias e cenários críticos | Aceito localmente | [T029](evidencias/T029.md): backend 180/180, Vitest 605/605, Playwright 211/211 e Python validado nos ambientes Windows/Linux |
| CA-002 — altos e novas violações | Bloqueado | [T029](evidencias/T029.md): `collect` e `render` passam, mas o `check` retorna exit 1 por `functional:QC-001` alto e aberto |
| CA-003 — proteção efetiva de `develop` | Bloqueado | [T030](evidencias/T030.md): regra remota não exige os novos checks e não há PR de prova autorizado |

## Regra remota observada

O ruleset ativo `develop` (ID `9464959`) aplica-se a `refs/heads/develop` e
exige estes checks existentes do GitHub Actions:

- `Frontend quality`
- `Backend quality`
- `Workflow contracts`
- `Scan frontend on linux/amd64`
- `Scan frontend on linux/arm64`
- `Scan backend on linux/amd64`
- `Scan backend on linux/arm64`

O ruleset também impede exclusão e non-fast-forward. Ele não contém
`Code quality baseline` nem `Quality gate`, que foram entregues no workflow
local em T028.

## Fechamento após T031 e T030

| Critério | Estado | Evidência |
|---|---|---|
| CA-001 — suítes não vazias e cenários críticos | Aceito | T029: backend 183/183, Vitest 605/605, Playwright UI 197/197 + real 14/14 |
| CA-002 — altos e novas violações | Aceito | T031/T029: QC-001 corrigido, 4 altos funcionais corrigidos, `check` final exit 0 |
| CA-003 — proteção efetiva de `develop` | Aceito | T030: ruleset 9464959 com nove checks, prova RED bloqueada e revisão GREEN aprovada |

O aceite da fundação está concluído. A PR de prova permanece aberta e sem
merge para preservar a evidência administrativa; a revisão corrigida foi
aprovada por todos os checks obrigatórios. QC-004 e QC-006 permanecem no
backlog de média/baixa prioridade e não são altos abertos.

## Decisão

As validações técnicas locais foram executadas. O aceite global/merge não pode
ser fechado sem resolver QC-001, atualizar a proteção remota e executar o PR de
prova descrito na T030.
Nenhuma proteção, PR, issue ou merge foi mutado nesta execução.
## Atualizacao final da prova remota

O aceite foi concluido em 2026-09-15. A revisao GREEN do PR #346 foi executada
no commit `29c8050fc819085bb5acb6aa602242a4265116ee` na execucao
[35008036822](https://github.com/ifpebj-ti/lab-solos/actions/runs/35008036822),
com os nove checks obrigatorios aprovados, incluindo E2E real, baseline e
`Quality gate`. O workflow de dependencias tambem passou na execucao
[35008036907](https://github.com/ifpebj-ti/lab-solos/actions/runs/35008036907).

A revisao RED esta registrada no commit `d4b9cf71a4d109051e41b49d3743e93a12f3a185`
e na execucao [35000986662](https://github.com/ifpebj-ti/lab-solos/actions/runs/35000986662).
O ruleset `develop` 9464959 esta ativo com nove checks obrigatorios; o PR
permanece aberto, sem merge automatico. As issues #227 e #237 estao como
`Done` no Project 41.

Portanto, CA-001, CA-002 e CA-003 estao aceitos e a fundacao de qualidade esta
concluida.
