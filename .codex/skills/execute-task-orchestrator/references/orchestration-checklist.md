# Checklist do orquestrador

## Antes de cada onda

- Dependências concluídas e DAG sem ciclo.
- Caminhos exclusivos e sem conflito indireto.
- Linha de base conhecida; alterações preexistentes preservadas.
- Tarefas marcadas `em andamento` pelo orquestrador.
- Um agente por tarefa e ao menos uma vaga reservada à coordenação.

## Evidência exigida por agente

- Lista exata de arquivos alterados.
- Teste criado/alterado e falha RED esperada observada.
- Implementação mínima GREEN.
- Refatoração e testes reexecutados.
- Comandos, resultados e falhas preexistentes.
- Confirmação de que `tasks.md` não foi editado.

## Validação entre ondas

- Backend tocado: `dotnet test backend/Tests/Tests.csproj`. Não aceitar o sucesso de `dotnet test backend/backend.sln` enquanto a solution não incluir o projeto de testes.
- Frontend tocado: executar o script de testes definido pela especificação técnica, além de `npm run lint` e `npm run build` em `frontend`.
- Frontend sem script de testes: bloquear tarefas comportamentais até a conclusão da infraestrutura planejada.
- CI alterada: validar sintaxe e confirmar evento pré-merge sem passos de publicação/implantação.
- Frontend e backend tocados: validar contratos e executar as verificações de ambos os lados.

## Fechamento

- Todos os critérios e requisitos cobertos.
- Nenhuma tarefa ainda `em andamento`.
- Log atualizado pelo orquestrador.
- Diff revisado para mudanças fora do escopo.
- Resumo final distingue sucesso, bloqueio e dívida preexistente.
