# Especificação técnica: Ciclo de vida de autenticação e credenciais

- Status: pronto
- PRD: `./prd.md`
- Atualizado em: 2026-08-30
- Validação de design: desnecessária

## Resumo técnico

A entrega centralizará o ciclo de senha no backend e acrescentará dois controles persistidos em `Usuario`: `ExigeTrocaSenha`, para restringir o administrador seedado à jornada de troca, e `VersaoSessao`, para revogar todos os JWTs emitidos antes de qualquer alteração ou redefinição. Cada JWT carregará a versão vigente e a autenticação consultará o usuário no banco antes de aceitar o token. Assim, a revogação independe de lista de tokens e vale para todos os dispositivos.

Uma política única de senha, aplicada por um serviço de domínio, aceitará entre 15 e 128 caracteres Unicode, não imporá composição, não truncará nem normalizará a senha armazenada e rejeitará uma lista local versionada de senhas comuns. Criação de conta, seed, alteração autenticada e recuperação chamarão o mesmo serviço. Senha, confirmação e código de recuperação nunca integrarão respostas, logs ou telemetria.

O frontend ganhará uma rota pública exclusiva para troca obrigatória, uma tela autenticada de alteração de senha e um módulo único de sessão. Login, logout explícito, respostas `401`, recuperação e páginas públicas deixarão de manipular cookies de modo independente. A limpeza removerá somente `doorKey`, `rankID`, `level` e futuros dados declarados como autenticação, preservando preferências como `sidebar-open-items` e `sidebar_state`.

A persistência passará de `EnsureCreated()` para migrações EF Core. A disponibilização será em duas etapas: preparar/baselinar bancos existentes e, depois, adicionar os controles de credencial. Vitest e xUnit já existem e são gates de PR; Playwright ainda não existe e será implantado, junto com um job E2E pré-merge, para cumprir a estratégia de validação do PRD.

## Estado atual

Fotografia coletada em 2026-08-30 no branch `develop`, commit `55e09d59a4616023a2245433247627dadb56695c`:

| Área | Estado observado | Consequência |
|---|---|---|
| Inicialização | `Program.cs` chama `EnsureCreated()` e `DbSeeder.Seed()` antes de `Run()` | O seed ocorre antes de servir tráfego, mas não há histórico nem reversão de esquema |
| Seed de produção | `DbSeeder.Production.cs` usa `ProductionAdmin:Name`, `Email` e `Password`, exige somente 12 caracteres e só valida quando todas as tabelas relevantes estão vazias | As chaves e a política divergem do PRD; dados não relacionados podem impedir a criação do primeiro usuário |
| Seed de desenvolvimento | `SeedUsuarios.cs` lê `Seed:AdminPassword`, mas fixa nome e e-mail no código | Há duas configurações e duas regras para a mesma credencial inicial |
| Modelo | `Usuario` possui `SenhaHash`, código de redefinição em texto e expiração; não possui troca obrigatória ou versão de sessão | Não é possível restringir primeiro acesso nem revogar JWTs emitidos |
| Login/JWT | `POST /api/Auth/login` emite JWT com `sub`, `email`, `role` e `jti`; a validação verifica assinatura, emissor, audiência e expiração | Um JWT continua válido até expirar mesmo após mudança de senha |
| Alteração autenticada | Não existe endpoint nem tela para o usuário alterar a própria senha | RF-003 não tem implementação atual |
| Recuperação | `EmailController` gera código com `Random`, armazena-o em texto, procura apenas pelo código e aceita `NovaSenha` sem política comum | Código pode colidir, não é criptograficamente forte e a redefinição não revoga sessões |
| Criação | `UsuariosController` chama `Usuario.DefinirSenha()` diretamente | Não há política de tamanho/bloqueio no servidor |
| Sessão no frontend | `Auth.ts` grava `doorKey`, `rankID` e `level` em cookies JavaScript; integrações adicionam `Bearer` manualmente | O modelo permanece bearer lado cliente, conforme a suposição do PRD, mas o estado está espalhado |
| Encerramento | `ButtonLogout` apenas navega; páginas públicas e o interceptor `401` removem cookies; `nav-user.tsx` usa `localStorage.clear()` | Algumas saídas mantêm autenticação e outra apaga preferências não relacionadas |
| Proteção de rota | `PrivateRoutes.tsx` considera cookies e perfil; não conhece troca obrigatória | O admin seedado alcança telas privadas após o primeiro login |
| Testes | `backend/backend.sln` inclui `Tests.csproj`; há xUnit, Vitest, Testing Library e `npm run test` | A linha de base antiga foi superada e TDD backend/frontend é viável |
| E2E | Não há configuração, dependência ou script Playwright | Os cenários de navegador do PRD ainda não são executáveis |
| CI | `container-ci.yml` roda testes/build backend e testes/lint/build frontend em PR aberto/sincronizado/reaberto para `develop` | Existe gate pré-merge para xUnit/Vitest, mas não para E2E |
| Validação local | 8 testes xUnit e 6 testes Vitest passaram; lint e build frontend passaram | A base está verde; o build mantém avisos não bloqueantes de asset, Browserslist e tamanho de chunk |

