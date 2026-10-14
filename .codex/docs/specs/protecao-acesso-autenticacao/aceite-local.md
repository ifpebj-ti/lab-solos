# Aceite local — proteção de acesso e autenticação

Data: 2026-10-13. Escopo: validação local até T029 e correções da PR #441. Este registro não comprova publicação nem substitui o aceite de T030.

## Resultado consolidado

O catálogo contém 44 IDs: 11 requisitos funcionais (RF-001 a RF-011), 5 requisitos não funcionais (RNF-001 a RNF-005) e 28 critérios (CA-001 a CA-028). A tabela agrupa cada ID pela issue de origem no PRD; RNFs e critérios de defesa em profundidade aparecem em mais de uma issue.

| Issue e IDs do PRD | Evidência local associada | Resultado local |
| --- | --- | --- |
| #436 — RF-001, RF-002, RF-003, RF-004; RNF-001, RNF-004; CA-001, CA-002, CA-003, CA-004, CA-005, CA-006, CA-007, CA-008, CA-026, CA-027 | Testes de autorização e contrato em T003, T008 e T011; perfil e mudança de e-mail em T012/T020; jornadas de autenticação em T025; teste cruzado de T029. Ver evidências T011, T012, T020, T025 e T029. | Contratos de backend/perfil e jornadas reais passaram. A revisão da PR #441 alinhou os cenários ao cadastro de Mentorado vinculado, preservou a cobertura administrativa e passou real 17/17, UI 222/222 e security 5/5. CA-027 permanece pendente de validação publicada. |
| #437 — RF-005, RF-006; RNF-001, RNF-002, RNF-003, RNF-004; CA-009, CA-010, CA-011, CA-012, CA-013, CA-025, CA-026, CA-027 | Cotas, configuração, telemetria e interface em T002, T009, T014, T016, T021 e T022; cenários reais de T025 e teste de esgotamento/limpeza concorrente de T029. | Evidência local aprovada: suíte backend 432/432, frontend 694/694, UI E2E 222/222 e segurança E2E 5/5. CA-027 continua pendente de validação publicada. |
| #438 — RF-007, RF-008, RF-009; RNF-001, RNF-002, RNF-003, RNF-004; CA-014, CA-015, CA-016, CA-017, CA-018, CA-019, CA-025, CA-026, CA-027 | Protetor, migrações, fila, workers, aliases, limite e ciclo de recuperação em T004, T006, T010 e T017–T019; fluxos reais em T025; contato, cancelamento de trabalho antigo, entrega, uso único e login após esgotamento em T029. | Fluxos locais aprovados com transporte SMTP simulado. Não há evidência de entrega SMTP de produção. CA-027 continua pendente de validação publicada. |
| #439 — RF-010; RNF-004, RNF-005; CA-020, CA-021, CA-026, CA-027, CA-028 | Inventário/política em T023, proxy real e navegador em T024/T026, job obrigatório em T027, manual e runbook em T028; projeto security de T029 passou 5/5. | CSP efetiva, bloqueios e jornadas locais passaram. CA-027 continua pendente de validar o deployment publicado. |
| #440 — RF-011; RNF-004, RNF-005; CA-022, CA-023, CA-024, CA-026, CA-027 | Política por ambiente e confiança no proxy em T013/T022, smoke de Caddy em T024 e navegador em T026; CORS de mesma origem, origens externas/nula e X-Forwarded-For forjado passaram no projeto security de T029 (5/5). | Evidência local aprovada. CA-027 continua pendente de validar o deployment publicado. |

### Catálogo dos 44 IDs

- Funcionais: RF-001, RF-002, RF-003, RF-004 (#436); RF-005, RF-006 (#437); RF-007, RF-008, RF-009 (#438); RF-010 (#439); RF-011 (#440).
- Não funcionais: RNF-001 (#436/#437/#438); RNF-002, RNF-003 (#437/#438); RNF-004 (#436–#440); RNF-005 (#439/#440).
- Aceitação: CA-001, CA-002, CA-003, CA-004, CA-005, CA-006, CA-007, CA-008 (#436); CA-009, CA-010, CA-011, CA-012, CA-013 (#437); CA-014, CA-015, CA-016, CA-017, CA-018, CA-019 (#438); CA-020, CA-021 (#439); CA-022, CA-023, CA-024 (#440); CA-025 (#437/#438); CA-026 (#436–#440); CA-027 (#436–#440); CA-028 (#439).

## Execução transversal original de T029

- Testes focados AuthenticationProtectionCrossFlowTests: 2/2.
- Solução backend: 432/432; build Release: 0 erros e 92 avisos.
- Frontend: 694/694 testes, 146 arquivos; lint e build passaram.
- Playwright: real 14/16; UI 222/222; security 5/5.
- As duas falhas originais de real eram expectativas incompatíveis em registration-approval.spec.ts: os testes registravam um Mentor e esperavam esse registro na lista de Mentorados pendentes do Mentor. O contrato da rota filtra para Mentorados vinculados. Os cenários foram alinhados ao contrato na revisão da PR #441, com aprovação administrativa coberta também; o resultado original fica preservado neste registro.
- As medições de T029 são uma única execução sintética: solicitação de recuperação 125,79 ms e 26 comandos PostgreSQL; worker cancelado 9,16 ms; entrega simulada 81,20 ms e 16 comandos PostgreSQL. Uma amostra não estabelece p95, SLO, capacidade de carga ou latência de SMTP de produção.
- Os projetos de navegador foram iniciados com nomes isolados lab-solos-auth-t029 e lab-solos-security-t029 e removidos com seus próprios volumes e redes. Outros recursos Docker foram preservados.

## Revisão local da PR #441

As correções de portabilidade, dependências, imagem, documentação, qualidade e seleção dos projetos E2E estão registradas em [correções de CI](evidencias/PR441/correcoes-ci.md). Backend 432/432, frontend 694/694, real 17/17, UI 222/222 e security 5/5 passaram localmente. A auditoria npm não encontrou vulnerabilidades e Trivy passou nas bases runtime amd64/arm64. Os cenários de cadastro agora seguem o contrato de Mentorado vinculado, preservando cobertura da gestão administrativa.

## Limites do aceite

Os testes locais e os checks da PR não substituem a validação do candidato publicado. CA-027 permanece pendente em todas as cinco issues até T030, que requer URL/versão publicada confirmada e contas dedicadas. As issues #436–#440 permanecem abertas enquanto esse aceite estiver pendente.
