# Contrato de acesso e proteção das evidências de conciliação

Entrega documental de T005, #470, para RF-004/RF-005, RNF-001/RNF-002 e CA-005/CA-006/CA-008 do [PRD](prd.md). Aplicar o [cabeçalho comum](modelos-evidencias.md) e o [checklist de completude](checklist-completude.md), com a [decisão de acesso e guarda sintéticos](../decisoes-de-planejamento.md#pré-requisitos-operacionais).

## Identidade, integridade e cadeia de referência

Cada artefato tem identificador, versão, recorte e versão do recorte, corte comum `T0` em UTC, finalidade, origem, autor, momento e classificação de acesso. O manifesto relaciona o artefato aos hashes SHA-256 dos arquivos que constituem aquela versão, com tamanho em bytes e codificação quando for texto. A cópia aprovada e seu manifesto são imutáveis. Uma correção produz nova versão ligada à anterior, com motivo e revisão próprios.

O operador calcula os hashes sobre os bytes efetivamente preservados. O revisor recalcula os hashes após obter a evidência pelo acesso pertinente e registra a conferência, sua autoria e momento em artefato separado. A autorização de prontidão identifica as versões exatas do recorte, da proposta, da cópia e do manifesto. Uma mudança em qualquer uma dessas versões exige nova conferência de prontidão.

SHA-256 comprova que os bytes conferidos correspondem à referência preservada. A origem aceita, a autoria e a justificativa da decisão dependem das evidências e da revisão associadas. A captura do banco sustenta o estado observado em `T0`; a trilha durável comprova alterações a partir da implantação e cobertura documentadas. Registrar lacunas de período ou origem como pendências.

| Estado do comparativo | Referências exigidas |
| --- | --- |
| Anterior | Cópia aprovada, versão, manifesto, hash, corte `T0`, esquema e recorte. |
| Esperado | Versão da proposta, justificativa e evidência por alias, revisão e autorização específica. |
| Observado | Artefato produzido pelo ensaio autorizado, versão, hash, autoria, momento e diferença contra o esperado. |
| Restaurado | Decisão e condição de retorno, referência anterior exata, autoria da restauração e artefato conferido com seu hash. |

Vincular esses quatro estados ao mesmo item e ao mesmo recorte, mantendo as diferenças residuais e externas ao escopo. Um estado restaurado com conteúdo diferente da referência anterior fica inconclusivo e gera pendência de retorno. Preservar as versões anteriores e as respectivas conferências até a retenção aplicável.

## Matriz de leitura e escrita por papel

Os papéis abaixo representam o contrato a configurar no destino operacional. Cada acesso tem identidade nominal, finalidade, escopo, concessor, início e término documentados. Operador e revisor são distintos. A acumulação de outra função exige registro explícito da autoridade e preservação da revisão independente.

| Material | Operador | Revisor | Autorizador operacional | Custodiante | Avaliador do material compartilhável |
| --- | --- | --- | --- | --- | --- |
| Cópia sanitizada de referência e manifesto | Prepara versão nova antes da aprovação e lê a versão aprovada. | Lê, confere e registra resultado em artefato separado. | Lê as evidências pertinentes à prontidão. | Administra armazenamento e permissões de guarda. | Consulta somente a projeção compartilhável aprovada. |
| Proposta e comparativos restritos | Produz novas versões e lê as necessárias ao ensaio. | Lê e acrescenta revisão com autoria. | Lê e acrescenta a decisão de autorização para versões específicas. | Administra guarda e concessões de acesso documentadas. | Consulta a projeção compartilhável aprovada. |
| Mapa restrito entre alias e identificador operacional | Solicita ao custodiante somente a associação necessária ao escopo autorizado. | Solicita a associação necessária à revisão autorizada. | Consulta associação quando necessária à decisão e expressamente autorizada. | Cria, mantém versões e concede acesso nominal por finalidade. | Acesso vedado. |
| Evidência compartilhável aprovada | Prepara nova projeção com aliases. | Confere sanitização e vínculo com a referência. | Aprova a disponibilização ao perfil destinado à avaliação. | Mantém a versão e administra o acesso concedido. | Lê a versão aprovada no escopo concedido. Escrita vedada. |
| Diagnóstico de falha | Registra o diagnóstico mínimo da própria atividade e lê o necessário ao tratamento. | Lê o diagnóstico pertinente à conferência. | Lê o diagnóstico pertinente à decisão operacional. | Administra acesso e expiração. | Consulta somente o resultado sanitizado aprovado. |

