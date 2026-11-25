# Especificação técnica de notificações e auditoria

- **Status** — Rascunho, validação de design pendente
- **PRD** — [Notificações e auditoria](prd.md)
- **Atualizado em** — 2026-11-15
- **Validação de design** — pendente. A validação de descoberta foi dispensada pelo usuário no PRD.

## Resumo técnico

Aplicar a mesma relação de destinatários nas consultas e mutações e manter a leitura por destinatário. Exigir origem confiável para eventos de auditoria, preservar a classificação original e permitir a revisão das mudanças e dos resultados da detecção. As políticas de grupos, histórico, cotas e classificação condicionam as decisões de armazenamento e de contrato.

## Estado atual

- `NotificacoesController` expõe leitura, contagem, atualização individual e em lote, emissão manual e ações de geração. `NotificacaoService` combina escopo individual com notificações globais e executa verificações próprias. `Notificacao` guarda `Lida` e `DataLeitura` na própria linha, inclusive quando `UsuarioId` está ausente para uma notificação global. O controlador ainda carece do contrato de exclusão previsto no PRD.
- `AuditoriaMiddleware` e serviços emitem registros. A ação de registro do `AuditoriaController` recebe um DTO de evento. `AuditoriaService` usa campos desse DTO e registra falhas esperadas de persistência. `LogAuditoriaRepository` atualiza a classificação na linha do evento. O modelo contém campos de contexto de requisição e resposta que precisam de revisão de finalidade e projeção.
- A busca de logs usa páginas numéricas. Relatório e detecção também usam consultas próprias. A tela `frontend/src/pages/admin/Auditoria.tsx` e a integração `frontend/src/integration/Auditoria.ts` usam a API atual. `frontend/src/integration/Notifications.ts` consome lista, contagem e operações de leitura.

## Arquitetura proposta

### Fluxos e componentes

1. **Destinatários e leitura.** `NotificacaoService` e o repositório compartilham a política de elegibilidade baseada na identidade autenticada e no tipo, vínculo ou grupo aprovado. A relação elegível delimita detalhes, página, contador e mutações. A leitura de um destinatário é idempotente e reflete no filtro e no contador desse destinatário. Repetições e chamadas concorrentes convergem ao mesmo estado.
2. **Emissão e exclusão.** Operações de administrador e de processo verificam identidade, permissões, destinatários e cotas antes da gravação. O processo automático usa identidade de serviço autorizada e referência de origem aprovadas. O efeito da operação e a evidência obrigatória, ou o registro durável de sua emissão, precisam ser gravados na mesma transação. A política de exclusão define os efeitos permitidos e preserva a trilha.
3. **Registro e proveniência.** O contexto autenticado e a operação do servidor determinam ator, recurso e ação. Usar catálogo que delimite produtores, campos, origem, finalidade e exigência de durabilidade. O registro de processos e a ausência de ator válido têm representações distintas. Revisar o consumidor do registro explícito atual e encaminhar o evento por produtor autorizado ou adaptar o consumidor ao contrato aprovado.
4. **Reclassificação.** Preservar o evento original e acrescentar uma revisão vinculada com autoria, momento, estado anterior, estado resultante e motivação exigida. Consultas podem usar projeção do estado efetivo. Revisões concorrentes devem produzir cadeia consistente, com conflito reconhecido ou reavaliação explícita. A classificação automática segue as condições de convivência com revisão humana aprovadas no catálogo.
5. **Consulta, relatório e exportação.** Centralizar filtros e escopo autorizado antes de projetar linhas e agregações. Revalidar escopo nas continuações e exportações. Usar a autoridade definida em [segurança de contas e sessões](../seguranca-de-contas-e-sessoes/techspec.md) e o teto e as regras de paginação da [especificação de proteção da API e do proxy](../protecao-de-api-e-proxy/techspec.md). A projeção de relatório e exportação aplica a mesma finalidade e as regras específicas por operação.
6. **Detecção.** Tratar regras como configuração ou catálogo versionado, com tipo de evento, janela, fronteira, limiar, precedência e versão. Avaliar por um relógio controlável. Persistir ou projetar a referência à regra aplicada para revisão autorizada. Diferenciar atividade normal, suspeita e ausência de ator válido. Os testes usam conjuntos sintéticos e parâmetros de ensaio aprovados.

## Contratos e APIs

