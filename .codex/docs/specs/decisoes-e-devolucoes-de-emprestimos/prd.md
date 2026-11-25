# PRD de decisões e devoluções de empréstimos

- **Status** — rascunho
- **Responsável** — a definir
- **Atualizado em** — 2026-11-15
- **Validação de descoberta** — dispensada pelo usuário

## Contexto e problema

No detalhe de uma solicitação pendente, as ações Aceitar e Rejeitar precisam permanecer distinguíveis durante a interação. Uma aprovação compromete o saldo e registra a saída, o que exige validações consistentes, inclusive quando o saldo muda entre a solicitação e a decisão. A devolução precisa verificar quem pode agir sobre o empréstimo em questão e identificar o responsável no registro de auditoria.

| Issue de origem | Requisitos | Critérios |
| --- | --- | --- |
| [#468 — Cores e interação das ações de decisão](https://github.com/ifpebj-ti/lab-solos/issues/468) | RF-001, RNF-002 | CA-001, CA-002 |
| [#471 — Quantidades, prazos e cálculos de estoque](https://github.com/ifpebj-ti/lab-solos/issues/471) | RF-002, RNF-001 | CA-003 a CA-006 |
| [#472 — Atualização atômica na aprovação](https://github.com/ifpebj-ti/lab-solos/issues/472) | RF-003, RNF-001 | CA-006 a CA-009 |
| [#477 — Responsabilidade na devolução](https://github.com/ifpebj-ti/lab-solos/issues/477) | RF-004, RF-005, RNF-001 | CA-010 a CA-013 |

## Objetivo e métricas de sucesso

- Aceitar e Rejeitar permanecem identificáveis em repouso e ao passar o mouse, e cada ação conclui a decisão correspondente.
- As operações aceitas atendem aos limites documentados. Em recusas de validação, a variação do saldo e a quantidade de movimentações registradas são zero.
- Aprovações concorrentes respeitam o saldo inicial. Uma aprovação concluída produz uma única baixa por item, ainda que a decisão seja reenviada.
- Cada devolução efetivada tem um ator identificável na auditoria. Devoluções sem autorização sobre o recurso preservam estado e estoque.

## Usuários e jornadas

- **Administrador** — abre um empréstimo pendente a partir da lista, decide e consulta o resultado. No fluxo autorizado do histórico, registra a devolução do empréstimo aprovado.
- **Solicitante autorizado** — informa quantidades válidas, envia a solicitação e consegue identificar a causa quando o sistema recusa um dado ou uma decisão por regra de negócio.
- **Mentor autorizado** — registra devolução apenas para empréstimos dentro de seu escopo de responsabilidade. A equipe autorizada a consultar auditoria identifica o responsável pelo registro.

## Escopo

### Incluído

- Cores, mudança visual e legibilidade dos botões no detalhe aberto a partir da lista.
- Validação de quantidades, prazos e cálculos de estoque na solicitação, na decisão e na gravação dos efeitos da movimentação.
- Consistência entre aprovação, baixa e movimentações, incluindo disputa de saldo, interrupções e reenvios.
- Autorização por empréstimo e identificação do ator na auditoria das devoluções.

### Fora de escopo

- Devolução parcial, novo perfil e novo caminho de interface para mentores registrarem devolução.
- Ajuste dos saldos e históricos anteriores à correção, tratado em [Conciliação operacional](../conciliacao-operacional/prd.md).

## Requisitos funcionais

### RF-001 — Distinguir Aceitar e Rejeitar no detalhe

Em um empréstimo pendente aberto a partir da lista, **Aceitar** deve aparecer em verde e **Rejeitar**, em vermelho. Cada botão deve apresentar alteração visual perceptível ao passar o mouse e efetivar a decisão indicada por seu rótulo para o empréstimo exibido.

### RF-002 — Validar quantidades, prazos e cálculos

O prazo de novas solicitações é de cinco dias corridos a partir do envio. Aceitar quantidades inteiras positivas na unidade cadastrada do produto, até o saldo disponível. Na aprovação, revalidar a quantidade e o saldo daquele momento, inclusive para solicitações já pendentes, que preservam a data prevista registrada. Recusar operações que produziriam saldo negativo ou fora da faixa suportada. Uma data, quantidade ou operação de estoque fora das regras deve receber uma resposta de domínio que indique a causa da recusa e preservar o saldo e as movimentações.

### RF-003 — Efetivar a aprovação de forma indivisível

Uma aprovação deve completar conjuntamente a decisão, as baixas de estoque e as movimentações correspondentes. Quando outra decisão comprometer o estoque necessário, o sistema deve retornar um resultado de conflito identificável e preservar os dados já efetivados. Uma interrupção antes da conclusão deve preservar o estado anterior. Reenviar uma decisão já concluída deve produzir resposta previsível, com a decisão e a baixa registradas uma única vez.

Aprovar, rejeitar ou devolver com sucesso retorna `204`. Reenvio de ação efetivada e conflitos retornam `409` com códigos específicos. Quando a concorrência deixar o saldo insuficiente, a resposta identifica a insuficiência. A devolução de um empréstimo ainda não aprovado retorna `409` com código próprio. A interface explica o resultado por código e recarrega o estado gravado após conflito. Os casos constam no [contrato dos comandos](./techspec.md#respostas-dos-comandos-de-empréstimo).

### RF-004 — Autorizar devolução pelo vínculo com o empréstimo

O sistema deve verificar, antes da devolução, o perfil habilitado e o escopo do ator sobre o empréstimo. Um Mentor autorizado deve poder devolver apenas os empréstimos do seu escopo de responsabilidade. O fluxo administrativo autorizado permanece disponível. A devolução efetivada restaura as quantidades do empréstimo aprovado, registra sua data efetiva e mantém separada a data prevista de devolução.

### RF-005 — Identificar quem efetivou a devolução

A auditoria da devolução concluída deve vincular a ação ao empréstimo e identificar a pessoa autenticada que a realizou. O registro deve permitir consultar o momento e o responsável conforme as permissões de auditoria.

Cada baixa ou devolução registra uma única vez o empréstimo, o produto, a quantidade, o lote vinculado no momento da operação, quando houver, e a autoria. O registro é gravado junto da mudança no empréstimo e no saldo e serve de fonte para o histórico e a auditoria. Saídas e lotes antigos só são confirmados com evidência existente. Encaminhar lacunas à conciliação.

## Requisitos não funcionais

### RNF-001 — Preservar a consistência dos dados gravados

O saldo gravado deve permanecer não negativo e dentro da faixa admitida pelo domínio. Após cada operação, o estado do empréstimo, o saldo e as movimentações devem concordar, inclusive diante de conflitos, falhas e reenvios. Uma devolução concluída deve ser rastreável à pessoa responsável.

### RNF-002 — Preservar legibilidade e acionamento das decisões

Os rótulos **Aceitar** e **Rejeitar** devem continuar legíveis em repouso e ao passar o mouse. Ambos os controles devem continuar identificáveis e acionáveis por teclado com foco perceptível.

## Critérios de aceitação

### CA-001 — Ações visíveis no detalhe (RF-001, RNF-002)

- Dado um empréstimo pendente aberto pela administração a partir da lista
- Quando a administração visualizar os botões, passar o mouse sobre cada um ou navegar até eles por teclado
- Então Aceitar aparece em verde e Rejeitar em vermelho, cada botão responde visualmente à passagem do mouse, o texto permanece legível e o foco é perceptível

### CA-002 — Decisões correspondentes aos rótulos (RF-001, RNF-002)

- Dados dois empréstimos pendentes e aptos a receber decisão
- Quando a administração acionar Aceitar para um deles e Rejeitar para o outro, inclusive por teclado
- Então o primeiro passa a aprovado e o segundo a rejeitado, com o resultado exibido no detalhe correspondente

### CA-003 — Solicitação dentro dos limites (RF-002)

- Dado um solicitante autorizado, produtos disponíveis e uma quantidade e um prazo dentro dos limites documentados
- Quando a solicitação for enviada
- Então o empréstimo é registrado como pendente, com os itens e a data prevista de devolução correspondentes, sem baixa antes da aprovação

### CA-004 — Limites e valores inválidos (RF-002, RNF-001)

- Dado um conjunto de casos com valores nos limites admitidos e valores fora das regras de quantidade ou prazo
- Quando o sistema avaliar cada caso na etapa aplicável
- Então os casos válidos seguem quando as outras condições são atendidas, e os casos inválidos retornam a causa de validação sem modificar saldo ou movimentações

### CA-005 — Cálculo fora da faixa (RF-002, RNF-001)

- Dado que um resultado de estoque excederia a faixa documentada do domínio
- Quando a operação de movimentação for avaliada
- Então o sistema retorna uma recusa de domínio previsível e mantém os saldos e as movimentações anteriores

### CA-006 — Revalidação do saldo no momento da aprovação (RF-002, RF-003, RNF-001)

- Dado um empréstimo pendente válido cujo estoque disponível ficou insuficiente antes da decisão
- Quando a administração solicitar a aprovação
- Então o sistema informa a insuficiência, mantém o saldo não negativo e preserva as movimentações e o estado anteriores à tentativa

### CA-007 — Decisões concorrentes (RF-003, RNF-001)

- Dado um conjunto de empréstimos pendentes válidos disputando um saldo finito
- Quando as decisões de aprovação forem processadas de forma concorrente
- Então a soma das baixas de aprovações efetivadas respeita o saldo inicial, e cada aprovação que ficar sem saldo recebe um resultado de conflito sem efeitos parciais

### CA-008 — Interrupção de uma aprovação (RF-003, RNF-001)

- Dado um empréstimo pendente cuja aprovação ainda não foi concluída
- Quando ocorrer uma falha intermediária
- Então a consulta posterior apresenta o estado, os saldos e as movimentações anteriores à operação

### CA-009 — Reenvio da aprovação (RF-003, RNF-001)

- Dado um empréstimo cuja aprovação foi efetivada
- Quando a mesma decisão for reenviada
- Então o resultado comunica a decisão já processada de modo previsível, com uma única baixa por item e uma única decisão efetivada

### CA-010 — Devolução pelo mentor responsável (RF-004, RF-005, RNF-001)

- Dado um empréstimo aprovado, ainda não devolvido e no escopo de um mentor habilitado
- Quando o mentor registrar a devolução
- Então as quantidades são restituídas uma única vez, a data efetiva fica registrada e a auditoria identifica o mentor responsável

### CA-011 — Devolução fora do escopo (RF-004, RF-005, RNF-001)

- Dado um empréstimo aprovado fora do escopo de um mentor, ou um ator sem permissão para devolução
- Quando o ator solicitar uma devolução
- Então o sistema recusa a operação e preserva o empréstimo, o saldo e os registros de devoluções efetivadas

### CA-012 — Devolução administrativa autorizada (RF-004, RF-005, RNF-001)

- Dado um empréstimo aprovado, ainda não devolvido e acessível no fluxo administrativo autorizado
- Quando a administração registrar a devolução
- Então o detalhe apresenta a devolução registrada, os itens voltam ao estoque e a auditoria identifica quem realizou a operação

### CA-013 — Empréstimo inelegível para devolução (RF-004, RNF-001)

- Dado um empréstimo ainda não aprovado ou com devolução já registrada
- Quando um ator autorizado sobre o recurso solicitar sua devolução
- Então o sistema informa a condição impeditiva e preserva o saldo e os registros de devolução existentes

## Estratégia de validação

Demonstrar o detalhe de empréstimos pendentes no navegador, com evidências das cores, do estado ao passar o mouse e dos resultados das duas decisões. Cobrir com testes de integração e dados sintéticos os limites de validação, o saldo atualizado, as decisões concorrentes, a interrupção e o reenvio. Comparar o estado do empréstimo, do saldo e do histórico antes e depois de cada operação. Exercitar a matriz de atores e vínculos da devolução e verificar a presença da identidade correta na auditoria dos casos efetivados.

## Dependências e riscos

- [Segurança de contas e sessões](../seguranca-de-contas-e-sessoes/prd.md) e o [PRD existente de proteção de acesso](../protecao-acesso-autenticacao/prd.md) situam as permissões de perfil e a autorização por recurso. O vínculo que permite devolver deve ficar explícito no aceite deste fluxo.
- [Integridade de produtos, lotes e histórico de saída](../integridade-de-produtos-e-lotes/prd.md) usa o saldo consistente e o registro da saída efetiva. [Notificações e auditoria](../notificacoes-e-auditoria/prd.md) trata a consulta à trilha de auditoria.
- Referências do comportamento atual em [manual da administração](../../../../docs/manual/administrador.md#j09--decidir-empréstimos), [manual do mentor](../../../../docs/manual/mentor.md), [detalhe do empréstimo](../../../../frontend/src/pages/loan/LoanHistory.tsx), [solicitação de empréstimos](../../../../frontend/src/pages/mentor/LoanCreation.tsx) e [operações de empréstimos](../../../../backend/LabSolos-Server-DotNet8/Controllers/EmprestimosController.cs).

## Decisões complementares

As escolhas desta etapa constam no [registro local de decisões](../decisoes-de-planejamento.md#empréstimos-e-integridade).

## Decisões da validação de descoberta

| Decisão | Recomendação | Resposta confirmada | Impacto |
| --- | --- | --- | --- |
| Grilling | Aplicar a descoberta prevista na skill `create-prd` | Dispensado pelo usuário para as issues abertas | Os comportamentos confirmados vêm das issues e as decisões de domínio pendentes estão explícitas neste PRD. |
| Limites e legado (#471) | Formalizar a regra de prazo, quantidade e saldo | Usuário aprovou a regra registrada em RF-002 | Fecha a decisão D1 da especificação técnica. |
| Consistência do estoque e do histórico (#472, #477) | Coordenar as escritas e registrar os movimentos na mesma transação | Usuário aprovou a regra de [D4](./techspec.md#alternativas-e-decisões) | Histórico e auditoria passam a usar a evidência durável do movimento. |
| Respostas dos comandos (#472, #477) | Manter `204` para sucesso e distinguir as causas de conflito por código | Usuário aprovou a regra de [D2](./techspec.md#respostas-dos-comandos-de-empréstimo) | A interface informa o resultado e lê o estado gravado após conflito. |
