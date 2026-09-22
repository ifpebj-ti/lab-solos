# Especificação técnica: Documentação da primeira entrega

- Status: pronta para decomposição em tarefas
- PRD: [Documentação da primeira entrega](./prd.md)
- Atualizado em: 2026-09-21
- Responsável pela revisão: Nathan Maciel
- Validação de design: desnecessária por ausência de alternativa arquitetural material pendente; as decisões de produto foram confirmadas na descoberta.
- Referência da aplicação inspecionada: `790ee6bd8a1a32ff7e5519d591b73931f537657b`
- Referência local da Wiki inspecionada: `e0f8ba291ea0d0ee74e33a1c9ce23a6c53d658f4`

## Resumo técnico

Consolidar as issues [#352](https://github.com/ifpebj-ti/lab-solos/issues/352), [#353](https://github.com/ifpebj-ti/lab-solos/issues/353), [#355](https://github.com/ifpebj-ti/lab-solos/issues/355) e [#356](https://github.com/ifpebj-ti/lab-solos/issues/356) em uma entrega documental. A Wiki permanece como fonte principal; os procedimentos OCI e de migrações permanecem no repositório da aplicação. A solução acrescenta páginas e revisão editorial, validação documental pequena em Python e evidências rastreáveis. Não altera APIs, código de produção, esquema de dados ou autenticação.

Os documentos descreverão fatos conferidos no código e na operação, sem converter automaticamente requisitos antigos em funcionalidades implementadas. A automação verificará contratos mecânicos, enquanto a revisão humana verificará semântica, fontes e conclusões reservadas.

## Estado atual

### Documentação e publicação

- A Wiki já possui `Home.md`, documento de visão, análise de concorrência, modelagem de ameaças e guias Docker e de desenvolvimento seguro. Reutilizar seus nomes e endereços para preservar links.
- O índice local distingue equipes históricas e identifica Nathan Maciel em 2026.2. Conferir a consistência do documento de visão com essa informação.
- `infra/oci/README.md` e `Data/Migrations/README.md` já documentam operação, migração de bancos legados e limites da reversão.
- `.github/scripts/check_manual.py` verifica um contrato específico de `docs/manual`, com jornadas e perfis. Não é um validador genérico da Wiki.
- `.github/scripts/sync_manual_to_wiki.py` administra somente o conjunto do manual. Não utilizá-lo para publicar as novas páginas institucionais.
- `.github/scripts/sync_prds_to_wiki.py` escreve `Product-Requirements-Document-(PRD).md`. O fluxo `publish-prds-wiki.yml` publica após push em `develop` nos caminhos monitorados ou execução manual. Não valida previamente esta entrega nem publica todas as páginas da Wiki.
- A questão de duplicidade dos rascunhos no Project 41 e de artefatos ligados à #30 vem das issues; sua reconciliação ainda precisa ser executada. Não declarar essa pesquisa concluída.

### Aplicação e infraestrutura

- Frontend React 18/Vite/TypeScript, servido por Nginx. O `entrypoint.sh` gera `env.js` por `envsubst`; `BaseApi.tsx` prioriza `window.env.VITE_API_URL`, depois a variável Vite e o endereço padrão local.
- API ASP.NET Core, alvo .NET 8, com controladores, serviços, repositórios e EF Core/PostgreSQL. `Program.cs` aplica `Database.Migrate()` na inicialização.
- `DbSeeder` retorna quando já existem usuários. Em banco vazio nos ambientes suportados, `SeedUsuarios` exige e-mail e senha válidos e cria administrador com troca obrigatória de senha.
- Produção usa Caddy, imagens GHCR versionadas e serviços internos; desenvolvimento publica portas do frontend, backend e banco e utiliza builds locais.
- `Caddyfile` encaminha `/api/*` ao backend e as demais rotas ao frontend. `/health` do ASP.NET Core não é encaminhado ao backend por esse proxy. O atualizador consulta `/api/System/health`, cujo controlador retorna `status: healthy 1.0`; isso não prova a integridade dos dados nem exercita SMTP.
- A atualização por release verifica saúde e tenta restaurar a versão anterior em caso de falha. Não restaura banco nem desfaz migrações.

### Qualidade: linha de base reconfirmada

A advertência histórica da skill não corresponde mais ao código atual: `backend/backend.sln` inclui `Tests/Tests.csproj`; o frontend possui Vitest e Playwright; `container-ci.yml` roda antes do merge em PRs para `develop` e em `merge_group`. O fluxo de release continua sendo uma operação posterior à integração estável, não um gate pré-merge.

Na máquina inspecionada há Python 3.14.7 e Node 24.21.0. Docker não foi encontrado no PATH. `global.json` exige SDK .NET 8.0.419 com avanço de versão desativado; os SDKs encontrados foram 8.0.425 e 10.0.401. Os testes operacionais deverão usar ambiente preparado; não alterar `global.json` para acomodar esta máquina.

Atualização após instalação autorizada pelo usuário em 21/09/2026: SDK .NET 8.0.419 instalado e validado com `dotnet --version` na raiz e `dotnet sln backend/backend.sln list`, preservando os SDKs anteriores. Docker Desktop 4.91.0 instalado por usuário, com Docker CLI 29.8.0 e Compose 5.5.1 verificados. WSL 2.7.13 instalado e `VirtualMachinePlatform` habilitado. O Windows solicitou reinicialização para aplicar a ativação; o motor Docker ainda não iniciou (`docker info` retornou indisponibilidade). Reiniciar o Windows, abrir Docker Desktop e validar `docker info` e um contêiner de teste antes de considerar o ambiente operacional. O instalador adicionou Docker ao PATH do usuário; terminais existentes precisam ser reabertos. Nenhuma instalação de teste do LabOn foi executada.

## Arquitetura proposta

Verificação após a reinicialização em 21/09/2026: Docker Desktop iniciado, `docker info` confirmou servidor `29.8.0` do tipo `linux`, e `docker run --rm hello-world` baixou a imagem e executou com sucesso. Compose `5.5.1` e SDK .NET `8.0.419` também foram confirmados. O impedimento de instalação/ativação foi resolvido; isso ainda não equivale à validação da instalação do LabOn nem às confirmações humanas da entrega.

### Organização e propriedade dos arquivos

Os caminhos da Wiki abaixo são relativos ao checkout `../lab-solos.wiki`; os demais são relativos ao repositório da aplicação.

| Área | Arquivos | Alteração prevista |
|---|---|---|
| Arquitetura e dados | Wiki: `Arquitetura-e-Modelagem-de-Dados.md` | Nova página consolidada com componentes, decisões, DER, dicionário e fontes. Reaproveitar artefato equivalente caso localizado antes da criação. |
| Operação | Wiki: `Guia-de-Execução-e-Configuração-com-Docker-e-Docker-Compose.md` | Revisar instalação, configuração, diagnóstico, recuperação e referências. |
| Procedimentos canônicos | `infra/oci/README.md`; `backend/LabSolos-Server-DotNet8/Data/Migrations/README.md` | Complementar somente lacunas necessárias; manter coerência com os scripts atuais. |
| Visão e concorrência | Wiki: `Documento-de-visão-e-Requisitos.md`; `Análise-de-concorrência.md` | Atualizar equipe, estado do produto, fontes e datas. |
| Segurança | Wiki: `Modelagem-de-Ameaça.md`; `Guia-de-Boas-Práticas-de-Desenvolvimento-Seguro.md` | Atualizar fluxos, fronteiras e matriz de controles. |
| Navegação | Wiki: `Home.md` | Adicionar links e preservar seções e páginas existentes. |
| Revisão de credenciais | Materiais atuais da Wiki, Markdown operacionais, `security/` e exemplos de configuração versionados | Inventariar e corrigir exemplos sensíveis; não coletar `.env` real nem exportar achados brutos. Mudanças em páginas geradas devem ocorrer nas respectivas fontes. |
| Rastreabilidade | `.codex/docs/specs/documentacao-primeira-entrega/inventario.md`, `validacao.md`, `evidencias/` | Registrar artefatos anteriores, revisões, resultados sanitizados e pendências por critério. |
| Contrato documental | `.codex/docs/specs/documentacao-primeira-entrega/documentacao.json` | Manifesto pequeno de páginas, referências e exemplos; não duplica o conteúdo canônico. |
| Validação nova | `.github/scripts/check_delivery_docs.py`; `.github/scripts/tests/test_delivery_docs.py`; `.github/scripts/tests/fixtures/delivery_docs/` | Validador somente leitura e testes com exemplos sintéticos. |
| CI documental nova | `.github/workflows/documentation-quality.yml` | Executar testes do validador, conferir Wiki fixada por SHA e validar os exemplos Compose. |

Esta lista define contratos e limites para a futura decomposição, não implementa os arquivos propostos nesta etapa. Não acrescentar gerador geral, sincronizador da Wiki, aplicação web ou dependência de renderização de diagramas.

### Formato editorial

Usar Markdown UTF-8, títulos em português e diagramas Mermaid acompanhados de explicação textual. Cada página revisada deve informar data, responsável e referência da aplicação quando descrever implementação. Referências ao código devem usar SHA completo em links `blob/<sha>/<caminho>`; navegação entre páginas usa os nomes estáveis da Wiki. Datas de consulta são distintas da data de revisão.

Mermaid será conferido visualmente na prévia e na publicação. Um bloco sintaticamente presente não equivale a um diagrama correto ou legível.

## Fluxos e componentes

### Sequência de execução

1. Registrar estado dos dois repositórios e versões de referência. Inventariar documentos, #30 e rascunhos do Project 41; registrar reaproveitamento, consolidação ou ausência de artefato, com referências.
2. Iniciar revisão reservada com Nathan e substituir exemplos reais nos materiais atuais. A conclusão operacional da #356 pode permanecer pendente enquanto a redação avança.
3. Derivar arquitetura e modelo físico das fontes atuais. Conferir decisões com Compose, Caddy, inicialização, serviços de autenticação e e-mail.
4. Revisar Docker e operação usando as mesmas versões de referência; construir exemplos sintéticos e testar os roteiros.
5. Atualizar visão, concorrência, ameaças e guia seguro. Pesquisar fontes oficiais dos concorrentes na execução e registrar data, URL e afirmação sustentada. Fonte indisponível ou ambígua não autoriza inferir uma funcionalidade.
6. Integrar índice, referências e evidências; validar um candidato identificável da Wiki e publicar apenas a revisão validada.

### Conteúdo mínimo da arquitetura

Representar navegador, frontend/Nginx, API, PostgreSQL, Caddy, SMTP e atualização por release. Distinguir comunicação do navegador com a API, redes Docker, fronteira pública, administração da VM e serviços externos. Documentar desenvolvimento separadamente da implantação de produção. Relacionar responsabilidades a diretórios e arquivos reais, sem inventar microsserviços.

### Conteúdo mínimo da configuração

O guia deve ter tabela com variável, finalidade, ambientes, regra de preenchimento e indicação de segredo. Cobrir todas as variáveis interpoladas nos dois Compose, inclusive valores padrão opcionais:

- Banco: `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT` quando publicado em desenvolvimento.
- Aplicação: `ASPNETCORE_ENVIRONMENT`, `ALLOWED_HOSTS`, `FRONTEND_PORT`, `BACKEND_PORT`, `VITE_API_URL`.
- E-mail: `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`, `EMAIL_USUARIO`, `EMAIL_SENHA`, `EMAIL_DE`.
- JWT: `JWT_KEY`, `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_EXPIRES_IN_MINUTES`.
- Primeiro acesso: `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`.
- Produção: `APP_DOMAIN`, `LABON_IMAGE_VERSION`, opcionais `LABON_FRONTEND_IMAGE` e `LABON_BACKEND_IMAGE`.

Separar três níveis de validade: interpolação do Compose, inicialização da aplicação e funcionamento das integrações. `config --quiet` não valida política de senha, DNS/TLS, acesso às imagens ou entrega de e-mail. Ausência de `LABON_IMAGE_VERSION` deve falhar no Compose; campos não protegidos por essa expressão podem falhar somente na aplicação. Conferir a política implementada antes de escolher senhas sintéticas de teste.

Os blocos `.env` canônicos ficam no guia, sob títulos identificáveis de desenvolvimento e produção. O validador extrai cada bloco para diretório temporário, evitando manter cópias em outro diretório. Placeholder editorial e valor sintético executável devem ser diferenciados: o primeiro exige substituição, o segundo serve exclusivamente ao teste isolado.

## Contratos e APIs

### Contratos existentes documentados

Não criar nem alterar endpoints. Registrar o uso de `/api/System/health` no roteiro do proxy e a diferença em relação a `/health`. Explicar o primeiro acesso e a troca obrigatória de senha conforme o código e o manual existente, sem introduzir acesso administrativo universal. Referências a JWT e SMTP descrevem configuração, não novos contratos de autenticação ou envio.

### Interface do validador proposto

Comando a criar, executado na raiz do repositório:

```text
python .github/scripts/check_delivery_docs.py --repository . --wiki ../lab-solos.wiki --manifest .codex/docs/specs/documentacao-primeira-entrega/documentacao.json --mode editorial
python .github/scripts/check_delivery_docs.py --repository . --wiki ../lab-solos.wiki --manifest .codex/docs/specs/documentacao-primeira-entrega/documentacao.json --mode compose
```

- `editorial`: conferir manifesto, páginas obrigatórias, links locais e para a Wiki, títulos de destino, metadados e exemplos suspeitos. Não acessar a rede implicitamente nem modificar documentos.
- `compose`: extrair os dois blocos sintéticos e executar `docker compose --env-file <temporario> -f <arquivo> config --quiet`, isolando as variáveis de interpolação do ambiente do processo para evitar interferência de segredos ou valores locais. Conferir nomes de variáveis contra os Compose; não iniciar serviços.
- Saídas: código `0` para verificações do modo atendidas; `1` para violação do contrato; `2` para entrada ilegível, ferramenta indisponível ou falha de infraestrutura. Nunca transformar ausência de Docker em sucesso.
- Diagnósticos limitados a caminho relativo, identificador da regra e localização. Não imprimir valores de variáveis, linhas suspeitas, comandos com credenciais nem stderr bruto potencialmente sensível. Falha mantém causa categorizada e resultado reprodutível.
- Invocar subprocessos por lista de argumentos, sem shell. Validar caminhos resolvidos sob as raízes permitidas; não seguir caminhos que escapem delas. Arquivos temporários contêm apenas valores sintéticos e são removidos ao final.

Contrato do manifesto `documentacao.json`, versão inicial `1`: `versao`, `referenciaAplicacao` e `referenciaWiki` como SHAs completos; `paginas` como lista de caminhos, títulos/seções obrigatórias e IDs de requisitos/critérios; `exemplosCompose` como pares de seção da Wiki e arquivo Compose. Rejeitar campos inválidos, duplicatas e caminhos externos. Os SHAs devem existir e identificar as revisões usadas, não apenas corresponder ao formato hexadecimal.

Links externos de concorrentes exigem revisão com data; o validador local não declara sua disponibilidade. Links para arquivos `blob/<sha>` do próprio repositório podem ser conferidos com leitura Git da revisão correspondente. Os nomes com acentos, percentuais codificados, parênteses e fragmentos merecem testes próprios; não implementar resolução apenas por busca de substrings.

### Contrato de evidências

`validacao.md` conterá: issue, CA, revisão da aplicação, revisão da Wiki, ambiente, data, procedimento, resultado, evidência e pendência. Estados permitidos: `pendente`, `aprovado`, `reprovado` e `bloqueado`. Aprovação de uma verificação automática não aprova automaticamente o CA completo.

Para CA-009 e CA-010, registrar somente data e conclusão autorizada de Nathan, sem identificadores de contas atingidas, valores, detalhes exploráveis ou transcrição de conversas restritas. Atribuição de responsabilidade e revisão automática de padrões não satisfazem esses critérios.

## Dados e migrações

Não criar migrações. O DER será físico, baseado em `AppDbContext.cs`, modelos e `AppDbContextModelSnapshot.cs`, com explicação separada da herança em C#.

O snapshot inspecionado mapeia sete tabelas de domínio: `Usuarios`, `Produtos`, `Lotes`, `Emprestimos`, `ProdutosEmprestados`, `Notificacoes` e `LogsAuditoria`. `Administrador` e `Academico` compartilham `Usuarios` por discriminador `TipoUsuario`; `Quimico` e `Vidraria` compartilham `Produtos` por `Tipo`. Não criar tabelas no DER apenas porque há um `DbSet` ou classe com esse nome. `__EFMigrationsHistory` deve ser identificado como estrutura técnica no procedimento de migrações.

| Relação | Regra observada a representar |
|---|---|
| Usuário → empréstimos solicitados | Solicitante obrigatório; exclusão restrita. |
| Usuário → empréstimos aprovados | Aprovador opcional; exclusão restrita. |
| Usuário → responsável | Autorrelacionamento opcional; vários dependentes; exclusão restrita. |
| Lote → produtos | Lote opcional no produto; exclusão define referência nula. |
| Empréstimo e produto → produtos emprestados | Duas referências obrigatórias; tabela associativa com dados próprios; exclusão em cascata. |
| Usuário → notificações | Referência opcional no snapshot; exclusão em cascata. Conferir nulabilidade e semântica sem inferir obrigatoriedade pelo nome. |
| Usuário → auditoria | Referência opcional; exclusão define referência nula. |

O dicionário registrará tabela/coluna, tipo de armazenamento, nulabilidade, PK/FK, valores discriminadores ou enumerações, significado e fonte. Cobrir os campos das sete tabelas; nunca incluir registros reais. Explicar `DataIngresso` como `date`, `TokenRedefinicaoHash`, `ExigeTrocaSenha` e `VersaoSessao` sem expor seus valores.

Documentar o percurso de banco vazio e de banco legado criado por `EnsureCreated`, incluindo backup, comparação da baseline e validação de histórico. Nenhuma revisão documental pode sugerir marcar uma baseline sem conferir o esquema ou reverter versão de sessão para recuperar acesso.

## Segurança, privacidade e permissões

- A revisão cobre materiais atuais, incluindo exemplos operacionais e páginas geradas. Não buscar indiscriminadamente segredos em arquivos privados nem anexar conteúdo sensível ao inventário.
- Usar domínios e identidades fictícios explícitos; diferenciar segredos de teste descartáveis de placeholders a preencher no ambiente real.
- A análise automática detecta padrões conhecidos, mas não prova ausência de credenciais reais. A revisão de Nathan é obrigatória e independente.
- A matriz de controles conterá ativo/fluxo, ameaça, fronteira de confiança, controle, estado, justificativa, responsável e evidência. “Implementado” exige fonte verificável; “planejado” não será apresentado como proteção ativa.
- Confirmar Dependabot no momento da revisão. Se o resultado divergir da ausência de vulnerabilidades esperada, manter o critério pendente e registrar o impedimento; não abrir automaticamente nova remediação neste escopo.
- CI usa `contents: read`, sem segredos de produção, sem push e sem `pull_request_target`. Não executar scripts vindos da Wiki: seus arquivos são somente dados de entrada.

## Falhas, observabilidade e operação

| Falha ou limite | Tratamento e evidência |
|---|---|
| Página, link ou fonte ausente | Reprovar verificação correspondente; registrar referência e correção necessária. |
| SHA da Wiki não acessível | Bloquear CI documental; não validar automaticamente a branch padrão no lugar do candidato. |
| Sem Docker ou configuração inválida | Distinguir pré-requisito ausente de erro do exemplo; nenhum dos casos aprova CA-003. |
| Porta ocupada em desenvolvimento | Usar ambiente isolado e portas livres; os `container_name` fixos impedem isolamento completo apenas por `-p`. Não parar contêineres de outros projetos. |
| Saúde HTTP responde, mas login ou banco falha | Reprovar roteiro funcional; saúde simples não comprova instalação utilizável. |
| SMTP indisponível | Registrar falha de integração; usar servidor de teste isolado e repetir percurso pertinente. Não afirmar entrega real de e-mail só pela configuração aceita. |
| Falha de atualização ou restauração | Preservar evidências sanitizadas; seguir limites do procedimento de banco; não aplicar testes destrutivos em produção. |
| Confirmação reservada ausente | Manter CA-009/CA-010 pendentes e impedir declaração de encerramento das issues afetadas. |

O roteiro de teste deve registrar início, configuração, saúde, primeiro acesso, troca obrigatória de senha, diagnóstico e encerramento. Executar backup com dados sintéticos, restaurar em banco isolado e conferir esquema, contagens e acesso. O procedimento final deve conter comandos concretos compatíveis com o shell declarado e com PostgreSQL 15; não usar redirecionamento binário de dump de forma incompatível com Windows PowerShell. Preferir arquivo de dump criado pela ferramenta e transferido sem conversão textual.

Não executar `docker system prune` nem remoção global de volumes. `down --volumes` deve aparecer apenas no descarte explicitamente identificado do ambiente de teste, depois do aviso de perda de dados. Encerramento normal preserva volumes.

## Compatibilidade, disponibilização e reversão

Preservar URLs dos documentos existentes, índice e páginas geradas por outros mecanismos. A nova página de arquitetura não será incluída no manifesto de publicação do manual. Revisar eventuais colisões antes de alterar `Home.md`.

Para o repositório principal, contribuições futuras partem de `origin/develop` e retornam a `develop`. A Wiki possui histórico e branch de publicação próprios; não aplicar nela mecanicamente a regra de branch da aplicação.

Fluxo de validação e publicação proposto:

1. Validar localmente o checkout candidato da Wiki com o validador e revisão semântica.
2. Identificar um commit candidato da Wiki. Quando a publicação for autorizada, disponibilizá-lo em branch de revisão do repositório Wiki, sem atualizar a branch publicada, e fixar seu SHA no manifesto do repositório principal.
3. CI lê exatamente esse commit e executa as verificações. Um manifesto sem candidato resolvível bloqueia a validação integrada, embora testes unitários do validador possam passar.
4. Publicar somente o conteúdo validado, coordenando atualizações com os publicadores de PRDs e manual. Qualquer alteração posterior do candidato exige nova validação.
5. Conferir links e renderização na Wiki publicada, registrar os dois SHAs finais e atualizar as evidências individuais antes de encerrar as issues.

Alteração direta da Wiki não dispara CI do repositório principal. A revisão local antes da publicação e o CI do candidato fixado são controles complementares. Não afirmar proteção obrigatória de branch sem verificar as configurações remotas. Branches, push, PR, publicação e encerramento das issues não são executados pela elaboração desta especificação.

Reversão documental ocorre por novo commit que restaure o conteúdo anterior válido, preservando outras edições e links. Nunca republicar credenciais removidas. Falha em código ou banco descoberta durante os testes não autoriza reversão da aplicação como parte desta entrega documental.

## Estratégia TDD e pirâmide de testes

TDD aplica-se à pequena infraestrutura de validação a criar. A redação documental usa revisão por critérios e execução de roteiros, sem testes unitários que apenas repitam frases do documento.

### RED

Criar `test_delivery_docs.py` com diretórios temporários sintéticos e repositórios Git mínimos quando necessário. Primeiro teste: uma página obrigatória ausente deve produzir falha identificável, sem imprimir seu conteúdo. Acrescentar cenários de link quebrado, nome codificado, fragmento ausente, caminho fora da raiz, SHA inexistente e regra de metadados.

Para Compose, testar extração do bloco correto, variável obrigatória ausente, interferência de variáveis do processo e classificação de Docker indisponível. Um teste com subprocesso simulado verifica tratamento e sanitização; uma execução real em CI verifica os dois exemplos. Incluir um caso negativo real sem `LABON_IMAGE_VERSION` e comprovar falha. Não capturar segredos reais para construir testes.

Para CI, adicionar contrato que falhe se faltarem gatilhos pré-merge, leitura do SHA fixado ou se forem concedidas permissões de escrita. Esses testes entram na descoberta Python já existente.

### GREEN

Implementar somente o leitor do manifesto, resolução de referências, verificações editoriais e execução sanitizada do Compose necessárias aos testes. Usar biblioteca padrão Python; não introduzir dependência nova para uma validação que possa ser feita com os mecanismos existentes. Ajustar documentos até que passem nas verificações automáticas e revisão humana. Completar o roteiro real em ambiente preparado e registrar seus resultados separadamente.

### REFACTOR

Separar leitura, validação e relatório; remover duplicação entre os testes e regras sem criar um publicador genérico. Reexecutar os testes focados, os contratos de workflow afetados e os dois exemplos após mudanças. Revisar se mensagens continuam sem valores sensíveis e se as páginas continuam canônicas na Wiki.

### Níveis de validação

- Unitários: resolução de links, manifesto, extração de exemplos, códigos de saída e sanitização do novo validador.
- Contrato/integração: arquivos reais da revisão candidata, referências Git e `docker compose config --quiet` dos dois ambientes.
- Operacionais: instalação, acesso, diagnóstico, backup/restauração e encerramento com dados sintéticos. E2E existente não substitui execução do guia.
- Humanos: semântica de arquitetura/DER, fontes de concorrentes, estados dos controles, renderização, revisão reservada e confirmação de Nathan.
- Regressão da aplicação: usar suites existentes se houver alteração incidental de configuração executável; mudanças funcionais ficam fora do escopo e exigem tratamento separado.

## Esteira de qualidade

Comandos abaixo partem da raiz, exceto quando indicado. “Planejado” significa que o comando depende de arquivo a criar, não que já foi executado.

| Área | Comando local | Verificação de CI | Lacuna/ação |
|---|---|---|---|
| Backend | `dotnet restore backend/backend.sln`; `dotnet build backend/backend.sln --no-restore -c Release --nologo --disable-build-servers`; `dotnet test backend/backend.sln --no-build --no-restore -c Release --nologo --disable-build-servers` | `container-ci.yml`, PR para `develop`, `merge_group`, manual. | Já existe; usar SDK 8.0.419 e Docker para testes que exigem PostgreSQL. Não executado nesta especificação. |
| Frontend | Em `frontend`: `npm ci`; `npm run test -- --run`; `npm run lint`; `npm run build` | Mesmo fluxo, job `frontend-quality`. | Já existe; Node 20 no job atual. Não exigir migração da máquina local para redigir documentos. |
| E2E | `docker compose -f docker-compose-e2e.yml up -d --build --wait`; em `frontend`, `npm run test:e2e` após instalar Chromium com `npx --no-install playwright install --with-deps chromium` | Job `auth-e2e` instala dependências e encerra a stack sintética. | Já existe, mas não comprova os exemplos dev/prod do guia. |
| Contratos Python | `python -m unittest discover -s .github/scripts/tests -p "test_*.py" -v` | Job `workflow-quality`; Python 3.12.14 e PyYAML 6.0.3, além das ferramentas usadas por outros testes. | Acrescentar testes novos à convenção existente. |
| Manual existente | `python .github/scripts/check_manual.py --source docs/manual` | Job `workflow-quality`, antes do merge. | Não cobre os documentos institucionais da entrega. Preservar seu contrato. |
| Novos testes documentais | `python -m unittest discover -s .github/scripts/tests -p "test_delivery_docs.py" -v` | Planejado em `documentation-quality.yml`; também descoberto pelo job existente. | Criar testes e implementação mínima. |
| Wiki candidata e exemplos | Comandos `check_delivery_docs.py` definidos na seção de contratos, modos `editorial` e `compose`. | Planejado: checkout somente leitura do SHA da Wiki fixado no manifesto e Docker disponível. | Criar workflow; sem SHA acessível, declarar bloqueio, não sucesso parcial da entrega. |
| CodeQL | Análise gerida por `.github/workflows/codeql-quality.yml`. | PR para `develop`, push em `develop`, `merge_group` e manual. | Não substitui revisão de controles ou confirmação do Dependabot. |
| Dependências | Comandos e filtros de `.github/workflows/security-dependencies.yml`. | PR para `develop` com filtros de caminhos; `merge_group` e manual. | PR somente documental pode não disparar o fluxo. Verificação de Nathan permanece independente. |
| Publicação de PRDs | `.github/scripts/sync_prds_to_wiki.py`, chamado pelo workflow existente. | Push em `develop` nos caminhos de specs/script/workflow; manual. | Pós-integração, sem papel de gate pré-merge da Wiki. |
| Release | `.github/workflows/container-release.yml`. | PR fechado e integrado em `main`, ou manual. | Pós-merge; não contar como validação prévia da documentação. |

O novo workflow terá `pull_request` para `develop` nos eventos `opened`, `synchronize`, `reopened` e `ready_for_review`, além de `merge_group` e `workflow_dispatch`. Monitorar manifesto, scripts/testes, procedimentos e Compose relevantes; evitar filtros que deixem uma checagem requerida permanentemente pendente. Preferir execução curta sem filtro de caminhos na versão inicial. Fixar ações por SHA como nos fluxos de qualidade existentes, Python 3.12.14 e Compose conforme o padrão já adotado pelo projeto. Não disponibilizar token com escrita nem publicar como efeito dos testes.

Para uma futura contribuição, verificar quais checks são obrigatórios na proteção de `develop` e integrar a nova checagem ao processo existente quando necessário. A existência do YAML, isoladamente, não prova que o merge é bloqueado.

## Matriz de rastreabilidade

| Requisito | Componentes | Testes e critérios | Evidência |
|---|---|---|---|
| RF-001 | Página de arquitetura; Compose, Caddy, Program e integrações como fontes. | Revisão semântica e visual; CA-001. | Diagrama, explicação e SHA da aplicação. |
| RF-002 | DER e dicionário; contexto, modelos e snapshot. | Conferência de tabelas, herança, chaves e nulabilidade; CA-002. | Matriz fonte → elemento documentado. |
| RF-003 | Guia Docker e blocos sintéticos. | Validador Compose e instalação real; CA-003, CA-004, CA-005. | Resultados dos dois exemplos e roteiro de instalação. |
| RF-004 | Guia Docker, OCI e migrações. | Teste operacional de diagnóstico e recuperação; CA-004, CA-006. | Backup restaurado, verificações sanitizadas e limites descritos. |
| RF-005 | Visão e concorrência. | Revisão de equipe, fontes e estados; CA-007. | Datas e fontes verificáveis. |
| RF-006 | Ameaças e guia seguro. | Revisão de controles e confirmação reservada; CA-008, CA-009. | Matriz de controles e conclusão de Nathan. |
| RF-007 | Exemplos, provisionamento, inventário e evidências. | Revisão de primeiro acesso, padrões e confirmação humana; CA-005, CA-010, CA-011. | Exemplos sintéticos e conclusão reservada, sem achados brutos. |
| RF-008 | Home, inventário, manifesto e validação. | Navegação, reconciliação e revisão de estados; CA-009, CA-011, CA-012. | Índice funcional, itens consolidados e matriz de aceite. |
| RNF-001 | Todos os exemplos e relatórios. | Testes de sanitização e revisão humana; CA-003, CA-010. | Ausência de conteúdo sensível nos artefatos publicados. |
| RNF-002 | Metadados, fontes e evidências. | Validador e revisão semântica; CA-001, CA-002, CA-007, CA-008, CA-012. | Datas, SHAs e links rastreáveis. |
| RNF-003 | Markdown, diagramas e índice. | Revisão textual/visual e links; CA-001, CA-002, CA-012. | Explicações acessíveis e navegação conferida. |

CA-001 a CA-012 estão todos cobertos. O resultado de cada critério deve ser registrado individualmente em `validacao.md`; testes mecânicos não encerram critérios que dependem de confirmação humana.

## Alternativas e decisões

| Decisão | Alternativas | Recomendação | Escolha confirmada | Consequências |
|---|---|---|---|---|
| Fonte documental | Wiki ou coleção nova em `docs/`. | Preservar Wiki e procedimentos existentes. | Confirmada pelo usuário no PRD. | Sem duplicação do acervo. |
| Responsabilidade reservada | Nathan ou outro operador indicado. | Nathan. | Confirmada pelo usuário no PRD. | Verificações continuam pendentes até conclusão efetiva. |
| Diagramas | Mermaid ou imagens mantidas separadamente. | Mermaid com texto explicativo. | Decisão técnica desta especificação. | Diferenças revisáveis; inspeção visual continua necessária. |
| Validação documental | Adaptar contrato do manual ou criar leitor pequeno específico. | Validador separado reutilizando Python/unittest existentes. | Decisão técnica desta especificação. | Preserva o manual e limita a automação ao contrato da entrega. |
| Wiki no CI | Ler branch variável ou commit candidato fixado. | SHA fixado, com validação local anterior à disponibilização. | Decisão técnica desta especificação. | Evita validar uma revisão diferente da publicada; exige coordenação entre repositórios. |
| TDD | Criar testes de frases ou testar a infraestrutura e executar roteiros. | Testar o validador; conferir conteúdo semanticamente. | Coerente com o PRD aprovado. | Não cria testes artificiais de prosa. |

Nenhuma decisão altera a arquitetura do produto ou reabre a descoberta confirmada. As escolhas técnicas são reversíveis e seguem os padrões existentes; não há motivo para uma nova rodada de aprovação de design.

## Riscos e mitigação

- Candidato da Wiki divergir da publicação: fixar SHA, coordenar publicadores e conferir o conteúdo publicado.
- Exemplos válidos no Compose falharem na aplicação: executar primeiro acesso e diagnóstico com dados sintéticos, além da validação estrutural.
- DER confundir classes e tabelas: usar snapshot e conferir discriminadores e relações opcionais.
- Detector produzir falso negativo: manter revisão reservada humana, sem afirmar garantia baseada em expressões regulares.
- Prazo ser consumido por preparação de ambiente: iniciar disponibilidade de Docker, imagens e ambiente de teste na primeira etapa; não reduzir critérios silenciosamente.
- Guia repetir capacidades futuras: exigir evidência por afirmação, especialmente em visão, concorrência e segurança.
- Correção documental tentar reparar código ou produção: registrar achado separado e seu impacto no aceite, sem ampliar a implementação deste plano.

## Perguntas abertas

Não há decisão técnica bloqueante para decompor esta especificação. São pré-requisitos da execução: definir o ambiente isolado de teste; conferir disponibilidade dos SHAs e artefatos anteriores; preparar as ferramentas compatíveis; identificar uma versão de imagem testável; e obter as conclusões de Nathan.

## Evidências desta elaboração

O PRD foi lido integralmente e sua descoberta está confirmada. Foram inspecionados manifestos, solução .NET, workflows, validadores existentes, contexto e snapshot EF, inicialização, seed, proxy e configuração do frontend. Foram consultadas versões locais de ferramentas e referências Git. Não foram executados testes da aplicação, Compose, instalação, recuperação, revisão de credenciais nem confirmação do Dependabot. Nenhuma página da Wiki ou código de produção foi alterado nesta etapa.
