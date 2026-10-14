# T004 — GREEN / REFACTOR

- Implementado `RecoveryPayloadProtector` com AES-256-GCM do .NET, nonce aleatório de 12 bytes, tag de 16 bytes e AAD contendo `v1`, UUID do trabalho, finalidade e ID da chave. `Request` e `Delivery` usam finalidades distintas.
- O `RecoveryEncryptionKeyRing` lê `activeKeyId` e o mapa Base64 por `ISecretFileReader`, valida tamanho/IDs/chave ativa, mantém IDs antigos para leitura e zera buffers de arquivo/chaves em memória quando possível. O protetor zera cópias de chave e dados associados; falhas criptográficas retornam mensagens genéricas, sem logar payload.
- Cobertura inclui round-trip, ciphertext diferente do plaintext, nonces distintos, adulteração de ciphertext/nonce/tag, UUID/finalidade/ID de chave, arquivo de chaves inválido, seleção de chave ativa, chave anterior retida e chave ausente após rotação.
- Filtro final: `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~RecoveryPayloadProtectorTests"` — 13 aprovados, 0 falhas, 0 ignorados. Repetido após ajuste final de nullability, também 13/13.
- Build exigido: `dotnet build backend/backend.sln -c Release --nologo --disable-build-servers` — código 0, 0 avisos, 0 erros no build final.
- `git diff --check` passou. A CI pré-merge correspondente foi conferida em `container-ci.yml`.

Limite deliberado do escopo: integração da fila, emissão/envio, registro DI e validação dos trabalhos existentes são das tarefas posteriores; T004 não cria fila nem executa SMTP. Não foram usados segredos reais.
