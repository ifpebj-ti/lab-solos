# Protocolo de conferência do inventário de estoque e movimentos

Entrega documental de T003, #470, para RF-002, RF-003, RNF-001/RNF-002 e CA-002/CA-003/CA-009 do [PRD](prd.md). Aplicar o [cabeçalho comum e o modelo de decisão de estoque](modelos-evidencias.md) e o [checklist de completude](checklist-completude.md). A [decisão de Conciliação de estoque sintética](../decisoes-de-planejamento.md#pré-requisitos-operacionais) estabelece unidade cadastrada, corte comum em UTC e comprovação dos movimentos.

## Preparar a referência

1. Abrir o inventário com identificador, versão, data, finalidade e aliases de produtos, lotes e empréstimos abrangidos. Registrar o início inclusivo do intervalo histórico e o fim exclusivo `T0`, além da captura consistente do estado em `T0`. Usar o mesmo corte da revisão de contas quando os domínios integrarem o mesmo recorte.
2. Identificar a referência de estado com origem, revisão, horário UTC da captura, campos incluídos e critérios de consistência. Guardar a unidade exatamente como cadastrada e o saldo observado. A captura do banco comprova o estado observado naquele corte. Para estabelecer o saldo esperado, identificar uma referência anterior aceita e a cobertura dos movimentos entre essa referência e `T0`.
3. Registrar a versão do esquema, a revisão da regra de domínio e o início comprovado de cobertura da trilha durável. Delimitar quais movimentos essa trilha consegue comprovar. Encaminhar períodos anteriores ou interrompidos para conferência por evidência complementar.
4. Atribuir a operação documental ao papel `FIC-OPERADOR-ESTOQUE` e a revisão ao papel distinto `FIC-REVISOR-ESTOQUE`. O autorizador operacional e a custódia aparecem pelos papéis `FIC-AUTORIZADOR-OPERACAO` e `FIC-CUSTODIA`. Os aliases representam funções do exemplo. Responsáveis nominais, fontes externas aceitas, perfis, local de guarda, retenção e autorização de uso operacional aguardam preenchimento pela equipe.
5. Usar aliases no material compartilhável e manter sua correspondência com identificadores operacionais sob acesso restrito. Vincular somente evidências necessárias à revisão, com finalidade, origem, revisão e horário de referência. Preservar os dados ao preparar a conferência.

## Conferir as relações e a cobertura

