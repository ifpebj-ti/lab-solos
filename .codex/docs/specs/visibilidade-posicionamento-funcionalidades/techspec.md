# Especificação técnica: Visibilidade e posicionamento de funcionalidades

- Estado: pronta para decomposição em tarefas
- PRD: `./prd.md`
- Atualizado em: 2026-09-09
- Validação de descoberta: confirmada no PRD
- Validação de design: desnecessária — remoções determinadas pelo PRD, sem alternativa arquitetural material
- Referência da análise: revisão `c243e2e` e arquivos locais disponíveis nesta data
- Issues relacionadas: #228, #232

## Resumo técnico

Remover capacidades incompletas da navegação e do registro de rotas do frontend, incluindo seus componentes exclusivos. A conta administrativa mantém os dados pessoais e a verificação operacional de empréstimos vencidos. Nenhuma importação será implementada ou transferida para outra tela nesta entrega; uma futura importação deverá ser especificada no módulo de produtos, com contrato ponta a ponta.

A implementação usa React, TypeScript, React Router, Vitest/Testing Library e Playwright já presentes no repositório. Não requer API, migração, dependência nova ou sinalizador de funcionalidade. A remoção vale para todas as compilações, conforme a suposição do PRD de que os protótipos não precisam ser mantidos em desenvolvimento.

## Estado atual

Todos os caminhos da tabela são relativos a `frontend/src/`. O inventário distingue ausência de entrega de estados normais de uma funcionalidade, como carregamento, dados vazios e desabilitação temporária durante uma requisição.

| Superfície | Evidência atual | Destino nesta entrega |
|---|---|---|
| `components/nav-user.tsx` | Item desabilitado `Labon Pro (em breve)`, sem ação | Remover item, ícone `Sparkles` e agrupamento/separador exclusivos; manter Conta e Sair |
| `components/ui/app-sidebar.tsx` | Seção Extras com Comunicação InterLab → `/admin/view-info` | Remover entrada e estrutura exclusiva sem deixar seção vazia |
| `pages/Profile.tsx` | Cards Comunicação InterLab e Importar Planilha de Cadastro de Bens apontam para a mesma rota `/admin/view-info` | Remover ambos, seus ícones exclusivos e qualquer espaço vazio decorrente |
| `pages/admin/ViewInfo.tsx` | `UnderDevelopment`, registros simulados e contadores fixos; link para `/admin/create-info` | Remover página e rota |
| `pages/admin/CreateInfo.tsx` | Produtos fixos; submissão e clique apenas executam `console.log` | Remover página e rota, inclusive acesso direto |
| `pages/insert/Register.tsx` | Importação e link de inserção em lotes comentados | Apagar os blocos e auxiliares comentados exclusivos; preservar as três abas de cadastro manual |
| `pages/insert/Launch.tsx` e `components/global/forms/launch/Launch*.tsx` | Rota ativa `/admin/insert/launch`; os três formulários apenas navegam para `/`, sem persistência | Remover rota, página e formulários exclusivos |
| `pages/prelab/PreLab.tsx` | Formulário público `/pre` valida campos, mas a submissão apenas navega para `/` | Remover rota e página |
| `pages/BootScreen.tsx` | `/boot` anuncia acesso via `/pre`, exibe contadores fixos e ícones de contato sem ação | Remover rota e página de demonstração, com componentes exclusivos |
| `pages/Home.tsx` e `components/global/Carousel.tsx` | Mentor/mentorado recebem cards decorativos de capacidades sem destino ou dados | Remover carrossel e conteúdo promocional; preservar boas-vindas e busca existentes |
| `pages/admin/Home.tsx` | Cards usam integrações e destinos existentes de produtos, usuários e empréstimos | Preservar e cobrir com verificações positivas |
| `pages/admin/Settings.tsx` | Instrução de protótipo “Adicione aqui as opções desejadas” junto de `ChangePassword` funcional | Remover apenas a instrução; manter rota e alteração de senha |
| `components/global/OpenSearch.tsx` | Solicitações de Cadastros aponta para `/admin/registered-mentors`, ausente em `routes.tsx` | Corrigir para `/admin/register-request`, destino operacional já usado pelo menu |

O carrossel também está incluído no PRD `../navegacao-pos-autenticacao/prd.md`, cuja descoberta confirmou sua remoção. Esta entrega realiza somente a retirada necessária ao RF-001; a criação e priorização de novos atalhos por perfil permanece naquela especificação. Sua futura implementação deve partir da home já sem carrossel.

