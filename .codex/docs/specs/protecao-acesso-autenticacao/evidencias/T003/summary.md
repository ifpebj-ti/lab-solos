# Evidências T003 — predicados de acesso

## Sincronização

- Issue de execução: #436, aberta no repositório `ifpebj-ti/lab-solos`.
- Responsável confirmado: `nathannmvr`.
- Project configurado: 41 (`LabOn — Desenvolvimento e Qualidade`); item confirmado em `In Progress`.
- T003 não é a última tarefa da issue; o status permanece `In Progress`.

## RED, GREEN e REFACTOR

- Caracterização anterior à mudança: `dotnet test backend/Tests/Tests.csproj -c Release --no-build --no-restore --filter "FullyQualifiedName~CriticalUserApprovalTests|FullyQualifiedName~RequiredPasswordChangeAuthorizationTests" --nologo --verbosity quiet` — 14 aprovados.
- RED comportamental: `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~UserResourceAccessTests"` — 6 falhas e 2 aprovações em 8 testes. As falhas demonstraram que as expressões permissivas deixavam passar acesso cruzado entre mentorados, mentor sem vínculo, papel não suportado e identidade ausente/conflitante. Ver `red-tests.log`.
- GREEN inicial: mesmo filtro — 8 aprovados. Ver `green-tests-before-refactor.log`.
- REFACTOR: nomes dos testes sem separadores, resolução estrita de subject/role a partir da identidade autenticada e recusa de claims conflitantes. Reexecução do filtro — 9 aprovados, 0 falhas; nenhum aviso de análise novo nos dois arquivos T003. Ver `green-tests.log`.

Uma tentativa inicial de compilação do teste usou a sobrecarga errada de `ClaimsIdentity` (`CS1503`, conversão de `Claim[]` para `string?`). Corrigida antes de contar o RED; ela não é evidência de falha comportamental. O registro está em `compile-check-not-red.log`.

## Regressão e qualidade

- `dotnet build backend/backend.sln -c Release --nologo --disable-build-servers` — sucesso, 0 avisos e 0 erros. Ver `backend-build.log`.
- Regressão de vínculos e troca obrigatória: `dotnet test backend/Tests/Tests.csproj -c Release --no-build --no-restore --filter "FullyQualifiedName~CriticalUserApprovalTests|FullyQualifiedName~RequiredPasswordChangeAuthorizationTests" --nologo --verbosity quiet` — 14 aprovados, 0 falhas. Ver `authorization-regression.log`.
- O workflow `.github/workflows/container-ci.yml` valida pull requests para `develop`; o job `backend-quality` executa testes backend antes do merge.
- Os testes são unitários e não precisam de Docker/PostgreSQL. A validação de integração completa não fez parte de T003.

## Escopo e limites

O serviço resolve subject e papel da identidade autenticada, falha fechado diante de identidade ausente, inválida ou claims conflitantes, e fornece expressões para perfis, mentorados vinculados e empréstimos por solicitante, aprovador ou vínculo. Os controllers não foram alterados, conforme o escopo de T003; a autorização só terá efeito HTTP após a integração nas tarefas proprietárias dos controllers. A política existente de troca obrigatória de senha permaneceu intacta e sua caracterização continuou verde.
