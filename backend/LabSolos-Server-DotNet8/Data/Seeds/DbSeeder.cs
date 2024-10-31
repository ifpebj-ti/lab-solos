using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using Microsoft.EntityFrameworkCore;
using System;

namespace LabSolos_Server_DotNet8.Data.Seeds
{
    public static class DbSeeder
    {
        public static void Seed(AppDbContext context)
        {
            bool hasData = context.Produtos.Any() || context.Usuarios.Any() || context.Emprestimos.Any() || context.Lotes.Any();

            if (!hasData)
            {
                SeedProdutos.Seed(context);
                SeedUsuarios.Seed(context);
                SeedEmprestimos.Seed(context);

                context.SaveChanges();
            }
        }    
    }
}
