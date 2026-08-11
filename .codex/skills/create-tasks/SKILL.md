---
name: create-tasks
description: Decompor um PRD e uma especificação técnica em um DAG de tarefas pequenas, rastreáveis e executáveis por TDD no fluxo de Desenvolvimento Orientado por Especificações (SDD). Usar quando o usuário pedir plano de implementação, backlog técnico, divisão em tarefas, ondas paralelas ou preparação para execute-task/execute-task-orchestrator. Produzir em português do Brasil um tasks.md com dependências, posse de arquivos, testes e comandos de validação explícitos.
---

# Criar tarefas

## Entrada e saída

Ler `.codex/docs/specs/<slug-da-funcionalidade>/prd.md` e `techspec.md`. Criar `.codex/docs/specs/<slug-da-funcionalidade>/tasks.md` com `assets/tasks-template.md`. Toda documentação SDD deste repositório deve permanecer sob `.codex/docs/specs/`; nunca criar `docs/specs/` na raiz. Não compensar especificações incompletas inventando decisões.

Escrever toda a documentação em português do Brasil, inclusive títulos, metadados, estados, campos e tabelas. Manter em inglês somente nomes oficiais de tecnologias, comandos, caminhos, identificadores externos e siglas técnicas consolidadas cuja tradução prejudique a precisão.

## Decomposição

1. Mapear todos os `RF-*`, `RNF-*` e `CA-*` para tarefas.
2. Criar tarefas verticais pequenas, cada uma concluível e validável isoladamente. Usar IDs sequenciais `T001`, `T002`, ...
3. Definir dependências como um DAG sem ciclos e agrupar tarefas prontas em ondas.
4. Declarar `Caminhos sob responsabilidade` conservadores. Tarefas da mesma onda não podem possuir caminhos sobrepostos, arquivos gerados compartilhados, migrações concorrentes ou contratos mutuamente dependentes.
5. Para cada mudança de comportamento, descrever RED, GREEN e REFACTOR com um teste observável. Não aceitar “adicionar testes depois”. Se o comportamento já existir sem cobertura, planejar primeiro um teste de caracterização; não fabricar RED removendo ou quebrando código correto.
6. Incluir comandos direcionados e verificações amplas. Evitar comandos fictícios.
7. Adicionar uma tarefa pré-requisito para criar/configurar a infraestrutura de testes quando a área não tiver testes automatizados. Neste repositório, confirmar a situação; atualmente o frontend não possui executor/script de testes.
8. Adicionar a atualização da verificação de CI pré-merge quando a especificação técnica identificar que a esteira não protege o PR. Não misturar isso silenciosamente a uma tarefa funcional.
9. Reservar tarefas de integração final somente para validações cruzadas que não caibam nas tarefas verticais.

## Tamanho e autonomia

- Fazer cada tarefa caber em uma única execução de `$execute-task`.
- Evitar uma tarefa que altere simultaneamente frontend, backend e CI, salvo quando indivisível.
- Incluir contexto suficiente para um agente trabalhar sem reler toda a conversa, mas exigir leitura do PRD e da especificação técnica.
- Marcar `Paralela: sim` apenas quando dependências estiverem concluídas e a posse de arquivos não conflitar.
- Para tarefas puramente documentais ou de infraestrutura, substituir RED por uma verificação objetiva que falhe primeiro somente quando um teste de comportamento não fizer sentido.

## Fluxo de contribuição Git

Quando o usuário solicitar explicitamente branch, commit, push ou Pull Request:

- atualizar `develop` e criar a branch de trabalho a partir de `origin/develop`; nunca iniciar uma contribuição em `main`;
- abrir ou alterar o Pull Request sempre com base `develop`; nunca direcionar contribuição para `main`;
- preservar `.github/pull_request_template.md`, marcar exatamente uma opção entre `novo-marco`, `nova-feature-refactor`, `bug-fix` e `outros`, e substituir o campo de descrição por contexto, propósito e impactos reais;
- manter commits atômicos e seguir nomes de branch e mensagens definidos em `CONTRIBUTING.md`;
- não executar operação Git externa sem autorização explícita do usuário.

## Validação de saída

Validar cobertura bidirecional: todo requisito aparece em ao menos uma tarefa e toda tarefa referencia um requisito ou justifica ser infraestrutura. Validar também IDs únicos, dependências existentes, ausência de ciclos, comandos reais e inexistência de sobreposição dentro da mesma onda.
