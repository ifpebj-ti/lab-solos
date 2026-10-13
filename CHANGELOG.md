# Changelog

As entregas relevantes são registradas aqui e nas [releases do GitHub](https://github.com/ifpebj-ti/lab-solos/releases). As versões anteriores permanecem consultáveis nas respectivas releases. Ao preparar uma entrega, mova os itens de "Não publicado" para a versão correspondente e vincule issues e PRs.

## Não publicado

- Corrigir a esteira de proteção de autenticação: testes portáveis em Linux, seleção dos projetos E2E, exemplos Compose da Wiki e achados novos de qualidade; atualizar Axios, migrar o tema para Tailwind 4 e adotar ASP.NET 8.0.31 com OpenSSL corrigido ([#441](https://github.com/ifpebj-ti/lab-solos/pull/441)).
- Proteger autorização por perfil/vínculo, limitar login e recuperação com cotas compartilhadas, enfileirar entrega de recuperação e aplicar CSP no frontend via Caddy; documentar operação, migração e recuperação segura ([#436](https://github.com/ifpebj-ti/lab-solos/issues/436), [#437](https://github.com/ifpebj-ti/lab-solos/issues/437), [#438](https://github.com/ifpebj-ti/lab-solos/issues/438), [#439](https://github.com/ifpebj-ti/lab-solos/issues/439), [#440](https://github.com/ifpebj-ti/lab-solos/issues/440)).
- Corrigir os 12 Standard findings do CodeQL e informar falhas de recuperação da publicação da Wiki ([#428](https://github.com/ifpebj-ti/lab-solos/issues/428)).

## [2.7.2](https://github.com/ifpebj-ti/lab-solos/releases/tag/2.7.2) — 2026-09-29

- Completar os artefatos da primeira entrega: exemplos de ambiente, template de issue, README, convenções de contribuição e revisão documental da Wiki ([#425](https://github.com/ifpebj-ti/lab-solos/issues/425)).
- Incluir vulnerabilidades sem correção nos scans de imagens e corrigir a leitura de proteção de branches por rulesets ([#425](https://github.com/ifpebj-ti/lab-solos/issues/425)).
- Substituir a imagem Debian do runtime da API por ASP.NET 8.0.30 Ubuntu Chiseled Extra, preservando ICU e fusos horários e removendo os pacotes associados às críticas encontradas no scan completo ([#425](https://github.com/ifpebj-ti/lab-solos/issues/425)).
- Modelo de ameaças importável no OWASP Threat Dragon e documentação correspondente ([#422](https://github.com/ifpebj-ti/lab-solos/issues/422), [#423](https://github.com/ifpebj-ti/lab-solos/pull/423)).

## [2.7.1](https://github.com/ifpebj-ti/lab-solos/releases/tag/2.7.1) — 2026-09-23

- Corrigir a acentuação no texto da recuperação de senha ([#417](https://github.com/ifpebj-ti/lab-solos/pull/417), [#418](https://github.com/ifpebj-ti/lab-solos/pull/418)).

## [2.7.0](https://github.com/ifpebj-ti/lab-solos/releases/tag/2.7.0) — 2026-09-23

- Reformular a interface do LabOn, com temas, componentes compartilhados, responsividade e feedback de operações ([#414](https://github.com/ifpebj-ti/lab-solos/issues/414), [#415](https://github.com/ifpebj-ti/lab-solos/pull/415), [#416](https://github.com/ifpebj-ti/lab-solos/pull/416)).
