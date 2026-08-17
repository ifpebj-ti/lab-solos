# Tarefas: Modernização da esteira de contêineres

- Status: execução local concluída; validações externas pendentes
- PRD: `./prd.md`
- Especificação técnica: `./techspec.md`
- Atualizado em: 2026-08-17

## Regras de execução

- Cada tarefa exige a leitura do PRD e da especificação técnica antes da implementação.
- Uma execução de `$execute-task` deve concluir exatamente uma tarefa e parar.
- Ações Git externas, dispatch, alteração de configurações GitHub, remoção de secrets, push ou Pull Request exigem autorização explícita no momento da execução.
- Arquivos OCI, relatórios e binários baixados para validação devem ficar em diretório temporário e não entrar no commit.
- Se uma validação de integração encontrar defeito em arquivo fora dos caminhos da tarefa, reabrir/devolver à tarefa proprietária; não ampliar silenciosamente o escopo.
- Alterações já existentes no worktree, especialmente artefatos rastreados em `backend/Tests/bin` e `backend/Tests/obj`, não pertencem a esta iniciativa e devem ser preservadas.

## Ondas de execução

| Onda | Tarefas | Motivo de segurança do paralelismo |
|---|---|---|
| 1 | T001, T002, T003, T004, T011 | Instalador, resolvedor SemVer, validador de manifesto, política Trivy e Dependabot possuem arquivos exclusivos e contratos independentes |
| 2 | T005, T006 | Frontend e backend possuem Dockerfiles e testes de caracterização distintos |
| 3 | T007, T008 | CI e release usam workflows/testes diferentes e apenas consomem contratos concluídos das ondas anteriores |
| 4 | T009 | Altera o mesmo workflow/teste de release de T008 e depende dos digests produzidos por ele |
| 5 | T010 | Completa `latest`, rollback e GitHub Release sobre o workflow já promovendo versões |
| 6 | T012 | Remove os workflows antigos e troca badges somente depois de CI e release novas estarem completas |
| 7 | T013 | Integra todas as frentes e exige o estado final da árvore; não possui correções funcionais próprias |
| 8 | T014 | Opera GHCR/configurações externas e só pode ocorrer após evidência pré-merge e promoção autorizada para `main` |

## Mapa resumido de rastreabilidade

| Requisito | Tarefas |
|---|---|
| RF-001 | T003, T005, T006, T008, T009, T010, T013, T014 |
| RF-002 | T004, T005, T006, T007, T008, T013, T014 |
| RF-003 | T007, T010, T012, T013, T014 |
| RF-004 | T002, T007, T008, T010, T013, T014 |
| RNF-001 | T003, T005, T006, T009, T010, T013, T014 |
| RNF-002 | T001, T002, T003, T004, T007, T008, T009, T010, T011, T012, T013, T014 |
| CA-001 | T003, T005, T006, T009, T010, T013, T014 |
| CA-002 | T004, T005, T006, T007, T008, T013, T014 |
| CA-003 | T007, T010, T012, T013, T014 |
| CA-004 | T002, T007, T008, T010, T013, T014 |

## T001 — Prover instalação reprodutível do actionlint

- Status: concluída
- Issue: #238
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RNF-002
- Caminhos sob responsabilidade: `.github/scripts/install_actionlint.sh`, `.github/scripts/tests/test_actionlint_installer.py`

### Escopo

Criar um instalador não interativo para actionlint 1.7.12 em Linux CI. O script deve baixar o artefato oficial fixado, verificar origem/integridade por attestation do GitHub, aceitar diretório de destino e expor o executável sem instalar globalmente. Não usar `latest`, `curl | bash`, Docker Hub ou ação de marketplace adicional.

### Critérios de conclusão

- Versão, repositório e nome do artefato são fixos e validados por teste sem rede.
- Falha de download ou verificação encerra o script com código diferente de zero.
- Nenhum token, resposta completa de API ou conteúdo de attestation é gravado em artefato público.
- O executável instalado informa a versão esperada e consegue analisar os workflows atuais.

### Plano TDD

- RED: escrever teste estrutural que falha enquanto o instalador não existe, usa versão mutável ou não verifica attestation.
- GREEN: implementar o menor script com `gh release download` e `gh attestation verify` até o teste e o smoke test passarem.
- REFACTOR: centralizar constantes, quoting e limpeza de temporários, preservando códigos de erro.

### Validação

- `python -m unittest discover -s .github/scripts/tests -p "test_actionlint_installer.py" -v`
- `bash .github/scripts/install_actionlint.sh .tmp/actionlint`
- `.tmp/actionlint/actionlint -version`
- `.tmp/actionlint/actionlint .github/workflows/*.yml`

### Notas

O smoke test de instalação exige Bash, GitHub CLI e rede. Em host sem esses pré-requisitos, o teste unitário pode passar, mas a tarefa permanece incompleta até a execução em Ubuntu CI.

## T002 — Implementar resolução segura da versão de contêiner

- Status: concluída
- Issue: #238
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-004, RNF-002, CA-004
- Caminhos sob responsabilidade: `.github/scripts/resolve_container_version.py`, `.github/scripts/tests/test_resolve_container_version.py`

### Escopo

Criar CLI Python sem dependências externas para resolver a versão da entrega. Para PR mesclado, aceitar corpo do PR e última tag válida, exigir exatamente uma opção do template e aplicar major/minor/patch; `outros` deve retornar estado explícito sem release. Para dispatch, exigir SemVer canônico sem `v` e ref `refs/heads/main`. A saída destinada ao `GITHUB_OUTPUT` deve ser estável e não executar conteúdo recebido.