Há configuração legada para `Comum` em `app-sidebar.tsx` e `nav-user.tsx`, com destinos `/comum/*` inexistentes. Não criar um quarto módulo: retirar essas entradas órfãs e a opção Conta para esse nível sem destino válido, mantendo Sair. Nos três perfis com rotas implementadas, preservar os destinos de conta. Essa limpeza não altera os níveis existentes no backend nem concede acesso administrativo a um perfil sem mapa.

### Dependências de remoção

- `UnderDevelopment` é consumido pela página InterLab; excluir o componente após retirar a página.
- `ItemViewInfo` é exclusivo dessa tela; remover componente e seu teste exclusivo.
- `mocks/Unidades` também fornece unidades, categorias e opções aos cadastros e históricos operacionais. Remover somente `registros` se a busca de consumidores confirmar exclusividade; manter o módulo compartilhado.
- `NavProjects`, `CardBoot`, `Exhibitor` e `Carousel` têm consumidores exclusivos dos trechos retirados. Excluir após confirmar referências no momento da implementação, incluindo imports de testes.
- `ViewInfo.responsive.test.tsx` testa a página com o bloqueio simulado. O cenário T014 de `e2e/responsive-layout.spec.ts` remove o bloqueio diretamente do DOM. Substituir a cobertura da funcionalidade retirada por testes de indisponibilidade de rota; manter os demais cenários responsivos.
- `auth/sessionConsumers.test.tsx` importa `BootScreen` e `PreLab` como texto. Retirar apenas esses consumidores quando os arquivos forem excluídos, mantendo as garantias de encerramento de sessão dos demais componentes.
- Não excluir imagens públicas apenas porque uma página saiu: confirmar usos em TSX, CSS e referências por URL. Não remover `exceljs` ou `file-saver`, usados na exportação operacional.

## Arquitetura proposta

Manter o roteador e a composição atual dos menus. A alteração consiste em retirar entradas e dependências, sem criar catálogo global, redirecionamentos individuais ou infraestrutura de sinalizadores. Os destinos operacionais existentes continuam protegidos por `PrivateRoute` e pelos níveis já declarados.

Remover de `routes.tsx` os imports e declarações de `ViewInfo`, `CreateInfo`, `Launch`, `BootScreen` e `PreLab`. URLs antigas passam a ser resolvidas pelo `path='*'` existente, que renderiza `Page404`. O contrato é de navegação da SPA; não se promete resposta HTTP 404 do servidor que serve `index.html`.

O `Page404` atual chama `clearSession` ao montar. Reutilizá-lo conserva esse comportamento, inclusive para links antigos autenticados; não afirmar preservação de sessão nesse fluxo. A correção de retorno e manutenção de sessão pertence ao PRD de navegação pós-autenticação. Se aquela mudança chegar primeiro, os testes desta entrega devem validar o contrato atualizado de `Page404`, mantendo a exigência de que o protótipo nunca seja montado.

## Fluxos e componentes

1. Administrador, mentor ou mentorado abre o menu do usuário: encontra Conta e Sair, sem Labon Pro, grupos vazios ou separadores duplicados. Conta navega para o perfil correspondente e Sair mantém `clearSession`.
2. Administrador abre a barra lateral ou conta: Comunicação InterLab e importação não aparecem. A verificação de empréstimos vencidos continua chamando o mesmo serviço e apresentando sucesso/erro.
3. Usuário abre uma das cinco URLs retiradas diretamente ou atualiza a página: recebe a página não encontrada, sem formulário, bloqueio de desenvolvimento ou requisição iniciada pelo componente removido.
4. Mentor ou mentorado abre a home: vê boas-vindas e a busca existente; não vê o carrossel que anuncia capacidades sem destino. Não introduzir atalhos ou estatísticas nesta entrega.
5. Administrador pesquisa Solicitações de Cadastros: chega à página operacional `/admin/register-request`.
6. Cadastro manual de químicos, vidrarias e outros, consulta de produtos, exportações, alteração de senha e ações de empréstimos continuam disponíveis sob as permissões atuais.

Na remoção dos menus, preservar foco, navegação por teclado e fechamento no modo móvel. Manter os componentes Radix existentes; não substituir controles funcionais por texto ou botões desabilitados de promessa futura.

## Contratos e APIs

