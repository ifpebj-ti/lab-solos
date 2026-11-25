# Tarefas: Proteção da API e do proxy

- Status: concluída
- PRD: `./prd.md`
- Especificação técnica: `./techspec.md`
- Atualizado em: 2026-11-23

Ler o PRD e a especificação técnica antes de iniciar. Exercitar os contratos somente em composição descartável e com identidades e dados sintéticos. As suítes de Docker, Vitest, Playwright e política do proxy já têm jobs pré-merge no checkout.

A execução local das ondas seguiu dependências, bloqueios e contratos registrados. Coordenar a posse de `Program.cs`, dos controladores de cadastro, empréstimos e auditoria e dos arquivos de composição com os planos que também os alteram. As cotas e tetos de auditoria são definidos em T002 e implementados pelo plano de Notificações e auditoria.

## Ondas de execução

| Onda | Tarefas | Motivo de segurança do paralelismo |
|---|---|---|
| 1 | T001 | Levantamento local da superfície sem alterações nos serviços. |
| 2 | T002 | Condicionada à aprovação de limites, cotas e paginação. |
| 3 | T003 | Condicionada aos limites e às regras de cadastro e empréstimo. |
| 4 | T004 | Condicionada ao envelope e aos tetos das listagens. |
| 5 | T005 | Condicionada às categorias de erro e à semântica de datas. |
| 6 | T006 | Condicionada aos contratos compatíveis com o frontend. |
| 7 | T007 | Condicionada às exceções de acesso, à saúde e à recuperação. |
| 8 | T008 | Condicionada aos contratos de publicação, origem e borda. |
| 9 | T009 | Condicionada à projeção pública aprovada. |
| 10 | T010 | Condicionada aos contratos implementados de API, proxy, sessão e auditoria. |

## T001 — Inventariar as superfícies e os consumidores atuais

- Status: concluída
- Issue: #480
- Dependências: nenhuma
- Paralela: não
- Requisitos: RF-004, RF-005, RNF-002, CA-005, CA-006
- Caminhos sob responsabilidade: `.codex/docs/specs/protecao-de-api-e-proxy/inventario-publicacao-atual.md`

### Escopo

Relacionar as rotas efetivas, classificações observadas, consumidores e ambientes de API, proxy e frontend. Mapear recuperação vigente e legada, jornada de administrador, monitoramento de saúde e regras de fallback existentes.

### Critérios de conclusão

- Cada comportamento observado tem referência local por método, categoria e ambiente.
- O inventário identifica divergências e consumidores que precisam aprovar exceções ou compatibilidade.

### Plano TDD

- RED: Conferir cobertura do inventário em relação aos metadados do servidor, rotas de proxy e consumidores.
- GREEN: Versionar a tabela do estado atual com referências de implementação e lacunas.
- REFACTOR: Consolidar duplicidade de registro e manter os casos de ambiente explícitos.

### Validação

- Na raiz, `rg -n 'MapHealthChecks|UseSwagger|AllowAnonymous|Http(Get|Post|Put|Patch|Delete)' backend/LabSolos-Server-DotNet8` e `rg -n 'reverse_proxy|handle|try_files' Caddyfile infra/testing/Caddyfile.security-e2e frontend/nginx.conf`. Comparar os resultados com a tabela.

## T002 — Versionar limites, cotas e contrato de paginação compartilhado

- Status: concluída
- Issue: #473
- Dependências: nenhuma
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#api-limites-e-auditoria).
- Paralela: não
- Requisitos: RF-001, RF-002, RF-003, RNF-001, CA-001, CA-002, CA-003, CA-004
- Caminhos sob responsabilidade: `.codex/docs/specs/protecao-de-api-e-proxy/contrato-limites-e-paginacao.md`

### Escopo

Publicar uma tabela por operação com contexto, identidade, limite, unidade, janela, resposta de excesso e indisponibilidade. Definir projeção, teto, desempate, continuação e compatibilidade de consumidores. Coordenar o contrato de cotas de emissão e exportação com Auditoria.

### Critérios de conclusão

- Cadastro, empréstimos, tamanho, páginas e operações de auditoria têm regras executáveis pelas tarefas consumidoras, com fronteiras abaixo, no teto e acima.
- Frequência da aplicação, tamanho de transporte e quantidade por regra de negócio têm unidades explícitas. O catálogo identifica se cada teto é por instância, perfil, ator ou compartilhado.

