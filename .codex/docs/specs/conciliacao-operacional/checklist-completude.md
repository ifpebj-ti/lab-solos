# Checklist de completude das evidências

Aplicar aos [modelos de evidência](modelos-evidencias.md) para conferir os campos do [contrato documental](techspec.md#contratos-e-apis). A conferência usa o conteúdo da evidência e seus vínculos, independentemente da ferramenta em que for registrada.

## Conferência comum

- [ ] Identificar o artefato, sua versão e data, o alias do item ou conjunto e o recorte com a versão correspondente. Conferir se decisões, proposta, referência e evidências citadas correspondem ao mesmo item e às versões avaliadas.
- [ ] Verificar referência datada e versionada, origem, autor, responsável, revisor, data e estado da revisão.
- [ ] Conferir se a finalidade e o acesso estão registrados. O material compartilhável deve usar aliases e evidências pertinentes à finalidade. O vínculo com identificadores operacionais fica restrito aos perfis autorizados. Identificadores diretos dispensáveis e material de autenticação ficam fora do material compartilhável.
- [ ] Para cada campo obrigatório vazio, insuficiente ou incompatível, registrar o artefato, a versão, o campo afetado, a evidência ou decisão que falta, o responsável pela resolução ou a designação pendente e a versão a reavaliar. Campos condicionais podem ser marcados como inaplicáveis com justificativa.

Um campo obrigatório vazio sem encaminhamento é uma omissão documental. Uma pendência registrada documenta a lacuna, mas mantém o item pendente e preserva os registros. Uma proposta permanece pendente se faltar qualquer condição de prontidão. Comparativo sem evidência necessária permanece inconclusivo. Só encerrar um recorte como sem regularizações propostas após verificar a cobertura de contas e estoque e registrar a conclusão de forma explícita.

## Conferência por artefato

| Artefato | O que conferir | Se faltar |
| --- | --- | --- |
| Inventário de escopo | Período, categorias e itens incluídos, exclusões pertinentes, unidades, referência datada, fontes aceitas ou pendentes, critério de conflito, invariantes, responsáveis e cobertura da revisão. No recorte limpo, verificar a conclusão explícita com evidências de contas e estoque. | Distinguir a lacuna de recorte de uma lacuna na revisão ou nas evidências. Sem a conclusão, o encerramento está incompleto. |
| Decisão de conta | Alias, papel, tipo, estado, vínculo, decisão, justificativa, evidência e revisor. Registrar efeito esperado na proposta ou comprovação faltante na pendência. | Identificar o campo ausente e manter a decisão pendente até comprovação. |
| Decisão de estoque | Produto, lote ou relação, unidade, saldo registrado e de referência, comprovação de movimentos e resultado da conferência. Na divergência, verificar referência e correção esperada. Na pendência, verificar informação faltante e providência. | Sem unidade comparável ou comprovação suficiente, registrar a pendência e suspender a conclusão numérica aplicável. |
| Proposta e autorização | Itens, decisões, justificativa, efeito esperado, critérios de conferência, versão da referência, responsáveis e continuidade administrativa quando aplicável. Verificar revisão aprovada, cópia disponível e conferida, retorno validado e autorização específica para o recorte, a proposta e a referência nas versões em análise. Conferir identidade do autorizador, data, finalidade e ambiente. | Manter a proposta pendente e registrar cada condição ausente. Mudança de recorte, versão ou referência exige reavaliar a prontidão. A finalidade da autorização deve corresponder à atividade em avaliação. |
| Comparação e retorno | Por item, trilha até proposta, autorização, justificativa e autoria. Evidências do anterior, esperado, observado, diferenças residuais e externas ao recorte, condição e decisão de retorno, com autor e data. Quando houver retorno, conferir a evidência do estado restaurado contra a referência anterior. | Identificar o estado, a diferença ou a decisão sem comprovação. Estado restaurado sem evidência fica inconclusivo. Divergência após retorno exige registrar a falha e reavaliar. |
| Sinais | Para concessão de papel, divergência de estoque e falha em fluxo revisado, origem, condição, janela, periodicidade, responsável, destino, encaminhamento e resultado sintético aliado à evidência. | Identificar qual sinal tem condição, resultado ou encaminhamento incompleto. |

## Casos de verificação

Conferir cada caso isoladamente na matriz dos modelos. Para testar uma ausência, imaginar a remoção apenas do campo indicado e aplicar a linha correspondente da conferência, usando os demais campos da amostra. Os casos são testes documentais com aliases fictícios.

| Caso | Amostra ou variação sintética | Esperado | Observado |
| --- | --- | --- | --- |
| `FIC-VER-01` | Conferir `FIC-INV-A` e os registros `FIC-DEC-A1` e `FIC-DEC-A2`. | Encerramento com cobertura dos dois domínios, evidências e conclusão sem regularizações propostas. | As duas decisões correspondem às evidências citadas no inventário, que declara a conclusão. |
| `FIC-VER-02` | Retirar a conclusão explícita de `FIC-INV-A`. | Encerramento incompleto, ainda que as decisões estejam presentes. | Conclusão ausente no inventário. |
| `FIC-VER-03` | Retirar a versão da referência de `FIC-INV-A`. | Lacuna identificada em versão da referência. | Identificador e data remanescentes deixam a versão indeterminada. |
| `FIC-VER-04` | Conferir as decisões `FIC-DEC-A1`, `FIC-DEC-B1` e `FIC-DEC-B2`. | Conta confirmada, regularização proposta e pendência de comprovação de vínculo, respectivamente. | Os três estados constam na matriz. A pendência indica vínculo a comprovar, responsável e versão. |
| `FIC-VER-05` | Retirar a justificativa de `FIC-DEC-B1`. | Decisão pendente por justificativa ausente, com registro preservado. | Motivo da proposta ausente. A decisão fica pendente. |
| `FIC-VER-06` | Conferir `FIC-DEC-B3` e `FIC-DEC-B4`. | Diferença de 2 unidades no primeiro caso. No outro, pendência de unidade e comprovação do movimento, sem diferença numérica conclusiva. | A diferença de 10 e 8 é 2 unidades. Caixa e unidade ficam sem comparação até comprovar a conversão e o movimento. |
| `FIC-VER-07` | Retirar a evidência de movimento de `FIC-DEC-B3`. | Registrar movimento sem comprovação e manter a decisão pendente de evidência. | A declaração do movimento fica sem evidência e a decisão permanece pendente. |
| `FIC-VER-08` | Retirar o registro da revisão aprovada de `FIC-PROP-B` v1. | Proposta pendente por revisão ausente. | A proposta fica sem vínculo com a revisão aprovada. |
| `FIC-VER-09` | Retirar a comprovação de conferência da cópia em `FIC-PROP-B` v1. | Proposta pendente por cópia sem conferência comprovada. | A cópia continua declarada disponível e falta a conferência. |
| `FIC-VER-10` | Retirar a validação de retorno de `FIC-PROP-B` v1. | Proposta pendente por retorno sem validação. | A proposta fica sem evidência de validação da v1. |
| `FIC-VER-11` | Retirar a autorização de `FIC-PROP-B` v1. | Proposta pendente por autorização ausente. | O vínculo com a autorização específica fica ausente. |
| `FIC-VER-12` | Tentar vincular `FIC-AUT-B` de `FIC-PROP-B` v1 à versão v2. | Proposta v2 pendente por autorização incompatível e necessidade de reavaliar a prontidão. | A autorização cita a v1. A conferência da v2 permanece pendente. |
| `FIC-VER-13` | Usar `FIC-AUT-B` como autorização de uma proposta de finalidade operacional fictícia. | Autorização incompatível com a finalidade avaliada. | A finalidade registrada é ensaio em `FIC-AMBIENTE-TESTE`. |
| `FIC-VER-14` | Conferir `FIC-COMP-B` v1 e os estados de `FIC-CONTA-B`, `FIC-PRODUTO-B` e `FIC-CONTA-VIZ`. | Diferença residual de 1 unidade e alteração no entorno. Condição e decisão de retorno vinculadas às evidências e à autoria. Estados restaurados conferidos. | A diferença de 10 e 9 é 1 unidade. A permissão de entorno em `FIC-EV-VIZ3` aciona a condição associada a `FIC-DEC-RET`. Os três itens têm evidências do estado restaurado. |
| `FIC-VER-15` | Retirar `FIC-EV-VIZ4`, evidência do estado restaurado de `FIC-CONTA-VIZ`. | Retorno fica inconclusivo para a permissão de entorno. | A declaração de restauração da permissão fica sem evidência. |
| `FIC-VER-16` | Conferir `FIC-SINAL-PAPEL`, `FIC-SINAL-ESTOQUE` e `FIC-SINAL-FALHA`. | Cada sinal associa origem, condição e resultado ao destinatário e à evidência correspondente. | Contas, estoque e retorno recebem os respectivos sinais na matriz, com evidências `FIC-EV-S1`, `FIC-EV-S2` e `FIC-EV-S3`. |
| `FIC-VER-17` | Retirar a fila de destino de `FIC-SINAL-FALHA`. | Sinal com encaminhamento incompleto por falta de destino. | O responsável está identificado e o encaminhamento carece de destino. |
| `FIC-VER-18` | Imaginar a inclusão de `FIC-MAPA-BETA`, referência fictícia à correspondência restrita de aliases, no comparativo compartilhável. | Material inadequado para compartilhamento, pois expõe uma referência com finalidade restrita. | A referência proposta está fora da finalidade do comparativo compartilhável. |
| `FIC-VER-19` | Conferir as pendências de fonte e acesso de `FIC-INV-B` e de autorização de `FIC-PROP-B` v2. | Decisões em aberto ficam visíveis com encaminhamento e versão a reavaliar. | O inventário indica responsáveis a designar e revisão da v1. A proposta atribui a reavaliação da v2 a `FIC-REVISOR`. |
