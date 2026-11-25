# Protocolo de revisão do inventário de contas privilegiadas

Entrega documental de T002, #470, para RF-001, RF-003, RNF-001/RNF-002 e CA-001/CA-003/CA-009 do [PRD](prd.md). Usar o [cabeçalho comum e o modelo de decisão de conta](modelos-evidencias.md) e o [checklist de completude](checklist-completude.md). A [decisão de protocolos sintéticos](../decisoes-de-planejamento.md#pré-requisitos-operacionais) estabelece o corte comum `T0` em UTC, referência versionada e operador distinto do revisor.

## Preparar o recorte e as evidências

1. Abrir o inventário com identificador, revisão, data, finalidade e intervalo histórico encerrado em `T0`. Enumerar os aliases de contas abrangidas e registrar exclusões. Incluir Administradores e Mentores com autoridade de decisão, além das contas vinculadas necessárias à revisão. Registrar a versão da [matriz de Contas](../seguranca-de-contas-e-sessoes/matriz-contas.md) usada na análise.
2. Identificar a captura consistente do estado observado em `T0`, com origem, revisão, data, campos e relação com o recorte. Uma captura do banco comprova o papel, o tipo, o estado e o vínculo observados naquele corte. Para justificar concessão anterior, vincular a evidência verificável da decisão e sua autoria. A trilha durável implantada comprova alterações a partir de sua implantação. Definir esse início de cobertura na referência e registrar lacunas anteriores.
3. Atribuir por papel a operação a `FIC-OPERADOR-CONTAS` e a revisão a `FIC-REVISOR-CONTAS`, distintos. Identificar o autorizador pelo papel `FIC-AUTORIZADOR-OPERACAO` e a responsabilidade sobre acesso a evidências pelo papel `FIC-CUSTODIA`. Esses aliases representam funções do exemplo. O preenchimento nominal integra a preparação de qualquer uso operacional.
4. Usar aliases nas tabelas compartilháveis. Guardar a correspondência entre alias e identificador de conta em evidência restrita, com finalidade, perfis de leitura/escrita, local e prazo de guarda definidos pela equipe. Referenciar apenas as evidências necessárias à decisão. O material compartilhável omite nomes, e-mails, identificadores diretos dispensáveis e material de autenticação.

## Conferir cada conta

| Campo | Conferência | Informação a registrar quando faltar comprovação |
| --- | --- | --- |
| Papel | Comparar `NivelUsuario` observado com a autoridade documentada para o recorte. Distinguir privilégio atual da justificativa histórica de concessão. | Fonte verificável da autoridade ou da concessão, responsável por obtê-la e revisão a reavaliar. |
| Tipo | Comparar `TipoUsuario` com o modelo e a regra aplicável à origem da conta. Cadastro público novo aceita acadêmicos Mentor e Mentorado. | Origem e regra histórica aplicável. Uma combinação legada divergente é encaminhada à revisão administrativa. |
| Estado | Conferir `Status` em `T0`. Identificar habilitação efetiva e eventuais propostas de desabilitação ou reabilitação. | Evidência datada que sustente o estado esperado e justificativa da transição. |
| Vínculo | Identificar o alias do responsável quando exigido e comprovar seu papel e estado na referência pertinente. Mentor dispensa responsável no cadastro público atual. | Evidência do vínculo e da habilitação pertinente. Registrar vínculo indeterminado quando as fontes forem insuficientes. |
| Justificativa | Vincular o motivo da confirmação ou da proposta à evidência e à regra versionada. | A decisão permanece pendente enquanto faltar o motivo ou a referência que o sustenta. |
| Revisão | Identificar revisor, momento, resultado, referência e versão do item. | Encaminhar revisão incompleta ao papel responsável e registrar a designação nominal pendente. |

Comparar referências do mesmo corte e da mesma versão. Quando duas fontes divergirem, conservar ambas com sua origem, cobertura temporal e contradição identificada. Solicitar fonte verificável complementar ao responsável de contas. Até a resolução, registrar **pendente** e preservar o estado observado. O valor atual de um campo, isoladamente, sustenta somente o estado observado.

## Atribuir o resultado da revisão

| Estado da decisão | Condição | Registro exigido |
| --- | --- | --- |
| Confirmada | Regra aplicável, estado observado e justificativa são compatíveis com as evidências do item. | Justificativa, referências verificáveis, revisão e autoria. |
| Regularização proposta | Evidência suficiente sustenta uma divergência e um estado esperado, com motivo explícito. | Anterior observado, esperado, diferença, justificativa, impacto sobre vínculos e decisão de revisão. A prontidão de aplicação é verificada nas tarefas seguintes. |
| Pendente | Fonte, vínculo, justificativa, regra histórica ou autoria necessária está ausente, incompatível ou insuficiente. | Campo afetado, informação necessária, responsável por resolução ou designação pendente e versão a reavaliar. Preservar os registros. |

