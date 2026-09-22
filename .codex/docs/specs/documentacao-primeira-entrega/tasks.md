# Tarefas: Documentação da primeira entrega

- Status: concluída
- PRD: `./prd.md`
- Especificação técnica: `./techspec.md`
- Atualizado em: 2026-09-21

## Convenções e condições de execução

Ler PRD e especificação antes de cada tarefa. `S` significa `.codex/docs/specs/documentacao-primeira-entrega` e `W` significa `../lab-solos.wiki`; são abreviações de caminhos nesta documentação, não variáveis de shell. Comandos partem da raiz da aplicação. Cada tarefa possui também `S/evidencias/<ID>.md`, exclusivamente seu. Registrar verificações, resultados e pendências sem dados sensíveis.

Docker foi validado após reinicialização: servidor 29.8.0/Linux, Compose 5.5.1 e execução bem-sucedida de `docker run --rm hello-world`. SDK 8.0.419 confirmado. Não repetir instalação. Isso não comprova os roteiros do LabOn. Frontend já possui Vitest/Playwright; solução backend inclui testes; criar somente a infraestrutura documental ausente.

Há alterações preexistentes em `backend/Tests/bin` e `backend/Tests/obj`: preservá-las, sem incluí-las incidentalmente em commits. Não modificar código funcional para fazer um roteiro documental passar.

O coordenador mantém este `tasks.md` e sincroniza o estado das issues; executores escrevem apenas seus arquivos/evidências. As issues #352, #353, #355 e #356 são as referências de entrega; não criar duplicatas automaticamente. Confirmar critérios individualmente. Uma tarefa de preparação concluída não encerra sua issue.

Comandos do novo validador e seus testes são planejados e passam a existir nas tarefas indicadas. Revisões semânticas e humanas não são substituídas por testes de presença de frases. Operações Git externas seguem a autorização da sessão e o fluxo da skill; este plano não constitui publicação, push ou encerramento de issues.

## Ondas de execução

| Onda | Tarefas | Motivo de segurança do paralelismo |
|---|---|---|
| 1 | T001 | Inventário e delimitação das fontes antes das edições. |
| 2 | T002 | Revisão ampla de exemplos exige posse exclusiva dos documentos. |
| 3 | T003, T004, T005, T006 | Validador, arquitetura, operação e visão possuem arquivos distintos. |
| 4 | T007, T008, T009 | Extensão do validador, dados e segurança não compartilham arquivos. |
| 5 | T010, T011 | Índice/manifesto e infraestrutura CI são independentes; CI é testada com dados sintéticos. |
| 6 | T012 | Roteiro operacional exclusivo, incluindo ajustes no guia. |
| 7 | T013 | Backup/restauração após instalação comprovada. |
| 8 | T014 | Confirmações humanas registradas separadamente da automação. |
| 9 | T015 | Fixação da revisão candidata e validação cruzada. |
| 10 | T016 | Publicação coordenada e aceite da entrega. |

As ondas são limites conservadores: só iniciar a próxima após a anterior. `Paralela: sim` indica elegibilidade dentro da onda, após dependências concluídas, e não autoriza iniciar subagentes por si só. Nenhuma tarefa da mesma onda pode editar arquivos gerados de outra. Publicadores automáticos da Wiki devem ser coordenados nas ondas finais.

## T001 — Inventariar fontes, versões e itens sobrepostos

- Status: concluída
- Dependências: nenhuma
- Paralela: não
- Requisitos: RF-008, RNF-002, CA-012
- Issue: #352, #353, #355, #356
- Caminhos sob responsabilidade: `S/inventario.md`, `S/evidencias/T001.md`

### Escopo

Registrar SHAs dos dois repositórios, arquivos canônicos e gerados, estado local e critérios das quatro issues. Consultar #30, referências anteriores e rascunhos de arquitetura, classes, dados e infraestrutura no Project 41. Registrar reaproveitamento, equivalência ou ausência de artefato sem declarar reconciliação remota inexistente. Identificar versão de imagem e ambiente isolado disponíveis para os testes futuros.

### Critérios de conclusão

Inventário cobre cada entregável, aponta fonte e responsável e delimita a revisão de exemplos da T002. Limitações de acesso são explícitas. Não exportar valores suspeitos. Se houver página de arquitetura equivalente, registrar a escolha e atualizar os caminhos das tarefas afetadas antes de agendá-las.

### Plano TDD

