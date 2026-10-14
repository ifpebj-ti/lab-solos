# RED T005

## Linha de base

Comando antes dos novos casos:

```powershell
npm.cmd run test -- --run src/errors src/components/global/ErrorFeedback.test.tsx
```

Resultado: 7 arquivos de teste, 35 testes aprovados.

## Falha comportamental

Os novos testes foram executados depois do scaffolding de tipos/categoria necessario para compilar o contrato, antes da implementacao de parsing e apresentacao.

Comando:

```powershell
npm.cmd run test -- --run src/errors src/components/global/ErrorFeedback.test.tsx
```

Resultado RED: 5 arquivos falharam; 9 testes falharam e 35 passaram. As lacunas observadas foram: `isApplicationError` aceitava espera zero/fracionaria; 429 era `unknown`; `Retry-After` e `retryAfterSeconds` nao chegavam ao modelo/presentacao; `profile_update_conflict` nao era conhecido; `senhaAtual` nao era associada ao campo `currentPassword`; e a navegacao segura de 401 nao era oferecida. Uma assercao de inventario de categorias tambem precisou ser atualizada para incluir a categoria nova.
