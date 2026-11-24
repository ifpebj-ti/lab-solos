# Especificação técnica de segurança de contas e sessões

- **Status** — Rascunho, validação de design pendente
- **PRD** — [Segurança de contas e sessões](prd.md)
- **Atualizado em** — 2026-11-15
- **Validação de design** — pendente. A validação de descoberta foi dispensada pelo usuário no PRD.

## Resumo técnico

Centralizar a política de contas usada pelo cadastro, pelas filas e pelas decisões. Verificar a sessão no servidor em cada operação autenticada e coordenar a transição do navegador para um cookie emitido pelo servidor. Aplicar autorização por padrão e vincular a troca de e-mail aos avisos, à carência do endereço e à trilha de auditoria. A política de contas, o transporte e a persistência das sessões e os parâmetros da troca de e-mail dependem das decisões documentadas abaixo.

## Estado atual

- `UsuariosController` recebe cadastro público, valida referências e persiste a conta como pendente. O mapeamento ainda usa informações de nível do DTO. A fila geral usa o estado pendente e as ações de dependentes têm verificações específicas. As respostas de vínculo distinguem categorias internas que precisam da mesma mensagem pública. `CreateAccount.tsx` consome o cadastro público, e `RegistrationRequests.tsx` consome a fila e os comandos de decisão.
- `Program.cs` usa `JwtBearer` e valida status habilitado e `VersaoSessao`. A emissão em `JwtService` usa ASCII e a validação usa UTF-8. O manifesto usa `Microsoft.AspNetCore.Authentication.JwtBearer` 8.0.32 com `net8.0`. `CredentialService` incrementa a versão na troca e na redefinição da senha. `AuthController` expõe login e troca de senha. A sessão do frontend usa cookies gravados por JavaScript e envia a credencial via `Authorization` nas integrações.
- `Program.cs` configura `DefaultPolicy` e políticas nomeadas. Há ações sem metadados de autorização e a configuração ainda carece de `FallbackPolicy`. A política de troca obrigatória permite somente as operações previstas para essa sessão restrita.
- `UserProfileUpdateService` controla campos, confirma senha na troca própria, trata conflito de e-mail em transação e cancela a recuperação pendente associada ao endereço anterior. A troca administrativa usa a autorização do perfil. Os avisos aos dois endereços, a carência e a confirmação administrativa adicional dependem deste desenho.

## Arquitetura proposta

### Fluxos e componentes

1. **Cadastro e aprovação.** `UsuarioService` e `UsuariosController` passam a usar uma política de domínio consultável pela fila e pela decisão. A matriz versionada identifica tipo, papel derivado, estado inicial, vínculo obrigatório, autoridade do aprovador, recurso e transição. A decisão relê elegibilidade na mesma transação da gravação e trata concorrência como conflito de domínio. Uma fila sem casos elegíveis retorna lista vazia.
2. **Privilégio administrativo.** Um fluxo autenticado identifica titular, papel vigente, autoridade e alvo no servidor. A mutação grava autoria e privilégio concedido com garantia de persistência para os eventos obrigatórios. Uma guarda compartilhada verifica a continuidade administrativa na mesma transação de qualquer exclusão, desativação ou mutação de papel ou estado que retire a capacidade do administrador habilitado. A concorrência entre alvos distintos é parte do contrato. A definição de administrador habilitado segue a política desta especificação e a salvaguarda de #474 descrita na [especificação de integridade](../integridade-de-produtos-e-lotes/techspec.md). A revisão de contas existentes usa a [conciliação operacional](../conciliacao-operacional/techspec.md).
3. **Sessão.** `AuthController`, a validação de sessão de `Program.cs` e o módulo `frontend/src/auth/session.ts` precisam de um contrato conjunto de emissão, consulta do estado da sessão, logout e renovação. O servidor valida sessão ativa, expiração, versão da conta e situação atual de acesso. Logout confirma a revogação da sessão corrente. Troca ou redefinição de senha mantém a revogação global. Mudanças de papel e estado devem surtir efeito de acordo com a matriz vigente. A interface limpa seu estado e informa quando é necessário autenticar novamente.
4. **Autorização.** Definir a política de fallback e revisar cada método e caminho, com exceções públicas explícitas, papel, vínculo, sessão restrita, ambiente e destino no proxy. Toda política nomeada recebe referência de uso em endpoint ou decisão de remoção documentada, inclusive `ApenasDependentes`. Controles por recurso continuam a ser aplicados pelo servidor. A [especificação de API e proxy](../protecao-de-api-e-proxy/techspec.md) consome o inventário.
5. **Troca de e-mail.** `UserProfileUpdateService` mantém a atualização transacional. `ProfileContactForm.tsx` apresenta os estados de confirmação, validação e continuidade. A troca válida atualiza o endereço de recuperação, invalida a recuperação anterior, persiste a reserva de carência, grava a trilha e registra o trabalho de aviso para cada endereço. A estratégia de envio e a confirmação administrativa ficam condicionadas à validação.

