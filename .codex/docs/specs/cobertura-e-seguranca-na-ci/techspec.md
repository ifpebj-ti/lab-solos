# Especificação técnica — Cobertura e segurança na CI

- **Status** Rascunho — validação de design pendente
- **PRD** [Cobertura e segurança na CI](./prd.md)
- **Atualizado em** 2026-11-15
- **Validação de design** pendente para métrica, políticas, publicação e captura passiva
- **Validação de descoberta** dispensada pelo usuário

## Resumo técnico

Estender os testes e as verificações pré-merge existentes com cobertura individual de frontend e backend, análise estática defensiva com Semgrep e avaliação exclusivamente passiva com OWASP ZAP do tráfego dos testes de navegador. O limiar de 70% vale para cada módulo. Um resultado ausente ou inválido reprova a verificação correspondente. README e Plano de Testes da Wiki orientarão a consulta à revisão, aos resultados e às respectivas políticas.

## Estado atual

- `frontend/package.json` fornece Vitest 4, React Testing Library e Playwright. `frontend/vite.config.ts` configura jsdom e exclui `e2e/**` do Vitest. O manifesto não declara provedor de cobertura nem configura sua coleta.
- `backend/backend.sln` já inclui `backend/Tests/Tests.csproj`. O projeto .NET 8 inclui xUnit, Coverlet, Testcontainers PostgreSQL e testes de integração. O job de backend executa uma seleção de integração e migração seguida da solução completa. Nenhuma dessas chamadas ativa a coleta do Coverlet.
- `Container CI` roda antes do merge em PR para `develop` nas ações `opened`, `synchronize`, `reopened`, `edited` e `ready_for_review`, em `merge_group` e por execução manual. `Quality gate` consolida os jobs, inclusive `Browser security E2E`, via `.github/scripts/check_quality_gate.py`. A lista de checks exigidos pela configuração remota de `develop` não foi consultada nesta etapa local.
- `CodeQL quality for develop` analisa C# e JavaScript/TypeScript em PR para `develop` nas ações `opened`, `synchronize`, `reopened` e `ready_for_review`, em push para `develop`, `merge_group` e execução manual. Trivy e a auditoria de dependências também têm verificações próprias. O workflow de dependências filtra caminhos em PR e também aceita `merge_group` e execução manual.
- `Browser security E2E` sobe `docker-compose-security-e2e.yml`, executa o projeto Playwright `security` e descarta a composição. As duas especificações desse projeto exercitam frontend e API no proxy HTTPS local. A configuração desativa trace e screenshot para o projeto. Há cobertura funcional de tráfego de navegador e chamadas do contexto HTTP do Playwright. A chegada desses fluxos ao ZAP precisa ser comprovada após decidir a captura. O resultado atual de navegador e o Plano de Testes da Wiki não constituem evidência de execução do ZAP. A Wiki cita JMeter sem workflow local identificado e a esteira inspecionada não executa Semgrep.

## Arquitetura proposta

Reutilizar os coletores junto das suítes de teste, o validador Python dos contratos de CI, o job de navegador e o gate agregador. O desenho proposto mantém os jobs existentes e conecta a eles as novas verificações após aprovação das decisões abaixo. Se a análise exigir job próprio, integrar sua conclusão ao agregador e aos testes do contrato. Configurar a política em fonte versionada com revisão identificável e aplicar a mesma avaliação aos dois módulos, preservando os resultados individuais.

### Fluxos e componentes

