# Tarefas: Remediação de vulnerabilidades de dependências

- Status: bloqueado
- PRD: `./prd.md`
- Especificação técnica: `./techspec.md`
- Atualizado em: 2026-08-11

## Premissas de execução

- Cada executor deve ler `prd.md`, `techspec.md` e esta tarefa antes de alterar arquivos.
- A fotografia de alertas e as versões corrigidas devem ser consultadas novamente no início de cada lote; os números registrados na especificação são evidência histórica, não constantes.
- Manifesto e lockfile pertencem sempre à mesma tarefa. É proibido executar em paralelo tarefas que alterem `frontend/package-lock.json` ou o mesmo `.csproj`.
- A iniciativa `fundacao-qualidade-testes` ainda não possui especificação técnica nem tarefas. T001 e T002 entregam somente os pré-requisitos mínimos necessários a este slug; não substituem a cobertura funcional completa daquela iniciativa.
- Nenhuma tarefa autoriza branch, commit, push, Pull Request, promoção para `main` ou dispensa de alerta. T015 só fica pronta depois de uma promoção realizada pelo fluxo externo autorizado.
- Os arquivos `backend/**/bin/**` e `backend/**/obj/**` são artefatos gerados e não pertencem a nenhuma tarefa, mesmo que estejam rastreados no estado atual do repositório.

## Ondas de execução

| Onda | Tarefas | Motivo de segurança do paralelismo |
|---|---|---|
| 0 | T001, T002, T003 | Backend, frontend e automação Python possuem caminhos e contratos independentes |
| 1 | T004, T005 | O inventário altera apenas documentos do slug; a configuração do Dependabot altera somente `.github/dependabot.yml` |
| 2 | T006, T007 | Remoções NuGet e npm usam manifestos, testes e lockfiles de ecossistemas distintos |
| 3 | T008, T009 | AutoMapper/backend e dependências runtime/frontend não compartilham arquivos |
| 4 | T016 | A raiz runtime de roteamento requer caracterização própria e reutiliza `frontend/package-lock.json` |
| 5 | T010 | O lote de toolchain é sequencial porque reutiliza `frontend/package-lock.json` |
| 6 | T011, T012, T013 | Dockerfile, documentos de risco e workflow/teste de CI não se sobrepõem |
| 7 | T014 | Validação integrada depende de todos os lotes e centraliza a evidência local final |
| 8 | T015 | Reconciliação depende de promoção externa para a branch padrão `main` e encerra os critérios de aceitação |

## T001 — Estabilizar a suíte xUnit e incluí-la na solução

- Status: concluída
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RNF-001, CA-002; infraestrutura obrigatória
- Caminhos sob responsabilidade: `backend/backend.sln`, `backend/Tests/Repositories/ProdutoRepositoryTests.cs`

### Escopo

Adicionar `backend/Tests/Tests.csproj` à solução e corrigir o isolamento do teste `AtualizarAsync_DeveAtualizarProduto`, sem mudar o comportamento de produção. Preservar os quatro cenários existentes e garantir que a solução realmente execute a suíte.

### Critérios de conclusão

- `dotnet sln backend/backend.sln list` mostra aplicação e testes.
- Os quatro testes xUnit passam de forma repetível, inclusive em duas execuções consecutivas.
- A correção não altera arquivos de produção nem ignora/desabilita o teste vermelho.

### Plano TDD

- RED: executar a suíte atual e registrar a falha por duas instâncias de `Quimico` com a mesma chave no teste de atualização.
- GREEN: isolar corretamente estado/entidades no teste e incluir `Tests.csproj` na solução até os quatro casos passarem.
- REFACTOR: extrair setup/cleanup comum do contexto somente se isso reduzir duplicação sem enfraquecer as asserções.

### Validação

- `dotnet sln backend/backend.sln list`
- `dotnet test backend/backend.sln --nologo --disable-build-servers`
- `dotnet test backend/backend.sln --nologo --disable-build-servers`

### Notas

Warnings NuGet ainda são esperados nesta tarefa e serão eliminados em T006/T008; falhas funcionais não são esperadas.

## T002 — Implantar o gate mínimo de testes e lint do frontend

- Status: concluída
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RNF-001, CA-002; infraestrutura obrigatória
- Caminhos sob responsabilidade: `frontend/package.json`, `frontend/package-lock.json`, `frontend/vite.config.ts`, `frontend/eslint.config.js`, `frontend/src/test/setup.ts`, `frontend/src/services/BaseApi.test.tsx`

### Escopo

Adicionar Vitest, jsdom e Testing Library com versões registradas no lockfile; criar scripts não interativos de teste; limitar o lint ao código-fonte e a erros acionáveis; caracterizar a criação do cliente HTTP e o tratamento de 401 em `BaseApi.tsx`. Não corrigir a dívida histórica de formatação fora dos arquivos sob responsabilidade.

### Critérios de conclusão

- `npm ci` instala a árvore exclusivamente pelo lockfile.
- `npm run test -- --run` executa ao menos os casos positivo e negativo de `BaseApi` sem rede real.
- O teste comprova configuração de `baseURL` e, para 401 fora do login, limpeza dos cookies e redirecionamento; resposta não 401 não dispara logout.
- `npm run lint` termina em menos de 60 segundos e falha para erros, sem escanear `dist`/`node_modules`.
- Build Vite permanece verde.

### Plano TDD

