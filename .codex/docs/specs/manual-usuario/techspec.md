# Especificação técnica: Manual de uso do LabOn

- Status: pronta para decomposição em tarefas
- PRD: `./prd.md`
- Atualizado em: 2026-09-14
- Validação de descoberta: confirmada no PRD
- Validação de design: desnecessária por ausência de decisão arquitetural material pendente
- Issue relacionada: #220
- Base inspecionada: `2c78dbe1c3ec41f4004f53c42be8fed556080192`

## Resumo técnico

Criar o manual funcional em `docs/manual/`, organizado por jornadas e perfis, com capturas sintéticas e navegação estável. Validar conteúdo estruturado, links, imagens e geração de páginas antes do merge em `develop`. Preparar uma publicação determinística em clone local da Wiki, com identificação da fonte e comparação após publicação.

A publicação externa é uma operação manual posterior, sujeita à autorização e à permissão de escrita indicadas no PRD. Não criar gatilho de publicação automática do manual. Esta especificação não implementa o manual, scripts ou alterações de produção.

Reutilizar Python e `unittest` da infraestrutura de `.github/scripts/`. Acrescentar a validação documental ao job `workflow-quality` de `.github/workflows/container-ci.yml`. Não são necessários novos serviços, endpoints, migrações ou componentes React.

## Estado atual

| Área | Evidência inspecionada | Implicação |
|---|---|---|
| Produto | `frontend/src/routes.tsx`, `frontend/src/components/ui/app-sidebar.tsx`, `frontend/src/navigation/profileNavigation.ts` | Existem jornadas distintas para Administrador, Mentor e Mentorado; o manual deve reproduzir nomes e acessos efetivos. |
| Autenticação | `frontend/src/auth/passwordPolicy.ts`, `frontend/src/pages/ChangePassword.tsx`, `backend/LabSolos-Server-DotNet8/Services/Security/PasswordPolicy.cs` | Política atual de 15 a 128 caracteres, troca obrigatória inicial, alteração autenticada e recuperação já entregues. |
| Autorização | `backend/LabSolos-Server-DotNet8/Program.cs` e controllers | Perfis e políticas do servidor complementam a leitura dos menus; existir uma rota não prova que toda ação é permitida. |
| Documentação | PRD de `manual-usuario`; diretório `docs/` sem arquivos encontrados | Não há fonte de manual em `docs/manual/` nesta base. |
| Wiki local | `D:/lab-solos.wiki/Home.md` e `Guia-de-Testes-de-Usuário.md` | Há documentação institucional e um guia que se declara modelo ainda sujeito a ajustes; não é evidência de comportamento entregue. O clone local não comprova o estado remoto atual. |
| Publicador existente | `.github/scripts/sync_prds_to_wiki.py` | Gera `Product-Requirements-Document-(PRD).md` e remove páginas antigas `PRD-*.md`; não publica manual nem verifica equivalência de suas páginas. |
| Publicação de PRDs | `.github/workflows/publish-prds-wiki.yml` | Executa em push para `develop` nos caminhos definidos e em execução manual; faz escrita externa e presume `master` na Wiki. Não reutilizar esse gatilho para o manual. |
| Backend | `backend/backend.sln`, `backend/Tests/Tests.csproj` | .NET 8/xUnit; a solução **já inclui** `Tests`, diferentemente da linha de base histórica da skill. |
| Frontend | `frontend/package.json`, `frontend/playwright.config.ts` | Já há Vitest, Testing Library e Playwright, além de lint e compilação. |
| CI | `.github/workflows/container-ci.yml` | Valida PRs para `develop` em `opened`, `synchronize` e `reopened`, além de execução manual; inclui testes Python, frontend, backend e E2E. |

`ordem.txt` marca os slugs anteriores de UX/autenticação como executados. `navegacao-pos-autenticacao/validacao.md` registra conclusão em 2026-09-14. Esses registros orientam o inventário, mas a edição final deverá confirmar a versão efetivamente disponível no ambiente documentado. Há estados históricos divergentes em documentos de dependências; não declarar todas as pendências do repositório resolvidas com base na ordem de execução.

## Arquitetura proposta

### Artefatos e responsabilidade

