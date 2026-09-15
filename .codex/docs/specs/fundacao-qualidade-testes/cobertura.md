# Cobertura existente e lacunas — T001

**Issue:** #227
**Snapshot:** 2026-09-14
**Revisão observada:** `a58cc224c2e6a327434674a0de0585adc62219a2`
**Base observada:** `origin/develop` no mesmo SHA
**Escopo:** somente mapeamento documental; nenhuma hipótese abaixo é um defeito confirmado.

## Como ler a matriz

- **Unidade:** teste de serviço, contrato ou controlador isolado, normalmente com Moq ou EF Core InMemory.
- **HTTP/PostgreSQL:** teste que atravessa a aplicação por `HttpClient` e usa a fixture descartável de PostgreSQL.
- **UI simulada:** Vitest/Testing Library com MSW ou Playwright com `page.route`/`route.fulfill`; a API de domínio não é real.
- **E2E real:** navegador e API reais na composição E2E. A ausência de `route.fulfill` é necessária, mas não basta para provar isolamento ou cobertura de uma jornada.

Os nomes de teste abaixo são os nomes encontrados no checkout. As referências `T011`–`T026` são tarefas planejadas para completar uma lacuna, não evidência de cobertura já entregue.

## Matriz CT-001–CT-009

| Cenário | Caminho positivo existente | Caminho negativo/invariantes existente | Camada e classificação | Descoberta objetiva | Lacuna explícita e próximo passo |
|---|---|---|---|---|---|
| **CT-001 — autenticação** | `backend/Tests/Controllers/AuthLoginContractTests.cs`: `Login_ValidAccount_ReturnsFlagAndVersionedClaims`; `backend/Tests/Integration/RequiredPasswordChangeAuthorizationTests.cs`: troca obrigatória e novo login; `frontend/src/pages/Login.test.tsx` e `frontend/src/integration/Auth.test.ts`: destino por perfil e retomada de rota. | `AuthLoginContractTests.Login_UnavailableAccount_UsesSameGenericUnauthorizedResponse` cobre pendente/bloqueado/desabilitado; `JwtSessionVersionTests.InvalidSessionIdentity_IsRejected` e `TokensIssuedBeforeVersionIncrement_AreRejectedAfterIncrement`; UI cobre 401/403 em `Auth.integration.test.ts`, `Login.test.tsx` e `auth/sessionConsumers.test.tsx`. | Controlador isolado; HTTP/PostgreSQL para sessão e troca obrigatória; UI simulada; `frontend/e2e/credential-lifecycle.spec.ts` é E2E real parcial, com administrador seed. | Backend: `dotnet test backend/Tests/Tests.csproj --artifacts-path .tmp/quality/T001/backend --list-tests --nologo`; UI: `rg -n '^(describe|it|test)|^[ ]+(it|test)' frontend/src/pages/Login.test.tsx frontend/src/integration/Auth*.test.ts frontend/src/auth/sessionConsumers.test.tsx`; E2E: `npm run test:e2e:list`. | Falta uma jornada real isolada com credencial inválida e perfis/contas próprios. Os testes de login de `AuthLoginContractTests` chamam o controlador diretamente, portanto não comprovam o middleware HTTP. Completar em T011, T018 e T024. |
| **CT-002 — cadastro** | Unidade/controlador em `backend/Tests/Controllers/UsuarioRegistrationValidationTests.cs` (`Adicionar_ValidAcademicFields_AreNormalizedBeforeMappingAndPersistence`) e `UserCreationPasswordPolicyTests.cs` (`Adicionar_AcceptedPasswordPreservesCreatedFlowAndOmitsCredentialsFromResponse`); `frontend/src/pages/CreateAccount.test.tsx`; `frontend/e2e/user-data-contract.spec.ts` cadastra acadêmico por navegador/API real. | `UsuarioRegistrationValidationTests.Adicionar_InvalidAcademicFields_ReturnsFieldValidationProblemWithoutEchoingValues`; matriz de senha e rejeição em `UserCreationPasswordPolicyTests`; `CreateAccount.errors.test.ts`; `user-data-contract.spec.ts` envia cidade/curso inválidos contra a API real. | Backend atual é unidade com dependências simuladas; UI é MSW; os dois primeiros casos de `user-data-contract.spec.ts` são E2E/API real; `responsive-layout.spec.ts` (`T002 cadastro`) é UI simulada. | Backend: comando `dotnet ... --list-tests`; UI: `rg` dos arquivos `CreateAccount*.test.*`, `contracts/userRegistration.test.ts`, `integration/Users.errors.test.ts`; E2E: `npm run test:e2e:list`. | Não há caracterização HTTP/PostgreSQL da criação pendente nem tentativa de privilégio administrativo por middleware. Aprovação é CT-003, não deve ser inferida do cadastro. Completar em T012, T018, T023 e T025. |
| **CT-003 — aprovação/rejeição de cadastro** | Ações e atualização da lista em `frontend/src/pages/RegistrationRequests.responsive.test.tsx` e `RegistrationRequests.errors.test.tsx`; casos de sucesso cobrem aprovação e rejeição no contrato de UI. | UI simulada cobre conflito ao aprovar, 403 ao rejeitar, erro de carga e preservação do registro; `responsive-layout.spec.ts` (`T003 solicitações de cadastro`) usa `route.fulfill`. | UI simulada; não há teste backend de aprovação/rejeição nas fontes atuais e não há E2E real dessa jornada. | Backend: listagem não mostra `UsuariosController` de aprovação entre os 125 casos; UI: `rg -n` nos arquivos `RegistrationRequests*.test.tsx` e `integration/Users*.test.ts`; E2E: `npm run test:e2e:list`. | Faltam HTTP/PostgreSQL para anônimo, perfil proibido, ID inexistente, já processado e responsável A adulterando `AprovadorId`, além de verificar estado persistido. Completar em T013, T019 e T025. |
| **CT-004 — recuperação de senha** | `backend/Tests/Security/RecoveryTokenTests.cs` cobre geração/hash e reset válido; `PasswordRecoveryTests.cs` caracteriza endpoints/contrato; `frontend/src/pages/ForgotPassword.test.tsx` e `ResetPassword.test.tsx`; `credential-lifecycle.spec.ts` obtém token pelo Mailpit e chama reset na API real. | Serviço cobre e-mail divergente, token expirado e token consumido; controlador cobre resposta neutra, falha SMTP e token inválido; UI cobre validação, 400, token inválido, conflito e indisponibilidade. | Serviço usa EF Core InMemory; controlador usa mocks; UI é MSW; E2E real usa API/Mailpit, mas chama recuperação por `request` e não pela tela de recuperação. | Backend: `dotnet ... --list-tests`; UI: `rg -n` nos arquivos `ForgotPassword*.test.*`, `ResetPassword*.test.*` e `integration/Auth*.test.ts`; E2E: `npm run test:e2e:list`. | Falta jornada real pela UI de solicitação e redefinição, isolamento de conta e seleção de mensagem por destinatário. A resposta neutra e a não reutilização precisam ser revalidadas em HTTP real. Completar em T011, T018 e T024. |
| **CT-005 — troca de senha** | `backend/Tests/Security/CredentialServiceTests.cs` cobre atualização, hash e revogação; `AuthChangePasswordTests.cs` cobre DTO, identidade da claim e 204; `RequiredPasswordChangeAuthorizationTests.cs` atravessa HTTP/PostgreSQL; `frontend/src/pages/ChangePassword.test.tsx`; `credential-lifecycle.spec.ts` cobre primeiro acesso e troca voluntária no navegador. | Serviço cobre senha atual incorreta, confirmação divergente, política recusada e concorrência; controlador cobre subject ausente/malformado, 400 e 409; UI cobre 401/409 sem limpar sessão indevidamente. | InMemory para serviço, controlador isolado, HTTP/PostgreSQL para troca obrigatória, UI MSW e um E2E real stateful. | Backend: `dotnet ... --list-tests`; UI: `rg -n` em `ChangePassword.test.tsx`, `PasswordChangeFields.test.tsx` e `auth/sessionConsumers.test.tsx`; E2E: `npm run test:e2e:list`. | Falta uma jornada real negativa e repetível com conta própria. O E2E atual altera a conta administrativa global do seed e mistura primeiro acesso, troca, reset e logout no mesmo caso. Completar em T011, T018 e T024. |
| **CT-006 — solicitação de empréstimo** | `frontend/src/pages/mentor/LoanCreation.responsive.test.tsx` preserva seleção/remoção e não duplica envio; há contratos de leitura em `frontend/src/integration/Loans.contract.test.ts`. | UI cobre falha de carregamento em `LoanCreation.responsive.test.tsx`; `Loans.errors.test.ts` cobre falhas de leitura, não a criação; `responsive-layout.spec.ts` (`T006 criação de empréstimo`) simula 201 e falhas. | UI simulada/MSW e contratos frontend; não há teste backend de POST nem E2E real de solicitação. | Backend: `dotnet ... --list-tests` não lista teste de criação de empréstimo; UI: `rg -n` nos arquivos `LoanCreation*.test.tsx` e `integration/Loans*.test.ts`; E2E: `npm run test:e2e:list`. | Faltam sessão HTTP real, vínculo ao solicitante, recusa de anônimo/administrador, erro de API sem sucesso falso e persistência PostgreSQL. Completar em T010, T014, T020 e T026. |
| **CT-007 — aprovação de empréstimo** | UI administrativa em `frontend/src/pages/admin/LoansRequest.responsive.test.tsx` envia o ID correto; `LoansRequest.errors.test.tsx` cobre recuperação após conflito e sucesso de aprovação; `PostAuthenticationNavigationTests` somente lê detalhes/listas. | UI simulada cobre 403, conflito, falha de carga e reprocessamento de interação; `responsive-layout.spec.ts` (`T004 solicitações de empréstimo`) usa respostas simuladas. | UI simulada; backend tem apenas autorização/leitura de empréstimos, sem POST/PATCH de decisão; não há E2E real. | Backend: `dotnet ... --list-tests` e busca `rg -n 'Emprestimos|Aprovar|Reprovar' backend/Tests`; UI: `rg -n` nos arquivos `LoansRequest*.test.tsx`; E2E: `npm run test:e2e:list`. | Faltam aprovação HTTP/PostgreSQL, estoque insuficiente, exatamente uma baixa, aprovador persistido e comprovação com novo contexto. Completar em T010, T015, T021 e T026. |
| **CT-008 — rejeição de empréstimo** | UI preserva o registro e atualiza a lista após ação em `LoansRequest.responsive.test.tsx` e `RegistrationRequests` não é substituto; casos de erro de `LoansRequest.errors.test.tsx` exercitam feedback da ação. | UI simula 403, conflito/falha e item preservado; E2E responsivo de `T004` simula `reprovar`. | UI simulada; não há teste backend nem E2E real de rejeição. | Backend: `rg -n 'Reprovar|reprovar|rejeit' backend/Tests`; UI: `rg -n` nos arquivos `LoansRequest*.test.tsx`; E2E: `npm run test:e2e:list`. | Falta provar por HTTP/PostgreSQL que rejeição e reprocessamento não alteram empréstimo nem estoque e que o perfil proibido é recusado. Completar em T015, T021 e T026. |
| **CT-009 — devolução e data** | `frontend/src/pages/admin/ReturnLoan.responsive.test.tsx`, `ReturnLoan.navigation.test.tsx` e `ReturnLoan.errors.test.tsx` cobrem apenas a superfície/feedback simulados; `responsive-layout.spec.ts` (`T007 devolução`) simula a API. | UI cobre falha de consulta/ação e navegação; não há caracterização PostgreSQL do contrato de data nem prova de estoque após recusa. | UI simulada; nenhum teste backend de devolução e nenhum E2E real. | Backend: `dotnet ... --list-tests` não lista `LoanReturnCharacterizationTests`; E2E: `npm run test:e2e:list`; UI: `rg -n` nos arquivos `ReturnLoan*.test.tsx`. | QC-001 continua hipótese: falta reproduzir criar → aprovar → devolver em PostgreSQL com a data prevista real. Não contar o fixture que omite data como confirmação ou correção. Completar em T016 e consolidar em T027. |