- RED: conferir a ausência de inventário e de correspondência dos itens citados nas issues; não inventar falha funcional.
- GREEN: documentar as correspondências verificadas e pendências.
- REFACTOR: eliminar entradas duplicadas mantendo referências.

### Validação

- `git status --short`; `git rev-parse HEAD`; `git -C ../lab-solos.wiki rev-parse HEAD`.
- `gh issue view 30 --json number,title,body,comments,url`; `gh project item-list 41 --owner ifpebj-ti --format json --limit 100` (paginar/completar consulta se necessário).
- Revisão manual: quatro issues e todos os rascunhos citados têm destino registrado.

## T002 — Sanear exemplos e preparar revisão reservada

- Status: concluída
- Dependências: T001
- Paralela: não
- Requisitos: RF-007, RNF-001, CA-010, CA-011
- Issue: #356
- Caminhos sob responsabilidade: `W/*.md`, `docs/manual/**`, `security/**`, `infra/oci/*.md`, `infra/oci/*.example`, `backend/LabSolos-Server-DotNet8/Data/Migrations/README.md`, exemplos versionados identificados em T001, `S/evidencias/T002.md`

### Escopo

Revisar materiais atuais e substituir credenciais reais por placeholders ou exemplos sintéticos. Documentar provisionamento sem compartilhar segredos. Alterar fontes de páginas geradas, nunca somente a cópia publicada. Antes de editar exemplos adicionais, enumerar seus caminhos exatos no inventário; nenhuma alteração de configuração executável ou `.env` privado pertence a esta tarefa.

### Critérios de conclusão

Materiais revisados sem valores reais; evidência pública não contém valores, identidades ou detalhes exploráveis. Encaminhar a pendência operacional a Nathan por meio da conversa, sem enviar mensagens externas. CA-010 permanece pendente até T014.

### Plano TDD

- RED: inspeção reservada identifica inconsistência ou exemplo sem classificação; registrar somente regra/localização, sem reproduzir conteúdo.
- GREEN: corrigir exemplos e instruções nas fontes.
- REFACTOR: uniformizar placeholders sem retirar instruções necessárias.

### Validação

- `git diff --check`; `git -C ../lab-solos.wiki diff --check`.
- `python .github/scripts/check_manual.py --source docs/manual`, se o manual foi alterado; seguir seu contrato de publicação existente.
- Revisão reservada do conjunto delimitado em T001. Não imprimir diff bruto antes de garantir sua sanitização.

## T003 — Criar validador editorial com testes de contrato

- Status: concluída
- Dependências: T002
- Paralela: sim
- Requisitos: RF-008, RNF-001, RNF-002, RNF-003, CA-012
- Issue: #352, #355; infraestrutura compartilhada
- Caminhos sob responsabilidade: `.github/scripts/check_delivery_docs.py`, `.github/scripts/tests/test_delivery_docs.py`, `.github/scripts/tests/fixtures/delivery_docs/**`, `S/evidencias/T003.md`

### Escopo

Criar infraestrutura Python/unittest para contrato do manifesto e modo `editorial` da especificação. Validar páginas, metadados, links locais/Wiki e Git, fragmentos, nomes codificados e limites de caminhos. Usar biblioteca padrão, repositórios temporários sintéticos e códigos 0/1/2. Não executar scripts da Wiki. Não depender do manifesto real, produzido em T010.

### Critérios de conclusão

Testes passam com casos válidos e inválidos, incluindo SHA inexistente, travessia de caminhos e mensagens sanitizadas; verificação é somente leitura. Regras de exemplos suspeitos não afirmam ausência garantida de credenciais reais.

### Plano TDD

- RED: escrever primeiro teste de página obrigatória ausente e observar falha; adicionar link quebrado, fragmento, acento/parênteses, manifesto inválido e conteúdo sensível sintético.
- GREEN: implementar os contratos mínimos até todos os testes passarem.
- REFACTOR: separar leitura, resolução e diagnóstico; repetir testes.

### Validação

- `python -m unittest discover -s .github/scripts/tests -p "test_delivery_docs.py" -v` (criado nesta tarefa).
- `python .github/scripts/check_delivery_docs.py --help` (criado nesta tarefa).
- `git diff --check`.

## T004 — Documentar componentes e decisões da arquitetura

- Status: concluída
- Dependências: T002
- Paralela: sim
- Requisitos: RF-001, RNF-002, RNF-003, CA-001
- Issue: #352
- Caminhos sob responsabilidade: `W/Arquitetura-e-Modelagem-de-Dados.md`, `S/evidencias/T004.md`

### Escopo

