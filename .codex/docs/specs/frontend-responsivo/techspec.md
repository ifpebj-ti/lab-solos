# Especificação técnica: Frontend responsivo

- Status: pronto para decomposição em tarefas
- PRD: `./prd.md`
- Atualizado em: 2026-09-06
- Validação de design: desnecessária por ausência de decisão arquitetural material pendente; estratégia mobile confirmada na descoberta do PRD
- Issues relacionadas: #229, #230, #231

## Resumo técnico

Adaptar as primitivas de listagem existentes para cards rotulados abaixo de `md` e apresentação tabular a partir de `md`, mantendo uma única árvore de conteúdo e controles por registro. Compartilhar metadados de colunas entre cabeçalho e linhas, sem transferir busca, paginação, chamadas HTTP ou regras de negócio para a camada visual. Tornar o cadastro fluido e corrigir os contêineres dos consumidores que atualmente impõem largura mínima.

Reutilizar React 18, TypeScript, Tailwind CSS 3, Vitest/Testing Library e Playwright presentes no repositório. Não são necessárias bibliotecas novas, alterações de API ou migrações de banco. Este documento especifica a implementação futura; não representa validação de uma interface já implementada.

## Estado atual

Inspeção do código em 2026-09-06, sem `AGENTS.md` encontrado no repositório:

- `frontend/src/pages/CreateAccount.tsx`: painel `w-[750px]`, grade `grid-cols-2`, seletor de 180 px e contêiner `h-screen` centralizado. Em tela estreita ou baixa, largura e altura do conteúdo não cabem. `inputs/Password.tsx` também posiciona erros absolutamente e não associa o rótulo ao campo.
- `frontend/src/components/global/table/`: cabeçalho e linhas usam flex, larguras inline e, em geral, altura `h-9`, truncamento e escala no hover. Linhas não recebem rótulos; não basta esconder o cabeçalho para produzir cards compreensíveis.
- `ItemClickable` navega com `navigate(destinationRoute, { state: { id } })`. `TableItemWithActions` aceita `ReactNode` e prioriza `onRowClick`, evitando navegação para alguns alvos interativos. `ItemButtonLink` possui botões dentro de uma linha clicável, com risco de propagação para navegação.
- `ItemReturn` mantém estado local de switch, controla um campo desabilitado e repete `id='default-switch'`. `ItemViewInfo` é um card próprio com diálogo e larguras rígidas. Essas variantes precisam de tratamento explícito.
- `SearchMaterialComponent.tsx` atende administrador, mentor e mentorado. A listagem impõe `min-w-[800px]` em área com rolagem horizontal. Preserva seis campos, filtro por nome/tipo, inversão da ordem e paginação de sete registros.
- `tailwind.config.js` estende cores/fontes/escala, sem redefinir `screens`. Manter `md` em 768 px. Preservar a identidade de Inter/Rajdhani, bordas e cores existentes, corrigindo contraste quando necessário nos elementos tocados.
- A linha de base histórica descrita na skill já mudou: `backend/backend.sln` inclui `Tests/Tests.csproj`; frontend tem scripts `test`, `test:e2e` e `test:e2e:list`. Vitest usa jsdom e `src/test/setup.ts`; exclui `e2e/**`.
- `container-ci.yml` executa testes, lint, compilação e Playwright em PR para `develop`, nos eventos `opened`, `synchronize`, `reopened`. Playwright usa Chromium e stack sintética via Compose; ainda não há suíte específica de responsividade. A obrigatoriedade desses checks nas regras remotas de branch não foi verificada.

## Arquitetura proposta

### Estrutura compartilhada

Adicionar `frontend/src/components/global/table/ResponsiveTable.tsx` com tipos compartilhados e componentes de contêiner, registro e célula. O contêiner recebe descrição acessível e colunas. Disponibiliza os metadados por contexto React para `Header` e adaptadores existentes. Colunas de dados e de ações pertencem à mesma definição, incluindo ações que hoje ficam fora de `data`.

Contrato proposto, restrito à apresentação:

```ts
type ResponsiveColumn = {
  key: string;
  label: string;
  weight: number;
};

type ResponsiveTableProps = {
  label: string;
  columns: readonly ResponsiveColumn[];
  children: React.ReactNode;
};

type ResponsiveCellProps = {
  columnKey: string;
  children: React.ReactNode;
};
```

