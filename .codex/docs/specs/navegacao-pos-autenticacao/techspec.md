# Especificação técnica: Navegação e experiência pós-autenticação

- Status: pronto para decomposição em tarefas
- PRD: `./prd.md`
- Atualizado em: 2026-09-09
- Validação de descoberta: confirmada no PRD
- Validação de design: desnecessária por ausência de alternativa arquitetural material pendente
- Issues relacionadas no PRD: #219, #221, #222, #223

## Resumo técnico

Transformar as homes em entradas operacionais por perfil, tornar os identificadores dos detalhes recuperáveis pela URL e centralizar destinos de retorno explícitos. Corrigir a jornada administrativa de solicitações até o histórico de empréstimo, incluindo contrato vazio, erros contextuais e preservação da sessão. Manter React, React Router, os componentes existentes e o tratamento central de autenticação/erros.

O escopo inclui ajustes pontuais na API .NET 8: restringir a listagem global de empréstimos a administradores e distinguir coleção vazia de recurso inexistente nos históricos utilizados. Não criar módulos de negócio, estatísticas novas ou esquema de banco.

## Estado atual

A análise considera a árvore de trabalho local, inclusive alterações ainda não commitadas de `visibilidade-posicionamento-funcionalidades`. Não pressupõe que essas alterações já estejam em `develop`. Elas devem ser integradas antes desta implementação ou conciliadas sem recriar os componentes removidos.

| Evidência no repositório | Consequência |
|---|---|
| `pages/Home.tsx` já não importa `Carousel`; o arquivo foi removido localmente | Manter a ausência como regressão; ainda faltam atalhos de mentor e mentorado |
| `pages/admin/Home.tsx` já contém cards funcionais e contadores | Reutilizar destinos; falha nas consultas hoje zera todos os contadores e pode ocultar indisponibilidade |
| `integration/Auth.ts` possui `getHomePathForRole` e prioriza troca obrigatória/destino pretendido | Reutilizar a resolução existente, sem forçar home sobre uma retomada válida |
| `pages/admin/LoansRequest.tsx` abre `/admin/history/loan` com `state.id`; `pages/loan/LoanHistory.tsx` chama `getLoansById` com esse estado | Uma URL copiada ou aberta sem estado pode produzir `Emprestimos/undefined`; hipótese sustentada pelo código, sem reprodução de produção nesta etapa |
| `MentoringHistoryAdm`, detalhes de turma, devolução, verificações e outros históricos também leem `location.state?.id` | Migrar os consumidores do inventário para identificadores persistidos na URL |
| `routes.tsx` associa `/mentor/history/mentee` a `LoanCreation` | URL de histórico abre criação; existe histórico coletivo em `/mentor/history/class` |
| `Page404` chama `clearSession` ao montar e seu Voltar aponta para `/` | Fallback de rota encerra sessão; o Login também limpa sessão ao montar |
| `AllLoans`, `LoansRequest`, `RegisteredUsers` e `ViewClass` retornam para `/` em erros; outros usam `navigate(-1)` ou `window.history.back()` | Retorno pode montar Login ou sair do módulo/aplicação |
| `PrivateRoute` envia também uma sessão válida de perfil incorreto ao Login | Acesso negado pode limpar credenciais indiretamente |
| `BaseApi.tsx` normaliza erros e encerra sessão em 401 privado | Preservar esse contrato; 403, 404 e 5xx não significam logout |
| `EmprestimosController` devolve 404 para listas vazias; GET global tem apenas `[Authorize]` | Vazio se confunde com erro e API aceita níveis sem acesso à listagem administrativa |
| `MentoringHistoryAdm` inspeciona `error.response.status`, embora integrações retornem `ApplicationError` | Erro pode ser tratado como vazio; usar o contrato normalizado |

