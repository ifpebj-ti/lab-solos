# Tarefas — Aumentar a cobertura de branches para 80%

- Status: T001–T014, T016–T031 concluídas; T015 e T032–T034 em andamento
- PRD: [Aumento da cobertura de branches para 80%](./prd.md)
- Especificação técnica: [Aumento da cobertura de branches para 80%](./techspec.md)
- Atualizado em: 2026-11-26

A meta de conclusão é atingir 80% de branches em cada módulo. Frontend continua usando seu JSON oficial; backend usa `summary.coveredbranches/summary.totalbranches` do `Summary.json` no artefato HTML, agregando todos os assemblies. A decisão do gate e o JSON de backend devem repetir essa mesma contagem; o gate permanece em 70% por módulo e compara a razão sem arredondamento. No run mais recente desta PR com artefatos backend válidos (`45776498924`, tentativa 1), frontend ficou em 2833/3525 branches (80,37%) e backend em 2802/3610 (77,62% pela razão exata das contagens); JSON do gate e `Summary.json` coincidem. Todos os checks do Container CI passaram. Para alcançar 80% backend são necessários 2888 branches cobertos, restando 86. Essa medição do artefato, e não linhas ou a antiga cobertura normalizada, é a referência de seleção e conclusão das tarefas restantes. Não alterar o escopo do ReportGenerator, filtros ou exclusões para obter o percentual.

## Ondas de execução

| Onda | Tarefas | Motivo de segurança do paralelismo |
| ---- | ------- | --------------------------------- |
| 1 | T001 | Alinha a fonte do gate/backend JSON ao HTML e registra a baseline que orienta todos os testes. |
| 2 | T002–T013, T014 | Cada tarefa cobre caminhos de teste próprios; a tarefa documental usa README e o checkout separado da Wiki. Todas dependem de T001. |
| 3 | T016–T019 | Tarefas focais concluídas; o primeiro artefato integrado mostrou que o backend ainda está abaixo da meta. |
| 4 | T020, T022 | T020 concluída; T022 compilada, mas aguardando execução do fixture PostgreSQL na CI. |
| 5 | T023 | Cenário de status inválido compilado; execução do harness aguardando CI por indisponibilidade local do Docker. |
| 6 | T024, T025 | T025 concluída; T024 compilada e aguardando execução do fixture PostgreSQL na CI. |
| 7 | T015, T021–T024 | Revalidar a PR, medir os dois módulos e confirmar o gate de 70%; as integrações foram validadas pela CI. |
| 8 | T026–T028 | Aumentar branches backend remanescentes em arquivos de teste distintos; comparar o próximo `Summary.json` oficial e recalcular a lacuna antes de abrir outra onda. |
| 9 | T029–T031 | Priorizar os maiores gaps observados no run 10 em arquivos sem sobreposição; medir outra vez pelo `Summary.json` da CI antes de definir novas tarefas. |
| 10 | T032–T034 | Testes unitários em três arquivos distintos, sem fixture PostgreSQL compartilhada; usar diretórios de artefato separados e confirmar a cobertura agregada no próximo `Summary.json`. |

## T001 — Alinhar a medição do gate backend ao artefato e fixar a baseline

- Status: concluída
- Issue: #512
- Dependências: nenhuma
- Paralela: não
- Requisitos: RF-002, RF-004, RF-005, RNF-002, CA-001, CA-003, CA-006
- Caminhos sob responsabilidade: `.github/workflows/container-ci.yml`, `.github/scripts/collect_backend_coverage.py`, `.github/scripts/tests/test_collect_backend_coverage.py`, `.github/scripts/tests/test_container_ci_workflow.py`, `.codex/docs/specs/aumento-cobertura-branches-80/evidencias/baseline.md`

### Escopo

Confirmar a execução oficial mais recente da Container CI em `develop` e registrar SHA, run, tentativa, contagens e percentuais. Para backend, usar as contagens de branch `coveredbranches/totalbranches` de `backend-html-coverage/Summary.json`. Gerar o JSON backend usado pelo gate e pelos badges a partir desse sumário, depois de gerar o HTML; manter a decisão exata de 70% e a razão sem arredondamento. Frontend mantém sua fonte atual. A alteração local do workflow e do coletor já foi aplicada; concluir a tarefa atualizando os testes de contrato/workflow e a evidência de baseline.

O run #45727800901 no SHA `df1d55f1f0bb88f0a88d792a40efe010d75efe1a` mostra frontend em 2708/3525 (76,82%) e backend HTML em 2521/3610 (69,8%). O JSON normalizado antigo dizia 1540/1680 (91,67%) por filtrar/deduplicar outro escopo e deixa de ser a medida oficial do backend. Esses números orientam a seleção inicial; T001 deve confirmar o run mais recente antes de fixar os casos.

### Critérios de conclusão

- Os valores oficiais atuais estão registrados separadamente por módulo, ligados ao SHA, `run_id` e `run_attempt` de origem; backend usa o `Summary.json` do artefato HTML.
- O backend JSON usado pelo gate/badges reproduz exatamente `coveredbranches/totalbranches` do HTML, agregando todos os assemblies que aparecem nele e sem filtro adicional; mantém identidade de execução schema v2 e sumário inválido reprova a coleta.
- O checker mantém 70%, usa razão não arredondada, e cobertura de linhas permanece informativa. O run citado reprova backend em 69,8%, corretamente.

### Plano de validação

- Localizar uma execução com `gh run list --repo ifpebj-ti/lab-solos --workflow container-ci.yml --branch develop --limit 10`.
- Baixar `coverage-html` e `backend-html-coverage` com `gh run download <run-id> --repo ifpebj-ti/lab-solos --dir .tmp/coverage-baseline/<run-id>`.
- Conferir `frontend-coverage` e `backend-html-coverage/Summary.json`; comparar `summary.coveredbranches/totalbranches` com `summary/backend-coverage.json` no artefato combinado e os metadados de SHA/run/tentativa do `coverage-index.html`.
- Executar os testes unitários do coletor e de contrato do workflow depois de atualizá-los para a fonte ReportGenerator.
- Executar `git diff --check -- .codex/docs/specs/aumento-cobertura-branches-80/evidencias/baseline.md`.

### Notas

Os relatórios HTML por arquivo servirão para selecionar os comportamentos não cobertos nas tarefas T002–T013. Na baseline consultada, ambos os módulos estão abaixo de 80%, e backend também fica abaixo do gate exato de 70%; priorizar seu avanço sem perder as lacunas frontend.

## T002 — Cobrir branches relevantes do cadastro de produtos químicos

- Status: concluída
- Issue: #512
- Dependências: T001
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-002, CA-005
- Caminhos sob responsabilidade: `frontend/src/components/global/forms/create/FormQuimicos.formula.test.tsx`, `frontend/src/components/global/forms/create/FormQuimicos.errors.test.tsx`

### Escopo

Usar o relatório do baseline para selecionar condições relevantes ainda descobertas em `FormQuimicos.tsx`. Estender os testes de fórmula e de erros existentes para exercitar estados e resultados observáveis. O relatório consultado para planejamento registrava 67/84 branches cobertos nesse componente; recalcular antes de escolher os casos. Alterar somente testes; se surgir defeito de produção, registrar e abrir escopo próprio em vez de ocultar a falha.

### Critérios de conclusão

- Os cenários escolhidos correspondem a branches elegíveis não cobertos no baseline e comprovam o comportamento do formulário.
- O relatório local mostra os branches selecionados exercitados, sem exclusões novas nem alterações no componente.
- A suíte focal e a suíte frontend passam.

### Plano TDD

- RED: registrar no relatório a condição escolhida ainda não exercitada; executar os testes atuais e observar que o comportamento pode passar, mas o branch permanece descoberto.
- GREEN: acrescentar um teste de caracterização/regressão para cada comportamento selecionado e executar novamente a suíte focal com cobertura.
- REFACTOR: consolidar fixtures e asserções sem mudar o comportamento e confirmar que os mesmos branches continuam cobertos.

### Validação

- Na pasta `frontend`: `npm run test -- --run --coverage src/components/global/forms/create/FormQuimicos.formula.test.tsx src/components/global/forms/create/FormQuimicos.errors.test.tsx`.
- Conferir as contagens do relatório de cobertura e executar `git diff --check`.

### Notas

## T003 — Cobrir estados e decisões da navegação lateral

- Status: concluída
- Issue: #512
- Dependências: T001
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-002, CA-005
- Caminhos sob responsabilidade: `frontend/src/components/nav-main.test.tsx`, `frontend/src/components/nav-secondary.test.tsx`

### Escopo

Cobrir condições ainda abertas em `nav-main.tsx` e `nav-secondary.tsx`, mantendo a navegação coerente com os estados e papéis já implementados. Reutilizar o teste existente de navegação secundária e criar o teste de navegação principal somente se o baseline confirmar branches relevantes descobertos. O snapshot de planejamento registrava 17/31 branches em `nav-main` e 28/48 em `nav-secondary`; não tratar essas contagens como atuais.

### Critérios de conclusão

- Cada novo cenário corresponde a uma condição relevante observada no código e no relatório de cobertura.
- Os testes provam os itens/estados de navegação esperados sem depender de serviços remotos.
- O relatório local confirma os branches escolhidos cobertos e não há mudanças no gate.

### Plano TDD

- RED: identificar, no baseline, uma decisão ainda não percorrida e observar a lacuna de cobertura com os testes existentes.
- GREEN: acrescentar testes de caracterização nos arquivos sob responsabilidade, usando as fixtures e mocks já adotados pelos testes de navegação.
- REFACTOR: simplificar os casos e conferir que nenhum estado ou papel existente foi alterado.

### Validação

