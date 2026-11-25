# Especificação técnica: Exibição de datas civis de produtos

- Status: pronta para implementação
- PRD: `./prd.md`
- Atualizado em: 2026-11-25
- Validação de design: dispensada-pelo-usuário

## Resumo técnico

Padronizar o contrato de leitura das datas civis de fabricação e validade de produto como texto ISO `yyyy-MM-dd` na API e apresentá-las como `dd/MM/yyyy` na interface. O servidor extrairá o dia, mês e ano diretamente do valor persistido, sem conversão de fuso ou formatação dependente da cultura. A interface reutilizará `formatCivilDate`, que já existe na árvore de trabalho local, para validar e formatar o texto ISO sem criar um instante JavaScript.

O ajuste cobre os DTOs de produto usados em listas, alertas, consulta por ID e produtos aninhados em respostas de lote ou acompanhamento. Na interface, cobre a data de validade do acompanhamento de alertas e as datas de fabricação e validade no detalhe do produto. Datas de eventos com horário — por exemplo criação, empréstimo, auditoria e `UltimaModificacao` — mantêm seus contratos e formatadores atuais.

Não haverá migração de banco nem alteração de valores históricos. Na projeção de leitura, `DateTime.MinValue` (`0001-01-01`) será representado como data ausente e a interface mostrará `Não informado`. Isso corrige a apresentação sem regravar o registro persistido; a origem histórica pode ser investigada separadamente.

## Estado atual

- `Produto.DataFabricacao` e `Produto.DataValidade` são `DateTime?`, embora representem dias civis. Os DTOs de leitura `ProdutoDTO`, `QuimicoDTO` e `VidrariaDTO` expõem `string?` para essas propriedades.
- Em `ProdutoMappingProfile`, os mapas principais `Produto -> ProdutoDTO`, `Quimico -> QuimicoDTO` e `Vidraria -> VidrariaDTO` não formatam explicitamente essas strings. O resultado implícito do AutoMapper depende da cultura do processo e pode incluir hora. O perfil também mapeia `ProdutoAlertaDTO` pela base `ProdutoDTO`.
- Os endpoints de produtos projetam esses DTOs em consulta paginada geral, consulta por tipo, catálogo administrativo, lista de alertas e consulta por ID. `LotesController.Project` inclui produtos como `ProdutoDTO`. `EmprestimoMappingProfile` projeta datas civis de `Produto` em `ProdutoAcompanhamentoDTO` usando `ToString(CultureInfo.InvariantCulture)`, que ainda é uma representação geral de data e hora, não um contrato ISO de data civil.
- `LoteMappingProfile` já usa `yyyy-MM-dd` invariantemente para datas próprias de `Lote`; essas propriedades não devem ser confundidas com os campos civis de `Produto`.
- `frontend/src/function/date.ts` contém, na árvore local, `formatCivilDate`, que aceita apenas uma data ISO válida e monta `dd/MM/yyyy` por partes, sem conversão de fuso. Seu estado atual é uma alteração local não commitada e deve ser preservado e revisado durante a implementação.
- `FollowUp.tsx` ainda converte `dataValidade` com `String(...)`, exibindo a representação recebida sem normalização. `VerificationPage.tsx` carrega os campos de data pelo `getProductById`, mas não os inclui atualmente nas informações do detalhe; o PRD exige que o detalhe mostre fabricação e validade com o mesmo padrão.
- `SearchMaterialComponent` consome produtos e catálogo, mas suas colunas atuais não exibem datas. `ProductEditModal` é um fluxo de edição de campos e pertence à issue #508; sua interação não faz parte desta especificação.
- A árvore de trabalho já contém modificações locais em `ProdutoMappingProfile.cs`, `date.ts`, `FollowUp.tsx` e vários outros arquivos. A implementação deve integrar o trabalho existente sem descartar ou reverter essas alterações.

## Arquitetura proposta

