# PR #441 — correções da esteira

Data: 2026-10-13. A primeira execução remota do candidato e4418aa encontrou falhas de portabilidade, qualidade, configuração de testes, documentação e dependências. Esta revisão corrige as causas sem ampliar o baseline ou relaxar as políticas de auditoria e de acesso.

## Alterações

| Causa | Correção |
| --- | --- |
| Onze testes de criptografia rejeitavam caminho Windows no Linux | Fixture usa Path.GetTempPath e Path.Combine; a validação de caminho absoluto e a falha fechada do produto permanecem exigidas |
| Oito achados incrementais de qualidade | Acesso tipado a UserAgent, arrays estáticos da migração, regex geradas e redução da complexidade do perfil Mentorado; CA1707 recebe exceção localizada no arquivo que ancora o namespace legado, com justificativa na configuração |
| Auditoria npm com oito ocorrências HIGH | Axios 1.20.0, Tailwind/PostCSS 4.3.3 e atualizações compatíveis do lockfile; zero vulnerabilidades, sem novos overrides ou exceções de auditoria |
| OpenSSL vulnerável nas duas imagens backend | Runtime oficial ASP.NET 8.0.31 Ubuntu Chiseled Extra fixado pelo manifesto multiarch sha256:083152f868dc13215dd07856ced47701f707371c18d963d84caaac9795309f8c |
| Exemplos Compose da Wiki sem variáveis obrigatórias | Exemplos, tabela e procedimento atualizados; revisão publicada f2c211c81e463d39929874260ae3829860f9eebc fixada no manifesto documental |
| Job de autenticação executava security sem proxy HTTPS | O job seleciona explicitamente real e ui; security continua obrigatório em sua própria pilha/job |
| Cadastro E2E confundia Mentor com Mentorado pendente | Fixtures seguem o contrato de Mentorado vinculado; aprovação pelo Mentor e rejeição continuam exercitadas; cenário adicional comprova aprovação administrativa |

Tailwind 3 dependia de uma cadeia braces/chokidar/micromatch sem correção disponível. A migração segue o guia oficial, preserva tokens e equivalências das classes e documenta Safari 16.4+, Chrome 111+ e Firefox 128+ como requisitos. Os testes de navegador locais usam Chromium, sem afirmar cobertura de todos esses navegadores.

## Regressão visual identificada e corrigida

A primeira saída da migração perdeu as cores de superfície por ordem dos imports e tokens circulares. A ordem das camadas e os tokens inline foram corrigidos; um guard verifica cores computadas nos temas claro e escuro.

Na primeira suíte UI completa, 201/222 passaram e 21 falharam ao exigir outline visível na senha e no botão Inverter ordem. A correção em Password e TopDown fornece outline sólido de 2px, cor do token focus e offset de 2px, preservando os rings. Nenhuma asserção existente foi enfraquecida. Tab/Shift+Tab e forced colors também foram verificados.

## Validações locais

- Backend completo: 432/432, sem skips; foco de backend: 33/33; criptografia no Linux com SDK oficial 8.0.419: 13/13.
- Build backend isolado: zero erros e 171 avisos legados; nenhum aviso nos caminhos corrigidos.
- Trivy 0.72.0 com a política do projeto, nas bases runtime amd64 e arm64: zero HIGH/CRITICAL e exit 0. O estado de pacotes de ambas comprova OpenSSL 3.0.13-0ubuntu3.16; o CI ainda deve verificar as imagens finais da aplicação.
- Frontend: 694/694 unitários; 27/27 de perfil/cadastro; 10/10 dos componentes de foco; lint e build aprovados; npm audit com zero vulnerabilidades.
- Design e temas: 20/20; cenários responsivos afetados e adjacentes: 36/36.
- Playwright real: 17/17, incluindo cadastro, aprovação pelo Mentor, aprovação administrativa e rejeição.
- Playwright UI completo após a correção de foco: 222/222; security na pilha final recém-criada: 5/5.
- Uma repetição local de security reutilizou a base já limitada pelo teste de IP forjado e recebeu 429, como previsto pelas cotas persistentes. A pilha sintética foi removida com seus próprios volumes e recriada, seguindo o ciclo descartável do CI; os cinco cenários passaram no estado novo sem alterar limites ou asserções.
- Contratos Python: 377 executados, 375 aprovados e dois skips por privilégio de symlink no Windows. PyYAML 6.0.3 instalado em ambiente isolado; core.autocrlf=false restrito ao processo reproduziu a preservação de bytes dos fixtures Git do CI Linux. A primeira execução local com conversão automática de linhas falhou em um fixture de publicação do manual; o caso passou na execução final sem alterar o validador.
- Contratos de workflow: 11/11; documentação: 24/24; validação editorial e Compose contra a revisão fixa da Wiki aprovadas.

As pilhas lab-solos-pr441-verify e lab-solos-pr441-security foram removidas com seus próprios volumes e redes após a validação. Recursos de outros projetos e os artefatos preexistentes do workspace foram preservados.

## Limites e encerramento

As evidências acima são locais e sintéticas. O aceite publicado T030/CA-027 continua exigindo uma versão publicada identificável, URL confirmada e contas dedicadas. Aprovação dos checks de PR permite avaliar o merge; não comprova a aceitação do ambiente publicado nem substitui os critérios de encerramento das issues #436–#440. A revisão remota das correções deve ser registrada na PR #441 após o push.
