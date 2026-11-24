# Revisão pré-merge do contrato documental de evidências

Entrega de T008, #470, para a verificação de RNF-001/RNF-002 e CA-004/CA-008 do [PRD](prd.md). A [decisão de verificação documental](../decisoes-de-planejamento.md#pré-requisitos-operacionais) adota a revisão guiada pela checklist versionada de T001. O material conferido nesta etapa usa exemplos inteiramente sintéticos.

## Gate observado no checkout local

O workflow [Documentation quality](../../../../.github/workflows/documentation-quality.yml) declara um job com o mesmo nome, permissões `contents: read` e ações fixadas por SHA. Os gatilhos são `pull_request` para `develop` nos eventos `opened`, `synchronize`, `reopened` e `ready_for_review`, além de `merge_group` e `workflow_dispatch`. O arquivo inspecionado não filtra caminhos e não inclui o evento de edição de PR.

| Verificação existente no workflow | Alcance observado |
| --- | --- |
| Leitura do manifesto `documentacao.json` | Valida a referência completa de 40 caracteres hexadecimais da revisão da Wiki prevista para a entrega. |
| Checkout e comparação da revisão fixa da Wiki | Seleciona a referência do manifesto e compara o `HEAD` obtido com o SHA esperado. O workflow depende do acesso remoto para executar essa parte. |
| Testes `test_delivery_docs*.py` | Exercita os contratos do validador de documentação e do próprio workflow. |
| `check_delivery_docs.py --mode editorial` | Valida as páginas, seções, referências e outros requisitos editoriais definidos no manifesto de documentação. |
| `check_delivery_docs.py --mode compose` e caso negativo de versão ausente | Confere os exemplos Compose declarados e a recusa da composição de produção sem versão de imagem. |

O workflow e o [validador de documentação](../../../../.github/scripts/check_delivery_docs.py) não têm uma entrada dedicada aos inventários, à prontidão, à matriz de acesso ou aos hashes dos artefatos de conciliação. A presença de regras de sensibilidade no validador editorial não demonstra a inspeção deste contrato de evidências, cujo escopo está fora das páginas selecionadas pelo manifesto atual.

O checkout comprova os gatilhos e comandos versionados. A obrigatoriedade efetiva do check em uma branch depende de configuração remota que esta revisão local não consultou. A existência do job não comprova aprovação de um PR ou configuração de acesso ao repositório restrito de evidências.

## Executar a revisão guiada

Antes de integrar uma alteração documental, o revisor registra a revisão avaliada, os arquivos conferidos, seu papel, o momento e o resultado de cada linha da checklist. O operador e o revisor são distintos nos exemplos de prontidão. A comparação usa as versões avaliadas em conjunto, incluindo os modelos e os contratos consumidores.

| Passo verificável | Referência e ação do revisor | Registro de resultado |
| --- | --- | --- |
| Identidade e cobertura | Aplicar o [cabeçalho comum e os modelos de T001](modelos-evidencias.md). Conferir artefato, versão, recorte, aliases, corte UTC `T0`, intervalo e origem da referência. | Indicar o campo e a revisão afetados quando faltar informação ou houver incompatibilidade. |
| Decisão por item | Conferir papel/tipo/estado/vínculo ou saldo/unidade/movimentos, com justificativa, referência e revisor. Cobrir confirmada, regularização proposta e pendente. | Preservar o estado observado quando a evidência for insuficiente e registrar a comprovação necessária. |
| Prontidão | Percorrer a tabela do [protocolo de T004](protocolo-prontidao-e-autorizacao.md). Conferir versões, corte, esquema, hashes, cópia conferida, retorno validado, segregação, autorização específica e continuidade administrativa combinada. | Usar pendente, inconclusivo ou pronto conforme a evidência. Uma omissão ou versão incompatível mantém a condição em aberto. |
| Minimização | Aplicar a [matriz de acesso de T005](contrato-acesso-e-evidencias.md). Ler a projeção compartilhável e conferir que contém apenas aliases e os campos necessários à comparação. | Identificar a exposição excessiva e solicitar nova projeção. Identificadores diretos, material de autenticação e mapa restrito ficam fora do material compartilhável. |
| Integridade dos exemplos | Recalcular SHA-256 dos bytes descritos em T005, respeitando UTF-8 e a ausência de quebra final de cada linha da amostra. Verificar os vínculos entre anterior, esperado, observado e restaurado. | Registrar artefato e digest divergentes ou vínculo ausente. Comparar campos de domínio separadamente dos metadados de evidência. |
| Isolamento | Verificar que os exemplos são sintéticos e que o roteiro usa cópia descartável, suspensão de escritas e condição de parada diante de mudança concorrente ou externa. | Registrar qualquer dependência de dado real ou ambiente sem autorização específica. |
| Retenção e acesso | Conferir 365 dias para evidência restrita após encerramento e 30 dias para diagnóstico desde o registro, com custódia e escopo de leitura/escrita. | Indicar localização, responsável ou concessão nominal ainda necessária ao uso operacional. |
| Encerramento | Conferir cobertura e conclusão explícita do recorte limpo e conservar as pendências do recorte divergente. | Registrar o que foi revisado, casos verificados, lacunas e versões a reavaliar. |

