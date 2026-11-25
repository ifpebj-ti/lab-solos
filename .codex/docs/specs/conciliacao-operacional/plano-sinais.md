# Plano sintético de sinais da conciliação operacional

Entrega documental de T007, issue #470, para RF-006, RNF-001/RNF-002 e CA-007/CA-008. Aplicar o [cabeçalho comum e o modelo de sinais](modelos-evidencias.md#sinais), o [contrato de acesso e retenção de T005](contrato-acesso-e-evidencias.md#retenção-e-encerramento) e os [protocolos documentais sintéticos aprovados](../decisoes-de-planejamento.md#pré-requisitos-operacionais).

| Cabeçalho comum | Valor sintético |
| --- | --- |
| Artefato e revisão | `FIC-PLANO-SINAIS` v1, revisão documental de 2030-05-06. |
| Recorte e janela de observação | `FIC-RECORTE-SINAIS` v1; corte comum `T0 = 2030-05-06T00:00:00Z`. Os instantes abaixo são UTC e fictícios. |
| Referências e evidências | Eventos, registros, produto, movimentos, fila e resultados são identificados somente por aliases `FIC-*`; os identificadores operacionais, se algum dia forem necessários, pertencem a mapa restrito separado. |
| Autoria e revisão | Papéis documentais `FIC-OPERADOR` e `FIC-REVISOR`, distintos; destinatários são papéis, sem nomes ou identidades inventadas. |
| Acesso e finalidade | Exercitar por revisão documental a identificação e o encaminhamento de sinais em cenário sintético. Evidência restrita de exemplo; a projeção compartilhável usa aliases e campos mínimos. |
| Pendências operacionais | Preenchimento de destinatários nominais, calendário de dias úteis, local de evidência, concessões de acesso e autorização continuam pendentes para qualquer uso real. |

## Fontes observáveis e limites

- **Concessão de conta.** O catálogo define `concessao_conta` como trilha obrigatória em [AuditoriaEventCatalog.cs](../../../../backend/LabSolos-Server-DotNet8/Services/AuditoriaEventCatalog.cs). A concessão administrativa em [UsuariosController.cs](../../../../backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs) registra esse evento antes do commit. O sinal usa a ocorrência persistida e a referência sanitizada do alvo; uma captura de estado atual, sozinha, não prova a origem histórica da concessão, conforme o [protocolo T002](protocolo-inventario-contas.md).
- **Saldo e movimentos comprovados.** [`Produto.cs`](../../../../backend/LabSolos-Server-DotNet8/Models/Produto.cs) fornece `Quantidade` e `UnidadeMedida`; [`MovimentacaoEstoque.cs`](../../../../backend/LabSolos-Server-DotNet8/Models/MovimentacaoEstoque.cs) registra quantidade, instante, tipo e vínculos. [LoanDecisionService.cs](../../../../backend/LabSolos-Server-DotNet8/Services/LoanDecisionService.cs) registra saída por empréstimo; [LoanReturnService.cs](../../../../backend/LabSolos-Server-DotNet8/Services/LoanReturnService.cs) registra devolução; [ProductEffectiveOutflowQuery.cs](../../../../backend/LabSolos-Server-DotNet8/Services/ProductEffectiveOutflowQuery.cs) consulta movimentos duráveis e identifica lacunas em aprovações legadas sem instante comprovável. Comparar somente unidades compatíveis e movimentos sustentados por evidência. A regra [ProductStockAlertRule.cs](../../../../backend/LabSolos-Server-DotNet8/Services/ProductStockAlertRule.cs) verifica estoque abaixo do mínimo; ela não detecta, por si, diferença contra uma referência de conciliação.
- **Falha de fluxo revisado.** [AuditoriaMiddleware.cs](../../../../backend/LabSolos-Server-DotNet8/Middlewares/AuditoriaMiddleware.cs) registra `falha_operacao` para exceção no pipeline ou resposta HTTP 500 ou superior. O catálogo classifica o evento como diagnóstico operacional. Uma negação 401/403 sem identidade válida usa `tentativa_sem_identidade_valida`, não este sinal; o plano não trata qualquer resposta 4xx como falha do fluxo.

Essas fontes de domínio e auditoria sustentam o cenário documental. A tabela de encaminhamento abaixo é o padrão aprovado localmente para revisão sintética; não há fila, notificação, destinatário ou monitoramento operacional configurado. A conferência não executa nem envia eventos.

## Matriz dos sinais

### Concessão de papel privilegiado

| Campo | Registro sintético |
| --- | --- |
| Alias e fonte | Sinal `FIC-SINAL-CONTA-01`, evento `FIC-EVT-CONTA-01`, conta `FIC-CONTA-B`. Fonte: evento persistido `concessao_conta` do fluxo de concessão. |
| Condição | Cada ocorrência de concessão de papel no recorte revisado gera um item de revisão; vincular evento, alias da conta, referência e versão do recorte. Se a trilha ou a autoria necessária faltar, registrar pendência e preservar o estado observado. |
| Janela e periodicidade | Observar a partir do evento até a revisão, com encaminhamento para análise até o próximo dia útil. Acionamento por evento; a revisão não espera a conferência diária. |
| Destinatário e rota | Papel **Responsável por contas**. Rota documental simulada: `FIC-FILA-DOCUMENTAL-SINAIS`, com acesso restrito ao caso sintético e ao mínimo de evidência pertinente. |
| Resultado esperado | O caso aparece como recebido e pendente de revisão por `FIC-REVISOR`; a revisão ocorre até o próximo dia útil, registra decisão e autoria por papel e mantém a correspondência operacional fora do material compartilhável. Nenhuma alteração é autorizada por este sinal. |
| Evidência e retenção | Trilha obrigatória `concessao_conta`: 365 dias conforme catálogo. Caso e evidência restrita da conciliação: 365 dias após o encerramento registrado do recorte, segundo T005. |