### Critérios de conclusão

- Casos de primeira release, incrementos major/minor/patch, `outros`, tag inválida, zero/múltiplas opções e dispatch fora de `main` possuem testes.
- Entradas malformadas falham sem ecoar corpo completo do PR.
- O resultado distingue `release=true|false`, `version` e `change_type`.
- Reexecução com a mesma entrada produz saída idêntica.

### Plano TDD

- RED: escrever testes das tabelas de decisão e observar falhas pela ausência do CLI.
- GREEN: implementar parsing fechado e incremento SemVer mínimo, sem shell ou chamadas de rede.
- REFACTOR: separar validação, cálculo e serialização, mantendo a matriz de testes verde.

### Validação

- `python -m unittest discover -s .github/scripts/tests -p "test_resolve_container_version.py" -v`
- `python .github/scripts/resolve_container_version.py --help`

### Notas

Consulta à última GitHub Release pertence ao workflow; o script recebe a tag como dado e não usa `gh` internamente.

## T003 — Implementar validação exata de manifestos OCI

- Status: concluída
- Issue: #238
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-001, RNF-001, RNF-002, CA-001
- Caminhos sob responsabilidade: `.github/scripts/validate_container_manifest.py`, `.github/scripts/tests/test_validate_container_manifest.py`

### Escopo

Criar CLI Python que leia o JSON bruto de `docker buildx imagetools inspect --raw`, normalize somente descritores executáveis e aceite exclusivamente o conjunto `{linux/amd64, linux/arm64}`, sem duplicata. Também deve comparar versão e `latest` por digest/composição quando solicitado. Entrada ausente, inválida ou com descriptor inesperado é erro, nunca sucesso vazio.

### Critérios de conclusão

- Fixtures geradas no próprio teste cobrem uma plataforma, plataforma extra, duplicata, JSON inválido, attestations `unknown/unknown`, conjunto exato e divergência versão/`latest`.
- O modo estrito rejeita descriptor não executável, coerente com `provenance: false`/`sbom: false` da especificação.
- Códigos de saída distinguem contrato violado de entrada inválida.
- Saída de sucesso lista as duas plataformas em ordem determinística.

### Plano TDD

- RED: escrever fixtures/testes antes do CLI e observar falha por arquivo ausente.
- GREEN: implementar parsing/normalização mínimos até aceitar apenas o índice esperado.
- REFACTOR: extrair comparação e mensagens diagnósticas sem relaxar o conjunto permitido.

### Validação

- `python -m unittest discover -s .github/scripts/tests -p "test_validate_container_manifest.py" -v`
- `python .github/scripts/validate_container_manifest.py --help`

### Notas

O CLI não acessa registry; jobs posteriores fornecem os JSONs inspecionados.

## T004 — Versionar a política e prover Trivy de forma reprodutível

- Status: concluída
- Issue: #234
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-002, RNF-002, CA-002
- Caminhos sob responsabilidade: `.trivy.yaml`, `.github/scripts/install_trivy.sh`, `.github/scripts/tests/test_trivy_installer.py`, `.github/scripts/tests/test_trivy_policy.py`

### Escopo

Criar a fonte única de política Trivy para imagens: scanner `vuln`, tipos `os,library`, severidades `HIGH,CRITICAL`, `ignore-unfixed: true` e código bloqueante `1`. Prover também instalador não global da versão 0.72.0 a partir do release oficial, com checksum publicado validado. Os testes sem rede devem rejeitar enfraquecimento da política, versão mutável ou download sem verificação.

### Critérios de conclusão

- `.trivy.yaml` é aceita pela versão Trivy fixada na CI.
- O instalador falha para checksum divergente e disponibiliza o executável em diretório informado pelo chamador.
- O teste estrutural prova todos os campos e falha se `ignore-unfixed`, severidade ou código de saída forem alterados.
- A política não contém credencial, URL privada, suppressions ou `.trivyignore` implícito.
- Formatação SARIF/tabela pode sobrescrever apenas formato/saída; não pode sobrescrever o filtro bloqueante.

### Plano TDD

- RED: criar testes que falham pela ausência de `.trivy.yaml`, do instalador, da versão fixa e dos controles obrigatórios.
- GREEN: adicionar a configuração e o instalador mínimos até os testes e o smoke test passarem.
- REFACTOR: ordenar/comentar a política e centralizar versão/checksum sem duplicar valores nos workflows.

### Validação

- `python -m unittest discover -s .github/scripts/tests -p "test_trivy_policy.py" -v`
- `python -m unittest discover -s .github/scripts/tests -p "test_trivy_installer.py" -v`
- `bash .github/scripts/install_trivy.sh .tmp/trivy`
- `.tmp/trivy/trivy version`
- `cd frontend && npx prettier --check ../.trivy.yaml`
- `.tmp/trivy/trivy image --config .trivy.yaml --help`

### Notas

O instalador deve reconhecer a plataforma do runner suportado ou falhar com diagnóstico; não instalar globalmente. O cenário real com arquivo OCI ocorre em T005/T006 e o comportamento relatório + SARIF + falha é exercitado pelos workflows em T007/T008.

## T005 — Caracterizar e validar a imagem frontend nas duas arquiteturas

- Status: concluída
- Issue: #238
- Dependências: T004
- Paralela: sim
- Requisitos: RF-001, RF-002, RNF-001, CA-001, CA-002
- Caminhos sob responsabilidade: `frontend/Dockerfile`, `.github/scripts/tests/test_frontend_container.py`

