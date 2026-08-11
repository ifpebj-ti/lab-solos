# Qualidade do projeto Labon

Confirmar estes dados nos manifestos antes do uso, pois podem mudar.

## Backend

- Stack: .NET 8, xUnit, Moq e EF Core InMemory.
- Teste amplo real: `dotnet test backend/Tests/Tests.csproj`. Não usar `dotnet test backend/backend.sln` como evidência: na linha de base analisada, essa solução contém somente a aplicação e executa zero testes.
- Teste direcionado: `dotnet test backend/Tests/Tests.csproj --filter FullyQualifiedName~<NomeDoTeste>`.
- Compilação: `dotnet build backend/backend.sln --no-restore` depois de uma restauração bem-sucedida; omitir `--no-restore` quando necessário.
- O diretório `backend/Tests/bin` e `backend/Tests/obj` está versionado na linha de base atual. Não alterar/reverter artefatos preexistentes sem autorização.

## Frontend

- Stack: React 18, TypeScript, Vite e ESLint.
- Verificações existentes: `npm run lint` e `npm run build` em `frontend`.
- Linha de base analisada: não há script `test` nem dependências de um executor de testes. Para comportamento frontend, planejar primeiro uma tarefa explícita de infraestrutura (por exemplo, executor compatível com Vite, DOM de teste e Testing Library), um teste de prova e script de CI. Não instalar implicitamente fora do escopo.

## CI

- `.github/workflows/pipeline-back.yml` roda `dotnet test` sobre `backend/backend.sln`, que na linha de base não inclui o projeto de testes; o job pode ficar verde executando zero testes.
- `.github/workflows/pipeline-front.yml` roda lint, mas não testes de frontend.
- Ambas usam `pull_request` com `types: [closed]`; isso valida depois do fechamento/merge e não constitui gate pré-merge.
- Toda especificação técnica/tarefa que dependa de proteção de CI deve incluir fluxo de validação em `opened`, `synchronize` e `reopened` (ou evento equivalente), sem publicar/implantar artefatos nessa validação.
