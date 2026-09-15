# Tarefas: Fundação de qualidade e testes críticos

- Status: concluído
- PRD: `./prd.md`
- Especificação técnica: `./techspec.md`
- Atualizado em: 2026-09-15
- Base inspecionada: `a58cc224c2e6a327434674a0de0585adc62219a2`
- Issues de referência: #227 e #237
- Escopo desta entrega: execução do DAG concluída, incluindo T031 e a prova remota de T030

## Premissas de execução

Ler integralmente o PRD, a especificação técnica e a tarefa antes de executá-la. O estado atual confirma xUnit na solução, Vitest/Testing Library/MSW, Playwright e CI em PR para `develop`. A linha histórica do PRD e da skill sobre executores ausentes não justifica reinstalá-los. Criar somente a infraestrutura adicional explícita: versões, analisadores/coletor, dados E2E e verificação final.

A associação foi conferida por leitura das issues: #227 trata dos testes críticos e #237 dos indicadores de manutenibilidade/confiabilidade. Cada tarefa indica uma única issue para permitir execução incremental sem associação ambígua. Essa indicação não cria subissues nem altera o Project nesta etapa. A conclusão de uma tarefa não conclui automaticamente a issue agregadora; seu aceite considera as dependências e os critérios ainda pendentes.

Comportamento já correto recebe teste de caracterização. Para esta decomposição aplica-se a regra da skill `create-tasks`: não quebrar/remover produção correta para fabricar RED, mesmo que a techspec mencione uma mutação temporária para demonstrar sensibilidade. RED funcional deve vir de uma lacuna real. Em documentação/triagem/operação, usar verificação objetiva de ausência ou reprovação de evidência. Teste ignorado, execução vazia, descoberta isolada e resposta simulada não provam E2E real.

Cada tarefa possui também `evidencias/Txxx.md` neste slug. Registrar comandos, SHA, ambiente, resultado e motivo de RED/GREEN/REFACTOR ou caracterização. O executor da tarefa atualiza seu estado e o log abaixo; sob orquestração, somente o coordenador altera `tasks.md`. Nenhuma tarefa tem permissão implícita para alterar fontes fora da posse indicada: registrar o achado e revisar escopo/dependências antes de ampliar.

### Impedimentos e extensão controlada do plano

T016 entrega a reprodução de QC-001, não uma migração especulativa. Se a devolução estiver impedida, registrar alto aberto e exigir especificação complementar de data prevista/efetiva, compatibilidade, migração e reversão. Somente após essa definição acrescentar tarefas pequenas de correção com IDs novos, posse e testes definidos; incluí-las como dependências do aceite. Não renumerar as tarefas existentes.

A mesma regra vale para altos novos ou correções que excedam os contratos definidos. T027 pode concluir o inventário e relatar check reprovado; T028 pode concluir a implementação de um gate que corretamente reprova. T029 só fica pronta com todos os altos resolvidos e sem novas violações, além das dependências do DAG. Enquanto isso, marcar seu impedimento explicitamente. Não declarar CA-002 ou o plano concluídos com achado alto aberto.

T030 é a etapa administrativa externa prevista, com procedimento local preparado em T028. Verificar a autorização da sessão antes de configurar proteção ou criar/publicar PR de prova; a solicitação atual é de planejamento. Não pedir autorização nesta entrega, nem executar operações de prova durante a criação do plano.

### Convenções de comandos e artefatos

- Comandos `npm`/`npx` abaixo partem de `frontend`; Python, .NET, Docker e Git partem da raiz.
- Antes dos comandos que geram arquivos, criar `.tmp/quality/Txxx/` da tarefa. Python usa `-B`; fixtures de automação usam diretórios temporários próprios. Instalações de ferramentas/dependências são feitas antes de iniciar tarefas paralelas.
- Backend usa `--artifacts-path .tmp/quality/Txxx/backend` no restore/build/test, sem escrever nos `bin/obj` versionados. O restore bloqueado só é exigível após T003; novos locks de T023 são gerados antes da validação bloqueada.
- Saídas de uma tarefa não são insumos silenciosos da próxima. Cada executor recompila/restaura sua saída quando necessário. Preservar alterações locais preexistentes, inclusive `tsconfig.app.tsbuildinfo`.
- Há no máximo uma tarefa com build/Vitest frontend em cada onda. Saídas de TypeScript/Vite e caches locais não são arquivos de contribuição. Na onda 16 não executar `npm ci`, build, alteração de helpers ou geração de relatório compartilhado.
- Filtros xUnit identificam classes existentes ou entregáveis nomeados na tarefa. `FullyQualifiedName` é composto explicitamente; confirmar testes descobertos/executados antes de aceitar o resultado.
- Scripts, projetos e testes novos citados são entregáveis das tarefas indicadas; não presumir sua existência antes delas. `check_quality_toolchain.py` nasce em T002; analisadores em T005/T006; `collect/render` em T008; `check` em T009; seed em T023; projetos Playwright `real/ui` em T024; avaliador do gate em T028.
- `git diff --check` acompanha todas as tarefas. Na revisão de novos arquivos ainda não rastreados, verificar também espaços finais e conflitos nesses arquivos.
- A suíte completa é executada quando a tarefa exige regressão ampla, após a alteração relevante. Repetições adicionais somente para investigação ou prova explícita de isolamento/reprodutibilidade.

### Preparação dos ambientes E2E

Para T024–T026 e T029, configurar as variáveis abaixo antes de subir a stack. Definir as mesmas variáveis no processo que invoca Playwright e o helper de T023. Valores são locais/sintéticos.

| Tarefa | `E2E_COMPOSE_PROJECT` | `E2E_FRONTEND_PORT` | `E2E_BACKEND_PORT` | `E2E_SMTP_PORT` |
|---|---|---|---|---|
| T024 | lab-solos-quality-t024 | 4173 | 18080 | 18025 |
| T025 | lab-solos-quality-t025 | 4275 | 18175 | 18275 |
| T026 | lab-solos-quality-t026 | 4276 | 18176 | 18276 |
| T029 | lab-solos-quality-t029 | 4173 | 18080 | 18025 |

Para cada linha, `E2E_BASE_URL=http://127.0.0.1:<porta-frontend>`, `E2E_API_URL=http://127.0.0.1:<porta-backend>/api` e `E2E_SMTP_API_URL=http://127.0.0.1:<porta-smtp>`. Os identificadores/portas são entradas da execução, não dados de produto. Em PowerShell usar `$env:NOME = 'valor'`; em Bash, `export NOME='valor'`.

A sequência, exemplificada para T025, é:

```text
docker compose -p lab-solos-quality-t025 -f docker-compose-e2e.yml up -d --build --wait
npm run test:e2e -- critical/registration-approval.spec.ts --project=real --output=e2e/infra/artifacts/T025 --reporter=list
docker compose -p lab-solos-quality-t025 -f docker-compose-e2e.yml down --volumes --remove-orphans
```

Executar npm em `frontend` e os comandos Compose na raiz. O nome passado a `-p` deve coincidir com `E2E_COMPOSE_PROJECT`. Limpeza é obrigatória em `finally`/etapa `always()`, inclusive quando saúde/teste falhar. Antes de remover volumes, confirmar que o projeto foi criado por essa execução; não derrubar uma stack preexistente. Na onda 16, usar saída própria com `--reporter=list` para evitar o relatório HTML global. Instalar Chromium uma vez antes dos casos, com `npx --no-install playwright install --with-deps chromium`.

## Ondas de execução

Ondas são barreiras conservadoras para evitar mudança de fontes enquanto a coleta/build as lê. Dentro da onda, só iniciar uma tarefa com dependências concluídas, posse disponível e ambiente exclusivo. `Paralela: sim` indica possibilidade nessa onda, não autorização para ignorar dependências. As tarefas adicionais decorrentes da triagem exigem recalcular ondas e aceite.

| Onda | Tarefas | Motivo de segurança do paralelismo |
|---|---|---|
| 1 | T001 | Caracterização documental exclusiva antes da alteração de ferramentas ou fontes. |
| 2 | T002 | Contrato de versões é estabilizado antes dos manifestos e verificadores consumidores. |
| 3 | T003, T004, T007 | Locks backend, configuração frontend e normalização Python têm arquivos distintos; T007 usa somente fixtures. |
| 4 | T005, T006 | Analisadores backend e frontend usam configurações, fixtures e saídas distintas. |
| 5 | T008 | Coleta real exige fontes e configurações estáveis durante sua validação. |
| 6 | T009, T010, T018 | Comparação usa Git temporário; fixtures backend e cobertura frontend têm fontes e artefatos independentes. |
| 7 | T011, T019 | Cobertura backend de credenciais e UI de aprovação não compartilham arquivos ou banco. |
| 8 | T012, T020 | Cadastro HTTP backend e criação de empréstimo na UI usam fixtures e fontes separadas. |
| 9 | T013, T021 | Aprovação de usuários backend e decisão de empréstimos frontend usam contratos já definidos e arquivos distintos. |
| 10 | T014, T017 | Criação de empréstimo e mapeamento de produtos não alteram contratos entre si; builds/contêineres de teste são exclusivos por tarefa. |
| 11 | T015 | Decisão de empréstimo depende de sua criação e exige posse exclusiva do controlador. |
| 12 | T016 | Reprodução de devolução depende do fluxo de aprovação estabilizado. |
| 13 | T022 | Builds de imagens leem as fontes estabilizadas; pins/Compose/fixture são atualizados sem testes concorrentes. |
| 14 | T023 | Novo suporte E2E altera solução, referências, locks e Compose; requer execução exclusiva. |
| 15 | T024 | Classificação Playwright e helpers compartilhados são estabilizados antes dos novos consumidores. |
| 16 | T025, T026 | Arquivos E2E distintos e helpers estáveis; projetos Compose, portas e saídas de relatórios separados, conforme tabela. |
| 17 | T027 | Coleta e triagem consolidam a revisão completa sem mutações concorrentes em suas fontes. |
| 18 | T028 | Alteração dos workflows e do gate é centralizada, preservando nomes e contratos de CI. |
| 19 | T029 | Validação cruzada exclusiva; depende também de eliminar os impedimentos apontados pela triagem. |
| 20 | T030 | Prova remota e aceite são operações sequenciais posteriores às evidências locais, sob autorização aplicável. |

## Matriz de rastreabilidade

| Requisito | Tarefas | Condição de aceite |
|---|---|---|
| RF-001 | T001, T004, T010, T011, T012, T013, T014, T015, T018, T019, T020, T021, T023, T024, T025, T026, T029 | Cenários CT-001–CT-008 positivos/negativos nas camadas previstas, com API real onde exigido. |
| RF-002 | T001, T005, T006, T007, T008, T009, T012, T013, T015, T016, T017, T024, T027, T029 | Inventário completo, altos tratados/bloqueantes e dívida média/baixa individual rastreável. |
| RF-003 | T009, T028, T030 | CI pré-merge executado e checks obrigatórios comprovados em develop. |
| RNF-001 | T002, T003, T004, T005, T006, T007, T008, T009, T010, T018, T022, T023, T024, T025, T026, T027, T028, T029, T030 | Versões/locks/imagens fixados, entradas controladas e repetição com dados isolados. |
| RNF-002 | T002, T005, T007, T008, T010, T011, T022, T023, T024, T027, T028, T029 | Falhas identificáveis, artefatos por suíte e concorrência sem estado compartilhado. |
| CA-001 | T001, T002, T003, T004, T010, T011, T012, T013, T014, T015, T018, T019, T020, T021, T022, T023, T024, T025, T026, T029, T030 | Suítes não vazias e cenários críticos sem ignorados, em ambiente limpo. |
| CA-002 | T001, T005, T006, T007, T008, T009, T012, T013, T015, T016, T017, T024, T027, T028, T029, T030 | Nenhum alto aberto no aceite; novos achados não entram silenciosamente na linha de base. |
| CA-003 | T009, T028, T030 | Regra efetiva e PR de prova bloqueado na falha, validado na revisão corrigida. |

## Cobertura dos cenários e achados

| Referência | Entregas principais |
|---|---|
| CT-001, CT-004, CT-005 | T001, T011, T018, T023, T024 e T029 |
| CT-002 | T012, T018, T025 e T029 |
| CT-003 | T013, T019, T025 e T029 |
| CT-006 | T014, T020, T026 e T029 |
| CT-007, CT-008 | T015, T021, T026 e T029 |
| CT-009 / QC-001 | T016 reproduz; T027 registra bloqueio; correção depende de especificação complementar antes do aceite |
| QC-002 | T013; consolidação em T027 |
| QC-003 | T012; consolidação em T027 |
| QC-004 | T017; consolidação em T027 |
| QC-005 | T023/T024; prova de repetição em T029 |
| QC-006 | T027 comprova impacto e classifica; correção alta não definida exige extensão do plano |

## T001 — Mapear a cobertura existente e as lacunas do aceite

