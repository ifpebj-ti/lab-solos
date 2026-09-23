# LabOn — Contexto do produto

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

O aplicativo atende Administrador, Mentor e Mentorado. Administradores gerem materiais, usuários e solicitações; Mentores operam suas turmas e empréstimos; Mentorados consultam materiais e seus registros permitidos. Visitantes podem entrar, solicitar cadastro ou recuperar acesso conforme as regras existentes.

Perfis e capacidades são sustentados por `frontend/src/routes.tsx` e pelo manual em `docs/manual/`. Nathan confirmou em 2026-09-22 o uso principalmente em computador no laboratório, com celular como apoio. Frequência das tarefas e prioridade entre elas ainda precisam de confirmação.

## Product Purpose

Gerir materiais de laboratório e as jornadas de consulta, cadastro, solicitação, aprovação, empréstimo, devolução e acompanhamento disponíveis no produto. Sucesso significa concluir tarefas autorizadas com informação clara, dados corretos e feedback compreensível em computador e celular.

## Operating Context

O repositório documenta o Laboratório de Solos e Sustentabilidade Ambiental do IFPEBJ e utiliza as categorias de materiais existentes, incluindo químicos, vidrarias e outros. Quantidades, unidades, situação dos registros e vínculos entre pessoas e turmas são informação operacional, não decoração.

A entrada pública atual é o login. As áreas autenticadas têm capacidades distintas por perfil. O manual descreve acesso, responsabilidades e jornadas; suas capturas devem ser conferidas contra a versão corrente antes de servirem como linha de base visual.

## Capabilities and Constraints

- A reformulação confirmada cobre visual e experiência de todas as telas, navegação, organização, estados e passos de tarefas.
- Preservar funcionalidades, dados, permissões, regras de negócio, políticas de autenticação e efeitos das operações.
- Preservar destinos autorizados após autenticação, acesso por links, contexto dos registros e atualização da página.
- Manter as mensagens de sessão, permissão, validação e indisponibilidade distintas e acionáveis, sem detalhes sensíveis.
- Incluir adequação visual dos PDFs existentes e atualização do manual afetado; conservar informações obrigatórias, assinaturas e conteúdo das exportações.
- Não criar funcionalidades ou dados para justificar uma proposta visual; não reintroduzir recursos incompletos removidos da produção.
- A plataforma existente é uma aplicação web com React, TypeScript, Vite e Tailwind. A reformulação não define migração de tecnologia.
- Escopo e fluxo confirmados em `.codex/docs/specs/reformulacao-design/prd.md`; escolhas visuais e critérios de passagem estão nesse documento.

## Brand Commitments

Nathan confirmou a preservação do nome LabOn e dos símbolos institucionais obrigatórios. Os arquivos exatos desses símbolos serão conferidos antes das propostas. A identidade restante pode ser reformulada, inclusive o logotipo próprio mediante proposta explícita. Nenhuma cor, tipografia, composição, tema ou novo logotipo foi aprovado nesta etapa.

## Evidence on Hand

- Rotas e perfis: `frontend/src/routes.tsx`.
- Jornadas e controles de navegação: `frontend/src/navigation/` e `frontend/src/pages/`.
- Ativos e fontes existentes: `frontend/public/`.
- Manual e capturas: `docs/manual/` e `docs/manual/imagens/`.
- Testes de comportamento e regressão: `frontend/src/` e `frontend/e2e/`.
- Não há nesta descoberta medição validada de ganho de produtividade, satisfação ou desempenho. Não transformar exemplos sintéticos em alegações reais.

## Product Principles

- Facilitar a tarefa do laboratório com informação correta e ações inequívocas.
- Expressar identidade própria sem sacrificar leitura, densidade útil ou controle.
- Preservar autorização e comportamento funcional durante a mudança de experiência.
- Tornar estados e recuperação de erros compreensíveis.
- Submeter decisões materiais de experiência e identidade a Nathan com artefatos concretos.

## Accessibility & Inclusion

A reformulação deve funcionar em computador e celular, por teclado e com tecnologia assistiva, com rótulos, foco, contraste e mensagens adequados. Redução de movimento e ampliação de texto não devem impedir tarefas. A matriz de validação e os critérios verificáveis estão no PRD. Nathan confirmou em 2026-09-22 os temas claro e escuro, ambos com validação completa. Isso é um requisito da reformulação, não uma capacidade atual comprovada pela presença de estilos no código.