1. **Contrato de API:** todo campo que representa `Produto.DataFabricacao` ou `Produto.DataValidade` será `null` ou string ISO exata `yyyy-MM-dd`. O contrato JSON permanece como string nullable com os mesmos nomes e estrutura.
2. **Mapeamento backend:** substituir conversões implícitas/gerais por um formatador civil compartilhado que use `CultureInfo.InvariantCulture` e apenas ano, mês e dia. A conversão não chama `ToUniversalTime`, não aplica fuso e não serializa meia-noite como horário.
3. **Entrada backend:** preservar `yyyy-MM-dd` como contrato de entrada das datas civis do produto, validando-o por parsing exato e invariantemente. Não inferir formatos localizados ambíguos. A integração com formulários e seleção permanece no escopo de #508.
4. **Interface:** reutilizar `formatCivilDate` para cada valor visível de fabricação/validade. `null`, vazio e ISO inválido retornam o rótulo reconhecível `Não informado`; nunca mostrar o texto bruto nem um objeto convertido para texto. Não usar `new Date(isoDate)` para formatar um dia civil.
5. **Superfícies visuais:** aplicar no acompanhamento de alertas e no detalhe de produto (`VerificationPage`) para todos os tipos e perfis que têm acesso ao detalhe. O catálogo de pesquisa não ganha novas colunas de data nesta mudança, pois atualmente não as exibe.

## Fluxos e componentes

| Fluxo | Fonte | Tratamento proposto | Resultado |
|---|---|---|---|
| Lista geral/de tipo | `ProdutosController.ObterTodos` e consulta por tipo | Mapeamento explícito para `yyyy-MM-dd` nos DTOs de produto | Consumidores recebem valor civil canônico |
| Catálogo administrativo e alertas | `ProdutoAlertaDTO` e `ProdutoDTO` | Herda o mapeamento explícito da base | Validade exibida no acompanhamento como `dd/MM/yyyy` |
| Detalhe de produto | `ProdutosController.ObterPeloId` → `getProductById` → `VerificationPage` | `QuimicoDTO`, `VidrariaDTO` ou `ProdutoDTO`; formatar as duas datas no modelo de informações | Fabricação e validade legíveis, sem hora |
| Produto aninhado em lote | `LotesController.Project` → `ProdutoDTO` | Usa a mesma conversão de `ProdutoMappingProfile` | Produto não muda de formato conforme endpoint |
| Produto aninhado em acompanhamento | `EmprestimoMappingProfile` → `ProdutoAcompanhamentoDTO` | Usar formatador civil compartilhado somente para as datas de `Produto` | Nenhuma hora ou ordem regional na data do produto |
| Campos do lote e instantes operacionais | `LoteDTO`, datas de empréstimo, auditoria e modificação | Sem mudança neste escopo | Seus contratos permanecem próprios do domínio |

Componentes frontend previstos: `frontend/src/function/date.ts`, `frontend/src/pages/FollowUp.tsx` e `frontend/src/components/screens/VerificationPage.tsx`. O tipo de produto e o papel do usuário não alteram o padrão visível. Valores ausentes são texto, portanto a informação permanece compreensível por leitores de tela sem depender de cor ou ícone.

## Contratos e APIs

### Contrato canônico de data civil

```text
Produto.dataFabricacao: string | null  // yyyy-MM-dd
Produto.dataValidade:   string | null  // yyyy-MM-dd
```

- Um valor como 13 de novembro de 2026 trafega como `2026-11-13` e aparece como `13/11/2026`.
- `null` continua `null`; a camada de interface apresenta `Não informado`.
- A entrada de datas civis deve ser validada pelo formato exato `yyyy-MM-dd`; não aceitar ou inferir `MM/dd/yyyy`, `dd/MM/yyyy` ou texto com horário como substituto silencioso. Erros seguem o mecanismo de validação de produto já existente.
- Campos temporais não civis, incluindo `UltimaModificacao`, continuam usando seus contratos próprios e não devem passar por `formatCivilDate`.

### DTOs e consumidores cobertos

- Backend: `ProdutoDTO`, `ProdutoAlertaDTO`, `QuimicoDTO`, `VidrariaDTO` e `ProdutoAcompanhamentoDTO`. `ProdutoDTO` também é usado pela projeção aninhada de `LotesController`.
- Endpoints: consulta paginada geral, consulta paginada por tipo, `catalogo-administrativo`, `emAlerta` e consulta de produto por ID.
- Frontend: `ProductCatalogItem`, `AdminProductCatalogItem`, `getAllProducts`, `getAdminProductCatalog`, `getProductById`, `FollowUp` e `VerificationPage`. A lista de pesquisa continua sem data visível; os tipos mantêm `string | null`.
- `LoteDTO.DataFabricacao/DataValidade/DataEntrada` são datas do lote, já serializadas em ISO por `LoteMappingProfile`, e não mudam nesta issue. Datas de evento em `EmprestimoAcompanhamentoDTO` também não mudam; apenas datas de `ProdutoAcompanhamentoDTO` são civis de produto.

