# Revisão complementar da Unidade 1

Data: 29/09/2026 · [Issue #425](https://github.com/ifpebj-ti/lab-solos/issues/425).

## Mudanças

- Exemplos sintéticos completos para os Compose de desenvolvimento e produção.
- Template de issue conforme as seções usadas no backlog; convenções de branches e commits; regra de issue antes de PR; DoR/DoD e changelog.
- README com equipe, execução e referências visuais. O sistema LabOn em andamento é a referência aprovada pelo cliente; não há protótipo independente aprovado.
- Wiki com licença Apache 2.0, logos e fontes dos concorrentes, riscos/objetivos/critérios de sucesso e consulta atualizada de dependências.
- Quatro rascunhos históricos do Project consolidados nas issues #352 e #353, com referências e estado Done. Itens preservados.
- Indicador de proteção de develop corrigido para consultar regras efetivamente aplicadas à branch, incluindo rulesets, e diferenciar indisponibilidade da API.
- Checagem de prontidão E2E substituída por uma consulta HTTP executada com .NET, sem depender de shell no runtime Chiseled.

## Validação local

Os comandos abaixo passaram em 29/09/2026:

```bash
docker compose --env-file .env.example -f docker-compose-dev.yml config --quiet
docker compose --env-file .env.prod.example -f docker-compose-prod.yml config --quiet
python -m unittest discover -s .github/scripts/tests -p test_trivy_policy.py -q
python -m unittest discover -s .github/scripts/tests -p test_sync_github_project.py -q
python -m unittest discover -s .github/scripts/tests -p 'test_*container*.py' -q
python -m unittest discover -s .github/scripts/tests -p 'test_delivery_docs*.py' -q
python -m unittest discover -s .github/scripts/tests -p test_health_probe.py -q
```

Resultados: 3 testes da política Trivy, 29 de sincronização/métrica do Project, 72 de contêineres e workflows, 4 da checagem HTTP e 24 de documentação (um ignorado por ausência de daemon Docker local). A checagem HTTP foi compilada e executada contra respostas 200/503, falha de conexão e configuração inválida. O validador documental também passou nos modos editorial e compose contra o commit da Wiki fixado no manifesto. Os comandos de teste usam PyYAML 6.0.3; a validação local usou Python 3.14, .NET SDK 8.0.419 e Compose 5.5.1, enquanto a CI usa os pins do workflow.

## Scan completo das imagens

O [resumo estruturado](trivy-resumo.json) preserva ferramenta, imagem, digest, severidades e resultados. Foram usados scans remotos do Trivy 0.72.0, sem Docker daemon e com `ignore-unfixed: false`.

| Imagem | Arquitetura | Críticas | Altas | Altas com correção |
|---|---|---:|---:|---:|
| Frontend 2.7.1 | amd64 | 0 | 0 | 0 |
| Frontend 2.7.1 | arm64 | 0 | 0 | 0 |
| Backend 2.7.1 (Debian) | amd64 | 4 | 52 | 0 |
| Backend 2.7.1 (Debian) | arm64 | 4 | 52 | 0 |
| Nova base ASP.NET 8.0.30 Noble Chiseled Extra | amd64 | 0 | 0 | 0 |
| Nova base ASP.NET 8.0.30 Noble Chiseled Extra | arm64 | 0 | 0 | 0 |

A imagem backend publicada não atende ao critério de zero críticas no scan completo. A nova base foi fixada por digest multi-arquitetura no Dockerfile para retirar os pacotes vulneráveis da imagem final. Ela inclui ICU e tzdata, conforme a [documentação oficial das variantes .NET](https://github.com/dotnet/dotnet-docker/blob/main/documentation/image-variants.md). O SDK de compilação, a versão do ASP.NET, a porta, o usuário app e o entrypoint são preservados.

**A análise da base não substitui a análise da imagem final.** A CI do PR deve construir as imagens finais, executar os testes da aplicação e publicar os scans de ambas as arquiteturas. A política passa a bloquear todas as altas e críticas, incluindo as que não possuem correção; não foram adicionadas exclusões. Produção só recebe a correção após integração, publicação de uma nova release e atualização do ambiente.

## Dependabot e acesso

A consulta autenticada de 29/09/2026 retornou zero alertas abertos do Dependabot naquele snapshot. A configuração remota tinha atualizações automáticas de segurança desabilitadas; existiam PRs de atualização de versão. Os riscos de aplicação registrados no Threat Dragon continuam independentes dos alertas de dependências. Esse resultado é histórico e não descreve o estado atual.

O Project #41 permanece privado. O acesso por perfil de avaliação não foi testado nesta execução. O usuário autorizou concluir as verificações de acesso pendentes sem esses testes; T006 e T011 foram encerradas sob essa exceção, sem afirmar acesso positivo ou validação humana. Não existe protótipo independente aprovado; o sistema LabOn em andamento é a referência aprovada pelo cliente.

## Snapshot de segurança e regras efetivas — 24/11/2026

- Snapshot agregado de Dependabot e code scanning: [evidência T009](../../../.codex/docs/specs/governanca-e-evidencias-da-entrega/evidencias/T009.md). A coleta percorreu as páginas disponíveis, estados e severidades. O relatório não mantém IDs, pacotes, caminhos ou trechos.
- Regras efetivas de develop e main: [evidência T010](../../../.codex/docs/specs/governanca-e-evidencias-da-entrega/evidencias/T010.md). Checks obrigatórios vêm das regras efetivas e rulesets. As rotas de proteção clássica responderam 404; essa fonte está registrada como ausente.
- A coleta usou APIs de leitura autenticadas. O perfil de avaliação não foi usado para consultar esses registros; não se afirma que ele tenha acesso aos materiais.
