# T030 — Dispensa documental da validação pós-publicação

Data do registro: 2026-11-24

Escopo: encerramento local da tarefa sob dispensa explícita dos testes externos que o usuário informou não poder executar.

## Verificação documental RED

A T030 e o runbook em [`operacao.md`](../../operacao.md#7-validação-pós-publicação-t030) exigem uma publicação autorizada identificável e contas de teste dedicadas antes da validação. O material disponível para esta execução não forneceu URL e versão de uma publicação candidata nem contas de teste. O runbook também instrui a não substituir o domínio ilustrativo, não executar os GETs sem host confirmado e não inferir autenticação, cotas ou recuperação a partir de verificações públicas.

Assim, os critérios de comportamento pós-publicação não têm evidência observacional nesta execução. A dispensa autorizada pelo usuário em 2026-11-24 permite encerrar localmente a tarefa sem esses testes; ela não transforma os critérios em aprovados nem os resultados em evidência de produção.

## Ações não realizadas

- Não consultei nem alterei deployment, ambiente publicado, branch protection ou configuração remota.
- Não executei requisições HTTP, inclusive os dois `Invoke-WebRequest` ilustrados no runbook.
- Não usei contas, credenciais, caixa de email ou dados de usuários.
- Não verifiquei cabeçalhos efetivos, matriz autenticada de acesso, login, cotas/`429`, troca de email ou recuperação de senha.
- Não testei comportamento de worker, envio de email, migração, rollback nem recuperação operacional.
- Não coletei evidência para as issues #436–#440, não alterei seu estado e não sincronizei GitHub Project.

## Limite do aceite

Este arquivo registra somente a dispensa e os limites conhecidos, sem segredos ou dados pessoais. A conclusão administrativa local de T030 ocorre por decisão explícita do usuário, não por aprovação dos critérios técnicos de publicação. Nenhuma publicação, implantação, teste de deployment, validação autenticada ou recuperação é declarada como ocorrida.

O roteiro em [`operacao.md`](../../operacao.md#7-validação-pós-publicação-t030) permanece intacto e não executado. Se houver publicação autorizada e contas dedicadas no futuro, a validação definida ali continuará sendo necessária antes de afirmar comportamento em produção ou usar evidências para fechar as issues.

## Verificações locais deste registro

- Verificação RED documental: critérios de T030 comparados com os pré-requisitos e salvaguardas do runbook; faltam os insumos de publicação e contas para observar resultados externos.
- `git diff --check`: executado no checkout; não apontou erros de whitespace. O Git exibiu avisos de normalização LF/CRLF em arquivos do worktree. O arquivo novo foi conferido separadamente quanto a espaços finais e newline final.
- `Invoke-WebRequest` do roteiro: **não executado**, pois não foi fornecido host publicado confirmado e a execução externa foi dispensada.
- `python .github/scripts/check_manual.py --source docs/manual`: **não executado**; esta tarefa não alterou o manual e esse comando não verifica a publicação pós-implantação.
