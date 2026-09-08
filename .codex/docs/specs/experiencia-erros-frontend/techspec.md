# Especificação técnica: Experiência de erros no frontend

- Status: pronto
- PRD: `./prd.md`
- Atualizado em: 2026-09-07
- Validação de design: desnecessária

## Resumo técnico

A mudança introduz uma fronteira única de normalização no cliente Axios, um contrato `ApplicationError` independente do formato heterogêneo das APIs, um catálogo de apresentação por operação e componentes acessíveis para feedback inline, toast e erros de campo. O interceptor continuará responsável apenas pelo efeito global de sessão expirada; páginas e integrações receberão sempre o erro normalizado e decidirão como apresentá-lo no contexto da operação.

O fluxo de 401 guardará temporariamente a rota interna pretendida, limpará somente os dados de autenticação e substituirá a localização pela tela de login. Depois de uma autenticação válida, a rota só será consumida se pertencer ao perfil autenticado; caso contrário, será usado o início padrão do perfil. Respostas 403 nunca limpam a sessão nem redirecionam.

Não há mudança de API, banco ou backend. A compatibilidade com respostas legadas será feita no normalizador, sem exibir texto arbitrário recebido do servidor. A infraestrutura Vitest e Playwright já existe; será adicionado MSW para testes de integração HTTP no frontend e os cenários entrarão nos gates pré-merge existentes.

## Estado atual

- `frontend/src/services/BaseApi.tsx` cria uma instância Axios e trata somente 401. Fora do login, limpa a sessão, dispara um toast e atribui `/` a `window.location.href`; a rota atual não é preservada e o toast pode se perder no recarregamento.
- `frontend/src/auth/session.ts` centraliza criação, leitura e limpeza dos cookies `doorKey`, `rankID` e `level`. Preferências em cookies e storages não são apagadas.
- `frontend/src/integration/*.ts` propaga erros Axios ou `Error` sem um contrato comum. Há tratamentos locais de 404 e logs de desenvolvimento inconsistentes.
- As APIs retornam formatos mistos: texto simples, `{ message }`, `{ Message }`, `ModelState`, `ProblemDetails` e `ValidationProblemDetails`. Alguns controladores ainda interpolam `Exception.Message`; portanto, conteúdo remoto não pode ser considerado seguro para apresentação.
- `Login.tsx`, `CreateAccount.tsx` e `ResetPassword.tsx` têm classificações parciais próprias. Telas como `RegistrationRequests.tsx`, `admin/LoansRequest.tsx`, `loan/LoanHistory.tsx`, `admin/ReturnLoan.tsx`, `admin/AllLoans.tsx`, `RegisteredUsers.tsx`, `ViewClass.tsx` e `products/ProductHistory.tsx` ainda exibem mensagens genéricas ou confundem falha com estado vazio.
- O feedback transitório usa Radix Toast por meio de `use-toast.ts`; campos `Text` e `Password` já ligam mensagem, `aria-invalid` e `aria-describedby`.
- `frontend/package.json` possui `test`, `test:e2e`, `lint` e `build`, com Vitest, Testing Library e Playwright. MSW não está instalado.
- `.github/workflows/container-ci.yml` roda testes, lint e build do frontend, testes do backend e E2E em Pull Requests abertos, sincronizados ou reabertos contra `develop`. `.github/workflows/security-dependencies.yml` também executa testes, lint e build quando manifestos de dependência mudam.
- Ao contrário da linha de base histórica, `backend/backend.sln` já inclui `backend/Tests/Tests.csproj`.

## Arquitetura proposta

### Camadas e responsabilidades

1. `frontend/src/errors/applicationError.ts` define categorias, campos e o type guard do erro da aplicação.
2. `frontend/src/errors/normalizeError.ts` converte qualquer rejeição em `ApplicationError`, usando somente metadados conhecidos e sanitizados.
3. `frontend/src/errors/errorCatalog.ts` contém mensagens seguras e estáveis por categoria, códigos de validação reconhecidos e contexto por `OperationId`.
4. `frontend/src/errors/presentError.ts` combina erro normalizado e operação em `ErrorPresentation`; também oferece o adaptador `notifyError` para o toast existente.
5. `frontend/src/components/global/ErrorFeedback.tsx` renderiza o mesmo contrato de apresentação de forma persistente nas telas de carga, distinguindo erro de coleção vazia.
6. `frontend/src/auth/intendedRoute.ts` salva, valida, consome e descarta a rota pretendida.
7. `frontend/src/services/BaseApi.tsx` normaliza toda rejeição. Para 401 fora do login, executa uma única vez o fluxo de expiração; para as demais categorias apenas rejeita `ApplicationError`.
8. Integrações deixam de inspecionar formas Axios. Páginas usam `presentError`/`notifyError`, enviam `fieldErrors` ao React Hook Form quando aplicável e mantêm o estado anterior após falha de mutação.