### Descoberta, classificação e limites da contagem

`dotnet test --list-tests` encontrou **125 casos** na suíte atual de `backend/Tests/Tests.csproj`. A solução também lista `LabSolos-Server-DotNet8.csproj` e `Tests/Tests.csproj`, mas a lista da solução não substitui a execução da suíte de testes.

`npm run test:e2e:list` encontrou **201 casos em 7 arquivos** no projeto Playwright atual. Há somente o projeto `chromium` em `frontend/playwright.config.ts`; a classificação real/UI ainda não é um projeto/configuração executável separado.

No frontend foram encontrados **120 arquivos Vitest** sob `frontend/src`, incluindo os contratos, integrações, páginas e componentes citados na matriz. A descoberta de nomes foi feita por `rg`; a T001 não executa a suíte completa do Vitest, pois isso não está entre os comandos de validação desta tarefa.

As ocorrências de `route.fulfill` estão em `error-experience.spec.ts`, `feature-visibility.spec.ts`, `post-auth-navigation.spec.ts`, `responsive-layout.spec.ts` e no caso simulado de `user-data-contract.spec.ts`. `credential-lifecycle.spec.ts` não contém `route.fulfill` e atravessa a composição real, mas ainda depende do seed global. `infra/smoke.e2e.ts` verifica somente que o frontend é servido.

