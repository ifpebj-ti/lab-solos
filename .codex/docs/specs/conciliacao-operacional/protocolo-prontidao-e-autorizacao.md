# Protocolo de prontidão, revisão e autorização da conciliação

Entrega documental de T004, #470, para RF-003/RF-004/RF-005, RNF-002 e CA-004/CA-005/CA-006/CA-009/CA-010 do [PRD](prd.md). Aplicar o [checklist de completude](checklist-completude.md), os [modelos de proposta e autorização](modelos-evidencias.md) e a [decisão de prontidão e retorno sintéticos](../decisoes-de-planejamento.md#pré-requisitos-operacionais).

## Vincular a avaliação a uma referência

Abrir um registro de prontidão com identificador, versão, finalidade, ambiente, momento UTC, autor e revisor. Registrar as versões exatas do recorte, dos inventários de contas e estoque, da proposta, do esquema da cópia e do manifesto de evidências. O corte comum `T0` e a cobertura temporal devem coincidir entre os domínios. Conferir os SHA-256 calculados sobre a cópia preservada e os artefatos de referência segundo o [contrato de acesso e evidências](contrato-acesso-e-evidencias.md).

Vincular as decisões dos [inventários de contas](protocolo-inventario-contas.md) e [estoque](protocolo-inventario-estoque.md) aos aliases incluídos na proposta. Casos com fonte insuficiente continuam pendentes com o campo, a evidência necessária, o papel encarregado e a versão a reavaliar. Uma captura atual sustenta o estado observado em `T0`; a origem das decisões e dos movimentos exige a evidência correspondente e sua cobertura documentada.

## Papéis e segregação

| Papel documental | Responsabilidade e registro |
| --- | --- |
| Operador | Prepara a referência, calcula hashes, enumera os itens e registra os estados observados. Executa apenas o ensaio cuja versão e ambiente tenham autorização pertinente. |
| Revisor distinto do operador | Confere fontes, hashes, cobertura, efeitos esperados, continuidade administrativa e evidência de retorno. Registra conclusão com autoria e momento em artefato separado. |
| Autorizador | Decide a prontidão e a finalidade permitida para as versões exatas. Registra ambiente, escopo, condições, autoria e vigência da autorização. |
| Responsável pelo retorno | Avalia a condição de retorno e registra a decisão e os resultados conferidos contra a referência anterior. Sua identidade e autoridade devem constar do registro. |
| Custodiante | Mantém as versões imutáveis, o mapa restrito de aliases e os acessos concedidos. Confere disponibilidade e retenção da cópia e das evidências. |

Os aliases `FIC-OPERADOR`, `FIC-REVISOR`, `FIC-AUTORIZADOR`, `FIC-RETORNO` e `FIC-CUSTODIA` representam papéis do exemplo sintético. O registro nominal e as permissões correspondentes integram a preparação de qualquer uso operacional real. A revisão exige operador e revisor distintos mesmo quando outra função for acumulada com designação expressa.

## Checklist verificável por versão, corte e hash

Em cada linha, registrar evidência e versão, conferente, momento, resultado e pendência. Uma declaração sem o comprovante exigido mantém a condição em aberto.

| Condição | Evidência exigida | Verificação de completude e integridade |
| --- | --- | --- |
| Identidade da avaliação | Recorte, proposta, inventários e registro de prontidão versionados. | Os aliases e as versões citados existem e abrangem os mesmos itens. |
| Corte e cobertura | `T0` UTC comum e intervalos com início e fim documentados. | A referência de estado é consistente entre contas e estoque e a evidência cobre o período usado na conclusão. |
| Esquema | Versão do esquema e das regras de domínio da cópia. | O método de comparação e retorno é compatível com esse esquema. |
| Cópia disponível | Local concedido à custódia, manifesto, tamanho e SHA-256 por arquivo. | O operador acessa a cópia preservada e o revisor recalcula os hashes. |
| Cópia conferida | Resultado da leitura, conferência dos hashes e cobertura de registros, vínculos e permissões. | Evidência de conferência é ligada à mesma cópia e versão, com autoria distinta. |
| Evidência por item | Estado observado, esperado, justificativa, origem e decisão de revisão. | Cada proposta é sustentada e cada lacuna fica identificada como pendente. |
| Segregação | Designações do operador, revisor, autorizador, custódia e retorno. | Operador e revisor são distintos, e cada papel possui o acesso necessário à finalidade. |
| Continuidade administrativa | Estado combinado de todos os administradores relevantes após todas as alterações propostas. | Pelo menos um Administrador permanece Habilitado. Conferir também o entorno administrativo necessário ao cálculo. |
| Escritas suspensas no ensaio | Evidência de isolamento da cópia sintética e suspensão das escritas concorrentes. | O ambiente e o conjunto observado coincidem com o ensaio autorizado. |
| Diferenças externas | Comparativo dos registros e permissões do entorno com a referência. | Toda diferença externa tem decisão registrada. Uma mudança concorrente torna a avaliação inconclusiva. |
| Retorno validado | Ensaio de restauração integral da cópia sintética isolada, com hashes e comparação dos estados restaurados. | Registros, vínculos e permissões retornam ao estado de referência e a revisão identifica diferenças residuais. |
| Autorização específica | Identidade do autorizador, momento, vigência, finalidade, ambiente e versões exatas de recorte, proposta, cópia e manifesto. | A autorização corresponde integralmente à atividade e às referências em avaliação. |

