# PRD: Proteção da API e do proxy

- Status: rascunho
- Responsável: não definido
- Atualizado em: 2026-11-15
- Validação de descoberta: dispensada-pelo-usuário

## Contexto e problema

Cadastro, empréstimos, listagens e exportações precisam de limites proporcionais ao custo da operação. Na superfície publicada, as jornadas públicas precisam permanecer acessíveis e as ações internas precisam respeitar a política de acesso. Os resultados de sucesso e de erro devem seguir contratos previsíveis de cache, cabeçalhos e resposta ao cliente.

O contexto local está em `Program.cs`, `Caddyfile`, `infra/proxy/security-headers.caddy`, `UsuariosController.cs`, `EmprestimosController.cs`, `EmailController.cs`, `AuditoriaController.cs` e nas páginas `Home.tsx`. O tratamento da interface é contextualizado no [PRD de experiência de erros no frontend](../experiencia-erros-frontend/prd.md).

| Issue | Requisitos | Critérios |
| --- | --- | --- |
| [#473 — Limites, cotas e paginação](https://github.com/ifpebj-ti/lab-solos/issues/473) | RF-001, RF-002, RF-003, RNF-001 | CA-001, CA-002, CA-003, CA-004 |
| [#480 — Superfície pública](https://github.com/ifpebj-ti/lab-solos/issues/480) | RF-004, RF-005, RNF-002 | CA-005, CA-006, CA-007, CA-008 |
| [#481 — Cache e cabeçalhos](https://github.com/ifpebj-ti/lab-solos/issues/481) | RF-006, RF-007, RNF-002 | CA-007, CA-008, CA-009 |
| [#483 — Erros e validação da API](https://github.com/ifpebj-ti/lab-solos/issues/483) | RF-008, RF-009, RNF-003 | CA-010, CA-011, CA-012 |

## Objetivo e métricas de sucesso

Conferir todas as operações do inventário revisado em perfis e ambientes aplicáveis. Os testes devem demonstrar que solicitações legítimas sob os limites seguem disponíveis, que resultados não excedem o teto da operação e que respostas representativas de sucesso, erro e ausência de sessão cumprem o contrato publicado.

## Usuários e jornadas

- Visitante que acessa a página inicial, solicita cadastro ou usa a recuperação aprovada.
- Usuário autenticado que cadastra solicitações de empréstimo ou navega pelas listagens autorizadas.
- Administrador que consulta auditoria, exporta resultados e opera ferramentas reservadas.
- Responsável pela operação que consulta o estado de saúde do serviço e usa registros autorizados para diagnóstico.

## Escopo

### Incluído

- Frequência, volume, tamanho e paginação das operações previstas, com contrato público documentado.
- Inventário da API e do proxy, métricas e ações internas, dados iniciais públicos, recuperação legada, health e documentação interativa.
- Respostas para navegação SPA, recursos inexistentes, metadados, CORS, cache e cabeçalhos de segurança.
- Contrato de validação e falhas de domínio, incluindo datas, fuso, JSON inválido e codificação textual.

### Fora de escopo

- Definição de papéis ou mudanças no limite de quantidade de itens por regra de estoque e empréstimos.
- Reformulação da política de recuperação vigente ou do conteúdo funcional das métricas existentes.

## Requisitos funcionais

### RF-001 — Frequência e volume de operações

Cadastro e criação de empréstimos devem respeitar limites documentados de frequência e volume, de acordo com o contexto da operação e o usuário quando identificado. O contrato indica o resultado no limite e quando a operação é recusada, sem criação parcial de registros atribuída à recusa.

### RF-002 — Paginação e teto de resultados

Listagens, consultas de auditoria e exportações devem respeitar o teto de página documentado para cada operação e apresentar continuação ou tratamento da solicitação excedente conforme o contrato. As respostas preservam filtros e escopo de autorização nas páginas subsequentes.

### RF-003 — Validação de tamanho

Campos textuais abrangidos e solicitações devem respeitar limites documentados. Entradas acima do tamanho aceito recebem status de erro de cliente e código público coerente com a causa.

### RF-004 — Recursos públicos e ações reservadas

A superfície publicada só permite acesso anônimo às exceções revisadas. Métricas operacionais e envio genérico de e-mail exigem a autorização definida. A página inicial usa apenas os dados públicos aprovados. O inventário explicita o destino das rotas de recuperação legada e preserva a jornada vigente aprovada.

### RF-005 — Saúde, documentação e caminhos inexistentes

A verificação de saúde retorna somente o estado mínimo necessário. A documentação técnica interativa está disponível em desenvolvimento. Na superfície publicada, o fallback mantém a navegação SPA legítima e caminhos inexistentes seguem o contrato por categoria, incluindo o erro de API em formato próprio.

### RF-006 — Cache no contrato da API

Respostas da API apresentam `Cache-Control: no-store`, incluindo erros e chamadas sem sessão. Quando representações variam por propriedade da solicitação, `Vary` identifica os componentes previstos no contrato, incluindo origem onde a política CORS admite diferenciação.

### RF-007 — Cabeçalhos de segurança por superfície

API e proxy aplicam os cabeçalhos exigidos no inventário, inclusive CSP e `Permissions-Policy` na superfície da API, e preservam os controles existentes nas respostas de sucesso e erro. Metadados públicos ficam limitados ao necessário ao contrato.

### RF-008 — Respostas públicas consistentes

Falhas de entrada e de domínio, incluindo recurso ausente e conflito, retornam status `4xx` e código público conforme sua categoria. A resposta apresenta orientação utilizável pelo cliente. Os registros internos fornecem contexto autorizado de diagnóstico, com proteção dos dados tratados.

### RF-009 — Datas, formato e codificação

Filtros respeitam a semântica documentada de datas civis e de instantes com fuso. JSON inválido segue o contrato de validação. Mensagens públicas com acentuação são legíveis na API e no frontend.

## Requisitos não funcionais

### RNF-001 — Previsibilidade dos limites

O contrato registra valores, unidades, janelas aplicáveis, tamanho de página e resposta de excesso. Para entradas na faixa permitida, a autorização, a conclusão da operação e as regras de negócio aplicáveis continuam testáveis de ponta a ponta.

### RNF-002 — Compatibilidade com as jornadas do navegador

CORS e as proteções de navegador seguem a política existente por ambiente. A evidência cobre as respostas públicas da API e do proxy e as jornadas suportadas de navegação, autenticação e recuperação.

### RNF-003 — Privacidade e diagnóstico

Respostas públicas omitem detalhes internos e dados de terceiros. A equipe autorizada consegue correlacionar o resultado público e a classe da falha com registros internos que protegem dados sensíveis. O frontend mostra o estado de erro em texto conforme o fluxo.

## Critérios de aceitação

### CA-001 — Frequência e volume de cadastro e empréstimos (RF-001, RNF-001)

- Dadas solicitações válidas de cadastro e empréstimo abaixo, no limite e acima dos valores aprovados
- Quando cada caso é avaliado na janela aplicável
- Então os casos permitidos seguem as validações de negócio e os excedentes recebem a resposta documentada, sem criação parcial causada pela recusa

### CA-002 — Página inicial, continuação e conjunto vazio (RF-002, RNF-001)

- Dadas consultas e exportações autorizadas com mais resultados que o teto, e um filtro sem resultados
- Quando o usuário navega ou exporta os resultados segundo o contrato
- Então cada página respeita o teto, a continuação preserva filtros e autorização, e a busca sem resultados retorna estado vazio válido

### CA-003 — Página acima do teto (RF-002, RNF-001)

- Dada a solicitação de uma página acima do teto da operação
- Quando a listagem ou a exportação é avaliada
- Então a resposta segue o tratamento documentado e nenhum resultado entregue excede o teto

### CA-004 — Tamanho de campo e de solicitação (RF-003, RNF-001)

- Dadas entradas sintéticas válidas no limite e entradas acima do limite para campo textual e tamanho total
- Quando a API valida cada solicitação
- Então as entradas no limite seguem a jornada e as excedentes recebem erro de cliente com código público coerente

### CA-005 — Matriz de publicação (RF-004)

- Dado o inventário de recursos públicos, métricas, envio de e-mail e recuperação vigente e legada
- Quando perfis anônimo, autorizado e sem permissão acessam as operações pelo ambiente de teste publicado
- Então apenas as exceções definidas permitem acesso anônimo, as ações reservadas seguem a autorização e a página inicial exibe somente os dados aprovados

### CA-006 — Saúde, documentação e fallback (RF-005)

- Dados os ambientes de teste correspondentes a desenvolvimento e publicação, um endereço válido da SPA e caminhos inexistentes
- Quando os recursos são consultados
- Então health comunica o estado mínimo, a documentação interativa só aparece no contexto de desenvolvimento, a navegação válida abre a aplicação e cada caminho inexistente recebe a resposta do contrato de sua categoria

### CA-007 — Metadados e cabeçalhos na API e no proxy (RF-005, RF-007, RNF-002)

- Dadas respostas representativas de sucesso e erro na API e na superfície do proxy
- Quando a equipe confere os cabeçalhos e metadados de resposta
- Então as respostas incluem as proteções previstas para cada superfície e os metadados ficam dentro do inventário público aprovado

### CA-008 — Jornadas de navegador e CORS (RF-004, RF-006, RF-007, RNF-002)

- Dados os perfis de configuração de teste de desenvolvimento e publicação e as jornadas legítimas de navegador
- Quando a suíte valida navegação, autenticação, recuperação e origens permitidas ou vedadas
- Então cada jornada legítima segue disponível e cada caso de origem segue o contrato CORS existente, com `Vary` nas respostas que dependem da origem

### CA-009 — Cache em sucesso, erro e ausência de sessão (RF-006, RF-007)

- Dadas respostas de API de sucesso, falha e acesso sem sessão
- Quando seus cabeçalhos são analisados
- Então cada resposta apresenta `Cache-Control: no-store` e o `Vary` previsto para as variações aplicáveis

### CA-010 — Validação e falhas de domínio (RF-008, RNF-003)

- Dados casos sintéticos de entrada inválida, recurso ausente e conflito
- Quando as falhas chegam ao frontend
- Então cada caso apresenta o status `4xx`, o código público e a orientação definidos, sem detalhes internos

### CA-011 — Datas, JSON e caracteres (RF-009)

- Dados filtros com datas civis, instantes equivalentes com fusos distintos, um caso de JSON inválido e mensagens acentuadas
- Quando a API processa as solicitações e a interface apresenta os resultados
- Então os filtros respeitam a semântica documentada, JSON inválido recebe o erro previsto e as mensagens mantêm a acentuação

### CA-012 — Evidência de diagnóstico (RF-008, RNF-003)

- Dada uma falha sintética com resultado público
- Quando uma pessoa autorizada consulta os registros internos correspondentes
- Então consegue identificar a classe da falha e relacioná-la à operação, com omissão de detalhes sensíveis na resposta pública e de material de autenticação nos registros

## Estratégia de validação

Automatizar testes de contrato e integração em ambiente controlado, com casos no limite e acima do limite, perfis autorizados e não autorizados, respostas da API e do proxy e jornadas de navegador. Registrar a matriz de publicação e os contratos de limites, paginação, cabeçalhos e erros revisados. As evidências usam registros e contas sintéticas.

## Dependências e riscos

- A matriz de acesso vem de [Segurança de contas e sessões](../seguranca-de-contas-e-sessoes/prd.md). [Proteção de acesso, autenticação e frontend](../protecao-acesso-autenticacao/prd.md) embasa a política CORS, CSP e recuperação vigente.
- Os limites de transporte complementam as regras de quantidade em [Decisões e devoluções de empréstimos](../decisoes-e-devolucoes-de-emprestimos/prd.md). O teto de auditoria também se aplica a [Notificações e auditoria](../notificacoes-e-auditoria/prd.md).
- Mudanças de página, erros e cabeçalhos podem afetar consumidores legítimos, como a página inicial, as jornadas de recuperação e os relatórios. A revisão precisa identificar esses consumidores e suas dependências.

## Suposições

- Suposição — O inventário pode partir dos consumidores e das rotas existentes no repositório. Exceções públicas e compatibilidade de consumidores legados ainda exigem revisão.

## Decisões complementares

As escolhas desta etapa constam no [registro local de decisões](../decisoes-de-planejamento.md#api-limites-e-auditoria).

## Decisões da validação de descoberta

| Decisão | Recomendação | Resposta confirmada | Impacto |
| --- | --- | --- | --- |
| Dispensa do grilling | Consolidar os contratos solicitados pelas issues e as referências existentes | Dispensada pelo usuário | O inventário e os parâmetros ainda dependem de confirmação |
