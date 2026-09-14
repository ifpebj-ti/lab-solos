# Inventário editorial das jornadas do LabOn

Status: rascunho de inventário da T001
Issue: #220
PRD: `./prd.md`
Especificação técnica: `./techspec.md`
Data da inspeção estática: 2026-09-14
Snapshot do produto inspecionado: `2c78dbe1c3ec41f4004f53c42be8fed556080192` (`feature/navegacao-pos-autenticacao`)
Versão de distribuição: ainda não confirmada; o build expõe `0.0.0`, hash Git e data de build
Responsável real pela revisão: não confirmado no PRD nem no produto
Evidência: inventário estático de código; nenhuma jornada foi declarada exercitada por uma pessoa

## Como ler este inventário

Este documento planeja o conteúdo do manual; ele não é o manual e não altera contratos, rotas ou menus. A presença de uma rota, componente, guarda ou controller é evidência estática de que o fluxo está previsto no produto. Não é evidência de que o fluxo foi executado no navegador, de que o ambiente estava disponível ou de que houve aprovação humana.

Os nomes de perfil usados pelo produto são `Administrador`, `Mentor` e `Mentorado`. “Todos” significa esses três perfis. Ações listadas são somente as ações observáveis nas páginas e menus inspecionados; endpoints sem uma ação visível não foram transformados em instrução operacional.

As páginas e âncoras abaixo são destinos editoriais planejados. Elas não devem ser tratadas como arquivos já publicados:

| Página planejada | Âncoras planejadas |
| --- | --- |
| `README.md` | `visao-geral`, `j01-acesso` |
| `perfis-e-permissoes.md` | `perfis`, `j03-aprovacao`, `j10-perfis` |
| `acesso-e-conta.md` | `j02-cadastro`, `j04-primeiro-acesso`, `j05-senha-saida` |
| `administrador.md` | `j03-aprovacao-admin`, `j06-preparar-operacao`, `j07-materiais-admin`, `j09-emprestimos-admin`, `j10-usuarios-admin` |
| `mentor.md` | `j03-aprovacao-mentor`, `j07-consulta-materiais-mentor`, `j08-emprestimos-mentor`, `j10-turma-mentor` |
| `mentorado.md` | `j02-cadastro-mentorado`, `j07-consulta-materiais-mentorado`, `j08-acompanhamento-mentorado`, `j10-perfil-mentorado` |
| `solucao-de-problemas.md` | `j11-falhas` |

## Matriz de jornadas

### J01 — Entender acesso, perfis e ponto de entrada

| Variante/perfil | Ação visível e entrada | Fontes verificáveis | Página/âncora planejada | Pré-requisito | Resultado esperado | Saída segura | Estado da evidência |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Todos, antes do login | Abrir `/`; informar `Email` e `Senha`; usar `Crie a sua agora.` ou `Esqueceu sua senha?` | `frontend/src/routes.tsx` (`Login`); `frontend/src/pages/Login.tsx`; `frontend/src/integration/Auth.ts` | `README.md#j01-acesso`; `acesso-e-conta.md#j02-cadastro` | Conta ou intenção de solicitar conta; para autenticar, credencial válida | Login encaminha à área do perfil ou ao destino pretendido | Permanecer em `/`; usar criação ou recuperação de conta | Estática; não exercitada no navegador |
| Administrador | Menu `Início`, `Produtos`, `Usuários`, `Empréstimos`, `Auditoria` | `frontend/src/components/ui/app-sidebar.tsx`; `frontend/src/navigation/profileNavigation.ts`; `frontend/src/routes.tsx` (`BaseAdmin`, `PrivateRoute`, `ApenasAdministradores`) | `perfis-e-permissoes.md#perfis`; `administrador.md#j06-preparar-operacao` | Sessão de Administrador habilitada e sem troca obrigatória pendente | Área `/admin/` e ações administrativas ficam disponíveis | `Conta` > `Sair`, que limpa a sessão e retorna a `/` | Rotas, menu e guarda confirmados estaticamente |
| Mentor | Menu `Início`, `Histórico`, `Criar Empréstimo`, `Solicitações`, `Pesquisar Material` | `frontend/src/components/ui/app-sidebar.tsx`; `frontend/src/navigation/profileNavigation.ts`; `frontend/src/routes.tsx` (`BaseMentor`, `PrivateRoute`, `ApenasResponsaveis`) | `perfis-e-permissoes.md#perfis`; `mentor.md#j08-emprestimos-mentor` | Sessão de Mentor habilitada e sem troca obrigatória pendente | Área `/mentor/` e ações de acompanhamento ficam disponíveis | `Conta` > `Sair`; ou `Voltar para minha área` em acesso negado | Rotas, menu e guarda confirmados estaticamente |
| Mentorado | Menu `Início`, `Pesquisar Material`, `Histórico Pessoal` | `frontend/src/components/ui/app-sidebar.tsx`; `frontend/src/navigation/profileNavigation.ts`; `frontend/src/routes.tsx` (`BaseMentee`, `PrivateRoute`, `ApenasDependentes`) | `perfis-e-permissoes.md#perfis`; `mentorado.md#j08-acompanhamento-mentorado` | Sessão de Mentorado habilitada e sem troca obrigatória pendente | Área `/mentee/` e ações pessoais ficam disponíveis | `Conta` > `Sair`; ou voltar à própria área | Rotas, menu e guarda confirmados estaticamente |

