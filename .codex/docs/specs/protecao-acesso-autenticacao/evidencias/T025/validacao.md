# T025 — Validação

## Execuções

- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~E2ESeedSafetyTests|FullyQualifiedName~E2ESeedIsolationTests"` - **9/9 aprovados**.
- `npm.cmd run test:e2e -- --list --project=real` - **16 testes em 6 arquivos**.
- `npm.cmd run test:e2e -- --list --project=ui` - **222 testes em 8 arquivos**.
- `npm.cmd run test:e2e -- --project=real e2e/authentication-protection.real.spec.ts e2e/credential-lifecycle.spec.ts` - **6/6 aprovados** em banco PostgreSQL recém-criado no projeto isolado T025.
- `npm.cmd run test:e2e -- --project=ui e2e/authentication-protection.ui.spec.ts` - **1/1 aprovado**.
- `docker compose -f docker-compose-e2e.yml config --quiet` - aprovado usando o projeto isolado `lab-solos-auth-e2e`.

## Ambiente e isolamento

- O projeto Compose foi definido como `lab-solos-auth-e2e`; a stack T025 usou as portas locais 4173 (frontend), 18125 (API) e 18126 (Mailpit). O serviço `smtp` foi recriado somente no projeto T025, com `--no-deps` e `E2E_SMTP_PORT=18126`.
- No primeiro reconfigure, o serviço de geração de certificados atualizou o volume da CA enquanto o Mailpit ainda servia o certificado anterior. A verificação TLS mostrou certificados diferentes e o Mailpit registrou falha de handshake. Depois de recriar somente o Mailpit T025, o handshake STARTTLS validou (`Verification: OK`) e a jornada Mailpit passou. Não houve alteração no Compose nem na produção.
- Após execuções exploratórias, foi recriado apenas o volume PostgreSQL do projeto T025. A execução real final passou com banco limpo. O volume SMTP/CA permaneceu no projeto próprio.
- Trace e screenshot estão desativados nas três specs T025. Após a última execução, o diretório de artefatos contém somente o relatório HTML e o manifesto `.last-run.json`; não há arquivos de trace, screenshot ou contexto de erro. Nenhum código, senha ou token foi incluído nesta evidência.

## Cleanup e preservação

- `docker compose -p lab-solos-auth-e2e -f docker-compose-e2e.yml down --volumes --remove-orphans` removeu apenas os quatro contêineres, as duas redes e os dois volumes próprios do projeto T025. Após a limpeza, não restam contêineres, volumes, redes nem listeners nas portas 4173/18125/18126 do projeto auth.
- Permanecem os volumes `lab-solos-quality-e2e_e2e_postgres_data` e `lab-solos-quality-e2e_e2e_smtp_certs`; o projeto `lab-solos-quality-t024` manteve seus dois volumes e duas redes.
- `lab-solos-security-e2e` permaneceu com API, frontend, SMTP e proxy ativos/saudáveis, mais seu contêiner de geração de segredos encerrado com sucesso. Nenhum recurso do projeto security foi alterado.
