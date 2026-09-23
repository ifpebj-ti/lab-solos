# Especificação técnica: reformulação integral do design do LabOn

- Status: pronta para decomposição em tarefas; execução sujeita aos marcos de validação descritos
- PRD: `./prd.md`
- Atualizado em: 2026-09-22
- Validação de design: direção e organização confirmadas; resumo dos pilotos confirmado pelo pedido de avançar para esta etapa
- Validação arquitetural adicional: desnecessária; preservação da pilha e dos contratos existentes, sem alternativa material que exija mudar o produto
- Referências: `organizacao-experiencia.md`, `direcao-visual.md`, `brief-pilotos.md`, `diagnostico/`

## Resumo técnico

Reformular a apresentação da aplicação React existente por meio de tokens semânticos, uma estrutura comum de navegação por perfil, componentes acessíveis reutilizados e migração por famílias de telas. Manter React 18, TypeScript, Vite, Tailwind 3, React Router, Radix, React Hook Form/Zod e as integrações Axios existentes. Não introduzir framework, biblioteca de estado global, backend intermediário ou nova biblioteca de componentes.

A identidade escolhida é Índice de amostras: listas precisas, identificação de registros, estado textual e detalhe relacionado à seleção. Computador é o contexto principal; celular continua funcional. Claro e escuro são entregas completas. O caminho selecionado na rodada visual é código; as imagens existentes são referências de crítica, não recursos para rasterizar a interface. A preferência geral Impeccable permanece `comp`; registrar a exceção desta iniciativa nos pacotes de execução para não pedir novamente a mesma decisão.

A entrega não exige migração de banco nem alteração de contrato HTTP. Todo comportamento de domínio continua sob as integrações e autorização atuais. A execução começa por completar a linha de base e preparar evidências, passa por base visual e pilotos e só expande após aceite de Nathan.

## Estado atual

| Área | Evidência atual | Consequência |
|---|---|---|
| Rotas | `frontend/src/routes.tsx`: 44 padrões, incluindo alias e wildcard | Não renomear URLs por motivos estéticos; manter navegação e retornos |
| Estrutura | `components/ui/layout.tsx`, `pages/BaseAdmin.tsx`, `BaseMentor.tsx`, `BaseMentee.tsx` | Há provedores e contêineres sobrepostos; consolidar rolagem sem remover guards |
| Navegação | Menus em `components/ui/app-sidebar.tsx`, atalhos e relações em `navigation/profileNavigation.ts` | Unificar dados dos grupos e preservar helpers de autorização/retorno |
| Estilos | `index.css`, `tailwind.config.js`: tokens semânticos e cores `*My`/locais | Migrar para uma fonte de tokens, com compatibilidade temporária explícita |
| Dados | `integration/`, `contracts/`, `services/BaseApi.tsx` | Reutilizar contratos e normalização; não espalhar fetch nas novas primitivas |
| Listas | `ResponsiveTable` usa lista de registros e `dl`, com adaptação por breakpoint | Conservar semântica e contratos atuais durante redesign; não afirmar que é uma tabela HTML |
| Erros | `errors/` e `ErrorFeedback` existem; alguns consumidores absorvem falhas | Corrigir consumidores sem inventar um segundo catálogo de erros |
| Testes | Vitest/Testing Library/MSW e Playwright instalados | TDD é viável; não criar infraestrutura duplicada |
| Backend | .NET 8 e xUnit; `backend.sln` inclui `Tests` e `E2ESeed` | A linha de base antiga mencionada na skill foi superada |
| CI | `container-ci.yml` executa em PR para develop, merge_group e execução manual | Verificação pré-merge existente; release após fechamento em main não substitui CI |

Verificações desta preparação: 128 arquivos e 605 testes Vitest aprovados; lint aprovado; descoberta Playwright aprovada com 215 testes em 10 arquivos. A compilação aprovada na etapa anterior gerou JavaScript principal de 4.007,47 kB, gzip 1.219,10 kB. Não houve execução E2E, medição de desempenho em navegador, teste de leitor de tela ou validação visual completa nesta preparação. A ausência de browser e a interrupção dos revisores anteriores permanecem registradas.

