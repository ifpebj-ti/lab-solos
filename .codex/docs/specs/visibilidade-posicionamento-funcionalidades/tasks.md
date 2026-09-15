# Tarefas: Visibilidade e posicionamento de funcionalidades

- Estado: concluído com bloqueio de infraestrutura E2E
- PRD: `./prd.md`
- Especificação técnica: `./techspec.md`
- Atualizado em: 2026-09-09
- Issues de referência: #228 (T002), #232 (T001, T003, T004, T005); T006 valida os dois escopos

## Premissas de execução

Cada tarefa exige leitura do PRD, da especificação técnica e de seus consumidores atuais. Este plano não implementa importação, InterLab, Labon Pro, novos atalhos ou sinalizadores. Não altera backend, autenticação ou contratos de exportação. O inventário da especificação é a base; confirmar referências antes de excluir arquivos.

Vitest está configurado em `frontend/vite.config.ts`, com `frontend/src/test/setup.ts`; Playwright e seus scripts já existem. A CI pré-merge em `.github/workflows/container-ci.yml` executa testes, lint, build e a suíte E2E em PRs para `develop`. Não é necessária tarefa de infraestrutura ou alteração de workflow. A obrigatoriedade dos trabalhos na proteção da branch deverá ser verificada na futura contribuição; o YAML não comprova essa configuração.

Comandos `npm` e `npx` abaixo são executados em `frontend`; comandos `rg`, `git`, `docker` e `dotnet`, na raiz. Executar `npm ci` uma vez antes da implementação, sem atualizar o lockfile. Os novos arquivos de teste indicados são entregáveis das respectivas tarefas, não arquivos já existentes. Não executar testes excluídos após sua remoção.

Para comportamento preservado, escrever primeiro testes de caracterização e aceitar passagem inicial. RED deve demonstrar o comportamento indevido existente, sem quebrar código correto para produzir falha. Registrar comando, causa e resultado de RED, GREEN e REFACTOR durante a execução. Não há evidência de execução funcional nesta etapa documental.

## Ondas de execução

| Onda | Tarefas | Motivo de segurança do paralelismo |
|---|---|---|
| 1 | T001, T002, T003 | Menus, conta/cadastro e home/busca/configurações possuem arquivos distintos; nenhuma modifica rotas ou auxiliares de teste compartilhados |
| 2 | T004 | Retira protótipos administrativos após remoção das entradas; posse exclusiva de rotas, mocks compartilhados e cenário responsivo afetado |
| 3 | T005 | Retira protótipos públicos após T004, reutilizando sequencialmente os arquivos de roteamento |
| 4 | T006 | Validação cruzada no artefato de produção após todas as entregas funcionais |

`Paralela: sim` indica elegibilidade somente com dependências concluídas e sem conflito de posse. A tabela prepara uma futura orquestração; não inicia agentes nesta etapa. Builds escrevem `dist` e arquivos `*.tsbuildinfo`: executar validações que geram esses arquivos sequencialmente no workspace compartilhado. Não alterar dependências, configurações ou auxiliares compartilhados nas tarefas paralelas. Se um consumidor adicional exigir edição fora da posse declarada, atualizar o plano e serializar a alteração antes de executá-la.

O executor/coordenador centraliza estados e o log deste documento após cada tarefa; agentes paralelos não editam `tasks.md`. Alterações e artefatos locais preexistentes devem ser preservados.

## T001 — Exibir somente destinos operacionais nos menus

- Estado: concluída
- Issue: #232
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-001, RF-003, RNF-001, RNF-002, CA-001, CA-003
- Caminhos sob responsabilidade: `frontend/src/components/nav-user.tsx`, `frontend/src/components/nav-user.test.tsx`, `frontend/src/components/ui/app-sidebar.tsx`, `frontend/src/components/ui/app-sidebar.test.tsx`, `frontend/src/components/nav-projects.tsx`

### Escopo

Remover Labon Pro e seus ícones, grupo e separadores exclusivos. Remover Extras/Comunicação InterLab sem deixar seção vazia. Retirar configurações `/comum/*` e Conta sem destino válido para `Comum`, mantendo Sair. Excluir `NavProjects` somente após confirmar exclusividade de consumidores.

### Critérios de conclusão