### Escopo

Adicionar caracterização do contrato atual do frontend: build multi-stage determinístico com `npm ci`, runtime Nginx, entrypoint e porta 80. Construir arquivos OCI reais para AMD64 e ARM64 com Buildx/QEMU e varrer ambos com a política versionada. Alterar o Dockerfile somente se uma falha real de arquitetura ou contrato exigir a menor correção; não atualizar framework/runtime por conveniência.

### Critérios de conclusão

- Teste de caracterização preserva contexto, lockfile, entrypoint e porta existentes.
- Builds `linux/amd64` e `linux/arm64` terminam e geram arquivos OCI legíveis.
- Trivy consegue ler ambos e aplica a política; achado bloqueante real impede conclusão até correção no Dockerfile/base dentro do escopo.
- Nenhum sufixo de arquitetura é introduzido como tag pública.

### Plano TDD

- RED: escrever primeiro a caracterização; se o comportamento já estiver correto, registrar o verde inicial sem quebrá-lo artificialmente. Uma falha real no build/scan ARM ou em contrato é o RED observável.
- GREEN: fazer a menor mudança no Dockerfile somente quando necessária para os dois builds/scans passarem.
- REFACTOR: melhorar cache/clareza de estágios sem trocar porta, entrypoint ou runtime funcional.

### Validação

- `python -m unittest discover -s .github/scripts/tests -p "test_frontend_container.py" -v`
- `docker buildx build --platform linux/amd64 --output type=oci,dest=frontend-amd64.tar -f frontend/Dockerfile frontend`
- `docker buildx build --platform linux/arm64 --output type=oci,dest=frontend-arm64.tar -f frontend/Dockerfile frontend`
- `mkdir frontend-amd64-oci frontend-arm64-oci && tar -xf frontend-amd64.tar -C frontend-amd64-oci && tar -xf frontend-arm64.tar -C frontend-arm64-oci`
- `.tmp/trivy/trivy image --config .trivy.yaml --input frontend-amd64-oci`
- `.tmp/trivy/trivy image --config .trivy.yaml --input frontend-arm64-oci`

### Notas

Não versionar os arquivos `.tar`. Se Docker/QEMU/Trivy não estiver disponível, registrar o bloqueio; inspeção textual isolada não conclui a tarefa.

## T006 — Caracterizar e validar a imagem backend nas duas arquiteturas

- Status: concluída
- Issue: #238
- Dependências: T004
- Paralela: sim
- Requisitos: RF-001, RF-002, RNF-001, CA-001, CA-002
- Caminhos sob responsabilidade: `backend/Dockerfile`, `.github/scripts/tests/test_backend_container.py`

### Escopo

Adicionar caracterização do contrato atual do backend: build multi-stage .NET 8, runtime ASP.NET, usuário não-root `app`, entrypoint e porta 8080. Construir arquivos OCI reais para AMD64 e ARM64 com Buildx/QEMU e varrer ambos. Alterar o Dockerfile somente diante de falha real e sem mudar API, porta ou versão principal do .NET.

### Critérios de conclusão

- Teste de caracterização preserva usuário não-root, assembly de entrada e porta.
- Builds `linux/amd64` e `linux/arm64` terminam e geram arquivos OCI legíveis.
- Trivy lê os dois arquivos e aplica a política bloqueante.
- Nenhum artefato `bin/obj` rastreado é incorporado ao diff da tarefa.

### Plano TDD

- RED: escrever primeiro a caracterização; se ela passar, usar eventual falha real do build/scan ARM como RED e não fabricar regressão.
- GREEN: aplicar somente o ajuste necessário ao Dockerfile para os dois alvos.
- REFACTOR: manter estágios/cópias legíveis e cacheáveis com todos os contratos verdes.

### Validação

- `python -m unittest discover -s .github/scripts/tests -p "test_backend_container.py" -v`
- `docker buildx build --platform linux/amd64 --output type=oci,dest=backend-amd64.tar -f backend/Dockerfile backend`
- `docker buildx build --platform linux/arm64 --output type=oci,dest=backend-arm64.tar -f backend/Dockerfile backend`
- `mkdir backend-amd64-oci backend-arm64-oci && tar -xf backend-amd64.tar -C backend-amd64-oci && tar -xf backend-arm64.tar -C backend-arm64-oci`
- `.tmp/trivy/trivy image --config .trivy.yaml --input backend-amd64-oci`
- `.tmp/trivy/trivy image --config .trivy.yaml --input backend-arm64-oci`

### Notas

Restaurar somente efeitos gerados pelos comandos .NET que não existiam antes da tarefa; nunca limpar alterações preexistentes em massa.

## T007 — Criar CI pré-merge de contêineres

- Status: concluída (correção de checks obrigatórios estáveis validada localmente)
- Issue: #234
- Dependências: T001, T004, T005, T006
- Paralela: sim
- Requisitos: RF-002, RF-003, RF-004, RNF-002, CA-002, CA-003, CA-004
- Caminhos sob responsabilidade: `.github/workflows/container-ci.yml`, `.github/scripts/tests/test_container_ci_workflow.py`

### Escopo

Criar workflow em `pull_request` para `develop` e `workflow_dispatch`, com `concurrency` cancelável, filtros de caminhos e timeouts. Jobs paralelos executam qualidade frontend/backend, testes Python/actionlint e matriz 2x2 que exporta OCI sem push, extrai o layout OCI para compatibilidade com Trivy 0.72.0, gera tabela/SARIF, retém artefatos por 30 dias e aplica o gate Trivy por último. Upload ao Code Scanning deve usar categoria única e fallback seguro para fork/Dependabot.

