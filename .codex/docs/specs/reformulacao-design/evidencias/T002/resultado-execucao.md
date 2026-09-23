# Evidências T002 — Validador testado do inventário de design

Data da execução: 2026-09-22  
Tarefa: T002 — Validador testado do inventário de design  
Status da tarefa: concluída

## Exceções de coordenação autorizadas

- Issue/Project não foi sincronizado. O usuário autorizou explicitamente executar a tarefa sem issue/Project; nenhuma chamada externa de GitHub foi feita.
- A Onda 2 foi aberta apesar de T001 estar bloqueada, conforme autorização explícita do usuário e registro do orquestrador. T002 e T003 têm posses separadas.
- `tasks.md` não foi editado. `cobertura.json` também não foi editado; o validador apenas o lê.

## Arquivos sob posse alterados

- `scripts/check_design_coverage.py`
- `scripts/tests/test_check_design_coverage.py`
- `scripts/tests/fixtures/design-coverage/valid/spec/cobertura.json`
- `scripts/tests/fixtures/design-coverage/valid/spec/tasks.md`
- `scripts/tests/fixtures/design-coverage/valid/frontend/src/routes.tsx`
- `scripts/tests/fixtures/design-coverage/valid/evidence/accepted.md`
- `scripts/tests/fixtures/design-coverage/valid/evidence/decision.md`
- `.codex/docs/specs/reformulacao-design/evidencias/T002/resultado-execucao.md`

As fixtures são copiadas para diretórios temporários pelos testes; não alteram o inventário real.

## RED

Comando:

```text
python -m unittest discover -s scripts/tests -p 'test_check_design_coverage.py' -v
```

Resultado inicial: 11 testes executados, 11 falhas. A falha observada foi `validator script is missing` porque `scripts/check_design_coverage.py` ainda não existia. Isso caracterizou a ausência intencional do comportamento T002; não foi falha de compilação, dependência ou ambiente.

## GREEN

Implementado o CLI com `--spec`, `--final`, `--repo-root` e `--routes`, sem modificar o inventário. A validação cobre:

- IDs únicos e formato das superfícies;
- tarefas, marcos e ondas existentes/coerentes em `tasks.md`;
- rotas atuais de `frontend/src/routes.tsx`, incluindo rotas aninhadas, alias e wildcard;
- status permitidos e progresso estrutural;
- caminhos de evidência relativos, existentes e dentro da raiz do repositório;
- decisões confirmadas e referências existentes;
- justificativas de não aplicabilidade e aprovação explícita para status `exclusão aprovada`;
- rejeição de conclusão sem evidência/decisão;
- modo `--final`, que exige aceite integral.

Comando e resultado:

```text
python -m unittest discover -s scripts/tests -p 'test_check_design_coverage.py' -v
Ran 11 tests ...
OK
```

## REFACTOR

Extraída a função `_validate_evidences` e centralizada a constante `SURFACE_LIST_FIELDS`, preservando o comportamento. A regra foi ajustada para aceitar justificativas preliminares em `nao_aplicavel` durante a migração; a aprovação é exigida quando a superfície declara status `exclusão aprovada`. Essa distinção é necessária porque o inventário real usa justificativas dimensionais preliminares em SUP-058–SUP-063, ainda pendentes.

Após o refactor, a mesma suíte voltou a passar: 11/11 testes OK.

## CLI e validações

```text
python scripts/check_design_coverage.py --spec .codex/docs/specs/reformulacao-design
OK (progressivo): 63 superfícies e 44 rotas verificadas.
Exit: 0
```

```text
python scripts/check_design_coverage.py --spec .codex/docs/specs/reformulacao-design --final
FAIL: 63 problema(s) encontrado(s).
Exit: 1
```

O modo final falha honestamente porque as 63 superfícies do inventário real permanecem `pendente`; não foram inseridos dados de aceite fictícios.

```text
python -B -c "import ast, pathlib; ast.parse(pathlib.Path('scripts/check_design_coverage.py').read_text(encoding='utf-8')); print('AST OK')"
AST OK
```

## Limitações e preexistências

- A integração do validador na CI é responsabilidade de T004; nenhum workflow foi alterado nesta tarefa.
- O modo `--final` não pode passar durante a migração enquanto não houver evidências e decisões de aceite reais para todas as superfícies.
- Alterações preexistentes em backend/obj/bin, frontend ligado à T003, `.codex`, `.impeccable`, `.tmp` e `PRODUCT.md` foram preservadas e não fazem parte desta tarefa.
- Não houve commit, push, PR, alteração de frontend, workflow, `tasks.md` ou `cobertura.json`.
