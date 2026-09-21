# T026 — Restringir catches de EmailController

- Issue: #237
- Project: 41
- Status sincronizado antes do RED: `In Progress`
- Assignee confirmado: `nathannmvr`
- Findings tratados: CQ-0009 e CQ-0010 (`cs/catch-of-all-exceptions`, `Note`)
- Execução: local, sem commit, push ou Pull Request, conforme autorização da tarefa

## Escopo e arquivos

Arquivos alterados exclusivamente no escopo autorizado:

- `backend/LabSolos-Server-DotNet8/Controllers/EmailController.cs`
- `backend/Tests/Controllers/EmailControllerTests.cs` (criado; não existia)
- `.codex/docs/specs/remediacao-codeql-qualidade/evidencias/T026/resultado.md`

Não foram alterados `tasks.md`, `PasswordRecoveryTests.cs` ou outros arquivos de código-fonte.

## RED

Linha de base antes da implementação:

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~PasswordRecoveryTests --nologo --no-restore
Resultado: 6/6 aprovados.
```

Foi criado o teste focal com sucesso, falhas operacionais SMTP e falhas inesperadas nos dois endpoints. Antes da correção:

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~EmailControllerTests --nologo --no-restore
Resultado: 3 aprovados, 2 falhos, 5 total.
Falhas esperadas:
- EnviarEmailUnexpectedFailureIsNotMasked: nenhum ArgumentException foi propagado.
- RequestPasswordResetUnexpectedFailureIsNotMasked: nenhum ArgumentException foi propagado.
```

As falhas demonstraram que os dois `catch (Exception)` mascaravam exceções inesperadas.

## GREEN

O `EmailController` passou a capturar somente as falhas concretas esperadas pelo `EmailService`: `SmtpException`, `InvalidOperationException` e `FormatException`.

- `EnviarEmail`: preserva `200` no sucesso e `500` para falha operacional esperada.
- `RequestPasswordReset`: preserva `202 Accepted` e resposta neutra para falha operacional esperada.
- `ArgumentException` inesperada não é capturada pelos endpoints e continua disponível para o pipeline de exceções.
- O log de falha esperada preserva a exceção por `LoggerMessage`, sem expor detalhes na resposta.

Validação após a implementação mínima:

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~EmailControllerTests --nologo --no-restore
Resultado: 5/5 aprovados.
```

## REFACTOR

O tratamento do retorno `500` foi centralizado em `EmailDeliveryFailureResponse`, mantendo os catches tipados explícitos. O logging compartilhado usa um delegado `LoggerMessage`. Os dublês repetidos do teste foram centralizados em `CreateEmailServiceFailure`.

Durante o refactor houve uma falha de compilação transitória porque o helper foi declarado como `ObjectResult`, embora `StatusCode(...)` retorne `StatusCodeResult`; a assinatura foi corrigida antes da validação final.

Validações finais:

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~EmailControllerTests --nologo --no-restore
Resultado: 5/5 aprovados.

dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~PasswordRecoveryTests --nologo --no-restore
Resultado: 6/6 aprovados.

dotnet build backend/backend.sln --no-restore -c Release --nologo --disable-build-servers -v:q
Resultado: exit 0, 0 erros. Permanecem avisos de analisadores preexistentes fora do escopo; o CA1859 temporário do helper foi removido.

git diff --check
Resultado: exit 0; somente avisos de normalização LF/CRLF do working tree.
```

Verificação estrutural final: `EmailController.cs` não contém `catch (Exception)`; os seis catches remanescentes são tipados para os três tipos de falha esperada.

## Limitações, falhas e riscos

- Code Quality/CodeQL remoto não foi executado nesta tarefa: a solicitação proibiu commit, push e Pull Request. Portanto, o desaparecimento remoto de CQ-0009/CQ-0010 ainda depende da coordenação e da esteira após publicação.
- `docker info` falhou porque o daemon não estava disponível em `npipe:////./pipe/dockerDesktopLinuxEngine`. Nenhum teste de integração que exigisse Docker foi necessário para o teste focal desta tarefa.
- A implementação considera `InvalidOperationException` uma falha operacional esperada porque o `EmailService` usa esse tipo para configuração SMTP ausente ou inválida e `PasswordRecoveryTests` exige neutralidade nesse caso. Uma implementação futura de exceção de domínio específica reduziria essa ambiguidade.
- Não houve fechamento da issue, alteração de status para `Done`, edição de `tasks.md`, commit, push ou Pull Request.
