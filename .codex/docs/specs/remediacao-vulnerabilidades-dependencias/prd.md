# PRD: Remediação de vulnerabilidades de dependências

- Status: pronto
- Responsável: não definido
- Atualizado em: 2026-08-04
- Validação de descoberta: confirmada
- Issue relacionada: #236

## Contexto e problema

O Dependabot apresenta 99 alertas abertos na consulta de 2026-08-04, majoritariamente npm, e a restauração do .NET sinaliza o AutoMapper 14.0.0 com vulnerabilidade alta. Dependências vulneráveis e possivelmente não utilizadas ampliam a superfície de ataque.

## Objetivo e métricas de sucesso

Eliminar todos os alertas críticos/altos com correção disponível, remover dependências diretas sem uso e documentar risco/mitigação para casos sem correção. Médios/baixos devem ser atualizados em lotes seguros ou registrados em uma lista de pendências.

## Usuários e jornadas

Mantenedores recebem builds seguros e previsíveis; operadores deixam de distribuir componentes com vulnerabilidades conhecidas corrigíveis.

## Escopo

### Incluído

- Inventário npm/NuGet direto e transitivo.
- Remoção de dependências sem uso e upgrades em lotes compatíveis.
- Validação de compilação, testes e alertas após cada lote.

### Fora de escopo

- Migração funcional ampla apenas para encerrar alerta médio/baixo.
- Supressão sem justificativa, prazo e responsável.

## Requisitos funcionais

### RF-001 — Inventariar e priorizar

Cada alerta deve ser ligado à dependência raiz, severidade, versão corrigida e impacto.

### RF-002 — Remediar risco prioritário

Alertas críticos/altos corrigíveis devem ser eliminados e dependências diretas sem uso removidas.

### RF-003 — Tratar exceções

Alertas sem correção devem ter mitigação, risco residual, responsável e revisão; as demais severidades devem ter lote ou registro na lista de pendências.

## Requisitos não funcionais

### RNF-001 — Compatibilidade

Cada lote deve preservar compilação e comportamento coberto por testes.

### RNF-002 — Auditabilidade

Arquivos de bloqueio e evidências de antes/depois devem permitir reproduzir a redução dos alertas.

## Critérios de aceitação

### CA-001 — Inventário (RF-001, RNF-002)

- Dados os alertas abertos
- Quando o inventário é produzido
- Então todo crítico/alto aponta dependência raiz, correção e lote

### CA-002 — Prioridade zerada (RF-002, RNF-001)

- Dados alertas críticos/altos com correção
- Quando os lotes são concluídos
- Então não resta alerta corrigível nessas severidades e compilação/testes passam

### CA-003 — Risco explícito (RF-003)

- Dado um alerta não corrigido
- Quando o slug é encerrado
- Então existe justificativa, mitigação, responsável e prazo de revisão

## Estratégia de validação

Capturar `npm audit`, `dotnet list package --vulnerable --include-transitive` e Dependabot antes/depois; executar testes direcionados por lote e validações amplos ao final.

## Dependências e riscos

Depende de `quality-and-test-foundation` para reduzir risco de upgrades. Atualizações major devem ser divididas e podem exigir adaptação de API.

## Suposições

- O total de 99 alertas é um retrato e pode mudar.
- Credenciais atuais permitem leitura, mas não encerramento manual de alertas por supressão.

## Perguntas abertas

Nenhuma bloqueante.

## Decisões da validação de descoberta

| Decisão | Recomendação | Resposta confirmada | Impacto |
|---|---|---|---|
| Limite inicial | Zerar críticos/altos corrigíveis; lotear demais | Confirmado | Prioriza risco e compatibilidade |
