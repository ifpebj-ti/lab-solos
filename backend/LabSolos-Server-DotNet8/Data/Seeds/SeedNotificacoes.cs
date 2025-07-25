using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;

namespace LabSolos_Server_DotNet8.Data.Seeds
{
    public static class SeedNotificacoes
    {
        public static void Seed(AppDbContext context)
        {
            // Buscar administradores para receber notificações
            var admins = context.Administradores.ToList();
            if (!admins.Any()) return;

            var admin1 = admins.FirstOrDefault();
            var admin2 = admins.Skip(1).FirstOrDefault();

            var notificacoes = new List<Notificacao>();

            // Notificação de novo empréstimo pendente
            notificacoes.Add(new Notificacao
            {
                Titulo = "Novo Empréstimo Solicitado",
                Mensagem = "O usuário Mariana Oliveira solicitou um novo empréstimo.",
                Tipo = TipoNotificacao.NovoEmprestimo,
                UsuarioId = null, // Global para administradores
                Lida = false,
                DataCriacao = DateTime.UtcNow.AddDays(-5),
                LinkAcao = "/admin/loans-request",
                ReferenciaId = 2, // ID do empréstimo pendente
                TipoReferencia = "Emprestimo"
            });

            // Notificação de nova solicitação de usuário (usuário com status pendente)
            notificacoes.Add(new Notificacao
            {
                Titulo = "Nova Solicitação de Cadastro",
                Mensagem = "Um novo usuário solicitou aprovação de cadastro.",
                Tipo = TipoNotificacao.SolicitacaoUsuario,
                UsuarioId = null, // Global para administradores
                Lida = false,
                DataCriacao = DateTime.UtcNow.AddDays(-3),
                LinkAcao = "/admin/register-request",
                ReferenciaId = null,
                TipoReferencia = "Usuario"
            });

            // Notificação de estoque baixo (produto com quantidade baixa)
            notificacoes.Add(new Notificacao
            {
                Titulo = "Estoque Baixo",
                Mensagem = "O produto Ácido Clorídrico está com estoque baixo (150ml). Mínimo recomendado: 20ml.",
                Tipo = TipoNotificacao.EstoqueBaixo,
                UsuarioId = null, // Global para administradores
                Lida = false,
                DataCriacao = DateTime.UtcNow.AddDays(-2),
                LinkAcao = "/admin/follow-up",
                ReferenciaId = null,
                TipoReferencia = "Produto"
            });

            // Notificação de empréstimo aprovado para o solicitante
            notificacoes.Add(new Notificacao
            {
                Titulo = "Empréstimo Aprovado",
                Mensagem = "Seu empréstimo foi aprovado e está pronto para retirada.",
                Tipo = TipoNotificacao.EmprestimoAprovado,
                UsuarioId = 3, // Carlos Eduardo - solicitante do empréstimo 1
                Lida = false,
                DataCriacao = DateTime.UtcNow.AddDays(-3),
                LinkAcao = "/mentor/history/class",
                ReferenciaId = 1,
                TipoReferencia = "Emprestimo"
            });

            // Notificação de cadastro aprovado
            notificacoes.Add(new Notificacao
            {
                Titulo = "Cadastro Aprovado",
                Mensagem = "Seu cadastro foi aprovado! Agora você pode acessar o sistema.",
                Tipo = TipoNotificacao.CadastroAprovado,
                UsuarioId = 5, // Lucas Ferreira
                Lida = true,
                DataCriacao = DateTime.UtcNow.AddMonths(-3),
                DataLeitura = DateTime.UtcNow.AddMonths(-3).AddHours(2),
                LinkAcao = "/profile",
                ReferenciaId = 5,
                TipoReferencia = "Usuario"
            });

            // Notificação de sistema (manutenção programada)
            notificacoes.Add(new Notificacao
            {
                Titulo = "Manutenção Programada",
                Mensagem = "O sistema passará por manutenção no próximo domingo das 2h às 6h.",
                Tipo = TipoNotificacao.Sistema,
                UsuarioId = null, // Global para todos
                Lida = false,
                DataCriacao = DateTime.UtcNow.AddDays(-1),
                LinkAcao = null,
                ReferenciaId = null,
                TipoReferencia = "Sistema"
            });

            // Notificação de produto próximo ao vencimento
            notificacoes.Add(new Notificacao
            {
                Titulo = "Produto Próximo ao Vencimento",
                Mensagem = "O produto Sulfato de Cobre vencerá em breve. Verifique a data de validade.",
                Tipo = TipoNotificacao.ProdutoProximoVencimento,
                UsuarioId = null, // Global para administradores
                Lida = false,
                DataCriacao = DateTime.UtcNow.AddHours(-6),
                LinkAcao = "/admin/follow-up",
                ReferenciaId = null,
                TipoReferencia = "Produto"
            });

            // Notificação geral
            notificacoes.Add(new Notificacao
            {
                Titulo = "Bem-vindo ao LabSolos",
                Mensagem = "Sistema de gerenciamento de laboratório atualizado com sucesso!",
                Tipo = TipoNotificacao.Geral,
                UsuarioId = null, // Global para todos
                Lida = false,
                DataCriacao = DateTime.UtcNow.AddDays(-7),
                LinkAcao = null,
                ReferenciaId = null,
                TipoReferencia = "Sistema"
            });

            // Notificações de empréstimos vencidos para administradores
            // Empréstimo vencido 1: Carlos Eduardo - 15 dias vencido
            // if (admin1 != null)
            // {
            //     notificacoes.Add(new Notificacao
            //     {
            //         Titulo = "Empréstimo vencido há 15 dias",
            //         Mensagem = "O empréstimo #4 do usuário Carlos Eduardo está vencido há 15 dias. Produtos: Ácido Clorídrico, Béquer 250ml",
            //         Tipo = TipoNotificacao.Sistema,
            //         UsuarioId = admin1.Id,
            //         Lida = false,
            //         DataCriacao = DateTime.UtcNow.AddDays(-2),
            //         LinkAcao = "/admin/history/loan/4",
            //         ReferenciaId = 4,
            //         TipoReferencia = "EmprestimoVencido"
            //     });
            // }

            // if (admin2 != null)
            // {
            //     notificacoes.Add(new Notificacao
            //     {
            //         Titulo = "Empréstimo vencido há 15 dias",
            //         Mensagem = "O empréstimo #4 do usuário Carlos Eduardo está vencido há 15 dias. Produtos: Ácido Clorídrico, Béquer 250ml",
            //         Tipo = TipoNotificacao.Sistema,
            //         UsuarioId = admin2.Id,
            //         Lida = false,
            //         DataCriacao = DateTime.UtcNow.AddDays(-2),
            //         LinkAcao = "/admin/history/loan/4",
            //         ReferenciaId = 4,
            //         TipoReferencia = "EmprestimoVencido"
            //     });
            // }

            // // Empréstimo vencido 2: Mariana Oliveira - 20 dias vencido
            // if (admin1 != null)
            // {
            //     notificacoes.Add(new Notificacao
            //     {
            //         Titulo = "Empréstimo vencido há 20 dias",
            //         Mensagem = "O empréstimo #5 do usuário Mariana Oliveira está vencido há 20 dias. Produtos: Sulfato de Cobre, Luvas de Proteção",
            //         Tipo = TipoNotificacao.Sistema,
            //         UsuarioId = admin1.Id,
            //         Lida = false,
            //         DataCriacao = DateTime.UtcNow.AddDays(-1),
            //         LinkAcao = "/admin/history/loan/5",
            //         ReferenciaId = 5,
            //         TipoReferencia = "EmprestimoVencido"
            //     });
            // }

            if (admin2 != null)
            {
                notificacoes.Add(new Notificacao
                {
                    Titulo = "Empréstimo vencido há 20 dias",
                    Mensagem = "O empréstimo #5 do usuário Mariana Oliveira está vencido há 20 dias. Produtos: Sulfato de Cobre, Luvas de Proteção",
                    Tipo = TipoNotificacao.Sistema,
                    UsuarioId = admin2.Id,
                    Lida = true, // Admin2 já leu esta notificação
                    DataCriacao = DateTime.UtcNow.AddDays(-1),
                    DataLeitura = DateTime.UtcNow.AddHours(-12),
                    LinkAcao = "/admin/history/loan/5",
                    ReferenciaId = 5,
                    TipoReferencia = "EmprestimoVencido"
                });
            }

            // Empréstimo vencido 3: Lucas Ferreira - 12 dias vencido
            if (admin1 != null)
            {
                notificacoes.Add(new Notificacao
                {
                    Titulo = "Empréstimo vencido há 12 dias",
                    Mensagem = "O empréstimo #6 do usuário Lucas Ferreira está vencido há 12 dias. Produtos: Erlenmeyer 250ml, Ácido Clorídrico",
                    Tipo = TipoNotificacao.Sistema,
                    UsuarioId = admin1.Id,
                    Lida = false,
                    DataCriacao = DateTime.UtcNow.AddHours(-6),
                    LinkAcao = "/admin/history/loan/6",
                    ReferenciaId = 6,
                    TipoReferencia = "EmprestimoVencido"
                });
            }

            if (admin2 != null)
            {
                notificacoes.Add(new Notificacao
                {
                    Titulo = "Empréstimo vencido há 12 dias",
                    Mensagem = "O empréstimo #6 do usuário Lucas Ferreira está vencido há 12 dias. Produtos: Erlenmeyer 250ml, Ácido Clorídrico",
                    Tipo = TipoNotificacao.Sistema,
                    UsuarioId = admin2.Id,
                    Lida = false,
                    DataCriacao = DateTime.UtcNow.AddHours(-6),
                    LinkAcao = "/admin/history/loan/6",
                    ReferenciaId = 6,
                    TipoReferencia = "EmprestimoVencido"
                });
            }

            context.Notificacoes.AddRange(notificacoes);
            context.SaveChanges();
        }
    }
}
