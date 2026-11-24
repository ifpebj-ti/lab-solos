# Especificação técnica — Rastreabilidade de releases

- **Status** Rascunho — validação de design pendente
- **PRD** [Rastreabilidade de releases](./prd.md)
- **Atualizado em** 2026-11-15
- **Validação de design** pendente para identidade da reexecução, prova de digest e tratamento do histórico
- **Validação de descoberta** dispensada pelo usuário

## Resumo técnico

Conciliar `CHANGELOG.md` com as releases 2.7.3, 2.7.4 e 2.7.5, construir um inventário verificável das publicações históricas em escopo e estender `Container Release` para conferir o changelog antes de qualquer publicação e a identidade da tag Git, GitHub Release e duas imagens GHCR. A mesma versão deve ser verificável em reexecuções sem alterar referências conflitantes ou republicar conteúdo já aceito.

## Estado atual

- `CHANGELOG.md` termina em 2.7.2 e inclui a PR #443 em “Não publicado”. A atribuição de cada item e a contribuição da PR #458 precisam de conferência nas fontes oficiais. O PRD registra 2026-09-29, 2026-10-14 e 2026-11-10, em UTC, para 2.7.3, 2.7.4 e 2.7.5, respectivamente.
- `.github/workflows/container-release.yml` roda em `pull_request: closed` para `main`, com publicação condicionada a PR integrado, ou em `workflow_dispatch` com a versão informada. A preparação seleciona o SHA de merge ou do disparo manual e faz checkout dele. `.github/scripts/resolve_container_version.py` interpreta a opção do PR e a última versão canônica encontrada por `gh release list --limit 100`, valida versão explícita de dispatch na `main` e pula publicações com a opção `outros`. Não há verificação do changelog.
- Os jobs de build e Trivy produzem e conferem digests por componente e plataforma. A promoção valida os índices OCI `linux/amd64` e `linux/arm64`, verifica colisões nas duas tags de versão antes de criar qualquer delas e compara manifestos com os candidatos. `finalize-release` confere a revisão declarada em cada configuração OCI, captura os digests anteriores de `latest`, promove os aliases e então chama `gh release create` quando a release está ausente. O workflow serializa publicações.
- O caminho atual de reúso compara `tagName` e `targetCommitish` a partir de `gh release view`, sem confirmar por consulta independente o commit apontado pela tag Git. Na reexecução automática, o cálculo da versão usa a lista de releases no momento da nova tentativa e pode selecionar uma versão diferente para o mesmo SHA. O caminho de reúso também não compara o digest corrente com um registro independente da publicação anterior e pode voltar a promover `latest` para uma versão mais antiga.
- Os testes Python de resolução de versão, contrato do workflow e manifesto OCI já rodam em `Container CI / Workflow contracts`, antes do merge em PR para `develop`. A publicação em `main` é posterior ao merge. Scripts de atualização na OCI consultam a última GitHub Release estável, portanto a ordem de confirmação da release importa para quem implanta.

## Arquitetura proposta

Acrescentar verificações à esteira existente e manter os validadores de SemVer e manifesto. Separar o trabalho editorial do histórico, que exige consultas e revisão humanas, da confirmação recorrente da CI, reproduzível por testes com respostas simuladas. Os pontos de identidade da versão, fonte dos digests, ordem de publicação e tratamento histórico permanecem condicionados à decisão de design.

### Fluxos e componentes

