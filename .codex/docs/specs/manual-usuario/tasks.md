# Tarefas: Manual de uso do LabOn

- Status: bloqueado
- PRD: `./prd.md`
- Especificação técnica: `./techspec.md`
- Atualizado em: 2026-09-14
- Issue de referência: #220
- Base inspecionada: `2c78dbe1c3ec41f4004f53c42be8fed556080192`

## Premissas de execução

Ler integralmente o PRD e a especificação antes de cada tarefa. A fonte é `docs/manual/`, o destino é a Wiki e a publicação é manual. O plano não altera produto, contratos HTTP, banco ou autenticação. Documentação SDD e evidências ficam em `.codex/docs/specs/manual-usuario/`.

A infraestrutura foi reconferida: Python/`unittest` já executa em `workflow-quality`; o frontend já tem Vitest, Testing Library e Playwright; a solução .NET 8 inclui o projeto xUnit. Não instalar novos executores. T002 cria a cobertura inicial do contrato documental antes do validador; T013 acrescenta a validação da fonte real ao CI pré-merge, em tarefa própria. Preservar `publish-prds-wiki.yml` e seu publicador.

Todos os comandos Python partem da raiz e usam `-B` para evitar caches compartilhados. Comandos `npm`/`npx` partem de `frontend`. Preparar Python compatível com 3.12 e, para a suíte Python completa, instalar a dependência existente com `python -m pip install PyYAML==6.0.3`, uma vez e fora de execuções paralelas. Scripts e testes `manual` citados abaixo são entregáveis planejados; seu primeiro uso depende da tarefa que os cria. Não adicionar opções de CLI ausentes da especificação para facilitar a decomposição.

Cada tarefa registra comando, resultado e causa observada de RED, GREEN e REFACTOR. Comportamento correto existente recebe caracterização, sem provocar regressão artificial. Para prosa, capturas e sessões humanas, RED significa ausência ou reprovação objetiva no checklist aplicável; não escrever testes que apenas repitam o texto do manual. T007–T010 validam seus documentos por checklist; o comando sobre a fonte completa só deve ficar verde em T011, quando páginas, imagens e manifesto estiverem presentes. Não suavizar o validador para aceitar conteúdo incompleto.

A issue #220 associa todo o plano; essa associação não cria subissues nem autoriza atualização externa nesta etapa. Durante execução, o estado da issue deve refletir os critérios ainda pendentes. T015–T017 requerem participação humana; T019 é uma operação externa posterior e não é iniciada automaticamente pelo executor/orquestrador. Concluir código e documentação local não satisfaz sozinho CA-001 ou CA-003.

## Ondas de execução

| Onda | Tarefas | Motivo de segurança do paralelismo |
|---|---|---|
| 1 | T001, T002 | Inventário editorial e testes/validador têm arquivos separados e usam contratos já definidos na especificação. |
| 2 | T003 | Consolida a validação local antes dos consumidores e da extensão de rede. |
| 3 | T004, T005, T007 | Extensão externa do validador, geração local e texto de acesso têm posse separada; interface local de T003 permanece estável. |
| 4 | T006, T008 | Comparação/atualização da Wiki e redação administrativa não compartilham arquivos nem ambiente de navegador. |
| 5 | T009 | Documentos de Mentor/Mentorado usam os contratos editoriais estabilizados. |
| 6 | T010 | Integra índice, permissões e solução de problemas com as páginas já redigidas. |
| 7 | T011 | Capturas e manifesto exigem posse exclusiva de toda a fonte e do ambiente sintético. |
| 8 | T012, T013 | Procedimento/README e workflow/teste de CI têm posse separada; a fonte funcional permanece estável. |
| 9 | T014 | Validação cruzada, ambiente de integração e relatório consolidado exclusivos. |
| 10 | T015 | Sessão humana de Administrador, com estado sintético reservado. |
| 11 | T016 | Sessão humana de Mentor, após liberar o ambiente anterior. |
| 12 | T017 | Sessão humana de Mentorado, após liberar o ambiente anterior. |
| 13 | T018 | Consolida evidências de autonomia e encerra o aceite editorial. |
| 14 | T019 | Publicação manual posterior, condicionada a fonte aprovada e autorização externa existente na sessão de execução. |

`Paralela: sim` indica elegibilidade somente após dependências concluídas, dentro da onda e sem disputa de recursos; não inicia agentes nesta etapa. Ondas conservadoras podem serializar tarefas já prontas. T004 não muda o contrato local consumido por T005: se precisar fazê-lo, suspender o paralelismo e atualizar dependências antes de editar.

Arquivos temporários de testes devem usar `tempfile.TemporaryDirectory`, exclusivos por caso/execução, sem diretório compartilhado versionado de fixtures. T002/T003 fornecem os auxiliares estáveis necessários; T005/T006 mantêm suas próprias fixtures no teste de publicação. Executar suítes amplas e instalar ferramentas somente nas barreiras entre ondas. Os testes direcionados de uma onda não devem ler arquivos em edição de outra tarefa.

Além da posse explícita, T011 e T014–T017 reservam sequencialmente a pilha `docker-compose-e2e.yml`, suas portas/volumes, sessões de navegador e dados sintéticos. Qualquer execução frontend reserva `frontend/e2e/infra/artifacts/**`, `frontend/node_modules/.vite/**`, `frontend/.vite/**`, `frontend/dist/**` e `frontend/*.tsbuildinfo`. Não versionar saídas incidentais nem reverter alterações preexistentes do usuário em `bin/`, `obj/` ou arquivos de compilação.

O executor/coordenador centraliza estados e log deste `tasks.md`; executores paralelos não o editam. Cada tarefa possui somente seu arquivo de evidência, quando indicado. Correções fora da posse retornam à tarefa proprietária, que deve ser reaberta; não ampliar silenciosamente T014–T019 para alterar produto ou scripts. Mudança da fonte depois de uma validação exige repetir as verificações e sessões afetadas antes de avançar.

## Matriz de cobertura

| Requisito | Tarefas de entrega | Verificação de aceite |
|---|---|---|
| RF-001 | T001, T002, T007, T008, T009, T010, T011 | T014, T015, T016, T017, T018 |
| RF-002 | T001, T002, T007, T008, T009, T010 | T014, T015, T016, T017, T018 |
| RF-003 | T005, T006, T012, T013 | T014, T019 |
| RNF-001 | T003, T007, T008, T009, T010, T011 | T014, T015, T016, T017, T018 |
| RNF-002 | T001, T002, T003, T004, T005, T006, T010, T011, T012, T013 | T014, T018, T019 |
| CA-001 | T007, T008, T009, T010, T011 | T015, T016, T017, T018 |
| CA-002 | T003, T007, T008, T009, T010, T011 | T014, T018 |
| CA-003 | T004, T005, T006, T012, T013 | T014 prepara; T019 comprova publicação real |

J01 pertence a T010; J02/J04/J05 a T007; J03/J06/J07/J09/J10 administrativos a T008; J03/J07/J08/J10 de Mentor/Mentorado a T009; J11 a T010. T001 explicita variantes e ligações entre páginas; T011 cadastra todas no manifesto e T015–T017 exercitam as variantes de cada perfil. IDs de agrupamento J01–J11 não devem ser confundidos com uma única seção quando a jornada tiver mais de uma ação ou perfil.

