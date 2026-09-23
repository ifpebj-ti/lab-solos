# T015 — Resultado de execução

## Escopo

Cadastro, recuperação de acesso, redefinição de senha e troca obrigatória foram migrados para uma composição visual compartilhada, preservando os contratos de autenticação, validação por campo, política de senha, privacidade da recuperação e revogação de sessão.

Implementação principal:

- frontend/src/components/auth/AuthFlowShell.tsx: shell compartilhado com canvas/surface, cabeçalho institucional, controle de tema, foco visível e landmarks.
- frontend/src/pages/CreateAccount.tsx: cadastro alinhado ao shell visual aprovado, com estados, termos, seleção de perfil e submissão preservados.
- frontend/src/pages/ForgotPassword.tsx, ResetPassword.tsx e ChangePassword.tsx: jornadas de credencial com hierarquia, mensagens e botões tokenizados, sem alteração dos serviços.
- Renderização do ThemeSwitch permanece dependente do ThemeProvider em produção e é condicional apenas para permitir a montagem isolada das páginas nos testes.

## TDD e validação

### RED / caracterização

- Linha de base das oito suítes de autenticação: 8 arquivos, 33 testes verdes antes da reformulação.
- A caracterização preservou os seletores e contratos usados pelo credential-lifecycle.spec.ts, incluindo campos de senha, token, confirmação, retry e navegação.

### GREEN / REFACTOR

- Suítes dirigidas T015: 8 arquivos, 33 testes verdes.
- Suíte frontend completa: 138 arquivos, 639 testes verdes.
- Lint: verde (npm.cmd --prefix frontend run lint).
- Build: verde (npm.cmd --prefix frontend run build).
- Detector Impeccable: [].
- git diff --check: verde; os avisos restantes são apenas normalização LF/CRLF do working tree.

### E2E

- Compose lab-solos-quality-e2e: backend, banco, frontend e SMTP saudáveis.
- credential-lifecycle.spec.ts no frontend containerizado: 4/4 verdes:
  - login válido e senha inválida;
  - troca obrigatória e revogação das sessões;
  - recuperação por e-mail, token do Mailpit e reset;
  - logout e remoção da sessão.
- design-system.spec.ts + design-pilots.spec.ts: 20/20 verdes no frontend containerizado.
- Axe nos cenários públicos de login e acesso: 0 violações; os achados compartilhados de telas administrativas/catalogação permanecem registrados nas evidências dos marcos anteriores e fora da posse da T015.

## Limitações e decisões

- A sincronização de issue/GitHub Project foi omitida por autorização explícita de Nathan.
- O launcher Impeccable instalado suporta detect, mas não disponibiliza audit/critique; isso permanece como limitação documentada do ambiente. O detector executado para os alvos T015 retornou [].
- O primeiro E2E de recuperação expôs uma limitação do stack efêmero: o Mailpit entregava somente o certificado folha e o SmtpClient reportava PartialChain. A cadeia foi corrigida no volume descartável do Compose, sem alteração de código ou dados do repositório; a repetição passou 4/4.
- O agente delegado para T015 foi encerrado após não retornar; a implementação e a validação foram recuperadas centralmente.

## Resultado

T015 concluída sob limitação de ambiente. Nenhum contrato de autenticação foi alterado, nenhum bypass de troca obrigatória foi introduzido e o fluxo real de credenciais foi validado no Docker.

## Retomada — 2026-09-23

### RED

- Reprodução de linha de base informada para esta retomada, com `E2E_COMPOSE_PROJECT=lab-solos-quality-e2e`: 3/4 casos de `credential-lifecycle.spec.ts` passaram após sincronizar o certificado TLS do Mailpit; o caso de logout excedeu 120 s esperando um botão cujo seletor procurava o e-mail da conta.
- O snapshot acessível do controle apresentou o nome `Abrir menu de E2E Administrator …`; portanto, a falha do logout era incompatibilidade entre o contrato do teste e o nome acessível vigente, não falha da operação de logout.
- Causa ambiental separada: o SMTP apresentava cadeia TLS incompleta (`PartialChain`). O coordenador reiniciou apenas o serviço SMTP do Compose de qualidade; `Verify return code 0` confirmou o TLS antes desta validação final. Durante a execução delegada da T015 não foram emitidos comandos Docker para parar, reconfigurar ou reconstruir containers.

### GREEN / REFACTOR

- Alterado somente o seletor do teste de logout em `frontend/e2e/credential-lifecycle.spec.ts`: agora localiza o botão pelo papel e pelo nome acessível `/Abrir menu de E2E Administrator/i`, e então seleciona o item `Sair`. Nenhum componente de produção ou contrato de autenticação foi alterado.
- Não havia estrutura duplicada que justificasse refatoração adicional; a suíte real completa foi repetida após a mudança como verificação final.

### Validações da retomada

- `$env:E2E_COMPOSE_PROJECT = 'lab-solos-quality-e2e'; npm.cmd --prefix frontend run test:e2e -- --project=real credential-lifecycle.spec.ts` — 4/4 aprovados (16,4 s): login/senha inválida, troca de senha e revogação de sessão, recuperação por e-mail/Mailpit/reset e logout/remoção da sessão.
- `npm.cmd --prefix frontend run test -- --run src/pages/CreateAccount src/pages/ForgotPassword src/pages/ResetPassword src/pages/ChangePassword src/components/auth src/auth` — 13 arquivos e 93 testes aprovados (6,21 s).
- Playwright emitiu apenas o aviso de ambiente `NO_COLOR` ignorado devido a `FORCE_COLOR`; não afetou o resultado.
- Sincronização de issue/Project omitida por autorização explícita do usuário. `tasks.md` não foi editado.