## Candidatos de qualidade QC-001–QC-006

Os itens seguintes são candidatos levantados pela inspeção/techspec. O registro nesta matriz não classifica severidade e não confirma defeito; cada um precisa da reprodução indicada.

| ID | Observação candidata e evidência de origem | Estado nesta tarefa | Reprodução/decisão encaminhada |
|---|---|---|---|
| **QC-001** | `EmprestimosController.Adicionar` aparenta preencher `DataDevolucao` com a data prevista, enquanto `DevolverEmprestimo` e `NotificacaoService` usam nulidade para distinguir não devolvido. | **Hipótese não confirmada.** CT-009 não possui teste real. | T016 deve executar criar → aprovar → devolver em PostgreSQL, registrar efeito no estoque e decidir contrato de data antes de qualquer correção; T027 consolida o eventual bloqueio. |
| **QC-002** | Aprovação/rejeição de dependente aparenta comparar o vínculo com `AprovadorId` do corpo sem validar explicitamente o sujeito autenticado. | **Hipótese não confirmada.** A UI só simula a resposta. | T013 deve testar responsável A com corpo indicando B em HTTP real, incluindo rejeição, e verificar que não há alteração indevida. |
| **QC-003** | O cadastro público de administrador aparenta chamar `Forbid` com texto como argumento. Inspeção de `IActionResult` isolado não prova o comportamento do middleware. | **Hipótese não confirmada.** | T012 deve reproduzir por HTTP real, confirmar recusa controlada e ausência de conta privilegiada; só então decidir correção. |
| **QC-004** | A compilação observada reporta `CS8604` em `backend/LabSolos-Server-DotNet8/Mappings/ProdutoMappingProfile.cs`, nas chamadas de `DateTime.Parse`. | **Aviso observado; impacto não confirmado.** | T017 deve testar datas válidas, ausentes e malformadas nos contratos de produto antes de classificar ou corrigir. |
| **QC-005** | `credential-lifecycle.spec.ts` modifica o administrador seed e limpa toda a caixa do Mailpit; `playwright.config.ts` usa `fullyParallel: true`, retries 2 no CI e apenas um worker no CI. | **Risco de isolamento não confirmado como falha.** | T023/T024 devem criar dados por cenário, filtrar mensagem por destinatário e repetir em stack nova e mesma stack; T029 compara os resultados. |
| **QC-006** | O build frontend possui avisos de `/env.js`, `laboratory.png` e tamanho do pacote JavaScript; isso não mede sozinho confiabilidade nem severidade alta. | **Impacto não confirmado.** | T027 deve comprovar impacto de recurso em uso real e classificar sem transformar aviso de pacote em alto automaticamente. |

