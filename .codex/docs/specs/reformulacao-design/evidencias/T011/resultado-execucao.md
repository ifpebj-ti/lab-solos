# T011 — Resultado de execução

Data: 2026-09-22

## RED

Os testes existentes cobriram a preservação de paginação, ordenação, filtros de tipo, busca e destino por perfil. A lacuna caracterizada para o piloto era a busca restrita ao nome, sem indexar quantidade, unidade e status, além de tratar falha de catálogo como coleção vazia sem feedback contextual.

## GREEN

- `npm.cmd --prefix frontend run test -- --run --reporter=dot src/components/screens/SearchMaterialComponent.test.tsx`: 1 arquivo, 7 testes aprovados.
- `npm.cmd --prefix frontend run test -- --run --reporter=dot`: 138 arquivos, 639 testes aprovados.
- `npm.cmd --prefix frontend run lint`: aprovado sem warnings.
- `npm.cmd --prefix frontend run build`: aprovado.
- `impeccable.cmd detect --json` nos alvos da T011: `[]`.
- `design-pilots.spec.ts` no build servido localmente: 6/6 cenários aprovados em claro/escuro; catálogo Mentor validado e login validado em 320/1440 px. Login teve axe 0/0; catálogo reteve os achados legados `button-name` e `color-contrast`, já registrados fora da posse da T011.
- `git diff --check`: aprovado.

## Implementação

`SearchMaterialComponent` agora carrega catálogo e indicadores com estados independentes, permite retry, diferencia falha de vazio, usa `—` quando o indicador ainda não está disponível e ignora respostas de requisições antigas após retry. O índice local pesquisa nome, categoria, quantidade, unidade e status; a paginação volta à primeira página quando o filtro muda; a ordenação, os destinos canônicos e os links de detalhe existentes foram preservados.

## Limitação de ambiente

O Docker Desktop/daemon não estava disponível nesta sessão; o compose E2E não pôde ser reconstruído contra backend. Os pilotos foram executados contra o build local, com as rotas de catálogo do piloto interceptadas pelo Playwright. Nenhum container foi derrubado ou alterado.

Sem issue/Project por autorização explícita; sem commit, push ou PR.

## Retomada em 2026-09-23

### RED / caracterização

A captura enviada por Nathan mostrou que o painel do catálogo e o campo de busca permaneciam claros no tema escuro. No início desta retomada, a correção visual com tokens (`bg-surface` e `border-borderMy`) já estava aplicada no código compartilhado. Para não desfazer a correção a fim de fabricar uma falha, a lacuna foi tratada como falta de proteção contra regressão: foi acrescentado um teste que exige as superfícies tokenizadas e rejeita `bg-white` nesses dois elementos.

### GREEN

- `npm.cmd --prefix frontend run test -- --run src/components/screens/SearchMaterialComponent src/integration/Product`: 2 arquivos, 11 testes aprovados; o teste isolado do catálogo também passou, 8/8.
- `npm.cmd --prefix frontend run test -- --run`: 139 arquivos, 642 testes aprovados.
- `npm.cmd --prefix frontend run lint`: aprovado.
- `npm.cmd --prefix frontend run build`: aprovado; Vite manteve avisos conhecidos sobre `/env.js`, ativo referenciado e tamanho de chunks.
- `npm.cmd --prefix frontend run test:e2e -- --project=ui design-pilots.spec.ts responsive-layout.spec.ts`: 179/179 aprovados no stack Docker local; piloto do catálogo aprovado em claro e escuro.
- `python -m unittest discover -s scripts/tests -p 'test_check_design_coverage.py' -v`: 11/11 aprovados.
- `python scripts/check_design_coverage.py --spec .codex/docs/specs/reformulacao-design --final`: 63 superfícies e 44 rotas aprovadas.
- `python -m unittest discover -s .github/scripts/tests -p 'test_design_quality_workflow.py' -v`: 3/3 aprovados.
- `python .github/scripts/check_manual.py --source docs/manual`: aprovado.
- `git diff --check`: aprovado após os registros desta retomada.

### Limitações registradas

O relatório axe dos pilotos ainda aponta `button-name` e `color-contrast` no catálogo Mentor, em claro e escuro. Esses achados já constavam no aceite final como limitações de acessibilidade pendentes; os cenários funcionais e responsivos passaram. A retomada não alterou código de produção porque os tokens visuais já estavam corrigidos.

Sem issue/Project por autorização explícita; sem commit, push, deploy ou publicação.