A conclusão por conta alimenta a proposta do recorte. Antes de qualquer aplicação, conferir o resultado combinado de todas as propostas e do entorno administrativo. O cálculo deve manter pelo menos um Administrador habilitado e usar a guarda transacional comum. Essa conferência combinada, a cópia validada, o retorno e a autorização específica integram T004/T006. Uma linha classificada como regularização proposta continua aguardando essas condições de execução.

## Matriz sintética do recorte com divergências

Todos os aliases, instantes, evidências e conteúdos desta seção são inventados para testar o protocolo. Os rótulos de evidência representam conteúdo fictício declarado abaixo e permitem a conferência documental.

| Cabeçalho comum | Valor sintético |
| --- | --- |
| Inventário e revisão | `FIC-INV-CONTAS` v1, revisão documental de 2 de maio de 2030. |
| Recorte e intervalo | `FIC-RECORTE-CONTAS` v1. Contas A a D e responsável de apoio R. Histórico com início inclusivo `T-1 = 2030-04-01T00:00:00Z` e fim exclusivo `T0 = 2030-05-01T00:00:00Z`, com captura do estado em `T0`. |
| Referência de estado | `FIC-REF-OBS` v1, captura fictícia consistente das cinco contas em `T0`, produzida por `FIC-OPERADOR-CONTAS`. |
| Referência histórica | `FIC-REF-TRILHA` v1, com início fictício de cobertura em `2030-04-01T00:00:00Z`, mais as justificativas indicadas por item. Ações anteriores exigem fonte complementar. |
| Regra | Matriz de cadastro e autoridade de Contas, revisão indicada por `FIC-REGRA-CONTAS` v1 no exemplo. A referência real deverá identificar revisão verificável do documento. |
| Revisão e finalidade | Conferência documental por `FIC-REVISOR-CONTAS`, em 2 de maio de 2030. Material compartilhável com aliases. |
| Acesso operacional | Correspondência nominal, fonte externa aceita, local, prazo de guarda e perfis efetivos aguardam preenchimento da equipe. |

| Evidência fictícia | Conteúdo declarado para a amostra |
| --- | --- |
| `FIC-EV-OBS` v1 | Em `T0`, A e B são Administradores habilitados do tipo Administrador, C é Mentor acadêmico habilitado e D é Mentorado acadêmico pendente com responsável R. R é Mentor acadêmico habilitado. |
| `FIC-EV-A` v1 | Decisão fictícia com autoria e momento cobertos pela trilha autoriza A como Administrador habilitado no corte. |
| `FIC-EV-B` v1 | Decisão fictícia verificável, posterior à concessão e anterior a `T0`, determina desabilitar B. A captura ainda registra B habilitado. |
| `FIC-EV-C` v1 | Captura atual identifica C como Mentor. A justificativa e a evidência da concessão ficam ausentes na amostra. |
| `FIC-EV-D1` v1 | Uma referência fictícia registra R como responsável por D antes de `T0`. |
| `FIC-EV-D2` v1 | Outra referência fictícia, com o mesmo corte, atribui responsável diferente e carece da decisão que explique a troca. |
| `FIC-EV-R` v1 | Decisão fictícia de habilitação de R como Mentor, com justificativa, autoria e momento verificáveis dentro da cobertura histórica da amostra. |

| Decisão e conta | Papel, tipo, estado e vínculo observados | Resultado, justificativa e efeito esperado | Evidência e revisão |
| --- | --- | --- | --- |
| `FIC-DEC-A` v1, A | Administrador, Administrador, Habilitado. Vínculo de responsável inaplicável pela jornada administrativa. | **Confirmada**. O privilégio e a habilitação concordam com a decisão de origem. | `FIC-EV-OBS` e `FIC-EV-A`, revisadas por `FIC-REVISOR-CONTAS` em 2 de maio de 2030. |
| `FIC-DEC-B` v1, B | Administrador, Administrador, Habilitado. Vínculo de responsável inaplicável. | **Regularização proposta**. A decisão documentada de desabilitação difere da captura. Esperado B Desabilitado, preservando o registro. Conferir continuidade do recorte combinado antes de aplicar. | `FIC-EV-OBS` e `FIC-EV-B`, mesma revisão. |
| `FIC-DEC-C` v1, C | Mentor, Acadêmico, Habilitado, sem responsável conforme a matriz atual. | **Pendente** por justificativa de autoridade ausente. `FIC-REVISOR-CONTAS` solicita a comprovação a `FIC-AUTORIZADOR-OPERACAO`, com designação nominal pendente, para reavaliar v1. | `FIC-EV-OBS` e ausência registrada em `FIC-EV-C`. |
| `FIC-DEC-D` v1, D | Mentorado, Acadêmico, Pendente, responsável observado R habilitado. | **Pendente** por fontes conflitantes sobre o vínculo. `FIC-OPERADOR-CONTAS` solicita decisão verificável de atribuição ou transferência ao responsável de contas a designar, para reavaliar v1. | `FIC-EV-OBS`, `FIC-EV-D1` e `FIC-EV-D2`. |
| `FIC-DEC-R` v1, R | Mentor, Acadêmico, Habilitado, sem responsável conforme a matriz atual. | **Confirmada**. Habilitação e autoridade de Mentor concordam com a decisão da amostra. | `FIC-EV-OBS` e `FIC-EV-R`, mesma revisão. |