## Contratos e APIs

| Operação | Contrato proposto |
| --- | --- |
| Cadastro público em `UsuariosController` | Recebe a modalidade pública Mentor ou Mentorado e os dados permitidos. O servidor aplica a matriz aprovada de tipo, papel, estado e vínculo e segue o [contrato público de cadastro aprovado](#contrato-público-de-cadastro-aprovado). |
| Filas e decisões existentes | Projeção mínima com tipo e papel efetivo. Filtro por elegibilidade do ator. Reavaliação antes de persistir. Mudança concorrente preserva o estado vigente e recebe erro de domínio. |
| Concessão e retirada de privilégio | A concessão registra ator, alvo, privilégio e resultado. A retirada que violaria a continuidade produz conflito de domínio consultável sem expor dados de outras contas. Finalizar rotas e códigos depois da decisão sobre autoridade. |
| Login, estado, logout e renovação | Login estabelece cookie de sessão emitido pelo servidor. A consulta entrega à interface o contexto mínimo de perfil. Logout é idempotente e remove o cookie de acordo com o escopo de sua emissão. Sessão inválida, encerrada ou expirada recebe `401`, inclusive na renovação. Restrições de papel, vínculo e troca obrigatória seguem a matriz. |
| Operações de estado no navegador | Cookie com `HttpOnly`, `Secure` e `SameSite` explícito. Mutação autenticada exige a defesa CSRF aprovada. A troca de senha continua disponível à sessão restrita conforme a política e usa limitação documentada. Adotar `429` e `Retry-After` onde aplicável, seguindo o padrão de limitação existente. |
| Edição de e-mail própria ou administrativa | Preservar o contrato de edição e a lista de campos permitidos. Exigir confirmação da senha atual do titular na própria conta e a confirmação revisada na gestão de terceiros. Tratar conflito, carência e confirmação incorreta por código público seguro. A interface oferece orientação textual e preserva o e-mail anterior na falha. |

## Dados e migrações

- Preservar `Usuario.VersaoSessao`, o vínculo de responsável, o estado da conta e a unicidade de e-mail. Preservar as contas existentes e encaminhar divergências de tipo, papel ou vínculo ao inventário restrito da conciliação para revisão administrativa.
- Ambos os desenhos de sessão exigem revogação no servidor por sessão e referência à versão da conta. As chaves de sessão, os prazos, a limpeza e a política de sessões anteriores serão definidos com o desenho escolhido. Ensaiar migração aditiva e verificar fronteiras por relógio controlado.
- A reserva do endereço substituído precisa ser consultada por todos os pontos de atribuição de endereço dentro do escopo da carência. Verificar unicidade e reserva na mesma unidade transacional, inclusive com duas solicitações concorrentes. Definir normalização, proteção e retenção da referência ao endereço antes da migração.
- A operação de e-mail deve registrar os dois trabalhos de aviso e a trilha na mesma unidade de persistência da mudança, mediante transação direta ou registro durável aprovado. Cada aviso precisa de identidade própria para repetição controlada. Os dados de entrega têm acesso e retenção limitados à finalidade.

## Segurança, privacidade e permissões

A interface usa contexto recebido do servidor para exibição, e a autorização usa a identidade e o estado verificados no servidor. O mecanismo CSRF deve cobrir os métodos de alteração de estado, incluindo encerramento e renovação quando autenticados por cookie. Desenvolvimento, testes HTTPS e publicação têm contratos explícitos de origem e CORS. Logs e capturas de teste registram códigos, classes e correlação sanitizada. A auditoria de concessão e de e-mail usa campos mínimos, com autoria, operação, alvo e resultado observável. Material de sessão e confirmação permanece protegido.

## Falhas, observabilidade e operação

- Registrar contagens por recusa de elegibilidade, conflito, limitação, expiração, revogação e falha de aviso, com rótulos de cardinalidade limitada. Uma falha de persistência de revogação deve ficar distinguível de logout confirmado. A UI encerra a exibição de dados privados e informa a situação quando o servidor ainda não confirmou.
- A falha de envio após a troca deve gerar sinal para operação e permitir o tratamento aprovado de cada aviso sem repetir a mudança já concluída. A política de tentativas, tratamento terminal e comunicação depende da decisão de entrega.
- Validar provisão de uma configuração comum de emissão e validação para emissor, audiência, duração e bytes da chave. Usar configurações sintéticas com verificação da mesma codificação e do comportamento de expiração.

## Compatibilidade, disponibilização e reversão

Preparar primeiro o esquema aditivo e os testes de convivência de versões. Liberar conjuntamente backend, proxy, clientes da API e frontend quando o transporte de navegador mudar. Escolher antes do corte entre invalidação das sessões anteriores e uma janela explicitamente limitada, com cobertura do comportamento final. Se necessário, reverter frontend e API em conjunto preservando o efeito de revogações, a guarda administrativa, a carência e os eventos persistidos. Ensaiar o retorno em base sintética e verificar autenticação, logout, troca de senha e recuperação após a reversão. Evitar reversão destrutiva do esquema com dados novos.

## Estratégia TDD e pirâmide de testes

### RED

Adicionar casos parametrizados para cadastro, equivalência pública e elegibilidade. Exigir em integração a recusa de decisão obsoleta, continuidade administrativa em mutações simultâneas e revogação por sessão e por conta. Fixar as condições aprovadas de expiração e renovação com relógio controlado. Em contratos e navegador HTTPS sintético, verificar atributos do cookie, proteção CSRF e reautenticação em texto. Em integração, exigir a atualização de recuperação, os dois avisos e carência antes e depois do prazo, inclusive com falhas de confirmação e de entrega.

### GREEN

Implementar política compartilhada, guarda de continuidade, inventário de autorização e sessão conforme o desenho aprovado. Migrar o consumidor de navegador com a defesa escolhida. Estender a transação de perfil para reserva, auditoria e avisos e observar o sucesso dos novos casos e das regressões de recuperação e troca obrigatória.

### REFACTOR

Remover regras de elegibilidade duplicadas e centralizar validação de sessão e categorias públicas. Manter testes unitários de política e relógio, contratos de rota e resposta, integração relacional para concorrência e migração e E2E para jornadas de navegador e interface.

## Esteira de qualidade

| Área | Comando local | Verificação de CI | Lacuna ou ação |
| --- | --- | --- | --- |
| Backend .NET 8 e xUnit | Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`, com Docker para Testcontainers | `Container CI`, `Backend quality`, com restauração travada, compilação e execução da solução. A solução já inclui `Tests`. | Estender `CriticalRegistrationTests`, `CriticalUserApprovalTests`, `JwtSessionVersionTests` e `UserProfileMutationTests`. Adicionar casos concorrentes e cobertura da matriz de rotas. |
| Frontend React/Vite | Em `frontend`, `npm ci`, `npm run test -- --run`, `npm run lint` e `npm run build` | `Frontend quality` | Atualizar testes de `Auth`, `RegistrationRequests` e `ProfileContactForm`. |
| Navegador e entrega | Em `frontend`, `npx --no-install playwright install chromium` e `npm run test:e2e -- --project=security`, com a composição descartável `docker-compose-security-e2e.yml` configurada | `Browser security E2E` e `Authentication E2E` usam composições sintéticas. | Estender os projetos existentes com transições do cookie, CSRF, encerramento e coleta sanitizada. Usar o simulador de e-mail de `backend/Tests/Infrastructure` para confirmar os dois avisos. |

`container-ci.yml` executa em PR para `develop` aberto, sincronizado, reaberto, editado ou pronto para revisão, em `merge_group` e manualmente. A configuração que torna os jobs obrigatórios na proteção da branch depende de conferência específica. `container-release.yml` executa em PR fechado para `main` ou manualmente e pertence à entrega. Comandos conferidos no checkout para o plano de implementação.

## Matriz de rastreabilidade

| Requisito | Componentes | Testes | Evidência esperada |
| --- | --- | --- | --- |
| RF-001 | Política de contas, cadastro | Unitário, integração | Tipo, papel, estado e vínculo persistidos conforme a matriz |
| RF-002 | Fila e ações de decisão | Integração relacional, UI | Mesma elegibilidade antes e após alteração do alvo |
| RF-003 | Concessão, guarda #474, auditoria | Integração relacional concorrente | Ator, alvo e privilégio, com continuidade administrativa |
| RF-004 | Cadastro, mapeamento de erros | Contrato, integração | Equivalência pública por classe |
| RF-005 | Autenticação, versão de sessão, frontend | Integração, E2E | Ciclo de sessão e revogação verificáveis |
| RF-006 | Cookie, CSRF, limitação | Contrato, integração, E2E | Atributos, autorização de mutação, limite e orientação |
| RF-007 | `Program.cs`, políticas, inventário | Contrato de rotas | Perfis, exceções e usos de políticas cobertos |
| RF-008 | Serviço e formulário de perfil | Integração, UI | Mudança só com autorização e confirmação válidas |
| RF-009 | Perfil, reserva, avisos e auditoria | Integração relacional | Dois avisos, autoria e elegibilidade temporal |
| RNF-001 | DTOs, interface, telemetria | Contrato, UI, inspeção sanitizada | Campos públicos mínimos e orientação textual |
| RNF-002 | Autenticação e CI | Build, integração .NET 8 | Emissão e validação com a mesma configuração |
| CA-001 | Cadastro | Integração | Conta válida criada com atributos derivados |
| CA-002 | Cadastro e política de concessão | Integração | Entrada fora da matriz recusada, sem mutação |
| CA-003 | Filas e decisão concorrente | Integração, UI | Projeção efetiva, vazio e decisão obsoleta recusada |
| CA-004 | Concessão administrativa | Integração | Só a concessão autorizada é persistida e auditada |
| CA-005 | Resposta pública de cadastro | Contrato | Mesmo status, código e texto por classe, base preservada |
| CA-006 | Estado, logout e renovação | Integração, E2E | Ativa, renovável, encerrada e expirada conforme tabela |
| CA-007 | Cookie e CSRF | E2E HTTPS | Atributos e mutações avaliadas pela política |
| CA-008 | Troca de senha | Integração, UI | Limite, estado preservado na recusa e sessões anteriores revogadas |
| CA-009 | Rotas e políticas | Contrato | Inventário para anônimo, autorizado, inelegível e restrito |
| CA-010 | JwtBearer e emissão | Build, integração | Credencial válida reconhecida e inválida recusada |
| CA-011 | Edição de e-mail | Integração, UI | Titular e administrador, com e sem a confirmação prevista |
| CA-012 | Avisos e evento | Integração com caixas sintéticas | Um aviso para cada endereço e evento com autoria |
| CA-013 | Reserva de endereço | Integração relacional | Limites de carência, unicidade e vínculo |

## Alternativas e decisões

| Decisão | Alternativas | Recomendação | Escolha confirmada | Consequências |
| --- | --- | --- | --- | --- |
| Matriz de contas e autoridade | Cadastros públicos de Mentor e Mentorado, ambos acadêmicos | Centralizar papéis, vínculo, estado e autoridade na política aplicada a cadastro, fila e decisão | Aprovada pelo usuário conforme a matriz abaixo | Define a elegibilidade para cadastro, fila, aprovação e concessão. |
| Contrato público de cadastro | Preservar os campos existentes e padronizar as falhas por classe | Compatibilidade com o formulário anterior e revisão administrativa de divergências antigas | Aprovado pelo usuário conforme o contrato abaixo | Define as respostas públicas e libera T003 e, após sua entrega, T004. |
| Sessão e transição | Identificador opaco com sessão persistida ou credencial assinada associada a registro de revogação | Identificador opaco com estado no servidor, com corte coordenado e reautenticação planejada | Definida na [decisão local](../decisoes-de-planejamento.md#contas-e-publicação) | Define persistência, duração, renovação, compatibilidade e impacto em usuários ativos |
| Cookie e CSRF | Sessão de mesma origem com defesa vinculada à sessão ou suporte explícito a origens distintas com política credenciada | Mesma origem na publicação e perfil de teste HTTPS coerente, com validação explícita de mutações | Definida na [decisão local](../decisoes-de-planejamento.md#contas-e-publicação) | Condiciona `SameSite`, CORS, clientes admitidos e testes E2E |
| Continuidade administrativa | Transação serializável com tratamento de repetição ou ponto de coordenação comum a todas as escritas relevantes | Guarda compartilhada transacional e ensaio concorrente com PostgreSQL | Definida na [decisão local](../decisoes-de-planejamento.md#empréstimos-e-integridade) | A escolha precisa ser comum a contas, integridade e conciliação |
| Autorizações públicas | Exceções mínimas explícitas com remoção de políticas excedentes ou manutenção temporária de caminhos compatíveis inventariados | Partir das jornadas aprovadas e demonstrar o uso efetivo de cada política preservada | Definida na [decisão local](../decisoes-de-planejamento.md#contas-e-publicação) | Condiciona a publicação e a janela de compatibilidade |
| Avisos e carência | Persistir trabalho durável com tentativas ou exigir confirmação síncrona dos avisos e tratar falhas parciais | Gravação durável junto da alteração para preservar a trilha e permitir repetição por destinatário | Definida na [decisão local](../decisoes-de-planejamento.md#contas-e-publicação) | Condiciona confirmação administrativa, escopo de reserva, prazo, processamento e suporte |

### Matriz aprovada

| Operação | Estado inicial e vínculo | Autoridade |
| --- | --- | --- |
| Cadastro de Mentor acadêmico | Pendente. Dispensa responsável. | Administrador habilitado aprova ou rejeita. |
| Cadastro de Mentorado acadêmico | Pendente. Exige Mentor ou Administrador habilitado como responsável. | Mentor vinculado e habilitado ou Administrador habilitado aprova ou rejeita. |
| Concessão do papel Administrador | Fluxo autenticado e auditado. | Outro Administrador habilitado concede o papel. |

A aprovação habilita a conta. A rejeição desabilita a conta.

### Contrato público de cadastro aprovado

- Manter os campos atuais e a resposta de criação `201`. O servidor aplica a matriz conforme a modalidade solicitada. Para Mentor, aceitar o campo `responsavelEmail` enviado pelo formulário anterior e descartar o valor.
- Preservar as contas existentes. Encaminhar divergências de tipo, papel ou vínculo para revisão administrativa na conciliação.

| Caso | HTTP | Código | Mensagem pública |
| --- | --- | --- | --- |
| Responsável ausente, inexistente ou inelegível no cadastro de Mentorado | `400` | `registration_responsible_invalid` | Verifique o e-mail do responsável informado. |
| Conflito de unicidade | `409` | `registration_conflict` | Não foi possível concluir o cadastro com os dados informados. |

## Riscos e mitigação

| Risco | Mitigação prevista |
| --- | --- |
| Duas mutações retiram a capacidade de administradores simultaneamente | Aplicar guarda compartilhada na persistência e comprovar o caso com PostgreSQL sintético |
| Corte de sessão interrompe recuperação ou troca obrigatória | Ensaiar os cenários com o proxy, a sessão restrita e as versões da aplicação que convivem no corte |
| Entrega parcial de avisos ou disputa por endereço | Rastrear o estado de cada aviso, preservar a carência no retorno e verificar unicidade sob concorrência |
| Mudança de erro público revela dados ou quebra consumidores | Comparar a classe pública inteira e validar o texto nas telas que consomem os códigos |

## Perguntas abertas

- Consultar as [decisões de planejamento](../decisoes-de-planejamento.md#contas-e-publicação).
