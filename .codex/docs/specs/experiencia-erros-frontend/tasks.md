# Tarefas: Experiência de erros no frontend

- Status: concluída
- PRD: `./prd.md`
- Especificação técnica: `./techspec.md`
- Atualizado em: 2026-09-07
- Issue de contexto: #225

## Contexto e regras de execução

Ler o PRD e a especificação técnica antes de executar cada tarefa. Este plano cobre exclusivamente frontend e validação da esteira existente; não exige alterações de API ou banco. Cada tarefa corresponde a uma execução de `$execute-task`. Caminhos com asterisco incluem implementação e testes colocalizados; novos arquivos de teste citados abaixo são entregáveis, não arquivos já existentes.

A inspeção confirmou scripts Vitest, Playwright, lint e build em `frontend/package.json`; falta MSW. T001 complementa a infraestrutura existente. `.github/workflows/container-ci.yml` já executa testes frontend/backend e E2E em PR para `develop`; `security-dependencies.yml` também cobre mudanças de dependências. Não há lacuna que justifique tarefa de alteração da CI. A exigência dos checks na proteção de branch permanece uma verificação externa dos mantenedores, sem impedir esta decomposição.

Os contratos e o catálogo de operações ficam prontos em T002; componentes compartilhados em T004; integrações em T005/T006. Consumidores posteriores não alteram esses caminhos em paralelo: uma necessidade descoberta reabre a tarefa proprietária e suspende os consumidores afetados. Handlers específicos ficam colocalizados; recursos compartilhados de MSW pertencem a T001.

Todos os comandos npm abaixo são executados em `frontend/`, usando scripts existentes. Os comandos Docker e dotnet são executados na raiz. Em PowerShell, mudar o diretório separadamente, sem depender de `&&`. Instalação de dependências/lockfile pertence apenas a T001. Lint pode acompanhar cada tarefa; testes amplos e build são executados uma vez após cada onda, pelo responsável pela integração. Não executar builds concorrentes no mesmo checkout: `frontend/dist/**`, `frontend/*.tsbuildinfo`, artefatos Playwright e `backend/**/bin/**`/`obj/**` são saídas compartilhadas, nunca posse paralela. Preservar alterações locais preexistentes.

Registrar evidências reais RED–GREEN–REFACTOR no log, sem fabricar falha removendo comportamento correto. Quando houver cobertura preexistente, caracterizar e manter o comportamento válido antes de exigir a mudança nova. Nenhum teste foi executado por este documento de planejamento.

## Ondas de execução

| Onda | Tarefas | Motivo de segurança do paralelismo |
|---|---|---|
| 1 | T001, T002, T003 | MSW/configuração, núcleo de erros e helper de rota têm posse disjunta e contratos descritos na techspec. T002/T003 usam Vitest existente sem depender do MSW. |
| 2 | T004 | Apresentação depende do catálogo pronto e concentra componentes compartilhados. |
| 3 | T005 | Interceptor, autenticação e consumidores de sessão mudam juntos. |
| 4 | T006 | Migração dos demais adaptadores após normalização global. |
| 5 | T007, T008 | Consultas em arquivos diferentes; catálogo e adaptadores somente para leitura. |
| 6 | T009, T010, T011, T012 | Grupos de mutações/formulários disjuntos e contratos estáveis; limitar concorrência à capacidade disponível. |
| 7 | T013 | Aceitação transversal, inventário e gate completo após todas as migrações. |

`Paralela: sim` indica elegibilidade apenas na onda indicada, com dependências concluídas e sem escrita compartilhada. O plano não inicia agentes nem implementação. T009–T012 aguardam ambas as consultas para respeitar a ordem de disponibilização da techspec.

## T001 — Configurar integração HTTP com MSW no Vitest

- Status: concluída
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-001 (infraestrutura necessária aos testes HTTP)
- Caminhos sob responsabilidade: `frontend/package.json`, `frontend/package-lock.json`, `frontend/src/test/**`, `frontend/vite.config.ts`

### Escopo

Adicionar MSW como dependência de desenvolvimento compatível com o Node 20 da CI. Criar servidor, handlers mínimos e fixtures sanitizadas em src/test/msw/, com inicialização, reset entre testes e encerramento. Manter mocks fora da aplicação e do bundle; não criar worker em public/.

### Critérios de conclusão

