# T029 — registro RED e caracterização

Data: 2026-10-13.

## Abordagem

Os fluxos verticais já estavam cobertos pelas tarefas anteriores. T029 adicionou dois cenários de integração PostgreSQL 15 para verificar interações entre mudança de contato, fila/código de recuperação, cotas de login, capacidade e limpeza concorrente. Não foi introduzida uma falha artificial no produto.

## Primeira execução

A primeira execução do novo fluxo de mudança de e-mail falhou fechada com 503 porque o harness usava a chave sintética de throttling como não operacional. A mudança de contato exige a fábrica operacional e corretamente não persistiu a alteração sem essa configuração. Isso identificou uma lacuna do cenário de teste, não uma regressão de produção. O harness foi corrigido para registrar uma chave operacional exclusiva de teste, sem credenciais reais.

## Caracterização

Após a correção do harness, ambos os testes passaram. A execução não demonstrou regressão funcional que exigisse mudança de produto. A cobertura caracteriza os contratos cruzados existentes; o resultado inicial e a correção do fixture estão descritos para não atribuir o 503 a uma falha do produto.

## Divergência observada na suíte real

Na execução da suíte real, 14 de 16 casos passaram. Dois casos de registration-approval.spec.ts esperam encontrar na lista do Mentor um cadastro enviado como Mentor. A política atual de aprovação do Mentor retorna apenas Mentorados vinculados. O teste não foi alterado por estar fora dos caminhos de T029; o contrato de autorização não foi ampliado.
