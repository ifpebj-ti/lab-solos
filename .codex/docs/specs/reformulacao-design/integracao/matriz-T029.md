# Matriz de integração T029

Retomada validada em 2026-09-23. A integração E2E global usa `lab-solos-quality-e2e`; a comparação de desempenho usa um Compose limpo e isolado, sem interromper o servidor local do usuário.

| Cruzamento | Cobertura | Resultado final |
|---|---|---|
| Navegação pós-sessão e retorno entre módulos | `post-auth-navigation.spec.ts` | 9/9 na suíte dirigida; incluída na global 235/235 |
| Temas, portais, teclado e PopoverInput | `design-system.spec.ts` | 7/7 na suíte dirigida; incluída na global 235/235 |
| Pilotos de perfis, temas e superfícies | `design-pilots.spec.ts` | 14/14; relatórios axe preservados abaixo |
| Rotas responsivas e estados de empréstimo/cadastro/produtos | `responsive-layout.spec.ts` | 165/165 na suíte dirigida; incluída na global 235/235 |
| Integração E2E completa | `npm.cmd --prefix frontend run test:e2e` | 235/235 aprovados, zero falhas e zero testes ignorados (4,1 min) |
| Viewports | 320, 375, 767, 768 e 1440 px | Exercitados pela suíte responsiva |
| Zoom e movimento reduzido | 5 repetições por largura em 100%/200%, `prefers-reduced-motion: reduce` | 50 amostras sem `scrollWidth` horizontal acima da área cliente |
| Desempenho vs T001 | Cinco repetições por cenário, protocolo/cache e viewport 1440×900 idênticos | 4/4 cenários dentro das tolerâncias: tempo máximo +20%; `Content-Length` máximo +10% |

## Comparação de desempenho

Percentuais comparam a mediana do build pós-design com a mediana de T001. Valores negativos significam redução.

| Cenário | Navegação | Pronto | Ação | Soma `Content-Length` |
|---|---:|---:|---:|---:|
| Login administrador | −59,7% | −23,6% | +1,0% | −0,2% |
| Início administrador | −59,0% | −10,5% | −10,5% | −12,0% |
| Catálogo administrador | −61,5% | −16,0% | −8,9% | −10,9% |
| Criação por mentor | −61,5% | −13,0% | +5,8% | −10,9% |

As cinco execuções de cada cenário concluíram todos os passos; as rotas responderam HTTP 200 e a criação respondeu HTTP 201. Não houve falhas de requisição nem erros de página. O padrão de 404 de dependentes variáveis por ID sintético caiu em login (4→3) e catálogo (1→0), e permaneceu igual em início (5) e criação (0); o 404 da imagem `laboratory.png` caiu em início (2→0), permaneceu em login (5) e não ocorreu nos demais cenários. Não foram observados endpoints/ativos 4xx novos.

## Acessibilidade e limitações explícitas

A suíte global aprovou, mas os pilotos continuam emitindo achados axe legados:

- catálogo do mentor, claro e escuro: `button-name` (critical) e `color-contrast` (serious);
- solicitações administrativas e histórico de mentor, claro e escuro: `color-contrast` (serious);
- login escuro em 320 px e 1440 px e acesso público escuro: `color-contrast` (serious).

Os achados estão expostos, não foram tratados como aprovação de contraste, e permanecem vinculados aos consumidores/proprietários nas evidências de suas tarefas. O launcher local não dispõe de leitor de tela automatizado; esse cruzamento permanece como limitação de ferramenta. Nenhuma falha de Playwright foi ocultada por esses avisos axe.
