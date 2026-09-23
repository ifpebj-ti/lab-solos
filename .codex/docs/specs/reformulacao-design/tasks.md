# Tarefas: reformulação integral do design do LabOn

- Status: execução concluída sob limitações documentadas
- PRD: `./prd.md`
- Especificação técnica: `./techspec.md`
- Atualizado em: 2026-09-23
- Inventário inicial: `./cobertura.json`

## Contexto obrigatório de execução

Ler PRD, techspec, `direcao-visual.md`, `organizacao-experiencia.md` e `brief-pilotos.md` antes da tarefa. Os registros posteriores de aprovação prevalecem sobre perguntas históricas desses arquivos: Nathan já escolheu Índice de amostras, organização por perfil, computador como principal contexto, claro/escuro e caminho `code` nesta iniciativa. A referência escolhida é `.impeccable/mocks/decision/assigned.png`; a variante corrigida não recebeu aprovação separada. A configuração permanente `comp` continua intacta. CA-002 é atendido com esses registros e a exceção explícita, sem inventar aprovações de novas imagens.

Este plano não autoriza ampliar contratos, permissões ou persistência. Manter React/Tailwind/Router/Radix e integrações atuais; não modificar backend, banco, sessão ou política de segurança como parte do redesign. Atenção ao empréstimo: dependente/unidade selecionados não integram o payload; preservar validação atual e prazo de cinco dias, explicando a limitação sem prometer vínculo ou conversão inexistente.

A inspeção de planejamento confirmou Vitest, Testing Library, MSW e Playwright e scripts reais em `frontend/package.json`. Não criar executor duplicado. T002 cria o validador inexistente; T003 amplia suporte de acessibilidade/E2E; T004 trata CI separadamente. Números de testes e build registrados na techspec são evidências da etapa anterior, não execução deste plano.

## Dependências humanas e critérios comuns

T001 só termina com linha de base executada e tolerâncias confirmadas; toda implementação visual depende dela. T014 exige aceite dos pilotos antes da expansão. T017, T020, T024 e T028 exigem aceite de cada onda; T031 exige aceite final. Não interpretar silêncio como resposta. Essas condições são exigências do PRD/techspec, não pedidos para reconfirmar escolhas já feitas. Completar o pacote concreto de cada marco antes de apresentar a decisão a Nathan.

Toda tarefa de UI inclui: comparação visual com direção/referência e alcance já aceito; claro/escuro; conteúdo típico/longo; estados aplicáveis; larguras 320, 375, 767, 768 e 1440 px, mais a largura usada por Nathan; teclado, foco, rótulos e erros; contraste 4,5:1 para texto normal/3:1 grande; movimento reduzido e texto a 200%. Compartilhar evidência de primitivas é permitido, mas cada rota exige prova de integração, aparência e autorização. Não transformar falha de API em vazio nem sucesso fictício; ignorar respostas obsoletas e preservar entrada recuperável com segurança.

Toda tarefa registra comandos, resultado e revisão Git/ambiente em `evidencias/Txxx/`, com dados sintéticos. RED é falha do comportamento novo: testes já verdes viram caracterização, sem quebrar código correto. Aparência/espaçamento exigem comparação visual, não asserts de hex/árvore JSX. Executar a skill Impeccable vigente nas tarefas de design e nos marcos de revisão, incluindo detector e revisão independente quando exigidos; indisponibilidade deve ser registrada, sem alegar revisão concluída. Esta decomposição documental não executa esses fluxos.

## Posse e coordenação

Os caminhos listados incluem arquivos novos propostos e padrões conservadores; `Nome*` inclui componente e testes próximos. Cada tarefa pode criar testes nos caminhos possuídos. Alteração fora da posse exige atualizar o plano e dependências antes de editar. Caminhos repetidos em ondas distintas são intencionais e serializados. T006 possui amplamente primitivas, mas não pode correr com T008 nem outras consumidoras.

Apenas T002/T003 são candidatas a paralelo, depois de T001 concluída; suas posses não se sobrepõem. Não iniciar agentes por causa desta marca sem invocar um fluxo de execução que os autorize. O executor/coordenador atualiza status e log de `tasks.md` de forma serial; workers entregam evidências em sua pasta. Apenas T001 e os marcos de aceite consolidam `cobertura.json`. Nas demais tarefas, registrar propostas de atualização nas evidências, sem escrita concorrente no inventário.

Correções identificadas num marco voltam à tarefa proprietária; reabrir dependências afetadas e só retomar o marco após validar. Não concluir tarefas com falha conhecida nem usar marcos documentais para esconder implementação pendente. A sequência conservadora evita partilhar rotas, goldens, fixtures, lockfile e estilos em paralelo.

## Comandos e ambientes

Comandos abaixo partem da raiz no PowerShell. `npm.cmd --prefix frontend` executa os scripts existentes na pasta correta. Em Linux, substituir por `npm`/ `npx`. Instalar dependências com `npm.cmd --prefix frontend ci`; para Chromium, executar `npx.cmd --no-install playwright install chromium` dentro de `frontend`.

E2E exige aplicação acessível: Playwright não inicia servidor. A pilha sintética pode ser preparada com `docker compose -f docker-compose-e2e.yml up -d --build --wait`; conferir URL real e definir `E2E_BASE_URL` quando diferente do padrão 127.0.0.1:4173. Para medições usar build de produção; se necessário executar `npm.cmd --prefix frontend run preview -- --host 127.0.0.1 --port 4173` em processo separado, com configuração runtime e API sintética corretas. Não medir servidor de desenvolvimento nem confundir mocks UI com contratos reais. Os projetos ui e real compartilham ambiente sintético: não executar mutações concorrentes fora do isolamento existente.

Após cada tarefa que muda código frontend: testes direcionados indicados, testes dos consumidores afetados, `npm.cmd --prefix frontend run lint` e `npm.cmd --prefix frontend run build`. Mudanças compartilhadas T005–T008 requerem também `npm.cmd --prefix frontend run test -- --run` e UI dos três perfis antes de prosseguir. Os filtros de testes novos só se tornam executáveis após criá-los na tarefa correspondente; zero testes descobertos não é aprovação. Suíte integral na T029; não repetir sem mudança/falha que justifique.

Comandos `scripts/check_design_coverage.py`, seus testes e o teste de workflow são **entregáveis futuros**, disponíveis somente após T002/T004. O modo padrão valida estrutura e progresso honesto; `--final` exige aceite integral. Durante migração é esperado o modo final falhar por pendências. T031 o torna obrigatório na CI quando a entrega estiver completa. Não atualizar goldens automaticamente para silenciar diferenças.

Backend permanece sem alteração; manter seus checks na CI. Na validação de integração, usar `dotnet restore backend/backend.sln`, `dotnet build backend/backend.sln --no-restore -c Release --nologo --disable-build-servers` e `dotnet test backend/backend.sln --no-build -c Release --nologo --disable-build-servers`, registrando pré-requisitos de PostgreSQL/Docker e resultados efetivos. Documentação completa depende do checkout Wiki na revisão fixada conforme workflow; unittest isolado não prova esse fluxo completo. Nenhuma tarefa inclui push, PR, deploy ou publicação externa.

## Ondas de execução

As ondas abaixo são lotes técnicos; marcos de produto agrupam vários lotes.

| Onda | Tarefas | Motivo de segurança do paralelismo |
|---|---|---|
| 1 | T001 | Execução serial; depende do lote anterior e preserva contratos/arquivos compartilhados. |
| 2 | T002, T003 | Validador Python e suporte frontend possuem arquivos, fixtures e dependências separados; após T001. |
| 3 | T004 | Execução serial; depende do lote anterior e preserva contratos/arquivos compartilhados. |
| 4 | T005 | Execução serial; depende do lote anterior e preserva contratos/arquivos compartilhados. |
| 5 | T006 | Execução serial; depende do lote anterior e preserva contratos/arquivos compartilhados. |
| 6 | T007 | Execução serial; depende do lote anterior e preserva contratos/arquivos compartilhados. |
| 7 | T008 | Execução serial; depende do lote anterior e preserva contratos/arquivos compartilhados. |
| 8 | T009 | Execução serial; depende do lote anterior e preserva contratos/arquivos compartilhados. |
| 9 | T010 | Execução serial; depende do lote anterior e preserva contratos/arquivos compartilhados. |
| 10 | T011 | Execução serial; depende do lote anterior e preserva contratos/arquivos compartilhados. |
| 11 | T012 | Execução serial; depende do lote anterior e preserva contratos/arquivos compartilhados. |
| 12 | T013 | Execução serial; depende do lote anterior e preserva contratos/arquivos compartilhados. |
| 13 | T014 | Execução serial; depende do lote anterior e preserva contratos/arquivos compartilhados. |
| 14 | T015 | Execução serial; depende do lote anterior e preserva contratos/arquivos compartilhados. |
| 15 | T016 | Execução serial; depende do lote anterior e preserva contratos/arquivos compartilhados. |
| 16 | T017 | Execução serial; depende do lote anterior e preserva contratos/arquivos compartilhados. |
| 17 | T018 | Execução serial; depende do lote anterior e preserva contratos/arquivos compartilhados. |
| 18 | T019 | Execução serial; depende do lote anterior e preserva contratos/arquivos compartilhados. |
| 19 | T020 | Execução serial; depende do lote anterior e preserva contratos/arquivos compartilhados. |
| 20 | T021 | Execução serial; depende do lote anterior e preserva contratos/arquivos compartilhados. |
| 21 | T022 | Execução serial; depende do lote anterior e preserva contratos/arquivos compartilhados. |
| 22 | T023 | Execução serial; depende do lote anterior e preserva contratos/arquivos compartilhados. |
| 23 | T024 | Execução serial; depende do lote anterior e preserva contratos/arquivos compartilhados. |
| 24 | T025 | Execução serial; depende do lote anterior e preserva contratos/arquivos compartilhados. |
| 25 | T026 | Execução serial; depende do lote anterior e preserva contratos/arquivos compartilhados. |
| 26 | T027 | Execução serial; depende do lote anterior e preserva contratos/arquivos compartilhados. |
| 27 | T028 | Execução serial; depende do lote anterior e preserva contratos/arquivos compartilhados. |
| 28 | T029 | Execução serial; depende do lote anterior e preserva contratos/arquivos compartilhados. |
| 29 | T030 | Execução serial; depende do lote anterior e preserva contratos/arquivos compartilhados. |
| 30 | T031 | Execução serial; depende do lote anterior e preserva contratos/arquivos compartilhados. |

## Matriz de rastreabilidade bidirecional

Cada tarefa abaixo referencia requisitos; T002–T004 são infraestrutura explicitamente necessária para verificá-los.

| Requisito | Tarefas responsáveis |
|---|---|
| RF-001 | T001, T002, T004, T014, T017, T020, T024, T028, T029, T031 |
| RF-002 | T001, T009, T010, T011, T012, T013, T014, T031 |
| RF-003 | T001, T005, T009, T010, T014, T030 |
| RF-004 | T008, T010, T016, T022, T025, T029 |
| RF-005 | T009, T015, T016 |
| RF-006 | T011, T018, T019, T020 |
| RF-007 | T010, T012, T013, T021, T022, T023, T024, T025, T026 |
| RF-008 | T007, T009, T010, T011, T012, T013, T015, T016, T018, T019, T021, T023, T025, T026 |
| RF-009 | T003, T005, T006, T007, T008, T014, T030 |
| RF-010 | T027, T028, T030, T031 |
| RF-011 | T002, T004, T014, T017, T020, T024, T028, T029, T031 |
| RNF-001 | T003, T005, T006, T007, T008, T014, T029 |
| RNF-002 | T003, T006, T007, T008, T011, T014, T018, T019, T029 |
| RNF-003 | T001, T005, T008, T009, T012, T013, T015, T016, T021, T022, T023, T026, T027, T029 |
| RNF-004 | T001, T014, T027, T029 |
| RNF-005 | T002, T003, T004, T014, T017, T020, T024, T028, T029, T030, T031 |
| CA-001 | T001, T002, T004, T014, T017, T020, T024, T028, T029, T031 |
| CA-002 | T001, T009, T014, T031 |
| CA-003 | T005, T006, T009, T010, T011, T012, T013, T014, T030 |
| CA-004 | T008, T010, T016, T022, T025, T029 |
| CA-005 | T009, T015, T016, T017 |
| CA-006 | T011, T018, T019, T020 |
| CA-007 | T012, T013, T021, T025, T026, T028 |
| CA-008 | T010, T021, T022, T023, T024, T025 |
| CA-009 | T007, T009, T010, T011, T012, T013, T015, T016, T018, T019, T021, T023, T025, T026 |
| CA-010 | T003, T005, T006, T008, T014, T023, T030 |
| CA-011 | T003, T005, T006, T007, T008, T014, T015, T029 |
| CA-012 | T003, T006, T007, T008, T011, T012, T014, T018, T019, T022, T026, T029 |
| CA-013 | T027, T028, T031 |
| CA-014 | T030, T031 |
| CA-015 | T001, T014, T027, T029 |
| CA-016 | T002, T004, T014, T017, T020, T024, T028, T029, T031 |