Administrador, mentor e mentorado continuam com Conta apontando respectivamente a `/admin/profile`, `/mentor/profile` e `/mentee/profile`; Sair continua usando `clearSession`. `Comum` não recebe links inexistentes nem ações administrativas. Menus abertos não exibem promessas futuras, grupos vazios ou separadores duplicados. Navegação por teclado, foco e fechamento móvel permanecem funcionais, com os controles Radix existentes.

### Plano TDD

- RED: criar os dois testes de menu com roteador e provedor de sidebar reais; aguardar identidade e abrir os controles antes das ausências. Demonstrar falha pela presença de Labon Pro, InterLab e links legados. Parametrizar os três níveis operacionais e `Comum`, usando `nivelUsuario`, sem confundi-lo com `tipoUsuario`.
- GREEN: retirar entradas e configuração órfã. Exercitar Conta e Sair com sessões sintéticas, incluindo a limpeza centralizada.
- REFACTOR: retirar imports, ícones e `NavProjects` exclusivos, mantendo os testes positivos e a estrutura acessível.

### Validação

- `npm run test -- --run src/components/nav-user.test.tsx src/components/ui/app-sidebar.test.tsx src/auth/sessionConsumers.test.tsx`
- `npm run lint`
- `rg -n 'NavProjects|Labon Pro|/comum/' frontend/src`

### Notas

Referências negativas em testes são esperadas. Esta tarefa não exclui as rotas InterLab, reservadas à T004.

## T002 — Retirar importação e comunicação da conta e limpar o cadastro manual

- Estado: concluída
- Issue: #228
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-001, RF-002, RF-003, RNF-001, RNF-002, CA-001, CA-002, CA-003
- Caminhos sob responsabilidade: `frontend/src/pages/Profile.tsx`, `frontend/src/pages/Profile.test.tsx`, `frontend/src/pages/insert/Register.tsx`, `frontend/src/pages/insert/Register.test.tsx`

### Escopo

Remover os dois cards da conta administrativa e os ícones/containers exclusivos. Limpar blocos de importação e inserção em lotes comentados em Register, incluindo estados, efeitos e referências usados apenas pelo diálogo comentado. Preservar as três abas de cadastro manual.

### Critérios de conclusão

Conta carregada exibe dados de `getUserById` sem card, entrada de arquivo ou ação de importação/InterLab. Verificação de empréstimos vencidos mantém serviço, estado de execução e notificações de sucesso e erro. Abas de químicos, vidrarias e outros continuam selecionáveis com seus formulários. Nenhuma importação reaparece em Produtos; `exceljs`, `file-saver` e constantes compartilhadas permanecem disponíveis.

### Plano TDD

- RED: em Profile, controlar respostas das integrações e demonstrar falha das expectativas de ausência dos dois cards após carregar a conta. Caracterizar leitura de dados e verificação de vencidos, incluindo pendência, sucesso e erro. Em Register, caracterizar as três abas e a ausência já existente de importação; a limpeza de comentários não requer RED artificial.
- GREEN: remover cards, trechos comentados e auxiliares exclusivos; manter os contratos e formulários existentes.
- REFACTOR: remover espaços e imports sem consumidor dentro dos arquivos sob responsabilidade; repetir os testes de conta, cadastro e contratos de usuário.

### Validação

- `npm run test -- --run src/pages/Profile.test.tsx src/pages/insert/Register.test.tsx src/contracts/userProfileConsumers.test.tsx`
- `npm run lint`
- `rg -n -i 'Importar|Planilha|view-info|insert/launch|dialogRef|isOpen' frontend/src/pages/Profile.tsx frontend/src/pages/insert/Register.tsx`

### Notas

Não modificar integrações nem formulários de cadastro compartilhados. A limpeza do módulo `mocks/Unidades` pertence à T004.

## T003 — Limpar homes e configurações e corrigir a busca administrativa

- Estado: concluída
- Issue: #232
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-001, RF-003, RNF-001, RNF-002, CA-001, CA-003
- Caminhos sob responsabilidade: `frontend/src/pages/Home.tsx`, `frontend/src/pages/Home.test.tsx`, `frontend/src/components/global/Carousel.tsx`, `frontend/src/components/global/OpenSearch.tsx`, `frontend/src/components/global/OpenSearch.test.tsx`, `frontend/src/pages/admin/Settings.tsx`, `frontend/src/pages/admin/Settings.test.tsx`, `frontend/src/pages/admin/Home.test.tsx`

