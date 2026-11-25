# Contrato de limites, cotas e paginação

Contrato local da T002, issue #473, rastreável a RF-001, RF-002, RF-003, RNF-001 e CA-001 a CA-004 do [PRD](prd.md). Os valores seguem as [decisões de planejamento](../decisoes-de-planejamento.md#api-limites-e-auditoria). Esta entrega especifica os consumidores de API T003/T004/T008 e Auditoria T004/T006.

## Admissão compartilhada

Os contadores ficam no PostgreSQL e o teto vale para todas as instâncias em conjunto. A chave combina operação e identidade da tabela. Usar janela fixa iniciada pela primeira admissão, calculada com relógio UTC do servidor. O intervalo inclui o início e exclui o fim. No instante final, a primeira admissão abre nova janela. Incrementar e verificar atomicamente, incluindo concorrência entre réplicas.

A cota conta solicitações admitidas, inclusive as que depois falharem na validação de domínio. Uma recusa por frequência, autorização ou tamanho anterior à admissão preserva os registros de negócio. Reenvios passam pela mesma admissão. Uma operação manual e uma automática usam escopos distintos.

| Operação e contexto | Identidade verificada | Teto e unidade | Janela | Excesso | Indisponibilidade | Responsável pela implementação |
| --- | --- | --- | --- | --- | --- | --- |
| Cadastro público, POST /api/Usuarios | IP de origem conforme política de proxy confiável | 10 solicitações admitidas | 1 hora | 429, admission_rate_limited | 503, admission_unavailable | API T003 |
| Criação de empréstimo, POST /api/Emprestimos | ID da conta habilitada na sessão | 30 solicitações admitidas | 1 hora | 429, admission_rate_limited | 503, admission_unavailable | API T003 com regras de Empréstimos T003 |
| Emissão manual de notificações | ID do Administrador habilitado na sessão | 30 comandos admitidos | 1 hora | 429, admission_rate_limited | 503, admission_unavailable | Auditoria T004 com catálogo de API T003 |
| Emissão automática de notificações | ID estável do processo autorizado, derivado da configuração confiável | 60 comandos admitidos | 1 hora | 429, admission_rate_limited | 503, admission_unavailable | Auditoria T004 |
| Consulta e relatório de auditoria | ID da conta administrativa autorizada na sessão | 60 solicitações admitidas, compartilhadas entre consulta e relatório | 1 minuto | 429, admission_rate_limited | 503, admission_unavailable | Auditoria T006 com API T003 |
| Exportação de auditoria | ID da conta administrativa autorizada na sessão | 5 exportações admitidas | 1 hora | 429, admission_rate_limited | 503, admission_unavailable | Auditoria T006 com API T003 |

Toda resposta 429 inclui Retry-After em segundos inteiros positivos até o fim da janela, arredondados para cima. O corpo usa ProblemDetails com código público e correlação. Se o repositório de cotas estiver indisponível ou o controle transacional não puder concluir, retornar 503 antes do efeito de domínio. O diagnóstico usa correlação e omite a identidade bruta das chaves.

A API deriva o IP a partir da política vigente de encaminhamento confiável. Um cabeçalho arbitrário enviado por cliente não define uma nova identidade. Processos automáticos precisam de identidade autorizada antes de consumir a cota. Login, recuperação de senha e troca de senha conservam seus limites específicos nos planos de autenticação e Contas. Limites de transporte e domínio continuam aplicáveis a essas jornadas.

## Volume, transporte e texto

| Dimensão e alcance | Unidade e limite inclusivo | Recusa | Responsável |
| --- | --- | --- | --- |
| Itens de uma criação de empréstimo | De 1 a 100 entradas da coleção produtos, antes de gravar | 400, loan_items_limit_exceeded quando houver mais de 100. Coleção vazia segue a validação estrutural de Empréstimos | API T003 e Empréstimos T003 |
| Corpo JSON das operações de cadastro, empréstimos, notificações e auditoria cobertas pela tabela | 1 MiB, igual a 1.048.576 bytes do corpo transportado | 413, request_body_too_large | Proxy em API T008 e limite de ingresso da API em T003 |
| Campos curtos sem limite específico menor | Até 255 caracteres Unicode | 400, field_too_long com o campo | API T003 e validador de domínio |
| Texto livre sem limite específico menor | Até 2.000 caracteres Unicode | 400, field_too_long com o campo | API T003 e validador de domínio |

Contar valores escalares Unicode no texto decodificado. Rejeitar sequências Unicode inválidas na leitura do JSON. Nome, marca, localização, título de notificação e filtros textuais são campos curtos. Mensagem de notificação e justificativa são textos livres. Preservar limites menores já impostos pelo domínio e pelos contratos de autenticação, incluindo suas unidades atuais. Uma senha continua sob a política de senha própria.

