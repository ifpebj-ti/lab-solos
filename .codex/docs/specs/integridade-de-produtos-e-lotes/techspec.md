# Especificação técnica de integridade de produtos, lotes e histórico de saída

- **Status** — Rascunho
- **PRD** — [Integridade de produtos, lotes e histórico de saída](./prd.md)
- **Atualizado em** — 2026-11-15
- **Validação de design** — Pendente. Descoberta dispensada pelo usuário no PRD.

## Resumo técnico

Aplicar edições parciais por campo, preservar referências e movimentações nas alterações de produto, entregar um histórico de saídas efetivas limitado pelo vínculo e vincular lotes ao inventário sob validação. A regra do último administrador habilitado pertence às mutações de conta, com rastreabilidade aos aceites deste PRD em [Segurança de contas e sessões](../seguranca-de-contas-e-sessoes/techspec.md).

## Estado atual

- `ProdutosController` oferece `PUT`, JSON Patch e `DELETE`. O patch aplica o documento a um DTO preenchido com o produto, valida alguns campos e mapeia o DTO inteiro de volta. Em `ProdutoMappingProfile`, o caminho nulo de validade vira `DateTime.MinValue`, e a condição global do AutoMapper pode impedir que um nulo explícito limpe um valor. A exclusão direta não avalia vínculos. `StatusProduto` representa disponibilidade e outros estados operacionais. A desativação requer uma decisão própria de ciclo de vida.
- `AppDbContext` usa PostgreSQL, `Produto.LoteId` opcional com `SetNull` ao excluir lote, e `ProdutoEmprestado` com chave composta e exclusão em cascata a partir de produto e empréstimo. O conjunto de itens já existe para solicitações pendentes.
- `ProdutoService.ObterHistoricoSaidaProdutoAsync` consulta itens por produto, projeta campos de solicitante/aprovador, inclui identificador derivado do e-mail e usa o lote corrente do produto. A consulta não distingue saída efetiva de solicitação. `VerificationPage`, `ProductHistory` e `Product.ts` têm contratos próprios do mesmo histórico, incluindo busca e apresentação do identificador pessoal.
- `LoteController`, em `Controllers/LotesController.cs`, aceita um `AddLoteDTO` com dados de produto, mas o mapeamento genérico cria somente `Lote`. O contrato de entrada carece de identificador de vínculo nem `CodigoLote`. `LoteService` valida só presença de alguns dados por tipo. `SeedProdutos` demonstra a relação persistida por `LoteId`.
- `UsuariosController.Delete` remove a entidade e confirma a unidade de trabalho. A alteração por `PATCH /api/Usuarios/{usuarioId}` passa por validação de perfil, e há comandos de aprovação/rejeição. O conjunto de mutações que pode retirar um administrador habilitado precisa de uma guarda comum.

## Arquitetura proposta

Aplicar a política na camada de aplicação, usando `IUnitOfWork`/`AppDbContext` para persistência e transação, e operações explícitas nos limites da API. Autorizar o histórico antes de projetar, usando a infraestrutura `UserResourceAccessService` como referência para construir a política específica (D2). `D3` fecha a modelagem entre lote e inventário. Coordenar as escritas de estoque e a fonte de saída com [Decisões e devoluções de empréstimos](../decisoes-e-devolucoes-de-emprestimos/techspec.md).

## Fluxos e componentes

