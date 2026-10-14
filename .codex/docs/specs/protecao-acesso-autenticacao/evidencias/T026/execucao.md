# T026 — Execução e validação

Data: 2026-10-13. Worktree isolado: `lab-solos-orchestrator-20261013/T026`.

## Testes

| Comando | Resultado |
|---|---|
| `docker compose -p lab-solos-security-e2e -f docker-compose-security-e2e.yml up -d --build --wait` | Aprovado; API, frontend, banco, SMTP e Caddy saudáveis. |
| `npm.cmd run test:e2e -- --project=security e2e/browser-security.real.spec.ts --grep "serves applied CSP"` | Aprovado; inline/externos/dinâmicos bloqueados, WASM controlado funcional. |
| `npm.cmd run test:e2e -- --project=security e2e/browser-security.real.spec.ts` | Aprovado, 4/4 em 13,9 s após reset do banco T026: CSP, CORS, perfis/recuperação/ativos/exportações e XFF. A checagem permite exatamente a sondagem CSP capturada pelo Zod v4 em cada página e rejeita violações adicionais. |
| `docker compose -p lab-solos-security-e2e -f docker-compose-security-e2e.yml exec -T proxy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile` | Aprovado (`Valid configuration`). |
| `python -m unittest discover -s .github/scripts/tests -p "test_browser_security_policy.py" -v` | 2/3 aprovados; `test_policy_allows_only_inventoried_sources_and_restricts_active_content` falha na igualdade exata, pois o contrato estático ainda espera `script-src ['self']` e `connect-src ['self']`. A política efetiva acrescenta somente `'wasm-unsafe-eval'` e `data:` pelas necessidades comprovadas do Yoga WASM. O arquivo de teste é posse T023 e não foi alterado em T026; requer revalidação após integrar a atualização T023. |

O Caddy foi consultado após reinício do proxy: frontend 200 com CSP efetiva incluindo as duas exceções restritas. OPTIONS com `Origin` externo e `Origin: null` retornaram 405 e sem `Access-Control-Allow-Origin`.

## Isolamento e artefatos

Antes da primeira subida, o projeto Docker `lab-solos-security-e2e` não tinha containers, volumes ou redes. Para o run final, somente esse projeto foi removido e recriado para zerar o banco; ao final, `docker compose ... down --volumes --remove-orphans` removeu os containers, três redes e quatro volumes T026. Consultas por label confirmaram zero containers, volumes e redes restantes do projeto, portanto nenhum container/porta publicada T026 permanece. Os volumes `lab-solos-quality-t024` e `lab-solos-quality-e2e` permaneceram. Não havia volume ou container `lab-solos-auth-e2e` listado nesta sessão; nenhum recurso desse projeto foi removido ou alterado.

Os cenários usam apenas identidades e dados sintéticos. O projeto Playwright `security` tem `trace: 'off'` e `screenshot: 'off'`; nenhuma credencial, token ou código de recuperação foi gravado em evidência. O reporter gerou apenas saídas locais de teste no worktree isolado, removidas após a validação.
