# T010 — revisão integrada da limpeza e capacidade

Data: 2026-10-13.

Na revisão da integração, identifiquei que a admissão limpava até 100 trabalhos expirados sem decrementar `AuthenticationProtectionCapacity`; uma chave expirada fora desse lote também continuava sob o índice único parcial de `Pending`/`Processing`, fazendo uma nova admissão com a mesma chave falhar.

RED: `EnqueueReclaimsAnExpiredMatchingKeyOutsideItsCleanupBatch` falhou em PostgreSQL 15 ao verificar o contador exato depois de semear 101 trabalhos expirados, deixando a chave alvo fora do primeiro lote.

Correção: a admissão agora decrementa a capacidade na mesma transação para o lote limpo e cancela/limpa o payload da chave expirada correspondente antes de inserir o novo trabalho. A nova linha mantém uma única vaga ativa e o total alocado em 1.

GREEN: filtro `FullyQualifiedName~RecoveryJobRepositoryTests` passou em 11/11, incluindo o caso acrescentado na revisão; a compilação disparada por `dotnet test` passou, com avisos já existentes no repositório. A validação isolada do novo caso passou em PostgreSQL 15.

Integração da onda 3: suíte backend completa em 379/379; rebuild Release em 0 erros e 176 avisos de análise gerais, sem avisos nos arquivos T010; `git diff --check` passou.