## Arquitetura proposta

### Responsabilidades e caminhos

Os caminhos novos abaixo são propostas de implementação; ainda não existem por efeito desta especificação.

| Camada | Caminhos existentes/novos | Responsabilidade |
|---|---|---|
| Tokens | Novo `frontend/src/styles/tokens.css`; `index.css`; `tailwind.config.js` | Cores por papel, tipografia, espaçamento, foco e movimento para ambos os temas |
| Tema | Novo `frontend/src/theme/{ThemeProvider.tsx,themePreference.ts,ThemeSwitch.tsx}`; `App.tsx` | Preferência local, aplicação na raiz e alternância acessível |
| Navegação | Novo `navigation/navigationModel.ts`; `profileNavigation.ts`; sidebar/cabeçalho existentes | Grupos por perfil, URLs e estados ativos; mesma fonte para menu e busca |
| Estrutura | `components/ui/layout.tsx`, `sidebar.tsx`, `site-header.tsx`; `Base*` | Landmark principal, navegação desktop/gaveta móvel e rolagem previsível |
| Composição | Novos `components/layout/{PageHeader.tsx,RecordWorkspace.tsx}` | Título/contexto/ação e disposição lista-detalhe sem conhecimento de API |
| Estados | Novo `components/global/CollectionFeedback.tsx`; `ErrorFeedback.tsx` | Carregamento, vazio inicial, filtro vazio e falha; reutilizar recuperação existente |
| Primitivas | `components/ui/`, `global/inputs/`, `global/table/`, `screens/InfoContainer.tsx` | Componentes visuais sem regras de autorização próprias ou chamadas HTTP |
| Páginas | `pages/` e `components/screens/` | Orquestração, dados, filtros, seleção e mutações com integrações atuais |
| Documentos | `components/pdf/`, consumidores de ExcelJS; `docs/manual/` | Mesmo conteúdo de saída, nova linguagem visual e instruções atualizadas |

Não criar um esquema genérico de páginas ou um construtor de formulários para esta migração. Extrair apenas padrões demonstrados em mais de um consumidor ou necessários à coerência e acessibilidade dos pilotos. Reutilizar as primitivas Radix existentes em vez de reimplementar foco, diálogo ou lista selecionável.

### Tokens e tema

Definir tokens para fundo, superfície, superfície selecionada, texto principal/secundário, borda, foco, ação primária, navegação e estados sucesso/aviso/erro. Mapeá-los às variáveis consumidas pelas primitivas atuais. Os valores da referência verde/ameixa/mineral orientam a seleção; cada combinação de texto/fundo precisa de contraste medido antes de fixar os valores finais. Proibir uso de cor como único indicador de situação.

`ThemePreference = 'light' | 'dark'`. Persistir somente essa preferência na chave `labon.theme.v1` do localStorage; valor inválido ou acesso negado não impede renderização. Na ausência de escolha, usar preferência do sistema como resolução inicial, sem criar uma terceira opção de produto obrigatória. Escolha explícita prevalece; mudanças de sistema só afetam quem não escolheu. Aplicar `.dark` e `color-scheme` no elemento raiz. Sincronizar abas por evento `storage`, testar valores inválidos e falhas de armazenamento. Não persistir seleção de registros ou dados pessoais junto do tema.

Evitar clarão de tema inicial por inicialização anterior à montagem em um módulo local carregado pelo HTML, compatível com a política de conteúdo atual; não enfraquecer CSP para inserir código inline. O controle de tema fica disponível também no acesso público. Anúncio e nome acessível indicam a ação ou estado, sem depender de ícone sol/lua.

Preservar fontes existentes inicialmente como suporte técnico; comparar a fonte humanista de interface com a referência no piloto. Nova fonte só se necessária à fidelidade, com licença verificada, armazenamento local e pesos efetivamente usados. Não carregar onze pesos por conveniência. A decisão tipográfica final é parte do aceite do piloto, não aprovação de uma fonte apenas pelo nome.