### Escopo

Retirar o carrossel e conteúdo promocional exclusivo da home de mentor/mentorado, preservando boas-vindas e busca. Remover apenas a instrução de protótipo das configurações. Corrigir Solicitações de Cadastros para `/admin/register-request`. Caracterizar os destinos operacionais da home administrativa sem redesenhá-la.

### Critérios de conclusão

Homes de mentor e mentorado não anunciam capacidades sem ação. Busca administrativa chega ao destino corrigido, sem alias para `/admin/registered-mentors`. Configurações mantém `ChangePassword` funcional. Home administrativa mantém navegação de produtos, usuários e empréstimos. Não são criados atalhos, estatísticas ou espaços reservados para futuras entregas.

### Plano TDD

- RED: testar ausência dos cards decorativos e da instrução “Adicione aqui as opções desejadas”; abrir a busca e selecionar Solicitações de Cadastros, observando a localização do roteador incorreta antes da correção. Caracterizar boas-vindas, busca por perfil, alteração de senha e destinos da home administrativa.
- GREEN: remover conteúdo exclusivo e corrigir a string do destino usando os componentes existentes.
- REFACTOR: excluir Carousel após busca de consumidores; retirar arrays, imports e containers exclusivos. Preservar imagens públicas porque sua exclusividade não é necessária para esta entrega.

### Validação

- `npm run test -- --run src/pages/Home.test.tsx src/components/global/OpenSearch.test.tsx src/pages/admin/Settings.test.tsx src/pages/admin/Home.test.tsx`
- `npm run lint`
- `rg -n 'Carousel|registered-mentors|Adicione aqui as opções desejadas' frontend/src`

### Notas

A especificação de navegação pós-autenticação deverá partir da home sem carrossel quando esta tarefa for concluída. Não antecipar seus novos atalhos. Os testes exercitam comportamento, sem copiar os arrays internos de rotas.

## T004 — Desativar rotas administrativas de protótipos e excluir suas dependências

- Estado: concluída
- Issue: #232
- Dependências: T001, T002, T003
- Paralela: não
- Requisitos: RF-001, RF-003, RNF-001, RNF-002, CA-001, CA-003
- Caminhos sob responsabilidade: `frontend/src/routes.tsx`, `frontend/src/routes.test.tsx`, `frontend/src/pages/admin/ViewInfo.tsx`, `frontend/src/pages/admin/CreateInfo.tsx`, `frontend/src/pages/admin/ViewInfo.responsive.test.tsx`, `frontend/src/pages/insert/Launch.tsx`, `frontend/src/components/global/forms/launch/LaunchQuimicos.tsx`, `frontend/src/components/global/forms/launch/LaunchVidrarias.tsx`, `frontend/src/components/global/forms/launch/LaunchOutros.tsx`, `frontend/src/components/global/UnderDevelopment.tsx`, `frontend/src/components/global/table/ItemViewInfo.tsx`, `frontend/src/components/global/table/ItemViewInfo.test.tsx`, `frontend/src/mocks/Unidades.ts`, `frontend/e2e/responsive-layout.spec.ts`

### Escopo

Retirar imports e rotas `/admin/view-info`, `/admin/create-info` e `/admin/insert/launch`, páginas e formulários exclusivos. Excluir UnderDevelopment, ItemViewInfo e seu teste exclusivo após confirmar consumidores. Retirar somente `registros` de Unidades se exclusivo; preservar unidades, categorias e opções operacionais. Excluir o teste da página ViewInfo e substituir o cenário responsivo T014 por indisponibilidade de rota, sem manipular o DOM para contornar bloqueios.

### Critérios de conclusão

As três URLs, também com query string, caem no fallback existente para visitantes e sessões autorizadas. Nenhum protótipo é montado ou dispara chamadas externas. Rotas operacionais e guardas permanecem intactos. Demais cenários responsivos continuam presentes e passando; constantes compartilhadas permanecem utilizáveis em cadastro e históricos.

### Plano TDD

