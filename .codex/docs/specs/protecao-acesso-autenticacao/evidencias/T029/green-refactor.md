# T029 — GREEN e revisão

Data: 2026-10-13.

## Fluxos adicionados

AuthenticationProtectionCrossFlowTests contém dois testes de integração:

1. Solicita recuperação no endereço antigo, altera o e-mail autenticado com confirmação da senha atual, confirma cancelamento e limpeza do trabalho antigo, rejeita login no endereço antigo, envia recuperação simulada ao endereço novo, redefine a senha, revoga a sessão anterior, rejeita reutilização do código e aceita login com a senha nova.
2. Esgota as cotas de recuperação sem revelar a elegibilidade, confirma que a limitação de recuperação não bloqueia a cota independente de login e executa corrida entre limpeza de buckets expirados e login admitido, verificando os contadores de capacidade e o limite da fila.

Os dados são sintéticos. Asserções e saída de teste não imprimem senhas, tokens, códigos de recuperação, endereços ou identificadores pessoais.

## Revisão

- A chave usada pelo harness é exclusiva do teste. A configuração fail-closed de produção permanece intacta.
- O envio foi simulado; o worker real foi exercitado sem SMTP externo.
- A execução Playwright real revelou duas expectativas incoerentes no teste de aprovação de cadastro. O caso está descrito em aceite-local.md; não foi alterado fora da posse de arquivos T029.
- Nenhum teste ou telemetria foi usado para afirmar um SLO ou uma propriedade de carga.
