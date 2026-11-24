# Tarefas de decisões e devoluções de empréstimos

- Status: concluído
- PRD: [prd.md](./prd.md)
- Especificação técnica: [techspec.md](./techspec.md)
- Atualizado em: 2026-11-24

Leia o PRD e a especificação técnica antes de cada tarefa. Use dados sintéticos nos testes e registre no log as evidências de cada execução.

## Ondas de execução

| Onda | Tarefas | Motivo de segurança do paralelismo |
|---|---|---|
| 1 | T001, T002 | A apresentação das decisões e a estrutura da criação usam arquivos de frontend e backend distintos. |
| 2 | T003 | A validação de domínio estende a criação e entrega as regras reutilizadas nas transições. |
| 3 | T004, T006 | A escrita transacional e o formulário de criação usam arquivos distintos após a validação de domínio. |
| 4 | T005 | A devolução usa a fronteira proveniente da decisão, o ciclo de vida de produtos e suas garantias de estoque. |
| 5 | T007 | O cliente consolida os contratos de decisão e devolução após a entrega dos dois comandos. |
| 6 | T008 | A jornada cruza cliente, estoque, autorização e autoria gravada. |

Avance nas tarefas prontas. Para tarefas bloqueadas, as ondas indicam a posição prevista após a liberação das decisões.

Coordenação entre planos: combine a escrita em `AppDbContext.cs`, `UnitOfWork.cs`, migrações, `Program.cs` e rotas com as demais frentes. O mecanismo de estoque de T004 será consumido por [Integridade](../integridade-de-produtos-e-lotes/tasks.md), que aplica sua própria matriz de ciclo de vida aos comandos de produto.

## Validação comum

Na raiz, preparar com `dotnet restore backend/backend.sln --locked-mode` e `dotnet build backend/backend.sln --no-restore -c Release`. Reexecutar a suíte com `dotnet test backend/backend.sln --no-build --no-restore -c Release`. Iniciar Docker para os testes PostgreSQL do projeto de testes.

Em `frontend/`, preparar com `npm ci`. Além dos recortes abaixo, executar `npm run test -- --run`, `npm run lint` e `npm run build`.

Para o projeto `real`, iniciar na raiz a pilha sintética com `docker compose -f docker-compose-e2e.yml up -d --build --wait`. Em `frontend/`, instalar Chromium com `npx --no-install playwright install chromium`, conferir a seleção com `npm run test:e2e:list` e executar `npm run test:e2e -- --project=real --project=ui` na validação completa de navegador.

## T001 — Distinguir Aceitar e Rejeitar no detalhe pendente

- Issue: #468
- Status: concluída
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-001, RNF-002, CA-001, CA-002
- Caminhos sob responsabilidade: `frontend/src/pages/loan/LoanHistory.tsx`, `frontend/src/pages/loan/LoanHistory.errors.test.tsx`, `frontend/e2e/critical/loans.spec.ts`

### Escopo

Verificar a jornada aberta a partir da lista e preservar os handlers de decisão, o vínculo ao ID e a atualização do detalhe. Ajustar estados visuais, contraste, hover e foco usando os tokens vigentes. Prevenir decisão duplicada na mesma tela enquanto existe envio em curso.

### Critérios de conclusão

Aceitar está em verde e Rejeitar em vermelho, ambos são legíveis e operáveis por teclado e respondem visualmente ao ponteiro. Duas solicitações sintéticas distintas exibem a decisão correspondente, sem atualizar a linha de outro empréstimo.

### Plano TDD

- RED: Caracterizar os handlers existentes. Acrescentar verificações do foco, estados visuais em navegador, decisão por teclado e recarregamento do detalhe. Corrigir somente lacunas observadas.
- GREEN: Aplicar os tokens de interação e preservar a chamada associada a cada decisão e sua reconsulta.
- REFACTOR: Remover duplicação entre controles sem perder rótulos, mensagens ou comportamento de teclado.