O proxy verifica bytes do corpo independentemente do número de caracteres. A API protege também o ingresso direto com o mesmo teto. A ausência de Content-Length não elimina a verificação. A recusa interrompe a leitura e não grava negócio. As regras de obrigatoriedade, enum, datas e quantidade são validadas pelo domínio antes da gravação. Quantidade por produto usa a unidade cadastrada e a regra de saldo de Empréstimos D1, enquanto a coleção tem limite em entradas.

## Paginação e ordenação

Usar pagina e tamanhoPagina como inteiros. O padrão é pagina=1 e tamanhoPagina=25. A faixa válida é pagina maior ou igual a 1 e tamanhoPagina entre 1 e 100. Rejeitar parâmetro inválido ou tamanho maior que 100 com 400 e código pagination_invalid, associado ao parâmetro. Calcular o deslocamento com aritmética verificada para evitar estouro. Deslocamento fora da faixa representável recebe a mesma validação.

| Coleção autorizada | Ordenação determinística | Campos e autorização | Consumidores |
| --- | --- | --- | --- |
| Catálogo de produtos geral e administrativo | NomeProduto crescente, depois Id crescente | Projeção vigente por perfil, mais campos administrativos aprovados somente na rota administrativa | API T004 e clientes de produtos, incluindo Alertas T005/T006 |
| Listas e filas de usuários | NomeCompleto crescente, depois Id crescente | Matriz de contas e recorte por perfil e vínculo | API T004 e clientes de usuários e acompanhamento |
| Listas de empréstimos | DataRealizacao decrescente, depois Id decrescente | Escopo do usuário ou administração aplicado antes de contar | API T004 e clientes de empréstimos |
| Minhas notificações | DataCriacao decrescente, depois Id decrescente | Audiência congelada e leitura própria por destinatário | API T004 e Auditoria T003/T008 |
| Logs de auditoria | DataHora decrescente, depois Id decrescente | Filtros e projeção mínima administrativa aprovados | API T004 e Auditoria T006/T009 |

Os nomes da ordenação representam os campos de domínio existentes. O contrato da rota mantém as grafias de serialização atuais de seus itens. Usar critério de comparação fixo no banco para texto e aplicar o desempate por ID em todas as páginas.

O envelope JSON contém itens, pagina, tamanhoPagina, totalItens e totalPaginas. totalPaginas é zero quando totalItens for zero, e nos demais casos é o teto da divisão de totalItens pelo tamanhoPagina. Página após o final é válida, com itens vazio e metadados da coleção filtrada. totalItens conta o mesmo recorte autorizado aplicado aos itens. Totais e itens de cada resposta são calculados sobre uma visão consistente.

Cada chamada reaplica filtros e autorização antes de ordenar, contar e limitar. A página seguinte mantém os filtros e usa pagina+1. Páginas numéricas representam o estado observado em cada chamada. Alterações entre chamadas podem mover registros e o cliente pode atualizar a consulta desde a primeira página. A exportação usa a leitura consistente descrita abaixo.

## Auditoria, relatório e exportação

Consulta e relatório compartilham a cota temporal da tabela de admissão. As linhas seguem a paginação de até 100. Agregados do relatório usam somente o recorte autorizado, e listas de detalhe incluídas no relatório respeitam o mesmo teto de 100 por lista. Filtros vazios são admitidos para o escopo autorizado. Intervalos usam início inclusivo e fim exclusivo e seguem o contrato de erros e datas de API T005.

A exportação CSV admite até 5.000 registros, além da cota temporal própria. A API abre uma leitura consistente, aplica autorização, filtros e ordenação DataHora decrescente/Id decrescente e verifica o tamanho do recorte antes de transmitir o arquivo. Excesso retorna 400 com código audit_export_limit_exceeded e orientação para refinar os filtros. A resposta não transmite um arquivo parcial. O teto é por requisição, independentemente de réplicas.

A projeção de consulta, relatório e CSV de auditoria contém identificação do evento, ação, recurso, instante, origem, resultado e classificação efetiva para o Administrador autorizado. Preservar a referência interna ao ator onde necessária à autoria, conforme o catálogo de eventos e a política de acesso. Excluir senhas, tokens, corpos completos de requisição/resposta e campos pessoais sem finalidade, incluindo e-mail. Notificações retornam apenas conteúdo aprovado e estado de leitura do destinatário.

Uma exportação sem resultados produz CSV com cabeçalho e nenhuma linha. A continuação de um recorte maior acontece pela escolha de filtros mais restritos em novas requisições. Cada nova requisição revalida a autorização e consome sua cota.

