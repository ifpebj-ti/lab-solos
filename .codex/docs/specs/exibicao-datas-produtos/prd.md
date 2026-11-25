# PRD: Exibição de datas de produtos no padrão brasileiro

- Status: rascunho
- Responsável: a definir
- Atualizado em: 2026-11-25
- Validação de descoberta: dispensada-pelo-usuário

## Contexto e problema

A administração e as pessoas que acompanham o estoque consultam datas de fabricação e validade em listagens, alertas e detalhes de produtos. A issue [#507 — Corrigir a exibição de datas de produtos para o padrão brasileiro](https://github.com/ifpebj-ti/lab-solos/issues/507) registra valores como `11/13/2026 00:00:00` na coluna **Data de Validade**. O valor usa uma ordem mês/dia e inclui horário, embora represente uma data civil. A mesma evidência mostra `01/01/0001 00:00:00`. O código atual usa o valor mínimo de data como fallback em um caminho, indicando um marcador técnico de ausência.

O padrão desejado já aparece em textos e campos da interface em português do Brasil. A apresentação atual da data do produto não é uniforme e pode variar conforme a origem do texto e a localidade usada para produzi-lo, dificultando reconhecer dia e mês.

| Issue de origem | Requisitos | Critérios |
| --- | --- | --- |
| [#507 — Exibição de datas de produtos](https://github.com/ifpebj-ti/lab-solos/issues/507) | RF-001 a RF-003, RNF-001 e RNF-002 | CA-001 a CA-006 |

## Objetivo e métricas de sucesso

- Exibir datas civis de fabricação e validade de produtos no padrão inequívoco `dd/MM/yyyy` em todas as listas, alertas e detalhes cobertos.
- Alcançar 100% de consistência nas superfícies de produto incluídas: nenhum valor de data civil apresentado em ordem mês/dia nem com horário.
- Preservar o dia informado ao consultar o produto, independentemente da localidade do servidor ou do navegador.

As métricas são verificadas na validação de aceite; esta entrega não exige telemetria de uso.

## Usuários e jornadas

- **Administração do laboratório** — consulta os produtos e seus alertas, interpreta a validade e decide quais itens precisam de atenção.
- **Pessoa autorizada a consultar produtos** — abre uma listagem ou detalhe e reconhece a data de fabricação ou validade sem depender da localidade do dispositivo.

## Escopo

### Incluído

- Apresentação das datas de fabricação e validade de produtos nas listagens, no acompanhamento de alertas e nos detalhes acessíveis a partir dessas telas.
- Consistência da leitura para produtos químicos, vidrarias e demais tipos de produto que exibam esses campos.
- Apresentação explícita para datas ausentes ou que não possam ser interpretadas como datas válidas, sem expor valores técnicos brutos.
- Preservação do mesmo dia civil entre a consulta do produto e sua apresentação.

### Fora de escopo

- Interação para digitar ou selecionar datas em formulários, coberta pela issue [#508 — Padronizar todos os campos de seleção de data do site conforme Químicos](https://github.com/ifpebj-ti/lab-solos/issues/508).
- Alteração das regras de validade, dos alertas, do cadastro de datas passadas ou do fuso institucional.
- Reformatação de registros que representam instantes com hora, como criação, empréstimos ou auditoria.
- Correção ou migração de valores históricos armazenados sem evidência suficiente sobre a data pretendida.

## Requisitos funcionais

### RF-001 — Apresentar datas civis de produto em dia, mês e ano

Toda data de fabricação ou validade de produto exibida ao usuário deve seguir `dd/MM/yyyy`, com dia antes do mês. O formato apresentado deve ser o mesmo em listagens, alertas e detalhes abrangidos, para qualquer tipo de produto que exponha a data.

### RF-002 — Distinguir data civil de instante com horário

A fabricação e a validade, quando representam apenas um dia civil, devem ser mostradas sem componente de horário. A apresentação não deve sugerir uma hora que não faça parte do valor informado.

### RF-003 — Tratar datas ausentes, inválidas ou marcadas como ausência

Quando uma data de produto estiver ausente, inválida ou representada pelo marcador de ausência `01/01/0001`, a interface deve apresentar o estado de ausência ou erro já reconhecível ao usuário. Ela não deve mostrar texto bruto da API, marcador interno ou uma data aparentemente válida que represente ausência.

## Requisitos não funcionais

### RNF-001 — Manter leitura independente da localidade

A ordem dia/mês/ano e o dia civil apresentado não podem variar conforme a localidade configurada no servidor, navegador ou dispositivo da pessoa usuária.

### RNF-002 — Preservar compreensão e acessibilidade

A data deve estar disponível como texto legível e compreensível por tecnologias assistivas. A informação de dia, mês e ano não pode depender somente de cor, posição ou ícone.

## Critérios de aceitação

### CA-001 — Data válida na lista de produtos (RF-001)

- Dado um produto cuja data de validade corresponde a 13 de novembro de 2026
- Quando a administração consulta uma lista ou o acompanhamento de alertas
- Então a data aparece como `13/11/2026`, com dia antes do mês

### CA-002 — Mesma apresentação em diferentes localidades (RF-001, RNF-001)

- Dado o mesmo produto e a mesma data civil
- Quando a consulta é feita em ambientes com localidades distintas
- Então a interface apresenta a mesma data no formato `dd/MM/yyyy`

### CA-003 — Data civil sem horário (RF-002)

- Dado um produto com uma data de fabricação ou validade que representa somente um dia
- Quando o campo é exibido em uma lista, alerta ou detalhe
- Então a data aparece sem horário, inclusive sem `00:00:00`

### CA-004 — Valor ausente, inválido ou marcador de ausência (RF-003)

- Dado um produto cuja data esteja ausente, não possa ser reconhecida como válida ou corresponda ao marcador `0001-01-01`
- Quando a interface renderiza o campo
- Então apresenta um estado de ausência ou erro compreensível e não exibe o valor bruto recebido

### CA-005 — Preservação do dia civil (RF-001, RNF-001)

- Dado um produto com uma data civil válida
- Quando a pessoa usuária consulta o mesmo produto em uma tela diferente ou em outro ambiente de localidade
- Então o dia, o mês e o ano permanecem iguais aos do produto, sem deslocamento de calendário

### CA-006 — Data legível por tecnologia assistiva (RF-001, RNF-002)

- Dado que uma pessoa consulta a lista ou o detalhe de um produto usando tecnologia assistiva
- Quando o campo de fabricação ou validade é lido
- Então a data é anunciada como texto compreensível com dia, mês e ano, sem depender de ícone, cor ou ordenação visual

## Estratégia de validação

- Automatizar a apresentação de datas válidas, ausentes e inválidas nas superfícies de produto incluídas.
- Cobrir uma data em que dia e mês não possam ser trocados sem tornar o exemplo inválido, como 13 de novembro, e uma data em que ambos sejam menores ou iguais a 12 para garantir que o resultado não dependa de interpretação regional.
- Verificar visualmente as listagens, alertas e detalhes nos estados com data e sem data; confirmar que campos de data civil não exibam horário.
- Conferir na árvore de acessibilidade que a data de fabricação e validade é exposta como texto legível.
- Comparar a data consultada com a apresentada para detectar deslocamentos de dia.
- Registrar evidência visual da coluna **Data de Validade** que motivou a issue e das telas abrangidas após o aceite.

## Dependências e riscos

- A issue #508 trata da interação de seleção e digitação de datas; este PRD trata da leitura de datas já consultadas. Os dois resultados devem manter o mesmo entendimento de dia civil.
- Valores textuais produzidos com convenções regionais diferentes podem ser ambíguos quando dia e mês são ambos menores ou iguais a 12. A validação não deve inferir um dia pretendido somente pela ordem do texto.
- O código usa o valor mínimo de data como fallback em um caminho de patch. A apresentação trata esse marcador como ausência sem regravar nem migrar o registro.

## Suposições

- **Suposição** — Fabricação e validade são datas civis, sem horário relevante à leitura do usuário.
- **Suposição** — Quando não existir um valor de data utilizável, a tela deve usar o estado de ausência já adotado pelo produto para campos equivalentes, sem criar um novo significado de negócio.
- **Suposição** — A preferência confirmada pelo usuário é a apresentação brasileira `dd/MM/yyyy` nas telas de produto.
- **Suposição** — `01/01/0001` na evidência corresponde ao valor mínimo usado como marcador técnico de ausência, não a uma fabricação ou validade efetiva.

## Perguntas abertas

Não há pergunta bloqueante para a apresentação. A procedência histórica de registros `0001-01-01` pode ser investigada separadamente; esta entrega os apresenta como ausência e não altera os dados armazenados.

## Decisões da validação de descoberta

| Decisão | Recomendação | Resposta confirmada | Impacto |
|---|---|---|---|
| Validar issues existentes por grilling | Aplicar o grilling da skill a requisitos já definidos | Dispensado pelo usuário para as issues existentes | O PRD segue a issue #507; dúvidas remanescentes ficam explícitas, sem interromper a documentação |
| Padrão visível de datas civis | Usar dia, mês e ano no padrão brasileiro e omitir horário de datas que não têm hora | Confirmado pelo usuário e registrado na issue #507 | Listas, alertas e detalhes de produto compartilham a mesma leitura |
| Valor `01/01/0001` | Apresentar o marcador de ausência como campo sem data e preservar o registro armazenado | Decidido autonomamente conforme a autorização do usuário e o fallback de valor mínimo encontrado no código | A interface não exibe `01/01/0001`; não há migração nem regravação do histórico |