Durante migração, aliases `primaryMy`, `backgroundMy` e `clt-*` podem apontar para tokens semânticos; remover aliases apenas após migrar consumidores. Não aplicar regra universal de substituição de todo verde/vermelho, pois status e ação têm papéis diferentes. Portais de diálogos, popovers, notificações e tooltips devem herdar o mesmo tema.

## Fluxos e componentes

### Navegação e estrutura

O modelo central descreve `id`, `label`, `to`, ícone e filhos para os três perfis. Grupos aprovados: Administrador — Início/Materiais/Empréstimos/Pessoas/Auditoria; Mentor — Início/Materiais/Empréstimos/Minha turma; Mentorado — Início/Materiais/Meu histórico. Conta, notificações e configurações existentes mantêm acesso conforme perfil.

Não reescrever `PARENT_ROUTES`, parse de IDs, guards e alias `/mentor/history/mentee` sem necessidade funcional. Atualizar apenas rótulos, agrupamento e consumidores. Um item não vira autorizado por estar no menu; `PrivateRoutes`, `PasswordChangeRequiredRoute` e backend continuam sendo barreiras. Usar `aria-current`, link de pular para conteúdo, título único e foco ao fechar gaveta móvel. O cabeçalho e as bases não devem criar três regiões de rolagem concorrentes ou alturas `h-screen` aninhadas.

### Início e lista-detalhe

No Administrador, obter solicitações pelos serviços já utilizados por `admin/Home.tsx`/`LoansRequest.tsx`/`RegistrationRequests.tsx`. Filtrar estado por contrato existente, não por cor/rótulo traduzido. Cada coleção carrega e falha independentemente; sucesso de empréstimos não esconde falha de cadastros. Sem dados confirmados, não mostrar zero como contagem real.

`RecordWorkspace` recebe lista, detalhe, identificação da seleção e callback de retorno. Não busca dados. Na aplicação desktop, renderiza dois painéis; abaixo do espaço necessário, alterna lista/detalhe com retorno explícito. Um botão de linha abre o detalhe; não tornar toda a linha um botão contendo outros botões. Estado selecionado tem nome/texto acessível. No início, guardar seleção em parâmetro de consulta validado, preservando parâmetros anteriores; detalhes canônicos continuam acessíveis pelas rotas existentes. ID ausente, inválido ou não disponível gera estado claro, sem buscar registro arbitrário.

Não renderizar na nova home botões de aprovação duplicados com lógica própria: “Analisar solicitação” navega para a jornada existente, passando o ID na forma aceita pelos helpers. Dados da imagem são sintéticos e não viram fixtures de produção. Contagem, data e nome vêm da API; null é exibido como ausência, nunca preenchido com dado fictício.

### Catálogo e formulários

Preservar `ResponsiveTable`, colunas rotuladas e registros como lista/`dl`; estilizar como índice alinhado no computador e campos rotulados no celular. Assim se evita trocar semântica e reescrever todos os consumidores na mesma onda. Paginação, filtros e ordenação mantêm os algoritmos existentes até evidência de necessidade distinta.

Em `PopoverInput`, adicionar `id`/associação de rótulo, `aria-invalid`, referência da mensagem e erro textual; botão do seletor deve ter `type='button'` quando dentro de formulário. Testar o componente real, não apenas o mock de select usado nos testes críticos. Usar campos nativos/Radix e manter React Hook Form/Zod como donos da validação. Conteúdo longo pode quebrar linha; não ocultar nome, contato ou unidade para uniformizar cartões.

### Empréstimo: restrição descoberta

O contrato atual de criação contém `diasParaDevolucao` e `produtos[{produtoId,quantidade}]`. O formulário escolhe um dependente, mas essa escolha não integra o payload; `EmprestimosController.Adicionar` atribui `SolicitanteId` ao usuário autenticado. A unidade escolhida também não é enviada separadamente. Os testes atuais confirmam esse payload.

Preservar esse contrato e a validação atual na migração. A apresentação não pode afirmar que a seleção registra outro solicitante/beneficiário nem converter quantidades pela unidade escolhida. Na revisão, identificar o solicitante autenticado e deixar explícita a limitação da seleção atual, sem tratá-la como vínculo persistido. Não remover a exigência de seleção nem acrescentar beneficiário ao contrato como “correção visual”. Se Nathan quiser que a seleção determine o vínculo, abrir decisão de produto separada antes dessa alteração. Isso não impede o restante da arquitetura ou a composição visual do piloto.

