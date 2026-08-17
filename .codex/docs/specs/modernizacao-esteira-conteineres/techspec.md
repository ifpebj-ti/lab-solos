# Especificação técnica: Modernização da esteira de contêineres

- Status: pronto
- PRD: `./prd.md`
- Atualizado em: 2026-08-17
- Validação de design: desnecessária

## Resumo técnico

A modernização substituirá os workflows duplicados `pipeline-front.yml` e `pipeline-back.yml` por dois fluxos com responsabilidades exclusivas:

1. `container-ci.yml` validará, antes do merge em `develop`, a qualidade da aplicação e a construção/varredura das imagens de frontend e backend para `linux/amd64` e `linux/arm64`, sem autenticação em registry, push, release ou implantação;
2. `container-release.yml` coordenará uma única entrega das duas imagens depois de merge em `main` ou de `workflow_dispatch` autorizado, publicando por digest no GHCR, varrendo cada componente/plataforma e promovendo somente os digests aprovados para a tag SemVer e depois para `latest`.

O GHCR continuará com os nomes públicos `ghcr.io/ifpebj-ti/lab-solos-frontend` e `ghcr.io/ifpebj-ti/lab-solos-backend`. Não haverá sufixo por arquitetura. Docker Buildx e QEMU produzirão os dois artefatos; Trivy substituirá Docker Scout com a política `HIGH,CRITICAL` + `ignore-unfixed`, emitindo tabela, SARIF e código de saída bloqueante. Azure Container Apps, Docker Scout e credenciais exclusivas de Docker Hub/Azure serão removidos dos workflows.

Não há mudança em APIs HTTP, esquema de banco ou comportamento funcional. A mudança fica restrita a workflows, testes estruturais, configuração de varredura, badges e, somente se a construção ARM revelar incompatibilidade, ao menor ajuste necessário nos Dockerfiles.

## Estado atual

Fotografia coletada em 2026-08-17 no branch `develop`, commit `29b2d96`:

| Área | Estado observado | Consequência |
|---|---|---|
| Eventos | `pipeline-front.yml` e `pipeline-back.yml` escutam apenas `pull_request` fechado para `main` e `workflow_dispatch` | Não há retorno pré-merge para mudanças comuns e o dispatch não chega ao build porque `tag-creation` é ignorado |
| Build/publicação | Cada workflow executa `docker build`, `docker tag` e `docker push` de uma única plataforma | Tags atuais não garantem um manifesto multi-arch |
| Coordenação | Frontend e backend calculam separadamente a próxima release global | Um PR que muda ambos pode disputar a mesma tag/release e não existe gate agregado antes de avançar `latest` |
| Varredura | Há login no Docker Hub, instalação por `curl` do Docker Scout e scan antes do push | A varredura depende de credenciais e ferramenta que o PRD remove; não produz SARIF |
| Implantação | Ambos os workflows usam `azure/login@v1` e `azure/container-apps-deploy-action@v1` | A esteira executa uma implantação fora do escopo desejado |
| Permissões | O job de imagem agrega `contents: write`, `packages: write` e `security-events: write` | Permissões de escrita não estão isoladas por responsabilidade |
| Imagens | Backend usa .NET 8 e usuário `app`; frontend usa build Node 18 e runtime `nginx:1.29.3-alpine-slim` | Os Dockerfiles são multi-stage e não apresentam, por inspeção estática, dependência nativa específica de AMD64; isso ainda precisa de build real ARM |
| Consumo | `docker-compose-prod.yml` referencia as duas imagens GHCR pela tag `latest` | Os nomes e a tag sem sufixo de arquitetura são contratos de compatibilidade |
| Fundação de testes | `backend/backend.sln` já inclui `Tests.csproj`; frontend já possui Vitest e script `test` | A linha de base antiga da skill foi superada e TDD estrutural é viável |
| Validação local | 39 testes Python, 8 testes xUnit, 6 testes Vitest, lint e build frontend passaram | Os comandos de aplicação estão reproduzíveis; o build frontend mantém avisos não bloqueantes já existentes |
| Ferramentas locais | Docker CLI 29.7.2 e Buildx 0.36.0 existem; daemon Docker estava desligado; `actionlint` e Trivy não estavam instalados | Builds locais multi-arch, inspeção de manifesto e scan Trivy não foram alegados nesta fotografia; a CI deve prover as ferramentas fixadas |