Criar ou reaproveitar a página definida em T001. Descrever navegador, Nginx/frontend, API, PostgreSQL, Caddy, SMTP e atualização por release; diferenciar desenvolvimento e produção. Incluir Mermaid e texto equivalente, responsabilidades e decisões rastreadas ao código por SHA.

### Critérios de conclusão

Componentes/fluxos correspondem às fontes; `/health` e `/api/System/health` não são confundidos; não há capacidades futuras apresentadas como implementadas. Reservar seção de dados para T008, sem afirmar sua conclusão.

### Plano TDD

- RED: comparação entre documentos atuais e componentes identifica a lacuna de visão consolidada.
- GREEN: publicar localmente diagrama, texto e referências verificadas.
- REFACTOR: simplificar diagrama sem perder fronteiras e explicações.

### Validação

- `git -C ../lab-solos.wiki diff --check`.
- Conferência lado a lado com `Caddyfile`, Compose, `Program.cs`, `BaseApi.tsx` e scripts OCI; prévia visual Mermaid.

## T005 — Revisar configuração, execução e operação

- Status: concluída
- Dependências: T002
- Paralela: sim
- Requisitos: RF-003, RF-004, RF-007, RNF-001, CA-003, CA-004, CA-005, CA-006
- Issue: #353
- Caminhos sob responsabilidade: `W/Guia-de-Execução-e-Configuração-com-Docker-e-Docker-Compose.md`, `infra/oci/README.md`, `backend/LabSolos-Server-DotNet8/Data/Migrations/README.md`, `S/evidencias/T005.md`

### Escopo

Separar dev/prod; documentar todas as variáveis e blocos sintéticos canônicos identificáveis. Conferir seed, JWT, SMTP, portas, imagens e persistência. Escrever comandos concretos de inicialização, diagnóstico, atualização, backup/restauração, encerramento e descarte restrito ao teste. Declarar shell e evitar conversão textual de dump binário. Vincular procedimentos canônicos, sem duplicação divergente.

### Critérios de conclusão

Roteiros completos e exemplos de ambos os ambientes aceitos pelo Compose com variáveis isoladas. Ausência de `LABON_IMAGE_VERSION` falha; distinguir validação estrutural da operacional. CA-004 e CA-006 aguardam execução em T012/T013.

### Plano TDD

- RED: registrar comandos obsoletos/variáveis omitidas; testar exemplo sintético negativo sem versão de imagem.
- GREEN: corrigir instruções e preencher exemplos fictícios válidos.
- REFACTOR: remover repetição e instruções globais de limpeza, preservando avisos de perda de dados.

### Validação

- Extrair manualmente blocos sintéticos para arquivos temporários; em processo sem variáveis de interpolação herdadas, executar `docker compose --env-file <arquivo-sintetico> -f docker-compose-dev.yml config --quiet` e equivalente com `docker-compose-prod.yml`. O argumento entre sinais representa o arquivo temporário criado, não um caminho literal.
- `git diff --check`; `git -C ../lab-solos.wiki diff --check`.
- Conferir diferenças de banco vazio/legado e limite do rollback com os scripts existentes.

## T006 — Atualizar visão e análise de concorrência

- Status: concluída
- Dependências: T002
- Paralela: sim
- Requisitos: RF-005, RNF-002, CA-007
- Issue: #355
- Caminhos sob responsabilidade: `W/Documento-de-visão-e-Requisitos.md`, `W/Análise-de-concorrência.md`, `S/evidencias/T006.md`

### Escopo

Atualizar equipe/data e preservar histórico. Conferir afirmações sobre LabOn no código. Pesquisar fontes oficiais dos concorrentes, registrar URL e data de consulta, distinguir funcionalidade atual/proposta e remover afirmações sem sustentação.

### Critérios de conclusão

Cada comparação factual tem fonte verificável e contexto; visão corresponde à equipe e escopo atuais. Não inventar métricas ou capacidades dos concorrentes.

### Plano TDD

- RED: revisão identifica afirmações sem fonte/data ou informação histórica apresentada como atual.
- GREEN: atualizar e citar evidências verificadas.
- REFACTOR: reduzir duplicação e tornar limites explícitos.

### Validação

- `git -C ../lab-solos.wiki diff --check`.
- Abrir cada fonte citada e registrar conferência; revisar matriz de afirmações e datas. Busca na internet é parte desta tarefa.

## T007 — Validar exemplos Compose e sanitização de subprocessos