| Caminho proposto | Responsabilidade |
|---|---|
| `docs/manual/README.md` | Entrada, visão geral, índice por perfil, versão do manual, versão do produto validada e responsável pela revisão. |
| `docs/manual/perfis-e-permissoes.md` | Matriz das ações visíveis e permitidas, com links para jornadas. |
| `docs/manual/acesso-e-conta.md` | Acesso, cadastro, aprovação esperada, primeiro acesso, recuperação, alteração de senha e saída. |
| `docs/manual/administrador.md` | Preparação operacional, usuários, aprovação, produtos, solicitações, empréstimos e devolução. |
| `docs/manual/mentor.md` | Vínculos, solicitações de cadastro, turma, pesquisa de material, criação e acompanhamento de empréstimos. |
| `docs/manual/mentorado.md` | Pesquisa de material, perfil, histórico pessoal e acompanhamento dos vínculos/empréstimos disponíveis. |
| `docs/manual/solucao-de-problemas.md` | Erros comuns, ausência de registros, indisponibilidade, acesso negado e retorno seguro. |
| `docs/manual/imagens/` | PNGs revisados, capturados com dados sintéticos; nomes estáveis em minúsculas e sem espaços. |
| `docs/manual/manual.json` | Metadados, mapa explícito fonte → Wiki, jornadas obrigatórias e inventário de imagens. |
| `docs/manual/manutencao.md` | Procedimento para revisar, gerar, comparar, publicar e reverter; destinado aos mantenedores, fora do índice de jornadas. |
| `.github/scripts/check_manual.py` | Validação local do contrato documental e verificação opcional de links externos. |
| `.github/scripts/sync_manual_to_wiki.py` | Geração local e comparação da Wiki; sem autenticação, commit ou push. |
| `.github/scripts/tests/test_manual_content.py` | Casos positivos e negativos do validador. |
| `.github/scripts/tests/test_manual_publication.py` | Equivalência, idempotência, transformação de links, conflitos e isolamento das páginas. |
| `.github/scripts/tests/test_manual_workflow.py` | Contrato da validação pré-merge, sem publicação externa. |
| `.codex/docs/specs/manual-usuario/validacao.md` | Evidências de jornadas/perfis, auditoria de imagens e teste de autonomia. Criar durante execução. |

A documentação de desenvolvimento SDD permanece em `.codex/docs/specs/manual-usuario/`. `docs/manual/` é a fonte de documentação de uso escolhida no PRD, não um novo diretório de especificações.

### Organização e navegação

Usar Markdown UTF-8, um título principal por página, subtítulos hierárquicos e links textuais descritivos. Cada página funcional oferece retorno ao índice e conexões com pré-requisitos e próximos passos. O índice deve permitir encontrar a jornada a partir de qualquer um dos três perfis, sem conhecimento dos nomes internos do código.

Seções referenciadas recebem âncoras explícitas estáveis, como `<a id="alterar-senha"></a>`. Os IDs usam minúsculas ASCII e hífens e não mudam quando o título é reescrito. Não depender de algoritmos diferentes de geração de âncoras no repositório e na Wiki. Manter âncoras antigas como destinos de compatibilidade quando uma seção for reorganizada.

## Fluxos e componentes

### Cobertura mínima das jornadas

Cada entrada abaixo se decompõe em seções operacionais menores quando houver ações diferentes. As rotas são referências para autores e validação; o texto para o usuário prioriza os controles visíveis e não exige digitar IDs ou URLs internas.

| Jornada | Perfis | Evidência inicial do produto | Conteúdo obrigatório |
|---|---|---|---|
| J01 — Entender o acesso | Todos | `routes.tsx`, `app-sidebar.tsx`, `profileNavigation.ts` | Finalidade, perfis, endereço fornecido pela instituição, pré-requisitos, menu e início correspondente. |
| J02 — Solicitar cadastro | Mentor e Mentorado | `pages/CreateAccount.tsx`, `/create-account`, `contracts/userRegistration.ts` | Escolha de perfil, campos exigidos, vínculo com responsável quando aplicável, envio e espera pela decisão; não prometer acesso imediato. |
| J03 — Avaliar cadastro e vínculos | Administrador e Mentor, conforme alcance real | `pages/RegistrationRequests.tsx`, `/admin/register-request`, `/mentor/users-request`, `UsuariosController.cs` | Aprovar/recusar, resultado, alcance de cada perfil e efeito no solicitante; confirmar regras do serviço antes de redigir passos. |
| J04 — Entrar e concluir primeiro acesso | Todos; troca inicial obrigatória do administrador criado na inicialização | `pages/Login.tsx`, `PasswordChangeRequiredRoute.tsx`, `/change-password-required` | Credencial recebida por canal autorizado, troca obrigatória, nova autenticação e início do perfil. |
| J05 — Alterar ou recuperar senha e sair | Todos | `pages/ChangePassword.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`, `ButtonLogout.tsx` | Acesso à alteração pelo perfil, senha atual, confirmação, 15–128 caracteres, rejeição de senha comum, recuperação e link inválido/expirado, nova autenticação após troca, botão de saída. |
| J06 — Preparar a operação | Administrador | `pages/insert/Register.tsx`, `RegisteredUsers.tsx`, `pages/search/SearchMaterial.tsx` | Receber ambiente e acesso inicial do operador, conferir usuários/vínculos e cadastrar os materiais necessários; passos concretos somente das telas entregues. |
| J07 — Gerir materiais | Administrador; consulta para Mentor/Mentorado | `pages/search/`, `pages/Verification.tsx`, `pages/products/ProductHistory.tsx`, `pages/FollowUp.tsx` | Cadastro/edição disponíveis ao administrador, consulta por perfil, detalhe, histórico e alertas operacionais. |
| J08 — Solicitar e acompanhar empréstimo | Mentor; acompanhamento pessoal do Mentorado | `pages/mentor/LoanCreation.tsx`, `HistoryClass.tsx`, `pages/mentee/HistoryMentoring.tsx`, `pages/loan/` | Pré-requisitos, seleção e envio, status exibidos, detalhe e retorno ao histórico apropriado. Não instruir Mentorado a criar empréstimo sem ação entregue. |
| J09 — Decidir e concluir empréstimo | Administrador | `pages/admin/LoansRequest.tsx`, `AllLoans.tsx`, `ReturnLoan.tsx`, `EmprestimosController.cs` | Aprovar/reprovar, conferir resultado, acompanhar e registrar devolução pelos controles disponíveis. |
| J10 — Gerir e consultar turma/perfil | Mentor e Mentorado; gestão de usuários pelo Administrador | `pages/mentor/MyClass.tsx`, `Disabled.tsx`, páginas de perfil e `RegisteredUsers.tsx` | Vínculos, ativos/inativos conforme interface, consulta de histórico e manutenção da própria conta disponível por perfil. |
| J11 — Recuperar-se de falhas | Todos | `errors/errorCatalog.ts`, `components/global/ErrorFeedback.tsx`, `BackLink.tsx`, `pages/Page404.tsx` | Diferenciar lista vazia de erro, tentar novamente, voltar ao pai/início e reconhecer expiração de sessão sem recomendar apagar dados do navegador. |