`key` é estável e único; `label` é obrigatório, inclusive para ações; `weight` é positivo e determina proporção desktop. Uma definição única produz `grid-template-columns` com faixas `minmax(0, Nfr)` a partir de `md`. Em mobile, uma coluna ocupa toda a largura; valores inline antigos não podem prevalecer sobre esse comportamento. Não usar valores arbitrários de classes Tailwind construídos dinamicamente; se necessário, passar a expressão de grade por variável CSS e consumi-la em uma classe estática.

Manter os módulos `Header`, `Item`, `ItemOnly`, `ItemClickable`, `ItemButton`, `ItemButtonLink`, `ItemDelete`, `ItemReturn` e `TableItemWithActions` como adaptadores para a estrutura compartilhada. Preservar suas funções de retorno e dados. Substituir `columnWidths` por metadados do contêiner nos consumidores migrados. `Header` passa a consumir a mesma definição. A migração deve atualizar cada cabeçalho e todas as suas linhas em conjunto; não deixar fallback silencioso de cards sem rótulos.

Nos adaptadores que recebem arrays, mapear posições explicitamente para as chaves das colunas de dados. Ações externas ao array ocupam células próprias. Exigir teste de correspondência entre rótulos, valores e ações; não inferir nomes a partir de ícones ou de valores do registro. Valores ausentes devem manter a convenção de exibição do consumidor, com representação textual explícita em vez de desaparecerem.

### Semântica e comportamento responsivo

Usar contêiner de lista com nome acessível e registros como itens; dentro do registro, pares `dt`/`dd` para rótulos e valores. Cabeçalho visual a partir de `md`, oculto da árvore acessível para evitar repetição; rótulos de cada célula ficam visíveis em mobile e `sr-only` a partir de `md`. A apresentação desktop será uma lista tabular alinhada, admitida pelo PRD, sem simular um `role=grid` que exigiria outro modelo de teclado.

Uma única árvore evita duplicação de IDs, controles, chamadas e estado ao redimensionar. Usar CSS para o breakpoint, sem listeners de resize nem montagem condicional por largura. A ordem do DOM e dos campos permanece a ordem existente das colunas em todos os tamanhos.

Cards usam `w-full`, `min-w-0`, altura automática, espaçamento entre pares e quebra de palavras extensas (`overflow-wrap:anywhere`). Desktop mantém proporções e compactação para conteúdo curto, mas admite crescimento de altura para textos longos e controles. Remover a escala de hover nas linhas para não criar overflow; usar o destaque de fundo existente. Não resolver overflow com `overflow-x-hidden` no documento ou corte de valores.

## Fluxos e componentes

### Navegação e ações

- `Item` e `ItemOnly`: apenas conteúdo, sem tabulação artificial.
- `ItemClickable`: disponibilizar link nativo no campo identificador do registro, preservando destino e `state: { id }`. Clique na área não interativa da linha pode manter a navegação existente; teclado usa o link.
- `ItemButton`, `ItemDelete`: botões nativos com `type='button'`, nomes que expressem ação e registro e os mesmos callbacks.
- `ItemButtonLink`: ações internas executam apenas o callback correspondente. Interromper propagação antes da navegação; não preservar a navegação acidental causada pelo clique no botão.
- `TableItemWithActions`: manter `ReactNode`, `onRowClick` prioritário e destino alternativo. Quando houver callback, usar botão primário explícito; caso contrário, link. Elementos interativos descendentes, incluindo input, link, switch, checkbox e combobox, não ativam a linha.
- `ItemReturn`: manter o estado checked e a regra de habilitação do campo; IDs únicos e rótulos associados para switch/campo. Não criar persistência que hoje não existe. Redimensionar não pode perder edição ou seleção.
- `ItemViewInfo`: reutilizar pares rotulados no card especializado; empilhar grupos abaixo de `md`, preservar oferta/pedido e o diálogo de contato. Acionamento por botão acessível e foco devolvido ao acionador; ajustar largura e rolagem vertical do diálogo.
- `Pagination` e `TopDown`: nomes acessíveis, foco visível e alvos de toque de pelo menos 44 × 44 px em mobile/ponteiro grosseiro. Paginação deve quebrar em linhas quando necessário, inclusive com cinco números e botões de extremos.

### Inventário obrigatório de migração

Caminhos abaixo relativos a `frontend/src`; todos os usos de linhas em cada arquivo entram na migração, inclusive listas aninhadas e cabeçalhos condicionais.