- Na pasta `frontend`: `npm run test -- --run --coverage src/components/nav-main.test.tsx src/components/nav-secondary.test.tsx`.
- Conferir o HTML da cobertura e executar `git diff --check`.

### Notas

## T004 — Cobrir condições da exibição de notificações

- Status: concluída
- Issue: #512
- Dependências: T001
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-002, CA-005
- Caminhos sob responsabilidade: `frontend/src/components/notifications/NotificationIcon.test.tsx`

### Escopo

Criar testes de componente para condições relevantes ainda não cobertas em `NotificationIcon.tsx`, escolhidas a partir do baseline. Seguir os padrões de mock já usados em `NotificationReading.test.tsx` e `integration/Notifications.errors.test.ts`; não duplicar verificações já existentes nem testar implementação interna sem efeito observável.

### Critérios de conclusão

- Os testes exercitam estados visíveis e interações correspondentes às condições selecionadas no relatório.
- Os serviços externos estão isolados por mocks existentes ou locais ao arquivo, sem rede real.
- A cobertura dos branches selecionados aumenta sem alterar código de produção ou critérios do gate.

### Plano TDD

- RED: registrar a condição descoberta e confirmar que os testes atuais não a exercitam.
- GREEN: adicionar testes de caracterização da saída/interação e executar o arquivo focal com cobertura.
- REFACTOR: remover repetição de setup e manter isolamento de dependências.

### Validação

- Na pasta `frontend`: `npm run test -- --run --coverage src/components/notifications/NotificationIcon.test.tsx`.
- Conferir cobertura do arquivo e executar `git diff --check`.

### Notas

## T005 — Cobrir condições do botão de notificações na barra lateral

- Status: concluída
- Issue: #512
- Dependências: T001
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-002, CA-005
- Caminhos sob responsabilidade: `frontend/src/components/notifications/SidebarNotificationButton.test.tsx`

### Escopo

Criar testes focais para condições relevantes ainda não cobertas em `SidebarNotificationButton.tsx`, com base no relatório do baseline. O snapshot consultado para planejamento registrava 24/45 branches cobertos. Validar os estados e ações de usuário observáveis usando dependências simuladas, sem acessar rede ou alterar componentes de produção.

### Critérios de conclusão

- Os testes cobrem condições descobertas e afirmam o comportamento visível ou a ação de navegação correspondente.
- A cobertura local confirma os branches selecionados sem mudanças nos filtros de coleta.
- Nenhuma fixture compartilhada com T004 ou T006 é alterada.

### Plano TDD

- RED: demonstrar que a condição escolhida permanece fora dos testes atuais no relatório de cobertura.
- GREEN: acrescentar teste de caracterização e executar o componente focal com cobertura.
- REFACTOR: reduzir duplicação no arquivo novo e confirmar os mesmos resultados.

### Validação

- Na pasta `frontend`: `npm run test -- --run --coverage src/components/notifications/SidebarNotificationButton.test.tsx`.
- Conferir o relatório local e executar `git diff --check`.

### Notas

## T006 — Cobrir condições do ícone simples de notificações

- Status: concluída
- Issue: #512
- Dependências: T001
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-002, CA-005
- Caminhos sob responsabilidade: `frontend/src/components/notifications/SimpleNotificationIcon.test.tsx`

### Escopo

Criar testes focais para condições observáveis ainda descobertas em `SimpleNotificationIcon.tsx`. Consultar o relatório atualizado e evitar repetir os cenários de leitura cobertos em `NotificationReading.test.tsx`. O snapshot de planejamento registrava 24/45 branches cobertos; confirmar o estado atual antes de definir os casos.

### Critérios de conclusão

- Os testes cobrem comportamentos observáveis de pelo menos uma condição selecionada ainda não coberta, ou todas as condições relevantes identificadas no baseline.
- Mocks permanecem locais ao teste e não dependem de chamadas de rede.
- O relatório mostra a cobertura dos branches selecionados e não há alteração da lógica de produção.

### Plano TDD

- RED: localizar as condições descobertas e registrar que a suíte existente não as exercita.
- GREEN: acrescentar testes de caracterização para os resultados e interações observáveis.
- REFACTOR: alinhar setup e nomes aos testes da pasta de notificações, sem sobreposição com T004/T005.

### Validação

- Na pasta `frontend`: `npm run test -- --run --coverage src/components/notifications/SimpleNotificationIcon.test.tsx`.
- Conferir o relatório local e executar `git diff --check`.

### Notas

## T007 — Cobrir estados e filtros da auditoria administrativa

- Status: concluída
- Issue: #512
- Dependências: T001
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-002, CA-005
- Caminhos sob responsabilidade: `frontend/src/pages/admin/Auditoria.test.tsx`

### Escopo

Usar a cobertura detalhada para localizar condições ainda descobertas em `pages/admin/Auditoria.tsx` e ampliar a suíte existente. Priorizar estados e filtros que tenham resultado observável para a pessoa administradora. O snapshot de planejamento registrava 80/120 branches cobertos; atualizar a leitura no início da tarefa e reaproveitar os padrões de mocks já existentes.

### Critérios de conclusão

- Cada caso adicionado corresponde a uma condição relevante não exercitada no baseline e verifica saída, estado ou chamada esperada.
- Os testes permanecem determinísticos e não acessam serviços reais.
- A cobertura local do arquivo aumenta nos branches escolhidos, sem alteração de código de produção.

### Plano TDD

- RED: documentar no relatório as condições selecionadas ainda não cobertas pela suíte atual.
- GREEN: acrescentar casos focais ao teste de auditoria existente e executar a suíte com cobertura.
- REFACTOR: reutilizar setup existente e manter os cenários independentes entre si.

### Validação

- Na pasta `frontend`: `npm run test -- --run --coverage src/pages/admin/Auditoria.test.tsx`.
- Conferir o HTML de cobertura e executar `git diff --check`.

### Notas

## T008 — Cobrir branches de autenticação e credenciais

- Status: concluída
- Issue: #512
- Dependências: T001
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-002, CA-005
- Caminhos sob responsabilidade: `backend/Tests/Controllers/AuthLoginContractTests.cs`, `backend/Tests/Controllers/AuthChangePasswordTests.cs`, `backend/Tests/Security/CredentialServiceTests.cs`

### Escopo

Usar o HTML backend atualizado para selecionar caminhos condicionais relevantes de `AuthController` e `CredentialService`. A baseline do run #45727800901 apontava 67 branches descobertos no `AuthController` e 60 em `CredentialService`; confirmar contagens no novo run antes de escolher cenários. Cobrir resultados observáveis de login, credenciais e alteração de senha sem editar arquivos de produção ou compartilhar testes com as tarefas T009–T010.

### TDD e validação

- RED: registrar branches do relatório ainda não executados pelos arquivos de teste sob responsabilidade.
- GREEN: acrescentar casos de caracterização/regressão para caminhos de domínio relevantes; executar testes focais e a suíte backend com cobertura.
- REFACTOR: simplificar setup sem remover cenários; confirmar o ganho no `Summary.json` da mesma execução.
- Validar com `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~AuthLoginContractTests|FullyQualifiedName~AuthChangePasswordTests|FullyQualifiedName~CredentialServiceTests"` e comparar a cobertura completa, sem usar o percentual de arquivo isolado como meta.

### Critérios de conclusão

- Os cenários adicionados exercitam branches descobertos e conferem respostas/efeitos relevantes.
- O `Summary.json` do run completo mostra aumento de branches cobertos sem aumento do denominador por exclusões ou mudanças de fonte.

## T009 — Cobrir políticas e proteções de autenticação

- Status: concluída
- Issue: #512
- Dependências: T001
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-002, CA-005
- Caminhos sob responsabilidade: `backend/Tests/Security/AuthenticationProtectionOptionsTests.cs`, `backend/Tests/Security/AuthenticationProtectionTelemetryTests.cs`, `backend/Tests/Integration/AuthenticationProtectionStartupTests.cs`, `backend/Tests/Integration/LoginThrottleTests.cs`, `backend/Tests/Integration/PasswordResetThrottleTests.cs`, `backend/Tests/Integration/SharedAuthenticationThrottleTests.cs`

### Escopo

Selecionar branches ainda descobertos em validação de opções e inicialização de proteção, throttle e política de admissão, conforme o HTML do backend. O run #45727800901 apontava 43 branches descobertos em `AuthenticationProtectionOptionsValidator`, 32 em `AuthenticationProtectionStartupValidator`, 39 em `PostgresAuthenticationThrottle`, 25 em `OperationAdmissionPolicy` e 29 em `PasswordChangeRateLimitService`; atualizar esses dados no baseline. Reaproveitar fixtures existentes e não alterar infraestrutura compartilhada.

### TDD e validação

- RED: relacionar as condições do código aos branches ausentes e confirmar que os testes atuais não os percorrem.
- GREEN: acrescentar cenários de configuração válida/inválida, estados de limitação e falhas relevantes nos arquivos sob responsabilidade.
- REFACTOR: reduzir duplicação mantendo cenários e isolamento existentes.
- Executar os testes focais e o teste completo de backend com cobertura. Os cenários de integração que exigem Docker devem usar o filtro/ambiente existente.

### Critérios de conclusão

- Os testes cobrem caminhos reais das políticas de autenticação sem desabilitar proteções.
- O sumário HTML da suíte completa confirma aumento de branches cobertos no backend.

### Estabilização após CI

O run `45755998172` expôs que o helper `CreateListener` escuta todos os instrumentos do meter global estático. O teste `MapsEveryRemainingDeliveryResultToItsBoundedTag` recebeu a métrica esperada e uma métrica de falha emitida por outra coleção em paralelo. A classe foi isolada em uma coleção xUnit sem paralelismo; os testes de mapeamento agora verificam o instrumento exato e o conjunto completo de tags. Focal: 15/15; análise, compilação com SDK 10.0.401 e `git diff --check` passaram. A confirmação de integração fica no CI seguinte.

