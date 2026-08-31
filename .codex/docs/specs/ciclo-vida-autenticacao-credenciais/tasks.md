# Tarefas: Ciclo de vida de autenticação e credenciais

- Status: concluído
- PRD: `./prd.md`
- Especificação técnica: `./techspec.md`
- Atualizado em: 2026-08-30

## Regras de execução

- Cada tarefa deve começar pela leitura de `prd.md`, `techspec.md` e desta decomposição.
- Executar exatamente uma tarefa por chamada de `$execute-task`; atualizar seu status e o log somente depois das validações.
- Não ampliar os caminhos sob responsabilidade sem interromper a tarefa e registrar o conflito.
- Preservar mudanças preexistentes no worktree e nunca editar artefatos rastreados em `bin/`, `obj/`, `dist/` ou `*.tsbuildinfo`.
- RED deve ser observado antes de GREEN. Infraestrutura usa uma verificação objetiva ausente/falhando, conforme indicado.
- Comandos npm indicados com `npm run` são executados em `frontend/`, salvo quando houver `npm --prefix frontend`.
- Testes PostgreSQL e E2E exigem Docker disponível. Ausência do daemon é impedimento ambiental, não autorização para substituir os testes por EF InMemory.

## Ondas de execução

| Onda | Tarefas | Motivo de segurança do paralelismo |
|---|---|---|
| 1 | T001, T002, T003, T005 | Infraestrutura backend, infraestrutura E2E, sessão frontend e formulário/política frontend possuem manifestos e diretórios distintos; T002 é a única dona de `frontend/package*.json` |
| 2 | T004, T006 | Política backend e migração dos consumidores de sessão estão em aplicações distintas e não compartilham arquivos |
| 3 | T007 | Migração/baseline altera o projeto backend e o modelo persistido; execução exclusiva evita conflito em `.csproj`, snapshot e migrações |
| 4 | T008, T009 | Seed/startup e serviço/endpoint de credenciais usam arquivos de produção e testes distintos; dependências compartilhadas já estarão estáveis |
| 5 | T010, T012 | JWT/autorização/login e cadastro atuam em controllers, serviços e testes distintos; nenhum modifica o serviço de credenciais nesta onda |
| 6 | T011, T013 | Recuperação backend e jornada frontend de primeiro acesso/troca não compartilham arquivos |
| 7 | T014 | Recuperação frontend reutiliza contratos e arquivos já alterados pela jornada anterior; execução exclusiva |
| 8 | T015 | Cenários E2E integram todas as fatias e são executados após backend/frontend completos |
| 9 | T016 | CI pré-merge é atualizada somente após os comandos e cenários finais existirem |

## Cobertura planejada

| Requisito | Tarefas |
|---|---|
| RF-001 | T008, T015, T016 |
| RF-002 | T007, T008, T010, T013, T015, T016 |
| RF-003 | T009, T013, T015, T016 |
| RF-004 | T004, T005, T008, T009, T011, T012, T014, T015, T016 |
| RF-005 | T003, T006, T007, T009, T010, T011, T013, T014, T015, T016 |
| RNF-001 | T004, T007, T008, T009, T010, T011, T012, T014, T015, T016 |
| RNF-002 | T003, T004, T005, T006, T009, T010, T012, T013, T014, T015, T016 |
| CA-001 | T001, T008, T015, T016 |
| CA-002 | T002, T007, T008, T010, T013, T015, T016 |
| CA-003 | T004, T005, T009, T011, T012, T013, T014, T015, T016 |
| CA-004 | T001, T007, T009, T010, T011, T014, T015, T016 |
| CA-005 | T002, T003, T006, T013, T014, T015, T016 |

## T001 — Criar infraestrutura de integração backend com PostgreSQL real

- Status: concluída
- Issue: #215
- Dependências: nenhuma
- Paralela: sim
- Requisitos: infraestrutura para RF-001, RF-005, CA-001 e CA-004
- Caminhos sob responsabilidade: `backend/Tests/Tests.csproj`, `backend/Tests/Infrastructure/**`, `backend/LabSolos-Server-DotNet8/Program.cs`

### Escopo

Adicionar `Microsoft.AspNetCore.Mvc.Testing` e Testcontainers para PostgreSQL ao projeto de testes, expor `Program` para `WebApplicationFactory` e criar fixtures reutilizáveis de banco descartável, configuração sintética e relógio controlável. Não implementar comportamento de credenciais.

### Critérios de conclusão

- Uma aplicação de teste inicia contra PostgreSQL descartável e responde ao health check.
- A fixture permite variar ambiente/configuração e recriar banco vazio entre casos.
- Segredos sintéticos não aparecem na saída do teste.
- Testes existentes continuam verdes.

### Plano TDD

- RED: criar um smoke test de infraestrutura que falhe porque não existe fábrica configurável/PostgreSQL descartável.
- GREEN: instalar as dependências mínimas, tornar `Program` acessível e implementar fixture/factory até o smoke test passar.
- REFACTOR: centralizar lifecycle, connection string e descarte; eliminar configuração duplicada entre testes.

### Validação

- `dotnet test backend/Tests/Tests.csproj --filter "FullyQualifiedName~Infrastructure" -c Release --nologo --disable-build-servers`
- `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`

### Notas

