# PRD: Integração e transferências entre laboratórios

- Status: rascunho para validação com o cliente
- Responsável pela definição: Nathan Maciel
- Atualizado em: 2026-11-03
- Validação de descoberta: confirmada
- Confirmação da descoberta: usuário confirmou o escopo após 39 decisões de descoberta e a consolidação da rodada 40
- Validação com o cliente: pendente, conforme informado pelo usuário
- Etapa: requisitos de produto; não autoriza implementação nem representa aprovação do cliente

## Contexto e problema

O LabOn gerencia materiais, estoques, usuários e empréstimos. Sua proposta histórica de **Comunicação InterLab** previa um mural de pedidos e ofertas de materiais entre laboratórios, com contato externo para combinar a transação. As telas eram protótipos com dados simulados e sem um fluxo operacional completo; posteriormente foram retiradas da navegação.

A necessidade atual é mais ampla: permitir que laboratórios parceiros encontrem materiais compartilháveis, solicitem uma cessão, negociem a quantidade, aprovem o compromisso e registrem saída e recebimento. As equipes precisam saber o que foi acordado, o que saiu e o que foi aceito pelo destinatário, com efeitos coerentes nos dois estoques.

O produto também precisa distinguir os laboratórios e suas equipes. A base atual não possui um vínculo explícito de laboratório em usuários e produtos. Portanto, organizar a operação por laboratório, admitir participantes e delimitar acessos são partes do escopo, e não capacidades existentes presumidas.

### Evidências do repositório

- `README.md`: propósito de gestão de insumos, estoque e permissões.
- Histórico Git, commit `fbf70419c0091e68abffa5b2bdec97b6b2167554`: construção de telas de comunicação intercampi.
- Histórico `078b893^:frontend/src/pages/admin/ViewInfo.tsx`, `CreateInfo.tsx` e `frontend/src/components/global/table/ItemViewInfo.tsx`: pedidos/ofertas, dados simulados, submissão sem persistência e orientação de contato externo.
- `.codex/docs/specs/visibilidade-posicionamento-funcionalidades/techspec.md` e `tasks.md`: inventário e remoção das entradas não operacionais de InterLab.
- `.codex/docs/specs/reformulacao-design/prd.md`: reintroduzir InterLab não operacional não fazia parte do redesenho.
- `backend/LabSolos-Server-DotNet8/Data/Context/AppDbContext.cs`, `Models/Usuario.cs`, `Models/Produto.cs`, `Models/Lote.cs` e `Models/Academico.cs`: contexto atual sem organização explícita por laboratório; instituição textual de acadêmico não equivale a esse vínculo.
- `Enums/TipoProduto.cs`, `Enums/UnidadeMedida.cs` e modelos de produtos no mesmo projeto: químicos, vidrarias e outros, com unidades e características próprias.
- `docs/manual/perfis-e-permissoes.md`: perfis e jornadas atuais. As permissões InterLab definidas neste PRD são próprias desta funcionalidade; não devem ser deduzidas das permissões de empréstimo.

Os caminhos são evidências de contexto. Não prescrevem arquitetura, contratos técnicos, estrutura de dados ou reaproveitamento de componentes.

## Objetivo e métricas de sucesso

Permitir uma cessão definitiva de material entre dois laboratórios parceiros, desde a descoberta até o recebimento, com compromisso de quantidade explícito, rastreabilidade das decisões e atualização dos estoques sem lançamentos manuais duplicados.

| Resultado | Medida e evidência de sucesso | Momento de validação |
| --- | --- | --- |
| Jornada completa utilizável | Dois laboratórios parceiros concluem uma cessão real: localizar, solicitar, acordar, reservar, registrar saída e confirmar recebimento. | Piloto após homologação. |
| Estoques coerentes | Na cessão do piloto, saída descontada da origem e quantidade aceita adicionada ao destino correspondem ao histórico, sem duplicação ou necessidade de repetir manualmente os lançamentos. | Homologação e piloto. |
| Compromissos respeitados | Os cenários de concorrência demonstram que uma quantidade reservada não pode ser comprometida ou retirada novamente. | Homologação controlada. |
| Exceções rastreáveis | Cancelamento, expiração, divergência, complementação, encerramento acordado e correção têm os resultados especificados e registros verificáveis pelos envolvidos. | Homologação controlada. |
| Acesso delimitado | A matriz de permissões é comprovada, inclusive para mentorados, não parceiros e administrador da rede. | Homologação controlada. |

Não foram definidas metas de adesão, volume de transferências, economia financeira ou redução percentual de tempo. Não atribuir esses resultados ao produto antes de pactuar uma linha de base e validá-los com o cliente.

## Usuários e jornadas

### Papéis

| Papel | Responsabilidades e limites |
| --- | --- |
| Administrador da rede | Validar dados institucionais e vínculo do responsável; aprovar ou recusar a admissão; administrar a participação e suspender laboratórios. O papel não concede acesso a estoques ou negociações. |
| Administrador do laboratório | Aprovar ingresso e definir perfil da equipe; estabelecer e encerrar parcerias; gerenciar catálogo; executar solicitações, negociações, saídas, recebimentos e resoluções em nome do próprio laboratório. |
| Mentor | Gerenciar catálogo e executar as mesmas operações de transferência do administrador local. Não pode, por esse papel, admitir laboratórios, aprovar ingresso na equipe ou estabelecer e encerrar parcerias. |
| Mentorado | Consultar diretório e catálogos dos parceiros do próprio laboratório. Não pode solicitar, negociar ou acessar transferências, comentários e seus avisos. |

Cada conta de equipe pertence a um único laboratório. As regras de provisionamento e eventual acúmulo do papel de administrador da rede precisam do refinamento indicado nas perguntas abertas; esse papel nunca concede permissões locais automaticamente.

### Jornadas principais

1. O responsável solicita a admissão do laboratório. A administração da rede verifica os dados e o vínculo, registra a decisão justificada e, em caso de aprovação, libera a participação.
2. Uma pessoa solicita ingresso em um laboratório. O administrador desse laboratório aprova o vínculo e define seu perfil antes de conceder acesso.
3. Um administrador local encontra outro laboratório no diretório, solicita parceria e aguarda aceite da outra instituição.
4. Um administrador ou mentor publica materiais compartilháveis e a cota que pretende ceder. Parceiros consultam o catálogo; não recebem acesso ao estoque interno completo.
5. Um administrador ou mentor encontra um material e abre uma solicitação com uma quantidade. O fornecedor aprova integralmente, recusa ou propõe quantidade menor.
6. A aprovação integral reserva a quantidade; a contraproposta reserva somente após o aceite e nova verificação de disponibilidade. O fornecedor informa uma data limite para a saída.
7. Um administrador ou mentor da origem registra a saída principal pela quantidade acordada. O estoque de origem é descontado e o destinatário é avisado.
8. Um administrador ou mentor do destino informa quanto aceita, escolhe um registro compatível ou cria um novo, e confirma a entrada. Diferenças ficam pendentes para os dois laboratórios.
9. As equipes usam comentários e ações rastreáveis para complementar o que falta, encerrar uma divergência em comum acordo ou corrigir um lançamento equivocado.