1. **Histórico recente** — cruzar as notas de 2.7.3, 2.7.4 e 2.7.5, as diferenças entre tags resolvidas e os PRs e issues de origem, incluindo #443 e #458. Para itens em “Não publicado”, registrar a primeira versão que comprovadamente contém cada entrega. Se um item agrupa mudanças publicadas em momentos diferentes, dividir apenas o necessário para rastrear as evidências. Acrescentar seções em ordem decrescente, com data oficial de publicação em UTC e link. Preservar as entradas sem publicação comprovada.
2. **Inventário histórico** — consultar `v1.0.0`, `1.0.1`, `2.0.0`, `2.0.1`, `2.0.2`, `2.0.3` e `2.1.0` nos quatro canais. Guardar as referências exatas. Verificar nomes históricos de pacotes quando sustentados por fontes da época e só então classificar ausência ou divergência. Finalizar cada ocorrência com correção conferida ou exceção aprovada.
3. **Preparação de nova publicação** — obter a versão candidata e o SHA selecionado uma vez por intenção de publicação, com identidade que sobreviva à reexecução. Validar o arquivo `CHANGELOG.md` desse SHA antes dos jobs que escrevem no registro ou publicam no GitHub. Associar a entrada a um cabeçalho próprio e inequívoco da versão. Acionar o fluxo de publicação apenas para o resultado de resolução `release=true`.
4. **Proteção das referências** — consultar pela versão canônica a tag Git, a GitHub Release e os dois índices GHCR. Distinguir primeira publicação, publicação parcial, publicação já consistente, conflito e consulta incompleta. Parar antes de escrever se uma referência preexistente conflita ou houver dúvida na leitura. Em primeira publicação sem conflito, construir, analisar e promover pelos digests verificados, reaproveitando o fluxo atual. Em reexecução de uma versão já publicada, verificar sem escrever a tag, a release ou os aliases `latest`. Uma publicação parcial só pode continuar por referências ausentes cuja identidade e origem possam ser confirmadas segundo a política aprovada.
5. **Confirmação** — confirmar a identidade dos quatro artefatos por leituras dos canais, inclusive o commit resolvido da tag e os manifestos das imagens. Vincular resultado ao resumo da execução e conservar a evidência de identidade em local cuja retenção atenda reexecuções futuras. Uma divergência, falha de consulta ou ausência impede a confirmação de consistência. O procedimento deve deixar explícita a condição de cada artefato se uma falha ocorrer depois de alguma escrita.

## Contratos e APIs

| Contrato | Entrada e verificação | Saída ou falha esperada |
| --- | --- | --- |
| Identidade da publicação | Evento, repositório, identificador estável da intenção, versão SemVer canônica `X.Y.Z` e SHA de commit completo. No evento automático, manter vínculo verificável com o evento original e o SHA de merge. No manual, usar versão informada e SHA selecionado na `main`. | Um par versão/SHA por intenção. Retentativa da mesma intenção recupera o par. Correspondências múltiplas ou SHA conflitante bloqueiam. `outros` encerra sem publicar. |
| Entrada de changelog | Ler o arquivo do SHA resolvido. Usar a estrutura Markdown existente de seção de segundo nível com versão em link oficial e data ISO. O validador deve reconhecer a versão exata, exigir uma seção inequívoca e ignorar exemplos, menções no corpo e “Não publicado”. | Aprovação da entrada própria. Falha explícita com versão e SHA para ausência, duplicidade ou formato ambíguo. Formato aceito e gramática terão testes e documentação. |
| Tag Git | Consultar a ref exata `refs/tags/<versão>` e resolver até commit, inclusive tag anotada, comparando ao SHA selecionado. | Nome original e commit resolvido. Ponteiro incompatível, tag para tipo diverso de commit e erro de consulta impedem escrita. |
| GitHub Release | Conferir `tagName`, publicação e associação com a tag Git consultada. `targetCommitish` apoia o diagnóstico, enquanto a ref Git comprova o commit. | URL e estado da release. O resultado distingue rascunho, pré-lançamento, inconsistência e ausência. A política de novas releases estáveis precisa manter a compatibilidade operacional vigente. |
| Imagens GHCR | Ler as refs `ghcr.io/ifpebj-ti/lab-solos-frontend:<versão>` e `ghcr.io/ifpebj-ti/lab-solos-backend:<versão>`, digests do índice e das duas plataformas, e `org.opencontainers.image.revision`. Comparar com candidatos analisados ou registro de publicação confiável para provar identidade além da etiqueta de revisão. | Dois resultados com ref, digest, plataformas, origem e modalidade de evidência. Tags ausentes, arquitetura incompatível, revisão ou digest divergente e falhas de acesso trazem diagnóstico por módulo. |
| Confirmação | Quatro leituras conclusivas para a mesma versão/SHA. | Sumário com versão, SHA, execução/tentativa, estado de cada artefato, URL da release e digests. Consulta incompleta, conflito ou lacuna bloqueiam a conclusão. |

Usar consultas Git, GitHub e GHCR já compatíveis com a esteira. Interface da aplicação, formato de imagem, descoberta da última release pelos scripts OCI e números de versão seguem os contratos atuais.

## Dados e migrações

