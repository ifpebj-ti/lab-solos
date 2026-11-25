# PRD de listagem e alertas de produtos

- **Status** — rascunho
- **Responsável** — a definir
- **Atualizado em** — 2026-11-15
- **Validação de descoberta** — dispensada pelo usuário

## Contexto e problema

A administração usa **Produtos > Meus Produtos** para acompanhar o estoque e **Produtos > Alertas** para localizar itens que precisam de atenção. A primeira lista não evidencia estoque abaixo do mínimo. Na aba Alertas, o filtro de validade presume que todos os registros sem alerta de estoque têm alerta de validade. Vidrarias aparecem com quantidades em litros e sem capacidade no nome, o que dificulta distinguir peças do mesmo tipo.

| Issue de origem | Requisitos | Critérios |
| --- | --- | --- |
| [#466 — Indicador na listagem e filtros de alertas](https://github.com/ifpebj-ti/lab-solos/issues/466) | RF-001 a RF-003, RNF-001 | CA-001 a CA-007 |
| [#467 — Quantidade e capacidade de vidrarias](https://github.com/ifpebj-ti/lab-solos/issues/467) | RF-004 | CA-008 a CA-010 |

## Objetivo e métricas de sucesso

- Identificar em Meus Produtos se cada item tem alerta e reconhecer seus motivos pelo estado visível da listagem.
- Fazer os resultados dos filtros Todos, Validade e Estoque corresponderem às respectivas regras de inclusão, com uma linha por produto no filtro Todos.
- Conferir três condições na listagem de vidrarias: quantidade singular e plural, capacidade disponível junto ao nome e nome legível quando a capacidade está ausente.

## Usuários e jornadas

A administração consulta Meus Produtos para distinguir materiais e reconhecer quais precisam de atenção. Na aba Alertas, pesquisa um material e usa os filtros Todos, Validade ou Estoque para orientar a conferência e a reposição. Ao comparar vidrarias com o mesmo nome, identifica a capacidade de cada peça e sua quantidade em estoque.

## Escopo

### Incluído

- Indicador permanente de alerta em Meus Produtos e estado legível por produto.
- Cálculo independente dos motivos de alerta e resultados, totais exibidos e estados vazios da aba Alertas.
- Quantidade em unidades e capacidade em ml no nome exibido das vidrarias em Meus Produtos.

### Fora de escopo

- Mudança do prazo de 10 dias do alerta de validade.
- Novos canais de notificação, reposição automática e alteração da unidade histórica gravada para produtos.

## Requisitos funcionais

### RF-001 — Manter visível a indicação de alerta na listagem

A listagem de Meus Produtos deve manter uma indicação de alerta com triângulo e exclamação ainda que nenhum produto precise de atenção. Para cada produto exibido, deve ser possível reconhecer se há alerta e, quando houver, os motivos aplicáveis.

### RF-002 — Classificar estoque e validade independentemente

**Estoque abaixo do mínimo** aplica-se somente quando a quantidade atual é estritamente menor que a mínima. **Validade** aplica-se a produtos vencidos, que vencem hoje ou nos próximos 10 dias, inclusive o décimo dia. Ausência de data de validade não gera esse motivo. Cada produto pode ter zero, um ou dois motivos.

### RF-003 — Filtrar os produtos pelos motivos de alerta

A aba Alertas deve incluir somente produtos com pelo menos um motivo. **Todos** reúne esses produtos sem duplicá-los, **Validade** inclui quem atende à regra de validade e **Estoque** inclui quem está abaixo do mínimo. Um produto com ambos os motivos é elegível em cada filtro específico. Os cartões de totais existentes devem seguir as mesmas regras de classificação e o estado vazio deve refletir o filtro aplicado.

### RF-004 — Distinguir a quantidade e a capacidade de vidrarias

Em Meus Produtos, a quantidade de vidrarias deve ser exibida em unidades, com singular para uma peça e plural para as demais quantidades. Quando houver uma capacidade cadastrada, a coluna Nome deve acrescentá-la em ml ao nome. Sem capacidade disponível, a coluna deve exibir o nome cadastrado. As quantidades dos demais tipos continuam com suas unidades correspondentes.

## Requisitos não funcionais

### RNF-001 — Comunicar os motivos por texto

O estado e os motivos de alerta precisam ser compreensíveis por texto associado ao produto e acessível a tecnologias assistivas. O triângulo evidencia a indicação visualmente.

## Critérios de aceitação

### CA-001 — Indicação permanente (RF-001, RNF-001)

- Dado que Meus Produtos contém somente itens sem alerta, ou que a lista está vazia
- Quando a administração abrir a listagem
- Então a indicação com o triângulo e a exclamação permanece visível e as linhas existentes podem ser reconhecidas como sem alerta

### CA-002 — Limite estrito de estoque (RF-001, RF-002, RNF-001)

- Dados três produtos sem alerta de validade, com quantidades abaixo, igual e acima do mínimo
- Quando a administração consultar Meus Produtos e a aba Alertas
- Então apenas o primeiro exibe o motivo **Estoque abaixo do mínimo** na lista geral e aparece no filtro Estoque

### CA-003 — Janela vigente de validade (RF-002, RF-003)

- Dado um conjunto de produtos com estoque suficiente e validade passada, no dia atual, a 10 dias ou a 11 dias, incluindo também um produto sem data de validade
- Quando a administração consultar o filtro Validade na data de referência
- Então somente os produtos com validade passada, no dia atual e a 10 dias aparecem nesse filtro

### CA-004 — Produto com dois motivos (RF-001, RF-002, RF-003, RNF-001)

- Dado um produto com validade dentro da janela de alerta e estoque abaixo do mínimo
- Quando a administração conferir Meus Produtos e alternar entre Todos, Estoque e Validade
- Então a listagem apresenta os dois motivos e o produto aparece uma vez em cada filtro, com uma contribuição ao total geral e a cada total por motivo

### CA-005 — Inclusão exclusiva na aba Alertas (RF-002, RF-003)

- Dado um conjunto de produtos com somente alerta de estoque, somente alerta de validade, ambos os motivos e nenhum motivo, incluindo um produto sem alerta com estoque igual ao mínimo
- Quando a administração consultar Todos e aplicar cada filtro específico
- Então Todos inclui somente os produtos com pelo menos um motivo, e cada filtro específico inclui somente os produtos com o motivo correspondente

### CA-006 — Resultado vazio (RF-003)

- Dado que nenhum produto corresponde ao filtro de alertas ou à busca aplicada
- Quando a administração consultar a lista filtrada
- Então a aba informa que não há resultados para a consulta e não apresenta produtos de outro filtro

### CA-007 — Acesso à aba Alertas (RF-003)

- Dado um usuário sem a permissão de consultar alertas operacionais
- Quando ele tentar consultar diretamente os dados da aba Alertas
- Então a consulta é recusada sem expor os registros de alertas da administração

### CA-008 — Singular e plural da quantidade de vidrarias (RF-004)

- Dado um registro de vidraria com quantidade 1 e outro com quantidade 4
- Quando a administração consultar Meus Produtos
- Então as quantidades aparecem como `1 unidade` e `4 unidades`

### CA-009 — Capacidade disposta no nome (RF-004)

- Dada uma lista com dois registros chamados Béquer com capacidades de 250 e 500 ml, e outro registro de vidraria sem capacidade disponível
- Quando a administração conferir a coluna Nome em Meus Produtos
- Então as linhas dos béqueres exibem `Béquer 250 ml` e `Béquer 500 ml`, e o terceiro registro exibe o próprio nome sem sufixo de capacidade

### CA-010 — Unidade dos demais produtos (RF-004)

- Dado um conjunto de produtos de outros tipos com unidades de medida definidas, incluindo um produto químico medido em litros
- Quando a administração consultar suas quantidades em Meus Produtos
- Então a lista apresenta cada quantidade com a unidade correspondente ao produto

## Estratégia de validação

Automatizar a classificação pelos limites de quantidade e de validade e o resultado dos filtros e dos cartões, com data de referência controlada e inventário sintético. Verificar no navegador o indicador permanente, seu texto acessível, os estados vazios e a apresentação de vidrarias com e sem capacidade. Registrar o resultado de cada caso de classificação e a conferência das linhas e totais.

## Dependências e riscos

- [Cadastro de produtos](../cadastro-de-produtos/prd.md) define o preenchimento de datas e trabalha com a mesma interpretação do dia atual. O cadastro atual de vidrarias já pede capacidade em ml.
- A regra antiga relatada no manual inclui quantidade igual ao mínimo. Alinhar o manual ao comportamento do aceite de #466 quando a mudança estiver disponível.
- Referências do comportamento atual em [manual da administração](../../../../docs/manual/administrador.md#ação-consultar-alertas-operacionais), [lista de produtos](../../../../frontend/src/components/screens/SearchMaterialComponent.tsx), [painel de alertas](../../../../frontend/src/pages/FollowUp.tsx) e [consultas de produtos](../../../../backend/LabSolos-Server-DotNet8/Controllers/ProdutosController.cs).

## Decisões da validação de descoberta

As escolhas desta etapa constam no [registro local de decisões](../decisoes-de-planejamento.md#cadastro-e-alertas).

| Decisão | Recomendação | Resposta confirmada | Impacto |
| --- | --- | --- | --- |
| Grilling | Aplicar a descoberta prevista na skill `create-prd` | Dispensado pelo usuário para as issues abertas | Os comportamentos confirmados vêm das issues. |
| Dia civil da validade | Usar a mesma referência que Cadastro | Usuário aprovou `America/Sao_Paulo` como padrão no servidor | A virada do dia e o limite de dez dias usam o dia civil institucional. O produto está vencido a partir do dia seguinte à validade. |
