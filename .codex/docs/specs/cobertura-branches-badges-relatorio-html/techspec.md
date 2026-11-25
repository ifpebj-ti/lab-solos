# Especificação técnica — Cobertura de branches, badges e relatório HTML

- **Status** proposta pronta para decomposição
- **PRD** [Cobertura de branches, badges e relatório HTML](./prd.md)
- **Atualizado em** 2026-11-25
- **Validação de design** desnecessária; o escopo altera CI e documentação, sem interface da aplicação
- **Validação de descoberta** dispensada pelo usuário

## Resumo técnico

Estender os coletores de Vitest/V8 e Coverlet para medir linhas e branches por módulo, normalizar as duas métricas sob a mesma identidade de execução e alterar o checker para aplicar 70% somente a branches. Gerar HTML detalhado para frontend e backend como artefato da execução, com retenção de 30 dias. Publicar SVGs atualizados dos badges `coverage-lines` e `coverage-branches` em uma branch dedicada, apenas em push confiável para `develop`; o README usa URLs estáveis desses arquivos e liga à lista de execuções. Atualizar a Wiki para refletir a regra corrigida.

## Estado atual

- A revisão remota `develop` consultada durante esta especificação está em `1f3b6497b8e244aeed2ea8947310fefca7085ad4`, merge da PR #509. O checkout local tem alterações de trabalho anteriores; esta especificação não as substitui nem as reverte.
- `.github/workflows/container-ci.yml` é executado em PR para `develop`, `merge_group` e `workflow_dispatch`. Ainda não tem gatilho `push` para `develop`; o job usa `contents: read` globalmente.
- O frontend executa `npm run test -- --run --coverage`. `frontend/vite.config.ts` usa Vitest com V8 e `json-summary`; o coletor `.github/scripts/collect_frontend_coverage.py` normaliza apenas linhas.
- O backend executa a solução .NET com `XPlat Code Coverage`. `.github/scripts/collect_backend_coverage.py` normaliza linhas do Cobertura. O manifesto `.config/dotnet-tools.json` existe, mas ainda não inclui ReportGenerator.
- `.github/scripts/check_coverage.py` recebe relatórios de uma métrica por vez; a CI chama `--metric lines` e exige 70% por módulo.
- Os artefatos `frontend-coverage`, `backend-coverage` e `coverage-summary` têm retenção de 30 dias. Não existe artefato com relatório HTML de cobertura.
- O README tem um badge genérico `Coverage reports` e informa incorretamente que 70% se aplica a linhas. O checkout irmão da Wiki também afirma que a meta é cobertura de linhas. A issue #494 já tem PRD/techspec/tasks no pacote [Cobertura e segurança na CI](../cobertura-e-seguranca-na-ci/); as tarefas existentes de validação remota permanecem nesse plano.
- O repositório é público e a API de GitHub Pages respondeu `404` na consulta desta especificação. Portanto, a solução proposta não depende de habilitar Pages.

## Arquitetura proposta

### Contrato de medição

Cada coletor publica um JSON versionado por módulo. Linhas e branches são contagens inteiras; percentuais são derivados somente para exibição, nunca para comparar o limite.

```json
{
  "schemaVersion": 2,
  "module": "frontend",
  "sha": "<sha completo>",
  "run_id": "<id da execução>",
  "run_attempt": 1,
  "metrics": {
    "lines": { "covered": 120, "total": 150 },
    "branches": { "covered": 21, "total": 30 }
  }
}
```

O checker exige os dois módulos e os dois objetos de métrica, valida tipos inteiros, contagens não negativas, `covered <= total`, denominador maior que zero e identidade idêntica nos quatro resultados. A aprovação de branches compara `covered * 100 >= total * 70`; linhas são impressas no sumário sem gate. Denominador de branches igual a zero é medida inválida, não aprovação implícita.

### Coletores e relatórios