### Validação

- `npm run test -- --run src/pages/loan/LoanHistory.errors.test.tsx src/integration/Loans.decision.test.ts`
- `npm run test:e2e -- --project=real e2e/critical/loans.spec.ts`

## T002 — Validar a estrutura dos itens na criação

- Issue: #471
- Status: concluída
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-002, RNF-001, CA-003, CA-004
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Controllers/EmprestimosController.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Emprestimos/AddEmprestimoDTO.cs`, `backend/Tests/Integration/CriticalLoanCreationTests.cs`

### Escopo

Caracterizar os casos já cobertos de criação pendente e recusar coleção vazia, referência de produto inválida e repetição indevida do produto antes de mapear ou gravar. Reservar as faixas e o tratamento de pendentes legados para T003.

### Critérios de conclusão

A estrutura inválida informa o campo ou a causa em resposta de validação e preserva estoque e movimentações. Criação de estrutura válida com dados já aceitos continua pendente e sem baixa.

### Plano TDD

- RED: Testar coleção vazia, ID de referência ausente, item duplicado e ausência de escrita após recusa. Caracterizar o resultado válido que já existe.
- GREEN: Aplicar as validações de estrutura antes do mapeamento e da persistência e preservar o contrato válido.
- REFACTOR: Reusar o mesmo caminho de erro por causa e manter a consulta no teste com contexto independente.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~CriticalLoanCreationTests"`

## T003 — Aplicar as faixas de quantidade, saldo e prazo

- Issue: #471
- Status: concluída
- Dependências: T002
- Paralela: não
- Requisitos: RF-002, RNF-001, CA-003, CA-004, CA-005
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Controllers/EmprestimosController.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Emprestimos/AddEmprestimoDTO.cs`, `backend/LabSolos-Server-DotNet8/Services/LoanDomainRules.cs`, `backend/Tests/Services/LoanDomainRulesTests.cs`, `backend/Tests/Integration/CriticalLoanCreationTests.cs`, `backend/Tests/Infrastructure/ControlledTimeProvider.cs`
- Decisão aprovada: [D1 — Limites e legado](./techspec.md#alternativas-e-decisões).

### Escopo

Entregar na criação a validação de quantidade inteira positiva na unidade cadastrada do produto, saldo disponível e prazo fixo de cinco dias corridos. Calcular a data prevista a partir do envio com o relógio controlável. Compartilhar com T004 as regras de quantidade e saldo para revalidação na aprovação, inclusive de pedidos anteriores, preservando a data prevista registrada.

### Critérios de conclusão

Os limites aprovados são reconhecíveis por causa e campo de erro. A criação válida retorna `201`, registra pendência e data prevista e não baixa estoque. Cálculo fora da faixa retorna recusa observável sem escrita.

### Plano TDD

- RED: Cobrir valores nos limites e fora deles, data prevista, aritmética inválida e tratamento de uma pendência legada sintética.
- GREEN: Aplicar os limites aprovados antes de calcular ou gravar. Conservar o contrato da data efetiva nula na criação.
- REFACTOR: Reusar as regras nos cálculos pertinentes e manter as validações de forma de T002.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~LoanDomainRulesTests|FullyQualifiedName~CriticalLoanCreationTests"`

### Notas

Este é o entregável consumido por API/proxy para limitar entrada sem alterar a regra de domínio.

## T004 — Efetivar decisão e saída na mesma transação

