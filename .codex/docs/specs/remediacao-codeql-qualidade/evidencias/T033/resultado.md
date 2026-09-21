# T033 — Refatorar missed Select em `NotificacaoService`

- Finding: `CQ-0003` (`cs/linq/missed-select`)
- Status: concluída localmente
- Data: 2026-09-21

## Escopo

O mapeamento de administradores para `CreateNotificacaoDTO` em
`CriarNotificacaoEmprestimoVencidoAsync` foi expresso com `usuarios.Select(...)`.
O resultado continua sendo consumido por um `foreach` sequencial para preservar a
ordem original, a cardinalidade, os valores produzidos e o contrato de persistência
de uma notificação por administrador.

## TDD

### RED

1. Linha de base focal:

   ```text
   dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~NotificacaoServiceTests --no-restore
   ```

   Resultado: processo 0, mas nenhum teste correspondeu ao filtro porque
   `NotificacaoServiceTests.cs` ainda não existia.

2. Caracterização inicial criada em `NotificacaoServiceTests.cs`:

   ```text
   dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~NotificacaoServiceTests --no-restore
   ```

   Resultado: 1 teste aprovado antes da refatoração. Isso foi tratado como
   caracterização verde do comportamento existente, sem fabricar uma falha
   funcional.

3. Verificação estrutural do finding:

   ```text
   Select-String -Path backend/LabSolos-Server-DotNet8/Services/NotificacaoService.cs \
     -Pattern 'var notificacoesParaCriar = usuarios\\.Select\\(admin =>'
   ```

   Resultado: falha esperada, `RED: o mapeamento de administradores ainda não usa Select`.

### GREEN

Após substituir somente o mapeamento por `usuarios.Select(...)`:

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~NotificacaoServiceTests --no-restore
```

Resultado: 1/1 teste aprovado.

```text
verificação estrutural: projeção Select encontrada.
```

O teste verifica três administradores em ordem, cardinalidade exata, IDs, tipo,
referência, link, mensagem e uma chamada de `CommitAsync` por notificação.

### REFACTOR

```text
dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~NotificacaoServiceTests --no-build
```

Resultado: 1/1 teste aprovado. A revisão manteve a projeção lazy e o processamento
sequencial, sem mudança funcional adicional.

## Validação adicional

```text
dotnet build backend/backend.sln --configuration Release --no-restore
```

Resultado: 0 erros e 203 avisos já existentes na base de código.

```text
git diff --check -- backend/LabSolos-Server-DotNet8/Services/NotificacaoService.cs backend/Tests/Services/NotificacaoServiceTests.cs .codex/docs/specs/remediacao-codeql-qualidade/evidencias/T033
```

Resultado: aprovado, com apenas o aviso normal de normalização LF/CRLF do Git.

## Limitações

- Não houve push, Pull Request, merge ou validação remota do Code Quality, conforme
  solicitado; a confirmação do encerramento remoto do `CQ-0003` fica para a
  coordenação central.
- Não foram executados testes de integração/E2E; a mudança é unitária e o teste
  focal não depende de Docker.
- Os 203 avisos do build são preexistentes e permanecem fora do escopo T033.
