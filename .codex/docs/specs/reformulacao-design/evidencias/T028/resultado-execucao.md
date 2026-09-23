# T028 — Evidência de aceite de empréstimos e documentos

## Resultado

Concluída sob limitação de ambiente. A onda foi revisada com a confirmação humana global já concedida; T029 está liberada pelo DAG.

## RED → GREEN → REFACTOR

- RED: conferidos os diretórios de aceite/evidência, a cobertura e a presença de saída documental. Não existe contrato de impressão implementado no produto.
- GREEN: `critical/loans.spec.ts` passou no Compose real (4/4) e a matriz passou no modo progressivo (63 superfícies, 44 rotas).
- REFACTOR: o aceite aponta para artefatos T027 existentes, sem duplicar PDFs/XLSX sintéticos.

## Jornada e documentos

Solicitar, analisar/aprovar ou recusar, consultar histórico/detalhe e devolver foram exercitados nos cenários reais de empréstimos e nas validações de T025–T026. As exportações de PDF e Excel de T027 foram reabertas e inspecionadas: o PDF de usuários tem 1 página; o PDF longo tem 2 páginas, tabela contínua e assinatura preservada; a planilha mantém aba, cabeçalhos, valores e tipos. Como não há `window.print`, botão ou componente “Imprimir” no código, a saída PDF é registrada como a alternativa documental implementada, sem alegar cobertura de uma ação inexistente.

## Comandos

```text
npm.cmd --prefix frontend run test:e2e -- --project=real critical/loans.spec.ts
4 passed (18.9s)

python scripts/check_design_coverage.py --spec .codex/docs/specs/reformulacao-design
OK (progressivo): 63 superfícies e 44 rotas verificadas.
```

## Referências

- [aceite T028](C:\Users\Nathan\Documents\Labon\lab-solos\.codex\docs\specs\reformulacao-design\aceites\emprestimos-documentos\aceite-T028.md)
- [evidência T027 e artefatos](C:\Users\Nathan\Documents\Labon\lab-solos\.codex\docs\specs\reformulacao-design\evidencias\T027\resultado-execucao.md)
- [emprestimo_longo.pdf](C:\Users\Nathan\Documents\Labon\lab-solos\.codex\docs\specs\reformulacao-design\evidencias\T027\emprestimo_longo.pdf)
- [usuarios_cadastrados.pdf](C:\Users\Nathan\Documents\Labon\lab-solos\.codex\docs\specs\reformulacao-design\evidencias\T027\usuarios_cadastrados.pdf)
- [usuarios.xlsx](C:\Users\Nathan\Documents\Labon\lab-solos\.codex\docs\specs\reformulacao-design\evidencias\T027\usuarios.xlsx)
