# Evidências T015 — acompanhamento e erros de acesso

- Issue associada: #436; o orquestrador sincronizou a issue e mantém seu status em `In Progress` enquanto há tarefas pendentes.
- Dependências T005, T008 e T011 presentes no worktree isolado.
- Escopo executado: contrato e adaptador mínimos para acompanhamento do Mentor, uso desse adaptador em `MentoringHistory`, propagação de `404` para consultas protegidas de dependentes/pendências e preservação do fallback administrativo existente.

## RED

- A linha de base existente, após instalar as dependências pelo lockfile, passou: `npm.cmd run test -- --run src/contracts src/integration/Users.errors.test.ts src/integration/Class.errors.test.ts` — 8 arquivos, 60 testes aprovados.
- Testes novos/alterados foram executados antes do código de produção: 6 falhas comportamentais esperadas em 4 arquivos. O contrato de acompanhamento não existia; o adaptador `getUserForMentoring` não existia; os adaptadores em `Users.ts` e nas duas rotas protegidas de `Class.ts` transformavam `404` em `[]`; `MentoringHistory` rejeitava o DTO mínimo. Os casos de `200 []`, o fallback administrativo legado e o retorno para `/mentor/my-class` já passavam.
- Após a integração do wave, o Vitest completo revelou 6 falhas em 4 testes consumidores: dois esperavam incorretamente que `404` protegido fosse lista vazia; três cenários de navegação e um responsivo ainda mockavam `getUserById`, embora o histórico use `getUserForMentoring`. Essa segunda RED confirmou divergências nos testes consumidores, não regressões na implementação de produção.
- A primeira tentativa antes de `npm ci` não carregou o Vitest por falta de `node_modules`; não foi contabilizada como RED. `npm.cmd ci` completou usando o lockfile, sem alteração de manifests/lock.

## GREEN e REFACTOR

Validação final, depois de consolidar os contratos e restringir o fallback de 404 ao endpoint administrativo:

- `npm.cmd run test -- --run src/contracts src/integration/Users.errors.test.ts src/integration/Class.errors.test.ts src/pages/mentor/MentoringHistory.authorization.test.tsx` — 10 arquivos, 69 testes aprovados.
- Foco dos consumidores integrados: `npm.cmd run test -- --run src/pages/RegisteredUsers.errors.test.tsx src/pages/ViewClass.errors.test.tsx src/pages/mentor/MentoringHistory.navigation.test.tsx src/pages/mentor/MentoringHistory.responsive.test.tsx` — 4 arquivos, 20 testes aprovados. Os casos de sucesso agora usam `200 []`; casos protegidos `404` verificam a exibição de erro; navegação e layout responsivo mockam o adaptador dedicado.
- Suíte frontend completa: `npm.cmd run test -- --run` — 143 arquivos, 671 testes aprovados (80,73 s; código 0). O jsdom imprimiu exceções esperadas dos testes negativos de tabela responsiva, sem falhas.
- `npm.cmd run lint` — aprovado, zero warnings.
- `npm.cmd run build` — `tsc -b` e Vite concluídos com código 0 (avisos listados abaixo).
- `git diff --check` — sem erros de whitespace. Os avisos CRLF/LF informados pelo Git referem-se a arquivos backend preexistentes de outras tarefas neste worktree.

`getUserById` continua rejeitando o DTO de acompanhamento, preservando o contrato de perfil completo. O novo adaptador usa `usuarioAcompanhamentoSchema`, que compõe os campos comuns e acadêmicos necessários e aceita `instituicao` nula, sem exigir `tipoUsuario` ou `responsavel`. O histórico usa o adaptador dedicado; teste verifica que não chama `getUserById`. Respostas 404 das consultas por vínculo chegam como `ApplicationError/not_found`; uma resposta autorizada `200 []` continua sendo lista vazia. O fallback legado da aprovação administrativa foi mantido isolado.

## Avisos e ambiente

- Ambiente local: Node `v24.21.0`, npm `11.19.0`; o `package.json` fixa `npm@10.8.2` como package manager. A validação local passou com npm 11; CI usa o lockfile.
- `npm ci` reportou 10 vulnerabilidades no grafo instalado (2 moderadas, 8 altas) e avisos de pacotes depreciados/scripts não aprovados pelo npm local. Não houve alteração de dependências.
- O build passou com os avisos já observados no frontend: `/env.js` não pode ser empacotado sem `type="module"`; `public/images/laboratory.png` permanece para resolução em runtime; chunks `exceljs`, `react-pdf` e o bundle principal excedem 500 kB.
- `.github/workflows/container-ci.yml` roda em pull requests para `develop` (opened, synchronize, reopened, edited e ready_for_review); `frontend-quality` instala do lockfile e executa testes, lint e build, e integra o quality gate. Não identifiquei lacuna de gate pré-merge para esta tarefa.

## Arquivos de T015

- `frontend/src/contracts/user.ts`
- `frontend/src/contracts/userAccompaniment.test.ts`
- `frontend/src/contracts/userProfileConsumers.test.tsx`
- `frontend/src/integration/Users.ts`
- `frontend/src/integration/Users.errors.test.ts`
- `frontend/src/integration/Class.ts`
- `frontend/src/integration/Class.errors.test.ts`
- `frontend/src/pages/mentor/MentoringHistory.tsx`
- `frontend/src/pages/mentor/MentoringHistory.authorization.test.tsx`
- `frontend/src/pages/RegisteredUsers.errors.test.tsx`
- `frontend/src/pages/ViewClass.errors.test.tsx`
- `frontend/src/pages/mentor/MentoringHistory.navigation.test.tsx`
- `frontend/src/pages/mentor/MentoringHistory.responsive.test.tsx`