Uma chamada Axios real é interceptada no Vitest, um handler sobrescrito não vaza ao teste seguinte e requisições de API inesperadas falham. Setup atual e testes existentes continuam funcionando.

### Plano TDD

- RED: Criar src/test/msw/server.test.ts verificando interceptação e isolamento; registrar a falha de infraestrutura pela ausência de MSW/setup.
- GREEN: Instalar MSW e conectar seu ciclo de vida ao setup existente, preservando cleanup e restauração de mocks.
- REFACTOR: Consolidar apenas fixtures reutilizáveis; manter handlers específicos junto dos testes consumidores.

### Validação

- `npm run test -- --run src/test/msw`
- `npm run lint`

### Notas

Ao concluir a onda, executar `npm run test -- --run` e `npm run build` de forma serializada, além das validações direcionadas. Registrar regressões e corrigi-las antes de liberar dependentes.

## T002 — Definir erro tipado, catálogo e normalização segura

- Status: concluída
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-001, RF-002, RNF-001, CA-001
- Caminhos sob responsabilidade: `frontend/src/errors/applicationError*`, `frontend/src/errors/normalizeError*`, `frontend/src/errors/errorCatalog*`, `frontend/src/errors/reportAppError*`

### Escopo

Implementar ApplicationError, type guard, classificação, catálogo local e reportAppError. Definir OperationId para todas as operações do inventário, incluindo autenticação, recuperação, cadastros, consultas e mutações, antes das tarefas consumidoras. Usar códigos e campos já presentes nos contratos/política de senha como allowlist, sem inventar códigos de API.

### Critérios de conclusão

Cobrir 400/422, 401, 403, 404, 409, 500–599, timeout, rede e desconhecido; status HTTP prevalece sobre corpo. Suportar formatos legados/ModelState/ProblemDetails, idempotência e fallback seguro. requestId respeita precedência, caracteres e 128 caracteres; campos esperados recebem mensagem local ou fallback e campos desconhecidos são descartados. O objeto não retém erro bruto; logs são no-op em produção e limitados aos metadados permitidos em desenvolvimento.

### Plano TDD

- RED: Escrever testes parametrizados com mensagens, token, senha, stack e payload sentinelas; exigir sanitização, retryable, precedência e rejeições malformadas. Os módulos inexistentes fazem falhar os casos novos.
- GREEN: Implementar exatamente o contrato e a tabela da techspec, incluindo proteção contra falha do parsing.
- REFACTOR: Unificar mensagens e allowlists; reaproveitar a política de senha existente sem criar dependência circular com apresentação.

### Validação

- `npm run test -- --run src/errors/applicationError src/errors/normalizeError src/errors/errorCatalog src/errors/reportAppError`
- `npm run lint`

### Notas

OperationId e allowlists devem cobrir os consumidores das tarefas seguintes; registrar o mapeamento concreto no catálogo e seus testes. Ler contratos existentes é permitido; sua alteração não faz parte desta tarefa.

## T003 — Guardar e consumir rota pretendida com validação

- Status: concluída
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-003, RNF-001, CA-002
- Caminhos sob responsabilidade: `frontend/src/auth/intendedRoute*`

### Escopo

Criar helpers para auth:intended-route e auth:notice, validação na gravação/consumo e descarte explícito. Preservar pathname, search e hash de rota interna válida, limitada a 2.048 caracteres. Separar consumo da rota do consumo do aviso.

### Critérios de conclusão

Recusar URLs absolutas, //, outra origem, rotas públicas de autenticação e prefixos que apenas imitam um perfil, como /administrator. Consumo exige prefixo do perfil autenticado e ocorre uma vez; rota inválida é descartada. Storage indisponível não lança erro. A primeira rota válida pode ser preservada durante a troca obrigatória.

### Plano TDD

- RED: Criar intendedRoute.test.ts para limites, query/hash, perfis, rotas públicas, manipulação de storage, aviso de uso único e exceções de leitura/escrita/remoção.
- GREEN: Implementar helpers conforme as regras e chaves da techspec, sem armazenar credenciais.
- REFACTOR: Centralizar validação para gravação e consumo sem acoplar helper a componentes ou Axios.

### Validação

- `npm run test -- --run src/auth/intendedRoute`
- `npm run lint`

### Notas

Ao concluir a onda, executar `npm run test -- --run` e `npm run build` de forma serializada, além das validações direcionadas. Registrar regressões e corrigi-las antes de liberar dependentes.