## Decidir o estado de prontidão

| Estado | Condição de atribuição | Encaminhamento |
| --- | --- | --- |
| Pendente | Falta condição obrigatória, decisão, revisão, cópia conferida, retorno validado ou autorização compatível. Também se aplica a proposta cujo resultado conhecido retiraria o último Administrador habilitado. | Identificar a condição e a versão afetadas, solicitar o comprovante ou a revisão da proposta e preservar os registros. |
| Inconclusivo | Hash divergente, fontes em conflito, referência alterada durante a conferência, mudança concorrente ou efeito fora do recorte impedem confiar na comparação. | Interromper o avanço e a restauração automática. Preservar as referências e obter decisão do revisor e do autorizador sobre novo corte ou nova avaliação. |
| Pronto | Todas as condições têm evidência compatível, revisão concluída e autorização específica para as versões e finalidade. | Registrar a conclusão e seus limites. A execução começa somente no ambiente e escopo identificados. |

Se houver causa de inconclusão junto de uma condição ausente, registrar ambas e atribuir **inconclusivo** à avaliação. Após resolver a incerteza, reavaliar todas as condições. Uma alteração de versão, recorte, corte, esquema ou referência invalida a prontidão anterior para a nova combinação e exige nova revisão e autorização correspondentes.

## Conferir a continuidade no estado combinado