### Contrato interno de erro

```ts
export type ErrorCategory =
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'not_found'
  | 'conflict'
  | 'network'
  | 'timeout'
  | 'server'
  | 'unknown';

export type ApplicationError = Readonly<{
  name: 'ApplicationError';
  category: ErrorCategory;
  message: string;
  status?: number;
  code?: string;
  requestId?: string;
  fieldErrors?: Readonly<Record<string, readonly string[]>>;
  retryable: boolean;
}>;
```

- `message` é sempre escolhida no catálogo local; nunca copia `response.data`, `Error.message`, stack, URL, headers ou configuração Axios.
- `status` só existe para resposta HTTP.
- `code` só é mantido se for string conhecida no catálogo. Código desconhecido não aparece na UI.
- `requestId` aceita, nessa ordem, `response.data.traceId`, `x-correlation-id` ou `x-request-id`, limitado a 128 caracteres e ao conjunto `[A-Za-z0-9._:-]`.
- `fieldErrors` usa apenas nomes de campo esperados e mensagens locais. Em `ValidationProblemDetails`, um código conhecido presente no vetor é traduzido; campo/código legado sem correspondência recebe `Verifique este campo.`. Valores remotos livres não são exibidos.
- `retryable` é verdadeiro para `network`, `timeout` e `server`; é falso para as demais categorias.
- O objeto original não é armazenado no contrato, reduzindo o risco de log ou renderização acidental de credenciais e payloads.

### Classificação determinística

| Entrada | Categoria | Mensagem-base segura | Próximo passo-base |
|---|---|---|---|
| HTTP 400 ou 422 | `validation` | Os dados informados precisam de revisão. | Corrigir os campos indicados e reenviar. |
| HTTP 401 | `authentication` | Sua sessão expirou ou não é válida. | Entrar novamente. |
| HTTP 403 | `authorization` | Você não tem permissão para esta ação. | Manter a sessão e voltar ou solicitar acesso. |
| HTTP 404 | `not_found` | O recurso solicitado não foi encontrado. | Conferir o contexto ou voltar. |
| HTTP 409 | `conflict` | O conteúdo foi alterado ou já processado. | Atualizar os dados antes de tentar novamente. |
| HTTP 500–599 | `server` | O serviço não conseguiu concluir a operação. | Tentar novamente mais tarde. |
| Axios `ECONNABORTED`/`ETIMEDOUT` | `timeout` | O serviço demorou mais que o esperado. | Tentar novamente. |
| Axios sem `response` | `network` | Não foi possível conectar ao serviço. | Conferir a conexão e tentar novamente. |
| Demais rejeições/status | `unknown` | Não foi possível concluir a operação. | Tentar novamente; acionar suporte se persistir. |

O normalizador é idempotente: receber um `ApplicationError` retorna o mesmo objeto. Isso permite que integrações capturem e relancem sem perder categoria ou identificador.

## Fluxos e componentes

### Falha comum de consulta

1. A integração chama `api` e recebe uma rejeição já normalizada.
2. A página guarda `ApplicationError` separado de `data` e `isLoading`.
3. Ao terminar a carga, renderiza `ErrorFeedback` quando há erro; coleção vazia só é mostrada após resposta bem-sucedida vazia.
4. O título inclui a operação, por exemplo `Não foi possível carregar os usuários`; a descrição e ação vêm da categoria.
5. Para categorias repetíveis, o componente oferece botão `Tentar novamente` ligado à mesma função de consulta. Para 403/404, oferece navegação segura pertinente à tela.

### Falha comum de mutação

1. A página mantém o dado atual e o controle acionado desabilitado apenas enquanto a promessa está pendente.
2. Em falha, `notifyError(error, operationId)` produz título, descrição, ação sugerida e referência opcional.
3. Em 400/422, a página aplica `fieldErrors` reconhecidos por `setError`; o resumo global continua anunciado para que o usuário saiba que há campos a corrigir.
4. Em 409, a página não assume sucesso e oferece atualizar/recarregar o estado antes de repetir.
5. Em 403, a sessão e a tela permanecem intactas.