Não foi encontrado `AGENTS.md` na busca do repositório. Foram lidos o PRD integral, o template desta skill, rotas, consumidores, contratos, testes e configurações de qualidade. Não houve execução da aplicação para afirmar causa única da falha relatada nas issues.

## Arquitetura proposta

Adicionar `frontend/src/navigation/profileNavigation.ts` com tipos e funções puras para atalhos por perfil, resolução de rota-pai e construção/leitura de URLs com ID. Reutilizar `getHomePathForRole` de `integration/Auth.ts`; não criar uma segunda regra divergente de entrada. O módulo não lê/remove cookies, não faz requisições e não aceita destino externo informado pelo usuário.

Usar `readSession()` para selecionar perfil nas homes e no fallback. Criar `components/global/BackLink.tsx` para retornos visíveis com semântica de link e destino resolvido. Callbacks de `ErrorFeedback` usam o mesmo resolvedor. O componente recebe contexto de rota e perfil; não decide com base em `history.length`, origem de navegação ou `document.referrer`.

O catálogo não substitui os `requiredRank` do roteador nem a autorização da API. Testes de integração devem montar o roteador real para detectar divergência entre atalhos e permissões. Não é necessário reescrever todos os menus como um novo sistema de roteamento.

## Fluxos e componentes

### Entrada por perfil

Após login, preservar a precedência atual: troca obrigatória de senha, destino pretendido válido, home do perfil. A entrada normal abre `/admin/`, `/mentor/` ou `/mentee/`.

| Perfil | Atalhos da home, em ordem operacional |
|---|---|
| Administrador | Solicitações de cadastro → `/admin/register-request`; solicitações de empréstimo → `/admin/loans-request`; produtos → `/admin/search-material`; usuários → `/admin/users`; histórico de empréstimos → `/admin/all-loans`; alertas de produtos → `/admin/follow-up` |
| Mentor | Minha turma → `/mentor/my-class`; solicitações de cadastro → `/mentor/users-request`; criar empréstimo → `/mentor/loan/creation`; histórico da turma → `/mentor/history/class`; pesquisar material → `/mentor/search-material` |
| Mentorado | Pesquisar material → `/mentee/search-material`; histórico pessoal → `/mentee/history/mentoring`; meu perfil → `/mentee/profile` |

Manter os cards administrativos existentes, sem criar novas consultas para contar atalhos. Os links devem permanecer utilizáveis se contadores falharem; dados indisponíveis não viram contagem zero. Usar `ErrorFeedback` e nova tentativa das leituras, sem apagar resultados bem-sucedidos de consultas independentes. Homes de mentor e mentorado não precisam de consultas extras para renderizar links.

Reutilizar tipografia, cores, foco e componentes visuais existentes. Cards são links com nomes descritivos, ordem de teclado igual à ordem visual e disposição que comporte 375 e 1440 pixels sem rolagem horizontal. Manter busca existente. Perfil desconhecido/`Comum` não recebe atalhos operacionais por fallback.

### URLs recuperáveis

Preservar os caminhos atuais e adotar `?id=<inteiro-positivo>` para detalhes que hoje dependem de `state.id`. Exemplo: `/admin/history/loan?id=42` chama `GET /api/Emprestimos/42`. `/admin/products/:id/history` já usa parâmetro de caminho e permanece assim.

Contrato de leitura: aceitar exatamente um `id` decimal inteiro entre 1 e 2147483647. Rejeitar vazio, duplicado, sinal negativo, fração, notação exponencial, texto e excesso de faixa. Se a query estiver presente, ela prevalece; valor inválido não deve recorrer silenciosamente ao estado. Na ausência da query, aceitar temporariamente um `state.id` válido e normalizar a URL com `replace` antes de carregar. Sem ID válido, mostrar “Selecione um registro para consultar” e Voltar para o pai, sem requisição ou logout.

Atualizar tanto cliques de linha quanto `Link.to` nos produtores: copiar link/abrir em nova aba deve transportar o ID. Não anexar `?id=` globalmente a qualquer destino de tabela; usar o construtor somente para os detalhes do inventário. Preservar outras query strings por `URLSearchParams`, sem duplicar `id`.