- Status: concluída
- Issue: #227
- Dependências: nenhuma
- Onda: 1
- Paralela: não
- Requisitos: RF-001, RF-002, CA-001, CA-002
- Caminhos sob responsabilidade: `.codex/docs/specs/fundacao-qualidade-testes/cobertura.md`, `.codex/docs/specs/fundacao-qualidade-testes/evidencias/T001.md`
- Artefatos de validação: `.tmp/quality/T001/**`; saídas E2E exclusivas quando indicadas, sem versionamento

### Escopo

Vincular CT-001–CT-009 a nomes e caminhos de testes existentes, distinguindo unidade, HTTP/PostgreSQL, UI simulada e E2E real. Registrar os candidatos QC-001–QC-006 e a cobertura faltante, sem transformar hipótese em defeito confirmado. Reutilizar as evidências da techspec quando a revisão e os arquivos relevantes não mudaram.

### Critérios de conclusão

Matriz contém caminho positivo e negativo de cada cenário, comando de descoberta e lacuna explícita. As quatro unidades históricas de ProdutoRepository estão identificadas na suíte atual. Ficam registrados SHA, versões e as diferenças entre ambiente local e CI; zero casos descobertos não contam como cobertura.

### Plano TDD

- RED: Verificação documental: a ausência de ligação cenário → teste/evidência reprova a matriz; não se aplica RED de produção.
- GREEN: Preencher a matriz com evidências verificadas e indicar quais tarefas abaixo completam cada lacuna.
- REFACTOR: Consolidar referências repetidas sem omitir diferenças entre casos simulados e reais.

### Validação

- `dotnet sln backend/backend.sln list`
- `dotnet test backend/Tests/Tests.csproj --artifacts-path .tmp/quality/T001/backend --list-tests --nologo`
- `npm run test:e2e:list`
- `git diff --check`

### Notas

Somente documentação e descoberta. Os resultados históricos não dispensam revalidação de arquivos alterados desde a techspec.

## T002 — Fixar o contrato de versões e validar o ambiente

- Status: concluída
- Issue: #227
- Dependências: T001
- Onda: 2
- Paralela: não
- Requisitos: RNF-001, RNF-002, CA-001
- Caminhos sob responsabilidade: `.github/quality/toolchain.json`, `.github/quality/requirements.txt`, `.github/scripts/check_quality_toolchain.py`, `.github/scripts/tests/test_quality_toolchain.py`, `.codex/docs/specs/fundacao-qualidade-testes/evidencias/T002.md`
- Artefatos de validação: `.tmp/quality/T002/**`; saídas E2E exclusivas quando indicadas, sem versionamento

### Escopo

Resolver patches compatíveis das linhas Node 20, SDK .NET 8 e Python 3.12, versão npm e versões Docker/Compose validadas. Registrar também runner/revisão e Chromium associado ao lockfile. Criar verificador de versões com subprocessos testáveis, antes de conectar pins aos consumidores. requirements.txt fixa as dependências Python da esteira, incluindo PyYAML já utilizado.

### Critérios de conclusão

JSON contém versões concretas, sem latest ou x no lugar de patch. Verificador retorna sucesso em correspondência, erro acionável em ferramenta ausente/incompatível e não imprime credenciais. Compatibilidade de engines e disponibilidade dos patches são comprovadas; não migrar major para reproduzir a máquina desta sessão. O contrato distingue versões exigidas de revisão observada do runner.

### Plano TDD

- RED: Testes com saídas sintéticas de versão devem falhar para divergência, executável ausente, JSON incompleto e interpretação de versão com sufixo.
- GREEN: Implementar a leitura e verificação mínima, resolver as versões reais e registrar como obtê-las sem alterar instalações globais do usuário.
- REFACTOR: Separar consulta de subprocesso, interpretação e política mantendo códigos de saída estáveis.

### Validação

- `python -B -m unittest discover -s .github/scripts/tests -p test_quality_toolchain.py -v`
- `python -B .github/scripts/check_quality_toolchain.py --help`
- `python -B .github/scripts/check_quality_toolchain.py`
- `git diff --check`

### Notas

Script novo, entregue nesta tarefa; o comando real só passa sob as versões registradas. Usar ambiente isolado se a máquina divergir. Não modificar workflow nesta etapa. Digests das imagens são completados por T022.

## T003 — Fixar SDK e restauração NuGet da solução

- Status: concluída
- Issue: #227
- Dependências: T002
- Onda: 3
- Paralela: sim
- Requisitos: RNF-001, CA-001
- Caminhos sob responsabilidade: `global.json`, `backend/Directory.Build.props`, `backend/Tests/Tests.csproj`, `backend/Tests/packages.lock.json`, `backend/LabSolos-Server-DotNet8/LabSolos-Server-DotNet8.csproj`, `backend/LabSolos-Server-DotNet8/packages.lock.json`, `.github/scripts/tests/test_quality_dotnet_restore.py`, `.codex/docs/specs/fundacao-qualidade-testes/evidencias/T003.md`
- Artefatos de validação: `.tmp/quality/T003/**`; saídas E2E exclusivas quando indicadas, sem versionamento

### Escopo

Aplicar o SDK definido em T002, desabilitar roll-forward automático e gerar locks de aplicação/testes. Configurar restauração bloqueada para validação e preservar Tests na solução. Não atualizar bibliotecas por iniciativa própria; uma incompatibilidade deve ser evidenciada.

### Critérios de conclusão

Restore limpo em modo bloqueado, compilação e testes da solução passam com o SDK registrado. Divergência intencional de manifesto/lock em fixture isolada falha. Props respeitam escopo e não escrevem sobre artefatos preexistentes.

### Plano TDD

- RED: Contrato de configuração/restore falha com SDK não fixado, lock ausente e divergência de referência em projeto temporário; caracterizar antes os testes já existentes.
- GREEN: Criar global.json e locks, ajustar somente propriedades necessárias e executar restauração limpa.
- REFACTOR: Centralizar propriedades comuns sem alterar versões ou duplicar projetos.

### Validação

- `python -B -m unittest discover -s .github/scripts/tests -p test_quality_dotnet_restore.py -v`
- `dotnet restore backend/backend.sln -p:RestorePackagesWithLockFile=true --artifacts-path .tmp/quality/T003/backend`
- `dotnet restore backend/backend.sln --locked-mode --artifacts-path .tmp/quality/T003/backend`
- `dotnet test backend/backend.sln --no-restore --artifacts-path .tmp/quality/T003/backend -c Release --nologo --disable-build-servers`
- `git diff --check`

### Notas

Usar a geração de locks somente na preparação; a segunda restauração é a evidência de bloqueio. Docker precisa estar disponível para os testes existentes.

## T004 — Fixar Node/npm e tornar os metadados frontend determinísticos

- Status: concluída
- Issue: #227
- Dependências: T002
- Onda: 3
- Paralela: sim
- Requisitos: RNF-001, RF-001, CA-001
- Caminhos sob responsabilidade: `frontend/.node-version`, `frontend/package.json`, `frontend/package-lock.json`, `frontend/vite.config.ts`, `frontend/src/test/buildMetadata.test.ts`, `frontend/src/test/buildMetadata.ts`, `.github/scripts/tests/test_quality_frontend_toolchain.py`, `.codex/docs/specs/fundacao-qualidade-testes/evidencias/T004.md`
- Artefatos de validação: `.tmp/quality/T004/**`; saídas E2E exclusivas quando indicadas, sem versionamento

### Escopo

Aplicar os pins de T002 no arquivo Node e packageManager. Remover consulta de última release e relógio real do carregamento de configuração de testes; aceitar metadados explícitos de build para SHA/versão/data, preservando a identificação da aplicação fora de testes. Testar a configuração efetiva, além de eventual helper.

### Critérios de conclusão

npm ci passa sob as versões fixadas. Carregar o modo de teste não usa rede e produz as mesmas constantes com as mesmas entradas. Build com metadados explícitos incorpora esses valores; versão de produção não é substituída permanentemente por constante de teste.

### Plano TDD

- RED: Teste da configuração de Vite em processo isolado observa tentativa indevida de rede/valor temporal variável; testes do contrato de versão falham para pins ausentes.
- GREEN: Implementar a seleção de metadados por modo e entradas, atualizar manifestos/lock sem trocar major e confirmar execução Vitest.
- REFACTOR: Extrair somente lógica necessária de metadados e manter teste do caminho de configuração real.

### Validação

- `python -B -m unittest discover -s .github/scripts/tests -p test_quality_frontend_toolchain.py -v`
- `npm ci`
- `npm run test -- --run src/test/buildMetadata.test.ts`
- `npm run test -- --run`
- `npm run lint`
- `npm run build`
- `git diff --check`

### Notas

Os comandos npm usam frontend. Não instalar outro executor. Se o helper não for necessário, manter o teste e a alteração diretamente na configuração.

## T005 — Produzir diagnósticos backend com analisadores e SARIF por projeto

- Status: concluída
- Issue: #237
- Dependências: T003
- Onda: 4
- Paralela: sim
- Requisitos: RF-002, RNF-001, RNF-002, CA-002
- Caminhos sob responsabilidade: `backend/Directory.Build.props`, `backend/Directory.Build.targets`, `backend/.editorconfig`, `backend/LabSolos-Server-DotNet8/.editorconfig`, `.github/scripts/tests/test_quality_dotnet_analysis.py`, `.github/scripts/tests/fixtures/quality/dotnet/**`, `.codex/docs/specs/fundacao-qualidade-testes/evidencias/T005.md`
- Artefatos de validação: `.tmp/quality/T005/**`; saídas E2E exclusivas quando indicadas, sem versionamento

### Escopo

Fixar AnalysisLevel 8.0, conjunto recomendado e regras selecionadas, incluindo CA1502 disponível no SDK. Produzir SARIF 2.1 separado por projeto em reconstrução, preservando nulidade e código de migração manual. Tratar precedência da configuração já existente no projeto.

### Critérios de conclusão

Fixture com complexidade conhecida gera a regra prevista; fixture sem problema passa. Aplicação e testes geram arquivos distintos e identificados, sem sobrescrita paralela. Rebuild impede coleta vazia causada por compilação incremental. Regras disponíveis, escopo e exclusões são documentados na evidência para T007.

### Plano TDD

- RED: Teste executável com projeto temporário exige diagnóstico conhecido, versão SARIF e separação de saída; falha pela configuração ausente.
- GREEN: Configurar analisadores e targets mínimos; coletar relatórios reais sem suprimir avisos para tornar build artificialmente limpo.
- REFACTOR: Consolidar propriedades herdadas, mantendo regras efetivas e arquivos separados.

### Validação

- `python -B -m unittest discover -s .github/scripts/tests -p test_quality_dotnet_analysis.py -v`
- `dotnet restore backend/backend.sln --locked-mode --artifacts-path .tmp/quality/T005/backend`
- `dotnet build backend/backend.sln --no-restore --artifacts-path .tmp/quality/T005/backend -c Release -t:Rebuild --nologo --disable-build-servers`
- `dotnet test backend/backend.sln --no-build --no-restore --artifacts-path .tmp/quality/T005/backend -c Release --nologo --disable-build-servers`
- `git diff --check`

### Notas

A coleta de avisos pode passar operacionalmente com achados abertos. O bloqueio por severidade é responsabilidade de T009, não de uma exclusão de regras nesta tarefa.

## T006 — Produzir diagnósticos frontend sem enfraquecer o lint

- Status: concluída
- Issue: #237
- Dependências: T004
- Onda: 4
- Paralela: sim
- Requisitos: RF-002, RNF-001, CA-002
- Caminhos sob responsabilidade: `frontend/eslint.quality.config.js`, `.github/scripts/tests/test_quality_eslint_analysis.py`, `.github/scripts/tests/fixtures/quality/eslint/**`, `.codex/docs/specs/fundacao-qualidade-testes/evidencias/T006.md`
- Artefatos de validação: `.tmp/quality/T006/**`; saídas E2E exclusivas quando indicadas, sem versionamento

### Escopo

Estender a configuração atual com complexity >20 e max-depth >4. Cobrir código próprio de src, E2E e configurações frontend, com ambientes browser/Node apropriados, mantendo as exclusões documentadas. O lint obrigatório permanece com configuração e tolerância atuais.

### Critérios de conclusão

ESLint real sobre fixtures produz IDs/severidades esperados e saída JSON; fixture abaixo dos limites não acusa essas regras. npm run lint continua exigindo zero avisos. Configuração adicional não omite testes/E2E por acidente nem inclui dependências/relatórios.

### Plano TDD

- RED: Fixtures acima dos limites e nos diferentes ambientes devem falhar na expectativa de diagnósticos antes da configuração adicional.
- GREEN: Criar a configuração adicional, executar ESLint instalado pelo lockfile e documentar regras/exclusões para a política.
- REFACTOR: Reutilizar a configuração base sem duplicar ou desativar suas regras.

### Validação

- `python -B -m unittest discover -s .github/scripts/tests -p test_quality_eslint_analysis.py -v`
- `npx --no-install eslint src e2e vite.config.ts playwright.config.ts --config eslint.quality.config.js --format json --output-file ../.tmp/quality/T006/eslint.json`
- `npm run lint`
- `git diff --check`