- Status: concluída
- Dependências: T003, T005
- Paralela: sim
- Requisitos: RF-003, RNF-001, CA-003, CA-005
- Issue: #353; infraestrutura compartilhada
- Caminhos sob responsabilidade: `.github/scripts/check_delivery_docs.py`, `.github/scripts/tests/test_delivery_docs.py`, `.github/scripts/tests/fixtures/delivery_docs/**`, `S/evidencias/T007.md`

### Escopo

Implementar modo `compose`: extrair blocos por seção, conferir variáveis, executar por lista de argumentos sem shell, isolar ambiente de interpolação e limpar temporários. Classificar Docker ausente como código 2 e exemplo inválido como 1; não imprimir stderr bruto.

### Critérios de conclusão

Testes demonstram que valores do processo não sobrescrevem exemplos; falhas não vazam conteúdo. Dois exemplos reais passam e caso sem versão falha. Usar manifesto temporário sintético compatível até T010.

### Plano TDD

- RED: testes de seleção de bloco, variável ausente, ambiente herdado e subprocesso com texto sensível sintético falham antes da implementação.
- GREEN: implementar extração e execução segura; provar caso negativo real do Compose.
- REFACTOR: separar extração e execução, repetindo testes focados.

### Validação

- `python -m unittest discover -s .github/scripts/tests -p "test_delivery_docs.py" -v`.
- Executar o modo `compose` com manifesto temporário contendo os caminhos reais e SHAs existentes; documentar comando exato na evidência. Não requer manifesto definitivo.

## T008 — Completar DER e dicionário físico

- Status: concluída
- Dependências: T004
- Paralela: sim
- Requisitos: RF-002, RNF-002, RNF-003, CA-002
- Issue: #352
- Caminhos sob responsabilidade: `W/Arquitetura-e-Modelagem-de-Dados.md`, `S/evidencias/T008.md`

### Escopo

Completar a página com DER e dicionário das sete tabelas do snapshot, discriminadores, campos, tipos, nulabilidade, PK/FK, cardinalidades, regras de exclusão e fontes. Distinguir classe C# de tabela física e histórico EF de domínio.

### Critérios de conclusão

Modelo confere com contexto, modelos e snapshot; relações opcionais e herança são explícitas. Campos de credenciais são descritos sem valores reais; explicações textuais acompanham Mermaid.

### Plano TDD

- RED: revisão da seção de dados detecta ausência de cobertura das tabelas/relações.
- GREEN: preencher DER e dicionário com matriz de conferência.
- REFACTOR: padronizar nomes e legendas sem alterar semântica.

### Validação

- `git -C ../lab-solos.wiki diff --check`.
- Conferir cada entidade e FK contra `AppDbContextModelSnapshot.cs`; prévia visual e revisão de nulabilidade/discriminadores.

## T009 — Atualizar ameaças e controles de segurança

- Status: concluída
- Dependências: T004, T005, T006
- Paralela: sim
- Requisitos: RF-006, RNF-002, CA-008, CA-009
- Issue: #355
- Caminhos sob responsabilidade: `W/Modelagem-de-Ameaça.md`, `W/Guia-de-Boas-Práticas-de-Desenvolvimento-Seguro.md`, `S/evidencias/T009.md`

### Escopo

Revisar ativos, atores, fluxos e fronteiras com base na arquitetura. Criar matriz controle/estado/justificativa/responsável/evidência; classificar implementado, planejado ou não aplicável. Atualizar processo seguro com a CI atual.

### Critérios de conclusão

Controles implementados têm evidência; planos não são garantias atuais. Registrar Dependabot como pendente de confirmação de Nathan até T014, sem reabrir remediações concluídas.

### Plano TDD

- RED: revisão encontra medidas sem estado ou evidência e fronteiras incompletas.
- GREEN: classificar controles e alinhar fluxos/documentos.
- REFACTOR: vincular a fonte canônica em vez de duplicar procedimentos.

### Validação

- `git -C ../lab-solos.wiki diff --check`.
- Conferência dos controles com fontes de autenticação, autorização, Compose e workflows; checklist CA-008 completo, CA-009 pendente.

## T010 — Integrar índice e manifesto documental

- Status: concluída
- Dependências: T006, T007, T008, T009
- Paralela: sim
- Requisitos: RF-008, RNF-002, RNF-003, CA-011, CA-012
- Issue: todas
- Caminhos sob responsabilidade: `W/Home.md`, `S/documentacao.json`, `S/evidencias/T010.md`

### Escopo

