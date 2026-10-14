# Evidências de execução — T002

Data: 2026-10-13
Issue: #437 (`ifpebj-ti/lab-solos`)
Project: #41

## Sincronização

Na preparação, a issue estava aberta e atribuída ao usuário autenticado; o item já estava em `In Progress`. O estado foi confirmado sem mutação externa. Permanece `In Progress`, pois a issue tem outras tarefas pendentes.

## RED

- Antes da implementação, `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~AuthenticationProtectionOptionsTests|FullyQualifiedName~ThrottleKeyFactoryTests" --no-restore --nologo` compilou e executou 11 testes: 5 falharam por asserções comportamentais. Os casos demonstraram aceitação de opções/arquivos inválidos e divergência entre representações equivalentes de e-mail e IP mapeado IPv4.
- A linha de base da suíte completa passou com 270/270 testes após `dotnet restore backend/backend.sln --locked-mode --nologo`.

## GREEN / REFACTOR

- Filtro T002 final: `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~AuthenticationProtectionOptionsTests|FullyQualifiedName~ThrottleKeyFactoryTests" --no-restore --nologo` — 17 aprovados, 0 falhas, 0 ignorados.
- Build exigido: `dotnet build backend/backend.sln -c Release --nologo --disable-build-servers` — código de saída 0, 0 erros e 203 avisos de análise.
- Regressão completa: `dotnet test backend/Tests/Tests.csproj -c Release --no-restore --nologo` — 287 aprovados, 0 falhas, 0 ignorados.

## Falhas de execução resolvidas

- A primeira tentativa de teste sem restauração falhou com `NETSDK1064` porque o pacote EF Analyzers 8.0.10 não estava no cache local. A restauração em modo travado resolveu a condição; a linha de base e execuções seguintes passaram.
- Uma tentativa exploratória anterior de direcionar `obj/bin` para esta pasta falhou com atributos de assembly duplicados ao incluir `obj` existente. Ela não substituiu o build padrão, que passou acima.

## Integração da onda 1

- A revisão do build integrado encontrou seis avisos CA1859 novos nos parâmetros internos do validador. Eles foram eliminados usando `List<string>` nas funções que já recebem essa lista.
- Build Release após o ajuste: 0 erros e 197 avisos restantes no repositório; não restaram avisos nos arquivos de T002.
- Regressão backend integrada: 299 testes aprovados, 0 falhas e 0 ignorados, incluindo T001–T003.
- A suíte frontend integrada após T005 passou com 660/660; lint e build passaram. O build manteve apenas os avisos existentes registrados em T005.
