# Tarefas — Cobertura e segurança na CI

- Status: T007 passou localmente após correção da captura; CI #45539003181 ainda falhou antes dessa correção. Nova CI pendente. T011 aguarda CI válida; navegação humana dispensada
- PRD: [Cobertura e segurança na CI](./prd.md)
- Especificação técnica: [Cobertura e segurança na CI](./techspec.md)
- Atualizado em: 2026-11-25

Ler o PRD e a especificação técnica antes de executar cada tarefa. Os caminhos partem da raiz do repositório, inclusive o caminho relativo para a Wiki irmã. As ondas registram a ordem após a liberação dos bloqueios. Em cada onda, agendar somente tarefas com dependências concluídas e reconferir a posse de arquivos quando houver execução de outros planos.

T001–T010 estão concluídas localmente. O run #45535221035 passou os seis testes do navegador, mas falhou fechado na captura porque o cenário de perfis terminou com três fontes em andamento; após aguardar fontes e ampliar a drenagem limitada, T007 passou localmente, pendente de nova CI. T011 registra as verificações e mantém a dispensa apenas da navegação humana com perfil de avaliação.

## Ondas de execução

| Onda | Tarefas                | Motivo de segurança do paralelismo                                                                                 |
| ---- | ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1    | T001, T004, T006       | Validador com fixtures, documentação da Wiki e caracterização da stack existente têm escrita e recursos distintos. |
| 2    | T002, T003, T005, T007 | A coleta dos módulos, a análise estática e a análise passiva devem ter arquivos e dados temporários próprios.      |
| 3    | T008                   | Um único responsável integra os componentes ao workflow e ao gate pré-merge.                                       |
| 4    | T009                   | Publicação do indicador e integração com o README após definir a origem dos resultados.                            |
| 5    | T010                   | Fechamento do Plano de Testes e do vínculo documental com a revisão.                                               |
| 6    | T011                   | Aceite cruzado de CI, README e Wiki com o perfil de avaliação autorizado.                                          |

## Coordenação entre planos

