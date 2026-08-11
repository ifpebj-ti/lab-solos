# Especificação técnica: Remediação de vulnerabilidades de dependências

- Status: pronto
- PRD: `./prd.md`
- Atualizado em: 2026-08-10
- Validação de design: desnecessária

## Resumo técnico

A remediação será executada em lotes pequenos e reversíveis sobre os manifestos e arquivos de bloqueio npm/NuGet. Cada lote deve partir de um inventário normalizado, remover dependências diretas comprovadamente sem uso antes de atualizar versões e preservar o comportamento por meio das suítes estabelecidas por `fundacao-qualidade-testes`.

A solução acrescenta quatro controles:

1. um inventário versionado que relaciona alerta, dependência raiz, versão vulnerável, correção, lote e evidência;
2. gates locais e pré-merge para vulnerabilidades críticas/altas corrigíveis;
3. validação funcional e de compilação após cada lote;
4. reconciliação pós-promoção com os alertas do Dependabot na branch padrão `main`.

Não há mudança planejada em APIs de produto, banco de dados ou comportamento funcional. Mudanças de API de bibliotecas são encapsuladas no lote que atualiza a dependência e só podem ser aceitas com testes de caracterização. A execução depende da fundação de qualidade descrita em `../fundacao-qualidade-testes/prd.md`; caso ela ainda não esteja implantada, seus gates mínimos fazem parte da primeira onda desta iniciativa.

## Estado atual

Fotografia coletada em 2026-08-10 no checkout `develop`, commit `d6e01b42216e8f79bb86ce56ab80ce74ce120530`:

| Fonte | Resultado observado | Consequência |
|---|---|---|
| Dependabot, branch padrão `main` | 112 alertas abertos: 1 crítico, 58 altos, 49 médios e 4 baixos; 111 npm e 1 NuGet; todos informam versão corrigida | O número 99 do PRD é histórico; a linha de base deve sempre registrar data, branch e commit |
| `npm audit --json` em `frontend/package-lock.json` | 0 alertas | Não pode substituir o Dependabot: as fontes divergem e observam estados/branches diferentes |
| `dotnet list ... --vulnerable --include-transitive` | AutoMapper 14.0.0 alto; SQLitePCLRaw.lib.e_sqlite3 2.1.6 alto; System.Security.Cryptography.Xml 4.5.0 moderado; System.Text.Encodings.Web 4.5.0 crítico | Há risco crítico/alto no estado local mesmo com somente um alerta NuGet visível no Dependabot |
| Restauração e build .NET | Passam, mas emitem `NU1903` para AutoMapper | O build atual não bloqueia vulnerabilidade alta |
| xUnit | 4 testes executados; 3 passam e `AtualizarAsync_DeveAtualizarProduto` falha por conflito de tracking do Entity Framework | A linha de base de testes não está verde |
| Frontend | `npm run build` passa; `npm run lint` não concluiu em 180 segundos; não existe script/executor de testes | Ainda não há gate funcional reproduzível para upgrades npm |
| CI | `pipeline-front.yml` e `pipeline-back.yml` rodam em PR fechado para `main`; não há gate em PR para `develop` | A pipeline atual é pós-merge e não protege a integração |

O grafo NuGet identifica as raízes dos alertas transitivos:

- `Microsoft.EntityFrameworkCore.Sqlite` 8.0.10 introduz `SQLitePCLRaw.lib.e_sqlite3` 2.1.6. Não foi localizado uso de `UseSqlite` na aplicação; a remoção deve ser tentada antes de um upgrade.
- `Microsoft.AspNetCore.Identity` 2.2.0 introduz `System.Security.Cryptography.Xml` 4.5.0 e `System.Text.Encodings.Web` 4.5.0. O projeto é `net8.0` e usa tipos de Identity disponíveis no framework compartilhado; a remoção da referência antiga deve ser caracterizada por build e testes antes de se considerar um upgrade.
- AutoMapper 14.0.0 é direto e amplamente usado em perfis, serviços e controladores; deve ser atualizado para uma versão corrigida compatível, não removido.

