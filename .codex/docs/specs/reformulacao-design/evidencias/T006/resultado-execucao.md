# T006 — Primitivas visuais, portais e tabela responsiva

Data da execução: 2026-09-22  
Issue/Project: não sincronizados por autorização explícita do usuário.

## Escopo entregue

- Primitivas UI sob `frontend/src/components/ui/**` passaram a consumir tokens semânticos e conservar Radix, portais, foco e estados existentes.
- `toast` e `sonner` deixaram de fixar tema claro; agora recebem o tema atual e usam superfícies, texto, borda e foco tokenizados.
- `ResponsiveTable`/registros/células, paginação e itens de ação receberam hierarquia, contraste, quebra de conteúdo longo e composição responsiva preservando os contratos existentes.
- `InfoCard` e `Container` receberam foco visível, superfície temática, leitura de notificação e comportamento estreito.
- Caracterizações de portais e largura estreita foram adicionadas ao `design-system.spec.ts`.

## TDD e validação

### RED

Foram adicionados casos de caracterização para diálogo/popover, foco devolvido, sonner temático, `InfoCard` acessível e teclado em largura estreita antes da implementação correspondente. O relatório detalhado do subagente não foi recuperado após sua interrupção; nenhum resultado RED é afirmado além dessa sequência observável.

### GREEN

Validações centrais após a implementação:

| Comando | Resultado real |
|---|---|
| `npm.cmd --prefix frontend run test -- --run src/components/ui src/components/global/table src/components/screens/InfoCard` | 14 arquivos, 36 testes aprovados |
| `npm.cmd --prefix frontend run test -- --run` | 132 arquivos, 618 testes aprovados |
| `npm.cmd --prefix frontend run lint` | aprovado, zero warnings |
| `npm.cmd --prefix frontend run build` | aprovado; somente avisos preexistentes de `/env.js`, imagem pública não resolvida e chunk grande |
| `docker compose -f docker-compose-e2e.yml up -d --build --wait` | aprovado; imagens reconstruídas e serviços saudáveis |
| `npm.cmd --prefix frontend run test:e2e -- --project=ui design-system.spec.ts design-pilots.spec.ts` | 6/6 aprovados em claro/escuro; teclado e largura estreita incluídos |
| `git diff --check` nos caminhos T006 | aprovado |

### REFACTOR

Classes locais fixas foram substituídas por aliases/tokens existentes, sem alterar contratos de domínio, autorização ou serviços. O detector mecânico do Impeccable foi executado uma vez sobre os alvos alterados e retornou `[]`.

## Achados residuais

O E2E registrou `color-contrast` sério no acesso público escuro e `button-name` crítico mais `color-contrast` sério no catálogo do Mentor. Esses nós continuam em consumidores legados fora da posse de T006; não foram mascarados nem desabilitados. T005 permanece bloqueada até a cobertura temática integral dessas superfícies.

Não houve commit, push, PR, alteração de release/proteção remota ou sincronização de issue/Project.
