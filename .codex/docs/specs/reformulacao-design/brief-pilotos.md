# Resumo de design dos pilotos — Índice de amostras

Data: 2026-09-22. Estado: direção e organização escolhidas; resumo confirmado pelo pedido de avançar para a próxima etapa após sua apresentação. Este documento encerra a definição de experiência, não é contrato de implementação nem sistema visual definitivo. Implementação e aceite funcional dos pilotos continuam pendentes.

## Público, tarefa e resultado

Uso principal em computador no laboratório; celular de apoio. Administrador deve identificar solicitações pendentes e abrir sua análise, com materiais ao alcance. Mentor compõe e revisa empréstimos; Mentorado consulta materiais e seu histórico. Modo predominante `Operate`. Preservar dados, regras, permissões, autenticação e conteúdo de documentos existentes.

## Direção escolhida e significado prático

Índice de amostras: registros alinhados, identificadores discretos, quantidade e unidade próximas, situação sempre em texto, detalhe associado à seleção sem perder a lista. Verde profundo dá estrutura; ameixa distingue seleção e ação principal; superfícies minerais mantêm leitura. A identidade resulta da precisão do trabalho e da organização, sem fichas de papel falsas ou decoração científica.

A imagem escolhida define caráter e referência de qualidade; não fornece autorização para anexos ou outros controles inexistentes. Logotipo ilustrativo não substitui símbolos institucionais obrigatórios. Paleta exata, fontes disponíveis e contraste serão verificados na especificação e nos pilotos; uma imagem não comprova acessibilidade.

## Aplicação proposta por piloto

| Piloto | Composição e foco | Interação e evidência de sucesso |
|---|---|---|
| Login e acesso | Identificação LabOn/IFPE discreta; formulário compacto, rótulos claros, Entrar como ação principal; recuperação e cadastro secundários | Entrar, recuperar, solicitar cadastro e cumprir troca obrigatória preservando as regras e destinos existentes |
| Início administrativo | Pendências em lista à esquerda e detalhe selecionado à direita; Materiais disponível na navegação e acesso rápido | Identificar solicitante, itens e situação; abrir análise sem confundir seleção com aprovação |
| Início Mentor/Mentorado | Mesma linguagem e navegação aprovada; Mentor destaca criar empréstimo e turma; Mentorado destaca materiais e histórico | Todos os destinos respeitam permissões, sem simular gestão administrativa para outros perfis |
| Catálogo | Lista tabular com nome, categoria, quantidade/unidade e situação; filtros próximos; detalhe associado ao registro | Localizar e conferir material, mostrar texto longo e distinguir falta de resultado de falha de carga |
| Criação de empréstimo | Contexto/usuário, composição e revisão como regiões claras; itens alinhados em registro, resumo e ação de envio próximos | Adicionar não equivale a enviar; erros junto aos campos; revisão conserva regras e confirmação descreve resultado real |
| Análise/consulta de empréstimo | Identificador e estado claros; solicitante e materiais legíveis; ações permitidas concentradas após informação necessária | Administrador analisa; Mentor/Mentorado consultam no escopo atual. Recusa, aprovação e devolução não são intercambiáveis |

## Temas e adaptação

**Claro:** superfície mineral clara e texto escuro; navegação verde profundo, seleção ameixa de contraste verificado. **Escuro:** superfícies escuras diferenciadas tonalmente, texto claro, mesma semântica de cor; evitar apenas inverter pixels ou reduzir opacidade. Não há mockup escuro aprovado ainda.

**Celular:** a lista e o detalhe tornam-se etapas de uma mesma consulta, com retorno explícito e preservação de seleção/filtros quando permitido. Conteúdo continua completo; campos e ações empilham sem encolher texto. A faixa de revisão do empréstimo não deve cobrir o conteúdo. Movimento discreto comunica abertura/fechamento e tem alternativa de redução de movimento.

## Estados e limites

Representar carregamento, lista vazia, filtro sem resultado, erro com recuperação, dados longos, sucesso, sessão expirada e acesso negado. Usar dados sintéticos. Cobrir os tamanhos 320, 375, 767, 768 e 1440 px e ambos os temas. Não tratar o conjunto de imagens como teste de interação, contraste, desempenho ou autorização.

## Caminho e próximas entregas

Nathan selecionou código nesta rodada, substituindo o passo de novas imagens por aplicação da identidade nos pilotos em código após a preparação técnica. A referência já gerada continua na comparação visual. A preferência permanente do projeto é imagens antes do código e não foi alterada. Não inferir desse ajuste autorização para dispensar revisão e aceite dos pilotos.

Após confirmar este resumo: especificação técnica e tarefas rastreáveis; depois pilotos navegáveis, comparação visual e validação humana antes da expansão. `DESIGN.md` definitivo será documentado a partir do sistema construído e revisado.

## Limitações que continuam abertas

Diagnóstico inicial parcial: não houve navegador disponível, testes de usabilidade, medição de desempenho em execução ou auditoria completa de contraste e teclado. As avaliações independentes foram interrompidas por limite de uso. Essas pendências precisam de evidência antes do aceite funcional, e não são resolvidas por escolher uma direção visual.
