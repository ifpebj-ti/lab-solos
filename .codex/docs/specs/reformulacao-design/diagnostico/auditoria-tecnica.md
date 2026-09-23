# Auditoria técnica — linha de base parcial

Data: 2026-09-22. Estado: inspeção de código e compilação concluídas; navegação real, contraste renderizado, leitor de tela, desempenho em navegador e matriz responsiva pendentes.

## Método e limitações

As avaliações A e B foram iniciadas em contextos independentes. A deixou relatório de código e capturas anteriores; B deixou o detector, mas não concluiu a verificação. Os três subagentes foram interrompidos por limite de uso. O agente principal leu A antes do detector e conferiu os achados técnicos abaixo. Esta síntese não equivale a uma revisão independente completa.

O frontend foi instalado com `npm.cmd ci --no-audit --no-fund`, executado por Vite em 127.0.0.1:4173 e compilado com `npm.cmd run build`. A tentativa de abrir o navegador por CUA retornou `No browser is available`. Não houve acesso ao backend, login, injeção de detector, overlay ou testes em dispositivo. O servidor temporário foi encerrado. Nenhuma interface foi alterada.

## Resultado técnico

| Dimensão | Nota provisória 0–4 | Evidência e limite |
|---|---:|---|
| Acessibilidade | 2 | Feedback acessível existe, mas PopoverInput não associa título/erro e usa borda como único feedback do erro; leitura assistiva pendente |
| Desempenho | 1 | Compilação gera JS principal de 4.007,47 kB (gzip 1.219,10 kB); não é medição de latência ou Core Web Vitals |
| Responsividade | 2 | Componentes e testes responsivos existem, mas login fixa w-96 e perfil corta conteúdo; testes não executados nesta auditoria |
| Temas | 1 | Tokens `.dark` convivem com fundos brancos e cores fixas; não foi encontrado controlador de tema na busca feita |
| Integridade visual | 2 | Componentes compartilhados coexistem com tratamento inconsistente de dados e erros |
| Total | 8/20 | Nota de inspeção parcial, não certificação da aplicação executada |

## Achados priorizados

| ID | Severidade | Local | Problema e impacto | Encaminhamento |
|---|---|---|---|---|
| T01 | P1 | `components/global/inputs/PopoverInput.tsx:38` | Título em parágrafo sem associação ao combobox; mensagem error não renderizada; nomes iniciais repetem Selecione. Prejudica identificação e recuperação | Rótulo associado, erro textual e estado inválido; `audit`/`clarify` |
| T02 | P1 | `components/screens/SearchMaterialComponent.tsx:88`; `pages/mentor/LoanCreation.tsx:113` | Falha de carga deixa lista vazia sem recuperação; usuário não distingue indisponibilidade de ausência | Estados distintos e ação de recuperação; `harden` |
| T03 | P1 | `pages/Login.tsx:74` | Largura w-96 corresponde a 384 px, acima de viewports de 320 e 375; risco evidente no código, transbordamento real ainda não medido | Limite fluido e confirmação no navegador; `adapt` |
| T04 | P2 | Saída da compilação; `routes.tsx` e `index.css` | JS principal 4 MB; onze arquivos de fonte emitidos entre 342 e 373 kB cada. Emissão não prova download simultâneo, mas exige orçamento e análise de carga | Medir entrada e jornadas, avaliar carregamento de dependências e fontes na techspec; `optimize` |
| T05 | P2 | `components/screens/InfoContainer.tsx:13` | Altura fixa e nowrap/overflow-hidden cortam informação em perfil | Quebra de texto e agrupamento legível; `adapt`/`typeset` |
| T06 | P2 | `index.css`; `InfoContainer.tsx`; `PopoverInput.tsx` | Fundos e cores fixos não acompanham todos os tokens de tema; claro/escuro ainda não demonstrados | Tratar ambos os temas como cobertura completa na nova identidade |
| T07 | P2 | `pages/mentor/LoanCreation.tsx:180` | Sucesso anuncia Redirecionando, mas handler limpa estado sem navegação | Confirmação e destino coerentes; `clarify` |

Classificação: 0 P0, 3 P1 e 4 P2 na amostra; T03 é risco estático a confirmar. Não confundir esse total com os alertas do detector. Priorizar feedback e controles, em seguida organização/responsividade, temas e desempenho; finalizar com `polish` após revisão funcional.

## Detector: contextualização

O arquivo `detector.json` contém 9 avisos, em duas regras: 6 `overused-font` para os pesos da mesma família Inter e 3 `border-accent-on-rounded` em NotificationIcon:210, SidebarNotificationButton:150 e SimpleNotificationIcon:196.

As três bordas pertencem a indicadores de carregamento `animate-spin rounded-full`, não a cartões decorativos: falsos positivos para a recomendação emitida. Os seis avisos de Inter são um único sinal estilístico repetido por peso; não provam problema de UX ou aparência genérica. Não recomendar troca de fonte só para zerar o detector. Nenhum dos nove avisos substitui T01–T07.

Houve falha na primeira tentativa de salvar a saída por diretório ausente; a captura foi repetida por esse motivo. O JSON foi preservado e não foi executado novamente na síntese.

## Compilação e verificações pendentes

Compilação concluída com sucesso: 3.835 módulos, CSS 75,83 kB (gzip 13,50 kB), JavaScript principal 4.007,47 kB (gzip 1.219,10 kB). Avisos: `/env.js` não empacotado como módulo, referência a `laboratory.png` não resolvida na compilação e pacote principal acima do limite de aviso. Os dois primeiros precisam ser conferidos no ambiente servido; não são prova isolada de imagem quebrada ou configuração inválida.

O arquivo rastreado de cache TypeScript gerado pela compilação foi restaurado ao conteúdo anterior, que estava limpo. Dependências locais e saída de compilação permanecem disponíveis. Não executar atualização de dependências como efeito desta auditoria.

Permanecem pendentes: medir contraste real, foco/teclado/leitor de tela, zoom 200%, toque, rede lenta, resposta de tarefas, temas renderizados e testes automatizados das jornadas. A compilação aprovada não implica aprovação de testes. Para o plano visual pode-se usar a evidência de código e as capturas documentadas, deixando explícito que não há aceite de runtime.