### Critérios de conclusão

- PR para `develop` executa os tipos padrão; não há `closed`, `main` ou `pull_request_target` no gatilho de CI.
- Permissão padrão é `contents: read`; somente o job de SARIF recebe `actions: read`/`security-events: write` quando aplicável.
- CI não contém login de registry, `packages: write`, push, criação de release, Azure, Docker Scout ou secrets Docker Hub.
- A matriz cobre exatamente dois componentes e duas plataformas, com tabela/SARIF antes do passo bloqueante.
- Teste estrutural e actionlint falham ao remover qualquer proteção essencial.

### Plano TDD

- RED: escrever teste estrutural e observar falha pela ausência do workflow e de seus jobs.
- GREEN: adicionar o workflow mínimo até testes, Prettier e actionlint passarem.
- REFACTOR: consolidar matriz/env/cache e manter permissões por job explícitas.

### Validação

- `python -m unittest discover -s .github/scripts/tests -p "test_container_ci_workflow.py" -v`
- `python -m unittest discover -s .github/scripts/tests -p "test_*.py" -v`
- `bash .github/scripts/install_actionlint.sh .tmp/actionlint`
- `.tmp/actionlint/actionlint .github/workflows/container-ci.yml`
- `cd frontend && npx prettier --check ../.github/workflows/container-ci.yml`

### Notas

A execução real em PR e a confirmação de ausência de escrita ficam em T013; um workflow pós-merge verde não substitui essa evidência.

## T008 — Criar release até digests varridos, sem tags públicas

- Status: concluída
- Issue: #238
- Dependências: T001, T002, T004, T005, T006
- Paralela: sim
- Requisitos: RF-001, RF-002, RF-004, RNF-002, CA-002, CA-004
- Caminhos sob responsabilidade: `.github/workflows/container-release.yml`, `.github/scripts/tests/test_container_release_workflow.py`

### Escopo

Criar a primeira fatia do workflow de release: eventos de PR fechado para `main` com guarda de merge e dispatch com input SemVer/ref `main`; concorrência global sem cancelamento; resolução única da versão; checkout do SHA correto; login apenas no GHCR; matriz 2x2 Buildx/QEMU com `push-by-digest`, `name-canonical`, `provenance: false` e `sbom: false`; scan Trivy de cada digest com tabela/SARIF. Nesta tarefa ainda não criar tags versionadas, `latest` ou GitHub Release.

### Critérios de conclusão

- `outros` encerra sem autenticar/publicar e entrada inválida falha antes de qualquer escrita.
- Jobs declaram somente `contents: read`, `packages: write/read` e `security-events: write` conforme sua responsabilidade.
- Os quatro digests são persistidos com nomes determinísticos e o scan consome a referência imutável.
- Falha em qualquer build/scan impede jobs posteriores; não existe tag pública nesta fatia.
- Nenhuma referência Azure, Scout ou Docker Hub é adicionada.

### Plano TDD

- RED: criar testes de eventos, permissões, matriz, outputs e ausência de tags; observar falha pelo workflow inexistente.
- GREEN: implementar preparação, build por digest e scan até teste/actionlint ficarem verdes.
- REFACTOR: reduzir duplicação de metadados e nomes de artefato sem esconder fronteiras de permissão.

### Validação

- `python -m unittest discover -s .github/scripts/tests -p "test_container_release_workflow.py" -v`
- `python -m unittest discover -s .github/scripts/tests -p "test_resolve_container_version.py" -v`
- `bash .github/scripts/install_actionlint.sh .tmp/actionlint`
- `.tmp/actionlint/actionlint .github/workflows/container-release.yml`
- `cd frontend && npx prettier --check ../.github/workflows/container-release.yml`

### Notas

Não executar dispatch nem publicar digests durante esta tarefa sem autorização externa explícita; a validação do arquivo é local/CI.

## T009 — Promover e verificar as tags versionadas multi-arch

- Status: concluída (correção da reexecução idempotente validada localmente)
- Issue: #238
- Dependências: T003, T008
- Paralela: não
- Requisitos: RF-001, RNF-001, RNF-002, CA-001
- Caminhos sob responsabilidade: `.github/workflows/container-release.yml`, `.github/scripts/tests/test_container_release_workflow.py`

### Escopo

Estender o workflow para, somente após os quatro scans, reunir os dois digests de cada componente com `docker buildx imagetools create`, criar a mesma tag SemVer nas duas imagens e validar os JSONs brutos com `validate_container_manifest.py`. Detectar previamente colisão: tag existente idêntica é idempotente; composição divergente falha sem sobrescrita. Ainda não mover `latest` nem criar GitHub Release.

### Critérios de conclusão

- Tags versionadas dependem de todos os jobs de scan, não apenas do componente correspondente.
- Cada índice contém exatamente AMD64/ARM64 e mantém os nomes GHCR atuais, sem sufixo.
- As duas versões usam a mesma SemVer e revisão de `main`.
- Divergência, plataforma extra/ausente ou falha na segunda imagem impede conclusão.
- O teste estrutural prova que `latest` e GitHub Release continuam ausentes nesta etapa.

### Plano TDD

- RED: ampliar o teste para exigir agregação/verificação e observar falha no workflow da T008.
- GREEN: adicionar promoção versionada mínima e chamar o validador para as duas imagens.
- REFACTOR: padronizar coleta de digests e arquivos JSON mantendo a ordem scan -> tag -> inspeção.

