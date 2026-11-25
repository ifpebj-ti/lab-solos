# Evidências de composição, compatibilidade e retorno

Registro local da execução de Contas e sessões T013. Os cenários usam somente dados sintéticos em composições descartáveis; não houve acesso a produção nem operação no GitHub.

## Configuração e decisões aplicadas

- Checkout anterior: `c642854c44ff36709e75aeb3f25a3d865640eb8c` (`HEAD` local em 23/11/2026), compilado em worktree temporário separado.
- Esquema atual: 19 migrations aplicadas no PostgreSQL sintético. O container da API anterior iniciou contra essa base sem aplicar migração destrutiva nem alterar a versão do esquema.
- A publicação de teste usou HTTPS de mesma origem no Caddy e o proxy previsto para o projeto. O override local temporário alinhou o IP do proxy com `KnownProxies` para a rede isolada; o arquivo de override foi removido após a execução.
- A janela de sessão aprovada é preservada: sessão ativa passa pelo reinício do processo atual; sessão revogada continua recusada. A migração coordenada entre versões exige reautenticação no corte, conforme a decisão registrada.

## API e interface anteriores sobre o esquema atual

A API e o frontend do checkout-base foram compilados e executados sequencialmente contra o mesmo volume PostgreSQL já migrado pela versão atual, atrás do mesmo proxy HTTPS.

| Verificação | Resultado |
| --- | --- |
| Inicialização da API do `HEAD` com as 19 migrations atuais | Saudável |
| Login sintético na API anterior e leitura autenticada do próprio perfil via Caddy HTTPS | `200` / `200` |
| Login pelo frontend anterior | `200`; navegação para `/admin/users` |
| Leituras protegidas da tela administrativa anterior | 9 respostas de API `200` |
| Estado antes e depois de iniciar a API anterior | 2 sessões revogadas; 2 reservas de endereço; 2 eventos `TrocaEmail`; 1 administrador habilitado; 19 migrations |

A interface do checkout-base apresenta o login em `/`; a rota `/login` não existe nessa versão. Depois de usar a rota vigente do frontend anterior, o fluxo administrativo funcionou com o contrato JWT antigo. O retorno foi sequencial, não uma execução simultânea das duas versões.

## Composição atual por HTTPS

Com a versão atual restaurada sobre o mesmo banco:

- `npm run test:e2e -- --project=security browser-security.real.spec.ts`: **5/5**.
- O cenário T013 cobre recusa de origem externa no logout, guarda do último administrador, troca de e-mail pelo cookie e CSRF, conflito ao reutilizar o endereço reservado, projeção de auditoria sem os endereços, revogação por logout e reinício da API.
- Após o reinício da API, a sessão administrativa ativa permaneceu válida, a sessão revogada retornou `401`, a reserva permaneceu em conflito `409`, o evento de auditoria continuou consultável e a guarda administrativa continuou retornando `409`.
- Uma execução adicional do cenário T013, já após o retorno à versão atual, passou **1/1**.
- `E2E_COMPOSE_PROJECT=lab-solos-t013-auth npm run test:e2e -- --project=real credential-lifecycle.spec.ts`: **4/4**, cobrindo login, revogação das sessões após troca de senha, recuperação por Mailpit e logout. A composição `real` usa a origem HTTP local; a composição security acima cobre o proxy HTTPS.
- Contagem final, após revalidar a versão atual: 4 sessões revogadas, 4 reservas, 4 eventos de troca de e-mail, 1 administrador habilitado e as mesmas 19 migrations. As contagens cresceram apenas pelos dois novos casos sintéticos executados após o retorno.

## RED, ajustes do ensaio e limites

A linha de base de segurança passou 4/4 antes de incluir T013. As primeiras execuções do novo cenário expuseram ajustes no próprio ensaio: a sondagem de limite por IP precisava vir depois do cenário autenticado; o override de sub-rede também precisava atualizar `KnownProxies`; a tentativa de alterar o perfil administrativo não era a operação que aciona a guarda, então o cenário passou a exercitar a exclusão protegida; e a projeção de auditoria serializa o código enum como `TrocaEmail` e a ação como `troca_email`. Nenhuma dessas falhas representou regressão de produção.

O ensaio anterior confirma que o binário e a interface do `HEAD` iniciam e atendem a jornada de leitura autenticada no esquema aditivo atual; não prova que a versão antiga preserve funcionalidades novas que ela não implementa. O corte aprovado requer reautenticação e retorno conjunto de frontend/API. A evidência cobre esse contrato de leitura/retorno e os invariantes novos consultados pela versão atual após o retorno; não simula tráfego de usuários nem implantação remota.