## T004 — Entregar apresentação comum e feedback acessível

- Status: concluída
- Dependências: T002
- Paralela: não
- Requisitos: RF-002, RNF-001, RNF-002, CA-001, CA-004
- Caminhos sob responsabilidade: `frontend/src/errors/presentError*`, `frontend/src/components/global/ErrorFeedback*`, `frontend/src/components/hooks/use-toast.ts`, `frontend/src/components/ui/toast.tsx`, `frontend/src/components/ui/toaster.tsx`, `frontend/src/components/global/inputs/Text*`, `frontend/src/components/global/inputs/Password*`, `frontend/src/components/auth/PasswordChangeFields*`

### Escopo

Implementar ErrorPresentation, presentError, notifyError e ErrorFeedback com catálogo de T002. Associar ação/campo e referência opcional; manter Radix Toast e TOAST_LIMIT = 1. Ajustar componentes de campo apenas se necessário para associação acessível.

### Critérios de conclusão

Título identifica operação, descrição explica categoria e ação sugere próximo passo. Inline usa role=alert/aria-live=assertive; toast destrutivo usa live region existente. Repetição é acessível por teclado e chama callback apenas quando pertinente; 403/404 permitem navegação segura. Referência é rotulada e sentinelas não chegam ao DOM/toast.

### Plano TDD

- RED: Caracterizar primeiro as associações já existentes de Text, Password e PasswordChangeFields. Criar testes de apresentação e ErrorFeedback para anúncio, foco, repetição e referência; novos componentes ausentes falham.
- GREEN: Implementar componentes/adaptadores e os ajustes de acessibilidade exigidos pelos testes.
- REFACTOR: Eliminar duplicação de vocabulário; não criar uma segunda live region no toast.

### Validação

- `npm run test -- --run src/errors/presentError src/components/global/ErrorFeedback src/components/global/inputs/Text src/components/global/inputs/Password src/components/auth/PasswordChangeFields`
- `npm run lint`

### Notas

Ao concluir a onda, executar `npm run test -- --run` e `npm run build` de forma serializada, além das validações direcionadas. Registrar regressões e corrigi-las antes de liberar dependentes.

## T005 — Integrar normalização ao ciclo de sessão e retorno pós-login

- Status: concluída
- Dependências: T001, T002, T003, T004
- Paralela: não
- Requisitos: RF-001, RF-002, RF-003, RNF-001, RNF-002, CA-002, CA-003, CA-004
- Caminhos sob responsabilidade: `frontend/src/services/BaseApi*`, `frontend/src/auth/session*`, `frontend/src/auth/firstAccess.test.tsx`, `frontend/src/integration/Auth*`, `frontend/src/pages/Login*`, `frontend/src/pages/ChangePassword*`, `frontend/src/components/global/ButtonLogout*`

### Escopo

Normalizar toda rejeição Axios e falhas locais de Auth. No primeiro 401 privado, guardar rota/aviso, limpar autenticação e executar location.replace('/'); deduplicar rajadas. Migrar Login e ChangePassword para o contrato comum. Consumir aviso no login e rota após startSession, respeitando getHomePathForRole e troca obrigatória; logout explícito descarta ambos.

### Critérios de conclusão

401 no login/endpoint Auth/login não causa nova navegação. 403 preserva cookies, storages, URL e estado. Falha de storage não impede encerramento. Login com perfil incompatível usa início padrão; troca obrigatória preserva rota até nova autenticação. Preferências permanecem e falhas de autenticação não expõem dados técnicos. Manter semântica dos códigos de credenciais já existentes, caracterizando eventuais 409 de troca de senha antes de adaptar seu tratamento.

### Plano TDD

- RED: Caracterizar cookies/preferências e ciclo de credenciais existentes. Atualizar BaseApi.test.tsx e adicionar integração MSW para 401/403, rajadas, erro normalizado e falha de storage; testar aviso único, retorno, logout e troca obrigatória. Exigência de replace/retomada falha no comportamento atual.
- GREEN: Conectar helpers, normalizador e apresentação; adaptar Auth e consumidores, removendo leitura de response.status/corpo bruto.
- REFACTOR: Remover toast perdido antes do reload e classificações duplicadas; manter clearSession reutilizável sem apagar rota no fluxo de expiração/troca.

### Validação

- `npm run test -- --run src/services/BaseApi src/auth src/integration/Auth src/pages/Login src/pages/ChangePassword src/components/global/ButtonLogout`
- `npm run lint`