O repositório já possui `.github/workflows/security-dependencies.yml` em `pull_request` para `develop`, com permissões mínimas, `concurrency`, timeouts, testes Python e gates npm/.NET. Esse workflow é referência de forma, mas não constrói nem varre imagens e não substitui a nova CI de contêineres.

## Arquitetura proposta

### Artefatos versionados

- `.github/workflows/container-ci.yml`: gate pré-merge sem publicação.
- `.github/workflows/container-release.yml`: construção por plataforma, scan por digest, promoção das duas imagens e criação da GitHub Release.
- `.github/workflows/pipeline-front.yml` e `.github/workflows/pipeline-back.yml`: removidos depois de os novos testes estruturais passarem.
- `.github/scripts/tests/test_container_workflows.py`: testes rápidos e sem rede para eventos, matrizes, permissões, tags, política Trivy e ausência de integrações obsoletas.
- `.trivy.yaml`: fonte única da política de vulnerabilidade (`vuln`, `os,library`, `HIGH,CRITICAL`, `ignore-unfixed: true`, código bloqueante `1`).
- `.github/dependabot.yml`: nova entrada semanal do ecossistema `github-actions`, destinada a `develop`, para atualizar ações fixadas.
- `README.md`: badges apontam para os novos nomes de workflow.

Todas as ações de terceiros novas ou alteradas serão fixadas por SHA completo, com a tag de versão em comentário. A implementação deve resolver os SHAs das versões estáveis no momento da mudança e validar que pertencem ao repositório oficial; não deve copiar cegamente as tags hoje existentes.

### Separação de privilégios

```text
PR -> develop
  container-ci.yml
  contents:read (+ security-events:write apenas no job que publica SARIF)
  -> qualidade -> build local AMD64/ARM64 -> Trivy -> artefatos/SARIF
  -> nunca autentica, publica, cria release ou implanta

PR mesclado -> main / dispatch em main por usuário com write
  container-release.yml (concorrência serial)
  -> prepara uma versão -> build por componente/plataforma -> push por digest
  -> Trivy nos quatro digests -> cria manifestos versionados -> verifica
  -> move latest -> verifica -> cria GitHub Release
  -> nunca acessa Azure ou Docker Hub
```

`container-release.yml` usará `concurrency.group: container-release` e `cancel-in-progress: false`. Assim, duas promoções não calculam/publicam versões em paralelo e uma release em curso nunca é cancelada depois de começar a escrever no GHCR.

### Modelo de construção e promoção

A matriz de entrega possui exatamente quatro combinações:

| Componente | Contexto/Dockerfile | Plataforma | Imagem |
|---|---|---|---|
| frontend | `frontend` / `frontend/Dockerfile` | `linux/amd64` | `ghcr.io/ifpebj-ti/lab-solos-frontend` |
| frontend | `frontend` / `frontend/Dockerfile` | `linux/arm64` | `ghcr.io/ifpebj-ti/lab-solos-frontend` |
| backend | `backend` / `backend/Dockerfile` | `linux/amd64` | `ghcr.io/ifpebj-ti/lab-solos-backend` |
| backend | `backend` / `backend/Dockerfile` | `linux/arm64` | `ghcr.io/ifpebj-ti/lab-solos-backend` |

Cada célula executa Buildx/QEMU e publica um manifesto de plataforma pelo digest canônico, sem tag pública, usando saída equivalente a `type=image,push-by-digest=true,name-canonical=true,push=true`. O digest vira a identidade imutável usada pelo Trivy e é transferido aos jobs seguintes como artefato de texto, nunca recalculado a partir de uma tag mutável.

Depois que os quatro scans passam, o job de promoção:

1. reúne os dois digests de cada componente com `docker buildx imagetools create` e cria a tag versionada;
2. inspeciona o JSON bruto e exige exatamente `linux/amd64` e `linux/arm64`, sem duplicatas ou plataforma extra;
3. somente depois de as duas tags versionadas passarem, copia cada índice aprovado para `latest`;
4. reinspeciona `latest` e confirma que seu digest/descritores correspondem à versão;
5. cria uma única GitHub Release para a versão.

