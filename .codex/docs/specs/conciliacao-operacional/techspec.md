# Especificação técnica de conciliação operacional de contas e estoque

- **Status** — Rascunho, validação de design pendente
- **PRD** — [Conciliação operacional de contas e estoque](prd.md)
- **Atualizado em** — 2026-11-15
- **Validação de design** — pendente. A validação de descoberta foi dispensada pelo usuário no PRD.

## Resumo técnico

Definir um inventário verificável, critérios de revisão, proposta de regularização e protocolo de ensaio com referência de dados sanitizados. A entrega é documental. O inventário e o ensaio permanecem condicionados à definição do recorte, das fontes, dos responsáveis, do operador e do retorno. Uma eventual execução operacional será uma ação separada, sujeita à autorização explícita para o recorte revisado.

## Estado atual

- `Usuario` tem tipo, papel (`NivelUsuario`), estado e vínculo de responsável. `UsuariosController` expõe filas, decisões e exclusão. A [especificação de segurança de contas](../seguranca-de-contas-e-sessoes/techspec.md) define a compatibilidade das combinações, condições de habilitação e mutações. A [especificação de integridade](../integridade-de-produtos-e-lotes/techspec.md) descreve a origem de #474 e a regra de continuidade.
- `Produto` guarda saldo, unidade, estado e uma referência opcional a lote. `Lote` representa os dados do lote e a relação com produtos. `Emprestimo` registra estado e datas do fluxo e `ProdutoEmprestado` vincula produtos e quantidades aos empréstimos. `EmprestimosController` altera saldo em aprovação e devolução. Essas relações orientam as comparações. As fontes complementares aprovadas são necessárias para interpretar lacunas de histórico e vínculos.
- Referências de domínio e serviço incluem `AppDbContext`, `ProdutoService` e `AuditoriaService`. O repositório já tem PostgreSQL descartável para testes, relógio controlado e dados sintéticos. O contrato de evidência, o roteiro de ensaio e os respectivos critérios de aceitação ainda precisam ser especificados.

## Arquitetura proposta

### Fluxos e componentes

1. **Definir o recorte.** Registrar identificador, versão, intervalo de datas, categorias de conta, produtos, lotes, unidades e períodos incluídos. Designar responsáveis de contas e estoque, revisor, autorizador operacional, operador do ensaio, responsável pelo retorno e responsáveis pelos sinais. Registrar as fontes aceitas, data de referência, critérios de conflito entre fontes e versão das invariantes de domínio.
2. **Inventariar contas.** Relacionar, com referência restrita, papel, tipo, estado, vínculo pertinente e justificativa. O responsável atribui o estado confirmado, regularização proposta ou pendente. Uma proposta que retire capacidade administrativa precisa demonstrar que outra conta continuará habilitada conforme #474. O cálculo considera o efeito combinado do recorte e a guarda compartilhada de [segurança de contas](../seguranca-de-contas-e-sessoes/techspec.md).
3. **Conferir estoque.** Relacionar produto, lote, unidade, saldo e movimentos efetivos já comprovados. Conferir a associação com referências aprovadas e com as invariantes de [decisões e devoluções](../decisoes-e-devolucoes-de-emprestimos/prd.md) e de [integridade](../integridade-de-produtos-e-lotes/techspec.md). Conferir a consistência de unidades antes de comparar quantidades. Uma unidade, vínculo, movimentação ou autorização indeterminável vira pendência com a evidência faltante descrita. Um recorte íntegro recebe conclusão explícita de que não há regularizações propostas.
4. **Revisar a proposta.** Vincular cada divergência a justificativa, efeito esperado, responsável e evidência. A prontidão exige revisão do recorte, cópia de segurança disponível e conferida, retorno validado e autorização explícita. Alterações de versão, recorte ou referência exigem revisão da prontidão. Desvio de uma condição mantém a proposta pendente.
5. **Conferir o ensaio.** Em cópia controlada, comparar referência anterior, estado esperado e resultado observado. Conferir registros vizinhos que materializam as invariantes do recorte, incluindo vínculos, movimentos e continuidade administrativa. Registrar diferenças remanescentes ou fora do escopo. O responsável pelo retorno aplica a decisão de retorno dentro do ensaio conforme condições aprovadas e confirma o estado restaurado.
6. **Acompanhar.** Ensaiar a identificação de concessão de papel, divergência de estoque e falha em fluxo revisado. Cada sinal tem origem por evento ou verificação, condição observável, periodicidade, responsável e encaminhamento definidos pela operação. Integrar sinais de autoria com [notificações e auditoria](../notificacoes-e-auditoria/techspec.md).