### Notas

Auth.ts pertence exclusivamente a esta tarefa. Não limpar rota pretendida dentro de clearSession indiscriminadamente: expiração e troca obrigatória precisam preservá-la, enquanto logout explícito deve descartá-la. Atualizar testes existentes de credenciais quando dependam do formato de erro anterior, preservando suas garantias.

## T006 — Migrar os demais adaptadores de integração

- Status: concluída
- Dependências: T005
- Paralela: não
- Requisitos: RF-001, RF-002, RNF-001, CA-001
- Caminhos sob responsabilidade: `frontend/src/integration/Auditoria*`, `frontend/src/integration/Class*`, `frontend/src/integration/Loans*`, `frontend/src/integration/Notifications*`, `frontend/src/integration/Product*`, `frontend/src/integration/System*`, `frontend/src/integration/Users*`

### Escopo

Fazer todos os adaptadores restantes propagarem ApplicationError inclusive em rejeições locais anteriores ao HTTP. Remover inspeção Axios e logs de erro bruto; usar diagnóstico sanitizado de T002 quando necessário. Documentar por operação as exceções em que 404 representa coleção vazia.

### Critérios de conclusão

Cobertura dos sete módulos e de suas rejeições locais; nenhum catch perde categoria/referência. Caracterizar e preservar 404 vazio em getDependentesID, getDependentesForApproval e getAllUsersForApproval, mantendo outros 404 como not_found. Sucessos preservam corpos/contratos existentes.

### Plano TDD

- RED: Caracterizar sucessos e as três exceções 404 antes da migração. Adicionar testes MSW por módulo para falha HTTP, validação e erro local, verificando contrato e ausência de log sensível.
- GREEN: Normalizar rejeições locais e adaptar exceções de domínio pelo erro tipado; manter erros HTTP idempotentes.
- REFACTOR: Retirar catches redundantes, casts Axios e console com objetos brutos.

### Validação

- `npm run test -- --run src/integration src/contracts`
- `npm run lint`

### Notas

Ao concluir a onda, executar `npm run test -- --run` e `npm run build` de forma serializada, além das validações direcionadas. Registrar regressões e corrigi-las antes de liberar dependentes.

## T007 — Distinguir falha e vazio nas consultas de usuários e turmas

- Status: concluída
- Dependências: T006
- Paralela: sim
- Requisitos: RF-002, RNF-001, RNF-002, CA-001, CA-003, CA-004
- Caminhos sob responsabilidade: `frontend/src/pages/RegisteredUsers*`, `frontend/src/pages/ViewClass.*`

### Escopo

Migrar RegisteredUsers e ViewClass para ErrorFeedback, mantendo loading, dados, vazio e erro separados. Usar operações do catálogo e integrar repetição à consulta original.

### Critérios de conclusão

Cada tela cobre sucesso preenchido, sucesso vazio, falha, repetição com sucesso e repetição com falha. 403 preserva sessão/tela e 404 respeita semântica do adaptador. Referência sanitizada é opcional; falha nunca se apresenta como coleção vazia.

### Plano TDD

- RED: Caracterizar sucesso e responsividade; criar testes *.errors.test.tsx com MSW para erro persistente, categorias e retry. Hoje falhas não produzem feedback comum contextual.
- GREEN: Adicionar estado de erro separado e conectar ações acessíveis.
- REFACTOR: Remover mensagens genéricas e simplificar estados sem alterar filtragem/paginação existentes.

### Validação

- `npm run test -- --run src/pages/RegisteredUsers src/pages/ViewClass.`
- `npm run lint`

### Notas

Ao concluir a onda, executar `npm run test -- --run` e `npm run build` de forma serializada, além das validações direcionadas. Registrar regressões e corrigi-las antes de liberar dependentes.

## T008 — Distinguir falha e vazio nas consultas de empréstimos e produtos

- Status: concluída
- Dependências: T006
- Paralela: sim
- Requisitos: RF-002, RNF-001, RNF-002, CA-001, CA-003, CA-004
- Caminhos sob responsabilidade: `frontend/src/pages/admin/AllLoans*`, `frontend/src/pages/products/ProductHistory*`

### Escopo

Migrar AllLoans e ProductHistory para estados persistentes de falha com ErrorFeedback e ações ligadas à consulta.

### Critérios de conclusão

