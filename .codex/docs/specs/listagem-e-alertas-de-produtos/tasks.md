# Tarefas de listagem e alertas de produtos

- Status: concluída
- PRD: [prd.md](./prd.md)
- Especificação técnica: [techspec.md](./techspec.md)
- Atualizado em: 2026-11-24

Leia o PRD e a especificação técnica antes de cada tarefa. Use dados sintéticos nos testes e registre no log as evidências de cada execução.

## Ondas de execução

| Onda | Tarefas | Motivo de segurança do paralelismo |
|---|---|---|
| 1 | T001, T003, T004 | O indicador, o contrato de acesso vigente e a regra isolada de estoque usam arquivos distintos. |
| 2 | T002, T005 | A apresentação da quantidade usa o componente compartilhado. A projeção depende do cálculo de estoque e fuso e tem posse de arquivos de backend. |
| 3 | T006 | A listagem consome a projeção e entrega o cliente tipado. |
| 4 | T007 | A aba Alertas consome o cliente tipado e a projeção. |
| 5 | T008, T009 | O manual e a validação cruzada usam arquivos distintos. |

Avance nas tarefas prontas. Para tarefas bloqueadas, as ondas indicam a posição prevista após a liberação das decisões.

Coordenação entre planos: agendar a escrita em `ProdutosController.cs`, `ProdutoRepository.cs`, `ProdutoDTO.cs`, `Product.ts`, testes de rotas e Playwright com as demais frentes quando houver arquivos compartilhados. Agendar `docs/manual/administrador.md` com [Documentação](../documentacao-primeira-entrega/tasks.md).

## Validação comum

Na raiz, preparar com `dotnet restore backend/backend.sln --locked-mode` e `dotnet build backend/backend.sln --no-restore -c Release`. Reexecutar a suíte com `dotnet test backend/backend.sln --no-build --no-restore -c Release`. Iniciar Docker para os testes PostgreSQL do projeto de testes.

Em `frontend/`, preparar com `npm ci`. Além dos recortes abaixo, executar `npm run test -- --run`, `npm run lint` e `npm run build`.

Para o projeto `real`, iniciar na raiz a pilha sintética com `docker compose -f docker-compose-e2e.yml up -d --build --wait`. Em `frontend/`, instalar Chromium com `npx --no-install playwright install chromium`, conferir a seleção com `npm run test:e2e:list` e executar `npm run test:e2e -- --project=real --project=ui` na validação completa de navegador.

## T001 — Manter o indicador de alerta visível em Meus Produtos

- Issue: #466
- Status: concluída
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-001
- Caminhos sob responsabilidade: `frontend/src/components/screens/SearchMaterialComponent.tsx`, `frontend/src/components/screens/SearchMaterialComponent.test.tsx`, `frontend/src/pages/search/SearchMaterial.tsx`, `frontend/e2e/responsive-layout.spec.ts`

### Escopo

Expor no catálogo administrativo uma coluna ou legenda com triângulo e exclamação e nome acessível, inclusive no estado vazio. Preparar a apresentação sem inferir por linha um estado que a resposta vigente ainda não informa.

### Critérios de conclusão

O identificador permanece na lista administrativa vazia e preenchida, em viewport amplo e móvel. As buscas de mentor e mentorado mantêm a apresentação vigente.

### Plano TDD

- RED: Verificar a presença do nome acessível e do indicador quando a consulta administrativa estiver vazia, bem como sua ausência nos outros perfis.
- GREEN: Renderizar a indicação permanente no contexto administrativo usando a apresentação responsiva existente.
- REFACTOR: Reutilizar a semântica da tabela e manter carregamento, paginação e navegação das linhas.

### Validação

- `npm run test -- --run src/components/screens/SearchMaterialComponent.test.tsx`
- `npm run test:e2e -- --project=ui e2e/responsive-layout.spec.ts`

### Notas

T006 completa o estado textual por linha do CA-001 com dados classificados.

## T002 — Exibir a quantidade de vidrarias em unidades

