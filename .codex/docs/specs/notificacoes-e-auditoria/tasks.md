# Tarefas: Notificações e auditoria

- Status: bloqueada
- PRD: `./prd.md`
- Especificação técnica: `./techspec.md`
- Atualizado em: 2026-11-24

Ler o PRD e a especificação técnica antes de iniciar. Usar destinatários, processos, relógio, registros e evidências sintéticos. O checkout já inclui Vitest, Playwright e xUnit com PostgreSQL descartável e jobs pré-merge.

Apenas a onda 1 está disponível para início. As demais ondas ficam condicionadas aos bloqueios de cada tarefa. Reavaliar `Paralela` após concluir os pré-requisitos. Coordenar `Program.cs`, `AppDbContext`, snapshot EF e DTOs de auditoria com os demais planos. T002 fornece a autoria a Contas, Empréstimos e Conciliação. O catálogo de limites e cotas vem de Proteção da API e do proxy.

## Ondas de execução

| Onda | Tarefas | Motivo de segurança do paralelismo |
|---|---|---|
| 1 | T001 | Levantamento disponível, com posse documental exclusiva. |
| 2 | T002 | Política de registro e retenção aprovada. |
| 3 | T003 | Condicionada à composição de audiência, ao legado e ao tratamento do lote misto. |
| 4 | T004 | Condicionada ao contrato de cotas, às permissões e à trilha obrigatória. |
| 5 | T005 | Condicionada às transições de revisão e à persistência do histórico. |
| 6 | T006 | Condicionada ao contrato de exportação, ao catálogo de API e à autorização. |
| 7 | T007 | Condicionada às janelas, à precedência e à integração com o histórico. |
| 8 | T008 | Condicionada ao contrato de leitura e de estado público. |
| 9 | T009 | Condicionada aos contratos de consulta, revisão e detecção. |
| 10 | T010 | Condicionada aos contratos implementados e à janela de compatibilidade aprovada. |

## T001 — Inventariar produtores, campos, destinatários e consumidores atuais

- Status: concluída
- Issue: #478
- Dependências: nenhuma
- Paralela: não
- Requisitos: RF-001, RF-004, RF-006, RNF-001, RNF-002, CA-006, CA-010
- Caminhos sob responsabilidade: `.codex/docs/specs/notificacoes-e-auditoria/inventario-eventos-e-consumidores.md`

### Escopo

Levantar localmente origens, identidade observada, campos capturados e consumidores de notificações e auditoria. Identificar como a leitura coletiva é representada e quais clientes usam registro explícito, relatório, pesquisa e exportação.

### Critérios de conclusão

- Há referência de código para cada produtor, campo e consumidor observado e registro das decisões necessárias de finalidade, grupo e legado.

### Plano TDD

- RED: Comparar a cobertura do inventário com pontos de registro, leitura, relatório e exportação encontrados no código.
- GREEN: Versionar as referências observáveis e lacunas por categoria.
- REFACTOR: Consolidar origens repetidas e distinguir a fonte de cada observação.

### Validação

- Na raiz, `rg -n 'IAuditoriaService|AuditoriaMiddleware|NotificacaoService|RelatorioAuditoria|CreateLogAuditoriaDTO|LogAuditoriaRepository' backend/LabSolos-Server-DotNet8 frontend/src` e conferir o inventário contra produtores e consumidores observados.

## T002 — Registrar eventos de origem confiável com trilha durável

