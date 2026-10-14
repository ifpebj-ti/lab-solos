# T026 — GREEN e refactor

## CSP efetiva

O Caddy serve `script-src 'self' 'wasm-unsafe-eval'` e `connect-src 'self' data:` apenas no ramo frontend. A exceção `wasm-unsafe-eval` permite a compilação WebAssembly do Yoga sem permitir `eval` ou `Function` de JavaScript. A origem `data:` em `connect-src` atende somente o WASM embutido do pacote local. Permanecem bloqueados scripts inline e externos, atributos de evento, recursos de conexão externos, workers, frames, objects, alteração de base e formulários externos.

O cenário carrega um script same-origin controlado que tenta executar `eval` e `new Function`; o navegador registra bloqueios `script-src` e os dois efeitos colaterais permanecem falsos. O teste mantém a aceitação do probe capturado do Zod v4 (`script-src`/`eval`) em páginas da aplicação e falha para qualquer outra violação. A exportação PDF passou com a nova política sem outra violação inesperada.

## Jornadas e borda

- Raiz e rotas SPA: resposta 200 e cabeçalho CSP presente.
- API same-origin: resposta 401 legível para visitante, sem CSP nem `Access-Control-Allow-Origin` na resposta da API.
- Browser cross-origin e sandboxed origin `null`: `fetch` termina em `TypeError` e nenhuma resposta é legível. OPTIONS explícitos para ambas as origens retornam 405 sem `Access-Control-Allow-Origin`.
- Perfis de Administrador, Mentor e Mentorado: renderização, imagens e fontes locais funcionam.
- Recuperação para endereço sintético não cadastrado: resposta 202 e navegação para `/reset-password`.
- Exportações: `usuarios.xlsx` e `usuarios_cadastrados.pdf` iniciam download e não falham.
- IP: 30 logins inválidos com XFF forjado recebem 401; a 31ª requisição recebe 429, indicando que a borda não adotou os IPs enviados pelo cliente como origens distintas.

O seletor de exportação XLSX/PDF está dentro do popover “Opções de exportação”; o spec abre o popover antes de interagir com as opções. Não houve alteração em API, CORS ou lógica de exportação.
