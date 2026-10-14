# T014 — RED

## Linha de base

Comando: `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~AuthenticationAuditPrivacyTests" --nologo --verbosity quiet`

Resultado: 9/9 passaram antes da implementação. A telemetria de alteração de senha já tinha cobertura de privacidade; ainda não havia instrumentos agregados para eventos da proteção de autenticação.

## Falha comportamental esperada

Foram adicionados primeiro os testes de contrato de `AuthenticationProtectionTelemetry`. Com a superfície compilável e os métodos sem implementação, o filtro focado executou e falhou em 2/2 testes: não havia instrumentos publicados nem medições para os eventos requeridos. Essa falha confirmou a lacuna de comportamento; não foi falha de ambiente ou de compilação.