## T001 — Linha de base executada e tolerâncias confirmadas

- Status: concluída sob limitações documentadas (retomada: linha de base 5×4 e tolerâncias operacionais registradas)
- Dependências: nenhuma
- Onda: 1
- Paralela: não
- Requisitos: RF-001, RF-002, RF-003, RNF-003, RNF-004, CA-001, CA-002, CA-015
- Caminhos sob responsabilidade: `.codex/docs/specs/reformulacao-design/cobertura.json`, `.codex/docs/specs/reformulacao-design/diagnostico/linha-base/**`, `.codex/docs/specs/reformulacao-design/decisoes-execucao.md`, `.codex/docs/specs/reformulacao-design/evidencias/T001/**`

### Escopo

Conferir as 44 rotas, alias, superfícies compartilhadas e documentos da matriz contra a aplicação atual. Registrar revisão Git e alterações locais relevantes, navegador, hardware, rede, fixtures sintéticas, ativos institucionais e procedência. Medir login, início, catálogo e criação na compilação de produção: cinco execuções por cenário, mediana de carregamento/resposta, bytes e bloqueios; observar conclusão, erros, ajuda e passos. Apresentar evidências e proposta concreta de tolerâncias a Nathan.

### Critérios de conclusão

Ambiente de revisão acessível; linha de base reproduzível; Nathan confirmou cenários, prioridades e tolerâncias em registro com alcance e data. Preservar a escolha Índice de amostras, claro/escuro e exceção code; não solicitar novamente essas escolhas. Ausência de resposta mantém somente a conclusão deste marco pendente. Aplicam-se também os critérios comuns deste plano.

### Plano TDD

- RED: Verificação inicial: listar medições e decisões ainda ausentes, sem chamar ausência de navegador de falha de produto.
- GREEN: Completar capturas/medições e registrar a decisão efetiva; não inventar números nem aceite.
- REFACTOR: Consolidar evidências sem apagar histórico; revisar dados sintéticos e critérios de repetição.

### Validação

- `docker compose -f docker-compose-e2e.yml up -d --build --wait`
- `npm.cmd --prefix frontend run build`
- `npm.cmd --prefix frontend run test:e2e:list`
- Registrar evidências reais e cumprir os comandos comuns aplicáveis; falha de ambiente é limitação, não aprovação.

### Notas

Marco com decisão humana: manter pendente até resposta explícita no alcance documentado. O pacote de evidências deve estar completo antes de pedir aceite.

## T002 — Validador testado do inventário de design

- Status: concluída sob exceção autorizada
- Dependências: T001
- Onda: 2
- Paralela: sim (somente após dependências concluídas e confirmação de posse sem conflito)
- Requisitos: RF-001, RF-011, RNF-005, CA-001, CA-016
- Caminhos sob responsabilidade: `scripts/check_design_coverage.py`, `scripts/tests/test_check_design_coverage.py`, `scripts/tests/fixtures/design-coverage/**`, `.codex/docs/specs/reformulacao-design/evidencias/T002/**`

### Escopo

Implementar o utilitário proposto na techspec, lendo cobertura.json e as rotas atuais. Distinguir validação estrutural progressiva de aceite final (--final): pendências declaradas são válidas durante migração; aceite final exige resultado comprovado de todas as superfícies. Validar IDs, tarefas/ondas existentes, rotas, arquivos de evidência, decisões, estados e exclusões justificadas.

### Critérios de conclusão

Casos positivos/negativos cobrem rota omitida, ID duplicado, tarefa inexistente, caminho de evidência ausente ou fora do repositório, exclusão sem aprovação e falsa conclusão. --final falha enquanto houver pendências; não inserir dados de aceite fictícios. Aplicam-se também os critérios comuns deste plano.

### Plano TDD

- RED: Escrever unittest com inventários mínimos: omissão, duplicação e aceite sem evidência devem ser rejeitados.
- GREEN: Implementar CLI com --spec e --final, códigos de saída e mensagens úteis; fixtures isoladas não alteram o inventário real.
- REFACTOR: Separar leitura, validação estrutural e regras de aceite; manter testes de todas as falhas.

### Validação

- `python -m unittest discover -s scripts/tests -p 'test_check_design_coverage.py' -v`
- `python scripts/check_design_coverage.py --spec .codex/docs/specs/reformulacao-design`
- Registrar evidências reais e cumprir os comandos comuns aplicáveis; falha de ambiente é limitação, não aprovação.

### Notas

Não alterar contratos ou caminhos fora da posse; atualizações do inventário são entregues ao próximo marco por meio das evidências desta tarefa.

## T003 — Preparação dos testes de design e acessibilidade

- Status: concluída
- Dependências: T001
- Onda: 2
- Paralela: sim (somente após dependências concluídas e confirmação de posse sem conflito)
- Requisitos: RF-009, RNF-001, RNF-002, RNF-005, CA-010, CA-011, CA-012
- Caminhos sob responsabilidade: `frontend/package.json`, `frontend/package-lock.json`, `frontend/playwright.config.ts`, `frontend/e2e/design-support.ts`, `frontend/e2e/design-system.spec.ts`, `frontend/e2e/design-pilots.spec.ts`, `.codex/docs/specs/reformulacao-design/evidencias/T003/**`

### Escopo

Reutilizar Vitest/MSW/Playwright existentes. Adicionar @axe-core/playwright e lockfile; incluir explicitamente design-system.spec.ts e design-pilots.spec.ts em uiTestFiles. Criar suporte determinístico com fixtures sintéticas, fontes carregadas e animação estabilizada. Preparar casos de caracterização executáveis, sem deixar testes futuros permanentemente ignorados nem goldens implicitamente aprovados.

### Critérios de conclusão

Os dois arquivos são descobertos no projeto ui; projeto real permanece separado. Há ao menos um caso executado por arquivo e um ensaio de axe no suporte. Registrar achados atuais sem desabilitar regras globalmente para ficar verde. Novas garantias funcionais entram junto da tarefa que as implementa. Aplicam-se também os critérios comuns deste plano.

### Plano TDD

- RED: Verificação inicial: descoberta não contém os dois arquivos e suporte axe está ausente; caracterizar navegação existente sem forçar RED artificial.
- GREEN: Criar infraestrutura mínima e smoke de caracterização; confirmar descoberta e execução.
- REFACTOR: Centralizar somente dados e preparação comuns; não mover testes reais para mocks.

### Validação

- `npm.cmd --prefix frontend ci`
- `npm.cmd --prefix frontend run test:e2e:list`
- `npm.cmd --prefix frontend run test:e2e -- --project=ui design-system.spec.ts design-pilots.spec.ts`
- Registrar evidências reais e cumprir os comandos comuns aplicáveis; falha de ambiente é limitação, não aprovação.

### Notas

Não alterar contratos ou caminhos fora da posse; atualizações do inventário são entregues ao próximo marco por meio das evidências desta tarefa.

## T004 — Cobertura de design na CI pré-merge

- Status: concluída
- Dependências: T002, T003
- Onda: 3
- Paralela: não
- Requisitos: RF-001, RF-011, RNF-005, CA-001, CA-016
- Caminhos sob responsabilidade: `.github/workflows/container-ci.yml`, `.github/scripts/tests/test_design_quality_workflow.py`, `.codex/docs/specs/reformulacao-design/evidencias/T004/**`

### Escopo

Acrescentar testes do validador e validação estrutural do inventário a frontend-quality (ou seu passo na raiz), com Python disponível. Preservar E2E ui/real no auth-e2e e propagação pelo quality-gate. Não alterar release nem proteção remota. A migração usa modo estrutural; o modo final será exigido ao encerrar.

### Critérios de conclusão

Teste de contrato do workflow confirma execução em PR/merge_group, comandos no diretório correto e ausência de continue-on-error nos passos novos; frontend-quality continua obrigatório no agregador. Aplicam-se também os critérios comuns deste plano.

### Plano TDD

- RED: Adicionar teste Python que falhe por ausência da chamada ao validador/garantia de propagação.
- GREEN: Adicionar passos mínimos ao job existente, preservando dependências e checks atuais.
- REFACTOR: Evitar job duplicado e manter convenções do workflow.

### Validação

- `python -m unittest discover -s .github/scripts/tests -p 'test_design_quality_workflow.py' -v`
- `python -m unittest discover -s scripts/tests -p 'test_check_design_coverage.py' -v`
- `python scripts/check_design_coverage.py --spec .codex/docs/specs/reformulacao-design`
- Registrar evidências reais e cumprir os comandos comuns aplicáveis; falha de ambiente é limitação, não aprovação.

### Notas

Não alterar contratos ou caminhos fora da posse; atualizações do inventário são entregues ao próximo marco por meio das evidências desta tarefa.

## T005 — Tokens e preferência de tema resiliente

- Status: concluída sob limitação de ambiente
- Dependências: T004
- Onda: 4
- Paralela: não
- Requisitos: RF-003, RF-009, RNF-001, RNF-003, CA-003, CA-010, CA-011
- Caminhos sob responsabilidade: `frontend/src/styles/**`, `frontend/src/theme/**`, `frontend/src/index.css`, `frontend/tailwind.config.js`, `frontend/src/App.tsx`, `frontend/index.html`, `frontend/src/theme-init.ts`, `frontend/public/fonts/**`, `frontend/e2e/design-system.spec.ts`, `.codex/docs/specs/reformulacao-design/evidencias/T005/**`

### Escopo

Introduzir tokens semânticos e aliases temporários para ambos os temas. Implementar preferência light/dark em labon.theme.v1, resolução inicial pelo sistema, escolha explícita, eventos storage e falha de armazenamento. Inicializar antes da montagem por módulo local compatível com CSP. Preparar ThemeSwitch acessível para uso nas tarefas seguintes; preservar fontes/ativos atuais até revisão.

### Critérios de conclusão

Testes cobrem valores inválidos, armazenamento indisponível, abas, mudança de sistema e precedência explícita; .dark/color-scheme corretos. Contraste mínimo 4,5:1/3:1 medido. Auditar legibilidade dos consumidores legados antes de expor alternância; incompatibilidades fora da posse viram pré-requisito explícito, sem entregar temas parcialmente legíveis. Aplicam-se também os critérios comuns deste plano.

### Plano TDD

- RED: Testar preferência e aplicação inicial/eventos; esperar falha pela ausência do comportamento, sem exigir hex específico.
- GREEN: Implementar tokens/provider/inicialização e alternância reutilizável sem persistir dados pessoais.
- REFACTOR: Consolidar variáveis; manter aliases necessários, sem substituição cega de cores de status.

### Validação

- `npm.cmd --prefix frontend run test -- --run src/theme`
- `npm.cmd --prefix frontend run test:e2e -- --project=ui design-system.spec.ts`
- Registrar evidências reais e cumprir os comandos comuns aplicáveis; falha de ambiente é limitação, não aprovação.

### Notas

Não alterar contratos ou caminhos fora da posse; atualizações do inventário são entregues ao próximo marco por meio das evidências desta tarefa.

## T006 — Primitivas visuais, portais e tabela responsiva

- Status: concluída
- Dependências: T005
- Onda: 5
- Paralela: não
- Requisitos: RF-009, RNF-001, RNF-002, CA-003, CA-010, CA-011, CA-012
- Caminhos sob responsabilidade: `frontend/src/components/ui/**`, `frontend/src/components/global/table/**`, `frontend/src/components/screens/InfoContainer.tsx`, `frontend/src/components/screens/InfoContainerWithActions.tsx`, `frontend/src/components/screens/InfoCard*`, `frontend/src/components/global/Container.tsx`, `frontend/e2e/design-system.spec.ts`, `.codex/docs/specs/reformulacao-design/evidencias/T006/**`

### Escopo

Aplicar tokens a botões, campos básicos, badges, diálogo, popover, toast e demais primitivas consumidas. Preservar Radix e semântica lista/dl de ResponsiveTable, rótulos, paginação e conteúdo longo. Não reimplementar lógica de foco nem domínio.

### Critérios de conclusão

Portais herdam ambos os temas; teclado abre/fecha e devolve foco; status tem texto; ações não são encobertas em 320 px. Consumidores da tabela mantêm os contratos atuais. Tarefa não reorganiza navegação (T008). Aplicam-se também os critérios comuns deste plano.

### Plano TDD

