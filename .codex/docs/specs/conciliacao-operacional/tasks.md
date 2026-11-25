# Tarefas: Conciliação operacional de contas e estoque

- Status: concluída sob exceção explícita do usuário; ensaio controlado não realizado
- PRD: `./prd.md`
- Especificação técnica: `./techspec.md`
- Atualizado em: 2026-11-24

A entrega da issue #470 é documental. Ler o PRD e a especificação técnica. Usar somente exemplos sintéticos e, no ensaio, uma referência sanitizada em ambiente descartável autorizado especificamente para teste. Uma eventual atuação operacional exige nova autorização explícita, específica à versão do recorte, ao ambiente e à finalidade, após revisão, conferência da cópia e validação do retorno.

T001–T008 estão encerradas localmente. Em 2026-11-24, o usuário autorizou encerrar T006 sem executar o ensaio operacional nem consultar fontes reais. Os protocolos e cenários sintéticos permanecem como preparação; não são evidência de conciliação real ou retorno operacional.

## Ondas de execução

| Onda | Tarefas | Motivo de segurança do paralelismo |
|---|---|---|
| 1 | T001 | Modelos e checklists podem ser preparados com dados sintéticos antes da definição operacional. |
| 2 | T002 | Condicionada ao recorte e à definição dos responsáveis por contas. |
| 3 | T003 | Condicionada ao recorte de estoque e às referências aceitas. |
| 4 | T004 | Condicionada à aprovação da governança e dos critérios formais de prontidão. |
| 5 | T005 | Condicionada às regras de evidência, acesso e de retenção. |
| 6 | T006 | Condicionada à escolha dos mecanismos de comparação e retorno, às invariantes aprovadas e à autorização de teste. |
| 7 | T007 | Condicionada à origem, periodicidade e encaminhamento dos sinais. |
| 8 | T008 | Condicionada à escolha de automatizar o contrato documental e às permissões do ensaio. |

## T001 — Preparar modelos de evidência e critérios de completude

- Status: concluída
- Issue: #470
- Dependências: nenhuma
- Paralela: não
- Requisitos: RF-001, RF-002, RF-003, RF-004, RF-005, RF-006, RNF-001, RNF-002, CA-003, CA-009
- Caminhos sob responsabilidade: `.codex/docs/specs/conciliacao-operacional/modelos-evidencias.md`, `.codex/docs/specs/conciliacao-operacional/checklist-completude.md`

### Escopo

Esboçar modelos de inventário, proposta, decisão, comparativo, retorno e sinais usando casos fictícios. Registrar o vínculo entre versão do recorte, decisões e evidência. Representar pendências com campos em aberto para responsáveis, fontes, acesso e autorizações.

### Critérios de conclusão

- Os modelos comportam referências versionadas, autoria, pendências, um recorte limpo e condições de comparação e retorno.
- Cada exemplo usa aliases sintéticos. O checklist torna observável a ausência de campo obrigatório sem pressupor formato final ou mecanismo de retorno.

### Plano TDD

- RED: Conferir quais campos dos seis tipos de artefato descritos em `techspec.md` ainda não têm representação testável.
- GREEN: Registrar os modelos e uma matriz de exemplos com dados inventados.
- REFACTOR: Consolidar campos repetidos de recorte, revisão, versão e alias em um cabeçalho comum.

### Validação

- Na raiz, `rg -n 'Inventário de escopo|Decisão de conta|Decisão de estoque|Proposta e autorização|Comparação e retorno|Sinais' .codex/docs/specs/conciliacao-operacional/techspec.md` e revisar os seis modelos e o checklist com exemplos de campos faltantes.

## T002 — Preparar a revisão do inventário de contas privilegiadas

