# Conferência sintética de vínculos de lotes

- **Tarefa** — Integridade de produtos e lotes T010
- **Versão do roteiro** — 1
- **Estado** — Modelo local e exercício sintético concluídos; conferência de dados reais bloqueada
- **Finalidade** — Preparar uma revisão somente leitura de vínculos entre produtos e lotes, registrar evidências e encaminhar lacunas à [Conciliação operacional](../conciliacao-operacional/prd.md)

## Limite desta entrega

Este documento fornece um formulário, uma checklist e um exemplo inteiramente sintético. Não consultei banco, inventário, arquivos operacionais ou fontes externas; os aliases, códigos, linhas JSON, datas e hashes de exemplo são inventados. Eles não descrevem registros do LabSolos.

A conferência real permanece bloqueada até que a operação identifique e aprove **a fonte de referência**, **o recorte temporal e material** e **o responsável operacional nominal**. Também devem ser designados operador, revisor independente, autorizador e custodiante, com acesso e guarda autorizados. Quando essas condições existirem, a conferência continua somente leitura. Este roteiro não autoriza corrigir, criar ou remover vínculos, alterar quantidades, preencher dados históricos ou executar migrações.

## Referências de domínio

D3 mantém a relação corrente existente: um produto pode estar associado a zero ou um lote, e um lote pode estar associado a vários produtos. O vínculo corrente e o código do lote são registrados por `Produto.LoteId` e `Lote.CodigoLote`; o código normalizado aplica espaços aparados e comparação sem diferença entre maiúsculas e minúsculas. Essa relação representa o estado corrente observado, não prova por si só qual lote estava associado a um evento antigo.

Para uma saída histórica, usar o lote persistido no próprio movimento (`SaidaEmprestimo`) ou outra fonte aceita da época que identifique o vínculo. O lote corrente do produto nunca substitui o lote do evento. Uma aprovação e seu timestamp podem comprovar a saída antiga quando gravados juntos; sem fonte contemporânea que identifique o lote, o lote histórico permanece sem comprovação e segue para conciliação. A quantidade do produto não deve ser recalculada ou modificada durante a conferência.

Referências locais para orientar a leitura do esquema e das invariantes:

- [D3 e regras de lote](../decisoes-de-planejamento.md#empréstimos-e-integridade)
- [Modelo Produto](../../../../backend/LabSolos-Server-DotNet8/Models/Produto.cs), [modelo Lote](../../../../backend/LabSolos-Server-DotNet8/Models/Lote.cs) e [relacionamentos do AppDbContext](../../../../backend/LabSolos-Server-DotNet8/Data/Context/AppDbContext.cs)
- [Movimento durável](../../../../backend/LabSolos-Server-DotNet8/Models/MovimentacaoEstoque.cs) e [consulta interna de saídas efetivas](../../../../backend/LabSolos-Server-DotNet8/Services/ProductEffectiveOutflowQuery.cs)
- [Contrato de acesso e evidências](../conciliacao-operacional/contrato-acesso-e-evidencias.md), [modelos de evidência](../conciliacao-operacional/modelos-evidencias.md) e [checklist de completude](../conciliacao-operacional/checklist-completude.md)

Esses arquivos descrevem o contrato local. Não são evidência de um vínculo operacional específico.

## Cabeçalho do recorte

Preencher antes de solicitar ou abrir qualquer fonte operacional. Um mesmo `T0` em UTC deve ser usado em todas as fontes comparadas; declarar as janelas que não chegam a esse corte e não presumir equivalência temporal.

| Campo | Preenchimento |
|---|---|
| Artefato e versão | `FIC-...` em exemplos; identificador e versão a designar para uma conferência autorizada |
| Recorte e versão | Produtos, lotes, tipos, intervalo histórico, inclusões e exclusões explícitos |
| Corte comum `T0` | Instante UTC do estado a comparar; a operação ainda deve escolher o corte real |
| Finalidade | Conferência somente leitura de vínculos e encaminhamento de lacunas |
| Fontes e aceitação | Alias, versão, data de extração, cobertura temporal, origem aceita ou pendente e responsável pela aceitação |
| Esquema e invariantes | Versão do esquema de cada fonte e versão das regras de lote usadas na comparação |
| Autoria por papel | `FIC-OPERADOR`, `FIC-REVISOR`, `FIC-AUTORIZADOR` e `FIC-CUSTODIA` são aliases genéricos sintéticos; nomes e concessões reais continuam pendentes |
| Independência | Operador e revisor são pessoas distintas; qualquer acumulação de papel requer autoridade registrada e revisão independente |
| Local e acesso | Alias do repositório restrito, finalidade, concessor, perfis, datas de início/fim e condição de guarda; localização operacional real pendente |
| Revisão | Revisor, instante, resultado, versões conferidas e próxima revisão necessária |

## Registro por produto ou vínculo

Duplicar uma linha por produto e por vínculo questionado. Identificadores operacionais ficam apenas na evidência restrita autorizada; o registro compartilhável usa aliases.

| Campo | Registro |
|---|---|
| Alias do caso | `FIC-PRODUTO-...` e, se aplicável, `FIC-LOTE-...` |
| Referência corrente | Alias do produto, valor de `LoteId` observado em `T0`, alias/código de lote e fonte/esquema que produziram a observação |
| Referência histórica | Data/instante do evento, movimento ou decisão de saída, lote associado no evento e fonte contemporânea que sustenta essa associação |
| Evidência | Alias da evidência, caminho/URI no repositório autorizado, versão, hash SHA-256, tamanho em bytes e formato/codificação |
| Cobertura | Janela coberta pela fonte, lacunas de período, filtro aplicado e itens do recorte efetivamente examinados |
| Comparação | Estado esperado segundo cada fonte aceita, estado observado, diferenças e resultado da checagem do código normalizado |
| Classificação | `comprovado`, `ausente` ou `inconsistente`, com justificativa restrita ao recorte e às fontes identificadas |
| Pendência | Campo ou decisão faltante; evidência necessária; designação do responsável ou papel ainda pendente; versão que deve ser reavaliada |
| Encaminhamento | Alias do caso/artefato de conciliação, questão objetiva a resolver, referências e estado de recebimento |
| Revisão | Alias do operador, revisor distinto, datas, resultado da revisão do hash e decisão de classificação |

O hash comprova igualdade dos bytes preservados com os bytes conferidos; não autentica a origem, a autoria nem a interpretação do conteúdo. O operador registra o hash sobre os bytes originais preservados. O revisor recalcula sobre a cópia obtida por acesso autorizado e registra o resultado em artefato separado. Divergência de hash suspende a classificação conclusiva.

Para arquivos reais, registrar o caminho/URI apenas na evidência restrita. No material compartilhável, registrar o alias e o hash, sem identificadores diretos, endereços restritos ou associação do mapa de aliases. Evidência real exige repositório restrito, acesso nominal, imutabilidade, retenção e autorização específica antes da coleta. O contrato local prevê guarda de evidência por 365 dias após o encerramento do recorte e de diagnósticos por 30 dias; a operação deve confirmar a aplicação no seu ambiente.

## Critérios de classificação

- **Comprovado** — fontes aceitas e temporalmente pertinentes identificam o mesmo produto e lote no corte ou evento revisado. Registrar fonte, versão, hash, cobertura e a associação examinada. Para lote histórico, uma associação corrente em `Produto.LoteId` não substitui a fonte da época.
- **Ausente** — fonte aceita com cobertura adequada afirma que não há vínculo para o item no recorte e período declarados. A conclusão não se estende a períodos, fontes ou itens fora da cobertura. Um campo vazio em fonte incompleta não basta para concluir ausência.
- **Inconsistente** — fontes aceitas divergem sobre produto, lote, código, momento ou relação, ou o valor observado viola uma invariante confirmada. Preservar todas as alternativas, versões e hashes; não escolher uma, inferir a correta ou alterar o registro.

Se a cobertura, origem ou temporalidade não permitir aplicar uma dessas categorias, manter a **revisão pendente por evidência insuficiente**, registrar exatamente o que falta e encaminhar à conciliação. Não converter incerteza em “ausente” nem esconder a pendência dentro de uma classificação conclusiva.

## Checklist somente leitura

1. **Fixar recorte e corte.** Registrar versão, `T0` UTC comum, itens, tipos, janela histórica, exclusões, unidades e esquemas. Fontes que não representem o mesmo corte recebem janela própria e limitação explícita.
2. **Confirmar autoridade.** Verificar fonte aceita, permissão de leitura, finalidade e responsáveis nominais. Manter operador e revisor distintos. Sem fonte, recorte ou responsável operacional aprovado, não iniciar conferência real.
3. **Preservar a evidência.** Obter cópia somente leitura conforme a autorização, registrar alias/caminho restrito, versão, data, tamanho, formato e SHA-256. Pedir ao revisor para recalcular o hash por acesso independente.
4. **Comparar o vínculo corrente.** Para cada produto, observar `LoteId`, existência do lote e código. Comparar a forma normalizada (`trim` nas pontas e sem distinção de caixa) sem alterar os valores de origem. Registrar referências duplicadas, ausentes ou conflitantes.
5. **Comparar o histórico quando houver saída.** Confirmar a saída por movimento durável `SaidaEmprestimo` ou por decisão e timestamp de aprovação gravados juntos, conforme D3. Exibir vínculo de lote histórico somente se uma fonte da época o identificar. Se houver apenas lote corrente ou texto inferido, registrar lacuna.
6. **Classificar e revisar.** Atribuir comprovado, ausente ou inconsistente somente nos termos acima. Para cada divergência ou insuficiência, ligar a conclusão a um alias e hash; o revisor registra a conferência independentemente.
7. **Encaminhar lacunas.** Abrir registro para conciliação com o alias do item, recorte/versão, `T0`, referências, hashes, evidência faltante e pergunta a decidir. Preservar o estado original e não propor correção sem evidência e autorização separadas.
8. **Fechar apenas o recorte coberto.** Registrar itens examinados, itens excluídos, limites de cobertura e resultado. Se faltar fonte ou revisão de qualquer item, a conclusão geral permanece pendente.

## Resultado mínimo consumível por Conciliação

O encaminhamento é um registro documental por caso, com aliases e referências suficientes para localizar a evidência restrita e reavaliar a conclusão sem receber dados diretos nem uma proposta de correção. Ele não cria fila, integração ou destinatário operacional; esses recursos e os responsáveis nominais seguem pendentes de configuração. As fontes citadas são aceitas somente dentro do cenário sintético; isso não designa aceitação operacional. Os exemplos não representam chamados reais.

| Campo obrigatório | Conteúdo mínimo |
|---|---|
| Identificação e recorte | Alias do caso e artefato/versão, recorte/versão, produto e lote por alias, corte T0 e período coberto. |
| Resultado | Classificação comprovado, ausente ou inconsistente; se a fonte não permitir concluir, pendente por evidência insuficiente. |
| Fontes | Alias, versão, cobertura temporal, estado de aceitação, alias/hash da evidência e papel que conferiu o hash. Caminhos restritos e mapa de aliases permanecem fora da projeção compartilhável. |
| Comparação | Vínculo esperado segundo cada fonte e vínculo observado no inventário ou evento, com a diferença literal e sem substituir o lote histórico pelo lote corrente. |
| Autoria e revisão | Aliases do operador e do revisor distinto, instante UTC e resultado da conferência; designações nominais ficam pendentes para uso operacional. |
| Questão e pendência | O que Conciliação precisa decidir ou qual evidência falta, papel responsável a designar e versão a reavaliar. |
| Encaminhamento | Alias de referência do caso, papel/destino a configurar e estado: não encaminhar quando não houver lacuna, ou encaminhar para análise quando houver ausência a decidir ou fontes em conflito. Nenhuma alteração de inventário é proposta. |

Aplicação sintética do contrato:

| Caso | Fontes de referência | Resultado mínimo para Conciliação | Encaminhamento |
|---|---|---|---|
| FIC-CASO-A | FIC-REF-A v1 cobre o estado no T0; FIC-DOC-A v1, contemporâneo ao corte, identifica o mesmo lote. Evidência FIC-EV-T010-A e hash abaixo. | Produto FIC-PRODUTO-A associado a FIC-LOTE-A nas duas fontes; vínculo comprovado no recorte FIC-LOTES-v1. | Não encaminhar: não há lacuna neste recorte. Manter o resultado e as referências no registro da conferência. |
| FIC-CASO-B | FIC-REF-B v1 cobre o produto B no T0 e declara vínculo ausente. Evidência FIC-EV-T010-B e hash abaixo. | Produto FIC-PRODUTO-B sem lote na fonte coberta; vínculo ausente no período e escopo declarados. A evidência não conclui sobre períodos fora da cobertura. | Encaminhar como FIC-ENC-T010-B para distinguir uma ausência permitida por D3 de uma lacuna de rastreabilidade e avaliar se há outra fonte/período a conferir. Pergunta aberta; sem proposta de vínculo ou regularização. |
| FIC-CASO-C | FIC-REF-C v1 aponta FIC-LOTE-C; FIC-DOC-C v1, contemporâneo ao corte, aponta FIC-LOTE-D. Evidência FIC-EV-T010-C e hash abaixo. | Fontes em conflito para FIC-PRODUTO-C; vínculo inconsistente, preservando ambas as alternativas. | Encaminhar como FIC-ENC-T010-C para decidir quais evidências contemporâneas são aceitas e qual versão reavaliar. Não escolher uma fonte nem alterar o vínculo. |

Os aliases FIC-ENC-T010-B e FIC-ENC-T010-C são referências fictícias para exercitar o formato, não registros abertos. A fonte aceita, o recorte operacional, a designação nominal e a autorização específica continuam pré-requisitos antes de qualquer conferência real, conforme D3 e a decisão local.

## Exercício inteiramente sintético

Os três casos abaixo usam apenas aliases inventados. O exemplo fixa `FIC-LOTES-v1` com corte comum `T0 = 2030-06-01T00:00:00Z`. O papel `FIC-OPERADOR` prepara a amostra, `FIC-REVISOR` recalcula e confere os hashes, `FIC-AUTORIZADOR` representa o papel que aprovaria um recorte operacional futuro e `FIC-CUSTODIA` representa o custodiante. Nenhum alias identifica pessoa ou fonte real. Em todos os casos, FIC-OPERADOR preparou a amostra em 2030-06-02T11:00:00Z e FIC-REVISOR conferiu os hashes e as classificações em 2030-06-02T12:00:00Z.

As evidências sintéticas são uma linha JSON UTF-8, sem BOM e sem quebra de linha final. O caminho local de referência é este documento, âncora `#exercicio-inteiramente-sintetico`, seguido pelo alias da evidência. Os hashes abaixo foram calculados sobre os bytes exatos de cada linha JSON.

### Evidência `FIC-EV-T010-A`

```json
{"artefato":"FIC-EV-T010-A","recorte":"FIC-LOTES-v1","T0":"2030-06-01T00:00:00Z","produto":"FIC-PRODUTO-A","lote":"FIC-LOTE-A","codigo":"LOTE-SINTETICO-A","codigoNormalizado":"lote-sintetico-a","fontes":["FIC-REF-A v1","FIC-DOC-A v1"]}
```

### Evidência `FIC-EV-T010-B`

```json
{"artefato":"FIC-EV-T010-B","recorte":"FIC-LOTES-v1","T0":"2030-06-01T00:00:00Z","produto":"FIC-PRODUTO-B","lote":null,"fonte":"FIC-REF-B","versaoFonte":"v1","cobertura":"produto B no corte T0","afirmacao":"sem vinculo no recorte"}
```

### Evidência `FIC-EV-T010-C`

```json
{"artefato":"FIC-EV-T010-C","recorte":"FIC-LOTES-v1","T0":"2030-06-01T00:00:00Z","produto":"FIC-PRODUTO-C","referenciaInventario":"FIC-LOTE-C","referenciaDocumento":"FIC-LOTE-D","fontes":["FIC-REF-C v1","FIC-DOC-C v1"]}
```

| Caso sintético | Observação e referência | Classificação | Revisão e encaminhamento |
|---|---|---|---|
| `FIC-CASO-A` | O snapshot fictício `FIC-REF-A` v1 registra `FIC-PRODUTO-A → FIC-LOTE-A`; `FIC-DOC-A` v1, contemporâneo ao corte, identifica o mesmo lote. A linha `FIC-EV-T010-A` sintetiza a comparação. Caminho: `conferencia-de-lotes.md#exercicio-inteiramente-sintetico/FIC-EV-T010-A`. SHA-256: `6ae2e8ef1b7d5bb414088340aff1df677f341470d9f90cea9b4a89b82a71eef6`. | **Comprovado** dentro do recorte sintético: as duas referências e seus bytes/hash conferem. | `FIC-REVISOR` valida o hash e a época da fonte. Sem regularização proposta. |
| `FIC-CASO-B` | A referência fictícia aceita `FIC-REF-B` v1 cobre o item no corte e afirma não haver lote associado; não há evidência histórica de associação dentro da janela incluída. Linha `FIC-EV-T010-B`. Caminho: `conferencia-de-lotes.md#exercicio-inteiramente-sintetico/FIC-EV-T010-B`. SHA-256: `409be94c0234a9e77bbd440107d77214c0c89bab83b4d97023aa9318ab4d8c37`. | **Ausente** no recorte e período de cobertura declarados; não é conclusão sobre períodos fora da fonte. | `FIC-REVISOR` registra a cobertura. Se surgir evidência de outro período, criar nova revisão e encaminhar à conciliação. |
| `FIC-CASO-C` | O snapshot fictício `FIC-REF-C` v1 aponta `FIC-LOTE-C`, enquanto o documento contemporâneo `FIC-DOC-C` v1 identifica `FIC-LOTE-D`. Linha `FIC-EV-T010-C`. Caminho: `conferencia-de-lotes.md#exercicio-inteiramente-sintetico/FIC-EV-T010-C`. SHA-256: `f5c80a9568b4998bdd727282adf2e32682da18cb3570dd2c0786322a49a81bf3`. | **Inconsistente** entre as duas fontes sintéticas. | Preservar ambas as referências. Criar `FIC-ENC-T010-C` para a [Conciliação operacional](../conciliacao-operacional/prd.md), com a pergunta sobre qual evidência contemporânea é aceita. Não alterar o vínculo. |

`FIC-ENC-T010-B` e `FIC-ENC-T010-C` são exemplos de aliases de encaminhamento; não afirmam que existam registros reais abertos. Em uso real, vincular o encaminhamento ao recorte e versões autorizados da conciliação, manter os caminhos restritos fora do material compartilhável e aguardar resolução por responsável designado.

## Encerramento deste artefato

O exemplo demonstra formato, cálculo verificável de hashes e as três classificações em casos sintéticos. **Não encerra a conferência operacional da T010.** Essa etapa continua bloqueada até a escolha e aceitação da fonte real, a definição do recorte e `T0`, e a designação nominal do responsável operacional e dos papéis independentes. Até lá, nenhum lote ou vínculo real foi consultado ou validado.
