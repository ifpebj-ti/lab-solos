# Perfis e permissões

Esta página resume as áreas e opções que aparecem para cada perfil. O menu é o ponto de partida: uma opção ausente não deve ser acessada por outro caminho. O serviço também confirma a autorização quando a ação é enviada, portanto uma rota ou tela compartilhada não amplia a permissão da conta.

Volte ao [índice do manual](README.md#visao-geral), consulte [Acesso e conta](acesso-e-conta.md#j04-primeiro-acesso) ou abra [Solução de problemas](solucao-de-problemas.md#j11-falhas) quando uma opção não puder ser usada.

Versão do manual: `2026-09-23.1`

Produto validado: `8c2a8bd173723b8b154aad03da2f511499fbb83b`

Atualizado em: `2026-09-23`

Responsável pela revisão: `nathannmvr`

<a id="perfis"></a>

## Perfis suportados e ponto de partida

| Perfil | Ponto de entrada | Pré-requisitos principais | Opções visíveis de referência |
| --- | --- | --- | --- |
| Administrador | **Início** da área administrativa | Conta administrativa habilitada; primeiro acesso concluído quando a troca de senha for exigida | **Produtos**, **Usuários**, **Empréstimos**, **Auditoria**, **Conta** e **Sair** |
| Mentor | **Início** da área do Mentor | Cadastro aprovado, conta habilitada e vínculo ou registros necessários à ação | **Minha turma**, **Histórico**, **Criar Empréstimo**, **Solicitações**, **Pesquisar Material**, **Conta** e **Sair** |
| Mentorado | **Início** da área do Mentorado | Cadastro aprovado, conta habilitada e vínculo quando aplicável | **Pesquisar Material**, **Histórico Pessoal**, **Meu perfil**, **Conta** e **Sair** |

O nome de uma opção pode variar entre o menu e o título da página, mas a ação deve ser iniciada pelo controle visível. **Mentee** e outros nomes técnicos não são perfis que o leitor precise conhecer.

## Matriz de ações e opções visíveis

As linhas abaixo consolidam o que cada perfil pode encontrar no menu e nas telas funcionais. O resultado depende dos dados disponíveis e do vínculo da conta.

| Perfil | Entrada visível | Opções ou ações que podem aparecer | Limite para o leitor |
| --- | --- | --- | --- |
| Administrador | **Produtos** | **Meus Produtos**, **Adicionar**, **Alertas**; consultar material, adicionar e editar quando o controle estiver disponível | O histórico do material pode ser consultado, mas este manual não promete gráficos ou filtros que ainda não foram confirmados. Veja [gerenciar materiais](administrador.md#j07-materiais-admin). |
| Administrador | **Usuários** | **Ver todos**, **Aprovar/Reprovar**; pesquisar, ordenar, filtrar e usar **Habilitar** ou **Desabilitar** para outro usuário quando a tela oferecer o controle | O alcance exato das solicitações retornadas pela tela de aprovação ainda depende de exercício. Não trate essa tela como garantia de que todos os cadastros pendentes aparecerão. Veja [aprovar cadastros](administrador.md#j03-aprovacao-admin). |
| Administrador | **Empréstimos** | **Solicitações**, **Histórico**; **Aprovar**, **Recusar** e **Registrar Devolução** quando a situação do registro permitir | A decisão e a devolução são ações administrativas. Confira o status antes de confirmar e veja [decidir empréstimos](administrador.md#j09-emprestimos-admin). |
| Administrador | **Auditoria** | A opção pode aparecer no menu | O escopo desta opção não está definido para as jornadas J01–J11. Ela fica registrada como pendência e não recebe instrução operacional neste manual. |
| Administrador | **Conta** | Consultar a conta e selecionar **Sair** | **Sair** encerra a sessão; para primeiro acesso e credenciais, veja [Acesso e conta](acesso-e-conta.md#j04-primeiro-acesso). |
| Mentor | **Minha turma** | Consultar dependentes e vínculos; **Desativar Mentorado** quando o controle estiver disponível; abrir histórico ou perfil relacionado | A tela destinada a desativados apresenta uma incompatibilidade conhecida e não deve ser tratada como garantia de que a lista correta será exibida. Veja [turma e vínculos](mentor.md#j10-turma-mentor). |
| Mentor | **Solicitações** | Pesquisar, ordenar, **Aprovar** ou **Recusar** cadastros de Mentorados vinculados | A aprovação do Mentor fica limitada às solicitações do vínculo retornado pela tela. Não aprova solicitações globais nem cadastros de outros responsáveis. Veja [solicitações do Mentor](mentor.md#j03-aprovacao-mentor). |
| Mentor | **Criar Empréstimo** | Selecionar material, usar **Adicionar**, revisar a seleção e enviar a solicitação | O Mentor solicita e acompanha o empréstimo. Se uma tela compartilhada mostrar **Aceitar** ou **Rejeitar**, não use esses controles: a autorização de decisão é administrativa e a divergência deve ser reportada. Veja [empréstimos do Mentor](mentor.md#j08-emprestimos-mentor). |
| Mentor | **Histórico** | Consultar o histórico da turma e abrir registros relacionados | A consulta não autoriza editar materiais, consultar outro perfil fora do vínculo ou decidir empréstimos. Veja [histórico da turma](mentor.md#j08-emprestimos-mentor). |
| Mentor | **Pesquisar Material** | Pesquisar e abrir o detalhe do material | A consulta não autoriza cadastrar ou editar material. Veja [consultar materiais](mentor.md#j07-consulta-materiais-mentor). |
| Mentor | **Conta** | Consultar a conta e selecionar **Sair** | Se a sessão não puder continuar, use [a orientação de sessão](solucao-de-problemas.md#sessao-expirada). |
| Mentorado | **Pesquisar Material** | Pesquisar e consultar os detalhes disponíveis | Não há ação de cadastro ou edição de material para este perfil. Veja [consultar materiais](mentorado.md#j07-consulta-materiais-mentorado). |
| Mentorado | **Histórico Pessoal** | Consultar o próprio histórico e acompanhar registros associados | O título exibido pode usar uma descrição diferente, mas o acesso é pessoal. Veja [acompanhar empréstimos](mentorado.md#j08-acompanhamento-mentorado). |
| Mentorado | **Meu perfil** ou **Conta** | Consultar os próprios dados e o vínculo disponível; selecionar **Sair** | O perfil não oferece **Aprovar**, **Recusar**, **Aceitar**, **Rejeitar** ou **Registrar Devolução** para empréstimos. Veja [perfil do Mentorado](mentorado.md#j10-perfil-mentorado). |

<a id="j03-aprovacao"></a>

## J03 — Aprovação e alcance de cada perfil

**Quem pode executar:** Administrador e Mentor responsável pelo vínculo mostrado na tela; cada perfil decide somente no alcance descrito abaixo.

**Pré-requisitos:** sessão habilitada e solicitação pendente no conjunto retornado pela tela; para o Mentor, o pedido deve pertencer ao vínculo sob sua responsabilidade.

**Onde começar:** Administrador em **Usuários > Aprovar/Reprovar**; Mentor em **Solicitações**.

**Passos:**

1. Identifique o perfil em uso e confirme o alcance do conjunto exibido.
2. Confira a solicitação pendente e siga a ação correspondente à sua variante abaixo.
3. Aguarde a atualização da lista e confirme o estado antes de iniciar outra decisão.

**Resultado esperado:** o cadastro muda para o estado indicado e a lista é atualizada quando o serviço e a tela concluem a operação.

**Erros comuns:** lista vazia, filtro sem correspondência, solicitação já processada, acesso negado ou tela que não recarrega após a decisão.

**Saída segura:** não confirme se houver dúvida; use **Voltar** para **Usuários** ou **Minha Turma** e não tente ampliar o alcance por outro endereço.

### Administrador

**Quem pode executar:** Administrador com sessão habilitada.

**Pré-requisitos:** haver uma solicitação dentro do conjunto retornado pela tela de aprovação.

**Onde começar:** **Usuários > Aprovar/Reprovar**.

**Ação visível:** revisar a linha e selecionar **Aprovar** ou **Recusar**.

**Resultado esperado:** o cadastro muda para o estado indicado e a lista é atualizada quando o serviço e a tela concluem a operação.

**Limite conhecido:** o alcance global da lista ainda precisa ser confirmado em exercício. Uma lista vazia não comprova que não existem solicitações.

**Saída segura:** não confirme se houver dúvida; use **Voltar** para **Usuários** e confira o registro antes de tentar uma nova decisão.

### Mentor

**Quem pode executar:** Mentor responsável pelo vínculo mostrado na tela.

**Pré-requisitos:** haver um cadastro pendente de um Mentorado vinculado a esse Mentor.

**Onde começar:** **Solicitações**.

**Ação visível:** selecionar **Aprovar** ou **Recusar** para a solicitação correspondente.

**Resultado esperado:** o cadastro do dependente muda de estado e a lista é recarregada quando a resposta é processada.

**Limite conhecido:** a resposta de aprovação pode ser persistida sem atualizar corretamente a tela; essa incompatibilidade pertence à implementação da jornada. Não repita a decisão sem conferir o estado.

**Saída segura:** retorne para **Minha turma**. Não tente ampliar o alcance da tela para outro responsável ou para uma decisão administrativa.

<a id="j10-perfis"></a>

## J10 — Perfil, turma e registros pessoais

**Quem pode executar:** Administrador, Mentor e Mentorado, cada um somente para os usuários, vínculos, históricos e controles oferecidos ao seu próprio perfil.

**Pré-requisitos:** sessão habilitada, área do perfil disponível e registro correspondente retornado pela consulta quando a operação depender de uma linha.

**Onde começar:** Administrador em **Usuários > Ver todos**; Mentor em **Minha Turma**; Mentorado em **Meu perfil** ou **Histórico Pessoal**.

**Passos:**

1. Abra a área de perfil indicada para a sua variante.
2. Consulte somente registros e controles apresentados para essa conta.
3. Se precisar acompanhar um vínculo ou empréstimo, abra o histórico pelo percurso do seu perfil.

**Resultado esperado:** cada perfil consulta apenas seu contexto permitido e reconhece os controles que não fazem parte da sua autorização.

**Erros comuns:** lista vazia, vínculo ausente, estado que não corresponde ao filtro, acesso negado ou controle incompatível em uma tela compartilhada.

**Saída segura:** use **Voltar** para a área do perfil ou **Conta > Sair**; não altere a URL nem tente executar uma ação que não apareça no menu.

| Perfil | O que a pessoa pode consultar | O que não deve ser inferido |
| --- | --- | --- |
| Administrador | Usuários, contexto relacionado e os controles visíveis de **Habilitar**/**Desabilitar** para outro usuário | A existência de outros estados do domínio não significa que estejam disponíveis no controle; não altere o próprio status. |
| Mentor | Minha turma, vínculos, históricos relacionados e o perfil que a tela oferecer | A rota de desativados não garante uma lista correta nesta versão; não corrija o estado por outro caminho. |
| Mentorado | Próprio perfil, vínculo e histórico pessoal | Não possui operações administrativas nem criação/decisão de empréstimo. |

Para executar uma operação, siga a página do seu perfil: [Administrador](administrador.md#j10-usuarios-admin), [Mentor](mentor.md#j10-turma-mentor) ou [Mentorado](mentorado.md#j10-perfil-mentorado). Para uma tela vazia ou que não responda, use [J11](solucao-de-problemas.md#j11-falhas).

## Regras de segurança da permissão

- Se a opção não aparece para o seu perfil, considere-a indisponível.
- Se aparecer **Acesso negado**, use **Voltar para minha área**; não altere o endereço da página nem tente uma operação técnica.
- Se aparecer uma ação incompatível em uma tela compartilhada, não a execute. Preserve a situação para conferência e reporte a inconsistência.
- Antes de confirmar uma ação sem desfazer, revise a pessoa, o material ou o empréstimo e o status exibido.
- Para encerrar o uso, selecione **Conta > Sair**. Para problemas de acesso e retorno, consulte [Solução de problemas](solucao-de-problemas.md#j11-falhas).

## Outras páginas do manual

- [Índice e percurso por perfil](README.md#visao-geral)
- [Acesso, cadastro, senha e saída](acesso-e-conta.md#j05-senha-saida)
- [Manual do Administrador](administrador.md#j06-preparar-operacao)
- [Manual do Mentor](mentor.md#j03-aprovacao-mentor)
- [Manual do Mentorado](mentorado.md#j07-consulta-materiais-mentorado)
- [Solução de problemas](solucao-de-problemas.md#j11-falhas)
