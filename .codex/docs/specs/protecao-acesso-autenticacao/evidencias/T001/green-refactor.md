# T001 — GREEN e REFACTOR

Implementação restrita à infraestrutura de testes: fixture PostgreSQL 15 adicionada com o mesmo digest fixado pela composição E2E; fixture PostgreSQL 16 preservada; reset da factory usa `MigrateAsync`; relógio controlado é seguro para compartilhamento; opções permitem injetar transporte de e-mail simulado e selecionar workers; cenários sintéticos cobrem administrador, dois mentores e dois mentorados com vínculos independentes e chaves de teste de 32 bytes.

Validação final direcionada, incluindo o harness PG15 e as regressões existentes PG16:

```powershell
dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~AuthenticationProtectionHarnessTests|FullyQualifiedName~PostgreSqlApplicationSmokeTests|FullyQualifiedName~CriticalScenarioIsolationTests"
```

Resultado: 7 testes aprovados, 0 falhos, 0 ignorados. O harness confirmou migrações aplicadas em PostgreSQL 15, isolamento após reset, dados compartilhados por duas factories, mesma instância de relógio, worker selecionado pelo teste e serviço de e-mail simulado.

Compilação da solução:

```powershell
dotnet build backend/backend.sln -c Release --nologo --disable-build-servers
```

Resultado: build aprovado, 0 avisos e 0 erros.

Não foram alterados serviços, políticas ou outros controles de produção. O teste SMTP usa somente o serviço em memória e não configura conexão de rede.