## Arquitetura proposta

### Backend

1. Criar `IPasswordPolicy`/`PasswordPolicy` em `Services/Security` como única autoridade para validar senha. O resultado será estruturado por código, sem carregar a senha.
2. Criar `ICredentialService`/`CredentialService` para alteração, redefinição, hash e incremento de versão dentro da unidade de trabalho. Controllers apenas traduzirão contratos HTTP.
3. Acrescentar a `Usuario`:
   - `bool ExigeTrocaSenha`, obrigatório, padrão `false`;
   - `long VersaoSessao`, obrigatório, padrão `0`, configurado como token de concorrência;
   - renomear conceitualmente `TokenRedefinicao` para `TokenRedefinicaoHash`; nenhum código de recuperação será persistido em texto.
4. Incluir `session_version` e `password_change_required` no JWT. `JwtService` receberá `Usuario` ou valores tipados, em vez de parâmetros textuais soltos.
5. No evento `JwtBearerEvents.OnTokenValidated`, resolver `AppDbContext` pelo escopo da requisição e rejeitar quando usuário não existir, estiver desabilitado ou tiver `VersaoSessao` diferente do claim. Ausência/má formação do claim também invalida tokens antigos após a disponibilização.
6. Configurar a política padrão de autorização para exigir usuário autenticado e `password_change_required=false`. As políticas por perfil incorporarão a mesma exigência. O endpoint de troca usará uma política separada que exige autenticação e versão válida, mas permite ambos os valores do claim.
7. Substituir `EnsureCreated()` por `Database.Migrate()` antes do seed. O seed consultará especificamente a existência de usuários; banco já inicializado não exigirá novamente as credenciais do seed.
8. Quando não existir nenhum usuário em produção, validar `Seed:AdminEmail` e `Seed:AdminPassword` antes de inserir. O nome será o valor não secreto e estável `Administrador inicial`. E-mail inválido, senha ausente ou senha recusada pela política lançarão `InvalidOperationException` sanitizada antes de `app.Run()`.
9. O admin criado por qualquer seed receberá `ExigeTrocaSenha=true`; usuários criados pelo cadastro receberão `false`.

### Frontend

1. Criar `src/auth/session.ts` com `startSession`, `clearSession`, `readSession` e a lista explícita das chaves de autenticação. Todos os consumidores usarão esse módulo.
2. `startSession` persistirá o JWT e os metadados mínimos já usados pela aplicação. Cookies continuarão acessíveis ao JavaScript nesta entrega, com `Secure` sob HTTPS, `SameSite=Strict` e `path=/` explícito.
3. `clearSession` removerá `doorKey`, `rankID` e `level` com os mesmos atributos de caminho usados na criação e removerá somente chaves futuras declaradas pelo módulo em `sessionStorage`/`localStorage`. Não chamará `localStorage.clear()`.
4. Alterar o contrato de login para consumir `requiresPasswordChange`. Quando verdadeiro, navegar exclusivamente para `/change-password-required`; caso contrário, manter a navegação por perfil.
5. Acrescentar `PasswordChangeRequiredRoute`, que requer sessão válida e flag de troca, e estender `PrivateRoute` para redirecionar essa sessão à troca obrigatória. O backend continua sendo a autoridade caso cookies sejam adulterados.
6. Criar um formulário reutilizável de nova senha com mensagens espelhadas da política, usado por alteração própria, troca obrigatória e recuperação. A confirmação é validada no cliente e no servidor.
7. O botão de logout, o interceptor `401`, as páginas de login/recuperação e os menus chamarão `clearSession`. A navegação só ocorrerá depois da limpeza síncrona.
8. Após alteração ou redefinição bem-sucedida, limpar a sessão e navegar para `/`, exibindo a exigência de nova autenticação.

