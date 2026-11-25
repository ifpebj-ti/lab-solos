# Tarefas: Padronizar a seleção de datas civis no site

- Status: planejado
- PRD: `./prd.md`
- Especificação técnica: `./techspec.md`
- Atualizado em: 2026-11-25

## Ondas de execução

| Onda | Tarefas | Motivo de segurança do paralelismo |
|---|---|---|
| 1 | T001 | Após #507 T002 consolidar o formatador de leitura em `date.ts`/`date.test.ts`, estabelece o parser de entrada e o contrato compartilhado; tarefas consumidoras dependem dele. |
| 2 | T002, T004 | Cadastro de Outros e filtros de auditoria alteram arquivos separados e podem ser implementados em paralelo. |
| 3 | T003 | Edição de produto depende do campo compartilhado e do contrato ISO de leitura definido pela issue #507; seus arquivos são isolados dos demais consumidores. |
| 4 | T005 | Verifica os fluxos juntos e o inventário completo depois das integrações. |

## T001 — Consolidar e cobrir o contrato do campo de data compartilhado

- Status: concluída
- Dependências: issue #507 T002 (consolidar primeiro a formatação de leitura em `date.ts`/`date.test.ts`)
- Paralela: não
- Requisitos: RF-001, RF-002, RF-003, RF-006, RNF-001, RNF-002, RNF-003
- Critérios de aceitação: CA-002, CA-003, CA-007, CA-008, CA-009, CA-010
- Caminhos sob responsabilidade: `frontend/src/components/global/inputs/DateInput.tsx`, `frontend/src/components/global/inputs/DateInput.test.tsx`, `frontend/src/function/date.ts`, `frontend/src/function/date.test.ts`

### Escopo

- Completar a cobertura do campo já usado em Químicos para comprovar digitação, calendário em português com escolha direta de ano/mês, teclado, estado de erro e uso em viewport estreita.
- Rejeitar especificamente `01/01/0001` como data de entrada: `parseCivilDateInput` deve retornar inválido para esse sentinel, e a célula correspondente no calendário não pode ser selecionada. Nenhuma outra data civil válida deve ser excluída por essa regra.
- Expor a configuração mínima necessária para representar as restrições atuais de cada consumidor sem embutir política de datas passadas/futuras no componente.
- Manter o rascunho de entrada como texto até que o fluxo consumidor valide e converta o valor. Não mover regras de serialização de produto ou auditoria para o campo.
- Editar `date.ts` e `date.test.ts` somente depois de #507 T002 concluir a alteração de formatação de leitura; preservar essa alteração e adicionar a rejeição do sentinel ao parser de entrada. As telas da #507 que não tocam esses utilitários podem avançar em paralelo.

### Critérios de conclusão

- Campo tem rótulo, placeholder `dd/mm/aaaa`, botão de calendário com nome acessível e mensagem de erro anunciada.
- O parser e os consumidores não aceitam `01/01/0001`; a digitação desse sentinel é inválida e o calendário não permite escolher essa data. As demais datas civis válidas continuam aceitas.
- Testes cobrem digitação preservada, data escolhida no calendário, navegação direta por ano e mês, teclado, sentinel, datas inválidas/incompletas sem conversão automática e restrição opcional por consumidor.
- O calendário continua operável em viewport estreita e não depende da localidade do navegador.
- Integrações podem fornecer a regra atual de dias permitidos sem alterar comportamento de outros campos.

### Plano TDD

- RED: em `date.test.ts`, trocar a expectativa que hoje aceita `01/01/0001` e cobrir a rejeição exata do sentinel sem rejeitar outras datas válidas; ampliar `DateInput.test.tsx` para rótulo/placeholder, digitação parcial, data impossível, sentinel digitado inválido, célula sentinel não selecionável, teclado, seleção direta de ano/mês, nome acessível e restrição configurável.
- GREEN: ajustar `parseCivilDateInput` em `date.ts` e `DateInput.tsx` para rejeitar o sentinel na validação/seleção, mantendo o texto editável até validação, sem impor limite geral de anos ou deslocar datas por fuso.
- REFACTOR: simplificar calendário e atributos acessíveis após os testes ficarem verdes; manter o parser de entrada e o formatador de leitura da #507 distintos, sem duplicar lógica.

### Validação

- Em `frontend`: `npm run test -- --run src/components/global/inputs/DateInput.test.tsx`
- Em `frontend`: `npm run test -- --run src/function/date.test.ts`
- Em `frontend`: `npm run lint`
- Em `frontend`: `npm run build`
- Verificação visual manual do popover em viewport estreita e operação completa por teclado, conforme RNF-002/RNF-003.

### Notas

