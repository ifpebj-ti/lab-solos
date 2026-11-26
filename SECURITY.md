# Política de segurança

## Versões com suporte

Esta política considera elegível para correções de segurança somente a versão estável publicada mais recente. Em 2026-11-25, a versão mais recente era **2.8.0** ([releases do repositório](https://github.com/ifpebj-ti/lab-solos/releases)). Não há uma matriz de suporte ou compromisso de manutenção publicado para versões anteriores. Relatos sobre versões antigas são bem-vindos; informe a versão afetada e, se possível, confira se o problema também ocorre na versão estável mais recente.

## Como enviar um relato privado

Envie vulnerabilidades pelo formulário privado de segurança do GitHub:

1. Abra a página de [Security Advisories do LabOn](https://github.com/ifpebj-ti/lab-solos/security/advisories).
2. Na seção **Advisories**, escolha **Report a vulnerability**. Se a interface agrupar as opções de segurança, abra **Security** ou **Security and quality** e depois **Advisories**.
3. Preencha o formulário e envie o relato. Continue a conversa pela própria advisory privada.

Não publique detalhes da vulnerabilidade em issues, pull requests, discussões ou outros espaços públicos. Se o formulário privado não estiver disponível, não divulgue os detalhes publicamente.

Inclua, quando possível:

- um resumo e o componente, versão e ambiente afetados;
- as condições necessárias e passos claros para reproduzir;
- uma prova de conceito mínima e segura, sem acessar dados de terceiros;
- o impacto observado ou possível e, se conhecido, uma forma de reduzir o risco;
- logs ou mensagens úteis, removendo tokens, senhas, cookies, dados pessoais e outros segredos.

O formulário pode pedir resumo, detalhes, prova de conceito e impacto. Não envie credenciais nem dados reais de usuários.

## Confirmação e acompanhamento

Após o envio, o GitHub mostra uma confirmação da submissão. Guarde o link ou a referência da advisory e use essa conversa privada para atualizações e perguntas. A confirmação da tela comprova o recebimento pela plataforma; não confirma que uma pessoa já revisou o relato. A entrega de notificações ao mantenedor depende das configurações de notificações do GitHub.

`@nathannmvr` é o contato responsável pelo recebimento e pela triagem. A resposta, pedidos de esclarecimento e atualizações serão feitos na advisory privada, conforme a revisão avançar. Não há prazo fixo de confirmação ou resolução nem SLA publicado. Não reenvie o relato em um canal público para solicitar atualização.

Consulte também as instruções do GitHub sobre [relatos privados de vulnerabilidade](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/report-privately).
