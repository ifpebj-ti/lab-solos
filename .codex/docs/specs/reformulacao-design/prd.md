# PRD: Reformulação integral do design do LabOn

- Status: pronto para iniciar o plano de descoberta e design; implementação condicionada às aprovações abaixo
- Responsável pelas escolhas e validação do produto: Nathan
- Atualizado em: 2026-09-22
- Validação de descoberta: confirmada pelo usuário
- Slug: `reformulacao-design`
- Fluxos: `create-prd`, descoberta `grilling` e Impeccable

## Contexto e problema

Nathan solicitou reformular o design inteiro do LabOn, com uma identidade moderna e própria, evitando aparência genérica de interfaces produzidas por IA. Confirmou a possibilidade de mudar navegação, organização da informação e passos das tarefas, preservando funcionalidades, dados, permissões e regras de negócio. As escolhas de design devem ocorrer com sua participação, por meio do fluxo do Impeccable e de imagens de alta fidelidade aprovadas antes do código.

O produto existente é um aplicativo operacional de gestão de materiais de laboratório, com perfis Administrador, Mentor e Mentorado. A rota `/` é o login; não há uma página comercial pública a redesenhar. O código usa React, TypeScript, Vite e Tailwind, e já contém testes de autenticação, autorização, navegação, contratos de dados, erros e responsividade.

A identidade atual observável no código e nas capturas do manual combina verde, fundos claros, fontes Inter/Rajdhani, navegação lateral, tabelas e formulários. As capturas consultadas mostram, por exemplo, uma abertura administrativa dominada pela mensagem de boas-vindas e uma criação de empréstimo organizada em grandes blocos. São evidências do estado documentado, não uma auditoria atual da aplicação executada. A etapa inicial deverá conferir sua correspondência com a versão corrente.

O pedido exige uma substituição coerente da linguagem visual em todas as superfícies, com revisão de experiência. Trocar cores e arredondamentos isoladamente não satisfaz o objetivo. O diagnóstico também não deve classificar uma solução como genérica apenas por usar uma fonte, cor ou biblioteca popular: a avaliação deve considerar composição, clareza da tarefa, conteúdo real e especificidade para o laboratório.

### Evidências de contexto

| Evidência | Uso neste plano |
|---|---|
| `frontend/src/routes.tsx` e `frontend/src/navigation/profileNavigation.ts` | Rotas, perfis, destinos e alcance da navegação |
| `frontend/src/pages/` e `frontend/src/components/` | Superfícies, estados, componentes compartilhados e documentos gerados |
| `frontend/src/index.css`, `frontend/tailwind.config.js` e `frontend/public/` | Identidade existente, fontes e ativos |
| `frontend/e2e/` e testes próximos dos módulos | Comportamentos protegidos contra regressão |
| `docs/manual/README.md`, demais capítulos e `docs/manual/imagens/` | Jornadas, permissões e capturas da versão documentada |
| PRDs de `frontend-responsivo`, `experiencia-erros-frontend`, `navegacao-pos-autenticacao`, `ciclo-vida-autenticacao-credenciais`, `contratos-dados-usuario` e `visibilidade-posicionamento-funcionalidades` | Compromissos anteriores a preservar ou revisar explicitamente |

## Objetivo e métricas de sucesso

Entregar uma experiência consistente e reconhecível como LabOn, aprovada por Nathan, que permita concluir as tarefas de todos os perfis em computador e celular, sem regressões funcionais.

| Indicador de aceitação | Medida e evidência |
|---|---|
| Cobertura integral | 100% das superfícies aplicáveis do inventário com resultado registrado: redesenhada e validada, compartilhada e validada, ou exclusão explicitamente aprovada |
| Participação nas decisões | Nenhuma etapa condicionada à aprovação avança sem registro da escolha, artefato e abrangência aprovados |
| Coerência e originalidade | Pilotos e ondas confrontados com a direção aprovada; divergências materiais resolvidas ou devolvidas ao usuário como decisão explícita |
| Preservação funcional | Jornadas críticas e controles de autorização aprovados na validação, sem regressões introduzidas pela reformulação |
| Uso em telas pequenas | Jornadas alcançáveis e utilizáveis na matriz de tamanhos, sem transbordamento horizontal da página em 320 px |
| Prontidão | Nenhum defeito bloqueante ou de impacto alto em aberto; limitações menores registradas com decisão de aceite ou correção |
| Documentação | PDFs e instruções/capturas afetados coerentes com a versão final validada |

