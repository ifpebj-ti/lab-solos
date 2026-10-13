# T023 — Execução

## RED

O teste novo foi executado antes da alteração de Caddy:

```text
python -m unittest discover -s .github/scripts/tests -p "test_browser_security_policy.py" -v
Ran 2 tests in 0.012s
FAILED (failures=2)
```

As duas falhas comportamentais esperadas encontraram zero declarações `Content-Security-Policy` na configuração de produção atual.

## GREEN e REFACTOR

- `python -m unittest discover -s .github/scripts/tests -p "test_browser_security_policy.py" -v` — 3/3 aprovados. Confere a política exata, os destinos restritos, a separação da rota `/api/*`, a única importação CSP no ramo frontend e ausência de cabeçalho concorrente no Nginx.
- `docker run --rm --network none -e APP_DOMAIN=labon.example.invalid --mount "type=bind,source=$PWD,target=/workspace,readonly" --workdir /workspace caddy:2.10-alpine caddy validate --config Caddyfile --adapter caddyfile` — configuração válida com Caddy 2.10. O Docker daemon estava ativo. A imagem Caddy foi obtida para esta validação.
- `git diff --check` — aprovado; sem erros de whitespace. O Git emitiu apenas avisos de normalização LF/CRLF para arquivos modificados no checkout.
- `caddy fmt --overwrite` foi aplicado ao `Caddyfile` e ao trecho reutilizável. A política permanece única e a escrita é diferida para substituir um CSP upstream, se presente.

## Recursos e limites da evidência

O inventário estático registra scripts locais e `env.js`, conexão same-origin `/api/`, estilos dinâmicos, fontes Inter/Rajdhani locais, imagens locais/SVG e exportações XLSX/PDF por blobs. Justifica `unsafe-inline` apenas em `style-src`. T026 deve confirmar os recursos finais e bloqueios no navegador pelo Caddy real; T023 não afirma conformidade das jornadas ou ausência de violações em navegador. O roteamento atual de `/api/*` foi preservado e esta tarefa não adiciona uma rota de Swagger.

## Ajuste do contrato após o foco de navegador de T026

O foco CSP executado no navegador em T026 comprovou que a exportação PDF usa `@react-pdf/layout`/`yoga-layout`: o renderizador busca o módulo WebAssembly por uma URL `data:` e precisa compilá-lo. A política agora permite `data:` somente em `connect-src` e `'wasm-unsafe-eval'` em `script-src`. Essa palavra-chave habilita compilação/execução WebAssembly; não equivale ao token exato `'unsafe-eval'` que libera `eval()` e `Function()`, que permanecem bloqueados. `'unsafe-inline'`, `blob:`, curingas e origens HTTP(S) continuam proibidos em `script-src`.

- RED corretivo: 2/3 testes passaram; a única falha comparava a política com a expectativa antiga. Ver `red.md`.
- GREEN: `python -m unittest discover -s .github/scripts/tests -p "test_browser_security_policy.py" -v` — 3/3 aprovados.
- `git diff --check` — sem erros de whitespace; houve apenas avisos de normalização LF/CRLF já presentes no checkout. Uma verificação adicional de whitespace nos três arquivos alterados passou; não foram alterados caminhos de Caddy, inventário ou T026.

Este registro cobre somente o achado de CSP no foco de navegador; não declara T026 concluída.