Ambas distinguem carregamento, sucesso vazio, dados e falha; retry atualiza o mesmo feedback e recupera dados quando bem-sucedido. Exercitar 400/403/404/409/500/rede ao longo dos casos, incluindo referência e ausência de sentinelas.

### Plano TDD

- RED: Caracterizar listagem bem-sucedida; adicionar *.errors.test.tsx com handlers MSW para falha confundida com vazio, retry e autorização.
- GREEN: Conectar normalização/apresentação e estados sem apagar informação válida por falha de atualização.
- REFACTOR: Retirar fallbacks genéricos mantendo histórico, filtros e layout existentes.

### Validação

- `npm run test -- --run src/pages/admin/AllLoans src/pages/products/ProductHistory`
- `npm run lint`

### Notas

Ao concluir a onda, executar `npm run test -- --run` e `npm run build` de forma serializada, além das validações direcionadas. Registrar regressões e corrigi-las antes de liberar dependentes.

## T009 — Migrar aprovação e rejeição de cadastros

- Status: concluída
- Dependências: T007, T008
- Paralela: sim
- Requisitos: RF-002, RNF-001, RNF-002, CA-001, CA-003, CA-004
- Caminhos sob responsabilidade: `frontend/src/pages/RegistrationRequests*`

### Escopo

Migrar carga e ações de RegistrationRequests para feedback comum; contextualizar aprovação e rejeição separadamente.

### Critérios de conclusão

Falha de mutação mantém registro e estado anterior; ação fica desabilitada apenas durante envio. 409 orienta atualizar antes de repetir; 403 mantém sessão; validação global é anunciada e carga falha não parece vazia.

### Plano TDD

- RED: Criar RegistrationRequests.errors.test.tsx para aprovar/rejeitar com falha, envio pendente e recuperação, caracterizando sucesso existente.
- GREEN: Usar ErrorFeedback na carga e notifyError nas ações; atualizar lista somente após sucesso confirmado.
- REFACTOR: Remover toasts genéricos e preservar regras de aprovação existentes.

### Validação

- `npm run test -- --run src/pages/RegistrationRequests`
- `npm run lint`

### Notas

Ao concluir a onda, executar `npm run test -- --run` e `npm run build` de forma serializada, além das validações direcionadas. Registrar regressões e corrigi-las antes de liberar dependentes.

## T010 — Migrar decisões e devoluções de empréstimos

- Status: concluída
- Dependências: T007, T008
- Paralela: sim
- Requisitos: RF-002, RNF-001, RNF-002, CA-001, CA-003, CA-004
- Caminhos sob responsabilidade: `frontend/src/pages/admin/LoansRequest*`, `frontend/src/pages/loan/LoanHistory*`, `frontend/src/pages/admin/ReturnLoan*`

### Escopo

Migrar LoansRequest, loan/LoanHistory e ReturnLoan, cobrindo cada ação de aprovação, rejeição ou devolução existente e erros de suas cargas.

### Critérios de conclusão

Para cada mutação, falha preserva item/status anterior e reabilita controle; sucesso mantém fluxo atual. 409 exige atualização, 403 não encerra sessão e falhas de carga não viram vazio. Toast inclui operação e ação, sem payload remoto.

### Plano TDD

- RED: Adicionar *.errors.test.tsx por tela para cada ação com falha, conflito e sucesso após recuperação; caracterizar fluxos corretos antes de alterar.
- GREEN: Integrar apresentador nas mutações e feedback persistente nas consultas dessas telas.
- REFACTOR: Eliminar classificações locais e mensagens genéricas sem misturar regras de empréstimo no normalizador.

### Validação

- `npm run test -- --run src/pages/admin/LoansRequest src/pages/loan/LoanHistory src/pages/admin/ReturnLoan`
- `npm run lint`

### Notas

Ao concluir a onda, executar `npm run test -- --run` e `npm run build` de forma serializada, além das validações direcionadas. Registrar regressões e corrigi-las antes de liberar dependentes.

## T011 — Migrar cadastro e recuperação de acesso

- Status: concluída
- Dependências: T007, T008
- Paralela: sim
- Requisitos: RF-002, RNF-001, RNF-002, CA-001, CA-004
- Caminhos sob responsabilidade: `frontend/src/pages/CreateAccount*`, `frontend/src/pages/ForgotPassword*`, `frontend/src/pages/ResetPassword*`

### Escopo

