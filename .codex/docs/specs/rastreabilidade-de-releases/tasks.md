# Tarefas — Rastreabilidade de releases

- Status: bloqueado — T001–T002 e T005–T010 concluídas localmente; T003–T004 aguardam evidência remota e autoridade de release
- PRD: [Rastreabilidade de releases](./prd.md)
- Especificação técnica: [Rastreabilidade de releases](./techspec.md)
- Atualizado em: 2026-11-24

Ler o PRD e a especificação técnica antes de executar cada tarefa. As ondas registram a ordem após a liberação dos bloqueios. Os testes da publicação usam simulações. Consultas oficiais futuras serão de leitura, com acesso autorizado quando necessário.

## Ondas de execução

| Onda | Tarefas | Motivo de segurança do paralelismo |
| --- | --- | --- |
| 1 | T001, T002, T005, T007 | Changelog, diagnóstico histórico, validador e verificação pré-merge possuem arquivos distintos. |
| 2 | T003, T006, T008, T009 | A matriz histórica, a preparação do workflow, a resolução de identidade e a verificação de canais usam caminhos e entradas locais distintos. T006 deve concluir antes de T010 alterar o workflow de release. |
| 3 | T004, T010 | O tratamento histórico e a integração do workflow têm escritas distintas. As simulações do workflow usam fixtures isoladas. |

## Coordenação entre planos