Separar visualmente contexto, itens e revisão dentro da mesma página; não criar assistente multipágina por padrão. Ação Adicionar inclui item na lista local; ação Solicitar envia uma única requisição. Preservar `diasParaDevolucao: 5` como comportamento existente, sem introduzir edição do prazo. Manter seleção em falha de envio; limpar somente após sucesso confirmado; remover a promessa de redirecionamento quando nenhum ocorrer. Ações destrutivas e aprovação/recusa mantêm confirmação e submissão exclusivas já existentes.

## Contratos e APIs

Não criar endpoints nem alterar corpos, autenticação, enums ou esquema de resposta. Usar adaptadores de apresentação, sem gravar valores traduzidos no domínio. Consultar as integrações existentes para cada método e teste de contrato.

| Operação | Contrato existente a preservar | Consumidores |
|---|---|---|
| Login | `POST Auth/login`, `{email,password}`; resposta `{token,requiresPasswordChange}` | Login e ciclo de acesso |
| Materiais | `GET Produtos`, `GET Produtos/{id}`, `GET Produtos/emAlerta`, histórico e mutações existentes | Catálogo, detalhes, cadastro/edição e alertas |
| Empréstimos | `GET Emprestimos`, `GET Emprestimos/{id}`, `GET Emprestimos/usuario/{id}` | Pendências, históricos e detalhe |
| Criar empréstimo | `POST Emprestimos`, `{diasParaDevolucao,produtos:[{produtoId,quantidade}]}` | Mentor; solicitante atribuído pelo servidor |
| Decidir empréstimo | `PATCH Emprestimos/aprovar/{id}` ou `reprovar/{id}`, corpo atual `{aprovadorId}` | Administrador; servidor continua autorizando |
| Devolver | `PATCH Emprestimos/devolver/{id}`, sem novo corpo | Jornada de devolução no escopo existente |
| Pessoas e turmas | Funções de `integration/Users.ts` e `Class.ts`, incluindo dependentes/aprovação | Pessoas, turma, solicitações e perfis |
| Notificações e auditoria | Integrações existentes, sem nova assinatura de eventos | Notificações e auditoria |

Não uniformizar silenciosamente retornos que hoje alternam resposta Axios e `.data`: tipar adaptadores locais e testar o contrato dos consumidores. `contracts/user.ts` e `contracts/loan.ts` continuam validando dados. API indisponível não pode ser representada como coleção vazia bem-sucedida.

## Dados e migrações

Sem migração SQL/EF, alterações de entidades ou regravação de dados legados. Única persistência nova de produto nesta arquitetura: preferência de tema local. Seleção e filtros de consulta usam URL/estado de página, sem tokens ou informações pessoais na URL. Não persistir rascunho de empréstimo no armazenamento local nesta entrega.

Criar `cobertura.json` na pasta desta especificação durante a preparação de tarefas: registros com `id`, rota, perfil, família, estados aplicáveis, larguras, temas, onda, evidências, decisão e status. Não exigir produto cartesiano cego: testes compartilhados cobrem estados de primitivas; cada rota precisa de prova de integração, autorização e aparência nos temas. Itens não aplicáveis levam justificativa, não são omitidos.

PDF mantém assinatura, valores e ordenação de domínio. Usar estilos próprios do renderizador PDF com valores compartilhados quando compatíveis, sem tentar aplicar CSS web diretamente. PDFs para impressão permanecem de fundo claro independente do tema da sessão. ExcelJS conserva células/tipos/valores; não exigir igualdade binária de arquivos que contêm metadados variáveis. Atualizar manual e capturas com versão e dados sintéticos, sem republicar Wiki automaticamente.

## Segurança, privacidade e permissões