Builds de release usarão `provenance: false` e `sbom: false` nesta iniciativa, porque attestations anexadas ao índice aparecem como descritores adicionais e conflitam com o CA-001, que exige exatamente duas plataformas. Reintroduzir SBOM/provenance exigirá critério próprio que diferencie manifestos executáveis de attestations.

## Fluxos e componentes

### CI pré-merge

1. Disparar em `pull_request` destinado a `develop` nos tipos padrão `opened`, `synchronize` e `reopened`, e em `workflow_dispatch` para diagnóstico.
2. Aplicar filtros a `frontend/**`, `backend/**`, `.trivy.yaml`, scripts/testes de workflow e aos dois workflows de contêineres.
3. Cancelar execução obsoleta do mesmo PR com `concurrency` e impor timeout por job.
4. Executar em paralelo:
   - frontend: `npm ci`, Vitest, ESLint e build Vite;
   - backend: restore, build e xUnit sobre `backend/backend.sln`;
   - validação estrutural Python e `actionlint` fixado;
   - matriz de build local das duas imagens nas duas plataformas.
5. Exportar cada build como arquivo OCI sem push, extrair o layout OCI em diretório temporário e varrê-lo com Trivy 0.72.0. Essa versão não aceita diretamente o tar produzido por `type=oci`, embora aceite o layout extraído.
6. Exibir tabela no log, gerar SARIF e anexar tabela/SARIF por `componente-plataforma` com retenção de 30 dias.
7. Enviar SARIF ao Code Scanning com categoria única por componente/plataforma quando o evento tiver token capaz de `security-events: write`. Em PR de fork/Dependabot, preservar o SARIF como artefato e não falhar somente pela impossibilidade de upload ao Code Scanning.
8. Aplicar o gate Trivy por último, para que relatório e SARIF existam mesmo quando houver vulnerabilidade bloqueante.

### Entrega automática

1. Disparar em `pull_request` fechado para `main`, condicionado a `github.event.pull_request.merged == true`.
2. Ler exatamente uma opção do template de PR: `novo-marco`, `nova-feature-refactor` ou `bug-fix`; calcular uma vez o próximo SemVer a partir da última GitHub Release válida.
3. Quando a opção for `outros`, concluir como “sem release” e não escrever no GHCR. Zero ou múltiplas opções marcadas são erro de contrato.
4. Fazer checkout explícito do merge commit em `main`, construir e publicar os quatro digests, executar os quatro scans e promover conforme a ordem definida.
5. Criar a GitHub Release apenas após as imagens e tags serem verificadas.

### Entrega manual autorizada

1. `workflow_dispatch` exige o input `version` no formato canônico `MAJOR.MINOR.PATCH`, sem prefixo `v`, e só prossegue quando `github.ref == 'refs/heads/main'`.
2. O GitHub já exige acesso de escrita para executar manualmente um workflow; a configuração de proteção de execução do repositório deve, quando disponível, restringir `workflow_dispatch` a mantenedores.
3. O SHA liberado é o selecionado em `main`; o workflow registra ator, SHA, versão e run URL no resumo.
4. Se a versão já existir, o workflow compara os digests. Resultado idêntico é reexecução idempotente; divergência falha sem mover `latest`.

## Contratos e APIs

Não há alteração em endpoints HTTP, payloads, portas, variáveis de ambiente da aplicação ou contratos do banco.

### Contrato das imagens

| Campo | Frontend | Backend |
|---|---|---|
| Nome GHCR | `ghcr.io/ifpebj-ti/lab-solos-frontend` | `ghcr.io/ifpebj-ti/lab-solos-backend` |
| Tags públicas | `<MAJOR>.<MINOR>.<PATCH>` e `latest` | `<MAJOR>.<MINOR>.<PATCH>` e `latest` |
| Plataformas | exatamente `linux/amd64`, `linux/arm64` | exatamente `linux/amd64`, `linux/arm64` |
| Porta/entrada | preserva porta 80 e entrypoint atual | preserva porta 8080 e entrypoint atual |
| Metadados mínimos | revisão OCI = SHA de `main`; source = repositório | revisão OCI = SHA de `main`; source = repositório |

