# Pendências de vulnerabilidades

## Histórico do bloqueio operacional T014 — resolvido em 2026-08-11

A esteira funcional ficou verde para backend, frontend, testes Python e validação deste documento, e a imagem Docker de T011 foi confirmada pelo digest `sha256:b3875533000b07fa05df4dc728519b43c438426c2add138a5a031df819ff34c1`. A primeira fotografia local não pôde ser consolidada porque `collect --sources npm,nuget` rejeitou a saída NuGet limpa sem `frameworks`. T003 corrigiu esse contrato; na retomada, 33/33 testes passaram e a coleta real retornou `normalized=8 policy_exit=0`. O histórico é preservado sem converter indisponibilidade em falso zero.

Contexto da execução: branch `develop`, `HEAD` `d6e01b42216e8f79bb86ce56ab80ce74ce120530`, worktree dirty autorizado. O Dependabot de `main` não foi consultado nem reconciliado, e nenhuma execução real do workflow em PR foi alegada.

## Reconciliação 2026-08-11T03:14:28Z

Não há exceções nem riscos sem decisão nesta linha de base. GHSA-2m69-gcr7-jv3q não possui patch publicado e será remediada removendo `Microsoft.EntityFrameworkCore.Sqlite` em T006. O agregado local `LOCAL-86444` preserva a indicação `fixAvailable=true` do npm como correção disponível, com atualização de `react-router-dom` planejada em T009; nenhum dos dois foi convertido em falso zero.

| id | estado | justificativa | mitigacao | risco_residual | responsavel | revisar_em |
|---|---|---|---|---|---|---|
| — | nenhum | — | — | — | — | — |

## Fotografia 2026-08-11T03:06:33Z

| id | estado | justificativa | mitigacao | risco_residual | responsavel | revisar_em |
|---|---|---|---|---|---|---|
| — | nenhum | — | — | — | — | — |

## Fotografia 2026-08-11T03:14:28Z

| id | estado | justificativa | mitigacao | risco_residual | responsavel | revisar_em |
|---|---|---|---|---|---|---|
| — | nenhum | — | — | — | — | — |

## Fotografia 2026-08-11T03:55:39Z

| id | estado | justificativa | mitigacao | risco_residual | responsavel | revisar_em |
|---|---|---|---|---|---|---|
| — | nenhum | — | — | — | — | — |

## Fotografia 2026-08-11T03:56:03Z

Fontes locais npm e NuGet coletadas no checkout `develop`; NuGet sem achados. O Dependabot de `main` não foi coletado nem reconciliado nesta fotografia e permanece reservado à T015 após promoção externa.

- `futuro-router-v7`: 3 advisories, dependência raiz `react-router-dom`, exige migração major isolada.
- `futuro-exceljs`: 2 registros, dependência raiz `exceljs`, exige caracterização de exportação e decisão de upgrade ou substituição.
- `futuro-toolchain-patch`: 3 advisories, patches de PostCSS, YAML e Babel a validar juntos com a esteira frontend.

| id | estado | justificativa | mitigacao | risco_residual | responsavel | revisar_em |
|---|---|---|---|---|---|---|
| LOCAL-55202 | pendente | O npm recomenda ExcelJS 3.4.0 para eliminar o agregado, o que seria downgrade funcional da raiz 4.4.0 e exige caracterização própria. | Manter exportações restritas a dados da aplicação e planejar avaliação isolada de upgrade ou substituição da raiz. | Vulnerabilidade moderada permanece no processamento de planilhas até existir caminho compatível validado. | nathannmvr | 2026-09-30 |
| GHSA-337j-9hxr-rhxg | pendente | A correção disponível exige React Router 7.18.2 e migração major fora deste slug. | Manter a aplicação cliente sem hidratação SSR e preservar testes de rota conhecida e fallback antes da migração. | Injeção de construtor permanece possível se hidratação SSR não confiável for introduzida. | nathannmvr | 2026-09-30 |
| GHSA-wrjc-x8rr-h8h6 | pendente | A correção disponível exige React Router 7.18.2 e migração major fora deste slug. | Usar somente destinos de navegação controlados pela aplicação e manter caracterização de rotas. | Redirecionamento externo inesperado permanece possível se caminhos não confiáveis forem aceitos. | nathannmvr | 2026-09-30 |
| GHSA-w5hq-g745-h8pq | pendente | UUID 8.3.2 vem de ExcelJS 4.4.0; a sugestão automática é downgrade da raiz e não uma atualização compatível. | Não fornecer buffers externos às rotinas UUID e avaliar upgrade ou substituição de ExcelJS em lote isolado. | Falta de validação de limites permanece caso a API UUID transitiva receba buffer controlado externamente. | nathannmvr | 2026-09-30 |
| GHSA-48c2-rrv3-qjmp | pendente | YAML 2.7.0 é transitivo de Tailwind/PostCSS e a correção 2.8.3 deve ser validada com todo o toolchain. | Processar apenas configurações YAML versionadas e agendar patch compatível com testes, lint e build. | Stack overflow permanece possível para YAML profundamente aninhado caso entrada não confiável seja adicionada ao build. | nathannmvr | 2026-08-31 |
| GHSA-fxqj-rqcc-2cmp | pendente | PostCSS 8.5.23 é patch disponível, mas a T012 é documental e não pode alterar manifesto ou lockfile. | Não processar source maps controlados externamente e aplicar o patch no próximo lote seguro de toolchain. | Leitura de arquivo por sourceMappingURL permanece possível durante build com entrada CSS não confiável. | nathannmvr | 2026-08-31 |
| GHSA-jjmj-jmhj-qwj2 | pendente | A correção disponível exige React Router 7.18.2 e migração major fora deste slug. | Manter links e destinos derivados de rotas internas controladas e preservar os testes de roteamento. | Redirecionamento aberto com impacto de XSS permanece possível se destinos não confiáveis forem introduzidos. | nathannmvr | 2026-09-30 |
| GHSA-4x5r-pxfx-6jf8 | pendente | Babel 7.26.10 é transitivo de @vitejs/plugin-react e deve ser atualizado pela raiz do plugin. | Compilar somente fontes e source maps versionados; planejar patch da raiz com npm ci, testes, lint e build. | Leitura arbitrária de arquivo permanece possível no build se sourceMappingURL não confiável for processado. | nathannmvr | 2026-08-31 |