- Issue: #472
- Status: concluída
- Dependências: T003
- Dependências externas: [T004 de Cadastro](../cadastro-de-produtos/tasks.md) — referência civil para o recálculo de validade.
- Paralela: não
- Requisitos: RF-002, RF-003, RNF-001, CA-004, CA-005, CA-006, CA-007, CA-008, CA-009
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Controllers/EmprestimosController.cs`, `backend/LabSolos-Server-DotNet8/Services/LoanDecisionService.cs`, `backend/LabSolos-Server-DotNet8/Repositories/UnitOfWork.cs`, `backend/LabSolos-Server-DotNet8/Repositories/EmprestimoRepository.cs`, `backend/LabSolos-Server-DotNet8/Repositories/ProdutoRepository.cs`, `backend/LabSolos-Server-DotNet8/Models/Emprestimo.cs`, `backend/LabSolos-Server-DotNet8/Models/EmprestimoProduto.cs`, `backend/LabSolos-Server-DotNet8/Models/MovimentacaoEstoque.cs`, `backend/LabSolos-Server-DotNet8/Data/Context/AppDbContext.cs`, `backend/LabSolos-Server-DotNet8/Data/Migrations/`, `backend/Tests/Integration/CriticalLoanDecisionTests.cs`, `backend/Tests/Integration/LoanDecisionPersistenceTests.cs`, `backend/LabSolos-Server-DotNet8/Program.cs` (registro DI do serviço)
- Decisões aprovadas: [D2 — Respostas dos comandos](./techspec.md#respostas-dos-comandos-de-empréstimo) e [D4 — Consistência e saída](./techspec.md#alternativas-e-decisões).

### Escopo

Aplicar a estratégia aprovada de consistência e movimento a aprovação e rejeição. Revalidar estado, disponibilidade e aritmética na execução. Aprovação registra a baixa, o momento, o responsável e a evidência da saída com o lote comprovado naquela operação. Rejeição pendente termina sem baixa ou saída. Compartilhar a referência civil para recálculo de validade onde aplicável.

### Critérios de conclusão

Disputas pelo mesmo estoque ou empréstimo preservam saldo, estado e saídas coerentes. Falha controlada intermediária é revertida. Reenvio é classificável e não duplica efeitos. A transição põe à disposição um contrato durável para o histórico. Legados com evidência insuficiente são identificados sem atribuição presumida.

### Plano TDD

- RED: Adicionar integração PostgreSQL com dois contextos, empréstimo com vários itens, interrupção controlada e reenvio. Reler todos os efeitos e verificar as causas de insuficiência, decisão oposta e conflito.
- GREEN: Implementar a fronteira transacional aprovada, aplicar T003 antes dos efeitos e tornar consistentes estado, baixa e fonte de saída. Publicar os resultados de D2 e preservar o sucesso inicial em `204`.
- REFACTOR: Reaproveitar os cálculos comuns, conferir migração aditiva caso necessária e manter explícito o contrato de histórico e de escritores de estoque.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~CriticalLoanDecisionTests|FullyQualifiedName~LoanDecisionPersistenceTests|FullyQualifiedName~LoanDomainRulesTests"`

### Notas

Issue adicional #471. Entrega a fonte efetiva e a coordenação de estoque consumidas por Integridade.

## T005 — Executar devolução autorizada com autoria durável

