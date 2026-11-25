# Especificação técnica: Seleção uniforme de datas civis no site

- Status: pronta para implementação
- PRD: `./prd.md`
- Atualizado em: 2026-11-25
- Validação de design: dispensada-pelo-usuário

## Resumo técnico

Padronizar todos os controles ativos de seleção de data civil usando o comportamento já adotado em **Adicionar > Químicos**. O frontend usará um único campo controlado, com edição visível em `dd/mm/aaaa`, teclado e calendário em português com seleção direta de ano e mês. Cada fluxo conservará seu formato de estado e regras de negócio, convertendo uma data completa para `yyyy-MM-dd` somente na fronteira de gravação ou consulta.

O escopo ativo identificado é o cadastro de **Outros**, a edição de produtos e os filtros de data da auditoria. Os controles nativos e o seletor legado serão substituídos por integrações do campo compartilhado. Não haverá mudança de endpoint, banco, autorização ou regra de validade nesta entrega.

## Estado atual

- `DateInput.tsx` já implementa um campo controlado com texto `dd/mm/aaaa`, calendário `ptBR`, navegação direta por ano e mês, rótulo associado e erro anunciado. O arquivo está modificado no working tree; a implementação atual deve ser preservada e avaliada como base, sem descartar alterações locais.
- `FormQuimicos.tsx` consome `DateInput` por `Controller`. O formulário mantém texto em português durante a edição e valida com `parseCivilDateInput`, que converte uma data válida para `yyyy-MM-dd` ao montar a solicitação.
- `FormOutros.tsx` ainda usa `DateInputOutros`, que apresenta o botão “Selecione uma data”, grava a data em ISO no React Hook Form e valida com `Date.parse`.
- `ProductEditModal.tsx` usa dois elementos nativos `type="date"`. O estado do modal e as operações JSON Patch usam `yyyy-MM-dd`.
- `Auditoria.tsx` usa dois elementos nativos `type="date"` para início e fim. `FiltroAuditoria` e `criarParametrosFiltro` enviam esses valores como parâmetros `dataInicio` e `dataFim` no formato `yyyy-MM-dd`.
- A busca de consumidores ativos não encontrou uso de `DateInputVidraria` nem de `DateRangeInput`; os arquivos e testes isolados não indicam campos visíveis em uso. O PRD não inclui criar campos de data em Vidrarias.
- O backend já aceita datas civis em `yyyy-MM-dd`. A mudança desta issue é de entrada e seleção; a forma de apresentar datas já gravadas está separada no PRD da issue #507.

## Arquitetura proposta

1. Manter `DateInput` como componente compartilhado e acessível para campos de data civil. O valor controlado enquanto a pessoa edita será o texto bruto `dd/mm/aaaa`, inclusive estados incompletos, para permitir revisão e validação sem perda de caracteres.
2. Manter `parseCivilDateInput` como validador estrito no limite do domínio: somente uma data completa e existente pode ser convertida para `yyyy-MM-dd`. A data exata `01/01/0001` é reservada como sentinel de ausência do contrato de leitura da #507 e não pode ser enviada como data informada. Não impor um limite geral de ano. Não usar `Date.parse` sobre texto regional nem `new Date('dd/mm/aaaa')`.
3. Introduzir adaptadores finos por fluxo quando o formato existente diferir:
   - cadastro de **Outros**: estado visível em `dd/mm/aaaa`; validação estrita no formulário; solicitação continua usando `yyyy-MM-dd`;
   - edição de produto: valores ISO recebidos são convertidos para a apresentação em português ao abrir o modal; a operação JSON Patch continua recebendo ISO ou remove a propriedade quando o campo opcional é limpo;
   - auditoria: rascunho preserva texto digitado; ao aplicar filtros, converter campos completos para `yyyy-MM-dd` e manter `dataInicio`/`dataFim` como contrato da integração.
4. Parametrizar a restrição de seleção de dias no calendário compartilhado. A prop deve expressar a regra atual do campo sem codificar regra de validade global no componente. Aplicar em **Outros** a restrição atual de datas passadas somente ao campo em que ela existe; manter a fabricação, a edição e os filtros com seus limites atuais.
5. Conservar os estados distintos de rascunho e aplicado dos filtros da auditoria. Uma data inválida deve ser anunciada no campo e impedir que o filtro inválido seja enviado; limpar os dois campos continua removendo os parâmetros.
6. Remover a dependência de localidade do navegador para a apresentação. Datas são datas civis, não instantes; não converter o valor por UTC nem derivar o dia a partir de um `Date` com deslocamento de fuso.

