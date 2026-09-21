# T039 — Simplificar missed Where em AuditoriaMiddleware

- Issue: #237
- Finding: CQ-0047 (`cs/linq/missed-where`)
- Categoria/severidade: Maintainability / Note
- Escopo: filtro de campos sensíveis no corpo capturado por `AuditoriaMiddleware`
- Data: 2026-09-21
- SHA local de referência: `5bb367fac250d0d6b497dcc6ad6feffe461d7191`
- Status do Project: `In Progress` (item já estava atribuído a `nathannmvr`; não foi alterado)

## Sincronização da issue

Antes do RED, foram confirmados:

- repositório da issue: `ifpebj-ti/lab-solos`;
- Project configurado: owner `ifpebj-ti`, número `41`;
- item único da issue `#237`: `PVTI_lADOCHXT-84BDe_Fzg32NLY`;
- assignee preservado: `nathannmvr`;
- status persistido: `In Progress`.

Não foram feitos comentários, fechamento da issue ou outras mutações remotas.

## RED — finding e caracterização

A consulta somente leitura ao Code Quality antes da alteração local:

```text
gh api repos/ifpebj-ti/lab-solos/code-quality/findings?state=open&per_page=100
```

retornou o finding remoto `#71`, `cs/linq/missed-where`, em
`AuditoriaMiddleware.cs:78-84`, com a mensagem de que o `foreach` filtrava
implicitamente a sequência e deveria usar `.Where(...)`. Esse é o RED do
finding. A documentação oficial do CodeQL descreve esse padrão como loop sobre
a sequência inteira com `if` e recomenda `Where` para expressar o filtro.

Como o finding é de Maintainability e o comportamento original já estava
correto, não foi fabricada uma falha funcional. Primeiro foi adicionada a
caracterização `InvokeAsyncSanitizesSensitiveFieldsWithoutChangingBodyFieldOrder`.
O comando focal, ainda com a implementação original, passou com 6 testes:

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~AuditoriaMiddlewareTests
Resultado: 0 falhas, 6 aprovados.
```

A linha de base anterior à caracterização também passou com 5 testes no mesmo
filtro.

## GREEN — correção mínima

O loop de sanitização foi convertido de `bodyObj.Keys.ToList()` com `if` interno
para `bodyObj.Keys.Where(...)`, mantendo o predicado existente e atribuindo
`"***"` somente às mesmas chaves. Não foram alterados:

- conjunto ou ordem das propriedades serializadas;
- leitura única e reposicionamento do corpo;
- descarte do `TextReader`;
- catches `IOException`, `JsonException` e `DbUpdateException` já remediados;
- contratos públicos.

Após a correção:

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~AuditoriaMiddlewareTests
Resultado: 0 falhas, 6 aprovados.
```

## REFACTOR — caracterização explícita

A caracterização foi ajustada para verificar explicitamente a ordem dos cinco
campos, a sanitização de `senha` e `PASSWORD` e a preservação dos outros valores.
O filtro focal em Release permaneceu verde:

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~AuditoriaMiddlewareTests --no-restore --nologo
Resultado: 0 falhas, 6 aprovados.
```

## Validação proporcional

```text
dotnet build backend/backend.sln --no-restore -c Release --nologo --disable-build-servers --verbosity minimal
Resultado: 0 erros; 203 avisos de analisadores já existentes no repositório.

dotnet test backend/Tests/Tests.csproj --no-build --no-restore -c Release --filter FullyQualifiedName~AuditoriaMiddlewareTests --nologo
Resultado: 0 falhas, 6 aprovados.

dotnet test backend/Tests/Tests.csproj --no-build --no-restore -c Release --nologo
Resultado: 0 falhas, 270 aprovados, 0 ignorados.

git diff --check -- backend/LabSolos-Server-DotNet8/Middlewares/AuditoriaMiddleware.cs backend/Tests/Middlewares/AuditoriaMiddlewareTests.cs .codex/docs/specs/remediacao-codeql-qualidade/evidencias/T039
Resultado: aprovado, exit code 0.
```

Os avisos incluem regras preexistentes de analisadores .NET; no middleware
permanecem avisos de cultura/localidade (`CA1304`/`CA1311`) e comparação de
strings (`CA1862`) fora do CQ-0047. O `diff --check` também exibiu apenas o
aviso não bloqueante de normalização LF/CRLF do Git.

## Limitação de encerramento remoto

O finding remoto `#71` permanece aberto porque a alteração está apenas no
workspace. Por solicitação explícita, não foram feitos commit, push, Pull Request
ou merge; portanto não há SHA remoto novo para executar Code Quality e comprovar
o desaparecimento do finding. A implementação e a validação local estão prontas
para a coordenação executar essa prova no fluxo autorizado.

`tasks.md` não foi editado.

## Arquivos alterados por T039

- `backend/LabSolos-Server-DotNet8/Middlewares/AuditoriaMiddleware.cs`
- `backend/Tests/Middlewares/AuditoriaMiddlewareTests.cs`
- `.codex/docs/specs/remediacao-codeql-qualidade/evidencias/T039/resultado.md`