### Política de senha

- Comprimento mínimo: 15 caracteres Unicode.
- Comprimento máximo: 128 caracteres Unicode, portanto superior ao mínimo de 64 exigido pelo PRD.
- Não exigir maiúscula, minúscula, número, símbolo ou qualquer combinação.
- Não remover espaços, truncar ou alterar a senha antes do hash.
- Comparar com `Resources/Security/common-passwords.txt`, incluído no artefato do backend, usando uma representação somente para comparação (`FormKC` + comparação sem distinção de maiúsculas/minúsculas). A senha original segue intacta para hash e autenticação.
- Carregar a lista uma vez na inicialização e falhar claramente se o recurso estiver ausente; registrar somente quantidade/versão da lista.
- Retornar códigos estáveis: `password_required`, `password_too_short`, `password_too_long`, `password_common`, `password_confirmation_mismatch` e `current_password_invalid`.

Não será exposta uma lista de regras de composição porque ela não existe. O frontend poderá exibir comprimento e mensagem de senha comum, mas o backend decidirá a validade.

## Fluxos e componentes

### Inicialização de produção

1. A aplicação aplica migrações pendentes.
2. O seed verifica se existe qualquer `Usuario`.
3. Se existir, não lê nem exige `Seed:AdminEmail`/`Seed:AdminPassword` e não altera credenciais.
4. Se não existir, lê as duas chaves, valida formato do e-mail e política da senha.
5. Em falha, lança exceção sanitizada e o processo termina antes de escutar tráfego.
6. Em sucesso, cria o admin habilitado com `ExigeTrocaSenha=true` e `VersaoSessao=0`; somente o hash chega ao banco.

Essa interpretação materializa a dependência do PRD de distinguir banco inicializado da configuração obrigatória para criação. CA-001 será exercitado com banco vazio; reinício de banco populado sem variáveis será um teste adicional de compatibilidade.

### Login e primeiro acesso

1. Login valida e-mail, senha e status com resposta genérica para falha de credencial.
2. O backend emite JWT com versão e flag persistidas e responde `requiresPasswordChange`.
3. O frontend inicia a sessão.
4. Para admin seedado, navega para `/change-password-required`.
5. Tentativa direta de acessar outra rota privada é redirecionada pelo frontend; uma chamada direta à API recebe `403` pela política de troca pendente.
6. A troca válida atualiza o hash, define `ExigeTrocaSenha=false` e incrementa `VersaoSessao` atomicamente.
7. O token usado na troca torna-se inválido; o frontend limpa a sessão e exige novo login.

### Alteração autenticada

1. Usuário informa senha atual, nova senha e confirmação.
2. O backend deriva o usuário exclusivamente do claim `sub`; não aceita `usuarioId` no corpo ou rota.
3. Valida confirmação, senha atual e política da nova senha.
4. Em uma transação, atualiza o hash, limpa eventual recuperação, define `ExigeTrocaSenha=false` e incrementa `VersaoSessao`.
5. Retorna `204`; todos os JWTs antigos falham na próxima requisição.

### Recuperação

1. Solicitação sempre retorna `202` com a mesma mensagem, exista ou não conta habilitada.
2. Para conta elegível, gerar token de pelo menos 128 bits por `RandomNumberGenerator`, codificado em Base64url, persistir somente SHA-256 do token associado ao usuário e expiração UTC, e enviar o valor original por e-mail.
3. Redefinição recebe e-mail, código, nova senha e confirmação. O e-mail elimina busca ambígua por colisão de código.
4. Validar expiração, hash com comparação em tempo constante e política.
5. Em sucesso, atualizar senha, consumir o código, limpar a flag de troca e incrementar a versão na mesma transação.
6. Código inválido/expirado retorna erro genérico; validações da nova senha mantêm códigos específicos.

### Encerramento de sessão