### Vocabulário de produto

- **Estoque interno:** saldo gerenciado pelo laboratório; não é integralmente exposto aos parceiros.
- **Cota compartilhada:** quantidade que o laboratório explicitamente decide disponibilizar para cessão. É consumida pelas saídas e não se recompõe automaticamente com novas entradas.
- **Quantidade reservada:** compromisso confirmado que permanece no estoque de origem até a saída, mas não pode ser destinado a outro uso.
- **Disponível para solicitar:** quantidade compartilhada ainda livre, limitada também pelo estoque efetivamente disponível e pelas reservas existentes.
- **Quantidade acordada:** quantidade aprovada integralmente ou aceita pelo solicitante em uma contraproposta.
- **Quantidade aceita:** parte do material recebido que o destinatário admite no próprio estoque. Pode ser zero em caso de recusa total.
- **Divergência:** diferença ainda não resolvida entre o acordado/enviado e o aceito, incluindo falta, avaria ou especificação incorreta.

## Escopo

### Incluído

- Operação com equipes, estoques e dados delimitados por laboratório dentro do LabOn.
- Vinculação dos dados existentes a um laboratório inicial, preservando contas, perfis e histórico.
- Admissão institucional sujeita a validação manual, ingresso de equipe sujeito a aprovação local e suspensão de participação.
- Diretório institucional e parcerias bilaterais entre laboratórios, inclusive de instituições diferentes.
- Catálogo selecionado por laboratório, com cota compartilhada para químicos, vidrarias e outros materiais.
- Cessões definitivas, um material por solicitação e uma saída principal pela quantidade acordada.
- Aprovação, recusa, contraproposta, aceite, reserva, cancelamento, expiração, saída e recebimento.
- Atualização dos estoques e preservação da procedência e das características do material recebido.
- Divergências, complementações, encerramento em comum acordo e correções de quantidade rastreáveis.
- Comentários vinculados à solicitação e avisos exclusivamente dentro do LabOn.
- Homologação controlada e piloto real entre dois laboratórios parceiros.

### Fora de escopo

- Rastreamento de transporte, localização de carga, transportadora ou acompanhamento de entrega física.
- Empréstimos InterLab com obrigação de devolver ou repor materiais.
- Vários materiais em uma solicitação ou divisão planejada da saída principal em vários envios.
- Rede de materiais aberta a qualquer laboratório sem parceria aceita.
- Exposição do estoque interno completo e renovação automática de cotas compartilhadas.
- Integração de estoque com outros softwares ou participação de parceiros cujo estoque permaneça exclusivamente em outro sistema.
- Uma conta de equipe vinculada simultaneamente a vários laboratórios.
- Chat geral entre laboratórios e avisos por e-mail.
- Transferência de materiais vencidos mediante exceção de autorização.
- Acesso geral do administrador da rede aos estoques e negociações.
- Definição de arquitetura, contratos técnicos, estrutura de dados e plano de implementação; pertencem às próximas etapas do SDD.

## Requisitos funcionais

### RF-001 — Delimitar a operação por laboratório

O produto deve identificar a qual laboratório pertencem contas de equipe, materiais, estoques e operações. Cada conta de equipe deve ter um único vínculo de laboratório. Permissões locais e dados internos ficam restritos a esse vínculo, salvo o acesso compartilhado expressamente definido para parcerias e transferências.

### RF-002 — Preservar a base existente

A introdução de laboratórios deve vincular os dados atuais a um laboratório inicial, preservando contas, perfis, saldos, relacionamentos e histórico. A habilitação da rede não deve publicar automaticamente esse estoque nem criar parcerias.

### RF-003 — Solicitar admissão institucional

O responsável deve solicitar a inclusão do laboratório informando nome do laboratório, instituição, localização, contato institucional e sua identificação. A solicitação ainda não aprovada não autoriza participação no diretório de laboratórios admitidos, consulta de catálogos ou operações InterLab.

### RF-004 — Validar e decidir a admissão

O administrador da rede deve validar manualmente os dados institucionais e o vínculo do responsável por meio de contato institucional verificável. Deve registrar o resultado e uma decisão de aprovação ou recusa com justificativa. A validação com o cliente deste PRD não substitui a validação institucional de cada participante.

### RF-005 — Aprovar ingresso e perfil de equipe

A pessoa deve poder solicitar ingresso em um laboratório. Somente um administrador desse laboratório pode aprovar o vínculo e definir o perfil. A simples escolha de laboratório no cadastro não concede acesso e não permite um segundo vínculo simultâneo.

### RF-006 — Aplicar os papéis InterLab

Administradores locais e mentores devem poder gerenciar o catálogo e operar todas as ações de transferência autorizadas pelo lado que representam e pelo estado da solicitação. Mentorados só consultam diretório e catálogos de parceiros. O papel de administrador da rede não concede acesso a estoques, transferências ou comentários.

As permissões de catálogo não ampliam automaticamente as permissões de edição do estoque interno fora desta funcionalidade. Encerrar uma divergência ou aceitar uma correção que depende do outro laboratório não pode ser substituído por uma segunda ação de alguém do mesmo laboratório.

### RF-007 — Consultar diretório institucional

Os participantes autorizados devem encontrar laboratórios admitidos por nome, instituição e localização. Antes de uma parceria aceita, o diretório expõe somente identificação institucional, sem catálogo, saldo interno ou negociações. Estados sem participantes ou sem correspondências de busca devem ser informados claramente.

### RF-008 — Estabelecer parceria bilateral

Somente administradores locais devem enviar, aceitar ou recusar solicitações de parceria em nome do próprio laboratório. O aceite da outra parte libera acesso ao catálogo compartilhado. Uma solicitação pendente não equivale a uma parceria e não libera esse acesso.

### RF-009 — Encerrar parceria preservando compromissos

Somente administradores locais podem encerrar uma parceria. O encerramento deve bloquear o acesso aos catálogos e novas solicitações entre as partes, preservando o acesso às solicitações existentes para acompanhamento, conclusão ou cancelamento conforme seu estado. O histórico das transferências realizadas permanece acessível aos participantes autorizados.

### RF-010 — Gerenciar e pesquisar o catálogo compartilhado

Administradores locais e mentores devem escolher quais materiais do próprio laboratório publicar ou retirar do catálogo e informar a quantidade disponibilizada. Parceiros autorizados devem encontrar os materiais publicados e sua quantidade compartilhada disponível. Químicos, vidrarias e outros materiais são elegíveis, respeitadas suas características, unidades e validade.

A retirada de uma publicação ou alteração da cota não deve apagar o histórico nem desfazer silenciosamente uma reserva confirmada.

### RF-011 — Controlar a cota e a disponibilidade

A quantidade publicada deve funcionar como uma cota que se esgota com as transferências. Reservas reduzem temporariamente o disponível para novas solicitações; uma saída consome a quantidade correspondente da cota. Cancelar ou expirar antes da saída libera a reserva sem consumir a cota. Aumento da cota depende de ação explícita de administrador local ou mentor.

