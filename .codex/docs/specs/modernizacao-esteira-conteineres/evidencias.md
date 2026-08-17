# Evidências: modernização da esteira de contêineres

## Estado da T013

- Data da coleta local (UTC): `2026-08-17T15:07:44Z`
- Tarefa: `T013`
- Issue: `#238` — aberta e atribuída a `nathannmvr`
- Branch local inicial: `develop`
- Branch do PR: `feature/modernizacao-esteira-conteineres`
- SHA base: `29b2d96d7bfc340eb9bccaa3adb815510bc85f6e`
- SHA submetido à CI: `6ff5c0f97f2f21f31870c1d9a7817dfe94c39625`
- Estado Git: **dirty**, com 38 entradas antes da criação deste documento; a implementação da modernização ainda não está commitada, portanto o SHA identifica a base e não, sozinho, todo o conteúdo validado.
- Resultado: **evidência local aprovada; PR real coletado com falha de integração devolvida à T007; T013 não concluída**.

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

## Execução GitHub coletada — falha devolvida à T007

- PR: [#302](https://github.com/ifpebj-ti/lab-solos/pull/302), base `develop`, head `feature/modernizacao-esteira-conteineres`.
- Run de Container CI: [#32041840006](https://github.com/ifpebj-ti/lab-solos/actions/runs/32041840006), commit `6ff5c0f97f2f21f31870c1d9a7817dfe94c39625`.
- Run do gate de dependências: [#32041839984](https://github.com/ifpebj-ti/lab-solos/actions/runs/32041839984), concluído com sucesso no mesmo commit.
- `Frontend quality`, `Backend quality` e `Workflow contracts` concluíram com sucesso.
- Os quatro jobs de scan construíram e extraíram os OCI, instalaram Trivy 0.72.0 e falharam no primeiro relatório.
- Causa comprovada no log: o workflow executa `trivy image ... "${RUNNER_TEMP}/oci-layout"` sem `--input`; o Trivy interpreta o diretório como referência de registry e encerra com `invalid reference format` antes de tabela, SARIF, artefato e gate.
- O run encerrou com `failure` às `2026-08-17T15:25:53Z`: as quatro células falharam na mesma etapa e nenhuma chegou a SARIF, upload de artefato ou gate.
- A CI não possui login de registry, push, release ou implantação; nenhuma escrita em packages/releases foi executada pelo workflow de PR.

O defeito pertence a `.github/workflows/container-ci.yml`, caminho da T007. Pelos limites da T013, ele não foi corrigido nesta tarefa e impede sua conclusão até a T007 ser reaberta, corrigida e o PR executar novamente.

## RED, GREEN e REFACTOR da tarefa documental

- **RED:** o primeiro run real existe, mas os scans falham antes de produzir relatórios porque falta `--input` nas chamadas do Trivy. A checagem Prettier ampla também caracterizou três arquivos preexistentes fora do escopo.
- **GREEN local:** todos os gates sob responsabilidade da modernização, quatro builds/scans e cenário bloqueante controlado foram reproduzidos; somente este documento foi criado como artefato persistente da T013.
- **REFACTOR:** resultados foram normalizados por célula, com separação explícita entre evidência local, preexistências e evidência GitHub não coletada.

Os tars, layouts, relatórios, DB/cache e fixtures temporários usados nesta coleta foram removidos após a consolidação. A T013 deve permanecer bloqueada pelo defeito devolvido à T007; não deve ser marcada como concluída com base apenas na validação local.