Depois da aprovação, a escrita ocorre por nova versão ou por novo registro de revisão. Acesso de outra pessoa ou a outro recorte exige concessão própria. Registrar tentativas de acesso vedado e encaminhar falhas de permissão ao custodiante, usando correlação e aliases no diagnóstico compartilhável.

## Material restrito e material compartilhável

A evidência restrita pode conter o identificador operacional mínimo que permita localizar e conferir o registro, junto da finalidade, concessão de acesso, referência e autoria necessárias. O mapa de aliases tem guarda e acesso próprios. Senhas, tokens, cookies e material de autenticação ficam excluídos da coleta documental e da cópia sanitizada.

A projeção compartilhável contém recorte e versão, aliases, campos de domínio necessários à conferência, referência da evidência sanitizada, resultado esperado e observado, diferenças, autoria por papel sintético e momento da revisão. O manifesto restrito liga essa projeção e seu hash aos artefatos de origem. A projeção pública omite identificadores diretos, caminhos de armazenamento restrito e associações do mapa de aliases.

Os exemplos deste arquivo usam aliases e conteúdos inventados e podem ser versionados na pasta local de especificações. A evidência operacional real exige um repositório restrito definido pela equipe, com localização, permissões nominais, controles de imutabilidade, retenção e autorização específica anteriores à coleta. Essa configuração externa permanece um campo a preencher no cabeçalho operacional.

## Retenção e encerramento

| Classe | Prazo e marco | Conferência ao encerrar |
| --- | --- | --- |
| Evidência restrita, cópia, manifesto, mapa e decisões de conciliação | 365 dias após o encerramento registrado do recorte. | Registrar encerramento, vencimento, responsável de custódia e destinação autorizada de todas as versões relacionadas. |
| Diagnóstico operacional | 30 dias a partir do registro do diagnóstico. | Registrar expiração e descarte pelo custodiante segundo a política aprovada. Preservar na evidência principal o resultado e a correlação mínimos necessários à trilha. |

Documentar a retenção da projeção compartilhável no termo de disponibilização e vinculá-la à evidência que sustenta a avaliação. Ao retirar acesso ou expirar material, registrar a condição e a localização de consulta remanescente autorizada. Referência indisponível depois da expiração é identificada como tal, com data e classe de retenção. Evidência ausente durante a conferência mantém o resultado dependente dela como pendente ou inconclusivo.

## Amostra restrita inteiramente sintética

O pacote fictício `FIC-PACOTE-RESTRITO` v1, do recorte `FIC-ACESSO-v1`, registra `T0 = 2030-05-01T00:00:00Z`. O mapa de exemplo `FIC-MAPA` v1 associa `FIC-CONTA-X` ao identificador inventado `ID-SINTETICO-101`. O papel `FIC-CUSTODIA` administra esse mapa. A concessão fictícia `FIC-ACESSO-OPERADOR` v1 permite ao papel `FIC-OPERADOR` consultar essa associação para preparar o ensaio de contas. `FIC-REVISOR`, distinto do operador, recebe a concessão fictícia de conferência `FIC-ACESSO-REVISOR` v1 para esse mesmo recorte. A autorização fictícia `FIC-AUTORIZACAO` v1 aponta somente para o ensaio em ambiente sintético.

O pacote inclui cópia sanitizada, manifesto e registros de proposta, conferência e retorno. A lista restrita relaciona as versões à referência de origem. Os quatro documentos sanitizados abaixo são conteúdos de exemplo de uma única linha JSON em UTF-8 sem BOM e sem quebra final. Os hashes foram calculados localmente sobre esses bytes.

```json
{"artefato":"FIC-ANTERIOR","recorte":"FIC-ACESSO-v1","corte":"2030-05-01T00:00:00Z","conta":"FIC-CONTA-X","papel":"Mentor","estado":"Habilitado"}
{"artefato":"FIC-ESPERADO","recorte":"FIC-ACESSO-v1","corte":"2030-05-01T00:00:00Z","conta":"FIC-CONTA-X","papel":"Mentor","estado":"Desabilitado"}
{"artefato":"FIC-OBSERVADO","recorte":"FIC-ACESSO-v1","corte":"2030-05-01T00:00:00Z","conta":"FIC-CONTA-X","papel":"Mentor","estado":"Desabilitado"}
{"artefato":"FIC-RESTAURADO","recorte":"FIC-ACESSO-v1","corte":"2030-05-01T00:00:00Z","conta":"FIC-CONTA-X","papel":"Mentor","estado":"Habilitado"}
```

