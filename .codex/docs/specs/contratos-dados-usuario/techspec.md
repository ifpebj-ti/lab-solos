# Especificação técnica: Cadastro e contratos de dados de usuário

- Status: pronto para decomposição
- PRD: `./prd.md`
- Atualizado em: 2026-08-31
- Validação de design: desnecessária

## Resumo técnico

A entrega padroniza o cadastro acadêmico e os contratos de leitura de usuário sem alterar as jornadas ou permissões existentes. O backend continuará sendo a autoridade: normalizará cidade e curso com `Trim()`, rejeitará cidade vazia ou igual ao sentinela legado `Indefinido` e exigirá curso entre 2 e 100 caracteres após o trim. O frontend adicionará cidade ao formulário, repetirá essas regras para feedback imediato e nunca fabricará o sentinela.

`DataIngresso` passará a representar data civil em todas as camadas: `DateOnly?` no modelo e nos DTOs .NET, coluna PostgreSQL `date` e JSON `"YYYY-MM-DD"` ou `null`. O cadastro preservará o comportamento atual de atribuir a data de ingresso no servidor, usando a data UTC do relógio injetável; a nulabilidade continuará necessária para registros legados e importações. O cliente adotará um contrato Zod/TypeScript compartilhado e um formatador de data civil que não cria `Date`, evitando horário e deslocamento de fuso.

Não haverá migração de cidade: valores legados `Indefinido`, vazios ou nulos permanecem no banco e são apresentados como `Não informado`. A única migração de dados converte o timestamp de ingresso existente para sua data UTC. A infraestrutura atual de xUnit, Vitest, Playwright, PostgreSQL descartável e CI pré-merge será estendida, sem introduzir um novo framework.

## Estado atual

- `CreateAccount.tsx` não possui campo cidade e envia literalmente `cidade: 'Indefinido'`; seu schema exige curso com mínimo 6 e não aplica máximo nem trim explícito à regra.
- `AddUsuarioDTO` aceita `Cidade` e `Curso` anuláveis. `UsuarioService.ValidarEstrutura` verifica apenas presença com `IsNullOrEmpty`, não rejeita whitespace/sentinela, não limita curso e responde com uma mensagem agregada em vez de erros por campo.
- `UsuariosController.Adicionar` atribui `DateTime.UtcNow`. `Usuario.DataIngresso` é `DateTime?` e o snapshot EF usa PostgreSQL `timestamp with time zone`.
- `UsuarioDTO`, `ResponsavelDTO` e `UsuarioDTOPatchResponse` expõem `DataIngresso` como `string` não anulável; `DependenteDTO` usa `DateTime` não anulável. Os mapeamentos AutoMapper dependem de conversões implícitas e não definem formato.
- Os endpoints `GET /api/Usuarios`, `GET /api/Usuarios/tipo/{tipoUsuario}`, `GET /api/Usuarios/{id}`, as consultas de dependentes/aprovação e respostas de criação/patch compartilham esses DTOs divergentes.
- O frontend duplica interfaces de usuário em várias páginas, tipa `dataIngresso` como `string` obrigatória e alterna entre `formatDate` e `formatDateTime`. Ausência produz `Data inválida`; curso e cidade também usam fallbacks divergentes como `Não Corresponde`.
- O backend usa .NET 8, ASP.NET Core, AutoMapper, EF Core/Npgsql e xUnit. `backend/backend.sln` já inclui `backend/Tests/Tests.csproj`.
- O frontend usa React/Vite, Zod, Vitest/Testing Library e Playwright. `container-ci.yml` roda testes, lint, build, integração PostgreSQL e E2E em PR aberto, sincronizado ou reaberto para `develop`, portanto já é gate pré-merge.
- Linha de base verificada em 2026-08-31: `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers` passou com 85/85; `npm run test -- --run` passou com 57/57; lint e build passaram. Permanecem avisos não bloqueantes já existentes no build frontend e dois avisos de nulabilidade em `ProdutoMappingProfile`, fora do escopo.

## Arquitetura proposta

O fluxo continuará em camadas, com um contrato explícito em cada fronteira:

1. `CreateAccount` coleta cidade e curso, normaliza com trim por meio de um schema de cadastro e envia os valores reais por `Auth.createMentor`.
2. `UsuariosController` delega validação e normalização acadêmica ao `UsuarioService`; erro de domínio vira `400 application/problem+json` com chaves estáveis por campo.
3. O mapeamento cria `Academico` somente com valores já normalizados. A data é atribuída pelo servidor como `DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime)`.
4. EF Core persiste a data em coluna `date`; cidade e curso permanecem colunas `text` anuláveis para compatibilidade legada.
5. Todos os DTOs de usuário usam os mesmos tipos para campos equivalentes. AutoMapper terá regras explícitas e testes de configuração/serialização.
6. As integrações frontend validam as respostas com schemas compartilhados em `src/contracts/user.ts`. As telas consomem os tipos inferidos e os helpers de apresentação, em vez de declarar interfaces locais incompatíveis.

Componentes previstos:

| Camada | Componente | Responsabilidade |
|---|---|---|
| Backend | `DTOs/Usuarios/*` | padronizar campos equivalentes e `DataIngresso: DateOnly?` |
| Backend | `UsuarioService` | validar tipo/nível, normalizar cidade/curso e retornar erros de campo |
| Backend | `UsuariosController` | traduzir validação em Problem Details e atribuir data civil por `TimeProvider` |
| Backend | `UsuarioMappingProfile` | mapear explicitamente campos compartilhados, acadêmicos, enums e nulabilidade |
| Backend | `Usuario`, `AppDbContext`, migração EF | persistir `DataIngresso` como `date` sem alterar o legado de cidade |
| Frontend | `contracts/user.ts` | schemas Zod e tipos únicos para usuário, acadêmico, responsável e dependente |
| Frontend | `CreateAccount.tsx` | capturar cidade, exibir erros acessíveis e enviar payload normalizado |
| Frontend | `function/date.ts` e helper de apresentação | formatar data civil e valores ausentes/sentinela sem fuso |
| Frontend | integrações e telas consumidoras | validar respostas e remover interfaces/fallbacks duplicados |

Não será criado catálogo de cidades/cursos, serviço de geocodificação, lookup externo nem repositório paralelo. A validação de cidade significa apenas: após trim, valor não vazio e diferente de `Indefinido` com comparação ordinal sem distinção de caixa. Não será inventado limite de tamanho de cidade ausente do PRD; permanecem os limites gerais de requisição da aplicação.

## Fluxos e componentes

### Cadastro acadêmico válido

1. O usuário informa cidade e curso; ambos são obrigatórios para `tipoUsuario = Academico`.
2. O schema frontend aplica trim, rejeita cidade vazia/sentinela e curso fora de 2–100. Cada `InputText` recebe mensagem associada ao campo; foco e submissão seguem o comportamento atual do React Hook Form.
3. O payload usa `cidade` e `curso` normalizados e não possui fallback `Indefinido`.
4. O backend reaplica as regras independentemente do cliente, preserva as validações atuais de tipo, nível, instituição e responsável e devolve erros de campo em falha.
5. O controller cria o acadêmico, atribui a data civil UTC atual, persiste e retorna `201` com contrato padronizado.

### Consulta de perfil, responsáveis e dependentes

1. Os endpoints mapeiam entidades para DTOs com `dataIngresso` em `YYYY-MM-DD` ou `null`; propriedades de enum continuam com os nomes textuais já publicados.
2. O schema frontend rejeita em teste qualquer timestamp, data inválida ou tipo divergente na fronteira de integração.
3. `formatCivilDate` recebe somente `string | null | undefined`, valida estritamente `YYYY-MM-DD` e produz `dd/MM/yyyy` sem construir instante.
4. `displayUserValue` produz `Não informado` para `null`, `undefined`, string vazia após trim e cidade igual a `Indefinido`; caso contrário preserva o valor recebido.

### Legado

- Nenhuma rotina atualiza cidade durante leitura, startup ou migração.
- `Indefinido` continua sendo retornado pela API como dado legado; a tradução ocorre apenas na apresentação, mantendo a diferença entre armazenamento e exibição observável.
- `DataIngresso = null` continua `null` na API e aparece `Não informado` no cliente.
- Timestamp existente é convertido para a data do mesmo instante em UTC, de forma determinística e independente do timezone da sessão PostgreSQL.