### Plano TDD

- RED: Verificar completude pela checklist de operações, dimensões, fronteiras, compatibilidade e falhas.
- GREEN: Registrar as escolhas aprovadas e uma tabela de resultados de fronteira, incluindo vazio e indisponibilidade.
- REFACTOR: Consolidar dimensões e códigos comuns sem perder unidades específicas.

### Validação

- Revisar a tabela com os critérios CA-001 a CA-004 de `prd.md` e os consumidores de auditoria em `../notificacoes-e-auditoria/techspec.md`. Conferir que cada cota e teto tem limite, unidade, resposta e responsável.

## T003 — Aplicar limites e validação de tamanho na API

- Status: concluída
- Issue: #473
- Dependências: T002
- Dependências externas: [T003 de Segurança de contas](../seguranca-de-contas-e-sessoes/tasks.md), [T003 de Decisões e devoluções de empréstimos](../decisoes-e-devolucoes-de-emprestimos/tasks.md) e [T009 de Proteção de acesso](../protecao-acesso-autenticacao/tasks.md)
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#api-limites-e-auditoria).
- Paralela: não
- Requisitos: RF-001, RF-003, RNF-001, CA-001, CA-004
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Program.cs`, `backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs`, `backend/LabSolos-Server-DotNet8/Controllers/EmprestimosController.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Usuarios/AddUsuarioDTO.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Emprestimos/AddEmprestimoDTO.cs`, `backend/LabSolos-Server-DotNet8/Models/AuthenticationProtectionCapacity.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/OperationAdmissionPolicy.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/ThrottleKeyFactory.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/PostgresAuthenticationThrottle.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/SecurityServiceCollectionExtensions.cs`, `backend/LabSolos-Server-DotNet8/Data/Migrations/20261119061500_OperationAdmissionCapacity.cs`, `backend/Tests/Integration/OperationAdmissionContractTests.cs`, `backend/Tests/Integration/AuthenticationProtectionMigrationTests.cs`

### Escopo

Aplicar cota por operação antes de efeitos da escrita. Validar tamanho de campos e corpo conforme a unidade aprovada. Reutilizar o mecanismo de limitação compatível com o modelo de topologia escolhido.

### Critérios de conclusão

- Casos sintéticos abaixo, no teto e acima são verificáveis com relógio controlado. Recusas de admissão e indisponibilidade preservam o estado segundo o contrato e mantêm as validações de estoque e autorização.
- Campos excedentes retornam o código público esperado, e a camada API classifica excesso de corpo de acordo com o contrato.

### Plano TDD

- RED: Acrescentar testes de fronteira, concorrência compartilhada quando prevista, indisponibilidade e preservação de estado em cadastro e empréstimo.
- GREEN: Compor admissão e validadores antes da operação e padronizar os resultados públicos aprovados.
- REFACTOR: Reutilizar a limitação existente e compartilhar apenas as dimensões que tiverem a mesma semântica.

### Validação

- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers --filter "FullyQualifiedName~OperationAdmissionContractTests|FullyQualifiedName~CriticalRegistrationTests|FullyQualifiedName~CriticalLoanCreationTests"`.
- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`, com Docker disponível para Testcontainers.

## T004 — Aplicar paginação e ordenar as listagens autorizadas

- Status: concluída
- Issue: #473
- Dependências: T002
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#api-limites-e-auditoria).
- Paralela: não
- Requisitos: RF-002, RNF-001, CA-002, CA-003
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/DTOs/Paginacao/ParametrosPaginacao.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Paginacao/ResultadoPaginado.cs`, `backend/LabSolos-Server-DotNet8/Controllers/ProdutosController.cs`, `backend/LabSolos-Server-DotNet8/Repositories/ProdutoRepository.cs`, `backend/Tests/Integration/ApiPaginationContractTests.cs`, `frontend/src/integration/Product.ts`, `frontend/src/integration/Product.errors.test.ts`, `frontend/src/pages/mentor/LoanCreation.tsx`, `frontend/src/pages/mentor/LoanCreation.critical.test.tsx`

### Escopo

