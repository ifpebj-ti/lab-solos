# Especificação técnica: Proteção de acesso, autenticação e frontend

- Status: pronta para decomposição em tarefas
- PRD: `./prd.md`
- Atualizado em: 2026-10-13
- Validação de design: confirmada pelo usuário em 2026-10-13
- Issues: #436, #437, #438, #439 e #440
- Escopo desta entrega documental: especificação; nenhum código de produção implementado.

## Resumo técnico

Aplicar autorização por titularidade, papel e vínculo nas consultas de usuários e nos empréstimos utilizados pelo acompanhamento; impedir alterações de terceiros e exigir senha atual para trocar o próprio e-mail. Compartilhar cotas transacionais no PostgreSQL existente, com estado limitado e identificação de IP baseada exclusivamente na cadeia de proxies confiáveis. Recuperação passa a enfileirar pedidos cifrados, sem consultar elegibilidade nem esperar pelo SMTP na requisição pública. Um trabalhador em segundo plano emite e envia códigos, preservando validade, uso único e revogação.

Aplicar CSP no Caddy que entrega o HTML de produção. Remover CORS permissivo e habilitar uma política explícita apenas em desenvolvimento. Ampliar os testes existentes com cenários reais de autorização, concorrência, fila e cabeçalhos; a verificação do proxy precisa de uma composição própria, pois o E2E atual não passa pelo Caddy.

As escolhas materiais foram confirmadas em duas rodadas: PostgreSQL para limites compartilhados e fila durável no mesmo banco. As decisões de produto do PRD permanecem vigentes.

## Estado atual

| Área | Evidência local | Consequência |
|---|---|---|
| API | ASP.NET Core `net8.0`; EF Core Relational 9.0.19 e Npgsql 9.0.4 no projeto atual | Reutilizar versões e ferramentas existentes, sem migração de plataforma |
| Usuários | `UsuariosController.cs`: GET por ID/tipo e PATCH não validam suficientemente titularidade; GETs de dependentes validam papel, mas recebem ID do cliente | Centralizar política por objeto antes da projeção ou alteração |
| Empréstimos | `EmprestimosController.cs`: consultas por usuário e detalhe têm autorização genérica; o histórico do Mentor usa `Emprestimos/usuario/{userId}` | Proteger essas leituras como dependência direta da #436, inclusive detalhe aberto a partir do histórico |
| Credenciais | `CredentialService.cs`: hash do código, prazo de 15 minutos, uso único e incremento de `VersaoSessao` após redefinição | Reutilizar essas garantias, não criar fluxo paralelo de senha |
| Login | `AuthController.cs` consulta `Email` por igualdade e verifica senha/status; ausência de controle de tentativas | Controlar falhas antes de verificar nova senha quando a cota estiver esgotada |
| Recuperação | `EmailController.cs` compartilha métodos entre aliases; envia SMTP síncrono antes do 202 neutro | Separar admissão pública de elegibilidade e entrega |
| Auditoria | `AuditoriaMiddleware.cs` pode registrar e-mail, `code`, `token`, cookies, IP e IDs; mascara somente nomes contendo senha/password | Excluir payloads e dados pessoais das rotas afetadas; novos controles não podem perpetuar o vazamento |
| IP | `HttpContextExtensions.cs` lê diretamente vários cabeçalhos; `Program.cs` não declara explicitamente os proxies da topologia publicada | Usar endereço resolvido pelo middleware confiável, sem fallback para headers arbitrários |
| Frontend | React/Vite; schemas Zod exigem usuário completo; `MentoringHistory.tsx` usa `academicoSchema`; não há formulário geral de edição própria | Introduzir projeção específica de acompanhamento e edição própria mínima |
| Erros de UI | `normalizeError.ts` não classifica 429; alguns adaptadores convertem 404 em lista vazia | Acrescentar espera temporária e remover conversões que ocultariam acesso negado |
| Proxy | `Caddyfile` já centraliza outros cabeçalhos e encaminha `/api/*`; sem CSP | Uma única política de produção no ponto que entrega HTML |
| Dados | `AppDbContext.cs`, quatro migrações e snapshot existentes; sem tabelas de cotas/fila, sem índice de unicidade de e-mail configurado | Migração aditiva e revisão das caracterizações de migrações |
| Testes | xUnit, `WebApplicationFactory`, PostgreSQL Testcontainers, tempo controlado; Vitest/Testing Library/MSW e Playwright | TDD já é viável; ampliar a infraestrutura em pontos específicos |

Não foram encontrados `AGENTS.md` aplicáveis. O estado inicial continha o diretório do PRD ainda não rastreado pelo Git; sua autoria e conteúdo são preservados. Não houve acesso a credenciais ou testes em produção.

## Arquitetura proposta

### Componentes e responsabilidades

Os caminhos novos abaixo são propostas a implementar; nomes de métodos são contratos de responsabilidade, não código já existente.

| Componente | Caminho proposto ou existente | Responsabilidade |
|---|---|---|
| Política de recurso | `Services/Security/UserResourceAccessService.cs` | Resolver identidade e devolver predicados permitidos para perfil, vínculos e empréstimos |
| Alteração de perfil | `Services/Security/UserProfileUpdateService.cs` | Autorizar operações, validar senha/e-mail e persistir alteração indivisível |
| Identificador de cota | `Services/Security/ThrottleKeyFactory.cs` | Normalizar apenas a chave de controle e aplicar HMAC-SHA256 |
| Cotas compartilhadas | `Services/Security/PostgresAuthenticationThrottle.cs` | Garantir capacidade, janelas e contagem transacional entre instâncias |
| Admissão de recuperação | `Services/Security/PasswordRecoveryRequestService.cs` | Consumir cotas públicas e inserir/coalescer pedido cifrado na mesma transação |
| Cifragem de fila | `Services/Security/RecoveryPayloadProtector.cs` | Usar AES-256-GCM com chave operacional versionada separada do JWT/HMAC |
| Entrega de recuperação | `BackgroundServices/PasswordRecoveryDeliveryWorker.cs` | Reservar pedidos, consultar elegibilidade, emitir e entregar código com repetição limitada |
| Contratos mínimos | `DTOs/Usuarios/UsuarioAcompanhamentoDTO.cs` | Projetar campos necessários ao histórico sem retornar perfil completo |
| Configuração | `Services/Security/AuthenticationProtectionOptions.cs` | Validar cotas, capacidade, segredos, fila e topologia antes de servir tráfego |
| Telemetria | `Services/Security/AuthenticationProtectionTelemetry.cs` | Emitir contagens e durações com dimensões de cardinalidade limitada |
| Integração | Controllers afetados, `Program.cs`, `SecurityServiceCollectionExtensions.cs` | Conectar serviços, políticas e respostas HTTP |

Serviços de domínio continuam com escopo por requisição. O trabalhador cria escopos próprios, não retém `DbContext` de requisições. SQL parametrizado específico de PostgreSQL fica isolado no controle de cotas e no repositório da fila; não simular garantias relacionais com EF InMemory.

### Autorização antes da projeção

Extrair `sub`/`NameIdentifier` e papel da sessão validada. Próprio perfil ou Administrador usa projeção atual; Mentor recebe somente `UsuarioAcompanhamentoDTO` quando `ResponsavelId == solicitante.Id` e o alvo tem nível Mentorado. Consulta sem predicado autorizado retorna o mesmo 404 de registro inexistente. Não construir DTO completo para depois remover propriedades.

Aplicar a política na própria consulta sempre que possível. Mutação de usuário deve consultar e autorizar o recurso sob transação/bloqueio da linha antes de aplicar mudanças. O vínculo precisa ser verificado na consulta de empréstimos, não apenas numa consulta prévia do perfil que o navegador poderia ignorar. Sessão sem troca obrigatória concluída continua negada pela política existente.

### Normalização sem fusão de contas legadas