| Caminho ou grupo | Identificador | Rota-pai explícita |
|---|---|---|
| `/admin/history/loan` | ID de empréstimo | `/admin/all-loans` |
| `/mentor/history/loan` | ID de empréstimo | `/mentor/history/class` |
| `/mentee/history/loan` | ID de empréstimo | `/mentee/history/mentoring` |
| `/admin/history/mentoring` | ID de usuário | `/admin/users` |
| `/mentor/history/mentoring` | ID de dependente | `/mentor/my-class` |
| `/admin/view-class`, `/admin/view-class-mentor` | ID de usuário responsável | `/admin/users` |
| `/admin/view-history-class-by-id` | ID de responsável pela turma | `/admin/users` |
| `/admin/return` | ID de empréstimo | `/admin/all-loans` |
| `/{admin,mentor,mentee}/verification` | ID de produto | `/{perfil}/search-material` |
| `/admin/products/:id/history` | ID de produto no caminho | `/admin/search-material` |
| `/mentor/my-class/disabled` | Sem parâmetro obrigatório | `/mentor/my-class` |
| `/admin/insert`, `/admin/follow-up` | Sem parâmetro obrigatório | `/admin/search-material` |
| `/admin/register-request` | Sem parâmetro obrigatório | `/admin/users` |
| `/admin/loans-request` | Sem parâmetro obrigatório | `/admin/all-loans` |
| `/mentor/users-request` | Sem parâmetro obrigatório | `/mentor/my-class` |
| `/mentor/loan/creation`, `/mentor/loan/histories`, `/mentor/history/class` | Sem parâmetro obrigatório | `/mentor` |
| `/mentee/history/mentoring` | Identidade da sessão, sem ID arbitrário na URL | `/mentee` |
| Demais telas registradas de primeiro nível de cada perfil | Conforme contrato já existente | Home do próprio perfil |

As chaves entre chaves na tabela representam três caminhos concretos, não uma sintaxe nova do roteador. Pais são listas acessíveis sem estado obrigatório, inclusive quando o usuário chegou por outra lista. Nenhuma rota-pai aponta para o próprio detalhe ou exige recuperar IDs de uma tela anterior.

Inventário de consumidores: `pages/loan/LoanHistory`, `pages/mentee/LoanHistory`, `pages/admin/ReturnLoan`, `pages/admin/MentoringHistoryAdm`, `pages/mentor/MentoringHistory`, `pages/admin/ClassLoan`, `pages/ViewClass`, `pages/ViewClassMentor` e `components/screens/VerificationPage`. Inventário de produtores: `LoansRequest`, `AllLoans`, `ClassLoan`, `MentoringHistoryAdm`, `MentoringHistory`, `HistoryClass`, `HistoryMentoring`, `RegisteredUsers`, `ViewClass`, `ViewClassMentor`, `MyClass`, `Disabled`, `FollowUp`, busca de materiais e os componentes `ItemClickable`, `ItemButtonLink` e `TableItemWithActions` usados por essas telas. Confirmar todos os consumidores antes da edição; o ID semântico deve permanecer o mesmo da chamada existente.

### Retorno e fallback

Substituir todos os callbacks de retorno para `/`, `navigate(-1)` e `window.history.back()` das telas autenticadas identificadas pelo resolvedor. Cobrir também estados vazio, inválido, carregando e erro dos detalhes; o usuário deve poder sair de um detalhe inválido. Preservar os retornos já explícitos das verificações, alinhando-os à tabela.

Remover o efeito de encerramento de sessão de `Page404`. Para uma sessão de perfil conhecido, Voltar leva à home do perfil real, mesmo quando a URL desconhecida usa outro prefixo. Sessão com troca obrigatória leva a `/change-password-required`. Visitante vai a `/`. Para sessão de nível não suportado, apresentar acesso indisponível e Sair explícito, sem usar Voltar para montar Login e apagar credenciais.

