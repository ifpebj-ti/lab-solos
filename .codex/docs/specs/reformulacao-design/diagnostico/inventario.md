# Invent?rio de superf?cies

Data: 2026-09-22. Fonte: frontend/src/routes.tsx. Invent?rio est?tico; n?o representa valida??o no navegador.

44 padr?es: 19 Administrador, 13 Mentor, 6 Mentorado e 6 globais. Incluem um alias e o tratamento de rota n?o encontrada.

| Rota | ?rea | Tipo | Valida??o atual |
|---|---|---|---|
| `/admin` | admin | inicio | C?digo; navegador pendente |
| `/admin/profile` | admin | tela | C?digo; navegador pendente |
| `/admin/insert` | admin | tela | C?digo; navegador pendente |
| `/admin/follow-up` | admin | tela | C?digo; navegador pendente |
| `/admin/users` | admin | tela | C?digo; navegador pendente |
| `/admin/search-material` | admin | tela | C?digo; navegador pendente |
| `/admin/products/:id/history` | admin | tela | C?digo; navegador pendente |
| `/admin/view-class` | admin | tela | C?digo; navegador pendente |
| `/admin/view-class-mentor` | admin | tela | C?digo; navegador pendente |
| `/admin/view-history-class-by-id` | admin | tela | C?digo; navegador pendente |
| `/admin/verification` | admin | tela | C?digo; navegador pendente |
| `/admin/history/mentoring` | admin | tela | C?digo; navegador pendente |
| `/admin/history/loan` | admin | tela | C?digo; navegador pendente |
| `/admin/register-request` | admin | tela | C?digo; navegador pendente |
| `/admin/all-loans` | admin | tela | C?digo; navegador pendente |
| `/admin/loans-request` | admin | tela | C?digo; navegador pendente |
| `/admin/return` | admin | tela | C?digo; navegador pendente |
| `/admin/settings` | admin | tela | C?digo; navegador pendente |
| `/admin/auditoria` | admin | tela | C?digo; navegador pendente |
| `/mentor` | mentor | inicio | C?digo; navegador pendente |
| `/mentor/profile` | mentor | tela | C?digo; navegador pendente |
| `/mentor/my-class` | mentor | tela | C?digo; navegador pendente |
| `/mentor/verification` | mentor | tela | C?digo; navegador pendente |
| `/mentor/history/class` | mentor | tela | C?digo; navegador pendente |
| `/mentor/loan/creation` | mentor | tela | C?digo; navegador pendente |
| `/mentor/users-request` | mentor | tela | C?digo; navegador pendente |
| `/mentor/search-material` | mentor | tela | C?digo; navegador pendente |
| `/mentor/history/mentee` | mentor | alias | C?digo; navegador pendente |
| `/mentor/history/mentoring` | mentor | tela | C?digo; navegador pendente |
| `/mentor/history/loan` | mentor | tela | C?digo; navegador pendente |
| `/mentor/loan/histories` | mentor | tela | C?digo; navegador pendente |
| `/mentor/my-class/disabled` | mentor | tela | C?digo; navegador pendente |
| `/mentee` | mentee | inicio | C?digo; navegador pendente |
| `/mentee/search-material` | mentee | tela | C?digo; navegador pendente |
| `/mentee/profile` | mentee | tela | C?digo; navegador pendente |
| `/mentee/history/mentoring` | mentee | tela | C?digo; navegador pendente |
| `/mentee/history/loan` | mentee | tela | C?digo; navegador pendente |
| `/mentee/verification` | mentee | tela | C?digo; navegador pendente |
| `/` | global | tela | C?digo; navegador pendente |
| `/change-password-required` | global | tela | C?digo; navegador pendente |
| `/forgot-your-password` | global | tela | C?digo; navegador pendente |
| `/reset-password` | global | tela | C?digo; navegador pendente |
| `/create-account` | global | tela | C?digo; navegador pendente |
| `*` | global | tela | C?digo; navegador pendente |

## Cobertura transversal

Navega??o lateral e m?vel; cabe?alho; busca; conta; notifica??es; filtros; pagina??o; tabelas/cards; formul?rios; edi??o de produtos; confirma??es de status; feedback e alertas; PDFs de empr?stimos e demais exporta??es; manual.

Para cada superf?cie: conte?do t?pico e longo, carregamento, vazio, erro, sucesso, acesso negado e sess?o expirada quando aplic?vel; 320, 375, 767, 768 e 1440 px; temas claro e escuro na proposta. Nenhuma c?lula dessa matriz foi aprovada nesta etapa.

A troca obrigat?ria de senha ? protegida, embora esteja fora dos shells dos perfis. O alias /mentor/history/mentee redireciona para /mentor/history/class. Perfis Mentor e Mentorado n?o ganham edi??o ou permiss?es por causa da reorganiza??o.
