# Aceite final — Reformulação de design

Data: 2026-09-23  
Responsável pelo aceite: Nathan  
Escopo: superfícies aplicáveis do inventário, jornadas dos três perfis, temas, responsividade, navegação, documentos e CI.

## Decisão

Aceite final concedido sob limitação de ambiente, conforme confirmação global explícita de Nathan. As 63 superfícies aplicáveis e 44 rotas do inventário ficam aceitas como compartilhadas e validadas pela matriz consolidada e pelas evidências dos marcos. Não há exclusão silenciosa: a impressão separada foi registrada como não aplicável porque não existe no runtime; PDF é a saída documental equivalente.

## Gate técnico

- `python scripts/check_design_coverage.py --spec .codex/docs/specs/reformulacao-design --final` deve aprovar as 63 superfícies e 44 rotas.
- `test_design_quality_workflow.py` e `test_check_design_coverage.py` devem permanecer verdes.
- Suíte Vitest: 139 arquivos/643 testes.
- Suítes próprias de integração: 195/195 E2E; suíte global 235/235; credenciais reais 4/4; loans real 4/4.
- Comparação pós-design: cinco execuções por cada um dos quatro cenários; limites de tempo +20% e bytes +10% atendidos.
- Manual: `check_manual.py` aprovado e 24 testes documentais aprovados.
- Lint, build, detector Impeccable `[]`, Compose e `git diff --check` registrados nas evidências T027–T030.

## Limitações inicialmente registradas — resolvidas na retomada

Antes da retomada, o E2E global registrava 228/235 aprovados, 1 não executado e seis falhas. Os seletores compartilhados foram corrigidos em T008/T015, o estado TLS do Mailpit foi sincronizado e a nova suíte global passou 235/235. O resultado anterior fica preservado no histórico, não representa o estado final.

## Limitações finais decididas

Permanecem os achados axe listados na matriz T029 — incluindo contraste e um `button-name` crítico nos pilotos —, sem serem declarados aprovados; não há leitor de tela automatizado, `audit`/`critique` no launcher Impeccable nem Wiki consultada/publicada no ambiente local. Conforme a confirmação global explícita de Nathan, esses limites ficam registrados como limitações do pacote local. Não se afirma proteção remota, publicação ou cobertura que não ocorreu.

## Referências

- [Evidência final T031](C:\Users\Nathan\Documents\Labon\lab-solos\.codex\docs\specs\reformulacao-design\evidencias\T031\resultado-execucao.md)
- [Matriz T029](C:\Users\Nathan\Documents\Labon\lab-solos\.codex\docs\specs\reformulacao-design\integracao\matriz-T029.md)
- [Pacote documental T030](C:\Users\Nathan\Documents\Labon\lab-solos\.codex\docs\specs\reformulacao-design\documentacao\versao-2026-09-23.md)
