# Tarefas: Exibição de datas de produtos no padrão brasileiro

- Status: planejado
- PRD: `./prd.md`
- Especificação técnica: `./techspec.md`
- Atualizado em: 2026-11-25

## Ondas de execução

| Onda | Tarefas | Motivo de segurança do paralelismo |
|---|---|---|
| 1 | T001, T002 | T001 altera apenas mapeamentos e testes do backend; T002 altera apenas o formatador civil e seus testes no frontend. Os diretórios e contratos de saída são distintos. |
| 2 | T003, T004 | Ambas dependem de T002 e modificam superfícies e testes separados: acompanhamento de alertas versus detalhe do produto. |
| 3 | T005 | Validação integrada somente após todos os mapeamentos, formatador e telas estarem concluídos. |

## Coordenação com a issue #508

A tarefa #508 que atualizar `parseCivilDateInput` e `DateInput` também precisa alterar `frontend/src/function/date.ts` e seus testes. Por isso, integrar primeiro esta issue até concluir T002; só então iniciar a tarefa central de #508 que altera esses arquivos. Após T002, as tarefas de tela T003/T004 podem ocorrer em paralelo com essa tarefa de #508, pois têm caminhos de responsabilidade distintos.

## T001 — Projetar datas civis de produto no contrato ISO