Para **cotas**, usar `Trim()` e `ToLowerInvariant()` sobre e-mail; preservar sinais, pontos, sufixos com `+` e domínio, sem regras específicas de provedores. Limitar identificador de entrada a 254 caracteres e rejeitar tipos/formato inválidos pelo contrato público, sem consulta de existência. Testar versões equivalentes com espaços externos e caixa diferente.

Para **resolução de contas**, manter igualdade exata usada atualmente por cadastro/login/recuperação nesta entrega. A transformação acima não renomeia contas nem torna uma conta diferente acessível. Contas legadas que diferem apenas por caixa compartilharão orçamento de segurança, sem serem fundidas. Migrar a identidade de e-mail para comparação insensível a caixa seria uma mudança separada. O novo índice de unicidade usa a mesma igualdade exata do contrato atual.

IP usa representação canônica, convertendo IPv4 mapeado em IPv6 para IPv4. Endereço indisponível usa uma única chave conservadora, não um valor fornecido pelo cliente. Materializar chave com HMAC de `ambiente | finalidade | dimensão | identificador`, usando segredo de pelo menos 32 bytes distinto da chave JWT. Não persistir e-mail/IP em texto nas tabelas de cotas nem logar os HMACs. Todas as instâncias compartilham segredo e parâmetros; rotação não pode zerar cotas silenciosamente.

## Fluxos e componentes

### Cotas e capacidade transacionais

Utilizar seis espaços de chave: `login-account`, `login-ip`, `recovery-request-recipient`, `recovery-request-ip`, `recovery-code-recipient` e `recovery-code-ip`. Janelas começam na primeira falha ou solicitação admitida e não deslizam com pedidos negados. A renovação ocorre quando `agora >= WindowEndsAt`. Login e validação de código contam falhas; emissão conta solicitações admitidas independentemente de existência de conta. Sucesso não limpa contadores.

1. Garantir a presença das linhas necessárias em transação curta de alocação. Bloquear linhas de capacidade numa ordem estável, eliminar linhas expiradas elegíveis e só inserir se houver espaço. Usar chave única e `INSERT ... ON CONFLICT` para corrida de criação. Alocação não consome a cota.
2. Em nova transação, bloquear **todas** as linhas de cota necessárias com `SELECT ... FOR UPDATE`, ordenadas pela chave. Revalidar presença/expiração depois dos bloqueios; se a limpeza removeu uma linha entre fases, repetir a alocação de forma limitada, sem liberar a operação sem proteção.
3. Avaliar as dimensões conjuntamente. Cota atingida não verifica senha/código nem incrementa contadores ou renova prazos. `Retry-After` é o teto, em segundos, do maior prazo impeditivo, mínimo 1.
4. Para login permitido, manter bloqueios das duas cotas até terminar verificação da senha; falha incrementa ambas; sucesso confirma sem limpar histórico. Senha não sai da memória da operação. Cancelamento após início da verificação não pode apagar a contagem da tentativa: concluir o registro com prazo interno limitado antes de encerrar.
5. Para validação de código com destinatário informado, bloquear cota por IP/destinatário antes da validação. Pedido legado sem e-mail passa primeiro pela cota por IP; resolver pelo hash do código, obter a chave do destinatário, liberar a fase preliminar e adquirir o conjunto em ordem estável em uma nova transação, revalidando o IP e o código antes da mutação. Não adquirir a segunda chave mantendo a primeira em ordem invertida. Resolução preliminar não verifica senha nova nem produz resposta específica de conta. Falha de código ou de redefinição conta como tentativa inválida; conflito operacional não é falha de credencial.
6. O serviço de credenciais deve aceitar a transação externa e não criar/confirmar uma transação interna incompatível. Falhas lógicas de código devem persistir contagem sem persistir mutação de usuário; sucesso confirma consumo do token, versão de sessão e resultado da cota numa única transação.