Enumerar os Administradores relevantes, seu papel e estado observados e cada concessão, retirada, desabilitação ou exclusão prevista. Aplicar todas as propostas ao quadro de avaliação antes de contar os Administradores habilitados resultantes. Incluir contas de entorno quando sua habilitação sustentar a conclusão e vincular a comprovação de cada uma. A proposta precisa ser compatível com a guarda transacional compartilhada definida em [Integridade](../integridade-de-produtos-e-lotes/techspec.md#alternativas-e-decisões).

| Amostra sintética | Observado em `T0` | Proposta combinada | Resultado da conferência |
| --- | --- | --- | --- |
| `FIC-CONTINUIDADE-A` v1 | A e B são Administradores Habilitados, com evidência de ambos. | Desabilitar A e B no mesmo recorte. | Zero remanescentes. Estado pendente por violação da continuidade. A avaliação isolada de cada linha é insuficiente. |
| `FIC-CONTINUIDADE-B` v1 | Mesma referência comprovada. | Desabilitar somente A. | Um remanescente B. Condição de continuidade atendida. As demais condições da checklist permanecem aplicáveis. |
| `FIC-CONTINUIDADE-C` v1 | A habilitado, com estado de B indeterminado. | Desabilitar A, alegando que B continuará habilitado. | Estado pendente de evidência do papel e estado de B. |

## Validar o retorno integral do exemplo isolado

O procedimento desta seção especifica o ensaio com cópia integralmente sintética. O registro de sua execução efetiva e a conferência dos resultados pertencem a T006.

1. Identificar a cópia de referência e o manifesto aprovado, sua versão, esquema, `T0` e SHA-256. Registrar a autorização específica para o ambiente sintético descartável e a suspensão de escritas concorrentes.
2. Registrar os estados de referência de contas, produtos, lotes, empréstimos, movimentos, vínculos e permissões pertinentes ao recorte e ao entorno. Manter arquivos de origem imutáveis e usar uma instância separada para o ensaio.
3. Vincular cada alteração sintética à proposta autorizada e registrar os estados esperados e observados. Conferir os aliases de entorno e a continuidade administrativa depois dos efeitos combinados.
4. Se houver uma condição de retorno prevista, como diferença residual que impeça concluir o ensaio ou interrupção da operação, o responsável pelo retorno decide e registra a restauração. Confirmar novamente o isolamento e a ausência de alterações concorrentes ou externas. Uma alteração concorrente ou fora do recorte torna a prontidão inconclusiva e interrompe a restauração automática até decisão e revisão explícitas.
5. Em condição de isolamento confirmada e com decisão válida, restaurar integralmente a cópia sintética aprovada na instância do ensaio. Registrar o manifesto usado, o operador, o momento e o resultado da restauração.
6. Recalcular os hashes dos artefatos preservados e comparar novamente os registros, vínculos e permissões restaurados contra os estados de referência. Comparar o conteúdo de domínio separadamente dos metadados dos arquivos de evidência. Confirmar a continuidade administrativa resultante.
7. Registrar diferenças residuais ou externas e o estado final. Retorno sem evidência suficiente fica inconclusivo e é encaminhado para revisão. Uma nova tentativa recebe referência e registro próprios.

A autorização ampla registrada nesta etapa cobre a preparação e os exemplos documentais sintéticos locais. O uso operacional real exige responsáveis nominais, ambiente e fonte aceitos, destino restrito das evidências, plano de retorno aprovado para aquele ambiente e autorização específica de seu recorte e versões.

## Registro de autorização por finalidade

| Campo | Exemplo de preenchimento sintético |
| --- | --- |
| Identidade e revisão | `FIC-AUT-PRONTIDAO` v1, de `FIC-AUTORIZADOR`, com revisão de `FIC-REVISOR`. |
| Finalidade e ambiente | Ensaio documental com dados fictícios em `FIC-AMBIENTE-ISOLADO`. |
| Referências exatas | `FIC-RECORTE` v1, `FIC-PROPOSTA` v1, `FIC-COPIA` v1 e `FIC-MANIFESTO` v1, com hashes calculados na evidência correspondente e corte `T0`. |
| Conteúdo permitido | Conferir a matriz sintética e o roteiro de retorno daquela versão. |
| Momento, vigência e condições | Registrar o instante UTC e o intervalo de validade no termo do ensaio, além de isolamento, suspensão de escritas e critérios de parada. |
| Situação da amostra | Modelo de campos de autorização. O resultado de uma execução efetiva depende dos comprovantes enumerados na checklist. |

## Casos de conferência documental

Cada variação abaixo é aplicada isoladamente a uma hipótese com todos os demais campos e evidências compatíveis. Os resultados observados se referem à aplicação das regras documentais, usando os exemplos sintéticos de T001.

| Caso | Variação | Esperado e verificado no protocolo |
| --- | --- | --- |
| `FIC-PR-01`, CA-004 | Retirar a revisão aprovada da proposta. | Pendente por revisão ausente. Registrar revisor e versão a reavaliar. |
| `FIC-PR-02`, CA-004 | Declarar cópia disponível, omitindo a conferência. | Pendente por prova de cópia conferida ausente. |
| `FIC-PR-03`, CA-004/006 | Omitir a validação de retorno. | Pendente até comprovar restauração e comparação na versão da cópia avaliada. |
| `FIC-PR-04`, CA-004 | Omitir a autorização específica. | Pendente por autorização ausente. |
| `FIC-PR-05`, CA-004/009 | Usar autorização v1 com proposta v2. | Pendente por incompatibilidade de versão. Reavaliar o conjunto. |
| `FIC-PR-06`, CA-009 | Misturar capturas com cortes ou esquemas incompatíveis. | Pendente de referência compatível. Documentar os campos afetados. |
| `FIC-PR-07`, CA-009 | Obter hash diferente do manifesto aprovado. | Inconclusivo por integridade não confirmada. Interromper o avanço. |
| `FIC-PR-08`, CA-010 | Aplicar o conjunto de retiradas do exemplo A. | Pendente, pois o total resultante é zero Administradores Habilitados. |
| `FIC-PR-09`, CA-005 | Atribuir a operação e a revisão à mesma identidade. | Pendente de revisão independente. |
| `FIC-PR-10`, CA-005/006 | Detectar escrita concorrente ou alteração de permissão de entorno. | Inconclusivo. Interromper a restauração automática e encaminhar para decisão de referência e retorno. |
| `FIC-PR-11`, CA-005 | Omitir vínculo entre uma alteração e a justificativa da proposta. | Pendente com alias, evidência faltante e revisão a reavaliar. |
| `FIC-PR-12`, CA-006 | Retornar a cópia e omitir a conferência de vínculos ou permissões. | Resultado do retorno inconclusivo. A condição de retorno validado continua pendente. |
| `FIC-PR-13`, CA-004/005 | Conferir todos os requisitos com versões, corte, hashes e finalidade compatíveis. | Pronto para a finalidade específica descrita, com registro da revisão e dos comprovantes. |
| `FIC-PR-14`, CA-004 | Empregar o modelo de ensaio como autorização para uso operacional real. | Pendente de autorização e plano próprios para ambiente e finalidade operacionais. |
| `FIC-PR-15`, CA-009 | Retirar evidência de justificativa ou cobertura de fonte de um item. | Pendente de comprovação, preservando o registro observado. |

O RED documental encontrou o protocolo ausente. A conferência final percorre as condições da checklist, as quinze variações e os vínculos locais para verificar que nenhuma ausência recebe estado pronto.
