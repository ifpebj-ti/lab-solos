# T031 — Aceite final e cobertura integral

## Resultado histórico anterior à retomada T029

Concluída sob limitação de ambiente. A decisão humana global foi registrada em [aceite-final-2026-09-23.md](C:\Users\Nathan\Documents\Labon\lab-solos\.codex\docs\specs\reformulacao-design\aceites\final\aceite-final-2026-09-23.md). O inventário exige evidência e decisão em todas as 63 superfícies; deploy, publicação e sincronização externa continuam fora do escopo.

## Evidências consolidadas

- T027: exportações PDF/Excel lazy, PDFs renderizados e XLSX reaberto semanticamente.
- T028: `critical/loans.spec.ts` real 4/4 e cobertura progressiva 63/44.
- T029: suítes próprias 195/195, suíte unitária 139/641, lint/build e 50 amostras de overflow sem rolagem horizontal.
- T030: manual aprovado, sistema visual documentado e 24 testes documentais aprovados.
- `python scripts/check_design_coverage.py --spec .codex/docs/specs/reformulacao-design --final` → `OK (final): 63 superfícies e 44 rotas verificadas.`
- `test_design_quality_workflow.py` → 3 testes aprovados.
- `test_check_design_coverage.py` → 11 testes aprovados.
- `python .github/scripts/check_manual.py --source docs/manual` → manual aprovado.
- O job `frontend-quality` agora exige `--final`; o teste de contrato confirma esse comando.

## Limitações

O E2E global e as operações `audit`/`critique`, leitor de tela e Wiki permanecem exatamente como descritos no aceite final. O `--final` ficou verde após a matriz receber as referências explícitas, sem alterar o histórico das falhas.

## Retomada final do aceite técnico — 2026-09-23

- A T029 foi retomada após as falhas globais históricas. Os contratos E2E de menu/busca e logout foram alinhados aos nomes acessíveis atuais; o Mailpit voltou a apresentar cadeia TLS válida após reinício apenas do serviço SMTP.
- `npm.cmd --prefix frontend run test:e2e` com `E2E_COMPOSE_PROJECT=lab-solos-quality-e2e` → **235/235 aprovados**, zero ignorados, 4,1 min.
- Testes unitários globais mais recentes: **139 arquivos/643 testes aprovados**; T015 dirigido: **13 arquivos/93 testes** e fluxo real de credenciais **4/4**.
- Quatro suítes T029: **195/195**; `lint` e `build` aprovados; cobertura progressiva `63 superfícies/44 rotas`; overflow **50/50**.
- Repetição de desempenho limpa em T029: 5 execuções por cenário; os quatro cenários respeitaram +20% em medianas de tempo e +10% em `Content-Length` (reduções de bytes entre 0,2% e 12,0%). Ver `evidencias/T029/medicoes-pos-design-limpo-2026-09-23.json` e `integracao/matriz-T029.md`.
- `python scripts/check_design_coverage.py --spec .codex/docs/specs/reformulacao-design --final` → `OK (final): 63 superfícies e 44 rotas verificadas`.
- `test_design_quality_workflow.py` → 3 testes aprovados; `test_check_design_coverage.py` → 11 testes aprovados. O job `frontend-quality` mantém a exigência `--final`.
- Manual/documentos T030 continuam aprovados: `check_manual.py` e 24 testes documentais segundo sua evidência existente; não houve alteração de manual nesta retomada.

## Limitações finais mantidas visíveis

As falhas E2E históricas foram corrigidas e não são apresentadas como limitações atuais. Permanecem os achados axe explícitos na matriz T029 (contraste e um `button-name` crítico nos pilotos) e a indisponibilidade de leitor de tela, `audit`/`critique` e Wiki no ambiente local. Esses achados não foram reclassificados como aprovação técnica; o aceite global autorizado por Nathan os mantém como limitações documentadas do pacote local. Deploy, publicação e sincronização externa continuam fora do escopo.