## T010 — Cobrir recuperação de senha e entrega assíncrona

- Status: concluída
- Issue: #512
- Dependências: T001
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-002, CA-005
- Caminhos sob responsabilidade: `backend/Tests/Integration/RecoveryJobRepositoryTests.cs`, `backend/Tests/Integration/RecoveryDeliveryWorkerTests.cs`, `backend/Tests/Controllers/PasswordRecoveryTests.cs`, `backend/Tests/Security/RecoveryPayloadProtectorTests.cs`

### Escopo

Usar o relatório por classe para cobrir estados ausentes, expirados, duplicados, inválidos e de falha de entrega em `PasswordRecoveryJobRepository`, `PasswordRecoveryDeliveryWorker`, serviço de solicitação e proteção do payload. A referência consultada mostrava 42 branches descobertos no repositório de jobs, 36 no worker e 15 no serviço de solicitação; recalcular a partir da baseline atual.

### TDD e validação

- RED: identificar cada branch relevante ainda não exercitado nos testes existentes.
- GREEN: acrescentar testes determinísticos e isolados para os resultados do fluxo de recuperação.
- REFACTOR: reutilizar fixtures sem compartilhar alterações com T008 ou T009.
- Executar os testes focais e a suíte completa backend com cobertura; confirmar o ganho no `Summary.json`.

### Critérios de conclusão

- Casos de sucesso, rejeição e falha importantes têm asserts de estado/efeito, sem dados reais nem chamadas externas.
- A cobertura backend aumenta no artefato oficial, mantendo a mesma fonte.

## T011 — Cobrir cadastro, validação e perfil de usuários

- Status: concluída
- Issue: #512
- Dependências: T001
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-002, CA-005
- Caminhos sob responsabilidade: `backend/Tests/Services/UsuarioServiceValidationTests.cs`, `backend/Tests/Controllers/UserCreationPasswordPolicyTests.cs`, `backend/Tests/Integration/UserProfileMutationTests.cs`, `backend/Tests/Integration/UserResourceAuthorizationTests.cs`

### Escopo

Selecionar condições descobertas de `UsuariosController` e `UserProfileUpdateService` relativas a validação, autorização, atualização permitida/recusada e falhas de persistência. A baseline #45727800901 mostrava 46 branches ausentes em `UsuariosController` e 40 em `UserProfileUpdateService`; revalidar antes de escrever casos. Preservar contratos e regras de autorização existentes.

### TDD e validação

- RED: mapear gaps do relatório a caminhos observáveis não cobertos.
- GREEN: ampliar os testes sob responsabilidade, afirmando resposta e efeito de persistência/autorização.
- REFACTOR: manter dados sintéticos e reuso de fixtures locais; não editar fixtures compartilhadas da onda.
- Executar testes focais e a suíte completa backend com cobertura.

### Critérios de conclusão

- Os cenários caracterizam regras de cadastro e perfil sem alterar comportamento de produção.
- O relatório HTML da execução completa mostra branches adicionais cobertos.

## T012 — Cobrir notificações e seus limites

- Status: concluída
- Issue: #512
- Dependências: T001
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-002, CA-005
- Caminhos sob responsabilidade: `backend/Tests/Services/NotificacaoServiceTests.cs`, `backend/Tests/Services/NotificationQuotaPolicyTests.cs`, `backend/Tests/Controllers/NotificacoesControllerTests.cs`, `backend/Tests/Integration/NotificationRecipientReadTests.cs`, `backend/Tests/Integration/NotificationQuotaTests.cs`, `backend/Tests/Integration/NotificationMutationAuditTests.cs`

### Escopo

Cobrir estados de leitura, destinatário, quota, mutação e auditoria que ainda aparecem descobertos para `NotificacaoService`, controller e políticas associadas. A baseline de referência indicava 51 branches ausentes em `NotificacaoService`; recalcular no HTML e evitar duplicar casos já cobertos por testes de integração.

### TDD e validação

- RED: localizar branches sem execução e cenários correspondentes no comportamento visível.
- GREEN: criar ou completar asserts de destinatário, autorização, quota e registro de alteração nos arquivos listados.
- REFACTOR: manter isolados os testes unitários e de integração existentes.
- Executar os testes focais e a suíte completa backend com cobertura.

### Critérios de conclusão

- Os testes verificam resultados de notificação e limites sem chamadas externas reais.
- O HTML da suíte completa mostra aumento de branches cobertos.

## T013 — Cobrir produtos, empréstimos e datas do backend

- Status: concluída
- Issue: #512
- Dependências: T001
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-002, CA-005
- Caminhos sob responsabilidade: `backend/Tests/Controllers/ProdutosControllerTests.cs`, `backend/Tests/Controllers/EmprestimosReturnClaimTests.cs`, `backend/Tests/Services/ProductCivilDayTests.cs`, `backend/Tests/Services/LoanDomainRulesTests.cs`, `backend/Tests/Repositories/ProdutoRepositoryTests.cs`, `backend/Tests/Integration/ProductCreationDateTests.cs`, `backend/Tests/Integration/LoanReturnCharacterizationTests.cs`, `backend/Tests/Integration/ApiErrorAndDateContractTests.cs`

### Escopo

Usar o HTML para selecionar condições descobertas de `ProdutoService`, `ProdutosController`, `LoanReturnService`, `EmprestimosController` e `ApiDateFilters`. A baseline de referência apontava 37 branches ausentes em `ProdutoService`, 23 em `ProdutosController`, 25 em `LoanReturnService`, 16 em `EmprestimosController` e 29 em `ApiDateFilters`; atualizar as contagens antes de escolher testes. Conferir regras de estoque, autorização, datas e erros que tenham resultado observável, sem mudar lógica de produção para aumentar a porcentagem.

### TDD e validação

- RED: registrar branches relevantes não exercitados e identificar os testes que não os cobrem.
- GREEN: acrescentar cenários focais para decisões de produto, empréstimo e datas nos arquivos listados.
- REFACTOR: preservar fixtures de outras tarefas e manter testes determinísticos.
- Executar os testes focais e a suíte completa backend com cobertura; confirmar o resultado no `Summary.json`.

### Critérios de conclusão

- Os testes exercitam regras e respostas existentes, sem reduzir o escopo medido.
- O artefato HTML mostra aumento de branches cobertos no backend.

## T014 — Documentar a meta de 80% e a fonte de backend

- Status: concluída
- Issue: #512
- Dependências: T001
- Paralela: sim
- Requisitos: RF-003, CA-004
- Caminhos sob responsabilidade: `README.md`, `../lab-solos.wiki/Plano-de-Testes.md`

### Escopo

Atualizar README e Plano de Testes para identificar 80% de branches por módulo como meta e 70% por módulo como exigência da CI. Documentar que backend usa as contagens do `Summary.json` do artefato HTML e que seu JSON/badge acompanha a mesma fonte. Preservar a cobertura de linhas como métrica separada e informativa. Não dizer que 80% reprova a CI. Preservar alterações locais preexistentes no checkout da Wiki.

### Critérios de conclusão

- Ambos os documentos distinguem claramente meta 80%, gate 70%, cobertura de linhas e fonte do backend.
- A documentação não promete que a CI bloqueia resultados entre 70% e menos de 80%.
- O JSON de backend que alimenta gate e badge tem as mesmas contagens do HTML; o percentual do badge é calculado a partir dos JSONs oficiais de cada módulo.

### Validação documental

- Conferir as seções de cobertura no `README.md` e em `Plano-de-Testes.md`.
- `git diff --check -- README.md`.
- `git -C ..\lab-solos.wiki diff --check -- Plano-de-Testes.md`.

### Notas

## T015 — Validar a meta por módulo e preservar o gate de 70%

- Status: em andamento
- Issue: #512
- Dependências: T002, T003, T004, T005, T006, T007, T008, T009, T010, T011, T012, T013, T014, T016, T017, T018, T019, T020, T021, T022, T023, T024, T025
- Paralela: não
- Requisitos: RF-001, RF-002, RF-004, RF-005, RNF-001, RNF-002, CA-001, CA-002, CA-003, CA-005, CA-006
- Caminhos sob responsabilidade: `.codex/docs/specs/aumento-cobertura-branches-80/evidencias/T015.md`

### Escopo

Executar as suítes amplas e conferir uma execução oficial da Container CI na PR destinada a `develop`. Registrar SHA, `run_id`, tentativa, contagens e percentuais por módulo. Só concluir a melhoria quando frontend e backend atingirem pelo menos 80% nas fontes definidas, incluindo backend no `Summary.json`/HTML. Confirmar que o JSON/gate/badge backend usa a mesma contagem e que a CI exige exatamente 70% por módulo, sem arredondamento. Não alterar o escopo do ReportGenerator nem as exclusões para obter a meta.

Se a cobertura de qualquer módulo permanecer abaixo de 80%, registrar o gap e derivar tarefas focais adicionais do relatório atualizado; não marcar a issue como concluída nem tratar uma aprovação do gate de 70% como atendimento da meta.

### Critérios de conclusão

- Os testes frontend e backend passam nos ambientes compatíveis, com suas limitações documentadas.
- O relatório oficial da revisão mostra 80% ou mais de branches em frontend e backend separadamente, com identidade correspondente; backend HTML e JSON usado pelo gate/badge têm contagens idênticas.
- `check_coverage.py` mantém 70% como limite por módulo: resultados válidos de 70% ou mais passam; abaixo de 70%, relatório ausente ou inválido reprova. A decisão backend usa a razão de `Summary.json`, sem arredondar os 69,8% atuais para 70%.
- A faixa de 70% a menos de 80% pode passar na CI, mas permanece insuficiente para concluir esta meta.
- README, Wiki, testes, JSONs e HTML não contradizem a política de 80% como meta e 70% como gate.

