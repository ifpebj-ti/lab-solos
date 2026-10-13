# Tarefas: Proteção de acesso, autenticação e frontend

- Status: em execução
- PRD: `./prd.md`
- Especificação técnica: `./techspec.md`
- Atualizado em: 2026-10-13
- Validações de descoberta e design: confirmadas
- Escopo: 30 tarefas para as cinco issues abertas do recorte aprovado.
- Implementação: execução orquestrada iniciada em 2026-10-13; as cinco issues permanecem abertas até o aceite remoto previsto em T030.

## Contrato de execução

Cada tarefa exige leitura integral do PRD e da especificação técnica. Executar exatamente uma por chamada de `execute-task`; orquestração futura só acontece quando solicitada. Não ampliar arquitetura ou regras de produto para compensar uma dependência incompleta.

A **Issue de execução** é a associação singular a usar na skill de execução. Tarefas transversais têm uma issue principal explícita; isso não significa que resolvam somente aquela issue. A matriz abaixo relaciona os critérios e componentes de todas as issues. Não criar issues adicionais, atribuir responsáveis, mudar Project ou fechar issues durante este planejamento. Na execução, manter o item em andamento enquanto houver tarefa ou aceite pendente; o aceite após publicação de T030 também é necessário para concluir cada uma das cinco issues.

### Posse de arquivos e paralelismo

Os caminhos indicados são relativos à raiz e representam **escrita de fontes**; contratos existentes fora desses caminhos podem ser lidos. Cada tarefa também possui exclusivamente `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/<ID>/**`, para comandos, falha inicial, resultados e limitações sanitizados. Não modificar testes de outra tarefa para contornar falha: devolver correção à tarefa proprietária.

Migrações e snapshot pertencem somente a T006. Alterações repetidas de controllers, `Program.cs`, registros DI e adaptadores foram ordenadas no DAG. Arquivos novos nas listas abaixo são entregáveis planejados, não pré-requisitos que já existem.

As ondas são uma agenda conservadora. Uma onda só inicia depois da anterior validada; não liberar uma tarefa futura somente porque não aparenta conflito. Dentro de ondas com vários itens, execução simultânea exige **checkouts isolados por tarefa**, com `bin/obj`, `node_modules`, `dist`, relatórios e projetos Docker próprios; não compartilhar diretórios gerados ou banco mutável de testes. No checkout compartilhado, serializar compilação, instalação, testes e edição. A coluna de segurança não autoriza criar branches, publicar ou delegar agora.

Somente tarefas sem dependência são marcadas `Paralela: sim` neste estado inicial. As demais estão `não` até o responsável confirmar dependências concluídas, posse sem conflito e ambiente isolado; então pode habilitar os itens de uma mesma onda. Em execução orquestrada, `tasks.md` e o log são controlados exclusivamente pelo orquestrador; subagentes só entregam evidências de sua tarefa. Sem orquestração, o executor atualiza o registro de forma serial.

### Comandos e evidências

- Comandos `dotnet`, `docker`, `python` e PowerShell partem da raiz; comandos `npm.cmd` partem de `frontend`. Na CI Linux, usar `npm` no lugar de `npm.cmd`.
- Preparação de backend: `dotnet restore backend/backend.sln --locked-mode`. Preparação de frontend: `npm.cmd ci`. Preservar locks; nenhuma tarefa prevê trocar versões da pilha.
- Após cada tarefa que altera backend, compilar com `dotnet build backend/backend.sln -c Release --nologo --disable-build-servers`; executar a regressão direcionada indicada. Nas tarefas frontend, lint e build constam explicitamente.
- Filtros de classes/arquivos novos só passam a existir quando a própria tarefa cria os testes. Exigir número de testes executados maior que zero; resultado sem testes não é GREEN.
- Falha de Docker, compilação acidental, arquivo ausente ou autenticação de ferramenta não vale como RED comportamental. Para infraestrutura/documentação, registrar a verificação objetiva e sua limitação; para comportamento já correto, registrar caracterização, sem fabricar falha.
- Confirmar Docker ativo antes das tarefas relacionais/E2E. Na análise anterior o daemon estava indisponível; não declarar integração aprovada com esse impedimento.
- Não versionar arquivos preenchidos de segredos, artefatos de build ou traces com tokens/códigos. T029 consolida evidências locais; T030 depende de publicação autorizada externa ao plano.

## Ondas de execução

| Onda | Tarefas | Motivo de segurança do paralelismo |
|---|---|---|
| 1 | T001, T002, T003, T005 | Infraestrutura de teste, opções/chaves, política de recurso e modelo de erros possuem fontes independentes. |
| 2 | T004, T006, T007, T008 | Cifragem, migração, auditoria e GETs de usuários têm posse disjunta; nenhuma migração concorrente. |
| 3 | T009, T010, T011, T013, T014 | Cotas, repositório de fila, consultas de empréstimos, configuração de IP/CORS e telemetria usam componentes distintos. |
| 4 | T012, T015, T023 | PATCH da API, consumidores de acompanhamento e política Caddy não compartilham fontes. |
| 5 | T016, T020 | Login backend e formulário próprio frontend usam contratos já assentados, sem arquivos comuns. |
| 6 | T017, T021 | Admissão de recuperação backend e espera de formulários frontend usam contratos de erro já definidos. |
| 7 | T018 | Worker altera serviço de credenciais e registros compartilhados; execução exclusiva. |
| 8 | T019 | Redefinição altera serviço de credenciais/controller após o worker; execução exclusiva. |
| 9 | T022 | Bootstrap e Composes só mudam após integração dos dois fluxos; execução exclusiva. |
| 10 | T024 | Projeto Playwright, helpers e composição do proxy são infraestrutura compartilhada; execução exclusiva. |
| 11 | T025, T026 | Jornadas/seed de autenticação e testes/política do proxy têm arquivos distintos e stacks isolados. |
| 12 | T027, T028 | Gate/contratos de CI e documentação/manual não compartilham fontes. |
| 13 | T029 | Validação cruzada e consolidação de evidências locais são serializadas. |
| 14 | T030 | Aceite remoto condicionado a publicação autorizada, realizado separadamente do aceite local. |

## Associação das issues

| Issue | Resultado e tarefas principais | Condição complementar |
|---|---|---|
| #436 | T003, T007, T008, T011, T012, T015, T020 e T025: autorização, privacidade e perfil próprio | Infraestrutura T001/T006/T010 e aceite T028–T030 |
| #437 | T002, T005, T009, T013, T014, T016, T021 e T022: cotas do login e espera | Integração T025/T029 e aceite remoto T030 |
| #438 | T004, T006, T010, T017, T018 e T019: recuperação protegida e fila durável | Registros T007/T014, ambientes T022 e aceite T025/T028–T030 |
| #439 | T023, T024, T026 e T027: CSP efetiva e teste de proxy pré-merge | Documentação T028 e evidência publicada T030 |
| #440 | T013, T022, T024 e T026: CORS por ambiente e confiança no proxy | Dependência do gate T027 e evidência publicada T030 |

## T001 — Preparar testes relacionais PG15 e controle determinístico

- Status: concluída
- Issue de execução: #437
- Onda: 1
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RNF-002, RNF-003, CA-025
- Caminhos sob responsabilidade: `backend/Tests/Infrastructure/**`, `backend/Tests/Integration/AuthenticationProtectionHarnessTests.cs`
- Evidências exclusivas: `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T001/**`

### Escopo

Acrescentar fixture PG15 sem remover a PG16, criação por MigrateAsync, relógio compartilhado, transporte simulado e execução controlável de trabalhadores. Preparar cenários isolados com dois mentores, dois mentorados, administrador e chaves sintéticas para testes futuros; permitir duas factories no mesmo banco.

### Critérios de conclusão

Demonstrar migração e isolamento entre cenários, compartilhamento deliberado entre duas factories e ausência de SMTP real. Não introduzir controles de produção. Registrar evidências e regressão pertinentes antes de marcar concluída.

### Plano TDD

- RED: Verificação objetiva de infraestrutura: teste novo de criação via migrações/duas factories não dispõe hoje do suporte necessário; caracterizar primeiro o suporte existente, sem quebrá-lo.
- GREEN: Implementar somente os auxiliares de teste e opções sintéticas.
- REFACTOR: Separar preparação de banco, tempo e transporte; repetir testes de infraestrutura existentes.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~AuthenticationProtectionHarnessTests|FullyQualifiedName~PostgreSqlApplicationSmokeTests|FullyQualifiedName~CriticalScenarioIsolationTests"`

### Notas

Pré-requisito específico: xUnit/Vitest/Playwright já existem. Não reinstalar um executor de frontend. Docker ativo é condição para validar esta tarefa.

## T002 — Definir configuração e chaves de cotas sem alterar identidade

