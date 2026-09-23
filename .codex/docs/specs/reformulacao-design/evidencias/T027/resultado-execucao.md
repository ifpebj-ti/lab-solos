# T027 — Exportações de empréstimos e usuários

## Resultado

Status: concluída sob limitação de ambiente. A implementação mantém PDF e Excel como ações sob demanda, preserva contratos de dados e registra falhas no catálogo de erros. O aceite global de Nathan foi aplicado conforme a autorização do plano.

## Entrega

- `LoanHistory` e `RegisteredUsers` não carregam `@react-pdf/renderer`, `exceljs` ou `file-saver` no carregamento inicial; os módulos são importados somente ao acionar a exportação.
- Controles de PDF/Excel são acessíveis, têm estado de processamento e preservam nomes, colunas, valores e tipos esperados.
- Fontes PDF usam os caminhos públicos servidos pelo frontend; documentos longos não dividem a assinatura entre páginas.
- Falhas de exportação passam por `presentError`/`OPERATION_IDS` e continuam apresentando feedback ao usuário.

## Validação

- Testes dirigidos: 6 arquivos, 26 testes aprovados.
- Inventário de erros + páginas: 6 arquivos, 29 testes aprovados.
- Suíte geral: 139 arquivos, 641 testes aprovados.
- `npm.cmd --prefix frontend run lint`: aprovado.
- `npm.cmd --prefix frontend run build`: aprovado; permaneceram apenas os avisos conhecidos de `/env.js` sem `type="module"` e de `public/images/laboratory.png` resolvida em runtime.
- `git diff --check`: aprovado, com os avisos de conversão de fim de linha já existentes.
- Detector Impeccable: `[]`. As operações `audit`/`critique` não estavam disponíveis no launcher instalado e essa limitação permanece registrada.
- Compose E2E reconstruído com `--wait`: backend, frontend, banco e SMTP saudáveis.
- Playwright real contra o Compose gerou `usuarios.xlsx`, `usuarios_cadastrados.pdf` e `emprestimo_longo.pdf` sem erro bloqueante; o aviso de `Buffer is not defined` observado no navegador não impediu os downloads.
- XLSX reaberto semanticamente com ExcelJS: aba `Usuários Cadastrados`, 5 cabeçalhos esperados, 7 linhas de dados, primeira/última linha preservadas e tipos `string,string,string,string,number`.
- PDF validado com pypdf/PyMuPDF: documento de usuários com 1 página; empréstimo longo com 2 páginas, marca LabON, assinante e 55 marcadores sintéticos `E2E Product`; páginas renderizadas e inspecionadas visualmente.

Os cenários usaram dados sintéticos no Compose; o PDF longo usou fixture sintética interceptada para validar paginação. Não havia diretório `src/exports` aplicável, portanto os exportadores permaneceram junto aos consumidores existentes.

## Artefatos

- [usuarios.xlsx](C:\Users\Nathan\Documents\Labon\lab-solos\.codex\docs\specs\reformulacao-design\evidencias\T027\usuarios.xlsx)
- [usuarios_cadastrados.pdf](C:\Users\Nathan\Documents\Labon\lab-solos\.codex\docs\specs\reformulacao-design\evidencias\T027\usuarios_cadastrados.pdf)
- [emprestimo_longo.pdf](C:\Users\Nathan\Documents\Labon\lab-solos\.codex\docs\specs\reformulacao-design\evidencias\T027\emprestimo_longo.pdf)
- [usuarios_cadastrados-page-1.png](C:\Users\Nathan\Documents\Labon\lab-solos\.codex\docs\specs\reformulacao-design\evidencias\T027\rendered\usuarios_cadastrados-page-1.png)
- [emprestimo_longo-page-1.png](C:\Users\Nathan\Documents\Labon\lab-solos\.codex\docs\specs\reformulacao-design\evidencias\T027\rendered\emprestimo_longo-page-1.png)
- [emprestimo_longo-page-2.png](C:\Users\Nathan\Documents\Labon\lab-solos\.codex\docs\specs\reformulacao-design\evidencias\T027\rendered\emprestimo_longo-page-2.png)