Migrar CreateAccount, ResetPassword e feedback de falha de ForgotPassword. Preservar respostas de recuperação que evitam enumerar contas e códigos conhecidos de senha/token. Aplicar fieldErrors reconhecidos por setError, com resumo comum.

### Critérios de conclusão

400/422 estruturado chega aos campos esperados com aria-invalid/aria-describedby e resumo anunciado. Erros livres/segredos não aparecem. 409, servidor, rede e token inválido têm ação contextual; formulário mantém valores e reabilita envio. Não mudar contratos de cadastro/credenciais.

### Plano TDD

- RED: Caracterizar validações e proteção contra enumeração existentes. Adicionar integração MSW de ValidationProblemDetails e casos de rede/servidor/legado; atualizar mocks antigos que retornam Axios bruto.
- GREEN: Substituir parsers próprios pelo contrato seguro, ligando catálogo, campos e feedback.
- REFACTOR: Eliminar duplicação das mensagens de senha e leitura de response.data.

### Validação

- `npm run test -- --run src/pages/CreateAccount src/pages/ForgotPassword src/pages/ResetPassword`
- `npm run lint`

### Notas

Ao concluir a onda, executar `npm run test -- --run` e `npm run build` de forma serializada, além das validações direcionadas. Registrar regressões e corrigi-las antes de liberar dependentes.

## T012 — Migrar os três formulários de criação de materiais

- Status: concluída
- Dependências: T007, T008
- Paralela: sim
- Requisitos: RF-002, RNF-001, RNF-002, CA-001, CA-003, CA-004
- Caminhos sob responsabilidade: `frontend/src/components/global/forms/create/**`

### Escopo

Migrar FormVidraria, FormQuimicos e FormOutros, usando operações de T002, notifyError e fieldErrors reconhecidos.

### Critérios de conclusão

Cada formulário cobre validação de campo associada, resumo anunciado, 403 sem logout, 409 com atualização sugerida e indisponibilidade. Falhas mantêm valores e formulário aberto; sucesso preserva fechamento/atualização existentes. Nenhum texto remoto livre é exibido.

### Plano TDD

- RED: Criar testes *.errors.test.tsx por formulário com MSW; caracterizar sucesso e exigir preservação de valores, foco/associação e fim do estado pendente.
- GREEN: Conectar setError e feedback comum sem reimplementar categorias ou catálogo.
- REFACTOR: Remover catches genéricos e duplicações locais, preservando campos e contratos próprios de cada material.

### Validação

- `npm run test -- --run src/components/global/forms/create`
- `npm run lint`

### Notas

Ao concluir a onda, executar `npm run test -- --run` e `npm run build` de forma serializada, além das validações direcionadas. Registrar regressões e corrigi-las antes de liberar dependentes.

## T013 — Validar aceitação transversal e impedir regressão do inventário

- Status: concluída
- Dependências: T009, T010, T011, T012
- Paralela: não
- Requisitos: RF-001, RF-002, RF-003, RNF-001, RNF-002, CA-001, CA-002, CA-003, CA-004
- Caminhos sob responsabilidade: `frontend/e2e/error-experience.spec.ts`, `frontend/src/errors/migrationInventory.test.ts`

### Escopo

Adicionar E2E crítico de sessão/retorno e teste automatizado de inventário. Reutilizar pilha Docker e autenticação sintética existentes; produzir respostas 401/403 determinísticas nas requisições alvo do navegador, mantendo autenticação real contra a pilha. Testar integração cruzada, sem transferir para cá os testes unitários das tarefas anteriores.

### Critérios de conclusão

Playwright comprova 401, limpeza, login, retorno permitido com query/hash, fallback para rota insegura/outro perfil e 403 sem logout. Inventário explícito cobre todos os arquivos migrados e proíbe Erro durante requisição, <div>Error</div> e equivalentes encontrados na auditoria; testes de comportamento anteriores garantem contexto/ação. Sentinelas não aparecem no DOM/logs de produção nem no bundle. Todos os gates existentes passam.

### Plano TDD

- RED: Escrever cenários E2E e teste de inventário antes da verificação integrada; caracterizar os fluxos já implementados, sem exigir RED artificial se passarem. Registrar falhas reais de integração para correção pela tarefa proprietária.
- GREEN: Completar fixtures/casos E2E e a guarda executada pelo Vitest; corrigir falhas funcionais reabrindo a tarefa responsável e serializando a alteração.
- REFACTOR: Reduzir duplicação dos cenários sem acoplar testes a seletores frágeis; verificar que MSW não integra o bundle de produção.

