# PRD: Frontend responsivo

- Status: pronto
- Responsável: não definido
- Atualizado em: 2026-08-04
- Validação de descoberta: confirmada
- Issues relacionadas: #229, #230, #231

## Contexto e problema

O cadastro usa `w-[750px]` e grade fixo; tabelas globais usam flex horizontal e larguras inline. Em mobile, listagens como produtos ultrapassam o viewport e exigem rolagem lateral.

## Objetivo e métricas de sucesso

Eliminar overflow horizontal normal entre 320 px e desktop e criar padrão reutilizável: cards abaixo de `md`, tabela/lista a partir de `md`. Cadastro e ações devem permanecer legíveis, operáveis por teclado e sem regressão desktop.

## Usuários e jornadas

Usuários em celular cadastram conta, consultam produtos e acionam linhas; usuários desktop mantêm densidade e navegação atuais.

## Escopo

### Incluído

- Primitivas globais Header/Item/ItemClickable/ItemOnly/TableItemWithActions e variantes usadas.
- Busca/listagem de produtos e cadastro de conta.
- Estados vazio, carregamento, conteúdo longo e ações em 320/375/768/desktop.

### Fora de escopo

- Redesign visual de módulos não consumidores das primitivas.
- Aplicativo nativo.

## Requisitos funcionais

### RF-001 — Padrão adaptativo

Listagens devem renderizar cards rotulados abaixo de `md` e modo tabular a partir de `md`, preservando dados prioritários e ações.

### RF-002 — Cadastro adaptativo

O formulário deve usar largura fluida, uma coluna em telas pequenas e duas quando houver espaço.

### RF-003 — Migração de consumidores

Busca de produtos e consumidores globais afetados devem adotar a primitiva sem correções pontuais incompatíveis.

## Requisitos não funcionais

### RNF-001 — Viewport e acessibilidade

Não deve haver scroll horizontal da página em 320 px; foco, ordem de leitura, nomes de ações e contraste permanecem acessíveis.

### RNF-002 — Compatibilidade desktop

Desktop/tablet preservam conteúdo, ações e densidade funcional.

## Critérios de aceitação

### CA-001 — Cards mobile (RF-001, RNF-001)

- Dado um viewport abaixo de `md` e conteúdo longo
- Quando uma listagem é exibida
- Então cada registro aparece como card rotulado, ações são alcançáveis e a página não transborda horizontalmente

### CA-002 — Cadastro mobile (RF-002, RNF-001)

- Dado um viewport de 320 px
- Quando a conta é preenchida
- Então campos e botões cabem em uma coluna sem corte ou scroll lateral

### CA-003 — Desktop (RF-001, RF-003, RNF-002)

- Dado um viewport a partir de `md`
- Quando listagens e cadastro são usados
- Então o modo tabular/grade mantém todos os dados e ações

## Estratégia de validação

Vitest/RTL para variantes e acessibilidade; Playwright em viewports 320, 375, 768 e desktop, incluindo overflow e interações.

## Dependências e riscos

Depende da infraestrutura de testes do frontend. Variantes de tabela têm funções de retorno distintas; migrar por consumidor e caracterizar ações antes de consolidar.

## Suposições

- Breakpoint `md` do Tailwind permanece o divisor.

## Perguntas abertas

Nenhuma bloqueante.

## Decisões da validação de descoberta

| Decisão | Recomendação | Resposta confirmada | Impacto |
|---|---|---|---|
| Estratégia mobile | Cards abaixo de `md` | Confirmado | Remove overflow com rótulos explícitos |
