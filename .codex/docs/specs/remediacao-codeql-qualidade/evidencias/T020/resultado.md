# T020 — Comparação incompatível no suporte E2E

## Escopo

- Finding: `CQ-0008`
- Regra: `js/comparison-between-incompatible-types`
- Severidade: `Warning`
- Localização original: `frontend/e2e/responsive-support.ts:278`
- Componente: normalização do `requester`/`solicitante` das fixtures responsivas

## RED / caracterização

- A consulta remota da linha de base confirmou o finding Code Quality `#59` aberto e a mensagem de que `requester` era comparado a `null` depois de já ter sido separado pelo ramo `requester === null`.
- Foi adicionado o teste focal `T020 requester fixtures preserve null and populated branches` em `responsive-layout.spec.ts`, cobrindo uma fixture com requester preenchido e outra com `solicitante: null`.
- Caracterização antes da correção: `npm run test:e2e -- responsive-layout.spec.ts --grep "T020 requester"` passou com 1 teste. O comportamento executável já era preservado; o defeito era a comparação estática incompatível reportada pelo Code Quality.
- A primeira execução da suíte completa, antes de iniciar o preview, executou 161 testes e falhou com `ERR_CONNECTION_REFUSED` em `http://127.0.0.1:4173`. Isso foi classificado como limitação de infraestrutura, não como RED funcional.

## GREEN

- Removidas as comparações redundantes no ramo não nulo: `requester !== null` e `requester &&`.
- O teste focal repetido passou: 1/1.
- A suíte E2E completa passou com o preview local ativo:
  - `npm run test:e2e -- responsive-layout.spec.ts` — 162/162, 1,7 min.
- `npm run lint` em `frontend` — passou.
- `npm run build` em `frontend` — passou. O build manteve avisos preexistentes sobre `/env.js`, imagem não resolvida em build-time e tamanho de chunks.

## REFACTOR

- A normalização mantém os dois comportamentos das fixtures: requester preenchido continua sendo convertido em usuário sintético e requester nulo continua resultando em `solicitante: null`.
- Foram removidas apenas guardas redundantes, sem coerções adicionais ou alteração de semântica das fixtures compartilhadas.
- `git diff --check` — passou.

## Code Quality remoto e limitações

A confirmação de que o Warning desapareceu no Code Quality exige uma nova análise no SHA publicado. Esta execução não fez commit, push, merge ou abertura de PR, conforme a restrição da tarefa; portanto, a reconciliação remota permanece pendente para a etapa de publicação autorizada.

`tasks.md` não foi alterado.