### J02 — Solicitar cadastro

| Variante/perfil | Ação visível e entrada | Fontes verificáveis | Página/âncora planejada | Pré-requisito | Resultado esperado | Saída segura | Estado da evidência |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Mentor | Em `/create-account`, escolher `Mentor`; preencher nome, email, senha, confirmação, instituição, curso, cidade, telefone e, quando aplicável, `Email do Mentor Responsável`; marcar termos e clicar `Criar Conta` | `frontend/src/routes.tsx`; `frontend/src/pages/CreateAccount.tsx`; `frontend/src/contracts/userRegistration.ts`; `frontend/src/integration/Auth.ts`; `backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs` (`POST /api/Usuarios`) | `acesso-e-conta.md#j02-cadastro`; `mentor.md#j03-aprovacao-mentor` | Estar deslogado; dados válidos; responsável informado quando exigido pelo serviço | Toast `Cadastro submetido à aprovação!`; solicitação fica pendente e a página retorna ao login | Corrigir validações; em falha, usar a mensagem e tentar novamente; não prometer acesso imediato | Formulário, contrato e controller confirmados estaticamente |
| Mentorado | Em `/create-account`, escolher `Mentorado`; preencher os campos do formulário e clicar `Criar Conta` | `frontend/src/routes.tsx`; `frontend/src/pages/CreateAccount.tsx`; `frontend/src/contracts/userRegistration.ts`; `frontend/src/integration/Auth.ts`; `backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs` | `acesso-e-conta.md#j02-cadastro`; `mentorado.md#j02-cadastro-mentorado` | Estar deslogado; dados válidos; email do Mentor responsável válido | Solicitação é criada com status pendente; o acesso só ocorre após aprovação | Corrigir o campo indicado ou fechar a tentativa; em falha, continuar sem sessão e procurar o responsável | Formulário, contrato e controller confirmados; aprovação humana pendente |

### J03 — Avaliar cadastro e vínculos

| Variante/perfil | Ação visível e entrada | Fontes verificáveis | Página/âncora planejada | Pré-requisito | Resultado esperado | Saída segura | Estado da evidência |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Administrador | Em `Usuários > Aprovar/Reprovar`, pesquisar/ordenar solicitações e usar `Aprovar` ou `Recusar` | `frontend/src/routes.tsx` (`/admin/register-request`); `frontend/src/components/ui/app-sidebar.tsx`; `frontend/src/pages/RegistrationRequests.tsx`; `frontend/src/integration/Class.ts`; `backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs` (`GET /api/Usuarios/aprovacao`, `PATCH /api/Usuarios/{id}/aprovar|rejeitar`) | `administrador.md#j03-aprovacao-admin`; `perfis-e-permissoes.md#j03-aprovacao` | Sessão de Administrador; solicitação que esteja no escopo retornado pela tela | Usuário é habilitado ou desabilitado e a listagem é atualizada | Voltar para `Usuários`; sair se a sessão não puder continuar | A tela e as rotas Admin foram confirmadas, mas a implementação visível usa também endpoint dependente; escopo real da tela requer exercício |
| Mentor | Em `Solicitações`, pesquisar/ordenar solicitações e usar `Aprovar` ou `Recusar` | `frontend/src/routes.tsx` (`/mentor/users-request`); `frontend/src/components/ui/app-sidebar.tsx`; `frontend/src/pages/RegistrationRequests.tsx`; `frontend/src/integration/Class.ts`; `backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs` (`GET /api/Usuarios/{usuarioId}/dependentes/aprovacao`, `PATCH /api/Usuarios/dependentes/{id}/aprovar|rejeitar`) | `mentor.md#j03-aprovacao-mentor`; `perfis-e-permissoes.md#j03-aprovacao` | Sessão de Mentor responsável; dependente pendente vinculado a esse Mentor | Dependente é habilitado ou desabilitado e a lista é recarregada | Voltar para `Minha turma`; não orientar aprovação de solicitação fora do vínculo | Guarda e endpoints dependentes confirmados; resposta de aprovação tem incompatibilidade de parsing no cliente, registrada abaixo |

### J04 — Fazer login e primeiro acesso

