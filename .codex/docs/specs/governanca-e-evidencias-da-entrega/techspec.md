# Especificação técnica — Governança e evidências da entrega

- **Status** Rascunho — validação de design pendente
- **PRD** [Governança e evidências da entrega](./prd.md)
- **Atualizado em** 2026-11-24
- **Validação de design** pendente para acesso do avaliador, responsáveis e publicação das evidências
- **Validação de descoberta** dispensada pelo usuário

## Resumo técnico

Atualizar os caminhos de consulta no README e nos materiais da entrega, usar o meio aprovado para o Project #41 privado, retirar saídas geradas do índice, distinguir os modelos de bug e melhoria e formalizar o canal de segurança e a revisão por área. A evidência de alertas e proteções precisa registrar consultas datadas, sua abrangência e a permissão usada. A coleta e a confirmação de acesso dependem de responsáveis autorizados.

## Estado atual

- O README aponta a interface implementada, o manual, o sistema publicado e os sprint reports. Em 2026-11-24, o usuário confirmou que o cliente aprovou o sistema em andamento e não há protótipo independente. O README também aponta o Project #41, identificado no PRD como privado; o acesso ao backlog ainda depende de autorização.
- `.github/ISSUE_TEMPLATE/melhoria.md` oferece um modelo geral para funcionalidade, correção ou melhoria. `CONTRIBUTING.md` descreve issue prévia ao PR, critérios verificáveis, referências e planejamento no Project. O checkout não apresenta arquivo de política `SECURITY.md` nem `CODEOWNERS` nas localizações usuais do repositório.
- `backend/.gitignore` já ignora `bin/` e `obj/`. O diagnóstico do PRD registra saídas versionadas em `backend/Tests`. A solução .NET 8 inclui `backend/Tests/Tests.csproj` e os comandos da CI restauram, compilam e testam a solução. A presença no disco de diretórios gerados e a regra de ignore não comprovam o estado do índice. A revisão de implementação deverá verificar o índice antes e depois da limpeza.
- `.github/scripts/sync_github_project.py` agrega Dependabot, verifica disponibilidade de code scanning e combina proteção clássica e rulesets de `develop` em um indicador. A automação atual não emite contagens de code scanning nem regra/check efetivo de cada branch. O workflow sincroniza o Project e depende de `PROJECT_TOKEN`. Sua execução não é necessária para coletar evidência de somente leitura.
- A documentação da primeira entrega registra inspeções anteriores, incluindo Dependabot e rulesets de `develop`. Serão usadas como referência de estrutura. As contagens e regras válidas para esta entrega precisam de nova consulta datada. A confirmação anterior de Nathan para Dependabot não atribui as demais consultas nem atesta o estado atual.

## Arquitetura proposta

Tratar os itens como mudanças pontuais de metadados Git e documentação e usar os comandos, rotinas e formatos atuais de validação. Nenhum componente de aplicação, serviço ou tabela entra na solução. O Project privado, o canal de segurança, o conjunto de responsáveis e o destino dos registros autorizados dependem das decisões abaixo. A referência ao sistema aprovado e seus seis fluxos foi confirmada pelo usuário.

### Fluxos e componentes

