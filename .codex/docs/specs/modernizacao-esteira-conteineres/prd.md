# PRD: Modernização da esteira de contêineres

- Status: pronto
- Responsável: não definido
- Atualizado em: 2026-08-04
- Validação de descoberta: confirmada
- Issues relacionadas: #234, #235, #238

## Contexto e problema

Os fluxos de trabalho de frontend/backend rodam após um PR fechado em `main`, usam Docker Scout com autenticação no Docker Hub, fazem uma implantação indesejada na Azure e publicam somente uma arquitetura.

## Objetivo e métricas de sucesso

Separar validação de entrega, remover Azure/Scout/Docker Hub e publicar no GHCR manifestos `linux/amd64` + `linux/arm64`. Sucesso: ambas as plataformas constam nas tags versionada e `latest`; Trivy bloqueia risco corrigível definido; não restam etapas ou referências operacionais obsoletas.

## Usuários e jornadas

Mantenedores recebem retorno pré-merge; operadores consomem a mesma tag em AMD64 ou ARM64; a equipe de segurança consulta registros e SARIF.

## Escopo

### Incluído

- CI em PR para `develop` e entrega em merge para `main`/dispatch autorizado.
- Buildx/QEMU, manifestos multi-arch e push GHCR.
- Trivy com registro e SARIF.
- Remoção de Azure Container Apps, Docker Scout e autenticação no Docker Hub exclusiva da varredura.

### Fora de escopo

- Novo provedor de implantação.
- Plataformas além de `linux/amd64` e `linux/arm64`.

## Requisitos funcionais

### RF-001 — Entrega multi-arch

Frontend e backend devem publicar manifestos únicos para AMD64/ARM64 nas tags versionada e `latest`.

### RF-002 — Varredura com Trivy

A esteira deve exibir relatório, publicar SARIF e falhar para `CRITICAL` ou `HIGH` com correção disponível.

### RF-003 — Remover integrações obsoletas

Os fluxos de trabalho não devem autenticar/implantar na Azure nem depender do Docker Hub/Scout para varredura.

### RF-004 — Separar CI e lançamento

PRs para `develop` validam; publicação/lançamento ocorre em promoção para `main` ou dispatch autorizado.

## Requisitos não funcionais

### RNF-001 — Compatibilidade de tags

Consumidores atuais de tags GHCR devem continuar funcionando sem escolher sufixo de arquitetura.

### RNF-002 — Menor privilégio

Cada trabalho deve declarar somente as permissões necessárias e não expor segredos em registros.

## Critérios de aceitação

### CA-001 — Manifesto (RF-001, RNF-001)

- Dada uma entrega concluída
- Quando o manifesto GHCR é inspecionado
- Então contém exatamente `linux/amd64` e `linux/arm64` nas duas imagens e tags esperadas

### CA-002 — Política Trivy (RF-002)

- Dada uma imagem com vulnerabilidade bloqueante corrigível
- Quando o varredura executa
- Então o job falha, mostra relatório e publica SARIF

### CA-003 — Limpeza (RF-003, RNF-002)

- Dados os fluxos de trabalho atualizados
- Quando são auditados
- Então não há ações/segredos referenciados de Azure, Docker Scout ou autenticação no Docker Hub da varredura

### CA-004 — Eventos (RF-004)

- Dado um PR para `develop` e uma promoção para `main`
- Quando cada evento ocorre
- Então o primeiro apenas valida e o segundo pode publicar/lançamento

## Estratégia de validação

Lint de YAML/actions, compilação local por plataforma quando disponível, inspeção com `docker buildx imagetools inspect` e cenário controlado para política Trivy.

## Dependências e riscos

Depende das validações do slug de qualidade. ARM pode falhar por artefato nativo; `latest` só deve avançar após todas as plataformas e varreduras passarem.

## Suposições

- GHCR permanece registry oficial.
- Secrets obsoletos nas configurações do GitHub serão removidos manualmente após confirmar ausência de consumidores.

## Perguntas abertas

Nenhuma bloqueante.

## Decisões da validação de descoberta

| Decisão | Recomendação | Resposta confirmada | Impacto |
|---|---|---|---|
| Tags ARM | Manifesto único AMD64/ARM64 | Confirmado | Mantém compatibilidade |
| Varredura | Registro + SARIF; bloquear alto/crítico corrigível | Confirmado | Diagnóstico e validação |
| Eventos | CI em `develop`, lançamento em `main` | Confirmado | Proteção pré-merge |