Integrar links preservando seções existentes; criar manifesto versão 1 conforme contrato validado, com páginas, seções, IDs e pares seção/Compose. Fixar referência da aplicação e referência-base existente da Wiki; indicar na evidência que o conteúdo local ainda aguarda commit candidato definitivo em T015. Não declarar essa referência-base como a revisão final.

### Critérios de conclusão

Todos os entregáveis alcançáveis localmente, manifesto aceito, correspondência com as quatro issues e páginas existentes preservadas. T015 é responsável por fixar o candidato final e verificar acesso remoto.

### Plano TDD

- RED: validador aponta manifesto/links obrigatórios ausentes antes das correções.
- GREEN: criar manifesto e completar navegação.
- REFACTOR: eliminar links duplicados sem alterar URLs públicas existentes.

### Validação

- `python .github/scripts/check_delivery_docs.py --repository . --wiki ../lab-solos.wiki --manifest .codex/docs/specs/documentacao-primeira-entrega/documentacao.json --mode editorial`.
- Mesmo comando com `--mode compose`.
- Prévia de `Home.md` e `git -C ../lab-solos.wiki diff --check`.

## T011 — Implantar verificação documental pré-merge

- Status: concluída
- Dependências: T007
- Paralela: sim
- Requisitos: RF-008, RNF-001, RNF-002, CA-003, CA-012
- Issue: todas; infraestrutura de CI
- Caminhos sob responsabilidade: `.github/workflows/documentation-quality.yml`, `.github/scripts/tests/test_delivery_docs_workflow.py`, `S/evidencias/T011.md`

### Escopo

Criar workflow de PR para `develop`, `merge_group` e manual, sem filtro inicial de caminhos, com permissões somente leitura. Ler SHA da Wiki do manifesto e validar formato antes de uso; buscar commit exato e não substituir por branch padrão. Rodar testes focados, modos editorial/Compose e caso negativo. Fixar ações por SHA seguindo padrões existentes. Não publicar nem executar código da Wiki.

### Critérios de conclusão

Contratos do workflow passam com fixtures; candidato inacessível falha explicitamente. Execução integrada real fica para T015, evitando dependência circular com o manifesto final. Verificar proteção de branch e registrar se a checagem é obrigatória, sem presumir configuração remota.

### Plano TDD

- RED: escrever testes que falhem por ausência dos gatilhos, verificação de SHA e restrição de permissões.
- GREEN: criar o fluxo mínimo compatível com os testes e CLI existente.
- REFACTOR: simplificar etapas e repetir testes; não mudar fluxos de release.

### Validação

- `python -m unittest discover -s .github/scripts/tests -p "test_delivery_docs*.py" -v`.
- Em ambiente Bash/CI: `bash .github/scripts/install_actionlint.sh .tmp/actionlint`, depois `.tmp/actionlint/actionlint .github/workflows/documentation-quality.yml`.
- `python -m unittest discover -s .github/scripts/tests -p "test_manual_workflow.py" -v` para preservar o contrato existente.

## T012 — Executar instalação, primeiro acesso e diagnóstico

- Status: concluída
- Dependências: T010, T011
- Paralela: não
- Requisitos: RF-003, RF-004, RF-007, RNF-001, CA-003, CA-004, CA-005
- Issue: #353
- Caminhos sob responsabilidade: `W/Guia-de-Execução-e-Configuração-com-Docker-e-Docker-Compose.md`, `S/evidencias/T012.md`; recursos temporários exclusivos do teste

### Escopo

Executar roteiro da T005 em ambiente isolado com imagens identificadas, portas livres e dados sintéticos. Validar dev/prod estruturalmente e executar o percurso completo no ambiente de teste escolhido em T001. Se produção usar DNS/TLS ou SMTP diferente, registrar limites e comprovar esses passos onde exigidos, sem alegar equivalência por inferência. Confirmar seed em banco vazio, troca de senha, acesso, diagnóstico, banco com usuários e encerramento preservando volumes.

### Critérios de conclusão

Roteiro reproduzível com evidências sanitizadas, ambiente/versão identificados e exemplos atualizados se necessário. `container_name` fixos não colidem; não parar serviços de terceiros. Falha funcional fora do escopo bloqueia o critério afetado, sem alterar código.

### Plano TDD

- RED: checklist operacional ainda sem evidência; quando houver falha real, registrá-la sem fabricar defeito.
- GREEN: executar e corrigir somente instruções até sucesso verificável.
- REFACTOR: clarificar etapas ambíguas e repetir apenas as afetadas.

### Validação

