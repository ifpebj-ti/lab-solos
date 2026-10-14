# T027 — RED

Data: 2026-10-13

Antes de alterar o workflow, os contratos novos falharam pelas lacunas esperadas:

- `python -m unittest discover -s .github/scripts/tests -p "test_browser_security_workflow.py" -v`: 4 casos; 3 falhas e 1 erro porque ainda não havia job `browser-security`.
- `python -m unittest discover -s .github/scripts/tests -p "test_container_ci_workflow.py" -v`: 11 casos; 2 falhas, pela ausência do job no Quality gate e pela restauração do backend sem `--locked-mode`.

Os resultados não contêm credenciais, tokens ou dados pessoais. O avaliador existente já trata job requerido ausente, ignorado ou falho como erro; a lacuna estava na lista de jobs exigidos pelo workflow.
