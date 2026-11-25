# Tarefas — Governança e evidências da entrega

- Status: 9 de 14 tarefas concluídas; 5 permanecem bloqueadas por dependências operacionais externas.
- PRD: [Governança e evidências da entrega](./prd.md)
- Especificação técnica: [Governança e evidências da entrega](./techspec.md)
- Atualizado em: 2026-11-24

Ler o PRD e a especificação técnica antes de executar cada tarefa. As ondas registram a ordem após a liberação dos bloqueios. Edições locais, consultas com perfil de avaliação e ações de validação na plataforma têm evidências próprias. O Project #41 permanece privado durante a definição e a demonstração do meio de consulta.

## Ondas de execução

| Onda | Tarefas                      | Motivo de segurança do paralelismo                                                                                                                                           |
| ---- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | T001, T002, T003, T007, T008 | Roteiro de evidências, modelos de issue, índice do backend e metadados de segurança e revisão possuem caminhos distintos. Executar os testes do backend em checkout próprio. |
| 2    | T004, T009, T010             | O guia de contribuição usa o README em janela exclusiva. Coletas de alertas e proteções usam fontes e registros de trabalho distintos.                                       |
| 3    | T005, T011, T012, T013, T014 | A referência ao sistema, o registro agregado e os três procedimentos de validação usam evidências distintas. Agendar ações no serviço apenas em ambiente autorizado.         |
| 4    | T006                         | A atualização do backlog usa em sequência os dois arquivos que as etapas anteriores editaram.                                                                                |

## Coordenação entre planos