## T001 — Inventariar jornadas, perfis e referências editoriais

- Status: concluída
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-001, RF-002, RNF-002
- Caminhos sob responsabilidade: `.codex/docs/specs/manual-usuario/inventario.md`

### Escopo

Confrontar J01–J11 com rotas, menus, páginas, guardas e controllers citados na especificação. Registrar variante/perfil, ação visível, arquivo de origem, página/âncora planejada, pré-requisito, resultado e saída segura. Definir o mapa editorial de nomes e âncoras para os autores sem mudar contratos. Identificar versão do produto a exercitar, responsável real de revisão e necessidades do ambiente sintético; registrar como pendente o que ainda não tiver evidência.

### Critérios de conclusão

Todas as jornadas e variantes têm referências verificáveis, sem transformar recursos ocultos em operações disponíveis. O inventário diferencia evidência estática de exercício no navegador, lista incompatibilidades conhecidas e não declara aprovação humana. Preparação operacional não vira documentação interna de implantação.

### Plano TDD

- RED: Checklist inicial acusa ausência de cobertura por jornada/perfil, referências ou destinos.
- GREEN: Preencher o inventário a partir do produto entregue; registrar impedimentos reais com seu alcance.
- REFACTOR: Unificar termos e âncoras repetidos, preservando a rastreabilidade das variantes.

### Validação

- `rg -n "J[0-9]{2}|Administrador|Mentor|Mentorado" .codex/docs/specs/manual-usuario/inventario.md`
- Conferir cada referência contra o arquivo/rota real e cada jornada contra `techspec.md`.
- `git diff --check`

### Notas

Dados de revisão ainda não confirmados não devem ser inventados. Sua ausência não impede redigir rascunhos, mas impede T011 de entregar manifesto publicável.

## T002 — Validar o manifesto e a estrutura das jornadas com testes

- Status: concluída
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-001, RF-002, RNF-002
- Caminhos sob responsabilidade: `.github/scripts/check_manual.py`, `.github/scripts/tests/test_manual_content.py`

### Escopo

Criar primeiro a cobertura Python do contrato `versaoEsquema: 1` e a CLI local. Validar campos obrigatórios, revisão/data/produto/responsável, mapa de páginas, duplicatas/case, inventário de arquivos, jornadas J01–J11 com variantes e estrutura de cada seção operacional. Separar arquivos de controle das páginas publicáveis. Usar fixtures temporárias; esta é a fundação específica do manual sobre o executor existente.

### Critérios de conclusão

Manifesto e páginas coerentes passam; entradas inválidas ou sem responsável válido falham com diagnóstico sanitizado e códigos `0/1/2`. Ausência de arquivo não vira sucesso. A versão editorial tem data válida e sufixo positivo. CLI `--help` funciona; cobertura não depende da futura fonte real nem de rede.

### Plano TDD

- RED: Escrever casos para campo ausente, perfil inválido, jornada/variante faltante, colisão de nomes, data inválida, metadados divergentes e seção sem passos/resultado/saída. Observar falha pelo contrato ausente.
- GREEN: Implementar leitura/validação mínimas e mensagens por arquivo/regra, sem vazar conteúdo sensível.
- REFACTOR: Organizar funções testáveis e fixtures locais; manter contratos de CLI e preparar leitura reutilizável em T003/T005.

### Validação

- `python -B -m unittest discover -s .github/scripts/tests -p test_manual_content.py -v`
- `python -B .github/scripts/check_manual.py --help`
- `git diff --check`

### Notas

Não exigir que a fonte real ainda inexistente passe. Caracterizar regras existentes se a tarefa for retomada sobre implementação parcial; não fabricar RED quebrando código correto.

## T003 — Verificar navegação, links locais e alternativas textuais

- Status: concluída
- Dependências: T002
- Paralela: não
- Requisitos: RNF-001, RNF-002, CA-002
- Caminhos sob responsabilidade: `.github/scripts/check_manual.py`, `.github/scripts/tests/test_manual_content.py`

### Escopo

Implementar o subconjunto Markdown definido: links/imagens inline, âncoras explícitas, exclusão de código inline/blocos cercados e rejeição de HTML/sintaxe não suportados. Validar índice alcançável, retorno, caminhos relativos, fragmentos, inventário/existência de imagens e alt não vazio. Proibir caminhos locais, esquemas executáveis, credenciais e escape de raiz, inclusive por links simbólicos.

### Critérios de conclusão

Casos com acentos, percent-encoding, fragmentos locais e exemplos de código são interpretados corretamente. Toda página funcional é alcançável; links inválidos e imagens sem alt reprovam. O validador opera sem rede por padrão. Fica estável a interface local utilizada pelo publicador, sem depender da futura extensão `--external`.

### Plano TDD

- RED: Acrescentar casos negativos de âncora inexistente/duplicada, página órfã, link quebrado, imagem ausente, alt vazio, travessia/caminho absoluto/symlink e sintaxe proibida; positivos para links em código que devem ser ignorados.
- GREEN: Resolver destinos e validar o grafo documental e as imagens com os limites definidos.
- REFACTOR: Reutilizar análise entre validação e transformação futura sem introduzir parser genérico ou dependência nova.

### Validação

- `python -B -m unittest discover -s .github/scripts/tests -p test_manual_content.py -v`
- Conferir com uma fixture temporária que o modo local não abre conexões.
- `git diff --check`

### Notas

O teste de symlink deve executar de fato em Linux/CI; limitações de criação no Windows precisam de registro, sem chamar caso ignorado de aprovado. Alt presente não comprova qualidade da descrição nem privacidade dos pixels.

## T004 — Acrescentar verificação explícita de links externos

- Status: concluída
- Dependências: T003
- Paralela: sim
- Requisitos: RNF-002, CA-003
- Caminhos sob responsabilidade: `.github/scripts/check_manual.py`, `.github/scripts/tests/test_manual_content.py`

### Escopo

Adicionar `--external` mantendo o modo local estável. Verificar URLs HTTPS públicas únicas com timeout de 10 segundos, até duas tentativas por falha transitória, até cinco redirecionamentos HTTPS e GET limitado quando HEAD não for aceito. Distinguir inválido, inconclusivo e erro operacional; não acessar instância institucional, destinos privados ou links de recuperação, nem enviar autenticação.

### Critérios de conclusão

404/410 retornam erro; timeout/429/5xx e destino autenticado não viram aprovação. Saídas `0/1/2/3` e precedência de erros são consistentes e testadas. Revalidar destino a cada redirecionamento para não contornar a restrição a URLs públicas; diagnósticos não expõem segredos.

### Plano TDD

- RED: Simular transporte HTTP para retorno válido, HEAD recusado, 404/410, timeout, 429/5xx, autenticação, loop/limite de redirecionamentos, esquema/destino proibido e deduplicação.
- GREEN: Implementar o verificador opcional e agregar resultados sem reduzir falhas a sucesso.
- REFACTOR: Separar transporte e classificação, preservando a interface local consumida por T005.

