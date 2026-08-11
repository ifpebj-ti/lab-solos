# PRD: Cadastro e contratos de dados de usuário

- Status: pronto
- Responsável: não definido
- Atualizado em: 2026-08-04
- Validação de descoberta: confirmada
- Issues relacionadas: #216, #217, #218, #226

## Contexto e problema

O cadastro envia cidade fixa `Indefinido`, rejeita cursos curtos legítimos e os DTOs representam `DataIngresso` como `DateTime` ou `string`. Isso produz dados artificiais, datas inválidas e tratamentos especiais no frontend.

## Objetivo e métricas de sucesso

Estabelecer contrato previsível de usuário e cadastro. Sucesso: novos acadêmicos informam cidade real; `curso` aceita siglas de 2–100 caracteres; `DataIngresso` é data civil opcional ISO; campos equivalentes têm o mesmo tipo/formato em todos os endpoints afetados.

## Usuários e jornadas

Novos mentores/mentorados concluem cadastro com dados reais; administradores e usuários consultam perfil/listagens sem datas inválidas ou formatos divergentes.

## Escopo

### Incluído

- Campo cidade no cadastro e validação backend/frontend.
- Curso livre normalizado com 2–100 caracteres.
- Padronização de DTOs, mapeamentos e interfaces frontend.
- Exibição `Não informado` para cidade legada `Indefinido` e data ausente.

### Fora de escopo

- Catálogo/autocomplete de cursos.
- Inferência ou migração automática de cidades legadas.

## Requisitos funcionais

### RF-001 — Cidade real

Novo acadêmico deve informar uma cidade válida; o corpo da requisição não pode fabricar `Indefinido`.

### RF-002 — Curso flexível

Curso deve ser texto livre com trim, mínimo 2 e máximo 100, aceitando siglas.

### RF-003 — Contrato consistente

Campos compartilhados de usuário devem manter nomes, nulabilidade, enumerações e formatos equivalentes nos DTOs/endpoints.

### RF-004 — Data civil e legado

`DataIngresso` deve ser opcional, serializada `YYYY-MM-DD` e exibida `pt-BR`; valores ausentes e cidade `Indefinido` aparecem como `Não informado`.

## Requisitos não funcionais

### RNF-001 — Compatibilidade

Mudanças de contrato devem ser documentadas e coordenadas com consumidores, sem converter ausência em dado falso.

### RNF-002 — Validação autoritativa

Backend valida regras; frontend replica feedback imediato e acessível.

## Critérios de aceitação

### CA-001 — Cadastro (RF-001, RF-002, RNF-002)

- Dado um formulário acadêmico válido com cidade real e curso `ES`
- Quando o cadastro é enviado
- Então a API persiste os valores normalizados e não grava `Indefinido`

### CA-002 — Entradas inválidas (RF-001, RF-002)

- Dada uma cidade vazia ou um curso fora de 2–100 após trim
- Quando a requisição chega diretamente à API
- Então é rejeitada com erros de campo compreensíveis

### CA-003 — Contratos e datas (RF-003, RF-004, RNF-001)

- Dadas respostas de perfil, dependentes e responsáveis
- Quando seus campos equivalentes são comparados
- Então usam o mesmo contrato e data ISO ou `null`, exibida corretamente no cliente

### CA-004 — Legado preservado (RF-004)

- Dado um registro existente com cidade `Indefinido` ou data ausente
- Quando é exibido
- Então aparece `Não informado` sem alterar automaticamente o banco

## Estratégia de validação

Testes de contrato/mapeamento e serviço no backend; testes de esquema/formatação no frontend; E2E de cadastro e perfil.

## Dependências e riscos

Depende da infraestrutura de testes de qualidade. Alterar `DateTime` para semântica de data civil pode exigir conversor e coordenação; respostas devem ser caracterizadas antes da mudança.

## Suposições

- Cidade continua texto livre.
- `DataIngresso` não representa horário/fuso.

## Perguntas abertas

Nenhuma bloqueante.

## Decisões da validação de descoberta

| Decisão | Recomendação | Resposta confirmada | Impacto |
|---|---|---|---|
| Curso | Texto livre 2–100 | Confirmado | Sem catálogo nesta entrega |
| Cidade legada | Preservar e exibir `Não informado` | Confirmado | Evita inventar dados |
| DataIngresso | Data civil ISO opcional | Confirmado | Contrato uniforme |
