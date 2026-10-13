# T009 — RED

Data: 2026-10-13. Ambiente relacional: Docker 29.8.0 com fixture PostgreSQL 15 (`postgres:15-alpine`, digest fixado).

A linha de base da migração que fornece os seis espaços e as tabelas de capacidade passou: `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~AuthenticationProtectionMigrationTests" --nologo --verbosity quiet` — 5/5.

Com o contrato de cotas compilado, mas sem a implementação de persistência/locking, `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~SharedAuthenticationThrottleTests" --nologo --verbosity quiet` apresentou 8 falhas comportamentais e 1 aprovação. A aprovação verificava que o contrato inicial podia ser detectado; as falhas demonstraram ausência de garantias executáveis de cota concorrente, contagem entre instâncias, sucesso sem limpar a cota de IP, janelas e cooldowns sem deslizamento, bloqueio por `NextEmissionAt`, capacidade exata, realocação após expiração e limpeza segura. A execução compilou e alcançou os asserts; não foi uma falha de build, Docker ou ausência de banco.

A RED também expôs que a fixture T006 cobre PostgreSQL 16, enquanto a produção usa PostgreSQL 15. A classe T009 foi ligada à fixture isolada de PostgreSQL 15 antes do GREEN.
