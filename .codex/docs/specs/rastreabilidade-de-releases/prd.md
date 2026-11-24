# PRD — Rastreabilidade de releases

- **Status** rascunho
- **Responsável** a definir
- **Atualizado em** 2026-11-15
- **Validação de descoberta** dispensada pelo usuário

## Contexto e problema

As releases 2.7.3, 2.7.4 e 2.7.5 foram publicadas, mas o changelog consultado termina em 2.7.2 e inclui entregas já publicadas sob “Não publicado”. A auditoria também apontou divergências históricas entre tags Git, GitHub Releases e imagens do frontend e do backend no GHCR. A esteira atual já resolve a versão e confere manifestos das duas imagens, oferecendo uma base para verificar a consistência de cada entrega. [Changelog #488](https://github.com/ifpebj-ti/lab-solos/issues/488) · [Inventário histórico #491](https://github.com/ifpebj-ti/lab-solos/issues/491)

| Release oficial | Data de publicação em UTC |
| --- | --- |
| [2.7.3](https://github.com/ifpebj-ti/lab-solos/releases/tag/2.7.3) | 2026-09-29 |
| [2.7.4](https://github.com/ifpebj-ti/lab-solos/releases/tag/2.7.4) | 2026-10-14 |
| [2.7.5](https://github.com/ifpebj-ti/lab-solos/releases/tag/2.7.5) | 2026-11-10 |

## Objetivo e métricas de sucesso

- Documentar as três versões recentes no changelog com data oficial e referência às entregas efetivamente publicadas.
- Dar tratamento verificável a cada lacuna identificada nas versões históricas em escopo.
- Fazer a esteira detectar entrada de changelog faltante e inconsistências entre tag, release e imagens de novas versões.

## Usuários e jornadas

- A pessoa mantenedora prepara uma publicação, confirma a entrada da versão no changelog e usa o resultado da esteira para corrigir divergências.
- A equipe de operação parte do número de versão e confirma a tag, a release e as referências de imagem de cada módulo.
- O avaliador relaciona uma entrega aos PRs e issues correspondentes e consulta a justificativa das exceções históricas.

## Escopo

### Incluído

- Reconciliar o `CHANGELOG.md` para 2.7.3, 2.7.4 e 2.7.5 com as datas, notas e links oficiais e com os PRs e issues relacionados.
- Inventariar, no mínimo, `v1.0.0`, `1.0.1`, `2.0.0` a `2.0.3` e `2.1.0` nos canais de publicação, registrando prefixos, ausências, evidências e tratamento.
- Verificar, nas novas publicações, a entrada do changelog e a correspondência de tag Git, GitHub Release e imagens dos dois módulos no GHCR.

### Fora de escopo

- Alterar o esquema atual de versionamento ou reescrever tags e imagens históricas em massa.
- Reconstituir artefatos históricos sem origem verificável.
- Mudar o processo de implantação ou o versionamento funcional do produto.

## Requisitos funcionais

### RF-001 — Atualizar o histórico recente do changelog

O changelog deve conter uma entrada para cada versão 2.7.3, 2.7.4 e 2.7.5 com data, link oficial e descrição rastreável às notas, diferenças entre versões, PRs ou issues relevantes. Deve mover de “Não publicado” os itens atribuídos a essas versões e conservar ali as mudanças cuja publicação ainda não foi comprovada. As referências para a conferência incluem os PRs #443 e #458. [#488](https://github.com/ifpebj-ti/lab-solos/issues/488) · [PR #443](https://github.com/ifpebj-ti/lab-solos/pull/443) · [PR #458](https://github.com/ifpebj-ti/lab-solos/pull/458)

### RF-002 — Inventariar publicações históricas

A equipe deve poder consultar, por versão em escopo, a tag Git, a GitHub Release e a imagem publicada de cada módulo no GHCR, com a referência original de cada canal e o digest das imagens quando disponível. O inventário deve informar a regra de associação de versões com e sem o prefixo `v` e tornar ambiguidades visíveis. [#491](https://github.com/ifpebj-ti/lab-solos/issues/491)

### RF-003 — Tratar cada lacuna histórica

Cada divergência ou lacuna deve resultar em correção validada com evidências ou em exceção documentada com justificativa. O registro deve discriminar ausência confirmada, divergência de referência e informação que não pôde ser verificada. [#491](https://github.com/ifpebj-ti/lab-solos/issues/491)

### RF-004 — Detectar entrada de changelog faltante

Para uma nova publicação, a esteira deve verificar se a versão selecionada tem uma entrada própria no changelog da revisão que será publicada. Se a entrada estiver ausente, o resultado deve identificar a versão em falta e impedir a conclusão da publicação. [#488](https://github.com/ifpebj-ti/lab-solos/issues/488)

### RF-005 — Conferir os canais de cada nova publicação

A esteira deve verificar se a tag Git, a GitHub Release e as imagens de frontend e backend correspondem à versão publicada, inclusive em reexecuções. Se houver lacuna ou conflito, o resultado deve identificar a versão e o artefato afetado e impedir a confirmação de publicação consistente. [#491](https://github.com/ifpebj-ti/lab-solos/issues/491)

## Requisitos não funcionais

### RNF-001 — Permitir a conferência independente

O inventário deve registrar a data de consulta e referências que permitam repetir a conferência nos canais de publicação. Quando disponível, o digest deve acompanhar o nome ou a tag da imagem para identificar o conteúdo consultado. [#491](https://github.com/ifpebj-ti/lab-solos/issues/491)

### RNF-002 — Preservar a integridade das publicações existentes

Reexecutar a publicação deve manter as referências de uma versão já publicada de forma consistente. Uma divergência de versão, origem ou digest deve ser diagnosticada sem sobrescrever uma referência publicada. [#488](https://github.com/ifpebj-ti/lab-solos/issues/488) · [#491](https://github.com/ifpebj-ti/lab-solos/issues/491)

## Critérios de aceitação

### CA-001 — Histórico recente conciliado (RF-001)

- **Dado** que as três releases e o conteúdo de “Não publicado” estão disponíveis para comparação
- **Quando** a pessoa revisora confere as entradas resultantes com as fontes oficiais e os PRs de origem
- **Então** encontra uma seção por versão, com a data e o link oficial, e verifica que cada entrega comprovadamente publicada consta na sua versão e saiu de “Não publicado”.

### CA-002 — Matriz histórica navegável (RF-002, RNF-001)

- **Dado** que as versões históricas em escopo incluem referências com e sem o prefixo `v`
- **Quando** a pessoa revisora consulta a matriz e repete uma amostra das consultas
- **Então** encontra data, tag Git, release e referência de cada imagem por versão, com digest quando disponível, prefixos originais e indicação das associações ambíguas.

### CA-003 — Divergência histórica registrada (RF-003, RNF-001)

- **Dado** que uma versão apresenta artefato ausente, conflito ou referência não verificável
- **Quando** a pessoa mantenedora revisa a situação registrada
- **Então** encontra a correção já validada ou a exceção justificada, com evidência da condição disponível e a distinção entre ausência e impossibilidade de verificação.

### CA-004 — Verificação da entrada antes da publicação (RF-004)

- **Dado** que uma simulação de publicação tem a entrada da versão selecionada e outra tem apenas a seção “Não publicado” ou uma entrada de versão diferente
- **Quando** a esteira avalia o changelog da revisão selecionada
- **Então** a primeira simulação passa nessa verificação e a segunda falha informando a versão para a qual falta uma entrada.

### CA-005 — Consistência dos quatro artefatos (RF-005, RNF-002)

- **Dado** que uma versão de teste tem tag, release e as duas imagens correspondentes, e outra simulação tem uma imagem ausente ou que aponta para o conteúdo incorreto
- **Quando** a esteira valida os artefatos da publicação
- **Então** confirma a versão completa e sinaliza a inconsistência da outra simulação com referência ao artefato afetado, mantendo as referências já publicadas.

### CA-006 — Reexecução de versão publicada (RF-005, RNF-002)

- **Dado** que uma versão de teste já foi publicada com referências válidas
- **Quando** a esteira é reexecutada para a mesma revisão e, em outro caso, para uma revisão conflitante
- **Então** confirma a consistência no primeiro caso, aponta o conflito no segundo e preserva as referências publicadas.

## Estratégia de validação

- Comparar manualmente as três entradas do changelog com as notas oficiais, as diferenças entre tags e os PRs correspondentes. Conferir também os itens preservados em “Não publicado”.
- Consultar Git, GitHub Releases e manifestos do GHCR e registrar as evidências da matriz. Revisar todas as lacunas identificadas antes do aceite.
- Automatizar ensaios em ambiente de teste para entrada ausente, referência inconsistente e reexecução. Guardar resultados identificando versão, revisão e condição conferida.

## Dependências e riscos

- A consulta histórica depende de acesso às referências Git, GitHub Releases e GHCR. Uma falha de permissão pode deixar a disponibilidade de um artefato inconclusiva.
- O workflow `.github/workflows/container-release.yml` resolve uma versão a partir do fluxo de promoção ou de uma publicação manual. A entrada do changelog deve corresponder à versão que ele efetivamente verifica.
- Referências com e sem `v` podem identificar publicações diferentes. A associação precisa de evidência do canal de origem.

## Suposições

- Suposição — As versões enumeradas em #491 compõem o recorte histórico mínimo. Divergências adicionais encontradas durante o inventário podem ser apontadas para triagem.

## Decisões complementares

As escolhas desta etapa constam no [registro local de decisões](../decisoes-de-planejamento.md#cobertura-análise-defensiva-e-releases). A conferência histórica depende de fontes remotas, autoridade efetiva de release e destino do inventário.

## Decisões da validação de descoberta

| Decisão | Recomendação | Resposta confirmada | Impacto |
| --- | --- | --- | --- |
| Validação de descoberta | Usar as issues e as fontes oficiais de publicação como referência | Grilling dispensado pelo usuário | O tratamento específico das lacunas permanece aberto |
| Histórico recente e lacunas antigas | Conferir as publicações recentes e registrar evidências e tratamento das lacunas antigas | Escopo registrado em #488 e #491 | Cada frente tem critérios de aceite próprios e compartilha a validação das novas publicações |