1. Edição parcial recebe um conjunto de caminhos/operadores e valida, para cada alteração explícita, perfil, campo, tipo e regra de domínio. A análise ocorre antes de alterar a entidade. A escrita aplica somente campos informados e admitidos. A remoção explícita entra pela política de operação por campo. Uma alteração recusada preserva a versão anterior inteira. `ProductEditModal` envia apenas diferenças e exige ação explícita para limpar campos aprovados.
2. Na exclusão ou desativação, calcular dependências e executar a operação dentro da mesma fronteira de integridade que protege a criação de vínculos. Uma exclusão com dependência impeditiva recebe conflito. Uma desativação elegível retira o item das operações de catálogo ativo/solicitação e preserva identidade e histórico. Reativação e novas saídas ficam subordinadas à matriz D1. Definir ali o tratamento de empréstimos pendentes, devoluções e lotes vinculados ao item.
3. `UsuariosController` e o serviço de mutação de contas compartilham a guarda de continuidade. A verificação e a mutação devem ter a mesma fronteira transacional. A disputa entre duas reduções concorrentes deve deixar pelo menos um administrador habilitado. Considerar desativação, exclusão e qualquer alteração de papel que de fato retire uma das contas habilitadas. Reaproveitar a definição de papel e estado de [Segurança de contas](../seguranca-de-contas-e-sessoes/techspec.md), com `NivelUsuario.Administrador` e `StatusUsuario.Habilitado` como referência do código atual.
4. Histórico consulta escopo autorizado de produto e movimentações. Aplicar o mesmo recorte para modo de leitura, linhas e agregados antes de materializar os dados. O critério de saída efetiva combina a fonte transacional escolhida para empréstimos com tratamento documentado para legados. Manter saída registrada após devolução ou desativação, excluindo pendentes e rejeitadas sem saída comprovada. Projetar produto, quantidade e lote quando registrado no movimento. O lote corrente do produto não substitui o lote do evento.
5. Cadastro de lote valida os campos fornecidos, converte datas sem normalização permissiva, confirma referência e cria cadastro/vínculo em uma transação. A consulta por ID ou código e a leitura pelo inventário devolvem a associação coerente. A auditoria operacional de legados usa recorte acordado e revisão somente leitura com evidência. Classificar cada caso como comprovado, ausente ou inconsistente, encaminhando lacunas para [Conciliação operacional](../conciliacao-operacional/techspec.md).

## Contratos e APIs

| Interface atual | Especificação e condicionantes |
|---|---|
| `PATCH /api/Produtos/{id}` | Preservar JSON Patch e a representação de retorno conhecida. Definir conjunto explícito de operações/caminhos em D1. Omissão preserva o campo e remoção autorizada efetiva a ausência. Valor inválido recusa o documento inteiro. Usar falha por campo/operação com `400` para entrada inválida e resposta coerente de autorização para ator sem acesso. |
| `PUT /api/Produtos/{id}` e `DELETE /api/Produtos/{id}` | Inventariar consumidores do `PUT` antes de decidir manutenção ou transição para o patch. Qualquer caminho de escrita deve preservar a regra de alteração explícita quando for parcial. Manter exclusão bem-sucedida em `204`. Para dependência impeditiva, propor `409` com identificador estável. Definir forma de desativação e seu contrato em D1. |
| `PATCH /api/Usuarios/{usuarioId}` e `DELETE /api/Usuarios/{id}` | Os caminhos que retiram administrador habilitado devem recusar a operação quando violar a continuidade. Propor `409` com identificador único da regra, sem alteração da conta. Compartilhar contrato e implementação com a especificação de contas. |
| `GET /api/Produtos/{id}/historico-saida` | Coleção e resumos calculados no escopo. `200` vazio e totais zero para ator autorizado sem saídas elegíveis. Para falta de vínculo, seguir a política de resposta de recurso definida em D2. Substituir o DTO atual por projeção explícita dos dados mínimos. Omitir e-mail em resposta, resumo, identificador e dados aninhados. |
| `POST /api/Lote/AddLote`, `GET /api/Lote/GetById/{id}`, `GET /api/Lote/GetByCodigo/{codigoLote}` | Preservar as rotas atuais salvo necessidade de versionamento decidida em D3. Entrada deve representar código e vínculo de maneira inequívoca, com regras por tipo em D3. `201` com localização do lote que pode ser consultada. Respostas de entrada inválida identificam campo ou vínculo e preservam o inventário. Contrato de cardinalidade, código, erros e consultas espera decisão. |

## Dados e migrações

