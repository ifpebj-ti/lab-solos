using LabSolos_Server_DotNet8.Data.Context;

namespace LabSolos_Server_DotNet8.Data.Seeds
{
    public static partial class DbSeeder
    {
        public static void Seed(AppDbContext context, string environmentName)
        {
            if (environmentName == "Development")
            {
                SeedDevelopment(context);
            }
            else if (environmentName == "Production")
            {
                SeedProduction(context);
            }
            else
            {
                throw new ArgumentException($"Ambiente desconhecido: {environmentName}");
            }
        }

        private static bool IsDatabaseEmpty(AppDbContext context)
        {
            // Verificar se todas as tabelas relevantes estão vazias
            return !context.Usuarios.Any() &&
                   !context.Produtos.Any() &&
                   !context.Lotes.Any() &&
                   !context.Emprestimos.Any();
        }
    }
}