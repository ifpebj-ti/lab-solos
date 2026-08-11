# PRD: Manual de uso do LabOn

- Status: pronto
- Responsável: não definido
- Atualizado em: 2026-08-04
- Validação de descoberta: confirmada
- Issue relacionada: #220

## Contexto e problema

Não há manual funcional suficiente para novos administradores, mentores e mentorados; integração inicial, homologação e suporte dependem de orientação informal.

## Objetivo e métricas de sucesso

Permitir que uma pessoa nova execute os principais fluxos apenas com a documentação. A fonte deve ser revisada em `docs/manual/` e publicada na Wiki, cobrindo três perfis, acesso, cadastro/aprovação, senha, solicitações/empréstimos e configuração inicial.

## Usuários e jornadas

Administrador configura e opera; mentor gerencia vínculos e empréstimos; mentorado consulta e acompanha; suporte aponta seções estáveis.

## Escopo

### Incluído

- Visão geral, perfis/permissões, primeiro acesso, autenticação, cadastro/aprovação, senhas e operações por perfil.
- Capturas sem dados pessoais/segredos e texto alternativo.
- Fonte no repositório e publicação/sincronização na Wiki.

### Fora de escopo

- Documentação interna de arquitetura/API.
- Descrever recursos ocultos ou ainda não entregues.

## Requisitos funcionais

### RF-001 — Manual por jornada

O manual deve cobrir pré-requisitos, passos, resultado esperado, erros comuns e saída segura para cada jornada principal.

### RF-002 — Perfis e permissões

Cada seção deve indicar quem pode executar a ação e quais opções aparecem.

### RF-003 — Publicação rastreável

A fonte versionada deve ser publicável na Wiki sem divergência silenciosa.

## Requisitos não funcionais

### RNF-001 — Acessibilidade e privacidade

Imagens têm texto alternativo e não exibem credenciais/dados pessoais; linguagem é clara e navegável.

### RNF-002 — Manutenibilidade

Links e instruções devem ser verificáveis; versão/data e responsável de revisão ficam visíveis.

## Critérios de aceitação

### CA-001 — Autonomia (RF-001, RF-002)

- Dado um usuário novo de qualquer perfil
- Quando segue o manual
- Então conclui as operações principais sem orientação informal

### CA-002 — Conteúdo seguro (RNF-001)

- Dada uma revisão das páginas e imagens
- Quando privacidade/acessibilidade são auditadas
- Então não há segredo/PII e toda imagem informativa possui alternativa textual

### CA-003 — Fonte e Wiki (RF-003, RNF-002)

- Dada uma mudança aprovada em `docs/manual/`
- Quando o processo de publicação executa
- Então a Wiki reflete a mesma versão e links passam na verificação

## Estratégia de validação

Checklist por jornada/perfil, link checker e teste de tarefa com pessoa sem contexto; comparação entre fonte e Wiki após publicação.

## Dependências e riscos

Deve ser finalizado depois dos slugs que alteram UX/autenticação/contratos. Publicar Wiki exige permissão externa e não ocorre automaticamente neste plano.

## Suposições

- A Wiki continuará habilitada.

## Perguntas abertas

Nenhuma bloqueante.

## Decisões da validação de descoberta

| Decisão | Recomendação | Resposta confirmada | Impacto |
|---|---|---|---|
| Fonte | `docs/manual/` + publicação na Wiki | Confirmado | Revisão junto ao produto |
