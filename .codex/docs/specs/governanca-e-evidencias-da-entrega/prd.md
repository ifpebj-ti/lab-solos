# PRD — Governança e evidências da entrega

- **Status** rascunho
- **Responsável** a definir
- **Atualizado em** 2026-11-24
- **Validação de descoberta** dispensada pelo usuário

## Contexto e problema

A avaliação da Unidade 1 apontou lacunas para consultar o sistema e o backlog, entender as proteções das branches e conferir os alertas. O usuário esclareceu em 2026-11-24 que não existe protótipo independente aprovado: o cliente aprovou o próprio sistema LabOn em andamento. O sistema publicado passa a ser a referência visual da entrega; não se afirma que um protótipo Figma foi aprovado ou novamente testado. A issue de backlog informa que o Project é privado. A avaliação também identificou um único modelo de issue, ausência de instruções próprias de relato de segurança e de responsáveis por áreas, além de saídas de compilação versionadas em `backend/Tests`. [Referência do sistema #492](https://github.com/ifpebj-ti/lab-solos/issues/492) · [Backlog #493](https://github.com/ifpebj-ti/lab-solos/issues/493) · [Artefatos #495](https://github.com/ifpebj-ti/lab-solos/issues/495) · [Governança #496](https://github.com/ifpebj-ti/lab-solos/issues/496) · [Evidências #497](https://github.com/ifpebj-ti/lab-solos/issues/497)

## Objetivo e métricas de sucesso

- Encontrar pelo README o sistema aprovado pelo cliente e os seis fluxos principais existentes; consultar estados, prioridades e vínculos no backlog pelo procedimento aprovado.
- Oferecer modelos de bug e melhoria, um canal privado funcional para relatos de segurança e responsáveis pelas áreas de revisão acordadas.
- Manter zero saídas geradas de `backend/Tests/bin` e `backend/Tests/obj` rastreadas pelo Git e demonstrar restauração, compilação e testes a partir de checkout limpo.
- Disponibilizar evidências datadas e verificáveis dos alertas consultados e das regras efetivamente aplicadas a `main` e `develop`.

## Usuários e jornadas

- O avaliador abre o README ou os materiais de entrega e segue os caminhos indicados para consultar o sistema aprovado, o backlog e as evidências de segurança e proteção de branches.
- A pessoa que contribui escolhe o modelo de issue adequado, registra o comportamento esperado e abre um PR para revisão pela área responsável.
- A pessoa que identifica um possível problema de segurança encontra um canal privado com instruções de uso.
- A equipe de manutenção comprova as configurações consultadas e executa os testes do backend sem introduzir ruído de compilação na revisão.

## Escopo

### Incluído

- Referenciar no README o sistema LabOn aprovado pelo cliente e identificar os seis fluxos principais. Não exigir protótipo independente, pois não existe um aprovado no escopo informado pelo usuário.
- Definir com o responsável um meio de consulta ao backlog compatível com o barema, testar o acesso e atualizar os materiais de entrega.
- Retirar do índice os artefatos gerados em `backend/Tests/bin` e `backend/Tests/obj`, verificar o ignore e comprovar que os testes continuam executáveis.
- Oferecer modelos de bug e melhoria, instruções de divulgação responsável em `SECURITY.md` e responsabilidades de revisão em `CODEOWNERS`.
- Registrar evidências consultáveis sobre alertas do Dependabot e de code scanning e as proteções efetivamente aplicadas a `main` e `develop`.

### Fora de escopo

- Redesenhar o sistema ou criar e validar um protótipo independente, que não integra o escopo aprovado pelo usuário.
- Alterar a visibilidade do Project #41 sem decisão do responsável sobre o meio de consulta e os dados autorizados.
- Alterar as regras de proteção ou corrigir alertas eventualmente encontrados durante a coleta.
- Limpar artefatos de outros diretórios ou reescrever o histórico do Git.

## Requisitos funcionais

### RF-001 — Tornar o sistema aprovado encontrável pelo README

A seção de telas do README deve trazer um link direto para o sistema LabOn aprovado pelo cliente e identificar os seis fluxos principais existentes. Não deve declarar a existência ou aprovação de um protótipo independente. [#492](https://github.com/ifpebj-ti/lab-solos/issues/492)

### RF-002 — Oferecer consulta verificável ao backlog

O responsável deve definir um meio de acesso compatível com o barema e com os dados autorizados. Pelo meio aprovado, o avaliador deve conseguir consultar itens, prioridades, estados e vínculos com requisitos, PRDs ou issues. Os materiais de entrega devem indicar o link ou procedimento de acesso. [#493](https://github.com/ifpebj-ti/lab-solos/issues/493)

### RF-003 — Retirar saídas geradas do controle de versão

Os artefatos gerados em `backend/Tests/bin` e `backend/Tests/obj` devem sair do índice Git e continuar fora das alterações versionáveis após restauração, compilação e testes. Essas atividades devem funcionar em checkout limpo. [#495](https://github.com/ifpebj-ti/lab-solos/issues/495)

### RF-004 — Orientar relatos de bug e melhoria

O repositório deve oferecer modelos distintos para relatar bug e propor melhoria. Cada modelo deve orientar o registro do contexto, do resultado esperado e de critérios verificáveis no padrão de contribuição do projeto, incluindo a reprodução ou observação atual para relatos de bug. [#496](https://github.com/ifpebj-ti/lab-solos/issues/496)

### RF-005 — Indicar um canal privado de segurança

O arquivo `SECURITY.md` deve informar como enviar relatos de segurança por um canal privado funcional, confirmado com as pessoas responsáveis pelo recebimento. [#496](https://github.com/ifpebj-ti/lab-solos/issues/496)

### RF-006 — Identificar responsáveis por áreas de revisão

O arquivo `CODEOWNERS` deve associar as áreas acordadas a pessoas ou equipes confirmadas com as permissões adequadas para revisar. O repositório deve refletir a atribuição em um PR que altere uma dessas áreas. [#496](https://github.com/ifpebj-ti/lab-solos/issues/496)

### RF-007 — Registrar as evidências de alertas e proteções

Os materiais da entrega devem indicar evidências datadas para o repositório `ifpebj-ti/lab-solos`. O registro de alertas deve mostrar contagens, filtros de estado e severidade aplicáveis e o nível de permissão usado na consulta a Dependabot e code scanning. O registro de proteção deve mostrar as regras efetivamente aplicadas a `main` e `develop` e os checks exigidos para cada branch. [#497](https://github.com/ifpebj-ti/lab-solos/issues/497)

## Requisitos não funcionais

### RNF-001 — Limitar a exposição ao conteúdo autorizado

O meio de consulta do backlog e os materiais de evidência devem expor somente os dados autorizados para o perfil da avaliação. O registro do perfil ou nível de acesso usado na coleta deve omitir credenciais. [#493](https://github.com/ifpebj-ti/lab-solos/issues/493) · [#497](https://github.com/ifpebj-ti/lab-solos/issues/497)

### RNF-002 — Delimitar a validade das evidências

As evidências de segurança devem informar data, fonte, escopo, filtros e permissão usada. Quando uma consulta estiver indisponível ou incompleta, a limitação deve ficar explícita. Uma contagem igual a zero deve corresponder a uma consulta concluída com a permissão necessária. [#497](https://github.com/ifpebj-ti/lab-solos/issues/497)

## Critérios de aceitação

### CA-001 — Referência ao sistema aprovado (RF-001)

- **Dado** que o cliente aprovou o sistema LabOn em andamento e não existe protótipo independente aprovado
- **Quando** a pessoa avaliadora consulta a seção de telas do README
- **Então** encontra o sistema publicado e a lista dos seis fluxos existentes, sem que a documentação alegue aprovação de um protótipo separado.

### CA-002 — Consulta ao backlog com o perfil aprovado (RF-002, RNF-001)

- **Dado** que o responsável aprovou o meio de consulta e o recorte de dados permitido
- **Quando** o avaliador segue o procedimento publicado com o perfil destinado à avaliação
- **Então** consegue verificar prioridades, estados e vínculos de uma amostra de itens com requisitos, PRDs ou issues, dentro do recorte autorizado.

### CA-003 — Validação de acesso ao backlog encontra bloqueio (RF-002, RNF-001)

- **Dado** que o perfil destinado à avaliação recebe uma restrição de acesso ou visualiza um recorte incompleto
- **Quando** a equipe valida o procedimento e a amostra de itens
- **Então** registra a limitação e quais evidências faltam verificar, aguardando um meio aprovado que as torne consultáveis antes de aceitar a entrega.

### CA-004 — Restauração, compilação e testes sem artefatos rastreados (RF-003)

- **Dado** um checkout limpo e os pré-requisitos usuais para os testes do backend
- **Quando** a pessoa revisora verifica o índice e executa a restauração, a compilação e os testes
- **Então** todos os comandos terminam com sucesso, nenhum artefato de `backend/Tests/bin` ou `backend/Tests/obj` consta no índice e os novos arquivos gerados nesses caminhos permanecem ignorados pelo Git.

### CA-005 — Seleção de modelos de issue (RF-004)

- **Dado** que uma pessoa abre o seletor de criação de issue
- **Quando** examina os modelos de bug e melhoria
- **Então** encontra os dois modelos com orientações para descrever o contexto, o resultado esperado e critérios verificáveis adequados à demanda.

### CA-006 — Relato privado recebido (RF-005)

- **Dado** um relato benigno de teste preparado com a equipe responsável
- **Quando** a pessoa segue as instruções de `SECURITY.md` e envia o relato pelo canal indicado
- **Então** a equipe confirma o recebimento em ambiente privado.

### CA-007 — Área encaminhada para revisão (RF-006)

- **Dado** que a equipe acordou a área e confirmou o acesso dos responsáveis
- **Quando** um PR de teste altera arquivos dessa área
- **Então** a solicitação de revisão identifica os responsáveis definidos em `CODEOWNERS`.

### CA-008 — Evidências de alertas e regras conferíveis (RF-007, RNF-001, RNF-002)

- **Dado** que a coleta foi realizada com permissão autorizada para verificar alertas e regras do repositório
- **Quando** uma pessoa revisora consulta o registro e compara uma amostra com a fonte
- **Então** encontra as contagens de Dependabot e code scanning com data, filtros e nível de acesso, além das regras e checks vigentes para `main` e `develop`, sem credenciais no material.

### CA-009 — Consulta de segurança parcial ou indisponível (RF-007, RNF-002)

- **Dado** que a permissão utilizada não permite consultar uma fonte ou parte das regras
- **Quando** a equipe registra o resultado
- **Então** identifica o dado indisponível, o escopo consultado e a limitação observada, sem converter a falta de acesso em contagem zero.

## Estratégia de validação

- Conferir documentalmente o link do sistema e os seis fluxos no README. A aprovação do sistema é informação confirmada pelo usuário; não representa uma nova sessão de avaliação nem teste de protótipo independente. Registrar separadamente os resultados de acesso ao backlog.
- Repetir restauração, compilação e testes do backend em checkout limpo e registrar a saída da lista de arquivos rastreados e o estado do Git após a execução.
- Conferir o seletor de issues, o recebimento de um relato benigno em canal privado e a atribuição de revisão em PR de teste.
- Coletar as consultas de alertas e proteções com acesso autorizado próximo à data da entrega. Registrar data, escopo, filtros, nível de acesso, regras aplicadas e checks exigidos. Conferir se as evidências consultáveis pelo avaliador respeitam as permissões aprovadas.

## Dependências e riscos

- [Documentação da primeira entrega](../documentacao-primeira-entrega/prd.md), README, guia de contribuição e Project #41 fornecem o contexto. O usuário confirmou que o sistema em andamento foi aprovado pelo cliente; acesso ao Project ainda depende do responsável com permissão.
- Alertas e proteções podem mudar entre coleta e avaliação. O registro datado deve apontar para a fonte e identificar limites de acesso.
- Atribuições de revisão dependem de nomes, áreas e permissões confirmados. O canal de segurança depende de um destinatário que confirme o recebimento privado.

## Suposições

- Fato confirmado pelo usuário em 2026-11-24 — O cliente aprovou o sistema LabOn em andamento; não há protótipo independente aprovado.
- Suposição — Os materiais de entrega atuais podem indicar o acesso ao sistema, ao backlog e às evidências após confirmação das permissões.

## Perguntas abertas

As escolhas desta etapa constam no [registro local de decisões](../decisoes-de-planejamento.md#pré-requisitos-operacionais).

- Pergunta aberta — Qual meio de consulta ao backlog o responsável aprova para o perfil do avaliador e qual recorte atende ao barema?
- Pergunta aberta — Quais áreas, responsáveis com acesso e canal privado deverão constar de `CODEOWNERS` e `SECURITY.md`?
- Pergunta aberta — Quem fará a coleta autorizada de alertas e proteções para a Unidade 1 e em que meio as evidências poderão ser consultadas?

## Decisões da validação de descoberta

| Decisão | Recomendação | Resposta confirmada | Impacto |
| --- | --- | --- | --- |
| Validação de descoberta | Usar o diagnóstico e o recorte registrados nas issues | Grilling dispensado pelo usuário | As decisões ainda necessárias aparecem nas perguntas abertas |
| Referência visual | Procurar protótipo independente e confirmar perfil | Usar o sistema LabOn em andamento, aprovado pelo cliente; não há protótipo independente aprovado | Confirmada pelo usuário em 2026-11-24 | O README lista o sistema e os seis fluxos da apresentação de 2026-11-04; não se alega nova sessão de avaliação |
| Acesso ao backlog | Validar o meio aprovado com o perfil destinado à avaliação | Meio pendente de confirmação do responsável em #493 | O aceite depende da consulta ao recorte autorizado |