- Issue: #467
- Status: concluída
- Dependências: T001
- Paralela: não
- Requisitos: RF-004, CA-008, CA-010
- Caminhos sob responsabilidade: `frontend/src/components/screens/SearchMaterialComponent.tsx`, `frontend/src/components/screens/SearchMaterialComponent.test.tsx`

### Escopo

Formatar a quantidade de vidrarias em Meus Produtos no singular para uma peça e no plural nas demais quantidades. Manter as unidades das outras categorias.

### Critérios de conclusão

A listagem administrativa mostra `1 unidade` e `4 unidades` para vidraria e conserva, por exemplo, litros para químicos.

### Plano TDD

- RED: Testar as quantidades um e quatro e um produto sintético com unidade em litros na apresentação administrativa.
- GREEN: Aplicar a formatação de quantidade por tipo no ponto de apresentação da linha.
- REFACTOR: Concentrar a escolha de unidade e preservar a forma de leitura das outras categorias.

### Validação

- `npm run test -- --run src/components/screens/SearchMaterialComponent.test.tsx`

## T003 — Caracterizar o acesso administrativo vigente a Alertas

- Issue: #466
- Status: concluída
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-003, CA-007
- Caminhos sob responsabilidade: `backend/Tests/Integration/ProductAlertAccessTests.cs`, `frontend/src/routes.test.tsx`

### Escopo

Fixar na suíte os resultados vigentes de autorização de `GET /api/Produtos/emAlerta` e o acesso de navegação. Usar perfis e produto sintéticos.

### Critérios de conclusão

Consulta sem sessão e consulta de perfil sem acesso recebem `401` e `403`, respectivamente, sem dados administrativos. A navegação permite Alertas à administração.

### Plano TDD

- RED: Executar primeiro testes de caracterização de administrador, sessão ausente e perfil sem acesso. Registrar se o comportamento já passa.
- GREEN: Manter no pipeline a política existente e o contrato de não divulgação. Encaminhar uma eventual lacuna nova ao contrato de T005.
- REFACTOR: Reusar as fixtures de autenticação e verificar resposta e corpo sem replicar testes de autenticação genéricos.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~ProductAlertAccessTests"`
- `npm run test -- --run src/routes.test.tsx`

## T004 — Fixar o limite estrito de estoque

- Issue: #466
- Status: concluída
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-002, CA-002, CA-004, CA-005
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Services/ProductStockAlertRule.cs`, `backend/Tests/Services/ProductStockAlertRuleTests.cs`

### Escopo

Entregar o predicado de baixo estoque reutilizável na camada de consulta. Testar a regra funcional de quantidade sem depender de data ou contrato administrativo.

### Critérios de conclusão

Quantidade inferior ao mínimo qualifica e quantidade igual ou superior não qualifica. A avaliação é independente da validade do item.

### Plano TDD

- RED: Testar tabela de valores sintéticos abaixo, igual e acima do mínimo.
- GREEN: Introduzir o predicado estrito em forma consumível pela consulta de T005.
- REFACTOR: Manter o predicado independente de relógio e apresentação. A tradução para PostgreSQL é provada em T005.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~ProductStockAlertRuleTests"`

## T005 — Entregar a projeção administrativa de alertas e capacidade

