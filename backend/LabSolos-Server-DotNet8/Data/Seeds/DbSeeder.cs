using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Enums;
using Microsoft.EntityFrameworkCore;

namespace LabSolos_Server_DotNet8.Seeds;
public static class DbSeeder
{
    public static void Seed(ModelBuilder modelBuilder)
    {
        // Seed para Quimico
        modelBuilder.Entity<Quimico>().HasData(
            new Quimico
            {
                Id = 1,
                Codigo = "Q123",
                Lote = "Lote1",
                Tipo = TipoProduto.Quimico,
                Quantidade = 100,
                QuantidadeMinima = 10,
                DataValidade = DateTime.Now.AddYears(1),
                LocalizacaoProduto = "Prateleira A",
                Marca = "Marca X",
                Status = true,
                UltimaModificacao = DateTime.Now,
                Catmat = "CATMAT-01",
                Formula = "H2O",
                Grupo = Grupo.Acido,
                UnidadeMedida = UnidadeMedida.Litro
            }
        );

        // Seed para Vidraria
        modelBuilder.Entity<Vidraria>().HasData(
            new Vidraria
            {
                Id = 2,
                Codigo = "V456",
                Lote = "Lote2",
                Tipo = TipoProduto.Vidraria,
                Quantidade = 50,
                QuantidadeMinima = 5,
                DataValidade = DateTime.Now.AddYears(2),
                LocalizacaoProduto = "Prateleira B",
                Marca = "Marca Y",
                Status = true,
                UltimaModificacao = DateTime.Now,
                Volumetria = 500
            }
        );
    }
}
