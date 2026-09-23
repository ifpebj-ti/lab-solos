# T008 — Resultado de execução

Data: 2026-09-22
Status técnico: concluída sob recuperação central do coordenador

## RED

- `navigationModel.test.ts` e `OpenSearch.navigation.test.tsx` foram adicionados para caracterizar grupos por perfil, equivalência entre menu e busca e retorno de foco.
- A primeira execução falhou porque o modelo compartilhado ainda não existia; a falha foi a esperada para os imports ausentes.
- O agente delegado não devolveu implementação nem evidências dentro da janela operacional. A execução foi encerrada e o coordenador recuperou a task sem iniciar um segundo agente concorrente.

## GREEN/REFACTOR

- Criado `frontend/src/navigation/navigationModel.ts` como fonte única dos grupos aprovados e entradas de busca para Administrador, Mentor, Mentorado e Comum.
- `AppSidebar`, `NavMain` e `OpenSearch` passaram a consumir o mesmo modelo, preservando destinos, aliases e guards existentes.
- Layout recebeu landmark principal, skip link, `aria-current`, rótulos de navegação, retorno de foco da busca e fechamento da gaveta móvel após navegação.
- Bases de perfil deixaram de impor `h-screen` aninhado; o contêiner principal usa `min-h-0`/`min-h-full` para evitar rolagem concorrente.

## Validação

- Testes dirigidos: 4 arquivos, 11 testes aprovados.
- Suíte frontend integral: 138 arquivos, 631 testes aprovados.
- Lint: aprovado.
- Build de produção: aprovado; avisos preexistentes sobre `/env.js`, `laboratory.png` e chunk grande registrados sem falha.
- Docker: `docker compose -f docker-compose-e2e.yml up -d --build --wait` aprovado; backend, frontend, banco e SMTP saudáveis.
- E2E pós-build, projeto `ui`: 16/16 aprovados em 375 px e 1440 px, três perfis, alias/ID/refresh/retorno e design-system.
- Detector Impeccable executado uma vez nos alvos de T008: `[]`.
- `git diff --check`: aprovado.

## Observações

- O E2E de acesso público continua registrando uma violação `color-contrast` no tema escuro; ela pertence aos consumidores públicos/legados já registrada em T005/T006/T007, não à posse de navegação desta task.
- Não houve issue/Project, commit, push ou publicação externa, conforme autorização explícita.

## Retomada — contratos E2E de menu e busca (2026-09-23)

### RED / caracterização

- Comando: `npm.cmd --prefix frontend run test:e2e -- --project=ui feature-visibility.spec.ts`.
- Resultado inicial: 19/24 aprovados e 5 falhas. Três falhas móveis procuravam `Abrir/Fechar Menu`; o nome acessível exposto pelo botão é `Abrir menu de navegação`, definido por `aria-label` e preferido sobre o texto oculto. Duas jornadas procuravam `Solicita.*Cadastro`, incompatível com a capitalização exata `Solicitações de cadastro` publicada pelo modelo central.
- Inspeção de `site-header.tsx`, `app-sidebar.tsx`, `navigationModel.ts` e `OpenSearch.tsx` confirmou que os controles estão presentes e os nomes atuais são coerentes; nenhuma alteração de produção era necessária.

### GREEN / REFACTOR

- `frontend/e2e/feature-visibility.spec.ts` agora localiza o gatilho pelo nome acessível exato `Abrir menu de navegação` e a opção pelo rótulo exato `Solicitações de cadastro`.
- Mantidos o foco por teclado, a verificação de foco e a navegação por perfil; nenhuma expectativa de acessibilidade foi removida e nenhum código de produção foi alterado.

### Validação da retomada

- `npm.cmd --prefix frontend run test -- --run src/navigation src/components/global/OpenSearch`: 4 arquivos e 52 testes aprovados.
- `npm.cmd --prefix frontend run test:e2e -- --project=ui feature-visibility.spec.ts`: 24/24 aprovados, incluindo menus dos três perfis em 375 px e jornadas administrativas em 375/1440 px.
- `npm.cmd --prefix frontend run lint`: aprovado.
- `npm.cmd --prefix frontend run build`: aprovado. Avisos: `/env.js` mantido como recurso runtime, `laboratory.png` resolvido em runtime e chunks acima de 500 kB.
- `git diff --check -- frontend/e2e/feature-visibility.spec.ts`: aprovado.
- Escopo externo: sem issue/Project (exceção autorizada), sem Compose/backend e sem commit.