O inventário deve fornecer, por versão nominal, data UTC da consulta, tag Git bruta e commit resolvido, release com tag e URL, referências exatas de frontend e backend, digest quando disponível, fonte verificável, classificação de cada canal, evidência de associação e tratamento com responsável, revisão, justificativa e data do aceite. Classificações de trabalho: `presente`, `ausência confirmada`, `divergência` e `não verificável`. Uma referência com prefixo `v` é preservada no campo bruto. A comparação nominal sem o prefixo identifica candidatos e depende de evidência para aprovar associação.

O registro persistente da nova publicação, se adotado, vincula versão e SHA ao identificador da intenção, digests do índice e por plataforma, fonte da prova e execução. Definir local de armazenamento, integridade, precedência e compatibilidade com versões anteriores na validação de design. Não há alteração no banco de dados do produto. O preenchimento do inventário é um trabalho de documentação e conferência, com correções históricas condicionadas à aprovação e à origem verificável.

## Segurança, privacidade e permissões

Preservar preparação e validação com privilégios de leitura e isolar as permissões de escrita dos jobs de publicação. Evitar que dados do PR sejam tratados como código do workflow. Consultas inconclusivas por credencial insuficiente, limitação de taxa ou erro de rede não provam ausência. Um retorno de referência inexistente só permite escrita quando a fonte e o acesso necessários tiverem sido confirmados. Registrar diagnósticos sanitizados, sem tokens ou conteúdos internos não autorizados.

Testes pré-merge usam fixtures ou adaptadores simulados de consulta, sem criar releases, tags ou imagens reais. Na publicação, manter serialização do workflow e revalidar precondições antes de cada escrita que possa colidir com alterações externas. Durante conflitos, não forçar atualização de tags Git/GHCR nem ajustar uma release já publicada.

## Falhas, observabilidade e operação

Diagnosticar separadamente falha de changelog, ausência confirmada, divergência de origem/digest, inconsistência de versão e erro de consulta. A conclusão da execução indica quanto da publicação avançou e se uma reexecução pode apenas verificar ou se a equipe precisa resolver o estado parcial. Se surgir conflito ou concorrência após escrita, parar, preservar a evidência de cada referência e encaminhar a recuperação à pessoa mantenedora segundo a política aprovada. Reexecutar uma versão anterior já publicada mantém a referência de implantação vigente.

## Compatibilidade, disponibilização e reversão

Reconciliar o histórico recente e preparar a entrada da próxima versão antes de ativar a verificação obrigatória. O check de changelog da release roda antes de qualquer upload no processo de publicação, mesmo quando disparado depois do merge. Validadores e contratos entram no `Container CI` pré-merge. O fluxo deve preservar o comportamento de `outros` e da publicação manual em `main`.

Simular publicação inicial, não publicação, repetição íntegra, colisão e erro parcial antes de habilitar o contrato. Para versões anteriores sem prova persistida, registrar a evidência disponível e aplicar a política aprovada de compatibilidade, sem presumir que o digest visto na consulta é o original. Se a integração precisar ser revertida, restaurar a revisão anterior de workflow/validador via contribuição normal e manter changelog, inventário e registros já produzidos. Preservar tags Git, releases e tags GHCR versionadas. Quando um erro de publicação afetar aliases mutáveis, seguir o procedimento existente de restauração pelo digest capturado e verificar o resultado, com decisão da equipe de operação.

## Estratégia TDD e pirâmide de testes

### RED

- Unitário de changelog com versão exata, “Não publicado”, título de outra versão, versão apenas no corpo, prefixo que colide, cabeçalho repetido e arquivo de outro SHA.
- Contrato para PR automático, dispatch manual e `outros`, incluindo reexecução da mesma intenção depois de outra release. Reproduzir o caso de recálculo para evidenciar o problema atual.
- Integração simulada com tag simples e anotada, release correspondente, duas imagens corretas, imagem ausente, digest divergente com o mesmo rótulo de revisão, tag Git conflitante, consulta sem permissão, resposta de escrita ambígua e tentativa de reexecutar versão antiga após nova publicação. Capturar operações da simulação e falhar se alguma referência preexistente for sobrescrita.
- Validação editorial do changelog, inventário em escopo e tratamento de lacunas por amostra reproduzida de referências e revisão das exceções.

### GREEN

Introduzir a verificação do changelog no SHA selecionado e os validadores de identidade com clientes injetáveis ou respostas simuladas. Integrar as chamadas aos pontos de preparação, proteção e confirmação do workflow conforme o desenho aprovado. Confirmar que mudanças em versão ou digests provocam falha com diagnóstico e que reexecução da mesma versão aprova por leitura preservando a publicação vigente.

