# T022 — execução local

## Issue

- Issue #437: `OPEN`, assignee `nathannmvr`.
- Project 41: `In Progress`.
- Estado conferido ao final; sem alterações remotas nesta execução.

## RED

A linha de base de `SecureSeedStartupTests` passou 9/9 antes da implementação.

Antes do bootstrap/configuração, os três novos casos de `AuthenticationProtectionStartupTests` falharam por comportamento ausente: inicialização aceitava arquivos secretos ausentes, instâncias com políticas diferentes podiam iniciar juntas e um job ativo podia referenciar chave de recuperação indisponível. Os quatro contratos Python de Compose também falharam: não havia IP/sub-rede estáveis para o Caddy, mounts de segredo somente leitura, allowlist/proxy por ambiente nem geração efêmera das chaves E2E.

## GREEN e REFACTOR

- `AuthenticationProtectionOptions` é validado em `ValidateOnStart`; o hosted service compara a política completa entre instâncias vivas, verifica chaves de jobs ativos e retém uma conexão PostgreSQL sem pooling durante a vida do serviço. A conexão sem pooling evita que sessões ociosas devolvidas ao pool pareçam instâncias ativas após o encerramento.
- `/health` retorna apenas `ready`/`not_ready`; falhas de dependência não expõem configuração ou exceções.
- Produção parametriza sub-rede/IP fixo do Caddy, informa o mesmo IP à API e mantém a API sem `ports`. Segredos são bind mounts somente leitura em produção e desenvolvimento. Os arquivos `.env` contêm caminhos e placeholders, sem valores de chave.
- Desenvolvimento configura somente as duas origens localhost exatas. O E2E gera chaves sintéticas no volume descartável existente e monta os arquivos somente leitura no backend.
- As factories de teste usam um `ISecretFileReader` sintético; os cenários de inicialização executam explicitamente o hosted service que a factory de integração normalmente remove.

## Validação final

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~AuthenticationProtectionStartupTests|FullyQualifiedName~SecureSeedStartupTests"` — 12 aprovados, 0 falhas.
- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~BrowserSecurityHeadersTests"` — 7 aprovados, 0 falhas.
- `python -m unittest discover -s .github/scripts/tests -p "test_authentication_protection_compose.py" -v` — 4 aprovados.
- `docker compose --env-file .env.prod.example -f docker-compose-prod.yml config --quiet` — aprovado.
- `docker compose --env-file .env.example -f docker-compose-dev.yml config --quiet` — aprovado.
- `docker compose -f docker-compose-e2e.yml config --quiet` — aprovado.
- `git diff --check` — sem erros de whitespace; Git emitiu apenas avisos de conversão automática LF/CRLF no checkout Windows.

## Arquivos T022

- `.env.example`
- `.env.prod.example`
- `.github/scripts/tests/test_authentication_protection_compose.py`
- `backend/LabSolos-Server-DotNet8/Program.cs`
- `backend/LabSolos-Server-DotNet8/Services/Security/AuthenticationProtectionStartupValidator.cs`
- `backend/LabSolos-Server-DotNet8/Services/Security/SecurityServiceCollectionExtensions.cs`
- `backend/Tests/Integration/AuthenticationProtectionStartupTests.cs`
- `backend/Tests/Integration/BrowserSecurityHeadersTests.cs`
- `backend/Tests/Integration/SecureSeedStartupTests.cs`
- `docker-compose-dev.yml`
- `docker-compose-e2e.yml`
- `docker-compose-prod.yml`

## Limite operacional

A validação de Compose usou a sub-rede ilustrativa `172.29.240.0/24`. Antes de publicar em um host real, confirmar que a sub-rede escolhida não conflita com as redes daquele host e provisionar os dois arquivos de segredo nos caminhos configurados. Nenhum ambiente foi publicado.

## Validacao integrada no checkout principal

- Filtro exigido `AuthenticationProtectionStartupTests|SecureSeedStartupTests`: 12 aprovados, 0 falhas.
- `BrowserSecurityHeadersTests`: 7 aprovados, 0 falhas.
- Regressao `LoginThrottleTests`: 9 aprovados, 0 falhas. O caso de segredo ausente agora confirma rejeicao de startup antes de verificar senha, conforme `ValidateOnStart`.
- Teste Python do contrato Compose: 4 aprovados, 0 falhas.
- `docker compose config --quiet` passou para producao, desenvolvimento e E2E.
- Suite completa do backend: 428 aprovados, 0 falhas.
- `git diff --check` sem erros de whitespace; somente avisos LF/CRLF preexistentes.
- Revisao de portabilidade substituiu caminhos de segredo Windows-only nas fixtures por caminhos absolutos sob `Path.GetTempPath()`.
- #437 continua aberta, atribuida a `nathannmvr` e `In Progress` no Project 41. O conflito de subnet de producao e os arquivos secretos precisam ser confirmados/provisionados no host de destino antes da publicacao.
