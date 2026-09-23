# T001 — inventário reproduzível de rotas e superfícies

## Rotas

Comparação estática realizada entre `frontend/src/routes.tsx` e o inventário da especificação:

- `routes.tsx`: 44 atributos `path`.
- Inventário: 44 entradas entre `rota` e `alias` (43 rotas e 1 alias).
- Faltantes na comparação: 0.
- Extras na comparação: 0.
- Duplicidades detectadas: 0.

Distribuição observada no arquivo de rotas: Administrador 19, Mentor 13, Mentorado 6 e Global 6; total 44.

## Superfícies cobertas pelo inventário

O `cobertura.json` existente contém 63 superfícies: 43 `rota`, 1 `alias`, 13 `compartilhada`, 4 `documento` e 2 `documentação`.

Os 17 caminhos existentes de componentes/documentação foram encontrados. Permaneceram como caminhos futuros ainda ausentes, sem serem tratados como falha de rota:

- `SUP-046`: `frontend/src/theme/`;
- `SUP-050`: `frontend/src/components/layout/`;
- `SUP-063`: `DESIGN.md`.

Esses itens não foram criados ou alterados. `cobertura.json` não foi editado nesta execução, pois a coleta runtime não produziu uma linha de base numérica válida e nenhum status de superfície poderia ser marcado como confirmado.

## Estados observáveis e limitação

O helper de medição definiu os estados de entrada/saída para login, home, catálogo e criação e tentou acessá-los na stack real. A validação navegável não chegou a produzir cinco resultados por cenário antes do limite operacional; assim, o inventário de rotas é reproduzível, mas a cobertura de estados runtime permanece pendente.