### Notas

Arquivos de teste Python podem executar npm/npx por subprocesso com argumentos. A saída adicional pode conter dívida; não é justificativa para enfraquecer o comando lint.

## T007 — Normalizar os achados e definir sua identidade estável

- Status: concluída
- Issue: #237
- Dependências: T002
- Onda: 3
- Paralela: sim
- Requisitos: RF-002, RNF-001, RNF-002, CA-002
- Caminhos sob responsabilidade: `.github/scripts/quality_baseline.py`, `.github/scripts/tests/test_quality_baseline.py`, `.github/scripts/tests/fixtures/quality/normalization/**`, `.github/quality/policy.json`, `.codex/docs/specs/fundacao-qualidade-testes/evidencias/T007.md`
- Artefatos de validação: `.tmp/quality/T007/**`; saídas E2E exclusivas quando indicadas, sem versionamento

### Escopo

Implementar o modelo current.json da techspec e adaptadores puros de JSON ESLint/SARIF, classificação por regra e módulo, identidade independente da linha e preservação de multiplicidade. Definir a estrutura da política sem inventar baseline vazio aprovado.

### Critérios de conclusão

Testes cobrem deslocamento de linha, separadores Windows/Linux, colisões/duplicatas, remoção de um achado e inclusão de outro, regra desconhecida, caminho sem módulo e relatório malformado. SHA/data/caminho absoluto não alteram identidade. Campos de prioridade original, evidência e estado são conservados.

### Plano TDD

- RED: Criar fixtures mínimas e expectativas do esquema/fingerprint; observar falha pela normalização ausente.
- GREEN: Implementar funções puras e política mínima para as fixtures, rejeitando desconhecidos em vez de usar categoria genérica silenciosa.
- REFACTOR: Separar adaptadores e normalização comum dentro do módulo, versionando o algoritmo.

### Validação

- `python -B -m unittest discover -s .github/scripts/tests -p test_quality_baseline.py -v`
- `git diff --check`

### Notas

Esta tarefa não executa ferramentas reais nem valida o inventário do repositório. T008 completa o catálogo com as regras efetivas de T005/T006; T009 entrega check.

## T008 — Coletar os produtores reais e gerar o inventário legível

- Status: concluída
- Issue: #237
- Dependências: T005, T006, T007
- Onda: 5
- Paralela: não
- Requisitos: RF-002, RNF-001, RNF-002, CA-002
- Caminhos sob responsabilidade: `.github/scripts/quality_baseline.py`, `.github/scripts/tests/test_quality_baseline.py`, `.github/scripts/tests/fixtures/quality/collection/**`, `.github/quality/policy.json`, `.github/quality/functional-findings.json`, `.codex/docs/specs/fundacao-qualidade-testes/evidencias/T008.md`
- Artefatos de validação: `.tmp/quality/T008/**`; saídas E2E exclusivas quando indicadas, sem versionamento

### Escopo

Entregar collect e render com as interfaces da techspec. Executar verificação de ambiente, ESLint adicional e rebuild .NET; capturar versões, saídas, estados e caminhos por projeto. Definir entrada estruturada de achados funcionais em functional-findings.json, com o mesmo modelo documentado, ainda sem declarar candidatos resolvidos. Descobrir projetos da solução, incluindo suporte de testes que venha a ser acrescentado em T023, sem hardcode de dois arquivos SARIF.

### Critérios de conclusão

Execução usa diretório novo por tentativa e nunca reutiliza relatório antigo após falha. Arquivo faltante, produtor ausente, compilação incompleta e regra não classificada produzem código 2. Relatórios válidos com achados permanecem coletáveis. render não modifica baseline nem fecha pendências; todas as regras observadas estão mapeadas sem supressão.

### Plano TDD

- RED: Simular falha de subprocesso após relatório antigo, JSON parcial, projeto sem SARIF e divergência de versão; exigir diagnóstico e recusa. Testar render determinístico de fixtures.
- GREEN: Conectar os adaptadores de T007 aos executores reais por listas de argumentos e atualizar o catálogo de regras/módulos de T005/T006.
- REFACTOR: Separar coleta e apresentação; normalizar somente campos previstos, preservando mensagens originais.

### Validação

- `python -B -m unittest discover -s .github/scripts/tests -p test_quality_baseline.py -v`
- `python -B .github/scripts/quality_baseline.py collect --output .tmp/quality/T008/current.json`
- `python -B .github/scripts/quality_baseline.py render --current .tmp/quality/T008/current.json --output .tmp/quality/T008/inventario.md`
- `git diff --check`

### Notas

Entrada funcional é arquivo novo de suporte ao contrato já previsto, não um novo mecanismo de exceção. Produção do relatório não implica gate verde; T027 faz a triagem completa.

## T009 — Bloquear altos e novas violações contra uma base confiável

- Status: concluída
- Issue: #237
- Dependências: T008
- Onda: 6
- Paralela: sim
- Requisitos: RF-002, RF-003, RNF-001, CA-002, CA-003
- Caminhos sob responsabilidade: `.github/scripts/quality_baseline.py`, `.github/scripts/tests/test_quality_baseline.py`, `.github/scripts/tests/fixtures/quality/comparison/**`, `.github/quality/policy.json`, `.codex/docs/specs/fundacao-qualidade-testes/evidencias/T009.md`
- Artefatos de validação: `.tmp/quality/T009/**`; saídas E2E exclusivas quando indicadas, sem versionamento

### Escopo

Entregar check --current --base-ref e comparação individual com baseline/política da revisão confiável. Implementar bootstrap com coleta da mesma política sobre base isolada quando ela ainda não possui baseline; diferenciar dívida histórica de código novo. Mudança de política/fingerprint exige comparação coerente das duas revisões.

### Critérios de conclusão

Código 0 exige coleta completa, nenhum alto aberto e nenhum achado novo; 1 identifica violação e 2 falha operacional. Alto histórico não é tolerado. Médio/baixo histórico exige backlogId/owner. Baseline editado no PR, substituição de ocorrência com mesma contagem, referência ausente e falso positivo genérico são recusados. Bootstrap não exige baseline já merged nem aceita JSON candidato sem conferir a base.

### Plano TDD

- RED: Criar repositórios Git temporários com revisões controladas para ataque de baseline, bootstrap, mudança de política, achados duplicados e referência ausente; verificar códigos e diagnósticos.
- GREEN: Implementar leitura via revisão resolvida e comparação, sem fetch ou sobrescrita automática do baseline.
- REFACTOR: Separar resolução da base, validação e comparação; manter casos de adulteração e incompletude.

### Validação

- `python -B -m unittest discover -s .github/scripts/tests -p test_quality_baseline.py -v`
- `git diff --check`

### Notas

Validação dirigida usa repositórios temporários, não modifica origin/develop. A coleta atual do projeto só será candidata a aceite em T027.

## T010 — Completar as fixtures de integração dos fluxos críticos

- Status: concluída
- Issue: #227
- Dependências: T003, T005
- Onda: 6
- Paralela: sim
- Requisitos: RF-001, RNF-001, RNF-002, CA-001
- Caminhos sob responsabilidade: `backend/Tests/Infrastructure/IntegrationWebApplicationFactory.cs`, `backend/Tests/Infrastructure/IntegrationApplicationOptions.cs`, `backend/Tests/Infrastructure/ControlledTimeProvider.cs`, `backend/Tests/Infrastructure/CriticalScenarioData.cs`, `backend/Tests/Infrastructure/CriticalScenarioIsolationTests.cs`, `.codex/docs/specs/fundacao-qualidade-testes/evidencias/T010.md`
- Artefatos de validação: `.tmp/quality/T010/**`; saídas E2E exclusivas quando indicadas, sem versionamento

### Escopo

Reutilizar a coleção PostgreSQL para preparar usuários/perfis, produtos e empréstimos por cenário; adicionar somente lacunas de infraestrutura necessárias aos casos seguintes. Provar limpeza e consulta em contexto novo. Preservar a distinção entre EnsureCreated e testes reais de migração.

### Critérios de conclusão

Dois cenários consecutivos não compartilham dados; dados usam hashes do serviço existente, IDs controlados e relógio quando aplicável. Todos os testes que resetam o esquema pertencem à coleção serial. Uma preparação sem usuário privilegiado não herda privilégio do cenário anterior.

### Plano TDD

- RED: Teste de isolamento demonstra vazamento da preparação nova quando ainda não implementada; infraestrutura correta existente recebe caracterização, sem quebrar a factory.
- GREEN: Completar helpers mínimos para os perfis/dados e verificar uma chamada HTTP real com consulta posterior em novo contexto.
- REFACTOR: Extrair preparação comum sem ocultar estados e asserções das jornadas.

### Validação

- `dotnet restore backend/backend.sln --locked-mode --artifacts-path .tmp/quality/T010/backend`
- `dotnet test backend/Tests/Tests.csproj --no-restore --artifacts-path .tmp/quality/T010/backend -c Release --nologo --disable-build-servers --filter "FullyQualifiedName~CriticalScenarioIsolationTests"`
- `dotnet test backend/backend.sln --no-build --no-restore --artifacts-path .tmp/quality/T010/backend -c Release --nologo --disable-build-servers`
- `git diff --check`

### Notas

Não editar PostgreSqlContainerFixture para fixar imagem nesta tarefa; T022 é sua proprietária. Os caminhos de saída de build são exclusivos de T010.

## T011 — Completar a cobertura backend de autenticação e credenciais

- Status: concluída
- Issue: #227
- Dependências: T010
- Onda: 7
- Paralela: sim
- Requisitos: RF-001, RNF-002, CA-001
- Caminhos sob responsabilidade: `backend/Tests/Controllers/AuthLoginContractTests.cs`, `backend/Tests/Controllers/AuthChangePasswordTests.cs`, `backend/Tests/Controllers/PasswordRecoveryTests.cs`, `backend/Tests/Security/**`, `backend/Tests/Integration/JwtSessionVersionTests.cs`, `backend/Tests/Integration/RequiredPasswordChangeAuthorizationTests.cs`, `backend/Tests/Integration/SecureSeedStartupTests.cs`, `backend/Tests/Integration/CriticalAuthenticationTests.cs`, `.codex/docs/specs/fundacao-qualidade-testes/evidencias/T011.md`
- Artefatos de validação: `.tmp/quality/T011/**`; saídas E2E exclusivas quando indicadas, sem versionamento

### Escopo

Completar exclusivamente as lacunas de CT-001, CT-004 e CT-005 identificadas em T001: habilitado versus pendente/desabilitado, credencial inválida, seed/primeira troca, revogação, recuperação neutra e token expirado/reutilizado. Reutilizar casos existentes e o relógio controlado.

### Critérios de conclusão

Cada condição tem teste com resultado/nome rastreável; autorização é exercitada por HTTP quando pertinente. Sucesso persiste nova credencial e invalida sessão/token antigos; erro não altera estado. Não duplicar todos os casos em todas as camadas.

### Plano TDD

- RED: Adicionar primeiro a expectativa ainda não coberta; se passar, registrar caracterização. Um defeito encontrado recebe reprodução e impedimento, nunca alteração artificial de produção para obter RED.
- GREEN: Completar testes e preparação dentro das fixtures de T010. Correção funcional não definida nesta tarefa exige tarefa própria vinculada ao achado.
- REFACTOR: Reduzir repetição de dados, mantendo explícitas as asserções de status e revogação.

### Validação

- `dotnet restore backend/backend.sln --locked-mode --artifacts-path .tmp/quality/T011/backend`
- `dotnet test backend/Tests/Tests.csproj --no-restore --artifacts-path .tmp/quality/T011/backend -c Release --nologo --disable-build-servers --filter "FullyQualifiedName~CriticalAuthenticationTests|FullyQualifiedName~AuthLoginContractTests|FullyQualifiedName~PasswordRecoveryTests|FullyQualifiedName~AuthChangePasswordTests|FullyQualifiedName~Security|FullyQualifiedName~JwtSessionVersionTests|FullyQualifiedName~RequiredPasswordChangeAuthorizationTests|FullyQualifiedName~SecureSeedStartupTests"`
- `dotnet test backend/backend.sln --no-build --no-restore --artifacts-path .tmp/quality/T011/backend -c Release --nologo --disable-build-servers`
- `git diff --check`

### Notas

Posse deliberadamente restrita a testes: esta tarefa não autoriza reescrever autenticação se aparecer uma regressão não prevista.

## T012 — Cobrir o cadastro HTTP e corrigir a recusa de privilégio

