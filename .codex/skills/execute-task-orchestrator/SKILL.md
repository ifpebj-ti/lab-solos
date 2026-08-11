---
name: execute-task-orchestrator
description: Orquestrar a execução de um tasks.md do fluxo de Desenvolvimento Orientado por Especificações (SDD) usando subagentes em paralelo para tarefas prontas e sem conflito. Usar quando o usuário pedir executar várias tarefas, concluir o plano, paralelizar implementação ou coordenar agentes. Agendar pelo DAG e caminhos sob responsabilidade, delegar exatamente uma tarefa por subagente, centralizar o estado e validar integração/testes entre ondas.
---

# Orquestrar tarefas

## Princípios

Atuar como coordenador e único editor de `.codex/docs/specs/<slug-da-funcionalidade>/tasks.md`; PRD, especificação técnica e tarefas devem ser lidos exclusivamente sob `.codex/docs/specs/`, nunca em `docs/specs/` na raiz. Delegar implementação a subagentes usando `$execute-task`, uma tarefa por agente. Os agentes compartilham o mesmo sistema de arquivos: paralelizar somente trabalho comprovadamente independente.

## Preparar

1. Ler PRD, especificação técnica e tarefas integralmente. Validar IDs, dependências, ciclos, critérios, comandos e `Caminhos sob responsabilidade`.
2. Inspecionar `git status --short` e preservar mudanças preexistentes.
3. Montar o conjunto de tarefas `pendentes` cujas dependências estão `concluídas`.
4. Selecionar uma onda sem interseção de caminhos. Considerar conflito também quando houver:
   - relação pai/filho entre caminhos ou padrões glob;
   - mesmo arquivo de projeto, manifesto, arquivo de bloqueio, migração, instantâneo ou arquivo gerado;
   - alteração simultânea de contrato produtor/consumidor;
   - testes que dependam do mesmo recurso mutável.
5. Limitar a onda aos slots disponíveis e manter o agente raiz livre para coordenação.

## Delegar

Antes de criar os subagentes, marcar as tarefas da onda como `em andamento`. Enviar a cada subagente uma instrução autocontida com:

- caminho absoluto da skill `$execute-task` e ID/caminho de `tasks.md`;
- instrução de executar exatamente a tarefa atribuída com RED-GREEN-REFACTOR;
- `Caminhos sob responsabilidade` exclusivos;
- proibição de editar `tasks.md`, fazer commit ou iniciar outra tarefa;
- obrigação de relatar arquivos, RED observado, testes verdes, falhas e bloqueios.

Não fornecer a solução desejada ao agente; fornecer especificações e artefatos brutos.

## Coordenar a onda

1. Acompanhar mensagens e aguardar todos os agentes da onda.
2. Não editar arquivos possuídos por um agente enquanto ele estiver ativo.
3. Se um agente descobrir conflito de escopo, interromper somente o trabalho afetado e replanejar sequencialmente.
4. Revisar as diferenças e evidências de cada tarefa. Rodar testes direcionados e depois verificações de integração relevantes.
5. Marcar cada tarefa como `concluída` ou `bloqueada` e atualizar o log de execução de modo centralizado.
6. Somente então recalcular dependências e iniciar a próxima onda.

## Verificações

- Exigir evidência de um RED válido para mudanças de comportamento. Aceitar teste de caracterização somente quando o comportamento já existir e nenhuma produção for alterada.
- Não aceitar “verde” baseado apenas em lint/compilação quando testes de comportamento são necessários.
- Se faltar infraestrutura de testes, executar primeiro a tarefa de infraestrutura prevista no plano; não improvisar expansão de escopo.
- Após cada onda, executar os testes dos projetos tocados. Ao final, executar todas as verificações especificadas na especificação técnica.
- Consultar `references/orchestration-checklist.md` para o protocolo de fechamento.

## Fluxo de contribuição Git

Quando o usuário solicitar explicitamente branch, commit, push ou Pull Request:

- atualizar `develop` e criar a branch de trabalho a partir de `origin/develop`; nunca iniciar uma contribuição em `main`;
- abrir ou alterar o Pull Request sempre com base `develop`; nunca direcionar contribuição para `main`;
- preservar `.github/pull_request_template.md`, marcar exatamente uma opção entre `novo-marco`, `nova-feature-refactor`, `bug-fix` e `outros`, e substituir o campo de descrição por contexto, propósito e impactos reais;
- manter commits atômicos e seguir nomes de branch e mensagens definidos em `CONTRIBUTING.md`;
- não executar operação Git externa sem autorização explícita do usuário.

## Encerrar

Finalizar somente quando todas as tarefas estiverem `concluídas` ou quando as restantes estiverem realmente bloqueadas. Resumir ondas, tarefas, arquivos, testes, lacunas da esteira, falhas preexistentes e bloqueios. Não fazer commit, push ou merge sem pedido explícito.
