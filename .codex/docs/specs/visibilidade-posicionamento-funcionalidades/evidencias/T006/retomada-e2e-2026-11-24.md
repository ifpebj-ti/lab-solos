# T006 — Revalidação integrada E2E (2026-11-24)

## Resultado

- `npm run test:e2e:list`: 255 testes em 21 arquivos.
- `feature-visibility.spec.ts`: 27/27 testes aprovados.
- Suíte E2E completa: 255/255 testes aprovados; `.last-run.json` registra `status: passed` e `failedTests: []`.
- Vitest: 158 arquivos e 1.021/1.021 testes aprovados.
- Backend: 846/846 testes aprovados.
- Lint, build e `git diff --check` aprovados.

## Comando integrado

No PowerShell, a variável do projeto Compose precisa estar no processo que executa o Playwright:

```powershell
$env:E2E_COMPOSE_PROJECT = 'lab-solos-quality-e2e'
$env:SECURITY_E2E_HTTPS_PORT = '18443'
npm.cmd --prefix frontend run test:e2e -- --workers=1
```

A execução serial evita contenção entre Chromium e os builds locais. A composição principal e a composição de segurança ficaram ativas durante a suíte.

## Diagnóstico da tentativa anterior

A tentativa anterior iniciou os serviços sob `lab-solos-quality-e2e`, mas o Playwright sem `E2E_COMPOSE_PROJECT` selecionou o padrão `lab-solos-quality-t024` para os seeds. Os testes reais falharam antes das asserções porque o seed tentou usar o banco do projeto errado. Quatro casos de UI também excederam o timeout na execução concorrente; os casos passaram isolados e na execução serial completa.

## Isolamento e limpeza

A composição de segurança usou overlay temporário com a rede `172.16.240.0/24`, pois `172.29.0.0/16` já pertencia ao projeto local `lab-solos-quality-integrity-t011`. Ao fim, somente os projetos iniciados nesta validação foram desmontados, sem remover volumes. O overlay temporário foi removido e as redes T011 foram preservadas. Nenhuma operação foi feita no GitHub.

## Observação da auditoria visual

Os testes de caracterização do design imprimiram avisos axe de `button-name` e `color-contrast` em algumas telas. Esses testes passaram e os avisos não são falhas de T006; permanecem como observações das verificações de design já registradas pelos respectivos cenários.
