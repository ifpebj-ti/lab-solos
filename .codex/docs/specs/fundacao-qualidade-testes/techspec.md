# Especificação técnica: Fundação de qualidade e testes críticos

- Status: pronta para decomposição em tarefas
- PRD: `./prd.md`
- Atualizado em: 2026-09-14
- Validação de descoberta: confirmada no PRD
- Validação de design: desnecessária para a fundação; aproveitamento da arquitetura e das ferramentas existentes, sem nova plataforma ou serviço externo
- Referência da inspeção: `a58cc224c2e6a327434674a0de0585adc62219a2`, com alterações locais preexistentes em artefatos de compilação
- Issues relacionadas: #227 e #237

## Resumo técnico

Consolidar a infraestrutura existente em uma fundação reproduzível de testes e análise estática. Ampliar a cobertura de cadastro/aprovação e empréstimos, conservar a proteção de autenticação e credenciais, produzir inventário de manutenibilidade/confiabilidade por módulo e impedir regressões antes do merge em `develop`.

O diagnóstico histórico do PRD foi superado parcialmente por iniciativas anteriores: não é necessário reinstalar Vitest, Testing Library ou Playwright, incluir novamente o projeto xUnit na solução ou criar uma segunda esteira de aplicação. O trabalho restante deve ampliar `.github/workflows/container-ci.yml`, aproveitar PostgreSQL/Testcontainers e a composição E2E, fixar o ambiente de execução e acrescentar política e relatórios de qualidade.

A conclusão da implementação exige casos críticos positivos e negativos, inventário sem achados altos abertos, pendências identificadas para médios/baixos e evidência de verificações obrigatórias em `develop`. Um achado alto ainda sem correção pode ser registrado, mas deve bloquear a conclusão, conforme CA-002. Este documento não declara os critérios do produto já cumpridos.

## Estado atual

### Infraestrutura e cobertura

| Área | Evidência no repositório | Consequência para esta iniciativa |
|---|---|---|
| Backend | `backend/backend.sln` inclui aplicação e `Tests/Tests.csproj`; ambos usam `net8.0` | Conservar e verificar descoberta de testes pela solução |
| Testes backend | xUnit, Moq, EF Core InMemory, `Microsoft.AspNetCore.Mvc.Testing` e `Testcontainers.PostgreSql` | InMemory permanece para unidades simples; persistência, autorização HTTP e transações exigem PostgreSQL |
| Infraestrutura backend | `PostgreSqlContainerFixture`, `IntegrationWebApplicationFactory`, `ControlledTimeProvider` e coleção `PostgreSQL integration` | Reutilizar isolamento e relógio; o reset de esquema exige execução serial dentro da coleção |
| Autenticação e dados | Testes em `Tests/Security`, `Tests/Controllers`, `Tests/Integration`, `Tests/Contracts` e `Tests/Data` | Mapear cenários existentes antes de adicionar testes equivalentes |
| Empréstimos | Há testes de leitura/autorização em `PostAuthenticationNavigationTests` e de contratos frontend | Faltam evidências equivalentes de criação, aprovação/rejeição e efeitos persistidos no estoque |
| Frontend | React 18, TypeScript, Vite, Vitest, Testing Library, jsdom e MSW; scripts `test`, `test:e2e` e `test:e2e:list` | A infraestrutura básica já está disponível |
| Isolamento frontend | `src/test/setup.ts` inicia MSW com `onUnhandledRequest: 'error'`, limpa DOM, restaura mocks e reinicia handlers | Preservar; estender restauração de relógios quando novos testes usarem temporizadores falsos |
| Playwright | Chromium, 201 casos descobertos; inclui testes com `page.route` e casos que usam API real | Distinguir cobertura de interface simulada de E2E integrado; contagem não comprova jornadas completas |
| Ambiente E2E | `docker-compose-e2e.yml` sobe frontend, API, PostgreSQL e Mailpit com dados sintéticos | Reutilizar, corrigindo compartilhamento de estado e fixação de imagens |
| CI | `container-ci.yml` executa em PR para `develop`: `opened`, `synchronize`, `reopened`; também `workflow_dispatch` | Já é pré-merge; manter execução sem filtro de caminhos para os trabalhos obrigatórios |
| Trabalhos existentes | `Frontend quality`, `Backend quality`, `Authentication E2E`, `Workflow contracts` e varredura de contêineres | O trabalho denominado autenticação já executa toda a suíte Playwright |
| Segurança de dependências | `security-dependencies.yml` possui auditorias próprias e filtro de caminhos | Preservar; auditoria de vulnerabilidades não substitui análise de qualidade do código |
| Versões | npm possui lockfile; NuGet fixa referências diretas, mas não possui `packages.lock.json`; não há `global.json` nem arquivo de versão Node | RNF-001 ainda tem lacunas; CI usa `20`, `8.0.x`, `3.12` e `ubuntu-latest` |
| Determinismo | `vite.config.ts` consulta a última release no GitHub e usa a hora atual; Testcontainers usa `postgres:16-alpine` e Compose usa `postgres:15-alpine` | Remover dependência de rede dos testes e fixar entradas e imagens, preservando os dois ambientes até comprovar compatibilidade |

Não foi encontrado `AGENTS.md` no repositório. Foram consultados `CONTRIBUTING.md`, o PRD integral e o template da skill. As referências históricas da skill sobre quatro testes, ausência de executor frontend e workflows em PR fechado não descrevem mais este checkout.

### Verificações executadas nesta elaboração

Ambiente observado: Windows, Node `24.14.0`, npm `11.9.0`, SDK .NET `8.0.419`, Python `3.14.3` e Docker Engine `29.7.2`. Esses resultados não comprovam equivalência com as versões atualmente usadas pelo CI.

