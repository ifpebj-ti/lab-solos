# Especificação técnica de listagem e alertas de produtos

- **Status** — Rascunho
- **PRD** — [Listagem e alertas de produtos](./prd.md)
- **Atualizado em** — 2026-11-15
- **Validação de design** — Pendente. Descoberta dispensada pelo usuário no PRD.

## Resumo técnico

Calcular estoque baixo e validade independentemente e fornecer os mesmos motivos para a listagem administrativa e a aba Alertas. Cada produto contribui uma vez para a união e uma vez para cada motivo aplicável. A listagem administrativa também projeta a capacidade das vidrarias e exibe a unidade correspondente ao tipo de produto.

## Estado atual

- `ProdutosController.ObterProdutosEmAlerta` usa `Quantidade <= QuantidadeMinima` ou `DataValidade <= DateTime.UtcNow.AddDays(10)`, com a política `ApenasAdministradores`. `FollowUp.tsx` usa estoque estritamente abaixo do mínimo e deduz validade pelo complemento do alerta de estoque. Os cartões repetem condições próprias.
- `SearchMaterialComponent` consome `getAllProducts()` e é compartilhado entre as pesquisas de administrador, mentor e mentorado. Seu `IAllProducts` e a projeção `ProdutoDTO` de `/api/Produtos` não contêm capacidade. O campo já existe em `Vidraria.Capacidade`, no formulário em ml e em `VidrariaDTO` para consulta por tipo ou ID.
- `routes.tsx` situa a tela Alertas no fluxo administrativo, e o serviço de integração reside em `frontend/src/integration/Product.ts`. O manual administrativo descreve a regra antiga de limite igual ao mínimo.

## Arquitetura proposta

Recomenda-se uma projeção administrativa no backend que reutilize uma única regra de avaliação em Meus Produtos e Alertas. A escolha do contrato de entrega ainda depende de D2. `stockAlert = quantidade < quantidadeMinima`. `validityAlert = validade presente && validadeCivil <= hojeCivil + 10 dias`. A condição inclui datas anteriores e hoje e não depende de `StatusProduto`. Para `RF-005` do [cadastro](../cadastro-de-produtos/techspec.md), o aviso de vencimento exige `validadeCivil < hojeCivil`.

Calcular `hojeCivil` uma vez por consulta usando `TimeProvider` e a política temporal D1. Para datas legadas gravadas à meia-noite UTC como representação de dia civil, extrair o dia de negócio segundo o contrato da data, evitando convertê-lo para a véspera local. Quando a regra for expressa no PostgreSQL, usar limite exclusivo de início do 11º dia em relação à representação efetivamente armazenada, verificando paridade com a classificação das linhas.

## Fluxos e componentes

1. `ProdutosController` e a camada de consulta de produtos classificam cada registro elegível e projetam os dois motivos separadamente. Aplicar o recorte de produtos ativos quando a regra de desativação estiver definida em [Integridade](../integridade-de-produtos-e-lotes/techspec.md).
2. Para Meus Produtos, `SearchMaterialComponent` apresenta uma coluna ou legenda permanente com triângulo e exclamação, inclusive quando a lista está vazia. A linha administrativa exibe texto associado ao produto para Sem alerta, Estoque abaixo do mínimo, Validade ou ambos. Preservar ordenação, paginação, estados de carregamento e navegação por linha. Reutilizar o padrão de tabela responsiva e o ícone existente com nome acessível no texto associado.
3. `FollowUp.tsx` usa os motivos da projeção. Todos usa a união por ID. Validade e Estoque selecionam flags independentes. O cartão geral conta IDs distintos e os específicos contam produtos que carregam o motivo. Recomenda-se que os cartões continuem resumindo o conjunto geral classificado antes da busca, como na tela atual, e que busca e filtro atuem sobre as linhas e a paginação. Uma busca sem correspondência ou filtro vazio apresenta estado vazio específico, preservando a distinção de falha de consulta.
4. A apresentação da vidraria usa `1 unidade` e plural para as demais quantidades. Capacidade válida cadastrada em ml entra como sufixo do nome da linha, e capacidade ausente conserva o nome. Construir essa apresentação sem escrever no registro nem mudar a unidade exibida de químicos e outros tipos.

## Contratos e APIs