Não usar EF InMemory para migração, concorrência, startup ou revogação. Se Docker estiver indisponível, registrar a evidência e manter a tarefa pendente.

## T002 — Implantar infraestrutura Playwright e stack E2E isolada

- Status: concluída
- Issue: #224
- Dependências: nenhuma
- Paralela: sim
- Requisitos: infraestrutura para CA-002, CA-004 e CA-005
- Caminhos sob responsabilidade: `frontend/package.json`, `frontend/package-lock.json`, `frontend/playwright.config.ts`, `frontend/e2e/infra/**`, `docker-compose-e2e.yml`

### Escopo

Adicionar `@playwright/test`, scripts `test:e2e`/`test:e2e:list`, configuração Chromium, coleta de trace/screenshot em falha e um compose exclusivo com PostgreSQL, backend e frontend usando apenas credenciais sintéticas. Criar somente um smoke de infraestrutura, sem cenários funcionais.

### Critérios de conclusão

- `npm ci` instala Playwright pelo lockfile.
- A listagem encontra o smoke E2E.
- A stack possui health checks, projeto/volumes próprios e não usa SMTP/credenciais reais.
- Artefatos E2E e volumes locais ficam ignorados pelo Git.

### Plano TDD

- RED: `npm run test:e2e:list` falha porque script/config/dependência não existem.
- GREEN: adicionar dependência, scripts, config, smoke e compose até a listagem e o smoke contra a stack passarem.
- REFACTOR: centralizar URL, timeouts e dados sintéticos; manter execução local e CI com o mesmo comando.

### Validação

- `npm ci`
- `npm run test:e2e:list`
- `docker compose -f docker-compose-e2e.yml config --quiet`

### Notas

O compose deve ser explicitamente descartável. A remoção posterior usa somente `docker-compose-e2e.yml` e seus volumes nomeados.

## T003 — Centralizar leitura, criação e limpeza da sessão frontend

- Status: concluída
- Issue: #233
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-005, RNF-002, CA-005
- Caminhos sob responsabilidade: `frontend/src/auth/session.ts`, `frontend/src/auth/session.test.ts`

### Escopo

Criar `startSession`, `readSession` e `clearSession` para `doorKey`, `rankID` e `level`, com `path=/`, `SameSite=Strict` e `Secure` sob HTTPS. Preservar `sidebar-open-items`, `sidebar_state` e todo armazenamento não declarado como autenticação. Ainda não migrar consumidores.

### Critérios de conclusão

- Início/leitura retornam token, ID, perfil e flag de troca derivada do JWT.
- Limpeza remove apenas chaves de autenticação, inclusive com atributos compatíveis.
- Preferências em cookies/localStorage permanecem.
- JWT ausente ou malformado não autentica nem lança erro não tratado.

### Plano TDD

- RED: testes de início, leitura, token inválido, limpeza e preservação falham porque o módulo não existe.
- GREEN: implementar o menor módulo que satisfaça a matriz.
- REFACTOR: tornar a lista de chaves explícita e eliminar repetição de opções de cookie.

### Validação

- `npm run test -- --run src/auth/session.test.ts`
- `npm run lint`

### Notas

Cookies permanecem acessíveis ao JavaScript conforme o escopo confirmado; não introduzir cookie `HttpOnly` nesta tarefa.

## T004 — Implementar política única de senha e bloqueio local no backend