- RED: estender `routes.test.tsx` com o registro real de rotas, sem copiá-lo. Demonstrar falha do fallback para sessão administrativa autorizada; visitantes também têm expectativas próprias, sem exigir que todos os casos falhem inicialmente. Observar ausência de chamadas dos protótipos. Alterar T014 antes da implementação para exigir a página não encontrada.
- GREEN: retirar rotas e páginas junto de seus consumidores exclusivos e ajustar a cobertura afetada na mesma tarefa, sem deixar imports quebrados.
- REFACTOR: remover `registros` somente após busca; revisar asserções e mocks antigos de InterLab. Reexecutar roteamento, suíte frontend e cenário responsivo afetado.

### Validação

- `npm run test -- --run src/routes.test.tsx src/pages/insert/Register.test.tsx`
- `npm run test -- --run`
- `npm run lint`
- `npm run build`
- Na pilha compilada descrita na T006: `npm run test:e2e -- e2e/responsive-layout.spec.ts`
- `rg -n 'ViewInfo|CreateInfo|UnderDevelopment|ItemViewInfo|LaunchQuimicos|LaunchVidrarias|LaunchOutros|registros' frontend/src frontend/e2e`

### Notas

`Page404` atualmente encerra a sessão. Não modificar esse contrato nem prometer preservação de sessão. O mock preexistente de Page404 em testes de roteamento não comprova seu comportamento real; a T006 deve verificá-lo no navegador. T004 e T005 são sequenciais por compartilharem o registro e os testes de rotas.

## T005 — Desativar demonstrações públicas e preservar consumidores de sessão

- Estado: concluída
- Issue: #232
- Dependências: T004
- Paralela: não
- Requisitos: RF-001, RF-003, RNF-001, RNF-002, CA-001, CA-003
- Caminhos sob responsabilidade: `frontend/src/routes.tsx`, `frontend/src/routes.test.tsx`, `frontend/src/pages/BootScreen.tsx`, `frontend/src/pages/prelab/PreLab.tsx`, `frontend/src/components/screens/CardBoot.tsx`, `frontend/src/components/screens/Exhibitor.tsx`, `frontend/src/auth/sessionConsumers.test.tsx`

### Escopo

Retirar `/boot` e `/pre`, seus imports, páginas e componentes exclusivos. Ajustar o teste textual de consumidores de sessão removendo apenas BootScreen e PreLab. Preservar imagens públicas e demais consumidores de `clearSession`.

### Critérios de conclusão

Ambas as URLs resolvem o fallback para visitantes e sessões sintéticas, com e sem query string, sem formulário público simulado ou contadores de demonstração. Os cinco destinos retirados passam juntos nos testes de roteamento. Login, recuperação, troca obrigatória e demais garantias de sessão continuam cobertos.

### Plano TDD

- RED: acrescentar `/boot` e `/pre` à matriz de roteamento real; demonstrar a montagem das demonstrações onde se espera fallback, observando também chamadas externas.
- GREEN: retirar declarações de rotas, páginas e componentes exclusivos; remover somente as duas entradas/imports correspondentes de `sessionConsumers.test.tsx`.
- REFACTOR: confirmar ausência de consumidores restantes de CardBoot e Exhibitor e repetir a matriz completa de URLs, consumidores de sessão e suíte frontend.

### Validação

- `npm run test -- --run src/routes.test.tsx src/auth/sessionConsumers.test.tsx`
- `npm run test -- --run`
- `npm run lint`
- `npm run build`
- `rg -n 'BootScreen|PreLab|CardBoot|Exhibitor|/boot|/pre' frontend/src frontend/e2e`

### Notas

Resultados como `/prefixo` e referências negativas de testes precisam de revisão, não remoção cega. Não excluir ativos ou componentes compartilhados com base somente no nome.

## T006 — Validar jornadas cruzadas no frontend compilado

- Estado: bloqueada
- Issue: #232 (validação também cobre #228)
- Dependências: T001, T002, T003, T004, T005
- Paralela: não
- Requisitos: RF-001, RF-002, RF-003, RNF-001, RNF-002, CA-001, CA-002, CA-003
- Caminhos sob responsabilidade: `frontend/e2e/feature-visibility.spec.ts`

### Escopo

Criar cobertura Playwright cruzando menus, páginas e roteamento no artefato de produção. Reutilizar `mockResponsiveSession` de `e2e/responsive-support.ts` sem alterar esse auxiliar compartilhado; manter respostas adicionais e usuários sintéticos no novo arquivo. Executar as verificações amplas e registrar evidências no log pelo coordenador.

