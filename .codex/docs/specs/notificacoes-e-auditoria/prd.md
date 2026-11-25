# PRD: Notificações e auditoria

- Status: rascunho
- Responsável: não definido
- Atualizado em: 2026-11-15
- Validação de descoberta: dispensada-pelo-usuário

## Contexto e problema

Notificações individuais e coletivas precisam respeitar o mesmo escopo de destinatários na consulta, na contagem e na atualização. Cada destinatário acompanha a própria leitura. A auditoria precisa registrar eventos com autoria verificável e preservar o histórico de alterações de classificação, de modo que a equipe autorizada consiga revisar os resultados da detecção.

O contexto das notificações está em `NotificacoesController.cs`, `NotificacaoService.cs`, `Notificacao.cs` e `Notifications.ts`. O contexto da auditoria está em `AuditoriaController.cs`, `AuditoriaService.cs`, `AuditoriaMiddleware.cs`, `LogAuditoriaRepository.cs` e `Auditoria.tsx`.

| Issue | Requisitos | Critérios |
| --- | --- | --- |
| [#475 — Destinatários e leitura individual](https://github.com/ifpebj-ti/lab-solos/issues/475) | RF-001, RF-002, RF-003, RNF-001 | CA-001, CA-002, CA-003, CA-004, CA-005 |
| [#478 — Integridade da auditoria e detecção](https://github.com/ifpebj-ti/lab-solos/issues/478) | RF-004, RF-005, RF-006, RF-007, RNF-001, RNF-002 | CA-005, CA-006, CA-007, CA-008, CA-009, CA-010 |

## Objetivo e métricas de sucesso

Validar todos os casos da matriz aprovada de destinatários, ações e permissões. Nas evidências, uma atualização de leitura deve preservar o estado dos demais destinatários. Todos os eventos amostrados devem apresentar autoria ou ausência de ator válido conforme o caso. As mudanças de classificação precisam ter histórico próprio, e a detecção deve produzir o resultado esperado em todos os cenários sintéticos definidos na tabela de regras.

## Usuários e jornadas

- Destinatário que consulta, conta e marca como lidas as próprias notificações.
- Administrador ou processo autorizado que emite notificações e, quando permitido, solicita exclusão.
- Administrador com acesso à auditoria que consulta, exporta e revisa classificações.
- Equipe autorizada que avalia a confiabilidade dos eventos e os casos sinalizados.

## Escopo

### Incluído

- Escopo de destinatários para consulta, contagem, atualização individual e em lote e estado de leitura individual.
- Emissão e exclusão de notificações conforme permissões, elegibilidade, cotas e auditoria.
- Origem e validação de eventos, trilha de reclassificação, limites de consulta e exportação e critérios do detector.

### Fora de escopo

- Introdução de novos canais de notificação ou revisão do conteúdo das notificações do produto.
- Avisos de troca de e-mail e ciclo de sessão, que pertencem a [Segurança de contas e sessões](../seguranca-de-contas-e-sessoes/prd.md).

## Requisitos funcionais

### RF-001 — Escopo comum de destinatários

Listagem, filtro de não lidas, contagem e atualização de leitura, individual ou em lote, aplicam a mesma política de destinatários e usam o usuário autenticado como contexto. Resultados fora do escopo seguem o contrato de acesso sem divulgar dados da notificação.

### RF-002 — Leitura individual

O estado de leitura de uma notificação pertence a cada destinatário. Marcar uma notificação como lida atualiza somente a lista, o filtro e a contagem do usuário que realizou a ação.

### RF-003 — Emissão e exclusão autorizadas

Emissão manual e automática validam a autorização e a elegibilidade do destinatário ou grupo, conforme o tipo de notificação. A emissão respeita as cotas revisadas. A exclusão exige a autorização e o escopo definidos para a ação. Emissões e exclusões permitidas produzem a trilha prevista pela regra de negócio.

### RF-004 — Origem confiável dos eventos

O servidor determina ator, ação e recurso a partir do contexto da operação auditável e valida os campos registrados. O produto representa a ausência de ator válido sem atribuir a ação a outra conta.

A trilha obrigatória cobre decisões e concessões de conta, trocas de e-mail, baixas e devoluções de empréstimos, e emissão e exclusão de notificações. O evento ou seu registro durável integra a transação da operação. Se a gravação falhar, a operação é revertida. A trilha obrigatória tem retenção de 365 dias.

Falhas de operação e tentativas sem identidade válida integram o diagnóstico operacional, com retenção de 30 dias. Se o registro secundário falhar, o sistema sinaliza a falha com identificador de correlação e mantém o resultado da operação principal. O servidor registra ação, recurso, momento, resultado e origem, distinguindo usuário autenticado, processo autorizado e ausência de identidade válida. Excluir senhas, tokens e corpos completos de requisições.

### RF-005 — Revisão de classificações com histórico

Alterações de classificação respeitam os papéis, transições e justificativas aprovados. O evento original é preservado. Cada alteração permitida gera um evento próprio com autoria, momento, classificação anterior e resultante e motivo quando exigido.

### RF-006 — Consulta e exportação dentro do escopo

Consulta, relatório e exportação de auditoria exigem a autorização definida e respeitam os limites que se aplicam à operação. O produto preserva filtros e escopo ao navegar em resultados ou gerar uma exportação.

### RF-007 — Detecção revisável

O detector usa critérios documentados por categoria, com janelas, limiares e condições de avaliação. O resultado diferencia atividade normal, atividade suspeita e ausência de usuário válido. A classificação automática deve poder ser examinada pela equipe autorizada com base na regra aplicada.

## Requisitos não funcionais

### RNF-001 — Privacidade em notificações e auditoria

Respostas e evidências devem limitar dados ao escopo autorizado. Os eventos, exportações e evidências de validação devem omitir material de autenticação e dados pessoais sem finalidade definida. Listas vazias e falhas de acesso seguem os estados documentados da interface e da API.

### RNF-002 — Integridade e observabilidade da auditoria

A equipe autorizada consegue relacionar um evento ao contexto auditado e, quando aplicável, às reclassificações. A validação usa resultados sanitizados e demonstra a preservação do evento original e a aplicação das regras revisadas de detecção.

## Critérios de aceitação

### CA-001 — Consulta, contagem e leitura autorizadas (RF-001, RF-002, RNF-001)

- Dados destinatários com notificações individuais, coletivas e um usuário elegível sem notificações
- Quando cada usuário consulta, filtra, conta e marca as próprias notificações
- Então cada consulta e atualização segue o mesmo escopo, os filtros refletem a própria leitura e a ausência de resultados é exibida como lista vazia e contador zerado

### CA-002 — Notificação fora do escopo (RF-001, RNF-001)

- Dadas notificações fora do escopo de um usuário autenticado
- Quando esse usuário consulta ou tenta alterar sua leitura, individualmente ou em lote
- Então os itens fora do escopo não são exibidos, contabilizados ou alterados, e o resultado segue o contrato público de acesso

### CA-003 — Leitura coletiva por destinatário (RF-002)

- Dada uma notificação coletiva não lida destinada a dois usuários sintéticos
- Quando o primeiro usuário registra a própria leitura
- Então a notificação passa a lida para o primeiro e mantém a lista, a contagem e o estado de não lida do segundo

### CA-004 — Permissões, destinatários e cotas (RF-003)

- Dados casos de emissão manual e automática com permissões, elegibilidade e volume dentro e fora dos limites aprovados
- Quando as emissões são avaliadas
- Então somente as previstas na política são efetivadas, e os casos excedentes ou inelegíveis recebem o tratamento definido

### CA-005 — Exclusão e trilha da operação (RF-003, RF-004)

- Dadas solicitações autorizadas e sem autorização para exclusão de notificação e uma emissão efetivada
- Quando o resultado de cada operação e seu histórico são consultados
- Então a exclusão ocorre somente no caso permitido e os eventos exigidos pela regra são vinculados à ação e ao ator ou processo que a realizou

### CA-006 — Proveniência do evento (RF-004, RNF-001, RNF-002)

- Dados eventos sintéticos de operações auditáveis com ator válido e sem ator válido
- Quando a auditoria registra as operações
- Então ator, ação e recurso correspondem ao contexto confiável, a ausência de ator é representada conforme a regra e os registros omitem material de autenticação

### CA-007 — Classificação autorizada e histórico (RF-005, RNF-002)

- Dados um evento e solicitações de reclassificação permitidas e proibidas pela regra
- Quando as solicitações são avaliadas
- Então somente as permitidas alteram a classificação, o evento original permanece verificável e cada alteração concluída tem evento próprio com autoria, momento, mudança e motivo quando exigido

### CA-008 — Autorização, filtros e limites de exportação (RF-006, RNF-001)

- Dados usuários com e sem permissão e resultados que ultrapassam o teto revisado
- Quando consultam, geram relatório ou exportam auditoria
- Então apenas o perfil autorizado recebe resultados dentro dos limites, com preservação dos filtros e do escopo

### CA-009 — Detecção nas janelas e nos limiares (RF-007, RNF-002)

- Dados eventos sintéticos normais, suspeitos e sem usuário válido, incluindo casos de fronteira das regras
- Quando o detector avalia cada conjunto
- Então o resultado coincide com a categoria esperada e pode ser relacionado à regra documentada que determinou a avaliação

### CA-010 — Evidência minimizada (RNF-001, RNF-002)

- Dadas amostras sintéticas dos registros, do histórico e de uma exportação autorizada
- Quando a equipe revisa os campos e as evidências coletadas
- Então os campos correspondem às finalidades definidas, omitem material de autenticação e permitem verificar as relações entre evento, classificação e trilha correspondente

## Estratégia de validação

Automatizar a matriz de destinatários, leitura individual e em lote, permissão de emissão e exclusão, cotas, autoria e reclassificação. Cobrir a exportação e os resultados de detecção com eventos e contas sintéticas, incluindo estados sem resultados e fronteiras de janelas e limiares. Anexar a matriz e a tabela de regras revisadas, acompanhadas das evidências sanitizadas das operações.

## Dependências e riscos

- A matriz de acesso de [Segurança de contas e sessões](../seguranca-de-contas-e-sessoes/prd.md) orienta a elegibilidade. O teto de consulta e exportação segue [Proteção da API e do proxy](../protecao-de-api-e-proxy/prd.md).
- A detecção depende de eventos confiáveis e de critérios revisáveis. A equipe deve documentar como distingue a ausência de usuário válido de eventos atribuídos a uma conta.
- Notificações coletivas já emitidas podem ter histórico insuficiente para determinar o estado de cada destinatário. O tratamento desse histórico precisa de decisão explícita.

## Suposições

- Suposição — As notificações individuais e coletivas continuam nas jornadas atuais, com isolamento de leitura para cada destinatário. Seleção de grupos e tratamento histórico aguardam revisão.

## Decisões complementares

As escolhas desta etapa constam no [registro local de decisões](../decisoes-de-planejamento.md#api-limites-e-auditoria).

## Decisões da validação de descoberta

| Decisão | Recomendação | Resposta confirmada | Impacto |
| --- | --- | --- | --- |
| Dispensa do grilling | Usar as issues e o comportamento documentado como base | Dispensada pelo usuário | Regras de destinatários, auditoria e detecção exigem confirmação nos itens em aberto |
| Registro e retenção da auditoria (#478) | Distinguir trilha transacional obrigatória e diagnóstico operacional | Aprovada pelo usuário conforme RF-004 e a [política técnica](./techspec.md#política-aprovada-de-registro-e-retenção) | Define origens, eventos, campos mínimos, prazos e tratamento de falhas. |
