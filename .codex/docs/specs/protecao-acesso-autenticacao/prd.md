# PRD: Proteção de acesso, autenticação e frontend

- Status: pronto para especificação técnica
- Responsável: não definido
- Atualizado em: 2026-10-13
- Validação de descoberta: confirmada pelo usuário em 2026-10-13
- Repositório: `ifpebj-ti/lab-solos`
- Issues relacionadas: #436, #437, #438, #439 e #440
- Recorte: todas as cinco issues abertas retornadas pelo GitHub na consulta de 2026-10-13; comentários consultados, sem decisões adicionais.

## Contexto e problema

O LabOn gerencia insumos de laboratório com jornadas de Administrador, Mentor e Mentorado. Autenticar uma sessão não garante que seu titular possa consultar ou modificar qualquer usuário. Além dessa lacuna de autorização, login e recuperação de senha carecem de controles de abuso, e as respostas do frontend e da API precisam restringir recursos e origens conforme o ambiente.

Este PRD consolida o resultado esperado das cinco issues abertas. Sua criação não corrige o código nem comprova remediação em produção. O encerramento das issues depende da implementação e das evidências previstas neste documento.

### Fontes e rastreabilidade

| Issue | Problema registrado | Prioridade registrada | Requisitos | Critérios |
|---|---|---|---|---|
| [#436 — Autorização por recurso](https://github.com/ifpebj-ti/lab-solos/issues/436) | Leitura e alteração de perfis alheios; listagens e consultas de dependentes sem verificação suficiente do vínculo | Alta | RF-001 a RF-004, RNF-001, RNF-004 | CA-001 a CA-008, CA-026, CA-027 |
| [#437 — Limitação no login](https://github.com/ifpebj-ti/lab-solos/issues/437) | Automatização de tentativas de senha sem limitação implementada | Alta | RF-005, RF-006, RNF-001 a RNF-004 | CA-009 a CA-013, CA-025 a CA-027 |
| [#438 — Proteção da recuperação](https://github.com/ifpebj-ti/lab-solos/issues/438) | Emissão repetida de e-mails e substituição de códigos; tentativas automatizadas de validação | Média | RF-007 a RF-009, RNF-001 a RNF-004 | CA-014 a CA-019, CA-025 a CA-027 |
| [#439 — CSP](https://github.com/ifpebj-ti/lab-solos/issues/439) | Ausência da política no HTML de produção | Média | RF-010, RNF-004, RNF-005 | CA-020, CA-021, CA-026 a CA-028 |
| [#440 — CORS](https://github.com/ifpebj-ti/lab-solos/issues/440) | Política permissiva para qualquer origem, método e cabeçalho | Baixa; defesa em profundidade | RF-011, RNF-004, RNF-005 | CA-022 a CA-024, CA-026, CA-027 |

As issues referenciam o commit `8497a95716cf0c00cbf9b3ef9371c2a845c26856` e verificações de 07/10/2026. A revisão local confirma os pontos relevantes, mas não foi executada reprodução autenticada nem teste de carga em produção nesta descoberta. Não há comprovação de comprometimento completo de conta, XSS, extração de JWT via CORS ou diferença explorável de tempo na recuperação. A ausência de CSP e o CORS permissivo são lacunas de defesa em profundidade.

### Evidências locais de contexto

- `README.md`, `CONTRIBUTING.md` e `docs/manual/`: jornadas, perfis e critérios de entrega existentes.
- `backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs`: consultas por ID/tipo e alteração de perfil com autorização genérica; consultas de dependentes e empréstimos recebem IDs do cliente. A aprovação/rejeição de dependentes já verifica identidade e vínculo e deve ser preservada.
- `backend/LabSolos-Server-DotNet8/DTOs/Usuarios/UsuarioDTOPatchRequest.cs`: campos nome, e-mail, telefone e status.
- `backend/LabSolos-Server-DotNet8/Controllers/AuthController.cs` e `Program.cs`: ausência do controle de tentativas no login e CORS permissivo.
- `backend/LabSolos-Server-DotNet8/Controllers/EmailController.cs` e `Services/Security/CredentialService.cs`: aliases de recuperação convergem para os mesmos fluxos; solicitação retorna 202 neutro; códigos duram 15 minutos, são consumidos após uso e a redefinição revoga sessões anteriores.
- `Caddyfile`, `docker-compose-prod.yml`, `.env.prod.example`: frontend e API publicados no mesmo domínio, com `/api/` reservado à API; ausência de CSP no proxy versionado.
- `frontend/index.html`, `frontend/src/index.css` e `frontend/src/services/BaseApi.tsx`: configuração pública em `env.js`, recursos locais e endereço de API configurável. Este levantamento inicial não substitui o inventário completo dos recursos efetivamente usados.
- Históricos de mentorados consultados por Mentor e Administrador dependem de leitura legítima de perfis alheios. Bloquear todos os acessos entre usuários quebraria essas jornadas.
- PRDs existentes em `../ciclo-vida-autenticacao-credenciais/prd.md` e `../contratos-dados-usuario/prd.md`: preservar política de senha, troca obrigatória, revogação e semântica dos dados de usuário.

## Objetivo e métricas de sucesso

Concluir o escopo das cinco issues com acesso a dados pessoais limitado à finalidade autorizada, tentativas automatizadas sujeitas aos limites aprovados e políticas de navegador compatíveis com as jornadas legítimas.

As medidas abaixo são critérios de conclusão do produto, não resultados já obtidos:

| Medida | Condição de sucesso | Evidência |
|---|---|---|
| Cobertura do recorte | 5 de 5 issues ligadas a requisitos e cenários aprovados | Matriz de rastreabilidade e evidências por issue |
| Autorização | Todos os acessos proibidos da matriz negados; nenhuma mutação por requisição negada; todos os acessos autorizados preservados | Testes com dois mentorados, dois mentores e administrador; comparação do estado antes/depois |
| Limites | Nenhuma tentativa além da cota admitida durante sua janela; nenhuma emissão durante o intervalo mínimo; aliases sem cota adicional | Testes com tempo controlado, concorrência e transporte de e-mail simulado |
| Recuperação legítima | Código vigente preservado após solicitação limitada; uso único, expiração e revogação mantidos | Testes de recuperação e nova autenticação |
| CSP | HTML da raiz e das rotas SPA com política em aplicação; cenários legítimos sem bloqueio inesperado; recurso não permitido bloqueado | Cabeçalhos efetivos e validação no navegador após publicação |
| CORS | Nenhuma autorização CORS para origem externa em produção; desenvolvimento aceita apenas as origens configuradas | Preflight, respostas efetivas e chamadas legítimas por ambiente |
| Regressão | Todos os cenários de produto descritos neste PRD aprovados | Resultados automatizados e demonstração das jornadas |

Não foram definidos objetivos numéricos de latência, retenção de registros ou disponibilidade novos. Diferenças de tempo e impacto operacional devem ser medidos durante a especificação e a validação; um risco demonstrado exige tratamento, não uma declaração de segurança sem evidência.

## Usuários e jornadas

- **Administrador:** consulta usuários, acompanha turmas e empréstimos, gerencia contatos e status dentro das permissões administrativas existentes.
- **Mentor:** consulta o próprio perfil e acompanha somente mentorados vinculados, incluindo seus históricos de empréstimos; não altera contatos desses mentorados.
- **Mentorado:** consulta e edita o próprio perfil e acompanha os próprios empréstimos. O resumo do responsável já permitido na jornada permanece disponível, sem conceder acesso ao perfil completo do responsável.
- **Usuário sem sessão:** autentica ou solicita recuperação, recebe resposta neutra e pode concluir a redefinição com código válido, respeitando limites temporários.
- **Operador:** configura limites e origens por ambiente, verifica controles e registra evidências sem publicar credenciais ou dados pessoais.

## Escopo

### Incluído

- Autorização por titularidade, papel e vínculo nas consultas e alterações de usuários e nas consultas relacionadas apontadas pela #436.
- Minimização dos dados retornados para acompanhamento e proteção da troca do próprio e-mail.
- Limites combinados por IP e identificador normalizado no login, emissão de recuperação e validação de códigos, incluindo aliases legados.
- Respostas neutras, espera temporária compreensível, expiração, uso único e preservação dos contratos seguros existentes.
- CSP efetiva no frontend de produção e CORS específico por ambiente.
- Documentação de operação, testes e evidências de implantação para as cinco issues.

### Fora de escopo

- MFA, SSO, CAPTCHA obrigatório, novo sistema de papéis ou painel geral de sessões.
- Substituição de IDs sequenciais como solução de autorização.
- Migração do mecanismo de armazenamento de sessão ou remoção de `env.js` contendo configuração pública.
- Confirmação de titularidade do novo e-mail por um novo fluxo de mensagens; a proteção aprovada nesta entrega é a confirmação da senha atual para alteração própria.
- Reformulação visual geral, novas funcionalidades de estoque ou mudança da política de senha já aprovada.
- Auditoria completa de endpoints e infraestrutura além do necessário às cinco issues; novos achados devem ser registrados separadamente.
- Implementação, commits, publicação ou encerramento de issues como parte da criação deste PRD.

## Requisitos funcionais

### RF-001 — Autorizar consultas individuais por recurso

Antes de retornar dados de um perfil, verificar a identidade autenticada, o papel e o vínculo que autorizam a finalidade da consulta. IDs enviados pelo cliente não comprovam titularidade ou vínculo.

| Solicitante | Próprio perfil | Perfil de outro usuário | Dados de acompanhamento |
|---|---|---|---|
| Administrador | Permitido | Permitido para gestão | Permitidos na gestão existente |
| Mentor | Permitido | Somente projeção necessária de mentorado vinculado | Somente dos seus mentorados vinculados |
| Mentorado | Permitido | Perfil completo negado | Somente próprios; resumo já autorizado do responsável preservado |
| Sem autenticação | Negado | Negado | Negado |

Outros papéis não recebem novas permissões implicitamente. Troca obrigatória de senha e demais restrições de sessão existentes continuam exigidas.

### RF-002 — Restringir listagens e consultas relacionadas

Listagens de usuários por tipo destinadas à gestão são exclusivas de Administrador. Consultas de dependentes, aprovações pendentes e empréstimos por responsável devem limitar-se ao próprio responsável autenticado e aos seus vínculos; Administrador mantém a gestão autorizada. A consulta de acompanhamento deve retornar apenas dados necessários à jornada, e lista autorizada sem registros deve retornar um resultado vazio válido.

### RF-003 — Autorizar mutações e proteger o e-mail

Nome e telefone podem ser alterados pelo titular ou por Administrador autorizado. A alteração do próprio e-mail exige confirmação da senha atual correta antes de persistir a mudança. Administrador mantém a alteração de terceiros para gestão conforme permissões existentes. Mentor não pode alterar nome, e-mail ou telefone de mentorado vinculado. Alteração de status permanece exclusiva de Administrador. Requisição com algum campo sem autorização deve ser negada integralmente, sem alteração parcial.

Senha atual não deve integrar respostas, registros ou dados persistidos de perfil. Validações existentes, como unicidade do e-mail, continuam aplicáveis; falha não pode deixar dados parcialmente alterados. A recuperação passa a utilizar o e-mail atualizado somente após a alteração autorizada.

### RF-004 — Respostas de acesso consistentes

Ausência ou invalidade de sessão retorna 401. Para sessão válida, um recurso individual inacessível retorna 404 com o mesmo conteúdo público de um recurso inexistente. Operações ou listagens restritas por papel retornam 403, sem dados de terceiros. A interface oferece retorno à área autorizada e não representa falha de permissão como lista vazia bem-sucedida.

### RF-005 — Limitar tentativas de login

Aplicar cotas combinadas, configuráveis por ambiente, a identificadores normalizados existentes e inexistentes e a IPs. Valores iniciais aprovados:

| Dimensão | Cota de falhas | Janela |
|---|---|---|
| Identificador normalizado | 5 | 15 minutos |
| IP | 30 | 15 minutos |

Ao atingir uma cota, tentativas seguintes que dependem dessa cota são recusadas até sua renovação; o sistema não deve executar uma verificação adicional de senha para permitir contorno. Trocar IP não renova a cota do identificador; trocar identificador não renova a cota do IP. Valores inválidos não podem desativar silenciosamente a proteção. O limite gera espera temporária e não desativa a conta nem exige desbloqueio administrativo. Sucesso não pode apagar a cota compartilhada de um IP e liberar abuso contra outros identificadores.

### RF-006 — Comunicar limitação sem revelar contas

Login limitado retorna 429 e `Retry-After` coerente com a próxima tentativa admitida. Credenciais inválidas continuam com resposta genérica, sem distinguir conta inexistente de senha incorreta. A interface informa a espera de forma acessível e permite tentar novamente quando elegível, sem repetição automática de solicitações limitadas.

### RF-007 — Limitar emissões de recuperação

Aplicar conjuntamente as seguintes políticas iniciais configuráveis, independentemente de a conta existir ou estar habilitada:

| Dimensão | Limite | Período |
|---|---|---|
| Destinatário normalizado | Intervalo mínimo entre emissões admitidas | 60 segundos |
| Destinatário normalizado | Até 3 solicitações admitidas | 1 hora |
| IP | Até 20 solicitações admitidas | 1 hora |

`request-password-reset` e `solicitar-redefinicao` compartilham cotas e intervalo mínimo. Solicitação limitada não gera e-mail, não substitui o código vigente e não prolonga a espera a cada repetição. Conta inexistente ou inativa nunca recebe e-mail. Solicitação continua retornando 202 com mensagem neutra, inclusive quando limitada; o estado público da resposta não indica existência, elegibilidade ou envio. Cotas públicas devem ser consumidas por solicitações admitidas também para destinatários inexistentes ou inativos.

### RF-008 — Limitar validação dos códigos de recuperação

`reset-password` e `redefinir-senha` compartilham limite de 5 tentativas inválidas por destinatário normalizado e 30 por IP em 15 minutos. Ao atingir uma cota, tentativas seguintes são recusadas temporariamente com 429 e `Retry-After`; a resposta não revela existência da conta. Alternar alias ou representações equivalentes do destinatário não cria nova cota.

O alias legado aceita código sem e-mail. Sua compatibilidade deve ser preservada sem liberar tentativas ilimitadas: o limite por IP aplica-se antes de resolver qualquer conta; quando um destinatário for identificado, suas tentativas também compartilham a mesma cota. Código inválido sem destinatário resolvível continua sujeito ao limite por IP e à capacidade limitada do controle. A proteção não deve bloquear o login nem desativar a conta da vítima.

### RF-009 — Preservar o ciclo de recuperação legítima

Somente conta habilitada pode receber e concluir recuperação. Código expira em 15 minutos, pode ser usado uma única vez e não permanece válido após redefinição bem-sucedida. A nova senha respeita a política existente; redefinição revoga sessões anteriores e exige nova autenticação. Limitação de envio ou de tentativas não altera senha, status da conta ou validade original de um código já emitido.

Avaliar o envio assíncrono e medir diferenças de tempo entre contas elegíveis e inelegíveis. A solução técnica deve justificar como reduz o risco de inferência sem comprometer a entrega; este PRD não impõe fila ou arquitetura específica nem afirma que exploração por tempo já foi demonstrada.

### RF-010 — Aplicar CSP compatível com o produto

O HTML de produção, na raiz e nas rotas SPA, deve apresentar `Content-Security-Policy` em modo de aplicação. A política deve permitir apenas origens e tipos de recurso necessários, inventariados para scripts, estilos, fontes, imagens, conexões e demais recursos utilizados. Deve bloquear objetos incorporados e restringir base de URL, destinos de formulários e incorporação em páginas a contextos autorizados pelo produto; manter a compatibilidade de mesma origem existente para incorporação.

Scripts não podem receber autorização ampla de execução inline ou de avaliação dinâmica sem necessidade demonstrada. Uso de estilos dinâmicos e demais exceções exige justificativa específica e validação. Uma etapa em modo de relatório pode apoiar a validação, mas não conclui a issue. Login, navegação dos três perfis, recuperação, imagens, fontes, exportações existentes e chamadas à API devem funcionar sob a política aplicada. Configuração pública em `env.js` pode permanecer.

### RF-011 — Restringir CORS por ambiente

Em produção, frontend e API operam no mesmo domínio configurado: chamadas de mesma origem permanecem funcionais, sem autorização CORS para origens externas. Em desenvolvimento, apenas origens explicitamente configuradas podem receber autorização CORS, com métodos e cabeçalhos necessários às jornadas, incluindo o uso atual de `Authorization` e `Content-Type` quando necessário.

Origem arbitrária e origem `null` não recebem autorização CORS. Ausência de `Origin` não elimina autenticação ou autorização. Não habilitar credenciais entre origens sem requisito aprovado. Quando houver autorização dinâmica por origem em desenvolvimento, as respostas devem permitir cache correto e incluir `Vary: Origin`. CORS é uma restrição do navegador e não substitui a política de acesso do servidor.

## Requisitos não funcionais

### RNF-001 — Segurança e privacidade

Negar acesso antes de expor dados ou efetuar mutações. Nunca registrar senhas, códigos de recuperação, JWTs, conteúdo sensível de requisições ou dados pessoais nas evidências entregues. Respostas de autenticação e recuperação não devem fornecer um indicador explícito de existência de conta. Projeções de acompanhamento não contêm credenciais ou códigos de recuperação.

### RNF-002 — Resistência a contorno e uso de recursos

Os limites devem continuar válidos sob concorrência, alternância de aliases, variação equivalente de identificadores e distribuição de requisições entre instâncias que atendem o mesmo ambiente. Identificadores arbitrários não podem criar crescimento ilimitado do estado do controle; limite de capacidade atingido não pode liberar requisições sem proteção. IP encaminhado por cliente não confiável não pode alterar a atribuição da cota. Usuários em NAT compartilham a cota por IP e devem recuperar acesso após a espera, sem bloqueio permanente.

### RNF-003 — Configuração e observabilidade

Documentar valores, normalização, janelas, intervalo mínimo, renovação, interpretação de IP confiável e comportamento na capacidade máxima. Disponibilizar contagens agregadas de recusas de acesso e limitação e de falhas de entrega, suficientes para validar o controle sem revelar identificadores pessoais. Configuração inválida deve ser detectada antes de o ambiente operar desprotegido. A escolha de mecanismo, armazenamento, capacidade e topologia pertence à especificação técnica.

### RNF-004 — Compatibilidade e acessibilidade

Preservar login válido, primeiro acesso obrigatório, gestão administrativa, acompanhamento de vinculados e recuperação. Mensagens de acesso negado e espera devem ser perceptíveis por leitores de tela, operáveis por teclado e compreensíveis sem depender apenas de cor. O contrato de confirmação da senha atual para trocar e-mail deve ser documentado e adotado pelo consumidor; não aceitar a versão anterior sem confirmação como contorno.

### RNF-005 — Efetividade por ambiente

Políticas de CSP/CORS precisam ser verificadas nas respostas efetivamente entregues, incluindo navegação direta para rotas SPA. Desenvolvimento não pode ampliar permissões de produção. A composição de cabeçalhos entre camadas não pode produzir políticas contraditórias ou enfraquecer as restrições aprovadas.

## Critérios de aceitação

### CA-001 — Consulta própria e administrativa (RF-001)

- Dado um Administrador, dois Mentores e dois Mentorados com sessões válidas e troca obrigatória concluída
- Quando cada usuário consulta o próprio perfil e o Administrador consulta os demais
- Então as consultas autorizadas retornam os dados correspondentes, preservando as restrições de sessão existentes.

### CA-002 — Consulta cruzada proibida (RF-001, RF-004, RNF-001)

- Dado um Mentorado ou Mentor sem vínculo de acompanhamento com o alvo
- Quando consulta o perfil de outro usuário por ID, inclusive um ID inexistente
- Então recebe 404 com conteúdo público equivalente para recurso inacessível e inexistente, sem dados do alvo.

### CA-003 — Acompanhamento vinculado e dados mínimos (RF-001, RF-002, RNF-001, RNF-004)

- Dado um Mentor com um Mentorado vinculado e outro não vinculado
- Quando consulta os perfis e históricos de ambos e o Mentorado consulta o resumo de seu responsável
- Então o Mentor recebe apenas os dados necessários do vinculado; o não vinculado é inacessível; o resumo permitido do responsável funciona sem expor seu perfil completo.

### CA-004 — Listagens, IDs de responsável e estado vazio (RF-002, RF-004)

- Dado um Administrador, dois Mentores e um Mentorado
- Quando consultam listagens por tipo e consultas de dependentes, pendências e empréstimos usando IDs próprios e alheios
- Então a listagem por tipo fica restrita ao Administrador, cada Mentor acessa somente seus vínculos, recursos individuais alheios são inacessíveis e uma consulta autorizada sem registros retorna lista vazia válida.

### CA-005 — Mutação autorizada e status (RF-003, RNF-004)

- Dado um titular e um Administrador autorizado
- Quando o titular altera nome/telefone ou o Administrador gerencia os campos permitidos de outro perfil e seu status
- Então as alterações válidas são persistidas; titular sem papel administrativo não pode alterar status.

### CA-006 — Mutação cruzada e requisição mista (RF-003, RF-004, RNF-001)

- Dado um Mentor, um Mentorado vinculado e outro usuário sem vínculo
- Quando o Mentor tenta alterar contatos de qualquer um deles ou um titular combina nome permitido com status proibido
- Então a operação é integralmente negada conforme a política de resposta, sem modificar qualquer campo do banco.

### CA-007 — Alteração do próprio e-mail (RF-003, RNF-001, RNF-004)

- Dado um titular com sessão válida e um novo e-mail válido e disponível
- Quando solicita a troca com senha atual correta, incorreta ou ausente, ou fornece e-mail já utilizado
- Então somente a troca com senha correta e e-mail válido é persistida; os demais casos preservam todos os dados anteriores; senha não aparece em respostas ou registros e recuperação subsequente usa o e-mail atualizado.

### CA-008 — Sessão ausente ou restrita (RF-001 a RF-004, RNF-004)

- Dado ausência de token, token inválido ou sessão ainda sujeita à troca obrigatória
- Quando tenta consultar ou alterar usuários e consultar relações protegidas
- Então nenhuma operação libera dados ou mutação; ausência/invalidade retorna 401 e a sessão restrita segue a política de troca obrigatória existente.

### CA-009 — Limiar do login (RF-005, RF-006)

- Dado cotas iniciais vazias e tempo controlado
- Quando o mesmo identificador acumula 5 falhas em 15 minutos ou um IP acumula 30 falhas nessa janela
- Então tentativas seguintes sujeitas à cota atingida retornam 429 e `Retry-After`, sem verificação adicional da senha e sem desativar a conta.

### CA-010 — Renovação e sucesso (RF-005, RF-006, RNF-004)

- Dado login limitado e credenciais válidas conhecidas
- Quando a janela vence e o usuário tenta novamente
- Então pode autenticar-se; antes do vencimento permanece a espera; sucesso de outra conta não apaga a cota compartilhada do IP.

### CA-011 — Inexistência, normalização e contorno do login (RF-005, RF-006, RNF-001, RNF-002)

- Dado identificadores existentes e inexistentes com cotas equivalentes
- Quando alterna representações equivalentes de identificador, IPs para o mesmo identificador ou identificadores para o mesmo IP
- Então mantém as cotas correspondentes e as respostas genéricas, sem criar autorização adicional ou revelar a existência da conta.

### CA-012 — IPs, contas independentes e NAT (RF-005, RNF-002)

- Dado contas e IPs distintos e usuários que compartilham um IP
- Quando exercem as cotas configuradas
- Então pares sem cotas compartilhadas permanecem independentes, a cota compartilhada não exige desbloqueio administrativo e todos os usuários afetados pelo IP podem tentar novamente após sua renovação.

### CA-013 — Feedback de limitação e acesso negado (RF-004, RF-006, RF-008, RNF-004)

- Dado uma resposta de acesso negado ou 429 com espera definida
- Quando a interface a apresenta e é utilizada por teclado e leitor de tela
- Então comunica motivo público e próximo passo, oferece retorno autorizado ou nova tentativa no prazo indicado e não envia repetição automática durante a espera.

### CA-014 — Emissão legítima e intervalo mínimo (RF-007, RF-009)

- Dado uma conta habilitada com cotas livres e transporte de e-mail simulado
- Quando solicita recuperação e repete em menos de 60 segundos, alternando os dois aliases
- Então o primeiro pedido emite um código e um e-mail; repetições mantêm 202 neutro sem novo envio, sem substituir o código ou estender o intervalo mínimo.

### CA-015 — Cotas de recuperação e renovação (RF-007, RNF-002)

- Dado três solicitações admitidas para um destinatário ou vinte para um IP em uma hora
- Quando envia pedidos adicionais e, depois, repete após a renovação da janela e do intervalo mínimo
- Então pedidos excedentes não emitem e-mails nem alteram o código vigente; somente após elegibilidade conjunta uma nova emissão pode ocorrer.

### CA-016 — Recuperação neutra e conta inelegível (RF-007, RF-009, RNF-001)

- Dado contas habilitadas, inativas e inexistentes com o mesmo histórico público de solicitações
- Quando solicita recuperação dentro e fora dos limites
- Então todas recebem 202 e a mesma mensagem neutra; todas consomem as cotas públicas quando admitidas; somente habilitadas e não limitadas recebem e-mail, sem indicar envio na resposta.

### CA-017 — Tentativas de código, aliases e forma legada (RF-008, RNF-002)

- Dado cotas livres de validação com tempo controlado
- Quando acumula 5 códigos inválidos para um destinatário ou 30 por IP em 15 minutos, alternando aliases e incluindo pedidos legados sem e-mail
- Então tentativas seguintes sujeitas à cota retornam 429 e espera coerente; aliases não duplicam cotas; pedidos sem destinatário conhecido continuam limitados por IP; após a janela uma tentativa válida volta a ser admitida.

### CA-018 — Uso único, expiração e revogação (RF-009)

- Dado um código emitido e sessões anteriores à redefinição
- Quando redefine com código válido e senha aprovada, reutiliza o mesmo código ou tenta outro código após 15 minutos
- Então apenas a primeira redefinição válida conclui; reutilização e expiração são rejeitadas; sessões anteriores deixam de acessar recursos privados e nova autenticação é exigida.

### CA-019 — Recuperação limitada não bloqueia login (RF-007 a RF-009, RNF-004)

- Dado solicitações excessivas ou tentativas inválidas de recuperação contra uma conta habilitada
- Quando o titular usa o código vigente durante sua validade após a espera aplicável ou autentica com a senha atual dentro das cotas de login
- Então os excessos não mudaram senha/status nem revogaram o código por si só; recuperação e login seguem suas próprias cotas e o login permanece disponível quando elegível.

### CA-020 — CSP efetiva e recurso proibido (RF-010, RNF-005)

- Dado o frontend de produção e uma origem de recurso não autorizada pelo inventário
- Quando abre a raiz e rotas SPA diretamente e tenta carregar esse recurso em ambiente de teste controlado
- Então ambas as respostas HTML contêm CSP em aplicação e o navegador bloqueia o recurso proibido; política apenas em modo de relatório não satisfaz o critério.

### CA-021 — Jornadas sob CSP (RF-010, RNF-004, RNF-005)

- Dado a política aplicada e as origens necessárias inventariadas
- Quando realiza login, navegação por Administrador/Mentor/Mentorado, recuperação, carregamento de fontes/imagens, exportações e chamadas à API
- Então as jornadas concluem sem bloqueios inesperados; `env.js` continua disponível se necessário e toda exceção da política possui justificativa documentada.

### CA-022 — CORS de produção e autenticação (RF-011, RNF-005)

- Dado produção configurada para mesma origem
- Quando envia preflight e requisição efetiva com origens externas arbitrárias e `null`, e acessa legitimamente pela mesma origem
- Então nenhuma origem externa recebe autorização CORS; acesso legítimo funciona e operações protegidas seguem exigindo sessão e permissão, inclusive sem `Origin`.

### CA-023 — CORS de desenvolvimento e cache (RF-011, RNF-005)

- Dado desenvolvimento com origens, métodos e cabeçalhos necessários explicitamente configurados
- Quando testa preflight e resposta efetiva com origem permitida, não permitida e `null`, incluindo métodos/cabeçalhos não autorizados
- Então somente combinações permitidas recebem autorização; resposta dinâmica por origem inclui `Vary: Origin`; credenciais entre origens não são habilitadas.

### CA-024 — CORS não concede acesso a recurso (RF-001, RF-004, RF-011)

- Dado uma origem permitida em desenvolvimento
- Quando requisita recurso protegido sem token ou com sessão sem autorização ao objeto
- Então recebe a mesma recusa de autenticação ou autorização exigida pelo servidor, sem expor o recurso.

### CA-025 — Concorrência, capacidade e IP confiável (RF-005, RF-007, RF-008, RNF-002, RNF-003)

- Dado a configuração de capacidade e a topologia documentadas
- Quando distribui pedidos simultâneos entre instâncias, cria muitos identificadores arbitrários ou forja cabeçalhos de IP fora do proxy confiável
- Então não ultrapassa a cota por corrida ou distribuição, não ocorre crescimento ilimitado do controle e o cabeçalho forjado não altera a identidade de IP usada para limitar; capacidade máxima não libera tráfego desprotegido.

### CA-026 — Evidências e registros sanitizados (RNF-001, RNF-003)

- Dado consultas negadas, login limitado, recuperação e falha simulada de entrega
- Quando inspeciona respostas, registros, contagens agregadas e evidências de validação
- Então é possível demonstrar os controles sem senhas, JWTs, códigos de recuperação ou dados pessoais em registros e evidências.

### CA-027 — Configuração, documentação e validação pós-publicação (RF-001 a RF-011, RNF-003 a RNF-005)

- Dado uma implementação candidata e configuração por ambiente
- Quando verifica parâmetros inválidos, publica pelos procedimentos autorizados e valida com contas de teste e volume controlado
- Então configuração inválida não deixa o serviço operar sem proteção; documentação descreve matriz de acesso, limites, renovação, origens e procedimento; evidências reais de autorização, limites, CSP e CORS são associadas às cinco issues antes do encerramento.

### CA-028 — Restrições complementares de CSP (RF-010, RNF-005)

- Dado a política aplicada e testes controlados de conteúdo incorporado, base de URL, envio de formulário e incorporação do frontend
- Quando tenta usar objetos incorporados, base/destino não autorizado ou página externa para incorporar o frontend
- Então a política bloqueia essas tentativas e preserva os contextos de mesma origem autorizados pelo produto.

## Estratégia de validação

- **Autorização automatizada:** matriz com dois Mentorados, dois Mentores e Administrador; sessões sem token, inválidas e restritas; vínculos presentes/ausentes; IDs existentes/inexistentes; consultas de gestão e acompanhamento; PATCH próprio/cruzado/misto, confirmação de senha e comparação do estado persistido.
- **Abuso automatizado:** tempo controlado para limiares, limites exatos e renovação; IP/identificador independentes e compartilhados; contas inexistentes/inativas; normalização; aliases; forma legada sem e-mail; concorrência, capacidade e topologia. Usar transporte de e-mail simulado, sem inundar contas reais.
- **Regressão de credenciais:** política de senha, código válido/inválido/expirado/reutilizado, revogação de sessões e troca obrigatória. Medir tempos de recuperação e registrar avaliação da entrega assíncrona.
- **Interface:** testes de apresentação de 401/403/404/429, espera e retorno à área; verificação de teclado e leitor de tela nas mensagens afetadas; jornada real de troca do e-mail.
- **Navegador e respostas:** inspeção do HTML final da raiz e rotas SPA, CSP aplicada e violações controladas, jornadas dos três perfis e recursos utilizados; preflight e respostas efetivas por ambiente, incluindo ausência de `Origin` e cache por origem.
- **Conclusão por issue:** associar resultados automatizados, demonstração pertinente e verificação pós-publicação com contas de teste. Nenhum teste ofensivo de alto volume em produção é necessário para demonstrar limiares verificáveis em ambiente controlado.

A especificação técnica define ferramentas, contratos e comandos de validação. O PRD exige os resultados observáveis acima sem antecipar arquitetura.

## Dependências e riscos

| Dependência ou risco | Tratamento exigido |
|---|---|
| Vínculos e papéis existentes | Caracterizar o acompanhamento atual e preservar aprovação/rejeição já protegidas; não usar ID do cliente como prova de vínculo |
| Mudança do contrato de troca de e-mail | Coordenar API e interface e impedir acesso legado sem confirmação da senha atual |
| Bloqueio temporário induzido contra vítima | Não desativar conta, não renovar espera por pedidos recusados e manter recuperação/login com cotas próprias; limites podem causar espera temporária sob ataque |
| Laboratório com NAT | Validar cota compartilhada e renovação; valores aprovados são configuráveis conforme evidências de uso |
| Proxies e múltiplas instâncias | Documentar topologia e origem confiável de IP; assegurar efeito consistente das cotas |
| Muitos identificadores inexistentes | Capacidade limitada e comportamento seguro ao atingir o limite, definidos na especificação |
| Transporte de e-mail e diferenças de tempo | Simular entrega, medir comportamento e justificar abordagem; não presumir vulnerabilidade comprovada |
| Código legado sem e-mail | Preservar compatibilidade sem contorno da cota por IP e compartilhar cota por destinatário quando resolvível |
| Recursos dinâmicos e exportações sob CSP | Inventariar recursos reais e justificar exceções específicas antes do modo de aplicação |
| Novos clientes de outra origem | Produção foi confirmada como mesma origem; novo cliente exige revisão explícita do requisito, sem permissões amplas preventivas |
| Divergência entre revisão e deployment | Evidências locais não substituem a verificação após publicação; não declarar issue resolvida apenas pelo PRD |

## Suposições

- O recorte de issues é uma fotografia de 2026-10-13; novas issues abertas depois da consulta não entram automaticamente neste documento.
- Os vínculos já persistidos são a referência do acompanhamento autorizado. Inconsistências descobertas exigem tratamento antes da validação, sem presumir vínculo pelo papel.
- Não há requisito adicional de integração entre origens ou de incorporação externa aprovado nesta descoberta. Recursos reais ainda devem ser inventariados.
- Os limites aprovados são valores iniciais, não uma medição de tráfego atual; ajustes devem ser fundamentados e documentados, mantendo a proteção configurável.

As regras de acesso, os limites e a política de mesma origem são decisões confirmadas, não suposições.

## Perguntas abertas

Nenhuma decisão de produto bloqueante após a confirmação final do usuário. A especificação técnica deve resolver e documentar:

- Quais campos compõem cada projeção mínima de acompanhamento, a partir das jornadas existentes?
- Qual normalização consistente dos identificadores será aplicada sem conflitar com contas existentes?
- Qual topologia, capacidade e comportamento seguro dos controles atendem aos limites sob concorrência e múltiplas instâncias?
- Quais recursos e exceções específicos são necessários à CSP efetiva?
- Como reduzir diferenças de tempo na recuperação e qual resultado da avaliação de envio assíncrono?

Esses levantamentos não autorizam ampliar permissões, remover aliases ou substituir decisões confirmadas sem revisão do produto.

## Decisões da validação de descoberta

| Decisão | Recomendação | Resposta confirmada | Impacto |
|---|---|---|---|
| Autorização de perfis | Próprio perfil; gestão administrativa; Mentor lê dados necessários somente de vinculados, sem editar contatos | “Sim, adotar essa regra (recomendado)” | Matriz explícita de acesso e preservação do acompanhamento |
| Limites de login | 5 falhas/identificador e 30/IP em 15 minutos, temporários e configuráveis | “Confirmar os valores propostos” | 429, espera informada e prevenção de contorno entre dimensões |
| Emissão de recuperação | 60 segundos; 3/destinatário e 20/IP por hora; aliases compartilham cotas | “Confirmar os valores propostos” | Redução de envio abusivo e preservação do código em pedidos limitados |
| Validação de recuperação | 5 falhas/destinatário e 30/IP em 15 minutos | “Confirmar os valores propostos” | Tentativas limitadas sem desativar conta ou bloquear login |
| E-mail próprio | Exigir confirmação da senha atual; Administrador mantém gestão autorizada | “Confirmo o entendimento final” | Novo requisito de reautenticação para alteração sensível |
| Recurso inacessível | Responder como inexistente sem expor dados | “Confirmo o entendimento final” | Resposta 404 equivalente em consultas individuais |
| Origens por ambiente | Produção na mesma origem; desenvolvimento somente com origens configuradas | “Confirmo o entendimento final” | Sem autorização CORS externa em produção |
| CSP | Somente recursos necessários, preservando fluxos atuais | “Confirmo o entendimento final” | Inventário e política aplicada sem regressão |
| Escopo e conclusão | Um PRD para todas as cinco issues; contratos seguros preservados e evidências antes do encerramento | “Confirmo o entendimento final” | Descoberta encerrada e documento apto à especificação técnica |

Não houve recomendação rejeitada nas três rodadas. A validação exigida pela skill `create-prd`, conduzida com a skill `grilling`, foi concluída com confirmação explícita do entendimento compartilhado.