As anotações dessa revisão podem acompanhar o material local da tarefa ou o registro de revisão autorizado da equipe. A disponibilização futura de evidência real exige o repositório restrito, perfis nominais e autorização próprios. Os arquivos versionáveis desta pasta contêm somente exemplos sintéticos.

## Casos sintéticos de aceitação da revisão

Aplicar cada variação isoladamente ao exemplo de referência indicado, mantendo os demais campos. Os resultados abaixo descrevem a conferência documental.

| Caso | Amostra ou variação | Resultado esperado na revisão |
| --- | --- | --- |
| `FIC-PM-01` | Remover a justificativa de uma regularização proposta, como em `FIC-VER-05` de T001. | Registrar justificativa ausente e decisão pendente, preservando o estado observado. |
| `FIC-PM-02` | Apresentar uma referência sem versão ou com corte diferente do inventário. | Identificar a incompatibilidade e a revisão que necessita de referência compatível. |
| `FIC-PM-03` | Alterar a proposta para v2 e conservar autorização v1, como em T004. | Prontidão pendente e autorização incompatível com as versões. |
| `FIC-PM-04` | Expor a correspondência entre alias e identificador no material compartilhável, como em `FIC-VER-18`. | Detectar campo além da finalidade e manter a disponibilização pendente de sanitização. |
| `FIC-PM-05` | Omitir o vínculo do estado restaurado com sua evidência. | Comparação de retorno inconclusiva por referência ausente. |
| `FIC-PM-06` | Alterar um byte da amostra e conservar o SHA-256 anterior. | Identificar integridade divergente, com artefato e revisão afetados. |
| `FIC-PM-07` | Inserir um roteiro que use dados operacionais sem destino restrito e sem autorização específica. | Registrar condição de isolamento e acesso não atendida. |
| `FIC-PM-08` | Propor a retirada dos dois Administradores habilitados do mesmo recorte. | Detectar zero remanescentes no estado combinado e prontidão pendente. |
| `FIC-PM-09` | Conferir recorte limpo com cobertura completa e conclusão explícita. | Registrar o escopo revisado sem propostas ou pendências, respeitando a cobertura dos domínios. |
| `FIC-PM-10` | Conferir a amostra sanitizada de T005 com seus quatro digests corretos e concessão de leitura ao avaliador. | Reconhecer vínculos suficientes para a finalidade de comparação. O mapa restrito permanece acessível somente aos papéis autorizados. |

## Conferência local do gate existente

Os comandos abaixo inspecionam arquivos locais e testam o contrato estático do workflow.

```powershell
rg -n 'pull_request|merge_group|workflow_dispatch|Documentation quality' .github/workflows/documentation-quality.yml
python -m unittest discover -s .github/scripts/tests -p "test_delivery_docs_workflow.py" -v
```

Executar esses comandos não dispara o workflow. A execução completa versionada requer checkout da Wiki na referência do manifesto e permanece distinta desta verificação local. A revisão sintética acima cobre as lacunas de conciliação identificadas na comparação com o gate existente.

## Critérios para uma futura tarefa de automação

Uma tarefa separada deve definir o esquema estável dos artefatos sintéticos, os campos obrigatórios e condicionais, os códigos de diagnóstico e a lista de entrada autorizada. Sua revisão precisa delimitar o que pode ser demonstrado por estrutura e integridade local e o que depende de evidência humana ou de configuração operacional real.

| Entrega da futura tarefa | Critério de aceite proposto |
| --- | --- |
| Validador com leitura local | Parser determinístico, limite de tamanho, caminhos restritos às fixtures autorizadas e ausência de execução de comandos fornecidos pelo artefato. O teste usa dados sintéticos sem credenciais e sem acesso ao repositório operacional real. |
| Diagnóstico sanitizado | Identificar regra, alias e campo necessário, omitindo valores sensíveis e conteúdo bruto. Distinguir violação de estrutura, referência indisponível e resultado estrutural válido. |
| Casos positivos e negativos | Automatizar os dez casos documentais, incluindo falta de justificativa, incompatibilidade de versão, exposição excessiva, hash divergente e isolamento insuficiente. Demonstrar falha antes da implementação e resultado correto depois. |
| Integração de CI | Acrescentar comando e teste reais ao workflow revisado, com os gatilhos pré-merge pertinentes e resultado visível por revisão. Conferir comportamento quando o arquivo está ausente ou o relatório é inválido. |
| Limite da conclusão | Resultado estrutural válido informa completude e integridade verificáveis. A prontidão e a autorização operacional exigem os comprovantes e a revisão do protocolo. |
| Obrigatoriedade | Registrar separadamente a decisão da equipe e a evidência da proteção efetiva da branch quando houver autorização para consultar/configurar o ambiente remoto. |

O RED desta tarefa identificou a ausência deste plano e da invocação de um verificador de conciliação em `Documentation quality`. O GREEN usa a checklist guiada, os casos sintéticos e a inspeção do gate versionado. A implantação da automação descrita acima permanece uma tarefa própria.
