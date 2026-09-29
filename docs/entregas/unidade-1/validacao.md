# Revisão complementar da Unidade 1

Data: 29/09/2026 · [Issue #425](https://github.com/ifpebj-ti/lab-solos/issues/425).

## Mudanças

- Exemplos sintéticos completos para os Compose de desenvolvimento e produção.
- Template de issue conforme as seções usadas no backlog; convenções de branches e commits; regra de issue antes de PR; DoR/DoD e changelog.
- README com equipe, execução e referências visuais. O link de um protótipo independente ainda depende do responsável.
- Wiki com licença Apache 2.0, logos e fontes dos concorrentes, riscos/objetivos/critérios de sucesso e consulta atualizada de dependências.
- Quatro rascunhos históricos do Project consolidados nas issues #352 e #353, com referências e estado Done. Itens preservados.
- Indicador de proteção de develop corrigido para consultar regras efetivamente aplicadas à branch, incluindo rulesets, e diferenciar indisponibilidade da API.

## Validação local

Os comandos abaixo passaram em 29/09/2026:

```bash
docker compose --env-file .env.example -f docker-compose-dev.yml config --quiet
docker compose --env-file .env.prod.example -f docker-compose-prod.yml config --quiet
python -m unittest discover -s .github/scripts/tests -p test_trivy_policy.py -q
python -m unittest discover -s .github/scripts/tests -p test_sync_github_project.py -q
python -m unittest discover -s .github/scripts/tests -p 'test_*container*.py' -q
python -m unittest discover -s .github/scripts/tests -p 'test_delivery_docs*.py' -q
```

Resultados: 3 testes da política Trivy, 29 de sincronização/métrica do Project, 71 de contêineres e workflows e 24 de documentação (um ignorado por indisponibilidade de pré-requisito local). O validador documental também passou nos modos editorial e compose contra o commit da Wiki fixado no manifesto. Os comandos de teste usam PyYAML 6.0.3; a validação local usou Python 3.14 e Compose 5.5.1, enquanto a CI usa os pins do workflow.

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

A consulta autenticada em 29/09/2026 retornou zero alertas abertos do Dependabot. A configuração remota tem atualizações automáticas de segurança desabilitadas; existem PRs de atualização de versão. Os riscos de aplicação registrados no Threat Dragon continuam independentes dos alertas de dependências.

O Project 41 permanece privado enquanto o responsável define o mecanismo de acesso dos avaliadores. A confirmação de acesso, o link de protótipos e a validação pelo cliente não são presumidos nesta evidência.