Definir os tipos reutilizáveis e aplicar o contrato aos catálogos geral e administrativo de produtos definidos em `contrato-limites-e-paginacao.md`. As rotas de lote do inventário são consultas singulares por ID/código; preservar seus contratos e não criar uma coleção de lotes sem consumidor aprovado. Coordenar o teto e a continuação com os demais consumidores do catálogo, incluindo a implementação separada de Auditoria.

### Critérios de conclusão

- O teto é respeitado, inclusive para pedido excedente. Vazio é resultado válido. Continuação conserva filtro, revalida autorização e usa desempate estável.
- Consumidores afetados aceitam o envelope compatível aprovado. Consultas e índices são verificados com base sintética.

### Plano TDD

- RED: Adicionar casos com mais itens que o teto, desempate, filtro vazio, pedido excedente e alteração de autorização entre páginas.
- GREEN: Normalizar parâmetros e aplicar filtro e escopo antes da ordenação e do teto, adaptando o cliente de produtos.
- REFACTOR: Reutilizar os tipos comuns de paginação e separar composição de consulta de projeção de resposta.

### Validação

- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers --filter "FullyQualifiedName~ApiPaginationContractTests"`.
- Em `frontend`, após `npm ci`, `npm run test -- --run src/integration/Product.errors.test.ts`.
- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`, com Docker disponível para Testcontainers.

## T005 — Publicar categorias de erro, correlação e semântica de datas

- Status: concluída
- Issue: #483
- Dependências: nenhuma
- Dependências externas: [T002 de Experiência de erros no frontend](../experiencia-erros-frontend/tasks.md)
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#api-limites-e-auditoria).
- Paralela: não
- Requisitos: RF-008, RF-009, RNF-003, CA-010, CA-011, CA-012
- Caminhos sob responsabilidade: `.codex/docs/specs/protecao-de-api-e-proxy/contrato-erros-e-datas.md`, `backend/LabSolos-Server-DotNet8/Program.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Auditoria/FiltroAuditoriaDTO.cs`, `backend/LabSolos-Server-DotNet8/Middlewares/ApiErrorContractMiddleware.cs`, `backend/LabSolos-Server-DotNet8/Services/ApiDateFilters.cs`, `backend/Tests/Integration/ApiErrorAndDateContractTests.cs`

### Escopo

Definir contrato de validação, ausência e conflito, incluindo JSON inválido, texto UTF-8 e diagnóstico autorizado por correlação. Adotar semântica distinta para dia civil e instante com fuso e documentar fronteiras de filtros consumidas por auditoria e relatórios.

### Critérios de conclusão

- Status, código e orientação por classe são testáveis no contrato aprovado e mensagens acentuadas chegam em UTF-8.
- Instantes equivalentes e datas civis respeitam os limites definidos. A trilha diagnóstica correlaciona a classe sem dados sensíveis ou material de autenticação.

### Plano TDD

- RED: Testar categorias de entrada, ausência e conflito, mensagens acentuadas, casos sintéticos de JSON inválido e filtros nos instantes de fronteira.
- GREEN: Centralizar a composição de resposta e as regras de filtros e registrar correlação sanitizada.
- REFACTOR: Unificar categorias repetidas e preservar projeções públicas e campos autorizados.

### Validação

- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers --filter "FullyQualifiedName~ApiErrorAndDateContractTests"`.
- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`, com Docker disponível para Testcontainers.

## T006 — Consumir as categorias públicas de erro no frontend

- Status: concluída
- Issue: #483
- Dependências: T005
- Dependências externas: [T004 de Experiência de erros no frontend](../experiencia-erros-frontend/tasks.md) e [T006 de Experiência de erros no frontend](../experiencia-erros-frontend/tasks.md)
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#api-limites-e-auditoria).
- Paralela: não
- Requisitos: RF-008, RF-009, RNF-003, CA-010, CA-011
- Caminhos sob responsabilidade: `frontend/src/services/BaseApi.tsx`, `frontend/src/services/BaseApi.test.tsx`, `frontend/e2e/error-experience.spec.ts`, `frontend/src/errors/errorCatalog.ts`, `frontend/src/errors/errorCatalog.test.ts`, `frontend/src/errors/applicationError.ts`, `frontend/src/errors/applicationError.test.ts`, `frontend/src/errors/normalizeError.ts`, `frontend/src/errors/normalizeError.test.ts` (códigos e categoria pública T005)