| Variante/perfil | Ação visível e entrada | Fontes verificáveis | Página/âncora planejada | Pré-requisito | Resultado esperado | Saída segura | Estado da evidência |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Todos | Submeter `Email` e `Senha` em `/`; seguir o redirecionamento para `/change-password-required` quando solicitado; preencher senha atual, nova senha e confirmação; clicar para alterar | `frontend/src/pages/Login.tsx`; `frontend/src/pages/ChangePassword.tsx`; `frontend/src/components/base/PasswordChangeRequiredRoute.tsx`; `frontend/src/auth/session.ts`; `backend/LabSolos-Server-DotNet8/Controllers/AuthController.cs`; `backend/LabSolos-Server-DotNet8/Program.cs` | `acesso-e-conta.md#j04-primeiro-acesso` | Credencial válida; para primeiro acesso, sessão com `requiresPasswordChange`; nova senha de 15–128 caracteres e não bloqueada | Senha é alterada; sessão é limpa e o usuário precisa autenticar novamente | Corrigir senha/campo; se a sessão expirar, voltar ao login; não registrar senha no manual | Políticas, guardas e telas confirmados estaticamente |
| Administrador inicial | Entrar com a conta sintética criada pelo seed e cumprir a troca obrigatória antes da área Admin | `backend/LabSolos-Server-DotNet8/Data/Seeds/SeedUsuarios.cs`; `backend/LabSolos-Server-DotNet8/Program.cs` | `acesso-e-conta.md#j04-primeiro-acesso`; `administrador.md#j01-acesso` | Ambiente sintético com `Seed:AdminEmail` e senha fornecidos fora do documento | Conta deixa de exigir a troca e pode seguir para `/admin` após novo login | Não publicar os valores do seed; usar `Sair` ou encerrar o ambiente sintético | Seed inspecionado; exercício e valores reais pendentes |

### J05 — Alterar/recuperar senha e sair

| Variante/perfil | Ação visível e entrada | Fontes verificáveis | Página/âncora planejada | Pré-requisito | Resultado esperado | Saída segura | Estado da evidência |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Todos, alteração obrigatória | Usar `/change-password-required`; informar senha atual, nova senha e confirmação | `frontend/src/routes.tsx`; `frontend/src/pages/ChangePassword.tsx`; `backend/LabSolos-Server-DotNet8/Controllers/AuthController.cs`; `frontend/src/auth/passwordPolicy.ts` | `acesso-e-conta.md#j05-senha-saida` | Sessão com troca obrigatória; senha nova conforme política | Senha atualizada, sessão encerrada e novo login necessário | Corrigir validação ou retornar ao login | Tela e endpoint confirmados; exercício pendente |
| Todos, recuperação | Em `/forgot-your-password`, informar email e clicar `Enviar e-mail de recuperação`; abrir o link/token e usar `/reset-password` com email, token, nova senha e confirmação | `frontend/src/routes.tsx`; `frontend/src/pages/ForgotPassword.tsx`; `frontend/src/pages/ResetPassword.tsx`; `frontend/src/integration/Auth.ts`; `backend/LabSolos-Server-DotNet8/Controllers/EmailController.cs` | `acesso-e-conta.md#j05-senha-saida` | Acesso ao canal de email sintético; token ainda válido | Mensagem neutra é exibida; senha é redefinida; novo login é necessário | Para token inválido/expirado, solicitar novo email; não divulgar se um email existe | Fluxo e respostas neutras confirmados estaticamente |
| Todos, saída | Usar `Conta > Sair` ou o `Logout` das páginas de perfil | `frontend/src/components/nav-user.tsx`; `frontend/src/components/global/ButtonLogout.tsx`; `frontend/src/auth/session.ts`; `frontend/src/routes.tsx` | `acesso-e-conta.md#j05-senha-saida` | Sessão ativa | Cookies e contexto da sessão são limpos e a aplicação vai para `/` | Fechar a sessão e não reutilizar uma tela protegida no histórico | Logout confirmado estaticamente |

### J06 — Preparar a operação administrativa

| Variante/perfil | Ação visível e entrada | Fontes verificáveis | Página/âncora planejada | Pré-requisito | Resultado esperado | Saída segura | Estado da evidência |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Administrador | Em `Produtos`, usar `Adicionar` para cadastrar bens; em `Usuários`, usar `Ver todos` e o controle de status; pesquisar usuários e materiais antes de operar | `frontend/src/routes.tsx`; `frontend/src/components/ui/app-sidebar.tsx`; `frontend/src/pages/insert/Register.tsx`; `frontend/src/pages/RegisteredUsers.tsx`; `frontend/src/components/global/UserStatusManager.tsx`; `frontend/src/components/screens/SearchMaterialComponent.tsx`; `backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs`; `backend/LabSolos-Server-DotNet8/Controllers/ProdutosController.cs` | `administrador.md#j06-preparar-operacao` | Sessão Admin; catálogo e usuários de teste; status de outro usuário para mudança | Produto criado ou usuários consultados/atualizados conforme controles visíveis | `Cancelar`, voltar à tela pai ou sair; não alterar o próprio status | Telas, rotas, guardas e controllers confirmados estaticamente |

### J07 — Consultar e administrar materiais