### Validação

- `python -m unittest discover -s .github/scripts/tests -p "test_container_release_workflow.py" -v`
- `python -m unittest discover -s .github/scripts/tests -p "test_validate_container_manifest.py" -v`
- `.tmp/actionlint/actionlint .github/workflows/container-release.yml`
- `cd frontend && npx prettier --check ../.github/workflows/container-release.yml`

### Notas

Se o executável actionlint temporário da tarefa anterior não existir, executar novamente o instalador da T001.

## T010 — Promover latest com rollback e criar uma única GitHub Release

- Status: concluída (correção da primeira migração de `latest`)
- Issue: #238
- Dependências: T009
- Paralela: não
- Requisitos: RF-001, RF-003, RF-004, RNF-001, RNF-002, CA-001, CA-003, CA-004
- Caminhos sob responsabilidade: `.github/workflows/container-release.yml`, `.github/scripts/tests/test_container_release_workflow.py`

### Escopo

Completar o workflow: capturar previamente os digests de `latest`, promover as duas versões já verificadas para `latest`, comparar composições, executar rollback compensatório se apenas uma imagem avançar e criar uma única GitHub Release depois de todas as verificações. Registrar ator, SHA, versão, digests e URL no `GITHUB_STEP_SUMMARY`. Isolar `contents: write`/`packages: write` no job final.

### Critérios de conclusão

- `latest` só aparece depois das quatro varreduras e das duas tags versionadas verificadas.
- Rollback usa digests capturados antes da escrita e falha de modo acionável se não puder restaurar.
- GitHub Release é a última escrita e não duplica release idêntica em reexecução.
- `concurrency: container-release` usa `cancel-in-progress: false`.
- Não há implantação, permissão `packages: delete` ou credencial além de `GITHUB_TOKEN`.

### Plano TDD

- RED: ampliar testes para ordem, captura, rollback, resumo e release única; observar falha no workflow da T009.
- GREEN: implementar promoção de `latest`, compensação e criação final da release.
- REFACTOR: consolidar comandos de inspeção/promoção preservando verificações entre cada escrita.

### Validação

- `python -m unittest discover -s .github/scripts/tests -p "test_container_release_workflow.py" -v`
- `python -m unittest discover -s .github/scripts/tests -p "test_*.py" -v`
- `bash .github/scripts/install_actionlint.sh .tmp/actionlint`
- `.tmp/actionlint/actionlint .github/workflows/container-release.yml`
- `cd frontend && npx prettier --check ../.github/workflows/container-release.yml`

### Notas

O teste estrutural deve simular dependências/ordem, mas a compensação real no GHCR só pode ser evidenciada no dispatch controlado da T014.

## T011 — Habilitar atualizações das GitHub Actions fixadas

- Status: concluída
- Issue: #238
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RNF-002
- Caminhos sob responsabilidade: `.github/dependabot.yml`, `.github/scripts/tests/test_dependabot_configuration.py`

### Escopo

Adicionar entrada semanal `github-actions` na raiz, com `target-branch: develop`, limite de PRs, agrupamento e labels coerentes com DevSecOps. Preservar integralmente as entradas npm/NuGet atuais. O teste deve detectar remoção, alvo incorreto ou regressão das configurações existentes.

### Critérios de conclusão

- Dependabot cobre `/` para `github-actions` e direciona atualizações de versão a `develop`.
- Configurações npm/NuGet permanecem semanticamente idênticas.
- A entrada não concede permissões nem contém secrets.
- Teste estrutural passa junto da regressão existente.

### Plano TDD

- RED: ampliar o teste existente e observar falha pela ausência do ecossistema `github-actions`.
- GREEN: adicionar somente a entrada necessária.
- REFACTOR: alinhar comentários/grupos sem reordenar ou alterar políticas npm/NuGet.

### Validação

- `python -m unittest discover -s .github/scripts/tests -p "test_dependabot_configuration.py" -v`
- `cd frontend && npx prettier --check ../.github/dependabot.yml`

### Notas

Dependabot pode trocar o SHA fixado mantendo a tag em comentário; revisão humana confirma origem e notas da versão.

## T012 — Remover pipelines obsoletos e atualizar indicadores

- Status: concluída
- Issue: #235
- Dependências: T007, T010, T011
- Paralela: não
- Requisitos: RF-003, RNF-002, CA-003
- Caminhos sob responsabilidade: `.github/workflows/pipeline-front.yml`, `.github/workflows/pipeline-back.yml`, `README.md`, `.github/scripts/tests/test_container_workflow_cleanup.py`

### Escopo

Remover os dois workflows legados apenas depois de seus substitutos estarem completos. Atualizar os badges do README para `container-ci.yml` e `container-release.yml`. Criar auditoria estrutural que falhe se Azure Container Apps, Docker Scout, instalador Scout, credenciais Docker Hub/Azure ou nomes dos workflows removidos reaparecerem em arquivos operacionais.

### Critérios de conclusão

- Os dois arquivos antigos não existem e badges apontam para workflows existentes.
- Busca operacional não encontra `azure/login`, `container-apps-deploy`, `docker scout`, `scout-cli`, `DOCKERHUB_` ou `AZURE_CREDENTIALS`.
- Referências históricas em documentos SDD não são apagadas; o teste limita a auditoria a workflows/configuração/README.
- Novos workflows continuam passando em testes e actionlint.

### Plano TDD