1. **Cobertura** — executar a suíte Vitest com provedor bloqueado no lockfile e medir uma única execução completa da solução .NET com o coletor atual. A execução direcionada de integração mantém seu propósito e fica fora do cálculo para não contar os mesmos testes duas vezes. Empregar diretórios temporários da execução e relatórios distintos por módulo. Publicar os relatórios e o sumário antes de encerrar a etapa de limiar, inclusive em falhas com relatório disponível.
2. **Semgrep** — avaliar o código React/TypeScript do frontend e C# do backend através de regras defensivas versionadas ou fixadas em versão imutável. Validar a configuração e as exceções antes de classificar os resultados. Expor ambos os resultados com regra, severidade, caminho relativo, linha e estado da exceção, sem publicar excertos de código ou valores sensíveis. Manter CodeQL no fluxo próprio.
3. **ZAP passivo** — consumir somente mensagens HTTP originadas pelos testes existentes e destinadas à composição descartável. Aceitar apenas o host e a porta da composição corrente, excluindo healthchecks, instalação, serviços externos e tráfego do runner. Isolar o analisador e sua interface administrativa, sem saída de rede para outros destinos. A política nunca aciona varredura ativa, descoberta, reprodução de requisições ou geração de tráfego HTTP pelo ZAP. Ao final, confirmar a captura do frontend e da API, aguardar a conclusão da análise passiva por tempo limitado e produzir relatório sanitizado. A eventual integração com Playwright deve preservar os comandos, a origem HTTPS local e as asserções dos testes existentes.
4. **Consulta** — o README aponta a cobertura gerada pela CI, incluindo as duas medidas e sua definição. O resultado de PR deve referenciar a revisão realmente testada. A publicação do badge tem origem confiável, referência explícita e retenção documentada. O Plano de Testes da Wiki indica o uso efetivo de Vitest, xUnit, integração PostgreSQL, Playwright, CodeQL, Trivy, auditoria de dependências e, após aceite, Semgrep e ZAP. Para cada camada, registra ambiente, tipo de dados, comando ou workflow, gatilhos, falhas bloqueantes e como chegar à execução e aos artefatos. JMeter fica descrito conforme seu estado planejado.

## Contratos e APIs

O resultado de CI identifica verificação, módulo quando aplicável, SHA testado, URL ou identificador de execução e tentativa, revisão da política e resultado final. Em PR, preservar o SHA efetivamente analisado quando o checkout utiliza commit de merge e registrar separadamente o SHA da contribuição quando disponível.

| Verificação | Entrada e resultado | Regra de decisão |
| --- | --- | --- |
| Cobertura | Relatório do coletor com módulo, métrica, numerador, denominador, percentual e motivo de eventual invalidação | Aprova somente com ambos os resultados válidos e cada proporção de pelo menos 70%. Calcula o limiar a partir das contagens sem arredondar para apresentação. Arquivo ausente, vazio ou ilegível, denominador nulo, contagens inconsistentes, módulo fora de escopo ou relatório de outra execução resultam em medição inválida. |
| Semgrep | Configuração de regras, cobertura do frontend e backend e resultado de análise com versão e regras aplicadas | Um achado que cumpre a política bloqueia. Exceções, se aprovadas, têm identificador, justificativa, escopo, aprovador e validade. Erro do scanner, política inválida ou módulo sem resultado gera análise incompleta. |
| ZAP | Mensagens fornecidas exclusivamente pela execução corrente dos E2E de segurança, com contagem de mensagens elegíveis, resultado de processamento, alertas sanitizados agrupados por regra/severidade | Falha da política bloqueia. Ausência de captura esperada, troca de origem, fila incompleta, erro de sanitização ou relatório inválido resultam em análise incompleta. |

Cada verificação distingue `aprovada`, `reprovada pela política` e `sem resultado válido`. Somente a primeira encerra com sucesso. Um erro na suíte de teste permanece visível mesmo se houver relatório parcial. O badge deve deixar visível uma medição indisponível de acordo com o mecanismo escolhido e identificar o SHA/ref que sustenta o valor publicado.

## Dados e migrações

O escopo utiliza arquivos temporários da CI, metadados de execução, regras e exceções versionadas, artefatos de cobertura, resultados de análise e documentação. Não requer esquema no PostgreSQL ou contrato novo na API do produto. A estrutura do relatório fornece identificadores de política, execução e módulo e mantém o resultado humano consultável mesmo após expiração dos detalhes, conforme retenção acordada. A mudança na Wiki precisa registrar a revisão conferida e sua vinculação documental. Se a página entrar no contrato editorial existente, atualizar o manifesto de documentação após a revisão correspondente da Wiki.

## Segurança, privacidade e permissões

Executar checks de PR com permissão de leitura e sem credenciais de serviço. Configuração que determina bloqueios e exceções precisa de revisão para impedir que a alteração avaliada remova a própria proteção sem visibilidade. Caso o badge exija escrita, restringir a publicação a uma revisão de referência confiável com a permissão mínima aprovada, sem transferir segredos para jobs de PR. Acesso a artefatos e badge exige validação com o perfil do avaliador.