1. **Referência visual** — usar o sistema LabOn publicado, aprovado pelo cliente, e identificar os seis fluxos existentes na seção de telas do README. Não procurar ou alegar protótipo independente. A aprovação confirmada pelo usuário não representa uma nova sessão de navegação nem teste com perfil de avaliação.
2. **Backlog** — obter do responsável a aprovação do meio de consulta, recorte de dados, perfil e período de acesso adequados ao barema. Para cada item da amostra, conferir título ou identificador, prioridade, estado e vínculo verificável a requisito, PRD ou issue. Testar com a permissão do avaliador e publicar nos materiais de entrega o procedimento aprovado. Em caso de acesso negado ou recorte incompleto, registrar o que ficou indisponível e manter o aceite pendente.
3. **Artefatos gerados** — conferir no índice somente `backend/Tests/bin` e `backend/Tests/obj`. Retirar do índice os arquivos gerados que estiverem rastreados com remoção direcionada do índice, mantendo arquivos de código e `packages.lock.json`. Reutilizar as regras de ignore atuais se elas cobrirem todas as saídas. Repetir restauração, compilação e testes em checkout limpo e registrar o índice vazio nos dois caminhos, comportamento do ignore e estado pós-execução.
4. **Modelos de issue** — manter o padrão de contribuição, ajustar o modelo de melhoria e disponibilizar o modelo de bug no seletor. Ambos orientam contexto, objetivo, comportamento esperado e critérios verificáveis. O modelo de bug também orienta passos de reprodução ou observação atual. Ajustar a referência do README e do guia quando o fluxo de seleção mudar.
5. **Relatos de segurança e revisão** — registrar em `SECURITY.md` o canal privado testado e o que informar no relato inicial. Usar `.github/CODEOWNERS` como local proposto e preencher apenas áreas e identidades com aprovação e permissão verificadas. Com o canal aprovado, demonstrar o recebimento de um relato benigno. Com um `CODEOWNERS` disponível na base do teste, abrir um PR de teste que altera uma área acordada e conferir a solicitação de revisão.
6. **Coleta de evidências** — uma pessoa autorizada consulta Dependabot, code scanning, proteção clássica e regras efetivas para `main` e `develop`. Consolidar dados agregados num registro datado e aprovado, com as fontes reproduzíveis. Vincular os materiais da entrega ao registro segundo o perfil de acesso autorizado. As regras cadastradas localmente, os YAMLs e o indicador do Project servem para orientar a coleta. A situação efetiva vem das consultas autorizadas.

## Contratos e APIs

| Contrato | Campos e procedimento | Validação |
| --- | --- | --- |
| Referência do sistema | Link do sistema publicado e lista de seis fluxos confirmados | Conferência documental do README contra o mapa funcional já apresentado; sem alegar nova navegação de avaliação. |
| Backlog | Meio e procedimento aprovados, escopo, perfil, data, amostra com identificador, prioridade, estado e vínculo verificado | Perfil previsto navega o recorte com os campos necessários. Evidência registra bloqueio ou campo faltante. |
| Modelos | Metadados iniciais válidos sob `.github/ISSUE_TEMPLATE/`, nomes distintos, contexto, resultado esperado e critérios nos dois modelos. O modelo de bug também inclui reprodução ou comportamento observado | Teste editorial ou de contrato e conferência no seletor do GitHub. |
| Canal de segurança | `SECURITY.md`, instruções de envio privado, canal confirmado, expectativas de informação inicial e confirmação de recebimento | Relato benigno recebido privadamente e evidência sanitizada, com data e confirmação. |
| Responsáveis | Padrões de caminho e proprietários por área, colocados na ordem de precedência aplicável de `CODEOWNERS` | Checagem de padrões sobrepostos, permissão da identidade e atribuição observada em PR com o arquivo na branch-base. |
| Alertas | Fonte, horário e fuso, `ifpebj-ti/lab-solos`, estado, severidade aplicável, eventual filtro de branch ou ferramenta, permissão usada, abrangência da consulta, contagem e limitações | Contar alertas únicos após percorrer as páginas do escopo previamente declarado. Registrar a severidade segundo a semântica de cada fonte, incluindo itens sem classificação disponível. Só concluir zero com consulta completa e permissão suficiente. |
| Proteções | Fontes clássicas e rulesets efetivos por `main` e `develop`, regra e origem, aplicação efetiva, checks exigidos por nome e associação de origem quando disponível | Comparar configuração e regras efetivas, incluindo políticas organizacionais aplicáveis e modo de aplicação. Diferenciar check que roda de check exigido. Registrar bloqueio ou visibilidade parcial por fonte. |

Para alertas e regras, a forma da coleta pode ser manual em tela/API ou assistida por um validador que consome respostas sanitizadas. As fontes previstas incluem `repos/ifpebj-ti/lab-solos/dependabot/alerts`, `repos/ifpebj-ti/lab-solos/code-scanning/alerts`, `repos/ifpebj-ti/lab-solos/branches/<branch>/protection` e `repos/ifpebj-ti/lab-solos/rules/branches/<branch>`. Confirmar a abrangência de cada resposta. Se faltarem detalhes sobre origem e aplicação do ruleset, consultar a visualização autorizada de regras efetivas e registrar a parte ainda indisponível.