1. Qualquer origem de saída chama `clearSession()`.
2. O módulo remove apenas estado de autenticação e preserva preferências.
3. A aplicação navega para `/` e rotas privadas deixam de renderizar.
4. Não haverá endpoint de logout nesta entrega: o JWT bearer não é persistido individualmente no servidor e a decisão de produto exige limpeza do estado, não revogação global ao sair. Mudanças de senha continuam usando a versão global.

## Contratos e APIs

Todos os erros de validação usarão `application/problem+json`, com `type`, `title`, `status` e `errors`, sendo `errors` um mapa de campo para códigos/mensagens em português. Nenhuma resposta ecoará senha, confirmação, hash ou código.

### `POST /api/Auth/login`

Requisição compatível:

```json
{
  "email": "admin@example.org",
  "password": "segredo-nao-registrado"
}
```

Resposta `200`:

```json
{
  "token": "<jwt>",
  "requiresPasswordChange": true
}
```

- `401`: credenciais inválidas ou usuário indisponível, sem distinguir as causas.
- O JWT passa a exigir claims `session_version` numérico e `password_change_required` booleano.

### `POST /api/Auth/change-password`

- Autorização: bearer válido pela política `PodeAlterarPropriaSenha`, inclusive com troca pendente.

```json
{
  "currentPassword": "senha-atual",
  "newPassword": "nova-senha-com-15-ou-mais",
  "confirmation": "nova-senha-com-15-ou-mais"
}
```

- `204`: alteração persistida e todos os tokens revogados.
- `400`: confirmação, senha atual ou política inválida, com código específico.
- `401`: token ausente, inválido, expirado ou com versão antiga.
- `409`: concorrência; cliente limpa a sessão e solicita novo login.

### `POST /api/Email/request-password-reset`

Substitui gradualmente `POST /api/Email/solicitar-redefinicao`; o endpoint antigo poderá delegar ao novo durante uma release e será removido depois da migração do frontend.

```json
{ "email": "usuario@example.org" }
```

- `202` em todos os casos de conta inexistente, desabilitada ou elegível.
- Resposta: `{ "message": "Se a conta estiver apta, enviaremos as instruções." }`.

### `POST /api/Email/reset-password`

Substitui gradualmente `POST /api/Email/redefinir-senha`:

```json
{
  "email": "usuario@example.org",
  "code": "123456",
  "newPassword": "nova-senha-com-15-ou-mais",
  "confirmation": "nova-senha-com-15-ou-mais"
}
```

- `204`: redefinição concluída, código consumido e sessões revogadas.
- `400`: código inválido/expirado genérico ou política/confirmação inválida.
- O contrato anterior sem e-mail será mantido somente durante a janela de compatibilidade e não aceitará novas solicitações após a migração do frontend.

## Dados e migrações

### Alteração do modelo

| Entidade/artefato | Alteração | Regra |
|---|---|---|
| `Usuario.ExigeTrocaSenha` | `boolean not null default false` | `true` apenas para admin criado por seed até primeira troca/redefinição |
| `Usuario.VersaoSessao` | `bigint not null default 0` | Incremento atômico em toda alteração/redefinição; token de concorrência |
| `Usuario.TokenRedefinicaoHash` | renomear coluna atual e manter anulável | Armazena SHA-256, nunca código original |
| `Usuario.TokenExpiracao` | manter UTC anulável | Limpa junto com o hash após uso ou troca autenticada |
| `common-passwords.txt` | recurso versionado do backend | Sem chamada externa e com origem/licença documentadas |

### Estratégia de migração

1. Adicionar `Microsoft.EntityFrameworkCore.Design` e alinhar `Microsoft.EntityFrameworkCore.Tools` à versão compatível com o runtime/provider EF Core usado pelo projeto antes de gerar migrações.
2. Criar `InitialSchemaBaseline`, snapshot completo do modelo atual, para bancos novos.
3. Em cada banco existente, comparar o esquema com a baseline e inserir o marcador de baseline em `__EFMigrationsHistory` por script operacional revisado; abortar se houver divergência.
4. Criar `CredentialLifecycle` com as duas colunas, renome da coluna de token e limpeza de todos os códigos de redefinição existentes. Invalidar códigos de recuperação durante a implantação é aceitável e será comunicado.
5. Trocar `EnsureCreated()` por `Migrate()` somente depois que a baseline tiver sido aplicada/marcada nos ambientes existentes.
6. Gerar e revisar `dotnet ef migrations script --idempotent` para disponibilização. Fazer backup antes da aplicação.