No frontend, busca estática em `frontend/src` não encontrou importações de `cross-spawn`, `nanoid`, `next`, `next-themes` e `tailwindcss-animate`. Esses itens são candidatos, não conclusões: a remoção só é confirmada se busca estática, `npm ci`, build e testes permanecerem verdes. O `package-lock.json` vazio da raiz também é candidato à remoção, pois não há `package.json` correspondente.

Os Dockerfiles e scans de imagem permanecem sob a iniciativa `modernizacao-esteira-conteineres`. A única alteração de contêiner no escopo desta especificação é substituir `npm install` por `npm ci` no estágio de build do frontend, pois isso é necessário para respeitar o lockfile.

## Arquitetura proposta

### Artefatos sob controle de versão

- `frontend/package.json` e `frontend/package-lock.json`: fonte npm; sempre alterados no mesmo lote.
- `backend/LabSolos-Server-DotNet8/LabSolos-Server-DotNet8.csproj` e, quando aplicável, `backend/Tests/Tests.csproj`: fontes NuGet.
- `.codex/docs/specs/remediacao-vulnerabilidades-dependencias/inventario.md`: fotografia antes/depois e classificação de todos os alertas.
- `.codex/docs/specs/remediacao-vulnerabilidades-dependencias/pendencias.md`: somente riscos não encerrados, com responsável e data de revisão.
- `.github/scripts/audit_dependencies.py`: normalização das saídas JSON e aplicação da política de severidade.
- `.github/scripts/tests/test_audit_dependencies.py`: testes unitários com fixtures sem acesso à rede.
- `.github/workflows/security-dependencies.yml`: gate pré-merge para `develop` e execução manual.
- `.github/dependabot.yml`: atualização de versão para npm em `/frontend` e NuGet em `/backend`, com cadência semanal. Não será tratado como fonte de alertas de PR porque alertas de segurança continuam vinculados à branch padrão.

### Política de lotes

1. **Lote 0 — fundação e linha de base:** estabilizar a suíte existente, incluir `Tests.csproj` em `backend.sln`, implantar Vitest/Testing Library e o workflow pré-merge, ou comprovar que `fundacao-qualidade-testes` já entregou esses itens. Gerar `inventario.md` no mesmo SHA usado pelos comandos.
2. **Lote 1 — remoções seguras:** remover referências diretas sem uso comprovado, uma família por vez. Priorizar `Microsoft.AspNetCore.Identity` 2.2.0, `Microsoft.EntityFrameworkCore.Sqlite` e os candidatos npm listados no estado atual.
3. **Lote 2 — críticos e altos diretos:** atualizar AutoMapper e dependências npm diretas vulneráveis que permanecerem necessárias. Atualização major exige teste de caracterização da API consumida.
4. **Lote 3 — críticos e altos transitivos:** atualizar a dependência raiz; override/pin transitivo direto só é permitido quando o mantenedor da raiz o documenta como compatível e deve ser removido depois.
5. **Lote 4 — médios e baixos:** agrupar por dependência raiz e compatibilidade. O que não couber em lote seguro entra em `pendencias.md`.
6. **Reconciliação:** promover pelo fluxo normal `develop` → `main`, aguardar a atualização do grafo de dependências e anexar a contagem do Dependabot no `inventario.md`. O slug só pode ser encerrado depois dessa etapa.

Dentro de cada lote, a ordem é: manifesto → lockfile/restauração → testes direcionados → build/lint → audit local → atualização do inventário. Não se usa `npm audit fix --force`, atualização indiscriminada ou supressão automática.

## Fluxos e componentes

### Coleta da linha de base

1. Registrar SHA, branch, data UTC, versões de Node/npm/.NET e fontes consultadas.
2. Executar `npm audit --json` em `frontend` e `dotnet list package --vulnerable --include-transitive --format json` para a solução.
3. Exportar os alertas abertos do Dependabot pela API GitHub quando houver permissão `security-events: read`.
4. Normalizar os resultados por advisory e manifesto, sem somar como alertas distintos o mesmo advisory observado em fontes diferentes.
5. Resolver a dependência raiz por lockfile/npm e por `dotnet nuget why` para NuGet.
6. Gerar `inventario.md`; qualquer fonte indisponível fica marcada como `não coletada`, nunca como zero.

### Remediação de um lote