### Plano TDD e integração

- RED: comparar o baseline com a primeira execução integrada e identificar se os branches focais cobriram o gap; reprovar a conclusão se qualquer módulo ficar abaixo de 80%, mesmo que a CI passe pelo gate de 70%.
- GREEN: obter a execução oficial com ambos os módulos em pelo menos 80%; confirmar que o gate segue em 70%.
- REFACTOR: revisar qualidade e estabilidade dos testes, filtros e documentação; remover duplicação sem reduzir cobertura significativa.

### Validação

- Na pasta `frontend`: `npm run test -- --run --coverage`, `npm run lint` e `npm run build`.
- `dotnet restore backend/backend.sln --locked-mode`.
- `dotnet test backend/Tests/Tests.csproj -c Release --nologo --disable-build-servers --collect:"XPlat Code Coverage" --results-directory ".tmp/coverage/backend/local/1"`.
- `python -B -m unittest discover -s .github/scripts/tests -p test_check_coverage.py -v`.
- `python -B -m unittest discover -s .github/scripts/tests -p test_collect_backend_coverage.py -v`.
- Conferir o job `Coverage policy` e o artefato `coverage-html` da mesma execução de PR; o job pós-merge de publicação dos badges não substitui essa validação.
- `git diff --check` no checkout do repositório e na Wiki.

### Notas

O primeiro artefato oficial da PR, run `45749677986`, SHA `4a42688cc480da157606981b09634a61335af928`, tentativa 1, confirma que o gate backend lê a mesma contagem do `Summary.json`: 2702/3610 (74,85%). O backend passa no gate de 70%, mas permanece abaixo da meta de 80%. Para chegar a 80% com o total oficial de 3610 branches, são necessários 2888 cobertos; faltam 186. As tarefas focais T016–T019 foram derivadas das lacunas do mesmo relatório, sem alterar o escopo do ReportGenerator.

O run oficial mais recente disponível para orientar esta onda é `45758251729`, tentativa 1, head `eab7b7d8b01909d85ccf498acf6ad66c199c96e8`, identidade do artefato `8b4fef0b451a50aa44a79af32893b131632a3def`: frontend 2833/3525 (80,37%) e backend 2754/3610 (76,29%). Para o backend, os campos `coveredbranches`/`totalbranches` de `Summary.json` coincidem exatamente com `metrics.branches.covered`/`total` do JSON do gate e badge. O gate oficial de 70% passou; faltam 134 branches para alcançar os 2888 necessários à meta de 80%. T009 e T018 passaram na suíte backend completa desse run e foram concluídas. As tarefas T020–T024 priorizam classes ainda parcialmente cobertas, usando a mesma medição oficial e sem alterar filtros ou exclusões.

## T016 — Aumentar cobertura dos fluxos de credencial

- Status: concluída
- Issue: #512
- Dependências: T001
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-002, CA-005
- Caminhos sob responsabilidade: `backend/Tests/Security/CredentialServiceTests.cs`

### Escopo

Usar o relatório oficial do run `45749677986` para exercitar decisões de credencial ainda descobertas, priorizando `CredentialService` (113/170 branches cobertos). Estender somente os testes de serviço existentes com cenários observáveis de sucesso, rejeição e estado de token/sessão, sem mudar produção, filtros ou exclusões.

### Critérios de conclusão

- Cada cenário novo corresponde a uma decisão existente ainda não coberta e verifica o resultado e o estado persistido.
- Os testes focais passam e o relatório local demonstra o avanço das branches escolhidas.
- Os novos testes não introduzem alertas no baseline/analisadores.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --artifacts-path .tmp/T016 --filter "FullyQualifiedName~CredentialServiceTests" --nologo --disable-build-servers`.
- `git diff --check`.

## T017 — Aumentar cobertura das rotas de autenticação

- Status: concluída
- Issue: #512
- Dependências: T001
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-002, CA-005
- Caminhos sob responsabilidade: `backend/Tests/Controllers/AuthControllerCoverageTests.cs`

### Escopo

Usar o relatório oficial do run `45749677986` para cobrir decisões observáveis ainda descobertas em `AuthController` (82/147 branches cobertos), concentrando-se em rotas além da troca de senha já tratada por T008. Seguir as fixtures e contratos existentes para Login, Session, Logout ou Renew, sem alterar produção.

### Critérios de conclusão

- Os cenários cobrem branches relevantes observados no relatório e afirmam respostas, cookies, cabeçalhos ou efeitos de sessão.
- Os testes focais passam e demonstram avanço na cobertura do controlador.
- Os novos testes não introduzem alertas no baseline/analisadores.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --artifacts-path .tmp/T017 --filter "FullyQualifiedName~AuthControllerCoverageTests" --nologo --disable-build-servers`.
- `git diff --check`.

## T018 — Cobrir decisões do limite de troca de senha

- Status: concluída
- Issue: #512
- Dependências: T001
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-002, CA-005
- Caminhos sob responsabilidade: `backend/Tests/Integration/PasswordChangeRateLimitTests.cs`

### Escopo

Usar o relatório oficial do run `45749677986`, que registra 14/43 branches cobertos em `PasswordChangeRateLimitService`, para acrescentar cenários de resultado conforme a admissão do throttle e a conclusão da troca. Reutilizar o harness PostgreSQL existente e verificar o contrato observável; não mudar política nem implementação de produção.

### Critérios de conclusão

- Os novos cenários cobrem estados relevantes do throttle e verificam o resultado da troca e da admissão.
- Os testes passam no ambiente PostgreSQL do projeto; uma limitação local de Docker fica documentada para validação no CI.
- Os novos testes não introduzem alertas no baseline/analisadores.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --artifacts-path .tmp/T018 --filter "FullyQualifiedName~PasswordChangeRateLimitTests" --nologo --disable-build-servers`.
- `git diff --check`.

## T019 — Cobrir validações de inicialização de proteção

- Status: concluída
- Issue: #512
- Dependências: T001
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-002, CA-005
- Caminhos sob responsabilidade: `backend/Tests/Integration/AuthenticationProtectionStartupTests.cs`

### Escopo

Usar o relatório oficial do run `45749677986`, que registra 40/72 branches cobertos em `AuthenticationProtectionStartupValidator`, para cobrir decisões de configuração, inicialização e liberação de recursos ainda descobertas. Reutilizar o harness existente e manter o comportamento de produção intacto.

### Critérios de conclusão

- Os cenários demonstram respostas de startup/health observáveis para os ramos escolhidos.
- Os testes passam no ambiente PostgreSQL do projeto; uma limitação local de Docker fica documentada para validação no CI.
- Os novos testes não introduzem alertas no baseline/analisadores.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --artifacts-path .tmp/T019 --filter "FullyQualifiedName~AuthenticationProtectionStartupTests" --nologo --disable-build-servers`.
- `git diff --check`.

## T020 — Cobrir caminhos restantes de redefinição de credencial

- Status: concluída
- Issue: #512
- Dependências: T001, T016
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-002, CA-005
- Caminhos sob responsabilidade: `backend/Tests/Security/CredentialServiceTests.cs`

### Escopo

Usar o `Summary.json` do run `45758251729`, que registra `CredentialService` em 120/170 branches. Completar os cenários observáveis de `ResetPasswordWithoutThrottleAsync`, priorizando token válido, usuário ausente ou desabilitado, token expirado/malformado e os resultados transacionais de commit/rollback. Estender apenas o arquivo de teste indicado; não mudar produção, política de cobertura nem escopo do ReportGenerator.

### Critérios de conclusão

- Os novos testes exercitam os estados ainda não cobertos e verificam resposta e estado da credencial/sessão.
- O recorte focal passa e demonstra aumento de branches exercitados sem enfraquecer testes existentes.
- Os novos testes não introduzem alertas no baseline/analisadores.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --artifacts-path .tmp/T020/final-artifacts --filter "FullyQualifiedName~CredentialServiceTests" --collect:"XPlat Code Coverage" --results-directory .tmp/T020/final-results --nologo --disable-build-servers`.
- `git diff --check`.

## T021 — Cobrir emissão transacional de recuperação de senha

- Status: concluída
- Issue: #512
- Dependências: T001, T010, T016, T020
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-002, CA-005
- Caminhos sob responsabilidade: `backend/Tests/Integration/CredentialServiceRecoveryDeliveryTests.cs`

### Escopo

Criar testes de integração focados nas branches restantes de `CredentialService.IssuePasswordResetForDeliveryAsync` (120/170 branches na medição do run `45758251729`). Cobrir inelegibilidade do usuário/e-mail, emissão e cancelamento de job, transação/rollback e falhas de infraestrutura observáveis. Reutilizar fixtures e factories existentes; `LockUserRowAsync` requer PostgreSQL real via Testcontainers. Manter o teste em arquivo próprio e não alterar produção nem a métrica.

### Critérios de conclusão

- Cenários válidos e inelegíveis verificam o resultado público e o estado do job/token no banco.
- Falhas transacionais relevantes são exercitadas com PostgreSQL e não deixam dados parciais.
- O teste focal e os analisadores passam; uma limitação local de Docker fica documentada para a confirmação na CI.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --artifacts-path .tmp/T021 --filter "FullyQualifiedName~CredentialServiceRecoveryDeliveryTests" --nologo --disable-build-servers`.
- `git diff --check`.

## T022 — Cobrir decisões restantes de aprovação e concessão administrativa

- Status: concluída
- Issue: #512
- Dependências: T001, T011
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-002, CA-005
- Caminhos sob responsabilidade: `backend/Tests/Integration/CriticalUserApprovalTests.cs`

