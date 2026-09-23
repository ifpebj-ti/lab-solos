# Avaliação A — design e experiência do LabOn

Método: avaliação independente por `/root/critica_design`, sem executar detector ou consultar resultados da avaliação B. Data: 22/09/2026. Modo principal: Operate. Alvo: fontes em `frontend/src/`, comparadas às capturas do manual.

## Evidência e limites

Foram lidos PRODUCT.md, PRD da reformulação e referência critique.md. Foram inspecionadas visualmente, com view_image, as capturas `j01-acesso-login.png`, `j06-administrador-home.png`, `j08-mentor-criacao-emprestimo.png` e `j10-mentorado-perfil.png`. O manual declara versão 2026-09-14.2 e commit 2c78dbe; o HEAD observado é 8c2a8bd173723b8b154aad03da2f511499fbb83b. A correspondência abaixo é estrutural, não equivalência integral de pixels ou de dados.

| Superfície documentada | Conferência na fonte corrente | Frescor |
|---|---|---|
| Login | `pages/Login.tsx`: cartão w-96, cabeçalho verde, dois campos, links e Submeter Login | Estrutura e textos confirmados |
| Início administrativo | `pages/admin/Home.tsx:150` e `navigation/profileNavigation.ts`: saudação até text-6xl e seis atalhos | Composição principal confirmada; feedback de erro também existe hoje |
| Criação de empréstimo | `pages/mentor/LoanCreation.tsx`: blocos Utilizadores/Produtos, seleção, tabela e solicitação | Estrutura confirmada; hoje contém classes explícitas de adaptação móvel |
| Perfil mentorado | `pages/mentee/Profile.tsx` e `components/screens/InfoContainer.tsx` | Agrupamento e truncamento confirmados |

Esta revisão não representa teste com usuários. Não foram medidos tempos, taxas de erro, satisfação ou abandono. Os percursos de personas são inspeções argumentadas. Notas heurísticas são juízo especializado da amostra e código; não são certificação de acessibilidade nem cobertura de todas as rotas.

## Especificidade do design

O LabOn já tem identidade reconhecível: verde recorrente, símbolo de laboratório, tipografia estreita nos títulos e referência explícita ao IFPEBJ. A especificidade é mais forte no conteúdo e na marca do que na organização das decisões. Uma estrutura de painel administrativo com saudação grande, cartões equivalentes e ícones poderia servir a outro sistema trocando textos e logotipo. Isso decorre da composição e hierarquia observadas, não da popularidade de Inter, verde ou bibliotecas.

A oportunidade principal é fazer o contexto do laboratório comandar a apresentação: disponibilidade, quantidade/unidade, responsabilidade, estado do empréstimo e ação autorizada precisam orientar o olhar. Identidade própria pode nascer da precisão dessas relações, sem acrescentar gráficos, indicadores ou recursos.

## Heurísticas de Nielsen

Escala 0–4, em que 4 exige excelência demonstrada. As dez são aplicáveis a este produto operacional.

| # | Heurística | Nota | Evidência e ressalva |
|---|---|---:|---|
| 1 | Visibilidade do estado | 2 | Loading, badges e ErrorFeedback existem; catálogo e criação absorvem falhas de carga, confundindo ausência com indisponibilidade |
| 2 | Correspondência com mundo real | 3 | Materiais, turmas, quantidades e empréstimos são reconhecíveis; Home/Submeter Login/Utilizadores e alternância produto/material enfraquecem naturalidade |
| 3 | Controle e liberdade | 2 | BackLink e remoção de itens são bases úteis; criação não mostra saída contextual nem retorno após sucesso |
| 4 | Consistência e padrões | 2 | Shell e componentes repetidos dão unidade; rótulos, tratamentos de erro e densidade variam |
| 5 | Prevenção de erros | 2 | Schema valida quantidade positiva e campos requeridos; erro nos seletores só muda borda e não explica correção |
| 6 | Reconhecimento em vez de memória | 2 | Navegação possui rótulos; detalhes truncados e contexto distante na composição de empréstimo exigem inspeção adicional |
| 7 | Flexibilidade e eficiência | 2 | Busca, filtros, atalhos por perfil e seleção pesquisável existem; início e formulário privilegiam espaço em vez de encurtar decisão |
| 8 | Estética e minimalismo | 2 | Superfícies limpas e família visual clara; saudação e grandes caixas recebem atenção que deveria ir à tarefa |
| 9 | Reconhecer e recuperar erros | 2 | ErrorFeedback possui descrição, ação, foco e retry; aplicação não é uniforme nas fontes examinadas |
| 10 | Ajuda e documentação | 2 | Manual orientado a jornadas e pré-requisitos existe; conexão contextual a partir das telas não foi identificada na amostra |
| | **Total** | **21/40** | **Aceitável, com melhorias significativas; julgamento da amostra** |

