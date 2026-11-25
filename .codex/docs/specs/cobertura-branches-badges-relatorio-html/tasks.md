# Tarefas — Cobertura de branches, badges e relatório HTML

- Status: T001–T006 concluídas localmente; T007 bloqueada por validação remota
- PRD: [Cobertura de branches, badges e relatório HTML](./prd.md)
- Especificação técnica: [Cobertura de branches, badges e relatório HTML](./techspec.md)
- Atualizado em: 2026-11-25

Ler o PRD e a especificação técnica antes de executar cada tarefa. O gate de 70% é de branches por módulo; linhas continuam informativas. Não publicar badges em execuções de PR e não alterar os outros planos SDD. A tarefa T006 atualiza somente o checkout local `../lab-solos.wiki`; publicação da Wiki continua sob o plano existente da issue #494.

## Ondas de execução

| Onda | Tarefas | Motivo de segurança do paralelismo |
|---|---|---|
| 1 | T001, T002, T003 | Coletores de frontend, backend e checker compartilham o contrato descrito, mas possuem arquivos e fixtures próprios; integrar só depois dos três testes direcionados. |
| 2 | T004 | Integração do contrato dos coletores e do gate no workflow; possui escrita exclusiva em `container-ci.yml`. |
| 3 | T005 | Publicação dos badges depende do workflow/artifacts de T004 e edita `container-ci.yml` em janela posterior e exclusiva. |
| 4 | T006 | README e Wiki têm donos exclusivos; requer badges/reportes definidos em T005. |
| 5 | T007 | Revisão final cruza métricas, relatório, links e publicação em ambiente autorizado. |

## T001 — Medir linhas e branches no frontend e gerar HTML

- Status: concluída localmente
- Dependências: nenhuma
- Paralela: sim
- Issue: #505
- Requisitos: RF-001, RF-004, RNF-001, CA-001, CA-005
- Caminhos sob responsabilidade: `frontend/vite.config.ts`, `.github/scripts/collect_frontend_coverage.py`, `.github/scripts/tests/test_collect_frontend_coverage.py`, `.github/scripts/tests/fixtures/frontend-coverage/**`

### Escopo

Estender a coleta V8 para emitir contagens de linhas e branches de fontes elegíveis no schema v2, preservando exclusões existentes. Configurar o reporter HTML em paralelo com `json-summary` e no diretório exclusivo por `run_id`/`run_attempt`.

### Critérios de conclusão

- O JSON de frontend inclui as duas métricas, módulo e identidade da execução.
- Fixture sem branch, contagem incoerente e arquivo fora do escopo não são aprovados silenciosamente.
- O relatório HTML detalhado é gerado sob o diretório da execução sem mudar o denominador de linhas.

### Plano TDD

- RED: testar o contrato antigo do coletor com branches e HTML esperados; falhar porque o JSON só contém linhas e o reporter HTML não foi configurado.
- GREEN: coletar numeradores/denominadores V8 de linhas e branches e habilitar HTML.
- REFACTOR: centralizar validação de caminhos/contadores, mantendo a lista atual de inclusão e exclusão.

### Validação

- `python -B -m unittest discover -s .github/scripts/tests -p test_collect_frontend_coverage.py -v`
- Em `frontend`: `npm run test -- --run --coverage`
- Conferir JSON v2 e `index.html` no diretório de resultado exclusivo.

### Notas

## T002 — Medir linhas e branches no backend e gerar HTML

- Status: concluída localmente sob limitações documentadas
- Dependências: nenhuma
- Paralela: sim
- Issue: #505
- Requisitos: RF-001, RF-004, RNF-001, CA-001, CA-005
- Caminhos sob responsabilidade: `.config/dotnet-tools.json`, `.github/scripts/collect_backend_coverage.py`, `.github/scripts/tests/test_collect_backend_coverage.py`, `.github/scripts/tests/fixtures/backend-coverage/**`

### Escopo

Fixar ReportGenerator no manifesto de ferramentas .NET. Adaptar o relatório Coverlet/Cobertura para contar branches por fonte elegível com validação dos pares covered/total, produzir JSON v2 e gerar HTML detalhado mais JsonSummary. Preservar filtros atuais de testes, build, código gerado e migrações.

### Critérios de conclusão

- O JSON backend identifica `backend`, SHA, `run_id`, `run_attempt`, linhas e branches.
- Fixtures cobrem arquivo elegível, teste, código gerado, branches parciais, duplicação e contagens inválidas.
- ReportGenerator produz HTML com sumário e detalhes de classe/arquivo para a revisão vinculada.

### Plano TDD

- RED: adicionar fixtures Cobertura com condições de branch e exigir campos de linha/branch; falhar no coletor atual.
- GREEN: normalizar as contagens e integrar a ferramenta fixada para o HTML/JsonSummary.
- REFACTOR: consolidar os filtros e validar que a coleção não depende de caminhos absolutos do runner.

