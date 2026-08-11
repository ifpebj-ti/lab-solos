---
name: create-prd
description: Criar ou revisar um Documento de Requisitos do Produto (PRD) para uma funcionalidade, correção ou mudança deste repositório, iniciando o fluxo de Desenvolvimento Orientado por Especificações (SDD). Usar quando houver uma necessidade de produto ainda não especificada, quando o usuário pedir requisitos, PRD, escopo ou critérios de aceitação, ou antes de criar uma especificação técnica. Produzir em português do Brasil requisitos rastreáveis e verificáveis, sem antecipar a solução técnica.
---

# Criar PRD

## Resultado

Criar `.codex/docs/specs/<slug-da-funcionalidade>/prd.md` a partir de `assets/prd-template.md`. Toda documentação SDD deste repositório deve permanecer sob `.codex/docs/specs/`; nunca criar `docs/specs/` na raiz. Manter o documento focado no problema, no comportamento observável e nos limites do produto.

Escrever toda a documentação em português do Brasil, inclusive títulos, metadados, estados, tabelas e palavras-chave dos cenários. Manter em inglês somente nomes oficiais de tecnologias, comandos, caminhos, identificadores externos e siglas técnicas consolidadas cuja tradução prejudique a precisão.

## Fluxo

1. Ler `README.md`, `CONTRIBUTING.md`, regras locais e os módulos afetados. Buscar implementações semelhantes, termos de domínio e restrições existentes.
2. Inspecionar o estado da árvore com `git status --short`. Preservar alterações do usuário.
3. Executar `$grill-me` como validação de descoberta para toda funcionalidade ou mudança com decisões materiais. Entregar à skill os fatos já encontrados, perguntar uma decisão por vez e não redigir o PRD até o usuário confirmar entendimento compartilhado. Pular somente por solicitação explícita do usuário e registrar isso.
4. Registrar no PRD as decisões confirmadas, recomendações rejeitadas/aceitas, suposições remanescentes e o status da validação.
5. Definir requisitos funcionais como `RF-001`, requisitos não funcionais como `RNF-001` e critérios de aceitação como `CA-001`.
6. Escrever critérios verificáveis em Dado/Quando/Então. Cobrir caminho feliz, erros, autorização, estados vazios e limites relevantes.
7. Definir métricas, riscos, dependências, fora de escopo e perguntas abertas. Não inventar métricas ou políticas de negócio.
8. Incluir estratégia de validação em nível de produto: quais comportamentos exigem testes automatizados e quais evidências demonstram sucesso.
9. Validar que todo requisito tem ao menos um critério de aceitação e que nenhum critério depende de detalhes de implementação.

## Regras

- Usar um slug curto em português, no formato kebab-case e sem acentos, e nunca sobrescrever um PRD existente sem comparar e preservar conteúdo válido.
- Referenciar caminhos do repositório apenas como evidência de contexto; deixar decisões de arquitetura para `$create-techspec`.
- Marcar fatos não confirmados como `Suposição` e decisões pendentes como `Pergunta aberta`.
- Tratar segurança, privacidade, acessibilidade e observabilidade quando aplicáveis.
- Encerrar informando o caminho criado, principais suposições e perguntas ainda bloqueantes.

## Fluxo de contribuição Git

Quando o usuário solicitar explicitamente branch, commit, push ou Pull Request:

- atualizar `develop` e criar a branch de trabalho a partir de `origin/develop`; nunca iniciar uma contribuição em `main`;
- abrir ou alterar o Pull Request sempre com base `develop`; nunca direcionar contribuição para `main`;
- preservar `.github/pull_request_template.md`, marcar exatamente uma opção entre `novo-marco`, `nova-feature-refactor`, `bug-fix` e `outros`, e substituir o campo de descrição por contexto, propósito e impactos reais;
- manter commits atômicos e seguir nomes de branch e mensagens definidos em `CONTRIBUTING.md`;
- não executar operação Git externa sem autorização explícita do usuário.

## Validação de saída

Somente considerar o PRD pronto quando a validação `$grill-me` estiver confirmada ou explicitamente dispensada, o objetivo for mensurável, o escopo estiver limitado, os IDs forem únicos, os critérios forem testáveis e não houver decisão crítica escondida em uma suposição.