| Interface atual | Proposta condicionada |
|---|---|
| `GET /api/Produtos/emAlerta` | Manter a política `ApenasAdministradores`, a resposta de coleção, IDs estáveis e dois motivos booleanos ou uma lista de motivos estáveis a fechar em D2. Retornar unicamente os itens com pelo menos um motivo. |
| `GET /api/Produtos` | Preservar os consumidores gerais. Para Meus Produtos, comparar DTO administrativo em uma rota ou projeção específica com extensão aditiva condicionada ao perfil. Capacidade é numérica e anulável, aplicável às vidrarias. O cliente administrativo deve reconhecer explicitamente o contrato carregado. |
| Estados de resposta | `200` com coleção vazia para consulta autorizada sem correspondência. Sessão ausente e perfil sem permissão seguem a política vigente, com `401` e `403`, respectivamente, sem dados de alertas. Limitar mensagens de falha a códigos e texto da operação. |

## Dados e migrações

Usar `Produto.Quantidade`, `QuantidadeMinima`, `DataValidade` e `Vidraria.Capacidade` já persistidos. Motivos são calculados na leitura. A proposta dispensa novas colunas e alterações na unidade armazenada. Ausência explícita da data produz `validityAlert = false`. Capacidade ausente conserva o nome cadastrado. Se surgirem valores legados sem identificação segura da unidade da capacidade, tratá-los como lacuna de dados antes de rotular ou converter.

## Segurança, privacidade e permissões

A consulta operacional e os motivos calculados para Meus Produtos ficam no recorte administrativo, protegidos pela política de autorização do servidor. A navegação administrativa complementa a autorização de API. Reutilizar sessão validada e não propagar os novos dados administrativos para a pesquisa de mentor e mentorado. Testar permissões com contas e produtos sintéticos.

## Falhas, observabilidade e operação

Conservar `ErrorFeedback` e a retentativa, evitando reapresentar resultados anteriores como resposta para um filtro vazio. Registrar falhas operacionais por código e correlação. Conferir a paridade de classificação, totais e linhas pelos conjuntos de teste. Atualizar o manual administrativo quando a mudança estiver disponível, incluindo estoque estritamente abaixo do mínimo e a janela inclusive.

## Compatibilidade, disponibilização e reversão

Manter a leitura da API pública autenticada e os clientes que usam os campos atuais. Acordar D2 antes de disponibilizar frontend que depende da projeção de motivos. Testar respostas mistas entre versões caso a estratégia exija convivência e evitar inferência de validade a partir do estoque em versão nova. Para reversão, manter a autorização e os dados existentes, podendo suspender a visualização de motivos até alinhar as versões da API e da tela. Sem migração de dados pela proposta atual.

## Estratégia TDD e pirâmide de testes

### RED

Observar falhas nos testes da regra de quantidade menor, igual e maior, validade ausente, passada, hoje, décimo e décimo primeiro dias. Testar produto com dois motivos e nenhum motivo. Adicionar integração HTTP/PostgreSQL para projeção e autorização, testes de componente de filtragem, cartões e apresentação de vidraria, e jornada Playwright de navegação e nome acessível.

### GREEN

Executar a regra comum na camada de consulta, entregar motivos independentes e capacidade, renderizar a indicação permanente e derivar cartões e linhas da mesma coleção. Verificar a saída em duas referências de navegador com o dia de servidor controlado conforme D1.

### REFACTOR

Eliminar classificações duplicadas e projeções de apresentação espalhadas. Preservar filtros, retentativa, estado vazio, paginação e a tabela em tamanhos reduzidos. Reexecutar os testes com a mesma base sintética e comparar quantidades de linhas e de cartões.

## Esteira de qualidade

O checkout já inclui `Tests/Tests.csproj` em `backend/backend.sln`, Vitest e Playwright. `Container CI` executa em PR para `develop` nos eventos `opened`, `synchronize`, `reopened`, `edited` e `ready_for_review`, em `merge_group` e manualmente, com agregação em `quality-gate`. A proteção de branch não foi verificada localmente. `Container Release` roda após fechamento de PR para `main` ou manualmente.

