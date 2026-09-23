# Resultado de execução — T026

## Escopo

A devolução de empréstimos foi reformulada no caminho administrativo sob responsabilidade da tarefa, mantendo contexto, autorização, campos de vidraria e integração PATCH existente.

- Surface/canvas responsivos e tokens nos dois temas.
- Informação de solicitante, responsável e data permanece antes das listas.
- Químicos seguem somente leitura; vidrarias preservam switches e justificativas; outros preservam dados de lote/unidade.
- Submissão bloqueia duplicidade, aguarda a recarga e só exibe sucesso quando a atualização é confirmada.
- Falhas usam feedback contextual sem expor segredo e reabilitam o controle.

## RED / GREEN / REFACTOR

- RED: caracterização dirigida de loading, erro, autorização, PATCH, conflito, recarga e controles responsivos.
- GREEN: 33/33 testes dirigidos aprovados.
- REFACTOR: shell, superfícies, foco e estados visuais tokenizados sem alterar corpo/contrato do PATCH.

## Validações

- Suíte dirigida: 7 arquivos, 33 testes aprovados.
- Suíte geral Vitest: 139 arquivos, 641 testes aprovados.
- Lint: aprovado.
- Build local e Compose: aprovados, com avisos conhecidos de `/env.js`, `laboratory.png` e chunk grande.
- Detector Impeccable em `ReturnLoan.tsx`: `[]`.
- E2E real `critical/loans.spec.ts`: 4/4 aprovados.
- E2E UI T007 devolução: 5/5 aprovados em 320, 375, 767, 768 e 1440 px.
- Cobertura progressiva: 63 superfícies e 44 rotas.
- `git diff --check`: aprovado; avisos restantes são conversões CRLF do worktree.

## Aceite e limitações

A confirmação global de Nathan foi aplicada aos gates humanos. Não houve issue/Project por autorização explícita. A revisão independente `audit/critique` do Impeccable não está disponível no launcher instalado. T026 foi concluída sob limitação de ambiente/contrato compartilhado e T027 foi liberada.
