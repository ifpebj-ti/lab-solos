![Container CI](https://github.com/ifpebj-ti/lab-solos/actions/workflows/container-ci.yml/badge.svg)
![Container Release](https://github.com/ifpebj-ti/lab-solos/actions/workflows/container-release.yml/badge.svg)
![License](https://img.shields.io/github/license/ifpebj-ti/lab-solos)
![Last Commit](https://img.shields.io/github/last-commit/ifpebj-ti/lab-solos)
![Top Languages](https://img.shields.io/github/languages/top/ifpebj-ti/lab-solos)
![Repo Size](https://img.shields.io/github/repo-size/ifpebj-ti/lab-solos)
![Contributors](https://img.shields.io/github/contributors/ifpebj-ti/lab-solos)
![Open Issues](https://img.shields.io/github/issues/ifpebj-ti/lab-solos)
![Forks](https://img.shields.io/github/forks/ifpebj-ti/lab-solos)
![Stars](https://img.shields.io/github/stars/ifpebj-ti/lab-solos)
![Version](https://img.shields.io/github/v/tag/ifpebj-ti/lab-solos)


# Labon - Sistema de Controle de Insumos de Laboratório de Química

## Sobre o Labon
Labon é um sistema web completo para o gerenciamento de insumos e reagentes em laboratórios de química. Desenvolvido para atender laboratórios que precisam de um controle rigoroso e eficiente de materiais, o Labon oferece uma interface intuitiva e funcionalidades detalhadas que facilitam o monitoramento de estoque, a gestão de permissões de usuários, o registro de retiradas e a análise de consumo de insumos.

Este software foi projetado para ser adaptável a diferentes contextos laboratoriais, permitindo que administradores configurem o sistema de acordo com as necessidades específicas de cada ambiente, seja em instituições de ensino, centros de pesquisa ou laboratórios industriais.

## Tecnologias Utilizadas

O projeto utiliza um conjunto de tecnologias modernas para garantir um desempenho confiável e uma experiência de usuário agradável:

### Front-end

![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-grey?style=for-the-badge&logo=tailwind-css&logoColor=38B2AC) ![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white) ![ViteJS](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
### Back-end

![.NET 8](https://img.shields.io/badge/.NET-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![C#](https://img.shields.io/badge/C%23-239120?style=for-the-badge&logo=csharp&logoColor=white)

### Banco de Dados

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)

### Testes

![XUnit](https://img.shields.io/badge/XUnit-5E5349?style=for-the-badge&logo=xunit&logoColor=white)

## Contribuição
Para a contribuição do projeto foi adotado o fluxo de trabalho Trunk Based. 
Visualizar o passo a passo em: [Fluxo de Contribuição](https://github.com/ifpebj-ti/lab-solos/blob/main/CONTRIBUTING.md)

## Wiki
Indice versionado do manual de uso: [Manual de uso do LabOn](docs/manual/README.md).
Para mais informações e documentação do projeto, acesse nossa [Wiki](https://github.com/ifpebj-ti/lab-solos/wiki).

## Gestão do Projeto

O desenvolvimento, a qualidade e os indicadores do LabOn são acompanhados no [GitHub Project — LabOn: Desenvolvimento e Qualidade](https://github.com/orgs/ifpebj-ti/projects/41/views/1).

## Apresentações semanais

Os reports semanais do projeto estão disponíveis em [LabOn Presentation](https://lab-on-presentation.vercel.app/).

## Equipe e papéis

| Integrante (2026.2) | Papéis | Responsabilidades |
|---|---|---|
| Nathan Maciel | PO, DevSecOps, UI/UX e desenvolvimento fullstack | Priorização, frontend, API, banco, testes, segurança e infraestrutura |

O histórico das equipes anteriores permanece na [Wiki](https://github.com/ifpebj-ti/lab-solos/wiki).

## Telas e referências visuais

As [telas documentadas no manual](docs/manual/README.md), o [sistema publicado](https://labon.nmvr.me) e os [sprint reports](https://lab-on-presentation.vercel.app/) permitem consultar a interface e a evolução do produto. O link de um protótipo independente (Figma ou equivalente) ainda precisa ser informado pelo responsável; capturas de tela e o sistema implementado não comprovam a validação de um protótipo com o cliente.

## Execução local e produção

Pré-requisitos: Git e Docker com Docker Compose. O frontend usa React, TypeScript e Vite; a API usa ASP.NET Core 8 e o banco PostgreSQL 15.

Em desenvolvimento, copie [.env.example](.env.example) para `.env.dev`, substitua os valores sintéticos e execute:

```bash
docker compose --env-file .env.dev -f docker-compose-dev.yml config --quiet
docker compose --env-file .env.dev -f docker-compose-dev.yml up -d --build
```

Com as portas do exemplo, o frontend está em `http://localhost:8081` e a API em `http://localhost:8080/api/`. Configure SMTP para executar a recuperação de senha por e-mail.

Em produção, copie [.env.prod.example](.env.prod.example) para `.env.prod`, configure credenciais, domínio/DNS e uma versão existente no GHCR. Consulte o [guia de execução, configuração e operação](https://github.com/ifpebj-ti/lab-solos/wiki/Guia-de-Execução-e-Configuração-com-Docker-e-Docker-Compose) e o [procedimento OCI](infra/oci/README.md) antes do deploy. Na VM, o atualizador usa `/opt/labon/.env`; use esse caminho para a configuração de produção quando adotar o timer.

```bash
docker compose --env-file .env.prod -f docker-compose-prod.yml config --quiet
docker compose --env-file .env.prod -f docker-compose-prod.yml up -d
```

Os exemplos validam nomes e estrutura; os placeholders não são credenciais de operação. Não versione os arquivos preenchidos.

## Entregas, segurança e contribuição

Consulte o [changelog](CHANGELOG.md), as [releases](https://github.com/ifpebj-ti/lab-solos/releases) e o [guia de contribuição](CONTRIBUTING.md). Abra uma issue antes do PR e vincule-a na descrição. O template de issue segue a estrutura usada no backlog do projeto.

Os scans Trivy incluem vulnerabilidades altas e críticas, mesmo quando não há correção disponível. O relatório completo é publicado na pipeline e o gate bloqueia esses achados. A situação do Dependabot deve ser consultada na data da entrega; ausência de alertas não substitui a modelagem de ameaças ou os testes de autorização.

Licença: [Apache 2.0](LICENSE).