| Área | Comando local | Verificação de CI | Lacuna/ação |
|---|---|---|---|
| Backend, na raiz | `dotnet restore backend/backend.sln --locked-mode`, `dotnet build backend/backend.sln --no-restore -c Release`, `dotnet test backend/backend.sln --no-build --no-restore -c Release` | `backend-quality` roda a solução e o subconjunto de integração com Docker | Reutilizar `ProdutosControllerTests`, fixture PostgreSQL e `ControlledTimeProvider`. Cobrir a tradução do predicado na consulta real. |
| Frontend, em `frontend/` | `npm ci`, `npm run test -- --run`, `npm run lint`, `npm run build` | `frontend-quality` | Ampliar `SearchMaterialComponent.test.tsx`, `FollowUp.responsive.test.tsx` e contrato de `Product.ts`. |
| Navegador | Da raiz `docker compose -f docker-compose-e2e.yml up -d --build --wait`, em `frontend/` `npx --no-install playwright install chromium` e `npm run test:e2e -- --project=real --project=ui` | `auth-e2e` executa a pilha sintética e os dois projetos | Listar arquivo novo no projeto correto em `playwright.config.ts` e conferir com `npm run test:e2e:list`. Cobrir estado permanente em tela e viewport móvel e ausência de permissão. |

## Matriz de rastreabilidade

| Requisito | Componentes | Testes | Evidência esperada |
|---|---|---|---|
| RF-001, CA-001 | `SearchMaterialComponent`, tabela responsiva | Componente e E2E | Indicação com ícone permanece com linhas sem alerta ou lista vazia. |
| RF-002, CA-002, CA-003 | Consulta de produtos, regra comum e `TimeProvider` | Unitário, integração PostgreSQL e contrato | Limite estrito de estoque. A validade passada, de hoje e do dia 10 qualificam, com exclusão do dia 11 e da data nula. |
| RF-003, CA-004, CA-005 | Projeção administrativa, `FollowUp` | Integração, contrato e componente | União sem repetição, filtros independentes e totais coerentes inclusive com duplo motivo. |
| CA-006 | `FollowUp`, busca e filtro | Componente e E2E | Estado vazio para o filtro ou busca sem misturar linhas de outros recortes. |
| CA-007 | `ProdutosController`, política `ApenasAdministradores` | Integração de autorização e contrato | Perfil não habilitado para alertas recebe recusa sem dados de alertas. |
| RF-004, CA-008, CA-009, CA-010 | `Vidraria`, projeção da lista, `SearchMaterialComponent` | Contrato, unitário de apresentação e componente | `1 unidade`, `4 unidades`, nome com `250 ml`/`500 ml`, sem sufixo na ausência, outras unidades preservadas. |
| RNF-001 | Texto da linha, tabela, ícone | Componente e E2E | Leitura do estado e dos dois motivos por texto vinculado à linha. |

## Alternativas e decisões

| Decisão | Alternativas | Recomendação | Escolha confirmada | Consequências |
|---|---|---|---|---|
| D1. Referência do dia civil | Fuso institucional configurado, UTC ou fuso de cada navegador | Consumir a referência comum do servidor | Usuário aprovou `America/Sao_Paulo` como padrão, conforme a [D1 de Cadastro](../cadastro-de-produtos/techspec.md#alternativas-e-decisões) | A virada do dia e o limite de dez dias usam o dia civil institucional para todas as consultas. |
| D2. Projeção administrativa | Estender contrato do catálogo para admins, rota dedicada ou combinar catálogo atual com consulta de alertas pelo ID | Projeção calculada no servidor e restrita ao fluxo administrativo, preferindo uma consulta por tela | Definida na [decisão local](../decisoes-de-planejamento.md#cadastro-e-alertas) | Condiciona formato dos motivos, rota do catálogo administrativo, compatibilidade e teste de autorização. |

## Riscos e mitigação

- Resultados diferentes por hora ou fuso. Determinar um dia civil por consulta e testar relógio fixo perto da meia-noite, incluindo o limite do décimo dia.
- Contar duas vezes o produto com dois motivos. Calcular total geral por ID e validar as contribuições separadas por motivo.
- Ausência de capacidade no contrato geral. Ler a coluna específica pela projeção administrativa e testar item legado sem capacidade.

## Perguntas abertas

- Consultar as [decisões de planejamento](../decisoes-de-planejamento.md#cadastro-e-alertas).
