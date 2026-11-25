# Especificação técnica de proteção da API e do proxy

- **Status** — Rascunho, validação de design pendente
- **PRD** — [Proteção da API e do proxy](prd.md)
- **Atualizado em** — 2026-11-15
- **Validação de design** — pendente. A validação de descoberta foi dispensada pelo usuário no PRD.

## Resumo técnico

Definir os contratos de publicação, limites, paginação e erros na API e no Caddy. Usar a matriz de acesso de contas para autorizar ações e limitar as informações entregues ao navegador. Os parâmetros de limites, as exceções públicas e as decisões de compatibilidade condicionam a configuração final.

## Estado atual

- `Program.cs` configura encaminhamento confiável, CORS de desenvolvimento, autenticação, autorização e verificação de prontidão. A documentação interativa é registrada em desenvolvimento e produção. `SystemController` expõe quantidades e uma verificação própria de saúde com informação de versão. `EmailController` mantém o envio genérico e os caminhos vigentes e legados de recuperação.
- O `Caddyfile` encaminha o grupo da API ao backend e a navegação restante ao frontend. O arquivo `infra/proxy/security-headers.caddy` define cabeçalhos comuns e CSP para o frontend. `frontend/nginx.conf` mantém o fallback da SPA e uma regra de cache para recursos estáticos. A publicação da API e os erros produzidos pelo proxy precisam de contrato explícito.
- Cadastro e criação de empréstimo passam por `UsuariosController` e `EmprestimosController`. As listagens usam contratos de retorno diferentes. A auditoria usa `Pagina` e `TamanhoPagina` no filtro, com `Skip` e `Take` no repositório. O relatório tem consultas próprias. Os clientes de auditoria usam filtros e resultados tipados em `frontend/src/integration/Auditoria.ts`.
- A API combina `ProblemDetails`, erros textuais e retornos de domínio específicos. A integração de autenticação já usa políticas de limitação dedicadas. `Home.tsx` tem atalhos por perfil e a página administrativa consome o serviço de quantidades.

## Arquitetura proposta

### Fluxos e componentes

1. **Admissão e validação de tamanho.** O proxy aplica o limite de transporte aprovado. A API aplica frequência e volume conforme a operação e a identidade disponível, antes do ponto em que a recusa poderia deixar registros persistidos. Os validadores de entrada tratam tamanho de campos pelas unidades publicadas. A regra de negócio de estoque continua sendo verificada pelo domínio de empréstimos.
2. **Listagem, relatório e exportação.** Normalizar os parâmetros aceitos, aplicar filtros e escopo autorizado antes de ordenar e limitar o resultado, e usar desempate estável. Reaplicar autorização a cada página ou exportação. Coordenar os tetos, o contrato de excesso e o catálogo de exportações com [notificações e auditoria](../notificacoes-e-auditoria/techspec.md).
3. **Superfície publicada.** Cruzar as rotas efetivas de `Program.cs`, controladores e frontend com a matriz de [segurança de contas e sessões](../seguranca-de-contas-e-sessoes/techspec.md). Registrar por método e caminho o ambiente, a categoria, os perfis, a restrição de sessão, os cabeçalhos, o resultado de ausência e o consumidor. A página pública usa a projeção aprovada. Métricas operacionais e envio genérico seguem autoridade explícita. O inventário marca o destino de cada variante de recuperação e mantém testável a jornada vigente. Definir um resultado mínimo de prontidão que satisfaça o consumidor autorizado e limitar a documentação interativa ao desenvolvimento.
4. **Resposta de API e navegação.** A API aplica o contrato de cache e cabeçalhos à resposta final, inclusive para falhas. O proxy mantém o contrato de cada superfície também em respostas que ele próprio gera. O fallback reconhece as categorias aprovadas de API, caminho navegável, recurso estático e caminho inexistente. A política CORS existente por ambiente permanece a referência para os testes de compatibilidade, coordenada com a decisão de sessão por cookie.
5. **Erros e datas.** Centralizar categorias públicas de validação e domínio no backend e reaproveitar o mapeamento de erros do frontend. Separar data civil, sem conversão de fuso, de instante com fuso explícito. Definir no contrato do filtro as fronteiras de intervalo e o fuso usado quando uma data civil delimita instantes.

## Contratos e APIs

