# PRD: Navegação e experiência pós-autenticação

- Status: pronto
- Responsável: não definido
- Atualizado em: 2026-08-04
- Validação de descoberta: confirmada
- Issues relacionadas: #219, #221, #222, #223

## Contexto e problema

A tela comum pós-autenticação usa conteúdo visual sem propósito claro; jornadas por perfil não priorizam ações; a tela de histórico de solicitação falha; ações “Voltar” podem encerrar a sessão ou levar a um destino incorreto.

## Objetivo e métricas de sucesso

Dar a cada perfil uma entrada operacional e navegação determinística. Sucesso: nenhuma ação de retorno limpa sessão; histórico administrativo carrega ou mostra erro contextual; home não contém carrossel; atalhos exibidos respeitam permissões.

## Usuários e jornadas

Administrador acessa gestão/aprovações/históricos; mentor acessa turma, solicitações e empréstimos; mentorado acessa busca, histórico e perfil.

## Escopo

### Incluído

- Homes por perfil com atalhos funcionais.
- Remoção do carrossel.
- Correção do histórico de solicitação administrativo.
- Rotas-pai explícitas para voltar, inclusive acesso direto/refresh.

### Fora de escopo

- Novos módulos de negócio ou dashboard analítico.

## Requisitos funcionais

### RF-001 — Home por perfil

Após a autenticação, cada perfil deve ver somente atalhos autorizados e funcionais, sem carrossel decorativo.

### RF-002 — Histórico administrativo

A jornada de histórico deve chamar contrato válido, tratar vazio/erro e manter autenticação.

### RF-003 — Retorno determinístico

Cada ação “Voltar” deve apontar para a rota-pai explícita do módulo/perfil e nunca encerrar a sessão.

## Requisitos não funcionais

### RNF-001 — Autorização

Atalhos e rotas devem respeitar as mesmas permissões no frontend e API; ocultação não substitui autorização.

### RNF-002 — Previsibilidade

Acesso direto, refresh e retorno devem produzir o mesmo destino seguro.

## Critérios de aceitação

### CA-001 — Entrada por perfil (RF-001, RNF-001)

- Dado um usuário autenticado em um dos três perfis
- Quando entra na home
- Então vê apenas ações operacionais autorizadas e nenhum carrossel

### CA-002 — Histórico (RF-002)

- Dado um administrador autorizado
- Quando abre histórico de solicitação
- Então dados ou estado vazio carregam sem erro genérico e a sessão permanece ativa

### CA-003 — Voltar (RF-003, RNF-002)

- Dada uma tela autenticada aberta por link direto ou navegação interna
- Quando “Voltar” é acionado
- Então navega para a rota-pai definida sem remover credenciais

## Estratégia de validação

Caracterização de rotas e integrações; Vitest para mapas por perfil e botões; Playwright para autenticação, acesso direto, histórico e retorno.

## Dependências e riscos

Depende do encerramento de sessão centralizado e do tratamento de erros. A rota `mentor/history/mentee` atualmente aponta para `LoanCreation`, indicando possível configuração incorreta a caracterizar.

## Suposições

- Os atalhos usam apenas rotas já funcionais.

## Perguntas abertas

Nenhuma bloqueante.

## Decisões da validação de descoberta

| Decisão | Recomendação | Resposta confirmada | Impacto |
|---|---|---|---|
| Home | Remover carrossel e priorizar ações por perfil | Confirmado | UX funcional |
| Voltar | Rota-pai explícita | Confirmado | Não depende do histórico do navegador |