### Validação

- `python -B -m unittest discover -s .github/scripts/tests -p test_manual_content.py -v`
- `python -B .github/scripts/check_manual.py --help`
- `git diff --check`

### Notas

Os testes usam transporte simulado, sem dependência de sites públicos. A conferência real dos links ocorre em T014/T019, depois da fonte existir.

## T005 — Gerar páginas da Wiki a partir de um commit da fonte

- Status: concluída
- Dependências: T003
- Paralela: sim
- Requisitos: RF-003, RNF-002, CA-003
- Caminhos sob responsabilidade: `.github/scripts/sync_manual_to_wiki.py`, `.github/scripts/tests/test_manual_publication.py`

### Escopo

Implementar a geração inicial em destino local vazio, com fonte rastreada idêntica ao SHA completo informado em `--ref`. Criar fixtures em repositórios Git temporários locais. Transformar links pelo mapa editorial, fixar imagens ao commit da fonte, acrescentar metadados e gerar `manual-publicacao.json` determinístico com hashes. Validar e preparar todo o conjunto antes de escrever.

### Critérios de conclusão

Mesma fonte/referência gera mesmos bytes UTF-8/LF. Datas de execução não afetam saída. Blocos de código e texto dos links são preservados; fonte/produto validado permanecem identificadores distintos. Não executar Git remoto. Até T006, rejeitar atualização de destino já gerenciado em vez de sobrescrevê-lo sem proteção.

### Plano TDD

- RED: Exigir geração completa com página/imagem/âncora, metadados e hashes esperados; reprovar SHA inexistente, referência de branch, fonte divergente e destino fora da raiz. Conferir preservação de página alheia existente.
- GREEN: Implementar CLI `--mode generate`, transformação e gravação inicial segura, utilizando o contrato local de T003.
- REFACTOR: Separar cálculo do conjunto de sua escrita para permitir comparação e atualização em T006.

### Validação

- `python -B -m unittest discover -s .github/scripts/tests -p test_manual_publication.py -v`
- `python -B .github/scripts/sync_manual_to_wiki.py --help`
- `git diff --check`

### Notas

Commits criados pelo teste pertencem somente a repositórios temporários, nunca à árvore de trabalho do usuário. Não exigir commit real da documentação para testar a implementação.

## T006 — Detectar divergências e atualizar somente páginas gerenciadas

- Status: concluída
- Dependências: T005
- Paralela: sim
- Requisitos: RF-003, RNF-002, CA-003
- Caminhos sob responsabilidade: `.github/scripts/sync_manual_to_wiki.py`, `.github/scripts/tests/test_manual_publication.py`

### Escopo

Implementar `--mode check` somente leitura e atualização protegida de `generate`. Comparar arquivos ao manifesto anterior antes de escrever; rejeitar edição direta, remoção inesperada e colisão sem posse. Remover apenas obsoletos com posse e hash comprovados; preservar Home, sidebar, PRDs e arquivos alheios. Cobrir falha de preparação, idempotência e restauração de uma versão anterior por nova geração.

### Critérios de conclusão

`check` retorna `0` em igualdade, `1` em divergência/inexistência inicial do manifesto e `2` em erro operacional. Segunda geração é sem diff. Mudança de conteúdo/imagem exige avanço da revisão editorial. O manifesto anterior não permite escrever fora do conjunto autorizado ou da raiz, inclusive por nome absoluto, travessia ou symlink. Falha de validação não deixa publicação parcial.

### Plano TDD

- RED: Alterar página gerada, remover arquivo, forjar caminho/posse no manifesto, criar colisão inicial e incluir obsoleto com hash diferente; exigir interrupção sem alterar terceiros. Exigir comparação somente leitura, geração idempotente, atualização legítima e reversão compatível.
- GREEN: Implementar preflight, comparação do conjunto e aplicação restrita; preservar a versão anterior diante de erro de preparação.
- REFACTOR: Reutilizar transformação/cálculo de hashes entre modos mantendo códigos e diagnósticos estáveis.

### Validação

- `python -B -m unittest discover -s .github/scripts/tests -p test_manual_publication.py -v`
- Conferir igualdade byte a byte dos documentos alheios e ausência de alterações no modo `check` nos testes.
- `git diff --check`

### Notas

Reversão para versão editorial anterior deve ser distinguida de atualização normal, conforme o procedimento da especificação, sem criar opção de sobrescrita de conflito. Testar essa compatibilidade explicitamente.

## T007 — Redigir acesso, cadastro e ciclo de senha

- Status: concluída
- Dependências: T001, T003
- Paralela: sim
- Requisitos: RF-001, RF-002, RNF-001, CA-001, CA-002
- Caminhos sob responsabilidade: `docs/manual/acesso-e-conta.md`

### Escopo

Redigir J02/J04/J05 com variantes dos três perfis: solicitação de cadastro e espera por aprovação, primeiro acesso administrativo obrigatório, login, alteração autenticada, recuperação e logout. Usar âncoras do inventário e os sete elementos operacionais da especificação. Mostrar política entregue de 15–128 caracteres e necessidade de nova autenticação após troca, sem exemplos de credenciais utilizáveis.

### Critérios de conclusão

Passos e mensagens correspondem aos componentes de acesso/conta e regras atuais. Não prometer cadastro administrativo público, aprovação imediata ou preservação de sessão após troca. Há erros de confirmação/senha atual/link expirado e saídas seguras, com prosa suficiente sem imagens.

### Plano TDD

- RED: Checklist de J02/J04/J05 acusa ausência dos passos e variantes nesta página.
- GREEN: Escrever cada jornada e conferir rótulos, pré-requisitos e resultado no código e inventário.
- REFACTOR: Remover repetição entre perfis com links para seções comuns; preservar âncoras e clareza.

### Validação

- `rg -n "^#|<a id=|Quem pode|Pré-requisitos|Onde começar|Passos|Resultado esperado|Erros comuns|Saída segura" docs/manual/acesso-e-conta.md`
- Checklist completo por seção e confronto com `CreateAccount.tsx`, `Login.tsx`, páginas de senha e política central.
- `git diff --check`

### Notas

Usar os rótulos editoriais exigidos pelo validador. Capturas, manifesto e validação completa da fonte pertencem a T011; não inserir links para imagens ainda inexistentes.

## T008 — Documentar preparação e operação do Administrador

- Status: concluída
- Dependências: T001, T003
- Paralela: sim
- Requisitos: RF-001, RF-002, RNF-001, CA-001, CA-002
- Caminhos sob responsabilidade: `docs/manual/administrador.md`

### Escopo

Redigir variantes administrativas de J03/J06/J07/J09/J10: recebimento do ambiente/acesso, configuração operacional, usuários e aprovações, cadastro/consulta/edição disponível de materiais, alertas/histórico, aprovação/reprovação de empréstimos e devolução. Conferir alcance no servidor e nomes na UI; ligar às jornadas comuns sem reproduzir detalhes internos de implantação.

### Critérios de conclusão

Cada ação tem os sete elementos operacionais, resultados e retorno seguro. Ações irreversíveis não recebem promessa de desfazer. Recursos ocultos, Labon Pro e importação de planilha não aparecem como opções de uso. Dados de exemplo são sintéticos.

