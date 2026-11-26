# PRD — Aumentar a cobertura de branches para 80%

- **Status** pronto para especificação
- **Responsável** a definir
- **Atualizado em** 2026-11-25
- **Validação de descoberta** dispensada pelo usuário

## Contexto e problema

A issue [#505](https://github.com/ifpebj-ti/lab-solos/issues/505) estabeleceu a medição de cobertura de branches e um gate de CI de 70% por módulo, separando cobertura de linhas. O mantenedor informou que a cobertura atual está em 69% e, na issue [#512](https://github.com/ifpebj-ti/lab-solos/issues/512), definiu a meta de alcançar 80%.

A meta de 80% é um objetivo de qualidade para ampliar os testes. O usuário esclareceu que ela não deve elevar o gate da CI: a exigência automatizada continua em 70% por módulo. A inspeção do run [#45727800901](https://github.com/ifpebj-ti/lab-solos/actions/runs/45727800901), SHA `df1d55f1f0bb88f0a88d792a40efe010d75efe1a`, encontrou frontend em 76,82% (2708/3525 branches) no JSON de cobertura publicado e backend em **69,8% (2521/3610 branches)** no `Summary.json` do artefato HTML do backend. O valor de backend 91,67% (1540/1680) vinha de outro escopo: o coletor normalizado filtrava e deduplicava fontes, divergindo do relatório HTML visto pelo mantenedor. Para o backend, este PRD adota como medida o `Summary.json` do ReportGenerator que acompanha o artefato HTML; o gate e o JSON usado pelos badges devem espelhar suas contagens. A primeira tarefa confirmará a mesma fonte e identidade na execução oficial mais recente.

Sem essa distinção, a equipe pode tratar a meta como uma nova condição de bloqueio da CI ou não conseguir demonstrar quanto os testes avançaram. Também é importante evitar que o percentual suba por exclusões ou mudanças no escopo contabilizado, em vez de cobrir mais decisões relevantes.

## Objetivo e métricas de sucesso

- Alcançar pelo menos 80% de cobertura de branches em cada módulo: frontend pelo relatório oficial do frontend e backend pelo `Summary.json` que alimenta o artefato HTML do backend.
- Manter a CI exigindo 70% de branches em cada módulo, usando para o backend as mesmas contagens mostradas no artefato HTML; a faixa entre 70% e menos de 80% continua aprovada pelo gate, embora ainda abaixo da meta desta melhoria.
- Manter cobertura de linhas como métrica separada e informativa.
- Registrar os valores e contagens por módulo antes e depois do trabalho, associados às execuções que os produziram.

## Usuários e jornadas

- A pessoa desenvolvedora consulta os branches descobertos como não cobertos e acrescenta testes para decisões e comportamentos relevantes.
- A pessoa mantenedora compara a cobertura de cada módulo antes e depois e verifica se ambos atingiram 80%, sem alterar o bloqueio de 70% da CI.
- A pessoa revisora consulta os badges e relatórios existentes e encontra documentação que distingue claramente a meta de 80% da exigência automatizada de 70%.

## Escopo

### Incluído

- Registrar a linha de base de branches do frontend e do backend antes das alterações.
- Ampliar a suíte com testes de comportamentos e caminhos condicionais relevantes até que cada módulo alcance 80%.
- Preservar o gate da CI em 70% por módulo.
- Documentar, no README e no Plano de Testes, a diferença entre a meta de 80% e o gate de 70%.
- Manter resultados de frontend e backend visíveis individualmente, sem ocultar um módulo atrás de uma média.
- Fazer o gate, o JSON de backend usado pelos badges e o `Summary.json` do artefato HTML compartilharem as mesmas contagens de branches do ReportGenerator.

### Fora de escopo

- Elevar o gate da CI de 70% para 80%.
- Criar uma exigência mínima de cobertura de linhas.
- Alterar o escopo da métrica para melhorar o percentual sem adicionar cobertura real; a correção para fazer o gate refletir o escopo já exibido no artefato HTML está incluída.
- Alterar requisitos funcionais da aplicação, regras de proteção de branches ou gates de segurança não relacionados.

## Requisitos funcionais

### RF-001 — Alcançar a meta de cobertura por módulo

Ao concluir esta melhoria, os relatórios oficiais devem mostrar pelo menos 80% de cobertura de branches separadamente no frontend e no backend. A cobertura deve resultar de testes que exercitam caminhos e decisões relevantes do código elegível.

### RF-002 — Preservar o gate automatizado de 70%

A CI deve continuar exigindo pelo menos 70% de cobertura de branches em cada módulo, sem adotar 80% como limiar de aprovação. Relatórios ausentes ou inválidos e módulos abaixo de 70% continuam reprovando conforme a política existente.

### RF-003 — Comunicar meta e gate sem ambiguidade

A documentação do README e do Plano de Testes deve identificar 80% como meta de cobertura e 70% como exigência do gate de CI, ambos aplicados a branches por módulo. A cobertura de linhas deve continuar identificada como uma métrica separada e informativa.

### RF-004 — Registrar a evolução da cobertura

A linha de base e o resultado após a mudança devem apresentar frontend e backend separadamente, com percentuais e contagens de branches. Os resultados devem permitir identificar as execuções que os produziram.

### RF-005 — Usar no gate a mesma medição de backend exibida no artefato

Para o backend, o gate e o JSON de cobertura usado pelos badges devem usar os valores inteiros `coveredbranches` e `totalbranches` de `summary` no `Summary.json` do ReportGenerator, o mesmo sumário apresentado pelo artefato HTML. Contar todos os assemblies que esse sumário inclui, sem filtro adicional. A decisão continua usando a razão sem arredondamento; linhas permanecem informativas.

## Requisitos não funcionais

### RNF-001 — Preservar a integridade da medição

O aumento deve decorrer de testes adicionais sobre o mesmo escopo de código elegível e da mesma definição de cobertura. Exclusões ou alterações de filtros não podem ser usadas para aumentar artificialmente o percentual.

### RNF-002 — Manter a rastreabilidade

Os valores registrados antes e depois devem estar associados à revisão e à execução correspondente, sem apresentar resultados antigos como se fossem atuais.

## Critérios de aceitação

### CA-001 — Linha de base por módulo (RF-004, RNF-002)

- **Dado** a execução oficial mais recente disponível antes da mudança
- **Quando** a linha de base for registrada
- **Então** os percentuais e as contagens de branches do frontend e do backend aparecem individualmente, vinculados à revisão e à execução de origem
- **E** backend usa `Summary.json` do artefato HTML, que confirma a observação de aproximadamente 69% (2521/3610 no run #45727800901), sem atribuir esse valor ao frontend.

### CA-002 — Meta alcançada nos dois módulos (RF-001, RF-004, RNF-002)

- **Dado** o relatório oficial de uma revisão após a inclusão dos testes
- **Quando** a melhoria for avaliada para conclusão
- **Então** frontend e backend apresentam pelo menos 80% de cobertura de branches cada um, com percentuais e contagens verificáveis.

### CA-003 — Gate continua em 70% (RF-002)

- **Dado** resultados válidos de branches de ambos os módulos
- **Quando** cada módulo atinge pelo menos 70%, ainda que algum resultado esteja abaixo de 80%
- **Então** a CI aprova pelo gate de cobertura; esse resultado, porém, não atende à meta de conclusão desta melhoria.
- **E dado** que qualquer módulo esteja abaixo de 70%, ou que sua medição esteja ausente ou inválida
- **Quando** a CI avalia a cobertura
- **Então** o gate reprova conforme a regra existente.

### CA-004 — Documentação diferencia os percentuais (RF-003)

- **Dado** o README e o Plano de Testes
- **Quando** uma pessoa consultar a política de cobertura
- **Então** encontra 80% como meta de qualidade e 70% como limiar de aprovação da CI, por módulo
- **E** encontra cobertura de linhas claramente separada e sem limiar de aprovação.

### CA-005 — Medição não é inflada por exclusões (RNF-001, RNF-002)

- **Dado** os relatórios antes e depois da melhoria
- **Quando** suas contagens e fontes forem comparadas
- **Então** o aumento decorre de branches exercitados pelos testes e mantém o escopo de código elegível, com a origem dos resultados identificável.

### CA-006 — Gate de backend corresponde ao artefato HTML (RF-002, RF-005, RNF-002)

- **Dado** o artefato HTML do backend produzido para uma execução completa de testes
- **Quando** o gate e o JSON backend que alimenta os badges forem gerados para a mesma execução
- **Então** suas contagens de branches cobertos e totais são idênticas às propriedades `coveredbranches` e `totalbranches` do `Summary.json` do artefato
- **E** o gate reprova uma razão exata abaixo de 70%, mesmo que a contagem normalizada anterior indicasse valor maior
- **E** a cobertura de linhas não altera a decisão.

## Estratégia de validação

- Obter a linha de base oficial e registrar percentuais, contagens, revisão e execução para frontend e backend; para backend usar `Summary.json` do artefato HTML.
- Identificar caminhos condicionais não cobertos e verificar que os novos testes exercitam comportamentos relevantes.
- Conferir a conclusão apenas quando os dois módulos atingirem 80% no relatório oficial.
- Verificar que o gate continua aceitando resultados válidos de 70% ou mais por módulo, inclusive resultados abaixo da meta de 80%, e continua reprovando módulos abaixo de 70% ou resultados inválidos; confirmar que o backend usa as contagens inteiras do `Summary.json`.
- Comparar escopo e contagens para verificar que os percentuais não aumentaram por novas exclusões.
- Conferir o README e o Plano de Testes quanto à distinção entre meta de 80%, gate de 70% e métrica de linhas.

## Dependências e riscos

- Depende da coleta, do relatório e do gate por módulo entregues na [#505](https://github.com/ifpebj-ti/lab-solos/issues/505) e na [PR #510](https://github.com/ifpebj-ti/lab-solos/pull/510).
- O backend normalizado anteriormente divergia do HTML. No run #45727800901, o artefato HTML informa 2521/3610 (69,8%), enquanto o JSON normalizado anterior informava 1540/1680 (91,67%). A nova fonte oficial do gate e da meta do backend é o `Summary.json` do artefato HTML; a tarefa inicial confirmará os dados da execução mais recente e registrará essa identidade.
- Com a contagem do backend observada no run #45727800901, 2521/3610 (69,8%) fica abaixo do gate de 70%; portanto a correção de medição pode revelar uma reprovação real até que novas execuções cubram branches suficientes. O limiar segue em 70%, sem tolerância baseada no valor arredondado.
- Uma meta por módulo evita que o resultado alto de um lado esconda o menor percentual do outro.
- Buscar o percentual sem priorizar o comportamento pode gerar testes frágeis ou pouco úteis; a revisão deve considerar a relevância dos caminhos cobertos.

## Suposições

- A cobertura oficial continua dividida em dois módulos, frontend e backend, e o gate de 70% é aplicado separadamente a ambos; o backend usa as contagens agregadas do ReportGenerator `Summary.json` visível no artefato HTML.
- O usuário definiu 80% como meta para cada módulo, não como nova condição de aprovação da CI.
- Cobertura de linhas continua informativa, sem limite mínimo.

## Perguntas abertas

Nenhuma decisão de produto bloqueia a especificação técnica. A diferença foi explicada: o HTML de backend mostra 69,8% (2521/3610) e o JSON normalizado anterior mostrava 91,67% (1540/1680) porque media outro escopo. A primeira tarefa confirma o run mais recente, mantendo o `Summary.json` como fonte oficial de backend.

## Decisões da validação de descoberta

| Decisão | Recomendação | Resposta confirmada | Impacto |
|---|---|---|---|
| Meta de cobertura | 80% por módulo | Confirmada na issue #512; frontend e backend devem chegar a 80% separadamente | Define o resultado necessário para concluir a melhoria. |
| Limiar de aprovação da CI | Manter 70% por módulo | Confirmado pelo usuário após a criação da issue; 80% não deve bloquear a CI | Mantém intacta a regra de aprovação existente. |
| Cobertura de linhas | Métrica informativa separada | Mantida conforme a política existente | Linhas não determinam o gate nem a meta desta melhoria. |
| Fonte da medição de backend | JSON normalizado filtrado ou sumário do artefato HTML | Usar as contagens do ReportGenerator `Summary.json` para gate, JSON de backend e badges | Confirmada pelo usuário após comparar o artefato de 69,8% com o JSON normalizado de 91,67% | O gate pode revelar valor abaixo de 70%; o resultado não será arredondado para passar. |
| Validação de descoberta | Dispensar nova sessão de perguntas | Dispensada conforme orientação anterior do usuário para não fazer perguntas e prosseguir com o contexto disponível | A distinção entre meta e gate foi confirmada diretamente pelo usuário; demais detalhes seguem a issue #512 e o PRD existente de cobertura. |