## Contratos e APIs

As rotas e regras de autorização permanecem. A mudança incompatível controlada está no formato de `dataIngresso`: timestamps/string arbitrária deixam de ser aceitos como resposta e o valor passa a ser data ISO ou `null`.

### `POST /api/Usuarios`

Trecho acadêmico do corpo:

```json
{
  "tipoUsuario": "Academico",
  "nivelUsuario": "Mentor",
  "instituicao": "IFPE",
  "cidade": "Belo Jardim",
  "curso": "ES"
}
```

Regras adicionais às já existentes:

| Campo | Entrada | Normalização | Erro |
|---|---|---|---|
| `cidade` | obrigatória para acadêmico; não vazia; diferente de `Indefinido` sem distinguir caixa | trim antes de validar/persistir | `errors.cidade` |
| `curso` | obrigatório para acadêmico; 2–100 caracteres após trim | trim antes de medir/persistir | `errors.curso` |
| `dataIngresso` | não aceito do cliente | servidor atribui a data UTC atual | não aplicável |

Uma entrada direta inválida retorna:

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "Dados de cadastro inválidos.",
  "status": 400,
  "errors": {
    "cidade": ["Informe uma cidade válida."],
    "curso": ["O curso deve ter entre 2 e 100 caracteres."]
  }
}
```

O content type será `application/problem+json`. As chaves e textos acima são estáveis para consumo e testes; nenhum valor enviado é ecoado. Erros atuais de senha continuam no mesmo formato e podem coexistir sem fundir políticas.

### Contrato comum de resposta

| Campo | JSON | Nulabilidade/formato |
|---|---|---|
| identificador | `id: number` | não nulo |
| nome | `nomeCompleto: string` | não nulo |
| e-mail | `email: string` | não nulo |
| telefone | `telefone: string \| null` | anulável |
| ingresso | `dataIngresso: string \| null` | somente `YYYY-MM-DD` ou `null` |
| status | `status: string` | nome de `StatusUsuario` |
| nível | `nivelUsuario: string` | nome de `NivelUsuario` |
| tipo, quando exposto | `tipoUsuario: string` | nome de `TipoUsuario` |
| instituição acadêmica | `instituicao: string` | não nula para acadêmico |
| cidade acadêmica | `cidade: string \| null` | anulável para legado |
| curso acadêmico | `curso: string \| null` | anulável para legado |

`UsuarioDTO`, `AcademicoDTO`, `ResponsavelDTO`, `DependenteDTO` e `UsuarioDTOPatchResponse` devem reutilizar um tipo/base comum ou, onde a composição impedir herança, declarar exatamente os tipos acima e ser protegidos por teste de reflexão. Campos não pertinentes a uma resposta não precisam ser acrescentados; quando presentes, porém, nome, nulabilidade, enum e formato devem coincidir.

Rotas afetadas: leituras de todos/por tipo/por ID, dependentes, aprovações, `POST /api/Usuarios`, resposta de `PATCH /api/Usuarios/{id}` e respostas de aprovação/rejeição que serializam esses DTOs. O OpenAPI gerado deve documentar `dataIngresso` como `string`, formato `date`, anulável.

## Dados e migrações

### Modelo alvo

| Artefato | Estado alvo | Observação |
|---|---|---|
| `Usuario.DataIngresso` | `DateOnly?` | sem horário/fuso; anulável para legado/importação |
| coluna `Usuarios.DataIngresso` | PostgreSQL `date null` | substitui `timestamp with time zone null` |
| `Academico.Cidade` | `string?`/`text null` | legado preservado; novo cadastro validado |
| `Academico.Curso` | `string?`/`text null` | legado preservado; limite aplicado a novas escritas |

### Migração EF Core

1. Criar uma migração posterior a `CredentialLifecycle` e atualizar `AppDbContextModelSnapshot`.
2. No `Up`, converter explicitamente a coluna com SQL equivalente a `("DataIngresso" AT TIME ZONE 'UTC')::date`; valores nulos permanecem nulos. Não depender do timezone da conexão.
3. Não executar `UPDATE` em `Cidade` ou `Curso`, nem adicionar constraint que invalide registros legados.
4. Validar a migração em banco vazio e em banco atualizado a partir da baseline/`CredentialLifecycle`, incluindo timestamp próximo à virada UTC e `null`.
5. Gerar e revisar script idempotente antes da disponibilização.

O `Down` pode reconstruir `timestamp with time zone` à meia-noite UTC. Essa reversão é semanticamente lossy porque o horário original não existe mais; backup pré-migração é a única forma de recuperar o instante anterior. Por isso a reversão preferida é voltar a aplicação mantendo a coluna `date`, se a versão anterior tolerar o schema, ou restaurar backup antes de executar `Down`.

## Segurança, privacidade e permissões

- `POST /api/Usuarios` permanece público e não ganha autorização nova; todas as rotas de leitura/patch mantêm os atributos e políticas atuais.
- O cliente nunca é autoridade para validação. Chamadas diretas recebem os mesmos limites de cidade/curso e erros de campo.
- Trim e limite de 100 caracteres do curso reduzem entradas artificiais sem criar lookup externo ou transmitir dados pessoais.
- Logs de rejeição registram apenas código/motivo e nomes dos campos, nunca cidade, curso, e-mail ou corpo da requisição.
- A API preserva `null` e o sentinela legado em vez de inferir localização. Nenhuma consulta externa de cidade é permitida nesta entrega.
- O mapeamento deve usar allowlist de propriedades; `dataIngresso`, status e identidade não podem ser definidos pelo corpo de cadastro.
- Schemas frontend são defesa de contrato e não substituem autorização nem validação do servidor.

## Falhas, observabilidade e operação

| Evento | Comportamento externo | Evidência operacional |
|---|---|---|
| cidade/curso inválido | `400 application/problem+json` com erro por campo | log estruturado `user_registration_rejected`, campos inválidos e sem valores |
| contrato backend divergente | teste de contrato falha; frontend não deve mascarar em produção | erro de integração sanitizado, sem payload/PII |
| data ausente | `dataIngresso: null`; UI `Não informado` | comportamento esperado, sem log de erro |
| cidade legada | API preserva valor; UI `Não informado` | teste de legado; sem escrita no banco |
| migração incompatível | aplicação não inicia porque `Migrate()` falha | ID da migração e erro de banco sanitizado |
| falha de notificação pós-cadastro | cadastro continua como hoje | substituir o `Console.WriteLine` atual por `ILogger`, sem dados do usuário, quando o arquivo for tocado |

Não é necessária métrica de negócio nova para esta alteração. Contagem de rejeições por campo pode ser adicionada ao mecanismo de telemetria já existente somente com cardinalidade fixa; cidade/curso nunca serão labels. Smoke operacional deve consultar um usuário com data, um sem data e um acadêmico legado antes de liberar o frontend.

## Compatibilidade, disponibilização e reversão

1. Caracterizar por testes os payloads atuais e inventariar consumidores internos antes da alteração.
2. Aplicar backup e migração de `timestamp with time zone` para `date`; validar contagens de nulos/não nulos e amostras de data UTC sem registrar dados pessoais.
3. Publicar backend e frontend na mesma janela. O novo frontend exige data ISO civil/null; o backend rejeitará cadastros antigos que ainda enviem `Indefinido`.
4. Executar smoke de cadastro com `ES`, rejeições diretas, perfil, dependentes/responsável e legado.
5. Monitorar `400` de cadastro por campo e erros de parsing do contrato durante a janela de implantação.

Não é necessário feature flag: manter simultaneamente timestamp e data civil perpetuaria a divergência de RF-003/RF-004. A reversão de frontend restaura a interface anterior, mas ela não conseguirá cadastrar enquanto fabricar `Indefinido`; portanto rollback deve ser coordenado. A reversão segura de backend restaura a versão e o backup da coluna quando for necessário recuperar horários. Cidade legada nunca precisa de rollback porque não é alterada.

## Estratégia TDD e pirâmide de testes

### RED

1. xUnit unitário: criar tabela de `UsuarioService` que hoje falha para cidade vazia/whitespace/`Indefinido`, curso `E`, `ES`, 100 e 101 caracteres e comprova trim dos valores válidos.
2. xUnit de controller: chamadas diretas inválidas hoje retornam mensagem agregada; exigir Problem Details com `errors.cidade`/`errors.curso` e ausência do valor original.
3. xUnit de contrato/mapeamento: exigir `DateOnly?` em todos os DTOs equivalentes, `YYYY-MM-DD`/`null` na serialização e configuração AutoMapper válida.
4. xUnit integração PostgreSQL: demonstrar que o schema atual é `timestamp with time zone`; exigir `date`, conversão UTC determinística, `null` e preservação literal de `Indefinido`.
5. Vitest: o schema atual aceita/produz contrato divergente; exigir cidade real, curso 2–100 após trim, `dataIngresso` ISO/null e helpers retornando `Não informado` sem timezone.
6. Testing Library: exigir campo Cidade com label, erro associado e payload real; comprovar que `ES` submete e que whitespace/curso fora do limite bloqueiam com feedback.
7. Playwright: escrever cenário falhando que cadastra acadêmico com cidade real/`ES`, verifica persistência via API, aprova/autentica e confirma perfil; incluir requisição direta inválida e exibição de legado.

### GREEN

1. Implementar o menor retorno estruturado/normalizador no `UsuarioService` e a tradução para Validation Problem Details no controller.
2. Adicionar cidade e ajustar curso/schema/payload de `CreateAccount` até os testes de formulário passarem.
3. Alterar entidade/DTOs/mapeamentos para `DateOnly?`, injetar `TimeProvider` no fluxo de cadastro e configurar serialização/OpenAPI conforme necessário.
4. Gerar a migração `date`, fazê-la passar nos testes PostgreSQL de banco vazio e upgrade.
5. Introduzir `contracts/user.ts`, validar integrações e migrar consumidores para tipos/helpers compartilhados.
6. Fazer o E2E passar no stack descartável existente sem condicionar asserts ao ambiente.

### REFACTOR

1. Consolidar campos compartilhados dos DTOs e builders de testes sem mudar o JSON aprovado.
2. Remover interfaces locais de usuário e fallbacks `Data inválida`/`Não Corresponde` somente depois que busca estrutural e testes comprovarem os substitutos.
3. Separar `formatCivilDate` dos formatadores de instantes usados por empréstimos; não alterar datas que realmente contêm horário.
4. Extrair builder/fixture acadêmica comum e relógio controlado para evitar datas flakey.
5. Rodar testes focados após cada extração e a esteira completa ao final.

### Pirâmide e evidência

- Unitários xUnit: normalização, limites, sentinela, relógio e mapeamentos.
- Contrato xUnit/WebApplicationFactory: status/content type, Problem Details, JSON/OpenAPI e nulabilidade em todos os endpoints afetados.
- Integração xUnit com PostgreSQL descartável: tipo da coluna e migração; EF `InMemory` não serve como evidência de cast/tipo Npgsql.
- Unitários/integração Vitest + Testing Library: schemas, helpers, formulário e payload.
- E2E Playwright: CA-001, CA-002, CA-003 e CA-004 no navegador/API real, reutilizando o stack já existente.

## Esteira de qualidade

| Área | Comando local | Verificação de CI | Lacuna/ação |
|---|---|---|---|
| Backend restore/build | `dotnet restore backend/backend.sln`; `dotnet build backend/backend.sln --no-restore -c Release --nologo --disable-build-servers` | `backend-quality` em `container-ci.yml` para PR a `develop` | gate existente; nenhum projeto precisa ser incluído |
| Backend completo | `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers` | `backend-quality` executa integração filtrada e depois a solução | passou 85/85 em 2026-08-31; adicionar suites de contrato/validação/migração |
| Backend focado | `dotnet test backend/Tests/Tests.csproj -c Release --nologo --disable-build-servers --filter "FullyQualifiedName~UsuarioDataContractTests|FullyQualifiedName~UsuarioRegistrationTests|FullyQualifiedName~UserDataMigrationTests"` | incluído no job backend | os nomes/classes serão criados na implementação |
| Frontend testes | `npm run test -- --run` em `frontend/` | `frontend-quality` | passou 57/57; adicionar schema/helper/formulário |
| Frontend lint | `npm run lint` em `frontend/` | `frontend-quality` | passou em 2026-08-31 |
| Frontend build | `npm run build` em `frontend/` | `frontend-quality` | passou; avisos atuais de chunk/asset/Browserslist não bloqueiam esta feature |
| Migração | `dotnet ef migrations script --idempotent --project backend/LabSolos-Server-DotNet8/LabSolos-Server-DotNet8.csproj --output .tmp/user-data-contracts.sql` | testes PostgreSQL do `backend-quality` | adicionar teste de upgrade/cast UTC e revisar script idempotente |
| Catálogo E2E | `npm run test:e2e:list` em `frontend/` | configuração carregada pelo job E2E | confirmar inclusão de `user-data-contract.spec.ts` |
| E2E integrado | `docker compose -f docker-compose-e2e.yml up -d --build --wait`; `npm run test:e2e` em `frontend/`; `docker compose -f docker-compose-e2e.yml down --volumes --remove-orphans` | job `auth-e2e`, que já executa toda a suíte Playwright em PR | ampliar a suíte; renomear o job é opcional e não é requisito funcional |
| Workflow | `python -m unittest discover -s .github/scripts/tests -p "test_*.py" -v` | `workflow-quality` | só atualizar contrato do workflow se o job E2E for renomeado/alterado |

`container-ci.yml` já é validação pré-merge: os gatilhos `opened`, `synchronize` e `reopened` em `pull_request` para `develop` cobrem mudanças antes do merge. `container-release.yml`, acionado em PR fechado para `main`, não será contado como gate.

## Matriz de rastreabilidade

| Requisito | Componentes | Testes | Evidência |
|---|---|---|---|
| RF-001 | `CreateAccount`, schema de cadastro, `Auth.createMentor`, `UsuarioService`, controller/mapeamento | unitário de cidade, Testing Library, contrato HTTP, Playwright | payload/persistência contém cidade normalizada e nenhuma nova linha contém `Indefinido` |
| RF-002 | schema frontend, normalizador backend, `Academico.Curso` | tabela 1/2/100/101 + whitespace, formulário e API direta | `ES` persiste; fora do intervalo retorna erro `curso` |
| RF-003 | DTOs comuns, `UsuarioMappingProfile`, `contracts/user.ts`, integrações | reflexão/mapeamento/serialização, schemas Zod e endpoints representativos | campos presentes têm mesmo nome, nulabilidade, enums e formato |
| RF-004 | `DateOnly?`, migração `date`, `formatCivilDate`, `displayUserValue`, telas | serialização/data UTC/null, helpers, Playwright de perfil/legado | API retorna data ISO/null; UI mostra `dd/MM/yyyy` ou `Não informado` sem escrita legada |
| RNF-001 | contrato documentado, migração, publicação coordenada, schemas | caracterização, upgrade PostgreSQL e smoke coordenado | ausência permanece `null`; consumidores falham em teste antes do deploy |
| RNF-002 | `UsuarioService`, Problem Details, Zod/React Hook Form e acessibilidade | chamada direta, formulário e E2E | servidor rejeita independentemente do cliente; cliente associa feedback ao campo |
| CA-001 | RF-001 + RF-002 + RNF-002 | Playwright/API com cidade real e curso `ES`; leitura posterior | valores trimados persistem e `Indefinido` não é gravado |
| CA-002 | RF-001 + RF-002 | controller/WebApplicationFactory com cidade vazia/sentinela e curso fora do intervalo | `400 application/problem+json` contém erros compreensíveis por campo |
| CA-003 | RF-003 + RF-004 + RNF-001 | contrato dos DTOs/endpoints, Zod, perfil/dependentes/responsável | respostas usam `YYYY-MM-DD`/`null` e tipos compartilhados; cliente exibe `dd/MM/yyyy` |
| CA-004 | RF-004 | migração preservando cidade, helpers e E2E com registro legado | banco continua `Indefinido`/null; apresentação mostra `Não informado` |

## Alternativas e decisões

| Decisão | Alternativas | Recomendação | Escolha confirmada | Consequências |
|---|---|---|---|---|
| Tipo de data | manter `DateTime`; string formatada; `DateOnly?` | `DateOnly?` em entidade/DTO e PostgreSQL `date` | derivada da decisão confirmada do PRD de data civil opcional | elimina horário/fuso por construção; exige migração e coordenação |
| Conversão legada | timezone da sessão; data local da aplicação; data UTC | extrair a data em UTC explicitamente | decisão técnica para preservar a semântica atual de `UtcNow` de modo determinístico | timestamps próximos à meia-noite não variam por ambiente |
| Data de novo cadastro | aceitar cliente; deixar nula; manter atribuição do servidor | manter atribuição pelo servidor, agora como data UTC civil | preserva comportamento atual sem ampliar o contrato de entrada | novos cadastros têm data; legado/importação pode continuar nulo |
| Cidade legada | migrar para null; inferir; preservar e adaptar UI | preservar armazenamento e traduzir apenas na apresentação | confirmada no PRD | sem perda/invenção; API ainda pode expor o sentinela legado |
| Validação acadêmica | atributos globais; biblioteca nova; serviço atual estruturado | evoluir `UsuarioService` e Problem Details existente | menor mudança coerente com o repositório | mantém validação condicional sem nova dependência |
| Contrato frontend | interfaces locais; geração OpenAPI agora; Zod/TypeScript compartilhado | contrato manual compartilhado nesta entrega | decisão técnica incremental | remove divergência com baixo impacto; geração automática pode vir depois |
| Formatação | `new Date`; `date-fns` para timestamp; parser civil dedicado | parser/formatador estrito sem instante | derivada de RF-004 | nenhum deslocamento de dia por fuso |
| Validação de design | abrir sessão de decisão; dispensar; desnecessária | desnecessária | PRD confirmou curso, legado e data; alternativas restantes são implementações de menor mudança | pode seguir diretamente para `create-tasks` |

Não resta alternativa arquitetural material que altere produto, segurança, persistência ou operação: o PRD já decidiu texto livre, preservação do legado e data civil. Por isso não é necessária sessão `$grill-me`.

## Riscos e mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| cast de timestamp usar timezone implícito | data muda perto da meia-noite | SQL explícito em UTC e teste com limites de dia |
| rollback após perda do horário | instante original irrecuperável | backup obrigatório, script revisado e preferência por roll-forward |
| frontend/backend publicados fora de ordem | cadastro recebe `400` ou schema rejeita timestamp | mesma janela, contrato testado e smoke antes de liberar tráfego |
| consumidores esquecidos por interfaces duplicadas | tela exibe inválido ou quebra | contrato central, busca estrutural e lista de todos os usos de `dataIngresso` |
| AutoMapper converter implicitamente tipos | formato/nulo divergente | mapeamentos explícitos, `AssertConfigurationIsValid` e teste JSON |
| regra de trim divergir entre JS/.NET em Unicode incomum | limite de curso não coincide | tabela compartilhada de casos, payload sempre revalidado no servidor e regra documentada como pós-trim |
| registros legados violarem novas regras | leitura ou migração falha | regras somente em novas escritas; sem constraint/reescrita de cidade/curso |
| E2E alterar estado entre testes | flakiness | usuário sintético único por execução, banco/volumes descartáveis e relógio controlado abaixo de E2E |
| mensagens exibirem PII | exposição em log/telemetria | erro por código/campo, nunca valor; testes negativos de Problem Details/log |

## Perguntas abertas

Nenhuma bloqueante. Antes da disponibilização, a equipe deve apenas registrar os fatos operacionais a seguir, sem mudar o design:

- resultado da consulta de impacto que conta timestamps não nulos e cursos legados acima de 100 sem copiar valores para logs;
- ordem e janela exatas de publicação coordenada do backend/frontend;
- confirmação de backup e responsável pela revisão do script idempotente da migração.
