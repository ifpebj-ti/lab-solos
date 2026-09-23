# T010 — Resultado de execução

Data: 2026-09-22

## RED

A suíte dirigida existente de `frontend/src/pages/admin/Home.test.tsx` caracterizou os contratos de falha parcial, retry isolado, seleção por query, respostas fora de ordem e estados inválido/indisponível. Antes da recuperação central, 5 dos 7 testes administrativos falhavam porque a home não possuía a superfície lista-detalhe nem a seleção persistida.

## GREEN

- `npm.cmd --prefix frontend run test -- --run --reporter=dot src/pages/admin/Home.test.tsx src/pages/Home.test.tsx`: 2 arquivos, 12 testes aprovados.
- `npm.cmd --prefix frontend run test -- --run --reporter=dot`: 138 arquivos, 637 testes aprovados.
- `npm.cmd --prefix frontend run lint`: aprovado sem warnings.
- `npm.cmd --prefix frontend run build`: aprovado.
- `impeccable.cmd detect --json` nos alvos da T010: `[]`.
- Build servido localmente por Vite Preview: `design-pilots.spec.ts --grep login`, 4/4 cenários aprovados, axe 0/0 em claro/escuro a 320/1440 px.
- `git diff --check`: aprovado.

## Implementação

A recuperação central em `frontend/src/pages/admin/Home.tsx` preserva as três consultas administrativas independentemente, não fabrica zero em caso de falha, expõe pendências reais como seleção lista-detalhe, preserva parâmetros existentes ao adicionar `id`, navega para os destinos canônicos de análise e mantém o detalhe escolhido quando as respostas chegam fora de ordem. IDs inválidos e pendências indisponíveis têm mensagens explícitas; o diagnóstico local da falha é preservado junto ao feedback categorizado.

## Limitação de ambiente

O comando `docker compose -f docker-compose-e2e.yml up -d --build --wait` não pôde ser executado porque o contexto `desktop-linux` apontou para `dockerDesktopLinuxEngine`, cujo named pipe não existia nesta sessão. O executável/processo do Docker Desktop também não foi encontrado nos caminhos padrão; nenhum container foi derrubado ou alterado. Por isso, a validação E2E dependente de backend/Docker não foi aprovada nesta retomada; o piloto de login foi validado contra o build local. A limitação fica registrada sem mascará-la como verde.

Sem issue/Project por autorização explícita; sem commit, push ou PR.
