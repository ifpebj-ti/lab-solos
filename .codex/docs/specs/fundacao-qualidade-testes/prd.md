# PRD: Fundação de qualidade e testes críticos

- Status: pronto
- Responsável: não definido
- Atualizado em: 2026-08-04
- Validação de descoberta: confirmada
- Issues relacionadas: #227, #237

## Contexto e problema

Os fluxos críticos têm cobertura insuficiente e os sinais de manutenibilidade/confiabilidade não possuem linha de base reproduzível. Hoje há quatro testes xUnit, um deles falha, `backend/backend.sln` não inclui `Tests.csproj`, o frontend não possui executor de testes e o lint de `src` reporta 21.845 avisos.

## Objetivo e métricas de sucesso

Criar validações pré-merge reproduzíveis e uma pirâmide mínima de testes. Sucesso: 100% das validações definidas executam em PR para `develop`; fluxos críticos selecionados têm casos positivos e negativos; achados altos da linha de base são corrigidos ou bloqueiam merge; médios/baixos viram uma lista de pendências rastreável.

## Usuários e jornadas

Mantenedores executam validações localmente e em CI; usuários finais ganham proteção contra regressões em autenticação, cadastro/aprovação, senha e empréstimos.

## Escopo

### Incluído

- Corrigir/estabilizar a infraestrutura de testes xUnit e incluí-la na solução.
- Adicionar Vitest/Testing Library e Playwright.
- Criar linha de base por módulo para maintainability/reliability e corrigir achados altos.
- Adicionar CI pré-merge para `develop`.

### Fora de escopo

- Zerar todos os avisos históricos em um único ciclo.
- Cobertura integral do produto ou refatorações sem achado mensurável.

## Requisitos funcionais

### RF-001 — Suíte crítica reproduzível

O time deve executar testes automatizados de sucesso e erro para autenticação, cadastro/aprovação, recuperação/troca de senha e empréstimos.

### RF-002 — Linha de base acionável

O repositório deve produzir um inventário por módulo/severidade, corrigir achados altos e registrar uma lista de pendências para os demais.

### RF-003 — Validação pré-merge

PRs para `develop` devem executar lint, compilação e testes afetados antes do merge.

## Requisitos não funcionais

### RNF-001 — Reprodutibilidade

Os comandos locais e de CI devem usar versões fixadas em manifestos/arquivos de bloqueio e produzir o mesmo resultado.

### RNF-002 — Tempo e diagnóstico

Falhas devem identificar suíte e cenário; jobs independentes devem executar em paralelo quando não compartilham estado.

## Critérios de aceitação

### CA-001 — Fluxos críticos (RF-001)

- Dado um checkout limpo
- Quando as suítes xUnit, Vitest e Playwright são executadas
- Então os cenários críticos definidos apresentam resultados determinísticos e falhas acionáveis

### CA-002 — Qualidade priorizada (RF-002, RNF-002)

- Dada a linha de base coletada
- Quando os achados são classificados
- Então todos os altos são corrigidos ou explicitamente bloqueiam a conclusão, e os médios/baixos possuem uma lista de pendências

### CA-003 — Proteção de develop (RF-003, RNF-001)

- Dado um PR destinado a `develop`
- Quando código afetado é enviado
- Então as validações relevantes executam antes da possibilidade de merge

## Estratégia de validação

Caracterizar primeiro os quatro testes existentes e a linha de base do lint; observar RED nos novos cenários, GREEN pela menor mudança e REFACTOR com as mesmas suítes. Validar o fluxo de trabalho por lint/sintaxe e PR de teste.

## Dependências e riscos

Depende de ambiente E2E isolado e dados determinísticos. O volume de avisos pode esconder sinais reais; a validação deve impedir novas violações enquanto a lista de pendências histórica é reduzida.

## Suposições

- Playwright cobrirá somente essenciais crítico neste ciclo.
- Achados altos serão definidos pela ferramenta escolhida e evidência reproduzível.

## Perguntas abertas

Nenhuma bloqueante.

## Decisões da validação de descoberta

| Decisão | Recomendação | Resposta confirmada | Impacto |
|---|---|---|---|
| Alcance de #237 | Linha de base + altos; lista de pendências para os demais | Confirmado | Evita refatoração global não verificável |
| Pirâmide | xUnit + Vitest/RTL + Playwright essenciais | Confirmado | Exige infraestrutura de testes frontend/E2E |
| CI | Validar PR para `develop`; entrega em `main` | Confirmado | Separa CI de lançamento |