| Artefato da amostra, todos v1 | SHA-256 dos bytes da respectiva linha |
| --- | --- |
| `FIC-ANTERIOR` | `6e8801b5a15f0c27aef8144e9f1832162c28e518a6ce9c856ffe815e8bb96c27` |
| `FIC-ESPERADO` | `2bb4dfd8da0d6d1d3662eb267088d318d22e66ef485a7979c31f5a24bd753ba3` |
| `FIC-OBSERVADO` | `d479b3f075090e0b0d9b00bfbd623f2215a66fa361d31f80634abce0044b78b9` |
| `FIC-RESTAURADO` | `5f584eaacff5ff86badd3a2b69b6a8bb469c620990fd818d22edccd4e803dda3` |

Os hashes dos documentos anterior e restaurado diferem porque seus identificadores de artefato diferem. A conferência de retorno compara os campos de domínio da conta, o recorte e a referência aprovada, além de validar separadamente o hash de cada artefato. Nessa amostra, os estados de domínio anterior e restaurado coincidem.

## Amostra compartilhável e decisões de acesso

| Campo compartilhável | Conteúdo sintético aprovado para a amostra |
| --- | --- |
| Comparativo | `FIC-COMPARATIVO` v1, recorte `FIC-ACESSO-v1`, corte `T0`. |
| Item | `FIC-CONTA-X`. |
| Referências e revisão | Quatro aliases de artefato e hashes da tabela anterior. Conferência por `FIC-REVISOR` em `2030-05-02T10:00:00Z`, vinculada à proposta `FIC-PROPOSTA` v1. |
| Resultado | Estado anterior Habilitado. Esperado e observado Desabilitado. Estado restaurado Habilitado, com campos de domínio conferidos contra a referência anterior. |
| Decisão de retorno | `FIC-RETORNO` v1 referencia a condição fictícia de ensaio e a autorização `FIC-AUTORIZACAO` v1. |
| Identificação operacional | Correspondência guardada no mapa restrito. O comparativo compartilhável contém somente o alias. |

| Caso documental CA-008 | Solicitação sintética | Resultado esperado e verificado contra a matriz |
| --- | --- | --- |
| `FIC-AC-01` | Operador com concessão de leitura para `FIC-ACESSO-v1` pede a cópia aprovada. | Leitura permitida da versão e hashes concedidos. A escrita da versão aprovada é vedada. |
| `FIC-AC-02` | Revisor com concessão pertinente lê a evidência e registra a conferência. | Leitura permitida e revisão em novo artefato com autoria. |
| `FIC-AC-03` | Avaliador autorizado consulta `FIC-COMPARATIVO` v1. | Leitura permitida da amostra compartilhável, com vínculo suficiente para comparar estados. |
| `FIC-AC-04` | Mesmo avaliador solicita `FIC-MAPA` v1 ou alteração no comparativo. | Leitura do mapa e escrita vedadas. Encaminhar a solicitação ao custodiante. |
| `FIC-AC-05` | Operador de outro recorte solicita a referência de `FIC-ACESSO-v1`. | Leitura vedada enquanto faltar concessão própria para o recorte. |
| `FIC-AC-06` | Conferência obtém bytes com SHA-256 diferente do manifesto aprovado. | Integridade não confirmada. Preservar a referência aprovada e registrar pendência de versão com o operador e o revisor. |
| `FIC-AC-07` | Comparativo cita referência ausente ou sem versão. | Comparação inconclusiva. Identificar alias, versão, campo e fonte faltantes, papel encarregado e revisão a reavaliar. |
| `FIC-AC-08` | Projeção compartilhável inclui o identificador interno ou omite o alias da referência restaurada. | Solicitar nova projeção sanitizada no primeiro caso e registrar vínculo insuficiente no segundo. Manter a disponibilização pendente de revisão. |
| `FIC-AC-09` | Pacote restrito chega a 365 dias após encerramento, ou diagnóstico a 30 dias do registro. | Custodiante aplica a destinação aprovada e registra a expiração e a referência afetada. |

A conferência desta tarefa valida a matriz documental e os dois tipos de amostra. O teste de permissões efetivamente configuradas no repositório restrito e a identificação nominal dos papéis integram a preparação do ambiente operacional. O RED inicial constatou a ausência deste contrato. O GREEN confere os vínculos, a segregação de acesso e a integridade calculável da amostra.
