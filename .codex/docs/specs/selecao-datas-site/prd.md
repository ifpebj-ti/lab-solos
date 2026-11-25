# PRD: Padronizar a seleção de datas civis no site

- Status: rascunho
- Responsável: a definir
- Atualizado em: 2026-11-25
- Validação de descoberta: dispensada-pelo-usuário

## Contexto e problema

A issue [#508 — Padronizar todos os campos de seleção de data do site conforme Químicos](https://github.com/ifpebj-ti/lab-solos/issues/508) registra que **Adicionar > Químicos** já oferece digitação em `dd/mm/aaaa` e um calendário com acesso direto a ano e mês. Em **Adicionar > Outros**, a data é escolhida pelo botão “Selecione uma data”. A edição de produtos e os filtros de auditoria usam campos de data cuja apresentação varia com o navegador.

Essas diferenças dificultam o preenchimento, especialmente para anos distantes, e podem apresentar o formato de modo inconsistente. A necessidade abrange os campos ativos de data civil de todo o site, não apenas o cadastro de produtos.

Evidências de contexto no frontend: `FormQuimicos.tsx`, `FormOutros.tsx`, `ProductEditModal.tsx` e `Auditoria.tsx`. O componente antigo de Vidrarias não tem consumidor ativo identificado na interface atual.

## Objetivo e métricas de sucesso

- Tornar previsível a seleção e a digitação de datas civis em todas as telas do site, seguindo o padrão já disponível em **Adicionar > Químicos**.
- Considerar a entrega bem-sucedida quando todo campo ativo de data civil apresentar `dd/mm/aaaa`, aceitar digitação e oferecer calendário com acesso direto a ano e mês, sem depender da localidade do navegador.
- Não há telemetria de uso prevista; o sucesso será demonstrado pela conferência funcional dos campos ativos inventariados e pelos cenários de aceitação deste PRD.

## Usuários e jornadas

- **Administrador que cadastra produtos** — preenche fabricação e validade em **Outros** por digitação ou calendário.
- **Administrador que edita produtos** — corrige ou remove as datas de fabricação e validade com a mesma apresentação do cadastro.
- **Administrador que consulta auditoria** — define as datas inicial e final dos filtros sem depender do formato regional do navegador.
- **Pessoa que usa uma nova tela com data civil** — encontra o mesmo padrão já conhecido nos químicos.

## Escopo

### Incluído

- Padronização de todos os campos ativos de seleção de data civil, incluindo cadastro de **Outros**, edição de produtos e filtros de auditoria.
- Digitação explícita no padrão `dd/mm/aaaa` e seleção em calendário com acesso direto a ano, mês e dia.
- Consistência do padrão em campos obrigatórios e opcionais, datas simples e filtros por intervalo.
- Aplicação do mesmo requisito a novos campos de data civil adicionados à interface.
- Preservação das regras atuais de negócio e da data civil selecionada ao enviar, salvar e reabrir o registro.

### Fora de escopo

- Alterar regras de validade, permitir ou bloquear datas passadas, ou mudar confirmações de cadastro vencido.
- Alterar a apresentação das datas já gravadas em listagens e detalhes; essa necessidade está separada na issue [#507](https://github.com/ifpebj-ti/lab-solos/issues/507).
- Mudar a semântica de datas que incluem horário, como registro de eventos.
- Alterar os campos que atualmente não possuem seleção de data civil, incluindo a inclusão de datas no cadastro de Vidrarias.

## Requisitos funcionais

### RF-001 — Usar um padrão visível único para datas civis

Todo campo ativo que permite selecionar uma data civil deve indicar e apresentar o padrão `dd/mm/aaaa`, independentemente da tela, categoria de produto ou localidade configurada no navegador.

### RF-002 — Permitir digitação de datas

A pessoa usuária deve conseguir digitar uma data civil no padrão `dd/mm/aaaa`. Datas incompletas ou impossíveis devem receber validação compreensível e não podem ser aceitas como uma data válida.

### RF-003 — Oferecer calendário com navegação direta

Todo campo ativo deve oferecer um calendário em português no qual seja possível acessar diretamente o ano e o mês e selecionar o dia, sem depender de avançar mês a mês desde o ano atual.

### RF-004 — Preservar regras de cada campo

A mudança de interação deve manter a obrigatoriedade, opcionalidade, limites e demais regras de negócio que cada campo já possui. Campos de início e fim de período devem manter sua função e significado no filtro correspondente.

### RF-005 — Preservar o dia civil selecionado

A data civil digitada ou selecionada deve continuar representando o mesmo dia após envio, persistência e reabertura, sem deslocamento causado por fuso horário ou por conversão de formato.

### RF-006 — Aplicar o padrão a novas telas

Novos campos de seleção de data civil devem seguir o padrão definido neste PRD para que a interface continue consistente.

## Requisitos não funcionais

### RNF-001 — Independência da localidade do navegador

A indicação visual, digitação e seleção de datas civis devem permanecer no padrão brasileiro quando o navegador estiver configurado para outra localidade.

### RNF-002 — Acessibilidade de interação

Os campos devem manter rótulos associados, mensagens de erro identificáveis e operação por teclado; os controles do calendário devem comunicar sua finalidade às tecnologias assistivas.

### RNF-003 — Adaptação de tela

O campo e o calendário devem permanecer utilizáveis em telas estreitas, sem cortar o conteúdo ou impedir a escolha do ano, mês e dia.

## Critérios de aceitação

### CA-001 — Digitação em Outros (RF-001, RF-002, RF-005)

- **Dado** que a administração abriu o cadastro de **Outros**
- **Quando** digitar `13/11/2026` em um campo de data e concluir o cadastro conforme as regras existentes
- **Então** a data é aceita no padrão informado e representa o mesmo dia quando o registro é consultado

### CA-002 — Ano distante pelo calendário (RF-001, RF-003)

- **Dado** que uma pessoa abriu um calendário de data civil
- **Quando** informar diretamente um ano diferente do atual, selecionar um mês e um dia
- **Então** o campo recebe a data escolhida sem exigir navegação repetida entre meses

### CA-003 — Data digitada impossível ou incompleta (RF-002)

- **Dado** que a pessoa digitou uma data incompleta ou impossível, como `31/02/2026`
- **Quando** o campo for validado no fluxo de edição ou envio correspondente
- **Então** o sistema identifica a data como inválida, apresenta uma mensagem compreensível e não a trata como válida

### CA-004 — Respeito às regras atuais dos campos (RF-004)

- **Dado** um conjunto de campos de data obrigatórios e opcionais, incluindo datas passadas, presentes e futuras conforme permitido hoje
- **Quando** a pessoa preencher, deixar vazio ou tentar selecionar datas em cada campo
- **Então** cada campo mantém suas regras atuais de obrigatoriedade e negócio, sem alteração de política causada pela padronização visual

### CA-005 — Edição de produtos (RF-001, RF-002, RF-003, RF-005)

- **Dado** que a administração está editando datas de fabricação ou validade de um produto
- **Quando** digitar ou escolher uma data pelo calendário
- **Então** o campo segue `dd/mm/aaaa`, oferece navegação direta por ano e mês e preserva o dia civil após salvar e reabrir

### CA-006 — Filtros inicial e final da auditoria (RF-001, RF-002, RF-003, RF-004)

- **Dado** que a administração abriu os filtros de auditoria
- **Quando** preencher a data inicial e a data final por digitação ou calendário
- **Então** ambos os campos seguem o padrão brasileiro e o período filtrado conserva os limites selecionados

### CA-007 — Navegador em localidade diferente (RF-001, RNF-001)

- **Dado** o mesmo campo de data civil aberto em navegadores configurados para `pt-BR` e para outra localidade
- **Quando** a pessoa consulta o formato ou digita uma data
- **Então** o formato visível e esperado continua sendo `dd/mm/aaaa` nos dois casos

### CA-008 — Operação por teclado e tecnologia assistiva (RF-003, RNF-002)

- **Dado** que a pessoa navega pelo formulário usando teclado ou leitor de tela
- **Quando** alcança o campo, abre o calendário, muda ano e mês e escolhe um dia
- **Então** consegue identificar a finalidade dos controles, operar as opções disponíveis e perceber mensagens de validação

### CA-009 — Uso em tela estreita (RNF-003)

- **Dado** que o formulário está aberto em uma tela estreita
- **Quando** a pessoa abre o calendário e seleciona ano, mês e dia
- **Então** os controles permanecem visíveis e operáveis sem corte que impeça a tarefa

### CA-010 — Novo campo de data civil (RF-006)

- **Dado** que uma nova tela do site passa a oferecer seleção de uma data civil
- **Quando** a pessoa abre o campo para preencher a data
- **Então** encontra o mesmo formato `dd/mm/aaaa`, digitação e calendário com acesso direto a ano e mês definidos para os demais campos

## Estratégia de validação

- Automatizar os comportamentos de digitação, calendário, validação de datas impossíveis, preservação das regras de campo e retenção do dia civil após salvar e reabrir.
- Exercitar os campos ativos de cadastro de **Outros**, edição de produtos e filtros de auditoria, incluindo campos obrigatórios, opcionais e limites de período.
- Conferir que o formato visual permaneça `dd/mm/aaaa` com localidade de navegador diferente de `pt-BR`.
- Registrar evidência visual e funcional em tela larga e estreita, incluindo operação por teclado dos campos e do calendário.
- Conferir o inventário de campos de data civil ativos para demonstrar que não há seletores com apresentação divergente.

## Dependências e riscos

- A issue [#507](https://github.com/ifpebj-ti/lab-solos/issues/507) trata da apresentação das datas de produto após a consulta; esta issue trata da seleção e entrada de datas.
- Datas civis e instantes com horário têm semânticas diferentes. Tratar um instante como data civil pode deslocar o dia e alterar a leitura do usuário.
- Alterar o controle de entrada pode afetar validações ou restrições existentes, especialmente no cadastro de **Outros** e nos filtros por período. A implementação deve preservá-las.
- Os critérios deste PRD são comportamentais; a especificação técnica definirá como compartilhar o padrão sem duplicar lógica entre telas.

## Suposições

- **Suposição** — A seleção de datas futuras ou passadas deve continuar obedecendo às regras existentes em cada campo; a padronização não cria nem remove permissões.
- A auditoria de código identificou `DateInputVidraria` sem consumidor ativo na interface atual; o requisito RF-006 se aplica se uma tela passar a oferecer esse campo no futuro.

## Perguntas abertas

Nenhuma decisão de produto bloqueante identificada. Contratos de validação, compartilhamento dos controles e detalhes de interação serão definidos na especificação técnica.

## Decisões da validação de descoberta

| Decisão | Recomendação | Resposta confirmada | Impacto |
|---|---|---|---|
| Validação por grilling das issues existentes | Aplicar a etapa de descoberta da skill | Usuário dispensou grilling para as issues existentes e orientou seguir os requisitos registrados | A descoberta foi dispensada para este PRD; o escopo se baseia na issue #508 e na orientação explícita de padronização em todo o site |
| Abrangência do padrão | Atualizar apenas o formulário **Outros** | Usuário confirmou que a seleção de data deve seguir o padrão de **Adicionar > Químicos** em todo o site | Todos os campos ativos de data civil e novas telas devem seguir o mesmo comportamento |
| Regras de negócio de datas | Reavaliar permissões de datas passadas e futuras em cada fluxo | Preservar as regras atuais dos campos | A entrega padroniza interação e formato sem alterar regras de validade ou filtros |