| Superfície | Contrato proposto |
| --- | --- |
| Cadastro e criação de empréstimo | A tabela de admissão registra operação, contexto, identidade, dimensão, teto, unidade, janela, comportamento no limite, recusa e disponibilidade. Usar `429` e `Retry-After` quando o limite temporal adotar o padrão da autenticação. Preservar a transação de negócio e o código de validação aplicável. |
| Campos e tamanho total | Validar dimensão e unidade no responsável de cada camada. Recomenda-se `413` para excesso de corpo e `400` com código de campo para validação textual. Confirmar quais respostas o proxy pode produzir e manter o formato público da API para a categoria. |
| Páginas e exportações | Cada perfil autorizado recebe conjunto limitado e estado vazio válido. A continuação preserva filtros e ordenação e reavalia a permissão. O tratamento de página excedente e o envelope dependem do contrato com consumidores atuais. |
| Ações reservadas e caminhos públicos | A autorização e as exceções são explícitas e validadas no servidor. O proxy publica o inventário correspondente. O contrato distingue ausência de sessão, falta de permissão e recurso ausente conforme a política do recurso. |
| Saúde e documentação | O resultado de saúde entrega estado mínimo e sinal de prontidão compatível com o monitoramento aprovado. Documentação interativa fica disponível em desenvolvimento. O catálogo resolve a coexistência das verificações atuais. |
| Navegação e caminhos inexistentes | Caminho SPA válido abre a aplicação. Ausência de recurso estático segue a política da classe. Caminho de API inexistente recebe erro de API com `404` e conteúdo próprio. Validar o comportamento final de caminhos desconhecidos de navegação com os consumidores. |
| Cache, CORS e cabeçalhos | Respostas de API recebem `Cache-Control: no-store` em sucesso, erro e ausência de sessão. Compor `Vary` para as propriedades que produzem variação, incluindo `Origin` quando aplicável. CSP e `Permissions-Policy` integram a política de API. Preservar as proteções existentes de navegador e limitar os metadados ao inventário aprovado. |
| Categorias de erro e codificação | Recomenda-se evoluir os contratos atuais de `ProblemDetails` com status, código de máquina, orientação, campos quando aplicáveis e identificador de correlação. Validar JSON inválido e texto UTF-8 no contrato e na UI. Fixar `400`, `404` e `409` conforme as classes aprovadas de validação, ausência e conflito. |

## Dados e migrações

A política de paginação pode operar sobre os registros atuais com ordenação estável e índices verificados em base sintética. O armazenamento de cotas poderá exigir estrutura compartilhada ou reutilização dos mecanismos atuais, dependendo da topologia e da semântica aprovada. Planejar migração aditiva e limpeza conforme a janela documentada se houver persistência de contadores. A política de limites da aplicação deve ser independente da representação de estoque e reconciliada com as cotas de emissão e exportação da auditoria.

## Segurança, privacidade e permissões

A API continua responsável por perfil, vínculo e autorização de cada registro. O proxy aplica política coerente de publicação, cabeçalhos, limites gerais de transporte e encaminhamento confiável. Projeções públicas da página inicial contêm somente campos aprovados. Os relatórios e os arquivos de exportação compartilham a mesma filtragem de autorização, sem reconstruir conjunto fora do escopo por metadados ou agregações. Expor apenas código, orientação e correlação permitidos nas falhas. Telemetria e evidências usam dados sintéticos e rótulos sem dados identificáveis.

## Falhas, observabilidade e operação

- Observar contagens de recusa por operação e dimensão, classes de erro, erros gerados pelo proxy e duração de consultas. Correlacionar resposta pública e diagnóstico por identificador. Limitar acesso a registros internos e proteger informações sensíveis.
- Exercitar as falhas de dependência do mecanismo de cotas com ambiente controlado. Definir por operação quando indisponibilidade impede admissão e qual erro observável é apresentado. A recusa de admissão preserva o estado anterior.
- Validar na saída efetiva do proxy respostas de sucesso, validação, ausência de sessão, ausência de caminho e indisponibilidade. A responsabilidade por cabeçalhos em cada camada precisa estar no inventário para evitar lacunas, valores duplicados ou divergência em CORS.

## Compatibilidade, disponibilização e reversão

