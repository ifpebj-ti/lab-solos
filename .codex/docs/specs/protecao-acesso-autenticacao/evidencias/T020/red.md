# T020 — RED

## Linha de base

Em `frontend`, após `npm.cmd ci`, a linha de base dos testes de perfil e consumidores passou:

```text
npm.cmd run test -- --run src/pages/Profile.test.tsx src/contracts/userProfileConsumers.test.tsx
Test Files 2 passed (2)
Tests      16 passed (16)
```

## Falha comportamental

Foi acrescentado a `Profile.test.tsx` um teste que exige um controle acessível para iniciar a edição do próprio perfil. Antes de implementar o formulário, o comando abaixo falhou porque o botão ainda não existia; a execução carregou o componente e chegou à asserção de comportamento.

```text
npm.cmd run test -- --run src/pages/Profile.test.tsx -t "permite iniciar a edição do próprio perfil"
Test Files 1 failed (1)
Tests      1 failed | 5 skipped (6)
Falha: Unable to find an accessible element with role "button" and name "Editar meus dados"
```

O RED demonstra a ausência da jornada de edição e não um erro de compilação ou ambiente.
