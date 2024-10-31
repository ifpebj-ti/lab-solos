using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Enums;
using System;

namespace LabSolos_Server_DotNet8.Data.Seeds
{
    public static class SeedEmprestimos
    {
        public static void Seed(AppDbContext context)
        {
            var emprestimo1 = new Emprestimo
            {
                Id = 1,
                DataRealizacao = DateTime.UtcNow.AddDays(-7),
                DataDevolucao = DateTime.UtcNow.AddDays(7),
                Status = StatusEmprestimo.Aprovado,
                ProdutoId = 1,
                SolicitanteId = 3,
                AprovadorId = 2
            };

            var emprestimo2 = new Emprestimo
            {
                Id = 2,
                DataRealizacao = DateTime.UtcNow.AddDays(-3),
                DataDevolucao = DateTime.UtcNow.AddDays(4),
                Status = StatusEmprestimo.EmAndamento,
                ProdutoId = 2,
                SolicitanteId = 2
            };

            context.Emprestimos.AddRange(emprestimo1, emprestimo2);
        }
    }
}