- Status: concluída
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-001, RF-002, RF-003, RNF-001, CA-002, CA-003, CA-005
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Mappings/ProductCivilDateFormatter.cs`, `backend/LabSolos-Server-DotNet8/Mappings/ProdutoMappingProfile.cs`, `backend/LabSolos-Server-DotNet8/Mappings/EmprestimoMappingProfile.cs`, `backend/Tests/Mappings/ProductDateMappingTests.cs`

### Escopo

Leia o PRD e a especificação técnica. Adicione testes de leitura dos DTOs para datas válidas, datas nulas e `DateTime.MinValue`, cobrindo `ProdutoDTO`, `ProdutoAlertaDTO`, `QuimicoDTO`, `VidrariaDTO` e `ProdutoAcompanhamentoDTO`. Verifique datas sob culturas `pt-BR` e `en-US` e a serialização JSON como `yyyy-MM-dd` ou `null`, sem horário. Implemente um formatador civil backend reutilizável nos mapas de produto; converta o sentinel `0001-01-01` em `null` somente na projeção de leitura. Não altere valores persistidos, datas próprias de `Lote` nem instantes operacionais.

### Critérios de conclusão

- Todos os DTOs de leitura listados em `techspec.md` expõem a mesma data civil como `yyyy-MM-dd`.
- Datas ausentes e `DateTime.MinValue` são projetados como `null`; a persistência e os caminhos de escrita não recebem migração ou regravação nesta tarefa.
- A data civil permanece inalterada entre culturas e não inclui horário ou deslocamento de fuso.
- O teste AutoMapper de configuração permanece válido.

### Plano TDD

- RED: ampliar `ProductDateMappingTests` com as projeções e serialização descritas; observar falha por formatação dependente de cultura, horário ou sentinel visível.
- GREEN: adicionar o formatador civil backend e aplicá-lo aos mapas base, especializados e de acompanhamento de produto.
- REFACTOR: remover conversões implícitas/gerais apenas das datas civis de `Produto`, mantendo os mapas de lote e timestamps operacionais intactos.

### Validação

- `dotnet test backend/Tests/Tests.csproj --filter "FullyQualifiedName~ProductDateMappingTests"`
- `dotnet test backend/Tests/Tests.csproj --filter "FullyQualifiedName~MappingConfigurationTests"`

### Notas

- A data recebida pelo fluxo de escrita permanece no contrato ISO existente. Não inferir texto regional ambíguo nem mudar regras de cadastro nesta issue.
- O endpoint de resposta deve manter nomes e estrutura JSON; somente o valor textual das datas de produto se torna canônico.

## T002 — Tratar sentinels e ausências no formatador civil frontend

- Status: concluída
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-003, CA-004
- Caminhos sob responsabilidade: `frontend/src/function/date.ts`, `frontend/src/function/date.test.ts`

### Escopo

Leia o PRD e a especificação técnica. Caracterize o comportamento atual e acrescente casos para `0001-01-01`, `null`, vazio, ISO inválido e texto legado regional ou com horário. Faça `formatCivilDate` retornar `Não informado` para ausência, sentinel ou entrada inválida, e preservar a apresentação `dd/MM/yyyy` apenas para uma data ISO válida.

### Critérios de conclusão

- `2026-11-13` aparece como `13/11/2026` sem conversão de fuso.
- `0001-01-01`, `null`, vazio e valores não aceitos aparecem como `Não informado`.
- Os formatadores de instantes usados por outros domínios mantêm seu comportamento.
- A implementação continua compondo dia, mês e ano sem criar um objeto `Date` para a data civil.

### Plano TDD

- RED: adicionar testes de sentinel, ausência, texto legado e ISO inválido em `date.test.ts`; observar que o sentinel hoje pode aparecer como `01/01/0001`.
- GREEN: ajustar `formatCivilDate` para rejeitar o sentinel e retornar o estado de ausência já adotado.
- REFACTOR: centralizar a validação sem alterar `parseCivilDateInput` nem os formatadores de instantes que não pertencem a esta issue.

### Validação

- `cd frontend; npm run test -- --run src/function/date.test.ts`

### Notas

- `date.ts` é compartilhado com a issue #508. A implementação de controles de entrada pode consumir `parseCivilDateInput`, mas não deve duplicar nem alterar o comportamento de `formatCivilDate` sem coordenação.

## T003 — Formatar validade no acompanhamento de alertas

- Status: concluída
- Dependências: T002
- Paralela: sim
- Requisitos: RF-001, RF-002, RNF-001, RNF-002, CA-001, CA-002, CA-003, CA-006
- Caminhos sob responsabilidade: `frontend/src/pages/FollowUp.tsx`, `frontend/src/pages/FollowUp.responsive.test.tsx`

### Escopo

Leia o PRD e a especificação técnica. No campo **Data de Validade** do acompanhamento, apresente os valores ISO recebidos com `formatCivilDate`. Cubra data válida, `null` e resposta inesperada nos testes de tela, garantindo que não seja exibido texto bruto, `null` textual ou horário.

### Critérios de conclusão

- Uma resposta `2026-11-13` é exibida como `13/11/2026`.
- Respostas ausentes ou inválidas usam `Não informado`.
- O texto exposto pela tabela permanece associado ao rótulo **Data de Validade** e legível por tecnologia assistiva.
- Filtros, paginação, busca e navegação existentes continuam cobertos e funcionando.

### Plano TDD

- RED: adicionar ao teste responsivo um produto com data ISO válida e outro sem data; confirmar a falha da apresentação atual, que renderiza o valor diretamente.
- GREEN: formatar a coluna com o helper civil compartilhado.
- REFACTOR: manter o conteúdo acessível associado ao cabeçalho/coluna e evitar lógica de conversão local duplicada.

### Validação

- `cd frontend; npm run test -- --run src/pages/FollowUp.responsive.test.tsx`

### Notas

- A filtragem de quais produtos entram na aba de alertas não faz parte da #507; preservar a regra atual.

## T004 — Exibir fabricação e validade no detalhe do produto

- Status: concluída
- Dependências: T002
- Paralela: sim
- Requisitos: RF-001, RF-002, RNF-001, RNF-002, CA-003, CA-005, CA-006
- Caminhos sob responsabilidade: `frontend/src/components/screens/VerificationPage.tsx`, `frontend/src/components/screens/VerificationPage.navigation.test.tsx`, `frontend/src/components/screens/VerificationPage.responsive.test.tsx`

### Escopo

Leia o PRD e a especificação técnica. Inclua as datas de fabricação e validade nas informações do detalhe do produto, para os perfis e tipos que exibem os dados do produto, usando o helper civil compartilhado. Atualize o tipo de resposta local se a nulabilidade exigir. Cubra data válida, ausência e mais de um tipo de produto em teste; ajuste as expectativas responsivas existentes para incluir os novos campos.

### Critérios de conclusão

- Fabricação e validade aparecem como `dd/MM/yyyy`, sem horário nem deslocamento de dia.
- A ausência é apresentada como `Não informado`, nunca como `null` ou string técnica bruta.
- Os rótulos identificam claramente **Data de Fabricação** e **Data de Validade**, e o texto é acessível.
- A navegação, consulta por perfil e demais informações existentes no detalhe permanecem preservadas.

### Plano TDD

- RED: acrescentar testes ao detalhe para datas válidas e ausentes, inicialmente observando que os campos não são exibidos.
- GREEN: incluir os dois campos no modelo de informações do detalhe e formatá-los com `formatCivilDate`.
- REFACTOR: manter a regra de apresentação única para produtos químicos, vidrarias e outros, sem repetir parsing ou criar `Date` para datas civis.

### Validação

- `cd frontend; npm run test -- --run src/components/screens/VerificationPage.navigation.test.tsx`

### Notas

- Campos de edição e seleção de datas continuam no escopo de #508.

## T005 — Validar o contrato integrado nas superfícies de produto

- Status: concluída (limitação ambiental registrada)
- Dependências: T001, T002, T003, T004
- Paralela: não
- Requisitos: RF-001, RF-002, RF-003, RNF-001, RNF-002, CA-001, CA-002, CA-003, CA-004, CA-005, CA-006
- Caminhos sob responsabilidade: nenhum (validação somente)

### Escopo

Leia o PRD e a especificação técnica. Execute as suítes direcionadas e amplas após integrar as tarefas. Confira manualmente a lista/aba de alertas e os detalhes de produto químico, vidraria e outro tipo, incluindo data ausente. Compare o valor recebido pela API com o apresentado e inspecione a árvore acessível; confirme que não houve mudança em lote, empréstimo, auditoria, nem nos campos de edição da #508.

### Critérios de conclusão

- Todos os comandos direcionados e amplos passam, ou falhas preexistentes ficam registradas com evidência e sem serem atribuídas à mudança.
- As telas de leitura seguem `dd/MM/yyyy`, não exibem hora nem sentinel, e mantêm o dia civil.
- Fabricação e validade são compreensíveis por texto e tecnologias assistivas.
- A implementação permanece limitada aos dados e superfícies de produto especificados.

### Plano TDD

- RED: não aplicável; esta tarefa não altera comportamento. Os testes de regressão e de aceite foram escritos nas tarefas T001 a T004 e servem como verificações de integração.
- GREEN: executar os comandos e conferências manuais listados; corrigir qualquer regressão na tarefa proprietária correspondente antes de concluir.
- REFACTOR: não aplicável; registrar resultados e evidências sem introduzir mudanças funcionais nesta tarefa.

### Validação

- `dotnet test backend/Tests/Tests.csproj --artifacts-path "$env:TEMP\lab-solos-date-validation"`
- `cd frontend; npm run test -- --run`
- `cd frontend; npm run lint`
- `cd frontend; npm run build`

### Notas

- Testes de integração PostgreSQL podem depender do Docker, conforme o workflow de CI. Registrar essa dependência caso impeça a validação local.
- Nenhum teste é executado durante a criação deste plano.

## Log de execução

| Data | Tarefa | Resultado | Testes/evidências | Observações |
|---|---|---|---|---|
| 2026-11-25 | T001 | Concluída | RED: 3 casos novos falharam conforme esperado; GREEN/REFACTOR: `ProductDateMappingTests` 12/12 e `MappingConfigurationTests` 1/1 | Testou `pt-BR`/`en-US`, DTOs de produto/alerta/químico/vidraria/acompanhamento, JSON ISO/null e sentinel. Build direcionado isolado em diretório temporário para preservar artefatos já removidos do working tree. Sem alteração no GitHub. |
| 2026-11-25 | T002 | Concluída | RED: `formatCivilDate` exibia `01/01/0001`; GREEN/REFACTOR: `date.test.ts` 32 testes passaram; ESLint direcionado passou | `formatCivilDate` agora mostra `Não informado` para sentinel, ausências e entradas inválidas. `parseCivilDateInput` ficou intacto para a #508. Sem alteração no GitHub. |
| 2026-11-25 | T003 | Concluída | RED: tela exibia `2026-11-13`; GREEN/REFACTOR: teste responsivo 6/6 e ESLint direcionado passaram | A tabela de acompanhamento formata validade e trata ausências/legados com `formatCivilDate`; modificações preexistentes da lista foram preservadas. Sem alteração no GitHub. |
| 2026-11-25 | T004 | Concluída | Linha de base 13/13; RED: 4 cenários sem rótulos/datas; GREEN: teste de navegação 17/17. A validação ampla encontrou 3 expectativas responsivas antigas; após ajustá-las, teste responsivo+navegação 27/27 e ESLint direcionado passaram | Detalhe apresenta fabricação e validade em três perfis/tipos, inclusive nulos; teste responsivo agora inclui os campos para os três perfis. Modificações preexistentes na tela foram preservadas. Sem alteração no GitHub. |
| 2026-11-25 | T005 | Concluída com limitação ambiental | Frontend: 158/158 arquivos e 1050/1050 testes passaram após atualizar expectativas responsivas; `npm run lint` e `npm run build` passaram. Backend: 413/849 passaram; 436 falharam ao iniciar dependências de integração porque o daemon Docker não está disponível | Preview local do `DateInput` em zoom de 175% mostrou formulário em uma coluna e calendário sem corte horizontal; árvore acessível expôs diálogo, ano, mês, dias da semana e navegação. Escape fechou o calendário. Não foi possível acessar telas protegidas da aplicação sem autenticação; a inspeção visual foi isolada no componente compartilhado. Avisos de build existentes: `/env.js`, imagem ausente e chunks grandes. `tsconfig.app.tsbuildinfo` preservado. Nenhuma alteração no GitHub. |