Novas entradas de estoque não renovam a cota automaticamente. O catálogo nunca deve prometer uma quantidade superior ao estoque efetivamente disponível para aquele uso. Uma redução do estoque interno não pode consumir quantidades já reservadas.

### RF-012 — Bloquear materiais vencidos

Materiais com validade vencida não podem ser publicados, aprovados ou enviados. A validade deve ser reavaliada na saída, mesmo quando o material estava válido na aprovação. Se vencer durante a reserva, a saída é bloqueada e a transferência pode ser cancelada. Materiais sem exigência de validade seguem as regras aplicáveis à sua categoria.

### RF-013 — Solicitar uma cessão definitiva

Um administrador local ou mentor deve solicitar um único material publicado por um parceiro, indicando uma quantidade válida na unidade desse material. A solicitação deve identificar origem, destino, material e quantidade, sem obrigação de devolução. Solicitações pendentes não reservam estoque. Quantidades inválidas ou superiores ao disponível informado no momento da solicitação devem receber um resultado claro, sem criar um compromisso indevido.

### RF-014 — Aprovar integralmente ou recusar

O laboratório fornecedor, por administrador local ou mentor, deve poder aprovar a quantidade solicitada ou recusar a solicitação. A aprovação depende de material elegível e disponibilidade atual tanto no estoque quanto na cota. Uma aprovação sem disponibilidade suficiente deve ser impedida e informada, sem baixa ou reserva parcial implícita. A recusa não movimenta estoque.

### RF-015 — Propor e aceitar quantidade menor

O fornecedor deve poder propor quantidade positiva menor que a solicitada. O solicitante deve aceitar expressamente antes de a transferência prosseguir. A proposta pendente não reserva material. No aceite, o sistema deve verificar novamente validade, prazo e disponibilidade; somente um aceite viável confirma a quantidade acordada e a reserva.

Se a disponibilidade tiver ficado insuficiente, a proposta não pode ser confirmada como se houvesse reserva; as partes devem ser informadas e poder renegociar pelo fluxo de contraproposta. Recusar a proposta ou cancelar antes da saída não movimenta estoque.

### RF-016 — Reservar o compromisso confirmado

A aprovação integral e o aceite viável de uma contraproposta devem reservar a quantidade acordada no estoque de origem. Uma reserva não é baixa física, mas deve impedir a destinação da mesma quantidade a outra transferência ou retirada interna. Confirmações concorrentes não podem reservar o mesmo saldo mais de uma vez.

### RF-017 — Definir prazo e expirar antes da saída

O fornecedor deve informar uma data limite para a saída ao aprovar ou fazer uma contraproposta. O prazo deve ficar visível aos dois lados. O aceite de uma contraproposta vencida deve ser impedido. Se o prazo vencer antes da saída, a transferência deve expirar, liberar eventual reserva e avisar os dois laboratórios. Uma saída já registrada não deve ser desfeita pelo vencimento posterior desse prazo.

### RF-018 — Cancelar antes da saída

Administradores locais e mentores de qualquer uma das partes devem poder cancelar antes da saída, inclusive depois de uma aprovação ou aceite. O cancelamento libera eventual reserva e avisa a outra parte, sem baixa ou entrada de estoque. Após a saída, cancelamento não pode substituir recebimento, divergência ou correção rastreável.

### RF-019 — Registrar a saída principal

Um administrador local ou mentor da origem deve registrar uma única saída principal correspondente à quantidade acordada e reservada, respeitando validade e prazo. A operação deve converter o compromisso em baixa no estoque de origem, consumir a cota correspondente e avisar o destinatário.

A saída principal não pode ser planejada em parcelas. Repetir sua confirmação não pode gerar outra baixa. O histórico deve indicar material, quantidade, unidade, origem, destino, responsável e momento da saída.

### RF-020 — Registrar recebimento e entrada

Um administrador local ou mentor do destino deve registrar quanto aceita do material enviado, inclusive zero em caso de recusa total. A quantidade aceita deve entrar no estoque do destino uma única vez e o laboratório de origem deve ser avisado. Confirmar o recebimento não registra rastreamento de transporte.

O recebimento deve permitir escolher um registro compatível ou criar um novo. Deve preservar a procedência da transferência e os dados do material, impedindo a soma em registros incompatíveis, como lote, validade, especificação ou unidade diferentes.

### RF-021 — Abrir e acompanhar divergência

Recebimento inferior ao acordado, avaria ou especificação diferente devem permitir registrar quantidade aceita, justificativa do problema e divergência pendente sobre o restante. Somente o que foi aceito entra no estoque disponível. Os dois laboratórios devem poder identificar o que foi enviado, aceito e continua pendente; um recebimento parcial não deve encerrar silenciosamente a transferência.

### RF-022 — Resolver por complementação ou acordo

As partes devem poder resolver uma divergência por complementação ou por encerramento justificado sem reposição, com concordância dos dois laboratórios. Uma complementação deve ter seus próprios registros vinculados de saída e recebimento, refletindo as quantidades efetivamente movimentadas nos estoques e sem reutilizar a baixa da saída principal como se fosse uma nova saída.

O encerramento sem reposição preserva no histórico a diferença, a justificativa e a concordância das partes; não cria uma entrada fictícia. A ausência de obrigação de devolução da cessão não elimina a necessidade de resolver uma divergência. O tratamento de retornos físicos de materiais recusados e de complementações envolvendo laboratório suspenso depende das perguntas abertas.

### RF-023 — Corrigir quantidade com acordo rastreável

Um laboratório deve poder propor a correção de uma quantidade de saída ou recebimento lançada por engano, com justificativa. A concordância do outro laboratório é necessária antes de alterar os estoques. Os registros originais devem ser preservados, identificando proposta, responsáveis, decisão e efeitos do ajuste.

Uma correção que retire material de algum estoque depende de disponibilidade suficiente e não pode consumir outra reserva. Sem concordância ou sem disponibilidade necessária, o ajuste não deve ser aplicado nem sobrescrever o registro original.

### RF-024 — Comentar no contexto da solicitação

Administradores locais e mentores dos laboratórios envolvidos devem poder trocar comentários vinculados à solicitação, inclusive para esclarecer especificações e resolver divergências. Os comentários integram o histórico e não constituem um chat geral. Comentários não substituem os aceites e ações explícitas exigidos para alterar compromissos ou estoques.

### RF-025 — Avisar dentro do LabOn

Eventos que exigem ação ou ciência devem produzir avisos dentro do LabOn, sem e-mail. Os avisos operacionais devem chegar a todos os administradores e mentores do laboratório que precisa agir ou ser informado, e não somente à pessoa que iniciou a operação.

Devem abranger solicitações e decisões de parceria, novas solicitações de material, aprovação ou recusa, contraproposta e sua resposta, cancelamento, expiração, saída, recebimento, divergência, complementação, proposta/decisão de encerramento ou correção, comentários e suspensão que afete operações. Mentorados não recebem avisos de negociações. O aviso não deve ampliar o acesso do destinatário ao conteúdo protegido.

### RF-026 — Suspender participação na rede