### Contrato do componente

- Entrada: rótulo, nome/id, texto controlado de edição, callback de mudança/blur, erro, obrigatoriedade e regra opcional de dias desabilitados. A data `01/01/0001` é rejeitada tanto na validação do texto quanto na seleção do calendário; outros dias válidos do ano 0001 não são restringidos por esta regra.
- Apresentação: rótulos e calendário em português; placeholder `dd/mm/aaaa`; botão do calendário com nome acessível; entrada pelo teclado; calendário com mês e ano editáveis diretamente.
- Saída para o fluxo: texto de edição `dd/mm/aaaa`. O fluxo chama o parser estrito para validação e serialização.
- Contrato externo preservado: solicitações de produto, patch de produto e filtros da auditoria continuam trocando datas em `yyyy-MM-dd`.

## Fluxos e componentes

### Cadastro de Outros

1. O formulário controlado apresenta cada campo de data com o mesmo componente de Químicos.
2. A pessoa pode digitar ou selecionar uma data. O valor digitado permanece no campo enquanto está incompleto.
3. Na validação/submissão, o formulário exige uma data completa e existente e converte para ISO antes de chamar `createProduct`.
4. A obrigatoriedade e as restrições distintas de fabricação e validade permanecem como estão hoje; a confirmação de validade passada de Químicos não é adicionada a Outros.

### Edição de produto

1. Ao abrir o modal, converter a data ISO existente para `dd/mm/aaaa`; valor ausente aparece vazio.
2. Permitir digitação, calendário e limpeza dos campos sem alterar a semântica de patch parcial.
3. Validar antes de construir o patch. Uma data válida vira ISO; campo vazio segue a operação `remove` já usada; valores inválidos não produzem operação.
4. Comparar o valor normalizado com o valor original normalizado para não enviar alteração quando a data não mudou.

### Auditoria

1. A data inicial e final têm campos visíveis no mesmo padrão, com valores de rascunho separados do filtro aplicado.
2. Datas válidas são normalizadas para `yyyy-MM-dd` ao aplicar filtros, preservando limites e parâmetros atuais.
3. Campo vazio não gera parâmetro; campo inválido mantém o estado de revisão e não atualiza logs, relatório ou exportação com um valor parcial.

## Contratos e APIs

- **API de produtos:** sem alteração. Campos de criação e JSON Patch continuam recebendo datas civis ISO `yyyy-MM-dd`; campos removidos permanecem representados pela operação `remove` existente.
- **API de auditoria:** sem alteração. `dataInicio` e `dataFim` continuam sendo strings `yyyy-MM-dd` em query strings.
- **Formato de edição:** o componente controla `dd/mm/aaaa`; o formato ISO só é produzido quando a data está completa e validada.
- **Erros:** mensagens já vinculadas ao campo continuam conectadas por `aria-describedby`/`aria-invalid`; invalidade não deve ser convertida em data por parsing permissivo.
- A normalização de resposta/saída de datas civis é tratada pela issue #507. Este techspec não modifica contratos de leitura.
- A inicialização das datas da edição depende de a API fornecer a data civil em ISO `yyyy-MM-dd`, contrato tratado pela #507. Integrar esse contrato antes do adaptador de edição ou manter os PRs juntos; não interpretar resposta regional ambígua.

## Dados e migrações

- Nenhuma migração de banco ou mudança no modelo .NET.
- Nenhuma alteração nos formatos já aceitos pelas APIs.
- Não gravar textos localizados (`dd/mm/aaaa`) no banco ou na API; converter para ISO no limite de cada fluxo.
- Não modificar a semântica de data passada/futura nem do intervalo de auditoria.

## Segurança, privacidade e permissões

- Não há mudança de autorização: cadastro e edição seguem os perfis atuais; os filtros permanecem sob a mesma política de acesso da auditoria.
- As datas dos filtros não alteram os limites de autorização nem ampliam o conjunto de registros que cada perfil pode consultar.
- Não adicionar telemetria ou registrar valores de campo em logs. Mensagens de erro devem conter somente o campo e a regra pertinente, sem dados adicionais.

## Falhas, observabilidade e operação

