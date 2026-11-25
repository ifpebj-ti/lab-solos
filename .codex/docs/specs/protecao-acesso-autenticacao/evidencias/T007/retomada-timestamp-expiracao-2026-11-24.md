# T007 — Retomada: timestamp gerado no teste de privacidade

Data: 24/11/2026
Motivo: a execução completa de backend com Coverlet, durante a validação local de T008, falhou em um caso de `AuthenticationAuditPrivacyTests`.

## RED

O teste `GeneratedAuditMetadataMayContainRequestDigitsWithoutPersistingSensitiveContent` define IDs `123`/`456` como canários numéricos. A expiração é um campo gerado, mas `SerializeAuditContent` removia apenas `Id` e `DataHora`. Incluindo um valor de `ExpiraEmUtc` com as sequências `123` e `456`, o teste focado falhou porque comparava esses dígitos do timestamp como se fossem conteúdo sensível.

Também falhou uma linha da teoria `DeniedSensitiveRoutesPersistOnlyServerDefinedAuditMetadata`: o timestamp UTC gerado coincidiu com `123`. A falha inicial ocorreu em 845/846 casos, sem relação com conteúdo da requisição.

## GREEN

`SerializeAuditContent` agora exclui apenas os metadados gerados `Id`, `DataHora` e `ExpiraEmUtc`. O teste continua serializando e examinando todas as outras propriedades do registro, incluindo relacionamentos/campos futuros, e mantém os canários de conteúdo. Não houve mudança na política de auditoria ou nos dados persistidos.

## Verificações

- RED determinístico com expiração fixa contendo `123`: falhou na asserção de privacidade do conteúdo.
- GREEN focado: `GeneratedAuditMetadataMayContainRequestDigitsWithoutPersistingSensitiveContent`, **1/1**.
- `AuthenticationAuditPrivacyTests` e `AuditoriaMiddlewareTests`: **16/16**.
- Backend completo após a correção: **846/846**, sem skips, em 3 min 50 s.

## Escopo

Correção restrita ao helper de teste da T007. Não alterou código de produção, migrações, configurações remotas ou logs reais.
