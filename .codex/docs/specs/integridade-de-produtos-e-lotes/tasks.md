# Tarefas de integridade de produtos, lotes e histórico de saída

- Status: concluída sob exceção explícita do usuário — artefato sintético pronto; conferência real dispensada
- PRD: [prd.md](./prd.md)
- Especificação técnica: [techspec.md](./techspec.md)
- Atualizado em: 2026-11-24

Leia o PRD e a especificação técnica antes de cada tarefa. Use dados sintéticos nos testes e registre no log as evidências de cada execução.

## Ondas de execução

| Onda | Tarefas | Motivo de segurança do paralelismo |
|---|---|---|
| 1 | T001, T002, T005 | A minimização visível, o patch de produto e a guarda de conta têm posses distintas. Apenas T001 está pronta. |
| 2 | T003, T004 | O cliente do patch consome T002 enquanto o ciclo de vida trabalha no backend. |
| 3 | T006 | A consulta interna consome a fonte de saída transacional. |
| 4 | T007, T009 | A projeção autorizada de histórico e o cadastro/consulta de lotes usam serviços, rotas e testes distintos. |
| 5 | T008, T010 | Os consumidores do histórico e o roteiro de conferência das lacunas tratam artefatos distintos. |
| 6 | T011 | Valida o comportamento cruzado de edição, desativação e histórico na mesma superfície. |

Avance nas tarefas prontas. Para tarefas bloqueadas, as ondas indicam a posição prevista após a liberação das decisões.

Coordenação entre planos: serializar alterações em `ProdutosController.cs`, `ProdutoService.cs`, `Product.ts` e `VerificationPage.tsx` com [Cadastro](../cadastro-de-produtos/tasks.md) e [Alertas](../listagem-e-alertas-de-produtos/tasks.md). Agendar mudanças nos comandos de conta com [Contas](../seguranca-de-contas-e-sessoes/tasks.md), e mudanças em schema e persistência com [Empréstimos](../decisoes-e-devolucoes-de-emprestimos/tasks.md).

## Validação comum

Na raiz, preparar com `dotnet restore backend/backend.sln --locked-mode` e `dotnet build backend/backend.sln --no-restore -c Release`. Reexecutar a suíte com `dotnet test backend/backend.sln --no-build --no-restore -c Release`. Iniciar Docker para os testes PostgreSQL do projeto de testes.

Em `frontend/`, preparar com `npm ci`. Além dos recortes abaixo, executar `npm run test -- --run`, `npm run lint` e `npm run build`.

Para o projeto `real`, iniciar na raiz a pilha sintética com `docker compose -f docker-compose-e2e.yml up -d --build --wait`. Em `frontend/`, instalar Chromium com `npx --no-install playwright install chromium`, conferir a seleção com `npm run test:e2e:list` e executar `npm run test:e2e -- --project=real --project=ui` na validação completa de navegador.

## T001 — Retirar e-mail e identificador derivado da interface de histórico

- Issue: #476
- Status: concluída
- Dependências: nenhuma
- Paralela: não
- Requisitos: RF-004, RNF-002, CA-006
- Caminhos sob responsabilidade: `frontend/src/integration/Product.ts`, `frontend/src/components/screens/VerificationPage.tsx`, `frontend/src/components/screens/VerificationPage.responsive.test.tsx`, `frontend/src/pages/products/ProductHistory.tsx`, `frontend/src/pages/products/ProductHistory.errors.test.tsx`

### Escopo

Retirar a renderização e a busca de e-mail e de identificador derivado nas duas superfícies. Usar campos de operação já exibidos que sejam independentes do e-mail. A autorização e a projeção definitiva da API ficam em T007.

### Critérios de conclusão

Com resposta legada sintética contendo e-mail e identificador derivado, os valores não aparecem e uma busca por eles não retorna a linha. O histórico continua consultável pelos campos operacionais já suportados.

### Plano TDD

- RED: Testar ausência de texto e de resultado de busca com e-mail e identificador sintéticos exclusivos na resposta.
- GREEN: Retirar colunas, rótulos e predicados que dependem dos campos em ambas as telas e do consumo tipado.
- REFACTOR: Conservar a apresentação responsiva e revisar os testes de navegação e erro após alterar as colunas.

### Validação