| Verificação | Resultado observado |
|---|---|
| `dotnet test backend/backend.sln --artifacts-path D:/lab-solos/.tmp/techspec-fundacao/backend -c Release --nologo --disable-build-servers --logger 'trx;LogFileName=baseline.trx' --results-directory D:/lab-solos/.tmp/techspec-fundacao/test-results` | 125 aprovados, zero falhas, zero ignorados; duração da suíte de aproximadamente 64 segundos; dois avisos `CS8604` em `ProdutoMappingProfile.cs` |
| Em `frontend`: `npx --no-install eslint src --format json --output-file ../.tmp/techspec-fundacao/eslint.json` | 322 arquivos, zero erros e zero avisos; substitui a contagem histórica de 21.845 avisos para esta configuração |
| Em `frontend`: `npm run build` | Aprovado; avisos sobre `/env.js`, referência a `laboratory.png` e tamanho de pacote JavaScript |
| Em `frontend`: `npm run test -- --run src/pages/Login.test.tsx src/pages/CreateAccount.test.tsx src/contracts/loan.test.ts src/pages/ChangePassword.test.tsx src/pages/ResetPassword.test.tsx --reporter=json --outputFile=../.tmp/techspec-fundacao/vitest-criticos.json` | 21 aprovados, zero falhas e zero ignorados no recorte com relatório persistido |
| Em `frontend`: `npm run test:e2e:list` | 201 casos em sete arquivos; somente descoberta, sem execução de navegador nesta elaboração |
| `python -m unittest discover -s .github/scripts/tests -p 'test_*.py' -q` | 240 casos, zero falhas, dois ignorados; casos ignorados precisam de execução em Linux antes de atestar cobertura integral |

Os relatórios brutos desta inspeção estão em `.tmp/techspec-fundacao/`, sem integrar a documentação versionada. Não foram realizados PR de prova, consulta/configuração de proteção remota, varredura de imagens ou execução integral E2E. As evidências finais deverão registrar SHA, ambiente, comandos, resultados e limitações em `evidencias/` deste slug.

### Achados candidatos para a primeira coleta

Estes itens são hipóteses sustentadas pela leitura ou avisos observados; não constituem um inventário concluído nem atribuição automática de severidade.

- **QC-001 — devolução:** `EmprestimosController.Adicionar` preenche `DataDevolucao` com a data prevista; `DevolverEmprestimo` rejeita qualquer empréstimo com esse campo preenchido como já devolvido. `NotificacaoService` também usa o campo nulo para identificar não devolvidos. Reproduzir a sequência criar → aprovar → devolver em PostgreSQL e registrar o impacto. Não corrigir eliminando a data prevista ou relaxando a prevenção de devolução duplicada sem definir o contrato de dados.
- **QC-002 — aprovação por responsável:** aprovação/rejeição de dependentes compara `ResponsavelId` com `AprovadorId` do corpo, sem comparação explícita com o sujeito autenticado nesses métodos. Testar responsável A enviando o ID de B. Se houver alteração indevida, o achado é alto e sua correção deve vincular a decisão às claims, preservando o vínculo de responsabilidade.
- **QC-003 — criação pública de administrador:** `Forbid` recebe texto como argumento na tentativa de cadastro de administrador. Reproduzir por HTTP real, pois o comportamento do middleware não é coberto por mera inspeção de `IActionResult`; exigir recusa controlada sem criar conta privilegiada.
- **QC-004 — mapeamento de produtos:** dois `CS8604` em chamadas a `DateTime.Parse`; testar valores ausentes/malformados antes de escolher correção e prioridade. Não usar operador de supressão de nulidade como remediação automática.
- **QC-005 — isolamento E2E:** o ciclo de credenciais altera a conta administrativa do seed e limpa toda a caixa do Mailpit; `fullyParallel: true` permite concorrência local e os retries podem reaproveitar estado alterado. Um único worker no CI não torna retries independentes.
- **QC-006 — recursos frontend:** comprovar impacto dos avisos de imagem e tamanho de pacote em cenários reais. Aviso de compilação não equivale automaticamente a falha alta nem autoriza refatoração geral.

## Arquitetura proposta

### Componentes e limites de alteração

| Componente | Caminhos existentes ou planejados | Responsabilidade |
|---|---|---|
| Suíte crítica backend | `backend/Tests/Controllers/`, `Integration/`, `Security/`, `Infrastructure/` | Contratos, autorização HTTP, persistência e casos de erro; ampliar os testes existentes |
| Suíte crítica frontend | `frontend/src/pages/`, `src/integration/`, `src/contracts/`, `src/test/` | Interação, validação, feedback e contratos com MSW/Testing Library |
| Jornadas reais | `frontend/e2e/critical/` e `frontend/e2e/infra/` | Cadastro/aprovação, credenciais e empréstimos com API real, isolamento por cenário e limpeza |
| Política estática frontend | Novo `frontend/eslint.quality.config.js`, estendendo `eslint.config.js` | Acrescentar sinais de complexidade sem enfraquecer o lint existente |
| Política estática backend | Novos `backend/Directory.Build.props`, `backend/Directory.Build.targets` e configuração de analisadores em `backend/.editorconfig` | Fixar análise .NET, habilitar regras selecionadas e gerar SARIF separado por projeto |
| Coleta e bloqueio | Novos `.github/scripts/quality_baseline.py` e `.github/scripts/tests/test_quality_baseline.py` | Executar ferramentas locais, normalizar relatórios, comparar linha de base e aplicar política |
| Configuração versionada | Novos `.github/quality/policy.json`, `.github/quality/baseline.json`, `.github/quality/toolchain.json` e `.github/quality/requirements.txt` | Regras, módulos, versões, exceções verificáveis e dependências Python usadas no CI |
| Inventário humano | Novos `inventario.md`, `pendencias.md` e registros em `evidencias/` neste slug | Priorização, reprodução, responsável e fechamento dos achados |
| Integração | `.github/workflows/container-ci.yml`, manifestos, arquivos de bloqueio, Dockerfiles e `docker-compose-e2e.yml` | Aplicar as mesmas entradas e comandos localmente e no CI |

Os arquivos planejados não existem por efeito desta especificação. Mudanças de produção ficam limitadas a correções com achado e teste demonstráveis; não se propõe reorganização global de controladores, substituição de ORM ou redesenho de navegação.

### Análise estática e classificação

