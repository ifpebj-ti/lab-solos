# Evidência T021 — Dispor recursos do AuditoriaMiddleware

## Escopo

- Finding: CQ-0011, regra `cs/local-not-disposed`, Warning.
- Branch local: `feature/codeql-t021-auditoria`.
- SHA/commit: ainda não criado.
- Arquivos da tarefa alterados:
  - `backend/LabSolos-Server-DotNet8/Middlewares/AuditoriaMiddleware.cs`
  - `backend/Tests/Middlewares/AuditoriaMiddlewareTests.cs`

## TDD observado

### Linha de base

Comando:

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~AuditoriaMiddlewareTests --nologo
```

Resultado: processo terminou com código 0, mas nenhum teste correspondeu ao filtro; a suíte focal ainda não existia.

### RED

Foi adicionada a suíte focal com cenários de sucesso e exceção, usando `ThrowOnceOnReadStream` e `TrackingStreamReader`. Antes da assinatura de teste existir, a execução falhou na compilação com `CS1729`: `AuditoriaMiddleware` não continha construtor que aceitasse os três argumentos necessários para injetar o leitor rastreável.

Antes da asserção de descarte, a caracterização funcional do código original passou 2/2, demonstrando que o corpo e o log já eram preservados; isso não comprovava o descarte do `StreamReader` local.

### GREEN

Após adicionar a fábrica opcional `Func<Stream, TextReader>` e o escopo `using var reader`, o comando focal terminou com código 0:

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~AuditoriaMiddlewareTests --nologo --no-restore
```

Resultado: 2 testes aprovados, 0 falhas, 0 ignorados.

O leitor padrão agora é construído com `leaveOpen: true`; o `using` dispõe o leitor em sucesso e exceção sem fechar o stream da requisição antes da continuação da pipeline.

## Validações

- `dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~Integration --nologo --no-restore` foi executado; 62 testes falharam antes da execução funcional porque o Docker não estava disponível em `npipe://./pipe/docker_engine`. A falha foi classificada como limitação ambiental do Testcontainers.
- `git diff --check` foi executado no código, teste e evidência; exit code 0.
- Code Quality será validado pela coordenação após a publicação.
- A evidência foi registrada antes do commit/push da implementação.