### Validação

- `npm run test -- --run src/errors/migrationInventory`
- `npm run lint`
- `npm run test -- --run`
- `npm run build`
- `npm run test:e2e:list`
- Na raiz: `docker compose -f docker-compose-e2e.yml up -d --build --wait`.
- Em frontend: `npm run test:e2e -- e2e/error-experience.spec.ts`; se passar, executar a suíte completa `npm run test:e2e`.
- Na raiz, após os testes, inclusive em falha: `docker compose -f docker-compose-e2e.yml down --volumes --remove-orphans` (somente a pilha sintética E2E).
- Na raiz: `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`.
- Inspecionar bundle de produção e logs com as mesmas sentinelas usadas nos testes; verificar ausência de conteúdo remoto sensível e de MSW no bundle.

### Notas

Executar apenas validações cruzadas nesta tarefa. Listar testes E2E não substitui executá-los. Registrar indisponibilidade de Docker/serviços como impedimento à evidência correspondente; não declarar aceitação sem execução. Os jobs atuais descobrem automaticamente os novos testes, sem editar workflows.

## Matriz de rastreabilidade

| Requisito | Tarefas responsáveis |
|---|---|
| RF-001 | T001, T002, T005, T006, T013 |
| RF-002 | T002, T004, T005, T006, T007, T008, T009, T010, T011, T012, T013 |
| RF-003 | T003, T005, T013 |
| RNF-001 | T001, T002, T003, T004, T005, T006, T007, T008, T009, T010, T011, T012, T013 |
| RNF-002 | T004, T005, T007, T008, T009, T010, T011, T012, T013 |
| CA-001 | T001, T002, T004, T006, T007, T008, T009, T010, T011, T012, T013 |
| CA-002 | T003, T005, T013 |
| CA-003 | T005, T007, T008, T009, T010, T012, T013 |
| CA-004 | T004, T005, T007, T008, T009, T010, T011, T012, T013 |

## Cobertura do inventário

| Área/consumidor | Tarefa |
|---|---|
| ApplicationError, normalizador, catálogo, diagnóstico | T002 |
| Rota pretendida e aviso | T003, T005 |
| Apresentação, toast e associação dos campos | T004 |
| BaseApi, Auth, Login, ChangePassword e logout | T005 |
| Auditoria, Class, Loans, Notifications, Product, System e Users | T006 |
| RegisteredUsers e ViewClass | T007 |
| admin/AllLoans e products/ProductHistory | T008 |
| RegistrationRequests | T009 |
| admin/LoansRequest, loan/LoanHistory e admin/ReturnLoan | T010 |
| CreateAccount, ForgotPassword e ResetPassword | T011 |
| FormVidraria, FormQuimicos e FormOutros | T012 |
| Guarda automatizada do inventário e E2E 401/403 | T013 |

## Log de execução

