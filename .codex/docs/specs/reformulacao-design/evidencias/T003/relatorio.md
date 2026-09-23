# Evidências T003 — preparação dos testes de design e acessibilidade

- Data: 2026-09-22
- Tarefa: T003 — Preparação dos testes de design e acessibilidade
- Onda: 2
- Resultado: concluída tecnicamente; `tasks.md` permaneceu sob controle do orquestrador e não foi editado.

## Exceções autorizadas

O usuário autorizou explicitamente:

1. executar T003 e abrir a onda 2 apesar de T001 estar bloqueada;
2. não sincronizar issue/Project.

Nenhuma chamada de issue/Project foi feita. A exceção de dependência e a omissão de issue/Project estão registradas no log preexistente de `tasks.md`; este relatório registra a mesma exceção para T003. Nenhuma outra tarefa foi iniciada.

## Estado preservado

O estado inicial já continha alterações não relacionadas em artefatos do backend, `.impeccable/`, `.tmp/`, `PRODUCT.md`, `.codex/` e `scripts/`. Esses caminhos não foram editados. O build gerou temporariamente `frontend/tsconfig.app.tsbuildinfo`, fora da posse de T003; essa alteração derivada foi restaurada antes do encerramento.

## RED — verificação objetiva de infraestrutura

Antes da implementação, a linha de base produziu:

| Comando | Resultado |
|---|---|
| `npm.cmd --prefix frontend run test:e2e:list` | código 0; 215 testes em 10 arquivos; os dois specs de T003 não estavam descobertos |
| `npm.cmd --prefix frontend run test:e2e -- --project=ui design-system.spec.ts design-pilots.spec.ts` | código 1; `Error: No tests found.` |
| `npm.cmd --prefix frontend ls @axe-core/playwright --depth=0` | código 1; `(empty)` |

Essa falha foi a lacuna de infraestrutura prevista por T003, não uma falha acidental de compilação nem um defeito de produto.

## GREEN — implementação mínima

Foram implementados apenas os caminhos sob posse de T003:

- `frontend/package.json`: `@axe-core/playwright` `^4.13.0` como dependência de desenvolvimento.
- `frontend/package-lock.json`: lock de `@axe-core/playwright` 4.13.0 e `axe-core` 4.13.0.
- `frontend/playwright.config.ts`: inclusão explícita de `design-system.spec.ts` e `design-pilots.spec.ts` em `uiTestFiles`; o projeto `real` permaneceu separado.
- `frontend/e2e/design-support.ts`: fixtures sintéticas, viewports 320/1440, emulação de claro/escuro, reduced motion, estabilização de animações, espera por fontes e auditoria axe com anexo dos resultados.
- `frontend/e2e/design-system.spec.ts`: caracterização da superfície pública de acesso em claro e escuro.
- `frontend/e2e/design-pilots.spec.ts`: caracterização sintética do catálogo do Mentor em claro e escuro.

Não existem `test.skip`/`test.fixme`, não há regra axe desabilitada globalmente e nenhum golden foi criado ou atualizado automaticamente.

## REFACTOR — validação após centralização

O setup comum, fixtures e auditoria foram centralizados em `design-support.ts`; o teste de catálogo passou a reutilizar a matriz de viewports em vez de repetir a largura desktop. Após esse refactor, as validações foram executadas novamente.

## Comandos e resultados finais

| Comando | Resultado |
|---|---|
| `npm.cmd --prefix frontend ci` | código 0; 857 pacotes adicionados/auditados; 0 vulnerabilidades; avisos de pacotes deprecated/install-scripts preexistentes da instalação |
| `npm.cmd --prefix frontend run test:e2e:list` | código 0; 219 testes em 12 arquivos; quatro casos novos descobertos no projeto `ui` |
| `npm.cmd --prefix frontend run test:e2e -- --project=ui design-system.spec.ts design-pilots.spec.ts` | código 0; 4/4 passaram em 3,3 s, contra preview local de produção |
| `npm.cmd --prefix frontend run lint` | código 0; ESLint sem avisos |
| `npm.cmd --prefix frontend run build` | código 0; 3.835 módulos transformados e bundle principal de 4.007,47 kB; avisos existentes de `/env.js`, imagem `laboratory.png` e chunk >500 kB |

O preview local foi iniciado em `http://127.0.0.1:4173/` apenas para o E2E direcionado e encerrado ao final.

## Achados axe caracterizados

Os testes anexaram os relatórios axe por caso e imprimiram estes achados, sem mascará-los para obter verde:

| Caso | Achados |
|---|---|
| acesso público — claro | 1 `color-contrast` (serious) |
| acesso público — escuro | 1 `color-contrast` (serious) |
| catálogo Mentor — claro | 1 `button-name` (critical) e 1 `color-contrast` (serious) |
| catálogo Mentor — escuro | 1 `button-name` (critical) e 1 `color-contrast` (serious) |

Esses achados são caracterização da implementação atual. A correção visual/semântica pertence às tarefas posteriores de tokens, primitivas e pilotos; T003 não altera código de produção. A auditoria automatizada não substitui teclado, zoom a 200%, leitor de tela, contraste medido e revisão visual humana.

## Limitações e escopo não executado

- O E2E executado foi somente o projeto `ui`, com preview local e fixtures sintéticas; o projeto `real` e a pilha Docker não foram executados por não fazerem parte da preparação T003.
- Não houve aceite visual, aprovação de golden, validação de leitor de tela ou auditoria manual completa; esses itens permanecem para as tarefas/marcos correspondentes.
- A CI/workflow não foi alterada. A integração da cobertura na CI é responsabilidade de T004.
- Avisos de build, npm e bundle foram registrados e não tratados como regressões desta tarefa.

## Confirmações de integridade

- `tasks.md` não foi editado.
- `cobertura.json`, scripts, workflows e código de produção não foram editados.
- Não houve commit, push, PR ou sincronização externa.