### REFACTOR

Reaproveitar resolução de versão e comparação de manifestos. Dar a cada consulta um contrato consistente sem repetir lógica de parsing em Bash e Python. Manter testes unitários e simulações de sequência de escritas no pré-merge e a inspeção editorial como evidência de aceitação do conteúdo.

## Esteira de qualidade

| Área | Comando local | Verificação de CI | Lacuna ou ação |
| --- | --- | --- | --- |
| Resolução manual simulada | `python .github/scripts/resolve_container_version.py --event workflow_dispatch --version 2.7.5 --ref refs/heads/main` | `Container Release / prepare`, após PR integrado em `main` ou dispatch | Adicionar identidade durável do par versão/SHA e simulações para reexecução de PR. |
| Manifesto | `python .github/scripts/validate_container_manifest.py .tmp/manifests/frontend-version.json --compare .tmp/manifests/frontend-candidate.json` com os arquivos da simulação | `Container Release / promote-version` e etapa de finalização | Conferir os quatro canais e o digest esperado também nas reexecuções. |
| Testes de contrato | `python -m pip install PyYAML==6.0.3` quando necessário, depois `python -m unittest discover -s .github/scripts/tests -p "test_*.py" -v`. Para foco, usar `test_container_release_workflow.py`, `test_resolve_container_version.py` ou `test_validate_container_manifest.py` como padrão `-p`. | `Container CI / Workflow contracts` em PR para `develop` aberto, sincronizado, reaberto, editado ou pronto, em `merge_group` e manual | Criar testes do changelog e do contrato completo das quatro consultas no diretório existente. O workflow atual roda actionlint explicitamente apenas em `container-ci.yml`. Estender o comando planejado a `container-release.yml` usando o instalador existente. |
| Consultas públicas ou autorizadas | Na etapa de inventário, `git ls-remote --tags origin`, `gh release view 2.7.5 --repo ifpebj-ti/lab-solos --json tagName,publishedAt,url` e `docker buildx imagetools inspect ghcr.io/ifpebj-ti/lab-solos-frontend:2.7.5` ilustram consultas de leitura. Executar para as refs exatas com a permissão aprovada. | `Container Release` já usa `gh release view` e `docker buildx imagetools inspect`. Os testes pré-merge simulam respostas. | Registrar resultados datados da conferência histórica, limitações de consulta e amostra independente. |

## Matriz de rastreabilidade

| Requisito | Componentes | Testes | Evidência esperada |
| --- | --- | --- | --- |
| RF-001 | `CHANGELOG.md` e fontes das três releases | Revisão editorial por versão e PR | Datas e links oficiais e itens conciliados |
| RF-002 | Inventário histórico e quatro canais | Conferência manual e reprodução de amostra | Matriz com referências brutas, associação e digests |
| RF-003 | Registro de lacunas e processo de aceite | Revisão de todas as ocorrências e comprovantes | Correção validada ou exceção aprovada |
| RF-004 | Preparação e validador de changelog | Unitário de parsing e contrato do SHA selecionado | Erro com versão em falta antes de qualquer escrita |
| RF-005 | Identidade da versão, Git, GitHub Release e GHCR | Integração simulada de primeira publicação, repetição e colisão | Quatro resultados associados à versão/SHA |
| RNF-001 | Inventário e roteiro de conferência | Repetição independente de amostra | Data UTC, fontes e digests disponíveis |
| RNF-002 | Validação de integridade e decisão de escrita | Contrato de ausência de escrita em publicação existente ou conflitante | Registro de operações e referências preservadas |
| CA-001 | Changelog, notas, diferenças e PRs | Conferência das três seções e de “Não publicado” | Mapeamento das entregas com fontes |
| CA-002 | Inventário histórico | Conferência amostral com e sem prefixo `v` | Quatro canais, datas, digests e ambiguidades explícitas |
| CA-003 | Tratamento de divergências históricas | Revisão de ausência, conflito e consulta inconclusiva | Resultado, justificativa e aprovação por ocorrência |
| CA-004 | Preparação pré-publicação | Simulações com entrada própria, outra versão ou “Não publicado” | Resumos de sucesso e falha antes da publicação |
| CA-005 | Verificador dos quatro canais | Simulações com quatro referências válidas, imagem ausente e conteúdo divergente | Diagnóstico por artefato e registro sem sobrescrita |
| CA-006 | Resolução durável e reúso | Simulações da mesma revisão, revisão conflitante e repetição após release posterior | Identidade e digests reproduzidos e referências preservadas |

