# T001 — comandos, ambiente e execução

Data da execução: 2026-09-22 (America/Sao_Paulo).

## Escopo e autorização

- Tarefa única: T001 — Linha de base executada e tolerâncias confirmadas.
- Issue/Project: não sincronizados. O usuário autorizou explicitamente continuar sem issue/Project; esta é uma exceção deliberada para esta execução e não representa criação, atualização ou aprovação de um item externo.
- Dados: somente dados sintéticos do cenário `t001-baseline`.
- Produto: nenhum arquivo de produção foi editado.
- `tasks.md`: não editado.

## Ambiente registrado

- Sistema: Windows 11 Pro, 64-bit, build 10.0.26200.
- CPU: 11th Gen Intel Core i5-1145G7 @ 2.60GHz, 4 cores / 8 lógicos.
- Memória física: 16.872.693.760 bytes.
- Node.js: v24.21.0.
- npm: 11.19.0.
- .NET: 8.0.419.
- Docker: 29.8.0.
- Docker Compose: v5.5.1.
- Playwright CLI: 1.62.1, via `frontend/node_modules/.bin/playwright.cmd`.
- Chromium headless usado pelo Playwright: `C:\Users\Nathan\AppData\Local\ms-playwright\chromium_headless_shell-1234\chrome-headless-shell-win64\chrome-headless-shell.exe`.
- Viewport planejado pelo helper: 1440x900.
- URL: `E2E_BASE_URL=http://127.0.0.1:4173`.
- Rede local registrada anteriormente: Wi-Fi 65 Mbps up; Tailscale 100 Gbps up. Nenhuma latência de rede foi inferida para a linha de base.

## Comandos e resultados

| Comando | Resultado |
|---|---|
| `docker compose -f docker-compose-e2e.yml up -d --build --wait` | Exit 0. Stack levantada e aguardada como saudável. |
| `docker compose -f docker-compose-e2e.yml ps` | Exit 0. Backend, banco, frontend e SMTP em `Up (healthy)`; frontend em `127.0.0.1:4173`, backend em `127.0.0.1:18080`, SMTP em `127.0.0.1:18025`. |
| `frontend/node_modules/.bin/playwright.cmd --version` | Exit 0; `Version 1.62.1`. |
| `$env:E2E_SEED_SCENARIO='t001-baseline'; docker compose -f docker-compose-e2e.yml --profile seed run --rm e2e-seed --scenario t001-baseline` | Exit 0. Seed sintético concluído; criou os perfis administrador, mentor, mentorado e produto do cenário. O token e as senhas não são reproduzidos neste registro. |
| `$env:E2E_BASE_URL='http://127.0.0.1:4173'; $env:E2E_SEED_SCENARIO='t001-baseline'; node '.codex/docs/specs/reformulacao-design/evidencias/T001/medir-linha-base.mjs'` | Primeira tentativa: exit 1 imediato por `ERR_UNSUPPORTED_ESM_URL_SCHEME` ao importar caminho absoluto Windows como specifier ESM. |
| Mesmo comando após correção do import para `pathToFileURL(...)` | Chromium iniciou em modo headless. Após 60 s sem saída agregada, a medição foi interrompida com Ctrl+C. Exit 1; erro final `browserContext.close: Target page, context or browser has been closed`. |
| `git diff --quiet -- .codex/docs/specs/reformulacao-design/tasks.md` | Exit 0; nenhuma diferença rastreada. O arquivo permaneceu no estado preexistente não rastreado do diretório de especificação. |

## Limite aplicado

Não foi aguardado indefinidamente: a segunda tentativa teve uma janela de 30 s inicial e uma janela adicional de 30 s, totalizando aproximadamente 60 s sem progresso observável. Não foi reexecutada a suíte E2E nem outra tarefa.

## Retomada das medições — 2026-09-23

- A autorização explícita de Nathan para assumir todas as confirmações necessárias e continuar sem issue/Project foi aplicada à seleção dos quatro cenários e à regra de tolerâncias registrada em `diagnostico/linha-base/proposta-tolerancias.md`.
- A coleta usou o Compose isolado `lab-solos-t001-baseline-head`: frontend `127.0.0.1:14173`, backend `127.0.0.1:14180` e SMTP `127.0.0.1:14125`; não substituiu nem desligou o Compose da aplicação local em `4173/18080/18025`. O banco foi acessado somente pela rede interna.
- Revisão identificadora: `git rev-parse HEAD` → `8c2a8bd173723b8b154aad03da2f511499fbb83b`. O worktree tinha arquivos modificados preexistentes; a instância foi registrada como build isolado de HEAD e os caminhos alheios à T001 foram preservados.
- Helper: `.codex/docs/specs/reformulacao-design/evidencias/T001/medir-linha-base-head.mjs`; cenário sintético `t001-baseline-head`; navegador Chromium Playwright 1.62.1; viewport 1440×900; cinco repetições seriais por cenário.
- Resultado: exit 0; artefato [`medicoes-head-8c2a8bd-2026-09-23.json`](medicoes-head-8c2a8bd-2026-09-23.json), gerado em `2026-09-23T13:18:22.541Z`; quatro cenários com 5/5 execuções funcionais.
- A mediana de bytes usada para tolerância é a soma de `Content-Length` observada nas respostas da rota medida. `Resource Timing` é mantido como diagnóstico com cache aquecido, não como total de bytes transferidos.
- Resultado funcional e 404s conhecidos estão discriminados em `resultado-medicoes.md`; não houve falhas de requisição nem erros de página, mas houve 404s de imagem/end-point e erro de console correspondente, conforme registrado.
- Não houve alteração de código de produção. Permanecem como limitações: assistência humana não instrumentada, respostas sem `Content-Length` e 404s preexistentes explicitados na referência.