### Critérios de conclusão

- Administrador, mentor e mentorado, em 375 e 1440 pixels: aguardar identidade e carregamento, abrir menus, verificar ausências, navegar por Conta e consulta de produtos e exercer Sair; cobrir teclado, foco e fechamento do menu móvel.
- Administrador: conta sem importação e InterLab, busca chegando a `/admin/register-request`, cadastro manual nas três abas, home com destinos de usuários/empréstimos/produtos e configurações com alteração de senha. Preservar exportações e ações de empréstimos com verificações positivas e regressão existente, sem reimplementar suas suítes.
- Mentor/mentorado: boas-vindas e busca presentes, carrossel ausente. Percorrer também login, criação de conta e recuperação de senha como superfícies públicas operacionais, sem alterar seus fluxos.
- Cinco URLs antigas: acesso direto e recarga, com query string e sem ela, como visitante e com sessão sintética válida, exibem `Página não encontrada`, sem protótipo ou chamadas originadas nele. Restabelecer sessão antes de cada variante autenticada, pois Page404 pode limpá-la.
- Suíte frontend, lint, build, descoberta e regressão E2E aprovados, sem testes ignorados ou avisos novos. Diferenciar respostas controladas de UI da integração real com backend coberta pelos E2E de credenciais existentes.

### Plano TDD

- RED/caracterização: como as remoções já estarão concluídas, estes cenários devem caracterizar o resultado integrado e podem passar inicialmente. Se encontrarem regressão, registrar a falha real e encaminhar a correção à tarefa dona do arquivo; não alterar código correto para fabricar RED.
- GREEN: completar o novo arquivo, aguardando elementos positivos antes das ausências e exercitando navegação real no contêiner. Não simular o registro de rotas ou remover bloqueios do DOM.
- REFACTOR: parametrizar perfis, larguras e URLs dentro do arquivo; manter testes legíveis, independentes e sem depender de classes CSS. Reexecutar apenas após alterações/falhas que justifiquem repetição.

### Validação

1. Em `frontend`: `npx --no-install playwright install --with-deps chromium` e `npm run test:e2e:list`; confirmar descoberta do novo arquivo.
2. Na raiz: `docker compose -f docker-compose-e2e.yml up -d --build --wait`.
3. Em `frontend`: `npm run test:e2e -- e2e/feature-visibility.spec.ts` e `npm run test:e2e`.
4. Em `frontend`: `npm run test -- --run`, `npm run lint` e `npm run build`.
5. Na raiz: `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`; validação de regressão existente, sem alteração backend. Testes de integração exigem Docker.
6. Na raiz: `rg -n -i 'UnderDevelopment|Labon Pro|em breve|Importar Planilha|view-info|create-info|insert/launch|BootScreen|PreLab|CardBoot|Exhibitor|NavProjects|Carousel|/boot|/pre|/comum/|/admin/registered-mentors' frontend/src frontend/e2e`; revisar ocorrências negativas de teste e falsos positivos, exigindo ausência de consumidores e destinos órfãos de produção.
7. Na raiz: `git diff --check`; revisar exclusões, testes preservados e avisos frente à linha de base.
8. Encerrar a pilha local: `docker compose -f docker-compose-e2e.yml down`, também após falha; não remover volumes nesta validação.

### Notas

Artefatos Playwright ficam em `frontend/e2e/infra/artifacts`. Sem Docker, registrar a limitação e manter pendente a evidência de produção até passagem do trabalho E2E no PR. O aviso conhecido de consulta da versão no GitHub em `vite.config.ts` deve ser distinguido de avisos novos.

Na futura contribuição, registrar as cinco URLs retiradas e o efeito vigente de Page404; verificar se `Frontend quality` e `Authentication E2E` são obrigatórios antes do merge. Se a proteção apresentar lacuna, registrar ação de infraestrutura separada, sem declarar proteção comprovada. Este plano não autoriza publicação, mudanças de proteção ou operações Git externas. Se a especificação de navegação alterar Page404 primeiro, caracterizar o novo contrato sem enfraquecer a indisponibilidade dos protótipos.

## Matriz de rastreabilidade