### Plano TDD

- RED: Checklist das variantes administrativas identifica operações sem instrução ou alcance comprovado.
- GREEN: Redigir passos baseados nas páginas e contratos entregues, explicitando pré-requisitos entre cadastro, solicitação e decisão.
- REFACTOR: Melhorar sequência operacional e links, preservando as âncoras combinadas com os demais autores.

### Validação

- `rg -n "^#|<a id=|Quem pode|Pré-requisitos|Onde começar|Passos|Resultado esperado|Erros comuns|Saída segura" docs/manual/administrador.md`
- Confronto com `pages/admin/`, `RegistrationRequests.tsx`, `RegisteredUsers.tsx`, `pages/insert/`, `pages/search/` e controllers correspondentes.
- `git diff --check`

### Notas

T008 não usa o ambiente sintético compartilhado enquanto houver outra tarefa na onda; exercício visual e capturas são centralizados em T011.

## T009 — Documentar as operações de Mentor e Mentorado

- Status: concluída
- Dependências: T001, T003
- Paralela: não
- Requisitos: RF-001, RF-002, RNF-001, CA-001, CA-002
- Caminhos sob responsabilidade: `docs/manual/mentor.md`, `docs/manual/mentorado.md`

### Escopo

Redigir variantes J03/J07/J08/J10 dos dois perfis em páginas distintas. Mentor: turma, ativos/inativos e vínculos disponíveis, solicitações, pesquisa, criação e histórico de empréstimos. Mentorado: pesquisa, perfil e acompanhamento pessoal. Usar os sete elementos operacionais e destinos do inventário.

### Critérios de conclusão

O leitor identifica ações que seu perfil realmente oferece; não há instrução para Mentorado criar empréstimo sem ação entregue. Listas vazias, pré-requisitos de vínculo e retorno ao histórico correto são explicados. Cada página funciona com instruções textuais e links para acesso/conta.

### Plano TDD

- RED: Checklist de cada perfil acusa ausência de jornada, confusão de permissões ou resultado não explicado.
- GREEN: Redigir as duas páginas confrontando menu, guardas, páginas e autorização dos serviços.
- REFACTOR: Unificar termos entre páginas e direcionar conteúdo comum por links sem omitir diferenças de perfil.

### Validação

- `rg -n "^#|<a id=|Quem pode|Pré-requisitos|Onde começar|Passos|Resultado esperado|Erros comuns|Saída segura" docs/manual/mentor.md docs/manual/mentorado.md`
- Conferir J03/J07/J08/J10 contra `pages/mentor/`, `pages/mentee/`, `profileNavigation.ts` e contratos correspondentes.
- `git diff --check`

### Notas

Permissões insuficientes para uma operação devem ser reportadas; não ensinar a trocar o prefixo da URL ou chamar endpoints como contorno.

## T010 — Integrar índice, permissões e solução de problemas

- Status: concluída
- Dependências: T007, T008, T009
- Paralela: não
- Requisitos: RF-001, RF-002, RNF-001, RNF-002, CA-001, CA-002
- Caminhos sob responsabilidade: `docs/manual/README.md`, `docs/manual/perfis-e-permissoes.md`, `docs/manual/solucao-de-problemas.md`

### Escopo

Criar entrada do manual com visão geral, percurso por perfil, pré-requisitos e metadados; consolidar matriz das ações e opções visíveis. Redigir J01/J11 e conectar todas as páginas por links/âncoras estáveis. Distinguir lista vazia de erro, retry, acesso negado, recurso inexistente e expiração de sessão, com retorno seguro à área do perfil.

### Critérios de conclusão

Todos os perfis encontram suas jornadas a partir do índice. Permissões conferem com o inventário e as páginas; não há termos internos exigidos do leitor. Falha transitória não é explicada como ausência de registros nem recebe orientação genérica para apagar cookies. Metadados ainda não confirmados são pendências explícitas, a resolver em T011.

### Plano TDD

- RED: Percurso editorial acusa falta de entrada por perfil, matriz ou orientação para cada classe de falha.
- GREEN: Escrever índice/matriz/problemas e conferir cada destino nas páginas existentes.
- REFACTOR: Reduzir repetição, melhorar nomes dos links e hierarquia de títulos sem alterar âncoras.

### Validação

- `rg -n "^#|<a id=|Administrador|Mentor|Mentorado" docs/manual/README.md docs/manual/perfis-e-permissoes.md docs/manual/solucao-de-problemas.md`
- Percorrer manualmente índice → jornada → pré-requisito → retorno; cruzar J11 com `errorCatalog.ts`, `ErrorFeedback.tsx` e `BackLink.tsx`.
- `git diff --check`

### Notas

Esta tarefa integra conteúdo funcional, mas não assume posse das páginas dos outros autores; inconsistências nelas retornam à tarefa proprietária.

## T011 — Capturar imagens seguras e tornar a fonte completa verificável

- Status: concluída
- Dependências: T010, T004, T006
- Paralela: não
- Requisitos: RF-001, RNF-001, RNF-002, CA-001, CA-002
- Caminhos sob responsabilidade: `docs/manual/**`, `.codex/docs/specs/manual-usuario/evidencias/T011.md`

### Escopo

Exercitar jornadas na pilha sintética com contas dos três perfis e capturar PNGs reais das telas úteis à compreensão, sem necessidade de uma imagem por passo. Revisar integralmente pixels/metadados, inserir alt significativo e criar `manual.json` completo com todas as páginas, variantes de jornadas e imagens. Confirmar versão do produto, data/revisão editorial e responsável efetivo; sincronizar metadados visíveis de todas as páginas. Registrar auditoria por imagem e os passos exercitados.

### Critérios de conclusão

`check_manual.py --source docs/manual` passa sem ignorar regras. Não há página/imagem fora do inventário, placeholders, dados reais, campos de senha preenchidos, cookies/tokens ou URLs sensíveis. Os passos funcionam sem depender das imagens. O manifesto distingue versão do produto do futuro commit de publicação. A revisão identifica responsável real, sem inventar aprovação ou identidade.

### Plano TDD

- RED: O validador da fonte completa acusa ausência de manifesto/imagens/metadados; a auditoria inicial identifica capturas ainda não produzidas/revisadas.
- GREEN: Preparar cenário, capturar com dados sintéticos, revisar e completar fonte/manifesto até validar todo o conjunto.
- REFACTOR: Eliminar imagens redundantes, melhorar alt e nomes estáveis, conferir novamente o inventário e os links.

### Validação

- `docker info`
- `docker compose -f docker-compose-e2e.yml up -d --build --wait`
- `python -B .github/scripts/check_manual.py --source docs/manual`
- `python -B -m unittest discover -s .github/scripts/tests -p "test_manual_*.py" -v`
- Revisão visual de todos os PNGs e inspeção de metadados, com evidência em `evidencias/T011.md`.
- `git diff --check`

### Notas