Tags públicas são índices OCI multi-arch. Tags ou sufixos como `-amd64` e `-arm64` não fazem parte do contrato externo. Os digests intermediários são detalhes da entrega e não podem ser usados em documentação operacional como substitutos das tags públicas.

### Contrato da política Trivy

- alvo: imagem final, incluindo pacotes de sistema operacional e bibliotecas da aplicação detectáveis;
- scanners: somente vulnerabilidades (`vuln`) nesta iniciativa;
- tipos de pacote: `os,library`;
- severidades bloqueantes: `HIGH,CRITICAL`;
- correção disponível: representada por `ignore-unfixed: true`; achados sem versão corrigida continuam visíveis em scans informativos mais amplos quando executados, mas não bloqueiam este gate;
- saída obrigatória: tabela em log/artefato e SARIF por componente/plataforma;
- resultado: código `0` sem achado bloqueante, `1` com achado bloqueante e outro código para falha operacional. Falha ao baixar a base, autenticar ou ler a imagem nunca pode ser interpretada como scan limpo.

### Contrato de versão

- SemVer canônico sem `v` preserva as tags existentes.
- `novo-marco` incrementa major e zera minor/patch; `nova-feature-refactor` incrementa minor e zera patch; `bug-fix` incrementa patch; `outros` não entrega.
- A mesma versão identifica frontend, backend e GitHub Release.
- `latest` aponta para a mesma composição aprovada da versão mais recente e só avança depois das quatro varreduras e das duas verificações de manifesto.

## Dados e migrações

Não há alteração de esquema, migração de banco ou tratamento de dados pessoais.

Os novos dados operacionais são temporários:

- arquivos OCI da CI, tabelas e SARIF: artefatos por componente/plataforma, retenção de 30 dias;
- arquivos de digest da release: usados apenas dentro do run e retidos pelo período mínimo necessário para diagnóstico;
- resumos de workflow: versão, SHA, ator, plataformas, digests, contagens Trivy e links para artefatos;
- manifestos de plataforma sem tag criados antes da promoção: sujeitos à política de retenção do GHCR; não conceder `packages: delete` ao workflow somente para limpá-los.

## Segurança, privacidade e permissões

| Job | Permissões máximas | Justificativa |
|---|---|---|
| CI de qualidade/build | `contents: read` | Checkout e leitura do código |
| CI de SARIF | `contents: read`, `actions: read`, `security-events: write` | Upload ao Code Scanning; `actions: read` somente se necessário ao tipo de repositório |
| Preparação de release | `contents: read` | Ler checkout, evento e releases públicas; se a API exigir, isolar `contents: write` apenas na criação final |
| Build por digest | `contents: read`, `packages: write` | Login no GHCR com `GITHUB_TOKEN` e publicação dos manifests intermediários |
| Scan de release | `contents: read`, `packages: read`, `security-events: write` | Ler digest privado, gerar e publicar SARIF |
| Promoção/release | `contents: write`, `packages: write` | Criar tags OCI e a GitHub Release |

- Autenticação GHCR usa `github.actor` + `secrets.GITHUB_TOKEN`; nenhum PAT, usuário/senha Docker Hub ou credencial Azure é necessário.
- O workflow nunca imprime tokens, arquivos de evento completos ou corpo de PR sem sanitização. A escolha do tipo de mudança é obtida como dado e validada contra enum fechado.
- Não usar `pull_request_target` para executar código do PR.
- Ações devem ser fixadas por SHA e atualizadas por Dependabot; downloads auxiliares devem ter versão e integridade verificáveis.
- Caches Buildx usam escopo separado por componente/plataforma e não contêm segredos.
- Depois da auditoria por busca e de uma execução bem-sucedida, mantenedores removem manualmente `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` e `AZURE_CREDENTIALS` das configurações do GitHub. A automação não apagará segredos.
- Confirmar em GHCR que o repositório possui acesso de escrita aos dois packages via Actions antes da primeira entrega.

