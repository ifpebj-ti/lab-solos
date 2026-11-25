# Especificação técnica de cadastro de produtos

- **Status** — Rascunho
- **PRD** — [Cadastro de produtos](./prd.md)
- **Atualizado em** — 2026-11-15
- **Validação de design** — Pendente. Descoberta dispensada pelo usuário no PRD.

## Resumo técnico

Estender o cadastro de químicos e vidrarias e as projeções de consulta que leem os dados salvos. A interface tratará seleção e exibição de data como dia civil. A decisão de considerar um químico vencido seguirá a referência comum com [Listagem e alertas](../listagem-e-alertas-de-produtos/techspec.md).

## Estado atual

- `FormQuimicos` usa React Hook Form/Zod, oferece Catmat, envia `pesoMolecular: 0` e usa `fornecedor` para o campo da marca. A regex atual da fórmula aceita caracteres ASCII delimitados. `DateInput` funciona por calendário e bloqueia datas passadas no campo de validade. A validação por `Date.parse` é permissiva para certos dias impossíveis.
- `FormVidraria` oferece `formatos` e `grausPureza` no preenchimento de Formato e Altura. `Vidraria.Altura` usa enum obrigatório na entidade, com valor `Indefinido` disponível.
- `POST /api/Produtos` usa `AddProdutoDTO`, `ProdutoService` e `ProdutoMappingProfile`. Já há `PesoMolecular` anulável em `Quimico`, `AddProdutoDTO` e `QuimicoDTO`. A consulta por ID projeta `QuimicoDTO` ou `VidrariaDTO`. `VerificationPage` precisa ler os dados apresentados pelo cadastro.
- A busca local por `dd/mm/yyyy`, ignorando caixa, identificou ocorrências como tokens de `date-fns` em `date.ts`, `DateInput`, `DateInputVidraria`, `DateInputOutros`, `DateRangeInput`, `VerificationPage` e `ProductHistory`. Na revisão de RF-001, distinguir esses tokens das orientações exibidas, inclusive textos padrão de componentes e mensagens de validação.

## Arquitetura proposta

Concentrar a conversão da entrada e a formatação civil no frontend com os auxiliares existentes em `function/date.ts`. `FormQuimicos` mantém a submissão e a confirmação, e `ProdutoService` valida a solicitação antes do mapeamento. Reaproveitar `TimeProvider` no servidor para resolver o dia atual conforme a decisão D1. Os campos históricos continuam disponíveis na consulta e na edição existente, que tem requisitos próprios em [Integridade de produtos e lotes](../integridade-de-produtos-e-lotes/techspec.md).

## Fluxos e componentes

1. `DateInput` aceita edição textual e seleção direta de ano, mês e dia pelo calendário existente. Digitação e calendário convergem para um valor civil `yyyy-MM-dd`. Uma edição inválida invalida também o valor anterior. Testar anos bissextos, entrada incompleta, data inexistente, troca de método de entrada e datas passadas em ambos os campos. Usar `dd/mm/aaaa` no texto visível, inclusive nos campos de outros fluxos que apresentam máscara em inglês.
2. Separar a seleção da fórmula da formatação enviada. A ação de aplicar/remover atua somente sobre o intervalo selecionado, mantém foco e seleção navegáveis e não transforma automaticamente coeficientes nem dígitos digitados. Recomenda-se edição como texto e serialização Unicode no campo atual se a cobertura de caracteres de D3 for suficiente.
3. Depois de validar o formulário, comparar a validade com o dia civil de referência. Em validade passada, abrir diálogo com nome acessível, confirmação, cancelamento e restauração de foco. Cancelar preserva o estado integral e encerra o envio. Confirmar envia os dados daquela confirmação uma vez durante a espera do resultado, e mudanças no formulário invalidam a confirmação anterior. Se a requisição for recusada por virada do dia, atualizar a referência e exigir nova avaliação. Em validade igual ou posterior, submeter sem diálogo.
4. `FormQuimicos` adota Marca, Peso Molecular e somente grupos definidos elegíveis. `FormVidraria` usa Categoria com os valores de `FormatoVidraria` e dispensa Altura. `VerificationPage` exibe fórmula, marca, peso quando informado e categoria do registro, com estado legível para ausência de dados.