| Contrato | Comportamento esperado |
|---|---|
| `/admin/view-info`, `/admin/create-info`, `/admin/insert/launch`, `/boot`, `/pre` | Ausentes do registro de rotas; resolvidas por `Page404`, também com query string e acesso direto |
| Menu Conta | `/admin/profile`, `/mentor/profile`, `/mentee/profile`, conforme nível; sem destino inexistente `/comum/profile` |
| Busca administrativa de solicitações | `/admin/register-request`; não criar alias para `/admin/registered-mentors` |
| Leitura de conta | Preservar `getUserById` de `integration/Users` e os tipos de `contracts/user` |
| Verificação de vencidos | Preservar `verificarEmprestimosVencidos` de `integration/Notifications`, estado de execução e notificações |
| Cadastro e exportação de produtos | Contratos existentes intactos; nenhuma requisição de importação nova |

Nenhum endpoint, DTO, formato de arquivo ou código de erro é acrescentado. Um contrato de importação futura deverá definir validação de arquivo, autorização, processamento e resultado por registro em sua própria especificação; não reservar rota ou ação agora.

## Dados e migrações

Sem alteração de esquema, migração, limpeza de banco ou transformação de dados de usuários. Registros simulados exclusivos da comunicação podem ser removidos do código. Constantes compartilhadas em `mocks/Unidades` não são dados descartáveis e devem ser preservadas. Nenhuma alteração em cookies ou armazenamento local é necessária.

## Segurança, privacidade e permissões

Ocultação e remoção de rotas não substituem autorização da API. Manter guardas e regras de backend existentes; não alterar autenticação, recuperação de senha ou fluxo de troca obrigatória. Não usar `tipoUsuario` como substituto de `nivelUsuario` ao montar menus. O nível `Comum` não deve receber menus administrativos como efeito da retirada de sua configuração órfã.

Usar usuários sintéticos e respostas controladas nos testes. Não registrar credenciais ou conteúdo de planilhas; nenhum arquivo será aceito pela entrega. Os testes de rota removida devem demonstrar ausência de chamadas disparadas pelos protótipos.

## Falhas, observabilidade e operação

Acesso por favorito antigo apresenta `Página não encontrada` e a ação Voltar existente. Não apresentar mensagem de sucesso para operações removidas nem substituir o protótipo por aviso “em breve”. Estados legítimos de indisponibilidade de rede, vazio e carregamento continuam válidos.

Não criar telemetria ou infraestrutura operacional. Usar falhas de testes e os artefatos existentes do Playwright para identificar destinos órfãos, erros de página e problemas de menu. Na validação, tratar avisos novos do React/console como regressão, distinguindo avisos preexistentes documentados.

## Compatibilidade, disponibilização e reversão

Disponibilizar como uma alteração do frontend pelo fluxo de contêineres existente. Não há ordem de migração/backend. Acesso externo a `/boot` ou a favoritos dos protótipos deixa de oferecer esses fluxos; registrar as cinco URLs retiradas na descrição da futura contribuição. A busca local confirma consumidores no código, mas não comprova ausência de favoritos ou links externos.

Reversão técnica: reverter o conjunto coeso de remoções, ajustes e testes ou republicar a imagem anterior. Isso reexpõe protótipos e viola o resultado de produto; usar apenas para conter uma regressão operacional, seguido de correção. Não há restauração de banco. Não executar publicação nesta etapa documental.

## Estratégia TDD e pirâmide de testes

A infraestrutura necessária já existe. Usar testes comportamentais nos menus, conta e roteamento real; busca textual é complemento e não prova de funcionamento. Não criar testes que apenas reproduzam arrays internos ou dependam da estrutura de classes CSS.

### RED

- Em `components/nav-user.test.tsx` e testes da barra lateral, montar com roteador/provedor de sidebar, abrir o menu e demonstrar a falha pela presença de Labon Pro e InterLab. Parametrizar os três perfis operacionais; cobrir `Comum` sem links órfãos ou exposição de ações administrativas.
- Em `pages/Profile.test.tsx`, usar respostas sintéticas para a conta; demonstrar a presença indevida da importação e de Comunicação InterLab. Adicionar verificações positivas da leitura de dados e da chamada operacional de vencidos, incluindo erro.
- Estender `routes.test.tsx` com as cinco URLs retiradas, visitantes e sessões sintéticas autorizadas. Antes da alteração, a expectativa de fallback deve falhar por renderizar o protótipo. Simular apenas integrações externas/guardas de ambiente necessárias, sem substituir o registro de rotas por uma cópia.
- Em testes da home e da busca, demonstrar cards decorativos existentes e destino administrativo inválido. Em configurações, demonstrar o texto de instrução indevido e preservar a renderização da alteração de senha.
- Criar `e2e/feature-visibility.spec.ts` sobre o frontend compilado: abrir menus por perfil em 375 e 1440 pixels, verificar ausências e exercer Conta, busca e navegação operacional. Aguardar a identidade e o carregamento da página antes de afirmar ausências.