1. Selecionar itens com a mesma dependência raiz e preencher versão alvo e impacto esperado.
2. Criar ou executar o teste de caracterização relevante e observar RED quando houver quebra de contrato.
3. Remover a dependência sem uso ou aplicar a menor versão corrigida compatível.
4. Regenerar o lockfile somente pelo gerenciador oficial e revisar o diff para impedir upgrades não relacionados.
5. Executar testes direcionados, gates do ecossistema e o audit normalizado.
6. Marcar cada item como `remediado`, `pendente` ou `exceção`; `exceção` exige todos os campos de risco.

### Encerramento

1. Executar a esteira ampla em checkout limpo.
2. Confirmar que não há crítico/alto corrigível nas fontes locais.
3. Integrar em `develop` e promover para `main` pelo fluxo normal do repositório.
4. Reconsultar o Dependabot, que analisa a branch padrão, e registrar a evidência final.
5. Falhar o encerramento se existir crítico/alto corrigível ou registro incompleto para qualquer item não corrigido.

## Contratos e APIs

Não há alteração de endpoint HTTP, payload ou contrato público do produto.

### Contrato do inventário

Cada linha de `inventario.md` deve possuir:

| Campo | Regra |
|---|---|
| `id` | GHSA/CVE quando disponível; caso contrário identificador estável composto |
| `fonte` | `npm-audit`, `nuget-audit` e/ou `dependabot` |
| `coletado_em`, `branch`, `commit` | Identificam exatamente a fotografia |
| `ecossistema`, `manifesto`, `pacote`, `dependencia_raiz`, `relacao` | `relacao` é `direta` ou `transitiva` |
| `versao_atual`, `intervalo_vulneravel`, `severidade`, `versao_corrigida` | `versao_corrigida` pode ser `indisponível`, nunca vazia |
| `lote`, `estado`, `decisao` | Estados: `aberto`, `remediado`, `pendente`, `excecao` |
| `evidencia` | Comando/URL e resultado antes/depois |
| `mitigacao`, `risco_residual`, `responsavel`, `revisar_em` | Obrigatórios para `excecao` e `pendente` sem versão corrigida |

O normalizador deve sair com código `0` quando o inventário foi produzido e a política foi satisfeita, `1` quando existe crítico/alto corrigível aberto e `2` para entrada inválida ou fonte obrigatória ausente. Dados desconhecidos não podem ser convertidos em ausência de vulnerabilidade.

### Contrato do gate pré-merge

- `npm audit --audit-level=high` bloqueia vulnerabilidades críticas/altas no grafo resolvido pelo lockfile.
- `dotnet restore` usa `NuGetAudit=true`, `NuGetAuditMode=all`, `NuGetAuditLevel=high` e trata `NU1903`/`NU1904` como erro.
- O script normalizador valida fixtures/saídas e publica resumo, mas a API do Dependabot não é requisito de PR: ela observa a branch padrão e pode não representar o commit do PR.
- O gate deve rodar em `pull_request` direcionado a `develop` e em `workflow_dispatch`, com filtros para manifests, lockfiles, projetos, scripts de audit e o próprio workflow.

## Dados e migrações

Não há alteração de esquema ou migração de dados da aplicação.

`inventario.md` e `pendencias.md` são dados operacionais versionados. Alterações em manifesto e lockfile são indivisíveis: um PR/lote não pode atualizar apenas um deles. Saídas JSON brutas de CI são artefatos temporários, sem dados pessoais, retidos por 30 dias; o resumo permanente fica nos documentos da especificação.

## Segurança, privacidade e permissões

- O workflow usa `contents: read`; a coleta opcional do Dependabot usa somente `security-events: read` e não executa em contexto que exponha token a código de fork.
- Tokens nunca são gravados em arquivos, logs ou artefatos. Falta de permissão gera `não coletada` e impede a evidência final, sem interpretar a resposta como zero alertas.
- Nenhum alerta será dispensado ou encerrado via API. Supressão manual exige justificativa, mitigação, risco residual, responsável e revisão, conforme RF-003.
- Lockfiles e hashes de integridade são preservados; CI e Docker usam `npm ci`.
- Scripts de audit tratam nomes, versões e URLs como dados, sem interpolá-los em comandos shell.
- Dependências de desenvolvimento também entram no inventário porque executam em máquinas de mantenedores e CI; o inventário diferencia `runtime` de `desenvolvimento`.
- Scans de imagens e atualização de imagens-base continuam na especificação de modernização de contêineres, evitando misturar riscos do sistema operacional com npm/NuGet.

