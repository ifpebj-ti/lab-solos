---
name: execute-task
description: Executar exatamente uma tarefa de um tasks.md no fluxo de Desenvolvimento Orientado por Especificações (SDD), implementando código com TDD e validando a esteira de testes. Usar quando o usuário indicar uma tarefa específica, pedir a próxima tarefa pronta ou solicitar implementação incremental sem orquestração. Respeitar escopo, dependências e caminhos sob responsabilidade; parar após uma única tarefa e registrar evidências RED-GREEN-REFACTOR.
---

# Executar uma tarefa

## Contrato de execução

Executar somente uma tarefa. Localizar PRD, especificação técnica e tarefas exclusivamente em `.codex/docs/specs/<slug-da-funcionalidade>/`; nunca usar `docs/specs/` na raiz. Se nenhum ID for informado, escolher a primeira `pendente` cujas dependências estejam `concluídas`. Nunca avançar automaticamente para a próxima tarefa.

Ler `references/project-quality.md` antes de validar código neste repositório.

## Preparação

1. Ler integralmente a tarefa, o PRD e a especificação técnica associados.
2. Confirmar que dependências estão `concluídas`, `Caminhos sob responsabilidade` cobrem a mudança e critérios são verificáveis. Parar se houver decisão de produto/arquitetura ausente.
3. Inspecionar `git status --short` e o diff relevante. Preservar alterações do usuário e não editar fora do escopo.
4. Executar o teste direcionado existente ou a linha de base pertinente. Distinguir falha preexistente de regressão.
5. Marcar a tarefa `em andamento`, salvo quando um orquestrador ordenar explicitamente que somente ele edite `tasks.md`.

## TDD obrigatório

1. **RED:** escrever primeiro o menor teste que demonstra o comportamento. Executá-lo e registrar a falha esperada. Uma falha de compilação acidental ou ambiente quebrado não vale como RED.
2. **GREEN:** implementar somente o necessário para o teste passar. Executar novamente e registrar sucesso.
3. **REFACTOR:** melhorar nomes/estrutura e remover duplicação sem alterar comportamento. Reexecutar os testes.
4. Executar regressão proporcional ao risco e as verificações definidas na tarefa.

Se o primeiro teste passar porque o comportamento já existe, tratá-lo como caracterização: não quebrar produção para fabricar RED. Procurar um critério ainda não atendido e produzir RED para essa lacuna; se todos já estiverem atendidos, não alterar produção e registrar que a tarefa exigia apenas cobertura. Para infraestrutura ou documentação sem comportamento executável, usar uma verificação objetiva que falhe primeiro e declarar por que o ciclo TDD clássico não se aplica.

Se a área não possuir infraestrutura de testes, executar uma tarefa explícita de infraestrutura primeiro. Não implementar comportamento e alegar TDD sem um teste automatizado executável.

## Qualidade e esteira

- Validar compilação, lint e testes conforme os arquivos afetados e os comandos reais do projeto.
- Verificar se a validação de CI correspondente roda em pull requests antes do merge. Registrar a lacuna se rodar apenas depois do merge.
- Não corrigir falhas preexistentes fora do escopo. Documentá-las com comando e mensagem resumida.
- Não enfraquecer, remover ou pular testes para obter verde.
- Não fazer commit, push, merge ou mudanças externas sem solicitação explícita.

## Fluxo de contribuição Git

Quando o usuário solicitar explicitamente branch, commit, push ou Pull Request:

- atualizar `develop` e criar a branch de trabalho a partir de `origin/develop`; nunca iniciar uma contribuição em `main`;
- abrir ou alterar o Pull Request sempre com base `develop`; nunca direcionar contribuição para `main`;
- preservar `.github/pull_request_template.md`, marcar exatamente uma opção entre `novo-marco`, `nova-feature-refactor`, `bug-fix` e `outros`, e substituir o campo de descrição por contexto, propósito e impactos reais;
- manter commits atômicos e seguir nomes de branch e mensagens definidos em `CONTRIBUTING.md`;
- não executar operação Git externa sem autorização explícita do usuário.

## Conclusão

Marcar `concluída` somente com critérios atendidos e evidências RED/GREEN/REFACTOR, ou caracterização/verificação com falha inicial justificadas pelas exceções acima. Caso contrário, marcar `bloqueada` com causa acionável. Acrescentar uma linha ao log de execução, salvo sob controle do orquestrador.

Ao terminar, informar: tarefa executada, arquivos alterados, evidência RED, comandos verdes, lacunas/preexistências e riscos restantes. Encerrar sem iniciar outra tarefa.