A reversão de aplicação pode voltar à versão anterior mantendo as colunas adicionais, que são compatíveis. A reversão destrutiva do esquema só ocorrerá após voltar a aplicação e backup: remover as novas colunas e renomear `TokenRedefinicaoHash` de volta, sabendo que códigos anteriores já foram invalidados. Nunca reduzir `VersaoSessao` durante rollback, para não revalidar JWT antigo.

## Segurança, privacidade e permissões

- O backend é a autoridade para política, identidade do usuário, troca pendente e versão de sessão.
- JWT antigo, sem `session_version`, será rejeitado; a implantação força uma nova autenticação única de todos os usuários.
- A consulta de versão ocorre em toda requisição autenticada. Índice adicional não é necessário porque a busca usa a chave primária de `Usuario`.
- As alterações de senha usam `PasswordHasher<Usuario>`; não será criado algoritmo próprio de hash de senha.
- O hash SHA-256 é usado somente para o token aleatório de recuperação com pelo menos 128 bits de entropia, não para senha.
- A verificação de senha aceitará `Success` e `SuccessRehashNeeded`; neste último caso, atualizará o hash dentro da operação autenticada sem expor a credencial.
- `PasswordPolicy`, DTOs, controllers e filtros nunca registram valores dos campos de credencial. Logs contêm ação, resultado, usuário quando autenticado e código de motivo sanitizado.
- A solicitação de recuperação não revela existência ou status da conta.
- O endpoint de alteração ignora qualquer identidade enviada pelo cliente e usa `sub`.
- Políticas de perfil existentes passarão a exigir troca concluída; endpoints públicos continuam públicos.
- A lista de bloqueio é local, empacotada e coberta por teste que impede envio a rede.
- Cookies continuam não `HttpOnly` por decisão de escopo do PRD; permanece o risco de exfiltração por XSS, mitigado parcialmente por `Secure`, `SameSite=Strict`, CSP quando disponível e ausência de senha nos cookies.
- Limpeza de sessão não remove `sidebar-open-items`, `sidebar_state` ou preferências futuras fora da lista explícita de autenticação.

## Falhas, observabilidade e operação

| Evento | Resposta/comportamento | Observabilidade permitida |
|---|---|---|
| Seed necessário sem configuração | Processo aborta antes de servir | erro `credential_seed_invalid` e nome da chave ausente; nunca o valor |
| Lista local ausente | Processo aborta antes de servir | erro `password_blocklist_unavailable` |
| Login inválido | `401` genérico | contador por resultado e origem limitada; sem e-mail/senha no texto do log |
| Token com versão antiga | `401` | contador `jwt_rejected{reason=session_version}` e ID interno do usuário, sem JWT |
| Troca pendente em API privada | `403` | contador `authorization_denied{reason=password_change_required}` |
| Senha inválida | `400` específico | código da regra, nunca conteúdo/tamanho exato associado a uma pessoa |
| Concorrência na troca | `409` e nova autenticação | warning com ID interno e operação |
| Recuperação solicitada | `202` uniforme | sucesso/falha de entrega em evento interno sem revelar conta na resposta |
| SMTP falha | `202` externo; erro interno observável | evento sanitizado e métrica de falha; segredo SMTP nunca registrado |
| Migração falha | processo não inicia | nome/ID da migração e erro do banco sanitizado |

Métricas mínimas: contagem de login aceito/recusado, JWT rejeitado por versão, troca obrigatória concluída, alteração própria concluída/falha por categoria e redefinição concluída/falha por categoria. Não usar senha, código, JWT completo ou e-mail como label.

## Compatibilidade, disponibilização e reversão

1. Entregar primeiro migrações, serviços, claims novos e compatibilidade temporária dos endpoints de recuperação.
2. A publicação do backend invalida JWTs antigos por ausência de `session_version`; comunicar a necessidade de novo login.
3. Publicar o frontend com a nova resposta de login, rotas e sessão centralizada na mesma janela. O campo novo na resposta é aditivo.
4. Exercitar smoke tests: banco populado reinicia sem seed; banco vazio falha sem chaves; banco vazio inicia com chaves válidas; login comum; admin seedado; troca; token antigo; recuperação; logout.
5. Remover aliases antigos de recuperação somente depois de confirmar que não há frontend suportado consumindo-os.