| Operação | Contrato proposto |
| --- | --- |
| Lista, filtro e contagem de notificações | Escopo derivado da identidade autenticada. Lista vazia e contador zero são resultados válidos. A resposta representa a própria leitura e omite informações de outros destinatários. |
| Leitura individual e em lote | Leitura persistida por notificação e destinatário. A recusa individual usa categoria pública que protege o escopo. Para lote misto, o contrato revisado define atomicidade ou processamento do subconjunto autorizado, preservando todos os itens inelegíveis. As respostas e a interface não identificam destinatários de terceiros. |
| Emissão e exclusão | Perfil autorizado ou processo com identidade verificável. Validar grupo, tipo e cota. Recusas não persistem efeito fora da regra. Contrato de cota temporal deve alinhar código e orientação de limitação ao catálogo de API e proxy. O histórico registra emissões e exclusões efetivadas conforme regra. |
| Registro e revisão de auditoria | O contexto do servidor valida autoria, ação e recurso. A revisão permitida identifica evento, ator, instante, classificação anterior e resultante e justificativa aplicável. A falta de ator válido é representada de forma explícita. |
| Consulta, relatório e exportação | Exigir autorização específica por operação. Ordenar e aplicar filtros antes dos tetos. Uma exportação parte do escopo autorizado e mantém a consistência de filtros, incluindo na continuação, quando prevista. Os campos e limites por tipo de efeito serão aprovados em conjunto com API e proxy. |
| Resultado de detecção | Categoria e referência à regra em projeção autorizada, com detalhes mínimos para revisão. A execução repetida sobre as mesmas entradas e versão deve produzir resultado coerente. |

## Dados e migrações

- No desenho recomendado, manter conteúdo de `Notificacao` e armazenar separadamente destinatários e leitura, com unicidade por par e horário de leitura. Confirmar se a elegibilidade de grupo é congelada na emissão ou recalculada. A escolha orienta índices, cardinalidade e tratamento de mudança de vínculo. Definir comportamento de notificações antigas segundo a evidência disponível. Estado coletivo sem autoria individual requer regra explícita de compatibilidade.
- Manter o evento original e acrescentar histórico de revisões com referência ao original, horário e ator. Pode-se manter classificação efetiva em projeção atualizada atomicamente. Definir como apresentar eventos legados e referências a atores removidos, com preservação de proveniência e finalidade aprovadas.
- Se cotas exigirem persistência compartilhada, coordenar seu modelo e retenção com API e proxy. Cotas e limitação do transporte podem ter unidades distintas. O catálogo deve explicitar qual regra limita emissão, consulta, relatório ou exportação.
- Planejar migração aditiva, testes de leitura do legado e controle de compatibilidade durante a troca. Guardar dados necessários para reconstruir a projeção e verificar a recontagem por destinatário.

## Segurança, privacidade e permissões

A matriz de autorização considera destinatário, papel, vínculo, grupo e origem do evento. Servidor aplica escopo antes de contar, paginar, projetar ou atualizar, inclusive para relatórios. O catálogo de eventos restringe campos e acesso. Evidências usam dados sintéticos e omitem material de autenticação e informações pessoais sem finalidade. Projeções administrativas e exportações devem ter teste específico dos campos admitidos, inclusive agregações.

## Falhas, observabilidade e operação

- Observar recusas por cota, lacunas em eventos obrigatórios, atrasos de envio interno, revisões em conflito e falhas de exportação por classe de operação. Guardar correlação, autoria ou categoria de origem e versão da regra sem material de autenticação.
- Distinguir a gravação da operação e a entrega da evidência. Para eventos exigidos pelo domínio, assegurar registro durável da trilha antes de confirmar a operação. Para registros operacionais secundários, o catálogo deve definir tratamento de indisponibilidade, alerta e repetição. Processos que repetem emissão usam uma identidade de operação para evitar efeitos duplicados.
- Segregar o acesso aos artefatos de falha, às projeções de auditoria e aos diagnósticos dos trabalhos automáticos. A [conciliação operacional](../conciliacao-operacional/techspec.md) usa sinais de autoria pertinentes à revisão.

## Compatibilidade, disponibilização e reversão