Não há medida atual de tempo de tarefa, satisfação ou desempenho percebido que permita prometer um ganho percentual. A linha de base será coletada no diagnóstico. A comparação de usabilidade registrará conclusão, erros, necessidade de ajuda e passos das mesmas tarefas; eventuais metas quantitativas adicionais deverão ser acordadas antes da expansão. As evidências desta elaboração não equivalem à execução desses testes.

## Usuários e jornadas

| Público | Jornadas a preservar e melhorar |
|---|---|
| Visitante ou usuário sem sessão | Entrar, solicitar cadastro, recuperar acesso, redefinir senha e compreender impedimentos |
| Usuário no primeiro acesso | Concluir troca obrigatória de senha antes de operar e chegar ao destino autorizado |
| Administrador | Consultar/cadastrar/editar materiais, acompanhar alertas, gerir usuários e aprovações, analisar empréstimos, registrar devoluções, consultar auditoria e configurações |
| Mentor | Consultar materiais, gerir sua turma e solicitações permitidas, criar empréstimos, consultar históricos e perfil |
| Mentorado | Consultar materiais, vínculos e históricos permitidos, acessar e atualizar seu perfil conforme as regras existentes |
| Todos os perfis | Entender localização e próximos passos, pesquisar, filtrar, voltar, interpretar feedback e sair com segurança |

O modo predominante do Impeccable será `Operate`: concluir tarefas com clareza e densidade apropriada. O manual tem finalidade `Read`. Expressão visual não deve disputar atenção com quantidades, unidades, status, permissões ou confirmações de operações.

## Escopo

### Incluído

- Todas as rotas ativas dos três perfis e as telas públicas de acesso, cadastro, recuperação, troca de senha e página não encontrada.
- Navegação principal e móvel, cabeçalhos, início por perfil, atalhos, busca, conta e notificações.
- Catálogo, filtros, listagens, paginação, cadastro/edição de materiais, detalhes, históricos e alertas.
- Usuários, solicitações, turmas, vínculos, empréstimos, aprovações, recusas, devoluções, auditoria e configurações existentes.
- Formulários, tabelas, diálogos, mensagens e estados de carregamento, vazio, sucesso, erro, sessão expirada, acesso negado e indisponibilidade.
- Hierarquia de informação, textos de interface, foco, navegação por teclado, adaptação a telas e movimento funcional.
- Nome LabOn e símbolos institucionais preservados; logotipo próprio, cores, tipografia, composição e demais elementos abertos à exploração e aprovação. Alterações no logotipo exigem proposta visual explícita.
- Adequação visual dos PDFs gerados, preservando conteúdo obrigatório, dados e assinaturas; preservação do conteúdo das demais exportações existentes.
- Atualização dos capítulos e capturas do manual afetados pelas mudanças.
- Contexto de produto, direção aprovada, sistema visual documentado, evidências e histórico das decisões.

### Fora de escopo

- Mudança de regras de negócio, permissões, contratos funcionais, dados persistidos ou políticas de aprovação.
- Funcionalidades novas, métricas fictícias, gráficos sem dados existentes ou integrações criadas para preencher um layout.
- Reintroduzir recursos removidos ou não operacionais, como Labon Pro, InterLab, importação de planilhas ou chamadas de funcionalidades “em breve”.
- Criar uma página comercial, aplicativo nativo ou reformular os sites externos de apresentação do projeto.
- Migração de tecnologia, arquitetura, banco ou backend como objetivo desta iniciativa; eventuais necessidades técnicas serão avaliadas na especificação técnica sem ampliar o produto silenciosamente.
- Publicação, deploy, push ou alterações em serviços externos por este PRD.

## Requisitos funcionais

### RF-001 — Cobertura rastreável

Manter inventário de rota/superfície × perfil × estado × tamanho de tela. Incluir componentes compartilhados, diálogos, documentos gerados e caminhos secundários. Toda superfície aplicável deve estar associada a uma onda e a evidências de aceite.

### RF-002 — Decisões humanas e fidelidade visual

Apresentar alternativas de identidade e composição pelo fluxo do Impeccable. Nathan poderá escolher, rejeitar, solicitar nova rodada ou corrigir uma proposta. Registrar as aprovações sem interpretar silêncio ou preferência do agente como aceite. Imagens de alta fidelidade precedem a implementação e tornam-se referência de comparação; diferenças materiais precisam de correção ou nova escolha explícita.

### RF-003 — Contexto e identidade próprios

Preservar o nome LabOn e os símbolos institucionais, construir a identidade a partir das tarefas e do contexto do laboratório e manter consistência entre superfícies. Distinguir fatos do produto, estratégia de cada superfície e sistema visual. Não inventar capacidades, indicadores, depoimentos ou promessas. Dados usados para demonstração devem ser sintéticos e identificados.