- Status: concluída
- Issue de execução: #437
- Onda: 1
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-005, RF-007, RF-008, RNF-001, RNF-002, RNF-003, CA-011, CA-027
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Services/Security/AuthenticationProtectionOptions.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/ThrottleKeyFactory.cs`, `backend/Tests/Security/AuthenticationProtectionOptionsTests.cs`, `backend/Tests/Security/ThrottleKeyFactoryTests.cs`
- Evidências exclusivas: `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T002/**`

### Escopo

Definir portas e opções com valores/limites da techspec; HMAC por finalidade/ambiente, normalização só de cotas, IP canônico e chave conservadora quando ausente. Validar arquivos secretos por interfaces testáveis; registro global em T022.

### Critérios de conclusão

Cobrir caixa/espaços, IPv4 mapeado, preservação de pontos/+ e separação entre chave de entrega exata e cota normalizada; invalidar opções/chaves impróprias sem imprimir valores. Registrar evidências e regressão pertinentes antes de marcar concluída.

### Plano TDD

- RED: Testar que representações equivalentes não geram cotas distintas e configuração inválida é recusada; interfaces mínimas devem compilar antes do RED comportamental.
- GREEN: Implementar normalização, fábrica de HMAC e validador autoritativo.
- REFACTOR: Eliminar duplicação sem modificar igualdade de busca de contas.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~AuthenticationProtectionOptionsTests|FullyQualifiedName~ThrottleKeyFactoryTests"`

### Notas

Preservar alterações do usuário e os contratos aprovados; executar somente este escopo.

## T003 — Centralizar predicados de acesso a usuários e empréstimos

- Status: concluída
- Issue de execução: #436
- Onda: 1
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-001, RF-002, RF-003, RF-004, CA-001, CA-002, CA-003, CA-008
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Services/Security/UserResourceAccessService.cs`, `backend/Tests/Security/UserResourceAccessTests.cs`
- Evidências exclusivas: `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T003/**`

### Escopo

Criar política reutilizável de titular/Administrador/Mentor vinculado, incluindo empréstimo por solicitante/aprovador/vínculo. Sem alterar controllers nesta tarefa.

### Critérios de conclusão

Matriz unitária completa com dois vínculos, papéis não suportados e identidade ausente; política não concede permissões por ID do cliente. Registrar evidências e regressão pertinentes antes de marcar concluída.

### Plano TDD

- RED: Teste compilável de decisão deve negar cruzamento entre dois mentorados e mentor sem vínculo; caracterizar decisões seguras existentes.
- GREEN: Implementar predicados explícitos e resolução de subject validado.
- REFACTOR: Compartilhar apenas regras de recurso, preservando política de troca obrigatória.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~UserResourceAccessTests"`

### Notas

Preservar alterações do usuário e os contratos aprovados; executar somente este escopo.

## T004 — Cifrar payloads de recuperação com chaves versionadas

- Status: concluída
- Issue de execução: #438
- Onda: 2
- Dependências: T002
- Paralela: não
- Requisitos: RF-009, RNF-001, RNF-003, CA-026, CA-027
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Services/Security/RecoveryPayloadProtector.cs`, `backend/Tests/Security/RecoveryPayloadProtectorTests.cs`
- Evidências exclusivas: `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T004/**`

### Escopo

Implementar AES-256-GCM do framework, nonce novo, tag de 16 bytes, dados associados e chave operacional compartilhada versionada. Não criar fila nem emitir código ainda.

### Critérios de conclusão

Round-trip, alteração de nonce/tag/ciphertext/ID, chave ausente, seleção ativa e leitura com chave anterior comprovados; logs não contêm plaintext. Registrar evidências e regressão pertinentes antes de marcar concluída.

### Plano TDD

- RED: Adulteração de payload/identidade deve falhar; teste com interface mínima sem cifra adequada demonstra a lacuna.
- GREEN: Implementar proteção e leitura de mapa de chaves por arquivo/interface.
- REFACTOR: Isolar formato e finalidade; limpar buffers quando possível e evitar mensagens com segredos.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~RecoveryPayloadProtectorTests"`

### Notas

Preservar alterações do usuário e os contratos aprovados; executar somente este escopo. Paralelismo só pode ser habilitado após dependências concluídas e isolamento conforme o contrato de execução.

## T005 — Preservar 429 e tempo de espera no modelo de erros da UI

- Status: concluída
- Issue de execução: #437
- Onda: 1
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-004, RF-006, RF-008, RNF-004, CA-013
- Caminhos sob responsabilidade: `frontend/src/errors/**`, `frontend/src/components/global/ErrorFeedback.tsx`, `frontend/src/components/global/ErrorFeedback.test.tsx`
- Evidências exclusivas: `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T005/**`

### Escopo

Acrescentar rate_limited, retryAfterSeconds, leitura segura de Retry-After segundos/data e extensão validada, mensagem/ação acessível sem retry automático. Não editar os formulários neste passo. Incluir o código profile_update_conflict e a associação do campo transitório senhaAtual aos erros de confirmação.

### Critérios de conclusão

429 não vira unknown; metadados de espera atravessam normalização/apresentação; cabeçalhos inválidos produzem orientação genérica; 401/403/404 mantêm navegação segura. Registrar evidências e regressão pertinentes antes de marcar concluída.

### Plano TDD

- RED: normalizeError hoje classifica 429 como unknown; escrever teste que exige rate_limited e preservação da espera.
- GREEN: Implementar categoria, catálogo e propagação de metadados.
- REFACTOR: Manter sanitização e API estável dos demais erros; não copiar corpo arbitrário.

### Validação

- `npm.cmd run test -- --run src/errors src/components/global/ErrorFeedback.test.tsx`
- `npm.cmd run lint`
- `npm.cmd run build`

### Notas

Preservar alterações do usuário e os contratos aprovados; executar somente este escopo.

## T006 — Criar persistência aditiva de proteção e unicidade de e-mail

- Status: concluída
- Issue de execução: #438
- Onda: 2
- Dependências: T001, T002
- Paralela: não
- Requisitos: RF-003, RF-005, RF-007, RF-008, RF-009, RNF-002, RNF-003, CA-007, CA-025, CA-027
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Models/AuthenticationThrottleBucket.cs`, `backend/LabSolos-Server-DotNet8/Models/AuthenticationProtectionCapacity.cs`, `backend/LabSolos-Server-DotNet8/Models/PasswordRecoveryJob.cs`, `backend/LabSolos-Server-DotNet8/Data/Context/AppDbContext.cs`, `backend/LabSolos-Server-DotNet8/Data/Migrations/**`, `backend/Tests/Integration/AuthenticationProtectionMigrationTests.cs`, `backend/Tests/Data/CredentialLifecycleMigrationTests.cs`, `backend/Tests/Data/UserDataMigrationTests.cs`, `backend/Tests/Integration/LoanReturnMigrationTests.cs`
- Evidências exclusivas: `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T006/**`

### Escopo

Implementar AuthenticationProtection, snapshot, constraints/índices e contador de capacidade. Índice Email usa igualdade exata; diagnóstico sanitizado de duplicações aborta sem mesclar/excluir usuários. Atualizar a caracterização das migrações preexistentes para incluir a nova migração.

### Critérios de conclusão

Banco vazio e atualizado migram preservando usuários; duplicação exata é rejeitada sem perda de dados; campos e unicidade de trabalhos ativos correspondem à techspec. Registrar evidências e regressão pertinentes antes de marcar concluída.

### Plano TDD

- RED: Teste de migração exige estruturas/índice inexistentes; diferenciar essa verificação de testes posteriores do abuso.
- GREEN: Adicionar uma única migração e modelos; revisar SQL idempotente.
- REFACTOR: Consolidar configuração EF sem reescrever histórico; não aplicar migração em produção.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~AuthenticationProtectionMigrationTests|FullyQualifiedName~CredentialLifecycleMigrationTests"`
- `dotnet tool restore`
- `dotnet ef migrations script --idempotent --project backend/LabSolos-Server-DotNet8/LabSolos-Server-DotNet8.csproj --startup-project backend/LabSolos-Server-DotNet8/LabSolos-Server-DotNet8.csproj --context AppDbContext --output .tmp/authentication-protection.sql`

### Notas

Criar .tmp antes do comando se ausente. Esta tarefa é a única proprietária de migrações/snapshot. Paralelismo só pode ser habilitado após dependências concluídas e isolamento conforme o contrato de execução.

## T007 — Eliminar dados pessoais e credenciais da auditoria afetada

- Status: concluída
- Issue de execução: #436
- Onda: 2
- Dependências: T001
- Paralela: não
- Requisitos: RNF-001, RNF-003, CA-026
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Middlewares/AuditoriaMiddleware.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/CredentialTelemetry.cs`, `backend/LabSolos-Server-DotNet8/Filters/ApiLoggingFilter.cs`, `backend/Tests/Middlewares/AuditoriaMiddlewareTests.cs`, `backend/Tests/Security/AuthenticationAuditPrivacyTests.cs`
- Evidências exclusivas: `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T007/**`

### Escopo

Substituir registro pessoal nas rotas abrangidas por evento sanitizado; omitir bodies, queries, Cookie, IP, User-Agent, IDs e caminho interpolado. Impedir cookies/segredos nas demais rotas sem redesenhar auditoria; retirar ID da telemetria de credenciais afetada.

### Critérios de conclusão

Canários de senha, JWT, código, e-mail, IP e cookie ausentes de logs e banco; eventos agregados continuam observáveis. Registrar evidências e regressão pertinentes antes de marcar concluída.

### Plano TDD

- RED: Teste de canários expõe code/token/cookie e identificadores hoje gravados.
- GREEN: Aplicar lista explícita de finalidades e registros seguros.
- REFACTOR: Separar classificação de rota da captura; não substituir vazamento por exceção completa.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~AuthenticationAuditPrivacyTests|FullyQualifiedName~AuditoriaMiddlewareTests"`

### Notas

Preservar alterações do usuário e os contratos aprovados; executar somente este escopo. Paralelismo só pode ser habilitado após dependências concluídas e isolamento conforme o contrato de execução.

## T008 — Autorizar perfis, listagens e dependentes na API

- Status: concluída
- Issue de execução: #436
- Onda: 2
- Dependências: T001, T003
- Paralela: não
- Requisitos: RF-001, RF-002, RF-004, RNF-001, RNF-004, CA-001, CA-002, CA-003, CA-004, CA-008
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Usuarios/UsuarioAcompanhamentoDTO.cs`, `backend/LabSolos-Server-DotNet8/Mappings/UsuarioMappingProfile.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/SecurityServiceCollectionExtensions.cs`, `backend/Tests/Integration/UserResourceAuthorizationTests.cs`, `backend/Tests/Contracts/UsuarioDataContractTests.cs`
- Evidências exclusivas: `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T008/**`

### Escopo

Aplicar predicados antes da projeção aos GETs por ID/tipo/responsável. Titular/admin mantém contrato; Mentor recebe campos mínimos aprovados. Listagens de gestão exigem admin; responsável alheio retorna 404; coleção autorizada vazia retorna 200/[]; preservar aprovação/rejeição existente.

### Critérios de conclusão

HTTP com dois mentores/dois mentorados/admin demonstra 401/403/404, corpo de 404 uniforme e dados mínimos; sem regressão do resumo do responsável e da troca obrigatória. Registrar evidências e regressão pertinentes antes de marcar concluída.

### Plano TDD

- RED: GET de perfil cruzado e consulta usando ID de outro responsável retornam dados hoje; testes devem negar.
- GREEN: Integrar serviço de acesso e projeções nos GETs, com registro DI dos serviços desta tarefa.
- REFACTOR: Reutilizar respostas uniformes sem mudar cadastro/PATCH neste passo.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~UserResourceAuthorizationTests|FullyQualifiedName~UsuarioDataContractTests|FullyQualifiedName~RequiredPasswordChangeAuthorizationTests|FullyQualifiedName~CriticalUserApprovalTests"`

### Notas

Preservar alterações do usuário e os contratos aprovados; executar somente este escopo. Paralelismo só pode ser habilitado após dependências concluídas e isolamento conforme o contrato de execução.

## T009 — Implementar cotas PostgreSQL com capacidade e concorrência

- Status: concluída
- Issue de execução: #437
- Onda: 3
- Dependências: T001, T002, T006
- Paralela: não
- Requisitos: RF-005, RF-007, RF-008, RNF-002, RNF-003, CA-009, CA-010, CA-011, CA-012, CA-015, CA-017, CA-025
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Services/Security/PostgresAuthenticationThrottle.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/AuthenticationThrottleClock.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/AuthenticationThrottleResult.cs`, `backend/LabSolos-Server-DotNet8/BackgroundServices/AuthenticationThrottleCleanupWorker.cs`, `backend/Tests/Integration/SharedAuthenticationThrottleTests.cs`
- Evidências exclusivas: `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T009/**`

### Escopo

Implementar seis espaços, alocação curta, bloqueios ordenados, relógio de banco, renovação não deslizante, NextEmissionAt, capacidade exata e limpeza. Expor transação de tentativa para consumidores; não ligar endpoints ainda.

### Critérios de conclusão

Duas instâncias não excedem cota/capacidade; sucesso não limpa IP; pedido negado não amplia prazo; corrida alocação/limpeza segura; capacidade/timeout/indisponibilidade negam sem verificar credenciais. Registrar evidências e regressão pertinentes antes de marcar concluída.

### Plano TDD

- RED: Testes simultâneos demonstram excesso com contador não atômico; começar com contrato executável de orçamento/capacidade.
- GREEN: Implementar SQL parametrizado e transações conforme techspec, com limpeza que respeita todos os prazos ativos.
- REFACTOR: Isolar SQL e resultados; documentar ordem dos locks e cancelamento.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~SharedAuthenticationThrottleTests"`

### Notas

Não usar EF InMemory como evidência de locking; não modificar modelos/migrações já pertencentes a T006. Paralelismo só pode ser habilitado após dependências concluídas e isolamento conforme o contrato de execução.

## T010 — Reservar e retomar trabalhos duráveis de recuperação

- Status: concluída
- Issue de execução: #438
- Onda: 3
- Dependências: T001, T004, T006
- Paralela: não
- Requisitos: RF-007, RF-009, RNF-001, RNF-002, RNF-003, CA-015, CA-025, CA-026
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Repositories/PasswordRecoveryJobRepository.cs`, `backend/Tests/Integration/RecoveryJobRepositoryTests.cs`
- Evidências exclusivas: `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T010/**`

### Escopo

Implementar inserção/coalescência por DeliveryKeyHash exata, capacidade de 5.000 trabalhos, seleção SKIP LOCKED, LeaseId/LeaseUntil, confirmação condicional, cancelamento por usuário e limpeza de payload. Contratos permitem usar a transação externa de admissão.

### Critérios de conclusão

Uma reserva válida não é duplicada; processo antigo não confirma lease perdida; retomada mantém payload/código; contas de caixa distinta não têm trabalhos fundidos; fila cheia não cresce. Registrar evidências e regressão pertinentes antes de marcar concluída.

### Plano TDD

- RED: Teste de duas reservas concorrentes deve impedir entrega simultânea; caracterizar persistência existente antes do RED novo.
- GREEN: Implementar repositório com SQL parametrizado e cifra de T004.
- REFACTOR: Compartilhar condições de estado/expiração sem introduzir SMTP.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~RecoveryJobRepositoryTests"`

### Notas

Preservar alterações do usuário e os contratos aprovados; executar somente este escopo. Paralelismo só pode ser habilitado após dependências concluídas e isolamento conforme o contrato de execução.

## T011 — Restringir consultas de empréstimos e projeções do acompanhamento

- Status: concluída
- Issue de execução: #436
- Onda: 3
- Dependências: T001, T003, T008
- Paralela: não
- Requisitos: RF-001, RF-002, RF-004, RNF-001, RNF-004, CA-002, CA-003, CA-004, CA-008
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Controllers/EmprestimosController.cs`, `backend/LabSolos-Server-DotNet8/Mappings/EmprestimoMappingProfile.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Emprestimos/EmprestimoAcompanhamentoDTO.cs`, `backend/Tests/Integration/LoanResourceAuthorizationTests.cs`, `backend/Tests/Contracts/LoanPrivacyContractTests.cs`
- Evidências exclusivas: `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T011/**`

### Escopo

Proteger consultas usuario/solicitados/aprovados/detalhe usadas pelo histórico e aplicar projeções não recursivas. Preservar acesso do solicitante/aprovador/admin e mentor vinculado conforme tabela de APIs.

### Critérios de conclusão

ID forjado não expõe empréstimos; DTO não carrega relações privadas; exportação/verificação autorizadas mantêm dados necessários; mutações de estoque não são alteradas. Registrar evidências e regressão pertinentes antes de marcar concluída.

### Plano TDD

- RED: Leitura de empréstimos do mentorado de outro Mentor hoje permite acesso; teste HTTP deve negar404.
- GREEN: Aplicar política na consulta e projeção mínima necessária.
- REFACTOR: Evitar pré-checagem no frontend como única barreira e preservar comportamento de decisão/devolução.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~LoanResourceAuthorizationTests|FullyQualifiedName~LoanPrivacyContractTests|FullyQualifiedName~CriticalLoanCreationTests|FullyQualifiedName~CriticalLoanDecisionTests"`

### Notas

Preservar alterações do usuário e os contratos aprovados; executar somente este escopo. Paralelismo só pode ser habilitado após dependências concluídas e isolamento conforme o contrato de execução.

## T012 — Proteger PATCH e troca própria de e-mail de forma atômica

- Status: concluída
- Issue de execução: #436
- Onda: 4
- Dependências: T001, T003, T006, T008, T010
- Paralela: sim
- Requisitos: RF-003, RF-004, RNF-001, RNF-004, CA-005, CA-006, CA-007, CA-008
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/UserProfileUpdateService.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Usuarios/UsuarioDTOPatchRequest.cs`, `backend/LabSolos-Server-DotNet8/Mappings/UsuarioMappingProfile.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/SecurityServiceCollectionExtensions.cs`, `backend/Tests/Integration/UserProfileMutationTests.cs`
- Evidências exclusivas: `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T012/**`

### Escopo

Validar operações/paths JSON Patch, limite de 10 operações, autorização integral e senhaAtual transitória. Troca própria de e-mail requer senha correta sob lock; duplicação409; mudança limpa token anterior e cancela trabalhos sem mudar versão de sessão por contato.

### Critérios de conclusão

PATCH cruzado/misto não altera qualquer coluna; operações alternativas não contornam status; senha ausente/incorreta preserva estado; admin próprio também confirma senha; recuperação seguinte usa endereço novo. Registrar evidências e regressão pertinentes antes de marcar concluída.

### Plano TDD

- RED: PATCH de terceiro e troca própria sem senha são aceitos hoje; testes devem produzir404/400 e banco intacto.
- GREEN: Implementar serviço transacional, DTO transitório e registro DI; preservar response sem senha.
- REFACTOR: Separar autorização/validação/aplicação sem permitir commit parcial.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~UserProfileMutationTests|FullyQualifiedName~UserResourceAuthorizationTests|FullyQualifiedName~UsuarioDataContractTests"`

### Notas

Preservar alterações do usuário e os contratos aprovados; executar somente este escopo. Paralelismo só pode ser habilitado após dependências concluídas e isolamento conforme o contrato de execução.

## T013 — Resolver IP confiável e restringir CORS por ambiente

- Status: concluída
- Issue de execução: #440
- Onda: 3
- Dependências: T001, T002, T008
- Paralela: não
- Requisitos: RF-011, RF-001, RF-004, RNF-002, RNF-005, CA-022, CA-023, CA-024, CA-025
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Program.cs`, `backend/LabSolos-Server-DotNet8/Extensions/HttpContextExtensions.cs`, `backend/Tests/Extensions/HttpContextExtensionsTests.cs`, `backend/Tests/Integration/TrustedProxyTests.cs`, `backend/Tests/Integration/BrowserSecurityHeadersTests.cs`
- Evidências exclusivas: `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T013/**`

### Escopo

Substituir AllowAll por DevelopmentClients explícito; produzir Vary e expor Retry-After sem AllowCredentials. Configurar KnownProxies exatos, ForwardLimit1 e RemoteIpAddress resolvido antes da auditoria/controle; não confiar em headers arbitrários.

### Critérios de conclusão

Preflight/resposta efetiva cobrem origem permitida/arbitrária/null/ausente, métodos/headers e auth; header forjado não muda IP em remetente não confiável. Registrar evidências e regressão pertinentes antes de marcar concluída.

### Plano TDD

- RED: Origem arbitrária recebe wildcard e helper aceita XFF hoje; novos testes devem negar essas permissões.
- GREEN: Integrar política e middleware na ordem especificada com parâmetros de T002.
- REFACTOR: Consolidar leitura de IP; preservar HTTPS e políticas existentes.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~TrustedProxyTests|FullyQualifiedName~BrowserSecurityHeadersTests|FullyQualifiedName~HttpContextExtensionsTests|FullyQualifiedName~RequiredPasswordChangeAuthorizationTests"`

### Notas

Confiança na cadeia do Caddy efetivo ainda será comprovada por T026. Paralelismo só pode ser habilitado após dependências concluídas e isolamento conforme o contrato de execução.

## T014 — Emitir métricas agregadas sem identificadores pessoais

- Status: concluída
- Issue de execução: #437
- Onda: 3
- Dependências: T002, T007
- Paralela: não
- Requisitos: RNF-001, RNF-003, CA-026, CA-027
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Services/Security/AuthenticationProtectionTelemetry.cs`, `backend/Tests/Security/AuthenticationProtectionTelemetryTests.cs`
- Evidências exclusivas: `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T014/**`

### Escopo

Criar Meter e eventos previstos para acesso, cotas, capacidade, falhas e entrega. Definir tags fechadas e histogramas; consumidores são ligados nas tarefas respectivas.

### Critérios de conclusão

MeterListener e logs mostram eventos sem ID/HMAC/e-mail/IP/UUID/token; nenhuma tag de cardinalidade livre. Registrar evidências e regressão pertinentes antes de marcar concluída.

### Plano TDD

- RED: Teste exige observabilidade dos resultados, ausente hoje, e recusa dados identificáveis em tags.
- GREEN: Implementar API mínima de contagens/durações sanitizadas.
- REFACTOR: Centralizar razões públicas sem logging de exceção sensível.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~AuthenticationProtectionTelemetryTests|FullyQualifiedName~AuthenticationAuditPrivacyTests"`

### Notas

Preservar alterações do usuário e os contratos aprovados; executar somente este escopo. Paralelismo só pode ser habilitado após dependências concluídas e isolamento conforme o contrato de execução.

## T015 — Adaptar acompanhamento e propagar 404 como falha na UI

- Status: concluída
- Issue de execução: #436
- Onda: 4
- Dependências: T005, T008, T011
- Paralela: sim
- Requisitos: RF-001, RF-002, RF-004, RNF-004, CA-003, CA-004, CA-013
- Caminhos sob responsabilidade: `frontend/src/contracts/user.ts`, `frontend/src/contracts/userProfileConsumers.test.tsx`, `frontend/src/contracts/userAccompaniment.test.ts`, `frontend/src/integration/Users.ts`, `frontend/src/integration/Users.errors.test.ts`, `frontend/src/integration/Class.ts`, `frontend/src/integration/Class.errors.test.ts`, `frontend/src/pages/mentor/MentoringHistory.tsx`, `frontend/src/pages/mentor/MentoringHistory.authorization.test.tsx`, `frontend/src/pages/RegisteredUsers.errors.test.tsx`, `frontend/src/pages/ViewClass.errors.test.tsx`, `frontend/src/pages/mentor/MentoringHistory.navigation.test.tsx`, `frontend/src/pages/mentor/MentoringHistory.responsive.test.tsx`
- Evidências exclusivas: `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T015/**`

### Escopo

Adicionar schema/adaptador getUserForMentoring e trocar consumidor do Mentor. Remover 404→[] somente nos endpoints de dependentes/pendências agora protegidos; preservar semântica administrativa não alterada.

### Critérios de conclusão

DTO mínimo carrega histórico legítimo; 404 não aparece como sucesso vazio; 200/[] continua vazio; links de retorno permanecem autorizados. Registrar evidências e regressão pertinentes antes de marcar concluída.

### Plano TDD

- RED: DTO mínimo falha no academicoSchema atual e adaptadores mascaram alguns404; testes devem caracterizar ambos.
- GREEN: Implementar contratos e consumidores coordenados com API aprovada.
- REFACTOR: Reutilizar ErrorFeedback e contratos sem afrouxar getUserById completo.

### Validação

- `npm.cmd run test -- --run src/contracts src/integration/Users.errors.test.ts src/integration/Class.errors.test.ts src/pages/mentor/MentoringHistory.authorization.test.tsx`
- `npm.cmd run lint`
- `npm.cmd run build`

### Notas

Preservar alterações do usuário e os contratos aprovados; executar somente este escopo. Paralelismo só pode ser habilitado após dependências concluídas e isolamento conforme o contrato de execução.

## T016 — Aplicar cotas e respostas seguras ao login

- Status: concluída
- Issue de execução: #437
- Onda: 5
- Dependências: T001, T002, T009, T012, T013, T014
- Paralela: sim
- Requisitos: RF-005, RF-006, RNF-001, RNF-002, RNF-004, CA-009, CA-010, CA-011, CA-012, CA-026
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Controllers/AuthController.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Auth/LoginDTO.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/SecurityServiceCollectionExtensions.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/AuthenticationProtectionResponses.cs`, `backend/Tests/Integration/LoginThrottleTests.cs`, `backend/Tests/Controllers/AuthLoginContractTests.cs`, `backend/Tests/Controllers/AuthChangePasswordTests.cs`
- Evidências exclusivas: `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T016/**`

### Escopo

Conectar cotas conta/IP ao login, 429/Retry-After, no-store e503 operacional fechado. Registrar consumidores desta tarefa; manter200/401 e troca obrigatória.

### Critérios de conclusão

6ª falha por conta/31ª por IP são limitadas, janela renova, inexistente conta igualmente, sucesso não limpa IP e cancelamento não apaga tentativa iniciada. Registrar evidências e regressão pertinentes antes de marcar concluída.

### Plano TDD

- RED: Teste HTTP de limiar atual ainda recebe401 sem espera; verificar ausência de chamada ao hasher quando bloqueado.
- GREEN: Executar verificação sob transação de cota e persistir falhas antes da resposta.
- REFACTOR: Compartilhar ProblemDetails sem expor dimensão privada; não alterar política de senha.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~LoginThrottleTests|FullyQualifiedName~AuthLoginContractTests|FullyQualifiedName~AuthChangePasswordTests|FullyQualifiedName~CriticalAuthenticationTests"`

### Notas

Preservar alterações do usuário e os contratos aprovados; executar somente este escopo. Paralelismo só pode ser habilitado após dependências concluídas e isolamento conforme o contrato de execução.

## T017 — Admitir recuperação neutra e compartilhada entre aliases

- Status: concluída
- Issue de execução: #438
- Onda: 6
- Dependências: T001, T002, T004, T009, T010, T013, T014, T016
- Paralela: sim
- Requisitos: RF-007, RF-009, RNF-001, RNF-002, CA-014, CA-015, CA-016, CA-019
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Services/Security/PasswordRecoveryRequestService.cs`, `backend/LabSolos-Server-DotNet8/Controllers/EmailController.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Email/PasswordResetRequestDTO.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Email/EmailDTO.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/SecurityServiceCollectionExtensions.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/ThrottleKeyFactory.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/UserProfileUpdateService.cs`, `backend/Tests/Integration/PasswordRecoveryAbuseTests.cs`, `backend/Tests/Controllers/PasswordRecoveryTests.cs`, `backend/Tests/Controllers/EmailControllerTests.cs`
- Evidências exclusivas: `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T017/**`

### Escopo

Tirar elegibilidade/SMTP da solicitação HTTP; consumir cotas de 60 segundos, 3 por destinatário e 20 por IP, cifrar/enfileirar/coalescer atomicamente. Ambos aliases usam o mesmo serviço; 202 neutro também em limite/falha operacional, sem indicador de envio.

### Critérios de conclusão

Repetição não substitui token nem prolonga espera; inexistente/inativo consome cota pública; fila cheia reverte admissão; nenhum envio SMTP ou consulta de conta ocorre no HTTP. Registrar evidências e regressão pertinentes antes de marcar concluída.

### Plano TDD

- RED: Alias repetido gera novo token/envio hoje; teste exige um trabalho e código anterior preservado até processamento.
- GREEN: Conectar serviço de admissão com repositório/cotas e contratos atuais.
- REFACTOR: Unificar aliases e transportar apenas dados públicos necessários.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~PasswordRecoveryAbuseTests|FullyQualifiedName~PasswordRecoveryTests|FullyQualifiedName~EmailControllerTests"`

### Notas

Testes de solicitação passam a verificar admissão; emissão/entrega completa pertence a T018. Paralelismo só pode ser habilitado após dependências concluídas e isolamento conforme o contrato de execução.

## T018 — Entregar recuperação em segundo plano com retomada limitada

- Status: concluída
- Issue de execução: #438
- Onda: 7
- Dependências: T001, T004, T009, T010, T014, T017
- Paralela: não
- Requisitos: RF-007, RF-009, RNF-001, RNF-002, RNF-003, CA-014, CA-015, CA-016, CA-018, CA-019, CA-025, CA-026
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/BackgroundServices/PasswordRecoveryDeliveryWorker.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/CredentialService.cs`, `backend/LabSolos-Server-DotNet8/Services/EmailService.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/SecurityServiceCollectionExtensions.cs`, `backend/LabSolos-Server-DotNet8/Program.cs`, `backend/Tests/Integration/RecoveryDeliveryWorkerTests.cs`, `backend/Tests/Services/EmailServiceTests.cs`, `backend/Tests/Security/RecoveryTokenTests.cs`, `backend/Tests/Security/CredentialServiceTests.cs`
- Evidências exclusivas: `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T018/**`

### Escopo

Worker usa escopos, reservas de T010, elegibilidade, emissão atomicamente cifrada e SendMailAsync com prazo. Respeitar 60 segundos entre emissões reais/virtuais, pedido antigo com espera acima de 15 minutos, prazo do código de 15 minutos e 3 tentativas com intervalos de 30/120 segundos; cancelar trabalhos inválidos e remover payload.

### Critérios de conclusão

Retomada conserva código, não duplica trabalhador ativo, bloqueia confirmação com reserva vencida; conta inativa não envia; atraso na fila não aproxima emissões; mudança de contato/senha cancela; SMTP duplicado é limitado e documentado. Registrar evidências e regressão pertinentes antes de marcar concluída.

### Plano TDD

- RED: Testes executáveis de retomada/espaçamento devem falhar sem worker; caracterizar uso único/expiração existentes sem fabricar RED.
- GREEN: Implementar processamento e interface de credenciais compatível com transação externa; registrar worker e limpeza de cotas.
- REFACTOR: Separar reserva/emissão/transporte/finalização; nenhuma transação segura é mantida durante SMTP.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~RecoveryDeliveryWorkerTests|FullyQualifiedName~EmailServiceTests|FullyQualifiedName~RecoveryTokenTests|FullyQualifiedName~CredentialServiceTests"`

### Notas

Não prometer exatamente uma entrega; queda após aceite SMTP pode repetir o mesmo código.

## T019 — Limitar tentativas de redefinição modernas e legadas

- Status: concluída
- Issue de execução: #438
- Onda: 8
- Dependências: T001, T009, T016, T018
- Paralela: não
- Requisitos: RF-008, RF-009, RNF-001, RNF-002, RNF-004, CA-017, CA-018, CA-019, CA-025
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Controllers/EmailController.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/CredentialService.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Email/PasswordResetDTO.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Email/RedefinirSenhaDTO.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/SecurityServiceCollectionExtensions.cs`, `backend/Tests/Integration/PasswordResetThrottleTests.cs`, `backend/Tests/Security/CredentialServiceTests.cs`, `backend/Tests/Security/RecoveryTokenTests.cs`, `backend/Tests/Controllers/PasswordRecoveryTests.cs`, `backend/Tests/Controllers/EmailControllerTests.cs`
- Evidências exclusivas: `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T019/**`

### Escopo

Conectar 5 falhas por destinatário e 30 por IP em 15 minutos aos dois aliases, incluindo código sem e-mail. Reaquisição de locks em ordem estável; falha lógica confirma contador sem mutação, sucesso consome token/versão atomicamente; preservar 204/400/409.

### Critérios de conclusão

Limite compartilhado retorna 429 sem alterar token/conta; forma legada não contorna IP; expiração/reuso/revogação mantidos; não bloquear login por namespace de recuperação. Registrar evidências e regressão pertinentes antes de marcar concluída.

### Plano TDD

- RED: 6ª validação falha hoje sem 429; teste de rollback expõe necessidade de persistir contagem separada da mutação.
- GREEN: Refatorar serviço para transação externa e respostas seguras, com revalidação do código.
- REFACTOR: Unificar mapeamento de falhas sem ignorar conflitos reais de concorrência.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~PasswordResetThrottleTests|FullyQualifiedName~CredentialServiceTests|FullyQualifiedName~RecoveryTokenTests|FullyQualifiedName~PasswordRecoveryTests|FullyQualifiedName~JwtSessionVersionTests"`

### Notas

Preservar alterações do usuário e os contratos aprovados; executar somente este escopo.

## T020 — Oferecer edição própria com confirmação da senha atual

- Status: concluída
- Issue de execução: #436
- Onda: 5
- Dependências: T005, T012, T015
- Paralela: sim
- Requisitos: RF-003, RF-004, RNF-001, RNF-004, CA-005, CA-006, CA-007, CA-013
- Caminhos sob responsabilidade: `frontend/src/components/auth/ProfileContactForm.tsx`, `frontend/src/components/auth/ProfileContactForm.test.tsx`, `frontend/src/integration/Users.ts`, `frontend/src/integration/Users.profileUpdate.test.ts`, `frontend/src/pages/Profile.tsx`, `frontend/src/pages/Profile.test.tsx`, `frontend/src/pages/mentor/Profile.tsx`, `frontend/src/pages/mentee/Profile.tsx`
- Evidências exclusivas: `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T020/**`

### Escopo

Criar formulário compartilhado próprio e adaptador JSON Patch; senha só quando e-mail mudar, nunca persistida. Integrar três perfis e limpar segredo ao concluir/cancelar/desmontar.

### Critérios de conclusão

Edição válida atualiza perfil; 400/409 mantém dados e feedback; senha ausente impede troca; payload não inclui status do titular; nenhum formulário de dependente para Mentor. Registrar evidências e regressão pertinentes antes de marcar concluída.

### Plano TDD

- RED: Teste de interação exige edição própria e confirmação hoje ausentes; verificar payload transitório.
- GREEN: Implementar componente e integrações mínimas usando design atual.
- REFACTOR: Compartilhar validação/feedback acessíveis sem criar reformulação visual.

### Validação

- `npm.cmd run test -- --run src/components/auth/ProfileContactForm.test.tsx src/integration/Users.profileUpdate.test.ts src/pages/Profile.test.tsx`
- `npm.cmd run lint`
- `npm.cmd run build`

### Notas

Preservar alterações do usuário e os contratos aprovados; executar somente este escopo. Paralelismo só pode ser habilitado após dependências concluídas e isolamento conforme o contrato de execução.

## T021 — Aplicar espera acessível no login e redefinição

- Status: concluída
- Issue de execução: #437
- Onda: 6
- Dependências: T005, T016
- Paralela: sim
- Requisitos: RF-006, RF-008, RNF-004, CA-013
- Caminhos sob responsabilidade: `frontend/src/pages/Login.tsx`, `frontend/src/pages/Login.test.tsx`, `frontend/src/pages/ResetPassword.tsx`, `frontend/src/pages/ResetPassword.test.tsx`, `frontend/src/pages/ResetPassword.errors.test.ts`, `frontend/src/pages/ForgotPassword.test.tsx`, `frontend/src/components/auth/AuthenticationWaitFeedback.tsx`, `frontend/src/components/auth/AuthenticationWaitFeedback.test.tsx`, `frontend/src/integration/Auth.test.ts`
- Evidências exclusivas: `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T021/**`

### Escopo

Consumir rate_limited/espera em Login e ResetPassword, manter solicitação neutra. Desabilitar submissão durante prazo, sem loop/retry automático nem anúncio por segundo.

### Critérios de conclusão

Teclado/leitor de tela recebem orientação; nova tentativa exige ação após prazo; metadados inválidos não acionam loop; contratos de autenticação mantidos. Registrar evidências e regressão pertinentes antes de marcar concluída.

### Plano TDD

- RED: 429 atual cai no feedback genérico sem prazo; teste de tempo controlado demonstra submissão excessiva.
- GREEN: Implementar feedback compartilhado e bloqueio temporário no cliente.
- REFACTOR: Evitar duplicação de timer e limpar recursos ao desmontar.

### Validação

- `npm.cmd run test -- --run src/pages/Login.test.tsx src/pages/ResetPassword.test.tsx src/pages/ResetPassword.errors.test.ts src/pages/ForgotPassword.test.tsx src/components/auth/AuthenticationWaitFeedback.test.tsx src/integration/Auth.test.ts`
- `npm.cmd run lint`
- `npm.cmd run build`

### Notas

Preservar alterações do usuário e os contratos aprovados; executar somente este escopo. Paralelismo só pode ser habilitado após dependências concluídas e isolamento conforme o contrato de execução.

## T022 — Validar inicialização e configurar ambientes/segredos/proxy

- Status: concluída
- Issue de execução: #437
- Onda: 9
- Dependências: T002, T004, T006, T013, T016, T017, T018, T019
- Paralela: não
- Requisitos: RF-005, RF-007, RF-008, RF-011, RNF-003, RNF-005, CA-025, CA-027
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Program.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/SecurityServiceCollectionExtensions.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/AuthenticationProtectionStartupValidator.cs`, `backend/Tests/Integration/AuthenticationProtectionStartupTests.cs`, `backend/Tests/Integration/SecureSeedStartupTests.cs`, `backend/Tests/Integration/BrowserSecurityHeadersTests.cs`, `backend/Tests/Integration/LoginThrottleTests.cs`, `docker-compose-prod.yml`, `docker-compose-dev.yml`, `docker-compose-e2e.yml`, `.env.example`, `.env.prod.example`, `.github/scripts/tests/test_authentication_protection_compose.py`
- Evidências exclusivas: `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T022/**`

### Escopo

Ligar ValidateOnStart, comparação da política entre instâncias, chave de trabalhos existentes, readiness segura e arquivos secretos só leitura. Configurar Compose/placeholder, IP estável conhecido do Caddy, allowlist de desenvolvimento e credenciais sintéticas de teste.

### Critérios de conclusão

Ausência/invalidade de chave, política divergente e rede inadequada impedem operação desprotegida; configuração real não é impressa; API não publica porta em produção; E2E atual continua configurável. Registrar evidências e regressão pertinentes antes de marcar concluída.

### Plano TDD

- RED: Testes de inicialização e contrato de Compose exigem proteção/segredos/rede hoje ausentes; falhas não se confundem com seed já caracterizado.
- GREEN: Integrar bootstrap/configuração e mounts sem segredos em imagem/frontend/repo.
- REFACTOR: Organizar registro DI e validação de dependências sem desativar gates.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~AuthenticationProtectionStartupTests|FullyQualifiedName~SecureSeedStartupTests"`
- `python -m unittest discover -s .github/scripts/tests -p "test_authentication_protection_compose.py" -v`
- `docker compose --env-file .env.prod.example -f docker-compose-prod.yml config --quiet`
- `docker compose -f docker-compose-e2e.yml config --quiet`

### Notas

Gerar arquivos/chaves sintéticos apenas no espaço descartável de testes; endereçamento de produção é parametrizado, conflito verificado antes da publicação.

## T023 — Aplicar CSP no ramo frontend do Caddy e inventariar recursos

- Status: concluída
- Issue de execução: #439
- Onda: 4
- Dependências: T013
- Paralela: sim
- Requisitos: RF-010, RNF-004, RNF-005, CA-020, CA-021, CA-028
- Caminhos sob responsabilidade: `Caddyfile`, `infra/proxy/security-headers.caddy`, `.github/scripts/tests/test_browser_security_policy.py`, `.codex/docs/specs/protecao-acesso-autenticacao/inventario-recursos-csp.md`
- Evidências exclusivas: `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T023/**`

### Escopo

Extrair trecho reutilizável de cabeçalhos e aplicar CSP de produção na raiz/SPA/erros frontend sem afetar API/Swagger. Inventariar scripts, fontes, imagens, estilos e exportações e justificar exceção apenas CSS; manter env.js.

### Critérios de conclusão

Configuração Caddy válida, uma política efetiva por ramo; script sem unsafe-inline/eval/blob, objetos/base/form/frame restritos. Inventário indica recursos e cenários a comprovar em T026. Registrar evidências e regressão pertinentes antes de marcar concluída.

### Plano TDD

- RED: Teste de contrato detecta ausência de CSP atual; validação de configuração é objetiva, não substitui prova de bloqueio no navegador.
- GREEN: Implementar trecho importado e matcher de frontend, sem outra política conflitante no Nginx.
- REFACTOR: Manter regra única para produção e composição de teste; documentar exceções específicas.

### Validação

- `python -m unittest discover -s .github/scripts/tests -p "test_browser_security_policy.py" -v`
- `docker run --rm --network none -e APP_DOMAIN=labon.example.invalid --mount "type=bind,source=$PWD,target=/workspace,readonly" --workdir /workspace caddy:2.10-alpine caddy validate --config Caddyfile --adapter caddyfile`

### Notas

Último comando é PowerShell a partir da raiz. Não afirmar CA-020/021/028 completos apenas por inspecionar configuração. Paralelismo só pode ser habilitado após dependências concluídas e isolamento conforme o contrato de execução.

## T024 — Criar composição descartável com proxy real e projeto security

- Status: concluída
- Issue de execução: #439
- Onda: 10
- Dependências: T015, T019, T020, T021, T022, T023
- Paralela: não
- Requisitos: RF-010, RF-011, RNF-002, RNF-005, CA-020, CA-022, CA-025, CA-027
- Caminhos sob responsabilidade: `docker-compose-security-e2e.yml`, `infra/testing/**`, `frontend/playwright.config.ts`, `frontend/e2e/infra/security-smoke.e2e.ts`, `frontend/e2e/infra/security-e2e-data.ts`, `.github/scripts/tests/test_security_e2e_stack.py`
- Evidências exclusivas: `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T024/**`

### Escopo

Montar PostgreSQL 15, API em Production, Mailpit, frontend e Caddy com TLS local com mesma origem e import da política de T023. Adicionar projeto security e listas explícitas dos specs reais/UI previstos; ampliar seeds/helpers via interface própria sem alterar cenários existentes ainda.

### Critérios de conclusão

Smoke atravessa Caddy e /api; ambiente/portas/CA/chaves são isolados; CSP aplicada de origem única; descoberta seleciona smoke e deixa nomes dos specs futuros configurados; traces não gravam tokens. Registrar evidências e regressão pertinentes antes de marcar concluída.

### Plano TDD

- RED: Verificação de infraestrutura detecta ausência do stack/projeto; smoke exige resposta real do proxy, nunca erro de arquivo como evidência de remediação.
- GREEN: Criar composição/helpers/projeto e teste smoke com timeout/polling.
- REFACTOR: Reutilizar política e infraestrutura SMTP sem relaxar TLS de produção.

### Validação

- `python -m unittest discover -s .github/scripts/tests -p "test_security_e2e_stack.py" -v`
- `docker compose -p lab-solos-security-e2e -f docker-compose-security-e2e.yml config --quiet`
- `docker compose -p lab-solos-security-e2e -f docker-compose-security-e2e.yml up -d --build --wait`
- `npm.cmd run test:e2e:list -- --project=security`
- `npm.cmd run test:e2e -- --project=security e2e/infra/security-smoke.e2e.ts`

### Notas

Manter stacks local e proxy em projetos Docker distintos. Escolher portas de teste declaradas no arquivo; não usar produção.

## T025 — Comprovar jornadas de autorização e credenciais em E2E

- Status: concluída
- Issue de execução: #436
- Onda: 11
- Dependências: T015, T019, T020, T021, T024
- Paralela: sim
- Requisitos: RF-001, RF-002, RF-003, RF-004, RF-005, RF-006, RF-007, RF-008, RF-009, RNF-001, RNF-004, CA-001, CA-002, CA-003, CA-004, CA-005, CA-006, CA-007, CA-008, CA-009, CA-010, CA-013, CA-014, CA-016, CA-017, CA-018, CA-019
- Caminhos sob responsabilidade: `backend/TestSupport/E2ESeed/**`, `frontend/e2e/authentication-protection.real.spec.ts`, `frontend/e2e/authentication-protection.ui.spec.ts`, `frontend/e2e/credential-lifecycle.spec.ts`, `backend/Tests/Infrastructure/E2ESeedSafetyTests.cs`, `backend/Tests/Infrastructure/E2ESeedIsolationTests.cs`
- Evidências exclusivas: `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T025/**`

### Escopo

Adicionar cenário seed isolado com dois vínculos e specs real/UI de cruzamento, edição própria, espera, aliases e recuperação no Mailpit. Ajustar E2E de credenciais para entrega eventual sem pausas fixas.

### Critérios de conclusão

Specs descobertos e executados com dados sintéticos; sem acesso cruzado e sem mutação proibida; fluxo legítimo de recuperação/contato funciona; axe/teclado/foco nas mensagens. Registrar evidências e regressão pertinentes antes de marcar concluída.

### Plano TDD

- RED: Comportamentos já verdes nas tarefas anteriores recebem caracterização E2E, sem fabricar RED; falha real de jornada revela integração ainda incompleta.
- GREEN: Escrever cobertura integrada e corrigir somente preparação, auxiliares e expectativas conforme contratos, sem alterar produção nesta tarefa.
- REFACTOR: Eliminar duplicação de cenários e polling, impedir colisão de contas/cotas.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~E2ESeedSafetyTests|FullyQualifiedName~E2ESeedIsolationTests"`
- `docker compose -f docker-compose-e2e.yml up -d --build --wait`
- `npm.cmd run test:e2e:list -- --project=real`
- `npm.cmd run test:e2e -- --project=real e2e/authentication-protection.real.spec.ts e2e/credential-lifecycle.spec.ts`
- `npm.cmd run test:e2e -- --project=ui e2e/authentication-protection.ui.spec.ts`

### Notas

Não gravar login/token/code em trace ou screenshots. Descoberta sem execução não conclui a tarefa. Paralelismo só pode ser habilitado após dependências concluídas e isolamento conforme o contrato de execução.

## T026 — Comprovar CSP, CORS e cadeia de IP no navegador/proxy

- Status: concluída
- Issue de execução: #439
- Onda: 11
- Dependências: T013, T023, T024
- Paralela: sim
- Requisitos: RF-010, RF-011, RNF-002, RNF-004, RNF-005, CA-020, CA-021, CA-022, CA-023, CA-024, CA-025, CA-028
- Caminhos sob responsabilidade: `frontend/e2e/browser-security.real.spec.ts`, `Caddyfile`, `infra/proxy/security-headers.caddy`, `.codex/docs/specs/protecao-acesso-autenticacao/inventario-recursos-csp.md`
- Evidências exclusivas: `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T026/**`

### Escopo

Executar cenários no projeto security: raiz/SPA, recursos externos bloqueados, objetos/base/form/frame, recursos locais, três perfis, recuperação e exportações; preflight/resposta e XFF forjado pela borda. Ajustes de CSP só com necessidade comprovada.

### Critérios de conclusão

CSP em aplicação sem violações inesperadas, APIs mesma origem funcionam, origem externa/null sem autorização, IP não forjado; fontes, imagens e exportações não quebradas; inventário atualizado. Registrar evidências e regressão pertinentes antes de marcar concluída.

### Plano TDD

- RED: Caracterizar política já implantada em T023; teste negativo de recurso controlado demonstra bloqueio. Não relaxar política para transformar falha em sucesso.
- GREEN: Adicionar verificações reais e, se necessário, exceção específica justificada dentro do design aprovado.
- REFACTOR: Reutilizar auxiliares de T024 e eliminar fontes/headers redundantes.

### Validação

- `docker compose -p lab-solos-security-e2e -f docker-compose-security-e2e.yml up -d --build --wait`
- `npm.cmd run test:e2e -- --project=security e2e/browser-security.real.spec.ts`
- `python -m unittest discover -s .github/scripts/tests -p "test_browser_security_policy.py" -v`

### Notas

Se uma correção exigir novos contratos ou alterações fora destes caminhos, registrar falha e devolver à tarefa proprietária; não esconder regressões. Paralelismo só pode ser habilitado após dependências concluídas e isolamento conforme o contrato de execução.

## T027 — Tornar a suíte do proxy obrigatória no gate pré-merge

- Status: concluída
- Issue de execução: #439
- Onda: 12
- Dependências: T024, T025, T026
- Paralela: sim
- Requisitos: RNF-003, RNF-005, CA-027
- Caminhos sob responsabilidade: `.github/workflows/container-ci.yml`, `.github/scripts/check_quality_gate.py`, `.github/scripts/tests/test_quality_gate.py`, `.github/scripts/tests/test_container_ci_workflow.py`, `.github/scripts/tests/test_browser_security_workflow.py`
- Evidências exclusivas: `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T027/**`

### Escopo

Criar job browser-security em PR para develop/merge_group, stack fixo e artifacts sanitizados; acrescentar needs/avaliador Quality gate, execução focada útil e restauração do backend travado. Testar cleanup restrito ao projeto descartável.

### Critérios de conclusão

Job ausente/skipped/failure impede gate verde; novo job roda antes do merge; build completo e scans existentes mantidos; alterações de exemplo/headers acionam verificação. Registrar evidências e regressão pertinentes antes de marcar concluída.

### Plano TDD

- RED: Teste do workflow/gate atual não exige novo job; acrescentar assertiva de dependência obrigatória que falha antes da mudança.
- GREEN: Atualizar CI e testes, com ambiente e comandos reais da composição.
- REFACTOR: Centralizar parâmetros/cleanup sem ignorar job nem capturar segredos.

### Validação

- `python -m unittest discover -s .github/scripts/tests -p "test_quality_gate.py" -v`
- `python -m unittest discover -s .github/scripts/tests -p "test_container_ci_workflow.py" -v`
- `python -m unittest discover -s .github/scripts/tests -p "test_browser_security_workflow.py" -v`
- `python -m unittest discover -s .github/scripts/tests -p "test_security_e2e_stack.py" -v`

### Notas

Existência do workflow não comprova proteção remota de branch. Conferir obrigatoriedade quando houver contribuição externa autorizada; não alterar configurações remotas neste planejamento. Paralelismo só pode ser habilitado após dependências concluídas e isolamento conforme o contrato de execução.

## T028 — Documentar políticas e preparar disponibilização reversível

- Status: concluída
- Issue de execução: #436
- Onda: 12
- Dependências: T019, T020, T021, T022, T026
- Paralela: sim
- Requisitos: RF-001, RF-002, RF-003, RF-004, RF-005, RF-006, RF-007, RF-008, RF-009, RF-010, RF-011, RNF-001, RNF-003, RNF-004, RNF-005, CA-027
- Caminhos sob responsabilidade: `docs/manual/**`, `README.md`, `CHANGELOG.md`, `backend/LabSolos-Server-DotNet8/Data/Migrations/README.md`, `infra/oci/README.md`, `.codex/docs/specs/protecao-acesso-autenticacao/operacao.md`
- Evidências exclusivas: `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T028/**`

### Escopo

Documentar matriz, limites/renovação/NAT, espera, confirmação de e-mail, normalização só de cotas, chaves/rotação, topologia do proxy, duplicação de SMTP, upgrade/migrações e reversão segura. Preparar roteiro de publicação e pós-publicação, sem executar deploy.

### Critérios de conclusão

Manual descreve o comportamento implementado; configuração inválida e saturação têm procedimento; duplicações exatas de e-mail são tratadas sem mescla automática; a reversão não contorna proteção, zera cotas ou revalida tokens. Registrar evidências e regressão pertinentes antes de marcar concluída.

### Plano TDD

- RED: Documentação: verificação objetiva do roteiro/evidências e check_manual, sem inventar teste comportamental. Registrar itens ausentes antes da edição.
- GREEN: Atualizar documentação e roteiro de operação com links/versões reais.
- REFACTOR: Eliminar instruções conflitantes preservando histórico e exemplos sintéticos.

### Validação

- `python .github/scripts/check_manual.py --source docs/manual`
- `python -m unittest discover -s .github/scripts/tests -p "test_manual_content.py" -v`

### Notas

A publicação e revisão de branch checks não estão autorizadas pela criação de tasks.md. Valores medidos entram como evidências, não promessas. Paralelismo só pode ser habilitado após dependências concluídas e isolamento conforme o contrato de execução.

## T029 — Validar integração cruzada e consolidar evidências locais

- Status: concluída
- Issue de execução: #436
- Onda: 13
- Dependências: T025, T026, T027, T028
- Paralela: não
- Requisitos: RF-003, RF-005, RF-007, RF-008, RF-009, RNF-001, RNF-002, RNF-003, RNF-004, RNF-005, CA-007, CA-018, CA-019, CA-025, CA-026, CA-027
- Caminhos sob responsabilidade: `backend/Tests/Integration/AuthenticationProtectionCrossFlowTests.cs`, `.codex/docs/specs/protecao-acesso-autenticacao/aceite-local.md`
- Evidências exclusivas: `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T029/**`

### Escopo

Reservar para fluxos cruzados: contato × trabalho de fila × token, espaços de recuperação × login, concorrência × limpeza e privacidade das evidências. Executar checks completos proporcionais, consolidar 44 IDs e relatar medições HTTP/entrega/custo transacional.

### Critérios de conclusão

Nenhum critério é declarado concluído apenas por configuração; evidências locais por issue e limitações explicitadas; gate contratual validado; prontidão para publicação sem declarar deployment feito. Registrar evidências e regressão pertinentes antes de marcar concluída.

### Plano TDD

- RED: Teste cruzado novo demonstra regressão real ou vira caracterização se já verde; jamais quebrar implementação para RED.
- GREEN: Adicionar somente cobertura cruzada/evidências; correção funcional fora dos caminhos volta à tarefa proprietária.
- REFACTOR: Organizar evidências sem duplicar testes verticais.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~AuthenticationProtectionCrossFlowTests"`
- `dotnet restore backend/backend.sln --locked-mode`
- `dotnet build backend/backend.sln --no-restore -c Release --nologo --disable-build-servers`
- `dotnet test backend/backend.sln --no-build --no-restore -c Release --nologo --disable-build-servers`
- `npm.cmd run test -- --run`
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run test:e2e -- --project=real`
- `npm.cmd run test:e2e -- --project=ui`
- `npm.cmd run test:e2e -- --project=security`

### Notas

Composições de T024/T025 devem estar ativos e isolados. Esta tarefa não fecha issues nem assume scans/CI remotos verdes sem resultado real.

## T030 — Registrar aceite após publicação com contas de teste

- Status: pendente
- Issue de execução: #436
- Onda: 14
- Dependências: T029
- Paralela: não
- Requisitos: RF-001, RF-002, RF-003, RF-004, RF-005, RF-006, RF-007, RF-008, RF-009, RF-010, RF-011, RNF-001, RNF-003, RNF-005, CA-027
- Caminhos sob responsabilidade: `.codex/docs/specs/protecao-acesso-autenticacao/aceite-publicacao.md`
- Evidências exclusivas: `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T030/**`

### Escopo

Após uma publicação autorizada e identificável, validar deployment com contas de teste, volume controlado, cabeçalhos efetivos, matriz de acesso, login/cotas e recuperação. Registrar revisão dos checks remotos e evidências por cada uma das cinco issues; não publicar nesta tarefa.

### Critérios de conclusão

Versão/ambiente/data e resultados reais registrados sem segredos; cinco issues têm critérios e evidências pertinentes; pendência de publicação não é substituída por teste local. Registrar evidências e regressão pertinentes antes de marcar concluída.

### Plano TDD

- RED: Verificação de aceite: roteiro de T028 deve identificar falta de evidência remota; não fazer teste ofensivo de alto volume nem fabricar RED em produção.
- GREEN: Coletar evidências sanitizadas e confirmar comportamento autorizado.
- REFACTOR: Organizar aceites por issue e separar limitações do resultado obtido.

### Validação

- `Invoke-WebRequest -Uri "$env:LABON_VALIDATION_BASE_URL/" -Method Get | Select-Object StatusCode, @{Name="CSP";Expression={$_.Headers["Content-Security-Policy"]}}`
- `Invoke-WebRequest -Uri "$env:LABON_VALIDATION_BASE_URL/mentor/" -Method Get | Select-Object StatusCode, @{Name="CSP";Expression={$_.Headers["Content-Security-Policy"]}}`
- `python .github/scripts/check_manual.py --source docs/manual`

### Notas

Pré-condição externa: candidato publicado por fluxo autorizado, URL/versão e contas de teste disponíveis. Roteiro exato está em operacao.md (T028). Se ausente, permanecer pendente com condição registrada; não gerar credenciais, publicar ou encerrar issues por inferência. LABON_VALIDATION_BASE_URL é a URL publicada confirmada, sem barra final. Os comandos de cabeçalhos são verificações públicas; matriz autenticada e recuperação seguem o roteiro de T028 com contas dedicadas, sem imprimir credenciais.

## Matriz de rastreabilidade

| ID do PRD | Tarefas responsáveis |
|---|---|
| RF-001 | T003, T008, T011, T013, T015, T025, T028, T030 |
| RF-002 | T003, T008, T011, T015, T025, T028, T030 |
| RF-003 | T003, T006, T012, T020, T025, T028, T029, T030 |
| RF-004 | T003, T005, T008, T011, T012, T013, T015, T020, T025, T028, T030 |
| RF-005 | T002, T006, T009, T016, T022, T025, T028, T029, T030 |
| RF-006 | T005, T016, T021, T025, T028, T030 |
| RF-007 | T002, T006, T009, T010, T017, T018, T022, T025, T028, T029, T030 |
| RF-008 | T002, T005, T006, T009, T019, T021, T022, T025, T028, T029, T030 |
| RF-009 | T004, T006, T010, T017, T018, T019, T025, T028, T029, T030 |
| RF-010 | T023, T024, T026, T028, T030 |
| RF-011 | T013, T022, T024, T026, T028, T030 |
| RNF-001 | T002, T004, T007, T008, T010, T011, T012, T014, T016, T017, T018, T019, T020, T025, T028, T029, T030 |
| RNF-002 | T001, T002, T006, T009, T010, T013, T016, T017, T018, T019, T024, T026, T029 |
| RNF-003 | T001, T002, T004, T006, T007, T009, T010, T014, T018, T022, T027, T028, T029, T030 |
| RNF-004 | T005, T008, T011, T012, T015, T016, T019, T020, T021, T023, T025, T026, T028, T029 |
| RNF-005 | T013, T022, T023, T024, T026, T027, T028, T029, T030 |
| CA-001 | T003, T008, T025 |
| CA-002 | T003, T008, T011, T025 |
| CA-003 | T003, T008, T011, T015, T025 |
| CA-004 | T008, T011, T015, T025 |
| CA-005 | T012, T020, T025 |
| CA-006 | T012, T020, T025 |
| CA-007 | T006, T012, T020, T025, T029 |
| CA-008 | T003, T008, T011, T012, T025 |
| CA-009 | T009, T016, T025 |
| CA-010 | T009, T016, T025 |
| CA-011 | T002, T009, T016 |
| CA-012 | T009, T016 |
| CA-013 | T005, T015, T020, T021, T025 |
| CA-014 | T017, T018, T025 |
| CA-015 | T009, T010, T017, T018 |
| CA-016 | T017, T018, T025 |
| CA-017 | T009, T019, T025 |
| CA-018 | T018, T019, T025, T029 |
| CA-019 | T017, T018, T019, T025, T029 |
| CA-020 | T023, T024, T026 |
| CA-021 | T023, T026 |
| CA-022 | T013, T024, T026 |
| CA-023 | T013, T026 |
| CA-024 | T013, T026 |
| CA-025 | T001, T006, T009, T010, T013, T018, T019, T022, T024, T026, T029 |
| CA-026 | T004, T007, T010, T014, T016, T018, T029 |
| CA-027 | T002, T004, T006, T014, T022, T024, T027, T028, T029, T030 |
| CA-028 | T023, T026 |

## Registro da validação do plano

- Os 16 requisitos e 28 critérios do PRD estão associados a tarefas; toda tarefa possui requisito ou critério e issue principal inequívoca.
- IDs T001–T030 são únicos e sequenciais; dependências apontam para tarefas existentes; DAG sem ciclos.
- A agenda possui 14 ondas; posse de fontes foi conferida para ausência de sobreposição dentro de cada onda. Arquivos gerados requerem isolamento explícito, nunca compilação paralela no mesmo checkout.
- Manifestos atuais confirmam xUnit na solução, Vitest/Playwright no frontend e gates pré-merge; infraestrutura nova é limitada a PG15, controle de workers e proxy real.
- Comandos usam ferramentas/scripts existentes; classes, arquivos de teste, projeto security e Composes novos são criados pelas tarefas identificadas antes de sua execução.
- A validação deste documento não executou tarefas, testes de produto, migrações, sincronização de Project ou publicação.

## Log de execução

| Data | Tarefa | Resultado | Testes/evidências | Observações |
|---|---|---|---|---|
| 2026-10-13 | T001 | concluída | RED no histórico EF; filtro PG15/PG16 7/7; regressão integrada da onda 30/30; suíte backend após integração 299/299; `dotnet build` Release 0 erros; `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T001/**` | Docker Desktop iniciado (29.8.0); build integrado apontou avisos de análise existentes no repositório, sem novos avisos nos arquivos adicionados. |
| 2026-10-13 | T002 | concluída | RED 5/11; filtro focado 17/17; regressão 287/287; suíte backend integrada 299/299; `dotnet build` Release 0 erros; `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T002/execucao.md` | Seis avisos CA1859 novos foram corrigidos; build integrado final teve 197 avisos preexistentes e nenhum em T002. Artefatos exploratórios ficaram no worktree e foram excluídos da integração. #437 permanece `In Progress`. |
| 2026-10-13 | T003 | concluída | RED 6/8; GREEN 9/9; regressão 14/14; integração da onda 30/30; suíte backend após integração 299/299; `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T003/**` | Serviço de predicados entregue; integração HTTP permanece para T008/T011. #436 continua `In Progress`. |
| 2026-10-13 | T005 | concluída | RED 9/44; foco 44/44; suíte frontend integrada 660/660; lint, build e `git diff --check`; `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T005/**` | 11 vulnerabilidades de auditoria reportadas no grafo npm bloqueado; sem alteração de dependências. Avisos de build existentes registrados. #437 permanece `In Progress`. |
| 2026-10-13 | T004 | concluída | RED 1/1; filtro `RecoveryPayloadProtectorTests` 13/13; build Release 0 avisos/0 erros; `git diff --check`; `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T004/**` | AES-256-GCM com rotação de chave entregue; DI, fila e envio permanecem para tarefas posteriores. #438 permanece `In Progress`. |
| 2026-10-13 | T006 | concluída | RED/GREEN PostgreSQL 15/16; foco de migração/ciclo 13/13; integração backend completa 337/337; rebuild Release 0 erros/181 avisos no conjunto; script idempotente revisado; git diff --check; evidencias T006 | A quinta migração foi adicionada às caracterizações; rollback de datas usa o predecessor da migração-alvo. Avisos restantes são preexistentes. #438 permanece In Progress. |
| 2026-10-13 | T007 | concluída | RED 9/9; filtro isolado 15/15 e integrado 23/23; rebuild Release 0 erros/181 avisos no conjunto; nenhum aviso T007 após correção de CA1848; git diff --check; evidencias T007 | Rotas sensíveis registram eventos agregados; filtro sanitiza demais dados e LoggerMessage remove avisos do filtro. #436 permanece In Progress. |
| 2026-10-13 | T008 | concluída | RED; filtro final 45/45; suíte do worktree 310/310; integração backend completa 337/337; rebuild Release 0 erros/181 avisos no conjunto; git diff --check; evidencias T008 | Validação consolidada aprovada após T006 atualizar as caracterizações de migração; nenhum teste T008 falhou. Três CA1848 permanecem em chamadas de log preexistentes e inalteradas no controller. #436 permanece In Progress. |
| 2026-10-13 | T009 | concluída | RED 8 falhas comportamentais/1 contrato; filtro PostgreSQL 15 11/11; regressão com migração 14/14; integração backend completa 379/379; rebuild Release 0 erros/176 avisos gerais; git diff --check; evidências T009 | Locks ordenados, capacidade exata, janelas não deslizantes e limpeza integrada. Nenhum aviso nos arquivos T009 após revisão. #437 permanece In Progress. |
| 2026-10-13 | T010 | concluída | RED/GREEN PostgreSQL 15; filtro final do repositório 11/11; integração backend completa 379/379; rebuild Release 0 erros/176 avisos gerais; git diff --check; evidências T010 e `integracao-revisao.md` | Revisão integrada acrescentou regressão para chave expirada fora do lote de 100 e corrigiu decremento de capacidade na limpeza por admissão. #438 permanece In Progress. |
| 2026-10-13 | T011 | concluída | RED 3 falhas funcionais/4; filtro de autorização, projeção e regressão crítica 15/15; integração backend completa 379/379; rebuild Release 0 erros/176 avisos gerais; git diff --check; evidências T011 | Mentor vinculado não consulta aprovados de outro responsável; DTO projetado não carrega dados de credencial/sessão. Nenhum aviso nos arquivos T011 após revisão. #436 permanece In Progress. |
| 2026-10-13 | T013 | concluída | RED 5 falhas/3 aprovados; filtro de proxy/CORS/headers/autorização 18/18; integração backend completa 379/379; rebuild Release 0 erros/176 avisos gerais; git diff --check; evidências T013 | Allowlist apenas em Development e confiança só em proxies conhecidos. T022 configura valores operacionais; proxy Caddy efetivo será validado em T026. #440 permanece In Progress. |
| 2026-10-13 | T014 | concluída | RED 2/2; filtro de telemetria e privacidade 12/12; integração backend completa 379/379; rebuild Release 0 erros/176 avisos gerais; git diff --check; evidências T014 | Primeira suíte 377/379 (listener concorrente e caso PATCH de auditoria); listener serializado; caso PATCH não se reproduziu no foco nem na suíte final. #437 permanece In Progress. |

| 2026-10-13 | T012 | concluída | RED 2/2; filtro integrado 48/48; regressão backend completa 396/396; rebuild Release 0 erros/176 avisos gerais; git diff --check; evidências T012 | PATCH de perfil autorizado e troca de e-mail atômica; cancelamento inclui jobs com e sem UserId por chave de entrega exata. A factory compartilhada deve ser registrada em T022; sem ela, troca falha fechada sem persistir. #436 permanece In Progress. |
| 2026-10-13 | T015 | concluída | RED 6 falhas comportamentais; foco de consumidores 20/20; foco da tarefa 69/69; suite frontend completa 671/671 (143 arquivos); lint e build aprovados; git diff --check; evidências T015 | Testes de tela atualizados após regressão integrada: 404 protegido aparece como erro, 200/[] segue vazio, histórico usa adaptador dedicado. Build mantém avisos conhecidos de env.js, imagem em runtime e chunks grandes; npm ci reportou vulnerabilidades no grafo bloqueado sem alterar dependências. #436 permanece In Progress. |
| 2026-10-13 | T023 | concluída | RED 2/2; contrato Python integrado 3/3; Caddy 2.10 validate aprovado; git diff --check; inventário e evidências T023 | CSP fica no ramo frontend; /api/* segue sem CSP; o inventário é estático e a verificação efetiva das jornadas/bloqueios no navegador permanece para T026. #439 permanece In Progress. |
| 2026-10-13 | T020 | concluída | RED comportamental; foco 27/27; frontend integrado 682/682 (145 arquivos); lint e build aprovados; git diff --check; evidências T020 | Formulário compartilhado nos três perfis, PATCH sem status e confirmação de senha apenas para troca de e-mail; dados permanecem em 400/409 e segredo é limpo em sucesso/cancelamento/desmontagem. Build mantém avisos conhecidos; #436 permanece In Progress. |
| 2026-10-13 | T016 | concluída | RED comportamental; filtro integrado 29/29; backend completo 405/405; reconstrução Release com 0 erros e 174 avisos gerais preexistentes (nenhum em AuthController); git diff --check; evidências T016 | 429/Retry-After acontece antes do hash após cinco falhas; conta inexistente e senha obrigatória preservam contrato; 503 fechado para indisponibilidade/configuração. #437 permanece In Progress. |
| 2026-10-13 | T021 | concluída | RED 4 falhas comportamentais; foco 36/36; frontend integrado 694/694 (146 arquivos); lint e build aprovados; git diff --check; evidências T021 | Espera acessível bloqueia submit por botão e teclado, libera após Retry-After ou 30 s genéricos sem autosubmit. 202 de ForgotPassword permanece neutro. Build mantém avisos conhecidos; #437 permanece In Progress. |
| 2026-10-13 | T017 | concluída | RED 2 envios SMTP; filtro 15/15; integração cruzada T012/T017 17/17; backend completo 409/409; reconstrução Release com 0 erros e 174 avisos gerais (nenhum nos arquivos de produção desta tarefa); git diff --check; evidências T017 | Requisições são coalescidas e enfileiradas sem consulta de conta/SMTP; fila cheia reverte cota/cooldown. Revisão integrada marca chave sintética como não operacional para manter troca de e-mail fail-closed. #438 permanece In Progress. |
| 2026-10-13 | T018 | concluída | RED de cancelamento e lease; foco integrado 27/27; backend completo 422/422; rebuild Release 0 erros/174 avisos gerais; `git diff --check`; evidências T018 | Worker usa token estável, lease cercada antes do SMTP, espaçamento efetivo e scrub terminal. Revisão integrada resolveu o repositório de recuperação sob demanda para manter login em 503 quando a chave de throttle estiver ausente; nenhum aviso nos arquivos T018. #438 permanece In Progress. |
| 2026-10-13 | T019 | concluída | RED: 6ª falha retornava 400; filtro 28/28; EmailControllerTests 5/5; backend completo 425/425; rebuild Release 0 erros/174 avisos gerais; `git diff --check` sem erros de whitespace; evidências T019 | Aliases compartilham cotas por destinatário e IP; legado sem e-mail não contorna IP e infere destinatário pelo token; falha preserva conta/token e login segue independente. #438 permanece In Progress. |
| 2026-10-13 | T022 | concluída | RED: startup aceitava segredo ausente, chave de trabalho pendente aposentada e política divergente; filtro 12/12; BrowserSecurityHeaders 7/7; LoginThrottle 9/9; contrato Python 4/4; Compose prod/dev/E2E válidos; backend completo 428/428; `git diff --check` | Startup falha fechado, compara política ativa e verifica chaves de trabalhos pendentes; readiness retorna apenas `ready`/`not_ready`; segredos montados somente leitura e E2E gera chaves sintéticas. #437 permanece In Progress; colisão de sub-rede e provisionamento de segredos ficam para o host de destino. |
| 2026-10-13 | T024 | concluída | RED 3/3; contrato 3/3; Compose config e up --wait; Playwright security 1/1, real 14/5 arquivos, UI 221/7; Caddy validate; cleanup do projeto; evidências T024 | Smoke atravessou Caddy com CSP no frontend e `/api` 401 sem CSP/CORS; projetos Compose isolados preservados. #439 permanece OPEN/In Progress. |
| 2026-10-13 | T023 (ajuste) | concluída | Contrato de política integrado 3/3; CSP com exceções restritas validada em Caddy e comprovada em T026 4/4; git diff --check; evidências T023 | A sonda interna do Zod usa eval e é bloqueada; wasm-unsafe-eval habilita somente Yoga WASM para exportação PDF e data: habilita o fetch WASM. Sem unsafe-eval, unsafe-inline, blob: ou origens externas. #439 permanece OPEN/In Progress. |
| 2026-10-13 | T025 | concluída | Seed safety/isolation 9/9; Playwright real descobriu 16/6 arquivos e UI 222/8; real 6/6; UI 1/1; Compose isolado config/up/cleanup; git diff --check; evidências T025 | Jornadas cobrem acesso vinculado e cruzado, mutação, perfil próprio, login, revogação de sessões, recuperação por aliases/Mailpit e logout. #436 permanece OPEN/In Progress. |
| 2026-10-13 | T026 | concluída | Playwright security 4/4; Caddy validate; contrato CSP integrado 3/3; Compose isolado config/up/cleanup; git diff --check; evidências T026 | CSP/CORS, três perfis, recuperação, exportações Excel/PDF e XFF forjado validados pela borda. Nenhuma violação inesperada; stack removido e volumes de T024 preservados. #439 permanece OPEN/In Progress. |
| 2026-10-13 | T027 | concluída | Quality gate 5/5; contratos `container-ci` 11/11; workflow security 4/4; Compose security 3/3/config; `git diff --check`; evidências T027 | Job `browser-security` obrigatório no Quality gate; restore usa `--locked-mode`. `actionlint` indisponível no host Windows; sem execução local do browser E2E nesta tarefa, coberto em T026 4/4. #439 permanece OPEN/In Progress. |
| 2026-10-13 | T028 | concluída | `check_manual.py` aprovado; `test_manual_content.py` 44 (43 aprovados, 1 skip WinError 1314); revisão de links e fatos operacionais; `git diff --check`; evidências T028 | Manual, README/CHANGELOG, OCI, migrações e runbook revisados contra configuração atual. Sem publicação, carga, SLO ou SMTP de produção; T030 segue condicionado a publicação autorizada. #436 permanece OPEN/In Progress. |
| 2026-10-13 | T029 | concluída | Integração cruzada 2/2; restore locked; backend completo 432/432; build Release 0 erros/92 avisos; frontend 694/694; lint/build; Playwright real 14/16, UI 222/222, security 5/5; evidências T029 | Duas falhas de real em registration-approval.spec.ts são expectativa divergente entre registro como Mentor e lista de Mentorados vinculados; documentadas sem ampliar autorização ou alterar teste fora do escopo. Métricas são uma amostra sintética; não houve publicação nem SMTP de produção. T030 permanece pendente de URL publicada autorizada e contas de teste; #436–#440 continuam abertas. |
| 2026-10-13 | T029 (revisão PR #441) | concluída | Backend 432/432; criptografia Linux 13/13; frontend 694/694; real 17/17, UI 222/222, security 5/5; npm audit zero; bases runtime Trivy amd64/arm64 zero HIGH/CRITICAL; contratos Python 375 aprovados/2 skips; evidências PR441 | Corrigidos os seis grupos de causas da esteira, incluindo migração Tailwind 4 e regressão de foco reproduzida/corrigida. Wiki fixa em f2c211c; geração e artefatos isolados preservados. O CI remoto das correções deve ser acompanhado na PR. T030/CA-027 continua pendente de candidato publicado e contas dedicadas; issues não encerradas. |