Para cada seção operacional, exigir: **quem pode executar**, **pré-requisitos**, **onde começar**, **passos numerados**, **resultado esperado**, **erros comuns** e **saída segura**. Em ações que não oferecem desfazer, explicar o resultado antes da confirmação e não inventar reversão.

Revisar a matriz de permissões com menus, guardas e autorização do servidor. Divergência entre interface e contrato deve ser registrada como impedimento da jornada, com correção no slug responsável; não ensinar contornos por API ou URL. Não transformar todo endpoint ou arquivo existente em funcionalidade do manual. Labon Pro, importação de planilhas e recursos ocultos/em desenvolvimento ficam excluídos. Configuração inicial significa preparação para uso: detalhes de implantação, variáveis de ambiente e arquitetura permanecem no guia operacional existente, por referência quando necessária.

### Ciclo editorial e publicação

1. Inventariar as jornadas na versão do produto que será documentada e registrar a evidência por perfil.
2. Redigir as páginas e capturar imagens no ambiente sintético; executar validação local e revisão humana.
3. Validar autonomia com pessoas sem contexto prévio, corrigir ambiguidades e registrar versão/data/responsável.
4. Abrir revisão em `develop` com verificações documentais pré-merge. Conteúdo aprovado constitui a fonte publicável.
5. Em operação posterior autorizada, obter checkout limpo do commit aprovado e um clone atualizado da Wiki, descobrir sua branch padrão e preparar a geração local.
6. Revisar o diff e publicar somente os arquivos gerenciados pelo manual em um commit da Wiki. Após push, obter uma leitura nova do remoto, comparar o conjunto e conferir renderização, imagens e links.
7. Registrar commit da fonte, versão do produto validada, commit da Wiki, data e resultado da comparação. Falha de push ou de verificação deixa a publicação pendente/falha.

## Contratos e APIs

### Manifesto editorial

`manual.json` terá `versaoEsquema: 1` e os campos obrigatórios abaixo. IDs e nomes de chaves são contratos propostos, sem necessidade de API HTTP.

| Campo | Contrato |
|---|---|
| `versaoManual` | Revisão editorial no formato `AAAA-MM-DD.N`, com `N` inteiro positivo; deve avançar ao alterar conteúdo/imagens publicados. |
| `produtoValidado` | Identificador imutável da versão/commit do produto exercitado; não assumir igualdade com o commit posterior da documentação. |
| `atualizadoEm` | Data ISO válida, igual à apresentada nas páginas. |
| `responsavelRevisao` | Identificador público de pessoa/equipe efetivamente encarregada; vazio ou `não definido` bloqueia entrega do manual. |
| `paginas` | Lista ordenada com `origem`, `destinoWiki` e `titulo`. Caminhos relativos à fonte, sem duplicatas ou colisões por diferença de caixa. |
| `jornadas` | Lista com `id`, `pagina`, `ancora`, `perfis` e referências de evidência no repositório; deve abranger J01–J11 e as variantes por perfil aplicáveis. |
| `imagens` | Lista com `arquivo`, `jornada`, `descricao`, `produtoValidado` e `revisaoPrivacidade` com responsável e data. Alt de cada uso continua obrigatório no Markdown. |