- Status: concluída
- Issue: #478
- Dependências: T001
- Decisão aprovada: [política de registro e retenção](./techspec.md#política-aprovada-de-registro-e-retenção).
- Paralela: não
- Requisitos: RF-004, RNF-001, RNF-002, CA-005, CA-006, CA-010
- Caminhos sob responsabilidade: `.codex/docs/specs/notificacoes-e-auditoria/catalogo-eventos.md`, `backend/LabSolos-Server-DotNet8/Controllers/AuditoriaController.cs`, `backend/LabSolos-Server-DotNet8/Middlewares/AuditoriaMiddleware.cs`, `backend/LabSolos-Server-DotNet8/Services/IAuditoriaService.cs`, `backend/LabSolos-Server-DotNet8/Services/AuditoriaService.cs`, `backend/LabSolos-Server-DotNet8/Services/AuditoriaEventCatalog.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Auditoria/CreateLogAuditoriaDTO.cs`, `backend/LabSolos-Server-DotNet8/Mappings/AuditoriaMappingProfile.cs`, `backend/LabSolos-Server-DotNet8/Models/LogAuditoria.cs`, `backend/LabSolos-Server-DotNet8/Data/Context/AppDbContext.cs`, `backend/LabSolos-Server-DotNet8/Data/Migrations/*_AuditEventProvenance*`, `backend/LabSolos-Server-DotNet8/Data/Migrations/AppDbContextModelSnapshot.cs`, `backend/Tests/Controllers/AuditoriaControllerTests.cs`, `backend/Tests/Middlewares/AuditoriaMiddlewareTests.cs`, `backend/Tests/Services/AuditoriaServiceTests.cs`, `backend/Tests/Integration/AuditEventProvenanceTests.cs`

### Escopo

Derivar ação, recurso, momento, resultado e origem no servidor. Distinguir contexto autenticado, processo autorizado e ausência de ator válido. Entregar o contrato de registro durável para decisões e concessões de conta, trocas de e-mail, baixas e devoluções, e emissões e exclusões de notificações. Aplicar retenção de 365 dias à trilha obrigatória e de 30 dias ao diagnóstico.

### Critérios de conclusão

- Eventos sintéticos têm origem determinável ou ausência explícita. A projeção e os registros omitem material de autenticação e campos fora da finalidade.
- Um evento obrigatório fica durável na mesma transação do efeito de domínio. Falha nessa gravação reverte o efeito. Falhas secundárias sinalizam a correlação e preservam o resultado principal.
- Verificar o vencimento da retenção das duas categorias com relógio controlado.

### Plano TDD

- RED: Testar eventos de cada origem, indisponibilidade da trilha de um evento obrigatório e minimização dos campos em registros e projeções.
- GREEN: Implementar catálogo, adaptação de produtores existentes e garantia de persistência aprovada, com migração aditiva se exigida.
- REFACTOR: Compartilhar tipagem de origem e projeções mínimas entre produtores sem ampliar o contexto acessível.

### Validação

- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers --filter "FullyQualifiedName~AuditoriaControllerTests|FullyQualifiedName~AuditoriaMiddlewareTests|FullyQualifiedName~AuditoriaServiceTests|FullyQualifiedName~AuditEventProvenanceTests"`.
- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`, com Docker disponível para Testcontainers.

## T003 — Isolar escopo e leitura por destinatário

- Status: concluída
- Issue: #475
- Dependências: nenhuma
- Dependências externas: [T003 de Segurança de contas](../seguranca-de-contas-e-sessoes/tasks.md)
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#api-limites-e-auditoria).
- Paralela: não
- Requisitos: RF-001, RF-002, RNF-001, CA-001, CA-002, CA-003
- Caminhos sob responsabilidade: `.codex/docs/specs/notificacoes-e-auditoria/contrato-destinatarios.md`, `backend/LabSolos-Server-DotNet8/Controllers/NotificacoesController.cs`, `backend/LabSolos-Server-DotNet8/Services/NotificacaoService.cs`, `backend/LabSolos-Server-DotNet8/Repositories/NotificacaoRepository.cs`, `backend/LabSolos-Server-DotNet8/Models/Notificacao.cs`, `backend/LabSolos-Server-DotNet8/Models/NotificacaoLeitura.cs`, `backend/LabSolos-Server-DotNet8/Mappings/NotificacaoMappingProfile.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Notificacoes/MarcarLidaDTO.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Notificacoes/NotificacaoDTO.cs`, `backend/LabSolos-Server-DotNet8/Data/Context/AppDbContext.cs`, `backend/LabSolos-Server-DotNet8/Data/Migrations/*_NotificationRecipientRead*`, `backend/LabSolos-Server-DotNet8/Data/Migrations/AppDbContextModelSnapshot.cs`, `backend/Tests/Controllers/NotificacoesControllerTests.cs`, `backend/Tests/Services/NotificacaoServiceTests.cs`, `backend/Tests/Integration/NotificationRecipientReadTests.cs`

### Escopo

Aplicar a mesma relação de destinatários a lista, filtro, contador, detalhes e alteração individual e em lote. Persistir leitura idempotente por destinatário e preservar o histórico conforme decisão aprovada.

### Critérios de conclusão

- Os casos sintéticos de destinatário sem itens, dois leitores, itens fora do escopo e lote misto preservam o estado e os contadores corretos.
- O legado coletivo e as chamadas concorrentes seguem a decisão com PostgreSQL descartável.

### Plano TDD

- RED: Exigir lista e contador zero no vazio, coerência de escopo e isolamento de leitura entre dois destinatários, com repetição concorrente e lote misto.
- GREEN: Compor predicado comum, persistência relacional aprovada e mapeamento das respostas públicas.
- REFACTOR: Consolidar predicado de destinatário e projeção de leitura em consultas e mutações.

### Validação

- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers --filter "FullyQualifiedName~NotificacoesControllerTests|FullyQualifiedName~NotificacaoServiceTests|FullyQualifiedName~NotificationRecipientReadTests"`.
- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`, com Docker disponível para Testcontainers.

## T004 — Autorizar emissão e exclusão com cotas e trilha

- Status: concluída
- Issue: #475
- Dependências: T002, T003
- Dependências externas: [T002 de Proteção da API e do proxy](../protecao-de-api-e-proxy/tasks.md)
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#api-limites-e-auditoria).
- Paralela: não
- Requisitos: RF-003, RF-004, RNF-001, CA-004, CA-005
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Controllers/NotificacoesController.cs`, `backend/LabSolos-Server-DotNet8/Services/NotificacaoService.cs`, `backend/LabSolos-Server-DotNet8/Repositories/NotificacaoRepository.cs`, `backend/LabSolos-Server-DotNet8/Repositories/UnitOfWork.cs`, `backend/LabSolos-Server-DotNet8/Models/Notificacao.cs`, `backend/LabSolos-Server-DotNet8/Mappings/NotificacaoMappingProfile.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Notificacoes/CreateNotificacaoDTO.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/NotificationQuotaPolicy.cs`, `backend/LabSolos-Server-DotNet8/Models/AuthenticationProtectionCapacity.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/AuthenticationProtectionOptions.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/AuthenticationProtectionStartupValidator.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/AuthenticationThrottleResult.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/PostgresAuthenticationThrottle.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/SecurityServiceCollectionExtensions.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/ThrottleKeyFactory.cs`, `backend/LabSolos-Server-DotNet8/Data/Context/AppDbContext.cs`, `backend/LabSolos-Server-DotNet8/Data/Migrations/*_NotificationMutation*`, `backend/LabSolos-Server-DotNet8/Data/Migrations/AppDbContextModelSnapshot.cs`, `backend/Tests/Controllers/NotificacoesControllerTests.cs`, `backend/Tests/Mappings/MappingConfigurationTests.cs`, `backend/Tests/Services/NotificacaoServiceTests.cs`, `backend/Tests/Services/NotificationQuotaPolicyTests.cs`, `backend/Tests/Security/ThrottleKeyFactoryTests.cs`, `backend/Tests/Integration/NotificationMutationAuditTests.cs`, `backend/Tests/Integration/NotificationQuotaTests.cs`, `backend/Tests/Integration/SharedAuthenticationThrottleTests.cs`, `backend/Tests/Integration/AuthenticationProtectionMigrationTests.cs`

### Escopo

Validar autoridade de emissão manual, identidade da emissão automática, grupo ou destinatário e cota. Aplicar exclusão dentro do contrato aprovado e usar a trilha de origem de T002.

### Critérios de conclusão

- Só casos autorizados, elegíveis e dentro da cota produzem efeitos. Recusas preservam o estado e a trilha obrigatória é consistente com a operação confirmada.
- Repetição autorizada de processo converge para o efeito definido e a trilha identifica autor ou processo.

### Plano TDD

- RED: Testar fronteiras de emissão manual e automática, elegibilidade, perfil, exclusão e indisponibilidade da gravação obrigatória.
- GREEN: Aplicar a política aprovada no serviço e persistir o efeito com a trilha de T002.
- REFACTOR: Reutilizar escopo, contrato de cota e validações comuns de origem e ator.

### Validação

- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers --filter "FullyQualifiedName~NotificacoesControllerTests|FullyQualifiedName~NotificacaoServiceTests|FullyQualifiedName~NotificationQuotaPolicyTests|FullyQualifiedName~NotificationMutationAuditTests|FullyQualifiedName~NotificationQuotaTests|FullyQualifiedName~SharedAuthenticationThrottleTests|FullyQualifiedName~AuthenticationProtectionMigrationTests"`.
- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`, com Docker disponível para Testcontainers.

## T005 — Preservar o evento original e registrar reclassificações

- Status: concluída
- Issue: #478
- Dependências: T002
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#api-limites-e-auditoria).
- Paralela: não
- Requisitos: RF-005, RNF-001, RNF-002, CA-007, CA-010
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Controllers/AuditoriaController.cs`, `backend/LabSolos-Server-DotNet8/Services/AuditoriaService.cs`, `backend/LabSolos-Server-DotNet8/Repositories/ILogAuditoriaRepository.cs`, `backend/LabSolos-Server-DotNet8/Repositories/LogAuditoriaRepository.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Auditoria/LogAuditoriaDTO.cs`, `backend/LabSolos-Server-DotNet8/Models/AuditClassificationRevision.cs`, `backend/LabSolos-Server-DotNet8/Data/Context/AppDbContext.cs`, `backend/LabSolos-Server-DotNet8/Data/Migrations/*_AuditClassificationRevision*`, `backend/LabSolos-Server-DotNet8/Data/Migrations/AppDbContextModelSnapshot.cs`, `backend/Tests/Repositories/LogAuditoriaRepositoryTests.cs`, `backend/Tests/Integration/AuditClassificationRevisionTests.cs`

### Escopo

Registrar histórico de revisão vinculado ao evento original, com autor, instante, classificação anterior e resultante e motivação quando exigida. Implementar consistência da projeção efetiva sob concorrência.

### Critérios de conclusão

- Somente o ator autorizado efetiva transição permitida e a justificativa exigida é preservada. O evento original é verificável.
- Revisões concorrentes produzem cadeia consistente com conflito ou reavaliação de acordo com o contrato aprovado.

### Plano TDD

- RED: Testar transições permitidas e recusadas, histórico original preservado e concorrência relacional.
- GREEN: Persistir revisões e projeção efetiva conforme o desenho aprovado.
- REFACTOR: Consolidar a função de transição e reutilizar referências de autoria e horário confiáveis.

### Validação

- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers --filter "FullyQualifiedName~LogAuditoriaRepositoryTests|FullyQualifiedName~AuditClassificationRevisionTests"`.
- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`, com Docker disponível para Testcontainers.

### Execução local — 2026-11-23

- RED: o contrato com revisão esperada e justificativa recebeu HTTP 400 na rota antiga, que aceitava texto cru; os testes anteriores de repositório passaram 2/2.
- GREEN/REFACTOR: migration aditiva e backfill preservam o estado legado observado sem inventar autoria. Reclassificações gravam ator, UTC, motivo, estado anterior/resultante e revisão vinculada ao evento; token otimista conflita em revisão obsoleta. O GET expõe o histórico sanitizado.
- Testes dirigidos: 29/29, incluindo concorrência, autorização, motivo obrigatório e migração sobre registros legados. Suíte completa: 811/811, sem falhas ou skips. `dotnet ef migrations has-pending-model-changes` confirmou sem drift; `git diff --check` limpo.
- Migration: `20261123212008_AuditClassificationRevision`.

## T006 — Limitar consulta, relatório e exportação de auditoria ao escopo autorizado

- Status: concluída
- Issue: #478
- Dependências: T002, T005
- Dependências externas: [T006 de Segurança de contas](../seguranca-de-contas-e-sessoes/tasks.md) e [T002 de Proteção da API e do proxy](../protecao-de-api-e-proxy/tasks.md) e [T005 de Proteção da API e do proxy](../protecao-de-api-e-proxy/tasks.md)
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#api-limites-e-auditoria).
- Paralela: não
- Requisitos: RF-006, RNF-001, RNF-002, CA-008, CA-010
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Controllers/AuditoriaController.cs`, `backend/LabSolos-Server-DotNet8/Repositories/ILogAuditoriaRepository.cs`, `backend/LabSolos-Server-DotNet8/Repositories/LogAuditoriaRepository.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Auditoria/FiltroAuditoriaDTO.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Auditoria/RelatorioAuditoriaDTO.cs`, `backend/LabSolos-Server-DotNet8/Services/AuditQueryPolicy.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/OperationAdmissionPolicy.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/PostgresAuthenticationThrottle.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/AuthenticationProtectionStartupValidator.cs`, `backend/LabSolos-Server-DotNet8/Models/AuthenticationProtectionCapacity.cs`, `backend/LabSolos-Server-DotNet8/Data/Context/AppDbContext.cs`, `backend/LabSolos-Server-DotNet8/Data/Migrations/*_AuditQueryExportCapacity*`, `backend/LabSolos-Server-DotNet8/Data/Migrations/AppDbContextModelSnapshot.cs`, `backend/LabSolos-Server-DotNet8/Program.cs`, `backend/Tests/Controllers/AuditoriaControllerTests.cs`, `backend/Tests/Repositories/LogAuditoriaRepositoryTests.cs`, `backend/Tests/Integration/AuditExportScopeTests.cs`, `frontend/src/integration/Auditoria.ts`, `frontend/src/integration/Auditoria.errors.test.ts`, `frontend/src/pages/admin/Auditoria.tsx`

### Escopo

Reusar o contrato de paginação de API e aplicar filtro e escopo antes da ordenação, projeção e agregação para lista, relatório e exportação. Revalidar autorização na continuação ou entrega quando aplicável.

### Critérios de conclusão

- Resultados e agregações respeitam os filtros, escopo e tetos aprovados. Página vazia e pedido excedente seguem a política.
- A exportação usa campos aprovados e permite relacionar evento e revisão nos limites da autorização.

### Plano TDD

- RED: Exigir dados sintéticos com resultados acima do teto, mudança de autorização entre etapas, paginação vazia e agregação restrita.
- GREEN: Consolidar filtros e autorização na consulta e aplicar a limitação e projeção aprovadas por operação.
- REFACTOR: Remover consultas divergentes e compartilhar a tipagem de filtros e resultados.

### Validação

- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers --filter "FullyQualifiedName~AuditExportScopeTests|FullyQualifiedName~AuditoriaControllerTests|FullyQualifiedName~LogAuditoriaRepositoryTests"`.
- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`, com Docker disponível para Testcontainers.

### Execução local — 2026-11-23

- RED: testes reproduziram projeção ampla, relatório sem filtros, ausência de paginação/exportação e de cotas; o cenário fail-closed também exigiu recusa quando o limitador compartilhado está indisponível.
- GREEN/REFACTOR: consulta e relatório usam o mesmo escopo/filtros, paginação estável, projeção administrativa mínima e cotas compartilhadas de 60 consultas/relatórios por administrador/minuto e 5 exportações por administrador/hora. CSV limita o recorte a 5.000 registros e protege fórmulas. Migration `20261123214133_AuditQueryExportCapacity` adiciona as capacidades.
- Adaptador e tela administrativa foram ajustados ao envelope paginado e à projeção sanitizada; a integração herdada de T005 passou a ler `itens`.
- Testes dirigidos: 65/65; frontend: integração 3/3, lint e build passaram. Suíte backend completa: 823/823, sem falhas ou skips. EF sem drift; `git diff --check` limpo.

## T007 — Versionar regras e classificar eventos de forma revisável

- Status: concluída
- Issue: #478
- Dependências: T002, T005
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#api-limites-e-auditoria).
- Paralela: não
- Requisitos: RF-007, RNF-002, CA-009, CA-010
- Caminhos sob responsabilidade: `.codex/docs/specs/notificacoes-e-auditoria/catalogo-deteccao.md`, `backend/LabSolos-Server-DotNet8/Services/AuditDetectionService.cs`, `backend/LabSolos-Server-DotNet8/Services/AuditoriaService.cs`, `backend/LabSolos-Server-DotNet8/Repositories/ILogAuditoriaRepository.cs`, `backend/LabSolos-Server-DotNet8/Repositories/LogAuditoriaRepository.cs`, `backend/LabSolos-Server-DotNet8/Models/LogAuditoria.cs`, `backend/LabSolos-Server-DotNet8/Data/Context/AppDbContext.cs`, `backend/LabSolos-Server-DotNet8/Data/Migrations/*_AuditDetectionRuleProvenance*`, `backend/LabSolos-Server-DotNet8/Data/Migrations/AppDbContextModelSnapshot.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Auditoria/RelatorioAuditoriaDTO.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Auditoria/AuditLogProjectionDTO.cs`, `backend/LabSolos-Server-DotNet8/Services/AuditQueryPolicy.cs`, `backend/Tests/Services/AuditDetectionServiceTests.cs`, `backend/Tests/Services/AuditoriaServiceTests.cs`, `backend/Tests/Integration/AuditDetectionRuleTests.cs`, `backend/Tests/Integration/AuditExportScopeTests.cs`

### Escopo

Adotar tabela versionada e relógio controlável para distinguir atividade normal, suspeita e ausência de ator válido. Vincular a categoria à regra aplicada e disponibilizar detalhes mínimos para revisão autorizada.

### Critérios de conclusão

- Casos sintéticos nas fronteiras e em condições de precedência recebem a categoria prevista, com versão e referência da regra.
- A repetição sobre as mesmas entradas produz resultado coerente e preserva a classificação efetiva conforme a regra de convivência aprovada.

### Plano TDD

- RED: Criar conjuntos sintéticos mínimos por categoria, fronteira e precedência, exigindo que o resultado aponte para a regra responsável.
- GREEN: Instalar catálogo versionado, avaliação com relógio e projeção autorizada.
- REFACTOR: Consolidar avaliação de janelas e seleção de categoria com testes de determinismo.

### Validação

- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers --filter "FullyQualifiedName~AuditDetectionRuleTests|FullyQualifiedName~AuditDetectionServiceTests"`.
- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`, com Docker disponível para Testcontainers.

### Execução local — 2026-11-23

- RED: testes demonstraram ausência de limiar por conta, categoria para evento sem ator e metadados persistidos da regra aplicada.
- GREEN/REFACTOR: catálogo v1 aplica 5 falhas em 15 minutos por conta e 30 em 15 minutos por IP exato, com início/fim inclusivos e precedência do limite por conta. A falta de ator permanece explícita. Revisão humana conserva a regra aplicada.
- Migration `20261123224910_AuditDetectionRuleProvenance` persiste categoria, código, versão e contagem; backfill marca eventos antigos sem inventar regra.
- Testes dirigidos: 36/36. Suíte backend: 841/841, antes da inclusão de um teste unitário adicional que passou no filtro dirigido final. Build passou; EF sem drift; `git diff --check` limpo.

## T008 — Apresentar leitura e contador próprios no navegador

- Status: concluída
- Issue: #475
- Dependências: T003, T004
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#api-limites-e-auditoria).
- Paralela: não
- Requisitos: RF-001, RF-002, RNF-001, CA-001, CA-002, CA-003
- Caminhos sob responsabilidade: `frontend/src/integration/Notifications.ts`, `frontend/src/integration/Notifications.errors.test.ts`, `frontend/src/components/notifications/NotificationIcon.tsx`, `frontend/src/components/notifications/SimpleNotificationIcon.tsx`, `frontend/src/components/notifications/SidebarNotificationButton.tsx`, `frontend/src/components/notifications/NotificationReading.test.tsx`

### Escopo

Atualizar o consumidor comum e as interfaces de consulta e contador para representar a leitura do usuário, lista vazia e falha distinta conforme o contrato aprovado.

### Critérios de conclusão

- O estado vazio exibe lista vazia e contador zero. A leitura atualiza lista e contador do próprio destinatário e falha segue a apresentação textual aprovada.

### Plano TDD

- RED: Acrescentar testes de lista vazia, falha e duas sessões sintéticas com estado de leitura independente.
- GREEN: Atualizar tipagem e apresentação das mudanças de leitura pelo contrato da API.
- REFACTOR: Compartilhar comportamento de exibição e atualização entre os ícones de notificação.

### Validação

- Em `frontend`, após `npm ci`, `npm run test -- --run src/integration/Notifications.errors.test.ts src/components/notifications/NotificationReading.test.tsx`.
- Em `frontend`, `npm run lint` e `npm run build`.

### Execução local — 2026-11-23

- RED: 3 cenários falharam como esperado porque os três ícones convertiam falha de consulta em lista vazia; os outros 9 testes dirigidos passaram.
- GREEN/REFACTOR: teste dirigido passou 13/13; leitura, lista e contador agora compartilham o escopo do destinatário, e falhas aparecem separadas do estado vazio.
- `npm run lint`, `npm run build` e `git diff --check` passaram. O build mantém avisos não bloqueantes já observados sobre `/env.js`, `laboratory.png` e um chunk acima de 500 kB.
- Arquivos: `frontend/src/components/notifications/NotificationIcon.tsx`, `SimpleNotificationIcon.tsx`, `SidebarNotificationButton.tsx`, novo `NotificationReading.test.tsx` e `frontend/src/integration/Notifications.errors.test.ts`. A alteração preexistente em `Notifications.ts` foi preservada.

## T009 — Apresentar consulta, histórico e exportação autorizados

- Status: concluída
- Issue: #478
- Dependências: T005, T006, T007
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#api-limites-e-auditoria).
- Paralela: não
- Requisitos: RF-005, RF-006, RF-007, RNF-001, RNF-002, CA-007, CA-008, CA-009, CA-010
- Caminhos sob responsabilidade: `frontend/src/pages/admin/Auditoria.tsx`, `frontend/src/pages/admin/Auditoria.test.tsx`, `frontend/src/integration/Auditoria.ts`, `frontend/src/integration/Auditoria.errors.test.ts`, `frontend/src/errors/errorCatalog.ts`

### Escopo

Adequar página e adaptador a filtros, vazio, ausência de permissão, estado de exportação e apresentação mínima do histórico e da regra aplicada.

### Critérios de conclusão

- Consulta, continuação e exportação conservam filtros e estados públicos. O perfil autorizado consegue revisar a relação entre evento, histórico e regra aplicada.

### Plano TDD

- RED: Exigir testes de tela e adaptador para filtro, ausência de permissão, exportação e histórico vinculados a uma regra sintética.
- GREEN: Conectar as projeções e estados aprovados aos seus consumidores.
- REFACTOR: Centralizar tipagem e estado de filtros e reaproveitar o mapeamento público de erros.

### Validação

- Em `frontend`, após `npm ci`, `npm run test -- --run src/integration/Auditoria.errors.test.ts src/pages/admin/Auditoria.test.tsx`.
- Em `frontend`, `npm run lint` e `npm run build`.

### Execução local — 2026-11-23

- RED: os testes cobriram filtros aplicados, paginação que mantém critérios, exportação, estados vazio/sem autorização, histórico e regra sanitizados e envio da revisão esperada com justificativa.
- GREEN/REFACTOR: a tela e o adaptador apresentam filtros e paginação coerentes, exportação CSV, estado de autorização/vazio e histórico de revisão/regra com campos permitidos. A reclassificação usa o contrato de revisão de T005.
- Testes dirigidos: 12 passaram; `npm run lint`, `npm run build` e `git diff --check` passaram. Build manteve avisos já conhecidos de `/env.js`, `laboratory.png` e chunk acima de 500 kB.
- Alterações T006 preexistentes no adaptador, página e testes foram preservadas e estendidas.

## T010 — Validar notificações e auditoria na composição descartável

- Status: bloqueada
- Issue: #478
- Dependências: T004, T006, T007, T008, T009
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#api-limites-e-auditoria).
- Bloqueio: A composição atual e a persistência passaram, mas o binário anterior `c642854` mostrou a leitura coletiva como não lida para ambos os destinatários (1/1), mesmo com leitura individual 0/1 persistida. A API restaurada recuperou 0/1 e o histórico, porém o rollback funcional não preserva o isolamento enquanto essa versão estiver ativa. É necessária uma versão de retorno compatível com `NotificacaoLeitura` e revisões de auditoria; ver [evidência local](./evidencias-validacao.md#ensaio-de-retorno-para-a-versão-anterior).
- Paralela: não
- Requisitos: RF-001, RF-002, RF-003, RF-004, RF-005, RF-006, RF-007, RNF-001, RNF-002, CA-001, CA-003, CA-005, CA-006, CA-007, CA-008, CA-009, CA-010
- Caminhos sob responsabilidade: `.codex/docs/specs/notificacoes-e-auditoria/evidencias-validacao.md`, `frontend/e2e/notifications-audit.real.spec.ts`, `frontend/e2e/notifications-audit.ui.spec.ts`, `frontend/playwright.config.ts`

### Escopo

Validar os poucos cenários que cruzam interface, API e persistência de notificação e auditoria. Registrar versão, configuração sintética, matriz executada e compatibilidade de retorno preservando leituras isoladas e histórico.

### Critérios de conclusão

- Composição E2E verifica lista e contador de destinatários, trilha e revisão, filtros e exportação. A evidência de compatibilidade demonstra preservação dos eventos e leituras após retorno em ambiente descartável.
- Artefatos de teste omitem dados fora da finalidade e material de autenticação.

### Plano TDD

- RED: Adicionar cenários de composição que apontem divergência observável entre o cliente e as respostas no fluxo autorizado.
- GREEN: Integrar os cenários aos projetos `real` e `ui` existentes e registrar as evidências sanitizadas.
- REFACTOR: Reusar fixtures de Playwright e manter E2E restrito aos contratos entre camadas.

### Validação

- Em `frontend`, após `npx --no-install playwright install chromium`, `npm run test:e2e -- --project=real notifications-audit.real.spec.ts`.
- Em `frontend`, após `npx --no-install playwright install chromium`, `npm run test:e2e -- --project=ui notifications-audit.ui.spec.ts`.
- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`, com Docker disponível para Testcontainers.
- Em `frontend`, após `npm ci`, `npm run test -- --run`.
- Em `frontend`, `npm run lint` e `npm run build`.

### Notas

Usar a composição descartável conforme o job `Authentication E2E` na verificação com o projeto `real`.

## Log de execução

| Data | Tarefa | Resultado | Testes/evidências | Observações |
|---|---|---|---|---|
| 2026-11-23 | T010 — composição e retorno | bloqueada por compatibilidade do rollback | E2E `ui` 1/1, `real` 1/1; frontend 1021/1021, lint/build; backend 846/846; API anterior e API atual testadas no mesmo PostgreSQL sintético. | Dados sobreviveram: API antiga exibiu 1/1 para ambos e a atual restaurada recuperou 0/1, revisão e histórico. A versão anterior não preserva a visualização individual durante a janela de rollback. A tentativa Playwright auxiliar em porta não padrão expirou por origem CORS fora da allowlist; as composições previstas passaram. Artefatos temporários ignorados permaneceram após a limpeza ser bloqueada pela política automática do shell. |
| 2026-11-24 | T010 — avaliação do candidato de retorno | bloqueada; `c642854` é incompatível e o backport seguro não é pontual | Inspeção somente leitura do worktree isolado em `.tmp/t010-rollback-candidate`; confirmadas lacunas em leitura/emissão por destinatário, proveniência e revisões append-only da auditoria. A suíte E2E integrada atual passou 255/255, incluindo notificações `real` e `ui`, sem validar o binário de retorno. | Nenhum código do candidato foi alterado. O verde do contrato atual não remove a incompatibilidade do rollback: é necessária uma versão de retorno dedicada que porte os contratos atuais antes de repetir o ensaio. Nenhum serviço de rollback ou GitHub foi usado. |
| 2026-11-23 | T004 | concluída | RED: `ExcluirNotificacaoExpõeDeleteProtegidoPorAdministrador` falhou porque o endpoint não existia. GREEN/REFACTOR: filtro dirigido 108/108; backend completo 804/804, sem falhas ou skips; `dotnet ef migrations has-pending-model-changes` sem drift; `git diff --check` aprovado. | Migration `20261123203026_NotificationMutation` adiciona exclusão lógica, chave idempotente/índice filtrado e os dois scopes PostgreSQL. Cotas: 30 manuais por administrador/h e 60 automáticas pelo principal de serviço/h; 429+Retry-After, 503 fail-closed. Auditoria compartilha a transação da emissão/exclusão. Repetições automáticas são idempotentes; emissão automática sem destinatário elegível é omitida sem efeito, auditoria ou cobrança. Campos internos ficam fora do DTO público. |
| 2026-11-23 | T003 | concluída | RED: 4/4 testes relacionais reproduziram vazamento de audiência, lote parcial, sobrescrita de leitura e grupo indevido. GREEN: filtro dirigido 33/33, `MappingConfigurationTests` 1/1, migration sem drift e suíte backend integrada 780/780. | Migration aditiva faz backfill individual, mantém coletivos sem evidência para conciliação, congela audiência e torna leitura idempotente. As regressões integradas de Origin/CSRF foram revalidadas após Contas T009. |
| 2026-11-19 | T002 | concluída | RED: teste de privacidade falhou por persistir canário. GREEN: 44/44 dirigidos, incluindo PostgreSQL 4/4; `has-pending-model-changes` sem drift e `git diff --check` aprovados. Full backend: 706/722 passaram, 16 falharam em expectativas de privacidade antigas, contagens rígidas de migrations, devolução pendente e contratos de API/data pendentes. | Catálogo tipado, origem/ator/correlação/resultados, trilha obrigatória em UoW, diagnóstico e expurgo 30/365 dias, backfill minimizado, POST de registro desativado; middleware preserva resultado principal e relança exceções. |
| 2026-11-17 | T002 | pendente | RED parcial: teste temporário detectou os 7 campos de proveniência/expiração ausentes (7/7 falhas). | Interrompida a pedido do usuário antes de alterar produção; o teste temporário foi removido para não deixar a suíte falhando. Retomar a trilha transacional e retenção em outra sessão. |
| 2026-11-15 | T001 | concluída | Verificação documental inicial encontrou inventário ausente. Final: 18 fontes locais, 112 referências conferidas. | Inventário estático local; consumidores externos e decisões de finalidade, grupo e legado seguem em aberto. |
