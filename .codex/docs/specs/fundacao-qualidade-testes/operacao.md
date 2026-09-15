# Operação da esteira de qualidade

## Execução local

Na raiz do repositório, com o toolchain de `.github/quality/toolchain.json`:

```text
python -B .github/scripts/quality_baseline.py collect --output .tmp/quality/current.json
python -B .github/scripts/quality_baseline.py check --current .tmp/quality/current.json --base-ref origin/develop
python -B .github/scripts/quality_baseline.py render --current .tmp/quality/current.json --output .codex/docs/specs/fundacao-qualidade-testes/inventario.md
```

O `base-ref` deve ser uma revisão existente e confiável. O comando não faz
fetch, não usa a cópia candidata de `baseline.json` como substituta e retorna
2 para referência, política, fingerprint, produtor ou relatório inválido.
Retorno 1 é uma violação de qualidade; retorno 0 exige coleta completa, sem
alto aberto e sem ocorrência nova.

## CI e diagnóstico

`container-ci.yml` executa frontend, backend, E2E, contratos, contêineres e
`Code quality baseline` de forma independente. O job `Quality gate` usa
`if: always()` e `check_quality_gate.py` para exigir `success` de todos os
resultados; `failure`, `cancelled`, `skipped` e resultado ausente falham o
agregador. Relatórios são enviados como artefatos por sete dias, inclusive
quando a coleta ou o gate falham.

O workflow é disparado em PR para `develop` nos eventos `opened`,
`synchronize`, `reopened`, `edited` e `ready_for_review`, além de
`merge_group` e `workflow_dispatch`. A proteção de branch e os nomes de
checks obrigatórios ainda precisam ser verificados administrativamente no
GitHub; YAML local não constitui essa prova.

## Segurança e limpeza

Os jobs usam `contents: read`, ações de terceiros fixadas por SHA completo,
locks de dependência e nenhum segredo para PR de fork. E2E encerra a stack
descartável em etapa `always()`. Artefatos podem conter diagnósticos
sintéticos, não tokens reais; não são publicados no resumo como credenciais.

## T029 — pré-aceite e decisão operacional

Em 2026-09-15, a execução conservadora foi encerrada antes das suítes longas
porque o gate já estava objetivamente bloqueado:

| Comando | Resultado |
|---|---|
| `python -B .github/scripts/check_quality_toolchain.py` | exit 1: Node 24.14.0 vs 20.20.2, npm 11.9.0 vs 10.8.2 e Python 3.14.3 vs 3.12.14. |
| `python -B .github/scripts/quality_baseline.py check --current .tmp/quality/T027/current.json --base-ref origin/develop` | exit 2: bootstrap da base falhou pela divergência do toolchain. |
| `npm run test:e2e:list` em `frontend` | exit 0: 211 casos descobertos; não é execução E2E. |
| `bash .github/scripts/install_actionlint.sh .tmp/quality/T029/actionlint` | exit 1: WSL sem `/bin/bash`; actionlint não comprovado. |
| `git diff --check` | exit 0; somente avisos de conversão de final de linha do Git. |

O snapshot T027 também registra três altos abertos (QC-002, QC-003 e QC-005),
e CT-009/QC-001 continua sem caracterização real. Por isso não foram
executados `dotnet restore/test`, `npm ci`, lint, build, Vitest, a suíte E2E
completa ou a repetição E2E real nesta tentativa. A proteção remota de
`develop` e um PR de prova permanecem pendentes para T030.

Para retomar com segurança, primeiro resolver os altos e CT-009, disponibilizar
Linux/actionlint e executar sob os pins; somente depois repetir a lista de
validações de T029 em novos diretórios `.tmp/quality/T029/**`. Não usar uma
cópia candidata do baseline para mascarar o resultado e sempre remover as
stacks E2E pertencentes à execução.

## T029 — execução final e decisão operacional

A retomada foi concluída em 2026-09-15 usando o runtime exato preparado em
`.tmp/quality/T008/toolchain-20260915` (Node 20.20.2, npm 10.8.2, Python
3.12.14) e o actionlint oficial em
`.tmp/quality/T029-revalidation/actionlint-win/extracted/actionlint.exe`.

| Etapa | Comando/resultado verificável |
|---|---|
| Toolchain | `check_quality_toolchain.py`: exit 0; Node 20.20.2, npm 10.8.2, Python 3.12.14, .NET 8.0.419, Docker 29.7.2 e Compose 5.3.1. |
| Backend | `dotnet restore --locked-mode` exit 0; `dotnet test` exit 0, 180 aprovados, 0 falhas, 0 ignorados. |
| Frontend | `npm ci`, `npm run lint` e `npm run build`: exit 0; `npm run test -- --run`: 128 arquivos, 605 testes aprovados. |
| Playwright | `test:e2e:list`: 211 casos; suíte final completa 211/211, 0 ignorados; projeto `real` repetido 14/14. |
| Python | Windows: 319 aprovados e 2 skips legítimos de symlink; Linux: `test_manual_content.py` 44/44 e `test_manual_publication.py` 20/20, sem skips. |
| Workflows e baseline | actionlint, `collect` e `render` exit 0; a reclassificação fiel de QC-001 faz o `check` retornar exit 1, como gate esperado para alto aberto; `git diff --check` exit 0. |

A primeira execução E2E completa foi registrada como RED operacional (203
aprovados, 2 falhas e 6 não executados) porque `e2e-seed` foi construído sob
demanda dentro do timeout. A imagem foi prebuilt explicitamente, a suíte real
foi repetida e a suíte completa passou. Cada execução usou projeto Compose
exclusivo de T029 e terminou com `docker compose ... down --volumes
--remove-orphans`; a verificação final não encontrou containers do projeto.

O resultado operacional é **validação técnica executada, mas T029 bloqueada**
por QC-001. Os avisos de build/npm/analisadores .NET são preexistentes e não
falhas. A validação de proteção remota de `develop` e PR de prova não foi
inferida e permanece no escopo de T030.

### Revisão de classificação de QC-001

A evidência T016 confirma QC-001 como alto e aberto. O catálogo funcional foi
corrigido para refletir essa evidência, a coleta foi repetida e o comando
`quality_baseline.py check` retornou exit 1 com `functional:QC-001`. Os testes
de infraestrutura continuam verdes, mas não é permitido declarar aceite
global enquanto o contrato de data prevista/data efetiva, migração e reversão
não for definido.

## Estado final após T031 e T030

T029 está concluída: a migration de devolução foi validada em PostgreSQL,
Playwright passou em 197 casos UI e 14 casos reais, e o baseline final passou
em `collect`, `check` e `render` sem alto aberto.

T030 está concluída: o ruleset `develop` 9464959 preserva os sete checks
existentes e exige também `Code quality baseline` e `Quality gate`. A PR de
prova registrou uma revisão RED bloqueada e uma revisão GREEN aprovada, sem
merge automático.
## Prova remota encerrada

A revisao GREEN foi confirmada no commit `29c8050fc819085bb5acb6aa602242a4265116ee`
pela execucao [35008036822](https://github.com/ifpebj-ti/lab-solos/actions/runs/35008036822).
Os nove checks obrigatorios passaram, assim como os gates de dependencia na
execucao [35008036907](https://github.com/ifpebj-ti/lab-solos/actions/runs/35008036907).
O PR #346 esta `CLEAN` e continua aberto para revisao humana; nao houve merge
automatico. Os itens #227 e #237 foram marcados como `Done` no Project 41.