- RED: Caracterizar seleção/paginação já corretas; acrescentar testes de foco, nome acessível e conteúdo longo apenas onde faltam garantias.
- GREEN: Aplicar linguagem visual e correções observáveis; comparar desktop/celular e portais.
- REFACTOR: Eliminar classes locais duplicadas no alcance e rodar consumidores afetados.

### Validação

- `npm.cmd --prefix frontend run test -- --run src/components/global/table src/components/ui src/components/screens/InfoCard`
- `npm.cmd --prefix frontend run test:e2e -- --project=ui design-system.spec.ts responsive-layout.spec.ts`
- Registrar evidências reais e cumprir os comandos comuns aplicáveis; falha de ambiente é limitação, não aprovação.

### Notas

Não alterar contratos ou caminhos fora da posse; atualizações do inventário são entregues ao próximo marco por meio das evidências desta tarefa.

## T007 — Campos associados, estados de coleção e composição lista-detalhe

- Status: concluída
- Dependências: T006
- Onda: 6
- Paralela: não
- Requisitos: RF-008, RF-009, RNF-001, RNF-002, CA-009, CA-011, CA-012
- Caminhos sob responsabilidade: `frontend/src/components/global/inputs/**`, `frontend/src/components/global/CollectionFeedback*`, `frontend/src/components/global/ErrorFeedback*`, `frontend/src/components/layout/**`, `frontend/e2e/design-system.spec.ts`, `.codex/docs/specs/reformulacao-design/evidencias/T007/**`

### Escopo

Entregar PageHeader, RecordWorkspace e CollectionFeedback sem chamadas HTTP. Distinguir carregamento, vazio inicial, filtro vazio, falha e atualização com dados antigos. Corrigir PopoverInput real com id/rótulo, aria-invalid, erro associado e type=button; alinhar demais campos. Lista-detalhe tem seleção acessível, retorno móvel e nenhuma linha-botão envolvendo botões.

### Critérios de conclusão

Testes com componentes reais comprovam combobox por rótulo, erro por campo e ausência de envio acidental. RecordWorkspace mantém contexto ao voltar; feedback é anunciado e tem recuperação. Não criar construtor genérico de páginas. Aplicam-se também os critérios comuns deste plano.

### Plano TDD

- RED: Escrever casos do PopoverInput real, falha distinta de vazio e lista-detalhe por teclado; não usar o mock select de LoanCreation como prova.
- GREEN: Implementar somente contratos de apresentação e associação acessível requeridos.
- REFACTOR: Extrair repetição demonstrada; manter ErrorFeedback/catálogo de erros existentes.

### Validação

- `npm.cmd --prefix frontend run test -- --run src/components/global/inputs src/components/global/CollectionFeedback src/components/global/ErrorFeedback src/components/layout`
- `npm.cmd --prefix frontend run test:e2e -- --project=ui design-system.spec.ts`
- Registrar evidências reais e cumprir os comandos comuns aplicáveis; falha de ambiente é limitação, não aprovação.

### Notas

Não alterar contratos ou caminhos fora da posse; atualizações do inventário são entregues ao próximo marco por meio das evidências desta tarefa.

## T008 — Navegação única por perfil e estrutura sem rolagem concorrente

- Status: concluída (retomada: contratos E2E de menu e busca atualizados)
- Dependências: T007
- Onda: 7
- Paralela: não
- Requisitos: RF-004, RF-009, RNF-001, RNF-002, RNF-003, CA-004, CA-010, CA-011, CA-012
- Caminhos sob responsabilidade: `frontend/src/navigation/**`, `frontend/src/routes.tsx`, `frontend/src/pages/Base*.tsx`, `frontend/src/components/ui/layout.tsx`, `frontend/src/components/ui/sidebar.tsx`, `frontend/src/components/ui/app-sidebar*`, `frontend/src/components/ui/site-header.tsx`, `frontend/src/components/site-header.tsx`, `frontend/src/components/nav-*.tsx`, `frontend/src/components/search-form.tsx`, `frontend/src/components/global/OpenSearch*`, `frontend/e2e/post-auth-navigation.spec.ts`, `frontend/e2e/design-system.spec.ts`, `frontend/e2e/feature-visibility.spec.ts` (contratos de menu e busca), `.codex/docs/specs/reformulacao-design/evidencias/T008/**`

### Escopo

Centralizar grupos aprovados em navigationModel e consumir a mesma fonte em menu/busca. Consolidar contêiner, landmarks, skip link, aria-current, gaveta móvel e ThemeSwitch. Preservar 44 padrões, alias, guards, PARENT_ROUTES, IDs e retorno.

### Critérios de conclusão

Destinos autorizados alcançáveis para os três perfis; links proibidos não aparecem nem passam guards; refresh, voltar, intenção pós-login e parâmetros preservados. Gaveta devolve foco, sem h-screen aninhado causando rolagem tripla. Aplicam-se também os critérios comuns deste plano.

### Plano TDD

- RED: Caracterizar URLs/guards existentes; testar grupos aprovados, busca por perfil e foco/retorno novos.
- GREEN: Integrar modelo e estrutura sem alterar autorização ou serviços.
- REFACTOR: Remover menus duplicados e contêineres redundantes após testes dos três perfis.

### Validação

- `npm.cmd --prefix frontend run test -- --run src/navigation src/components/ui/app-sidebar src/components/global/OpenSearch src/components/base src/auth/intendedRoute`
- `npm.cmd --prefix frontend run test:e2e -- --project=ui post-auth-navigation.spec.ts design-system.spec.ts`
- Registrar evidências reais e cumprir os comandos comuns aplicáveis; falha de ambiente é limitação, não aprovação.

### Notas

Não alterar contratos ou caminhos fora da posse; atualizações do inventário são entregues ao próximo marco por meio das evidências desta tarefa.

## T009 — Piloto de login

- Status: concluída sob recuperação central
- Dependências: T008
- Onda: 8
- Paralela: não
- Requisitos: RF-002, RF-003, RF-005, RF-008, RNF-003, CA-002, CA-003, CA-005, CA-009
- Caminhos sob responsabilidade: `frontend/src/pages/Login*`, `frontend/e2e/design-pilots.spec.ts`, `frontend/e2e/design-system.spec.ts` (retorno de contrato), `.codex/docs/specs/reformulacao-design/evidencias/T009/**`

### Escopo

Aplicar direção aprovada ao login, identificação LabOn/IFPE, formulário compacto e ThemeSwitch público. Preservar cadastro/recuperação, destinos e mensagens de conta pendente, credencial inválida e indisponibilidade. Capturar comparação com a referência escolhida, sem alegar aprovação do mock corrigido.

### Critérios de conclusão

Login funcional em dois temas e larguras da matriz; campos identificados, envio exclusivo e políticas atuais preservadas. Evidência técnica não equivale ao aceite de T014. Aplicam-se também os critérios comuns deste plano.

### Plano TDD

- RED: Caracterizar autenticação existente; acrescentar casos de teclado, tema e mensagens/valores preservados em falha.
- GREEN: Compor login com primitivas e integração existentes.
- REFACTOR: Consolidar estilos locais e executar ciclo de credenciais.

### Validação

- `npm.cmd --prefix frontend run test -- --run src/pages/Login src/auth`
- `npm.cmd --prefix frontend run test:e2e -- --project=ui design-pilots.spec.ts`
- `npm.cmd --prefix frontend run test:e2e -- --project=real credential-lifecycle.spec.ts`
- Registrar evidências reais e cumprir os comandos comuns aplicáveis; falha de ambiente é limitação, não aprovação.

### Notas

Não alterar contratos ou caminhos fora da posse; atualizações do inventário são entregues ao próximo marco por meio das evidências desta tarefa.

## T010 — Piloto de início dos três perfis

- Status: concluída sob limitação de ambiente
- Dependências: T009
- Onda: 9
- Paralela: não
- Requisitos: RF-002, RF-003, RF-004, RF-007, RF-008, CA-003, CA-004, CA-008, CA-009
- Caminhos sob responsabilidade: `frontend/src/pages/admin/Home*`, `frontend/src/pages/Home*`, `frontend/src/components/screens/CardFunction.tsx`, `frontend/src/components/screens/ButtonLinkNotify.tsx`, `frontend/e2e/design-pilots.spec.ts`, `.codex/docs/specs/reformulacao-design/evidencias/T010/**`

### Escopo

Administrador: pendências reais em lista-detalhe; empréstimos e cadastros carregam/falham independentemente, sem zero fictício. Mentor/Mentorado: ações e destinos aprovados no próprio escopo. Seleção validada em query preserva parâmetros; ação de analisar navega à jornada existente sem duplicar aprovação.

### Critérios de conclusão

ID ausente/inválido/indisponível tem estado claro; resposta atrasada não troca contexto; refresh e retorno móvel mantêm seleção válida; nenhuma métrica ou nome inventado. Aplicam-se também os critérios comuns deste plano.

### Plano TDD

- RED: Testar falha parcial entre coleções, respostas fora de ordem, seleção inválida e destinos por perfil.
- GREEN: Implementar estados independentes e composição com RecordWorkspace e serviços existentes.
- REFACTOR: Extrair adaptadores locais pequenos; manter lógica de mutação fora da home.

### Validação

- `npm.cmd --prefix frontend run test -- --run src/pages/admin/Home src/pages/Home`
- `npm.cmd --prefix frontend run test:e2e -- --project=ui design-pilots.spec.ts post-auth-navigation.spec.ts`
- Registrar evidências reais e cumprir os comandos comuns aplicáveis; falha de ambiente é limitação, não aprovação.

### Notas

Não alterar contratos ou caminhos fora da posse; atualizações do inventário são entregues ao próximo marco por meio das evidências desta tarefa.

## T011 — Piloto de catálogo nos três perfis

- Status: concluída sob limitação de ambiente
- Dependências: T010
- Onda: 10
- Paralela: não
- Requisitos: RF-002, RF-006, RF-008, RNF-002, CA-003, CA-006, CA-009, CA-012
- Caminhos sob responsabilidade: `frontend/src/components/screens/SearchMaterialComponent*`, `frontend/src/pages/search/**`, `frontend/e2e/design-pilots.spec.ts`, `.codex/docs/specs/reformulacao-design/evidencias/T011/**`

### Escopo

Aplicar índice com filtros próximos, nome/categoria/quantidade/unidade/status e detalhe associado, reutilizando integrações e ResponsiveTable. Preservar algoritmos de consulta/paginação, ações por perfil e links canônicos.

### Critérios de conclusão

Conteúdo longo legível, sem esconder unidades; vazio e falha distintos; filtro e retorno preservados; resultado tardio não substitui consulta atual. Dois temas e matriz móvel/desktop comprovados. Aplicam-se também os critérios comuns deste plano.

### Plano TDD

- RED: Caracterizar payload/filtros atuais e acrescentar rejeição com recuperação, corrida de consultas e nomes longos.
- GREEN: Compor lista/detalhe sem modificar contrato Product ou autorização.
- REFACTOR: Reduzir duplicação entre wrappers dos três perfis.

### Validação

- `npm.cmd --prefix frontend run test -- --run src/components/screens/SearchMaterialComponent src/integration/Product`
- `npm.cmd --prefix frontend run test:e2e -- --project=ui design-pilots.spec.ts responsive-layout.spec.ts`
- Registrar evidências reais e cumprir os comandos comuns aplicáveis; falha de ambiente é limitação, não aprovação.

### Notas

Não alterar contratos ou caminhos fora da posse; atualizações do inventário são entregues ao próximo marco por meio das evidências desta tarefa.

## T012 — Piloto de criação de empréstimo

- Status: concluída sob limitação de ambiente
- Dependências: T011
- Onda: 11
- Paralela: não
- Requisitos: RF-002, RF-007, RF-008, RNF-003, CA-003, CA-007, CA-009, CA-012
- Caminhos sob responsabilidade: `frontend/src/pages/mentor/LoanCreation*`, `frontend/e2e/design-pilots.spec.ts`, `.codex/docs/specs/reformulacao-design/evidencias/T012/**`

### Escopo

Separar contexto, composição e revisão na mesma página. Preservar seleção exigida, diasParaDevolucao: 5 e produtos[{produtoId,quantidade}]. Informar solicitante autenticado; seleção de dependente/unidade não cria vínculo nem conversão persistida. Adicionar é local, Solicitar envia; não prometer redirecionamento inexistente.

### Critérios de conclusão

Payload idêntico, envio único, itens/seleção mantidos após falha e limpeza somente no sucesso. Quantidade inválida, conflito e indisponibilidade compreensíveis. Interface real usa PopoverInput acessível. Aplicam-se também os critérios comuns deste plano.

### Plano TDD

