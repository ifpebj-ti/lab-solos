# T014 — GREEN e refatoração

## Resultado

- `dotnet test backend/Tests/Tests.csproj -c Release --no-restore --filter "FullyQualifiedName~AuthenticationProtectionTelemetryTests|FullyQualifiedName~AuthenticationAuditPrivacyTests" --nologo --verbosity quiet`: 12/12 passaram (3 testes novos e 9 de auditoria/privacidade existentes).
- `dotnet build backend/backend.sln -c Release --nologo --disable-build-servers`: build concluído, 0 erros e 0 avisos no build final.
- `git diff --check`: passou.

Uma execução intermediária do filtro combinado reportou uma falha em um caso parametrizado de auditoria. O caso passou quando isolado e a execução combinada final passou integralmente; não houve reprodução.

## Contrato de privacidade

- O `Meter` `LabSolos.AuthenticationProtection` publica seis contadores/up-down counters e dois histogramas de duração em milissegundos.
- As únicas chaves de tag são `operation`, `result` e `reason`; valores vêm de enums fechados, e valores enum desconhecidos tornam-se `unknown`.
- Eventos de log usam categorias fixas e não aceitam ID, HMAC, e-mail, IP, UUID, token, texto de exceção ou outro valor livre. Nenhuma exceção é passada aos logs.
- Contagem de trabalhos e uso de capacidade são emitidos como deltas sem tags; durações negativas e alterações de capacidade não positivas são recusadas.
- Os testes `MeterListener` verificam a lista exata de instrumentos, tags e valores, medições de histogramas/deltas e ausência de canários nos logs. `AuthenticationAuditPrivacyTests` continua verificando o contrato preexistente de credenciais e auditoria.

## Escopo e limitações

Os consumidores das métricas ficam para as tarefas próprias, conforme previsto no escopo de T014. O build/tests apresentaram avisos CA1707 em testes preexistentes; nenhum aviso apontou para os dois arquivos de T014.
