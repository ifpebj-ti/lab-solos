# T005 — Tokens e preferência de tema resiliente

Data da execução: 2026-09-22  
Escopo: tokens semânticos, aliases legados, resolução/persistência de tema, inicialização pré-mount e cobertura de tema do design-system.  
Issue/Project: não sincronizados por autorização explícita do usuário.

## RED

- Linha de base: `npm.cmd --prefix frontend run test -- --run src/theme` falhou com `No test files found`.
- Após escrever os testes, a mesma suíte falhou em 3 arquivos porque `themePreference`, `ThemeProvider` e `ThemeSwitch` ainda não existiam. Essa foi a falha comportamental esperada, não uma falha acidental de ambiente.

## GREEN

Implementados:

- `labon.theme.v1` com valores somente `light`/`dark`, fallback seguro para storage indisponível e resolução pelo sistema.
- Precedência de escolha explícita, sincronização por `storage`, atualização por `matchMedia` somente sem escolha explícita e aplicação de `.dark`, `data-theme` e `color-scheme`.
- `theme-init.ts` como módulo local carregado antes de `main.tsx` no HTML.
- Tokens semânticos claro/escuro e aliases temporários para `primaryMy`, `backgroundMy`, `borderMy`, `clt-*`, tabela e status.
- `ThemeProvider` e `ThemeSwitch` acessível preparado para consumidores seguintes. O switch não foi exposto globalmente porque consumidores legados fora da posse ainda impedem declarar cobertura temática integral.

Resultado focado após GREEN: 3 arquivos, 10 testes aprovados.

## REFACTOR

- Contexto e hook separados em `themeContext.ts` para manter Fast Refresh e lint limpos.
- Eventos externos foram tipados no stub de `matchMedia`; nenhum contrato de domínio, permissão, sessão ou ativo foi alterado.
- Resultado final da suíte de tema: 3 arquivos, 10 testes aprovados.

## Validações finais

| Comando | Resultado |
|---|---|
| `npm.cmd --prefix frontend run test -- --run src/theme` | aprovado — 3 arquivos, 10 testes |
| `npm.cmd --prefix frontend run test -- --run` | aprovado — 131 arquivos, 615 testes |
| `npm.cmd --prefix frontend run lint` | aprovado, zero warnings |
| `npm.cmd --prefix frontend run build` | aprovado; avisos preexistentes de `/env.js`, imagem pública não resolvida em build e chunk >500 kB |
| `docker compose -f docker-compose-e2e.yml up -d --build --wait` | aprovado; backend, banco, frontend e SMTP saudáveis |
| `npm.cmd --prefix frontend run test:e2e -- --project=ui design-system.spec.ts` | aprovado — 2/2 temas |
| `npm.cmd --prefix frontend run test:e2e -- --project=ui design-system.spec.ts design-pilots.spec.ts` | aprovado — 4/4 testes |
| `git diff --check` | aprovado |

## Contraste medido

Pares dos tokens RGB medidos pela fórmula WCAG 2 relativa:

| Par | Relação |
|---|---:|
| claro: canvas/text-primary | 14,75:1 |
| claro: surface/text-secondary | 8,83:1 |
| escuro: canvas/text-primary | 16,07:1 |
| escuro: surface/text-secondary | 10,80:1 |
| ação/texto branco | 6,49:1 |

## Detector mecânico — única execução

Comando executado uma única vez após a implementação:

```text
C:\Users\Nathan\.codex\skills\impeccable\scripts\impeccable.cmd detect --json frontend/src/index.css frontend/src/App.tsx frontend/index.html frontend/src/theme/themePreference.ts frontend/src/theme/ThemeProvider.tsx frontend/src/theme/themeContext.ts frontend/src/theme/ThemeSwitch.tsx frontend/src/theme-init.ts frontend/src/styles/tokens.css
```

Resultado: exit 0; seis avisos `overused-font` para os `@font-face` Inter existentes em `frontend/src/index.css`. Nenhuma fonte ou ativo foi criado/substituído; a preservação foi mantida conforme a task.

## Achados e pré-requisitos

- O axe passou funcionalmente nos 4 E2E, mas registrou `color-contrast` sério no acesso público escuro e `button-name` crítico + `color-contrast` sério no catálogo do Mentor em claro/escuro. Os nós pertencem a consumidores legados fora da posse T005; não foram mascarados nem desabilitados.
- `frontend/src/components/ui/sonner.tsx` e `frontend/src/components/ui/toast.tsx` ainda usam superfícies, texto e `color-scheme: light` fixos. Migrá-los é pré-requisito antes de expor o `ThemeSwitch` como controle global e declarar cobertura temática integral.
- `tasks.md` não foi editado, não houve issue/Project, commit, push ou PR.