### RF-004 — Navegação e informação por perfil

Permitir reorganizar menus, agrupamentos, nomes e passos, com aprovação do mapa de navegação e dos pilotos. Cada perfil deve localizar e executar suas ações autorizadas. Preservar destinos após login, parâmetros que identificam registros, atualização da página, retorno e compatibilidade dos acessos existentes; eventual mudança de endereço deve ter continuidade verificável.

### RF-005 — Acesso e ciclo da conta

Redesenhar login, cadastro, recuperação, redefinição, troca obrigatória, perfil e saída, mantendo validações e políticas atuais. Distinguir conta pendente, falha de credencial, expiração e ausência de permissão, sem revelar informações sensíveis nem permitir contornar etapas obrigatórias.

### RF-006 — Materiais e consulta de dados

Redesenhar busca, filtros, cadastro, edição, detalhes, acompanhamento e históricos de materiais. Preservar campos, unidades, valores, status, ações e regras de consulta existentes. Suportar nomes longos, ausência de resultados, paginação e diferentes quantidades de registros sem esconder informação necessária à decisão.

### RF-007 — Empréstimos, pessoas e gestão

Redesenhar as jornadas de criação, análise, aprovação/recusa e devolução de empréstimos; usuários, turmas, vínculos, solicitações, auditoria e configurações. Preservar escopo por perfil, validações, efeitos das ações e informações de confirmação. A nova organização não deve sugerir que uma ação foi concluída quando a operação falhou.

### RF-008 — Estados e linguagem transversal

Cada família de superfície deve prever conteúdo, carregamento, vazio, sucesso, erro e indisponibilidade, além de acesso negado e sessão expirada quando aplicáveis. Explicar o estado e a próxima ação em português consistente. Associar erros de preenchimento aos campos e manter entrada recuperável quando as regras de segurança permitirem.

### RF-009 — Sistema visual e temas

Aplicar uma linguagem consistente de tipografia, cor, espaçamento, navegação, formulários, tabelas, ícones e movimento. Nathan decidirá tema único ou claro/escuro durante a exploração, antes de aprovar a base visual. Todos os temas aprovados deverão cobrir todas as superfícies e estados; a existência de regras `.dark` no código atual não conta como uma experiência de tema entregue.

### RF-010 — Documentos e manual

Alinhar visualmente PDFs gerados à identidade aprovada, conservando informação, legibilidade de impressão, assinaturas e dados. Manter exportações existentes equivalentes em conteúdo. Atualizar instruções e imagens do manual que deixarem de corresponder à experiência final, usando dados sintéticos e identificando a versão validada.

### RF-011 — Revisão e entrega por ondas

Validar pilotos antes da expansão, e cada onda antes de aceitá-la. As revisões deverão comparar interface executada, proposta aprovada, comportamentos e resultados dos testes. Manter um registro de achados, severidade, resolução e divergências autorizadas. Documentar o sistema visual efetivamente implementado ao final.

## Requisitos não funcionais

### RNF-001 — Acessibilidade operacional

Todas as ações devem ser alcançáveis por teclado, com foco visível e ordem compreensível. Controles devem possuir nomes acessíveis, campos devem ter rótulos e erros associados, e mensagens relevantes devem ser percebidas por tecnologia assistiva. Usar contraste mínimo de 4,5:1 para texto normal e 3:1 para texto grande; informações essenciais não dependerão apenas de cor. Validar ampliação de texto a 200% e redução de movimento sem perda de tarefa ou feedback.

### RNF-002 — Responsividade e densidade

Validar ao menos 320, 375, 767, 768 e 1440 px, preservando a cobertura existente. Acrescentar o tamanho usado por Nathan nas revisões quando diferente. Não permitir transbordamento horizontal da página em 320 px; eventual região tabular com rolagem própria deve ser justificada e aprovada, com informação e ações acessíveis. Manter densidade útil no computador e leitura/acionamento adequado por toque no celular.

### RNF-003 — Integridade, privacidade e segurança

Não ampliar autorização, alterar dados de domínio nem expor segredos, tokens, senhas ou detalhes técnicos em mensagens, capturas e registros de design. Evidências devem usar dados sintéticos. Testes devem continuar distinguindo sessão expirada e acesso proibido, preservando o comportamento de cada caso.

### RNF-004 — Desempenho e confiabilidade

