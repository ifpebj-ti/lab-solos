# Evidências de validação — notificações e auditoria (T010)

- **Data:** 2026-11-23
- **Checkout de referência:** `c642854` (a execução usou o código local em andamento)
- **Ambiente:** composição descartável Docker Compose com PostgreSQL 15, API .NET 8.0.419, frontend React/Vite e contas/eventos sintéticos `E2E`; não houve sincronização remota.
- **Versões de ferramentas observadas:** Node.js 24.21.0, npm 11.19.0, Playwright 1.62.1.
- **Sanitização:** contas, títulos, mensagens, justificativas, tokens e chaves do ensaio são sintéticos. Nenhum valor de credencial foi incluído neste documento.

## Matriz executada

| Camada | Cenário | Resultado |
| --- | --- | --- |
| Playwright `ui` | Popover de notificações, marcar como lida, filtro de recurso, paginação mantendo filtro, exportação CSV sem contexto bruto, reclassificação com autor e histórico. | 1/1 aprovado. |
| Playwright `real` | Administrador emite avisos sintéticos; Mentor e Mentorado consultam lista/contador isolados; leitura individual não altera o outro destinatário; trilha de emissão, revisão, filtro e CSV minimizado; restart do backend; confirmação de leitura e histórico no PostgreSQL após o retorno. | 1/1 aprovado na execução T010 padrão. |
| Testes backend | `dotnet test backend/Tests/Tests.csproj --configuration Release --artifacts-path .tmp/t010-backend-artifacts -p:RestoreLockedMode=true --logger "console;verbosity=minimal"` | 846 aprovados, 0 falhas, 0 skips (3m55s). Foram emitidos avisos de advisories NuGet preexistentes. |
| Testes frontend | `npm run test -- --run` | 158 arquivos e 1021 testes aprovados. |
| Lint frontend | `npm run lint` | Aprovado, sem avisos. |
| Build frontend | `npm run build` | Aprovado. Avisos existentes: `/env.js` sem `type="module"`, referência não resolvida a `public/images/laboratory.png` e bundles acima de 500 kB. |

## Ensaio de retorno para a versão anterior

O ensaio foi feito numa segunda composição isolada, compartilhando somente o banco descartável do projeto `lab-sol-t010-compat`. A imagem anterior foi compilada a partir do commit `c642854`; sua inicialização registrou que nenhuma migração era pendente. Não foi executado rollback do esquema.

1. Com a API atual, foi criada uma notificação coletiva sintética para os destinatários habilitados. Antes da leitura, Mentor e Mentorado viam uma pendência cada.
2. O Mentor marcou a notificação como lida; o Mentorado permaneceu sem ler. A API atual mostrou contadores `0` e `1`, respectivamente. A emissão recebeu uma revisão de auditoria sintética (revisão 1).
3. A API do commit anterior foi inicializada sobre o mesmo esquema e executou apenas autenticação sintética e consultas GET de notificações/contadores. Ela mostrou a notificação como não lida para ambos e contadores `1` e `1`. Nenhuma operação antiga de escrita em notificação ou auditoria foi executada.
4. A API atual foi restaurada. Ela voltou a mostrar contadores `0` e `1`; a revisão 1, a única entrada de histórico e sua justificativa continuaram presentes.

**Resultado:** a persistência aditiva preservou a leitura individual e o histórico depois de restaurar a API atual. Porém, a versão em `c642854` não preserva a visualização do isolamento durante a janela de retorno: ela consulta o campo coletivo legado `Notificacao.Lida` e não representa a leitura por destinatário. Portanto, essa versão não pode ser considerada uma versão de rollback compatível para o requisito de isolamento. T010 permanece bloqueada quanto à aprovação de rollback para esse binário; a evidência comprova retorno dos dados, não compatibilidade funcional da versão anterior. O bloqueio requer uma versão de retorno que entenda `NotificacaoLeitura` e as revisões de auditoria.

## RED, GREEN e REFACTOR

- **RED:** a validação de retorno encontrou a divergência observável na API anterior: `1/1` pendente para ambos, embora o estado persistido fosse lido/não lido. A tentativa Playwright auxiliar com portas não padrão expirou porque a origem `18173` não constava na allowlist de CORS da composição; não é evidência de falha de produto e não alterou a configuração produtiva.
- **GREEN:** as jornadas UI e real padrão passaram; a verificação manual controlada confirmou isolamento e trilha na API atual e reconstituiu os estados após reinício/retorno.
- **REFACTOR:** os specs foram integrados aos projetos `ui` e `real`, reutilizando o cenário sintético e mantendo asserções nas fronteiras UI/API/persistência. Não houve alteração de código de produção nesta tarefa.

## Limites e limpeza

- O retorno foi exercitado contra o binário anterior `c642854`, não contra qualquer release publicada. O ensaio mostra a incompatibilidade de leitura dessa versão e não autoriza uma reversão operacional.
- A execução E2E padrão também comprovou persistência após reiniciar a API atual; isso, por si só, não comprova compatibilidade entre versões.
- A composição de compatibilidade foi encerrada com remoção dos containers, redes e volumes nomeados `lab-sol-t010-compat`. A execução Playwright auxiliar fora da porta padrão deixou um diretório de artefatos sintéticos ignorado por Git, pois a remoção foi bloqueada pela política automática do shell. O diretório é `frontend/e2e/infra/artifacts/test-results/notifications-audit.real-n-73350-leitura-após-retorno-da-API-real`.