### GREEN

Executar as remoções do inventário, corrigir o destino da busca e ajustar apenas os testes de funcionalidades excluídas. Asserções negativas devem passar junto das positivas: Conta, Sair, consulta de produtos, abas de cadastro, verificação de vencidos e alteração de senha continuam operacionais. O acesso direto às URLs antigas não monta protótipos, mesmo com sessão válida e após recarregar.

Para a cobertura de UI, reutilizar `mockResponsiveSession` de `e2e/responsive-support.ts` e respostas de API controladas; declarar que esses cenários verificam navegação no artefato de produção, não integração real com o backend. Manter os E2E existentes de credenciais contra a pilha sintética real como proteção independente de autenticação.

### REFACTOR

Remover imports, estados, ícones, componentes e testes exclusivos que ficaram sem consumidores. Retirar os casos antigos de InterLab e as referências textuais às páginas excluídas, sem silenciar testes nem reduzir a cobertura responsiva das funcionalidades restantes. Executar novamente os testes afetados, a suíte frontend, lint, compilação e E2E. Registrar falha inicial, passagem e comandos na futura tarefa, com causa da falha e resultado, sem fabricar evidência RED nesta etapa documental.

## Esteira de qualidade

A linha de base citada pela skill foi revalidada e mudou: `backend/backend.sln` inclui `Tests/Tests.csproj`; o backend usa .NET 8/xUnit; o frontend possui scripts de Vitest e Playwright. `container-ci.yml` roda em PR para `develop` nos eventos `opened`, `synchronize` e `reopened`, além de execução manual. Seus trabalhos já incluem qualidade frontend/backend e toda a suíte E2E, apesar do nome `Authentication E2E`.

Comandos abaixo são da raiz, exceto quando a coluna indica diretório. São comandos para a implementação; nesta etapa foi feita auditoria dos arquivos de configuração, sem execução de testes ou build de produção.

| Área | Comando local | Verificação de CI | Lacuna/ação |
|---|---|---|---|
| Dependências frontend | Em `frontend`: `npm ci` | `frontend-quality` e `auth-e2e` | Infraestrutura existente; manter lockfile |
| Testes de componentes/rotas | Em `frontend`: `npm run test -- --run` | `frontend-quality` | Acrescentar casos descritos; novos arquivos são descobertos pelo Vitest |
| Lint | Em `frontend`: `npm run lint` | `frontend-quality` | Já usa `--max-warnings=0` |
| Tipos e compilação | Em `frontend`: `npm run build` | `frontend-quality` | Inclui `tsc -b` e `vite build`; anotar avisos preexistentes e exigir ausência de novos |
| Descoberta E2E | Em `frontend`: `npm run test:e2e:list` | Execução integral no trabalho E2E | Confirmar inclusão do novo arquivo pelo `testMatch` existente |
| Navegador E2E | Em `frontend`: `npx --no-install playwright install --with-deps chromium` | `auth-e2e` | Chromium do lockfile; sem novo projeto obrigatório |
| Artefato de produção E2E | `docker compose -f docker-compose-e2e.yml up -d --build --wait` | `auth-e2e` | Docker necessário; frontend servido por contêiner na porta 4173 por padrão |
| Cenários desta entrega | Em `frontend`: `npm run test:e2e -- e2e/feature-visibility.spec.ts` | Incluídos em `npm run test:e2e` | Arquivo explicitamente planejado; não existe ainda |
| Regressão E2E | Em `frontend`: `npm run test:e2e` | `auth-e2e` | Preservar demais suítes; traces/capturas em `frontend/e2e/infra/artifacts` |
| Backend existente | `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers` | `backend-quality`, após restore/build | Sem nova cobertura backend nesta entrega; testes de integração exigem Docker |

A suíte E2E usa a imagem compilada, sem `vite dev`; não confundir testes de fonte com CA-001 em produção. Se Docker não estiver disponível localmente, registrar a limitação e exigir passagem do trabalho E2E no PR. Ao encerrar a execução, usar `docker compose -f docker-compose-e2e.yml down`; remoção de volumes não é necessária para esta validação local.

O trabalho de release posterior à integração não substitui esses testes antes do merge. A existência do YAML não comprova configuração de proteção da branch: verificar na futura contribuição se `Frontend quality` e `Authentication E2E` são obrigatórios. Nenhuma infraestrutura nova de testes ou workflow é necessária para os arquivos planejados. `vite.config.ts` consulta a versão no GitHub e pode emitir aviso de fallback; caracterizar isso separadamente de avisos introduzidos pela mudança.