### Escopo

Atualizar o ponto comum da API para adotar o catálogo validado e apresentar orientação textual, conferir UTF-8 e preservar a semântica publicada de datas.

### Critérios de conclusão

- A interface distingue validação, ausência e conflito com texto legível. O cliente preserva acentuação e usa a formatação de data própria de cada campo.

### Plano TDD

- RED: Acrescentar cenários sintéticos com as categorias públicas, correlação permitida e texto acentuado, cobrindo a saída visual.
- GREEN: Interpretar o envelope pelo normalizador já usado e atualizar os testes das jornadas afetadas.
- REFACTOR: Remover classificações duplicadas e manter os contratos existentes que ainda estiverem na janela de compatibilidade.

### Validação

- Em `frontend`, após `npm ci`, `npm run test -- --run src/services/BaseApi.test.tsx`.
- Em `frontend`, `npm run lint` e `npm run build`.
- Em `frontend`, após `npx --no-install playwright install chromium`, `npm run test:e2e -- --project=ui error-experience.spec.ts`.

## T007 — Aplicar o inventário da API e a projeção pública aprovada

- Status: concluída
- Issue: #480
- Dependências: T001
- Dependências externas: [T006 de Segurança de contas](../seguranca-de-contas-e-sessoes/tasks.md) e [T017 de Proteção de acesso](../protecao-acesso-autenticacao/tasks.md)
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#api-limites-e-auditoria).
- Paralela: não
- Requisitos: RF-004, RF-005, RNF-002, CA-005, CA-006, CA-008
- Caminhos sob responsabilidade: `.codex/docs/specs/protecao-de-api-e-proxy/matriz-publicacao.md`, `backend/LabSolos-Server-DotNet8/Program.cs`, `backend/LabSolos-Server-DotNet8/Controllers/SystemController.cs`, `backend/LabSolos-Server-DotNet8/Controllers/EmailController.cs`, `backend/Tests/Controllers/EmailControllerTests.cs`, `backend/Tests/Integration/ApiPublicationMatrixTests.cs`

### Escopo

Aplicar a matriz de autorização na publicação da API, explicitar métricas e envio genérico, preservar a recuperação aprovada e entregar projeção pública mínima e prontidão para consumidores autorizados. Limitar a documentação interativa ao ambiente de desenvolvimento.

### Critérios de conclusão

- Perfis e ambientes observam a matriz aprovada. O auxílio de recuperação vigente continua disponível e rotas antigas seguem destino documentado.
- Métricas e envio genérico exigem autoridade. A projeção pública e a resposta de saúde ficam dentro do inventário.

### Plano TDD

- RED: Testar a tabela de rotas, perfis, ambiente, recuperação, saúde e projeção pública em casos sintéticos de contrato.
- GREEN: Aplicar os metadados e projeções da matriz e revisar a configuração da documentação interativa.
- REFACTOR: Consolidar decisões de exposição e manter rastreabilidade com a matriz de Contas.

### Validação

- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers --filter "FullyQualifiedName~ApiPublicationMatrixTests|FullyQualifiedName~EmailControllerTests"`.
- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`, com Docker disponível para Testcontainers.

## T008 — Aplicar cabeçalhos, cache e classificação de caminhos no proxy

- Status: concluída
- Issue: #481
- Dependências: T002, T005, T007
- Dependências externas: [T013 de Proteção de acesso](../protecao-acesso-autenticacao/tasks.md) e [T023 de Proteção de acesso](../protecao-acesso-autenticacao/tasks.md) e [T007 de Segurança de contas](../seguranca-de-contas-e-sessoes/tasks.md)
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#api-limites-e-auditoria).
- Paralela: não
- Requisitos: RF-003, RF-005, RF-006, RF-007, RNF-001, RNF-002, CA-004, CA-006, CA-007, CA-008, CA-009
- Caminhos sob responsabilidade: `.codex/docs/specs/protecao-de-api-e-proxy/politica-cabecalhos-e-proxy.md`, `backend/LabSolos-Server-DotNet8/Program.cs`, `backend/LabSolos-Server-DotNet8/Middlewares/ApiResponseHeadersMiddleware.cs`, `backend/Tests/Integration/BrowserSecurityHeadersTests.cs`, `backend/Tests/Integration/TrustedProxyTests.cs`, `frontend/nginx.conf`, `Caddyfile`, `infra/proxy/security-headers.caddy`, `infra/testing/Caddyfile.security-e2e`, `.github/scripts/tests/test_browser_security_policy.py`