- Issue: #477
- Status: concluída
- Dependências: T003, T004
- Dependências externas: [T002 de Notificações e Auditoria](../notificacoes-e-auditoria/tasks.md) — contrato durável para a projeção de autoria, e [T004 de Integridade](../integridade-de-produtos-e-lotes/tasks.md) — regra de devolução para produto desativado.
- Paralela: não
- Requisitos: RF-002, RF-004, RF-005, RNF-001, CA-005, CA-010, CA-011, CA-012, CA-013
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Controllers/EmprestimosController.cs`, `backend/LabSolos-Server-DotNet8/Services/LoanReturnService.cs`, `backend/LabSolos-Server-DotNet8/Repositories/UnitOfWork.cs`, `backend/LabSolos-Server-DotNet8/Models/Emprestimo.cs`, `backend/LabSolos-Server-DotNet8/Data/Context/AppDbContext.cs`, `backend/LabSolos-Server-DotNet8/Data/Migrations/`, `backend/Tests/Integration/LoanResourceAuthorizationTests.cs`, `backend/Tests/Integration/LoanReturnCharacterizationTests.cs`, `backend/Tests/Integration/LoanReturnMigrationTests.cs`, `backend/Tests/Integration/LoanReturnAuditTests.cs`
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#empréstimos-e-integridade).

### Escopo

Verificar identidade habilitada, perfil, vínculo e elegibilidade do recurso antes de alterar estado. Aplicar a regra aprovada de devolução de produto desativado, preservando seu ciclo de vida. Restaurar saldo uma vez, preservar data prevista, registrar data efetiva e persistir autoria e referência do empréstimo no mesmo efeito durável. Integrar a trilha de sucesso ao contrato de auditoria aprovado sem depender apenas do evento pós-requisição.

### Critérios de conclusão

Recusas por vínculo, elegibilidade e saldo preservam estado e autoria efetivada. Mentor autorizado e administração realizam o fluxo previsto, com resultado legível e uma evidência durável de autor e instante. A repetição ou disputa restaura uma única vez e conserva a saída original no histórico.

### Plano TDD

- RED: Testar a matriz aprovada, produto desativado, dois contextos, saldo fora de faixa, falha controlada e publicação de autoria. Reler saldos, datas e evidências em contexto independente.
- GREEN: Aplicar vínculo, cálculo e transação aprovados e projetar a evidência conforme as permissões de auditoria.
- REFACTOR: Compartilhar regras de T003/T004, manter separação de datas e testar legados após eventual migração.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~LoanResourceAuthorizationTests|FullyQualifiedName~LoanReturnCharacterizationTests|FullyQualifiedName~LoanReturnMigrationTests|FullyQualifiedName~LoanReturnAuditTests"`

### Notas

Issue adicional #471 para os limites de restauração.

## T006 — Apresentar a validação da solicitação no formulário

- Issue: #471
- Status: concluída
- Dependências: T003
- Paralela: não
- Requisitos: RF-002, RNF-001, CA-003, CA-004
- Caminhos sob responsabilidade: `frontend/src/pages/mentor/LoanCreation.tsx`, `frontend/src/pages/mentor/LoanCreation.critical.test.tsx`, `frontend/src/integration/Loans.ts`, `frontend/src/integration/Loans.creation.test.ts`

### Escopo

Consumir o contrato aprovado de limite e prazo no fluxo de criação. Preservar dados editáveis em casos de validação e informar o campo ou a causa da recusa.

### Critérios de conclusão

Uma solicitação válida segue para pendência e uma quantidade ou prazo inválido recebe feedback reconhecível junto do item ou campo. O estado preenchido permite correção.

### Plano TDD

- RED: Testar limites aprovados, resposta de validação do servidor, dados preservados e caminho de sucesso com dados sintéticos.
- GREEN: Mapear os resultados de criação recebidos e ajustar validações de formulário aos limites confirmados.
- REFACTOR: Manter o mesmo tratamento de erro por campo e conservar o feedback técnico genérico.

### Validação

- `npm run test -- --run src/pages/mentor/LoanCreation.critical.test.tsx src/integration/Loans.creation.test.ts`

## T007 — Exibir o resultado gravado da decisão e devolução

- Issue: #477
- Status: concluída
- Dependências: T001, T004, T005, T006
- Paralela: não
- Requisitos: RF-001, RF-003, RF-004, RF-005, RNF-002, CA-002, CA-006, CA-009, CA-012, CA-013
- Caminhos sob responsabilidade: `frontend/src/integration/Loans.ts`, `frontend/src/integration/Loans.decision.test.ts`, `frontend/src/pages/loan/LoanHistory.tsx`, `frontend/src/pages/loan/LoanHistory.errors.test.tsx`, `frontend/src/pages/admin/ReturnLoan.tsx`, `frontend/src/pages/admin/ReturnLoan.errors.test.tsx`
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#empréstimos-e-integridade).