## Dados e migrações

O registro de evidência deve ser legível sem acesso a dados brutos. Cada entrada identifica fonte, escopo, data/hora e fuso, perfil funcional ou nível de permissão, filtros, resultado e estado `completo`, `parcial` ou `indisponível`. Uma resposta parcial pode registrar subtotais explicitamente identificados, com justificativa, mas a contagem de um escopo que não foi percorrido por inteiro fica indisponível. Para proteções, registrar separadamente as duas branches e as fontes consultadas. Para backlog, incluir só os campos e vínculos aprovados. O único ajuste no índice do repositório remove saídas geradas nos dois caminhos em escopo. Nenhuma migração de dados do produto é necessária.

## Segurança, privacidade e permissões

- Manter o Project #41 privado durante definição e validação do meio de consulta. Acesso direto demanda autorização explícita para qualquer dado visível ao perfil aprovado. Exportação filtrada exige teste de links e remoção de campos, itens e metadados fora do escopo permitido. Vínculos a fontes restritas precisam de alternativa aprovada quando forem necessários para o aceite.
- Identificar permissão de coleta pela função e pelo escopo, sem registrar credenciais, identificadores de tokens, detalhes privados de alertas ou dados pessoais desnecessários. Rapidez de consulta e acesso administrativo são independentes de permissão para compartilhar o resultado.
- Confirmar que a política de relato encaminha detalhes por canal privado. A evidência do teste registra somente entrega, data, confirmação, visibilidade e papel responsável. O procedimento não exige publicar um relato ou um achado.
- O perfil de revisão de `CODEOWNERS` deve ter a permissão necessária para a plataforma solicitar revisão. A escolha de responsáveis não muda regras de aprovação ou proteção de branches.

## Falhas, observabilidade e operação

Usar a causa observada para marcar link revogado, ausência de objeto, erro de permissão, autenticação expirada, consulta incompleta ou resultado com informação insuficiente. Uma consulta com erro de acesso ou paginação incompleta deve preservar o estado parcial ou indisponível, inclusive se a resposta apresentada estiver vazia. Se a proteção clássica estiver indisponível, registrar o acesso usado e as regras efetivas que puderem ser verificadas. O registro expõe a data do retrato e permite nova coleta quando a configuração mudar. Evidenciar separadamente a conta funcional usada para a conferência do avaliador e a permissão elevada usada para coletar segurança, quando forem distintas.

## Compatibilidade, disponibilização e reversão

Submeter mudanças de arquivos pelo fluxo atual de contribuição a `develop`. Conferir modelos e `CODEOWNERS` na interface pertinente, incluindo a branch-base do PR e a branch que fornece os modelos de issue. A presença do arquivo em outra branch não encerra o aceite. Antes de atualizar materiais de entrega, validar links, escopo autorizado e testes de acesso. Coordenar o README com a especificação de cobertura para evitar conflitos nas referências da entrega.

Se houver erro de modelo, atribuição de revisão ou instrução publicada, corrigir ou reverter o arquivo correspondente, conferir novamente o fluxo e preservar o registro datado da evidência anterior. Se um acesso deixar de atender ao recorte permitido, revogar a concessão ou retirar a cópia conforme o meio aprovado e registrar que o aceite voltou a ficar pendente. Corrigir ignore ou configuração de build mantendo os artefatos gerados fora do índice. Manter as proteções remotas como objeto de consulta nesta entrega.

## Estratégia TDD e pirâmide de testes

### RED