## Falhas, observabilidade e operação

| Falha | Comportamento esperado | Diagnóstico |
|---|---|---|
| Registry npm/NuGet indisponível | Falhar coleta/gate; não usar cache como prova de ausência | Fonte, comando e código de saída no resumo |
| API Dependabot sem permissão ou limitada | Marcar `não coletada`; bloquear apenas a reconciliação final | Status HTTP sem conteúdo de token |
| Divergência entre fontes | Manter ambos os achados e sinalizar divergência; prevalece o resultado mais conservador até reconciliação no mesmo SHA | Tabela por advisory, branch e commit |
| Lockfile alterado além do lote | Falhar revisão; regenerar a partir do manifesto limpo | Diff de dependências diretas e transitivas |
| Upgrade quebra contrato | Reverter o lote, dividir a atualização ou registrar bloqueio; não suprimir o teste | Nome da suíte/cenário e stack trace |
| Dependência sem versão corrigida | Não bloquear automaticamente médio/baixo; exigir registro completo de risco | Entrada em `pendencias.md` |
| Lint excede o tempo | Falhar com timeout explícito após a fundação definir escopo executável | Duração e arquivo/regra responsável |

Cada job publica no `GITHUB_STEP_SUMMARY`: commit analisado, contagem por ecossistema/severidade, itens críticos/altos corrigíveis e links para artefatos. Não será adicionada telemetria à aplicação.

## Compatibilidade, disponibilização e reversão

- Preservar .NET 8, React 18 e Vite; mudança de runtime/framework pertence a outra especificação.
- Preferir patch/minor corrigido. Major é um lote isolado e requer caracterização do contrato consumido.
- Remoção tem preferência sobre upgrade quando busca estática e testes comprovarem ausência de uso.
- Cada lote deve ser integrável e reversível separadamente. A reversão restaura manifesto e lockfile/projeto juntos e reexecuta o audit; nunca reverte somente o lockfile.
- A disponibilização segue PR para `develop`. A contagem do Dependabot só muda depois da promoção para a branch padrão `main`; por isso o merge em `develop` não encerra o slug.
- Se uma reversão reintroduzir crítico/alto, a implantação deve permanecer bloqueada até novo lote ou mitigação formal temporária.
- Mudanças em banco, API, imagens-base ou migração ampla de framework são proibidas neste escopo.

## Estratégia TDD e pirâmide de testes

### RED

1. Criar fixtures npm, NuGet e Dependabot contendo: crítico corrigível, alto transitivo, item sem correção, advisory duplicado em duas fontes e fonte ausente.
2. Escrever testes unitários do normalizador que falham enquanto raiz, severidade, correção, código de saída e campos de exceção não forem tratados.
3. Antes de remover/atualizar cada dependência, criar teste de caracterização do uso afetado: configuração AutoMapper; hashing/verificação de senha e JWT para Identity; persistência Npgsql para EF; cliente HTTP/cookies/roteamento/PDF para pacotes npm relevantes.
4. Registrar separadamente o RED histórico da suíte (`AtualizarAsync_DeveAtualizarProduto`) e estabilizá-lo no Lote 0; ele não pode ser atribuído a um upgrade posterior.

### GREEN

1. Implementar a menor normalização que satisfaça as fixtures e gere o contrato de inventário.
2. Remover ou atualizar uma raiz por lote e fazer passar primeiro os testes direcionados.
3. Regenerar o lockfile e executar audit, build, lint e suítes do ecossistema.
4. Fazer o workflow pré-merge reproduzir os mesmos comandos e versões dos manifests.

### REFACTOR

1. Consolidar parsing e ordenação determinística sem mudar o conteúdo esperado das fixtures.
2. Remover overrides transitivos temporários quando a raiz corrigida estiver disponível.
3. Deduplicar dependências e referências obsoletas, mantendo todas as suítes verdes.
4. Reexecutar a esteira ampla e comparar o inventário antes/depois.