Em `PrivateRoute`, sessão ausente continua indo ao Login e troca obrigatória mantém sua precedência. Sessão válida de perfil incorreto mostra acesso negado com retorno à própria home, sem montar a tela proibida ou Login. Reutilizar a mensagem contextual de autorização. O caso de nível não suportado segue o fallback acima.

Trocar `/mentor/history/mentee` por redirecionamento protegido com `replace` para `/mentor/history/class`, que já representa o histórico coletivo dos dependentes. A URL legada não monta `LoanCreation` nem dispara criação. Preservar `/mentor/loan/creation` como única entrada canônica dessa criação. Remover a declaração duplicada de `/admin` sem filhos em `routes.tsx`, mantendo o layout e a rota index protegida.

## Contratos e APIs

O prefixo efetivo continua configurado por `BaseApi`; os caminhos abaixo são relativos a `/api`. Não há novo endpoint de navegação.

| Operação | Sucesso e vazio propostos | Falhas e autorização |
|---|---|---|
| `GET Emprestimos` / `getAllLoans` | `200 EmprestimoDTO[]`, inclusive `[]` | Aplicar política existente `ApenasAdministradores`; sem token 401, perfil autenticado diferente 403 |
| `GET Emprestimos/{emprestimoId}` / `getLoansById` | `200 EmprestimoDTO` | Manter leitura autenticada compartilhada pelos três perfis; ID inexistente 404, nunca convertido em empréstimo vazio |
| `GET Emprestimos/usuario/{userId}` / `getLoansByUserId` | `200 EmprestimoDTO[]`; usuário existente sem empréstimos recebe `[]` | Manter autenticação atual; usuário inexistente 404 |
| `GET Usuarios/{usuarioId}/dependentes/emprestimos` | `200 EmprestimoDTO[]`; responsável existente sem dependentes ou empréstimos recebe `[]` | Manter `ApenasResponsaveis`; usuário inexistente 404 |
| `GET Usuarios/{id}` | DTO discriminado já usado em `contracts/user` | Preservar contrato e autorização atuais; erro não vira usuário sem histórico |
| Aprovar, reprovar, devolver e criar empréstimos | Preservar contratos existentes | Esta entrega não redefine regras de mutação ou concede novas capacidades |

A API de leitura de um empréstimo é compartilhada; não restringi-la a administrador por causa do prefixo da tela administrativa. A paridade exigida inclui bloquear a listagem global administrativa na API, manter as políticas de responsáveis nos atalhos de turma/solicitações e preservar endpoints comuns de consulta. Não inferir uma nova política de propriedade de registros a partir do ID da URL: ele não é prova de autorização. O backend atual tem leituras autenticadas amplas; esta especificação não afirma isolamento por proprietário nem altera essa regra de negócio.

Adicionar `frontend/src/contracts/loan.ts` para o histórico corrigido e as integrações de empréstimos: `id` inteiro, `dataRealizacao` textual, `dataDevolucao`/`dataAprovacao` textuais ou nulas, `status` textual, `produtos` como lista de associações e `solicitante`/`aprovador` conforme `EmprestimoDTO` (usuário ou nulo). Produtos incluem quantidade da associação e produto com lote nullable. Reutilizar os contratos de usuário e verificar `ProdutoEmprestadoDTO`/mapeamento ao construir as amostras, sem exigir campos fictícios. Resposta inválida vira erro de contrato contextual, não estado vazio; não usar cast para mascarar divergência.

Em `LoanHistory`, ID inválido não dispara GET; empréstimo inexistente apresenta mensagem contextual e retorno; `produtos: []` mostra ausência de itens, preservando os metadados do empréstimo. Em `MentoringHistoryAdm`, não converter qualquer exceção em `[]` nem ler propriedades de Axios de um `ApplicationError`. Em falha da coleção, preservar a identificação já carregada e oferecer nova tentativa. Ajustar os consumidores compartilhados de listas para o contrato `200 []`, incluindo homes, históricos de mentor e mentorado; só renderizar vazio após sucesso.