- Status: concluída
- Issue: #470
- Dependências: T001
- Decisão aprovada localmente: aplicar os padrões da seção [Protocolos documentais sintéticos de conciliação](../decisoes-de-planejamento.md#pré-requisitos-operacionais). Dados e responsáveis operacionais reais continuam pré-requisitos externos e não serão inferidos.
- Paralela: não
- Requisitos: RF-001, RF-003, RNF-001, RNF-002, CA-001, CA-003, CA-009
- Caminhos sob responsabilidade: `.codex/docs/specs/conciliacao-operacional/protocolo-inventario-contas.md`

### Escopo

Descrever a conferência de papel, tipo, estado, vínculo e justificativa no recorte definido. Usar matriz sintética para confirmar conta, propor regularização ou registrar pendência. Vincular evidências de identificação ao acesso pertinente.

Conferir as divergências de tipo, papel e vínculo à luz do [contrato aprovado de Contas](../seguranca-de-contas-e-sessoes/techspec.md#contrato-público-de-cadastro-aprovado) e encaminhá-las para revisão administrativa, preservando os registros existentes.

### Critérios de conclusão

- A revisão de exemplo diferencia confirmada, proposta e pendente, identifica a evidência faltante e registra a conclusão do recorte limpo.
- O protocolo descreve a revisão de tipo, estado, papel e vínculo, reservando a conferência de continuidade ao estado combinado do recorte.

### Plano TDD

- RED: Conferir exemplos com justificativa ausente, fontes divergentes e recorte limpo contra o checklist.
- GREEN: Registrar critérios de avaliação e encaminhamento dos casos usando o modelo versionado.
- REFACTOR: Reusar a estrutura comum de evidências e manter as decisões de revisão diferenciadas.

### Validação

- Usar `checklist-completude.md` de T001 para revisar os três resultados de conta e um recorte limpo com aliases sintéticos.

## T003 — Preparar a conferência do inventário de estoque e movimentos

- Status: concluída
- Issue: #470
- Dependências: T001
- Decisão aprovada localmente: aplicar os padrões de corte comum e prova mínima, mais [Conciliação de estoque sintética](../decisoes-de-planejamento.md#pré-requisitos-operacionais). Evidências e responsáveis operacionais reais não são presumidos.
- Paralela: não
- Requisitos: RF-002, RF-003, RNF-001, RNF-002, CA-002, CA-003, CA-009
- Caminhos sob responsabilidade: `.codex/docs/specs/conciliacao-operacional/protocolo-inventario-estoque.md`

### Escopo

Descrever a conferência de saldo, unidade, lote, vínculo e movimentos efetivamente comprovados. Usar casos sintéticos de divergência, incompatibilidade de unidade, falta de comprovação e recorte limpo.

Aplicar a [D4 aprovada de Empréstimos](../decisoes-e-devolucoes-de-emprestimos/techspec.md#alternativas-e-decisões) como referência para conferir movimentos duráveis. Para registros anteriores, confirmar saída e lote pelas evidências existentes e registrar como lacuna cada caso com evidência insuficiente.

### Critérios de conclusão

- O resultado identifica o alias do registro, referência, diferença, correção esperada ou informação faltante. A comparação numérica depende da consistência de unidades.
- O protocolo explicita quais relações do modelo são úteis e deixa as fontes não comprovadas como pendências.

### Plano TDD

- RED: Conferir que casos de unidade incompatível e movimento indeterminado geram pendência e que recorte limpo pode ser encerrado.
- GREEN: Documentar a matriz de conferência com exemplos e estados esperados.
- REFACTOR: Compartilhar qualificação de evidência insuficiente e de fontes conflitantes com o inventário de contas.

### Validação

- Usar `checklist-completude.md` de T001 e conferir os casos sintéticos com as relações `Produto`, `Lote`, `Emprestimo` e `EmprestimoProduto` documentadas no estado atual de `techspec.md`.

## T004 — Definir o controle de prontidão, revisão e autorização

- Status: concluída
- Issue: #470
- Dependências: T001, T002, T003
- Decisão aprovada localmente: aplicar os critérios de [Prontidão e retorno sintéticos da conciliação](../decisoes-de-planejamento.md#pré-requisitos-operacionais). A checklist representa papéis; identidades e autorizações reais continuam pré-requisito operacional.
- Paralela: não
- Requisitos: RF-003, RF-004, RF-005, RNF-002, CA-004, CA-005, CA-006, CA-009, CA-010
- Caminhos sob responsabilidade: `.codex/docs/specs/conciliacao-operacional/protocolo-prontidao-e-autorizacao.md`

### Escopo

Definir o controle documental de revisão, cópia conferida, retorno validado e autorização específica. Verificar que a prontidão é reavaliada se versão, recorte ou referência mudar. Registrar que a avaliação de continuidade deve considerar o efeito combinado no estado resultante.

### Critérios de conclusão

- Cada condição ausente fica identificada e mantém a proposta pendente. A trilha associa ambiente, versão, finalidade, responsável, autorização e referências.
- O protocolo exige autorização específica para ensaio e autorização operacional própria para eventual atuação futura.

### Plano TDD

- RED: Conferir cada ausência isoladamente, a alteração de versão e uma proposta sintética que deixaria o recorte sem administrador habilitado.
- GREEN: Registrar a tabela de prontidão e quem decide revisão ou retorno para os casos aprovados.
- REFACTOR: Unificar critérios de estado e evidência e preservar a diferença de finalidade entre as autorizações.

### Validação

- Percorrer manualmente a tabela de prontidão e marcar resultado esperado e observado para cada condição usando casos de T001.

## T005 — Definir a proteção da referência e o acesso à evidência

- Status: concluída
- Issue: #470
- Dependências: T001
- Decisão aprovada localmente: aplicar os perfis, integridade e retenção de [Acesso e guarda sintéticos da conciliação](../decisoes-de-planejamento.md#pré-requisitos-operacionais). Evidência real e seu local operacional continuam pré-requisitos externos.
- Paralela: não
- Requisitos: RF-004, RF-005, RNF-001, RNF-002, CA-005, CA-006, CA-008
- Caminhos sob responsabilidade: `.codex/docs/specs/conciliacao-operacional/contrato-acesso-e-evidencias.md`

### Escopo

Registrar o contrato de referência imutável, aliases, acesso restrito, material compartilhável e retenção. Definir critérios de evidência para estados anterior, esperado, observado e restaurado.

### Critérios de conclusão

- A matriz documenta finalidade e acesso de cada perfil. A evidência compartilhável pode comprovar a comparação sem identificadores diretos nem material de autenticação.
- A versão da cópia aprovada e o comparativo são relacionáveis ao recorte e à autoria de revisão.

### Plano TDD

- RED: Conferir casos de acesso autorizado e vedado e se o exemplo compartilhável perdeu vínculo necessário ou inclui campo sem finalidade.
- GREEN: Publicar a matriz documental e os exemplos sanitizados correspondentes.
- REFACTOR: Consolidar referências comuns de versão, perfil e alias e conservar o mínimo indispensável.

### Validação

- Revisar manualmente a matriz de acesso e conferir duas amostras sintéticas, uma de evidência restrita e outra compartilhável, com CA-008.

## T006 — Registrar o ensaio controlado de comparação e retorno

- Status: concluída sob exceção explícita do usuário; ensaio controlado não realizado
- Issue: #470
- Dependências: T002, T003, T004, T005
- Dependências externas: [T003 de Segurança de contas](../seguranca-de-contas-e-sessoes/tasks.md), [T005 de Integridade](../integridade-de-produtos-e-lotes/tasks.md), [T009 de Integridade](../integridade-de-produtos-e-lotes/tasks.md), [T010 de Integridade](../integridade-de-produtos-e-lotes/tasks.md), [T004 de Decisões e devoluções de empréstimos](../decisoes-e-devolucoes-de-emprestimos/tasks.md)
- Exceção de aceite: o usuário não poderá executar os testes operacionais e autorizou encerrar a tarefa sem fonte real, cópia controlada ou ensaio. Nenhuma comparação ou retorno real foi executado; ver [registro da dispensa](./evidencias/T006-dispensa.md).
- Paralela: não
- Requisitos: RF-001, RF-002, RF-003, RF-004, RF-005, RNF-001, RNF-002, CA-001, CA-002, CA-003, CA-004, CA-005, CA-006, CA-008, CA-009, CA-010
- Caminhos sob responsabilidade: `.codex/docs/specs/conciliacao-operacional/matriz-ensaio-sintetico.md`, `.codex/docs/specs/conciliacao-operacional/comparativo-e-retorno-sintetico.md`

### Escopo

Preparar e documentar a comprovação em ambiente descartável com referência sanitizada aprovada. Vincular estados anterior, esperado, observado e restaurado à justificativa, autorização e responsável; comparar entorno do recorte, vínculos, movimentos e continuidade administrativa.

### Critérios de conclusão

- A comparação identifica diferenças residuais e fora do escopo e registra decisão e autoria de retorno para as condições aprovadas.
- Uma proposta que retiraria a última capacidade administrativa permanece pendente. A comprovação do estado restaurado cobre permissões, vínculos e registros sintéticos pertinentes.

### Plano TDD

- RED: Inspecionar a matriz para encontrar casos ausentes de diferença no entorno, perda de administração, retorno obrigatório e falta de comprovação.
- GREEN: Preencher o comparativo a partir do ensaio controlado que tiver sido autorizado, usando o método aprovado.
- REFACTOR: Consolidar critérios de comparação e referências comuns sem perder autoria ou condições de retorno.

### Validação

- Percorrer os estados e comparativos da matriz no ambiente descartável autorizado conforme o formato que a operação aprovar.
- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers --filter "FullyQualifiedName~PostgreSqlApplicationSmokeTests"`.
- Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`, com Docker disponível para Testcontainers.

### Notas

A validação da suíte backend caracteriza a base sintética quando o comparativo usar o modelo persistido. A evidência do ensaio requer finalidade e ambiente expressos na autorização.

## T007 — Documentar e verificar os sinais de acompanhamento

- Status: concluída documentalmente
- Issue: #470
- Dependências: T005
- Dependências externas: [T002 de Notificações e auditoria](../notificacoes-e-auditoria/tasks.md)
- Decisão aprovada localmente: usar papéis operacionais em vez de identidades inventadas; evento de concessão de conta, conferência de estoque por evento e diária, `falha_operacao` para fluxos revisados, destinos como fila documental restrita de cenários sintéticos, reconhecimento conforme a decisão de planejamento e retenções já aprovadas em T005. A decisão não configura monitoramento nem destinatários reais.
- Paralela: não
- Requisitos: RF-006, RNF-001, RNF-002, CA-007, CA-008
- Caminhos sob responsabilidade: `.codex/docs/specs/conciliacao-operacional/plano-sinais.md`

### Escopo

Registrar sinais de concessão de papel, divergência de estoque e falha em fluxo revisado. Verificar, com eventos e resultados fictícios, como cada sinal chega ao responsável previsto.

### Critérios de conclusão

- Cada sinal tem fonte, condição, destinatário, encaminhamento, periodicidade e resultado observável no cenário sintético.

### Plano TDD

- RED: Conferir que cada um dos três casos sintéticos pode ser reconhecido e encaminhado usando a condição registrada.
- GREEN: Completar a tabela de sinais e registrar o resultado da verificação documental com aliases.
- REFACTOR: Consolidar o formato de evidências e os encaminhamentos que tiverem o mesmo dono.

### Validação

- Conferir uma amostra sintética de concessão, divergência e falha com a tabela aprovada, registrando quem receberia cada sinal.

## T008 — Prever verificação pré-merge para o contrato de evidência

- Status: concluída documentalmente
- Issue: #470
- Dependências: T001, T004, T005
- Decisão aprovada localmente: usar revisão guiada pela checklist sintética, sem afirmar validador automático ou check obrigatório ainda não existente. Consultar [Verificação pré-merge documental de conciliação](../decisoes-de-planejamento.md#pré-requisitos-operacionais).
- Paralela: não
- Requisitos: Infraestrutura de verificação de RNF-001, RNF-002, CA-004 e CA-008
- Caminhos sob responsabilidade: `.codex/docs/specs/conciliacao-operacional/validacao-contrato-evidencias.md`

### Escopo

Registrar a decisão sobre uma verificação repetível de completude, minimização e isolamento. Se o desenho aprovar um validador, especificar casos sintéticos e os critérios para uma tarefa dedicada que o acrescente a `Documentation quality`; registrar o executor e o comando reais depois da aprovação.

### Critérios de conclusão

- A decisão aprovada identifica como verificar campos obrigatórios e isolamento em PR. No formato guiado, a checklist fica executável por revisão documental. Se houver ferramenta aprovada, o plano identifica o gate e as provas sintéticas a integrar.

### Plano TDD

- RED: Comparar o checklist de T001 com `Documentation quality` e localizar as condições documentais que não têm verificação no fluxo atual.
- GREEN: Registrar o método aprovado e seus casos de aceitação, distinguindo validação de estrutura e avaliação de prontidão.
- REFACTOR: Reaproveitar os mesmos casos sintéticos de completude e privacidade no método escolhido.

### Validação

- Na raiz, `rg -n 'pull_request|merge_group|workflow_dispatch|Documentation quality' .github/workflows/documentation-quality.yml` e comparar as verificações existentes com a decisão registrada.
- Executar a revisão sintética de T001 para verificar campo faltante e exposição além da finalidade.

## Log de execução

| Data | Tarefa | Resultado | Testes/evidências | Observações |
|---|---|---|---|---|
| 2026-11-24 | T006 | concluída sob exceção explícita do usuário | Registro em `evidencias/T006-dispensa.md`; protocolos e cenários sintéticos preexistentes preservados. | O usuário não poderá executar os testes e autorizou encerramento. Não houve acesso operacional, cópia controlada, comparação real ou retorno; não afirmar os critérios de ensaio real como demonstrados. |
| 2026-11-17 | T004 | concluída documentalmente | RED pela ausência do protocolo; GREEN com 22 critérios, 15 casos, 8 links e diff-check aprovado. | Checklist exige versões/corte/hash compatíveis, segregação, cópia conferida, retorno sintético isolado e continuidade administrativa. Uso real exige autorização específica. |
| 2026-11-17 | T003 | concluída documentalmente | RED pela ausência do protocolo; GREEN com 22 requisitos, 9 casos, 8 referências locais, corte comum/aritmética e diff-check aprovados. | Estoque usa unidade armazenada e movimento comprovável; casos sintético limpo, divergente, legado sem prova e incompatibilidade de unidade. Sem regularização real. |
| 2026-11-17 | T005 | concluída documentalmente | RED pela ausência do contrato; GREEN com 21 critérios, 9 casos CA-008, SHA-256, matriz de papéis, sanitização, retenção e diff-check. | Exemplos versionados são sintéticos; repositório restrito e perfis nominais reais permanecem pré-requisito externo. |
| 2026-11-17 | T002 | concluída documentalmente | RED pela ausência do protocolo; GREEN com 26 critérios de completude, 8 casos CA-001/003/009, 5 links locais e diff-check aprovado. | Exemplo sintético com cinco aliases cobre duas confirmadas, uma proposta, duas pendentes e recorte limpo. Responsáveis reais, fontes externas, guarda e autorização permanecem pré-requisitos operacionais. |
| 2026-11-24 | T007 | concluída documentalmente | RED: o plano de sinais não existia. GREEN: revisão dos três cenários sintéticos, 3/3 rotas, 13 links locais e diff-check aprovados. | Definidos origem, condição, janela, periodicidade, papéis destinatários, encaminhamento e retenção; nenhum monitoramento, fila ou destinatário real foi configurado. Decisão registrada localmente com padrões sintéticos. |
| 2026-11-17 | T008 | concluída documentalmente | RED identificou o plano ausente e a falta de verificação dedicada no workflow; GREEN conferiu 21 critérios, 10 casos, 7 links, 5 testes estáticos do workflow e diff-check. | Revisão guiada pela checklist; nenhum check automatizado ou obrigatório foi presumido. |
| 2026-11-16 | T001 | concluída | Verificação inicial falhou pela ausência dos modelos e critérios. Final: 6 modelos, cabeçalho comum, matriz e 19 casos sintéticos verificados. | Modelos e checklist locais; ensaio e operação futura seguem nas tarefas condicionadas. |
