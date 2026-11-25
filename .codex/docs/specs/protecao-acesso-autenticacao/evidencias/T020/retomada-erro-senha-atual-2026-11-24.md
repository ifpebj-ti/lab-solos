# Retomada T020 — erro da senha atual

- Data: 2026-11-24
- Escopo: consumir o código específico de `errors.senhaAtual` no formulário próprio.
- Stack E2E: não iniciada; a execução real da T025 estava em andamento e manteve sua composição isolada.

## RED

Atualizei o mock de `ProfileContactForm.test.tsx` para corresponder ao corpo da API: `code: "validation_failed"` na raiz e `current_password_invalid` em `errors.senhaAtual`. A validação reproduziu o erro: o alerta dizia “Não foi possível atualizar o perfil. Revise os dados e tente novamente.” em vez da mensagem específica de senha incorreta. O cenário já verificava que o formulário mantinha os dados digitados, limpava a senha e não chamava `onSaved`.

Comando executado em `frontend`:

```text
npm.cmd run test -- --run src/components/auth/ProfileContactForm.test.tsx
```

Resultado RED: 4/5 passaram; o cenário de senha incorreta falhou pela mensagem genérica.

## GREEN / REFACTOR

`ProfileContactForm` agora também consulta o erro normalizado do campo `currentPassword`, comparando com a mensagem catalogada para `current_password_invalid`. Assim, a mensagem específica é exibida tanto quando o código está na raiz quanto quando está no erro de campo, sem ler texto remoto arbitrário. O teste cobre o código geral real, mantém a asserção da mensagem, confirma que a senha foi limpa e que `onSaved` não executou.

## Validação

| Comando | Resultado |
|---|---|
| `npm.cmd run test -- --run src/components/auth/ProfileContactForm.test.tsx src/integration/Users.profileUpdate.test.ts src/pages/Profile.test.tsx` | 3 arquivos, 19/19 testes passaram. |
| `npm.cmd run lint` | Aprovado, sem avisos. |
| `npm.cmd run build` | Aprovado; avisos existentes de `/env.js`, `laboratory.png` e chunks maiores que 500 kB. |
| `git diff --check -- frontend/src/components/auth/ProfileContactForm.tsx frontend/src/components/auth/ProfileContactForm.test.tsx` | Aprovado. |
| Hash de `frontend/tsconfig.app.tsbuildinfo` antes/depois do build | Idêntico: `5DFFAD801A9AB8EF895E51E3A04311176D9FC613B4C070EB3399E166F6426800`. |

O diff de `ProfileContactForm` e seu teste já continha mudanças de outras etapas; esta retomada alterou somente a classificação do erro de senha e adicionou `validation_failed` ao cenário existente. A cópia temporária usada para proteger `tsconfig.app.tsbuildinfo` permaneceu como `frontend/tsconfig.app.tsbuildinfo.t020-backup` porque a remoção local foi rejeitada pela política do ambiente. Ela tem o mesmo hash do arquivo original. Não houve alteração em Docker, GitHub, Wiki, commit ou push.