## Dados e migrações

Não há migração, alteração de entidade, backfill ou limpeza de dados. URLs contêm somente identificadores já existentes; não incluir token, email ou nome. `location.state` permanece apenas como compatibilidade temporária de navegação durante a transição. Não adicionar persistência paralela de sessão, dados pessoais ou seleção de registro em `localStorage`.

## Segurança, privacidade e permissões

`readSession` seleciona a experiência; somente a validação JWT e as políticas da API autorizam dados. Não confiar no cookie `level` isolado, no prefixo da URL ou no catálogo para liberar acesso. Testar JWT de cada nível diretamente contra a API, além de testar guardas frontend. Não ampliar atalhos ao nível `Comum`.

Retornos de uma sessão válida nunca chamam `clearSession`. Logout explícito, troca de credenciais e 401 privado continuam com o fluxo central existente. Preservação de sessão não significa ignorar expiração/revogação real. Provar separadamente 403/404/5xx sem logout e 401 com encerramento central e destino pretendido.

URLs de destino vêm de constantes locais. Parâmetros de query não podem fornecer `returnTo`, domínio externo ou prefixo de outro perfil. Usar dados sintéticos nos testes e evitar cookies, tokens e dados pessoais em logs/artefatos.

## Falhas, observabilidade e operação

Reutilizar `ApplicationError`, `reportAppError`, `OPERATION_IDS` e `ErrorFeedback`. Leituras apresentam carregamento, conteúdo, vazio após sucesso e erro com ação pertinente. Rede/timeout/5xx permitem tentar novamente; 403 mostra acesso negado; 404 de detalhe mostra registro não encontrado. Requisições com ID anterior não podem sobrescrever o novo registro após mudança de URL; usar cancelamento ou descarte de resposta obsoleta conforme padrão local.

Não criar serviço de telemetria. Usar identificador de requisição já disponível no erro e os traces/capturas Playwright existentes. Registrar nos testes ausência de chamadas com `undefined`, de requisições a telas proibidas e de limpeza de cookies durante retornos. Nenhum sucesso deve ser exibido se uma leitura falhou.

## Compatibilidade, disponibilização e reversão

Integrar após as alterações de visibilidade, ciclo de credenciais e experiência de erros consideradas na análise. Ajustar `auth/sessionConsumers.test.tsx`, que atualmente exige `clearSession` em `Page404`: retirar essa página do inventário de logout e acrescentar teste comportamental de preservação. Atualizar expectativas de guardas/rotas e de erros vazios sem apagar os testes de logout legítimo.

Os caminhos antigos permanecem; links novos carregam ID na query. Acesso antigo sem ID nem estado mostra orientação e retorno, pois o registro não pode ser reconstruído. O alias de mentor redireciona ao histórico coletivo. A configuração da SPA deve continuar servindo a aplicação em acesso direto; verificar isso no contêiner de produção pelo E2E.

Publicar backend antes do frontend: a API passa a devolver listas vazias com 200 e reforça a política da listagem global; as telas antigas já consomem listas no sucesso. A mudança 404 → 200 para vazio é alteração observável de contrato e deve constar na futura contribuição. Compatibilidade com consumidores externos não foi comprovada pelos arquivos locais.

Reversão preferencial: corrigir adiante; em regressão operacional, republicar o frontend anterior e manter o backend compatível com listas vazias. Reverter a restrição administrativa reabre a lacuna identificada; não usar essa reversão como procedimento automático. Nenhuma restauração de banco é necessária. Esta etapa não executa publicação.

## Estratégia TDD e pirâmide de testes

