# T029 — Integração final entre módulos e desempenho comparado

## Resultado da rodada anterior — histórico

As quatro suítes próprias do cruzamento passaram 195/195; a suíte unitária, lint, build, cobertura progressiva e verificação de diff também passaram. A rodada E2E global daquela execução falhou, então este registro histórico não fecha a tarefa; ver a retomada final abaixo.

## Validação executada

- `npm.cmd --prefix frontend run test:e2e -- --project=ui design-system.spec.ts design-pilots.spec.ts responsive-layout.spec.ts post-auth-navigation.spec.ts` → 195 passed (3.1m).
- `npm.cmd --prefix frontend run test -- --run` → 139 arquivos e 641 testes aprovados.
- `npm.cmd --prefix frontend run lint` → aprovado.
- `npm.cmd --prefix frontend run build` → aprovado, com os avisos conhecidos de `/env.js`, imagem pública resolvida em runtime e chunks grandes dos exportadores lazy.
- `python scripts/check_design_coverage.py --spec .codex/docs/specs/reformulacao-design` → 63 superfícies e 44 rotas verificadas.
- `git diff --check` → aprovado, apenas avisos de conversão LF/CRLF do ambiente.
- Medição dedicada [measure-overflow.mjs](C:\Users\Nathan\Documents\Labon\lab-solos\.codex\docs\specs\reformulacao-design\evidencias\T029\measure-overflow.mjs) → 5 repetições por largura, zoom 100%/200% e movimento reduzido; `htmlScroll === client` em todas as 50 amostras.

## Limitações e retorno

O comando global `npm.cmd --prefix frontend run test:e2e` terminou com 228/235 aprovados, 1 não executado e 6 falhas. Cinco pertencem ao contrato compartilhado `feature-visibility` (menu/busca em viewport estreito e busca administrativa), já registrados como lacuna fora da posse T023. A sexta foi recuperação de credencial real com HTTP 500 no Mailpit/backend. As quatro suítes da T029 não reproduziram essas falhas. Não há leitor de tela automatizado disponível; essa dimensão fica registrada como limitação de ambiente. Os achados axe legados do catálogo, solicitações e históricos foram observados e preservados para seus proprietários, sem reescrita geral nesta tarefa.

## Referências

- [matriz de integração T029](C:\Users\Nathan\Documents\Labon\lab-solos\.codex\docs\specs\reformulacao-design\integracao\matriz-T029.md)
- [aceite T028](C:\Users\Nathan\Documents\Labon\lab-solos\.codex\docs\specs\reformulacao-design\aceites\emprestimos-documentos\aceite-T028.md)
- [evidência T027](C:\Users\Nathan\Documents\Labon\lab-solos\.codex\docs\specs\reformulacao-design\evidencias\T027\resultado-execucao.md)

## Retomada final — 2026-09-23

### RED / diagnóstico

- A auditoria encontrou 228/235 E2E aprovados, 1 não executado e 6 falhas históricas. T008 corrigiu seletores de menu e busca; T015 corrigiu o seletor acessível do menu de conta/logout.
- A nova rodada global, com `E2E_COMPOSE_PROJECT=lab-solos-quality-e2e`, inicialmente apresentou 233/235, com recuperação real de senha em HTTP 500. O log apontou `AuthenticationException`/`PartialChain`: o volume TLS havia sido regenerado sem recarregar o certificado no Mailpit já ativo.
- Antes da repetição final, o coordenador reiniciou somente o serviço SMTP do Compose de qualidade. A verificação TLS retornou `Verify return code: 0 (ok)`; backend, frontend, banco e dados do usuário não foram parados/recriados.
- Uma primeira medição pós-design no Compose compartilhado foi preservada em `medicoes-pos-design-2026-09-23.json`, mas não usada para aceite: o banco continha dados de outras execuções e não correspondia à fixture limpa T001; a home mostrou +12,5% em bytes de resposta. A medição válida foi repetida em um projeto isolado com banco novo.

### GREEN / resultado final

- Suíte E2E global `npm.cmd --prefix frontend run test:e2e`, com `E2E_COMPOSE_PROJECT=lab-solos-quality-e2e`: **235/235 aprovados**, zero falhas/ignorados, 4,1 min. Credenciais reais, menu/busca, navegação, responsividade e os demais consumidores passaram.
- Suítes próprias de integração: **195/195**; testes unitários globais: **139 arquivos/643 testes**; T015 dirigido após a correção: **4/4 E2E reais e 13 arquivos/93 testes**.
- `npm.cmd --prefix frontend run lint`: aprovado. `npm.cmd --prefix frontend run build`: aprovado. O build isolado usado na medição pós-design também concluiu; avisos conhecidos de `/env.js`, imagem resolvida em runtime e chunks grandes permanecem.
- `python scripts/check_design_coverage.py --spec .codex/docs/specs/reformulacao-design`: **63 superfícies/44 rotas**; `git diff --check`: aprovado, com avisos de conversão LF/CRLF.
- `measure-overflow.mjs`: 50/50 amostras sem rolagem horizontal em 320/375/767/768/1440 px, zoom de 100%/200% e movimento reduzido.
- Comparação válida, cinco execuções por quatro cenários, está em [`medicoes-pos-design-limpo-2026-09-23.json`](medicoes-pos-design-limpo-2026-09-23.json), contra a referência T001. Build isolado `lab-solos-quality-t029-post-design`, frontend `sha256:03813af7e082a793b83a8f645b018de6ca2dab6faa202888d7f59b859d03fa1e`, backend `sha256:7714e1c86e747085680512cc40daaa3e85b9ec5d2e2ff15935a590407bd2bddd`; worktree sujo sobre HEAD `8c2a8bd173723b8b154aad03da2f511499fbb83b`. Fixture `t029-post-design`, viewport e protocolo de cache iguais aos da linha de base.
- Após coleta, os Compose temporários `lab-solos-quality-t029-post-design` e `lab-solos-t001-baseline-head` foram encerrados com `docker compose down` sem `-v`; seus volumes nomeados foram preservados. O Compose principal `lab-solos-quality-e2e` permaneceu ativo para teste local.
- Os quatro cenários ficaram dentro dos limites aceitos: tempo mediano máximo +20%, `Content-Length` máximo +10%. Navegação caiu 59,0–61,5%; prontidão caiu 10,5–23,6%; ação variou de −10,5% a +5,8%; bytes de resposta caíram 0,2–12,0%. Sem falhas de requisição/erros de página nem 4xx/5xx novos; frequências dos 404s catalogados não aumentaram.
- Matriz final e achados axe legados estão em [`matriz-T029.md`](../../integracao/matriz-T029.md). Achados de contraste/nome acessível não são declarados aprovados; estão listados para seus proprietários. Não há leitor de tela automatizado no ambiente.

### REFACTOR / conclusão

A matriz separa as falhas históricas das validações finais, registra o comparativo reproduzível e mantém visíveis os achados axe e a limitação de leitor de tela. T029 está concluída sob limitações documentadas; T030 é liberada pelo DAG. Nenhum código de produção foi alterado nesta retomada de integração e nenhum commit/publicação foi feito.