## Falhas, observabilidade e operação

| Falha | Comportamento esperado | Evidência/recuperação |
|---|---|---|
| Build ARM falha | Falhar o job e impedir qualquer tag pública | Log Buildx por componente/plataforma; ajustar somente a instrução/Dockerfile incompatível e repetir CI |
| Base Trivy indisponível | Falhar como erro operacional, nunca como zero achados | Código de saída, versão do Trivy e mensagem de download no resumo |
| Vulnerabilidade bloqueante | Gerar tabela e SARIF antes de falhar; não promover | Artefatos `trivy-<componente>-<arquitetura>` e alerta Code Scanning |
| Upload SARIF indisponível em fork | Manter artefato SARIF e resultado do gate; marcar upload como não aplicável | Condição do evento e link do artefato |
| Push de digest parcial | Não criar tag versionada nem `latest`; reexecutar só após causa corrigida | Quatro digests esperados versus produzidos no resumo |
| Manifesto contém plataforma extra/ausente | Falhar verificação e não mover `latest` | JSON bruto de `imagetools inspect --raw` e conjunto normalizado de plataformas |
| Tag versionada já existe com outro digest | Falhar como conflito imutável | Versão, digest existente e digest candidato, sem sobrescrita |
| Falha ao mover uma das tags `latest` | Restaurar a tag já alterada para o digest capturado antes da promoção; marcar intervenção se rollback falhar | Digests anterior, novo e restaurado no resumo |
| Criação da GitHub Release falha após imagens | Manter imagens versionadas, não reconstruir; reexecutar idempotentemente a etapa final | Verificação de digests antes de criar a release |
| Dois merges próximos | Serializar por `concurrency`, sem cancelamento | Run anterior/seguinte e versão calculada após liberação do lock |

Cada job inclui `timeout-minutes` e publica `GITHUB_STEP_SUMMARY`. A entrega final exibe uma tabela com componente, plataforma, digest, estado do scan, tag versionada, digest de `latest` e URL da GitHub Release. Não será adicionada telemetria à aplicação.

## Compatibilidade, disponibilização e reversão

1. Integrar primeiro testes estruturais, configuração Trivy e os dois workflows no mesmo PR para `develop`; os testes devem impedir coexistência operacional com referências Azure/Scout/Docker Hub.
2. Manter os nomes das imagens e o uso sem sufixo por arquitetura. `docker-compose-prod.yml` não precisa mudar.
3. Atualizar badges no mesmo commit que remove os workflows antigos, evitando links quebrados.
4. Configurar como checks obrigatórios de `develop` os jobs estáveis de `container-ci.yml`; uma execução pós-merge não conta como gate.
5. Executar um dispatch controlado em `main` com versão não conflitante, inspecionar as quatro combinações e só então remover secrets obsoletos.

Reversão da configuração restaura os dois workflows antigos apenas como mecanismo de build/publicação GHCR, com os passos Azure/Scout/Docker Hub ainda proibidos. Reversão de uma release não reconstrói imagens: captura os digests anteriormente aprovados e recria `latest` com `docker buildx imagetools create`. Tags versionadas são imutáveis; uma versão incorreta recebe nova versão corretiva em vez de sobrescrita. A ausência de transação entre dois packages GHCR é mitigada por scan agregado, ordem versão -> verificação -> `latest`, captura de digests anteriores e rollback compensatório.

## Estratégia TDD e pirâmide de testes

### RED

1. Criar `test_container_workflows.py` antes dos workflows novos e observar falhas por arquivos ausentes.
2. Cobrir fixtures/textos mínimos que demonstrem falha quando: CI não aponta para `develop`; release publica em PR aberto; existe `pull_request_target`; aparece Azure/Scout/Docker Hub; alguma plataforma/componente falta; permissões de escrita aparecem na CI; Trivy não usa `HIGH,CRITICAL` + `ignore-unfixed`; `latest` ocorre antes do scan/verificação; SARIF não usa categorias únicas.
3. Criar teste do normalizador/validador de manifestos com índices contendo uma plataforma, três plataformas, duplicata e exatamente AMD64/ARM64.
4. Criar teste da resolução de versão com os quatro tipos do template, zero/múltiplas seleções, primeira release, SemVer inválido e dispatch fora de `main`.
5. Executar um cenário Trivy controlado com fixture/imagem vulnerável corrigível e registrar RED do código `1`, além de cenário de erro operacional distinto.