Mapear `README.md` para `Manual-do-Usuario.md` e as páginas funcionais para `Manual-do-Usuario-<slug>.md`. `manual.json` e `manutencao.md` são arquivos de controle, não páginas publicadas. O validador rejeita páginas/imagens não inventariadas ou entradas cujo arquivo não existe. O manifesto e as páginas devem concordar nos metadados visíveis.

### Validador documental

CLI proposta: `python .github/scripts/check_manual.py --source docs/manual [--external]`.

- Sem `--external`, executar sem rede e sem credenciais. Validar manifesto, seções por jornada, perfis, metadados, IDs únicos, índice alcançável, destinos locais, fragmentos e existência de imagens.
- Adotar um subconjunto editorial explícito: links e imagens Markdown inline com destinos sem espaços; links por referência, imagens HTML e HTML arbitrário são rejeitados. Permitir somente o elemento de âncora descrito acima. Ignorar exemplos em código inline/blocos cercados ao identificar links; testar delimitadores, acentos e URLs percentualmente codificadas. Assim o validador não precisa implementar todo Markdown nem adicionar dependências.
- Resolver destinos relativos contra a página de origem. Links internos do manual devem apontar para páginas inventariadas e fragmentos explícitos. Referências externas ao manual devem ser HTTPS completas; proibir caminhos locais do autor, `file:`, URLs com credenciais e esquemas executáveis.
- Reportar arquivo, seção e regra violada; não imprimir o conteúdo potencialmente secreto encontrado. Nenhum erro pode ser convertido em sucesso por captura genérica de exceção.
- Com `--external`, verificar URLs HTTPS únicas com timeout de 10 segundos, no máximo duas tentativas por falha transitória e até cinco redirecionamentos HTTPS. Usar GET limitado se HEAD não for aceito. 404/410 são erro; timeout, 429, 5xx ou destino autenticado são resultado inconclusivo que requer conferência registrada, nunca aprovação silenciosa. Verificar URLs sem autenticação e restringir acesso a destinos públicos; não sondar a instância institucional nem links de recuperação de senha.
- Códigos de saída: `0` aprovado; `1` erro documental/link definitivamente inválido; `2` entrada, configuração ou falha operacional; `3` verificação externa inconclusiva. Opções inválidas usam `2`.

### Gerador e comparador

CLI proposta: `python .github/scripts/sync_manual_to_wiki.py --source docs/manual --wiki <diretorio> --repository <dono/repositorio> --ref <sha-completo> --mode <generate|check>`.

- `generate` altera apenas o clone local explicitamente informado. Validar todos os insumos e gerar em diretório temporário antes de aplicar o conjunto; não chamar Git para escrever remotamente. `check` somente lê, regenera em temporário e compara.
- `--ref` identifica o commit aprovado da fonte, incluindo imagens e manifesto; exigir SHA completo existente no checkout e fonte rastreada idêntica a esse commit. Não aceitar `develop` como identificador de uma publicação reproduzível. O commit da fonte é informado ao gerador, não gravado dentro do próprio arquivo fonte, evitando autorreferência.
- Reescrever links entre páginas para `https://github.com/<dono/repositorio>/wiki/<pagina-sem-extensao>#<ancora>`. Conservar fragmentos locais e o texto dos links. Não alterar exemplos em blocos de código.
- Para imagens, manter o arquivo canônico em `docs/manual/imagens/` e gerar URL do conteúdo bruto no repositório principal fixada em `--ref`: `https://raw.githubusercontent.com/<dono/repositorio>/<sha>/docs/manual/imagens/<arquivo>`. Validar o hash da imagem na fonte; após publicação, conferir seu carregamento. Não duplicar imagens mutáveis em dois repositórios.
- Acrescentar às páginas publicadas versão/data/responsável, versão do produto exercitada, commit da fonte e link da página de origem nesse commit. Indicar que correções devem ser feitas no repositório principal.
- Escrever `manual-publicacao.json` na raiz da Wiki com versão do esquema/gerador, commit da fonte, metadados editoriais, lista de arquivos gerenciados, SHA-256 das páginas geradas e hashes das imagens de origem. O manifesto não inclui seu próprio hash. Ordenar campos/listas de forma definida; usar UTF-8/LF e não inserir horário de execução. Mesmos insumos geram mesmos bytes.
- Na atualização, comparar primeiro os arquivos gerenciados com os hashes do manifesto anterior. Edição direta, remoção inesperada ou colisão com arquivo sem posse comprovada interrompe a geração e apresenta o conflito. Reconciliar a edição na fonte antes de republicar; não fornecer opção de sobrescrita indiscriminada.
- Remover somente páginas obsoletas listadas no manifesto anterior, com conteúdo ainda igual ao hash registrado. Nunca excluir por glob de prefixo. Preservar `Home.md`, `_Sidebar.md`, PRDs e demais documentos. Conferir todos os caminhos resolvidos e rejeitar caminhos absolutos, travessia e links simbólicos que escapem da raiz.
- `check` exige igualdade entre manifesto esperado e observado, páginas existentes e hashes, inclusive exclusões esperadas. Retornar `0` para equivalência, `1` para divergência e `2` para erro de entrada/operação. A primeira publicação sem manifesto é divergência no modo `check`, não falha de configuração.

