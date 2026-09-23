# T007 — Campos associados, estados de coleção e composição lista-detalhe

Data da execução: 2026-09-22  
Issue/Project: não sincronizados por autorização explícita do usuário.

## Escopo entregue

- `PopoverInput` real recebeu id/label associados, `role=combobox`, `type=button`, `aria-invalid`, erro associado e busca em portal com superfície temática.
- `PageHeader` e `RecordWorkspace` foram criados sem chamadas HTTP, mantendo o contexto de apresentação e retorno móvel.
- `CollectionFeedback` diferencia carregamento, vazio inicial, filtro vazio, falha e atualização com dados anteriores, com recuperação anunciada.
- `ErrorFeedback` e os consumidores sob a posse receberam estados/foco/contraste compatíveis com os tokens; nenhum contrato de domínio ou autorização foi alterado.
- Caracterizações E2E cobrem associação do PopoverInput em claro/escuro e teclado/largura estreita.

## TDD e validação

### RED

Foram criados testes para o PopoverInput real, CollectionFeedback, PageHeader e RecordWorkspace antes dos componentes/garantias correspondentes. O relatório RED detalhado do subagente não foi recuperado após sua interrupção; não há resultado RED numérico inventado.

### GREEN/REFACTOR

| Comando | Resultado real |
|---|---|
| `npm.cmd --prefix frontend run test -- --run src/components/global/inputs src/components/global/CollectionFeedback src/components/global/ErrorFeedback src/components/layout` | 8 arquivos, 12 testes aprovados |
| `npm.cmd --prefix frontend run test -- --run` | 136 arquivos, 623 testes aprovados |
| `npm.cmd --prefix frontend run lint` | aprovado, zero warnings |
| `npm.cmd --prefix frontend run build` | aprovado; somente avisos preexistentes de `/env.js`, imagem pública não resolvida e chunk grande |
| `docker compose -f docker-compose-e2e.yml up -d --build --wait` | aprovado; frontend reconstruído e serviços saudáveis |
| `npm.cmd --prefix frontend run test:e2e -- --project=ui design-system.spec.ts` | 6/6 aprovados em claro/escuro, incluindo PopoverInput e teclado/largura estreita |
| `git diff --check` nos caminhos T007 | aprovado |

O detector Impeccable foi executado uma vez nos alvos UI da task e retornou `[]`. Após a revisão, a superfície do PopoverInput foi ajustada de `bg-white` para `bg-surface` e o E2E foi repetido com 6/6 aprovados.

## Achados residuais

O E2E continua registrando `color-contrast` sério somente no acesso público escuro. O nó pertence a consumidor legado fora da posse T007; não foi mascarado nem desabilitado. O catálogo/mentor permanece com os achados já registrados em T003/T006.

Não houve commit, push, PR, alteração de release/proteção remota ou sincronização de issue/Project.
