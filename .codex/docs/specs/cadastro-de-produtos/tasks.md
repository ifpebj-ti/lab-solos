# Tarefas de cadastro de produtos

- Status: T001–T012 concluídas; Authentication E2E validou T012 no run #45535221035; o gate global da PR segue pendente de correções em outros checks
- PRD: [prd.md](./prd.md)
- Especificação técnica: [techspec.md](./techspec.md)
- Atualizado em: 2026-11-24

Leia o PRD e a especificação técnica antes de cada tarefa. Use dados sintéticos nos testes e registre no log as evidências de cada execução.

## Ondas de execução

| Onda | Tarefas          | Motivo de segurança do paralelismo                                                                                |
| ---- | ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1    | T001, T003, T004 | Inventário da máscara e testes de interface, validação de entrada da API e referência civil têm posses distintas. |
| 2    | T002, T005       | Entrada no formulário de químicos e contrato de vidraria atuam em tipos e arquivos distintos.                     |
| 3    | T006             | Formulário de vidrarias e detalhe reutilizam a categoria persistida.                                              |
| 4    | T007             | Serializa o serviço, o formulário de químicos e o detalhe já usados em ondas anteriores.                          |
| 5    | T008             | Serializa alterações no formulário, consulta e contratos de químicos com T007.                                    |
| 6    | T009             | Coordena a escrita no serviço e no DTO compartilhados com as tarefas de criação.                                  |
| 7    | T010             | Coordena a escrita e leitura de fórmula com os demais contratos de químicos.                                      |
| 8    | T011             | Consome as respostas de confirmação no formulário de químicos e preserva as alterações anteriores.                |
| 9    | T012             | Comprova a jornada cruzada de vencimento e o relógio compartilhado.                                               |

Onda com tarefa bloqueada indica a posição prevista após a liberação da decisão. Avance nas tarefas prontas quando as dependências declaradas tiverem sido concluídas, sem rodar simultaneamente tarefas com posse em comum.

Coordenação entre planos: serializar as alterações em `ProdutosController.cs`, `ProdutoService.cs`, mapeamentos e DTOs com [Alertas](../listagem-e-alertas-de-produtos/tasks.md) e [Integridade](../integridade-de-produtos-e-lotes/tasks.md). Coordenar o detalhe em `VerificationPage.tsx` com Integridade e alterações de `playwright.config.ts` e do schema com as demais frentes.

## Validação comum

Na raiz, preparar com `dotnet restore backend/backend.sln --locked-mode` e `dotnet build backend/backend.sln --no-restore -c Release`. Reexecutar a suíte com `dotnet test backend/backend.sln --no-build --no-restore -c Release`. Iniciar Docker para os testes PostgreSQL do projeto de testes.

Em `frontend/`, preparar com `npm ci`. Além dos recortes abaixo, executar `npm run test -- --run`, `npm run lint` e `npm run build`.

Para o projeto `real`, iniciar na raiz a pilha sintética com `docker compose -f docker-compose-e2e.yml up -d --build --wait`. Em `frontend/`, instalar Chromium com `npx --no-install playwright install chromium`, conferir a seleção com `npm run test:e2e:list` e executar `npm run test:e2e -- --project=real --project=ui` na validação completa de navegador.

## T001 — Localizar as orientações de formato de data

- Issue: #461
- Status: concluída
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-001, CA-001, CA-002
- Caminhos sob responsabilidade: `frontend/src/function/date.test.ts`, `frontend/src/components/global/inputs/DateMask.test.tsx`, `frontend/src/components/global/inputs/DateInput.tsx`, `frontend/src/components/global/inputs/DateInputOutros.tsx`, `frontend/src/components/global/inputs/DateInputVidraria.tsx`, `frontend/src/components/global/inputs/DateRangeInput.tsx`

### Escopo

Inventariar placeholders, textos e mensagens de validação visíveis, incluindo o estado vazio dos componentes compartilhados. Corrigir ocorrências de máscara em inglês confirmadas na revisão. A busca inicial local encontrou principalmente tokens de formatação. Caso um texto visível esteja fora dos caminhos previstos, registrar o ponto antes de ampliar a posse.

### Critérios de conclusão

