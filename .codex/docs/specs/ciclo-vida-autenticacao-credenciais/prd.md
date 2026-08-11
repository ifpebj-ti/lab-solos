# PRD: Ciclo de vida de autenticação e credenciais

- Status: pronto
- Responsável: não definido
- Atualizado em: 2026-08-04
- Validação de descoberta: confirmada
- Issues relacionadas: #214, #215, #224, #233

## Contexto e problema

Produção cria um administrador com credencial fixada no código; não há troca autenticada; o administrador inicial não é obrigado a trocar senha; JWTs continuam válidos após a troca; o encerramento de sessão limpa somente `localStorage` enquanto a sessão usa cookies.

## Objetivo e métricas de sucesso

Eliminar credenciais fixas e oferecer um ciclo de senha coerente. Sucesso: carga inicial insegura ausente; inicialização inválida falha antes de servir tráfego; primeiro acesso é restrito à troca; todo fluxo aplica a mesma política; troca/redefinição revoga tokens; encerramento de sessão remove todo o estado.

## Usuários e jornadas

Administrador configura a inicialização e troca a senha no primeiro acesso. Qualquer usuário autenticado altera a própria senha informando a atual. Usuário sem acesso usa recuperação. O encerramento de sessão elimina completamente a sessão.

## Escopo

### Incluído

- Configuração do admin por ambiente e falha imediata.
- Troca autenticada e troca obrigatória do admin seedado.
- Política de 15–64+ caracteres e lista de bloqueio local.
- Revogação global de tokens após qualquer troca/redefinição.
- Encerramento de sessão centralizado para `doorKey`, `rankID`, `level` e dados de sessão.

### Fora de escopo

- MFA, SSO e painel geral de sessões.
- Envio de senha a serviço externo de reputação.

## Requisitos funcionais

### RF-001 — Inicialização segura

Produção deve exigir `Seed__AdminEmail` e `Seed__AdminPassword`, sem valores padrão secretos, e falhar claramente quando inválidos.

### RF-002 — Primeiro acesso obrigatório

O administrador criado pela carga inicial só pode acessar a jornada de troca até definir uma nova senha.

### RF-003 — Alteração autenticada

Usuário autenticado deve alterar senha mediante senha atual correta, nova senha e confirmação.

### RF-004 — Política única

Criação, alteração e recuperação devem validar no servidor mínimo 15, máximo suportado de ao menos 64, sem composição artificial, e rejeitar lista de bloqueio local.

### RF-005 — Revogação e encerramento de sessão

Qualquer mudança de senha invalida todos os tokens e exige nova autenticação; o encerramento de sessão remove todo o estado de autenticação sem apagar preferências não relacionadas.

## Requisitos não funcionais

### RNF-001 — Segurança e privacidade

Senha nunca deve aparecer em código, registro, telemetria ou chamada externa; respostas não devem revelar credenciais.

### RNF-002 — Consistência

O backend é a autoridade da política; o frontend antecipa as mesmas mensagens e todos os pontos usam um único encerramento de sessão.

## Critérios de aceitação

### CA-001 — Configuração ausente (RF-001, RNF-001)

- Dado um ambiente de produção sem variáveis válidas
- Quando a aplicação inicia
- Então aborta antes de servir requisições com mensagem clara sem expor senha

### CA-002 — Primeiro acesso (RF-002)

- Dado um administrador criado pela carga inicial com senha temporária
- Quando autentica
- Então só acessa troca obrigatória até concluí-la

### CA-003 — Troca própria (RF-003, RF-004)

- Dado um usuário autenticado
- Quando informa senha atual correta e nova senha válida/confirmada
- Então a senha é alterada; entradas inválidas retornam mensagem específica

### CA-004 — Revogação (RF-005)

- Dados tokens emitidos antes da mudança
- Quando a senha muda por qualquer fluxo
- Então todos são rejeitados e o usuário deve autenticar-se novamente

### CA-005 — Encerramento de sessão (RF-005, RNF-002)

- Dada uma sessão ativa
- Quando o encerramento de sessão é acionado em qualquer tela
- Então cookies e dados de sessão somem, preferências não relacionadas permanecem e rotas privadas ficam inacessíveis

## Estratégia de validação

xUnit para inicialização, política, troca e revogação; Vitest para formulário, encerramento de sessão e proteções de rota; Playwright para primeiro acesso, troca e nova autenticação.

## Dependências e riscos

Requer alteração persistida para senha temporária e versão de sessão, com migração/reversão. A inicialização deve distinguir um banco já inicializado da configuração obrigatória para criação.

## Suposições

- O admin inicial é o único usuário marcado para troca obrigatória pelo seed.
- Cookies atuais permanecem lado cliente nesta entrega.

## Perguntas abertas

Nenhuma bloqueante.

## Decisões da validação de descoberta

| Decisão | Recomendação | Resposta confirmada | Impacto |
|---|---|---|---|
| Config ausente | Fail-fast claro | Confirmado | Impede ambiente inseguro/inoperável |
| Após troca | Revogar tudo e exigir nova autenticação | Confirmado | Exige controle de versão de sessão |
| Política | 15–64+, sem composição/truncamento | Confirmado | Contrato comum servidor/cliente |
| Senhas comuns | Lista de bloqueio local | Confirmado | Sem vazamento a terceiro |
