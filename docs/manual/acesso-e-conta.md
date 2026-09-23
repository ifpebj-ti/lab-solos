# Acesso e conta

Esta página orienta as jornadas de solicitação de cadastro, primeiro acesso, login, senha e saída do LabOn. Ela vale para os perfis `Administrador`, `Mentor` e `Mentorado`, conforme a ação indicada em cada seção.

O endereço da aplicação é fornecido pela instituição. Não registre senhas, tokens, links de redefinição ou outros segredos em chamados, documentos ou capturas. A presença de uma conta no sistema não significa que ela já esteja habilitada.
Volte ao [índice do manual](README.md#visao-geral) para escolher outra jornada ou perfil.

Versão do manual: `2026-09-23.1`

Produto validado: `8c2a8bd173723b8b154aad03da2f511499fbb83b`

Atualizado em: `2026-09-23`

Responsável pela revisão: `nathannmvr`

<a id="j02-cadastro"></a>

## J02 — Solicitar cadastro

**Quem pode executar:** Mentor e Mentorado que ainda não possuem acesso.

**Pré-requisitos:** estar fora de uma sessão, ter os dados solicitados e escolher uma senha aceita pelo sistema.

**Onde começar:** tela de login, pelo controle `Crie a sua agora.`.

**Passos:** siga a lista numerada desta seção.

**Resultado esperado:** o cadastro é enviado para decisão e permanece pendente até a aprovação.

**Erros comuns:** dados inválidos, responsável inexistente, confirmação diferente ou indisponibilidade temporária.

**Saída segura:** volte ao login e não tente cadastrar Administrador nem contornar a aprovação.

### Quem pode executar

Pessoas que ainda não possuem acesso e pretendem usar o perfil `Mentor` ou `Mentorado`. O formulário público não oferece `Administrador` como tipo de usuário. A conta administrativa inicial é criada e entregue por um responsável pelo ambiente; não tente obtê-la pelo cadastro público.

### Pré-requisitos

- Estar fora de uma sessão do LabOn.
- Ter os dados institucionais verdadeiros e atualizados que o formulário solicitar: `Nome Completo`, `Email`, `Senha`, `Confirme sua Senha`, `Instituição`, `Curso`, `Cidade`, `Telefone` e `Email do Mentor Responsável`.
- Para `Mentorado`, ter o email válido do `Mentor` ou `Administrador` responsável pelo vínculo.
- Escolher uma senha que atenda à política do sistema: de 15 a 128 caracteres e que não seja bloqueada por ser comum. Não use nenhum valor de senha mostrado em outro lugar como exemplo.

### Onde começar

Na tela de login, use `Crie a sua agora.`. A aplicação abre a tela de cadastro, que também pode ser acessada pelo endereço de cadastro fornecido pela própria aplicação.

### Passos

1. Na tela de cadastro, abra `Tipo de usuário` e escolha `Mentor` ou `Mentorado`.
2. Preencha os campos exibidos. Para telefone, informe 10 ou 11 dígitos; para curso, informe entre 2 e 100 caracteres. Use um email de responsável válido quando o vínculo exigir.
3. Digite a senha novamente em `Confirme sua Senha` e corrija qualquer mensagem apresentada junto ao campo.
4. Leia os `termos e condições` e marque `Aceito os`.
5. Selecione `Criar Conta` uma vez e aguarde a resposta.

### Resultado esperado

Em uma submissão aceita, a aplicação informa `Cadastro submetido à aprovação!`, avisa que está redirecionando para a tela de login e deixa a solicitação aguardando decisão. A aprovação não é imediata: enquanto o cadastro estiver pendente, não há acesso à área do perfil nem promessa de login bem-sucedido. A decisão é feita pelo responsável autorizado, conforme o vínculo e o fluxo do perfil.

### Erros comuns

- Não escolher `Mentor` ou `Mentorado` antes de enviar o formulário.
- Email inválido, telefone fora do formato, instituição ausente, cidade inválida ou curso fora do limite indicado.
- Nome incompleto, senha e confirmação diferentes ou senha recusada por estar fora de 15–128 caracteres ou por ser comum.
- Email do Mentor Responsável inexistente ou incompatível com o vínculo solicitado.
- Submissão recusada pelo serviço, email já utilizado ou indisponibilidade temporária. A mensagem exibida pela tela identifica o campo ou a ação a corrigir; ela não habilita a conta por si só.

### Saída segura

Corrija somente os campos indicados e tente novamente quando a tela oferecer essa opção. Se desistir, feche a tela ou volte ao login; o cadastro público limpa a sessão e não deve deixar você autenticado. Não tente cadastrar `Administrador`, alterar o endereço da aplicação ou chamar uma API para contornar a aprovação.

<a id="j04-primeiro-acesso"></a>

## J04 — Fazer login e concluir o primeiro acesso

**Quem pode executar:** Administrador, Mentor e Mentorado com conta habilitada.

**Pré-requisitos:** endereço, credencial autorizada e nova senha aceita quando a troca for exigida.

**Onde começar:** tela inicial de login.

**Passos:** siga a lista numerada desta seção.

**Resultado esperado:** a pessoa entra na área correspondente ao perfil e conclui a troca inicial quando solicitada.

**Erros comuns:** credencial incorreta, conta pendente, senha rejeitada ou sessão expirada.

**Saída segura:** volte ao login, autentique-se novamente e não reutilize uma tela protegida antiga.

### Quem pode executar

Os três perfis podem fazer login quando a conta estiver habilitada:

| Perfil | Início após um login sem troca pendente |
| --- | --- |
| `Administrador` | Área administrativa, com `Início`, `Produtos`, `Usuários`, `Empréstimos` e `Auditoria` conforme as permissões exibidas. |
| `Mentor` | Área do Mentor, com `Início`, `Histórico`, `Criar Empréstimo`, `Solicitações` e `Pesquisar Material` conforme as permissões exibidas. |
| `Mentorado` | Área do Mentorado, com `Início`, `Pesquisar Material` e `Histórico Pessoal` conforme as permissões exibidas. |

O primeiro acesso administrativo usa a conta inicial entregue pelo responsável do ambiente. Esse valor não é público e não deve ser copiado para este manual. `Mentor` e `Mentorado` só entram depois da aprovação e habilitação do cadastro.

### Pré-requisitos

- Ter o endereço da aplicação e uma credencial recebida por canal autorizado.
- Para `Mentor` ou `Mentorado`, a solicitação de cadastro deve estar aprovada e a conta habilitada.
- Para o primeiro acesso administrativo, ter recebido a credencial inicial fora deste documento.
- Ter disponível uma nova senha conforme a política de 15 a 128 caracteres, diferente de senha bloqueada por ser comum.

### Onde começar

Abra a tela inicial de login. Os controles são `Email`, `Senha` e `Submeter Login`; a mesma tela oferece `Crie a sua agora.` para solicitar cadastro e `Esqueceu sua senha?` para iniciar recuperação.

### Passos

1. Informe o email da conta em `Email` e a credencial em `Senha`.
2. Selecione `Submeter Login` e aguarde o encaminhamento correspondente ao perfil.
3. Se a aplicação abrir `Defina uma nova senha`, informe a credencial atual em `Senha atual`, escolha uma `Nova senha` e repita-a em `Confirme a nova senha`.
4. Selecione `Alterar senha`. Essa troca é obrigatória quando a sessão indicar primeiro acesso; não tente acessar a área administrativa antes de concluí-la.
5. Após a confirmação da troca, faça login novamente na tela inicial usando a nova senha. A aplicação encerra a sessão anterior e exige nova autenticação; não conte com a preservação da sessão após a troca.
6. Depois do novo login, confirme que a área e o menu correspondem ao seu perfil. Se o perfil não corresponder, saia e procure o responsável pelo cadastro.

### Resultado esperado

Uma credencial válida de uma conta habilitada leva à área correspondente ao perfil. A conta administrativa inicial passa a poder seguir para a área de `Administrador` somente depois da troca obrigatória e de um novo login. Uma sessão que exigir troca não libera as áreas protegidas até que a senha seja atualizada.

### Erros comuns

- Email ou senha incorretos, conta ainda pendente, desabilitada ou inexistente.
- Senha nova curta, longa demais, comum ou diferente da confirmação.
- Senha atual incorreta na troca autenticada.
- Sessão expirada ou acesso negado ao tentar abrir uma área de outro perfil.
- Tentar continuar com a tela protegida aberta depois que a troca de senha encerrou a sessão.

### Saída segura

Se o login falhar, permaneça na tela inicial e use recuperação de senha somente para uma conta que você controla. Se a sessão expirar durante o primeiro acesso, volte ao login e autentique-se novamente. Não compartilhe credenciais, não tente trocar o prefixo de uma rota e não use a aprovação de outro perfil como contorno.

<a id="j05-senha-saida"></a>

## J05 — Alterar ou recuperar a senha e sair

**Quem pode executar:** Administrador, Mentor e Mentorado, conforme o fluxo autenticado ou de recuperação disponível.

**Pré-requisitos:** sessão ativa para alteração autenticada ou acesso ao email cadastrado para recuperação.

**Onde começar:** `Configurações` para o Administrador ou `Esqueceu sua senha?` na tela de login.

**Passos:** siga as listas numeradas de alteração, recuperação e logout desta seção.

**Resultado esperado:** a senha é tratada com segurança, uma nova autenticação é feita quando necessária e a saída retorna ao login.

**Erros comuns:** senha atual incorreta, confirmação diferente, token inválido ou sessão expirada.

**Saída segura:** descarte links antigos, não registre segredos e use `Sair` ou o retorno visível.

### Alteração autenticada

#### Quem pode executar

As variantes de alteração de senha são:

- Os três perfis cumprem a troca obrigatória de primeiro acesso descrita em [J04](#j04-primeiro-acesso).
- Depois do login normal, `Administrador` encontra `Alterar senha` na tela protegida `Configurações`.
- No snapshot inspecionado, `Mentor` e `Mentorado` não têm menu nem rota protegida equivalente exposta. Esses perfis podem usar a recuperação abaixo quando precisarem redefinir a senha; não documente acesso direto a uma URL como se a alteração autenticada estivesse disponível.

#### Pré-requisitos

- Para primeiro acesso: sessão emitida pelo login com troca obrigatória pendente.
- Para alteração autenticada do `Administrador`: sessão ativa de `Administrador`, acesso à tela `Configurações`, senha atual e uma nova senha de 15–128 caracteres.
- Para `Mentor` ou `Mentorado`: se a alteração autenticada não estiver disponível no menu, acesso ao email cadastrado para iniciar a recuperação.

#### Onde começar

No primeiro acesso, comece pela tela `Defina uma nova senha` aberta pelo login. Para o `Administrador` após a autenticação, use a tela `Configurações` e o formulário `Alterar senha` quando esse item estiver disponível na navegação da aplicação. Para os demais perfis, comece por `Esqueceu sua senha?` na tela de login quando não houver uma opção autenticada visível.

#### Passos

1. No formulário autenticado, informe a `Senha atual`.
2. Informe uma `Nova senha` com 15–128 caracteres e repita-a em `Confirme a nova senha`.
3. Selecione `Alterar senha` e aguarde a conclusão.
4. Quando a aplicação retornar ao login, autentique-se novamente com a senha nova. A sessão anterior é encerrada para todos os casos de troca; ela não é preservada.

#### Resultado esperado

A senha é alterada somente se a senha atual, a nova senha, a confirmação e as regras do servidor forem aceitas. Ao concluir, a sessão é limpa e a aplicação retorna ao login; o novo acesso exige autenticação novamente.

#### Erros comuns

- `A senha atual está incorreta.`
- `A confirmação da senha não corresponde.`
- Nova senha ausente, com menos de 15 ou mais de 128 caracteres, ou recusada por ser comum.
- Sessão inexistente ou expirada durante o envio.
- Operação concorrente ou indisponibilidade temporária do serviço.

#### Saída segura

Não repita a senha atual em campos de confirmação nem a cole em chamados. Se a sessão expirar, volte ao login. Se a opção autenticada não aparecer para o seu perfil, não force uma rota interna; use a recuperação de senha ou procure o responsável pela aplicação.

### Recuperação de senha

#### Quem pode executar

`Administrador`, `Mentor` e `Mentorado` que tenham acesso ao email cadastrado. A solicitação é pública, mas a mensagem não confirma se o email existe ou se a conta está habilitada.

#### Pré-requisitos

- Acesso ao email cadastrado por um canal autorizado.
- Uma nova senha de 15–128 caracteres que não seja comum ou bloqueada.
- O link ou código recebido ainda válido. O código deve ser usado somente na tela de redefinição e não deve ser compartilhado.

#### Onde começar

Na tela de login, selecione `Esqueceu sua senha?`. A tela seguinte solicita o `Email` e oferece `Enviar e-mail de recuperação`.

#### Passos

1. Informe o email cadastrado e selecione `Enviar e-mail de recuperação`.
2. Aguarde a mensagem `Verifique seu e-mail`. A aplicação apresenta a orientação neutra de que, se a conta estiver apta, as instruções serão enviadas.
3. No email recebido, abra o link autorizado ou copie o código sem publicá-lo.
4. Na tela de redefinição, preencha `Email`, `Token recebido por e-mail`, `Nova senha` e `Confirme a nova senha`.
5. Selecione `Atualizar senha`.
6. Depois da confirmação `Senha atualizada!`, faça login novamente na tela inicial usando a nova senha.

#### Resultado esperado

Quando a solicitação for elegível, as instruções são enviadas sem revelar a existência da conta. Com um token válido e uma senha aceita, a aplicação informa `Senha atualizada!`, orienta `Faça login com sua nova senha`, limpa a sessão e retorna ao login.

#### Erros comuns

- Email em formato inválido.
- Token ausente, link inválido ou token expirado.
- Nova senha fora de 15–128 caracteres, comum ou diferente da confirmação.
- Falha temporária ao solicitar ou concluir a redefinição. A mensagem de erro pode oferecer nova tentativa.

#### Saída segura

Para link ou token inválido/expirado, solicite uma nova recuperação e descarte o valor antigo. Não informe a terceiros se um email possui cadastro, não encaminhe o token e não registre o link de redefinição em documentação ou chamado. Se não tiver acesso ao email, procure o responsável pelo ambiente por um canal autorizado.

### Logout

#### Quem pode executar

Os três perfis, enquanto houver uma sessão ativa. A opção aparece no menu da conta como `Sair`; em páginas de perfil também pode aparecer como o controle com dica `Logout`.

#### Pré-requisitos

- Estar autenticado em uma área de `Administrador`, `Mentor` ou `Mentorado`.
- Não precisar concluir uma operação pendente antes de encerrar a sessão.

#### Onde começar

Abra o menu da conta no rodapé da navegação e selecione `Sair`. Em uma página de perfil que mostre o botão de saída, use o controle identificado pela dica `Logout`.

#### Passos

1. Abra o menu da conta.
2. Selecione `Sair` — ou o controle `Logout` visível na página de perfil.
3. Aguarde o retorno à tela inicial de login.
4. Para continuar usando o sistema, autentique-se novamente; não reutilize uma tela protegida deixada no histórico.

#### Resultado esperado

O aplicativo remove os cookies e o contexto da sessão e retorna a `/`, a tela de login. Uma nova tentativa de acessar uma área protegida exige autenticação novamente.

#### Erros comuns

- A sessão já expirou antes do clique e a aplicação já está na tela de login.
- A tela protegida foi restaurada pelo histórico do navegador após a saída.
- O menu da conta não carregou por uma falha temporária da aplicação.

#### Saída segura

Se a sessão já tiver expirado, permaneça no login e autentique-se novamente apenas se for necessário. Se a tela protegida reaparecer no histórico, não informe dados nela: volte ao login. Use o botão `Sair`; não é necessário apagar cookies ou dados gerais do navegador para encerrar uma sessão normal.