- `npm run test -- --run src/components/screens/VerificationPage.responsive.test.tsx src/pages/products/ProductHistory.errors.test.tsx`

## T002 — Aplicar somente alterações explícitas no patch de produto

- Issue: #474
- Status: concluída
- Dependências: nenhuma
- Dependências externas: [T004 de Empréstimos](../decisoes-e-devolucoes-de-emprestimos/tasks.md) — fronteira de consistência dos escritores de estoque.
- Paralela: não
- Requisitos: RF-001, RNF-001, CA-001, CA-002
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Controllers/ProdutosController.cs`, `backend/LabSolos-Server-DotNet8/Services/ProdutoService.cs`, `backend/LabSolos-Server-DotNet8/Mappings/ProdutoMappingProfile.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Produtos/ProdutoDTOPatchRequest.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Produtos/ProdutoDTOPatchResponse.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Produtos/PatchProdutoDTO.cs`, `backend/Tests/Controllers/ProdutosControllerTests.cs`, `backend/Tests/Integration/ProductExplicitPatchTests.cs`
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#empréstimos-e-integridade).

### Escopo

Validar os caminhos e operadores aprovados antes de alterar a entidade. Aplicar só mudanças explícitas autorizadas. Inspecionar os consumidores de PUT para decidir sua continuidade conforme D1. Coordenar eventuais caminhos de saldo com a fronteira partilhada.

### Critérios de conclusão

Reconsulta confirma campos omitidos e vínculos intactos, remoção permitida na condição aprovada e recusa integral de operação inválida ou vedada. Erro aponta campo ou operador e a API conserva a autorização vigente.

### Plano TDD

- RED: Cobrir omissão, limpeza explícita do campo permitido, operação inválida junto de outra válida e preservação do produto por contexto independente.
- GREEN: Aplicar a matriz aprovada a cada operação antes de mapear e gravar as mudanças explícitas.
- REFACTOR: Reusar validações de tipo equivalentes e remover dependência de remapeamento integral no caminho parcial.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~ProdutosControllerTests|FullyQualifiedName~ProductExplicitPatchTests|FullyQualifiedName~ProductDateMappingTests"`

## T003 — Enviar só alterações autorizadas no editor

- Issue: #474
- Status: concluída
- Dependências: T002
- Paralela: não
- Requisitos: RF-001, RNF-001, CA-001, CA-002
- Caminhos sob responsabilidade: `frontend/src/components/modals/ProductEditModal.tsx`, `frontend/src/components/modals/ProductEditModal.test.tsx`
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#empréstimos-e-integridade).

### Escopo

Representar diferenças em relação à versão lida e sinalizar explicitamente a remoção autorizada. Consumir o contrato de erro por campo/operação e manter o estado editável após recusa.

### Critérios de conclusão

A edição envia apenas dados modificados, distingue omissão e limpeza e apresenta a condição impeditiva sem afirmar que gravou.

### Plano TDD

- RED: Verificar operação contendo apenas o campo alterado, limpeza explícita aprovada, erro por campo e reconsulta do resultado.
- GREEN: Mapear o estado do editor para o contrato aprovado e preservar os campos omitidos.
- REFACTOR: Reusar o tratamento de erros existente e manter o diálogo utilizável pelo teclado.

### Validação

- `npm run test -- --run src/components/modals/ProductEditModal.test.tsx`

## T004 — Preservar vínculos na exclusão e desativação de produtos

