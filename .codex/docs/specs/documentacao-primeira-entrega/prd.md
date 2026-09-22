# PRD: Documentação da primeira entrega

- Status: proposto para implementação
- Responsável: Nathan Maciel
- Atualizado em: 2026-09-21
- Validação de descoberta: confirmada pelo usuário em 2026-09-21
- Prazo de referência: 30/09/2026, conforme as issues da entrega

## Contexto e problema

Quatro issues abertas concentram lacunas documentais da primeira entrega: [#352 — arquitetura e dados](https://github.com/ifpebj-ti/lab-solos/issues/352), [#353 — execução e operação](https://github.com/ifpebj-ti/lab-solos/issues/353), [#355 — revisão da Wiki](https://github.com/ifpebj-ti/lab-solos/issues/355) e [#356 — gestão de credenciais](https://github.com/ifpebj-ti/lab-solos/issues/356).

Os relatos apontam ausência de uma visão consolidada de arquitetura e dados, instruções Docker desatualizadas, documentos de visão e segurança sem distinção suficiente entre histórico, estado atual e propostas, e necessidade de revisão reservada das credenciais. O resultado deve ser uma entrega integrada, com aceite e evidências separados por issue.

A Wiki será a fonte principal dos documentos. Os procedimentos operacionais existentes no repositório permanecerão nele, referenciados pela Wiki. Não será criada uma segunda coleção canônica em `docs/`.

### Evidências de contexto

- Consulta das quatro issues abertas realizada em 21/09/2026.
- Repositório local inspecionado no commit `790ee6b`; a execução deverá registrar o commit efetivamente usado na revisão final.
- `docker-compose-dev.yml` e `docker-compose-prod.yml` definem ambientes distintos; produção utiliza proxy Caddy e imagens versionadas.
- `infra/oci/README.md` já descreve atualização por release, diagnóstico e limites do rollback.
- `backend/LabSolos-Server-DotNet8/Data/Migrations/README.md` já contém procedimentos para bancos novos, bancos legados e reversão.
- O índice local da Wiki contém documentos reutilizáveis e identifica Nathan Maciel na equipe colaboradora de 2026.2, preservando equipes anteriores. A publicação remota e a atualidade desse conteúdo deverão ser conferidas na execução.
- As especificações existentes em `.codex/docs/specs/` são material de referência, sem substituir a verificação do comportamento implementado.

## Objetivo e métricas de sucesso

Permitir que avaliadores, desenvolvedores e operadores encontrem e confiram a documentação atual do LabOn e reproduzam sua execução em ambiente de teste.

O sucesso será medido por: quatro issues com todos os seus critérios atendidos e evidenciados; todos os entregáveis acessíveis pelo índice da Wiki; exemplos dos dois ambientes validados; roteiro de instalação de teste concluído; e confirmações reservadas necessárias registradas sem conteúdo sensível. Esses indicadores derivam dos critérios das issues, não de metas de desempenho novas.

## Usuários e jornadas

- Avaliador: parte do índice da Wiki, encontra cada entregável e identifica versão, data e evidências da revisão.
- Desenvolvedor: consulta componentes, entidades e relacionamentos e consegue localizar as respectivas fontes no código.
- Operador: escolhe desenvolvimento ou produção, configura acesso com seus próprios segredos e segue execução, diagnóstico, atualização e recuperação.
- Responsável pela validação: Nathan verifica credenciais e Dependabot, mantendo os detalhes sensíveis em canal restrito.

## Escopo

### Incluído

- Arquitetura atual, DER e dicionário dos dados principais.
- Revisão do guia Docker e alinhamento com operação OCI e migrações.
- Revisão de visão, concorrência, ameaças, guia seguro e índice da Wiki.
- Exemplos sintéticos, procedimento de provisionamento e validação reservada de credenciais.
- Consolidação dos itens sobrepostos citados no Project 41, preservando referências e reaproveitando artefatos anteriores.
- Validação em instalação de teste e evidências individuais por issue.

### Fora de escopo

- Novas funcionalidades, alterações de arquitetura, esquema de dados ou comportamento da aplicação.
- Reabertura de remediações de dependências já concluídas.
- Reformulação geral da Wiki ou migração de todo o acervo para o repositório.
- Divulgação de credenciais, identidades associadas a achados ou detalhes exploráveis.
- Execução automática de operações em produção, reescrita do histórico Git ou rotação de segredos como efeito da redação documental. Eventuais medidas operacionais cabem ao responsável e continuam sendo dependências do aceite da #356.

## Requisitos funcionais

### RF-001 — Arquitetura atual (#352)

A Wiki deve apresentar componentes, responsabilidades, integrações e comunicação entre cliente web, API, PostgreSQL, proxy e e-mail, com diagrama e principais decisões existentes. Deve identificar a versão ou commit analisado e distinguir propostas do que está implementado.

### RF-002 — Modelo de dados rastreável (#352)

A documentação deve apresentar entidades, chaves, relacionamentos, cardinalidades e dicionário dos dados principais, coerentes com o `AppDbContext`, as configurações EF e o snapshot das migrações, com links para suas fontes. Artefatos anteriores devem ser procurados e reaproveitados quando válidos.

### RF-003 — Execução e configuração reproduzíveis (#353)

O guia deve separar desenvolvimento e produção, selecionar explicitamente o Compose correspondente e explicar pré-requisitos, variáveis obrigatórias, URLs, portas, proxy, persistência, verificações de saúde e obtenção das imagens. Deve incluir `APP_DOMAIN`, `LABON_IMAGE_VERSION`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` e requisitos de JWT e SMTP, usando exemplos fictícios.

### RF-004 — Operação e recuperação (#353)

O operador deve encontrar procedimentos coerentes de atualização por release, diagnóstico, backup, restauração e encerramento, alinhados à documentação OCI e às migrações. O guia deve explicitar que rollback de imagens não reverte o banco e restringir comandos de limpeza ao projeto, informando antes da execução quando removem dados.

### RF-005 — Visão e concorrência atualizadas (#355)

O documento de visão deve identificar equipe atual e data da revisão, preservando o histórico relevante. A análise de concorrência deve registrar fontes verificáveis e datas de consulta, diferenciar funcionalidades atuais de propostas e corrigir ou retirar afirmações sem sustentação.

### RF-006 — Segurança coerente com o estado atual (#355)

A modelagem de ameaças deve refletir ativos, atores, fluxos e fronteiras de confiança atuais. O guia seguro deve refletir o processo vigente. Controles devem ser classificados como implementados, planejados ou não aplicáveis, com justificativa, responsáveis e evidências pertinentes. A conclusão sobre Dependabot depende da verificação de Nathan; não deve ser presumida a partir de relatos anteriores.

### RF-007 — Credenciais e provisionamento seguros (#356)

Os materiais atuais de documentação e operação devem conter somente exemplos sintéticos de credenciais e instruções que permitam provisionar acesso sem compartilhar segredos. Nathan deve confirmar reservadamente a revisão e, quando necessária, a invalidação ou substituição de credenciais e sessões associadas. A evidência pública deve registrar somente a conclusão.

### RF-008 — Navegação e fechamento integrado (todas)

O índice da Wiki deve disponibilizar todos os entregáveis, incluindo referências aos procedimentos mantidos no repositório. Cada issue deve ter correspondência entre critérios e evidências. Os rascunhos de arquitetura, classes, modelagem de dados e infraestrutura citados nas issues devem ser reconciliados com a entrega, preservando referências e evitando trabalho duplicado. Uma confirmação pendente não pode ser apresentada como aceite concluído.

## Requisitos não funcionais

### RNF-001 — Confidencialidade

Documentos, exemplos e evidências públicas não devem expor segredos reais, dados pessoais oriundos de testes ou detalhes sensíveis dos achados. A validação deve usar dados sintéticos e resultados sanitizados.

### RNF-002 — Consistência e rastreabilidade

Documentos revisados devem informar a data de revisão e a referência de versão quando descrevem implementação. Divergências entre código, Wiki e operação devem ser resolvidas ou explicitamente registradas como pendência, sem afirmar capacidades não verificadas.

### RNF-003 — Clareza e acessibilidade documental

A documentação deve ser escrita em português do Brasil, com títulos e links descritivos. Diagramas devem ter explicação textual suficiente para compreender componentes ou relacionamentos sem depender exclusivamente da imagem ou de cores.

## Critérios de aceitação

### CA-001 — Arquitetura verificável (RF-001, RNF-002, RNF-003)

- Dado o commit de referência e a implantação documentada,
- Quando o revisor consultar a arquitetura,
- Então encontrará os componentes, integrações, responsabilidades, decisões e fluxos atuais representados e explicados em texto, com referência de versão e propostas identificadas separadamente.

### CA-002 — Dados coerentes com as fontes (RF-002, RNF-002, RNF-003)

- Dado o modelo EF e o snapshot do commit de referência,
- Quando o revisor conferir o DER e o dicionário,
- Então entidades, chaves, cardinalidades e relacionamentos corresponderão às fontes, com links rastreáveis e explicações textuais dos dados principais.

### CA-003 — Configuração dos dois ambientes (RF-003, RNF-001)

- Dados os exemplos sintéticos completos de desenvolvimento e produção,
- Quando forem validados com `docker compose -f <arquivo> config`,
- Então ambos serão aceitos sem variáveis obrigatórias ausentes, selecionando `docker-compose-dev.yml` ou `docker-compose-prod.yml`, e o guia explicará todas as configurações exigidas, inclusive domínio, versão das imagens, administrador inicial, JWT e SMTP.

### CA-004 — Instalação de teste e diagnóstico (RF-003, RF-004)

- Dado um ambiente de teste com os pré-requisitos informados e dados sintéticos,
- Quando uma pessoa seguir o roteiro do guia,
- Então conseguirá iniciar os serviços, acessar a aplicação, executar as verificações de diagnóstico e encerrar o ambiente, com evidências sanitizadas do percurso.

### CA-005 — Pré-requisitos ausentes e primeiro acesso (RF-003, RF-007)

- Dada uma instalação nova sem usuários ou uma configuração com variável obrigatória ausente,
- Quando o operador consultar o guia antes de prosseguir,
- Então encontrará como provisionar o administrador inicial, configurar os valores faltantes e diagnosticar a falha, sem receber uma credencial compartilhada nem instruções para contornar autenticação; para bancos com usuários, encontrará o limite do provisionamento inicial.

### CA-006 — Recuperação e limites destrutivos (RF-004)

- Dado um cenário de atualização, recuperação ou limpeza do ambiente de teste,
- Quando o operador seguir a documentação,
- Então encontrará procedimentos de backup e restauração, suas verificações, limites de reversão das migrações e imagens e comandos restritos ao projeto com aviso prévio de perda de dados, coerentes com OCI e migrações.

### CA-007 — Visão e comparação sustentadas (RF-005, RNF-002)

- Dados os documentos de visão e concorrência revisados,
- Quando o avaliador conferir equipe, escopo e afirmações comparativas,
- Então encontrará equipe atual, histórico relevante, data de revisão, fontes e datas de consulta, sem funcionalidades futuras apresentadas como atuais nem afirmações sem sustentação.

### CA-008 — Ameaças e controles classificados (RF-006, RNF-002)

- Dados os fluxos atuais e os documentos de segurança,
- Quando o revisor analisar ameaças e práticas seguras,
- Então encontrará ativos, atores, fronteiras de confiança e controles classificados com justificativas, responsáveis e evidências apropriadas, distinguindo implementação de planejamento.

### CA-009 — Confirmação do Dependabot (RF-006, RF-008)

- Dada a revisão do Dependabot por Nathan,
- Quando sua conclusão for incorporada à entrega,
- Então a documentação registrará data e conclusão confirmada de ausência de vulnerabilidades; se houver divergência ou falta de confirmação, o aceite correspondente permanecerá pendente, sem reabrir automaticamente remediações já concluídas.

### CA-010 — Revisão reservada das credenciais (RF-007, RNF-001)

- Dados os materiais atuais e a revisão reservada pelo responsável,
- Quando forem concluídas a substituição de exemplos reais e as medidas de invalidação consideradas necessárias,
- Então os materiais conterão apenas exemplos fictícios e instruções de provisionamento seguro, e a evidência pública registrará somente a conclusão, sem valores, identidades ou detalhes exploráveis.

### CA-011 — Ausência de confirmação não equivale a conclusão (RF-007, RF-008)

- Dada a ausência de confirmação reservada ou de evidência da instalação de teste,
- Quando o progresso da entrega for registrado,
- Então os critérios afetados permanecerão pendentes e nenhuma issue será declarada concluída apenas pela atualização dos textos.

### CA-012 — Entrega navegável e sem duplicação (RF-008, RNF-002, RNF-003)

- Dados os entregáveis revisados e os itens anteriores citados nas issues,
- Quando o avaliador percorrer o índice da Wiki e as evidências da entrega,
- Então todos os documentos serão alcançáveis por links funcionais e descritivos, os procedimentos do repositório estarão referenciados e cada critério das quatro issues terá evidência identificável, com registro do reaproveitamento ou da reconciliação dos itens sobrepostos.

## Plano integrado de entrega

| Etapa | Resultado esperado | Dependências e condição de conclusão |
|---|---|---|
| 1. Inventário e revisão de credenciais | Identificar fontes, versões, artefatos reaproveitáveis e materiais que precisam de exemplos fictícios; iniciar revisão reservada com Nathan. | Registrar itens anteriores, inclusive referências à #30 e rascunhos do Project 41. Não transportar segredos para evidências. |
| 2. Arquitetura e dados | Consolidar documentação do estado atual e sua rastreabilidade. | Inventário; conferência de componentes e modelo implementado. |
| 3. Execução e operação | Atualizar guia e alinhar referências OCI e migrações; validar exemplos e roteiro de teste. | Inventário e configuração atual; ambiente de teste disponível. |
| 4. Visão, concorrência e segurança | Revisar documentos existentes, fontes e classificação dos controles. | Arquitetura e fluxos conferidos; verificação do Dependabot por Nathan. |
| 5. Integração e aceite | Atualizar índice, conferir links e consistência, reunir evidências por issue. | Etapas anteriores e confirmações reservadas concluídas; pendências impedem o aceite dos critérios afetados. |

As etapas compõem uma entrega única, sem eliminar a rastreabilidade das quatro issues. A revisão reservada pode prosseguir enquanto os documentos são preparados. Este plano não fixa estimativas individuais nem distribui tarefas técnicas antes da especificação.

## Estratégia de validação

- Automatizar, quando viável, a conferência de links e referências, a validação dos exemplos Compose e a procura de padrões de credenciais nos materiais alterados. A procura automática é complementar e não substitui a revisão reservada.
- Conferir arquitetura e DER contra o código e a configuração do commit documentado, sem tomar funcionalidades descritas em PRDs anteriores como prova de implementação.
- Executar o roteiro em instalação isolada de teste, registrando versão, data, ambiente, inicialização, acesso, diagnóstico e encerramento. Exercitar backup e restauração com dados sintéticos para verificar o procedimento de recuperação.
- Revisar manualmente fontes da concorrência, equipe, classificação de controles e explicações textuais dos diagramas.
- Manter matriz de evidências por issue e critério, com resultados sanitizados. Nunca anexar a saída completa de configurações que possam conter segredos reais.
- Não exigir testes unitários novos para alterações apenas documentais; a validação se concentra na exatidão dos documentos e na reprodução dos procedimentos descritos.
- Não declarar estas validações executadas durante a elaboração deste PRD. Elas são condições da entrega posterior.

## Dependências e riscos

- Nathan é o responsável confirmado pela revisão reservada de credenciais e pela confirmação do Dependabot; a atribuição não significa que essas verificações já aconteceram.
- São necessários acesso ao ambiente de teste, imagens e ferramentas compatíveis e meios de testar a configuração de e-mail sem usar segredos em evidências públicas.
- A Wiki é um repositório separado; alterações no repositório da aplicação não garantem publicação dos documentos na Wiki.
- Código ou implantação podem mudar durante a revisão. A referência final deve ser registrada e divergências posteriores reavaliadas.
- Backup/restauração e migrações têm consequências próprias; validar em ambiente isolado e explicitar limites documentados de reversão.
- Fontes externas indisponíveis ou contraditórias podem exigir revisão de afirmações na análise de concorrência.
- O prazo depende da disponibilidade das validações humanas e operacionais. A redação concluída não elimina essas dependências.

## Suposições

- Suposição: os materiais locais da Wiki são uma base reutilizável; sua correspondência com a versão publicada será verificada durante a execução.
- Suposição: haverá ambiente de teste disponível para demonstrar os procedimentos antes do aceite.
- A equipe de 2026.2 consta no índice local da Wiki; sua consistência com o documento de visão deve ser conferida na revisão, sem deduzir novos integrantes do histórico de commits.

## Perguntas abertas

Não há decisão de escopo bloqueante para este PRD após a confirmação do usuário. Permanecem pendências de execução: identificar o ambiente de teste e a versão final de referência; localizar artefatos anteriores; obter as conclusões reservadas de Nathan. Essas pendências deverão ser evidenciadas antes do aceite correspondente.

## Decisões da validação de descoberta

Validação realizada na conversa com o usuário após a instalação de `grill-me` e sua dependência `grilling`, seguindo a orientação de uma decisão por vez da skill `create-prd`. O usuário confirmou expressamente o entendimento compartilhado antes da redação.

| Decisão | Recomendação | Resposta confirmada | Impacto |
|---|---|---|---|
| Fonte principal | Manter documentos na Wiki e procedimentos operacionais existentes no repositório. | Usuário escolheu a opção 1. | Evita duplicar o acervo; a Wiki referencia os procedimentos. |
| Alternativa de organização | Tornar `docs/` a fonte principal com sincronização para a Wiki. | Não selecionada pelo usuário. | Não criar fluxo novo de sincronização para esta entrega. |
| Responsável pelas verificações reservadas | Nathan, conforme recomendação apresentada na conversa. | Usuário respondeu “siga o recomendado”. | Credenciais e Dependabot dependem de confirmação efetiva de Nathan. |
| Escopo conjunto e limites | Consolidar as quatro issues, testar o guia e manter evidências individuais, sem mudanças funcionais nem reabertura de remediações concluídas. | Usuário respondeu “confirmo”. | Autoriza a redação deste PRD com validação de descoberta confirmada. |