### Sessão expirada e retorno seguro

1. Antes da requisição privada, a aplicação está em uma rota `pathname + search + hash` interna.
2. No primeiro 401 fora de `/`, o interceptor valida e grava essa rota em `sessionStorage['auth:intended-route']`, grava `session-expired` em `sessionStorage['auth:notice']`, limpa a sessão e chama `window.location.replace('/')`.
3. Um bloqueio em memória impede vários redirecionamentos em uma rajada de 401. Falha de acesso a `sessionStorage` não impede limpeza e redirecionamento.
4. `Login.tsx` consome `auth:notice` uma vez e anuncia `Sessão expirada` pelo feedback comum. Uma tentativa de login com 401 é somente falha de autenticação, sem novo redirecionamento.
5. Após `startSession`, `authenticate` consome a rota pretendida somente quando ela atende a todas as regras: começa com `/`, é interpretada contra a origem atual, preserva a mesma origem, não começa com `//`, não aponta para login/recuperação/cadastro/troca obrigatória, e seu prefixo corresponde ao perfil (`/admin`, `/mentor` ou `/mentee`).
6. Rota ausente, inválida ou de outro perfil é descartada e leva ao `getHomePathForRole` existente.
7. Se a conta exigir troca de senha, a rota permanece armazenada durante `/change-password-required`; após troca bem-sucedida e nova autenticação, aplica-se a mesma validação. Logout explícito descarta rota e aviso, impedindo retorno inesperado.

### Componente acessível comum

`ErrorPresentation` terá `title`, `description`, `suggestedAction`, `requestId?`, `fieldErrors?` e `retryable`. `ErrorFeedback` usará `role="alert"` e `aria-live="assertive"` para falhas que bloqueiam a tarefa; o toast mantém o live region do Radix e recebe `variant="destructive"`. O botão de repetição tem rótulo visível, foco por teclado e não depende apenas de cor ou ícone. A referência é exibida como `Código de referência: ...`, sem dados técnicos adicionais.

### Inventário inicial de migração

- Consultas/estados persistentes: `admin/AllLoans.tsx`, `RegisteredUsers.tsx`, `ViewClass.tsx` e `products/ProductHistory.tsx`.
- Mutações: `RegistrationRequests.tsx`, `admin/LoansRequest.tsx`, `loan/LoanHistory.tsx`, `admin/ReturnLoan.tsx`, `CreateAccount.tsx` e os três formulários em `components/global/forms/create/`.
- Autenticação: `Login.tsx`, `Auth.ts`, `BaseApi.tsx` e `ChangePassword.tsx` no encadeamento da rota pretendida.
- Todas as integrações em `frontend/src/integration/` passam a propagar `ApplicationError`; tratamentos em que 404 significa coleção vazia devem declarar essa semântica no adaptador da operação, em vez de inspecionar Axios nas páginas.
- Uma busca automatizada impedirá a reintrodução das expressões `Erro durante requisição`, `<div>Error</div>` e fallbacks equivalentes nos arquivos migrados.

## Contratos e APIs

Não haverá mudança nos endpoints ou corpos de sucesso. O cliente aceita transitoriamente os formatos de erro abaixo:

```ts
type LegacyErrorBody =
  | string
  | { message?: unknown; Message?: unknown }
  | Record<string, unknown>;

type ProblemDetailsBody = {
  type?: unknown;
  title?: unknown;
  status?: unknown;
  detail?: unknown;
  code?: unknown;
  traceId?: unknown;
  errors?: Record<string, unknown>;
};
```

O parsing é tolerante e sem coerção perigosa. Status HTTP define a categoria, mesmo que o corpo alegue outro status. `title`, `detail`, `message` e `Message` não entram na apresentação. Apenas `code`, `traceId` e chaves/valores estruturados de `errors` passam por allowlists locais.

O contrato preferencial para evolução futura do backend é `application/problem+json`, com `status`, `code`, `traceId` e `errors: Record<string, string[]>`; adotá-lo em todos os endpoints é compatível, mas está fora desta entrega.

## Dados e migrações

Não há banco, schema, cache persistente nem migração de dados. São usados dois valores efêmeros por aba:

