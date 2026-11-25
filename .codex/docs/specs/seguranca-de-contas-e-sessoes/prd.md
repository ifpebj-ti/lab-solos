# PRD: Segurança de contas e sessões

- Status: rascunho
- Responsável: não definido
- Atualizado em: 2026-11-15
- Validação de descoberta: dispensada-pelo-usuário

## Contexto e problema

Cadastro, filas de aprovação e decisões precisam aplicar a mesma política de tipo de conta, papel, estado e vínculo. As respostas públicas de cadastro precisam orientar a correção sem divulgar informações de terceiros. No navegador, o produto precisa demonstrar quando uma sessão perde acesso. A troca de e-mail afeta a identificação e a recuperação da conta, com impacto para o titular e para o administrador que atua sobre outro perfil.

O cadastro, as filas e as decisões estão representados em `UsuariosController.cs`, `UsuarioService.cs`, `Register.tsx` e `RegistrationRequests.tsx`. O acesso, a sessão e a edição de perfil têm contexto em `Program.cs`, `AuthController.cs`, `UserProfileUpdateService.cs` e `ProfileContactForm.tsx`.

| Issue | Requisitos | Critérios |
| --- | --- | --- |
| [#469 — Papéis e aprovação de contas](https://github.com/ifpebj-ti/lab-solos/issues/469) | RF-001, RF-002, RF-003 | CA-001, CA-002, CA-003, CA-004 |
| [#479 — Respostas públicas de cadastro](https://github.com/ifpebj-ti/lab-solos/issues/479) | RF-004, RNF-001 | CA-001, CA-005 |
| [#482 — Encerramento e proteção de sessão](https://github.com/ifpebj-ti/lab-solos/issues/482) | RF-005, RF-006, RNF-001 | CA-006, CA-007, CA-008 |
| [#484 — Autorização por padrão](https://github.com/ifpebj-ti/lab-solos/issues/484) | RF-007, RNF-002 | CA-009, CA-010 |
| [#485 — Proteção de alterações de e-mail](https://github.com/ifpebj-ti/lab-solos/issues/485) | RF-008, RF-009, RNF-001 | CA-011, CA-012, CA-013 |

## Objetivo e métricas de sucesso

Validar todos os casos da matriz aprovada de tipo, papel, vínculo, estado, ação e perfil. As evidências devem demonstrar consistência entre fila e decisão, recusa de sessões encerradas ou expiradas e, para cada troca de e-mail concluída na suíte, a trilha da mudança e os avisos nos dois endereços de teste.

## Usuários e jornadas

- Pessoa que solicita cadastro público e acompanha o estado inicial da conta.
- Mentor ou administrador que analisa solicitações dentro da própria autoridade.
- Titular que inicia ou encerra uma sessão, altera a senha ou confirma a troca do próprio e-mail.
- Administrador autorizado a conceder privilégios ou gerir endereços de terceiros, com registro auditável.

## Escopo

### Incluído

- Política de cadastro, elegibilidade da fila e decisão, coerência dos dados da conta e concessão administrativa auditada.
- Contrato neutro para vínculo e unicidade no cadastro público.
- Logout com revogação no servidor, expiração, renovação, proteção do navegador e limites na troca de senha.
- Matriz de rotas, exceções públicas, revisão das políticas efetivas e compatibilidade da autenticação com .NET 8.
- Alteração própria e administrativa de e-mail, avisos, auditoria e carência do endereço substituído.

### Fora de escopo

- MFA, SSO, painel geral de sessões e reformulação da recuperação de senha.
- Conciliação de contas já existentes, tratada no [PRD de conciliação operacional](../conciliacao-operacional/prd.md).

## Requisitos funcionais

### RF-001 — Cadastro conforme a política de contas

O cadastro público aceita os papéis Mentor e Mentorado, ambos do tipo Acadêmico e com estado inicial Pendente. Mentor dispensa responsável. Mentorado precisa indicar um Mentor ou Administrador habilitado como responsável. O servidor deriva o papel e o estado inicial segundo essa política, valida o vínculo exigido e preserva a coerência do registro.

### RF-002 — Elegibilidade comum à fila e à decisão

Listagem, aprovação e rejeição devem aplicar a mesma regra de elegibilidade para o papel, a autoridade do aprovador, o vínculo e o estado atual da solicitação. A fila apresenta tipo e papel efetivo de cada solicitação disponível para decisão. Se a elegibilidade mudar antes da decisão, a decisão deve ser recusada e o estado atual, preservado.

Administrador habilitado pode decidir solicitações de Mentor e Mentorado. Mentor habilitado pode decidir solicitações de seus mentorados vinculados. Aprovar habilita a conta. Rejeitar desabilita a conta.

### RF-003 — Concessão administrativa com autoria

A concessão de privilégio administrativo deve ocorrer em fluxo autenticado e auditado por outro Administrador habilitado. O evento de auditoria deve permitir identificar ator, conta afetada e privilégio concedido.

### RF-004 — Resposta pública neutra

Falhas equivalentes na verificação do responsável retornam o mesmo status, código e mensagem pública. Conflitos de unicidade retornam orientação genérica, de acordo com o contrato público. Falhas de vínculo ou unicidade preservam os registros existentes, e cadastros válidos seguem a jornada prevista.

O cadastro mantém os campos atuais e a resposta de sucesso `201`. Se o formulário anterior enviar um responsável no cadastro de Mentor, o servidor aceita o campo e descarta o valor. Preservar contas existentes e encaminhar divergências de tipo, papel ou vínculo para revisão administrativa na conciliação.

### RF-005 — Ciclo de sessão verificável

O logout encerra a sessão no servidor e na interface. A sessão encerrada ou expirada perde acesso a operações autenticadas e à renovação. O produto documenta as condições de duração e renovação e informa a necessidade de nova autenticação quando aplicável. Troca ou redefinição de senha segue a revogação global já prevista.

### RF-006 — Proteção das operações no navegador

A autenticação do navegador usa cookie com `HttpOnly`, `Secure` e política `SameSite` explícita. Operações autenticadas que alteram estado exigem a proteção contra CSRF definida para a jornada. A alteração de senha respeita o limite de tentativas documentado e apresenta resposta de limitação compreensível.

### RF-007 — Autorização por padrão

Rotas são protegidas por padrão. A matriz revisada indica exceções públicas, requisitos por perfil e restrições de sessão. Toda política declarada deve ter seu uso efetivo ou a decisão sobre política sem uso registrada. A matriz de acesso é referência para a publicação por meio do proxy.

### RF-008 — Autorização da troca de e-mail

A alteração pelo titular exige a confirmação da senha atual já prevista. A alteração administrativa exige permissão e a confirmação definida para esse fluxo. O endereço de recuperação acompanha a alteração efetivada. Falha de autorização, confirmação ou validação preserva o endereço anterior.

### RF-009 — Avisos, auditoria e carência do endereço anterior

Uma troca efetivada gera avisos para os endereços anterior e novo e um evento de auditoria da alteração. O endereço substituído obedece à regra de carência documentada, inclusive quando se torna novamente elegível conforme a política aprovada.

## Requisitos não funcionais

### RNF-001 — Privacidade e comunicação de estados

Respostas públicas e evidências sanitizadas devem omitir informações de terceiros e material de autenticação. A interface identifica falha de validação, limitação ou necessidade de reautenticação com mensagem textual utilizável.

### RNF-002 — Compatibilidade da autenticação

O conjunto de dependências de autenticação deve ser compatível com .NET 8. Emissão e validação de sessão devem usar uma configuração coerente, inclusive quanto à codificação da chave. A CI deve cobrir os contratos de autenticação e autorização previstos na matriz.

## Critérios de aceitação

### CA-001 — Cadastro público válido (RF-001, RF-004)

- Dado um tipo de conta público e um vínculo válido quando exigido
- Quando a pessoa conclui o cadastro
- Então a conta é criada com tipo, papel e estado inicial coerentes com a matriz aprovada

### CA-002 — Cadastro fora da política (RF-001, RF-003)

- Dada uma solicitação de cadastro incompatível com a política pública de tipo, vínculo ou papel
- Quando o servidor avalia a solicitação
- Então o cadastro é recusado conforme o contrato e nenhuma conta ou concessão incompatível é criada

### CA-003 — Fila e decisão coerentes (RF-002)

- Dados um aprovador, solicitações elegíveis, inelegíveis e uma solicitação cuja elegibilidade muda antes da decisão
- Quando a fila é aberta e as decisões são avaliadas
- Então a fila mostra tipo e papel efetivo apenas das elegíveis, um aprovador sem elegíveis recebe lista vazia, e cada decisão só altera o estado se a solicitação permanecer elegível para aquele aprovador

### CA-004 — Privilégio administrativo auditável (RF-003)

- Dadas uma operação administrativa permitida e uma operação equivalente sem autoridade
- Quando as duas concessões são avaliadas
- Então apenas a permitida altera o papel e produz evento de concessão com ator, conta afetada e privilégio

### CA-005 — Falhas públicas equivalentes (RF-004, RNF-001)

- Dados casos sintéticos equivalentes de vínculo inválido e de conflito de unicidade
- Quando cada solicitação é validada
- Então os resultados de cada classe têm o mesmo status, código e mensagem pública, sem dados de terceiros ou alteração de registros

### CA-006 — Encerramento, expiração e renovação (RF-005)

- Dadas sessões ativa, elegível para renovação, encerrada e expirada
- Quando cada sessão acessa uma operação autenticada ou solicita renovação
- Então o resultado segue a regra publicada, sessões encerradas ou expiradas são recusadas pelo servidor e a interface pede nova autenticação quando necessário

### CA-007 — Sessão e alteração de estado no navegador (RF-006, RNF-001)

- Dado um navegador autenticado no ambiente de teste
- Quando a sessão é estabelecida e são exercitados os cenários com e sem a proteção CSRF exigida
- Então o cookie apresenta as proteções especificadas e somente o cenário que satisfaz as verificações pode alterar o estado

### CA-008 — Limite de tentativas de alteração de senha (RF-005, RF-006, RNF-001)

- Dadas tentativas sintéticas abaixo e acima do limite e uma alteração autorizada na janela permitida
- Quando a troca de senha é avaliada
- Então a limitação é comunicada sem modificação de senha e a troca concluída exige nova autenticação das sessões anteriores

### CA-009 — Matriz de rotas e papéis (RF-007)

- Dadas as rotas inventariadas, incluindo uma rota protegida e uma exceção pública
- Quando a matriz aplica perfis anônimo, autorizado, sem permissão e com sessão restrita quando pertinente
- Então os resultados correspondem à matriz e a revisão documenta o uso ou a decisão sobre cada política declarada

### CA-010 — Compatibilidade de autenticação (RNF-002)

- Dado o conjunto de dependências e a configuração de autenticação para .NET 8
- Quando a CI valida autenticação e autorização
- Então a sessão emitida no ambiente de teste é reconhecida pela validação e os casos de sessão inválida ou de acesso indevido são recusados

### CA-011 — Troca própria e administrativa de e-mail (RF-008, RNF-001)

- Dados casos de troca própria e administrativa com e sem as autorizações e confirmações exigidas
- Quando as solicitações são avaliadas
- Então somente os casos válidos alteram o endereço de recuperação e as falhas informam o estado sem expor material de reautenticação

### CA-012 — Comunicação ao titular (RF-009, RNF-001)

- Dada uma alteração de endereço efetivada com caixas de e-mail de teste
- Quando o resultado da troca e o histórico são conferidos
- Então os dois endereços recebem aviso e o evento identifica a alteração e sua autoria sem material de autenticação

### CA-013 — Carência de endereço (RF-009)

- Dado um endereço substituído e os limites documentados de carência
- Quando se avalia seu novo uso durante e após o período
- Então cada resultado segue a elegibilidade aprovada, preservando as demais validações de unicidade e vínculo

## Estratégia de validação

Automatizar as matrizes de cadastro, decisão e autorização, as transições de sessão, as respostas equivalentes e os limites. Validar o comportamento de navegador e o fluxo de e-mail em ambiente controlado com contas, sessões e caixas de teste. Registrar a matriz executada, os resultados sanitizados e as políticas aprovadas de sessão, de e-mail e de exceções públicas.

## Dependências e riscos

- [Proteção de acesso, autenticação e frontend](../protecao-acesso-autenticacao/prd.md) é referência para autorização por recurso, recuperação vigente, limitação de login, CORS e reautenticação do titular na troca de e-mail.
- [Ciclo de vida de autenticação e credenciais](../ciclo-vida-autenticacao-credenciais/prd.md) define troca obrigatória, política de senha e revogação global após troca ou redefinição. [Cadastro e contratos de dados de usuário](../contratos-dados-usuario/prd.md) orienta a compatibilidade do cadastro.
- Alinhar as exceções com [Proteção da API e do proxy](../protecao-de-api-e-proxy/prd.md) e a autoria dos eventos com [Notificações e auditoria](../notificacoes-e-auditoria/prd.md).
- A revisão de papéis deve observar a regra de manter ao menos um administrador habilitado, especificada em [Integridade de produtos, lotes e histórico de saída](../integridade-de-produtos-e-lotes/prd.md).
- Divergências em contas existentes podem afetar a aprovação e a continuidade administrativa. A definição de tratamento de sessões anteriores e falhas de entrega afeta a transição para o novo ciclo.

## Decisões complementares

As escolhas desta etapa constam no [registro local de decisões](../decisoes-de-planejamento.md#contas-e-publicação).

## Decisões da validação de descoberta

| Decisão | Recomendação | Resposta confirmada | Impacto |
| --- | --- | --- | --- |
| Dispensa do grilling | Usar as issues e o contexto versionado como base | Dispensada pelo usuário | Matrizes e parâmetros pendentes de confirmação constam nas perguntas abertas |
| Cadastro, aprovação e concessão (#469) | Usar a matriz de papéis, vínculo e autoridade de RF-001 a RF-003 | Aprovada pelo usuário | O cadastro de Mentor passa a dispensar responsável. |
| Contrato público de cadastro (#469, #479) | Preservar compatibilidade e contas existentes, com respostas públicas uniformes por classe | Aprovado pelo usuário conforme RF-004 e o [contrato técnico](./techspec.md#contrato-público-de-cadastro-aprovado) | Libera a implementação da matriz e das respostas públicas. |