## O que funciona

1. Navegação e atalhos respeitam os três perfis e usam rótulos visíveis. A estrutura cria orientação inicial e deve ser preservada conceitualmente na reorganização.
2. Há base de acessibilidade e recuperação concreta: ErrorFeedback usa alerta anunciado, foco, descrição e ação; tabelas responsivas e BackLink já existem. A reformulação deve consolidar essas capacidades.
3. As telas exibem entidades e dados operacionais reais, como quantidades, unidades, estados e vínculos. O manual explicita jornadas e limites, oferecendo conteúdo sólido para a direção visual.

## Cinco achados prioritários

### A1 — P1: ausência de dados e falha de carga tornam-se visualmente indistintas

**Evidência:** `components/screens/SearchMaterialComponent.tsx:88` só registra falha no console de desenvolvimento; o render apresenta contagens substituídas por zero e “Nenhum dado disponível para exibição” (linha 239). `pages/mentor/LoanCreation.tsx:113` esvazia produtos e dependentes na falha e não oferece recuperação. Esse comportamento está diretamente no código; não foi provocada indisponibilidade de backend nesta inspeção.

**Consequência provável:** administrador ou mentor pode interpretar catálogo indisponível como catálogo vazio, sem saber se deve aguardar, corrigir filtros ou repetir. É uma quebra de confiança operacional, não apenas estilo.

**Direção:** distinguir carregando, nenhum cadastro, nenhum resultado e indisponibilidade; reutilizar contrato de feedback existente, conservar contexto e oferecer próxima ação adequada. Não inferir disponibilidade por zero substituto. Comandos sugeridos: `$impeccable harden`, `$impeccable clarify`.

### A2 — P1: seletores não comunicam suficientemente nome e erro

**Evidência:** `components/global/inputs/PopoverInput.tsx:31–44` recebe error, mas usa-o apenas na borda; o título é um `<p>` sem associação ao botão combobox. Os seletores vazios repetem “Selecione...”. Ausentes neste componente: mensagem de erro renderizada, aria-invalid e associação do erro/título. A criação usa o componente para Usuário, Grupo, Item e Unidade de Medida.

**Consequência provável:** quem navega por controles com tecnologia assistiva encontra nomes insuficientes; quem erra precisa deduzir a exigência pela cor. Não foi usado leitor de tela para medir o efeito real.

**Direção:** especificar rótulo programático, estado inválido e mensagem próxima de cada seletor; manter foco evidente, leitura do erro e termos apropriados ao contexto. Comandos sugeridos: `$impeccable audit`, `$impeccable clarify`.

### A3 — P2: o início dedica sua maior ênfase à saudação e equaliza decisões diferentes

**Evidência:** captura administrativa e `pages/admin/Home.tsx:150–164`: saudação em até 60 px seguida de seis atalhos de peso equivalente. Solicitações pendentes, catálogo e histórico compartilham composição; badges dão contagem, mas não estabelecem uma sequência clara. A lateral já oferece cinco categorias principais.

**Consequência provável:** o usuário recorrente varre um bloco institucional e decide novamente entre seis caminhos. Não há evidência de que todos tenham a mesma frequência ou urgência.

**Direção:** reduzir saudação a identificação discreta; separar ações rotineiras de pendências existentes e agrupar por intenção. Validar a prioridade com Nathan antes de fixar a ordem; não criar KPIs. Comandos sugeridos: `$impeccable layout`, `$impeccable distill`.

### A4 — P2: a composição e o encerramento do empréstimo deixam dúvidas evitáveis

**Evidência:** captura `j08` e `LoanCreation.tsx`: cinco entradas distribuídas em grandes blocos, botão Adicionar e botão Solicitar Empréstimo separados por tabela vazia genérica. No sucesso (linha 180), “Redirecionando...” acompanha limpeza de seleção, sem navegação no handler. Prazo de cinco dias é enviado no código (linha 168), mas não aparece como contexto nessa superfície.

**Consequência provável:** o primeiro uso exige compreender seleção, inclusão na lista e envio; no fim, a promessa de redirecionamento não encontra ação correspondente no handler. Não se conclui que o empréstimo falha ou que dados estejam incorretos.

**Direção:** organizar visualmente responsável, composição e revisão; explicar o vazio (“Adicione o primeiro material”) e qual ação apenas adiciona à lista. Mostrar informações existentes necessárias à revisão, preservando regras. Encerrar com confirmação persistente e destino coerente, sem promessa falsa. Comandos sugeridos: `$impeccable layout`, `$impeccable clarify`.