O administrador da rede deve poder suspender um laboratório com justificativa registrada e aviso aos envolvidos, sem acessar o conteúdo de estoques ou negociações. A suspensão deve bloquear novas parcerias e solicitações, cancelar transferências que ainda não tiveram saída e liberar suas reservas.

Materiais que já saíram devem continuar com recebimento e resolução de divergências disponíveis aos participantes autorizados, preservando os registros. A suspensão não gera reversão automática de baixas ou entradas já ocorridas. A autorização de uma nova saída complementar durante a suspensão precisa do refinamento indicado em PA-001.

### RF-027 — Consultar acompanhamento e histórico

Administradores locais e mentores devem consultar as solicitações enviadas e recebidas do próprio laboratório, seus estados, quantidades, prazos, ações pendentes, comentários e decisões. O acompanhamento deve distinguir ao menos espera de decisão, espera de aceite de contraproposta, reserva aguardando saída, saída aguardando recebimento, divergência, conclusão, recusa, cancelamento e expiração, sem impor nomes técnicos de implementação.

Histórico e operações em andamento permanecem acessíveis aos participantes autorizados após encerramento da parceria e, nos limites definidos, durante suspensão. Listagens vazias e buscas sem resultado devem explicar a ausência e apresentar apenas ações permitidas. O administrador da rede não recebe acesso a esse acompanhamento.

## Requisitos não funcionais

### RNF-001 — Autorização e isolamento verificáveis

Toda consulta e ação deve verificar sessão válida, perfil, vínculo de laboratório e alcance do registro. Ocultar uma opção na interface não é suficiente. Alterar um identificador ou tentar uma ação por outro caminho não pode revelar dados de terceiros nem executar uma operação proibida. Estoques internos, negociações e comentários não devem vazar pelo diretório, catálogo ou avisos.

### RNF-002 — Consistência entre compromissos e estoques

Reservas, saídas, recebimentos, cancelamentos, expirações, complementações e correções devem manter saldos e compromissos coerentes. Nenhuma confirmação válida pode criar estoque negativo ou comprometer a mesma quantidade duas vezes. Uma operação recusada ou interrompida não pode aparecer como concluída com apenas parte dos seus efeitos.

### RNF-003 — Repetição segura de ações

Repetir uma confirmação por duplo clique, recarregamento ou nova tentativa após falha de comunicação não deve duplicar solicitação confirmada, reserva, baixa, entrada, ajuste ou respectivo aviso do mesmo evento. O usuário deve conseguir verificar o resultado efetivo antes de tentar novamente.

### RNF-004 — Rastreabilidade e preservação histórica

Decisões institucionais e eventos de parceria, catálogo, transferência e estoque devem permitir identificar autor, laboratório representado, momento, ação e justificativa quando exigida pelo fluxo. Alterações de quantidade devem preservar os valores originais e os ajustes. Encerrar parceria, suspender participação ou corrigir um lançamento não apaga o ocorrido.

### RNF-005 — Privacidade conforme o papel

O diretório deve expor apenas identificação institucional. Catálogos de parceiros devem expor os materiais selecionados e sua disponibilidade compartilhada, sem revelar o saldo interno completo. O administrador da rede consulta os dados necessários à admissão e participação institucional; seu papel não lhe permite consultar estoques, negociações ou comentários.

### RNF-006 — Clareza, acessibilidade e erros recuperáveis

As jornadas devem ser utilizáveis por teclado, com controles identificados, foco perceptível e estados compreensíveis sem depender apenas de cor. Quantidade, unidade, laboratório representado, prazo e efeito sobre estoque devem estar claros nas confirmações. Erros de disponibilidade, prazo, autorização ou comunicação não devem ser apresentados como sucesso; deve ser possível consultar o resultado atual sem refazer indevidamente a movimentação.

### RNF-007 — Evidência da entrega

A entrega deve produzir evidências da homologação dos critérios aplicáveis e de uma cessão real entre dois laboratórios após a homologação. Deve ser possível comparar o histórico com os saldos e compromissos antes e depois, demonstrando a ausência de lançamentos duplicados. Evidências de teste não equivalem à aprovação do cliente nem à realização do piloto.

## Critérios de aceitação

### CA-001 — Vínculo único e alcance local (RF-001, RF-005, RNF-001)

- Dado um usuário de equipe vinculado ao laboratório A
- Quando consulta dados internos ou tenta ingressar simultaneamente no laboratório B
- Então seu acesso continua limitado ao vínculo autorizado e um segundo vínculo simultâneo não é concedido.

### CA-002 — Organização da base atual (RF-001, RF-002, RNF-004)

- Dado o conjunto atual de contas, perfis, materiais, saldos e histórico
- Quando a organização por laboratório é habilitada
- Então esses dados ficam associados ao laboratório inicial sem perda de valores ou relacionamentos e sem publicação automática no catálogo.

### CA-003 — Solicitação de admissão ainda pendente (RF-003, RNF-001)

- Dado um responsável que informou dados institucionais e solicitou inclusão
- Quando a validação ainda não foi aprovada
- Então o laboratório não participa do diretório de admitidos nem obtém acesso a catálogos ou transferências; dados obrigatórios ausentes impedem concluir a solicitação com mensagem clara.

### CA-004 — Decisão institucional justificada (RF-004, RNF-004, RNF-005)

- Dado um laboratório aguardando validação e um administrador da rede
- Quando o administrador verifica dados e vínculo do responsável e aprova ou recusa com justificativa
- Então o resultado da verificação e a decisão ficam registrados, e somente a aprovação libera a participação, sem conceder ao administrador acesso a estoques ou negociações.

### CA-005 — Aprovação de ingresso pela equipe correta (RF-005, RF-006, RNF-001)

- Dado um pedido de ingresso no laboratório A
- Quando um administrador de A aprova e define o perfil
- Então o vínculo e as permissões correspondentes são concedidos; a mesma ação por mentor, mentorado ou administrador de B é recusada.

### CA-006 — Permissões de administradores e mentores (RF-006, RF-010)

- Dado um administrador local ou mentor de um laboratório admitido
- Quando gerencia o próprio catálogo ou executa uma transferência no lado e estado autorizados
- Então a ação é permitida sem conceder gestão de parcerias ao mentor nem ampliar automaticamente a edição do estoque interno fora do InterLab.

### CA-007 — Consulta limitada do mentorado (RF-006, RF-007, RF-010, RNF-001)

- Dado um mentorado vinculado a laboratório admitido
- Quando consulta o diretório e o catálogo de um parceiro ou tenta acessar uma negociação
- Então as consultas permitidas funcionam, mas solicitação, negociação, comentários e avisos de negociação permanecem inacessíveis, inclusive por acesso direto ao registro.

### CA-008 — Diretório e busca sem resultados (RF-007, RNF-005, RNF-006)

- Dado um participante autorizado, com ou sem laboratórios correspondentes à busca
- Quando pesquisa por nome, instituição ou localização
- Então recebe apenas identificação institucional dos laboratórios admitidos correspondentes, ou uma indicação clara de lista vazia, sem exposição de estoque, catálogo não autorizado ou negociações.

### CA-009 — Parceria depende do outro laboratório (RF-008, RNF-001)

