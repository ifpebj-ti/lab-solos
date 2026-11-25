# Changelog

As entregas relevantes são registradas aqui e nas [releases do GitHub](https://github.com/ifpebj-ti/lab-solos/releases). As versões anteriores permanecem consultáveis nas respectivas releases. Ao preparar uma entrega, mova os itens de "Não publicado" para a versão correspondente e vincule issues e PRs.

## Não publicado

## [2.8.0](https://github.com/ifpebj-ti/lab-solos/releases/tag/2.8.0) — 2026-11-25

- Consolidar a entrega dos 11 PRDs, integrada pelas PRs [#501](https://github.com/ifpebj-ti/lab-solos/pull/501) e [#502](https://github.com/ifpebj-ti/lab-solos/pull/502).
- Adequar o cadastro e a listagem de produtos químicos e vidrarias, com edição seletiva de subscritos, peso molecular e marca, datas em português, confirmação de produtos vencidos, capacidade e alertas de estoque e validade ([#461](https://github.com/ifpebj-ti/lab-solos/issues/461)–[#468](https://github.com/ifpebj-ti/lab-solos/issues/468)).
- Reforçar os fluxos de empréstimo e devolução, a integridade de produtos, lotes e histórico, as contas e sessões, a API e o proxy, as notificações e a auditoria ([#469](https://github.com/ifpebj-ti/lab-solos/issues/469)–[#486](https://github.com/ifpebj-ti/lab-solos/issues/486)).
- Ampliar os gates de segurança e qualidade na CI e a rastreabilidade das releases; atualizar a documentação e as evidências da entrega ([#487](https://github.com/ifpebj-ti/lab-solos/issues/487)–[#497](https://github.com/ifpebj-ti/lab-solos/issues/497)).


## [2.7.5](https://github.com/ifpebj-ti/lab-solos/releases/tag/2.7.5) — 2026-11-10

- Corrigir a configuração de produção do Caddy e da rede Docker ([#443](https://github.com/ifpebj-ti/lab-solos/pull/443)).
- Atualizar GitHub Actions e dependências .NET e publicar as correções de segurança e operação ([#444](https://github.com/ifpebj-ti/lab-solos/pull/444), [#447](https://github.com/ifpebj-ti/lab-solos/pull/447), [#448](https://github.com/ifpebj-ti/lab-solos/pull/448), [#458](https://github.com/ifpebj-ti/lab-solos/pull/458), [#459](https://github.com/ifpebj-ti/lab-solos/pull/459)).

## [2.7.4](https://github.com/ifpebj-ti/lab-solos/releases/tag/2.7.4) — 2026-10-14

- Proteger o acesso por recurso e os fluxos de autenticação ([#441](https://github.com/ifpebj-ti/lab-solos/pull/441), [#442](https://github.com/ifpebj-ti/lab-solos/pull/442)).

## [2.7.3](https://github.com/ifpebj-ti/lab-solos/releases/tag/2.7.3) — 2026-09-29

- Corrigir os achados Standard do CodeQL ([#429](https://github.com/ifpebj-ti/lab-solos/pull/429), [#430](https://github.com/ifpebj-ti/lab-solos/pull/430)).

## [2.7.2](https://github.com/ifpebj-ti/lab-solos/releases/tag/2.7.2) — 2026-09-29

- Completar os artefatos da primeira entrega: exemplos de ambiente, template de issue, README, convenções de contribuição e revisão documental da Wiki ([#425](https://github.com/ifpebj-ti/lab-solos/issues/425)).
- Incluir vulnerabilidades sem correção nos scans de imagens e corrigir a leitura de proteção de branches por rulesets ([#425](https://github.com/ifpebj-ti/lab-solos/issues/425)).
- Substituir a imagem Debian do runtime da API por ASP.NET 8.0.30 Ubuntu Chiseled Extra, preservando ICU e fusos horários e removendo os pacotes associados às críticas encontradas no scan completo ([#425](https://github.com/ifpebj-ti/lab-solos/issues/425)).
- Modelo de ameaças importável no OWASP Threat Dragon e documentação correspondente ([#422](https://github.com/ifpebj-ti/lab-solos/issues/422), [#423](https://github.com/ifpebj-ti/lab-solos/pull/423)).

## [2.7.1](https://github.com/ifpebj-ti/lab-solos/releases/tag/2.7.1) — 2026-09-23

- Corrigir a acentuação no texto da recuperação de senha ([#417](https://github.com/ifpebj-ti/lab-solos/pull/417), [#418](https://github.com/ifpebj-ti/lab-solos/pull/418)).

## [2.7.0](https://github.com/ifpebj-ti/lab-solos/releases/tag/2.7.0) — 2026-09-23

- Reformular a interface do LabOn, com temas, componentes compartilhados, responsividade e feedback de operações ([#414](https://github.com/ifpebj-ti/lab-solos/issues/414), [#415](https://github.com/ifpebj-ti/lab-solos/pull/415), [#416](https://github.com/ifpebj-ti/lab-solos/pull/416)).