Feature flag não é necessária: aceitar tokens sem versão violaria CA-004 e manter duas semânticas de autorização aumentaria o risco. Rollback da aplicação preserva as colunas e exige manter o valor de versão. Se o backend anterior voltar, seus JWTs não conterão versão e voltarão a ser aceitos por ele; por isso rollback é resposta emergencial, deve ser curto e acompanhado de redução do tempo de expiração/chave JWT rotacionada se houver suspeita de comprometimento.

## Estratégia TDD e pirâmide de testes

### RED

1. xUnit: caracterizar que o seed atual aceita configuração divergente/12 caracteres e criar testes falhando para banco vazio sem `Seed:*`, configuração inválida, banco populado sem seed e admin marcado para troca.
2. xUnit unitário: tabela de política com 14/15/128/129 caracteres, Unicode, espaços, ausência de composição e senha bloqueada.
3. xUnit integração: login inclui versão/flag; token antigo ainda aceito após mudança (falha esperada); admin pendente alcança endpoint privado (falha esperada).
4. xUnit contrato: criação, alteração e redefinição aceitam/rejeitam a mesma matriz de senhas e nunca serializam segredo.
5. Vitest: `clearSession` hoje não existe; escrever testes falhando para remoção das três chaves, preservação de preferências, botão, `401` e rotas de troca.
6. Playwright: escrever os cenários de primeiro acesso, alteração, token anterior rejeitado, novo login e logout completo antes da implementação das telas.

### GREEN

1. Implementar o menor `PasswordPolicy` que satisfaça a tabela e integrar primeiro ao seed.
2. Adicionar campos/migração, claims e validação de versão até os testes de revogação passarem.
3. Implementar alteração autenticada e integrar a mesma política à criação/recuperação.
4. Implementar `session.ts`, contrato de login, rotas/formulários e limpeza centralizada.
5. Instalar/configurar Playwright e fazer os cenários críticos passarem contra frontend/backend/PostgreSQL isolados.

### REFACTOR

1. Remover hash duplicado de `JwtService`/`Usuario.DefinirSenha` em favor do serviço de credenciais sem mudar os testes.
2. Remover manipulações diretas de cookies e `localStorage.clear()` após teste de busca estrutural apontar zero ocorrências fora de `session.ts`.
3. Remover aliases antigos de recuperação após a janela de compatibilidade.
4. Consolidar builders/fixtures de usuário e relógio para manter testes determinísticos.
5. Rodar a suíte completa após cada extração e manter cobertura dos limites e falhas.

### Pirâmide e evidência

- Unitários xUnit: política, seed validator, geração/hash de código e incremento de versão.
- Integração xUnit com PostgreSQL descartável: migrações, concorrência, login, autorização, troca e redefinição. `InMemory` não valida transação, concorrência ou comportamento real do Npgsql e fica restrito a testes sem essas propriedades.
- Contrato xUnit/WebApplicationFactory: status, Problem Details, schemas e ausência de segredos.
- Unitários/integração Vitest + Testing Library: sessão, schemas, formulários, redirecionamento e interceptor.
- E2E Playwright: CA-002, CA-004 e CA-005 em navegador real; CA-001 permanece integração de processo backend.

## Esteira de qualidade