A orientação visível, quando presente, usa `dd/mm/aaaa`. Um dia civil já preenchido aparece como `05/11/2026`. A revisão registra os pontos que eram tokens internos e os pontos efetivamente cobertos.

### Plano TDD

- RED: Caracterizar o valor numérico e os estados vazios/erros; se for encontrada uma orientação em inglês, verificar primeiro a falha no componente correspondente.
- GREEN: Atualizar o texto visível identificado e conservar o comportamento numérico coberto.
- REFACTOR: Consolidar a indicação nos componentes que compartilham o mesmo contrato de apresentação.

### Validação

- `rg -n -i "dd/mm/yyyy|dd/mm/aaaa" frontend/src`
- `npm run test -- --run src/function/date.test.ts src/components/global/inputs/DateMask.test.tsx`

## T002 — Digitar datas e saltar diretamente para o ano

- Issue: #464
- Status: concluída
- Dependências: T001
- Paralela: não
- Requisitos: RF-001, RF-004, RNF-001, CA-009, CA-010
- Caminhos sob responsabilidade: `frontend/src/function/date.ts`, `frontend/src/function/date.test.ts`, `frontend/src/components/global/inputs/DateInput.tsx`, `frontend/src/components/global/inputs/DateInput.test.tsx`, `frontend/src/components/global/forms/create/FormQuimicos.tsx`, `frontend/src/components/global/forms/create/FormQuimicos.errors.test.tsx`, `frontend/e2e/design-pilots.spec.ts`, `frontend/src/components/global/inputs/DateMask.test.tsx` (caracterização de T001 para o controle alterado)

### Escopo

Unir a digitação e o calendário em um valor civil de fabricação ou validade. Manter digitação `dd/mm/aaaa`, seleção direta de ano, mês e dia e suporte a datas passadas. Associar o erro ao campo e invalidar valor anterior quando a entrada editada for impossível ou incompleta.

### Critérios de conclusão

O formulário aceita datas válidas pelos dois caminhos, incluindo por teclado, e envia o mesmo dia em `yyyy-MM-dd`. Digitar `31/02/2026` ou uma data parcial torna o campo inválido e impede o envio. Cobrir bissexto e troca de método de entrada.

### Plano TDD

- RED: Testar entrada por teclado, seleção de ano distante, bissexto e invalidação do valor anteriormente escolhido. Verificar campo associado ao erro e ausência de chamada de cadastro após data impossível.
- GREEN: Unificar a conversão de dia civil e ligar os eventos de ambos os controles ao estado validado.
- REFACTOR: Reutilizar os auxiliares de data e verificar o acionamento dos campos pelo teclado no navegador.

### Validação

- `npm run test -- --run src/function/date.test.ts src/components/global/inputs/DateInput.test.tsx src/components/global/forms/create/FormQuimicos.errors.test.tsx`
- `npm run test:e2e -- --project=ui e2e/design-pilots.spec.ts`

## T003 — Recusar datas impossíveis na criação de químicos

- Issue: #464
- Status: concluída
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-004, RNF-001, CA-009, CA-010
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Services/ProdutoService.cs`, `backend/LabSolos-Server-DotNet8/Mappings/ProdutoMappingProfile.cs`, `backend/Tests/Mappings/ProductDateMappingTests.cs`, `backend/Tests/Controllers/ProdutosControllerTests.cs`, `backend/Tests/Integration/ProductCreationDateTests.cs`, `backend/LabSolos-Server-DotNet8/Controllers/ProdutosController.cs` (tratamento de erro de Adicionar), `backend/LabSolos-Server-DotNet8/DTOs/ResultadoValidacaoDTO.cs` (erros estruturados de data)

### Escopo

Validar no ingresso de `POST /api/Produtos` as datas civis do químico antes do mapeamento e manter a conversão existente na persistência. Preservar o contrato para consumidores e tipos que ficam fora dessa alteração.

### Critérios de conclusão

Uma data impossível retorna `400` associado ao campo correspondente e não altera os registros. Uma data válida é lida como o mesmo dia após reconsulta, incluindo datas bissextas.

### Plano TDD

- RED: Adicionar testes separados para fabricação e validade, ida e volta de um dia válido e inexistência de linha quando a data for inválida.
- GREEN: Aplicar validação civil estrita antes de mapear e manter o padrão atual dos erros por campo.
- REFACTOR: Compartilhar o parser entre os dois campos e preservar a interpretação dos testes legados.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~ProductDateMappingTests|FullyQualifiedName~ProdutosControllerTests|FullyQualifiedName~ProductCreationDateTests"`