| Grupo | Consumidores | Contrato a caracterizar |
|---|---|---|
| Produtos | `components/screens/SearchMaterialComponent.tsx` | Seis campos, três perfis, filtros, ordenação, paginação e destino |
| Navegação por registro | `pages/FollowUp.tsx`, `pages/ViewClass.tsx`, `pages/ViewClassMentor.tsx`, `pages/admin/AllLoans.tsx`, `pages/admin/ClassLoan.tsx`, `pages/admin/MentoringHistoryAdm.tsx` | Destino e ID preservados |
| Navegação por registro | `pages/mentor/MyClass.tsx`, `pages/mentor/Disabled.tsx`, `pages/mentor/HistoryClass.tsx`, `pages/mentor/MentoringHistory.tsx`, `pages/mentee/HistoryMentoring.tsx` | Destino, ID e colunas condicionais |
| Ações | `pages/RegistrationRequests.tsx`, `pages/admin/LoansRequest.tsx`, `pages/RegisteredUsers.tsx`, `pages/mentor/LoanCreation.tsx` | Aprovação/recusa, navegação, seleção de status, remoção e callbacks |
| Leitura e devolução | `pages/admin/ReturnLoan.tsx`, `pages/loan/LoanHistories.tsx`, `pages/loan/LoanHistory.tsx`, `pages/mentee/LoanHistory.tsx`, `components/screens/VerificationPage.tsx` | Campos, switch, observação e variantes por produto/perfil |
| Card especializado | `pages/admin/ViewInfo.tsx` | Informações e diálogo de contato |

Remover larguras mínimas de tabela e ajustar os contêineres imediatos, ferramentas e ações desses consumidores. Auditar imports com `rg -n 'global/table/' frontend/src` ao finalizar; nenhum consumidor da primitiva alterada pode permanecer sem migração. Exportações de planilha/PDF e suas colunas próprias permanecem independentes da definição visual. Módulos que não consomem essas primitivas não entram em redesign; contêineres compartilhados só recebem correções mínimas se forem a causa comprovada de overflow nas jornadas cobertas.

### Busca de produtos

Substituir a área `min-w-[800px]` pela estrutura fluida. Manter ID, nome, tipo, quantidade, unidade e status em mobile e desktop. Garantir `min-w-0` nos ancestrais flex, quebra do título e ferramentas que caibam em 320 px. Filtro, busca, ordenação e paginação continuam no componente atual. Carregamento e vazio ocupam a largura disponível e apresentam mensagem acessível; redimensionar não reinicia busca nem página. Não alterar algoritmo de ordenação nem contratos de consulta.

### Cadastro de conta

Alterar o contêiner para altura mínima de viewport, padding e rolagem vertical natural; o painel usa largura total com máximo de 750 px. Grade `grid-cols-1 md:grid-cols-2`; cabeçalho e seletor empilham em mobile, com logo limitada e texto capaz de quebrar. Manter ordem atual do formulário e todos os campos.

Campos e botões devem ter `min-w-0` e caber no painel. Erros ficam no fluxo, sem posicionamento absoluto que sobreponha o próximo campo. Corrigir associação de label, descrição de erro, `aria-invalid` e nome de mostrar/ocultar senha em `inputs/Password.tsx`; verificar os mesmos critérios em `inputs/Text.tsx`. Ajustar `SearchInput` no escopo das listagens quanto a nome e foco. Preservar resolver, payload, mensagens de negócio, limpeza de sessão e redirecionamento.

Seletor de tipo, checkbox, termos e confirmação devem ser operáveis por teclado. Acionador de termos usa `type='button'`, sem submeter o formulário. Painel dos termos cabe no viewport, permite rolagem vertical e devolve foco. Ajustar somente apresentação/acessibilidade; não alterar a política de consentimento.

## Contratos e APIs

Sem novos endpoints. `getAllProducts()` continua usando `GET Produtos` e retornando a lista consumida por `IAllProducts`; `getSystemQuantities()` mantém `GET System/quantities` e o envelope atual. A responsividade não dispara consultas adicionais.

Cadastro mantém `createMentor(payload)`, o contrato `CreateAcademicUserData` de `contracts/userRegistration.ts`, sucesso 201, erros por campo e retorno ao login. Preservar testes existentes de cidade, curso e credenciais. Navegação mantém rotas e o tipo original de `id` (`number | string`), sem conversão para índice da linha.

## Dados e migrações

