# Matriz de cadastro e autoridade

Referência local da T003, #469, RF-001/RF-004 e CA-001/CA-002/CA-005. O contrato segue as [decisões aprovadas](techspec.md#matriz-aprovada) e é implementado por `PoliticaContas`.

| Jornada pública | Tipo persistido | Papel persistido | Estado inicial | Responsável |
| --- | --- | --- | --- | --- |
| Mentor | Acadêmico | Mentor | Pendente | Dispensado. O valor enviado por formulário anterior é descartado. |
| Mentorado | Acadêmico | Mentorado | Pendente | Mentor ou Administrador habilitado. |

O servidor aceita as modalidades nomeadas `Mentor` e `Mentorado`, com `tipoUsuario=Academico`, nos campos atuais. Valores numéricos, tipos comuns e concessões administrativas ficam fora do cadastro público. O servidor aplica tipo, papel, estado e vínculo após mapear os dados pessoais e acadêmicos permitidos.

| Resultado público | HTTP | Código e mensagem |
| --- | --- | --- |
| Conta válida criada | 201 | Projeção pública atual e localização do recurso. |
| Responsável ausente, inexistente ou inelegível no cadastro de Mentorado | 400 | `registration_responsible_invalid` e “Verifique o e-mail do responsável informado.” |
| Conflito de unicidade | 409 | `registration_conflict` e “Não foi possível concluir o cadastro com os dados informados.” |
| Modalidade fora da matriz | 400 | `registration_account_invalid` e orientação para selecionar Mentor ou Mentorado acadêmico. A tentativa explícita de criar tipo Administrador mantém a recusa 403 vigente. |

`ProblemDetails` apresenta os códigos em `code` e as mensagens em `detail`. A violação do índice único de e-mail durante a gravação também recebe a resposta de conflito. Falhas de banco sem essa causa seguem como falhas operacionais.

## Referência para fila e decisão

Administrador habilitado pode decidir pedidos acadêmicos pendentes de Mentor e Mentorado. Mentor habilitado pode decidir os pedidos pendentes de Mentorados vinculados a ele. Aprovar habilita a conta e rejeitar desabilita a conta. `PoliticaContas.CanDecide` publica esse predicado para integração à fila e aos comandos em T005.

A concessão administrativa ocorre por outro Administrador habilitado em fluxo autenticado e auditado, com a guarda que preserva pelo menos um Administrador habilitado. A integração desses comandos pertence a T005 e à tarefa de integridade correspondente.

As contas existentes são preservadas. Divergências de tipo, papel ou vínculo são encaminhadas para revisão administrativa na conciliação. A criação pública usa a matriz nova.
