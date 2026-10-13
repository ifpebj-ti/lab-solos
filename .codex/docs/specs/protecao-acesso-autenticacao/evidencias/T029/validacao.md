# T029 — validação local

Data: 2026-10-13.

## Validações executadas

| Validação | Resultado |
| --- | --- |
| dotnet test backend/Tests/Tests.csproj -c Release --filter FullyQualifiedName~AuthenticationProtectionCrossFlowTests | Aprovado, 2/2 |
| dotnet restore backend/backend.sln --locked-mode | Aprovado |
| dotnet build backend/backend.sln --no-restore -c Release --nologo --disable-build-servers | Aprovado, 0 erros e 92 avisos |
| dotnet test backend/backend.sln --no-build --no-restore -c Release --nologo --disable-build-servers | Aprovado, 432/432 |
| npm.cmd run test -- --run | Aprovado, 694/694 em 146 arquivos |
| npm.cmd run lint | Aprovado |
| npm.cmd run build | Aprovado; avisos conhecidos sobre env.js, imagem resolvida em runtime e chunks acima de 500 kB |
| npm.cmd run test:e2e -- --project=real | 14/16 aprovados; duas falhas de expectativa em registration-approval.spec.ts descritas em aceite-local.md |
| npm.cmd run test:e2e -- --project=ui | Aprovado, 222/222 |
| npm.cmd run test:e2e -- --project=security | Aprovado, 5/5 |

O Compose real e o Compose de segurança foram construídos, iniciados com healthchecks e removidos usando nomes de projeto exclusivos. A limpeza removeu apenas containers, redes e volumes de lab-solos-auth-t029 e lab-solos-security-t029.

## Medições de uma execução sintética

| Etapa | Tempo | Comandos PostgreSQL | Observação |
| --- | ---: | ---: | --- |
| Solicitação de recuperação | 125,79 ms | 26 | Inclui admissão e persistência no cenário local |
| Worker de trabalho cancelado | 9,16 ms | — | Nenhum envio ao transporte simulado |
| Worker de entrega | 81,20 ms | 16 | Uma entrega simulada |

São medições de uma execução isolada, não percentis, SLO, benchmark de carga ou observação de SMTP de produção.

## Limitações conhecidas

- A suíte Playwright real não ficou totalmente verde: dois casos de aprovação registram um novo Mentor e esperam que ele conste como Mentorado pendente do responsável. A rota filtra para NivelUsuario.Mentorado vinculado; o desalinhamento precisa de decisão sobre o cenário ou requisito antes de alegar aceite visual completo.
- Não houve execução contra deployment publicado, checks remotos, volume de produção ou SMTP de produção. T030 requer URL/versão publicada autorizada e contas sintéticas de teste.
- A validação da suíte não muda o estado das issues #436–#440, que permanecem abertas.