- `DateInput.tsx` e `date.ts` já têm alterações locais; revisar e preservar trabalho existente antes de editar.
- Há dependência explícita de #507 T002 porque a tarefa também altera `date.ts`/`date.test.ts`; começar o trabalho nesses caminhos somente após ela concluir. #507 UI tasks com outros caminhos podem seguir em paralelo.

## T002 — Padronizar as datas do cadastro de Outros

- Status: concluída
- Dependências: T001
- Paralela: sim
- Requisitos: RF-001, RF-002, RF-003, RF-004, RF-005, RNF-001, RNF-002
- Critérios de aceitação: CA-001, CA-003, CA-004, CA-007
- Caminhos sob responsabilidade: `frontend/src/components/global/forms/create/FormOutros.tsx`, `frontend/src/components/global/forms/create/FormOutros.errors.test.tsx`

### Escopo

- Trocar o controle legado usado em fabricação e validade pelo campo compartilhado, mantendo os rótulos e estados de obrigatoriedade existentes.
- Manter no formulário o texto `dd/mm/aaaa`; validar data completa e existente no envio e converter para ISO `yyyy-MM-dd` somente ao preparar a solicitação.
- Preservar a restrição atual de datas passadas somente nos campos em que ela já existe, assim como as diferenças entre fabricação e validade.
- Impedir envio de valor incompleto ou impossível e manter mensagem vinculada ao campo. Não alterar APIs, confirmação de validade passada de Químicos nem regras de negócio.

### Critérios de conclusão

- Os campos de data de Outros têm a mesma digitação e calendário de Químicos.
- Data válida como `13/11/2026` é enviada como `2026-11-13` e mantém o dia ao consultar o registro.
- Campos vazios, obrigatórios/opcionais, mensagens e bloqueios atuais permanecem coerentes com o comportamento anterior.
- Data incompleta, impossível ou sentinel `01/01/0001` não cria solicitação.

### Plano TDD

- RED: em `FormOutros.errors.test.tsx`, cobrir entrada brasileira válida, ano distante via calendário, campo obrigatório vazio, data impossível, sentinel `01/01/0001`, texto incompleto e as regras atuais de fabricação/validade; verificar o payload ISO esperado e que valor inválido não chama a criação.
- GREEN: integrar `DateInput` em `FormOutros.tsx`, converter com o parser civil estrito no limite da submissão e manter as regras existentes.
- REFACTOR: remover a adaptação legado/local redundante do fluxo depois de os testes comprovarem o contrato, sem remover componentes antigos sem outro levantamento de uso.

### Validação

- Em `frontend`: `npm run test -- --run src/components/global/forms/create/FormOutros.errors.test.tsx`
- Em `frontend`: `npm run test -- --run src/components/global/inputs/DateInput.test.tsx src/components/global/forms/create/FormOutros.errors.test.tsx`
- Em `frontend`: `npm run lint`

### Notas

- Manter inalterada a política de datas passadas descrita no PRD. O alerta/confirmacão sobre produto vencido pertence à issue de cadastro de produto e não deve ser acrescentado a este fluxo.

## T003 — Padronizar datas na edição de produtos

- Status: concluída
- Dependências: T001; issue #507 T001 (respostas ISO `yyyy-MM-dd` ou nulas para data ausente)
- Paralela: não
- Requisitos: RF-001, RF-002, RF-003, RF-004, RF-005, RNF-001, RNF-002
- Critérios de aceitação: CA-003, CA-004, CA-005, CA-007
- Caminhos sob responsabilidade: `frontend/src/components/modals/ProductEditModal.tsx`, `frontend/src/components/modals/ProductEditModal.test.tsx`

### Escopo

- Substituir os dois inputs nativos de data pelo campo compartilhado; manter no modal texto brasileiro e converter para ISO apenas ao validar e montar o JSON Patch.
- Ao abrir, exibir data recebida em ISO como `dd/mm/aaaa`; manter o campo ausente vazio.
- Preservar semântica de patch parcial: data válida alterada produz operação `replace`, campo opcional limpo produz `remove`, data inválida não produz operação.
- Comparar as datas normalizadas para não criar operação quando a data não mudou. Preservar os limites e permissões atuais.

### Critérios de conclusão

- Fabricação e validade podem ser digitadas, escolhidas, corrigidas e limpas com os mesmos controles do cadastro; `01/01/0001` é inválido.
- O modal envia o mesmo dia civil em ISO e, ao reabrir o registro, mantém a data selecionada.
- Campos inalterados não produzem operações redundantes; campos inválidos ou com sentinel não são salvos.
- A integração só é concluída quando a resposta de leitura da #507 tiver o contrato canônico ISO; se os PRs forem integrados juntos, comprovar esse contrato nos testes antes de mesclar.

### Plano TDD