Ensaiar a migração e a reconstrução com dados sintéticos individuais e coletivos. Disponibilizar a leitura por destinatário junto do contador e das mutações. Coordenar com os consumidores de auditoria as mudanças de filtros, expurgo de campos e formato da exportação. Se houver reversão, voltar para uma versão compatível que preserve o isolamento entre destinatários e mantenha eventos e revisões gravados. Validar o retorno em ambiente controlado e conservar dados aditivos necessários à retomada.

## Estratégia TDD e pirâmide de testes

### RED

Adicionar casos parametrizados com dois destinatários de uma notificação, usuário sem itens e lote misto. Exigir coerência entre lista e contador e imutabilidade dos estados fora do escopo. Cobrir emissões manuais e automáticas, limite, exclusão, falha de persistência de trilha e reenvio. Registrar contratos para autoria presente e ausente, classificação e revisão autorizada e concorrente, filtros, teto e projeção de exportação e fronteiras das regras de detecção.

### GREEN

Criar a relação de destinatário e leitura conforme o desenho aprovado e atualizar as operações sob um mesmo filtro. Implementar produtor auditável, revisão vinculada e projeções limitadas. Aplicar os parâmetros de emissão, consulta, exportação e detecção confirmados e validar o comportamento nas integrações existentes.

### REFACTOR

Consolidar escopo, tipagem de eventos, regras de classificação e projeção na camada de domínio e de consulta pertinente. Conservar testes unitários das regras, integração relacional para persistência e concorrência, testes de contrato para DTOs e UI para estados vazios e mensagens de erro.

## Esteira de qualidade

