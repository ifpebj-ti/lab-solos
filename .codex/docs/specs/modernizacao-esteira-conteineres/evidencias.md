# Evidências: modernização da esteira de contêineres

## Estado da T013

- Data da coleta local (UTC): `2026-08-17T15:07:44Z`
- Data do fechamento (UTC): `2026-08-17T16:36:40Z`
- Tarefa: `T013`
- Issue: `#238` — aberta e atribuída a `nathannmvr`
- Branch local inicial: `develop`
- Branch do PR: `feature/modernizacao-esteira-conteineres`
- SHA base: `29b2d96d7bfc340eb9bccaa3adb815510bc85f6e`
- SHA submetido à CI: `6ff5c0f97f2f21f31870c1d9a7817dfe94c39625`
- SHA final validado no PR: `963bd4a9b7172fc90794f9fba5142c2a81e20bdb`
- SHA mesclado em `develop`: `f2cf3d7bd016dec366a8c1fef4b3cf1f60565bed`
- Estado Git: a coleta inicial ocorreu em árvore **dirty**; o fechamento foi revalidado em worktree limpa e destacada de `origin/develop`, sem usar nem alterar os artefatos preexistentes da worktree principal.
- Resultado: **T013 concluída**; o RED real foi corrigido na T007 e o PR final executou todos os gates com sucesso antes do merge.

O orquestrador confirmou a issue `#238` no Project 4 em `In Progress`. Durante esta coleta, a issue continuava aberta e atribuída a `nathannmvr`; depois de autorização explícita, foi criado o PR #302 para `develop`. Nenhum comentário, fechamento, publicação em registry ou release foi feito.

## Ambiente reproduzido

| Ferramenta | Versão/evidência |
|---|---|
| GitHub CLI | `2.90.0` |
| Python | `3.14.3` |
| Node.js | `24.14.0` |
| npm | `11.9.0` |
| .NET SDK | `8.0.419` |
| Docker Engine | cliente/servidor `29.7.2` |
| Docker Buildx | `0.36.0-desktop.1` (`1230810cc05c83f44821c4bde22added0f3e96a2`) |
| actionlint | `1.7.12`, binário Linux oficial baixado da release e aprovado por `gh attestation verify`; executado em Linux e identificado como “installed by downloading from release page” |
| Trivy | `0.72.0`; DB schema 2 atualizada em `2026-08-17T12:53:50Z` e baixada em `2026-08-17T15:03:16Z` |

Os instaladores de actionlint e Trivy já tinham smoke Linux aprovado em T001/T004. Nesta rodada, o actionlint foi novamente baixado como artefato oficial atestado. O Trivy foi executado pela imagem oficial fixada `ghcr.io/aquasecurity/trivy:0.72.0`; ela serviu apenas como empacotamento local da ferramenta, sem autenticação ou publicação.

## Gates locais

| Gate | Comando resumido | Resultado |
|---|---|---|
| Python | `python -m unittest discover -s .github/scripts/tests -p "test_*.py" -v` | `112/112` aprovados |
| Actions | actionlint 1.7.12 nos cinco `.github/workflows/*.yml` existentes | aprovado, código `0` |
| Prettier — escopo modernizado | `npx prettier --check` em `container-ci.yml`, `container-release.yml`, `.github/dependabot.yml` e `.trivy.yaml` | aprovado |
| Frontend | `npm ci`, `npm run test -- --run`, `npm run lint`, `npm run build` | `6/6` testes, lint e build aprovados |
| Backend | restore/build/test Release de cópia temporária fiel de `backend`, excluindo `bin/obj` da cópia inicial | build aprovado e `8/8` testes aprovados |

O build frontend manteve avisos não bloqueantes já conhecidos: `env.js` sem `type="module"`, base Browserslist antiga, referência de imagem resolvida em runtime e chunk acima de 500 kB. O backend manteve dois avisos preexistentes `CS8604` em `ProdutoMappingProfile.cs`. O `tsconfig.app.tsbuildinfo` alterado pelo build foi restaurado byte a byte; os `backend/Tests/bin` e `backend/Tests/obj` preexistentes não foram usados como diretório de saída nem revertidos.