## Compatibilidade dos consumidores

Auditoria usa hoje pagina e tamanhoPagina, com padrão 50 no DTO, e o frontend espera um array em obterLogsAuditoria. API T004 migra o padrão para 25 e entrega o envelope junto da atualização dos leitores, testes e tipos correspondentes. Produtos, usuários, empréstimos e notificações também têm leitores de arrays. Inventariar os pontos reais antes da troca e publicar produtor e consumidores em conjunto.

O contrato conserva os dados de item permitidos na jornada, com as projeções mínimas aprovadas para auditoria e perfis. Aliases legados de recuperação ficam sob a decisão de acesso e mantêm o mecanismo específico de autenticação. API T003 aplica admissão antes do efeito, T004 migra listagens e consumidores, T005 define o envelope de erro e datas, T008 aplica o transporte no proxy. Auditoria T004 compartilha a cota de emissão e T006 a de consulta, relatório e exportação.

## Casos de fronteira

Nos casos temporais abaixo, considerar requisições autorizadas com entrada válida e a mesma identidade na mesma janela. A resposta admitida segue o status de negócio da operação.

| Caso | Abaixo | No teto | Acima ou vazio | Resultado esperado |
| --- | --- | --- | --- | --- |
| Cadastro por IP/hora | 9ª admissão | 10ª admissão | 11ª tentativa | Abaixo e teto seguem validação. 11ª recebe 429 e Retry-After |
| Empréstimos por conta/hora | 29ª admissão | 30ª admissão | 31ª tentativa | Abaixo e teto seguem validação. 31ª recebe 429 |
| Emissão manual por administrador/hora | 29ª admissão | 30ª admissão | 31ª tentativa | Abaixo e teto seguem elegibilidade. 31ª recebe 429 |
| Emissão automática por processo/hora | 59ª admissão | 60ª admissão | 61ª tentativa | Abaixo e teto seguem elegibilidade. 61ª recebe 429 |
| Consulta e relatório por conta/minuto | 59ª admissão combinada | 60ª admissão combinada | 61ª tentativa combinada | Abaixo e teto seguem consulta. 61ª recebe 429 |
| Exportações por conta/hora | 4ª admissão | 5ª admissão | 6ª tentativa | Abaixo e teto seguem exportação. 6ª recebe 429 |
| Fim da janela | Agora antes do fim, cota cheia | Agora igual ao fim | Agora depois do fim | Antes recebe 429. No fim e depois, nova janela admite a primeira requisição |
| Concorrência com uma vaga | Uma vaga antes das duas tentativas | Duas tentativas simultâneas em réplicas distintas | Mesma chave | Exatamente uma segue. A outra recebe 429 sem efeito de negócio |
| Volume do empréstimo | 99 entradas | 100 entradas | 101 entradas ou zero | 99/100 seguem domínio. 101 recebe 400. Zero recebe validação estrutural |
| Corpo JSON | 1.048.575 bytes | 1.048.576 bytes | 1.048.577 bytes | Abaixo e teto seguem leitura. Acima recebe 413 |
| Campo curto | 254 caracteres | 255 caracteres | 256 caracteres | Abaixo e teto seguem domínio. Acima recebe 400 por campo |
| Texto livre | 1.999 caracteres | 2.000 caracteres | 2.001 caracteres | Abaixo e teto seguem domínio. Acima recebe 400 por campo |
| Tamanho da página | 99 | 100 | 101 ou zero | 99/100 válidos. 101/zero recebem 400 |
| Número da página | Página 1 | Última página com itens | Página posterior, total zero ou índice zero | Posterior e total zero têm itens vazio. Índice zero recebe 400 |
| Exportação por recorte | 4.999 linhas | 5.000 linhas | 5.001 linhas ou zero | 4.999/5.000 geram CSV. 5.001 recebe 400. Zero gera só cabeçalho |
| Mudança de permissão | Página anterior autorizada | Nova página ou exportação após mudança | Escopo removido | Revalidar e recusar ou reduzir o recorte conforme a política de recurso |
| Limitador indisponível | Sem reserva confirmada | Timeout ou falha do PostgreSQL | Resultado incerto da reserva | Responder 503 e preservar negócio |

## Conferência documental

A verificação inicial encontrou o arquivo ausente, portanto faltavam o catálogo e todas as fronteiras. A conferência final exige as seis cotas temporais, dimensões de volume e tamanho, regras de janela e concorrência, indisponibilidade, envelope, desempate, vazio, exportação e migração dos leitores. O ciclo é documental porque T002 entrega o contrato que as tarefas de implementação e teste executam.