### Escopo

Partir do `Summary.json` do run `45758251729`, no qual `UsuariosController` está em 128/170 branches, e ampliar os cenários do arquivo de aprovação existente. Priorizar alvo inexistente, já administrador ou desabilitado, ator inelegível e decisões de aprovação/rejeição incompatíveis com o nível solicitado. Verificar status HTTP, ausência de mutação/auditoria indevida e estado persistido; manter o contrato de produção intacto e não forçar estados inalcançáveis pelo fluxo público.

### Critérios de conclusão

- Cada novo cenário corresponde a uma decisão observável e confirma o estado persistido.
- Os testes passam no PostgreSQL/Testcontainers e não introduzem alertas no baseline/analisadores.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --artifacts-path .tmp/T022 --filter "FullyQualifiedName~CriticalUserApprovalTests" --collect:"XPlat Code Coverage" --results-directory .tmp/T022/results --nologo --disable-build-servers`.
- `git diff --check`.

## T023 — Cobrir decisões restantes de atualização de perfil

- Status: concluída
- Issue: #512
- Dependências: T001, T011
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-002, CA-005
- Caminhos sob responsabilidade: `backend/Tests/Integration/UserProfileMutationTests.cs`

### Escopo

Usar a medição oficial do run `45758251729`, na qual `UserProfileUpdateService` está em 119/153 branches. Ampliar os testes de atualização de perfil para resultados observáveis ainda não cobertos: perfil inexistente, e-mail em branco/novo, edição própria versus administrativa, validação de status e claims ausentes/duplicadas. Cobrir concorrência/rollback somente quando o cenário puder ser reproduzido fielmente no PostgreSQL. Não alterar produção, filtros ou exclusões.

### Critérios de conclusão

- Os casos novos validam a resposta e a persistência, incluindo que dados não mudam em rejeições.
- O recorte focal e os analisadores passam; integrações dependentes de Docker local indisponível ficam documentadas para CI.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --artifacts-path .tmp/T023 --filter "FullyQualifiedName~UserProfileMutationTests" --nologo --disable-build-servers`.
- `git diff --check`.

## T024 — Cobrir estados restantes da entrega assíncrona de recuperação

- Status: concluída
- Issue: #512
- Dependências: T001, T010
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-002, CA-005
- Caminhos sob responsabilidade: `backend/Tests/Integration/RecoveryDeliveryWorkerTests.cs`

### Escopo

Usar o relatório do run `45758251729`, em que `PasswordRecoveryDeliveryWorker` tem 58/94 branches cobertos. Inspecionar as decisões restantes do worker e ampliar os testes existentes para cobrir estados observáveis de payload inválido/ilegível, idade e expiração, lease, cancelamento e falhas permanentes/transitórias sem duplicar os cenários já existentes. Reutilizar PostgreSQL/Testcontainers e fakes de e-mail/relógio; manter produção e escopo do relatório intactos.

### Critérios de conclusão

- Cada branch exercitada corresponde a um comportamento observável, com estado final do job e efeitos de entrega verificados.
- Os testes focais passam no ambiente PostgreSQL e não introduzem novos alertas de qualidade.
- Nenhum cenário enfraquece a política de retry, idempotência ou limpeza de payload.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --artifacts-path .tmp/T024 --filter "FullyQualifiedName~RecoveryDeliveryWorkerTests" --nologo --disable-build-servers`.
- `git diff --check`.

## T025 — Cobrir decisões restantes de login e admissão

- Status: concluída
- Issue: #512
- Dependências: T001, T017
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-002, CA-005
- Caminhos sob responsabilidade: `backend/Tests/Controllers/AuthControllerLoginCoverageTests.cs`

### Escopo

Usar o `Summary.json` oficial do run `45758251729`, que registra `AuthController` em 108/147 branches. Criar um arquivo unitário exclusivo para decisões de login/admissão ainda descobertas, escolhendo casos a partir do HTML e do código: throttle limitado/indisponível, admissão sem tentativa, identificador de conta inválido ou usuário inelegível e falhas/cancelamentos de proteção que tenham resposta observável. Reutilizar mocks e contratos existentes sem editar `AuthControllerCoverageTests.cs`, `AuthLoginContractTests.cs` ou produção; não duplicar os cenários cobertos pela T017.

### Critérios de conclusão

- Os novos cenários cobrem apenas ramos ainda não exercitados e afirmam resposta, efeito de sessão e conclusão/descartes de tentativas quando aplicável.
- O teste focal passa e demonstra aumento de branches no controlador sem relaxar asserções existentes.
- O arquivo não introduz novos alertas de qualidade.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --artifacts-path .tmp/T025 --filter "FullyQualifiedName~AuthControllerLoginCoverageTests" --collect:"XPlat Code Coverage" --results-directory .tmp/T025/results --nologo --disable-build-servers`.
- `git diff --check`.

## T026 — Cobrir branches remanescentes da validação de inicialização

- Status: concluída
- Issue: #512
- Dependências: T001, T015, T019
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-001, CA-002, CA-005, CA-006
- Caminhos sob responsabilidade: `backend/Tests/Integration/AuthenticationProtectionStartupTests.cs`

### Escopo

Partir do artefato oficial do run `45767363080`, no qual `AuthenticationProtectionStartupValidator` apresenta 42/72 branches cobertos. Inspecionar os ramos não cobertos no HTML e acrescentar testes de integração para decisões de inicialização/readiness que tenham efeito observável, incluindo configuração inválida, leitura de segredos e estados de chaves/jobs, sem duplicar os cenários existentes. Usar PostgreSQL/Testcontainers e as fixtures/fakes já adotadas. Não alterar produção, o gate ou a métrica; reavaliar o ganho no próximo artefato oficial.

### Critérios de conclusão

- Cada caso novo corresponde a branch descoberto no artefato de referência e verifica startup, health/readiness ou falha sem expor segredo/caminho.
- Os testes focalizados e a suíte backend completa passam na CI com PostgreSQL; nenhum cenário depende de Docker local disponível.
- A alteração não enfraquece validação de configuração ou sigilo de mensagens.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --artifacts-path .tmp/T026 --filter "FullyQualifiedName~AuthenticationProtectionStartupTests" --nologo --disable-build-servers`.
- `git diff --check`.

### Evidência local

O build Release passou sem avisos atribuídos ao arquivo. A execução focal descobriu cinco testes, mas o fixture Testcontainers não iniciou por indisponibilidade local do Docker (`npipe://./pipe/docker_engine`); as asserções dependem da CI PostgreSQL.

## T027 — Cobrir decisões remanescentes de atualização de perfil

- Status: concluída
- Issue: #512
- Dependências: T001, T015, T023
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-001, CA-002, CA-005, CA-006
- Caminhos sob responsabilidade: `backend/Tests/Integration/UserProfileMutationTests.cs`

### Escopo

Partir do `Summary.json` oficial do run `45767363080`, que registra `UserProfileUpdateService` em 121/153 branches. Escolher decisões ainda descobertas no HTML e ampliar os testes de atualização de perfil para resultados observáveis, priorizando autorização, validação do patch, alteração de e-mail e seus conflitos/rollback. Reutilizar as fixtures PostgreSQL existentes. Não duplicar casos de T023 nem alterar produção, filtros ou exclusões.

### Critérios de conclusão

- Os casos cobrem branches descobertos e verificam resposta, persistência e ausência de mutação em rejeições.
- A suíte focal e a suíte backend completa passam na CI com PostgreSQL.
- Nenhuma condição de autorização ou consistência é flexibilizada para aumentar cobertura.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --artifacts-path .tmp/T027 --filter "FullyQualifiedName~UserProfileMutationTests" --nologo --disable-build-servers`.
- `git diff --check`.

### Evidência local

O build compilou os 30 casos focais; todos pararam no setup do Testcontainers por indisponibilidade local do Docker. `git diff --check` passou; os cenários de persistência/rollback aguardam execução na CI PostgreSQL.

## T028 — Cobrir estados remanescentes do worker de recuperação

- Status: concluída
- Issue: #512
- Dependências: T001, T015, T024
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-001, CA-002, CA-005, CA-006
- Caminhos sob responsabilidade: `backend/Tests/Integration/RecoveryDeliveryWorkerTests.cs`

### Escopo

Partir do `Summary.json` oficial do run `45767363080`, no qual `PasswordRecoveryDeliveryWorker` registra 58/94 branches apesar dos cenários de T024. Examinar os branches ainda descobertos e adicionar casos de integração somente para estados relevantes não exercitados, como elegibilidade, falha de entrega/retry, cancelamento ou estado terminal, verificando efeitos de envio, tentativas, lease e limpeza do payload. Reutilizar o fixture PostgreSQL e o relógio/fakes do arquivo. Não repetir cenários de T024 nem mudar política de retry ou comportamento de produção.

### Critérios de conclusão

- Novos casos correspondem aos branches descobertos e verificam o estado persistido e os efeitos observáveis.
- Os testes focais e a suíte backend completa passam na CI com PostgreSQL.
- Não há relaxamento de idempotência, retry, expiração ou limpeza de payload.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --artifacts-path .tmp/T028 --filter "FullyQualifiedName~RecoveryDeliveryWorkerTests" --nologo --disable-build-servers`.
- `git diff --check`.

### Evidência local

O build compilou os 21 casos focais; o fixture PostgreSQL impediu as asserções por Docker local indisponível. Os cenários novos verificam payload semântico inválido, bucket de emissão ausente e conta desabilitada entre consulta e emissão; a CI deve confirmar os resultados.

## T029 — Cobrir branches restantes do serviço de credenciais

- Status: concluída
- Issue: #512
- Dependências: T001, T015, T020, T021
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-001, CA-002, CA-005, CA-006
- Caminhos sob responsabilidade: `backend/Tests/Security/CredentialServiceTests.cs`

