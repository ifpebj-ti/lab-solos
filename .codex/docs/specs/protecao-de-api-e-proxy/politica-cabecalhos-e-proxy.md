# Política de cabeçalhos e proxy

- **Status** — Aplicada localmente
- **Requisitos** — RF-003, RF-005, RF-006, RF-007, RNF-001, RNF-002, CA-004, CA-006, CA-007, CA-008, CA-009
- **Decisão** — [API, limites e auditoria](../decisoes-de-planejamento.md#api-limites-e-auditoria)
- **Atualizado em** — 2026-11-23

## Respostas da API

`ApiResponseHeadersMiddleware` aplica estes metadados a todas as respostas cujo caminho começa no segmento `/api`, incluindo sucesso, falha, preflight e respostas de autenticação:

| Cabeçalho | Valor/política | Responsável |
| --- | --- | --- |
| `Cache-Control` | `no-store` | API e Caddy na superfície publicada |
| `Vary` | Inclui `Origin`, preservando outros valores e sem duplicar a origem | API; CORS continua decidindo se concede acesso |
| `Content-Security-Policy` | `default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'` | API e proxy |
| `Permissions-Policy` | `camera=(), geolocation=(), microphone=()` | API e proxy |
| `X-Content-Type-Options` | `nosniff` | API; o cabeçalho comum do Caddy também cobre a borda |
| `X-Correlation-ID` | Identificador gerado pela API para a resposta | Contrato de erro da API |

Após o roteamento, uma requisição em `/api` sem endpoint mapeado recebe `404 application/problem+json` e o código `resource_not_found`. A classificação ocorre antes de autenticação/autorização e somente quando `GetEndpoint()` é nulo; endpoints mapeados preservam suas políticas, inclusive a exigência de sessão.

## Limite e erros produzidos pelo Caddy

O Caddy limita a 1 MiB os corpos `application/json` ou `application/*+json` em `POST /api/Usuarios` e `POST /api/Emprestimos`, em consonância com o limite da API. O teto é verificado antes do encaminhamento; excesso retorna `413`, `request_body_too_large`, `application/problem+json` e correlação própria da borda. A sintaxe `request_body` requer Caddy 2.10 ou superior.

Falha de encaminhamento em `/api` com status interno `502`, `503` ou `504` é publicada como `503 service_unavailable`, em `application/problem+json` e com correlação própria. Os erros da borda e respostas normais da API mantêm `Cache-Control: no-store`, CSP e Permissions-Policy. O snippet comum segue emitindo HSTS, `nosniff`, proteção de frame e política de referrer no host HTTPS.

## Navegação e recursos estáticos

O Caddy reconhece `/api` e `/api/*` antes de encaminhar o restante ao Nginx. A configuração do Nginx usa `/index.html` para raiz, rotas públicas, os caminhos legados `/boot` e `/pre` e rotas conhecidas de `/admin`, `/mentor` e `/mentee`, incluindo histórico por ID de produto. Caminhos desconhecidos dentro desses três prefixos também chegam ao roteador React, que exibe `Page404` sem montar layouts nem fazer chamadas à API; recarregar mantém o mesmo resultado.

Recursos com extensão de asset são classificados antes do fallback amplo dos prefixos e servidos apenas se o arquivo existir. Arquivo ausente continua recebendo `404`, e caminhos desconhecidos fora de `/boot`, `/pre`, `/admin`, `/mentor` e `/mentee` também recebem `404`, sem `index.html`. Assets existentes conservam o cache público de um ano. A página inicial permanece na política própria do frontend.

## Verificações

- `.github/scripts/tests/test_browser_security_policy.py` verifica as políticas CSP separadas, cabeçalhos e erros da borda, tamanho, roteamento da API e fallback do Nginx.
- `BrowserSecurityHeadersTests` verifica `200`, `401` e rota desconhecida `404` com o conjunto de cabeçalhos da API.
- `docker compose --project-name lab-solos-ci-browser-security --file docker-compose-security-e2e.yml config --quiet` valida a composição descartável.
- A configuração Caddy de E2E foi adaptada e validada com Caddy 2.10. A execução integrada pelo navegador continua coberta pela tarefa T010.