- Conferir que o README aponta para o sistema aprovado e lista os seis fluxos existentes. Para o backlog, tentar a amostra com o perfil autorizado e registrar procedimento indisponível, recorte incompleto ou acesso aprovado.
- Registrar a presença eventualmente confirmada no índice por meio da consulta direcionada. Aplicar contrato de checkout limpo que falha quando há saídas rastreadas ou quando um artefato gerado aparece como alteração versionável.
- Usar fixtures editoriais para ausência de modelo, campos necessários, padrão de caminho inválido e sobreposição em `CODEOWNERS`. Verificar seletor e solicitação de revisão na interface para comprovar integração com a plataforma.
- Se houver normalizador de evidências, usar fixtures de consulta completa e vazia, paginação incompleta, permissão negada, severidade ausente e combinação de proteção clássica e rulesets. Para coleta manual, aplicar o mesmo conjunto como roteiro com registros simulados para verificar a apresentação de zero, parcial e indisponível.

### GREEN

Implementar os metadados e documentação aprovados, remover entradas geradas do índice e validar checkout limpo. Registrar as consultas autorizadas, conferir documentalmente o sistema e os fluxos no README, validar o backlog com o perfil aprovado, realizar o relato benigno e demonstrar a atribuição de revisão. Acompanhar cada conferência com data, fonte e desfecho, deixando critérios pendentes quando a dependência externa permanecer.

### REFACTOR

Reaproveitar o formato de validação editorial existente e reunir informações comuns de consulta no registro para evitar duplicidade em README, guia e Wiki. Manter testes locais para contratos automatizáveis, testes de integração para checkout limpo e navegação para os aceites dependentes de permissões do GitHub. Repetir comandos e amostras após alterações de organização.

## Esteira de qualidade

| Área | Comando local ou procedimento | Verificação de CI | Lacuna ou ação |
| --- | --- | --- | --- |
| Restauração, compilação e testes | `dotnet restore backend/backend.sln --locked-mode`, `dotnet build backend/backend.sln --no-restore -c Release --nologo --disable-build-servers`, `docker info` e `dotnet test backend/backend.sln --no-build --no-restore -c Release --nologo --disable-build-servers` | `Container CI / Backend quality` em PR para `develop` aberto, sincronizado, reaberto, editado ou pronto, em `merge_group` e execução manual. O job ainda executa a seleção de integração e migrações diretamente em `backend/Tests/Tests.csproj`. | Repetir em checkout limpo com .NET 8.0.419 e Docker para testes de integração. |
| Índice e ignore | No checkout de validação, `git ls-files -- backend/Tests/bin backend/Tests/obj`, `git check-ignore --no-index -- backend/Tests/bin/arquivo-gerado.tmp backend/Tests/obj/arquivo-gerado.tmp` e `git status --porcelain=v1 --untracked-files=all -- backend/Tests/bin backend/Tests/obj` | Sem check direcionado identificado | Registrar lista vazia, ignore correspondente e estado após build/teste. Se for adotado contrato no workflow, verificar que novo arquivo rastreado causa falha. |
| Contrato editorial | `python -m unittest discover -s .github/scripts/tests -p "test_delivery_docs*.py" -v` e `python .github/scripts/check_delivery_docs.py --repository . --wiki ../lab-solos.wiki --manifest .codex/docs/specs/documentacao-primeira-entrega/documentacao.json --mode editorial` com a revisão da Wiki indicada no manifesto | `Documentation quality` em PR para `develop` aberto, sincronizado, reaberto ou pronto, em `merge_group` e execução manual | O contrato existente valida páginas e estruturas identificadas no manifesto. Incluir metadados editoriais da entrega apenas se fizerem parte do limite aprovado. Acesso e permissões exigem conferência no serviço. |
| Dependabot e code scanning | Na coleta autorizada, `gh api --paginate --slurp 'repos/ifpebj-ti/lab-solos/dependabot/alerts?per_page=100'` e `gh api --paginate --slurp 'repos/ifpebj-ti/lab-solos/code-scanning/alerts?per_page=100'`, com as consultas confinadas ao ambiente de coleta. Registrar filtros aplicados à origem ou aos dados e compartilhar somente agregados. | `project-metrics.yml` fornece indicadores auxiliares, enquanto `codeql-quality.yml` e Trivy produzem análises | Registrar consulta completa ou limitações, estados, severidades e nível de acesso. Os workflows existentes não provam as contagens da avaliação. |
| Proteções efetivas | Na coleta autorizada, `gh api repos/ifpebj-ti/lab-solos/rules/branches/develop` e `gh api repos/ifpebj-ti/lab-solos/branches/develop/protection`, repetidos para `main` e complementados pelas fontes efetivas a que o coletor tiver acesso | `.github/scripts/sync_github_project.py` já consulta a proteção clássica e rulesets de `develop` | Resumir as regras e checks com fonte, aplicação e permissão. A presença de jobs no YAML e o indicador booleano do Project não permitem inferir regras vigentes. |
| Aceites com perfil externo | Roteiro manual com backlog, seletor de issue, relato benigno e PR de revisão no serviço; referência ao sistema é documental | Sem automação equivalente identificada | Depende dos meios e responsáveis aprovados e do ambiente autorizado para validação. |