- RED: escrever teste de limpeza e observar achados nos pipelines/badges legados.
- GREEN: remover os workflows e substituir os badges até a auditoria ficar verde.
- REFACTOR: tornar a lista de termos/caminhos explícita e acionável sem varrer documentação histórica.

### Validação

- `python -m unittest discover -s .github/scripts/tests -p "test_container_workflow_cleanup.py" -v`
- `python -m unittest discover -s .github/scripts/tests -p "test_container_*.py" -v`
- `rg -n -i "azure/login|container-apps-deploy|docker scout|scout-cli|DOCKERHUB_|AZURE_CREDENTIALS|pipeline-front.yml|pipeline-back.yml" .github/workflows .github/dependabot.yml README.md`
- `.tmp/actionlint/actionlint .github/workflows/*.yml`

### Notas

O `rg` deve retornar código 1/nenhuma linha para a auditoria proibida. Não remover secrets das configurações GitHub nesta tarefa.

## T013 — Validar integração local e CI real em PR para develop

- Status: concluída
- Issue: #238
- Dependências: T012
- Paralela: não
- Requisitos: RF-001, RF-002, RF-003, RF-004, RNF-001, RNF-002, CA-001, CA-002, CA-003, CA-004
- Caminhos sob responsabilidade: `.codex/docs/specs/modernizacao-esteira-conteineres/evidencias.md`

### Escopo

Executar a esteira ampla no mesmo SHA, registrar versões das ferramentas e consolidar evidência dos quatro builds/scans locais. Com autorização Git explícita separada, observar uma execução real de `container-ci.yml` em PR para `develop` e provar que ela não autentica nem publica. O documento deve distinguir resultado local, execução GitHub e item não coletado; não corrigir workflows ou Dockerfiles nesta tarefa.

### Critérios de conclusão

- Testes Python, actionlint, Prettier, frontend e backend passam no mesmo commit.
- Quatro builds OCI e scans Trivy passam; cenário controlado com vulnerabilidade corrigível retorna `1` depois de produzir tabela e SARIF.
- Run real de PR para `develop` mostra apenas validação, com quatro categorias SARIF/artefatos e sem escrita em packages/releases.
- `evidencias.md` registra data UTC, branch, SHA, versões, comandos, resultados e URLs/IDs disponíveis.
- Defeito real é devolvido à tarefa proprietária e impede conclusão.

### Plano TDD

- RED: executar a matriz completa e registrar qualquer gate ainda vermelho ou evidência ausente, sem fabricar falha.
- GREEN: corrigir somente o documento de evidência; correções de implementação voltam à tarefa dona até todos os gates passarem.
- REFACTOR: deduplicar resultados e normalizar tabelas mantendo separação entre local e GitHub.

### Validação

- `python -m unittest discover -s .github/scripts/tests -p "test_*.py" -v`
- `bash .github/scripts/install_actionlint.sh .tmp/actionlint && .tmp/actionlint/actionlint .github/workflows/*.yml`
- `cd frontend && npm ci && npm run test -- --run && npm run lint && npm run build`
- `dotnet restore backend/backend.sln && dotnet build backend/backend.sln --no-restore -c Release --nologo --disable-build-servers && dotnet test backend/backend.sln --no-build --no-restore -c Release --nologo --disable-build-servers`
- `docker buildx build --platform linux/amd64 --output type=oci,dest=frontend-amd64.tar -f frontend/Dockerfile frontend`
- `docker buildx build --platform linux/arm64 --output type=oci,dest=frontend-arm64.tar -f frontend/Dockerfile frontend`
- `docker buildx build --platform linux/amd64 --output type=oci,dest=backend-amd64.tar -f backend/Dockerfile backend`
- `docker buildx build --platform linux/arm64 --output type=oci,dest=backend-arm64.tar -f backend/Dockerfile backend`
- `mkdir frontend-amd64-oci frontend-arm64-oci backend-amd64-oci backend-arm64-oci && tar -xf frontend-amd64.tar -C frontend-amd64-oci && tar -xf frontend-arm64.tar -C frontend-arm64-oci && tar -xf backend-amd64.tar -C backend-amd64-oci && tar -xf backend-arm64.tar -C backend-arm64-oci`
- `.tmp/trivy/trivy image --config .trivy.yaml --input frontend-amd64-oci && .tmp/trivy/trivy image --config .trivy.yaml --input frontend-arm64-oci`
- `.tmp/trivy/trivy image --config .trivy.yaml --input backend-amd64-oci && .tmp/trivy/trivy image --config .trivy.yaml --input backend-arm64-oci`
- `gh run list --workflow container-ci.yml --limit 5`

### Notas

Sem autorização para branch/push/PR ou sem run real, registrar a evidência local, mas manter T013 pendente. Remover os quatro `.tar` após o uso sem tocar arquivos fora desses alvos explícitos.

## T014 — Validar release controlada e concluir configuração externa

- Status: pendente (correções T007/T009 locais aguardam promoção e validação externa)
- Issue: #238
- Dependências: T013 e promoção externa autorizada do commit validado para `main`
- Paralela: não
- Requisitos: RF-001, RF-002, RF-003, RF-004, RNF-001, RNF-002, CA-001, CA-002, CA-003, CA-004
- Caminhos sob responsabilidade: `.codex/docs/specs/modernizacao-esteira-conteineres/evidencias.md`

### Escopo

Após autorização explícita e promoção normal do SHA validado, executar uma release controlada por merge ou dispatch em `main`. Inspecionar versão e `latest` das duas imagens, confirmar SARIF/relatórios e comportamento idempotente. Verificar acesso Actions aos packages, Code Scanning e checks obrigatórios de `develop`. Depois de busca sem consumidores e confirmação do mantenedor, remover manualmente os secrets `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` e `AZURE_CREDENTIALS`, registrando confirmação sem expor valores.