## Fotografia 2026-08-11T12:59:58Z

Coleta local final de T014 no mesmo branch/HEAD e worktree dirty autorizado: npm e NuGet coletados, NuGet sem achados e política crítica/alta satisfeita. Os oito riscos baixos/moderados mantêm a classificação, mitigação, responsável e revisão definidas em T012. Dependabot de `main` não foi consultado nem reconciliado.

| id | estado | justificativa | mitigacao | risco_residual | responsavel | revisar_em |
|---|---|---|---|---|---|---|
| LOCAL-55202 | pendente | O npm recomenda ExcelJS 3.4.0 para eliminar o agregado, o que seria downgrade funcional da raiz 4.4.0 e exige caracterização própria. | Manter exportações restritas a dados da aplicação e planejar avaliação isolada de upgrade ou substituição da raiz. | Vulnerabilidade moderada permanece no processamento de planilhas até existir caminho compatível validado. | nathannmvr | 2026-09-30 |
| GHSA-337j-9hxr-rhxg | pendente | A correção disponível exige React Router 7.18.2 e migração major fora deste slug. | Manter a aplicação cliente sem hidratação SSR e preservar testes de rota conhecida e fallback antes da migração. | Injeção de construtor permanece possível se hidratação SSR não confiável for introduzida. | nathannmvr | 2026-09-30 |
| GHSA-wrjc-x8rr-h8h6 | pendente | A correção disponível exige React Router 7.18.2 e migração major fora deste slug. | Usar somente destinos de navegação controlados pela aplicação e manter caracterização de rotas. | Redirecionamento externo inesperado permanece possível se caminhos não confiáveis forem aceitos. | nathannmvr | 2026-09-30 |
| GHSA-w5hq-g745-h8pq | pendente | UUID 8.3.2 vem de ExcelJS 4.4.0; a sugestão automática é downgrade da raiz e não uma atualização compatível. | Não fornecer buffers externos às rotinas UUID e avaliar upgrade ou substituição de ExcelJS em lote isolado. | Falta de validação de limites permanece caso a API UUID transitiva receba buffer controlado externamente. | nathannmvr | 2026-09-30 |
| GHSA-48c2-rrv3-qjmp | pendente | YAML 2.7.0 é transitivo de Tailwind/PostCSS e a correção 2.8.3 deve ser validada com todo o toolchain. | Processar apenas configurações YAML versionadas e agendar patch compatível com testes, lint e build. | Stack overflow permanece possível para YAML profundamente aninhado caso entrada não confiável seja adicionada ao build. | nathannmvr | 2026-08-31 |
| GHSA-fxqj-rqcc-2cmp | pendente | PostCSS 8.5.23 é patch disponível, mas a T012 é documental e não pode alterar manifesto ou lockfile. | Não processar source maps controlados externamente e aplicar o patch no próximo lote seguro de toolchain. | Leitura de arquivo por sourceMappingURL permanece possível durante build com entrada CSS não confiável. | nathannmvr | 2026-08-31 |
| GHSA-jjmj-jmhj-qwj2 | pendente | A correção disponível exige React Router 7.18.2 e migração major fora deste slug. | Manter links e destinos derivados de rotas internas controladas e preservar os testes de roteamento. | Redirecionamento aberto com impacto de XSS permanece possível se destinos não confiáveis forem introduzidos. | nathannmvr | 2026-09-30 |
| GHSA-4x5r-pxfx-6jf8 | pendente | Babel 7.26.10 é transitivo de @vitejs/plugin-react e deve ser atualizado pela raiz do plugin. | Compilar somente fontes e source maps versionados; planejar patch da raiz com npm ci, testes, lint e build. | Leitura arbitrária de arquivo permanece possível no build se sourceMappingURL não confiável for processado. | nathannmvr | 2026-08-31 |