## Alternativas e decisões

| Decisão | Alternativas e contrapartidas | Recomendação | Escolha confirmada | Consequências |
| --- | --- | --- | --- | --- |
| Intenção e versão em reexecuções | Buscar publicação existente pelo SHA evita estado novo, mas exige resolver ambiguidades e pode deixar uma publicação parcial sem mapeamento. Guardar a intenção de forma durável exige escrita controlada e permite recuperação confiável | Usar registro durável associado ao evento e ao SHA, com tratamento explícito de reexecução e tratamento de releases anteriores | Definida na [decisão local](../decisoes-de-planejamento.md#cobertura-análise-defensiva-e-releases) | Define como o fluxo evita recálculo de versão e recupera operações incompletas. |
| Prova de imagem | O rótulo OCI identifica a revisão declarada. Um registro confiável dos digests permite detectar substituição com o mesmo SHA e exige retenção compatível | Conservar os digests por módulo/plataforma junto do registro da publicação e comparar em reexecuções | Definida na [decisão local](../decisoes-de-planejamento.md#cobertura-análise-defensiva-e-releases) | Define a garantia de integridade, retenção e compatibilidade das versões antigas. |
| Ordem de confirmação | Preservar publicação estável como última escrita e então conferir por leitura reduz mudança operacional. A validação com tag Git explícita e GitHub Release em rascunho permite verificar antes de tornar a release estável, com mais estados e permissões | Manter a GitHub Release estável como ponto de disponibilização e confirmar os quatro artefatos sem reapontar refs, escolhendo a sequência de escrita após simular falha parcial | Definida na [decisão local](../decisoes-de-planejamento.md#cobertura-análise-defensiva-e-releases) | Define se existe rascunho intermediário, quem cria tag Git e como recuperar uma falha entre canais. |
| Convenção histórica | Associar pela grafia exata mantém distinções. Normalizar `v` para localizar candidatos aumenta cobertura e exige comprovar associação | Preservar a grafia de cada canal e documentar equivalência só com evidência de origem, deixando colisões visíveis | Diretriz definida, com pré-requisitos operacionais na [decisão local](../decisoes-de-planejamento.md#cobertura-análise-defensiva-e-releases) | Define critérios de associação de `v1.0.0` e demais candidatos e o formato do inventário. |
| Lacunas históricas | Correções com artefatos originais podem restabelecer consistência. Exceções evitam reconstrução sem fonte e precisam de aprovação | Priorizar o inventário e aprovar exceções quando a correção verificável e autorizada não for possível | Diretriz definida, com pré-requisitos operacionais na [decisão local](../decisoes-de-planejamento.md#cobertura-análise-defensiva-e-releases) | Define aprovador, evidência mínima, ações autorizadas e publicação do inventário. |

## Riscos e mitigação

- Recalcular SemVer na tentativa seguinte pode publicar duas versões para o mesmo SHA. Vincular versão persistida à intenção e testar repetição após publicação posterior.
- A publicação envolve serviços distintos e pode avançar parcialmente. Conferir permissões e precondições antes de escrever, serializar execuções, registrar o estado e permitir recuperação apenas de referências ausentes com origem comprovada.
- Uma reexecução antiga pode regredir `latest`. Validar versões já publicadas por leitura e simular as versões em sequência.
- Referências antigas com grafia semelhante e acesso limitado podem conduzir a associação incorreta. Preservar valores originais, consultas datadas, evidência de origem e classificação `não verificável` quando necessária.
- A entrada do changelog pode estar somente no checkout de trabalho. Testar e registrar a revisão integral efetivamente selecionada pela publicação.

## Perguntas abertas

- Consultar as [decisões de planejamento](../decisoes-de-planejamento.md#cobertura-análise-defensiva-e-releases).
- Confirmar autoridade de release, destino do inventário e acesso de leitura aos quatro canais para a conferência histórica. A execução remota fica fora desta etapa local.

Foram inspecionados changelog, workflow, scripts e testes no checkout local. A atribuição das entregas recentes, as referências históricas e as configurações dos serviços remotos ainda precisam das consultas de aceite. As verificações propostas permanecem condicionadas às decisões de design.