Infraestrutura existente: Vitest, Testing Library, MSW, Playwright e xUnit com testes de integração PostgreSQL. Não instalar novo executor. Nomes de arquivos novos abaixo são propostas para as tarefas, não evidências de execução.

### RED

1. Criar `navigation/profileNavigation.test.ts` com destinos esperados do contrato, IDs inválidos, precedência query/estado e perfis desconhecidos. Estender `pages/Home.test.tsx` e `pages/admin/Home.test.tsx` para exercer os atalhos, inclusive falha dos contadores; não testar somente igualdade de arrays internos.
2. Criar `pages/Page404.test.tsx` e ampliar `routes.test.tsx`: montar sessão real sintética, abrir URL inválida/perfil proibido, acionar Voltar e verificar destino e cookies. Mostrar a falha atual por limpeza de sessão ou montagem do Login. Cobrir troca obrigatória e alias de mentor.
3. Em `pages/loan/LoanHistory.errors.test.tsx` e novo teste de navegação, entrar por URL sem estado, confirmar chamada com ID correto, ausência de chamada para ID inválido, 404 contextual, lista de itens vazia e retorno para o pai. Testar query em conflito com estado e mudança de ID com resposta atrasada.
4. Estender `integration/Loans.errors.test.ts` e criar testes de contrato da integração usando MSW: formato real, nullable, lista vazia, resposta inválida, 403/404/5xx e 401. Criar testes de erro de `MentoringHistoryAdm` que falhem quando indisponibilidade é apresentada como vazio.
5. Criar `backend/Tests/Integration/PostAuthenticationNavigationTests.cs`: testar HTTP real pela fábrica existente, JWT e PostgreSQL. Primeiro demonstrar GET global aceitando perfil inadequado e retornando 404 para coleção vazia; testar também usuário/responsável existente sem empréstimos, inexistente e detalhe inexistente. Autenticação não deve ser substituída por mock que ignore políticas.
6. Criar `e2e/post-auth-navigation.spec.ts`: login dos três perfis, navegação pelos atalhos, solicitações administrativas → detalhe, copiar URL em página nova, refresh e Voltar; executar em 375 e 1440 pixels. Cobrir erro, vazio, URL inválida, rota de outro perfil e alias de mentor. Verificar autenticação por operação subsequente válida, além de cookies.

### GREEN

Implementar o resolvedor, atalhos e retornos mínimos; atualizar URLs nos produtores e leitura nos detalhes, aplicar os contratos de vazio e a política administrativa na API e remover encerramento indireto por fallback/acesso negado. Adicionar os estados contextuais necessários. Não criar novos módulos ou reescrever autenticação. Executar as suítes focadas após cada alteração.

Separar cenários Playwright com respostas controladas (falhas determinísticas e matriz de retornos) dos cenários com backend real (login, autorização e histórico administrativo com registro sintético). Reutilizar `e2e/responsive-support.ts` para os primeiros e a infraestrutura sintética existente para os segundos. Se faltar dado de empréstimo para o administrador, ampliar a preparação de dados exclusiva de teste; não criar endpoint público de semeadura nem usar interceptação como prova de integração real.

### REFACTOR

Eliminar regras repetidas de retorno, `state.id` obrigatório e tipos duplicados dos históricos alterados. Alinhar retornos visíveis e de erro, sem trocar o roteador por mocks nos testes de integração. Manter as suítes de responsividade, credenciais e visibilidade. Registrar nos futuros `tasks.md`/relatórios a falha inicial com causa, implementação que passou e execução após refatoração. Esta especificação não fabrica evidência RED/GREEN.

## Esteira de qualidade

A linha de base histórica da skill mudou: `backend/backend.sln` inclui `Tests/Tests.csproj`; frontend possui scripts de testes; `.github/workflows/container-ci.yml` roda antes do merge em PR para `develop`, eventos `opened`, `synchronize`, `reopened`, além de `workflow_dispatch`. Os trabalhos `Frontend quality`, `Backend quality` e `Authentication E2E` já executam as áreas necessárias; o último roda toda a suíte Playwright, apesar do nome.