| Data | Tarefa | Resultado | Testes/evidências | Observações |
|---|---|---|---|---|
| 2026-09-07 | T001 | concluída | RED: importação de MSW falhou; GREEN/REFACTOR: 4 testes MSW, suíte 58 arquivos/228 testes, lint, build e `git diff --check` aprovados | MSW 2.11.6; avisos preexistentes de stderr/bundle; sem bloqueio; `tasks.md` não editado pelo agente |
| 2026-09-07 | T003 | concluída | RED: módulo ausente/import falhou; GREEN/REFACTOR: 21 testes direcionados, lint e `git diff --check` aprovados | Suíte/build aguardaram T002; falharam somente pelos módulos T002 ausentes; sem bloqueio; `tasks.md` não editado pelo agente |
| 2026-09-07 | T002 | concluída | RED: 4 suítes falharam por módulos inexistentes; GREEN/REFACTOR: 24 testes direcionados, suíte 62 arquivos/253 testes, lint, build e `git diff --check` aprovados | Normalização segura, allowlists, catálogo, OperationId e diagnóstico; avisos preexistentes de bundle/LF-CRLF; sem bloqueio; `tasks.md` não editado pelo agente |
| 2026-09-07 | T004 | concluída | RED: módulos `presentError`/`ErrorFeedback` ausentes; GREEN/REFACTOR: 14 testes direcionados, suíte 64 arquivos/260 testes, lint, build e `git diff --check` aprovados | Radix Toast/TOAST_LIMIT preservados, sem segunda live region; inputs caracterizados sem alteração; avisos preexistentes de bundle/env/asset; sem bloqueio; `tasks.md` não editado pelo agente |
| 2026-09-07 | T005 | concluída | RED: falhas reais no interceptor/Auth/Login/ChangePassword; GREEN/REFACTOR: 84 testes direcionados, lint e build aprovados | Suíte ampla: 276/277; falha única em `ResetPassword.test.tsx` porque T011 ainda consome erro Axios bruto após Auth passar a normalizar; correção reservada a T011; sem bloqueio técnico em T005; `tasks.md` não editado pelo agente |
| 2026-09-07 | T006 | concluída | RED: 10 falhas esperadas em 35 testes; GREEN/REFACTOR: 80 testes de integração, validação `src/integration src/contracts`, lint, build e `git diff --check` aprovados | Sete adaptadores normalizados; 404 vazio preservado somente nas três operações previstas; suíte ampla 301/302 pela falha conhecida de T011/ResetPassword; sem bloqueio; `tasks.md` não editado pelo agente |
| 2026-09-07 | T007 | concluída | RED: 11 falhas comportamentais em 14 testes; GREEN/REFACTOR: 18 testes direcionados, lint, sentinelas e `git diff --check` aprovados | Estados de usuários/turmas separados e retry acessível; build pendente de validação consolidada por possível erro reportado nos arquivos T008; sem bloqueio próprio; `tasks.md` não editado pelo agente |
| 2026-09-07 | T008 | concluída | RED: 17 falhas esperadas; GREEN/REFACTOR: 19 testes direcionados, lint exclusivo e build reportados aprovados | Estados de empréstimos/produto separados, dados preservados em falha; validação consolidada deve confirmar o possível diagnóstico divergente de T007; falha ampla conhecida de T011; `tasks.md` não editado pelo agente |
| 2026-09-07 | T008-correção | concluída | RED: build reproduziu 2 erros TS2322; GREEN/REFACTOR: teste direcionado 19/19, lint, build e `git diff --check` aprovados | Corrigida a guarda de renderização de `unknown` em AllLoans/ProductHistory; sem bloqueio; `tasks.md` não editado pelo agente |
| 2026-09-07 | T009 | concluída | RED: 6 falhas comportamentais; GREEN/REFACTOR: 9 testes da tela e lint isolado aprovados; `git diff --check` aprovado | Carga e aprovar/rejeitar usam feedback comum e preservam estado; lint/build globais aguardam T010 concorrente; sem bloqueio próprio; `tasks.md` não editado pelo agente |
| 2026-09-07 | T011 | concluída | RED: 7 falhas reais nos cenários novos; GREEN/REFACTOR: 20 testes direcionados, lint restrito e `git diff --check` aprovados; parsers Axios e `response.data` removidos | Suíte ampla 364/365; falha fora da posse em `LoansRequest.responsive.test.tsx`; build aguardava correção de `.at()` em testes de T009/T010; `tasks.md` não editado pelo agente |
| 2026-09-07 | T010 | concluída | RED: 13 falhas por erro confundido com vazio, toast genérico e controles não bloqueados; GREEN/REFACTOR: 22 testes direcionados, lint e TypeScript aprovados | Cargas distinguem erro/vazio, dados são preservados e mutações bloqueiam ações; `git diff --check` com avisos preexistentes de LF/CRLF; sem bloqueio; `tasks.md` não editado pelo agente |
| 2026-09-07 | T012 | concluída | RED: cenários de falha dos três formulários; GREEN/REFACTOR: 18 testes direcionados, lint, build e suíte consolidada aprovados | `formErrors.ts` centraliza o vínculo seguro de `fieldErrors`; falhas preservam valores e pending; 403/409/rede usam feedback comum sem payload remoto; `tasks.md` não editado pelo agente |
| 2026-09-07 | T013 | concluída | RED/GREEN/REFACTOR: inventário 4/4, E2E novo 1/1, suíte frontend 89 arquivos/387 testes, lint, build, backend 120/120 e E2E completo 167/167 aprovados | Corrigida interferência do teste novo nas credenciais seed e atualizada expectativa E2E legada para o erro sanitizado; bundle/inventário sem sentinelas; pilha E2E sintética encerrada; `tasks.md` editado somente pelo orquestrador |