### A5 — P2: o perfil esconde dados longos apesar de haver espaço disponível

**Evidência:** captura `j10` trunca nome, email e responsável. `components/screens/InfoContainer.tsx` fixa metade da largura em desktop, altura h-20 e valores nowrap/overflow-hidden; `pages/mentee/Profile.tsx` distribui campos em percentuais e mantém quatro cartões na mesma linha. Não há expansão no componente examinado.

**Consequência provável:** conferência de identidade e contato fica difícil. O usuário visual perde justamente a parte distintiva dos nomes e endereços; dados sintéticos longos da captura já expõem o caso.

**Direção:** usar agrupamentos semânticos “Seus dados” e “Responsável”, permitir quebra de linhas, largura conforme conteúdo e empilhamento em telas estreitas. Não esconder informação necessária somente para preservar altura uniforme. Comandos sugeridos: `$impeccable adapt`, `$impeccable typeset`.

## Carga cognitiva

O limite de quatro opções é usado aqui como sinal de inspeção, não lei universal de usabilidade. Pontos com mais de quatro alternativas: seis atalhos no início administrativo; cinco atalhos no início do mentor; cinco entradas principais na lateral desses perfis. Os doze valores possíveis de unidade aparecem sob seletor pesquisável, portanto não são doze decisões simultaneamente expostas na página.

Falhas no checklist: hierarquia fraca entre pendência e consulta no início; mudança de vocabulário entre produtos/materiais e utilizadores/usuários; erro de seleção comunicado por cor; vazio genérico sem próxima ação; informações cortadas no perfil. Acertos: blocos Usuário e Produtos explicitam a sequência; navegação com texto e seleção pesquisável ajudam reconhecimento. Não se somam todos os links da tela como uma única carga mental.

## Jornada emocional esperada, não medida

**Entrada:** marca e formulário curto dão familiaridade; frase genérica e “Submeter Login” são pouco naturais. **Orientação:** a saudação acolhe, mas não ajuda tanto a retomar trabalho. **Composição:** seleção de responsável e materiais pode trazer sensação de controle; campos inválidos sem explicação e vazios ambíguos são vales de confiança. **Momento crítico:** antes de solicitar, itens e unidades precisam estar claros, junto das condições existentes. **Encerramento:** é o ponto que deveria aliviar dúvida; “Redirecionando...” sem navegação identificada enfraquece esse fim. Aplicar a regra pico-fim priorizando revisão e confirmação, sem animação celebratória que concorra com estado operacional.

## Percursos de personas

- **Alex, usuário experiente (administrador):** entrar → início → solicitações. Encontra seis atalhos equivalentes sob saudação dominante. Sinal de atrito: pouca distinção entre atender pendências e apenas consultar histórico. Não foi medido tempo de conclusão; não se propõem ações em lote como nova funcionalidade.
- **Jordan, primeiro uso (mentor):** criar empréstimo → selecionar usuário e material → adicionar → solicitar. Sinais de dúvida: Utilizadores/Usuário, Adicionar sem objeto explícito, vazio genérico e fim que promete redirecionamento. É hipótese de compreensão, não relato de abandono.
- **Sam, navegação assistiva:** percorrer seletores da criação. Sinal técnico concreto: título não associado, nomes iniciais repetidos e erro só na borda. Verificação com leitor de tela, contraste, teclado e zoom permanece necessária antes do aceite.

## Observações menores e direção inicial

Padronizar início/Home, Empréstimos, Materiais e Entrar é uma melhoria de linguagem. Rever ícones de busca redundantes nas telas que já possuem campo de pesquisa. A presença de tokens dark não comprova tema escuro pronto. O login usa largura w-96 sem limite responsivo local; deve ser validado a 320/375 px antes de afirmar conformidade. Não há medição de contraste neste relatório.

Direção para explorar, ainda sem aprovação: uma interface de trabalho precisa, com nome da página, contexto e ação dominante próximos; dados tabulares legíveis e unidades sempre junto às quantidades; ênfase de cor reservada a ação/estado; marca institucional presente sem ocupar o centro da tarefa. O verde pode ser preservado ou reformulado: a decisão depende das propostas e de Nathan, não deste diagnóstico.

## Questões para a síntese

1. Qual decisão o administrador deve conseguir tomar imediatamente ao entrar: atender pendências, localizar material ou revisar empréstimos?
2. Que informações já existentes o mentor precisa confirmar para sentir segurança antes de solicitar?
3. A identidade deve comunicar principalmente precisão técnica, proximidade educacional ou vínculo ambiental, e qual evidência institucional sustenta essa prioridade?

Inspeção visual ao vivo: aguardando URL preparada pelo agente principal para concluir esta evidência.