- Issue: #466
- Status: concluída
- Dependências: T003, T004
- Dependências externas: [T004 de Cadastro](../cadastro-de-produtos/tasks.md) — referência civil, e [T004 de Integridade](../integridade-de-produtos-e-lotes/tasks.md) — recorte de produtos ativos.
- Paralela: não
- Requisitos: RF-001, RF-002, RF-003, RF-004, RNF-001, CA-001, CA-002, CA-003, CA-004, CA-005, CA-007, CA-009
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Controllers/ProdutosController.cs`, `backend/LabSolos-Server-DotNet8/Repositories/ProdutoRepository.cs`, `backend/LabSolos-Server-DotNet8/Services/ProdutoService.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Produtos/ProdutoDTO.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Produtos/ProdutoAlertaDTO.cs`, `backend/Tests/Integration/ProductAlertProjectionTests.cs`
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#cadastro-e-alertas).

### Escopo

Calcular os dois motivos a partir da mesma regra de consulta, expor capacidade numérica anulável nas vidrarias em contrato administrativo aprovado e aplicar o recorte ativo definido para produtos. Conservar consumidores gerais de catálogo.

### Critérios de conclusão

Validade passada, de hoje e no dia dez qualifica, enquanto dia onze e data ausente ficam de fora. O teste real inclui virada controlada, valores legados UTC e produto com ambos os motivos. A rota de alertas entrega apenas itens elegíveis, com uma linha por ID. A projeção exige acesso administrativo e preserva os consumidores gerais.

### Plano TDD

- RED: Exigir paridade da consulta PostgreSQL e da classificação por linha, motivos independentes, leituras legadas e autorização do contrato escolhido.
- GREEN: Consumir o predicado de estoque de T004 e o dia civil fornecido pelo cadastro. Aplicar projeção, autorização e recorte ativo aprovados.
- REFACTOR: Compartilhar a filtragem entre consulta geral administrativa e a aba. Conferir dados ausentes e tradução relacional.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~ProductAlertProjectionTests|FullyQualifiedName~ProductAlertAccessTests"`

## T006 — Apresentar motivos e capacidade nas linhas de Meus Produtos

- Issue: #466
- Status: concluída
- Dependências: T001, T002, T005
- Paralela: não
- Requisitos: RF-001, RF-002, RF-004, RNF-001, CA-001, CA-002, CA-004, CA-008, CA-009, CA-010
- Caminhos sob responsabilidade: `frontend/src/integration/Product.ts`, `frontend/src/integration/Product.alerts.test.ts`, `frontend/src/pages/search/SearchMaterial.tsx`, `frontend/src/components/screens/SearchMaterialComponent.tsx`, `frontend/src/components/screens/SearchMaterialComponent.test.tsx`
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#cadastro-e-alertas).

### Escopo

Consumir a projeção administrativa de T005, apresentar em texto o estado sem alerta ou os motivos da linha e acrescentar ao nome a capacidade da vidraria quando informada.

### Critérios de conclusão

O texto acessível da linha corresponde aos dois motivos independentes. Béqueres de `250 ml` e `500 ml` ficam distinguíveis e uma peça sem capacidade conserva o nome. A pesquisa de outros perfis mantém o modo existente.

### Plano TDD

- RED: Testar o cliente com cada combinação de motivos, o estado sem alerta e os nomes com e sem capacidade.
- GREEN: Conectar o cliente tipado à lista administrativa e formatar nome e motivos sem alterar o produto persistido.
- REFACTOR: Reutilizar a apresentação por tipo de T002 e manter carregamento, paginação e acesso por perfil.

### Validação

- `npm run test -- --run src/integration/Product.alerts.test.ts src/components/screens/SearchMaterialComponent.test.tsx`

## T007 — Derivar filtros e totais dos motivos na aba Alertas

- Issue: #466
- Status: concluída
- Dependências: T005, T006
- Paralela: não
- Requisitos: RF-002, RF-003, CA-002, CA-003, CA-004, CA-005, CA-006
- Caminhos sob responsabilidade: `frontend/src/components/screens/FollowUp.tsx`, `frontend/src/pages/FollowUp.tsx`, `frontend/src/pages/FollowUp.responsive.test.tsx`
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#cadastro-e-alertas).

### Escopo

Usar flags ou motivos tipados recebidos da projeção. Derivar a união por ID, os dois subconjuntos independentes e os totais a partir da mesma classificação. Preservar o feedback de falha e retentativa.

### Critérios de conclusão

Um produto com dois motivos aparece uma vez em Todos e uma vez em cada filtro aplicável. Os cartões contam produtos distintos no geral e produtos elegíveis por motivo. Consulta e filtro sem correspondência apresentam estado vazio sem reapresentar itens.