- `docker info`; `docker compose version`; modos `editorial` e `compose` do validador após qualquer edição.
- Com arquivo sintético preparado: `docker compose --env-file <arquivo-sintetico> -p labon-docs-teste -f docker-compose-dev.yml up -d --build`, `ps`, `logs --tail 50` em inspeção restrita e `down` no mesmo projeto; registrar comandos exatos e resultados sem logs sensíveis.
- Executar o roteiro correspondente do guia se o ambiente selecionado usar Compose de produção; `config` sozinho não satisfaz CA-004.

## T013 — Comprovar backup, restauração e limites de reversão

- Status: concluída
- Dependências: T012
- Paralela: não
- Requisitos: RF-004, RNF-001, CA-006
- Issue: #353
- Caminhos sob responsabilidade: `W/Guia-de-Execução-e-Configuração-com-Docker-e-Docker-Compose.md`, `infra/oci/README.md`, `backend/LabSolos-Server-DotNet8/Data/Migrations/README.md`, `S/evidencias/T013.md`; recursos temporários exclusivos do teste

### Escopo

Seguir os comandos concretos de backup/restauração produzidos em T005, com dados sintéticos da T012, restaurando em banco isolado. Conferir esquema, contagens e acesso. Verificar limites de baseline, migrações, versão de sessão e rollback de imagens; não executar reversões destrutivas em produção.

### Critérios de conclusão

Restauração comprovada com contagens e resultados sanitizados, instruções coerentes e dump transferido sem conversão textual. Remoção de volumes somente do teste e após revisão do alvo; encerramento normal preserva dados.

### Plano TDD

- RED: procedimento sem prova de recuperação é pendência objetiva; registrar falha real se encontrada.
- GREEN: executar recuperação e corrigir documentação até resultado verificável.
- REFACTOR: eliminar passos redundantes e repetir o percurso afetado.

### Validação

- Executar literalmente comandos `pg_dump`, transferência e `pg_restore` definidos no guia pela T005; registrar sua expansão exata, shell, versões e códigos de saída em T013, sem segredos. Esses comandos dependem do ambiente identificado, não são substituídos por scripts fictícios.
- Validador documental nos dois modos e `git diff --check` nos dois repositórios.

## T014 — Registrar confirmações reservadas de Nathan

- Status: concluída
- Dependências: T009, T013
- Paralela: não
- Requisitos: RF-006, RF-007, RF-008, RNF-001, CA-009, CA-010, CA-011
- Issue: #355, #356
- Caminhos sob responsabilidade: `W/Guia-de-Boas-Práticas-de-Desenvolvimento-Seguro.md`, `S/evidencias/T014.md`

### Escopo

Obter confirmação efetiva de Nathan sobre Dependabot e revisão/invalidação necessária de credenciais e sessões. Revisar novamente materiais finais; correções de conteúdo sensível devem voltar à tarefa proprietária antes de T015. Não pedir valores ou identidades de contas atingidas.

### Critérios de conclusão

Data e conclusão autorizada registradas sem detalhes sensíveis. Se houver silêncio, resultado divergente ou revisão não concluída, a tarefa permanece bloqueada/pendente e não autoriza encerramento. Não confundir “siga o recomendado” da atribuição com confirmação operacional.

### Plano TDD

- RED: ausência de confirmação é a pendência observável, não falha de código.
- GREEN: incorporar somente conclusão efetivamente recebida e compatível com critérios.
- REFACTOR: reduzir registro público ao estritamente necessário.

### Validação

- Conferência humana CA-009/CA-010 com Nathan; não automatizável nem substituível por teste.
- `git -C ../lab-solos.wiki diff --check`; revisão de confidencialidade da evidência.

## T015 — Fixar candidato da Wiki e validar integração

- Status: concluída
- Dependências: T010, T011, T013, T014
- Paralela: não
- Requisitos: RF-008, RNF-001, RNF-002, RNF-003, CA-001, CA-002, CA-003, CA-004, CA-005, CA-006, CA-007, CA-008, CA-009, CA-010, CA-011, CA-012
- Issue: todas
- Caminhos sob responsabilidade: `S/documentacao.json`, `S/validacao.md`, `S/evidencias/T015.md`; referência Git candidata da Wiki quando autorizada

### Escopo

Conferir documentos cruzados, consolidar evidências por CA e reconciliar itens inventariados. Preparar candidato contendo todo o conteúdo final, fixar seu SHA no manifesto e validar exatamente essa revisão local/remota. Disponibilizar branch candidata somente sob autorização vigente; não publicar automaticamente. Revisar preservação de páginas do manual/PRDs e proteção de branch.