### Escopo

Usar o `Summary.json` do run oficial `45770954773`, no qual `CredentialService` registra 125/170 branches. Examinar o HTML e selecionar decisões públicas relevantes ainda descobertas, sem repetir T020/T021; priorizar validação de credenciais, elegibilidade e resultados de recuperação de senha/transação que possam ser exercitados pelo contrato existente. Manter os testes no arquivo unitário indicado; não alterar produção, limiar, filtros ou exclusões.

### Critérios de conclusão

- Cada cenário novo corresponde a branch descoberto e verifica resultado e ausência/persistência de alterações da credencial.
- A suíte focal passa e aumenta a contagem de branches observados, sem relaxar verificações existentes.
- O arquivo não introduz novos avisos de quality baseline/CodeQL.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --artifacts-path .tmp/T029 --filter "FullyQualifiedName~CredentialServiceTests" --nologo --disable-build-servers`.
- `git diff --check`.

### Evidência local

O filtro focal passou 42/42; `FindResetUserAsync` aumentou de 2/4 para 4/4 branches na cobertura focal. O cenário de fallback de nome foi retirado porque a saída atual está com texto corrompido (`UsuÃ¡rio`); corrigir esse comportamento exigiria alteração de produção fora do escopo deste PRD, portanto esse caminho segue sem teste.

## T030 — Cobrir branches restantes do cadastro de contas

- Status: concluída
- Issue: #512
- Dependências: T001, T015, T022
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-001, CA-002, CA-005, CA-006
- Caminhos sob responsabilidade: `backend/Tests/Integration/CriticalRegistrationTests.cs`, `backend/Tests/Controllers/UsuarioRegistrationValidationTests.cs`

### Escopo

Partir do `Summary.json` oficial do run `45770954773`, que mostra `UsuariosController` em 131/170 branches. Consultar o HTML e cobrir decisões ainda descobertas e observáveis do fluxo de cadastro público/mapeamento de respostas, sem repetir os casos de T022 ou de validação já existentes. Reutilizar factories e fixtures atuais; preservar a matriz de cadastro/aprovação e as respostas públicas estabelecidas.

### Critérios de conclusão

- Os casos verificam status e corpo da resposta, persistência ou ausência de mutação conforme o resultado do fluxo.
- Os testes focais e a suíte backend completa passam com PostgreSQL na CI.
- Nenhuma regra de autorização, cadastro ou aprovação é alterada para alcançar cobertura.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --artifacts-path .tmp/T030 --filter "FullyQualifiedName~CriticalRegistrationTests|FullyQualifiedName~UsuarioRegistrationValidationTests|FullyQualifiedName~UsuariosControllerRegistrationFailureTests" --nologo --disable-build-servers`.
- `git diff --check`.

### Evidência local

O build Release passou. Os testes unitários das classes explícitas passaram 5/5 e 3/3; no filtro combinado, mais 18 integrações pararam no setup do Testcontainers por Docker local indisponível (`npipe://./pipe/docker_engine`). A suíte completa Backend quality passou na CI run `45776498924`, confirmando os testes de integração com PostgreSQL.

## T031 — Cobrir ramos restantes do throttle PostgreSQL

- Status: concluída
- Issue: #512
- Dependências: T001, T015, T018
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-001, CA-002, CA-005, CA-006
- Caminhos sob responsabilidade: `backend/Tests/Integration/SharedAuthenticationThrottleTests.cs`, `backend/Tests/Integration/LoginThrottleTests.cs`

### Escopo

Usar o artefato do run `45770954773`, que registra `PostgresAuthenticationThrottle` em 141/174 branches. Inspecionar os ramos descobertos no HTML e ampliar os testes de contrato do throttle em estados de admissão, dimensões da chave, concorrência, limite/capacidade, expiração e falha de banco que ainda não estejam exercitados. Usar PostgreSQL real; manter rate limits, consistência compartilhada e comportamento fail-closed.

### Critérios de conclusão

- Os novos cenários correspondem a branches descobertos e verificam tentativas, leases/capacidade e respostas sem efeitos parciais.
- Testes focais e suíte backend passam na CI PostgreSQL; o quality baseline não recebe novos alertas.
- Não há mudança de produção, quotas ou métrica de cobertura.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --artifacts-path .tmp/T031 --filter "FullyQualifiedName~SharedAuthenticationThrottleTests|FullyQualifiedName~LoginThrottleTests" --nologo --disable-build-servers`.
- `git diff --check`.

### Evidência local

Build Release e quality local passaram sem avisos atribuídos ao arquivo. A suíte focal descobriu 22 testes; todos pararam antes das asserções porque o fixture PostgreSQL não conecta ao Docker local. Na CI run `45774917722`, o cenário de prazo de emissão falhou porque o teste esperava que a admissão removesse o placeholder de bucket (0), mas `TryBeginAsync` o confirma antes de abrir o lease (1). A asserção foi corrigida para verificar que o bucket reservado permanece com `Count = 0`, `NextEmissionAt = null` e capacidade 1 após a tentativa com chave não bloqueada ser rejeitada. Na CI run `45776498924`, Backend quality passou, validando a suíte PostgreSQL após a correção.

## T032 — Cobrir resultados e erros do EmailController

- Status: em andamento
- Issue: #512
- Dependências: T001, T029
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-002, CA-005
- Caminhos sob responsabilidade: `backend/Tests/Controllers/EmailControllerTests.cs`

### Escopo

Partir do artefato oficial `45776498924`, no qual `EmailController` está em 21/44 branches. Consultar o HTML e caracterizar os ramos ainda descobertos de `EnviarEmail` para `InvalidOperationException` e `FormatException`, o mapeamento dos resultados do fluxo de redefinição de senha (`Success`, `Conflict`, `RateLimited`, `Unavailable` e problema de validação) e os códigos de campo/mensagem em `ConflictProblem`. Reutilizar os mocks de serviço existentes; verificar status, corpo e cabeçalhos públicos. Não alterar produção, contratos, política de cobertura ou criar cenários de enum inválido sem caminho observável.

### Plano TDD

- RED: adicionar testes focalizados nos resultados/catches descobertos no HTML; confirmar a lacuna de cobertura e os resultados atuais do contrato.
- GREEN: acionar os resultados por `IPasswordResetService` e exceções controladas, verificando respostas HTTP e cabeçalhos.
- REFACTOR: remover duplicação de arrange/assert sem reduzir verificações de status, corpo e headers.

### Critérios de conclusão

- Os casos novos cobrem comportamentos públicos ainda descobertos e verificam status, corpo e headers.
- O filtro focal passa, aumenta branches exercitados e não muda produção.
- Quality baseline e CodeQL não recebem novos alertas atribuídos ao arquivo.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --artifacts-path .tmp/T032 --filter "FullyQualifiedName~EmailControllerTests" --nologo --disable-build-servers`.
- `git diff --check`.

### Evidência local

O filtro focal passou 21/21; a cobertura local focal somando `EmailController` e suas máquinas de estado assíncronas ficou em 37/44 branches, contra 21/44 no Summary oficial completo. `git diff --check` passou. A cobertura focal não substitui o próximo artefato `Summary.json`; validação de quality baseline/CodeQL aguarda CI.

## T033 — Cobrir validações restantes de AuditoriaService

- Status: em andamento
- Issue: #512
- Dependências: T001, T015
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-002, CA-005
- Caminhos sob responsabilidade: `backend/Tests/Services/AuditoriaServiceTests.cs`

### Escopo

Partir do artefato oficial `45776498924`, no qual `AuditoriaService` está em 58/78 branches. Acrescentar testes unitários para justificativa em branco e acima de 1000 caracteres em `ReclassificarClassificacaoAsync`; referência de recurso inválida, combinações inválidas de origem/ator e correlation ID inseguro em `CriarRegistro`; e IP inválido/ausente sem consulta de contagem por origem. Verificar exceções/resultado e chamadas ao repositório. Não usar reflection, fabricar endereço IP além dos limites aceitos ou alterar produção; o ramo de normalização aparentemente inalcançável fica fora.

### Plano TDD

- RED: selecionar cada ramo descoberto na página HTML e adicionar casos de caracterização que exponham o resultado ou ausência de chamada ao repositório.
- GREEN: acionar validações pelo contrato público e afirmar exceção, resultado e interações esperadas.
- REFACTOR: consolidar dados de entrada compartilhados mantendo asserts independentes para cada regra.

### Critérios de conclusão

