# PRD: Experiência de erros no frontend

- Status: pronto
- Responsável: não definido
- Atualizado em: 2026-08-04
- Validação de descoberta: confirmada
- Issue relacionada: #225

## Contexto e problema

Telas e integrações exibem `Erro durante requisição` sem diferenciar validação, permissão, sessão, ausência, conflito, rede ou falha interna. O interceptor atual trata somente 401 e força navegação sem preservar contexto.

## Objetivo e métricas de sucesso

Padronizar mensagens acionáveis e comportamento por classe de erro. Sucesso: fluxos migrados não exibem mensagem genérica isolada; 401 e 403 têm efeitos distintos; detalhes técnicos ficam fora da UI de produção e podem ser correlacionados em diagnóstico.

## Usuários e jornadas

Usuário entende o problema e próximo passo; suporte distingue falha funcional de indisponibilidade sem expor dados sensíveis.

## Escopo

### Incluído

- Modelo comum para 400/401/403/404/409/5xx, tempo limite/rede e erro desconhecido.
- Mensagens contextualizadas por operação.
- Preservação segura da rota pretendida após 401.
- Migração das integrações/páginas com mensagens genéricas.

### Fora de escopo

- Plataforma externa de observabilidade.
- Exibir rastreamento de pilha ou conteúdo técnico ao usuário.

## Requisitos funcionais

### RF-001 — Normalização

Respostas e falhas de rede devem virar um erro de aplicação tipado com categoria, mensagem segura e identificador quando disponível.

### RF-002 — Mensagem contextual

Cada operação deve combinar categoria comum com contexto e ação sugerida, incluindo validações de campo.

### RF-003 — Sessão versus permissão

401 deve limpar a sessão e ir à autenticação preservando uma rota segura; 403 mantém a sessão e informa falta de permissão.

## Requisitos não funcionais

### RNF-001 — Privacidade

A interface e os registros de produção não devem expor token, senha, rastreamento de pilha ou resposta sensível.

### RNF-002 — Consistência e acessibilidade

Mensagens devem usar componente acessível comum e vocabulário estável.

## Critérios de aceitação

### CA-001 — Categorias (RF-001, RF-002)

- Dadas respostas 400, 403, 404, 409, 500 e uma falha de rede
- Quando uma operação migrada falha
- Então a mensagem identifica contexto e próximo passo sem detalhes sensíveis

### CA-002 — 401 (RF-003, RNF-001)

- Dada uma sessão expirada em rota privada
- Quando a API retorna 401
- Então a sessão é limpa, a tela de autenticação é aberta e a rota segura pode ser retomada após autenticação

### CA-003 — 403 (RF-003)

- Dada uma sessão válida sem permissão
- Quando a API retorna 403
- Então a sessão permanece e o usuário recebe aviso de autorização

### CA-004 — Acessibilidade (RNF-002)

- Dada uma mensagem exibida
- Quando tecnologia assistiva observa a página
- Então o feedback é anunciado e pode ser associado à ação/campo

## Estratégia de validação

Vitest para normalizador/interceptor e estados de página; MSW para respostas; Playwright para 401/403 e retorno pós-autenticação.

## Dependências e riscos

Depende de encerramento de sessão centralizado e infraestrutura de testes do frontend. As APIs hoje retornam textos heterogêneos; compatibilizar sem exigir migração simultânea de todos os endpoints.

## Suposições

- A rota pretendida só é guardada se interna e autorizável.

## Perguntas abertas

Nenhuma bloqueante.

## Decisões da validação de descoberta

| Decisão | Recomendação | Resposta confirmada | Impacto |
|---|---|---|---|
| 401/403 | 401 encerra; 403 preserva sessão | Confirmado | Evita logoff por autorização |