### GREEN

1. Adicionar o mínimo de `.trivy.yaml` e testes/scripts para satisfazer política e contratos de saída.
2. Implementar `container-ci.yml` até passar teste estrutural, `actionlint`, gates de aplicação e matriz local sem push.
3. Implementar `container-release.yml` até passar contratos de evento, permissão, versão, build por digest, scan e promoção.
4. Remover os workflows antigos e atualizar badges somente quando a suíte provar ausência das integrações proibidas.
5. Executar PR real para `develop` e dispatch controlado em `main`; evidência local isolada não substitui esses dois eventos.

### REFACTOR

1. Extrair scripts testáveis apenas para lógica não declarativa que esteja duplicada entre jobs, especialmente versão e validação de manifesto.
2. Consolidar nomes de matriz, artefatos e categorias SARIF sem criar reusable workflow prematuro.
3. Revisar escopos de token, caches, timeouts e logs com todas as suítes verdes.
4. Reexecutar auditoria global de termos obsoletos e os comandos amplos antes de declarar a esteira pronta.

Pirâmide esperada:

- **Unitários/estruturais:** Python para YAML, eventos, permissões, política, SemVer e manifesto normalizado; sem rede.
- **Integração:** Buildx de cada Dockerfile/plataforma, export OCI, extração temporária do layout para o Trivy na CI, scan por digest na release e criação/inspeção de índice.
- **Contrato:** nomes/tags GHCR, conjunto exato de plataformas, idempotência e ordem de promoção.
- **Aplicação:** xUnit, Vitest, lint e builds existentes para provar que a imagem continua empacotando artefatos válidos.
- **E2E operacional:** PR real para `develop` sem push e dispatch/merge controlado para `main` com inspeção remota; não há UI de produto nova.

## Esteira de qualidade

| Área | Comando local | Verificação de CI | Lacuna/ação |
|---|---|---|---|
| Testes estruturais | `python -m unittest discover -s .github/scripts/tests -p "test_container_workflows.py" -v` | Job sem rede em PR para `develop` | Arquivo será criado; integrar à regressão `test_*.py` |
| Regressão de scripts | `python -m unittest discover -s .github/scripts/tests -p "test_*.py" -v` | Mesmo comando | 39 testes passaram em 2026-08-17 |
| Sintaxe Actions | `actionlint .github/workflows/container-ci.yml .github/workflows/container-release.yml` | actionlint 1.7.12 fixado e verificado | Ferramenta ausente localmente; implantação obrigatória na CI |
| Formatação YAML | `cd frontend && npx prettier --check ../.github/workflows/container-ci.yml ../.github/workflows/container-release.yml ../.trivy.yaml` | Mesmo comando após `npm ci` | Prettier já está no lockfile |
| Frontend | `cd frontend && npm ci && npm run test -- --run && npm run lint && npm run build` | Job frontend em PR para `develop` | 6 testes, lint e build passaram; preservar avisos conhecidos como não bloqueantes |
| Backend | `dotnet restore backend/backend.sln && dotnet build backend/backend.sln --no-restore -c Release --nologo --disable-build-servers && dotnet test backend/backend.sln --no-build --no-restore -c Release --nologo --disable-build-servers` | Job backend em PR para `develop` | 8 testes passaram; build mantém dois avisos CS8604 fora deste escopo |
| Build local AMD64 | `docker buildx build --platform linux/amd64 --output type=oci,dest=frontend-amd64.tar -f frontend/Dockerfile frontend` e equivalente para backend | Matriz CI | Não executado porque daemon Docker estava desligado |
| Build local ARM64 | `docker buildx build --platform linux/arm64 --output type=oci,dest=frontend-arm64.tar -f frontend/Dockerfile frontend` e equivalente para backend | Matriz CI com QEMU | Não executado porque daemon Docker estava desligado |
| Trivy local | `mkdir frontend-amd64-oci && tar -xf frontend-amd64.tar -C frontend-amd64-oci && trivy image --config .trivy.yaml --input frontend-amd64-oci` | Tabela + SARIF + gate por célula | Validado com Trivy 0.72.0; o tar OCI direto não é aceito e deve ser extraído antes do scan |
| Auditoria de limpeza | `rg -n -i "azure/login|container-apps-deploy|docker scout|scout-cli|DOCKERHUB_|AZURE_CREDENTIALS" .github README.md` | Teste estrutural bloqueante | Hoje encontra ocorrências nos dois workflows antigos |
| Inspeção remota | `docker buildx imagetools inspect --raw ghcr.io/ifpebj-ti/lab-solos-frontend:<versão>` e backend/`latest` | Job de promoção e verificação | Requer release controlada e acesso ao GHCR |