## T004 — Fornecer a referência comum de dia civil

- Issue: #464
- Status: concluída
- Dependências: nenhuma
- Paralela: não
- Requisitos: RF-005, CA-011, CA-013
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Services/ProductCivilDay.cs`, `backend/LabSolos-Server-DotNet8/Program.cs`, `backend/LabSolos-Server-DotNet8/appsettings.example.json`, `backend/Tests/Services/ProductCivilDayTests.cs`
- Decisão aprovada: [D1 — Dia civil compartilhado](./techspec.md#alternativas-e-decisões).

### Escopo

Entregar o cálculo reutilizável do dia civil a partir do `TimeProvider` e da configuração do servidor, com `America/Sao_Paulo` como padrão em todas as instâncias. Cadastro, Alertas e recálculos de validade em empréstimos usam a mesma referência. A validade termina à meia-noite que inicia o dia seguinte no fuso institucional.

### Critérios de conclusão

O mesmo instante de relógio gera a mesma data civil para ambos os consumidores. A regra permite controlar a virada do dia em testes e conserva a interpretação dos dias legados.

### Plano TDD

- RED: Fixar instantes sintéticos de ambos os lados da virada aprovada e testar leitura do dia representado por datas legadas.
- GREEN: Registrar o cálculo e a configuração exigida pela decisão aprovada.
- REFACTOR: Centralizar a referência para consumo de cadastro e Alertas, conservando a distinção entre data civil armazenada e instante de relógio.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~ProductCivilDayTests"`

### Notas

Produtora da referência para Alertas. A comparação de vencimento do cadastro e a janela de alertas continuam definidas pelos seus requisitos próprios.

## T005 — Persistir categoria de vidraria com altura omitida

- Issue: #465
- Status: concluída
- Dependências: T003
- Paralela: não
- Requisitos: RF-006, RNF-002, CA-014, CA-015
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Mappings/ProdutoMappingProfile.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Produtos/AddProdutoDTO.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Produtos/VidrariaDTO.cs`, `backend/Tests/Integration/VidrariaCreationTests.cs`

### Escopo

Mapear a omissão de altura para `AlturaVidraria.Indefinido` na criação. Manter `formato` no contrato e a leitura de vidrarias anteriores.

### Critérios de conclusão

Uma vidraria criada sem altura retorna `201` e pode ser consultada pelo `Location` com a categoria informada. A reconsulta de uma vidraria anterior conserva a altura gravada.

### Plano TDD

- RED: Exigir a altura indefinida para uma gravação sem o campo, além da leitura de uma vidraria legada com altura e categoria sintéticas.
- GREEN: Aplicar o padrão na criação da vidraria e retornar os dados pelos DTOs existentes.
- REFACTOR: Revisar o mapeamento de criação e leitura sem acoplar a mudança ao caminho de edição.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~VidrariaCreationTests"`

## T006 — Concluir a vidraria com o seletor Categoria

- Issue: #465
- Status: concluída
- Dependências: T005
- Paralela: não
- Requisitos: RF-006, RNF-002, CA-014, CA-015
- Caminhos sob responsabilidade: `frontend/src/components/global/forms/create/FormVidraria.tsx`, `frontend/src/components/global/forms/create/FormVidraria.errors.test.tsx`, `frontend/src/components/screens/VerificationPage.tsx`, `frontend/src/components/screens/VerificationPage.registration.test.tsx`, `frontend/src/components/screens/VerificationPage.responsive.test.tsx` (expectativa de Categoria)

### Escopo

Renomear o seletor Formato para Categoria, retirar Altura do formulário de criação e apresentar a categoria recuperada no detalhe da vidraria.

### Critérios de conclusão

