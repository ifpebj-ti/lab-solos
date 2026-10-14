# T016 — GREEN e REFACTOR

`AuthController.Login` agora reserva atomicamente as cotas de IP e identificador antes de consultar a conta ou verificar a senha. Falhas são concluídas como tentativas persistidas mesmo quando o cliente cancela depois da admissão; sucessos não apagam o orçamento de IP. A janela vem do relógio da cota e renova depois de expirar. A busca da conta continua usando igualdade exata; somente a chave da cota normaliza caixa e espaços. Identificador inexistente consome a mesma cota e mantém a resposta genérica `401` até o limite.

Quando uma cota é excedida, o endpoint retorna `429`, `Retry-After` e ProblemDetails sem revelar a dimensão bloqueada. Respostas de login, bloqueio e falha operacional usam `no-store`. Falha de configuração ou dependência retorna `503` fechado. O ambiente `IntegrationTesting` aceita somente uma chave sintética de teste quando não há caminho configurado; os demais ambientes sem segredo permanecem fechados.

`AuthenticationProtectionResponses` centraliza as respostas 429/503. Os testes HTTP cobrem limite de conta, limite de IP, normalização sem alterar a resolução exata, identificador inexistente, renovação, sucesso sem limpar a cota de IP, cancelamento após admissão e configuração sem segredo fora do ambiente de teste.