- Status: concluída
- Issue: #227
- Dependências: T010
- Onda: 8
- Paralela: sim
- Requisitos: RF-001, RF-002, CA-001, CA-002
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs`, `backend/Tests/Controllers/UsuarioRegistrationValidationTests.cs`, `backend/Tests/Controllers/UserCreationPasswordPolicyTests.cs`, `backend/Tests/Integration/CriticalRegistrationTests.cs`, `.codex/docs/specs/fundacao-qualidade-testes/evidencias/T012.md`
- Artefatos de validação: `.tmp/quality/T012/**`; saídas E2E exclusivas quando indicadas, sem versionamento

### Escopo

Completar CT-002 pela API real e reproduzir QC-003. Garantir conta válida pendente, contrato de campos/senha já definido, recusa controlada de cadastro público de administrador e ausência de persistência indevida. Corrigir apenas o retorno de recusa caso Forbid com texto provoque falha de middleware.

### Critérios de conclusão

Cadastro válido retorna 201/DTO esperado; dados/senha inválidos retornam 400 conforme contrato; tentativa de privilégio retorna 403 controlado, sem criar usuário e sem exceção de esquema de autenticação. Status pendente é comprovado em nova consulta.

### Plano TDD

- RED: Escrever caso HTTP de administrador, observar a recusa defeituosa se presente e registrar QC-003. Casos já corretos recebem caracterização.
- GREEN: Aplicar a menor correção de retorno, preservando validações e DTOs existentes, até os cenários positivos/negativos passarem.
- REFACTOR: Organizar os testes sem reorganizar todo UsuariosController.

### Validação

- `dotnet restore backend/backend.sln --locked-mode --artifacts-path .tmp/quality/T012/backend`
- `dotnet test backend/Tests/Tests.csproj --no-restore --artifacts-path .tmp/quality/T012/backend -c Release --nologo --disable-build-servers --filter "FullyQualifiedName~CriticalRegistrationTests|FullyQualifiedName~UsuarioRegistrationValidationTests|FullyQualifiedName~UserCreationPasswordPolicyTests"`
- `dotnet test backend/backend.sln --no-build --no-restore --artifacts-path .tmp/quality/T012/backend -c Release --nologo --disable-build-servers`
- `git diff --check`

### Notas

T013 vem depois porque também altera UsuariosController. Se a reprodução não confirmar QC-003, registrar a evidência e não modificar o retorno sem necessidade.

## T013 — Vincular aprovação e rejeição de usuários à identidade autenticada

- Status: concluída
- Issue: #227
- Dependências: T012
- Onda: 9
- Paralela: sim
- Requisitos: RF-001, RF-002, CA-001, CA-002
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Controllers/UsuariosController.cs`, `backend/Tests/Integration/CriticalUserApprovalTests.cs`, `backend/Tests/Contracts/UsuarioDataContractTests.cs`, `.codex/docs/specs/fundacao-qualidade-testes/evidencias/T013.md`
- Artefatos de validação: `.tmp/quality/T013/**`; saídas E2E exclusivas quando indicadas, sem versionamento

### Escopo

Completar CT-003 e reproduzir QC-002 nas duas operações de dependentes. Verificar administrador, responsável correto, anônimo, perfil proibido, responsável A com ID de B no corpo, usuário inexistente e solicitação já processada. Se confirmado, derivar identidade das claims e conferir vínculo persistido, sem confiar em AprovadorId fornecido pelo cliente.

### Critérios de conclusão

Aprovação/rejeição autorizada altera somente o usuário alvo e responde conforme o contrato. Tentativas indevidas não alteram estado; solicitação já processada recebe 400 e inexistente 404. Respostas não expõem credenciais/campos internos; contratos existentes continuam válidos.

### Plano TDD

- RED: Caso HTTP com usuário A e corpo indicando B deve exigir recusa sem alteração e expor QC-002 se presente; cobrir também rejeição e retorno seguro.
- GREEN: Implementar a checagem mínima do sujeito autenticado/vínculo e ajustar apenas eventual exposição comprovada no retorno, com DTO existente.
- REFACTOR: Compartilhar a extração de identidade onde útil sem fundir políticas de administrador e responsável.

### Validação

- `dotnet restore backend/backend.sln --locked-mode --artifacts-path .tmp/quality/T013/backend`
- `dotnet test backend/Tests/Tests.csproj --no-restore --artifacts-path .tmp/quality/T013/backend -c Release --nologo --disable-build-servers --filter "FullyQualifiedName~CriticalUserApprovalTests|FullyQualifiedName~UsuarioDataContractTests"`
- `dotnet test backend/backend.sln --no-build --no-restore --artifacts-path .tmp/quality/T013/backend -c Release --nologo --disable-build-servers`
- `git diff --check`

### Notas

Preservar AprovarDTO por compatibilidade. Se surgir necessidade de novo contrato de produto, registrar achado/impedimento antes de ampliar escopo.

## T014 — Cobrir criação de empréstimo com sessão e persistência reais

- Status: concluída
- Issue: #227
- Dependências: T010
- Onda: 10
- Paralela: sim
- Requisitos: RF-001, CA-001
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Controllers/EmprestimosController.cs`, `backend/Tests/Integration/CriticalLoanCreationTests.cs`, `.codex/docs/specs/fundacao-qualidade-testes/evidencias/T014.md`
- Artefatos de validação: `.tmp/quality/T014/**`; saídas E2E exclusivas quando indicadas, sem versionamento

### Escopo

Implementar a cobertura de CT-006: usuário permitido cria empréstimo, solicitante vem da sessão, anônimo e administrador são recusados, resposta/persistência correspondem ao contrato. Fazer correção mínima somente se um desses contratos definidos falhar.

### Critérios de conclusão

201 contém o empréstimo criado e a consulta posterior confirma solicitante/produtos corretos. Recusas não criam registro. Caracterizar 401 legado de administrador; não padronizar todos os status ou redesenhar datas.

### Plano TDD

- RED: Adicionar primeiro testes HTTP positivos/negativos; comportamento existente correto recebe caracterização, defeito recebe falha reproduzível.
- GREEN: Completar cobertura e corrigir apenas divergência mensurável do contrato de criação.
- REFACTOR: Reutilizar preparação de T010, preservando verificações em contexto novo.

### Validação

- `dotnet restore backend/backend.sln --locked-mode --artifacts-path .tmp/quality/T014/backend`
- `dotnet test backend/Tests/Tests.csproj --no-restore --artifacts-path .tmp/quality/T014/backend -c Release --nologo --disable-build-servers --filter "FullyQualifiedName~CriticalLoanCreationTests"`
- `dotnet test backend/backend.sln --no-build --no-restore --artifacts-path .tmp/quality/T014/backend -c Release --nologo --disable-build-servers`
- `git diff --check`

### Notas

Não antecipar correção de DataDevolucao. T015 e T016 são sequenciais em relação a esta tarefa para preservar o contrato de empréstimos.

## T015 — Cobrir aprovação e rejeição de empréstimos e seus efeitos no estoque

- Status: concluída
- Issue: #227
- Dependências: T014
- Onda: 11
- Paralela: não
- Requisitos: RF-001, RF-002, CA-001, CA-002
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Controllers/EmprestimosController.cs`, `backend/Tests/Integration/CriticalLoanDecisionTests.cs`, `.codex/docs/specs/fundacao-qualidade-testes/evidencias/T015.md`
- Artefatos de validação: `.tmp/quality/T015/**`; saídas E2E exclusivas quando indicadas, sem versionamento

### Escopo

Implementar CT-007/CT-008: aprovação reduz estoque uma vez, rejeição não reduz; perfis proibidos, IDs ausentes, estoque insuficiente e reprocessamento são recusados. Incluir mais de um produto para detectar alteração parcial em falha de aprovação.

### Critérios de conclusão

Estado, aprovador e quantidades persistidas são verificados em novo contexto após cada resultado. Falha no segundo item não persiste redução do primeiro. Segunda aprovação/rejeição não aplica efeito duplicado. Nenhum redesenho transacional ou migração é necessário para declarar cobertura; se for necessário para corrigir um achado, registrar dependência complementar.

### Plano TDD

- RED: Escrever testes dos efeitos e recusa, observando a primeira expectativa não atendida; caracterizar os casos já corretos.
- GREEN: Corrigir apenas o fluxo local necessário para preservar invariantes definidos, se houver defeito, sem alterar contratos de domínio não especificados.
- REFACTOR: Extrair verificações pequenas que mantenham clara a ordem validar → persistir.

### Validação

- `dotnet restore backend/backend.sln --locked-mode --artifacts-path .tmp/quality/T015/backend`
- `dotnet test backend/Tests/Tests.csproj --no-restore --artifacts-path .tmp/quality/T015/backend -c Release --nologo --disable-build-servers --filter "FullyQualifiedName~CriticalLoanDecisionTests|FullyQualifiedName~CriticalLoanCreationTests"`
- `dotnet test backend/backend.sln --no-build --no-restore --artifacts-path .tmp/quality/T015/backend -c Release --nologo --disable-build-servers`
- `git diff --check`

### Notas

Não inventar política nova de concorrência entre solicitações. Se aparecer corrupção concorrente não coberta pelo contrato atual, classificá-la e criar tarefa específica antes do aceite.

## T016 — Reproduzir a inconsistência de devolução e registrar seu bloqueio

- Status: concluída
- Issue: #237
- Dependências: T015
- Onda: 12
- Paralela: não
- Requisitos: RF-002, CA-002
- Caminhos sob responsabilidade: `backend/Tests/Integration/LoanReturnCharacterizationTests.cs`, `.codex/docs/specs/fundacao-qualidade-testes/achados/QC-001.md`, `.codex/docs/specs/fundacao-qualidade-testes/evidencias/T016.md`
- Artefatos de validação: `.tmp/quality/T016/**`; saídas E2E exclusivas quando indicadas, sem versionamento

### Escopo

Executar CT-009 com criação, aprovação e tentativa de devolução sem apagar DataDevolucao da fixture. Observar resposta e estoque em contexto novo. Documentar a dupla interpretação da data e os consumidores afetados, sem escolher migração ou semântica faltante.

### Critérios de conclusão

QC-001 é confirmado ou descartado com cenário, SHA e resultado verificáveis. Se confirmado impeditivo, fica alto/aberto e com dependência de definição complementar de contrato, migração e reversão; T027 deve incorporá-lo e T029/T030 não podem declarar aceite. Uma caracterização verde não significa correção.

### Plano TDD

- RED: Verificação objetiva: ausência de reprodução comprobatória reprova a tarefa. Usar teste de caracterização do resultado observado; não manter teste ignorado nem chamar comportamento defeituoso de requisito aprovado.
- GREEN: Entregar reprodução determinística e registro do achado. Esta tarefa pode concluir seu diagnóstico mesmo que o produto continue bloqueado pelo achado alto.
- REFACTOR: Isolar preparação reaproveitando T010, mantendo explícitas a data criada e a ausência de alteração no estoque.

### Validação

- `dotnet restore backend/backend.sln --locked-mode --artifacts-path .tmp/quality/T016/backend`
- `dotnet test backend/Tests/Tests.csproj --no-restore --artifacts-path .tmp/quality/T016/backend -c Release --nologo --disable-build-servers --filter "FullyQualifiedName~LoanReturnCharacterizationTests"`
- `dotnet test backend/backend.sln --no-build --no-restore --artifacts-path .tmp/quality/T016/backend -c Release --nologo --disable-build-servers`
- `git diff --check`

### Notas

Não há tarefa fictícia para implementar uma migração desconhecida. Confirmado o alto, criar/revisar especificação complementar e acrescentar suas tarefas/dependências ao DAG antes de executar a correção. O impedimento não deve ser escondido por fechar esta tarefa de diagnóstico.

## T017 — Caracterizar e tratar os avisos de nulidade no mapeamento de produtos

- Status: concluída
- Issue: #237
- Dependências: T010
- Onda: 10
- Paralela: sim
- Requisitos: RF-002, CA-002
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Mappings/ProdutoMappingProfile.cs`, `backend/Tests/Mappings/MappingConfigurationTests.cs`, `backend/Tests/Mappings/ProductDateMappingTests.cs`, `.codex/docs/specs/fundacao-qualidade-testes/achados/QC-004.md`, `.codex/docs/specs/fundacao-qualidade-testes/evidencias/T017.md`
- Artefatos de validação: `.tmp/quality/T017/**`; saídas E2E exclusivas quando indicadas, sem versionamento

### Escopo

Reproduzir QC-004 com datas válidas, ausentes e malformadas nos contratos de produto existentes. Classificar o impacto dos CS8604; aplicar correção local somente quando a semântica já estiver definida pelo tipo/validação existente.

### Critérios de conclusão

Valores válidos preservam resultado e cultura esperada; ausentes/malformados têm comportamento documentado e testado. Se a correção local for possível, os diagnósticos correspondentes desaparecem por tratamento real. Caso a regra de produto seja ambígua, manter achado classificado e impedimento aplicável, sem converter arbitrariamente vazio em data.

### Plano TDD

- RED: Teste específico evidencia falha de mapeamento quando confirmada; caso correto recebe caracterização e aviso é classificado separadamente.
- GREEN: Aplicar somente tratamento compatível com o contrato ou registrar dependência de decisão, sem operador !/supressão de regra.
- REFACTOR: Reutilizar conversão segura somente entre campos com a mesma semântica e revalidar AutoMapper.

### Validação

- `dotnet restore backend/backend.sln --locked-mode --artifacts-path .tmp/quality/T017/backend`
- `dotnet test backend/Tests/Tests.csproj --no-restore --artifacts-path .tmp/quality/T017/backend -c Release --nologo --disable-build-servers --filter "FullyQualifiedName~ProductDateMappingTests|FullyQualifiedName~MappingConfigurationTests"`
- `dotnet test backend/backend.sln --no-build --no-restore --artifacts-path .tmp/quality/T017/backend -c Release --nologo --disable-build-servers`
- `git diff --check`

### Notas

Não alterar modelos/DTOs ou gerar migração. Achado alto sem solução impede aceite; médio/baixo recebe pendência em T027.

## T018 — Completar a cobertura de interface de autenticação, cadastro e senha

- Status: concluída
- Issue: #227
- Dependências: T004
- Onda: 6
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-001
- Caminhos sob responsabilidade: `frontend/src/test/setup.ts`, `frontend/src/pages/Login.test.tsx`, `frontend/src/pages/CreateAccount.test.tsx`, `frontend/src/pages/ForgotPassword.test.tsx`, `frontend/src/pages/ResetPassword.test.tsx`, `frontend/src/pages/ChangePassword.test.tsx`, `frontend/src/auth/sessionConsumers.test.tsx`, `frontend/src/integration/Auth.integration.test.ts`, `.codex/docs/specs/fundacao-qualidade-testes/evidencias/T018.md`
- Artefatos de validação: `.tmp/quality/T018/**`; saídas E2E exclusivas quando indicadas, sem versionamento

### Escopo

Completar as lacunas de UI de CT-001/CT-002/CT-004/CT-005 identificadas em T001, preservando MSW obrigatório. Verificar validação, erro sem sucesso falso, sessão residual, recuperação neutra e troca obrigatória. Restaurar temporizadores/storage/cookies quando a suíte precisar.

### Critérios de conclusão

Cenários existentes são reutilizados; os novos exercitam interação observável com RTL. Handlers e estado não vazam entre casos; token/sessão não sobrevivem a recusa que exige limpeza. Falhas da API não são confundidas com validação local.

### Plano TDD

- RED: Escrever primeiro os cenários ausentes e testes de isolamento; se o comportamento já passa, registrar caracterização e não modificar produção.
- GREEN: Completar testes/limpeza e comprovar casos positivos/negativos sem chamadas reais de rede.
- REFACTOR: Reduzir duplicação de handlers e preparação sem mudar o que cada teste observa.

### Validação

- `npm run test -- --run src/pages/Login.test.tsx src/pages/CreateAccount.test.tsx src/pages/ForgotPassword.test.tsx src/pages/ResetPassword.test.tsx src/pages/ChangePassword.test.tsx src/auth/sessionConsumers.test.tsx src/integration/Auth.integration.test.ts`
- `npm run test -- --run`
- `npm run lint`
- `npm run build`
- `git diff --check`

### Notas

Posse limitada à cobertura/isolamento. Um defeito funcional novo exige achado e tarefa própria; não autoriza refatorar todas as páginas de autenticação.

## T019 — Cobrir aprovação e rejeição de cadastro pela interface

- Status: concluída
- Issue: #227
- Dependências: T004, T018
- Onda: 7
- Paralela: sim
- Requisitos: RF-001, CA-001
- Caminhos sob responsabilidade: `frontend/src/pages/RegistrationRequests.tsx`, `frontend/src/pages/RegistrationRequests.critical.test.tsx`, `frontend/src/integration/Users.ts`, `frontend/src/integration/Users.approval.test.ts`, `.codex/docs/specs/fundacao-qualidade-testes/evidencias/T019.md`
- Artefatos de validação: `.tmp/quality/T019/**`; saídas E2E exclusivas quando indicadas, sem versionamento

### Escopo

Cobrir CT-003 com as ações reais da tela usando MSW: aprovar/rejeitar, atualizar a lista, erro de permissão, solicitação já processada e falha transitória. Preservar o contrato HTTP da techspec e os testes de navegação/responsividade já presentes.

### Critérios de conclusão

Sucesso apresenta estado atualizado e erro não simula aprovação. Requisição usa ID e método corretos; falha não remove indevidamente a solicitação da lista. A tela preserva feedback e sessão conforme o tratamento de erros existente.

### Plano TDD

- RED: Testar interação com lista pendente e respostas de sucesso/erro antes de modificar consumidor/tela; casos corretos são caracterização.
- GREEN: Corrigir somente lacuna comprovada de envio/estado/feedback, mantendo API e componentes existentes.
- REFACTOR: Organizar os handlers por cenário e remover duplicação local sem mudar navegação.

### Validação

- `npm run test -- --run src/pages/RegistrationRequests.critical.test.tsx src/integration/Users.approval.test.ts src/pages/RegistrationRequests.errors.test.tsx src/pages/RegistrationRequests.navigation.test.tsx`
- `npm run lint`
- `npm run build`
- `git diff --check`

### Notas

Testes são de UI com API simulada. A validação de middleware/backend pertence a T013; sua comprovação conjunta é feita em T025.

## T020 — Cobrir solicitação de empréstimo pela interface

- Status: concluída
- Issue: #227
- Dependências: T004, T018
- Onda: 8
- Paralela: sim
- Requisitos: RF-001, CA-001
- Caminhos sob responsabilidade: `frontend/src/pages/mentor/LoanCreation.tsx`, `frontend/src/pages/mentor/LoanCreation.critical.test.tsx`, `frontend/src/integration/Loans.ts`, `frontend/src/integration/Loans.creation.test.ts`, `.codex/docs/specs/fundacao-qualidade-testes/evidencias/T020.md`
- Artefatos de validação: `.tmp/quality/T020/**`; saídas E2E exclusivas quando indicadas, sem versionamento

### Escopo

Cobrir CT-006 pela tela de criação: seleção de produtos, envio do contrato existente e sucesso; recusa/indisponibilidade da API mantém feedback sem sucesso falso nem envio duplicado. Não substituir a cobertura responsiva existente.

### Critérios de conclusão

Corpo enviado mantém produtoId/quantidade/diasParaDevolucao e usa sessão existente. Estado de envio impede duplicação enquanto a requisição está pendente; erro preserva caminho de correção/retentativa. Regras de negócio novas não são introduzidas.

### Plano TDD

- RED: Escrever teste de interação com requisição controlada pendente, sucesso e falha; observar lacuna real ou registrar caracterização.
- GREEN: Aplicar a menor mudança local necessária nos estados de envio/retorno e no consumidor.
- REFACTOR: Consolidar mocks/dados repetidos mantendo explícita a requisição esperada.

### Validação

- `npm run test -- --run src/pages/mentor/LoanCreation.critical.test.tsx src/pages/mentor/LoanCreation.responsive.test.tsx src/integration/Loans.creation.test.ts src/integration/Loans.contract.test.ts`
- `npm run lint`
- `npm run build`
- `git diff --check`

### Notas

T021 depende desta tarefa por também possuir Loans.ts. Nenhuma mudança na política de datas é permitida aqui.

## T021 — Cobrir decisão de empréstimos pela interface administrativa

- Status: concluída
- Issue: #227
- Dependências: T020
- Onda: 9
- Paralela: sim
- Requisitos: RF-001, CA-001
- Caminhos sob responsabilidade: `frontend/src/pages/admin/LoansRequest.tsx`, `frontend/src/pages/admin/LoansRequest.critical.test.tsx`, `frontend/src/integration/Loans.ts`, `frontend/src/integration/Loans.decision.test.ts`, `.codex/docs/specs/fundacao-qualidade-testes/evidencias/T021.md`
- Artefatos de validação: `.tmp/quality/T021/**`; saídas E2E exclusivas quando indicadas, sem versionamento

### Escopo

Cobrir CT-007/CT-008 pela tela: aprovação/rejeição bem-sucedida, estoque insuficiente, reprocessamento, proibição e falha transitória. Validar métodos/IDs e estado da lista sem reescrever o catálogo de erros.

### Critérios de conclusão

Sucesso atualiza a solicitação; erro não remove a pendência nem a apresenta como processada. 400/403/404 e falha de rede usam tratamento vigente. As ações mantêm navegação e comportamento responsivo.

### Plano TDD

- RED: Criar testes das ações com respostas MSW controladas e exigir efeitos visíveis; registrar caracterização onde já correto.
- GREEN: Completar consumidor/estado/feedback somente quando o teste demonstra lacuna.
- REFACTOR: Extrair preparação repetida e preservar asserções de ID, método e resultado.

### Validação

- `npm run test -- --run src/pages/admin/LoansRequest.critical.test.tsx src/pages/admin/LoansRequest.errors.test.tsx src/pages/admin/LoansRequest.navigation.test.tsx src/integration/Loans.decision.test.ts src/integration/Loans.contract.test.ts`
- `npm run lint`
- `npm run build`
- `git diff --check`

### Notas

A evidência de estoque persistido fica em T015 e a jornada real em T026.

## T022 — Fixar imagens e alinhar os builds do ambiente de validação

- Status: concluída
- Issue: #227
- Dependências: T003, T004, T005, T006, T011, T013, T016, T017, T018, T019, T021
- Onda: 13
- Paralela: não
- Requisitos: RNF-001, RNF-002, CA-001
- Caminhos sob responsabilidade: `.github/quality/toolchain.json`, `backend/Dockerfile`, `backend/.dockerignore`, `frontend/Dockerfile`, `frontend/.dockerignore`, `docker-compose-e2e.yml`, `backend/Tests/Infrastructure/PostgreSqlContainerFixture.cs`, `.github/scripts/tests/test_backend_container.py`, `.github/scripts/tests/test_frontend_container.py`, `.github/scripts/tests/test_quality_images.py`, `.codex/docs/specs/fundacao-qualidade-testes/evidencias/T022.md`
- Artefatos de validação: `.tmp/quality/T022/**`; saídas E2E exclusivas quando indicadas, sem versionamento

### Escopo

Fixar por digest as imagens usadas no build/E2E, preservar PostgreSQL 15 no Compose e 16 no Testcontainers, e registrar a relação imagem/versão no contrato de T002. Adaptar COPY/restore dos Dockerfiles aos locks/props e metadados de build de T003–T005. Publicar portas de teste somente em loopback.

### Critérios de conclusão

Builds frontend/backend e saúde do Compose passam com pins. SDK da imagem corresponde ao global.json, sem COPY de caminho fora do contexto backend. Locks/propriedades são efetivamente usados no restore da imagem. Nenhum dado/volume de outro projeto é reutilizado. Relatório registra digests e revisão do ambiente, preservando auditorias existentes.

### Plano TDD

- RED: Testes dos contratos de imagens/restore falham para tag flutuante, lock não copiado, versão divergente e porta exposta indiscriminadamente.
- GREEN: Aplicar pins e ajustes mínimos dos contextos/builds; resolver digests reais, sem migrar major ou desligar atualizações de segurança para obter verde.
- REFACTOR: Consolidar argumentos/metadados de build sem alterar entrada/saída dos contêineres de produção.

### Validação

- `python -B -m unittest discover -s .github/scripts/tests -p test_quality_images.py -v`
- `python -B -m unittest discover -s .github/scripts/tests -p test_backend_container.py -v`
- `python -B -m unittest discover -s .github/scripts/tests -p test_frontend_container.py -v`
- `docker compose -p lab-solos-quality-t022 -f docker-compose-e2e.yml config --quiet`
- `docker compose -p lab-solos-quality-t022 -f docker-compose-e2e.yml up -d --build --wait`
- `docker compose -p lab-solos-quality-t022 -f docker-compose-e2e.yml down --volumes --remove-orphans`
- `git diff --check`

### Notas

Executar limpeza em finally/etapa always, com exatamente o projeto criado. É uma tarefa de ambiente indivisível entre imagens dos dois componentes; não inclui CI. Não executar em paralelo com quem altera fontes usadas pelos builds. A onda é conservadora: só começa quando as ondas funcionais anteriores terminarem, pois build de imagem lê suas fontes.

## T023 — Preparar dados E2E próprios de cada cenário

- Status: concluída
- Issue: #227
- Dependências: T010, T022
- Onda: 14
- Paralela: não
- Requisitos: RF-001, RNF-001, RNF-002, CA-001
- Caminhos sob responsabilidade: `backend/TestSupport/E2ESeed/**`, `backend/backend.sln`, `backend/Tests/Tests.csproj`, `backend/Tests/packages.lock.json`, `backend/Tests/Infrastructure/E2ESeedIsolationTests.cs`, `backend/Tests/Infrastructure/E2ESeedSafetyTests.cs`, `docker-compose-e2e.yml`, `.github/scripts/tests/test_quality_e2e_seed.py`, `.codex/docs/specs/fundacao-qualidade-testes/evidencias/T023.md`
- Artefatos de validação: `.tmp/quality/T023/**`; saídas E2E exclusivas quando indicadas, sem versionamento

### Escopo

Criar utilitário .NET exclusivo de testes em backend/TestSupport/E2ESeed, reutilizando hash/serviço de credenciais e entidades da aplicação. Executá-lo por serviço Compose de preparação, com credenciais sintéticas passadas por ambiente e identificador de cenário por argumento. Gerar administrador/usuários/produtos próprios sem alterar a conta global do seed, sem endpoint novo e sem modificar esquema de produção.

### Critérios de conclusão

CLI documenta --help e --scenario; responde com contrato JSON de IDs/dados sintéticos necessário às jornadas. Recusa ambiente/banco não reconhecidos; o serviço só usa a conexão sintética do Compose. Dois cenários não compartilham registros. Nova preparação do mesmo cenário é controlada e não remove dados de terceiros. Projeto/locks são versionados e seu teste não exige stack E2E no dotnet test normal.

### Plano TDD

- RED: Testes de segurança recusam conexão/ambiente inadequados; testes PostgreSQL provam isolamento, preparação repetida e hash verificável pelo serviço real.
- GREEN: Implementar o utilitário e o serviço Compose de escopo restrito, com dependência da saúde/schema da aplicação e sem credenciais em argumentos/logs.
- REFACTOR: Compartilhar criação de dados dentro do utilitário, sem incorporar comportamento de seed de teste ao executável da aplicação.

### Validação

- `dotnet restore backend/backend.sln --locked-mode --artifacts-path .tmp/quality/T023/backend`
- `dotnet test backend/Tests/Tests.csproj --no-restore --artifacts-path .tmp/quality/T023/backend -c Release --nologo --disable-build-servers --filter "FullyQualifiedName~E2ESeedIsolationTests|FullyQualifiedName~E2ESeedSafetyTests"`
- `dotnet test backend/backend.sln --no-build --no-restore --artifacts-path .tmp/quality/T023/backend -c Release --nologo --disable-build-servers`
- `python -B -m unittest discover -s .github/scripts/tests -p test_quality_e2e_seed.py -v`
- `dotnet run --project backend/TestSupport/E2ESeed --artifacts-path .tmp/quality/T023/seed -- --help`
- `docker compose -p lab-solos-quality-t023 -f docker-compose-e2e.yml up -d --build --wait`
- `docker compose -p lab-solos-quality-t023 -f docker-compose-e2e.yml run --rm e2e-seed --scenario t023-isolamento`
- `docker compose -p lab-solos-quality-t023 -f docker-compose-e2e.yml down --volumes --remove-orphans`
- `git diff --check`

### Notas

O utilitário e o serviço e2e-seed são novos entregáveis do mecanismo de preparação previsto na techspec. O serviço deve ficar em perfil de preparação para não bloquear up --wait da stack. Atualizar locks de T003 se ProjectReference mudar, antes das validações bloqueadas.

## T024 — Isolar Playwright e migrar o ciclo de credenciais para conta própria

- Status: concluída
- Issue: #227
- Dependências: T011, T018, T023
- Onda: 15
- Paralela: não
- Requisitos: RF-001, RF-002, RNF-001, RNF-002, CA-001, CA-002
- Caminhos sob responsabilidade: `frontend/playwright.config.ts`, `frontend/e2e/**`, `.github/scripts/tests/test_quality_playwright.py`, `.codex/docs/specs/fundacao-qualidade-testes/evidencias/T024.md`
- Artefatos de validação: `.tmp/quality/T024/**`; saídas E2E exclusivas quando indicadas, sem versionamento

### Escopo

Separar projetos real/ui e classificar todos os casos atuais sem reduzir cobertura; dividir arquivos mistos se necessário. Criar helper de dados que use T023 e E2E_COMPOSE_PROJECT. Migrar o ciclo de credenciais para conta por cenário, selecionar mensagens do Mailpit por destinatário e eliminar limpeza global. Fixar um worker/zero retries no projeto real; adicionar lacunas reais de login/recuperação/troca de CT-001/CT-004/CT-005.

### Critérios de conclusão

Descoberta mantém os cenários anteriores e identifica projetos; nenhuma jornada real usa route.fulfill em endpoints de domínio. Conta administrativa global não é alterada. Casos positivos/negativos de credenciais passam isoladamente, em nova stack e novamente na mesma stack. Logs não publicam tokens; classificação não chama mocks de API real.

### Plano TDD

- RED: Contrato/ensaio de isolamento falha quando usa seed global, caixa global ou retries; novos casos reais observam a lacuna de preparação antes da correção.
- GREEN: Implementar projetos e helpers, migrar casos existentes preservando asserções e completar a recuperação pela interface quando faltar.
- REFACTOR: Consolidar login/preparação/leitura de e-mail sem esconder as chamadas de rede e asserções de revogação.

### Validação

- `python -B -m unittest discover -s .github/scripts/tests -p test_quality_playwright.py -v`
- `npm run test:e2e:list`
- `npm run test:e2e -- --project=real --grep credenciais`
- `npm run test:e2e -- --project=ui`
- `npm run lint`
- `npm run build`
- `git diff --check`

### Notas

T024 deve identificar os casos de autenticação/recuperação/troca pelo marcador textual credenciais para que o filtro seja executável e não vazio. Usar a sequência E2E comum com projeto t024. Evidenciar QC-005 e registrar diferenças na contagem; os artefatos sob e2e/infra/artifacts não são arquivos de contribuição.

## T025 — Executar cadastro e aprovação completos com navegador e API reais

- Status: concluída
- Issue: #227
- Dependências: T012, T013, T019, T024
- Onda: 16
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-001
- Caminhos sob responsabilidade: `frontend/e2e/critical/registration-approval.spec.ts`, `frontend/src/integration/Class.ts`, `frontend/src/integration/Class.approval.test.ts`, `.codex/docs/specs/fundacao-qualidade-testes/evidencias/T025.md`
- Artefatos de validação: `.tmp/quality/T025/**`; saídas E2E exclusivas quando indicadas, sem versionamento

### Escopo

Entregar jornada CT-002/CT-003 com cadastro pela interface, solicitação pendente, aprovação por perfil permitido e acesso posterior. Incluir erro de cadastro e uma decisão recusada/reprocessada com verificação de estado. Usar fixtures de T024 sem alterar sua interface.

### Critérios de conclusão

O caso real atravessa frontend, API e PostgreSQL, sem route.fulfill. Usuários e solicitações pertencem ao cenário; retorno inválido não produz sucesso visual nem usuário habilitado. Reexecução não depende de dados da primeira tentativa.

### Plano TDD

- RED: Escrever a jornada com expectativa observável antes de qualquer ajuste local; se já passar com fixtures existentes, registrar caracterização integrada.
- GREEN: Completar somente os cenários e seletores robustos; defeito em produto é encaminhado ao dono com achado e dependência explícitos.
- REFACTOR: Reduzir passos repetidos usando os helpers estáveis de T024, preservando o que é feito na UI.

### Validação

- `npm run test:e2e -- critical/registration-approval.spec.ts --project=real --output=e2e/infra/artifacts/T025 --reporter=list`
- `npm run test:e2e:list`
- `git diff --check`

### Notas

Executar a stack t025 com portas exclusivas e variáveis da tabela de ambientes. Não alterar helper/configuração compartilhados durante a onda 16. Falha de seletor deve ser distinguida de falha de produto.

## T026 — Executar solicitação e decisão de empréstimo com API real

- Status: concluída
- Issue: #227
- Dependências: T015, T020, T021, T024
- Onda: 16
- Paralela: sim
- Requisitos: RF-001, RNF-001, CA-001
- Caminhos sob responsabilidade: `frontend/e2e/critical/loans.spec.ts`, `.codex/docs/specs/fundacao-qualidade-testes/evidencias/T026.md`
- Artefatos de validação: `.tmp/quality/T026/**`; saídas E2E exclusivas quando indicadas, sem versionamento

### Escopo

Entregar CT-006/CT-007/CT-008 integrados: usuário solicita, administrador aprova/rejeita, listas mostram resultado; incluir estoque insuficiente/reprocessamento sem efeito indevido. Usar contas/produtos por cenário fornecidos por T024.

### Critérios de conclusão

A jornada percorre navegador e backend real; confirma os efeitos observáveis e consulta de estado por API autorizada quando necessário. Rejeição e falha não baixam estoque. Nenhum cenário altera produto/conta de outra tarefa e não há simulação de endpoint de domínio.

### Plano TDD

- RED: Escrever primeiro ações/expectativas; comportamento correto passa como caracterização integrada, defeito vira reprodução vinculada ao achado.
- GREEN: Completar os casos E2E com helpers estáveis, sem modificar produção para facilitar dados ou status.
- REFACTOR: Compartilhar preparação local apenas quando não ocultar diferenças entre aprovação, rejeição e recusa.

### Validação

- `npm run test:e2e -- critical/loans.spec.ts --project=real --output=e2e/infra/artifacts/T026 --reporter=list`
- `npm run test:e2e:list`
- `git diff --check`

### Notas

Executar stack t026 em portas próprias. CT-009/QC-001 não é disfarçado como devolução aprovada nem resolvido nesta jornada.

## T027 — Consolidar o inventário, a dívida histórica e os impedimentos

- Status: concluída
- Issue: #237
- Dependências: T009, T011, T012, T013, T014, T015, T016, T017, T018, T019, T020, T021, T022, T023, T024, T025, T026
- Onda: 17
- Paralela: não
- Requisitos: RF-002, RNF-001, RNF-002, CA-002
- Caminhos sob responsabilidade: `.github/quality/baseline.json`, `.github/quality/functional-findings.json`, `.github/quality/policy.json`, `.codex/docs/specs/fundacao-qualidade-testes/inventario.md`, `.codex/docs/specs/fundacao-qualidade-testes/pendencias.md`, `.codex/docs/specs/fundacao-qualidade-testes/cobertura.md`, `.codex/docs/specs/fundacao-qualidade-testes/achados/QC-006.md`, `.codex/docs/specs/fundacao-qualidade-testes/evidencias/T027.md`
- Artefatos de validação: `.tmp/quality/T027/**`; saídas E2E exclusivas quando indicadas, sem versionamento

### Escopo

Coletar base e revisão candidata sob a mesma política, consolidar diagnósticos estáticos e registros funcionais QC-001–QC-006 e gerar inventario.md. Triar QC-006 com verificação de recurso/impacto; não classificar pacote grande como alto automaticamente. Criar pendências individuais para médios/baixos e vínculos de evidência/correção.

### Critérios de conclusão

Cada achado tem ID, módulo, severidade original/normalizada, reprodução, responsável por papel e estado. Baseline contém apenas dívida histórica média/baixa com pendência; altos abertos permanecem no inventário e fazem check retornar 1. Não aceitar achados novos pela simples edição do baseline. Cobertura liga testes finais aos CTs e relata impedimentos, inclusive QC-001.

### Plano TDD

- RED: Verificação objetiva da coleta/triagem reprova inventário incompleto, regra desconhecida ou pendência sem responsável. Testes de T009 demonstram o bloqueio de alto e de nova ocorrência.
- GREEN: Completar classificação e documentação; registrar o resultado real do check, inclusive violação esperada por alto aberto, sem convertê-la em aprovação.
- REFACTOR: Consolidar pendências duplicadas preservando identidade de cada ocorrência e histórico de remediação.

### Validação

- `python -B -m unittest discover -s .github/scripts/tests -p test_quality_baseline.py -v`
- `python -B .github/scripts/quality_baseline.py collect --output .tmp/quality/T027/current.json`
- `python -B .github/scripts/quality_baseline.py check --current .tmp/quality/T027/current.json --base-ref origin/develop`
- `python -B .github/scripts/quality_baseline.py render --current .tmp/quality/T027/current.json --output .codex/docs/specs/fundacao-qualidade-testes/inventario.md`
- `git diff --check`

### Notas

Tarefa conclui o inventário quando completo, mesmo que relate bloqueio de produto; isso nunca conclui CA-002. Alto aberto ou violação nova exige revisão do plano com tarefas específicas antes de T029. Não usar uma tarefa genérica para corrigir todos os achados desconhecidos nem inventar o contrato de QC-001.

## T028 — Integrar análise e resultado obrigatório ao CI pré-merge

- Status: concluída
- Issue: #237
- Dependências: T027
- Onda: 18
- Paralela: não
- Requisitos: RF-003, RNF-001, RNF-002, CA-002, CA-003
- Caminhos sob responsabilidade: `.github/workflows/container-ci.yml`, `.github/workflows/security-dependencies.yml`, `.github/scripts/check_quality_gate.py`, `.github/scripts/tests/test_quality_gate.py`, `.github/scripts/tests/test_container_ci_workflow.py`, `.github/scripts/tests/test_security_dependencies_workflow.py`, `.github/quality/toolchain.json`, `.codex/docs/specs/fundacao-qualidade-testes/operacao.md`, `.codex/docs/specs/fundacao-qualidade-testes/evidencias/T028.md`
- Artefatos de validação: `.tmp/quality/T028/**`; saídas E2E exclusivas quando indicadas, sem versionamento

### Escopo

Criar Code quality baseline e Quality gate no workflow existente, usar pins/locks, metadados determinísticos, relatórios por suíte e SHA base do evento. O agregador só passa se todas as dependências obrigatórias tiverem success, inclusive a varredura existente quando exigida. Manter jobs independentes paralelos, timeouts e limpeza. Documentar instalação/validação local e inspeção administrativa necessária.

### Critérios de conclusão

Eventos cobrem opened/synchronize/reopened/edited e ready_for_review; merge_group é incluído se aplicável à fila verificada. Jobs obrigatórios não são omitidos por filtro de caminho. Agregador always falha para failure/cancelled/skipped/ausente e zero testes/relatório incompleto é falha no produtor. Bootstrap de baseline e referência base funcionam também em fork sem secrets. Uploads diagnósticos e limpeza não mascaram resultado.

### Plano TDD

- RED: Testes executáveis do avaliador e contratos do workflow falham para dependência omitida, skip aceito, restore sem lock, relatório ausente, evento incorreto e ferramenta não fixada.
- GREEN: Implementar avaliador/integração com os scripts prontos, adicionar artefatos e preservar segurança, release e validação do manual. Resolver filtros do workflow de dependências se ele for exigido pela regra remota.
- REFACTOR: Consolidar leitura de pins e avaliação de resultados, mantendo nomes dos checks já exigidos até transição administrativa comprovada.

### Validação

- `python -B -m unittest discover -s .github/scripts/tests -p test_quality_gate.py -v`
- `python -B -m unittest discover -s .github/scripts/tests -p test_container_ci_workflow.py -v`
- `python -B -m unittest discover -s .github/scripts/tests -p test_security_dependencies_workflow.py -v`
- `python -B -m unittest discover -s .github/scripts/tests -p 'test_*.py' -v`
- `bash .github/scripts/install_actionlint.sh .tmp/actionlint`
- `.tmp/actionlint/actionlint .github/workflows/container-ci.yml .github/workflows/security-dependencies.yml`
- `git diff --check`

### Notas

Somente entrega local do workflow e procedimento. É possível demonstrar que o gate está correto ao recusar altos conhecidos; isso não torna o produto apto a merge. Consulta de regra remota é leitura; alteração da proteção/PR de prova fica em T030.

## T029 — Comprovar reprodução local e integração completa do aceite

- Status: concluída
- Issue: #227
- Dependências: T028
- Onda: 19
- Paralela: não
- Requisitos: RF-001, RF-002, RNF-001, RNF-002, CA-001, CA-002
- Caminhos sob responsabilidade: `.codex/docs/specs/fundacao-qualidade-testes/cobertura.md`, `.codex/docs/specs/fundacao-qualidade-testes/inventario.md`, `.codex/docs/specs/fundacao-qualidade-testes/pendencias.md`, `.codex/docs/specs/fundacao-qualidade-testes/operacao.md`, `.codex/docs/specs/fundacao-qualidade-testes/evidencias/T029.md`
- Artefatos de validação: `.tmp/quality/T029/**`; saídas E2E exclusivas quando indicadas, sem versionamento

### Escopo

Validar a combinação final em checkout/saída isolados, instalação limpa, suíte completa e coleta. Repetir o projeto real em stack nova e um cenário isolado na mesma stack, conforme RNF-001. Comparar achados normalizados e dados/efeitos, sem exigir igualdade de SHA/hora ou binários entre sistemas distintos.

### Critérios de conclusão

Todas as suítes críticas têm casos positivos/negativos, zero ignorados e descoberta não vazia; testes Python ignorados por Windows são comprovados no Linux antes do aceite. Check retorna 0 na revisão final, nenhum alto aberto e nenhuma nova violação. Instalação/execução sob pins e evidências locais/CI são coerentes; ajustes de produto não pertencem a esta tarefa.

### Plano TDD

- RED: Checklist de aceite falha para qualquer relatório ausente, alto aberto, caso crítico ignorado ou dependência complementar de QC-001 não resolvida.
- GREEN: Executar e registrar a validação cruzada apenas quando as tarefas de remediação necessárias estiverem concluídas. Caso contrário, marcar T029 bloqueada com IDs e comandos, sem alterar a política.
- REFACTOR: Revisar apenas organização das evidências e referências; não esconder preexistências ou executar refatorações funcionais nesta integração.

### Validação

- `python -B .github/scripts/check_quality_toolchain.py`
- `dotnet restore backend/backend.sln --locked-mode --artifacts-path .tmp/quality/T029/backend`
- `dotnet test backend/backend.sln --no-restore --artifacts-path .tmp/quality/T029/backend -c Release --nologo --disable-build-servers --logger trx --results-directory .tmp/quality/T029/test-results`
- `npm ci`
- `npm run lint`
- `npm run build`
- `npm run test -- --run`
- `npm run test:e2e`
- `npm run test:e2e -- --project=real`
- `python -B -m unittest discover -s .github/scripts/tests -p 'test_*.py' -v`
- `python -B .github/scripts/quality_baseline.py collect --output .tmp/quality/T029/current.json`
- `python -B .github/scripts/quality_baseline.py check --current .tmp/quality/T029/current.json --base-ref origin/develop`
- `git diff --check`

### Notas

Condição adicional obrigatória: T027 sem altos abertos/violações novas, incluindo conclusão das tarefas complementares acrescentadas após a triagem. T029 não fica pronta apenas porque T028 terminou. Evidências da configuração remota continuam pendentes até T030.

## T030 — Comprovar o bloqueio de merge em develop e fechar o aceite

- Status: concluída
- Issue: #237
- Dependências: T029
- Onda: 20
- Paralela: não
- Requisitos: RF-003, RNF-001, CA-001, CA-002, CA-003
- Caminhos sob responsabilidade: `.codex/docs/specs/fundacao-qualidade-testes/operacao.md`, `.codex/docs/specs/fundacao-qualidade-testes/aceite.md`, `.codex/docs/specs/fundacao-qualidade-testes/evidencias/T030.md`
- Artefatos de validação: `.tmp/quality/T030/**`; saídas E2E exclusivas quando indicadas, sem versionamento

### Escopo

Inspecionar a regra aplicada a develop e, quando autorizado, configurar checks obrigatórios sem remover proteções existentes. Usar PR de prova destinado a develop com falha proposital controlada, observar bloqueio e revalidar a revisão corrigida. Consolidar evidências e estado de aceite das duas issues.

### Critérios de conclusão

Regra exige os checks corretos vindos de GitHub Actions e revisão atualizada contra a base. PR destinado/retargeted a develop executa as verificações antes de merge; falha proposital impede integração e revisão corrigida só fica apta após sucesso. Alto aberto ou dependência faltante impede aceite. Registrar links/SHA dos runs, nomes dos checks e regra efetiva; não basta YAML ou workflow_dispatch.

### Plano TDD

- RED: Verificação operacional: PR de prova com falha de lint/teste/análise deve permanecer impedido de merge. Não introduzir regressão no código correto da branch de trabalho para fabricar RED unitário.
- GREEN: Após corrigir a falha isolada da prova, obter sucesso dos checks na revisão correspondente e registrar evidência administrativa. Não fazer merge para provar o bloqueio.
- REFACTOR: Consolidar procedimento de diagnóstico/transição/reversão e fechar somente lacunas documentais de aceite.

### Validação

- `gh api repos/ifpebj-ti/lab-solos/branches/develop/protection`
- `gh api repos/ifpebj-ti/lab-solos/rules/branches/develop`
- `gh pr checks <numero-do-PR-de-prova> --required`
- `gh pr view <numero-do-PR-de-prova> --json baseRefName,headRefOid,mergeStateStatus,statusCheckRollup`
- `git diff --check`

### Notas

Operação externa planejada, não autorizada pelo pedido de criar tasks.md. Antes de qualquer mutação, verificar autorização já existente na sessão; se faltar, concluir pacote/procedimento local e solicitar somente a autorização necessária. Tokens/identidades não são impressos. Usar branch/PR com base develop e template do repositório. PR e alterações externas de prova não são executados automaticamente pelo orquestrador; não fechar issues ou fazer merge. Os placeholders de PR são identificadores obtidos nesta etapa, não comandos novos.

## T031 — Separar prazo e efetivação da devolução

- Status: concluída
- Issue: #237
- Dependências: T016, T029
- Onda: 21
- Paralela: sim
- Requisitos: RF-001, RF-002, RNF-001, CA-001, CA-002
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/Models/Emprestimo.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Emprestimos/EmprestimoDTO.cs`, `backend/LabSolos-Server-DotNet8/DTOs/Produtos/HistoricoSaidaProdutoDTO.cs`, `backend/LabSolos-Server-DotNet8/Mappings/EmprestimoMappingProfile.cs`, `backend/LabSolos-Server-DotNet8/Controllers/EmprestimosController.cs`, `backend/LabSolos-Server-DotNet8/Services/NotificacaoService.cs`, `backend/LabSolos-Server-DotNet8/Services/ProdutoService.cs`, `backend/LabSolos-Server-DotNet8/Data/Migrations/**`, `backend/Tests/Integration/LoanReturnCharacterizationTests.cs`, `backend/Tests/Integration/**`, `frontend/src/contracts/loan.ts`, `.codex/docs/specs/fundacao-qualidade-testes/achados/QC-001.md`, `.codex/docs/specs/fundacao-qualidade-testes/evidencias/T031.md`
- Artefatos de validação: `.tmp/quality/T031/**`; saídas E2E exclusivas quando indicadas, sem versionamento

### Escopo

Definir `DataDevolucao` como data efetiva, nula enquanto o empréstimo não for
devolvido, e adicionar `DataPrevistaDevolucao` como prazo. Migrar o legado
assumindo que os valores existentes em `DataDevolucao` eram prazos, pois o
fluxo anterior não conseguia concluir a devolução com esse valor preenchido;
registrar essa hipótese e a reversão da migration. Atualizar API, histórico,
notificações e contrato frontend sem remover campos existentes.

### Critérios de conclusão

Criar → aprovar → devolver por HTTP/PostgreSQL retorna 204, preserva o prazo,
preenche exatamente uma data efetiva e repõe estoque uma única vez. Repetir a
devolução retorna 400 sem novo efeito. Registros não devolvidos continuam
selecionáveis por prazo; DTOs expõem prazo e efetivação sem ambiguidade. A
migration é aplicável e reversível no banco limpo, e a regressão completa passa
sem ignorados novos.

### Plano TDD

- RED: manter a caracterização de T016 esperando devolução bem-sucedida e
  demonstrar o 400 causado pelo campo sobrecarregado.
- GREEN: adicionar a coluna/migration e ajustar o fluxo, com teste HTTP e
  persistência em contexto novo para prazo, efetivação e estoque.
- REFACTOR: centralizar os nomes do contrato e atualizar consumidores sem
  apagar a compatibilidade do DTO.

### Validação

- `dotnet ef migrations list` e aplicação da migration em PostgreSQL limpo
- `dotnet test backend/Tests/Tests.csproj --filter "FullyQualifiedName~LoanReturn"`
- `dotnet test backend/backend.sln --no-restore -c Release`
- `npm run test -- --run`
- `git diff --check`

### Notas

Não alterar a proteção remota nesta tarefa. A decisão de compatibilidade da
migration deve ficar explícita na evidência; se dados históricos reais não
puderem ser classificados como prazo, parar e reabrir a decisão de domínio em
vez de fazer backfill silencioso.

## Log de execução

| Data | Tarefa | Resultado | Testes/evidências | Observações |
|---|---|---|---|---|
| 2026-09-14 | T001 | concluída | `dotnet sln ... list` (0); `dotnet test ... --list-tests` (125 casos); `npm run test:e2e:list` (201 casos); `git diff --check` (0); evidências T001 | Matriz CT-001–CT-009 e candidatos QC-001–QC-006 documentados; Issue #227 permanece `In Progress`; sem alteração de código |
| 2026-09-14 | T002 | concluída | 11 testes direcionados; 251 testes Python completos, 2 skips preexistentes no Windows; `--help` (0); `git diff --check` (0) | Pins e verificador entregues; execução real retorna divergência acionável para Node/Python locais; Issue #227 permanece `In Progress` |
| 2026-09-14 | T003 | concluída | 5 testes direcionados; restore com lock e teste backend (125 aprovados); fixture divergente falha; `git diff --check` (0) | SDK/locks entregues; regressão Python teve 1 erro fora do escopo por `quality_baseline.py` ausente e 2 skips preexistentes; Issue #227 permanece `In Progress` |
| 2026-09-14 | T007 | concluída | 12 testes direcionados; regressão Python (271 aprovados, 2 skips preexistentes); `git diff --check` (0) | Normalização, adaptadores e política entregues; coleta real/check/render permanecem para T008/T009; Issue #237 permanece `In Progress` |
| 2026-09-14 | T004 | concluída | 3 testes Python; Vitest direcionado (4) e completo (563); `npm ci`, lint, build e `git diff --check` (0) | Pins/metadados frontend entregues; runtime local Node 24/npm 11 diverge dos pins e avisos de build são preexistentes; Issue #227 permanece `In Progress` |
| 2026-09-14 | T005 | concluída | 2 testes direcionados; restore bloqueado, rebuild com SARIF 2.1 (141 app/84 testes), backend (125 aprovados), `git diff --check` (0) | Analisadores e relatórios por projeto entregues; 222 avisos históricos e CS8604 preservados para triagem; Issue #237 permanece `In Progress` |
| 2026-09-14 | T006 | concluída | 4 testes direcionados; ESLint adicional real (335 arquivos, 11 warnings); `npm ci`, lint e `git diff --check` (0) | Configuração adicional entregue sem enfraquecer lint; warnings de complexidade ficam para triagem; Issue #237 permanece `In Progress` |
| 2026-09-14 | T008 | bloqueada | 17 testes direcionados; regressão Python (282 aprovados, 2 skips); restore/rebuild/SARIF reais isolados; `collect` e `render` retornam código 2 | Bloqueio acionável: host Node 24.14/npm 11.9/Python 3.14 diverge dos pins Node 20.20.2/npm 10.8.2/Python 3.12.14; `functional-findings.json` válido, sem inventário oficial; Issue #237 permanece `In Progress` |
| 2026-09-14 | T010 | concluída | 2 testes direcionados; backend completo (127 aprovados); restore bloqueado, Docker/Testcontainers e `git diff --check` (0) | Fixtures PostgreSQL/HTTP reais isoladas, relógio/hash determinísticos e sem privilégio herdado; Issue #227 permanece `In Progress` |
| 2026-09-14 | T018 | concluída | 50 testes direcionados; Vitest completo (574 aprovados); lint/build e `git diff --check` (0) | Isolamento MSW/storage/cookies/timers e cenários críticos de credenciais entregues; incompatibilidade zod/resolver e avisos de build preexistentes; Issue #227 permanece `In Progress` |
| 2026-09-14 | T011 | concluída | 8 novos casos; filtro direcionado (73 aprovados); backend completo (135 aprovados); restore e `git diff --check` (0) | Credenciais, revogação, recuperação e tokens cobertos por PostgreSQL/relógio controlado; Issue #227 permanece `In Progress` |
| 2026-09-14 | T019 | concluída | 17 testes direcionados; frontend completo (583 aprovados); lint/build e `git diff --check` (0) | Mutação de aprovação/rejeição e feedback MSW entregues; avisos de build preexistentes; Issue #227 permanece `In Progress` |
| 2026-09-14 | T012 | concluída | 15 testes direcionados; backend completo (139 aprovados); restore bloqueado e `git diff --check` (0) | Cadastro HTTP/PostgreSQL e recusa controlada de administrador (QC-003) entregues; Issue #227 permanece `In Progress` |
| 2026-09-14 | T020 | concluída | 19 testes direcionados; frontend completo (592 aprovados); lint/build e `git diff --check` (0) | Solicitação de empréstimo sem `solicitanteId` indevido, retentativa e prevenção de duplicidade entregues; Issue #227 permanece `In Progress` |
| 2026-09-14 | T013 | concluída | 33 testes direcionados; backend completo (154 aprovados); restore e `git diff --check` (0) | QC-002 reproduzido/corrigido vinculando decisão às claims; Issue #227 permanece `In Progress` |
| 2026-09-14 | T021 | concluída | 26 testes direcionados; frontend completo (604 aprovados); lint/build e `git diff --check` (0) | Decisão administrativa coberta com MSW; implementação existente caracterizada; Issue #227 permanece `In Progress` |
| 2026-09-14 | T014 | concluída | 3 testes direcionados; backend completo (162 aprovados); restore e `git diff --check` (0) | Criação autenticada/persistência e recusas cobertas por PostgreSQL; implementação existente caracterizada; Issue #227 permanece `In Progress` |
| 2026-09-14 | T017 | concluída | 9 testes direcionados; backend completo (165 aprovados); restore, SARIF CS8604=0 e `git diff --check` (0) | QC-004 corrigido localmente; malformados continuam rejeitados explicitamente; Issue #237 permanece `In Progress` |
| 2026-09-14 | T015 | concluída | 7 testes direcionados; backend completo (172 aprovados); restore e `git diff --check` (0) | Rejeição passou a persistir `AprovadorId`; aprovação/rejeição, estoque, reprocessamento e atomicidade cobertos; Issue #227 permanece `In Progress` |
| 2026-09-14 | T016 | concluída | 1 caracterização direcionada; backend completo (173 aprovados); restore e `git diff --check` (0) | QC-001 confirmado alto, aberto e impeditivo: data prevista causa 400 na devolução e estoque permanece em 8; Issue #237 permanece `In Progress` |
| 2026-09-14 | T022 | concluída | 16 contratos; Compose config, builds backend/frontend e Compose saudável em portas alternativas; `git diff --check` sem diagnósticos | Imagens fixadas por digest, restore/publish alinhados e portas loopback; conflito externo em 18025 contornado sem tocar stack existente; Issue #227 permanece `In Progress` |
| 2026-09-14 | T023 | concluída | 7 testes direcionados; backend completo (180 aprovados); 5 contratos `unittest`; builds seed/Compose, dois cenários reais e repetição controlada; `git diff --check` sem diagnósticos | Seed E2E separado, determinístico, sem senhas em saída e restrito ao ambiente/banco sintéticos; stack T023 removida; Issue #227 permanece `In Progress` |
| 2026-09-14 | T024 | bloqueada | 5 contratos; listagem 204 casos; lint/build aprovados; UI E2E 197 aprovados; real credenciais 2 aprovados, 1 falha, 1 não executado; `git diff --check` sem diagnósticos | QC-005 reproduzido com API/Mailpit reais: frontend envia `token`, contrato `PasswordResetDTO` exige `code`; correção está fora dos caminhos T024 e requer tarefa própria; Issue #227 permanece `In Progress` |
| 2026-09-14 | T024 retomada | concluída | correção de contrato; Vitest ResetPassword (7); 5 contratos; listagem 204 casos; real credenciais 4/4; real completo 7/7; UI 197/197; lint/build; stack isolada saudável e removida; `git diff --check` sem diagnósticos | Correção `token`→`code` autorizada explicitamente e validada ponta a ponta; Issue #227 permanece `In Progress`; sem commit, push, merge ou PR |
| 2026-09-14 | T025 | bloqueada | 3 casos reais por configuração efêmera: 2 aprovados, 1 falha; lint, 5 contratos Playwright e `git diff --check` aprovados; stack exclusiva removida | CT-003 persistiu `Habilitado` no PostgreSQL após HTTP 200, mas a UI exibiu erro falso porque `frontend/src/integration/Class.ts` valida aprovação de usuário com `emprestimosSchema`; correção de produção fora do escopo autorizado; Issue #227 permanece `In Progress` |
| 2026-09-14 | T026 | bloqueada | 4 casos reais por configuração efêmera aprovados; lint/build e `git diff --check` aprovados; stack exclusiva removida | O comando oficial retorna `No tests found` porque a configuração compartilhada de T024 não inclui `loans.spec.ts` no projeto `real`; arquivo funcional verde, integração de descoberta pendente; Issue #227 permanece `In Progress` |
| 2026-09-15 | T008 retomada | concluída | collect/render reais (código 0); repetição em diretórios novos com saídas canônicas idênticas; 18 testes T008; regressão 302 aprovados e 2 skips preexistentes | Toolchain isolado validado com Node 20.20.2, npm 10.8.2, Python 3.12.14, .NET 8.0.419, Docker 29.7.2 e Compose 5.3.1; 257 achados e 3 altos funcionais permanecem para triagem; Issue #237 permanece `In Progress` |
| 2026-09-15 | T024 retomada (classificação crítica) | concluída | contratos de credenciais 4/4; jornada real 7/7; UI 197/197; descoberta integrada 211 casos em 10 arquivos, sendo 14 no projeto `real`; lint/build aprovados; stack removida | Configuração real/ui preservada e os novos casos críticos foram oficialmente descobertos; correção QC-005 `token`→`code` validada em T024; Issue #227 permanece `In Progress` |
| 2026-09-15 | T025 retomada | concluída | RED reproduzido; contrato frontend 1/1; E2E oficial 3/3; regressão frontend 34/34; 5 contratos Playwright; lint/build e `git diff --check` aprovados; stack removida | `Class.ts` deixou de validar aprovação de dependente com `emprestimosSchema`; jornada real confirmou cadastro, aprovação, recusa/reprocessamento e persistência; Issue #227 permanece `In Progress` |
| 2026-09-15 | T026 retomada | concluída | descoberta oficial `4 tests in 1 file`; E2E real 4/4; contratos Playwright 5/5; ESLint direcionado e `git diff --check` aprovados; stack removida | Jornada real confirmou aprovação, rejeição, estoque insuficiente, autorização e reprocessamento; Issue #227 permanece `In Progress` |
| 2026-09-15 | T009 retomada | concluída | RED com 7 testes novos; GREEN com 25 testes direcionados e regressão Python completa de 309 aprovados e 2 skips; `git diff --check` código 0 | `check --current --base-ref` implementado com comparação por multiplicidade, base/política confiáveis, bootstrap isolado, rejeição de altos históricos, backlog ausente, falso-positivo genérico, fingerprint incompatível e coleta incompleta; Issue #237 permanece `In Progress` |
| 2026-09-15 | T027 retomada | concluída | coleta real 0; current com 257 achados e 4 produtores; baseline com 254 médias/baixas; render 0; testes baseline 25 e regressão Python 309 aprovados/2 skips; `git diff --check` 0 | Inventário, pendências, cobertura e QC-006 consolidados; altos QC-002/QC-003/QC-005 excluídos do baseline e preservados como bloqueadores; `check` contra `origin/develop` retornou código 2 no host porque o bootstrap falhou pela divergência do toolchain; Issue #237 permanece `In Progress` |
| 2026-09-15 | T028 retomada | concluída | agregador 4; contratos container 11; contratos security 5; contratos de workflows 48; regressão Python 315 aprovados/2 skips; parse YAML aprovado; `git diff --check` 0 | `Code quality baseline` e `Quality gate` integrados com `if: always()`, dependências obrigatórias, SHA base, artefatos e limpeza; eventos de PR/merge group e ações pinadas; actionlint não executável no host por WSL sem `/bin/bash`; proteção remota não consultada; Issue #237 permanece `In Progress` |
| 2026-09-15 | T029 retomada | bloqueada | pré-aceite encontrou 3 altos abertos; toolchain host divergente; check exit 2; E2E descoberto 211/10 sem execução ampla; actionlint indisponível; CT-009/QC-001 e prova Linux dos skips pendentes; `git diff --check` 0 | T029 não declara aceite com alto aberto ou validação operacional incompleta; evidência de retomada registrada; Issue #227 permanece `In Progress` |
| 2026-09-15 | T030 | bloqueada | não iniciada: T029 bloqueada e proteção de `develop`/checks obrigatórios/PR de prova exigem acesso e autorização externa | Orquestrador não executa mutações remotas, não fecha issues e não faz merge; retomar após remediação dos altos, aceite T029 e disponibilidade de GitHub; Issue #237 permanece `In Progress` |
| 2026-09-15 | T029 retomada final | bloqueada | toolchain pinado; backend 180/180; Vitest 605/605; Playwright 211/211 e real 14/14; Python Windows 319 com 2 skips legítimos e Linux sem skips; actionlint e collect/render exit 0; check exit 1 por `functional:QC-001` | Validação operacional passou, mas T016 confirma QC-001 alto e aberto; falta contrato de data prevista/efetiva, migração e reversão |
| 2026-09-15 | T030 inspeção | bloqueada | ruleset ativo `develop` ID 9464959 exige sete checks antigos; `Code quality baseline`/`Quality gate` ausentes; não há PR de prova | Nenhuma mutação remota executada sem autorização; ver [evidencias/T030.md](evidencias/T030.md) |
| 2026-09-15 | T031 | concluída | backend direcionado 4/4; backend regressão 183/183; Vitest 605/605; migration apply/rollback em PostgreSQL; E2E UI 197/197 e real 14/14; collect/check/render exit 0; `git diff --check` 0 | QC-001 corrigido com prazo/efetivação separados; ver [evidencias/T031.md](evidencias/T031.md) |
| 2026-09-15 | T029 encerramento | concluída | toolchain pinado; backend 183/183; Vitest 605/605; Playwright 197/197 UI + 14/14 real; Python/actionlint; baseline `check` exit 0 | Fixtures E2E atualizadas para o novo campo `dataPrevistaDevolucao`; stack T031 removida com volumes |
| 2026-09-15 | T030 encerramento | concluída | ruleset 9464959 atualizado preservando 7 checks e adicionando `Code quality baseline`/`Quality gate`; PR de prova com RED bloqueado e GREEN aprovado | Evidências remotas e links/SHA registrados em [evidencias/T030.md](evidencias/T030.md); PR não foi mesclado |
| 2026-09-14 | Planejamento | 30 tarefas pendentes | PRD, techspec, manifestos, workflows e issues #227/#237 consultados | Nenhuma implementação iniciada; os testes relatados na techspec pertencem à inspeção anterior |
