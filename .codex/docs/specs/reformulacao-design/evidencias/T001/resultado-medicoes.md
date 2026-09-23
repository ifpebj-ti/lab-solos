# T001 — resultado da medição headless

## Estado

**Concluída na retomada de 2026-09-23, sob limitações explicitadas abaixo.** A tentativa de 2026-09-22 foi inconclusiva; a coleta posterior registrou 5 execuções válidas em cada um dos quatro cenários (20/20).

O resultado final está no artefato bruto [`medicoes-head-8c2a8bd-2026-09-23.json`](medicoes-head-8c2a8bd-2026-09-23.json). A confirmação global explícita de Nathan para aplicar confirmações pendentes do plano foi aplicada às quatro prioridades e às tolerâncias operacionais documentadas em `diagnostico/linha-base/proposta-tolerancias.md`; a aplicação e seu alcance foram registrados nesta retomada, em 2026-09-23. Issue/Project permanecem omitidos por autorização explícita.

## Tentativa inicial histórica — 2026-09-22

O helper preparado para a T001 continha quatro cenários, cada um com cinco execuções planejadas:

1. login de administrador;
2. início/home de administrador;
3. catálogo/pesquisa de materiais de administrador;
4. criação de empréstimo por mentor.

Para cada execução seriam coletados navegação, pronto, ação, contagem/status de respostas, bytes de `content-length`, bytes de `ResourceTiming`, falhas de requisição, erros HTTP, erros de página e console. Nenhum agregado foi emitido e nenhum número foi inferido.

## Falhas observadas nessa tentativa histórica

- O Chromium headless foi efetivamente lançado pelo Playwright.
- O log do navegador registrou repetidamente `Erro ao buscar notificações`, no bundle do frontend, aproximadamente a cada 15 s durante a janela observada. Este registro não atribui causalidade nem transforma o log em falha funcional conclusiva.
- Ao interromper o processo, o cleanup reportou `browserContext.close: Target page, context or browser has been closed`.
- A primeira tentativa falhou antes de iniciar o navegador por `ERR_UNSUPPORTED_ESM_URL_SCHEME`; o helper foi corrigido apenas para converter o caminho do módulo para `file://`.
- O processo foi interrompido pelo operador após o limite definido; não houve espera indefinida e não houve nova tentativa.

## Resultado inconclusivo daquela tentativa

| Cenário | Execuções válidas | Navegação | Pronto | Ação | Bytes | Bloqueios |
|---|---:|---|---|---|---|---|
| Login | 0/5 agregadas | não disponível | não disponível | não disponível | não disponível | processo sem saída no limite |
| Início/home | 0/5 agregadas | não disponível | não disponível | não disponível | não disponível | processo sem saída no limite |
| Catálogo | 0/5 agregadas | não disponível | não disponível | não disponível | não disponível | processo sem saída no limite |
| Criação | 0/5 agregadas | não disponível | não disponível | não disponível | não disponível | processo sem saída no limite |

Não há base para declarar mediana, p95, bytes médios ou tolerância numérica. Nenhum número foi inventado.

## Retomada e medições finais — 2026-09-23

O helper `medir-linha-base-head.mjs` executou na stack isolada `lab-solos-t001-baseline-head`, com build identificado pelo commit `8c2a8bd173723b8b154aad03da2f511499fbb83b`, viewport 1440×900, contextos novos por repetição, service workers bloqueados e login de preparação antes de medir rotas autenticadas. O worktree local estava sujo; a medição foi dirigida à stack isolada registrada, não ao Compose usado para servir a aplicação de teste do usuário. Foram concluídos todos os passos funcionais em cada repetição.

| Cenário | Execuções | Navegação (ms) | Pronto (ms) | Ação (ms) | Resource Timing (bytes, cache aquecido) | `Content-Length` somado (bytes) | Passos por execução |
|---|---:|---:|---:|---:|---:|---:|---:|
| Login administrador | 5/5 | 370,7 | 960,4 | 267,3 | 4.245.732 | 2.823.924 | 3/3 |
| Início administrador | 5/5 | 61,5 | 671,3 | 671,3 | 1.682 | 3.201.334 | 1/1 |
| Catálogo administrador | 5/5 | 65,9 | 705,5 | 15,4 | 344.767 | 3.163.576 | 1/1 |
| Criação por mentor | 5/5 | 64,6 | 688,6 | 1.259,2 | 344.767 | 3.163.059 | 7/7 |

As colunas temporais e de bytes são medianas das cinco repetições. `Resource Timing` é diagnóstico de bytes transferidos com sessão/cache aquecidos e não representa o total de bytes da aplicação; em especial, ativos atendidos do cache reduzem esse número. A soma de `Content-Length` é a referência de bytes para comparação, com respostas sem esse header detalhadas no JSON bruto.

### Bloqueios e conclusão funcional

- As quatro rotas responderam HTTP 200 nas cinco repetições; o POST de criação de empréstimo respondeu HTTP 201 em 5/5.
- Não houve falhas de requisição nem erros de página. A pesquisa encontrou o produto sintético, o login chegou ao portal esperado e os sete passos de criação foram concluídos.
- 404 preexistentes observados: `/public/images/laboratory.png` em login 5/5 e início 2/5; `/api/Usuarios/131211/dependentes/aprovacao` em login 4/5, início 5/5 e catálogo 1/5. Não apareceram no cenário de criação. O console registrou somente o erro genérico de recurso 404 correspondente. Esses achados ficam explicitamente na linha de base, não são tratados como ausência de erros.
- O helper contou zero affordances de ajuda visíveis; assistência humana não foi instrumentada (`humanAssistanceObserved: null`) e portanto não foi inferida.
- A stack SMTP podia conter certificado carregado desatualizado em relação ao volume regenerado; isso não foi parte desta medição de interface/linha de base. Na retomada T029, a discrepância foi diagnosticada e o serviço SMTP do Compose de qualidade foi reiniciado; a validação TLS passou.

Os valores de decisão e os limites aceitos para comparação futura estão na proposta de tolerâncias. Evidências completas por execução, respostas e contadores permanecem no JSON referenciado acima.