Medir carregamento e resposta das jornadas piloto em condições reproduzíveis antes e depois da mudança. Fixar, no diagnóstico e antes de implementar, cenários, ambiente e tolerâncias de comparação para aceite. Nenhuma regressão material observada poderá ser aceita apenas por benefício estético. Movimento e ativos não devem bloquear leitura, entrada, foco ou confirmação de ações. Este PRD não atribui medições inexistentes nem promete ganhos percentuais.

### RNF-005 — Consistência e rastreabilidade de qualidade

Revisões devem combinar inspeção visual, comportamento executado e achados do detector; ausência de alertas automáticos não prova originalidade ou usabilidade. Registrar versão, superfície, perfil, estado, tamanho de tela, referência aprovada e resultado. Classificar defeitos como bloqueante, alto, menor ou acabamento, com justificativa de impacto.

## Critérios de aceitação

### CA-001 — Inventário completo (RF-001, RF-011)

- Dado o conjunto de rotas ativas, componentes transversais e documentos gerados,
- Quando a cobertura da reformulação for revisada,
- Então cada superfície terá perfis, estados, tamanhos, onda e resultado identificados, sem omissões silenciosas; exclusões terão aprovação explícita.

### CA-002 — Escolha visual antes do código (RF-002, RF-003)

- Dado um conjunto de propostas do Impeccable com conteúdo representativo do LabOn,
- Quando Nathan escolher uma direção e uma composição de alta fidelidade,
- Então a referência, versão, alcance e decisão serão registradas antes da implementação correspondente; rejeição ou falta de resposta manterá essa etapa pendente.

### CA-003 — Fidelidade e identidade (RF-002, RF-003, RF-009, RNF-005)

- Dada uma tela implementada e sua referência aprovada,
- Quando ambas forem comparadas em dimensões equivalentes e com conteúdo comparável,
- Então composição, hierarquia, tipografia, cores, componentes e comportamento expressarão a direção escolhida, com nome e símbolos preservados e diferenças materiais corrigidas ou explicitamente aprovadas.

### CA-004 — Navegação por perfil (RF-004, RNF-003)

- Dado cada perfil autorizado e uma tentativa de acesso fora de seu escopo,
- Quando menus, busca, links diretos, retorno e atualização da página forem exercitados,
- Então as jornadas permitidas permanecerão alcançáveis, o registro e contexto corretos serão mantidos e os acessos proibidos continuarão bloqueados.

### CA-005 — Autenticação e primeiro acesso (RF-005, RF-008, RNF-003)

- Dadas situações de acesso válido, cadastro pendente, recuperação, credencial inválida, sessão expirada e troca obrigatória,
- Quando cada jornada for executada,
- Então validações e destinos respeitarão as políticas existentes, sem contornar troca de senha e sem expor dados sensíveis; acesso proibido não será tratado como expiração de sessão.

### CA-006 — Materiais e limites de conteúdo (RF-006, RNF-002)

- Dados materiais de categorias distintas, nomes longos, diferentes unidades, listas paginadas e busca sem resultado,
- Quando um perfil consultar ou modificar dados dentro de suas permissões,
- Então campos, valores, unidades, filtros, ações e históricos serão preservados e permanecerão utilizáveis nos tamanhos previstos.

### CA-007 — Empréstimo completo (RF-007, RF-008, RNF-003)

- Dados os perfis envolvidos e cenários de quantidade inválida, conflito e falha de requisição,
- Quando criar, aprovar, recusar ou devolver um empréstimo,
- Então os efeitos e as restrições serão os existentes, informações necessárias estarão disponíveis antes da confirmação e falhas não produzirão feedback falso de sucesso.

### CA-008 — Gestão e turmas (RF-007, RF-004)

- Dados usuários, solicitações, vínculos, turmas e registros de auditoria no escopo de cada perfil,
- Quando suas jornadas de gestão e consulta forem executadas,
- Então ações e dados autorizados permanecerão acessíveis, sem ampliar permissões, ressuscitar funcionalidades removidas ou perder referências de registros.

### CA-009 — Estados compreensíveis (RF-008, RNF-001)

- Dada cada família de superfície com estados aplicáveis de carregamento, vazio, sucesso, erro e indisponibilidade,
- Quando o estado for apresentado ou alterado,
- Então haverá mensagem contextual e próximo passo coerente, feedback acessível e preservação segura dos dados preenchidos quando cabível.

### CA-010 — Sistema e temas (RF-009, RF-002)

- Dada a escolha registrada de tema único ou claro/escuro e a base visual aprovada,
- Quando as superfícies e estados forem percorridos,
- Então todos obedecerão ao mesmo sistema; cada tema escolhido estará completo e legível, sem depender de estilos legados incompatíveis.

### CA-011 — Teclado, leitura e movimento (RNF-001, RF-008)