## Lacunas transversais de aceite

- Não há ainda uma matriz executável que separe Playwright real de UI simulada; o checkout tem um único projeto `chromium`.
- CT-003 e CT-006–CT-009 não têm cobertura backend de mutação em HTTP/PostgreSQL correspondente aos efeitos críticos.
- O E2E real existente cobre credenciais, mas usa estado global do seed e não demonstra repetibilidade isolada.
- A presença de testes unitários positivos/negativos não comprova autorização HTTP, persistência ou efeitos transacionais.
- A linha de base local foi coletada em Windows com versões diferentes das linhas usadas no CI; ainda não há pins completos de Node/npm, SDK .NET, Python, NuGet e imagens que permitam declarar RNF-001 atendido.

## Atualização T027 — cobertura executável após a fundação

O snapshot executável de T027 foi coletado em `.tmp/quality/T027/current.json`
com toolchain isolado pinado: 4 produtores, 257 achados técnicos/funcionais,
125 testes backend listados e 211 testes Playwright descobertos em 10 arquivos.
O projeto `real` contém 14 casos, incluindo as jornadas críticas de cadastro,
aprovação e empréstimos; o projeto `ui` contém 197 casos simulados.

| Critério | Evidência concluída | Limite remanescente |
|---|---|---|
| CT-001, CT-004, CT-005 | Ciclo real de credenciais T024: 4/4; troca, recuperação, logout e credencial inválida | A cobertura real de recuperação pela tela completa continua parcial |
| CT-002, CT-003 | Cadastro/aprovação real T025: 3/3, com persistência e recusa/reprocessamento | QC-003 permanece aberto como item de autorização histórica |
| CT-006, CT-007, CT-008 | Empréstimos reais T026: 4/4, estoque, autorização, rejeição e reprocessamento | CT-009 não foi inventado nem inferido |
| CT-009 | Caracterização histórica preservada como QC-001 | Requer tarefa específica com criação, aprovação e devolução em PostgreSQL |