Os comandos de build OCI escrevem artefatos locais grandes; devem ser executados em diretório temporário e removidos após a verificação. A execução desta skill não iniciou o Docker Desktop nem instalou ferramentas globais.

## Matriz de rastreabilidade

| Requisito | Componentes | Testes | Evidência |
|---|---|---|---|
| RF-001 | release coordenada, matriz componente/plataforma, promoção por digest | matriz 2x2; validador de índice; inspeção de versão e `latest` | JSON bruto e resumo mostram exatamente AMD64/ARM64 nas duas tags/imagens |
| RF-002 | `.trivy.yaml`, jobs Trivy, artefatos e upload SARIF | fixture vulnerável corrigível; quatro scans por digest; teste de erro operacional | tabela no log, SARIF por categoria e job bloqueado para `HIGH`/`CRITICAL` corrigível |
| RF-003 | remoção dos workflows antigos, teste de termos proibidos, limpeza manual de secrets | busca global e asserções negativas | zero referência operacional a Azure/Scout/Docker Hub da varredura |
| RF-004 | `container-ci.yml`, `container-release.yml`, condições de evento | teste estrutural de triggers/guards; PR real; dispatch/merge controlado | PR `develop` sem escrita e release somente após merge `main`/dispatch válido |
| RNF-001 | nomes GHCR preservados, índices sem sufixo, `docker-compose-prod.yml` inalterado | inspeção remota e smoke pull em AMD64/ARM64 | mesma referência resolve o digest correto conforme a plataforma |
| RNF-002 | permissões por job, SHA de actions, `GITHUB_TOKEN`, ausência de secrets legados | teste estrutural de permissões/segredos e revisão do log | mapa de permissões, zero segredo em artefato/log e secrets legados removidos manualmente |
| CA-001 | RF-001 + RNF-001 | inspeção exata das quatro referências públicas | conjuntos normalizados iguais a `{linux/amd64, linux/arm64}` |
| CA-002 | RF-002 | imagem/fixture com achado corrigível e `exit-code: 1`; upload `always()` | job falha depois de tabela e SARIF existirem |
| CA-003 | RF-003 + RNF-002 | busca global e teste negativo | workflows/badges/configurações sem integração obsoleta; confirmação manual dos secrets |
| CA-004 | RF-004 | simulação estrutural + execuções reais dos dois eventos | CI de PR não contém login/push/release; evento de main pode publicar |

## Alternativas e decisões