O formulário salva com Categoria sem pedir Altura. O detalhe usa a categoria recuperada e mantém a leitura de dados históricos.

### Plano TDD

- RED: Verificar envio da opção escolhida sem campo Altura e consulta de dados sintéticos atuais e legados.
- GREEN: Reusar as opções válidas de formato e ligar a apresentação da categoria à resposta persistida.
- REFACTOR: Revisar rótulos e separação entre o formulário de criação e a consulta compartilhada.

### Validação

- `npm run test -- --run src/components/global/forms/create/FormVidraria.errors.test.tsx src/components/screens/VerificationPage.registration.test.tsx`

## T007 — Adotar Marca e restringir o Grupo no cadastro de químicos

- Issue: #463
- Status: concluída
- Dependências: nenhuma
- Paralela: não
- Requisitos: RF-003, RNF-002, CA-007, CA-008
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Services/ProdutoService.cs`, `backend/LabSolos-Server-DotNet8/Mappings/ProdutoMappingProfile.cs`, `backend/Tests/Integration/QuimicoIdentificationTests.cs`, `frontend/src/components/global/forms/create/FormQuimicos.tsx`, `frontend/src/components/global/forms/create/FormQuimicos.errors.test.tsx`, `frontend/src/components/screens/VerificationPage.tsx`, `frontend/src/components/screens/VerificationPage.registration.test.tsx`, `frontend/src/errors/errorCatalog.ts` (campo Grupo), `frontend/src/components/screens/VerificationPage.responsive.test.tsx` (rótulo Marca), `backend/Tests/Controllers/ProdutosControllerTests.cs` (fixtures de grupo válido nos testes de data e caso de agregação)

### Escopo

Usar Marca com o contrato existente de `fornecedor`, retirar CATMAT da criação e oferecer somente grupos válidos no formulário. Validar enums na criação e proteger a leitura do grupo e da marca legados. O aceite de Peso Molecular está em T008.

### Critérios de conclusão

Marca enviada é recuperada no detalhe. CATMAT e Indefinido ficam fora das opções de criação. A API rejeita o Grupo Indefinido e valores fora do domínio para novos químicos, e os grupos legados seguem consultáveis.

### Plano TDD

- RED: Testar opções de criação, recusa por campo e reconsulta de uma marca persistida e de um grupo legado sintético.
- GREEN: Ajustar os rótulos e os dados do formulário e aplicar a regra de grupo no ingresso antes do mapeamento.
- REFACTOR: Preservar os campos históricos e reutilizar os DTOs e as opções vigentes de domínio.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~QuimicoIdentificationTests"`
- `npm run test -- --run src/components/global/forms/create/FormQuimicos.errors.test.tsx src/components/screens/VerificationPage.registration.test.tsx`

## T008 — Cadastrar e consultar Peso Molecular

- Issue: #463
- Status: concluída
- Dependências: T007
- Paralela: não
- Requisitos: RF-003, RNF-002, CA-007, CA-008
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Models/Quimico.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Produtos/AddProdutoDTO.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Produtos/QuimicoDTO.cs`, `backend/LabSolos-Server-DotNet8/Mappings/ProdutoMappingProfile.cs`, `backend/LabSolos-Server-DotNet8/Services/ProdutoService.cs`, `backend/LabSolos-Server-DotNet8/Data/Migrations/`, `backend/Tests/Integration/QuimicoIdentificationTests.cs`, `frontend/src/components/global/forms/create/FormQuimicos.tsx`, `frontend/src/components/global/forms/create/FormQuimicos.errors.test.tsx`, `frontend/src/components/screens/VerificationPage.tsx`, `frontend/src/components/screens/VerificationPage.registration.test.tsx`
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#cadastro-e-alertas).

### Escopo

Adicionar Peso Molecular à criação e à consulta e aplicar unidade, precisão, limites e obrigatoriedade aprovados. Se D2 mudar o tipo, incluir migração aditiva ou conversão validada conforme o desenho aprovado e testar valores legados representativos.

### Critérios de conclusão

O peso informado é lido na unidade e precisão aprovadas e a ausência histórica permanece identificável. Valores gravados, inclusive zero, são preservados segundo o contrato legado.

### Plano TDD

- RED: Cobrir limites, precisão, ausência histórica e fidelidade do valor ao recarregar o registro. Se houver alteração de tipo, testar valores sintéticos já persistidos.
- GREEN: Ligar o campo e a projeção ao tipo definido e aplicar a validação de entrada aprovada.
- REFACTOR: Concentrar a validação de escrita e testar leitura do tipo já migrado quando a mudança exigir migração.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~QuimicoIdentificationTests"`
- `npm run test -- --run src/components/global/forms/create/FormQuimicos.errors.test.tsx src/components/screens/VerificationPage.registration.test.tsx`

