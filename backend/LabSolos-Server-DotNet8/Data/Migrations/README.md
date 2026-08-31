# Operação das migrações de credenciais

## Banco novo

Execute `dotnet tool restore` na raiz e gere/revise o SQL idempotente antes da
aplicação. Um banco vazio deve receber `InitialSchemaBaseline` e
`CredentialLifecycle` por `Database.Migrate()` ou `dotnet ef database update`.

## Banco existente criado por `EnsureCreated`

1. Interrompa escritas, faça backup testado e registre a versão do aplicativo.
2. Gere o SQL da baseline isoladamente e compare tabelas, colunas, tipos,
   nulabilidade, chaves, índices e constraints com o catálogo do banco. Não marque
   a baseline se houver qualquer divergência.
3. Após revisão, execute `MarkInitialSchemaBaseline.sql`. O script aborta quando
   faltam tabelas centrais ou quando `Usuarios` não está no estado legado esperado.
4. Gere e revise o script idempotente completo. Aplique `CredentialLifecycle`, que
   adiciona os defaults `false`/`0`, renomeia a coluna do token e invalida todos os
   tokens de redefinição existentes.
5. Valide `__EFMigrationsHistory`, a contagem de usuários e a ausência de valores em
   `TokenRedefinicaoHash`/`TokenExpiracao` antes de liberar tráfego.

Nunca execute o marcador para “corrigir” uma divergência: ajuste ou reconcilie o
esquema em uma mudança separada e revisada.

## Reversão

A reversão preferencial é voltar a versão do aplicativo mantendo as colunas novas.
Não execute `database update InitialSchemaBaseline`: remover `VersaoSessao` pode
revalidar tokens antigos em uma implantação futura. Nunca diminua nem restaure
valores anteriores de `VersaoSessao`.

Uma reversão destrutiva do esquema exige janela própria, backup confirmado e
aplicativo anterior já ativo. Ela pode renomear `TokenRedefinicaoHash` de volta e
remover as colunas novas, mas os tokens invalidados não são recuperáveis. Se houver
suspeita de comprometimento, rotacione também a chave JWT antes de reabrir tráfego.
