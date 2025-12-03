using LabSolos_Server_DotNet8.Data.Context;
using Microsoft.Extensions.Configuration;


namespace LabSolos_Server_DotNet8.Data.Seeds
{
    public static partial class DbSeeder
    {
        public static void SeedDevelopment(AppDbContext context, IConfiguration configuration)
        {
            // Verificar se o banco está completamente vazio
            if (IsDatabaseEmpty(context))
            {
                // Executar as seeds de desenvolvimento
                SeedUsuarios.Seed(context, configuration);
                SeedProdutos.Seed(context);
                SeedNotificacoes.Seed(context);

                context.SaveChanges();
            }
        }

    }
}