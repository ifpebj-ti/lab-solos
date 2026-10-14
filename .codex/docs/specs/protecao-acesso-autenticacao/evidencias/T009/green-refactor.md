# T009 — GREEN e REFACTOR

Data: 2026-10-13.

## Implementação

- `PostgresAuthenticationThrottle` usa transações PostgreSQL e parâmetros tipados; aloca buckets em transação curta, serializa capacidade por espaço, bloqueia dimensões em ordem estável e consulta o relógio do banco após adquirir locks.
- As seis dimensões usam contagem compartilhada, janela iniciada no primeiro evento contado, decisão de bloqueio sem renovar prazos, cooldowns de admissão e `NextEmissionAt`. Uma autenticação aceita não apaga histórico ativo de IP.
- A capacidade é limitada exatamente por `MaxBucketsPerScope`; inserções e remoções ajustam o contador na mesma transação. Limpeza em lotes só remove linhas cujo prazo de janela, cooldown e emissão já expirou, usando `SKIP LOCKED` para conviver com tentativas e alocações.
- A API devolve estados fechados (`RateLimited`, `CapacityExceeded`, `Unavailable`) sem lease quando não pode prosseguir; leases permitem que consumidores salvem seu trabalho e conclusão da cota sob a mesma transação. Falhas contam com prazo interno mesmo quando o chamador cancela.
- O worker periódico executa a limpeza. Endpoints e registro de consumidores permanecem para tarefas posteriores, conforme o escopo T009.

## Validação

- RED: filtro `SharedAuthenticationThrottleTests` — 8 falhas comportamentais e 1 aprovação do contrato inicial, com PostgreSQL 15.
- GREEN final: `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~SharedAuthenticationThrottleTests" --nologo --verbosity normal -clp:ErrorsOnly` — 11/11. Os casos incluem 32 tentativas concorrentes em contexts/instâncias separados, cotas e contador exatos, capacidade cheia, corrida limpeza/alocação, renovação no prazo exato, cooldown, `NextEmissionAt`, timeout de lock e indisponibilidade.
- Regressão combinada após correções: filtro `FullyQualifiedName~SharedAuthenticationThrottleTests|FullyQualifiedName~CredentialLifecycleMigrationTests` — 14/14 (11 throttle + 3 regressões da migração).
- `dotnet build backend/backend.sln -c Release --nologo --disable-build-servers` — sucesso, 0 avisos e 0 erros.
- `git diff --check` — sucesso.

No primeiro GREEN, o caso de indisponibilidade encontrou timeout de conexão do Npgsql encapsulado em `InvalidOperationException` pelo EF; a classificação passou a inspecionar a cadeia de exceções internas. Também mantive o `AppDbContext` do teste vivo durante todo o lease transacional. A validação final acima passou após esses ajustes.

Os testes de concorrência, capacity e limpeza rodam contra PostgreSQL 15 em Docker; EF InMemory não foi usado para afirmar comportamento de locking. A issue #437 e o Project #41 não foram modificados nesta tarefa. `tasks.md` permaneceu intocado.