Nenhuma alteração persistente. Metadados de colunas são constantes locais de apresentação. Estado de edição permanece nos adaptadores/consumidores atuais; usar chave estável do registro, não índice da página, para impedir reutilização de estado em outro item. Não adicionar armazenamento de preferência de viewport.

## Segurança, privacidade e permissões

Manter guards, sessão e regras por perfil. Cards apresentam exatamente os campos e ações autorizados para o consumidor desktop; CSS não substitui autorização. Renderizar texto pelo React sem HTML injetado. Dados de testes são sintéticos; não incluir senhas, tokens reais ou dados pessoais em screenshots e traces. Não criar telemetria de conteúdo.

## Falhas, observabilidade e operação

Caracterizar carregamento, vazio, retorno atrasado, erros do cadastro e falha de consulta. Mensagens existentes devem caber e permanecer alcançáveis; a padronização de erros de negócio pertence ao PRD específico de erros do frontend. A infraestrutura responsiva não captura exceções HTTP nem as converte em sucesso.

Usar relatórios Playwright já configurados em `frontend/e2e/infra/artifacts/`, com trace e screenshot em falha e retenção de sete dias no CI. Relatar viewport, rota, perfil e elemento que ultrapassou a largura, sem imprimir o conteúdo sensível. Não adicionar logs em produção para resize.

## Compatibilidade, disponibilização e reversão

Entregar por grupos de consumidores, cada alteração com cabeçalho, linhas e testes correspondentes. O estado final deve migrar todo o inventário. Preservar exportações, componentes de negócio e comportamento nos perfis existentes. Reutilizar a entrega de contêineres; não há necessidade de flag ou dependência de deploy de backend.

Antes da disponibilização, validar o conjunto no PR para `develop`. Reversão por revert dos commits da funcionalidade ou retorno à imagem frontend anterior, sem reversão de dados. Durante implementação, a compatibilidade temporária dos adaptadores pode facilitar commits intermediários, mas não é critério de conclusão.

## Estratégia TDD e pirâmide de testes

A infraestrutura necessária já existe. Acrescentar testes de componentes em `src/components/global/table/ResponsiveTable.test.tsx`, `src/components/screens/SearchMaterialComponent.test.tsx` e testes de consumidores; ampliar `src/pages/CreateAccount.test.tsx`. Criar `e2e/responsive-layout.spec.ts`. Esses caminhos novos são planejados, não testes disponíveis nesta revisão documental.

### RED

1. Caracterizar contratos de callbacks, seleção, dados por perfil e navegação com MemoryRouter e mocks das integrações. Esses testes documentam comportamento atual e podem passar antes da mudança.
2. Adicionar teste que falha por ausência de rótulos e ação acessível, correspondência incorreta de coluna ou propagação do botão para navegação. Cobrir cada adaptador, inclusive controle editável e `ReactNode`.
3. Criar cenário Playwright de cadastro a 320 px e produtos com conteúdo longo; comprovar overflow/corte ou ausência de cards no código anterior. Falha deve ser de asserção do requisito, não ausência de servidor, autenticação ou fixture.
4. Para cada grupo do inventário, acrescentar cenário de consumidor antes da migração, com todas as ações e variações relevantes. Registrar comando, teste e falha esperada nas evidências da tarefa.

### GREEN

Implementar a estrutura mínima para os testes, migrar produtos e cadastro e depois cada grupo. Não duplicar árvores mobile/desktop. Aguardar resposta simulada e layout estável com asserções Playwright, sem sleeps fixos. Rodar os testes focados e regressões de contrato existentes.

### REFACTOR

Eliminar larguras/cópias antigas já substituídas, consolidar classes de célula e associação de rótulos, mantendo testes verdes. Conferir ausência de consumidores esquecidos e executar a esteira completa uma vez após a integração. Não substituir testes comportamentais por snapshots de classes.

### Cobertura e evidências

| Nível | Cobertura necessária |
|---|---|
| Unitário/componente | Metadados e valores, nomes de ações, conteúdo longo/ausente, variantes, IDs únicos, switch/campo, prioridade de callback e isolamento da navegação |
| Integração React | Todos os consumidores do inventário; filtros/página/destinos nos três perfis de produtos; cadastro válido/inválido; colunas condicionais e componentes interativos |
| Contrato | Reutilizar testes de cadastro/usuários existentes; afirmar que ações recebem o registro correto e que resize não gera requisições ou submissões |
| UI/E2E | Geometria real, breakpoint, foco, teclado, abertura/fechamento de controles e preservação de estado |