| Chave de `sessionStorage` | Conteúdo | Ciclo de vida |
|---|---|---|
| `auth:intended-route` | Rota interna sanitizada, máximo de 2.048 caracteres | Criada no 401; consumida após login válido; removida em logout, consumo ou validação negativa. |
| `auth:notice` | Enum local `session-expired` | Criada no 401; consumida uma vez no login; removida em logout. |

`sessionStorage` foi escolhido porque não atravessa abas nem reinícios do navegador e já é compatível com navegação por recarregamento. Nenhum token, corpo de requisição ou resposta é armazenado.

## Segurança, privacidade e permissões

- O normalizador não renderiza nem registra dados remotos livres, stacks, token, senha, `Authorization`, configuração Axios ou payload da requisição.
- Em desenvolvimento, `reportAppError` pode usar `console.debug` somente com `{ category, status, code, requestId, operation }`. Em produção, é no-op enquanto não houver plataforma aprovada de observabilidade.
- `requestId` é sanitizado e limitado antes de apresentação ou log.
- A rota pretendida é validada na gravação e novamente no consumo. URLs absolutas, protocol-relative, de outra origem, rotas públicas de autenticação e prefixos de outro perfil são descartados.
- A validação por perfil no retorno melhora a navegação, mas não substitui `PrivateRoute` nem a autorização do backend.
- 401 limpa os cookies de autenticação pelo `clearSession`; 403 não altera cookies, storages nem navegação.
- Rajadas de 401 produzem uma única transição. Logout explícito não preserva a rota privada anterior.

## Falhas, observabilidade e operação

- Erro do próprio normalizador cai em `unknown` com mensagem local, sem impedir a rejeição da promessa.
- Indisponibilidade de `sessionStorage` degrada para login sem retomada de rota.
- Referência ausente não muda a mensagem; referência inválida é descartada.
- Falha de repetição atualiza o mesmo feedback, sem empilhar toasts; `TOAST_LIMIT = 1` permanece.
- Não será adicionada telemetria externa. Diagnóstico local e de CI usa categoria/status/código/referência sanitizados, resultados Vitest e artefatos Playwright existentes.
- Testes verificam explicitamente que segredos sintéticos, stack e mensagens arbitrárias do servidor não aparecem no DOM nem em logs permitidos.

## Compatibilidade, disponibilização e reversão

- A alteração é compatível com endpoints atuais porque status e falha de transporte bastam para classificar; formatos estruturados apenas enriquecem código, campos e referência.
- A disponibilização pode ocorrer em uma entrega única, mas a implementação deve manter commits/tarefas em ordem: fundação, sessão, componentes, migração de consultas, migração de mutações e E2E.
- Durante a migração, `normalizeError` aceita erros já normalizados e páginas ainda não migradas continuam recebendo uma rejeição capturável. Não se manterá dupla apresentação global/local para status diferentes de 401.
- Reversão consiste em retirar o interceptor de normalização e restaurar os consumidores migrados; não há rollback de dados. As chaves desconhecidas em `sessionStorage` são inofensivas e podem ser removidas na inicialização/logout.
- O gate de aceitação exige que todo o inventário inicial esteja migrado; não se considera concluído apenas por criar a infraestrutura comum.

## Estratégia TDD e pirâmide de testes

### RED

1. Criar testes unitários parametrizados para todas as categorias, formatos legados, `ProblemDetails`, timeout, rede, erro desconhecido, idempotência e sanitização. Eles falham porque `ApplicationError` e `normalizeError` não existem.
2. Criar testes de `intendedRoute` para mesma origem, `//evil`, URL externa, rota pública, rota de outro perfil, query/hash, limite e consumo único. Eles falham antes dos helpers.
3. Atualizar o teste do interceptor para exigir erro normalizado, 401 com `replace`, preservação/limpeza, deduplicação e 403 sem efeito. O comportamento atual falha nesses casos.
4. Criar testes do `ErrorFeedback` e `notifyError` para live region, ação, referência, retry e ausência de conteúdo sensível.
5. Instalar MSW e escrever testes de integração de uma consulta, uma mutação com `ValidationProblemDetails`, 401 e 403. Eles falham antes do servidor de teste e da migração.
6. Criar testes das páginas inventariadas que diferenciam carregando, vazio e falha e proíbem as mensagens genéricas.
7. Criar E2E para sessão expirada, retomada segura e 403. Os cenários falham com o redirecionamento atual.