Inventariar consumidores antes de mudar formato, paginação e rotas. Ensaiar backend, frontend e proxy em composição sintética, com rotas de recuperação, navegação direta e respostas de origem. Disponibilizar mudança de contrato junto dos consumidores afetados e observar capacidade e erros por classe. A reversão restaura versões compatíveis mantendo autenticação, restrição de publicação e cabeçalhos mínimos. Caso um limite precise ser ajustado, preservar o teto e a regra de autorização do recurso durante o ajuste. Usar configuração anterior validada no ensaio e preservar dados de auditoria.

## Estratégia TDD e pirâmide de testes

### RED

Especificar testes de contrato para o inventário, categorias de respostas e cabeçalhos por superfície. Cobrir frequência e volume abaixo, no limite e acima, com relógio e registros sintéticos. Verificar paginação autorizada, vazio, teto, continuação e concorrência de contadores. Testar datas civis e instantes equivalentes, retorno de validação e texto acentuado. Exigir em E2E HTTPS a disponibilidade das jornadas legítimas e o resultado publicado por classe de caminho.

### GREEN

Aplicar política de limites, validação e escopo antes da persistência ou projeção, conforme a etapa. Atualizar as integrações e o contrato de erros. Aplicar cabeçalhos e regras de publicação em API e proxy e executar as jornadas afetadas na composição de testes.

### REFACTOR

Consolidar políticas reutilizáveis de paginação, erro, validação e cabeçalhos. Preservar testes pequenos de regras, contratos e integrações com PostgreSQL ou proxy, e E2E para navegação, autenticação, recuperação e mensagens.

## Esteira de qualidade

| Área | Comando local | Verificação de CI | Lacuna ou ação |
| --- | --- | --- | --- |
| Backend .NET 8 e xUnit | Na raiz, `dotnet test backend/backend.sln -c Release --nologo --disable-build-servers`, com Docker para Testcontainers | `Container CI` testa a solução, que inclui `Tests` | Estender `BrowserSecurityHeadersTests`, `TrustedProxyTests`, cadastro, empréstimos e contratos de auditoria com parâmetros aprovados |
| Frontend React/Vite | Em `frontend`, `npm ci`, `npm run test -- --run`, `npm run lint` e `npm run build` | `Frontend quality` | Ampliar verificações de Home, erros e consumidores de paginação e exportação |
| Proxy e navegador | Na raiz, `docker compose --project-name lab-solos-ci-browser-security --file docker-compose-security-e2e.yml config --quiet`. Em `frontend`, `npx --no-install playwright install chromium` e `npm run test:e2e -- --project=security` com a composição sintética configurada | `Browser security E2E` valida a composição, sobe a pilha descartável e roda Playwright | Cobrir política de API por categoria, fallback, saúde e contrato conjunto de origem e sessão |
| Política versionada | Na raiz, `python -m unittest discover -s .github/scripts/tests -p "test_browser_security_policy.py" -v` | `Container CI` executa `test_*.py` dessa pasta | Estender asserções de política e do inventário sem depender de ambiente publicado real |

`container-ci.yml` executa pré-merge para PR de `develop` aberto, sincronizado, reaberto, editado ou pronto para revisão, em `merge_group` e manualmente. É necessário conferir fora deste rascunho a configuração que torna os jobs obrigatórios. `container-release.yml` usa PR fechado para `main` e execução manual na esteira de entrega. Os comandos foram verificados no checkout, com execução da aplicação prevista para a implementação.

## Matriz de rastreabilidade