| Variante/perfil | Ação visível e entrada | Fontes verificáveis | Página/âncora planejada | Pré-requisito | Resultado esperado | Saída segura | Estado da evidência |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Administrador | Em `Produtos > Meus Produtos`, pesquisar, ordenar, filtrar por `Todos`, `Vidraria`, `Químico` ou `Outro`; abrir `Verificação`; usar `Editar Produto`; consultar `Histórico` e `Alertas` | `frontend/src/pages/insert/Register.tsx`; `frontend/src/components/screens/SearchMaterialComponent.tsx`; `frontend/src/components/screens/VerificationPage.tsx`; `frontend/src/pages/products/ProductHistory.tsx`; `frontend/src/pages/FollowUp.tsx`; `frontend/src/integration/Product.ts`; `backend/LabSolos-Server-DotNet8/Controllers/ProdutosController.cs` | `administrador.md#j07-materiais-admin` | Sessão Admin; produto existente; para editar, permissão Admin | Lista, detalhe, histórico ou alerta correspondente é exibido; edição persiste quando aceita | Voltar para a pesquisa; cancelar edição; usar retry quando a tela oferecer | Rotas e ações confirmadas; histórico contém elementos ainda incompletos, ver incompatibilidades |
| Mentor | Em `Pesquisar Material`, pesquisar/ordenar/filtrar e abrir `Verificação` de um material | `frontend/src/routes.tsx`; `frontend/src/components/ui/app-sidebar.tsx`; `frontend/src/components/screens/SearchMaterialComponent.tsx`; `frontend/src/components/screens/VerificationPage.tsx`; `backend/LabSolos-Server-DotNet8/Controllers/ProdutosController.cs` | `mentor.md#j07-consulta-materiais-mentor` | Sessão Mentor; produto disponível | Consulta mostra item, fórmula/grupo/status conforme a visão do Mentor; não há edição visível | Voltar para `Pesquisar Material` | Rota, guarda e diferença de campos confirmadas estaticamente |
| Mentorado | Em `Pesquisar Material`, pesquisar/ordenar/filtrar e abrir `Verificação` | `frontend/src/routes.tsx`; `frontend/src/components/ui/app-sidebar.tsx`; `frontend/src/components/screens/SearchMaterialComponent.tsx`; `frontend/src/components/screens/VerificationPage.tsx`; `backend/LabSolos-Server-DotNet8/Controllers/ProdutosController.cs` | `mentorado.md#j07-consulta-materiais-mentorado` | Sessão Mentorado; produto existente | Consulta mostra somente a visão de consulta do Mentorado, sem ação administrativa | Voltar para a pesquisa | Rota, guarda e visão reduzida confirmadas estaticamente |

### J08 — Solicitar e acompanhar empréstimo

| Variante/perfil | Ação visível e entrada | Fontes verificáveis | Página/âncora planejada | Pré-requisito | Resultado esperado | Saída segura | Estado da evidência |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Mentor, solicitar | Em `Criar Empréstimo`, selecionar um Mentorado habilitado, produto, quantidade e unidade; usar `Adicionar`, `Remover` quando necessário e `Solicitar Empréstimo` | `frontend/src/pages/mentor/LoanCreation.tsx`; `frontend/src/integration/Loans.ts`; `backend/LabSolos-Server-DotNet8/Controllers/EmprestimosController.cs` (`POST /api/Emprestimos`) | `mentor.md#j08-emprestimos-mentor` | Sessão Mentor; Mentorado habilitado; produtos e quantidade disponíveis | Solicitação pendente é enviada para avaliação Admin; prazo visível no contrato é fixado pelo fluxo | Remover item, voltar à área Mentor ou sair; não orientar o Mentor a aprovar a própria solicitação | Ações, payload e controller confirmados estaticamente |
| Mentor, acompanhar | Em `Histórico`, abrir o histórico da turma, pesquisar e abrir o detalhe de empréstimo | `frontend/src/pages/mentor/HistoryClass.tsx`; `frontend/src/pages/mentor/MentoringHistory.tsx`; `frontend/src/pages/loan/LoanHistory.tsx`; `frontend/src/integration/Loans.ts`; `backend/LabSolos-Server-DotNet8/Controllers/EmprestimosController.cs` | `mentor.md#j08-emprestimos-mentor`; `mentor.md#j10-turma-mentor` | Sessão Mentor; vínculo com a turma; empréstimo retornado pela API | Situação, pessoa vinculada e itens do empréstimo são consultáveis | Usar `Voltar para minha área`/histórico; sair se não houver sessão | Rotas e consultas confirmadas; controles de decisão indevidos no detalhe estão registrados |
| Mentorado, acompanhar | Em `Histórico Pessoal`, pesquisar por data e abrir o detalhe; consultar itens sem criar ou decidir empréstimo | `frontend/src/pages/mentee/HistoryMentoring.tsx`; `frontend/src/pages/mentee/LoanHistory.tsx`; `frontend/src/integration/Loans.ts`; `backend/LabSolos-Server-DotNet8/Controllers/EmprestimosController.cs` | `mentorado.md#j08-acompanhamento-mentorado` | Sessão Mentorado; empréstimo próprio disponível | Histórico pessoal e detalhe somente para consulta são exibidos | Voltar ao histórico pessoal ou à área Mentorado | Tela read-only, rota e guarda confirmadas estaticamente |

