# GREEN, REFACTOR e regressao T005

## Implementacao

- Adicionada a categoria `rate_limited` com orientacao local generica e sem repeticao automatica.
- Normalizado o 429 e parseado `Retry-After` como delay inteiro ou HTTP-date estrita; somente espera inteira positiva e segura e preservada. A extensao numerica do corpo e fallback validado. Mensagens remotas nao sao copiadas.
- Propagado `retryAfterSeconds` por `ApplicationError` e `ErrorPresentation`; quando presente, a acao informa o prazo dentro do alerta acessivel.
- Preservada a acao segura de navegacao para 403/404 e incluida para 401, com rotulo `Entrar novamente`.
- Incluidos `profile_update_conflict` e `authentication_rate_limited` na allowlist e o alias transititorio `senhaAtual` para o campo de UI `currentPassword`.
- Nenhum formulario ou dependencia foi alterado.

## Validacoes

Executadas no worktree T005:

```powershell
corepack npm ci
corepack npm run test -- --run src/errors src/components/global/ErrorFeedback.test.tsx
corepack npm run lint
corepack npm run build
npm.cmd run test -- --run
git diff --check
```

- Foco exigido: 7 arquivos, 44 testes aprovados (npm 10.8.2 via Corepack).
- Suite frontend completa: 141 arquivos, 660 testes aprovados (npm 11.19.0; a validacao focada, lint e build tambem foram repetidos com npm 10.8.2).
- Lint: aprovado, zero warnings.
- Build: aprovado. Avisos existentes: `/env.js` nao e bundled sem `type="module"`; `public/images/laboratory.png` fica para resolucao em runtime; chunks acima de 500 kB.
- `git diff --check`: aprovado.

## Arquivos

Fontes e testes alterados:

- `frontend/src/errors/applicationError.ts` e `frontend/src/errors/applicationError.test.ts`
- `frontend/src/errors/errorCatalog.ts` e `frontend/src/errors/errorCatalog.test.ts`
- `frontend/src/errors/normalizeError.ts` e `frontend/src/errors/normalizeError.test.ts`
- `frontend/src/errors/presentError.ts` e `frontend/src/errors/presentError.test.ts`
- `frontend/src/components/global/ErrorFeedback.tsx` e `frontend/src/components/global/ErrorFeedback.test.tsx`