### Critérios de conclusão

Todos os critérios têm evidência específica, candidato é acessível e CI documental passa com o SHA fixado. Evidências humanas não ficam implicitamente aprovadas. Candidato indisponível ou operação externa não autorizada é pendência explícita; não substituir por branch variável. Não mudar páginas nesta tarefa: devolver correção ao proprietário e repetir validação afetada.

### Plano TDD

- RED: integração acusa evidências faltantes, candidato inexistente ou divergência de revisão.
- GREEN: consolidar registro e fixar candidato validado.
- REFACTOR: remover redundância da matriz sem perder vínculo issue/CA/evidência.

### Validação

- `python -m unittest discover -s .github/scripts/tests -p "test_*.py" -v` em ambiente com as dependências já previstas pela CI.
- `python .github/scripts/check_manual.py --source docs/manual`.
- Validador `check_delivery_docs.py` com manifesto real nos modos `editorial` e `compose`, como em T010; `git -C ../lab-solos.wiki rev-parse HEAD` deve corresponder ao candidato validado.
- Após PR autorizado, `gh pr checks <numero-do-pr>` e inspeção da execução do workflow; registrar SHA e URL de execução. O parâmetro representa o PR efetivamente criado, não uma tarefa para criá-lo sem autorização.

## T016 — Publicar revisão validada e concluir aceite

- Status: concluída
- Dependências: T015
- Paralela: não
- Requisitos: RF-008, RNF-002, RNF-003, CA-011, CA-012
- Issue: todas
- Caminhos sob responsabilidade: `S/validacao.md`, `S/evidencias/T016.md`; publicação da revisão candidata da Wiki e estado das quatro issues quando autorizados

### Escopo

Publicar a revisão validada conforme autorização vigente e coordenar publicadores existentes. Conferir páginas, diagramas e links na Wiki pública. Registrar SHAs finais e evidências por issue; só então encerrar as quatro issues e reconciliar rascunhos do Project se autorizado. Sem autorização, entregar candidato revisável e manter esta tarefa pendente.

### Critérios de conclusão

Conteúdo publicado corresponde ao validado, todos os links funcionam e cada issue possui critérios efetivamente atendidos. Mudança posterior exige nova validação. Nenhum segredo removido pode retornar em reversão documental.

### Plano TDD

- RED: candidato ainda não publicado ou links públicos divergentes impedem aceite final.
- GREEN: publicar revisão aprovada e verificar acesso/renderização.
- REFACTOR: corrigir navegação somente por novo candidato validado, nunca editar publicação sem evidência.

### Validação

- `git -C ../lab-solos.wiki ls-remote origin` para conferir referência publicada, sem presumir nome da branch.
- Abrir índice e cada entregável publicado; conferir Mermaid e explicações textuais.
- Consultar as quatro issues após operações autorizadas e registrar resultado individual em `validacao.md`.

## Cobertura bidirecional

| Requisito ou critério | Tarefas responsáveis |
|---|---|
| RF-001 / CA-001 | T004, T015 |
| RF-002 / CA-002 | T008, T015 |
| RF-003 / CA-003 | T005, T007, T012, T015 |
| CA-004 | T005, T012, T015 |
| CA-005 | T005, T007, T012, T015 |
| RF-004 / CA-006 | T005, T013, T015 |
| RF-005 / CA-007 | T006, T015 |
| RF-006 / CA-008 | T009, T015 |
| CA-009 | T009, T014, T015 |
| RF-007 / CA-010 | T002, T014, T015 |
| CA-011 | T002, T010, T014, T015, T016 |
| RF-008 / CA-012 | T001, T003, T010, T011, T015, T016 |
| RNF-001 | T002, T003, T005, T007, T011, T012, T013, T014, T015 |
| RNF-002 | T001, T003, T004, T006, T008, T009, T010, T011, T015, T016 |
| RNF-003 | T003, T004, T008, T010, T015, T016 |

## Log de execução