- RED: adicionar `BaseApi.test.tsx` e observar a ausência de executor/ambiente DOM e scripts de teste.
- GREEN: configurar Vitest/jsdom, mocks de cookies/toast/axios e o menor ajuste de configuração necessário para os casos passarem; delimitar o script de lint.
- REFACTOR: centralizar setup e restaurar mocks/globais entre testes, mantendo isolamento e comportamento.

### Validação

- `cd frontend && npm ci`
- `cd frontend && npm run test -- --run`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`

### Notas

Usar imports explícitos do Vitest ou tipos configurados no projeto; não ampliar `frontend/src/**` para correções cosméticas.

## T003 — Implementar o normalizador auditável de vulnerabilidades

- Status: concluída
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-001, RF-003, RNF-002, CA-001, CA-003
- Caminhos sob responsabilidade: `.github/scripts/audit_dependencies.py`, `.github/scripts/tests/test_audit_dependencies.py`, `.github/scripts/tests/fixtures/dependencies/**`

### Escopo

Implementar, somente com a biblioteca padrão do Python, uma CLI que colete ou receba JSON de `npm audit`, NuGet e Dependabot; normalize advisory, raiz, relação, severidade, correção, branch/SHA e decisão; deduplique o mesmo advisory entre fontes; escreva inventário/pendências em ordem determinística e aplique os códigos de saída `0`, `1` e `2` definidos na techspec. Subprocessos devem receber argumentos em lista, sem `shell=True`.

### Critérios de conclusão

- Fixtures cobrem crítico corrigível, alto transitivo, item sem correção, advisory duplicado e fonte ausente/malformada.
- A CLI diferencia fonte não coletada de fonte coletada com zero achados.
- Saída `1` representa crítico/alto corrigível aberto; `2`, entrada/fonte obrigatória inválida; `0`, política satisfeita.
- Registro `pendente`/`excecao` incompleto é rejeitado.
- Tokens e conteúdo sensível não aparecem em logs, arquivos ou mensagens de erro.

### Plano TDD

- RED: escrever os testes de fixtures e observar falhas para normalização, deduplicação, validação de risco e códigos de saída.
- GREEN: implementar parsers, modelo normalizado, renderização Markdown e CLI mínima até todos os cenários passarem.
- REFACTOR: separar coleta, política e renderização; ordenar saídas de forma determinística sem alterar snapshots/asserções.

### Validação

- `python -m unittest discover -s .github/scripts/tests -p "test_audit_dependencies.py" -v`
- `python .github/scripts/audit_dependencies.py --help`
- `python -m unittest discover -s .github/scripts/tests -v`

### Notas

A interface deve oferecer `collect --sources npm,nuget[,dependabot] --repository <raiz> --inventory <arquivo> --pending <arquivo>` e `validate-pending <arquivo>`, para que as tarefas seguintes usem comandos estáveis. Novas coletas acrescentam uma fotografia identificada ao histórico; não apagam a evidência antes/depois já registrada.

## T004 — Produzir a linha de base versionada no mesmo commit

- Status: concluída
- Dependências: T001, T002, T003
- Paralela: sim
- Requisitos: RF-001, RF-003, RNF-002, CA-001, CA-003
- Caminhos sob responsabilidade: `.codex/docs/specs/remediacao-vulnerabilidades-dependencias/inventario.md`, `.codex/docs/specs/remediacao-vulnerabilidades-dependencias/pendencias.md`

### Escopo

Coletar npm, NuGet e Dependabot no SHA corrente, resolver a raiz dos críticos/altos e produzir os dois documentos conforme o contrato da techspec. Classificar cada crítico/alto em T006, T007, T008, T009 ou T010. Criar `pendencias.md` mesmo vazio, com esquema e estado explícitos.

### Critérios de conclusão

- Cabeçalho registra data UTC, branch, SHA, versões Node/npm/.NET e estado de cada fonte.
- Todo crítico/alto possui advisory, manifesto, raiz, versão atual, correção e lote.
- A divergência `develop` local versus Dependabot de `main` permanece visível.
- Falta de credencial/fonte é `não coletada` e não zero.
- A saída `1` da política é registrada como RED esperado da linha de base, não mascarada.

### Plano TDD

- RED: executar a coleta contra o estado vulnerável e observar código `1` e/ou linhas críticas/altas sem classificação.
- GREEN: completar raiz, correção e lote de todos os prioritários e gerar os documentos válidos, preservando o código `1` enquanto o risco existir.
- REFACTOR: deduplicar advisories e ordenar tabelas por severidade/ecossistema/raiz sem perder a proveniência.

### Validação

- `python .github/scripts/audit_dependencies.py collect --sources npm,nuget,dependabot --repository . --inventory .codex/docs/specs/remediacao-vulnerabilidades-dependencias/inventario.md --pending .codex/docs/specs/remediacao-vulnerabilidades-dependencias/pendencias.md`
- `python .github/scripts/audit_dependencies.py validate-pending .codex/docs/specs/remediacao-vulnerabilidades-dependencias/pendencias.md`
- `python -m unittest discover -s .github/scripts/tests -p "test_audit_dependencies.py" -v`

### Notas

O primeiro comando deve retornar `1` enquanto houver prioridade aberta; a tarefa conclui quando o inventário é válido e esse RED está documentado.

## T005 — Configurar atualizações periódicas do Dependabot

- Status: concluída
- Dependências: nenhuma
- Paralela: sim
- Requisitos: RF-001, RNF-002; infraestrutura de prevenção
- Caminhos sob responsabilidade: `.github/dependabot.yml`

### Escopo

Criar configuração Dependabot v2 semanal para npm em `/frontend` e NuGet em `/backend`, direcionando PRs de atualização de versão para `develop`, com limite de PRs e rótulos coerentes. Não afirmar que `target-branch` altera alertas ou PRs de segurança, que continuam ligados à branch padrão.

### Critérios de conclusão

- Há exatamente uma entrada npm e uma NuGet, ambas com diretório válido e agenda semanal.
- Atualizações de versão apontam para `develop`.
- Nenhuma dependência vulnerável é ignorada e nenhuma credencial é incorporada.
- O arquivo está formatado e sua limitação para security updates está documentada em comentário conciso.

### Plano TDD

- RED: verificar a ausência de `.github/dependabot.yml` e das duas entradas obrigatórias.
- GREEN: adicionar a menor configuração v2 que monitore os dois ecossistemas.
- REFACTOR: eliminar repetição possível sem recorrer a opções não suportadas e preservar a leitura humana.

### Validação

- `cd frontend && npx prettier --check ../.github/dependabot.yml`
- `python -c "from pathlib import Path; p=Path('.github/dependabot.yml').read_text(encoding='utf-8'); assert p.count('package-ecosystem:') == 2 and 'npm' in p and 'nuget' in p and p.count('target-branch:') == 2 and 'develop' in p"`

### Notas

A efetiva aceitação da configuração pelo GitHub só pode ser observada após integração; não bloquear esta tarefa por ausência dessa execução externa.

## T006 — Remover referências NuGet obsoletas que introduzem transitivos vulneráveis

- Status: concluída
- Dependências: T001, T004
- Paralela: sim
- Requisitos: RF-002, RNF-001, RNF-002, CA-002
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/LabSolos-Server-DotNet8.csproj`, `backend/Tests/Security/IdentityCompatibilityTests.cs`, `backend/Tests/Data/DatabaseProviderCompatibilityTests.cs`

### Escopo

Caracterizar hashing/verificação de senha e a configuração do provedor Npgsql; remover `Microsoft.AspNetCore.Identity` 2.2.0 e `Microsoft.EntityFrameworkCore.Sqlite` se os tipos necessários vierem do framework compartilhado e não houver uso SQLite. Confirmar que desaparecem as cadeias para `System.Text.Encodings.Web`, `System.Security.Cryptography.Xml` e `SQLitePCLRaw.lib.e_sqlite3`.

### Critérios de conclusão

- Testes de caracterização passam antes e depois das remoções.
- Aplicação compila usando Identity do .NET 8 e mantém o comportamento testado de senha.
- A configuração continua selecionando Npgsql e não adiciona substituto SQLite.
- `dotnet list ... --vulnerable` não reporta os três transitivos associados às referências removidas.

### Plano TDD

- RED: adicionar caracterizações de Identity/provedor e registrar no audit os três transitivos vulneráveis ainda presentes.
- GREEN: remover as duas referências diretas e fazer restore/build/testes passarem sem os transitivos.
- REFACTOR: simplificar setup dos testes e referências redundantes, sem alterar autenticação ou persistência de produção.

### Validação

- `dotnet test backend/backend.sln --filter "FullyQualifiedName~IdentityCompatibilityTests|FullyQualifiedName~DatabaseProviderCompatibilityTests" --nologo --disable-build-servers`
- `dotnet build backend/backend.sln --nologo --disable-build-servers`
- `dotnet list backend/backend.sln package --vulnerable --include-transitive --format json`
- `dotnet test backend/backend.sln --nologo --disable-build-servers`

### Notas

Se uma referência for realmente necessária, manter somente essa referência, atualizar para uma alternativa compatível e registrar evidência; não criar override transitivo permanente.

## T007 — Remover dependências npm diretas sem uso comprovado

- Status: concluída
- Dependências: T002, T004
- Paralela: sim
- Requisitos: RF-002, RNF-001, RNF-002, CA-002
- Caminhos sob responsabilidade: `frontend/package.json`, `frontend/package-lock.json`, `package-lock.json`

### Escopo

Revalidar e remover os candidatos sem importação `cross-spawn`, `nanoid`, `next`, `next-themes` e `tailwindcss-animate` quando busca, testes e build confirmarem ausência de uso. Remover o lockfile vazio da raiz se continuar sem `package.json` correspondente. Não remover dependências transitivamente usadas só porque não aparecem em import direto sem antes revisar configuração/build.

### Critérios de conclusão

- Cada remoção possui evidência de busca e validação comportamental.
- Manifesto e lockfile frontend são regenerados juntos por npm.
- O lockfile raiz só é removido após confirmar a ausência de manifesto raiz.
- Testes, lint e build frontend passam; não há pacote removido em `npm ls --depth=0`.

### Plano TDD

- RED: registrar os candidatos presentes no manifesto e executar a suíte de caracterização verde antes da remoção, tratando essa suíte como baseline observável.
- GREEN: remover um candidato por vez, regenerar o lockfile e manter os mesmos testes/build verdes.
- REFACTOR: revisar o diff transitivo e eliminar somente nós órfãos produzidos pelo npm, sem upgrades alheios ao lote.

### Validação

- `cd frontend && npm ci`
- `cd frontend && npm run test -- --run`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `node -e "const p=require('./frontend/package.json'); for (const n of ['cross-spawn','nanoid','next','next-themes','tailwindcss-animate']) if (p.dependencies?.[n] || p.devDependencies?.[n]) process.exit(1)"`

### Notas

Se algum candidato demonstrar uso indireto de configuração, mantê-lo e registrar a evidência no inventário em vez de forçar a remoção.

## T008 — Atualizar AutoMapper e preservar os contratos de mapeamento

- Status: concluída
- Dependências: T006
- Paralela: sim
- Requisitos: RF-002, RNF-001, RNF-002, CA-002
- Caminhos sob responsabilidade: `backend/LabSolos-Server-DotNet8/LabSolos-Server-DotNet8.csproj`, `backend/LabSolos-Server-DotNet8/Program.cs`, `backend/LabSolos-Server-DotNet8/Mappings/**`, `backend/Tests/Mappings/**`

### Escopo

Criar teste que carrega todos os perfis e valida a configuração; atualizar AutoMapper para a menor versão corrigida confirmada no momento da execução; adaptar apenas APIs de registro/mapeamento incompatíveis. O lote deve terminar sem `NU1903`/`NU1904` na solução.

### Critérios de conclusão

- O teste de configuração detecta perfis inválidos e cobre todos os perfis do assembly.
- AutoMapper resolvido está fora do intervalo vulnerável vigente.
- Restore auditado de crítico/alto passa como gate.
- Todos os testes backend e o build Release passam.

### Plano TDD

- RED: adicionar o teste de configuração e registrar `NU1903` para AutoMapper 14.0.0; após o upgrade, observar qualquer quebra real de API/mapeamento.
- GREEN: aplicar a menor versão corrigida e adaptar somente os pontos necessários até configuração, restore, build e testes passarem.
- REFACTOR: consolidar registro/perfis duplicados sem mudar DTOs, endpoints ou mapeamentos observáveis.

### Validação

- `dotnet test backend/backend.sln --filter "FullyQualifiedName~Mapping" --nologo --disable-build-servers`
- `dotnet restore backend/backend.sln -p:NuGetAudit=true -p:NuGetAuditMode=all -p:NuGetAuditLevel=high -p:WarningsAsErrors="NU1903;NU1904"`
- `dotnet build backend/backend.sln --no-restore -c Release --nologo --disable-build-servers`
- `dotnet test backend/backend.sln --no-build -c Release --nologo --disable-build-servers`

### Notas

Não atualizar outros pacotes NuGet neste lote, salvo dependências obrigatórias do AutoMapper registradas no restore.

## T009 — Atualizar dependências npm runtime prioritárias

- Status: concluída
- Dependências: T007
- Paralela: sim
- Requisitos: RF-002, RNF-001, RNF-002, CA-002
- Caminhos sob responsabilidade: `frontend/package.json`, `frontend/package-lock.json`, `frontend/src/services/BaseApi.tsx`, `frontend/src/services/BaseApi.test.tsx`

### Escopo

Reconsultar os advisories e atualizar, em um lote runtime, dependências diretas críticas/altas ainda necessárias, inicialmente `axios` e `js-cookie`. Usar as menores versões corrigidas compatíveis e adaptar `BaseApi` somente se uma API consumida tiver mudado.

### Critérios de conclusão

- Versões resolvidas estão fora dos intervalos vulneráveis atuais.
- Casos 401 e não 401 permanecem verdes e não fazem rede real.
- `npm audit --audit-level=high` não aponta vulnerabilidade runtime ligada às raízes do lote.
- Lockfile contém somente mudanças explicáveis por essas raízes.

### Plano TDD

- RED: executar os testes de caracterização verdes na versão antiga e registrar os advisories ainda abertos; depois do upgrade, capturar quebra real se houver.
- GREEN: atualizar as raízes e fazer testes/audit/build passarem com a menor adaptação.
- REFACTOR: remover compatibilidade temporária e simplificar mocks sem alterar o contrato de logout.

### Validação

- `cd frontend && npm run test -- --run src/services/BaseApi.test.tsx`
- `cd frontend && npm audit --audit-level=high`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`

### Notas

Se o inventário atualizado identificar outra dependência runtime direta crítica/alta, incluí-la somente se compartilhar o mesmo contrato e registrar a expansão no inventário.

## T016 — Atualizar a raiz runtime de roteamento com caracterização isolada

- Status: concluída
- Dependências: T009
- Paralela: não
- Requisitos: RF-002, RNF-001, RNF-002, CA-002
- Caminhos sob responsabilidade: `frontend/package.json`, `frontend/package-lock.json`, `frontend/src/routes.tsx`, `frontend/src/routes.test.tsx`

### Escopo

Reconsultar os advisories de `react-router-dom`, `react-router` e `@remix-run/router`; caracterizar seleção de rota conhecida e fallback sem rede real; atualizar a raiz direta para a menor versão corrigida compatível. Preservar React 18, a árvore de rotas e as flags futuras existentes. Não migrar para React Router 7 nem refatorar páginas/componentes.

### Critérios de conclusão

- A versão resolvida de `react-router-dom` e seus transitivos está fora dos intervalos críticos/altos vigentes.
- Testes cobrem uma rota conhecida e o fallback, sem carregar serviços externos.
- `npm audit --audit-level=high` não aponta vulnerabilidade ligada à raiz de roteamento.
- Testes frontend, lint e build passam; lockfile contém somente mudanças explicáveis pela raiz.

### Plano TDD

- RED: registrar o audit alto da raiz e criar caracterização executável da seleção de rota/fallback na versão anterior.
- GREEN: atualizar para a menor versão corrigida compatível e preservar os cenários caracterizados.
- REFACTOR: simplificar apenas o setup do teste, sem alterar a árvore de rotas observável.

### Validação

- `cd frontend && npm run test -- --run src/routes.test.tsx`
- `cd frontend && npm audit --audit-level=high`
- `cd frontend && npm run test -- --run`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`

### Notas

Tarefa adicionada pelo orquestrador após T009 comprovar que a raiz vulnerável não compartilha o contrato de `BaseApi` e, portanto, não podia ser absorvida com segurança naquele lote.

## T010 — Atualizar toolchain npm e eliminar prioritários transitivos restantes

- Status: concluída
- Dependências: T016
- Paralela: não
- Requisitos: RF-002, RNF-001, RNF-002, CA-002
- Caminhos sob responsabilidade: `frontend/package.json`, `frontend/package-lock.json`, `frontend/vite.config.ts`, `frontend/eslint.config.js`, `frontend/postcss.config.js`, `frontend/tailwind.config.js`, `frontend/src/test/**`

### Escopo

Atualizar as raízes de desenvolvimento necessárias para eliminar críticos/altos restantes, inicialmente Vite/PostCSS e seus transitivos. Atualizar a raiz em vez de fixar transitivo diretamente. Preservar React 18, a configuração Vite, lint, testes e build; não migrar framework/runtime.

### Critérios de conclusão

- `npm audit --audit-level=high` retorna zero para todo o lockfile frontend.
- Nenhum override transitivo permanente é introduzido sem justificativa documentada.
- Testes, lint e build passam após `npm ci` em checkout reproduzível.
- Mudanças médias/baixas restantes estão identificadas para T012, sem atualização ampla não relacionada.

### Plano TDD

- RED: registrar o audit prioritário antes do lote e executar testes/configuração de build; após cada raiz, capturar incompatibilidades reais.
- GREEN: atualizar uma raiz de toolchain por vez até o audit crítico/alto ficar verde.
- REFACTOR: remover ajustes temporários e normalizar configurações sem aumentar o escopo do framework.

### Validação

- `cd frontend && npm ci`
- `cd frontend && npm audit --audit-level=high`
- `cd frontend && npm run test -- --run`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`

### Notas

Atualizações médias/baixas que exigiriam migração ampla devem ser encaminhadas a T012, não forçadas neste lote.

## T011 — Tornar o build Docker frontend determinístico

- Status: concluída
- Dependências: T010
- Paralela: sim
- Requisitos: RNF-001, RNF-002, CA-002
- Caminhos sob responsabilidade: `frontend/Dockerfile`

### Escopo

Substituir a instalação npm não determinística do estágio de build por `npm ci`, preservando as demais decisões do Dockerfile. Não atualizar imagens-base, pacotes Alpine ou estratégia de execução, que pertencem à modernização de contêineres.

### Critérios de conclusão

- Dockerfile usa `npm ci` depois de copiar `package.json` e `package-lock.json`.
- Build da imagem conclui com o lockfile remediado.
- Nenhuma imagem-base ou comando de runtime é alterado.

### Plano TDD

- RED: verificação textual falha porque o Dockerfile contém `RUN npm install`.
- GREEN: trocar pelo comando determinístico e construir a imagem.
- REFACTOR: manter camadas de cache legíveis sem ampliar o escopo.

### Validação

- `python -c "from pathlib import Path; p=Path('frontend/Dockerfile').read_text(encoding='utf-8'); assert 'RUN npm ci' in p and 'RUN npm install' not in p"`
- `docker build -t lab-solos-frontend:dependency-remediation -f frontend/Dockerfile frontend`

### Notas

Se Docker não estiver disponível, a tarefa não deve ser marcada concluída apenas pela verificação textual; registrar o bloqueio para execução em CI/ambiente habilitado.

## T012 — Classificar riscos médios/baixos e exceções remanescentes

- Status: concluída
- Dependências: T004, T008, T010
- Paralela: sim
- Requisitos: RF-003, RNF-002, CA-003
- Caminhos sob responsabilidade: `.codex/docs/specs/remediacao-vulnerabilidades-dependencias/inventario.md`, `.codex/docs/specs/remediacao-vulnerabilidades-dependencias/pendencias.md`

### Escopo

Recoletar as fontes após os lotes prioritários. Para todo médio/baixo restante, registrar lote futuro seguro ou pendência. Para qualquer item sem correção, preencher justificativa, mitigação, risco residual, responsável e `revisar_em`. Não dispensar alertas no GitHub.

### Critérios de conclusão

- Todo item não remediado possui decisão explícita e evidência atualizada.
- Exceções/itens sem correção possuem todos os campos obrigatórios e data de revisão futura.
- Médios/baixos não exigem migração funcional ampla neste slug.
- O validador rejeita uma cópia/fixture com campo obrigatório removido e aceita os documentos finais.

### Plano TDD

- RED: executar `validate-pending` e observar falhas para itens sem decisão ou campos obrigatórios.
- GREEN: completar classificação, responsável, mitigação e revisão até o documento ser aceito.
- REFACTOR: agrupar pendências por raiz/lote futuro sem perder rastreabilidade individual.

### Validação

- `python .github/scripts/audit_dependencies.py collect --sources npm,nuget --repository . --inventory .codex/docs/specs/remediacao-vulnerabilidades-dependencias/inventario.md --pending .codex/docs/specs/remediacao-vulnerabilidades-dependencias/pendencias.md`
- `python .github/scripts/audit_dependencies.py validate-pending .codex/docs/specs/remediacao-vulnerabilidades-dependencias/pendencias.md`
- `python -m unittest discover -s .github/scripts/tests -p "test_audit_dependencies.py" -v`

### Notas

Não transformar indisponibilidade de fonte em pendência de severidade baixa; usar o estado `não coletada` e falhar a evidência correspondente.

## T013 — Criar o gate de dependências pré-merge para develop

- Status: concluída
- Dependências: T001, T002, T003, T008, T010
- Paralela: sim
- Requisitos: RF-002, RNF-001, RNF-002, CA-002
- Caminhos sob responsabilidade: `.github/workflows/security-dependencies.yml`, `.github/scripts/tests/test_security_dependencies_workflow.py`

### Escopo

Criar workflow em `pull_request` para `develop` e `workflow_dispatch`, com jobs npm e .NET independentes, permissões mínimas, concurrency com cancelamento, timeouts, cache dos gerenciadores e comandos idênticos aos locais. Publicar contagens/resumo e reter JSON por 30 dias. A API Dependabot não é gate do PR.

### Critérios de conclusão

- Filtros incluem manifests, lockfiles, `.csproj`/solução, script de audit e workflow.
- Job npm executa `npm ci`, audit high, testes, lint e build.
- Job .NET executa restore auditado com `NU1903`/`NU1904` como erro, build e testes da solução.
- `permissions` padrão é `contents: read`; não há uso de secrets em código de fork.
- Teste estrutural falha se trigger, permissão, comando ou retenção obrigatória for removido.

### Plano TDD

- RED: escrever teste estrutural e observar falha pela ausência do workflow/gates.
- GREEN: adicionar o workflow mínimo até todas as asserções estruturais passarem.
- REFACTOR: deduplicar defaults/env e manter jobs independentes e legíveis.

### Validação

- `python -m unittest discover -s .github/scripts/tests -p "test_security_dependencies_workflow.py" -v`
- `python -m unittest discover -s .github/scripts/tests -v`
- `cd frontend && npx prettier --check ../.github/workflows/security-dependencies.yml`

### Notas

A execução real em PR é evidência de integração a registrar em T014; os pipelines pós-merge existentes não substituem este gate.

## T014 — Validar integração local e consolidar evidência antes/depois

- Status: concluída
- Dependências: T011, T012, T013
- Paralela: não
- Requisitos: RF-001, RF-002, RF-003, RNF-001, RNF-002, CA-001, CA-002, CA-003
- Caminhos sob responsabilidade: `.codex/docs/specs/remediacao-vulnerabilidades-dependencias/inventario.md`, `.codex/docs/specs/remediacao-vulnerabilidades-dependencias/pendencias.md`

### Escopo

Executar a esteira ampla em checkout limpo, coletar npm/NuGet no mesmo SHA e consolidar evidências antes/depois. Confirmar zero crítico/alto corrigível nas fontes locais e completude das pendências. Registrar a execução real do workflow em PR para `develop` quando disponível, sem realizar operações Git externas nesta tarefa.

### Critérios de conclusão

- Restore auditado, build e todos os testes backend passam em Release.
- `npm ci`, audit high, testes, lint e build frontend passam.
- Todos os testes Python passam e o inventário local retorna política satisfeita.
- Docker build validado em T011 e resultado referenciado.
- Documentos registram o mesmo branch/SHA dos comandos e não alegam que Dependabot de `main` já foi reconciliado.

### Plano TDD

- RED: executar a esteira completa e registrar qualquer gate ainda vermelho ou evidência inconsistente.
- GREEN: corrigir somente documentos/evidências desta tarefa; devolver defeito de código à tarefa proprietária correspondente até tudo ficar verde.
- REFACTOR: consolidar comandos e resultados duplicados no inventário sem perder o histórico antes/depois.

### Validação

- `dotnet restore backend/backend.sln -p:NuGetAudit=true -p:NuGetAuditMode=all -p:NuGetAuditLevel=high -p:WarningsAsErrors="NU1903;NU1904"`
- `dotnet build backend/backend.sln --no-restore -c Release --nologo --disable-build-servers`
- `dotnet test backend/backend.sln --no-build -c Release --nologo --disable-build-servers`
- `cd frontend && npm ci`
- `cd frontend && npm audit --audit-level=high`
- `cd frontend && npm run test -- --run`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `python -m unittest discover -s .github/scripts/tests -v`
- `python .github/scripts/audit_dependencies.py collect --sources npm,nuget --repository . --inventory .codex/docs/specs/remediacao-vulnerabilidades-dependencias/inventario.md --pending .codex/docs/specs/remediacao-vulnerabilidades-dependencias/pendencias.md`
- `python .github/scripts/audit_dependencies.py validate-pending .codex/docs/specs/remediacao-vulnerabilidades-dependencias/pendencias.md`

### Notas

Se algum comando alterar artefatos rastreados em `bin/obj`, restaurar somente esses gerados e não incorporá-los ao diff.

## T015 — Reconciliar Dependabot em main e encerrar o slug

- Status: bloqueada
- Dependências: T014 e promoção externa do commit validado para `main`
- Paralela: não
- Requisitos: RF-001, RF-002, RF-003, RNF-002, CA-001, CA-002, CA-003
- Caminhos sob responsabilidade: `.codex/docs/specs/remediacao-vulnerabilidades-dependencias/inventario.md`, `.codex/docs/specs/remediacao-vulnerabilidades-dependencias/pendencias.md`

### Escopo

Depois que o mesmo conjunto remediado chegar a `main` por processo autorizado, aguardar a atualização do grafo, consultar todos os alertas abertos com paginação e registrar a fotografia final. Encerrar somente se não restar crítico/alto corrigível e todos os demais itens estiverem remediados ou documentados. Não dispensar alertas via API.

### Critérios de conclusão

- SHA/branch promovidos são identificados e correspondem ao conteúdo validado em T014.
- Consulta paginada do Dependabot foi coletada, não inferida de `npm audit`.
- Não há crítico/alto corrigível aberto na branch padrão.
- Todo alerta restante satisfaz CA-003 e o validador de pendências.
- Evidência final contém contagens antes/depois, data UTC e links/IDs de advisories.

### Plano TDD

- RED: coletar Dependabot após a promoção e observar código `1` se algum crítico/alto corrigível permanecer ou `2` se a fonte não puder ser coletada.
- GREEN: somente após o grafo refletir o commit e a política retornar `0`, atualizar a evidência final; qualquer alerta real volta ao lote proprietário.
- REFACTOR: consolidar duplicatas entre Dependabot/npm/NuGet preservando origem, datas e histórico.

### Validação

- `gh api --paginate "repos/{owner}/{repo}/dependabot/alerts?state=open&per_page=100"`
- `python .github/scripts/audit_dependencies.py collect --sources npm,nuget,dependabot --repository . --inventory .codex/docs/specs/remediacao-vulnerabilidades-dependencias/inventario.md --pending .codex/docs/specs/remediacao-vulnerabilidades-dependencias/pendencias.md`
- `python .github/scripts/audit_dependencies.py validate-pending .codex/docs/specs/remediacao-vulnerabilidades-dependencias/pendencias.md`
- `python -m unittest discover -s .github/scripts/tests -v`

### Notas

Sem promoção autorizada ou sem atualização do grafo de `main`, a tarefa permanece pendente; isso não autoriza abrir PR, fazer push, alterar branch padrão ou marcar o objetivo concluído.

## Log de execução

| Data | Tarefa | Resultado | Testes/evidências | Observações |
|---|---|---|---|---|
| 2026-08-10 | T001 | concluída | RED: 3/4 xUnit por conflito de tracking; GREEN/REFACTOR: 4/4 em duas execuções; repetição do orquestrador 4/4 | `Tests.csproj` incluído na solução; `NU1903` do AutoMapper permanece para T008 |
| 2026-08-10 | T002 | concluída | RED: script `test` ausente; GREEN/REFACTOR: Vitest 3/3, lint e build; repetição do orquestrador: 3/3, lint e build | `npm ci` validado pelo executor; 26 vulnerabilidades seguem para T009/T010; avisos históricos de build preservados |
| 2026-08-10 | T003 | concluída | RED: 1 falha e 9 erros com script ausente; GREEN/REFACTOR: 13/13 direcionados e 18/18 amplos; repetição do orquestrador confirmou ambos | CLI e cinco fixtures criadas; issue #236 permanece `In Progress` |
| 2026-08-10 | T004 | pendente após validação | Documentos classificam 52 IDs prioritários e `validate-pending` passa; `collect` real retorna 2 | Reaberta T003: npm falha com `WinError 2` no Windows e NuGet sem `fixedVersion` gera pendências incompletas |
| 2026-08-10 | T005 | concluída | RED: arquivo ausente; GREEN/REFACTOR: Prettier e verificações estruturais passaram; repetição do orquestrador confirmou | Aceitação externa pelo GitHub permanece evidência pós-integração |
| 2026-08-10 | T003 | concluída após reabertura | RED: 2 falhas e 2 erros de portabilidade/enriquecimento; GREEN/REFACTOR: 18/18 direcionados, 23/23 amplos; orquestrador repetiu ambos | Coleta npm portátil no Windows; correção desconhecida não é tratada como indisponível |
| 2026-08-10 | T004 | pendente após segunda validação | Três fontes coletadas, 116 registros e 53/53 prioritários classificados; `collect` retorna 2 | Reaberta T003: API real usa `first_patched_version` string, formato ainda não aceito |
| 2026-08-10 | T003 | concluída após segunda reabertura | RED: patch string virava indisponível; GREEN/REFACTOR: 19/19 direcionados, 24/24 amplos; orquestrador repetiu ambos | Parser aceita objeto/string/null de modo conservador e teste end-to-end retorna política 1 |
| 2026-08-11 | T004 | pendente após terceira validação | Três fontes coletadas, 116 registros e 53/53 prioritários classificados; `collect` retorna 2 | Reaberta T003: advisory sem patch e com remoção planejada vira pendência vazia antes da decisão documental |
| 2026-08-11 | T003 | concluída após terceira reabertura | RED: prioridade sem patch retornava 2; GREEN/REFACTOR: 20/20 direcionados, 25/25 amplos; orquestrador repetiu ambos | Crítico/alto sem patch fica aberto/investigar; pendência explícita incompleta continua inválida |
| 2026-08-11 | T004 | pendente após quarta validação | Três fontes coletadas, 116 registros e 54/54 prioritários classificados; `collect` retorna 2 | Reaberta T003: `react-router-dom` alto tem `fixAvailable=true`, mas agregado local sem advisory fica com correção desconhecida |
| 2026-08-11 | T003 | concluída após quarta reabertura | RED: agregado npm com correção confirmada retornava 2; GREEN/REFACTOR: 21/21 direcionados, 26/26 amplos; orquestrador repetiu ambos | Marcador não vazio distingue correção confirmada sem versão de desconhecido genuíno |
| 2026-08-11 | T004 | concluída | Coleta real: 116 registros, três fontes coletadas, política 1; 54/54 prioritários classificados; `validate-pending` e 21/21 testes verdes | Linha de base preserva snapshots intermediários e registra decisões T006–T010 sem falso zero |
| 2026-08-11 | T006 | concluída | RED: três transitivos vulneráveis; GREEN/REFACTOR: referências Identity/SQLite removidas, 3/3 caracterizações, 7/7 suíte, build e audit verdes | Só AutoMapper vulnerável permanece para T008 |
| 2026-08-11 | T007 | concluída | Baseline 3/3/lint/build; quatro dependências removidas; repetição do orquestrador 3/3, lint e build | Crítico npm zerado; `tailwindcss-animate` mantido por uso comprovado e evidência registrada no inventário |
| 2026-08-11 | T008 | concluída | RED: `NU1903` e mapas duplicados; GREEN/REFACTOR: AutoMapper 15.1.1, mapping 1/1, restore auditado, build e 8/8 testes | Audit NuGet sem vulnerabilidades; quatro perfis duplicados consolidados |
| 2026-08-11 | T009 | concluída | Baseline BaseApi 3/3; axios 1.18.0 e js-cookie 3.0.6; npm ci/teste/lint/build verdes | Vulnerabilidades 24→20; raiz `react-router-dom` separada em T016 por contrato distinto |
| 2026-08-11 | T016 | concluída | RED: 15 altos com router 6.30.0; GREEN/REFACTOR: 6.30.4, rota/fallback 2/2, suíte 5/5, npm ci/lint/build verdes | Altos da raiz zerados; moderados exigem v7 e seguem para T012 |
| 2026-08-11 | T010 | concluída | RED: 12 altos; GREEN/REFACTOR: audit high zero, suíte 5/5, lint e build; orquestrador repetiu | Restam 1 baixo e 6 moderados para T012; sem override/pin permanente |
| 2026-08-11 | T011 | bloqueada | RED textual para `npm install`; Dockerfile usa `npm ci` e checagem textual passa | Docker ausente neste host (código operacional 127); build real da imagem não executado |
| 2026-08-11 | T012 | concluída | Coleta local: NuGet zero, npm 7 moderados/1 baixo; 8/8 classificados; teste negativo retorna 2; `validate-pending` e 21/21 verdes | Dependabot de `main` explicitamente não reconciliado |
| 2026-08-11 | T013 | concluída | RED estrutural 4/4; GREEN/REFACTOR 4/4 e regressão 30/30; Prettier verde | `actionlint` ausente; execução real do workflow depende de PR/T014 |
| 2026-08-11 | T014 | bloqueada | Dependências T012/T013 concluídas; T011 incompleta | Requer build Docker validado antes da esteira final |
| 2026-08-11 | T015 | bloqueada | Não iniciada | Requer T014 concluída e promoção externa autorizada do conteúdo validado para `main` |
| 2026-08-11 | T011 | concluída após desbloqueio | Checagem textual verde; build Docker em 109,7 s; imagem `sha256:b3875533000b07fa05df4dc728519b43c438426c2add138a5a031df819ff34c1` | Docker Desktop 4.86.0/WSL2 instalados; imagem `linux/amd64`, bases e runtime preservados |
| 2026-08-11 | T014 | bloqueada durante validação | Backend, frontend e 30/30 testes Python verdes; `collect --sources npm,nuget` falhou ao ler solução NuGet limpa | Reaberta T003: saída válida sem vulnerabilidades contém projetos apenas com `path`, sem `frameworks` |
| 2026-08-11 | T003 | concluída após quinta reabertura | RED: projeto NuGet limpo sem `frameworks` era rejeitado; GREEN/REFACTOR: 24/24 direcionados e 33/33 amplos; orquestrador repetiu 33/33 | Ausência de `frameworks` com `path` válido representa zero achados; formas realmente inválidas continuam rejeitadas |
| 2026-08-11 | T014 | concluída após desbloqueio | Esteira backend/frontend verde; Docker confirmado; 33/33 Python; coleta real `normalized=8 policy_exit=0`; `validate-pending` verde | NuGet sem achados; 8/8 riscos baixos/moderados classificados; Dependabot de `main` permanece reservado à T015 |
| 2026-08-11 | T013 | concluída após reabertura na PR #244 | RED real: gate NuGet falhou com MSB1006; GREEN/REFACTOR: forma `%3B`, 4/4 direcionados e 33/33 amplos | Teste exige quoting portátil e rejeita `"NU1903;NU1904"`; nova execução da PR deve confirmar no Ubuntu |