Manter `auth/session.ts`, `auth/intendedRoute.ts`, `BaseApi.tsx`, guards e autorização backend. Não mover tokens para localStorage nem usar preferência de tema como mecanismo de permissão. 401 segue encerramento/retomada segura; 403 mantém sessão e informa impedimento; validação, conflito e indisponibilidade têm mensagens contextuais.

Não enviar cookies, requisições reais ou dados pessoais ao ImageGen. Capturas de testes usam apenas a pilha sintética e fixtures identificadas. Evidências de revisão e contratos de direção ficam fora de `public/` e do bundle, inclusive comentários ou atributos ocultos. Preservar cabeçalhos e configuração de runtime: não contornar avisos de `/env.js` enfraquecendo políticas do servidor.

## Falhas, observabilidade e operação

Usar estados explícitos por recurso: `loading`, `success` com dados possivelmente vazios e `error` com erro normalizado. Recarregamento pode manter dados antigos, mas deve indicar falha/atualização e não apresentar dados antigos como atualizados. Uma resposta atrasada não deve substituir a seleção ou consulta mais recente; cancelar quando a integração suportar ou ignorar resposta obsoleta no consumidor.

Em mutações, desabilitar envio duplicado, manter campos/itens após falha e revalidar listas após sucesso. Não aplicar aprovação otimista; distinguir sucesso de operação de falha ao atualizar sua listagem. Reutilizar `reportAppError`, catálogo de operações e `ErrorFeedback`. Não adicionar plataforma de telemetria. Registros de desenvolvimento não substituem feedback ao usuário.

Para performance, medir a compilação de produção, não o servidor Vite de desenvolvimento: login, início, catálogo e criação, mesmos fixtures, versão do navegador, hardware e rede. Registrar mediana de cinco execuções para carregamento e tempo da ação até estado estável, bytes transferidos e bloqueios observados. As tolerâncias precisam ser fixadas com Nathan após essa linha de base e antes da implementação visual, como exige o PRD. Não inventar percentuais aprovados. O tamanho observado de 4 MB é sinal de investigação, não orçamento automaticamente aceito.

Prever carregamento sob demanda de PDF/ExcelJS nos pontos de exportação, sem alterar resultados; só decompor rotas com React.lazy quando medições justificarem e testes de deep link/loading cobrirem o efeito. Não usar memoização indiscriminada. Imagens de referência não entram na aplicação; ativos finais devem ter procedência e dimensão adequada.

## Compatibilidade, disponibilização e reversão

Implementar por ondas na mesma aplicação, sem duplicar a árvore inteira de rotas e sem flag permanente. A base de tokens deve ter aliases transitórios para páginas ainda não migradas. Não disponibilizar uma onda com texto invisível em tema escuro; quando o tema puder ser selecionado, todo o alcance navegável precisa de cobertura mínima de contraste.

Ordem técnica: (0) linha de base/matriz e fechamento de tolerâncias; (1) tokens, tema, primitivas e navegação; (2) pilotos de acesso, início, catálogo e empréstimo; (3) aceite humano; (4) expansão para acesso/estrutura, materiais, pessoas/gestão, empréstimos/documentos; (5) integração, manual e documentação do sistema. Mudanças compartilhadas exigem testes de todos os perfis antes da próxima onda. `tasks.md` definirá dependências e posse, sem paralelizar edições dos mesmos tokens/rotas.

Reversão por commits atômicos de onda/base em ordem inversa, preservando alterações independentes. Sem migração de banco, a reversão do frontend não requer rollback de dados; `labon.theme.v1` pode ser ignorada por versão anterior. Evitar comandos de limpeza que apaguem mudanças do usuário. Deploy, push e PR dependem de solicitação própria; quando houver PR, base develop.

## Estratégia TDD e pirâmide de testes

### RED

- Tema: teste com preferência armazenada, valor inválido, localStorage indisponível, escolha explícita e evento de outra aba.
- Campos reais: consultar combobox pelo rótulo, provocar erro e verificar texto/associação; os mocks de `LoanCreation.critical.test.tsx` não cobrem acessibilidade do PopoverInput.
- Coleções: simular rejeição e verificar ausência de “nenhum resultado” enganoso; recuperar sem perder filtro; resposta tardia não substitui contexto.
- Navegação: todos os destinos permitidos e vedados por perfil, grupos aprovados, retorno, ID inválido, refresh e rota pretendida pós-login.
- Empréstimos: payload idêntico ao atual, solicitante conforme sessão, envio único, manutenção após falha e confirmação real sem promessa falsa.
- Apresentação: nome longo legível, estados em ambos os temas, seleção lista-detalhe com teclado e retorno no celular.