- RED: Ampliar testes críticos de payload e submissão/falha; testar seletor real via UI, sem remover sua validação atual.
- GREEN: Aplicar composição e feedback usando integração Loans existente.
- REFACTOR: Consolidar estado local sem armazenamento persistente nem novo prazo/beneficiário.

### Validação

- `npm.cmd --prefix frontend run test -- --run src/pages/mentor/LoanCreation src/integration/Loans.creation`
- `npm.cmd --prefix frontend run test:e2e -- --project=ui design-pilots.spec.ts`
- `npm.cmd --prefix frontend run test:e2e -- --project=real critical/loans.spec.ts`
- Registrar evidências reais e cumprir os comandos comuns aplicáveis; falha de ambiente é limitação, não aprovação.

### Notas

Não alterar contratos ou caminhos fora da posse; atualizações do inventário são entregues ao próximo marco por meio das evidências desta tarefa.

## T013 — Pilotos de análise administrativa e consulta do Mentorado

- Status: concluída sob limitação de ambiente
- Dependências: T012
- Onda: 12
- Paralela: não
- Requisitos: RF-002, RF-007, RF-008, RNF-003, CA-003, CA-007, CA-009
- Caminhos sob responsabilidade: `frontend/src/pages/admin/LoansRequest*`, `frontend/src/pages/mentee/LoanHistory*`, `frontend/src/pages/mentee/HistoryMentoring*`, `frontend/e2e/design-pilots.spec.ts`, `.codex/docs/specs/reformulacao-design/evidencias/T013/**`

### Escopo

Apresentar identificador, situação, solicitante e itens antes de confirmação. Administrador aprova/recusa com os PATCH existentes; Mentorado consulta sem ações administrativas. Manter histórico pessoal e detalhe distinguíveis e retorno autorizado.

### Critérios de conclusão

Falha de mutação não produz sucesso; falha de recarga após mutação é distinta de falha da operação; confirmação e bloqueio de envio duplicado preservados; nenhum acesso ampliado. Aplicam-se também os critérios comuns deste plano.

### Plano TDD

- RED: Caracterizar efeitos atuais e acrescentar falhas de confirmação/recarga, teclado e consulta sem ações vedadas.
- GREEN: Aplicar sistema visual e estados explícitos às jornadas piloto.
- REFACTOR: Reutilizar componentes e mensagens; não criar aprovação otimista.

### Validação

- `npm.cmd --prefix frontend run test -- --run src/pages/admin/LoansRequest src/pages/mentee/LoanHistory src/pages/mentee/HistoryMentoring src/integration/Loans.decision`
- `npm.cmd --prefix frontend run test:e2e -- --project=ui design-pilots.spec.ts`
- `npm.cmd --prefix frontend run test:e2e -- --project=real critical/loans.spec.ts`
- Registrar evidências reais e cumprir os comandos comuns aplicáveis; falha de ambiente é limitação, não aprovação.

### Notas

Não alterar contratos ou caminhos fora da posse; atualizações do inventário são entregues ao próximo marco por meio das evidências desta tarefa.

## T014 — Aceite dos pilotos e da base compartilhada

- Status: concluída sob limitação de ambiente
- Dependências: T013
- Onda: 13
- Paralela: não
- Requisitos: RF-001, RF-002, RF-003, RF-009, RF-011, RNF-001, RNF-002, RNF-004, RNF-005, CA-001, CA-002, CA-003, CA-010, CA-011, CA-012, CA-015, CA-016
- Caminhos sob responsabilidade: `.codex/docs/specs/reformulacao-design/cobertura.json`, `.codex/docs/specs/reformulacao-design/aceites/pilotos/**`, `frontend/e2e/design-pilots.spec.ts-snapshots/**`, `frontend/e2e/design-system.spec.ts-snapshots/**`, `.codex/docs/specs/reformulacao-design/evidencias/T014/**`

### Escopo

Consolidar evidências T005–T013: comparar referência escolhida e runtime equivalente; verificar tipografia, contraste claro/escuro, celular, tarefas e desempenho. Executar audit/critique/detector e revisão independente conforme Impeccable vigente. Apresentar pacote concreto a Nathan antes da expansão.

### Critérios de conclusão

Sem bloqueante/alto aberto; divergências materiais corrigidas na tarefa proprietária ou decididas explicitamente. Nathan aceitou alcance dos pilotos/base e referências de comparação. Silêncio não conclui tarefa. Goldens iniciais só são persistidos após revisão. Aplicam-se também os critérios comuns deste plano.

### Plano TDD

- RED: Verificação inicial: pacote deve apontar evidências/aceites ausentes em vez de declarar concluído.
- GREEN: Executar revisão cruzada e registrar achados, resoluções, limites, aprovação e versão; atualizar somente registros efetivamente validados.
- REFACTOR: Consolidar relatório rastreável, mantendo referências rejeitadas/substituídas.

### Validação

- `npm.cmd --prefix frontend run test:e2e -- --project=ui design-system.spec.ts design-pilots.spec.ts`
- `python scripts/check_design_coverage.py --spec .codex/docs/specs/reformulacao-design`
- Registrar evidências reais e cumprir os comandos comuns aplicáveis; falha de ambiente é limitação, não aprovação.

### Notas

Marco com decisão humana: manter pendente até resposta explícita no alcance documentado. O pacote de evidências deve estar completo antes de pedir aceite.

## T015 — Expansão do cadastro e recuperação de acesso

- Status: concluída (retomada: seletor de logout alinhado ao nome acessível vigente; suíte real 4/4 e testes T015 93/93)
- Dependências: T014
- Onda: 14
- Paralela: não
- Requisitos: RF-005, RF-008, RNF-003, CA-005, CA-009, CA-011
- Caminhos sob responsabilidade: `frontend/src/pages/CreateAccount*`, `frontend/src/pages/ForgotPassword*`, `frontend/src/pages/ResetPassword*`, `frontend/src/pages/ChangePassword*`, `frontend/src/components/auth/**`, `frontend/e2e/credential-lifecycle.spec.ts`, `.codex/docs/specs/reformulacao-design/evidencias/T015/**`

### Escopo

Migrar cadastro, recuperação, redefinição e troca obrigatória para a linguagem aceita. Preservar validação, privacidade, política de senha e encerramento/retomada segura; manter guarda de primeiro acesso.

### Critérios de conclusão

Estados de pendência, tokens inválidos/expirados, erros por campo e sucesso mantêm políticas; nenhum bypass de troca obrigatória; acessível nos dois temas. Aplicam-se também os critérios comuns deste plano.

### Plano TDD

- RED: Caracterizar contratos cobertos; acrescentar associação de erro e preservação segura dos campos, sem exigir guardar senhas indevidamente.
- GREEN: Aplicar componentes e mensagens aprovados às quatro jornadas.
- REFACTOR: Consolidar composição de acesso sem alterar serviços/auth.

### Validação

- `npm.cmd --prefix frontend run test -- --run src/pages/CreateAccount src/pages/ForgotPassword src/pages/ResetPassword src/pages/ChangePassword src/components/auth src/auth`
- `npm.cmd --prefix frontend run test:e2e -- --project=real credential-lifecycle.spec.ts`
- Registrar evidências reais e cumprir os comandos comuns aplicáveis; falha de ambiente é limitação, não aprovação.

### Notas

Não alterar contratos ou caminhos fora da posse; atualizações do inventário são entregues ao próximo marco por meio das evidências desta tarefa.

## T016 — Expansão de conta, notificações e estados globais

- Status: concluída sob limitação de ambiente
- Dependências: T015
- Onda: 15
- Paralela: não
- Requisitos: RF-004, RF-005, RF-008, RNF-003, CA-004, CA-005, CA-009
- Caminhos sob responsabilidade: `frontend/src/pages/Profile*`, `frontend/src/pages/mentor/Profile*`, `frontend/src/pages/mentee/Profile*`, `frontend/src/pages/Page404*`, `frontend/src/components/notifications/**`, `frontend/src/components/nav-user*`, `frontend/src/components/global/ButtonLogout*`, `frontend/src/components/global/ErrorFeedback*`, `frontend/e2e/error-experience.spec.ts`, `.codex/docs/specs/reformulacao-design/evidencias/T016/**`

### Escopo

Alinhar perfil por permissão, conta, saída, notificações, 404 e acesso negado/expiração à base aprovada. Conferir busca entregue em T008 e acessos secundários; preservar edição somente para quem já a possui.

### Critérios de conclusão

401 encerra/retoma sessão conforme fluxo atual; 403 mantém sessão; notificações e logout acessíveis por teclado; detalhes técnicos/tokens não aparecem. Formulários não perdem entrada recuperável quando seguro. Aplicam-se também os critérios comuns deste plano.

### Plano TDD

- RED: Caracterizar perfis e sessão; acrescentar testes de mensagens e ações de recuperação e falha de notificações.
- GREEN: Aplicar componentes sem reescrever auth/session ou BaseApi.
- REFACTOR: Eliminar estilos/feedback divergentes e executar consumidores.

### Validação

- `npm.cmd --prefix frontend run test -- --run src/pages/Profile src/pages/Page404 src/components/nav-user src/components/global/ButtonLogout src/components/global/ErrorFeedback src/auth/sessionConsumers`
- `npm.cmd --prefix frontend run test:e2e -- --project=ui error-experience.spec.ts user-data-contract.spec.ts`
- Registrar evidências reais e cumprir os comandos comuns aplicáveis; falha de ambiente é limitação, não aprovação.

### Notas

Não alterar contratos ou caminhos fora da posse; atualizações do inventário são entregues ao próximo marco por meio das evidências desta tarefa.

## T017 — Aceite da onda de acesso e estrutura

- Status: concluída sob limitação de ambiente
- Dependências: T016
- Onda: 16
- Paralela: não
- Requisitos: RF-001, RF-011, RNF-005, CA-001, CA-005, CA-016
- Caminhos sob responsabilidade: `.codex/docs/specs/reformulacao-design/cobertura.json`, `.codex/docs/specs/reformulacao-design/aceites/acesso/**`, `.codex/docs/specs/reformulacao-design/evidencias/T017/**`

### Escopo

Revisar conjuntamente T015–T016 e integração com base/pilotos; registrar capturas por perfil/tema e comportamento de sessão, conta, notificações e caminhos secundários.

### Critérios de conclusão

Pacote verificável, sem bloqueante/alto; Nathan aceitou a onda e limitações menores têm decisão. Corrigir código nas tarefas proprietárias antes de concluir este marco. Aplicam-se também os critérios comuns deste plano.

### Plano TDD

- RED: Verificação inicial: localizar cobertura/decisões faltantes da onda.
- GREEN: Executar revisão, apresentar resultado e registrar aceite efetivo.
- REFACTOR: Consolidar achados e vincular evidências aos IDs de superfície.

### Validação

- `npm.cmd --prefix frontend run test:e2e -- --project=ui error-experience.spec.ts post-auth-navigation.spec.ts`
- `python scripts/check_design_coverage.py --spec .codex/docs/specs/reformulacao-design`
- Registrar evidências reais e cumprir os comandos comuns aplicáveis; falha de ambiente é limitação, não aprovação.

### Notas

Marco com decisão humana: manter pendente até resposta explícita no alcance documentado. O pacote de evidências deve estar completo antes de pedir aceite.

## T018 — Cadastro e edição de materiais por categoria

- Status: concluída sob limitação de ambiente
- Dependências: T017
- Onda: 17
- Paralela: não
- Requisitos: RF-006, RF-008, RNF-002, CA-006, CA-009, CA-012
- Caminhos sob responsabilidade: `frontend/src/pages/insert/**`, `frontend/src/components/global/forms/create/**`, `frontend/src/components/modals/ProductEditModal*`, `.codex/docs/specs/reformulacao-design/evidencias/T018/**`

### Escopo

Migrar cadastro de químicos, vidrarias e outros e edição em diálogo. Preservar todos os campos, unidades, validações e efeitos; identificar campos/erros e manter valores em falhas recuperáveis.

### Critérios de conclusão

Operações autorizadas mantêm payloads; diálogo não corta ações nem perde foco/entrada; nomes e dados extensos legíveis, sem envio duplicado. Aplicam-se também os critérios comuns deste plano.

### Plano TDD

- RED: Caracterizar formulários existentes; testar falha com dados preservados e associação de erro no modal real.
- GREEN: Aplicar campos e confirmações aprovados sem mudar Product.
- REFACTOR: Consolidar padrões entre categorias mantendo diferenças do domínio.

### Validação

- `npm.cmd --prefix frontend run test -- --run src/pages/insert src/components/global/forms/create src/components/modals/ProductEditModal src/integration/Product`
- `npm.cmd --prefix frontend run test:e2e -- --project=ui responsive-layout.spec.ts`
- Registrar evidências reais e cumprir os comandos comuns aplicáveis; falha de ambiente é limitação, não aprovação.