### Plano TDD

- RED: Testar matriz com zero, um e dois motivos, totais, paginação, busca sem resultado e falha de consulta.
- GREEN: Unificar o cálculo de linhas e cartões com base nos motivos recebidos e distinguir vazio de erro.
- REFACTOR: Remover a inferência pelo complemento e manter a apresentação responsiva.

### Validação

- `npm run test -- --run src/pages/FollowUp.responsive.test.tsx`

## T008 — Atualizar a regra de alertas no manual administrativo

- Issue: #466
- Status: concluída
- Dependências: T006, T007
- Paralela: não
- Requisitos: RF-001, RF-002, RF-003, RF-004, CA-001, CA-002, CA-003, CA-004, CA-008, CA-009
- Caminhos sob responsabilidade: `docs/manual/administrador.md`
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#cadastro-e-alertas).

### Escopo

Atualizar a orientação administrativa depois das entregas de interface. Descrever indicador, motivos e filtros, janela de validade inclusiva e quantidade/capacidade das vidrarias.

### Critérios de conclusão

O manual confere com a regra entregue, incluindo igualdade com o mínimo fora do alerta, dia dez incluso e produto elegível pelos dois motivos.

### Plano TDD

- RED: Revisar a seção vigente e registrar os trechos que divergem das jornadas aprovadas de T006 e T007.
- GREEN: Atualizar as instruções e exemplos diretamente na seção de produtos.
- REFACTOR: Conferir navegação e terminologia com as telas entregues.

### Validação

- `rg -n -i "alertas|abaixo do mínimo|10 dias|vidraria" docs/manual/administrador.md`

## T009 — Comprovar a classificação e as permissões no navegador

- Issue: #466
- Status: concluída
- Dependências: T006, T007
- Dependências externas: [T004 de Proteção da API e do proxy](../protecao-de-api-e-proxy/tasks.md) — envelope paginado do catálogo administrativo consumido pela jornada.
- Paralela: não
- Requisitos: RF-001, RF-002, RF-003, RF-004, RNF-001, CA-001, CA-002, CA-003, CA-004, CA-005, CA-006, CA-007, CA-008, CA-009, CA-010
- Caminhos sob responsabilidade: `frontend/e2e/critical/product-alerts.spec.ts`, `frontend/playwright.config.ts`
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#cadastro-e-alertas).

### Escopo

Validar as duas telas no mesmo inventário sintético e em viewport móvel. Usar contas sintéticas com e sem a permissão administrativa e os limites de estoque e validade aprovados.

### Critérios de conclusão

A navegabilidade, as linhas, os totais, os nomes das vidrarias e a ausência de dados para perfil sem acesso são verificados na jornada integrada.

### Retomada — 2026-11-24

A validação integrada falhava antes de abrir a jornada porque o helper esperava `login.token`, embora o login de navegador use cookie HttpOnly. A autenticação do E2E agora consulta `/Auth/session` e mantém as validações de Alertas, estoque, validade, permissões e vidrarias. Evidência em `evidencias/T009.md`.

### Plano TDD

- RED: Adicionar cenário cruzado que falha quando quantidade, textos acessíveis, recortes ou totais divergem entre os fluxos.
- GREEN: Incluir o cenário na seleção do projeto `real`. Encaminhar correções de produto às tarefas proprietárias.
- REFACTOR: Reutilizar a preparação de contas e produtos sintéticos e isolar os registros da jornada.

### Validação

- `npm run test:e2e:list`
- `npm run test:e2e -- --project=real e2e/critical/product-alerts.spec.ts`

## Log de execução