- Dadas as jornadas piloto e componentes reutilizados,
- Quando forem operados por teclado, com tecnologia assistiva, texto ampliado a 200% e redução de movimento,
- Então não haverá armadilhas de foco, ações inacessíveis, campos sem identificação ou perda de informação; os contrastes definidos serão verificados em todos os temas aprovados.

### CA-012 — Computador e celular (RNF-002, RF-006, RF-007)

- Dadas as larguras previstas e conteúdos vazios, típicos e extensos,
- Quando navegação, tabelas, formulários e diálogos forem usados,
- Então não haverá transbordamento horizontal da página em 320 px nem controles encobertos; a mudança de composição preservará informações e ações da tarefa.

### CA-013 — Documentos e exportações (RF-010, RNF-003)

- Dados os mesmos registros antes e depois da reformulação,
- Quando PDFs e exportações forem gerados,
- Então conteúdos e valores serão equivalentes; PDFs apresentarão a identidade aprovada e manterão legibilidade, paginação, campos e assinaturas, inclusive com conteúdo longo.

### CA-014 — Manual coerente (RF-010)

- Dadas jornadas com nomes, passos ou telas alterados,
- Quando o manual for revisado contra a versão final,
- Então instruções, links e capturas corresponderão à experiência validada, com dados sintéticos e versão identificada.

### CA-015 — Desempenho comparável (RNF-004)

- Dadas a linha de base e as tolerâncias acordadas no diagnóstico,
- Quando os mesmos cenários forem medidos sob condições equivalentes,
- Então os resultados ficarão dentro das tolerâncias e não haverá efeito visual bloqueando tarefas; divergências materiais impedirão aceite até resolução ou revisão explícita da meta.

### CA-016 — Aceite de onda e final (RF-011, RNF-005)

- Dados resultados de testes, capturas válidas, comparação visual e revisão independente,
- Quando uma onda ou a entrega completa for submetida a Nathan,
- Então será possível identificar exatamente o que foi verificado e o que falta; não haverá achado bloqueante ou alto em aberto, e limitações menores terão decisão registrada.

## Plano de execução e escolhas com Impeccable

As fases abaixo descrevem entregáveis e condições de passagem. Não constituem tarefas técnicas nem autorização para implementar propostas ainda não escolhidas. Nenhuma fase está marcada como executada pela existência deste documento.

| Fase | Trabalho e fluxo | Entregáveis verificáveis | Decisão ou condição para avançar |
|---|---|---|---|
| 0 — Contexto confirmado | Concluir `init` a partir da descoberta e evidências do repositório; registrar preferência por imagens antes do código | `PRODUCT.md`, preferência `buildPath: comp` e decisões deste PRD | Escopo confirmado nesta conversa; decisões visuais permanecem abertas |
| 1 — Linha de base | Inventariar versão atual e executar `critique` e `audit` sobre superfícies representativas; conferir capturas antigas contra aplicação atual | Matriz de cobertura, capturas atuais, problemas priorizados, jornadas e medições de referência | Nathan valida prioridades, cenários e metas/tolerâncias de desempenho antes da implementação |
| 2 — Organização da experiência | Usar `shape` para tarefas, informação, navegação e estados; comparar alternativas quando houver diferença material | Mapa de navegação por perfil, fluxos e composição funcional dos pilotos | Nathan aprova agrupamentos, passos e densidade pretendida; decidir tema único ou claro/escuro |
| 3 — Nova identidade | Seguir `new-work`: investigar referências do contexto do laboratório, antirreferências e compromissos; executar `concept-seed` e apresentar a rodada de direções | Página de decisão com direção proposta, alternativas previstas pelo fluxo, riscos e alcance entre telas | Nathan escolhe, rejeita ou pede nova rodada; cor, tipografia e eventual novo logotipo não são decididos pelo agente unilateralmente |
| 4 — Propostas de alta fidelidade | Seguir o caminho `comp` e a referência `visualize`: apresentar composições do piloto; a imagem escolhida da direção pode ser reaproveitada conforme a skill | Imagens com conteúdo realista, versões para computador/celular e estados representativos; referências identificadas | Nathan aprova composição e comportamento esperado; imagens não comprovam interação, desempenho ou acessibilidade |
| 5 — Preparação técnica | Criar `techspec.md` e depois `tasks.md` pelas skills correspondentes, com decisões aprovadas e preservação dos contratos existentes | Especificação técnica, dependências, ondas, responsabilidade por arquivos e validações por tarefa | Nenhuma decisão visual material escondida na implementação; requisitos deste PRD rastreados |
| 6 — Pilotos funcionais | Implementar login, início/navegação por perfil, catálogo e fluxo de empréstimo; seguir o contrato visual e as etapas do Impeccable | Pilotos navegáveis, comportamento real, comparações com imagens e evidências de testes | Nathan aprova usabilidade e fidelidade antes de expandir |
| 7 — Expansão integral | Aplicar o sistema aprovado às demais superfícies, por ondas abaixo; usar refinamentos conforme os achados | Cobertura progressiva da matriz, demonstração e relatório de cada onda | Aceite por onda; alterações no sistema aprovado voltam como decisão explícita |
| 8 — Validação final | Revisão funcional, `audit`, detector, comparação das imagens e revisão independente do Impeccable; corrigir achados materiais | Evidências de todos os critérios, achados e resoluções, revisão final e limitações | Nathan valida a entrega completa; cumprir CA-016 |
| 9 — Documentação e encerramento | Documentar o sistema construído e atualizar manual/PDFs afetados | `DESIGN.md`, `.impeccable/design.json`, instruções/capturas atualizadas e rastreabilidade final | Cobertura integral comprovada e documentação coerente; publicação é uma ação separada |

