# T004 — Ambiente

- Data: 2026-10-13.
- Repositório: `ifpebj-ti/lab-solos`; tarefa T004, issue #438, Project #41.
- Issue #438 foi conferida como `OPEN` e atribuída a `nathannmvr`. O orquestrador confirmou o item do Project #41 como `In Progress` antes do RED; não houve mutação externa durante esta tarefa.
- Ambiente local: Windows PowerShell, SDK .NET `8.0.419`. Docker/SMTP não são necessários para o teste unitário do protetor.
- CI verificada em `.github/workflows/container-ci.yml`: `backend-quality` roda em PR para `develop` e `merge_group`, restaura/constrói a solução e executa testes backend; o Quality gate exige `backend-quality`.
- Os únicos materiais de chave usados pelos testes são sintéticos; o leitor de arquivo de teste não acessa o filesystem.