- RED: ampliar `ProductEditModal.test.tsx` para abrir com resposta ISO, verificar apresentação `dd/mm/aaaa`, seleção/digitação, preservação do dia, patch `replace` ISO, ausência/`remove`, valor impossível, sentinel `01/01/0001` e ausência de patch quando a data não mudou.
- GREEN: integrar o campo compartilhado e adaptar carga, validação e serialização do modal sem mudar o contrato de JSON Patch.
- REFACTOR: centralizar apenas a adaptação local necessária e remover os inputs nativos de data depois de todos os testes verdes.

### Validação

- Em `frontend`: `npm run test -- --run src/components/modals/ProductEditModal.test.tsx`
- Em `frontend`: `npm run test -- --run src/components/global/inputs/DateInput.test.tsx src/components/modals/ProductEditModal.test.tsx`
- Em `frontend`: `npm run lint`

### Notas

- Esta tarefa espera o contrato de leitura da #507; a fronteira é entre a data civil ISO da API e o texto editável. Não duplicar nem modificar o formatador de datas de leitura definido naquela issue.
- O usuário autorizou decisões autônomas; a dependência externa é técnica/contratual, não uma pergunta pendente.

## T004 — Padronizar os filtros de data da auditoria

- Status: concluída
- Dependências: T001
- Paralela: sim
- Requisitos: RF-001, RF-002, RF-003, RF-004, RF-005, RNF-001, RNF-002
- Critérios de aceitação: CA-003, CA-004, CA-006, CA-007
- Caminhos sob responsabilidade: `frontend/src/pages/admin/Auditoria.tsx`, `frontend/src/pages/admin/Auditoria.test.tsx`

### Escopo

- Substituir os dois inputs nativos de data por campos compartilhados; manter datas inicial/final como rascunho brasileiro separado do filtro aplicado.
- Validar as duas datas antes de aplicar o filtro; converter valores completos para `yyyy-MM-dd` nos parâmetros atuais `dataInicio` e `dataFim`.
- Preservar filtros vazios, limites, estados de erro e comportamento de consulta/exportação; não enviar parâmetros parciais ou inválidos.

### Critérios de conclusão

- Ambos os campos permitem digitação e calendário em `dd/mm/aaaa` com navegação direta de ano/mês.
- Datas aplicadas continuam chegando como parâmetros ISO e representam os limites escolhidos.
- Limpar campos remove seus parâmetros; entrada inválida não atualiza logs, relatório nem exportação.
- A operação por teclado e a leitura de erros continuam acessíveis.

### Plano TDD

- RED: em `Auditoria.test.tsx`, cobrir entrada/digitação brasileira para início e fim, escolha pelo calendário, query com datas ISO, limites do intervalo, limpar parâmetro e impedir aplicação com texto incompleto, impossível ou sentinel `01/01/0001`.
- GREEN: integrar o campo compartilhado em `Auditoria.tsx` e validar/converter o rascunho antes de atualizar o filtro aplicado.
- REFACTOR: remover parsing local ou nativo redundante e manter a separação entre rascunho e filtro aplicado.

### Validação

- Em `frontend`: `npm run test -- --run src/pages/admin/Auditoria.test.tsx`
- Em `frontend`: `npm run test -- --run src/components/global/inputs/DateInput.test.tsx src/pages/admin/Auditoria.test.tsx`
- Em `frontend`: `npm run lint`

### Notas

- O backend da auditoria continua recebendo `dataInicio` e `dataFim` em ISO `yyyy-MM-dd`; não há mudança de API.

## T005 — Validar a consistência dos campos de data civil do site

- Status: concluída
- Dependências: T002, T003, T004
- Paralela: não
- Requisitos: RF-001, RF-002, RF-003, RF-004, RF-005, RF-006, RNF-001, RNF-002, RNF-003
- Critérios de aceitação: CA-001, CA-002, CA-003, CA-004, CA-005, CA-006, CA-007, CA-008, CA-009, CA-010
- Caminhos sob responsabilidade: `frontend/src/components/global/inputs/DateInput.test.tsx`, `frontend/src/components/global/forms/create/FormOutros.errors.test.tsx`, `frontend/src/components/modals/ProductEditModal.test.tsx`, `frontend/src/pages/admin/Auditoria.test.tsx`

### Escopo

- Executar a bateria dos quatro fluxos e conferir que os consumidores ativos adotam o componente compartilhado, que a API continua recebendo ISO e que as regras atuais foram preservadas.
- Revisar o inventário de seletores de data civil ativos no frontend. Os arquivos `DateInputVidraria` e `DateRangeInput` sem consumidor ativo não justificam criar campos ou ampliar o produto; novos consumidores devem usar o contrato compartilhado conforme RF-006.
- Fazer verificação visual e funcional em tela estreita, calendário por teclado e navegador com localidade distinta de `pt-BR`.
- Corrigir lacunas encontradas nos testes pertencentes aos fluxos listados, sem introduzir alteração de backend, banco ou regras de validade.

