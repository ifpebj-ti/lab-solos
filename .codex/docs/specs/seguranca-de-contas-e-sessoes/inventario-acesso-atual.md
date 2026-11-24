# Inventário atual de acesso e sessões

Levantamento estático do checkout de 2026-11-15 para [T001](tasks.md#t001--inventariar-rotas-efetivas-e-políticas-declaradas), #484, RF-007 e CA-009. Os caminhos são padrões de rota, com o token `[controller]` expandido. As linhas são referências aos atributos de rota ou à configuração no checkout. A aprovação das exceções cabe à matriz de T006.

## Autorização e estado da sessão

O esquema padrão é JWT Bearer. O validador verifica emissor, audiência, chave de assinatura e validade temporal, sem tolerância de relógio. Exige identificador, versão de sessão e indicador de troca obrigatória válidos. A conta é relida para conferir o estado `Habilitado` e `VersaoSessao`. O papel usado nas políticas vem do JWT. Na validação da sessão, a consulta lê estado e versão. [Program.cs, linhas 81–154](../../../../backend/LabSolos-Server-DotNet8/Program.cs#L81) · [JwtService.cs, linha 17](../../../../backend/LabSolos-Server-DotNet8/Services/JwtService.cs#L17).

`MapControllers()` e `MapHealthChecks()` não recebem `RequireAuthorization()` na configuração atual. A política de fallback não está configurada. A busca também não encontrou `[AllowAnonymous]` ativo. A coluna **Autorização efetiva** representa os metadados do pipeline. Quando houver controles adicionais sobre o recurso, eles aparecem na coluna **Consumidor e controle do recurso**.

| Autorização efetiva | Declaração e condição | Consumidor ou revisão |
| --- | --- | --- |
| Padrão | `[Authorize]` sem política ou papel aplica `DefaultPolicy`, que exige autenticação e `password_change_required=false`. | Ações marcadas **Padrão** e o atributo de classe de `NotificacoesController`. |
| Admin | `ApenasAdministradores` exige papel `Administrador` e `password_change_required=false`. | Ações marcadas **Admin**, incluindo a política da classe `AuditoriaController`. |
| Responsáveis | `ApenasResponsaveis` exige papel `Administrador` ou `Mentor` e `password_change_required=false`. | Cinco ações de dependentes em `UsuariosController`. As ações também conferem o escopo do recurso. |
| Dependentes | `ApenasDependentes` exige papel `Mentorado` e `password_change_required=false`. | Nenhum consumidor encontrado na busca estática. Decidir em T006 sobre uso efetivo ou remoção. |
| Troca própria | `PodeAlterarPropriaSenha` exige autenticação. A política aceita sessão válida em troca obrigatória. | `POST /api/Auth/change-password` usa a constante `CredentialAuthorizationPolicies.ChangeOwnPassword`. [Registro da política](../../../../backend/LabSolos-Server-DotNet8/Services/Security/SecurityServiceCollectionExtensions.cs#L59) · [Nome da política](../../../../backend/LabSolos-Server-DotNet8/Services/Security/SecurityServiceCollectionExtensions.cs#L166). |
| Padrão + papel Admin | `[Authorize]` na classe compõe a política padrão com `Roles = "Administrador"` na ação. Exige sessão válida, troca concluída e o papel indicado. | `POST /api/Notificacoes/verificar-emprestimos-vencidos`. |
| Sem metadado | O pipeline de autorização não exige uma sessão para prosseguir. Restrições operacionais podem ser verificadas pela ação. | Nove ações MVC e `/health`. A revisão de exceções depende da matriz de publicação. |

`DevelopmentClients` é uma política de CORS. O registro e o consumo por `UseCors` ocorrem no ambiente de desenvolvimento. A lista de métodos e cabeçalhos permitidos pertence à configuração de origem. [Program.cs, registro](../../../../backend/LabSolos-Server-DotNet8/Program.cs#L156) · [Program.cs, consumo](../../../../backend/LabSolos-Server-DotNet8/Program.cs#L186).

O navegador grava o JWT e os dados de apresentação em cookies via JavaScript. As integrações protegidas encaminham o JWT pelo cabeçalho `Authorization`. O botão de saída limpa o estado local. As rotas observadas de `Auth` são login e troca de senha. Troca e redefinição incrementam `VersaoSessao`, invalidando credenciais anteriores na validação. [session.ts](../../../../frontend/src/auth/session.ts#L54) · [ButtonLogout.tsx](../../../../frontend/src/components/global/ButtonLogout.tsx#L16) · [CredentialService.cs, troca](../../../../backend/LabSolos-Server-DotNet8/Services/Security/CredentialService.cs#L200) · [CredentialService.cs, redefinição](../../../../backend/LabSolos-Server-DotNet8/Services/Security/CredentialService.cs#L329).

## Rotas da API

As 58 ações abaixo são mapeadas por `MapControllers()`. O padrão `/api/*` é encaminhado ao backend pelo proxy versionado. Os nomes `Auth.ts`, `Users.ts`, `Class.ts`, `System.ts`, `Product.ts`, `Loans.ts`, `Notifications.ts` e `Auditoria.ts` se referem aos módulos em [`frontend/src/integration`](../../../../frontend/src/integration). `—` indica ausência de um consumidor identificado no frontend e nos pontos de integração revisados. A evidência de consumo local cobre chamadas encontradas, incluindo funções de integração sem confirmação de uso por uma tela.

### Autenticação, e-mail e sistema

| Método | Caminho | Autorização efetiva | Consumidor e controle do recurso | Fonte |
| --- | --- | --- | --- | --- |
| POST | `/api/Auth/login` | Sem metadado | `Auth.ts` inicia a sessão. A ação valida credenciais e estado habilitado e aplica o controle de admissão de login. | [AuthController.cs:54](../../../../backend/LabSolos-Server-DotNet8/Controllers/AuthController.cs#L54) |
| POST | `/api/Auth/change-password` | Troca própria | `ChangePassword.tsx`. A ação usa a identidade autenticada na troca da própria senha. | [AuthController.cs:199](../../../../backend/LabSolos-Server-DotNet8/Controllers/AuthController.cs#L199) |
| POST | `/api/Email/enviar` | Sem metadado | —. Operação de envio genérico a classificar com o plano de publicação. | [EmailController.cs:30](../../../../backend/LabSolos-Server-DotNet8/Controllers/EmailController.cs#L30) |
| POST | `/api/Email/request-password-reset` | Sem metadado | `Auth.ts` inicia a recuperação vigente. A ação delega ao fluxo de recuperação. | [EmailController.cs:56](../../../../backend/LabSolos-Server-DotNet8/Controllers/EmailController.cs#L56) |
| POST | `/api/Email/solicitar-redefinicao` | Sem metadado | —. Variante legada com o mesmo serviço de admissão da solicitação vigente. | [EmailController.cs:62](../../../../backend/LabSolos-Server-DotNet8/Controllers/EmailController.cs#L62) |
| POST | `/api/Email/reset-password` | Sem metadado | `Auth.ts` conclui a recuperação vigente. A ação delega ao fluxo que verifica a prova de recuperação. | [EmailController.cs:68](../../../../backend/LabSolos-Server-DotNet8/Controllers/EmailController.cs#L68) |
| POST | `/api/Email/redefinir-senha` | Sem metadado | —. Variante legada com contrato próprio de entrada e fluxo interno de redefinição compartilhado. | [EmailController.cs:80](../../../../backend/LabSolos-Server-DotNet8/Controllers/EmailController.cs#L80) |
| GET | `/api/System/quantities` | Sem metadado | `System.ts` na busca de materiais. O cliente envia Bearer, embora a ação não o exija. | [SystemController.cs:15](../../../../backend/LabSolos-Server-DotNet8/Controllers/SystemController.cs#L15) |
| GET | `/api/System/health` | Sem metadado | `deploy-release.sh` verifica a aplicação a partir do contêiner do proxy, diretamente no backend. A ação devolve um indicador fixo. | [SystemController.cs:22](../../../../backend/LabSolos-Server-DotNet8/Controllers/SystemController.cs#L22) |

### Usuários

| Método | Caminho | Autorização efetiva | Consumidor e controle do recurso | Fonte |
| --- | --- | --- | --- | --- |
| GET | `/api/Usuarios` | Admin | `Users.ts` lista usuários. | [UsuariosController.cs:63](../../../../backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs#L63) |
| GET | `/api/Usuarios/tipo/{tipoUsuario}` | Admin | — | [UsuariosController.cs:71](../../../../backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs#L71) |
| GET | `/api/Usuarios/{id}` | Padrão | `Users.ts`. `ForProfiles` limita a titular, administrador ou mentor vinculado. A projeção de acompanhamento é específica do mentor vinculado. | [UsuariosController.cs:97](../../../../backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs#L97) |
| GET | `/api/Usuarios/{usuarioId}/dependentes/emprestimos` | Responsáveis | `Class.ts`. As consultas conferem o escopo do responsável, dependentes e empréstimos. | [UsuariosController.cs:128](../../../../backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs#L128) |
| GET | `/api/Usuarios/{usuarioId}/dependentes` | Responsáveis | `Class.ts`. A listagem confere acesso ao responsável e aos dependentes vinculados. | [UsuariosController.cs:160](../../../../backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs#L160) |
| GET | `/api/Usuarios/{usuarioId}/dependentes/aprovacao` | Responsáveis | `Class.ts` e `Users.ts`. A fila é limitada a dependentes pendentes no escopo do responsável. | [UsuariosController.cs:174](../../../../backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs#L174) |
| GET | `/api/Usuarios/aprovacao` | Admin | `Class.ts` carrega a fila de cadastros pendentes. | [UsuariosController.cs:192](../../../../backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs#L192) |
| POST | `/api/Usuarios` | Sem metadado | `Auth.ts` cadastra usuários. A ação valida as referências de cadastro. | [UsuariosController.cs:202](../../../../backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs#L202) |
| PATCH | `/api/Usuarios/{usuarioId}` | Padrão | `Users.ts` altera perfil ou estado. `UserProfileUpdateService` verifica o ator, o alvo e os campos permitidos e exige a confirmação atual na troca do próprio e-mail. | [UsuariosController.cs:342](../../../../backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs#L342) |
| PATCH | `/api/Usuarios/dependentes/{dependenteId}/aprovar` | Responsáveis | `Class.ts` e `Users.ts`. A ação verifica identidade do aprovador, vínculo quando aplicável e estado pendente. | [UsuariosController.cs:416](../../../../backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs#L416) |
| PATCH | `/api/Usuarios/{usuarioId}/aprovar` | Admin | —. A decisão exige estado pendente. | [UsuariosController.cs:449](../../../../backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs#L449) |
| PATCH | `/api/Usuarios/dependentes/{dependenteId}/rejeitar` | Responsáveis | `Class.ts` e `Users.ts`. A ação verifica identidade do aprovador, vínculo quando aplicável e estado pendente. | [UsuariosController.cs:476](../../../../backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs#L476) |
| PATCH | `/api/Usuarios/{usuarioId}/rejeitar` | Admin | —. A decisão exige estado pendente. | [UsuariosController.cs:509](../../../../backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs#L509) |
| DELETE | `/api/Usuarios/{id}` | Admin | — | [UsuariosController.cs:607](../../../../backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs#L607) |

### Empréstimos

`ForLoans` aplica escopo por papel e identidade às consultas indicadas. O administrador tem escopo geral. Mentor e mentorado acessam os registros em que figuram como solicitante ou aprovador. O mentor também acessa empréstimos de mentorados vinculados. [UserResourceAccessService.cs](../../../../backend/LabSolos-Server-DotNet8/Services/Security/UserResourceAccessService.cs#L44).

| Método | Caminho | Autorização efetiva | Consumidor e controle do recurso | Fonte |
| --- | --- | --- | --- | --- |
| GET | `/api/Emprestimos/usuario/{userId}` | Padrão | `Loans.ts`. Aplica `ForLoans` à consulta por usuário. | [EmprestimosController.cs:51](../../../../backend/LabSolos-Server-DotNet8/Controllers/EmprestimosController.cs#L51) |
| GET | `/api/Emprestimos/solicitados/{userId}` | Padrão | —. Aplica `ForLoans` à consulta de solicitações. | [EmprestimosController.cs:68](../../../../backend/LabSolos-Server-DotNet8/Controllers/EmprestimosController.cs#L68) |
| GET | `/api/Emprestimos/aprovados/{userId}` | Padrão | —. Aplica `ForLoans` à consulta de aprovações. | [EmprestimosController.cs:85](../../../../backend/LabSolos-Server-DotNet8/Controllers/EmprestimosController.cs#L85) |
| GET | `/api/Emprestimos/{emprestimoId}` | Padrão | `Loans.ts`. Aplica `ForLoans` à consulta por identificador. | [EmprestimosController.cs:110](../../../../backend/LabSolos-Server-DotNet8/Controllers/EmprestimosController.cs#L110) |
| GET | `/api/Emprestimos` | Admin | `Loans.ts` lista empréstimos. | [EmprestimosController.cs:125](../../../../backend/LabSolos-Server-DotNet8/Controllers/EmprestimosController.cs#L125) |
| POST | `/api/Emprestimos` | Padrão | `Loans.ts`. A ação usa o identificador autenticado como solicitante e recusa o papel administrador. | [EmprestimosController.cs:168](../../../../backend/LabSolos-Server-DotNet8/Controllers/EmprestimosController.cs#L168) |
| PATCH | `/api/Emprestimos/aprovar/{emprestimoId}` | Admin | `Loans.ts`. A ação também confere a identidade e o papel do aprovador. | [EmprestimosController.cs:232](../../../../backend/LabSolos-Server-DotNet8/Controllers/EmprestimosController.cs#L232) |
| PATCH | `/api/Emprestimos/reprovar/{emprestimoId}` | Admin | `Loans.ts`. A ação também confere a identidade e o papel do aprovador. | [EmprestimosController.cs:321](../../../../backend/LabSolos-Server-DotNet8/Controllers/EmprestimosController.cs#L321) |
| PATCH | `/api/Emprestimos/devolver/{emprestimoId}` | Padrão | `Loans.ts`. A ação exige papel administrador ou mentor e verifica o estado do empréstimo. Revisar o requisito de vínculo com a matriz. | [EmprestimosController.cs:380](../../../../backend/LabSolos-Server-DotNet8/Controllers/EmprestimosController.cs#L380) |

### Produtos e lotes

| Método | Caminho | Autorização efetiva | Consumidor e controle do recurso | Fonte |
| --- | --- | --- | --- | --- |
| GET | `/api/Produtos/tipo/{tipoProduto}` | Padrão | — | [ProdutosController.cs:45](../../../../backend/LabSolos-Server-DotNet8/Controllers/ProdutosController.cs#L45) |
| GET | `/api/Produtos` | Padrão | `Product.ts` lista produtos. | [ProdutosController.cs:72](../../../../backend/LabSolos-Server-DotNet8/Controllers/ProdutosController.cs#L72) |
| GET | `/api/Produtos/emAlerta` | Admin | `Product.ts` lista alertas. | [ProdutosController.cs:80](../../../../backend/LabSolos-Server-DotNet8/Controllers/ProdutosController.cs#L80) |
| GET | `/api/Produtos/{id}` | Padrão | `Product.ts` carrega produto. | [ProdutosController.cs:88](../../../../backend/LabSolos-Server-DotNet8/Controllers/ProdutosController.cs#L88) |
| POST | `/api/Produtos` | Admin | `Product.ts` cria produto. | [ProdutosController.cs:107](../../../../backend/LabSolos-Server-DotNet8/Controllers/ProdutosController.cs#L107) |
| PUT | `/api/Produtos/{id}` | Admin | — | [ProdutosController.cs:142](../../../../backend/LabSolos-Server-DotNet8/Controllers/ProdutosController.cs#L142) |
| DELETE | `/api/Produtos/{id}` | Admin | — | [ProdutosController.cs:169](../../../../backend/LabSolos-Server-DotNet8/Controllers/ProdutosController.cs#L169) |
| GET | `/api/Produtos/{id}/historico-saida` | Padrão | `Product.ts` carrega histórico. Revisar a projeção e a autorização por recurso com a matriz. | [ProdutosController.cs:186](../../../../backend/LabSolos-Server-DotNet8/Controllers/ProdutosController.cs#L186) |
| PATCH | `/api/Produtos/{id}` | Admin | `Product.ts` atualiza produto. | [ProdutosController.cs:220](../../../../backend/LabSolos-Server-DotNet8/Controllers/ProdutosController.cs#L220) |
| POST | `/api/Lotes/AddLote` | Admin | — | [LotesController.cs:28](../../../../backend/LabSolos-Server-DotNet8/Controllers/LotesController.cs#L28) |
| GET | `/api/Lotes/GetById/{id}` | Padrão | — | [LotesController.cs:47](../../../../backend/LabSolos-Server-DotNet8/Controllers/LotesController.cs#L47) |
| GET | `/api/Lotes/GetByCodigo/{codigoLote}` | Padrão | — | [LotesController.cs:62](../../../../backend/LabSolos-Server-DotNet8/Controllers/LotesController.cs#L62) |

### Notificações e auditoria

| Método | Caminho | Autorização efetiva | Consumidor e controle do recurso | Fonte |
| --- | --- | --- | --- | --- |
| GET | `/api/Notificacoes/minhas` | Padrão na classe e ação | `Notifications.ts`. A consulta usa a identidade e o perfil autenticados. | [NotificacoesController.cs:30](../../../../backend/LabSolos-Server-DotNet8/Controllers/NotificacoesController.cs#L30) |
| GET | `/api/Notificacoes/count-nao-lidas` | Padrão na classe e ação | `Notifications.ts`. A contagem usa a identidade e o perfil autenticados. | [NotificacoesController.cs:51](../../../../backend/LabSolos-Server-DotNet8/Controllers/NotificacoesController.cs#L51) |
| POST | `/api/Notificacoes` | Padrão + Admin | `Notifications.ts` cria notificação. | [NotificacoesController.cs:71](../../../../backend/LabSolos-Server-DotNet8/Controllers/NotificacoesController.cs#L71) |
| PATCH | `/api/Notificacoes/{id}/marcar-lida` | Padrão na classe e ação | `Notifications.ts`. O serviço verifica a notificação em relação ao usuário autenticado. | [NotificacoesController.cs:86](../../../../backend/LabSolos-Server-DotNet8/Controllers/NotificacoesController.cs#L86) |
| PATCH | `/api/Notificacoes/marcar-lidas` | Padrão na classe e ação | `Notifications.ts`. O serviço verifica o recurso no processamento em lote. | [NotificacoesController.cs:108](../../../../backend/LabSolos-Server-DotNet8/Controllers/NotificacoesController.cs#L108) |
| POST | `/api/Notificacoes/gerar-automaticas` | Padrão + Admin | `Notifications.ts` solicita geração de notificações. | [NotificacoesController.cs:130](../../../../backend/LabSolos-Server-DotNet8/Controllers/NotificacoesController.cs#L130) |
| POST | `/api/Notificacoes/verificar-emprestimos-vencidos` | Padrão + papel Admin | `Notifications.ts` solicita verificação dos empréstimos vencidos. | [NotificacoesController.cs:145](../../../../backend/LabSolos-Server-DotNet8/Controllers/NotificacoesController.cs#L145) |
| POST | `/api/Auditoria/registrar` | Admin na classe | — | [AuditoriaController.cs:33](../../../../backend/LabSolos-Server-DotNet8/Controllers/AuditoriaController.cs#L33) |
| GET | `/api/Auditoria/logs` | Admin na classe | `Auditoria.ts` carrega registros. | [AuditoriaController.cs:65](../../../../backend/LabSolos-Server-DotNet8/Controllers/AuditoriaController.cs#L65) |
| GET | `/api/Auditoria/relatorio` | Admin na classe | `Auditoria.ts` carrega relatório. | [AuditoriaController.cs:79](../../../../backend/LabSolos-Server-DotNet8/Controllers/AuditoriaController.cs#L79) |
| PATCH | `/api/Auditoria/marcar-suspeito/{logId}` | Admin na classe | `Auditoria.ts` marca registro. | [AuditoriaController.cs:96](../../../../backend/LabSolos-Server-DotNet8/Controllers/AuditoriaController.cs#L96) |
| PATCH | `/api/Auditoria/marcar-nao-suspeito/{logId}` | Admin na classe | `Auditoria.ts` retira a marca do registro. | [AuditoriaController.cs:110](../../../../backend/LabSolos-Server-DotNet8/Controllers/AuditoriaController.cs#L110) |
| GET | `/api/Auditoria/verificar-atividade-suspeita` | Admin na classe | `Auditoria.ts` consulta atividade suspeita. | [AuditoriaController.cs:124](../../../../backend/LabSolos-Server-DotNet8/Controllers/AuditoriaController.cs#L124) |
| POST | `/api/Auditoria/processar-deteccao` | Admin na classe | — | [AuditoriaController.cs:140](../../../../backend/LabSolos-Server-DotNet8/Controllers/AuditoriaController.cs#L140) |

## Prontidão, documentação da API e publicação

| Método de consumo observado | Caminho ou superfície | Ambiente e autorização efetiva | Consumidor | Fonte |
| --- | --- | --- | --- | --- |
| GET | `/health` | Aplicação. `MapHealthChecks` sem metadados de autorização e sem restrição de método declarada no mapeamento. | `HealthProbe` nos healthchecks internos das composições E2E. | [Program.cs:223](../../../../backend/LabSolos-Server-DotNet8/Program.cs#L223) · [E2E](../../../../docker-compose-e2e.yml#L105) · [E2E de segurança](../../../../docker-compose-security-e2e.yml#L101) |
| GET | `/` e recursos da UI Swagger | Backend em desenvolvimento e produção. Middleware anterior à autenticação e à autorização. | Navegação direta no backend. Nenhum cliente da aplicação identificado. | [Program.cs:195](../../../../backend/LabSolos-Server-DotNet8/Program.cs#L195) |
| GET | `/swagger/v1/swagger.json` | Backend em desenvolvimento e produção. Middleware anterior à autenticação e à autorização. | UI Swagger. | [Program.cs:198](../../../../backend/LabSolos-Server-DotNet8/Program.cs#L198) |

O [Caddyfile](../../../../Caddyfile#L8) e a [configuração E2E](../../../../infra/testing/Caddyfile.security-e2e#L13) encaminham `/api/*` ao backend. Os demais caminhos, incluindo `/health` e os caminhos da documentação interativa, seguem para o frontend. O [NGINX do frontend](../../../../frontend/nginx.conf#L12) aplica seu fallback de navegação. O [script de entrega](../../../../infra/oci/scripts/deploy-release.sh#L56) utiliza `/api/System/health` diretamente no backend, a partir do contêiner do proxy. A sonda interna `/health` em E2E e o caminho de verificação da entrega têm consumidores distintos.

O [plano de Proteção da API e do proxy](../protecao-de-api-e-proxy/tasks.md) usa este levantamento na revisão de superfície e consumidores (T001), na matriz de publicação (T007) e na classificação de caminhos e fallback no proxy (T008). A decisão de publicação precisa explicitar cadastro, login, as duas famílias de recuperação, envio genérico, indicadores, sondas, documentação e caminhos sem consumidor identificado.

## Conferência para a matriz de acesso

- Conferir no código o método, o padrão de rota, os atributos ativos de classe e ação, o registro das políticas e os controles de recurso antes de revisar cada linha. Em `UsuariosController`, o `[Authorize]` no nível da classe está comentado. Em `NotificacoesController`, a autorização de classe é somada à da ação. Em `AuditoriaController`, as sete ações herdam a política da classe.
- Em T006, revisar as linhas sem metadados, os consumidores de recuperação legada, a autorização por recurso nas operações com restrições internas e a decisão sobre `ApenasDependentes`. Confirmar consumidores adicionais com os responsáveis pela publicação.
- Para as ações protegidas, a leitura estática indica desafio de autenticação para sessão ausente ou inválida e recusa pela política para sessão válida sem papel ou com troca pendente quando a política exigir a troca concluída. `Troca própria` admite a sessão restrita. A aceitação e os códigos das operações também dependem das verificações internas. A cobertura por contrato para anônimo, autorizado, sem permissão e sessão restrita pertence a T006.
