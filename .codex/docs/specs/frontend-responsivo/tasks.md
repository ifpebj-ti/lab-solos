# Tarefas: Frontend responsivo

- Status: concluída localmente — validação integrada final aprovada; CI remota não executada
- PRD: `./prd.md`
- Especificação técnica: `./techspec.md`
- Atualizado em: 2026-11-24
- Issues de origem: #229, #230, #231
- Total: 16 tarefas; 16 concluídas

## Associação às issues remotas

Mapeamento definido pela leitura das issues de ifpebj-ti/lab-solos em 2026-09-06, conforme solicitação do usuário:

| Tarefas | Issue principal | Escopo |
|---|---|---|
| T001 | [#229](https://github.com/ifpebj-ti/lab-solos/issues/229) | Listagem de produtos e estrutura necessária |
| T002 | [#230](https://github.com/ifpebj-ti/lab-solos/issues/230) | Cadastro responsivo |
| T003–T016 | [#231](https://github.com/ifpebj-ti/lab-solos/issues/231) | Primitivas globais, consumidores e integração |

T001 também contribui para #231. T016 sincroniza #231 e valida os critérios das três issues. Manter #229 e #230 em In Progress até essa validação cruzada; só marcar Done com todos os critérios comprovados. Não fechar issues automaticamente.

## Premissas de execução

Ler integralmente o PRD e a techspec antes de executar qualquer tarefa. A descoberta está confirmada e a especificação está pronta. Este plano decompõe suas decisões; não altera APIs, banco, regras de negócio, autenticação, autorização ou política de consentimento.

A inspeção de `frontend/package.json`, `vite.config.ts`, `playwright.config.ts` e `.github/workflows/container-ci.yml` confirma Vitest/RTL, jsdom, Playwright/Chromium e CI pré-merge para `develop` nos eventos `opened`, `synchronize` e `reopened`. Portanto, a premissa histórica da skill sobre ausência de executor não se aplica. Não criar tarefa de instalação de uma infraestrutura já presente nem gate duplicado. A nova suíte `e2e/responsive-layout.spec.ts` será descoberta pelo comando E2E já executado no job `auth-e2e`.

Cada tarefa funcional entrega código, testes de componente/consumidor e seus cenários de navegador juntos. T001 fixa os contratos comuns em uma primeira jornada; T003–T014 acrescentam adaptadores e migram grupos pequenos. A compatibilidade legada temporária permitida na techspec mantém compilação entre tarefas e é removida em T015. A verificação final T016 não concentra testes funcionais que deveriam ter sido feitos antes.

## Ondas de execução

| Onda | Tarefas | Motivo de segurança do paralelismo |
|---|---|---|
| 1 | T001 | Execução sequencial: estabiliza contratos e inicia a suíte compartilhada |
| 2 | T002 | Execução sequencial: altera a mesma suíte E2E e usa os contratos entregues pela onda anterior |
| 3 | T003 | Execução sequencial: altera a mesma suíte E2E e usa os contratos entregues pela onda anterior |
| 4 | T004 | Execução sequencial: altera a mesma suíte E2E e usa os contratos entregues pela onda anterior |
| 5 | T005 | Execução sequencial: altera a mesma suíte E2E e usa os contratos entregues pela onda anterior |
| 6 | T006 | Execução sequencial: altera a mesma suíte E2E e usa os contratos entregues pela onda anterior |
| 7 | T007 | Execução sequencial: altera a mesma suíte E2E e usa os contratos entregues pela onda anterior |
| 8 | T008 | Execução sequencial: altera a mesma suíte E2E e usa os contratos entregues pela onda anterior |
| 9 | T009 | Execução sequencial: altera a mesma suíte E2E e usa os contratos entregues pela onda anterior |
| 10 | T010 | Execução sequencial: altera a mesma suíte E2E e usa os contratos entregues pela onda anterior |
| 11 | T011 | Execução sequencial: altera a mesma suíte E2E e usa os contratos entregues pela onda anterior |
| 12 | T012 | Execução sequencial: altera a mesma suíte E2E e usa os contratos entregues pela onda anterior |
| 13 | T013 | Execução sequencial: altera a mesma suíte E2E e usa os contratos entregues pela onda anterior |
| 14 | T014 | Execução sequencial: altera a mesma suíte E2E e usa os contratos entregues pela onda anterior |
| 15 | T015 | Execução sequencial: altera a mesma suíte E2E e usa os contratos entregues pela onda anterior |
| 16 | T016 | Integração exclusiva, após toda a migração |

DAG: `T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012 → T013 → T014 → T015 → T016`. A dependência imediata também serializa alterações na suíte e artefatos de build/E2E. Não há tarefas paralelas neste plano. Uma divisão futura da suíte pode permitir outras ondas, mas exige rever dependências e posse antes de executar agentes simultâneos.

## Regras comuns de posse e validação

- Caminhos de produção/testes listados em cada tarefa são a autorização de edição. Leitura de outros arquivos é permitida. `prd.md`, `techspec.md`, manifestos, lockfile, backend e workflows permanecem somente leitura neste plano.
- Todas as tarefas T001–T015 podem criar/ampliar `frontend/e2e/responsive-layout.spec.ts` e `frontend/e2e/responsive-support.ts`; o segundo contém apenas auxiliares de fixture/asserções necessários, não outra infraestrutura de execução. Cada cenário recebe no título o ID da tarefa, por exemplo `T004 solicitações`, para execução direcionada.
- `tasks.md` e seu log têm escritor único: o executor ativo ou, se usado posteriormente, o orquestrador. Evidências de cada tarefa ficam em `.codex/docs/specs/frontend-responsivo/evidencias/Txxx.md`, substituindo Txxx pelo ID. Nenhum artefato gerado deve ser incluído em commit.
- Execuções que escrevem em `frontend/dist/`, arquivos `*.tsbuildinfo`, caches e `frontend/e2e/infra/artifacts/` são exclusivas. Não limpar alterações preexistentes; na criação deste plano havia modificações em artefatos de testes do backend.
- Se uma causa de overflow estiver em ancestral compartilhado fora dos caminhos atribuídos, registrar a causa e revisar a posse/dependências para uma correção mínima antes de editar. Não ocultar overflow globalmente nem ampliar escopo para redesign.
- Testes novos e auxiliares descritos abaixo são arquivos a criar. Os scripts npm já existem. Não tratar ausência do teste, do navegador, da stack ou da fixture como evidência RED.

### Preparação do ambiente

Comandos a partir da raiz, exceto onde indicado:

1. `npm --prefix frontend ci` quando as dependências ainda não estiverem instaladas conforme o lockfile.
2. Em `frontend`: `npx --no-install playwright install --with-deps chromium`.
3. `docker compose -f docker-compose-e2e.yml up -d --build --wait` antes dos testes de navegador. Reexecutar para reconstruir o frontend após mudanças; servidor/contêiner antigo não valida o código novo.
4. `npm --prefix frontend run test:e2e:list` confirma descoberta. Usar a stack sintética e os padrões de `user-data-contract.spec.ts`; nunca dados/credenciais reais.

Preservar `E2E_BASE_URL` e `E2E_API_URL` existentes ou usar os valores padrão da stack. Os cenários responsivos simulam rede com `page.route`; testes reais de cadastro já existentes continuam na suíte completa. Não criar rotas de demonstração no produto. Encerrar somente a stack sintética iniciada para esta execução, sem manipular volumes de outros ambientes.

### Contrato de testes para todas as jornadas

- Primeiro caracterizar dados, callbacks e destinos atuais. Testes de caracterização podem iniciar verdes. Depois escrever a asserção do requisito ausente e registrar a falha antes da alteração.
- Cada consumidor inventariado tem teste de integração React e fixture de rota/perfil no E2E. Produtos cobrem administrador, mentor e mentorado. Dados e ações autorizados devem coincidir com desktop.
- Verificar 320 × 800, 375 × 812, 768 × 1024 e 1440 × 900 em cada jornada; acrescentar 767 × 900 para o limite, 375 → 768 → 375 nos controles com estado e 812 × 375 no cadastro. Parametrizar a suíte responsiva, sem multiplicar testes de autenticação.
- Cobrir curto, palavra sem espaços de 200 caracteres, texto longo, valores ausentes, vazio, carregamento, resposta atrasada e falhas existentes pertinentes à página. Paginação cobre sete itens e mais de uma página onde aplicável.
- Asserir `document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1`, largura do corpo e bounding boxes de conteúdo/ações dentro do contêiner, inclusive com portais abertos e depois da interação. Cards não podem depender de rolagem horizontal interna. jsdom não comprova geometria.
- Conferir rótulos visíveis abaixo de md e grade alinhada a partir de md; ordem do DOM estável, árvore única, foco visível, Tab/Shift+Tab, links por Enter, botões por Enter/Espaço e ações internas sem navegação acidental.
- Nas tarefas que alteram controles, conferir alvos de toque de 44 × 44 px em mobile/ponteiro grosseiro e contraste dos elementos tocados: texto normal 4,5:1, controles/foco 3:1. Inspeção visual agrupada mobile/desktop complementa as asserções, preservando densidade funcional.
- Em cada tarefa, registrar comandos e resultados RED/GREEN/REFACTOR, rota/perfil/viewport e limitações reais. Não usar sleeps fixos nem snapshots de classes como prova de comportamento.
- Além dos testes direcionados, executar `npm --prefix frontend run lint` e `npm --prefix frontend run build` antes de concluir cada tarefa funcional. A suíte completa fica para T016 e para alterações cujo risco justificar regressões mais amplas.

## T001 — Entregar a estrutura responsiva na busca de produtos

- Issue: #229
- Status: concluida
- Dependências: nenhuma
- Paralela: não
- Requisitos: RF-001, RF-003, RNF-001, RNF-002, CA-001, CA-003
- Caminhos sob responsabilidade: `frontend/src/components/global/table/responsiveContext.ts`, `frontend/src/components/global/table/ResponsiveTable.tsx`, `frontend/src/components/global/table/ResponsiveTable.test.tsx`, `frontend/src/components/global/table/Header.tsx`, `frontend/src/components/global/table/ItemClickable.tsx`, `frontend/src/components/global/table/ItemClickable.test.tsx`, `frontend/src/components/global/table/Pagination.tsx`, `frontend/src/components/global/table/Pagination.test.tsx`, `frontend/src/components/global/table/TopDown.tsx`, `frontend/src/components/global/table/TopDown.test.tsx`, `frontend/src/components/global/inputs/SearchInput.tsx`, `frontend/src/components/global/inputs/SearchInput.test.tsx`, `frontend/src/components/screens/SearchMaterialComponent.tsx`, `frontend/src/components/screens/SearchMaterialComponent.test.tsx`; `frontend/e2e/responsive-layout.spec.ts`; `frontend/e2e/responsive-support.ts`; `.codex/docs/specs/frontend-responsivo/evidencias/T001.md`.

### Escopo

Criar o contexto, tipos ResponsiveColumn/ResponsiveTableProps/ResponsiveCellProps, registro e célula definidos na techspec. Migrar cabeçalho e linha clicável de produtos, com definição única das seis colunas, link com state.id e chave estável. Ajustar paginação, ordenação e busca quanto a largura, nomes, foco e alvos de toque. Criar a suíte e seus auxiliares de viewport/rede apenas na medida necessária para esta jornada.

### Critérios de conclusão

Produtos preservam todos os seis campos e as consultas atuais. Vazio, carregamento, erro de consulta e várias páginas cabem; o breakpoint 767/768 altera somente apresentação. Tipos compartilhados ficam estáveis para as tarefas seguintes. Demais consumidores continuam compilando com compatibilidade temporária explícita dos adaptadores; não apresentar o modo legado como card acessível. Cumprir também o contrato de testes e os critérios comuns acima. Acrescentar os cenários desta tarefa à suíte compartilhada antes de implementar a mudança de comportamento.

### Plano TDD

- RED: Caracterizar filtros, inversão de ordem, sete itens por página, destino e ID nos três perfis. Acrescentar testes de rótulos/ação por teclado que falhem no legado e Playwright com produto de 200 caracteres sem espaços a 320 px que evidencie ausência de card ou corte lateral.
- GREEN: implementar somente a mudança descrita no escopo e fazer passar os testes direcionados e cenários da tarefa.
- REFACTOR: consolidar mapeamento de colunas e classes dentro dos caminhos atribuídos, retirar duplicações substituídas e executar novamente os mesmos testes; preservar contratos de dados, ações e exportação.

### Validação

- `npm --prefix frontend run test -- --run src/components/global/table/ResponsiveTable.test.tsx src/components/global/table/ItemClickable.test.tsx src/components/global/table/Pagination.test.tsx src/components/global/table/TopDown.test.tsx src/components/global/inputs/SearchInput.test.tsx src/components/screens/SearchMaterialComponent.test.tsx`
- `npm --prefix frontend run test:e2e -- e2e/responsive-layout.spec.ts --grep T001`
- Lint, build e preparação E2E conforme regras comuns.

### Notas

Compatibilidade temporária deve ser explícita e coberta: o contrato responsivo exige contexto e rótulos; o consumidor ainda não migrado conserva seu modo legado até sua tarefa. Header e ItemClickable são estabilizados aqui para evitar retrabalho nos grupos posteriores.

### Retomada — 2026-11-24

A validação cruzada de Visibilidade T006 identificou que os cenários E2E de produtos ainda interceptam `GET /api/Produtos`, enquanto o consumidor atual consulta o catálogo administrativo paginado. Atualizar as fixtures e conferir que os cenários voltam a exercer a listagem sem alterar o contrato de produção.

## T002 — Tornar o cadastro fluido e acessível

- Issue: #230
- Status: concluida
- Dependências: T001
- Paralela: não
- Requisitos: RF-002, RNF-001, RNF-002, CA-002, CA-003
- Caminhos sob responsabilidade: `frontend/src/pages/CreateAccount.tsx`, `frontend/src/pages/CreateAccount.test.tsx`, `frontend/src/components/global/inputs/Text.tsx`, `frontend/src/components/global/inputs/Text.test.tsx`, `frontend/src/components/global/inputs/Password.tsx`, `frontend/src/components/global/inputs/Password.test.tsx`; `frontend/e2e/responsive-layout.spec.ts`; `frontend/e2e/responsive-support.ts`; `.codex/docs/specs/frontend-responsivo/evidencias/T002.md`.

### Escopo

Aplicar largura fluida limitada a 750 px, altura mínima com rolagem natural, uma coluna abaixo de md e duas a partir de md. Ajustar cabeçalho, seletor, campos, erros no fluxo, termos e botões. Associar labels/erros e nomear mostrar/ocultar senha; manter resolver, consentimento, payload, sessão e destino.

### Critérios de conclusão

Todos os campos e ações cabem em 320/375/768/1440; termos rolam verticalmente e devolvem foco. Cadastro válido/inválido e respostas por campo preservados. Testar 812 × 375 e ordem Tab/Shift+Tab. Cumprir também o contrato de testes e os critérios comuns acima. Acrescentar os cenários desta tarefa à suíte compartilhada antes de implementar a mudança de comportamento.

### Plano TDD

- RED: Manter os testes de cadastro existentes e acrescentar preenchimento a 320 px, erro extenso sem sobreposição, labels de senha e abertura de termos sem submissão. Falha esperada: overflow, associação ausente ou submissão indevida.
- GREEN: implementar somente a mudança descrita no escopo e fazer passar os testes direcionados e cenários da tarefa.
- REFACTOR: consolidar mapeamento de colunas e classes dentro dos caminhos atribuídos, retirar duplicações substituídas e executar novamente os mesmos testes; preservar contratos de dados, ações e exportação.

### Validação

- `npm --prefix frontend run test -- --run src/pages/CreateAccount.test.tsx src/components/global/inputs/Text.test.tsx src/components/global/inputs/Password.test.tsx src/contracts/userRegistration.test.ts src/pages/ForgotPassword.test.tsx src/pages/ResetPassword.test.tsx src/pages/ChangePassword.test.tsx`
- `npm --prefix frontend run test:e2e -- e2e/responsive-layout.spec.ts --grep T002`
- Lint, build e preparação E2E conforme regras comuns.

### Notas

Ler os contratos entregues nas dependências; não modificar uma primitiva fora da posse para acomodar uma correção pontual do consumidor.

### Retomada — 2026-11-24

A validação cruzada de Visibilidade T006 encontrou que `fillResponsiveAccount` seleciona o perfil Mentor e depois tenta preencher `emailMentor`, campo que o contrato público atual mostra somente para Mentorado. Corrigir a fixture e a expectativa de payload do caso responsivo para representar o fluxo de Mentor aprovado, sem alterar a regra de cadastro.

## T003 — Migrar aprovação e recusa de cadastros

- Issue: #231
- Status: concluida
- Dependências: T002
- Paralela: não
- Requisitos: RF-001, RF-003, RNF-001, RNF-002, CA-001, CA-003
- Caminhos sob responsabilidade: `frontend/src/components/global/table/ItemButton.tsx`, `frontend/src/components/global/table/ItemButton.test.tsx`, `frontend/src/pages/RegistrationRequests.tsx`, `frontend/src/pages/RegistrationRequests.responsive.test.tsx`; `frontend/e2e/responsive-layout.spec.ts`; `frontend/e2e/responsive-support.ts`; `.codex/docs/specs/frontend-responsivo/evidencias/T003.md`.

### Escopo

Migrar ItemButton e todas as linhas/cabeçalhos de RegistrationRequests para colunas de dados e ações rotuladas. Preservar os dois callbacks e estado da lista, ajustar contêineres e ferramentas.

### Critérios de conclusão

Cada ação recebe o registro correto, uma única vez, por clique e teclado; dados e paginação mantidos nos quatro viewports. Cumprir também o contrato de testes e os critérios comuns acima. Acrescentar os cenários desta tarefa à suíte compartilhada antes de implementar a mudança de comportamento.

### Plano TDD

- RED: Caracterizar aprovação/recusa por registro. Testar nomes dos dois botões e rótulos mobile antes da alteração; a ausência de nome/card deve falhar.
- GREEN: implementar somente a mudança descrita no escopo e fazer passar os testes direcionados e cenários da tarefa.
- REFACTOR: consolidar mapeamento de colunas e classes dentro dos caminhos atribuídos, retirar duplicações substituídas e executar novamente os mesmos testes; preservar contratos de dados, ações e exportação.

### Validação

- `npm --prefix frontend run test -- --run src/components/global/table/ItemButton.test.tsx src/pages/RegistrationRequests.responsive.test.tsx`
- `npm --prefix frontend run test:e2e -- e2e/responsive-layout.spec.ts --grep T003`
- Lint, build e preparação E2E conforme regras comuns.

### Notas

Ler os contratos entregues nas dependências; não modificar uma primitiva fora da posse para acomodar uma correção pontual do consumidor.

### Retomada — 2026-11-24

A validação cruzada de Visibilidade T006 revelou timeout nos cenários T003 da fila de solicitações: o mock interceptava `GET /api/Usuarios/4242/dependentes/aprovacao`, rota dos Mentores, mas a tela administrativa consulta `GET /api/Usuarios/aprovacao`. A rota e a fixture foram corrigidas; o E2E revelou e levou à correção do overflow da coluna de ações em 768 px. Evidência completa em `evidencias/T003.md`.

## T004 — Migrar solicitações de empréstimo com ações e navegação

- Issue: #231
- Status: concluida
- Dependências: T003
- Paralela: não
- Requisitos: RF-001, RF-003, RNF-001, RNF-002, CA-001, CA-003
- Caminhos sob responsabilidade: `frontend/src/components/global/table/ItemButtonLink.tsx`, `frontend/src/components/global/table/ItemButtonLink.test.tsx`, `frontend/src/pages/admin/LoansRequest.tsx`, `frontend/src/pages/admin/LoansRequest.responsive.test.tsx`; `frontend/e2e/responsive-layout.spec.ts`; `frontend/e2e/responsive-support.ts`; `.codex/docs/specs/frontend-responsivo/evidencias/T004.md`.

### Escopo

Adaptar ItemButtonLink e LoansRequest. Separar link primário dos botões e interromper propagação das ações. Preservar destino e state.id.

### Critérios de conclusão

Botões executam exclusivamente a ação correspondente. Link abre o mesmo registro; todos os dados e ações permanecem alcançáveis com conteúdo longo. Cumprir também o contrato de testes e os critérios comuns acima. Acrescentar os cenários desta tarefa à suíte compartilhada antes de implementar a mudança de comportamento.

### Plano TDD

- RED: Caracterizar os callbacks e destino atuais; acrescentar teste em que clicar uma ação não navega, além de rótulos mobile e acionamento por teclado.
- GREEN: implementar somente a mudança descrita no escopo e fazer passar os testes direcionados e cenários da tarefa.
- REFACTOR: consolidar mapeamento de colunas e classes dentro dos caminhos atribuídos, retirar duplicações substituídas e executar novamente os mesmos testes; preservar contratos de dados, ações e exportação.

### Validação

- `npm --prefix frontend run test -- --run src/components/global/table/ItemButtonLink.test.tsx src/pages/admin/LoansRequest.responsive.test.tsx`
- `npm --prefix frontend run test:e2e -- e2e/responsive-layout.spec.ts --grep T004`
- Lint, build e preparação E2E conforme regras comuns.

### Notas

Ler os contratos entregues nas dependências; não modificar uma primitiva fora da posse para acomodar uma correção pontual do consumidor.

## T005 — Migrar usuários com seleção de status e ação de linha

- Issue: #231
- Status: concluida
- Dependências: T004
- Paralela: não
- Requisitos: RF-001, RF-003, RNF-001, RNF-002, CA-001, CA-003
- Caminhos sob responsabilidade: `frontend/src/components/global/table/TableItemWithActions.tsx`, `frontend/src/components/global/table/TableItemWithActions.test.tsx`, `frontend/src/pages/RegisteredUsers.tsx`, `frontend/src/pages/RegisteredUsers.responsive.test.tsx`; `frontend/e2e/responsive-layout.spec.ts`; `frontend/e2e/responsive-support.ts`; `.codex/docs/specs/frontend-responsivo/evidencias/T005.md`.

### Escopo

Adaptar ReactNode por célula e preservar prioridade de onRowClick sobre destino alternativo. Migrar RegisteredUsers, mantendo perfis, exportação e alterações de status. Ignorar clique originado de qualquer controle interativo descendente.

### Critérios de conclusão

Seleção preserva estado em 375 → 768 → 375, sem nova consulta ou ação duplicada; nomes, foco e registro correto. Exportação mantém seu contrato independente das colunas visuais. Cumprir também o contrato de testes e os critérios comuns acima. Acrescentar os cenários desta tarefa à suíte compartilhada antes de implementar a mudança de comportamento.

### Plano TDD

- RED: Caracterizar callbacks, status e exportação; testar botão/link primário acessível e ausência de navegação ao usar combobox, botão, input, switch, checkbox ou link interno. Reproduzir ausência de rótulos no consumidor.
- GREEN: implementar somente a mudança descrita no escopo e fazer passar os testes direcionados e cenários da tarefa.
- REFACTOR: consolidar mapeamento de colunas e classes dentro dos caminhos atribuídos, retirar duplicações substituídas e executar novamente os mesmos testes; preservar contratos de dados, ações e exportação.

### Validação

- `npm --prefix frontend run test -- --run src/components/global/table/TableItemWithActions.test.tsx src/pages/RegisteredUsers.responsive.test.tsx src/contracts/userListConsumers.test.tsx`
- `npm --prefix frontend run test:e2e -- e2e/responsive-layout.spec.ts --grep T005`
- Lint, build e preparação E2E conforme regras comuns.

### Notas

Ler os contratos entregues nas dependências; não modificar uma primitiva fora da posse para acomodar uma correção pontual do consumidor.

### Retomada — 2026-11-24

A suíte E2E completa voltou a registrar falhas nos cenários responsivos T005. A retomada confirmou e corrigiu o overflow da coluna de Status; a matriz passou 5/5. Evidência completa em `evidencias/T005.md`.

## T006 — Migrar remoção de itens na criação de empréstimos

- Issue: #231
- Status: concluida
- Dependências: T005
- Paralela: não
- Requisitos: RF-001, RF-003, RNF-001, RNF-002, CA-001, CA-003
- Caminhos sob responsabilidade: `frontend/src/components/global/table/ItemDelete.tsx`, `frontend/src/components/global/table/ItemDelete.test.tsx`, `frontend/src/pages/mentor/LoanCreation.tsx`, `frontend/src/pages/mentor/LoanCreation.responsive.test.tsx`; `frontend/e2e/responsive-layout.spec.ts`; `frontend/e2e/responsive-support.ts`; `.codex/docs/specs/frontend-responsivo/evidencias/T006.md`.

### Escopo

Adaptar ItemDelete e a lista de itens de LoanCreation; rotular ação de remoção e preservar formulário, seleção de produtos e regras de empréstimo.

### Critérios de conclusão

Remover por teclado/toque produz uma única chamada e não submete o formulário. Conteúdo, controles e mensagens cabem nos viewports obrigatórios. Cumprir também o contrato de testes e os critérios comuns acima. Acrescentar os cenários desta tarefa à suíte compartilhada antes de implementar a mudança de comportamento.

### Plano TDD

- RED: Caracterizar remoção do item correto e permanência dos demais; acrescentar rótulos, nome de botão e overflow a 320 px antes de implementar.
- GREEN: implementar somente a mudança descrita no escopo e fazer passar os testes direcionados e cenários da tarefa.
- REFACTOR: consolidar mapeamento de colunas e classes dentro dos caminhos atribuídos, retirar duplicações substituídas e executar novamente os mesmos testes; preservar contratos de dados, ações e exportação.

### Validação

- `npm --prefix frontend run test -- --run src/components/global/table/ItemDelete.test.tsx src/pages/mentor/LoanCreation.responsive.test.tsx`
- `npm --prefix frontend run test:e2e -- e2e/responsive-layout.spec.ts --grep T006`
- Lint, build e preparação E2E conforme regras comuns.

### Notas

Ler os contratos entregues nas dependências; não modificar uma primitiva fora da posse para acomodar uma correção pontual do consumidor.

## T007 — Migrar devolução e linhas somente de leitura

- Issue: #231
- Status: concluida
- Dependências: T006
- Paralela: não
- Requisitos: RF-001, RF-003, RNF-001, RNF-002, CA-001, CA-003
- Caminhos sob responsabilidade: `frontend/src/components/global/table/Item.tsx`, `frontend/src/components/global/table/Item.test.tsx`, `frontend/src/components/global/table/ItemReturn.tsx`, `frontend/src/components/global/table/ItemReturn.test.tsx`, `frontend/src/pages/admin/ReturnLoan.tsx`, `frontend/src/pages/admin/ReturnLoan.responsive.test.tsx`; `frontend/e2e/responsive-layout.spec.ts`; `frontend/e2e/responsive-support.ts`; `.codex/docs/specs/frontend-responsivo/evidencias/T007.md`.

### Escopo

Adaptar Item e ItemReturn e migrar todas as listas de ReturnLoan. Manter checked e a habilitação do campo; usar IDs únicos e labels associados. Não criar persistência de devolução.

### Critérios de conclusão

Campos habilitam conforme a regra atual, não trocam estado entre registros e permanecem preenchidos no resize. Item de leitura não ganha tabulação artificial. Cumprir também o contrato de testes e os critérios comuns acima. Acrescentar os cenários desta tarefa à suíte compartilhada antes de implementar a mudança de comportamento.

### Plano TDD

- RED: Caracterizar valores e habilitação atual. Testar duas linhas com IDs/labels únicos, rótulos de cada valor e edição preservada no resize; ausência de associação/card é o RED.
- GREEN: implementar somente a mudança descrita no escopo e fazer passar os testes direcionados e cenários da tarefa.
- REFACTOR: consolidar mapeamento de colunas e classes dentro dos caminhos atribuídos, retirar duplicações substituídas e executar novamente os mesmos testes; preservar contratos de dados, ações e exportação.

### Validação

- `npm --prefix frontend run test -- --run src/components/global/table/Item.test.tsx src/components/global/table/ItemReturn.test.tsx src/pages/admin/ReturnLoan.responsive.test.tsx`
- `npm --prefix frontend run test:e2e -- e2e/responsive-layout.spec.ts --grep T007`
- Lint, build e preparação E2E conforme regras comuns.

### Notas

Ler os contratos entregues nas dependências; não modificar uma primitiva fora da posse para acomodar uma correção pontual do consumidor.

## T008 — Migrar históricos detalhados de empréstimos

- Issue: #231
- Status: concluida
- Dependências: T007
- Paralela: não
- Requisitos: RF-001, RF-003, RNF-001, RNF-002, CA-001, CA-003
- Caminhos sob responsabilidade: `frontend/src/components/global/table/ItemOnly.tsx`, `frontend/src/components/global/table/ItemOnly.test.tsx`, `frontend/src/pages/loan/LoanHistory.tsx`, `frontend/src/pages/loan/LoanHistory.responsive.test.tsx`, `frontend/src/pages/mentee/LoanHistory.tsx`, `frontend/src/pages/mentee/LoanHistory.responsive.test.tsx`; `frontend/e2e/responsive-layout.spec.ts`; `frontend/e2e/responsive-support.ts`; `.codex/docs/specs/frontend-responsivo/evidencias/T008.md`.

### Escopo

Adaptar ItemOnly e migrar todas as listas dos dois históricos, inclusive seções aninhadas. Preservar dados, restrições por perfil e exportação.

### Critérios de conclusão

As duas páginas usam os mesmos contratos responsivos, sem coluna omitida nem largura fixa remanescente. Exportações independentes mantêm conteúdo. Cumprir também o contrato de testes e os critérios comuns acima. Acrescentar os cenários desta tarefa à suíte compartilhada antes de implementar a mudança de comportamento.

### Plano TDD

- RED: Caracterizar os valores por perfil e exportação existente; adicionar correspondência de rótulos/valores em seções aninhadas e geometria mobile que falhem antes da migração.
- GREEN: implementar somente a mudança descrita no escopo e fazer passar os testes direcionados e cenários da tarefa.
- REFACTOR: consolidar mapeamento de colunas e classes dentro dos caminhos atribuídos, retirar duplicações substituídas e executar novamente os mesmos testes; preservar contratos de dados, ações e exportação.

### Validação

- `npm --prefix frontend run test -- --run src/components/global/table/ItemOnly.test.tsx src/pages/loan/LoanHistory.responsive.test.tsx src/pages/mentee/LoanHistory.responsive.test.tsx`
- `npm --prefix frontend run test:e2e -- e2e/responsive-layout.spec.ts --grep T008`
- Lint, build e preparação E2E conforme regras comuns.

### Notas

Ler os contratos entregues nas dependências; não modificar uma primitiva fora da posse para acomodar uma correção pontual do consumidor.

## T009 — Migrar verificação de materiais e histórico geral

- Issue: #231
- Status: concluida
- Dependências: T008
- Paralela: não
- Requisitos: RF-001, RF-003, RNF-001, RNF-002, CA-001, CA-003
- Caminhos sob responsabilidade: `frontend/src/components/screens/VerificationPage.tsx`, `frontend/src/components/screens/VerificationPage.responsive.test.tsx`, `frontend/src/pages/loan/LoanHistories.tsx`, `frontend/src/pages/loan/LoanHistories.responsive.test.tsx`; `frontend/e2e/responsive-layout.spec.ts`; `frontend/e2e/responsive-support.ts`; `.codex/docs/specs/frontend-responsivo/evidencias/T009.md`.

### Escopo

Migrar as linhas de leitura de VerificationPage e LoanHistories. Construir metadados a partir da mesma condição que seleciona os dados, incluindo coluna de fórmula e diferenças por produto/perfil.

### Critérios de conclusão

Nenhum valor desloca para o rótulo vizinho ao variar tipo/perfil; estados vazio/carregamento e mensagens cabem. Não modificar contratos de produto. Cumprir também o contrato de testes e os critérios comuns acima. Acrescentar os cenários desta tarefa à suíte compartilhada antes de implementar a mudança de comportamento.

### Plano TDD

- RED: Caracterizar cada combinação de coluna condicional e os filtros; acrescentar teste de rótulo associado ao valor correto em cada combinação e card mobile.
- GREEN: implementar somente a mudança descrita no escopo e fazer passar os testes direcionados e cenários da tarefa.
- REFACTOR: consolidar mapeamento de colunas e classes dentro dos caminhos atribuídos, retirar duplicações substituídas e executar novamente os mesmos testes; preservar contratos de dados, ações e exportação.

### Validação

- `npm --prefix frontend run test -- --run src/components/screens/VerificationPage.responsive.test.tsx src/pages/loan/LoanHistories.responsive.test.tsx`
- `npm --prefix frontend run test:e2e -- e2e/responsive-layout.spec.ts --grep T009`
- Lint, build e preparação E2E conforme regras comuns.

### Notas

Ler os contratos entregues nas dependências; não modificar uma primitiva fora da posse para acomodar uma correção pontual do consumidor.

### Retomada — 2026-11-24

A validação cruzada de Visibilidade T006 encontrou timeouts nos cenários T009 antes de abrir o detalhe: a fixture de listagem ainda intercepta `GET /api/Produtos` como array, mas o catálogo atual usa envelope paginado e rota administrativa própria. Corrigir e testar os mocks desta jornada sem alterar o contrato de produto.

## T010 — Migrar acompanhamento e visualização de turmas

- Issue: #231
- Status: concluida
- Dependências: T009
- Paralela: não
- Requisitos: RF-001, RF-003, RNF-001, RNF-002, CA-001, CA-003
- Caminhos sob responsabilidade: `frontend/src/pages/FollowUp.tsx`, `frontend/src/pages/FollowUp.responsive.test.tsx`, `frontend/src/pages/ViewClass.tsx`, `frontend/src/pages/ViewClass.responsive.test.tsx`, `frontend/src/pages/ViewClassMentor.tsx`, `frontend/src/pages/ViewClassMentor.responsive.test.tsx`; `frontend/e2e/responsive-layout.spec.ts`; `frontend/e2e/responsive-support.ts`; `.codex/docs/specs/frontend-responsivo/evidencias/T010.md`.

### Escopo

Migrar as três páginas com ItemClickable, incluindo cada cabeçalho/lista e os contêineres imediatos. Preservar navegação, filtros, paginação e dados por perfil.

### Critérios de conclusão

As três páginas exibem todos os campos e mantêm destinos por clique e teclado em 320/375/768/1440. Cumprir também o contrato de testes e os critérios comuns acima. Acrescentar os cenários desta tarefa à suíte compartilhada antes de implementar a mudança de comportamento.

### Plano TDD

- RED: Caracterizar rotas/state.id e valores; acrescentar rótulos e ausência de corte em cada página antes de alterar seu layout.
- GREEN: implementar somente a mudança descrita no escopo e fazer passar os testes direcionados e cenários da tarefa.
- REFACTOR: consolidar mapeamento de colunas e classes dentro dos caminhos atribuídos, retirar duplicações substituídas e executar novamente os mesmos testes; preservar contratos de dados, ações e exportação.

### Validação

- `npm --prefix frontend run test -- --run src/pages/FollowUp.responsive.test.tsx src/pages/ViewClass.responsive.test.tsx src/pages/ViewClassMentor.responsive.test.tsx`
- `npm --prefix frontend run test:e2e -- e2e/responsive-layout.spec.ts --grep T010`
- Lint, build e preparação E2E conforme regras comuns.

### Notas

Ler os contratos entregues nas dependências; não modificar uma primitiva fora da posse para acomodar uma correção pontual do consumidor.

### Retomada — 2026-11-24

A validação cruzada de Visibilidade T006 identificou que o cenário T010 de acompanhamento intercepta somente `GET /api/Produtos/emAlerta`, mas a tela atual usa o catálogo administrativo paginado. Atualizar a fixture e as expectativas desta jornada, preservando o contrato atual da tela.

## T011 — Migrar consultas administrativas de empréstimos e mentorias

- Issue: #231
- Status: concluida
- Dependências: T010
- Paralela: não
- Requisitos: RF-001, RF-003, RNF-001, RNF-002, CA-001, CA-003
- Caminhos sob responsabilidade: `frontend/src/pages/admin/AllLoans.tsx`, `frontend/src/pages/admin/AllLoans.responsive.test.tsx`, `frontend/src/pages/admin/ClassLoan.tsx`, `frontend/src/pages/admin/ClassLoan.responsive.test.tsx`, `frontend/src/pages/admin/MentoringHistoryAdm.tsx`, `frontend/src/pages/admin/MentoringHistoryAdm.responsive.test.tsx`; `frontend/e2e/responsive-layout.spec.ts`; `frontend/e2e/responsive-support.ts`; `.codex/docs/specs/frontend-responsivo/evidencias/T011.md`.

### Escopo

Migrar as três listagens administrativas com seus estados e ferramentas, reaproveitando os contratos estabilizados de Header e ItemClickable.

### Critérios de conclusão

Cada rota do grupo possui fixture própria, preserva ID e todas as ações; alinhamento desktop e quebra de conteúdo longo validados. Cumprir também o contrato de testes e os critérios comuns acima. Acrescentar os cenários desta tarefa à suíte compartilhada antes de implementar a mudança de comportamento.

### Plano TDD

- RED: Caracterizar dados, destinos e filtros por página; demonstrar ausência de cards rotulados ou conteúdo cortado em mobile.
- GREEN: implementar somente a mudança descrita no escopo e fazer passar os testes direcionados e cenários da tarefa.
- REFACTOR: consolidar mapeamento de colunas e classes dentro dos caminhos atribuídos, retirar duplicações substituídas e executar novamente os mesmos testes; preservar contratos de dados, ações e exportação.

### Validação

- `npm --prefix frontend run test -- --run src/pages/admin/AllLoans.responsive.test.tsx src/pages/admin/ClassLoan.responsive.test.tsx src/pages/admin/MentoringHistoryAdm.responsive.test.tsx`
- `npm --prefix frontend run test:e2e -- e2e/responsive-layout.spec.ts --grep T011`
- Lint, build e preparação E2E conforme regras comuns.

### Notas

Ler os contratos entregues nas dependências; não modificar uma primitiva fora da posse para acomodar uma correção pontual do consumidor.

## T012 — Migrar turmas ativas, desabilitadas e histórico do mentor

- Issue: #231
- Status: concluida
- Dependências: T011
- Paralela: não
- Requisitos: RF-001, RF-003, RNF-001, RNF-002, CA-001, CA-003
- Caminhos sob responsabilidade: `frontend/src/pages/mentor/MyClass.tsx`, `frontend/src/pages/mentor/MyClass.responsive.test.tsx`, `frontend/src/pages/mentor/Disabled.tsx`, `frontend/src/pages/mentor/Disabled.responsive.test.tsx`, `frontend/src/pages/mentor/HistoryClass.tsx`, `frontend/src/pages/mentor/HistoryClass.responsive.test.tsx`; `frontend/e2e/responsive-layout.spec.ts`; `frontend/e2e/responsive-support.ts`; `.codex/docs/specs/frontend-responsivo/evidencias/T012.md`.

### Escopo

Migrar MyClass, Disabled e HistoryClass com seus cabeçalhos e listas, mantendo regras e navegação do mentor.

### Critérios de conclusão

Três páginas cobertas nos quatro viewports; sem perda de coluna ou comportamento ao alternar largura. Cumprir também o contrato de testes e os critérios comuns acima. Acrescentar os cenários desta tarefa à suíte compartilhada antes de implementar a mudança de comportamento.

### Plano TDD

- RED: Caracterizar estados por página, paginação e ID de navegação; testar rótulos e overflow com nomes extensos antes da migração.
- GREEN: implementar somente a mudança descrita no escopo e fazer passar os testes direcionados e cenários da tarefa.
- REFACTOR: consolidar mapeamento de colunas e classes dentro dos caminhos atribuídos, retirar duplicações substituídas e executar novamente os mesmos testes; preservar contratos de dados, ações e exportação.

### Validação

- `npm --prefix frontend run test -- --run src/pages/mentor/MyClass.responsive.test.tsx src/pages/mentor/Disabled.responsive.test.tsx src/pages/mentor/HistoryClass.responsive.test.tsx`
- `npm --prefix frontend run test:e2e -- e2e/responsive-layout.spec.ts --grep T012`
- Lint, build e preparação E2E conforme regras comuns.

### Notas

Ler os contratos entregues nas dependências; não modificar uma primitiva fora da posse para acomodar uma correção pontual do consumidor.

## T013 — Migrar históricos de mentoria dos dois perfis

- Issue: #231
- Status: concluida
- Dependências: T012
- Paralela: não
- Requisitos: RF-001, RF-003, RNF-001, RNF-002, CA-001, CA-003
- Caminhos sob responsabilidade: `frontend/src/pages/mentor/MentoringHistory.tsx`, `frontend/src/pages/mentor/MentoringHistory.responsive.test.tsx`, `frontend/src/pages/mentee/HistoryMentoring.tsx`, `frontend/src/pages/mentee/HistoryMentoring.responsive.test.tsx`; `frontend/e2e/responsive-layout.spec.ts`; `frontend/e2e/responsive-support.ts`; `.codex/docs/specs/frontend-responsivo/evidencias/T013.md`.

### Escopo

Migrar todas as listas dos históricos de mentor e mentorado, incluindo definições condicionais; preservar os dados visíveis por perfil e state.id.

### Critérios de conclusão

As duas jornadas têm fixtures próprias e preservam autorização, dados e navegação; vazio, carregamento e texto longo cabem. Cumprir também o contrato de testes e os critérios comuns acima. Acrescentar os cenários desta tarefa à suíte compartilhada antes de implementar a mudança de comportamento.

### Plano TDD

- RED: Caracterizar campos e ações por perfil; adicionar teste de correspondência rótulo/valor e layout mobile por rota.
- GREEN: implementar somente a mudança descrita no escopo e fazer passar os testes direcionados e cenários da tarefa.
- REFACTOR: consolidar mapeamento de colunas e classes dentro dos caminhos atribuídos, retirar duplicações substituídas e executar novamente os mesmos testes; preservar contratos de dados, ações e exportação.

### Validação

- `npm --prefix frontend run test -- --run src/pages/mentor/MentoringHistory.responsive.test.tsx src/pages/mentee/HistoryMentoring.responsive.test.tsx`
- `npm --prefix frontend run test:e2e -- e2e/responsive-layout.spec.ts --grep T013`
- Lint, build e preparação E2E conforme regras comuns.

### Notas

Ler os contratos entregues nas dependências; não modificar uma primitiva fora da posse para acomodar uma correção pontual do consumidor.

## T014 — Adaptar cards de ofertas e pedidos e diálogo de contato

- Issue: #231
- Status: concluida
- Dependências: T013
- Paralela: não
- Requisitos: RF-001, RF-003, RNF-001, RNF-002, CA-001, CA-003
- Caminhos sob responsabilidade: `frontend/src/components/global/table/ItemViewInfo.tsx`, `frontend/src/components/global/table/ItemViewInfo.test.tsx`, `frontend/src/pages/admin/ViewInfo.tsx`, `frontend/src/pages/admin/ViewInfo.responsive.test.tsx`; `frontend/e2e/responsive-layout.spec.ts`; `frontend/e2e/responsive-support.ts`; `.codex/docs/specs/frontend-responsivo/evidencias/T014.md`.

### Escopo

Adaptar o card especializado para pares rotulados e grupos empilhados; manter oferta/pedido, campos e contato. Usar acionador acessível e limitar diálogo à largura e altura disponível.

### Critérios de conclusão

Todos os dados são legíveis; diálogo permite rolagem vertical e fecha devolvendo foco. O estado oferta/pedido e ferramentas da página permanecem iguais. Cumprir também o contrato de testes e os critérios comuns acima. Acrescentar os cenários desta tarefa à suíte compartilhada antes de implementar a mudança de comportamento.

### Plano TDD

- RED: Caracterizar dados e abertura do diálogo; adicionar teste de teclado/retorno de foco e bounding boxes do diálogo aberto a 320 px que falhem no legado.
- GREEN: implementar somente a mudança descrita no escopo e fazer passar os testes direcionados e cenários da tarefa.
- REFACTOR: consolidar mapeamento de colunas e classes dentro dos caminhos atribuídos, retirar duplicações substituídas e executar novamente os mesmos testes; preservar contratos de dados, ações e exportação.

### Validação

- `npm --prefix frontend run test -- --run src/components/global/table/ItemViewInfo.test.tsx src/pages/admin/ViewInfo.responsive.test.tsx`
- `npm --prefix frontend run test:e2e -- e2e/responsive-layout.spec.ts --grep T014`
- Lint, build e preparação E2E conforme regras comuns.

### Notas

Ler os contratos entregues nas dependências; não modificar uma primitiva fora da posse para acomodar uma correção pontual do consumidor.

## T015 — Encerrar a compatibilidade temporária das primitivas

- Issue: #231
- Status: concluida
- Dependências: T014
- Paralela: não
- Requisitos: RF-001, RF-003, RNF-001, RNF-002, CA-001, CA-003
- Caminhos sob responsabilidade: `frontend/src/components/global/table/Header.tsx`, `frontend/src/components/global/table/Item.tsx`, `frontend/src/components/global/table/ItemOnly.tsx`, `frontend/src/components/global/table/ItemClickable.tsx`, `frontend/src/components/global/table/ItemButton.tsx`, `frontend/src/components/global/table/ItemButtonLink.tsx`, `frontend/src/components/global/table/ItemDelete.tsx`, `frontend/src/components/global/table/ItemReturn.tsx`, `frontend/src/components/global/table/TableItemWithActions.tsx`, `frontend/src/components/global/table/responsiveContext.ts`, `frontend/src/components/global/table/ResponsiveTable.tsx`, `frontend/src/components/global/table/ResponsiveTable.test.tsx`; `frontend/e2e/responsive-layout.spec.ts`; `frontend/e2e/responsive-support.ts`; `.codex/docs/specs/frontend-responsivo/evidencias/T015.md`.

### Escopo

Remover somente os caminhos temporários de API legada introduzidos para migração incremental, após todos os consumidores. Auditar imports e correspondência com o inventário da techspec; impedir card sem contexto/rótulos. Não remover colunas independentes de exportação.

### Critérios de conclusão

Nenhum consumidor de produção usa columnWidths nem Header.columns legado; todos usam metadados únicos. Nenhum fallback silencioso permanece; compilação e testes de todas as variantes passam. Cumprir também o contrato de testes e os critérios comuns acima. Os testes E2E desta tarefa são de regressão da API consolidada; reutilizar a cobertura das jornadas.

### Plano TDD

- RED: Verificação objetiva inicial: identificar os parâmetros e ramos legados ainda presentes; testes de comportamento existentes já devem passar. Acrescentar teste para uso responsivo sem metadados, se a proteção ainda não estiver coberta, sem fabricar falha quebrando código correto.
- GREEN: implementar somente a mudança descrita no escopo e fazer passar os testes direcionados e cenários da tarefa.
- REFACTOR: consolidar mapeamento de colunas e classes dentro dos caminhos atribuídos, retirar duplicações substituídas e executar novamente os mesmos testes; preservar contratos de dados, ações e exportação.

### Validação

- `npm --prefix frontend run test -- --run src/components/global/table`
- `npm --prefix frontend run test:e2e -- e2e/responsive-layout.spec.ts --grep T015`
- Lint, build e preparação E2E conforme regras comuns.
- `rg -n 'global/table/|columnWidths' frontend/src` — revisar usos de produção e fixtures; distinguir APIs legadas das colunas de exportação, sem apagar ocorrências por busca cega.

### Notas

Ler os contratos entregues nas dependências; não modificar uma primitiva fora da posse para acomodar uma correção pontual do consumidor.

### Retomada — 2026-11-24

A validação integral encontrou que o cenário T015 ainda interceptava `GET /api/Usuarios/4242/dependentes/aprovacao`, rota de Mentor, embora a tela administrativa use `GET /api/Usuarios/aprovacao`. O handler foi corrigido e a matriz passou 5/5. Evidência completa em `evidencias/T015.md`.

## T016 — Validar integração, cobertura integral e proteção pré-merge

- Issue: #231
- Status: concluída localmente
- Dependências: T015
- Paralela: não
- Requisitos: RF-001, RF-002, RF-003, RNF-001, RNF-002, CA-001, CA-002, CA-003
- Caminhos sob responsabilidade: `.codex/docs/specs/frontend-responsivo/evidencias/T016.md`; `.codex/docs/specs/frontend-responsivo/tasks.md`.

### Escopo

Realizar apenas validações cruzadas: inventário completo de rotas/consumidores versus cenários, regressões globais, ausência de consultas/submissões adicionais em resize, compatibilidade entre perfis, inspeção visual conjunta e execução da suíte no ambiente de CI. Ler código e workflows sem assumir posse para refazer implementação. Defeitos funcionais reabrem a tarefa dona do arquivo e impedem a conclusão desta tarefa.

### Critérios de conclusão

Todos os requisitos da matriz têm evidências e todas as tarefas anteriores estão concluídas. A suíte completa de frontend, lint, build e E2E passa; asserções não dependem de cortes por overflow oculto. Confirmar que o job pré-merge descobre a suíte e registrar seu tempo em relação ao limite de 30 minutos. Documentar verificação das regras remotas de checks obrigatórios se houver acesso de leitura; indisponibilidade de acesso deve constar como pendência operacional, sem afirmar proteção remota comprovada.

Registrar leitor de tela, navegador e dispositivo usados na validação complementar de toque; se não disponíveis, explicitar a limitação. Screenshots/traces devem conter somente dados sintéticos. Não declarar execução de CI remota se somente os comandos locais foram executados.

### Plano de verificação

- Verificação inicial: comparar inventário e matriz com as evidências existentes; listar lacunas objetivas. Não fabricar RED quando o conjunto já estiver correto.
- Confirmação: executar os comandos amplos, verificar os critérios cruzados e registrar resultados. Falha funcional retorna à tarefa de origem; não criar correções silenciosas de escopo nesta tarefa.
- Revisão: consolidar evidências sem repetir testes verdes na ausência de novas mudanças ou riscos.

### Validação

- `rg -n 'global/table/' frontend/src`
- `npm --prefix frontend run test -- --run`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run build`
- `npm --prefix frontend run test:e2e:list`
- `docker compose -f docker-compose-e2e.yml up -d --build --wait`
- `npm --prefix frontend run test:e2e`
- `git diff --check`

### Notas

A techspec não identifica ausência de infraestrutura/gate pré-merge, portanto não há tarefa incondicional de alterar CI. Se a medição demonstrar que a suíte excede 30 minutos ou que o gate não a executa, criar explicitamente uma tarefa de infraestrutura antes de concluir T016: posse de `.github/workflows/container-ci.yml` e testes de contrato correspondentes em `.github/scripts/tests/`, com implementação da separação de job já prevista na techspec. Validar essa alteração com `python -m unittest discover -s .github/scripts/tests -p "test_*.py" -v` (PyYAML conforme CI) e actionlint conforme o workflow. Não reduzir a matriz nem misturar essa correção às tarefas funcionais.

Este plano não autoriza mudanças de configurações remotas, publicação, push ou PR. Consultas de leitura para auditoria são suficientes nesta tarefa; disponibilidade de execução remota depende do fluxo de contribuição vigente.

## Matriz de rastreabilidade

| Requisito | Tarefas responsáveis | Evidência de conclusão |
|---|---|---|
| RF-001 | T001, T003–T015; integração T016 | Primitivas, rótulos, variantes e apresentação no breakpoint |
| RF-002 | T002; integração T016 | Formulário fluido, grade e preenchimento |
| RF-003 | T001, T003–T015; integração T016 | Todos os consumidores migrados e inventário conferido |
| RNF-001 | T001–T016 | Geometria, teclado, foco, nomes e contraste |
| RNF-002 | T001–T016 | Dados, ações, densidade e estado em tablet/desktop |
| CA-001 | T001, T003–T016 | Cards com conteúdo longo e ações sem rolagem lateral |
| CA-002 | T002, T016 | Cadastro completo em 320 px |
| CA-003 | T001–T016 | Modo tabular/grade a partir de md |

## Verificação do plano

IDs sequenciais e únicos, todas as dependências existentes e cadeia sem ciclos. Todas as tarefas possuem requisito associado; todas as entradas RF/RNF/CA estão cobertas. Ondas unitárias impedem sobreposição de posse, inclusive suíte compartilhada, log e artefatos gerados. Os scripts foram conferidos no manifesto; testes novos estão explicitamente planejados. Cobertura funcional é produzida dentro das tarefas verticais, não adiada para integração.

## Log de execução

Replanejamento de posse em T001 (2026-09-06): incluído `frontend/src/components/global/table/responsiveContext.ts` para separar contexto/hooks dos componentes, atendendo ao lint `react-refresh/only-export-components` sem suprimir a regra. Contrato e comportamento previstos permanecem os mesmos. T015 também recebe esse arquivo para a remoção posterior da compatibilidade temporária. A cadeia sequencial continua sem conflitos.

Auditoria inicial da orquestração (2026-09-06): Docker Engine 29.7.2 respondeu a `docker info` e `docker version`. O workflow local executa frontend, lint, build e E2E antes do merge. A consulta remota `gh api repos/ifpebj-ti/lab-solos/rules/branches/develop` confirmou ruleset com checks obrigatórios de frontend, backend, workflows e scans; `Authentication E2E` não consta entre os checks obrigatórios. O endpoint clássico de proteção retornou 404, mas isso não significa ausência de proteção por ruleset. Nenhuma configuração remota foi alterada. Reavaliar essa lacuna operacional no fechamento T016.

| Data | Tarefa | Resultado | Testes/evidências | Observações |
|---|---|---|---|---|
| — | — | Não iniciada | — | Plano criado; nenhuma implementação ou suíte executada nesta etapa |
| 2026-09-06 | T001–T016 | Associação resolvida | Leitura remota das três issues via gh issue view | T001 → #229; T002 → #230; T003–T016 → #231. Bloqueio documental removido; implementação ainda não iniciada. |
| 2026-09-06 | T001 | Concluída | [Evidência T001](./evidencias/T001.md): RED RTL/E2E; 144 testes RTL, lint, build, 30 E2E finais verdes | Diff e capturas 320/1440 revisados pela raiz; #229 In Progress até T016; stack mantida para próxima onda; preexistências preservadas |
| 2026-09-06 | T002 | Concluída | [Evidência T002](./evidencias/T002.md): RED RTL/E2E; 23 testes direcionados, 146 globais, lint, build e 6 E2E verdes | Cadastro e termos em 320/1440 revisados pela raiz; #230 In Progress até T016; limitações de dispositivo/leitor de tela registradas |
| 2026-09-06 | T003 | Concluída | [Evidência T003](./evidencias/T003.md): 2 caracterizações verdes, 2 RED; 5 testes direcionados, 17 de regressão e 5 E2E verdes; lint/build verdes | Capturas 320/1440 revisadas; nota de ruleset corrigida; artefato tsbuildinfo gerado removido; #231 permanece In Progress |
| 2026-09-06 | T004 | Concluída | [Evidência T004](./evidencias/T004.md): 3 caracterizações, 4 RED; 7 testes direcionados, 39 de regressão e 5 E2E verdes; lint/build verdes | Ações sem navegação acidental e state.id validados; Docker encerrou após o GREEN e a falha ambiental posterior foi separada |
| 2026-09-06 | T005 | Concluída | [Evidência T005](./evidencias/T005.md): 6 RED/5 caracterizações; 11 testes direcionados, 29 de regressão e 5 E2E verdes; lint/build verdes | E2E detectou e validou correções para propagação de option portaled e largura do status em 768; capturas revisadas |
| 2026-09-07 | T006 | Concluída | [Evidência T006](./evidencias/T006.md): 3 RED/1 caracterização; 5 testes direcionados, 23 de regressão e 5 E2E verdes; lint/build verdes | Remoção acessível e sem submissão; capturas/resize revisados; tsbuildinfo restaurado |
| 2026-09-07 | T007 | Concluída | [Evidência T007](./evidencias/T007.md): 5 RED; 6 testes direcionados, 176 globais e 5 E2E verdes; lint/build verdes | Três variantes de ReturnLoan migradas; switches/labels/estado no resize validados; capturas revisadas |
| 2026-09-07 | T008 | Concluída | [Evidência T008](./evidencias/T008.md): 5 RED/1 caracterização; 7 testes direcionados, 21 regressão e 15 E2E verdes; lint/build verdes | E2E inicialmente em preview e confirmado depois na Compose reconstruída; três perfis e cinco viewports validados |
| 2026-09-07 | T009 | Concluida | [Evidencia T009](./evidencias/T009.md): 8 testes dirigidos, 191 globais, lint/build e 20 E2E verdes | Colunas condicionais por perfil, historico geral e largura util em 768 corrigidos; captura e stack Compose revisadas; #231 permanece In Progress |
| 2026-09-07 | T010 | Concluida | [Evidencia T010](./evidencias/T010.md): 3 testes dirigidos, 194 globais, lint/build e 15 E2E verdes | FollowUp, ViewClass e ViewClassMentor migrados; destinos, dados longos e cinco viewports validados; #231 permanece In Progress |
| 2026-09-07 | T011 | Concluida | [Evidencia T011](./evidencias/T011.md): 3 testes dirigidos, 197 globais, lint/build e 15 E2E verdes | Tres consultas administrativas migradas; overflow do codigo em 768 corrigido e repetido na Compose; #231 permanece In Progress |
| 2026-09-07 | T012 | Concluida | [Evidencia T012](./evidencias/T012.md): 3 testes dirigidos, 200 globais, lint/build e 15 E2E verdes | Tres paginas do mentor migradas; cinco viewports e rota history/class validados; #231 permanece In Progress |
| 2026-09-07 | T013 | Concluida | [Evidencia T013](./evidencias/T013.md): 2 testes dirigidos, 202 globais, lint/build e 10 E2E verdes | Historicos do mentor e mentorado migrados; state.id, rankID e cinco viewports validados; #231 permanece In Progress |
| 2026-09-07 | T014 | Concluida | [Evidencia T014](./evidencias/T014.md): 2 testes dirigidos, 204 globais, lint/build e 5 E2E verdes | Cards e dialogo responsivos; overflow em 768 corrigido; #231 permanece In Progress |
| 2026-09-07 | T015 | Concluida | [Evidencia T015](./evidencias/T015.md): auditoria sem fallbacks, 30 testes de tabela, 204 globais, lint/build e 5 E2E verdes | Primitivas exigem contexto responsivo; columnWidths restante e apenas exportacao PDF; #231 permanece In Progress |
| 2026-09-07 | T016 | Concluida | [Evidencia T016](./evidencias/T016.md): inventario, workflow/ruleset, 204 testes globais, lint/build e 166 E2E verdes | Suite completa validada em 1,5 min com SMTP 28025; #231 permanece In Progress |
| 2026-11-24 | T001 retomada | concluída | RED: E2E reproduziu o endpoint de catálogo legado e falhou em admin 320; após alinhar fixtures, 28/30 expuseram overflow real do link de ID em 768. GREEN: matriz T001 30/30, Vitest direcionado 34/34, lint, build e `git diff --check` aprovados. | Fixture passou a usar envelope paginado por perfil; coluna ID 12→16 preserva o alvo de 44 px sem overflow em 768. `tsconfig.app.tsbuildinfo` restaurado byte a byte; stack isolada removida. Evidência em `evidencias/T001.md`; nenhuma sincronização remota. |
| 2026-11-24 | T009 retomada | concluída | RED: timeout de 30 s ao abrir o produto; correção da rota paginada revelou fixture de histórico com formato de data/solicitante obsoleto. GREEN: E2E 20/20, React 13/13, lint, build e `git diff --check` aprovados. | Fixtures alinhadas ao catálogo por perfil e ao histórico atual; nenhuma mudança de produção. Hash do `tsbuildinfo` preservado; artefatos e composição exclusiva removidos. Evidência em `evidencias/T009.md`; sem GitHub/Wiki. |
| 2026-11-24 | T010 retomada | concluída | RED: acompanhamento 320 recebeu zero linhas porque o mock respondia ao endpoint de alertas removido. GREEN: matriz T010 15/15, RTL 7/7, lint, build e `git diff --check` aprovados. | Fixture usa o catálogo paginado com `motivosAlerta` e confirma rota/parâmetros. Sem alteração de produção; hash do `tsbuildinfo` mantido; composição/artefatos isolados removidos. Evidência em `evidencias/T010.md`; sem GitHub/Wiki. |
| 2026-11-24 | T002 retomada | concluída | RED: timeout tentando preencher `emailMentor` no perfil Mentor; o campo pertence ao Mentorado. GREEN: E2E 6/6, React 45/45, lint, build e `git diff --check` aprovados. | Fixture manteve Mentor, confirmou ausência do campo e verificou `responsavelEmail` vazio nos dois envios. Sem mudança de produção; hash do `tsbuildinfo` preservado; composição/artefatos removidos. Evidência em `evidencias/T002.md`; sem GitHub/Wiki. |

| 2026-11-24 | T003 retomada | concluída | RED: cenário administrativo usava a rota antiga de Mentor; GREEN: E2E 5/5, RTL 5/5, lint, build e git diff --check aprovados. | Fixture alinhada a GET /api/Usuarios/aprovacao e ao campo tipoUsuario; coluna de ações ajustada para eliminar overflow real em 768 px. tsbuildinfo preservado, stack/artefatos removidos; evidência em evidencias/T003.md. |
| 2026-11-24 | T005 retomada | concluída | RED: 2 de 5 cenários falharam por overflow a 768 px; GREEN: E2E 5/5, RTL 13/13, lint, build e git diff --check aprovados. | Coluna Status 2→3,5 comporta o botão Alterar e-mail e elimina 24 px de rolagem. tsbuildinfo preservado e stack/artefatos removidos; evidência em evidencias/T005.md. |
| 2026-11-24 | T006 retomada | concluída | RED: os cinco viewports falharam porque a rota mockada devolvia array e a tela não carregava os produtos. GREEN: E2E 5/5, RTL 5/5, lint, build e git diff --check aprovados. | Mock atualizado para Produtos?pagina=1&tamanhoPagina=100 com envelope paginado e asserção dos parâmetros. tsbuildinfo preservado e stack/artefatos removidos; evidência em evidencias/T006.md. |
| 2026-11-24 | T015 retomada | concluída | RED: 5/5 viewports mostravam 0 solicitações por mock na rota de Mentor; GREEN: E2E 5/5, 30 testes de tabela, lint, build e git diff --check aprovados. | Handler alinhado à rota administrativa `/api/Usuarios/aprovacao` com asserção explícita do caminho; sem alterações de produção. tsbuildinfo preservado e stack/artefatos removidos; evidência em evidencias/T015.md. |
| 2026-11-24 | T016 retomada | em andamento | Reaberta após as correções de regressões nos cenários responsivos; validação integrada completa pendente. | Executar suíte global, E2E, lint/build e verificar matriz; devolver falhas à tarefa proprietária. |
| 2026-11-24 | T016 fechamento | concluída localmente | Vitest 1.021/1.021, lint, build, descoberta 255 testes/21 arquivos, Playwright completo 255/255 em 5,6 min, `git diff --check` aprovado. | Falhas anteriores foram corrigidas nas tarefas proprietárias e a rodada integrada não encontrou regressões. Stacks sintéticas exclusivas encerradas; não houve CI remota, alteração no GitHub nem revisão física/leitor de tela. A captura passiva incompleta da T007 permanece registrada no plano de cobertura como bloqueio independente. |
| 2026-11-24 | T016 revalidação após CDP Fetch | concluída localmente | Suíte E2E completa repetida com a captura T007 final: 255/255 em 5,6 min. | Captura ainda registra os 18 corpos binários indisponíveis na jornada de exportações, mas não há falha funcional; stacks/volumes/redes exclusivos encerrados. T007 segue inconclusiva. |