### Escopo

Aplicar limite de transporte, cabeçalhos da API e do proxy, cache e variação na resposta final. Separar caminho legítimo de SPA, recurso estático, ausência e caminho da API. Validar metadados em respostas próprias e encaminhadas.

### Critérios de conclusão

- Sucesso, erro e ausência de sessão respeitam `Cache-Control: no-store`, `Vary` aplicável, CSP, `Permissions-Policy` e os metadados aprovados.
- A API desconhecida retorna `404` no formato de API. A SPA legítima e os caminhos estáticos seguem as regras próprias. Respostas do proxy por excesso de corpo e indisponibilidade seguem o contrato.

### Plano TDD

- RED: Acrescentar asserções da política versionada e de contrato para categorias de caminho, cabeçalhos e respostas da origem e da borda.
- GREEN: Compor os cabeçalhos e regras de tamanho e encaminhamento nas camadas responsáveis.
- REFACTOR: Eliminar valores duplicados e preservar a proteção existente do frontend e o encaminhamento confiável.

### Validação

- Na raiz, `python -m unittest discover -s .github/scripts/tests -p "test_browser_security_policy.py" -v`.
- Na raiz, `docker compose --project-name lab-solos-ci-browser-security --file docker-compose-security-e2e.yml config --quiet`. Para o E2E, usar a composição descartável conforme o job `Browser security E2E`.
- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers --filter "FullyQualifiedName~BrowserSecurityHeadersTests|FullyQualifiedName~TrustedProxyTests"`.
- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`, com Docker disponível para Testcontainers.

### Notas

T008 publica a configuração do proxy compatível com o contrato aprovado de sessão. Contas T009 usa essa configuração para ligar o transporte ao navegador. A validação integrada inclui ambos em T010.

## T009 — Usar a projeção aprovada na Home pública

- Status: concluída
- Issue: #480
- Dependências: T007
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#api-limites-e-auditoria).
- Paralela: não
- Requisitos: RF-004, RNF-002, CA-005
- Caminhos sob responsabilidade: `frontend/src/pages/Home.tsx`, `frontend/src/pages/admin/Home.tsx`, `frontend/src/pages/Home.publication.test.tsx`, `frontend/src/integration/System.ts`, `frontend/src/integration/System.errors.test.ts`

### Escopo

Ajustar a Home e seu adaptador para os campos públicos aprovados, preservando os atalhos e o acesso de administrador no contexto autorizado.

### Critérios de conclusão

- Visitante vê apenas a projeção pública. O consumidor de métricas continua na jornada administrativa e as falhas têm estado textual conforme o contrato.

### Plano TDD

- RED: Caracterizar os atalhos vigentes e testar a projeção sintética na Home e o estado reservado das métricas.
- GREEN: Consumir a projeção aprovada com tipagem e apresentação correspondentes.
- REFACTOR: Consolidar a adaptação da resposta pública sem reusar projeções administrativas.

### Validação

- Em `frontend`, após `npm ci`, `npm run test -- --run src/pages/Home.publication.test.tsx src/integration/System.errors.test.ts`.
- Em `frontend`, `npm run lint` e `npm run build`.

## T010 — Validar publicação, origens e jornadas pela composição descartável

- Status: concluída
- Issue: #481
- Dependências: T003, T004, T006, T007, T008, T009
- Dependências externas: [T009 de Segurança de contas](../seguranca-de-contas-e-sessoes/tasks.md) e [T006 de Notificações e auditoria](../notificacoes-e-auditoria/tasks.md)
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#api-limites-e-auditoria).
- Paralela: não
- Requisitos: RF-001, RF-002, RF-004, RF-005, RF-006, RF-007, RNF-001, RNF-002, CA-001, CA-002, CA-005, CA-006, CA-007, CA-008, CA-009
- Caminhos sob responsabilidade: `.codex/docs/specs/protecao-de-api-e-proxy/evidencias-publicacao.md`, `.codex/docs/specs/protecao-de-api-e-proxy/politica-cabecalhos-e-proxy.md`, `frontend/e2e/browser-security.real.spec.ts`, `frontend/e2e/feature-visibility.spec.ts`, `frontend/src/routes.tsx`, `frontend/nginx.conf`, `.github/scripts/tests/test_browser_security_policy.py`, `frontend/playwright.config.ts`

