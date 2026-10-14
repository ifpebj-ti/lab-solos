# Operação das migrações do banco

Este documento descreve a aplicação e os limites das migrações EF Core do LabOn. Ele não substitui o [guia de execução Docker](https://github.com/ifpebj-ti/lab-solos/wiki/Guia-de-Execução-e-Configuração-com-Docker-e-Docker-Compose) nem autoriza alterações destrutivas em produção.

Referência de infraestrutura: `790ee6bd8a1a32ff7e5519d591b73931f537657b` · PostgreSQL 15 · 2026-09-22. Revisão operacional T028: 2026-10-13.

## Banco novo

Os comandos partem da raiz do repositório e usam o projeto da API como projeto de migração e de inicialização. Restaure as ferramentas antes de gerar qualquer SQL:

```bash
dotnet tool restore
mkdir -p .tmp
dotnet ef migrations script --idempotent \
  --project backend/LabSolos-Server-DotNet8/LabSolos-Server-DotNet8.csproj \
  --startup-project backend/LabSolos-Server-DotNet8/LabSolos-Server-DotNet8.csproj \
  --context AppDbContext \
  --output .tmp/labon-migrations.sql
```

Revise o arquivo gerado antes de aplicá-lo. Um banco vazio deve receber `InitialSchemaBaseline`, `CredentialLifecycle`, `UserDataContracts`, `SeparateLoanReturnDates` e `AuthenticationProtection` (`20261013153155_AuthenticationProtection`) por `Database.Migrate()` na inicialização da API ou por:

```bash
dotnet ef database update \
  --project backend/LabSolos-Server-DotNet8/LabSolos-Server-DotNet8.csproj \
  --startup-project backend/LabSolos-Server-DotNet8/LabSolos-Server-DotNet8.csproj \
  --context AppDbContext
```

Confirme a aplicação consultando `__EFMigrationsHistory`, o esquema e contagens sanitizadas. Não registre e-mails, tokens, hashes ou strings de conexão nos logs.

## Proteção de autenticação e emails repetidos

Antes da migração `AuthenticationProtection`, confirme por uma consulta somente de leitura se há valores de email exatamente duplicados. A migração verifica esse caso antes de criar o índice único `IX_Usuarios_Email`; se encontrar duplicatas, aborta e informa somente a quantidade de grupos, sem mesclar ou excluir contas.

```sql
SELECT COUNT(*) AS duplicate_email_groups
FROM (
    SELECT "Email"
    FROM "Usuarios"
    GROUP BY "Email"
    HAVING COUNT(*) > 1
) AS duplicate_email_groups;
```

O resultado esperado é `0`. Se for maior, interrompa a implantação e encaminhe a resolução individual dos registros ao responsável autorizado, com a janela e a trilha de auditoria aplicáveis. Não escolha um registro vencedor automaticamente, não normalize endereços existentes e não apague contas para fazer a migração passar. A unicidade é por igualdade exata do valor persistido.

A migração cria o armazenamento de cotas e de pedidos de recuperação, seus contadores de capacidade e a unicidade de email. Ela é aditiva para os demais dados, mas seu `Down` remove essas tabelas, filas e cotas, além do índice único. Em produção, não use `database update` para esta migração como procedimento de reversão: isso pode perder pedidos de recuperação e zerar o estado de proteção. Prefira uma versão de aplicação compatível mantendo o esquema. Consulte também o [runbook de proteção e autenticação](../../../../.codex/docs/specs/protecao-acesso-autenticacao/operacao.md).

O backup operacional precisa incluir o banco e os dois arquivos secretos de proteção. Restaurar os pedidos cifrados sem a chave de recuperação correspondente impede sua leitura; substituir a chave HMAC enquanto ainda houver cotas ativas torna os hashes antigos inalcançáveis. A rotação segura e a recuperação estão descritas no runbook.

## Banco existente criado por `EnsureCreated`

Não aplique automaticamente o histórico EF a um banco legado. Siga esta sequência com janela de manutenção, escrita interrompida e backup restaurável:

1. Registre a versão da aplicação e crie um backup em formato nativo. O roteiro de `pg_dump`/`pg_restore` sem conversão textual está no guia Docker.
2. Gere o SQL da baseline isoladamente e compare tabelas, colunas, tipos, nulabilidade, chaves, índices e constraints com o catálogo do banco. Não marque a baseline se houver qualquer divergência.
3. Após revisão do esquema, execute `MarkInitialSchemaBaseline.sql` no banco correto. O script aborta quando faltam tabelas centrais ou quando `Usuarios` não está no estado legado esperado.
4. Gere e revise o script idempotente completo. Aplique `CredentialLifecycle`, que adiciona os defaults `false`/`0`, renomeia a coluna do token e invalida os tokens de redefinição existentes.
5. Aplique as migrações posteriores de forma ordenada e valide `__EFMigrationsHistory`, a contagem de usuários e a ausência de valores em `TokenRedefinicaoHash`/`TokenExpiracao` antes de liberar tráfego.

O marcador de baseline é uma declaração sobre o esquema já existente, não uma correção de diferenças. Nunca o use para ocultar uma tabela, coluna ou constraint divergente.

## Data civil de ingresso

Antes de aplicar `UserDataContracts`, interrompa escritas e confirme um backup restaurável. A migração converte `DataIngresso` de `timestamp with time zone` para `date` usando explicitamente a data do instante em UTC. Registre apenas contagens de valores nulos/não nulos e valide amostras sem copiar e-mail, cidade ou curso para logs.

O rollback é semanticamente lossy: o `Down` reconstrói cada timestamp à meia-noite UTC, mas não recupera o horário original. Para recuperar instantes anteriores, restaure o backup pré-migração; quando compatível, prefira roll-forward mantendo a coluna `date`.

## Reversão e limites

A reversão preferencial é voltar a uma versão de aplicativo compatível mantendo as colunas novas. Não execute `database update InitialSchemaBaseline`: remover `VersaoSessao` pode revalidar tokens antigos em uma implantação futura. Nunca diminua nem restaure valores anteriores de `VersaoSessao`.

Uma reversão destrutiva do esquema exige janela própria, backup confirmado e aplicativo anterior já ativo. Ela pode renomear `TokenRedefinicaoHash` de volta e remover colunas novas, mas tokens invalidados não são recuperáveis. Se houver suspeita de comprometimento, rotacione também a chave JWT antes de reabrir tráfego.

O rollback de imagens OCI não restaura banco nem desfaz migrações. Falha de uma release deve ser tratada com diagnóstico, backup isolado e roll-forward/recuperação compatível; não use remoção de volumes para tentar corrigir um banco com dados.

## Verificações após a migração

```bash
dotnet ef migrations list \
  --project backend/LabSolos-Server-DotNet8/LabSolos-Server-DotNet8.csproj \
  --startup-project backend/LabSolos-Server-DotNet8/LabSolos-Server-DotNet8.csproj \
  --context AppDbContext
```

No PostgreSQL, valide a presença do histórico e conte registros sem imprimir dados pessoais:

```sql
SELECT "MigrationId" FROM "__EFMigrationsHistory" ORDER BY "MigrationId";
SELECT COUNT(*) FROM "Usuarios";
```

Se a validação encontrar divergência, pare a liberação, preserve o backup e registre a pendência sanitizada. Não marque uma baseline, não reverta sessão e não execute `down --volumes` em produção para obter um estado aparentemente limpo.