- Dado um administrador de A que solicita parceria a B
- Quando a solicitação permanece pendente, é recusada ou é aceita por administrador de B
- Então somente o aceite de B libera o acesso bilateral aos catálogos; mentor ou administrador de A não pode aceitar em nome de B.

### CA-010 — Encerramento preserva solicitações existentes (RF-009, RF-027, RNF-004)

- Dado uma parceria com solicitações pendentes, transferências em andamento e histórico
- Quando um administrador de uma das partes encerra a parceria
- Então novos pedidos e consulta ao catálogo do antigo parceiro ficam bloqueados, mas as solicitações existentes continuam tratáveis conforme seus estados e seu histórico permanece acessível aos operadores autorizados.

### CA-011 — Catálogo selecionado e sem publicação implícita (RF-010, RNF-005)

- Dado materiais químicos, vidrarias e outros no estoque de um laboratório
- Quando administrador ou mentor publica apenas alguns deles com suas cotas
- Então parceiros encontram somente os publicados e sua quantidade compartilhada disponível; um parceiro sem publicações apresenta catálogo vazio, sem expor os demais materiais ou o saldo interno.

### CA-012 — Cota consumida sem recomposição automática (RF-011)

- Dado um laboratório com 2 litros em estoque e uma cota publicada de 500 mL
- Quando transfere 200 mL e posteriormente recebe mais estoque interno
- Então a cota remanescente é 300 mL e só aumenta por uma ação explícita autorizada, sempre limitada pela disponibilidade real.

### CA-013 — Reserva e liberação na disponibilidade do catálogo (RF-011, RF-016, RF-018)

- Dado uma cota disponível de 500 mL
- Quando uma transferência reserva 200 mL e depois é cancelada antes da saída
- Então o disponível para novos pedidos passa a 300 mL durante a reserva e retorna a 500 mL após a liberação, sem baixa de estoque ou consumo definitivo da cota.

### CA-014 — Estoque interno menor que a cota e alteração da publicação (RF-010, RF-011, RNF-002)

- Dado uma cota publicada, retiradas internas possíveis e reservas confirmadas
- Quando o saldo livre diminui ou um operador altera ou retira a publicação
- Então o catálogo não oferece mais que o saldo livre real, nenhuma reserva é consumida por retirada interna e os compromissos e o histórico não são apagados pela alteração da publicação.

### CA-015 — Bloqueio por validade vencida (RF-012)

- Dado um material sujeito a validade que já venceu ou vence depois da aprovação
- Quando um operador tenta publicá-lo, aprová-lo ou registrar sua saída após o vencimento
- Então a ação correspondente é bloqueada; uma reserva anterior não autoriza a saída e pode ser liberada por cancelamento. Material sem exigência de validade não é bloqueado por ausência desse dado.

### CA-016 — Pedido de um material e quantidade válida (RF-013)

- Dado um catálogo de parceiro aceito com material disponível
- Quando um administrador ou mentor solicita uma quantidade válida na unidade do material
- Então é criada uma solicitação de cessão definitiva com um único material, sem reserva ou baixa; quantidade não positiva, inválida ou superior ao disponível na solicitação é rejeitada com explicação.

### CA-017 — Pedido fora do alcance (RF-008, RF-013, RNF-001)

- Dado um laboratório sem parceria aceita, uma publicação indisponível ou um usuário sem permissão
- Quando tenta solicitar um material por qualquer caminho
- Então a ação é recusada sem criar solicitação ou revelar dados internos que não lhe são acessíveis.

### CA-018 — Aprovação integral ou recusa (RF-014, RF-016)

- Dado uma solicitação pendente com estoque e cota suficientes
- Quando o fornecedor aprova integralmente ou recusa
- Então a aprovação confirma a quantidade e cria sua reserva; a recusa não reserva nem movimenta estoque, e a decisão é identificável pelo solicitante.

### CA-019 — Aprovação sem saldo suficiente (RF-014, RF-016, RNF-002)

- Dado uma solicitação cuja disponibilidade diminuiu desde sua criação
- Quando o fornecedor tenta aprovar quantidade que não pode mais comprometer
- Então a aprovação é impedida com informação de indisponibilidade, sem reserva parcial implícita, baixa ou compromisso inválido.

### CA-020 — Contraproposta depende de aceite (RF-015, RF-016)

- Dado uma solicitação de 500 mL
- Quando o fornecedor propõe 300 mL e o solicitante aceita enquanto há prazo e disponibilidade
- Então os 300 mL só ficam reservados no aceite, tornam-se a quantidade acordada e a transferência pode seguir; propor sem receber aceite não bloqueia o material.

### CA-021 — Contraproposta inviável ou não aceita (RF-015, RF-017)

- Dado uma contraproposta pendente
- Quando o solicitante tenta aceitar após perder disponibilidade ou após o prazo, ou decide não aceitar
- Então não surge uma reserva inválida; o motivo da impossibilidade é informado, e os envolvidos podem renegociar pelo fluxo permitido ou cancelar antes da saída, sem movimentação de estoque.

### CA-022 — Concorrência entre compromissos e retiradas (RF-011, RF-016, RNF-002)

- Dado 300 mL livres e ações concorrentes que, juntas, pretendem comprometer ou retirar mais que isso
- Quando aprovações, aceites e retiradas são confirmados
- Então somente operações compatíveis com o saldo livre têm sucesso, não há quantidade comprometida duas vezes e a parte reservada permanece indisponível para outros usos.

### CA-023 — Prazo obrigatório e visível (RF-017, RNF-006)

- Dado uma aprovação ou contraproposta em preparação
- Quando o fornecedor confirma a decisão
- Então deve existir data limite válida e visível aos dois laboratórios; ausência de prazo não produz compromisso aprovado sem vencimento.

### CA-024 — Expiração antes da saída (RF-017, RF-025)

- Dado uma transferência aprovada com reserva ou uma contraproposta sem aceite
- Quando o prazo vence antes da saída
- Então a transferência expira, eventual reserva é liberada, nenhum saldo físico é movimentado e os dois laboratórios recebem aviso.

### CA-025 — Cancelamento por qualquer lado e limite pós-saída (RF-018)

- Dado uma solicitação pendente, uma reserva confirmada ou uma saída já registrada
- Quando um operador de qualquer um dos lados tenta cancelar
- Então o cancelamento é permitido antes da saída, libera eventual reserva e avisa a outra parte; após a saída é impedido e não reverte os estoques como se nada tivesse ocorrido.

### CA-026 — Saída principal integral e autorizada (RF-019, RNF-002)

- Dado uma reserva válida de 500 mL, dentro do prazo e da validade
- Quando um operador da origem registra a saída principal
- Então são descontados 500 mL do estoque e da cota correspondente, a reserva é consumida e o destinatário é avisado; saída principal parcial ou confirmação pelo lado destinatário não é permitida.

### CA-027 — Sem baixa duplicada ou expiração retroativa (RF-017, RF-019, RNF-003)

- Dado uma saída principal registrada
- Quando sua confirmação é repetida ou a data limite posteriormente vence
- Então nenhuma segunda baixa ocorre e a saída não é revertida ou convertida em expiração, permanecendo aguardando recebimento ou resolução aplicável.