## Contratos e APIs

| Interface atual | Especificação e condicionantes |
|---|---|
| `POST /api/Produtos` | Preservar `201` e a consulta indicada por `Location`. Validar datas civis e grupo antes do mapeamento. Responder a campo inválido com `400` e erro associado ao campo, consumível por `formErrors.ts`. Dados trafegam com `formulaQuimica`, `fornecedor` para Marca, `pesoMolecular` e `formato` para Categoria. No cadastro novo de químico, omitir CATMAT e rejeitar enum fora do domínio ou `Indefinido`. |
| Cadastro vencido | A D1 define o dia efetivo no servidor. O contrato de confirmação depende de D4. A API responde com resultado de negócio identificável quando a validade passou e a confirmação está ausente. A segunda submissão representa concordância explícita sobre aquela validade. A API deve validar também no acesso direto e recusar enquanto a confirmação exigida não chegar. |
| `GET /api/Produtos/{id}` e `GET /api/Produtos/tipo/{tipoProduto}` | Contratos tipados conservam campos atuais. `pesoMolecular` ausente continua anulável e a fórmula é devolvida no formato persistido. Categoria vem de `formato`. Proteger a consulta de regressões com dados anteriores ao cadastro revisado. |

## Dados e migrações

- Preservar `Catmat`, `Fornecedor`, `Grupo`, `Formato` e `Altura` gravados. Para vidraria nova sem altura, explicitar `AlturaVidraria.Indefinido`, evitando o valor padrão ordinal `Alta`. Preservar a possibilidade de consultar valores anteriores de Altura.
- `PesoMolecular` anulável permite registros anteriores sem valor. A retenção de `float?` ou mudança para `decimal?` depende de D2. Se houver mudança de tipo, testar ida e volta e documentar arredondamento, especialmente para valores já persistidos. Não reinterpretar zeros históricos como ausência sem evidência e decisão operacional.
- O calendário e a máscara mantêm o contrato numérico e o armazenamento atual de datas. Validar `yyyy-MM-dd` como dia civil no ingresso. `ProdutoMappingProfile` mantém conversão para UTC na persistência. A serialização da fórmula e eventual migração dependem de D3.

## Segurança, privacidade e permissões

Manter `ApenasAdministradores` para criação e as políticas existentes de consulta. Validar dados no servidor, incluindo os valores de enum. Renderizar fórmula como texto ou como segmentos estruturados com elementos React fixos, conforme D3. Limitar validação, amostras e evidências a dados sintéticos.

## Falhas, observabilidade e operação

- Usar `notifyError` e `applyRecognizedFieldErrors` para feedback local, mantendo formulário preenchido após recusa. Distinguir datas inválidas, confirmação necessária e erro operacional. Na validação de teclado, conferir foco inicial no diálogo, acionamento dos controles e retorno ao campo/acionador.
- Registrar a contagem de sucessos, recusas de validação e falhas técnicas, com código da operação e correlação já disponíveis. Excluir valores preenchidos e o corpo da requisição dessa nova telemetria. Para resposta de criação incerta, conferir o resultado antes de disparar outra escrita. A prevenção de clique duplicado cobre envios simultâneos da mesma tela.

## Compatibilidade, disponibilização e reversão

Validar os formulários novos com dados legados e testar as URLs atuais de consulta. Coordenar backend e frontend antes de exigir confirmação no contrato. Para a convivência de versões, fechar D4 antes da disponibilização. Se houver migração de peso ou fórmula, manter compatibilidade de leitura entre versões durante a transição e preservar as colunas novas até assegurar leitura dos dados. Uma reversão de frontend após gravação de fórmulas deve manter o leitor compatível com a representação escolhida e pode suspender temporariamente a criação revisada. Reverter o código de captura sem apagar informações já gravadas.