### Validação

- `python -B -m unittest discover -s .github/scripts/tests -p test_collect_backend_coverage.py -v`
- `dotnet tool restore`
- `dotnet test backend/backend.sln -c Release --collect:"XPlat Code Coverage"`
- Gerar relatório HTML/JsonSummary a partir do Cobertura produzido e conferir contagens por módulo.

### Notas

## T003 — Aplicar o limite de 70% a branches por módulo

- Status: concluída localmente
- Dependências: nenhuma
- Paralela: sim
- Issue: #505
- Requisitos: RF-002, RNF-001, CA-002, CA-003
- Caminhos sob responsabilidade: `.github/scripts/check_coverage.py`, `.github/scripts/tests/test_check_coverage.py`, `.github/scripts/tests/fixtures/coverage/**`

### Escopo

Evoluir o checker para consumir os dois módulos com schema v2; validar linhas e branches, identities e contagens inteiras. Aplicar 70% apenas ao numerador/denominador de branches de cada módulo. Linhas devem aparecer no resultado e não influenciar o exit code.

### Critérios de conclusão

- Exatamente 70% de branches passa; abaixo de 70% em qualquer módulo reprova, apontando módulo, contagens e percentual.
- Linhas abaixo de 70% com branches aprovadas passam.
- Relatório ausente, inválido, com denominador zero ou SHA/run/tentativa divergente reprova.

### Plano TDD

- RED: acrescentar os casos de limiar e integridade do contrato v2; mostrar aprovação indevida com linha-only e falhas ausentes do checker atual.
- GREEN: validar ambas as métricas e aplicar comparação inteira apenas a branches.
- REFACTOR: manter uma só validação de identidade para os dois módulos e um resumo estável para consumo pelo workflow.

### Validação

- `python -B -m unittest discover -s .github/scripts/tests -p test_check_coverage.py -v`
- `python -B .github/scripts/check_coverage.py --help`

### Notas

## T004 — Integrar relatórios HTML e gate de branches ao Container CI

- Status: concluída localmente
- Dependências: T001, T002, T003
- Paralela: não
- Issue: #505
- Requisitos: RF-001, RF-002, RF-004, RNF-001, CA-001, CA-002, CA-003, CA-005
- Caminhos sob responsabilidade: `.github/workflows/container-ci.yml`, `.github/scripts/tests/test_container_ci_workflow.py`

### Escopo

Atualizar a CI para baixar os relatórios v2, chamar uma vez o checker de ambos os módulos, mostrar linhas e branches, e disponibilizar HTML frontend/backend sob um artefato `coverage-html` com `retention-days: 30`. A publicação dos artefatos deve ocorrer mesmo em caso de falha, quando houver arquivos. Não adicionar permissão de escrita a esta etapa.

### Critérios de conclusão

- A cobertura reprova por branches abaixo de 70%, não por linhas.
- O job de relatório inclui HTML dos dois módulos, sumários e identidade da execução.
- O artefato indica SHA, `run_id`, `run_attempt` e retenção de 30 dias; arquivo ausente não converte o gate em sucesso.
- Contratos do workflow comprovam upload com `if: always()` e ausência de permissão de escrita no job de PR.

### Plano TDD

- RED: atualizar testes do contrato do workflow para exigir reporter HTML, métricas, gate branches-only e artifact `coverage-html`; falham contra o YAML atual.
- GREEN: integrar os jobs e publicar artefatos com retenção de 30 dias.
- REFACTOR: manter nomes/diretórios de resultado determinísticos e passos de diagnóstico claros.

### Validação

- `python -B -m unittest discover -s .github/scripts/tests -p test_container_ci_workflow.py -v`
- `python -B -m unittest discover -s .github/scripts/tests -p test_check_coverage.py -v`
- Conferir `git diff --check` e a relação dos jobs em `.github/workflows/container-ci.yml`.

### Notas

## T005 — Gerar e publicar badges em branch dedicada

- Status: concluída localmente sob limitação documentada
- Dependências: T004
- Paralela: não
- Issue: #505
- Requisitos: RF-003, RNF-001, RNF-002, CA-004
- Caminhos sob responsabilidade: `.github/scripts/publish_coverage_badges.py`, `.github/scripts/tests/test_coverage_badges.py`, `.github/workflows/container-ci.yml`, `.github/scripts/tests/test_container_ci_workflow.py`

### Escopo

Gerar `coverage-lines.svg`, `coverage-branches.svg` e resumo serializado. Cada badge mostra o menor resultado entre frontend e backend. Estado inválido gera `indisponível`. Adicionar gatilho `push` de `develop` e um job dedicado que atualiza somente a branch `coverage`; o job recebe `contents: write` localmente e executa apenas para `refs/heads/develop`. Serializar publicações e impedir que pushes à branch gerada iniciem nova execução do Container CI.