### Critérios de conclusão

- As quatro referências públicas (duas imagens x versão/`latest`) contêm exatamente AMD64/ARM64.
- Versão e `latest` correspondem aos digests varridos; a GitHub Release é única e aponta para o mesmo SHA.
- Uma reexecução idempotente não muda composição; conflito de versão é rejeitado sem mover `latest`.
- Branch protection de `develop` exige os checks pré-merge estáveis e acesso GHCR/Code Scanning está confirmado ou explicitamente classificado.
- Os três secrets obsoletos deixam de existir somente após confirmação de ausência de consumidores; nenhum valor é registrado.
- `evidencias.md` contém URLs de runs/releases, digests, JSONs inspecionados, resultado Trivy, rollback testado ou simulado com segurança e pendências externas restantes.

### Plano TDD

- RED: executar a inspeção pós-release e tratar qualquer plataforma/tag/permissão/secret divergente como falha real; indisponibilidade não equivale a sucesso.
- GREEN: corrigir apenas configuração externa autorizada e evidência; defeito de código reabre T007–T012 conforme propriedade.
- REFACTOR: consolidar evidência final e remover dados temporários sem apagar histórico de decisão.

### Validação

- `gh run list --workflow container-release.yml --limit 5`
- `docker buildx imagetools inspect --raw ghcr.io/ifpebj-ti/lab-solos-frontend:<versão> > frontend-version.json`
- `docker buildx imagetools inspect --raw ghcr.io/ifpebj-ti/lab-solos-frontend:latest > frontend-latest.json`
- `docker buildx imagetools inspect --raw ghcr.io/ifpebj-ti/lab-solos-backend:<versão> > backend-version.json`
- `docker buildx imagetools inspect --raw ghcr.io/ifpebj-ti/lab-solos-backend:latest > backend-latest.json`
- `python .github/scripts/validate_container_manifest.py frontend-version.json --compare frontend-latest.json`
- `python .github/scripts/validate_container_manifest.py backend-version.json --compare backend-latest.json`
- `gh api repos/{owner}/{repo}/branches/develop/protection`
- `gh secret list --app actions`
- `python -m unittest discover -s .github/scripts/tests -p "test_*.py" -v`

### Notas

Os comandos de inspeção usam `<versão>` como valor da release controlada registrado na tarefa, não como texto literal. `gh secret delete` e alterações de branch/package settings são destrutivas/externas e exigem confirmação explícita no turno de execução; sem ela, a tarefa permanece pendente.

## Log de execução