Uma checagem Prettier mais ampla, fora dos arquivos modernizados, encontrou formatação preexistente em `project-metrics.yml`, `publish-prds-wiki.yml` e `security-dependencies.yml`. Não houve correção fora do escopo da T013.

## Builds e scans OCI locais

Cada build usou `docker buildx build --platform <plataforma> --output type=oci,dest=<arquivo>` com o Dockerfile atual. O tar foi extraído para um layout OCI antes do Trivy 0.72.0. A arquitetura foi lida do config OCI, e cada scan executou, nesta ordem: tabela com código 0, SARIF com código 0 e gate final usando `.trivy.yaml`.

| Célula | Plataforma no config | Manifest digest | Tar (bytes) | SHA-256 do tar | Gate |
|---|---|---|---:|---|---|
| frontend-amd64 | `linux/amd64` | `sha256:e4a7b52c6ceb3f9fcb804c6b35f50c04ea0f3796810f265c0717116c185a01c8` | 23.266.304 | `f44a08eacb537dd77e0a27986683cfb5d732f388d4d0a99e9c12333cdfc180b8` | `0`, zero achados |
| frontend-arm64 | `linux/arm64` | `sha256:88da9fb277bc0e43ba5a8266dfbb55e9cee33acbd5247836974b1e101117e4ab` | 23.963.136 | `a716227e20fc2689d4e0b64fd171ecba6062376547e1f931c0fe6598be75f0d3` | `0`, zero achados |
| backend-amd64 | `linux/amd64` | `sha256:3115cc542867e41a446d13c53321b317196e4db8e2f2e97c534693cfa021b948` | 95.554.560 | `c84451aac9f9b132149d77eea9d09baf5c7e0c1c6fbceae469eab2b4ad34f5dc` | `0`, zero achados |
| backend-arm64 | `linux/arm64` | `sha256:dc91f85a9e3021c2854e417ece0c8094a3c857265b59a24634bae3a7cca7e537` | 93.486.592 | `b7307fe00b8c74bd9575cf1ec572a9418f0e0956987555136ef1db062292df1d` | `0`, zero achados |

| Célula | SHA-256 tabela | SHA-256 SARIF | Resultados SARIF |
|---|---|---|---:|
| frontend-amd64 | `d0413b81f8b7c4b4b960d4eb159846f7c08fa45db57d5724a0064c5426cf64b5` | `de476f78fbaeb1839f290266de0a2a520344171adc8dd39909173173d80f0b1d` | 0 |
| frontend-arm64 | `e85b78dfe8a521fc001b48c801dcecfb36fc4946c094923eff360c7b4fe23c55` | `7100a8b6969a14f92979464f9151febdf07f23277dfcca2d8402c1338ec90989` | 0 |
| backend-amd64 | `8783160a8b39ee5d68c8374cddc43c31071dbf4fbbcfd315622b7337669d2bbf` | `a46bdcf42aaf4944fe2d42481cf32695bf57276806f898ca60499a16e92eb6ce` | 0 |
| backend-arm64 | `73a07ff7185e4965b20b22ce93a71c5d8a1b40c6a04a6d307929c70bf7b9573d` | `7fc69f3a6dd5b902a8786c6034ae980aa55a9540e0fd0cbf9fb4a38bdd1e3deb` | 0 |

## Cenário bloqueante controlado

Para não baixar ou manter uma imagem vulnerável, foi criado temporariamente um OCI `FROM scratch` contendo somente `/etc/os-release`, `/etc/debian_version` e um registro sintético de `openssl 1.1.1n-0+deb11u1` em `/var/lib/dpkg/status`. Não havia binário, biblioteca executável nem base de sistema operacional no layout.

1. A tabela foi gerada com código `0` em `2026-08-17T15:06:56Z`.
2. O SARIF foi gerado com código `0` em `2026-08-17T15:06:58Z`.
3. O gate foi executado por último e retornou `1`.

O Trivy reportou 12 achados `HIGH`, todos com status `fixed`, e o SARIF contém 12 resultados. A tabela tinha 11.293 bytes e SHA-256 `c909f3e4ea3e69efbb0dd4cbb8521921c11c17246ef18206ec1827607d2d2292`; o SARIF tinha 67.209 bytes e SHA-256 `bd52cd68688d0d8a8144c780ac16532956447e7a238fa7af4914ab99464e6173`.

