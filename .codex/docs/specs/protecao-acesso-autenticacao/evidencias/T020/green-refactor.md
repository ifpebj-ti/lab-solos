# T020 — GREEN e REFACTOR

## Implementação

- Criado `ProfileContactForm`, reutilizado nos perfis de Administrador, Mentor e Mentorado. O formulário começa fechado e edita somente nome, e-mail e telefone do titular; não apresenta campo de status nem dados de dependente.
- Criado `updateOwnUserProfile`, que emite JSON Patch apenas para os campos alterados. A troca de e-mail exige senha atual e acrescenta `/senhaAtual` ao mesmo documento; o adaptador não envia `/status`.
- O formulário preserva nome, e-mail e telefone digitados quando a API retorna 400 ou 409, mostra feedback genérico sanitizado e apaga a senha ao concluir, cancelar, voltar ao e-mail original ou desmontar.
- Adicionados testes de contrato HTTP/JSON Patch, feedback/limpeza da senha e integração nos três perfis. O GET de acompanhamento e os adaptadores previamente existentes em `Users.ts` foram preservados.

## Validações

```text
npm.cmd run test -- --run src/components/auth/ProfileContactForm.test.tsx src/integration/Users.profileUpdate.test.ts src/pages/Profile.test.tsx
Test Files 3 passed (3)
Tests      16 passed (16)

npm.cmd run test -- --run src/components/auth/ProfileContactForm.test.tsx src/integration/Users.profileUpdate.test.ts src/pages/Profile.test.tsx src/contracts/userProfileConsumers.test.tsx
Test Files 4 passed (4)
Tests      27 passed (27)

npm.cmd run lint
ESLint concluiu sem erros ou avisos.

npm.cmd run build
TypeScript e Vite concluíram com código 0.

git diff --check
Sem erros de whitespace.
```

O primeiro build apontou dois problemas de tipagem nos testes novos; eles foram corrigidos e o build final passou. O build final manteve avisos já conhecidos: `/env.js` não é agrupado como script sem `type="module"`, `laboratory.png` fica para resolução em runtime e há chunks acima de 500 kB.

`npm.cmd ci` foi necessário porque o worktree não tinha `node_modules`; o lockfile não foi alterado. O audit informado pela instalação identificou 10 vulnerabilidades no grafo bloqueado (2 moderadas e 8 altas). Nenhuma dependência foi atualizada.

O `git diff --check` também mostrou apenas avisos de conversão LF/CRLF em arquivos compartilhados de outras tarefas, sem apontar whitespace inválido.