### GREEN

1. Implementar o menor contrato e normalizador que satisfaçam a tabela de classificação e as regras de sanitização.
2. Implementar armazenamento/validação da rota e o efeito único de 401 no interceptor; adaptar login, autenticação, troca obrigatória e logout.
3. Implementar catálogo, apresentação, `ErrorFeedback` e adaptador de toast.
4. Migrar consumidores por operação, preservando estados de sucesso e conectando `fieldErrors` via `setError`.
5. Configurar MSW somente para Vitest e completar os cenários HTTP e E2E.

### REFACTOR

1. Remover classificações Axios duplicadas, casts de `response.status`, logs do erro bruto e strings genéricas dos arquivos migrados.
2. Consolidar catálogo e `OperationId` sem abstrair regras específicas de domínio para dentro do normalizador.
3. Extrair fixtures/builders de erro e handlers MSW compartilhados; manter testes por comportamento, não por detalhes de implementação.
4. Rodar a esteira completa após cada grupo e confirmar que o bundle de produção não contém mensagens técnicas proibidas.

### Pirâmide e cobertura de risco

- Unitários, maioria: normalização, catálogo, sanitização, rota pretendida e reducer/adaptadores.
- Componentes/integração, camada intermediária: acessibilidade, React Hook Form, interceptor + MSW e estados das páginas.
- E2E, poucos fluxos críticos: 401 com retorno, 401 com rota rejeitada e 403 sem logout.
- Não são necessários testes backend para implementar a mudança, mas o gate completo existente continua obrigatório para detectar regressão cruzada.

## Esteira de qualidade

| Área | Comando local | Verificação de CI | Lacuna/ação |
|---|---|---|---|
| Unitário/componente frontend | `cd frontend && npm run test -- --run` | `container-ci.yml` e, quando dependências mudam, `security-dependencies.yml` | Já existe e passou em 2026-09-07: 56 arquivos, 204 testes. Adicionar casos desta especificação. |
| Integração HTTP frontend | `cd frontend && npm run test -- --run` | Mesmos jobs de frontend | Adicionar `msw` como devDependency, setup de ciclo de vida e handlers de teste; hoje ausente. |
| Lint frontend | `cd frontend && npm run lint` | `container-ci.yml` e `security-dependencies.yml` | Já existe e passou em 2026-09-07. |
| Compilação/bundle | `cd frontend && npm run build` | `container-ci.yml` e `security-dependencies.yml` | Já existe e passou em 2026-09-07, com avisos não bloqueantes preexistentes de bundle grande, browserslist e asset. |
| Catálogo E2E | `cd frontend && npm run test:e2e:list` | Não aplicável isoladamente | Já existe e listou 166 testes; adicionar os novos cenários ao catálogo. |
| E2E real | `docker compose -f docker-compose-e2e.yml up -d --build --wait`; depois `cd frontend && npm run test:e2e`; por fim `docker compose -f docker-compose-e2e.yml down --volumes --remove-orphans` | Job `auth-e2e` de `container-ci.yml`, em PR para `develop` | Estender a pilha/teste com respostas determinísticas 401/403 sem fragilizar o ciclo de credenciais. |
| Backend completo | `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers` | Job `backend-quality` de `container-ci.yml` e job NuGet de `security-dependencies.yml` | Solução já inclui `Tests.csproj`; manter como regressão, sem alteração backend planejada. |
| Gate pré-merge | Abrir/atualizar PR contra `develop` | `pull_request` em `container-ci.yml`; gate de dependências por paths em `security-dependencies.yml` | Confirmado como pré-merge. Configuração de branch protection é externa ao repositório e deve exigir os checks. |

## Matriz de rastreabilidade

