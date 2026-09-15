# Tarefas: Navegação e experiência pós-autenticação

- Status: concluída
- PRD: `./prd.md`
- Especificação técnica: `./techspec.md`
- Atualizado em: 2026-09-14
- Issues de referência do PRD: #219, #221, #222, #223
- Associação operacional por escopo: `#219` (T005); `#221` (T002, T003, T007, T008, T009); `#222` (T004, T006, T010, T011, T012); `#223` (T001, T013, T014). Decisão centralizada pelo orquestrador a partir dos escopos e descrições das issues; a issue permanece `In Progress` enquanto houver tarefas/criterios relacionados pendentes.

## Premissas de execução

Ler integralmente o PRD e a especificação antes de cada tarefa. As decisões de atalhos, IDs por query, pais, alias e contratos HTTP são as da especificação; este plano não redefine permissões de propriedade, mutações de empréstimo, autenticação ou módulos de negócio.

A árvore local contém alterações da entrega de visibilidade. Seu `tasks.md` registra implementação concluída e integração E2E bloqueada por Docker; isso não comprova disponibilidade atual do daemon nem aprovação daquela entrega. Antes de implementar, preservar alterações locais, conciliar a base sem recriar o carrossel e confirmar os módulos de sessão/erros já existentes. O bloqueio anterior deve ser reavaliado em T002/T013; não impede escrever testes unitários, mas impede declarar integração aprovada sem execução real.

Infraestrutura revalidada: frontend possui Vitest, Testing Library, MSW e Playwright; `backend/backend.sln` inclui `Tests/Tests.csproj`, com .NET 8/xUnit e PostgreSQL em contêiner. `.github/workflows/container-ci.yml` roda em PR para `develop` nos eventos `opened`, `synchronize` e `reopened`, além de execução manual. Já executa testes, lint, build e toda a suíte E2E. Não há tarefa para instalar executor ou implantar novo workflow, pois a lacuna histórica mencionada na skill não existe mais. Proteção obrigatória da branch não é comprovada pelo YAML.

Comandos `npm` e `npx` são executados em `frontend`; `docker`, `dotnet`, `rg` e `git`, na raiz. Preparar dependências com `npm ci` uma vez, sem atualizar lockfile. Arquivos novos de teste citados são entregáveis planejados. Cada execução deve registrar RED, GREEN e REFACTOR com comando e causa; comportamento correto já existente recebe primeiro caracterização, aceitando passagem inicial.

## Ondas de execução

| Onda | Tarefas | Motivo de segurança do paralelismo |
|---|---|---|
| 1 | T001, T002 | Auxiliares frontend e API/backend têm posse e artefatos separados; contratos de URL e HTTP são independentes e já definidos |
| 2 | T003 | Consolida contrato frontend e fixtures depois da API; posse ampla de testes exige exclusividade |
| 3 | T004 | Posse exclusiva de rotas, guardas e inventário de sessão |
| 4 | T005 | Homes usam contratos e guardas estabilizados |
| 5 | T006 | Tabelas compartilhadas atualizadas antes das jornadas consumidoras |
| 6 | T007 | Detalhes de empréstimo/devolução antes dos testes da jornada administrativa |
| 7 | T008 | Listas administrativas e seus links próprios |
| 8 | T009 | Históricos por usuário e identidade pessoal |
| 9 | T010 | Usuários e turmas, após os destinos de histórico |
| 10 | T011 | Produtos e verificações compartilhadas |
| 11 | T012 | Históricos coletivos e últimos consumidores de retorno |
| 12 | T013 | Jornadas no navegador com todos os consumidores implementados |
| 13 | T014 | Auditoria cruzada final e registro de evidências |

`Paralela: sim` é elegibilidade condicionada às dependências concluídas e ausência de disputa de arquivos; não inicia agentes nesta etapa. O plano favorece serialização após a primeira onda porque contratos, fixtures e tabelas são compartilhados. Não executar duas tarefas sequenciais ao mesmo tempo só porque parte de seus arquivos difere.

Além dos caminhos de cada tarefa, todo comando frontend reserva exclusivamente `frontend/node_modules/.vite/**`, `frontend/.vite/**`, `frontend/dist/**` e `frontend/*.tsbuildinfo` enquanto roda. T002 reserva os artefatos backend listados. Instalação de dependências, build, manipulação da pilha Docker e edição de auxiliares compartilhados são sequenciais. Não versionar artefatos incidentais nem reverter artefatos preexistentes do usuário.

O executor/coordenador centraliza estados e log deste arquivo; executores paralelos não editam `tasks.md`. Se surgir consumidor fora da posse, registrar o caminho e ajustar dependências/posse antes da edição. Correções funcionais identificadas em T013/T014 retornam à tarefa proprietária, sem transformar validação final em implementação sem limites.

## Matriz de cobertura

| Requisito | Tarefas de entrega | Validação cruzada |
|---|---|---|
| RF-001 | T001, T005, T012 | T013, T014 |
| RF-002 | T002, T003, T006, T007, T008, T009 | T013, T014 |
| RF-003 | T001, T004, T006, T007, T008, T009, T010, T011, T012 | T013, T014 |
| RNF-001 | T002, T004, T005 | T013, T014 |
| RNF-002 | T001, T004, T006, T007, T009, T010, T011, T012 | T013, T014 |
| CA-001 | T001, T005, T012 | T013, T014 |
| CA-002 | T002, T003, T006, T007, T008, T009 | T013, T014 |
| CA-003 | T001, T004, T006, T007, T008, T009, T010, T011, T012 | T013, T014 |

