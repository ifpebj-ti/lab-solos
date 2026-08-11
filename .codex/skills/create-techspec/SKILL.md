---
name: create-techspec
description: Criar ou revisar, em português do Brasil, uma especificação técnica rastreável a partir de um PRD no fluxo de Desenvolvimento Orientado por Especificações (SDD). Usar quando o usuário pedir especificação técnica, design técnico, arquitetura ou plano técnico para uma funcionalidade/correção já definida. Analisar o repositório, definir contratos e dados, planejar testes TDD e validar a esteira de qualidade antes da decomposição em tarefas.
---

# Criar especificação técnica

## Entradas e saída

Exigir um PRD identificável em `.codex/docs/specs/<slug-da-funcionalidade>/prd.md`. Criar `.codex/docs/specs/<slug-da-funcionalidade>/techspec.md` usando `assets/techspec-template.md`. Toda documentação SDD deste repositório deve permanecer sob `.codex/docs/specs/`; nunca criar `docs/specs/` na raiz. Se o PRD estiver ausente ou possuir uma pergunta que muda a arquitetura, parar e solicitar a decisão ou usar `$create-prd`.

Escrever toda a documentação em português do Brasil, inclusive títulos, metadados, estados, tabelas e descrições. Manter em inglês somente nomes oficiais de tecnologias, comandos, caminhos, identificadores externos e siglas técnicas consolidadas cuja tradução prejudique a precisão.

## Fluxo

1. Ler integralmente o PRD, confirmar o resultado da validação de descoberta e mapear `RF-*`, `RNF-*` e `CA-*`.
2. Analisar regras locais, arquitetura, dependências, contratos, banco, segurança e código/testes semelhantes. Confirmar comandos reais nos manifestos e fluxos de trabalho, sem presumir a pilha tecnológica.
3. Registrar o estado atual e a mudança proposta. Preferir a menor alteração coerente com os padrões existentes.
4. Especificar fluxos, componentes, contratos de API, modelo/migração de dados, autorização, falhas, compatibilidade, observabilidade e estratégia de disponibilização quando aplicáveis.
5. Construir uma matriz ligando cada requisito a componentes e níveis de teste.
6. Planejar TDD: primeiro teste que falha, implementação mínima e refatoração. Separar testes unitários, integração, contrato e UI/E2E conforme o risco.
7. Auditar a esteira local e CI. Listar comandos exatos, gatilhos e lacunas. Uma pipeline pós-merge não conta como gate pré-merge.
8. Para este repositório, reconhecer a linha de base atual: backend .NET 8/xUnit, mas `backend/backend.sln` não inclui `backend/Tests/Tests.csproj`; frontend React/Vite possui lint/compilação, mas não possui executor/script de testes; os fluxos de trabalho existentes rodam em PR fechado. Confirmar novamente no código porque a linha de base pode mudar.
9. Se uma área alterada não tiver infraestrutura de testes, incluir a implantação dessa infraestrutura e da validação pré-merge na solução proposta. Não afirmar que TDD é possível sem ela.
10. Quando restarem alternativas arquiteturais materiais, executar uma sessão separada de `$grill-me`: apresentar fatos e contrapartidas, perguntar uma decisão por vez e aguardar a confirmação do usuário antes de finalizar. Não reabrir decisões de produto já confirmadas sem nova evidência.
11. Avaliar alternativas e registrar decisões relevantes. Não implementar código de produção nesta skill.

## Fluxo de contribuição Git

Quando o usuário solicitar explicitamente branch, commit, push ou Pull Request:

- atualizar `develop` e criar a branch de trabalho a partir de `origin/develop`; nunca iniciar uma contribuição em `main`;
- abrir ou alterar o Pull Request sempre com base `develop`; nunca direcionar contribuição para `main`;
- preservar `.github/pull_request_template.md`, marcar exatamente uma opção entre `novo-marco`, `nova-feature-refactor`, `bug-fix` e `outros`, e substituir o campo de descrição por contexto, propósito e impactos reais;
- manter commits atômicos e seguir nomes de branch e mensagens definidos em `CONTRIBUTING.md`;
- não executar operação Git externa sem autorização explícita do usuário.

## Validação de saída

Somente considerar pronta quando:

- cada `RF-*`, `RNF-*` e `CA-*` estiver rastreado;
- contratos, dados, segurança e falhas relevantes estiverem definidos;
- o plano indicar como observar RED, GREEN e REFACTOR;
- os comandos de validação existirem ou a criação deles estiver explicitamente planejada;
- a validação de design estiver confirmada, dispensada ou marcada como desnecessária por ausência de decisão material;
- riscos, reversão e perguntas abertas estiverem claros.
