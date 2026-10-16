## 📝 Descrição da Alteração
<!-- Descreva de forma concisa e técnica o que foi implementado, refatorado ou corrigido. -->

## 🔗 Rastreabilidade (Issue Relacionada)
<!-- Vincule a issue utilizando palavras-chave para fechamento automático: Closes #123, Fixes #456 -->
Closes #

## 🏷️ Tipo de Mudança (selecione uma)
- [ ] `feat`: Nova funcionalidade adicionada à aplicação ou infraestrutura
- [ ] `fix`: Correção de um bug ou vulnerabilidade
- [ ] `docs`: Alteração exclusiva em documentação
- [ ] `refactor`: Refatoração interna de código sem alteração de funcionalidade
- [ ] `ci`: Modificação em pipelines de CI/CD, GitHub Actions ou scripts de automação
- [ ] `chore`: Atualização de dependências, templates ou tarefas rotineiras

## 🧪 Evidências de Testes Locais
<!-- Descreva quais validações você executou na sua máquina antes de abrir este PR. -->
- [ ] Testes unitários/linter executados com sucesso no ambiente local.
- [ ] Imagem Docker construída localmente com multi-stage build e sem erros.
- [ ] Stack completa executada e validada via `docker compose up`.
- [ ] Endpoint `/health` respondendo com status 200 OK.

## 🛡️ Checklist de Governança e Segurança (Definition of Done)
- [ ] As mensagens de commit seguem a convenção *Conventional Commits* (`tipo(escopo): mensagem`).
- [ ] Nenhuma credencial, senha, token ou chave privada foi incluída no código (arquivos `.env` ignorados no `.gitignore`).
- [ ] Novas dependências externas adicionadas foram inspecionadas e não possuem alertas críticos de segurança.