### Critérios de conclusão

- Todos os casos de aceitação mapeados estão cobertos por testes ou evidência funcional indicada no PRD.
- Nenhum seletor nativo de data civil permanece nos consumidores ativos do escopo; nenhuma integração aceita `01/01/0001` como data digitada ou selecionada.
- Requests de cadastro/patch e query de auditoria mantêm contratos ISO; o texto localizado fica restrito à edição.
- A revisão confirma suporte por teclado, leitores de tela e viewport estreita.

### Plano TDD

- RED: executar primeiro os testes direcionados para obter uma linha de base; adicionar aos testes do consumidor um caso para cada lacuna reproduzida antes de corrigi-la. Não criar falhas removendo comportamento correto.
- GREEN: corrigir somente as lacunas de integração necessárias para os cenários de aceitação ficarem verdes.
- REFACTOR: remover duplicação residual de adaptação nos consumidores e repetir as verificações direcionadas.

### Validação

- Em `frontend`: `npm run test -- --run src/components/global/inputs/DateInput.test.tsx src/components/global/forms/create/FormOutros.errors.test.tsx src/components/modals/ProductEditModal.test.tsx src/pages/admin/Auditoria.test.tsx`
- Em `frontend`: `npm run test -- --run --coverage`
- Em `frontend`: `npm run lint`
- Em `frontend`: `npm run build`
- Em `frontend`, se a validação de fluxo não estiver suficientemente coberta por testes de componente: `npm run test:e2e -- --project=ui`
- Revisão funcional em localidade `pt-BR` e alternativa e viewport estreita; confirmar digitação, teclado e seleção de ano/mês/dia.

### Notas

- Esta tarefa é de integração e validação cruzada; não substitui os testes RED de cada tarefa vertical.
- A conclusão depende da tarefa T003 e, portanto, do contrato de leitura da issue #507.

## Log de execução

| Data | Tarefa | Resultado | Testes/evidências | Observações |
|---|---|---|---|---|
| 2026-11-25 | T001 | Concluída | RED: 4 falhas comportamentais esperadas; GREEN/REFACTOR: testes direcionados 39/39, `npm run lint` e `npm run build` passaram | Parser rejeita somente `01/01/0001`; calendário desabilita o sentinel e aceita restrição opcional. Build manteve avisos de `/env.js`, imagem e chunks; `tsconfig.app.tsbuildinfo` foi restaurado. Verificação visual em viewport estreita fica registrada para T005. Sem alteração no GitHub. |
| 2026-11-25 | T002 | Concluída | RED: cadastro não expunha campos de texto; GREEN/REFACTOR: teste de Outros 11/11, combinado com DateInput 17/17, `npm run lint` e `npm run build` passaram | Cadastro usa o campo compartilhado e envia ISO, preservando requiredness e restrição da validade. Build manteve avisos de `/env.js`, imagem e chunks; `tsconfig.app.tsbuildinfo` foi restaurado. Sem alteração no GitHub. |
| 2026-11-25 | T003 | Concluída | RED: 3 falhas comportamentais esperadas; GREEN/REFACTOR: teste do modal 12/12, combinado com DateInput 18/18 e lint passaram | Edição exibe ISO como `dd/mm/aaaa`, valida e mantém `replace`/`remove` ISO; não envia patch para data inalterada. Build integrado repetido após correção de compatibilidade em T004. Sem alteração no GitHub. |
| 2026-11-25 | T004 | Concluída | Linha de base 5/5; RED: 6 falhas de campos de entrada; GREEN/REFACTOR: testes Auditoria+DateInput 16/16, lint e build passaram | Filtros preservam rascunho/aplicado, enviam ISO e bloqueiam datas inválidas/sentinel. Quatro usos de `.at()` foram substituídos por indexação compatível com o target TS. `tsconfig.app.tsbuildinfo` restaurado. Sem alteração no GitHub. |
| 2026-11-25 | T005 | Concluída | Testes direcionados dos quatro fluxos passaram; suíte completa com cobertura: 158/158 arquivos, 1.051/1.051 testes. Linhas 84,84%; branches 76,94%; statements 83,81%; functions 76,19%. ESLint e build passaram | Adicionado teste `en-US` que confirma o padrão visual brasileiro; inventário confirma que consumidores ativos usam `DateInput`, nenhum `input type="date"` ativo e API/cadastros/patch/filtros permanecem ISO. Testes cobrem teclado e sentinel. Inspeção visual local em 175% mostrou uma coluna sem corte horizontal; calendário tinha rótulos acessíveis e fechou com Escape. Não acessamos telas protegidas sem autenticação. Avisos de build: `/env.js`, imagem ausente e chunks >500 kB. `tsconfig.app.tsbuildinfo` preservado. Sem alteração no GitHub. |
