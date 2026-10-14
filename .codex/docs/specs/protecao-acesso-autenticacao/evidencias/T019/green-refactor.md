# T019 - GREEN e REFACTOR

## Implementacao

- O reset moderno e os dois aliases usam as cotas compartilhadas `recovery-code:recipient` (5 falhas) e `recovery-code:ip` (30 falhas), ambas em 15 minutos.
- Para o alias legado sem email, o servico adquire primeiro a cota de IP, resolve o destinatario pelo hash do token, libera a tentativa preliminar e readquire IP e destinatario em ordem estavel. O token e revalidado depois, enquanto as duas cotas estao protegidas. Token sem destinatario resolvido consome somente a cota de IP.
- Falhas logicas confirmam a contagem sem persistir alteracoes na conta. O sucesso salva senha, consumo do token e incremento de versao dentro da tentativa transacional, e preserva o cancelamento lazy de trabalhos pendentes da T018.
- A resposta 429 usa a resposta compartilhada, `Retry-After`, `Cache-Control: no-store` e `application/problem+json`; indisponibilidade de protecao responde 503. Os contratos existentes 204, 400 e 409 foram mantidos.
- O controller recebe o IP resolvido do `HttpContext`. Um contrato `IPasswordResetService` leva esse dado ao servico; `ICredentialService` conserva sua assinatura para compatibilidade com a implementacao de worker da T018. O DI resolve ambos para a mesma instancia scoped de `CredentialService`.
- A rota de reset falha fechada quando os servicos de protecao nao estao disponiveis no caminho relacional. O fallback sem throttle permanece limitado ao provider InMemory usado pelos testes de unidade preexistentes.

## Evidencias GREEN

- O teste de PostgreSQL 15 confirma o 429 na sexta falha alternando aliases, sem alterar senha, token ou versao.
- O teste legado sem email confirma que token invalido nao contorna o limite IP na 31a tentativa.
- O teste legado sem email com token valido, mas confirmacao invalida, confirma que o destinatario e inferido do hash e que a sexta tentativa recebe 429 sem consumir o token.
- A conta continua autenticando com a senha original depois do limite de reset, e as cotas de login permanecem separadas.
- Os contratos de controller verificam delegacao do alias, resposta neutra, e encaminhamento do IP pelo contrato dedicado.
