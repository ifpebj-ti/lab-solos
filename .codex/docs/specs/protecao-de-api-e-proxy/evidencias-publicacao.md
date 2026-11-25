# Evidências de publicação, origens e jornadas — T010

- **Data:** 2026-11-23
- **Escopo:** T010 do PRD e da especificação técnica de Proteção da API e do proxy.
- **Ambiente:** composições Docker descartáveis com PostgreSQL, API, frontend, proxy e Mailpit; contas e dados sintéticos. Nenhuma operação remota ou no GitHub foi realizada.
- **Origem HTTPS:** `https://localhost:18443`, Caddy 2.10.
- **Origem HTTP para a jornada de roteamento Nginx:** `http://127.0.0.1:24173`; API e SMTP publicados em portas loopback próprias.
- **Isolamento:** a rede de teste HTTPS usou temporariamente `10.191.240.0/24`, pois as redes locais existentes ocupavam a sub-rede definida no Compose. A sobreposição atualizou também `KnownProxies` para o IP do proxy. O Compose temporário, imagens identificadas pelo projeto, containers, volumes e redes T010 foram removidos ao final.
- **Sanitização:** as identidades, endereços, credenciais, tentativas de login e eventos são sintéticos. Nenhum segredo ou dado de usuário foi registrado.

## Matriz executada

| Categoria/caminho | Origem e contexto | Resultado observado | Evidência |
| --- | --- | --- | --- |
| Páginas públicas `GET /`, `/login`, `/forgot-your-password`, `/reset-password` e `/create-account` | HTTPS, mesma origem | `200`; CSP da interface presente; corpo renderizado. | Projeto Playwright `security`, `browser-security.real.spec.ts`. |
| API protegida `GET /api/Usuarios` sem sessão | HTTPS, mesma origem | `401`, resposta legível pela origem legítima, CSP restritiva da API e sem `Access-Control-Allow-Origin`. | `browser-security.real.spec.ts` e `security-smoke.e2e.ts`. |
| Rota da API não mapeada | Contrato da API | `404 application/problem+json` com `resource_not_found`, antes de autenticação/autorização. | `BrowserSecurityHeadersTests.ApiSuccessAuthenticationFailureAndUnknownRouteKeepHeadersAndUnknownRouteIsNotAuthenticated`, incluído na suíte backend 846/846. |
| API de recuperação `POST /api/Email/request-password-reset` | Origem externa controlada e origem opaca `null` | O navegador não consegue ler a resposta cross-origin; preflight de ambas as origens retorna `401` sem concessão de CORS. | `browser-security.real.spec.ts`; endereços terminados em `.invalid`, sem serviço externo. |
| Perfil de administrador, mentor e mentorado (`/admin/profile`, `/mentor/profile`, `/mentee/profile`) | HTTPS, sessão sintética por cookie | `200`; cada pessoa lê somente o próprio perfil por API; sessão restaurada por cookie `HttpOnly`, `SameSite=Lax`; fontes e imagens carregam. | `browser-security.real.spec.ts`. |
| Recuperação legítima | HTTPS, sessão dispensada na tela pública | A requisição sintética recebe `202` e a interface navega para `/reset-password`. | `browser-security.real.spec.ts`. |
| Exportações administrativas Excel e PDF | HTTPS, administrador sintético | Downloads iniciam com nomes esperados e sem erro. | `browser-security.real.spec.ts`. |
| Caminhos desconhecidos sob `/admin`, `/mentor` e `/mentee` | HTTP, com e sem sessão sintética, query string e recarga | `Page404` do React permanece após reload; os três caminhos novos não fazem chamadas `/api/`. | `feature-visibility.spec.ts`, 27/27. |
| Rotas administrativas removidas e caminhos legados `/boot` e `/pre` | HTTP, visitante e sessão sintética, query string e recarga | `Page404` da aplicação após reload. | Casos existentes em `feature-visibility.spec.ts`, incluídos na mesma execução 27/27. |
| Tentativas de login com `X-Forwarded-For` forjado | HTTPS, mesma origem | Após o limite sintético ser atingido, a série inicial contém `429`; três endereços encaminhados diferentes continuam em `429`, sem contornar a cota. | `browser-security.real.spec.ts`. |
| Assets inexistentes e caminhos desconhecidos fora das rotas SPA reconhecidas | Política Nginx | Permanecem em `404`; assets são classificados antes do fallback restrito aos perfis. | `test_browser_security_policy.py`, 5/5. A configuração não transforma caminhos arbitrários em `index.html`. |

## RED, GREEN e REFACTOR

