# T007 — Evidência RED

Data: 2026-10-13

Com as assertivas comportamentais adicionadas e as fontes de produção na versão inicial, foi executado:

```text
dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~AuthenticationAuditPrivacyTests" --no-restore --nologo --verbosity quiet
```

Resultado: 9 falhas, 0 aprovações. A compilação foi bem-sucedida; as falhas foram comportamentais. Os testes demonstraram que as rotas protegidas persistiam ação/caminho interpolados, corpo, query e identificadores de usuário/IP; que headers e conteúdo de credencial eram preservados em uma rota genérica; que o filtro anexava a exceção ao log; e que a telemetria registrava o ID do usuário.

Os valores usados como canários são sintéticos e não foram gravados neste relatório.
