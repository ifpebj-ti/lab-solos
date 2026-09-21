# T024 — CQ-0005 em `UsuariosController.Adicionar`

- Data: 2026-09-21
- Issue: #237 — `In Progress` no Project `LabOn — Desenvolvimento e Qualidade`
- Finding: CQ-0005, `cs/catch-of-all-exceptions`, em `UsuariosController.cs:279`
- Escopo: estreitar o tratamento da falha secundária de notificação sem expor detalhes internos na resposta HTTP.

## RED

As caracterizações existentes cobrem o cadastro inválido (`400`) em
`CriticalRegistrationTests` e o conflito de aprovação de dependente já
processado (`400`) em `CriticalUserApprovalTests`.

Foi acrescentada uma caracterização focal para a lacuna do finding:

- `AdicionarUnexpectedNotificationFailureIsNotConvertedToCreated`;
- `AdicionarNotificationPersistenceFailurePreservesCreatedResponse`.

Com a implementação original, o comando focal produziu **1 falha e 1
aprovação**. A falha esperada foi `Assert.Throws() Failure: No exception was
thrown`: uma `InvalidOperationException` inesperada era capturada pelo
`catch (Exception)` e o fluxo retornava `CreatedAtAction`.

Comando RED:

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~UsuariosControllerRegistrationFailureTests --nologo --no-restore
```

## GREEN

O catch do bloco de notificação foi restringido para `DbUpdateException`, a
falha esperada de persistência da notificação. O diagnóstico passou a usar
`_logger.LogError` com o `UsuarioId`; `Exception.Message` não é interpolada nem
retornada ao cliente. Exceções inesperadas deixam de ser engolidas e são
tratadas pelo `ApiExceptionFilter`, que mantém a resposta 500 sanitizada com
identificador de correlação.

O teste focal passou com **2/2**:

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~UsuariosControllerRegistrationFailureTests --nologo --no-restore
```

## REFACTOR

Não foi necessária extração adicional: o mapeamento existente de validação,
conflito e senha foi preservado. O bloco de notificação ficou menor, com
exceção específica e logging estruturado.

## Validação obrigatória

Os comandos abaixo foram executados após GREEN, mas os testes de integração
não chegaram aos casos porque o fixture PostgreSQL não conseguiu conectar ao
Docker Engine em `npipe://./pipe/docker_engine`:

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~CriticalRegistrationTests
```

- **Falhou antes da execução funcional**: 4 falhas de inicialização por `DockerUnavailableException`; 0 aprovados.

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~CriticalUserApprovalTests
```

- **Falhou antes da execução funcional**: 13 falhas de inicialização por `DockerUnavailableException`; 0 aprovados.

```text
git diff --check
```

- **Passou** (exit 0).

## Arquivos alterados

- `backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs`
- `backend/Tests/Integration/CriticalRegistrationTests.cs`
- `.codex/docs/specs/remediacao-codeql-qualidade/evidencias/T024/resultado.md`

`tasks.md`, `CriticalUserApprovalTests.cs` e arquivos fora do escopo não foram
alterados. A confirmação remota do desaparecimento do finding depende de uma
análise Code Quality em um SHA publicado; nenhum commit, push ou PR foi criado
nesta execução.