## Contratos e APIs

O contrato principal é documental e tem evidências relacionadas por identificadores do recorte e do item. Os contratos funcionais dos módulos existentes servem de referência para as invariantes. A escolha de ferramenta de conferência e retorno fica condicionada ao operador e ao desenho de ensaio aprovados.

| Artefato | Campos ou resultado exigidos |
| --- | --- |
| Inventário de escopo | Identificador, versão, período e categorias, referência datada, responsável e estado da revisão. Manter a correspondência com identificadores operacionais sob acesso restrito. |
| Decisão de conta | Papel, tipo, estado e vínculo pertinente. Decisão, justificativa, referência de evidência, revisor e pendência quando aplicável. |
| Decisão de estoque | Produto, lote ou relação, unidade, saldo, movimentos comprovados, divergência, referência, correção esperada ou informação ausente. |
| Proposta e autorização | Justificativa, itens afetados, versão da referência, critérios de conferência, responsáveis, revisão, cópia validada, retorno validado e aprovação específica. Registrar identidade do autorizador, data, finalidade e ambiente a que se refere. |
| Comparação e retorno | Referência anterior, estado esperado, observado e restaurado quando aplicável. Evidência por item, condição de retorno, decisão com autoria e diferenças residuais ou externas ao escopo. |
| Sinais | Evento ou conferência, condição observável, periodicidade, destino, responsável e resultado de ensaio sintético. |

## Dados e migrações

O ensaio usa referência imutável de uma cópia controlada e sanitizada, com relações sintéticas suficientes para verificar estoque, vínculos, autoria e permissões. Manter versões de referência, proposta e comparativos. A preparação da cópia deve eliminar identificadores diretos desnecessários e material de autenticação, preservando as propriedades de domínio do ensaio. Separar os identificadores de comprovação usados em evidência restrita dos aliases usados no material compartilhável. Nenhuma migração de produto ou alteração de dados operacionais decorre desta entrega documental. A eventual execução exige versão de esquema, fonte de referência, consistência temporal e cobertura de retorno acordadas.

## Segurança, privacidade e permissões

Restringir o inventário operacional e a cópia de referência aos perfis aprovados para cada finalidade. Registrar quem revisa, autoriza e executa, inclusive quando o mesmo responsável puder ocupar mais de uma função segundo decisão explícita. Compartilhar somente o comparativo sanitizado e as informações necessárias à validação. Determinar repositório de evidência, controle de leitura e escrita, retenção e regras de acesso antes do ensaio autorizado. Confirmar que a regra de continuidade administrativa usa estado e papel efetivos resultantes do conjunto proposto, com proteção transacional em eventual aplicação.

## Falhas, observabilidade e operação

- Evidência insuficiente, referência alterada, autorização ausente ou retorno sem validação mantém o item ou recorte pendente. Registrar a condição, o responsável pela resolução e a versão a reavaliar.
- Definir condições de retorno observáveis, como diferença fora do recorte, divergência de saldo ou permissão após a operação ou interrupção que inviabilize a comparação. O operador registra a condição e o responsável autorizado decide o retorno no ensaio. Divergência após retorno recebe sinal de falha e requer nova revisão.
- O plano de acompanhamento inclui os três sinais exigidos, a fonte, o responsável e o encaminhamento. A trilha identifica a evidência e o resultado pelo alias do caso sintético. A periodicidade e a janela de observação serão confirmadas pela operação.

## Compatibilidade, disponibilização e reversão

Disponibilizar inicialmente apenas o protocolo de revisão e a estrutura de evidências. Ensaiar, com autorização específica de teste, a versão aprovada do retorno em cópia sanitizada e validar vínculos, permissões e registros contra a referência anterior. Comparar diferenças fora do escopo para confirmar que o método de retorno tem granularidade suficiente. Verificar o estado da guarda administrativa após regularização e após retorno. A escolha entre restauração integral da referência e reversão por itens autorizados depende de atividade concorrente e do alcance das operações. Uma eventual aplicação operacional requer escolha formal do mecanismo e nova autorização do recorte.