| Requisito | Componentes | Testes | Evidência |
|---|---|---|---|
| RF-001 | `applicationError.ts`, `normalizeError.ts`, interceptor Axios | Unitários parametrizados e integração MSW | Toda rejeição resulta em categoria, mensagem local e referência sanitizada quando disponível. |
| RF-002 | `errorCatalog.ts`, `presentError.ts`, `ErrorFeedback.tsx`, formulários/páginas migrados | Unitários do catálogo, Testing Library e MSW | Operação + categoria produzem contexto/próximo passo; validações reconhecidas chegam ao campo. |
| RF-003 | `BaseApi.tsx`, `intendedRoute.ts`, `Auth.ts`, `Login.tsx`, logout/troca de senha | Unitários do interceptor/rota e Playwright 401/403 | 401 limpa e retoma rota válida; 403 mantém sessão e contexto. |
| RNF-001 | Normalizador, allowlists, `reportAppError`, validação de rota | Testes com token, senha, stack e payload sentinela | Sentinelas não aparecem no DOM/log; somente referência sanitizada pode aparecer. |
| RNF-002 | `ErrorFeedback`, Radix Toast, integração React Hook Form | Testing Library com roles, live region, foco/associação de campo | Feedback anunciado e campo associado por `aria-describedby`; vocabulário vem de catálogo único. |
| CA-001 | Normalizador + catálogo + páginas inventariadas | Tabela 400/403/404/409/500/rede em Vitest/MSW | Cada cenário mostra operação e ação sem texto remoto sensível. |
| CA-002 | Interceptor + sessão + rota pretendida + autenticação | Vitest e Playwright em rota privada com 401 | Cookies removidos, login aberto por `replace`, retorno permitido após autenticar. |
| CA-003 | Interceptor + apresentador da operação | Vitest/MSW e Playwright 403 | Cookies permanecem, URL não muda e aviso de permissão é anunciado. |
| CA-004 | Componente comum + inputs | Testing Library | `role="alert"`/live region e `aria-invalid`/`aria-describedby` observáveis. |

## Alternativas e decisões

| Decisão | Alternativas | Recomendação | Escolha confirmada | Consequências |
|---|---|---|---|---|
| Fronteira de normalização | Cada página classifica; wrapper por chamada; interceptor Axios | Interceptor normaliza e páginas contextualizam | Derivada do PRD e padrões existentes; validação separada desnecessária | Uma taxonomia global sem retirar semântica da operação. |
| Texto remoto | Exibir `message/detail`; sanitizar texto livre; catálogo local | Catálogo/allowlist local | Derivada de RNF-001 | Compatível e seguro, mas novos códigos exigem entrada explícita no catálogo. |
| Retomada de rota | Query string; `localStorage`; estado do router; `sessionStorage` | `sessionStorage` com validação por origem e perfil | Derivada da suposição confirmada no PRD | Sobrevive ao reload, fica por aba e não expõe caminho na URL; requer fallback quando storage falha. |
| Feedback | Apenas toast; apenas inline; contrato comum com dois adaptadores | Inline para carga, toast para mutação, mesmo contrato | Derivada dos fluxos atuais | Erros bloqueantes persistem e mutações continuam leves, com vocabulário consistente. |
| Mock HTTP | Mock direto do Axios; MSW | MSW no Vitest | Definida pelo PRD | Testa a fronteira HTTP de modo próximo ao uso real; adiciona uma devDependency. |

Não restou alternativa com impacto material de produto, dados, segurança ou arquitetura que exija `$grill-me`; as escolhas acima são a menor evolução coerente com decisões já confirmadas.

## Riscos e mitigação

- **Classificar 401 do login como sessão expirada:** excluir a rota/endpoint de autenticação do efeito global e cobrir com teste.
- **Loop ou open redirect:** validar na gravação e consumo, usar allowlist de prefixo por perfil e fallback para home.
- **Rajada de 401 sobrescrever rota/aviso:** bloqueio em memória e política de primeira rota válida.
- **Texto sensível chegar por formato legado:** ignorar mensagens livres; testar com sentinelas em cada forma suportada.
- **404 hoje usado como vazio:** declarar por operação quando 404 representa coleção vazia; outros 404 viram `not_found` visível.
- **Página apagar dado após mutação falhar:** testes exigem preservação do estado anterior e atualização somente após sucesso confirmado.
- **Toast desaparecer no reload:** armazenar aviso de uso único e apresentá-lo já montado no login.
- **MSW divergir do backend:** manter handlers mínimos baseados nos formatos reais encontrados e um E2E contra a pilha Docker.
- **Ruído preexistente dos testes ocultar regressão:** o comando atual passa, embora casos negativos de componentes escrevam exceções esperadas em stderr; novos testes não devem depender desse ruído.

## Perguntas abertas

Nenhuma bloqueante. A exigência dos checks de `container-ci.yml` na branch protection de `develop` depende da configuração do GitHub e deve ser verificada pelos mantenedores, pois não é observável apenas pelos arquivos do repositório.