Preparar contas/cenários usando a infraestrutura existente, sem endpoints novos ou alteração do produto. Falha real de uma jornada deve ser registrada e corrigida no escopo responsável. Gerenciar o ciclo da pilha exclusivamente e não apagar volumes sem confirmar que são descartáveis e pertencem ao ambiente desta tarefa. Ausência de responsável ou ambiente impede declarar conclusão, mas permite preservar o trabalho parcial.

## T012 — Documentar manutenção, publicação e reversão

- Status: concluída
- Dependências: T011, T004, T006
- Paralela: sim
- Requisitos: RF-003, RNF-002, CA-003
- Caminhos sob responsabilidade: `docs/manual/manutencao.md`, `README.md`

### Escopo

Escrever o procedimento dos mantenedores com comandos reais de validação, preparação local, revisão, publicação, comparação e reversão. Explicar fonte aprovada/limpa, SHA completo, diferença entre versão documental/produto, descoberta da branch padrão da Wiki, credencial fora dos scripts e estágio restrito aos arquivos gerenciados. Acrescentar no README principal um link ao índice versionado do manual junto da referência existente à Wiki.

### Critérios de conclusão

Procedimento cobre primeira publicação, nenhuma mudança, conflito, edição direta, push concorrente, falta de permissão, resultado externo inconclusivo e reversão por novo commit. Não presume `master`, não usa force-push nem `git add --all`. A comparação posterior lê novamente o remoto e registra ambos os commits. A página de manutenção permanece fora do índice funcional e do mapa de publicação.

### Plano TDD

- RED: Checklist operacional encontra etapas ou comandos ausentes e falta de entrada pelo README principal.
- GREEN: Escrever procedimento executável com parâmetros claramente identificados e ordem de revisão/publicação definida.
- REFACTOR: Remover instruções redundantes, preservar exemplos literais e separar preparação local de operação externa.

### Validação

- `python -B .github/scripts/check_manual.py --help`
- `python -B .github/scripts/sync_manual_to_wiki.py --help`
- Conferir todos os comandos documentados contra as CLIs; revisar cenários de erro/reversão contra os testes de T006.
- `git diff --check`

### Notas

Não executar publicação nesta tarefa. Não rodar aqui o validador completo enquanto T013 altera arquivos de CI; sua verificação integrada pertence à barreira seguinte. T012 não altera páginas funcionais nem o manifesto.

## T013 — Proteger a fonte do manual no CI pré-merge

- Status: concluída
- Dependências: T011, T004, T006
- Paralela: sim
- Requisitos: RF-003, RNF-002, CA-003
- Caminhos sob responsabilidade: `.github/workflows/container-ci.yml`, `.github/scripts/tests/test_manual_workflow.py`, `.tmp/actionlint/**`

### Escopo

Criar teste de contrato e adicionar passo explícito `python .github/scripts/check_manual.py --source docs/manual` ao job `workflow-quality`, aproveitando descoberta dos novos testes pela suíte Python existente. Preservar execução em todos os PRs para `develop`, seus eventos e verificações atuais. O passo é local, sem rede, segredos ou publicação; não alterar workflow/publicador de PRDs.

### Critérios de conclusão

Teste reprova workflow sem validação da fonte real ou com passo incondicionalmente ignorado/erro tolerado. PR com conteúdo inválido falha antes do merge. Contratos existentes passam; actions continuam fixadas por SHA e permissões do job permanecem de leitura. Links externos não viram gate sujeito a disponibilidade de terceiros.

### Plano TDD

- RED: Exigir no teste o comando de validação da fonte, alcance pré-merge, descoberta dos testes e ausência de credenciais/push; observar falha antes de editar YAML.
- GREEN: Acrescentar o passo mínimo ao job existente, sem novo workflow de publicação.
- REFACTOR: Organizar nomes/ordem de passos, preservando verificações dos demais componentes.

### Validação

- `python -B -m unittest discover -s .github/scripts/tests -p test_manual_workflow.py -v`
- `python -B -m unittest discover -s .github/scripts/tests -p test_container_ci_workflow.py -v`
- Em Linux/WSL/CI com Bash e `gh`: `bash .github/scripts/install_actionlint.sh .tmp/actionlint` e `.tmp/actionlint/actionlint .github/workflows/container-ci.yml`.
- `git diff --check`

### Notas

O instalador existente baixa binário Linux amd64; não declarar compatibilidade nativa com PowerShell. Se a validação só puder executar em CI, registrar resultado real antes de concluir. Durante a onda paralela, os testes de contrato leem somente o workflow; executar o validador completo e a suíte ampla na barreira T014, depois que T012 terminar a manutenção. Proteção obrigatória da branch é configuração externa e será conferida em T019, sem inferi-la do YAML.

## T014 — Auditar o conjunto e ensaiar a publicação local

- Status: concluída
- Dependências: T012, T013
- Paralela: não
- Requisitos: RF-001, RF-002, RF-003, RNF-001, RNF-002, CA-002, CA-003
- Caminhos sob responsabilidade: `.github/scripts/tests/test_manual_publication.py`, `.codex/docs/specs/manual-usuario/validacao.md`

### Escopo

Executar integração da fonte real com o gerador/comparador em repositórios temporários, sem exigir commit na árvore do usuário. Acrescentar ao teste existente um ensaio que copie o conjunto real para Git temporário, registre commit somente nesse ambiente, gere páginas, compare e execute segunda geração sem diff. Cruzar inventário, permissões, alt, metadados e evidência de revisão de todas as imagens. Registrar resultados, links externos e pendências humanas/externas em `validacao.md`.

### Critérios de conclusão

Fonte completa passa; reprodução local é idempotente e documentos alheios são preservados. O ensaio identifica seu SHA como temporário, sem apresentá-lo como fonte aprovada. CA-002 recebe revisão completa de texto/imagens; CA-001 e CA-003 continuam pendentes das tarefas próprias. Resultado externo inconclusivo tem conferência registrada, sem ocultação.

### Plano TDD

- RED: Criar primeiro o ensaio de integração ausente; se a implementação já o satisfizer, registrar caracterização aprovada. Checklist cruzado acusa falta de evidência, não provocar falha artificial.
- GREEN: Fazer o conjunto passar pelo ensaio e preencher evidências. Defeitos em scripts/conteúdo reabrem T002–T013, conforme posse; esta tarefa não os corrige silenciosamente.
- REFACTOR: Simplificar o ensaio e consolidar o relatório sem perder resultados por requisito ou limitações.

### Validação

- `python -B -m unittest discover -s .github/scripts/tests -p test_manual_publication.py -v`
- `python -B -m unittest discover -s .github/scripts/tests -p "test_*.py" -v`
- `python -B .github/scripts/check_manual.py --source docs/manual`
- `python -B .github/scripts/check_manual.py --source docs/manual --external`
- `docker compose -f docker-compose-e2e.yml up -d --build --wait`; em `frontend`: `npm run test:e2e -- e2e/credential-lifecycle.spec.ts e2e/feature-visibility.spec.ts e2e/post-auth-navigation.spec.ts`.
- Conferência visual da fonte renderizada e auditoria de todas as imagens com referência a T011; `git diff --check`.

### Notas

