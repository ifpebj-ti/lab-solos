# Matriz de publicação da API

- **Status** — Aplicada localmente
- **Requisitos** — RF-004, RF-005, CA-005, CA-006
- **Decisão** — [API, limites e auditoria](../decisoes-de-planejamento.md#api-limites-e-auditoria)
- **Inventário-base** — [Inventário de publicação atual](inventario-publicacao-atual.md)
- **Atualizado em** — 2026-11-17

Esta matriz registra o acesso e a resposta publicados para as superfícies de recuperação, indicadores, envio genérico de e-mail e saúde. O restante das rotas segue o inventário-base e as políticas de autorização já aplicadas aos controladores.

| Método e caminho | Acesso | Resposta publicada | Consumidor e observações |
| --- | --- | --- | --- |
| `POST /api/Email/request-password-reset` | Público, com limitação própria | `202 Accepted` neutro | Jornada vigente de recuperação de senha |
| `POST /api/Email/solicitar-redefinicao` | Público, com limitação própria | `202 Accepted` neutro | Alias legado de solicitação; preservar durante compatibilidade |
| `POST /api/Email/reset-password` | Público, com validação e limitação próprias | `204`, `400`, `409`, `429` ou indisponibilidade documentada | Jornada vigente de redefinição |
| `POST /api/Email/redefinir-senha` | Público, com validação e limitação próprias | Mesmo contrato de redefinição, aceitando o token legado | Alias legado; preservar durante compatibilidade |
| `POST /api/Email/enviar` | Política `ApenasAdministradores` | Confirmação de envio ou `500` em falha de entrega | Envio genérico interno; nunca é rota pública de recuperação |
| `GET /api/System/quantities` | Usuário autenticado com sessão concluída; Administrador, Mentor e Mentorado | Somente `{ produtos }`, com contagens por tipo e `Total` | Pesquisa de materiais. Não publicar alertas, usuários, empréstimos ou total emprestado |
| `GET /health` | Público para sondagem interna | Texto `ready` ou `not_ready` conforme prontidão | Health check interno mapeado pelo host |
| `GET /api/System/health` | Público para verificação interna do deploy | JSON `{ status: "healthy", version: "1.0" }` | O deploy lê `status`; a versão fica em propriedade separada |
| Swagger UI e documento OpenAPI | Somente no ambiente `Development` | Documentação interativa e `/swagger/v1/swagger.json` | Não registrar a documentação em outros ambientes |

## Regras de aplicação

- A política global requer autenticação e conclusão da troca obrigatória de senha. Rotas de recuperação e as duas verificações de saúde declaram explicitamente sua exceção pública.
- `System/quantities` declara autenticação e projeta exclusivamente a propriedade `Produtos` do serviço. Os três perfis autenticados que usam pesquisa de materiais recebem os mesmos indicadores mínimos.
- O envio genérico usa a política administrativa. Os quatro aliases de recuperação mantêm `AllowAnonymous` e seguem a validação e as proteções de abuso do fluxo de credenciais.
- A prontidão `/health` e a verificação versionada `/api/System/health` são contratos distintos. A primeira serve à sondagem do processo; a segunda mantém a verificação do script de publicação.
- Swagger só é registrado no ramo `Development` de `Program.cs`.

## Evidência local

`ApiPublicationMatrixTests` verifica que os três perfis recebem apenas os indicadores de produtos, que a rota exige autenticação e que a verificação versionada separa estado e versão. `EmailControllerTests` confirma a política administrativa do envio genérico e o acesso público explícito dos aliases de recuperação. `AuthorizationRouteMatrixTests` cobre a política global e a publicação de Swagger por ambiente.