## Estratégia TDD e pirâmide de testes

### RED

Adicionar testes unitários de parser de dia civil e edição por seleção, testes de componente dos formulários sem simular a entrada real da data, contrato HTTP de erros/`201` e integração com PostgreSQL para gravar e reler. Observar falhas por motivo funcional na janela de validade, no cancelamento, na persistência e na compatibilidade. O cenário Playwright usa teclado, datas controladas e produto sintético, cobrindo cadastro e consulta.

### GREEN

Fazer passar cada caso com a menor mudança na ordem datas e máscara, formulário e leitura, validações do servidor e confirmação. Introduzir cobertura dos ramos condicionados depois das escolhas registradas. Observar um único produto persistido na confirmação e zero produtos após cancelamento, inclusive pelo fluxo normal do navegador.

### REFACTOR

Reutilizar o parser civil e feedback de campos, remover estado duplicado entre calendário e digitação e executar novamente os casos focados e as suítes completas. Verificar com banco sintético que os valores antigos são lidos sem alteração.

## Esteira de qualidade

`backend/backend.sln` inclui `Tests/Tests.csproj` e o frontend já tem Vitest e Playwright. `Container CI` executa em PR para `develop` nos eventos `opened`, `synchronize`, `reopened`, `edited` e `ready_for_review`, em `merge_group` e manualmente. `Container Release` roda em PR fechado para `main` e manualmente, como etapa de disponibilização. Garantia de bloqueio por proteção de branch depende de configuração externa e não foi verificada no checkout.

| Área | Comando local | Verificação de CI | Lacuna/ação |
|---|---|---|---|
| Frontend, em `frontend/` | `npm ci`, `npm run test -- --run`, `npm run lint`, `npm run build` | `frontend-quality` no `Container CI` | Ampliar `FormQuimicos.errors.test.tsx`, `FormVidraria.errors.test.tsx` e os testes de `VerificationPage` com entradas, estado e leitura de dados. |
| Backend, na raiz | `dotnet restore backend/backend.sln --locked-mode`, `dotnet build backend/backend.sln --no-restore -c Release`, `dotnet test backend/backend.sln --no-build --no-restore -c Release` | `backend-quality` executa a solução e o subconjunto `Integration` do projeto de testes com Docker | Expandir `ProductDateMappingTests` e `ProdutosControllerTests`. Adicionar integração real de criação/leitura e `ControlledTimeProvider` com PostgreSQL via Testcontainers. |
| Jornadas | Da raiz `docker compose -f docker-compose-e2e.yml up -d --build --wait`, em `frontend/` `npx --no-install playwright install chromium` e `npm run test:e2e -- --project=real --project=ui` | `auth-e2e` executa os dois projetos e limpa a pilha | Incluir qualquer arquivo novo na lista do projeto correto em `playwright.config.ts`. Verificar seleção com `npm run test:e2e:list`. |

## Matriz de rastreabilidade