Cobertura do exemplo com divergências registrada para as cinco contas A, B, C, D e R. O resultado contém duas confirmadas, uma proposta e duas pendências. A confirmação da autoridade de R conserva a pendência específica sobre o vínculo de D. A identidade dos administradores remanescentes e a suficiência da evidência entram no cálculo combinado antes de qualquer execução.

## Encerrar a parte de contas de um recorte limpo

O exemplo `FIC-RECORTE-LIMPO` v1 usa o mesmo corte `T0`, o mesmo intervalo e a revisão documental descritos acima. Seu inventário enumera somente a conta `FIC-CONTA-L` como privilegiada. A referência fictícia `FIC-REF-L` v1 contém a captura e uma decisão de origem verificável que sustentam tipo Administrador, papel Administrador e estado Habilitado em `T0`. O vínculo de responsável é inaplicável nessa jornada, com motivo registrado.

`FIC-DEC-L` v1 atribui **confirmada** à conta L por compatibilidade entre a matriz aplicável e a evidência `FIC-EV-L` v1, revisada por `FIC-REVISOR-CONTAS` em 2 de maio de 2030. A referência compreende a origem, autoria, momento e cobertura temporal fictícios da decisão.

**Conclusão da revisão de contas de `FIC-RECORTE-LIMPO` v1 em `T0`: uma conta enumerada, uma revisada e confirmada, zero regularizações propostas e zero pendências. Recorte de contas limpo.** Essa conclusão deve ser vinculada à cobertura de estoque de T003 para o encerramento integral do recorte comum previsto em CA-003. Registrar separadamente qualquer exclusão de domínio e seu motivo no inventário.

## Pré-requisitos para uso operacional

| Campo a preencher pela equipe | Responsabilidade ou efeito enquanto estiver em aberto |
| --- | --- |
| Operador e revisor nominais distintos, responsável por contas e autorizador operacional | Atribuir autoria e autoridade verificáveis para a versão do recorte. |
| Instante real de `T0`, intervalo, contas e exclusões | Identificar abrangência e cobertura completa da revisão. |
| Fonte de captura e fonte externa aceita para justificativas, com datas, revisões e início da trilha | Sustentar separadamente o estado observado e a história comprovável. Divergências ficam pendentes até a revisão da evidência. |
| Local e prazo de guarda, perfis autorizados e custódia do mapa de aliases | Restringir a identificação operacional à finalidade e às pessoas autorizadas. |
| Cópia disponível e conferida, critérios e responsável de retorno, autorização específica para ambiente/finalidade/versões | Fechar a prontidão e o ensaio das tarefas seguintes antes de aplicar uma proposta real. |

## Conferência documental CA-001, CA-003 e CA-009

| Caso | Variação conferida | Resultado esperado e verificado no protocolo |
| --- | --- | --- |
| `FIC-TESTE-01`, CA-001 | Conferir A e B na matriz. | A tem estado confirmada com evidência e justificativa. B tem proposta, motivo, observado e esperado ligados à mesma versão. |
| `FIC-TESTE-02`, CA-001/009 | Conferir C com justificativa ausente. | Estado pendente identifica a informação faltante, o papel encarregado e a revisão v1 a reavaliar. |
| `FIC-TESTE-03`, CA-009 | Conferir as fontes de D em conflito. | Preserva ambas as referências, identifica a decisão de vínculo faltante e mantém o registro pendente. |
| `FIC-TESTE-04`, CA-009 | Supor retirada da justificativa de B, preservando os outros campos. | A proposta passa a pendente até comprovar a justificativa. O estado observado é preservado. |
| `FIC-TESTE-05`, CA-003 | Conferir a conclusão explícita da conta L e sua cobertura. | Um item enumerado e revisado, zero propostas e pendências. O encerramento integral aguarda a cobertura correspondente de estoque. |
| `FIC-TESTE-06`, CA-003 | Supor retirada da conclusão explícita ou da revisão de L. | Encerramento incompleto, mesmo com dados coerentes. Registrar o campo faltante e reavaliar a mesma versão. |
| `FIC-TESTE-07`, CA-009 | Usar somente a captura atual para alegar a concessão histórica de C. | Captura sustenta o estado observado. A comprovação de origem continua pendente. |
| `FIC-TESTE-08`, RNF-001 | Inserir um identificador direto no material compartilhável. | Retirar o identificador e encaminhar a correspondência ao mapa restrito segundo os perfis e o local aprovados. |

A verificação inicial encontrou o protocolo ausente. A verificação final usa as linhas acima e o checklist de T001 para conferir conteúdo, vínculos e tratamentos de ausência. A entrega é documental, com exemplos inteiramente sintéticos.