## Matriz de rastreabilidade

| Requisito | Componentes | Testes | Evidência esperada |
|---|---|---|---|
| RF-001 | NavUser, AppSidebar, rotas, home, páginas de protótipo | Componentes, integração de roteamento e Playwright | Ausência de capacidades incompletas e fallback das cinco URLs |
| RF-002 | Profile e limpeza comentada em Register | Componente de conta e Playwright administrativo | Nenhuma importação na conta ou reintrodução em Produtos |
| RF-003 | Rotas, imports, dependências exclusivas, OpenSearch | Testes positivos de jornadas, lint, tipos/build | Destinos operacionais preservados e nenhum import quebrado |
| RNF-001 | Menus, homes, Settings, superfícies públicas | Asserções de conteúdo e navegação no build | Sem promessa futura, instrução de protótipo ou ação simulada |
| RNF-002 | Grafo de consumidores e testes ajustados | Busca estática, suíte frontend, lint/build | Sem referências de produção aos itens excluídos ou avisos novos |
| CA-001 | Menus por perfil, homes e rotas públicas/autenticadas | `feature-visibility.spec.ts`, rotas e componentes | Build de produção percorrido; controles preservados exercitados |
| CA-002 | `/admin/profile` | Profile e E2E | Conta carregada sem card/input/ação de importação |
| CA-003 | Conjunto da alteração e integrações preservadas | Suítes frontend/E2E, lint e build | CI anterior ao merge aprovado, sem testes ignorados para obter passagem |

Complementar a validação com `rg -n -i 'UnderDevelopment|Labon Pro|em breve|Importar Planilha|view-info|create-info|insert/launch' frontend/src frontend/e2e`. Ocorrências negativas em testes são esperadas; revisar resultados, sem exigir saída global vazia. Buscar também nomes dos componentes excluídos e `/boot`, `/pre`, `/comum/`, `/admin/registered-mentors` para impedir imports e entradas de navegação órfãos. Lint e TypeScript, isoladamente, não identificam toda string de rota inválida.

## Alternativas e decisões

| Decisão | Alternativas | Recomendação | Escolha confirmada | Consequências |
|---|---|---|---|---|
| Exposição de incompletos | Desabilitar, sinalizadores ou remover | Remover entradas, rotas e dependências exclusivas | Confirmada no PRD | Sem manutenção de protótipos em desenvolvimento |
| Importação | Mover o card, implementar agora ou retirar | Retirar e especificar futura entrega em Produtos | Confirmada pelo escopo do PRD | Nenhuma capacidade nova de importação |
| URLs antigas | Alias, redirecionamento específico ou fallback | Fallback existente após exclusão de rota | Decisão técnica derivada do RF-003 | Links antigos mostram Page404 com seu comportamento vigente |
| Home | Implementar nova home ou retirar conteúdo incompleto | Retirar carrossel; novos atalhos na especificação de navegação | Remoção também confirmada no PRD de navegação | Evita duplicação de implementação entre entregas |
| Testes | Nova infraestrutura ou base atual | Reutilizar Vitest/Playwright e CI existente | Decisão técnica por evidência local | Ampliar cenários, sem novos executores |

Não há escolha arquitetural material pendente que exija sessão separada de validação. As decisões técnicas desta tabela não representam uma confirmação adicional do usuário.

## Riscos e mitigação

- Exclusão excessiva de dependências: confirmar todos os consumidores; preservar constantes de unidades, exportações e componentes compartilhados.
- Testes preexistentes mantendo protótipos: substituir os cenários exclusivos de InterLab e ajustar consumidores de sessão; não deixar mocks/imports de arquivos removidos.
- Falsa passagem por menu fechado ou dados ainda carregando: abrir o menu e aguardar identidade e elementos positivos antes das asserções de ausência.
- Favoritos antigos e encerramento de sessão por Page404: comunicar as URLs retiradas e registrar a dependência de navegação; testar o comportamento vigente sem prometer outro.
- Sobreposição com a próxima especificação: documentar a retirada do carrossel como pré-condição já realizada quando as tarefas forem executadas; novos atalhos permanecem fora desta entrega.
- Perfil legado sem módulo: retirar links `/comum/*` sem alterar o backend, inventar uma home ou permitir fallback administrativo.

## Perguntas abertas

Nenhuma bloqueante para a decomposição. O uso de URLs por consumidores externos e a obrigatoriedade dos trabalhos na proteção de branch não são comprováveis pelos arquivos locais; devem ser verificados na preparação da disponibilização. Esta especificação não declara execução bem-sucedida de testes, alteração de produto, commit ou publicação.