### J09 — Decidir e concluir empréstimo

| Variante/perfil | Ação visível e entrada | Fontes verificáveis | Página/âncora planejada | Pré-requisito | Resultado esperado | Saída segura | Estado da evidência |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Administrador | Em `Empréstimos > Solicitações`, pesquisar e usar `Aprovar` ou `Recusar`; em `Todos`, filtrar e abrir detalhe; em `Registrar Devolução`, usar `Registrar Devolução` para empréstimo aprovado | `frontend/src/routes.tsx`; `frontend/src/components/ui/app-sidebar.tsx`; `frontend/src/pages/admin/LoansRequest.tsx`; `frontend/src/pages/admin/AllLoans.tsx`; `frontend/src/pages/admin/ReturnLoan.tsx`; `frontend/src/pages/loan/LoanHistory.tsx`; `frontend/src/integration/Loans.ts`; `backend/LabSolos-Server-DotNet8/Controllers/EmprestimosController.cs` (`GET /api/Emprestimos`, `PATCH /aprovar`, `/reprovar`, `/devolver`) | `administrador.md#j09-emprestimos-admin` | Sessão Admin; solicitação pendente para decidir; empréstimo aprovado e não devolvido para concluir | Solicitação muda de estado; devolução registra data e restaura estoque conforme serviço | Voltar para `Todos`; não repetir operação já concluída; sair | Rotas, ações, guardas e autorização Admin confirmadas estaticamente |

### J10 — Consultar turma, usuários e perfil

| Variante/perfil | Ação visível e entrada | Fontes verificáveis | Página/âncora planejada | Pré-requisito | Resultado esperado | Saída segura | Estado da evidência |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Administrador | Em `Usuários`, consultar todos, pesquisar/ordenar/filtrar por perfil/status, abrir a turma/histórico relacionado e alterar status de outro usuário | `frontend/src/pages/RegisteredUsers.tsx`; `frontend/src/components/global/UserStatusManager.tsx`; `frontend/src/navigation/profileNavigation.ts`; `frontend/src/pages/Profile.tsx`; `backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs` | `administrador.md#j10-usuarios-admin`; `perfis-e-permissoes.md#j10-perfis` | Sessão Admin; usuário existente; confirmação para alterar status | Lista e perfil relacionado são abertos; status permitido pela tela é aplicado após confirmação | Cancelar confirmação; voltar a `Usuários`; não alterar o próprio status | Tela, rota e controller confirmados; escopo real de notificações pendentes requer exercício |
| Mentor, turma ativa | Em `Minha turma`, consultar dependentes e abrir histórico/perfil; usar `Desativar Mentorado` quando a tela disponibilizar a ação | `frontend/src/routes.tsx`; `frontend/src/pages/mentor/MyClass.tsx`; `frontend/src/pages/mentor/MentoringHistory.tsx`; `frontend/src/pages/mentor/Profile.tsx`; `frontend/src/navigation/profileNavigation.ts`; `backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs` | `mentor.md#j10-turma-mentor`; `perfis-e-permissoes.md#j10-perfis` | Sessão Mentor; dependentes vinculados | Turma e dados de acompanhamento são exibidos; ação visível altera o vínculo conforme serviço | Voltar para `Minha turma`; não orientar a editar dados que a tela não oferece | Rotas e telas confirmadas; comportamento da variante `disabled` é incompatível, ver abaixo |
| Mentor, turma desativada | Abrir `/mentor/my-class/disabled` a partir do contexto de turma | `frontend/src/routes.tsx`; `frontend/src/navigation/profileNavigation.ts`; `frontend/src/pages/mentor/Disabled.tsx` | `mentor.md#j10-turma-mentor` | Sessão Mentor; acesso à rota | A página deveria listar desativados, mas a filtragem entregue deve ser exercitada antes de documentar | Voltar para `/mentor/my-class` | Rota existe; resultado funcional pendente e apontado como incompatibilidade |
| Mentorado | Abrir `Meu perfil` ou `/mentee/profile` e consultar dados e histórico pessoal | `frontend/src/navigation/profileNavigation.ts`; `frontend/src/pages/mentee/Profile.tsx`; `frontend/src/pages/mentee/HistoryMentoring.tsx`; `frontend/src/routes.tsx` | `mentorado.md#j10-perfil-mentorado`; `perfis-e-permissoes.md#j10-perfis` | Sessão Mentorado | Perfil e indicadores/histórico próprios são exibidos, sem menu administrativo | Usar `Sair` ou voltar à área Mentorado | Tela read-only e guarda confirmadas estaticamente |

### J11 — Tratar vazios, erros, acesso negado e sessão

