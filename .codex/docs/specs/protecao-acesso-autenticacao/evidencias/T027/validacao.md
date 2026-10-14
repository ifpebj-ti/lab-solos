# T027 — Validação

Data: 2026-10-13

## Comandos obrigatórios

- `python -m unittest discover -s .github/scripts/tests -p "test_quality_gate.py" -v` — 5 testes aprovados.
- `python -m unittest discover -s .github/scripts/tests -p "test_container_ci_workflow.py" -v` — 11 testes aprovados.
- `python -m unittest discover -s .github/scripts/tests -p "test_browser_security_workflow.py" -v` — 4 testes aprovados.
- `python -m unittest discover -s .github/scripts/tests -p "test_security_e2e_stack.py" -v` — 3 testes aprovados.

## Verificações adicionais

- `docker compose --project-name lab-solos-ci-browser-security --file docker-compose-security-e2e.yml config --quiet` — aprovado, sem saída.
- `git diff --check` — sem erros de whitespace. Git exibiu avisos de conversão LF/CRLF em arquivos existentes fora do escopo desta tarefa.
- `docker info --format '{{.ServerVersion}}'` — `29.8.0`.
- Consultas `docker ps -a`, `docker network ls` e `docker volume ls` filtradas por `lab-solos-ci-browser-security` — sem recursos correspondentes; exit code 0.
- Consulta PowerShell da porta 18443 — `NO_LISTENER_18443`.

Nenhum stack foi iniciado localmente, portanto esta tarefa não criou nem removeu containers, volumes, redes ou listeners. A validação local do stack limitou-se ao `config --quiet`; os testes de navegador serão executados pela nova job do CI.

## Limitações

Actionlint não estava instalado. A tentativa de usar `.github/scripts/install_actionlint.sh` não iniciou porque o `bash.exe` local reportou que `/bin/bash` não existe. O contrato de workflow e os quatro comandos obrigatórios passaram; a checagem actionlint permanece para o ambiente Linux de CI.