- Em `.github/workflows/container-ci.yml` e `.github/scripts/tests/test_container_ci_workflow.py`, priorizar a alteração independente de [rastreabilidade de releases T007](../rastreabilidade-de-releases/tasks.md#t007--estender-actionlint-ao-workflow-de-release-no-pré-merge). T008 edita os arquivos em janela exclusiva, sobre suas versões mais recentes.
- Em `README.md`, priorizar a atualização local de [governança T004](../governanca-e-evidencias-da-entrega/tasks.md#t004--orientar-a-escolha-dos-modelos-na-documentação-de-contribuição) e reservar janelas exclusivas para T009 e as edições de protótipo e backlog daquele plano. Usar a ordem de liberação para as tarefas bloqueadas e conferir a versão mais recente do arquivo antes de cada edição.
- Reservar uma janela para a integração de T007 em `frontend/playwright.config.ts`. Coordenar com [cadastro de produtos T012](../cadastro-de-produtos/tasks.md#t012--validar-a-virada-do-dia-no-cadastro-e-em-alertas), [integridade de produtos e lotes T011](../integridade-de-produtos-e-lotes/tasks.md#t011--validar-desativação-edição-e-leitura-histórica-em-conjunto), [listagem e alertas T009](../listagem-e-alertas-de-produtos/tasks.md#t009--comprovar-a-classificação-e-as-permissões-no-navegador) e [notificações e auditoria T010](../notificacoes-e-auditoria/tasks.md#t010--validar-notificações-e-auditoria-na-composição-descartável). Identificar os arquivos concretos de teste de T002 e T003 após medir a linha de base, antes de agendar mudanças em paralelo com outros planos.

## T001 — Validar proporção e vínculo da cobertura com a execução

- Status: concluída
- Issue: #487
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-001, RF-002, RNF-002, CA-001, CA-002
- Caminhos sob responsabilidade: `.github/scripts/check_coverage.py`, `.github/scripts/tests/test_check_coverage.py`, `.github/scripts/tests/fixtures/coverage/**`

### Escopo

Validar um contrato de entrada em contagens normalizadas, com módulo, métrica declarada, numerador, denominador, SHA, execução e tentativa esperados. Tratar aprovação, cobertura abaixo do limiar e medição inválida por módulo. A entrada real dos coletores e a métrica adotada ficam nas tarefas T002 e T003.

### Critérios de conclusão

- Aprovar somente os dois módulos válidos e com pelo menos 70% nas contagens originais. Informar módulo, valores e causa nas falhas.
- Rejeitar arquivo ausente, vazio ou ilegível, módulo inesperado ou duplicado, denominador zero, contagens inconsistentes, métrica divergente e resultado de outra revisão, execução ou tentativa.

### Plano TDD

- RED: usar fixtures sintéticas com 70% nos dois módulos, apenas frontend abaixo, apenas backend abaixo, 69,99%, resultado repetido e formas inválidas. Confirmar falha pela ausência do verificador ou do diagnóstico esperado.
- GREEN: validar cada resultado e calcular a proporção sem arredondar antes da decisão. Retornar um diagnóstico inequívoco para cada módulo.
- REFACTOR: manter a comparação e a identificação das entradas em um ponto comum. Repetir as fixtures após simplificar a apresentação.

### Validação

- Após escrever o teste, executar `python -m unittest discover -s .github/scripts/tests -p "test_check_coverage.py" -v`.
- Executar `python -m unittest discover -s .github/scripts/tests -p "test_*.py" -v`.

## T002 — Coletar e conferir a cobertura de frontend

- Status: concluída
- Issue: #487
- Dependências: T001
- Dependências externas: [fundação de qualidade T004](../fundacao-qualidade-testes/tasks.md#t004--fixar-nodenpm-e-tornar-os-metadados-frontend-determinísticos), toolchain e lockfile de frontend.
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#cobertura-análise-defensiva-e-releases).
- Paralela: não
- Requisitos: RF-001, RF-002, RNF-002, CA-001, CA-002
- Caminhos sob responsabilidade: `frontend/package.json`, `frontend/package-lock.json`, `frontend/vite.config.ts`, `frontend/src/**/*.test.ts`, `frontend/src/**/*.test.tsx`, `.github/scripts/collect_frontend_coverage.py`, `.github/scripts/tests/test_collect_frontend_coverage.py`

### Escopo

Usar o Vitest instalado e um provedor compatível fixado no lockfile. Normalizar o relatório para T001 e medir a linha de base. Ampliar testes do código descoberto se necessário para alcançar 70% no escopo aprovado.

### Critérios de conclusão

- Gerar cobertura de frontend identificada e normalizada em diretório exclusivo da execução. Incluir arquivos elegíveis sem visitas e preservar as exclusões documentadas, inclusive a separação das suítes E2E.
- Registrar linha de base, teste do denominador, resultado de 70% ou mais e problema específico quando a medição não puder ser lida.

### Plano TDD

- RED: testar que o adaptador diagnostica relatório inválido e inclui no denominador um arquivo elegível sem visitas em uma amostra controlada. Caracterizar a suíte atual antes de ampliar casos de cobertura.
- GREEN: ativar o coletor, converter as contagens e acrescentar casos de teste do código descoberto conforme a linha de base.
- REFACTOR: reutilizar fixtures existentes de frontend e simplificar a configuração, preservando a separação do E2E.

### Validação

- Em `frontend`, executar `npm ci`, `npm run test -- --run --coverage` após configurar o provedor, `npm run lint` e `npm run build`.
- Após escrever o teste, executar `python -m unittest discover -s .github/scripts/tests -p "test_collect_frontend_coverage.py" -v`.

## T003 — Coletar e conferir a cobertura de backend

- Status: concluída
- Issue: #487
- Dependências: T001
- Dependências externas: [fundação de qualidade T003](../fundacao-qualidade-testes/tasks.md#t003--fixar-sdk-e-restauração-nuget-da-solução), SDK e restauração da solução.
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#cobertura-análise-defensiva-e-releases).
- Paralela: não
- Requisitos: RF-001, RF-002, RNF-002, CA-001, CA-002
- Caminhos sob responsabilidade: `backend/Tests/coverage.runsettings` se necessário para os filtros aprovados, `backend/Tests/**/*Tests.cs`, `.github/scripts/collect_backend_coverage.py`, `.github/scripts/tests/test_collect_backend_coverage.py`

### Escopo

Usar Coverlet na execução completa da solução e normalizar as contagens para T001. Medir a linha de base e acrescentar testes do código descoberto se necessário para alcançar 70%. A seleção de integração/migração continua fora da medição.

### Critérios de conclusão

- Gerar cobertura de backend em diretório exclusivo da execução, com contagens dos projetos elegíveis e identidade da execução.
- Demonstrar que a seleção direcionada e arquivos de execuções anteriores ficam fora do cálculo, que arquivos elegíveis sem visitas entram no denominador e que ausência ou erro de relatório é diagnosticado.

### Plano TDD

- RED: testar parsing inválido, denominador de amostra com arquivo elegível sem visitas e rejeição de relatórios fora do conjunto da execução completa. Caracterizar a suíte atual para planejar cobertura do código descoberto.
- GREEN: coletar uma execução completa e acrescentar testes unitários ou de integração dirigidos pelas lacunas da linha de base.
- REFACTOR: reaproveitar fixtures de xUnit e Testcontainers e repetir a coleta ampla para conferir as contagens.

### Validação

- Executar `dotnet restore backend/backend.sln --locked-mode`, `dotnet build backend/backend.sln --no-restore -c Release --nologo --disable-build-servers` e `docker info`.
- Executar `dotnet test backend/Tests/Tests.csproj --no-build --no-restore -c Release --nologo --disable-build-servers --filter "FullyQualifiedName~Integration|FullyQualifiedName~CredentialLifecycleMigrationTests"` e `dotnet test backend/backend.sln --no-build --no-restore -c Release --nologo --disable-build-servers --collect:"XPlat Code Coverage" --results-directory .tmp/coverage-backend` com os filtros aprovados quando configurados.
- Após escrever o teste, executar `python -m unittest discover -s .github/scripts/tests -p "test_collect_backend_coverage.py" -v`.

### Execução local — 2026-11-23

- RED: quatro testes Python passaram a exigir exclusão de migrations geradas, inclusão no denominador de arquivos elegíveis sem visitas, rejeição de relatórios antigos/seleções direcionadas e isolamento estrito dos artefatos por execução. A versão anterior calculou 9 linhas extras e aceitou um relatório fora da execução corrente.
- GREEN/REFACTOR: o coletor agora exige o XML do VSTest dentro do diretório GUID da execução completa e escreve o resultado normalizado na mesma pasta isolada. `py_compile` e os quatro testes direcionados passaram.
- Validação relacional direcionada/migração: 401/401. Suíte completa instrumentada: 804/804 em duas rodadas. Restore bloqueado (`--locked-mode`) e build Release passaram; build com 0 erros e 195 avisos de analyzer/compiler existentes.
- Resultado final: 7.963/9.377 linhas = **84,92%**, acima da meta de 70%. Foram elegíveis 145 arquivos, incluindo 9 sem linhas visitadas; migrations geradas, testes/suporte e artefatos ficaram fora do denominador.
- Execução final: SHA `c642854c44ff36709e75aeb3f25a3d865640eb8c`, run `local-e7e71cb486104d16ae10c15c6702e1b5`, tentativa `1`. O resumo normalizado está em `.tmp/coverage-backend/local-e7e71cb486104d16ae10c15c6702e1b5/1/backend-coverage.json` (artefato local ignorado pelo Git).

## T004 — Documentar no Plano de Testes o estado da esteira existente

- Status: concluída
- Issue: #494
- Dependências: nenhuma
- Dependências externas: [documentação da primeira entrega T003](../documentacao-primeira-entrega/tasks.md#t003--criar-validador-editorial-com-testes-de-contrato), validador editorial existente.
- Paralela: sim
- Requisitos: RF-005, CA-006
- Caminhos sob responsabilidade: `../lab-solos.wiki/Plano-de-Testes.md`

### Escopo

Preparar localmente a atualização das camadas em uso. Identificar Vitest, xUnit, integração PostgreSQL, Playwright, CodeQL, Trivy e auditoria de dependências. Registrar JMeter como planejado segundo o estado local e distinguir a meta confirmada de 70% por módulo das decisões ainda pendentes.

### Critérios de conclusão

- Cada camada em uso aponta para comando ou workflow real, ambiente, dados, gatilhos, falhas e procedimento de consulta. A situação de Semgrep e ZAP acompanha a evidência disponível.

### Validação documental

- Antes da edição, registrar as diferenças entre a página e os workflows. Depois, conferir uma referência amostral por camada no checkout local.
- Executar `python -m unittest discover -s .github/scripts/tests -p "test_delivery_docs*.py" -v`.

## T005 — Produzir resultados defensivos de Semgrep por módulo

- Status: concluída
- Issue: #489
- Dependências: nenhuma
- Decisão registrada: Semgrep CLI `1.185.0`, regras próprias versionadas e função responsável `CI quality maintainer`; nenhuma pessoa nominal foi presumida. Ver [decisão de planejamento](../decisoes-de-planejamento.md#cobertura-análise-defensiva-e-releases).
- Paralela: não
- Requisitos: RF-003, RNF-002, CA-003, CA-005
- Caminhos sob responsabilidade: `.github/quality/semgrep/**`, `.github/scripts/check_semgrep.py`, `.github/scripts/tests/test_check_semgrep.py`, `.github/scripts/tests/fixtures/semgrep/**`

### Escopo

Configurar análise estática defensiva de React/TypeScript e C# com ferramenta e configuração reproduzíveis. Validar resultados e exceções aprovadas e emitir diagnósticos por módulo. A integração de workflow fica em T008.

### Critérios de conclusão

- O caso bloqueante falha. Exceções aprovadas, se previstas, são auditáveis por identificador, justificativa, escopo, aprovador e validade. Configuração inválida, ferramenta interrompida ou falta de módulo resulta em análise incompleta.
- O resumo identifica SHA analisado, execução/tentativa, módulos e versão da política. Usar identificadores de regra, severidade e localização relativa em vez de conteúdo analisado nas evidências.

### Plano TDD

- RED: testar resultados sintéticos de aprovação, bloqueio, exceção válida e vencida, política inválida e resultado faltante ou interrompido.
- GREEN: implementar a avaliação defensiva dos resultados produzidos pela ferramenta nas amostras controladas dos dois módulos.
- REFACTOR: usar a mesma classificação de política nos dois módulos e eliminar dados sensíveis da apresentação.

### Validação

- Após escrever o teste, executar `python -m unittest discover -s .github/scripts/tests -p "test_check_semgrep.py" -v`.
- Executar o CLI e a versão definidos pela política aprovada em código próprio e nas amostras sintéticas. Registrar o comando reproduzível nos arquivos da tarefa.

## T006 — Caracterizar a execução atual de segurança no navegador

- Status: concluída
- Issue: #490
- Dependências: nenhuma
- Dependências externas: [proteção de acesso e autenticação T024](../protecao-acesso-autenticacao/tasks.md#t024--criar-composição-descartável-com-proxy-real-e-projeto-security), composição descartável e projeto Playwright `security`.
- Paralela: sim
- Requisitos: RF-004, RNF-001, CA-004
- Caminhos sob responsabilidade: `.codex/docs/specs/cobertura-e-seguranca-na-ci/evidencias/T006.md`

### Escopo

Conferir a composição descartável, os testes existentes e os contextos Playwright de navegador e HTTP. Registrar origem local, cobertura funcional esperada de frontend e API, asserções e limitações para comprovar a chegada das mensagens ao ZAP. Esta caracterização documenta a linha de base para a decisão de captura.

### Critérios de conclusão

- Reproduzir o projeto `security` conforme o workflow atual, com dados sintéticos e limpeza da composição. Registrar casos, tipos de contexto, revisão, limitações e resultado, com metadados agregados.

### Validação documental

- No início, identificar no workflow os comandos, a origem esperada, os contextos das duas especificações e a ausência de evidência de captura passiva. Comparar a lista de asserções esperadas com o resultado registrado após a execução.
- Executar `docker compose --project-name lab-solos-ci-browser-security --file docker-compose-security-e2e.yml config --quiet` e repetir os argumentos com `up --detach --build --wait` e, ao final, `down --volumes --remove-orphans`.
- No runner Linux, executar em `frontend` `npm ci`, `npx --no-install playwright install --with-deps chromium` e `npm run test:e2e -- --project=security` com as variáveis do job `browser-security`.

## T007 — Avaliar passivamente o tráfego já gerado pela suíte de segurança

- Status: concluída localmente — aguarda CI do commit atualizado da PR
- Issue: #490
- Dependências: T006
- Decisão registrada: escopo e severidade passivos usam exclusivamente a suíte local de segurança; responsabilidade de regras atribuída à função `CI quality maintainer`, sem presumir uma pessoa nominal. Ver [decisão de planejamento](../decisoes-de-planejamento.md#cobertura-análise-defensiva-e-releases).
- Paralela: não
- Requisitos: RF-004, RNF-001, RNF-002, CA-004, CA-005
- Caminhos sob responsabilidade: `docker-compose-security-e2e.yml`, `frontend/playwright.config.ts`, `frontend/e2e/infra/security-passive-capture.ts`, `frontend/e2e/infra/security-passive-capture-policy.ts`, `frontend/e2e/infra/security-passive-capture-policy.test.ts`, `.github/quality/zap/**`, `.github/scripts/check_zap_passive.py`, `.github/scripts/run_security_zap_e2e.py`, `.github/scripts/tests/test_check_zap_passive.py`, `.github/scripts/tests/test_security_e2e_stack.py`, `.github/scripts/tests/test_security_zap_runner.py`

- Evidência anterior: Container CI run `45517310767` do commit `020fee5` registrou status Caddy 0 e dois corpos não recuperados, e falhou fechado. Reteste local posterior: suíte `security` 6/6, captura completa, conciliação proxy 291/291 e ZAP passivo `passed` em 162,045 s. O limite permanece finito em 240 s para acomodar a fila da suíte completa. Ver [evidência local](./evidencias/T007-zap-passive-2026-11-24-local-passed.json) e [registro T007](./evidencias/T007.md). A aprovação remota do commit atualizado continua pendente.

### Escopo

Conectar o processamento exclusivamente passivo às mensagens já produzidas pelo projeto `security` para a origem HTTPS descartável. Restringir a avaliação ao host e à porta da composição corrente e excluir healthchecks, serviços e tráfego do runner. Isolar o analisador e sua interface administrativa. Registrar contagens agregadas de frontend e API, prazo de processamento, diagnóstico e conclusão.

### Critérios de conclusão

- Preservar as jornadas e as asserções. Demonstrar que chegam mensagens elegíveis de frontend e API e que o analisador acrescenta zero requisições. O modo passivo fica sem sondagens, spiders, reenvios, ataques ou destinos externos.
- Classificar separadamente falha de política e resultado inválido por falta de mensagens, origem divergente, prazo excedido, relatório inválido ou falha de sanitização. Publicar somente campos permitidos. Descartar mensagens e dados temporários em sucesso, erro e cancelamento.

### Plano TDD

- RED: caracterizar a suíte existente e exercitar fixtures de aprovação, alerta passivo bloqueante em resposta controlada da mesma jornada, ausência ou atraso de mensagens e sentinelas sintéticas sensíveis. Testar o isolamento e a contagem de requisições.
- GREEN: aplicar a captura e a política aprovadas, com relatório sanitizado por lista permitida de campos e falha explícita quando inconclusivo.
- REFACTOR: reutilizar o ciclo de vida da composição e a suíte existente. Reexecutar a mesma jornada e comparar origem, asserções e volume.

### Validação

- Após escrever o teste, executar `python -m unittest discover -s .github/scripts/tests -p "test_check_zap_passive.py" -v` e `python -m unittest discover -s .github/scripts/tests -p "test_security_e2e_stack.py" -v`.
- Repetir os comandos de Compose e Playwright de T006 com a integração passiva habilitada na stack descartável. Conferir ausência de sentinelas e zero requisições acrescentadas.

## T008 — Integrar resultados e bloqueios ao pré-merge

- Status: concluída localmente sob limitações documentadas
- Issue: #487
- Dependências: T002, T003, T005, T007
- Dependências externas: [fundação de qualidade T028](../fundacao-qualidade-testes/tasks.md#t028--integrar-análise-e-resultado-obrigatório-ao-ci-pré-merge) e [proteção de acesso e autenticação T027](../protecao-acesso-autenticacao/tasks.md#t027--tornar-a-suíte-do-proxy-obrigatória-no-gate-pré-merge), infraestrutura de verificações pré-merge e gate da suíte do proxy.
- Pronta para execução local: T002, T003, T005, T007 e as dependências da Fundação de Qualidade T028 e Proteção de Acesso T027 estão concluídas. A confirmação remota dos checks continua fora desta tarefa e permanece para T011. Ver [decisão de planejamento](../decisoes-de-planejamento.md#cobertura-análise-defensiva-e-releases).
- Paralela: não
- Requisitos: RF-001, RF-002, RF-003, RF-004, RNF-001, RNF-002, CA-001, CA-002, CA-003, CA-004, CA-005
- Caminhos sob responsabilidade: `.github/workflows/container-ci.yml`, `.github/scripts/check_quality_gate.py`, `.github/scripts/tests/test_quality_gate.py`, `.github/scripts/tests/test_container_ci_workflow.py`, `.github/scripts/tests/test_browser_security_workflow.py`

### Escopo

Integrar coletores, Semgrep e ZAP passivo aos eventos e ao gate aprovados. Conservar CodeQL em seu workflow. Publicar sumário e artefatos válidos por tentativa, inclusive em bloqueio da política quando existir relatório sanitizado. Manter a confirmação das exigências de proteção remota em T011.

### Critérios de conclusão

- Contratos de workflow demonstram que revisão analisada, contribuição quando disponível, módulos, execução/tentativa e versão da política são rastreáveis. Falha de testes, ausência de relatório, falha de infraestrutura e cancelamento ficam visíveis e não satisfazem o gate.
- Validação em PR permanece com privilégios de leitura, sem credenciais de serviço. Artefatos compartilháveis seguem o conteúdo permitido e a retenção acordada.

### Plano TDD

- RED: testar a omissão de novo resultado no gate, falhas de cobertura ou análise, ausência de relatório, publicação bruta e configuração com ações incompatíveis com o modo passivo.
- GREEN: ligar resultados ao agregador e aos artefatos e manter a confirmação de CodeQL nos eventos documentados.
- REFACTOR: reaproveitar a infraestrutura de sumário e agregação e preservar as causas e a identidade de cada execução.

### Validação

- Executar `python -m unittest discover -s .github/scripts/tests -p "test_*.py" -v`.
- No runner Linux, executar `bash .github/scripts/install_actionlint.sh .tmp/actionlint` e `.tmp/actionlint/actionlint .github/workflows/container-ci.yml`.

### Notas

As integrações de Semgrep e ZAP correspondem também a #489 e #490.

## T009 — Publicar a referência confiável de cobertura no README

- Status: concluída localmente
- Issue: #487
- Dependências: T008
- Decisão registrada: usar as execuções do Container CI e seus artefatos sanitizados de cobertura, com link no README e sem percentuais estáticos; o perfil remoto final continua em T011. Ver [decisão de planejamento](../decisoes-de-planejamento.md#cobertura-análise-defensiva-e-releases).
- Paralela: não
- Requisitos: RF-001, RNF-002, CA-001
- Caminhos sob responsabilidade: `README.md`, `.github/workflows/coverage-badge.yml` se o mecanismo aprovado usar workflow separado, `.github/workflows/container-ci.yml` se a publicação aprovada ficar no workflow existente, `.github/scripts/tests/test_coverage_badge.py`

### Escopo

Derivar o indicador da publicação aprovada e indicar no README onde consultar as duas medidas, métrica, inclusão, exclusão e revisão de referência. Aplicar privilégio mínimo caso exista escrita.

### Critérios de conclusão

- O indicador representa a fonte confiável aprovada e informa a referência. A indisponibilidade aparece como estado distinto. O job de PR permanece sem credenciais de publicação.

### Plano TDD

- RED: testar publicação com resultado ausente, tentativa de outra referência e permissões indevidas. Conferir o vínculo ausente no README.
- GREEN: disponibilizar o vínculo para ambas as medidas e integrar apenas a publicação aprovada.
- REFACTOR: reaproveitar os metadados do relatório na apresentação do badge.

### Validação

- Após escrever o teste, executar `python -m unittest discover -s .github/scripts/tests -p "test_coverage_badge.py" -v`.
- Conferir a origem, as duas medidas e as restrições de publicação com resultados simulados. Reservar a navegação com perfil de avaliação para T011.

## T010 — Completar o Plano de Testes com procedimentos e resultados

- Status: concluída localmente sob limitações documentadas
- Issue: #494
- Dependências: T004, T008, T009
- Dependências externas: [documentação da primeira entrega T015](../documentacao-primeira-entrega/tasks.md#t015--fixar-candidato-da-wiki-e-validar-integração), contrato da revisão da Wiki.
- Decisão registrada: atualizar somente o checkout local da Wiki. O Plano de Testes não está no manifesto editorial `documentacao.json`, então ele não será alterado nesta tarefa. Descrever que as integrações de cobertura, Semgrep e ZAP estão no worktree local e que a verificação remota fica para T011. Ver [decisão de planejamento](../decisoes-de-planejamento.md#cobertura-análise-defensiva-e-releases).
- Paralela: não
- Requisitos: RF-005, RNF-002, CA-006
- Caminhos sob responsabilidade: `../lab-solos.wiki/Plano-de-Testes.md`, `.codex/docs/specs/documentacao-primeira-entrega/documentacao.json` se a página entrar no contrato editorial aprovado

### Escopo

Registrar os fluxos efetivos de cobertura, Semgrep e ZAP com política, gatilhos, dados, ambiente, forma de reexecutar, falhas e retenção. Vincular a página à revisão conferida e explicar como localizar relatório sanitizado de ZAP e os demais registros. Atualizar o manifesto somente se a inclusão for aprovada.

### Critérios de conclusão

- Todos os comandos, workflows e procedimentos têm origem conferível. As ferramentas planejadas e limitações de acesso aparecem explicitamente na página.

### Validação documental

- Conferir uma referência por camada e o roteiro de consulta ao relatório passivo. Executar `python -m unittest discover -s .github/scripts/tests -p "test_delivery_docs*.py" -v`.
- Se a página for incluída no manifesto, usar a revisão correspondente da Wiki e executar `python .github/scripts/check_delivery_docs.py --repository . --wiki ../lab-solos.wiki --manifest .codex/docs/specs/documentacao-primeira-entrega/documentacao.json --mode editorial`.

## T011 — Conferir a evidência de CI com o perfil de avaliação

- Status: em andamento sob dispensa documental explícita do usuário para navegação humana
- Issue: #494
- Dependências: T008, T009, T010
- Bloqueio: T008–T010 concluídas. A navegação com perfil de avaliação foi dispensada pelo usuário; T011 registra os resultados acessíveis, inclusive falhas/inconclusões, e mantém explícita a ausência de comprovação de acesso e de navegação humana. Ver [decisão de planejamento](../decisoes-de-planejamento.md#cobertura-análise-defensiva-e-releases).
- Paralela: não
- Requisitos: RF-001, RF-002, RF-003, RF-004, RF-005, RNF-001, RNF-002, CA-001, CA-002, CA-003, CA-004, CA-005, CA-006
- Caminhos sob responsabilidade: `.codex/docs/specs/cobertura-e-seguranca-na-ci/evidencias/T011.md`

### Escopo

Com autorização para o ambiente de validação, correlacionar execuções de aceite e falha, os resultados do gate, os artefatos, o badge e a revisão da Wiki. Conferir os checks configurados em `develop` com o responsável e registrar limitações de acesso e divergências observadas.

### Critérios de conclusão

- Evidências datadas cobrem aprovação, limiar por módulo, bloqueio das políticas, resultado incompleto e navegação pelo perfil aprovado. Os registros identificam SHA, execução/tentativa, link consultável e retenção.
- O relatório passivo permanece sanitizado e vinculado à execução existente da composição descartável.

### Validação documental

- No início, relacionar cada critério à evidência ainda não demonstrada no perfil de avaliação. Ao final, comparar SHA, execução, tentativa e revisão da Wiki nos registros efetivamente abertos e identificar as evidências ainda indisponíveis.
- Repetir os testes de contrato de T008 e conferir, na CI autorizada, os estados e a amostra de navegação descritos nos critérios. Registrar eventual aceite pendente quando a configuração ou permissão impedir comprovação.

### Notas

O aceite cruzado também usa evidências relacionadas a #487, #489 e #490.

## Log de execução

| Data       | Tarefa | Resultado                                        | Testes/evidências                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Observações                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------- | ------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-18 | T002   | concluída                                        | RED: 3 testes falharam porque o coletor não existia. GREEN: 3/3; `npm ci`, lint, build e `git diff --check` aprovados. Suíte instrumentada: 154/154 arquivos e 970/970 testes com timeout de execução em 15s. Cobertura de linhas: 3.930/4.925 (79,80%), com 209/209 arquivos elegíveis no denominador.                                                                                                                                                                                                                                                                                                             | Provider V8 fixado em 4.1.11; relatório normalizado por SHA e execução. O teste que atingiu o timeout padrão de 5s na instrumentação passou 6/6 sem cobertura. Registry informou 13 vulnerabilidades no lock (10 moderadas e 3 altas); nenhuma correção de dependências fora de escopo foi aplicada.                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-11-17 | T005   | concluída                                        | 12 testes unitários, `py_compile`, `git diff --check`; Semgrep real 1.185.0 aprovou fixtures limpas, bloqueou dois achados por módulo e aceitou exceções sintéticas. Snapshot do checkout analisou 211 arquivos frontend e 149 backend.                                                                                                                                                                                                                                                                                                                                                                             | Versão/digest registrados na política. Bind mount Windows excedeu 180s/módulo e foi marcado incompleto; snapshot Linux validou ambos os módulos. Sem alteração de workflow (T008).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-11-15 | T001   | concluída                                        | RED: CLI ausente. GREEN e REFACTOR: `python -B -m unittest discover -s .github/scripts/tests -p test_check_coverage.py -v`, 9/9. Compilação Python.                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | A métrica é parâmetro do contrato. A coleta e o gate real continuam nas tarefas dependentes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-11-16 | T004   | concluída                                        | RED: 15 lacunas documentais. Conferência final: 9 amostras, 16 referências e 24/24 testes editoriais; 9/9 de cobertura.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Alteração só no checkout local da Wiki. A publicação e o vínculo com o manifesto editorial são escopo de T010.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-11-16 | T006   | concluída                                        | Composição validada e compilada. Playwright security 5/5 em 2 arquivos e 1 worker; contratos estáticos 7/7; limpeza Docker conferida.                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Caracterização local com Windows e dependências existentes. Captura passiva e política ainda dependem da T007.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-11-24 | T007   | bloqueada/inconclusiva                           | Suíte `security` 6/6; checker passivo Python 16/16, contratos de composição 4/4, runner/limpeza 3/3, Node 12/12, TypeScript strict e Prettier aprovados. Jornada focada 1/1.                                                                                                                                                                                                                                                                                                                                                                                                                                        | O ZAP concluiu a fila da suíte completa em 94,104 s, mas `body_unavailable=19`; a última jornada focada ainda deixou 18 corpos binários indisponíveis após dois fallbacks CDP. API 17/17 completa. Sem relatório passivo final; stack e temporários removidos.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-11-24 | T007   | bloqueada/inconclusiva                           | RED: testes de política falharam sem os limites de buffer CDP. Após correção, Node 8/8, contratos da composição 4/4 e Prettier aprovados; jornada existente 1/1.                                                                                                                                                                                                                                                                                                                                                                                                                                                    | A jornada capturou 100 mensagens do navegador e 17 da API, mas 18 corpos binários do navegador continuaram indisponíveis após 82 leituras CDP. A API ficou completa; a análise passiva não gerou relatório final. Stack, analyzer e temporários foram removidos. Critérios não alterados; T008 não pode avançar.                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-11-24 | T007   | bloqueada/inconclusiva                           | PoC HAR nativa corrigida: configuração validada, 6 testes de segurança descobertos, jornada focada 1/1 em 7,2 s e ZIP de 2.504.588 bytes inspecionado.                                                                                                                                                                                                                                                                                                                                                                                                                                                              | 100 entradas locais, 82 corpos anexados; associação método+URL+status recuperou 5 dos 18 candidatos; 13 continuam sem corpo utilizável. Sem checker/ZAP ou relatório passivo. Cleanup confirmou zero containers, volumes, redes e arquivos temporários. Nenhum extrator foi integrado.                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-11-24 | T007   | bloqueada/inconclusiva                           | HAR nativa com `mode: full/content: embed`, composição validada e jornada focada 1/1 em 7,4 s.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 100 entradas locais; associação exata encontrou os 18 candidatos, mas só 5 tinham corpo não vazio e 13 continuaram indisponíveis, igual a `attach`. API 17/17 completa. Sem checker/ZAP ou relatório passivo. Cleanup confirmou zero containers, redes, volumes e arquivos temporários.                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-11-24 | T007   | bloqueada/inconclusiva                           | RED/GREEN: contrato de captura direta via evento `Response`; contratos da composição 5/5, checker passivo 16/16, Node 12/12, compilação TypeScript estrita e Prettier aprovados; jornada focada 1/1.                                                                                                                                                                                                                                                                                                                                                                                                                | 100/100 mensagens foram registradas, incluindo 36 respostas binárias sem duplicação; `Response.body()` recuperou 18/36 e falhou em 18, que seguem indisponíveis. API 10/10; dois downloads continuam em listener separado. Sem checker/ZAP ou relatório passivo final. Stack removida; `.tmp/t007-response-event-20261124` preservada porque a revisão automática rejeitou sua remoção.                                                                                                                                                                                                                                                                                                |
| 2026-11-24 | T007   | bloqueada/inconclusiva                           | Captura combinada CDP Fetch pausado + evento `Response`: contrato da composição 5/5, política Node 13/13, TypeScript strict, Prettier e `git diff --check` aprovados; jornada focada 1/1.                                                                                                                                                                                                                                                                                                                                                                                                                           | Banco sintético limpo, sem tráfego adicional: 100/100 mensagens do navegador e 17/17 da API, sem duplicações; Fetch recuperou 11 corpos e `Response.body()` outros 7. Restam 18/36 corpos `binary_media`; o checker terminou `inconclusive` em 48,247 s, sem iniciar varredura ativa. Stack e recursos próprios removidos; override temporário permaneceu porque a política automática recusou removê-lo. Critérios inalterados.                                                                                                                                                                                                                                                       |
| 2026-11-24 | T007   | concluída                                        | Stack Compose exclusiva limpa; Playwright `security` 6/6; ZAP passivo `passed`; conciliação Caddy 226/226, sem requisições extras nem divergências; política Node 53/53, checker passivo 18/18, contratos da composição 8/8, runner Python 16/16, compilação TypeScript strict dos arquivos E2E, Prettier e `git diff --check` aprovados. Relatório sanitizado: `evidencias/lab-solos-zap-passive-1bc3163c412844d7b4b82c651024b312.json`.                                                                                                                                                                           | Captura: APIRequestContext 47, navegador 205, ZAP 127 rotas de API e 125 de frontend; 21 respostas sem corpo foram justificadas por cache e 46 acertos de cache confirmados; zero respostas 304. Processamento: 133,551 s. Alertas apenas informativos, baixos e médios; nenhum de risco alto. A captura registra imediatamente respostas HTTP que não podem carregar corpo, incluindo `204`, evitando deixar logout válido fora do HAR. Alterações e evidências permanecem locais; sem GitHub, commit ou push.                                                                                                                                                                        |
| 2026-11-24 | T007   | concluída localmente; CI pendente                | Playwright `security` 6/6; analisador passivo Python 21/21; checker 18/18; contratos do stack 8/8; ESLint, Prettier, discovery e `git diff --check` aprovados. ZAP `passed` em 162,045 s. Relatório sanitizado: `evidencias/T007-zap-passive-2026-11-24-local-passed.json`.                                                                                                                                                                                                                                                                                                                                         | 48 mensagens APIRequestContext, 282 navegador, 143 rotas de API e 187 frontend; `body_unavailable=0`, 41 corpos/cache omitidos comprovados, 79 acertos de cache, zero ambiguidade/304. Reconciliação: 291/291 registros, sem extras. Limite de processamento aumentado de 120 para 240 s após o run completo atingir 162 s; continua limitado. A CI ainda precisa confirmar o SHA novo da PR.                                                                                                                                                                                                                                                                                          |
| 2026-11-24 | T008   | concluída localmente sob limitações documentadas | RED: contrato do workflow detectou a repetição incorreta de `python` após `--entrypoint python`; GREEN: testes direcionados `test_container_ci_workflow` 13/13, `test_quality_gate` 6/6, `test_browser_security_workflow` 4/4, `test_check_coverage` 9/9 e `test_check_semgrep` 12/12 (44/44). Vitest com cobertura: 158 arquivos/1.021 testes, frontend 4.134/4.892 (84,51%). Backend com Coverlet: 9.075/10.552 (86,00%); `check_coverage.py` aprovou os dois módulos no mesmo SHA/run/attempt. Após corrigir o falso positivo de `ExpiraEmUtc`, regressão backend completa 846/846 e auditoria/middleware 16/16. | Integração local inclui relatórios por execução e tentativa, gate de 70%, Semgrep pinado e isolado, relatório passivo sanitizado e `quality-gate` obrigatório. O teste instrumentado inicial ficou 845/846 por coincidência dos dígitos `123` no timestamp gerado; correção e reteste registrados em Proteção de Acesso T007. A suíte Python ampla anterior registrou 442 testes: 1 falha por divergência preexistente da Wiki, 6 erros porque PyYAML está ausente e 2 skips. Semgrep no bind mount Windows excedeu 180 s por módulo; `actionlint` não está instalado. Prettier `--debug-check`, Compose config e `git diff --check` aprovados; sem execução no GitHub ou ação remota. |
| 2026-11-24 | T009   | concluída localmente                             | RED: teste do badge detectou seção e link ausentes. GREEN: `test_coverage_badge.py` 3/3; README explica as duas medições, métrica, escopo, identificação por SHA/run/attempt, retenção e falhas; badge abre as execuções Container CI de `develop`.                                                                                                                                                                                                                                                                                                                                                                 | Decisão local registrada: usar os artefatos sanitizados do workflow como fonte, sem percentuais estáticos, provedor externo ou credencial de publicação. Perfil final de leitura permanece para T011. Nenhuma publicação ou consulta remota foi feita.                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-11-24 | T010   | concluída localmente sob limitações documentadas | Wiki revisada para os fluxos locais efetivos de cobertura, Semgrep e ZAP, comandos, dados sintéticos, gates, consulta e retenção. `test_delivery_docs*.py` 24/24; Prettier `--debug-check` e `git -C ../lab-solos.wiki diff --check` aprovados.                                                                                                                                                                                                                                                                                                                                                                     | O Plano de Testes não consta em `documentacao.json`, então o manifesto não mudou. A página já tinha alterações locais e elas foram preservadas. Os links de arquivos em `develop` são destinos previstos e não foram validados remotamente; a página declara que as integrações estão no worktree e ainda não foram publicadas/executadas. Sem GitHub.                                                                                                                                                                                                                                                                                                                                 |

### Retomada após CI #45535221035 — 25/11/2026

A suíte Browser security passou 6/6 no run #45535221035, mas a captura passiva foi marcada `capture_incomplete`: o cenário de perfis/exportação encerrou com três recursos `Font` em andamento, antes da drenagem limitada de 2 s. A regra continua fail-closed. A correção local aguarda `document.fonts.ready` e o término das respostas antes de encerrar a jornada e dá até 10 s para a drenagem CDP.

A revalidação local completa passou: seis testes, relatório ZAP `passed` em 166,599 s e 290 registros Caddy reconciliados sem divergências. Consulte o [relatório sanitizado do reteste](./evidencias/T007-zap-passive-2026-11-25-local-passed.json) e o [resumo local](./evidencias/T007-zap-passive-2026-11-25-local-passed-summary.txt). Falta a próxima execução remota para concluir T007/T011.


### Reteste determinístico após CI #45539003181 — 25/11/2026

A CI #45539003181 passou baseline de qualidade, E2E de autenticação, qualidade frontend/backend, CodeQL, dependências, Semgrep, scans e contratos de workflow. Browser security passou 6/6, mas a captura passiva falhou fechada: o Chromium reutilizou fontes entre navegações, 32 corpos binários ficaram sem leitura, 77 eventos ExtraInfo permaneceram pendentes e três requisições de fonte seguiam em voo. O aumento da drenagem para 10 s não bastou nesse cenário.

A jornada de perfis agora desativa o cache na mesma sessão CDP utilizada pelo capturador. Reteste local completo: Playwright 6/6; perfil capturou 123/123 respostas sem corpo indisponível e drenagem completa; ZAP passou em 180,235 s. A reconciliação conciliou 351/351 registros Caddy, sem ambiguidade ou divergência. O relatório sanitizado está em [T007 — captura local com cache desativado](./evidencias/T007-zap-passive-2026-11-25-cache-disabled-passed.json), com [resumo](./evidencias/T007-zap-passive-2026-11-25-cache-disabled-passed-summary.txt). T007/T011 aguardam confirmação pela CI no próximo commit.
