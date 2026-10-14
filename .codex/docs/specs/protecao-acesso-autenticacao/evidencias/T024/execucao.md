# T024 — composição security E2E com proxy real

- Data: 2026-10-13
- Issue: #439; permaneceu `OPEN`, atribuída a `nathannmvr`, no Project 41 em `In Progress`.
- Resultado local: concluído.

## RED

Antes da implementação, foi executado:

```text
python -m unittest discover -s .github/scripts/tests -p "test_security_e2e_stack.py" -v
```

O teste executou 3 casos e falhou nos 3 por asserções explícitas: composição descartável ausente, listas/projeto security ausentes no Playwright e smoke/proxy ausentes. Nenhum erro de arquivo/toolchain foi usado como evidência de remediação.

## GREEN e regressões

- `python -m unittest discover -s .github/scripts/tests -p "test_security_e2e_stack.py" -v`: 3/3 aprovados.
- `docker compose -p lab-solos-security-e2e -f docker-compose-security-e2e.yml config --quiet`: aprovado.
- `npm.cmd run test:e2e:list -- --project=security`: 1 smoke selecionado.
- `npm.cmd run test:e2e:list -- --project=real`: lista existente preservada, 14 testes em 5 arquivos.
- `npm.cmd run test:e2e:list -- --project=ui`: lista existente preservada, 221 testes em 7 arquivos.
- `docker compose -p lab-solos-security-e2e -f docker-compose-security-e2e.yml up -d --build --wait`: build e inicialização aprovados. PostgreSQL, API Production, frontend e Mailpit ficaram saudáveis; gerador sintético de certificados/chaves terminou com exit 0.
- `docker compose -p lab-solos-security-e2e -f docker-compose-security-e2e.yml exec -T proxy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile`: configuração Caddy válida.
- `npm.cmd run test:e2e -- --project=security e2e/infra/security-smoke.e2e.ts`: 1/1 aprovado no navegador.

O smoke recebeu HTML 200 pela origem TLS `https://localhost:18443` na raiz e em `/login`, com CSP aplicada e scripts restritos à mesma origem. Um `fetch('/api/Usuarios')` pelo navegador atravessou o Caddy e recebeu 401, sem CSP na resposta de API e sem `Access-Control-Allow-Origin`. O projeto security desativa traces e screenshots; o smoke não envia credenciais nem lê tokens.

O frontend containerizado compilou. Permaneceram os avisos de build conhecidos sobre `/env.js`, imagem resolvida em runtime e chunks grandes; o build backend também exibiu avisos gerais de análise em arquivos fora do escopo T024. `npm.cmd ci` foi necessário porque o worktree não tinha `node_modules`; o lockfile não mudou. A auditoria do grafo travado reportou 10 vulnerabilidades (2 moderadas, 8 altas); dependências não foram alteradas.

`git diff --check -- frontend/playwright.config.ts` passou; os novos arquivos também foram conferidos quanto a whitespace final.

## Isolamento e limpeza Docker

Antes do primeiro `up`, não havia contêineres com label `com.docker.compose.project=lab-solos-security-e2e` e a porta 18443 estava livre. O stack usa redes e volumes Compose próprios, PostgreSQL sem porta publicada, SMTP privado e somente Caddy publicado em loopback. A CA sintética é montada no transporte de teste; Caddy usa TLS interno local.

Após o smoke, foi executado `docker compose -p lab-solos-security-e2e -f docker-compose-security-e2e.yml down --volumes`. A verificação final não encontrou contêineres, redes ou volumes com o label/nome do projeto security. A verificação antes/depois confirmou que `lab-solos-quality-t024` não foi alterado: seus contêineres estavam ausentes antes/depois e suas duas redes e dois volumes permaneceram.

## Arquivos T024

- `docker-compose-security-e2e.yml`
- `infra/testing/Caddyfile.security-e2e`
- `frontend/playwright.config.ts`
- `frontend/e2e/infra/security-smoke.e2e.ts`
- `frontend/e2e/infra/security-e2e-data.ts`
- `.github/scripts/tests/test_security_e2e_stack.py`
- `.codex/docs/specs/protecao-acesso-autenticacao/evidencias/T024/execucao.md`

## Revalidação no checkout principal

Após integrar os arquivos T024, foram repetidas as validações no checkout principal:

- `python -m unittest discover -s .github/scripts/tests -p "test_security_e2e_stack.py" -v`: 3/3 aprovados.
- Compose `config --quiet`: aprovado; projetos Playwright `security`, `real` e `ui` descobriram 1, 14 e 221 testes, respectivamente.
- `docker compose -p lab-solos-security-e2e -f docker-compose-security-e2e.yml up -d --build --wait`: aprovado; serviços saudáveis.
- Caddy `validate`: aprovado; smoke Playwright `security`: 1/1 aprovado.
- `docker compose ... down --volumes`: executado; nenhum container/rede/volume do projeto security permaneceu. Recursos de `lab-solos-quality-t024` preservados.
