# T023 — RED

- Comando: `python -m unittest discover -s .github/scripts/tests -p "test_browser_security_policy.py" -v`
- Resultado: 2 testes executados, 2 falharam como esperado.
- Falha comportamental: ambos encontraram zero declarações `Content-Security-Policy` na configuração Caddy atual. A raiz/SPA, portanto, não recebia a política de produção exigida.
- A falha veio da ausência da CSP no `Caddyfile`, não de compilação, ferramenta, banco ou arquivo de teste ausente.

## RED corretivo após o foco de navegador de T026

Após o foco CSP no navegador, foi repetido o contrato T023 antes de atualizar suas expectativas:

```text
python -m unittest discover -s .github/scripts/tests -p "test_browser_security_policy.py" -v
Ran 3 tests
FAILED (failures=1)
```

A única falha foi a igualdade exata da política: o teste esperava o contrato antigo, sem `'wasm-unsafe-eval'` em `script-src` e sem `data:` em `connect-src`. As outras duas asserções passaram. Isso caracteriza apenas a expectativa estática desatualizada após a evidência de navegador; não houve falha de ambiente nem falha do Caddy.