| Requisito | Componentes | Testes | Evidência esperada |
| --- | --- | --- | --- |
| RF-001 | Cadastro, empréstimo, admissão | Unitário, integração | Limites por operação e preservação na recusa |
| RF-002 | Listagens, auditoria, exportações | Integração, contrato | Continuação, teto, filtro e escopo |
| RF-003 | Proxy, transporte, validadores | Contrato API/proxy | Cada excesso retorna a classe esperada |
| RF-004 | Inventário, Home, métricas, e-mail | Contrato, E2E | Exceções, consumidores e ações reservadas |
| RF-005 | Saúde, Swagger, Caddy, Nginx | Contrato, E2E | Prontidão mínima e caminhos classificados |
| RF-006 | Cabeçalhos da API e proxy | Contrato | `no-store` e `Vary` conforme representação |
| RF-007 | Política de cabeçalhos | Contrato, E2E | Proteções e metadados por superfície |
| RF-008 | Respostas públicas, domínio, UI | Contrato, UI | Código, status e orientação por categoria |
| RF-009 | Filtros, JSON, frontend | Integração, UI | Semântica de datas e UTF-8 |
| RNF-001 | Matriz de limites e paginação | Integração, E2E | Limites documentados e fluxos permitidos verificáveis |
| RNF-002 | CORS, proxy, frontend | E2E HTTPS | Navegação, autenticação e recuperação por ambiente |
| RNF-003 | Catálogo de erros e logs | Contrato, UI, inspeção sanitizada | Correlação, privacidade e orientação em texto |
| CA-001 | Admissão e criação | Integração com relógio controlado | Casos de fronteira, regras de negócio e atomicidade |
| CA-002 | Listagens e exportação | Integração, contrato | Teto, continuação com escopo e conjunto vazio |
| CA-003 | Validação de tamanho de página | Contrato | Resultado conforme política e dentro do máximo |
| CA-004 | Validação de corpo e campos | Contrato API/proxy | Fronteiras válidas e erros de cliente coerentes |
| CA-005 | Inventário de publicação | E2E, contrato | Perfis, exceções, ações reservadas e Home |
| CA-006 | Prontidão, Swagger, fallback | Contrato, E2E | Resultado correto por ambiente e categoria |
| CA-007 | Cabeçalhos e metadados | Contrato em API e proxy | Sucesso e falha dentro do inventário |
| CA-008 | CORS e jornadas de navegador | E2E HTTPS | Origens e jornadas conforme política |
| CA-009 | Cache da API | Contrato | `no-store` também na falha e sem sessão |
| CA-010 | Validação e domínio | Contrato, UI | Erros de entrada, ausência e conflito com orientação |
| CA-011 | Datas, JSON e acentuação | Integração, UI | Fronteiras temporais, erro de JSON e texto acentuado |
| CA-012 | Correlação e registros | Integração, inspeção sanitizada | Diagnóstico autorizado correlacionado à classe pública |

## Alternativas e decisões

| Decisão | Alternativas | Recomendação | Escolha confirmada | Consequências |
| --- | --- | --- | --- | --- |
| Armazenamento e resposta de limite | Contadores por instância ou admissão compartilhada | Compartilhar quando o teto for global ou a aplicação tiver múltiplas réplicas | Definida na [decisão local](../decisoes-de-planejamento.md#api-limites-e-auditoria) | Condiciona topologia, concorrência e falha da dependência |
| Paginação | Página numérica com ordenação estável ou continuação por cursor | Partir dos consumidores por página e avaliar cursor para grandes conjuntos | Definida na [decisão local](../decisoes-de-planejamento.md#api-limites-e-auditoria) | Condiciona filtros, envelope, índices, exportação e compatibilidade |
| Publicação, saúde e recuperação | Compatibilidade temporária por rota inventariada ou retirada coordenada de trajetos legados | Mapear consumidores e usar o mínimo de estado de saúde necessário | Definida na [decisão local](../decisoes-de-planejamento.md#api-limites-e-auditoria) | Condiciona Home, monitoramento, fallback e recuperação |
| Cabeçalhos, erros e datas | Emissão central na aplicação com complementos no proxy ou política de borda como responsável principal pelas respostas publicadas | API responsável pelo próprio contrato, com proxy responsável pelos erros que gera | Definida na [decisão local](../decisoes-de-planejamento.md#api-limites-e-auditoria) | Condiciona contratos finais de metadados, erros, datas, `Vary` e caminhos |

## Riscos e mitigação

Limites insuficientes ou incompatíveis afetam jornadas válidas. Fixar valores com os responsáveis e testar fronteiras e experiência textual. Paginação em conjunto mutável tende a duplicar ou suprimir itens sem critério estável. Documentar ordenação e consistência do conjunto exportado. Mudanças de cabeçalhos, autorização ou fallback podem interromper recuperação e navegação. Ensaiar a composição com os consumidores vigentes e um retorno compatível.

## Perguntas abertas

- Consultar as [decisões de planejamento](../decisoes-de-planejamento.md#api-limites-e-auditoria).