| Variante/perfil | Ação visível e entrada | Fontes verificáveis | Página/âncora planejada | Pré-requisito | Resultado esperado | Saída segura | Estado da evidência |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Todos, validação/rede/servidor | Ler `ErrorFeedback`; usar `Tentar novamente` quando disponível; corrigir campo quando a mensagem for de validação | `frontend/src/errors/errorCatalog.ts`; `frontend/src/components/global/ErrorFeedback.tsx`; páginas de cadastro, aprovações, empréstimos e alertas | `solucao-de-problemas.md#j11-falhas` | Erro controlado ou campo inválido | Mensagem diferencia validação, rede, timeout, servidor, conflito e não encontrado quando o componente é usado | Voltar para a página pai; não apagar dados do navegador como tentativa genérica | Catálogo e componente confirmados; cobertura por página ainda precisa de exercício |
| Todos, sessão expirada | Acessar página protegida sem sessão ou após expiração | `frontend/src/components/base/PrivateRoutes.tsx`; `frontend/src/auth/session.ts`; `frontend/src/auth/intendedRoute.ts`; `frontend/src/components/global/ButtonLogout.tsx` | `solucao-de-problemas.md#j11-falhas`; `acesso-e-conta.md#j05-senha-saida` | Sessão ausente, incoerente ou expirada | Redirecionamento para login preserva o destino pretendido quando aplicável | Autenticar novamente ou sair; não reutilizar token/cookie antigo | Guarda e limpeza de sessão confirmadas estaticamente |
| Todos, acesso incompatível | Tentar rota de outro perfil | `frontend/src/components/base/PrivateRoutes.tsx`; `frontend/src/navigation/profileNavigation.ts`; `frontend/src/routes.tsx` | `solucao-de-problemas.md#j11-falhas`; `perfis-e-permissoes.md#perfis` | Sessão válida com papel diferente | Exibe `Acesso negado` e `Voltar para minha área`; papel não suportado exibe `Acesso indisponível` e `Sair` | Voltar para a própria área ou sair | Guarda, mensagens e saídas confirmadas estaticamente |
| Todos, rota/recurso ausente | Abrir `*`/`Page404` ou detalhe sem identificador válido | `frontend/src/routes.tsx`; `frontend/src/pages/Page404.tsx`; `frontend/src/components/global/BackLink.tsx`; `frontend/src/components/screens/VerificationPage.tsx` | `solucao-de-problemas.md#j11-falhas` | URL inexistente ou id ausente/inválido | Mensagem de não encontrado/seleção necessária com retorno contextual | Usar `Voltar`; retornar à pesquisa ou à área do perfil | Comportamento e âncoras de retorno confirmados estaticamente |

## Mapa de rotas, menus e guardas

As rotas protegidas abaixo usam `PrivateRoute` e a guarda de papel indicada. A guarda de sessão também redireciona para `/change-password-required` quando `requiresPasswordChange` está ativo. O `Program.cs` aplica as políticas correspondentes no backend; a rota do cliente não substitui a autorização do servidor.

| Perfil | Menu/atalho visível | Rota e página | Guarda/política observada |
| --- | --- | --- | --- |
| Administrador | Início | `/admin/` — `HomeAdmin` | `Administrador`; `ApenasAdministradores` |
| Administrador | Meus Produtos | `/admin/search-material` — `SearchMaterial` | `Administrador`; `ApenasAdministradores` |
| Administrador | Adicionar | `/admin/insert` — `Register` | `Administrador`; `ApenasAdministradores` |
| Administrador | Alertas | `/admin/follow-up` — `FollowUp` | `Administrador`; `ApenasAdministradores` |
| Administrador | Ver todos | `/admin/users` — `RegisteredUsers` | `Administrador`; `ApenasAdministradores` |
| Administrador | Aprovar/Reprovar | `/admin/register-request` — `RegistrationRequests` | `Administrador`; `ApenasAdministradores` |
| Administrador | Solicitações | `/admin/loans-request` — `LoansRequest` | `Administrador`; `ApenasAdministradores` |
| Administrador | Histórico | `/admin/all-loans` — `AllLoans` | `Administrador`; `ApenasAdministradores` |
| Administrador | Auditoria | `/admin/auditoria` — `Auditoria` | `Administrador`; escopo editorial não definido |
| Mentor | Início | `/mentor/` — `HomeMentor` | `Mentor`; `ApenasResponsaveis` |
| Mentor | Histórico | `/mentor/history/class` — `HistoryClass` | `Mentor`; `ApenasResponsaveis` |
| Mentor | Criar Empréstimo | `/mentor/loan/creation` — `LoanCreation` | `Mentor`; `ApenasResponsaveis` |
| Mentor | Solicitações | `/mentor/users-request` — `RegistrationRequests` | `Mentor`; `ApenasResponsaveis` |
| Mentor | Pesquisar Material | `/mentor/search-material` — `SearchMaterialMentor` | `Mentor`; `ApenasResponsaveis` |
| Mentorado | Início | `/mentee/` — `HomeMentee` | `Mentorado`; `ApenasDependentes` |
| Mentorado | Pesquisar Material | `/mentee/search-material` — `SearchMaterialMentee` | `Mentorado`; `ApenasDependentes` |
| Mentorado | Histórico Pessoal | `/mentee/history/mentoring` — `HistoryMentoring` | `Mentorado`; `ApenasDependentes` |

