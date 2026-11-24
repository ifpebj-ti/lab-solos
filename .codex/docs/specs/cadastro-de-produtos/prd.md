# PRD de cadastro de produtos

- **Status** — rascunho
- **Responsável** — a definir
- **Atualizado em** — 2026-11-15
- **Validação de descoberta** — dispensada pelo usuário

## Contexto e problema

Em **Produtos > Adicionar**, a administração cadastra químicos e vidrarias. O formulário de químicos tem um campo de fórmula sem formatação por trecho, oferece CATMAT, usa o rótulo Fornecedor e permite selecionar Indefinido como Grupo. Os calendários dificultam informar anos distantes e a validade passada. O cadastro de vidrarias ainda oferece Altura e chama de Formato o que o laboratório chama de Categoria. A revisão do texto da máscara de data se aplica a toda ocorrência visível na interface.

| Issue de origem | Requisitos | Critérios |
| --- | --- | --- |
| [#461 — Máscara de datas em português](https://github.com/ifpebj-ti/lab-solos/issues/461) | RF-001 | CA-001, CA-002, CA-009 |
| [#462 — Subscrito por trecho na fórmula química](https://github.com/ifpebj-ti/lab-solos/issues/462) | RF-002, RNF-001 | CA-003 a CA-006 |
| [#463 — Peso Molecular, Marca e Grupo](https://github.com/ifpebj-ti/lab-solos/issues/463) | RF-003, RNF-002 | CA-007, CA-008 |
| [#464 — Entrada de datas e confirmação de cadastro vencido](https://github.com/ifpebj-ti/lab-solos/issues/464) | RF-001, RF-004, RF-005, RNF-001 | CA-009 a CA-013 |
| [#465 — Altura e Categoria de vidrarias](https://github.com/ifpebj-ti/lab-solos/issues/465) | RF-006, RNF-002 | CA-014, CA-015 |

## Objetivo e métricas de sucesso

- Exibir `dd/mm/aaaa` em todas as ocorrências de orientação ao usuário antes grafadas com `yyyy`, mantendo a leitura numérica das datas preenchidas.
- Confirmar na consulta os dados e a formatação escolhidos nos cadastros de químicos e vidrarias.
- Demonstrar, com a data de referência controlada, a aceitação das datas válidas e os resultados distintos de confirmar ou cancelar um cadastro vencido.

## Usuários e jornadas

A administração adiciona um produto, informa seus dados e consulta o registro salvo. Ao cadastrar um químico, pode digitar datas ou escolher ano, mês e dia no calendário, além de revisar o aviso antes de concluir o registro vencido. Qualquer usuário com acesso a um campo ou instrução afetada pela máscara encontra a indicação em português.

## Escopo

### Incluído

- Máscara visível em campos, instruções e mensagens de validação em toda a interface.
- Cadastro de químicos com subscrito opcional, dados de identificação e duas formas de entrada de datas, além da consulta dos valores salvos.
- Cadastro de vidrarias sem Altura, com o seletor Categoria e consulta do valor salvo.

### Fora de escopo

- Mudança do formato interno de armazenamento, intercâmbio ou formatação de datas por causa da máscara exibida.
- Reformulação das telas de edição ou remoção de campos históricos dos produtos por causa da mudança nos formulários de cadastro.
- Nova política de estoque, de validade para outros tipos de produto ou de acesso por perfil.

## Requisitos funcionais

### RF-001 — Exibir a máscara de data em português

Todo campo, texto de orientação ou mensagem de validação que apresenta `dd/mm/yyyy` como indicação de preenchimento deve apresentar `dd/mm/aaaa`. Uma data já preenchida deve continuar legível em algarismos no padrão dia, mês e ano.

### RF-002 — Aplicar e remover subscrito nos trechos selecionados

O campo de fórmula deve manter a digitação na linha de base e permitir aplicar ou remover subscrito nos trechos que o usuário escolher. O cadastro deve aceitar fórmulas com e sem formatação e a consulta deve preservar o texto e a formatação salvos.

### RF-003 — Capturar os dados de identificação do químico

O cadastro de químicos deve oferecer **Peso Molecular** no lugar de CATMAT e exibir **Marca** no campo antes rotulado Fornecedor. Deve salvar e permitir consultar os valores informados. O seletor de **Grupo** deve oferecer os demais grupos válidos e excluir Indefinido da seleção de novos cadastros.

### RF-004 — Digitar ou selecionar fabricação e validade

Os campos de fabricação e validade devem aceitar digitação em `dd/mm/aaaa` e permitir selecionar diretamente o ano no calendário antes de escolher mês e dia. Datas impossíveis devem receber mensagem de validação no campo correspondente.

### RF-005 — Confirmar o cadastro de um químico vencido

Ao enviar um químico válido nos demais campos com validade anterior ao dia atual, o sistema deve informar que o produto está vencido e perguntar se deve adicioná-lo. Confirmar deve gravar a data informada. Cancelar deve devolver o formulário preenchido e impedir a gravação. Validade igual ao dia atual ou posterior segue sem esse aviso.

### RF-006 — Ajustar os dados de cadastro de vidrarias

O formulário de cadastro de vidrarias deve permitir concluir o registro sem Altura e apresentar **Categoria** no seletor antes rotulado Formato. A categoria escolhida deve ser gravada e recuperada ao consultar o item.

## Requisitos não funcionais

### RNF-001 — Operação por teclado e mensagens associadas aos campos

As ações de formatação, a seleção de data e o diálogo de vencimento devem permitir concluir os caminhos previstos com teclado. Quando houver erro de data, o campo afetado e o motivo devem ser identificáveis.

### RNF-002 — Compatibilidade de consulta com registros anteriores

Químicos cadastrados sem Peso Molecular ou com Grupo Indefinido e vidrarias com Altura informada devem continuar consultáveis, preservando os dados já gravados.

## Critérios de aceitação

### CA-001 — Máscara nos estados vazio e inválido (RF-001)

- Dado um campo, instrução ou mensagem que oriente sobre o formato de uma data
- Quando a interface apresentar a máscara em um campo vazio ou em uma validação
- Então a indicação de preenchimento antes apresentada como `dd/mm/yyyy` aparece como `dd/mm/aaaa`

### CA-002 — Data preenchida (RF-001)

- Dado um campo ou uma consulta com a data de 5 de novembro de 2026 apresentada no padrão dia, mês e ano
- Quando o valor for exibido
- Então a data aparece como `05/11/2026`

### CA-003 — Digitação sem formatação (RF-002)

- Dado o campo de fórmula de um novo químico
- Quando o usuário digitar `2H2O` sem aplicar formatação
- Então os dois números permanecem na linha de base

### CA-004 — Aplicação e remoção de subscrito (RF-002, RNF-001)

- Dado o texto `2H2O` no campo de fórmula
- Quando o usuário selecionar somente o segundo `2` e aplicar o subscrito
- Então o campo apresenta `2H₂O` com o coeficiente na linha de base e permite remover a formatação do trecho antes de salvar, inclusive por teclado

### CA-005 — Consulta de fórmulas salvas (RF-002)

- Dado um químico cadastrado com `2H2O` e outro com `2H₂O`
- Quando o usuário consultar as fórmulas dos registros
- Então cada fórmula mantém a grafia e a formatação escolhidas no cadastro

### CA-006 — Detalhe de fórmula existente (RF-002)

- Dado um químico já cadastrado com fórmula sem subscrito
- Quando o usuário consultar sua fórmula
- Então a grafia salva continua legível com os caracteres em suas posições originais

### CA-007 — Identificação de um novo químico (RF-003)

- Dado um cadastro de químico em preenchimento
- Quando o usuário selecionar um grupo válido, preencher Peso Molecular e Marca, salvar e consultar o registro
- Então os valores informados são recuperados, o cadastro exibe Marca e Peso Molecular, o campo CATMAT está ausente e Indefinido fica fora das opções de Grupo

### CA-008 — Consulta de um químico anterior (RNF-002)

- Dado um químico cadastrado anteriormente sem Peso Molecular e com grupo legado, inclusive Indefinido
- Quando o usuário consultar o registro
- Então o registro continua disponível, os dados existentes são preservados e a ausência de Peso Molecular não resulta em um valor inventado

### CA-009 — Digitação e seleção direta do ano (RF-001, RF-004, RNF-001)

- Dado cada campo de data do cadastro de químicos
- Quando o usuário digitar uma data válida ou escolher diretamente o ano no calendário e depois o mês e o dia, inclusive por teclado
- Então o formulário aceita o dia correspondente e o apresenta no padrão numérico `dd/mm/aaaa`

### CA-010 — Data impossível (RF-004, RNF-001)

- Dado o campo de fabricação ou de validade editável
- Quando o usuário tentar enviar `31/02/2026` nesse campo
- Então o campo apresenta uma mensagem de data inválida e o produto permanece sem registro

### CA-011 — Confirmação de validade passada (RF-005, RNF-001)

- Dado o cadastro preenchido com dados válidos e validade anterior ao dia atual
- Quando o usuário enviar os dados e confirmar no diálogo que informa o vencimento
- Então o produto é cadastrado uma vez com a validade informada

### CA-012 — Cancelamento de cadastro vencido (RF-005, RNF-001)

- Dado o diálogo de confirmação exibido para uma validade passada
- Quando o usuário cancelar pelo controle do diálogo, inclusive por teclado
- Então volta ao formulário com os dados preenchidos e pode revisá-los, com o produto ainda sem registro

### CA-013 — Validade no dia atual ou no futuro (RF-005)

- Dado um cadastro preenchido com dados válidos
- Quando a validade informada for igual ao dia atual ou posterior e o usuário enviar o cadastro
- Então o produto é cadastrado sem o diálogo de vencimento

### CA-014 — Categoria de vidraria sem informar Altura (RF-006)

- Dado o formulário de cadastro de vidrarias
- Quando o usuário escolher uma opção no seletor Categoria, completar o cadastro e consultar o item
- Então o formulário apresenta Categoria no lugar de Formato, dispensa Altura e a consulta recupera a categoria escolhida

### CA-015 — Consulta de vidraria anterior (RNF-002)

- Dado um registro de vidraria anterior com Altura gravada
- Quando a administração consultar o item após a mudança no formulário
- Então o registro continua disponível e seu dado histórico de Altura permanece preservado

## Estratégia de validação

Revisar as ocorrências de texto visível e automatizar as jornadas dos formulários e da consulta com dados sintéticos. Conferir a navegação por teclado, a legibilidade das mensagens e a aplicação de subscrito apenas ao trecho selecionado. Usar uma referência de data controlada para observar validade passada, atual e futura e verificar o resultado persistido ou a ausência de registro após cancelar. Registrar os cenários aprovados, incluindo a leitura de produtos anteriores.

## Dependências e riscos

- [Listagem e alertas de produtos](../listagem-e-alertas-de-produtos/prd.md) compartilha a interpretação de validade, com alerta operacional para químicos vencidos cadastrados.
- [Integridade de produtos, lotes e histórico de saída](../integridade-de-produtos-e-lotes/prd.md) estabelece a preservação de dados nas alterações. A troca de campos do cadastro exige atenção à leitura de registros anteriores.
- Referências do comportamento atual em [manual da administração](../../../../docs/manual/administrador.md#j07--cadastrar-materiais), [formulário de químicos](../../../../frontend/src/components/global/forms/create/FormQuimicos.tsx), [formulário de vidrarias](../../../../frontend/src/components/global/forms/create/FormVidraria.tsx), [entrada de data](../../../../frontend/src/components/global/inputs/DateInput.tsx), [formatação de data](../../../../frontend/src/function/date.ts) e [consulta do produto](../../../../frontend/src/components/screens/VerificationPage.tsx).

## Decisões complementares

As escolhas desta etapa constam no [registro local de decisões](../decisoes-de-planejamento.md#cadastro-e-alertas).

## Decisões da validação de descoberta

| Decisão | Recomendação | Resposta confirmada | Impacto |
| --- | --- | --- | --- |
| Grilling | Aplicar a descoberta prevista na skill `create-prd` | Dispensado pelo usuário para as issues abertas | Os comportamentos confirmados vêm das issues e as decisões pendentes estão explícitas neste PRD. |
| Dia civil da validade | Usar um fuso institucional comum no servidor | Usuário aprovou `America/Sao_Paulo` como padrão | A data de validade conta até o fim do dia nesse fuso. Cadastro, Alertas e recálculos de validade em empréstimos usam a mesma referência. |
