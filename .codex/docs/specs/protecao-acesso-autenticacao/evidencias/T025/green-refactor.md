# T025 — GREEN/REFACTOR

- O seed passou a preparar dois pares mentor-mentorado com IDs determinísticos distintos. O segundo par pode ser derivado do cenário; uma sobrescrita explícita exige o conjunto completo das quatro credenciais. As mensagens de erro não incluem valores de credenciais.
- O teste de isolamento verifica IDs distintos no cenário e entre cenários. O filtro final de segurança/isolamento do seed passou **9/9**.
- A caracterização real cobre leitura do vínculo autorizado, negação cruzada com a mesma resposta 404, negação de mutação por mentor e atualização do próprio perfil pelo mentorado. A atualização exige a senha atual: senha ausente é bloqueada pela validação HTML `required` (campo inválido e focado), senha incorreta preserva o perfil e senha correta permite alteração e login pelo novo e-mail.
- A jornada real de credenciais cobre login válido/inválido, revogação de sessões após troca de senha, solicitação de recuperação pelos aliases primário/legado, mensagem única por destinatário no Mailpit, redefinição e login com senha nova, e logout.
- A spec UI verifica bloqueio 429, `Retry-After`, anúncio acessível e foco mantido, com verificação axe.
- As specs T025 desativam trace e screenshot localmente. Os cenários de perfil e credenciais usam identidades efêmeras para não depender de contas mutadas ou limites de tentativa de execuções anteriores.