Registrar comando, saída e motivo da falha. Falha de ambiente, seletor mal escrito ou teste já verde não conta como evidência RED de requisito novo. Não criar teste que exija um hex específico ou espelhe a árvore JSX sem comprovar comportamento.

### GREEN

Implementar o menor comportamento que satisfaça o teste e o design aprovado, usando primitivas e integrações existentes. Rodar testes focados, depois consumidores afetados. Para imagens e espaçamento, a evidência é inspeção visual comparada, não um teste unitário artificial.

### REFACTOR

Extrair duplicação comprovada, eliminar classes legadas no escopo migrado e consolidar componentes sem mudar contratos. Rodar suíte apropriada, lint e build. Revisão visual agrupa tamanhos/temas e corrige em lote; registrar resultado real, não apenas saída verde.

### Novos testes e cobertura planejada

Criar testes próximos de `theme/`, modelo de navegação e componentes novos; ampliar testes de páginas e MSW existentes. Criar `frontend/e2e/design-system.spec.ts` para temas, teclado e regiões responsivas e `frontend/e2e/design-pilots.spec.ts` para pilotos sintéticos. **Adicionar explicitamente esses arquivos a `uiTestFiles` em playwright.config.ts**: o projeto UI usa lista restritiva e não descobrirá automaticamente todo arquivo novo. Não mover testes reais para a suíte mockada.

Adicionar `@axe-core/playwright` como dependência de desenvolvimento para varredura automatizada de acessibilidade nos pilotos, com lockfile e verificações de dependência usuais; não escolher versão presumida neste documento. Complementar com teclado, zoom, toque e leitor de tela manual. Usar capturas Playwright determinísticas com fontes carregadas, animação estabilizada e fixtures; aprovar goldens por revisão, nunca com atualização automática para silenciar diferença.

Adicionar verificação de cobertura do inventário com utilitário próprio (proposto `scripts/check_design_coverage.py`) que confira IDs únicos, evidências existentes e status/decisões. Esse script ainda não existe e deve ser criado com testes antes de entrar na CI. PDF precisa de extração comparada de dados e inspeção renderizada de páginas curtas/longas; exportação exige igualdade semântica de células, não bytes.

## Esteira de qualidade

Comandos abaixo partem da raiz, salvo indicação. No PowerShell usar `npm.cmd`/`npx.cmd`; no Linux da CI, `npm`/`npx`.