| Área | Comando local | Verificação de CI | Lacuna/ação |
|---|---|---|---|
| Backend restore/build/test | `dotnet restore backend/backend.sln`; `dotnet build backend/backend.sln --no-restore -c Release --nologo --disable-build-servers`; `dotnet test backend/backend.sln --no-build --no-restore -c Release --nologo --disable-build-servers` | job `backend-quality` de `container-ci.yml` em PR para `develop` | Já é gate; acrescentar testes de integração PostgreSQL e garantir serviço/contêiner no job |
| Backend local rápido | `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers` | coberto pela sequência acima | Passou com 8/8 em 2026-08-30 |
| Frontend testes | `npm ci`; `npm run test -- --run` em `frontend/` | job `frontend-quality` | Passou com 6/6; adicionar novos testes de sessão/rotas/formulários |
| Frontend lint | `npm run lint` em `frontend/` | job `frontend-quality` | Passou em 2026-08-30 |
| Frontend build | `npm run build` em `frontend/` | job `frontend-quality` | Passou; avisos atuais não bloqueiam esta entrega |
| Migrações | `dotnet ef migrations script --idempotent --project backend/LabSolos-Server-DotNet8/LabSolos-Server-DotNet8.csproj --output .tmp/credential-lifecycle.sql` | adicionar teste de banco vazio e upgrade de snapshot/banco legado no `backend-quality` | EF Design/migrações ainda não existem; implantação faz parte da solução |
| E2E | `npm run test:e2e` em `frontend/` | adicionar job `auth-e2e` em `container-ci.yml`, com PostgreSQL/backend/frontend e artefatos em falha | Playwright/script/config ausentes; criação é obrigatória antes de alegar CA-002/004/005 |
| Busca de segredos | `rg -n "SenhaHash|TokenRedefinicao|password|senha" backend frontend --glob '!**/bin/**' --glob '!**/obj/**'` com revisão dos resultados | adicionar teste estrutural para DTO/log/session e varredura já existente de contêiner | Busca não prova ausência sozinha; combinar com testes de serialização/log |

O workflow `container-ci.yml` já é pré-merge porque escuta `pull_request` aberto/sincronizado/reaberto para `develop`. O novo job E2E deve usar timeout, `concurrency` existente, health checks e upload de trace/screenshot somente em falha, sem conter credenciais reais.

## Matriz de rastreabilidade

| Requisito | Componentes | Testes | Evidência |
|---|---|---|---|
| RF-001 | `Program`, migrações, `DbSeeder`, validador do seed, compose de produção | processo com banco vazio/config ausente, inválida e válida; banco populado sem configuração | processo vazio inválido termina antes do health check; válido cria um admin sem segredo fixo |
| RF-002 | `ExigeTrocaSenha`, claims/políticas, login, `PasswordChangeRequiredRoute`, tela obrigatória | integração de autorização; Vitest de rotas; Playwright primeiro acesso | admin seedado recebe flag, só acessa troca e após concluí-la precisa logar novamente |
| RF-003 | `CredentialService`, DTO/endpoint `change-password`, formulário reutilizável | unitário de senha atual/confirmação; contrato HTTP; Playwright alteração própria | senha errada/confirmação inválida retorna código; válida persiste e responde `204` |
| RF-004 | `PasswordPolicy`, lista local, criação, seed, alteração, recuperação, schemas Zod | matriz compartilhada nos quatro fluxos, limites e bloqueio; teste sem rede | todas as entradas produzem a mesma decisão de servidor e mensagens equivalentes no cliente |
| RF-005 | `VersaoSessao`, claim/validação, transações, `session.ts`, interceptor/logout | integração com dois JWTs; concorrência; Vitest de limpeza; Playwright logout | tokens anteriores recebem `401`; chaves de autenticação somem e preferências permanecem |
| RNF-001 | DTOs, Problem Details, logging, hash de recuperação, recurso local | serialização negativa, captura de logs, busca estrutural, teste que impede cliente HTTP na política | senha/código/hash ausentes de resposta/log/telemetria e nenhuma reputação externa é chamada |
| RNF-002 | política backend, schemas frontend, formulário comum, `session.ts`, guards | contrato backend/frontend, Vitest de todos os chamadores e busca de manipulação direta | backend decide validade e um único módulo inicia/encerra sessão |
| CA-001 | RF-001 + RNF-001 | integração de processo com PostgreSQL vazio e matriz de env | saída não zero antes de servir e mensagem cita chave/regra sem valor secreto |
| CA-002 | RF-002 | contrato login/autorização + Playwright | tentativa de rota/tela/API privada falha até troca; novo login libera perfil |
| CA-003 | RF-003 + RF-004 | tabela de entradas, contrato Problem Details e UI | caminho válido altera; senha atual, confirmação, tamanho e bloqueio são distinguíveis sem ecoar segredo |
| CA-004 | RF-005 | dois tokens anteriores à troca/redefinição testados em endpoint autorizado | ambos recebem `401`, inclusive em dispositivos/sessões simulados distintos |
| CA-005 | RF-005 + RNF-002 | Vitest do módulo/interceptor/botão e Playwright de rota privada | `doorKey`, `rankID`, `level` ausentes; sidebar preservada; rota redireciona ao login |