| Data | Tarefa | Resultado | Testes/evidências | Observações |
|---|---|---|---|---|
| 2026-09-21 | Preparação do ambiente, anterior ao DAG | Docker e SDK disponíveis | `docker info`: 29.8.0/Linux; `docker run --rm hello-world`: sucesso; Compose 5.5.1; SDK 8.0.419. | Nenhuma T001–T016 executada nesta elaboração. |
| 2026-09-21 | T001 | concluída | Inventário e evidência sanitizada; `git diff --check` na aplicação e na Wiki. | Referências da aplicação e Wiki registradas; #30, Project 41 e limitações de ambiente conferidos. T002 em andamento. |
| 2026-09-21 | T002 | concluída | Sanitização da Wiki, `git -C ../lab-solos.wiki diff --check` e `check_manual.py`: aprovado. | Removidos valores de produção e e-mails não sintéticos dos documentos delimitados; CA-010 permanece pendente até T014. T003–T006 em andamento. |
| 2026-09-22 | T003 | concluída | 11 testes focados verdes; `py_compile`, `--help` e `git diff --check` aprovados. | Validador editorial e fixtures sintéticos criados; Compose fica para T007. |
| 2026-09-22 | T004 | concluída | `git cat-file -e` para 16 fontes, checks documentais e whitespace aprovados. | Página de arquitetura criada; prévia visual Mermaid indisponível nesta máquina. |
| 2026-09-22 | T005 | concluída | Compose dev/prod sintéticos verdes; caso sem `LABON_IMAGE_VERSION` falhou como esperado; diff checks aprovados. | Instalação funcional e backup/restauração permanecem em T012/T013. |
| 2026-09-22 | T006 | concluída | `git -C ../lab-solos.wiki diff --check` aprovado; fontes oficiais e datas registradas. | Limitação de escopo `project` registrada; estado remoto já persistido. T007–T009 em andamento. |
| 2026-09-22 | T007 | concluída | 19 testes focados verdes; dois exemplos Compose reais e caso sem versão validados; códigos 1/2, sanitização e `diff --check` aprovados. | Temporários removidos; regressão geral mantém falhas ambientais preexistentes registradas na evidência. |
| 2026-09-22 | T008 | concluída | Estrutura, 31 fontes/73 links e `diff --check` aprovados; prévia Mermaid indisponível. | DER físico das sete tabelas e dicionário concluídos; credenciais descritas sem valores. |
| 2026-09-22 | T009 | concluída | Contrato documental, 20 fontes e `diff --check` aprovados. | Dependabot/CA-009 permanece pendente de confirmação de Nathan em T014. T010–T011 em andamento. |
| 2026-09-22 | T010 | concluída | Manifesto editorial e Compose passaram com código 0; 19 testes focados e `diff --check` verdes. | Metadados e link SHA corrigidos; Wiki commitada localmente em `785b5cb4c8c29e3fec8bdc6a71fac127af21aec4`, sem publicação. T015 deverá fixar o candidato final. |
| 2026-09-22 | T011 | concluída | 24 testes documentais verdes; contrato manual 5/5; `py_compile` e whitespace aprovados. | Actionlint indisponível por ambiente sem executável/Bash; lacuna registrada. T012 em andamento. |
| 2026-09-22 | T012 | concluída | Docker/Compose, config dos dois ambientes, `up -d --build`, health HTTP, seed, troca obrigatória, login e encerramento normal aprovados; validadores finais exit 0. | SMTP/DNS/TLS não exercitados; backup/restauração seguem T013. Nenhum container ficou ativo. T013 em andamento. |
| 2026-09-22 | T013 | concluída | `pg_dump -Fc`, cópia binária, `pg_restore --list` (74 entradas), restauração, contagem 1, 8 tabelas, 4 migrações e checks finais exit 0. | Primeiro RED de quoting PowerShell corrigido via stdin; somente recursos `labon-*` limpos. T014 em andamento. |
| 2026-09-22 | T014 | bloqueada | Validadores editorial/Compose e `diff --check` passaram; evidência T014 sanitizada. | Falta confirmação factual de Nathan sobre Dependabot e revisão/invalidação de credenciais/sessões. T015/T016 não iniciadas por dependência. |
| 2026-09-22 | T014 | concluída | Confirmação reservada registrada; Dependabot sem alertas abertos; `git diff --check` aprovado. | Issues #355 e #356 sincronizadas em `In Progress`; nenhum segredo registrado. |
| 2026-09-22 | T015 | concluída | Suíte documental 24/24; manual aprovado; validadores editorial/Compose exit 0; candidato fixado em `3ddc49abfd271158f552ef25ab08e16211dffa9d`. | Issues #352, #353, #355 e #356 preservadas em `In Progress`; sem publicação nesta tarefa. |
| 2026-09-22 | T016 | concluída | SHA remoto confirmado; sete páginas públicas HTTP 200; aceite final registrado. | Wiki publicada; quatro issues encerradas e itens do Project 41 em `Done`. |