| Decisão | Alternativas | Recomendação | Escolha confirmada | Consequências |
|---|---|---|---|---|
| Organização | manter dois workflows por componente; unificar tudo; separar CI e release coordenada | Dois workflows por responsabilidade, ambos cobrindo as duas imagens | Derivada de RF-004 e CA-001 | Elimina corrida de versão e permite gate agregado antes de `latest` |
| Evento de release | `push` em `main`; PR fechado/mesclado em `main`; tag Git | PR fechado com `merged == true` + dispatch em `main` | Confirmada pelo PRD | Preserva acesso ao tipo de mudança do PR e exclui fechamento sem merge |
| Artefato pré-promoção | reconstruir após scan; tag candidata mutável; digest canônico sem tag | Publicar e varrer o digest exato por plataforma | Desnecessária decisão adicional | O que é promovido é exatamente o que foi varrido; ficam manifests sem tag sujeitos à retenção GHCR |
| Estratégia multi-arch | um runner com QEMU; runners ARM nativos; Docker GitHub Builder | Buildx/QEMU em matriz explícita | Confirmada pelo escopo do PRD | Maior tempo em ARM, porém contrato e diagnóstico sob controle do repositório |
| Política de scan | falhar por toda alta/crítica; apenas corrigível; lista manual | `HIGH,CRITICAL` com `ignore-unfixed` | Confirmada pelo PRD | Bloqueia risco acionável sem paralisar por item sem correção |
| Publicação SARIF | somente artefato; somente Code Scanning; ambos | Ambos, com fallback para fork/indisponibilidade | Derivada de RF-002 | Diagnóstico permanece acessível mesmo sem permissão de Code Scanning |
| Attestations | manter padrão Buildx; filtrar descritores; desabilitar neste ciclo | Desabilitar provenance/SBOM para cumprir conjunto exato | Derivada de CA-001 | Supply-chain attestations ficam para iniciativa posterior com critério explícito |
| Actions | tags mutáveis; SHA completo; ações locais | SHA completo + atualização Dependabot | Derivada de RNF-002 | Melhor integridade, com manutenção automatizada adicional |
| Validação de design | sessão `$grill-me`; dispensar; marcar desnecessária | Desnecessária | Não restou escolha material incompatível com decisões do PRD | Pode seguir para decomposição em tarefas |

Referências técnicas consultadas: [multi-platform com GitHub Actions](https://docs.docker.com/build/ci/github-actions/multi-platform/), [`imagetools create`](https://docs.docker.com/reference/cli/docker/buildx/imagetools/create/), [CLI de imagem do Trivy](https://trivy.dev/docs/latest/guide/references/configuration/cli/trivy_image/), [upload de SARIF](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file), [eventos de pull request](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows) e [execução manual](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow).

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| QEMU mascarar incompatibilidade ou tornar ARM lento | Matriz separada, timeout, cache por plataforma e logs BuildKit; migrar para runner ARM nativo somente com evidência de gargalo |
| Imagem-base mudar entre tentativas | Promover o digest já construído/varrido; nunca reconstruir entre scan e tag |
| Attestations criarem plataforma `unknown/unknown` | `provenance: false`, `sbom: false` e teste do JSON bruto exigindo conjunto exato |
| Vulnerabilidade surgir depois do build | Registrar versão/data da base Trivy e reexecutar scan em toda release; advisories posteriores geram nova correção, não alteram evidência histórica |
| SARIF não estar habilitado em repositório privado | Manter artefato e tabela; configurar GitHub Code Security quando aplicável sem enfraquecer o gate |
| Falha parcial entre dois packages | Serialização, promoção só após gate agregado, verificação intermediária e rollback compensatório de `latest` |
| Corrida na versão | Um workflow coordenado e `concurrency` sem cancelamento; cálculo executado dentro da seção serializada |
| `latest` sobrescrito por reexecução antiga | Ref `main`, versão validada, comparação de digest e concorrência global |
| Secrets obsoletos permanecerem fora do código | Checklist manual após busca sem consumidores; não declarar CA-003 concluído sem confirmação das configurações GitHub |
| Ação/instalador comprometido | SHA completo, Dependabot para `github-actions`, versão Trivy/actionlint fixada e verificação de origem/integridade |
| Build local não reproduzido nesta elaboração | CI obrigatória em PR e dispatch controlado; documentar claramente que Docker daemon estava indisponível |
| Tag `latest` anterior desconhecida na reversão | Capturar e persistir ambos os digests antes de qualquer promoção; abortar se não puderem ser lidos |

## Perguntas abertas

Nenhuma bloqueante.

Antes da primeira entrega, a execução deve apenas confirmar estados externos que não alteram a arquitetura: acesso Actions aos dois packages GHCR, disponibilidade de Code Scanning, checks obrigatórios de `develop` e remoção manual dos três secrets legados depois da auditoria. Ausência de Code Scanning reduz a visualização centralizada, mas não elimina tabela, SARIF como artefato nem o gate Trivy.