- Status: concluída
- Issue: #214
- Dependências: T001
- Paralela: sim
- Requisitos: RF-004, RNF-001, RNF-002, CA-003
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/LabSolos-Server-DotNet8.csproj`, `backend/LabSolos-Server-DotNet8/Program.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/PasswordPolicy.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/PasswordPolicyResult.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/SecurityServiceCollectionExtensions.cs`, `backend/LabSolos-Server-DotNet8/Resources/Security/**`, `backend/Tests/Security/PasswordPolicyTests.cs`, `backend/Tests/Security/PasswordBlocklistTests.cs`

### Escopo

Implementar `IPasswordPolicy`/`PasswordPolicy` com 15–128 caracteres Unicode, sem composição, truncamento ou transformação do valor hasheado. Comparar somente para bloqueio por `FormKC` e caixa indiferente. Empacotar `common-passwords.txt` com origem, licença e versão documentadas e registrar o serviço.

### Critérios de conclusão

- Matriz cobre vazio, 14, 15, 128, 129, Unicode, espaços e senha comum.
- Retornos usam somente os códigos estáveis definidos na techspec.
- A senha original não é devolvida pelo resultado nem registrada.
- Recurso ausente causa falha sanitizada de inicialização.
- Nenhum cliente HTTP ou reputação externa integra a política.

### Plano TDD

- RED: testes parametrizados falham nos limites, bloqueio e ausência do recurso.
- GREEN: implementar serviço, resultado, recurso e registro mínimos.
- REFACTOR: separar carregamento da lista da decisão e tornar os casos parametrizados legíveis sem duplicação.

### Validação

- `dotnet test backend/Tests/Tests.csproj --filter "FullyQualifiedName~PasswordPolicyTests|FullyQualifiedName~PasswordBlocklistTests" -c Release --nologo --disable-build-servers`
- `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`

### Notas

Não substituir a lista local por chamada externa. A licença/origem é critério de conclusão, não pergunta de produto.

## T005 — Criar schema e campos reutilizáveis de nova senha no frontend

- Status: concluída
- Issue: #214
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-004, RNF-002, CA-003
- Caminhos sob responsabilidade: `frontend/src/auth/passwordPolicy.ts`, `frontend/src/auth/passwordPolicy.test.ts`, `frontend/src/components/auth/PasswordChangeFields.tsx`, `frontend/src/components/auth/PasswordChangeFields.test.tsx`

### Escopo

Criar schema Zod e campos reutilizáveis para nova senha/confirmação com limites e mensagens antecipadas equivalentes ao backend. Não duplicar a lista de bloqueio no bundle; erro `password_common` vindo do servidor deve ter mensagem mapeada.

### Critérios de conclusão

- Limites, Unicode e confirmação possuem testes.
- Não existe regra de composição artificial.
- Componente é reutilizável por troca obrigatória, troca própria e recuperação.
- Resposta estruturada do backend pode ser mapeada por código sem ecoar valores.

### Plano TDD

- RED: testes falham para 14/15/128/129, confirmação e renderização de erro do servidor.
- GREEN: implementar schema, mapper de códigos e componente mínimo.
- REFACTOR: centralizar textos e remover conhecimento de transporte HTTP do componente.

### Validação

- `npm run test -- --run src/auth/passwordPolicy.test.ts src/components/auth/PasswordChangeFields.test.tsx`
- `npm run lint`

### Notas

O backend permanece autoridade para a lista de bloqueio; o cliente apenas traduz o código retornado.

## T006 — Migrar todos os encerramentos de sessão para o módulo central

- Status: concluída
- Issue: #233
- Dependências: T003
- Paralela: sim
- Requisitos: RF-005, RNF-002, CA-005
- Caminhos sob responsabilidade: `frontend/src/services/BaseApi.tsx`, `frontend/src/services/BaseApi.test.tsx`, `frontend/src/components/global/ButtonLogout.tsx`, `frontend/src/components/global/ButtonLogout.test.tsx`, `frontend/src/components/nav-user.tsx`, `frontend/src/pages/Login.tsx`, `frontend/src/pages/ForgotPassword.tsx`, `frontend/src/pages/ResetPassword.tsx`, `frontend/src/pages/CreateAccount.tsx`, `frontend/src/pages/BootScreen.tsx`, `frontend/src/pages/prelab/PreLab.tsx`, `frontend/src/pages/Page404.tsx`, `frontend/src/auth/sessionConsumers.test.tsx`

### Escopo

Substituir `Cookie.remove(...)`, logout apenas por navegação e `localStorage.clear()` por `clearSession()`. O interceptor `401`, botão/menu e entradas públicas devem limpar primeiro e navegar depois. Não alterar ainda contratos de login/recuperação.

### Critérios de conclusão

- Todos os pontos conhecidos chamam o módulo único.
- Logout explícito e `401` removem as três chaves e bloqueiam rota privada.
- Preferências permanecem após qualquer origem de logout.
- Busca não encontra remoção direta de chaves nem `localStorage.clear()` fora de `session.ts`/testes.

### Plano TDD

- RED: caracterizar botão que só navega e menu que apaga preferências; novos testes devem falhar no estado atual.
- GREEN: migrar consumidores um a um para `clearSession()`.
- REFACTOR: remover imports de `js-cookie` sem uso e consolidar navegação/toast sem mudar mensagens.

### Validação

- `npm run test -- --run src/auth/sessionConsumers.test.tsx src/services/BaseApi.test.tsx src/components/global/ButtonLogout.test.tsx`
- `rg -n "Cookie\.remove\('(doorKey|rankID|level)'\)|localStorage\.clear\(\)" src --glob '!src/auth/session.ts' --glob '!**/*.test.ts' --glob '!**/*.test.tsx'`
- `npm run lint`

### Notas

O segundo comando deve terminar sem ocorrências; `rg` pode retornar código 1 nesse caso, que representa sucesso da verificação negativa.

## T007 — Adotar EF migrations e persistir estado de credenciais

- Status: concluída
- Issue: #224
- Dependências: T004
- Paralela: não
- Requisitos: RF-002, RF-005, RNF-001, CA-002, CA-004
- Caminhos sob responsabilidade: `.config/dotnet-tools.json`, `backend/LabSolos-Server-DotNet8/.gitignore`, `backend/LabSolos-Server-DotNet8/LabSolos-Server-DotNet8.csproj`, `backend/LabSolos-Server-DotNet8/Models/Usuario.cs`, `backend/LabSolos-Server-DotNet8/Data/Context/AppDbContext.cs`, `backend/LabSolos-Server-DotNet8/Data/Migrations/**`, `backend/Tests/Data/CredentialLifecycleMigrationTests.cs`

### Escopo

Alinhar EF tooling à versão compatível, criar tool manifest, baseline/snapshot e migração `CredentialLifecycle`. Adicionar `ExigeTrocaSenha`, `VersaoSessao` concorrente e `TokenRedefinicaoHash`; limpar tokens existentes na migração. Documentar aplicação/marcação da baseline e rollback sem reduzir versão.

### Critérios de conclusão

- Banco novo chega ao esquema completo via `Migrate()`.
- Fixture de esquema legado/baselined recebe as novas colunas sem perda de usuários.
- Defaults são `false`/`0` e versão é token de concorrência.
- Tokens de redefinição legados são invalidados.
- Script idempotente e runbook de baseline/reversão são gerados/revisáveis.

### Plano TDD

- RED: testes PostgreSQL falham porque campos, histórico e migrações não existem.
- GREEN: adicionar modelo/configuração, tool manifest, baseline, migração e runbook até banco novo/legado passarem.
- REFACTOR: remover configuração implícita, nomear índices/constraints de modo estável e revisar o SQL idempotente.

### Validação

- `dotnet tool restore`
- `dotnet test backend/Tests/Tests.csproj --filter "FullyQualifiedName~CredentialLifecycleMigrationTests" -c Release --nologo --disable-build-servers`
- `dotnet ef migrations script --idempotent --project backend/LabSolos-Server-DotNet8/LabSolos-Server-DotNet8.csproj --output .tmp/credential-lifecycle.sql`
- `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`

### Notas

Não aplicar migração em banco externo nesta tarefa. O teste deve criar apenas bancos/contêineres descartáveis.

Durante a execução, o orquestrador incluiu o `.gitignore` do projeto porque a regra preexistente `Migrations/` tornava invisíveis ao Git os artefatos exigidos por esta tarefa.

## T008 — Tornar startup e seed seguros e determinísticos

- Status: concluída
- Issue: #215
- Dependências: T001, T004, T007
- Paralela: sim
- Requisitos: RF-001, RF-002, RF-004, RNF-001, CA-001, CA-002
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Program.cs`, `backend/LabSolos-Server-DotNet8/Data/Seeds/DbSeeder.cs`, `backend/LabSolos-Server-DotNet8/Data/Seeds/DbSeeder.Production.cs`, `backend/LabSolos-Server-DotNet8/Data/Seeds/DbSeeder.Development.cs`, `backend/LabSolos-Server-DotNet8/Data/Seeds/SeedUsuarios.cs`, `backend/LabSolos-Server-DotNet8/appsettings.example.json`, `docker-compose-dev.yml`, `docker-compose-prod.yml`, `backend/Tests/Integration/SecureSeedStartupTests.cs`

### Escopo

Trocar `EnsureCreated()` por `Migrate()`. Em banco sem usuários, exigir `Seed:AdminEmail`/`Seed:AdminPassword`, validar e-mail e política, criar `Administrador inicial` habilitado com troca obrigatória. Em banco com usuário, não ler nem sobrescrever segredo. Atualizar envs para `Seed__AdminEmail`/`Seed__AdminPassword`.

### Critérios de conclusão

- Produção/banco vazio sem chaves, e-mail inválido, senha fraca ou bloqueada aborta antes de health check.
- Mensagem identifica chave/regra, nunca valor de senha.
- Configuração válida cria exatamente um admin com hash, flag `true` e versão `0`.
- Reinício e banco populado não exigem nem alteram credencial do seed.
- Nenhum e-mail/senha fixo permanece no seed de produção/desenvolvimento.

### Plano TDD

- RED: integração de processo demonstra que configuração inválida ainda pode iniciar/usar regra antiga e que banco populado é decidido por tabelas não relacionadas.
- GREEN: implementar validação/seed único, envs e `Migrate()` até a matriz passar.
- REFACTOR: eliminar caminhos duplicados de seed e extrair resultado sanitizado sem mudar os casos.

### Validação

- `dotnet test backend/Tests/Tests.csproj --filter "FullyQualifiedName~SecureSeedStartupTests" -c Release --nologo --disable-build-servers`
- `docker compose -f docker-compose-prod.yml config --no-interpolate --quiet`
- `docker compose -f docker-compose-dev.yml config --no-interpolate --quiet`
- `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`

### Notas

Os comandos compose exigem variáveis sintéticas definidas pela tarefa/teste; não ler `.env` com segredos no log.

## T009 — Implementar alteração autenticada e serviço de credenciais

- Status: concluída
- Issue: #214
- Dependências: T004, T007
- Paralela: sim
- Requisitos: RF-003, RF-004, RF-005, RNF-001, RNF-002, CA-003, CA-004
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Services/Security/CredentialService.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/CredentialTelemetry.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/SecurityServiceCollectionExtensions.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Auth/ChangePasswordDTO.cs`, `backend/LabSolos-Server-DotNet8/Controllers/AuthController.cs`, `backend/Tests/Security/CredentialServiceTests.cs`, `backend/Tests/Controllers/AuthChangePasswordTests.cs`

### Escopo

Criar `ICredentialService` e `POST /api/Auth/change-password`. Derivar usuário de `sub`, validar confirmação/senha atual/política, atualizar hash, limpar recuperação/flag e incrementar versão numa transação. Retornar Problem Details estável, `204` ou `409`, e telemetria sanitizada.

### Critérios de conclusão

- Identidade enviada no corpo não é aceita.
- Senha atual errada, confirmação e política retornam códigos específicos sem logout indevido.
- Sucesso incrementa versão, limpa token/flag e aceita `SuccessRehashNeeded`.
- Concorrência retorna `409` e não produz atualização parcial.
- Respostas/logs/métricas nunca incluem credencial, hash ou JWT.

### Plano TDD

- RED: testes de serviço/controller falham para cada entrada e demonstram que não existe endpoint/revogação.
- GREEN: implementar DTO, serviço, endpoint, transação e telemetria mínimos.
- REFACTOR: centralizar a tradução para Problem Details e reduzir duplicação entre serviço/controller sem antecipar a migração dos consumidores de recuperação/cadastro.

### Validação

- `dotnet test backend/Tests/Tests.csproj --filter "FullyQualifiedName~CredentialServiceTests|FullyQualifiedName~AuthChangePasswordTests" -c Release --nologo --disable-build-servers`
- `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`

### Notas

Esta tarefa incrementa a versão; a rejeição efetiva dos JWTs antigos será entregue em T010.

## T010 — Validar versão JWT e restringir primeiro acesso no backend

- Status: concluída
- Issue: #224
- Dependências: T008, T009
- Paralela: sim
- Requisitos: RF-002, RF-005, RNF-001, RNF-002, CA-002, CA-004
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Program.cs`, `backend/LabSolos-Server-DotNet8/Services/JwtService.cs`, `backend/LabSolos-Server-DotNet8/Controllers/AuthController.cs`, `backend/Tests/Integration/JwtSessionVersionTests.cs`, `backend/Tests/Integration/RequiredPasswordChangeAuthorizationTests.cs`, `backend/Tests/Controllers/AuthLoginContractTests.cs`

### Escopo

Emitir `session_version` e `password_change_required`, devolver `requiresPasswordChange` no login e validar usuário/status/versão em `OnTokenValidated`. Fazer política padrão e políticas por perfil exigirem troca concluída; manter o endpoint de troca acessível a usuário autenticado pendente.

### Critérios de conclusão

- Login falho usa `401` genérico e não enumera status/conta.
- JWT sem claim, malformado, de usuário ausente/desabilitado ou versão antiga recebe `401`.
- Dois tokens anteriores à troca passam antes e falham depois.
- Admin pendente recebe `403` nas APIs privadas e consegue chamar somente a troca autenticada.
- Novo login após troca recebe flag `false` e acessa seu perfil.

### Plano TDD

- RED: caracterizar JWT atual aceito após incremento e admin pendente aceito em API privada.
- GREEN: adicionar claims, validação de banco, políticas e resposta aditiva do login.
- REFACTOR: projetar somente campos necessários na validação e centralizar nomes de claims/políticas.

### Validação

- `dotnet test backend/Tests/Tests.csproj --filter "FullyQualifiedName~JwtSessionVersionTests|FullyQualifiedName~RequiredPasswordChangeAuthorizationTests|FullyQualifiedName~AuthLoginContractTests" -c Release --nologo --disable-build-servers`
- `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`

### Notas

Não aceitar JWT legado sem versão como compatibilidade: isso violaria CA-004.

## T011 — Proteger recuperação e revogar sessões na redefinição

- Status: concluída
- Issue: #214
- Dependências: T009, T010
- Paralela: sim
- Requisitos: RF-004, RF-005, RNF-001, RNF-002, CA-003, CA-004
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Controllers/EmailController.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Email/EmailDTO.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Email/RedefinirSenhaDTO.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Email/PasswordResetRequestDTO.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Email/PasswordResetDTO.cs`, `backend/LabSolos-Server-DotNet8/Services/Security/CredentialService.cs`, `backend/LabSolos-Server-DotNet8/Services/JwtService.cs`, `backend/Tests/Controllers/PasswordRecoveryTests.cs`, `backend/Tests/Security/RecoveryTokenTests.cs`

### Escopo

Implementar `request-password-reset` e `reset-password`: resposta `202` uniforme, token Base64url com pelo menos 128 bits, somente SHA-256 persistido, associação ao e-mail, expiração UTC/comparação constante, consumo único, política comum e incremento de versão. Manter aliases antigos apenas na janela descrita.

### Critérios de conclusão

- Conta inexistente/desabilitada e elegível produzem resposta pública indistinguível.
- Banco nunca armazena token original; logs/respostas não o ecoam.
- Token inválido, expirado, consumido ou de outro e-mail falha genericamente.
- Reset válido aplica a política, limpa flag/token e invalida todos os JWTs anteriores.
- Falha SMTP é observável internamente sem enumerar conta ou expor segredo.

### Plano TDD

- RED: caracterizar enumeração atual, `Random`, token em texto e JWT ainda válido após reset.
- GREEN: implementar contratos, geração/hash/verificação, resposta uniforme e revogação.
- REFACTOR: isolar relógio/gerador para determinismo, fazer aliases delegarem sem duplicar regras e remover o helper de hash antigo de `JwtService`.

### Validação

- `dotnet test backend/Tests/Tests.csproj --filter "FullyQualifiedName~PasswordRecoveryTests|FullyQualifiedName~RecoveryTokenTests" -c Release --nologo --disable-build-servers`
- `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`

### Notas

SHA-256 só é aceitável porque o token possui no mínimo 128 bits de entropia; não voltar ao código numérico curto.

## T012 — Aplicar a política única ao cadastro de usuários

- Status: concluída
- Issue: #214
- Dependências: T004, T009
- Paralela: sim
- Requisitos: RF-004, RNF-001, RNF-002, CA-003
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Usuarios/AddUsuarioDTO.cs`, `backend/LabSolos-Server-DotNet8/Services/UsuarioService.cs`, `backend/LabSolos-Server-DotNet8/Models/Usuario.cs`, `backend/Tests/Controllers/UserCreationPasswordPolicyTests.cs`

### Escopo

Fazer cadastro chamar `IPasswordPolicy` e o serviço de credenciais/hash, com `ExigeTrocaSenha=false`. Retornar os mesmos códigos de política usados em alteração/recuperação e garantir que DTO de saída não inclua senha/hash.

### Critérios de conclusão

- A mesma tabela 14/15/128/129/bloqueada produz a mesma decisão do backend.
- Usuário válido mantém o fluxo/status atual e não é marcado para troca obrigatória.
- Nenhuma senha/hash aparece no `CreatedAtAction`, Problem Details ou log capturado.
- O controller não instancia `PasswordHasher` nem duplica limites.

### Plano TDD

- RED: caracterizar que cadastro atual aceita senha fora da política.
- GREEN: injetar/reutilizar serviços e traduzir o resultado estruturado.
- REFACTOR: remover validação/hash duplicados do caminho de cadastro e o helper `Usuario.DefinirSenha` sem consumidores, preservando regras não relacionadas de usuário.

### Validação

- `dotnet test backend/Tests/Tests.csproj --filter "FullyQualifiedName~UserCreationPasswordPolicyTests" -c Release --nologo --disable-build-servers`
- `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`

### Notas

Não alterar autorização/aprovação de cadastro fora do necessário para a senha.

## T013 — Entregar primeiro acesso e alteração própria no frontend

- Status: concluída
- Issue: #224
- Dependências: T003, T005, T006, T009, T010
- Paralela: sim
- Requisitos: RF-002, RF-003, RF-005, RNF-002, CA-002, CA-003, CA-005
- Caminhos sob responsabilidade: `frontend/src/integration/Auth.ts`, `frontend/src/pages/Login.tsx`, `frontend/src/pages/ChangePassword.tsx`, `frontend/src/pages/admin/Settings.tsx`, `frontend/src/components/base/PrivateRoutes.tsx`, `frontend/src/components/base/PasswordChangeRequiredRoute.tsx`, `frontend/src/routes.tsx`, `frontend/src/auth/session.ts`, `frontend/src/auth/firstAccess.test.tsx`, `frontend/src/pages/ChangePassword.test.tsx`, `frontend/src/routes.test.tsx`

### Escopo

Consumir `requiresPasswordChange`, iniciar sessão pelo módulo central, criar `/change-password-required` e tela reutilizada em configurações para troca própria. Guards devem redirecionar sessão pendente e impedir rota obrigatória sem sessão/flag. Após `204`, limpar sessão e exigir login.

### Critérios de conclusão

- Login pendente navega somente à troca; login comum mantém home por perfil.
- Manipular cookies/URL não vence a proteção backend e o frontend redireciona corretamente.
- Formulário envia senha atual, nova e confirmação, traduz códigos e não registra payload.
- Sucesso limpa sessão antes de navegar; erro de senha atual não dispara logout automático.
- Rotas privadas ficam inacessíveis após troca até novo login.

### Plano TDD

- RED: testes de login/guards demonstram que a flag é ignorada e não existe tela/endpoint cliente.
- GREEN: integrar contrato, rotas, guards, formulário e limpeza pós-sucesso.
- REFACTOR: compartilhar a página entre modo obrigatório/próprio e manter decisão de perfil em função pura.

### Validação

- `npm run test -- --run src/auth/firstAccess.test.tsx src/pages/ChangePassword.test.tsx src/routes.test.tsx`
- `npm run lint`
- `npm run build`

### Notas

O interceptor global não deve tratar `400 current_password_invalid` como expiração; somente `401` encerra sessão.

## T014 — Migrar recuperação frontend para os contratos seguros

- Status: concluída
- Issue: #214
- Dependências: T005, T006, T011, T013
- Paralela: não
- Requisitos: RF-004, RF-005, RNF-001, RNF-002, CA-003, CA-004, CA-005
- Caminhos sob responsabilidade: `frontend/src/integration/Auth.ts`, `frontend/src/pages/ForgotPassword.tsx`, `frontend/src/pages/ResetPassword.tsx`, `frontend/src/pages/ForgotPassword.test.tsx`, `frontend/src/pages/ResetPassword.test.tsx`

### Escopo

Consumir `request-password-reset`/`reset-password`, sempre mostrar resposta neutra da solicitação e enviar e-mail, token, nova senha e confirmação. Reutilizar campos/política, remover `console.log` de resposta e limpar sessão após reset.

### Critérios de conclusão

- Conta existente/inexistente apresenta a mesma mensagem pública e navegação.
- Formulário usa limites/mensagens comuns e envia confirmação.
- Token/payload/resposta não é registrado.
- Sucesso limpa sessão e exige novo login; `400` de validação mostra mensagem por código.
- Contratos antigos não são chamados pelo frontend.

### Plano TDD

- RED: caracterizar enumeração da tela, mínimo 8, ausência de confirmação no DTO e `console.log` atual.
- GREEN: migrar integração/telas e reutilizar componentes até os testes passarem.
- REFACTOR: remover branches impossíveis após `202` e consolidar tradução de Problem Details.

### Validação

- `npm run test -- --run src/pages/ForgotPassword.test.tsx src/pages/ResetPassword.test.tsx src/auth/passwordPolicy.test.ts`
- `rg -n "console\.log|solicitar-redefinicao|redefinir-senha" src/pages/ForgotPassword.tsx src/pages/ResetPassword.tsx src/integration/Auth.ts`
- `npm run lint`
- `npm run build`

### Notas

A busca final deve ficar sem ocorrências dos endpoints antigos e de `console.log` nesses arquivos.

## T015 — Cobrir jornadas completas e reversão com Playwright

- Status: concluída
- Issue: #224
- Dependências: T002, T008, T010, T011, T012, T013, T014
- Paralela: não
- Requisitos: RF-001, RF-002, RF-003, RF-004, RF-005, RNF-001, RNF-002, CA-001, CA-002, CA-003, CA-004, CA-005
- Caminhos sob responsabilidade: `frontend/e2e/infra/**`, `frontend/e2e/credential-lifecycle.spec.ts`, `frontend/playwright.config.ts`, `frontend/vite.config.ts`, `docker-compose-e2e.yml`

### Escopo

Substituir/expandir o smoke com jornadas determinísticas: admin seedado restrito, troca obrigatória, token antigo rejeitado, novo login liberado, alteração própria e logout preservando preferências. Cobrir reset/revogação por API dentro do cenário quando SMTP for stubado. Exercitar startup inválido como cenário de stack/processo.

### Critérios de conclusão

- CA-001 a CA-005 possuem evidência automatizada na camada apropriada.
- Teste demonstra dois tokens anteriores rejeitados após troca e após redefinição.
- Logout remove autenticação, preserva sidebar e bloqueia rota privada após refresh.
- Trace/screenshot aparecem somente em falha e não contêm senha em nomes/metadados.
- Stack é removida com volumes após execução, mesmo quando o teste falha.

### Plano TDD

- RED: escrever cada cenário e observar falha específica ou ausência de fixture antes de ajustar somente suporte E2E.
- GREEN: completar fixtures/seletores/dados mínimos sem alterar comportamento de produção fora do escopo das tarefas anteriores.
- REFACTOR: usar page objects apenas para passos repetidos e eliminar esperas temporais frágeis.

### Validação

- `docker compose -f docker-compose-e2e.yml up -d --build --wait`
- `npm --prefix frontend run test:e2e`
- `docker compose -f docker-compose-e2e.yml down --volumes --remove-orphans`
- `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`
- `npm --prefix frontend run test -- --run`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run build`

### Notas

O teardown atua somente na stack E2E explicitamente nomeada. Não usar `docker system prune` nem remover volumes fora do compose E2E.

Durante a execução, o orquestrador incluiu `frontend/vite.config.ts` para excluir `frontend/e2e/**` da descoberta do Vitest: o arquivo Playwright exigido por esta tarefa usa o sufixo `.spec.ts` e seria coletado indevidamente pela suíte unitária.

## T016 — Tornar PostgreSQL e E2E gates pré-merge

- Status: concluída
- Issue: #224
- Dependências: T001, T002, T007, T015
- Paralela: não
- Requisitos: infraestrutura de validação para RF-001–RF-005, RNF-001, RNF-002 e CA-001–CA-005
- Caminhos sob responsabilidade: `.github/workflows/container-ci.yml`, `.github/scripts/tests/test_container_ci_workflow.py`

### Escopo

Atualizar o gate de PR para executar testes backend PostgreSQL/migrações e um job `auth-e2e` com stack sintética, Chromium, health checks, timeout e artefatos em falha. Preservar permissões mínimas, eventos de PR para `develop`, pinagem de actions e jobs existentes.

### Critérios de conclusão

- Teste estrutural falha antes e prova depois que os novos comandos/jobs estão no evento pré-merge.
- Backend quality dispõe de Docker/PostgreSQL necessário e não substitui testes por InMemory.
- `auth-e2e` instala por lockfile, instala Chromium fixado e executa `npm run test:e2e`.
- Teardown ocorre com `if: always()` e artefatos são enviados apenas em falha, sem secrets reais.
- Pipeline pós-merge/release não é usado como evidência de aceitação.

### Plano TDD

- RED: ampliar `test_container_ci_workflow.py` para exigir testes PostgreSQL/E2E e observar falha no workflow atual.
- GREEN: adicionar serviços/passos/job mínimos até o teste estrutural e `actionlint` passarem.
- REFACTOR: reutilizar setup/cache, manter permissões por job e reduzir duplicação sem acoplar CI a release.

### Validação

- `python -m unittest discover -s .github/scripts/tests -p "test_container_ci_workflow.py" -v`
- `python -m unittest discover -s .github/scripts/tests -p "test_*.py" -v`
- `.tmp/actionlint/actionlint .github/workflows/container-ci.yml`
- `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`
- `npm --prefix frontend run test -- --run`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run build`

### Notas

Se `.tmp/actionlint/actionlint` não existir, usar o instalador já versionado: `bash .github/scripts/install_actionlint.sh .tmp/actionlint`. Não alterar workflows de release.

## Auditoria do DAG

- IDs: T001–T016, únicos e sequenciais.
- Ciclos: nenhum; todas as dependências apontam para IDs anteriores.
- Caminho crítico: T001 → T004 → T007 → T009 → T010 → T011 → T014 → T015 → T016.
- Paralelismo seguro: tarefas da mesma onda não compartilham caminhos declarados; arquivos compartilhados aparecem apenas em ondas posteriores.
- Infraestrutura explícita: T001 cria integração backend real; T002 cria Playwright; T016 torna ambos gates pré-merge.
- Integração final: T015 contém apenas cenários cruzados e suporte E2E; comportamentos unitários/verticais pertencem às tarefas anteriores.
- Cobertura bidirecional: a tabela de cobertura liga todo RF/RNF/CA a tarefas; T001, T002 e T016 justificam explicitamente seu papel de infraestrutura.

## Log de execução

| Data | Tarefa | Resultado | Testes/evidências | Observações |
|---|---|---|---|---|
| 2026-08-30 | T001 | concluída | RED de contrato para `Program`; infraestrutura 2/2 e regressão backend 10/10 verdes com PostgreSQL real | Issue #215 em `In Progress`; Docker iniciado; artefatos `bin/obj` restaurados; avisos CS8604 preexistentes |
| 2026-08-30 | T002 | concluída | RED por script Playwright ausente; smoke Chromium 1/1, Vitest 25/25, lint e build verdes | Issue #224 em `In Progress`; stack isolada removida; descoberta `*.e2e.ts`; seed Development com FK inválida é preexistente |
| 2026-08-30 | T003 | concluída | RED por módulo ausente; testes direcionados 6/6, lint e build verdes | Issue #233 em `In Progress`; tipo `js-cookie` corrigido na integração |
| 2026-08-30 | T005 | concluída | RED com 8 falhas comportamentais; testes direcionados 13/13, lint e build verdes | Issue #214 em `In Progress`; política/erros centralizados sem transporte HTTP |
| 2026-08-30 | T004 | concluída | RED de namespace ausente; política 16/16 e regressão backend 26/26 verdes | Issue #214 em `In Progress`; blocklist local v1.0.0/CC0 e falha sanitizada |
| 2026-08-30 | T006 | concluída | RED com 20/24 falhas; direcionados 24/24 e regressão frontend 46/46 verdes | Issue #233 em `Done`; busca negativa sem limpeza direta; preferências preservadas |
| 2026-08-30 | T007 | concluída | RED 3/3; migrações PostgreSQL 3/3 e regressão backend 29/29 verdes; script sem drift | Issue #224 em `In Progress`; `.gitignore` incluído por conflito de escopo; baseline/rollback documentados |
| 2026-08-30 | T008 | concluída | RED 8/8; seed/startup 9/9, Compose dev/prod e regressão backend 54/54 verdes | Issue #215 em `Done`; seed único, `Migrate()` e configuração sintética/sanitizada |
| 2026-08-30 | T009 | concluída | RED de contratos ausentes; direcionados 16/16 e regressão backend 54/54 verdes | Issue #214 em `In Progress`; transação, concorrência 409 e telemetria sanitizada |
| 2026-08-30 | T010 | concluída | RED de JWT sem claims/versão e acesso pendente; direcionados 13/13 e regressão backend 76/76 verdes | Issue #224 em `In Progress`; Docker iniciou após indisponibilidade inicial |
| 2026-08-30 | T012 | concluída | RED de cadastro fora da política; direcionados 9/9 e regressão backend 76/76 verdes | Issue #214 em `In Progress`; `DefinirSenha` preservado por consumidores fora do escopo |
| 2026-08-30 | T011 | concluída | RED 3/3; recuperação 8/8 e regressão backend 84/84 verdes | Issue #214 em `In Progress`; token Base64url 256 bits, SHA-256 e consumo único |
| 2026-08-30 | T013 | concluída | RED de redirecionamento/guard; direcionados 9/9, suíte frontend 53/53, lint e build verdes | Issue #224 em `In Progress`; primeiro teste isolado Vitest travou, execuções seguintes normais |
| 2026-08-30 | T014 | concluída | RED 3/3; direcionados 12/12, suíte frontend 56/56, lint/build e busca negativa verdes | Issue #214 em `In Progress`; resposta neutra 202, confirmação e limpeza central |
| 2026-08-30 | T010 | revalidada | E2E revelou 403 pós-troca; integração exata confirmou backend 403→204→401, 13/13 e 84/84 verdes | Causa fora do backend: frontend não enviava Bearer |
| 2026-08-30 | T013 | revalidada | RED 2/2 sem Bearer; troca autenticada 3/3, `src` 57/57, lint/build verdes | `ChangePassword` envia Bearer; descoberta E2E foi delegada a T015 |
| 2026-08-31 | T011 | revalidada | RED 1/1 para `code`; recuperação 9/9 e regressão backend 85/85 verdes | Novo contrato lê `code`; alias legado preserva `Token` |
| 2026-08-31 | T015 | concluída | REDs de seed, Bearer, Mailpit e seletores; E2E 2/2, backend 85/85, Vitest 57/57, lint/build verdes | Teardown E2E confirmado; Vitest exclui `e2e/**`; compose usa SMTP sintético |
| 2026-08-31 | T016 | concluída | RED estrutural 2 falhas; workflow 10/10, Python 170/170, actionlint, backend 85/85 e frontend 57/57 verdes | Issue #224 em `Done`; gate de PR inclui PostgreSQL/migrações e auth E2E |