### Critérios de conclusão

- Testes dos SVGs cobrem menor módulo, limite exato, abaixo do limite e dado ausente/inválido.
- `coverage-lines.svg` é informativo; `coverage-branches.svg` representa o gate de 70%.
- O README poderá usar URLs raw estáveis da branch dedicada.
- O job de PR, merge group e branch de contribuição não tem escrita; o job publicador tem apenas `contents: write` e não aceita dados de execuções de PR.
- A tentativa de escrita na branch e falhas de permissão são visíveis, sem fallback para token pessoal.

### Plano TDD

- RED: testar geração de badges com dois módulos, erro de identidade e ausência de resultado; testes do workflow devem falhar se a escrita estiver exposta a PR.
- GREEN: criar SVG/sumário e adicionar job push-only com permissões e concorrência isoladas.
- REFACTOR: centralizar renderização e saída segura de valores, sem incluir identidade não validada.

### Validação

- `python -B -m unittest discover -s .github/scripts/tests -p test_coverage_badges.py -v`
- `python -B -m unittest discover -s .github/scripts/tests -p test_container_ci_workflow.py -v`
- Em execução autorizada, confirmar que `GITHUB_TOKEN` consegue atualizar somente a branch `coverage`. Se a configuração do repositório negar escrita, deixar a tarefa bloqueada e registrar a evidência; não ampliar permissões automaticamente.

### Notas

## T006 — Atualizar o README e o Plano de Testes

- Status: concluída localmente
- Dependências: T005
- Paralela: não
- Issue: #505; issue relacionada: #494 (contexto de atualização local da Wiki; sem publicação nesta tarefa).
- Requisitos: RF-003, RF-004, RF-005, RNF-003, CA-004, CA-005, CA-006
- Caminhos sob responsabilidade: `README.md`, `../lab-solos.wiki/Plano-de-Testes.md`

### Escopo

Trocar o badge genérico do README pelos badges `coverage-lines` e `coverage-branches` com URLs geradas, explicar o menor módulo exibido, o papel informativo de linhas, o gate de branches, a navegação ao artefato HTML e a retenção de 30 dias. Atualizar a página local `Plano-de-Testes.md` com a mesma regra, camadas, comando/workflow e links. Preservar alterações que já existam na Wiki.

### Critérios de conclusão

- README não contém a afirmação de que o gate exige 70% de linhas.
- README e Wiki descrevem 70% de branches em frontend e backend, sem média, e linhas como informação.
- Os dois documentos orientam à execução/artefato HTML e declaram a retenção e as permissões de leitura.
- A Wiki continua local; validação/publicação externa permanece pendente em T011 do pacote existente da issue #494.

### Plano TDD

- RED: busca documental identifica o badge genérico e a regra de 70% em linhas nos documentos.
- GREEN: atualizar links, métrica e procedimento de consulta em ambas as páginas.
- REFACTOR: eliminar instruções duplicadas e conferir consistência dos termos e da retenção.

### Validação

- Conferir `README.md` e `../lab-solos.wiki/Plano-de-Testes.md` contra os critérios CA-004 a CA-006.
- `git diff --check -- README.md`
- `git -C ../lab-solos.wiki diff --check -- Plano-de-Testes.md`

### Notas

## T007 — Conferir o gate, os artefatos e a publicação ponta a ponta

- Status: bloqueada
- Bloqueio: A evidência local está concluída, mas o aceite ponta a ponta depende da integração em `develop`, de uma execução GitHub Actions confiável que publique `coverage-html` e da confirmação da atualização da branch `coverage` com `GITHUB_TOKEN`. Nenhum commit, push ou PR foi solicitado.
- Dependências: T001, T002, T003, T004, T005, T006
- Paralela: não
- Issue: #505; issue relacionada: #494 (contexto de atualização local da Wiki; sem publicação nesta tarefa).
- Requisitos: RF-001, RF-002, RF-003, RF-004, RF-005, RNF-001, RNF-002, RNF-003, CA-001, CA-002, CA-003, CA-004, CA-005, CA-006
- Caminhos sob responsabilidade: `.codex/docs/specs/cobertura-branches-badges-relatorio-html/evidencias/T007.md`

### Escopo

Verificar uma execução com ambas as métricas válidas e uma execução de teste com módulo abaixo do limite. Depois da integração em `develop`, conferir o push que atualiza os SVGs, a origem do SHA/run/tentativa, o relatório HTML, a retenção, os links e o estado da branch de publicação. Reconciliar a documentação local da Wiki com a política executada. Não marcar as issues #494 ou #505 como concluídas sem completar seus critérios e registrar evidência remota pertinente.

### Critérios de conclusão

