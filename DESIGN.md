---
name: LabOn
description: Sistema operacional responsivo para gestão de materiais, usuários e empréstimos de laboratório.
colors:
  canvas-light: "rgb(246 247 244)"
  canvas-dark: "rgb(18 27 23)"
  surface-light: "rgb(255 255 255)"
  surface-dark: "rgb(26 39 32)"
  action-light: "rgb(23 107 73)"
  action-dark: "rgb(31 111 71)"
  navigation-light: "rgb(18 75 56)"
  navigation-dark: "rgb(13 57 42)"
  text-light: "rgb(24 37 32)"
  text-dark: "rgb(241 246 242)"
  border-light: "rgb(183 198 188)"
  border-dark: "rgb(72 96 81)"
  focus-light: "rgb(93 47 113)"
  focus-dark: "rgb(207 157 224)"
  danger-light: "rgb(180 35 24)"
  danger-dark: "rgb(248 126 115)"
typography:
  display:
    fontFamily: "rajdhani-semibold, Rajdhani, sans-serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.1
  body:
    fontFamily: "inter-regular, Inter, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "inter-medium, Inter, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.25
rounded:
  sm: "0.375rem"
  md: "0.5rem"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.action-light}"
    textColor: "rgb(255 255 255)"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  input-default:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.text-light}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
---

# Design System: LabOn

## Overview

**Creative North Star: “O Laboratório Vivo”**

LabOn é uma interface de operação: precisa ser rápida de escanear, segura para decisões administrativas e previsível quando a pessoa muda de perfil, tema ou largura. A identidade combina a precisão de um caderno de laboratório com uma camada de verde institucional, mantendo o conteúdo e os estados de serviço no centro da tela.

O sistema trabalha com superfícies claras ou escuras, contraste semântico, tipografia Inter para leitura e Rajdhani para títulos/ênfase de marca. A responsividade é parte do contrato: tabelas se tornam registros roláveis/empilhados, a navegação vira gaveta em larguras estreitas e o foco permanece visível para teclado.

**Key Characteristics:**

- Operacional, denso e orientado a tarefa.
- Verde institucional como ação e navegação.
- Estados de sucesso, aviso, erro e foco com tokens próprios.
- Temas claro/escuro e jornadas por Administrador, Mentor e Mentorado.

## Colors

A paleta canônica está em `frontend/src/styles/tokens.css`; os valores abaixo registram as variáveis que o runtime realmente consome.

### Primary

- **Verde ação claro** (`rgb(23 107 73)`): ações primárias, confirmação e CTA de operação.
- **Verde ação escuro** (`rgb(31 111 71)`): ação primária no tema escuro.

### Neutral

- **Canvas claro** (`rgb(246 247 244)`) e **canvas escuro** (`rgb(18 27 23)`): fundo global.
- **Superfície clara** (`rgb(255 255 255)`) e **superfície escura** (`rgb(26 39 32)`): cards, formulários e áreas de conteúdo.
- **Texto primário claro/escuro** (`rgb(24 37 32)` / `rgb(241 246 242)`): leitura principal.
- **Borda clara/escura** (`rgb(183 198 188)` / `rgb(72 96 81)`): separação de campos e superfícies.

### Named Rules

**The Token-First Rule.** Estados, temas e superfícies devem consumir os tokens de `tokens.css`; não introduza cores ad hoc em consumidores.

## Typography

**Display Font:** Rajdhani (com `sans-serif`)  
**Body Font:** Inter (com `sans-serif`)  
**Label/Mono Font:** Inter Medium para rótulos e controles.

**Character:** Rajdhani dá à marca uma assinatura técnica e compacta; Inter mantém formulários, tabelas e mensagens longas legíveis.

### Hierarchy

- **Display** (600, `2rem`, 1.1): títulos de páginas e marca.
- **Headline** (600, `1.5rem`, 1.2): cabeçalhos de seção e estados principais.
- **Title** (500, `1.125rem`, 1.3): cards, detalhes e títulos de registro.
- **Body** (400, `1rem`, 1.5): instruções, tabelas e mensagens.
- **Label** (500, `0.875rem`, 1.25): botões, campos, filtros e navegação.