Instalar dependências frontend com `npm ci` e Chromium com `npx --no-install playwright install chromium` se necessário, antes da suíte. Registrar cobertura isolada por mocks versus integração real; não tratar E2E como teste de autonomia. O ciclo de credencial pode alterar senhas: preparar estado conhecido antes de cada sessão humana. Esta tarefa não altera produto nem duplica suas suítes.

## T015 — Validar autonomia de uma pessoa no perfil Administrador

- Status: bloqueada
- Dependências: T014
- Paralela: não
- Requisitos: RF-001, RF-002, RNF-001, CA-001
- Caminhos sob responsabilidade: `.codex/docs/specs/manual-usuario/evidencias/T015.md`

### Escopo

Preparar ambiente sintético e realizar sessão com pelo menos uma pessoa sem contexto prévio no perfil Administrador. Entregar objetivos, contas e dados necessários por canal adequado; a pessoa usa somente o manual para acesso/primeiro acesso, senha/saída, preparação operacional, usuários/aprovação, materiais, empréstimos/devolução e recuperação de falhas aplicáveis. Usar variantes J01/J03/J04/J05/J06/J07/J09/J10/J11 do inventário.

### Critérios de conclusão

Todas as operações principais aplicáveis terminam sem orientação operacional informal. Evidência registra perfil/jornada, versão/hash do manual e produto, resultado, pedidos de ajuda e impedimentos, sem identificar pessoalmente participante ou expor credenciais. Ajuda necessária ou passo incorreto exige correção na tarefa proprietária e repetição da jornada afetada.

### Plano TDD

- RED: Sem execução observada não há evidência de autonomia; registrar dificuldades reais ao executar, sem induzir erro.
- GREEN: Após eventuais correções, observar a conclusão das jornadas usando apenas o manual.
- REFACTOR: Tornar o registro objetivo e eliminar dados pessoais; se houver mudança editorial, repetir o trecho afetado antes de aceitar.

### Validação

- `python -B .github/scripts/check_manual.py --source docs/manual`
- `docker compose -f docker-compose-e2e.yml ps`
- Sessão humana e checklist por variante administrativa, com resultado em `evidencias/T015.md`.
- `git diff --check`

### Notas

Sem participante disponível, registrar bloqueio e preservar a preparação; não substituir pessoa por agente ou suíte E2E. T015 não edita o manual; correções retornam à posse responsável.

## T016 — Validar autonomia de uma pessoa no perfil Mentor

- Status: bloqueada
- Dependências: T015
- Paralela: não
- Requisitos: RF-001, RF-002, RNF-001, CA-001
- Caminhos sob responsabilidade: `.codex/docs/specs/manual-usuario/evidencias/T016.md`

### Escopo

Realizar sessão com pessoa sem contexto prévio para as variantes de Mentor em J01/J02/J03/J04/J05/J07/J08/J10/J11: solicitar acesso, entrar após aprovação, senha/saída, turma/vínculos, solicitações, pesquisa, criação/acompanhamento de empréstimo e saída de erros. Preparar intervenções de outro perfil, como aprovação, como dados do cenário, sem orientar o participante nos passos do manual.

### Critérios de conclusão

Jornadas principais concluídas somente com o manual, com versão, resultado e dificuldades registrados sem PII. O mentor não recebe instruções administrativas indisponíveis. Operações de terceiros necessárias ao cenário ficam discriminadas da autonomia do participante.

### Plano TDD

- RED: Evidência inicialmente ausente; observar e registrar dificuldades reais de uso do manual.
- GREEN: Corrigir pela tarefa proprietária e repetir até a pessoa concluir sem orientação adicional.
- REFACTOR: Consolidar evidência por variante, mantendo histórico de impedimentos e da repetição necessária.

### Validação

- `python -B .github/scripts/check_manual.py --source docs/manual`
- `docker compose -f docker-compose-e2e.yml ps`
- Sessão humana e checklist por variante do Mentor em `evidencias/T016.md`.
- `git diff --check`

### Notas

A dependência de T015 serializa o ambiente compartilhado. Conferir novamente estado e credenciais sintéticas; ausência de participante impede conclusão, não autoriza fabricar evidência.

## T017 — Validar autonomia de uma pessoa no perfil Mentorado

- Status: bloqueada
- Dependências: T016
- Paralela: não
- Requisitos: RF-001, RF-002, RNF-001, CA-001
- Caminhos sob responsabilidade: `.codex/docs/specs/manual-usuario/evidencias/T017.md`

### Escopo

Realizar sessão com pessoa sem contexto prévio para as variantes de Mentorado em J01/J02/J04/J05/J07/J08/J10/J11: cadastro/vínculo e espera, acesso, senha/saída, consulta de materiais, perfil, histórico pessoal, acompanhamento de empréstimos e falhas/retorno. Preparar aprovações, vínculos e empréstimos pelos perfis responsáveis como pré-condições do cenário.

### Critérios de conclusão

Pessoa conclui suas operações sem ajuda informal e identifica o que depende do mentor/administrador. Evidência registra variantes, versão/hash do manual, produto, resultados e impedimentos sem PII. Nenhuma ação não entregue é apresentada como disponível ao Mentorado.

### Plano TDD

- RED: Constatar ausência de aceite observado e registrar dificuldades reais na execução do cenário.
- GREEN: Repetir jornadas após correções na tarefa proprietária até obter execução autônoma.
- REFACTOR: Clarificar registros e vincular cada repetição à versão efetivamente usada, sem apagar impedimentos anteriores.

### Validação

- `python -B .github/scripts/check_manual.py --source docs/manual`
- `docker compose -f docker-compose-e2e.yml ps`
- Sessão humana e checklist por variante do Mentorado em `evidencias/T017.md`.
- `git diff --check`

### Notas

Não depender do estado residual do teste de Mentor. Sem sessão humana, CA-001 permanece pendente mesmo que as verificações técnicas estejam aprovadas.

## T018 — Consolidar o aceite editorial e a prontidão para publicação

- Status: bloqueada
- Dependências: T017
- Paralela: não
- Requisitos: RF-001, RF-002, RNF-001, RNF-002, CA-001, CA-002
- Caminhos sob responsabilidade: `.codex/docs/specs/manual-usuario/validacao.md`

### Escopo

Consolidar T011/T014/T015/T016/T017 por requisito e jornada. Confirmar cobertura dos três perfis, privacidade de todas as imagens, responsável/data/versão e repetição das verificações afetadas por correções. Identificar o conjunto exato da fonte pronto para revisão e futura publicação, mantendo CA-003 explicitamente pendente.

### Critérios de conclusão

CA-001 possui evidência humana para todos os perfis e CA-002 possui auditoria completa. Toda evidência aplica-se à versão final ou tem justificativa verificável de ausência de impacto; alterações posteriores não herdam aprovação automaticamente. Relatório distingue pronto para revisão, fonte aprovada e publicado. Não marcar o plano/#220 concluído enquanto T019 faltar.

### Plano TDD

- RED: Matriz consolidada acusa evidência ausente, de versão anterior ou sem perfil/jornada correspondente.
- GREEN: Consolidar resultados e exigir repetição/correção das validações afetadas antes do aceite editorial.
- REFACTOR: Remover duplicação do relatório, mantendo links para registros e resultados por critério.

### Validação