### Notas

Não alterar contratos ou caminhos fora da posse; atualizações do inventário são entregues ao próximo marco por meio das evidências desta tarefa.

## T019 — Detalhes, alertas e histórico de materiais

- Status: concluída sob limitação de ambiente
- Dependências: T018
- Onda: 18
- Paralela: não
- Requisitos: RF-006, RF-008, RNF-002, CA-006, CA-009, CA-012
- Caminhos sob responsabilidade: `frontend/src/pages/Verification*`, `frontend/src/pages/mentor/VerificationMentor*`, `frontend/src/pages/mentee/Verification*`, `frontend/src/components/screens/VerificationPage*`, `frontend/src/pages/FollowUp*`, `frontend/src/components/screens/FollowUp*`, `frontend/src/pages/products/**`, `.codex/docs/specs/reformulacao-design/evidencias/T019/**`

### Escopo

Migrar detalhe compartilhado, acompanhamento/alertas e histórico do produto. Preservar parâmetros de identificação, retorno, permissões e unidades; distinguir registro ausente, acesso negado e falha.

### Critérios de conclusão

Três perfis consultam somente seu escopo; refresh/voltar e ID inválido não abrem outro registro; conteúdo extenso e ausência de histórico têm tratamento adequado. Aplicam-se também os critérios comuns deste plano.

### Plano TDD

- RED: Ampliar testes de navegação/erro com IDs inválidos, resposta tardia e retorno com contexto.
- GREEN: Aplicar estados e composição usando integrações existentes.
- REFACTOR: Consolidar wrappers e campos rotulados sem ocultar informação.

### Validação

- `npm.cmd --prefix frontend run test -- --run src/components/screens/VerificationPage src/pages/FollowUp src/pages/products`
- `npm.cmd --prefix frontend run test:e2e -- --project=ui responsive-layout.spec.ts post-auth-navigation.spec.ts`
- Registrar evidências reais e cumprir os comandos comuns aplicáveis; falha de ambiente é limitação, não aprovação.

### Notas

Não alterar contratos ou caminhos fora da posse; atualizações do inventário são entregues ao próximo marco por meio das evidências desta tarefa.

## T020 — Aceite da onda de materiais

- Status: concluída sob limitação de ambiente
- Dependências: T019
- Onda: 19
- Paralela: não
- Requisitos: RF-001, RF-006, RF-011, RNF-005, CA-001, CA-006, CA-016
- Caminhos sob responsabilidade: `.codex/docs/specs/reformulacao-design/cobertura.json`, `.codex/docs/specs/reformulacao-design/aceites/materiais/**`, `.codex/docs/specs/reformulacao-design/evidencias/T020/**`

### Escopo

Percorrer catálogo → detalhe → edição/cadastro → acompanhamento/histórico, conforme cada perfil, confrontando T018–T019 com os pilotos aceitos.

### Critérios de conclusão

Nathan aceitou a onda, sem bloqueante/alto; categorias, dados longos e erros cobertos. Exclusões somente com decisão explícita. Aplicam-se também os critérios comuns deste plano.

### Plano TDD

- RED: Verificação inicial: localizar evidências de consumidor e casos de categoria ausentes.
- GREEN: Revisar e registrar pacote, achados e decisão efetiva.
- REFACTOR: Consolidar matriz sem aceitar apenas evidência da primitiva.

### Validação

- `npm.cmd --prefix frontend run test:e2e -- --project=ui design-pilots.spec.ts responsive-layout.spec.ts`
- `python scripts/check_design_coverage.py --spec .codex/docs/specs/reformulacao-design`
- Registrar evidências reais e cumprir os comandos comuns aplicáveis; falha de ambiente é limitação, não aprovação.

### Notas

Marco com decisão humana: manter pendente até resposta explícita no alcance documentado. O pacote de evidências deve estar completo antes de pedir aceite.

## T021 — Usuários, solicitações e confirmações de gestão

- Status: concluída sob limitação de ambiente
- Dependências: T020
- Onda: 20
- Paralela: não
- Requisitos: RF-007, RF-008, RNF-003, CA-007, CA-008, CA-009
- Caminhos sob responsabilidade: `frontend/src/pages/RegisteredUsers*`, `frontend/src/pages/RegistrationRequests*`, `frontend/src/components/global/UserActionsMenu*`, `frontend/src/components/global/UserStatusManager*`, `frontend/src/components/global/StatusConfirmationDialog*`, `frontend/e2e/critical/registration-approval.spec.ts`, `.codex/docs/specs/reformulacao-design/evidencias/T021/**`

### Escopo

Migrar listagem de usuários, solicitações de Administrador/Mentor, ações e confirmações existentes. Manter filtros, estados de aprovação e autorização; preservar acionadores de exportação para T027.

### Critérios de conclusão

Recusa/aprovação/desativação existentes continuam confirmadas e exclusivas; falha não mostra sucesso; escopo por perfil preservado e recursos removidos não reaparecem. Aplicam-se também os critérios comuns deste plano.

### Plano TDD

- RED: Caracterizar contratos de Users; acrescentar falha de recarga após sucesso, teclado e bloqueio de envio repetido.
- GREEN: Aplicar sistema visual e estados locais com integrações atuais.
- REFACTOR: Consolidar confirmações existentes sem modificar permissões.

### Validação

- `npm.cmd --prefix frontend run test -- --run src/pages/RegisteredUsers src/pages/RegistrationRequests src/integration/Users src/components/global/User`
- `npm.cmd --prefix frontend run test:e2e -- --project=real critical/registration-approval.spec.ts`
- Registrar evidências reais e cumprir os comandos comuns aplicáveis; falha de ambiente é limitação, não aprovação.

### Notas

Não alterar contratos ou caminhos fora da posse; atualizações do inventário são entregues ao próximo marco por meio das evidências desta tarefa.

## T022 — Turmas, vínculos e desativados

- Status: concluída sob limitação de ambiente
- Dependências: T021
- Onda: 21
- Paralela: não
- Requisitos: RF-004, RF-007, RNF-003, CA-004, CA-008, CA-012
- Caminhos sob responsabilidade: `frontend/src/pages/ViewClass*`, `frontend/src/pages/mentor/MyClass*`, `frontend/src/pages/mentor/Disabled*`, `.codex/docs/specs/reformulacao-design/evidencias/T022/**`

### Escopo

Migrar visualização de turmas e vínculos, Minha turma e desativados. Preservar destinos dos históricos, IDs, relações e ações permitidas; históricos completos ficam em T025.

### Critérios de conclusão

Links corretos, refresh e retorno preservados; estados vazios/falhas distintos e nomes extensos completos; nenhum perfil ganha edição. Aplicam-se também os critérios comuns deste plano.

### Plano TDD

- RED: Caracterizar navegação existente; testar ID ausente/vedado e recuperação de falha sem perder contexto.
- GREEN: Aplicar componentes de coleção e índice.
- REFACTOR: Remover composição duplicada somente onde contratos coincidem.

### Validação

- `npm.cmd --prefix frontend run test -- --run src/pages/ViewClass src/pages/mentor/MyClass src/pages/mentor/Disabled src/integration/Class`
- `npm.cmd --prefix frontend run test:e2e -- --project=ui post-auth-navigation.spec.ts responsive-layout.spec.ts`
- Registrar evidências reais e cumprir os comandos comuns aplicáveis; falha de ambiente é limitação, não aprovação.

### Notas

Não alterar contratos ou caminhos fora da posse; atualizações do inventário são entregues ao próximo marco por meio das evidências desta tarefa.

## T023 — Auditoria e configurações

- Status: concluída sob limitação de ambiente
- Dependências: T022
- Onda: 22
- Paralela: não
- Requisitos: RF-007, RF-008, RNF-003, CA-008, CA-009, CA-010
- Caminhos sob responsabilidade: `frontend/src/pages/admin/Auditoria*`, `frontend/src/pages/admin/Settings*`, `.codex/docs/specs/reformulacao-design/evidencias/T023/**`

### Escopo

Migrar auditoria e configurações existentes, mantendo conteúdo, filtros, acesso administrativo e contratos System/Auditoria. Não criar recursos ou indicadores.

### Critérios de conclusão

Conteúdo longo, paginação e estados em dois temas; mudanças permitidas têm confirmação real e erro recuperável; nenhum segredo exposto. Aplicam-se também os critérios comuns deste plano.

### Plano TDD

- RED: Caracterizar comportamento atual e adicionar casos de falha, recuperação e permissão onde ausentes.
- GREEN: Aplicar linguagem e estados com serviços atuais.
- REFACTOR: Consolidar estilos sem expandir funcionalidades.

### Validação

- `npm.cmd --prefix frontend run test -- --run src/pages/admin/Auditoria src/pages/admin/Settings src/integration/Auditoria src/integration/System`
- `npm.cmd --prefix frontend run test:e2e -- --project=ui feature-visibility.spec.ts`
- Registrar evidências reais e cumprir os comandos comuns aplicáveis; falha de ambiente é limitação, não aprovação.

### Notas

Não alterar contratos ou caminhos fora da posse; atualizações do inventário são entregues ao próximo marco por meio das evidências desta tarefa.

## T024 — Aceite da onda de pessoas e gestão

- Status: concluída sob limitação de ambiente
- Dependências: T023
- Onda: 23
- Paralela: não
- Requisitos: RF-001, RF-007, RF-011, RNF-005, CA-001, CA-008, CA-016
- Caminhos sob responsabilidade: `.codex/docs/specs/reformulacao-design/cobertura.json`, `.codex/docs/specs/reformulacao-design/aceites/gestao/**`, `.codex/docs/specs/reformulacao-design/evidencias/T024/**`

### Escopo

Revisar T021–T023 por perfil, incluindo confirmação, negativa de acesso, links de turma e continuidade de históricos.

### Critérios de conclusão

Pacote e decisão de Nathan registrados, sem bloqueante/alto; nenhum recurso removido reaparece. Aplicam-se também os critérios comuns deste plano.

### Plano TDD

- RED: Verificação inicial: conferir lacunas de autorização e superfície secundária.
- GREEN: Executar revisão comparada e registrar aceite efetivo.
- REFACTOR: Vincular achados resolvidos às evidências e atualizar matriz.

### Validação

- `npm.cmd --prefix frontend run test:e2e -- --project=real critical/registration-approval.spec.ts`
- `python scripts/check_design_coverage.py --spec .codex/docs/specs/reformulacao-design`
- Registrar evidências reais e cumprir os comandos comuns aplicáveis; falha de ambiente é limitação, não aprovação.

### Notas

Marco com decisão humana: manter pendente até resposta explícita no alcance documentado. O pacote de evidências deve estar completo antes de pedir aceite.

## T025 — Históricos e detalhes restantes de empréstimos

- Status: concluída sob limitação de ambiente
- Dependências: T024
- Onda: 24
- Paralela: não
- Requisitos: RF-004, RF-007, RF-008, CA-004, CA-007, CA-008, CA-009
- Caminhos sob responsabilidade: `frontend/src/pages/loan/**`, `frontend/src/pages/admin/AllLoans*`, `frontend/src/pages/admin/ClassLoan*`, `frontend/src/pages/admin/MentoringHistoryAdm*`, `frontend/src/pages/mentor/HistoryClass*`, `frontend/src/pages/mentor/MentoringHistory*`, `.codex/docs/specs/reformulacao-design/evidencias/T025/**`

### Escopo

Migrar listas, histórico pessoal/da turma e detalhes remanescentes. Manter alias /mentor/history/mentee, links canônicos e distinção de cada contexto; acionadores PDF/Excel mantêm comportamento até T027.

### Critérios de conclusão

IDs, parâmetros, refresh e retorno preservados; quantidade/unidade/status legíveis em dois temas; API indisponível não vira histórico vazio. Aplicam-se também os critérios comuns deste plano.

### Plano TDD

- RED: Ampliar caracterização de rotas/contratos com erro, ID inválido, corrida de consultas e nome longo.
- GREEN: Aplicar composição e feedback existentes sem mudar domínio.
- REFACTOR: Consolidar trechos de apresentação sem fundir históricos de escopos diferentes.

### Validação

- `npm.cmd --prefix frontend run test -- --run src/pages/loan src/pages/admin/AllLoans src/pages/admin/ClassLoan src/pages/admin/MentoringHistoryAdm src/pages/mentor/HistoryClass src/pages/mentor/MentoringHistory`
- `npm.cmd --prefix frontend run test:e2e -- --project=ui post-auth-navigation.spec.ts responsive-layout.spec.ts`
- Registrar evidências reais e cumprir os comandos comuns aplicáveis; falha de ambiente é limitação, não aprovação.

