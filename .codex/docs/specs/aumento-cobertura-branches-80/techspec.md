# Especificação técnica — Aumento da cobertura de branches para 80%

- **Status** em execução
- **PRD** [Aumentar a cobertura de branches para 80%](./prd.md)
- **Atualizado em** 2026-11-26
- **Validação de design** desnecessária; a mudança afeta testes e documentação, sem alterar interface da aplicação
- **Validação de descoberta** dispensada pelo usuário; meta de 80% e gate de 70% confirmados

## Resumo técnico

Ampliar os testes de comportamento que exercitam branches não cobertos, até que frontend e backend alcancem pelo menos 80% cada um na fonte definida para o módulo. A fonte de backend é o `Summary.json` do ReportGenerator que acompanha o artefato HTML. No run #45727800901, SHA `df1d55f1f0bb88f0a88d792a40efe010d75efe1a`, esse sumário mostra 2521/3610 branches (69,8%); o JSON normalizado antigo mostrava 1540/1680 (91,67%) porque filtrava e deduplicava fontes. O coletor, o gate e o JSON dos badges foram alinhados ao sumário HTML. A execução mais recente desta PR com artefato válido, run `45781174292`, tentativa 1, registra frontend em 2833/3525 branches (80,37%) e backend em 2857/3610 (79,14% pela razão exata). O JSON de backend repete exatamente 2857/3610 com os mesmos metadados de execução; `Coverage policy` passou mantendo 70%. Restam 31 branches backend para a meta de 2888/3610 (80%); este `Summary.json` é a medida de referência para as próximas tarefas. Backend quality passou; quality baseline e Browser security E2E falharam, e aguardam correção/reexecução.

A alteração não eleva o gate. A política continuará exigindo 70% de branches por módulo e rejeitando medições ausentes ou inválidas. A constante `MINIMUM_PERCENT` de `.github/scripts/check_coverage.py` permanece em 70; o coletor backend passará a refletir as contagens inteiras de `summary.coveredbranches` e `summary.totalbranches` do ReportGenerator, sem arredondar a razão usada no gate. Isso faz o gate e os badges apresentarem a mesma medida do HTML. O README e o Plano de Testes devem distinguir o gate de 70% da meta de qualidade de 80%. A mudança não requer API, persistência, migração de banco ou nova infraestrutura de testes.

## Estado atual