As primeiras tentativas com apenas metadados npm e, depois, sem `/etc/debian_version` produziram gate `0` porque o Trivy não reconheceu um alvo vulnerável. Elas são o RED objetivo da fixture; a versão final acrescentou apenas os metadados mínimos necessários e comprovou relatório -> SARIF -> falha, sem mudar `.trivy.yaml` ou código de produção.

## RED histórico no GitHub — falha devolvida à T007

- PR: [#302](https://github.com/ifpebj-ti/lab-solos/pull/302), base `develop`, head `feature/modernizacao-esteira-conteineres`.
- Run de Container CI: [#32041840006](https://github.com/ifpebj-ti/lab-solos/actions/runs/32041840006), commit `6ff5c0f97f2f21f31870c1d9a7817dfe94c39625`.
- Run do gate de dependências: [#32041839984](https://github.com/ifpebj-ti/lab-solos/actions/runs/32041839984), concluído com sucesso no mesmo commit.
- `Frontend quality`, `Backend quality` e `Workflow contracts` concluíram com sucesso.
- Os quatro jobs de scan construíram e extraíram os OCI, instalaram Trivy 0.72.0 e falharam no primeiro relatório.
- Causa comprovada no log: o workflow executa `trivy image ... "${RUNNER_TEMP}/oci-layout"` sem `--input`; o Trivy interpreta o diretório como referência de registry e encerra com `invalid reference format` antes de tabela, SARIF, artefato e gate.
- O run encerrou com `failure` às `2026-08-17T15:25:53Z`: as quatro células falharam na mesma etapa e nenhuma chegou a SARIF, upload de artefato ou gate.
- A CI não possui login de registry, push, release ou implantação; nenhuma escrita em packages/releases foi executada pelo workflow de PR.

O defeito pertencia a `.github/workflows/container-ci.yml`, caminho da T007. Pelos limites da T013, ele não foi corrigido naquela execução e impediu a conclusão até a T007 ser reaberta, corrigida e o PR executar novamente.

## Fechamento no SHA mesclado

- PR: [#302](https://github.com/ifpebj-ti/lab-solos/pull/302), mesclado em `develop` em `2026-08-17T16:21:06Z`.
- Head aprovado: `963bd4a9b7172fc90794f9fba5142c2a81e20bdb`.
- Merge commit: `f2cf3d7bd016dec366a8c1fef4b3cf1f60565bed`.
- As duas revisões possuem a mesma árvore Git, `a53dae52b514399489d798d4007b73b9b7ec9f86`, sem diferença de conteúdo.
- Container CI: [#32044118515](https://github.com/ifpebj-ti/lab-solos/actions/runs/32044118515), tentativa 2, concluída com sucesso em `2026-08-17T16:17:06Z`.
- Gate de dependências: [#32044118531](https://github.com/ifpebj-ti/lab-solos/actions/runs/32044118531), tentativa 2, concluído com sucesso em `2026-08-17T16:04:29Z`.

O fechamento repetiu na worktree limpa do merge commit: Python `113/113`; frontend `6/6`, ESLint e build; backend `8/8` e build; actionlint 1.7.12 nos cinco workflows; Prettier 3.5.3 nos quatro arquivos modernizados. No checkout Windows, o Prettier foi executado com `--end-of-line crlf` para neutralizar somente a conversão local de fim de linha; o conteúdo versionado permaneceu inalterado.

O run final aprovou `Frontend quality`, `Backend quality`, `Workflow contracts` e as quatro células `frontend/backend` × `linux/amd64,linux/arm64`. Cada célula concluiu build OCI, extração do layout, tabela, SARIF, upload do artefato, upload ao Code Scanning e gate. Foram baixados e inspecionados os quatro artefatos `trivy-frontend-amd64`, `trivy-frontend-arm64`, `trivy-backend-amd64` e `trivy-backend-arm64`; cada um contém `trivy-table.txt` e `trivy.sarif`, e os quatro SARIF identificam Trivy com zero resultados bloqueantes. O Code Scanning registra as quatro categorias correspondentes.

A CI de PR possui apenas permissões de leitura e as permissões isoladas necessárias ao SARIF; os testes estruturais confirmaram ausência de login em registry, push, criação de release ou implantação. As respostas HTTP 429/503 do `codeload.github.com` ocorreram antes da execução de código e foram resolvidas por reexecução seletiva; não representam falha do repositório.

## RED, GREEN e REFACTOR da tarefa documental

- **RED:** o primeiro run real existe, mas os scans falham antes de produzir relatórios porque falta `--input` nas chamadas do Trivy. A checagem Prettier ampla também caracterizou três arquivos preexistentes fora do escopo.
- **GREEN:** após a correção proprietária da T007, todos os gates locais do merge commit e o run real final passaram; quatro artefatos e quatro categorias SARIF foram confirmados sem qualquer escrita em packages/releases.
- **REFACTOR:** resultados foram normalizados por célula, o head validado foi ligado ao merge commit pela árvore Git idêntica e as falhas transitórias da plataforma foram separadas das falhas funcionais.

Os tars, layouts, relatórios, DB/cache, fixtures e a worktree temporária usados nesta coleta foram removidos e não fazem parte do repositório. A T013 está concluída; a publicação em `main`, a inspeção das referências públicas e qualquer remoção de secrets continuam exclusivamente na T014.

## T014 — release controlada bloqueada

- Data da execução (UTC): `2026-08-17`
- PR de promoção: [#303](https://github.com/ifpebj-ti/lab-solos/pull/303), `develop` → `main`, mesclado em `2026-08-17T16:43:03Z`
- Merge commit em `main`: `dbbf100150b6153e71a5714f5d362235cbcc8e29`
- Run: [Container Release #32046897477](https://github.com/ifpebj-ti/lab-solos/actions/runs/32046897477), tentativa 1, resultado `failure`
- Versão resolvida: `2.1.0`
- Resultado da tarefa: **bloqueada por defeito funcional da T010**; a configuração externa não foi usada para ocultar ou contornar a falha.

### Resultado que ficou verde

Os quatro builds por digest, os quatro scans imutáveis, os relatórios em tabela, os SARIF, os uploads ao Code Scanning e os gates Trivy concluíram com sucesso. As quatro análises em `main` usam o commit `dbbf100150b6153e71a5714f5d362235cbcc8e29`, Trivy 0.72.0 e possuem zero resultados bloqueantes.

| Célula | Digest imutável varrido |
|---|---|
| frontend AMD64 | `sha256:a3c95baceecca73b6fae69d4f3f61beddb3b743976d89dcb17ab32eb5bec26d7` |
| frontend ARM64 | `sha256:bc98964c05c2a0d4f424b653547f48ce93fe1a798ec81e69525ad6ea37140fa8` |
| backend AMD64 | `sha256:725ad599b351ad14164b68fafb26041ac5e027dbd0b41b15b53c3e78a074bc6d` |
| backend ARM64 | `sha256:bbff9eb609b4cf2278793854ffa1ee5773cda97e00e46439faa15227f39dc0ec` |

O job `promote-version` também concluiu e publicou índices OCI com exatamente `linux/amd64` e `linux/arm64`:

| Referência | Digest do índice |
|---|---|
| `ghcr.io/ifpebj-ti/lab-solos-frontend:2.1.0` | `sha256:4da618581ddfcb0027ecec67e0b57c1d3fd7ecff3195a53b42c5a7bc826975e3` |
| `ghcr.io/ifpebj-ti/lab-solos-backend:2.1.0` | `sha256:c41d2f850610e55cd413ed9cb195e262305001289c50160ff610409d83127240` |

O login e os pushes bem-sucedidos confirmam acesso de escrita do GitHub Actions aos dois packages. A API de packages não pôde ser consultada diretamente com o token local, que não possui `read:packages`; essa limitação não foi tratada como evidência negativa nem como sucesso presumido.

### RED real na finalização

O job `finalize-release` falhou na etapa `Promote latest atomically and create the GitHub Release`, antes de escrever qualquer `latest`, com:

```text
erro de entrada: .tmp/manifests/frontend-latest-before.json: mediaType de índice não suportado: application/vnd.docker.distribution.manifest.v2+json
```

A função de captura usa o validador estrito de índices multiarch também para o estado anterior. Os dois `latest` existentes são referências legadas de plataforma única, com media type Docker manifest v2, cenário de primeira migração não contemplado pela T010:

| Referência preservada | Digest anterior | Formato |
|---|---|---|
| `ghcr.io/ifpebj-ti/lab-solos-frontend:latest` | `sha256:b60154c1c811a3d043ee76f39caf68ffacab2dee1c5e6661d92c57be5f68a7ef` | manifesto Docker v2 simples |
| `ghcr.io/ifpebj-ti/lab-solos-backend:latest` | `sha256:e1d7b9d8cc1fcbe0af7e21256781d86b3e2c76806d70270da678f59ce84338a1` | manifesto Docker v2 simples |

Como a falha ocorreu ao capturar o primeiro estado anterior, nenhuma das duas tags `latest` foi movimentada. A GitHub Release `2.1.0` não existe; a release mais recente continua sendo `2.0.2`. Não houve reexecução idempotente, teste real de compensação ou promoção manual, pois repetir o mesmo workflow falharia da mesma forma e mover tags fora dele eliminaria a garantia transacional que a T010 deve fornecer.

Os 24 testes estruturais de `test_container_release_workflow.py` continuam verdes, caracterizando uma lacuna de cobertura: eles provam ordem e presença da compensação, mas não exercitam a captura de um `latest` legado.

### Auditoria de configuração externa

- Os secrets Actions existentes são `AZURE_CREDENTIALS`, `DOCKERHUB_TOKEN`, `DOCKERHUB_USERNAME` e `PROJECT_TOKEN`. A busca nos arquivos operacionais atuais não encontrou consumidores para os três primeiros, mas eles foram preservados porque a remoção só pode ocorrer após uma release bem-sucedida.
- Os uploads SARIF customizados estão operacionais; as quatro categorias da release aparecem no Code Scanning. O default setup permanece `not-configured`, o que não impede os uploads do workflow.
- `develop` não possui proteção clássica nem ruleset aplicável. O ruleset denominado `dev` seleciona `refs/heads/dev`, não `refs/heads/develop`.
- Os workflows pré-merge usam filtros de caminhos. Exigir diretamente seus jobs como checks obrigatórios pode deixar PRs fora desses caminhos aguardando checks que não são criados; portanto nenhuma regra foi alterada sem antes corrigir o desenho para produzir checks estáveis em todo PR.

Nenhum secret foi removido, nenhuma proteção de branch/package foi alterada, nenhuma tag foi promovida manualmente e nenhum run foi reexecutado. A issue `#238` permanece aberta, atribuída a `nathannmvr`, e seu item no Project 4 permanece `In Progress`.

### RED, GREEN e REFACTOR

- **RED:** a inspeção pós-release detectou a falha real ao capturar `latest` legado, a ausência da GitHub Release e a falta de checks obrigatórios estáveis em `develop`.
- **GREEN parcial:** quatro builds/scans, Code Scanning e as duas tags versionadas multiarch foram produzidos corretamente. Não há GREEN para `latest`, GitHub Release, idempotência real ou compensação real.
- **REFACTOR documental:** estado publicado, estado preservado e pendências externas foram separados sem registrar valores de secrets. A correção funcional retorna à T010; somente depois dela uma nova execução controlada pode retomar a T014.

## T014 — retomada após a correção da T010

- Data da execução (UTC): `2026-08-17`
- PR de promoção da correção: [#308](https://github.com/ifpebj-ti/lab-solos/pull/308), merge commit `ed5b534d0631600c2d09138187f37d1212b6996f`
- Execução automática de colisão: [Container Release #32060570024](https://github.com/ifpebj-ti/lab-solos/actions/runs/32060570024), resultado `failure`
- Execução controlada bem-sucedida: [Container Release #32061780222](https://github.com/ifpebj-ti/lab-solos/actions/runs/32061780222), resultado `success`
- Reexecução idempotente: [Container Release #32063024656](https://github.com/ifpebj-ti/lab-solos/actions/runs/32063024656), resultado `failure`
- GitHub Release única: [`2.0.4`](https://github.com/ifpebj-ti/lab-solos/releases/tag/2.0.4), publicada para `ed5b534d0631600c2d09138187f37d1212b6996f`

### Publicação controlada e inspeção dos manifestos

O run `#32061780222` concluiu os quatro builds por digest, os quatro scans Trivy, os quatro uploads SARIF, a promoção versionada, a promoção transacional de `latest` e a criação da GitHub Release. A inspeção remota em memória dos JSONs OCI confirmou exatamente `linux/amd64` e `linux/arm64` nas quatro referências e igualdade de composição entre versão e `latest`:

| Imagem | Digest do índice `2.0.4`/`latest` | AMD64 varrido | ARM64 varrido |
|---|---|---|---|
| frontend | `sha256:e2cb6549eadc7df6accb98ae28994a982c9feb0e772f579352824a935e7f85b4` | `sha256:8309adb60676b9f378574f59f494085505e1006130ac0a468a8f8f705c3eb420` | `sha256:6aa42ff168718ec0bb9600977c88c6480b1ce8a5496d5cc33979a03a12246c6b` |
| backend | `sha256:c75e1815f747674091683a3dc3347e12d25084db1183491c838f6a8ccf394af5` | `sha256:fbead8928e7e51ddae4b8e5c78367d2901c8386df863a18deedf31f886ff7b78` | `sha256:1f2f5989a79018a0e8598ae318e89a5246d1300a1994a938d38b240eb6e9d716` |

Os artefatos `trivy-frontend-amd64`, `trivy-frontend-arm64`, `trivy-backend-amd64` e `trivy-backend-arm64` existem no run e não estão expirados. As análises Code Scanning `1630680634`, `1630680943`, `1630680320` e `1630680417` pertencem ao mesmo SHA e registram `results_count: 0`, comprovando acesso de escrita a SARIF. Login e push dos quatro digests, das versões e de `latest` comprovam o acesso Actions aos dois packages GHCR.

### Rejeição de conflito e preservação transacional

O merge automático resolveu `2.0.3`, mas `ghcr.io/ifpebj-ti/lab-solos-frontend:2.0.3` já era um manifesto Docker v2 simples no digest `sha256:b60154c1c811a3d043ee76f39caf68ffacab2dee1c5e6661d92c57be5f68a7ef`. O run `#32060570024` aprovou os quatro scans e falhou em `Detect version collisions before writing tags`; o backend `2.0.3` estava ausente. Nenhuma tag foi escrita, `latest` permaneceu nos digests legados e nenhuma Release `2.0.3` foi criada. Isso comprova rejeição de conflito antes de escrita parcial.

O rollback continua simulado com segurança pelos 114 testes estruturais, incluindo captura/restauração de manifesto legado com `--prefer-index=false`, restauração de toda tag tentada, verificação pós-compensação e criação da GitHub Release como última escrita. Não foi induzida uma falha destrutiva entre as duas escritas reais de `latest`.

### RED de idempotência que reabre T009

A reexecução `#32063024656` usou novamente a versão `2.0.4` e o mesmo SHA `ed5b534d0631600c2d09138187f37d1212b6996f`. Todos os quatro builds e scans passaram, mas os digests reconstruídos divergiram nas duas plataformas do frontend já publicado. `promote-version` encerrou com `violação de contrato: composição diverge para: linux/amd64, linux/arm64` antes de qualquer escrita em `latest`; `finalize-release` foi ignorado. Após a falha, versão e `latest` conservaram exatamente os índices `e2cb6549...f85b4` e `c75e1815...94af5`, e a Release permaneceu única.

O bloqueio é funcional: a política atual reconstrói imagens antes de verificar uma versão já existente, mas as reconstruções não são byte a byte reproduzíveis. Para uma reexecução realmente idempotente, a T009 deve reconhecer primeiro a Release/tag já publicada para o mesmo SHA, validar os dois índices existentes e concluir sem reconstruir nem escrever; versões existentes associadas a outro SHA ou composição continuam sendo conflito.

### Configuração externa e secrets

A busca operacional em `origin/main` por `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `AZURE_CREDENTIALS`, `azure/login`, `container-apps-deploy`, Docker Scout e `scout-cli` retornou zero consumidores em workflows, Dependabot e README. Depois da release bem-sucedida e com autorização explícita do mantenedor, os três secrets obsoletos foram removidos. A verificação posterior lista somente `PROJECT_TOKEN`; nenhum valor foi lido ou registrado.

O ruleset `#9464959` continua inalterado e aponta incorretamente para `refs/heads/dev`. Duas tentativas sem efeito de substituir a regra por um required workflow de `.github/workflows/container-ci.yml` retornaram HTTP `422` (`Invalid rule 'workflows'`). O GitHub documenta required workflows como configuração de ruleset de organização/empresa; este repositório pertence a uma conta pessoal. A alternativa por nomes de status checks não foi aplicada porque `container-ci.yml` possui filtros `paths`: o próprio GitHub documenta que um workflow pulado por filtro deixa o check obrigatório em `Pending` e bloqueia o PR. A T007 foi reaberta para fornecer checks estáveis em todo PR relevante antes de ativar a proteção de `develop`.

### RED, GREEN e REFACTOR da retomada

- **RED:** colisão segura da versão automática `2.0.3`; required workflow rejeitado pela API; reexecução `2.0.4` rejeitada por digests reconstruídos divergentes.
- **GREEN parcial:** release `2.0.4`, quatro referências públicas multiarch, quatro scans/SARIF com zero bloqueantes, Code Scanning e GHCR confirmados, remoção pós-auditoria dos três secrets e regressão Python 114/114.
- **REFACTOR documental:** resultados bem-sucedidos, escritas preservadas e dois bloqueios funcionais foram separados. T014 permanece bloqueada; T007 e T009 estão reabertas e a issue `#238`/Project 4 deve permanecer `In Progress`.

## Correções locais dos bloqueios T007/T009

As correções foram implementadas na branch de trabalho sem commit, push, PR, dispatch ou alteração adicional das configurações GitHub.

### T007 — checks pré-merge estáveis

O filtro `pull_request.paths` foi removido de `container-ci.yml`. Assim, todos os jobs da Container CI são criados em qualquer PR para `develop`, eliminando o estado `Pending` permanente que impediria o uso seguro de required status checks. O teste estrutural agora rejeita tanto `paths` quanto `paths-ignore` no gatilho. O trade-off explícito é maior consumo de runners em PRs que não alteram contêineres.

- RED: 7/8 testes, com falha específica pela presença de `paths`.
- GREEN/REFACTOR: 8/8 testes direcionados; actionlint 1.7.12 e Prettier aprovados.

### T009 — reexecução idempotente sem reconstrução

O job `prepare` agora consulta a GitHub Release antes dos builds. Uma release existente para a mesma SemVer e o mesmo SHA ativa `reuse=true`, pula build, scan e promoção versionada e encaminha diretamente à finalização verificadora. Release com SHA divergente falha antes de qualquer build ou escrita. O job final reinspeciona versão e `latest`, compara as composições e verifica em cada descritor AMD64/ARM64 que o label OCI `org.opencontainers.image.revision` corresponde ao SHA liberado; tag ausente, alterada ou sem revisão falha antes de qualquer escrita em `latest`.

- RED: 1/26 pela ausência do caminho de reuso; depois 1/27 pela ausência da validação de revisão OCI.
- GREEN/REFACTOR: 27/27 testes direcionados, validador OCI 10/10, actionlint 1.7.12 e Prettier aprovados.
- Smoke remoto somente leitura: os quatro descritores de `2.0.4` possuem revisão `ed5b534d0631600c2d09138187f37d1212b6996f`.
- Integração local: regressão Python 116/116 e `git diff --check` aprovados.

T007 e T009 estão concluídas localmente. A T014 volta a `pendente`: ainda exige promover estas correções pelo fluxo normal, observar CI/reexecução real e somente então configurar os required checks de `develop`. A issue `#238` e o Project 4 permanecem `In Progress`.