Mensagens usadas pelo ZAP são descartáveis e ficam restritas ao job, à origem local e aos dados sintéticos. Nunca anexar tráfego bruto, traces, armazenamento de sessão, credenciais, cookies, tokens, valores de cabeçalhos, query strings, corpos ou nomes de usuários. O relatório compartilhável usa campos permitidos previamente, como identificador da regra, severidade e contagem, com rota normalizada quando segura. Testar sanitização com valores sentinela sintéticos e garantir o descarte das mensagens mesmo após erro ou cancelamento.

## Falhas, observabilidade e operação

O sumário de cada job deve registrar violação, falha de infraestrutura ou ausência de resultado, incluindo a etapa e o módulo afetados. Gravar sumário por tentativa e publicar artefato apenas após validar o conteúdo. Para ZAP, registrar de forma agregada volume observado de frontend e API, conclusão do processamento e encerramento da composição. Uma execução cancelada terá estado inconclusivo e um registro de execução com a conclusão da plataforma. Documentar retenção dos artefatos, acesso e procedimento de reexecução no Plano de Testes.

## Compatibilidade, disponibilização e reversão

Medir a linha de base dos dois módulos com o escopo aprovado antes de tornar o check obrigatório. Se ambos ainda não alcançarem 70%, ampliar testes unitários ou de integração do código descoberto até o limiar, sem reduzir arbitrariamente o denominador e sem novas jornadas E2E. Conferir os estados em execuções de validação e, depois, vincular a avaliação ao `Quality gate` ou aos checks aprovados. Mudanças de configuração de proteção dependem do responsável. Em caso de regressão da infraestrutura, reverter a integração defeituosa para a revisão anterior do workflow, ajustar o gate de forma coordenada e identificar o período sem evidência no Plano de Testes e badge. Preservar os relatórios anteriores até a retenção acordada.

## Estratégia TDD e pirâmide de testes

### RED

- Ensaios unitários do validador com relatórios sintéticos e oráculo em contagens: ambos no limiar, frontend abaixo, backend abaixo, `69,99%`, denominador ausente, XML/JSON inválido, arquivos repetidos ou de outra revisão.
- Ensaios de contrato da política defensiva com resultados sintéticos para os dois módulos: aprovação, bloqueio, exceção aprovada e expirada, configuração ausente, falha do coletor e análise de um único módulo.
- Ensaios de integração passiva com respostas controladas servidas às jornadas existentes: aprovação, cabeçalho defensivo esperado ausente segundo regra aprovada, ausência de mensagens, interrupção do processamento e campos sentinela no artefato. Verificar que a etapa acrescenta zero requisições e que apenas mensagens da composição chegam à análise. Sem executar uma jornada nova.
- Testes de contrato do workflow para exigir o resultado dos jobs, validar permissões e referência e rejeitar configuração que ativa descoberta, reenvio, análise ativa ou upload bruto. Registrar a falha inicial de cada caso antes de ligar os componentes.

### GREEN

Ativar os coletores e validar os resultados por módulo. Integrar política defensiva e análise passiva aprovadas à execução existente, com publicação de resumos e falha conforme o contrato. Registrar as execuções de sucesso e falha e completar a conferência editorial e o acesso a partir do README e da Wiki.

### REFACTOR

Reaproveitar o contrato de resultados e os mecanismos existentes de sumário e agregação, mantendo testes unitários para parsing e política, testes de integração para coleta/sanitização e testes de contrato para os jobs. Reexecutar as suítes e a demonstração da mesma jornada Playwright após refatorar.

## Esteira de qualidade

Comandos confirmados no checkout, relativos à raiz exceto onde indicado. Os comandos de cobertura são planejados para a configuração a aprovar.