## Matriz de rastreabilidade

| Requisito | Componentes | Testes | Evidência esperada |
| --- | --- | --- | --- |
| RF-001 | README, link do sistema aprovado e seis fluxos | Conferência documental contra o mapa funcional apresentado | Link e nomes dos fluxos presentes; nenhuma sessão de protótipo alegada |
| RF-002 | Project #41 ou recorte autorizado e materiais da entrega | Consulta com perfil aprovado | Amostra de prioridade, estado e vínculos |
| RF-003 | Índice, ignore, solução e projeto .NET | Integração em checkout limpo | Comandos bem-sucedidos e índice sem saídas |
| RF-004 | Modelos bug/melhoria e guia de contribuição | Contrato editorial e seletor do GitHub | Seleção dos dois modelos e campos correspondentes |
| RF-005 | `SECURITY.md` e canal privado | Relato benigno em ambiente aprovado | Confirmação privada sanitizada |
| RF-006 | `.github/CODEOWNERS` e áreas acordadas | Contrato dos padrões e PR de teste | Solicitação de revisão esperada |
| RF-007 | Evidências de alertas e proteções | Conferência amostral reproduzida em fontes autorizadas | Registro datado com contagens, filtros, permissões, regras e checks das duas branches |
| RNF-001 | Recorte de acesso e registros agregados | Validação com perfil de avaliação e inspeção de sanitização | Campos aprovados visíveis e credenciais ausentes |
| RNF-002 | Contrato de evidência por fonte e abrangência | Casos completo, parcial e indisponível | Data, fonte, filtros, escopo, permissão e estado |
| CA-001 | Link na seção de telas | Abertura e percurso com o perfil previsto | Teste datado dos fluxos indicados |
| CA-002 | Backlog e procedimento aprovado | Verificação de prioridades, estados e vínculos por amostra | Acesso conferido no recorte autorizado |
| CA-003 | Registro de bloqueio ao backlog | Negativa de acesso e recorte incompleto | Evidência faltante e condição de aceite pendente |
| CA-004 | Índice, ignore e ferramenta .NET | Restauração, compilação e testes em checkout limpo | Estado limpo e arquivos ignorados nos dois caminhos |
| CA-005 | Seletor de issue e dois modelos | Validação de interface com checagem dos campos | Bug e melhoria selecionáveis e completos |
| CA-006 | Canal privado e instruções | Envio de relato benigno e recebimento | Confirmação privada com os detalhes reduzidos ao necessário |
| CA-007 | Responsáveis por áreas e PR de teste | Alterar área acordada e verificar atribuição | Solicitação de revisão da identidade confirmada |
| CA-008 | Fontes de alertas e proteções | Comparação amostral com acesso autorizado | Contagens e regras datadas conferíveis por branch e fonte |
| CA-009 | Evidência parcial ou indisponível | Simular falha de permissão ou consulta incompleta | Limitação explícita e contagem não afirmada quando inconclusiva |

## Alternativas e decisões

