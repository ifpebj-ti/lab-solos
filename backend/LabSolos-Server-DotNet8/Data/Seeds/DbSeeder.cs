using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Services.Security;

namespace LabSolos_Server_DotNet8.Data.Seeds;

public static partial class DbSeeder
{
    public static void Seed(
        AppDbContext context,
        string environmentName,
        IConfiguration configuration,
        IPasswordPolicy passwordPolicy)
    {
        if (context.Usuarios.Any())
        {
            return;
        }

        if (environmentName is not ("Development" or "Production"))
        {
            throw new ArgumentException($"Ambiente desconhecido: {environmentName}");
        }

        SeedUsuarios.Seed(context, configuration, passwordPolicy);
    }
}