Pirâmide esperada:

- **Unitários:** normalizador de audit, perfis AutoMapper e adaptadores frontend afetados.
- **Integração:** restauração/resolução de dependências, repositórios EF/Npgsql, autenticação e integrações HTTP críticas.
- **Contrato/build:** `npm ci`, TypeScript/Vite, restore/build .NET e validação dos lockfiles.
- **UI/E2E:** fluxos essenciais já definidos por `fundacao-qualidade-testes`, somente para lotes que alterem dependências usadas nesses fluxos.

## Esteira de qualidade

| Área | Comando local | Verificação de CI | Lacuna/ação |
|---|---|---|---|
| Instalação npm | `cd frontend && npm ci` | Job npm em PR para `develop` | Já há lockfile; trocar `npm install` por `npm ci` no Dockerfile |
| Audit npm | `cd frontend && npm audit --audit-level=high` | Mesmo comando; saída JSON anexada ao resumo | Hoje não existe gate e o resultado diverge do Dependabot |
| Build frontend | `cd frontend && npm run build` | Job npm em PR para `develop` | Passa localmente; manter aviso de bundle fora deste escopo |
| Lint frontend | `cd frontend && npm run lint` | Job npm com timeout e saída acionável | Hoje não conclui em 180 s; `fundacao-qualidade-testes` deve delimitar/corrigir a linha de base |
| Testes frontend | `cd frontend && npm run test -- --run` | Vitest/Testing Library no job npm | Script/executor ainda inexistente; implantação obrigatória no Lote 0 se a fundação não tiver sido concluída |
| Audit NuGet | `dotnet list backend/backend.sln package --vulnerable --include-transitive --format json` | Saída normalizada e artefato JSON | O comando lista achados, mas não é sozinho um gate confiável |
| Gate NuGet | `dotnet restore backend/backend.sln -p:NuGetAudit=true -p:NuGetAuditMode=all -p:NuGetAuditLevel=high -p:WarningsAsErrors="NU1903;NU1904"` | Mesmo comando em PR para `develop` | Hoje `NU1903` é apenas aviso; solução deve incluir `Tests.csproj` |
| Build backend | `dotnet build backend/backend.sln --no-restore -c Release` | Job .NET em PR para `develop` | Passa atualmente com aviso de vulnerabilidade |
| Testes backend | `dotnet test backend/backend.sln --no-build -c Release --nologo` | Job .NET em PR para `develop` | `Tests.csproj` não está na solução e 1 de 4 testes falha |
| Normalizador | `python -m unittest discover -s .github/scripts/tests -p "test_audit_dependencies.py"` | Job de segurança em PR para `develop` | Script e testes serão criados nesta iniciativa |
| Dependabot final | `gh api --paginate "repos/{owner}/{repo}/dependabot/alerts?state=open&per_page=100"` | Execução manual/pós-promoção em `main` | Dependabot analisa a branch padrão; não conta como gate do PR para `develop` |

O workflow existente em PR fechado para `main` permanece de entrega e não conta como validação pré-merge. O novo workflow deve usar matriz/jobs npm e .NET independentes, cache apenas dos gerenciadores e `concurrency` com cancelamento de execuções obsoletas.

## Matriz de rastreabilidade

| Requisito | Componentes | Testes | Evidência |
|---|---|---|---|
| RF-001 | normalizador, `inventario.md`, manifests/lockfiles | fixtures unitárias; coleta npm/NuGet/Dependabot; resolução de raiz | inventário datado com branch/SHA e todos os críticos/altos associados a raiz, correção e lote |
| RF-002 | política de lotes, manifests, lockfiles, gate pré-merge | caracterização por dependência; audit crítico/alto; build e suítes amplas | diff por lote, audits antes/depois e Dependabot reconciliado em `main` |
| RF-003 | `pendencias.md`, validador de campos de exceção | fixtures de item sem correção/campo ausente; teste do código de saída | registro com justificativa, mitigação, risco, responsável e revisão |
| RNF-001 | lockfiles, `npm ci`, solução .NET, suítes da fundação | build React/Vite; xUnit; Vitest/RTL; E2E afetado | jobs verdes no mesmo commit de cada lote |
| RNF-002 | inventário versionado, artefatos JSON, resumo CI | teste de ordenação/deduplicação e checkout limpo | comandos, versões, branch, SHA e contagens antes/depois |
| CA-001 | inventário + resolução de dependência raiz | fixture com alertas diretos/transitivos e coleta real | todo crítico/alto contém raiz, correção e lote |
| CA-002 | lotes 1–3 + gates npm/NuGet + reconciliação | audits sem crítico/alto corrigível; build/testes amplos | zero crítico/alto corrigível no commit promovido e Dependabot atualizado |
| CA-003 | `pendencias.md` + política de encerramento | validador rejeita exceção incompleta | cada alerta não corrigido tem justificativa, mitigação, responsável e `revisar_em` |