Rotas de detalhe e apoio confirmadas no mesmo arquivo de rotas incluem `/admin/verification`, `/mentor/verification`, `/mentee/verification`, `/admin/products/:id/history`, `/admin/history/loan`, `/mentor/history/loan`, `/mentee/history/loan`, `/admin/return`, `/admin/view-class`, `/admin/view-class-mentor`, `/admin/view-history-class-by-id`, `/mentor/history/mentoring` e `/mentor/my-class/disabled`. Elas são destinos contextuais, não novos perfis. `/admin/settings` existe sob a guarda Admin, mas não aparece no menu inspecionado. O atalho de perfil é `/admin/profile`, `/mentor/profile` ou `/mentee/profile`; `nav-user` expõe `Conta` e `Sair`.

## Termos editoriais e rastreabilidade

| Termo no manual | Nome/ação no produto | Observação |
| --- | --- | --- |
| Área Admin | `Administrador`, `/admin/` | Não usar “admin” como novo perfil |
| Área do Mentor | `Mentor`, `/mentor/` | Inclui turma, solicitações e criação de empréstimo |
| Área do Mentorado | `Mentorado`, `/mentee/` | “Mentee” é somente nome técnico de rota/componente |
| Solicitações de cadastro | `RegistrationRequests` | A tela Admin e a tela Mentor não têm necessariamente o mesmo escopo de dados |
| Pesquisar Material | `SearchMaterialComponent` | Resultado depende do perfil; detalhe é `VerificationPage` |
| Histórico | `HistoryClass`, `AllLoans`, `LoanHistory`, `HistoryMentoring` | Sempre indicar o perfil e o tipo de histórico |
| Saída | `Sair`/`Logout` | Limpa cookies e contexto de autenticação |
| Alertas | `FollowUp` | Admin; estoque e validade |

Fontes centrais para revisão futura: `frontend/src/routes.tsx`, `frontend/src/components/ui/app-sidebar.tsx`, `frontend/src/navigation/profileNavigation.ts`, `frontend/src/components/base/PrivateRoutes.tsx`, `frontend/src/components/base/PasswordChangeRequiredRoute.tsx`, `frontend/src/auth/session.ts`, `frontend/src/auth/passwordPolicy.ts`, `frontend/src/errors/errorCatalog.ts`, `frontend/src/components/global/ErrorFeedback.tsx`, `frontend/src/components/global/BackLink.tsx`, e os controllers `AuthController.cs`, `EmailController.cs`, `UsuariosController.cs`, `ProdutosController.cs` e `EmprestimosController.cs` em `backend/LabSolos-Server-DotNet8/Controllers/`.

## Incompatibilidades e limites conhecidos

Estas ocorrências foram encontradas no produto real e devem permanecer explícitas até revisão/execução. Nenhuma delas foi convertida em promessa do manual.

| Item | Evidência | Impacto editorial |
| --- | --- | --- |
| Política de senha divergente | `Login.tsx` valida mínimo 8 no login; `passwordPolicy.ts`, `AuthController.cs` e `PasswordPolicy.cs` indicam 15–128 para troca/cadastro no backend | Documentar a política efetiva de 15–128 somente após confirmar o endpoint de cadastro; não garantir que uma senha de 8–14 seja aceita |
| Alteração ordinária de senha sem entrada | `ChangePassword.tsx` suporta o modo ordinário e `AuthController.cs` tem `change-password`, mas `routes.tsx` só expõe `/change-password-required`; não há atalho de alterar senha no menu/perfil | Documentar apenas primeiro acesso até existir rota/ação visível para alteração ordinária |
| Aprovação Admin com escopo ambíguo | A tela `/admin/register-request` chama `/{rankID}/dependentes/aprovacao`; o controller também possui `GET /aprovacao` e aprovação Admin global | Não dizer que Admin vê todos os pendentes sem exercício que confirme o escopo |
| Parsing da aprovação do dependente | `frontend/src/integration/Class.ts` interpreta a resposta de aprovação com schema de empréstimos; `UsuariosController.cs` devolve envelope `Message` + `Usuario` | A aprovação pode persistir no servidor e falhar na atualização da tela; registrar como impedimento e orientar retry somente após confirmação |
| Decisão de empréstimo exposta ao Mentor | `frontend/src/pages/loan/LoanHistory.tsx` renderiza `Aceitar`/`Rejeitar` para status não aprovado no detalhe Mentor; `EmprestimosController.cs` autoriza essas operações somente a Admin | Nunca instruir Mentor a aprovar/rejeitar; validar e corrigir a interface antes de publicar o fluxo |
| Devolução em detalhe compartilhado | O detalhe compartilhado exibe devolução para Admin e Mentor; o backend aceita devolução para Admin ou Mentor | Confirmar regra operacional e responsável pela devolução; manter decisão fora do texto até revisão |
| Vazio pode mascarar falha | `SearchMaterialComponent`, `MyClass.tsx`, `Disabled.tsx` e `LoanCreation.tsx` capturam falhas de carregamento e podem deixar lista vazia sem `ErrorFeedback` equivalente | Diferenciar “nenhum registro” de “falha de serviço” somente com evidência de navegador/ambiente; não usar vazio como prova de ausência |
| Histórico de produto incompleto | `ProductHistory.tsx` contém placeholders de gráfico, filtro de data incompleto e texto de data/localização inválido | Não descrever gráfico/filtros como entregues |
| Página de desativados filtra estado incompatível | `Disabled.tsx` foi encontrado usando filtragem de `Habilitado` apesar da rota `/mentor/my-class/disabled` e do propósito nominal | Não prometer lista de desativados sem exercício e correção/decisão do produto |
| Papéis desconhecidos | `app-sidebar.tsx` usa `Administrador` como fallback para tipo ausente/desconhecido; `PrivateRoutes.tsx` trata papel não suportado como indisponível | Manual cobre apenas os três papéis suportados; comportamento de dado inválido deve ser tratado como falha, não como acesso Admin |
| Rotas fora do menu | `/admin/auditoria` e `/admin/settings` existem, mas `settings` não aparece no menu e Auditoria não tem jornada J01–J11 definida | Não criar seção operacional para essas rotas sem decisão de escopo e responsável |
| Status visíveis são parciais | `UserStatusManager.tsx` permite apenas `Habilitado`/`Desabilitado`; o backend conhece também estados como pendente | Descrever somente o controle visível e não inferir todos os estados do domínio |