## T009 — Validar a confirmação de vencimento no servidor

- Issue: #464
- Status: concluída
- Dependências: T003, T004
- Paralela: não
- Requisitos: RF-005, CA-011, CA-012, CA-013
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Controllers/ProdutosController.cs`, `backend/LabSolos-Server-DotNet8/Services/ProdutoService.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Produtos/AddProdutoDTO.cs`, `backend/Tests/Integration/QuimicoExpiryConfirmationTests.cs`, `backend/Tests/Controllers/ProdutosControllerTests.cs` (fixture do serviço civil)
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#cadastro-e-alertas).

### Escopo

Usar a referência civil T004 na criação. Aplicar a concordância explícita e o resultado de domínio aprovados em D4 antes de gravar uma validade passada, preservando validação por campo e `201`.

### Critérios de conclusão

Validade passada sem concordância aplicável não cria registro. Concordância válida grava a data informada. Hoje e futuro seguem o caminho de criação normal e a virada de dia força nova avaliação quando aplicável.

### Plano TDD

- RED: Controlar data e requisições sintéticas e consultar o banco após recusa, confirmação e virada do dia.
- GREEN: Implementar no ingresso o contrato aprovado de concordância e calcular vencimento com o serviço comum.
- REFACTOR: Preservar a compatibilidade aprovada dos clientes anteriores e consolidar o retorno de validação.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~QuimicoExpiryConfirmationTests|FullyQualifiedName~ProdutosControllerTests"`

## T010 — Editar e consultar subscrito por trecho

