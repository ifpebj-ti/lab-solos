# Tarefas: Cadastro e contratos de dados de usuário

- Status: concluído
- PRD: `./prd.md`
- Especificação técnica: `./techspec.md`
- Atualizado em: 2026-08-31
- Issues relacionadas: #216, #217, #218, #226

## Regras de execução

- Cada tarefa deve começar pela leitura integral de `prd.md`, `techspec.md` e deste `tasks.md`.
- Executar exatamente uma tarefa por chamada de `$execute-task`; atualizar o status da tarefa e o log somente depois das validações.
- Observar e registrar RED antes de GREEN. Comportamento já correto deve receber teste de caracterização, sem ser quebrado artificialmente.
- Não ampliar os caminhos sob responsabilidade sem interromper a tarefa e registrar o conflito.
- Preservar mudanças preexistentes e não editar artefatos rastreados em `bin/`, `obj/`, `dist/` ou `*.tsbuildinfo`.
- Comandos `npm run` são executados em `frontend/`, salvo quando usarem explicitamente `npm --prefix frontend`.
- Testes PostgreSQL e E2E exigem Docker. Daemon indisponível é impedimento ambiental; não substituir migração por EF `InMemory` nem E2E por mocks.
- Não consultar, alterar ou migrar bancos externos. Migrações e cenários usam somente bancos descartáveis locais.
- Não adicionar catálogo, autocomplete, geocodificação, inferência de cidade nem limite de cidade não previsto no PRD.

## Ondas de execução

| Onda | Tarefas | Motivo de segurança do paralelismo |
|---|---|---|
| 1 | T001, T002, T005 | validação backend, cadastro frontend e contrato/helper frontend possuem arquivos exatos distintos; os contratos estão fechados na techspec e não há arquivo gerado compartilhado |
| 2 | T003, T006, T007, T008 | T003 atua apenas no backend; as três migrações de consumidores frontend possuem conjuntos de páginas/testes disjuntos e reutilizam T005 já estável |
| 3 | T004 | modelo e DTOs já estão estáveis; migração, snapshot e SQL idempotente têm posse exclusiva para impedir geração concorrente |
| 4 | T009 | cenário E2E integra cadastro, API e apresentação somente depois de todas as fatias e migração estarem prontas |
| 5 | T010 | auditoria final executa validações cruzadas e buscas estruturais após o DAG funcional completo |

## Cobertura planejada

| Requisito | Tarefas |
|---|---|
| RF-001 | T001, T002, T006, T007, T009, T010 |
| RF-002 | T001, T002, T009, T010 |
| RF-003 | T003, T005, T006, T007, T008, T009, T010 |
| RF-004 | T003, T004, T005, T006, T007, T008, T009, T010 |
| RNF-001 | T003, T004, T005, T006, T007, T008, T009, T010 |
| RNF-002 | T001, T002, T009, T010 |
| CA-001 | T001, T002, T009, T010 |
| CA-002 | T001, T002, T009, T010 |
| CA-003 | T003, T005, T006, T007, T008, T009, T010 |
| CA-004 | T004, T005, T006, T007, T008, T010 |

## T001 — Validar e normalizar cidade e curso no backend

