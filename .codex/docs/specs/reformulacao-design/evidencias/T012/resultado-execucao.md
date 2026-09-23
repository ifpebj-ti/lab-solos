# T012 — Resultado de execução

Data: 2026-09-22

## RED

Os testes críticos e responsivos existentes caracterizaram o contrato de criação: `diasParaDevolucao: 5`, produtos com `produtoId` e `quantidade`, envio único enquanto pendente, preservação da seleção após recusa, limpeza somente após sucesso, remoção local e PopoverInput acessível. A superfície precisava de estados explícitos para falhas de referências e submissão, além de uma composição visual temática para claro/escuro e largura estreita.

## GREEN

- `npm.cmd --prefix frontend run test -- --run --reporter=dot src/pages/mentor/LoanCreation.critical.test.tsx src/pages/mentor/LoanCreation.responsive.test.tsx`: 2 arquivos, 6 testes aprovados.
- `npm.cmd --prefix frontend run test -- --run --reporter=dot`: 138 arquivos, 639 testes aprovados.
- `npm.cmd --prefix frontend run lint`: aprovado sem warnings.
- `npx.cmd --prefix frontend tsc --noEmit -p frontend/tsconfig.app.json`: aprovado.
- `npm.cmd --prefix frontend run build`: aprovado.
- `impeccable.cmd detect --json` nos alvos da T012: `[]`.
- `design-pilots.spec.ts`: 8/8 cenários aprovados no build local; criação de empréstimo 2/2 em claro/escuro a 320 px com axe 0/0; login 4/4 a 320/1440 px com axe 0/0; catálogo 2/2, mantendo achados legados `button-name`/`color-contrast` fora da posse da T012.
- `git diff --check`: aprovado.

## Implementação

`LoanCreation` passou a carregar produtos e dependentes independentemente, oferecer retry contextual e manter dados válidos quando a outra coleção falha. A submissão tem estado próprio, bloqueio contra duplo envio, feedback de erro retentável e preserva itens/seleção após recusa. O payload enviado permanece exatamente com `diasParaDevolucao: 5` e `produtos[{produtoId, quantidade}]`; unidade, dependente e seleção permanecem contextos de UI sem conversão persistida no payload. O estado vazio do ResponsiveTable também foi tornado semanticamente válido para leitores de tela.

## Limitação de ambiente

O Docker Desktop/daemon não estava disponível nesta sessão; o compose E2E dependente de backend não pôde ser reconstruído. Os pilotos foram executados contra o build local com rotas de referências interceptadas pelo Playwright. Nenhum container foi derrubado ou alterado.

Sem issue/Project por autorização explícita; sem commit, push ou PR.