- Entrada incompleta ou impossível permanece editável e mostra erro acessível; nenhum request é emitido com data inválida.
- Falha na consulta de auditoria segue o tratamento atual de erro. A integração não deve mascarar erro como filtro vazio.
- A seleção de calendário não deve perder o rascunho quando a pessoa abre/fecha o popover sem escolher um dia.
- A implementação não altera mensagens de sucesso, indisponibilidade ou autorização existentes.

## Compatibilidade, disponibilização e reversão

- A compatibilidade de API é preservada porque os fluxos continuam enviando ISO.
- A implementação é frontend-only e pode ser disponibilizada junto com a atualização de `develop`; nenhuma migração ou janela coordenada é necessária.
- Reversão: restaurar as integrações dos consumidores anteriores ou reverter o PR de frontend. Dados persistidos permanecem ISO e não precisam de conversão reversa.
- Não remover `DateInputVidraria` ou `DateRangeInput` apenas por não terem consumidor ativo sem conferir testes/documentação de uso; a limpeza desses arquivos é opcional e não bloqueia a entrega.

## Estratégia TDD e pirâmide de testes

### RED

- Utilidade: cobrir parsing rigoroso de `dd/mm/aaaa`, datas incompletas, dias impossíveis, anos bissextos, rejeição do sentinel `01/01/0001` e conversão sem deslocamento. O teste falha para qualquer implementação dependente de localidade.
- Componente: cobrir rótulo, placeholder, digitação, abertura do calendário, escolha direta de ano/mês, seleção, impossibilidade de selecionar o sentinel, erro e uso por teclado.
- Integrações de fluxo: escrever testes de formulário para Outros, edição de produto e auditoria. Inicialmente devem expor os seletores legados/nativos, serialização de texto localizado ou envio de data inválida.

### GREEN

- Integrar os fluxos ativos ao `DateInput` compartilhado e adaptar cada limite de estado/serialização sem alterar contrato da API, required/optional, restrição de datas ou comportamento de filtro.
- Validar erros antes de submeter ou aplicar filtros e preservar estado de rascunho.

### REFACTOR

- Remover duplicação de adaptação de datas apenas depois que os testes estiverem verdes.
- Rever `DateMask.test.tsx` e testes da implementação legada para que validem os consumidores ativos do padrão compartilhado.
- Rodar testes direcionados, lint e compilação; confirmar que não restaram seletores nativos ativos para data civil.

## Esteira de qualidade

| Área | Comando local | Verificação de CI | Lacuna/ação |
|---|---|---|---|
| Testes frontend direcionados | Em `frontend`: `npm run test -- --run src/components/global/inputs/DateInput.test.tsx src/components/global/forms/create/FormOutros.errors.test.tsx src/components/modals/ProductEditModal.test.tsx src/pages/admin/Auditoria.test.tsx` | `container-ci.yml` executa `npm run test -- --run --coverage` em PR para `develop` | Sem lacuna de executor; conferir se os testes direcionados são incluídos no Vitest ao implementar |
| Testes frontend completos | Em `frontend`: `npm run test -- --run --coverage` | Job `Frontend quality` também roda lint e build | Não executar neste documento; validação pertence à implementação |
| Lint e build frontend | Em `frontend`: `npm run lint`; `npm run build` | Ambos executados no job `Frontend quality` em PR para `develop` | Sem lacuna identificada |
| E2E UI | Em `frontend`: `npm run test:e2e -- --project=ui` | `container-ci.yml` executa os projetos `real` e `ui` na stack sintética | Usar somente se o fluxo crítico de formulário não estiver coberto por testes de componente |
| Backend e integração | Sem mudança de backend; se a adaptação revelar quebra de contrato, `dotnet test backend/Tests/Tests.csproj` | `Backend quality` restaura/constrói a solução e executa testes .NET em PR para `develop` | Não há alteração backend planejada nesta issue |

## Matriz de rastreabilidade