### Pilotos e ondas de expansão

1. **Pilotos:** login; início e navegação dos três perfis; catálogo com filtro, conteúdo longo e vazio; criação de empréstimo pelo Mentor, análise pelo Administrador e consulta pelo Mentorado. Validar a identidade em informação densa e em formulário, não apenas na abertura.
2. **Acesso e estrutura comum:** cadastro, recuperação, redefinição, troca obrigatória, perfil, busca, notificações, acesso negado e 404. Consolidar os elementos compartilhados aprovados nos pilotos.
3. **Materiais:** cadastro/edição por categoria, detalhes, acompanhamento, alertas e históricos, aproveitando o catálogo piloto.
4. **Pessoas e gestão:** usuários, solicitações, turmas, vínculos, desativados, configurações e auditoria.
5. **Empréstimos e documentos:** demais históricos, detalhes, turmas vinculadas, devoluções, PDFs e verificação das exportações. A jornada piloto deve permanecer protegida durante a expansão.
6. **Integração:** percorrer todas as jornadas entre módulos, finalizar documentação afetada e revisar a cobertura restante.

A ordem poderá ser ajustada por dependências descobertas e prioridade confirmada, mantendo todas as superfícies no escopo. A especificação técnica definirá a decomposição executável; este PRD não impõe organização de arquivos, bibliotecas ou arquitetura.

### Como as escolhas serão registradas

Cada decisão terá identificador, pergunta, alternativas apresentadas, recomendação, resposta literal ou síntese confirmada, artefatos/versões aprovados, abrangência e efeito sobre as fases seguintes. Rejeições e substituições também serão preservadas. Uma aprovação de identidade não aprova automaticamente navegação, todos os estados ou todas as telas.

Nathan poderá pedir ajustes direcionados por `live`/`generate` quando houver protótipo navegável. `clarify`, `distill`, `adapt`, `harden`, `typeset`, `layout`, `animate` e `polish` serão usados conforme problemas identificados, não como uma lista obrigatória de comandos sem finalidade. `bolder` e `quieter` só entram quando coerentes com a direção escolhida.

### Critério contra aparência genérica

- Julgar se composição, hierarquia e interação derivam de tarefas e conteúdo reais do LabOn, em vez de apenas copiar um painel genérico.
- Apresentar propostas materialmente distintas; variações apenas de cor não contam como alternativas de direção.
- Não adicionar cartões, números, gráficos, ilustrações ou efeitos para preencher espaço sem papel na tarefa.
- Tornar estados, unidades, quantidades e ações inequívocos, inclusive nos extremos de conteúdo.
- Usar referências visuais como calibração de qualidade, sem transformar preferência do agente em decisão do usuário.
- Confrontar o resultado com a proposta aprovada e com revisão humana. Detector sem achados, isoladamente, não satisfaz o aceite.

## Estratégia de validação

### Evidências de produto

Manter os artefatos SDD e evidências rastreáveis sob `.codex/docs/specs/reformulacao-design/`. Artefatos nativos do Impeccable permanecerão nos locais consumidos pela skill, referenciados pelos documentos SDD: `PRODUCT.md`, arquivos sob `.impeccable/` e, após implementação e revisão, `DESIGN.md`.

Na primeira fase, registrar a versão executada, ambiente e dados de demonstração. A matriz será preenchida a partir das rotas correntes; o inventário preliminar deste PRD não substitui essa conferência. Estados compartilhados podem reutilizar evidências do componente, mas cada consumidor deverá comprovar sua integração e permissões.

