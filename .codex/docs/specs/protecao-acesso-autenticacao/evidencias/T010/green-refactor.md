# T010 — GREEN / REFACTOR

## Implementação

`PasswordRecoveryJobRepository` usa SQL parametrizado e as chaves/cifra de `RecoveryPayloadProtector`. As operações de admissão, confirmação, retry, cancelamento e limpeza entram em uma transação curta própria ou juntam-se à transação EF que já estiver ativa no mesmo `AppDbContext`.

- A admissão serializa o contador `recovery-jobs`, limita a fila ativa a 5.000 e coalesce apenas pela hash exata de entrega, sem substituir payload/código nem estender validade.
- A reserva seleciona até 10 trabalhos com `FOR UPDATE SKIP LOCKED`; a concessão tem UUID e prazo do relógio PostgreSQL. Reservas vencidas podem retomar o mesmo payload cifrado.
- Atualização de payload, retry e conclusão exigem a concessão vigente. Conclusão, falha final, cancelamento por usuário e limpeza de expirados removem o ciphertext e liberam a capacidade na mesma transação.
- Trabalhos com chaves exatas distintas permanecem separados mesmo quando compartilham a chave de cota do destinatário.

## Verificações

| Comando | Resultado |
|---|---|
| `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~RecoveryJobRepositoryTests" --no-restore --nologo --verbosity quiet` | 10/10 aprovados em PostgreSQL 15 |
| `dotnet test backend/Tests/Tests.csproj -c Release --no-build --no-restore --nologo --verbosity quiet` | 347/347 aprovados; repetição final após uma execução intermediária não reprodutível de 346/347 |
| `dotnet build backend/backend.sln -c Release --no-restore --nologo --disable-build-servers --verbosity quiet` | 0 avisos, 0 erros |
| `dotnet build backend/Tests/Tests.csproj -t:Rebuild -c Release --no-restore --nologo --disable-build-servers --verbosity quiet` | 0 erros; 181 avisos de análise em outros arquivos preexistentes; nenhum aviso nos dois arquivos T010 |
| `git diff --check` e verificação de whitespace dos arquivos T010 | aprovados |

Uma execução intermediária da suíte completa reportou 346/347 sem o nome do teste na saída resumida. A execução detalhada seguinte terminou com código 0, a repetição final passou 347/347 e o filtro T010 passou 10/10; a falha não foi reproduzida.

## Gate

`.github/workflows/container-ci.yml` valida PRs para `develop` em `opened`, `synchronize`, `reopened`, `edited` e `ready_for_review`, e inclui teste de `Tests.csproj` filtrado por integração. A configuração remota de checks obrigatórios não foi consultada nem alterada.
