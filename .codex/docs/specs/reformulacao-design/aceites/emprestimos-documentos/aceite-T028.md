# Aceite T028 — Empréstimos e documentos

Data: 2026-09-23  
Escopo: revisão T025–T027, jornada criar → analisar → consultar → devolver, PDF, planilha e saída equivalente para impressão.

## Decisão

Aceito sob limitação de ambiente, com a confirmação global de Nathan aplicada. Não foi identificado bloqueante ou achado alto novo dentro do escopo. A jornada crítica real permanece protegida e os artefatos documentais são sintéticos, rastreáveis e legíveis.

## Evidências conferidas

- `critical/loans.spec.ts` no Compose: 4/4 testes reais aprovados, cobrindo solicitação, listagem, aprovação única, estoque, recusa, estoque insuficiente e perfil proibido.
- Cobertura progressiva: `python scripts/check_design_coverage.py --spec .codex/docs/specs/reformulacao-design` → 63 superfícies e 44 rotas verificadas.
- PDF curto de usuários: 1 página, identidade LabON, tabela e assinante.
- PDF longo de empréstimo: 2 páginas, 55 linhas sintéticas, continuidade tabular e assinatura sem página órfã.
- XLSX: aba, cabeçalhos, 7 linhas, valores e tipos reabertos semanticamente.
- A busca pelo contrato de impressão não encontrou `window.print`, ação “Imprimir” ou componente de impressão no produto; o PDF exportado é a saída documental equivalente existente e foi validado visualmente. Não foi inventado um fluxo ausente.

## Limitações registradas

O ambiente não disponibiliza as operações `audit`/`critique` do launcher Impeccable. O navegador registrou o aviso não bloqueante `Buffer is not defined` durante a página, mas os downloads concluíram. Os dados são fixtures sintéticas do Compose e os artefatos são evidências locais; não há sincronização de issue/Project nem publicação externa nesta entrega.

Referências: [evidência T028](C:\Users\Nathan\Documents\Labon\lab-solos\.codex\docs\specs\reformulacao-design\evidencias\T028\resultado-execucao.md), [artefatos T027](C:\Users\Nathan\Documents\Labon\lab-solos\.codex\docs\specs\reformulacao-design\evidencias\T027\resultado-execucao.md).