### Compatibilidade

O formato textual muda intencionalmente de valor local dependente da cultura e possivelmente com hora para `yyyy-MM-dd`. Nomes das propriedades, nulabilidade e formato estrutural JSON permanecem estáveis. O frontend interno deve ser publicado junto com o backend para não receber respostas antigas durante a transição. Consumidores externos que interpretem a ordem antiga ou dependam de hora precisam adotar o formato ISO. Não criar um parser heurístico para preservar textos localizados ambíguos.

## Dados e migrações

- Sem migração, backfill ou alteração de coluna. O armazenamento continua usando `DateTime?` existente.
- A projeção deve preservar os componentes de calendário persistidos, independentemente de `DateTime.Kind`; nenhum deslocamento por fuso pode ocorrer. A natureza civil é reforçada por serialização explícita `yyyy-MM-dd`.
- A evidência local mostra que `ProdutoMappingProfile` usa `DateTime.MinValue` como fallback para validade em um caminho de mapeamento de patch quando a string vem vazia. Em conformidade com o PRD, a projeção de leitura deve tratar esse sentinel técnico como ausência.
- A normalização é apenas de resposta: mapear `DateTime.MinValue`/`0001-01-01` para `null`, sem atualizar o banco, migrar dados ou reescrever histórico. O frontend deve apresentar `Não informado` para esse valor.

## Segurança, privacidade e permissões

Não muda autorização, escopo de acesso, dados pessoais ou política de cache. Os mesmos endpoints e regras de perfil continuam determinando quem consulta produto. A mudança somente normaliza campos já presentes nas respostas. Testes devem comprovar que não há exposição de valores brutos inválidos; nenhum log novo deve registrar conteúdo de produto.

## Falhas, observabilidade e operação

- Datas ausentes ou inválidas recebidas pelo frontend resultam em `Não informado`, sem exceção, `undefined`, `null` textual ou fallback para texto bruto.
- O backend recebe valores de data em `DateTime?`; os mapas devem preservar nulabilidade e produzir ISO para valores representáveis. Entrada fora do formato exato falha na validação em vez de depender da cultura do processo.
- Não é necessária telemetria adicional. Os testes de mapeamento e contrato detectam desvios do formato antes da publicação.

## Compatibilidade, disponibilização e reversão

- Disponibilizar frontend e backend na mesma versão, incluindo todas as rotas de leitura enumeradas acima.
- Antes da publicação, validar a lista de alertas, o detalhe de produto químico, vidraria e outro tipo, além de respostas com data ausente, em culturas de servidor distintas.
- Reversão de aplicação restaura o comportamento antigo de serialização e formatação; não exige rollback de banco porque não há migração. Como a nova interface espera ISO, uma reversão parcial apenas do backend é incompatível; o rollback deve coordenar ambos os componentes.
- Não corrigir nem migrar `0001-01-01` na reversão ou publicação. Reavaliar esse valor somente após confirmar sua proveniência.
- Coordenação com #508: campos interativos devem enviar e consumir a data civil como ISO `yyyy-MM-dd`; a apresentação de leitura deve reutilizar `formatCivilDate` existente. #508 altera seleção/digitação e não deve introduzir conversão UTC ou duplicar um formatador visível.

## Estratégia TDD e pirâmide de testes

### RED