- Status: concluída
- Issue principal: #218
- Issues relacionadas: #216
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-001, RF-002, RNF-002, CA-001, CA-002
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Services/UsuarioService.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Usuarios/UsuarioValidationResult.cs`, `backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs`, `backend/Tests/Services/UsuarioServiceValidationTests.cs`, `backend/Tests/Controllers/UsuarioRegistrationValidationTests.cs`

### Escopo

Evoluir a validação condicional de acadêmico para normalizar cidade/curso com `Trim()`, rejeitar cidade vazia ou igual a `Indefinido` sem distinguir caixa e exigir curso de 2–100 caracteres após trim. Retornar resultado específico de usuário com erros por campo; o controller deve responder `400 application/problem+json` com `errors.cidade` e/ou `errors.curso`, sem ecoar valores, e mapear/persistir somente os valores normalizados. Preservar as validações atuais de tipo, nível, instituição, responsável e senha.

### Critérios de conclusão

- Cidade válida e curso `ES` com espaços externos chegam normalizados ao mapeamento/persistência.
- Cidade nula, vazia, whitespace e variações de `Indefinido` são rejeitadas somente para acadêmico.
- Curso com 1 ou 101 caracteres após trim é rejeitado; 2 e 100 são aceitos.
- Uma chamada direta recebe Problem Details com chaves/textos estáveis, sem payload ou PII no erro/log.
- `dataIngresso`, status e identidade continuam fora do controle do corpo de cadastro.
- Testes existentes de política de senha e criação continuam verdes.

### Plano TDD

- RED: adicionar testes parametrizados ao serviço e controller; observar falhas para whitespace/sentinela, limites 1/2/100/101, ausência de trim e resposta agregada atual.
- GREEN: criar o resultado estruturado mínimo, normalizar no serviço e traduzir os erros no controller antes do AutoMapper.
- REFACTOR: extrair constantes/mensagens e builder de DTO sem alterar as chaves públicas nem compartilhar `ResultadoValidacaoDTO` usado por produtos/lotes.

### Validação

- `dotnet test backend/Tests/Tests.csproj --filter "FullyQualifiedName~UsuarioServiceValidationTests|FullyQualifiedName~UsuarioRegistrationValidationTests|FullyQualifiedName~UserCreationPasswordPolicyTests" -c Release --nologo --disable-build-servers`
- `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`

### Notas

Não adicionar constraint de banco nesta tarefa. Regras novas valem para escritas de cadastro; dados legados permanecem legíveis.

## T002 — Coletar cidade e aceitar cursos curtos no cadastro frontend

- Status: concluída
- Issue principal: #216
- Issues relacionadas: #218
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-001, RF-002, RNF-002, CA-001, CA-002
- Caminhos sob responsabilidade: `frontend/src/contracts/userRegistration.ts`, `frontend/src/contracts/userRegistration.test.ts`, `frontend/src/pages/CreateAccount.tsx`, `frontend/src/pages/CreateAccount.test.tsx`, `frontend/src/integration/Auth.ts`, `frontend/src/components/global/inputs/Text.tsx`, `frontend/src/components/global/inputs/Text.test.tsx`

### Escopo

Criar schema Zod de cadastro acadêmico, adicionar o campo Cidade, trocar a regra de Curso para texto livre de 2–100 após trim e remover o literal `cidade: 'Indefinido'`. O payload deve transportar os valores normalizados. Tornar label, input e mensagem de erro do `InputText` associados por `htmlFor`/`id` e `aria-describedby`/`aria-invalid`, preservando os usos existentes.

### Critérios de conclusão

- O formulário possui campo Cidade visível, obrigatório e acessível.
- `ES` é aceito; curso com 1/101 e cidade vazia/whitespace/sentinela são bloqueados com mensagem de campo.
- Payload válido contém cidade/curso trimados e nenhuma ocorrência hardcoded de `Indefinido`.
- A tipagem de `createMentor` exige cidade e curso reais sem recorrer a cast.
- Falha retornada pelo backend pode ser associada a `cidade`/`curso` sem substituir a autoridade do servidor.

### Plano TDD

- RED: testes de schema e Testing Library falham porque cidade não existe, `ES` é rejeitado, o payload fabrica sentinela e erros não estão associados ao input.
- GREEN: implementar schema, campo, payload e atributos acessíveis mínimos até todos os casos passarem.
- REFACTOR: centralizar mensagens/normalização no contrato de cadastro e remover regras duplicadas do componente sem alterar a jornada.

### Validação

- `npm run test -- --run src/contracts/userRegistration.test.ts src/components/global/inputs/Text.test.tsx src/pages/CreateAccount.test.tsx`
- `rg -n "cidade:\s*'Indefinido'|curso:\s*z\.string\(\)\.min\(6" src`
- `npm run lint`
- `npm run build`

### Notas

A busca estrutural deve terminar sem ocorrências; código 1 do `rg` significa sucesso nessa verificação negativa.

## T003 — Padronizar DataIngresso e DTOs de usuário no backend

- Status: concluída
- Issue principal: #226
- Issues relacionadas: #217
- Dependências: T001
- Paralela: sim
- Requisitos: RF-003, RF-004, RNF-001, CA-003
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Models/Usuario.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Usuarios/UsuarioDTO.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Usuarios/AcademicoDTO.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Usuarios/ResponsavelDTO.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Usuarios/DependenteDTO.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Usuarios/UsuarioDTOPatchResponse.cs`, `backend/LabSolos-Server-DotNet8/Mappings/UsuarioMappingProfile.cs`, `backend/LabSolos-Server-DotNet8/Mappings/DependenteMappingProfile.cs`, `backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs`, `backend/LabSolos-Server-DotNet8/Data/Seeds/SeedUsuarios.cs`, `backend/Tests/Mappings/MappingConfigurationTests.cs`, `backend/Tests/Contracts/UsuarioDataContractTests.cs`, `backend/Tests/Controllers/UserCreationPasswordPolicyTests.cs`