### Notas

Não alterar contratos ou caminhos fora da posse; atualizações do inventário são entregues ao próximo marco por meio das evidências desta tarefa.

## T026 — Devolução de empréstimos

- Status: concluída sob limitação de ambiente
- Dependências: T025
- Onda: 25
- Paralela: não
- Requisitos: RF-007, RF-008, RNF-003, CA-007, CA-009, CA-012
- Caminhos sob responsabilidade: `frontend/src/pages/admin/ReturnLoan*`, `frontend/e2e/critical/loans.spec.ts`, `.codex/docs/specs/reformulacao-design/evidencias/T026/**`

### Escopo

Migrar devolução com informação necessária antes da confirmação e integração PATCH existente. Preservar contexto, autorização e diferenciação de aprovar/recusar/devolver.

### Critérios de conclusão

Uma submissão, confirmação inequívoca, falhas sem sucesso falso; atualização da lista distingue resultado da operação e falha de recarga. Aplicam-se também os critérios comuns deste plano.

### Plano TDD

- RED: Caracterizar devolução e acrescentar falha/duplo clique/recarga e foco após confirmação.
- GREEN: Aplicar sistema e estados sem alterar corpo da requisição.
- REFACTOR: Reutilizar confirmação e tratamento de erro.

### Validação

- `npm.cmd --prefix frontend run test -- --run src/pages/admin/ReturnLoan src/integration/Loans`
- `npm.cmd --prefix frontend run test:e2e -- --project=real critical/loans.spec.ts`
- Registrar evidências reais e cumprir os comandos comuns aplicáveis; falha de ambiente é limitação, não aprovação.

### Notas

Não alterar contratos ou caminhos fora da posse; atualizações do inventário são entregues ao próximo marco por meio das evidências desta tarefa.

## T027 — PDFs e exportações equivalentes, carregados sob demanda

- Status: concluída sob limitação de ambiente
- Dependências: T026
- Onda: 26
- Paralela: não
- Requisitos: RF-010, RNF-003, RNF-004, CA-013, CA-015
- Caminhos sob responsabilidade: `frontend/src/components/pdf/**`, `frontend/src/pages/loan/LoanHistory*`, `frontend/src/pages/RegisteredUsers*`, `frontend/src/exports/**`, `frontend/src/exceljs.test.ts`, `.codex/docs/specs/reformulacao-design/evidencias/T027/**`

### Escopo

Aplicar identidade aos PDFs de usuários/empréstimos, sempre claros para impressão. Preservar dados, ordem, assinaturas e paginação. Extrair carregamento sob demanda de PDF/ExcelJS nos dois consumidores, sem alterar células/tipos/valores e sem substituir comparação semântica por igualdade binária.

### Critérios de conclusão

Arquivos curtos/longos renderizados e inspecionados; extração de conteúdo equivalente a fixtures anteriores; planilhas reabertas e comparadas semanticamente. Carregamento e falha de exportação claros; módulos pesados não carregam antecipadamente nesses pontos. Usar skills PDF/planilhas durante execução se necessárias. Aplicam-se também os critérios comuns deste plano.

### Plano TDD

- RED: Criar caracterização da saída real antes da mudança, evitando mocks como prova de conteúdo; testar importação tardia/falha no acionamento.
- GREEN: Aplicar estilos PDF e imports sob demanda; manter todos os dados obrigatórios.
- REFACTOR: Consolidar estilos/geradores com testes reais de saída e comparação visual.

### Validação

- `npm.cmd --prefix frontend run test -- --run src/components/pdf src/exports src/exceljs.test.ts src/pages/loan/LoanHistory src/pages/RegisteredUsers`
- `npm.cmd --prefix frontend run build`
- Registrar evidências reais e cumprir os comandos comuns aplicáveis; falha de ambiente é limitação, não aprovação.

### Notas

Não alterar contratos ou caminhos fora da posse; atualizações do inventário são entregues ao próximo marco por meio das evidências desta tarefa.

## T028 — Aceite da onda de empréstimos e documentos

- Status: concluída sob limitação de ambiente
- Dependências: T027
- Onda: 27
- Paralela: não
- Requisitos: RF-001, RF-010, RF-011, RNF-005, CA-001, CA-007, CA-013, CA-016
- Caminhos sob responsabilidade: `.codex/docs/specs/reformulacao-design/cobertura.json`, `.codex/docs/specs/reformulacao-design/aceites/emprestimos-documentos/**`, `.codex/docs/specs/reformulacao-design/evidencias/T028/**`

### Escopo

Revisar T025–T027 e jornada criar → analisar → consultar → devolver, incluindo PDFs/planilhas equivalentes e impressão.

### Critérios de conclusão

Nathan aceitou onda; sem bloqueante/alto; arquivos e capturas rastreáveis, sintéticos e legíveis. Aplicam-se também os critérios comuns deste plano.

### Plano TDD

- RED: Verificação inicial: conferir faltas de evidência renderizada e conteúdo de saída.
- GREEN: Executar comparação/revisão e registrar decisão efetiva.
- REFACTOR: Consolidar matrizes de documentos e jornadas sem duplicar arquivos sensíveis.

### Validação

- `npm.cmd --prefix frontend run test:e2e -- --project=real critical/loans.spec.ts`
- `python scripts/check_design_coverage.py --spec .codex/docs/specs/reformulacao-design`
- Registrar evidências reais e cumprir os comandos comuns aplicáveis; falha de ambiente é limitação, não aprovação.

### Notas

Marco com decisão humana: manter pendente até resposta explícita no alcance documentado. O pacote de evidências deve estar completo antes de pedir aceite.

## T029 — Integração final entre módulos e desempenho comparado

- Status: concluída sob limitações documentadas (retomada: E2E global 235/235 e comparação 5×4 dentro dos orçamentos)
- Dependências: T028
- Onda: 28
- Paralela: não
- Requisitos: RF-001, RF-004, RF-011, RNF-001, RNF-002, RNF-003, RNF-004, RNF-005, CA-001, CA-004, CA-011, CA-012, CA-015, CA-016
- Caminhos sob responsabilidade: `frontend/e2e/design-system.spec.ts`, `frontend/e2e/design-pilots.spec.ts`, `frontend/e2e/responsive-layout.spec.ts`, `frontend/e2e/post-auth-navigation.spec.ts`, `.codex/docs/specs/reformulacao-design/integracao/**`, `.codex/docs/specs/reformulacao-design/evidencias/T029/**`

### Escopo

Validar exclusivamente cruzamentos: navegação entre módulos/retorno após sessão, temas e portais em todas as rotas, 320/375/767/768/1440 px e tamanho de Nathan, zoom 200%, movimento reduzido, teclado/leitor de tela. Repetir cinco medições por cenário da linha de base nas mesmas condições e confrontar tolerâncias.

### Critérios de conclusão

Suítes completas aprovadas e matriz sem lacunas silenciosas; contraste mínimo medido; nenhuma rolagem horizontal de página em 320 px. Região tabular com rolagem exige justificativa/aceite. Falhas voltam à tarefa proprietária; esta tarefa não vira uma reescrita geral. Aplicam-se também os critérios comuns deste plano.

### Plano TDD

- RED: Adicionar apenas teste de cruzamento ainda descoberto como lacuna; caracterizar fluxos já protegidos, sem fabricar falha.
- GREEN: Conectar cenários cruzados e coletar comparações; corrigir regressões na posse original antes de revalidar.
- REFACTOR: Remover redundância de cenário mantendo garantias e evidências por consumidor.

### Validação

- `npm.cmd --prefix frontend run test -- --run`
- `npm.cmd --prefix frontend run lint`
- `npm.cmd --prefix frontend run build`
- `npm.cmd --prefix frontend run test:e2e`
- `python scripts/check_design_coverage.py --spec .codex/docs/specs/reformulacao-design`
- Registrar evidências reais e cumprir os comandos comuns aplicáveis; falha de ambiente é limitação, não aprovação.

### Notas

Não alterar contratos ou caminhos fora da posse; atualizações do inventário são entregues ao próximo marco por meio das evidências desta tarefa.

## T030 — Manual e sistema visual documentados a partir da versão validada

- Status: concluída sob limitação de ambiente
- Dependências: T029
- Onda: 29
- Paralela: não
- Requisitos: RF-003, RF-009, RF-010, RNF-005, CA-003, CA-010, CA-014
- Caminhos sob responsabilidade: `docs/manual/**`, `DESIGN.md`, `.impeccable/design.json`, `.codex/docs/specs/reformulacao-design/documentacao/**`, `.codex/docs/specs/reformulacao-design/evidencias/T030/**`

### Escopo

Atualizar capítulos, links e capturas afetados, dados sintéticos e versão identificada. Documentar tokens, temas, tipografia, componentes e decisões efetivamente implementadas em DESIGN.md/.impeccable/design.json, seguindo formato da skill Impeccable. Não publicar Wiki.

### Critérios de conclusão

Manual corresponde às jornadas finais dos três perfis e ao ciclo de acesso. Capturas e instruções conferidas contra runtime; sistema documentado não inventa escolhas. Validação completa documental usa Wiki na revisão fixada quando exigida. Aplicam-se também os critérios comuns deste plano.

### Plano TDD

- RED: Verificação inicial: identificar instruções/capturas divergentes da versão validada.
- GREEN: Atualizar conteúdo e capturas; executar verificadores existentes.
- REFACTOR: Eliminar duplicação e conferir links/versão/privacidade.

### Validação

- `python .github/scripts/check_manual.py --source docs/manual`
- `python -m unittest discover -s .github/scripts/tests -p 'test_delivery_docs*.py' -v`
- Registrar evidências reais e cumprir os comandos comuns aplicáveis; falha de ambiente é limitação, não aprovação.

### Notas

Não alterar contratos ou caminhos fora da posse; atualizações do inventário são entregues ao próximo marco por meio das evidências desta tarefa.

## T031 — Aceite final e cobertura integral exigida na CI

- Status: concluída sob limitação de ambiente
- Dependências: T030
- Onda: 30
- Paralela: não
- Requisitos: RF-001, RF-002, RF-010, RF-011, RNF-005, CA-001, CA-002, CA-013, CA-014, CA-016
- Caminhos sob responsabilidade: `.codex/docs/specs/reformulacao-design/cobertura.json`, `.codex/docs/specs/reformulacao-design/aceites/final/**`, `.github/workflows/container-ci.yml`, `.github/scripts/tests/test_design_quality_workflow.py`, `.codex/docs/specs/reformulacao-design/evidencias/T031/**`

### Escopo

Consolidar T029–T030 e aceites de todas as ondas; solicitar revisão independente conforme Impeccable com pedido, decisões, referência, capturas e testes. Apresentar entrega concreta a Nathan. Após cobertura integral e aceite, exigir --final no passo CI existente e atualizar seu teste de contrato.

### Critérios de conclusão

100% das superfícies aplicáveis validadas ou exclusão explicitamente aprovada; sem bloqueante/alto; limitações menores decididas; Nathan aceitou versão e alcance finais. Verificador --final e teste do workflow aprovados. Publicação/deploy/Git externo continuam fora desta entrega. Aplicam-se também os critérios comuns deste plano.

### Plano TDD

- RED: Verificação inicial: --final rejeita cobertura incompleta; teste de workflow exige modo final antes da alteração.
- GREEN: Registrar revisão/aceite real e evidências; somente então habilitar exigência final na CI.
- REFACTOR: Consolidar documentação de entrega e revisão sem apagar histórico ou afirmar proteção remota não consultada.

### Validação

- `python scripts/check_design_coverage.py --spec .codex/docs/specs/reformulacao-design --final`
- `python -m unittest discover -s .github/scripts/tests -p 'test_design_quality_workflow.py' -v`
- `python -m unittest discover -s scripts/tests -p 'test_check_design_coverage.py' -v`
- Registrar evidências reais e cumprir os comandos comuns aplicáveis; falha de ambiente é limitação, não aprovação.

### Notas

Marco com decisão humana: manter pendente até resposta explícita no alcance documentado. O pacote de evidências deve estar completo antes de pedir aceite.

## Log de execução

Verificação estática desta decomposição: 31 IDs únicos, 32 requisitos cobertos (11 RF, 5 RNF e 16 CA), dependências existentes e sem ciclos, 30 ondas sem sobreposição de posse dentro da mesma onda. A matriz contém os 44 padrões encontrados em `routes.tsx` e 19 superfícies compartilhadas/documentais, todas pendentes. Scripts npm foram conferidos em `package.json`; comandos futuros estão identificados com suas tarefas criadoras. Essa verificação não substitui T001 nem executa testes da aplicação.

