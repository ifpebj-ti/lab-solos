# Contrato de erros e datas da API

Entrega local de T005, issue #483. Aplicam-se RF-008, RF-009, RNF-003 e CA-010 a CA-012 do [PRD](prd.md) e as [decisões registradas](../decisoes-de-planejamento.md#api-limites-e-auditoria).

## Respostas públicas

Resultados de erro da API usam `application/problem+json`, com `status`, `title`, código de máquina `code` e `correlationId`. A correlação é gerada pelo servidor e também aparece no cabeçalho `X-Correlation-ID`. A identificação recebida do cliente fica fora desse vínculo.

| Situação | HTTP | Código padrão | Orientação |
| --- | --- | --- | --- |
| Entrada inválida, inclusive JSON inválido | 400 | validation_failed | Verifique os dados informados. |
| Sessão ausente | 401 | authentication_required | Entre na sua conta para continuar. |
| Permissão insuficiente | 403 | access_denied | Você não tem permissão para realizar esta operação. |
| Recurso ausente ou oculto pela política de acesso | 404 | resource_not_found | O recurso solicitado está indisponível. |
| Conflito de estado | 409 | operation_conflict | A operação conflitou com o estado atual. Atualize os dados. |
| Corpo excedente | 413 | request_body_too_large | A solicitação excede o tamanho permitido. |
| Cota temporal | 429 | admission_rate_limited | Aguarde antes de tentar novamente. |
| Serviço temporariamente indisponível | 503 | service_unavailable | O serviço está temporariamente indisponível. |
| Falha operacional | 500 | operation_failed | Não foi possível concluir a operação. |

O código padrão é usado quando o produtor ainda entrega texto ou status sem contrato tipado. `ProblemDetails` e `ValidationProblemDetails` existentes de falha de cliente preservam a orientação pública aprovada, o código específico e metadados de domínio. Isso inclui os contratos de cadastro, autenticação, empréstimos e confirmação de validade. O filtro completa os campos ausentes e a correlação, sem renomear campos consumidos pelo frontend.

Falhas de vinculação automática do modelo usam mensagens de campo fixas. Excluir o texto do parser e os valores enviados. Falhas operacionais têm texto genérico. O registro do resultado usa correlação, status e categoria pública e exclui corpo, senha, token e valores de campos. O log fica no destino de diagnóstico configurado da aplicação e segue a política de acesso e retenção de Auditoria.

O middleware cobre respostas de API sem corpo, inclusive uma rota desconhecida. O filtro MVC cobre resultados produzidos pelos controllers e as recusas automáticas do modelo. A emissão desses contratos pelo proxy, a migração do mapeamento de erros no frontend e as políticas de cache e cabeçalhos têm tarefas próprias.

## Datas e intervalos

Nos parâmetros de consulta do tipo `DateTime` ou `DateTime?`, aceitar somente data civil `yyyy-MM-dd` ou instante ISO 8601 com segundos e fuso explícito `Z` ou `±HH:mm`. Aceitar até sete casas na fração de segundo. Rejeitar data impossível, formato localizado, instante sem fuso e valores repetidos para o mesmo parâmetro. Os erros retornam `400` e identificam o campo.

Uma data civil usada para filtrar instantes representa a meia-noite institucional da data informada, convertida para UTC. O fuso vem de `Products:TimeZone`, com padrão `America/Sao_Paulo`. Em fronteira histórica de fuso que não identifique uma meia-noite única, exigir um instante com fuso explícito. Instantes com offsets diferentes que representam o mesmo momento produzem o mesmo UTC.

Intervalos incluem o início e excluem o fim. `dataFim=2026-11-17` representa o início do dia 17 no fuso institucional e inclui o dia 16 quando o início for o dia 16. Para incluir o dia 17 inteiro, enviar o início do dia 18 como fim. `FiltroAuditoriaDTO` recusa início maior ou igual ao fim quando ambos são fornecidos. Consultas e agregados de auditoria aplicam `DataHora >= inicio && DataHora < fim`.

Datas civis de fabricação e validade continuam representando o dia armazenado. A conversão de filtros de instantes não é aplicada à leitura desses valores, que usa `ProductCivilDay.FromStoredDate`.

## Evidência

O teste inicial demonstrou respostas textuais ou sem código, data civil ligada ao relógio da máquina, aceitação de instante sem fuso e inclusão indevida do fim do intervalo. Os cenários de integração validam as categorias, JSON inválido, UTF-8, correlação gerada no servidor, preservação de contrato tipado, equivalência entre offsets, intervalo inválido e fronteiras em PostgreSQL. A validação dirigida inclui os testes existentes do repositório de auditoria.