### Validações automatizadas e manuais

| Área | Validação necessária |
|---|---|
| Acesso e autorização | Testes de credenciais, primeiro acesso, sessão, destino pós-login e bloqueio por perfil |
| Dados e ações | Testes de contratos existentes, validações, submissão, conflitos, aprovações, devoluções e ausência de regressão nas exportações |
| Interface e estados | Testes de comportamento dos componentes e páginas, incluindo falhas de rede/API, carregamento e vazio |
| Jornadas integradas | Testes de ponta a ponta dos pilotos e caminhos críticos de cada perfil, incluindo retorno e atualização da página |
| Adaptação | Matriz de tamanhos, conteúdo longo, zoom, toque e diálogos; distinguir viewport emulado de teste em dispositivo físico |
| Acessibilidade | Verificações automatizadas complementadas por teclado e tecnologia assistiva; resultado automático não substitui operação manual |
| Fidelidade | Capturas válidas de computador e celular confrontadas com imagens aprovadas; comparação por regiões quando o fluxo `comp` exigir |
| Originalidade e acabamento | Revisão visual independente, detector com achados contextualizados e validação de Nathan |
| Desempenho | Comparação reproduzível com linha de base e tolerâncias acordadas |
| Documentos | Conferência visual de PDFs, inclusive conteúdo extenso, e consistência de manual/capturas com a versão validada |

A especificação técnica definirá os comandos e casos exatos da esteira, aproveitando Vitest, Playwright, lint e compilação existentes. Não substituir testes de regras e permissões por capturas. Atualizar seletores e expectativas de composição quando necessário, preservando as garantias funcionais; mudanças de organização aprovadas não autorizam enfraquecer testes de domínio.

### Revisão Impeccable e limites das evidências

Aplicar os procedimentos vigentes da skill ao executar cada comando. A inspeção de implementação deve agrupar computador e celular numa rodada, corrigir em lote e confirmar em até mais uma rodada no contexto de construção. A revisão final independente recebe pedido, respostas confirmadas, referências, capturas, achados e evidências; seu resultado define correção, reconstrução, nova captura ou aceite no alcance efetivamente revisado. Não declarar aprovação integral a partir da revisão de apenas uma lista de correções.

Executar o detector sobre os alvos apropriados quando o fluxo exigir; a instalação atual não forneceu um hook ativo nesta sessão. Nas fases de construção, seguir a execução manual prevista pelo Impeccable e evitar varreduras repetidas sem mudança ou falha que as justifique. Rodadas adicionais de decisão solicitadas por Nathan são distintas de um ciclo automático ilimitado de polimento.

O sistema visual definitivo será documentado a partir do resultado construído e revisado. Não criar antecipadamente um `DESIGN.md` com escolhas não aprovadas. A conclusão exige documentação e revisão; uma imagem bonita ou uma compilação bem-sucedida não encerram a reformulação.

## Dependências e riscos

| Dependência ou risco | Tratamento |
|---|---|
| Disponibilidade de Nathan para escolhas | Apresentar decisões concretas por etapa; manter trabalho dependente pendente até resposta |
| Capturas e manual de versão anterior | Conferir aplicação corrente antes de usar como linha de base |
| Proposta visual não transferível a dados densos | Validar catálogo, formulários e empréstimos antes da expansão |
| Conceito que prejudica operação ou acessibilidade | Revisar a proposta antes de implementá-la; preservar clareza da tarefa e acessibilidade |
| Diferença entre imagem e comportamento real | Aprovar também pilotos navegáveis e estados; manter a comparação visual |
| Mudanças compartilhadas causarem regressão em outro perfil | Cobertura por perfil, teste de consumidores e validação integrada entre ondas |
| Conflito com composição prescrita em PRD anterior | Preservar garantias de dados/acesso; registrar explicitamente a substituição de composição aprovada, como cards versus tabela em telas pequenas |
| Tema adicional aumentar cobertura | Decidir antes da base visual; incluir todos os estados e documentos aplicáveis na matriz |
| Falta de medição de desempenho | Coletar linha de base e fixar tolerâncias antes do código; não substituir por números inventados |
| Ativos sem procedência ou símbolo institucional alterado indevidamente | Conferir arquivos de origem, preservar símbolos obrigatórios e registrar procedência dos ativos finais |
| Redesign tornar manual e PDFs inconsistentes | Atualizar junto das ondas e validar no encerramento |
| Falhas pré-existentes | Registrar separadamente; não apresentar defeito antigo como regressão nova, nem ocultar bloqueio que impeça validar a jornada |

## Suposições