### Divergência de estoque contra movimentos comprovados

| Campo | Registro sintético |
| --- | --- |
| Alias e fonte | Sinal `FIC-SINAL-ESTOQUE-01`, conferência `FIC-CHECK-ESTOQUE-01`, produto `FIC-PRODUTO-B`. Referência inicial `FIC-SALDO-BASE-01` = 10 unidades em `T0`; saída de 2 unidades comprovada por `FIC-MOV-SAIDA-01` às 10:30 UTC; conferência diária `FIC-CHECK-ESTOQUE-01` às 12:00 UTC registra `FIC-SALDO-OBS-01` = 7 unidades. Saldo esperado = 8 unidades, diferença de −1 unidade. A unidade é a mesma em todas as referências. |
| Condição | Acionar se o saldo observado de `Produto` diferir do saldo esperado a partir da referência aceita e dos movimentos efetivamente comprovados no mesmo corte e unidade. Se houver movimento sem prova, unidade incompatível ou lacuna de histórico, encaminhar como falta de rastreabilidade/pendência, sem inferir um saldo numérico. |
| Janela e periodicidade | Comparar após cada mudança de estoque e novamente na conferência diária às 12:00 UTC. Cada janela liga o saldo de referência no corte comum às movimentações comprovadas até a observação. |
| Destinatário e rota | Papel **Responsável pelo estoque**. Encaminhar a diferença ou a lacuna à `FIC-FILA-DOCUMENTAL-SINAIS` assim que a conferência sintética a identificar. |
| Resultado esperado | `FIC-CHECK-ESTOQUE-01` mostra 8 esperadas contra 7 observadas, diferença −1, e fica pendente de revisão. A fila contém o alias, a referência e a evidência mínima; nenhum saldo é corrigido automaticamente. |
| Evidência e retenção | Referências dos movimentos comprovados, comparativo e decisão ficam na evidência restrita do recorte por 365 dias após seu encerramento registrado, conforme T005. Uma lacuna sem comprovação permanece pendente e é descrita sem expor identificadores diretos no material compartilhável. |

### Falha em fluxo revisado

| Campo | Registro sintético |
| --- | --- |
| Alias e fonte | Sinal `FIC-SINAL-FALHA-01`, fluxo revisado `FIC-FLUXO-RETORNO-01`, evento `FIC-EVT-FALHA-01`, correlação `FIC-CORRELACAO-01`. Fonte: `falha_operacao` registrada para exceção no pipeline ou resposta 500 ou superior durante o fluxo revisado. |
| Condição | Cada evento de falha associado ao fluxo revisado gera análise. Falta do diagnóstico ou da correlação necessária mantém a análise inconclusiva; não substituir o evento por uma inferência de estado. |
| Janela e periodicidade | Acionamento por evento. Encaminhar ao responsável do fluxo em até uma hora. Se não houver reconhecimento dentro de quatro horas úteis, escalar ao autorizador operacional. O calendário que define horas úteis precisa ser indicado antes de uso real. |
| Destinatário e rota | Primeiro, papel **Responsável pelo fluxo afetado**; após quatro horas úteis sem reconhecimento, papel **Autorizador operacional**. Ambos são representados na rota documental restrita `FIC-FILA-DOCUMENTAL-SINAIS`, com o histórico de encaminhamento por alias. |
| Resultado esperado | O caso sintético é encaminhado ao responsável do fluxo dentro de uma hora e permanece sem reconhecimento; ao completar quatro horas úteis sem reconhecimento, a matriz registra a escalada ao autorizador. Essa verificação confirma a regra documental, não uma notificação efetivamente entregue. |
| Evidência e retenção | O diagnóstico `falha_operacao` tem retenção de 30 dias desde seu registro. Preservar no pacote restrito do recorte, por 365 dias após o encerramento, somente resultado, alias e correlação mínimos necessários à trilha, conforme T005. |

## Verificação documental de T007

**RED.** Antes da edição, `plano-sinais.md` não existia; a verificação de presença falhou e nenhum dos três sinais podia ser conferido.

**GREEN.** Revisão sintética de `FIC-SINAL-CONTA-01`, `FIC-SINAL-ESTOQUE-01` e `FIC-SINAL-FALHA-01`: os três casos identificam fonte, condição, janela, periodicidade, papel destinatário, rota, resultado esperado e aliases. O caso de estoque distingue diferença comprovada de falta de evidência; a falha usa o evento e o limite de reconhecimento aprovados; a concessão chega ao papel de contas até o próximo dia útil. Resultado documental: 3/3 rotas correspondem à decisão local e não propõem ajuste automático.

**REFACTOR.** Os três encaminhamentos usam o mesmo alias de fila documental restrita, mantendo a atribuição por papel e a escalada exclusiva do fluxo com falha. Retenções foram consolidadas com T005: 365 dias para evidência restrita após encerramento do recorte e 30 dias para diagnóstico desde o registro. A fila e os papéis continuam padrões locais para cenários sintéticos; destinatários reais, calendário, armazenamento e integrações não estão configurados.