| Área | Comando local | Verificação de CI | Lacuna/ação |
|---|---|---|---|
| Dependências | Em frontend: `npm.cmd ci` | frontend-quality e auth-e2e | Já existe |
| Unitários/integração UI | Em frontend: `npm.cmd run test -- --run` | frontend-quality | 605 testes aprovados nesta preparação |
| Teste focado | Em frontend: `npm.cmd run test -- --run src/pages/mentor/LoanCreation.critical.test.tsx` | Suíte completa | Usar filtros equivalentes por tarefa |
| Lint | Em frontend: `npm.cmd run lint` | frontend-quality | Aprovado nesta preparação |
| Compilação | Em frontend: `npm.cmd run build` | frontend-quality | Aprovada na etapa anterior; avisos registrados |
| Descoberta E2E | Em frontend: `npm.cmd run test:e2e:list` | Não é teste de execução | 215 testes descobertos; incluir novos arquivos na lista do projeto |
| E2E UI | Em frontend: `npm.cmd run test:e2e -- --project=ui` | auth-e2e executa ambos os projetos | Requer servidor em E2E_BASE_URL, padrão 127.0.0.1:4173; config não inicia servidor |
| E2E real | `docker compose -f docker-compose-e2e.yml up -d --build --wait`; em frontend: `npm.cmd run test:e2e -- --project=real` | auth-e2e usa pilha sintética e `npm run test:e2e` | Não executado nesta etapa; requer Docker/Chromium |
| Chromium | Em frontend: `npx.cmd --no-install playwright install chromium` | CI usa `--with-deps chromium` | Instalação do browser não substitui validação humana |
| Backend | `dotnet restore backend/backend.sln`; `dotnet build backend/backend.sln --no-restore -c Release --nologo --disable-build-servers`; `dotnet test backend/backend.sln --no-build -c Release --nologo --disable-build-servers` | backend-quality, incluindo testes PostgreSQL dedicados | Não executado nesta preparação documental; preservar CI |
| Documentos | `python -m unittest discover -s .github/scripts/tests -p "test_delivery_docs*.py" -v` | documentation-quality | Fluxo completo exige checkout da Wiki na revisão fixada; não alegar validação só com arquivos locais |
| Cobertura design | Planejado: `python scripts/check_design_coverage.py --spec .codex/docs/specs/reformulacao-design` | Acrescentar ao frontend-quality ou job dependente obrigatório | Criar script, testes e verificação agregadora |
| Acessibilidade/visual | Novos E2E incluídos no projeto UI; comparação e aceite registrados | auth-e2e | Criar casos e goldens; aceite humano não é substituído pela CI |

`container-ci.yml`: PRs para develop em opened/synchronize/reopened/edited/ready_for_review, merge_group e workflow_dispatch. `documentation-quality.yml`: PRs para develop, merge_group e manual. `security-dependencies.yml` já verifica dependências e roda qualidade. `container-release.yml`: PR fechado em main/execução manual, somente distribuição; não conta como gate pré-merge.

O agregador de Container CI depende dos jobs de qualidade; manter falhas de novos testes propagadas, sem `continue-on-error`. A exigência desses checks na proteção remota de branch **não foi consultada**: verificar no momento de preparar PR, sem afirmar que configuração YAML sozinha impede merge. Não modificar CI de release para resolver lacuna de validação de design.

## Matriz de rastreabilidade

| Requisito | Componentes | Testes | Evidência |
|---|---|---|---|
| RF-001 | cobertura.json, inventário | Validador e conferência das rotas | CA-001; matriz por onda |
| RF-002 | Registro de decisão, pacotes dos pilotos | Revisão humana/visual | CA-002, CA-003; escolha 664f68eb e exceção code |
| RF-003 | Tokens, ativos, composições | Inspeção e procedência | CA-002, CA-003; imagem de referência e revisão |
| RF-004 | Modelo de navegação, helpers, Layout | Unitário, integração e E2E | CA-004, CA-008; três perfis e deep links |
| RF-005 | Auth, Login, cadastro, perfil, recuperação | Unitário/contrato/E2E real | CA-005; ciclo de credenciais existente |
| RF-006 | Catálogo, tabela, formulários, integração Product | Componente/contrato/UI | CA-006, CA-012; conteúdo longo e estados |
| RF-007 | LoanCreation, LoansRequest, gestão e turmas | Contrato/integração/E2E real | CA-007, CA-008; efeitos e autorização |
| RF-008 | CollectionFeedback, ErrorFeedback, campos | MSW/componente/UI | CA-005, CA-007, CA-009, CA-011 |
| RF-009 | Tema, tokens, primitivas e portais | Unitário, axe, screenshots | CA-003, CA-010; matriz claro/escuro |
| RF-010 | PDF, exportação e manual | Extração/inspeção/documentos | CA-013, CA-014 |
| RF-011 | Ondas, cobertura, revisão independente | Integração e aceite | CA-001, CA-016 |
| RNF-001 | Controles, foco, contraste, movimento | axe e manual | CA-009, CA-011 |
| RNF-002 | Layout, tabelas, detalhe móvel | UI por largura e zoom | CA-006, CA-012 |
| RNF-003 | Guards, sessão, APIs, evidências | Negativos de acesso/contrato | CA-004, CA-005, CA-007, CA-013 |
| RNF-004 | Carregamento, fontes, módulos pesados | Medição reproduzível | CA-015; orçamento acordado na etapa 0 |
| RNF-005 | Detector, revisão, registro de achados | Ferramenta e revisão independente | CA-003, CA-016 |