**The Readable-First Rule.** Inter é a escolha padrão para dados e instruções; Rajdhani fica reservado à hierarquia de marca e títulos.

## Layout

O shell usa uma área de conteúdo com navegação lateral em desktop e gaveta controlada por botão em larguras menores que o breakpoint de navegação. As suítes responsivas exercitam 320, 375, 767, 768 e 1440 px; o layout foi medido também em zoom 200% sem overflow horizontal de página. Tabelas e históricos recebem contêiner próprio quando precisam rolar, preservando o viewport.

O ritmo usa incrementos de 4/8 px, com `1rem` como espaçamento de conteúdo e `1.5rem` para agrupamentos maiores. Formulários, cartões e listas compartilham o mesmo alinhamento de título, feedback e ação de retorno.

## Elevation & Depth

O sistema é predominantemente tonal: canvas, superfície, superfície elevada e linha de borda comunicam profundidade. Sombras são discretas e não substituem contraste de borda ou estado. Modais, popovers e gavetas elevam-se por camada e foco, mantendo o fundo subordinado.

## Shapes

Campos, botões, cards e popovers usam cantos suaves de 6–8 px, derivados de `--radius: 0.5rem`. Bordas são finas, tokenizadas e persistem em ambos os temas. Controles de toque preservam área de interação confortável e foco visível; tabelas não usam arredondamento para esconder seu limite de rolagem.

## Components

### Buttons

- **Shape:** raio médio (`0.5rem`) e altura compacta de operação.
- **Primary:** fundo `--color-action`, texto branco e padding aproximado `0.5rem 1rem`.
- **Hover / Focus:** mudança de tonalidade; foco usa `--color-focus`/`--ring` e nunca depende apenas de cor.
- **Secondary / Ghost:** superfície, borda ou fundo transparente conforme a importância da ação.

### Cards / Containers

- **Corner Style:** 6–8 px.
- **Background:** `--color-surface` ou `--color-surface-raised`.
- **Border:** `--color-border` para separar áreas sem linhas pesadas.
- **Internal Padding:** escala de 8/16/24 px conforme densidade.

### Inputs / Fields

- **Style:** superfície tokenizada, borda de input e raio médio.
- **Focus:** anel/contorno `--color-focus`, rótulo associado e mensagem vinculada quando há erro.
- **Error / Disabled:** danger/estado desabilitado sem apagar o valor ou a instrução útil.

### Navigation

Navegação lateral verde no modo institucional, com item atual distinguido por estado semântico. Em telas estreitas, a gaveta é aberta por botão nomeado, recebe foco e oferece fechamento previsível. O cabeçalho conserva conta, tema, busca e retorno entre módulos.

### Tables / Records

Históricos usam colunas rotuladas, células responsivas, estado vazio distinto de erro e ações associadas ao registro. Em detalhe, IDs, status, quantidade/unidade, retorno e erro contextual são preservados. Exportações PDF/Excel são carregadas sob demanda e sinalizadas com estado de processamento.

## Do's and Don'ts

### Do:

- **Do** consumir os tokens de `frontend/src/styles/tokens.css` para cor, foco, estado e tema.
- **Do** manter rótulos, nomes de perfil e mensagens de erro associados ao controle que os produz.
- **Do** validar a jornada em claro/escuro, teclado e 320 px antes de considerar uma tela pronta.
- **Do** preservar retorno, query/ID e contexto do perfil ao navegar entre lista e detalhe.

### Don't:

- **Don't** introduzir cor fixa em toast, portal, formulário ou tabela.
- **Don't** usar h-screen aninhado ou uma largura fixa que force rolagem horizontal de página.
- **Don't** ocultar o foco, remover texto de ação ou depender de ícone sem nome acessível.
- **Don't** documentar ações que o perfil ou o runtime não oferecem; impressão separada não existe, PDF é a saída equivalente atual.
