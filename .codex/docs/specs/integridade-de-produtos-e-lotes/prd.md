# PRD de integridade de produtos, lotes e histórico de saída

- **Status** — rascunho
- **Responsável** — a definir
- **Atualizado em** — 2026-11-15
- **Validação de descoberta** — dispensada pelo usuário

## Contexto e problema

A administração precisa editar produtos, retirá-los de operação quando necessário, consultar o histórico de saída e localizar os lotes relacionados. Alterações parciais podem comprometer campos omitidos e registros vinculados. O histórico de saída precisa refletir as movimentações efetivas e expor apenas os dados necessários para o perfil e o vínculo de quem consulta. O cadastro de lotes precisa validar as entradas e garantir a rastreabilidade no inventário. A continuidade da administração também exige que desativações e exclusões de contas preservem pelo menos um administrador habilitado.

| Issue de origem | Requisitos | Critérios |
| --- | --- | --- |
| [#474 — Informações e vínculos ao editar ou desativar](https://github.com/ifpebj-ti/lab-solos/issues/474) | RF-001 a RF-003, RNF-001 | CA-001 a CA-005 |
| [#476 — Privacidade e integridade do histórico de saída](https://github.com/ifpebj-ti/lab-solos/issues/476) | RF-002, RF-004, RF-005, RNF-002 | CA-004, CA-006 a CA-009 |
| [#486 — Validação e rastreabilidade dos lotes](https://github.com/ifpebj-ti/lab-solos/issues/486) | RF-006, RF-007, RNF-001 | CA-010 a CA-012 |

## Objetivo e métricas de sucesso

- Em cada edição parcial admitida, os campos omitidos mantêm seus valores. Nas operações sobre registros vinculados, o resultado preserva os vínculos e o histórico exigidos.
- O número de administradores habilitados permanece igual ou superior a um após as operações de desativação ou exclusão.
- As consultas autorizadas exibem apenas as movimentações efetivas no escopo solicitado e incluem zero endereços de e-mail na resposta.
- Um lote cadastrado com dados válidos é recuperável com seu vínculo no inventário. A revisão dos lotes existentes registra os vínculos confirmados e as lacunas com evidências.

## Usuários e jornadas

- **Administrador** — edita dados específicos de um produto, desativa ou exclui registros elegíveis, cadastra lotes e consulta sua relação com os produtos. Em administração de contas, atua conforme as regras de continuidade e autorização.
- **Pessoa autorizada pelo vínculo** — consulta apenas as movimentações de saída que pode acessar, com os dados necessários à conferência.
- **Equipe de operação** — confere lotes antigos e encaminha lacunas comprovadas à conciliação operacional.

## Escopo

### Incluído

- Edição parcial de produtos, operações explícitas admitidas por campo, exclusão e desativação com preservação de vínculos históricos.
- Continuidade de pelo menos um administrador habilitado nas operações de desativação ou exclusão de contas.
- Autorização por vínculo, dados pessoais mínimos e preservação do histórico de saída.
- Validação de números, datas, opções enumeradas e vínculos de lotes, além da conferência da rastreabilidade dos lotes existentes.

### Fora de escopo

- Mudança dos formulários de cadastro de químicos e vidrarias, definida em [Cadastro de produtos](../cadastro-de-produtos/prd.md).
- Saneamento dos dados históricos sem evidência e autorização operacional. A aplicação de correções em registros existentes pertence à [Conciliação operacional](../conciliacao-operacional/prd.md).
- Redefinição geral dos perfis administrativos e da política de contas.

## Requisitos funcionais

### RF-001 — Restringir a edição aos dados explicitamente informados

O sistema deve alterar somente os campos que o ator tem permissão para editar e que foram explicitamente incluídos na operação. Campos omitidos mantêm seus valores. A remoção de um valor deve ser explícita e permitida para o campo. Se a solicitação contiver uma alteração inválida, o sistema deve indicar a condição de validação e preservar o registro.

### RF-002 — Preservar vínculos ao excluir ou desativar

O sistema deve avaliar os vínculos existentes antes de excluir ou desativar um registro. Se a operação comprometer dados referenciados ou histórico, deve ser recusada com resposta de domínio coerente. Uma desativação admitida retira o produto da operação e preserva suas movimentações registradas, acessíveis conforme a política de histórico.

### RF-003 — Preservar pelo menos um administrador habilitado

Antes de desativar ou excluir uma conta administrativa, o sistema deve verificar se outro administrador continuará habilitado. A operação sobre a última conta habilitada deve ser recusada com indicação da regra de continuidade. As demais operações seguem as permissões e condições de [Segurança de contas e sessões](../seguranca-de-contas-e-sessoes/prd.md).

### RF-004 — Consultar apenas o histórico de saída autorizado

A consulta deve verificar o perfil e o vínculo do ator para delimitar as movimentações acessíveis. Deve retornar somente os registros e campos necessários à conferência por esse ator, com endereços de e-mail omitidos da resposta. Informações de resumo devem respeitar o mesmo escopo das linhas apresentadas.

### RF-005 — Refletir as saídas efetivamente registradas

O histórico deve apresentar as saídas efetivas, incluindo as que posteriormente tiveram devolução, e preservar informações necessárias para conferência, como produto, quantidade e lote quando registrado. Solicitações pendentes ou rejeitadas sem saída ficam fora do histórico e dos totais de saída. A desativação do produto preserva as saídas que já foram registradas.

### RF-006 — Validar e vincular lotes ao inventário

O sistema deve validar os dados numéricos, as datas, as opções enumeradas e o vínculo entre lote e produto conforme as regras documentadas. Um lote aceito deve ser recuperável na consulta com os vínculos esperados. Uma entrada inválida deve informar o campo ou vínculo impeditivo e preservar os registros do inventário.

### RF-007 — Conferir a rastreabilidade dos lotes existentes

A operação deve revisar os lotes existentes no recorte acordado e registrar quais vínculos com produtos puderam ser comprovados, quais estão ausentes ou inconsistentes e a evidência usada para cada conclusão. Lacunas devem ficar identificadas para conciliação.

## Requisitos não funcionais

### RNF-001 — Manter a integridade após sucesso ou recusa

Após editar, excluir, desativar ou cadastrar, uma nova consulta deve confirmar os dados esperados e os vínculos preservados. Uma recusa deve preservar a versão anterior e impedir registros ou vínculos incompletos.

### RNF-002 — Minimizar os dados pessoais enviados pelo histórico

A resposta de histórico deve omitir e-mails e informações pessoais além do conjunto de campos aprovado para o perfil e o vínculo, inclusive nos dados aninhados e nos resumos. A interface deve respeitar o mesmo recorte.

## Critérios de aceitação

### CA-001 — Edição parcial com campos omitidos (RF-001, RNF-001)

- Dado um produto com dados e vínculos existentes e um ator autorizado a editar um de seus campos
- Quando o ator enviar uma alteração válida contendo apenas esse campo
- Então a consulta apresenta o novo valor, mantém os campos omitidos e conserva os vínculos existentes

### CA-002 — Remoção explícita e alteração inválida (RF-001, RNF-001)

- Dado um produto com um campo cujo valor pode ser removido e outro cuja alteração é vedada ao ator
- Quando o ator solicitar separadamente a remoção explícita permitida e a alteração vedada
- Então a primeira limpa somente o campo indicado, e a segunda é recusada com indicação da condição impeditiva e preserva o registro

### CA-003 — Exclusão impedida por dependência (RF-002, RNF-001)

- Dado um produto com registro histórico ou vínculo referencial que seria comprometido pela exclusão
- Quando um administrador autorizado solicitar excluir o produto
- Então o sistema informa a dependência impeditiva e preserva o produto e os dados relacionados

### CA-004 — Desativação com histórico preservado (RF-002, RF-005, RNF-001)

- Dado um produto elegível para desativação com movimentações efetivas registradas
- Quando um administrador autorizado desativar o produto
- Então o produto deixa de estar ativo e as movimentações e vínculos históricos continuam disponíveis para consulta autorizada

### CA-005 — Continuidade administrativa (RF-003, RNF-001)

- Dado que apenas uma conta administrativa permanece habilitada
- Quando uma ação autorizada em outros aspectos tentar desativar ou excluir essa conta
- Então o sistema recusa cada ação pela regra de continuidade e mantém a conta habilitada

### CA-006 — Histórico restrito ao vínculo (RF-004, RNF-002)

- Dado um ator autorizado a consultar parte das movimentações de um produto
- Quando ele consultar o histórico de saída
- Então as linhas, totais e campos correspondem apenas ao escopo autorizado e a resposta omite endereços de e-mail

### CA-007 — Histórico sem vínculo autorizado (RF-004, RNF-002)

- Dado um ator que não tem permissão para consultar as movimentações do recurso
- Quando ele solicitar o histórico de saída
- Então a consulta é recusada sem expor movimentações, totais ou dados pessoais desse recurso

### CA-008 — Histórico de saídas efetivas (RF-005)

- Dado um produto com saídas efetivas, uma delas seguida de devolução, e com solicitações pendentes e rejeitadas sem saída
- Quando uma pessoa com acesso a essas movimentações consultar o histórico
- Então o histórico inclui as saídas efetivas, preserva os dados de conferência disponíveis e exclui dos resultados e totais as solicitações sem saída

### CA-009 — Produto sem saídas no escopo (RF-004, RF-005)

- Dado um ator autorizado a consultar o produto, sem saídas efetivas dentro do seu escopo
- Quando ele abrir o histórico
- Então a consulta retorna estado vazio e totais zerados para o escopo permitido

### CA-010 — Cadastro e recuperação de lote válido (RF-006, RNF-001)

- Dado um cadastro de lote preenchido com dados válidos e referência válida ao produto esperado
- Quando a administração salvar o lote e consultar o registro e seu vínculo com o inventário
- Então os dados do lote e a associação ao produto são recuperados de forma coerente

### CA-011 — Recusa de lote com dados inválidos (RF-006, RNF-001)

- Dado um conjunto de casos com valores numéricos fora do limite, datas inválidas, opções enumeradas não admitidas ou vínculo inválido
- Quando cada cadastro for avaliado
- Então o sistema identifica o campo ou vínculo impeditivo e nenhum lote inválido ou associação incompleta é gravado

### CA-012 — Conferência dos lotes existentes (RF-007)

- Dado um recorte de lotes históricos acordado com a operação
- Quando a revisão das relações com os produtos for concluída
- Então o registro da revisão discrimina os vínculos comprovados e as lacunas a conciliar, com referências às evidências correspondentes

## Estratégia de validação

Automatizar testes de integração com produtos, contas e lotes sintéticos para edição parcial, exclusão com dependências, desativação, continuidade administrativa e cadastro e consulta de lotes. Cobrir a matriz de perfis e vínculos no histórico, avaliando a resposta entregue, os totais, o estado vazio e as saídas após desativação. Registrar a inspeção dos vínculos históricos no recorte acordado e as evidências de cada lacuna, com acesso conforme a política de dados.

## Dependências e riscos

- [Segurança de contas e sessões](../seguranca-de-contas-e-sessoes/prd.md) define a política de perfis e habilitação usada para preservar a continuidade administrativa. O [PRD existente de proteção de acesso](../protecao-acesso-autenticacao/prd.md) contextualiza a autorização por recurso.
- [Decisões e devoluções de empréstimos](../decisoes-e-devolucoes-de-emprestimos/prd.md) define as invariantes de estoque e a aprovação atômica. O histórico depende da distinção entre solicitação e saída efetiva.
- [Conciliação operacional](../conciliacao-operacional/prd.md) recebe as lacunas de vínculos históricos para revisão com a operação. Valores ausentes exigem evidência antes de qualquer vínculo corretivo.
- Referências do comportamento atual em [manual da administração](../../../../docs/manual/administrador.md#j07--cadastrar-materiais), [operações de produtos](../../../../backend/LabSolos-Server-DotNet8/Controllers/ProdutosController.cs), [histórico de saída de produtos](../../../../backend/LabSolos-Server-DotNet8/Services/ProdutoService.cs) e [operações de lotes](../../../../backend/LabSolos-Server-DotNet8/Controllers/LotesController.cs).

## Suposições

- **Suposição** — a conferência inicial de lotes usa registros e documentos que a operação pode relacionar a cada produto. Quando a evidência é insuficiente, o vínculo permanece pendente de conciliação.

## Decisões complementares

As escolhas desta etapa constam no [registro local de decisões](../decisoes-de-planejamento.md#empréstimos-e-integridade). A conferência de lotes anteriores depende do recorte, das fontes disponíveis e do responsável operacional.

## Decisões da validação de descoberta

| Decisão | Recomendação | Resposta confirmada | Impacto |
| --- | --- | --- | --- |
| Grilling | Aplicar a descoberta prevista na skill `create-prd` | Dispensado pelo usuário para as issues abertas | O PRD registra as condições trazidas pelas issues e as decisões de domínio que ainda exigem fechamento. |