| Fonte do modelo | O que ajuda a conferir | Limite da comprovação e encaminhamento |
| --- | --- | --- |
| `Produto.Id`, `Quantidade`, `UnidadeMedida` e `Status` | Identidade do registro, saldo, unidade e estado operacional em `T0`. | A fotografia atual exige uma referência comparável para sustentar o saldo esperado. Unidade indefinida fica pendente. |
| `Produto.LoteId` e relação com `Lote` | Vínculo corrente com o registro do lote e seu código, fornecedor e datas quando cadastrados. | O vínculo atual sustenta apenas o estado do corte. O lote de uma saída anterior precisa de evidência da época. A identificação física depende de fonte externa aceita e consultada. |
| `Produto.UltimaModificacao` | Momento cadastrado da alteração mais recente. | Exige evidência adicional para determinar a causa, quantidade ou autor de um movimento. |
| `ProdutoEmprestado.ProdutoId`, `EmprestimoId` e `Quantidade` | Relação entre produto e solicitação e quantidade informada no item. | O item já existe na solicitação. Classificar a saída exige a efetivação comprovada da decisão. |
| `Emprestimo.Status`, `DataAprovacao`, `DataPrevistaDevolucao` e `DataDevolucao` | Estado e marcos do fluxo associados à relação do item. | Data prevista é previsão. Para saída legada, exigir prova de decisão e timestamp gravados conjuntamente. Para devolução efetiva, exigir registro comprovável e seu vínculo com o empréstimo e o produto. |
| Movimento durável, quando implantado e comprovado | Tipo, produto, empréstimo, quantidade, instante, autoria e lote do evento quando registrado, conforme [D4 de Empréstimos](../decisoes-e-devolucoes-de-emprestimos/techspec.md#alternativas-e-decisões). | Verificar unicidade, origem transacional, período coberto e correlação com a operação. A cobertura começa na implantação comprovada. |

Conferir a integridade dos vínculos pelo alias e sua referência restrita. Uma linha órfã, duplicada, com quantidade inválida ou sem origem determinável gera pendência individual. Contar cada movimento efetivo uma vez. Distinguir baixa e devolução. Pedidos pendentes e rejeitados ficam fora da soma de saídas enquanto não houver evidência de movimento efetivo.

Para datas de validade e fabricação, manter o dia civil armazenado e a regra institucional aprovada. Os instantes de corte e de movimento são UTC. Usar a distinção de [datas e intervalos da API](../protecao-de-api-e-proxy/contrato-erros-e-datas.md#datas-e-intervalos) para evitar deslocar o dia de um registro civil.

## Comparar unidade, saldo e movimentos

1. Conferir se o produto da referência é o mesmo alias e se a unidade armazenada é compatível com a unidade da evidência. Registrar ambas. Quando forem diferentes, exigir fator de conversão aprovado, origem e versão. Até essa comprovação, a diferença numérica fica indeterminada.
2. Para unidade compatível e cobertura suficiente, registrar saldo anterior aceito e cada entrada, baixa ou devolução efetiva com sua evidência. Calcular o saldo esperado em `T0` a partir dessa base e dos movimentos comprovados do intervalo. Registrar o período da base separadamente do período de cobertura. Uma entrada declarada sem evidência mantém o cálculo pendente.
3. Preservar o valor armazenado e sua precisão. Usar aritmética decimal verificável na tabela e apontar valores não finitos, negativos ou fora da faixa suportada à revisão. Conferir também a representabilidade nas operações de estoque aprovadas antes de propor qualquer escrita.
4. Calcular a diferença como `saldo esperado − saldo observado`, sempre acompanhada da unidade e do corte. Diferença positiva indica quanto falta no registro observado em relação à referência aceita. Diferença negativa indica quanto excede essa referência.
5. Registrar o lote do movimento somente quando comprovado na época. Um lote ausente na evidência histórica continua como informação faltante. Quando a evidência comprovar que a operação ocorreu sem lote vinculado, registrar essa condição com a referência correspondente.
6. Se fontes divergirem, conservar origem, revisão, período de cobertura e conteúdo contraditório de cada uma. Encaminhar a obtenção de evidência complementar ao papel responsável. A fonte corrente isolada sustenta o estado observado e a pendência continua até revisão conclusiva.

## Registrar a decisão por item

| Resultado | Condição | Conteúdo da decisão |
| --- | --- | --- |
| Confirmada | Identidade, unidade, vínculos e saldo do corte concordam com referência aceita e cobertura suficiente. | Alias, saldo observado, esperado, unidade, diferença zero, evidências, justificativa, revisão e data. |
| Regularização proposta | Evidência suficiente sustenta diferença quantificada na mesma unidade e um estado esperado. | Anterior, esperado, diferença com sinal, justificativa, movimentos e fontes que sustentam o cálculo, impacto e revisão. A aplicação depende da prontidão das tarefas seguintes. |
| Pendente | Unidade incompatível, movimento ambíguo, fonte física não consultada, vínculo histórico ausente, cobertura insuficiente ou conflito de fontes. | Campo ou período afetado, evidência disponível, informação faltante, providência, responsável pela resolução ou designação nominal pendente e versão a reavaliar. |

O resultado alimenta o controle de prontidão de T004 e o ensaio de T006. Cópia conferida, retorno validado, revisão e autorização específica devem corresponder às versões do recorte, da proposta e da referência antes de qualquer aplicação.

## Exemplo documental sintético

Todos os aliases, valores, instantes e referências desta seção são fictícios. As evidências são conteúdos declarados para a conferência da amostra.

| Cabeçalho comum | Valor sintético |
| --- | --- |
| Inventário | `FIC-INV-ESTOQUE` v1, conferência documental de 2 de maio de 2030. |
| Recorte e corte | `FIC-RECORTE-ESTOQUE` v1, produtos A a D e relações declaradas abaixo. Início inclusivo `T-1 = 2030-04-01T00:00:00Z` e fim exclusivo `T0 = 2030-05-01T00:00:00Z`, com captura do estado em `T0`. O instante coincide com o [exemplo de contas](protocolo-inventario-contas.md#matriz-sintética-do-recorte-com-divergências). |
| Estado observado | `FIC-REF-OBS-EST` v1, captura consistente fictícia em `T0`, produzida por `FIC-OPERADOR-ESTOQUE`. |
| Referência anterior | `FIC-REF-BASE-EST` v1 no instante `T-1`, com os saldos e unidades declarados na matriz. Aceita exclusivamente no exemplo sintético. |
| Histórico | `FIC-REF-MOV-EST` v1. Cobertura declarada completa de A e B no intervalo. C contém uma declaração legada ambígua e D contém unidades incompatíveis. A trilha durável fictícia começa em `T-1`. |
| Regras e revisão | `FIC-REGRA-EST` v1 representa as invariantes de Empréstimos e Integridade indicadas neste protocolo. Revisão por `FIC-REVISOR-ESTOQUE`, distinto do operador, em 2 de maio de 2030. |
| Acesso e finalidade | Conferência documental compartilhável por aliases. Correspondência nominal, fontes operacionais externas, perfis, local e prazo de guarda aguardam preenchimento da equipe. |

| Evidência sintética | Conteúdo declarado |
| --- | --- |
| `FIC-EV-A-BASE` e `FIC-EV-A-OBS` | Produto A com 12 unidades em `T-1` e 12 unidades em `T0`, vínculo corrente com lote A. |
| `FIC-EV-A-BAIXA` | Baixa de 2 unidades do produto A, empréstimo A, em `2030-04-10T12:00:00Z`, com autoria por alias e lote A capturado na origem. |
| `FIC-EV-A-RETORNO` | Devolução de 2 unidades do mesmo produto e empréstimo em `2030-04-20T12:00:00Z`, com autoria e vínculo à baixa. Cobertura completa de A declarada em `FIC-REF-MOV-EST` v1. |
| `FIC-EV-B-BASE` e `FIC-EV-B-OBS` | Produto B com 12 unidades em `T-1` e 8 unidades em `T0`, vínculo corrente com lote B. |
| `FIC-EV-B-BAIXA` | Baixa única de 2 unidades do produto B, empréstimo B, em `2030-04-12T12:00:00Z`, com autoria e lote B capturado na origem. Cobertura completa de B declarada no intervalo, sem outros efeitos de estoque. |
| `FIC-EV-C-BASE` e `FIC-EV-C-OBS` | Produto C com 10 unidades na base e 8 unidades no corte, vínculo corrente com lote C. |
| `FIC-EV-C-DECL` | Item de solicitação de 2 unidades em estado legado indeterminado. Faltam prova de decisão e timestamp gravados conjuntamente, autoria e lote histórico. |
| `FIC-EV-D-BASE` e `FIC-EV-D-OBS` | Produto D com referência declarada de 6 unidades e saldo observado de 1 litro, com `UnidadeMedida.Litro` armazenada. Relação entre as medidas, fator aprovado e contagem física aguardam comprovação. |

| Decisão | Produto e unidade observada | Base e movimentos comprovados | Saldo esperado e observado em T0 | Resultado e encaminhamento |
| --- | --- | --- | --- | --- |
| `FIC-DEC-EST-A` v1 | `FIC-PRODUTO-A`, unidade, lote A comprovado nos dois eventos. | Base 12, baixa 2 e devolução 2, pelas evidências de base, baixa e retorno de A. | Esperado 12, observado 12, diferença 0 unidade. | Confirmada por `FIC-REVISOR-ESTOQUE`. A cobertura suficiente e os vínculos constam da referência v1. |
| `FIC-DEC-EST-B` v1 | `FIC-PRODUTO-B`, unidade, lote B comprovado na baixa. | Base 12 e baixa 2, pelas evidências de B. | Esperado 10, observado 8, diferença +2 unidades. | Regularização proposta para saldo 10 pela diferença comprovada. Revisão documental de `FIC-REVISOR-ESTOQUE`, com execução pendente das condições de prontidão. |
| `FIC-DEC-EST-C` v1 | `FIC-PRODUTO-C`, unidade, lote corrente C. | Base 10. Movimento de 2 declarado sem prova suficiente. | Observado 8. Esperado e diferença conclusiva indeterminados. | Pendente de comprovação do movimento e do lote histórico. Encaminhar a `FIC-REVISOR-ESTOQUE` para obter referência complementar e reavaliar v1. |
| `FIC-DEC-EST-D` v1 | `FIC-PRODUTO-D`, litro. | Referência de 6 unidades, com relação entre as medidas e fator de conversão ausentes. | Observado 1 litro. Esperado na mesma unidade e diferença indeterminados. | Pendente de unidade comparável, fator aprovado e versão, além da fonte física aceita e consultada. Encaminhar a `FIC-REVISOR-ESTOQUE` para reavaliar v1. |

O recorte `FIC-RECORTE-ESTOQUE` v1 termina com uma confirmação, uma regularização proposta e duas pendências. A proposta de B conserva seus vínculos e movimentos como observados e espera revisão de prontidão para qualquer aplicação.

## Encerrar o recorte limpo

O domínio de estoque do recorte sintético `FIC-RECORTE-LIMPO` v1 contém somente o produto A e sua referência de base, captura em `T0`, baixa e devolução. A cobertura desse estoque está completa e a decisão `FIC-DEC-EST-A` v1 o confirma. Sua conclusão de estoque é **sem regularizações propostas**, com diferença zero e evidências indicadas.

O [protocolo de contas](protocolo-inventario-contas.md#encerrar-a-parte-de-contas-de-um-recorte-limpo) documenta a conta L confirmada pela decisão `FIC-DEC-L` v1, referência `FIC-REF-L` v1 e evidência `FIC-EV-L` v1 no mesmo recorte e corte. A conclusão conjunta sintética de 2 de maio de 2030, com autoria documental de `FIC-OPERADOR-ESTOQUE` e revisão de `FIC-REVISOR-ESTOQUE`, vincula essa conclusão de contas à de estoque.

**Conclusão de `FIC-RECORTE-LIMPO` v1 em `T0`: uma conta e um produto enumerados, ambos revisados e confirmados, zero regularizações propostas e zero pendências.** Em qualquer revisão posterior, identificar a versão, a data, os itens e as referências de ambos os domínios. Uma pendência de comprovação conserva o recorte aberto para o domínio afetado.

## Conferência documental e rastreabilidade

O RED documental encontrou este protocolo ausente. O GREEN usa os casos abaixo e as linhas de decisão de estoque, inventário e pendência do checklist. O REFACTOR compartilha com o protocolo de contas os estados de decisão, o corte comum e a forma de registrar fonte conflitante ou insuficiente.

| Caso de conferência | Critério | Resultado verificável |
| --- | --- | --- |
| Comparar A na mesma unidade, com cobertura completa | CA-002 | 12 − 2 + 2 = 12. Diferença 12 − 12 = 0. Decisão confirmada e evidências vinculadas. |
| Comparar B na mesma unidade, com baixa única comprovada | CA-002 | 12 − 2 = 10. Diferença 10 − 8 = +2 unidades. Esperado 10 registrado na proposta. |
| Conferir C com item legado ambíguo | CA-009 | A declaração de 2 unidades permanece fora da soma comprovada. Esperado e diferença ficam indeterminados, com prova faltante e encaminhamento registrados. |
| Conferir D com litro e unidade | CA-002 e CA-009 | A incompatibilidade mantém diferença indeterminada e pede fator aprovado, versão e evidência física aceita. |
| Retirar a prova da baixa de B | CA-009 | Cobertura de movimentos deixa de sustentar o esperado 10. Reclassificar a decisão como pendente até comprovação e reavaliar v1. |
| Trocar o lote corrente de A na amostra | CA-002 e CA-009 | Preservar lote A dos eventos comprovados. O vínculo novo depende de evidência própria. |
| Usar captura posterior ao corte sem referência consistente de T0 | CA-009 | Registrar período sem comprovação e obter captura compatível antes de concluir. |
| Conferir o recorte limpo | CA-003 | Escopo, unidade, cobertura e referências de estoque e contas estão explícitos. A conclusão conjunta registra dois itens confirmados, zero propostas e zero pendências. |
| Retirar a conclusão explícita do recorte limpo | CA-003 | Encerramento incompleto, ainda que a decisão A esteja presente. |

O uso operacional requer os campos de equipe e de acesso do cabeçalho preenchidos, fontes aceitas, revisão da referência e autorização específica do recorte. Esta entrega conclui a preparação documental sintética.