### Escopo

Consumir as respostas estáveis de decisão e devolução, recarregar o detalhe após sucesso ou resposta incerta e conservar o fluxo administrativo. Distinguir decisão repetida, saldo insuficiente, concorrência, operação inelegível e erro operacional conforme o contrato.

### Critérios de conclusão

A administração vê o estado persistido, o resultado coerente de cada ação e datas prevista e efetiva separadas. Resposta incerta reconsulta antes de permitir reenvio.

### Plano TDD

- RED: Verificar estados e causas de domínio, recarregamento, reenvio após resposta incerta, foco e feedback no fluxo de devolução.
- GREEN: Mapear os resultados tipados e reconsultar a fonte persistida. Conservar o comportamento acessível de T001.
- REFACTOR: Centralizar o tratamento de respostas sem duplicar as regras do servidor.

### Validação

- `npm run test -- --run src/integration/Loans.decision.test.ts src/pages/loan/LoanHistory.errors.test.tsx src/pages/admin/ReturnLoan.errors.test.tsx`

### Notas

Issues adicionais #468 e #472.

## T008 — Validar retorno ao estoque e autoria na jornada

- Issue: #477
- Status: concluída
- Dependências: T007
- Paralela: não
- Requisitos: RF-003, RF-004, RF-005, RNF-001, CA-007, CA-009, CA-010, CA-011, CA-012, CA-013
- Caminhos sob responsabilidade: `frontend/e2e/critical/loans.spec.ts`
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#empréstimos-e-integridade).

### Escopo

Executar aprovações e devoluções usando contas e estoque sintéticos isolados. Combinar o fluxo administrativo em navegador com a consulta do estado gravado, as tentativas no escopo do mentor e a trilha autorizada.

### Critérios de conclusão

A aprovação produz uma baixa, a devolução restaura uma vez, os dados distinguem as duas datas e a autoria da execução consulta o registro autorizado. Ator sem vínculo recebe a recusa definida e a reconsulta comprova a ausência de novos efeitos.

### Retomada — 2026-11-24

A validação integrada encontrou que o cenário CT-009 consulta `/Auditoria/logs` como array e chama `.filter`, mas a API vigente retorna envelope paginado. A leitura e as asserções foram alinhadas; os cinco cenários passaram. Evidência em `evidencias/T008.md`.

### Retomada — 2026-11-24 — paginação do catálogo

A suíte E2E ampla encontrou que `findProduct` lê somente a primeira página de `/Produtos`. O trace mostra `pagina=1`, `tamanhoPagina=25`, `totalItens=58` e `totalPaginas=3`; o produto sintético procurado não estava na primeira página. Corrigir somente o helper de teste para percorrer o envelope paginado, preservando o contrato legado de array.

### Plano TDD

- RED: Adicionar cenários cruzados de interface, contrato e reconsulta, falhando quando estado, saldo, autoria ou permissão de consulta divergirem.
- GREEN: Manter o arquivo no projeto `real` e endereçar falhas de aplicação nas tarefas proprietárias.
- REFACTOR: Reutilizar os preparadores de empréstimo e contas sintéticas e isolar o saldo ao iniciar cada cenário.

### Validação

- `npm run test:e2e:list`
- `npm run test:e2e -- --project=real e2e/critical/loans.spec.ts`

## Log de execução

