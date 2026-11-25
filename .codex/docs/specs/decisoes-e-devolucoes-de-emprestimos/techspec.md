# Especificação técnica de decisões e devoluções de empréstimos

- **Status** — Rascunho
- **PRD** — [Decisões e devoluções de empréstimos](./prd.md)
- **Atualizado em** — 2026-11-15
- **Validação de design** — Pendente. Descoberta dispensada pelo usuário no PRD.

## Resumo técnico

Garantir que solicitação, decisão e devolução apliquem limites de domínio e que mudanças de estoque, estado, movimento e autoria sejam consistentes. A interface administrativa distingue Aceitar e Rejeitar e atualiza o detalhe com a decisão gravada. A devolução exige ator habilitado e vínculo autorizado sobre o empréstimo.

## Estado atual

- `EmprestimosController` oferece criação e comandos `aprovar`, `reprovar` e `devolver`. O DTO traz `DiasParaDevolucao` e itens com IDs e quantidades inteiras. O formulário `LoanCreation` sugere cinco dias. A criação usa `TimeProvider`, grava `DataPrevistaDevolucao` e mantém `DataDevolucao` nula.
- Aprovação reduz saldo no laço de produtos, verifica insuficiência e chama `IUnitOfWork.CommitAsync()` ao final. Esse método faz um `SaveChangesAsync`, mas a leitura anterior e a gravação não têm controle explícito de disputa do mesmo saldo ou estado. `Produto.Quantidade` é `float`, e `ProdutoEmprestado` tem chave `(EmprestimoId, ProdutoId)`. Os itens existem desde a solicitação. A gravação atual indica saída pelo estado e data da aprovação.
- A devolução verifica papéis e estado do empréstimo, restaura saldo e grava `DataDevolucao`. A autenticação valida habilitação e versão de sessão. O acesso de leitura usa uma política por recurso e a devolução atual não reutiliza um recorte daquele empréstimo para o mentor.
- `AuditoriaMiddleware` classifica aprovação, rejeição e devolução e registra a requisição em escopo separado depois da operação. `LoanHistory.tsx` já tem classes de sucesso/perigo no detalhe e handlers separados. Há testes de decisão, criação, autorização de leitura, datas e devolução. É preciso verificar o comportamento de teclado, foco e resultado no navegador.

## Arquitetura proposta

Extrair dos comandos de controller uma unidade de aplicação para validação e transições, preservando as rotas. Coordenar alterações do mesmo empréstimo e aplicar o mesmo protocolo de bloqueio no PostgreSQL a todas as operações que alteram saldo, lote ou estado do produto. A aprovação e a devolução gravam, na mesma transação, o estado do empréstimo, o saldo e o movimento durável consumido pelo histórico e pela auditoria.

Invariantes da D4 aprovada:

- Ler estado e saldos atuais novamente no comando. Prever concorrência com outros comandos e com outros escritores de saldo e de estado dos produtos. Validar todos os itens e os resultados aritméticos antes do efeito final. A operação é indivisível, inclusive para empréstimos com vários produtos. Qualquer conflito ou falha intermediária reverte todos os efeitos ainda não confirmados.
- Aprovar apenas pendente, registrando responsável, momento e uma baixa por item. Rejeitar pendente sem alteração de saldo e sem saída. Devolver uma vez somente se aprovado, registrar data efetiva separada da prevista, restaurar uma quantidade por item e gravar a autoria da operação. Para disputa simultânea de dois comandos no mesmo empréstimo, o estado gravado encerra a decisão e a leitura posterior informa resultado coerente.
- Reutilizar o `TimeProvider` para instantes. Qualquer recálculo de vencimento de produto usa a referência civil do servidor aprovada para [Cadastro](../cadastro-de-produtos/techspec.md#alternativas-e-decisões) e [Alertas](../listagem-e-alertas-de-produtos/techspec.md#alternativas-e-decisões), com `America/Sao_Paulo` como padrão. O prazo de devolução segue a D1 de Empréstimos.

## Fluxos e componentes

1. `LoanCreation` e `Loans.ts` enviam o prazo fixo de cinco dias e os itens, e mostram a recusa por campo ou causa. No servidor, validar coleção não vazia, identificadores, duplicidade, quantidade, saldo disponível e prazo de cinco dias antes de gravar. Calcular a data prevista com o instante UTC de envio obtido por `TimeProvider` mais cinco dias. Na aprovação, revalidar quantidade e saldo e preservar a data prevista registrada, inclusive para pedidos pendentes anteriores.
2. `LoanHistory` apresenta as duas ações para o empréstimo pendente no fluxo administrativo. Reutilizar tokens de sucesso e perigo e garantir foco visível e texto com contraste em repouso e `hover`. Vincular cada ação ao ID no detalhe, bloquear decisões concorrentes na mesma tela enquanto há envio em curso e recarregar o detalhe pelo contrato existente sobre o resultado.
3. Aprovação verifica perfil, estado, disponibilidade e resultados esperados de todos os itens. Executa baixa e registra decisão/saída em uma única unidade. Na contenção, relê o estado e o saldo e aplica o contrato D2, inclusive se o estoque tiver se tornado insuficiente.
4. Devolução valida perfil e vínculo conforme D3 antes de divulgar ou alterar estado. Trata status inelegível e devolução já registrada, restaura saldo com faixa verificada, preserva a data prevista e registra autoria no mesmo efeito durável. O fluxo `ReturnLoan` da administração continua acessível e atualiza o detalhe.

## Contratos e APIs

| Operação atual | Contrato e condicionantes |
|---|---|
| `POST /api/Emprestimos` | `diasParaDevolucao` e `produtos[{produtoId, quantidade}]`, com solicitante identificado pela sessão. `201` para pendente criado, sem baixa. Código e campo de erro estáveis para validação. Faixas e data prevista seguem D1. |
| `PATCH /api/Emprestimos/aprovar/{emprestimoId}` e `PATCH /api/Emprestimos/reprovar/{emprestimoId}` | Comandos administrativos. Aplicar os [resultados de D2](#respostas-dos-comandos-de-empréstimo). |
| `PATCH /api/Emprestimos/devolver/{emprestimoId}` | Validar habilitação e escopo conforme D3 antes de aplicar os [resultados de D2](#respostas-dos-comandos-de-empréstimo). A recusa por ausência de vínculo segue a política de visibilidade do recurso. |
| `GET /api/Emprestimos/{emprestimoId}` | Mantém a política de visibilidade e os campos `status`, `dataPrevistaDevolucao` e `dataDevolucao`. O cliente recarrega após decisão/devolução e usa o resultado já gravado. |

### Respostas dos comandos de empréstimo

| Resultado | HTTP | Código de domínio |
| --- | --- | --- |
| Aprovação, rejeição ou devolução efetivada | `204` | Resposta sem corpo |
| Reenvio da mesma decisão já efetivada | `409` | `loan_decision_already_recorded` |
| Reenvio de devolução já efetivada | `409` | `loan_return_already_recorded` |
| Estoque insuficiente, inclusive se a falta for constatada após disputa pelo saldo | `409` | `loan_insufficient_stock` |
| Decisão oposta já registrada | `409` | `loan_opposite_decision_recorded` |
| Conflito concorrente sem uma causa mais específica confirmada | `409` | `loan_concurrent_conflict` |
| Devolução de empréstimo ainda não aprovado | `409` | `loan_not_approved_for_return` |

O corpo do `409` expõe o código de domínio em `ProblemDetails`. `Loans.ts` e a interface consomem os códigos em lugar dos textos de erro anteriores e recarregam o empréstimo após conflito. Reenvios preservam a unicidade dos movimentos de D4.

## Dados e migrações

- Preservar `Emprestimo.SolicitanteId`, `AprovadorId`, `DataAprovacao`, `DataPrevistaDevolucao`, `DataDevolucao` e a chave de `ProdutoEmprestado`. A migração `20260915155830_SeparateLoanReturnDates` já separa as datas. Validar que o saldo resultante é finito, representável e não negativo.
- Persistir uma única ocorrência por empréstimo, produto e tipo de movimento (baixa ou devolução), com quantidade, momento, ator autenticado e lote vinculado naquele momento, quando houver. Garantir a unicidade no banco e manter o lote do evento disponível para leitura histórica.
- Confirmar saídas e lotes antigos com evidências já gravadas. Documentar a leitura de pendentes e aprovados anteriores, inclusive o enum `EmAndamento` quando houver evidência da saída. Encaminhar lacunas de autoria, lote e saldo à [Conciliação operacional](../conciliacao-operacional/prd.md).

## Segurança, privacidade e permissões

Reutilizar a sessão validada no servidor e a identidade autenticada para autoria. Administração segue `ApenasAdministradores` na decisão. Para devolução, confirmar habilitação e vínculo dentro da operação sobre o empréstimo. A política de leitura já reconhece dono, mentor vinculado e administração, e serve como referência contextual. Aplicar regra de escrita própria e manter o recurso indisponível para quem não pertence ao escopo aprovado. A estratégia de persistência da autoria integra [Notificações e auditoria](../notificacoes-e-auditoria/prd.md). Usar somente dados sintéticos nas verificações.

## Falhas, observabilidade e operação

- Mapear validação, conflito e erro operacional na camada de integração `Loans.ts`, com feedback da ação e sem exibir detalhe da infraestrutura. Depois de resposta incerta, consultar o empréstimo antes de decidir reenviar. A concorrência com a mesma aprovação deve continuar previsível mesmo em dois clientes.
- Para uma devolução efetiva, registrar ID da operação ou empréstimo, ID interno do ator, instante e resultado. Avaliar um registro durável transacional no domínio ou publicação transacional para a trilha existente. O middleware atual pode registrar tentativas com classificação de resultado, preservando uma única evidência de devolução efetivada. Conservar restrições de acesso aos registros de auditoria e evitar corpo de solicitação ou dados pessoais novos nos logs.
- Contar operações por resultado de domínio, conflitos e falhas de gravação. Usar injeção de falha controlada em teste de integração para provar que não há baixa, saída ou auditoria de sucesso após reversão.

## Compatibilidade, disponibilização e reversão

Coordenar os contratos de resultado com `Loans.ts` e a fonte de saídas com [Integridade](../integridade-de-produtos-e-lotes/techspec.md). Se D4 exigir migração, introduzir colunas ou tabelas aditivas e testar a leitura antes da troca, incluindo pendentes e devoluções anteriores. Em reversão, manter os dados e a autoria já escritos legíveis. Quando a versão anterior não cumprir a mesma consistência ou autorização, suspender temporariamente os comandos afetados e conservar a consulta até restabelecer uma versão compatível. Não reintroduzir a fusão de datas da migração anterior.

## Estratégia TDD e pirâmide de testes

### RED

Adicionar testes unitários de limites e aritmética, contratos de retorno e integração com PostgreSQL para dois contextos independentes disputando produto e empréstimo. Sincronizar as tentativas no teste, observar o erro de domínio e reler saldos e movimentos com um contexto novo. Simular interrupção intermediária e confirmar ausência de efeitos persistidos. Cobrir reenvio de aprovação, rejeição sem baixa e devolução repetida ou concorrente, com cenários de vínculo. Usar Playwright para ação, foco e aparência real partindo da lista.

### GREEN

Implementar os testes de criação da D1 e os testes dos comandos com o contrato D2 e a consistência de D4. Completar os cenários de autorização da devolução após D3. Fazer passar primeiro transições e saldo, depois autorização de devolução e autoria durável e, por fim, a confirmação visual e acessível do resultado. Validar o estoque e o estado depois de cada tentativa, com o mesmo conjunto de dados sintéticos isolado por cenário.

### REFACTOR

Reunir validação e cálculo entre aprovação e devolução, preservando o recorte de autorização específico. Reutilizar projeções públicas e a mesma interpretação de saída efetiva entre comandos e histórico. Reexecutar testes focados e a suíte toda, conferindo inicialização com migrações e compatibilidade da consulta por ID.

## Esteira de qualidade

O checkout inclui `Tests/Tests.csproj` em `backend/backend.sln` e scripts de Vitest/Playwright. `Container CI` tem verificação pré-merge de PR para `develop` em `opened`, `synchronize`, `reopened`, `edited` e `ready_for_review`, além de `merge_group` e acionamento manual. A exigência do `quality-gate` pelas regras de branch não foi inspecionada. `Container Release` é acionado por PR fechado de `main` ou manualmente.

| Área | Comando local | Verificação de CI | Lacuna/ação |
|---|---|---|---|
| Backend, na raiz | `dotnet restore backend/backend.sln --locked-mode`, `dotnet build backend/backend.sln --no-restore -c Release`, `dotnet test backend/backend.sln --no-build --no-restore -c Release` | `backend-quality` executa Testcontainers, solução e subconjunto `Integration` | Ampliar `CriticalLoanCreationTests`, `CriticalLoanDecisionTests`, `LoanReturnCharacterizationTests`, `LoanResourceAuthorizationTests` e, se houver nova migração, o padrão de `LoanReturnMigrationTests`. Usar Docker para teste relacional. |
| Frontend, em `frontend/` | `npm ci`, `npm run test -- --run`, `npm run lint`, `npm run build` | `frontend-quality` | Reutilizar `Loans.decision.test.ts`, `LoanHistory` e `ReturnLoan` nos testes de feedback, foco e recarregamento. |
| Navegador | Na raiz `docker compose -f docker-compose-e2e.yml up -d --build --wait`, em `frontend/` `npx --no-install playwright install chromium` e `npm run test:e2e -- --project=real --project=ui` | `auth-e2e` executa a pilha sintética e os dois projetos | Ampliar `e2e/critical/loans.spec.ts`, já selecionado por `real`. Se houver arquivo novo, incluí-lo explicitamente em `playwright.config.ts` e conferir com `npm run test:e2e:list`. |

## Matriz de rastreabilidade

| Requisito | Componentes | Testes | Evidência esperada |
|---|---|---|---|
| RF-001, RNF-002, CA-001, CA-002 | `LoanHistory`, tokens visuais, `Loans.ts` | Componente e E2E | Verde/vermelho, `hover`, foco visível e duas decisões distintas por teclado refletidas no detalhe. |
| RF-002, CA-003, CA-004 | `LoanCreation`, `AddEmprestimoDTO`, validação de domínio | Unitário, contrato e integração | Solicitação pendente válida sem baixa, limites e erros por causa, legados tratados segundo D1. |
| CA-005, CA-006 | Operações de estoque e aprovação | Unitário e integração PostgreSQL | Recusa aritmética e revalidação de insuficiência preservam estoque, estado e saídas. |
| RF-003, CA-007, CA-008, CA-009 | Fronteira de consistência da decisão | Integração PostgreSQL e contrato | Disputa respeita saldo e estado, falha reverte todos os efeitos, reenvio tem uma baixa e uma decisão. |
| RF-004, CA-010, CA-011, CA-012, CA-013 | Devolução, regra de vínculo, `ReturnLoan` | Integração de autorização, contrato e E2E | Mentor autorizado e administração registrada, recusa fora de escopo e inelegibilidade, data efetiva separada e restauração uma vez. |
| RF-005 | Registro durável da devolução e trilha de auditoria | Integração e contrato de auditoria | ID do empréstimo, ator e instante consultáveis por perfil autorizado para uma devolução efetivada. |
| RNF-001 | Transições, saldos, movimentos e autoria | Unitário e integração PostgreSQL | Invariantes após sucesso, disputa, falha, reenvio e restauração. |

## Alternativas e decisões

| Decisão | Alternativas | Recomendação | Escolha confirmada | Consequências |
|---|---|---|---|---|
| D1. Limites e legado | Prazo fixo para novas solicitações, com preservação da data prevista das pendências existentes | Aplicar cinco dias corridos desde o envio. Até o saldo disponível, aceitar quantidades inteiras positivas na unidade cadastrada do produto. Revalidar quantidade e saldo na aprovação, inclusive nas pendências existentes, e recusar movimentos com resultado negativo ou fora da faixa suportada. | Aprovada pelo usuário | Libera a validação de criação em T003 e, após sua entrega, o consumo no formulário em T006. |
| D2. Respostas do comando | Sucesso sem corpo e diferenciação de conflitos por código | Manter `204` no sucesso e usar `409` para reenvio, insuficiência, decisão oposta, conflito concorrente e devolução de empréstimo ainda não aprovado | Aprovada pelo usuário conforme o [contrato](#respostas-dos-comandos-de-empréstimo) | A interface explica a causa e recarrega o estado gravado após conflito. |
| D3. Vínculo do mentor | Vínculo exclusivo ao próprio empréstimo, responsabilidade atual por mentorado ou responsabilidade registrada na solicitação/decisão | Compartilhar a base de identidade e vínculo vigente, com política de escrita explícita para o empréstimo | Definida na [decisão local](../decisoes-de-planejamento.md#empréstimos-e-integridade) | Condiciona matriz de autorização, transferência de responsabilidade, resposta de recusa e se haverá snapshot. |
| D4. Consistência e saída | Protocolo de bloqueio compartilhado e registro durável de movimento | Gravar estado, saldo e movimento juntos, com unicidade por empréstimo, produto e tipo de movimento. Preservar a autoria e o lote no momento da operação. | Aprovada pelo usuário | A mesma coordenação se aplica às escritas de saldo, lote e estado do produto. Histórico e auditoria consomem movimentos registrados. Lacunas legadas seguem para conciliação. |

## Riscos e mitigação

- Escritas de estoque por caminhos concorrentes. Incluir rejeição, devolução e mutações de catálogo/lotação na revisão de escritores para prevenir sobrescrita do saldo, inclusive em produto desativado.
- Depender apenas do middleware após sucesso pode perder autoria em falha de auditoria. Vincular autoria à efetivação durável e reconciliar sua projeção de auditoria conforme D4.
- Aprovação legada e histórico sem confirmação suficiente. Separar novos registros comprováveis das lacunas anteriores e encaminhar casos sem evidência à conciliação.

## Perguntas abertas

- Consultar as [decisões de planejamento](../decisoes-de-planejamento.md#empréstimos-e-integridade).
