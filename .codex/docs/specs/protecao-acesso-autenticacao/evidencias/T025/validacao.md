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

## Retomada da validação cruzada — 2026-11-24

### RED e correção das expectativas

- A validação T016 apontou que o cenário de Mentor comparava o Problem Details 404 inteiro, incluindo `correlationId`, que é único por requisição. O teste agora exige os campos públicos estáveis (`type`, `title`, `status`, `code`), compara todos os campos exceto `correlationId` e confirma que a resposta não revela `id` ou `detail`.
- A primeira execução após a correção de mensagem da T020 passou pelos dois cenários de autorização/perfil, mas parou porque o assert de sucesso esperava “Perfil atualizado.” durante uma troca de e-mail. A tela informa “E-mail atualizado. O endereço anterior ficará reservado para esta conta por 7 dias. Avisos para os dois endereços foram programados.”; o teste foi alinhado à mensagem vigente.
- O cenário de senha incorreta observou a resposta HTTP `400`, `errors.senhaAtual` contendo `current_password_invalid`, ausência da senha no corpo e perfil idêntico antes/depois da tentativa. A UI exibiu a mensagem específica após a T020 passar a ler o código de campo sob `validation_failed` global.

### GREEN e validação

- `npm.cmd run test:e2e -- --project=real e2e/authentication-protection.real.spec.ts e2e/credential-lifecycle.spec.ts --reporter=list --output=e2e/infra/artifacts/access-t025-retake-green2` → **6/6** aprovados (os dois cenários de autorização/perfil e quatro de credenciais).
- `npm.cmd run test:e2e -- --project=ui e2e/authentication-protection.ui.spec.ts --reporter=list --output=e2e/infra/artifacts/access-t025-ui` → **1/1** aprovado.
- `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~E2ESeedSafetyTests|FullyQualifiedName~E2ESeedIsolationTests" --nologo` → **9/9** aprovados.
- `npm.cmd run test:e2e:list` → **255 testes em 21 arquivos**; ESLint dirigido, Prettier e `git diff --check` passaram.
- O hash de `frontend/tsconfig.app.tsbuildinfo` permaneceu `5DFFAD801A9AB8EF895E51E3A04311176D9FC613B4C070EB3399E166F6426800`.

### Isolamento

- Stack construída após a regressão verde de T020 no Compose exclusivo `lab-solos-access-t025-retake`: frontend `4173`, API `18176`, Mailpit `18276`; PostgreSQL novo e credenciais/aliases sintéticos. A primeira execução dirigida foi **5/6** e deixou apenas a pasta de saída isolada `access-t025-retake-green`, sem traces, screenshots ou credenciais; a segunda execução completa passou **6/6** na pasta `access-t025-retake-green2`.
- Encerrados containers, redes, volumes e imagens próprios do projeto `lab-solos-access-t025-retake`. As pastas Playwright de saída isoladas (`access-t025-retake-green`, `access-t025-retake-green2` e `access-t025-ui`) permaneceram no diretório ignorado de artefatos porque a política do shell bloqueou a remoção recursiva; não contêm traces, screenshots ou credenciais. A stack foi criada novamente sobre o código de frontend que contém a correção T020; nenhuma configuração remota foi consultada ou alterada.
