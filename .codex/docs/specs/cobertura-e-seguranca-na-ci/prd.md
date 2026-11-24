# PRD — Cobertura e segurança na CI

- **Status** rascunho
- **Responsável** a definir
- **Atualizado em** 2026-11-15
- **Validação de descoberta** dispensada pelo usuário

## Contexto e problema

A avaliação da Unidade 1 pede evidência verificável de cobertura e de análise com Semgrep e OWASP ZAP. A CI já executa testes de frontend e backend e tem jobs de segurança, incluindo CodeQL e testes de navegador em stack descartável. O backend declara Coverlet, mas executar as suítes por si só não informa a parcela de código exercitada. O Plano de Testes da Wiki cita ZAP e JMeter sem indicar como comprovar as respectivas execuções. [Cobertura #487](https://github.com/ifpebj-ti/lab-solos/issues/487) · [Semgrep #489](https://github.com/ifpebj-ti/lab-solos/issues/489) · [ZAP #490](https://github.com/ifpebj-ti/lab-solos/issues/490) · [Plano de Testes #494](https://github.com/ifpebj-ti/lab-solos/issues/494)

## Objetivo e métricas de sucesso

- Publicar cobertura de código por módulo e exigir pelo menos 70% em cada um na métrica documentada.
- Permitir que a equipe confirme no PR quando Semgrep e ZAP passaram, bloquearam ou ficaram sem evidência válida.
- Permitir que o avaliador parta do README ou da Wiki e localize a cobertura, os resultados disponíveis e os procedimentos para conferir cada camada de testes.

## Usuários e jornadas

- A pessoa que contribui com uma mudança abre um PR, consulta as verificações, identifica o módulo ou regra que causou uma falha e encontra o relatório correspondente.
- A pessoa revisora verifica se o resultado corresponde à revisão do PR e se exceções de análise foram justificadas.
- O avaliador abre o badge de cobertura ou o Plano de Testes, distingue as ferramentas em uso das planejadas e localiza os registros de execução.

## Escopo

### Incluído

- Medição de cobertura no frontend com Vitest e no backend .NET, relatórios por módulo, verificação bloqueante na CI e badge no README.
- Análise estática defensiva com Semgrep para código React/TypeScript e .NET, mantendo a execução de CodeQL.
- Análise passiva com ZAP sobre o tráfego HTTP dos testes existentes na stack descartável da CI com dados sintéticos.
- Atualização do Plano de Testes na Wiki com as camadas executadas, seus ambientes, dados, comandos, gatilhos, verificações bloqueantes e resultados.

### Fora de escopo

- Elevar o limiar de cobertura para 90% nesta entrega.
- Substituir CodeQL ou os testes atuais e acrescentar novas jornadas E2E.
- Varredura ativa, exploração de vulnerabilidades, geração de tráfego pelo ZAP, uso de ambientes reais ou de dados de produção.
- Implantação de uma ferramenta de desempenho apenas por constar no plano atual.

## Requisitos funcionais

### RF-001 — Coletar e publicar cobertura por módulo

A CI deve publicar para o frontend e para o backend o percentual de cobertura da revisão testada. A documentação deve definir a métrica usada no limiar, o que integra o cálculo e as exclusões. O README deve apresentar badge vinculado à cobertura gerada pela CI e indicar onde consultar os dois resultados. [#487](https://github.com/ifpebj-ti/lab-solos/issues/487)

### RF-002 — Exigir o limiar de cobertura de cada módulo

A verificação de cobertura deve falhar quando pelo menos um módulo ficar abaixo de 70% na métrica definida. O resultado deve indicar qual módulo descumpriu o limiar ou ficou sem medição válida. [#487](https://github.com/ifpebj-ti/lab-solos/issues/487)

### RF-003 — Analisar o código com Semgrep

Nos PRs abrangidos pelos eventos documentados, a CI deve executar análise estática defensiva com Semgrep para frontend e backend e disponibilizar o resultado de ambos à revisão. A política deve identificar o conjunto de regras, severidades ou condições bloqueantes e o tratamento de exceções justificadas. Um achado sujeito a bloqueio deve fazer a verificação falhar. CodeQL deve continuar na esteira. [#489](https://github.com/ifpebj-ti/lab-solos/issues/489)

### RF-004 — Analisar passivamente o tráfego HTTP dos testes

A CI deve usar ZAP em modo exclusivamente passivo sobre o tráfego gerado pelos testes existentes da stack descartável, sem acrescentar requisições. A execução deve produzir relatório consultável e falhar quando detectar um achado enquadrado nas regras bloqueantes documentadas. [#490](https://github.com/ifpebj-ti/lab-solos/issues/490)

### RF-005 — Orientar a consulta à estratégia de testes

O Plano de Testes da Wiki deve identificar testes unitários, de integração, ponta a ponta e de segurança em uso. Para cada camada deve informar o ambiente, os dados utilizados, o comando ou workflow, os gatilhos aplicáveis, as condições de falha e como consultar resultados. Deve documentar a meta de cobertura e orientar o leitor a localizar a execução e o relatório do ZAP. As ferramentas planejadas devem ter seu estado explícito. [#490](https://github.com/ifpebj-ti/lab-solos/issues/490) · [#494](https://github.com/ifpebj-ti/lab-solos/issues/494)

## Requisitos não funcionais

### RNF-001 — Preservar o isolamento e proteger as evidências

Todo tráfego avaliado pelo ZAP deve pertencer à execução dos testes existentes contra a composição descartável da CI, com dados sintéticos. Resumos e artefatos compartilháveis devem omitir segredos, credenciais e dados de sessão. [#490](https://github.com/ifpebj-ti/lab-solos/issues/490)

### RNF-002 — Vincular resultados à execução e registrar falhas de medição

Relatórios e resumos devem indicar a execução ou revisão a que se referem e permitir distinguir aprovação, falha da política e ausência de resultado válido. A indisponibilidade de relatório deve ficar visível e não pode ser contabilizada como aprovação. [#487](https://github.com/ifpebj-ti/lab-solos/issues/487) · [#489](https://github.com/ifpebj-ti/lab-solos/issues/489) · [#490](https://github.com/ifpebj-ti/lab-solos/issues/490)

## Critérios de aceitação

### CA-001 — Relatórios e badge conferíveis (RF-001, RNF-002)

- **Dado** que as suítes de frontend e backend geram medidas válidas para a mesma revisão
- **Quando** a pessoa revisora consulta a execução da revisão testada e segue o badge no README
- **Então** encontra na execução o percentual de cada módulo e no README a referência à cobertura gerada pela CI, com acesso à definição da métrica e a seus critérios de inclusão e exclusão.

### CA-002 — Limite por módulo e medição indisponível (RF-002, RNF-002)

- **Dado** um conjunto de execuções de validação com ambos os módulos no limiar ou acima dele, outro com apenas um módulo abaixo de 70% e outro com medição ausente ou inválida
- **Quando** a CI avalia cada execução
- **Então** aprova a verificação de cobertura no primeiro caso, falha identificando o módulo abaixo da meta no segundo e sinaliza no terceiro qual módulo ficou sem medida válida, sem aprovar a verificação.

### CA-003 — Políticas de análise estática (RF-003, RNF-002)

- **Dado** um PR abrangido e amostras sintéticas que exercitam os casos de aprovação, bloqueio e exceção justificada previstos na política
- **Quando** a análise estática roda
- **Então** o resultado identifica a revisão e os dois módulos, o caso bloqueante falha, o tratamento da exceção é conferível e CodeQL continua disponível nos seus eventos documentados.

### CA-004 — Resultados da análise passiva (RF-004, RNF-001, RNF-002)

- **Dado** que os testes existentes rodam na stack descartável da CI com dados sintéticos e respostas controladas, em uma execução sem achado bloqueante e em outra com um achado bloqueante
- **Quando** ZAP analisa passivamente o tráfego produzido pelos testes
- **Então** cada execução produz relatório vinculado ao resultado, o caso bloqueante falha, a análise fica restrita ao tráfego previsto e as evidências compartilháveis omitem dados de sessão e credenciais.

### CA-005 — Execução de segurança sem resultado válido (RF-003, RF-004, RNF-002)

- **Dado** uma execução abrangida em que Semgrep não conclui ou o tráfego esperado para a análise passiva não está disponível
- **Quando** a CI consolida o resultado
- **Então** a execução identifica a verificação incompleta e a causa observada, sem registrá-la como aprovada.

### CA-006 — Plano de Testes consistente com a CI (RF-005)

- **Dado** que o avaliador consulta o Plano de Testes da Wiki
- **Quando** segue referências amostrais de cada camada e o procedimento de consulta do ZAP
- **Então** encontra comandos ou workflows e resultados coerentes com a execução, com identificação dos ambientes, dados, gatilhos, bloqueios, meta de cobertura e itens planejados.

## Estratégia de validação

- Automatizar verificações dos limiares nos dois módulos e validar o tratamento de resultados ausentes ou inválidos.
- Exercitar aprovação, bloqueio e exceção do Semgrep com amostras sintéticas de análise estática. Exercitar aprovação e bloqueio do ZAP com respostas de teste controladas, conferindo o isolamento e a publicação dos resultados.
- Conferir o badge a partir do README e navegar pelas referências da Wiki com o perfil destinado à avaliação. Guardar os links das execuções de aceite e de falha, os resultados dos módulos e a revisão da página.

## Dependências e riscos

- As suítes atuais, os workflows `.github/workflows/container-ci.yml` e `.github/workflows/codeql-quality.yml`, o `docker-compose-security-e2e.yml` e a documentação de [fundação de qualidade e testes](../fundacao-qualidade-testes/prd.md) são o ponto de partida.
- Exclusões ou formatos de relatório diferentes podem gerar percentuais pouco comparáveis. A definição documentada e o vínculo com a execução permitem interpretar o número de cada módulo.
- A consulta pelo avaliador depende das permissões e da disponibilidade das evidências. O plano deve explicar como localizar os resultados enquanto permanecem consultáveis.

## Suposições

- Suposição — A composição descartável e os testes HTTP existentes fornecem tráfego suficiente para validar o comportamento da análise passiva. Confirmar na especificação técnica.

## Decisões complementares

As escolhas desta etapa constam no [registro local de decisões](../decisoes-de-planejamento.md#cobertura-análise-defensiva-e-releases). A integração depende dos mantenedores, das regras pinadas, do ensaio passivo e do acesso do avaliador aos relatórios.

## Decisões da validação de descoberta

| Decisão | Recomendação | Resposta confirmada | Impacto |
| --- | --- | --- | --- |
| Validação de descoberta | Usar o recorte registrado nas issues e conferir a esteira existente | Grilling dispensado pelo usuário | Política e métrica pendentes permanecem explícitas para refinamento |
| Limiar e isolamento | Adotar 70% por módulo e limitar ZAP ao tráfego dos testes existentes | Escopo registrado em #487 e #490 | O limiar é individual e a análise HTTP é exclusivamente passiva |