- Não sobrescrever campos patrimoniais nem relações de registros antigos para completar o patch. Se D1 adotar um campo de desativação separado do status operacional, planejar migração aditiva e leitura explícita de ativos e históricos. Verificar referências antes de trocar a cascata em `ProdutoEmprestado` por restrição. O teste relacional deve comprovar a política mesmo em disputa entre exclusão e uma nova referência.
- Preservar saldos e movimentações. Consumir o registro transacional da saída conforme a [D4 aprovada de Empréstimos](../decisoes-e-devolucoes-de-emprestimos/techspec.md#alternativas-e-decisões), com lote capturado na origem quando houver. Confirmar saídas e lotes legados por evidências existentes e encaminhar lacunas para conciliação.
- Considerar preservar `Produto.LoteId` se a operação aceitar cardinalidade atual. Se for exigido mais de um lote por item, a modelagem de vínculo muda e afeta entrada, consulta, histórico e estoque. D3 também fecha unicidade de código e as regras aplicáveis a data de fabricação/validade/entrada e campos por tipo.
- O resultado da conferência operacional deve registrar o recorte, referência de lote, vínculo comprovado ou lacuna, fonte da evidência e encaminhamento. Cabe à operação escolher fontes e recorte. A validação da implementação usa entradas sintéticas. Eventuais correções só seguem a política de [Conciliação operacional](../conciliacao-operacional/prd.md).

## Segurança, privacidade e permissões

Edição, exclusão e cadastro continuam em `ApenasAdministradores`. Aplicar política de campo/operação para controlar a atualização, inclusive sobre informações ligadas a saldo, tipo e estado. No histórico, validar a identidade e autorizar o par ator/recurso antes da projeção. A projeção adota lista explícita de campos por perfil e vínculo aprovados, inclusive resumo, sujeito e aprovador. Remover buscas por e-mail ou identificador derivado de e-mail em `VerificationPage` e `ProductHistory`, e ajustar `Product.ts`. Manter a pesquisa só em campos aprovados. Para perfis que veem subconjuntos, expor resumos calculados no mesmo escopo e somente metadados de estoque previstos na matriz. A conferência operacional deve ter acesso delimitado e registrar apenas referências necessárias à evidência.

## Falhas, observabilidade e operação

Tratar validação de campo, bloqueio por dependência, continuidade de administrador e falha técnica com respostas estáveis. Consultar novamente o resultado persistido após mutações e preservar dados em recusa. Excluir valores dos campos, dados pessoais e coleção retornada da telemetria nova. Registrar operação, tipo de resultado, correlação e totais operacionais agregados conforme a política de auditoria. A revisão de lotes entrega evidência das lacunas ao responsável pela conciliação sem alterar os dados auditados.

## Compatibilidade, disponibilização e reversão

Coordenar contrato de histórico, camada de integração e telas para que a interface aceite campos minimizados e nulos. Aplicar a proteção de autorização e a minimização já na primeira versão que altera essa rota. Se necessário em reversão, limitar temporariamente a consulta de histórico ou desativar a rota, preservando os dados e a política de acesso. Para schema de desativação ou lote, fazer migração aditiva e verificar leitura dos produtos existentes. Se o código antigo permitir exclusões destrutivas ou retirar a guarda do último administrador, manter os comandos afetados suspensos até uma versão compatível. Preservar movimentações, vínculos e registros gravados durante a transição.

## Estratégia TDD e pirâmide de testes

### RED

Testes unitários da matriz de campo, datas, números e enums. Testes de contrato para erros, projeção por vínculo, e-mail ausente inclusive em campos aninhados/resumo e totais de subconjuntos. Integração PostgreSQL lê o estado antes e depois de patch, exclusão e desativação, histórico, lotes e redução concorrente do conjunto de administradores habilitados. Adicionar evidência no navegador para edição/consulta, removendo dependência de e-mail e diferenciando vazios autorizados de operação recusada. Usar material sintético para validar o formato do relatório da revisão histórica.

### GREEN

Implementar um caso por vez, começando por alteração explícita, proteção referencial e guarda administrativa. Depois validar o recorte de histórico e seu contrato mínimo, o cadastro/consulta de lote e a evidência do recorte. Fechar as matrizes D1 a D3 antes de tornar seus cenários executáveis como aceite final.

### REFACTOR

Compartilhar o mínimo de política de conta entre seus pontos de mutação, a mesma fonte filtrada entre linhas/totais e a validação de dados que seja equivalente entre cadastro e lotes. Revisar mapeamento, acessos SQL e concorrência com base sintética, mantendo testes de leitura legada e de retorno previsível.

## Esteira de qualidade

`backend/backend.sln` já referencia `Tests/Tests.csproj`, e o frontend tem Vitest e Playwright. `Container CI` executa antes do merge para `develop` em `opened`, `synchronize`, `reopened`, `edited`, `ready_for_review`, `merge_group` e manualmente. O `quality-gate` agrega os resultados e a configuração de proteção de branch não foi verificada. `Container Release` usa PR fechado para `main` e acionamento manual.

| Área | Comando local | Verificação de CI | Lacuna/ação |
|---|---|---|---|
| Backend, na raiz | `dotnet restore backend/backend.sln --locked-mode`, `dotnet build backend/backend.sln --no-restore -c Release`, `dotnet test backend/backend.sln --no-build --no-restore -c Release` | `backend-quality` executa integração com Docker e suíte xUnit | Reutilizar `ProdutosControllerTests`, `ProdutoRepositoryTests`, `UserProfileMutationTests` e a fixture PostgreSQL. Criar testes dos contratos de histórico/lote e casos de concorrência transacional, que a suíte atual não cobre neste recorte. |
| Frontend, em `frontend/` | `npm ci`, `npm run test -- --run`, `npm run lint`, `npm run build` | `frontend-quality` | Ampliar `ProductEditModal.test.tsx` e testes de `VerificationPage`, `ProductHistory` e integração. Cobrir resposta com campos ausentes e estado vazio. |
| Navegador | Da raiz `docker compose -f docker-compose-e2e.yml up -d --build --wait`, em `frontend/` `npx --no-install playwright install chromium` e `npm run test:e2e -- --project=real --project=ui` | `auth-e2e` e `quality-gate` | Arquivo novo precisa inclusão em `playwright.config.ts`. Conferir com `npm run test:e2e:list`. Adicionar cenários em inventário sintético isolado. |
| Revisão dos lotes | Conferência operacional documentada do recorte D3 | Evidência operacional do CA-012 | Relatório depende de recorte e fontes acordados. Exercitar o formato com dados sintéticos no desenvolvimento. |

## Matriz de rastreabilidade

| Requisito | Componentes | Testes | Evidência esperada |
|---|---|---|---|
| RF-001, CA-001, CA-002 | `ProdutosController`, DTO de patch, `ProductEditModal` | Unitário, contrato, integração e componente | Omissões e vínculos preservados, remoção explícita autorizada e recusa integral de operação vedada. |
| RF-002, CA-003, CA-004 | Operações de ciclo de vida e `AppDbContext` | Integração PostgreSQL e contrato | Exclusão com dependências recusada. Produto desativado sai da operação e histórico permanece consultável. |
| RF-003, CA-005 | `UsuariosController`, serviço de mutação com guarda transacional | Integração PostgreSQL e contrato | Última conta habilitada permanece disponível após desativação, exclusão, ou tentativas concorrentes. |
| RF-004, CA-006, CA-007, CA-009 | `ProdutoService`, política por vínculo, DTO de histórico | Contrato, integração e componente | Escopo aplicado a linhas e agregados, recusa sem dados ou `200` vazio/zero conforme autorização. |
| RF-005, CA-008 | Fonte de saídas efetivas, projeção de histórico | Integração e contrato | Saídas efetivas, inclusive devolvidas, com quantidade e lote quando registrado. Solicitações sem saída não contam. |
| RF-006, CA-010, CA-011 | `LoteController`, `LoteService`, vínculo no banco | Unitário, contrato e integração PostgreSQL | Lote e vínculo válidos recuperáveis, com recusa atômica e específica para números, datas, enum e referência inválidos. |
| RF-007, CA-012 | Conferência operacional e conciliação | Revisão operacional e ensaio com registros sintéticos | Vínculo, lacuna, evidência e encaminhamento documentados por lote no recorte acordado. |
| RNF-001 | Patch, operações de produto/conta e cadastro de lote | Integração PostgreSQL e E2E | Reconsulta confirma estado e vínculos esperados depois de sucesso ou recusa. |
| RNF-002 | Projeção, `Product.ts`, `VerificationPage`, `ProductHistory` | Contrato de campos permitidos e componente | E-mail ausente do corpo, campos aninhados, identificador, resumo, apresentação e pesquisa. |

## Alternativas e decisões

| Decisão | Alternativas | Recomendação | Escolha confirmada | Consequências |
|---|---|---|---|---|
| D1. Matriz de atualização e ciclo de vida | Manter JSON Patch restrito ou adotar contrato explícito de comandos. Estado de desativação separado ou extensão de status, com restrição de FK e análise de domínio | Reutilizar rota, validar operações/campos antes da gravação e preservar desativação separada de disponibilidade quando os dois estados precisarem coexistir | Definida na [decisão local](../decisoes-de-planejamento.md#empréstimos-e-integridade) | Condiciona caminhos e operadores removíveis, tratamento do `PUT`, dependências, status, catálogo ativo e política de itens emprestados. |
| D2. Autorização e projeção de histórico | Reusar vínculo de leitura de empréstimos com recorte adicional ou criar política específica. DTO comum minimizado ou projeções explícitas por perfil | Usar a mesma base de vínculos e uma projeção mínima comum com extensões aprovadas por perfil | Definida na [decisão local](../decisoes-de-planejamento.md#empréstimos-e-integridade) | Condiciona predicados, resposta de recusa, campos aninhados/estoque, relatórios e telas. A omissão de e-mails vale em qualquer opção. |
| D3. Cadastro e conferência de lote | Vínculo atual de lote a produtos via `Produto.LoteId`, associação própria para múltiplos lotes por item ou criação conjunta de produto e lote | Preservar relação existente se atender a cardinalidade e a recuperação aprovadas. Validar antes da escrita e inventariar legados em modo somente leitura | Diretriz definida, com pré-requisitos operacionais na [decisão local](../decisoes-de-planejamento.md#empréstimos-e-integridade) | Condiciona contrato do lote, enum/faixa/data, catálogo, migração, recorte e evidências operacionais. |
| D4. Continuidade administrativa e saídas | Guarda de conta e estratégia de movimento compartilhadas nas respectivas especificações | Uma implementação por domínio, com aceite cruzado e consistência concorrente | Definida na [decisão local](../decisoes-de-planejamento.md#empréstimos-e-integridade) | O histórico usa a saída durável e a referência de lote do evento, quando houver. |

## Riscos e mitigação

- Cascata apaga registros referenciados ou checagem perde validade diante de relação criada em paralelo. Coordenar transação e restrições relacionais, verificando com PostgreSQL.
- Misturar histórico por vínculo com resumos globais revela informações fora do escopo. Usar a mesma consulta filtrada e validar presença de campos por contrato.
- Remapear registro completo altera datas, status ou dados não enviados. Usar validação por intenção do patch e semântica distinta de ausência, valor e remoção.
- Associar lote legado pelo nome ou pelo lote corrente compromete evidência histórica. Registrar lacuna com sua fonte e encaminhar à conciliação.

## Perguntas abertas

- Consultar as [decisões de planejamento](../decisoes-de-planejamento.md#empréstimos-e-integridade).
- Para a conferência de lotes legados, identificar o responsável, o recorte e as fontes operacionais disponíveis.