- Uma execução aprovada demonstra 70% de branches em ambos os módulos; outra evidencia falha isolada de um módulo e ausência de falha causada somente por linhas.
- Os dois badges mostram a execução integrada mais recente ou o estado indisponível e apontam para o diagnóstico.
- Os dois HTMLs abrem no artefato da execução correta e identificam ambos os módulos e a retenção.
- O Plano de Testes local e o README correspondem à configuração observada; qualquer bloqueio de acesso/publicação fica registrado.

### Plano TDD

- RED: preparar matriz de casos de aceitação; antes de integração, executar testes sintéticos de aprovação/falha e comparar com os resultados esperados.
- GREEN: conferir os artifacts e o branch publish em execução autorizada, guardando links e identidades.
- REFACTOR: remover fixtures/artefatos temporários gerados e deixar somente evidência sanitizada da execução.

### Validação

- Reexecutar testes direcionados T001 a T005 e os comandos amplos do techspec.
- Na execução remota, consultar `gh run view <run-id> --repo ifpebj-ti/lab-solos` e `gh run download <run-id> --repo ifpebj-ti/lab-solos --name coverage-html`; confirmar SHA e tentativa antes de registrar a evidência.
- Abrir os SVGs e o HTML a partir do README e registrar o resultado da consulta local da Wiki.

### Notas

## Log de execução

| Data | Tarefa | Resultado | Testes/evidências | Observações |
|---|---|---|---|---|
| 2026-11-25 | T007 | bloqueada | Evidência local em `evidencias/T007.md`: cinco suítes direcionadas 5/7/8/6/14; frontend 1.051 testes, lint e build aprovados; `dotnet tool restore` aprovado. | Backend parcial: 410/846 passaram, 436 falharam por Docker indisponível. Sem execução integrada, artifact `coverage-html`, SHA/run/attempt remoto ou publicação em `coverage`; falta integrar em `develop` e observar o workflow. |

| 2026-11-25 | T006 | concluída localmente | RED documental: README e Wiki usavam badge genérico e gate de 70% em linhas; Wiki também citava a solution como fonte da cobertura. GREEN: ambos apresentam dois badges, gate de branches por módulo, linhas informativas, artifact HTML e retenção de 30 dias; Wiki indica `backend/Tests/Tests.csproj`. Buscas e `git diff --check` passaram nos dois checkouts. | A Wiki permaneceu local e registra que a configuração não foi publicada/executada remotamente. |

| 2026-11-25 | T005 | concluída localmente sob limitação documentada | RED: testes falharam pela ausência do publisher e do job push-only. GREEN: badges 6/6, contrato do workflow 14/14, checker 8/8, `--help`, parse YAML, `compileall` e `git diff --check` aprovados. | Geração de SVGs e job restrito a push confiável em `develop`; write access real à branch `coverage` depende de execução remota, não realizada. Sem publicação, commit ou push. |

| 2026-11-25 | T004 | concluída localmente | RED: contrato não exigia HTML nem rejeitava `--metric lines`. GREEN: teste do workflow 13/13, checker 8/8, parse YAML com `js-yaml` e `git diff --check` aprovados. Cobertura do backend executa o projeto `backend/Tests/Tests.csproj`; artefato combinado `coverage-html` retém HTML e metadados por 30 dias. | `actionlint` não está instalado. Sem GitHub Action real, commit ou push. |

| 2026-11-25 | T001 | concluída localmente | RED: coletor não emitia schema v2 nem rejeitava branch ausente/zero. GREEN: testes direcionados 5/5; suíte frontend 1.051 testes; linhas 4.205/4.956, branches 2.723/3.539 e `index.html` gerado. Lint e build passaram. | Build manteve avisos de `env.js`, imagem não resolvida e chunks grandes. Project #41 confirmou #505 atribuída a `nathannmvr` e `In Progress`. |
| 2026-11-25 | T002 | concluída localmente sob limitações documentadas | RED: 3 falhas para schema v2 e branches inválidas/ausentes. GREEN: testes direcionados 7/7, `dotnet tool restore`, Cobertura real 3.755/10.567 linhas e 590/1.633 branches; ReportGenerator 5.5.10 criou HTML e `Summary.json`. | `dotnet test backend/Tests/Tests.csproj` executou 849 testes: 412 passaram e 437 falharam por falta do Docker (`npipe://./pipe/docker_engine`). A suíte ampla não é evidência verde neste ambiente. Sem commit/push. |
| 2026-11-25 | T003 | concluída localmente | RED: checker antigo exigia CLI por métrica e não aceitava schema v2. GREEN: testes direcionados 8/8; CLI `--help` e `git diff --check` passaram. | Gate valida SHA/run/attempt e as quatro métricas; 70% aplicado somente a branches por módulo. Project #41 confirmou #505 em `In Progress`. |