## T001 — Definir destinos por perfil e retornos com identificadores recuperáveis

- Status: concluída
- Issue: #223
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-001, RF-003, RNF-002, CA-001, CA-003
- Caminhos sob responsabilidade: `frontend/src/navigation/**`, `frontend/src/components/global/BackLink.tsx`, `frontend/src/components/global/BackLink.test.tsx`

### Escopo

Criar profileNavigation.ts com catálogo de atalhos, tabela completa de pais da especificação e construtor/leitor de query id; reutilizar getHomePathForRole. Criar BackLink com semântica de link, sem leitura ou limpeza de cookies no resolvedor. Cobrir normalização de barras, parâmetros de caminho existentes e perfis desconhecidos. Expor os auxiliares que os consumidores usarão para normalizar state.id com replace; não alterar páginas nesta tarefa.

### Critérios de conclusão

Pais nunca dependem do histórico nem de IDs anteriores. ID decimal único entre 1 e 2147483647; query presente prevalece mesmo inválida. Estado válido só é compatibilidade na ausência da query. URLs não aceitam retorno externo nem outro perfil. BackLink navega ao pai esperado com teclado.

### Plano TDD

- RED: Escrever profileNavigation.test.ts e BackLink.test.tsx a partir da tabela da especificação: ID ausente/duplicado/inválido/limites, conflito query/estado, preservação de outras queries e destinos de cada perfil. Falha inicial por contrato ainda ausente; não copiar o array implementado para formar expectativas.
- GREEN: Implementar funções puras e link mínimos, sem novo roteador ou persistência.
- REFACTOR: Consolidar regras repetidas mantendo contratos públicos estáveis para as próximas tarefas.

### Validação

- `npm run test -- --run src/navigation src/components/global/BackLink.test.tsx`
- `npm run lint`

### Notas

Não mover getHomePathForRole nem alterar integração de autenticação. O mapa completo é o contrato de consumo das próximas tarefas.

## T002 — Corrigir vazio e autorização nos históricos da API