Parametrizar somente a suíte responsiva com 320 × 800, 375 × 812, 767 × 900, 768 × 1024 e 1440 × 900; adicionar uma transição 375 → 768 → 375 com edição ativa e uma tela baixa/paisagem 812 × 375. Não multiplicar toda a suíte de autenticação por viewport.

Em cada largura exigida pelo PRD (320, 375, 768 e desktop), verificar cadastro e todas as listagens inventariadas com fixture por rota/perfil. Testar pelo menos uma ação real por variante e todas as ações distintas em integração React. Produtos cobrem os três perfis. Fixtures de rede devem seguir o padrão `page.route` já usado em `user-data-contract.spec.ts`; não adicionar rota de demonstração à aplicação. Casos de cadastro com integração real continuam na stack sintética.

Asserções: `document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1`, largura do corpo dentro do viewport e bounding boxes de conteúdo/ações visíveis dentro do contêiner, antes e depois de interagir. Não aceitar área interna de rolagem lateral para os cards. Testar rótulos visíveis abaixo de 768 e alinhamento tabular a partir de 768. jsdom verifica semântica e interação, não comprova layout.

Incluir conteúdo curto, palavra sem espaços de 200 caracteres, nomes extensos, ausência de unidade, sete registros e múltiplas páginas, vazio, carregamento e mensagens extensas. Tab/Shift+Tab percorrem controles na ordem visual; Enter ativa links, Enter/Espaço ativam botões e nenhum clique interno navega indevidamente. Foco deve continuar visível ao rolar e ao redimensionar.

Inspeção visual agrupada mobile/desktop confirma densidade, leitura e contraste dos elementos alterados (texto normal pelo menos 4,5:1; controles/foco pelo menos 3:1). Complementar com leitor de tela e toque em dispositivo disponível, registrando navegador/dispositivo e limitações. Capturas são evidência auxiliar, não substituem asserções de dados e ações.

## Esteira de qualidade

Comandos executados a partir da raiz, salvo indicação. A tabela distingue comandos existentes de arquivos planejados.

| Área | Comando local | Verificação de CI | Lacuna/ação |
|---|---|---|---|
| Dependências | `npm --prefix frontend ci` | `frontend-quality` e `auth-e2e` | Já existe; usar lockfile |
| Componentes | `npm --prefix frontend run test -- --run` | `frontend-quality` | Acrescentar cenários responsivos |
| Lint | `npm --prefix frontend run lint` | `frontend-quality` | Script existente, cobre `src` |
| Compilação | `npm --prefix frontend run build` | `frontend-quality` | Script existente |
| Descoberta E2E | `npm --prefix frontend run test:e2e:list` | Descoberta pelo executor E2E | Conferir inclusão da nova suíte |
| Navegador | Em `frontend`: `npx --no-install playwright install --with-deps chromium` | `auth-e2e` | Instalação existente |
| Ambiente E2E | `docker compose -f docker-compose-e2e.yml up -d --build --wait` | `auth-e2e` | Docker e portas disponíveis são pré-requisitos |
| E2E focado | `npm --prefix frontend run test:e2e -- e2e/responsive-layout.spec.ts` | Incluído por `npm run test:e2e` | Arquivo planejado; não existe nesta revisão |
| E2E completo | `npm --prefix frontend run test:e2e` | `auth-e2e` | Já executa todos os `*.spec.ts`/`*.e2e.ts`; não criar gate duplicado |
| Backend | `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers` | `backend-quality` | .NET 8/xUnit e projeto de testes já incluído; não há código backend no escopo |
| Contratos da CI | `python -m unittest discover -s .github/scripts/tests -p "test_*.py" -v` | `workflow-quality` | Necessário se houver alteração no workflow; requer PyYAML conforme CI |

`container-ci.yml` já é validação pré-merge sem filtro de caminhos. `security-dependencies.yml` também roda em PR para `develop`, mas filtra manifestos e arquivos de segurança; não substitui o gate geral de frontend. Não depender de pipeline de release pós-merge.

A nova suíte entra automaticamente em `auth-e2e`. Se o tempo total exceder o limite atual de 30 minutos, separar a suíte responsiva em job que reutilize a mesma stack e comandos, com teste de contrato do workflow; não reduzir a matriz requerida. Verificar nas configurações do GitHub se os checks estão obrigatórios antes da entrega; essa configuração não pode ser inferida do YAML.

