# T034 — Refatorar missed Select em HttpContextExtensions

- Issue: #237
- Finding: CQ-0046 (`cs/linq/missed-select`)
- Categoria/severidade: Maintainability / Note
- Escopo: `HttpContextExtensions.GetClientIpAddress`
- Data: 2026-09-21

## RED — caracterização do comportamento

O finding da linha de base aponta as linhas 17–32 de `HttpContextExtensions.cs`, onde o loop percorre os nomes dos headers e calcula imediatamente o valor correspondente. Como se trata de Maintainability, o RED funcional clássico não se aplica sem fabricar uma regressão: a implementação original já produzia o resultado correto.

Antes da criação do teste focal, o comando direcionado encontrou zero testes para `HttpContextExtensionsTests`. Foram então adicionados quatro casos de caracterização cobrindo:

- prioridade e ordem dos headers;
- headers ausentes, vazios e com valor `unknown`;
- valor de `RemoteIpAddress` como fallback;
- fallback para `127.0.0.1` sem endereço remoto.

Com a implementação original, a caracterização executou 4 testes aprovados, confirmando o contrato que deveria ser preservado.

## GREEN — correção mínima

O loop passou a iterar sobre `ProxyHeaders.Select(header => context.Request.Headers[header].FirstOrDefault())`. A transformação é lazy, mantém a ordem da sequência e conserva cada valor ausente ou presente antes do mesmo filtro existente.

Comando:

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~HttpContextExtensionsTests --no-restore --nologo --logger "console;verbosity=normal"
```

Resultado: 4 testes aprovados, `EXIT_CODE=0`.

## REFACTOR — alocação e validação final

A lista fixa de headers foi extraída para `private static readonly string[] ProxyHeaders`, evitando recriá-la a cada chamada sem mudar a API pública, a ordem ou os valores observados.

Comandos e resultados:

```text
dotnet test backend/Tests/Tests.csproj --no-build --no-restore -c Release --filter FullyQualifiedName~HttpContextExtensionsTests --nologo --logger "console;verbosity=normal"
```

Resultado: 4 testes aprovados, `EXIT_CODE=0`.

```text
dotnet build backend/backend.sln --no-restore -c Release --nologo --disable-build-servers --verbosity minimal
```

Resultado: compilação com êxito, 0 erros.

```text
git diff --check -- backend/LabSolos-Server-DotNet8/Extensions/HttpContextExtensions.cs backend/Tests/Extensions/HttpContextExtensionsTests.cs .codex/docs/specs/remediacao-codeql-qualidade/evidencias/T034
```

Resultado: aprovado. O Git reportou somente o aviso não bloqueante de normalização LF/CRLF do arquivo de produção.

## Arquivos alterados

- `backend/LabSolos-Server-DotNet8/Extensions/HttpContextExtensions.cs`
- `backend/Tests/Extensions/HttpContextExtensionsTests.cs`
- `.codex/docs/specs/remediacao-codeql-qualidade/evidencias/T034/resultado.md`

## Limitações

- Não houve push, PR ou merge, conforme solicitado; portanto, a confirmação remota de desaparecimento do CQ-0046 no Code Quality não pode ser executada nesta etapa.
- Não foram executados testes de integração/E2E, pois a validação da tarefa é focal e não requer infraestrutura externa.
- `tasks.md` não foi editado.