- A cobertura oficial é dividida entre frontend e backend. No run [#45727800901](https://github.com/ifpebj-ti/lab-solos/actions/runs/45727800901), SHA `df1d55f1f0bb88f0a88d792a40efe010d75efe1a`, frontend tem 2708/3525 branches (76,82%) no JSON publicado. O `backend/Summary.json` do mesmo artefato HTML tem 2521/3610 branches (69,8%). O JSON normalizado anterior reportava 1540/1680 (91,67%) por usar outro escopo; ele não é a medida aprovada para o backend neste PRD.
- A medição mais recente válida para orientar esta execução é o run [#45781174292](https://github.com/ifpebj-ti/lab-solos/actions/runs/45781174292), tentativa 1: frontend 2833/3525 branches (80,37%); backend 2857/3610 (79,14% exatos) no `Summary.json` do artefato HTML. O JSON backend do gate/badges repete exatamente essas contagens e os metadados de execução. A meta backend exige pelo menos 2888/3610; faltam 31 branches cobertos. A cobertura de linhas não é a métrica de sucesso.
- `.github/scripts/check_coverage.py` consome JSONs schema v2, valida módulo, SHA, `run_id`, `run_attempt` e contagens, calcula a razão sem arredondar para a decisão e aplica `MINIMUM_PERCENT = 70` separadamente a cada módulo. O JSON de backend será produzido a partir do `Summary.json` do ReportGenerator. Linhas são apresentadas, mas não alteram o resultado.
- `.github/scripts/tests/test_check_coverage.py` já cobre o limiar exato de 70%, valor abaixo, falha isolada de módulo, linhas abaixo de 70% sem reprovação e relatórios inválidos. Esses testes protegem o gate existente; eles não devem ser adaptados para 80%.
- O frontend usa Vitest pelo script `test` de `frontend/package.json`. A CI executa `npm run test -- --run --coverage`, coleta `coverage-summary.json` com `.github/scripts/collect_frontend_coverage.py` e publica o relatório HTML como artefato.
- O backend usa xUnit e Coverlet em `backend/Tests/Tests.csproj`, incluído em `backend/backend.sln`. A CI executa testes de integração com Docker e a suíte completa com coleta `XPlat Code Coverage`; ReportGenerator gera HTML e `Summary.json`, então `.github/scripts/collect_backend_coverage.py` extrai as contagens do sumário para o JSON schema v2 com identidade de execução. O Cobertura bruto continua identificado e limitado ao mesmo diretório de resultados.
- O workflow `.github/workflows/container-ci.yml` executa em pull requests para `develop`, `merge_group`, pushes em `develop` e despacho manual. O job `Coverage policy` combina os artefatos e aplica a regra de 70%; `coverage-html` é retido por 30 dias. A publicação persistente dos badges só ocorre em push confiável para `develop`.
- O README e o Plano de Testes já descrevem os badges, a métrica de branches e o gate de 70%. A documentação precisa acrescentar a meta de 80% sem alterar a semântica do badge ou da aprovação da CI.

## Arquitetura proposta

1. Obter a execução oficial mais recente, conferir `frontend-coverage` e `backend-html-coverage/Summary.json` vinculados ao mesmo SHA/run e registrar percentuais e contagens. Confirmar que o JSON backend e a decisão do gate espelham as contagens inteiras do sumário HTML.
2. Usar os relatórios HTML de cobertura do mesmo run para localizar branches ainda não exercitados. Escolher casos por relevância do comportamento e priorizar qualquer módulo abaixo de 80%. Na referência consultada, backend está em 69,8% (2521/3610) e frontend em 76,82% (2708/3525).
3. Adicionar testes de caracterização/regressão nos projetos existentes: Vitest para frontend e xUnit para backend. A meta é cobrir decisões e resultados relevantes, sem alterar comportamento de produção apenas para melhorar a métrica.
4. Manter o schema v2 e o gate de 70%, mas alinhar a coleta backend ao ReportGenerator `Summary.json`. A validação de conclusão usa as fontes oficiais definidas por módulo, ainda que o gate aprove resultados válidos entre 70% e 79,99%.
5. Atualizar README e Plano de Testes para declarar a meta de 80% e, separadamente, o limiar bloqueante de 70%. Não mudar a apresentação dos badges para fazê-los parecer um gate de 80%.

A identificação de arquivos e branches específicos fica condicionada ao novo relatório de baseline, porque números e denominadores podem mudar entre execuções. Não se fixa neste documento uma lista de arquivos nem um número absoluto de branches a adicionar.

## Fluxos e componentes

### Medição e escolha dos testes

`Container CI` executa as suítes existentes. O coletor frontend normaliza a cobertura do Vitest. Para backend, ReportGenerator gera primeiro o HTML e `Summary.json` a partir do Cobertura do Coverlet; o coletor lê os contadores `coveredlines`, `coverablelines`, `coveredbranches` e `totalbranches` do objeto `summary`, acrescentando schema v2 e identidade de SHA/run/tentativa. O `backend-coverage.json` resultante alimenta gate, badges e sumário combinado, portanto suas contagens de branches devem coincidir com o HTML. Os artefatos detalhados apontam os arquivos e ramos não visitados.

### Verificação durante a implementação

- Vitest roda o teste de caracterização novo junto à suíte frontend. O relatório local demonstra que a execução nova cobre o branch selecionado.
- xUnit roda os testes selecionados junto à suíte backend quando essa área precisar de aumento ou proteção contra regressão.
- A suíte `.github/scripts/tests/test_check_coverage.py` preserva os resultados de 70% e abaixo de 70%; os testes do coletor devem provar que os contadores do JSON backend são iguais aos de `Summary.json` e que sumários inválidos falham. Não se cria teste que trate 80% como condição de aprovação.

### Verificação da conclusão

A pull request para `develop` recebe os jobs pré-merge existentes. O frontend deve indicar pelo menos 80% no JSON oficial; backend deve indicar pelo menos 80% no `Summary.json`/HTML e no JSON usado pelo gate e badge, com contagens idênticas. `Coverage policy` continua aprovando conforme o gate exato de 70%. Badges persistentes são atualizados apenas depois de push confiável em `develop`; o artefato da execução da PR serve para a conferência pré-merge.

## Contratos e APIs

- Não há alteração de endpoints, DTOs, autenticação ou contratos de produto.
- O contrato de cobertura permanece no schema v2: cada JSON identifica `module`, `sha`, `run_id`, `run_attempt` e as métricas de `lines` e `branches`, ambas com `covered` e `total` inteiros válidos.
- Para backend, `metrics.branches` copia `summary.coveredbranches` e `summary.totalbranches` do ReportGenerator `Summary.json`, agregando todos os assemblies que ele inclui (no run consultado, `E2ESeed` e `LabSolos-Server-DotNet8`), sem filtro adicional. O coletor executa depois do HTML, exige que ambos os arquivos pertençam ao diretório da mesma tentativa e falha em sumário ausente, malformado ou com contagens inválidas. A fonte do frontend permanece inalterada.
- O limite usado pelo checker continua em 70% por módulo. A meta de 80% é uma condição de conclusão da melhoria e de comunicação documental, não uma propriedade nova do JSON nem um status de gate.
- O denominador usado para comparar a meta deve ser o do relatório oficial de cada execução. Não transportar contagens absolutas da execução de baseline para uma execução posterior.

## Dados e migrações

Nenhuma mudança em banco, armazenamento de aplicação ou modelos de domínio. Os relatórios locais e da CI permanecem artefatos derivados das suítes existentes, com a identidade e a retenção já definidas. A evidência de baseline e resultado deve registrar os percentuais/contagens de cada módulo e os SHAs e execuções correspondentes.

## Segurança, privacidade e permissões

A proposta alinha o coletor e a ordem dos passos do workflow ao sumário HTML já gerado. Não modifica permissões de jobs, `GITHUB_TOKEN`, branch `coverage` ou proteções de branch. Manter a política atual: PRs podem enviar relatórios como artefatos de CI, mas não publicam badges persistentes. Não incluir segredos, dados reais ou conteúdo sensível nos testes, relatórios ou documentos.

## Falhas, observabilidade e operação

- **Baseline indisponível ou divergente:** registrar a fonte e a identidade consultadas e repetir a coleta oficial; divergência entre gate/backend JSON/badge e HTML invalida a coleta e precisa ser corrigida.
- **Qualquer módulo abaixo de 70% ou relatório ausente/inválido:** o gate existente reprova; corrigir a regressão sem reduzir filtros ou aumentar exclusões.
- **Módulo entre 70% e 80%:** a CI pode aprovar conforme política confirmada, mas a melhoria ainda não atende ao critério de conclusão de 80% por módulo. O backend observado está em 69,8%, abaixo do limite exato de 70% até que mais branches sejam cobertos.
- **HTML/JSON ausente ou de identidade diferente:** tratar como evidência inválida conforme a regra existente, nunca como resultado atual.
- **Variação de denominador:** comparar percentuais e contagens de cada SHA/run, sem atribuir o ganho apenas ao percentual arredondado.
- **Aumento por exclusões:** comparar filtros e arquivos incluídos com a baseline; qualquer mudança de escopo precisa de justificativa de correção independente, não de meta.

Usar a saída do job `Coverage policy`, o JSON de frontend, o JSON backend derivado de ReportGenerator, `coverage-html` e os relatórios detalhados do artefato da mesma execução para verificar o resultado. O workflow mantém os artefatos por 30 dias; a branch `coverage` contém somente os badges/sumários mais recentes.

## Compatibilidade, disponibilização e reversão

Não há alteração de compatibilidade ou implantação da aplicação. Os testes são exercitados no fluxo de pull request já existente, que roda para `develop`. O workflow muda a ordem da geração do HTML e da coleta do JSON backend para que gate e badges usem o sumário visível; o limiar de 70% permanece.

Se um teste novo for instável ou codificar comportamento incorreto, corrigi-lo ou removê-lo e reavaliar a meta; não alterar o gate para acomodá-lo. Se o README ou a Wiki sugerir que 80% é obrigatório para a CI, corrigir a redação antes da entrega. Se a coleta ReportGenerator não corresponder ao HTML, corrigir o adaptador antes de publicar; uma reversão técnica reverte a alteração de coletor/workflow e mantém o limiar de 70% explícito.

## Estratégia TDD e pirâmide de testes

### RED

Registrar o relatório de baseline e apontar branches elegíveis não exercitados nos arquivos selecionados. Para comportamento já implementado, escrever um teste de caracterização que execute o caso não coberto; o teste pode passar desde a primeira execução, pois o RED é a lacuna observada na cobertura, não uma falha fabricada removendo código correto. Se o caso também revelar um defeito real, registrar a falha observada e tratar a correção em escopo rastreado.

Comandos-base disponíveis:

- Frontend (na pasta `frontend`): `npm run test -- --run --coverage`.
- Backend no CI: `dotnet test backend/Tests/Tests.csproj -c Release --nologo --disable-build-servers --collect:"XPlat Code Coverage" --results-directory ".tmp/coverage/backend/${GITHUB_RUN_ID}/${GITHUB_RUN_ATTEMPT}"`.
- Contrato do gate: `python -B -m unittest discover -s .github/scripts/tests -p test_check_coverage.py -v`.
- Contrato do coletor backend: `python -B -m unittest discover -s .github/scripts/tests -p test_collect_backend_coverage.py -v`.

### GREEN

Executar o teste focado e a suíte do módulo alvo; comparar o JSON e o relatório HTML com a baseline. O caso novo deve aumentar branches exercitados sem modificar a regra de 70%. Se a cobertura já estiver acima de 80% no novo baseline, confirmar que testes selecionados mantêm a proteção dos ramos relevantes, e não inventar alterações para forçar um percentual maior.

### REFACTOR

Revisar nomes, dados e organização dos testes, remover duplicação sem perder cobertura, confirmar que filtros de fonte elegível permaneceram iguais e executar as suítes amplas. Revisar as alterações documentais e provar que nenhuma mudança elevou o limiar do checker ou da CI.

## Esteira de qualidade

| Área | Comando local | Verificação de CI | Lacuna/ação |
|---|---|---|---|
| Testes e cobertura frontend | `cd frontend; npm ci; npm run test -- --run --coverage` | `Container CI` → `Frontend quality`; publica JSON normalizado e HTML | Usar o relatório HTML para escolher testes de branches relevantes; confirmar o percentual novo no artefato oficial. |
| Qualidade frontend | `cd frontend; npm run lint; npm run build` | `Container CI` → `Frontend quality` | Nenhuma infraestrutura nova; os comandos já existem em `frontend/package.json`. |
| Compilação e integração backend | `dotnet tool restore; dotnet restore backend/backend.sln --locked-mode; dotnet build backend/backend.sln --no-restore -c Release --nologo --disable-build-servers; docker info; dotnet test backend/Tests/Tests.csproj --no-build --no-restore -c Release --nologo --disable-build-servers --filter "FullyQualifiedName~Integration|FullyQualifiedName~CredentialLifecycleMigrationTests"` | `Container CI` → `Backend quality` | Docker é necessário para o recorte de integração; preservar o filtro e a execução da suíte completa separados. |
| Testes e cobertura backend | `dotnet test backend/Tests/Tests.csproj -c Release --nologo --disable-build-servers --collect:"XPlat Code Coverage" --results-directory ".tmp/coverage/backend/local/1"`, seguido de ReportGenerator (`Html;JsonSummary`) e coletor backend com `--reportgenerator-summary` apontando para `html/Summary.json` | `Container CI` → `Backend quality`; publica JSON baseado no Summary e HTML | As contagens no JSON backend devem ser idênticas a `coveredbranches/totalbranches` do `Summary.json`. |
| Regra de cobertura | `python -B -m unittest discover -s .github/scripts/tests -p test_check_coverage.py -v` | `Container CI` → `Coverage policy` | Preservar o limiar de 70%; manter os cenários existentes de exato 70%, abaixo e falha isolada. |
| Relatórios oficiais | Baixar/inspecionar `frontend-coverage`, `backend-coverage`, `backend-html-coverage` e `coverage-html` do run | `Container CI` em PR para `develop`; `Publish coverage badges` somente em push confiável para `develop` | Registrar SHA, `run_id`, `run_attempt`, contagens e percentual por módulo; comparar backend JSON, HTML e gate pela mesma contagem, sem depender da atualização pós-merge dos badges. |
| Documentação | `git diff --check -- README.md`; revisar localmente `../lab-solos.wiki/Plano-de-Testes.md` | `Documentation quality` para os arquivos cobertos pelo workflow; PR para revisão integrada | Conferir manualmente o checkout da Wiki e verificar que o texto distingue meta 80%, gate 70% e linhas informativas. |

O fluxo de PR para `develop` conta como validação pré-merge para os jobs configurados em `.github/workflows/container-ci.yml`. `Publish coverage badges` é deliberadamente pós-merge e não deve ser apresentado como proteção pré-merge.

## Matriz de rastreabilidade

| Requisito | Componentes | Testes | Evidência |
|---|---|---|---|
| RF-001, CA-002, RNF-001, CA-005 | Testes Vitest e/ou xUnit escolhidos a partir dos relatórios HTML; coletor backend alinhado ao ReportGenerator | Caracterização/regressão dos caminhos não cobertos; suíte completa do módulo alterado | JSONs e HTML com percentuais/contagens por módulo após o novo SHA/run; ambos em pelo menos 80% sem ampliar artificialmente o escopo. |
| RF-002, RF-005, CA-003, CA-006 | `.github/scripts/check_coverage.py`, `.github/scripts/collect_backend_coverage.py`, job `Coverage policy`, publicação de badges | Cobertura existente do checker para 70%; teste do coletor para igualdade entre ReportGenerator Summary e JSON | CI mantém 70%; gate, JSON do badge e HTML backend compartilham exatamente as mesmas contagens. |
| RF-003, CA-004 | `README.md`, Wiki `Plano-de-Testes.md` | Revisão documental e `git diff --check`; `Documentation quality` onde aplicável | Texto publicado/revisado diferencia meta de 80%, gate de 70% e cobertura de linhas. |
| RF-004, CA-001, CA-002, RNF-002 | Coletores, `Summary.json`, artefatos de cobertura da CI e registro de baseline/resultado | Conferência de schema/identidade por SHA, execução e tentativa; teste do coletor backend | Dois registros por módulo com contagem, percentual, SHA e `run_id`; execução identificada; backend corresponde ao HTML. |
| RNF-002, CA-005 | Coletores e fontes elegíveis atuais | Comparar identidade, contagens e filtros dos relatórios anterior/posterior | Mudança de percentual rastreável ao mesmo escopo de código e a branches exercitados. |

## Alternativas e decisões

| Decisão | Alternativas | Recomendação | Escolha confirmada | Consequências |
|---|---|---|---|---|
| Meta e gate | Exigir 80% na CI ou manter 70% como gate e 80% como objetivo de qualidade | Manter gate de 70% e medir conclusão da melhoria em 80% por módulo | Confirmada pelo usuário e registrada na issue #512 | Resultados de 70% a menos de 80% continuam sem falha de CI, mas não concluem a meta. |
| Avaliação dos módulos | Média combinada ou resultados independentes | Exigir 80% individual em frontend e backend | Confirmada pelo PRD e issue #512 | Um módulo alto não mascara o outro; a baseline é registrada separadamente. |
| Fonte de backend | JSON normalizado anterior ou ReportGenerator Summary visível no artefato HTML | Usar `Summary.json` para métrica backend e alinhar JSON do gate/badge | Confirmada pelo usuário após inspecionar o run #45727800901 | A contagem observada passa a 2521/3610 (69,8%); o gate de 70% reprova sem arredondamento. |
| Aumento de cobertura | Acrescentar testes de comportamento ou alterar filtros/exclusões | Acrescentar testes sem ampliar artificialmente o escopo do ReportGenerator | Confirmada pela issue/PRD; exclusões para inflar foram rejeitadas | A fonte backend fica explícita; testes novos devem elevar os branches exercitados nessa mesma fonte. |

## Riscos e mitigação

- **A baseline mais recente pode mudar antes do início:** recolher novo JSON oficial e registrar SHA/run/contagens antes de selecionar casos.
- **A correção da fonte pode reprovar o gate atual:** o backend observado está em 69,8%, abaixo de 70%; preservar o limiar e elevar a cobertura por testes antes de exigir aprovação.
- **JSON e HTML podem voltar a divergir:** gerar o JSON backend somente a partir do `Summary.json` da mesma tentativa e comparar contagens antes de publicar badges.
- **Testes podem elevar cobertura sem representar comportamento importante:** priorizar decisões de domínio, autorização, erros e limites observáveis; revisar a justificativa de cada conjunto.
- **A atualização dos documentos pode dar a entender que o gate foi elevado:** usar termos distintos, revisar a afirmação nos dois documentos e não alterar o checker.
- **Backend pode perder cobertura durante mudanças simultâneas:** executar a suíte completa e confirmar que o módulo permanece em pelo menos 80% no relatório oficial.
- **Flakiness aumenta custo da CI:** utilizar padrões de fixtures e isolamento existentes; não misturar testes de integração Docker com testes unitários rápidos sem justificativa.

## Perguntas abertas

Nenhuma decisão de produto ou arquitetura bloqueia a decomposição. O usuário definiu o `Summary.json` do artefato HTML como medida de backend; a primeira tarefa confirmará a execução mais recente e registrará as contagens sem reabrir a decisão da fonte.