- Em uma execução conjunta com cobertura e segurança, usar janela exclusiva para `README.md`. Priorizar T004 e agendar as alterações de T005, T006 e [cobertura e segurança T009](../cobertura-e-seguranca-na-ci/tasks.md#t009--publicar-a-referência-confiável-de-cobertura-no-readme) conforme a ordem de liberação. T006 e T011 também requerem janelas distintas para `docs/entregas/unidade-1/validacao.md`. Cada tarefa parte da versão mais recente dos arquivos.
- Confirmar a posse antes de agendar tarefas de outros planos. As coletas de T009 e T010 usam fontes autorizadas de leitura, sem acionar a sincronização do Project nem alterar as proteções de branches.

## T001 — Preparar o roteiro local de evidências de segurança e proteção

- Status: concluída
- Issue: #497
- Dependências: nenhuma
- Dependências externas: [documentação da primeira entrega T014](../documentacao-primeira-entrega/tasks.md#t014--registrar-confirmações-reservadas-de-nathan), referência existente para registros sanitizados.
- Paralela: sim
- Requisitos: RF-007, RNF-001, RNF-002, CA-008, CA-009
- Caminhos sob responsabilidade: `.codex/docs/specs/governanca-e-evidencias-da-entrega/evidencias/T001.md`

### Escopo

Criar um roteiro local com amostras fictícias para registrar fonte, repositório, escopo, data/hora e fuso, filtros, nível de acesso, resultado, campos permitidos e abrangência da coleta. Prever estados completo, parcial e indisponível, subtotais identificados e regras efetivas por branch.

### Critérios de conclusão

- Consulta completa e com acesso suficiente pode registrar zero. Permissão insuficiente e paginação interrompida explicitam limite, parte consultada e contagem inconclusiva.
- O roteiro contempla severidade ausente, combinação de proteção clássica e rulesets, diferença entre check executado e exigido e ausência de credenciais ou detalhes privados no registro.

### Validação documental

- Aplicar o roteiro aos casos sintéticos de consulta completa e vazia, consulta paginada incompleta, permissão negada, alerta sem severidade e regras de fontes distintas nas duas branches.
- Revisar as amostras conforme os campos e estados da [especificação técnica](./techspec.md#dados-e-migrações).

## T002 — Oferecer modelos locais distintos para bug e melhoria

- Status: concluída
- Issue: #496
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-004, CA-005
- Caminhos sob responsabilidade: `.github/ISSUE_TEMPLATE/bug.md`, `.github/ISSUE_TEMPLATE/melhoria.md`, `.github/scripts/tests/test_issue_templates.py`

### Escopo

Ajustar o modelo atual de melhoria e criar o modelo de bug no diretório já utilizado pelo repositório. Ambos orientam contexto, objetivo, resultado esperado e critérios verificáveis. O modelo de bug inclui passos de reprodução ou comportamento observado.

### Critérios de conclusão

- Os modelos têm metadados iniciais válidos, nomes distintos e os campos exigidos. A checagem de contrato local reproduz a falta de qualquer modelo ou campo necessário.

### Plano TDD

- RED: acrescentar o contrato editorial para dois modelos e os campos específicos. Observar a falha pelo modelo de bug ausente. Validar o contrato com fixtures sem metadados ou sem campos obrigatórios.
- GREEN: criar o modelo de bug e completar o modelo de melhoria.
- REFACTOR: alinhar a redação ao guia de contribuição e repetir a conferência dos campos obrigatórios.

### Validação

- Após escrever o teste, executar `python -m unittest discover -s .github/scripts/tests -p "test_issue_templates.py" -v`.
- Executar `python -m unittest discover -s .github/scripts/tests -p "test_*.py" -v`. O seletor do GitHub será conferido em T012.

## T003 — Retirar saídas geradas do índice do backend e comprovar checkout limpo

- Status: concluída
- Issue: #495
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-003, CA-004
- Caminhos sob responsabilidade: entradas do índice de `backend/Tests/bin/**` e `backend/Tests/obj/**`, `backend/.gitignore` somente se houver saída em escopo ainda versionável, `.codex/docs/specs/governanca-e-evidencias-da-entrega/evidencias/T003.md`

### Escopo

Os diretórios em escopo têm alterações locais preexistentes no workspace. Fazer a limpeza do índice em checkout isolado para preservar essas alterações. Enumerar ali os arquivos rastreados, confirmar que são saídas geradas e retirar do índice somente essas entradas. Manter arquivos de origem e `packages.lock.json`. Reutilizar as regras existentes de ignore e ajustar apenas lacunas comprovadas.

### Critérios de conclusão

- Um checkout limpo da mudança restaura, compila e testa com o SDK do repositório e Docker. O índice fica vazio nos dois caminhos e novas saídas permanecem ignoradas após a execução.

### Plano de verificação

- RED: registrar as entradas atuais com `git ls-files -- backend/Tests/bin backend/Tests/obj` e a falha da condição de índice vazio.
- GREEN: remover as saídas confirmadas do índice e executar a sequência abaixo em checkout limpo da revisão candidata.
- REFACTOR: revisar a lista de mudanças e conservar as regras existentes que já cobrem as saídas. Repetir a sequência depois de qualquer ajuste no ignore.

### Validação

- Executar `dotnet restore backend/backend.sln --locked-mode`, `dotnet build backend/backend.sln --no-restore -c Release --nologo --disable-build-servers`, `docker info` e `dotnet test backend/backend.sln --no-build --no-restore -c Release --nologo --disable-build-servers`.
- No checkout de validação, executar `git ls-files -- backend/Tests/bin backend/Tests/obj`, `git check-ignore --no-index -- backend/Tests/bin/arquivo-gerado.tmp backend/Tests/obj/arquivo-gerado.tmp` e `git status --porcelain=v1 --untracked-files=all -- backend/Tests/bin backend/Tests/obj`.

## T004 — Orientar a escolha dos modelos na documentação de contribuição

- Status: concluída
- Issue: #496
- Dependências: T002
- Paralela: não
- Requisitos: RF-004, CA-005
- Caminhos sob responsabilidade: `README.md`, `CONTRIBUTING.md`

### Escopo

Atualizar as referências de contribuição que apontam para um único modelo. Orientar a decisão entre bug e melhoria e manter visíveis a issue anterior ao PR, o vínculo exigido e os critérios verificáveis.

### Critérios de conclusão

- README e guia apresentam o mesmo procedimento para escolher o modelo e relacionam as instruções aos arquivos efetivos.

### Validação documental

- Antes da edição, localizar as referências atuais com `rg -n -i "issue|template|modelo" README.md CONTRIBUTING.md`. Depois, seguir as referências locais e conferir os campos com o teste de T002.

## T005 — Referenciar a interface aprovada na seção de telas

- Status: concluída sob substituição de escopo aprovada pelo usuário
- Issue: #492
- Dependências: nenhuma
- Decisão: não existe protótipo independente aprovado; o cliente aprovou o sistema LabOn em andamento. Usar o endereço publicado do sistema e os seis fluxos existentes, sem alegar nova navegação de avaliação.
- Paralela: não
- Requisitos: RF-001, CA-001
- Caminhos sob responsabilidade: `README.md`, `.codex/docs/specs/governanca-e-evidencias-da-entrega/evidencias/T005.md`

### Escopo

Editar localmente a seção de telas com o link do sistema aprovado e os seis fluxos identificados na apresentação de 2026-11-04. Registrar o esclarecimento do usuário; não simular perfil ou percurso de avaliação.

### Critérios de conclusão

- O README aponta para o sistema aprovado e identifica os seis fluxos. A inexistência de protótipo independente e a ausência de nova sessão de avaliação ficam explícitas.

### Validação documental

- Localizar a seção com `rg -n "Telas e referências visuais" README.md`; conferir o link e os seis nomes de fluxo contra a apresentação de 2026-11-04; registrar que não houve nova navegação.

## T006 — Documentar e conferir o procedimento aprovado do backlog

- Status: concluída sob exceção explícita do usuário
- Issue: #493
- Dependências: nenhuma
- Dispensa: o usuário autorizou encerrar sem os testes de acesso que não poderá executar. Ver [evidência T006](./evidencias/T006.md) e [decisão de planejamento](../decisoes-de-planejamento.md#dispensas-e-referência-aprovada--2026-11-24). Acesso do perfil de avaliação, aceite do recorte pelo barema e confirmação dos campos/período/canal não foram verificados.
- Paralela: não
- Requisitos: RF-002, RNF-001, CA-002, CA-003
- Caminhos sob responsabilidade: `README.md`, `docs/entregas/unidade-1/validacao.md`, `.codex/docs/specs/governanca-e-evidencias-da-entrega/evidencias/T006.md`

### Escopo

Validar o meio aprovado com o perfil de avaliação e uma amostra de itens, prioridades, estados e vínculos a requisitos, PRDs ou issues. Após a conferência autorizada, atualizar localmente os materiais com o procedimento e o recorte aprovado. Registrar quais dados ou vínculos ficaram incompletos quando houver restrição.

### Critérios de conclusão

- O avaliador acessa os campos e os vínculos exigidos no período previsto. A amostra comprova o recorte e a aplicação das permissões.
- Acesso negado, vínculo inacessível ou recorte incompleto gera evidência da limitação e identificação do que falta conferir para o aceite.

### Validação documental

- Localizar as referências atuais com `rg -n "Project|backlog" README.md docs/entregas/unidade-1/validacao.md`. Repetir o roteiro com o perfil autorizado e conferir uma amostra de acesso aprovado ou a limitação observada, além do cenário de recorte incompleto com dados sintéticos.

## T007 — Documentar o canal privado de relatos de segurança

- Status: bloqueada
- Issue: #496
- Dependências: nenhuma
- Bloqueio: o endpoint somente leitura `GET /repos/ifpebj-ti/lab-solos/private-vulnerability-reporting` retornou `enabled=false`; portanto, o canal privado do GitHub não está operacional. Não há `SECURITY.md` versionado nem destinatário alternativo confirmado. Nenhuma configuração foi alterada e nenhum relato foi enviado; ver o registro de 24/11 no log abaixo.
- Paralela: não
- Requisitos: RF-005, CA-006
- Caminhos sob responsabilidade: `SECURITY.md`

### Escopo

Elaborar instruções locais de envio por canal privado, informação mínima e confirmação de recebimento. A demonstração de recebimento em ambiente autorizado fica em T013.

### Critérios de conclusão

- O arquivo apresenta instruções acionáveis para o canal acordado, com destinatário funcional e um roteiro de confirmação. A revisão verifica a visibilidade privada esperada.

### Validação documental

- Conferir a ausência inicial de instruções com `git ls-files -- SECURITY.md .github/SECURITY.md docs/SECURITY.md` e, após redigir, percorrer o procedimento em mesa com as pessoas responsáveis.

## T008 — Versionar a atribuição de revisão por área

- Status: bloqueada
- Issue: #496
- Dependências: nenhuma
- Bloqueio: não há identidades ou equipes aprovadas no checkout. A consulta somente leitura `GET /orgs/ifpebj-ti/teams` retornou HTTP 403 por falta de `admin:org`; não há `.github/CODEOWNERS` versionado. Não inventar responsáveis nem alterar permissões; ver o registro de 24/11 no log abaixo.
- Paralela: não
- Requisitos: RF-006, CA-007
- Caminhos sob responsabilidade: `.github/CODEOWNERS`, `.github/scripts/tests/test_codeowners.py`

### Escopo

Aplicar os padrões e responsáveis aprovados em `.github/CODEOWNERS`, com atenção à precedência dos padrões. Usar testes locais para vincular paths representativos às identidades acordadas e registrar a checagem de permissões. A atribuição real no GitHub fica em T014.

### Critérios de conclusão

- Os padrões são válidos, áreas acordadas têm responsáveis confirmados e casos de sobreposição resolvem conforme a precedência esperada.

### Plano TDD

- RED: testar arquivo ausente, caminho representativo sem responsável e precedência incorreta entre padrões.
- GREEN: acrescentar os padrões e responsáveis aprovados na ordem necessária.
- REFACTOR: simplificar padrões sobrepostos sem alterar os responsáveis esperados.

### Validação

- Após escrever o teste, executar `python -m unittest discover -s .github/scripts/tests -p "test_codeowners.py" -v`.

## T009 — Coletar evidências datadas de Dependabot e code scanning

- Status: concluída
- Issue: #497
- Dependências: T001
- Evidência: [snapshot agregado T009](./evidencias/T009.md), coleta completa e somente de leitura em 24/11/2026.
- Paralela: não
- Requisitos: RF-007, RNF-001, RNF-002, CA-008, CA-009
- Caminhos sob responsabilidade: `.codex/docs/specs/governanca-e-evidencias-da-entrega/evidencias/T009.md`.

### Escopo

No ambiente autorizado, consultar Dependabot e code scanning, percorrendo as páginas do escopo declarado. Registrar contagem de alertas únicos, fonte, repositório, data/hora e fuso, estados, severidades, filtros, permissão da coleta e limitações. Compartilhar dados agregados segundo a autorização definida.

### Critérios de conclusão

- Uma amostra pode ser reproduzida na fonte. Zero exige consulta completa e permissão suficiente. Falha, acesso parcial ou paginação incompleta ficam visíveis inclusive diante de uma resposta vazia.

### Validação documental

- Na coleta autorizada, usar `gh api --paginate --slurp 'repos/ifpebj-ti/lab-solos/dependabot/alerts?per_page=100'` e `gh api --paginate --slurp 'repos/ifpebj-ti/lab-solos/code-scanning/alerts?per_page=100'` com os filtros aprovados. Conferir contagem, duplicidades, paginação, identificação de severidade ausente e sanitização segundo T001.

## T010 — Coletar regras e checks efetivos das duas branches

- Status: concluída
- Issue: #497
- Dependências: T001
- Evidência: [regras efetivas T010](./evidencias/T010.md), coleta completa e somente de leitura em 24/11/2026.
- Paralela: não
- Requisitos: RF-007, RNF-001, RNF-002, CA-008, CA-009
- Caminhos sob responsabilidade: `.codex/docs/specs/governanca-e-evidencias-da-entrega/evidencias/T010.md`.

### Escopo

Consultar regras efetivas de `main` e `develop` e a proteção clássica. Registrar regras, origem, aplicação, modo, checks exigidos e associação de origem quando disponível, incluindo políticas organizacionais aplicáveis. Delimitar fontes indisponíveis.

### Critérios de conclusão

- Cada branch tem evidência datada separada, com permissão e abrangência. Os checks exigidos podem ser conferidos na fonte efetiva e se distinguem dos jobs apenas executados.

### Validação documental

- Na coleta autorizada, usar `gh api repos/ifpebj-ti/lab-solos/rules/branches/develop` e `gh api repos/ifpebj-ti/lab-solos/branches/develop/protection`, repetindo as duas consultas para `main`. Comparar uma amostra com a visualização autorizada de regras efetivas e classificar os limites conforme T001.

## T011 — Vincular as evidências de segurança aos materiais da entrega

- Status: concluída sob exceção explícita do usuário
- Issue: #497
- Dependências: T009, T010
- Dependências externas: [documentação da primeira entrega T016](../documentacao-primeira-entrega/tasks.md#t016--publicar-revisão-validada-e-concluir-aceite), formato de validação e navegação de evidências.
- Dispensa: o usuário autorizou encerrar sem os testes de acesso que não poderá executar. Os materiais foram vinculados localmente; acesso pelo perfil de avaliação não foi verificado.
- Paralela: não
- Requisitos: RF-007, RNF-001, RNF-002, CA-008, CA-009
- Caminhos sob responsabilidade: `docs/entregas/unidade-1/validacao.md`

### Escopo

Consolidar os vínculos e o procedimento de consulta aos registros aprovados. Informar a data da coleta, abrangência, fontes e limitações, preservando o histórico das evidências anteriores.

### Critérios de conclusão

- O perfil da avaliação acessa o material permitido e consegue relacionar alertas, regras e checks com fontes, filtros, horário e permissão de coleta. O registro diferencia acesso da avaliação e permissão de coleta quando distintos e omite credenciais e detalhes privados.

### Validação documental

- Comparar com a estrutura de T001 e reproduzir uma amostra de cada fonte. Conferir os vínculos com o perfil aprovado e verificar que consulta incompleta não foi registrada como zero.
- Executar `python -m unittest discover -s .github/scripts/tests -p "test_delivery_docs*.py" -v` para regressão editorial.

## T012 — Conferir os dois modelos no seletor de issues

- Status: bloqueada
- Bloqueio: O aceite depende da publicação dos modelos na branch usada pelo seletor do GitHub e da verificação dessa interface. A execução autorizada é local.
- Issue: #496
- Dependências: T002, T004
- Paralela: não
- Requisitos: RF-004, CA-005
- Caminhos sob responsabilidade: `.codex/docs/specs/governanca-e-evidencias-da-entrega/evidencias/T012.md`

### Escopo

Depois que a revisão pertinente estiver disponível na branch que fornece os modelos, verificar em leitura o seletor do GitHub. Registrar data, revisão ou referência da interface e amostra dos campos dos dois modelos.

### Critérios de conclusão

- Bug e melhoria aparecem separadamente no seletor. Ambos orientam contexto, resultado esperado e critérios verificáveis. Bug apresenta orientação de reprodução ou observação atual.

### Validação documental

- Relacionar a disponibilidade dos modelos no checkout e a evidência faltante no seletor. Repetir o teste local de T002 e abrir os dois formulários no seletor autorizado para conferir os campos, sem enviar uma issue. Registrar ausência de modelo ou campo quando houver divergência.

## T013 — Comprovar o recebimento privado de um relato benigno

- Status: bloqueada
- Issue: #496
- Dependências: T007
- Bloqueio: T007 aguarda confirmação de canal e responsáveis. A saída exige também autorização do ambiente e confirmação com quem receberá o relato benigno.
- Paralela: não
- Requisitos: RF-005, CA-006
- Caminhos sob responsabilidade: `.codex/docs/specs/governanca-e-evidencias-da-entrega/evidencias/T013.md`

### Escopo

Seguir as instruções de `SECURITY.md` no ambiente autorizado e conferir o recebimento de um relato benigno preparado com a equipe. Registrar apenas data, papel responsável, entrega e visibilidade.

### Critérios de conclusão

- A equipe confirma o recebimento no canal privado aprovado. O registro de evidência mantém somente o mínimo necessário para comprovar o procedimento.

### Validação documental

- Antes do teste, identificar o canal e registrar que falta comprovar o recebimento. Executar o roteiro benigno acordado com as pessoas responsáveis e confrontar a confirmação privada com os passos documentados. Manter o resultado pendente se a confirmação não existir.

## T014 — Comprovar a atribuição de revisão em PR de teste

- Status: bloqueada
- Issue: #496
- Dependências: T008
- Bloqueio: T008 aguarda áreas, identidades e permissões. A saída exige ambiente de validação autorizado com o arquivo presente na branch-base do PR de teste.
- Paralela: não
- Requisitos: RF-006, CA-007
- Caminhos sob responsabilidade: `.codex/docs/specs/governanca-e-evidencias-da-entrega/evidencias/T014.md`, alteração transitória de caminho aprovado para o PR de teste

### Escopo

No ambiente autorizado, conferir a atribuição de revisão em PR de teste que altera arquivo de área acordada. Verificar a branch-base, a presença de `.github/CODEOWNERS` nessa revisão, a precedência efetiva e a identidade solicitada.

### Critérios de conclusão

- A solicitação de revisão observada corresponde aos responsáveis aprovados e ao arquivo alterado. O registro identifica data, revisão-base, área e resultado.

### Validação documental

- Antes do teste, registrar a identidade esperada para o caminho e a evidência de atribuição ainda faltante. Repetir o contrato local de T008 e comparar a identidade esperada com a solicitação observada no PR de teste autorizado. Registrar ausência ou divergência da solicitação como falha.

## Log de execução

| Data       | Tarefa              | Resultado                                                  | Testes/evidências                                                                                                                                                                                                                    | Observações                                                                                                                                                                                                                                                      |
| ---------- | ------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-24 | T006                | concluída sob exceção explícita do usuário                 | Evidência local em `evidencias/T006.md`; atualização do material da Unidade 1.                                                                                                                                                       | Testes de acesso do avaliador e confirmação do barema/campos/período/canal dispensados pelo usuário; nenhum acesso positivo foi presumido.                                                                                                                       |
| 2026-11-24 | T009                | concluída                                                  | Paginação completa das APIs de Dependabot (2 páginas) e code scanning (1 página); totais agregados em `evidencias/T009.md`.                                                                                                          | Coleta somente de leitura; nenhum identificador ou detalhe individual de alerta foi persistido.                                                                                                                                                                  |
| 2026-11-24 | T010                | concluída                                                  | Regras efetivas, rulesets e rotas de proteção clássica conferidos para develop e main; evidencias/T010.md.                                                                                                                           | Rotas clássicas responderam HTTP 404; checks requeridos registrados a partir das regras efetivas.                                                                                                                                                                |
| 2026-11-24 | T011                | concluída sob exceção explícita do usuário                 | `docs/entregas/unidade-1/validacao.md` vincula T009 e T010, data, fonte e limitações.                                                                                                                                                | Acesso do perfil de avaliação não foi testado; o usuário dispensou os testes que não poderá executar.                                                                                                                                                            |
| 2026-11-24 | T005                | concluída por substituição de escopo aprovada pelo usuário | README conferido contra o mapa de seis fluxos da apresentação de 2026-11-04; evidência em `evidencias/T005.md`.                                                                                                                      | O cliente aprovou o sistema em andamento; não há protótipo independente aprovado. Não houve nova navegação com perfil de avaliador. As dispensas e coletas posteriores estão registradas nas demais entradas de 24/11/2026.                                      |
| 2026-11-24 | T007/T008/T013/T014 | bloqueadas após conferência somente de leitura             | `GET /repos/ifpebj-ti/lab-solos/private-vulnerability-reporting` retornou `enabled=false`; `GET /orgs/ifpebj-ti/teams` retornou 403 sem escopo `admin:org`; busca por `SECURITY.md`/`CODEOWNERS` não encontrou arquivos versionados. | O canal privado não está ativo e os responsáveis não podem ser identificados com o acesso atual. Nenhuma configuração ou permissão remota foi alterada, nenhum relato foi enviado e nenhum PR de teste foi criado. T013/T014 continuam dependentes de T007/T008. |
| 2026-11-15 | T002                | concluída                                                  | RED por ausência de bug.md e da seção Objetivo. GREEN 3 testes; REFACTOR e conferência integrados 5/5.                                                                                                                               | Descoberta já coberta pelo job Workflow contracts antes do merge. Verificação do seletor fica em T012.                                                                                                                                                           |
| 2026-11-16 | T001                | concluída                                                  | Verificação inicial: arquivo ausente. Roteiro final conferido com seis casos sintéticos, incluindo paginação, acesso e checks das duas branches.                                                                                     | A coleta real e a publicação de evidências permanecem nas tarefas condicionadas T009 a T011.                                                                                                                                                                     |
| 2026-11-16 | T003                | concluída                                                  | RED: 159 saídas rastreadas. Cópia isolada: restore travado, build Release, 485/485 testes e 486 saídas ignoradas. No índice principal: 159 remoções, zero fora do escopo.                                                            | Os 159 arquivos em disco preservaram tamanho e SHA-256 em verificação independente. Nenhum manifesto ou fonte incluído no stage.                                                                                                                                 |
| 2026-11-16 | T012                | bloqueada                                                  | A T002 já validou os dois modelos no checkout. A evidência de disponibilidade no seletor depende da interface do GitHub.                                                                                                             | Reavaliar após publicação da revisão pertinente e autorização para consultar o seletor.                                                                                                                                                                          |
| 2026-11-16 | T004                | concluída                                                  | RED documental: faltavam links para os dois modelos. GREEN: README e guia apontam aos dois arquivos, com o mesmo procedimento. Teste de modelos 5/5 e diff --check.                                                                  | Conferência do seletor continua registrada em T012.                                                                                                                                                                                                              |
