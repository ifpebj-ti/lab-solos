# Baseline oficial de cobertura

## Medição oficial mais recente desta execução

A Container CI run [#45776498924](https://github.com/ifpebj-ti/lab-solos/actions/runs/45776498924), tentativa 1, mediu frontend em 2833/3525 branches (80,37%) e backend em 2802/3610 (77,62% exatos). No backend, a fonte é `summary.coveredbranches/summary.totalbranches` do `Summary.json` publicado junto ao artefato HTML, somando os dois assemblies incluídos pelo ReportGenerator. O `backend-coverage.json` usado pelo gate e pelos badges repetiu exatamente 2802/3610 e os mesmos metadados de execução. `Coverage policy` passou com o mínimo de 70%; para a meta de 80% faltam 86 branches backend (2888 necessários). Backend quality, Browser security E2E e Authentication E2E passaram; todos os checks do Container CI terminaram com sucesso. Cobertura de linhas não determina o progresso desta meta.

Confirmada em 25/11/2026 (America/Sao_Paulo), a partir da execução mais recente da Container CI em `develop`:

- Run: [45727800901, tentativa 1](https://github.com/ifpebj-ti/lab-solos/actions/runs/45727800901)
- Evento e resultado: `push`, `completed`, `success`
- SHA: `df1d55f1f0bb88f0a88d792a40efe010d75efe1a`
- Início informado pelo GitHub: `2026-11-26T00:18:32Z` (21:18:32 em São Paulo)
- Identidade confirmada em `coverage-index.html`: mesmo SHA, `run_id` e `run_attempt`

## Cobertura por módulo

| Módulo | Fonte oficial | Branches cobertos / total | Cobertura de branches | Linhas cobertas / total | Cobertura de linhas |
| --- | --- | ---: | ---: | ---: | ---: |
| Frontend | `frontend-coverage.json` | 2708 / 3525 | 76,82% | 4234 / 4992 | 84,78% |
| Backend | `backend-html-coverage/Summary.json` | 2521 / 3610 | 69,834% (69,8% no relatório) | 28406 / 30074 | 94,454% (94,4% no relatório) |

No backend, o `Summary.json` agrega os dois assemblies exibidos no HTML: `E2ESeed` tem 36/58 branches (62,0%) e `LabSolos-Server-DotNet8` tem 2485/3552 (69,9%). O valor do módulo é a soma das contagens, sem filtrar assemblies: 2521/3610.

## Efeito no gate

O gate continua em 70% por módulo e compara a razão sem arredondá-la. Para 3610 branches, 70% exige pelo menos 2527 branches cobertos; a baseline tem 2521, seis a menos. Portanto, a baseline do backend fica abaixo do gate, embora o HTML exiba 69,8%. O frontend também está abaixo da meta de 80%, mas acima do gate de 70%.

A execução histórica listada acima concluiu com sucesso porque o JSON backend combinado daquela execução ainda usava a normalização anterior: 1540/1680 (91,67%). Essa contagem difere do HTML por filtrar e deduplicar outro escopo e deixa de ser a medida oficial. Com o alinhamento implementado nesta tarefa, o JSON backend usado pelo gate e pelos badges passa a copiar as contagens de `Summary.json`; assim, uma execução com esta mesma baseline reprovará o gate de backend até a cobertura subir. Não foi alterado o limite de 70%.

## Evidência local de T001

Os testes de contrato confirmam que o coletor copia linhas e branches do `Summary.json` mantendo SHA, `run_id` e `run_attempt`, e rejeita contagens inválidas. O teste do workflow confirma que o ReportGenerator gera `Summary.json` antes da coleta e que o artefato carrega o JSON alinhado ao HTML.

- `python -B -m unittest discover -s .github/scripts/tests -p test_collect_backend_coverage.py -v` — 9 testes passaram.
- `python -B -m unittest discover -s .github/scripts/tests -p test_container_ci_workflow.py -v` — 14 testes passaram.
- `python -B -m unittest discover -s .github/scripts/tests -p test_check_coverage.py -v` — 8 testes passaram; a razão abaixo de 70% continua reprovando sem arredondamento.

O comportamento solicitado já estava parcialmente implementado ao iniciar T001. Por isso, os testes adicionados são testes de caracterização e de validação de entrada, sem fabricar uma falha alterando código de produção. A execução histórica bem-sucedida também antecede a atualização deste workflow e não valida o novo alinhamento em CI.
