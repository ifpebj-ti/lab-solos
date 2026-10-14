# T026 — RED

Em 2026-10-13, a primeira execução real do exportador PDF com a política de T023 (`script-src 'self'` e `connect-src 'self'`) não iniciou download. O listener `securitypolicyviolation` do Chromium registrou `connect-src` com `blockedURI=data` e `script-src` com `blockedURI=wasm-eval`. A inspeção da dependência mostrou que `@react-pdf/layout` usa `yoga-layout`, que busca o WASM embutido em `data:application/octet-stream;base64,...` e o instancia para paginar o PDF. O XLSX não apresentou esses bloqueios.

Também apareceu um evento `script-src`/`blockedURI=eval` na inicialização da aplicação. O bundle contém o probe de recursos de Zod v4 que tenta `Function("")` e captura a rejeição de CSP; o evento isolado não representa execução dinâmica bem-sucedida. A decisão de compatibilidade foi restrita a WebAssembly e data URL local, sem autorizar JavaScript dinâmico.

A primeira tentativa de observar OPTIONS pela API de eventos da página não recebeu o evento de preflight do Chromium. O teste foi ajustado para verificar no browser o erro de leitura CORS para origens externa e opaca e enviar OPTIONS explícitos pelo `APIRequestContext` ao Caddy real, incluindo `Origin: null`.