- Issue: #462
- Status: concluída
- Dependências: nenhuma
- Paralela: não
- Requisitos: RF-002, RNF-001, CA-003, CA-004, CA-005, CA-006
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Models/Quimico.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Produtos/AddProdutoDTO.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Produtos/QuimicoDTO.cs`, `backend/LabSolos-Server-DotNet8/Mappings/ProdutoMappingProfile.cs`, `backend/LabSolos-Server-DotNet8/Data/Migrations/**`, `backend/Tests/Integration/QuimicoFormulaCreationTests.cs`, `frontend/src/components/global/forms/create/FormQuimicos.tsx`, `frontend/src/components/global/forms/create/FormQuimicos.formula.test.tsx`, `frontend/src/components/screens/VerificationPage.tsx`, `frontend/src/components/screens/VerificationPage.registration.test.tsx`, `frontend/e2e/design-pilots.spec.ts`
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#cadastro-e-alertas).

### Escopo

Aplicar e remover subscrito no intervalo selecionado, preservando foco, teclado e os dígitos da linha de base. Persistir e renderizar a representação aprovada como texto ou segmentos React fixos.

### Critérios de conclusão

Digitar `2H2O` mantém ambos os dígitos na linha de base. Selecionar somente o segundo `2` produz `2H₂O` após ação e a retirada é reversível. O detalhe reproduz fórmulas com subscrito e sem subscrito, incluindo as existentes.

### Plano TDD

- RED: Cobrir digitação, seleção, desfazer, acionamento por teclado e leitura do registro salvo e de um legado.
- GREEN: Aplicar a transformação somente à seleção e preservar o contrato de leitura da fórmula legada.
- REFACTOR: Separar a representação persistida da seleção e manter uma interpretação compartilhada entre cadastro e consulta.

### Validação

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~QuimicoFormulaCreationTests"`
- `npm run test -- --run src/components/global/forms/create/FormQuimicos.formula.test.tsx src/components/screens/VerificationPage.registration.test.tsx`
- `npm run test:e2e -- --project=ui e2e/design-pilots.spec.ts`

## T011 — Confirmar ou cancelar a criação vencida no formulário

- Issue: #464
- Status: concluída
- Dependências: T002, T009
- Paralela: não
- Requisitos: RF-005, RNF-001, CA-011, CA-012, CA-013
- Caminhos sob responsabilidade: `frontend/src/components/global/forms/create/FormQuimicos.tsx`, `frontend/src/components/global/forms/create/FormQuimicos.errors.test.tsx`, `frontend/src/components/global/forms/create/formErrors.ts`, `frontend/src/errors/errorCatalog.ts`, `frontend/src/errors/errorCatalog.test.ts`, `frontend/src/errors/applicationError.ts`, `frontend/src/errors/applicationError.test.ts`, `frontend/src/errors/normalizeError.ts`, `frontend/src/errors/normalizeError.test.ts` (campos seguros da confirmação de vencimento)
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#cadastro-e-alertas).

### Escopo

Exibir diálogo de revisão com nome acessível, confirmação, cancelamento e retorno de foco. Conservar valores após cancelar ou receber recusa e vincular a confirmação aos dados revisados.

### Critérios de conclusão

Validade passada pede revisão pelo teclado. Cancelar volta ao formulário preenchido e não grava. Confirmar envia uma vez enquanto a chamada está em curso. Hoje e futuro seguem sem diálogo. Mudança de dados ou virada de dia reavalia a confirmação.

### Plano TDD

- RED: Testar passado, hoje, futuro, cancelamento, foco, tentativa repetida e resposta de virada com o contrato de T009.
- GREEN: Conectar o diálogo e o fluxo de confirmação ao resultado de domínio, preservando feedback por campo.
- REFACTOR: Reusar componentes acessíveis de diálogo e isolar o estado de concordância do estado comum do formulário.

### Validação

- `npm run test -- --run src/components/global/forms/create/FormQuimicos.errors.test.tsx`

## T012 — Validar a virada do dia no cadastro e em Alertas

- Issue: #464
- Status: concluída localmente; CI pós-correção pendente
- Dependências: T011
- Dependências externas: [T005 de Alertas](../listagem-e-alertas-de-produtos/tasks.md) — projeção administrativa e regra de validade; [T004 de Proteção da API e do proxy](../protecao-de-api-e-proxy/tasks.md) — envelope do catálogo consumido pela jornada, com reteste de integração após a paginação.
- Paralela: não
- Requisitos: RF-005, RNF-001, CA-011, CA-012, CA-013
- Caminhos sob responsabilidade: `frontend/e2e/critical/product-expiry.spec.ts`, `frontend/playwright.config.ts`
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#cadastro-e-alertas).
- Retomada: CI run `45517310767`, SHA de merge testado `4a6c3b48ea1b7d196ac8e47b575d3e8e2a6c8f29`, falhou na linha 275 porque Escape não fechou o `alertdialog`; os demais 248 testes de Authentication E2E passaram. A implementação segue o contrato do `AlertDialog`; o teste foi corrigido para ativar por teclado o botão acessível Cancelar, preservando as verificações de cancelamento, foco, formulário e ausência de gravação. A jornada local passou 1/1; ainda não há CI pós-correção.

### Escopo

Combinar a jornada real de criação, consulta e alertas com dados sintéticos, a mesma referência de dia civil e contextos de navegador em fusos distintos. Exercitar seleção de data, cancelamento e confirmação pelo teclado na jornada.

### Critérios de conclusão

Com o dia de referência controlado, o vencido confirmado aparece uma única vez na consulta e se qualifica em Alertas, cancelar não cria produto, e a validade de hoje segue sem aviso de cadastro e qualifica em Alertas.

### Retomada — 2026-11-24

A validação integrada falhava antes da jornada porque o helper esperava `login.token`, mas o login de navegador retorna sessão em cookie HttpOnly. O helper agora consulta `/Auth/session` e usa o cookie, e a jornada passou 1/1 com todos os cenários de data e alertas. Evidência em `evidencias/T012.md`.

### Plano TDD

- RED: Compor o cenário cruzado e registrar a falha se as regras ou efeitos de gravação divergirem.
- GREEN: Ajustar somente o cenário e sua descoberta pelo Playwright. Encaminhar falha de produto à tarefa responsável.
- REFACTOR: Reusar dados sintéticos e os auxiliares de autenticação para manter o cenário isolado.

### Validação

- `npm run test:e2e:list`
- `npm run test:e2e -- --project=real e2e/critical/product-expiry.spec.ts`

## Log de execução

| Data       | Tarefa                        | Resultado | Testes/evidências                                                                                                                                                                                          | Observações                                                                                                                                                                                                                                                                                                                                                                     |
| ---------- | ----------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-19 | T012 — regressão da paginação | concluída | `npm run test:e2e:list` 247/247 em 18 arquivos; `product-expiry.spec.ts` 1/1 em 18,3 s; Prettier aprovado.                                                                                                 | Spec atualizado para ler `itens` do catálogo paginado. Reexecução nas portas padrão 4173/18080/18025 passou; artefatos da tentativa customizada em 19173 foram preservados e demonstraram falha de CORS da origem de teste. Composição própria parada sem remover volumes.                                                                                                      |
| 2026-11-19 | T012 — rodada inicial         | concluída | RED: spec não era descoberto antes de selecioná-lo. GREEN inicial: jornada direcionada 1/1, `test:e2e:list` 247/247 em 18 arquivos, Prettier e diff-check aprovados.                                       | Verificou calendário e digitação, datas vencida/hoje, confirmação por teclado, cancelamento, alertas e contextos Honolulu/Kiritimati. A primeira regressão apontou à comparação case-sensitive de `/Produtos`, formato de data da resposta e, após paginação, origem customizada incompatível com CORS. A imagem reconstruída e portas padrão confirmaram o contrato integrado. |
| 2026-11-17 | T011                          | concluída | RED: 5 falhas de código/metadados/diálogo. GREEN: 53 testes, lint dos 9 arquivos e build passaram; diff check aprovado.                                                                                    | Diálogo confirma data exata, revalida dia civil, exige novo aceite após mudança, protege edição durante revalidação e trava duplo clique. Avisos existentes do Vite permanecem.                                                                                                                                                                                                 |
| 2026-11-17 | T009                          | concluída | RED: 4 falhas. GREEN: 7 cenários novos, 13 ProdutosController e regressão relacionada 47/47 com PostgreSQL; diff --check aprovado.                                                                         | Confirmação exige a mesma data, rejeição 409 tipada com código/data/dia civil e correlação; hoje/futuro sem confirmação. ProductCivilDay controla o teste de virada.                                                                                                                                                                                                            |
| 2026-11-17 | T008                          | concluída | RED: 11 falhas de frontend/contrato. GREEN: 25/25 frontend e 19/19 integrações PostgreSQL; diff --check aprovado.                                                                                          | Peso Molecular opcional 0,001–10.000 g/mol, até 3 casas, vírgula na interface e número JSON. Ausência e zero legado continuam distintos; sem migração. Build/lint global passaram junto de T004.                                                                                                                                                                                |
| 2026-11-17 | T008 — regressão responsiva   | concluída | `VerificationPage.responsive.test.tsx` 8/8; ESLint e `git diff --check` aprovados.                                                                                                                         | Corrigidas as expectativas de colunas dos perfis que exibem Peso Molecular; sem alteração de produção.                                                                                                                                                                                                                                                                          |
| 2026-11-16 | T004                          | concluída | RED com 5 falhas de 12 na virada do dia e configuração inválida. GREEN 12 testes civis e regressão dirigida 33/33 com PostgreSQL.                                                                          | ProductCivilDay usa TimeProvider e Products:TimeZone com padrão America/Sao_Paulo. Preserva dia armazenado dos legados.                                                                                                                                                                                                                                                         |
| 2026-11-16 | T010                          | concluída | RED de botões ausentes e API aceitando letra subscrita. GREEN com 16 Vitest, 16 integrações PostgreSQL, 15 Playwright, tsc, lint e build. Caracterização final de legado com 4 integrações.                | Orquestrador revalidou 6 testes de fórmula/detalhe. Formatação somente dos dígitos selecionados. Avisos existentes no build, acessibilidade de caracterização e AutoMapper.                                                                                                                                                                                                     |
| 2026-11-15 | T001                          | concluída | Caracterização 25/25 (DateMask e date.test), TypeScript, ESLint e build. `rg` encontrou 10 tokens internos e zero orientações literais.                                                                    | Sem mudança produtiva. Suíte ampla: 858/859, um timeout reproduzido em FormOutros, fora do recorte.                                                                                                                                                                                                                                                                             |
| 2026-11-15 | T003                          | concluída | RED: 8 falhas; duas retornavam HTTP 500 em PostgreSQL. GREEN 25/25; REFACTOR 26/26. Regressão backend 446/446.                                                                                             | Posse ampliada apenas no bloco Adicionar do controlador e no DTO para erro por campo. Formatos e data opcional legados preservados.                                                                                                                                                                                                                                             |
| 2026-11-16 | T007                          | concluída | RED: 6 falhas esperadas em cada frente. GREEN/REFACTOR: 26 backend com PostgreSQL, 48 frontend e 8 após último ajuste. Regressão backend 460/460, lint e build.                                            | Marca e Grupo, CATMAT removido da criação, dados legados preservados. Posse ampliada para catálogo, teste responsivo e fixture de datas. Peso Molecular segue T008.                                                                                                                                                                                                             |
| 2026-11-16 | T005                          | concluída | RED: altura omitida ou vazia retornava Alta. GREEN 4/4 PostgreSQL e regressão dirigida 39/39.                                                                                                              | O padrão Indefinido cobre também o valor vazio. Alturas explícitas e registros antigos foram preservados.                                                                                                                                                                                                                                                                       |
| 2026-11-16 | T006                          | concluída | RED: três falhas por Categoria ausente. GREEN 10/10; regressão 18/18, ESLint e diff --check.                                                                                                               | O formulário omite Altura; a consulta mantém dados de altura históricos. Atualizada a expectativa responsiva para Categoria.                                                                                                                                                                                                                                                    |
| 2026-11-16 | T002                          | concluída | RED: campo digitável ausente no navegador e parser ainda indisponível. GREEN: 45 Vitest, 15 Playwright, TypeScript, lint e build. Regressão final: 901/901 após ajustar a leitura dos erros do formulário. | Incluiu adaptação local ao Zod 4 e atualização da caracterização DateMask. Achados Axe preexistentes nos outros cenários; confirmação de vencimento segue nas tarefas dependentes.                                                                                                                                                                                              |

| 2026-11-24 | T012 retomada sessão | concluída | RED: login HTTP 200 sem `login.token`; GREEN: jornada real 1/1, discovery 255/255, ESLint, Prettier e `git diff --check` aprovados. | E2E usa `/Auth/session`, cookie HttpOnly e CSRF; confirmou vencido/hoje, cancelamento, Alertas e fusos Honolulu/Kiritimati. Stack/artefatos removidos e tsbuildinfo preservado; evidência T012. |
| 2026-11-24 | T012 — cancelamento por teclado após CI | concluída localmente; CI pós-correção pendente | RED: CI run `45517310767` manteve o diálogo aberto após Escape. GREEN: jornada real direcionada 1/1 (`15.8s`); descoberta `255 tests in 21 files`; Prettier, ESLint e `git diff --check` aprovados. REFACTOR: controles acessíveis e teclas explícitos no cenário. | Escape não é o controle de cancelamento definido pelo PRD. Mantém foco restaurado, dados do formulário e ausência do produto no catálogo. Nenhuma aprovação de CI pós-correção foi registrada. Composição Docker própria removida. Evidência em `evidencias/T012.md`. |

### CI de T012 — 25/11/2026

A jornada de validade foi aprovada remotamente no run #45535221035: o job Authentication E2E terminou com **249 testes aprovados**, incluindo `product-expiry.spec.ts` — T012, **1/1 em 11,7 s** — nos fusos distintos previstos. Os demais checks desse run incluem falhas alheias a T012, registradas em [T007](../cobertura-e-seguranca-na-ci/evidencias/T007.md) e na evidência T010; o resultado desta tarefa é verde, mas a PR ainda aguarda uma rodada global aprovada.