## Alternativas e decisões

| Decisão | Alternativas | Recomendação | Escolha confirmada | Consequências |
|---|---|---|---|---|
| Revogação global | lista por JWT; rotação da chave global; versão por usuário | versão persistida por usuário validada em cada requisição | Derivada da decisão confirmada do PRD e de sua dependência técnica | Revoga todos os dispositivos do usuário sem derrubar os demais; acrescenta uma leitura por requisição autenticada |
| Primeiro acesso | bloquear apenas no frontend; token de uso único; claim + política backend | claim refletindo estado persistido e políticas que bloqueiam APIs privadas | Derivada de RF-002/CA-002 | Não confia no cliente; troca permanece acessível com token válido |
| Seed em banco populado | exigir segredo sempre; sobrescrever admin; não exigir se já houver usuário | exigir somente quando não existir usuário | Derivada da dependência explícita do PRD | Reinícios não dependem da senha inicial e nunca a redefinem implicitamente |
| Política | regras duplicadas; biblioteca externa; serviço local único | serviço local com lista versionada | Confirmada no PRD | Sem vazamento externo e decisão consistente; exige manutenção do arquivo local |
| Recuperação | manter `Random`/texto; link JWT; código criptográfico com hash + e-mail | código criptográfico armazenado em hash e associado ao e-mail | Decisão técnica de segurança, sem alterar a jornada do PRD | Invalida códigos existentes no deploy e muda o corpo do reset |
| Migração | manter `EnsureCreated`; SQL avulso; adotar EF migrations com baseline | EF migrations e baseline controlada | Derivada da exigência de migração/reversão do PRD | Requer passo operacional único nos bancos existentes; habilita evolução futura segura |
| Logout | endpoint e denylist; rotação global; limpeza cliente | limpeza cliente centralizada | Derivada de RF-005 e da suposição de bearer lado cliente | Logout não revoga token copiado; mudança de senha é o mecanismo de revogação global |
| Validação de design | sessão adicional de decisão; dispensar; marcar desnecessária | desnecessária | PRD não deixou pergunta bloqueante e decisões materiais estão confirmadas | A techspec pode seguir para decomposição sem reabrir descoberta |

## Riscos e mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| Leitura de usuário em toda requisição | latência/carga no banco | consulta por PK projetando somente status/versão/flag, métricas de duração e teste de carga antes de otimizar; não introduzir cache que atrase revogação |
| Baseline EF divergir do banco real | migração falha ou altera esquema indevido | comparar schema, backup, script revisado e abortar automaticamente em divergência |
| Rollback reaceitar tokens | quebra da garantia de revogação | não reduzir versão; janela curta; rotacionar chave JWT se rollback for inevitável |
| Cookies acessíveis por JavaScript | token exposto em XSS | manter escopo confirmado, atributos seguros, reduzir superfícies de script e registrar migração futura para cookie `HttpOnly` fora desta entrega |
| Lista de bloqueio pequena/desatualizada | senhas comuns passam | origem/licença/versionamento, teste de amostras e processo periódico de atualização sem consulta em runtime |
| E-mail/SMTP indisponível | usuário não recupera acesso | `202` uniforme, métrica/alerta internos e repetição controlada sem registrar código |
| Duas trocas simultâneas | resultado não determinístico | `VersaoSessao` como concorrência; segunda operação retorna `409` e exige login |
| Frontend/backend publicados separadamente | resposta/rotas incompatíveis | contrato aditivo no login e aliases temporários de recuperação; smoke test coordenado |
| Limpeza espalhada permanecer | sessão parcial ou preferência apagada | teste estrutural e Vitest exigindo que chamadas passem por `session.ts` |

## Perguntas abertas

Nenhuma bloqueante. Antes da execução, a equipe deve apenas registrar como fatos operacionais, sem mudar o design:

- origem, licença e versão inicial de `common-passwords.txt`;
- procedimento autorizado para marcar `InitialSchemaBaseline` em cada banco existente;
- ambiente/segredos sintéticos que o job Playwright usará para SMTP (stub local) e seed.