Todos os CA-001 a CA-016 estão associados acima. CA-002 usa a escolha de identidade realizada e a exceção code registrada; não inventar aprovação de outras imagens. CA-010 tem obrigatoriamente os dois temas; a pergunta de tema do corpo histórico do PRD já foi resolvida.

## Alternativas e decisões

| Decisão | Alternativas | Recomendação | Escolha confirmada | Consequências |
|---|---|---|---|---|
| Identidade | Índice, Bancada, Instrumentos, convencional | Rodada visual | Índice de amostras | Lista e detalhe, verde/ameixa/mineral como referência |
| Caminho desta rodada | Novas imagens ou código | Respeitar resposta da página | code, mudança explícita | Comparar com imagem existente; padrão global comp intacto |
| Temas e dispositivos | Um/dois temas; prioridade móvel/desktop | Adequar ao uso | Claro/escuro, desktop principal | Cobertura de ambos; celular funcional |
| Pilha | Reescrever ou evoluir React atual | Evoluir | Decisão técnica dentro do escopo, sem mudança de produto | Reutilizar testes, Radix, Router e integrações |
| Estado de servidor | Nova biblioteca ou estados locais existentes | Estados explícitos nos consumidores | Decisão técnica, sem nova biblioteca | Menor migração e contratos preservados |
| Tabelas | Trocar semântica de todos os consumidores ou preservar listas acessíveis | Preservar inicialmente | Decisão técnica | Compatibilidade com testes e layout, sem alegar semântica table |
| URL | Renomear caminhos ou reorganizar apenas menus | Preservar caminhos | Compatível com escopo confirmado | Sem migração de links; seleção validada |
| Beneficiário de empréstimo | Alterar API ou conservar contrato | Conservar e comunicar limitação | Preservação de domínio já confirmada | Mudança funcional depende de requisito separado |

Não há alternativa arquitetural material pendente que exija nova rodada de descoberta técnica. Ajustes rotineiros foram decididos pelo menor impacto; isso não equivale a aprovação humana de cada detalhe técnico.

## Riscos e mitigação

- **Tema expõe páginas legadas:** aliases transitórios, varredura de consumidores e testes em portais antes de disponibilizar alternância.
- **Aprovação visual confundida com funcional:** pacotes separados de evidência; nenhum piloto aceito só por screenshot.
- **Seleção de usuário/unidade não persistida:** contrato documentado e testes preservados; não prometer efeito inexistente nem alterar backend silenciosamente.
- **Testes críticos usam seletor mockado:** testes novos do PopoverInput real e teste UI com teclado.
- **Goldens validam um defeito:** aprovação humana inicial e mudança de referência somente com justificativa e versão.
- **Mudanças de layout quebram exportação ou retorno:** teste semântico dos arquivos e E2E de parâmetros/refresh/voltar.
- **Budget ainda sem medição:** etapa 0 obrigatória antes de implementar; não apresentar esta techspec como certificado de performance.
- **Limite de subagentes/browser no diagnóstico:** repetir a avaliação independente quando disponível antes do aceite; registrar degradação se continuar indisponível.

## Perguntas abertas

Não há bloqueio para decompor tarefas. Antes da implementação visual: coletar a linha de base e confirmar tolerâncias de desempenho com Nathan, validar ativos institucionais e resolver o acesso ao ambiente de revisão. Antes do aceite dos pilotos: confirmar tipografia, contraste de ambos os temas e composição móvel em execução.

O significado funcional do usuário/unidade selecionado em empréstimo permanece uma inconsistência anterior. Esta iniciativa não o altera. Se a expectativa for salvar esses valores como novo vínculo/conversão, isso bloqueia somente essa mudança de contrato e exige extensão de PRD; não é permissão para inferir uma regra.

A próxima entrega é `tasks.md`, usando `create-tasks` para decompor esta solução e tornar a etapa 0, os testes e os pontos de aprovação dependências explícitas.
