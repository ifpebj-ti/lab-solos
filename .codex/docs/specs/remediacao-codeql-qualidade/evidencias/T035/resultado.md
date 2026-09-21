# T035 — Simplificar nested if em `UsuariosController`

- Finding: `CQ-0004`, regra `cs/nested-if-statements`, severidade `Note`.
- Escopo: validação do `Status` no fluxo de atualização parcial de usuário.
- Issue/Project: issue #237 pertence a `ifpebj-ti/lab-solos`, está atribuída a `nathannmvr` e o item do Project 41 está em `In Progress`.
- Status local: correção e validações concluídas; confirmação remota do encerramento do finding depende de uma execução Code Quality em commit publicado.

## RED — caracterização

A suíte focal existente caracteriza as respostas do fluxo de aprovação para as combinações de identidade e perfil, além de usuário inexistente e usuário já processado:

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~CriticalUserApprovalTests --nologo --no-restore --logger "console;verbosity=minimal"
```

Na primeira execução, os 13 cenários falharam antes de iniciar por indisponibilidade do Docker/Testcontainers (`DockerUnavailableException`, endpoint `npipe://./pipe/docker_engine`). O Docker Desktop foi iniciado localmente; não houve falha funcional observada nos testes.

## GREEN — correção mínima

O `if` que validava o status foi combinado em uma única condição equivalente:

- o patch precisa alterar o status;
- o novo status precisa estar preenchido;
- o valor precisa ser inválido para `StatusUsuario`.

A resposta `BadRequest`, a mensagem, a autorização e a persistência dos demais ramos permaneceram inalteradas.

Após a disponibilidade do Docker:

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~CriticalUserApprovalTests --nologo --no-restore --logger "console;verbosity=minimal"
Resultado: 13 aprovados, 0 falhas.
```

## REFACTOR

O aninhamento foi removido sem duplicar a autorização ou alterar os ramos de aprovação/rejeição. A regressão backend completa permaneceu verde:

```text
dotnet test backend/Tests/Tests.csproj --no-build --no-restore -c Release --nologo --logger "console;verbosity=minimal"
Resultado: 263 aprovados, 0 falhas.

dotnet build backend/backend.sln --no-restore -c Release --nologo --disable-build-servers -v:q
Resultado: 0 erros; 203 avisos de analisadores já existentes.

git diff --check -- backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs backend/Tests/Integration/CriticalUserApprovalTests.cs .codex/docs/specs/remediacao-codeql-qualidade/evidencias/T035
Resultado: aprovado.
```

## Arquivos sob responsabilidade

- Alterado: `backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs`.
- Não alterado: `backend/Tests/Integration/CriticalUserApprovalTests.cs`; os testes de caracterização existentes foram suficientes e permaneceram intactos.
- Adicionado: este registro em `evidencias/T035/resultado.md`.

## Lacunas e preexistências

- Os avisos do build são preexistentes e estão fora do escopo de CQ-0004.
- A análise Code Quality/CodeQL pós-commit não foi executada, pois esta execução foi explicitamente limitada a não fazer commit, push, merge ou Pull Request. Portanto, o desaparecimento remoto de `CQ-0004` permanece pendente de publicação e análise do commit.