## Alternativas e decisões

| Decisão | Alternativas | Recomendação | Escolha confirmada | Consequências |
|---|---|---|---|---|
| Unidade de mudança | big bang; lote por ecossistema; lote por raiz/compatibilidade | Lote por raiz/compatibilidade | Confirmada pelo PRD | Menor blast radius e reversão simples |
| Dependência sem uso | atualizar; remover após comprovação | Remover primeiro | Derivada de RF-002 | Reduz superfície e grafo transitivo |
| Vulnerabilidade transitiva | override permanente; atualizar/remover raiz | Atualizar/remover raiz; override apenas temporário e documentado | Desnecessária decisão adicional | Evita versões incompatíveis e dívida oculta |
| Gate NuGet | apenas listar; tratar `NU1903`/`NU1904` como erro | Restore auditado com warnings críticos/altos como erro | Desnecessária decisão adicional | Transforma achado em bloqueio pré-merge |
| Fonte de verdade no PR | Dependabot; audits do lockfile | Audits reproduzíveis no commit do PR | Imposta pela limitação da branch padrão | Dependabot fica como reconciliação pós-promoção |
| Branch do Dependabot | mudar branch padrão; usar `target-branch: develop`; manter `main` | Manter `main`; usar `target-branch` apenas para updates de versão e respeitar o fluxo de promoção | Derivada de `CONTRIBUTING.md` | Alertas de segurança só fecham após promoção para `main` |
| Validação de design | sessão de decisão; dispensar; marcar desnecessária | Desnecessária | Confirmada pela ausência de alternativa material aberta | A decomposição em tarefas pode prosseguir |

Referências da decisão de branch: [Dependabot alerts](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependabot-alerts) e [Dependabot options reference](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference).

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Contagens diferentes entre `develop`, `main`, npm e GitHub Advisory Database | Registrar fonte/branch/SHA/data; reconciliar no mesmo commit promovido; usar o resultado mais conservador |
| Major de AutoMapper ou outra biblioteca alterar API/comportamento | Lote isolado, testes de configuração/mapeamento e versão mínima corrigida |
| Remoção por falso positivo da busca estática | Combinar busca, grafo de build, testes e E2E; reverter manifesto e lockfile juntos |
| Pacote transitivo corrigido exigir upgrade amplo da raiz | Dividir lote; preferir remoção da raiz sem uso; override somente temporário e documentado |
| Linha de base de testes já vermelha mascarar regressão | Lote 0 obrigatório e evidência separada do RED histórico |
| Lint inviável impedir feedback de PR | Corrigir/delimitar na fundação e impor timeout explícito; não declarar o gate pronto antes disso |
| Dependabot não refletir `develop` | Manter audits pré-merge e só encerrar após promoção/reconsulta em `main` |
| Novo advisory surgir durante os lotes | Regerar inventário ao início de cada lote e imediatamente antes do encerramento |
| Registry ou API indisponível produzir falso zero | Estado `não coletada`, código de erro e bloqueio da evidência correspondente |
| Atualização automática introduzir alterações não relacionadas | Proibir `--force`, revisar diff de lockfile e limitar cada lote por raiz |

## Perguntas abertas

Nenhuma bloqueante. A execução deve apenas revalidar, no início de cada lote, as versões corrigidas e a fotografia dos alertas, pois são dados temporais e não decisões de produto.