- **Frontend:** preservar o escopo de fontes e exclusões atuais de `vite.config.ts` e do coletor. Acrescentar `branches` ao JSON normalizado e o reporter HTML à execução Vitest. Ambos os reporters usam o diretório exclusivo por `run_id` e `run_attempt` já configurado.
- **Backend:** estender o coletor Coverlet para contar branches das fontes elegíveis com deduplicação por arquivo/origem, linha e condição. Relatórios inválidos, metadados de branch ausentes e identidades divergentes causam medida inválida. O fixture precisa incluir branches cobertas/descobertas, arquivos repetidos e filtros de `Tests`, `bin`, `obj` e migrações.
- Fixar `dotnet-reportgenerator-globaltool` em `.config/dotnet-tools.json` e restaurar a ferramenta pelo manifesto. Produzir relatório `Html` detalhado e `JsonSummary` a partir do Cobertura. O HTML do ReportGenerator inclui resumo e páginas por classe; sua saída também serve como conferência do cálculo de branches. A ferramenta suporta Cobertura, relatórios HTML e JSON de resumo ([documentação oficial](https://github.com/danielpalme/ReportGenerator), [formatos de saída](https://reportgenerator.io/resources/reports/index.html), [cálculo das métricas](https://github.com/danielpalme/ReportGenerator/wiki/Calculation-details)).
- O HTML do frontend e o do backend são incluídos no artefato `coverage-html`, junto aos sumários normalizados e a um índice que indica SHA, execução e tentativa. Os artefatos de CI ficam disponíveis por 30 dias. A publicação ocorre com `if: always()` para preservar evidências parciais, mas relatório ausente/inválido continua reprovando a cobertura.

### Gate da CI

Atualizar `.github/scripts/check_coverage.py` e seus testes para avaliar os dois módulos num único contrato. `Coverage policy` imprime linhas e branches de cada módulo e reprova se qualquer módulo tiver branches abaixo de 70%, se uma das quatro medidas não existir ou se a identidade não corresponder. Cobertura de linhas abaixo de 70% não altera o status. O resumo de decisão continua a ser publicado mesmo quando a avaliação falha.

### Badges e publicação

Uma rotina Python recebe os dois JSONs normalizados e cria `coverage-lines.svg`, `coverage-branches.svg` e um sumário JSON. Os SVGs mostram o menor percentual entre frontend e backend; o badge de branches muda para estado de falha abaixo de 70%, enquanto o badge de linhas é apenas informativo. Medida inválida gera badge cinza `indisponível`, nunca conserva visualmente o valor anterior.

Adicionar `push` em `develop` a `Container CI`. Um job de publicação separado depende dos resultados de frontend, backend e gate, e só pode rodar quando `github.event_name == 'push'` e `github.ref == 'refs/heads/develop'`. O job publica apenas SVGs e sumário numa branch `coverage`, usa concorrência sem cancelamento e recebe `contents: write` somente no escopo desse job. Execuções de PR, `merge_group` e branches de contribuição ficam sem credencial de escrita. A branch dedicada não é alvo dos gatilhos do Container CI, evitando recursão.

O README aponta as imagens para URLs estáveis de `raw.githubusercontent.com/.../coverage/` e os links para as execuções de `Container CI` em `develop`, onde a pessoa leitora abre o artefato HTML do run escolhido. A branch persistente guarda somente os indicadores mais recentes; o histórico de relatórios completos segue a retenção de 30 dias dos artefatos. O fluxo não usa GitHub Pages, que não estava habilitado, nem serviço externo de badges.

### Atualização documental da issue #494

Atualizar `Plano-de-Testes.md` no checkout local `../lab-solos.wiki`: substituir a descrição da meta de 70% de linhas por 70% de branches em cada módulo, indicar que linhas é informativa, explicar os dois badges e apontar o artefato HTML com retenção. Preservar o estado local anterior da Wiki e não publicá-la nesta tarefa. A publicação e validação externa permanecem nas tarefas da issue #494.

## Fluxos e componentes

1. Vitest e xUnit produzem relatórios da execução identificada.
2. Os coletores filtram fontes de produção e escrevem JSON de linhas/branches, SHA, `run_id` e `run_attempt`.
3. `Coverage policy` compara contagens inteiras de branches em cada módulo e publica o resumo de ambas as métricas.
4. A CI anexa os relatórios HTML e os JSONs como artefatos da mesma execução.
5. Após push confiável em `develop`, o job gera os SVGs pelo menor resultado de cada métrica e atualiza a branch `coverage`.
6. README e Wiki direcionam às imagens e ao artefato da execução; acesso segue as permissões do repositório.

## Contratos e APIs

- **Relatório do módulo:** schema versão 2, módulo, SHA, `run_id`, `run_attempt` e `metrics.lines/branches`, cada qual com `covered` e `total` inteiros.
- **Resumo do gate:** ambos os módulos, métricas e estado `passed`, `below threshold` ou `invalid measurement`, com motivo por módulo.
- **Badges:** dois SVGs e sumário estruturado gerados somente a partir dos relatórios da mesma execução. Estados indisponíveis não são tratados como percentuais.
- Não há alteração de API da aplicação ou de dados persistidos pelo produto.

## Dados e migrações

Sem mudança de banco. O contrato interno de relatório de cobertura passa da métrica plana única para schema versionado com as duas métricas. Atualizar fixtures e contratos de testes em conjunto; rejeitar silenciosamente schema antigo no novo gate.

## Segurança, privacidade e permissões

- A escrita na branch `coverage` pertence exclusivamente ao job de publicação restrito a push em `develop`; permissão mínima `contents: write` no job, mantendo o nível global `contents: read`.
- Não publicar relatórios nem SVGs a partir de código executado em PR externo.
- Os HTMLs exibem arquivos de um repositório público e resultados agregados; não devem conter variáveis, credenciais, sessões, artefatos temporários ou caminho absoluto de runner.
- Validar nomes e identidade do run antes de substituir os indicadores; uma medição inválida resulta em badge indisponível.

## Falhas, observabilidade e operação

- Identidade errada, schema antigo, arquivo ausente, JSON/XML malformado, contador incoerente ou denominador zero reprovam `Coverage policy`, identificando o módulo.
- Cobertura de branches abaixo do limite informa contagens e percentual; linhas abaixo do limite não reprovam.
- Falha ao gerar HTML ou publicar o artefato aparece no job de relatório. Falha ao atualizar `coverage` aparece no job de publicação, sem ampliar permissões.
- Se a publicação falhar, o último SVG pode estar defasado; o run deve mostrar estado de publicação e a página de execuções segue como fonte de diagnóstico. Repetições são serializadas por grupo de concorrência.

## Compatibilidade, disponibilização e reversão

- Manter os artefatos existentes durante a migração do formato e atualizar workflow, checker, badges e documentação de forma coordenada.
- A mudança no gate só deve ser habilitada quando os dois coletores emitirem branches e os testes de contrato estiverem verdes. O limiar de linhas sai da decisão, sem remover a medição.
- Reversão pode restaurar a versão anterior do workflow/checker; os JSONs v2 e a branch `coverage` não alteram dados do produto. Remover ou recriar a branch gerada é operação administrativa posterior, não necessária para rollback do gate.
- A execução do gatilho `push` gera nova medição após integração em `develop`; PR continua como gate de pré-merge.

## Estratégia TDD e pirâmide de testes

### RED

Criar primeiro fixtures que não podem ser representados pelo contrato atual: contagem de branches, linha abaixo de 70% com branches aprovadas, módulo isolado abaixo, denominador zero e resultados de runs diferentes. O checker deve falhar nos casos novos antes da implementação. Criar também testes da saída SVG para o menor módulo e para medição indisponível.

### GREEN

Adicionar as contagens de branch aos coletores; normalizar a identidade comum; alterar o gate e integrar os reports HTML e badges. Executar testes direcionados de Python, Vitest, backend e contratos do workflow.

### REFACTOR

Unificar validação de identidade e contagem inteira sem misturar responsabilidades por módulo. Revisar filtros de arquivos, saída sanitizada e permissões de publicação. Reexecutar suíte completa, lint/build e workflow contract tests.

## Esteira de qualidade

| Área | Comando local | Verificação de CI | Lacuna/ação |
|---|---|---|---|
| Frontend | Em `frontend`: `npm ci`, `npm run test -- --run --coverage`, `npm run lint`, `npm run build` | `Container CI / Frontend quality` | Reporter HTML deve coexistir com `json-summary` sem alterar o denominador existente. |
| Backend | `dotnet tool restore`; `dotnet restore backend/backend.sln --locked-mode`; `dotnet test backend/backend.sln -c Release --collect:"XPlat Code Coverage"` | `Container CI / Backend quality` | Fixar ReportGenerator e conferir relatório/contagens branch por teste de fixture. |
| Contrato do gate | `python -B -m unittest discover -s .github/scripts/tests -p test_check_coverage.py -v` | `Container CI / Workflow contracts` e `Coverage policy` | Atualizar a política para branches e manter linhas informativas. |
| Badges | `python -B -m unittest discover -s .github/scripts/tests -p test_coverage_badges.py -v` | Job de publicação no push confiável para `develop` | Criar branch dedicada e validar permissões mínimas do token. |
| Docs | `git diff --check`; conferir README e `../lab-solos.wiki/Plano-de-Testes.md` | `Documentation quality` | Confirmar links para o artefato e regra de branches. |
| Verificação integral | Pipeline em PR para `develop` e push integrado | `Quality gate` e job de publicação | Artefato, badges e política precisam apontar para o SHA/execução verificados. |

## Matriz de rastreabilidade

| Requisito | Componentes | Testes | Evidência |
|---|---|---|---|
| RF-001, CA-001 | Coletores frontend/backend, schema v2 | Fixtures de linha e branch, identidade igual | Quatro medições válidas com mesmo SHA/run/attempt |
| RF-002, CA-002 | Checker de cobertura | 70% exato, below threshold por módulo, inválido | Saída identificando o módulo e a causa |
| RF-002, CA-003 | Checker | Linhas abaixo de 70% e branches no limiar | Gate aprovado e duas métricas impressas |
| RF-003, CA-004 | Gerador de SVG, job push-only e README | Menor módulo, inválido, sem dados antigos, token ausente | SVGs atualizados em `coverage` por um push confiável |
| RF-004, CA-005 | Reporters Vitest/Coverlet e upload de artefato | HTML presente, identidade e retenção no contrato | `coverage-html` navegável no run de origem |
| RF-005, CA-006 | README e Plano de Testes na Wiki | Checagem documental das duas referências | Texto da Wiki explicita 70% branches e linhas informativas |
| RNF-001 | Coletores, gate e gerador | SHA/run/attempt divergentes e contagens inválidas | Divergência reprova e badge fica indisponível |
| RNF-002 | Workflow e permissões | Contrato de evento, job e nível de token | PR não executa escrita; push em `develop` atualiza somente a branch dedicada |
| RNF-003 | README, Wiki e artefatos | Conferência de link e política de retenção | 30 dias e acesso descritos de forma consistente |

## Alternativas e decisões

| Decisão | Alternativas | Recomendação | Escolha confirmada | Consequências |
|---|---|---|---|---|
| Métrica do gate | Linhas ou branches | Gate de branches e linhas informativas | Branches, 70%, conforme a issue #505 | Requer branch count nos dois coletores; não remove linha coverage. |
| Publicação persistente de badge | GitHub Pages; serviço externo; branch gerada | SVGs de origem própria em branch dedicada `coverage` | Escolhida nesta especificação; repositório é público e Pages não está habilitado | Requer escrita mínima do token somente no job trusted push. |
| Acesso ao relatório HTML | GitHub Pages público ou artefato da execução | Artifact do GitHub Actions, com retenção documentada e link no README | Artifact, 30 dias | Consulta vinculada ao run e permissões de leitura do repositório. |
| Resumo visível dos módulos | Média; maior; menor | Menor percentual por métrica | Escolhida para não mascarar o módulo abaixo | Relatório detalha os dois módulos. |
| Publicação a partir de PR | Todos os eventos ou somente branch integrada | Somente push a `develop` | Restrição adotada | PRs não recebem permissão de escrita; badges representam estado integrado. |

## Riscos e mitigação

- Contadores do V8 e Coverlet não usam a mesma representação interna: coletar contagens nativas, fixtures por formato e comparar o resumo gerado com a saída HTML da ferramenta.
- Relatório ausente poderia manter badge antigo: produzir estado `indisponível` para run sem medida e fazer o gate reprovar.
- Concorrência de pushes pode sobrescrever valor mais novo: serializar publicação e conferir o SHA antes do commit da branch `coverage`.
- A política de Actions pode negar escrita de `GITHUB_TOKEN`: manter permissão restrita ao job e deixar erro explícito, sem PAT ou ampliação global.
- O README pode apontar para imagem atualizada com atraso de cache: a consulta navegável da execução continua sendo a fonte; o badge não deve ser apresentado como relatório detalhado.
- O Plano de Testes local da Wiki já contém alterações: editar sua versão atual sem resetar e não declarar publicação externa.

## Perguntas abertas

Nenhuma decisão arquitetural ou de produto está pendente. A execução deve confirmar a permissão de escrita mínima para `coverage`; se a política remota a bloquear, registrar a tarefa operacionalmente bloqueada e reavaliar o canal sem alterar outras permissões.
