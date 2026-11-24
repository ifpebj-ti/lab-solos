# Contrato de destinatários e leitura

## Audiência no momento da emissão

- O servidor grava uma linha por conta destinatária em `NotificacoesLeituras`. A chave `(NotificacaoId, UsuarioId)` impede duplicidade.
- A audiência é congelada no instante da emissão. A inclusão considera contas com `Status = Habilitado` e o tipo de destinatário informado pela regra da operação.
- Uma notificação com `UsuarioId` identifica uma entrega individual; a relação é criada somente se essa conta estiver habilitada.
- Notificações de grupo usam `NivelUsuarioDestino`. Quando o produtor não informa papel, o tipo da notificação determina o grupo de Administradores para alertas de estoque, validade, cadastro e solicitações. Os demais tipos sem papel explícito usam a audiência geral habilitada.
- Trocas posteriores de papel ou de estado da conta não recalculam a audiência já gravada. Uma conta habilitada depois da emissão não recebe itens anteriores.
- O identificador do destinatário é preservado como registro de audiência, sem chave estrangeira à conta. Isso mantém a evidência individual mesmo após remoção da conta. A chave estrangeira à notificação elimina as linhas de leitura quando a própria notificação for removida.

## Consultas e leitura

- Lista, filtro de não lidas, contador, detalhe, marcação individual e marcação em lote usam a mesma relação de `NotificacoesLeituras` para o `UsuarioId` autenticado.
- Lista sem itens retorna `[]`; contador sem itens retorna `0`. Detalhe fora da relação retorna `404`, sem conteúdo. Marcação individual fora da relação retorna recusa genérica.
- Lote remove IDs duplicados e só grava se todos os IDs distintos pertencerem ao destinatário. Se houver ID inexistente ou inelegível, a operação inteira é recusada sem alterar qualquer linha; a resposta não identifica qual item falhou.
- A marcação concorrente é idempotente. Somente uma atualização troca `Lida` de `false` para `true` e define `DataLeitura`; repetições preservam o primeiro horário.
- A resposta de cada lista e detalhe contém apenas o estado de leitura do destinatário autenticado. Identificadores e estados de outros leitores não são projetados.

## Dados legados

- Linhas individuais antigas (`UsuarioId` preenchido) são copiadas para a tabela de leitura com `Lida` e `DataLeitura` observados.
- Linhas coletivas antigas (`UsuarioId` nulo) não têm audiência individual reconstruível. Elas permanecem em `Notificacoes`, preservam o estado coletivo observado e recebem `AudienciaLegadaIndeterminada = true`.
- Coletivos legados sem evidência individual ficam fora das consultas de destinatário até conciliação. O valor coletivo antigo não é convertido em leitura de cada conta.
- Novas notificações usam exclusivamente as linhas de destinatário para consulta e estado de leitura; os campos de leitura em `Notificacoes` permanecem como compatibilidade histórica.