| Data | Tarefa | Resultado | Testes/evidências | Observações |
|---|---|---|---|---|
| 2026-08-17 | T001 | concluída | 5/5 testes; smoke Linux instalou actionlint 1.7.12 com attestation; regressão 71/71 | O lint analisou os workflows e encontrou apenas falhas preexistentes nos pipelines legados, cuja remoção pertence à T012. |
| 2026-08-17 | T002 | concluída | 11/11 testes; `--help`; `py_compile`; regressão 71/71 | Primeira release, incrementos SemVer, `outros`, dispatch em `main` e erros sanitizados cobertos. |
| 2026-08-17 | T003 | concluída | 10/10 testes; `--help`; `py_compile`; regressão 71/71 | Contrato estrito aceita somente `linux/amd64` e `linux/arm64` e compara digests por plataforma. |
| 2026-08-17 | T004 | concluída | 5/5 testes; smoke Linux com Trivy 0.72.0; Prettier; regressão 71/71 | Política bloqueante e instalador com checksum oficial validados. |
| 2026-08-17 | T011 | concluída | 3/3 testes; Prettier; regressão 71/71 | Entrada `github-actions` adicionada sem alteração semântica das quatro entradas npm/NuGet. |
| 2026-08-17 | T004 | corrigida após integração | RED: 3 falhas + 1 erro; 6/6 testes; scan real Trivy 0.72.0; regressão 78/78 | O esquema efetivo passou a usar `scan.scanners`, `pkg.types` e `vulnerability.ignore-unfixed`; smoke provou apenas `vuln`, sem secret scanning. |
| 2026-08-17 | T005 | concluída | 3/3 testes; OCI AMD64/ARM64; Trivy em ambos; Vitest 6/6; ESLint; build Vite; regressão 78/78 | Dockerfile intacto; zero vulnerabilidades bloqueantes. Trivy 0.72.0 exige extrair o layout do tar OCI antes do scan. |
| 2026-08-17 | T006 | concluída | 3/3 testes; OCI AMD64/ARM64; Trivy em ambos; regressão 78/78 | Dockerfile e `bin/obj` preexistentes preservados; zero vulnerabilidades bloqueantes. Avisos .NET preexistentes registrados. |
| 2026-08-17 | T007 | concluída | RED 6/7; GREEN 7/7; actionlint 1.7.12; Prettier; regressão 99/99 | CI pré-merge com matriz 2×2, OCI extraído, tabela/SARIF/artefatos antes do gate e fallback para fork/Dependabot. |
| 2026-08-17 | T008 | concluída | RED 12/13; GREEN/REFACTOR 14/14; actionlint; Prettier; regressão 99/99 | Release limitada a quatro digests canônicos varridos; nenhuma tag pública, `latest` ou GitHub Release nesta fatia. |
| 2026-08-17 | T009 | concluída | RED 2 falhas + 5 erros; GREEN 19/19; validador 10/10; actionlint; Prettier; regressão 104/104 | Promoção SemVer pré-valida ambos os componentes, rejeita colisões antes de escrever e aceita composição idêntica como idempotente. |
| 2026-08-17 | T010 | concluída | RED 8 falhas; GREEN 24/24; actionlint; Prettier; `py_compile`; regressão 109/109 | `latest` captura estado prévio, compensa avanço parcial e cria GitHub Release idempotente como última escrita; prova real fica para T014. |
| 2026-08-17 | T012 | concluída | RED 5 falhas; GREEN 3/3; contêineres 34/34; actionlint em 5 workflows; regressão 112/112; auditoria `rg` limpa | Pipelines legados removidos, badges atualizados e issue #235 movida para `Done`; secrets/configuração externa preservados. |
| 2026-08-17 | T013 | validação local concluída; tarefa pendente | Python 112/112; actionlint; frontend 6/6; backend 8/8; quatro OCI/scans; fixture com 12 HIGH e gate `1` | Sem autorização para commit/push/PR, não houve run real; `gh run list` retorna 404 até o workflow existir no remoto. API do Project apresentou HTTP 503 na sincronização final. |
| 2026-08-17 | T013 | bloqueada por defeito da T007 | PR #302; Container CI run #32041840006; gate de dependências #32041839984 verde | Qualidade frontend/backend/contratos passou, mas as quatro células de scan falharam antes dos relatórios: faltou `--input` ao passar o layout OCI para Trivy 0.72.0. |
| 2026-08-17 | T007 | corrigida após run real | RED 7/8; GREEN 8/8; actionlint 1.7.12; Prettier; regressão 113/113; Container CI run #32043152362 | As três chamadas Trivy usam `--input`; as quatro células concluíram tabela, SARIF, artefato, Code Scanning e gate. A tentativa 2 repetiu somente jobs afetados por respostas 503/429 do GitHub. |
| 2026-08-17 | T013 | concluída após merge em `develop` | Merge `f2cf3d7`; Python 113/113; frontend 6/6; backend 8/8; actionlint; Prettier; Container CI #32044118515; dependências #32044118531 | Head `963bd4a` e merge possuem árvore Git idêntica; quatro células, artefatos e categorias SARIF aprovados, sem login, push ou release. T014 permanece pendente. |
| 2026-08-17 | T014 | bloqueada por defeito da T010 | PR #303; Container Release #32046897477; testes estruturais 24/24 | As tags `2.1.0` multiarch e os quatro scans foram concluídos, mas a captura do `latest` legado rejeitou seu manifesto Docker simples antes de qualquer escrita final. `latest` permaneceu intacto, a GitHub Release não foi criada e nenhuma configuração externa ou secret foi alterado. |
| 2026-08-17 | T010 | reaberta após release real | Falha do job `finalize-release` no run #32046897477 | A captura transacional precisa aceitar e preservar um `latest` anterior de manifesto simples durante a primeira migração para índice multiarch, com cobertura automatizada antes de retomar a T014. |
| 2026-08-17 | T010 | corrigida após RED operacional | RED 1/25; GREEN 25/25; regressão 114/114; actionlint 1.7.12; Prettier; smoke Buildx 0.36.0 | A captura aceita manifesto simples por digest; rollback usa `--prefer-index=false` e verifica o digest restaurado, preservando fielmente formato legado ou índice multiarch. A comprovação externa permanece na retomada da T014. |
| 2026-08-17 | T014 | reaberta após promoção da correção | PR #308; merge `ed5b534`; Container Release #32060570024 | A correção da T010 está em `main`; o novo run concluiu `prepare` e iniciou os quatro builds. Project #238 permanece `In Progress` enquanto a release e as configurações externas são validadas. |
| 2026-08-17 | T014 | GREEN parcial; bloqueada por T007/T009 | Release `2.0.4`; runs #32061780222 e #32063024656; regressão 114/114 | A publicação controlada, os quatro manifestos, SARIF/Code Scanning e a remoção dos três secrets legados foram concluídos. A reexecução segura divergiu nos digests reconstruídos e falhou antes de `latest`; required workflow foi rejeitado pelo GitHub em ruleset de repositório pessoal. |
| 2026-08-17 | T009 | reaberta após reexecução real | Container Release #32063024656 | O mesmo SHA e a mesma SemVer reconstruíram digests diferentes; a proteção contra colisão funcionou, mas a reexecução não foi idempotente. |
| 2026-08-17 | T007 | reaberta após auditoria de proteção | ruleset #9464959; API `422` para regra `workflows` | É necessário produzir checks obrigatórios estáveis sem deixar PRs fora dos filtros `paths` permanentemente pendentes. |
| 2026-08-17 | T007 | corrigida localmente após auditoria de proteção | RED 7/8; GREEN 8/8; regressão integrada 116/116; actionlint 1.7.12; Prettier | Removidos os filtros `paths` do evento de PR; todos os jobs agora são reportados em qualquer PR para `develop`, tornando-os aptos a checks obrigatórios após promoção. |
| 2026-08-17 | T009 | corrigida localmente após reexecução real | RED 1/26 e 1/27; GREEN 27/27; validador 10/10; regressão integrada 116/116; actionlint 1.7.12; Prettier | Release existente no mesmo SHA reutiliza as imagens verificadas sem rebuild; SHA divergente falha cedo; cada descritor publicado deve possuir `org.opencontainers.image.revision` igual ao SHA liberado. |
