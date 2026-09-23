# T017 — Pacote de aceite da onda de acesso e estrutura

## Escopo revisado

A onda cobre T015 e T016: cadastro, recuperação, reset, troca obrigatória, perfis, conta, logout, notificações, 404, sessão, autorização e navegação pós-auth.

## Evidências

- error-experience.spec.ts + post-auth-navigation.spec.ts no frontend containerizado: 11/11 testes verdes.
- error-experience confirmou diferença entre 401 e 403, limpeza/retomada segura da sessão, preservação de rota válida e retry contextual.
- post-auth-navigation confirmou atalhos de administrador, mentor e mentorado em 375px e 1440px, preservação de ID/URL, refresh, alias legado e bloqueio entre perfis.
- check_design_coverage.py: OK progressivo, 63 superfícies e 44 rotas verificadas.
- T015: credential-lifecycle real 4/4, suíte dirigida 33/33.
- T016: error-experience + user-data-contract 2/2, suíte dirigida 34/34.
- Suíte frontend geral: 138 arquivos, 639 testes verdes.
- Compose Docker permaneceu saudável durante as validações.

## Pendências menores

- O launcher Impeccable disponível não possui audit/critique; a limitação está documentada nas evidências T015/T016.
- Achados axe compartilhados em catálogo/barra lateral administrativa permanecem fora da posse da onda e foram registrados nos marcos proprietários.
- Issue/GitHub Project não foi sincronizado por autorização explícita de Nathan.

## Estado do marco

Aceite explícito de Nathan confirmado. T017 concluída sob limitação de ambiente; T018 liberada. As limitações menores acima permanecem registradas para rastreabilidade.
