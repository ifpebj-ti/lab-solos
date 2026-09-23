# Decisões de execução — reformulação de design

## T001 — tentativa inicial histórica (2026-09-22)

- Escopo executado: somente linha de base, inventário e tentativa de medição headless da T001.
- Issue/Project: sincronização omitida por autorização explícita do usuário para continuar sem issue/Project. Nenhuma tentativa de acesso, criação, atualização ou sincronização foi feita.
- Ambiente: stack E2E em `http://127.0.0.1:4173`, Chromium Playwright 1.62.1, dados sintéticos do seed `t001-baseline`.
- Resultado técnico: stack saudável e seed concluído; inventário estático reproduzível; medição headless não concluiu e não produziu números após o limite de aproximadamente 60 s.
- RED observado: primeira execução do helper falhou com `ERR_UNSUPPORTED_ESM_URL_SCHEME` por import ESM de caminho Windows. O helper foi corrigido dentro da evidência T001. A segunda execução iniciou Chromium, mas foi interrompida por ausência de progresso e terminou com erro de cleanup `browserContext.close: Target page, context or browser has been closed`.
- Exceção documental: como T001 é linha de base/documentação, foi usado um helper de evidência e registro de comandos em vez de alteração de produto; não houve RED-GREEN-REFACTOR de código de produção.
- Visual: nenhuma decisão foi inventada ou alterada; permanecem preservados Index of samples, temas claro/escuro e exceção de código previstos nos documentos de especificação.
- Tolerâncias: proposta registrada, sem números inventados, aguardando confirmação humana.
- Aprovação de Nathan: pendente naquela tentativa; a confirmação global posterior ainda não havia sido recebida.
- Estado ao fim daquela tentativa: bloqueada. A retomada abaixo substitui esse estado final, preservando este histórico.

## T001 — retomada e aceite operacional (2026-09-23)

- A instrução explícita de Nathan para assumir todas as confirmações necessárias, concluir as tarefas e prosseguir sem issue/Project foi aplicada a T001. Alcance registrado: quatro cenários do plano, medições de navegação/pronto/ação/bytes, critérios funcionais e limites relativos documentados em `diagnostico/linha-base/proposta-tolerancias.md`.
- Linha de base: 5/5 em cada cenário (20/20); build isolado identificado pelo commit `8c2a8bd173723b8b154aad03da2f511499fbb83b`; viewport 1440×900; dados sintéticos. Medianas e 404s conhecidos estão em `evidencias/T001/resultado-medicoes.md` e no JSON bruto associado.
- Tolerâncias operacionais aplicadas: no máximo +20% nas medianas de navegação, pronto e ação; no máximo +10% na soma de `Content-Length`; nenhum erro novo nem aumento de frequência dos 404s catalogados. Os limites foram selecionados pelo agente sob a autorização global do usuário, não apresentados como percentuais literais ditados por Nathan.
- A assistência humana não foi instrumentada; a limitação permanece explícita e não bloqueia a linha de base. Issue/Project omitidos por autorização explícita; nenhum código de produção alterado.
- Estado: concluída sob limitação documentada de `Resource Timing` com cache aquecido, respostas sem `Content-Length`, assistência não instrumentada e 404s preexistentes.