O relógio de cotas em produção é consultado no banco após aquisição dos bloqueios (`clock_timestamp()`), evitando divergência entre instâncias. Testes usam um relógio substituível e compartilhado; o relógio do ciclo de credenciais permanece `TimeProvider`. SQL, ordem de bloqueios, corrida de limpeza e transações devem ser comprovados em PostgreSQL 15, não apenas por testes unitários. Os bloqueios de linha ficam retidos até o término da transação conforme a [documentação PostgreSQL](https://www.postgresql.org/docs/15/explicit-locking.html).

Capacidade técnica inicial: 10.000 linhas por espaço, no máximo 60.000 linhas de cota. Alocação/remoção mantém contador consistente sob bloqueio, sem `COUNT` não sincronizado como garantia. Trabalhador de limpeza verifica expiração em lotes de 100 a cada 30 segundos; nunca descarta janela ativa para abrir espaço. Falta de espaço retorna 429 com nova tentativa em 30 segundos para login/código; emissão mantém 202 neutro sem envio. Banco indisponível ou prazo de bloqueio excedido não permite verificação de credencial: login/código retornam 503 genérico; emissão mantém 202 neutro. Usar prazo de bloqueio de 2 segundos e prazo total de operação de cota de 5 segundos, configuráveis e sujeitos à medição.

### Recuperação pública e entrega

1. Ambas as rotas de solicitação validam apenas a estrutura da entrada e chamam o mesmo serviço de admissão, antes de qualquer consulta de conta.
2. Sob as cotas de emissão, verificar limite e `NextAllowedAt`; pedido negado retorna o mesmo 202, sem tocar código ou fila. Pedido admitido consome cotas mesmo para destinatário inexistente/inativo.
3. Inserir um pedido com endereço cifrado; se já houver pedido ativo para a chave de entrega, coalescer sem alterar o código ou ampliar a validade. A chave de entrega é HMAC com finalidade própria sobre o endereço **exato** utilizado pela resolução atual, enquanto a cota e o espaçamento de emissão usam o destinatário normalizado. Assim, não fundir trabalhos de contas legadas distintas apenas porque compartilham orçamento normalizado. Não manter vários trabalhos ativos para a mesma chave de entrega. Cotas e inserção/coalescência confirmam juntas; fila cheia reverte a admissão e retorna 202 neutro sem envio.
4. Responder 202 com a mensagem neutra existente. O contrato não promete entrega concluída no instante da resposta.
5. Trabalhadores de todas as instâncias disputam lotes de até 10 pedidos elegíveis, com `FOR UPDATE SKIP LOCKED`, aquisição curta e concessão exclusiva de processamento. Essa primitiva serve ao processamento concorrente de filas, conforme a [documentação de SELECT](https://www.postgresql.org/docs/15/sql-select.html).
6. Decriptar endereço apenas no trabalhador e consultar conta habilitada pela igualdade atual. Sem conta elegível, concluir e apagar payload sem enviar. Antes da emissão, descartar pedido que esperou mais de 15 minutos desde a admissão.
7. Antes de gerar um novo código, verificar também o intervalo mínimo de **60 segundos entre emissões efetivas**, sob bloqueio da linha do destinatário. A espera na fila não pode permitir duas emissões próximas apenas porque suas admissões ocorreram em horários distantes. Se necessário, reagendar o trabalho para `NextEmissionAt`, sem consumir outra cota ou alterar código vigente. Registrar esse prazo também para processamento de destinatário inelegível, como emissão virtual, mantendo comportamento do controle independente da existência da conta. Para conta elegível, bloquear o usuário, gerar código pelo mecanismo existente e salvar **juntos** hash, validade de 15 minutos desde a emissão, versão de sessão de referência, prazo de próxima emissão e payload cifrado de entrega. Confirmar antes do SMTP. Uma retomada usa o mesmo código cifrado, nunca emite outro código para repetir a entrega.
8. Antes de cada envio, verificar usuário ainda habilitado, e-mail igual, versão e hash ainda correspondentes e código não expirado. Senha trocada, e-mail alterado ou código consumido cancela o trabalho. Não manter bloqueio de usuário durante chamada SMTP; um envio que concorra com invalidação pode entregar um código que já não funciona, mas não revalidá-lo.
9. Usar envio assíncrono do transporte (`SendMailAsync`) no trabalhador, com prazo de 15 segundos por tentativa; três tentativas no máximo, com intervalos de 30 e 120 segundos, sempre antes da expiração. Falha permanente de configuração/formato não é repetida. A concessão dura 60 segundos, usa identificador de reserva e renovação se necessário; confirmação por trabalhador antigo após perda da concessão é rejeitada.
10. Conclusão, inelegibilidade, cancelamento, falha final ou expiração apaga imediatamente o payload e remove o trabalho ativo. Contagens agregadas preservam resultado sem destinatário/código.

SMTP não oferece confirmação transacional conjunta com o banco: queda após aceitação pelo servidor pode causar entrega duplicada na repetição. O sistema garante código estável para esse trabalho, orçamento e repetição limitada, não entrega exatamente uma vez. Não iniciar segundo trabalhador para concessão válida; teste de queda e retomada precisa explicitar essa limitação.

Fila limitada a 5.000 trabalhos ativos no ambiente; limpeza de expirados usa o mesmo mecanismo de capacidade. Requisições negadas não prolongam espera nem invalidam tokens. Login usa espaços independentes. Capturar tempos HTTP de contas elegíveis/inelegíveis e tempo de entrega no Mailpit: retirar SMTP e elegibilidade da resposta reduz a fonte conhecida de variação, sem afirmar equivalência temporal absoluta.

### Projeções e consumidores

`UsuarioAcompanhamentoDTO` contém somente `id`, `nomeCompleto`, `email`, `telefone`, `dataIngresso`, `instituicao`, `cidade`, `curso`, `status` e `nivelUsuario`. Esses campos são usados pelo histórico, listagens e aprovação de vinculados; não inclui `responsavel`, credenciais, dependentes ou propriedades adicionais do perfil. Datas/nulabilidade seguem o contrato atual.

`GET Usuarios/{id}` mantém DTO atual para titular/Administrador e devolve a projeção mínima para Mentor vinculado. Acrescentar `usuarioAcompanhamentoSchema` em `frontend/src/contracts/user.ts` e um adaptador explícito `getUserForMentoring`; `mentor/MentoringHistory.tsx` passa a usar esse contrato. `getUserById` permanece estrito para consumidores de perfil completo. Dependentes usam projeção com os mesmos campos necessários; o resumo do responsável já autorizado no perfil próprio é preservado.

Nos empréstimos de acompanhamento, projetar solicitante/aprovador sem incluir relações recursivas. Retornar campos de identificação/contato já utilizados pela verificação e exportação autorizadas, sem carregar dependentes nem estado de credenciais; validar os schemas de empréstimo atuais. Não serializar entidades EF diretamente.

## Contratos e APIs

### Autorização e leitura

| Rota | Política proposta | Resposta |
|---|---|---|
| `GET /api/Usuarios` e `/tipo/{tipoUsuario}` | Apenas Administrador com troca concluída | 200 com contratos atuais; 403 por papel |
| `GET /api/Usuarios/{id}` | Titular, Administrador ou Mentor do Mentorado alvo | 200 com projeção correspondente; 404 uniforme se fora do predicado |
| `GET /api/Usuarios/{usuarioId}/dependentes` e `/dependentes/aprovacao` | Administrador ou Mentor cujo ID é o solicitante validado | 200 com lista mínima; `[]` se vazia; 404 para responsável inacessível/inexistente |
| `GET /api/Usuarios/{usuarioId}/dependentes/emprestimos` | Mesma regra de responsável e vínculo | 200 com empréstimos permitidos; `[]` se vazia |
| `GET /api/Emprestimos/usuario/{userId}` e `/solicitados/{userId}` | Titular, Administrador ou Mentor do Mentorado consultado | 200 somente com empréstimos autorizados; 404 para usuário inacessível |
| `GET /api/Emprestimos/aprovados/{userId}` | Titular ou Administrador; Mentor não ganha acesso aos aprovados de outro responsável | 200 ou 404 uniforme |
| `GET /api/Emprestimos/{emprestimoId}` | Administrador, solicitante, aprovador ou Mentor responsável pelo solicitante Mentorado | 200 ou 404 uniforme; verificar vínculo na consulta |

Aprovação/rejeição de dependentes mantém verificação atual de identidade e vínculo. Mutação de estoque e decisões de empréstimo não são redesenhadas. Ausência/invalidade de sessão continua 401; troca obrigatória mantém 403 existente. Recurso individual não autorizado e inexistente usa o mesmo `ProblemDetails` de 404, com `title: "Recurso não encontrado."`, sem ID, razão privada ou variação de corpo por existência.

Remover `emptyOnNotFound` dos adaptadores de dependentes/pendências afetados em `Users.ts` e `Class.ts`, pois estado vazio passa a ser 200/`[]`; 404 agora deve propagar falha. Preservar semântica de endpoints administrativos não alterados, com testes específicos para não ampliar a mudança indevidamente.

### Alteração de perfil

Manter `PATCH /api/Usuarios/{usuarioId}` e `application/json-patch+json`. Incluir `SenhaAtual` como campo transitório do DTO de entrada, ignorado no mapeamento/persistência/resposta. A interface envia:

```json
[
  { "op": "replace", "path": "/email", "value": "novo@example.invalid" },
  { "op": "replace", "path": "/senhaAtual", "value": "<senha atual fornecida pelo titular>" }
]
```

Validar todas as operações antes de `ApplyTo`. Permitir `replace` nos caminhos canônicos `/nomeCompleto`, `/email`, `/telefone`, `/status` e `/senhaAtual`, e `test` em campos persistentes permitidos. `from`, caminhos aninhados, operações `move`/`copy`/`remove`/`add`, ponteiros ambíguos, paths desconhecidos e duplicação de `/senhaAtual` retornam 400. Validar destino de cada operação; a inspeção literal exclusiva de `/status` não protege operações alternativas. Limite técnico de 10 operações por documento. Campos persistentes precisam ter autorização completa; documento misto proibido falha integralmente.

Consulta de alvo inacessível retorna 404 antes de validações que revelariam seu conteúdo. Titular sem papel administrativo tentando `/status` retorna 403. Alteração própria de e-mail exige senha correta, incluindo Administrador que edita o próprio endereço; gestão administrativa de terceiros não exige senha do terceiro. Senha inválida/ausente retorna 400 com código `current_password_invalid` no campo `senhaAtual`; validação de nome/telefone/e-mail segue política existente. E-mail duplicado retorna 409 com código público `profile_update_conflict`, sem dados da conta conflitante.

Sob bloqueio do usuário, validar o DTO temporário, confirmar senha se aplicável e atualizar tudo uma única vez. Se o e-mail realmente mudar, limpar o código de recuperação anterior e cancelar trabalhos de entrega desse usuário; não incrementar nem reduzir `VersaoSessao` por mudança de contato, pois revogação de sessão por esse evento não foi aprovada. Corrida com troca de senha deve revalidar a senha atual dentro da transação. A resposta mantém `UsuarioDTOPatchResponse`, sem campo de senha.

Adicionar formulário próprio mínimo compartilhado pelos perfis em `components/auth/ProfileContactForm.tsx`: nome, telefone, e-mail e confirmação de senha condicionada à troca de e-mail. Limpar senha ao concluir/cancelar/desmontar, sem cookies ou armazenamento persistente. Não criar edição de contatos de dependentes para Mentor. O consumidor administrativo atual de status permanece compatível.

### Autenticação e recuperação

| Operação | Sucesso/recusa de negócio | Limitação | Falha operacional |
|---|---|---|---|
| `POST /api/Auth/login` | 200 com `token` e `requiresPasswordChange`; 401 genérico para credenciais/status inválidos | 429 + `Retry-After` | 503 genérico; não verificar credenciais sem controle |
| Solicitação nos dois aliases de `/api/Email` | 202 com a mensagem neutra existente para admitida, inelegível e limitada | Mesmo 202; sem indicador de envio/cota por conta | Mesmo 202 neutro e métrica agregada; não enfileirar sem confirmação durável |
| Redefinição nos dois aliases | 204; 400 com códigos existentes; 409 para conflito de concorrência | 429 + `Retry-After` | 503 genérico |

Modelo novo para 429: `application/problem+json`, `status: 429`, `title: "Aguarde antes de tentar novamente."`, `code: "authentication_rate_limited"`, `retryAfterSeconds` inteiro e cabeçalho `Retry-After` em segundos. Não incluir e-mail, IP, ID, cota privada, existência ou elegibilidade. `Cache-Control: no-store` nas respostas dos fluxos de credenciais; não alterar a mensagem segura de 202 para indicar envio real.

Frontend: acrescentar categoria `rate_limited` e `retryAfterSeconds` opcional a `ApplicationError`; parsear `Retry-After` em segundos ou data HTTP e usar extensão numérica como alternativa validada. Propagar esses campos em normalização/apresentação, sem copiar corpos arbitrários. `Login.tsx` e `ResetPassword.tsx` exibem mensagem acessível e desabilitam submissão até o prazo, preservando a possibilidade de nova tentativa por ação do usuário. Sem cabeçalho válido, mostrar espera genérica sem loop automático. `ForgotPassword.tsx` continua exibindo resultado neutro.

## Dados e migrações

Criar uma migração aditiva `AuthenticationProtection`, acompanhada de snapshot e testes. Não reescrever migrações históricas.

| Estrutura | Campos e restrições essenciais |
|---|---|
| `AuthenticationThrottleBuckets` | PK `(Scope, KeyHash)`; `KeyHash` de 32 bytes; `WindowStartedAt`, `WindowEndsAt`, `Count >= 0`, `NextAllowedAt` e `NextEmissionAt` opcionais; índice de limpeza; remover somente após todos os prazos da linha vencerem |
| `AuthenticationProtectionCapacity` | PK do espaço de capacidade; `Allocated >= 0`; máximo conhecido por configuração consistente; linhas iniciais para seis espaços e fila; contador atualizado atomicamente com inserir/remover |
| `PasswordRecoveryJobs` | UUID `Id`; `DeliveryKeyHash` de entrega exata e `RecipientKeyHash` de cota normalizada; `PayloadCiphertext`, nonce de 12 bytes, tag de 16 bytes e `EncryptionKeyId`; `CreatedAt`, `ExpiresAt`, `NextAttemptAt`; estado fechado; `Attempts` de 0 a 3; `LeaseId`/`LeaseUntil`; `UserId` e `SessionVersion` opcionais após resolução; índice de seleção; unicidade de chave de entrega entre trabalhos ativos |
| `Usuarios.Email` | Índice único com igualdade exata atual; não alterar valores/casing nem criar campo de identidade normalizada |

Payload inicial contém e-mail fornecido. Após emissão contém e-mail, nome necessário ao template e código estável, todos cifrados. O usuário continua armazenando somente hash do código. A cifra autenticada usa AES-256-GCM, nonce aleatório novo em cada gravação e dados associados `versao-do-formato | Id-do-trabalho | finalidade`; alteração de ciphertext/nonce/tag/identificador deve falhar sem produzir plaintext. Usar a implementação do framework, com tag explícita de 16 bytes, conforme [AesGcm no .NET](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.aesgcm?view=net-8.0); não criar algoritmo próprio.

Chaves de 32 bytes em arquivo operacional versionado montado somente leitura: `activeKeyId` e mapa de chaves em Base64. Arquivo nunca entra no repositório, imagem, frontend ou banco. Todas as instâncias usam as mesmas chaves; manter antigas até não existir trabalho que dependa delas. HMAC de cotas usa outro segredo. Validação de inicialização verifica tamanho, chave ativa e capacidade de decriptar os trabalhos existentes; chave ausente impede disponibilidade da recuperação, sem descartar pedidos silenciosamente. Em testes, fornecer chaves sintéticas; não gerar chaves efêmeras na inicialização de produção.

Antes do índice de e-mail, consultar apenas contagem de duplicações exatas e abortar a migração com mensagem sanitizada se houver conflitos. Não excluir/mesclar/renomear usuários automaticamente. Resolver conflitos de dados é uma condição operacional de disponibilização caso sejam encontrados, com revisão do responsável, não uma decisão oculta da arquitetura.

Validar banco vazio e banco atualizado a partir das quatro migrações atuais, dados preservados, limites de capacidade e unicidade. `CredentialLifecycleMigrationTests.cs` hoje fixa a contagem de quatro migrações: atualizar essa caracterização e acrescentar teste da nova migração, sem simplesmente remover a verificação. `IntegrationWebApplicationFactory.RecreateDatabaseAsync` usa `EnsureCreated`; para testes de migração e desta persistência, usar caminho `MigrateAsync` explícito, sem presumir equivalência entre criação e histórico.

## Segurança, privacidade e permissões

### Confiança no IP e rede

Configurar `ForwardedHeadersOptions` explicitamente: limpar as listas implícitas e cadastrar somente o endereço estável do Caddy como `KnownProxies`, `ForwardLimit = 1`, cabeçalhos `X-Forwarded-For`/`X-Forwarded-Proto`. Ler apenas `HttpContext.Connection.RemoteIpAddress` após esse middleware. Caddy na borda não confia em cabeçalhos de cliente para formar a cadeia; verificar isso com teste efetivo de cabeçalho forjado. Não habilitar confiança ampla em toda rede privada.

Adicionar endereço estável do proxy e sub-rede parametrizados na rede Compose de produção, após verificar conflito local de endereçamento; backend não publica porta externa. Valores de rede do teste são fixos e isolados. Instâncias futuras compartilham cotas e recebem a mesma lista de proxies autorizados. Se houver outro proxy na borda real, documentar a cadeia e adaptar o limite/lista antes da publicação; não aceitar todos os remetentes para fazê-la funcionar. A interpretação confiável depende de remetentes conhecidos conforme a [documentação ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/proxy-load-balancer?view=aspnetcore-8.0).

Corrigir o helper de IP para usar o endereço resolvido, atualizando os testes que hoje legitimam cabeçalhos arbitrários. Mover a resolução para antes dos controles e da auditoria. Não logar cadeia encaminhada.

### Auditoria e segredos

Nas rotas de login, recuperação, alteração de senha, leitura/mutação de usuários e consultas de empréstimos abrangidas por esta especificação, auditoria registra somente finalidade conhecida, método, resultado HTTP e razão pública de cardinalidade limitada. Omitir body, query, headers, cookies, User-Agent, e-mail, IP, IDs pessoais e caminho interpolado. Para essas rotas, não usar o registro genérico com `UsuarioId`/`EnderecoIP`; substituir por evento agregado sanitizado. Para demais rotas, impedir captura de cookies e segredos e preservar o restante da política existente sem redesenhar o produto de auditoria.

Acrescentar teste de canários sensíveis que inspeciona saída de logs e banco de auditoria: código, token, e-mail, IP, JWT, Cookie e senha devem estar ausentes. Não logar exceções SMTP/criptográficas com destinatário ou payload; registrar categoria sanitizada. Filtrar também telemetria de credenciais nos caminhos alterados para omitir o ID do usuário. Não habilitar logging sensível de EF ou tracing de corpos. Dados de teste e artefatos precisam ser sintéticos; reduzir/omitir traces que gravariam respostas de login e códigos Mailpit.

### CSP no Caddy

Política inicial proposta, sujeita à validação obrigatória do inventário e do build final:

```text
default-src 'self'; script-src 'self'; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'; frame-src 'none'; worker-src 'none'
```

`script-src` não inclui `unsafe-inline`, `unsafe-eval`, wildcard, terceiros ou `blob:`. `env.js`, inicialização do tema e módulos compilados são locais. A exceção de **estilos** é restrita a CSS: React, componentes de sidebar, Radix e dimensões dinâmicas atuais utilizam estilos inline, que não são scripts. Não incluir `unsafe-inline` em scripts para acomodar CSS. A relação entre fontes de estilo e inline está documentada no [MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src-attr).

`img-src data:/blob:` cobre imagens incorporadas e blobs utilizados na interface/exportações; fontes PDF registradas apontam para arquivos locais. Download de blob não exige habilitar scripts de blob. Nenhuma dependência de Worker foi encontrada; manter `worker-src 'none'` até evidência de necessidade real. Inventariar os recursos efetivos do build e testar exportações antes de confirmar a política. Qualquer fonte adicional exige registro de necessidade e teste de bloqueio das demais, sem allowlist ampla preventiva.

Aplicar cabeçalho somente nas respostas do frontend, inclusive fallback SPA e documentos de erro do frontend. Não impor essa CSP ao Swagger/API como efeito incidental. `frame-ancestors 'self'` mantém compatibilidade com `X-Frame-Options SAMEORIGIN`. Não duplicar CSP independente no Nginx: políticas múltiplas se combinam e poderiam quebrar recursos. Usar o matcher do ramo frontend e escrita diferida quando necessária para sobrepor cabeçalho upstream, conforme [diretiva header do Caddy](https://caddyserver.com/docs/caddyfile/directives/header). Modo de relatório é etapa opcional de diagnóstico, nunca o estado final da #439.

### CORS

Remover `AllowAll`. Em produção e demais ambientes sem desenvolvimento explícito, não registrar/aplicar autorização CORS externa. Em Development, política `DevelopmentClients` recebe lista de URLs exatas configuradas, sem barra final, wildcard, `null`, caminhos ou credenciais na URL. Métodos: `GET`, `POST`, `PATCH`, `PUT`, `DELETE`, limitados ao uso caracterizado; preflight OPTIONS tratado pelo middleware. Cabeçalhos: `Authorization` e `Content-Type`. Expor somente `Retry-After` para permitir o feedback de 429 no frontend separado.

Aplicar middleware entre routing e autenticação/autorização, como orienta a [documentação ASP.NET Core de CORS](https://learn.microsoft.com/en-us/aspnet/core/security/cors?view=aspnetcore-8.0). Garantir `Vary: Origin` nas respostas da política dinâmica e testes de alternância de cache. Não usar `AllowCredentials`. Nos testes E2E existentes, permitir apenas `http://127.0.0.1:4173` e a origem específica da composição; E2E de produção usa a mesma origem real do proxy. CORS não significa rejeitar qualquer requisição HTTP de origem externa: significa não conceder ao navegador autorização para ler resposta entre origens; autenticação e autorização são verificadas independentemente.

## Falhas, observabilidade e operação

### Configuração

Seção `AuthenticationProtection` validada por `ValidateOnStart`; valores iniciais correspondem ao PRD:

| Chave | Valor inicial |
|---|---|
| `Login:AccountFailures` / `Login:IpFailures` / `Login:WindowSeconds` | 5 / 30 / 900 |
| `RecoveryRequest:RecipientRequests` / `RecoveryRequest:IpRequests` / `RecoveryRequest:WindowSeconds` | 3 / 20 / 3600 |
| `RecoveryRequest:CooldownSeconds` | 60 |
| `RecoveryCode:RecipientFailures` / `RecoveryCode:IpFailures` / `RecoveryCode:WindowSeconds` | 5 / 30 / 900 |
| `MaxBucketsPerScope` / `MaxActiveRecoveryJobs` | 10000 / 5000 |
| `CleanupIntervalSeconds` / `CleanupBatchSize` | 30 / 100 |
| `LockTimeoutSeconds` / `OperationTimeoutSeconds` | 2 / 5 |
| `Delivery:MaxAttempts` / `Delivery:LeaseSeconds` / `Delivery:SendTimeoutSeconds` | 3 / 60 / 15 |
| `Delivery:RequestMaxAgeSeconds` / `Delivery:PollSeconds` | 900 / 1 |
| `KeyHashSecretFile` / `RecoveryEncryptionKeysFile` | Caminhos absolutos de arquivos secretos montados somente leitura |
| `ForwardedHeaders:KnownProxies` / `ForwardedHeaders:ForwardLimit` | IP exato configurado do proxy / 1 |
| `Cors:DevelopmentOrigins` | Origens exatas do ambiente de desenvolvimento |

Exigir valores positivos e limites técnicos superiores documentados: no máximo 100.000 buckets por espaço, 10.000 trabalhos, janela entre 1 e 86.400 segundos, tentativa de entrega entre 1 e 3; demais prazos precisam respeitar validade do token e concessão maior que o prazo de envio. Divergência de parâmetros entre instâncias deve ser detectada por versão/hash da política registrado no espaço de capacidade; instância incompatível falha ao iniciar, sem operar com cotas inconsistentes. Exemplos `.env*` contêm apenas placeholders e caminhos, nunca chaves reais.

### Falhas e telemetria

Métricas propostas no `Meter` `LabSolos.AuthenticationProtection`: `access_denied_total`, `authentication_throttled_total`, `recovery_delivery_total`, `recovery_jobs_active`, `throttle_capacity_used`, `authentication_protection_failure_total` e histogramas de duração da admissão/entrega. Tags limitadas a operação, resultado e razão predefinida; sem e-mail, IP, UUID, HMAC ou ID pessoal. Testes usam `MeterListener`; logs de eventos sanitizados dão evidência operacional mesmo sem exportador novo.

Banco indisponível, deadlock ou bloqueio expirado gera resultado operacional fechado, sem autenticação ou mutação. Retentativa interna limitada para conflitos de alocação não repete automaticamente SMTP ou geração de código. Readiness deve distinguir configuração inválida e dependência indisponível; rota de health não expõe segredos ou estado individual. Saturação da fila/cotas e falha final de entrega devem ser observáveis, embora solicitação pública continue neutra.

A fila mantém payload até conclusão ou expiração, não como histórico permanente. Limpeza de trabalhos com concessão vencida permite retomada antes da validade; trabalhos expirados são cancelados e apagados. Código já consumido nunca é reemitido para recuperar um trabalho.

## Compatibilidade, disponibilização e reversão

1. Implementar primeiro testes e serviços isolados, acrescentar configuração sintética nas factories, seeds e Compose E2E. Documentar a política e a migração.
2. Fazer diagnóstico sanitizado de duplicações de e-mail e compatibilidade do esquema; gerar SQL idempotente e testar atualização/restauração em banco descartável. Não presumir que produção possui o mesmo histórico EF observado localmente.
3. Preparar segredos persistentes, rede/IP do proxy e parâmetros comuns antes da versão candidata. Não publicar API nova sem consumidor da confirmação de senha e das projeções mínimas.
4. Publicar backend/frontend coordenados durante janela controlada para a migração e ativar fila/cotas. Não permitir estratégia em que versão antiga e nova atendam autenticação ao mesmo tempo: a antiga contornaria os limites compartilhados.
5. Aplicar CSP no Caddy após inventário e suíte de proxy; verificar o cabeçalho da raiz e de cada rota SPA representativa. Produção mantém frontend/API na mesma origem.
6. Validar pós-publicação com contas de teste e volume controlado: autorização cruzada, login válido/limitado, recuperação, alteração de e-mail, cabeçalhos e métricas. Associar evidências a cada issue antes do encerramento. Atualizar manual/configuração e `CHANGELOG.md` na implementação.

Reversão preferida: correção à frente ou versão anterior **já compatível com os controles**, mantendo tabelas e segredos. Não voltar automaticamente à versão vulnerável nem apagar cotas para recuperar acesso. O `Down` da migração é destrutivo para pedidos/cotas e não deve ser usado em produção com tráfego; conservar schema aditivo. Backup de fila depende das chaves operacionais; recuperar somente banco sem chaves não restaura a entrega. Não reduzir `VersaoSessao`, reativar tokens antigos, remover volumes de produção ou habilitar CORS amplo como contorno. Mudança temporária para CSP em relatório é regressão de proteção e impede concluir #439.

## Estratégia TDD e pirâmide de testes

### RED

Antes de cada mudança de comportamento, registrar falha de teste relevante no estado atual. O resultado deve falhar pela ausência do controle, não por ferramenta, banco ou arquivo inexistente.

| Grupo | Primeiro teste que deve falhar | Infraestrutura e evidência |
|---|---|---|
| Autorização | Mentorado A consulta/PATCH de B e Mentor A consulta empréstimos do vínculo de B | `backend/Tests/Integration/UserResourceAuthorizationTests.cs`; resposta e banco antes/depois |
| E-mail próprio | PATCH de e-mail sem senha aceita hoje; candidato deve negar sem alterar estado | `UserProfileMutationTests.cs` + formulário Vitest |
| Login | Sexta tentativa após cinco falhas ainda retorna 401 hoje | `LoginThrottleTests.cs`, tempo controlado e PostgreSQL |
| Emissão | Solicitação repetida por alias gera novo token/envio hoje | `PasswordRecoveryAbuseTests.cs`, transporte simulado e trabalhador controlado |
| Validação | Sexta tentativa inválida e alternância de aliases sem bloqueio | `PasswordResetThrottleTests.cs`, forma legada incluída |
| IP e privacidade | Header forjado altera IP; canários de código/cookie aparecem na auditoria atual | `TrustedProxyTests.cs` e `AuthenticationAuditPrivacyTests.cs` |
| CSP/CORS | Ausência de CSP e autorização CORS para origem arbitrária | `BrowserSecurityHeadersTests.cs` + Playwright no Caddy efetivo |

Para infraestrutura nova de fila, começar por contratos unitários e testes relacionais de reserva/capacidade que compilam com interface mínima; depois observar falha comportamental de concorrência, persistência ou retomada. Não apresentar ausência de tabela como única evidência RED do requisito de negócio.

### GREEN

Implementar autorização e projeções antes dos consumidores; alteração atômica com senha antes do formulário. Introduzir cotas de PostgreSQL com relógio controlado, conexão entre instâncias e testes de capacidade. Conectar login/aliases somente após as garantias transacionais. Enfileirar de forma durável e testar entrega/repetição/cancelamento. Integrar proxy/CORS e adicionar classificação de 429. Cada etapa executa os testes focados até demonstrar o comportamento mínimo, sem enfraquecer assertivas do PRD.

### REFACTOR

Extrair predicados, respostas uniformes, portas de relógio/transporte e SQL comum sem alterar contratos. Rodar grupos afetados após refatoração e a suíte integrada antes da decomposição concluída/entrega. Registrar evidências RED/GREEN/REFACTOR por tarefa futura. Cobertura deve exercitar limite exato, concorrência e falha, não apenas presença de atributo ou espelhamento do código.

### Níveis e infraestrutura necessária

- **Unitários:** predicados por papel/vínculo, normalização, HMAC, calculadora de espera, configuração, cifragem adulterada, apresentação de 429 e limpeza de senha na UI.
- **Integração PostgreSQL:** HTTP real via `WebApplicationFactory`, contagem sob concorrência, duas factories no mesmo banco, reservas da fila, cap/limpeza, consumo de token, unicidade/migração, falha de conexão e cancelamento. Usar banco isolado por cenário para não contaminar cotas entre testes.
- **Contrato:** schemas das projeções, lista vazia 200, 404 uniforme, documento PATCH, `Retry-After`, aliases e versão anterior sem senha não aceita.
- **UI/E2E:** `frontend/e2e/authentication-protection.real.spec.ts` e `authentication-protection.ui.spec.ts` para contas sintéticas, fila Mailpit, espera e edição própria; adicionar esses arquivos às listas explícitas `realTestFiles`/`uiTestFiles` do Playwright. Descoberta por nome não basta, pois os projetos atuais selecionam arquivos explicitamente.
- **Proxy real:** criar `docker-compose-security-e2e.yml`, `infra/testing/Caddyfile.security-e2e` e projeto Playwright `security`, com `frontend/e2e/browser-security.real.spec.ts`. Reutilizar a política de cabeçalho de produção por trecho Caddy importado, sem copiar outra CSP divergente. Composição independente inclui PG15, backend Production com credenciais sintéticas, Mailpit, frontend apontando para `/api/` e Caddy com TLS local de teste. Instalar CA apenas no transporte SMTP/teste; navegador de teste pode aceitar certificado local na configuração do projeto. Nada disso relaxa TLS em produção.
- **Acessibilidade:** teclado, foco e anúncio de mensagens; verificações axe nas telas alteradas e conferência manual de leitor de tela. Não anunciar contador regressivo a cada segundo.

A fixture atual usa PostgreSQL **16**, enquanto produção e Compose E2E usam **15**. Acrescentar fixture específica PG15 para SQL de cotas/fila/migração ou parametrizar essa infraestrutura sem remover a cobertura existente. Trabalhador deve ser substituível por execução controlada nas factories para evitar corridas durante asserts; nos E2E, aguardar entrega via polling limitado do Mailpit, sem pausa fixa.

Arquivos adicionais planejados: `backend/Tests/Security/UserResourceAccessTests.cs`, `ThrottleKeyFactoryTests.cs`, `AuthenticationProtectionOptionsTests.cs` e `RecoveryPayloadProtectorTests.cs`; `backend/Tests/Integration/SharedAuthenticationThrottleTests.cs`, `RecoveryDeliveryWorkerTests.cs` e `AuthenticationProtectionMigrationTests.cs`; no frontend, ampliar testes existentes de `applicationError`, `normalizeError`, `presentError`, `Login`, `ResetPassword`, `Users` e `Class` e criar `ProfileContactForm.test.tsx`. A suíte do trabalhador cobre atraso na fila e espaçamento real entre emissões, coalescência, reinício, concessão vencida, SMTP duplicado, expiração, troca de e-mail e adulteração do payload. A suíte distribuída cobre alocação versus limpeza, políticas incompatíveis, cancelamento e capacidade global.

## Esteira de qualidade

### Auditoria da linha de base

A observação antiga na skill está desatualizada: `backend/backend.sln` **inclui** `Tests.csproj`; `frontend/package.json` **tem** scripts Vitest/Playwright; `container-ci.yml` roda em PR para `develop` nos eventos opened/synchronize/reopened/edited/ready_for_review, além de `merge_group` e execução manual. `codeql-quality.yml` também valida PR, push em develop e merge_group. `security-dependencies.yml` tem filtros de caminhos no PR. `container-release.yml` executa após fechamento de PR para main ou execução manual; é publicação, não gate pré-merge.

`Quality gate` depende de frontend, backend, auth-e2e, workflow-quality, quality-baseline e container-scan e rejeita job ausente/cancelado/ignorado/falho. Sua obrigatoriedade na proteção de branch remota não foi consultada nesta criação; existência do workflow não comprova configuração remota obrigatória.

### Comandos e ações

Comandos relativos partem da raiz, exceto os de npm, executados em `frontend`. Em PowerShell Windows usar `npm.cmd`/`npx.cmd`; em CI Linux, `npm`/`npx`.

| Área | Comando local | Verificação de CI | Lacuna/ação |
|---|---|---|---|
| Backend: restauração | `dotnet restore backend/backend.sln --locked-mode` | Restauração existe no backend-quality; CodeQL usa locked-mode | Manter locks; ajustar backend-quality para modo travado quando mudar dependências |
| Backend: compilação | `dotnet build backend/backend.sln --no-restore -c Release --nologo --disable-build-servers` | backend-quality e CodeQL | Existente |
| Backend: suíte completa | `dotnet test backend/backend.sln --no-build --no-restore -c Release --nologo --disable-build-servers` | backend-quality | Docker obrigatório para integração; ampliar PG15 e casos de proteção |
| Backend: foco proposto | `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~UserResourceAuthorizationTests|FullyQualifiedName~UserProfileMutationTests|FullyQualifiedName~LoginThrottleTests|FullyQualifiedName~PasswordRecoveryAbuseTests|FullyQualifiedName~PasswordResetThrottleTests|FullyQualifiedName~AuthenticationProtectionMigrationTests|FullyQualifiedName~TrustedProxyTests|FullyQualifiedName~AuthenticationAuditPrivacyTests|FullyQualifiedName~BrowserSecurityHeadersTests"` | Adicionar execução focada para diagnóstico; suíte completa continua obrigatória | Classes novas explicitamente planejadas; hoje não há esses testes |
| Frontend: dependências | `npm.cmd ci` | frontend-quality e auth-e2e | Existente; Node CI20 e local24 devem ser distinguidos nas evidências |
| Frontend: unitários | `npm.cmd run test -- --run` | frontend-quality | Ampliar erros, formulário e projeções |
| Frontend: lint/build | `npm.cmd run lint` e `npm.cmd run build` | frontend-quality | Existente |
| Descoberta de E2E | `npm.cmd run test:e2e:list -- --project=real` | Acrescentar conferência de arquivos novos | Comando atual validado; 14 testes reais existentes em 5 arquivos |
| E2E existente | `docker compose -f docker-compose-e2e.yml up -d --build --wait`; em frontend, `npm.cmd run test:e2e -- --project=real` e `--project=ui` | auth-e2e | Configurar CORS explícito e acrescentar specs às listas do Playwright |
| Novo E2E de proxy | `docker compose -p lab-solos-security-e2e -f docker-compose-security-e2e.yml up -d --build --wait`; em frontend, `npm.cmd run test:e2e -- --project=security` | Criar job `browser-security` em container-ci e adicioná-lo a `needs` e ao avaliador do Quality gate | Composição, projeto e job novos; não existem ainda |
| Migração: SQL revisável | `dotnet tool restore`; `dotnet ef migrations script --idempotent --project backend/LabSolos-Server-DotNet8/LabSolos-Server-DotNet8.csproj --startup-project backend/LabSolos-Server-DotNet8/LabSolos-Server-DotNet8.csproj --context AppDbContext --output .tmp/authentication-protection.sql` | Testes relacionais da migração | Criar `.tmp` se ausente; gerar/revisar somente durante implementação; não aplicar em produção nesta skill |
| Contratos de gate | `python -m unittest discover -s .github/scripts/tests -p "test_quality_gate.py" -v` | workflow-quality | Executado nesta análise: 4 testes aprovados; ampliar para o novo job |
| Composes | `docker compose --env-file .env.prod.example -f docker-compose-prod.yml config --quiet`; `docker compose -f docker-compose-e2e.yml config --quiet`; novo arquivo security-e2e com `config --quiet` | Acrescentar testes de configuração para chaves, proxy e recursos | Exemplos permanecem sintéticos; não imprimir configuração real preenchida |
| Segurança de dependências | `npm.cmd audit --audit-level=high`; auditoria NuGet conforme security-dependencies | Gates existentes com alta/crítica; Trivy por imagem/plataforma | Sem novas dependências previstas para cifra/SQL; manter gate ao alterar manifestos |

No novo job de proxy, fixar ambiente e portas, sem depender de variável manual para aplicar CSP. Registrar artifacts sanitizados em sucesso/falha e limpeza da **composição descartável nomeada**, nunca de produção. Incluir teste do workflow para assegurar execução em PR/merge_group e dependência obrigatória do job no gate; pós-merge não substitui essa validação.

### Evidências desta análise

- .NET SDK local: 8.0.419; Node local: 24.21.0; manifestos/workflows auditados.
- Descoberta Playwright `real`: 14 testes em 5 arquivos; descoberta não equivale a execução.
- `test_quality_gate.py`: 4 testes executados e aprovados.
- Docker CLI instalado, mas daemon local não respondeu (`dockerDesktopLinuxEngine` indisponível). Integração PostgreSQL, Composes e execução E2E não foram executadas nesta skill.
- Não foram executados restore/build/suíte completa, scans ou validação pós-publicação; não há evidência de implementação verde dos requisitos novos. A validação documental de rastreabilidade é separada dos testes de produto.

## Matriz de rastreabilidade

### Requisitos

| Requisito | Componentes | Testes | Evidência esperada |
|---|---|---|---|
| RF-001 | Política de recurso, Usuarios/Emprestimos e projeções | Integração/contrato de titular, Administrador e dois vínculos | Dados autorizados e 404 uniforme |
| RF-002 | Listagens por tipo, dependentes, consultas por responsável | Integração/consumidores | 403 de gestão e lista vazia 200 |
| RF-003 | Serviço de perfil, PATCH transitório, índice Email e formulário | Integração/migração/Vitest/E2E | Mutação atômica e confirmação da senha |
| RF-004 | Respostas uniformes, adaptadores e ErrorFeedback | Contrato/UI | 401/403/404 e retorno autorizado |
| RF-005 | Cotas PostgreSQL e AuthController | Unitário/integração concorrente | Limiares, renovação e sem contorno |
| RF-006 | ProblemDetails429 e normalização/apresentação de erros | Contrato/Vitest/E2E | Espera coerente e mensagem neutra |
| RF-007 | Serviço de admissão, cotas e fila | PostgreSQL/HTTP/Mailpit | 202 uniforme e nenhum envio indevido |
| RF-008 | Cotas de validação e CredentialService | Integração de aliases/legado | Tentativas compartilhadas e 429 |
| RF-009 | Trabalhador, transporte e ciclo de credenciais | Integração/retomada/E2E | Código preservado, expiração, uso único e revogação |
| RF-010 | Caddy, inventário de recursos e composição security-e2e | Navegador/headers/exportações | CSP em aplicação e bloqueios corretos |
| RF-011 | Política por ambiente e proxy | HTTP/preflight/navegador | Mesma origem produtiva e allowlist dev |
| RNF-001 | Projeções, cifra, auditoria e telemetria | Canários sensíveis/contrato | Ausência de dados pessoais/segredos nos registros |
| RNF-002 | Capacidade, transações, aliases e proxy confiável | PG15, concorrência, duas instâncias e headers forjados | Cotas/capacidade efetivas |
| RNF-003 | Options, capacidade, métricas e documentação | Inicialização/MeterListener/workflow | Configuração inválida negada e observabilidade sanitizada |
| RNF-004 | Contratos existentes, formulário e feedback | Regressão/Vitest/E2E/axe | Jornadas preservadas e acessíveis |
| RNF-005 | Caddy/CORS e composição real | HTTP/browser | Cabeçalhos efetivos por ambiente |

### Critérios de aceitação

| Critério | Verificação técnica planejada | Nível e artefato |
|---|---|---|
| CA-001 | Próprio perfil e gestão administrativa | UserResourceAuthorizationTests; HTTP200 |
| CA-002 | Acesso cruzado versus inexistente | Mesmo teste; comparar status/corpo404 |
| CA-003 | Mentor vinculado e resumo do responsável | Projeção/schema e E2E do histórico |
| CA-004 | Tipo, responsável forjado e coleções vazias | Integração de listagens + adaptadores |
| CA-005 | Nome/telefone próprios e status administrativo | UserProfileMutationTests; estado persistido |
| CA-006 | PATCH cruzado e documento misto | Mesma classe; comparar todas as colunas |
| CA-007 | E-mail, senha atual, unicidade e recuperação seguinte | Integração, migração e E2E de perfil |
| CA-008 | Tokens ausentes/inválidos e troca obrigatória | Regressão de autorização/session-version |
| CA-009 | Sexta falha por conta e 31ª por IP | LoginThrottleTests com relógio controlado |
| CA-010 | Renovação e sucesso sem limpar IP | Mesma classe; verificar Retry-After |
| CA-011 | Identificador inexistente, caixa/espaços e alternância | LoginThrottleTests + normalização unitária |
| CA-012 | Independência de dimensões e NAT | Integração de contas/IPs sintéticos |
| CA-013 | 403/404/429, teclado, retorno e espera | Vitest, UI E2E e axe |
| CA-014 | Repetição/alias dentro de 60s | PasswordRecoveryAbuseTests; trabalho e envio simulado |
| CA-015 | 3/20 por hora, capacidade e renovação | Mesma classe; relógio controlado |
| CA-016 | Conta habilitada/inativa/inexistente e resposta202 | HTTP equivalente, fila e Mailpit |
| CA-017 | 5/30 falhas, alias e código sem e-mail | PasswordResetThrottleTests; HTTP429 |
| CA-018 | Expiração15min, uso único e sessões revogadas | RecoveryTokenTests e credenciais integradas |
| CA-019 | Limitação de recuperação sem bloquear login | Integração entre namespaces e código vigente |
| CA-020 | CSP raiz/SPA e recurso externo bloqueado | browser-security.real.spec.ts no Caddy |
| CA-021 | Jornadas, recursos locais e exportações sob CSP | Mesmo projeto security; inventário/evidências |
| CA-022 | CORS produtivo externa/null/semOrigin | BrowserSecurityHeadersTests + proxy |
| CA-023 | Preflight dev, métodos/headers e Vary | Integração HTTP e teste de cache por origem |
| CA-024 | Origem permitida sem token ou sem permissão | HTTP401/404 em origem permitida |
| CA-025 | Corridas, capacidade, limpeza e IP forjado | PG15, duas factories e TrustedProxyTests |
| CA-026 | Canários em logs, auditoria, fila e métricas | AuthenticationAuditPrivacyTests e cifra |
| CA-027 | Inicialização/configuração, docs e publicação | Testes de options/workflow + roteiro pós-publicação |
| CA-028 | Objetos, base, formulários e incorporação | Navegador com violações controladas |

Os critérios novos não estão aprovados por execução: a matriz descreve o plano verificável para as tarefas de implementação.

## Alternativas e decisões

| Decisão | Alternativas | Recomendação | Escolha confirmada | Consequências |
|---|---|---|---|---|
| Estado distribuído de cotas | Memória local; Redis; PostgreSQL | PostgreSQL existente | Usuário: “Usar PostgreSQL existente (recomendado)” | Migração e consultas transacionais; memória local não satisfaz múltiplas instâncias; Redis não será adicionado |
| Entrega de recuperação | SMTP na requisição; fila em memória; fila durável | Fila durável PostgreSQL | Usuário: “Fila durável no PostgreSQL (recomendado)” | Cifragem/chaves operacionais e retomada; HTTP não espera SMTP; duplicação limitada de entrega continua possível |
| Cifragem | Algoritmo próprio; DataProtection com novo armazenamento compartilhado; AES-GCM do framework com chaves operacionais | Primitiva nativa com arquivo secreto versionado | Definição técnica dentro da fila cifrada aprovada | Sem pacote novo ou algoritmo próprio; chave persistente compartilhada é dependência de operação |
| Normalização | Alterar identidade das contas; normalizar apenas cotas | Somente cotas | Preservação técnica dos contratos do PRD | Sem fusão de usuários/casing; contas equivalentes podem compartilhar orçamento |
| Projeção de Mentor | DTO completo; novo endpoint; projeção autorizada na rota existente | Projeção mínima e adaptador dedicado | Aplicação da matriz aprovada no PRD | Consumidor de histórico atualizado junto da API |
| CSP e CSS | Remodelar todos os estilos; exceção inline só de estilos | Exceção CSS justificada, scripts estritos | Aplicação do requisito de compatibilidade do PRD | Aceite depende do navegador e inventário; não ampliar scripts |
| Comprovação de produção | Apenas TestServer; E2E atual em portas separadas; composição com proxy real | Acrescentar proxy real | Definição de validação do RNF-005 | Novo job pré-merge e teste da dependência no gate |

As duas decisões arquiteturais materiais foram consultadas via skill `grilling`, conforme etapa 10 de `create-techspec`; respostas explícitas encerraram a fronteira de alternativas de infraestrutura. Não houve dispensa de validação nem reabertura das regras de produto aprovadas.

## Riscos e mitigação

| Risco | Mitigação/condição de conclusão |
|---|---|
| Custo de manter locks durante verificação de senha | Medir duração/pool e filas por IP; prazos limitados; bloquear somente dimensões afetadas, nunca todas as contas globalmente |
| Cancelamento/queda antes de registrar falha | Tentativa iniciada precisa concluir contagem sob prazo interno; falha do processo libera lock, não autentica cliente; testar carga/cancelamento |
| Saturação deliberada de identificadores ou fila | Capacidade distribuída exata, expiração e recusa fechada; observar métricas; não expulsar janelas ativas |
| SMTP aceitou e o processo caiu antes da confirmação | Repetir apenas código estável e no máximo3 tentativas; registrar limitação de entrega duplicada |
| Chave ausente/rotacionada incompatível | Validar arquivos e trabalhos existentes; reter chaves anteriores; recuperação indisponível de forma observável, sem apagar pedidos |
| Payload cifrado em backup | Proteger backup e chave separadamente; retenção curta no banco ativo não elimina cópias antigas |
| Duplicações exatas de e-mail legadas | Diagnóstico por contagem e aborto seguro; decisão sobre registros pelo responsável, sem mescla automática |
| Cota por identificador pode induzir espera na vítima | Sem desativação/espera renovada; namespace separado da recuperação; valores configuráveis aprovados |
| CSP quebra recurso dinâmico/PDF | Inventário, exportações e teste de console sob política aplicada antes da publicação |
| Rede publicada difere da composição documentada | Verificar cadeia real e endereço confiável no roteiro de disponibilização; não habilitar confiança universal |
| Gate existe sem proteção remota de branch | Registrar estado remoto como não verificado e consultar/confirmar obrigatoriedade durante contribuição autorizada |
| Banco/integração não disponíveis localmente nesta análise | Não afirmar execução; CI e ambiente com Docker devem fornecer as evidências antes de concluir implementação |

## Perguntas abertas

Nenhuma decisão arquitetural bloqueante após as duas confirmações do usuário. Restam levantamentos de implementação e disponibilização, com tratamento definido:

- Inventário final de recursos do build e eventuais ajustes específicos de CSP, demonstrados pelo projeto security.
- Contagem sanitizada de duplicações exatas de e-mail no banco alvo; se positiva, resolver dados antes de migrar, com revisão explícita do responsável.
- Endereço/sub-rede do proxy e existência de outra camada de proxy no deployment real, sem presumir que o host local representa produção.
- Medições do custo transacional, tempos HTTP e entrega; ajustar somente parâmetros configuráveis com evidências, preservando cotas de produto aprovadas ou submetendo sua revisão.
- Confirmação da obrigatoriedade remota dos checks na branch de contribuição, quando houver autorização de contribuição externa.

Essas condições não autorizam desativar limites, ampliar origens ou declarar as cinco issues resolvidas sem implementação e evidências.