- Os casos verificam justificativa, referência, origem/ator, correlation ID e IP inválidos sem relaxar as regras atuais.
- O filtro focal passa e exercita branches adicionais sem alteração de produção.
- Nenhum alerta novo de quality baseline ou CodeQL é atribuído ao arquivo.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --artifacts-path .tmp/T033 --filter "FullyQualifiedName~AuditoriaServiceTests" --nologo --disable-build-servers`.
- `git diff --check`.

### Evidência local

O filtro focal passou 23/23; a coleta focal registrou 45/52 branches para `AuditoriaService`, um recorte diferente do denominador 58/78 do Summary oficial da suíte completa. `git diff --check` passou. Os testes unitários não dependem de Docker; validação integrada e quality baseline/CodeQL aguardam CI.

## T034 — Cobrir validações restantes de AuthController

- Status: em andamento
- Issue: #512
- Dependências: T001, T017, T025
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-002, CA-005
- Caminhos sob responsabilidade: `backend/Tests/Controllers/AuthControllerCoverageTests.cs`, `backend/Tests/Controllers/AuthControllerLoginCoverageTests.cs`, `backend/Tests/Controllers/AuthChangePasswordTests.cs`

### Escopo

Partir do artefato oficial `45776498924`, no qual `AuthController` está em 118/147 branches. Cobrir validações observáveis de senha ausente, curta e acima do limite em `ChangePassword`; serviço de sessão ausente no fluxo de sessão; guards do construtor quando exercitáveis; e mapeamentos de falhas de proteção/configuração para 503 com cabeçalhos `no-store`. Reutilizar mocks existentes e afirmar resposta e ausência de mutação. Não alterar produção, contrato nem inventar estados inválidos do throttle que não possam ocorrer pelo contrato.

### Plano TDD

- RED: adicionar casos unitários para cada resultado não coberto pelo HTML e confirmar lacuna de cobertura/resultados.
- GREEN: configurar mocks/fakes para atingir os fluxos públicos e verificar status, corpo, headers e efeitos.
- REFACTOR: reutilizar helpers existentes e manter expectativas explícitas de segurança e ausência de mutação.

### Critérios de conclusão

- Os casos exercitam branches observáveis de validação, sessão e falhas de proteção sem modificar a política de autenticação.
- O filtro focal passa e não reduz verificações existentes.
- Quality baseline e CodeQL não recebem novos alertas nos arquivos alterados.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --artifacts-path .tmp/T034 --filter "FullyQualifiedName~AuthControllerCoverageTests|FullyQualifiedName~AuthControllerLoginCoverageTests|FullyQualifiedName~AuthChangePasswordTests" --nologo --disable-build-servers`.
- `git diff --check`.

### Evidência local

O filtro focal passou 46/46, acima da linha de base local 28/28; `AuthController` ficou em 74/82 branches no recorte focal, sem substituir a medida do Summary oficial. `git diff --check` passou. Validação de quality baseline/CodeQL aguarda CI.

## Log de execução