### Escopo

Alterar `Usuario.DataIngresso` e todos os DTOs equivalentes para `DateOnly?`, consolidar campos compartilhados sem mudar nomes JSON e tornar mapeamentos explícitos para nulabilidade/enums. No cadastro, injetar o `TimeProvider` já registrado e atribuir `DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime)`; atualizar o seed para data civil. Caracterizar todos os endpoints que serializam usuário, responsável, dependente, criação, patch e aprovação, incluindo OpenAPI `string/date/null`.

### Critérios de conclusão

- Nenhum DTO de usuário usa `DateTime` ou `string` para `DataIngresso`; todos usam `DateOnly?`.
- JSON contém somente `YYYY-MM-DD` ou `null`, nunca horário/sufixo de timezone.
- Campos equivalentes mantêm nomes, nulabilidade e valores textuais de enum compatíveis.
- Relógio controlado prova a data UTC escolhida na virada de dia.
- AutoMapper valida a configuração e não depende de conversão implícita de data.
- `POST`, `GET`, dependentes/responsáveis, patch e aprovação têm testes representativos de contrato.

### Plano TDD

- RED: testes de reflexão/mapeamento/serialização falham nas divergências atuais; teste com relógio controlado falha porque o controller usa `DateTime.UtcNow`.
- GREEN: padronizar entidade/DTOs/mapeamentos e injetar relógio até JSON, OpenAPI e endpoints satisfazerem o contrato.
- REFACTOR: extrair base/composição comum somente onde não introduzir propriedade indevida ou recursão em `Responsavel`; manter o JSON aprovado pelos testes.

### Validação

- `dotnet test backend/Tests/Tests.csproj --filter "FullyQualifiedName~UsuarioDataContractTests|FullyQualifiedName~MappingConfigurationTests|FullyQualifiedName~UserCreationPasswordPolicyTests" -c Release --nologo --disable-build-servers`
- `rg -n "(DateTime|string)\??\s+DataIngresso" backend/LabSolos-Server-DotNet8/DTOs/Usuarios backend/LabSolos-Server-DotNet8/Models/Usuario.cs`
- `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`

### Notas

A busca deve encontrar apenas ocorrências justificadas fora do contrato alvo; dentro dos DTOs/modelo de usuário o resultado esperado é zero para `DateTime|string`. Não gerar migração ainda.

## T004 — Migrar DataIngresso para PostgreSQL date preservando legado

