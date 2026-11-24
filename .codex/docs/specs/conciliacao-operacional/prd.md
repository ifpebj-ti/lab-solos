# PRD: Conciliação operacional de contas e estoque

- Status: rascunho
- Responsável: não definido
- Atualizado em: 2026-11-15
- Validação de descoberta: dispensada-pelo-usuário

## Contexto e problema

A avaliação de segurança recomenda que os responsáveis revisem as contas privilegiadas e a integridade dos registros operacionais. A conciliação deve estabelecer uma referência verificável de permissões, saldos, unidades de medida e movimentações históricas. Cada regularização precisa de justificativa, autorização operacional, evidências de antes e depois e uma forma de retorno validada.

O produto representa contas e seus papéis em `Usuario.cs` e `UsuariosController.cs`. Produtos, lotes e empréstimos estão representados em `Produto.cs`, `Lote.cs`, `Emprestimo.cs`, `EmprestimoProduto.cs` e nos respectivos controladores. Esses módulos orientam a revisão dos conceitos e das relações entre os registros.

| Issue | Requisitos | Critérios |
| --- | --- | --- |
| [#470 — Contas privilegiadas e dados operacionais](https://github.com/ifpebj-ti/lab-solos/issues/470) | RF-001 a RF-006, RNF-001, RNF-002 | CA-001 a CA-010 |

## Objetivo e métricas de sucesso

Obter uma decisão ou pendência registrada para cada conta privilegiada inventariada e cada divergência operacional incluída. Para cada regularização autorizada no ensaio controlado, demonstrar o estado anterior, o resultado esperado, o estado observado e uma evidência verificável de retorno. Identificar responsáveis e validar os três tipos de sinal previstos, concessão de papel, divergência de estoque e falha nos fluxos revistos.

## Usuários e jornadas

- Responsável pelo acesso que valida o papel, o estado e a justificativa de cada conta privilegiada.
- Responsável pelo estoque que revisa saldos, unidades de medida, lotes e movimentações com base nas evidências disponíveis.
- Responsável pela operação que revisa a proposta, autoriza a aplicação, valida retorno e acompanha sinais de recorrência.

## Escopo

### Incluído

- Inventário de contas privilegiadas, permissões e pendências de validação.
- Comparação de saldos, unidades e movimentações históricas com as evidências aceitas pelos responsáveis.
- Proposta de regularização com revisão, autorização operacional, cópia de segurança, retorno, trilha e evidências.
- Definição e ensaio dos sinais de monitoramento em condições controladas.

### Fora de escopo

- Correções de regras de produto previstas nos PRDs de segurança de contas, empréstimos e integridade de estoque.
- Aplicação de mudanças em ambiente operacional nesta entrega documental.

## Requisitos funcionais

### RF-001 — Inventário de contas e decisões de acesso

O inventário cobre as contas privilegiadas no recorte acordado e registra papel, estado, justificativa e resultado da revisão pelo responsável. A revisão distingue conta confirmada, regularização proposta e caso pendente. A identificação da conta fica disponível somente nas evidências de acesso restrito pertinentes à operação.

### RF-002 — Conciliação de registros operacionais

A revisão identifica os registros afetados e compara saldos, unidades de medida e movimentações históricas com as referências aceitas pelos responsáveis. A proposta registra divergência, evidência disponível e correção esperada. Casos com evidência insuficiente ficam pendentes de decisão.

### RF-003 — Revisão e autorização da regularização

Cada proposta deve indicar justificativa, escopo, responsáveis, critérios de conferência e relação com as regras existentes. Uma alteração só pode ser aplicada após revisão, disponibilização de cópia de segurança, validação do procedimento de retorno e autorização explícita do responsável pela operação para aquele recorte.

### RF-004 — Comparação e trilha do resultado

A conferência registra o estado anterior, o resultado esperado e o estado observado de cada registro regularizado. A trilha vincula a mudança à justificativa, à autorização e à pessoa responsável pela execução ou validação. Divergências remanescentes são registradas para decisão.

### RF-005 — Retorno validado

O procedimento de retorno deve identificar quem decide aplicá-lo e quais condições justificam seu uso. O ensaio controlado verifica recuperação de permissões e dados afetados e valida os resultados contra o estado de referência anterior à alteração.

### RF-006 — Sinais de acompanhamento

O plano define como o responsável acompanha concessões de papel, divergências de estoque e falhas nos fluxos revisados. Para cada sinal, a equipe registra condição observável, responsável pela análise e forma de encaminhar um caso identificado.

## Requisitos não funcionais

### RNF-001 — Privacidade e acesso à evidência

Evidências de operação devem estar disponíveis aos responsáveis autorizados. O ensaio usa uma cópia controlada com dados sanitizados. Evidências compartilháveis de validação devem permitir a conferência das decisões e resultados sem expor informações identificáveis ou material de autenticação.

### RNF-002 — Integridade e rastreabilidade

Cada regularização deve ser rastreável da divergência inicial até a validação final ou o retorno. A conferência deve identificar diferenças fora do escopo e divergências remanescentes para que o responsável decida os próximos passos.

## Critérios de aceitação

### CA-001 — Revisão de contas privilegiadas (RF-001)

- Dado um inventário sintético de contas privilegiadas com casos confirmados, divergentes e pendentes
- Quando o responsável revisa cada caso
- Então cada conta recebe estado de revisão e, para as regularizações propostas, há justificativa registrada

### CA-002 — Saldos, unidades e histórico (RF-002)

- Dados registros sintéticos com saldos, unidades e movimentações coerentes e divergentes
- Quando o responsável compara os registros com a evidência de referência
- Então consegue identificar os registros afetados, documentar a diferença e indicar correção proposta ou pendência devido à insuficiência de evidência

### CA-003 — Ausência de divergências (RF-001, RF-002)

- Dado um recorte revisado sem divergências de papéis ou registros operacionais
- Quando os responsáveis encerram a conferência do recorte
- Então a evidência registra o escopo revisado e o resultado sem regularizações propostas

### CA-004 — Proposta sem condição de aplicação (RF-003)

- Dada uma proposta sem revisão, sem cópia de segurança disponível, sem procedimento de retorno validado ou sem autorização operacional
- Quando a prontidão do recorte é avaliada
- Então a proposta permanece pendente e a condição faltante fica documentada, sem alteração dos registros

### CA-005 — Comparação após regularização autorizada (RF-003, RF-004, RNF-002)

- Dada uma proposta completa e autorizada para o ensaio com dados sanitizados
- Quando a regularização é conferida nessa cópia controlada
- Então a trilha permite ligar a autorização e sua justificativa aos estados anterior, esperado e observado de cada registro afetado e indicar divergências remanescentes ou diferenças fora do escopo

### CA-006 — Retorno no ensaio controlado (RF-005, RNF-002)

- Dado um ensaio em que ocorre uma condição de retorno prevista
- Quando o responsável avalia e aplica o retorno na cópia controlada
- Então permissões e registros afetados são conferidos contra a referência anterior e o resultado do retorno fica registrado

### CA-007 — Acompanhamento após revisão (RF-006)

- Dados eventos sintéticos que representem concessão de papel, divergência de estoque e falha em fluxo revisado
- Quando o plano de monitoramento é verificado
- Então cada caso pode ser identificado pelo sinal correspondente e encaminhado ao responsável indicado

### CA-008 — Acesso às evidências (RF-004, RNF-001)

- Dadas evidências de conciliação e perfis com e sem autorização operacional
- Quando os perfis tentam consultá-las
- Então os responsáveis autorizados obtêm as evidências pertinentes, os demais perfis ficam sem acesso e o material compartilhável de validação usa dados sanitizados

### CA-009 — Pendência de comprovação (RF-001, RF-002, RF-003)

- Dado um caso em que as evidências disponíveis não sustentam uma decisão de conta, saldo, unidade ou movimentação
- Quando o caso é revisado
- Então a pendência identifica a informação ou decisão faltante e o registro fica sem regularização até revisão conclusiva

### CA-010 — Continuidade da administração (RF-003, RNF-002)

- Dada uma proposta de regularização de papéis com efeito sobre os administradores habilitados
- Quando o responsável confere o estado resultante proposto
- Então a revisão verifica a preservação de ao menos um administrador habilitado antes de autorizar qualquer aplicação

## Estratégia de validação

Revisar a completude do inventário e da matriz de decisões e ensaiar conciliação, comparação, retorno e monitoramento em cópia controlada com dados sanitizados. Usar verificações repetíveis para comparar permissões, saldos, unidades, movimentações e recorte afetado. Registrar a revisão dos responsáveis, a autorização do ensaio, o comparativo e o resultado de retorno e acompanhamento. A eventual aplicação operacional depende da autorização específica do recorte.

## Dependências e riscos

- A revisão de privilégios usa [Segurança de contas e sessões](../seguranca-de-contas-e-sessoes/prd.md) como referência para papéis e estados. A conciliação deve preservar a continuidade administrativa prevista em [Integridade de produtos, lotes e histórico de saída](../integridade-de-produtos-e-lotes/prd.md).
- A revisão de estoque e de histórico usa as invariantes de [Decisões e devoluções de empréstimos](../decisoes-e-devolucoes-de-emprestimos/prd.md) e [Integridade de produtos, lotes e histórico de saída](../integridade-de-produtos-e-lotes/prd.md). O inventário pode começar enquanto as decisões dessas regras seguem em revisão.
- [Notificações e auditoria](../notificacoes-e-auditoria/prd.md) fornece o contexto de autoria e histórico esperado para eventos que apoiam o acompanhamento.
- Evidência incompleta, divergência de unidades e movimentações registradas durante a conferência podem mudar a interpretação do saldo. A autorização depende de uma referência aceita e de um estado anterior comparável.

## Suposições

- Suposição — Os responsáveis têm acesso autorizado às referências necessárias para revisar contas e registros. Quando a evidência não estiver disponível, o resultado é uma pendência explícita.

## Perguntas abertas

As escolhas desta etapa constam no [registro local de decisões](../decisoes-de-planejamento.md#pré-requisitos-operacionais).

- Quem revisa contas, estoque e evidências de movimentação, quem autoriza a aplicação e quem decide o retorno?
- Qual é o recorte de contas, produtos, lotes, unidades e período histórico? Quais evidências os responsáveis aceitam quando as fontes divergem?
- Qual cópia de referência e quais condições de retorno devem ser validadas antes de autorizar o recorte operacional?
- Qual periodicidade e quais condições de acionamento cabem a cada sinal, e onde as evidências ficarão acessíveis aos responsáveis?

## Decisões da validação de descoberta

| Decisão | Recomendação | Resposta confirmada | Impacto |
| --- | --- | --- | --- |
| Dispensa do grilling | Definir requisitos com base na issue e nas invariantes documentadas | Dispensada pelo usuário | Recorte, responsáveis e autorizações operacionais constam como decisões pendentes |