| Decisão | Alternativas e contrapartidas | Recomendação | Escolha confirmada | Consequências |
| --- | --- | --- | --- | --- |
| Acesso ao backlog | Acesso direto de leitura apresenta dados atualizados, mas pode revelar itens ou campos adicionais. O recorte datado controla exposição, mas exige atualização e validação de vínculos | Usar o acesso direto somente se o responsável confirmar que toda a visibilidade é autorizada. Usar recorte datado em canal aprovado se o barema aceitar e o acesso direto exceder o escopo. | Diretriz definida, com pré-requisitos operacionais na [decisão local](../decisoes-de-planejamento.md#pré-requisitos-operacionais) | Define perfil, recorte, duração, canal e procedimento do avaliador. |
| Referência visual | Protótipo independente exige link e perfil próprios; o sistema aprovado já demonstra a interface real | Usar o sistema LabOn publicado e identificar os seis fluxos principais, conforme esclarecimento do usuário em 2026-11-24. | Confirmada: sistema em andamento aprovado pelo cliente; protótipo independente inexistente | Atualizar README e registrar a decisão; não alegar teste de protótipo ou sessão de avaliação. |
| Canal privado e responsáveis | Relato privado do repositório, quando disponível e habilitado, centraliza o fluxo. Uma caixa institucional restrita pode atender com confirmação de acesso e tratamento | Usar canal institucional já operacional e confirmar destinatários. Aplicar proprietários por área com a equipe e revisar padrões sobrepostos. | Pendente | Condiciona conteúdo de `SECURITY.md`, `CODEOWNERS` e os aceites de integração. |
| Coleta e destino | Registro manual datado reduz a implantação inicial. Um coletor reproduzível com relatórios sanitizados facilita repetição e adiciona manutenção e controle de acesso | Coleta de leitura via GitHub CLI autenticado; versionar snapshots agregados sem identificadores em evidências da governança. | Confirmada nesta revisão; perfil de avaliação não validado sob dispensa explícita do usuário. Ver T009/T010. | Coletas registradas em `evidencias/T009.md` e `evidencias/T010.md`; retenção segue o histórico do repositório. Acesso externo permanece não verificado. |
| Limpeza do índice | Reusar regras de ignore atuais tem baixo impacto. Uma regra adicional só é necessária se a conferência achar saída elegível sem ignore | Reutilizar `backend/.gitignore` e retirar apenas saídas rastreadas dos dois diretórios. | Recorte confirmado no PRD | Comprovar o efeito em checkout limpo e manter arquivos de origem. |

## Riscos e mitigação

- Acesso restrito ou disponibilidade dos links pode mudar até a avaliação. Testar próximo à entrega e manter o procedimento verificável para o perfil aprovado.
- Uma exportação pode expor dados adicionais ou tornar vínculos inacessíveis. Revisar o recorte e a amostra completa de campos com o perfil do avaliador.
- Código local e regras configuradas podem divergir. Comparar fontes efetivas por branch, preservando limitação de consulta e filtros.
- Atribuição automática pode falhar por permissão ou precedência de padrões. Validar a identidade e o caminho real em PR cuja base já contenha o arquivo.
- Uma regra de ignore não remove entradas existentes no índice. Conferir índice, ignore e limpeza depois de gerar novamente as saídas.

## Pendências e dispensas

1. **Backlog e barema — dispensado para este aceite local.** O acesso do perfil, o recorte, o período, o canal e a aceitação pelo barema não foram confirmados. O usuário autorizou encerrar T006 sem os testes; não declarar acesso validado.
2. **Canal privado e responsáveis — pendente.** Ainda faltam canal privado confirmado, destinatários, áreas e identidades autorizadas para `SECURITY.md` e `CODEOWNERS`.
3. **Acesso às evidências — dispensado para este aceite local.** T009/T010 foram coletadas por sessão autenticada de leitura e registradas nos arquivos agregados. O perfil de avaliação não consultou esses arquivos; o usuário autorizou encerrar T011 sem esse teste.

A auditoria desta especificação foi local e documental. As coletas remotas de T009/T010 foram realizadas em 24/11/2026. A publicação não alterou permissões, rulesets, canais ou identidades. Acesso externo e os itens ainda pendentes permanecem descritos nas tarefas correspondentes.