- O aplicativo existente e suas regras correntes são a referência funcional. Isso não presume que esteja livre de defeitos; a linha de base identificará limitações.
- O contexto laboratorial observado no repositório é suficiente para iniciar a descoberta visual. Frequência real das tarefas, dispositivos predominantes e preferências de densidade ainda serão confirmados na fase 2.
- Não há decisão por mudança de tecnologia nem criação de funcionalidades. Necessidades encontradas fora desses limites deverão ser trazidas como alteração explícita de escopo.
- O nome e símbolos institucionais devem ser preservados, mas a lista exata de ativos obrigatórios será conferida com Nathan antes das propostas de identidade.

## Perguntas abertas

Não há pergunta bloqueante para escrever este PRD ou iniciar o diagnóstico. As seguintes decisões são intencionalmente futuras e bloqueiam as fases indicadas, sem serem tratadas como suposições aprovadas:

| Decisão | Momento limite | Responsável e evidência esperada |
|---|---|---|
| Prioridade das tarefas, frequência de uso e contexto de computador/celular | Antes de fechar organização e pilotos | Nathan, após apresentação do inventário |
| Linha de base e tolerâncias de desempenho/usabilidade | Antes da implementação | Medições do diagnóstico e aceite de Nathan |
| Densidade, mapa de navegação e mudanças de passos | Antes dos pilotos de alta fidelidade | Nathan sobre fluxos e alternativas concretos |
| Referências e antirreferências; símbolos obrigatórios e eventual novo logotipo | Antes de escolher a identidade | Nathan sobre ativos e propostas |
| Tema único ou claro/escuro | Antes de aprovar a base visual | Nathan, com impacto de cobertura apresentado |
| Direção, tipografia, paleta, composição e movimento | Antes do código correspondente | Rodadas visuais do Impeccable e aprovação explícita |
| Sequência final das ondas | Antes de decompor tarefas de execução | Dependências técnicas e prioridades confirmadas |

## Decisões da validação de descoberta

| Decisão | Recomendação | Resposta confirmada | Impacto |
|---|---|---|---|
| Profundidade | Reformular visual e experiência, preservando regras | “Visual e experiência completos, preservando regras de negócio (recomendado)” | Navegação e organização abertas à revisão; domínio protegido |
| Marca | Manter nome e símbolos; explorar o restante | “Manter nome e símbolos institucionais; explorar todo o restante (recomendado)” | Não fixar verde, fontes ou logotipo próprio sem proposta |
| Caminho de construção | Aprovar imagens de alta fidelidade antes do código | “Imagens de alta fidelidade antes do código (recomendado)” | Preferência Impeccable `buildPath: comp`; comparação com imagem aprovada |
| Escopo consolidado | Todas as telas, estados, três perfis, PDFs e manual afetado; pilotos antes da expansão | “confirmo”, após a pergunta consolidada | Descoberta de escopo concluída; redigir PRD e plano |
| Escolhas futuras | Decidir referências, densidade, cores, fontes e temas com propostas | Incluído na confirmação consolidada | Nenhuma direção visual está aprovada nesta etapa |
| Natureza desta entrega | PRD com fases, entregáveis, critérios e decisões | Incluído na confirmação consolidada | Não implementar a reformulação nem antecipar arquitetura nesta entrega |

Não houve rejeição de recomendação registrada nesta descoberta. A confirmação do escopo não substitui as aprovações futuras de identidade, composição, pilotos e ondas.

### Decisões posteriores — 2026-09-22

- Nathan confirmou: uso principalmente em computador no laboratório, com celular como apoio.
- Nathan escolheu claro e escuro, com ambos validados. Essa resposta resolve a pergunta de tema antes aberta neste PRD; onde o plano condiciona a escolha futura do número de temas, considerar agora ambos obrigatórios.
- Diagnóstico inicial e limitações em `diagnostico/avaliacao-a.md`, `diagnostico/auditoria-tecnica.md`, `diagnostico/inventario.md` e `diagnostico/detector.json`.
- Organização proposta em `organizacao-experiencia.md`, ainda aguardando aprovação. Direção visual e imagens permanecem pendentes dessa decisão.
- Atualização posterior: Nathan aprovou a organização, o foco em solicitações pendentes e o fluxo contexto/composição/revisão. Escolheu Índice de amostras na página de decisão e mudou o caminho desta rodada para código. A imagem escolhida continua referência; o padrão permanente permanece `comp`. Detalhes em `direcao-visual.md` e aplicação proposta em `brief-pilotos.md`. As aprovações de identidade e organização não equivalem ao aceite de runtime ou de pilotos ainda não implementados.