| Área | Comando local | Verificação de CI | Lacuna ou ação |
| --- | --- | --- | --- |
| Frontend | Em `frontend`, `npm ci`, `npm run test -- --run`, `npm run lint`, `npm run build` | `Container CI / Frontend quality`, Node 20 | Incluir provedor compatível com o Vitest bloqueado e validar o comando planejado `npm run test -- --run --coverage`. |
| Backend | `dotnet restore backend/backend.sln --locked-mode`, `dotnet build backend/backend.sln --no-restore -c Release --nologo --disable-build-servers`, `docker info`, `dotnet test backend/Tests/Tests.csproj --no-build --no-restore -c Release --nologo --disable-build-servers --filter "FullyQualifiedName~Integration\|FullyQualifiedName~CredentialLifecycleMigrationTests"` e `dotnet test backend/backend.sln --no-build --no-restore -c Release --nologo --disable-build-servers` | `Container CI / Backend quality`, .NET SDK 8.0.419 e Docker para PostgreSQL | Adicionar `--collect:"XPlat Code Coverage"` à execução completa com diretório de resultados dedicado e filtros a confirmar. |
| E2E de autenticação e interface | `docker compose -f docker-compose-e2e.yml up -d --build --wait`. Em `frontend`, `npm run test:e2e -- --project=real --project=ui`. Ao encerrar, `docker compose -f docker-compose-e2e.yml down --volumes --remove-orphans` | `Container CI / Authentication E2E` | Documentar dados sintéticos e artefatos de falha. |
| E2E de segurança | `docker compose --project-name lab-solos-ci-browser-security --file docker-compose-security-e2e.yml config --quiet` e, com os mesmos argumentos, `up --detach --build --wait` e `down --volumes --remove-orphans`. Em `frontend`, `npx --no-install playwright install --with-deps chromium` no runner Linux e `npm run test:e2e -- --project=security` | `Container CI / Browser security E2E` | Desenvolver o adaptador e o verificador passivo quando a forma de captura for aprovada. |
| CodeQL e Semgrep | CodeQL executa pela matriz do workflow. O comando Semgrep depende da política aprovada | `CodeQL quality for develop` nos eventos registrados acima | Definir CLI reproduzível, versão e conjuntos de regras de Semgrep após aprovar política e exceções. |
| Contratos e Wiki | `python -m unittest discover -s .github/scripts/tests -p "test_*.py" -v`. Após instalar actionlint pelo script, `.tmp/actionlint/actionlint .github/workflows/container-ci.yml` | `Container CI / Workflow contracts` e `Documentation quality`. O segundo verifica a revisão fixa da Wiki com `.github/scripts/check_delivery_docs.py` | Incluir contratos dos novos checks e conferência editorial do Plano de Testes. A navegação pelo badge e relatórios precisa do perfil de avaliação. |

## Matriz de rastreabilidade

| Requisito | Componentes | Testes | Evidência esperada |
| --- | --- | --- | --- |
| RF-001 | Vitest, Coverlet, jobs de módulo e README | Contrato de relatórios e navegação | Percentual por módulo, métrica, escopo e destino do badge |
| RF-002 | Validador de cobertura e gate | Unitário para fronteira, falta e falha em cada módulo | Motivo por módulo e conclusão de CI |
| RF-003 | Política Semgrep, workflow e CodeQL | Contrato de aprovação, bloqueio e exceção | Resultados por módulo e CodeQL disponível |
| RF-004 | Playwright, composição de segurança, analisador e gate | Integração com respostas controladas e teste de isolamento | Relatório passivo com resultado da política |
| RF-005 | Plano de Testes da Wiki e README | Conferência editorial e navegação | Revisão da página, comandos e links conferidos |
| RNF-001 | Captura isolada, filtros e artefatos | Contrato de zero requisições extras e teste de sanitização | Volume agregado e artefato sem sentinelas sensíveis |
| RNF-002 | Resumos, metadados e gate | Contrato de revisão e falhas de infraestrutura | Estado correto e execução identificada |
| CA-001 | Badge, sumário e dois relatórios | Navegação com perfil de revisão e avaliação | Registros de consulta, mesma revisão e definição da métrica |
| CA-002 | Avaliação de cobertura | Testes de ambos no limiar, um abaixo e medida inválida | Três resultados com módulo e causa |
| CA-003 | Política Semgrep e workflow CodeQL | Amostras sintéticas de aprovação, bloqueio e exceção | Regra, exceção, revisão e resultado de ambos os módulos |
| CA-004 | Composição, testes, ZAP passivo e relatório sanitizado | Integração aprovada e reprovada por política | Dois resultados, origem, ausência de requisições extras e sanitização |
| CA-005 | Semgrep, ZAP, falhas e agregação | Teste com coletor incompleto e captura ausente | Diagnóstico de falha ou indisponibilidade e reprovação |
| CA-006 | Wiki e links dos workflows | Conferência amostral das camadas e da consulta a ZAP | Checklist datado de links e procedimentos |