As evidências de T024–T026 e o inventário de T027 são os vínculos de aceite;
nomes de tarefas planejadas não são contados como execução. QC-001, QC-002,
QC-003 e QC-005 continuam impedimentos de produto/segurança/isolamento; QC-006
foi triado como aviso de recurso/pacote sem classificação automática como alto.

## Atualização T029 — pré-aceite bloqueado

Em 2026-09-15, a checagem conservadora de aceite confirmou que a cobertura
crítica está descoberta, mas a combinação final ainda não pode ser aceita:

| Verificação | Resultado observado | Limite para o aceite |
|---|---|---|
| Descoberta Playwright | 211 casos em 10 arquivos; 14 no projeto `real` e 197 no `ui` | Descoberta não substitui a execução integral; ela foi suficiente para não classificar a suíte como vazia. |
| Jornadas reais T025/T026 | Evidências anteriores registram 3/3 e 4/4 | A repetição integral de T029 não foi iniciada depois do bloqueio do pré-aceite. |
| CT-009/QC-001 | Ainda sem caracterização real criar → aprovar → devolver | Dependência complementar não resolvida; não inferir correção a partir de testes simulados. |
| QC-002, QC-003 e QC-005 | Altos abertos no inventário de T027 | Bloqueiam CA-002 e o aceite global. |

Portanto, a matriz mantém CT-001–CT-008 como cobertura executável já
evidenciada, mas CA-001/CA-002 permanecem bloqueados até a remediação dos
altos, a caracterização de CT-009 e a validação final sob os pins.

## Atualização T029 — validação final e aceite técnico

Em 2026-09-15, a repetição foi concluída com o runtime preparado em
`.tmp/quality/T008/toolchain-20260915`: Node 20.20.2, npm 10.8.2 e Python
3.12.14. O backend teve `dotnet restore --locked-mode` e `dotnet test` com
180 aprovados, 0 falhas e 0 ignorados. No frontend, `npm ci`, lint e build
retornaram exit 0; Vitest fechou com 128 arquivos e 605 testes aprovados.

A descoberta Playwright confirmou 211 casos (14 `real` e 197 `ui`). Após o
prebuild explícito da imagem `e2e-seed`, a suíte final completa terminou com
211/211 aprovados e 0 ignorados; a repetição exclusiva do projeto `real`
terminou com 14/14. A primeira tentativa registrou RED operacional (203
aprovados, 2 falhas e 6 não executados) porque a imagem do seed foi construída
sob demanda e excedeu o timeout; o procedimento foi corrigido e repetido em
stack exclusiva, com limpeza registrada.

As suítes Python terminaram com 319 aprovados e 2 skips legítimos no Windows
por privilégio de symlink; a prova Linux executou `test_manual_content.py`
com 44/44 e `test_manual_publication.py` com 20/20, ambos sem skips. O
actionlint oficial retornou exit 0. `quality_baseline.py collect`, `check` e
`render` retornaram exit 0; a coleta final contém 238 achados, sendo 3 altos
já corrigidos, 234 médios abertos e 1 baixo aberto. `git diff --check` também
retornou exit 0, com apenas avisos de conversão LF/CRLF.

QC-002, QC-003 e QC-005 estão corrigidos. A revisão de T016 confirma QC-001
como alto e aberto; após corrigir a classificação no catálogo, a coleta final
passou a registrar 1 alto aberto e o `quality_baseline.py check` retornou exit
1. QC-004 permanece médio aberto e QC-006 baixo aberto. Assim, a cobertura e
as suítes foram validadas, mas CA-002 e o aceite de T029 permanecem bloqueados
até a definição do contrato de CT-009; a proteção remota e o PR de prova são
escopo de T030.
