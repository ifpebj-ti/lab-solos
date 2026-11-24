# Tarefas: Segurança de contas e sessões

- Status: concluída
- PRD: `./prd.md`
- Especificação técnica: `./techspec.md`
- Atualizado em: 2026-11-24

Usar apenas contas, relógio, caixas e referências sintéticas. As suítes e os jobs pré-merge já existem no checkout. Ler o PRD e a especificação técnica antes de iniciar a tarefa.

A execução local das ondas seguiu as dependências e os bloqueios registrados por tarefa. Coordenar alterações entre planos em `Program.cs`, `UsuariosController.cs`, `AppDbContext` e no snapshot EF. A guarda de continuidade de #474 tem implementação e prova concorrente em Integridade. A conciliação de dados existentes tem autorização própria.

## Ondas de execução

| Onda | Tarefas | Motivo de segurança do paralelismo |
|---|---|---|
| 1 | T001, T002 | Levantamento documental e compatibilidade JWT usam caminhos independentes. |
| 2 | T003 | Matriz, contrato público e tratamento legado aprovados. |
| 3 | T004 | Condicionada ao cadastro e aos estados públicos de falha. |
| 4 | T005 | Condicionada à política de elegibilidade, à guarda administrativa e à autoria. |
| 5 | T006 | Condicionada à matriz de publicação e às exceções de autorização. |
| 6 | T007 | Condicionada ao desenho e à transição de sessões. |
| 7 | T008 | Condicionada aos valores e à janela de alteração de senha. |
| 8 | T009 | Condicionada ao ciclo de sessão e ao contrato de origem e CSRF. |
| 9 | T010 | Condicionada à autoridade, à carência e à persistência de avisos. |
| 10 | T011 | Condicionada ao tratamento da entrega de avisos. |
| 11 | T012 | Condicionada à confirmação administrativa e ao contrato público. |
| 12 | T013 | Condicionada à implementação dos contratos e à aprovação da janela de compatibilidade. |

## T001 — Inventariar rotas efetivas e políticas declaradas

- Status: concluída
- Issue: #484
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-007, CA-009
- Caminhos sob responsabilidade: `.codex/docs/specs/seguranca-de-contas-e-sessoes/inventario-acesso-atual.md`

### Escopo

Levantar, a partir dos metadados locais, método e caminho, políticas declaradas, consumidores e restrições de sessão. Registrar lacunas de inventário a revisar e identificar o consumidor no proxy.

### Critérios de conclusão

- Cada rota observada tem referência de implementação e a indicação de metadados efetivos.
- Cada política nomeada, inclusive `ApenasDependentes`, tem consumidor observado ou registro de uso a revisar. As exceções aguardam aprovação da matriz.

### Plano TDD

- RED: Verificar que o checkout não tem inventário de rotas que confronte políticas declaradas com uso efetivo.
- GREEN: Versionar a tabela de estado atual com a fonte de cada linha.
- REFACTOR: Consolidar referências repetidas e manter critérios de conferência claros.

### Validação

- Na raiz, `rg -n 'MapControllers|MapHealthChecks|AddPolicy|Authorize|AllowAnonymous|Http(Get|Post|Put|Patch|Delete)' backend/LabSolos-Server-DotNet8` e conferir as linhas do inventário com rotas e consumidores.

## T002 — Unificar configuração da emissão e da validação JWT em .NET 8

