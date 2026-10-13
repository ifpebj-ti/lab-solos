# Evidências — T021: espera acessível em Login e redefinição

- Issue associada: #437. Issue permanece aberta e `In Progress`, conforme orientação do orquestrador.
- Escopo: tratamento de `429` em Login e ResetPassword, prazo de espera acessível, bloqueio até o prazo, nova submissão apenas por ação do usuário e preservação da resposta neutra da solicitação de recuperação.

## RED

- O worktree não continha `frontend/node_modules`; a primeira chamada ao comando de Vitest parou com `vitest is not recognized`. `npm.cmd ci` restaurou as dependências sem alterar `package.json` ou `package-lock.json`. O teste focado anterior às mudanças passou em **24/24**.
- Depois de adicionar os cenários de prazo controlado, o comando focado falhou nos **4** novos casos de Login/ResetPassword e passou nos **26** demais. A falha observada foi a ausência de `role=status` no 429; o formulário de Login continuava habilitado e ResetPassword mostrava apenas o feedback genérico, sem aplicar espera.

## GREEN e REFACTOR

- Criado `AuthenticationWaitFeedback` com `role="status"`, anúncio `aria-live="polite"`, texto estático sem contador por segundo e orientação explícita de que nenhuma solicitação será enviada automaticamente.
- O hook compartilhado valida `Retry-After`, usa espera genérica de 30 segundos para metadado ausente/inválido e limpa o timer ao desmontar. Login e ResetPassword bloqueiam o botão e também ignoram submissões do formulário durante a janela. Ao expirar, o botão fica elegível e a próxima requisição depende de ação manual.
- Login e redefinição mantêm a categoria segura de `rate_limited`; o teste de integração confirma prioridade do cabeçalho `Retry-After` sobre o valor de extensão do corpo e ausência de exposição da mensagem remota. O 202 neutro de ForgotPassword continua sem feedback de espera.
- Testes focados finais: `npm.cmd run test -- --run src/pages/Login.test.tsx src/pages/ResetPassword.test.tsx src/pages/ResetPassword.errors.test.ts src/pages/ForgotPassword.test.tsx src/components/auth/AuthenticationWaitFeedback.test.tsx src/integration/Auth.test.ts` — **6 arquivos, 36 testes aprovados**. Os casos com timer verificam bloqueio, tentativa por teclado durante a janela, liberação ao prazo, ausência de envio automático, nova ação manual e cleanup no unmount.
- `npm.cmd run lint` — aprovado, sem avisos.
- `npm.cmd run build` — aprovado. Vite reportou avisos não bloqueantes: `/env.js` permanece carregado em runtime, `laboratory.png` é resolvido em runtime e três chunks excedem 500 kB.
- `git diff --check` não apontou erros de whitespace; o Git emitiu apenas avisos de normalização LF/CRLF em arquivos integrados fora do escopo T021.

## Integração no checkout principal

- Suíte frontend completa: `npm.cmd run test -- --run` — **146 arquivos, 694 testes aprovados**.
- `npm.cmd run lint` — aprovado sem avisos.
- `npm.cmd run build` — aprovado; somente avisos já conhecidos sobre `/env.js`, `laboratory.png` resolvido em runtime e chunks acima de 500 kB.
- `git diff --check` — sem erros de whitespace.

## Ambiente e esteira

- `npm.cmd ci` instalou 857 pacotes e reportou 10 vulnerabilidades na árvore do lockfile (2 moderadas, 8 altas). Nenhum manifesto foi alterado nesta tarefa.
- `.github/workflows/container-ci.yml` executa testes, lint e build no job `frontend-quality` em PRs para `develop` nos eventos `opened`, `synchronize`, `reopened`, `edited` e `ready_for_review`, além de `merge_group`.