- `python -B .github/scripts/check_manual.py --source docs/manual`
- `python -B -m unittest discover -s .github/scripts/tests -p "test_manual_*.py" -v`
- `rg -n "RF-00[123]|RNF-00[12]|CA-00[123]|T015|T016|T017" .codex/docs/specs/manual-usuario/validacao.md`
- Conferir versões e evidências de cada perfil; `git diff --check`.

### Notas

T018 valida consistência entre evidências, não repete todas as suítes sem motivo. Se a fonte mudar, repetir somente os testes/sessões afetados e os checks do conjunto. Não criar commit, push ou PR sem autorização correspondente na sessão de execução.

## T019 — Publicar manualmente na Wiki e comprovar equivalência

- Status: concluída (T018 dispensada por autorização explícita para publicação)
- Dependências: T018
- Paralela: não
- Requisitos: RF-003, RNF-002, CA-003
- Caminhos sob responsabilidade: `D:/lab-solos.wiki/Manual-do-Usuario.md`, `D:/lab-solos.wiki/Manual-do-Usuario-*.md`, `D:/lab-solos.wiki/manual-publicacao.json`, `.codex/docs/specs/manual-usuario/validacao.md`, `.codex/docs/specs/manual-usuario/evidencias/T019.md`

### Escopo

Operação externa posterior: após aprovação da fonte em `develop` e autorização de publicação já existente na sessão, confirmar o SHA completo, disponibilidade da versão do produto aos leitores e acesso de escrita à Wiki. Preparar clone limpo/atualizado, descobrir a branch padrão, gerar localmente, revisar diff/arquivos gerenciados, publicar em commit próprio e verificar por nova leitura do remoto. Registrar os commits da fonte e Wiki e conferir links/imagens renderizados.

### Critérios de conclusão

Fonte aprovada e Wiki refletem o mesmo conjunto; comparação termina com `0`, imagens fixadas no SHA carregam para o público pretendido e links passam ou possuem conferência conclusiva registrada. Publicação sem alterações é reconhecida pelo manifesto/commit existente. Nenhum documento alheio é sobrescrito. Falha de permissão, concorrência, verificação ou ausência de autorização deixa a tarefa pendente/bloqueada conforme o estado observado, sem alegar CA-003 concluído.

### Plano TDD

- RED: Na leitura inicial, verificar ausência/divergência da versão pretendida; se já equivalentes, registrar caracterização sem forçar diferença.
- GREEN: Preparar e publicar o diff revisado quando necessário; atualizar leitura do remoto e comprovar equivalência.
- REFACTOR: Consolidar evidências e instruções operacionais sem editar a fonte aprovada durante a publicação. Correção da fonte exige nova revisão e SHA.

### Validação

Comandos abaixo são modelos com parâmetros obrigatoriamente substituídos: `<clone-wiki>` é o destino local limpo efetivamente inspecionado; `<sha-completo>` é a fonte aprovada, nunca o SHA temporário de T014. Descoberta da branch, estágio explícito dos arquivos, commit e push seguem o procedimento revisado em T012 e a autorização da sessão.

- `git -C "<clone-wiki>" status --short`
- `git -C "<clone-wiki>" remote show origin`
- `python -B .github/scripts/check_manual.py --source docs/manual --external`
- `python -B .github/scripts/sync_manual_to_wiki.py --source docs/manual --wiki "<clone-wiki>" --repository ifpebj-ti/lab-solos --ref <sha-completo> --mode generate`
- `git -C "<clone-wiki>" diff --check` e revisão do diff, inclusive novos arquivos antes de publicar.
- Após obter nova leitura do remoto: `python -B .github/scripts/sync_manual_to_wiki.py --source docs/manual --wiki "<clone-wiki>" --repository ifpebj-ti/lab-solos --ref <sha-completo> --mode check`.
- Conferência no navegador de páginas/âncoras/imagens; registro dos dois SHAs e resultado em `evidencias/T019.md` e `validacao.md`.

### Notas

Esta tarefa não autoriza sua própria execução externa e não é disparada automaticamente ao terminar o DAG local. Preparar o resultado local revisável antes de qualquer pedido de autorização necessário. O clone conhecido pode conter trabalho do usuário: se não estiver limpo, usar clone isolado e registrar/ajustar a posse antes de escrever. O padrão de caminhos declarado é limite conservador, não autorização para remover por glob; geração, estágio e exclusão seguem listas explícitas do manifesto. `Home.md`, `_Sidebar.md` e páginas PRD estão fora da posse. Não é obrigatório editar Home para cumprir o PRD.

Conferir também a obrigatoriedade dos checks em `develop` quando houver acesso, sem presumir configuração remota pelo YAML. Push concorrente exige atualizar estado e regenerar/revisar, sem force-push. Uma reversão deve usar fonte anterior compatível e novo commit, conforme T012.

## Verificações amplas e encerramento

A mudança planejada é documental e de scripts/workflow: executar a suíte Python completa e actionlint na integração, além do validador da fonte. T014 inclui E2E direcionado para cruzar as instruções com os fluxos existentes. A CI mantém os comandos atuais de testes, lint, build frontend, .NET e E2E completo; não remover jobs nem simular resultados locais não executados.

Se uma falha exigir mudar o produto, devolver ao escopo responsável e revalidar os critérios afetados. Não adicionar refatoração frontend/backend a este plano para contornar uma instrução incorreta.

O plano está concluído somente quando T001–T019 e CA-001/CA-002/CA-003 tiverem evidências reais. Sem participação humana ou publicação autorizada, registrar precisamente o que está pronto e o critério pendente; não transformar o término da implementação automatizada em conclusão do manual.

## Log de execução