Usar ESLint/TypeScript e os analisadores .NET entregues pelo SDK fixado. Não introduzir servidor SonarQube, conta externa ou dependência de serviço pago. Os termos manutenibilidade e confiabilidade representam categorias do inventário; não serão apresentados como notas ou índices Sonar.

O coletor frontend deve reutilizar todas as regras atuais e acrescentar `complexity` com limite 20 e `max-depth` com limite 4, inicialmente como avisos na configuração adicional. `npm run lint` continua com `--max-warnings=0` e a configuração atual. O novo coletor não deve tornar aceitável uma falha desse comando. ESLint permite saída JSON por `--format` e arquivo por `--output-file`. [Referência oficial do ESLint](https://eslint.org/docs/latest/use/command-line-interface).

No backend, fixar `AnalysisLevel` em `8.0`, habilitar o conjunto recomendado e regras explícitas pertinentes, incluindo `CA1502` para complexidade, além dos diagnósticos do compilador. Preservar avisos de nulidade. Registrar os IDs e configurações efetivamente habilitados na política; a implementação deve verificar a disponibilidade de cada regra no SDK escolhido. Usar `ErrorLog` com SARIF 2.1 em caminho distinto para aplicação e testes, definido por projeto nos targets, evitando disputa de escrita na compilação da solução. [Configuração oficial dos analisadores](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/configuration-options) e [saída SARIF do compilador](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-options/errors-warnings#errorlog).

| Classificação | Regra operacional |
|---|---|
| Alta | Erro de compilação/análise que impede validação; erro do lint obrigatório; defeito reproduzido que impede jornada crítica, permite acesso indevido ou corrompe estado persistido |
| Média | Aviso de confiabilidade sem impacto alto comprovado; complexidade ou profundidade acima dos limites; risco de nulidade ainda sem cenário de impacto demonstrado |
| Baixa | Diagnóstico de organização/estilo ou custo de manutenção sem falha funcional demonstrada |

A política deve mapear cada regra a categoria/severidade e conservar a severidade original da ferramenta. Regra desconhecida bloqueia classificação; não será descartada. Resultado de teste funcional pode elevar prioridade com evidência identificada. Complexidade, quantidade de avisos ou percentual de cobertura isolados não comprovam confiabilidade.

O inventário cobre código próprio da aplicação e dos testes. `policy.json` define módulos por prefixos: backend autenticação/credenciais, usuários/aprovação, empréstimos/estoque, compartilhado e testes; frontend autenticação, cadastro/aprovação, empréstimos, compartilhado, demais páginas e testes; automação em módulo próprio. A correspondência mais específica prevalece. Arquivo próprio sem módulo definido é erro de configuração, não exclusão silenciosa. Excluir dependências, `bin`, `obj`, `dist`, relatórios e arquivos gerados identificáveis; registrar cada exclusão. Código de migração escrito manualmente continua no escopo; snapshots gerados são identificados separadamente.

### Fixação e reprodutibilidade

1. Fixar SDK .NET em `global.json`, sem roll-forward automático, e versionar `packages.lock.json` de ambos os projetos. Restaurar com `--locked-mode` após a geração inicial dos locks.
2. Fixar Node/npm e Python com versões completas em `toolchain.json`, refletindo Node também em `frontend/.node-version` e npm em `packageManager`. A primeira implementação deve resolver e registrar patches compatíveis das linhas atualmente usadas pelo CI: Node 20, SDK .NET 8 e Python 3.12. Não migrar major apenas para copiar o ambiente local desta inspeção. Verificar `engines` de todas as dependências e executar as suítes antes de aceitar a combinação; incompatibilidade deve aparecer como impedimento, nunca como versão presumida válida.
3. `toolchain.json` deve registrar também versão do Docker/Compose validada, imagens por digest e versão do Chromium associada ao Playwright no lockfile. Verificar versões no início dos jobs. Fixar o sistema do runner e registrar a revisão efetiva; atualizações da imagem hospedada exigem rastreabilidade, não promessa de sistema operacional idêntico ao Windows local.
4. Fixar imagens utilizadas na validação, inclusive PostgreSQL 15 do Compose e 16 da fixture, sem alinhar majors neste escopo. A matriz atual proporciona evidência nos dois provedores. Atualizar os Dockerfiles para consumir os pins e copiar os arquivos de lock/propriedades necessários antes de `restore`/`npm ci`, preservando a esteira de segurança e release.
5. Em `vite.config.ts`, usar metadados determinísticos no modo de teste e entradas explícitas de versão/SHA/data no build do CI e E2E. O carregamento da configuração de teste não deve consultar a última release nem depender de relógio real. Preservar a experiência de versão da aplicação fora do teste com entradas de build controladas.
6. O mesmo comando de coleta deve funcionar em Windows e Linux, chamando subprocessos com lista de argumentos, sem depender de redirecionamentos específicos de shell. Reprodutibilidade significa resultados e política equivalentes com entradas registradas; não se exige identidade binária entre sistemas operacionais distintos.

## Fluxos e componentes

### Matriz mínima de cenários críticos

Cada identificador representa um comportamento, não uma obrigação de duplicar o mesmo teste em todas as camadas. Reutilizar cenários já implementados e apontar seus nomes no inventário de cobertura.

| Cenário | Caminho positivo | Caminho negativo e invariantes | Camadas necessárias |
|---|---|---|---|
| CT-001 — autenticação | Usuário habilitado recebe sessão e destino correspondente ao perfil | Credenciais incorretas, usuário pendente/desabilitado, sessão revogada; recusa sem sessão residual | xUnit HTTP, Vitest/RTL e jornada real Playwright |
| CT-002 — cadastro | Conta válida é criada pendente, com contrato normalizado | Campo inválido, senha inválida e tentativa de privilégio; nenhum registro indevido e erro acionável | xUnit de validação/HTTP, Vitest/RTL e Playwright real |
| CT-003 — aprovação/rejeição | Administrador ou responsável autorizado processa solicitação pendente e a lista reflete o resultado | Anônimo, perfil proibido, responsável de outra conta, ID inexistente e solicitação já processada; recusa não altera estado | xUnit HTTP/PostgreSQL, Vitest/RTL em `RegistrationRequests` e Playwright real |
| CT-004 — recuperação | Solicitação neutra, e-mail sintético, token válido redefine senha e revoga sessões | Conta inexistente mantém resposta neutra; token inválido/expirado/reutilizado e senha inválida não alteram credenciais | xUnit com relógio controlado, Vitest/RTL e Playwright real com Mailpit |
| CT-005 — troca de senha | Primeiro acesso e troca voluntária terminam com credencial nova e revogação anterior | Senha atual incorreta, confirmação divergente, senha recusada e acesso funcional antes da troca obrigatória | Reutilizar xUnit, Vitest/RTL e ciclo real existente após isolamento |
| CT-006 — solicitação de empréstimo | Usuário permitido cria empréstimo vinculado ao sujeito da sessão | Anônimo e administrador recebem recusa controlada; erro de API não apresenta sucesso nem duplica envio | xUnit HTTP/PostgreSQL, Vitest/RTL e Playwright real |
| CT-007 — aprovação de empréstimo | Administrador aprova pendência, associa aprovador e reduz estoque uma vez | Perfil proibido, ID ausente, estoque insuficiente e reprocessamento; verificar banco com contexto novo para comprovar ausência de alteração parcial | xUnit HTTP/PostgreSQL, Vitest/RTL em `LoansRequest` e Playwright real |
| CT-008 — rejeição de empréstimo | Pendência torna-se rejeitada sem baixar estoque | Reprocessamento e perfil proibido não alteram empréstimo/produtos | xUnit HTTP/PostgreSQL e Vitest/RTL; pode compartilhar a preparação da jornada real de empréstimos |
| CT-009 — devolução e data | Reproduzir o contrato atualmente acessível e a inconsistência QC-001 | Uma recusa não pode alterar estoque; não mascarar impossibilidade de devolver com fixture que remove artificialmente a data prevista | Teste de reprodução PostgreSQL e registro de achado; correção de semântica depende do tratamento descrito em Dados e migrações |

O conjunto mínimo E2E real concentra-se em autenticação, cadastro/aprovação, recuperação/troca e solicitação/aprovação/rejeição de empréstimo. Não retirar os testes existentes de navegação e responsividade. CT-009 integra a avaliação de qualidade; confirmar QC-001 como alto impede declarar CA-002 atendido enquanto não houver solução validada.

### Isolamento dos testes

- Backend: todos os casos que recriam o esquema compartilham a coleção serial existente; outras unidades continuam paralelas. Dados relacionais devem ser criados com IDs/nomes previsíveis por cenário, em banco descartável. Confirmar efeitos após uma nova consulta/contexto. `EnsureCreated` da factory não substitui os testes de migração existentes.
- Relógio: reutilizar `ControlledTimeProvider` em credenciais; quando a correção exigir determinismo temporal em outro componente, injetar `TimeProvider` apenas nele e testar os limites relevantes. Não usar pausas fixas para expiração.
- Frontend: handlers MSW por caso, restauração de cookies/storage e de temporizadores, sem requisições de rede não tratadas; simular 400, 401, 403, 404, falha de rede e falha do servidor somente onde o contrato/jornada os exige.
- Playwright: separar explicitamente jornadas reais e testes de UI com rotas simuladas por projeto/configuração ou etiquetas. Casos marcados como reais não podem interceptar endpoints do domínio com `route.fulfill`.
- Cada cenário real recebe contas, produtos e solicitações próprios, inclusive nova tentativa. Uma preparação de teste deve criar o administrador do cenário via mecanismo restrito ao banco sintético, sem endpoint novo na aplicação. Usar o hash de senha produzido pelo serviço existente e não armazenar senha de produção.
- Migrar o ciclo de credenciais para conta própria, removendo a dependência de alterar a conta global do seed. Selecionar mensagens do Mailpit pelo destinatário do cenário, sem apagar a caixa global. Evitar dependência da ordem entre arquivos.
- O projeto real deve inicialmente usar um worker e zero retries para tornar falhas visíveis. Paralelismo entre trabalhos de CI permanece; ampliar workers da jornada real somente depois de provar isolamento. Testes simulados podem continuar paralelos. A validação final deve repetir a suíte crítica em ambiente novo e reexecutar cenário isolado no mesmo ambiente, comprovando que a preparação não depende da primeira execução.

## Contratos e APIs

### Contratos de aplicação preservados

| Operação | Contrato conhecido e asserções |
|---|---|
| `POST /api/Auth/login` | Entrada `email`/`password`; 200 com `token` e `requiresPasswordChange`; 401 genérico para credenciais inválidas ou usuário não habilitado |
| `POST /api/Usuarios` | `AddUsuarioDTO`; 201 com `UsuarioDTO` pendente; validações de dados/senha retornam 400, com `ValidationProblemDetails` nos casos já padronizados |
| `PATCH /api/Usuarios/{usuarioId}/aprovar` e `/rejeitar` | Política `ApenasAdministradores`; 200 no sucesso, 404 para inexistente e 400 para já processado; caracterizar também o corpo da rejeição quanto a exposição de dados |
| `PATCH /api/Usuarios/dependentes/{dependenteId}/aprovar` e `/rejeitar` | Política `ApenasResponsaveis`; corpo atual `AprovarDTO`; responsável autenticado deve corresponder ao vínculo do dependente, independentemente do ID enviado no corpo |
| `POST /api/Email/request-password-reset` | Resposta 202 neutra; envio observado apenas no Mailpit e para conta sintética; preservar aliases existentes |
| `POST /api/Email/reset-password` | Campos `email`, `code`, `newPassword`, `confirmation`; 204 no sucesso, validação/conflito conforme testes existentes; token não reutilizável |
| `POST /api/Auth/change-password` | Campos `currentPassword`, `newPassword`, `confirmation`; 204 no sucesso, 400 de validação e 409 de concorrência conforme contrato existente |
| `POST /api/Emprestimos` | `diasParaDevolucao`, `produtos: [{ produtoId, quantidade }]`; 201 no sucesso; solicitante obtido da sessão; a recusa atual de administrador no controlador é 401 e deve ser caracterizada sem padronização global de status |
| `PATCH /api/Emprestimos/aprovar/{emprestimoId}` e `/reprovar/{emprestimoId}` | Política administrativa; 204 no sucesso, 404 para ausente e 400 para estado inválido/estoque insuficiente na aprovação |
| `PATCH /api/Emprestimos/devolver/{emprestimoId}` | Contrato atual de data inconsistente; CT-009 registra comportamento e impede ocultar QC-001 |

Asserções de autorização devem passar pelo middleware HTTP: ausência de autenticação e negação de política não são comprovadas chamando o controlador diretamente. Não uniformizar todos os retornos legados para `ProblemDetails` nesta iniciativa. Se um achado exigir correção, definir o retorno esperado no teste e verificar os consumidores afetados.

### Contrato do coletor de qualidade

Interface planejada, executada da raiz:

```text
python .github/scripts/quality_baseline.py collect --output .tmp/quality/current.json
python .github/scripts/quality_baseline.py check --current .tmp/quality/current.json --base-ref origin/develop
python .github/scripts/quality_baseline.py render --current .tmp/quality/current.json --output .codex/docs/specs/fundacao-qualidade-testes/inventario.md
```

`collect` executa a configuração ESLint adicional, compilação/análise backend com reconstrução e saída SARIF por projeto, e incorpora achados funcionais registrados com evidências. Captura versão/configuração, stdout/stderr e código de saída de cada produtor. Um produtor com achados pode gerar relatório válido, mas instalação ausente, parser quebrado, compilação incompleta ou relatório faltante nunca pode resultar em inventário verde. Não ler saída antiga após uma execução falha: diretório novo por execução e identificação única em cada relatório.

`current.json` contém `schemaVersion`, `sourceSha`, `dirty`, `toolchain`, `policyHash`, `generatedAt`, `producers` e `findings`. Cada achado contém `id`, `fingerprint`, `module`, `category`, `severity`, `originalSeverity`, `tool`, `ruleId`, `path`, `line`, `message`, `evidence`, `status` e, para pendências, `backlogId`/`owner`.

Categorias: `manutenibilidade`, `confiabilidade` e `seguranca` quando houver achado funcional de autorização; auditorias CVE continuam na política própria. Severidades: `alta`, `media`, `baixa`. Estados: `aberto`, `corrigido`, `falso-positivo`. IDs de regras e campos técnicos permanecem estáveis; títulos e conteúdo humano são em português.

O fingerprint combina ferramenta, regra, caminho relativo normalizado e contexto de código normalizado; linha absoluta não é a identidade. Duplicatas no mesmo contexto preservam multiplicidade. O algoritmo e sua versão fazem parte do esquema, com testes para deslocamento de linhas, repetição do mesmo achado e remoção de um achado seguida por inclusão de outro. SHA, horário e caminhos absolutos da máquina não integram a comparação de achados.

`check` retorna 0 somente com coleta completa, política válida, nenhum alto aberto e nenhum achado novo de qualquer severidade. Retorna 1 para violação de qualidade e 2 para falha operacional/configuração. Médios/baixos históricos somente são tolerados quando identificados individualmente e associados a pendência rastreável. Falso positivo exige justificativa, evidência e correspondência exata com a ocorrência; não aceita exclusão genérica de regra para encobrir defeito.

A comparação lê `baseline.json` e a política da revisão base confiável, não apenas a cópia modificável do PR. No CI, passar o SHA de base do evento como valor de `--base-ref`; localmente `origin/develop` deve existir e sua revisão deve ser registrada. Revisão ausente causa erro explícito. Não fazer fetch ou sobrescrever linha de base silenciosamente.

Na implantação inicial, coletar a mesma política sobre checkout isolado da revisão base para distinguir dívida existente de nova dívida. O baseline candidato deve representar apenas achados históricos médios/baixos, com justificativa e pendência; achados altos nunca são aceitos nele. Mudança posterior de política/fingerprint exige comparação das duas revisões sob a nova configuração e revisão explícita das diferenças. O CI não aprova inclusão de dívida por simples edição do JSON no mesmo PR. `render` gera visão humana; não altera baseline nem fecha pendências automaticamente.

## Dados e migrações

Não há migração de banco inerente à implantação de ferramentas, relatórios e testes. Persistência de qualidade usa arquivos versionados e artefatos de CI; nenhum registro de diagnóstico será gravado no banco da aplicação.

Dados de teste devem ser sintéticos, descartáveis e independentes dos IDs do banco real. A preparação E2E deve recusar execução quando não reconhecer o ambiente e o banco de testes; redefinição de esquema nunca pode receber conexão de produção. A fixture PostgreSQL já existe e deve manter limpeza limitada ao contêiner criado pelo teste.

QC-001 pode exigir separar data prevista de data efetiva. Essa alteração tem impacto em dados legados, DTOs, notificações e telas, portanto não será inventada como detalhe de infraestrutura. A primeira tarefa de caracterização deve registrar o achado e, se confirmado alto, mantê-lo bloqueando a conclusão até que seu contrato, migração e reversão sejam definidos em especificação complementar. Não há autorização neste documento para migrar valores ambíguos, interpretar silenciosamente datas históricas ou chamar uma devolução impossível de cenário aprovado.

Esse tratamento decorre de CA-002, que permite altos explicitamente bloqueantes; não reabre decisões de descoberta nem impede decompor as tarefas independentes da fundação. A correção desse achado tem dependência explícita da definição complementar, caso necessária.

## Segurança, privacidade e permissões

- Usar apenas contas `example.invalid`, senhas sintéticas, chaves JWT de teste e Mailpit. Não usar serviços SMTP reais nem dados exportados de usuários.
- Não adicionar endpoint de seed/reset à API de produção; preparar dados pelo mecanismo de teste e rede/contêiner isolados. Bind de portas publicadas para uso local deve ficar em loopback.
- Verificar claims reais, políticas e vínculo de responsável nos casos negativos, inclusive adulteração de IDs do corpo. Correção de QC-002 deve impedir confiança na identidade fornecida pelo cliente.
- Traces e relatórios podem conter tokens e dados sintéticos; manter retenção curta de sete dias para E2E e não anexar corpos sensíveis a resumos públicos. Relatórios de qualidade devem conter caminho relativo, regra e evidência mínima.
- Trabalhos de teste/coleta precisam de `contents: read`; não adicionar token de escrita nem secrets para PR de fork. Preservar permissões específicas já existentes da varredura de imagens.
- Alterar proteção de branch é operação administrativa externa. Nesta especificação, planejar responsável e evidência para essa configuração; nenhuma proteção foi consultada ou modificada nesta elaboração.

## Falhas, observabilidade e operação

Cada trabalho publica resumo com SHA, versões, duração, produtores executados, contagem por suíte e achados por módulo/severidade. Backend gera TRX e cobertura via collector existente quando configurada; Vitest gera JUnit/JSON; Playwright conserva relatório HTML e trace/screenshot de falha. Cobertura ajuda a localizar lacunas e não substitui a matriz CT-001–CT-009; não há percentual global artificial de aprovação neste ciclo.

Ausência de Docker, falha de saúde do Compose, erro de restauração, ferramenta incompatível, zero testes descobertos em suíte crítica ou relatório incompleto são falhas operacionais acionáveis. Não usar `continue-on-error` no resultado final para contorná-las. Coletar logs sintéticos quando houver falha de inicialização e sempre encerrar o projeto Compose pertencente à execução.

Manter inicialmente os limites atuais de 20 minutos para frontend/backend, 30 para E2E e 15 para contratos; o trabalho de análise adicional terá limite inicial de 15 minutos. Esses são limites operacionais propostos, não tempos comprovados. Registrar duração e ajustar divisão por suíte somente com medição. Jobs sem banco/estado compartilhado executam em paralelo; testes que resetam o mesmo banco ficam serializados.

## Compatibilidade, disponibilização e reversão

1. Caracterizar e vincular a cobertura atual; resolver pins, locks e produtores com relatório. Não contar infraestrutura já entregue como nova implementação.
2. Coletar a linha de base e classificar os achados. Criar `pendencias.md` com ID, módulo, severidade, regra/evidência, responsável por papel, status e vínculo externo quando existir; as issues #227/#237 agregam o trabalho, mas não substituem a identificação dos achados.
3. Corrigir altos que tenham contrato definido, sempre com regressão demonstrável. Manter altos sem solução explicitamente bloqueantes. Implementar testes críticos e isolamento sem incorporar refatorações não mensuradas.
4. Integrar análise ao workflow e comprovar uma falha proposital detectada em PR de prova; após remover a falha, verificar execução verde na revisão correspondente. Produzir registros da proteção de `develop` e dos nomes exatos dos checks obrigatórios.
5. Concluir somente após comprovar todos os critérios. O modo inicial de coleta pode existir durante desenvolvimento da ferramenta, mas não vale como gate final nem como aceite.

Reversão de configuração ocorre por commit que restaura a versão anterior de ferramenta/política, mantendo inventário e rastreabilidade; não apagar achados para obter verde. Se um check obrigatório for renomeado, atualizar a proteção de forma coordenada e comprovar que não houve intervalo sem as validações anteriores. Reverter correção funcional reabre seu achado e pode bloquear a conclusão. Uma eventual migração de QC-001 terá plano próprio antes de ser executada.

## Estratégia TDD e pirâmide de testes

### RED

- Criar testes do coletor com relatórios pequenos de ESLint/SARIF e casos de regra desconhecida, alto histórico, novo médio, relatório ausente, baseline adulterado, duplicatas e caminhos Windows/Linux. A primeira execução deve falhar pela capacidade ainda ausente, sem acessar rede.
- Para fluxo existente ainda sem teste, primeiro registrar caracterização verde e depois demonstrar sensibilidade com mutação temporária controlada, como remover a redução de estoque ou aceitar responsável incorreto. Não exigir alteração de produção desnecessária só para inventar um RED.
- Para defeito confirmado, escrever a expectativa correta e observar falha por comportamento: CT-003 para QC-002, recusa HTTP controlada para QC-003 e CT-009 como reprodução de QC-001. Falha de Docker/instalação não é RED funcional.
- Criar testes de contrato do workflow que falhem pela ausência de análise, relatório, verificação final e pins. Testar o resultado final com dependência `failure`, `cancelled`, `skipped` e `success`, exigindo sucesso de todas as obrigatórias.

### GREEN

- Implementar o menor coletor e adaptadores que satisfaçam os contratos. Não criar analisador semântico próprio de C#/TypeScript; interpretar relatórios nativos.
- Completar fixtures isoladas, handlers e casos críticos. Corrigir produção somente quando o teste/evidência justificar e o contrato estiver definido.
- Gerar locks e arquivos de versão, fazer restore limpo, executar a mesma seleção local/CI e apresentar resultados completos. Infraestrutura já disponível deve permanecer verde.
- Exercitar falha proposital de lint/teste/análise no PR de prova, sem merge, e documentar que o bloqueio desaparece apenas após a correção validada.

### REFACTOR

- Extrair preparação de contas, produtos e respostas repetidas após os testes passarem; evitar helpers que ocultem a asserção ou compartilhem estado mutável.
- Executar novamente as suítes afetadas após a refatoração e a suíte completa na validação de integração. Repetição adicional fica restrita à prova de isolamento ou investigação de falhas.
- Guardar comandos, resultado RED, resultado GREEN, alteração da refatoração e evidência final em `evidencias/<tarefa>.md`. Nunca descrever caso ignorado, simulado ou apenas descoberto como E2E integrado aprovado.

## Esteira de qualidade

Os comandos abaixo pressupõem a raiz do repositório, exceto quando a coluna identifica `frontend`. Comandos futuros devem ser implementados antes de se tornarem dependência de tarefas funcionais.

| Área | Comando local | Verificação de CI | Lacuna/ação |
|---|---|---|---|
| Instalação frontend | Em `frontend`: `npm ci` | `Frontend quality` e E2E | Já existe; verificar versões fixadas antes da instalação |
| Lint frontend | Em `frontend`: `npm run lint` | `Frontend quality` | Preservar zero avisos; ampliar validação dos arquivos de configuração/E2E na configuração adicional |
| Testes frontend | Em `frontend`: `npm run test -- --run` | `Frontend quality` | Já existe; publicar resultado e conferir suíte não vazia |
| Compilação frontend | Em `frontend`: `npm run build` | `Frontend quality` | Já existe; controlar metadados de build e classificar avisos relevantes |
| Restauração backend | `dotnet restore backend/backend.sln --locked-mode` | `Backend quality` | Comando depende dos locks planejados; hoje o workflow usa restore sem bloqueio |
| Compilação backend | `dotnet build backend/backend.sln --no-restore -c Release --nologo --disable-build-servers` | `Backend quality` | Já existe; disponibilizar analisadores e relatórios por projeto |
| Testes backend | `dotnet test backend/backend.sln --no-build --no-restore -c Release --nologo --disable-build-servers --logger trx --results-directory .tmp/quality/test-results/backend` | `Backend quality` | Docker necessário; confirmar descoberta e manter testes de migração; o workflow atual repete parte da suíte em execução filtrada |
| Teste direcionado | `dotnet test backend/Tests/Tests.csproj -c Release --filter FullyQualifiedName~NomeDoCenario` | Evidência TDD | Substituir `NomeDoCenario` pelo nome real do caso; não usar filtro vazio como aceite |
| Navegador | Em `frontend`: `npx --no-install playwright install --with-deps chromium` | E2E | Já existe; navegador corresponde ao lockfile |
| Ambiente E2E | `docker compose -p lab-solos-quality-local -f docker-compose-e2e.yml up -d --build --wait` | E2E, com nome exclusivo por execução | Fixar imagens; configurar portas alternativas ao executar em paralelo no mesmo host |
| Testes E2E | Em `frontend`: `npm run test:e2e` | `Authentication E2E` | Manter execução ampla e relatórios; separar classificação/isolamento de casos reais |
| Limpeza E2E | `docker compose -p lab-solos-quality-local -f docker-compose-e2e.yml down --volumes --remove-orphans` | Etapa `always()` | Deve usar exatamente o projeto criado pela execução; não reutilizar projeto existente de outro trabalho |
| Contratos de automação | `python -m unittest discover -s .github/scripts/tests -p 'test_*.py' -v` | `Workflow contracts` | Já existe; acrescentar testes de baseline/gate e manter validações do manual |
| Sintaxe dos workflows | Em Bash: `bash .github/scripts/install_actionlint.sh .tmp/actionlint`; depois `.tmp/actionlint/actionlint .github/workflows/container-ci.yml` | `Workflow contracts` | Instalador já fixa actionlint 1.7.12; validar também outros workflows alterados |
| Coleta adicional | `python .github/scripts/quality_baseline.py collect --output .tmp/quality/current.json` | Novo trabalho `Code quality baseline` | Script, política, configurações e artefatos precisam ser criados |
| Política de qualidade | `python .github/scripts/quality_baseline.py check --current .tmp/quality/current.json --base-ref origin/develop` | `Code quality baseline`, usando SHA base do PR | Bloquear altos, novas violações e coleta incompleta |
| Proteção de merge | Verificação administrativa da regra aplicada a `develop` e PR de prova | Novo check final `Quality gate` | Ainda não comprovada; configurar/verificar checks obrigatórios e registrar evidência |

Quando houver artefatos `bin/obj` versionados ou alterações locais preexistentes, usar `--artifacts-path` em restore/build/test com o mesmo caminho em todas as etapas, como nesta inspeção. A implementação deve documentar a variante local isolada e não alterar/reverter artefatos do usuário.

O workflow principal deve continuar disparando em todo PR para `develop`, incluindo mudança de destino para `develop` via evento `edited`. Acrescentar `ready_for_review` para nova validação quando aplicável e `merge_group` caso uma fila de merge seja habilitada. Não usar `closed`, entrega em `main`, execução manual ou filtro que omita código como comprovação pré-merge.

Criar um trabalho final `Quality gate` com `needs` para frontend, backend, E2E, contratos e análise adicional, além das validações de contêiner já exigidas pela política existente. Executar com `if: always()` e falhar se qualquer dependência obrigatória não tiver resultado `success`. Não considerar trabalho pulado como cumprimento. Manter os checks já obrigatórios durante a introdução do agregador.

Configurar/verificar a proteção de `develop` para exigir esse resultado, oriundo de GitHub Actions, e validação atualizada contra a base antes do merge. Um YAML que executa em PR não configura proteção de branch; workflows omitidos por filtros também podem deixar checks pendentes. A comprovação exige a regra aplicada e o PR de prova, não apenas teste de texto do workflow. [Proteção de branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) e [diagnóstico de checks obrigatórios](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks).

Não tornar o workflow de dependências com filtro de caminhos uma dependência obrigatória ausente sem resolver sua execução em todos os PRs. Preservar sua política atual; se a configuração remota exigir esse check, a implementação deve corrigir o problema de filtros e comprovar o resultado antes de encerrar CA-003.

## Matriz de rastreabilidade

| Requisito | Componentes | Testes | Evidência |
|---|---|---|---|
| RF-001 | Suítes xUnit/Vitest/RTL/Playwright; fixtures PostgreSQL, MSW e Mailpit | CT-001 a CT-008 positivos/negativos; CT-009 para qualidade da devolução | Matriz cenário → teste existente/novo, TRX, JUnit/JSON e relatório E2E real |
| RF-002 | Política, coletores nativos, baseline e inventário/pendências | Alto aberto, dívida média/baixa identificada, novo achado, regra desconhecida e remediação com regressão | `inventario.md`, `pendencias.md`, relatório por módulo/severidade e IDs de correções |
| RF-003 | `container-ci.yml`, `Quality gate` e proteção de `develop` | Eventos, dependências, falha/cancelamento/skip e PR de prova | Execuções sobre revisões identificadas e regra de proteção aplicada |
| RNF-001 | Arquivos de versão, locks npm/NuGet, pins de imagens, metadados Vite e script comum | Instalação limpa, erro em divergência de versão, repetição da coleta e da suíte crítica com dados isolados | Versões/digests/SHA/configuração, comandos locais e CI, achados normalizados equivalentes |
| RNF-002 | Jobs paralelos, timeouts, relatórios e isolamento por cenário | Falha com nome da suíte/caso, erro operacional explícito, ausência de interferência de banco/caixa SMTP | Duração por trabalho, resumo de falha e artefatos diagnósticos |
| CA-001 | Ambiente limpo e pirâmide mínima | CT-001–CT-008, descoberta não vazia e prova de isolamento; zero casos críticos ignorados | Execução limpa xUnit/Vitest/Playwright, sem confundir mocks com API real |
| CA-002 | Inventário priorizado e comparador contra base confiável | Nenhum alto aberto para concluir; altos sem solução bloqueiam; médios/baixos com pendência | Relatório completo, identificação QC-001–QC-006 após triagem e estado rastreável |
| CA-003 | Check obrigatório atual, eventos PR e proteção administrativa | PR com falha proposital impedido; revisão corrigida aprovada após executar as validações | Evidência de checks e impossibilidade de merge enquanto obrigatórios não passam |

## Alternativas e decisões

| Decisão | Alternativas | Recomendação | Escolha confirmada | Consequências |
|---|---|---|---|---|
| Pirâmide | Apenas unidades; xUnit + Vitest/RTL + Playwright | Aproveitar as três camadas existentes | Confirmada na descoberta do PRD | Completar cobertura e isolamento, sem reinstalar infraestrutura |
| Plataforma de qualidade | Serviço externo; servidor próprio; analisadores do SDK e ESLint | Usar ferramentas locais já adotadas e normalizar resultados | Decisão técnica por continuidade; não requer nova decisão material | Sem plataforma adicional; política/categorias próprias, sem alegar notas de outra ferramenta |
| Banco de testes | InMemory em tudo; novo banco/provedor; PostgreSQL existente | PostgreSQL real para contratos relacionais e HTTP | Decisão técnica por continuidade | Docker obrigatório; manter testes unitários leves onde suficientes |
| Execução afetada | Filtros novos por caminho; execução ampla existente | Manter execução ampla neste ciclo | Derivada de RF-003 e do workflow atual | Menor risco de omissão; otimização posterior somente com medição |
| Dívida histórica | Zerar tudo; ignorar avisos; baseline individual rastreável | Altos bloqueiam, médios/baixos rastreados, nenhum achado novo | Confirmada no PRD quanto à priorização | Exige comparação por ocorrência, não apenas por contagem |
| Infraestrutura versus defeitos novos | Redesenhar fluxos preventivamente; corrigir achados comprovados | Correções pequenas com testes; alto sem contrato definido bloqueia conclusão | Derivada de CA-002 e do limite de escopo | QC-001 pode exigir especificação complementar de dados antes de correção |
| Proteção de integração | Pós-merge; somente YAML pré-merge; checks exigidos em `develop` | Validação pré-merge com proteção comprovada | Confirmada na descoberta; configuração remota ainda não verificada | Inclui atividade administrativa verificável na implementação |

A fundação não possui alternativa arquitetural material em aberto: conserva aplicação, banco, executores e workflow existentes. Uma eventual decisão sobre semântica/migração de devoluções será tratada separadamente após a reprodução de QC-001, antes da implementação dessa correção.

## Riscos e mitigação

| Risco | Mitigação e condição de encerramento |
|---|---|
| PRD histórico levar à repetição de trabalho entregue | Usar o estado atual e registrar quais cenários já possuem cobertura |
| Inventário parecer completo com produtores ausentes | Validar status, versões, arquivos e escopo de cada produtor; incompletude retorna erro operacional |
| Baseline absorver dívida introduzida pelo próprio PR | Ler referência base confiável; comparar ocorrências e impedir aceitação automática de novos achados |
| Configuração de regra mudar a contagem sem mudança real | Versionar política, preservar diagnóstico original e reanalisar base/candidato sob a mesma configuração |
| QC-001 ou outro alto exigir contrato além da fundação | Registrar reprodução e bloqueio explícito; não concluir CA-002 até solução validada |
| E2E passar por usar API simulada ou estado da execução anterior | Identificar casos reais, conta por cenário, isolamento de Mailpit e prova de repetição sem retries mascarando falhas |
| Ambientes local/CI divergentes | Fixar ferramentas, lockfiles e imagens; validar combinação em instalação limpa e registrar diferenças de SO |
| Proteção remota ausente ou check obrigatório pulado | Inspecionar/configurar a regra e fazer PR de prova; não concluir CA-003 somente pelo YAML |
| Ampliação de análise gerar grande volume de avisos | Manter lint atual verde, coletar regras adicionais separadamente e priorizar por evidência sem refatoração global |
| Artefatos versionados ou mudanças locais serem sobrescritos | Usar saída isolada e conferir diff; não incluir artefatos de execução na contribuição |

## Perguntas abertas

Não há pergunta bloqueante para decompor a fundação. Permanecem verificações de implementação com resultado obrigatório:

- Quais patches/digests das linhas já usadas no CI passam na instalação limpa? Registrar valores concretos nos arquivos planejados antes de usar RNF-001 como atendido.
- Qual regra remota protege `develop` e quem executará a configuração administrativa, se necessária? CA-003 permanece pendente até a evidência.
- QC-001 é reproduzido como impedimento de devolução? Se confirmado alto, definir semântica de data prevista/efetiva, compatibilidade e migração em especificação complementar antes da correção; até lá, bloqueia a conclusão funcional.
- Quais candidatos QC-002–QC-006 são confirmados e qual sua severidade com evidência? A primeira coleta/triagem resolve a classificação; nenhuma hipótese é contabilizada como correção entregue.

Não foi solicitada contribuição Git externa. Esta entrega cria apenas a especificação técnica; a implementação, o backlog detalhado e as operações administrativas serão etapas posteriores.