- Status: concluída
- Issue principal: #217
- Issues relacionadas: #226
- Dependências: T003
- Paralela: não
- Requisitos: RF-004, RNF-001, CA-004
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Data/Context/AppDbContext.cs`, `backend/LabSolos-Server-DotNet8/Data/Migrations/**`, `backend/Tests/Data/UserDataMigrationTests.cs`

### Escopo

Gerar migração posterior a `CredentialLifecycle` que converta `DataIngresso` de `timestamp with time zone null` para `date null` usando data UTC explícita. Cobrir banco novo e upgrade de schema anterior com valores nulo, próximo à virada UTC e acadêmico com cidade `Indefinido`. Gerar/revisar SQL idempotente e atualizar o runbook de migrações com backup, impacto e reversão lossy.

### Critérios de conclusão

- Banco novo chega a `date null` via `Migrate()` e reaplicação é idempotente.
- Upgrade transforma instantes em sua data UTC, independentemente do timezone da sessão PostgreSQL.
- `null` continua `null`; cidade/curso legados não sofrem `UPDATE`, constraint ou inferência.
- `Down` documenta reconstrução à meia-noite UTC e a impossibilidade de recuperar horário sem backup.
- Script idempotente contém a migração nova e é revisável sem drift do snapshot.

### Plano TDD

- RED: ampliar teste PostgreSQL para exigir a terceira migração/tipo `date`; observar o modelo atual ou ausência da migração falhar, sem quebrar migração existente.
- GREEN: configurar tipo, gerar migração/snapshot e ajustar SQL UTC até banco novo e upgrade passarem.
- REFACTOR: nomear migração/SQL de forma estável, remover dependência de timezone implícito e documentar rollback sem alterar dados.

### Validação

- `dotnet test backend/Tests/Tests.csproj --filter "FullyQualifiedName~UserDataMigrationTests|FullyQualifiedName~CredentialLifecycleMigrationTests|FullyQualifiedName~DatabaseProviderCompatibilityTests" -c Release --nologo --disable-build-servers`
- `dotnet ef migrations script --idempotent --project backend/LabSolos-Server-DotNet8/LabSolos-Server-DotNet8.csproj --output .tmp/user-data-contracts.sql`
- `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`

### Notas

Não executar `database update` contra conexão externa. O teste deve usar `PostgreSqlContainerFixture`; EF `InMemory` não é evidência para cast ou tipo Npgsql.

## T005 — Criar contrato frontend e apresentação de dados de usuário

- Status: concluída
- Issue principal: #217
- Issues relacionadas: #226
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-003, RF-004, RNF-001, CA-003, CA-004
- Caminhos sob responsabilidade: `frontend/src/contracts/user.ts`, `frontend/src/contracts/user.test.ts`, `frontend/src/function/date.ts`, `frontend/src/function/date.test.ts`

### Escopo

Criar schemas Zod e tipos inferidos compartilhados para usuário, acadêmico, responsável e dependente, com `dataIngresso` estritamente `YYYY-MM-DD | null`. Adicionar `formatCivilDate` sem construir `Date` e `displayUserValue` para `null`, vazio e cidade `Indefinido`. Preservar os formatadores de instantes usados por empréstimos e outros domínios.

### Critérios de conclusão

- Schema aceita data civil válida/null e rejeita timestamp, formato impossível e tipos divergentes.
- Tipos comuns expressam telefone/cidade/curso anuláveis e enums textuais conforme a API.
- `formatCivilDate` produz `dd/MM/yyyy` sem variar por timezone; ausência/inválido produz `Não informado` conforme contrato.
- `displayUserValue` traduz somente ausência/vazio/sentinela e preserva valores reais.
- `formatDate`/`formatDateTime` continuam atendendo datas de outros domínios sem regressão.

### Plano TDD

- RED: testes de schema/helper falham porque o contrato compartilhado e formatador civil não existem; caracterizar formatadores atuais antes de alterá-los.
- GREEN: implementar schemas, tipos e helpers mínimos até a matriz passar em timezone distinto quando aplicável.
- REFACTOR: compartilhar sub-schemas/códigos de enum e separar claramente data civil de instante sem migrar consumidores nesta tarefa.

### Validação

- `npm run test -- --run src/contracts/user.test.ts src/function/date.test.ts`
- `npm run lint`
- `npm run build`

### Notas

Não usar `new Date('YYYY-MM-DD')` nem adicionar dependência. Zod e date-fns já fazem parte do projeto, mas data civil deve ser formatada sem conversão em instante.

## T006 — Migrar integrações e perfis para o contrato compartilhado

- Status: concluída
- Issue principal: #217
- Issues relacionadas: #216, #226
- Dependências: T005
- Paralela: sim
- Requisitos: RF-001, RF-003, RF-004, RNF-001, CA-003, CA-004
- Caminhos sob responsabilidade: `frontend/src/integration/Users.ts`, `frontend/src/integration/Class.ts`, `frontend/src/pages/Profile.tsx`, `frontend/src/pages/mentee/Profile.tsx`, `frontend/src/pages/mentor/Profile.tsx`, `frontend/src/contracts/userProfileConsumers.test.tsx`

### Escopo

Validar respostas de usuário/dependentes nas fronteiras `Users` e `Class`, remover interfaces locais dos três perfis e usar tipos, `formatCivilDate` e `displayUserValue` compartilhados. Cidade `Indefinido`, campos ausentes e data nula devem aparecer como `Não informado`; data válida deve aparecer em `pt-BR` sem horário.

### Critérios de conclusão

- Integrações retornam tipos validados, inclusive listas e respostas individuais.
- Os três perfis não declaram contrato local divergente nem usam `formatDateTime` para ingresso.
- Testes com payload real, data nula e cidade legada comprovam a apresentação sem chamada de escrita.
- Curso/cidade reais continuam visíveis e nenhuma resposta inválida é silenciosamente convertida em dado falso.

### Plano TDD

- RED: caracterizar perfil válido e adicionar casos que hoje exibem horário/`Data inválida`/sentinela; observar falhas antes da migração.
- GREEN: integrar schemas e helpers, substituindo apenas tipos/formatação de usuário.
- REFACTOR: remover duplicações e imports mortos mantendo chamadas, rotas e layout existentes.

### Validação

- `npm run test -- --run src/contracts/userProfileConsumers.test.tsx src/contracts/user.test.ts src/function/date.test.ts`
- `rg -n "formatDateTime\([^\n]*dataIngresso|dataIngresso:\s*string" src/pages/Profile.tsx src/pages/mentee/Profile.tsx src/pages/mentor/Profile.tsx`
- `npm run lint`
- `npm run build`

### Notas

A busca estrutural deve terminar sem ocorrências nos três perfis.

## T007 — Migrar cadastro, aprovação e turmas para o contrato compartilhado

- Status: concluída
- Issue principal: #226
- Issues relacionadas: #216, #217
- Dependências: T005
- Paralela: sim
- Requisitos: RF-001, RF-003, RF-004, RNF-001, CA-003, CA-004
- Caminhos sob responsabilidade: `frontend/src/pages/RegisteredUsers.tsx`, `frontend/src/pages/RegistrationRequests.tsx`, `frontend/src/pages/ViewClass.tsx`, `frontend/src/pages/ViewClassMentor.tsx`, `frontend/src/pages/mentor/MyClass.tsx`, `frontend/src/pages/mentor/Disabled.tsx`, `frontend/src/contracts/userListConsumers.test.tsx`

### Escopo

Substituir contratos locais nas telas de usuários registrados, solicitações, turmas e desabilitados pelos tipos compartilhados. Usar data civil em listagens/detalhes e apresentar cidade/data legada como `Não informado`, sem alterar formatação de instantes de empréstimo.

### Critérios de conclusão

- Todas as telas listadas importam o contrato compartilhado e tratam `dataIngresso` como anulável.
- Nenhuma delas usa `formatDateTime` para ingresso ou mostra `Data inválida`/`Não Corresponde` para ausência prevista.
- Cidade real continua exibida; `Indefinido` e data nula aparecem como `Não informado`.
- Testes caracterizam ao menos lista, aprovação e detalhe de turma com contratos válido e legado.

### Plano TDD

- RED: adicionar testes de consumidores com data ISO/null e cidade real/sentinela; observar fallbacks e tipos atuais falharem.
- GREEN: migrar tipos e helpers tela a tela até os cenários passarem.
- REFACTOR: remover interfaces/imports duplicados e consolidar fixtures sem mudar ações de aprovar/rejeitar.

### Validação

- `npm run test -- --run src/contracts/userListConsumers.test.tsx src/contracts/user.test.ts src/function/date.test.ts`
- `rg -n "formatDateTime\([^\n]*dataIngresso|dataIngresso:\s*string" src/pages/RegisteredUsers.tsx src/pages/RegistrationRequests.tsx src/pages/ViewClass.tsx src/pages/ViewClassMentor.tsx src/pages/mentor/MyClass.tsx src/pages/mentor/Disabled.tsx`
- `npm run lint`
- `npm run build`

### Notas

Não alterar paginação, aprovação, filtros ou autorização; somente contrato/apresentação de dados de usuário.

## T008 — Migrar consumidores aninhados de usuário em empréstimos e mentorias

- Status: concluída
- Issue principal: #226
- Issues relacionadas: #217
- Dependências: T005
- Paralela: sim
- Requisitos: RF-003, RF-004, RNF-001, CA-003, CA-004
- Caminhos sob responsabilidade: `frontend/src/pages/admin/AllLoans.tsx`, `frontend/src/pages/admin/ClassLoan.tsx`, `frontend/src/pages/admin/Home.tsx`, `frontend/src/pages/admin/LoansRequest.tsx`, `frontend/src/pages/admin/MentoringHistoryAdm.tsx`, `frontend/src/pages/admin/ReturnLoan.tsx`, `frontend/src/pages/loan/LoanHistories.tsx`, `frontend/src/pages/loan/LoanHistory.tsx`, `frontend/src/pages/mentee/HistoryMentoring.tsx`, `frontend/src/pages/mentee/LoanHistory.tsx`, `frontend/src/pages/mentor/HistoryClass.tsx`, `frontend/src/pages/mentor/LoanCreation.tsx`, `frontend/src/pages/mentor/MentoringHistory.tsx`, `frontend/src/contracts/userNestedConsumers.test.tsx`

### Escopo

Remover as interfaces locais restantes que representam usuários aninhados em empréstimos, histórico e mentoria. Compor os tipos compartilhados sem confundir `dataIngresso` civil com `dataRealizacao`, `dataEmprestimo` ou outros instantes do domínio. Atualizar apresentação de ingresso somente onde ela existe.

### Critérios de conclusão

- Todos os arquivos sob responsabilidade reutilizam os tipos comuns para campos de usuário equivalentes.
- `dataIngresso` é anulável/data civil; datas de empréstimo/mentoria mantêm seus formatadores e semântica atuais.
- Testes de caracterização comprovam que a migração de tipos não altera renderização/ações não relacionadas.
- Busca não encontra declarações locais `dataIngresso: string` nesses consumidores.

### Plano TDD

- RED: caracterizar consumidores representativos e adicionar verificação estrutural/tipos que falha nas interfaces duplicadas atuais.
- GREEN: substituir interfaces por composição/imports do contrato compartilhado e corrigir somente nulabilidade/formatação de ingresso.
- REFACTOR: eliminar aliases redundantes/imports mortos e compartilhar fixtures, mantendo contratos de empréstimo fora de `user.ts`.

### Validação

- `npm run test -- --run src/contracts/userNestedConsumers.test.tsx src/contracts/user.test.ts src/function/date.test.ts`
- `rg -n "dataIngresso:\s*string|formatDateTime\([^\n]*dataIngresso" src/pages/admin src/pages/loan src/pages/mentee/HistoryMentoring.tsx src/pages/mentee/LoanHistory.tsx src/pages/mentor/HistoryClass.tsx src/pages/mentor/LoanCreation.tsx src/pages/mentor/MentoringHistory.tsx`
- `npm run lint`
- `npm run build`

### Notas

A busca pode localizar o tipo compartilhado apenas fora destes caminhos; dentro dos caminhos listados o resultado esperado é zero.

## T009 — Cobrir cadastro e contrato de usuário no E2E existente

- Status: concluída
- Issue principal: #216
- Issues relacionadas: #217, #218, #226
- Dependências: T002, T004, T006, T007, T008
- Paralela: não
- Requisitos: RF-001, RF-002, RF-003, RF-004, RNF-001, RNF-002, CA-001, CA-002, CA-003
- Caminhos sob responsabilidade: `frontend/e2e/user-data-contract.spec.ts`

### Escopo

Adicionar cenário Playwright isolado que preencha o cadastro acadêmico com cidade real e curso `ES`, intercepte/confirme payload normalizado e resposta `201` com data civil. Fazer chamada direta à API com cidade vazia/sentinela e curso fora de 2–100, exigindo Problem Details por campo. Exercitar uma apresentação de resposta ISO/null no navegador sem reutilizar ou alterar credenciais mutáveis do cenário `credential-lifecycle.spec.ts`.

CA-004 permanece comprovado verticalmente por T004 (persistência sem escrita) e T006–T008 (apresentação legada), porque a API pública não oferece criação de registro legado nem bypass de aprovação. Não criar endpoint de teste, hash fixo ou mutação de produção apenas para o E2E.

### Critérios de conclusão

- Navegador envia cidade informada e curso `ES`, ambos trimados; não envia `Indefinido`.
- API persiste o cadastro (`201`) e responde `dataIngresso` como `YYYY-MM-DD`.
- Requisições diretas inválidas retornam `400 application/problem+json` e chaves de campo estáveis.
- Cenário não depende da ordem nem modifica senha/estado do administrador usado pelo E2E de credenciais.
- Suíte existente continua 100% verde e artefatos aparecem somente em falha.

### Plano TDD

- RED: criar o spec e observar falha por campo Cidade ausente, curso `ES` bloqueado, sentinela no payload e/ou resposta atual com horário.
- GREEN: usar somente os comportamentos entregues nas tarefas anteriores e dados sintéticos únicos até o cenário passar.
- REFACTOR: extrair helpers locais de request/assert sem acoplar arquivos E2E nem condicionar asserts ao ambiente.

### Validação

- `npm run test:e2e:list`
- `docker compose -f docker-compose-e2e.yml up -d --build --wait`
- `npm run test:e2e -- user-data-contract.spec.ts`
- `npm run test:e2e`
- `docker compose -f docker-compose-e2e.yml down --volumes --remove-orphans`

### Notas

O teardown é obrigatório mesmo em falha. Os comandos Playwright são executados em `frontend/`; os comandos Compose, na raiz. Não incluir cidade, curso, e-mail ou payload completo em trace manual/log adicional.

## T010 — Auditar integração, cobertura e prontidão de disponibilização

- Status: concluída
- Issue principal: #226
- Issues relacionadas: #216, #217, #218
- Dependências: T009
- Paralela: não
- Requisitos: RF-001, RF-002, RF-003, RF-004, RNF-001, RNF-002, CA-001, CA-002, CA-003, CA-004
- Caminhos sob responsabilidade: nenhum; tarefa de validação integrada e atualização de status/log deste `tasks.md`

### Escopo

Executar toda a esteira pré-merge e as verificações estruturais cruzadas. Revisar o SQL idempotente gerado, confirmar que não há DTO/interface divergente, sentinela novo, formatação de ingresso como instante ou alteração de cidade legada. Registrar evidências, avisos preexistentes, exigência de backup e coordenação backend/frontend; não corrigir defeitos encontrados fora dos caminhos das tarefas anteriores — reabrir a tarefa proprietária.

### Critérios de conclusão

- Backend completo, frontend completo, lint, build e todos os E2E passam.
- Busca confirma ausência de `DateTime|string DataIngresso` no backend alvo, `dataIngresso: string` nas páginas e cidade hardcoded no cadastro.
- Migração contém cast UTC, preserva nulos/cidade e possui reversão/documentação de perda de horário.
- Cada RF/RNF/CA possui evidência registrada; nenhum requisito depende apenas de teste pós-merge.
- Worktree final contém somente alterações intencionais e nenhum artefato gerado por build/teste.

### Plano TDD

- RED: usar a checklist como gate objetivo; qualquer comando, busca negativa ou item de rastreabilidade que falhe mantém a tarefa pendente e identifica a tarefa proprietária.
- GREEN: revalidar após a tarefa proprietária corrigir a lacuna; não implementar comportamento novo nesta tarefa.
- REFACTOR: consolidar evidências no log e remover artefatos gerados pela própria validação sem tocar mudanças preexistentes.

### Validação

- `dotnet restore backend/backend.sln`
- `dotnet build backend/backend.sln --no-restore -c Release --nologo --disable-build-servers`
- `dotnet test backend/backend.sln --no-build --no-restore -c Release --nologo --disable-build-servers`
- `npm --prefix frontend run test -- --run`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run build`
- `npm --prefix frontend run test:e2e:list`
- `docker compose -f docker-compose-e2e.yml up -d --build --wait`
- `npm --prefix frontend run test:e2e`
- `docker compose -f docker-compose-e2e.yml down --volumes --remove-orphans`
- `rg -n "cidade:\s*'Indefinido'|formatDateTime\([^\n]*dataIngresso|dataIngresso:\s*string" frontend/src`
- `rg -n "(DateTime|string)\??\s+DataIngresso" backend/LabSolos-Server-DotNet8/DTOs/Usuarios backend/LabSolos-Server-DotNet8/Models/Usuario.cs`
- `git diff --check`

### Notas

As duas buscas estruturais são negativas nos caminhos alvo e podem retornar código 1 como sucesso. Se Docker estiver indisponível, a tarefa não pode ser concluída apenas com testes unitários.

## Auditoria do DAG

- IDs: T001–T010, únicos e sequenciais.
- Ciclos: nenhum; todas as dependências apontam para IDs anteriores.
- Caminho crítico: T001 → T003 → T004 → T009 → T010.
- Paralelismo seguro: tarefas da mesma onda não compartilham arquivos ou caminhos declarados. T002 e T005 usam arquivos exatos distintos em `frontend/src/contracts/`; T006–T008 possuem páginas e testes distintos.
- Arquivos compartilhados: `UsuariosController.cs` pertence a T001 e depois T003, separados por dependência; `Data/Migrations/**` pertence exclusivamente a T004.
- Infraestrutura: xUnit/PostgreSQL, Vitest/Testing Library, Playwright e `container-ci.yml` já existem e são gates pré-merge; nenhuma tarefa de instalação/CI é necessária.
- Integração final: T009 contém apenas cenário cruzado; T010 contém apenas auditoria/evidência.
- Cobertura bidirecional: todo RF/RNF/CA aparece na tabela e em ao menos uma tarefa; todas as tarefas referenciam requisitos, sem tarefa órfã de infraestrutura.

## Log de execução

| Data | Tarefa | Resultado | Testes/evidências | Observações |
|---|---|---|---|---|
| 2026-08-31 | T001 | concluída | RED 11/14; focados 23/23; regressão sem Docker 76/76 | Suíte completa: 76/99; 23 integrações impedidas exclusivamente por Docker indisponível. Issue #218 atribuída e em andamento. |
| 2026-08-31 | T002 | concluída | RED de Cidade/acessibilidade; focados 15/15; frontend 99/99; lint/build/busca verdes | Issue #216 atribuída e em andamento; apenas avisos preexistentes de build. |
| 2026-08-31 | T005 | concluída | RED de contrato/helpers; focados 27/27 inclusive TZ alternativo; lint/build verdes | Issue #217 atribuída e em andamento; formatadores de instante preservados. |
| 2026-08-31 | T003 | concluída | RED 13/13; focados 28/28; regressão sem Docker 94/94; busca estrutural negativa | Suíte completa: 94/117; 23 integrações impedidas exclusivamente por Docker indisponível. Issue #226 atribuída e em andamento. |
| 2026-08-31 | T006 | concluída | RED 7/8; focados 36/36; busca/lint/build verdes após integração | Integrações validam Zod; perfis usam data civil e apresentação legada. Issue #217 em andamento. |
| 2026-08-31 | T007 | concluída | RED 4/4; focados 31/31; busca/lint/build verdes após integração | Listas, aprovações e turmas reutilizam contrato comum. Issue #226 em andamento. |
| 2026-08-31 | T008 | concluída | RED por contratos locais e 6 erros TypeScript de consumidores; combinados 54/54; frontend 126/126; busca/lint/build verdes | 13 consumidores reutilizam tipos comuns; datas de empréstimo/mentoria preservadas. Issue #226 em andamento. |
| 2026-08-31 | T004 | concluída | RED 3/3; migração focada 7/7; backend completo 120/120; script idempotente revisado | Cast UTC, null/cidade legados preservados; backup e Down lossy documentados. Ajuste integrado em `CredentialLifecycleMigrationTests.cs` por contagem fixa de migrações fora da posse declarada. Issue #217 em andamento. |
| 2026-08-31 | T009 | concluída | caracterização pós-DAG; catálogo 5 testes; spec 3/3; E2E completo 5/5 | Cadastro/payload/data ISO, Problem Details direto e apresentação null/legado sem escrita; teardown com volumes executado. Issue #216 em andamento. |
| 2026-08-31 | T010 | concluída | backend 120/120; frontend 126/126; lint/build; E2E 5/5; buscas estruturais e diff-check verdes | Project #216/#217/#218/#226 em Done; issues permanecem abertas conforme skill; avisos preexistentes do frontend e alterações preexistentes em bin/obj preservados. |
