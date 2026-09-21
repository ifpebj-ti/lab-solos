# Evidência T023 — Corrigir condicional trivial na auditoria frontend

## Escopo

- Finding: CQ-0048, regra `js/trivial-conditional`, Warning.
- Componente: `frontend/src/pages/admin/Auditoria.tsx`.
- Teste focal: `frontend/e2e/responsive-layout.spec.ts`.

## TDD

### RED

O ramo `loading ? 'Carregando logs...' : 'Nenhum log encontrado'` era alcançado somente depois que o componente deixava o estado de loading; o CodeQL identificava `loading` como constante falsa nesse ponto. Foram adicionados cenários E2E para caracterizar loading, lista carregada, estado vazio e erro de carregamento.

### GREEN

O ramo constante foi reduzido para `Nenhum log encontrado`. O feedback de loading continua sendo renderizado pelo retorno antecipado enquanto `loading` é verdadeiro; os estados de lista, vazio e erro permanecem cobertos.

Validação focal com o Vite ativo em `http://127.0.0.1:4173`:

```text
npm run test:e2e -- responsive-layout.spec.ts --grep "T023 auditoria"
```

Resultado: 3 testes aprovados, 0 falhas.

### REFACTOR

Os fixtures e cenários foram mantidos no arquivo E2E existente, sem alterar contratos de API nem remover o feedback visual de carregamento.

## Validações

- `npm run lint`: aprovado, exit code 0.
- `npm run build`: aprovado, exit code 0; apenas avisos preexistentes de bundle/import.
- `npm run test:e2e -- responsive-layout.spec.ts --grep "T023 auditoria"`: 3/3 aprovados.
- `npm run test:e2e -- responsive-layout.spec.ts` com Vite ativo: 149 aprovados e 16 falhas preexistentes em T001/T005 por contadores de requisições (`Expected: 1`, `Received: 2`); nenhum cenário T023 falhou.
- A mesma suíte sem o servidor ativo falhou com `ERR_CONNECTION_REFUSED` em `127.0.0.1:4173`; isso foi corrigido iniciando o Vite para a validação focal e integral.
- `git diff --check`: aprovado, exit code 0.
