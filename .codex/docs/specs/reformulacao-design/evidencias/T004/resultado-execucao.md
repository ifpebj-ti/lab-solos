# Evidências T004 — Cobertura de design na CI pré-merge

Data: 2026-09-22  
Tarefa: T004 — Cobertura de design na CI pré-merge  
Issue/Project: não sincronizados por autorização explícita do usuário; nenhuma alteração externa foi feita.

## Escopo executado

- `frontend-quality` passou a configurar Python 3.12.14.
- O job executa os testes do validador de inventário a partir da raiz:
  `python -m unittest discover -s scripts/tests -p 'test_check_design_coverage.py' -v`.
- O job executa a validação estrutural progressiva:
  `python scripts/check_design_coverage.py --spec .codex/docs/specs/reformulacao-design`.
- `auth-e2e`, seus projetos `ui`/`real` e a propagação pelo `quality-gate` foram preservados.
- Nenhum workflow de release ou configuração de proteção remota foi alterado.

## TDD

### RED

Teste criado antes da alteração do workflow:

```text
python -m unittest discover -s .github/scripts/tests -p 'test_design_quality_workflow.py' -v
```

Resultado: exit 1. Foram executados 3 testes; 2 passaram e 1 falhou em
`test_design_validator_runs_from_repository_root_in_frontend_quality`, pela ausência
de `Set up Python` e dos passos do validador no job `frontend-quality`.

A linha de base prévia do workflow permaneceu verde:

```text
python -m unittest discover -s .github/scripts/tests -p 'test_container_ci_workflow.py' -v
```

Resultado: exit 0, 11 testes aprovados.

### GREEN

Foram adicionados somente os passos mínimos ao job existente. O teste de contrato
passou após a implementação:

```text
python -m unittest discover -s .github/scripts/tests -p 'test_design_quality_workflow.py' -v
```

Resultado: exit 0, 3 testes aprovados.

### REFACTOR

O contrato dos dois passos de validação foi centralizado em `DESIGN_VALIDATION_STEPS`
no teste, removendo duplicação sem alterar o comportamento. A suíte foi executada
novamente:

```text
python -m unittest discover -s .github/scripts/tests -p 'test_design_quality_workflow.py' -v
```

Resultado: exit 0, 3 testes aprovados.

## Validações da tarefa

| Comando | Resultado real |
|---|---|
| `python -m unittest discover -s .github/scripts/tests -p 'test_design_quality_workflow.py' -v` | exit 0; 3 testes aprovados |
| `python -m unittest discover -s scripts/tests -p 'test_check_design_coverage.py' -v` | exit 0; 11 testes aprovados |
| `python scripts/check_design_coverage.py --spec .codex/docs/specs/reformulacao-design` | exit 0; `OK (progressivo): 63 superfícies e 44 rotas verificadas.` |
| `python -m unittest discover -s .github/scripts/tests -p 'test_container_ci_workflow.py' -v` | exit 0; 11 testes aprovados |
| `git diff --check -- .github/workflows/container-ci.yml .github/scripts/tests/test_design_quality_workflow.py` | exit 0; nenhuma falha de whitespace |

## Limitações registradas

- `actionlint` não está disponível no ambiente local; não foi possível executar essa
  checagem adicional.
- PyYAML não está instalado localmente; a validação YAML por parser não foi executada.
  O workflow existente de `workflow-quality` instala `PyYAML==6.0.3` na CI.
- Não houve execução remota do GitHub Actions, nem alteração de issue, Project,
  release, proteção de branch, commit, push ou PR.

