# PRD — Cobertura de branches, badges e relatório HTML

- **Status** pronto para especificação
- **Responsável** a definir
- **Atualizado em** 2026-11-25
- **Validação de descoberta** dispensada pelo usuário

## Contexto e problema

A issue [#505](https://github.com/ifpebj-ti/lab-solos/issues/505) registra o esclarecimento dos professores: a meta mínima de 70% se refere à cobertura de branches, e a cobertura de linhas deve continuar visível como informação separada. A CI em `develop` mede linhas e aplica o limite de 70% a essa métrica. O README tem um badge genérico que aponta para as execuções, sem mostrar valores gerados. Não há um relatório HTML detalhado publicado junto à execução.

O Plano de Testes da Wiki, relacionado à issue [#494](https://github.com/ifpebj-ti/lab-solos/issues/494), também descreve a meta antiga de 70% em linhas. A regra e as referências precisam ficar coerentes entre CI, README e Wiki. Este PRD complementa a cobertura originalmente registrada em [#487](https://github.com/ifpebj-ti/lab-solos/issues/487) e substitui, para a meta de aprovação, a regra anterior baseada em linhas.

## Objetivo e métricas de sucesso

- Aplicar o limite de 70% a branches em cada módulo, frontend e backend, sem calcular média entre os módulos.
- Continuar publicando cobertura de linhas por módulo, sem usá-la como condição de aprovação.
- Exibir no README os badges `coverage-lines` e `coverage-branches`, com valores provenientes da execução da Action.
- Disponibilizar um relatório HTML de cada execução bem identificada no GitHub, distinguindo frontend e backend.
- Manter a definição da métrica, os resultados e a retenção documentados no README e no Plano de Testes.

## Usuários e jornadas

- A pessoa que contribui consulta os resultados de linhas e branches no próprio PR e identifica qual módulo ficou abaixo do limite.
- A pessoa revisora abre os badges no README, segue até o relatório da execução correspondente e compara os dois módulos.
- O professor consulta os indicadores atuais e consegue inspecionar os detalhes do relatório sem depender de percentuais escritos manualmente.

## Escopo

### Incluído

- Medir linhas e branches individualmente para frontend e backend.
- Exigir pelo menos 70% de branches em cada módulo.
- Exibir a cobertura de linhas sem aplicar a ela o limite de aprovação.
- Gerar e atualizar automaticamente os dois badges solicitados a partir de medidas vinculadas à mesma revisão e execução.
- Mostrar a pior cobertura entre os módulos nos badges, de modo que o módulo com resultado menor não fique oculto.
- Publicar no GitHub um relatório HTML detalhado, com retenção definida e informação suficiente para localizar a revisão e a execução que o produziu.
- Atualizar o README e o Plano de Testes da Wiki para distinguir a meta de branches da métrica informativa de linhas.
- Reprovar relatório ausente, inválido, incompleto ou associado a outra execução.

### Fora de escopo

- Exigir um percentual mínimo para cobertura de linhas.
- Alterar a cobertura de testes ou os critérios funcionais da aplicação.
- Adotar um provedor externo de cobertura ou alterar a meta de 70% estabelecida pelos professores.
- Alterar as políticas de análise estática, os demais gates de segurança ou as regras de proteção das branches.

## Requisitos funcionais

### RF-001 — Medir as duas métricas por módulo

A execução deve apresentar cobertura de linhas e de branches para frontend e backend separadamente. Cada resultado deve identificar o módulo, a revisão, o identificador da execução e a tentativa correspondente.

### RF-002 — Aplicar o limite de branches

A aprovação deve exigir no mínimo 70% de cobertura de branches em frontend e backend, avaliados de forma independente. Cobertura de linhas não participa dessa decisão.

### RF-003 — Atualizar badges automaticamente

O README deve apresentar dois badges, `coverage-lines` e `coverage-branches`, cujos valores sejam gerados a partir das medições da Action. O valor exibido deve refletir o menor resultado entre frontend e backend; uma medição indisponível ou inválida deve aparecer como indisponível, não como um resultado anterior.

### RF-004 — Disponibilizar relatório HTML

Cada execução deve publicar no GitHub um relatório HTML que apresente linhas e branches, seus resultados por módulo e a revisão/execução de origem. O README deve indicar como chegar ao relatório. A retenção do relatório deve estar documentada.

### RF-005 — Manter o Plano de Testes coerente

O Plano de Testes deve informar que o limite de 70% é aplicado a branches por módulo, que linhas é uma métrica informativa, e como consultar badges e relatórios.

## Requisitos não funcionais

### RNF-001 — Vincular e validar a origem das medidas

As quatro medições devem pertencer à mesma revisão, execução e tentativa. Uma medida ausente, malformada, com denominador inválido ou identidade divergente não pode ser aprovada nem apresentada como atual.

### RNF-002 — Restringir a publicação automatizada

A publicação persistente dos badges deve ocorrer apenas a partir de código confiável integrado em `develop`. Execuções de PR não devem receber permissão de escrita para publicação.

### RNF-003 — Documentar acesso e retenção

O README e o Plano de Testes devem informar onde o relatório está disponível, quem consegue consultá-lo e por quanto tempo o artefato da execução fica retido.

## Critérios de aceitação

### CA-001 — Medições separadas e identificadas (RF-001, RNF-001)

- **Dado** uma execução válida das suítes de frontend e backend
- **Quando** a CI normaliza as medições
- **Então** há resultados de linhas e branches por módulo, todos ligados ao mesmo SHA, `run_id` e `run_attempt`.

### CA-002 — Limite de branches aplicado sem média (RF-002)

- **Dado** um módulo com exatamente 70% de branches e outro com resultado acima do limite
- **Quando** o gate avalia os módulos
- **Então** o gate aprova.
- **E dado** qualquer módulo abaixo de 70% ou sem medição válida
- **Quando** o gate avalia a execução
- **Então** reprova e identifica o módulo e a causa.

### CA-003 — Linhas continuam informativas (RF-001, RF-002)

- **Dado** que ambos os módulos atingem 70% de branches e pelo menos um tem menos de 70% de linhas
- **Quando** o gate avalia a execução
- **Então** a aprovação depende das branches, e os percentuais de linhas continuam visíveis sem reprovar por si sós.

### CA-004 — Badges atuais e sem ocultar o menor módulo (RF-003, RNF-001, RNF-002)

- **Dado** resultados válidos de frontend e backend para uma execução integrada em `develop`
- **Quando** a Action atualiza os badges
- **Então** o README mostra `coverage-lines` e `coverage-branches` com valores gerados automaticamente e cada badge mostra o menor percentual dos dois módulos.
- **E dado** um resultado ausente ou inválido
- **Então** o badge correspondente mostra indisponibilidade em vez de reutilizar um valor antigo.

### CA-005 — Relatório HTML consultável (RF-004, RNF-001, RNF-003)

- **Dado** uma execução com relatórios de frontend e backend
- **Quando** o professor segue a indicação do README até os artefatos da execução
- **Então** encontra HTML detalhado para os dois módulos, com linhas, branches, SHA, execução/tentativa e informação de retenção.

### CA-006 — Plano de Testes coerente (RF-005, RNF-003)

- **Dado** o Plano de Testes da Wiki
- **Quando** a pessoa leitora consulta a política de cobertura
- **Então** encontra 70% como meta de branches em cada módulo, linhas como informação e links para o README e para a consulta dos relatórios.

## Estratégia de validação

- Cobrir o limiar exato de 70%, valores abaixo, resultado de um módulo isoladamente abaixo e linhas abaixo de 70% com branches aprovadas.
- Cobrir relatório ausente, vazio, malformado, sem branches contabilizáveis ou de SHA/execução/tentativa divergente.
- Verificar a geração dos badges com os dois módulos, o menor percentual e o estado de medida indisponível.
- Em uma execução integrada, abrir os dois relatórios HTML a partir do GitHub e conferir os metadados de origem e retenção.
- Conferir que PRs não publicam nem recebem permissão de escrita e que o push confiável em `develop` atualiza os badges.

## Dependências e riscos

- A atualização da Wiki se relaciona à issue #494 e deve respeitar o checkout local e as alterações preexistentes da página.
- A cobertura de branches pode ter denominadores distintos entre Vitest/V8 e Coverlet. Os coletores precisam aplicar filtros de fontes elegíveis de forma explícita e testada.
- A publicação de badges depende da permissão mínima do `GITHUB_TOKEN` no job confiável. Se o repositório não permitir escrita na branch dedicada, a Action deve falhar de forma visível e não expandir permissões automaticamente.
- Artefatos HTML podem expirar; o README deve encaminhar à execução e declarar a retenção, sem prometer disponibilidade permanente.

## Suposições

- Frontend e backend continuam sendo avaliados como módulos separados.
- O branch badge representa o menor dos dois módulos, e o relatório detalhado apresenta ambos individualmente.
- O relatório de uma execução será retido por 30 dias, igual aos artefatos de cobertura existentes.

## Perguntas abertas

Nenhuma decisão de produto permanece pendente. A permissão operacional para publicar na branch dedicada precisa ser conferida durante a execução da tarefa correspondente.

## Decisões da validação de descoberta

| Decisão | Recomendação | Resposta confirmada | Impacto |
|---|---|---|---|
| Métrica que governa o limite | Branches por módulo | 70% em branches; linhas informativas, conforme pedido registrado na issue #505 | Altera coletor, gate, badges e Plano de Testes. |
| Como exibir os módulos nos badges | Mostrar o menor percentual e detalhar ambos no relatório | Aprovado pela regra da issue: o badge não deve mascarar o módulo abaixo | Garante que o indicador resumido não esconda o resultado mais fraco. |
| Validação de descoberta | Dispensar nova sessão de perguntas | Dispensada pelo usuário; issue existente contém escopo e critérios | Permite concluir o PRD sem nova consulta. |