| Data | Tarefa | Resultado | Testes/evidências | Observações |
|---|---|---|---|---|
| 2026-11-19 | T009 — regressão da paginação | concluída | Atualizei o consumidor do spec para o envelope camelCase em português (`itens`, `pagina`, `tamanhoPagina`, `totalItens`, `totalPaginas`). Primeira tentativa falhou pelo uso de `items` e ficou preservada nos artefatos. Reexecução: `product-alerts.spec.ts` 1/1 e `npm run test:e2e:list` 247/247 em 18 arquivos. | Imagem reconstruída contra API T004. Composição isolada parada sem remover containers ou volumes. Sem mudança em produção. |
| 2026-11-19 | T009 | concluída | `npm run test:e2e:list` selecionou 246 testes/17 arquivos; `npm run test:e2e -- --project=real e2e/critical/product-alerts.spec.ts` passou 1/1; Prettier e `git diff --check` passaram. | Jornada real sintética cobre motivos, validade, limites de estoque, filtros, unidades/capacidades de vidrarias, viewport móvel e recusa de acesso do mentor. Expectativa de unidade corrigida para preservar `Litro`; serviços parados sem remover volumes. |
| 2026-11-19 | T008 | concluída | RED documental contra HEAD; GREEN após revisão do manual. `rg -n -i "alertas|abaixo do mínimo|10 dias|vidraria" docs/manual/administrador.md` e `git diff --check -- docs/manual/administrador.md` passaram. | Manual alinhado à regra estrita de estoque, janela inclusiva de 10 dias, motivos independentes, produtos distintos, capacidade e unidade de vidrarias. |
| 2026-11-19 | T007 | concluída | RED: linha de base passou; novos cenários falharam pela ausência de consumo dos motivos. GREEN: 5/5 testes dirigidos, ESLint e build aprovados. | A aba deriva união, filtros e totais da projeção tipada; deduplica por ID, preserva os dois motivos, busca, paginação, erro e retentativa. |
| 2026-11-19 | T006 | concluída | RED: cliente inexistente. GREEN: 23/23 Vitest, ESLint, TypeScript/build e `git diff --check` passaram. | Catálogo administrativo tipado, motivos independentes e capacidade ml por linha; outros perfis preservados. Build manteve avisos de env.js, imagem ausente e chunks grandes. |
| 2026-11-18 | T005 | concluída | RED: 3 testes falharam pela ausência da rota. GREEN: 18/18 integrações PostgreSQL, incluindo autorização e ciclo de vida; compilação e `git diff --check` aprovados. | Nova projeção administrativa calcula motivos independentes, deduplica produtos e inclui capacidade anulável. Usa o predicado compartilhado de estoque, exclui desativados e preserva os contratos gerais e legado. |
| 2026-11-16 | T003 | concluída | Caracterização: 5/5 testes HTTP, 29/29 de rotas (25 na base), ESLint dirigido e diff --check. | Acesso administrativo vigente coberto com dados sintéticos. Nenhuma política de produção alterada. |
| 2026-11-16 | T004 | concluída | Baseline 4/4; RED por novo símbolo ausente. GREEN 17/17; refactor e regressão 34/34. | Regra estrita disponível como expressão. Consumo nas consultas e validação PostgreSQL permanecem em T005. |
| 2026-11-16 | T001 | concluída | RED: dois cenários admin sem indicador. GREEN 14/14; lint/build; 30 cenários E2E validados em 5 larguras, com reteste isolado de 3. | Primeiro lote 29/30 por timeout no helper de layout; reteste com 1 worker aprovou o caso sem mudar timeout. Backend integrado 485/485. |
| 2026-11-16 | T002 | concluída | RED: três falhas de apresentação e busca. GREEN/REFACTOR 17/17 e ESLint dirigido. | Vidrarias em unidades no catálogo administrativo. Químicos, outros tipos e demais perfis preservam suas unidades. |

| 2026-11-24 | T009 retomada sessão | concluída | RED: HTTP 200 não trazia `login.token`; GREEN: jornada real 1/1, discovery 255/255, ESLint, Prettier e `git diff --check` aprovados. | Helper consulta `/Auth/session`, usa cookie HttpOnly e CSRF; verificações de alertas, validade, estoque, vidrarias, mobile e 403 permaneceram. Stack/artefatos exclusivos removidos, tsbuildinfo preservado; evidência T009. |