- Status: concluída
- Issue: #484
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RNF-002, CA-010
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Services/JwtService.cs`, `backend/LabSolos-Server-DotNet8/Program.cs`, `backend/LabSolos-Server-DotNet8/LabSolos-Server-DotNet8.csproj`, `backend/LabSolos-Server-DotNet8/packages.lock.json`, `backend/Tests/Integration/JwtSessionVersionTests.cs`

### Escopo

Exercitar o transporte atual com configuração sintética e alinhar configuração efetiva e codificação usadas pelo emissor e pelo validador.

### Critérios de conclusão

- A emissão e a validação usam os mesmos bytes, emissor, audiência e duração efetiva. As recusas atuais de sessão inválida e sessão restrita permanecem verificadas.
- A suíte na CI usa a dependência de autenticação compatível com `net8.0` e preserva a restauração travada.

### Plano TDD

- RED: Caracterizar o caso válido atual e acrescentar emissão e validação com configuração sintética de codificação diferenciada, que deve evidenciar a divergência entre os componentes.
- GREEN: Compartilhar a configuração e a codificação entre os dois componentes.
- REFACTOR: Remover conversões duplicadas e manter asserções de sessão e acesso.

### Validação

- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers --filter "FullyQualifiedName~JwtSessionVersionTests"`.
- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`, com Docker disponível para Testcontainers.

## T003 — Aplicar a matriz de contas ao cadastro público

- Status: concluída
- Issue: #469
- Dependências: nenhuma
- Dependências externas: [T001 de Contratos de dados de usuário](../contratos-dados-usuario/tasks.md) e [T003 de Contratos de dados de usuário](../contratos-dados-usuario/tasks.md)
- Decisão aprovada: [matriz de cadastro, aprovação e concessão](./techspec.md#matriz-aprovada).
- Decisão aprovada: [contrato público de cadastro e tratamento legado](./techspec.md#contrato-público-de-cadastro-aprovado).
- Paralela: não
- Requisitos: RF-001, RF-004, RNF-001, CA-001, CA-002, CA-005
- Caminhos sob responsabilidade: `.codex/docs/specs/seguranca-de-contas-e-sessoes/matriz-contas.md`, `backend/LabSolos-Server-DotNet8/Services/UsuarioService.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/PoliticaContas.cs`, `backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Usuarios/AddUsuarioDTO.cs`, `backend/LabSolos-Server-DotNet8/Mappings/UsuarioMappingProfile.cs`, `backend/Tests/Integration/CriticalRegistrationTests.cs`, `backend/Tests/Controllers/UsuarioRegistrationValidationTests.cs`, `backend/Tests/Services/UsuarioServiceValidationTests.cs`

### Escopo

Versionar a regra de tipo, papel derivado, vínculo, estado e autoridade para os consumidores da política de contas. Aplicar a derivação no cadastro e normalizar as duas classes de falha pública.

### Critérios de conclusão

- Os tipos públicos autorizados persistem tipo, papel e estado coerentes com a matriz, com o vínculo exigido.
- Tentativas fora da política preservam a base. Os testes de contrato verificam o `201` de sucesso, o descarte do responsável enviado no cadastro de Mentor e os status, códigos e textos aprovados para cada classe de falha.

### Plano TDD

- RED: Acrescentar casos parametrizados válidos, fora da matriz e equivalentes por classe, exigindo coerência do registro persistido e da resposta pública.
- GREEN: Instalar a política central de domínio no cadastro e mapear as categorias públicas conforme o contrato.
- REFACTOR: Remover derivações duplicadas e preservar mapeamentos de dados independentes.

### Validação

- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers --filter "FullyQualifiedName~CriticalRegistrationTests|FullyQualifiedName~UsuarioRegistrationValidationTests|FullyQualifiedName~UsuarioServiceValidationTests"`.
- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`, com Docker disponível para Testcontainers.

### Notas

A matriz versionada é a referência de administrador habilitado para #474. O inventário de divergências de contas existentes pertence à conciliação.

## T004 — Exibir resultados públicos de cadastro no frontend

- Status: concluída
- Issue: #479
- Dependências: T003
- Dependências externas: [T002 de Experiência de erros no frontend](../experiencia-erros-frontend/tasks.md) e [T011 de Experiência de erros no frontend](../experiencia-erros-frontend/tasks.md)
- Paralela: não
- Requisitos: RF-001, RF-004, RNF-001, CA-001, CA-002, CA-005
- Caminhos sob responsabilidade: `frontend/src/pages/CreateAccount.tsx`, `frontend/src/pages/CreateAccount.test.tsx`, `frontend/src/pages/CreateAccount.errors.test.ts`, `frontend/src/contracts/userRegistration.ts`, `frontend/src/contracts/userRegistration.test.ts`, `frontend/src/integration/Auth.ts`, `frontend/src/integration/Auth.test.ts`, `frontend/src/errors/errorCatalog.ts`, `frontend/src/errors/errorCatalog.test.ts`

### Escopo

Atualizar seleção de conta, envio e mensagens pela matriz pública aprovada, usando o mapeamento central de falhas.

### Critérios de conclusão

- Cadastro permitido segue a jornada vigente. Falhas equivalentes apresentam a orientação do contrato público e o estado de validação em texto.

### Plano TDD

- RED: Exigir, nos testes de tela e integração, os tipos públicos permitidos e uma mensagem equivalente por classe de vínculo e unicidade.
- GREEN: Adequar formulário, tipagem do cliente e mapeamento ao contrato publicado.
- REFACTOR: Usar o estado comum de erro acessível e preservar a normalização de dados do usuário.

### Validação

- Em `frontend`, após `npm ci`, `npm run test -- --run src/pages/CreateAccount.test.tsx src/pages/CreateAccount.errors.test.ts src/contracts/userRegistration.test.ts src/integration/Auth.test.ts src/errors/errorCatalog.test.ts`.
- Em `frontend`, `npm run lint` e `npm run build`.

## T005 — Unificar fila, decisão e concessão administrativa com autoria

- Status: concluída
- Issue: #469
- Dependências: T003
- Dependências externas: [T005 de Integridade](../integridade-de-produtos-e-lotes/tasks.md) e [T002 de Notificações e auditoria](../notificacoes-e-auditoria/tasks.md)
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#contas-e-publicação).
- Paralela: não
- Requisitos: RF-002, RF-003, RNF-001, CA-002, CA-003, CA-004
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs`, `backend/LabSolos-Server-DotNet8/Services/UsuarioService.cs`, `backend/LabSolos-Server-DotNet8/Repositories/UsuarioRepository.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Usuarios/UsuarioAcompanhamentoDTO.cs`, `backend/Tests/Integration/CriticalUserApprovalTests.cs`, `frontend/src/integration/Class.ts`, `frontend/src/integration/Class.approval.test.ts`, `frontend/src/pages/RegistrationRequests.tsx`, `frontend/src/pages/RegistrationRequests.critical.test.tsx`

### Escopo