| Data | Tarefa | Resultado | Testes/evidências | Observações |
| ---- | ------ | --------- | ----------------- | ----------- |
| 2026-11-26 | T015 | em andamento | Run #45767363080, tentativa 1: Backend quality passou com 1061/1061 testes; frontend 2833/3525 (80,37%), backend HTML 2776/3610 (76,90%); JSON do gate coincide exatamente; Coverage policy e demais checks passaram com gate de 70%. | Faltam 112 branches backend para 2888/3610 (80%). Essa contagem do artefato HTML é a medida oficial para selecionar e verificar as próximas tarefas; T021–T024 deixam de estar bloqueadas. |
| 2026-11-26 | T021–T024 | concluídas | Suíte backend da CI run #45767363080 passou 1061/1061, incluindo os testes de emissão, aprovação, atualização de perfil e worker que dependiam de PostgreSQL. | A indisponibilidade de Docker local não bloqueia mais estas tarefas; a validação integrada foi feita na CI. |
| 2026-11-26 | T026–T028 | validação local | Casos implementados e builds focais concluídos; 66/66 testes unitários dos arquivos afetados por CodeQL passaram. As integrações focais foram barradas antes das asserções pelo Docker local indisponível. | T026 exercita o ramo de chave de criptografia disponível; T027 cobre conflito único, concorrência e falha de persistência sem mutação parcial; T028 cobre payload semântico, bucket ausente e usuário desabilitado. A CI validou todos os cenários. |
| 2026-11-26 | T015 | em andamento | Run #45770954773 concluiu com todos os checks aprovados: backend HTML e JSON do gate têm 2789/3610 branches (77,26% exatos), frontend 2833/3525 (80,37%); Backend quality aprovou 1070/1070 testes da coleta e 477/477 do grupo PostgreSQL/migrações; Authentication E2E passou. | T026: validador 43/72; T027: serviço de perfil 125/153; T028: worker 70/94. Restam 99 branches backend. |
| 2026-11-26 | T029–T031 | em andamento | Tarefas derivadas do run 10: CredentialService 125/170; UsuariosController 131/170; PostgresAuthenticationThrottle 141/174. | Arquivos sob responsabilidade distintos; reavaliar saldo e lacunas no próximo `Summary.json`. |
| 2026-11-26 | T029 | concluída | Focal `CredentialServiceTests`: 42/42; cobertura focal de `FindResetUserAsync` subiu de 2/4 para 4/4 branches; `git diff --check` passou. | Adicionado sucesso de token legado sem e-mail e rejeição de token nulo/vazio. O teste do fallback de nome foi omitido por saída atualmente corrompida (`UsuÃ¡rio`), sem tocar produção. |
| 2026-11-26 | T030–T031 | implementação local concluída, CI pendente | T030: build compilou; 8 testes unitários passaram, 18 integrações bloqueadas no setup do Testcontainers. T031: build Release passou, 22 integrações descobertas, sem Docker para executar as asserções. | T030 cobre validação e respostas do cadastro público; T031 cobre admissão/limpeza com transação pré-existente e bloqueio de bucket para prazo de emissão. |
| 2026-11-26 | T029–T030 | validação unitária local | Suíte combinada de credenciais e cadastro passou 50/50, build Release incluído; `git diff --check` passou. | Integrações de T030 seguem pendentes de CI PostgreSQL; os testes de T029 são unitários e passaram localmente. |
| 2026-11-26 | T031 | correção após CI | Run #45774917722 identificou uma asserção incorreta em `EmissionDeadlineCannotBeStagedForAnUnlockedBucket`: esperava zero buckets após uma admissão válida, mas o contrato confirma o placeholder antes de abrir o lease. A asserção agora verifica bucket correto, `Count = 0`, `NextEmissionAt = null` e capacidade 1 após rejeitar o estágio para chave não bloqueada; build Release e `git diff --check` passaram. | A execução local do teste focal parou antes das asserções pela indisponibilidade de Docker. A nova CI deve validar T030/T031 e produzir o próximo artefato oficial; o run 45774917722 não gerou Summary de backend válido porque a suíte terminou com 1 falha em 1080 testes. |
| 2026-11-26 | T030–T031 | concluídas | Backend quality passou no run #45776498924 após correção da asserção de T031; 481/481 testes PostgreSQL/migrações e 1080/1080 testes com cobertura passaram. `Summary.json` e `backend-coverage.json` têm ambos 2802/3610 branches no SHA `c8d535a75f9a54186bb0ddf8c8df48ad673d6f10`; Coverage policy passou a 70%; todos os checks do Container CI passaram. | A meta backend de 80% (2888/3610) ainda não foi atingida: restam 86 branches. T032–T034 foram selecionadas no mesmo artefato e iniciadas em arquivos sem sobreposição. |
| 2026-11-26 | T032–T034 | implementação local concluída; CI pendente | Filtros focais: T032 21/21; T033 23/23; T034 46/46; filtro combinado da onda 90/90; `git diff --check` passou. | Classes dos recortes locais: EmailController 37/44, AuditoriaService 45/52 e AuthController 74/82; os denominadores não são comparáveis ao Summary da suíte completa. A próxima CI deverá confirmar qualidade e recalcular o saldo por `Summary.json`. |
| 2026-11-25 | T001 | concluída | Coletor 9, workflow 14 e gate 8 testes passaram; `git diff --check` passou; [baseline](./evidencias/baseline.md) | JSON backend passa a usar 2521/3610 do `Summary.json`; baseline abaixo do gate de 70%, aguardando aumento de cobertura e CI nova. |
| 2026-11-25 | T002 | concluída | Vitest focado: 2 arquivos, 27 testes passaram; `FormQuimicos.tsx` 68/84 branches (80,95%); `git diff --check` passou. | Teste de caracterização do retorno de foco após cancelar confirmação de validade; RED foi lacuna de cobertura, sem falha fabricada. |
| 2026-11-25 | T003 | concluída | Vitest focado: 2 arquivos, 30 testes passaram; `nav-main.tsx` 28/31 branches (90,32%), `nav-secondary.tsx` 47/48 (97,91%); `git diff --check` passou. | Baseline focal: 0/31 e 27/48; acrescentados cenários observáveis de navegação e notificações. |
| 2026-11-25 | T004 | concluída | Vitest focal: 2 arquivos, 27 testes passaram; `NotificationIcon.tsx` 53/57 branches (92,98%); ESLint, Prettier e `git diff --check` passaram. | Baseline focal 26/57 (45,61%); testados ícones, cores, contador, teclado e data inválida. |
| 2026-11-25 | T005 | concluída | Vitest focal: 2 arquivos, 32 testes passaram; `SidebarNotificationButton.tsx` 44/45 branches (97,77%); ESLint e `git diff --check` passaram. | Baseline 24/45 (53,33%); ramo residual depende de evento opcional não acionado pela interface atual. |
| 2026-11-25 | T006 | concluída | Vitest focal: 2 arquivos, 28 testes passaram; `SimpleNotificationIcon.tsx` 44/45 branches (97,77%); ESLint, Prettier e `git diff --check` passaram. | Baseline 24/45 (53,33%); ramo residual depende de evento em handler não invocado dessa forma pela interface. |
| 2026-11-25 | T007 | concluída | Vitest focal isolado: 14/14 testes passaram; `Auditoria.tsx` 100/120 branches (83,33%); ESLint, `npx tsc -b` e `npm run build` passaram. | `npm run build` inicialmente revelou três incompatibilidades de tipo na fixture/assertivas; corrigidas sem tocar produção. Build concluiu com avisos de recursos e tamanho de chunks do Vite/Rollup. |
| 2026-11-25 | T008 | concluída | Testes focais com `--artifacts-path .tmp/T008`: 23/23 passaram; `AuthController.ChangePassword` 7/7 e `CredentialService.ChangePasswordAsync` 21/26 branches; `git diff --check` passou. | Testes de login inválido dependem de Docker e não foram executados localmente; CI deve validá-los. Os cinco arquivos versionados de `backend/Tests/obj` foram restaurados após cessarem os builds. |
| 2026-11-25 | T009 | concluída | Recorte focal: 49/49 testes passaram; `AuthenticationProtectionOptionsValidator` 83,07% e `AuthenticationProtectionTelemetry` 96%; `git diff --check` passou. | Na suíte ampla, 441/457 passaram; 16 integrações falharam por Docker/npipe indisponível. A CI em T015 deve confirmar as integrações e o ganho no `Summary.json` oficial. |
| 2026-11-26 | T009 | em andamento | Run #45755998172 registrou 1035/1037 testes backend e falhou em dois casos: T018 e `AuthenticationProtectionTelemetryTests.MapsEveryRemainingDeliveryResultToItsBoundedTag`. | Reaberta para impedir que o listener global do teste capture medições emitidas por outras coleções paralelas. A alteração deve permanecer nos testes de telemetria e preservar a métrica e as tags esperadas. |
| 2026-11-26 | T009 | em andamento | O listener passou a pertencer a uma coleção xUnit não paralela; as teorias também conferem nome da métrica e tags exatas. Testes focais: 15/15; compilação sem novos analyzers; `git diff --check` passou. | Validação no CI completo pendente; ambiente local usa SDK 10.0.401 pois 8.0.428 não está instalado. |
| 2026-11-25 | T010 | concluída | Testes focais: 33/33 passaram; `RecoveryPayloadProtector` subiu de 47,5% para 92,5% no recorte comparável; `git diff --check` passou. | As integrações de repositório/worker exigem PostgreSQL via Docker indisponível localmente; T015/CI confirma a suíte completa e o `Summary.json`. |
| 2026-11-26 | T011 | concluída | Recorte unitário 42/42; `UsuarioService` 70,58%→85,29%, `UsuariosController` 35,71%→50%; build e `git diff --check` passaram. | O primeiro run da PR confirmou que autoedição de `status` retorna 403; teste alinhado ao contrato e agora verifica estado inalterado. Integrações precisam de CI. |
| 2026-11-26 | T012 | concluída | Testes focais passaram de 47/47 para 67/67; `NotificacaoService` 47,36%→71,05% no recorte comparável; `git diff --check` passou. | Datas e empréstimo vencido usam relógio fixo. Testes de quota e integrações dependentes de PostgreSQL serão validados pela CI/T015. |
| 2026-11-26 | T013 | concluída | Build Release de `Tests.csproj` passou (99 avisos preexistentes, 0 erros); recorte focal 107/107; `git diff --check` passou. `ApiDateFilters` 93,93%, `ProdutoService` 57,22%, `LoanDomainRules` 92,85% e `DecidirEmprestimoAsync` 85,71% nos recortes descritos. | Testes de devolução/LoanReturnService dependem da fixture PostgreSQL/Docker e ficam para CI/T015. `backend/Tests/bin` e `obj` limpos. |
| 2026-11-25 | T014 | concluída | Verificação textual e `git diff --check` passaram no README e na Wiki. | Documentadas meta 80%, gate 70%, cobertura de linhas informativa e contagens backend do `Summary.json`, compartilhadas com gate/badge. |
| 2026-11-26 | T015 | em andamento | Run #45749677986, SHA `4a42688`: frontend 2833/3525 (80,37%); backend 2702/3610 (74,85%). `backend-coverage.json` coincide exatamente com o `Summary.json`; `Coverage policy` aprovou o gate de 70%. Recorte dos ajustes do quality baseline: 101/101 testes passaram localmente. | Backend ainda está abaixo da meta de 80%; foram derivadas T016–T019 a partir das lacunas do artefato. O baseline de qualidade do SHA falhou por 14 avisos em testes, corrigidos localmente. Aguardando novo run após a onda focal; [evidências T015](./evidencias/T015.md). |
| 2026-11-26 | T015 | em andamento | Run #45753232263, SHA `47b4070`: baseline de qualidade passou; backend 453/454 testes passaram. Run #45754389872, SHA `5ea2132`: T018 falhou de novo; frontend ficou em 2833/3525 branches (80,37%). | O Browser security E2E ficou inconclusivo por uma entrada concorrente extra no access log; os seis testes Playwright passaram e o ZAP não reportou alertas. Como a suíte backend não passou, o artefato backend e uma medida válida para T015 não foram publicados. |
| 2026-11-26 | T015 | em andamento | Run #45755998105, head `615bfda`, identidade do artefato `81da75c98788f82706b39949f3fa3ed09d51af43`: frontend 2833/3525 branches (80,37%); Backend quality falhou com 2/1037 testes e `Coverage policy` marcou backend como inválido por ausência do JSON. | Browser security E2E passou. As falhas do backend foram T018 e o isolamento de `AuthenticationProtectionTelemetryTests`; T009 foi reaberta para a segunda. O resultado não fornece uma medida de branches backend. |
| 2026-11-26 | T016 | concluída | `CredentialServiceTests`: 31/31 passaram com cobertura; `git diff --check` passou e não surgiram novos avisos de analyzer no arquivo. | Cobertos pedidos sem e-mail, conta desconhecida/desabilitada, validade/identidade/hash do token, confirmação/política de senha e precondição transacional. A medida focal não substitui a do `Summary.json`; será reavaliada no run oficial seguinte. |
| 2026-11-26 | T017 | concluída | `AuthControllerCoverageTests`: 15/15 passaram; junto a `AuthChangePasswordTests`, 26/26. O SARIF local não apontou alertas no novo arquivo e `git diff --check` passou. | Cenários cobrem Login, Session, Logout e Renew; sem alteração em produção. A medida focal não substitui a do `Summary.json`; será reavaliada no run oficial seguinte. |
| 2026-11-26 | T018 | em andamento | Runs #45753232263, #45754389872 e #45755998105 falharam no caso de capacidade cheia: esperava 429, recebeu 204. Diagnóstico: concluir a tentativa sintética como Accepted deixava Count=0 e o throttle removia o placeholder; o teste agora completa como Failure e confirma Count=1, janela ativa, capacidade=1, chave da conta 42 ausente e sessão como usuário 42. Build Release passou com 0 erros e `git diff --check` passou. | O teste focal local foi impedido pela indisponibilidade do Docker/Testcontainers (`npipe://./pipe/docker_engine`); o novo caso aguarda CI para confirmar 429, `Retry-After` e ausência de mutação. |
| 2026-11-26 | T019 | concluída | `AuthenticationProtectionStartupCleanupTests`: 1/1 passou localmente. No run #45753232263, a suíte PostgreSQL teve 453/454 casos aprovados e sua única falha listada foi T018; os quatro casos de T019 passaram. | `Start/Stop` repetido e limpeza sem conexão cobertos; `git diff --check` passou e não houve alerta de analyzer no arquivo. |
| 2026-11-26 | T009 | concluída | No run #45758251729, todos os testes backend passaram; o isolamento xUnit evitou captura paralela de medições, sem relaxar a asserção de nome/tags. | Evidência de integração aprovada; 15/15 testes focais também passaram localmente. |
| 2026-11-26 | T018 | concluída | No run #45758251729, todos os testes backend passaram após o throttle real ocupar a vaga com tentativa `Failure`. | Confirmação integrada do resultado 429 e ausência das falhas anteriores de T018; build Release e `git diff --check` já haviam passado localmente. |
| 2026-11-26 | T020 | concluída | RED: baseline `CredentialService` 120/170 no Summary oficial e `ResetPasswordWithoutThrottleAsync` 8/22 local. GREEN: 39/39 testes; método 17/22, `HasValidResetToken` 2/2 e `PasswordResetTokensMatch` 6/6; `git diff --check` passou. | Só testes foram alterados. Os casos relacionais permanecem para validação integrada; sem novos avisos de analyzer nos métodos incluídos. |
| 2026-11-26 | T022 | concluída | Três casos de aprovação adicionados; a suíte backend passou na CI run #45767363080. Build Release e `git diff --check` passaram. | Testcontainers local não estava disponível; a validação PostgreSQL foi concluída na CI. |
| 2026-11-26 | T023 | concluída | Um cenário de administrador com status inválido foi compilado; a suíte backend passou na CI run #45767363080. Build Release e `git diff --check` passaram. | Testcontainers local não estava disponível; a validação PostgreSQL foi concluída na CI. |
| 2026-11-26 | T021 | concluída | Quatro cenários (seis casos) de emissão, inelegibilidade, rollback e requisito transacional adicionados; a suíte backend passou na CI run #45767363080. | Testcontainers local não estava disponível; a validação PostgreSQL foi concluída na CI. |
| 2026-11-26 | T025 | concluída | Baseline de login 2/2; novos testes focais 2/2 com cobertura, `git diff --check` passou e não houve analyzer novo. | Caracterizados identificador inválido e falha de leitura do segredo de proteção, incluindo 503, `no-store` e ausência de consulta/criação de sessão. O cenário de cancelamento foi removido porque InMemory não reproduz fielmente o contrato PostgreSQL. |
| 2026-11-26 | T024 | concluída | Quatro cenários (expiração, JSON malformado, payload criptográfico ilegível e cancelamento) adicionados; a suíte backend passou na CI run #45767363080. Build Release e `git diff --check` passaram. | Testcontainers local não estava disponível; a validação PostgreSQL foi concluída na CI. |
| 2026-11-26 | T015 | em andamento | Run #45758251729, head `eab7b7d8`, identidade `8b4fef0b451a50aa44a79af32893b131632a3def`: frontend 2833/3525 (80,37%); backend 2754/3610 (76,29%). JSON do gate e Summary HTML coincidem; a execução completa da Container CI e o gate de 70% passaram. | Faltam 134 branches backend para a meta. T009/T018 concluídas após confirmação pela suíte integral. T020–T024 derivadas das lacunas do mesmo artefato; [evidências T015](./evidencias/T015.md). |
