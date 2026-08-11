# PRD: Visibilidade e posicionamento de funcionalidades

- Status: pronto
- Responsável: não definido
- Atualizado em: 2026-08-04
- Validação de descoberta: confirmada
- Issues relacionadas: #228, #232

## Contexto e problema

Itens como `Labon Pro (em breve)`, páginas `UnderDevelopment` e importação de planilha aparecem em jornadas de produção sem entrega funcional ou em contexto inadequado.

## Objetivo e métricas de sucesso

Fazer a interface prometer apenas capacidades operacionais. Sucesso: nenhum recurso incompleto é alcançável na navegação de produção; rotas/ações órfãs são removidas; uma futura importação só reaparece em gestão de produtos com contrato ponta a ponta.

## Usuários e jornadas

Usuários finais navegam sem placeholders; administradores não encontram importação quebrada na conta.

## Escopo

### Incluído

- Inventário de itens “em breve”, indisponíveis e `UnderDevelopment` alcançáveis.
- Remoção de entradas, rotas e imports mortos na produção.
- Remoção da importação da tela de conta.

### Fora de escopo

- Implementar Labon Pro ou importação de planilha.
- Criar infraestrutura de sinalizadores de funcionalidade.

## Requisitos funcionais

### RF-001 — Ocultar incompletos

Funcionalidades não operacionais não devem aparecer nem ser alcançáveis em produção.

### RF-002 — Conta coerente

A tela de conta não deve conter importação de bens; futura entrega deve pertencer ao módulo de produtos.

### RF-003 — Limpeza segura

Remoção visual deve incluir rotas/imports sem uso sem afetar funcionalidades prontas.

## Requisitos não funcionais

### RNF-001 — Clareza

Textos e ações exibidos devem descrever capacidades disponíveis agora.

### RNF-002 — Manutenibilidade

Não devem restar caminhos mortos ou avisos novos após a remoção.

## Critérios de aceitação

### CA-001 — Produção sem placeholders (RF-001, RNF-001)

- Dada uma compilação de produção
- Quando menus, homes e rotas públicas/autenticadas são percorridos
- Então não há item “em breve”, placeholder alcançável ou ação sem comportamento

### CA-002 — Importação (RF-002)

- Dada uma conta de administrador
- Quando a página de perfil/conta abre
- Então a importação de bens não aparece

### CA-003 — Limpeza (RF-003, RNF-002)

- Dados os itens removidos
- Quando lint, compilação e testes executam
- Então não restam imports/rotas mortos nem regressões

## Estratégia de validação

Busca estática por textos/componentes, testes de navegação/rotas em Vitest e essenciais Playwright de menus por perfil.

## Dependências e riscos

Pode revelar links diretos usados informalmente; inventariar antes de excluir rota.

## Suposições

- Nenhum recurso incompleto precisa ser preservado em ambiente de desenvolvimento nesta entrega.

## Perguntas abertas

Nenhuma bloqueante.

## Decisões da validação de descoberta

| Decisão | Recomendação | Resposta confirmada | Impacto |
|---|---|---|---|
| Exposição | Remover da produção até entrega completa | Confirmado | Sem sinalizadores de funcionalidade agora |