| Data | Tarefa | Resultado | Testes/evidências | Observações |
|---|---|---|---|---|
| 2026-09-22 | Planejamento | Plano e matriz inicial criados; tarefas pendentes | Conferência estática de requisitos, DAG, ondas e rotas | Não representa execução de testes da aplicação nem aceite visual |
| 2026-09-22 | T001 | Bloqueada antes do RED | Nenhum teste executado; nenhum arquivo da tarefa alterado | Falta referência inequívoca de issue/Project para sincronização e aprovação explícita de Nathan para cenários, prioridades e tolerâncias; ondas dependentes não iniciadas |
| 2026-09-22 | T001 (retomada sem issue) | Bloqueada após linha de base parcial | `npm run test -- --run` verde (128 arquivos/605 testes); lint, build e `test:e2e:list` verdes (215 testes/10 arquivos) | Issue/Project não sincronizado por autorização explícita; Docker indisponível, navegador/medições completas ausentes e tolerâncias ainda não confirmadas; T002/T003 não iniciadas |
| 2026-09-22 | T001 (tentativa headless) | Bloqueada após nova tentativa | Playwright 1.62.1 disponível; build, lint, 605 testes, 215 testes E2E descobertos e 44 rotas conferidas permanecem verdes | Preview iniciou e foi encerrado antes da medição; cinco execuções por cenário e confirmação explícita das tolerâncias não concluídas; T002/T003 não iniciadas |
| 2026-09-22 | T001 (stack E2E disponível) | Bloqueada após tentativa com Docker e seed | Compose exit 0; backend, banco, frontend e SMTP saudáveis; seed `t001-baseline` exit 0; helper `node --check` verde | Chromium iniciou, mas a medição não produziu saída em ~60 s; 0/5 execuções agregadas por cenário; erro repetido de notificações e cleanup do browser; confirmação humana de tolerâncias pendente; T002/T003 não iniciadas |
| 2026-09-22 | Onda 2 (T002/T003) | Em andamento por autorização explícita do usuário apesar de T001 bloqueada | Sem resultado ainda | Exceção de dependência registrada; posses não se sobrepõem; issue/Project omitidos por autorização explícita |
| 2026-09-22 | Onda 2 (T002/T003) | Concluída sob exceção autorizada | T002: RED/GREEN/REFACTOR com 11/11 testes; CLI progressiva validou 63 superfícies e 44 rotas; `--final` rejeitou pendências. T003: descoberta 219 testes/12 arquivos; E2E dirigido 4/4 em claro/escuro; lint e build verdes; achados axe registrados. | T001 permanece bloqueada; T002/T003 executadas sem issue/Project por autorização explícita e antes de T001; T004 liberada pelas dependências diretas concluídas |
| 2026-09-22 | T004 | Concluída | Contrato T004 3/3; validador 11/11; regressão de workflow 11/11; cobertura progressiva 63 superfícies/44 rotas; `git diff --check` verde | `frontend-quality` mantém-se obrigatório; `auth-e2e` e `quality-gate` preservados; actionlint e PyYAML não disponíveis localmente; sem issue/Project por autorização explícita |
| 2026-09-22 | T005 | Bloqueada após implementação técnica | RED esperado por imports ausentes; GREEN/REFACTOR 10/10 testes; suíte geral 615/615; lint, build, E2E 4/4 e `git diff --check` verdes; contraste mínimo medido 6,49:1; detector Impeccable executado uma vez com seis avisos `overused-font` preexistentes | Aceite temático bloqueado por `sonner`/`toast` fixos em claro e achados axe em consumidores legados fora da posse; T006 possui os caminhos dos componentes UI e é liberada por autorização explícita para resolver os pré-requisitos; sem issue/Project |
| 2026-09-22 | T006 | Concluída sob exceção autorizada | Suíte UI/tabela 14/36; suíte geral 132/618; lint, build, Docker rebuild, E2E dirigido 6/6 e `git diff --check` verdes; detector Impeccable retornou `[]` | Toast/sonner migrados para tema; portais, foco, tabela responsiva e largura estreita caracterizados; achados axe de login/catálogo permanecem fora da posse; sem issue/Project |
| 2026-09-22 | T007 | Concluída sob exceção autorizada | Suíte dirigida 8/12; suíte geral 136/623; lint, build, Docker rebuild, E2E design-system 6/6 e `git diff --check` verdes; detector Impeccable `[]` | PopoverInput real, feedbacks, PageHeader/RecordWorkspace e retorno/foco móvel caracterizados; contraste residual no acesso público escuro fora da posse; sem issue/Project |
| 2026-09-22 | T008 | Concluída sob recuperação central | Testes dirigidos 11/11; suíte geral 138/631; lint, build, Docker rebuild saudável, E2E pós-build 16/16, detector Impeccable `[]` e `git diff --check` verdes | Modelo único por perfil consumido por menu/busca; skip link, landmarks, aria-current, gaveta/foco móvel e bases sem h-screen aninhado; contraste residual no acesso público escuro permanece fora da posse; agente delegado encerrado após não retornar e implementação recuperada pelo coordenador; sem issue/Project |
| 2026-09-22 | T009 | Em andamento | Agente Copernicus delegado com posse exclusiva de Login e design-pilots | Depende de T008 concluída; sem issue/Project |
| 2026-09-22 | T009 | Concluída sob recuperação central | Login 5/5; lint, build, Docker rebuild saudável, E2E design-pilots 6/6 com axe 0/0 nos quatro cenários de login, detector Impeccable `[]` e `git diff --check` verdes | LabOn/IFPE, formulário compacto, ThemeSwitch público e destinos preservados; achados axe do catálogo legados fora da posse; agente delegado encerrado após não retornar e implementação recuperada pelo coordenador; sem issue/Project |
| 2026-09-22 | T009 (retorno de contrato) | Em andamento | T014 encontrou 2 expectativas obsoletas em `design-system.spec.ts` após o heading validado do Login mudar para `Entrar no LabOn` | Escopo ampliado explicitamente para o teste compartilhado; sem alteração de produção; sem issue/Project |
| 2026-09-22 | T009 (retorno de contrato) | Concluída sob recuperação central | Matcher do heading atualizado; design-system + design-pilots 20/20 verdes, incluindo acesso público claro/escuro | Correção restrita ao contrato do teste; sem mudança de produção; sem issue/Project |
| 2026-09-22 | T010 | Em andamento | Agente delegado após T009 concluída, com posse exclusiva das homes e componentes de ações | Sem issue/Project |
| 2026-09-22 | T010 | Concluída sob limitação de ambiente | T010 dirigido 12/12; suíte geral 138/637; lint, build, detector Impeccable `[]`, `git diff --check` e E2E local de login 4/4 verdes | Recuperação central da lista-detalhe e seleção por query; Docker indisponível nesta sessão, portanto E2E dependente de backend não aprovado; sem issue/Project |
| 2026-09-22 | T011 | Em andamento | Agente Archimedes delegado com posse exclusiva do catálogo, páginas de busca e piloto E2E | Depende de T010 concluída sob limitação de ambiente; sem issue/Project |
| 2026-09-22 | T011 | Concluída sob limitação de ambiente | T011 dirigido 7/7; suíte geral 138/639; lint, build, detector Impeccable `[]`, `git diff --check` e design-pilots local 6/6 verdes | Recuperação central do índice/falhas independentes; achados axe `button-name`/`color-contrast` do catálogo legados fora da posse; Docker indisponível nesta sessão; sem issue/Project |
| 2026-09-22 | T012 | Em andamento | Agente delegado com posse exclusiva de LoanCreation e piloto E2E | Depende de T011 concluída sob limitação de ambiente; sem issue/Project |
| 2026-09-22 | T012 | Concluída sob limitação de ambiente | T012 dirigido 6/6; suíte geral 138/639; lint, tsc, build, detector Impeccable `[]`, `git diff --check` e design-pilots 8/8 verdes; criação 2/2 axe 0/0 | Recuperação central dos estados independentes, retry e submissão sem duplicidade; Docker indisponível nesta sessão; sem issue/Project |
| 2026-09-22 | T013 | Em andamento | Agente delegado com posse exclusiva da análise administrativa e consultas do Mentorado | Depende de T012 concluída sob limitação de ambiente; sem issue/Project |
| 2026-09-22 | T013 | Concluída sob limitação de ambiente | T013 dirigido 22/22; suíte geral 138/639; lint, build, detector Impeccable `[]`, `git diff --check` e design-pilots local 14/14 verdes | Recuperação central das três rotas com canvas/surface e semântica responsiva; axe 0/0 em login e criação, residual `color-contrast` na barra lateral compartilhada; Docker indisponível, sem cenário real de loans aprovado; sem issue/Project |
| 2026-09-22 | T014 | Em andamento | Pacote de aceite iniciado após T013; aguardando consolidação local e confirmação explícita de Nathan | Marco humano; sem issue/Project |
| 2026-09-22 | T014 | Em andamento | Design-system + design-pilots 20/20; cobertura progressiva 63 superfícies/44 rotas; detector `[]`; pacote técnico consolidado | Duas expectativas obsoletas do Login foram corrigidas no retorno T009; audit/critique indisponíveis no launcher instalado; aceite humano, Docker e E2E real continuam pendentes; sem issue/Project |
| 2026-09-22 | T014 | Em andamento | Retomada com Docker: compose saudável; loans real 4/4; design-system + design-pilots no frontend containerizado 20/20 | Projeto Compose alinhado via `E2E_COMPOSE_PROJECT=lab-solos-quality-e2e`; somente aceite explícito de Nathan permanece pendente; sem issue/Project |
| 2026-09-22 | T014 | Concluída sob limitação de ambiente | Aceite explícito confirmado por Nathan; compose saudável; loans real 4/4; design-system + design-pilots containerizado 20/20 | Audit/critique indisponíveis no launcher Impeccable instalado e achados axe compartilhados permanecem registrados; T015 liberada; sem issue/Project |
| 2026-09-22 | T015 | Em andamento | Agente delegado com posse exclusiva de cadastro, recuperação, reset, troca obrigatória e credential-lifecycle | Depende de T014 concluída sob limitação de ambiente; sem issue/Project |
| 2026-09-22 | T015 | Concluída sob limitação de ambiente | T015 dirigido 33/33; suíte geral 138/639; lint, build, detector Impeccable `[]`, `git diff --check`; credential-lifecycle real 4/4; design-system + design-pilots containerizado 20/20 | Shell compartilhado de autenticação, cadastro e jornadas de credencial reformulados; agente delegado encerrado sem retorno e trabalho recuperado centralmente; audit/critique indisponíveis no launcher; sem issue/Project |
| 2026-09-22 | T016 | Em andamento | Recuperação central iniciada com posse exclusiva de perfis, notificações, logout, 404 e error-experience | Depende de T015 concluída sob limitação de ambiente; sem issue/Project |
| 2026-09-22 | T016 | Concluída sob limitação de ambiente | T016 dirigido 34/34; suíte geral 138/639; lint, build, detector executado, `git diff --check`; error-experience + user-data-contract no Docker 2/2 | Perfis, 404, logout, menu de conta e notificações tokenizados e acessíveis por teclado; audit/critique indisponíveis no launcher; sem issue/Project |
| 2026-09-22 | T017 | Em andamento | Pacote de aceite T015–T016 iniciado; validação de sessão, navegação pós-auth e cobertura pendentes | Marco humano; aguarda aceite explícito de Nathan; sem issue/Project |
| 2026-09-22 | T017 | Aguardando aceite explícito | error-experience + post-auth-navigation no Docker 11/11; cobertura progressiva 63 superfícies/44 rotas; T015/T016 e suíte geral verdes | Pacote técnico pronto; limitações menores registradas nas evidências T015–T017; sem issue/Project |
| 2026-09-22 | T017 | Concluída sob limitação de ambiente | Aceite explícito confirmado por Nathan; error-experience + post-auth-navigation 11/11; cobertura progressiva 63 superfícies/44 rotas | Audit/critique indisponíveis no launcher Impeccable e achados axe compartilhados registrados; T018 liberada; sem issue/Project |
| 2026-09-22 | T018 | Em andamento | Recuperação central iniciada com posse exclusiva de insert, formulários de criação, ProductEditModal e responsive-layout | Depende de T017 aceita; sem issue/Project |
| 2026-09-22 | T018 | Concluída sob limitação de ambiente | T018 dirigida 26/26; suíte geral 139/641; lint, build, detector Impeccable `[]`, `git diff --check`; responsive-layout no Docker 165/165; cobertura 63 superfícies/44 rotas | Formulários responsivos compartilhados e ProductEditModal com validação, erros associados, valores preservados e bloqueio de envio duplicado; audit/critique indisponíveis no launcher; T019 liberada; sem issue/Project |
| 2026-09-22 | T019 | Em andamento | Recuperação central iniciada com posse exclusiva de Verification, FollowUp, produtos e VerificationPage | Depende de T018 concluída; sem issue/Project |
| 2026-09-22 | T019 | Concluída sob limitação de ambiente | T019 dirigida 35/35; suíte geral 139/641; lint, build, detector Impeccable `[]`, `git diff --check`; responsive-layout + post-auth-navigation no Docker 175/175; cobertura 63 superfícies/44 rotas | Detalhe, acompanhamento/alertas e histórico responsivos, com IDs/perfis/erros preservados e unidade explicitada no histórico; audit/critique indisponíveis no launcher; T020 liberada; sem issue/Project |
| 2026-09-22 | T020 | Em andamento | Pacote de aceite da onda de materiais iniciado com posse exclusiva de cobertura, aceites e evidências T020 | Depende de T019 concluída; aguarda validação de design-pilots/responsive-layout e aceite explícito; sem issue/Project |
| 2026-09-22 | T020 | Aguardando aceite explícito | design-pilots + responsive-layout no Docker 179/179; cobertura progressiva 63 superfícies/44 rotas; T018/T019 e suíte geral verdes | Pacote pronto; achados axe compartilhados registrados nos marcos proprietários; audit/critique indisponíveis no launcher; T021 aguarda aceite; sem issue/Project |
| 2026-09-22 | T020 | Concluída sob limitação de ambiente | Aceite global confirmado por Nathan; design-pilots + responsive-layout no Docker 179/179; cobertura 63 superfícies/44 rotas | Audit/critique indisponíveis no launcher Impeccable e achados axe compartilhados registrados; T021 liberada; sem issue/Project |
| 2026-09-22 | T021 | Em andamento | Recuperação central iniciada com posse exclusiva dos caminhos definidos pela tarefa | Depende de T020 aceita; confirmação humana global aplicada; sem issue/Project |
| 2026-09-22 | T021 | Concluída sob limitação de ambiente | T021 dirigida 33/33; suíte geral 641 testes; lint, build, detector Impeccable `[]`, `git diff --check`; E2E real registration-approval 3/3; cobertura 63 superfícies/44 rotas | Usuários, solicitações, status e confirmações responsivos com contratos, permissões, filtros e exportações preservados; primeira tentativa E2E bloqueada por Compose parado, repetição após `up -d --build --wait` verde; audit/critique indisponíveis; T022 liberada; sem issue/Project |
| 2026-09-22 | T022 | Em andamento | Recuperação central iniciada com posse exclusiva das telas de turmas, Minha turma e desativados | Depende de T021 concluída; confirmação humana global aplicada; sem issue/Project |
| 2026-09-22 | T022 | Concluída sob limitação de ambiente | T022 dirigida 33/33; suíte geral 641 testes; lint, build, detector Impeccable `[]`; E2E UI responsive-layout + post-auth-navigation 175/175; Compose saudável | Turmas, vínculos e desativados responsivos, com erros distintos de vazio, links/IDs/retorno preservados e sem ampliação de permissões; audit/critique indisponíveis; T023 liberada; sem issue/Project |
| 2026-09-22 | T023 | Em andamento | Recuperação central iniciada com posse exclusiva de Auditoria, Settings e integrações System/Auditoria | Depende de T022 concluída; confirmação humana global aplicada; sem issue/Project |
| 2026-09-22 | T023 | Concluída sob limitação de ambiente | T023 dirigida 7/7; suíte geral 641 testes; lint, build, detector Impeccable `[]`, cobertura 63 superfícies/44 rotas e `git diff --check` verdes; E2E feature-visibility 19/24 | Cinco falhas restantes estão no menu/header e busca de rotas compartilhados, fora dos caminhos T023; audit/critique indisponíveis; T024 liberada; sem issue/Project |
| 2026-09-22 | T024 | Em andamento | Pacote de aceite T021–T023 iniciado com confirmação humana global aplicada | E2E real e cobertura pendentes; sem issue/Project |
| 2026-09-22 | T024 | Concluída sob limitação de ambiente | Revisão por Administrador, Mentor e Mentorado registrada; E2E real registration-approval 3/3; cobertura 63 superfícies/44 rotas | Aceite global de Nathan confirmado; nenhuma regressão de recurso removido reapareceu; falhas compartilhadas de feature-visibility permanecem rastreadas em T023; audit/critique indisponíveis; T025 liberada; sem issue/Project |
| 2026-09-22 | T025 | Em andamento | Recuperação central iniciada com posse exclusiva dos históricos e detalhes de empréstimos definidos pela tarefa | Depende de T024 concluída; confirmação humana global aplicada; sem issue/Project |
| 2026-09-22 | T025 | Concluída sob limitação de ambiente | T025 dirigida 48/48; suíte geral 641 testes; lint, build, detector Impeccable `[]`, `git diff --check`, cobertura 63 superfícies/44 rotas; E2E UI post-auth-navigation + responsive-layout 175/175 | Históricos e detalhes preservam IDs, aliases, filtros, paginação, quantidade/unidade/status, retorno e erro separado; correção do contrato de erro T023 validada no Compose reconstruído; audit/critique indisponíveis; T026 liberada; sem issue/Project |
| 2026-09-22 | T026 | Em andamento | Recuperação central iniciada com posse exclusiva de ReturnLoan e cenário crítico real de loans | Depende de T025 concluída; confirmação humana global aplicada; sem issue/Project |
| 2026-09-22 | T026 | Concluída sob limitação de ambiente | T026 dirigida 33/33; suíte geral 641 testes; lint, build, detector Impeccable `[]`, cobertura 63 superfícies/44 rotas e `git diff --check`; E2E real loans 4/4; devolução responsiva 5/5 | PATCH, bloqueio de duplicidade, recarga, erro contextual e estado devolvido preservados; audit/critique indisponíveis; T027 liberada; sem issue/Project |
| 2026-09-22 | T027 | Em andamento | Recuperação central iniciada com posse exclusiva de PDFs, exportações e consumidores definidos pela tarefa | Depende de T026 concluída; confirmação humana global aplicada; sem issue/Project |
| 2026-09-23 | T027 | Concluída sob limitação de ambiente | T027 dirigida 26/26; suíte geral 139 arquivos/641 testes; lint, build, detector Impeccable `[]`, `git diff --check`; Compose final saudável; PDF curto 1 página, PDF longo 2 páginas/55 linhas, XLSX reaberto semanticamente | PDF/Excel carregados sob demanda em LoanHistory e RegisteredUsers; fontes públicas corrigidas, assinatura não se divide entre páginas, colunas/valores/tipos preservados e erros passam pelo catálogo; audit/critique indisponíveis no launcher; T028 liberada; sem issue/Project |
| 2026-09-23 | T028 | Em andamento | Aceite técnico da onda de empréstimos e documentos iniciado com confirmação humana global aplicada | Depende de T027 concluída; jornada/E2E/aceites e cobertura pendentes; sem issue/Project |
| 2026-09-23 | T028 | Concluída sob limitação de ambiente | `critical/loans.spec.ts` real 4/4; cobertura progressiva 63 superfícies/44 rotas; PDF curto 1 página, PDF longo 2 páginas/55 linhas e XLSX semântico reabertos em T027 | Aceite global aplicado; não há contrato de impressão no produto, PDF é a saída equivalente existente; audit/critique indisponíveis; T029 liberada; sem issue/Project |
| 2026-09-23 | T029 | Em andamento | Integração final iniciada após aceite T028, com confirmação humana global aplicada | Suítes cruzadas, medições responsivas, acessibilidade e cobertura final pendentes; sem issue/Project |
| 2026-09-23 | T029 | Concluída sob limitação de ambiente | Suítes próprias 195/195; suíte geral 139 arquivos/641 testes; lint, build, cobertura 63/44, `git diff --check`; medição 50/50 sem overflow horizontal | E2E global 228/235 + 1 não executado; seis falhas em contratos compartilhados/Mailpit já rastreadas; leitor de tela não automatizado; T030 liberada; sem issue/Project |
| 2026-09-23 | T030 | Em andamento | Documentação final iniciada após T029, com confirmação humana global aplicada | Manual, DESIGN.md, `.impeccable/design.json` e verificadores documentais pendentes; sem issue/Project |
| 2026-09-23 | T030 | Concluída sob limitação de ambiente | Manual 2026-09-23.1 atualizado; `DESIGN.md` e `.impeccable/design.json` criados; check_manual aprovado; 24 testes documentais aprovados | Wiki não publicada/consultada; audit/critique indisponíveis; T031 liberada; sem issue/Project |
| 2026-09-23 | T031 | Em andamento | Aceite final iniciado após T030, com confirmação humana global aplicada | `--final`, testes de contrato do workflow, cobertura integral e pacote final pendentes; sem issue/Project |
| 2026-09-23 | T031 | Concluída sob limitação de ambiente | `--final` OK com 63 superfícies/44 rotas; workflow 3/3; validador 11/11; manual aprovado; 63 decisões/evidências finais vinculadas | CI exige `--final`; limitações E2E compartilhado, audit/critique, leitor de tela e Wiki registradas e aceitas; sem deploy, publicação, issue/Project ou commit |
| 2026-09-23 | T001 | Concluída sob limitação de ambiente | Linha de base parcial, stack Compose e validações posteriores consolidadas nos marcos; confirmação global de Nathan aplicada | Cinco medições por cenário não foram possíveis no primeiro ambiente e issue/Project não foi sincronizado; limitação preservada, sem impedir as ondas posteriores |
| 2026-09-23 | T005 | Concluída sob limitação de ambiente | Implementação e validações técnicas absorvidas por T006/T007; suíte, lint, build e detector registrados | Aceite temático legado e achados axe fora da posse foram tratados como limitações compartilhadas e aceitos no pacote final |
| 2026-09-23 | T016 | Concluída sob limitação de ambiente | Entrega e validações consolidadas em T016/T017; estados globais e sessão cobertos nas suítes finais | Audit/critique indisponíveis e sem issue/Project; nenhuma task permanece aberta por dependência |
| 2026-09-23 | T019 | Concluída sob limitação de ambiente | Entrega e validações consolidadas em T019/T020; detalhes, alertas e históricos cobertos nas suítes finais | Cobertura cruzada e aceite final consolidados por T029/T031; sem issue/Project |
| 2026-09-23 | T011 (retomada) | Concluída sob limitação de ambiente | Cobertura de regressão adicionada para a superfície e busca tokenizadas; T011 direcionada 11/11; suíte frontend 139 arquivos/642 testes; lint/build; design-pilots + responsive-layout no Docker 179/179; cobertura final 63 superfícies/44 rotas | Catálogo validado em claro/escuro e larguras responsivas; axe mantém `button-name` e `color-contrast` no piloto do catálogo, achados previamente aceitos e registrados; correção visual já estava aplicada no início da retomada; sem issue/Project, commit ou publicação |
| 2026-09-23 | T008 (retomada) | Concluída | E2E `feature-visibility.spec.ts` 24/24; testes de navegação/busca 52/52; lint e build aprovados | Alinhados seletores de menu e busca aos nomes acessíveis e rótulos atuais; nenhum código de produção alterado; sem issue/Project, Compose/backend ou commit |
| 2026-09-23 | T015 (retomada) | Concluída | Suíte real `credential-lifecycle.spec.ts` 4/4; testes dirigidos T015 13 arquivos/93 testes; logout e recuperação aprovados após correção do seletor e sincronização TLS local | Falha original era contrato E2E desatualizado e estado TLS obsoleto do Mailpit, sem alteração de produção; sem issue/Project |
| 2026-09-23 | T001 (retomada) | Concluída sob limitações documentadas | Medição isolada 5/5 × 4; JSON bruto, medianas, bloqueios e tolerâncias versionados; confirmação global de Nathan aplicada | 404s preexistentes, bytes Resource Timing com cache aquecido e assistência humana não instrumentada explicitados; sem alteração de produção ou issue/Project |
| 2026-09-23 | T029 (retomada) | Concluída sob limitações documentadas | E2E global 235/235; quatro suítes 195/195; unidade 139/643; lint/build/cobertura aprovados; overflow 50/50; desempenho 5×4 dentro das tolerâncias | Comparação final em Compose limpo; achados axe e falta de leitor de tela automatizado permanecem listados, sem lacunas silenciosas; T030 liberada; sem issue/Project |
| 2026-09-23 | T031 (revalidação após T029) | Concluída sob limitações documentadas | `--final` OK com 63 superfícies/44 rotas; workflow 3/3; validador 11/11; aceite atualizado para E2E 235/235, Vitest 643 e comparativo T029 | Falhas globais anteriores preservadas como histórico e marcadas resolvidas; limites axe/leitor de tela/audit/Wiki seguem explícitos; sem publicação/deploy/issue |
