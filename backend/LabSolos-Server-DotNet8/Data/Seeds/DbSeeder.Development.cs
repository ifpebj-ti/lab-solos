using LabSolos_Server_DotNet8.Data.Context;


namespace LabSolos_Server_DotNet8.Data.Seeds
{
    public static partial class DbSeeder
    {
        public static void SeedDevelopment(AppDbContext context)
        {
            // Verificar se o banco está completamente vazio
            if (IsDatabaseEmpty(context))
            {
                // Executar as seeds de desenvolvimento
                SeedUsuarios.Seed(context);
                SeedProdutos.Seed(context);

                context.SaveChanges();
            }
        }

    }
}