- Issue: #474
- Status: concluída
- Dependências: nenhuma
- Dependências externas: [T004 de Empréstimos](../decisoes-e-devolucoes-de-emprestimos/tasks.md) — fronteira de consistência que preserva saldo e saídas.
- Paralela: não
- Requisitos: RF-002, RF-005, RNF-001, CA-003, CA-004
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Controllers/ProdutosController.cs`, `backend/LabSolos-Server-DotNet8/Controllers/EmprestimosController.cs`, `backend/LabSolos-Server-DotNet8/Services/ProductLifecycleService.cs`, `backend/LabSolos-Server-DotNet8/Services/LoanDecisionService.cs`, `backend/LabSolos-Server-DotNet8/Repositories/ProdutoRepository.cs`, `backend/LabSolos-Server-DotNet8/Repositories/UnitOfWork.cs`, `backend/LabSolos-Server-DotNet8/Models/Produto.cs`, `backend/LabSolos-Server-DotNet8/Data/Context/AppDbContext.cs`, `backend/LabSolos-Server-DotNet8/Data/Migrations/**`, `backend/Tests/Repositories/ProdutoRepositoryTests.cs`, `backend/Tests/Integration/ProductLifecycleTests.cs`
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#empréstimos-e-integridade).

### Escopo

Aplicar a matriz de exclusão, desativação e reativação aprovada. Proteger a checagem de dependências na mesma fronteira que cria vínculos. Entregar o recorte de catálogo ativo para produtos e Alertas, integrar a elegibilidade de solicitação e aprovação e disponibilizar a regra de devolução para T005 de Empréstimos.

### Critérios de conclusão

Exclusão com dependência impeditiva conserva produto e referências. Quando admitida, desativação retira do catálogo ativo e preserva identidade e registros, inclusive sob concorrência com criação de vínculos. A consulta cruzada do histórico cabe a T011.

### Plano TDD

- RED: Testar recusa, desativação com saídas sintéticas, inelegibilidade de nova solicitação e a disputa entre exclusão e vínculo em PostgreSQL. Verificar restrições, estado e preservação dos dados após reconsulta.
- GREEN: Implementar somente as transições e o recorte aprovados, com proteção relacional e estratégia de estoque compartilhada.
- REFACTOR: Revisar a distinção entre disponibilidade operacional e ciclo de vida e verificar migração aditiva se D1 a exigir.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~ProdutoRepositoryTests|FullyQualifiedName~ProductLifecycleTests"`

### Notas

Issue adicional #476. Entrega o recorte ativo para Alertas.

## T005 — Impedir a retirada do último administrador habilitado

- Issue: #474
- Status: concluída
- Dependências: nenhuma
- Dependências externas: [T003 de Contas](../seguranca-de-contas-e-sessoes/tasks.md) — matriz de conta e política reutilizável.
- Paralela: não
- Requisitos: RF-003, RNF-001, CA-005
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/UserProfileUpdateService.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/AdminContinuityGuard.cs`, `backend/LabSolos-Server-DotNet8/Repositories/UnitOfWork.cs`, `backend/LabSolos-Server-DotNet8/Data/Context/AppDbContext.cs`, `backend/Tests/Integration/UserProfileMutationTests.cs`, `backend/Tests/Integration/AdminContinuityTests.cs`
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#empréstimos-e-integridade).

### Escopo

Implementar a guarda única para desativação, exclusão e qualquer mudança de estado ou papel que retire um administrador habilitado. Usar a matriz compartilhada de Contas, definir uma fronteira transacional e integrar os caminhos existentes. A nova concessão administrativa de Contas pode chamar a mesma guarda.

### Critérios de conclusão

A última conta habilitada é preservada com resposta de continuidade inequívoca. Com duas contas em disputa, no mínimo uma permanece habilitada após reconsulta em contexto independente. Perfil e estado seguem a definição compartilhada.

### Plano TDD

- RED: Testar exclusão, desativação, retirada por mudança de papel ou estado e concorrência entre alvos distintos usando PostgreSQL e contas sintéticas.
- GREEN: Aplicar a guarda aos caminhos pertinentes dentro da transação e preservar o comando em recusa.
- REFACTOR: Compartilhar o predicado de administrador habilitado com a política de Contas e reunir a verificação transacional em um serviço.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~AdminContinuityTests|FullyQualifiedName~UserProfileMutationTests"`

### Notas

A guarda e sua prova concorrente pertencem a esta tarefa. A concessão de Contas consome a guarda e permanece uma etapa distinta.

## T006 — Selecionar apenas saídas com evidência efetiva

- Issue: #476
- Status: concluída
- Dependências: nenhuma
- Dependências externas: [T004 de Empréstimos](../decisoes-e-devolucoes-de-emprestimos/tasks.md) — saída efetivada e lote do evento.
- Paralela: não
- Requisitos: RF-005, CA-004, CA-008, CA-009
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Services/ProductEffectiveOutflowQuery.cs`, `backend/Tests/Integration/ProductEffectiveOutflowTests.cs`
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#empréstimos-e-integridade).

### Escopo

Construir a fonte interna de saídas comprovadas a partir da decisão transacional, com devoluções posteriores e preservação após desativação. Projetar o lote associado ao evento quando comprovado. Classificar como lacuna os legados sem evidência suficiente.

### Critérios de conclusão

A saída efetiva aparece uma vez, inclusive se devolvida. Solicitações pendentes e rejeitadas sem resultado comprovado ficam fora de linhas e totais. A troca de lote corrente não altera o lote do evento.

### Plano TDD

- RED: Usar uma base relacional sintética com cada estado, saída posteriormente devolvida, lote corrente diferente e legado sem evidência.
- GREEN: Consumir a fonte de movimento aprovada e devolver a projeção interna de eventos e lacunas.
- REFACTOR: Conservar o contrato de origem e compartilhar predicados usados posteriormente na consulta autorizada.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~ProductEffectiveOutflowTests"`

## T007 — Aplicar autorização e minimização no histórico

- Issue: #476
- Status: concluída
- Dependências: T006
- Paralela: não
- Requisitos: RF-004, RF-005, RNF-002, CA-006, CA-007, CA-008, CA-009
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Controllers/ProdutosController.cs`, `backend/LabSolos-Server-DotNet8/Services/ProdutoService.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/ProductHistoryAccessService.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Produtos/HistoricoSaidaProdutoDTO.cs`, `backend/Tests/Contracts/ProductHistoryPrivacyTests.cs`, `backend/Tests/Integration/ProductHistoryScopeTests.cs`
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#empréstimos-e-integridade).

### Escopo

Autorizar ator e recurso conforme D2 antes de materializar projeção. Usar a mesma fonte efetiva e o mesmo recorte para linhas e totais. Formar a lista explícita de campos permitidos por perfil e vínculo, com proteção de dados aplicada desde a primeira alteração da rota.

### Critérios de conclusão

Consulta parcial devolve apenas as linhas, campos e totais autorizados. A resposta inteira omite e-mail e derivados, inclusive em campos aninhados. Ator sem vínculo recebe a resposta aprovada sem dados do histórico. Ator autorizado sem saídas no escopo recebe `200` vazio com totais zero.

### Plano TDD

- RED: Testar perfil e vínculo sintéticos, conjuntos mistos, resumo restrito e ausência de campos pessoais fora da projeção em toda a resposta. Usar saídas efetivas de T006.
- GREEN: Aplicar a política aprovada antes da projeção e calcular o resumo do conjunto filtrado.
- REFACTOR: Eliminar projeções duplicadas e manter o predicado de autorização comum para linhas e totais.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~ProductHistoryPrivacyTests|FullyQualifiedName~ProductHistoryScopeTests|FullyQualifiedName~ProductEffectiveOutflowTests"`

## T008 — Exibir os campos autorizados nas duas telas de histórico

- Issue: #476
- Status: concluída
- Dependências: T001, T007
- Paralela: não
- Requisitos: RF-004, RF-005, RNF-002, CA-006, CA-007, CA-008, CA-009
- Caminhos sob responsabilidade: `frontend/src/integration/Product.ts`, `frontend/src/integration/Product.history.test.ts`, `frontend/src/components/screens/VerificationPage.tsx`, `frontend/src/components/screens/VerificationPage.navigation.test.tsx`, `frontend/src/components/screens/VerificationPage.responsive.test.tsx`, `frontend/src/pages/products/ProductHistory.tsx`, `frontend/src/pages/products/ProductHistory.navigation.test.tsx`, `frontend/src/pages/products/ProductHistory.errors.test.tsx`
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#empréstimos-e-integridade).

### Escopo

Alinhar tipos, colunas, pesquisa e totais da consulta ao contrato de histórico minimizado. Lidar com campos permitidos nulos e distinguir resultado vazio autorizado de recusa.

### Critérios de conclusão

As telas mostram apenas os campos permitidos, tratam lote ausente e não reutilizam linhas ou resumos de outro recorte. Resposta vazia e recusa são distinguidas no fluxo.

### Plano TDD

- RED: Testar dados parciais e nulos, lote do evento, vazio com totais zero e recusa sem dados, mantendo a garantia de T001.
- GREEN: Consumir a nova projeção tipada e mapear dados ausentes/erros à experiência existente.
- REFACTOR: Reutilizar os tipos e apresentação equivalentes entre detalhe e histórico, preservando navegação e pesquisa permitida.

### Validação

- `npm run test -- --run src/integration/Product.history.test.ts src/components/screens/VerificationPage.responsive.test.tsx src/pages/products/ProductHistory.errors.test.tsx`

## T009 — Gravar e recuperar o lote vinculado

- Issue: #486
- Status: concluída
- Dependências: nenhuma
- Dependências externas: [T004 de Empréstimos](../decisoes-e-devolucoes-de-emprestimos/tasks.md) — fronteira compartilhada para lote capturado e inventário.
- Paralela: não
- Requisitos: RF-006, RNF-001, CA-010, CA-011
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Controllers/LotesController.cs`, `backend/LabSolos-Server-DotNet8/Services/LoteService.cs`, `backend/LabSolos-Server-DotNet8/Repositories/LoteRepository.cs`, `backend/LabSolos-Server-DotNet8/Mappings/LoteMappingProfile.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Lotes/AddLoteDTO.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Lotes/LoteDTO.cs`, `backend/LabSolos-Server-DotNet8/Models/Lote.cs`, `backend/LabSolos-Server-DotNet8/Models/Produto.cs`, `backend/LabSolos-Server-DotNet8/Data/Context/AppDbContext.cs`, `backend/LabSolos-Server-DotNet8/Data/Migrations/`, `backend/Tests/Integration/LoteInventoryLinkTests.cs`, `backend/Tests/Services/LoteValidationTests.cs`
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#empréstimos-e-integridade).

### Escopo

Validar código, números, datas, enums e referência segundo D3. Gravar lote e vínculo de inventário em uma transação e recuperar por ID ou código e na leitura do inventário. Preservar estoque e relações anteriores.

### Critérios de conclusão

Em sucesso, a localização e as consultas retornam lote e associação coerentes. Em recusa de número, data, enum, vínculo ou código, o campo/causa é identificável e nenhum lote nem associação incompleta permanece.

### Plano TDD

- RED: Testar as regras por tipo, concorrência na unicidade onde aprovada e a reconsulta PostgreSQL por cada referência, inclusive após recusa.
- GREEN: Aplicar o contrato e a estratégia de vínculo autorizados e manter a gravação atômica.
- REFACTOR: Concentrar as validações equivalentes, preservar a leitura prévia e verificar eventual migração aditiva.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~LoteInventoryLinkTests|FullyQualifiedName~LoteValidationTests"`

## T010 — Conferir vínculos anteriores e registrar lacunas

- Issue: #486
- Status: concluída sob exceção explícita do usuário — conferência real não realizada
- Dependências: T009
- Paralela: não
- Requisitos: RF-007, CA-012
- Caminhos sob responsabilidade: `.codex/docs/specs/integridade-de-produtos-e-lotes/conferencia-de-lotes.md`
- Limite operacional: fontes reais, recorte operacional e responsável nominal ainda não foram confirmados. Esta execução cobre somente o procedimento/casos sintéticos locais; nenhuma conferência de dados reais. Ver [decisão de planejamento](../decisoes-de-planejamento.md#empréstimos-e-integridade).
- Avanço local: formulário, checklist somente leitura, projeção mínima para Conciliação e três classificações sintéticas concluídos em `conferencia-de-lotes.md`; fontes, corte, responsáveis e autorização reais continuam pendentes.
- Exceção de aceite T010: em 2026-11-24 o usuário autorizou encerrar sem consultar fontes reais; o conteúdo sintético não comprova vínculos operacionais. Ver [registro da dispensa](./evidencias/T010-dispensa.md).

### Escopo

Definir com a operação recorte, fontes, responsáveis e evidência mínima segundo D3. Exercitar o roteiro com inventário sintético. A conferência operacional posterior é somente leitura, no recorte autorizado, com repasse de lacunas à conciliação.

### Critérios de conclusão

A evidência registra recorte, vínculo comprovado, ausente ou inconsistente, referência da fonte e encaminhamento. A validação local usa cenários sintéticos e nenhuma regularização faz parte desta tarefa.

### Plano TDD

- RED: Conferir o roteiro com três categorias de vínculo sintético e registrar onde faltava evidência ou classificação.
- GREEN: Preencher o modelo para cada caso e descrever o resultado mínimo consumível por Conciliação operacional.
- REFACTOR: Excluir informações além das referências mínimas e preservar rastreabilidade entre fonte e encaminhamento.

### Validação

- `rg -n -i "recorte|comprovad|ausente|inconsistente|evidência|encaminhamento" .codex/docs/specs/integridade-de-produtos-e-lotes/conferencia-de-lotes.md`

### Notas

O relatório de lacunas é entrada para [Conciliação operacional](../conciliacao-operacional/tasks.md).

## T011 — Validar desativação, edição e leitura histórica em conjunto

- Issue: #474
- Status: concluída
- Dependências: T003, T004, T008
- Paralela: não
- Requisitos: RF-001, RF-002, RF-004, RF-005, RNF-001, RNF-002, CA-001, CA-002, CA-003, CA-004, CA-006, CA-009
- Caminhos sob responsabilidade: `frontend/e2e/critical/product-integrity.spec.ts`, `frontend/playwright.config.ts`
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#empréstimos-e-integridade).

### Escopo

Comprovar no fluxo de inventário e histórico que edição e desativação preservam campos e vínculos. Verificar a reconsulta, inclusive o recorte autorizado, com produtos, vínculos e contas sintéticos.

### Critérios de conclusão

Após alteração, a reconsulta exibe os dados esperados. Produto desativado some da operação com histórico autorizado preservado. Recusa preserva vínculos e a consulta respeita minimização e escopo.

### Plano TDD

- RED: Adicionar jornada que falhe se catálogo ativo, dados gravados e histórico discordarem.
- GREEN: Incluir o cenário no projeto `real` e encaminhar eventuais falhas de comportamento aos proprietários das tarefas.
- REFACTOR: Reaproveitar a preparação de inventário sintético e limitar a integração a verificações que atravessam as superfícies.

### Validação

- `npm run test:e2e:list`
- `npm run test:e2e -- --project=real e2e/critical/product-integrity.spec.ts`

### Notas

Issue adicional #476.

### Retomada — 2026-11-24

A validação integrada falhava antes da jornada porque `product-integrity.spec.ts` esperava `login.token`, enquanto o login de navegador usa cookie HttpOnly, e a expectativa de destino era igual para todos os perfis. O helper agora consulta `/Auth/session`, usa cookie/CSRF e espera as rotas atuais; a jornada passou 1/1. Evidência em `evidencias/T011.md`.

## Log de execução

| Data | Tarefa | Resultado | Testes/evidências | Observações |
|---|---|---|---|---|
| 2026-11-24 | T010 | concluída sob exceção explícita do usuário | Artefato sintético local e [registro da dispensa](./evidencias/T010-dispensa.md). | O usuário não poderá executar a conferência e autorizou encerrar. Não houve consulta a dados reais; fonte, recorte e responsável operacional não foram verificados. |
| 2026-11-24 | T010 | artefato sintético local concluído; conferência real bloqueada | `rg` de categorias/campos aprovado; 3 linhas JSON sintéticas válidas e hashes SHA-256 verificados independentemente. | Casos cobrem vínculo comprovado, ausente e inconsistente, projeção/encaminhamento para Conciliação e checklist somente leitura. Nenhum dado real foi consultado; fonte, recorte/T0, responsáveis e autorização operacional faltam. |
| 2026-11-19 | T011 | concluída | RED inicial ajustado por seletor ambíguo do ID. GREEN: projeto `real` 1/1 em 10,8 s; lista Playwright 249 testes/19 arquivos; Prettier e `git diff --check` aprovados. | Cenário sintético confere edição parcial, lote, duas saídas/devoluções, saldo, vínculo, recusa de edição/exclusão, desativação e histórico por autorização. Caracterização E2E; nenhuma mudança de produção. Composição própria parada sem remover volumes. |
| 2026-11-17 | T010 | bloqueada | O `rg` exigido encontrou as categorias e campos do roteiro; SHA-256 dos três casos sintéticos confere (3/3). | Procedimento e exercício sintético concluídos em `conferencia-de-lotes.md`. Conferência real depende de fonte aceita, recorte e T0 operacionais e responsável nominal; não consultar nem atribuir vínculos reais sem isso. |
| 2026-11-17 | T007 | concluída | RED/GREEN combinados com T009: 45/45 PostgreSQL/unitários após correção de warnings; build Release TEMP e `git diff --check` aprovado. | Autorização verifica perfil habilitado e vínculo atual antes da projeção. Linhas e totais compartilham recorte; fora do escopo recebe 404 sem dados. DI de dois serviços e fixtures unitárias expandidos. |
| 2026-11-17 | T009 | concluída | RED/GREEN combinados com T007: 45/45 PostgreSQL/unitários; build Release TEMP e `git diff --check` aprovado. | Lote com código normalizado único, validação por tipo, escrita transacional e associação sem alterar quantidade. Migration aditiva; dados vazios/duplicados legados não são regularizados e seguem para T010. CA1502/CA1861 refatorados. |
| 2026-11-17 | T006 | concluída | RED: 3 falhas e 1 caracterização passou. GREEN: PostgreSQL 4/4; build Release isolado, whitespace e `git diff --check` aprovados. | Saída durável aparece uma vez após devolução, usando lote capturado. Legado aprovado só com timestamp; sem lote inferido. Aprovado sem timestamp é lacuna; pendentes/rejeitados sem movimento ficam fora. |
| 2026-11-17 | T005 | concluída | RED: 7 falhas/10 casos. GREEN: 32/32; regressão de autorização/cadastro 38/38; build e `git diff --check` aprovados. | Guarda PostgreSQL compartilhada usa advisory lock antes da reconsulta. DELETE/PATCH recusam `409 admin_continuity_required`; disputa em contextos independentes observou espera em `pg_locks`. Registro scoped em `SecurityServiceCollectionExtensions.cs`; sem migração. Snapshot obsoleto em aprovar/rejeitar encaminhado a Contas T005. |
| 2026-11-17 | T004 | concluída | RED nas rotas ausentes, cascata histórica e corrida de criação/remoção. GREEN: 47/47 PostgreSQL; build Release e `git diff --check` aprovados. | Desativação/reativação usam POST explícito e lock transacional compartilhado; listagens ativas filtram desativados; devolução permanece permitida. Downgrade com vínculos históricos bloqueia por SQLSTATE `55000`. Registro scoped em `Program.cs` e ajuste de fixture documentados como expansão necessária. |
| 2026-11-17 | T003 | concluída | RED: 5/8 falharam. GREEN: 8/8; lint/build e `git diff --check` aprovados. A regressão de colunas foi corrigida na caracterização de T008, arquivo completo 8/8. | Editor envia apenas diferenças, sinaliza remoções explicitamente, trata CATMAT como somente leitura e preserva estado/erros por campo ou operação. |
| 2026-11-17 | T008 | concluída | RED: primeira execução encontrou falha de projeção e seis incompatibilidades de contrato/tela. GREEN: 48/48 em cinco arquivos direcionados. `npm run lint` e `npm run build` passaram. | Adaptador allowlist limita campos; datas, unidade, lote ausente, nome opcional, pesquisa, totais, vazio e recusa usam o contrato minimizado. Histórico visível por perfil segue o recorte da API; somente administrador mantém edição. Build conserva avisos já existentes de `/env.js`, imagem pública e chunk grande. |
| 2026-11-17 | T002 | concluída | RED: 17 falhas em 19 casos. GREEN: 41 testes, incluindo PostgreSQL; build e `git diff --check` aprovados. | PATCH/PUT preservam omissões, permitem limpeza aprovada e revalidam sob bloqueio/transação. CATMAT legado fica imutável no patch e preservado no PUT; concorrência de saldo coordena com empréstimos. Nenhum consumidor PUT no frontend foi encontrado. |
| 2026-11-16 | T001 | concluída | RED: 6 falhas esperadas de exibição e busca. GREEN 23/23; REFACTOR 44/44 em cinco arquivos; lint, TypeScript e Vite passaram. | Minimização no frontend. Contrato da API fica em T007. Primeiro recorte paralelo teve timeout transitório, reteste com dois workers passou. |

| 2026-11-24 | T011 retomada sessão | concluída | RED: HTTP 200 sem `login.token`; GREEN: E2E 1/1, discovery 255/255, lint, ESLint, Prettier e `git diff --check` aprovados. | Helper usa `/Auth/session`, cookie HttpOnly e CSRF, com destinos atuais por perfil; edição, estoque, vínculo, histórico minimizado e autorização permaneceram. Stack/artefatos exclusivos removidos; tsbuildinfo preservado; evidência T011. |