## Alternativas e decisões

| Decisão | Alternativas e contrapartidas | Recomendação | Escolha confirmada | Consequências |
| --- | --- | --- | --- | --- |
| Métrica e inclusão | Linhas têm denominador comparável entre os coletores. Ramos dão mais peso a decisões e variam mais com instrumentação | Linhas, incluindo arquivos elegíveis não exercitados, com exclusões restritas a testes, artefatos gerados e suporte aprovado | Definida na [decisão local](../decisoes-de-planejamento.md#cobertura-análise-defensiva-e-releases) | Define filtros, cálculo, linha de base e esforço para 70%. |
| Publicação do badge | Publicação controlada em armazenamento autorizado permite valor atual e exige política de escrita e retenção. Um provedor de cobertura adiciona serviço e contas | Usar origem confiável com um indicador para cada módulo ou um badge que leve à página com ambas as medidas | Diretriz definida, com pré-requisitos operacionais na [decisão local](../decisoes-de-planejamento.md#cobertura-análise-defensiva-e-releases) | Define formato, origem confiável, retenção e acesso do avaliador. |
| Eventos e análise estática | Reusar eventos sem filtro do Container CI torna o gate previsível. Um workflow separado exige coordenar checks e resultados em todos os eventos | Alinhar aos gatilhos do Container CI e adotar política de regras revisáveis com exceções pontuais e prazo | Diretriz definida, com pré-requisitos operacionais na [decisão local](../decisoes-de-planejamento.md#cobertura-análise-defensiva-e-releases) | Define responsabilidade, regras/severidades bloqueantes, revisão, exceções e jobs. |
| Captura ZAP | Interposição local passiva pode observar ambos os contextos se o TLS e a origem forem preservados. A entrega local das mensagens capturadas pelos contextos de teste exige comprovar completude e manter adaptador | Validar primeiro se uma captura local isolada preserva as asserções e observa ambos os contextos sem tráfego adicional. Selecionar a integração após a conferência | Diretriz definida, com pré-requisitos operacionais na [decisão local](../decisoes-de-planejamento.md#cobertura-análise-defensiva-e-releases) | Define integração, formato, isolamento, regras passivas, severidade, exceções e relatório. |
| Limiar e recorte | Conforme PRD | 70% por módulo e ZAP passivo restrito às jornadas existentes | Confirmados no PRD | Gate individual, dados sintéticos e composição descartável. |

## Riscos e mitigação

- Um relatório com apenas arquivos exercitados superestima cobertura. Validar o denominador contra escopo aprovado e testar arquivo elegível sem visitas.
- TLS, escopo de host ou contexto HTTP separado podem ocultar parte do tráfego. Demonstrar que as mensagens existentes de frontend e API chegam ao analisador e que a integração não altera as verificações do projeto `security`.
- Alteração de regras e expiração de artefatos dificultam reprodução. Fixar versões, publicar identificadores de regras, política e revisão e registrar retenção.
- Falha na coleta ou liberação de credenciais pode ficar mascarada por um relatório vazio ou de outra execução. Conferir identidade e formato do artefato e aplicar sanitização em lista de campos permitidos.

## Perguntas abertas

- Consultar as [decisões de planejamento](../decisoes-de-planejamento.md#cobertura-análise-defensiva-e-releases).
- Identificar responsáveis pelas regras e confirmar a versão pinada. Demonstrar a captura passiva no ensaio local.
- Confirmar destino do badge, acesso do avaliador e permissões dos relatórios e da Wiki.

A auditoria desta especificação usou manifestos, workflows, testes e o Plano de Testes do checkout local. A linha de base de cobertura, os testes das mudanças propostas e as configurações remotas de checks e acesso permanecem por verificar.