### CA-028 — Recebimento integral em registro compatível (RF-020, RNF-002, RNF-003)

- Dado material enviado e um registro compatível no destino
- Quando o destinatário confirma a quantidade integral aceita e escolhe esse registro
- Então a quantidade é adicionada uma única vez, sua procedência fica preservada e a origem recebe aviso; nova tentativa da mesma confirmação não duplica a entrada.

### CA-029 — Novo registro e incompatibilidade (RF-020)

- Dado material recebido sem registro compatível no destino
- Quando o operador cria um registro para recebê-lo ou tenta somá-lo a um registro de lote, validade, especificação ou unidade incompatível
- Então a criação preserva os dados e a procedência, enquanto a soma incompatível é impedida sem crédito indevido de estoque.

### CA-030 — Recebimento parcial com falta (RF-020, RF-021)

- Dado uma saída de 500 mL e recebimento aceito de 400 mL
- Quando o destinatário confirma o recebimento
- Então entram somente 400 mL no destino e os 100 mL restantes ficam como divergência pendente visível aos dois lados, sem encerramento automático.

### CA-031 — Avaria, especificação incorreta e recusa total (RF-020, RF-021)

- Dado material recebido parcialmente avariado ou diferente do acordado
- Quando o destinatário informa o problema e a quantidade que aceita, inclusive zero
- Então somente a quantidade aceita entra no estoque e o restante fica em divergência com justificativa, sem entrada de material não aceito.

### CA-032 — Complementação rastreada (RF-022, RNF-002, RNF-004)

- Dado uma divergência que as partes resolvem por complementação
- Quando são registrados o envio complementar e seu recebimento aceito
- Então esses movimentos ficam ligados à transferência, a nova saída desconta sua quantidade da origem e o aceite adiciona sua quantidade ao destino uma única vez, reduzindo a pendência correspondente sem reutilizar a baixa principal.

### CA-033 — Encerramento sem reposição exige os dois lados (RF-022)

- Dado uma divergência que uma parte propõe encerrar sem reposição
- Quando registra justificativa e aguarda ou recebe concordância do outro laboratório
- Então a divergência só é encerrada após a concordância do outro lado, preservando a diferença e os responsáveis no histórico, sem crédito fictício; duas ações do mesmo laboratório não substituem esse acordo.

### CA-034 — Correção acordada e preservação do original (RF-023, RNF-004)

- Dado uma quantidade de saída ou recebimento lançada por engano
- Quando um laboratório propõe ajuste justificado e o outro concorda, havendo disponibilidade para os efeitos necessários
- Então os estoques recebem somente o ajuste correspondente e o registro original permanece consultável com proposta, concordância e responsáveis.

### CA-035 — Correção não autorizada ou inviável (RF-023, RNF-001, RNF-002)

- Dado uma proposta de correção sem concordância do outro laboratório ou que exige retirar saldo indisponível ou reservado
- Quando se tenta aplicá-la
- Então o ajuste não é aplicado, o motivo é informado e os estoques e registros originais não são sobrescritos.

### CA-036 — Comentários restritos à solicitação (RF-024, RF-006)

- Dado uma solicitação entre A e B
- Quando um administrador ou mentor de A ou B comenta, ou alguém fora desse alcance tenta ler ou escrever
- Então o comentário permitido fica no histórico e pode ser consultado pelo outro lado; os demais acessos são recusados, e texto de comentário não equivale a aceite ou movimentação de estoque.

### CA-037 — Avisos institucionais somente no sistema (RF-025, RNF-001, RNF-003)

- Dado um evento que exige ação ou ciência do laboratório A
- Quando o evento é confirmado
- Então o aviso correspondente fica disponível dentro do LabOn para todos os administradores e mentores de A, sem e-mail, sem aviso de negociação a mentorados e sem duplicação causada por repetição da mesma confirmação.

### CA-038 — Suspensão antes da saída (RF-026, RF-025, RNF-005)

- Dado um laboratório com solicitações sem saída, inclusive reservas confirmadas
- Quando o administrador da rede o suspende com justificativa
- Então novas parcerias e pedidos são bloqueados, solicitações sem saída são canceladas e suas reservas liberadas, com aviso aos envolvidos, sem revelar o conteúdo das negociações ao administrador da rede.

### CA-039 — Suspensão com material já enviado (RF-026, RF-027)

- Dado uma transferência cuja saída ocorreu antes da suspensão de um dos laboratórios
- Quando os operadores consultam o registro, confirmam recebimento ou resolvem a divergência por encerramento acordado
- Então essas ações continuam disponíveis conforme suas permissões, e os movimentos já realizados não são revertidos pela suspensão.

### CA-040 — Acompanhamento, histórico e listas vazias (RF-027, RNF-006)

- Dado um administrador local ou mentor com ou sem transferências correspondentes à consulta
- Quando consulta o acompanhamento ou histórico
- Então distingue estado, quantidades, prazos e ações pendentes dos registros do próprio laboratório, ou recebe indicação clara de lista vazia, sem acesso a negociações de terceiros ou ações incompatíveis com o estado.

### CA-041 — Tentativa de ampliação de alcance (RF-001, RF-006, RNF-001, RNF-005)

- Dado um usuário sem alcance sobre determinado estoque ou negociação, inclusive um administrador da rede
- Quando tenta acessar seu identificador diretamente, alterar parâmetros ou executar uma ação fora das opções permitidas
- Então não obtém conteúdo protegido nem efeitos de estoque ou compromisso, e o acesso ao diretório ou a um aviso não contorna essa restrição.

### CA-042 — Falha ou repetição sem efeitos parciais (RNF-002, RNF-003, RNF-006)

- Dado uma reserva, saída, entrada ou correção em confirmação
- Quando há interrupção da comunicação ou repetição da ação
- Então o usuário consegue verificar o resultado efetivo, sem operação apresentada como concluída parcialmente, saldos negativos ou duplicação de efeitos.

### CA-043 — Evidência de autoria e valores (RNF-004)

- Dado uma decisão institucional ou evento de parceria, catálogo ou transferência
- Quando uma pessoa autorizada consulta o registro correspondente
- Então identifica autor, laboratório, momento, ação e justificativa exigida, além dos valores originais e ajustes quando houver, sem ganhar acesso a registros fora de seu papel.

### CA-044 — Jornada compreensível e acessível (RNF-006)

- Dado um participante autorizado que usa teclado e não depende de distinção por cor
- Quando percorre busca, solicitação, decisão, saída e recebimento
- Então consegue identificar controles e foco, compreender estado, quantidade, unidade, prazo e efeito da confirmação, e distinguir sucesso, erro e ausência de resultados.

### CA-045 — Homologação e piloto da primeira versão (RNF-007)

- Dado os cenários homologados, dois laboratórios parceiros e uma cessão real autorizada por eles
- Quando as equipes concluem a jornada no piloto e comparam histórico e estoques
- Então ficam registradas evidências do acordo, reserva, saída e entrada aceita, com saldos correspondentes e sem lançamentos manuais duplicados; aprovação do cliente e execução do piloto são registradas separadamente.

