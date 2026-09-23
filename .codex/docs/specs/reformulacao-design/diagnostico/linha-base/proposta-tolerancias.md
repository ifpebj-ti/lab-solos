# T001 — tolerâncias aceitas para comparação

## Alcance e confirmação

Em instrução explícita nesta conversa, Nathan autorizou assumir todas as confirmações humanas requeridas pelo plano, sem interromper a execução. Essa autorização global foi aplicada e registrada em 2026-09-23 à seleção dos quatro cenários da T001, às métricas abaixo e aos limites operacionais. Os percentuais a seguir são uma regra operacional escolhida para este plano sob essa autorização; não são números que Nathan tenha enunciado literalmente.

Prioridade igual para os quatro fluxos medidos: login do administrador, início do administrador, pesquisa do catálogo e criação de empréstimo por mentor. Não se altera a preferência já registrada por índice de amostras, tema claro/escuro ou exceção de código.

## Regra de comparação

Comparar medianas de cinco execuções seriais por cenário, no mesmo viewport (1440×900), navegador, protocolo de cache, fixture sintética e build identificado. A mediana da versão candidata não pode exceder:

- `navigationMs`, `readyMs` ou `actionMs`: **120%** da mediana de referência;
- soma dos headers `Content-Length`: **110%** da mediana de referência.

Comparar as mesmas métricas por cenário, sem compensar regressão de um fluxo com melhora de outro. O tamanho de `Resource Timing` é diagnóstico apenas: as rotas autenticadas são medidas após login de preparação e com cache aquecido, logo ativos atendidos do cache podem ter `transferSize` zero. Não usar esse campo como orçamento de bytes.

## Critérios funcionais e de erro

- Exigir 5/5 fluxos completos em cada cenário e os status esperados: rotas HTTP 200 e POST de criação HTTP 201.
- Não aceitar novas falhas de requisição, erros de página, 4xx/5xx ou erros de console alheios aos recursos 404 já catalogados.
- A linha de base já contém `404 /public/images/laboratory.png` e `404 /api/Usuarios/{id}/dependentes/aprovacao` (fixture de referência: `131211`), com frequência discriminada em `evidencias/T001/resultado-medicoes.md` e no JSON. O ID é sintético e varia por fixture. Para comparação, esses 404 só são tolerados sem aumento de frequência por cenário; corrigir/reduzir é melhora. Um endpoint ou ativo diferente com erro é regressão.
- Ajuda/assistência humana é observação qualitativa: o helper mede affordances visíveis, mas não instrumenta participação humana. Registrar `null` como não medido, nunca como ausência de necessidade de ajuda.

## Fonte e limitações

Referência: [`evidencias/T001/medicoes-head-8c2a8bd-2026-09-23.json`](../../evidencias/T001/medicoes-head-8c2a8bd-2026-09-23.json), commit informado `8c2a8bd173723b8b154aad03da2f511499fbb83b`. Os 404 são defeitos/ausências já existentes no baseline; as comparações seguintes devem preservá-los como contexto, não ocultá-los. Respostas sem `Content-Length`, assistência humana não instrumentada, hardware local e estado de cache devem acompanhar qualquer resultado.