Auditoria documental dos comandos e gatilhos realizada nesta etapa; testes/build não foram executados. Comandos abaixo devem ser executados na implementação, na raiz salvo indicação de diretório.

| Área | Comando local | Verificação de CI | Lacuna/ação |
|---|---|---|---|
| Dependências frontend | Em `frontend`: `npm ci` | Qualidade frontend e E2E | Manter lockfile existente |
| Testes frontend | Em `frontend`: `npm run test -- --run` | `frontend-quality` | Incluir novos testes de navegação e contrato |
| Lint | Em `frontend`: `npm run lint` | `frontend-quality` | Já exige zero avisos |
| Tipos e compilação | Em `frontend`: `npm run build` | `frontend-quality` | `tsc -b && vite build` |
| Backend | `dotnet restore backend/backend.sln` | `backend-quality` | Infraestrutura existente |
| Compilação backend | `dotnet build backend/backend.sln --no-restore -c Release --nologo --disable-build-servers` | `backend-quality` | Incluir novos testes no projeto existente |
| Testes backend | `dotnet test backend/backend.sln --no-build --no-restore -c Release --nologo --disable-build-servers` | `backend-quality` | Docker necessário para PostgreSQL; não omitir integração |
| Descoberta E2E | Em `frontend`: `npm run test:e2e:list` | Suíte integral no trabalho E2E | Confirmar descoberta de `post-auth-navigation.spec.ts` |
| Navegador | Em `frontend`: `npx --no-install playwright install --with-deps chromium` | `auth-e2e` | Versão do lockfile |
| Pilha E2E | `docker compose -f docker-compose-e2e.yml up -d --build --wait` | `auth-e2e` | Usa frontend compilado; porta padrão 4173 |
| E2E focado | Em `frontend`: `npm run test:e2e -- e2e/post-auth-navigation.spec.ts` | Incluído na suíte integral | Arquivo a criar |
| Regressão E2E | Em `frontend`: `npm run test:e2e` | `auth-e2e` | Preservar credenciais, erros, responsividade e visibilidade |
| Encerramento local | `docker compose -f docker-compose-e2e.yml down` | Limpeza própria do trabalho E2E | Não exige remoção de volumes locais |

Não é necessário implantar infraestrutura ou workflow adicional. Se Docker estiver indisponível localmente, registrar a limitação e exigir a execução integral na CI antes da integração. O YAML comprova execução pré-merge, não proteção obrigatória de branch; conferir os três trabalhos como verificações requeridas na futura contribuição. Pipeline de release não substitui esse gate.

## Matriz de rastreabilidade

| Requisito | Componentes | Testes | Evidência esperada |
|---|---|---|---|
| RF-001 | Catálogo, homes, roteador e `PrivateRoute` | Unitário, componente, rotas, E2E por perfil | Atalhos funcionais e autorizados, sem carrossel |
| RF-002 | `LoansRequest`, `LoanHistory`, `MentoringHistoryAdm`, integrações, contratos e controladores | MSW, componente, contrato HTTP real e E2E administrativo | ID correto, dados/vazio contextual e sessão preservada |
| RF-003 | Resolvedor, `BackLink`, callbacks de erro e `Page404` | Matriz de retornos e E2E | Pai explícito em cada retorno, sem limpar credenciais |
| RNF-001 | `readSession`, `PrivateRoute`, políticas da API | Rotas negativas e xUnit HTTP com níveis distintos | Tela proibida não monta; API administrativa devolve 403 para outros níveis |
| RNF-002 | Query de ID, links, alias legado e resolvedor | Unitário, integração de rotas e Playwright | Link direto, nova aba, refresh e retorno independentes do histórico |
| CA-001 | Homes dos três perfis e links | Home, rotas e E2E no build | Apenas ações operacionais, clique chega ao módulo permitido |
| CA-002 | Lista administrativa → detalhe e histórico por usuário | Contrato HTTP, MSW e E2E real | Dados ou vazio válido, erros distinguíveis, operação autenticada posterior funciona |
| CA-003 | Todos os retornos autenticados do inventário | Componente e E2E com acesso direto/interno | URL final igual ao pai definido e credenciais intactas |