## Estratégia de validação

### Validação do produto com o cliente

O documento registra decisões confirmadas pelo usuário, mas ainda será submetido ao cliente. Essa revisão deve confirmar os papéis, as políticas institucionais, a adequação da cessão definitiva e os refinamentos pendentes. Não tratar a confirmação da descoberta como homologação, autorização de produção ou resultado de piloto.

### Comportamentos que exigem testes automatizados

- Isolamento por laboratório e matriz de perfis, inclusive acesso direto a dados e decisões que dependem do outro lado.
- Admissão, ingresso e efeitos de parceria aceita, encerrada e de suspensão.
- Elegibilidade por validade; cotas explícitas, saldo real e reservas; concorrência com outras transferências e retiradas internas.
- Solicitação, aprovação, recusa, contraproposta, aceite, cancelamento e expiração, incluindo ações incompatíveis com o estado.
- Baixa principal, entrada em registro compatível ou novo, divergências, complementações e correções, com conferência de saldos e procedência.
- Repetições e falhas que poderiam duplicar ou aplicar parcialmente um compromisso ou movimentação.
- Público e conteúdo dos avisos; limites dos comentários e do histórico; estados vazios e mensagens de erro.
- Preservação e delimitação dos dados atuais no laboratório inicial.

Os testes devem demonstrar os comportamentos de produto e seus limites. A especificação técnica definirá sua distribuição, preparação de dados e comandos, sem antecipação neste PRD.

### Homologação controlada

Exercitar a jornada com administradores locais, mentores, mentorados e administrador da rede. Conferir os critérios de aceitação com dados de teste, incluindo duas tentativas sobre o mesmo saldo, vencimento antes da saída, recebimento parcial ou recusado, ajuste sem saldo, encerramento de parceria e suspensão. Verificar uso por teclado e clareza das confirmações com as equipes.

### Piloto real

Após homologação, dois laboratórios parceiros devem concluir uma cessão real. Registrar material, quantidades, unidade, responsáveis, acordo, reserva, saída, quantidade aceita e saldos anteriores e posteriores. Confirmar que o registro da transferência bastou para atualizar ambos os estoques e que a equipe de origem soube do recebimento pelo LabOn. Exceções são simuladas na homologação, sem necessidade de provocar perdas ou problemas na operação real.

O piloto está planejado; não foi executado nesta etapa de documentação. O responsável e os laboratórios do piloto serão definidos na validação com o cliente.

## Dependências e riscos

| Item | Implicação e tratamento necessário |
| --- | --- |
| Ausência atual de organização por laboratório | É necessário delimitar as operações existentes, além de introduzir telas InterLab. O laboratório inicial deve preservar a continuidade de uso. |
| Alcance administrativo atualmente amplo | As autorizações de estoque, equipe, histórico e demais consultas existentes precisam respeitar o laboratório. Adicionar um diretório sem essa delimitação não atende ao PRD. |
| Permissões atuais de empréstimo distintas do novo fluxo | Não reutilizar regras de aprovação ou devolução como decisão implícita do InterLab. A cessão é definitiva, e mentores também aprovam e movimentam transferências. |
| Quantidades e características heterogêneas | A base atual permite diferentes unidades e saldos, enquanto contratos atuais de empréstimo usam quantidades inteiras. As regras técnicas futuras devem atender ao produto sem conversão ou mistura incompatível implícita. |
| Reserva coexistindo com retiradas internas | As operações que consomem o mesmo estoque precisam respeitar compromissos confirmados, inclusive fora das telas InterLab. |
| Responsáveis e equipes reais | A verificação institucional e o ingresso precisam de responsáveis disponíveis para decidir; não são verificações automáticas presumidas. |
| Avisos exclusivamente internos | A resposta depende de as equipes acessarem o LabOn. E-mail não será adicionado como compensação sem nova decisão de produto. |
| Divergências e correções | Encerrar sem reposição não equivale a receber material; corrigir exige acordo e saldo. Não criar ajustes silenciosos para forçar conclusão. |
| Validação com o cliente ainda pendente | O escopo pode ser revisado antes de especificação técnica e execução. Decisões novas devem ser registradas, preservando rastreabilidade. |
| Políticas institucionais de cessão | A adequação da operação e eventuais restrições específicas dos participantes precisam ser confirmadas com o cliente; este PRD não presume autorização institucional de toda cessão de químico ou outro material. |

## Suposições

- **Suposição S-001:** os laboratórios participantes possuem autorização institucional para realizar as cessões que aprovarem. Isso ainda deve ser validado com o cliente; a admissão na rede não substitui essa autorização.
- **Suposição S-002:** a base existente pode ser atribuída a um laboratório inicial sem redistribuição entre instituições. Essa direção foi confirmada pelo usuário; a conferência dos dados reais ainda deve anteceder a transição.
- **Suposição S-003:** as equipes terão acesso ao LabOn para acompanhar os avisos internos. Não há meta confirmada de tempo de resposta, disponibilidade contínua dos usuários ou latência dos avisos.

As suposições não concedem permissões adicionais, não indicam aprovação do cliente e não resolvem as perguntas abaixo por conveniência técnica.

## Perguntas abertas

O usuário autorizou a redação com o escopo confirmado e informou que ainda o validará com o cliente. As questões abaixo ficam explícitas para essa revisão; não foram respondidas no grilling e não devem ser convertidas em políticas presumidas.

| ID | Pergunta | Momento e impacto |
| --- | --- | --- |
| PA-001 | Uma suspensão permite uma nova saída de complementação para resolver transferência que já havia saído, ou permite apenas recebimento, ajustes autorizados e encerramento sem novo envio? | Resolver antes de especificar a combinação entre suspensão e complementação. Recebimento e preservação dos registros já estão confirmados. |
| PA-002 | Caso um material recusado seja fisicamente devolvido, o primeiro escopo precisa registrar uma movimentação de retorno à origem, ou esse acerto permanecerá fora do fluxo InterLab? | Resolver antes de especificar retorno de material recusado. A cessão não tem devolução obrigatória e o PRD não introduz automaticamente um fluxo de retorno. |
| PA-003 | Como a aprovação de ingresso no laboratório se articula com a aprovação atual de mentorados por mentores e seus vínculos de responsabilidade? | Resolver antes de especificar a jornada de cadastro e a transição dos vínculos existentes. O ingresso institucional depende de administrador local, conforme decisão confirmada. |
| PA-004 | Como será designado o administrador inicial da rede, e uma conta poderá acumular esse papel e um vínculo local? | Resolver antes de especificar provisionamento e combinação de papéis. O papel da rede isoladamente não autoriza acesso a estoques ou negociações. |
| PA-005 | Quem representará o cliente na aprovação e quais laboratórios e responsáveis participarão do piloto? Há restrições institucionais adicionais aos materiais cedidos? | Resolver na validação com o cliente e antes do piloto real. Não escolher participantes nem presumir autorizações nesta etapa. |
| PA-006 | Quais volumes esperados, metas de desempenho e políticas de retenção devem ser atendidos? | Refinamento com o cliente antes de fixar metas técnicas. Não há números confirmados; preservar histórico após encerramento de parceria e suspensão já é requisito. |

