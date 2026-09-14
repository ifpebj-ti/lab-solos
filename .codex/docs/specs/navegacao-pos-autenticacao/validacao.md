# Validação — Navegação e experiência pós-autenticação

- Status: concluída
- Data: 2026-09-14
- Especificação: `./techspec.md`
- Plano executado: `./tasks.md`, T001–T014

## Resultado

A entrega atende à matriz de requisitos com validação backend, frontend, navegador e auditoria estática. IDs de recursos são recuperáveis por query string, os retornos usam pais determinísticos por perfil, erros distinguem vazio de indisponibilidade e a sessão permanece disponível após 403/404/5xx. O encerramento de sessão continua reservado a logout explícito, 401 e troca de credencial exigida.

## Evidência backend — executada antes do frontend

Os contratos HTTP foram conferidos nos controllers e nos testes de integração:

| Contrato | Evidência | Resultado |
|---|---|---|
| `GET /api/Emprestimos` | `[Authorize("ApenasAdministradores")]`; lista global não é acessível por mentor, mentorado ou visitante | 200 para administrador; 403/401 preservados |
| `GET /api/Emprestimos` vazio | coleção global mapeada para lista | 200 `[]` |
| `GET /api/Emprestimos/usuario/{id}` | usuário inexistente é distinguido de coleção sem empréstimos | 200 `[]` para pai existente; 404 para usuário inexistente |
| `GET /api/Usuarios/{id}/dependentes/emprestimos` | política de responsável e existência do usuário preservadas | 200 `[]` sem dependentes/empréstimos; 404 para usuário inexistente |
| `GET /api/Emprestimos/{id}` | detalhe inexistente não vira lista vazia | 404 preservado |

Arquivos principais: `backend/LabSolos-Server-DotNet8/Controllers/EmprestimosController.cs`, `backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs` e `backend/Tests/Integration/PostAuthenticationNavigationTests.cs`.

O comando final `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers` foi aprovado com **125/125 testes**. A validação direcionada dos contratos de navegação e vazio também foi aprovada anteriormente com **5/5 testes**.

## Evidência frontend

- `frontend/src/navigation/profileNavigation.ts` centraliza atalhos, pais, normalização de `id` decimal e leitura query/state.
- `frontend/src/components/global/BackLink.tsx` produz links determinísticos, sem histórico do navegador e sem limpeza de sessão.
- `PrivateRoutes`, `Page404` e `routes` preservam sessão válida, bloqueiam acesso entre perfis, mantêm troca obrigatória de senha prioritária e normalizam o alias legado `/mentor/history/mentee`.
- Homes exibem somente atalhos do perfil atual; o administrador mantém cards/contadores e retry independente.
- Tabelas e consumidores de detalhes propagam IDs na URL; refresh não depende de `location.state`.
- Telas de empréstimos, turmas, usuários, mentorias, produtos e verificações diferenciam `[]`, erro e resposta obsoleta, oferecem retry e retornam ao pai definido pela especificação.
- O contrato de empréstimo em `frontend/src/contracts/loan.ts` valida DTOs reais, inclusive nulos permitidos, sem converter 403/404/5xx em vazio.

## Matriz de requisitos e critérios

| Item | Evidência cruzada | Situação |
|---|---|---|
| RF-001 / CA-001 | Catálogo de atalhos, homes dos três perfis, matriz responsiva 375/1440 e navegação E2E | Aprovado |
| RF-002 / CA-002 | Contratos HTTP, políticas/404→200 `[]`, contratos frontend, backend real e suíte E2E em Docker | Aprovado |
| RF-003 / CA-003 | `BackLink`, pais por perfil, guardas, alias, IDs por query e retorno após erro/refresh | Aprovado |
| RNF-001 | Sessão não é limpa em Page404 comum, acesso negado ou falha transitória; logout/401 continuam explícitos | Aprovado |
| RNF-002 | URLs compartilháveis, IDs recuperáveis, controles de teclado e layout responsivo | Aprovado |

## Evidência E2E e integração

A infraestrutura foi verificada com Docker disponível, construída e executada com PostgreSQL, backend, frontend e Mailpit. Os volumes E2E foram recriados para a execução final, evitando reutilizar a senha mutada pelo teste de ciclo de credencial; ao final, containers e redes foram desligados.

Resultados:

- `npm run test:e2e:list`: **201 testes em 7 arquivos** descobertos.
- `npm run test:e2e -- e2e/post-auth-navigation.spec.ts`: **10/10 aprovados**.
- `npm run test:e2e`: **201/201 aprovados** em estado limpo, incluindo o ciclo real de credencial administrativa, revogação de sessão, contratos de usuário e stack Docker.

O spec `post-auth-navigation.spec.ts` usa `mockResponsiveSession` e fixtures controladas apenas para isolar a matriz determinística dos três perfis, dimensões e falha transitória, evitando disputa com `credential-lifecycle.spec.ts`. A integração real permanece coberta pelo ciclo de credencial, pelos contratos de usuário, pelos testes backend e pela execução da suíte inteira contra a pilha Docker; nenhum cenário obrigatório foi executado sem Docker.

## Auditoria de retornos e sessão

Comando executado:

```text
rg -n "navigate\(-1|history\.back|onNavigate|Voltar|state\?\.id|clearSession" frontend/src
```

Resultado da auditoria:

- nenhuma ocorrência de `navigate(-1` ou `history.back` no código de produção;
- `onNavigate` aparece somente como callback explícito de `ErrorFeedback` para pais conhecidos;
- `Voltar` usa `BackLink`/links ou navegação para pais fixos;
- `state.id` é compatibilidade, nunca fonte obrigatória quando há query;
- `clearSession` permanece em logout explícito, tratamento central de 401, login/fluxos de credencial e saída explícita de sessão com nível não suportado; não é executado no Page404 comum nem no acesso negado de perfil válido.

Não há chamada de API com `undefined` nos consumidores migrados: IDs inválidos bloqueiam a consulta e exibem estado de erro/retorno seguro.

## Esteira e limitações conhecidas

| Comando | Resultado |
|---|---|
| `npm run test -- --run` | 120 arquivos, 559 testes aprovados |
| `npm run lint` | aprovado com `--max-warnings=0` |
| `npm run build` | build aprovado |
| `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers` | 125 testes aprovados |
| `npm run test:e2e:list` | 201 testes em 7 arquivos |
| `git diff --check` | aprovado; somente avisos de normalização LF/CRLF do Git |

O build mantém avisos já conhecidos do repositório (`/env.js` sem `type="module"`, imagem pública resolvida em runtime e chunk principal grande). Eles não impediram o build e não alteram os critérios desta entrega. O workflow `.github/workflows/container-ci.yml` já descobre e executa testes, lint, build e E2E; a obrigatoriedade de proteção da branch não é inferida sem evidência das configurações do repositório.
