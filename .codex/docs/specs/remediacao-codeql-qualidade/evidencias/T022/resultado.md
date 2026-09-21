# Evidência T022 — Dispor SmtpClient no EmailService

## Escopo

- Finding: CQ-0012, regra `cs/local-not-disposed`, Warning.
- Componente: `backend/LabSolos-Server-DotNet8/Services/EmailService.cs`.
- Teste focal: `backend/Tests/Services/EmailServiceTests.cs`.

## TDD

### RED

O baseline não possuía `EmailServiceTests.cs`. A implementação original criava `SmtpClient` sem descarte explícito, e o teste foi estruturado para observar o descarte em sucesso e exceção com um cliente sintético.

### GREEN

O serviço passou a usar fábrica e delegado de envio injetáveis para o teste, mantendo o envio real como comportamento padrão. `using var smtp` garante disposição do cliente mesmo quando o envio lança exceção.

Validação focal registrada após a implementação:

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~EmailServiceTests
```

Resultado: 2 testes aprovados, 0 falhas e 0 ignorados, sem servidor SMTP externo.

### REFACTOR

A criação padrão foi centralizada em `CriarSmtpClient`; a configuração do cliente permaneceu igual e a mensagem continua sendo disposta no mesmo escopo.

## Validações locais

- `git diff --check` foi executado e terminou com exit code 0.
- Code Quality será confirmado pela coordenação no SHA publicado.
