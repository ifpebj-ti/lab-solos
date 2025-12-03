using LabSolos_Server_DotNet8.Data.Context;
using Microsoft.Extensions.Configuration;

namespace LabSolos_Server_DotNet8.Data.Seeds
{
    public static partial class DbSeeder
    {
        public static void Seed(AppDbContext context, string environmentName, IConfiguration configuration)
        {
            if (environmentName == "Development")
            {
                SeedDevelopment(context, configuration);
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
                   !context.Emprestimos.Any() &&
                   !context.Notificacoes.Any();
        }
    }
}