### Escopo

Exercitar navegação, autenticação, recuperação, origens, páginas e respostas da API e do proxy conforme a matriz. Verificar disponibilidade no limite, envelope compatível e retorno em composição descartável.

Regressão de integração descoberta: caminhos desconhecidos sob `/admin`, `/mentor` e `/mentee` devem renderizar `Page404` sem chamadas à API e manter esse resultado após reload.

### Critérios de conclusão

- A matriz publicada tem evidência por categoria, caminho, origem e resultado. Jornadas legítimas continuam verificáveis.
- O comparativo de retorno demonstra compatibilidade dos consumidores e preservação das proteções mínimas e da auditoria.

### Plano TDD

- RED: Acrescentar cenários sintéticos que identifiquem diferenças entre o contrato dos componentes e o comportamento da resposta publicada.
- GREEN: Executar a matriz e o comparativo de retorno na composição de teste, registrando resultados sanitizados.
- REFACTOR: Reutilizar cenários existentes e manter E2E focado nos contratos que cruzam camadas.

### Validação

- Na raiz, `docker compose --project-name lab-solos-ci-browser-security --file docker-compose-security-e2e.yml config --quiet`. Para o E2E, usar a composição descartável conforme o job `Browser security E2E`.
- Em `frontend`, após `npx --no-install playwright install chromium`, `npm run test:e2e -- --project=security browser-security.real.spec.ts`.
- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`, com Docker disponível para Testcontainers.
- Em `frontend`, após `npm ci`, `npm run test -- --run`.
- Em `frontend`, `npm run lint` e `npm run build`.

### Execução local — 2026-11-23

- RED: o proxy Nginx interceptava rotas desconhecidas dos perfis e rotas administrativas removidas com seu 404 próprio, impedindo o `Page404` da SPA. A política estática não documentava o fallback restrito.
- GREEN/REFACTOR: fallback limitado a `/admin/*`, `/mentor/*`, `/mentee/*` e rotas legadas explicitamente previstas encaminha para a SPA; extensões estáticas são classificadas antes e assets ausentes/caminhos alheios continuam 404. As jornadas confirmam query/reload e zero chamadas de API nas três rotas desconhecidas.
- E2E UI: 27/27; composição HTTPS security: 6/6; política Python: 5/5; Vitest: 158 arquivos, 1.021/1.021; lint e build passaram. Backend: 846/846 na execução paralela de Notificações T010, sem alterações de código backend nesta tarefa. `git diff --check` passou com avisos CRLF preexistentes.
- Matriz e limite de compatibilidade entre versões estão em `evidencias-publicacao.md`. O retorno após reinício da API atual preservou sessão e auditoria; a API antiga `c642854` não é compatível para isolamento individual de notificações, conforme T010 de Notificações. Composições e recursos T010 foram encerrados e removidos.

## Log de execução

| Data | Tarefa | Resultado | Testes/evidências | Observações |
|---|---|---|---|---|
| 2026-11-23 | T010 — publicação, origens e jornadas | concluída | UI 27/27, security 6/6, política Python 5/5, Vitest 1.021/1.021, lint/build e `git diff --check` aprovados; backend 846/846 na onda paralela sem mudanças backend nesta tarefa. | Nginx agora entrega rotas desconhecidas das áreas de perfil à SPA para exibir `Page404`, sem ampliar fallback para caminhos arbitrários nem assets inexistentes. Evidência documenta o retorno da API atual e a limitação de rollback para `c642854`. |
| 2026-11-23 | T008 — proxy e superfície publicada | concluída | RED: Playwright retornou 404 em `/login`; após o allowlist Nginx, projeto `security` passou 5/5. API direcionada 203/203, backend completo 770/770, política Python 5/5, Compose/Caddy/Nginx validados. | `ApiResponseHeadersMiddleware` aplica CSP restritiva e `no-store` também à API; o teste verificou o contrato atualizado, e preflight não autorizado retorna 401 sem CORS. O Docker local tinha sub-rede sobreposta; validação usou override temporário `.tmp/security-e2e-network.override.yml` e banco limpo em projeto separado, preservando volumes anteriores. |
| 2026-11-23 | T004 — regressão dos consumidores | concluída | RED: os consumidores de teste ainda desserializavam catálogos paginados como arrays. GREEN: filtro integrado 203/203 e suíte backend completa 770/770. | Seis leituras atualizadas para o envelope `itens` em cinco testes; parser de `/Produtos/emAlerta` preservado. A jornada de empréstimo aprovado e devolvido espera dois movimentos distintos. |
| 2026-11-23 | T003 | concluída | RED: 7 cenários esperados falharam/38 passaram. GREEN: contratos de admissão, regressões de cadastro/empréstimo e migração, 50/50 com PostgreSQL. A linha de base então passou 752/765; após a integração de regressões, a suíte final passou 770/770. | Limites dedicados: cadastro 10/IP/h, empréstimos 30/conta habilitada/h, 100 itens, nome curto 255 caracteres, JSON 1 MiB/413, 429/Retry-After e 503. Migração `20261119061500_OperationAdmissionCapacity`; recusa ocorre antes da persistência. |
| 2026-11-19 | T004 | concluída | RED: paginação, teto, ordenação, vazio, acesso e envelopes não existiam. GREEN: 17/17 testes backend e 6/6 Vitest; lint, build e `git diff --check` passaram. A integração repetida após a migration T007 passou novamente 17/17. | Catálogos geral, por tipo e administrativo retornam envelope paginado, ordenação estável e código `pagination_invalid`; clientes preservam filtros/escopo. `Criar<T>` está em helper não genérico (CA1000 eliminado). Consultas de lote continuam singulares; sem rota de coleção não prevista no contrato aprovado. |
| 2026-11-19 | T009 | concluída | RED: 2 falhas/5 nos testes dirigidos. GREEN: 8/8 dirigidos, ESLint, build, TypeScript e `git diff --check` aprovados; reteste de integração 25/25 e tsc após tipagem estrita aprovados. | A Home administrativa passou a usar erro seguro. A projeção de quantidades foi estreitada para `{ produtos }`; o estado do consumidor em Meus Produtos também foi reduzido aos campos realmente usados. |
| 2026-11-17 | T007 | concluída | RED: 2 falhas em 8; GREEN: 8/8 com PostgreSQL; build TEMP e `git diff --check` aprovados. | Indicadores exigem sessão e expõem apenas `{ produtos }`; saúde preserva `status` consumido no deploy e separa `version`. Contratos de envio genérico e aliases de recuperação foram caracterizados; já atendidos por Contas T006. |
| 2026-11-17 | T006 | concluída | RED: 15 falhas de códigos descartados. GREEN 58 dirigidos, 105 regressões e Playwright 1/1; lint/build/diff-check aprovados. | Códigos e metadados da API preservados com catálogo local seguro; 413 mapeado a `request_too_large`. `BaseApi.tsx` já delegava ao normalizador e foi caracterizado sem mudança produtiva. |
| 2026-11-17 | T005 | concluída | RED: 10 falhas comportamentais. GREEN: 62/62 regressões dirigidas; refatoração 17/17 com analyzers padrão; build e diff --check aprovados. | Contrato `ProblemDetails`, correlação, datas civis/instantes e fim exclusivo. Migração de seis testes preservou autorização, privacidade, códigos e estado. Avisos anteriores incluem AutoMapper NU1903. |
| 2026-11-16 | T002 | concluída | RED documental por arquivo ausente. GREEN/REFACTOR com 24 critérios de completude e 17 cenários de fronteira. | Orquestrador revisou cotas, envelope, compatibilidade, limites e respostas. Contrato local, sem mudança de API. |
| 2026-11-15 | T001 | concluída | Inventário inicialmente ausente. Final: 58 ações, 44 declarações de navegação, 189 referências e 3 testes estáticos de política. | Topologia e consumidores locais verificados. Uso externo e configuração implantada não foram consultados. |