Aplicar a regra de elegibilidade de T003 à fila e às decisões transacionais, expor tipo e papel efetivo na projeção usada pela fila e integrar a concessão ao serviço de autoria e à guarda compartilhada.

### Critérios de conclusão

- Fila vazia, solicitação inelegível e mudança de elegibilidade concorrente seguem o contrato. A decisão obsoleta preserva o estado vigente.
- Apenas ator autorizado concede privilégio, com alvo, autor e privilégio auditáveis. A escrita que retira capacidade administrativa usa a guarda de #474 na mesma transação.

### Plano TDD

- RED: Exigir casos de fila coerente e vazia, decisão obsoleta e concessão com ou sem autoridade e trilha válida, usando integrações sintéticas.
- GREEN: Compartilhar predicados, reavaliar elegibilidade em transação e gravar a trilha aprovada na concessão.
- REFACTOR: Consolidar projeções e reaproveitar a implementação de #474 para mutações pertinentes.

### Validação

- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers --filter "FullyQualifiedName~CriticalUserApprovalTests"`.
- Em `frontend`, após `npm ci`, `npm run test -- --run src/pages/RegistrationRequests.critical.test.tsx`.
- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`, com Docker disponível para Testcontainers.

### Notas

A atualização da projeção de fila e do consumidor divide o mesmo contrato entregue nesta tarefa. Integridade mantém a cobertura concorrente transversal de #474.

## T006 — Proteger rotas por padrão e publicar a matriz de acesso

- Status: concluída
- Issue: #484
- Dependências: T001, T002, T003
- Dependências externas: [T001 de Proteção da API e do proxy](../protecao-de-api-e-proxy/tasks.md)
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#contas-e-publicação).
- Paralela: não
- Requisitos: RF-007, RNF-002, CA-009, CA-010
- Caminhos sob responsabilidade: `.codex/docs/specs/seguranca-de-contas-e-sessoes/matriz-acesso.md`, `backend/LabSolos-Server-DotNet8/Program.cs`, `backend/LabSolos-Server-DotNet8/Controllers/AuthController.cs`, `backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs`, `backend/LabSolos-Server-DotNet8/Controllers/EmailController.cs`, `backend/LabSolos-Server-DotNet8/Controllers/SystemController.cs`, `backend/Tests/Integration/AuthorizationRouteMatrixTests.cs`

### Escopo

Cruzar o inventário atual com o mapa de consumidores e aplicar a política de fallback com exceções explícitas. Entregar matriz por método, caminho, ambiente, perfil, recurso, sessão restrita e consumidor.

### Critérios de conclusão

- Casos anônimo, autorizado, inelegível e restrito correspondem à matriz, preservadas as autorizações por recurso.
- Toda política preservada está referenciada por uso efetivo. Cada remoção tem decisão registrada.

### Plano TDD

- RED: Acrescentar teste da matriz cobrindo rota protegida, exceções legítimas, acesso sem permissão e sessão restrita, com verificação de metadados.
- GREEN: Configurar padrão protegido, mapear exceções aprovadas e associar as políticas de sessão e recurso.
- REFACTOR: Consolidar asserções de matriz e remover duplicações conforme o inventário.

### Validação

- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers --filter "FullyQualifiedName~AuthorizationRouteMatrixTests|FullyQualifiedName~JwtSessionVersionTests"`.
- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`, com Docker disponível para Testcontainers.

## T007 — Persistir estado e revogação da sessão corrente