| Data | Tarefa | Resultado | Testes/evidências | Observações |
|---|---|---|---|---|
| 2026-11-19 | T008 | concluída | Cinco cenários de empréstimos passaram; `npm run test:e2e:list` reconheceu 248 testes em 18 arquivos; Prettier e `git diff --check` passaram. | Fluxo de aprovação e devolução, autorização por vínculo, saldo, datas e auditoria conferidos no navegador. Auditoria verificada por usuário, origem confiável, recurso e evento, sem dados pessoais omitidos pelo contrato. Composição isolada parada sem remover volumes. |
| 2026-11-19 | T007 | concluída | RED reproduziu falta de reconsulta após conflito/resposta incerta e ausência de datas separadas. GREEN: 24/24 testes em 3 arquivos; ESLint e `git diff --check` passaram. | Telas mostram datas prevista e efetiva; reconsultam estado persistido após conflito, falha incerta ou 5xx antes de liberar nova tentativa. |
| 2026-11-19 | T005 | concluída | RED cobriu vínculo/autorização, produto desativado e duas devoluções concorrentes. GREEN: filtro direcionado 15/15 aprovado, incluindo migration, autorização, characterization e auditoria; `git diff --check` aprovado. | Serviço transacional revalida perfil habilitado e vínculo; saldo é restaurado uma vez; preserva status desativado e data prevista; autoria/movimento persistem com o efeito. Migration `20261119040937_LoanReturnAuditUniqueness` garante autoria única. Detalhe valida datas prevista/efetiva segundo projeção atual. |
| 2026-11-18 | T006 | concluída | RED: recusa de saldo insuficiente só apresentava erro genérico. GREEN: 11/11 testes dirigidos, lint, TypeScript sem emissão e `git diff --check`; suíte frontend integrada 970/970. | Erros de domínio mostram orientação legível, preservam os itens para correção e limpam o aviso quando a lista muda. O cliente já preservava o código da API. |
| 2026-11-17 | T004 | concluída | PostgreSQL 39/39; downgrade com histórico 1/1; build Release isolado; `git diff --check` aprovado. | Decisão e saída são atômicas; aprovação bloqueia produtos em ordem estável, revalida, atualiza saldo e persiste autoria/instante/lote. Rejeição, replay e conflitos têm contrato tipado; downgrade que apagaria movimentos é recusado. Avisos NU1903 de AutoMapper já existentes. |
| 2026-11-17 | T003 | concluída | RED em 7 casos de limite. GREEN/REFACTOR 51/51 com PostgreSQL; diff --check aprovado. | Regras de prazo e saldo compartilhadas; solicitação e previsão usam o mesmo TimeProvider; pendências preservam prazo. Reenvio sem efeitos usa envelope API vigente até T004 tipar o conflito. |
| 2026-11-16 | T001 | concluída | RED: 4 falhas em Vitest e cor verde ausente no navegador. GREEN/REFACTOR: 26/26 em Vitest, 4/4 E2E reais, lint e build local. | Retomada após limite do subagente. Validados foco, contraste em ambos os temas, teclado, refresh e preservação de outro empréstimo. |
| 2026-11-16 | T002 | concluída | RED: seleção vazia recebeu 201 em vez de 400. GREEN/REFACTOR: 10/10; suíte backend da onda 451/451. | Validação defensiva antes de gravar e consulta de referências em lote. Faixas quantitativas permanecem em T003. |

| 2026-11-24 | T008 retomada auditoria | concluída | RED: `.filter` falhou no envelope paginado de `/Auditoria/logs`. GREEN: 5/5 E2E reais, discovery 255/255, ESLint, Prettier e `git diff --check` aprovados. | CT-009 consome `itens` e confere `dataHoraUtc`/`origem`; preservados cookie/CSRF de T026. Stack/artefatos exclusivos removidos, tsbuildinfo preservado; evidência T008. |
| 2026-11-24 | T008 retomada paginação | concluída | RED: com 25 produtos sintéticos ordenados antes do alvo, `findProduct` falhou ao receber somente a página 1. GREEN: os cinco cenários reais passaram (5/5), discovery 255/255, Prettier e `git diff --check` aprovados. | O helper percorre `totalPaginas` usando `tamanhoPagina` e preserva a resposta legada no formato de array. Stacks próprias desmontadas sem `--volumes`; volumes sintéticos preservados; sem GitHub. |