- Status: concluída
- Issue: #221
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-002, RNF-001, CA-002
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Controllers/EmprestimosController.cs`, `backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs`, `backend/Tests/Integration/PostAuthenticationNavigationTests.cs`, `backend/Tests/Infrastructure/**`, `backend/Tests/bin/**`, `backend/Tests/obj/**`, `backend/LabSolos-Server-DotNet8/bin/**`, `backend/LabSolos-Server-DotNet8/obj/**`

### Escopo

Aplicar ApenasAdministradores exclusivamente ao GET global de empréstimos. Retornar 200 [] em GET Emprestimos, Emprestimos/usuario/{userId} e Usuarios/{usuarioId}/dependentes/emprestimos quando o recurso pai existe mas não há elementos. Preservar 404 para usuário ou empréstimo inexistente, políticas de responsáveis e leitura compartilhada do detalhe. Acrescentar testes HTTP pela fábrica PostgreSQL existente.

### Critérios de conclusão

JWT administrativo obtém lista/detalhe; JWT de mentor/mentorado recebe 403 na listagem global; visitante recebe 401. Responsável existente sem dependentes ou empréstimos recebe []; usuário inexistente e detalhe inexistente continuam 404. Endpoints comuns e mutações preservam permissões e formatos anteriores.

### Plano TDD

- RED: Criar PostAuthenticationNavigationTests usando autenticação real: mostrar 404 indevido nas listas vazias e acesso global indevido de perfil não administrativo. Caracterizar primeiro as permissões preservadas e payload com produto/lote nullable.
- GREEN: Alterar somente políticas e retornos dos três endpoints. Ampliar preparação isolada de dados da fábrica de testes se necessário, sem endpoint público.
- REFACTOR: Retirar ramificações redundantes de vazio; preservar consultas e mapeamentos. Não alterar esquema ou regra de propriedade.

### Validação

- `docker info`
- `dotnet restore backend/backend.sln`
- `dotnet test backend/Tests/Tests.csproj -c Release --nologo --disable-build-servers --filter FullyQualifiedName~PostAuthenticationNavigationTests`
- `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`

### Notas

Comandos desta tarefa são da raiz. Docker indisponível impede evidência GREEN de integração; registrar bloqueio real, sem substituir autenticação por mock. Não editar infraestrutura frontend.

## T003 — Validar os contratos de empréstimos nas integrações frontend

- Status: concluída
- Issue: #221
- Dependências: T001, T002
- Paralela: não
- Requisitos: RF-002, CA-002
- Caminhos sob responsabilidade: `frontend/src/contracts/loan.ts`, `frontend/src/contracts/loan.test.ts`, `frontend/src/integration/Loans.ts`, `frontend/src/integration/Class.ts`, `frontend/src/integration/Loans*.test.ts`, `frontend/src/integration/Class*.test.ts`, `frontend/src/test/**`, `frontend/src/**/*.test.ts`, `frontend/src/**/*.test.tsx`, `frontend/e2e/responsive-support.ts`

### Escopo

Criar schema e tipo de empréstimo fiel a EmprestimoDTO e ProdutoEmprestadoDTO, reutilizando contratos de usuário. Validar respostas das leituras de Loans e das leituras de empréstimos em Class, diferenciando sucesso vazio e erro normalizado. Inspecionar o mapeamento backend antes de criar amostras. Atualizar fixtures antigas que usem emprestimoProdutos ou outros campos divergentes do payload real.

### Critérios de conclusão

Listas [] passam; detalhe exige objeto válido; datas, usuários e lote nullable seguem DTO real; payload inválido gera erro contextual pelo mecanismo existente. 403/404/5xx não são convertidos em []; comportamento central de 401 permanece. Não exigir campos inexistentes nem usar cast para esconder erro.

### Plano TDD

- RED: Adicionar testes de schema e MSW em Loans.contract.test.ts/Class.contract.test.ts; demonstrar aceitação indevida de payload incompatível e caracterizar lista vazia, autenticação e nullable corretos.
- GREEN: Aplicar validação de resposta mantendo assinaturas compatíveis com consumidores legados até a migração de cada jornada; não introduzir erro de compilação em páginas ainda não migradas. Atualizar apenas fixtures contratuais dos testes afetados.
- REFACTOR: Centralizar schema e amostras sem mudar semântica dos testes de página. Migração dos tipos de página pertence às tarefas de jornada.

### Validação

- `npm run test -- --run src/contracts/loan.test.ts src/integration/Loans src/integration/Class src/services/BaseApi.test.tsx`
- `npm run test -- --run`
- `npm run lint`
- `npm run build`

### Notas

Posse ampla de testes é conservadora para ajustar fixtures; tarefa sequencial. Não alterar comportamento das páginas nesta etapa nem o interceptor de 401.

## T004 — Preservar sessão no fallback e no acesso a perfil incorreto

- Status: concluída
- Issue: #222
- Dependências: T003
- Paralela: não
- Requisitos: RF-003, RNF-001, RNF-002, CA-003
- Caminhos sob responsabilidade: `frontend/src/pages/Page404.tsx`, `frontend/src/pages/Page404.test.tsx`, `frontend/src/components/base/PrivateRoutes.tsx`, `frontend/src/components/base/PrivateRoutes.test.tsx`, `frontend/src/routes.tsx`, `frontend/src/routes.test.tsx`, `frontend/src/auth/sessionConsumers.test.tsx`

### Escopo

Retirar clearSession do Page404; resolver retorno pelo perfil real. Sessão válida em rota de outro perfil recebe acesso negado e retorno seguro; visitante mantém login e troca obrigatória mantém precedência. Nível não suportado mostra indisponibilidade e Sair explícito. Corrigir alias /mentor/history/mentee para /mentor/history/class com replace e retirar declaração duplicada de /admin.

### Critérios de conclusão

URLs inválidas e acesso negado não montam Login nem tela proibida com sessão válida; cookies permanecem. Comum não ganha módulo. Alias protegido não monta LoanCreation. Logout explícito e 401 continuam funcionando.

### Plano TDD

- RED: Testar Page404 e roteador real com cookies sintéticos, por acesso direto e navegação interna. Demonstrar limpeza indevida e guardas enviando usuário válido ao Login; caracterizar visitante e troca obrigatória.
- GREEN: Aplicar fallbacks e alias usando resolvedor/BackLink. Retirar Page404 do inventário que exige clearSession e criar prova comportamental em seu lugar.
- REFACTOR: Eliminar imports/efeitos obsoletos, preservando cobertura dos consumidores legítimos de logout.

### Validação

- `npm run test -- --run src/pages/Page404.test.tsx src/components/base/PrivateRoutes.test.tsx src/routes.test.tsx src/auth/sessionConsumers.test.tsx src/auth/firstAccess.test.tsx src/services/BaseApi.test.tsx`
- `npm run lint`
- `npm run build`

### Notas

Não editar Login, política de senha ou armazenamento de sessão para contornar retornos incorretos.

## T005 — Exibir atalhos operacionais nas homes dos três perfis

- Status: concluída
- Issue: #219
- Dependências: T004
- Paralela: não
- Requisitos: RF-001, RNF-001, CA-001
- Caminhos sob responsabilidade: `frontend/src/pages/Home.tsx`, `frontend/src/pages/Home.test.tsx`, `frontend/src/pages/admin/Home.tsx`, `frontend/src/pages/admin/Home.test.tsx`, `frontend/src/components/screens/InfoCard.tsx`, `frontend/src/components/screens/InfoCard.test.tsx`

### Escopo

Consumir catálogo via readSession e renderizar exatamente os atalhos/ordem da especificação. Preservar busca e ausência do carrossel. Manter cards administrativos e contadores existentes, sem consultas novas; tratar falhas independentes sem apagar resultados válidos ou transformar indisponibilidade em zero.

### Critérios de conclusão

Cada perfil vê apenas seus links; Comum/desconhecido não recebe fallback administrativo. Links funcionam mesmo durante erro de contador; nova tentativa recupera a leitura afetada. Teclado e layout em 375/1440 pixels continuam utilizáveis.

### Plano TDD

- RED: Estender testes das homes exercitando links em roteador, perfil inválido, carregamento e falha de uma consulta com outras bem-sucedidas. Demonstrar ausência de atalhos e zeragem indevida. Ausência de carrossel já implementada recebe caracterização, sem fabricar falha.
- GREEN: Renderizar catálogo e estado independente dos contadores com ErrorFeedback; manter componentes visuais existentes.
- REFACTOR: Reduzir repetição de cards e estados sem criar dashboard ou consultas adicionais.

### Validação

- `npm run test -- --run src/pages/Home.test.tsx src/pages/admin/Home.test.tsx src/components/screens/InfoCard.test.tsx`
- `npm run lint`
- `npm run build`

### Notas

Criar InfoCard.test.tsx se houver ajuste no componente; caso contrário retirar esse filtro do comando direcionado e registrar a decisão. Não restaurar Carousel.

## T006 — Transportar IDs nos links compartilhados de detalhes

- Status: concluída
- Issue: #222
- Dependências: T005
- Paralela: não
- Requisitos: RF-002, RF-003, RNF-002, CA-002, CA-003
- Caminhos sob responsabilidade: `frontend/src/components/global/table/ItemClickable.tsx`, `frontend/src/components/global/table/ItemClickable.test.tsx`, `frontend/src/components/global/table/ItemButtonLink.tsx`, `frontend/src/components/global/table/ItemButtonLink.test.tsx`, `frontend/src/components/global/table/TableItemWithActions.tsx`, `frontend/src/components/global/table/TableItemWithActions.test.tsx`

### Escopo

Usar construtor de URL de T001 tanto no clique de linha quanto no Link.to para destinos do inventário de detalhes. Manter state.id na transição para páginas ainda não migradas; ele não será fonte obrigatória após as próximas tarefas. Não acrescentar ID a destinos fora do inventário.

### Critérios de conclusão

Href compartilhável contém o mesmo ID enviado no clique; outras queries são preservadas; links comuns não mudam. IDs continuam representando usuário, produto ou empréstimo conforme produtor. Controles de ação não disparam navegação da linha.

### Plano TDD

- RED: Estender testes das três tabelas para inspecionar href e navegação real, mostrando ausência do ID no href atual; caracterizar propagação de cliques, acessibilidade e destinos sem query.
- GREEN: Aplicar construtor aos destinos reconhecidos, preservando contrato de props dos produtores e estado legado.
- REFACTOR: Eliminar construção duplicada entre link e handler sem interferir no contexto de colunas responsivas.

### Validação

- `npm run test -- --run src/components/global/table/ItemClickable.test.tsx src/components/global/table/ItemButtonLink.test.tsx src/components/global/table/TableItemWithActions.test.tsx`
- `npm run lint`
- `npm run build`

### Notas

Acesso direto completo será entregue ao migrar cada consumidor. Esta tarefa é validável pelo contrato dos links e preserva navegação interna das páginas ainda legadas.

## T007 — Abrir detalhes de empréstimo e devolução por URL com retorno seguro

- Status: concluída
- Issue: #221
- Dependências: T006
- Paralela: não
- Requisitos: RF-002, RF-003, RNF-002, CA-002, CA-003
- Caminhos sob responsabilidade: `frontend/src/pages/loan/LoanHistory.tsx`, `frontend/src/pages/loan/LoanHistory*.test.tsx`, `frontend/src/pages/mentee/LoanHistory.tsx`, `frontend/src/pages/mentee/LoanHistory*.test.tsx`, `frontend/src/pages/admin/ReturnLoan.tsx`, `frontend/src/pages/admin/ReturnLoan*.test.tsx`

### Escopo

Migrar os três detalhes para ID persistido, compatibilidade state.id com replace e tipos de empréstimo de T003. Substituir retornos visíveis/de erro pelos pais /admin/all-loans, /mentor/history/class e /mentee/history/mentoring. Exibir retorno também quando não há ID ou leitura em andamento.

### Critérios de conclusão

URL sem estado carrega registro correto. ID inválido não faz requisição; query inválida não recorre ao estado; 404 não vira detalhe vazio. Lista de produtos vazia preserva metadados. Resposta atrasada do ID anterior não sobrescreve o atual. Aprovar/reprovar/devolver e exportar mantêm contratos existentes.

### Plano TDD

- RED: Criar testes *.navigation.test.tsx em cada página, além dos casos de erro existentes: ID em URL, query versus estado, ID inválido, 404, nullable, produtos [], resposta atrasada e retorno após entrada direta. Caracterizar mutações e exportações sem mudar regra de negócio.
- GREEN: Ler/normalizar ID, bloquear leitura inválida, descartar resposta obsoleta e renderizar estados contextuais e BackLink. Migrar tipos locais sem casts corretivos.
- REFACTOR: Remover dependência obrigatória de state e retornos históricos, preservando responsividade.

### Validação

- `npm run test -- --run src/pages/loan/LoanHistory src/pages/mentee/LoanHistory src/pages/admin/ReturnLoan`
- `npm run lint`
- `npm run build`

### Notas

Não tornar leitura compartilhada exclusivamente administrativa nem redefinir permissões de mutação.

## T008 — Concluir a jornada administrativa de solicitações e lista de empréstimos

- Status: concluída
- Issue: #221
- Dependências: T007
- Paralela: não
- Requisitos: RF-002, RF-003, CA-002, CA-003
- Caminhos sob responsabilidade: `frontend/src/pages/admin/LoansRequest.tsx`, `frontend/src/pages/admin/LoansRequest*.test.tsx`, `frontend/src/pages/admin/AllLoans.tsx`, `frontend/src/pages/admin/AllLoans*.test.tsx`

### Escopo

Atualizar navegação própria de LoansRequest, inclusive href, para /admin/history/loan?id=...; validar AllLoans com as tabelas de T006. Usar contrato de lista, mostrar vazio somente após 200 [], erro contextual com retry e retorno explícito. Pais: solicitações → /admin/all-loans; lista global → /admin.

### Critérios de conclusão

Solicitação abre detalhe com o ID correto por clique, teclado e URL copiada. Vazio não exibe erro genérico, falha não se disfarça de vazio. Voltar não monta Login. Ações de aprovação/reprovação continuam chamando os serviços corretos.

### Plano TDD

- RED: Criar LoansRequest.navigation.test.tsx exercitando lista e detalhe reais com integrações controladas; demonstrar href sem ID e retornos incorretos. Estender erros de ambas as listas para 200 [], 403, 5xx e retry.
- GREEN: Corrigir links locais e estados de retorno/leitura, usando auxiliares existentes.
- REFACTOR: Retirar tipos divergentes e handlers duplicados sem alterar critérios de status ou ações de negócio.

### Validação

- `npm run test -- --run src/pages/admin/LoansRequest src/pages/admin/AllLoans src/pages/loan/LoanHistory`
- `npm run lint`
- `npm run build`

### Notas

O cenário equivalente contra backend real pertence à T013; o teste desta tarefa monta componentes reais com rede controlada.

## T009 — Recuperar históricos por usuário sem confundir vazio e erro

- Status: concluída
- Issue: #221
- Dependências: T008
- Paralela: não
- Requisitos: RF-002, RF-003, RNF-002, CA-002, CA-003
- Caminhos sob responsabilidade: `frontend/src/pages/admin/MentoringHistoryAdm.tsx`, `frontend/src/pages/admin/MentoringHistoryAdm*.test.tsx`, `frontend/src/pages/mentor/MentoringHistory.tsx`, `frontend/src/pages/mentor/MentoringHistory*.test.tsx`, `frontend/src/pages/mentee/HistoryMentoring.tsx`, `frontend/src/pages/mentee/HistoryMentoring*.test.tsx`

### Escopo

Migrar os históricos administrativo e do mentor para query de ID. Histórico pessoal continua obtendo identidade da sessão, sem aceitar usuário arbitrário por query. Usar contrato compartilhado; remover inspeção de error.response.status e conversão de qualquer falha em []. Preservar identificação já carregada se a lista falhar, com nova tentativa contextual. Confirmar links de empréstimos produzidos por T006.

### Critérios de conclusão

Pais: administrador → /admin/users; mentor → /mentor/my-class; mentorado → /mentee. Usuário inexistente tem erro; usuário válido sem empréstimos tem vazio; falha de rede mantém perfil já lido e não inventa sucesso. IDs inválidos e respostas obsoletas são tratados como na T007.

### Plano TDD

- RED: Criar testes de navegação/erro nas três páginas cobrindo URL, estado legado, identidade própria, duas leituras com falha parcial, 404 e 200 []. Demonstrar erro atualmente mascarado como vazio.
- GREEN: Aplicar ID, tipos e estados independentes com ErrorFeedback e retorno explícito; manter links com ID.
- REFACTOR: Eliminar casts de Axios e tipos duplicados, preservando pesquisa, paginação e tabelas.

### Validação

- `npm run test -- --run src/pages/admin/MentoringHistoryAdm src/pages/mentor/MentoringHistory src/pages/mentee/HistoryMentoring`
- `npm run lint`
- `npm run build`

### Notas

Não criar regra de propriedade ou endpoint novo; manter leitura autorizada conforme especificação.

## T010 — Tornar a navegação de usuários e turmas recuperável

- Status: concluída
- Issue: #222
- Dependências: T009
- Paralela: não
- Requisitos: RF-003, RNF-002, CA-003
- Caminhos sob responsabilidade: `frontend/src/pages/ViewClass.tsx`, `frontend/src/pages/ViewClass*.test.tsx`, `frontend/src/pages/ViewClassMentor.tsx`, `frontend/src/pages/ViewClassMentor*.test.tsx`, `frontend/src/pages/admin/ClassLoan.tsx`, `frontend/src/pages/admin/ClassLoan*.test.tsx`, `frontend/src/pages/RegisteredUsers.tsx`, `frontend/src/pages/RegisteredUsers*.test.tsx`

### Escopo

Ler ID por URL nas duas telas de turma e ClassLoan, preservando significado do responsável selecionado. Impedir GET sem ID válido e mostrar retorno a /admin/users. Confirmar links de RegisteredUsers → turma → histórico de usuário → empréstimo usando as tabelas compartilhadas. Retorno de RegisteredUsers aponta a /admin.

### Critérios de conclusão

Turmas e histórico coletivo abrem por link direto/refresh sem state, com ID correto; ID inválido não chama API. Links não perdem contexto de entidade. Estados de erro deixam sair da tela sem limpeza de sessão. ClassLoan mostra [] somente após sucesso e falha contextual em vez de vazio.

### Plano TDD

- RED: Acrescentar testes de navegação às quatro páginas; demonstrar perda de ID por acesso direto e retorno para Login. Cobrir 200 [], 404, erro transitório, query/estado e resposta obsoleta em detalhes.
- GREEN: Migrar leitores e retornos e corrigir produtores próprios caso existam; consumir contratos de T003 no histórico.
- REFACTOR: Consolidar uso de auxiliares sem alterar regras de gestão de usuários, aprovação ou paginação.

### Validação

- `npm run test -- --run src/pages/ViewClass src/pages/ViewClassMentor src/pages/admin/ClassLoan src/pages/RegisteredUsers`
- `npm run lint`
- `npm run build`

### Notas

Paths de ViewClass*.test.tsx incluem testes de ViewClassMentor por conservadorismo; não há execução concorrente.

## T011 — Preservar IDs e pais na consulta e histórico de produtos

- Status: concluída
- Issue: #222
- Dependências: T010
- Paralela: não
- Requisitos: RF-003, RNF-002, CA-003
- Caminhos sob responsabilidade: `frontend/src/components/screens/VerificationPage.tsx`, `frontend/src/components/screens/VerificationPage*.test.tsx`, `frontend/src/components/screens/SearchMaterialComponent.tsx`, `frontend/src/components/screens/SearchMaterialComponent.test.tsx`, `frontend/src/pages/products/ProductHistory.tsx`, `frontend/src/pages/products/ProductHistory*.test.tsx`, `frontend/src/pages/FollowUp.tsx`, `frontend/src/pages/FollowUp*.test.tsx`

### Escopo

Migrar VerificationPage para ID na query nos três perfis, validando antes de ler e normalizando estado legado. Confirmar href e clique em SearchMaterialComponent e FollowUp com T006. Preservar parâmetro de caminho /admin/products/:id/history e trocar navigate(-1) por /admin/search-material. Retorno de verificação aponta à busca do perfil; FollowUp retorna à busca administrativa.

### Critérios de conclusão

Produto correto abre em nova aba e refresh. ID inválido não dispara leitura nem logout; respostas obsoletas são descartadas. Pai é o mesmo após entrada por alertas, busca ou link direto. Permissões de edição existentes não se ampliam.

### Plano TDD

- RED: Adicionar VerificationPage.navigation.test.tsx para três perfis e estender testes de ProductHistory, busca e FollowUp: link com ID, retorno fixo, inválido, estado legado e leitura atrasada. Caracterizar retornos de verificação que já sejam corretos.
- GREEN: Aplicar auxiliares de ID e retorno nos consumidores, com controles disponíveis em carregamento/erro.
- REFACTOR: Remover inferência de origem e handlers redundantes mantendo gráficos, edição e exportação existentes.

### Validação

- `npm run test -- --run src/components/screens/VerificationPage src/components/screens/SearchMaterialComponent.test.tsx src/pages/products/ProductHistory src/pages/FollowUp`
- `npm run lint`
- `npm run build`

### Notas

Não transformar a rota de histórico de produto em query; ela já possui parâmetro de caminho.

## T012 — Completar históricos coletivos e retornos restantes de mentor e cadastros

- Status: concluída
- Issue: #222
- Dependências: T011
- Paralela: não
- Requisitos: RF-001, RF-003, RNF-002, CA-001, CA-003
- Caminhos sob responsabilidade: `frontend/src/pages/mentor/HistoryClass.tsx`, `frontend/src/pages/mentor/HistoryClass*.test.tsx`, `frontend/src/pages/loan/LoanHistories.tsx`, `frontend/src/pages/loan/LoanHistories*.test.tsx`, `frontend/src/pages/mentor/MyClass.tsx`, `frontend/src/pages/mentor/MyClass*.test.tsx`, `frontend/src/pages/mentor/Disabled.tsx`, `frontend/src/pages/mentor/Disabled*.test.tsx`, `frontend/src/pages/RegistrationRequests.tsx`, `frontend/src/pages/RegistrationRequests*.test.tsx`

### Escopo

Em HistoryClass e LoanHistories, separar sucesso vazio de falha da coleção, adotar contrato de T003 e manter retorno à home de mentor. Confirmar produtores MyClass/Disabled para histórico do dependente com ID na URL; Disabled retorna a /mentor/my-class. Corrigir retorno de RegistrationRequests por perfil: administrador → /admin/users, mentor → /mentor/my-class.

### Critérios de conclusão

Atalhos da home chegam a jornadas com dados, vazio ou erro contextual. Falha na lista não é apresentada como ausência de empréstimos. Links para dependentes preservam IDs e funcionam sem estado no destino. Nenhum callback usa history.back ou Login como retorno autenticado.

### Plano TDD

- RED: Estender testes de listas e RegistrationRequests, incluindo perfis distintos, erro/retry/200 [] e destinos por clique. Caracterizar links MyClass/Disabled já corrigidos pela tabela compartilhada sem fabricar RED.
- GREEN: Aplicar contratos e retornos nos pontos ainda legados, sem mudar formulário de criação de empréstimo ou regras de aprovação.
- REFACTOR: Remover captura que mascara erro e referências obrigatórias a estado; manter tabelas responsivas e filtros.

### Validação

- `npm run test -- --run src/pages/mentor/HistoryClass src/pages/loan/LoanHistories src/pages/mentor/MyClass src/pages/mentor/Disabled src/pages/RegistrationRequests`
- `npm run lint`
- `npm run build`

### Notas

Não adicionar botões novos em toda tela de primeiro nível: o contrato exige corrigir todas as ações de retorno existentes e garantir saída dos detalhes.

## T013 — Validar as jornadas no navegador com API real e falhas controladas

- Status: concluída
- Issue: #223
- Dependências: T012
- Paralela: não
- Requisitos: RF-001, RF-002, RF-003, RNF-001, RNF-002, CA-001, CA-002, CA-003
- Caminhos sob responsabilidade: `frontend/e2e/post-auth-navigation.spec.ts`, `frontend/e2e/post-auth-navigation-support.ts`, `frontend/e2e/responsive-support.ts`, `frontend/e2e/responsive-layout.spec.ts`, `frontend/e2e/feature-visibility.spec.ts`, `frontend/e2e/error-experience.spec.ts`, `frontend/e2e/user-data-contract.spec.ts`, `frontend/e2e/infra/artifacts/**`

### Escopo

Criar post-auth-navigation.spec.ts com matriz dos três perfis em 375/1440 pixels: atalhos, detalhe administrativo via solicitações, copiar URL/nova página, refresh, retorno, fallback, alias e acesso negado. Reutilizar mocks responsivos somente nos cenários de falha determinística; cenário de login e histórico administrativo usa API real e banco sintético da pilha E2E. Ajustar expectativas antigas de URLs/404 nas suítes existentes.

### Critérios de conclusão

Cada retorno final coincide com pai da especificação; nenhuma chamada usa undefined. Sessão permanece utilizável em operação autenticada posterior a 403/404/5xx e retorno; 401 real mantém encerramento central. Histórico real não depende de interceptar resposta. Isolar usuários/dados deste spec para não disputar a conta de credential-lifecycle.spec.ts, que altera senha e revoga sessões.

### Plano TDD

- RED: Escrever primeiro cenários de aceitação e executar como caracterização das entregas anteriores; se passarem inicialmente, registrar cobertura nova, não alegar RED. Falhas reais de navegação devem ser reproduzidas e encaminhadas à tarefa dona do código antes da correção. Falha de Docker não conta como RED funcional.
- GREEN: Preparar usuários e empréstimos sintéticos por fluxos autenticados existentes e auxiliares exclusivos de teste. Não mudar seed de produção, expor endpoint de teste ou depender da senha final/ordem de outra suíte. Ajustar amostras/expectativas de testes ao contrato aprovado e executar cenários até a passagem legítima.
- REFACTOR: Consolidar auxiliares do novo spec, preservar distinção entre rede real/controlada e capturas de falha, sem sleeps fixos ou testes ignorados.

### Validação

- `docker info`
- `docker compose -f docker-compose-e2e.yml up -d --build --wait`
- `npx --no-install playwright install --with-deps chromium`
- `npm run test:e2e:list`
- `npm run test:e2e -- e2e/post-auth-navigation.spec.ts`
- `npm run test:e2e`
- `docker compose -f docker-compose-e2e.yml down`

### Notas

Comandos npm/npx em frontend; Docker na raiz. Se a preparação de identidades não puder ser feita pelos fluxos existentes, registrar evidência e revisar posse/planejamento antes de alterar infraestrutura backend. A indisponibilidade de Docker registrada na entrega anterior deve ser reavaliada, sem presumir que persista.

## T014 — Conferir cobertura integrada e registrar evidências da entrega

- Status: concluída
- Issue: #223
- Dependências: T013
- Paralela: não
- Requisitos: RF-001, RF-002, RF-003, RNF-001, RNF-002, CA-001, CA-002, CA-003
- Caminhos sob responsabilidade: `.codex/docs/specs/navegacao-pos-autenticacao/validacao.md`

### Escopo

Registrar evidências cruzadas de contratos, rotas, permissões e comandos já executados, com resultado por critério e limitações. Auditar inventário final de retornos/IDs e conferir descoberta dos novos testes pela CI existente. Documentar backend antes do frontend e compatibilidade 404 → 200 [] para futura contribuição. Não concentrar implementação funcional nesta tarefa.

### Critérios de conclusão

Todos os critérios têm evidência verificável. Nenhum retorno autenticado restante depende do histórico ou monta Login indevidamente. As suítes frontend/backend/E2E têm resultados atuais; execução sem Docker ou somente com mocks não conclui CA-002 integrado. Gate pré-merge existe; obrigatoriedade em proteção de branch só é afirmada mediante evidência.

### Plano TDD

- RED: Verificação objetiva: confrontar matriz de requisitos, inventário estático e resultados de T001–T013. Lacunas reais ou testes não executados impedem conclusão; não criar teste artificial nem quebrar código para obter RED.
- GREEN: Completar validações cruzadas faltantes e registrar comandos, resultados, artefatos e pendências. Reabrir a tarefa responsável se encontrar falha funcional, com posse explícita antes de editar código.
- REFACTOR: Remover evidências redundantes/desatualizadas, mantendo rastreabilidade por requisito e distinção de testes reais/controlados.

### Validação

- `rg -n 'navigate\(-1|history\.back|onNavigate|Voltar|state\?\.id|clearSession' frontend/src`
- `npm run test -- --run`
- `npm run lint`
- `npm run build`
- `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`
- `npm run test:e2e:list`
- `git diff --check`

### Notas

Reutilizar execuções amplas recentes das tarefas anteriores quando não houver mudança posterior; não repetir suites por rotina. Se faltar E2E íntegro, executar os comandos de T013. Não publicar, abrir PR, sincronizar issues ou marcar a entrega pronta com validações obrigatórias bloqueadas.

## Log de execução

| Data | Tarefa | Resultado | Testes/evidências | Observações |
|---|---|---|---|---|
| 2026-09-09 | Planejamento | Plano criado | Cobertura, DAG, posse e comandos auditados documentalmente | Nenhuma tarefa funcional executada nesta etapa |
| 2026-09-13 | T001 | Concluída | RED por módulos ausentes; GREEN/REFACTOR: 46 testes; `npm run lint`; `npm run build`; `git diff --check` | Issue #223 em In Progress; `profileNavigation` e `BackLink` criados; tasks.md editado somente pelo orquestrador |
| 2026-09-13 | T002 | Concluída | RED: 4 falhas e 1 aprovação; GREEN/REFACTOR: 5/5 direcionados, 125/125 backend, `dotnet build`, `git diff --check` | Issue #221 em In Progress; Docker disponível após inicialização; 404/[] e autorização corrigidos; aviso CS8604 preexistente |
| 2026-09-13 | T003 | Concluída | RED adicional: `getLoansByClass` aceitou payload incompatível; GREEN/REFACTOR: schema/fixtures e 33 testes direcionados, suíte 100 arquivos/481 testes, `npm run lint`, `npm run build`, `git diff --check` | Issue #221 em In Progress; fixtures antigas alinhadas ao DTO real; agente encerrado sem relatório após validações, revisão centralizada concluiu a tarefa |
| 2026-09-13 | T004 | Concluída | RED: 9 falhas de logout/guard/alias/rota; GREEN/REFACTOR: 58/58 direcionados, suíte frontend 102 arquivos/490 testes, `npm run lint`, `npm run build`, `git diff --check` | Issue #222 em In Progress; Page404/PrivateRoute/alias corrigidos; avisos de build preexistentes |
| 2026-09-13 | T005 | Concluída | RED: módulo `admin/Home` ausente; GREEN/REFACTOR: 8 testes direcionados, suíte frontend 103 arquivos/495 testes, `npm run lint`, `npm run build`, `git diff --check` | Issue #219 em In Progress; Home administrativa restaurada com catálogo de atalhos, consultas independentes e retry contextual; revisão centralizada após encerramento do agente |
| 2026-09-13 | T006 | Concluída | RED: 3 falhas esperadas por IDs ausentes nos `href`; GREEN/REFACTOR: 13 testes direcionados, `npm run lint`, `npm run build`, `git diff --check` | Issue #222 em In Progress; ItemClickable, ItemButtonLink e TableItemWithActions agora compartilham IDs na URL e preservam `state.id`; build concluído na revisão central |
| 2026-09-13 | T007 | Concluída | RED: 10 falhas nos 12 cenários de navegação novos; GREEN/REFACTOR: 8 arquivos/29 testes direcionados, `npm run lint`, `npm run build`, `git diff --check` | Issue #221 em In Progress; detalhes admin/mentor/mentorado usam query, contratos compartilhados, retry e retorno seguro; regressão ampla ficou 92/106 arquivos e 493/509 testes por 16 expectativas antigas de `href` sem ID, pertencentes aos consumidores das T008/T010/T011/T012 |
| 2026-09-13 | T008 | Concluída | RED/GREEN/REFACTOR: 36 testes direcionados, `npm run lint`, `npm run build`, `git diff --check` | Issue #221 em In Progress; LoansRequest/AllLoans usam IDs em links, contratos compartilhados, estados vazio/erro/retry e retornos administrativos explícitos |
| 2026-09-13 | T009 | Concluída | RED: 9 falhas nos 13 cenários novos; GREEN/REFACTOR: 13/13 testes direcionados, `npm run lint`, `npm run build`, `git diff --check` | Issue #221 em In Progress; históricos admin/mentor/mentorado usam contratos, query/state normalizado, identidade de sessão e erros parciais sem conversão para vazio; regressão ampla ainda contém expectativas legadas de `href` sem ID em consumidores das ondas seguintes |
| 2026-09-13 | T010 | Concluída | RED: 11 falhas funcionais novas; GREEN/REFACTOR: 9 arquivos/31 testes direcionados, `npm run lint`, `npm run build`, `git diff --check` | Issue #222 em In Progress; turmas, ClassLoan e RegisteredUsers preservam IDs, bloqueiam consultas inválidas, distinguem vazio/erro e retornam a pais seguros |
| 2026-09-14 | T011 | Concluída | RED: linha de base com 2 expectativas antigas de `href` e novos testes sem GREEN; GREEN/REFACTOR: 35/35 testes direcionados, `npm run lint`, `npm run build`, `git diff --check` | Issue #222 em In Progress; VerificationPage, ProductHistory, FollowUp e busca usam IDs/retornos seguros, retry contextual e descarte de respostas obsoletas; permissões preservadas |
| 2026-09-14 | T012 | Concluída | RED: 15/21 testes passaram e 6 falharam pelas lacunas esperadas; GREEN/REFACTOR: 21/21 direcionados, `npm run lint`, `npm run build`, `git diff --check` | Issue #222 em In Progress; históricos coletivos distinguem vazio/erro, retornam à home do mentor, produtores preservam IDs na URL e RegistrationRequests retorna por perfil; telas restauradas após interrupção do agente e revisadas centralmente |
| 2026-09-14 | T013 | Concluída | RED: 10 cenários novos executados após correção de expectativas/seleção de controle; GREEN/REFACTOR: 10/10 direcionados e 201/201 E2E completos, `docker info`, stack Docker com PostgreSQL/backend/frontend/Mailpit, Chromium instalado, `npm run test:e2e:list` | Issue #223 em In Progress; atalhos dos três perfis, query/refresh/retornos, alias, acesso negado, retry e ciclo real de credencial aprovados; volumes E2E descartáveis recriados e stack finalizada com `docker compose ... down` |
| 2026-09-14 | T014 | Concluída | Auditoria `rg` sem `navigate(-1`/`history.back`; frontend 120 arquivos/559 testes, lint, build, backend 125/125, E2E 201/201, inventário 201 testes/7 arquivos e `git diff --check` aprovados | Issue #223 em In Progress; evidências cruzadas e limitações registradas em `validacao.md`; workflow CI existente confirma o gate, sem afirmar proteção de branch não comprovada |