| Requisito | Tarefas | Evidência principal |
|---|---|---|
| RF-001 | T001, T002, T003, T004, T005, T006 | Menus e páginas sem capacidades incompletas; cinco URLs no fallback |
| RF-002 | T002, T006 | Conta sem importação; cadastro manual preservado |
| RF-003 | T001, T002, T003, T004, T005, T006 | Consumidores exclusivos removidos; destinos e contratos operacionais preservados |
| RNF-001 | T001, T002, T003, T004, T005, T006 | Conteúdo disponível agora nas superfícies percorridas |
| RNF-002 | T001, T002, T003, T004, T005, T006 | Busca de consumidores, lint, tipos, build e ausência de avisos novos |
| CA-001 | T001, T002, T003, T004, T005, T006 | Testes comportamentais e navegação no artefato de produção |
| CA-002 | T002, T006 | Conta administrativa carregada sem card/input/ação de importação |
| CA-003 | T001, T002, T003, T004, T005, T006 | Testes positivos e regressão frontend/E2E com lint e build |

## Log de execução

| Data | Tarefa | Resultado | Testes/evidências | Observações |
|---|---|---|---|---|
| 2026-09-09 | Planejamento | Plano criado; implementação pendente | Auditoria do PRD, especificação, scripts e configurações locais; validação documental de IDs, DAG, cobertura e posse | Nenhum teste funcional ou build executado nesta etapa |
| 2026-09-09 | T002 | Concluída | RED: teste direcionado falhou pela presença dos cards removidos (14/15); GREEN/REFACTOR: 3 arquivos, 15 testes aprovados; `npm run lint`; busca estática sem ocorrências | Issue #228 sincronizada como Done; arquivos sob posse alterados; sem commit/push; `tasks.md` não editado pelo agente |
| 2026-09-09 | T003 | Concluída | RED: 4 falhas nos cards/promessas, rota inválida e instrução de protótipo; GREEN/REFACTOR: 4 arquivos, 5 testes aprovados; suíte frontend 95 arquivos aprovados; `npm run lint`, `npm run build`, `git diff --check` | Issue #232 permanece In Progress por abranger tarefas posteriores; avisos de Vite preexistentes; arquivos sob posse alterados; `tasks.md` não editado pelo agente |
| 2026-09-09 | T001 | Concluída | RED: 6 falhas nos menus por Labon Pro, InterLab e links órfãos; GREEN/REFACTOR: testes direcionados 2 arquivos/6 testes, `sessionConsumers` 3 arquivos/26 testes, suíte frontend 97 arquivos/404 testes, `npm run lint`; busca estática sem consumidores | Issue #232 permanece In Progress por abranger tarefas posteriores; `NavProjects` removido; arquivos sob posse alterados; `tasks.md` não editado pelo agente |
| 2026-09-09 | T004 | Concluída | Caracterização dos REDs parciais preservados; GREEN/REFACTOR: rotas/Register 18/18, suíte frontend 95/414, T014 responsivo 5/5, `npm run lint`, `npm run build`, `git diff --check`; `test:e2e:list` descobriu 167 testes | Issue #232 permanece In Progress por abranger T005/T006; Docker E2E bloqueado por daemon indisponível; cinco URLs administrativas ainda não incluem `/boot` e `/pre` até T005; `tasks.md` não editado pelo agente |
| 2026-09-09 | T005 | Concluída | RED: 8 casos demonstraram montagem de `/boot` e `/pre`; GREEN/REFACTOR: matriz dos cinco destinos, 39/39 testes direcionados, suíte frontend 95/418, `npm run lint`, `npm run build`, `git diff --check`; busca sem consumidores produtivos | Issue #232 permanece In Progress até T006; imagens públicas e demais consumidores de `clearSession` preservados; `tasks.md` não editado pelo agente |
| 2026-09-09 | T006 | Bloqueada | Spec criado e validado: 24/24 cenários próprios, `test:e2e:list` 191 testes/6 arquivos, Vitest 95/418, lint, build e `git diff --check` aprovados; suíte E2E geral 188 aprovados/3 falhas existentes dependentes da API; .NET 94 aprovados/26 falhas por `DockerUnavailableException` | Docker Desktop/named pipe indisponível; `docker compose up/down` não conectou; falta aprovação E2E/integração no artefato com Docker; issue #232 permanece In Progress; spec sem testes ignorados e sem manipulação do DOM |