## Versão do produto e responsabilidade de revisão

O snapshot a exercitar, se o ambiente for construído a partir do mesmo estado, é o commit completo `2c78dbe1c3ec41f4004f53c42be8fed556080192`. O frontend informa `version: 0.0.0` no `package.json` e monta `VersionDisplay` com versão, hash e data de build; a versão de release obtida dinamicamente não foi confirmada. Portanto, a versão publicada do manual permanece pendente e deve ser preenchida somente após build/exercício do produto.

O responsável real pela revisão continua **não confirmado**. O PRD marca o responsável como não definido, e nenhuma evidência humana foi criada nesta tarefa. Não declarar aprovação, aceite, autoria ou validação por perfil.

## Necessidades do ambiente sintético

Para a futura validação de navegador, o ambiente deve ser sintético e reproduzível, usando `docker-compose-e2e.yml`, `frontend/playwright.config.ts` e os fixtures de `frontend/e2e/`. Não registrar credenciais reais, tokens ou dados pessoais no manual.

- Conta Admin de seed com email/senha fornecidos fora do artefato e `ExigeTrocaSenha=true`, para J04.
- Conta Mentor habilitada e Mentorado habilitado vinculados ao Mentor; pelo menos um pedido de cadastro pendente no escopo do Mentor e outro cenário para a aprovação global Admin, para J02/J03/J10.
- Produtos sintéticos dos tipos Químicos, Vidrarias e Outros, com quantidade suficiente, alerta de estoque/validade e histórico, para J06/J07.
- Empréstimos sintéticos pendente, aprovado não devolvido e rejeitado, com estoque que possa ser restaurado, para J08/J09.
- Postgres isolado e reinicializável; backend/frontend em rede E2E; Mailpit para recuperar token sem email real, conforme `docker-compose-e2e.yml`.
- Navegador Chromium em `http://127.0.0.1:4173` por padrão; dados limpos entre perfis e entre fluxos mutáveis.
- Falhas controladas de rede, timeout, autorização, recurso ausente e token expirado para J11; registrar resultado observado, não apenas o resultado esperado.
- Contas, senhas, tokens e valores de seed entregues por canal seguro e nunca gravados neste inventário.

## Pendências de evidência

1. Exercitar J01–J11 no produto construído a partir do snapshot e registrar a versão efetivamente exibida.
2. Confirmar com o responsável real a revisão, a terminologia final e o escopo das rotas Admin de Auditoria/Configurações.
3. Revalidar as incompatibilidades listadas com dados sintéticos e registrar impedimentos sem alegar aprovação humana.
4. Só depois publicar o manual e seu manifesto de fontes; este arquivo não é a publicação nem contém autorização de publicação.

## Checklist objetivo da T001

- [x] J01–J11 possuem variantes/perfis, ação visível, fontes, destino editorial, pré-requisito, resultado e saída segura.
- [x] Rotas, menus, páginas, guardas e controllers relevantes estão apontados por caminho verificável.
- [x] Evidência estática está separada de exercício de navegador e não há declaração de aprovação humana.
- [x] Recursos ocultos/endpoints sem ação visível não foram promovidos a operações do manual.
- [x] Versão/snapshot, responsável não confirmado, ambiente sintético e incompatibilidades estão registrados.
- [x] O artefato está restrito a `.codex/docs/specs/manual-usuario/inventario.md`; `tasks.md` não é editado por esta tarefa.