| Requisito | Componentes | Testes | Evidência esperada |
|---|---|---|---|
| RF-001, CA-001, CA-002 | `DateInput`, `function/date.ts`, textos visíveis | Unitário, componente, revisão visual | Máscara `dd/mm/aaaa` e valor `05/11/2026`. |
| RF-002, CA-003, CA-004 | Campo de fórmula em `FormQuimicos` | Unitário, componente, E2E | `2H2O` digitado, apenas o segundo dígito subscrito após ação, remoção reversível por teclado. |
| CA-005, CA-006 | `Quimico`, `QuimicoDTO`, `VerificationPage` | Contrato, integração e componente | Duas representações distintas gravadas e recuperadas, com grafia legada preservada. |
| RF-003, CA-007 | `FormQuimicos`, `ProdutoService`, `ProdutoMappingProfile`, `VerificationPage` | Componente, contrato e integração | Peso informado e marca recuperados, Grupo sem Indefinido, CATMAT ausente do cadastro. |
| RF-004, CA-009, CA-010 | `DateInput`, Zod, parser do servidor | Unitário, contrato, componente e E2E | Digitação e seleção direta do ano funcionam, `31/02/2026` identifica o campo e produz zero gravações. |
| RF-005, CA-011, CA-012, CA-013 | `FormQuimicos`, diálogo, `ProdutoService`, referência civil comum | Componente, contrato, integração e E2E | Passado exige confirmação, cancelamento mantém os dados e não grava, hoje/futuro segue direto. |
| RF-006, CA-014 | `FormVidraria`, `VidrariaDTO`, `VerificationPage` | Componente e integração | Criação sem Altura e leitura da Categoria escolhida. |
| RNF-001 | Campo de fórmula, `DateInput`, diálogo | E2E e componente acessível | Seleção, erro associado, foco e confirmação/cancelamento operáveis por teclado. |
| RNF-002, CA-008, CA-015 | `QuimicoDTO`, `VidrariaDTO`, `VerificationPage` | Integração de dados legados e componente | Peso ausente, grupo legado e altura histórica continuam consultáveis. |

## Alternativas e decisões

| Decisão | Alternativas | Recomendação | Escolha confirmada | Consequências |
|---|---|---|---|---|
| D1. Dia civil compartilhado | Fuso institucional configurado, UTC ou fuso de cada navegador | Fuso institucional no servidor via `TimeProvider` | Usuário aprovou `America/Sao_Paulo` como padrão da configuração do servidor em todas as instâncias | Cadastro, [Alertas](../listagem-e-alertas-de-produtos/techspec.md) e recálculos de validade em empréstimos comparam a data de validade ao mesmo dia civil. O vencimento começa à meia-noite do dia seguinte nesse fuso, independentemente do navegador. |
| D2. Peso Molecular | Adaptar `float?` existente ou usar `decimal?` quando a precisão precisar ser exata | Reusar campo atual se a precisão e faixa aprovadas forem representáveis, preservando ausência dos legados | Definida na [decisão local](../decisoes-de-planejamento.md#cadastro-e-alertas) | Condiciona tipo, unidade, escala, faixa, arredondamento e obrigatoriedade na escrita. |
| D3. Subscrito | Texto Unicode no campo atual ou texto com intervalos estruturados | Unicode se o conjunto aprovado abranger os caracteres selecionáveis. Usar intervalos quando a abrangência exigir mais caracteres | Definida na [decisão local](../decisoes-de-planejamento.md#cadastro-e-alertas) | Condiciona formato persistido, compatibilidade com leitura/edição e se haverá migração. |
| D4. Confirmação de validade passada | Comparação apenas no navegador ou concordância verificável no comando após comparação do servidor | Resultado de negócio identificável e confirmação vinculada ao valor, com implantação coordenada | Definida na [decisão local](../decisoes-de-planejamento.md#cadastro-e-alertas) | Condiciona corpo/erro de `POST`, tratamento de cliente anterior e caminho de reenvio após virada do dia. |

## Riscos e mitigação

- Funções que convertem dia civil em instante local podem antecipar a data em um fuso negativo. Cobrir fronteiras com dois fusos sintéticos e reaproveitar a mesma referência do servidor.
- Transformar todos os dígitos ou normalizar Unicode de forma incompatível pode destruir a grafia. Preservar texto salvo, intervalos selecionados e comportamento dos leitores legados.
- Trocar os rótulos junto com os nomes do contrato introduziria migração de consumidores. Manter aliases existentes e testar os DTOs nas projeções do detalhe e do tipo.

## Perguntas abertas

- Consultar as [decisões de planejamento](../decisoes-de-planejamento.md#cadastro-e-alertas).