## Estratégia TDD e pirâmide de testes

### RED

Criar casos sintéticos de conta confirmada, regularização proposta, informação insuficiente, saldo divergente, unidade incompatível e recorte limpo. Avaliar a tabela de prontidão com cada condição ausente isoladamente. Exercitar comparativos com diferença fora do escopo, retorno controlado e revisão de permissões. Exigir rejeição de uma proposta que remova a capacidade do último administrador habilitado. Validar os três sinais e a distinção de acesso a evidências.

### GREEN

Completar formulários, critérios de decisão e referências do protocolo. Quando a ferramenta de conferência for aprovada, implementar apenas a validação de estrutura e os comparativos repetíveis em ambiente controlado. Usar ensaio com autorização explícita de teste para registrar referência, esperado, observado e retorno. Obter evidências sanitizadas de cada resultado esperado na matriz.

### REFACTOR

Consolidar comparações e invariantes repetidas entre revisão, ensaio e retorno. Manter testes unitários de validação do artefato, integração com PostgreSQL descartável quando o comparador usar o modelo persistido, e inspeção manual controlada de evidências, acesso e responsabilidades.

## Esteira de qualidade

| Área | Comando local | Verificação de CI | Lacuna ou ação |
| --- | --- | --- | --- |
| Backend .NET 8 e xUnit | Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`, com Docker para Testcontainers | `Container CI`, `Backend quality`, compila e testa a solução, que inclui `Tests` | Reutilizar a infraestrutura `PostgreSqlContainerFixture`, `IntegrationWebApplicationFactory` e testes de isolamento. Acrescentar verificações do comparador se o desenho aprovado o exigir. |
| Protocolo e evidência de conciliação | Revisar manualmente os contratos e a matriz com as referências. Automação de validação do artefato depende da escolha de formato e ferramenta. | `Documentation quality` verifica o contrato existente de documentação da Wiki e Compose. | Definir teste automatizado da completude e do isolamento do ensaio antes da decomposição em tarefas. Se houver validador, incorporá-lo à CI pré-merge em configuração sintética. |
| Ensaio operacional controlado | Em ambiente descartável, aplicar somente o roteiro aprovado para o recorte sintético. A forma de execução depende do mecanismo de retorno formalizado. | Testes atuais cobrem integração e isolamento de cenários locais. | A evidência de ensaio assinado e retorno pertence à aprovação do ensaio. Configuração, restauração e critérios terão comandos próprios após a decisão. |

`container-ci.yml` roda em PR para `develop` aberto, sincronizado, reaberto, editado ou pronto para revisão, em `merge_group` e manualmente. `documentation-quality.yml` roda nos mesmos contextos, com exceção de edição de PR. `container-release.yml` roda no fechamento de PR para `main` ou por execução manual. A obrigatoriedade dos checks depende das regras de proteção da branch. O protocolo requer evidência própria de ensaio controlado.

## Matriz de rastreabilidade

| Requisito | Componentes | Testes | Evidência esperada |
| --- | --- | --- | --- |
| RF-001 | Inventário de contas, matriz de decisão | Contrato de artefato, revisão controlada | Contas do recorte com justificativa e estado |
| RF-002 | Comparador de estoque, evidências | Integração sintética, revisão de domínio | Saldo, unidade, vínculo e histórico conferidos |
| RF-003 | Prontidão, autorização, guarda #474 | Unitário de regra, integração, inspeção | Condições completas e continuidade administrativa |
| RF-004 | Trilha de comparação | Contrato de evidência, integração | Referência, esperado, observado e autoria vinculados |
| RF-005 | Cópia de referência, plano de retorno | Ensaio controlado | Registros, vínculos e permissões conferidos após retorno |
| RF-006 | Plano de sinais e encaminhamento | Ensaio controlado | Condição, destinatário e resultado por sinal |
| RNF-001 | Acesso a inventário e cópia | Contrato de acesso, revisão sanitizada | Acesso restrito por perfil e evidência compartilhável |
| RNF-002 | Versões, trilha e comparativos | Integração, inspeção | Rastreabilidade e diferenças residuais ou externas |
| CA-001 | Matriz e inventário | Revisão sintética | Conta confirmada, proposta e pendência registradas |
| CA-002 | Conferência de estoque | Integração sintética | Identificação de divergência, proposta ou pendência |
| CA-003 | Encerramento do recorte | Contrato do relatório | Escopo e conclusão sem regularizações |
| CA-004 | Prontidão | Unitário, inspeção | Condição ausente identificada e dados preservados |
| CA-005 | Comparação autorizada | Ensaio controlado | Autorização, justificativa e estados por registro |
| CA-006 | Retorno | Ensaio controlado | Estado restaurado comparado à referência |
| CA-007 | Sinais | Ensaio controlado | Concessão, estoque e falha encaminhados aos responsáveis |
| CA-008 | Evidências e acesso | Contrato, revisão sanitizada | Pertinência de acesso e evidência compartilhável |
| CA-009 | Pendências de comprovação | Contrato de artefato, revisão | Informação ausente registrada e dado preservado |
| CA-010 | Guarda de continuidade #474 | Integração, revisão do recorte | Pelo menos um administrador habilitado no estado resultante |

## Alternativas e decisões

| Decisão | Alternativas | Recomendação | Escolha confirmada | Consequências |
| --- | --- | --- | --- | --- |
| Recorte e fonte | Recorte único ou ondas por domínio, com referências independentes ou recorte temporal comum | Inventariar em ondas com marco comum explícito quando permissões e transações se cruzarem | Diretriz definida, com pré-requisitos operacionais na [decisão local](../decisoes-de-planejamento.md#pré-requisitos-operacionais) | Condiciona quais registros, períodos e fontes sustentam a proposta |
| Operadores e governança | Mesmo operador e revisor designado ou execução e revisão atribuídas a pessoas distintas | Identificar operador, autorizador e responsável de retorno com trilha de autoria e critérios de segregação aprovados | Diretriz definida, com pré-requisitos operacionais na [decisão local](../decisoes-de-planejamento.md#pré-requisitos-operacionais) | Condiciona acesso e validade da autorização |
| Ferramenta de comparação | Revisão guiada com tabela versionada ou comparador determinístico executado em ambiente controlado | Começar pelo contrato de evidência e adotar automação onde a comparação exige repetibilidade | Diretriz definida, com pré-requisitos operacionais na [decisão local](../decisoes-de-planejamento.md#pré-requisitos-operacionais) | Determina formato, infraestrutura, execução e gate de teste do ensaio |
| Estratégia de retorno | Restaurar referência completa em ambiente isolado ou reverter apenas o conjunto de mudanças autorizadas | Ensaiar a restauração sobre cópia sintética e decidir a granularidade operacional segundo concorrência e diferenças fora do recorte | Diretriz definida, com pré-requisitos operacionais na [decisão local](../decisoes-de-planejamento.md#pré-requisitos-operacionais) | Condiciona disponibilidade da cópia, critérios de retorno e impacto em dados vizinhos |
| Acompanhamento e armazenamento | Revisão periódica de evidências restritas ou sinais acionáveis por evento e recorrência | Definir fonte, condição e destinatário dos três sinais antes de escolher canal e frequência | Diretriz definida, com pré-requisitos operacionais na [decisão local](../decisoes-de-planejamento.md#pré-requisitos-operacionais) | Define o local de evidências, a janela de acompanhamento e o tratamento de recorrência |

## Riscos e mitigação

A ausência de comprovação histórica pode produzir vínculo ou saldo artificial. Conservar o item pendente e registrar a evidência necessária. Referências obtidas em instantes distintos dificultam a conferência. Fixar versão e período e reavaliar quando houver alteração na linha de base. A perda de acesso administrativo afeta revisão e retorno. Conferir a continuidade no estado resultante e testar a guarda transacional compartilhada. Uma reversão ampla pode alcançar registros vizinhos. Definir granularidade, limites e comparativos de entorno em cópia controlada.

## Perguntas abertas

- Qual é o recorte, o período, a fonte de referência e o critério quando duas fontes divergem? Quem revisa cada domínio e quem opera o ensaio?
- Quem autoriza, executa e decide o retorno? Que condições disparam essa decisão e qual referência comprova a restauração?
- Qual formato e ferramenta sustentam a conferência, e em qual local cada perfil acessa evidência e cópia sanitizada? Qual é a retenção aprovada?
- Qual frequência, condição e encaminhamento se aplicam aos sinais de concessão, estoque e falhas?