- Status: concluída
- Issue: #482
- Dependências: T002, T003, T006
- Dependências externas: [T009 de Ciclo de vida de credenciais](../ciclo-vida-autenticacao-credenciais/tasks.md) e [T011 de Ciclo de vida de credenciais](../ciclo-vida-autenticacao-credenciais/tasks.md)
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#contas-e-publicação).
- Paralela: não
- Requisitos: RF-005, RNF-001, RNF-002, CA-006, CA-008, CA-010
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Program.cs`, `backend/LabSolos-Server-DotNet8/Controllers/AuthController.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/SessaoService.cs`, `backend/LabSolos-Server-DotNet8/Models/SessaoAutenticacao.cs`, `backend/LabSolos-Server-DotNet8/Data/Context/AppDbContext.cs`, `backend/LabSolos-Server-DotNet8/Data/Migrations/*_Sessao*`, `backend/LabSolos-Server-DotNet8/Data/Migrations/AppDbContextModelSnapshot.cs`, `backend/Tests/Integration/JwtSessionVersionTests.cs`, `backend/Tests/Integration/SessionLifecycleTests.cs`

### Escopo

Implementar emissão, estado mínimo, renovação e revogação da sessão atual em persistência aditiva, preservando revogação por versão após troca ou redefinição de senha.

### Critérios de conclusão

- Logout idempotente confirma revogação. Sessão expirada ou encerrada recebe `401` em operação e renovação. O caso renovável segue a tabela aprovada.
- Mudanças de papel, estado e versão seguem a matriz. Falha de persistência de revogação tem resultado distinto de encerramento confirmado.

### Plano TDD

- RED: Testar com relógio controlado ativa, elegível, expirada e encerrada, revogação global de credenciais, falha de persistência e convivência de esquema.
- GREEN: Persistir o estado mínimo, centralizar a validação e aplicar a janela aprovada sobre expiração, renovação e corte.
- REFACTOR: Consolidar validação de estado, expiração e versão para emitir, consultar e renovar.

### Validação

- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers --filter "FullyQualifiedName~SessionLifecycleTests|FullyQualifiedName~JwtSessionVersionTests|FullyQualifiedName~PostgreSqlApplicationSmokeTests"`.
- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`, com Docker disponível para Testcontainers.

## T008 — Aplicar o limite aprovado à troca de senha

- Status: concluída
- Issue: #482
- Dependências: T007
- Dependências externas: [T009 de Proteção de acesso](../protecao-acesso-autenticacao/tasks.md)
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#contas-e-publicação).
- Paralela: não
- Requisitos: RF-005, RF-006, RNF-001, CA-008
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Program.cs`, `backend/LabSolos-Server-DotNet8/Controllers/AuthController.cs`, `backend/LabSolos-Server-DotNet8/Models/AuthenticationProtectionCapacity.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/PasswordChangeRateLimitPolicy.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/PostgresAuthenticationThrottle.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/CredentialService.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/AuthenticationProtectionStartupValidator.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/ThrottleKeyFactory.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/SecurityServiceCollectionExtensions.cs`, `backend/LabSolos-Server-DotNet8/Data/Migrations/20261119053337_PasswordChangeRateLimitCapacity.cs`, `backend/LabSolos-Server-DotNet8/Data/Migrations/20261119053337_PasswordChangeRateLimitCapacity.Designer.cs`, `backend/Tests/Controllers/AuthChangePasswordTests.cs`, `backend/Tests/Integration/PasswordChangeRateLimitTests.cs`

### Escopo

Aplicar cota à troca de senha no contexto permitido, com resposta pública de limitação e preservação da revogação global após troca concluída.

### Critérios de conclusão

- Tentativas abaixo, na fronteira e acima do limite respondem segundo a política publicada. A recusa preserva a senha e o estado. A troca válida exige reautenticação das sessões anteriores.

### Plano TDD

- RED: Adicionar asserções com relógio sintético para limite, próxima janela, sessão restrita e revogação após sucesso.
- GREEN: Usar o contrato de cotas existente para medir a identidade aprovada e responder com `429` e `Retry-After` onde previsto.
- REFACTOR: Reaproveitar a formatação de limitação e a revogação já exercitada.

### Validação

- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers --filter "FullyQualifiedName~AuthChangePasswordTests|FullyQualifiedName~PasswordChangeRateLimitTests|FullyQualifiedName~JwtSessionVersionTests"`.
- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`, com Docker disponível para Testcontainers.

## T009 — Migrar a sessão de navegador e a proteção CSRF

- Status: concluída
- Issue: #482
- Dependências: T007, T008
- Dependências externas: [T008 de Proteção da API e do proxy](../protecao-de-api-e-proxy/tasks.md) e [T013 de Proteção de acesso](../protecao-acesso-autenticacao/tasks.md)
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#contas-e-publicação).
- Paralela: não
- Requisitos: RF-005, RF-006, RNF-001, CA-006, CA-007, CA-008
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Program.cs`, `backend/LabSolos-Server-DotNet8/Controllers/AuthController.cs`, `backend/Tests/Integration/BrowserSessionContractTests.cs`, `backend/Tests/Integration/SessionLifecycleTests.cs`, `backend/Tests/Integration/PasswordChangeRateLimitTests.cs`, `backend/Tests/Integration/BrowserSecurityHeadersTests.cs`, `frontend/src/auth/session.ts`, `frontend/src/auth/session.test.ts`, `frontend/src/auth/sessionConsumers.test.tsx`, `frontend/src/test/session.ts`, `frontend/src/test/msw/handlers.ts`, `frontend/src/integration/Auth.ts`, `frontend/src/integration/Auth.integration.test.ts`, `frontend/src/integration/*.ts` e respectivos testes que leem `doorKey` ou montam `Authorization: Bearer`, `frontend/src/services/BaseApi.tsx`, `frontend/src/services/BaseApi.test.tsx`, `frontend/src/components/global/ButtonLogout.tsx`, `frontend/src/components/global/ButtonLogout.test.tsx`, consumidores de `rankID`/`level` migrados para o contexto mínimo da sessão e respectivos testes, `frontend/src/pages/ChangePassword.tsx`, `frontend/src/pages/ChangePassword.test.tsx`, `frontend/e2e/credential-lifecycle.spec.ts`, `frontend/e2e/browser-security.real.spec.ts`, `frontend/e2e/error-experience.spec.ts`, `frontend/e2e/feature-visibility.spec.ts`, `frontend/e2e/post-auth-navigation.spec.ts`, `frontend/e2e/post-auth-navigation-support.ts`, `frontend/e2e/responsive-support.ts`, `frontend/e2e/user-data-contract.spec.ts`, `frontend/e2e/user-data-contract.real.spec.ts`, `frontend/playwright.config.ts`

### Escopo

Coordenar a emissão e a limpeza de cookie pelo servidor com cliente, contexto mínimo e prova CSRF nas mutações. Migrar os consumidores de sessão pelo ponto comum de integração e orientar reautenticação ou limitação em texto.

### Escopo de migração do cliente

O cookie `doorKey` não pode continuar sendo lido ou criado pelo JavaScript. Migrar todas as integrações autenticadas para cookie enviado pelo navegador e para um ponto comum que inclua origem e token CSRF nas mutações. O logout deve revogar a sessão no servidor antes de limpar o estado local; consultas de perfil devem usar o contexto mínimo retornado pelo servidor, sem tratar `rankID` ou `level` locais como autoridade. Atualizar os testes dos consumidores encontrados por `rg -n 'doorKey|Authorization:.*Bearer|rankID|level' frontend/src` e remover o transporte legado de credenciais do cliente.

### Retomada — 2026-11-24

A validação T016 encontrou duas expectativas desatualizadas em `user-data-contract.real.spec.ts`: o formulário de Mentor não apresenta e-mail de responsável pela matriz pública aprovada, e o teste de validação de cidade/curso divergiu do corpo de erros recebido. Revisar os dois casos contra o contrato vigente e atualizar somente o E2E dentro dos caminhos desta tarefa; se a API não cumprir o contrato documentado, encaminhar ao proprietário do backend em vez de enfraquecer a asserção.

### Critérios de conclusão

- Sessão de navegador usa `HttpOnly`, `Secure` e `SameSite` explícito. Mutações autenticadas seguem a verificação aprovada, incluindo logout e renovação quando aplicável.
- A interface limpa dados privados e distingue logout confirmado de revogação indisponível, expiração e limitação.

### Plano TDD

- RED: Exigir atributos do cookie em HTTPS sintético, casos genéricos com e sem a verificação exigida e estados observáveis de reautenticação e limitação.
- GREEN: Ligar o cookie, a proteção CSRF e o contrato de origem; atualizar a integração e a orientação de sessão e senha.
- REFACTOR: Centralizar a requisição autenticada e o tratamento dos estados de sessão, conservando a cobertura dos consumidores.

### Validação

- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers --filter "FullyQualifiedName~BrowserSessionContractTests|FullyQualifiedName~SessionLifecycleTests"`.
- Em `frontend`, após `npm ci`, `npm run test -- --run src/auth/session.test.ts src/auth/sessionConsumers.test.tsx src/integration/Auth.integration.test.ts src/pages/ChangePassword.test.tsx`.
- Em `frontend`, `npm run lint` e `npm run build`.

## T010 — Proteger a troca de e-mail, a carência e o registro de avisos

- Status: concluída
- Issue: #485
- Dependências: T003, T005
- Dependências externas: [T012 de Proteção de acesso](../protecao-acesso-autenticacao/tasks.md) e [T002 de Notificações e auditoria](../notificacoes-e-auditoria/tasks.md)
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#contas-e-publicação).
- Paralela: não
- Requisitos: RF-008, RF-009, RNF-001, CA-011, CA-012, CA-013
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs`, `backend/LabSolos-Server-DotNet8/Services/UsuarioService.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/UserProfileUpdateService.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/EmailAddressReservationService.cs`, `backend/LabSolos-Server-DotNet8/Data/Context/AppDbContext.cs`, `backend/LabSolos-Server-DotNet8/Data/Migrations/*_EmailAddressReservation*`, `backend/LabSolos-Server-DotNet8/Data/Migrations/AppDbContextModelSnapshot.cs`, `backend/Tests/Integration/UserProfileMutationTests.cs`, `backend/Tests/Integration/EmailAddressReservationTests.cs`

### Escopo

Manter atualização de recuperação e cancelamento da recuperação anterior em transação, com verificação de autorização e confirmação. Registrar reserva, evento de autoria e trabalho de aviso individual segundo a garantia aprovada. Aplicar carência em todos os pontos de atribuição abrangidos.

### Critérios de conclusão

- Falha de autorização, confirmação, validação ou persistência protege o endereço anterior. Em sucesso, a trilha e os dois trabalhos de aviso são rastreáveis.
- Reserva e unicidade permanecem coerentes sob concorrência e nas fronteiras do prazo, com teste relacional sintético e migração aditiva.

### Plano TDD

- RED: Exigir cenários titular e administrador, antes e depois da carência, unicidade concorrente e preservação do estado sob falha de gravação obrigatória.
- GREEN: Estender a mesma fronteira de consistência com a reserva, a trilha e os avisos conforme o desenho aprovado.
- REFACTOR: Compartilhar normalização, reserva e persistência de aviso entre pontos permitidos.

### Validação

- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers --filter "FullyQualifiedName~UserProfileMutationTests|FullyQualifiedName~EmailAddressReservationTests"`.
- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`, com Docker disponível para Testcontainers.

### Execução local — 2026-11-23

- RED: testes demonstraram troca administrativa sem confirmação (200 esperado 400), endereço reservado aceito por terceiro (200 esperado 409) e duas alterações concorrentes com normalização de caixa aprovadas.
- GREEN/REFACTOR: migration `20261123221425_EmailAddressReservation` adiciona reserva normalizada e jobs cifrados de aviso. A alteração exige confirmação do ator, reserva o endereço por 7 dias, compartilha advisory lock com cadastro, grava auditoria na transação e reverte toda a operação se a trilha obrigatória falhar.
- Testes dirigidos: 27/27, incluindo titular/admin, carência, concorrência, cadastro público e rollback. Suíte backend final: 831/831, sem falhas ou skips; `dotnet ef migrations has-pending-model-changes` sem drift; `git diff --check` limpo. Um teste legado foi atualizado para confirmar a senha do administrador que executa a alteração de terceiro, conforme a regra aprovada.

## T011 — Entregar avisos de troca de e-mail aos dois endereços

- Status: concluída
- Issue: #485
- Dependências: T010
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#contas-e-publicação).
- Paralela: não
- Requisitos: RF-009, RNF-001, CA-012
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Services/Security/EmailChangeNoticeService.cs`, `backend/LabSolos-Server-DotNet8/BackgroundServices/EmailChangeNoticeBackgroundService.cs`, `backend/LabSolos-Server-DotNet8/Program.cs`, `backend/Tests/Integration/EmailChangeNoticeTests.cs`

### Escopo

Consumir o registro de aviso individual conforme o mecanismo aprovado e demonstrar entrega simulada aos dois endereços, falha parcial e repetição controlada por destinatário.

### Critérios de conclusão

- Uma troca concluída gera um aviso em cada caixa sintética. Uma falha de entrega produz sinal operacional e segue a política aprovada sem repetir a troca.
- A evidência relaciona os avisos à autoria com dados sanitizados e acesso restrito.

### Plano TDD

- RED: Simular falha de um destinatário e exigir reconhecimento da entrega do outro e o comportamento de repetição ou encerramento aprovado.
- GREEN: Conectar o mecanismo aprovado ao simulador de e-mail e vincular resultado de cada aviso à identidade da operação.
- REFACTOR: Reutilizar componentes de entrega compatíveis e consolidar estados de aviso.

### Validação

- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers --filter "FullyQualifiedName~EmailChangeNoticeTests|FullyQualifiedName~UserProfileMutationTests"`.
- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`, com Docker disponível para Testcontainers.

### Execução local — 2026-11-23

- RED: testes exigiram entrega aos dois endereços, auditoria correlacionada sem dados sensíveis, retries independentes após falha parcial, terminalização após três tentativas e execução do worker; falharam antes de existir serviço de entrega.
- GREEN/REFACTOR: serviço e background worker consomem jobs cifrados com reserva `SKIP LOCKED` e lease. Cada destinatário avança independentemente; falhas são registradas por código/contagem, detalhes de destinatário são removidos após entrega/falha e registros operacionais expiram em 30 dias.
- Testes dirigidos: 26/26. Suíte backend: 846/846, sem falhas ou skips. EF sem drift; `git diff --check` passou.

## T012 — Apresentar confirmação e resultado da troca de e-mail

- Status: concluída
- Issue: #485
- Dependências: T009, T010
- Dependências externas: [T020 de Proteção de acesso](../protecao-acesso-autenticacao/tasks.md)
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#contas-e-publicação).
- Paralela: não
- Requisitos: RF-008, RNF-001, CA-011
- Caminhos sob responsabilidade: `frontend/src/components/auth/ProfileContactForm.tsx`, `frontend/src/components/auth/ProfileContactForm.test.tsx`, `frontend/src/pages/Profile.tsx`, `frontend/src/pages/Profile.test.tsx`, `frontend/src/integration/Users.ts`, `frontend/src/integration/Users.errors.test.ts`, `frontend/src/components/global/UserActionsMenu.tsx`, `frontend/src/pages/RegisteredUsers.tsx`, `frontend/src/pages/RegisteredUsers.responsive.test.tsx`, `frontend/src/pages/RegisteredUsers.errors.test.tsx`

### Escopo

Atualizar o formulário e seus consumidores para os estados de confirmação, erro e continuidade aprovados para titular e administrador.

### Critérios de conclusão

- Cada ator vê a confirmação e o texto definidos. Falhas de autorização, confirmação ou carência preservam a exibição do endereço vigente.

### Plano TDD

- RED: Acrescentar casos de confirmação própria e administrativa, dados preservados e apresentação textual da falha com resposta sintética.
- GREEN: Conectar o formulário aos estados do contrato de troca de e-mail.
- REFACTOR: Compartilhar o mapeamento de erros e manter o foco de confirmação apropriado.

### Validação

- Em `frontend`, após `npm ci`, `npm run test -- --run src/components/auth/ProfileContactForm.test.tsx src/pages/Profile.test.tsx src/integration/Users.errors.test.ts`.
- Em `frontend`, `npm run lint` e `npm run build`.

### Execução local — 2026-11-23

- RED: os testes reproduziram mensagens insuficientes para conflito de carência e autorização. O fluxo de gestão também não oferecia ao administrador ação visível para troca de e-mail de terceiros.
- GREEN/REFACTOR: formulário próprio e administrativo agora exigem e limpam a senha atual do ator, preservam o endereço vigente em falhas e explicam autorização, conflito/carência e sucesso. A lista administrativa oferece ação de troca para a conta selecionada, atualiza o e-mail em sucesso e mantém o valor vigente em erro.
- Testes dirigidos do formulário/perfil/integração: 29/29; estados de erro da lista: 8/8. `npm run lint`, `npm run build` e `git diff --check` passaram. Build manteve avisos existentes de `/env.js`, imagem `laboratory.png` e chunks grandes.

## T013 — Validar a composição de sessão e a compatibilidade do retorno

- Status: concluída
- Issue: #482
- Dependências: T004, T005, T009, T011, T012
- Dependências externas: [T008 de Proteção da API e do proxy](../protecao-de-api-e-proxy/tasks.md)
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#contas-e-publicação).
- Paralela: não
- Requisitos: RF-005, RF-006, RF-007, RF-009, RNF-001, RNF-002, CA-006, CA-007, CA-008, CA-010, CA-012
- Caminhos sob responsabilidade: `.codex/docs/specs/seguranca-de-contas-e-sessoes/evidencias-compatibilidade.md`, `frontend/e2e/browser-security.real.spec.ts`

### Escopo

Conferir o conjunto coordenado API, proxy e navegador em HTTPS descartável. Registrar a matriz executada, a coexistência aprovada e o ensaio de retorno com esquema aditivo, preservando revogações, guarda, reservas e eventos.

### Critérios de conclusão

- A composição valida sessão, troca obrigatória, recuperação e encerramento com o proxy e as origens previstas.
- A evidência sanitizada demonstra o estado das reservas, revogações e eventos após o retorno em ambiente sintético.

### Plano TDD

- RED: Adicionar cenários de composição que evidenciem discrepância entre comportamento dos componentes e tabela de sessão e origem; conferir a lista de invariantes do retorno.
- GREEN: Completar a composição de teste e executar a matriz e o comparativo no ambiente sintético.
- REFACTOR: Manter asserções de composição específicas e reaproveitar casos unitários e de integração já cobertos.

### Validação

- Na raiz, `docker compose --project-name lab-solos-ci-browser-security --file docker-compose-security-e2e.yml config --quiet`. Para o E2E, usar a composição descartável conforme o job `Browser security E2E`.
- Em `frontend`, após `npx --no-install playwright install chromium`, `npm run test:e2e -- --project=security browser-security.real.spec.ts`.
- Em `frontend`, após `npx --no-install playwright install chromium`, `npm run test:e2e -- --project=real credential-lifecycle.spec.ts`.
- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`, com Docker disponível para Testcontainers.
- Em `frontend`, após `npm ci`, `npm run test -- --run`.

### Execução local — 2026-11-23

- RED: a linha de base HTTPS passou 4/4. Os primeiros ensaios revelaram estado compartilhado com o limite por IP e `KnownProxies` divergente no override local; a ordem e a rede isolada foram ajustadas. A guarda foi exercitada pela exclusão protegida e a asserção de auditoria alinhada aos campos serializados.
- GREEN/REFACTOR: o E2E HTTPS atual passou 5/5; cenário T013 isolado após o retorno passou 1/1; composição do ciclo de credenciais passou 4/4. A API e a interface do `HEAD` foram executadas contra as 19 migrations atuais; login por HTTPS, perfil autenticado e nove leituras protegidas passaram. A versão atual foi restaurada e revalidada.
- Estado sintético antes e depois da versão anterior: 2 sessões revogadas, 2 reservas, 2 eventos `TrocaEmail`, 1 administrador habilitado e 19 migrations. Após os cenários finais na versão atual: 4 sessões revogadas, 4 reservas, 4 eventos, 1 administrador e as mesmas 19 migrations.
- `git diff --check` passou. A evidência sanitizada e os limites do ensaio estão em `evidencias-compatibilidade.md`; containers, volumes, imagens, worktree e scripts temporários de T013 foram removidos.

## Log de execução

| Data | Tarefa | Resultado | Testes/evidências | Observações |
|---|---|---|---|---|
| 2026-11-23 | T013 — composição e retorno | concluída | Projeto `security` 5/5, cenário T013 pós-retorno 1/1, ciclo de credenciais 4/4, checkout anterior em HTTPS com leitura autenticada e 9 respostas protegidas 200; invariantes preservados em 19 migrations. | Versões anterior e atual exercitadas sequencialmente sobre base sintética. Reautenticação no corte e retorno conjunto de API/frontend; a evidência não simula tráfego real nem implantação remota. |
| 2026-11-23 | T009 | concluída | Backend completo 780/780; `PasswordChangeRateLimitTests` + `BrowserSecurityHeadersTests` 13/13; frontend 995/995, ESLint e build aprovados; `credential-lifecycle.spec.ts` 4/4; `browser-security.real.spec.ts` 4/4; `feature-visibility.spec.ts` 24/24; `git diff --check` aprovado. | Migração dos consumidores concluída: sessão de navegador opaca, contexto mínimo e CSRF centralizados, sem leitura de `doorKey` nem envio de Bearer pelo cliente. Composições E2E descartáveis encerradas sem remover volumes. O build mantém avisos de `/env.js`, imagem referenciada ausente e chunks grandes. |
| 2026-11-23 | T007 — integração final | concluída | Filtro integrado 203/203 e suíte backend completa 770/770, incluindo `AuthorizationRouteMatrixTests`, `SessionLifecycleTests`, `JwtSessionVersionTests` e `PostgreSqlApplicationSmokeTests`. | Fixture Production usa sessão persistida; rota desconhecida conserva `404` tipado antes da autenticação. Nenhuma mudança em política de rotas. |
| 2026-11-23 | T005 — regressão de filas e projeção | concluída | RED reproduziu Mentor com vínculo legado aparecendo na fila local; GREEN backend 1/1, responsivo 3/3, filtro integrado 203/203 e backend completo 770/770. | Fila por responsável limita a Mentorados vinculados; fila global do administrador continua aceitando Mentores e Mentorados elegíveis. Separado DTO mínimo de acompanhamento do DTO de aprovação com tipo/papel. |
| 2026-11-19 | T008 | concluída | RED: sessão normal e obrigatória aceitavam a 6ª tentativa. GREEN: `AuthChangePasswordTests`, `PasswordChangeRateLimitTests` e `JwtSessionVersionTests`, 20/20 com PostgreSQL; linha de base então 746/758. Regressão integrada final 770/770 em 23/11. | Escopo PostgreSQL dedicado limita a cinco falhas por conta em 15 min; `429`/`Retry-After`, `503` quando indisponível, tentativa por sessão autenticada e reuso da transação evitam aninhamento. Migração aditiva `20261119053337_PasswordChangeRateLimitCapacity`; revogação continua atômica com a troca. As falhas da linha de base foram revalidadas e corrigidas em Contas T005/API T004/T008. |
| 2026-11-19 | T007 | concluída | RED cobriu cookie opaco, logout idempotente, inatividade, limite absoluto, mudança de papel/estado/versão e indisponibilidade. GREEN: 18/18 `SessionLifecycleTests`, `JwtSessionVersionTests` e `PostgreSqlApplicationSmokeTests`; build Release 0 erros; `git diff --check` e whitespace aprovados. | Migration aditiva `20261119044612_SessaoAutenticacao` cria somente tabela e índices da sessão. Emissão, validação, renovação por rotação e revogação usam hash de identificadores; mudança de senha/estado/versão invalida a sessão. Avisos NU1903/analisadores preexistentes. |
| 2026-11-19 | T005 | concluída | RED: novos testes apontaram tipo de usuário removido pelo Zod e fila sem tipo/papel. GREEN: filtro `CriticalUserApprovalTests` 20/20, Vitest 10/10, TypeScript sem emissão, ESLint dirigido e `git diff --check` aprovados. | Decisão revalida ator, solicitação e vínculo na transação; concessão exige outro administrador habilitado e grava trilha obrigatória. Projeção/cliente expõem `tipoUsuario`; fila administrativa usa rota própria. `UsuarioRepository` específico não foi alterado porque é código legado sem registro no `IUnitOfWork`. |
| 2026-11-17 | T006 | concluída | RED comportamental: Swagger exposto em Production. GREEN matriz 6/6 e regressão autorizada 56/56 com PostgreSQL; diff --check aprovado. | Fallback de autorização, exceções explícitas, envio genérico restrito e Swagger só em Development. Matriz de 58 rotas registra Caddy T008 como fechamento externo de `/api/System/health`. |
| 2026-11-17 | T004 | concluída | RED: 11 falhas nos casos novos/afetados. GREEN 39/39 dirigidos; lint, build e diff --check aprovados. | Cadastro público usa matriz T003 e códigos neutros. Mentor não informa responsável; Mentorado exige. Build também validou integração da T008 de Peso Molecular. Avisos existentes do Vite permanecem. |
| 2026-11-17 | T003 | concluída | RED em 8/16 testes HTTP. GREEN 58/58 dirigidos com PostgreSQL, senha e autorização; diff --check aprovado. | Cadastro, autoridade e contrato público centralizados. Fixtures antigas e comparação com correlationId dinâmico atualizadas sem retirar asserções. Regressão ampla do snapshot anterior teve 557/580; falhas restantes encaminhadas a API T005 e Empréstimos T003. |
| 2026-11-15 | T001 | concluída | Verificação documental inicial encontrou arquivo ausente. Inventário conferido contra 58 ações MVC, 4 políticas e a configuração do proxy. | Superfície e callbacks registrados a partir do checkout. Matriz definitiva e aceite permanecem em T006. |
| 2026-11-16 | T002 | concluída | RED: 2 casos UTF-8 rejeitados, 10 passaram. GREEN/REFACTOR: 37/37 em restore travado; regressão backend da onda 463/463. | Emissão e validação leem uma configuração compartilhada. Sem alteração no csproj/lock. Avisos NU1903 preexistentes. |

| 2026-11-24 | T009 retomada user data | concluída | T016 encontrou 2 falhas no E2E real de cadastro; 2/2 casos reais passaram, discovery 255 testes, lint, ESLint dirigido, Prettier e `git diff --check` aprovados. | Campo Mentor Responsável confirmado ausente pela matriz aprovada; validações de cidade e curso separadas conforme precedência do model binder, sem remover asserções nem alterar produção. Evidência `evidencias/T009.md`; sem GitHub/Wiki. |