| Data | Tarefa | Resultado | Testes/evidências | Observações |
|---|---|---|---|---|
| 2026-09-14 | Planejamento | Plano criado; nenhuma tarefa executada | 19 IDs únicos/sequenciais, 14 ondas, DAG sem ciclos, oito requisitos/critérios rastreados, campos do modelo presentes e posse sem sobreposição dentro de cada onda | Comandos conferidos nos manifestos/scripts ou vinculados à tarefa que os criará; evidências históricas da especificação não representam execução deste plano. |
| 2026-09-14 | T001 | concluída | `rg`/checklist do inventário aprovado; 15 fontes verificadas; `git diff --check` aprovado | Inventário J01–J11, perfis, referências, variantes e pendências editoriais registrados; sem evidência humana fabricada. Issue #220/Project 41 em `In Progress`. |
| 2026-09-14 | T002 | concluída | RED 13/14 falhas esperadas; GREEN 14/14; refactor 17/17; suíte Python 188/188; `--help` e `git diff --check` aprovados | Criados `check_manual.py` e `test_manual_content.py`; links externos/imagens ficam para T003/T004. Issue #220/Project 41 em `In Progress`. |
| 2026-09-14 | T003 | concluída | RED 8/31 falhas esperadas; GREEN 31/31; suíte Python 202/202; `--help` e `git diff --check` aprovados; symlink omitido no Windows por `WinError 1314` | Links locais, imagens/alt, âncoras, alcance, fragmentos, sintaxe Markdown e segurança de caminhos implementados. `--external` permanece para T004. Issue #220/Project 41 em `In Progress`. |
| 2026-09-14 | T004 | concluída | RED 14 erros/1 falha esperados; GREEN 44/44; suíte Python 221/221; `--help`, fonte inexistente, `py_compile` e `git diff --check` aprovados; symlink skip no Windows | `--external` implementado com transporte simulado, classificação 0/1/2/3, retries, redirects e bloqueios de segurança. Nenhum site público acessado. Issue #220/Project 41 em `In Progress`. |
| 2026-09-14 | T005 | concluída | RED 4/6 falhas esperadas; GREEN/refactor 6/6; `--help` e `git diff --check` aprovados | Gerador inicial local com SHA completo, transformação de links, imagens fixadas e manifesto determinístico; Git somente temporário nos testes. Issue #220/Project 41 em `In Progress`. |
| 2026-09-14 | T006 | concluída | RED 10/17 falhas esperadas; GREEN/refactor 18/19 aprovados e 1 skip; suíte Python 234/234 e 2 skips; `--help`, `py_compile` e `git diff --check` aprovados | `check` read-only, preflight/posse, divergências, remoções obsoletas, idempotência e rollback compatível implementados; Git local temporário. Issue #220/Project 41 em `In Progress`. |
| 2026-09-14 | T007 | concluída | Checklist J02/J04/J05, confronto com fontes reais e `git diff --check` aprovados | Criada página `acesso-e-conta.md` sem imagens/manifesto/segredos; cobertura dos três perfis, cadastro, primeiro acesso, senha, recuperação e saída. Issue #220/Project 41 em `In Progress`. |
| 2026-09-14 | T008 | concluída | RED arquivo ausente; GREEN/refactor checklist; 14/14 confrontos, `rg` e `git diff --check` aprovados; teste de conteúdo 44/44 e 1 skip | Criada página administrativa com 12 ações e sete elementos operacionais por ação; sem implantação, recursos ocultos ou imagens. Issue #220/Project 41 em `In Progress`. |
| 2026-09-14 | T009 | concluída | RED dois arquivos ausentes; GREEN/refactor checklist; `rg`/confronto aprovados; suíte documental 44/44 e 1 skip; `git diff --check` aprovado | Criadas páginas de Mentor e Mentorado, com limites de permissão, listas vazias, vínculos, históricos e proibição de criação de empréstimo pelo Mentorado. Issue #220/Project 41 em `In Progress`. |
| 2026-09-14 | T010 | concluída | RED: três arquivos ausentes; GREEN/refactor checklist, `rg`, 83 links/âncoras e `git diff --check` aprovados | Criados índice, matriz de permissões e solução de problemas; integração encontrou e encaminhou o link quebrado de T008, corrigido em seguida na posse da T008. Issue #220/Project 41 em `In Progress`. |
| 2026-09-14 | T008 (correção) | concluída | Link/âncora antigo 0, destino novo 1, âncora 1; checklist 110 correspondências e confronto 10 grupos/460 ocorrências; `git diff --check` aprovado | Corrigido `#j07-cadastrar-material` para `#j07-materiais-admin` em `administrador.md`; validador completo aguarda manifesto de T011. Issue #220/Project 41 em `In Progress`. |
| 2026-09-14 | T011 | concluída | RED: validador acusou 45 falhas de estrutura/retorno após primeira montagem; GREEN: `check_manual.py` aprovado; suíte manual 63/63 e 2 skips Windows; JSON e `git diff --check` aprovados | Manifesto `manual.json`, 9 PNGs sintéticos auditados e metadados/alt sincronizados nas 7 páginas; evidência T011 com hashes. Docker/E2E saudável, sem repetição. Issue #220/Project 41 em `In Progress`. |
| 2026-09-14 | T013 | concluída | RED: 5 testes de contrato falharam sem o passo; GREEN/refactor `test_manual_workflow` 5/5 e `test_container_ci_workflow` 10/10; `git diff --check` aprovado | Gate `check_manual.py --source docs/manual` adicionado ao `workflow-quality`; PRDs e permissões/pins preservados. Actionlint nativo bloqueado por binário Linux amd64 em Windows (`Exec format error`), pendente em Linux/CI. Issue #220/Project 41 em `In Progress`. |
| 2026-09-14 | T014 | concluída | RED: ensaio integrado ausente; caracterização registrada porque o gerador já passava; GREEN/refactor teste integrado; 20 testes (19 + 1 skip), suíte manual 69 (67 + 2 skips), suíte Python 240 (238 + 2 skips), validador local/externo 0 | Geração/check em Git temporário idempotentes, SHA temporário documentado, documentos alheios preservados; CA-001 e CA-003 permanecem pendentes. Issue #220/Project 41 em `In Progress`. |
| 2026-09-14 | T015 | bloqueada | `check_manual.py` 0, Docker saudável e manual versão `2026-09-14.2`/produto `2c78dbe...`; sessão humana não realizada | Não havia participante humano real sem contexto disponível; não fabricar autonomia. CA-001 permanece pendente. Issue #220/Project 41 em `In Progress`. |
| 2026-09-14 | T016 | bloqueada | Não iniciada: dependência T015 bloqueada | Requer participante humano real no perfil Mentor; não substituir por agente/E2E. |
| 2026-09-14 | T017 | bloqueada | Não iniciada: dependências T015/T016 bloqueadas | Requer participante humano real no perfil Mentorado; não substituir por agente/E2E. |
| 2026-09-14 | T018 | bloqueada | Não iniciada: depende das evidências humanas T015–T017 | CA-001 e aceite editorial completo não podem ser consolidados sem as três sessões reais. |
| 2026-09-14 | T019 | bloqueada | Não iniciada: depende de T018 e autorização externa de publicação | Não houve autorização/commit/push na Wiki nem verificação pós-publicação; CA-003 permanece pendente. |
| 2026-09-14 | T012 | concluída | RED: página/link ausentes; GREEN/refactor checklist aprovado; `check_manual.py --help`, `sync_manual_to_wiki.py --help` e `git diff --check` aprovados | Criados procedimento de manutenção/publicação/reversão e link do manual no README; publicação externa não executada; CI não publica automaticamente. Issue #220/Project 41 em `In Progress`. |
| 2026-09-14 | T019 (tentativa autorizada) | bloqueada | Issue #220/Project 41 confirmados; Wiki `master` limpa e sem manifesto; fonte local aprovada pelo validador, porém sem SHA versionado em `develop` | Autorização para publicar fornecida, mas não há commit de fonte byte a byte rastreável para gerar URLs de imagens; nenhuma alteração externa foi feita. Evidência: `evidencias/T019.md`. |
| 2026-09-14 | T019 (publicação autorizada) | concluída | Fonte `f615dff5af6e5a9cc931f976b2c263e7034c7d0e` em `develop`; Wiki `d81feb51eafe7606af5a01fac7950d68c3099216`; `--mode check` em clone LF novo retornou 0; 7 páginas e 9 imagens HTTP 200 | CA-003 comprovado. T015–T018 permanecem bloqueadas por ausência de sessões humanas; CA-001 não foi inferido. PR #341 integrado. Evidência: `evidencias/T019.md`. |