Auditoria desta especificação: comandos e gatilhos conferidos nos manifestos e workflows. Não foram executados testes, lint, build ou navegadores nesta etapa documental; não há resultado GREEN da implementação responsiva a declarar.

## Matriz de rastreabilidade

| Requisito | Componentes | Testes | Evidência |
|---|---|---|---|
| RF-001 | `ResponsiveTable`, `Header` e todas as variantes de linha | Componentes + E2E 320/375/767/768/1440 | Rótulos, valores e ações; mudança de apresentação no limite |
| RF-002 | `CreateAccount`, `inputs/Text`, `inputs/Password` | Cadastro RTL + E2E de preenchimento/erros | Uma coluna mobile, duas a partir de md, submissão preservada |
| RF-003 | Inventário completo de consumidores e contêineres | Integração por consumidor + E2E por rota | Inventário conferido, ausência de larguras mínimas conflitantes, dados/ações preservados |
| RNF-001 | Células, controles, paginação, cadastro e diálogos tocados | E2E de overflow/teclado + inspeção de contraste/leitor de tela | Bounding boxes, largura do documento, foco e nomes acessíveis |
| RNF-002 | Cabeçalhos e linhas desktop, grade do cadastro | E2E 768/1440 + regressões de contratos | Mesmos campos, destinos, ações, estado e densidade funcional |
| CA-001 | Cards e ações de todas as variantes | E2E abaixo de md com conteúdo longo | Cards rotulados sem rolagem lateral nem controles cortados |
| CA-002 | Cadastro completo, erros e termos | E2E 320 com preenchimento e teclado | Campos/botões acessíveis e submissão correta |
| CA-003 | Todos os consumidores e cadastro | E2E 768/1440 + testes de callbacks | Modo tabular/grade, todos os dados e ações |

## Alternativas e decisões

| Decisão | Alternativas | Recomendação | Escolha confirmada | Consequências |
|---|---|---|---|---|
| Mobile | Cards ou rolagem horizontal | Cards abaixo de md | Confirmada pelo PRD | Rótulos explícitos e ações completas |
| Renderização | Árvore única com CSS ou árvores duplicadas por viewport | Árvore única | Decisão técnica desta especificação | Preserva foco, IDs e estado; dispensa eventos de resize |
| Desktop | Lista tabular ou substituir tudo por tabela HTML | Lista tabular alinhada com pares semânticos | Decisão técnica desta especificação, dentro do padrão tabela/lista do PRD | Menor mudança e um DOM; não oferece navegação de tabela ao leitor de tela |
| Consolidação | Adaptadores sobre estrutura comum ou reescrita das regras em componente genérico | Adaptadores | Decisão técnica desta especificação | Preserva contratos distintos e limita risco |
| Testes | Reutilizar infraestrutura ou implantar nova | Reutilizar Vitest/RTL/Playwright e CI existentes | Evidência dos manifestos/workflows | Acrescentar cobertura, sem novas dependências |

As escolhas técnicas acima resolvem detalhes de implementação coerentes com a descoberta. Não restou alternativa material que exija nova sessão de decisão de produto ou arquitetura. A validação de design marcada como desnecessária não equivale a aprovação visual da implementação futura.

## Riscos e mitigação

- Consumidores numerosos e arrays posicionais: migrar por grupo, compartilhar definição de colunas e testar associação de cada valor/rótulo, inclusive colunas condicionais.
- Ações propagadas ou estado perdido: controles nativos separados, isolamento de eventos, IDs/chaves estáveis e teste de resize/ordenação/paginação.
- Overflow em 768 px apesar de funcionar em desktop: faixas flexíveis com mínimo zero, altura automática e teste explícito do limite com todos os controles.
- Overflow provocado por ferramentas ou diálogos: testar a página completa e portais abertos, não apenas a primitiva isolada.
- Regressão de inputs compartilhados: rodar testes de credenciais/cadastro existentes ao corrigir senha, erro e foco.
- Alterações simultâneas em autenticação, contratos de usuários e erros: preservar os contratos atuais e restringir esta entrega à apresentação/acessibilidade.
- CI mais lenta: parametrizar somente a suíte responsiva e reutilizar mocks para estados de apresentação; manter integrações reais já existentes.

## Perguntas abertas

Nenhuma bloqueante para decomposição. Permanecem verificações operacionais para a implementação: obrigatoriedade remota dos checks, duração da suíte ampliada e disponibilidade de dispositivos/leitor de tela para validação complementar. Registrar limitações reais nas evidências, sem tratar inspeção de código como teste visual executado.