1. Em `backend/Tests/Mappings/ProductDateMappingTests.cs`, adicionar casos para mapas de leitura de `ProdutoDTO`, `ProdutoAlertaDTO`, `QuimicoDTO`, `VidrariaDTO` e `ProdutoAcompanhamentoDTO`: datas com um dia/mês não intercambiáveis, datas ambíguas, nulos e `DateTime.MinValue`. Verificar que saída é `yyyy-MM-dd` para datas válidas e `null` para nulos/sentinel, invariável entre `pt-BR` e `en-US`.
2. Acrescentar teste de contrato de JSON ou de controller para garantir que resposta dos endpoints serializa `dataValidade`/`dataFabricacao` sem hora e com a mesma forma canônica nos mapas base e especializados.
3. Em `frontend/src/function/date.test.ts`, verificar `formatCivilDate` com dias 13 e 05, ano bissexto, `0001-01-01`, `null`, ausência, ISO inválido e texto legado com horário/regional; `0001-01-01`, ausência e valores inválidos devem resultar em `Não informado`, e apenas ISO válido deve formatar.
4. Em `frontend/src/pages/FollowUp.responsive.test.tsx`, garantir `dd/MM/yyyy` para validade e `Não informado` para ausência/valor inválido. Em `frontend/src/components/screens/VerificationPage.navigation.test.tsx` ou teste dedicado, garantir que detalhe apresenta fabricação e validade formatadas para os tipos de produto cobertos.

### GREEN

Implementar um único formatador civil backend reutilizável por perfis de mapeamento; usá-lo nas datas de `Produto` de todos os DTOs cobertos. Validar a entrada com parsing exato invariantemente. Integrar o `formatCivilDate` existente nas duas telas que apresentam datas e incluir as datas no detalhe do produto conforme o PRD. Preservar os demais formatos de instante.

### REFACTOR

Remover mapeamentos implícitos ou conversões gerais apenas dos campos civis de produto; eliminar qualquer chamada a `Date`/`parseISO` de leitura desses campos. Centralizar o formatador compartilhado, manter nulabilidade e revisar que o teste de configuração AutoMapper continua válido. Confirmar que não foram tocados `LoteDTO` (datas próprias) nem timestamps operacionais.

### Pirâmide

- Maioria: testes unitários rápidos do formatador, validação ISO e mapas AutoMapper sob culturas diferentes.
- Integração: contrato de saída JSON dos endpoints de produto e detalhe.
- Interface: testes de componente para acompanhamento e detalhe; verificação manual de acessibilidade e apresentação após as suítes automatizadas.

## Esteira de qualidade

| Área | Comando local | Verificação de CI | Lacuna/ação |
|---|---|---|---|
| Testes frontend focados | `cd frontend; npm run test -- --run src/function/date.test.ts src/pages/FollowUp.responsive.test.tsx src/components/screens/VerificationPage.navigation.test.tsx` | `npm run test -- --run --coverage` em `.github/workflows/container-ci.yml` | Não executar durante criação da especificação; rodar na implementação |
| Suíte frontend | `cd frontend; npm run test -- --run` | Mesmo comando de CI com `--coverage`, job `frontend-quality` | CI também roda lint e build |
| Lint e build frontend | `cd frontend; npm run lint` e `cd frontend; npm run build` | Etapas `Run frontend lint` e `Build frontend` | Sem lacuna identificada |
| Testes backend focados | `dotnet test backend/Tests/Tests.csproj --filter "FullyQualifiedName~ProductDateMappingTests"` | Job `backend-quality`; projeto xUnit `backend/Tests/Tests.csproj` | Incluir teste em `ProductDateMappingTests` ou classe de contrato adjacente |
| Solução backend | `dotnet test backend/backend.sln --no-restore -c Release --nologo --disable-build-servers` | CI restaura e compila `backend/backend.sln`, roda testes de integração selecionados e depois `dotnet test backend/backend.sln --no-build --no-restore -c Release --nologo --disable-build-servers --collect:"XPlat Code Coverage"` | Testes PostgreSQL de integração dependem do Docker conforme o workflow |

O workflow `container-ci.yml` é acionado em pull request para `develop` e em `merge_group`/`workflow_dispatch`. Esta especificação não executa testes nem altera a CI.

## Matriz de rastreabilidade