- T007 deve ter janela exclusiva para editar `.github/workflows/container-ci.yml` e `.github/scripts/tests/test_container_ci_workflow.py`. Priorizar seu ajuste independente antes de [cobertura e segurança T008](../cobertura-e-seguranca-na-ci/tasks.md#t008--integrar-resultados-e-bloqueios-ao-pré-merge). Reconferir a posse e a versão mais recente dos arquivos quando os planos forem agendados juntos.

## T001 — Conciliar o histórico recente no changelog

- Status: concluída
- Issue: #488
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-001, CA-001
- Caminhos sob responsabilidade: `CHANGELOG.md`

### Escopo

Conferir notas oficiais, diferenças entre as tags e PRs e issues de origem de 2.7.3, 2.7.4 e 2.7.5, incluindo #443 e #458. Acrescentar as três seções com seus links e datas de publicação em UTC e mover apenas itens cuja primeira versão publicada tenha evidência. Dividir entradas agrupadas quando necessário para mapear suas entregas.

### Critérios de conclusão

- Cada versão tem uma seção inequívoca em ordem decrescente, referência oficial, data UTC e entregas rastreáveis. Cada item deslocado de “Não publicado” tem origem verificável e os itens sem confirmação permanecem nessa seção.

### Validação documental

- Comparar o changelog inicial com as versões e itens indicados no PRD. Na conferência editorial futura, comparar as seções finais, notas, diferenças entre tags e PRs de origem pelos links do [PRD](./prd.md).
- Usar `git log --oneline 2.7.2..2.7.5` se as refs estiverem disponíveis localmente. Conferir cada release com `gh release view 2.7.5 --repo ifpebj-ti/lab-solos --json tagName,publishedAt,url`, repetindo para 2.7.3 e 2.7.4 na etapa de consulta. Concluir a atribuição somente com fonte verificável.

## T002 — Preparar o levantamento das referências históricas

- Status: concluída
- Issue: #491
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-002, RNF-001, CA-002
- Caminhos sob responsabilidade: `.codex/docs/specs/rastreabilidade-de-releases/evidencias/T002.md`

### Escopo

Preparar a grade de coleta para `v1.0.0`, `1.0.1`, `2.0.0`, `2.0.1`, `2.0.2`, `2.0.3` e `2.1.0` nos quatro canais. Definir a anotação das referências exatas, commit resolvido, URL de release, digests disponíveis, fonte, data UTC e limitação observada. Ensaiar o preenchimento com amostras sintéticas e apontar quais referências o checkout permite ver.

### Critérios de conclusão

- A grade permite registrar prefixos originais, candidatos conflitantes, nomes de pacote históricos sustentados por fontes da época e os resultados de cada origem separadamente.
- O roteiro permite distinguir retorno conclusivo, erro de acesso e consulta incompleta. A regra de associação de versões entra em T003 após decisão.

### Validação documental

- Executar `git tag --list` para conferir as refs locais e verificar uma amostra sintética com candidato único, dois candidatos homônimos e fonte inacessível.

## T003 — Inventariar os quatro canais com a convenção histórica aprovada

- Status: bloqueada
- Issue: #491
- Dependências: T002
- Bloqueio: A convenção e as fontes estão definidas. As verificações dos quatro canais dependem de consultas remotas fora desta etapa local. A fotografia das refs Git presentes no checkout está em [evidência local parcial](./evidencias/T003.md); ela não comprova ausências em GitHub Releases ou GHCR nem conclui a associação entre grafias. Ver [decisão de planejamento](../decisoes-de-planejamento.md#cobertura-análise-defensiva-e-releases).
- Paralela: não
- Requisitos: RF-002, RNF-001, CA-002
- Caminhos sob responsabilidade: `.codex/docs/specs/rastreabilidade-de-releases/evidencias/T003.md` como registro de trabalho local

### Escopo

Consultar os canais em escopo na etapa autorizada, completar a matriz com referências brutas e evidência de associação e identificar ambiguidades e indisponibilidades por canal. Preservar digest de índice e digests de plataforma quando disponíveis e pertinentes.

### Critérios de conclusão

- Cada versão em escopo tem data UTC, fontes repetíveis, tag e commit, release e as referências das duas imagens ou o respectivo diagnóstico. A regra aprovada e as equivalências ambíguas ficam explícitas.

### Validação documental

- Repetir amostra com e sem prefixo, registrando a fonte de cada conclusão. Na etapa autorizada, usar `git ls-remote --tags origin`, `gh release view v1.0.0 --repo ifpebj-ti/lab-solos --json tagName,publishedAt,url` e `docker buildx imagetools inspect ghcr.io/ifpebj-ti/lab-solos-frontend:1.0.1` para as referências exatas pertinentes. Repetir a inspeção para o pacote do backend.

## T004 — Registrar o tratamento de cada lacuna histórica

- Status: bloqueada
- Issue: #491
- Dependências: T003
- Bloqueio: Aguarda conclusão do inventário dos quatro canais de T003 (a fotografia atual é somente local, em [evidencias/T003.md](./evidencias/T003.md)), autoridade efetiva de release e destino do inventário. Nenhuma correção ou exceção histórica está aprovada. Ver [decisão de planejamento](../decisoes-de-planejamento.md#cobertura-análise-defensiva-e-releases).
- Paralela: não
- Requisitos: RF-003, RNF-001, CA-003
- Caminhos sob responsabilidade: `.codex/docs/specs/rastreabilidade-de-releases/evidencias/T004.md` para a trilha documental de aceite

### Escopo

Revisar cada ocorrência de T003 e registrar correção conferida ou exceção aprovada no meio autorizado. A execução local documenta a disposição e as provas. Uma ação de correção em canal publicado depende de autorização específica e evidência de origem.

### Critérios de conclusão

- Cada lacuna tem estado, fonte, responsável, evidência, justificativa, revisão e data de aceite. Ausência confirmada, divergência e impossibilidade de verificação ficam distinguíveis. Evidências pendentes mantêm a ocorrência em aberto.

### Validação documental

- Conferir todas as ocorrências da matriz e reproduzir uma amostra das consultas de T003. Comparar evidências autorizadas de correção ou aprovação de exceção com o respectivo registro.

## T005 — Validar a seção exata da versão no changelog selecionado

- Status: concluída
- Issue: #488
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-004, CA-004
- Caminhos sob responsabilidade: `.github/scripts/check_release_changelog.py`, `.github/scripts/tests/test_check_release_changelog.py`, `.github/scripts/tests/fixtures/release_changelog/**`

### Escopo

Criar o validador que recebe versão canônica e conteúdo da revisão selecionada. Reconhecer a convenção atual de cabeçalho Markdown de segundo nível com versão em link e data ISO. Expor mensagem associada à versão e ao SHA em erro.

### Critérios de conclusão

- Aprovar uma única seção própria. Reprovar entrada ausente, ambígua, duplicada e correspondência parcial. Menções no corpo, exemplos e a seção “Não publicado” não são tratados como entrada.

### Plano TDD

- RED: usar fixtures de cabeçalho válido, formato inválido, corpo com a versão, versão parecida, cabeçalho repetido e apenas “Não publicado”.
- GREEN: aplicar leitura controlada da seção e emitir resultado com versão e SHA.
- REFACTOR: alinhar a gramática ao formato documentado e centralizar diagnósticos.

### Validação

- Após escrever o teste, executar `python -m unittest discover -s .github/scripts/tests -p "test_check_release_changelog.py" -v`.
- Executar `python -m unittest discover -s .github/scripts/tests -p "test_*.py" -v`.

## T006 — Ligar a checagem do changelog à preparação da release

- Status: concluída
- Issue: #488
- Dependências: T001, T005
- Dependências externas: [modernização da esteira T008](../modernizacao-esteira-conteineres/tasks.md#t008--criar-release-até-digests-varridos-sem-tags-públicas), preparação de release e cadeia de jobs.
- Paralela: não
- Requisitos: RF-004, CA-004
- Caminhos sob responsabilidade: `.github/workflows/container-release.yml`, `.github/scripts/tests/test_container_release_workflow.py`

### Escopo

Acionar o verificador de T005 na preparação após resolver versão e SHA, lendo o arquivo da revisão efetivamente selecionada. Bloquear a cadeia que pode escrever em canais de publicação quando a entrada estiver inválida. Preservar o tratamento de `outros` e do dispatch manual na `main`.

### Critérios de conclusão

- Simulações de entrada própria, entrada de outra versão e arquivo de outro SHA exercitam a ordem de execução. O erro identifica versão e SHA e precede uploads e escritas.
- Preparar a disponibilização futura após T001 e uma entrada confirmada para a próxima versão.

### Plano TDD

- RED: testar a ausência da checagem, leitura da revisão errada e possibilidade de iniciar escrita antes do resultado.
- GREEN: integrar a verificação aos casos com `release=true` e tornar seu sucesso precondição dos jobs de publicação.
- REFACTOR: reutilizar o SHA resolvido e a configuração existente dos jobs.

### Validação

- Executar `python -m unittest discover -s .github/scripts/tests -p "test_container_release_workflow.py" -v`.
- Simular resolução com `python .github/scripts/resolve_container_version.py --event workflow_dispatch --version 2.7.5 --ref refs/heads/main`.

## T007 — Estender actionlint ao workflow de release no pré-merge

- Status: concluída
- Issue: #488
- Dependências: nenhuma
- Dependências externas: [modernização da esteira T001](../modernizacao-esteira-conteineres/tasks.md#t001--prover-instalação-reprodutível-do-actionlint) e [T007](../modernizacao-esteira-conteineres/tasks.md#t007--criar-ci-pré-merge-de-contêineres), instalação de actionlint e contratos pré-merge.
- Paralela: sim
- Requisitos: RF-004, RF-005, CA-004, CA-005, CA-006
- Caminhos sob responsabilidade: `.github/workflows/container-ci.yml`, `.github/scripts/tests/test_container_ci_workflow.py`

### Escopo

Estender a etapa existente de actionlint em `Workflow contracts` para analisar também `container-release.yml`. Preservar os eventos pré-merge e a descoberta dos testes Python do repositório.

### Critérios de conclusão

- O contrato pré-merge exige análise dos dois workflows. Os testes de release entram na descoberta do workflow e o lint completo passa localmente.

### Plano TDD

- RED: acrescentar ao teste de contrato a exigência de análise de `container-release.yml` e observar a falha.
- GREEN: incluir o arquivo na etapa existente e validar os dois workflows.
- REFACTOR: manter a instalação versionada e a mesma etapa de lint para ambos.

### Validação

- Executar `python -m unittest discover -s .github/scripts/tests -p "test_container_ci_workflow.py" -v`.
- No runner Linux, executar `bash .github/scripts/install_actionlint.sh .tmp/actionlint` e `.tmp/actionlint/actionlint .github/workflows/container-ci.yml .github/workflows/container-release.yml`.

### Notas

A validação pré-merge também cobre as mudanças relacionadas a #491.

## T008 — Recuperar versão e SHA para a mesma intenção de publicação

- Status: concluída
- Issue: #491
- Dependências: nenhuma
- Dependências externas: [modernização da esteira T002](../modernizacao-esteira-conteineres/tasks.md#t002--implementar-resolução-segura-da-versão-de-contêiner), resolução de versão existente.
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#cobertura-análise-defensiva-e-releases).
- Paralela: não
- Requisitos: RF-005, RNF-002, CA-006
- Caminhos sob responsabilidade: `.github/scripts/resolve_container_version.py`, `.github/scripts/tests/test_resolve_container_version.py`

### Escopo

Estender a resolução para manter um único par versão e SHA por intenção. Usar o mecanismo aprovado para recuperar o resultado em reexecução e bloquear conflito ou correspondência múltipla. Preservar os fluxos automático, manual e `outros`.

### Critérios de conclusão

- A mesma intenção recupera a mesma versão e o mesmo SHA mesmo após publicação de uma versão posterior. Reexecução com conflito é diagnosticada antes de qualquer escrita.

### Plano TDD

- RED: reproduzir o recálculo de versão com o mesmo evento e lista diferente de releases. Simular conflito de SHA, ambiguidade, execução manual e `outros`.
- GREEN: recuperar e validar a identidade da intenção pelo contrato aprovado.
- REFACTOR: preservar o uso do validador SemVer e concentrar a resolução da identidade no ponto de preparação.

### Validação

- Executar `python -m unittest discover -s .github/scripts/tests -p "test_resolve_container_version.py" -v`.

## T009 — Verificar identidade de tag, release e imagens por leitura

- Status: concluída
- Issue: #491
- Dependências: nenhuma
- Dependências externas: [modernização da esteira T003](../modernizacao-esteira-conteineres/tasks.md#t003--implementar-validação-exata-de-manifestos-oci), comparação de índices OCI.
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#cobertura-análise-defensiva-e-releases).
- Paralela: não
- Requisitos: RF-005, RNF-002, CA-005, CA-006
- Caminhos sob responsabilidade: `.github/scripts/check_release_channels.py`, `.github/scripts/validate_container_manifest.py`, `.github/scripts/tests/test_check_release_channels.py`, `.github/scripts/tests/test_validate_container_manifest.py`, `.github/scripts/tests/fixtures/release_channels/**`

### Escopo

Validar o commit resolvido da tag Git exata, a publicação estável associada à tag e as imagens dos dois módulos. Usar o verificador OCI para índices, plataformas, digest e origem. Distinguir ausência, conflito, consulta incompleta e consistência de cada canal.

### Critérios de conclusão

- O verificador identifica versão, SHA, canal, referências, URL da release e digests. Tag anotada resolve até commit. Rótulo OCI idêntico com digest divergente gera falha. Falha de consulta por acesso ou infraestrutura gera resultado inconclusivo.

### Plano TDD

- RED: simular tag simples e anotada, destino conflitante, release ausente ou em estado incompatível, imagem ausente, digest divergente com a mesma revisão e leitura incompleta.
- GREEN: verificar os quatro canais por adaptadores de consulta simuláveis e aplicar a prova de digest aprovada.
- REFACTOR: reaproveitar os contratos de manifesto e produzir diagnósticos uniformes sem registrar credenciais.

### Validação

- Após escrever o teste, executar `python -m unittest discover -s .github/scripts/tests -p "test_check_release_channels.py" -v`.
- Executar `python -m unittest discover -s .github/scripts/tests -p "test_validate_container_manifest.py" -v`.

## T010 — Integrar a proteção e a confirmação dos quatro canais à publicação

- Status: concluída
- Issue: #491
- Dependências: T001, T006, T007, T008, T009
- Dependências externas: [modernização da esteira T009](../modernizacao-esteira-conteineres/tasks.md#t009--promover-e-verificar-as-tags-versionadas-multi-arch) e [T010](../modernizacao-esteira-conteineres/tasks.md#t010--promover-latest-com-rollback-e-criar-uma-única-github-release), promoção versionada e fluxo de disponibilização.
- Decisão registrada: [decisão de planejamento](../decisoes-de-planejamento.md#cobertura-análise-defensiva-e-releases).
- Paralela: não
- Requisitos: RF-004, RF-005, RNF-002, CA-004, CA-005, CA-006
- Caminhos sob responsabilidade: `.github/workflows/container-release.yml`, `.github/scripts/release_publication_sequence.py`, `.github/scripts/tests/test_container_release_workflow.py`, `.github/scripts/tests/test_release_publication_sequence.py`

### Escopo

Integrar as verificações de identidade e changelog à preparação e conferir precondições antes de promover ou publicar. Confirmar tag Git, GitHub Release e dois índices GHCR por leitura após a sequência aprovada. Preservar a serialização, isolar credenciais de escrita e expor o estado de cada canal quando houver falha total ou parcial.

### Critérios de conclusão

- Simulações exercitam publicação inicial, `outros`, repetição íntegra, repetição antiga após publicação nova, colisão, consulta incompleta e resposta de escrita ambígua.
- Nas simulações de repetição íntegra e conflito, as referências já publicadas ficam preservadas, inclusive `latest` de versão posterior. Recuperação parcial preenche somente referências ausentes cuja identidade seja confirmada pela política aprovada.
- O sumário identifica versão, SHA, execução/tentativa, resultados e prova de cada canal. A próxima versão tem entrada conciliada antes da ativação.

### Plano TDD

- RED: registrar a sequência de operações das simulações e detectar qualquer sobrescrita ou escrita antes da confirmação de precondições.
- GREEN: integrar as leituras, limitar escritas à sequência aprovada e verificar o estado final com diagnóstico por canal.
- REFACTOR: reaproveitar os jobs atuais e repetir os testes do fluxo de promoção e de reúso.

### Validação

- Após escrever o teste, executar `python -m unittest discover -s .github/scripts/tests -p "test_release_publication_sequence.py" -v` e, em seguida, `python -m unittest discover -s .github/scripts/tests -p "test_*.py" -v`.
- No runner Linux com actionlint instalado, executar `.tmp/actionlint/actionlint .github/workflows/container-ci.yml .github/workflows/container-release.yml`. Guardar os registros simulados de operações sem criar tags, releases ou imagens em canais reais.

### Notas

O contrato integrado também preserva a checagem de changelog da #488.

## Log de execução

| Data | Tarefa | Resultado | Testes/evidências | Observações |
| --- | --- | --- | --- | --- |
| 2026-11-24 | T004 | bloqueada; nenhuma disposição histórica autorizada | Reavaliação após a fotografia local de T003, em `evidencias/T003.md`. | T003 ainda não cobre GitHub Releases nem GHCR e não confirma publicação ou digest. Não classificar refs ausentes no checkout como lacunas publicadas nem escolher entre os candidatos `1.0.0`/`v1.0.0`. Responsável efetivo e destino do inventário seguem sem evidência; T004 não inicia até T003 ser concluída. |
| 2026-11-24 | T003 | evidência local parcial; tarefa permanece bloqueada | Repetidas as 14 consultas exatas de refs e inspeção de workflows/compose em tags locais; commits, tipos e blobs registrados em `evidencias/T003.md`. | Confirmados dois commits distintos e duas linhagens de pacote para `1.0.0`/`v1.0.0`; pacote `jrrs1/*-labon` para `v1.0.0`/`1.0.1`; `ghcr.io/.../lab-solos-*` nas fontes locais de `1.0.0` e `2.0.0`–`2.0.2`. `2.0.3` e `2.1.0` não têm refs locais. GitHub Releases e registros não foram consultados nem inferidos; T004 continua aguardando inventário e autoridade de release. |
| 2026-11-17 | T010 | concluída localmente | Sequência 14/14, contrato do workflow 30/30, regressão Python 438/438 com 2 skips existentes; YAML parse e Bash -n nos 24 blocos passaram; diff --check limpo. | Reexecução reaproveita intenção/prova; recuperação é restrita a canais ausentes comprovados; validação ocorre antes da release estável e impede rollback de `latest`. Não foi possível rodar actionlint (indisponível localmente); nenhum artefato real foi publicado. |
| 2026-11-16 | T008/T009 | validação integrada | Regressão Python completa com 424 testes, 2 skips existentes e zero falhas. | Usado ambiente local existente com PyYAML 6.0.3 e core.autocrlf=false apenas no processo de teste para os repositórios temporários. Corrige as limitações de ambiente da primeira execução. |
| 2026-11-16 | T008 | concluída | RED com 6 falhas por ausência de intenção persistente. GREEN/REFACTOR com 17 testes do resolvedor. | Orquestrador revalidou 17 testes. Integração do manifesto no workflow pertence à T010. |
| 2026-11-16 | T009 | concluída | RED com publicação consistente retornando erro. GREEN/REFACTOR com 12 testes do verificador e 10 do manifesto OCI. | Orquestrador revalidou ambos. Consultas simuladas, sem acesso remoto. Regressão Python ampla encontrou PyYAML ausente em 5 módulos e divergência do manual local contra commit. |
| 2026-11-15 | T005 | concluída | RED pelo CLI ausente e por cabeçalhos ambíguos. GREEN/REFACTOR: 10 testes, py_compile e verificação da seção 2.7.2. | Revalidação integrada com Cobertura: 19 testes. Vínculo do arquivo ao SHA e gate de publicação ficam em T006. |
| 2026-11-15 | T001 | concluída | RED: três versões sem seção. GREEN/REFACTOR: validador passou para 2.7.3, 2.7.4 e 2.7.5 e 10 testes passaram. | Todas as 5 entradas conciliadas. 2.7.5 conferida pelo commit local 09d9b41 e pela data oficial registrada anteriormente; tag e notas sem nova consulta remota. |
| 2026-11-16 | T002 | concluída | Grade inicialmente ausente. Validados 28 pares de coleta, 14 grafias Git, 6 refs locais com SHA e 5 cenários sintéticos. | Inventário somente local; associação histórica e consultas externas previstas em T003. |
| 2026-11-16 | T007 | concluída | RED: comando ignorava container-release.yml. GREEN/REFACTOR: 11 testes de CI, 27 de release, 10 de changelog; actionlint 1.7.12 nos dois YAML. | Validado também pelo orquestrador em Docker sem rede. Nenhum workflow foi disparado. |
| 2026-11-16 | T006 | concluída | RED: 3 falhas de contrato. GREEN/REFACTOR: 62 testes dirigidos, simulações do SHA e actionlint local. | O gate confere o changelog do SHA resolvido antes das escritas. Nenhuma execução do workflow. |