| Requisito | Componentes | Testes | Evidência |
|---|---|---|---|
| RF-001, RNF-001 | `DateInput`, `FormOutros`, `ProductEditModal`, `Auditoria` | Componente e consumidores com localidade `pt-BR` e locale alternativo | Campo e calendário sempre indicam `dd/mm/aaaa` |
| RF-002 | `DateInput`, `parseCivilDateInput`, validação de cada formulário | Unidade para válido, incompleto, impossível, bissexto, sentinel reservado e limite do ano; UI para correção | Entrada válida aceita; inválida ou `01/01/0001` não é enviada |
| RF-003, RNF-002 | `DateInput`, popover e calendário | Teste de teclado, nomes acessíveis, seletor de ano/mês e anúncio de erro | Ano/mês/dia identificáveis e operáveis |
| RF-004 | `FormOutros`, `ProductEditModal`, `Auditoria` | Testes de required/optional, regra de datas passadas, patch `remove`, filtro vazio e limites do intervalo | Regras de cada consumidor preservadas |
| RF-005 | `date.ts`, adaptadores dos formulários e integração de auditoria | Testes de ida/volta UI → ISO → UI e query string | O dia selecionado não muda e a API continua recebendo ISO |
| RF-006 | Contrato de `DateInput` e inventário de campos ativos | Teste de contrato do componente; busca estática/revisão de novos consumidores | Novos campos reutilizam padrão validado |
| RNF-003 | layout de `DateInput` e `PopoverContent` | Teste responsivo/E2E em viewport estreita | Calendário e campo continuam operáveis sem corte |

## Alternativas e decisões

| Decisão | Alternativas | Recomendação | Escolha confirmada | Consequências |
|---|---|---|---|---|
| Padrão de interação | Manter seletores independentes por tela; tentar localizar campos nativos; compartilhar o padrão existente em Químicos | Reutilizar um campo controlado com digitação e calendário direto | Confirmada pelo usuário: seguir Adicionar > Químicos em todo o site | Evita depender da localidade do navegador e alinha a experiência |
| Estado durante edição | Guardar ISO desde cada tecla; guardar texto apresentado e normalizar ao submeter/aplicar | Manter o rascunho `dd/mm/aaaa` e converter somente após validação | Recomendação adotada para preservar digitação parcial; contrato externo ISO permanece | Consumidores que hoje mantêm ISO precisam de adaptador de rascunho |
| Restrições por consumidor | Embutir bloqueio de passado no campo compartilhado; permitir customização por campo | Expor regra opcional de dias desabilitados e manter cada regra atual | Confirmada pelo PRD #508: não alterar regras atuais | Componente permanece reutilizável sem regra global de validade |
| Sentinel de ausência da #507 | Permitir entrada e seleção de `01/01/0001`; tratar a data como ausência na resposta | Reservar apenas `01/01/0001` e rejeitá-la em texto e calendário, sem proibir outras datas do ano 0001 | Decidida autonomamente para manter coerência entre gravação e leitura | Evita salvar uma data que a leitura apresentará como ausente; não restringe genericamente o calendário |
| Campos sem consumidor ativo | Torná-los parte de tela nova agora; revisar quando voltarem a ser usados | Aplicar RF-006 quando um campo ativo for introduzido | Confirmada pelo escopo do PRD; sem criar campos em Vidrarias | Evita ampliar produto fora da issue |
| Validação de design | Reabrir discovery para as issues existentes; seguir decisão de produto registrada | Usar o padrão confirmado e registrar decisões técnicas no spec | Dispensada pelo usuário para issues existentes e confirmada autonomamente | Nenhuma pergunta de produto bloqueante para o design |

## Riscos e mitigação

- **Regressão por conversão de texto para ISO** — cobrir parsing estrito e contrato da request de cada consumidor; não usar parser dependente de cultura.
- **Perda de texto parcial enquanto o usuário digita** — manter estado de edição textual controlado até validação, sem atualizar o campo a partir de uma data inválida.
- **Mudança inadvertida de regra de validade em Outros** — representar a regra atual como configuração local do campo e cobrir fabricação e validade separadamente.
- **Quebra de filtros** — validar `dataInicio` e `dataFim` antes de aplicar; manter query string ISO e limites do backend.
- **Dependência na edição** — a leitura de valores existentes pelo modal depende do formato canônico ISO/null do backend na #507 T001; integrar esse contrato antes de adaptar a edição.
- **Data reservada para ausência** — impedir que `01/01/0001` seja escolhida ou enviada, pois a #507 a representa como `null` na leitura; os demais dias civis válidos continuam aceitos.
- **Corte em telas estreitas ou teclado** — manter teste de tela estreita, foco visível, rótulos e operação integral do calendário.
- **Conflito com #507** — definir fronteira de leitura e escrita: #508 altera a entrada; a #507 normaliza a saída apresentada; ambas concordam com data civil ISO na API.

## Perguntas abertas

Nenhuma pergunta de produto bloqueante identificada. O comportamento para datas inválidas, regra de negócio preservada, padrão visual e cobertura de todos os campos ativos estão definidos pelo PRD #508 e pela confirmação do usuário.