- **RED:** a primeira execução da jornada UI teve 14/27 aprovados e 13 falhas: o Nginx respondia com seu HTML genérico `404` antes de o React montar `Page404` em rotas de perfil desconhecidas e rotas removidas. Após habilitar fallback apenas para os três prefixos de perfil, a segunda execução ficou em 23/27; as quatro falhas restantes eram os dois caminhos legados `/boot` e `/pre` em contexto de visitante e sessão.
- **GREEN:** o Nginx agora encaminha caminhos desconhecidos dos perfis e os caminhos legados explícitos para `/index.html`, preservando a classificação antecipada de extensões estáticas e `404` para assets ausentes e caminhos alheios a essas rotas. A execução final passou 27/27. A composição HTTPS passou 6/6, incluindo origem, CSP, sessões, recuperação, exportações, limite e retorno da API.
- **REFACTOR:** o teste de navegação adiciona os três casos sintéticos por perfil e verifica ausência de chamadas à API, query string e reload. A política de publicação e seu teste estático documentam e limitam o fallback ao conjunto aprovado.

## Retorno, envelopes e proteções

A jornada integrada de retorno reiniciou o processo da API atual atrás do proxy. Depois do reinício, a sessão administrativa ativa continuou válida; a sessão revogada permaneceu `401`; o endereço reservado continuou em conflito `409`; o evento de auditoria permaneceu consultável; e a proteção de continuidade do último administrador continuou `409`. A sessão e os invariantes são conferidos pelo cenário `preserves session, administrator guard, email reservation and audit across API return`.

Os consumidores do envelope e os contratos de limite também passaram suas suites automatizadas locais: 1.021 testes frontend e 846 testes backend. A política estática confere separação das CSPs, respostas da borda, limites e classificação de caminhos. A composição atual não substitui a comparação com binários anteriores.

Há uma limitação explícita para retorno funcional a `c642854`: a evidência de Notificações e Auditoria encontrou que essa versão lê a flag coletiva legada e não preserva o estado individual de leitura durante rollback. A evidência de Contas e Sessões confirma jornadas de leitura autorizada nessa versão sobre o esquema atual, mas não garante as funcionalidades novas de notificações. Portanto, os testes desta T010 demonstram retorno após reiniciar a API atual e preservação de dados/auditoria; **não demonstram que `c642854` seja uma versão de rollback funcionalmente compatível**. Consulte [evidências de compatibilidade de Contas e Sessões](../seguranca-de-contas-e-sessoes/evidencias-compatibilidade.md) e [evidências de Notificações e Auditoria](../notificacoes-e-auditoria/evidencias-validacao.md). A incompatibilidade observada deve permanecer visível na avaliação de conclusão/rollback.

## Validação final

| Verificação | Resultado |
| --- | --- |
| `docker compose --project-name lab-solos-t010-api-proxy --file docker-compose-e2e.yml config --quiet` | Aprovada antes da composição HTTP. |
| `docker compose --project-directory . --project-name lab-solos-t010-api-proxy-security --file .tmp/t010-security-compose.yml config --quiet` | Aprovada com a sobreposição temporária de sub-rede. |
| `npm run test:e2e -- --project=ui e2e/feature-visibility.spec.ts` | 27/27. |
| `npm run test:e2e -- --project=security` | 6/6: cinco cenários de `browser-security.real.spec.ts` e um smoke HTTPS. |
| `python -m unittest discover -s .github/scripts/tests -p "test_browser_security_policy.py" -v` | 5/5. |
| `npm run test -- --run` | 158 arquivos; 1.021/1.021 testes. |
| `npm run lint` | Aprovado, sem avisos. |
| `npm run build` | Aprovado. Avisos de build preexistentes: `/env.js` sem `type="module"`, referência não resolvida a `public/images/laboratory.png` e bundles acima de 500 kB. |
| Suíte backend `dotnet test backend/Tests/Tests.csproj --configuration Release --artifacts-path .tmp/t010-backend-artifacts -p:RestoreLockedMode=true --logger "console;verbosity=minimal"` | 846/846 na execução T010 paralela de Notificações e Auditoria; nenhum código backend foi alterado por esta tarefa. |
| `git diff --check` | Aprovado; Git emitiu avisos de conversão CRLF para arquivos preexistentes, sem erro de whitespace. |
| Limpeza Docker | Confirmados zero containers, volumes, redes e imagens com prefixo do projeto T010; o Compose temporário foi removido. |

O build e os testes foram executados localmente. Nenhum proxy publicado, serviço externo ou produção foi consultado.