O GitHub permite edição local da Wiki por Git e publica a branch padrão, que deve ser descoberta na operação; não copiar a suposição de `master` do publicador de PRDs. Os nomes de arquivo determinam as páginas. [Referência oficial: gerenciamento de páginas da Wiki](https://docs.github.com/en/communities/documenting-your-project-with-wikis/adding-or-editing-wiki-pages).

Links Markdown para páginas e imagens com texto alternativo são suportados pela Wiki; a estratégia de fixar a imagem ao commit da fonte é uma decisão desta especificação. [Referência oficial: edição do conteúdo da Wiki](https://docs.github.com/en/communities/documenting-your-project-with-wikis/editing-wiki-content).

## Dados e migrações

Não alterar banco de dados, DTOs, sessão ou contratos do produto. Os dados novos são os Markdown, PNGs, manifesto editorial e manifesto gerado na Wiki.

A primeira publicação cria páginas com nomes próprios, sem substituir o guia de testes antigo. Incluir um link para o índice do manual no `README.md` principal junto da referência existente à Wiki. Uma eventual edição de `Home.md` da Wiki será um diff separado e revisado na operação de publicação, preservando o texto existente; o gerador não assume posse dessa página.

## Segurança, privacidade e permissões

- Capturar somente ambiente isolado com cadastros sintéticos; usar identificadores como “Mentor de demonstração” e e-mails do domínio reservado `example.test`, sem dados reais ou rostos identificáveis.
- Não capturar senhas, valores de tokens, cookies, ferramentas de desenvolvedor, cabeçalhos de requisição ou URLs de redefinição. Campos de senha ficam vazios; cortar a barra de endereço quando puder conter informação sensível. Capturar a tela real da versão validada, sem inventar interface.
- Revisar cada PNG integralmente antes de adicioná-lo à fonte, inclusive metadados embutidos. Verificação automatizada de alt/caminhos não comprova ausência de PII nos pixels; registrar revisão humana de todas as imagens e do texto.
- Toda imagem informativa tem alt que descreve seu propósito e é acompanhada de passos textuais suficientes para executar a tarefa. Não depender apenas de cor, setas ou posição na imagem.
- Publicação usa a credencial já autorizada do operador pelo mecanismo de autenticação Git; tokens não entram na CLI dos scripts, em URLs persistidas ou em relatórios. O CI documental possui somente `contents: read` e funciona em PRs sem segredos.
- O manual explica as permissões existentes; não modifica autorização nem inclui instruções de bypass. Divergências entre documentação e produto bloqueiam a seção afetada.

## Falhas, observabilidade e operação

| Situação | Tratamento e evidência |
|---|---|
| Link local, âncora, imagem ou metadado inválido | Reprovar pré-merge com diagnóstico por arquivo e regra. |
| PII ou captura inadequada | Reprovar revisão; produzir nova captura sintética e atualizar sua evidência. |
| Jornada sem funcionalidade concluída | Não documentar como disponível; registrar impedimento e devolver ao fluxo do produto. |
| Fonte diferente do commit informado | Bloquear geração publicável; escolher checkout limpo correto. |
| Alteração manual de página gerenciada | Bloquear atualização, preservar conteúdo e reconciliar via revisão da fonte. |
| Wiki desabilitada ou sem permissão | Registrar publicação pendente; manter fonte e preparação local disponíveis. Não afirmar CA-003 concluído. |
| Publicador de PRDs ou outro editor escreve durante a operação | Push normal falha por divergência; obter novo clone/estado, regenerar e revisar. Não usar force-push nem incluir alterações alheias. |
| Link externo indisponível | Registrar destino, código sanitizado e resultado inconclusivo; conferir antes de declarar publicação validada. |
| Falha após preparação local | Não publicar conjunto parcial. Restaurar apenas arquivos desta operação em clone descartável ou repetir a preparação em outro clone limpo. |

Relatórios devem apresentar versão da fonte/produto, contagem de páginas, jornadas e imagens, resultado por regra e arquivos adicionados/alterados/removidos. A evidência pós-publicação associa os dois commits. O comando `check` detecta divergência quando executado; esta entrega não promete monitoramento contínuo da Wiki.

## Compatibilidade, disponibilização e reversão

O manual é independente do deploy do aplicativo. Antes de publicar, confirmar que as instruções e capturas correspondem à versão de produto disponível aos leitores, registrando essa versão no índice. A aprovação de documentação em `develop` não comprova, por si só, disponibilidade do produto em produção.

Preservar nomes de páginas e âncoras compartilhados; para uma renomeação necessária, manter página curta de encaminhamento, inventariada e gerenciada, com o destino novo. A versão visível permite que suporte e leitor identifiquem instruções antigas.

Para reverter, selecionar commit anterior aprovado da fonte e regenerar suas páginas sobre clone atualizado da Wiki, revisando o diff e preservando documentos externos. Registrar a reversão em novo commit, sem reescrever histórico. Se houver evolução incompatível do esquema do gerador, utilizar a versão correspondente à fonte escolhida e validar o conjunto antes do push. Reverter a documentação não reverte o produto; sua compatibilidade deve ser conferida novamente.

## Estratégia TDD e pirâmide de testes

O executor Python já existe, mas testes e validador do manual ainda não. Sua criação é pré-requisito para aplicar TDD aos scripts. Prosa e capturas têm revisão editorial e teste de tarefa; não tratar títulos presentes como prova de autonomia.

### RED

1. Criar fixtures mínimas em diretórios temporários e testes que falhem por comportamento ausente: página faltante, perfil inválido, jornada sem passos/resultado/saída, metadados divergentes, imagem sem alt, fragmento inválido e arquivo fora da raiz.
2. Exercitar conteúdo realista com acentos, exemplos cercados, links válidos, imagens e IDs estáveis. Incluir sintaxe não suportada para exigir rejeição explícita.
3. Para geração, montar fonte e Wiki temporárias com uma página alheia. Exigir links convertidos, imagem fixada no SHA, metadados corretos, equivalência e preservação byte a byte do documento alheio.
4. Provocar edição direta da Wiki, colisão inicial, exclusão gerenciada, saída divergente e duas gerações idênticas. Os testes devem falhar antes da implementação desses contratos; usar Git local temporário quando for necessário conferir o commit da fonte.
5. Adicionar teste de contrato que exija execução do validador no job pré-merge e ausência de segredos/publicação. Registrar comando, falha esperada e causa nas evidências da tarefa.

### GREEN

Implementar apenas a validação, transformação e comparação necessárias para os casos acima, com biblioteca padrão Python. Escrever as páginas e o manifesto até os checks reais passarem; produzir capturas sintéticas revisadas. Integrar a validação no `workflow-quality`, preservando os demais jobs e a dependência PyYAML já usada pelos testes existentes.

Usar requisições externas simuladas nos testes unitários do verificador de links; testar timeout, redirecionamento e fallback de método sem depender de serviços públicos. O comando externo real fica no procedimento de revisão/publicação.

### REFACTOR

Extrair funções de leitura, validação, transformação e comparação quando houver repetição, mantendo CLI e códigos de saída. Reexecutar testes afetados e a suíte Python existente. Não generalizar o publicador de PRDs nem adicionar um gerador de sites.

### Níveis e aceite humano

| Nível | Cobertura |
|---|---|
| Unitário | Regras documentais, metadados, destinos, âncoras, alt e respostas do verificador externo. |
| Integração local | Fonte real, geração em diretório temporário, hashes, segunda geração sem diff e comparação de Wiki divergente. |
| Contrato de CI | Validador e testes antes do merge, sem credenciais ou push; preservar o workflow de PRDs. |
| UI/E2E existente | Consultar `credential-lifecycle.spec.ts`, `feature-visibility.spec.ts`, `post-auth-navigation.spec.ts` e testes de contrato como apoio ao inventário. Não duplicar testes do produto apenas para capturas. |
| Revisão editorial e visual | Todas as jornadas/perfis; linguagem, índice, caminhos, permissões, dados sintéticos, alt significativo e renderização no GitHub/Wiki. |
| Autonomia — CA-001 | Pelo menos uma pessoa sem contexto prévio por perfil, com contas sintéticas e cenário preparado, executa as jornadas principais aplicáveis usando somente o manual. Registrar perfil, jornada, versão, resultado e impedimentos, sem identidade pessoal. |

O facilitador prepara materiais/contas necessários e entrega o objetivo, mas não orienta os passos. Qualquer ajuda operacional necessária ou instrução incorreta exige correção e repetição da jornada; completar sem ajuda é a evidência de aceite. Até existir essa execução humana, CA-001 permanece pendente mesmo com CI verde.

## Esteira de qualidade

Comandos abaixo partem da raiz, salvo onde indicado. Comandos propostos só existirão após a implementação dos artefatos identificados.

| Área | Comando local | Verificação de CI | Lacuna/ação |
|---|---|---|---|
| Contratos existentes | `python -m unittest discover -s .github/scripts/tests -p "test_*.py" -v` | Já executado no job `workflow-quality`; Python 3.12 e `python -m pip install PyYAML==6.0.3` | Novos testes `test_manual_*.py` entram na descoberta existente. |
| Testes do manual — proposto | `python -m unittest discover -s .github/scripts/tests -p "test_manual_*.py" -v` | Executados pela descoberta acima | Criar casos de conteúdo/publicação/workflow antes dos scripts. |
| Conteúdo real — proposto | `python .github/scripts/check_manual.py --source docs/manual` | Acrescentar passo explícito em `workflow-quality` | Hoje inexiste validação da fonte real; testes com fixtures sozinhos não bastam. |
| Links externos — proposto | `python .github/scripts/check_manual.py --source docs/manual --external` | Fora do gate determinístico | Executar na revisão/publicação e registrar falhas/inconclusões. |
| Geração — proposto | `python .github/scripts/sync_manual_to_wiki.py --source docs/manual --wiki <clone-local> --repository ifpebj-ti/lab-solos --ref <sha-completo> --mode generate` | Integração em temporário via `unittest`; sem remoto | Substituir parâmetros pela fonte aprovada e destino local real; cria apenas arquivos locais. |
| Equivalência — proposto | `python .github/scripts/sync_manual_to_wiki.py --source docs/manual --wiki <clone-atualizado> --repository ifpebj-ti/lab-solos --ref <sha-completo> --mode check` | Testes locais de igualdade/divergência | Executar também sobre nova leitura da Wiki após publicação. |
| Workflow | `bash .github/scripts/install_actionlint.sh .tmp/actionlint` e `.tmp/actionlint/actionlint .github/workflows/container-ci.yml` | Já existente em `workflow-quality` | Ambiente Bash; conservar actions fixadas por SHA. |
| Frontend existente | Em `frontend`: `npm ci`, `npm run test -- --run`, `npm run lint`, `npm run build` | Já existente em `frontend-quality` | Nenhuma infraestrutura nova de testes React necessária. |
| Backend existente | `dotnet restore backend/backend.sln`, `dotnet build backend/backend.sln --no-restore -c Release --nologo --disable-build-servers`, `dotnet test backend/backend.sln --no-build --no-restore -c Release --nologo --disable-build-servers` | Já existente em `backend-quality`, inclusive comando direcionado de integração | Testes PostgreSQL exigem Docker; não usar resultado sem integração como evidência de toda a suíte. |
| E2E existente | `docker compose -f docker-compose-e2e.yml up -d --build --wait`; em `frontend`: `npm run test:e2e:list` e `npm run test:e2e` | Já existente em `auth-e2e`, com instalação de Chromium | Ambiente sintético para exercício/capturas; sua execução pode alterar senhas de teste. Preparar estado conhecido para cada sessão humana. |
| Formatação da contribuição | `git diff --check` | Verificação local | Executar sobre os artefatos alterados. |

Os gatilhos de PR do `container-ci.yml` são pré-merge; o `container-release.yml` trata release após integração e não substitui esse gate. O workflow de publicação de PRDs também não valida o manual. A obrigatoriedade dos checks na proteção de `develop` deve ser verificada pelo mantenedor na implantação; o arquivo de workflow sozinho não comprova que o GitHub bloqueia merge sem aprovação.

**Evidência desta especificação:** inspeção dos manifestos/workflows e execução de `python -B -m unittest discover -s .github/scripts/tests -p test_container_ci_workflow.py -v`: **10 testes aprovados**, em Python 3.14.3 local. A CI usa Python 3.12; manter scripts compatíveis com ela. Testes do manual, revisão humana, frontend/backend e publicação não foram executados nesta etapa documental. Resultados históricos em outros slugs não são novas execuções desta especificação.

## Matriz de rastreabilidade

| Requisito | Componentes | Testes | Evidência |
|---|---|---|---|
| RF-001 — Manual por jornada | Páginas funcionais, J01–J11, `manual.json` | Estrutura obrigatória, revisão editorial e tarefa real por perfil | Checklist por jornada e resultados em `validacao.md`. |
| RF-002 — Perfis e permissões | `perfis-e-permissoes.md`, páginas por perfil, inventário de rotas/ações | Confronto menu/guarda/servidor e exercício por perfil | Matriz revisada com versão do produto e destinos disponíveis. |
| RF-003 — Publicação rastreável | Gerador/comparador, `manual-publicacao.json`, procedimento manual | Transformação, idempotência, conflito, isolamento e comparação pós-push | SHA da fonte e da Wiki, diff revisado e `check` aprovado. |
| RNF-001 — Acessibilidade e privacidade | Markdown, alt, imagens sintéticas, índice | Validação automática e revisão humana de todas as imagens/textos | Inventário de imagens revisado e auditoria em `validacao.md`. |
| RNF-002 — Manutenibilidade | Metadados, âncoras, validador e `manutencao.md` | Links locais/externos, manifesto e versão visível | Relatório de links, responsável identificado e data/versão consistentes. |
| CA-001 — Autonomia | Conjunto funcional dos três perfis | Pessoa sem contexto prévio por perfil; jornadas concluídas sem ajuda | Resultados individuais por jornada; bloqueado enquanto faltar execução humana. |
| CA-002 — Conteúdo seguro | Todas as páginas e imagens | Auditoria de privacidade/acessibilidade, alt e renderização | Revisão completa sem PII/segredos e alternativas textuais úteis. |
| CA-003 — Fonte e Wiki | Fonte aprovada, geração, publicação manual e leitura posterior | Igualdade de páginas/hashes e conferência de links/imagens | Resultado pós-publicação; permanece pendente até operação externa autorizada e validada. |

## Alternativas e decisões

| Decisão | Alternativas | Recomendação | Escolha confirmada | Consequências |
|---|---|---|---|---|
| Fonte e destino | Wiki como fonte; fonte no repositório e Wiki publicada | `docs/manual/` → Wiki | Confirmada na descoberta do PRD | Revisão junto ao produto e rastreabilidade por commit. |
| Publicação | Automática em push; operação manual rastreável | Manual, com geração local e comparação | Restrição explícita do PRD; aplicada nesta solução | CI valida sem escrever externamente; publicação exige operação posterior. |
| Ferramentas | Gerador de site; pacote Node; scripts Python pequenos | Python/`unittest` existentes e subconjunto Markdown validável | Escolha técnica desta especificação; sem decisão material pendente | Evita nova pilha; sintaxe documental limitada e testada. |
| Integração com PRDs | Alterar o gerador de PRDs; publicador próprio com posse delimitada | Script próprio para manual | Escolha técnica desta especificação | Preserva PRDs e páginas institucionais; exige lidar com concorrência no push. |
| Capturas | Dados reais anonimizados; ambiente sintético | Capturas reais da interface com dados sintéticos | Atende ao PRD de privacidade | Preparar cenários e revisar pixels/metadados. |
| Imagens publicadas | Duplicação na Wiki; URLs da fonte fixadas no commit | Imagens canônicas no commit da fonte | Escolha técnica desta especificação | Sem cópias divergentes; depende da acessibilidade do repositório ao público do manual. |
| Prova de autonomia | Apenas testes automáticos; teste com usuário novo | Automação documental e execução humana | Estratégia já definida no PRD | CA-001 depende de pessoas disponíveis e resultados registrados. |

Não há alternativa arquitetural material que exija nova sessão de decisão. A solução aplica a fonte/destino e a restrição de publicação já confirmadas; as demais escolhas são detalhes de implementação compatíveis com a infraestrutura existente.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Capturas ou passos envelhecem após mudanças de UX | Associar jornada/imagem à versão validada; revisar o manual em alterações de navegação, autenticação e permissões. |
| Funcionalidade existe no código, mas não está operacional ou disponível aos leitores | Exercitar versão entregue e cruzar interface/servidor; não usar PRD antigo como única fonte. |
| Checks passam, mas iniciante não entende a instrução | Execução humana obrigatória, correção e repetição da tarefa com impedimento. |
| Manifesto declara revisão sem exame efetivo dos pixels | Revisão humana registrada por imagem; não atribuir ao validador capacidade de detectar todo dado pessoal. |
| Wiki editada diretamente ou concorrência com PRDs | Comparação com manifesto anterior, push normal e nova geração sobre remoto atualizado. |
| Repositório/imagens sem acesso para o leitor da Wiki | Confirmar acesso e renderização antes de publicar; não declarar publicação válida se imagens não carregarem. |
| Validador interpreta Markdown incorretamente | Subconjunto explícito, fixtures com bordas e rejeição de sintaxe não suportada. |
| Responsável de revisão ou participantes ainda não alocados | Identificar durante execução; são condições de aceite editorial, não lacunas de arquitetura. |

## Perguntas abertas

Nenhuma pergunta arquitetural bloqueante. Durante a execução, registrar o responsável efetivo pela revisão, a versão do produto disponível aos leitores, os participantes por perfil e o resultado da checagem de acesso à Wiki/imagens.

Antes de declarar a entrega completa, obter evidência humana de CA-001 e evidência externa de CA-003. A autorização para criar esta especificação não executa nem presume autorização para publicar na Wiki.
