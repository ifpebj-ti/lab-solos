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

## Validação remota e proteção de merge

O candidato f3ee41f completou os 18 checks com sucesso: Container CI (38480099371), Dependency security gate (38480099163), Documentation quality (38480099252) e CodeQL quality for develop (38480099216). O E2E de autenticação passou 239 cenários (17 real e 222 UI); os scans das imagens finais passaram nas duas arquiteturas.

Apesar dos jobs verdes, o ruleset code-quality-develop manteve o merge bloqueado por alertas CodeQL novos de severidade error/warning. A comparação dos alertas abertos em refs/pull/441/merge com refs/heads/develop identificou oito novos: #65, #66, #76, #83, #84, #85, #86 e #87. A revisão seguinte corrige as causas; as regras e os alertas históricos não são relaxados ou descartados.

Correções adicionais:

- IDs usados nos caminhos do adaptador Users são convertidos a inteiros positivos Int32 antes da montagem da URL. Entradas com sintaxe de URL, frações, zero, valores negativos, tipos inesperados e overflow são rejeitadas antes de HTTP; o ID do aprovador segue o mesmo contrato.
- O login verifica a ausência do usuário antes do resultado agregado de autenticação; SMTP utiliza a porta já validada; devolução rejeita claims malformados com 401 antes de acessar o repositório.
- Os testes usam conversão implícita de Task, tolerância numérica para métricas double e endereços HTTPS explícitos para PATCH no transporte virtual TestServer. A fixture pública de senha é identificada como syntheticCredential, mantendo a verificação de ausência do segredo na resposta. A consulta CWE-201 classifica acessos a variáveis com nomes password/passwd como fonte sensível mesmo sobre TLS; a fixture sintética é distinguida sem excluir arquivos ou regras da análise.
- RED backend: dois casos reproduziram FormatException/OverflowException no código anterior. GREEN: 15 testes de devolução, contrato de login e throttle; outros 34 testes de perfil, SMTP, métricas e concorrência passaram.
- RED frontend: 98 casos adversariais falharam contra a montagem anterior dos caminhos. GREEN direcionado: 203 testes de integrações e identificadores, lint e build aprovados.
- Regressão completa após as correções CodeQL: backend 434/434, sem skips; frontend 820/820 em 148 arquivos. Sete falhas iniciais da suíte frontend vieram de um mock que devolvia token também para rankID; o fixture passou a fornecer o ID numérico real do cenário, preservando as asserções. Os 11 testes dos consumidores de perfil passaram na revisão.

No candidato 735d2da, a análise remota confirmou zero alertas novos error/warning. O job Backend quality passou 434/434; no job NuGet, um teste de auditoria encontrou `123` na fração do timestamp (`2026-10-13T23:10:06.6845123Z`) ao serializar a entidade inteira. A falha era uma colisão de metadados gerados, sem vazamento de ID. O teste passou a varrer todos os campos serializados exceto Id/DataHora, mantendo as asserções de IDs, canários e IPs. Um teste determinístico reproduziu a colisão no RED; os dez testes da classe passaram no GREEN, incluindo uma garantia de que o filtro preserva o conteúdo auditável. A suite remota passa a ter 435 casos.

## Limites e encerramento

As evidências acima são locais e sintéticas. O aceite publicado T030/CA-027 continua exigindo uma versão publicada identificável, URL confirmada e contas dedicadas. Aprovação dos checks de PR permite avaliar o merge; não comprova a aceitação do ambiente publicado nem substitui os critérios de encerramento das issues #436–#440. A revisão remota das correções deve ser registrada na PR #441 após o push.
