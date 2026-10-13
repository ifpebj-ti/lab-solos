# Ambiente e contratos T005

- Checkout isolado: `C:\Users\Nathan\AppData\Local\Temp\lab-solos-orchestrator-20261013\T005`.
- `frontend/package.json` declara `packageManager: npm@10.8.2`; Node local: 24.21.0. Corepack resolveu npm 10.8.2 para a validacao final. O workflow `container-ci.yml` usa Node 20.
- `corepack npm ci` instalou 857 pacotes sem alterar manifestos ou lockfile. O audit automatico informou 11 vulnerabilidades no grafo bloqueado (3 moderadas, 8 altas); esta tarefa nao altera dependencias.
- Issue #437 foi confirmada OPEN, atribuida a `nathannmvr` e `In Progress` no Project 41. Nenhuma mutacao externa foi feita nesta tarefa.
- `.github/workflows/container-ci.yml` executa `frontend-quality` em PRs para `develop` (`opened`, `synchronize`, `reopened`, `edited`, `ready_for_review`) e `merge_group`; o Quality gate exige o job. O workflow executa `npm ci`, testes, lint e build. Nao houve execucao remota de CI nesta tarefa.