| Área | Comando local | Verificação de CI | Lacuna ou ação |
| --- | --- | --- | --- |
| Backend .NET 8 e xUnit | Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`, com Docker para Testcontainers | `Container CI`, `Backend quality`, executa a solução com `Tests` | Estender `NotificacoesControllerTests`, `NotificacaoServiceTests`, `AuditoriaMiddlewareTests`, `AuditoriaServiceTests` e `LogAuditoriaRepositoryTests`. Acrescentar integração PostgreSQL para migração e concorrência. |
| Frontend React/Vite | Em `frontend`, `npm ci`, `npm run test -- --run`, `npm run lint` e `npm run build` | `Frontend quality` | Estender `Notifications.errors.test.ts` e `Auditoria.errors.test.ts`, adicionar cenários de UI de vazio, mudança de leitura, seleção de filtro e exportação. |
| Navegador | Em `frontend`, `npx --no-install playwright install chromium` e `npm run test:e2e -- --project=real --project=ui`, com a composição `docker-compose-e2e.yml` descartável configurada | `Authentication E2E` executa os projetos `real` e `ui` | Cobrir as jornadas revisadas com usuários e eventos sintéticos, conforme o contrato aprovado. |

`container-ci.yml` usa PR para `develop` aberto, sincronizado, reaberto, editado ou pronto para revisão, `merge_group` e execução manual. A exigência desses jobs nas regras de proteção da branch requer verificação específica. `container-release.yml` pertence à esteira de entrega, com PR fechado para `main` ou execução manual. Os comandos foram conferidos no checkout.

## Matriz de rastreabilidade

| Requisito | Componentes | Testes | Evidência esperada |
| --- | --- | --- | --- |
| RF-001 | Política de destinatários, repositório | Unitário, contrato, integração | Mesmo escopo em consulta, contagem e atualização |
| RF-002 | Estado de leitura do destinatário | Integração relacional | Leitura e contador isolados e repetição idempotente |
| RF-003 | Emissão, exclusão, cotas e trilha | Unitário, integração | Permissão, elegibilidade, cota e registro obrigatório |
| RF-004 | Produtores, middleware, serviço de eventos | Contrato, integração | Ator, ação e recurso de contexto confiável |
| RF-005 | Evento original, revisão e projeção | Integração concorrente | Histórico preservado e cadeia com autoria |
| RF-006 | Consultas, relatórios, exportação | Contrato, integração | Perfis, filtros e tetos coerentes |
| RF-007 | Catálogo, relógio, detector | Unitário, integração | Categoria e regra responsável |
| RNF-001 | DTOs, relatórios, exportação e interface | Contrato, UI, inspeção sanitizada | Campos minimizados e estados públicos previstos |
| RNF-002 | Eventos e revisões | Integração, inspeção sanitizada | Relações verificáveis e decisão revisável |
| CA-001 | Listagem, contador e leitura | Integração, UI | Resultados dos destinatários e estado vazio |
| CA-002 | Limites do escopo | Contrato, integração | Fora do escopo ausente e preservado |
| CA-003 | Leitura coletiva | Integração relacional | Leitura do primeiro preserva a do segundo |
| CA-004 | Emissão manual e automática | Unitário, integração | Limite e elegibilidade avaliados por origem |
| CA-005 | Exclusão e trilha | Integração | Exclusão autorizada e eventos da operação |
| CA-006 | Proveniência | Integração, inspeção | Ator presente ou ausente, sem material de autenticação |
| CA-007 | Reclassificação | Integração concorrente | Decisões autorizadas e originais preservados |
| CA-008 | Relatório, consulta e exportação | Contrato, integração | Recorte e teto em cada forma de consulta |
| CA-009 | Detector versionado | Unitário, integração | Cenários sintéticos e fronteiras classificadas |
| CA-010 | Projeção e evidências | Contrato, inspeção sanitizada | Finalidade por campo e vínculo da revisão |

## Alternativas e decisões

| Decisão | Alternativas | Recomendação | Escolha confirmada | Consequências |
| --- | --- | --- | --- | --- |
| Destinatários coletivos | Registrar audiência na emissão ou avaliar grupo na consulta e persistir só a leitura | Registrar audiência quando o histórico precisa refletir o momento de emissão, condicionado ao volume e à política de vínculo | Definida na [decisão local](../decisoes-de-planejamento.md#api-limites-e-auditoria) | Define migração e tratamento de históricos coletivos |
| Lote, exclusão e emissão | Lote atômico ou subconjunto autorizado. Exclusão lógica ou exclusão com trilha independente. | Usar efeito explícito, previsível e testável para cada operação, com preservação de trilha | Definida na [decisão local](../decisoes-de-planejamento.md#api-limites-e-auditoria) | Condiciona contrato de API, UI, cotas e retenção |
| Registro e retenção da auditoria | Trilha transacional obrigatória e diagnóstico operacional | Persistir evento obrigatório ou registro durável na transação e aplicar retenção por finalidade | Aprovada pelo usuário conforme a política abaixo | Define origem, campos, retenção e falhas. Libera T002. |
| Reclassificação | Classificação por histórico consultado ou projeção atualizada | Preservar o evento original e manter revisões vinculadas | Definida na [decisão local](../decisoes-de-planejamento.md#api-limites-e-auditoria) | Define transições, atores, justificativas, concorrência e tratamento legado. |
| Detecção e exportações | Catálogo no código ou política versionada em configuração. Exportação limitada em chamada ou geração por trabalho autorizado. | Parametrizar e versionar regras. Escolher a exportação com API e proxy após confirmar teto, volume e consumidores. | Definida na [decisão local](../decisoes-de-planejamento.md#api-limites-e-auditoria) | Define governança de regras, armazenamento e tratamento de continuação |

## Riscos e mitigação

O legado coletivo pode ter leitura sem autoria recuperável. Adotar tratamento explícito por classe e provar a transição onde existirem evidências suficientes. Revisões simultâneas podem romper a cadeia de classificação se a consistência ficar só na tela. Verificar a concorrência com PostgreSQL. Cotas e relatórios podem ficar inconsistentes entre a aplicação e o proxy. Manter um catálogo de operações, campos, tetos e regras de excesso compartilhado com a especificação de API e proxy.

### Política aprovada de registro e retenção

| Finalidade | Eventos e retenção | Tratamento de falhas |
| --- | --- | --- |
| Trilha obrigatória | Decisões e concessões de conta, trocas de e-mail, baixas e devoluções de empréstimos, e emissão e exclusão de notificações. Reter por 365 dias. | Gravar o evento ou seu registro durável na mesma transação do efeito. Reverter a operação se essa gravação falhar. |
| Diagnóstico operacional | Falhas de operação e tentativas sem identidade válida. Reter por 30 dias. | Sinalizar falha de gravação secundária com um identificador de correlação e manter o resultado da operação principal. |

O servidor determina ação, recurso, momento, resultado e origem. Distinguir usuário autenticado, processo autorizado e ausência de identidade válida. Gravar a referência do ator ou processo quando aplicável. Excluir senhas, tokens e corpos completos de requisições. A projeção de relatórios e exportações segue as decisões próprias de escopo e minimização.

## Perguntas abertas

- Consultar as [decisões de planejamento](../decisoes-de-planejamento.md#api-limites-e-auditoria).
