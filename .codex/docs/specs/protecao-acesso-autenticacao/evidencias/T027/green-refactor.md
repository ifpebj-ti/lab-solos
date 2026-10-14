# T027 — GREEN e revisão

Data: 2026-10-13

- O `container-ci.yml` executa `browser-security` no workflow pré-merge existente para PRs de `develop` e `merge_group`; não há filtro por caminho.
- A job usa o projeto descartável fixo `lab-solos-ci-browser-security`, a porta HTTPS `18443`, valida e inicia `docker-compose-security-e2e.yml` e executa `npm run test:e2e -- --project=security`.
- `quality-gate` depende da job e envia seu resultado ao avaliador como obrigatório. Os contratos cobrem job ausente, `skipped` e `failure`; qualquer resultado diferente de `success` impede o gate verde.
- Relatório HTML e um resumo com apenas o resultado da job são os únicos caminhos publicados como artefato. O projeto Playwright de segurança mantém traces e screenshots desativados. A limpeza sempre usa o mesmo nome de projeto e remove volumes apenas dessa composição.
- A restauração do backend passou a usar `--locked-mode`. Compilação, testes completos e scans de contêiner continuam presentes.
- `.github/scripts/check_quality_gate.py` não precisou de alteração: sua lógica genérica já rejeita jobs requeridos ausentes ou com resultado diferente de `success`; o workflow agora inclui explicitamente `browser-security`.