Complementar os testes com busca de `navigate(-1)`, `window.history.back`, `onNavigate`, `Voltar`, `ArrowLeft`, `state?.id` e `clearSession` no código de produção. Ocorrências em testes e encerramentos legítimos de sessão são esperados; a busca é inventário, não substitui prova comportamental.

## Alternativas e decisões

| Decisão | Alternativas | Recomendação | Escolha confirmada | Consequências |
|---|---|---|---|---|
| Home e retorno | Carrossel/histórico do navegador ou ações/rotas-pai | Ações por perfil e pais explícitos | Confirmada no PRD | Não reabrir decisões de descoberta |
| ID recuperável | Apenas estado, novos caminhos dinâmicos ou query | Query nas rotas atuais e compatibilidade com estado | Decisão técnica desta especificação | Preserva caminhos e permite compartilhar URLs |
| Regra de retorno | Inferir origem ou declarar pai | Mapa pequeno com pais estáveis | Derivada de RF-003 | Uma tela tem o mesmo pai independentemente da lista de origem |
| Histórico legado de mentor | Manter criação, nova tela ou alias | Alias ao histórico coletivo existente | Decisão técnica baseada nas rotas/consumidores | Corrige sem inventar módulo |
| Vazio da API | Inspecionar texto de 404 ou `200 []` | Lista vazia em sucesso, recurso ausente em 404 | Decisão técnica de contrato | Backend primeiro; atualizar testes dos consumidores |
| Autorização global | Somente ocultação ou política na API | `ApenasAdministradores` na listagem global | Derivada de RNF-001 e usos administrativos atuais | 403 para perfis não administrativos |
| Testes | Nova infraestrutura ou extensão da atual | Estender Vitest/MSW, xUnit e Playwright | Evidência dos manifestos e CI | Sem novo executor ou workflow |

Decisões técnicas não representam nova confirmação expressa do usuário. Não restou alternativa arquitetural material que exija sessão separada de validação: são ajustes locais sobre contratos, perfis e destinos já existentes.

## Riscos e mitigação

- Sobreposição com alterações locais: usar a home sem carrossel e os testes de visibilidade como base; não sobrescrever trabalho existente.
- Corrigir só o clique e deixar `href` sem ID: exercitar nova aba e URL copiada nos links de tabelas e solicitação.
- Logout indireto: testar o destino efetivamente montado, inclusive guardas e 404, além de espiar `clearSession`.
- Confundir autenticação com autorização: preservar 401 central, exigir 403 na listagem global e testar diretamente a API.
- Contratos duplicados/nullable: amostras geradas pelo backend e validação de resposta devem acompanhar os testes visuais.
- Regressão do vazio em telas compartilhadas: cobrir os três endpoints de lista alterados e seus consumidores, sem converter recurso inexistente em sucesso.
- Julgar o histórico corrigido somente com mocks: manter cenário administrativo contra a API e banco sintéticos reais.
- Validação de propriedade de registros: as regras atuais de leitura são mais amplas que as restrições visuais; esta entrega não introduz um modelo de propriedade. Não alegar segurança por ocultação ou por IDs persistidos na URL.

## Perguntas abertas

Nenhuma bloqueante para decomposição. A obrigatoriedade dos trabalhos na proteção da branch e eventuais consumidores externos dos códigos HTTP precisam ser conferidos na preparação da disponibilização. A análise foi local e documental; não atesta testes aprovados, reprodução em produção, aprovação remota das issues ou publicação.
