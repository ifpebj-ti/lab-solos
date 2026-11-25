# Modelos de evidência da conciliação

Rascunho da T001 (#470). Os campos representam o contrato documental da [especificação técnica](techspec.md) e podem ser revisados com o [checklist de completude](checklist-completude.md). A escolha do formato, da ferramenta de comparação e do mecanismo de retorno segue em aberto.

## Cabeçalho comum

| Campo | Preenchimento |
| --- | --- |
| Artefato e revisão | Tipo, identificador, versão ou revisão e data do registro. |
| Recorte e item | Identificador e versão do recorte, alias do item ou do conjunto e vínculo com as decisões e a proposta pertinentes. |
| Referência e evidências | Identificador, versão, data de referência e alias da evidência. Registrar origem aceita ou pendência de aceitação, inclusive quando fontes divergirem. |
| Autoria e revisão | Autor, responsável, revisor, data e estado da revisão. Associar cada decisão à pessoa que a tomou. |
| Acesso e finalidade | Finalidade do registro e acesso previsto. Manter a correspondência entre aliases e identificadores operacionais em evidência restrita. Registrar como pendentes os perfis, acesso de leitura e escrita, local e retenção enquanto estiverem em aberto. O material compartilhável usa aliases e somente as informações necessárias à conferência. |
| Pendências | Quando houver informação, comprovante ou decisão em aberto, indicar o campo, o que falta, o responsável pela resolução ou a designação pendente e a versão a reavaliar. Registrar o motivo quando um campo condicional for inaplicável. |

## Inventário de escopo

- Período incluído, categorias de conta, produtos, lotes e unidades abrangidos. Registrar exclusões relevantes e a data de referência.
- Fontes aceitas, critério para resolver divergências de fontes e versão das invariantes aplicáveis. Designar responsáveis pela revisão de contas e estoque e registrar a situação de cobertura de cada domínio.
- Registrar conclusão explícita de recorte revisado **sem regularizações propostas** quando a cobertura estiver completa e a conferência não tiver encontrado divergências ou pendências. Vincular a conclusão às evidências da revisão.

## Decisão de conta

- Alias da conta, papel, tipo, estado e vínculo pertinente.
- Decisão registrada como **confirmada**, **regularização proposta** ou **pendente**, com justificativa, referência de evidência e revisor. Em uma proposta, incluir o efeito esperado. Se faltar comprovação, registrar a pendência no cabeçalho e preservar o registro.

## Decisão de estoque

- Alias de produto e lote ou relação pertinente, unidade, saldo registrado, saldo de referência e vínculos. Registrar a situação dos movimentos comprovados e suas evidências.
- Conferir a compatibilidade das unidades antes da comparação numérica. Registrar divergência e correção esperada, conferência sem divergência ou informação faltante que mantenha a decisão pendente. Uma ausência de comprovação fica registrada como tal, com indicação da evidência necessária.

## Proposta e autorização

- Vincular os itens, as decisões, a justificativa e o efeito esperado à versão da referência. Indicar os critérios de conferência, as invariantes aplicáveis e os responsáveis por conta, estoque, revisão, autorização, execução e retorno conforme o recorte.
- Registrar revisão aprovada, cópia de segurança disponível e conferida e retorno validado para a mesma versão. Quando a proposta afetar capacidade administrativa, comprovar a permanência de ao menos um administrador habilitado no estado resultante do conjunto de decisões.
- Registrar autorização específica com identidade do autorizador, data, referência da autorização, finalidade, ambiente e versão do recorte, da proposta e da referência. A autorização de teste tem finalidade de ensaio. Eventual atuação operacional depende de autorização operacional própria.
- Qualquer condição de prontidão ausente ou vínculo incompatível mantém a proposta pendente. Alteração de recorte, proposta ou referência exige nova conferência da prontidão.

## Comparação e retorno

- Por alias de item, vincular a proposta e a autorização pertinentes, justificativa, autoria da execução e da conferência, referência anterior, estado esperado e estado observado. Registrar evidências separadas dos estados e o resultado da verificação de permissões, vínculos, saldos, movimentos e registros vizinhos pertinentes.
- Registrar diferenças residuais e fora do recorte, inclusive ausência de diferenças quando essa for a conclusão. Associar a condição de retorno observada ao alias da evidência e à decisão de retorno, com autoria e data.
- Quando houver retorno, registrar o estado restaurado e a evidência da conferência contra a referência anterior para os registros, permissões, vínculos e movimentos pertinentes. Diferença após retorno fica pendente de revisão e gera sinal de falha. Quando o retorno for inaplicável, registrar o motivo.

## Sinais

- Para concessão de papel, divergência de estoque e falha em fluxo revisado, registrar fonte por evento ou conferência, condição observável, janela, periodicidade, responsável pela análise, destino e forma de encaminhamento.
- Associar o alias do caso e da evidência ao resultado esperado e ao observado na amostra sintética, com indicação do destinatário.

## Matriz de exemplos sintéticos

Datas, valores, evidências e aliases abaixo são inventados. As linhas de cada artefato usam o cabeçalho do respectivo recorte e acrescentam a revisão, a evidência e outras informações próprias do registro. Os três sinais usam o cabeçalho de `FIC-BETA`.

| Cabeçalho de exemplo | Recorte limpo | Recorte com divergências |
| --- | --- | --- |
| Recorte | `FIC-ALFA` v1 | `FIC-BETA` v1 |
| Período, categorias e itens | 1 a 7 de abril de 2030. Contas privilegiadas e estoque. `FIC-CONTA-A`, `FIC-PRODUTO-A` e `FIC-LOTE-A`, em unidades. | 8 a 14 de abril de 2030. Contas privilegiadas e estoque. `FIC-CONTA-B`, `FIC-CONTA-C`, `FIC-PRODUTO-B`, `FIC-PRODUTO-C`, `FIC-LOTE-B` e `FIC-LOTE-C`, em unidades segundo a referência. |
| Referência datada | `FIC-REF-A` v1, 7 de abril de 2030, fonte fictícia `FIC-FONTE-A`. | `FIC-REF-B` v1, 14 de abril de 2030, fonte fictícia `FIC-FONTE-B`. |
| Regra de conferência | `FIC-REGRA-A` v1. Fonte divergente exige comprovação antes de decidir. | `FIC-REGRA-B` v1. Mesmo critério para divergências. |
| Autoria e revisão | Autoria de `FIC-AUTOR` e responsabilidade de `FIC-RESP-CONTAS` e `FIC-RESP-ESTOQUE`. Revisão por `FIC-REVISOR` em 8 de abril de 2030. | Mesmos aliases de autoria e responsabilidade. Revisão por `FIC-REVISOR` em 15 de abril de 2030, exceto onde houver registro posterior explícito. |
| Finalidade e acesso | Conferência documental compartilhável por aliases. Correspondência operacional, se necessária, sob acesso restrito. | Mesma finalidade documental. Perfis, repositório e retenção operacionais constam como em aberto. |

| Artefato | Alias e revisão | Registro sintético |
| --- | --- | --- |
| Inventário de escopo | `FIC-INV-A` v1 | Recorte `FIC-ALFA` integralmente revisado em contas e estoque, sob evidências `FIC-EV-A1` e `FIC-EV-A2`. Conclusão sem regularizações propostas. |
| Inventário de escopo | `FIC-INV-B` v1 | Recorte `FIC-BETA` revisado com divergências e pendências em `FIC-CONTA-C` e `FIC-PRODUTO-C`. Evidência `FIC-EV-B0`. Fonte complementar e decisão de acesso em aberto para reavaliação do recorte v1 por responsáveis a designar para essas decisões. |
| Decisão de conta | `FIC-DEC-A1` v1 | `FIC-CONTA-A`, papel administrativo, tipo individual, habilitada, vínculo `FIC-VINC-A`. Confirmada por `FIC-REVISOR` porque papel e vínculo constam em `FIC-EV-A1`. |
| Decisão de conta | `FIC-DEC-B1` v1 | `FIC-CONTA-B`, papel administrativo, tipo individual, habilitada, vínculo `FIC-VINC-B`. Regularização proposta por divergência de papel em `FIC-EV-B1`. Esperado papel de consulta, com vínculo preservado. |
| Decisão de conta | `FIC-DEC-B2` v1 | `FIC-CONTA-C`, papel de consulta, tipo individual, habilitada, vínculo indeterminado. Pendente porque `FIC-EV-B2` indica fontes divergentes sobre o vínculo. `FIC-RESP-CONTAS` deve obter comprovação do vínculo para reavaliar v1. |
| Decisão de estoque | `FIC-DEC-A2` v1 | `FIC-PRODUTO-A`, `FIC-LOTE-A`, saldo registrado e referência de 12 unidades, movimento de 2 unidades comprovado em `FIC-EV-A2`. Conferência sem divergência. |
| Decisão de estoque | `FIC-DEC-B3` v1 | `FIC-PRODUTO-B`, `FIC-LOTE-B`, saldo registrado 8 e referência 10, ambos em unidades. Movimento de 2 unidades comprovado em `FIC-EV-B3`. Diferença de 2 unidades, saldo esperado 10 na proposta. |
| Decisão de estoque | `FIC-DEC-B4` v1 | `FIC-PRODUTO-C`, `FIC-LOTE-C`, saldo registrado 1 caixa e referência 6 unidades. `FIC-EV-B4` deixa indeterminados o fator de conversão e a comprovação do movimento. Pendente de documentação de unidade e movimento com `FIC-RESP-ESTOQUE` para reavaliar v1. |
| Proposta e autorização | `FIC-PROP-B` v1 | Hipótese fictícia de ensaio, com recorte `FIC-BETA` v1 e referência `FIC-REF-B` v1. Abrange apenas `FIC-DEC-B1` e `FIC-DEC-B3`, pelos motivos e efeitos esperados dessas decisões. Conferir saldos, papéis, vínculos, movimentos e entorno segundo `FIC-REGRA-B` v1. Continuidade administrativa demonstrada na amostra combinada pelo administrador habilitado de entorno `FIC-CONTA-VIZ`, conforme `FIC-EV-CONT`. Revisão `FIC-REVISAO-B` de 15 de abril de 2030 por `FIC-REVISOR`, cópia disponível e conferida `FIC-COPIA-B` v1 e validação de retorno `FIC-VAL-RET-B` v1 por `FIC-RESP-RETORNO`. Autorização fictícia `FIC-AUT-B`, de `FIC-AUTORIZADOR` em 16 de abril de 2030, para ensaio em `FIC-AMBIENTE-TESTE`, vinculada às três versões v1. Operação do ensaio atribuída a `FIC-OPERADOR`. |
| Proposta e autorização | `FIC-PROP-B` v2 | Rascunho de 18 de abril de 2030 com os mesmos itens e referência da v1. Cópia, retorno e revisão aguardam nova conferência, e o campo de autorização para a nova versão está em aberto. Proposta pendente com `FIC-REVISOR` para reavaliar v2. |
| Comparação e retorno | `FIC-COMP-B` v1 | Hipótese vinculada a `FIC-PROP-B` v1, `FIC-AUT-B` e às justificativas em `FIC-DEC-B1` e `FIC-DEC-B3`. `FIC-OPERADOR` e `FIC-REVISOR` registram a conferência fictícia de 17 de abril de 2030. Estados por item abaixo. Diferenças entre esperado e observado incluem um saldo residual e uma permissão de entorno fora do recorte da proposta. A condição fictícia de retorno é a alteração de permissão fora do recorte, observada em `FIC-EV-VIZ3`. `FIC-RESP-RETORNO` registra a decisão de retornar em 17 de abril, em `FIC-DEC-RET`, e revisa o estado restaurado contra o anterior. |
| Sinais | `FIC-SINAL-PAPEL` v1 | Evento `FIC-EVT-PAPEL` indica concessão de papel em `FIC-CONTA-B`. Em amostra de um dia, revisão por evento. Encaminhamento esperado e observado na amostra para `FIC-RESP-CONTAS` pela fila fictícia `FIC-FILA-CONTAS`. Evidência `FIC-EV-S1`. |
| Sinais | `FIC-SINAL-ESTOQUE` v1 | Conferência `FIC-EVT-SALDO` identifica diferença entre saldo registrado e referência, em unidade compatível, para `FIC-PRODUTO-B`. Em amostra de um dia, verificação diária. Encaminhamento esperado e observado na amostra para `FIC-RESP-ESTOQUE` pela fila fictícia `FIC-FILA-ESTOQUE`. Evidência `FIC-EV-S2`. |
| Sinais | `FIC-SINAL-FALHA` v1 | Evento `FIC-EVT-FALHA` registra interrupção de conferência em um fluxo fictício distinto do comparativo. Em amostra de um dia, revisão por evento. Encaminhamento esperado e observado na amostra para `FIC-RESP-RETORNO` pela fila fictícia `FIC-FILA-REVISAO`. Evidência `FIC-EV-S3`. |

| Item de `FIC-COMP-B` v1 | Anterior | Esperado | Observado | Restaurado e conferido |
| --- | --- | --- | --- | --- |
| `FIC-CONTA-B` | Administração, habilitada, `FIC-VINC-B` (`FIC-EV-CB1`) | Consulta, habilitada, mesmo vínculo (`FIC-EV-CB2`) | Conforme esperado (`FIC-EV-CB3`) | Conforme anterior (`FIC-EV-CB4`) |
| `FIC-PRODUTO-B` | 8 unidades, `FIC-LOTE-B`, movimento comprovado (`FIC-EV-EB1`) | 10 unidades, mesmo lote e movimento (`FIC-EV-EB2`) | 9 unidades, mesmo lote e movimento. Diferença residual de 1 unidade (`FIC-EV-EB3`) | Conforme anterior (`FIC-EV-EB4`) |
| `FIC-CONTA-VIZ` | Administração habilitada (`FIC-EV-VIZ1`) | Administração habilitada (`FIC-EV-VIZ2`) | Consulta habilitada. Alteração fora do recorte da proposta e continuidade administrativa comprometida na amostra (`FIC-EV-VIZ3`) | Administração habilitada restabelecida e conferida (`FIC-EV-VIZ4`) |
