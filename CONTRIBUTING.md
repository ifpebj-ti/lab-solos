# Guia de Contribuição

Obrigado pelo seu interesse em contribuir para este projeto! Siga estas diretrizes para garantir que o processo de contribuição seja o mais fluido e eficiente possível.

## Como Contribuir

### 1. Requisitos Iniciais

- Tenha o [Git](https://git-scm.com/) instalado e configurado no seu sistema.
- Garanta que sua conta GitHub esteja associada ao repositório.
- Ter conhecimento básico do trunk-based development, usado como estratégia de controle de versão.

![Logo do Projeto](https://cdn.prod.website-files.com/622642781cd7e96ac1f66807/64f786f2c86968875977eab2_Trunk-Based%20vs._Feature-Based%20Development%20-%20Blog%20Header.webp)

### 2. Fluxo de Trabalho de Contribuição

Este projeto usa uma variação da estratégia **trunk-based** com integração contínua na branch `develop`. Toda contribuição deve partir de `develop` e retornar para `develop` por Pull Request. A branch `main` fica reservada para integração estável e releases; não abrir Pull Requests de contribuição diretamente para ela.

#### Passo a Passo

1. **Fork do Projeto**
   - Primeiramente, faça um fork do repositório em seu GitHub.

2. **Clone o Repositório**
   - Clone o repositório em sua máquina:
     ```bash
     git clone https://github.com/SEU_USUARIO/lab-solos.git
     ```
   - Acesse a pasta do projeto:
     ```bash
     cd lab-solos
     ```

3. **Criação de uma Branch Local**
   - Atualize a `develop` e crie uma branch local a partir dela para cada nova contribuição:
     ```bash
     git checkout develop
     git pull origin develop
     git checkout -b nome-da-sua-branch
     ```

4. **Faça as Modificações**
   - Realize as alterações necessárias no código. Teste e valide suas mudanças antes de prosseguir para o commit.

5. **Commits Atômicos**
   - Mantenha os commits pequenos e específicos. Siga a convenção de mensagens de commit:
     ```bash
     git commit -m "Tipo: Descrição breve da mudança"
     ```
   - Tipos comuns de commit:
     - **feature/nome-da-feature**: nova funcionalidade
     - **bugfix/nome-do-bug**: correção de bug
     - **refactor/nome-da-mudanca**: melhoria do código sem mudar a funcionalidade
     - **test/tipo-de-teste**: adição ou atualização de testes

6. **Push para o Repositório Remoto**
   - Envie suas alterações para o seu repositório no GitHub:
     ```bash
     git push origin nome-da-sua-branch
     ```

7. **Criação de Pull Request**
   - Acesse seu repositório no GitHub e abra um Pull Request para a branch `develop` do repositório original. Nunca use `main` como base de uma contribuição.
   - Preserve a estrutura de `.github/pull_request_template.md`, marque exatamente um tipo de mudança e substitua o campo de descrição por um texto claro sobre contexto, propósito e impactos.

8. **Revisão de Código**
   - Aguarde que sua contribuição seja revisada. A equipe pode solicitar alterações, então, esteja atento às notificações.

9. **Feedback e Modificações**
   - Caso seja necessário, faça as mudanças solicitadas e envie novos commits para o mesmo Pull Request.

## Regras de Codificação e Estilo

- Siga o padrão de codificação definido nos documentos de estilo do projeto.
- Realize testes das suas alterações sempre que possível, especialmente se impactarem funcionalidades críticas.

## Documentação

- Ao introduzir novas funcionalidades ou alterar comportamentos existentes, atualize a documentação do projeto para manter o repositório consistente.

---

Muito obrigado por ajudar a melhorar nosso projeto!
