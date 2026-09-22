# Inventário da entrega documental

Revisão inicial: 2026-09-21
Responsável pela consolidação: coordenador da execução
Escopo: T001 — fontes, versões, artefatos sobrepostos e limites da revisão

## Referências dos repositórios

| Repositório | Referência local observada | Estado observado |
|---|---|---|
| Aplicação `lab-solos` | `790ee6bd8a1a32ff7e5519d591b73931f537657b` | Checkout em `develop`; alterações preexistentes apenas em artefatos versionados de `backend/Tests/bin` e `backend/Tests/obj`, preservadas. |
| Wiki `lab-solos.wiki` | `e0f8ba291ea0d0ee74e33a1c9ce23a6c53d658f4` | Checkout limpo no momento da conferência; a referência é uma base local e não é a revisão candidata final. |

O remoto da aplicação é `https://github.com/ifpebj-ti/lab-solos.git`. A referência final da Wiki ainda deverá ser fixada somente em T015, depois da revisão de todo o conteúdo.

## Fontes canônicas e artefatos gerados

### Wiki

As páginas institucionais canônicas e os caminhos que as tarefas proprietárias devem preservar são:

- `Home.md` — índice existente;
- `Documento-de-visão-e-Requisitos.md` e `Análise-de-concorrência.md` — visão e comparação;
- `Modelagem-de-Ameaça.md` e `Guia-de-Boas-Práticas-de-Desenvolvimento-Seguro.md` — segurança;
- `Guia-de-Execução-e-Configuração-com-Docker-e-Docker-Compose.md` — execução e operação;
- nova página `Arquitetura-e-Modelagem-de-Dados.md` — arquitetura e DER, salvo localização equivalente que seja encontrada e registrada antes de T004;
- páginas de manual e demais páginas existentes — não devem ser removidas ou duplicadas.

O `manual-publicacao.json` e o conjunto de fontes em `docs/manual/**` são contratos do manual publicado pelo fluxo existente. `sync_manual_to_wiki.py` administra somente o manual; `sync_prds_to_wiki.py` administra a página de PRDs. Eles não são publicadores genéricos para os novos documentos desta entrega.

### Repositório da aplicação

As fontes operacionais que permanecem no repositório e serão referenciadas pela Wiki são:

- `docker-compose-dev.yml` e `docker-compose-prod.yml`;
- `Caddyfile`;
- `infra/oci/README.md` e scripts/arquivos de infraestrutura em `infra/oci/`;
- `backend/LabSolos-Server-DotNet8/Data/Migrations/README.md`, migrações e `AppDbContextModelSnapshot.cs`;
- `docs/manual/**`, `security/**` e exemplos versionados identificados na revisão, sem coletar `.env` privado;
- `.github/scripts/check_manual.py`, `sync_manual_to_wiki.py` e `sync_prds_to_wiki.py`;
- workflows e configuração de Dependabot em `.github/`.

Arquivos a criar para a entrega, ainda inexistentes no início de T001, ficam sob o diretório desta especificação: `inventario.md`, `validacao.md`, `documentacao.json` e `evidencias/T*.md`. O validador e seus testes serão fontes de verificação mecânica, não conteúdo canônico da Wiki.

## Questões, critérios e destinos

| Issue | Resultado esperado e critérios relevantes | Destino/tarefa proprietária |
|---|---|---|
| #352 | Arquitetura, componentes, decisões, DER, chaves, cardinalidades, fontes e versão de referência. | Wiki: arquitetura/dados; T004 e T008; integração em T010/T015. |
| #353 | Guia separado para desenvolvimento/produção, variáveis, diagnóstico, operação, backup/restauração e instalação de teste. | Wiki: guia Docker; `infra/oci/README.md`; migrações; T005, T012 e T013. |
| #355 | Visão/equipe atual, concorrência com fontes e datas, ameaças, controles classificados e confirmação do Dependabot. | Wiki: visão, concorrência e segurança; T006 e T009; confirmação em T014. |
| #356 | Exemplos exclusivamente fictícios, provisionamento seguro e confirmação reservada sobre credenciais/sessões. | Materiais delimitados no inventário; T002 e T014. |

Todos os critérios de aceite CA-001 a CA-012 permanecem rastreáveis no PRD/techspec. A atualização de texto não será tratada como aceite de instalação, recuperação, Dependabot ou revisão reservada; essas dependências permanecem explícitas até T012–T016.

## Artefatos anteriores e sobrepostos

- A issue #30 (`Documentar arquitetura`) está encerrada, sem descrição ou comentários retornados pela API. Ela não é usada como prova de que a documentação atual existe.
- A consulta do Project 41 encontrou os rascunhos `Definição da arquitetura`, `Criar diagrama de Classes`, `Documento de Modelagem de Dados` e `Guia de Infraestrutura`. Os itens não têm conteúdo suficiente para serem tratados como entrega canônica; devem ser reconciliados ou referenciados durante T004, T005 e T008, sem criar tarefas paralelas duplicadas.
- As issues da entrega (#352, #353, #355 e #356) estão no Project 41, atribuídas a `nathannmvr` e com status `In Progress` no momento da conferência. Essa situação é compatível com o acompanhamento da execução; nenhuma issue foi fechada.
- A Wiki já contém páginas equivalentes de visão, concorrência, ameaça, segurança e execução. A nova página de arquitetura/dados só deve ser criada após confirmar que não há equivalente válido no checkout candidato.

## Ambiente e versões para validações futuras

- Docker Server `29.8.0` em Linux; `docker run --rm hello-world` já foi validado na preparação.
- Docker Compose `v5.5.1`.
- .NET SDK `8.0.419`, Python `3.14.7` e Node `v24.21.0` observados.
- `docker images` contém somente `hello-world:latest` entre as imagens locais inspecionadas; não há imagem versionada do LabOn disponível localmente para assumir como versão de teste.
- O Compose de desenvolvimento constrói `frontend`/`backend` localmente e usa `postgres:15`; o Compose de produção usa `caddy:2.10-alpine`, `postgres:15` e imagens GHCR parametrizadas por `LABON_IMAGE_VERSION`.
- A instalação de teste, a versão de imagem candidata, portas livres, SMTP de teste e o roteiro de backup/restauração ainda precisam ser escolhidos e comprovados nas tarefas posteriores.

## Confidencialidade e limites

Este inventário registra apenas caminhos, identificadores, estados e conclusões sanitizadas. Não copia `.env`, valores de variáveis, credenciais, identidades de contas atingidas, logs ou achados brutos. A análise automática de padrões e a existência de exemplos não substituem a revisão reservada de Nathan; CA-010 e a confirmação do Dependabot continuam pendentes.

## Roteamento das próximas tarefas

- T002 revisa somente os materiais delimitados e exemplos efetivamente identificados, mantendo as fontes geradoras e sem editar `.env` privado.
- T003 cria o validador editorial em `.github/scripts/**`; T004/T005/T006 podem avançar após T002 em caminhos distintos.
- T007 depende do contrato de T003 e da configuração de T005; T008 completa a seção de dados criada/reaproveitada por T004; T009 usa arquitetura, operação e visão já conferidas.
- T010/T011 integram o contrato; T012/T013 exigem ambiente operacional real; T014 exige confirmação humana; T015 fixa o candidato; T016 só publica/encerra aceite com autorização e evidências completas.