Não há pergunta bloqueando a entrega deste **rascunho de PRD**. As perguntas de alcance funcional devem ser resolvidas antes da especificação dos respectivos fluxos; o documento não é apresentado como pronto para implementação.

## Decisões da validação de descoberta

O usuário confirmou a consolidação na rodada 40 e, em seguida, autorizou criar o PRD, informando que ainda validará o conteúdo com o cliente. A tabela registra recomendações e respostas, inclusive as recomendações não adotadas.

| Decisão | Recomendação | Resposta confirmada | Impacto |
| --- | --- | --- | --- |
| Q1 — Problema e jornada | Começar pela descoberta e oferta de recursos. | A + B: encontrar, solicitar, aprovar, registrar saída e confirmar recebimento. | O escopo inclui transação e efeitos de estoque, sem transporte. |
| Q2 — Participantes | Instituições diferentes com parceria aceita. | Aceita. | Rede interinstitucional com acesso condicionado à parceria. |
| Q3 — Visibilidade dos materiais | Catálogo selecionado de materiais compartilháveis. | Aceita. | Estoque interno completo não é exposto. |
| Q4 — Quantidade visível | Somente a disponibilizada para compartilhar. | Aceita. | Reserva interna do laboratório não é revelada como oferta. |
| Q5 — Natureza da transferência | Cessão definitiva na primeira versão. | Aceita. | Sem obrigação de devolução ou reposição. |
| Q6 — Efeito nos estoques | Baixa na saída e entrada no recebimento. | Aceita. | Movimentações integradas ao fluxo. |
| Q7 — Momento da reserva | Na aprovação. | Aceita. | Pedido pendente não bloqueia; compromisso confirmado bloqueia outros usos. |
| Q8 — Quantidade menor | Contraproposta sujeita a aceite. | Aceita. | Não há aprovação parcial imposta ao solicitante. |
| Q9 — Reserva da contraproposta | Somente no aceite, com nova verificação. | Aceita. | Proposta sem resposta não reserva estoque. |
| Q10 — Cancelamento antes da saída | Qualquer um dos dois lados. | Aceita. | Libera reserva e comunica a outra parte. |
| Q11 — Recebimento com falta | Entrada da quantidade recebida e divergência pendente. | Aceita. | Diferença não desaparece no encerramento. |
| Q12 — Resolução de divergência | Complementação ou encerramento justificado com acordo. | Aceita. | Registros próprios para complementos e concordância bilateral. |
| Q13 — Itens por solicitação | Um material por solicitação. | Aceita. | Acompanhamento independente de cada material. |
| Q14 — Descoberta de parceiros | Diretório institucional dentro do LabOn. | Aceita. | Parceria pode ser solicitada a laboratório encontrado no sistema. |
| Q15 — Admissão de laboratório | Solicitação com aprovação da rede. | Aceita. | Participação não é liberada automaticamente pelo cadastro. |
| Q16 — Operadores de transferência | Administradores operam tudo; mentores apenas solicitam. | Rejeitada: administradores e mentores operam todas as ações de transferência. | Mentor também aprova, contrapropõe, registra saída e recebe. |
| Q17 — Vínculos da conta | Vários laboratórios com permissões por vínculo. | Rejeitada: um laboratório por conta. | Sem alternância entre múltiplos laboratórios na mesma conta de equipe. |
| Q18 — Gestão de parceria | Somente administradores locais. | Aceita. | Mentor não estabelece nem encerra parceria. |
| Q19 — Gestão do catálogo | Somente administradores locais. | Rejeitada: administradores e mentores. | Mentor pode publicar, retirar e definir cotas. |
| Q20 — Categorias | Todas as categorias atuais. | Aceita. | Químicos, vidrarias e outros materiais. |
| Q21 — Entrada no destino | Registro compatível existente ou novo. | Aceita. | Sem soma de lotes, validades, especificações ou unidades incompatíveis. |
| Q22 — Semântica da cota | Cota que se esgota e exige aumento explícito. | Aceita. | Reposição interna não renova automaticamente a oferta. |
| Q23 — Duração da reserva | Data limite definida pelo fornecedor. | Aceita. | Vencimento antes da saída expira e libera a reserva. |
| Q24 — Fim da parceria com pendências | Bloquear novas operações, preservar existentes. | Aceita. | Solicitações em andamento podem ser concluídas ou canceladas conforme estado. |
| Q25 — Ingresso na equipe | Pedido aprovado pelo administrador local com definição de perfil. | Aceita. | Escolha do laboratório não concede acesso automático. |
| Q26 — Acesso do mentorado | Diretório e catálogo, sem negociações. | Aceita. | Não solicita nem consulta comentários ou histórico de transferências. |
| Q27 — Alcance do administrador da rede | Gestão institucional, sem estoques ou negociações. | Aceita. | Papel central não equivale a administrador de todos os laboratórios. |
| Q28 — Canal dos avisos | Dentro do LabOn e por e-mail para eventos relevantes. | Rejeitada: somente dentro do LabOn. | Sem envio de e-mail pela funcionalidade. |
| Q29 — Destinatários dos avisos | Todos os administradores e mentores do laboratório envolvido. | Aceita. | Comunicação institucional, sem dependência do autor original. |
| Q30 — Materiais vencidos | Bloquear publicação, aprovação e saída. | Aceita. | Validade reavaliada na saída, sem autorização de exceção. |
| Q31 — Sistemas participantes | Laboratórios com estoque gerenciado no LabOn. | Aceita. | Sem integração inicial com outros softwares de estoque. |
| Q32 — Dados atuais | Vincular a um laboratório inicial. | Aceita. | Preservação de contas, perfis, estoque e histórico. |
| Q33 — Comprovação institucional | Validação manual de dados e vínculo por contato institucional verificável. | Aceita. | Decisão justificada de admissão pela rede. |
| Q34 — Comunicação contextual | Comentários dentro da solicitação. | Aceita. | Sem chat geral; comentários não substituem decisões. |
| Q35 — Suspensão | Bloquear novas operações, cancelar sem saída e preservar tratamento do enviado. | Aceita. | Liberação de reservas e preservação de recebimentos e divergências. |
| Q36 — Avaria ou material diferente | Quantidade aceita, inclusive zero, e divergência do restante. | Aceita. | Material não aceito não entra no estoque disponível. |
| Q37 — Correção de quantidade | Ajuste justificado, com concordância do outro laboratório e histórico preservado. | Aceita. | Sem sobrescrita ou movimentação silenciosa. |
| Q38 — Saídas parciais planejadas | Uma saída principal integral. | Aceita. | Complementações permanecem restritas a divergências. |
| Q39 — Evidência da entrega | Homologação controlada e piloto real com dois laboratórios. | Aceita. | Validar uso real e coerência dos estoques sem duplicar lançamentos. |
| Q40 — Entendimento compartilhado | Confirmar a consolidação antes da redação. | Confirmada; redação autorizada, com validação do cliente ainda pendente. | Descoberta confirmada pelo usuário; PRD permanece rascunho para revisão do cliente. |