| Requisito | Componentes | Testes | Evidência |
|---|---|---|---|
| RF-001 | Formatador de datas nos mapas backend; `FollowUp`; `VerificationPage` | Mapas sob culturas diferentes; asserts de `13/11/2026` e `05/11/2026` nas telas | Resposta JSON ISO e texto visível `dd/MM/yyyy` |
| RF-002 | DTOs de produto e telas de leitura | Assert de ausência de hora no DTO e na tela | Nenhum `00:00:00` em data de produto |
| RF-003 | Projeção de DTO e `formatCivilDate`; campos nulos/inválidos/sentinel | Casos para `null`, `DateTime.MinValue`, vazio, ISO inválido, texto US/BR e texto com horário | Estado `Não informado`, sem valor técnico bruto |
| RNF-001 | Formatador backend invariantemente; formatação frontend por componentes ISO | Repetir teste de mapeamento sob `pt-BR` e `en-US`; validar string ISO em UI | Mesma data civil em culturas distintas e sem mudança de dia |
| RNF-002 | Conteúdo textual de `FollowUp` e detalhe | Teste de texto/árvore acessível; leitura dos rótulos e valores | Data anunciada como texto com dia, mês e ano |
| CA-001 | `FollowUp` | Teste com `2026-11-13` | Exibe `13/11/2026` |
| CA-002 | Mapper e helper | Teste backend entre culturas; helper sem locale do ambiente | Mesmo conteúdo nos ambientes `en-US` e `pt-BR` |
| CA-003 | Todos os mapas de Produto e telas de leitura | Teste DTO/JSON mais asserts de tela | Sem horário em fabricação/validade |
| CA-004 | Projeção de DTO, helper e consumidores de leitura | Testes de ausência, sentinel e valores malformados | `Não informado`, sem string bruta ou `01/01/0001` |
| CA-005 | Conversão de `DateTime` civil a ISO e helper que recorta texto | Teste unitário de mapa e UI, inclusive `DateTime.Kind`/string sem offset | Dia, mês e ano originais preservados |
| CA-006 | Componentes de acompanhamento e detalhe | Teste com queries acessíveis e texto completo | Leitor de tela recebe data e rótulo como texto compreensível |

## Alternativas e decisões

| Decisão | Alternativas | Recomendação | Escolha confirmada | Consequências |
|---|---|---|---|---|
| Representação da API | Texto regional `dd/MM/yyyy`; timestamp UTC; ISO de data civil | Preservar contrato string e emitir `yyyy-MM-dd` | Adotada autonomamente para alinhar a #508 e evitar fuso/cultura | Consumidores internos atualizam a leitura; JSON segue estável estruturalmente |
| Local da apresentação brasileira | Backend retorna `dd/MM/yyyy`; frontend interpreta ISO e formata | Backend canônico + frontend formatador civil | Adotada | API não conhece preferência visual; todas as telas reutilizam regra explícita |
| Valor `0001-01-01` | Tratar como ausência na apresentação; alterar banco; preservar o dia recebido na resposta | Tratar como ausência somente na projeção de leitura; preservar o valor persistido | Decidido conforme o PRD e a autorização autônoma do usuário | A UI deixa de exibir uma data aparentemente válida; nenhum dado persistido é alterado |
| Descoberta/grilling | Reabrir requisitos já definidos ou seguir PRD/issue | Prosseguir sem pergunta, mantendo decisão de sentinel explícita | Dispensado pelo usuário para as issues existentes | Esta spec documenta a inferência e a decisão local |
| Escopo com #508 | Duplicar o trabalho de campos de entrada ou coordenar contrato | #507 cobre leitura/DTO; #508 cobre interação e compartilha ISO/API e helper | Adotada | Evita formatos divergentes entre formulário e consulta |

## Riscos e mitigação

- **Culturas do runtime afetam conversões implícitas:** mapear cada DTO explicitamente e testar em duas culturas distintas.
- **Deslocamento por fuso:** representar data civil como ISO sem offset e formatar por partes; não construir um objeto `Date` para exibição.
- **Consumidor espera string antiga com hora:** publicar frontend e backend na mesma versão e registrar o novo formato no contrato dos DTOs.
- **Campos aparecem em endpoints esquecidos:** manter inventário de `ProdutoDTO` e `ProdutoAcompanhamentoDTO`; revisar todos os mapas e controllers na tarefa de implementação.
- **`DateTime.MinValue` pode aparecer em registros históricos:** tratar como ausência somente nas respostas de leitura; preservar os valores persistidos e não incluir migração neste escopo.
- **Árvore local já modificada:** integrar/revisar as alterações locais em vez de substituí-las; mudanças deste trabalho continuam apenas na documentação até a etapa de implementação.

## Perguntas abertas

- Não há decisão bloqueante para decompor ou implementar a normalização de formato. O PRD define `0001-01-01` como marcador de ausência na apresentação; a origem dos valores armazenados pode ser investigada separadamente, sem bloquear esta entrega.
